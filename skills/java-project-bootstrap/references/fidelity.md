# Engineering fidelity contract

## Baseline and scope

The `otel-faithful` preset derives its build mechanisms from
`open-telemetry/opentelemetry-java@d97e4af88cc2e29d1dfe00b126ab31f7a2a7cf73`
(2026-10-22; tree `bfab38c9f9997c9bc70c4435c1f55f2e5ccf7388`).
The compiler/tooling JDK is 25 and Gradle is 9.8.1. Target Java is independently
selectable: 8, 11, 17, 21, 25. This is a pinned engineering snapshot, not a promise
that the moving upstream branch, every environment or every optional plugin has
already been tested.

First-release scope: a generic multi-module Java **library** with API, core,
integration tests, internal test logging, custom compiler checks, aggregate coverage,
stable/alpha BOMs and a sample JMH benchmark. No telemetry business implementation,
Java Agent instrumentation, Spring application or automatic repository upgrade is included.

## Mapping

| Upstream mechanism | Generated mapping | Status and evidence required |
|---|---|---|
| `otel.java-conventions` | Original `buildSrc` plugin, explicit project identity patches | Compiler target/toolchain separation, `-Werror`, conflict policy, testing preserved; run real clean build |
| `otel.errorprone-conventions` | Original Error Prone, NullAway, custom-check registration | Add user package to NullAway; negative `EqualsSelf`, null-return and utility-class probes |
| `otel.spotless-conventions` | Original formatting engines/configuration | Separate user/source copyright headers; negative formatting probe |
| `otel.jacoco-conventions` | Original variants + adapted original `all` aggregator | Generate actual HTML/XML reports; no new percentage threshold claimed |
| `otel.japicmp-conventions` | Original compatibility rules with new coordinates and explicit first-release state | No baseline: visible SKIP. Known baseline: removed API must fail |
| `otel.bom-conventions` | Original module-selection and composite-substitution mechanism | Stable BOM includes API/core only; alpha BOM starts empty |
| `otel.publish-conventions` | Original POM/component/version mapping with project metadata | Local Maven repository only; signing is explicit, not triggered merely by CI |
| `otel.jmh-conventions` | Original benchmark plugin applied to core | Benchmark compilation in build test; throughput/latency not claimed without running measurements |
| `otel.animalsniffer-conventions` | Original plugin and signature-building module retained | Dormant for generic Java library; Android support not claimed without dedicated tests/configuration |
| `otel.protobuf-conventions` | Original plugin and build helpers retained | Dormant until schemas/consuming module are configured; not a verified generic protobuf preset |

The plugin IDs and build-tool Java/Kotlin namespaces retain `otel`/`io.opentelemetry`
for traceability. Public Java packages, Maven coordinates and POM ownership use the
new project identity. This does not imply the project is an OpenTelemetry distribution.

## Deliberate adaptations

- Keep `buildSrc`; do not silently modernize to an included build.
- Replace OTel's business-module graph with a small compiling API/core example.
- Retain the internal dependency platform rather than inventing new third-party versions.
- Reduce `testing-internal` to the original JUL-to-SLF4J bridge. Prevent self-dependency.
- Preserve all original custom check implementations/tests and their copyright.
- Javadoc uses the selected target level. Public OSGi metadata is disabled for the generic
  library; original machinery remains available for an explicitly validated OSGi project.
- Add explicit creation of generated version-resource directories and use `project.version`.
- Configure no public Maven destination, no OTel organization namespace, no secret values,
  no OTel remote cache, no automatic build-scan publication, and no automatic tag/release.
- Generated CI uses three OS families. Runtime JDK coverage is defined by the emitted
  workflow; the generator does not claim that merely generating YAML ran those jobs.
- Do not copy upstream's organization administration, issue-management, release automation,
  GraalVM test suites or performance dashboards as if they were configured for a new owner.
- No broad string replacement of `io.opentelemetry`: dependencies and vendored build-tool
  packages must not be renamed into nonexistent coordinates.

Every literal source patch has a checked occurrence count. Unexpected source drift aborts
instead of silently producing an approximate build. `docs/upstream-provenance.json` lists
original Git blob IDs/SHA-256 and applied patches; `.project-bootstrap.json` records the
resulting generated file hashes. `compare` reconstructs expected output without trusting
only the hashes stored in the generated project.

## Acquisition, reproducibility and safety

The skill contains project-specific text templates and a source lock. It does **not** bundle
all upstream binaries. On first generation, it obtains a recursive Git tree via GitHub API,
recomputes every tree hash against the pinned root, then downloads only allowlisted files.
Each downloaded file, including `gradle-wrapper.jar`, is verified against the corresponding
Git blob hash. The Wrapper distribution's independent SHA-256 is checked against the lock.
There is no `curl | sh`, `eval`, source-driven command execution or shell-based templating.

A cache contains the original `tree.json` and file bytes under the pinned commit. Cache
reads are verified again, not trusted on presence alone. A fully populated cache supports
`--offline` generation. An offline Gradle build additionally needs the distribution and
plugin/dependency caches; the initializer does not claim to supply them.

Equal parameters, snapshot and template version produce equal generated bytes. No timestamp,
absolute path or machine identity is written by the generator. This statement does not
promise reproducible JAR bytes: upstream manifests include environment-sensitive fields.
A full reproducible-build assessment requires separate measurement.

Reject invalid Java identifiers, unsupported variants, symlink targets, traversal paths and
existing destination directories. Acquire/render before reserving the output. On write
failure remove only files created by this operation; never recursively delete a potentially
concurrently modified user directory. Do not operate inside an adversarial shared directory.

## Validation levels

1. Offline Node tests: parser, checked transforms, Git tree/blob integrity, offline cache,
   deterministic rendering, no-overwrite, symlink/traversal controls, drift and honest status.
   Synthetic source fixtures are not Gradle-build evidence.
2. Real integration: fetch the pinned upstream, generate a project, run Wrapper/help/build,
   tests/coverage/JMH compilation/BOM POM, then negative formatting, Error Prone, NullAway,
   custom-check, target-API and binary/source-compatibility probes. Publish only to a local
   temporary Maven repository to create the first baseline.
3. Optional features: security audit, Android, protobuf consumers, remote publishing, OSGi,
   GraalVM, production performance and a full OS/JDK matrix each require their own evidence.
   Untested or credential-dependent checks must remain NOT_RUN/SKIPPED, never PASS.

Do not claim an unconditional “100% 1:1” score. The deliverable is source-derived engineering
mechanisms plus a declared adaptation ledger and executable acceptance tests.

## Source references

- https://github.com/open-telemetry/opentelemetry-java/tree/d97e4af88cc2e29d1dfe00b126ab31f7a2a7cf73/buildSrc
- https://github.com/open-telemetry/opentelemetry-java/blob/d97e4af88cc2e29d1dfe00b126ab31f7a2a7cf73/VERSIONING.md
- https://docs.gradle.org/current/userguide/gradle_wrapper.html
- https://agentskills.io/specification

Copied upstream files retain their original Apache-2.0 license/attribution. Modified source
files carry modification notices. Generated new Java source is attributed to the new project's
contributors under Apache-2.0. Change project licensing intentionally before distribution;
do not remove attribution from copied upstream build code.
