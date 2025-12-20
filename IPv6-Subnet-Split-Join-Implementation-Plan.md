# IPv6 Subnet Planner - Implementation Plan

## Overview
Build a **static, single-file HTML/CSS/JS web application** for IPv6 subnet planning with visual split/join operations. The primary workflow is hierarchically dividing address space and annotating allocations.

## Core Requirements

### Functional Requirements
- Accept any valid IPv6 address (GUA, ULA, link-local, multicast, documentation prefixes)
- Default to RFC 9637 documentation prefix: `3fff::/20`
- Allow prefix lengths from /16 to /64 (any value, not just nibble boundaries)
- **Initial prefix flexibility**: Accept non-nibble-aligned allocations (e.g., /21, /23, /47) to match real-world ISP assignments
- **Split** subnets to the next nibble boundary (4-bit aligned), creating 2-16 child subnets depending on current prefix
  - Example: /21 splits into 8 /24 subnets, /20 splits into 16 /24 subnets
- **Join** sibling subnets back into their parent
- /64 is the minimum subnet size (cannot split further)
- Display subnet counts: show /48 count for prefixes < /48, show /64 count for prefixes >= /48
- Support notes and color annotations per subnet for allocation tracking
- Shareable URLs via compressed state in URL hash
- **CSV Export**: Export current subnet hierarchy to CSV with subnet, contains, and note columns

### Non-Functional Requirements
- Single HTML file with embedded CSS and JS (or minimal separate files)
- No build process or heavy frameworks
- Must work offline once loaded
- Clean, minimal spreadsheet-style UI

## Address Display: Hexadecimal with RFC 5952 Compression

**All subnet addresses must be displayed in compressed hexadecimal notation:**

| Stored Value | Correct Display | Incorrect Display |
|--------------|-----------------|-------------------|
| Full form | `3fff::` | `3fff:0:0:0:0:0:0:0` |
| Full form | `2001:db8::1` | `2001:db8:0:0:0:0:0:1` |
| Full form | `fe80::1` | `fe80:0:0:0:0:0:0:1` |

**Rules:**
- Use lowercase hexadecimal characters
- Compress the longest run of consecutive zero groups with `::`
- Only one `::` per address (choose the longest or leftmost run if tied)
- Leading zeros in each group are omitted (`0db8` becomes `db8`)

## Split/Join Operations

The core interaction model centers on splitting subnets to plan allocations and joining them back when reorganizing.

### Split Operation

Clicking Split on a subnet divides it into child subnets at the next nibble boundary.

**For nibble-aligned prefixes** (multiples of 4), splits create 16 children by adding 4 bits:

| Split From | First Child | Second Child | ... | 16th Child |
|------------|-------------|--------------|-----|------------|
| `3fff::/20` | `3fff::/24` | `3fff:100::/24` | ... | `3fff:f00::/24` |
| `3fff:100::/24` | `3fff:100::/28` | `3fff:110::/28` | ... | `3fff:1f0::/28` |
| `2001:db8::/32` | `2001:db8::/36` | `2001:db8:1000::/36` | ... | `2001:db8:f000::/36` |
| `2001:db8::/48` | `2001:db8::/52` | `2001:db8:0:1000::/52` | ... | `2001:db8:0:f000::/52` |

**For non-nibble-aligned prefixes**, splits create 2^n children where n = (next nibble boundary - current prefix):

| Split From | Children | First Child | Second Child | ... | Last Child |
|------------|----------|-------------|--------------|-----|------------|
| `3fff::/21` | 8 /24s | `3fff::/24` | `3fff:100::/24` | ... | `3fff:700::/24` |
| `3fff::/22` | 4 /24s | `3fff::/24` | `3fff:100::/24` | `3fff:200::/24` | `3fff:300::/24` |
| `3fff::/23` | 2 /24s | `3fff::/24` | `3fff:100::/24` | - | - |
| `2001:db8::/47` | 2 /48s | `2001:db8::/48` | `2001:db8:1::/48` | - | - |

**Critical:** When splitting `3fff::/20`, the second subnet is `3fff:100::/24`, NOT `3fff:1000::/24`. The increment is always at the nibble boundary (the 6th nibble for /20→/24).

### Join Operation

Clicking Join collapses all sibling subnets back into their parent, discarding any child annotations.

**Join buttons appear on the first row of a split group** and show the target prefix length to join back to.

### Button Behavior

1. **Split Button**: 
   - For nibble-aligned prefixes: Displays the current prefix (e.g., `/20`)
   - For non-nibble-aligned: Displays arrow to target (e.g., `→/24` for a /21)
   - Tooltip shows number of children that will be created
   - Clicking splits into children at next nibble boundary
2. **Join Buttons**: Appear on the first subnet of each split group. Display the TARGET prefix length to rejoin to (e.g., `/20` to merge /24s back).
3. **Multiple Join Levels**: After nested splits, multiple join buttons appear for each ancestor level.

### Visual Layout

