/**
 * IPv6 Subnet Planner Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createIntermediateLevel,
  createIntermediateLevels,
  subnetTree,
} from "../app.js";

describe("createIntermediateLevel - additional edge cases", () => {
  beforeEach(() => {
    // Clear the global subnetTree before each test
    Object.keys(subnetTree).forEach((key) => {
      delete subnetTree[key];
    });
  });

  it("should return empty array when targetPrefix equals current prefix", () => {
    const children = createIntermediateLevel("3fff::/24", 24);
    expect(children).toEqual([]);
  });

  it("should return empty array when targetPrefix is less than current prefix", () => {
    const children = createIntermediateLevel("3fff::/24", 20);
    expect(children).toEqual([]);
  });

  it("should work with different nibble boundaries", () => {
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
});

describe("createIntermediateLevels - metadata inheritance", () => {
  beforeEach(() => {
    // Clear the global subnetTree before each test
    Object.keys(subnetTree).forEach((key) => {
      delete subnetTree[key];
    });
  });

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
