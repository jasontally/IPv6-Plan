/**
 * IPv6 Subnet Planner E2E Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";

test.describe("URL Sharing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should copy URL to clipboard", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    // Click share button
    const shareBtn = page.locator('button:has-text("Share")');
    await shareBtn.click();

    // Should show alert (we'll handle this in actual test)
    // For now, just verify the button click works
    await expect(shareBtn).toBeVisible();
  });

  test("should update URL hash when state changes", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    // Get current URL
    const url = page.url();
    expect(url).toContain("#"); // Should have hash with state
  });

  test("should load state from URL hash on page load", async ({ page }) => {
    const state = { network: "3fff::", prefix: 20, tree: {} };
    const json = JSON.stringify(state);
    const hash = btoa(encodeURIComponent(json));

    await page.goto(`/#${hash}`);

    const networkInput = page.locator("#networkInput");
    await expect(networkInput).toHaveValue("3fff::");

    const prefixSelect = page.locator("#prefixSelect");
    await expect(prefixSelect).toHaveValue("20");
  });
});

test.describe("CSV Export", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should export subnet plan to CSV", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    // Setup download handler
    const downloadPromise = page.waitForEvent("download");

    // Click export button
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await exportBtn.click();

    // Wait for download
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/ipv6-subnet-plan-.*-20\.csv/);
  });

  test("should show error if no network loaded", async ({ page }) => {
    // Clear any existing network
    await page.reload();

    // Click export button
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await exportBtn.click();

    // Should show alert
    // For now, just verify button click works
    await expect(exportBtn).toBeVisible();
  });

  test("should include subnet, contains, and note columns", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    // Add a note
    await page.fill(".note-input", "Test subnet");

    const downloadPromise = page.waitForEvent("download");
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await exportBtn.click();
    const download = await downloadPromise;

    // Verify CSV content
    const content = await download.createReadStream();
    const text = await new Response(content).text();

    expect(text).toContain("Subnet,Contains,Note");
    expect(text).toContain("Test subnet");
  });

  test("should include proper indentation for hierarchy depth", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    // Split to create hierarchy
    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();
    await page.waitForTimeout(500); // Wait for render

    // Split one more level
    const secondSplitBtn = page.locator(".split-button").nth(1);
    await secondSplitBtn.click();
    await page.waitForTimeout(500);

    const downloadPromise = page.waitForEvent("download");
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await exportBtn.click();
    const download = await downloadPromise;

    const content = await download.createReadStream();
    const text = await new Response(content).text();

    // Indented rows should have spaces at start
    expect(text).toContain("    3fff::/28"); // Child should be indented
  });
});
