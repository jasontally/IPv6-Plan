/**
 * IPv6 Subnet Planner E2E Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";

test.describe("Auto-split step selector (4-bit vs 8-bit)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should default to 4-bit (nibble) auto step", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "40");
    await page.click('button:has-text("Go")');

    const autoSplitSelect = page.locator("#autoSplitBitsSelect");
    await expect(autoSplitSelect).toHaveValue("4");

    // Row split dropdown Auto option should target /44 (next nibble)
    const splitSelect = page.locator(".split-select").first();
    const autoOption = splitSelect.locator("option").first();
    await expect(autoOption).toHaveText("Auto (→/44)");
  });

  test("should switch auto target to /48 when 8-bit selected", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "40");
    await page.click('button:has-text("Go")');

    await page.selectOption("#autoSplitBitsSelect", "8");

    // Auto option should now target /48 (next byte boundary)
    const splitSelect = page.locator(".split-select").first();
    const autoOption = splitSelect.locator("option").first();
    await expect(autoOption).toHaveText("Auto (→/48)");
  });

  test("should split /20 into /28 via /24 intermediate with 8-bit auto", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    await page.selectOption("#autoSplitBitsSelect", "8");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Auto target /28 crosses the /24 nibble boundary, so intermediate
    // levels remain 4-bit: 1 root + 16 /24 + 256 /28 = 273 rows
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(273);
    await expect(subnetCells.nth(1)).toHaveText("3fff::/24");
  });

  test("should split /40 into /48 via /44 intermediate with 8-bit auto", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "40");
    await page.click('button:has-text("Go")');

    await page.selectOption("#autoSplitBitsSelect", "8");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Auto target /48 crosses the /44 nibble boundary, so intermediate
    // levels remain 4-bit: 1 root + 16 /44 + 256 /48 = 273 rows
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(273);
    await expect(subnetCells.nth(1)).toHaveText("3fff::/44");
  });

  test("should persist 8-bit selection in the shareable URL", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "40");
    await page.click('button:has-text("Go")');

    await page.selectOption("#autoSplitBitsSelect", "8");

    // Reload the page; state (including autoSplitBits) is restored from hash
    await page.reload();

    const autoSplitSelect = page.locator("#autoSplitBitsSelect");
    await expect(autoSplitSelect).toHaveValue("8");

    // Restored auto target should still be /48
    const splitSelect = page.locator(".split-select").first();
    const autoOption = splitSelect.locator("option").first();
    await expect(autoOption).toHaveText("Auto (→/48)");
  });
});
