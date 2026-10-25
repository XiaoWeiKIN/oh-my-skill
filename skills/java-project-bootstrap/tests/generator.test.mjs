import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { acquire, digest, gitObject, safePath, verifyTree, selectFiles } from '../scripts/lib/source.mjs';
import { configuration, patchSource, renderTokens, replaceRequired, renderProject, writeProject, LOCK_FILE, SKILL_ROOT, PLUGINS } from '../scripts/lib/project.mjs';

const input = { name: 'example-sdk', group: 'com.example.sample', java: 21 };
const lock = JSON.parse(await fs.readFile(LOCK_FILE, 'utf8'));
const temporary = async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'java-bootstrap-unit-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
};

// Synthetic Git objects test integrity code only. They are NEVER used to claim a Gradle build.
function treeFixture(blobs) {
  const groups = new Map([['', []]]);
  const result = [];
  for (const [p, data] of Object.entries(blobs)) {
    const item = { path: p, mode: '100644', type: 'blob', sha: gitObject('blob', data) };
    result.push(item);
    let parent = path.posix.dirname(p);
    while (parent !== '.') {
      if (!groups.has(parent)) groups.set(parent, []);
      parent = path.posix.dirname(parent);
    }
  }
  for (const item of result) {
    const p = path.posix.dirname(item.path);
    groups.get(p === '.' ? '' : p).push(item);
  }
  let root;
  for (const dir of [...groups.keys()].sort((a,b) => b.length-a.length)) {
    const children = groups.get(dir);
    children.sort((a,b) => Buffer.compare(Buffer.from(path.posix.basename(a.path)+(a.type==='tree'?'/':'')), Buffer.from(path.posix.basename(b.path)+(b.type==='tree'?'/':''))));
    const bytes = Buffer.concat(children.flatMap(e => [Buffer.from(`${e.mode.replace(/^0+/, '')} ${path.posix.basename(e.path)}\0`), Buffer.from(e.sha,'hex')]));
    const sha = gitObject('tree', bytes);
    if (!dir) root = sha;
    else {
      const item = { path: dir, mode: '040000', type: 'tree', sha };
      result.push(item);
      const p = path.posix.dirname(dir);
      groups.get(p === '.' ? '' : p).push(item);
    }
  }
  return { sha: root, truncated: false, tree: result };
}

function renderFixture() {
  const raw = {
    'buildSrc/src/main/kotlin/otel.java-conventions.gradle.kts': `startsWith("opentelemetry-")\narchivesName.set("opentelemetry-$name")\nexclude("io/opentelemetry/**/internal/**")\nsource = "8"\n"-exportcontents" to "io.opentelemetry.*"\nimplementation(project(":testing-internal"))\nFile(propertiesDir.get(), "version.properties").writeText("sdk.version=\${versionProperty}")\n`,
    'buildSrc/src/main/kotlin/otel.errorprone-conventions.gradle.kts': 'annotatedPackages.add("io.opentelemetry")\n',
    'buildSrc/src/main/kotlin/otel.spotless-conventions.gradle.kts': ('rootProject.file("buildscripts/spotless.license.java")\n').repeat(4),
    'buildSrc/src/main/kotlin/otel.publish-conventions.gradle.kts': 'groupId = "io.opentelemetry"\nname.set("OpenTelemetry Java")\nurl.set("https://github.com/open-telemetry/opentelemetry-java")\nid.set("opentelemetry")\nname.set("OpenTelemetry")\nurl.set("https://github.com/open-telemetry/community")\nscm:git:git@github.com:open-telemetry/opentelemetry-java.git\nscm:git:git@github.com:open-telemetry/opentelemetry-java.git\nurl.set("git@github.com:open-telemetry/opentelemetry-java.git")\nif (System.getenv("CI") != null)\n',
    'buildSrc/src/main/kotlin/otel.japicmp-conventions.gradle.kts': '"io.opentelemetry:${it.base.archivesName.get()}:$version@jar"\nif (!project.hasProperty("otel.release") && !project.name.startsWith("bom")) {\n}\n',
    'buildscripts/spotless.license.java': '/* Copyright The OpenTelemetry Authors */\n',
    'all/build.gradle.kts': 'description = "OpenTelemetry All"\notelJava.moduleName.set("io.opentelemetry.all")\n',
    'custom-checks/build.gradle.kts': '// synthetic fixture only\n',
    'LICENSE': 'synthetic license fixture; never distributed as an upstream snapshot\n',
    'gradlew': '#!/bin/sh\nexit 99 # not a real wrapper; unit fixture only\n',
    'gradlew.bat': '@exit /b 99\n',
    'gradle/wrapper/gradle-wrapper.properties': `distributionUrl=https\\://services.gradle.org/distributions/gradle-${lock.gradle}-bin.zip\ndistributionSha256Sum=${lock.distributionSha256}\n`,
    'gradle/wrapper/gradle-wrapper.jar': Buffer.concat([Buffer.from('PK'), Buffer.alloc(1100)])
  };
  for (const p of PLUGINS) raw[`buildSrc/src/main/kotlin/otel.${p}-conventions.gradle.kts`] ??= '// synthetic fixture\n';
  return new Map(Object.entries(raw).map(([p,bytes]) => { const b = Buffer.from(bytes); return [p,{bytes:b,mode:0o644,upstreamBlob:gitObject('blob',b)}]; }));
}

