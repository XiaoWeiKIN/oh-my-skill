org.gradle.jvmargs=-Xmx2g -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.caching=true
# OTel's cross-project build logic is retained. Do not claim configuration-cache compatibility.
org.gradle.configuration-cache=false
# The compiler runs on JDK 25; @@JAVA@@ is the consumer bytecode/API target.
