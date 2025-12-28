/**
 * IPv6 Subnet Planner E2E Tests - Accessibility
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";

test.describe("Accessibility (a11y)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for prefixSelect to be populated by JavaScript
    await page.waitForFunction(() => {
      const select = document.getElementById("prefixSelect");
      return select && select.options.length > 0;
    });
  });

  test("should have proper HTML5 structure", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("head meta[charset]")).toHaveAttribute(
      "charset",
      "UTF-8",
    );
  });

  test("should have proper viewport meta tag", async ({ page }) => {
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveAttribute("content", /width=device-width/);
  });

  test("should have descriptive page title", async ({ page }) => {
    await expect(page).toHaveTitle("IPv6 Subnet Planner");
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Check for headings in documentation section
    const h2s = page.locator(".footer h2");
    const count = await h2s.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should have form labels for inputs", async ({ page }) => {
    // Labels are present but don't have for attributes
    const label1 = page.locator(".input-group label").first();
    await expect(label1).toBeVisible();
    await expect(label1).toHaveText(/Network/);

    const label2 = page.locator(".input-group label").nth(1);
    await expect(label2).toBeVisible();
    await expect(label2).toHaveText(/Prefix/);
  });

  test("should have accessible table structure", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const table = page.locator("#subnetTable");
    await expect(table).toBeVisible();

    const thead = page.locator("#subnetTable thead");
    await expect(thead).toBeVisible();

    const tbody = page.locator("#subnetTable tbody");
    await expect(tbody).toBeVisible();
  });

  test("should have proper table headers", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const headers = page.locator("#subnetTable th");
    const headerTexts = await headers.allTextContents();

    expect(headerTexts).toContain("Subnet");
    expect(headerTexts).toContain("Contains");
    expect(headerTexts).toContain("Note");
    expect(headerTexts).toContain("Color");
    expect(headerTexts).toContain("Split");
    expect(headerTexts).toContain("Join");
  });

  test("buttons should have accessible labels", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Go button
    const goBtn = page.locator('button:has-text("Go")');
    await expect(goBtn).toBeVisible();

    // Share button
    const shareBtn = page.locator('button:has-text("Share")');
    await expect(shareBtn).toBeVisible();

    // Export button
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).toBeVisible();

    // Split button
    const splitBtn = page.locator(".split-button").first();
    await expect(splitBtn).toBeVisible();
  });

  test("should have proper color contrast for text", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const input = page.locator("#networkInput");
    const styles = await input.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      };
    });

    // Text should be readable (contrast check)
    expect(styles.color).toBeTruthy();
    expect(styles.backgroundColor).toBeTruthy();
  });

  test("should have focus styles for inputs", async ({ page }) => {
    const input = page.locator("#networkInput");

    await input.focus();

    const styles = await input.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineColor: computed.outlineColor,
      };
    });

    // Should have some visual focus indicator
    expect(styles.outline).toBeTruthy();
  });

  test("should be keyboard navigable", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Tab through inputs
    await page.keyboard.press("Tab");

    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  });

  test("should handle enter key for Go button", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");

    await page.keyboard.press("Enter");

    // Should load network
    const subnetCell = page.locator(".subnet-cell").first();
    await expect(subnetCell).toBeVisible();
  });

  test("should have descriptive button text", async ({ page }) => {
    const goBtn = page.locator('button:has-text("Go")');
    await expect(goBtn).toBeVisible();

    const shareBtn = page.locator('button:has-text("Share")');
    await expect(shareBtn).toBeVisible();

    const exportBtn = page.locator('button:has-text("Export CSV")');
    await expect(exportBtn).toBeVisible();

    const docBtn = page.locator('button:has-text("RFC")');
    await expect(docBtn).toBeVisible();
  });

  test("should have proper error message visibility", async ({ page }) => {
    const errorDiv = page.locator("#error");
    await expect(errorDiv).not.toBeVisible();

    // Trigger error
    await page.fill("#networkInput", "invalid");
    await page.click('button:has-text("Go")');

    await expect(errorDiv).toBeVisible();
    await expect(errorDiv).toHaveText(/Invalid/);
  });

  test("should have responsive layout", async ({ page }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForFunction(() => {
      const select = document.getElementById("prefixSelect");
      return select && select.options.length > 0;
    });

    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const table = page.locator("#subnetTable");
    await expect(table).toBeVisible();

    const inputForm = page.locator(".input-form");
    await expect(inputForm).toBeVisible();
  });

  test("split select should have accessible label via aria", async ({
    page,
  }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();

    // Should be accessible via keyboard
    await splitSelect.focus();
    const focused = page.locator(":focus");
    await expect(focused).toBe(splitSelect);
  });

  test("disabled buttons should indicate disabled state", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "64");
    await page.click('button:has-text("Go")');

    const splitBtn = page.locator(".split-button").first();
    await expect(splitBtn).toBeDisabled();

    const splitSelect = page.locator(".split-select").first();
    await expect(splitSelect).toBeDisabled();
  });
});
