/*
 * Copyright @@NAME@@ contributors
 * SPDX-License-Identifier: Apache-2.0
 */

package @@PACKAGE@@.api;

/** A minimal public contract used to verify API compatibility and publication. */
public interface Greeter {
  /** Returns a greeting. */
  String greet(String name);
}
