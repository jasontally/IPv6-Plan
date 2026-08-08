/**
 * IPv6 Subnet Planner Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from "vitest";
import { getAutoSplitTarget } from "../app.js";

describe("getAutoSplitTarget", () => {
  describe("4-bit (nibble) step", () => {
    it("should return next nibble for aligned prefix /20", () => {
      expect(getAutoSplitTarget(20, 4)).toBe(24);
    });

    it("should round up non-aligned prefix /21", () => {
      expect(getAutoSplitTarget(21, 4)).toBe(24);
    });

    it("should round up non-aligned prefix /22", () => {
      expect(getAutoSplitTarget(22, 4)).toBe(24);
    });

    it("should round up non-aligned prefix /23", () => {
      expect(getAutoSplitTarget(23, 4)).toBe(24);
    });

    it("should return /28 for aligned /24", () => {
      expect(getAutoSplitTarget(24, 4)).toBe(28);
    });

    it("should return /64 for /60", () => {
      expect(getAutoSplitTarget(60, 4)).toBe(64);
    });

    it("should cap at /64 for /61", () => {
      expect(getAutoSplitTarget(61, 4)).toBe(64);
    });

    it("should cap at /64 for /63", () => {
      expect(getAutoSplitTarget(63, 4)).toBe(64);
    });
  });

  describe("8-bit (byte) step", () => {
    it("should return /24 for nibble-aligned /16", () => {
      expect(getAutoSplitTarget(16, 8)).toBe(24);
    });

    it("should return /28 for nibble-aligned /20", () => {
      expect(getAutoSplitTarget(20, 8)).toBe(28);
    });

    it("should return /32 for nibble-aligned /24", () => {
      expect(getAutoSplitTarget(24, 8)).toBe(32);
    });

    it("should return /40 for nibble-aligned /32", () => {
      expect(getAutoSplitTarget(32, 8)).toBe(40);
    });

    it("should return /48 for nibble-aligned /40", () => {
      expect(getAutoSplitTarget(40, 8)).toBe(48);
    });

    it("should return /56 for nibble-aligned /48", () => {
      expect(getAutoSplitTarget(48, 8)).toBe(56);
    });

    it("should return /64 for nibble-aligned /56", () => {
      expect(getAutoSplitTarget(56, 8)).toBe(64);
    });

    it("should round non-nibble-aligned /21 to /24 (same as 4-bit)", () => {
      expect(getAutoSplitTarget(21, 8)).toBe(24);
    });

    it("should round non-nibble-aligned /22 to /24 (same as 4-bit)", () => {
      expect(getAutoSplitTarget(22, 8)).toBe(24);
    });

    it("should round non-nibble-aligned /23 to /24 (same as 4-bit)", () => {
      expect(getAutoSplitTarget(23, 8)).toBe(24);
    });

    it("should round non-nibble-aligned /46 to /48 (same as 4-bit)", () => {
      expect(getAutoSplitTarget(46, 8)).toBe(48);
    });

    it("should cap at /64 for /60", () => {
      expect(getAutoSplitTarget(60, 8)).toBe(64);
    });

    it("should cap at /64 for /63", () => {
      expect(getAutoSplitTarget(63, 8)).toBe(64);
    });
  });

  describe("default parameter", () => {
    it("should default to the 4-bit step when bits omitted", () => {
      // Module loads with autoSplitBits = 4
      expect(getAutoSplitTarget(20)).toBe(24);
      expect(getAutoSplitTarget(40)).toBe(44);
    });
  });

  describe("capping at /64", () => {
    it("should return 64 for /64 with 4-bit step", () => {
      expect(getAutoSplitTarget(64, 4)).toBe(64);
    });

    it("should return 64 for /64 with 8-bit step", () => {
      expect(getAutoSplitTarget(64, 8)).toBe(64);
    });
  });
});
