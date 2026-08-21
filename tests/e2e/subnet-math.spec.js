/**
 * Subnet Math Verification E2E Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";

test.describe("Subnet Math - Visual Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display correct child addresses for /20 to /24 split", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click("button:has-text('Go')");

    const splitButton = await page.locator("button:has-text('Split')").first();
    await splitButton.click();

    // Splitting /20 yields 16 children plus the root row; wait for the
    // async re-render to finish before reading cells.
    await expect(page.locator("tbody tr")).toHaveCount(17);

    const rows = page.locator("tbody tr");
    const firstChild = await rows.nth(1).locator(".subnet-cell").textContent();
    const secondChild = await rows.nth(2).locator(".subnet-cell").textContent();

    expect(firstChild).toBe("3fff::/24");
    expect(secondChild).toBe("3fff:100::/24");
  });

  test("should display sequential addresses for /24 to /28 split", async ({
    page,
  }) => {
    // Use a /24-aligned network so no host bits are masked away on load.
    await page.fill("#networkInput", "2001:db00::");
    await page.selectOption("#prefixSelect", "24");
    await page.click("button:has-text('Go')");

    await page.click("button:has-text('Split')");

    // Splitting /24 yields 16 /28 children plus the root row; wait for the
    // async re-render to finish before reading cells.
    await expect(page.locator("tbody tr")).toHaveCount(17);

    const rows = page.locator("tbody tr");
    const firstChild = await rows.nth(1).locator(".subnet-cell").textContent();
    const secondChild = await rows.nth(2).locator(".subnet-cell").textContent();
    const thirdChild = await rows.nth(3).locator(".subnet-cell").textContent();

    expect(firstChild).toBe("2001:db00::/28");
    expect(secondChild).toBe("2001:db10::/28");
    expect(thirdChild).toBe("2001:db20::/28");
  });

  test("should display IPv6 in compressed form", async ({ page }) => {
    // Fully expanded form of 2001:db8:: (8 hextets) to verify RFC 5952
    // compression in the rendered table.
    await page.fill("#networkInput", "2001:0db8:0000:0000:0000:0000:0000:0000");
    await page.selectOption("#prefixSelect", "32");
    await page.click("button:has-text('Go')");

    // Web-first assertion waits for the async load+render triggered by Go.
    const rootCell = page.locator("tbody tr:first-child .subnet-cell");
    await expect(rootCell).toHaveText("2001:db8::/32");
  });
});
