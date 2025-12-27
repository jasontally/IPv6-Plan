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
  },
});