Split and Join buttons occupy columns on the right side of the table. Join buttons use `rowspan` to visually span all rows they would collapse.

**Example: Starting with `3fff::/20`, after one split:**

```
| Network         | Contains | Note  | Split | Join |
|-----------------|----------|-------|-------|------|
| 3fff::/24       | 256 /48s | ...   | /24   | /20  |  <- Join spans all 16 rows
| 3fff:100::/24   | 256 /48s | ...   | /24   |      |
| 3fff:200::/24   | 256 /48s | ...   | /24   |      |
| ...             | ...      | ...   | ...   |      |
| 3fff:f00::/24   | 256 /48s | ...   | /24   |      |
```

**After splitting the first /24:**

```
| Network           | Contains | Note  | Split | Join | Join |
|-------------------|----------|-------|-------|------|------|
| 3fff::/28         | 16 /48s  | ...   | /28   | /24  | /20  |
| 3fff:10::/28      | 16 /48s  | ...   | /28   |      |      |
| ...               | ...      | ...   | ...   |      |      |
| 3fff:f0::/28      | 16 /48s  | ...   | /28   |      |      |
| 3fff:100::/24     | 256 /48s | ...   | /24   |      |      |
| ...               | ...      | ...   | ...   |      |      |
```

### Row Spanning Logic

When rendering join buttons:
1. Identify which row is the "first" child of each split group (shares network address with parent)
2. Calculate how many visible descendant rows exist under each ancestor
3. Set `rowspan` accordingly so the join button visually spans all affected rows

### Split/Join Button Styling

- **Split buttons**: Green background (`#059669`) - represents creating/adding new subnets
- **Join buttons**: Red background (`#DC2626`) - represents removing/collapsing subnets (destructive action)
- **Join button spacing**: Horizontal margin between join buttons to prevent them running together
- **Disabled state**: Reduced opacity for /64 subnets (cannot split further)
- **Text orientation**: Vertical text inside buttons for compact display
- **Button layout**: Join buttons use `rowspan` and fill 100% height to span all descendant rows

## Input Handling

### Validation Philosophy: Permissive

Accept any syntactically valid IPv6 address. Do NOT reject addresses based on:
- Address type (GUA, ULA, link-local, loopback, multicast all valid)
- Whether it "looks like" a network address
- Custom pattern matching

**Only reject:**
- Syntactically invalid IPv6 strings
- Prefix lengths outside /16 to /64 range

## State Management

### Data Structure

Use a nested tree where:
- Keys are CIDR strings (e.g., `3fff::/24`)
- Leaf nodes contain `_note` and `_color` properties
- Non-leaf nodes contain child subnet keys

### Subnet Sorting

**Critical**: Child subnets must be sorted by numeric IPv6 address value, NOT lexicographically as strings.

- Create `compareCIDR(a, b)` function that parses IPv6 addresses to byte arrays and compares numerically
- Use this when sorting children before rendering
- Ensures correct order: `3fff::/24`, `3fff:100::/24`, `3fff:200::/24`, ... NOT `3fff::/24` after `3fff:900::/24`

### URL Sharing

Encode the complete subnet tree state into a compressed URL hash. When loading, decode and restore:
- Root network
- All splits (tree structure)
- All notes and colors

### CSV Export

Export functionality:
- Includes Subnet, Contains, and Note columns
- Adds indentation (spaces) to subnet column to show hierarchy depth
- Properly escapes CSV fields (commas and quotes)
- Filename format: `ipv6-subnet-plan-{network}-{prefix}.csv`

## Subnet Count Display

| Prefix Range | Display |
|--------------|---------|
| /16 to /44 | Number of /48s contained |
| /48 to /60 | Number of /64s contained |
| /64 | "Host Subnet" |

## User Interface

### Main Elements

1. **Input Form**: Network address field, prefix length dropdown (/16 to /64, all values), Go button, Share button, Export CSV button, Quick Load buttons
2. **Subnet Table**: Network (hex), Contains count, Note field, Color button, Split/Join buttons
3. **Color Picker**: Click color button to show palette popup for row highlighting (16 colors)
4. **Share Button**: Copy shareable URL to clipboard
5. **Export CSV Button**: Download current subnet plan as CSV file
6. **Quick Load Buttons**: One-click loading of documentation prefixes (3fff::/20, 2001:db8::/32)
7. **Footer**: Credits, author info, and tool documentation

### Button Colors

- **Go Button**: Purple (`#7C3AED`) - Primary action
- **Share/Export Buttons**: Teal/Cyan (`#0891B2`) - Secondary actions
- **Split Button**: Green (`#059669`) - Create/add subnets
- **Join Button**: Red (`#DC2626`) - Remove/collapse subnets

### Table Columns

| Column | Content |
|--------|---------|
| Subnet | Compressed hex address with prefix (e.g., `3fff::/24`) |
| Contains | Count of /48s or /64s, or "Host Subnet" |
| Note | Editable text field for allocation notes |
| Color | Button to open color picker for row highlighting |
| Split | Button showing current prefix, initiates split |
| Join | Button(s) showing target prefix, collapses to parent (multiple columns for nested splits) |

