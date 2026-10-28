import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { digest, noSymlinks, safePath } from './source.mjs';

export const SKILL_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const LOCK_FILE = path.join(SKILL_ROOT, 'references/upstream.json');
export const PLUGINS = ['java', 'errorprone', 'spotless', 'jacoco', 'japicmp', 'animalsniffer', 'bom', 'publish', 'protobuf', 'jmh'];
const JAVA_WORDS = new Set(('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null _').split(' '));

export function configuration(input) {
  const c = {
    name: input.name, group: input.group, package: input.package || input.group,
    java: Number(input.java ?? 21), type: input.type || 'library',
    preset: input.preset || 'otel-faithful',
    repository: input.repository || `https://example.invalid/${input.name}`
  };
  if (typeof c.name !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(c.name) ||
      c.name.length > 63 || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(c.name)) {
    throw new Error('name must be portable lower-case kebab-case (1-63 characters)');
  }
  for (const key of ['group', 'package']) {
    const value = c[key];
    if (typeof value !== 'string' || value.length > 200 ||
        !/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(value) ||
        value.split('.').some(p => JAVA_WORDS.has(p))) throw new Error(`Invalid Java ${key}: ${value}`);
  }
  if (c.group === 'io.opentelemetry' || c.group.startsWith('io.opentelemetry.') ||
      c.package === 'io.opentelemetry' || c.package.startsWith('io.opentelemetry.')) {
    throw new Error('Do not generate new projects in the OpenTelemetry namespace');
  }
  if (![8, 11, 17, 21, 25].includes(c.java)) throw new Error('java must be 8, 11, 17, 21, or 25');
  if (c.type !== 'library' || c.preset !== 'otel-faithful') {
    throw new Error('Version 0.1 supports only --type library --preset otel-faithful');
  }
  if (!/^https:\/\/[a-z0-9.-]+\/[a-zA-Z0-9_./-]+$/.test(c.repository) ||
      new URL(c.repository).pathname.split('/').includes('..')) throw new Error('repository must be a simple HTTPS repository URL');
  return c;
}

export function replaceRequired(text, from, to, expected = 1) {
  const count = text.split(from).length - 1;
  if (count !== expected) throw new Error(`Patch precondition failed (${count} != ${expected}): ${from}`);
  return text.split(from).join(to);
}

