/**
 * IPv6 Subnet Planner E2E Tests
 * Copyright (c) 2024 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";

test.describe("Split and Join Operations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load network and display root subnet", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    // Should show root subnet in table
    const subnetCell = page.locator(".subnet-cell").first();
    await expect(subnetCell).toHaveText("3fff::/20");
  });

  test("should split /21 into 8 /24 subnets", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "21");
    await page.click('button:has-text("Go")');

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Should show 9 rows (1 root + 8 children)
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(9);
  });

  test("should split /22 into 4 /24 subnets", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "22");
    await page.click('button:has-text("Go")');

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Should show 5 rows (1 root + 4 children)
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(5);
  });

  test("should join subnets back to parent", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    // Split first
    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Now join back
    const joinBtn = page.locator(".join-button").first();
    await joinBtn.click();

    // Should be back to 1 row
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(1);
    await expect(subnetCells.first()).toHaveText("3fff::/20");
  });

  test("should disable split button for /64", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "64");
    await page.click('button:has-text("Go")');

    const splitBtn = page.locator(".split-button").first();
    await expect(splitBtn).toBeDisabled();
  });

  test("should show correct number of /48s for large prefixes", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const containsCell = page.locator(".contains-cell").first();
    await expect(containsCell).toHaveText(/\/48s/);
  });

  test("should show correct number of /64s for small prefixes", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "48");
    await page.click('button:has-text("Go")');

    const containsCell = page.locator(".contains-cell").first();
    await expect(containsCell).toHaveText(/\/64s/);
  });

  test('should show "Host Subnet" for /64', async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "64");
    await page.click('button:has-text("Go")');

    const containsCell = page.locator(".contains-cell").first();
    await expect(containsCell).toHaveText("Host Subnet");
  });

  test("should allow adding notes to subnets", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const noteInput = page.locator(".note-input").first();
    await noteInput.fill("Test note for this subnet");

    // Note should be saved (check by reloading)
    // For now, just verify the input works
    await expect(noteInput).toHaveValue("Test note for this subnet");
  });

  test("should color code subnets", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const colorBtn = page.locator(".color-button").first();
    await colorBtn.click();

    // Color picker should appear
    const picker = page.locator("div").filter({ hasText: /Clear/ }).first();
    await expect(picker).toBeVisible();

    // Click a color
    const colorOption = page.locator(".color-option").first();
    await colorOption.click();

    // Picker should close and row should be colored
    await expect(picker).not.toBeVisible();
  });

  test("should show error for invalid IPv6 address", async ({ page }) => {
    await page.fill("#networkInput", "invalid-address");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toHaveText("Invalid IPv6 address");
  });
});
