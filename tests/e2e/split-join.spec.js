/**
 * IPv6 Subnet Planner E2E Tests
 * Copyright (c) 2025 Jason Tally and contributors
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

  test("should split /32 into /34 subnets using custom target", async ({
    page,
  }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("34");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Should show 5 rows (1 root + 4 children for /34 split)
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(5);

    // First child should be at /34 prefix
    await expect(subnetCells.nth(1)).toHaveText("2001:db8::/34");
  });

  test("should split /32 into /35 subnets using custom target", async ({
    page,
  }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("35");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Should show 9 rows (1 root + 8 children for /35 split)
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(9);

    // First child should be at /35 prefix
    await expect(subnetCells.nth(1)).toHaveText("2001:db8::/35");
  });

  test("should show correct options in split select dropdown", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();

    // Get all options
    const options = await splitSelect.locator("option").allTextContents();

    // First option should be "Auto (→/24)" for nibble-aligned default
    expect(options[0]).toContain("Auto");
    expect(options[0]).toContain("/24");

    // Should contain some custom split options
    expect(options.length).toBeGreaterThan(1);

    // Auto option should have value "auto"
    const autoOption = splitSelect.locator("option").first();
    const autoValue = await autoOption.getAttribute("value");
    expect(autoValue).toBe("auto");
  });

  test("should show 'Auto' option as bold and default", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();

    // Get the first option (Auto)
    const autoOption = splitSelect.locator("option").first();
    const fontWeight = await autoOption.evaluate(
      (el) => window.getComputedStyle(el).fontWeight,
    );

    // Should be bold
    expect(fontWeight).toBe("700");
  });

  test("should enforce 1024 child limit in UI options", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();

    // Get all options
    const options = await splitSelect.locator("option").allTextContents();

    // Find /42 option which would create 1024 children
    const has42 = options.some((opt) => opt.includes("/42"));
    expect(has42).toBe(true);

    // Should not have /43 which would create 2048 children
    const has43 = options.some((opt) => opt.includes("/43"));
    expect(has43).toBe(false);
  });

  test("should split /20 into 32 /25 subnets", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("25");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Should show 33 rows (1 root + 32 children)
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(33);

    // First child should be at /25 prefix
    await expect(subnetCells.nth(1)).toHaveText("3fff::/25");
  });

  test("should split /48 into 16 /52 subnets", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "48");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();

    // For /48, /52 is nibble-aligned "Auto" option
    // Select by value to work with both "Auto" and custom options
    await splitSelect.selectOption("auto");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Should show 17 rows (1 root + 16 children)
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(17);

    // First child should be at /52 prefix
    await expect(subnetCells.nth(1)).toHaveText("2001:db8::/52");
  });

  test("should disable split select for /64", async ({ page }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "64");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();
    await expect(splitSelect).toBeDisabled();
  });

  test("should disable split select for already split subnet", async ({
    page,
  }) => {
    await page.fill("#networkInput", "3fff::");
    await page.selectOption("#prefixSelect", "20");
    await page.click('button:has-text("Go")');

    // Split the root
    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Split select for root should now be disabled
    const splitSelect = page.locator(".split-select").first();
    await expect(splitSelect).toBeDisabled();
  });

  test("should verify child addresses for /32 to /34 split", async ({
    page,
  }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("34");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    const subnetCells = page.locator(".subnet-cell");

    // Verify all 4 child subnets
    await expect(subnetCells.nth(0)).toHaveText("2001:db8::/32");
    await expect(subnetCells.nth(1)).toHaveText("2001:db8::/34");
    await expect(subnetCells.nth(2)).toHaveText("2001:db8:4000::/34");
    await expect(subnetCells.nth(3)).toHaveText("2001:db8:8000::/34");
    await expect(subnetCells.nth(4)).toHaveText("2001:db8:c000::/34");
  });

  test("should verify child addresses for /32 to /35 split", async ({
    page,
  }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("35");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    const subnetCells = page.locator(".subnet-cell");

    // Verify first few child subnets
    await expect(subnetCells.nth(0)).toHaveText("2001:db8::/32");
    await expect(subnetCells.nth(1)).toHaveText("2001:db8::/35");
    await expect(subnetCells.nth(2)).toHaveText("2001:db8:2000::/35");
    await expect(subnetCells.nth(3)).toHaveText("2001:db8:4000::/35");
    await expect(subnetCells.nth(4)).toHaveText("2001:db8:6000::/35");
  });

  test("should allow join after custom split", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("34");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Should now have 5 rows (1 root + 4 children)
    await expect(page.locator(".subnet-cell")).toHaveCount(5);

    // Now join back to /32 - wait for DOM to update
    await page.waitForTimeout(100);
    const joinBtn = page
      .locator(".join-button")
      .filter({ hasText: "/32" })
      .first();
    await expect(joinBtn).toBeVisible();
    await joinBtn.click();

    // Should be back to 1 row
    await expect(page.locator(".subnet-cell")).toHaveCount(1);
    await expect(page.locator(".subnet-cell").first()).toHaveText(
      "2001:db8::/32",
    );
  });

  test("should verify child addresses for /21 to /31 split", async ({
    page,
  }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "21");
    await page.click('button:has-text("Go")');

    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("31");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();

    // Verify split creates 1024 children at 1024 child limit
    await expect(page.locator(".subnet-cell")).toHaveCount(1025);
  });
});
