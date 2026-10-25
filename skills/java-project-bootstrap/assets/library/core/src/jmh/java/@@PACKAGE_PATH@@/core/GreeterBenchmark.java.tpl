/*
 * Copyright @@NAME@@ contributors
 * SPDX-License-Identifier: Apache-2.0
 */

package @@PACKAGE@@.core;

import org.openjdk.jmh.annotations.Benchmark;
import org.openjdk.jmh.annotations.Scope;
import org.openjdk.jmh.annotations.State;

/** A smoke benchmark, not a performance claim. */
@State(Scope.Thread)
public class GreeterBenchmark {
  private final DefaultGreeter greeter = new DefaultGreeter();

  @Benchmark
  public String greet() {
    return greeter.greet("Java");
  }
}
