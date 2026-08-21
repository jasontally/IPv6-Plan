/**
 * Shared E2E test helpers.
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { expect } from "@playwright/test";

/**
 * Click the Go button and wait until the app has fully settled.
 *
 * Loading a network triggers an async saveState() which writes the URL hash,
 * and the resulting hashchange event runs a second loadState()+render pass.
 * Interacting with the table before both passes complete can get selections
 * wiped or read stale DOM. Waiting for the hash plus a short settle window
 * makes subsequent interactions deterministic.
 * @param {import("@playwright/test").Page} page - Playwright page object
 * @returns {Promise<void>} Resolves once renders triggered by Go are done
 */
export async function submitGo(page) {
  await page.click('button:has-text("Go")');
  // saveState() encodes state into the URL hash when complete.
  await expect(page).toHaveURL(/#\w/);
  // Allow the hashchange-triggered loadState()/render() pass to finish.
  // It is not externally observable, but completes in a few milliseconds.
  await page.waitForTimeout(150);
}
