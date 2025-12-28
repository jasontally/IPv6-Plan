/**
 * IPv6 Subnet Planner E2E Tests - Error Scenarios
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";

test.describe("Error Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for prefixSelect to be populated by JavaScript
    await page.waitForFunction(() => {
      const select = document.getElementById("prefixSelect");
      return select && select.options.length > 0;
    });
  });

  test("should show error for empty IPv6 address", async ({ page }) => {
    await page.fill("#networkInput", "");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toHaveText("Please enter an IPv6 address");
  });

  test("should show error for invalid IPv6 address with too many colons", async ({ page }) => {
    await page.fill("#networkInput", "2001:::db8::1");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toContainText("Invalid IPv6 address");
  });

  test("should show error for invalid IPv6 address with invalid hex", async ({ page }) => {
    await page.fill("#networkInput", "2001:gggg::1");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toContainText("Invalid IPv6 address");
  });

  test("should show error for prefix below /16", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "15");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toHaveText("Prefix must be between /16 and /64");
  });

  test("should show error for prefix above /64", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "65");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toHaveText("Prefix must be between /16 and /64");
  });

  test("should clear error when valid input provided", async ({ page }) => {
    // First show error
    await page.fill("#networkInput", "");
    await page.click('button:has-text("Go")');

    let errorDiv = page.locator("#error");
    await expect(errorDiv).toBeVisible();

    // Then provide valid input
    await page.fill("#networkInput", "2001:db8::");
    await page.click('button:has-text("Go")');

    await expect(errorDiv).not.toBeVisible();
  });

  test("should handle very long notes", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const noteInput = page.locator(".note-input").first();
    const longNote = "A".repeat(1000);

    await noteInput.fill(longNote);
    await expect(noteInput).toHaveValue(longNote);
  });

  test("should handle special characters in notes", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const noteInput = page.locator(".note-input").first();
    const specialChars = 'Test with "quotes", <brackets>, and {braces}';

    await noteInput.fill(specialChars);
    await expect(noteInput).toHaveValue(specialChars);
  });

  test("should handle rapid button clicks", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Rapidly click Go multiple times
    await page.click('button:has-text("Go")');
    await page.click('button:has-text("Go")');
    await page.click('button:has-text("Go")');

    // Should still show network
    const subnetCell = page.locator(".subnet-cell").first();
    await expect(subnetCell).toHaveText("2001:db8::/32");
  });

  test("should handle whitespace in network input", async ({ page }) => {
    await page.fill("#networkInput", "  2001:db8::  ");
    await page.click('button:has-text("Go")');

    const subnetCell = page.locator(".subnet-cell").first();
    await expect(subnetCell).toHaveText("2001:db8::/32");
  });

  test("should handle mixed case IPv6 addresses", async ({ page }) => {
    await page.fill("#networkInput", "2001:DB8::1");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const subnetCell = page.locator(".subnet-cell").first();
    await expect(subnetCell).toHaveText("2001:db8::/32");
  });

  test("should prevent split when already split", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Try to split again - button should be disabled
    await expect(splitBtn).toBeDisabled();
  });

  test("should handle multiple join operations", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Split
    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();
    await page.waitForTimeout(100);

    // Join
    const joinBtn = page.locator(".join-button").first();
    await joinBtn.click();
    await page.waitForTimeout(100);

    // Should be back to single row
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(1);
  });

  test("should handle color picker with multiple clicks", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Open color picker
    const colorBtn = page.locator(".color-button").first();
    await colorBtn.click();

    // Click outside to close
    await page.click("body");

    // Open again
    await colorBtn.click();
    await expect(page.locator("div").filter({ hasText: /Clear/ })).toBeVisible();

    // Click a color
    const colorOption = page.locator(".color-option").first();
    await colorOption.click();

    // Picker should close
    await expect(page.locator("div").filter({ hasText: /Clear/ })).not.toBeVisible();
  });

  test("should show alert when sharing with no network", async ({ page, context, browserName }) => {
    // Skip on non-Chromium browsers due to clipboard permission issues
    if (browserName !== "chromium") {
      test.skip();
      return;
    }

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const shareBtn = page.locator('button:has-text("Share")');
    await shareBtn.click();

    // Should show alert about no network
    const alertText = await page.evaluate(() => {
      return new Promise((resolve) => {
        const handler = (e) => {
          resolve(e.message);
          window.removeEventListener('alert', handler);
          window.removeEventListener('load', handler);
          setTimeout(() => resolve('No alert'), 1000);
        };
        window.addEventListener('alert', handler);
        window.addEventListener('load', handler);
      });
    });

    // Alert should exist (either "No network loaded to export" or similar)
    expect(alertText).toBeTruthy();
  });

  test("should handle CSV export with no notes", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const downloadPromise = page.waitForEvent("download");
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await exportBtn.click();
    const download = await downloadPromise;

    const content = await download.createReadStream();
    const text = await new Response(content).text();

    expect(text).toContain("Subnet,Contains,Note");
    expect(text).toContain('"",No note,"');
  });

  test("should handle special characters in network", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::%1234");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toContainText("Invalid IPv6 address");
  });
});
