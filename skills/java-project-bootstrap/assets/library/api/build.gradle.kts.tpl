plugins {
  id("otel.java-conventions")
  id("otel.publish-conventions")
}
description = "@@NAME@@ public API"
otelJava.moduleName.set("@@PACKAGE@@.api")
otelJava.minJavaVersionSupported.set(JavaVersion.toVersion(@@JAVA@@))
// OSGi packaging remains available but is not advertised by this generic library.
otelJava.osgiEnabled.set(false)
