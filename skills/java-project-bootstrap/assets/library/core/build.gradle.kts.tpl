plugins {
  id("otel.java-conventions")
  id("otel.publish-conventions")
  id("otel.jmh-conventions")
}
description = "@@NAME@@ implementation"
otelJava.moduleName.set("@@PACKAGE@@.core")
otelJava.minJavaVersionSupported.set(JavaVersion.toVersion(@@JAVA@@))
otelJava.osgiEnabled.set(false)
dependencies {
  api(project(":api"))
}
