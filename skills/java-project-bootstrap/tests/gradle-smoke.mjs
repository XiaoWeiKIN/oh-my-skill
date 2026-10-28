// Integration test: uses the REAL pinned source and Wrapper. Never runs with synthetic fixtures.
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { SKILL_ROOT } from '../scripts/lib/project.mjs';

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'java-bootstrap-gradle-'));
const out = path.join(temp,'project');
const target = process.env.TARGET_JAVA || '21';
const cache = process.env.BOOTSTRAP_CACHE || path.join(temp,'cache');
const report = {targetJava:target,source:'real-pinned-upstream',checks:[],status:'FAIL'};
function run(exe,args,expected=0,match) {
  console.log(`RUN ${exe} ${args.join(' ')}`);
  const r=spawnSync(exe,args,{cwd:out,encoding:'utf8',timeout:900000,maxBuffer:32*1024*1024});
  const output=(r.stdout||'')+(r.stderr||'');
  process.stdout.write(output);
  if(r.error) throw r.error;
  if(expected===0) assert.equal(r.status,0,`Command failed: ${args.join(' ')}`);
  else assert.ok(r.status !== null && r.status !== 0,`Negative control unexpectedly passed: ${args.join(' ')}`);
  if(match) assert.match(output,match,'Failure did not demonstrate the intended rule');
  return output;
}
function gradle(args,expected=0,match) {
  const tasks=['--no-daemon',...args];
  return process.platform==='win32'?run('cmd.exe',['/d','/s','/c','gradlew.bat',...tasks],expected,match):run('./gradlew',tasks,expected,match);
}
async function probe(name,file,text,args,match) {
  const dest=path.join(out,file); await fs.mkdir(path.dirname(dest),{recursive:true});
  await fs.writeFile(dest,text);
  try { gradle(args,1,match); report.checks.push({name,status:'PASS'}); }
  finally { await fs.unlink(dest); }
}
try {
  const init=spawnSync(process.execPath,[path.join(SKILL_ROOT,'scripts/init.mjs'),'--name','bootstrap-probe','--group','com.example.bootstrap','--java',target,'--output',out,'--cache',cache],{encoding:'utf8',timeout:300000,maxBuffer:4*1024*1024});
  process.stdout.write(init.stdout||''); process.stderr.write(init.stderr||'');
  if(init.error) throw init.error;
  assert.equal(init.status,0,'Initialization failed');
  run(process.execPath,[path.join(SKILL_ROOT,'scripts/validate.mjs'),'--project',out]);
  gradle(['help']); report.checks.push({name:'wrapper-and-configuration',status:'PASS'});
  const build=gradle(['build',':all:jacocoTestReport',':core:jmhJar',':bom:generatePomFileForMavenPublication']);
  assert.match(build,/SKIPPED_NO_BASELINE/);
  report.checks.push({name:'clean-build-tests-coverage-benchmark-compilation',status:'PASS'});
  const pom=await fs.readFile(path.join(out,'bom/build/publications/mavenPublication/pom-default.xml'),'utf8');
  assert.match(pom,/<artifactId>bootstrap-probe-api<\/artifactId>/);
  assert.match(pom,/<artifactId>bootstrap-probe-core<\/artifactId>/);
  assert.doesNotMatch(pom,/<artifactId>bootstrap-probe-(custom-checks|integration-tests|testing-internal)<\/artifactId>/);
  report.checks.push({name:'BOM-published-module-selection',status:'PASS'});
  const dir='core/src/main/java/com/example/bootstrap/core/';
  await probe('NullAway',dir+'BadNull.java','package com.example.bootstrap.core; public final class BadNull { private BadNull() {} public static String value() { return null; } }\n',[':core:compileJava'],/\[NullAway\]/);
  await probe('Error-Prone',dir+'BadEquals.java','package com.example.bootstrap.core; public final class BadEquals { private BadEquals() {} public static boolean value(String s) { return s.equals(s); } }\n',[':core:compileJava'],/\[EqualsSelf\]/);
  await probe('custom-compiler-check',dir+'BadUtility.java','package com.example.bootstrap.core; public final class BadUtility { public static int value() { return 1; } }\n',[':core:compileJava'],/\[OtelPrivateConstructorForUtilityClass\]/);
  await probe('format-gate',dir+'BadFormat.java','package com.example.bootstrap.core;public final class BadFormat{private BadFormat(){}}   \n',[':core:spotlessJavaCheck'],/spotlessJavaCheck/);
  if(target==='8') await probe('release-API-boundary',dir+'BadApi.java','package com.example.bootstrap.core; public final class BadApi { private BadApi() {} public static Object value() { return java.util.List.of("x"); } }\n',[':core:compileJava'],/cannot find symbol/);
  else report.checks.push({name:'release-API-boundary',status:'SKIPPED',reason:'Executed by target-Java-8 matrix job'});
  gradle(['publish','-PversionOverride=0.1.0']); report.checks.push({name:'unsigned-local-publishing',status:'PASS'});
  const api=path.join(out,'api/src/main/java/com/example/bootstrap/api/Greeter.java');
  const core=path.join(out,'core/src/main/java/com/example/bootstrap/core/DefaultGreeter.java');
  await fs.writeFile(api,(await fs.readFile(api,'utf8')).replace('String greet(','String welcome('));
  await fs.writeFile(core,(await fs.readFile(core,'utf8')).replace('String greet(','String welcome('));
  gradle([':api:jApiCmp','-PapiBaseVersion=0.1.0'],1);
  const diff=await fs.readFile(path.join(out,'docs/apidiffs/current_vs_0.1.0/bootstrap-probe-api.txt'),'utf8');
  assert.match(diff,/REMOVED METHOD/); assert.match(diff,/greet/);
  report.checks.push({name:'API-breaking-change-rejected-with-baseline',status:'PASS'});
  report.status='PASS';
} catch(e) {
  report.error=e.stack || e.message; process.exitCode=1;
} finally {
  const reportPath=path.resolve(process.env.BOOTSTRAP_REPORT || `bootstrap-gradle-${target}.json`);
  await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(process.env.KEEP_BOOTSTRAP_FIXTURE==='true') console.log(`Fixture kept at ${out}`);
  else await fs.rm(temp,{recursive:true,force:true});
}
