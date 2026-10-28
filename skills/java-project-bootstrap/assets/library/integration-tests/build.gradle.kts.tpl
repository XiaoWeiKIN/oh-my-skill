plugins {
  id("otel.java-conventions")
}
description = "@@NAME@@ integration tests"
otelJava.moduleName.set("@@PACKAGE@@.integrationtests")
otelJava.minJavaVersionSupported.set(JavaVersion.toVersion(@@JAVA@@))
otelJava.osgiEnabled.set(false)
dependencies {
  testImplementation(project(":core"))
}
tasks.named("ossIndexAudit") { enabled = false }
