/*
 * Copyright @@NAME@@ contributors
 * SPDX-License-Identifier: Apache-2.0
 */

package @@PACKAGE@@.core;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class DefaultGreeterTest {
  @Test
  void greets() {
    assertThat(new DefaultGreeter().greet("Java")).isEqualTo("Hello, Java");
  }
}