export function patchSource(file, text, c) {
  let result = text;
  const changes = [];
  const replace = (from, to, reason, expected = 1) => {
    result = replaceRequired(result, from, to, expected);
    changes.push(reason);
  };
  if (file.endsWith('/otel.java-conventions.gradle.kts')) {
    replace('startsWith("opentelemetry-")', `startsWith("${c.name}-")`, 'artifact-prefix');
    replace('archivesName.set("opentelemetry-$name")', `archivesName.set("${c.name}-$name")`, 'artifact-name');
    replace('exclude("io/opentelemetry/**/internal/**")', `exclude("${c.package.replaceAll('.', '/')}/**/internal/**")`, 'javadoc-packages');
    replace('source = "8"', `source = "${c.java}"`, 'javadoc-language');
    replace('"-exportcontents" to "io.opentelemetry.*"', `"-exportcontents" to "${c.package}.*"`, 'osgi-package-identity');
    replace('implementation(project(":testing-internal"))',
      'if (project.path != ":testing-internal") { implementation(project(":testing-internal")) }', 'avoid-test-helper-self-dependency');
    replace('File(propertiesDir.get(), "version.properties").writeText("sdk.version=${versionProperty}")',
      'propertiesDir.get().mkdirs()\n        File(propertiesDir.get(), "version.properties").writeText("project.version=${versionProperty}")', 'generic-version-resource');
  } else if (file.endsWith('/otel.errorprone-conventions.gradle.kts')) {
    replace('annotatedPackages.add("io.opentelemetry")',
      `annotatedPackages.addAll("io.opentelemetry", "${c.package}")`, 'include-user-packages-in-nullaway');
  } else if (file.endsWith('/otel.spotless-conventions.gradle.kts')) {
    const expression = 'rootProject.file("buildscripts/spotless.license.java")';
    const count = text.split(expression).length - 1;
    if (count !== 4) throw new Error('Unexpected upstream license-header sites');
    replace(expression,
      'rootProject.file(if (project.name in listOf("custom-checks", "testing-internal", "animal-sniffer-signature")) "buildscripts/spotless.license.upstream.java" else "buildscripts/spotless.license.java")',
      'preserve-upstream-copyright-separately', 4);
  } else if (file.endsWith('/otel.publish-conventions.gradle.kts')) {
    replace('groupId = "io.opentelemetry"', `groupId = "${c.group}"`, 'maven-group');
    replace('name.set("OpenTelemetry Java")', `name.set("${c.name}")`, 'pom-name');
    replace('url.set("https://github.com/open-telemetry/opentelemetry-java")', `url.set("${c.repository}")`, 'pom-url');
    replace('id.set("opentelemetry")', `id.set("${c.name}")`, 'pom-developer-id');
    replace('name.set("OpenTelemetry")', `name.set("${c.name} contributors")`, 'pom-developer-name');
    replace('url.set("https://github.com/open-telemetry/community")', `url.set("${c.repository}")`, 'pom-developer-url');
    replace('scm:git:git@github.com:open-telemetry/opentelemetry-java.git', `scm:git:${c.repository}.git`, 'scm-identity', 2);
    replace('url.set("git@github.com:open-telemetry/opentelemetry-java.git")', `url.set("${c.repository}")`, 'scm-url');
    replace('if (System.getenv("CI") != null)',
      'if (providers.gradleProperty("releaseSigning").orElse("false").get().toBoolean())', 'explicit-signing-opt-in');
    result += '\n// Only a project-local Maven repository is configured; remote release requires a separate review.\npublishing {\n  repositories {\n    maven {\n      name = "BootstrapLocal"\n      url = uri("${rootProject.projectDir}/build/local-repository")\n    }\n  }\n}\n';
    changes.push('local-publication-destination');
  } else if (file.endsWith('/otel.japicmp-conventions.gradle.kts')) {
    replace('"io.opentelemetry:${it.base.archivesName.get()}:$version@jar"',
      `"${c.group}:` + '${it.base.archivesName.get()}:$version@jar"', 'baseline-coordinates');
    replace('if (!project.hasProperty("otel.release") && !project.name.startsWith("bom")) {',
      'if (apidiffBaselineVersion.isNotEmpty() && !project.hasProperty("otel.release") && !project.name.startsWith("bom")) {', 'first-release-baseline-state');
    result += '\n// First release has no comparison artifact. This is a visible SKIP, not a compatibility PASS.\nif (apidiffBaselineVersion.isEmpty() && !project.hasProperty("otel.release") && !project.name.startsWith("bom")) {\n  val noBaseline = tasks.register("jApiCmp") {\n    doLast { logger.lifecycle("SKIPPED_NO_BASELINE: set -PapiBaseVersion=<published-version>") }\n  }\n  tasks.named("check") { dependsOn(noBaseline) }\n}\n';
  } else if (file === 'all/build.gradle.kts') {
    replace('description = "OpenTelemetry All"', `description = "${c.name} aggregate coverage"`, 'coverage-description');
    replace('otelJava.moduleName.set("io.opentelemetry.all")', `otelJava.moduleName.set("${c.package}.all")`, 'coverage-module-name');
  } else if (file === 'custom-checks/build.gradle.kts') {
    result += '\n// Build tooling is not a published OSGi component.\notelJava.osgiEnabled.set(false)\n';
    changes.push('build-tool-osgi-disabled');
  }
  if (changes.length) result = `// Modified by java-project-bootstrap 0.1.0; changes: ${changes.join(', ')}.\n` + result;
  return { text: result, changes };
}

export function renderTokens(text, c) {
  const tokens = { NAME: c.name, GROUP: c.group, PACKAGE: c.package,
    PACKAGE_PATH: c.package.replaceAll('.', '/'), JAVA: String(c.java), REPOSITORY: c.repository,
    TEST_JAVA_MATRIX: [...new Set([c.java, 25])].join(', ') };
  return text.replace(/@@([A-Z_]+)@@/g, (_, key) => {
    if (!(key in tokens)) throw new Error(`Unknown template token: ${key}`);
    return tokens[key];
  });
}

