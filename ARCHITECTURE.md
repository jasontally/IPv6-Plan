# Architecture Documentation

This document explains the core data structures, algorithms, and architecture of the IPv6 Subnet Planner.

**Copyright (c) 2025 Jason Tally and contributors** - SPDX-License-Identifier: MIT

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

Divides a subnet into child subnets at a specified target prefix, creating intermediate levels at nibble boundaries when necessary.

**Nibble Alignment Logic:**

- If target is nibble-aligned (multiple of 4), splits to that level directly
  - `/20` → `/24` (creates 16 children)
  - `/24` → `/28` (creates 16 children)
- If target crosses nibble boundaries, creates intermediate levels
  - `/20` → `/28` (creates 16 `/24`s, then 256 `/28`s - 273 rows total)
  - `/20` → `/30` (creates `/24 → /28 → /30` hierarchy - 1297 rows total)
- If not nibble-aligned, splits to next nibble boundary
  - `/21` → `/24` (creates 8 children)
  - `/22` → `/24` (creates 4 children)
  - `/23` → `/24` (creates 2 children)

**Number of Children Formula:**

```
numChildren = 2^(targetPrefix - currentPrefix)
```

**Steps:**

1. Parse CIDR to get address and prefix
2. Validate prefix < 64 (cannot split /64)
3. Determine target prefix (nibble-aligned by default)
4. Calculate nibble boundaries between current and target prefix
5. If single boundary at target, create children directly
6. If multiple boundaries, call `createIntermediateLevels()` to build hierarchy
7. Call `saveState()` and `render()`

**Critical Details:**

- Child addresses are calculated at the target prefix level using `getChildSubnetAtTarget()`
- For `/20` splitting to `/24`, the second child is `3fff:100::/24`, NOT `3fff:1000::/24`
- Intermediate levels inherit parent `_note` and `_color` to all descendants
- Splitting with custom target prefixes is supported (e.g., `/32 → /34`)

### Child Subnet Calculation (`getChildSubnetAtTarget`)

Calculates the address of a specific child subnet at a custom target prefix.

**Steps:**

1. Convert 16-byte parent address to BigInt
2. Calculate shift: `128 - targetPrefix`
3. Shift child index to the correct bit position
4. Add shifted index to the parent address
5. Convert result back to 16-byte array

**Bit Positioning:**

```
shift = 128 - targetPrefix
childAddress = parentAddress + (index << shift)
```

**Example:** Splitting `3fff::/20` to `/24`:

- targetPrefix = 24
- shift = 128 - 24 = 104
- Child index 1: `3fff::` + (1 << 104) = `3fff:100::`

### Nibble Boundary Calculation (`getNibbleBoundaries`)

Calculates intermediate nibble boundaries between two prefix lengths.

**Steps:**

1. If `startPrefix >= endPrefix`, return `[startPrefix]`
2. Calculate first nibble boundary: `Math.ceil(startPrefix / 4) * 4`
3. Add boundaries in steps of 4 until reaching `endPrefix`
4. Include `endPrefix` even if not nibble-aligned

**Examples:**

- `getNibbleBoundaries(20, 28)` → `[24, 28]`
- `getNibbleBoundaries(20, 30)` → `[24, 28, 30]`
- `getNibbleBoundaries(24, 24)` → `[24]`
- `getNibbleBoundaries(21, 28)` → `[24, 28]`

### Intermediate Level Creation (`createIntermediateLevel`)

Creates one level of child subnets under a parent, inheriting parent's note and color.

**Steps:**

1. Parse parent CIDR to get address and prefix
2. Validate `targetPrefix > currentPrefix`
3. Calculate number of children: `2^(targetPrefix - currentPrefix)`
4. For each child index (0 to numChildren-1):
   - Use `getChildSubnetAtTarget()` to calculate child address
   - Create child node with inherited `_note` and `_color`
   - Add child to parent node in tree
5. Return array of created child CIDRs

**Critical Details:**

- Creates child nodes both in `subnetTree` and under parent
- Inherits parent metadata to all children
- Returns array of CIDRs for further processing

### Recursive Intermediate Level Creation (`createIntermediateLevels`)

Creates all intermediate levels between parent and target prefix recursively.

**Steps:**

