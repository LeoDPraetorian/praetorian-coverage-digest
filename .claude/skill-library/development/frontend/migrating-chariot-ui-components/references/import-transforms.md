# Import Transformation Rules

Detailed rules for transforming imports during component migration.

---

## Single Component Import

```typescript
// Before
import { Button } from '@praetorian-chariot/ui';

// After
import { Button } from '@/components/Button';
```

---

## Multiple Components (All Migrated)

```typescript
// Before
import { Button, Modal, Dropdown } from '@praetorian-chariot/ui';

// After
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Dropdown } from '@/components/Dropdown';
```

---

## Multiple Components (Mixed - Some Migrated)

When only some components have been migrated:

```typescript
// Before
import { Button, Dropdown, Tag } from '@praetorian-chariot/ui';

// After (if Button migrated, Dropdown and Tag not yet)
import { Button } from '@/components/Button';
import { Dropdown, Tag } from '@praetorian-chariot/ui';
```

---

## Type Imports

Types should migrate with their component:

```typescript
// Before
import type { ButtonProps } from '@praetorian-chariot/ui';

// After
import type { ButtonProps } from '@/components/Button';
```

---

## Icon Imports

```typescript
// Before
import { Balloon, Confetti } from '@praetorian-chariot/ui';

// After
import { Balloon } from '@/components/icons/Balloon';
import { Confetti } from '@/components/icons/Confetti';
```

---

## Re-exports and Barrel Files

If the deprecated library uses barrel files:

```typescript
// In chariot-ui-components/src/components/index.ts
export * from './Button';
export * from './Modal';
```

Each exported component needs individual migration. Do NOT recreate barrel files in local components unless they already exist.

---

## Default vs Named Exports

Preserve the export style from the original:

```typescript
// If original uses named export
export const Button = ...
// Keep as named export in local

// If original uses default export
export default Button;
// Keep as default export in local
```

---

## Internal Import Rewrites

When copying component source, transform these patterns:

| Original Pattern            | Local Pattern                         |
| --------------------------- | ------------------------------------- |
| `from "./Button"`           | `from "@/components/Button"`          |
| `from "./ui/Modal"`         | `from "@/components/ui/Modal"`        |
| `from "../icons/IconName"`  | `from "@/components/icons/IconName"`  |
| `from "../utils/someUtil"`  | `from "@/utils/someUtil"`             |
| `from "tailwind-merge"`     | `from "tailwind-merge"` (unchanged)   |
| `from "react"`              | `from "react"` (unchanged)            |

---

## CSS Imports

If component imports CSS:

```typescript
// Before (in chariot-ui-components)
import './Button.css';

// After - check if CSS is needed or if Tailwind handles it
// Often can be removed if using Tailwind classes
```

---

## Verification Command

After all transforms, verify no deprecated imports remain:

```bash
# Should return empty results
grep -r "@praetorian-chariot/ui" modules/chariot/ui/src/ \
  --include="*.tsx" --include="*.ts" | \
  grep -v "node_modules"
```
