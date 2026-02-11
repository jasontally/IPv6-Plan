/**
 * IPv6 Subnet Planner Tests - Intermediate Operations
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createIntermediateLevel,
  createIntermediateLevels,
  getSubnetNode,
  deleteDescendants,
  subnetTree,
} from "../app.js";

describe("Intermediate Operations", () => {
  beforeEach(() => {
    // Clear global subnetTree before each test
    Object.keys(subnetTree).forEach((key) => {
      delete subnetTree[key];
    });
  });

  describe("createIntermediateLevel", () => {
    it("should create correct number of children for /20 to /24", () => {
      subnetTree["3fff::/20"] = { _note: "Parent", _color: "#FF0000" };
      const children = createIntermediateLevel("3fff::/20", 24);
      expect(children.length).toBe(16);
      expect(children[0]).toBe("3fff::/24");
    });

    it("should create correct number of children for multiple nibble boundary", () => {
      subnetTree["3fff::/20"] = { _note: "Parent", _color: "" };
      const children = createIntermediateLevel("3fff::/20", 28);
      // /20 to /28 is 8 bits, so 2^8 = 256 children at /28
      expect(children.length).toBe(256);
      expect(children[0]).toBe("3fff::/28");
    });

    it("should return empty array when targetPrefix equals current prefix", () => {
      const children = createIntermediateLevel("3fff::/24", 24);
      expect(children).toEqual([]);
    });

    it("should return empty array when targetPrefix is less than current prefix", () => {
      const children = createIntermediateLevel("3fff::/24", 20);
      expect(children).toEqual([]);
    });

    it("should handle different nibble boundaries", () => {
      subnetTree["3fff::/20"] = { _note: "Parent", _color: "#FF0000" };
      const children = createIntermediateLevel("3fff::/20", 24);
      expect(children.length).toBe(16);
      expect(children[0]).toBe("3fff::/24");
    });

    it("should handle /32 to /36 boundary", () => {
      subnetTree["2001:db8::/32"] = { _note: "Parent", _color: "" };
      const children = createIntermediateLevel("2001:db8::/32", 36);
      expect(children.length).toBe(16);
      expect(children[0]).toBe("2001:db8::/36");
    });

    it("should handle /48 to /52 boundary", () => {
      subnetTree["2001:db8::/48"] = { _note: "Parent", _color: "" };
      const children = createIntermediateLevel("2001:db8::/48", 52);
      expect(children.length).toBe(16);
      expect(children[0]).toBe("2001:db8::/52");
    });

    it("should handle ULA addresses", () => {
      subnetTree["fd00:abcd::/32"] = { _note: "ULA Parent", _color: "" };
      const children = createIntermediateLevel("fd00:abcd::/32", 36);
      expect(children.length).toBe(16);
    });

    it("should inherit parent metadata to children", () => {
      subnetTree["3fff::/20"] = { _note: "Test note", _color: "#FF0000" };
      const children = createIntermediateLevel("3fff::/20", 24);

      expect(children.length).toBe(16);
      children.forEach((childCidr) => {
        const child = getSubnetNode(childCidr);
        expect(child._note).toBe("Test note");
        expect(child._color).toBe("#FF0000");
      });
    });
  });

  describe("createIntermediateLevels", () => {
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

    it("should handle single level (no intermediates needed)", () => {
      const parentCidr = "3fff::/20";
      const targetPrefix = 24;

      const children = createIntermediateLevels(parentCidr, targetPrefix);

      // Direct /20 → /24, no intermediate levels
      expect(children.length).toBe(16);
      expect(children.every((c) => c.includes("/24"))).toBe(true);
    });

    it("should inherit metadata through all levels", () => {
      const parentCidr = "3fff::/20";
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
  });

  describe("Metadata Inheritance in Intermediate Levels", () => {
    it("should inherit parent note when child node has empty note", () => {
      subnetTree["3fff::/20"] = { _note: "Parent Note", _color: "#FF0000" };
      subnetTree["3fff::/24"] = { _note: "", _color: "" };

      createIntermediateLevels("3fff::/20", 28);

      expect(subnetTree["3fff::/24"]._note).toBe("Parent Note");
      expect(subnetTree["3fff::/24"]._color).toBe("#FF0000");
    });

    it("should inherit parent color when child node has empty color", () => {
      subnetTree["3fff::/20"] = { _note: "", _color: "#00FF00" };
      subnetTree["3fff::/24"] = { _note: "", _color: "" };

      createIntermediateLevels("3fff::/20", 28);

      expect(subnetTree["3fff::/24"]._note).toBe("");
      expect(subnetTree["3fff::/24"]._color).toBe("#00FF00");
    });

    it("should inherit both note and color when child has empty metadata", () => {
      subnetTree["3fff::/20"] = { _note: "Test Note", _color: "#123456" };
      subnetTree["3fff::/24"] = { _note: "", _color: "" };

      createIntermediateLevels("3fff::/20", 28);

      expect(subnetTree["3fff::/24"]._note).toBe("Test Note");
      expect(subnetTree["3fff::/24"]._color).toBe("#123456");
    });

    it("should not overwrite child note if it already has one", () => {
      subnetTree["3fff::/20"] = { _note: "Parent Note", _color: "#FF0000" };
      subnetTree["3fff::/24"] = { _note: "Child Note", _color: "" };

      createIntermediateLevels("3fff::/20", 28);

      expect(subnetTree["3fff::/24"]._note).toBe("Child Note");
    });

    it("should not overwrite child color if it already has one", () => {
      subnetTree["3fff::/20"] = { _note: "", _color: "#FF0000" };
      subnetTree["3fff::/24"] = { _note: "", _color: "#00FF00" };

      createIntermediateLevels("3fff::/20", 28);

      expect(subnetTree["3fff::/24"]._color).toBe("#00FF00");
    });

    it("should create standalone node with parent metadata when child doesn't exist", () => {
      subnetTree["3fff::/20"] = { _note: "Parent Note", _color: "#FF0000" };

      createIntermediateLevels("3fff::/20", 28);

      expect(subnetTree["3fff::/24"]).toBeDefined();
      expect(subnetTree["3fff::/24"]._note).toBe("Parent Note");
      expect(subnetTree["3fff::/24"]._color).toBe("#FF0000");
    });

    it("should handle multiple levels with metadata inheritance", () => {
      subnetTree["3fff::/20"] = { _note: "Root", _color: "#FF0000" };
      subnetTree["3fff::/24"] = { _note: "", _color: "" };
      subnetTree["3fff::/28"] = { _note: "", _color: "" };

      createIntermediateLevels("3fff::/20", 30);

      expect(subnetTree["3fff::/24"]._note).toBe("Root");
      expect(subnetTree["3fff::/28"]._note).toBe("Root");
      expect(subnetTree["3fff::/30"]).toBeDefined();
    });

    it("should not inherit when child already has both note and color", () => {
      subnetTree["3fff::/20"] = { _note: "Parent Note", _color: "#FF0000" };
      subnetTree["3fff::/24"] = { _note: "Child Note", _color: "#00FF00" };

      createIntermediateLevels("3fff::/20", 28);

      expect(subnetTree["3fff::/24"]._note).toBe("Child Note");
      expect(subnetTree["3fff::/24"]._color).toBe("#00FF00");
    });

    it("should create all levels when child nodes don't exist", () => {
      subnetTree["3fff::/20"] = { _note: "Root", _color: "" };

      const result = createIntermediateLevels("3fff::/20", 30);

      expect(result).toBeDefined();
      expect(subnetTree["3fff::/24"]).toBeDefined();
      expect(subnetTree["3fff::/28"]).toBeDefined();
      expect(subnetTree["3fff::/30"]).toBeDefined();
    });
  });

  describe("deleteDescendants", () => {
    it("should delete direct children", () => {
      const parent = getSubnetNode("3fff::/20");
      parent._note = "Parent";
      parent._color = "#FF0000";

      const child1 = getSubnetNode("3fff::/24");
      child1._note = "Child 1";

      const child2 = getSubnetNode("3fff:100::/24");
      child2._note = "Child 2";

      parent["3fff::/24"] = child1;
      parent["3fff:100::/24"] = child2;

      expect(Object.keys(parent).filter((k) => !k.startsWith("_")).length).toBe(
        2,
      );

      deleteDescendants("3fff::/20");

      expect(Object.keys(parent).filter((k) => !k.startsWith("_")).length).toBe(
        0,
      );
      expect(subnetTree["3fff::/20"]).toBeDefined();
      expect(subnetTree["3fff::/20"]._note).toBe("Parent");
    });

    it("should delete grandchildren", () => {
      const parent = getSubnetNode("3fff::/20");
      parent._note = "Parent";

      const child = getSubnetNode("3fff::/24");
      child._note = "Child";

      const grandchild = getSubnetNode("3fff::/28");
      grandchild._note = "Grandchild";

      parent["3fff::/24"] = child;
      child["3fff::/28"] = grandchild;

      expect(Object.keys(child).filter((k) => !k.startsWith("_")).length).toBe(
        1,
      );

      deleteDescendants("3fff::/20");

      expect(Object.keys(parent).filter((k) => !k.startsWith("_")).length).toBe(
        0,
      );
      expect(Object.keys(child).filter((k) => !k.startsWith("_")).length).toBe(
        0,
      );
    });

    it("should delete great-grandchildren", () => {
      const parent = getSubnetNode("3fff::/20");
      parent._note = "Parent";

      const child = getSubnetNode("3fff::/24");
      child._note = "Child";

      const grandchild = getSubnetNode("3fff::/28");
      grandchild._note = "Grandchild";

      const greatGrandchild = getSubnetNode("3fff::/30");
      greatGrandchild._note = "Great-grandchild";

      parent["3fff::/24"] = child;
      child["3fff::/28"] = grandchild;
      grandchild["3fff::/30"] = greatGrandchild;

      expect(
        Object.keys(grandchild).filter((k) => !k.startsWith("_")).length,
      ).toBe(1);

      deleteDescendants("3fff::/20");

      expect(Object.keys(parent).filter((k) => !k.startsWith("_")).length).toBe(
        0,
      );
      expect(Object.keys(child).filter((k) => !k.startsWith("_")).length).toBe(
        0,
      );
      expect(
        Object.keys(grandchild).filter((k) => !k.startsWith("_")).length,
      ).toBe(0);
    });

    it("should work with any depth", () => {
      const parent = getSubnetNode("3fff::/20");
      parent._note = "Parent";

      const child1 = getSubnetNode("3fff::/24");
      child1._note = "Child 1";

      const child2 = getSubnetNode("3fff:100::/24");
      child2._note = "Child 2";

      const grandchild1 = getSubnetNode("3fff::/28");
      grandchild1._note = "Grandchild 1";

      const grandchild2 = getSubnetNode("3fff:100::/28");
      grandchild2._note = "Grandchild 2";

      const greatGrandchild = getSubnetNode("3fff::/30");
      greatGrandchild._note = "Great-grandchild";

      parent["3fff::/24"] = child1;
      parent["3fff:100::/24"] = child2;
      child1["3fff::/28"] = grandchild1;
      child2["3fff:100::/28"] = grandchild2;
      grandchild1["3fff::/30"] = greatGrandchild;

      expect(Object.keys(parent).filter((k) => !k.startsWith("_")).length).toBe(
        2,
      );

      deleteDescendants("3fff::/20");

      expect(Object.keys(parent).filter((k) => !k.startsWith("_")).length).toBe(
        0,
      );
      expect(Object.keys(child1).filter((k) => !k.startsWith("_")).length).toBe(
        0,
      );
      expect(Object.keys(child2).filter((k) => !k.startsWith("_")).length).toBe(
        0,
      );
      expect(
        Object.keys(grandchild1).filter((k) => !k.startsWith("_")).length,
      ).toBe(0);
      expect(
        Object.keys(grandchild2).filter((k) => !k.startsWith("_")).length,
      ).toBe(0);
    });

    it("should not delete node itself", () => {
      const parent = getSubnetNode("3fff::/20");
      parent._note = "Parent";
      parent._color = "#FF0000";

      const child = getSubnetNode("3fff::/24");
      child._note = "Child";

      parent["3fff::/24"] = child;

      deleteDescendants("3fff::/20");

      expect(subnetTree["3fff::/20"]).toBeDefined();
      expect(subnetTree["3fff::/20"]._note).toBe("Parent");
      expect(subnetTree["3fff::/20"]._color).toBe("#FF0000");
    });

    it("should handle node with no children", () => {
      const parent = getSubnetNode("3fff::/20");
      parent._note = "Parent";
      parent._color = "#FF0000";

      expect(() => deleteDescendants("3fff::/20")).not.toThrow();

      expect(subnetTree["3fff::/20"]).toBeDefined();
      expect(subnetTree["3fff::/20"]._note).toBe("Parent");
    });
  });
});
