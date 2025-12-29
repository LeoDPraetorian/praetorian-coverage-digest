# Version Compatibility Guide

React 19 and Tailwind v4 support for shadcn/ui (February 2025).

## Quick Reference

| Version         | React | Tailwind | CLI Command              | Color Format |
| --------------- | ----- | -------- | ------------------------ | ------------ |
| Latest (canary) | 19    | v4       | `npx shadcn@canary init` | OKLCH        |
| Stable (latest) | 18    | v3       | `npx shadcn@latest init` | HSL          |

## New Projects

### React 19 + Tailwind v4 (Recommended)

```bash
npx shadcn@canary init
```

This sets up:

- Tailwind CSS v4 with `@theme` directive
- OKLCH color format
- `tw-animate-css` (not tailwindcss-animate)
- `data-slot` attributes on primitives
- No `forwardRef` in components

### React 18 + Tailwind v3 (Stable)

```bash
npx shadcn@latest init
```

Existing projects continue to work. When you add components, they use v3/React 18 patterns.

## Upgrade Path

### 1. Upgrade Tailwind to v4

Follow the official Tailwind upgrade guide:

```bash
# Use the official codemod
npx @tailwindcss/upgrade@next
```

This handles:

- Migrating `tailwind.config.ts` to CSS-based config
- Converting deprecated utility classes
- Updating import syntax

**Documentation:** https://tailwindcss.com/docs/upgrade-guide

### 2. Update Animation Library

```bash
# Remove old
npm uninstall tailwindcss-animate

# Install new
npm install tw-animate-css
```

Update `globals.css`:

```css
/* Remove */
@plugin 'tailwindcss-animate';

/* Add (if needed - tw-animate-css auto-includes) */
```

### 3. Migrate forwardRef (React 19)

React 19 deprecates `forwardRef`. Use the codemod:

```bash
npx react-codemod remove-forward-ref
```

**Manual migration:**

```typescript
// Before (React 18)
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <button ref={ref} className={className} {...props} />
  )
)
Button.displayName = "Button"

// After (React 19)
function Button({ className, ref, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  return <button ref={ref} className={className} data-slot="button" {...props} />
}
```

### 4. Update Color Variables (HSL → OKLCH)

**HSL (Tailwind v3):**

```css
:root {
  --primary: 221.2 83.2% 53.3%;
}
```

**OKLCH (Tailwind v4):**

```css
@theme {
  --color-primary: oklch(0.6 0.2 250);
}
```

**OKLCH format:** `oklch(lightness chroma hue)`

- Lightness: 0 (black) to 1 (white)
- Chroma: 0 (gray) to ~0.4 (saturated)
- Hue: 0-360 degrees

### 5. Add data-slot Attributes

Tailwind v4 components use `data-slot` for styling:

```typescript
<button data-slot="button" className={cn(buttonVariants(), className)}>
  {children}
</button>
```

This enables powerful Tailwind selectors:

```css
[data-slot="button"]:focus { ... }
```

## Breaking Changes Summary

### Deprecations

| Deprecated            | Replacement      | Notes                       |
| --------------------- | ---------------- | --------------------------- |
| Toast component       | Sonner           | Better stacking, animations |
| "Default" style       | "new-york"       | Only one style now          |
| `tailwindcss-animate` | `tw-animate-css` | March 2025                  |
| `forwardRef`          | Direct ref prop  | React 19                    |
| HSL colors            | OKLCH colors     | Tailwind v4                 |

### Non-Breaking

- Existing Tailwind v3 + React 18 projects continue to work
- Adding components to v3 projects still uses v3 patterns
- No forced migration required

## Version Detection

Check your current setup:

```bash
# Check React version
npm list react

# Check Tailwind version
npm list tailwindcss

# Check if using canary shadcn
cat components.json | grep "style"
```

## Troubleshooting

### "forwardRef is not a function"

You're mixing React 18 and 19 patterns. Either:

1. Upgrade all components to React 19 patterns
2. Downgrade to React 18

### Colors look wrong after Tailwind v4 upgrade

Check if you're mixing HSL and OKLCH:

```css
/* Wrong - mixing formats */
--primary: 221.2 83.2% 53.3%; /* HSL */
--secondary: oklch(0.96 0.01 250); /* OKLCH */

/* Correct - use one format */
--color-primary: oklch(0.6 0.2 250);
--color-secondary: oklch(0.96 0.01 250);
```

### Animations not working

Replace tailwindcss-animate:

```bash
npm uninstall tailwindcss-animate
npm install tw-animate-css
```

## Resources

- **React 19 Guide:** https://ui.shadcn.com/docs/react-19
- **Tailwind v4 Guide:** https://ui.shadcn.com/docs/tailwind-v4
- **Tailwind Upgrade:** https://tailwindcss.com/docs/upgrade-guide
- **React Codemods:** https://github.com/reactjs/react-codemod
