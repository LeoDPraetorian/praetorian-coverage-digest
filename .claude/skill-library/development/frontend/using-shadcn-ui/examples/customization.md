# Customization Examples

How to customize shadcn/ui theme, components, and variants.

## Theme Colors

### Tailwind v4 (OKLCH - Recommended for New Projects)

Tailwind v4 uses the `@theme` directive and OKLCH color space for better perceptual uniformity:

```css
/* globals.css */
@theme {
  /* Light mode */
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.15 0.02 250);
  --color-primary: oklch(0.6 0.2 250);
  --color-primary-foreground: oklch(0.98 0.01 250);
  --color-secondary: oklch(0.96 0.01 250);
  --color-secondary-foreground: oklch(0.15 0.02 250);
  --color-muted: oklch(0.96 0.01 250);
  --color-muted-foreground: oklch(0.55 0.02 250);
  --color-accent: oklch(0.96 0.01 250);
  --color-accent-foreground: oklch(0.15 0.02 250);
  --color-destructive: oklch(0.55 0.2 25);
  --color-destructive-foreground: oklch(0.98 0.01 25);
  --color-border: oklch(0.91 0.01 250);
  --color-input: oklch(0.91 0.01 250);
  --color-ring: oklch(0.6 0.2 250);
  --radius: 0.5rem;
}

.dark {
  --color-background: oklch(0.15 0.02 250);
  --color-foreground: oklch(0.98 0.01 250);
  --color-primary: oklch(0.65 0.2 250);
  --color-primary-foreground: oklch(0.15 0.02 250);
  /* ... other dark mode colors */
}
```

**OKLCH format:** `oklch(lightness chroma hue)`

- **Lightness**: 0 (black) to 1 (white)
- **Chroma**: 0 (gray) to ~0.4 (saturated)
- **Hue**: 0-360 degrees (red=25, yellow=90, green=145, blue=250, purple=300)

### Tailwind v3 (HSL - Existing Projects)

For projects still on Tailwind v3:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --destructive: 0 84.2% 60.2%;
    --border: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... */
  }
}
```

## Custom Color Scheme

### OKLCH (Tailwind v4)

```css
/* Brand colors - Purple theme */
@theme {
  --color-primary: oklch(0.55 0.25 300); /* Purple */
  --color-primary-foreground: oklch(1 0 0); /* White */
  --color-secondary: oklch(0.96 0.01 300);
  --color-accent: oklch(0.55 0.25 300);
  --color-destructive: oklch(0.55 0.2 25); /* Red */
  --color-ring: oklch(0.55 0.25 300);
}
```

### HSL (Tailwind v3)

```css
/* Brand colors - Purple theme */
:root {
  --primary: 262 83% 58%;
  --primary-foreground: 0 0% 100%;
  --secondary: 220 14% 96%;
  --accent: 262 83% 58%;
  --destructive: 0 72% 51%;
  --ring: 262 83% 58%;
}
```

## Component Variants

Components use `class-variance-authority` (CVA) for variants.

### Adding Custom Button Variant

Edit `components/ui/button.tsx`:

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Add custom variants:
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-yellow-500 text-black hover:bg-yellow-600",
        gradient:
          "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        // Add custom sizes:
        xl: "h-14 rounded-lg px-10 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Usage

```typescript
<Button variant="success">Save</Button>
<Button variant="warning">Warning</Button>
<Button variant="gradient">Special</Button>
<Button size="xl">Large Button</Button>
```

## Extending Card Component

```typescript
// components/ui/card.tsx - add elevated variant

const cardVariants = cva("rounded-lg border bg-card text-card-foreground", {
  variants: {
    variant: {
      default: "",
      elevated: "shadow-lg hover:shadow-xl transition-shadow",
      bordered: "border-2 border-primary",
      ghost: "border-0 bg-transparent",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});
```

## Custom Input Styles

```typescript
// components/ui/input.tsx

const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        filled: "bg-muted border-0 focus-visible:bg-background",
        underline: "border-0 border-b-2 rounded-none px-0 focus-visible:ring-0",
      },
      inputSize: {
        default: "h-10",
        sm: "h-8 text-xs",
        lg: "h-12 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
);
```

## Global Style Overrides

```css
/* globals.css - global component tweaks */

/* Rounder buttons globally */
.button {
  @apply rounded-full;
}

/* Larger focus rings */
* {
  --ring-offset: 3px;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: hsl(var(--muted));
}
::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 4px;
}
```

## Tailwind Config Customization

```typescript
// tailwind.config.ts

import type { Config } from "tailwindcss";

const config: Config = {
  // ... existing config
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0ea5e9",
          600: "#0284c7",
          900: "#0c4a6e",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      fontSize: {
        "2xs": "0.625rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
};

export default config;
```

## Key Points

1. **Edit component files directly** - they're in your codebase
2. **Use CSS variables** for theme consistency
3. **CVA patterns** for type-safe variants
4. **Tailwind extend** for custom utilities
5. **Dark mode** uses `.dark` class selector
