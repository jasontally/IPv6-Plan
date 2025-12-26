# AGENTS.md - LLM Working Instructions

This file contains guidance for LLM agents working on the IPv6 Subnet Planner codebase.

## Project Overview

This is a **single-file web application** (HTML/CSS/JS) for planning IPv6 address space allocations. The app has:
- No build process
- No external dependencies
- Works entirely in the browser
- State persisted in URL hash

**Update:** The codebase now has testing infrastructure with Vitest (unit tests) and Playwright (E2E tests). See the "Testing" section below for details.

## File Structure

```
v6calc/
├── index.html                    # Single file containing HTML and CSS
├── app.js                        # Application JavaScript (extracted from HTML)
├── README.md                     # User-facing documentation
├── ARCHITECTURE.md               # Technical architecture and algorithms
├── IPv6-Subnet-Split-Join-Implementation-Plan.md  # Original implementation plan
├── package.json                  # Project configuration and test scripts
├── vitest.config.js              # Vitest configuration for unit tests
├── playwright.config.js            # Playwright configuration for E2E tests
├── tests/
│   ├── ipv6.test.js            # Unit tests for IPv6 utilities
│   ├── subnet-tree.test.js       # Unit tests for tree operations
│   ├── state.test.js            # Unit tests for state management
│   └── e2e/
│       ├── split-join.spec.js    # E2E tests for split/join
│       └── url-export.spec.js     # E2E tests for URL/CSV
└── AGENTS.md                     # This file - LLM working instructions
```

## File Structure

```
v6calc/
├── index.html                    # Single file containing HTML, CSS, and JS
├── README.md                     # User-facing documentation
├── ARCHITECTURE.md               # Technical architecture and algorithms
├── IPv6-Subnet-Split-Join-Implementation-Plan.md  # Original implementation plan
└── AGENTS.md                     # This file - LLM working instructions
```

## Working with This Codebase

### Before Making Changes

1. **Read the relevant documentation:**
   - `ARCHITECTURE.md` - Understanding data structures and algorithms
   - This file (`AGENTS.md`) - Code conventions and testing

2. **Understand the single-file constraint:**
   - All code stays in `index.html`
   - Do not split into separate files unless explicitly requested
   - Do not introduce build tools or bundlers

3. **Verify the change is safe:**
   - Test the application manually after changes
   - No automated tests exist (this is a limitation)

### Code Conventions

#### JavaScript

- **Use modern ES6+ syntax:** arrow functions, const/let, template literals
- **Function declarations:** Use `function name()` for top-level functions (not const arrows)
- **JSDoc comments:** All functions must have JSDoc describing:
  - Purpose
  - Parameters with types
  - Return type
  - `@returns {void}` if no return value

```javascript
/**
 * Calculate the address of a child subnet
 * @param {Uint8Array} bytes - 16-byte array of parent address
 * @param {number} prefix - Current prefix length
 * @param {number} index - Child index (0-based)
 * @returns {Uint8Array} 16-byte array of child address
 */
function getChildSubnet(bytes, prefix, index) {
  // Implementation
}
```

- **Type hints:** Use JSDoc types even though it's plain JS
- **Variable naming:** camelCase for variables/parameters, PascalCase for constructor functions

#### HTML/CSS

- **Inline styles:** CSS is in `<style>` block in `<head>`
- **Class naming:** kebab-case (e.g., `subnet-cell`, `button-cell`)
- **IDs:** camelCase (e.g., `networkInput`, `tableBody`)
- **No external CSS files**

#### Data Structures

**Subnet Tree (global `subnetTree`):**
```javascript
{
  "3fff::/20": {
    _note: "",
    _color: "#FFE5E5",
    "3fff::/24": {
      _note: "Main data center",
      _color: "#E5F3FF",
      "3fff::/28": { _note: "", _color: "" }
    }
  }
}
```

**Important:**
- `_note` and `_color` are prefixed with underscore
- Child keys are CIDR strings pointing to nested objects
- Children are sorted numerically by IPv6 address, not string

## Critical Algorithms

### IPv6 Address Handling

**Always use these functions:**
- `parseIPv6(addr)` - Parse string to 16-byte Uint8Array
- `formatIPv6(bytes)` - Format bytes to compressed RFC 5952 string
- `applyPrefix(bytes, prefix)` - Mask to network address
- `compareCIDR(a, b)` - Numerically compare CIDR addresses

**Never:**
- Parse IPv6 manually
- Display expanded addresses (always use `formatIPv6`)
- Sort addresses as strings (use `compareCIDR`)

### Subnet Splitting

**Split calculation:**
```
nextNibble = (prefix % 4 === 0) ? prefix + 4 : Math.ceil(prefix / 4) * 4
numChildren = 2^(nextNibble - prefix)
```

