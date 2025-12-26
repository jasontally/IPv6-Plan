/**
 * IPv6 Subnet Planner
 * Copyright (c) 2024 Jason Tally and contributors
 * SPDX-License-Identifier: MIT
 */

// Global state
/** @type {string|null} Root network address (compressed IPv6 string) */
let rootNetwork = null;
/** @type {number|null} Root prefix length */
let rootPrefix = null;
/** @type {Object<string, SubnetNode>} Subnet tree structure keyed by CIDR notation */
let subnetTree = {};

/** @type {string[]} Color palette for row highlighting */
const COLORS = [
  "#FFE5E5", // Soft Pink
  "#E5F3FF", // Sky Blue
  "#E5FFE5", // Mint Green
  "#FFF5E5", // Peach
  "#F5E5FF", // Lavender
  "#E5FFFF", // Cyan
  "#FFFFE5", // Cream
  "#FFE5F5", // Rose
  "#E5F5FF", // Ice Blue
  "#F5FFE5", // Pale Lime
  "#FFE5D5", // Apricot
  "#E5E5FF", // Periwinkle
  "#FFEED5", // Sand
  "#D5FFE5", // Seafoam
  "#FFD5E5", // Blush
  "#E5FFED", // Aqua Mint
];

/**
 * Parse an IPv6 address string into a 16-byte array
 * @param {string} addr - IPv6 address string (may be compressed with ::)
 * @returns {Uint8Array|null} 16-byte array representing the address, or null if invalid
 */
function parseIPv6(addr) {
  addr = addr.trim().toLowerCase();

  // Handle :: expansion
  if (addr.includes("::")) {
    const parts = addr.split("::");
    if (parts.length > 2) return null;

    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - left.length - right.length;

    const groups = [...left];
    for (let i = 0; i < missing; i++) groups.push("0");
    groups.push(...right);

    const bytes = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      const val = parseInt(groups[i] || "0", 16);
      if (isNaN(val) || val > 0xffff) return null;
      bytes[i * 2] = (val >> 8) & 0xff;
      bytes[i * 2 + 1] = val & 0xff;
    }
    return bytes;
  } else {
    const groups = addr.split(":");
    if (groups.length !== 8) return null;

    const bytes = new Uint8Array(16);
    for (let i = 0; i < 8; i++) {
      const val = parseInt(groups[i], 16);
      if (isNaN(val) || val > 0xffff) return null;
      bytes[i * 2] = (val >> 8) & 0xff;
      bytes[i * 2 + 1] = val & 0xff;
    }
    return bytes;
  }
}

/**
 * Convert a 16-byte array to a compressed IPv6 string (RFC 5952 compliant)
 * @param {Uint8Array} bytes - 16-byte array representing an IPv6 address
 * @returns {string} Compressed IPv6 address string
 */
function formatIPv6(bytes) {
  const groups = [];
  for (let i = 0; i < 8; i++) {
    groups.push((bytes[i * 2] << 8) | bytes[i * 2 + 1]);
  }

  // Find longest run of zeros
  let maxStart = -1,
    maxLen = 0;
  let currStart = -1,
    currLen = 0;

  for (let i = 0; i < 8; i++) {
    if (groups[i] === 0) {
      if (currStart === -1) currStart = i;
      currLen++;
    } else {
      if (currLen > maxLen) {
        maxStart = currStart;
        maxLen = currLen;
      }
      currStart = -1;
      currLen = 0;
    }
  }
  if (currLen > maxLen) {
    maxStart = currStart;
    maxLen = currLen;
  }

  // Build string with compression
  if (maxLen > 1) {
    const left = groups
      .slice(0, maxStart)
      .map((g) => g.toString(16))
      .join(":");
    const right = groups
      .slice(maxStart + maxLen)
      .map((g) => g.toString(16))
      .join(":");

    if (maxStart === 0 && maxStart + maxLen === 8) return "::";
    if (maxStart === 0) return "::" + right;
    if (maxStart + maxLen === 8) return left + "::";
    return left + "::" + right;
  }

  return groups.map((g) => g.toString(16)).join(":");
}