test('valid configuration separates build JDK from target JDK', () => {
  const c = configuration(input);
  assert.equal(c.java, 21); assert.equal(lock.buildJava, 25); assert.equal(c.package, input.group);
});
for (const [key,value] of [['name','../oops'],['name','con'],['name','a\nplugins'],['group','com.class'],['group','com.x\"'],['group','io.opentelemetry'],['package','io.opentelemetry.attack'],['java','99'],['type','application'],['preset','otel-adapted'],['repository','https://host/repo\nprintln(1)']]) {
  test(`reject unsupported/unsafe configuration ${key}=${JSON.stringify(value)}`, () => assert.throws(() => configuration({...input,[key]:value})));
}
test('renderer rejects unknown tokens and patch drift', () => {
  assert.throws(() => renderTokens('@@UNKNOWN@@',configuration(input)), /Unknown/);
  assert.throws(() => replaceRequired('x x','x','y'), /precondition/);
  assert.throws(() => patchSource('p/otel.java-conventions.gradle.kts','changed',configuration(input)), /precondition/);
});
for (const p of ['/absolute','../escape','a/../escape','a\\b','a//b','a\0b','C:/temp']) {
  test(`reject traversal ${JSON.stringify(p)}`, () => assert.throws(() => safePath(p), /Unsafe/));
}
test('Git tree verification uses content, correct directory sorting and nested hashes', () => {
  const f = treeFixture({'a/file':Buffer.from('one'),'a.z':Buffer.from('two'),'z/deep/file':Buffer.from('three')});
  assert.equal(verifyTree(f, f.sha).get('a/file').sha, gitObject('blob',Buffer.from('one')));
  const bad = structuredClone(f); bad.tree.find(e=>e.path==='a/file').sha='0'.repeat(40);
  assert.throws(()=>verifyTree(bad,f.sha),/integrity/);
  assert.throws(()=>verifyTree({...f,truncated:true},f.sha),/Incomplete/);
  assert.throws(()=>verifyTree({...f,tree:[...f.tree,f.tree[0]]},f.sha),/Invalid/);
});
test('selection rejects symlinks and missing required files', () => {
  const entries = new Map([['x',{path:'x',type:'blob',mode:'120000'}]]);
  assert.throws(()=>selectFiles(entries,{files:['x'],directories:[]}),/Refusing/);
  assert.throws(()=>selectFiles(entries,{files:['missing'],directories:[]}),/missing/);
});
test('network acquisition verifies blobs; offline cache does not call fetch', async t => {
  const cache = await temporary(t);
  const blobs={'LICENSE':Buffer.from('license'),'buildSrc/p.txt':Buffer.from('original')};
  const tree=treeFixture(blobs);
  const l={...lock,tree:tree.sha,files:['LICENSE'],directories:['buildSrc/'],optionalFiles:[]};
  let calls=0;
  const fetcher=async url=>{ calls++; return new Response(url.includes('api.github')?JSON.stringify(tree):blobs[decodeURIComponent(url.split(lock.commit+'/')[1])]); };
  const first=await acquire(l,cache,{fetcher}); assert.equal(first.size,2); assert.equal(calls,3);
  const second=await acquire(l,cache,{offline:true,fetcher:()=>{throw Error('network forbidden');}}); assert.equal(second.size,2);
  await fs.writeFile(path.join(cache,lock.commit,'files/buildSrc/p.txt'),'modified');
  await assert.rejects(acquire(l,cache,{offline:true}),/blob integrity/);
});
test('offline cache miss fails before output can be created', async t => {
  await assert.rejects(acquire(lock,await temporary(t),{offline:true}),/Offline cache miss/);
});
test('rendered tree is byte deterministic and includes all ten convention plugins', async () => {
  const a=await renderProject(renderFixture(),configuration(input),lock);
  const b=await renderProject(renderFixture(),configuration(input),lock);
  assert.deepEqual([...a.files].map(([p,r])=>[p,digest(r.bytes)]),[...b.files].map(([p,r])=>[p,digest(r.bytes)]));
  for(const p of PLUGINS) assert.ok(a.files.has(`buildSrc/src/main/kotlin/otel.${p}-conventions.gradle.kts`));
  assert.equal(a.files.get('gradlew').mode,0o755);
  assert.ok(a.files.get('buildscripts/spotless.license.upstream.java').bytes.toString().includes('OpenTelemetry'));
  assert.ok(a.files.get('buildscripts/spotless.license.java').bytes.toString().includes('example-sdk contributors'));
  assert.ok(a.files.has('api/src/main/java/com/example/sample/api/Greeter.java'));
  assert.ok(!a.files.get('settings.gradle.kts').bytes.toString().includes('community.develocity.cloud'));
});
test('write refuses existing directory and rolls back only its files', async t => {
  const tmp=await temporary(t), existing=path.join(tmp,'existing'); await fs.mkdir(existing); await fs.writeFile(path.join(existing,'keep'),'safe');
  await assert.rejects(writeProject(existing,new Map()),/exists/); assert.equal(await fs.readFile(path.join(existing,'keep'),'utf8'),'safe');
  const out=path.join(tmp,'rollback');
  await assert.rejects(writeProject(out,new Map([['ok',{bytes:Buffer.from('ok'),mode:0o644}],['../bad',{bytes:Buffer.from('bad'),mode:0o644}]])),/Unsafe/);
  await assert.rejects(fs.stat(out),{code:'ENOENT'});
});
test('symlink destinations are refused', {skip:process.platform==='win32'}, async t => {
  const tmp=await temporary(t); await fs.mkdir(path.join(tmp,'real')); await fs.symlink(path.join(tmp,'real'),path.join(tmp,'alias'));
  await assert.rejects(writeProject(path.join(tmp,'alias','project'),new Map()),/Symlink/);
});
test('dry run is non-mutating and unsupported project types exit nonzero', async t => {
  const tmp=await temporary(t), out=path.join(tmp,'project'), cache=path.join(tmp,'cache');
  const args=[path.join(SKILL_ROOT,'scripts/init.mjs'),'--name',input.name,'--group',input.group,'--output',out,'--cache',cache];
  const result=spawnSync(process.execPath,[...args,'--dry-run'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr); assert.equal(JSON.parse(result.stdout).status,'plan-only');
  await assert.rejects(fs.stat(out),{code:'ENOENT'}); await assert.rejects(fs.stat(cache),{code:'ENOENT'});
  assert.notEqual(spawnSync(process.execPath,[...args,'--type','application'],{encoding:'utf8'}).status,0);
});
test('structural validation distinguishes NOT_RUN from Gradle PASS and detects edits', async t => {
  const out=path.join(await temporary(t),'project');
  const rendered=await renderProject(renderFixture(),configuration(input),lock); await writeProject(out,rendered.files);
  const args=[path.join(SKILL_ROOT,'scripts/validate.mjs'),'--project',out];
  const before=spawnSync(process.execPath,args,{encoding:'utf8'});
  assert.equal(before.status,0,before.stderr); assert.equal(JSON.parse(before.stdout).gradle,'NOT_RUN');
  await fs.appendFile(path.join(out,'build.gradle.kts'),'// user edit\n');
  const after=spawnSync(process.execPath,args,{encoding:'utf8'}); assert.equal(after.status,2);
  assert.ok(JSON.parse(after.stdout).problems.some(x=>x.issue==='changed-since-generation'));
});
