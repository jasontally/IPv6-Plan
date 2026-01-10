/**
 * IPv6 Subnet Planner E2E Tests - Initialization
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";

test.describe("Initialization", () => {
  test("should populate prefix select with all options from /16 to /64", async ({
    page,
  }) => {
    await page.goto("/");

    const prefixSelect = page.locator("#prefixSelect");

    // Count all options in select
    const options = prefixSelect.locator("option");
    const count = await options.count();

    // Should have 49 options: /16 through /64
    expect(count).toBe(49);

    // Verify first option
    const firstOption = options.first();
    await expect(firstOption).toHaveAttribute("value", "16");
    await expect(firstOption).toHaveText("/16");

    // Verify last option
    const lastOption = options.last();
    await expect(lastOption).toHaveAttribute("value", "64");
    await expect(lastOption).toHaveText("/64");
  });

  test("should have prefix select options in correct order", async ({
    page,
  }) => {
    await page.goto("/");

    const prefixSelect = page.locator("#prefixSelect");
    const options = prefixSelect.locator("option");

    // Get all option values
    const values = await options.allTextContents();

    // Verify they're in ascending order
    for (let i = 0; i < values.length - 1; i++) {
      const current = parseInt(values[i].replace("/", ""));
      const next = parseInt(values[i + 1].replace("/", ""));
      expect(next).toBe(current + 1);
    }
  });

  test("should initialize with default network and prefix values", async ({
    page,
  }) => {
    await page.goto("/");

    // Check default network address
    const networkInput = page.locator("#networkInput");
    await expect(networkInput).toHaveValue("3fff::");

    // Check default prefix
    const prefixSelect = page.locator("#prefixSelect");
    await expect(prefixSelect).toHaveValue("20");
  });

  test("should have accessible prefix select with proper options", async ({
    page,
  }) => {
    await page.goto("/");

    const prefixSelect = page.locator("#prefixSelect");

    // Verify select is accessible
    await expect(prefixSelect).toBeEnabled();
    await expect(prefixSelect).toBeVisible();

    // Verify it has a label
    const label = page.locator('label[for="prefixSelect"]');
    await expect(label).toBeVisible();
  });
});