/**
 * Apply a prefix mask to get the network address
 * @param {Uint8Array} bytes - 16-byte array representing an IPv6 address
 * @param {number} prefix - Prefix length (0-128)
 * @returns {Uint8Array} 16-byte array of the network address
 */
function applyPrefix(bytes, prefix) {
  const result = new Uint8Array(16);
  const fullBytes = Math.floor(prefix / 8);
  const remainingBits = prefix % 8;

  for (let i = 0; i < fullBytes; i++) {
    result[i] = bytes[i];
  }

  if (remainingBits > 0) {
    const mask = (0xff << (8 - remainingBits)) & 0xff;
    result[fullBytes] = bytes[fullBytes] & mask;
  }

  return result;
}

/**
 * Calculate the address of a child subnet at the next nibble boundary
 * @param {Uint8Array} bytes - 16-byte array of the parent network address
 * @param {number} prefix - Current prefix length
 * @param {number} index - Child index (0-based)
 * @returns {Uint8Array} 16-byte array of the child subnet address
 */
function getChildSubnet(bytes, prefix, index) {
  const result = new Uint8Array(bytes);

  const isAligned = prefix % 4 === 0;
  const nextNibble = isAligned ? prefix + 4 : Math.ceil(prefix / 4) * 4;
  const bitsToAdd = nextNibble - prefix;

  // Convert index to a value we can add to the address
  // We need to shift the index to the correct bit position
  let bitValue = BigInt(0);
  for (let i = 0; i < 16; i++) {
    bitValue = (bitValue << BigInt(8)) | BigInt(bytes[i]);
  }

  // Add the index shifted to the correct position
  const shift = BigInt(128 - nextNibble);
  bitValue = bitValue | (BigInt(index) << shift);

  // Convert back to bytes
  for (let i = 15; i >= 0; i--) {
    result[i] = Number(bitValue & BigInt(0xff));
    bitValue = bitValue >> BigInt(8);
  }

  return result;
}

/**
 * Calculate the address of a child subnet at a specific target prefix
 * @param {Uint8Array} bytes - 16-byte array of the parent network address
 * @param {number} prefix - Current prefix length
 * @param {number} targetPrefix - Target prefix length
 * @param {number} index - Child index (0-based)
 * @returns {Uint8Array} 16-byte array of the child subnet address
 */
function getChildSubnetAtTarget(bytes, prefix, targetPrefix, index) {
  const result = new Uint8Array(bytes);

  // Convert index to a value we can add to the address
  let bitValue = BigInt(0);
  for (let i = 0; i < 16; i++) {
    bitValue = (bitValue << BigInt(8)) | BigInt(bytes[i]);
  }

  // Add the index shifted to the target bit position
  const shift = BigInt(128 - targetPrefix);
  bitValue = bitValue | (BigInt(index) << shift);

  // Convert back to bytes
  for (let i = 15; i >= 0; i--) {
    result[i] = Number(bitValue & BigInt(0xff));
    bitValue = bitValue >> BigInt(8);
  }

  return result;
}

/**
 * Calculate the number of subnets contained within a prefix
 * @param {number} prefix - Prefix length
 * @returns {string} Formatted count string (e.g., "256 /48s" or "Host Subnet")
 */
function getSubnetCount(prefix) {
  if (prefix >= 48) {
    // Show /64 count
    const count = Math.pow(2, 64 - prefix);
    if (prefix === 64) return "Host Subnet";
    return `${count.toLocaleString()} /64s`;
  } else {
    // Show /48 count
    const count = Math.pow(2, 48 - prefix);
    return `${count.toLocaleString()} /48s`;
  }
}

/**
 * Compare two CIDR addresses numerically by their IPv6 address bytes
 * @param {string} a - First CIDR notation string
 * @param {string} b - Second CIDR notation string
 * @returns {number} Negative if a < b, 0 if equal, positive if a > b
 */
function compareCIDR(a, b) {
  const [addrA] = a.split("/");
  const [addrB] = b.split("/");

  const bytesA = parseIPv6(addrA);
  const bytesB = parseIPv6(addrB);

  for (let i = 0; i < 16; i++) {
    if (bytesA[i] !== bytesB[i]) {
      return bytesA[i] - bytesB[i];
    }
  }
  return 0;
}

