# IPv6 Subnet Planner

A web-based tool for hierarchically planning and documenting IPv6 address space allocations.

## **[Try the Live App](https://v6plan.jasontally.com/)**

![IPv6 Subnet Planner](https://img.shields.io/badge/IPv6-Subnet%20Planner-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

This tool helps network engineers and administrators plan IPv6 address space by visually splitting and organizing subnets. It's designed around the concept of nibble-aligned (4-bit boundary) subnet planning, making it easy to hierarchically divide address space and document allocations.

## Features

- **Flexible Initial Prefix**: Accepts any prefix length from /16 to /64, including non-nibble-aligned allocations (e.g., /21, /23, /47) to match real-world RIR assignments
- **Nibble-Aligned Splitting**: All subnets split to the next 4-bit boundary, creating 2-16 child subnets depending on the current prefix
  - /20 → 16 /24 subnets, /21 → 8 /24 subnets, /22 → 4 /24 subnets, /23 → 2 /24 subnets
- **Prefix Range**: Supports /16 to /64 prefix lengths, with /64 as the minimum assignable subnet
- **Location-Based Planning**: Shows count of /48s (typical site/location size) for large allocations and /64s (minimum subnet size) for location-specific planning
- **Visual Hierarchy**: Join buttons span multiple rows to clearly show parent-child subnet relationships
- **Annotations**: Add notes and color-code subnets to document allocations and assignments
- **Shareable URLs**: Complete planning state is encoded in the URL for easy sharing with colleagues
- **CSV Export**: Download your subnet plan as a CSV file with proper hierarchy indentation
- **RFC 5952 Compliance**: All IPv6 addresses displayed in proper compressed notation
- **Quick Load**: One-click loading of common documentation prefixes (3fff::/20, 2001:db8::/32)

## Usage

### Getting Started

1. Open `index.html` in a modern web browser
2. Enter an IPv6 address and select a prefix length, or use the Quick Load buttons for documentation prefixes
3. Click **Go** to load the network
4. Use **Split** buttons (green) to divide subnets into 16 children
5. Use **Join** buttons (red) to collapse child subnets back to their parent
6. Add notes and colors to document your allocation plan
7. Click **Share** to copy a URL with your complete plan
8. Click **Export CSV** to download your plan as a spreadsheet

### Split Operation

Splitting a subnet divides it into 2-16 child subnets at the next nibble boundary (multiple of 4):

**Nibble-aligned splits** (create 16 children):

- `3fff::/20` splits into 16 /24s: `3fff::/24`, `3fff:100::/24`, `3fff:200::/24`, ... `3fff:f00::/24`
- `2001:db8::/32` splits into 16 /36s: `2001:db8::/36`, `2001:db8:1000::/36`, ... `2001:db8:f000::/36`

**Non-nibble-aligned splits** (create 2-8 children):

- `3fff::/21` splits into 8 /24s: `3fff::/24`, `3fff:100::/24`, ... `3fff:700::/24`
- `3fff::/22` splits into 4 /24s: `3fff::/24`, `3fff:100::/24`, `3fff:200::/24`, `3fff:300::/24`
- `3fff::/23` splits into 2 /24s: `3fff::/24`, `3fff:100::/24`

### Join Operation

Joining collapses all 16 child subnets back into their parent. This is a destructive operation that removes all child subnet annotations.

### Subnet Counts

The "Contains" column shows different metrics based on prefix length:

- **Prefixes < /48**: Shows number of /48 subnets (typical allocation for a physical location)
- **Prefixes ≥ /48**: Shows number of /64 subnets (minimum recommended subnet size)
- **/64**: Shows "Host Subnet" (cannot be split further)

## Technical Details

- **Single File Application**: Everything is contained in `index.html` - no build process or dependencies
- **Offline Capable**: Works completely offline once loaded
- **No Backend Required**: All processing happens in the browser
- **State Management**: Uses URL hash for state persistence and sharing
- **Color Palette**: 16 distinct pastel colors for visual categorization

## Browser Compatibility

Works in all modern browsers that support:

- ES6 JavaScript
- HTML5
- CSS3 (including CSS Grid and Flexbox)

Tested on:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Implementation Notes

### Nibble Alignment

**Initial Prefix**: Can be any value from /16 to /64 to accommodate real-world RIR allocations that may not fall on nibble boundaries (e.g., /21, /29, /47).

**Splitting**: Always occurs at the next nibble boundary (next multiple of 4). The number of children created depends on the gap:

- 1 bit to next boundary → 2 children (e.g., /23 → two /24s)
- 2 bits to next boundary → 4 children (e.g., /22 → four /24s)
- 3 bits to next boundary → 8 children (e.g., /21 → eight /24s)
- 4 bits to next boundary → 16 children (e.g., /20 → sixteen /24s)

This ensures all split subnets align on hexadecimal digit boundaries for easy readability while accepting non-aligned initial allocations.

### Address Sorting

Subnets are sorted numerically by their IPv6 address bytes, not lexicographically as strings. This ensures proper ordering (e.g., `3fff::/24` before `3fff:100::/24`).

### Join Button Rowspan

Join buttons use CSS `rowspan` to visually span all descendant rows, making it clear which subnets will be collapsed.

## Credits

This IPv6 Subnet Planner was inspired by:

- [Caesar Kabalan's](https://www.caesarkabalan.com/) [IPv4 Visual Subnet Calculator](https://visualsubnetcalc.com/)
- [davidc's](https://www.davidc.net/) [original IPv4 subnet calculator](https://www.davidc.net/sites/default/subnets/subnets.html)

## Author

Created by [Jason Tally](https://JasonTally.com) with the help of [opencode.ai](https://opencode.ai/) and Claude.

## License

MIT License

Copyright (c) 2024 Jason Tally and contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Resources

- [RFC 3849](https://www.rfc-editor.org/rfc/rfc3849.html) - IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- [RFC 9637](https://www.rfc-editor.org/rfc/rfc9637.html) - Expanding the IPv6 Documentation Space (3fff::/20)
- [RFC 5952](https://www.rfc-editor.org/rfc/rfc5952.html) - A Recommendation for IPv6 Address Text Representation
- [RFC 4291](https://www.rfc-editor.org/rfc/rfc4291.html) - IP Version 6 Addressing Architecture
