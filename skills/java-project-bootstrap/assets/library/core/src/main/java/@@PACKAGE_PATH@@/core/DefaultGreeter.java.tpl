/*
 * Copyright @@NAME@@ contributors
 * SPDX-License-Identifier: Apache-2.0
 */

package @@PACKAGE@@.core;

import @@PACKAGE@@.api.Greeter;
import java.util.Objects;

/** The default implementation of the sample API. */
public final class DefaultGreeter implements Greeter {
  @Override
  public String greet(String name) {
    return "Hello, " + Objects.requireNonNull(name, "name");
  }
}