/**
 * Split a subnet into child subnets at the specified target prefix
 * @param {string} cidr - CIDR notation of the subnet to split
 * @param {number|null} targetPrefix - Target prefix length, or null for nibble-aligned (default)
 * @returns {void}
 */
function splitSubnet(cidr, targetPrefix = null) {
  const [addr, prefix] = cidr.split("/");
  const prefixNum = parseInt(prefix);

  if (prefixNum >= 64) return; // Cannot split /64

  const bytes = parseIPv6(addr);

  // Determine target prefix (nibble-aligned by default)
  let target = targetPrefix;
  if (target === null) {
    const isAligned = prefixNum % 4 === 0;
    target = isAligned ? prefixNum + 4 : Math.ceil(prefixNum / 4) * 4;
  }

  if (target <= prefixNum || target > 64) return; // Invalid target

  const bitsToSplit = target - prefixNum;
  const numChildren = Math.pow(2, bitsToSplit);

  const node = getSubnetNode(cidr);

  // Generate children at the target prefix
  for (let i = 0; i < numChildren; i++) {
    const childBytes = getChildSubnetAtTarget(bytes, prefixNum, target, i);
    const childAddr = formatIPv6(childBytes);
    const childCidr = `${childAddr}/${target}`;
    node[childCidr] = { _note: "", _color: "" };
  }

  saveState();
  render();
}

/**
 * Get or create a subnet node in the tree structure
 * @param {string} cidr - CIDR notation string (e.g., "3fff::/24")
 * @returns {Object} Subnet node object with _note and _color properties
 */
function getSubnetNode(cidr) {
  if (!subnetTree[cidr]) {
    subnetTree[cidr] = { _note: "", _color: "" };
  }
  return subnetTree[cidr];
}

/**
 * Check if a subnet has been split into child subnets
 * @param {string} cidr - CIDR notation string
 * @returns {boolean} True if the subnet has child subnets, false otherwise
 */
function isSplit(cidr) {
  const node = subnetTree[cidr];
  if (!node) return false;

  const keys = Object.keys(node).filter((k) => !k.startsWith("_"));
  return keys.length > 0;
}

/**
 * Join sibling subnets back to their parent network
 * @param {string} cidr - CIDR notation of a child subnet (used to identify the parent)
 * @param {number} targetPrefix - Target prefix length to join back to
 * @returns {void}
 */
function joinSubnet(cidr, targetPrefix) {
  const [addr, currentPrefix] = cidr.split("/");
  const currentPrefixNum = parseInt(currentPrefix);

  // Find parent CIDR
  let parentCidr = cidr;
  for (let p = currentPrefixNum - 4; p >= targetPrefix; p -= 4) {
    const bytes = parseIPv6(addr);
    const masked = applyPrefix(bytes, p);
    parentCidr = `${formatIPv6(masked)}/${p}`;
  }

  // Remove all children from parent node
  const node = getSubnetNode(parentCidr);
  const keys = Object.keys(node).filter((k) => !k.startsWith("_"));
  keys.forEach((k) => {
    delete node[k];
  });

  saveState();
  render();
}

/**
 * Render the subnet table based on current state
 * @returns {void}
 */
