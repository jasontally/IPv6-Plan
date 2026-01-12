# AGENTS.md - LLM Working Instructions

This file contains guidance for LLM agents working on the IPv6 Subnet Planner codebase.

**Copyright (c) 2025 Jason Tally and contributors** - SPDX-License-Identifier: MIT

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
├── AGENTS.md                     # This file - LLM working instructions
├── package.json                  # Project configuration and test scripts
├── vitest.config.js              # Vitest configuration for unit tests
├── playwright.config.js            # Playwright configuration for E2E tests
└── tests/
    ├── ipv6.test.js            # Unit tests for IPv6 utilities
    ├── subnet-tree.test.js       # Unit tests for tree operations
    ├── state.test.js            # Unit tests for state management
    └── e2e/
        ├── split-join.spec.js    # E2E tests for split/join
        ├── url-export.spec.js     # E2E tests for URL/CSV
        ├── initialization.spec.js  # E2E tests for app initialization
        ├── error-scenarios.spec.js  # E2E tests for error handling
        ├── accessibility.spec.js  # E2E tests for accessibility
        └── stress.spec.js       # E2E tests for large trees
```

## Working with This Codebase

### Before Making Changes

1.  **Read the relevant documentation:**
    - `ARCHITECTURE.md` - Understanding data structures and algorithms
    - This file (`AGENTS.md`) - Code conventions and testing

2.  **Understand the single-file constraint:**
    - All code stays in `index.html`
    - Do not split into separate files unless explicitly requested
    - Do not introduce build tools or bundlers 3. **Verify the change is safe:**
      - Test the application manually after changes
      - Run automated tests: `npm test` and `npm run test:e2e`

      ### Writing Tests

**Unit Tests Location:** `tests/*.test.js`

- `ipv6.test.js` - Tests for parseIPv6, formatIPv6, applyPrefix, compareCIDR
- `subnet-tree.test.js` - Tests for splitSubnet, joinSubnet, getSubnetNode, isSplit
- `state.test.js` - Tests for saveState, loadState, loadNetwork
- `create-intermediate-level.test.js` - Tests for createIntermediateLevel function
- `create-intermediate-levels.test.js` - Tests for createIntermediateLevels function
- `create-intermediate-extra.test.js` - Tests for additional intermediate level scenarios
- `delete-descendants.test.js` - Tests for deleteDescendants function
- `nibble-boundaries.test.js` - Tests for getNibbleBoundaries function

**E2E Tests Location:** `tests/e2e/*.spec.js`

- `split-join.spec.js` - Tests for split, join operations, UI interactions
- `url-export.spec.js` - Tests for URL sharing, CSV export, download handling
- `initialization.spec.js` - E2E tests for app initialization
- `error-scenarios.spec.js` - E2E tests for error handling
- `accessibility.spec.js` - E2E tests for accessibility
- `stress.spec.js` - E2E tests for large trees
- `color-picker.spec.js` - E2E tests for color picker functionality
- `subnet-math.spec.js` - E2E tests for subnet math visual verification (split displays, sequential addresses, format correctness)

### Accessibility Requirements

**All UI changes must meet WCAG 2.1 Level AA standards.**

**Mandatory for all interactive elements:**

1. **ARIA labels** - Every button and interactive element must have descriptive `aria-label`:

   ```javascript
   const button = document.createElement("button");
   button.ariaLabel = `Split ${cidr} into smaller subnets`;
   ```

2. **Form labels** - Use `<label>` elements (never placeholder-only):

   ```javascript
   const label = document.createElement("label");
   label.className = "sr-only";
   label.textContent = `Note for ${cidr}`;
   label.htmlFor = `note-${cidr}`;
   ```

3. **Semantic HTML** - Use proper elements (`<button>`, `<input>`, not `<div>`):

   ```javascript
   // Good
   const button = document.createElement("button");
   button.addEventListener("click", handleClick);

   // Bad
   const div = document.createElement("div");
   div.addEventListener("click", handleClick);
   div.setAttribute("role", "button");
   ```

4. **Keyboard support** - All interactions must work via keyboard:
   - Enter/Space to activate buttons
   - Tab to navigate between controls
   - Escape to close dialogs/modals

5. **ARIA roles** - Use appropriate roles for non-standard elements:

   ```javascript
   dialog.setAttribute("role", "dialog");
   dialog.setAttribute("aria-modal", "true");
   ```

6. **Focus management** - Provide visual feedback for keyboard focus:
   - Don't remove default browser outline
   - Or provide custom focus styles in CSS

**Accessibility Testing Checklist:**

- [ ] All buttons have `aria-label` with context
- [ ] All form inputs have `<label>` elements
- [ ] All interactive elements are keyboard focusable
- [ ] Tab order follows logical visual flow
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA (4.5:1 for normal text)
- [ ] No color-only indicators for information
- [ ] Dynamic content changes are announced to screen readers

### Manual Testing

Despite automated tests, manual testing is still recommended after changes:

1. Open `index.html` in a browser
2. Load a test network (e.g., `2001:db8::/32`)
3. Test split operations at various prefix levels
4. Test join operations
5. Test notes and color annotations
6. Test URL sharing (copy URL, open in new tab)
7. Test CSV export

8. **Common test cases:**
   - Split `/20` → 16 `/24`s
   - Split `/21` → 8 `/24`s
   - Split `/22` → 4 `/24`s
   - Split `/23` → 2 `/24`s
   - Verify addresses are sorted numerically
   - Verify join buttons have correct rowspan
   - Verify URL hash updates correctly
   - Verify load from URL hash works

9. **Edge cases:**
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
9. **Not handling intermediate levels:** `/20 → /28` creates `/24` intermediates, use `createIntermediateLevels()`

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
- [ ] Checked accessibility requirements (if UI changed):
  - [ ] ARIA labels on all interactive elements
  - [ ] Form labels for all inputs
  - [ ] Keyboard navigation works
  - [ ] Focus indicators visible
  - [ ] Color contrast meets WCAG AA
