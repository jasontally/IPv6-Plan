/**
 * IPv6 Subnet Planner Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getSubnetNode, deleteDescendants } from "../app.js";
import { subnetTree } from "../app.js";

describe("deleteDescendants", () => {
  beforeEach(() => {
    Object.keys(subnetTree).forEach((key) => {
      delete subnetTree[key];
    });
  });

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

    expect(Object.keys(child).filter((k) => !k.startsWith("_")).length).toBe(1);

    deleteDescendants("3fff::/20");

    expect(Object.keys(parent).filter((k) => !k.startsWith("_")).length).toBe(
      0,
    );
    expect(Object.keys(child).filter((k) => !k.startsWith("_")).length).toBe(0);
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
    expect(Object.keys(child).filter((k) => !k.startsWith("_")).length).toBe(0);
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

  it("should not delete the node itself", () => {
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