async function loadTemplates(directory, relative = '') {
  const output = new Map();
  for (const entry of (await fs.readdir(path.join(directory, relative), { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Template symlink: ${name}`);
    if (entry.isDirectory()) for (const [p, t] of await loadTemplates(directory, name)) output.set(p, t);
    else if (entry.isFile() && name.endsWith('.tpl')) output.set(name.slice(0, -4), await fs.readFile(path.join(directory, name), 'utf8'));
  }
  return output;
}

export async function renderProject(source, c, lock) {
  const files = new Map();
  const provenance = [];
  for (const [p, record] of [...source].sort(([a],[b]) => a.localeCompare(b, 'en'))) {
    safePath(p);
    const binary = p.endsWith('.jar');
    const patched = binary ? { changes: [] } : patchSource(p, record.bytes.toString('utf8'), c);
    const bytes = binary ? record.bytes : Buffer.from(patched.text);
    files.set(p, { bytes, mode: record.mode });
    provenance.push({ path: p, blob: record.upstreamBlob, sha256: digest(record.bytes), changes: patched.changes });
  }
  for (const plugin of PLUGINS) {
    if (!files.has(`buildSrc/src/main/kotlin/otel.${plugin}-conventions.gradle.kts`)) throw new Error(`Missing upstream convention: ${plugin}`);
  }
  const license = files.get('buildscripts/spotless.license.java');
  if (!license) throw new Error('Missing upstream copyright template');
  files.set('buildscripts/spotless.license.upstream.java', license);
  // OTel's checkers/support stay in their original namespace and retain their original copyright.
  for (const [p, text] of await loadTemplates(path.join(SKILL_ROOT, 'assets/library'))) {
    files.set(safePath(renderTokens(p, c)), { bytes: Buffer.from(renderTokens(text, c)), mode: 0o644 });
  }
  const properties = files.get('gradle/wrapper/gradle-wrapper.properties')?.bytes.toString('utf8') || '';
  if (!properties.includes(`gradle-${lock.gradle}-bin.zip`) || !properties.includes(`distributionSha256Sum=${lock.distributionSha256}`)) {
    throw new Error('Wrapper distribution differs from the pinned engineering contract');
  }
  const jar = files.get('gradle/wrapper/gradle-wrapper.jar')?.bytes;
  if (!jar || jar.length < 1000 || !jar.subarray(0, 2).equals(Buffer.from('PK'))) throw new Error('Missing or invalid real Wrapper JAR');
  files.get('gradlew').mode = 0o755;
  files.set('docs/upstream-provenance.json', { mode: 0o644, bytes: Buffer.from(JSON.stringify({
    repository: lock.repository, commit: lock.commit, tree: lock.tree, files: provenance
  }, null, 2) + '\n') });
  const fidelity = await fs.readFile(path.join(SKILL_ROOT, 'references/fidelity.md'));
  files.set('docs/bootstrap-fidelity.md', { bytes: fidelity, mode: 0o644 });
  // Deliberately omit timestamps, absolute paths and machine identity for deterministic generation.
  const manifest = {
    schema: 1, templateVersion: lock.templateVersion, upstream: { repository: lock.repository, commit: lock.commit, tree: lock.tree },
    config: c, buildJava: lock.buildJava, apiCompatibility: 'no-baseline',
    files: Object.fromEntries([...files].sort(([a],[b]) => a.localeCompare(b, 'en')).map(([p,r]) => [p, { sha256: digest(r.bytes), mode: r.mode }]))
  };
  files.set('.project-bootstrap.json', { bytes: Buffer.from(JSON.stringify(manifest, null, 2) + '\n'), mode: 0o644 });
  return { files, manifest };
}

/** Acquire and render before reserving the destination. Never overwrite an existing directory. */
export async function writeProject(destination, files) {
  const out = path.resolve(destination);
  await noSymlinks(out);
  try { await fs.lstat(out); throw new Error(`Destination exists; refusing overwrite: ${out}`); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  await fs.mkdir(path.dirname(out), { recursive: true });
  await noSymlinks(out);
  await fs.mkdir(out); // exclusive reservation, including empty existing directories
  const written = [];
  const dirs = new Set([out]);
  try {
    for (const [relative, record] of files) {
      const target = path.join(out, safePath(relative));
      let parent = path.dirname(target);
      while (parent !== out) { dirs.add(parent); parent = path.dirname(parent); }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await noSymlinks(target);
      await fs.writeFile(target, record.bytes, { flag: 'wx', mode: record.mode });
      written.push(target);
      await fs.chmod(target, record.mode);
    }
  } catch (error) {
    // Surgical rollback: never recursively delete files somebody else created concurrently.
    for (const file of written.reverse()) await fs.unlink(file).catch(() => {});
    for (const dir of [...dirs].sort((a,b) => b.length-a.length)) await fs.rmdir(dir).catch(() => {});
    throw error;
  }
}
