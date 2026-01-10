/**
 * IPv6 Subnet Planner Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createIntermediateLevels, getSubnetNode } from "../app.js";

describe("createIntermediateLevels", () => {
  beforeEach(() => {
    // Reset subnetTree before each test
    global.subnetTree = {};
  });

  it("should create /24 and /28 levels when splitting /20 to /28", () => {
    const parentCidr = "3fff::/20";
    const targetPrefix = 28;

    const children = createIntermediateLevels(parentCidr, targetPrefix);

    // Should create 16 /24 and 256 /28 children (full tree)
    expect(children.length).toBeGreaterThan(16);
    expect(children.some((c) => c.includes("/24"))).toBe(true);
    expect(children.some((c) => c.includes("/28"))).toBe(true);
    expect(children[0]).toBe("3fff::/24");
  });

  it("should create /24, /28 and /30 levels for /20 to /30", () => {
    const parentCidr = "3fff::/20";
    const targetPrefix = 30;

    const children = createIntermediateLevels(parentCidr, targetPrefix);

    // /20 → /24 → /28 → /30 (creates full tree)
    expect(children.length).toBeGreaterThan(16);
    expect(children.some((c) => c.includes("/24"))).toBe(true);
    expect(children.some((c) => c.includes("/28"))).toBe(true);
    expect(children.some((c) => c.includes("/30"))).toBe(true);
  });

  it("should create /28 and /30 levels for /24 to /30", () => {
    const parentCidr = "3fff::/24";
    const targetPrefix = 30;

    const children = createIntermediateLevels(parentCidr, targetPrefix);

    // /24 → /28 → /30 (creates full tree)
    expect(children.length).toBeGreaterThan(16);
    expect(children.some((c) => c.includes("/28"))).toBe(true);
    expect(children.some((c) => c.includes("/30"))).toBe(true);
  });

  it("should inherit metadata through all levels", () => {
    const parentCidr = "3fff::20";
    const targetPrefix = 28;

    const parent = getSubnetNode(parentCidr);
    parent._note = "Test note";
    parent._color = "#FF0000";

    const children = createIntermediateLevels(parentCidr, targetPrefix);

    // Check that all children at all levels have inherited metadata
    children.forEach((childCidr) => {
      const child = getSubnetNode(childCidr);
      expect(child._note).toBe("Test note");
      expect(child._color).toBe("#FF0000");
    });
  });

  it("should handle single level (no intermediates needed)", () => {
    const parentCidr = "3fff::/20";
    const targetPrefix = 24;

    const children = createIntermediateLevels(parentCidr, targetPrefix);

    // Direct /20 → /24, no intermediate levels
    expect(children.length).toBe(16);
    expect(children.every((c) => c.includes("/24"))).toBe(true);
  });
});
