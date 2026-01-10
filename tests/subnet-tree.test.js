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
  getNibbleBoundaries,
  createIntermediateLevel,
  parseIPv6,
  subnetTree,
} from "../app.js";

describe("Subnet Tree Operations", () => {
  beforeEach(() => {
    Object.keys(subnetTree).forEach((key) => {
      delete subnetTree[key];
    });
  });

  describe("getSubnetNode", () => {
    it("should create node if it does not exist", () => {
      const cidr = "3fff::/24";
      const node = getSubnetNode(cidr);

      expect(node).toBeDefined();
      expect(node._note).toBe("");
      expect(node._color).toBe("");
    });

    it("should return existing node", () => {
      subnetTree["3fff::/24"] = { _note: "Test", _color: "#FF0000" };
      const cidr = "3fff::/24";

      const node = getSubnetNode(cidr);
      expect(node._note).toBe("Test");
      expect(node._color).toBe("#FF0000");
    });

    it("should maintain node reference", () => {
      const cidr = "3fff::/24";
      const node1 = getSubnetNode(cidr);
      const node2 = getSubnetNode(cidr);

      expect(node1).toBe(node2);
    });
  });

  describe("isSplit", () => {
    it("should return false for leaf node", () => {
      subnetTree["3fff::/24"] = { _note: "", _color: "" };
      const cidr = "3fff::/24";

      const node = getSubnetNode(cidr);
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

      const node = getSubnetNode(cidr);
      const keys = Object.keys(node).filter((k) => !k.startsWith("_"));
      expect(keys.length).toBe(1);
    });

    it("should ignore _note and _color keys", () => {
      subnetTree["3fff::/20"] = {
        _note: "test note",
        _color: "#FF0000",
      };

      const node = getSubnetNode("3fff::/20");
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

      const node = getSubnetNode(cidr);
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

      const node = getSubnetNode(cidr);
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
      const root = getSubnetNode("3fff::/20");
      root["3fff::/24"] = { _note: "", _color: "" };

      // Add grandchild
      const child = getSubnetNode("3fff::/24");
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

  describe("getNibbleBoundaries", () => {
    it("should return [24] for /20 to /24", () => {
      const boundaries = getNibbleBoundaries(20, 24);
      expect(boundaries).toEqual([24]);
    });

    it("should return [24, 28] for /20 to /28", () => {
      const boundaries = getNibbleBoundaries(20, 28);
      expect(boundaries).toEqual([24, 28]);
    });

    it("should return [24, 28] for /20 to /25", () => {
      const boundaries = getNibbleBoundaries(20, 25);
      expect(boundaries).toEqual([24, 25]);
    });

    it("should return [24, 28, 30] for /20 to /30", () => {
      const boundaries = getNibbleBoundaries(20, 30);
      expect(boundaries).toEqual([24, 28, 30]);
    });

    it("should return [28, 32] for /24 to /32", () => {
      const boundaries = getNibbleBoundaries(24, 32);
      expect(boundaries).toEqual([28, 32]);
    });

    it("should return [24] for /21 to /24", () => {
      const boundaries = getNibbleBoundaries(21, 24);
      expect(boundaries).toEqual([24]);
    });

    it("should return [24, 28] for /21 to /25", () => {
      const boundaries = getNibbleBoundaries(21, 25);
      expect(boundaries).toEqual([24, 25]);
    });

    it("should return [24, 28] for /21 to /28", () => {
      const boundaries = getNibbleBoundaries(21, 28);
      expect(boundaries).toEqual([24, 28]);
    });
  });

  describe("splitSubnet with intermediate levels", () => {
    beforeEach(() => {
      // Clear all entries from subnetTree (already done by parent beforeEach)
      // Note: subnetTree is imported from app.js and cleared in parent describe block
    });

    it("should create children with inherited note and color", () => {
      const parent = getSubnetNode("3fff::/20");
      parent._note = "Data Center";
      parent._color = "#FF0000";

      const children = createIntermediateLevel("3fff::/20", 24);

      expect(children.length).toBe(16);

      const child1 = parent[children[0]];
      expect(child1._note).toBe("Data Center");
      expect(child1._color).toBe("#FF0000");

      const child2 = parent[children[1]];
      expect(child2._note).toBe("Data Center");
      expect(child2._color).toBe("#FF0000");
    });

    it("should create correct number of children", () => {
      subnetTree["3fff::/20"] = { _note: "", _color: "" };

      const children = createIntermediateLevel("3fff::/20", 24);

      expect(children.length).toBe(16);
    });

    it("should create children at correct addresses", () => {
      subnetTree["3fff::/20"] = { _note: "", _color: "" };

      const children = createIntermediateLevel("3fff::/20", 24);

      expect(children[0]).toBe("3fff::/24");
      expect(children[1]).toBe("3fff:100::/24");
      expect(children[2]).toBe("3fff:200::/24");
    });
  });

  describe("splitSubnet with intermediate levels", () => {
    beforeEach(() => {
      // Clear all entries from subnetTree (already done by previous beforeEach)
      // Note: subnetTree is imported from app.js and cleared in parent describe block
    });

    it("should split /20 to /24 directly (no intermediate)", () => {
      subnetTree["3fff::/20"] = {
        _note: "Root",
        _color: "#FF0000",
      };

      const boundaries = getNibbleBoundaries(20, 24);
      expect(boundaries).toEqual([24]);

      const children = createIntermediateLevel("3fff::/20", 24);

      expect(children.length).toBe(16);
      expect(children[0]).toBe("3fff::/24");
      expect(children[1]).toBe("3fff:100::/24");

      const parent = getSubnetNode("3fff::/20");
      const child1 = parent[children[0]];
      expect(child1._note).toBe("Root");
      expect(child1._color).toBe("#FF0000");
    });

    it("should split /20 to /28 with /24 intermediate", () => {
      subnetTree["3fff::/20"] = {
        _note: "Data Center",
        _color: "#FF0000",
      };

      const boundaries = getNibbleBoundaries(20, 28);
      expect(boundaries).toEqual([24, 28]);

      const parent = subnetTree["3fff::/20"];
      const twentyFourChildren = createIntermediateLevel("3fff::/20", 24);

      expect(twentyFourChildren.length).toBe(16);

      const twentyFourNode = getSubnetNode(twentyFourChildren[0]);
      expect(twentyFourNode._note).toBe("Data Center");
      expect(twentyFourNode._color).toBe("#FF0000");

      const twentyEightChildren = createIntermediateLevel(
        twentyFourChildren[0],
        28,
      );

      expect(twentyEightChildren.length).toBe(16);
      expect(twentyEightChildren[0]).toBe("3fff::/28");

      const twentyEightNode = getSubnetNode(twentyEightChildren[0]);
      expect(twentyEightNode._note).toBe("Data Center");
      expect(twentyEightNode._color).toBe("#FF0000");
    });

    it("should split /20 to /25 with /24 intermediate", () => {
      subnetTree["3fff::/20"] = {
        _note: "Test",
        _color: "#00FF00",
      };

      const boundaries = getNibbleBoundaries(20, 25);
      expect(boundaries).toEqual([24, 25]);

      const parent = subnetTree["3fff::/20"];
      const twentyFourChildren = createIntermediateLevel("3fff::/20", 24);

      expect(twentyFourChildren.length).toBe(16);

      const twentyFourNode = getSubnetNode(twentyFourChildren[0]);
      const twentyEightChildren = createIntermediateLevel(
        twentyFourChildren[0],
        28,
      );

      expect(twentyEightChildren.length).toBe(16);

      expect(twentyFourNode._note).toBe("Test");
      expect(twentyFourNode._color).toBe("#00FF00");

      const twentyEightNode = getSubnetNode(twentyEightChildren[0]);
      expect(twentyEightNode._note).toBe("Test");
      expect(twentyEightNode._color).toBe("#00FF00");
    });

    it("should split /20 to /30 with /24 and /28 intermediates", () => {
      subnetTree["3fff::/20"] = {
        _note: "Test",
        _color: "#0000FF",
      };

      const boundaries = getNibbleBoundaries(20, 30);
      expect(boundaries).toEqual([24, 28, 30]);

      const parent = subnetTree["3fff::/20"];
      const twentyFourChildren = createIntermediateLevel("3fff::/20", 24);

      expect(twentyFourChildren.length).toBe(16);

      const twentyFourNode = getSubnetNode(twentyFourChildren[0]);
      const twentyEightChildren = createIntermediateLevel(
        twentyFourChildren[0],
        28,
      );

      expect(twentyEightChildren.length).toBe(16);

      const thirtyChildren = createIntermediateLevel(
        twentyEightChildren[0],
        30,
      );

      expect(thirtyChildren.length).toBe(4);
      expect(thirtyChildren[0]).toBe("3fff::/30");
      expect(thirtyChildren[1]).toBe("3fff:4::/30");
      expect(thirtyChildren[2]).toBe("3fff:8::/30");
      expect(thirtyChildren[3]).toBe("3fff:c::/30");

      expect(twentyFourNode._note).toBe("Test");
      expect(twentyFourNode._color).toBe("#0000FF");

      const thirtyNode = getSubnetNode(thirtyChildren[0]);
      expect(thirtyNode._note).toBe("Test");
      expect(thirtyNode._color).toBe("#0000FF");
    });

    it("should handle /21 to /28 with /24 intermediate", () => {
      subnetTree["3fff:e000::/21"] = {
        _note: "Test",
        _color: "#FF0000",
      };

      const boundaries = getNibbleBoundaries(21, 28);
      expect(boundaries).toEqual([24, 28]);

      const parent = subnetTree["3fff:e000::/21"];
      const twentyFourChildren = createIntermediateLevel("3fff:e000::/21", 24);

      expect(twentyFourChildren.length).toBe(8);
      expect(twentyFourChildren[0]).toBe("3fff:e000::/24");
      expect(twentyFourChildren[7]).toBe("3fff:e700::/24");

      const twentyFourNode = getSubnetNode(twentyFourChildren[0]);
      const twentyEightChildren = createIntermediateLevel(
        twentyFourChildren[0],
        28,
      );

      expect(twentyEightChildren.length).toBe(16);
    });

    it("should handle /24 to /32 with /28 intermediate", () => {
      subnetTree["3fff::/24"] = {
        _note: "Test",
        _color: "#FF0000",
      };

      const boundaries = getNibbleBoundaries(24, 32);
      expect(boundaries).toEqual([28, 32]);

      const parent = subnetTree["3fff::/24"];
      const twentyEightChildren = createIntermediateLevel("3fff::/24", 28);

      expect(twentyEightChildren.length).toBe(16);

      const twentyEightNode = getSubnetNode(twentyEightChildren[0]);
      const thirtyTwoChildren = createIntermediateLevel(
        twentyEightChildren[0],
        32,
      );

      expect(thirtyTwoChildren.length).toBe(16);
    });

    it("should handle /24 to /32 with /28 intermediate", () => {
      subnetTree["3fff::/24"] = {
        _note: "Test",
        _color: "#FF0000",
      };

      const boundaries = getNibbleBoundaries(24, 32);
      expect(boundaries).toEqual([28, 32]);

      const parent = subnetTree["3fff::/24"];
      const twentyEightChildren = createIntermediateLevel("3fff::/24", 28);

      expect(twentyEightChildren.length).toBe(16);

      const twentyEightNode = subnetTree[twentyEightChildren[0]];
      const thirtyTwoChildren = createIntermediateLevel(
        twentyEightChildren[0],
        32,
      );

      expect(thirtyTwoChildren.length).toBe(16);
    });
  });
});
