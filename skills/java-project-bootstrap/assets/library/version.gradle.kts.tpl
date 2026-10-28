// Set -PversionOverride to exercise a local release without editing this file.
extra["bootstrapVersion"] = providers.gradleProperty("versionOverride").orElse("0.1.0-SNAPSHOT").get()
