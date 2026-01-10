/**
 * Test exports wrapper for app.js
 * This file provides ES6 exports for Vitest while app.js remains browser-compatible
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

// Import app.js using dynamic import to avoid ESM/CJS issues
// We need to execute the script and extract globals
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read app.js content
const appJsPath = join(__dirname, "..", "app.js");
const appJsContent = readFileSync(appJsPath, "utf-8");

// Remove the module.exports block from app.js for execution
const cleanedAppJs = appJsContent.replace(
  /\/\/ Export functions for testing[\s\S]*$/,
  "",
);

// Create a JSDOM environment and execute app.js
const dom = new JSDOM(
  `<!DOCTYPE html>
  <html>
  <head></head>
  <body>
    <input id="networkInput" />
    <select id="prefixSelect"></select>
    <div id="error"></div>
    <table id="subnetTable"><tbody id="tableBody"></tbody></table>
  </body>
  </html>`,
  {
    runScripts: "dangerously",
    url: "http://localhost/",
  },
);

// Execute app.js in the JSDOM context
const script = dom.window.document.createElement("script");
script.textContent = cleanedAppJs;
dom.window.document.head.appendChild(script);

// Extract functions from the window object
const {
  parseIPv6,
  formatIPv6,
  applyPrefix,
  getChildSubnet,
  getChildSubnetAtTarget,
  getSubnetCount,
  compareCIDR,
  splitSubnet,
  getSubnetNode,
  isSplit,
  joinSubnet,
  saveState,
  loadState,
  loadNetwork,
  loadDocPrefix,
  shareURL,
  exportCSV,
  populatePrefixSelect,
  COLORS,
} = dom.window;

export {
  parseIPv6,
  formatIPv6,
  applyPrefix,
  getChildSubnet,
  getChildSubnetAtTarget,
  getSubnetCount,
  compareCIDR,
  splitSubnet,
  getSubnetNode,
  isSplit,
  joinSubnet,
  saveState,
  loadState,
  loadNetwork,
  loadDocPrefix,
  shareURL,
  exportCSV,
  populatePrefixSelect,
  COLORS,
};
