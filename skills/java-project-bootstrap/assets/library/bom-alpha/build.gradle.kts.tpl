plugins { id("otel.bom-conventions") }
description = "@@NAME@@ experimental components (initially empty)"
otelBom.projectFilter.set(java.util.function.Predicate { it.findProperty("otel.release") == "alpha" })
val stableVersion = rootProject.version.toString()
version = stableVersion.removeSuffix("-SNAPSHOT") + "-alpha" +
  (if (stableVersion.endsWith("-SNAPSHOT")) "-SNAPSHOT" else "")