**Example child addresses for `/20` split:**
- Child 0: `3fff::/24`
- Child 1: `3fff:100::/24` (note: `100`, not `1000`)
- Child 2: `3fff:200::/24`
- ...

**Always use `getChildSubnet(bytes, prefix, index)`** to calculate child addresses.

### Row Span Calculation

Join buttons must visually span all descendant rows:

1. Ancestor at level 0 appears in all rows that have `ancestry[0] === ancestorCidr`
2. Calculate count by iterating from first child until ancestry changes
3. Apply `rowspan=count` only on first row
4. Use key format: `${ancestorCidr}-${level}` for tracking

## Testing Strategy

The codebase now includes automated tests with Vitest (unit tests) and Playwright (E2E tests).

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

### Writing Tests

**Unit Tests Location:** `tests/*.test.js`

- `ipv6.test.js` - Tests for parseIPv6, formatIPv6, applyPrefix, compareCIDR
- `subnet-tree.test.js` - Tests for splitSubnet, joinSubnet, getSubnetNode, isSplit
- `state.test.js` - Tests for saveState, loadState, loadNetwork

**E2E Tests Location:** `tests/e2e/*.spec.js`

- `split-join.spec.js` - Tests for split, join operations, UI interactions
- `url-export.spec.js` - Tests for URL sharing, CSV export, download handling

### Manual Testing

Despite automated tests, manual testing is still recommended after changes:

1. Open `index.html` in a browser
2. Load a test network (e.g., `2001:db8::/32`)
3. Test split operations at various prefix levels
4. Test join operations
5. Test notes and color annotations
6. Test URL sharing (copy URL, open in new tab)
7. Test CSV export

2. **Common test cases:**
   - Split `/20` → 16 `/24`s
   - Split `/21` → 8 `/24`s
   - Split `/22` → 4 `/24`s
   - Split `/23` → 2 `/24`s
   - Verify addresses are sorted numerically
   - Verify join buttons have correct rowspan
   - Verify URL hash updates correctly
   - Verify load from URL hash works

3. **Edge cases:**
   - Try `/64` (should show "Host Subnet", split disabled)
   - Try non-nibble-aligned prefixes (`/21`, `/22`, `/23`)
   - Try various IPv6 address types (GUA, ULA, link-local)
   - Try compressed addresses (`2001:db8::1`)
   - Try invalid addresses (should show error)

## Validation Philosophy

**Permissive validation:**
- Accept any syntactically valid IPv6 address
- Do NOT reject based on address type (GUA, ULA, link-local, multicast all OK)
- Only reject:
  - Syntactically invalid strings
  - Prefix lengths outside /16 to /64 range

## Common Mistakes to Avoid

1. **Hardcoding 16 children:** Calculate as `2^(nextNibble - currentPrefix)`
2. **Wrong address increment:** Use nibble boundary (`3fff:100::/24` not `3fff:1000::/24`)
3. **String sorting:** Always use `compareCIDR()` for numerical sorting
4. **Expanded addresses:** Never show `3fff:0:0:0:0:0:0:0`, always use `formatIPv6()` to get `3fff::`
5. **Missing rowspan:** Join buttons must span all descendant rows
6. **Over-validation:** Don't reject valid IPv6 addresses
7. **Allowing /64 split:** /64 is minimum, split must be disabled
8. **Wrong button colors:**
   - Go: Purple (`#7C3AED`)
   - Share/Export: Teal (`#0891B2`)
   - Split: Green (`#059669`)
   - Join: Red (`#DC2626`)

## When Adding Features

1. **Maintain single-file architecture** - keep everything in `index.html`
2. **Add JSDoc comments** to new functions
3. **Update ARCHITECTURE.md** if changing data structures or algorithms
4. **Test thoroughly** - manual testing is the only way
5. **Consider URL persistence** - if adding state, update `saveState()`/`loadState()`

## Debugging Tips

- **Use browser DevTools** to inspect the subnet tree: `console.log(subnetTree)`
- **Check URL hash** to see if state is persisting correctly
- **Verify JSDoc types** - if VS Code shows type errors, they're likely real bugs
- **Test edge cases** - /64 boundary, non-nibble-aligned prefixes, compressed addresses

## Performance Considerations

- The tree is traversed on every `render()` call
- Large trees (hundreds of subnets) may be slow
- Consider debouncing render calls if performance is an issue

## Summary Checklist for Changes

- [ ] Read ARCHITECTURE.md for context
- [ ] Added JSDoc comments to new/modified functions
- [ ] Tested manually in browser
- [ ] Run unit tests: `npm test`
- [ ] Run E2E tests: `npm test:e2e`
- [ ] Verified URL sharing works (if state changed)
- [ ] Verified CSV export (if relevant)
- [ ] Updated documentation (if API/architecture changed)
- [ ] Did not introduce external dependencies
- [ ] Did not split files (kept single HTML file)
