---
name: chariot-brand-guidelines
description: Applies Chariot's official brand colors and typography for light and dark modes to any sort of artifact. Use it when brand colors or style guidelines, visual formatting, or company design standards apply.
allowed-tools: "Read, Write, Edit, Bash, Grep"
---

# Chariot Brand Styling

## Overview

To access Chariot's official brand identity and style resources, use this skill. Chariot supports both light and dark themes with carefully designed color palettes for each mode.

**Keywords**: branding, corporate identity, visual identity, post-processing, styling, brand colors, typography, Chariot brand, visual formatting, visual design, light mode, dark mode

## Brand Guidelines

### Light Mode Colors

**Primary Brand Colors:**

- Brand Purple: `#5f47b7` (rgb 95, 71, 183) - Primary brand color
- Brand Purple Lighter: `#ece6fc` - Subtle backgrounds
- Brand Purple Light: `#afa3db` - Secondary brand elements
- Brand Purple Dark: `#4b37a3` - Darker brand accents
- Primary Accent: `#5658ef` (rgb 86, 88, 239) - Interactive elements

**Backgrounds:**

- Layer 0 (Primary): `#ffffff` (rgb 255, 255, 255) - Main background
- Layer 1 (Secondary): `#f3f4f6` (rgb 243, 244, 246) - Card backgrounds
- Layer 2 (Tertiary): `#e5e7eb` (rgb 229, 231, 235) - Nested elements
- Code Background: `#ece9fb` (rgb 236, 233, 251) - Code blocks

**Text Colors:**

- Primary Text: `#0d0d28` (rgb 13, 13, 40) - Body text
- Secondary Text: `#7b7983` - Muted text
- Disabled Text: `#9ca3af` - Disabled states

**UI Elements:**

- Header Background: `#0d0d28` - Top navigation
- Border Default: `#e7e7e9` - Element borders
- Success: `#16a34a` - Success states
- Error: `#dc2626` - Error states

### Dark Mode Colors

**Primary Brand Colors:**

- Brand Purple: `#5f47b7` (rgb 95, 71, 183) - Primary brand color (same as light)
- Brand Purple Lighter: `#ece6fc` - Subtle accents
- Brand Purple Light: `#afa3db` - Secondary brand elements
- Brand Purple Dark: `#4b37a3` - Darker brand accents
- Primary Accent: `#5658ef` (rgb 86, 88, 239) - Interactive elements

**Backgrounds:**

- Layer 0 (Primary): `#0d0d28` (rgb 13, 13, 40) - Main background
- Layer 1 (Secondary): `#28205a` (rgb 40, 32, 90) - Card backgrounds
- Layer 2 (Tertiary): `#25253e` (rgb 37, 37, 62) - Nested elements
- Code Background: `#28205a` (rgb 40, 32, 90) - Code blocks

**Text Colors:**

- Primary Text: `#f8f8f2` - Body text
- Secondary Text: `#bbb9c3` - Muted text
- Header Text: `#d1d5db` - Navigation text
- Disabled Text: `#6b7280` - Disabled states

**UI Elements:**

- Header Background: `#0d0d28` - Top navigation
- Header Secondary: `#3d3d53` - Header elements
- Border Header: `#323452` - Header borders
- Success: `#16a34a` - Success states
- Error: `#dc2626` - Error states

### Typography

- **Font Family**: Inter (sans-serif) - Primary typeface for all text
- **Monospace**: IBM Plex Mono - Code and technical content
- **Note**: Fonts are web-based and automatically loaded

## Features

### Theme-Aware Design

- Automatically applies appropriate colors based on theme mode (light/dark)
- Ensures proper contrast ratios for accessibility
- Maintains brand consistency across both themes

### Typography System

- Inter font for all UI text and headings
- IBM Plex Mono for code blocks and technical content
- Optimized for screen readability
- Web fonts loaded automatically

### Color Application

- Brand purple as primary color for CTAs and emphasis
- Layered background system for depth and hierarchy
- Consistent success/error states across themes
- Proper text contrast on all backgrounds

### Accessibility

- WCAG AA compliant color contrasts
- Clear visual hierarchy with layered backgrounds
- Readable text sizes with Inter font
- High contrast between interactive elements

## Technical Details

### Color Format

- Hex values: `#5f47b7` - Standard hex format
- RGB values: `rgb(95, 71, 183)` - For alpha transparency support
- CSS variables: Available in Tailwind config as `--brand`, `--primary`, etc.

### Implementation Notes

- Colors maintain same hex values across themes where brand consistency is key
- Background layers provide depth: Layer 0 (main) → Layer 1 (cards) → Layer 2 (nested)
- Text colors automatically adjust for theme to ensure readability
- Header maintains consistent dark background in both themes for navigation stability

### Usage Guidelines

- **Primary Actions**: Use Brand Purple (#5f47b7) or Primary Accent (#5658ef)
- **Backgrounds**: Start with Layer 0, use Layer 1 for cards, Layer 2 for nested content
- **Text**: Primary text for body content, Secondary text for supporting information
- **States**: Use defined success/error colors for consistency

## Styling Rules

### Theme Classes vs Hardcoded Colors

**CRITICAL RULE: ALWAYS use Tailwind theme classes, NEVER hardcode colors in className attributes.**

Theme classes automatically handle light/dark mode switching by referencing CSS variables that change based on the active theme. Hardcoded color values like `bg-gray-900` or `text-white` will NOT adapt to theme changes and will break the user experience.

**✅ CORRECT:**

```tsx
<div className="bg-layer0 text-default">
  <Card className="bg-layer1 border-default">
    <h3 className="text-default">Title</h3>
    <p className="text-secondary">Description</p>
  </Card>
</div>
```

**❌ WRONG:**

```tsx
<div className="bg-white text-black dark:bg-gray-900 dark:text-white">
  <Card className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
    <h3 className="text-black dark:text-white">Title</h3>
    <p className="text-gray-500 dark:text-gray-400">Description</p>
  </Card>
</div>
```

**Why This Matters:**

- Theme classes use CSS variables that change automatically with theme
- No need for `dark:` variants (eliminates duplicate styling)
- Future theme changes update everywhere automatically
- Consistent with Chariot's design system
- Reduces bundle size (fewer class combinations)

### Common Theme Class Mappings

Use these theme classes instead of hardcoded Tailwind colors:

| Purpose                | Theme Class      | NOT This                             |
| ---------------------- | ---------------- | ------------------------------------ |
| Primary background     | `bg-layer0`      | `bg-white`, `bg-gray-900`            |
| Card background        | `bg-layer1`      | `bg-gray-100`, `bg-gray-800`         |
| Nested background      | `bg-layer2`      | `bg-gray-200`, `bg-gray-700`         |
| Primary text           | `text-default`   | `text-black`, `text-white`           |
| Secondary text         | `text-secondary` | `text-gray-500`, `text-gray-400`     |
| Borders                | `border-default` | `border-gray-200`, `border-gray-700` |
| Header background      | `bg-header`      | `bg-gray-900`                        |
| Brand purple (buttons) | `bg-brand`       | `bg-purple-600`                      |
| Success state          | `text-success`   | `text-green-600`                     |
| Error state            | `text-error`     | `text-red-600`                       |

**Reference Implementation:**

- All theme classes are defined in `ui/src/index.css` as CSS variables
- Tailwind config extends these as utility classes
- See existing components for usage examples
