/**
 * IPv6 Subnet Planner E2E Tests - Error Scenarios
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";

test.describe("Error Scenarios", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the page to be ready - Playwright's auto-waiting handles the rest
    await page.waitForLoadState("domcontentloaded");
  });

  test("should show error for empty IPv6 address", async ({ page }) => {
    await page.fill("#networkInput", "");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toHaveText("Please enter an IPv6 address");
  });

  test("should show error for invalid IPv6 address with too many colons", async ({
    page,
  }) => {
    await page.fill("#networkInput", "2001:::db8::1");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toContainText("Invalid IPv6 address");
  });

  test("should show error for invalid IPv6 address with invalid hex", async ({
    page,
  }) => {
    await page.fill("#networkInput", "2001:gggg::1");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toContainText("Invalid IPv6 address");
  });

  // Note: Tests for prefix below /16 and above /64 removed
  // The UI only allows selecting /16-/64, so these edge cases are
  // prevented by the UI itself and don't need runtime error handling

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
    await page.selectOption("#prefixSelect", "32");
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

  test("should have color button that is clickable", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Wait for the table to be rendered with color buttons
    const colorBtn = page.locator(".color-button").first();
    await expect(colorBtn).toBeVisible();

    // Verify the color button exists and is in the correct location (inside table)
    const colorCell = page
      .locator("td")
      .filter({ has: page.locator(".color-button") });
    await expect(colorCell).toBeVisible();

    // Color button should be clickable (this just verifies the button doesn't throw errors)
    await colorBtn.click();

    // Give some time for any UI update
    await page.waitForTimeout(200);

    // Note: The color picker opens and closes very quickly due to event handling
    // This test mainly verifies the button exists and is clickable without errors
  });

  test("should show alert when sharing URL", async ({
    page,
    context,
    browserName,
  }) => {
    // Skip on non-Chromium browsers due to clipboard permission issues
    if (browserName !== "chromium") {
      test.skip();
      return;
    }

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Load a network first (Share copies current URL with state)
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Set up dialog handler before clicking Share
    let alertMessage = "";
    page.on("dialog", async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    const shareBtn = page.locator('button:has-text("Share")');
    await shareBtn.click();

    // Wait a bit for the alert to be processed
    await page.waitForTimeout(500);

    // Alert should show URL copied message
    expect(alertMessage).toContain("URL copied to clipboard");
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
    // CSV format: "subnet","contains","note" - note is empty string for no notes
    expect(text).toContain('"2001:db8::/32"');
    expect(text).toContain('""'); // Empty note
  });

  test("should handle special characters in network", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::%1234");
    await page.click('button:has-text("Go")');

    const errorDiv = page.locator("#error");
    await expect(errorDiv).toContainText("Invalid IPv6 address");
  });
});
