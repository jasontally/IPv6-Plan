# Architecture Documentation

This document explains the core data structures, algorithms, and architecture of the IPv6 Subnet Planner.

**Copyright (c) 2024 Jason Tally and contributors** - SPDX-License-Identifier: MIT

## Overview

The IPv6 Subnet Planner is a single-file web application (HTML/CSS/JS) that allows users to hierarchically plan and document IPv6 address space allocations. The app works entirely in the browser with no backend.

## Data Structures

### Subnet Tree

The subnet tree is the core data structure representing the hierarchy of subnets.

**Type:** `Object<string, SubnetNode>`

**Keys:** CIDR notation strings (e.g., `"3fff::/24"`, `"2001:db8::/32"`)

**Values:** SubnetNode objects

```javascript
{
  _note: "",           // User-provided note string
  _color: "",          // Color code (hex or empty string)
  "3fff::/28": {       // Child subnet (if split)
    _note: "",
    _color: "",
    "3fff::/32": {...} // Grandchild (if further split)
  }
}
```

**Important Properties:**

- `_note` and `_color` are prefixed with underscore to distinguish from child keys
- Child keys are CIDR strings pointing to nested SubnetNode objects
- The tree is not balanced - subnets can be split independently at any level

### Global State

Three global variables track the application state:

```javascript
/** @type {string|null} */
let rootNetwork = null; // Root network address (compressed IPv6 string)

/** @type {number|null} */
let rootPrefix = null; // Root prefix length (16-64)

/** @type {Object<string, SubnetNode>} */
let subnetTree = {}; // The entire subnet hierarchy
```

## Key Algorithms

### IPv6 Address Parsing (`parseIPv6`)

Converts an IPv6 string (compressed or full) into a 16-byte array.

**Steps:**

1. Trim whitespace and convert to lowercase
2. Handle `::` compression by expanding zero groups
3. Split into colon-separated groups
4. Parse each 16-bit group to bytes
5. Return 16-byte `Uint8Array` or `null` if invalid

**Critical Details:**

- Supports both compressed (`2001:db8::1`) and full (`2001:db8:0:0:0:0:0:1`) notation
- Validates each group is a valid hex value (0-65535)
- Only rejects syntactically invalid addresses (permissive validation)

### IPv6 Address Formatting (`formatIPv6`)

Converts a 16-byte array to a compressed IPv6 string per RFC 5952.

**Steps:**

1. Convert 16 bytes to 8 x 16-bit groups
2. Find the longest consecutive run of zero groups
3. Compress that run with `::` (longest or leftmost if tie)
4. Format remaining groups as lowercase hex without leading zeros
5. Return compressed string

**Critical Details:**

- `::` only used for runs of 2+ zeros
- Single zero groups are not compressed
- Always uses lowercase hex
- Leading zeros in each group omitted

### Subnet Splitting (`splitSubnet`)

Divides a subnet into child subnets at the next nibble boundary (4-bit aligned).

**Nibble Alignment Logic:**

- If current prefix is already nibble-aligned (multiple of 4), split by adding 4 bits
  - `/20` → `/24` (creates 16 children)
  - `/24` → `/28` (creates 16 children)
- If not nibble-aligned, split to next nibble boundary
  - `/21` → `/24` (creates 8 children)
  - `/22` → `/24` (creates 4 children)
  - `/23` → `/24` (creates 2 children)

**Number of Children Formula:**

```
numChildren = 2^(nextNibble - currentPrefix)
```

**Steps:**

1. Parse CIDR to get address and prefix
2. Validate prefix < 64 (cannot split /64)
3. Calculate next nibble boundary and number of children
4. For each child index (0 to numChildren-1):
   - Use `getChildSubnet()` to calculate child address
   - Create child CIDR by appending new prefix
   - Add child to parent node in tree
5. Call `saveState()` and `render()`

**Critical Details:**

- Child addresses are calculated at the next nibble boundary
- For `/20` splitting to `/24`, the second child is `3fff:100::/24`, NOT `3fff:1000::/24`
- The increment is always at the nibble boundary position

### Child Subnet Calculation (`getChildSubnet`)

Calculates the address of a specific child subnet at the next nibble boundary.

**Steps:**

1. Calculate next nibble boundary (multiple of 4)
2. Convert 16-byte parent address to BigInt
3. Shift child index to the correct bit position
4. OR the shifted index with the parent address
5. Convert result back to 16-byte array

**Bit Positioning:**

```
shift = 128 - nextNibble
childAddress = parentAddress | (index << shift)
```

**Example:** Splitting `3fff::/20` to `/24`:

- nextNibble = 24
- shift = 128 - 24 = 104
- Child index 1: `3fff::` | (1 << 104) = `3fff:100::`

### Subnet Joining (`joinSubnet`)

Collapses all sibling subnets back into their parent network.

**Steps:**

1. Parse child CIDR to get address and current prefix
2. Calculate parent CIDR by masking address at target prefix
3. Remove all non-underscore keys from parent node
4. Call `saveState()` and `render()`

**Critical Details:**

- Destructive operation - removes all child annotations
- The parameter `cidr` is any child subnet used to identify the parent
- `targetPrefix` is the prefix length to join back to (an ancestor)

### Row Span Calculation

