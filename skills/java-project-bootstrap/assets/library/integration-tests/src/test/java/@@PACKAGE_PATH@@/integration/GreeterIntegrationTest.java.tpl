/*
 * Copyright @@NAME@@ contributors
 * SPDX-License-Identifier: Apache-2.0
 */

package @@PACKAGE@@.integration;

import static org.assertj.core.api.Assertions.assertThat;

import @@PACKAGE@@.api.Greeter;
import @@PACKAGE@@.core.DefaultGreeter;
import org.junit.jupiter.api.Test;

class GreeterIntegrationTest {
  @Test
  void consumesPublicContract() {
    Greeter greeter = new DefaultGreeter();
    assertThat(greeter.greet("integration")).isEqualTo("Hello, integration");
  }
}
