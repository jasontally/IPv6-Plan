/**
 * Vitest Configuration
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/*.test.js"],
    exclude: ["tests/e2e/**", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "tests/**",
        "node_modules/**",
        "**/*.test.js",
        "**/*.spec.js",
        "index.html",
      ],
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
});
