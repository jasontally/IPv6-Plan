/**
 * IPv6 Subnet Planner Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect } from "vitest";
import { getNibbleBoundaries } from "../app.js";

describe("getNibbleBoundaries", () => {
  it("should return [24, 28] for aligned to aligned 20→28", () => {
    const result = getNibbleBoundaries(20, 28);
    expect(result).toEqual([24, 28]);
  });

  it("should return [24, 28, 30] for aligned to aligned 20→30", () => {
    const result = getNibbleBoundaries(20, 30);
    expect(result).toEqual([24, 28, 30]);
  });

  it("should return [28, 30] for aligned to aligned 24→30", () => {
    const result = getNibbleBoundaries(24, 30);
    expect(result).toEqual([28, 30]);
  });

  it("should return [24, 28] for non-aligned start 21→28", () => {
    const result = getNibbleBoundaries(21, 28);
    expect(result).toEqual([24, 28]);
  });

  it("should return [24, 28] for non-aligned start 22→28", () => {
    const result = getNibbleBoundaries(22, 28);
    expect(result).toEqual([24, 28]);
  });

  it("should return [24, 28] for non-aligned start 23→28", () => {
    const result = getNibbleBoundaries(23, 28);
    expect(result).toEqual([24, 28]);
  });

  it("should return [24, 28] for non-aligned end 20→25", () => {
    const result = getNibbleBoundaries(20, 25);
    expect(result).toEqual([24, 25]);
  });

  it("should return [24, 28] for non-aligned end 20→26", () => {
    const result = getNibbleBoundaries(20, 26);
    expect(result).toEqual([24, 26]);
  });

  it("should return [24, 28] for non-aligned end 20→27", () => {
    const result = getNibbleBoundaries(20, 27);
    expect(result).toEqual([24, 27]);
  });

  it("should return [24] for same prefix 24→24", () => {
    const result = getNibbleBoundaries(24, 24);
    expect(result).toEqual([24]);
  });

  it("should return [28, 30] for non-aligned start and end 22→25", () => {
    const result = getNibbleBoundaries(22, 25);
    expect(result).toEqual([24, 25]);
  });

  it("should return [28, 30] for non-aligned start and end 23→25", () => {
    const result = getNibbleBoundaries(23, 25);
    expect(result).toEqual([24, 25]);
  });

  it("should return [25] for non-aligned start and end 25→25", () => {
    const result = getNibbleBoundaries(25, 25);
    expect(result).toEqual([25]);
  });

  it("should return [28] for non-aligned start and end 25→29", () => {
    const result = getNibbleBoundaries(25, 29);
    expect(result).toEqual([28, 29]);
  });

  it("should return [20] for start 20→20", () => {
    const result = getNibbleBoundaries(20, 20);
    expect(result).toEqual([20]);
  });

  it("should return [24] for aligned split 20→24", () => {
    const result = getNibbleBoundaries(20, 24);
    expect(result).toEqual([24]);
  });

  it("should return [28] for aligned split 24→28", () => {
    const result = getNibbleBoundaries(24, 28);
    expect(result).toEqual([28]);
  });

  it("should return [32] for aligned split 28→32", () => {
    const result = getNibbleBoundaries(28, 32);
    expect(result).toEqual([32]);
  });

  it("should handle small range 20→21", () => {
    const result = getNibbleBoundaries(20, 21);
    expect(result).toEqual([21]);
  });

  it("should handle small range 20→22", () => {
    const result = getNibbleBoundaries(20, 22);
    expect(result).toEqual([22]);
  });

  it("should handle small range 20→23", () => {
    const result = getNibbleBoundaries(20, 23);
    expect(result).toEqual([23]);
  });

  it("should handle large range 16→48", () => {
    const result = getNibbleBoundaries(16, 48);
    expect(result).toEqual([20, 24, 28, 32, 36, 40, 44, 48]);
  });

  it("should handle large range 16→60", () => {
    const result = getNibbleBoundaries(16, 60);
    expect(result).toEqual([20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60]);
  });

  it("should handle large range 16→64", () => {
    const result = getNibbleBoundaries(16, 64);
    expect(result).toEqual([20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64]);
  });

  it("should return [64] for start >= end 64→60", () => {
    const result = getNibbleBoundaries(64, 60);
    expect(result).toEqual([64]);
  });

  it("should return [20] for start >= end 20→16", () => {
    const result = getNibbleBoundaries(20, 16);
    expect(result).toEqual([20]);
  });
});
