#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { acquire, noSymlinks } from './lib/source.mjs';
import { configuration, LOCK_FILE, renderProject, writeProject } from './lib/project.mjs';

try {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22 or newer is required');
  const { values: v } = parseArgs({ options: {
    name: { type: 'string' }, group: { type: 'string' }, package: { type: 'string' },
    java: { type: 'string' }, type: { type: 'string' }, preset: { type: 'string' },
    repository: { type: 'string' }, output: { type: 'string' }, cache: { type: 'string' },
    offline: { type: 'boolean', default: false }, 'dry-run': { type: 'boolean', default: false },
    'prepare-cache': { type: 'boolean', default: false }, help: { type: 'boolean', default: false }
  }, strict: true, allowPositionals: false });
  if (v.help) {
    console.log('node scripts/init.mjs --name NAME --group GROUP --output DIR [--java 21] [--repository https://host/owner/repo] [--cache DIR] [--offline] [--dry-run]\nOnly library + otel-faithful are supported. --prepare-cache downloads and verifies the pinned upstream without generating a project.');
  } else {
    const lock = JSON.parse(await fs.readFile(LOCK_FILE, 'utf8'));
    const cache = path.resolve(v.cache || path.join(homedir(), '.cache/java-project-bootstrap'));
    let c;
    if (!v['prepare-cache']) {
      c = configuration(v);
      if (!v.output) throw new Error('--output is required');
      await noSymlinks(v.output);
      try { await fs.lstat(v.output); throw new Error('Destination already exists; no files were changed'); }
      catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    if (v['dry-run']) {
      console.log(JSON.stringify({ status: 'plan-only', config: c || null, cache, output: v.output ? path.resolve(v.output) : null,
        upstream: lock.commit, requiresBuildJava: lock.buildJava, networkRequired: !v.offline,
        effects: ['populate verified upstream cache', ...(c ? ['create new destination; no overwrite'] : [])],
        automaticallyRunsGradle: false, automaticallyPublishes: false }, null, 2));
    } else {
      const source = await acquire(lock, cache, { offline: v.offline });
      if (v['prepare-cache']) console.log(JSON.stringify({ status: 'cache-verified', sourceFiles: source.size, cache, upstream: lock.commit }, null, 2));
      else {
        const { files } = await renderProject(source, c, lock);
        await writeProject(v.output, files);
        console.log(JSON.stringify({ status: 'generated-unbuilt', output: path.resolve(v.output), files: files.size,
          upstream: lock.commit, buildJava: lock.buildJava, targetJava: c.java,
          next: 'Run scripts/validate.mjs --project DIR --build; a generated tree alone is not a verified build.',
          publication: 'local-only; remote release not configured', apiCompatibility: 'SKIPPED_NO_BASELINE until an explicit baseline is supplied' }, null, 2));
      }
    }
  }
} catch (e) {
  console.error(JSON.stringify({ status: 'error', error: e.message }));
  process.exitCode = 1;
}
