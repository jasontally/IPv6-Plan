/**
 * Subnet Math Verification E2E Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";

test.describe("Subnet Math - Visual Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8080/index.html");
  });

  test("should display correct child addresses for /20 to /24 split", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click("button:has-text('Go')");

    const splitButton = await page.locator("button:has-text('Split')").first();
    await splitButton.click();

    const rows = await page.locator("tbody tr").all();
    const firstChild = await rows[1].locator(".subnet-cell").textContent();
    const secondChild = await rows[2].locator(".subnet-cell").textContent();

    expect(firstChild).toBe("3fff::/24");
    expect(secondChild).toBe("3fff:100::/24");
  });

  test("should display sequential addresses for /24 to /28 split", async ({
    page,
  }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "24");
    await page.click("button:has-text('Go')");

    await page.click("button:has-text('Split')");

    const rows = await page.locator("tbody tr").all();
    const firstChild = await rows[1].locator(".subnet-cell").textContent();
    const secondChild = await rows[2].locator(".subnet-cell").textContent();
    const thirdChild = await rows[3].locator(".subnet-cell").textContent();

    expect(firstChild).toBe("2001:db8::/28");
    expect(secondChild).toBe("2001:db8:2000::/28");
    expect(thirdChild).toBe("2001:db8:3000::/28");
  });

  test("should display IPv6 in compressed form", async ({ page }) => {
    await page.fill(
      "#networkInput",
      "2001:0db8:0000:0000:0000:0000:0000:0000:0001",
    );
    await page.selectOption("#prefixSelect", "32");
    await page.click("button:has-text('Go')");

    const rootCell = await page.locator("tbody tr:first-child .subnet-cell");
    const rootText = await rootCell.textContent();

    expect(rootText).toBe("2001:db8::/32");
  });
});
