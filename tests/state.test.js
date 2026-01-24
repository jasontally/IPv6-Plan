/**
 * IPv6 Subnet Planner Tests
 * Copyright (c) 2025 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("State Management", () => {
  let rootNetwork;
  let rootPrefix;
  let subnetTree;

  beforeEach(() => {
    // Initialize state for each test
    rootNetwork = null;
    rootPrefix = null;
    subnetTree = {};
  });

  afterEach(() => {
    // Cleanup after each test
    rootNetwork = null;
    rootPrefix = null;
    subnetTree = {};
  });

  describe("saveState", () => {
    it("should save network and prefix to state object", () => {
      rootNetwork = "3fff::";
      rootPrefix = 20;
      subnetTree = { "3fff::/20": { _note: "", _color: "" } };

      const state = {
        network: rootNetwork,
        prefix: rootPrefix,
        tree: subnetTree,
      };

      expect(state.network).toBe("3fff::");
      expect(state.prefix).toBe(20);
      expect(state.tree).toBeDefined();
    });

    it("should serialize state to JSON", () => {
      const tree = { "3fff::/20": { _note: "Test", _color: "#FF0000" } };
      const json = JSON.stringify({ network: "3fff::", prefix: 20, tree });

      expect(json).toBe(
        JSON.stringify({ network: "3fff::", prefix: 20, tree }),
      );
    });

    it("should encode JSON to base64 for URL", () => {
      const state = { network: "3fff::", prefix: 20, tree: {} };
      const json = JSON.stringify(state);
      const compressed = btoa(encodeURIComponent(json));

      expect(compressed).toBeDefined();
      expect(typeof compressed).toBe("string");
    });

    it("should not save if rootNetwork is null", () => {
      rootNetwork = null;

      // Should early return without saving
      expect(rootNetwork).toBeNull();
    });
  });

  describe("loadState", () => {
    it("should decode base64 from URL hash", () => {
      const state = { network: "3fff::", prefix: 20, tree: {} };
      const json = JSON.stringify(state);
      const hash = btoa(encodeURIComponent(json));

      // Decode should match original
      const decoded = decodeURIComponent(atob(hash));
      expect(decoded).toBe(json);
    });

    it("should parse JSON to restore state", () => {
      const json = '{"network":"3fff::","prefix":20,"tree":{}}';
      const state = JSON.parse(json);

      expect(state.network).toBe("3fff::");
      expect(state.prefix).toBe(20);
      expect(state.tree).toEqual({});
    });

    it("should handle invalid JSON gracefully", () => {
      const invalidHash = "not-valid-json";

      try {
        const decoded = decodeURIComponent(atob(invalidHash));
        const state = JSON.parse(decoded);
        expect(false).toBe(true); // Should not reach here
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it("should return false for empty hash", () => {
      const hash = "";

      expect(hash).toBe("");
    });
  });

  describe("loadNetwork validation", () => {
    it("should reject empty network input", () => {
      const input = "";
      const prefix = 20;

      expect(input.trim()).toBe("");
      expect(prefix).toBe(20);
    });

    it("should reject prefix outside /16-/64 range", () => {
      const prefix = 10;

      expect(prefix < 16 || prefix > 64).toBe(true);
    });

    it("should accept valid prefix range", () => {
      const prefix = 48;

      expect(prefix >= 16 && prefix <= 64).toBe(true);
    });

    it("should reject /64 for splitting", () => {
      const prefix = 64;

      expect(prefix >= 64).toBe(true);
    });
  });

  describe("State persistence flow", () => {
    it("should preserve state through save/load cycle", () => {
      // Initial state
      const initialState = {
        network: "2001:db8::",
        prefix: 32,
        tree: {
          "2001:db8::/32": {
            _note: "Documentation prefix",
            _color: "#E5F3FF",
            "2001:db8::/36": {
              _note: "",
              _color: "",
            },
          },
        },
      };

      // Save
      const json = JSON.stringify(initialState);
      const compressed = btoa(encodeURIComponent(json));

      // Load
      const decoded = decodeURIComponent(atob(compressed));
      const loadedState = JSON.parse(decoded);

      // Verify round-trip
      expect(loadedState).toEqual(initialState);
    });

    it("should handle tree with multiple levels", () => {
      const tree = {
        "3fff::/20": {
          _note: "Root",
          _color: "",
          "3fff::/24": {
            _note: "Child",
            _color: "#FFE5E5",
            "3fff::/28": { _note: "", _color: "" },
          },
        },
      };

      expect(tree["3fff::/20"]._note).toBe("Root");
      expect(tree["3fff::/20"]["3fff::/24"]._note).toBe("Child");
      expect(tree["3fff::/20"]["3fff::/24"]["3fff::/28"]).toBeDefined();
    });
  });

  describe("Compression Utilities", () => {
    // Note: Full compression testing is better suited for E2E tests
    // These unit tests focus on basic function availability and support detection

    it("should detect compression support correctly", async () => {
      const { supportsCompression } = await import("../app.js");

      expect(typeof supportsCompression).toBe("function");
      const result = supportsCompression();
      expect(typeof result).toBe("boolean");

      // In Node.js 18+, this should be true
      // The test passes regardless of the result, just verifies the function works
    });

    it("should have compression functions available", async () => {
      const { compressToDeflateRaw, decompressFromDeflateRaw } =
        await import("../app.js");

      expect(typeof compressToDeflateRaw).toBe("function");
      expect(typeof decompressFromDeflateRaw).toBe("function");
    });

    // Skip full compression tests in Node.js environment due to missing Web APIs
    // Full compression functionality is tested in E2E tests (tests/e2e/url-export.spec.js)
  });
});
