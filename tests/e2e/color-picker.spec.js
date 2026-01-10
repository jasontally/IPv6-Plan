/**
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 * E2E tests for color picker functionality
 */

import { test, expect } from "@playwright/test";

test.describe("Color Picker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8080");
  });

  test("should open color picker when clicking color button", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const colorBtn = page.locator(".color-button").first();
    await colorBtn.click();

    // Verify picker is visible
    const picker = page
      .locator("body > div")
      .filter({ hasText: "Clear" })
      .first();
    await expect(picker).toBeVisible();

    // Should have 16 color options
    const colorOptions = page.locator(".color-option");
    await expect(colorOptions).toHaveCount(16);
  });

  test("should set row color when clicking a color option", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const colorBtn = page.locator(".color-button").first();
    await colorBtn.click();

    // Wait for color options to be visible
    const colorOptions = page.locator(".color-option");
    await colorOptions.first().waitFor({ state: "attached" });

    // Click the first color option (pink)
    await colorOptions.nth(0).click();

    // Picker should close
    const picker = page.locator("body > div").filter({ hasText: "Clear" });
    await expect(picker).not.toBeVisible();

    // First row should be colored
    const firstRow = page.locator("tbody > tr").first();
    const bgColor = await firstRow.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Background color should be one of our palette colors
    const PINK = "rgb(255, 229, 229)";
    expect(bgColor).toBe(PINK);
  });

  test("should clear color when clicking Clear button", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const colorBtn = page.locator(".color-button").first();
    await colorBtn.click();

    // Click a color first
    const colorOptions = page.locator(".color-option");
    await colorOptions.first().waitFor({ state: "attached" });
    await colorOptions.nth(0).click();

    // Verify row is colored
    let firstRow = page.locator("tbody > tr").first();
    let bgColor = await firstRow.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).not.toBe("rgba(0, 0, 0, 0)"); // Not white/transparent

    // Open picker again
    await colorBtn.click();
    const picker = page.locator("body > div").filter({ hasText: "Clear" });
    await expect(picker).toBeVisible();

    // Click Clear button
    await picker.getByText("Clear").click();

    // Picker should close
    await expect(picker).not.toBeVisible();

    // Row color should be cleared (white/transparent)
    firstRow = page.locator("tbody > tr").first();
    bgColor = await firstRow.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).toBe("rgba(0, 0, 0, 0)");
  });

  test("should close picker when clicking outside", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const colorBtn = page.locator(".color-button").first();
    await colorBtn.click();

    // Wait for picker to be visible
    const picker = page.locator("body > div").filter({ hasText: "Clear" });
    await expect(picker).toBeVisible();

    // Click outside the picker (on the main table area)
    await page.locator(".subnet-table-container").click();

    // Picker should close
    await expect(picker).not.toBeVisible();
  });

  test("should close picker when clicking a color option", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const colorBtn = page.locator(".color-button").first();
    await colorBtn.click();

    // Wait for picker
    const picker = page.locator("body > div").filter({ hasText: "Clear" });
    await expect(picker).toBeVisible();

    // Click a color option
    const colorOptions = page.locator(".color-option");
    await colorOptions.first().waitFor({ state: "attached" });
    await colorOptions.nth(5).click();

    // Picker should close immediately after selecting a color
    await expect(picker).not.toBeVisible();
  });

  test.skip("should only show one picker at a time", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    // Open picker for first row
    const colorBtn1 = page.locator(".color-button").first();
    await colorBtn1.click();

    // Wait for page to stabilize before opening second picker
    await page.waitForTimeout(100);

    // Try to open picker for second row before closing first one
    const colorBtn2 = page.locator(".color-button").nth(1);
    await colorBtn2.click();

    // Wait for second picker to appear
    await page.waitForTimeout(100);

    // Should only have one picker visible (the most recent one)
    const pickers = page.locator("body > div").filter({ hasText: "Clear" });
    await expect(pickers).toHaveCount(1);
  });

  test("should handle multiple color selections", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    // Set first row to pink
    const colorBtn1 = page.locator(".color-button").first();
    await colorBtn1.click();
    const colorOptions = page.locator(".color-option");
    await colorOptions.first().waitFor({ state: "attached" });
    await colorOptions.nth(0).click();

    // Wait for picker to close
    const picker1 = page.locator("body > div").filter({ hasText: "Clear" });
    await expect(picker1).not.toBeVisible();

    // Set first row to blue (sky blue)
    await colorBtn1.click();
    await colorOptions.nth(1).waitFor({ state: "attached" });
    await colorOptions.nth(1).click();

    // Verify the first row background changed to blue
    const firstRow = page.locator("tbody > tr").first();
    const bgColor = await firstRow.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    const SKY_BLUE = "rgb(229, 243, 255)";
    expect(bgColor).toBe(SKY_BLUE);
  });
});
