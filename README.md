# IPv6 Subnet Planner

A web-based tool for hierarchically planning and documenting IPv6 address space allocations.

## **[Try the Live App](https://v6plan.jasontally.com/)**

![IPv6 Subnet Planner](https://img.shields.io/badge/IPv6-Subnet%20Planner-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

Network engineers and administrators use this tool to plan IPv6 address space by visually splitting and organizing subnets. We design it around nibble-aligned 4-bit boundary subnet planning by default. This makes dividing address space and documenting allocations easy. Custom split targets support geographical denomination models and specialized addressing schemes.

## Features

- **Flexible Initial Prefix** Accept any prefix length from /16 to /64 including non-nibble-aligned allocations like /21 /23 or /47 to match real-world RIR assignments
- **Nibble-Aligned Splitting (Default)** Split button divides to the next 4-bit boundary creating 2-16 child subnets depending on current prefix
- **Custom Split Targets** Select dropdown for any target prefix from current+1 to /64
  - Nibble-aligned targets create children directly with no intermediate levels
  - Targets crossing multiple nibble boundaries automatically create intermediate parent subnets at each nibble boundary
- **Prefix Range** Support /16 to /64 prefix lengths with /64 as minimum assignable subnet
- **Location-Based Planning** Show count of /48s for large allocations and /64s for smaller subnets
- **Visual Hierarchy** Join buttons span multiple rows to show parent-child relationships
- **Annotations** Add notes and color-code subnets to document allocations
- **Shareable URLs** Encode complete planning state in URL for sharing
- **CSV Export** Download subnet plans with proper hierarchy indentation
- **RFC 5952 Compliance** Display all IPv6 addresses in proper compressed notation
- **Quick Load** One-click loading of common documentation prefixes 3fff::/20 and 2001:db8::/32

## Usage

### Getting Started

Open `index.html` in a modern web browser. Enter an IPv6 address and select a prefix length or use Quick Load buttons for documentation prefixes. Click Go to load the network.

Click green Split buttons to divide subnets into 2-16 children. Click red Join buttons to collapse child subnets back to their parent. Add notes and colors to document allocations. Click Share to copy a URL with your complete plan. Click Export CSV to download your plan as a spreadsheet.

### Split Operation

Click a green Split button to divide a subnet into smaller networks. By default it splits to the next nibble boundary. Use the dropdown to select a custom target prefix.

**Nibble-aligned splits (default)** create 2-16 children

- `3fff::/20` splits into 16 /24s
- `2001:db8::/32` splits into 16 /36s
- `3fff::/21` splits into 8 /24s
- `3fff::/22` splits into 4 /24s
- `3fff::/23` splits into 2 /24s

**Custom split targets** support geographical denomination models

Select a specific target prefix from the dropdown next to the Split button

- `2001:db8::/32` to target `/34` creates 4 subnets
- `2001:db8::/32` to target `/37` creates 32 subnets
- `2001:db8:1::/44` to target `/55` creates 2048 subnets

**Intermediate level creation** for custom splits

When splitting across multiple nibble boundaries the app automatically creates intermediate levels at each boundary

- `/20` to `/28` creates 16 `/24`s then 256 `/28`s (273 rows total)
- `/20` to `/30` creates `/24` → `/28` → `/30` hierarchy (1297 rows total)
- `/20` to `/24` directly creates 16 `/24`s with no intermediates

Intermediate levels inherit parent subnet note and color annotations to all descendants.

### Join Operation

Click red Join buttons to collapse all descendant subnets back to their parent. This removes all child and grandchild subnet annotations.

### Subnet Counts

The Contains column shows different metrics based on prefix length

- **Prefixes less than /48** Show number of /48 subnets typical allocation for a physical location
- **Prefixes of /48 or greater** Show number of /64 subnets the minimum recommended subnet size
- **/64** Shows Host Subnet and cannot be split further

## Technical Details

- **Single File Application** Everything is contained in `index.html` with no build process or dependencies
- **Offline Capable** Works completely offline once loaded
- **No Backend Required** All processing happens in the browser
- **State Management** Uses URL hash for state persistence and sharing
- **Color Palette** 16 distinct pastel colors for visual categorization

## Browser Compatibility

Works in all modern browsers that support ES6 JavaScript HTML5 and CSS3 including CSS Grid and Flexbox

Tested on Chrome/Edge Firefox and Safari latest versions.

## Implementation Notes

### Nibble Alignment

**Initial Prefix** Can be any value from /16 to /64 to accommodate real-world RIR allocations that may not fall on nibble boundaries like /21 /29 or /47

**Splitting (Default)** By default occurs at the next nibble boundary. The number of children created depends on the gap

- 1 bit to next boundary creates 2 children like /23 to two /24s
- 2 bits to next boundary creates 4 children like /22 to four /24s
- 3 bits to next boundary creates 8 children like /21 to eight /24s
- 4 bits to next boundary creates 16 children like /20 to sixteen /24s

This ensures all split subnets align on hexadecimal digit boundaries for easy readability while accepting non-aligned initial allocations.

**Splitting (Custom Target)** Select any target prefix from current+1 to /64 via dropdown. This enables geographical denomination models where administrative layers use non-nibble-aligned prefixes like /34 for zones or /37 for districts while network layer subnets remain nibble-aligned for easier management. Options are limited to creating 1024 or fewer children to prevent performance issues.

**Intermediate Levels** When splitting across multiple nibble boundaries intermediate levels are automatically created at each nibble boundary. For example splitting /20 to /28 creates 16 /24 subnets first then each /24 is split into 16 /28s (273 rows total). This maintains nibble alignment at each level while supporting any target prefix.

### Address Sorting

We sort subnets numerically by their IPv6 address bytes not lexicographically as strings. This ensures proper ordering like `3fff::/24` before `3fff:100::/24`.

### Join Button Rowspan

Join buttons use CSS rowspan to visually span all descendant rows making it clear which subnets will be collapsed.

## Credits

This IPv6 Subnet Planner was inspired by

- [Caesar Kabalan](https://www.caesarkabalan.com/) and his [IPv4 Visual Subnet Calculator](https://visualsubnetcalc.com/)
- [davidc](https://www.davidc.net/) and his [original IPv4 subnet calculator](https://www.davidc.net/sites/default/subnets/subnets.html)

## Author

Created by [Jason Tally](https://JasonTally.com). Code is available on [GitHub](https://github.com/jasontally/IPv6-Plan).

## License

MIT License

Copyright 2025 Jason Tally and contributors

Permission is hereby granted free of charge to any person obtaining a copy of this software and associated documentation files to deal in the Software without restriction including without limitation rights to use copy modify merge publish distribute sublicense and sell copies of the Software and to permit persons to whom the Software is furnished to do so subject to the following conditions

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software

THE SOFTWARE IS PROVIDED AS IS WITHOUT WARRANTY OF ANY KIND EXPRESS OR IMPLIED INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM DAMAGES OR OTHER LIABILITY WHETHER IN AN ACTION OF CONTRACT TORT OR OTHERWISE ARISING FROM OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE

## Contributing

We welcome contributions. Feel free to submit issues or pull requests.

## Resources

- [RFC 3849](https://www.rfc-editor.org/rfc/rfc3849.html) IPv6 Address Prefix Reserved for Documentation 2001:db8::/32
- [RFC 9637](https://www.rfc-editor.org/rfc/rfc9637.html) Expanding the IPv6 Documentation Space 3fff::/20
- [RFC 5952](https://www.rfc-editor.org/rfc/rfc5952.html) A Recommendation for IPv6 Address Text Representation
- [RFC 4291](https://www.rfc-editor.org/rfc/rfc4291.html) IP Version 6 Addressing Architecture