1. Calculate nibble boundaries using `getNibbleBoundaries()`
2. If single boundary, call `createIntermediateLevel()` directly
3. If multiple boundaries:
   - Create first level using `createIntermediateLevel()`
   - For each child, recursively call to create next level
   - Continue until target prefix is reached
4. Return array of all created child CIDRs

**Example:** `/20 → /30`:

1. Boundaries: `[24, 28, 30]`
2. Create 16 `/24`s under `/20`
3. For each `/24`, create 16 `/28`s
4. For each `/28`, create 4 `/30`s
5. Total: 1 + 16 + 256 + 1024 = 1297 rows

### Subnet Joining (`joinSubnet`)

Collapses all sibling subnets back into their parent network, recursively deleting all descendants.

**Steps:**

1. Parse child CIDR to get address and current prefix
2. Calculate parent CIDR by masking address at target prefix
3. Call `deleteDescendants(parentCidr)` to recursively remove all descendants
4. Call `saveState()` and `render()`

**Critical Details:**

- Destructive operation - removes all child and descendant annotations
- The parameter `cidr` is any child subnet used to identify the parent
- `targetPrefix` is the prefix length to join back to (an ancestor)
- Uses `deleteDescendants()` to handle multi-level deletions (e.g., `/20` with `/24`s that have `/28`s)

### Recursive Descendant Deletion (`deleteDescendants`)

Recursively deletes all children and grandchildren from a subnet node.

**Steps:**

1. Get the node for the given CIDR
2. Find all child keys (non-underscore keys)
3. For each child:
   - Recursively call `deleteDescendants(childCidr)`
   - Remove child reference from parent node
   - Remove child node from `subnetTree`
4. Returns nothing (modifies tree in place)

**Critical Details:**

- Does not delete the node itself, only descendants
- Required for `joinSubnet()` when intermediate levels exist
- Ensures clean deletion of entire subtree

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
- Click "Split" → `splitSubnet(cidr, targetPrefix)`
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

## Accessibility Implementation

The application is designed to meet WCAG 2.1 Level AA accessibility standards.

### Screen Reader Support

**ARIA Labels:**

- All interactive elements have descriptive `aria-label` attributes
- Buttons include context (e.g., "Split 3fff::/24 into smaller subnets")
- Color buttons indicate current color selection
- Split select dropdowns identify their associated subnet

**Semantic Labels:**

- Form inputs have proper `<label>` elements
- Labels use `.sr-only` class to hide visually while keeping accessible
- Never rely on placeholder text as labels (WCAG violation)

**ARIA Roles:**

- Color picker dialog uses `role="dialog"` with `aria-modal="true"`
- Color options use `role="button"` with `tabindex="0"` for keyboard access
- Table structure uses semantic `<th>` and `<td>` elements

### Keyboard Navigation

**Focus Management:**

- All interactive elements are keyboard focusable
- Color picker options support Enter and Space key activation
- Focus indicators provide clear visual feedback

**Key Handlers:**

- Split buttons work with Enter/Space
- Join buttons work with Enter/Space
- Color picker options: Enter/Space to select, Escape to close
- Outside click closes color picker (handled in timeout listener)

### Visual Accessibility

**Color Contrast:**

- Text meets WCAG AA minimum contrast ratios
- Focus states provide visual indicators (default browser outline or custom styles)

**Screen Reader Only Class:**

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### Accessibility Guidelines for Future Changes

When adding or modifying UI components:

1. **Always add ARIA labels** to interactive elements
2. **Use `<label>` elements** for form inputs (not placeholder)
3. **Ensure keyboard navigation** works for all features
4. **Use semantic HTML** elements (`<button>`, `<input>`, not `<div>` with click handlers)
5. **Test with screen reader** when adding new components
6. **Maintain focus management** in dialogs/modals
7. **Provide visual feedback** for keyboard focus
8. **Avoid color-only** indicators for information (add text or patterns)
9. **Use ARIA roles** appropriately (e.g., `role="dialog"` for modals)
10. **Include descriptive text** for all actions (not just icons)

## Important Invariants

