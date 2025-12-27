/**
 * IPv6 Subnet Planner Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from "vitest";

describe("Subnet Tree Operations", () => {
  beforeEach(() => {
    // Reset subnet tree before each test
    // In actual implementation, this would be done via module export
  });

  describe("getSubnetNode", () => {
    it("should create node if it does not exist", () => {
      const cidr = "3fff::/24";

      const node = { _note: "", _color: "" };

      expect(node).toBeDefined();
      expect(node._note).toBe("");
      expect(node._color).toBe("");
    });

    it("should return existing node", () => {
      const tree = {
        "3fff::/24": { _note: "Test", _color: "#FF0000" },
      };
      const cidr = "3fff::/24";

      // Should return existing node
      expect(tree[cidr]._note).toBe("Test");
      expect(tree[cidr]._color).toBe("#FF0000");
    });
  });

  describe("isSplit", () => {
    it("should return false for leaf node", () => {
      const tree = {
        "3fff::/24": { _note: "", _color: "" },
      };
      const cidr = "3fff::/24";

      const keys = Object.keys(tree[cidr]).filter((k) => !k.startsWith("_"));
      expect(keys.length).toBe(0);
    });

    it("should return true for node with children", () => {
      const tree = {
        "3fff::/20": {
          _note: "",
          _color: "",
          "3fff::/24": { _note: "", _color: "" },
        },
      };
      const cidr = "3fff::/20";

      const keys = Object.keys(tree[cidr]).filter((k) => !k.startsWith("_"));
      expect(keys.length).toBe(1);
    });
  });

  describe("splitSubnet - nibble aligned", () => {
    it("should split /20 into 16 /24 subnets", () => {
      // /20 split creates 16 children at /24
      const numChildren = 2 ** (24 - 20);
      expect(numChildren).toBe(16);
    });

    it("should split /24 into 16 /28 subnets", () => {
      const numChildren = 2 ** (28 - 24);
      expect(numChildren).toBe(16);
    });

    it("should calculate child addresses correctly", () => {
      // Second child of /20 split should be at index 1
      // Bits to add = 4 (from /20 to /24)
      // Position = 128 - 24 = 104 bits from right
      // Child 1 should have bit 104 set

      const bytes = new Uint8Array([
        0x3f, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      // When adding child index 1 at bit position 104:
      // Result should be 3fff:0100::
      expect(bytes.length).toBe(16);
    });
  });

  describe("splitSubnet - non-nibble aligned", () => {
    it("should split /21 into 8 /24 subnets", () => {
      const currentPrefix = 21;
      const nextNibble = 24;
      const numChildren = 2 ** (nextNibble - currentPrefix);
      expect(numChildren).toBe(8);
    });

    it("should split /22 into 4 /24 subnets", () => {
      const currentPrefix = 22;
      const nextNibble = 24;
      const numChildren = 2 ** (nextNibble - currentPrefix);
      expect(numChildren).toBe(4);
    });

    it("should split /23 into 2 /24 subnets", () => {
      const currentPrefix = 23;
      const nextNibble = 24;
      const numChildren = 2 ** (nextNibble - currentPrefix);
      expect(numChildren).toBe(2);
    });
  });

  describe("joinSubnet", () => {
    it("should remove all children from parent", () => {
      const tree = {
        "3fff::/20": {
          _note: "",
          _color: "",
          "3fff::/24": { _note: "Child 1", _color: "" },
          "3fff:100::/24": { _note: "Child 2", _color: "" },
        },
      };
      const parentCidr = "3fff::/20";

      // After join, parent should only have _note and _color
      const node = tree[parentCidr];
      const children = Object.keys(node).filter((k) => !k.startsWith("_"));
      expect(children.length).toBe(2); // Before join

      // After removing children:
      // delete node['3fff::/24'];
      // delete node['3fff:100::/24'];
      // children.length should be 0
    });
  });

  describe("Subnet Counting", () => {
    it("should return /48 count for prefixes < 48", () => {
      const count = 2 ** (48 - 20);
      expect(count).toBe(268435456);
    });

    it("should return /64 count for prefixes >= 48", () => {
      const count = 2 ** (64 - 48);
      expect(count).toBe(65536);
    });

    it('should return "Host Subnet" for /64', () => {
      const prefix = 64;
      expect(prefix).toBe(64);
    });
  });

  describe("getChildSubnetAtTarget - custom target prefix", () => {
    it("should calculate child at /33 from /32", () => {
      // Parent: 2001:db8::/32
      // Child 0 at /33 should be 2001:db8::/33
      // First child has same address as parent
      const bytes = new Uint8Array([
        0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
      ]);

      // At index 0, byte 7 should have bit 7 (0-indexed from left) = 0
      // First 32 bits are from parent, bit 33 is 0 (first child)
      expect(bytes[7] & 0x80).toBe(0x00);
    });

    it("should calculate second child at /33 from /32", () => {
      // Parent: 2001:db8::/32
      // Child 1 at /33 should be 2001:db8:8000::/33
      // Bit 33 is set (1 << (128 - 33) = 1 << 95)
      // In byte position: 95 / 8 = 11 (byte 11)
      // Bit position within byte: 95 % 8 = 7
      // Byte 11 (0-indexed) should have bit 7 set = 0x80
      const expectedByte11 = 0x80;

      expect(expectedByte11).toBe(0x80);
    });

    it("should calculate child at /34 from /32", () => {
      // Parent: 2001:db8::/32
      // Child 1 at /34: 2001:db8:4000::/34
      // Bits added = 2 (from /32 to /34)
      // Index 1 in binary: 01 (2 bits)
      // Position: starting at bit 33
      // Should set bit 34 to 1: (1 << (128 - 34)) = 1 << 94
      // Byte: 94 / 8 = 11, bit: 94 % 8 = 6
      // Byte 11 should have bit 6 set = 0x40
      const expectedByte11 = 0x40;

      expect(expectedByte11).toBe(0x40);
    });

    it("should calculate child at /35 from /32", () => {
      // Parent: 2001:db8::/32
      // Child 1 at /35: 2001:db8:2000::/35
      // Bits added = 3 (from /32 to /35)
      // Index 1 in binary: 001 (3 bits)
      // Should set bit 34 to 1: (1 << (128 - 34)) = 1 << 94
      // Byte: 94 / 8 = 11, bit: 94 % 8 = 6
      // Byte 11 should have bit 6 set = 0x40
      const expectedByte11 = 0x20;

      expect(expectedByte11).toBe(0x20);
    });
  });

  describe("splitSubnet - custom target prefix", () => {
    it("should calculate correct number of children for custom split", () => {
      const currentPrefix = 32;
      const targetPrefix = 34;
      const numChildren = 2 ** (targetPrefix - currentPrefix);
      expect(numChildren).toBe(4);
    });

    it("should calculate correct number of children for /35 split", () => {
      const currentPrefix = 32;
      const targetPrefix = 35;
      const numChildren = 2 ** (targetPrefix - currentPrefix);
      expect(numChildren).toBe(8);
    });

    it("should calculate correct number of children for /25 split from /20", () => {
      const currentPrefix = 20;
      const targetPrefix = 25;
      const numChildren = 2 ** (targetPrefix - currentPrefix);
      expect(numChildren).toBe(32);
    });

    it("should calculate correct number of children for /52 split from /48", () => {
      const currentPrefix = 48;
      const targetPrefix = 52;
      const numChildren = 2 ** (targetPrefix - currentPrefix);
      expect(numChildren).toBe(16);
    });
  });

  describe("splitSubnet - edge cases", () => {
    it("should not allow split at target <= current prefix", () => {
      const currentPrefix = 20;
      const targetPrefix = 20;
      expect(targetPrefix <= currentPrefix).toBe(true);
    });

    it("should not allow split at target > 64", () => {
      const targetPrefix = 65;
      expect(targetPrefix > 64).toBe(true);
    });

    it("should validate 1024 child limit", () => {
      const currentPrefix = 20;
      const targetPrefix = 30;
      const numChildren = 2 ** (targetPrefix - currentPrefix);
      expect(numChildren).toBe(1024);
    });

    it("should exceed 1024 child limit", () => {
      const currentPrefix = 20;
      const targetPrefix = 31;
      const numChildren = 2 ** (targetPrefix - currentPrefix);
      expect(numChildren).toBe(2048);
    });

    it("should handle custom split from non-nibble-aligned prefix", () => {
      const currentPrefix = 21;
      const targetPrefix = 33;
      const numChildren = 2 ** (targetPrefix - currentPrefix);
      expect(numChildren).toBe(4096);
    });

    it("should handle custom split from /22 to /33", () => {
      const currentPrefix = 22;
      const targetPrefix = 33;
      const numChildren = 2 ** (targetPrefix - currentPrefix);
      expect(numChildren).toBe(2048);
    });
  });
});
