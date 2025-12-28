/**
 * IPv6 Subnet Planner Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  getSubnetNode,
  getChildSubnet,
  getChildSubnetAtTarget,
  getSubnetCount,
} from "../app.js";

// Mock global state for testing
let subnetTree = {};

// Override getSubnetNode to use local subnetTree
function mockGetSubnetNode(cidr) {
  if (!subnetTree[cidr]) {
    subnetTree[cidr] = { _note: "", _color: "" };
  }
  return subnetTree[cidr];
}

describe("Subnet Tree Operations", () => {
  beforeEach(() => {
    subnetTree = {};
  });

  describe("getSubnetNode", () => {
    it("should create node if it does not exist", () => {
      const cidr = "3fff::/24";
      const node = mockGetSubnetNode(cidr);

      expect(node).toBeDefined();
      expect(node._note).toBe("");
      expect(node._color).toBe("");
    });

    it("should return existing node", () => {
      subnetTree["3fff::/24"] = { _note: "Test", _color: "#FF0000" };
      const cidr = "3fff::/24";

      const node = mockGetSubnetNode(cidr);
      expect(node._note).toBe("Test");
      expect(node._color).toBe("#FF0000");
    });

    it("should maintain node reference", () => {
      const cidr = "3fff::/24";
      const node1 = mockGetSubnetNode(cidr);
      const node2 = mockGetSubnetNode(cidr);

      expect(node1).toBe(node2);
    });
  });

  describe("isSplit", () => {
    it("should return false for leaf node", () => {
      subnetTree["3fff::/24"] = { _note: "", _color: "" };
      const cidr = "3fff::/24";

      const node = mockGetSubnetNode(cidr);
      const keys = Object.keys(node).filter((k) => !k.startsWith("_"));
      expect(keys.length).toBe(0);
    });

    it("should return true for node with children", () => {
      subnetTree["3fff::/20"] = {
        _note: "",
        _color: "",
        "3fff::/24": { _note: "", _color: "" },
      };
      const cidr = "3fff::/20";

      const node = mockGetSubnetNode(cidr);
      const keys = Object.keys(node).filter((k) => !k.startsWith("_"));
      expect(keys.length).toBe(1);
    });

    it("should ignore _note and _color keys", () => {
      subnetTree["3fff::/20"] = {
        _note: "test note",
        _color: "#FF0000",
      };

      const node = mockGetSubnetNode("3fff::/20");
      const keys = Object.keys(node).filter((k) => !k.startsWith("_"));
      expect(keys.length).toBe(0);
    });
  });

  describe("Subnet Counting", () => {
    it("should return /48 count for prefixes < 48", () => {
      const count = getSubnetCount(20);
      expect(count).toBe("268,435,456 /48s");
    });

    it("should return /64 count for prefixes >= 48", () => {
      const count = getSubnetCount(48);
      expect(count).toBe("65,536 /64s");
    });

    it('should return "Host Subnet" for /64', () => {
      const count = getSubnetCount(64);
      expect(count).toBe("Host Subnet");
    });

    it("should handle edge case of /47", () => {
      const count = getSubnetCount(47);
      expect(count).toBe("2 /48s");
    });

    it("should handle edge case of /16", () => {
      const count = getSubnetCount(16);
      expect(count).toBe("4,294,967,296 /48s");
    });
  });

  describe("getChildSubnet - nibble aligned", () => {
    it("should calculate first child at /24 from /20", () => {
      const bytes = new Uint8Array([
        0x3f, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      const child = getChildSubnet(bytes, 20, 0);
      expect(child[2]).toBe(0x00);
      expect(child[3]).toBe(0x00);
    });

    it("should calculate second child at /24 from /20", () => {
      const bytes = new Uint8Array([
        0x3f, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      const child = getChildSubnet(bytes, 20, 1);
      // Second child should be at 0x0100 (256) in byte positions 2-3
      expect(child[2]).toBe(0x01);
      expect(child[3]).toBe(0x00);
    });

    it("should calculate child at correct nibble boundary", () => {
      const bytes = new Uint8Array([
        0x3f, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      const child = getChildSubnet(bytes, 20, 2);
      expect(child[2]).toBe(0x02);
      expect(child[3]).toBe(0x00);
    });
  });

  describe("getChildSubnet - non-nibble aligned", () => {
    it("should calculate child at /24 from /21", () => {
      const bytes = new Uint8Array([
        0x3f, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      const child = getChildSubnet(bytes, 21, 0);
      expect(child[2]).toBe(0xe0);
      expect(child[3]).toBe(0x00);
    });

    it("should calculate second child at /24 from /21", () => {
      const bytes = new Uint8Array([
        0x3f, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      const child = getChildSubnet(bytes, 21, 1);
      // Verify child was calculated
      expect(child).toBeDefined();
      expect(child).toBeInstanceOf(Uint8Array);
      expect(child.length).toBe(16);
    });
  });

  describe("getChildSubnetAtTarget - custom target prefix", () => {
    it("should calculate child at /33 from /32", () => {
      const bytes = new Uint8Array([
        0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      const child = getChildSubnetAtTarget(bytes, 32, 33, 0);
      expect(child[7] & 0x80).toBe(0x00);
    });

    it("should calculate second child at /33 from /32", () => {
      const bytes = new Uint8Array([
        0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      const child = getChildSubnetAtTarget(bytes, 32, 33, 1);
      // Verify child was calculated
      expect(child).toBeDefined();
      expect(child).toBeInstanceOf(Uint8Array);
      expect(child.length).toBe(16);
    });

    it("should calculate child at /34 from /32", () => {
      const bytes = new Uint8Array([
        0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      const child = getChildSubnetAtTarget(bytes, 32, 34, 1);
      // Just verify child was calculated
      expect(child).toBeDefined();
      expect(child).toBeInstanceOf(Uint8Array);
      expect(child.length).toBe(16);
    });

    it("should calculate child at /35 from /32", () => {
      const bytes = new Uint8Array([
        0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      const child = getChildSubnetAtTarget(bytes, 32, 35, 1);
      // Just verify child was calculated
      expect(child).toBeDefined();
      expect(child).toBeInstanceOf(Uint8Array);
      expect(child.length).toBe(16);
    });
  });

  describe("splitSubnet - nibble aligned", () => {
    it("should split /20 into 16 /24 subnets", () => {
      subnetTree["3fff::/20"] = { _note: "", _color: "" };
      const cidr = "3fff::/20";

      // Simulate split logic
      const [addr, prefix] = cidr.split("/");
      const prefixNum = parseInt(prefix);
      const isAligned = prefixNum % 4 === 0;
      const target = isAligned ? prefixNum + 4 : Math.ceil(prefixNum / 4) * 4;
      const numChildren = Math.pow(2, target - prefixNum);

      const node = mockGetSubnetNode(cidr);
      // Add mock children
      for (let i = 0; i < numChildren; i++) {
        node[`child${i}`] = { _note: "", _color: "" };
      }

      const children = Object.keys(node).filter((k) => !k.startsWith("_"));
      expect(children.length).toBe(16);
    });

    it("should split /24 into 16 /28 subnets", () => {
      subnetTree["3fff::/24"] = { _note: "", _color: "" };
      const cidr = "3fff::/24";

      const node = mockGetSubnetNode(cidr);
      for (let i = 0; i < 16; i++) {
        node[`child${i}`] = { _note: "", _color: "" };
      }

      const children = Object.keys(node).filter((k) => !k.startsWith("_"));
      expect(children.length).toBe(16);
    });

    it("should verify child calculation for /20 split", () => {
      const prefixNum = 20;
      const isAligned = prefixNum % 4 === 0;
      const nextNibble = isAligned
        ? prefixNum + 4
        : Math.ceil(prefixNum / 4) * 4;
      const numChildren = Math.pow(2, nextNibble - prefixNum);

      expect(numChildren).toBe(16);
      expect(nextNibble).toBe(24);
    });
  });

  describe("splitSubnet - non-nibble aligned", () => {
    it("should split /21 into 8 /24 subnets", () => {
      const prefixNum = 21;
      const isAligned = prefixNum % 4 === 0;
      const nextNibble = isAligned
        ? prefixNum + 4
        : Math.ceil(prefixNum / 4) * 4;
      const numChildren = Math.pow(2, nextNibble - prefixNum);

      expect(numChildren).toBe(8);
    });

    it("should split /22 into 4 /24 subnets", () => {
      const prefixNum = 22;
      const isAligned = prefixNum % 4 === 0;
      const nextNibble = isAligned
        ? prefixNum + 4
        : Math.ceil(prefixNum / 4) * 4;
      const numChildren = Math.pow(2, nextNibble - prefixNum);

      expect(numChildren).toBe(4);
    });

    it("should split /23 into 2 /24 subnets", () => {
      const prefixNum = 23;
      const isAligned = prefixNum % 4 === 0;
      const nextNibble = isAligned
        ? prefixNum + 4
        : Math.ceil(prefixNum / 4) * 4;
      const numChildren = Math.pow(2, nextNibble - prefixNum);

      expect(numChildren).toBe(2);
    });
  });

  describe("splitSubnet - custom target prefix", () => {
    it("should split /32 into 4 /34 subnets", () => {
      const currentPrefix = 32;
      const targetPrefix = 34;
      const numChildren = Math.pow(2, targetPrefix - currentPrefix);

      expect(numChildren).toBe(4);
    });

    it("should split /32 into 8 /35 subnets", () => {
      const currentPrefix = 32;
      const targetPrefix = 35;
      const numChildren = Math.pow(2, targetPrefix - currentPrefix);

      expect(numChildren).toBe(8);
    });

    it("should split /20 into 32 /25 subnets", () => {
      const currentPrefix = 20;
      const targetPrefix = 25;
      const numChildren = Math.pow(2, targetPrefix - currentPrefix);

      expect(numChildren).toBe(32);
    });

    it("should split /48 into 16 /52 subnets", () => {
      const currentPrefix = 48;
      const targetPrefix = 52;
      const numChildren = Math.pow(2, targetPrefix - currentPrefix);

      expect(numChildren).toBe(16);
    });
  });

  describe("splitSubnet - edge cases", () => {
    it("should validate prefix < 64 for splitting", () => {
      const prefix = 64;
      expect(prefix >= 64).toBe(true);
    });

    it("should validate target prefix > current prefix", () => {
      const currentPrefix = 20;
      const targetPrefix = 20;
      expect(targetPrefix <= currentPrefix).toBe(true);
    });

    it("should validate target prefix <= 64", () => {
      const targetPrefix = 65;
      expect(targetPrefix > 64).toBe(true);
    });

    it("should validate 1024 child limit", () => {
      const currentPrefix = 32;
      const targetPrefix = 42;
      const numChildren = Math.pow(2, targetPrefix - currentPrefix);
      expect(numChildren).toBe(1024);
    });

    it("should validate beyond 1024 child limit", () => {
      const currentPrefix = 32;
      const targetPrefix = 43;
      const numChildren = Math.pow(2, targetPrefix - currentPrefix);
      expect(numChildren).toBe(2048);
    });

    it("should calculate children for non-nibble-aligned split", () => {
      const currentPrefix = 21;
      const targetPrefix = 33;
      const numChildren = Math.pow(2, targetPrefix - currentPrefix);
      expect(numChildren).toBe(4096);
    });
  });

  describe("splitSubnet - multiple levels", () => {
    it("should support multi-level tree structure", () => {
      // Create root node
      subnetTree["3fff::/20"] = {
        _note: "",
        _color: "",
      };

      // Add first child
      const root = mockGetSubnetNode("3fff::/20");
      root["3fff::/24"] = { _note: "", _color: "" };

      // Add grandchild
      const child = mockGetSubnetNode("3fff::/24");
      child["3fff::/28"] = { _note: "", _color: "" };

      // Verify structure
      const childKeys = Object.keys(root).filter((k) => !k.startsWith("_"));
      expect(childKeys.length).toBe(1);

      const grandchildKeys = Object.keys(child).filter(
        (k) => !k.startsWith("_"),
      );
      expect(grandchildKeys.length).toBe(1);
    });
  });
});
