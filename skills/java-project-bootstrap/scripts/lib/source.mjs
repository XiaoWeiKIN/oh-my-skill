import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export function digest(data, algorithm = 'sha256') {
  return createHash(algorithm).update(data).digest('hex');
}
export function gitObject(type, data) {
  return digest(Buffer.concat([Buffer.from(`${type} ${data.length}\0`), data]), 'sha1');
}
export function safePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') ||
      value.startsWith('/') || value.split('/').some(p => !p || p === '.' || p === '..') ||
      /^[a-z]:/i.test(value)) throw new Error(`Unsafe relative path: ${value}`);
  return value;
}
export async function noSymlinks(file) {
  const full = path.resolve(file);
  let current = path.parse(full).root;
  for (const part of full.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      if ((await fs.lstat(current)).isSymbolicLink()) throw new Error(`Symlink not allowed: ${current}`);
    } catch (e) { if (e.code === 'ENOENT') break; throw e; }
  }
}

/** Reconstruct every Git tree from the recursive API result; do not trust a stored SHA field. */
export function verifyTree(document, expected) {
  if (document.truncated || !Array.isArray(document.tree)) throw new Error('Incomplete upstream tree');
  const entries = new Map();
  const groups = new Map([['', []]]);
  for (const item of document.tree) {
    const p = safePath(item.path);
    if (entries.has(p) || !/^[0-9a-f]{40}$/.test(item.sha) ||
        !['040000', '100644', '100755', '120000', '160000'].includes(item.mode)) {
      throw new Error(`Invalid tree entry: ${p}`);
    }
    const type = item.mode === '040000' ? 'tree' : item.mode === '160000' ? 'commit' : 'blob';
    if (item.type !== type) throw new Error(`Type/mode mismatch: ${p}`);
    entries.set(p, item);
    if (type === 'tree') groups.set(p, []);
  }
  for (const item of entries.values()) {
    const parent = path.posix.dirname(item.path);
    const group = groups.get(parent === '.' ? '' : parent);
    if (!group) throw new Error(`Missing parent tree: ${item.path}`);
    group.push(item);
  }
  for (const [directory, children] of groups) {
    children.sort((a, b) => Buffer.compare(
      Buffer.from(path.posix.basename(a.path) + (a.type === 'tree' ? '/' : '')),
      Buffer.from(path.posix.basename(b.path) + (b.type === 'tree' ? '/' : ''))));
    const bytes = Buffer.concat(children.flatMap(e => [
      Buffer.from(`${e.mode.replace(/^0+/, '')} ${path.posix.basename(e.path)}\0`),
      Buffer.from(e.sha, 'hex')
    ]));
    const actual = gitObject('tree', bytes);
    const wanted = directory ? entries.get(directory).sha : expected;
    if (actual !== wanted) throw new Error(`Git tree integrity failure: ${directory || '/'} (${actual})`);
  }
  return entries;
}

export function selectFiles(entries, lock) {
  for (const p of lock.files) if (!entries.has(p)) throw new Error(`Upstream file missing: ${p}`);
  for (const prefix of lock.directories) {
    if (!entries.has(prefix.slice(0, -1))) throw new Error(`Upstream directory missing: ${prefix}`);
  }
  const exact = new Set([...lock.files, ...(lock.optionalFiles || [])]);
  return [...entries.values()].filter(e => e.type !== 'tree' &&
    (exact.has(e.path) || lock.directories.some(p => e.path.startsWith(p))))
    .map(e => {
      if (e.type !== 'blob' || !['100644', '100755'].includes(e.mode)) {
        throw new Error(`Refusing executable link/submodule: ${e.path}`);
      }
      return e;
    }).sort((a, b) => a.path.localeCompare(b.path, 'en'));
}

async function download(url, limit, fetcher) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetcher(url, {
        signal: AbortSignal.timeout(30000), redirect: 'error',
        headers: { 'User-Agent': 'java-project-bootstrap/0.1.0', 'Accept': 'application/vnd.github+json' }
      });
    } catch (e) {
      if (attempt === 2) throw new Error(`Download failed: ${url}: ${e.message}`);
      await new Promise(r => setTimeout(r, 250 * 2 ** attempt));
      continue;
    }
    if (!response.ok) {
      if (attempt < 2 && (response.status === 429 || response.status >= 500)) {
        await response.body?.cancel();
        await new Promise(r => setTimeout(r, 500 * 2 ** attempt));
        continue;
      }
      throw new Error(`HTTP ${response.status}: ${url}; use a prewarmed --cache with --offline`);
    }
    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > limit) throw new Error(`Download too large: ${url}`);
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  throw new Error(`Download failed: ${url}`);
}
async function cached(file, get, offline) {
  await noSymlinks(file);
  try { return await fs.readFile(file); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (offline) throw new Error(`Offline cache miss: ${file}`);
  const bytes = await get();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await noSymlinks(file);
  try { await fs.writeFile(file, bytes, { flag: 'wx' }); }
  catch (e) {
    if (e.code !== 'EEXIST') throw e;
    const existing = await fs.readFile(file);
    if (!existing.equals(bytes)) throw new Error(`Concurrent cache mismatch: ${file}`);
  }
  return bytes;
}

/** The cache contains immutable, original bytes, including the real binary Wrapper JAR. */
export async function acquire(lock, cache, { offline = false, fetcher = globalThis.fetch } = {}) {
  if (!/^[0-9a-f]{40}$/.test(lock.commit) || !/^[0-9a-f]{40}$/.test(lock.tree) ||
      lock.repository !== 'open-telemetry/opentelemetry-java') throw new Error('Unsupported upstream lock');
  const root = path.resolve(cache, lock.commit);
  const treeBytes = await cached(path.join(root, 'tree.json'), () => download(
    `https://api.github.com/repos/${lock.repository}/git/trees/${lock.tree}?recursive=1`, 20_000_000, fetcher), offline);
  const selected = selectFiles(verifyTree(JSON.parse(treeBytes), lock.tree), lock);
  const files = new Map();
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, selected.length) }, async () => {
    while (next < selected.length) {
      const item = selected[next++];
      const encoded = item.path.split('/').map(encodeURIComponent).join('/');
      const bytes = await cached(path.join(root, 'files', item.path), () => download(
        `https://raw.githubusercontent.com/${lock.repository}/${lock.commit}/${encoded}`, 2_000_000, fetcher), offline);
      if (gitObject('blob', bytes) !== item.sha) throw new Error(`Upstream blob integrity failure: ${item.path}`);
      files.set(item.path, { bytes, mode: item.mode === '100755' ? 0o755 : 0o644, upstreamBlob: item.sha });
    }
  }));
  return files;
}
