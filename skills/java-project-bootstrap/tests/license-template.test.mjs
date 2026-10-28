import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SKILL_ROOT } from '../scripts/lib/project.mjs';

test('license header and Java templates agree on the blank line before package', async () => {
  const root = path.join(SKILL_ROOT, 'assets/library');
  const header = await fs.readFile(path.join(root, 'buildscripts/spotless.license.java.tpl'), 'utf8');
  assert.ok(header.endsWith(' */\n\n'));
  let checked = 0;
  async function visit(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.name.endsWith('.java.tpl') && !file.includes(`${path.sep}buildscripts${path.sep}`)) {
        const source = await fs.readFile(file, 'utf8');
        assert.ok(source.startsWith(header + 'package '), file);
        checked++;
      }
    }
  }
  await visit(root);
  assert.equal(checked, 5);
});
