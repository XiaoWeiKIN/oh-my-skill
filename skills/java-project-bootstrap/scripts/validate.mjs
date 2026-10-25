#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { digest, noSymlinks, safePath } from './lib/source.mjs';
import { configuration, LOCK_FILE, PLUGINS } from './lib/project.mjs';

try {
  const { values: v } = parseArgs({ options: { project: { type: 'string' }, build: { type: 'boolean', default: false } }, strict: true });
  if (!v.project) throw new Error('--project is required');
  const root = path.resolve(v.project);
  await noSymlinks(root);
  const lock = JSON.parse(await fs.readFile(LOCK_FILE, 'utf8'));
  const manifest = JSON.parse(await fs.readFile(path.join(root, '.project-bootstrap.json'), 'utf8'));
  if (manifest.schema !== 1 || manifest.templateVersion !== lock.templateVersion || manifest.upstream?.commit !== lock.commit ||
      !manifest.files || typeof manifest.files !== 'object') throw new Error('Unsupported generation manifest');
  configuration(manifest.config);
  const problems = [];
  for (const [relative, expected] of Object.entries(manifest.files)) {
    const file = path.join(root, safePath(relative));
    if (!/^[0-9a-f]{64}$/.test(expected.sha256)) throw new Error(`Invalid checksum: ${relative}`);
    try {
      await noSymlinks(file);
      const stat = await fs.stat(file);
      if (!stat.isFile()) throw new Error('not a regular file');
      if (digest(await fs.readFile(file)) !== expected.sha256) problems.push({ path: relative, issue: 'changed-since-generation' });
      if (process.platform !== 'win32' && expected.mode === 0o755 && !(stat.mode & 0o111)) problems.push({ path: relative, issue: 'not-executable' });
    } catch (e) { problems.push({ path: relative, issue: e.message }); }
  }
  for (const key of ['LICENSE', 'gradlew', 'gradlew.bat', 'gradle/wrapper/gradle-wrapper.jar',
    'gradle/wrapper/gradle-wrapper.properties', 'settings.gradle.kts', 'build.gradle.kts',
    ...PLUGINS.map(n => `buildSrc/src/main/kotlin/otel.${n}-conventions.gradle.kts`)]) {
    if (!(key in manifest.files)) problems.push({ path: key, issue: 'missing-contract-file' });
  }
  const report = { structural: problems.length ? 'FAIL' : 'PASS', problems,
    gradle: 'NOT_RUN', apiCompatibility: 'SKIPPED_NO_BASELINE', securityAudit: 'NOT_RUN',
    note: 'Checksums detect drift, not intentional edits versus bugs; use compare for trusted regeneration.' };
  if (v.build && !problems.length) {
    const tasks = ['--no-daemon', 'build', ':all:jacocoTestReport', ':core:jmhJar', ':bom:generatePomFileForMavenPublication'];
    const executable = process.platform === 'win32' ? 'cmd.exe' : './gradlew';
    const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'gradlew.bat', ...tasks] : tasks;
    const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', timeout: 900000, maxBuffer: 32 * 1024 * 1024 });
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    report.gradle = result.status === 0 && !result.error ? 'PASS' : 'FAIL';
    report.command = ['./gradlew', ...tasks];
    report.exitCode = result.status;
    if (result.error) report.error = result.error.message;
  }
  console.log(JSON.stringify(report, null, 2));
  if (problems.length || report.gradle === 'FAIL') process.exitCode = 2;
} catch (e) { console.error(JSON.stringify({ status: 'error', error: e.message })); process.exitCode = 1; }
