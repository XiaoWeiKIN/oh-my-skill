#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { acquire, digest, noSymlinks } from './lib/source.mjs';
import { configuration, LOCK_FILE, renderProject } from './lib/project.mjs';

try {
  const { values: v } = parseArgs({ options: { project: { type: 'string' }, cache: { type: 'string' }, offline: { type: 'boolean', default: false } }, strict: true });
  if (!v.project) throw new Error('--project is required');
  const root = path.resolve(v.project);
  await noSymlinks(root);
  const saved = JSON.parse(await fs.readFile(path.join(root, '.project-bootstrap.json'), 'utf8'));
  const lock = JSON.parse(await fs.readFile(LOCK_FILE, 'utf8'));
  if (saved.templateVersion !== lock.templateVersion || saved.upstream?.commit !== lock.commit) throw new Error('Compare requires the original generator version; no automatic upgrade is performed');
  const config = configuration(saved.config);
  const source = await acquire(lock, path.resolve(v.cache || path.join(homedir(), '.cache/java-project-bootstrap')), { offline: v.offline });
  const { files } = await renderProject(source, config, lock);
  const drift = [];
  for (const [relative, expected] of files) {
    const target = path.join(root, relative);
    try {
      await noSymlinks(target);
      const actual = await fs.readFile(target);
      if (!actual.equals(expected.bytes)) drift.push({ path: relative, expectedSha256: digest(expected.bytes), actualSha256: digest(actual) });
    } catch (e) { drift.push({ path: relative, error: e.message }); }
  }
  console.log(JSON.stringify({ status: drift.length ? 'DRIFT' : 'MATCH', upstream: lock.commit, checked: files.size, drift,
    scope: 'Only initially generated paths; new business files are outside this comparison. No project files changed.' }, null, 2));
  if (drift.length) process.exitCode = 2;
} catch (e) { console.error(JSON.stringify({ status: 'error', error: e.message })); process.exitCode = 1; }
