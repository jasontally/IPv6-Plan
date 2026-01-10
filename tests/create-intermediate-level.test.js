/**
 * IPv6 Subnet Planner Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createIntermediateLevel, getSubnetNode, parseIPv6 } from "../app.js";

describe("createIntermediateLevel", () => {
  beforeEach(() => {
    // Reset subnetTree before each test
    global.subnetTree = {};
  });

  it("should create 16 /24 children from /20 parent", () => {
    const parentCidr = "3fff::/20";
    const targetPrefix = 24;

    // Set up parent with note and color
    const parent = getSubnetNode(parentCidr);
    parent._note = "Test network";
    parent._color = "#FFE5E5";

    const children = createIntermediateLevel(parentCidr, targetPrefix);

    expect(children.length).toBe(16);
    expect(children[0]).toBe("3fff::/24");
    expect(children[1]).toBe("3fff:100::/24");
    expect(children[15]).toBe("3fff:f00::/24");
  });

  it("should inherit _note from parent to children", () => {
    const parentCidr = "3fff::/20";
    const targetPrefix = 24;

    const parent = getSubnetNode(parentCidr);
    parent._note = "Main data center";

    createIntermediateLevel(parentCidr, targetPrefix);

    const parentObj = getSubnetNode(parentCidr);
    const children = Object.keys(parentObj).filter((k) => !k.startsWith("_"));
    children.forEach((childCidr) => {
      expect(parentObj[childCidr]._note).toBe("Main data center");
    });
  });

  it("should inherit _color from parent to children", () => {
    const parentCidr = "3fff::/20";
    const targetPrefix = 24;

    const parent = getSubnetNode(parentCidr);
    parent._color = "#E5F3FF";

    createIntermediateLevel(parentCidr, targetPrefix);

    const parentObj = getSubnetNode(parentCidr);
    const children = Object.keys(parentObj).filter((k) => !k.startsWith("_"));
    children.forEach((childCidr) => {
      expect(parentObj[childCidr]._color).toBe("#E5F3FF");
    });
  });

  it("should create 16 /28 children from /24 parent", () => {
    const parentCidr = "3fff::/24";
    const targetPrefix = 28;

    const children = createIntermediateLevel(parentCidr, targetPrefix);

    // /24 to /28 creates 2^(28-24) = 16 children
    expect(children.length).toBe(16);
    expect(children[0]).toBe("3fff::/28");
    expect(children[1]).toBe("3fff:10::/28");
    expect(children[15]).toBe("3fff:f0::/28");
  });

  it("should calculate correct child addresses for non-aligned parent /21", () => {
    const parentCidr = "3fff:e000::/21";
    const targetPrefix = 24;

    const children = createIntermediateLevel(parentCidr, targetPrefix);

    expect(children.length).toBe(8);
    expect(children[0]).toBe("3fff:e000::/24");
    expect(children[7]).toBe("3fff:e700::/24");
  });

  it("should work with different IPv6 addresses", () => {
    const parentCidr = "2001:db8::/20";
    const targetPrefix = 24;

    const children = createIntermediateLevel(parentCidr, targetPrefix);

    expect(children.length).toBe(16);
    expect(children[0]).toBe("2001:db8::/24");
    expect(children[1]).toBe("2001:eb8::/24");
  });

  it("should handle /30 as target prefix", () => {
    const parentCidr = "3fff::/28";
    const targetPrefix = 30;

    const children = createIntermediateLevel(parentCidr, targetPrefix);

    expect(children.length).toBe(4);
    expect(children[0]).toBe("3fff::/30");
    expect(children[1]).toBe("3fff:4::/30");
    expect(children[2]).toBe("3fff:8::/30");
    expect(children[3]).toBe("3fff:c::/30");
  });

  it("should not duplicate existing children", () => {
    const parentCidr = "3fff::/20";
    const targetPrefix = 24;

    // Create one child first
    const parent = getSubnetNode(parentCidr);
    parent["3fff::/24"] = { _note: "Existing", _color: "" };

    const children = createIntermediateLevel(parentCidr, targetPrefix);

    // Should still create all 16 children
    expect(children.length).toBe(16);
  });

  it("should return empty array for invalid parent", () => {
    const parentCidr = "invalid::/20";
    const targetPrefix = 24;

    const children = createIntermediateLevel(parentCidr, targetPrefix);

    expect(children).toEqual([]);
  });

  it("should preserve existing parent metadata when creating children", () => {
    const parentCidr = "3fff::/20";
    const targetPrefix = 24;

    const parent = getSubnetNode(parentCidr);
    parent._note = "Original note";
    parent._color = "#FF0000";

    createIntermediateLevel(parentCidr, targetPrefix);

    expect(parent._note).toBe("Original note");
    expect(parent._color).toBe("#FF0000");
  });
});
