plugins { id("otel.bom-conventions") }
description = "@@NAME@@ stable components"
otelBom.projectFilter.set(java.util.function.Predicate { !it.hasProperty("otel.release") })