function render() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (!rootNetwork) {
    tbody.innerHTML =
      '<tr><td colspan="14" class="empty-state">Enter a network address and click Go to start planning</td></tr>';
    return;
  }

  const rootCidr = `${rootNetwork}/${rootPrefix}`;
  const rows = [];

  function collectRows(cidr, depth = 0, ancestry = []) {
    const [addr, prefix] = cidr.split("/");
    const prefixNum = parseInt(prefix);
    const node = getSubnetNode(cidr);
    const children = Object.keys(node).filter((k) => !k.startsWith("_"));
    const isLeaf = children.length === 0;

    rows.push({
      cidr,
      depth,
      ancestry: [...ancestry],
      note: node._note || "",
      color: node._color || "",
      isLeaf,
      prefix: prefixNum,
    });

    if (!isLeaf) {
      children.sort(compareCIDR).forEach((childCidr) => {
        collectRows(childCidr, depth + 1, [...ancestry, cidr]);
      });
    }
  }

  collectRows(rootCidr);

  // Calculate rowspans for join buttons
  const rowspans = new Map();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    for (let level = 0; level < row.ancestry.length; level++) {
      const ancestorCidr = row.ancestry[level];
      const key = `${ancestorCidr}-${level}`;

      if (!rowspans.has(key)) {
        // Find the first child of this ancestor at this level
        const firstChildIdx = i;

        // Count all rows that are descendants of this ancestor
        // These are rows where ancestry[level] === ancestorCidr
        let count = 0;
        for (let j = firstChildIdx; j < rows.length; j++) {
          // Check if this row is a descendant of the ancestor
          if (
            rows[j].ancestry.length > level &&
            rows[j].ancestry[level] === ancestorCidr
          ) {
            count++;
          } else if (
            rows[j].ancestry.length <= level ||
            rows[j].ancestry[level] !== ancestorCidr
          ) {
            // We've moved past all descendants of this ancestor
            break;
          }
        }

        rowspans.set(key, { row: firstChildIdx, count });
      }
    }
  }

  // Calculate max ancestry depth for join columns
  const maxAncestryDepth = Math.max(1, ...rows.map((r) => r.ancestry.length));

  // Update header colspan to match
  const joinHeader = document.getElementById("joinHeader");
  if (joinHeader) {
    joinHeader.colSpan = maxAncestryDepth;
  }

  // Render rows
  rows.forEach((row, idx) => {
    const tr = document.createElement("tr");
    if (row.color) {
      tr.classList.add("colored");
      tr.style.setProperty("--row-color", row.color);
    }

    // Subnet column
    const subnetTd = document.createElement("td");
    subnetTd.className = "subnet-cell";
    subnetTd.textContent = row.cidr;
    subnetTd.style.paddingLeft = `${row.depth * 20 + 8}px`;
    tr.appendChild(subnetTd);

    // Contains column
    const containsTd = document.createElement("td");
    containsTd.className = "contains-cell";
    containsTd.textContent = getSubnetCount(row.prefix);
    tr.appendChild(containsTd);

    // Note column
    const noteTd = document.createElement("td");
    const noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.className = "note-input";
    noteInput.value = row.note;
    noteInput.addEventListener("change", (e) => {
      const node = getSubnetNode(row.cidr);
      node._note = e.target.value;
      saveState();
    });
    noteTd.appendChild(noteInput);
    tr.appendChild(noteTd);

    // Color button column
    const colorTd = document.createElement("td");
    colorTd.className = "button-cell";
    const colorBtn = document.createElement("button");
    colorBtn.className = "color-button";
    if (row.color) colorBtn.style.background = row.color;
    colorBtn.addEventListener("click", () =>
      showColorPicker(row.cidr, colorBtn),
    );
    colorTd.appendChild(colorBtn);
    tr.appendChild(colorTd);

    // Split button column
    const splitTd = document.createElement("td");
    splitTd.className = "button-cell";

    const splitContainer = document.createElement("div");
    splitContainer.className = "split-container";

    const splitSelect = document.createElement("select");
    splitSelect.className = "split-select";

    const isAligned = row.prefix % 4 === 0;
    const nextNibble = isAligned
      ? row.prefix + 4
      : Math.ceil(row.prefix / 4) * 4;

    const autoOption = document.createElement("option");
    autoOption.value = "auto";
    autoOption.textContent = `Auto (→/${nextNibble})`;
    autoOption.style.fontWeight = "bold";
    splitSelect.appendChild(autoOption);

    for (let p = row.prefix + 1; p <= 64; p++) {
      if (p === nextNibble) continue;
      const numChildren = Math.pow(2, p - row.prefix);
      if (numChildren > 1024) continue;

      const option = document.createElement("option");
      option.value = p.toString();
      option.textContent = `→/${p}`;
      splitSelect.appendChild(option);
    }

    splitSelect.disabled = row.prefix >= 64 || !row.isLeaf;
    splitContainer.appendChild(splitSelect);

    const splitBtn = document.createElement("button");
    splitBtn.className = "split-button";
    splitBtn.textContent = "Split";
    splitBtn.disabled = row.prefix >= 64 || !row.isLeaf;
    splitBtn.addEventListener("click", () => {
      const selectedValue = splitSelect.value;
      const targetPrefix =
        selectedValue === "auto" ? null : parseInt(selectedValue);
      splitSubnet(row.cidr, targetPrefix);
    });
    splitContainer.appendChild(splitBtn);

    splitTd.appendChild(splitContainer);
    tr.appendChild(splitTd);

    // Join button columns (one per ancestry level)
    // Order: most specific (deepest/highest prefix like /24) on LEFT,
    //        least specific (root/lowest prefix like /20) on RIGHT

    // First, add empty cells for unused columns on the left
    const emptyCols = maxAncestryDepth - row.ancestry.length;
    for (let i = 0; i < emptyCols; i++) {
      const emptyTd = document.createElement("td");
      emptyTd.className = "button-cell";
      tr.appendChild(emptyTd);
    }

    // Then add join buttons in reverse order (deepest ancestor first, root last)
    for (let i = row.ancestry.length - 1; i >= 0; i--) {
      const ancestorCidr = row.ancestry[i];
      const key = `${ancestorCidr}-${i}`;
      const spanInfo = rowspans.get(key);

      if (spanInfo && spanInfo.row === idx) {
        const joinTd = document.createElement("td");
        joinTd.className = "button-cell join-cell";
        joinTd.rowSpan = spanInfo.count;

        const [, ancestorPrefix] = ancestorCidr.split("/");
        const joinBtn = document.createElement("button");
        joinBtn.className = "join-button";
        joinBtn.textContent = `/${ancestorPrefix}`;
        joinBtn.title = `Join subnets back together to form a /${ancestorPrefix} network`;
        joinBtn.addEventListener("click", () =>
          joinSubnet(row.cidr, parseInt(ancestorPrefix)),
        );
        joinTd.appendChild(joinBtn);
        tr.appendChild(joinTd);
      }
      // If spanInfo exists but this isn't the first row, the cell is covered by rowspan - don't add anything
    }

    tbody.appendChild(tr);
  });
}