1. **Prefix Range:** Only /16 to /64 are valid (enforced in `loadNetwork`)
2. **Minimum Subnet:** /64 cannot be split further
3. **Nibble Alignment:** Splits can specify custom target prefixes; intermediate levels created at nibble boundaries when needed
4. **Address Sorting:** Children are sorted numerically by IPv6 address, not string
5. **RFC 5952 Compliance:** All addresses displayed in compressed form
6. **State Persistence:** URL hash always reflects current state
7. **Permissive Validation:** Any syntactically valid IPv6 address is accepted
8. **Accessibility Compliance:** UI meets WCAG 2.1 Level AA standards

## Common Pitfalls

## Testing

The codebase now includes comprehensive automated tests with Vitest (unit tests) and Playwright (E2E tests).

### Running Tests

**Unit Tests (Vitest):**

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm test:ui

# Run tests once and exit
npm test:run
```

**E2E Tests (Playwright):**

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm test:e2e

# Run E2E tests in UI mode
npm test:e2e:ui

# Run E2E tests in headed mode (visible browser)
npm test:e2e:headed
```

### Test Files

**Unit Tests Location:** `tests/*.test.js`

- `ipv6.test.js` - Tests for parseIPv6, formatIPv6, applyPrefix, compareCIDR
- `subnet-tree.test.js` - Tests for splitSubnet, joinSubnet, getSubnetNode, isSplit
- `state.test.js` - Tests for saveState, loadState, loadNetwork
- `create-intermediate-level.test.js` - Tests for createIntermediateLevel function
- `create-intermediate-levels.test.js` - Tests for createIntermediateLevels function
- `delete-descendants.test.js` - Tests for deleteDescendants function
- `nibble-boundaries.test.js` - Tests for getNibbleBoundaries function
- `create-intermediate-extra.test.js` - Tests for additional intermediate level scenarios

**E2E Tests Location:** `tests/e2e/*.spec.js`

- `split-join.spec.js` - Tests for split, join operations, UI interactions
- `url-export.spec.js` - Tests for URL sharing, CSV export, download handling
- `initialization.spec.js` - E2E tests for app initialization
- `error-scenarios.spec.js` - E2E tests for error handling
- `accessibility.spec.js` - E2E tests for accessibility
- `stress.spec.js` - E2E tests for large trees
- `color-picker.spec.js` - E2E tests for color picker functionality
- `subnet-math.spec.js` - E2E tests for subnet math visual verification

### Test Coverage

The test suite provides comprehensive coverage of:

1. **Core IPv6 Math Operations**
   - Parsing various address formats (compressed, full, edge cases)
   - Formatting with RFC 5952 compression
   - Prefix masking at various boundary conditions
   - Numerical comparison of CIDR addresses
   - Child subnet calculation (nibble-aligned, non-nibble-aligned, custom targets)

2. **Tree Operations**
   - Node creation and retrieval
   - Split and join operations
   - Metadata inheritance (notes and colors)
   - Multi-level tree structures
   - Intermediate level creation

3. **State Management**
   - State persistence (save/load)
   - URL hash encoding/decoding
   - Network loading and validation
   - Error handling

4. **End-to-End (E2E) Tests**
   - UI interactions
   - Visual verification of subnet math
   - URL sharing functionality
   - CSV export functionality
   - Color picker functionality
   - Error scenario handling
   - Accessibility compliance
   - Performance with large trees

### Verification

All IPv6 subnetting math has been verified against the `ip6addr` library, confirming correct behavior for:

- IPv6 address parsing and formatting
- Prefix masking operations
- CIDR comparison and sorting
- Child subnet calculation
- Sequential address generation

### Common Pitfalls

1. **Wrong Child Count:** Calculate as `2^(targetPrefix - currentPrefix)`, don't assume 16
2. **Wrong Address Increment:** Use nibble boundary, not full groups (`3fff:100::` not `3fff:1000::`)
3. **String Sorting:** Always use `compareCIDR()` for numerical sorting
4. **Missing Rowspan:** Join buttons must span all descendant rows
5. **Expanded Addresses:** Never display expanded form, always use `formatIPv6()`
6. **Over-validation:** Don't reject based on address type (GUA, ULA, link-local all valid)
7. **Not Creating Intermediate Levels:** Splits crossing nibble boundaries must use `createIntermediateLevels()` (e.g., `/20 → /28` creates `/24` intermediates)