Used in `render()` to calculate `rowspan` for join buttons.

**Goal:** Make join buttons span all descendant rows visually.

**Steps:**

1. Traverse tree in-order to collect rows with ancestry information
2. For each row, track its ancestors (parent, grandparent, etc.)
3. For each ancestor level, count how many rows are descendants
4. Create mapping: `key = "${ancestorCidr}-${level}" → {row, count}`
5. Apply `rowspan=count` only on first descendant row

**Example:** After splitting `3fff::/20` → 16 `/24`s:

- All 16 rows have ancestor `3fff::/20` at level 0
- Join button on row 0 has `rowspan=16`
- No join buttons on rows 1-15

### CIDR Comparison (`compareCIDR`)

Compares two CIDR addresses numerically by their IPv6 address bytes.

**Steps:**

1. Extract address from each CIDR string
2. Parse both addresses to byte arrays
3. Compare byte-by-byte from index 0 to 15
4. Return negative/zero/positive for less/equal/greater

**Critical Details:**

- Compares numerically, NOT lexicographically as strings
- Ensures correct ordering: `3fff::/24` before `3fff:100::/24`
- Used when sorting children before rendering

### State Persistence

**Saving (`saveState`):**

1. Create state object: `{network, prefix, tree}`
2. Serialize to JSON
3. Encode as base64 (after URI encoding)
4. Set as URL hash

**Loading (`loadState`):**

1. Read URL hash
2. Decode from base64
3. Parse JSON
4. Restore `rootNetwork`, `rootPrefix`, `subnetTree`
5. Update input fields
6. Trigger `render()`

**Error Handling:**

- Returns `false` on parse errors (invalid hash)
- Caller handles fallback (load default network)

## Rendering Flow

1. Clear table body
2. If no root network, show empty state
3. Collect all rows via recursive `collectRows()`:
   - Include CIDR, depth, ancestry, note, color, prefix
   - Traverse tree in-order, sorting children with `compareCIDR`
4. Calculate rowspans for join buttons
5. Determine max ancestry depth for column count
6. Render each row:
   - Create `<tr>` with color background if set
   - Add subnet cell (with indentation based on depth)
   - Add contains cell (subnet count)
   - Add note input field
   - Add color button
   - Add split button (disabled if >= /64 or already split)
   - Add join buttons (one per ancestry level, with rowspan)
   - Attach event listeners
7. Update header colspan for join columns

## Event Handling

**User Actions → Function Calls:**

- Click "Go" → `loadNetwork()`
- Click "Split" → `splitSubnet(cidr)`
- Click "Join" → `joinSubnet(cidr, targetPrefix)`
- Note change → Update `node._note` → `saveState()`
- Click color → `showColorPicker(cidr, button)`
- Click color option → `setColor(color)` → `saveState()` → `render()`
- Click "Share" → `shareURL()`
- Click "Export CSV" → `exportCSV()`
- URL hash change → `loadState()`

**Auto-save:**

- All state-changing operations call `saveState()`
- This updates URL hash for sharing

## CSV Export

1. Collect all rows via recursive `collectRows()` (same as render)
2. Build CSV header: `"Subnet,Contains,Note"`
3. For each row:
   - Indent subnet by 2 spaces per depth
   - Escape fields (wrap in quotes, double quotes for internal quotes)
   - Append to CSV string
4. Create `Blob` with MIME type `text/csv;charset=utf-8;`
5. Create download link with filename: `ipv6-subnet-plan-{network}-{prefix}.csv`
6. Trigger download programmatically

## Color Palette

16 pastel colors for row highlighting:

```
#FFE5E5 (Soft Pink)      #E5F3FF (Sky Blue)
#E5FFE5 (Mint Green)     #FFF5E5 (Peach)
#F5E5FF (Lavender)       #E5FFFF (Cyan)
#FFFFE5 (Cream)          #FFE5F5 (Rose)
#E5F5FF (Ice Blue)       #F5FFE5 (Pale Lime)
#FFE5D5 (Apricot)        #E5E5FF (Periwinkle)
#FFEED5 (Sand)           #D5FFE5 (Seafoam)
#FFD5E5 (Blush)          #E5FFED (Aqua Mint)
```

## Important Invariants

1. **Prefix Range:** Only /16 to /64 are valid (enforced in `loadNetwork`)
2. **Minimum Subnet:** /64 cannot be split further
3. **Nibble Alignment:** All splits go to the next nibble boundary (multiple of 4)
4. **Address Sorting:** Children are sorted numerically by IPv6 address, not string
5. **RFC 5952 Compliance:** All addresses displayed in compressed form
6. **State Persistence:** URL hash always reflects current state
7. **Permissive Validation:** Any syntactically valid IPv6 address is accepted

## Common Pitfalls

1. **Wrong Child Count:** Calculate as `2^(nextNibble - currentPrefix)`, don't assume 16
2. **Wrong Address Increment:** Use nibble boundary, not full groups (`3fff:100::` not `3fff:1000::`)
3. **String Sorting:** Always use `compareCIDR()` for numerical sorting
4. **Missing Rowspan:** Join buttons must span all descendant rows
5. **Expanded Addresses:** Never display expanded form, always use `formatIPv6()`
6. **Over-validation:** Don't reject based on address type (GUA, ULA, link-local all valid)