/**
 * Show color picker popup for a subnet row
 * @param {string} cidr - CIDR notation of the subnet to color
 * @param {HTMLButtonElement} button - Button element that triggered the picker
 * @returns {void}
 */
function showColorPicker(cidr, button) {
  currentColorTarget = cidr;
  currentColorButton = button;

  const picker = document.createElement("div");
  picker.style.position = "fixed";
  picker.style.background = "white";
  picker.style.border = "1px solid #ccc";
  picker.style.borderRadius = "4px";
  picker.style.padding = "10px";
  picker.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  picker.style.zIndex = "1000";

  const rect = button.getBoundingClientRect();
  picker.style.left = rect.left + "px";
  picker.style.top = rect.bottom + 5 + "px";

  // Add clear button
  const clearBtn = document.createElement("button");
  clearBtn.textContent = "Clear";
  clearBtn.style.marginRight = "10px";
  clearBtn.addEventListener("click", () => {
    setColor("");
    document.body.removeChild(picker);
  });
  picker.appendChild(clearBtn);

  // Add color options
  COLORS.forEach((color) => {
    const opt = document.createElement("div");
    opt.className = "color-option";
    opt.style.background = color;
    opt.style.display = "inline-block";
    opt.style.margin = "2px";
    opt.addEventListener("click", () => {
      setColor(color);
      document.body.removeChild(picker);
    });
    picker.appendChild(opt);
  });

  document.body.appendChild(picker);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener(
      "click",
      function closePickerOnOutsideClick(e) {
        if (!picker.contains(e.target) && e.target !== button) {
          if (document.body.contains(picker)) {
            document.body.removeChild(picker);
          }
          document.removeEventListener("click", closePickerOnOutsideClick);
        }
      },
      { once: true },
    );
  }, 0);
}

/**
 * Set the color for a subnet and update state
 * @param {string} color - Color value to set (hex color or empty string to clear)
 * @returns {void}
 */
function setColor(color) {
  const node = getSubnetNode(currentColorTarget);
  node._color = color;
  currentColorButton.style.background = color || "white";
  saveState();
  render();
}

/**
 * Save current state to URL hash for sharing/persistence
 * @returns {void}
 */
