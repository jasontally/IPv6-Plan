/**
 * IPv6 Subnet Planner E2E Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";
import { submitGo } from "./helpers";

test.describe("Auto-split step selector (4-bit vs 8-bit)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should default to 4-bit (nibble) auto step", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "40");
    await submitGo(page);

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
    await submitGo(page);

    await page.selectOption("#autoSplitBitsSelect", "8");

    // Auto option should now target /48 (next byte boundary)
    const splitSelect = page.locator(".split-select").first();
    const autoOption = splitSelect.locator("option").first();
    await expect(autoOption).toHaveText("Auto (→/48)");
  });

  test("should split /20 directly into 256 /28s with 8-bit auto (no /24 intermediate)", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await submitGo(page);

    await page.selectOption("#autoSplitBitsSelect", "8");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // 8-bit step: /20 → /28 is a single boundary, no intermediate
    // 1 root + 256 children = 257 rows
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(257);
    await expect(subnetCells.nth(1)).toHaveText("3fff::/28");

    // Join button should be /20 (root), not /24 (which would appear with 4-bit)
    const joinBtn = page.locator(".join-button").first();
    await expect(joinBtn).toHaveText("/20");
  });

  test("should split /40 directly into 256 /48s with 8-bit auto (no /44 intermediate)", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "40");
    await submitGo(page);

    await page.selectOption("#autoSplitBitsSelect", "8");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // 8-bit step: /40 → /48 is a single boundary, no intermediate
    // 1 root + 256 children = 257 rows
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(257);
    await expect(subnetCells.nth(1)).toHaveText("3fff::/48");

    // Join button should be /40 (root), not /44
    const joinBtn = page.locator(".join-button").first();
    await expect(joinBtn).toHaveText("/40");
  });

  test("should use 8-bit intermediates for custom splits (skips /52 for /48→/57)", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "48");
    await submitGo(page);

    await page.selectOption("#autoSplitBitsSelect", "8");

    // Custom split to /57 — auto target is /56 (skipped from dropdown)
    // With 8-bit: intermediate at /56 only, skipping /52
    // 1 root + 256 /56 + 512 /57 = 769 rows
    // (4-bit would be /48 → /52 → /56 → /57 = 785 rows)
    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("57");
    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(769);

    // No /52 join button should exist (would appear with 4-bit step)
    const joinButtons = page.locator(".join-button");
    const joinTexts = await joinButtons.allTextContents();
    expect(joinTexts).not.toContain("/52");
    expect(joinTexts).toContain("/56");
  });

  test("should persist 8-bit selection in the shareable URL", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "40");
    await submitGo(page);

    await page.selectOption("#autoSplitBitsSelect", "8");

    // Wait until the selection has been encoded into the URL hash;
    // reloading earlier would restore the previous (4-bit) state.
    const urlBeforeSelection = page.url();
    await expect.poll(() => page.url()).not.toBe(urlBeforeSelection);

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
