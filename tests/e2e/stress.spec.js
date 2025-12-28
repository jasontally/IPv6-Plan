/**
 * IPv6 Subnet Planner E2E Tests - Stress Testing
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { test, expect } from "@playwright/test";

test.describe("Stress Testing - Large Subnet Trees", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for prefixSelect to be populated by JavaScript
    await page.waitForFunction(() => {
      const select = document.getElementById("prefixSelect");
      return select && select.options.length > 0;
    });
  });

  test("should handle deep tree (5 levels)", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Split root
    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();
    await page.waitForTimeout(200);

    // Split first child
    const splitBtn2 = page.locator(".split-button").nth(1);
    await splitBtn2.click();
    await page.waitForTimeout(200);

    // Split grandchild
    const splitBtn3 = page.locator(".split-button").nth(2);
    await splitBtn3.click();
    await page.waitForTimeout(200);

    // Split 4th level
    const splitBtn4 = page.locator(".split-button").nth(3);
    await splitBtn4.click();
    await page.waitForTimeout(200);

    // Split 5th level
    const splitBtn5 = page.locator(".split-button").nth(4);
    await splitBtn5.click();
    await page.waitForTimeout(200);

    const subnetCells = page.locator(".subnet-cell");
    const count = await subnetCells.count();

    // Should have multiple rows (1 root + children + grandchildren + etc.)
    expect(count).toBeGreaterThan(10);
  });

  test("should handle wide tree (16 siblings)", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Split root to create 16 children (using nibble-aligned /36 split)
    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("36");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();
    await page.waitForTimeout(500);

    const subnetCells = page.locator(".subnet-cell");
    // 1 root + 16 children = 17 rows
    await expect(subnetCells).toHaveCount(17);
  });

  test("should handle many notes across tree", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Split to create multiple subnets
    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("34");
    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();
    await page.waitForTimeout(200);

    // Add notes to all visible inputs
    const noteInputs = page.locator(".note-input");
    const count = await noteInputs.count();

    // Fill notes with different content
    for (let i = 0; i < count && i < 5; i++) {
      const input = noteInputs.nth(i);
      await input.fill(`Note ${i} - ${Date.now()}`);
    }

    // Verify notes were set
    for (let i = 0; i < count && i < 5; i++) {
      const input = noteInputs.nth(i);
      const value = await input.inputValue();
      expect(value).toContain(`Note ${i}`);
    }
  });

  test("should handle multiple color assignments", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Split to create subnets
    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("34");
    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();
    await page.waitForTimeout(200);

    // Color multiple subnets
    const colorBtns = page.locator(".color-button");
    const btnCount = await colorBtns.count();
    const colorsToPick = Math.min(btnCount, 5);

    for (let i = 0; i < colorsToPick; i++) {
      const btn = colorBtns.nth(i);
      await btn.click();

      // Select a color
      const colorOption = page.locator(".color-option").first();
      await colorOption.click();
      await page.waitForTimeout(100);
    }

    // Verify some rows are colored
    const coloredRows = page.locator("tr.colored");
    const coloredCount = await coloredRows.count();
    expect(coloredCount).toBeGreaterThan(0);
  });

  test("should handle rapid split and join operations", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Rapidly split and join
    for (let i = 0; i < 3; i++) {
      const splitBtn = page.locator(".split-button").first();
      await splitBtn.click();
      await page.waitForTimeout(100);

      const joinBtn = page.locator(".join-button").first();
      await joinBtn.click();
      await page.waitForTimeout(100);
    }

    // Should be back to single row
    const subnetCells = page.locator(".subnet-cell");
    await expect(subnetCells).toHaveCount(1);
  });

  test("should handle custom split with many children", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Create 512 children using /41 split (32 to 41 = 9 bits = 512)
    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("41");

    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();
    await page.waitForTimeout(1000);

    const subnetCells = page.locator(".subnet-cell");
    // 1 root + 512 children = 513 rows
    await expect(subnetCells).toHaveCount(513);
  });

  test("should handle large URL hash", async ({ page }) => {
    // Create a complex tree structure
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Add multiple levels and notes
    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("34");
    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();
    await page.waitForTimeout(200);

    // Add notes
    const noteInputs = page.locator(".note-input");
    const input = noteInputs.nth(1);
    await input.fill("Test note with special characters: \"quotes\", <brackets>, {braces}");

    await page.waitForTimeout(100);

    // Get URL hash
    const url = page.url();
    expect(url.length).toBeGreaterThan(50); // URL should be substantial

    // Navigate to URL
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    // Verify state was restored
    const restoredNote = page.locator(".note-input").nth(1);
    await expect(restoredNote).toHaveValue(/Test note/);
  });

  test("should handle CSV export with large tree", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Create a moderately large tree
    const splitSelect = page.locator(".split-select").first();
    await splitSelect.selectOption("36");
    const splitBtn = page.locator(".split-button").first();
    await splitBtn.click();
    await page.waitForTimeout(300);

    const downloadPromise = page.waitForEvent("download");
    const exportBtn = page.locator('button:has-text("Export CSV")');
    await exportBtn.click();
    const download = await downloadPromise;

    // Verify download completed
    expect(download.suggestedFilename()).toMatch(/ipv6-subnet-plan-.*-32\.csv/);

    // Verify CSV has proper structure
    const content = await download.createReadStream();
    const text = await new Response(content).text();

    expect(text).toContain("Subnet,Contains,Note");
    expect(text.split("\n").length).toBeGreaterThan(15);
  });

  test("should handle note updates without losing focus", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const noteInput = page.locator(".note-input").first();

    // Type in note
    await noteInput.type("Initial note");

    // Change note
    await noteInput.fill("Updated note");

    // Verify value changed
    await expect(noteInput).toHaveValue("Updated note");
  });

  test("should handle color changes without losing notes", async ({ page }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    const noteInput = page.locator(".note-input").first();
    await noteInput.fill("Important subnet");

    // Change color
    const colorBtn = page.locator(".color-button").first();
    await colorBtn.click();

    const colorOption = page.locator(".color-option").first();
    await colorOption.click();
    await page.waitForTimeout(100);

    // Verify note is still there
    await expect(noteInput).toHaveValue("Important subnet");
  });

  test("should handle multiple browser tabs via URL sharing", async ({ page, context }) => {
    await page.fill("#networkInput", "2001:db8::");
    await page.selectOption("#prefixSelect", "32");
    await page.click('button:has-text("Go")');

    // Get URL
    const url = page.url();

    // Open in new tab
    const newPage = await context.newPage();
    await newPage.goto(url);
    await newPage.waitForFunction(() => {
      const select = document.getElementById("prefixSelect");
      return select && select.options.length > 0;
    });

    // Verify state in new tab
    const networkInput = newPage.locator("#networkInput");
    await expect(networkInput).toHaveValue("2001:db8::");

    await newPage.close();
  });
});