function saveState() {
  if (!rootNetwork) return;

  const state = {
    network: rootNetwork,
    prefix: rootPrefix,
    tree: subnetTree,
  };

  const json = JSON.stringify(state);
  const compressed = btoa(encodeURIComponent(json));
  window.location.hash = compressed;
}

/**
 * Load state from URL hash
 * @returns {boolean} True if state was successfully loaded, false otherwise
 */
function loadState() {
  const hash = window.location.hash.slice(1);
  if (!hash) return false;

  try {
    const json = decodeURIComponent(atob(hash));
    const state = JSON.parse(json);

    rootNetwork = state.network;
    rootPrefix = state.prefix;
    subnetTree = state.tree;

    document.getElementById("networkInput").value = rootNetwork;
    document.getElementById("prefixSelect").value = rootPrefix;

    render();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Load a documentation prefix into the input fields
 * @param {string} address - IPv6 address
 * @param {number} prefix - Prefix length
 * @returns {void}
 */
function loadDocPrefix(address, prefix) {
  document.getElementById("networkInput").value = address;
  document.getElementById("prefixSelect").value = prefix;
  loadNetwork();
}

/**
 * Load a network based on input field values
 * @returns {void}
 */
function loadNetwork() {
  const input = document.getElementById("networkInput").value.trim();
  const prefix = parseInt(document.getElementById("prefixSelect").value);
  const errorDiv = document.getElementById("error");

  errorDiv.textContent = "";

  // Validate
  if (!input) {
    errorDiv.textContent = "Please enter an IPv6 address";
    return;
  }

  const bytes = parseIPv6(input);
  if (!bytes) {
    errorDiv.textContent = "Invalid IPv6 address";
    return;
  }

  if (prefix < 16 || prefix > 64) {
    errorDiv.textContent = "Prefix must be between /16 and /64";
    return;
  }

  // Apply prefix mask
  const masked = applyPrefix(bytes, prefix);
  rootNetwork = formatIPv6(masked);
  rootPrefix = prefix;

  // Initialize tree
  subnetTree = {};
  const rootCidr = `${rootNetwork}/${rootPrefix}`;
  subnetTree[rootCidr] = { _note: "", _color: "" };

  saveState();
  render();
}

/**
 * Copy the current shareable URL to clipboard
 * @returns {void}
 */
function shareURL() {
  const url = window.location.href;
  navigator.clipboard
    .writeText(url)
    .then(() => {
      alert("URL copied to clipboard!");
    })
    .catch(() => {
      prompt("Copy this URL:", url);
    });
}

/**
 * Export the current subnet plan as a CSV file
 * @returns {void}
 */
function exportCSV() {
  if (!rootNetwork) {
    alert("No network loaded to export");
    return;
  }

  const rootCidr = `${rootNetwork}/${rootPrefix}`;
  const rows = [];

  function collectRows(cidr, depth = 0) {
    const node = getSubnetNode(cidr);
    const children = Object.keys(node).filter((k) => !k.startsWith("_"));
    const [addr, prefix] = cidr.split("/");

    rows.push({
      cidr,
      depth,
      note: node._note || "",
      contains: getSubnetCount(parseInt(prefix)),
    });

    children.sort(compareCIDR).forEach((childCidr) => {
      collectRows(childCidr, depth + 1);
    });
  }

  collectRows(rootCidr);

  let csv = "Subnet,Contains,Note\n";
  rows.forEach((row) => {
    const indent = "  ".repeat(row.depth);
    const subnet = indent + row.cidr;
    const note = row.note.replace(/"/g, '""');
    csv += `"${subnet}","${row.contains}","${note}"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `ipv6-subnet-plan-${rootNetwork}-${rootPrefix}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Populate the prefix select dropdown with options from /16 to /64
 * @returns {void}
 */
function populatePrefixSelect() {
  const select = document.getElementById("prefixSelect");
  for (let i = 16; i <= 64; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = "/" + i;
    select.appendChild(option);
  }
}

/**
 * Initialize the application
 * @returns {void}
 */
function init() {
  populatePrefixSelect();

  if (!loadState()) {
    document.getElementById("networkInput").value = "3fff::";
    document.getElementById("prefixSelect").value = "20";
    loadNetwork();
  }
}

document.addEventListener("DOMContentLoaded", init);
