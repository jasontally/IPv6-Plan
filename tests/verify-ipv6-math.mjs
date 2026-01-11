/**
 * IPv6 Subnet Math Verification - Core Operations Only
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import ip6addr from "ip6addr";

// Copy of IPv6 functions from app.js for testing

function parseIPv6(addr) {
  addr = addr.trim().toLowerCase();
  if (addr.includes("::")) {
    const parts = addr.split("::");
    if (parts.length > 2) return null;
    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - left.length - right.length;
    const groups = [...left];
    for (let i = 0; i < missing; i++) groups.push("0");
    groups.push(...right);
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      const val = parseInt(groups[i] || "0", 16);
      if (isNaN(val) || val > 0xffff) return null;
      bytes[i * 2] = (val >> 8) & 0xff;
      bytes[i * 2 + 1] = val & 0xff;
    }
    return bytes;
  } else {
    const groups = addr.split(":");
    if (groups.length !== 8) return null;
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      const val = parseInt(groups[i], 16);
      if (isNaN(val) || val > 0xffff) return null;
      bytes[i * 2] = (val >> 8) & 0xff;
      bytes[i * 2 + 1] = val & 0xff;
    }
    return bytes;
  }
}

function formatIPv6(bytes) {
  const groups = [];
  for (let i = 0; i < 8; i++) {
    groups.push((bytes[i * 2] << 8) | bytes[i * 2 + 1]);
  }
  let maxStart = -1,
    maxLen = 0;
  let currStart = -1,
    currLen = 0;
  for (let i = 0; i < 8; i++) {
    if (groups[i] === 0) {
      if (currStart === -1) currStart = i;
      currLen++;
    } else {
      if (currLen > maxLen) {
        maxStart = currStart;
        maxLen = currLen;
      }
      currStart = -1;
      currLen = 0;
    }
  }
  if (currLen > maxLen) {
    maxStart = currStart;
    maxLen = currLen;
  }
  if (maxLen > 1) {
    const left = groups
      .slice(0, maxStart)
      .map((g) => g.toString(16))
      .join(":");
    const right = groups
      .slice(maxStart + maxLen)
      .map((g) => g.toString(16))
      .join(":");
    if (maxStart === 0 && maxStart + maxLen === 8) return "::";
    if (maxStart === 0) return "::" + right;
    if (maxStart + maxLen === 8) return left + "::";
    return left + "::" + right;
  }
  return groups.map((g) => g.toString(16)).join(":");
}

function applyPrefix(bytes, prefix) {
  const result = new Uint8Array(16);
  const fullBytes = Math.floor(prefix / 8);
  const remainingBits = prefix % 8;
  for (let i = 0; i < fullBytes; i++) {
    result[i] = bytes[i];
  }
  if (remainingBits > 0) {
    const mask = (0xff << (8 - remainingBits)) & 0xff;
    result[fullBytes] = bytes[fullBytes] & mask;
  }
  return result;
}

function getChildSubnetAtTarget(bytes, prefix, targetPrefix, index) {
  const result = new Uint8Array(bytes);
  let addressValue = BigInt(0);
  for (let i = 0; i < 16; i++) {
    addressValue = (addressValue << BigInt(8)) | BigInt(bytes[i]);
  }
  const shift = BigInt(128 - targetPrefix);
  const indexValue = BigInt(index) << shift;
  const totalValue = addressValue + indexValue;
  let tempValue = totalValue;
  for (let i = 15; i >= 0; i--) {
    result[i] = Number(tempValue & BigInt(0xff));
    tempValue = tempValue >> BigInt(8);
  }
  return result;
}

console.log("=".repeat(80));
console.log("IPv6 Subnet Math Verification");
console.log("=".repeat(80));

let passed = 0;
let failed = 0;
const diffs = [];

// Test 1: Parsing & Formatting
console.log("\n1. Parsing & Formatting");
console.log("-".repeat(80));
const addrTests = [
  "2001:db8::1",
  "3fff::",
  "::1",
  "2001:db8:0:0:0:0:0:0",
  "fe80::",
];
for (const addr of addrTests) {
  const appBytes = parseIPv6(addr);
  const libAddr = ip6addr.parse(addr);
  const appFmt = formatIPv6(appBytes);
  const libFmt = libAddr.toString();
  if (appFmt === libFmt) {
    console.log(`✓ ${addr.padEnd(25)} → ${appFmt}`);
    passed++;
  } else {
    console.log(`✗ ${addr.padEnd(25)} App=${appFmt} Lib=${libFmt}`);
    failed++;
    diffs.push({ type: "format", addr, app: appFmt, lib: libFmt });
  }
}

// Test 2: Prefix Masking
console.log("\n2. Prefix Masking");
console.log("-".repeat(80));
const maskTests = [
  { addr: "3fff::1234", prefix: 20, expected: "3fff::" },
  { addr: "2001:db8::1234:5678", prefix: 32, expected: "2001:db8::" },
  { addr: "3fff:e000::1", prefix: 21, expected: "3fff:e000::" },
  { addr: "2001:db8:8000::1", prefix: 33, expected: "2001:db8:8000::" },
  { addr: "fe80::1", prefix: 64, expected: "fe80::" },
];
for (const tc of maskTests) {
  const appBytes = parseIPv6(tc.addr);
  const appMasked = formatIPv6(applyPrefix(appBytes, tc.prefix));
  const libCidr = ip6addr.createCIDR(tc.addr + "/" + tc.prefix);
  const libMasked = libCidr.address().toString();
  const match = appMasked === libMasked && appMasked === tc.expected;
  if (match) {
    console.log(`✓ ${tc.addr.padEnd(25)} /${tc.prefix} → ${appMasked}`);
    passed++;
  } else {
    console.log(
      `✗ ${tc.addr.padEnd(25)} /${tc.prefix} App=${appMasked} Lib=${libMasked} Exp=${tc.expected}`,
    );
    failed++;
    diffs.push({ type: "mask", tc, app: appMasked, lib: libMasked });
  }
}

// Test 3: CIDR Comparison
console.log("\n3. CIDR Comparison");
console.log("-".repeat(80));
const compareTests = [
  { a: "3fff::/24", b: "3fff:100::/24", expected: -1 },
  { a: "2001:db8::/32", b: "2001:db8::/32", expected: 0 },
  { a: "3fff:200::/24", b: "3fff::/24", expected: 1 },
];
for (const tc of compareTests) {
  const [addrA] = tc.a.split("/");
  const [addrB] = tc.b.split("/");
  const bytesA = parseIPv6(addrA);
  const bytesB = parseIPv6(addrB);
  let appResult = 0;
  for (let i = 0; i < 16; i++) {
    if (bytesA[i] !== bytesB[i]) {
      appResult = bytesA[i] - bytesB[i];
      break;
    }
  }
  const libA = ip6addr.parse(addrA);
  const libB = ip6addr.parse(addrB);
  const libResult = libA.compare(libB);
  const appSign = Math.sign(appResult);
  const libSign = Math.sign(libResult);
  const match = appResult === libResult && appSign === tc.expected;
  if (match) {
    console.log(`✓ ${tc.desc || tc.a + " vs " + tc.b}: ${appSign}`);
    passed++;
  } else {
    console.log(
      `✗ ${tc.a} vs ${tc.b}: App=${appSign} Lib=${libSign} Exp=${tc.expected}`,
    );
    failed++;
    diffs.push({ type: "compare", tc, app: appSign, lib: libSign });
  }
}

// Test 4: Child Subnets (Show results for manual verification)
console.log("\n4. Child Subnet Calculation (showing results)");
console.log("-".repeat(80));

const childTests = [
  { parent: "3fff::/20", prefix: 20, target: 24, numChildren: 16 },
  { parent: "2001:db8::/32", prefix: 32, target: 36, numChildren: 16 },
  { parent: "3fff:e000::/21", prefix: 21, target: 24, numChildren: 8 },
];

for (const tc of childTests) {
  console.log(`\n${tc.parent} → /${tc.target} (${tc.numChildren} subnets)`);
  const parentBytes = parseIPv6(tc.parent.split("/")[0]);
  const libParent = ip6addr.createCIDR(tc.parent);
  const parentAddr = libParent.address().toString();

  console.log(`  Parent: ${parentAddr}`);
  console.log("  Children:");

  const showCount = Math.min(4, tc.numChildren);
  for (let i = 0; i < showCount; i++) {
    const appChild = getChildSubnetAtTarget(
      parentBytes,
      tc.prefix,
      tc.target,
      i,
    );
    const appChildCidr = formatIPv6(appChild) + "/" + tc.target;
    console.log(`    [${i}] ${appChildCidr}`);
  }
  if (tc.numChildren > showCount) {
    console.log(`    ... (${tc.numChildren - showCount} more)`);
  }
}

// Summary
console.log("\n" + "=".repeat(80));
console.log("SUMMARY");
console.log("=".repeat(80));
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log("\nDifferences:");
  for (const diff of diffs) {
    console.log(`  ${diff.type}:`, JSON.stringify(diff));
  }
}
console.log("\n" + "=".repeat(80));