### Color Palette (16 colors for row highlighting)

```
#FFE5E5  Soft Pink      #E5F3FF  Sky Blue       #E5FFE5  Mint Green     #FFF5E5  Peach
#F5E5FF  Lavender       #E5FFFF  Cyan           #FFFFE5  Cream          #FFE5F5  Rose
#E5F5FF  Ice Blue       #F5FFE5  Pale Lime      #FFE5D5  Apricot        #E5E5FF  Periwinkle
#FFEED5  Sand           #D5FFE5  Seafoam        #FFD5E5  Blush          #E5FFED  Aqua Mint
```

All colors are light/pastel shades with good text readability and visual distinction.

## Footer Content

### Section 1: About This Tool
- Brief description of purpose: hierarchically divide IPv6 address space
- Key features (concise bullets):
  - Nibble-aligned splitting (4-bit boundaries, 2-16 children depending on current prefix)
  - Prefix range /16 to /64 (accepts non-nibble-aligned initial prefixes), with /64 as minimum
  - Planning-focused counts: Shows /48s (typical location size) for prefixes < /48, shows /64s (minimum subnet size) for prefixes ≥ /48
  - Visual hierarchy with rowspan buttons
  - Annotations (notes and colors)
  - Shareable URLs with complete state
  - Quick-load buttons for documentation prefixes

### Section 2: Author Credit
"This tool was made by [Jason Tally](https://JasonTally.com) with the help of [opencode.ai](https://opencode.ai/) and Claude."

### Section 3: Credits
- Link to [Caesar Kabalan's](https://www.caesarkabalan.com/) [IPv4 Visual Subnet Calculator](https://visualsubnetcalc.com/)
- Link to [davidc's](https://www.davidc.net/) [original IPv4 subnet calculator](https://www.davidc.net/sites/default/subnets/subnets.html)

## Verification Checklist

Before considering implementation complete, verify:

- [ ] `3fff::` displays in compressed hex (NOT expanded form)
- [ ] Splitting `3fff::/20` produces `3fff::/24`, `3fff:100::/24`, etc. (16 children)
- [ ] Splitting `3fff::/21` produces 8 /24 subnets (not 16)
- [ ] Splitting `3fff::/22` produces 4 /24 subnets
- [ ] Splitting `3fff::/23` produces 2 /24 subnets
- [ ] Splitting `3fff:100::/24` produces `3fff:100::/28`, `3fff:110::/28`, etc.
- [ ] Subnets are sorted numerically (not lexicographically as strings)
- [ ] Split button shows current prefix for nibble-aligned (e.g., `/20`) or arrow for non-aligned (e.g., `→/24`)
- [ ] Split button tooltip shows number of children to be created
- [ ] Join button shows target prefix (e.g., `/20` to join /24s back)
- [ ] Join buttons use rowspan to span all affected rows (full height)
- [ ] Join buttons have spacing between them (not running together)
- [ ] Multiple join buttons appear for nested hierarchy levels
- [ ] /64 subnets show "Host Subnet" and Split button is disabled
- [ ] Subnet counts display correctly (/48 counts vs /64 counts)
- [ ] All IPv6 address types accepted: GUA, ULA, link-local, multicast, documentation
- [ ] URL sharing preserves complete state including splits, notes, and colors
- [ ] CSV export works with proper formatting and indentation
- [ ] Color picker shows 16 distinct colors (not similar to reference tools)
- [ ] Button colors: Go (purple), Share/Export (teal), Split (green), Join (red)
- [ ] Footer content displays correctly with all three sections

## Common Mistakes to Avoid

1. **Expanded hex display**: Never show `3fff:0:0:0:0:0:0:0` - always compress to `3fff::`
2. **Wrong split increment**: `3fff:1000::` is WRONG; `3fff:100::` is CORRECT for splitting /20 to /24
3. **Wrong number of children**: /21 must create 8 children (not 16), /22 creates 4, /23 creates 2
4. **Hardcoding 16 children**: Calculate children as 2^(nextNibble - currentPrefix)
5. **String sorting**: Subnets must be sorted numerically by IPv6 address bytes, NOT lexicographically as strings
6. **Over-validation**: Accept all valid IPv6 addresses and prefix lengths /16-/64 (not just multiples of 4)
7. **Wrong button labels**: Split shows current prefix for nibble-aligned or `→/target` for non-aligned, Join shows TARGET prefix
8. **Missing rowspan**: Join buttons must visually span all descendant rows with `height: 100%`
9. **Join buttons touching**: Add horizontal margins/padding between join button columns
10. **Allowing /64 split**: /64 is the minimum - split must be disabled
11. **Similar colors to reference tools**: Use completely fresh color palette (16 distinct pastel colors)
12. **Wrong button colors**: Don't use green for Go or blue for Split/Join - use specified colors
