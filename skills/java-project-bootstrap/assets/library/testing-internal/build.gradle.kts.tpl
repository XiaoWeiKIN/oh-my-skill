// Reduced to the upstream JUL bridge; OTel-specific telemetry test utilities are intentionally excluded.
plugins {
  id("otel.java-conventions")
}
description = "Internal test logging support (derived from OTel)"
otelJava.moduleName.set("@@PACKAGE@@.testing")
otelJava.osgiEnabled.set(false)
dependencies {
  implementation("org.slf4j:jul-to-slf4j")
}
tasks.named("ossIndexAudit") { enabled = false }
