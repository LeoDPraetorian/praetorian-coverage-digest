---
name: migrating-chariot-ui-components
description: Use when working with React components in chariot/ui - handles component source selection and migration from @praetorian-chariot/ui to local components
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, MultiEdit, AskUserQuestion
---

# Migrating Chariot UI Components

**Handles component source selection and migration from the deprecated `@praetorian-chariot/ui` shared library to local components.**

## Context

- `chariot-ui-components` (`@praetorian-chariot/ui`) is being **decommissioned**
- All components should migrate to `modules/chariot/ui/src/components/`
- Local components (`@/components/...`) take precedence over shared library

## When to Use

Use this skill when:

- Working with React components in the Chariot UI module
- Encountering imports from `@praetorian-chariot/ui`
- Needing to use, modify, or create UI components
- Agent needs a component that may exist in the deprecated shared library

**You MUST use TodoWrite** before starting to track all migration steps.

## Quick Reference: Decision Tree

```text
Need a component?
├─ Check local first: modules/chariot/ui/src/components/
│  ├─ EXISTS → Use it (@/components/...)
│  └─ NOT FOUND → Check chariot-ui-components
│     ├─ EXISTS → Migrate first, then use
│     └─ NOT FOUND → Create new component locally
│
Encountered @praetorian-chariot/ui import?
└─ Ask user: "Migrate this component to local?"
   ├─ YES → Run full migration workflow
   ├─ NO → Continue (user's choice)
   └─ MIGRATE ALL → Mass migration of remaining components
```

## Source Locations

| Source               | Path                                    | Import Pattern             | Status          |
| -------------------- | --------------------------------------- | -------------------------- | --------------- |
| **Local (use this)** | `modules/chariot/ui/src/components/`    | `@/components/...`         | Active          |
| **Shared (migrate)** | `modules/chariot-ui-components/src/`    | `@praetorian-chariot/ui`   | Decommissioning |

## Migration Workflow

### Phase 1: Discovery

Before migrating, identify all dependencies:

```bash
# Find component file
COMPONENT="ComponentName"
COMPONENT_FILE="modules/chariot-ui-components/src/components/${COMPONENT}.tsx"

# Extract imports to find dependencies
grep -E "^import.*from ['\"]" "$COMPONENT_FILE"
```

**Dependency types:**

| Type                      | Pattern                             | Action                     |
| ------------------------- | ----------------------------------- | -------------------------- |
| Internal components       | `from './OtherComponent'`           | Migrate first (recursive)  |
| Icons                     | `from '../icons/IconName'`          | Migrate to local icons/    |
| Utilities                 | `from '../utils/...'`               | Migrate or use local utils |
| External packages         | `from 'react'`, `from 'tailwind-merge'` | Keep as-is             |

### Phase 2: Recursive Migration

**Order matters:** Migrate dependencies before the component that uses them.

For each component:

1. **Read** source from `chariot-ui-components`
2. **Copy verbatim** to appropriate local directory
3. **Rewrite internal imports:**

| Original                    | Rewritten                           |
| --------------------------- | ----------------------------------- |
| `from './OtherComponent'`   | `from '@/components/OtherComponent'`|
| `from '../icons/IconName'`  | `from '@/components/icons/IconName'`|
| `from '../utils/someUtil'`  | `from '@/utils/someUtil'`           |

### Phase 3: Update All References

After migration, update ALL imports across the codebase:

```bash
# Find all files importing the migrated component
grep -r "from '@praetorian-chariot/ui'" modules/chariot/ui/src/ \
  --include="*.tsx" --include="*.ts"
```

**Transform imports** (see [references/import-transforms.md](references/import-transforms.md)):

```typescript
// Before
import { Button, Dropdown } from '@praetorian-chariot/ui';

// After (both migrated)
import { Button } from '@/components/Button';
import { Dropdown } from '@/components/Dropdown';
```

### Phase 4: Verification

1. **TypeScript check:** `cd modules/chariot/ui && npm run ts`
2. **Build check:** `cd modules/chariot/ui && npm run build`
3. **Import verification:** No remaining imports of migrated component from deprecated library

```bash
# Verify no remaining imports
grep -r "ComponentName.*@praetorian-chariot/ui" modules/chariot/ui/src/
# Should return empty
```

## Target Directories

| Component Type       | Local Destination     |
| -------------------- | --------------------- |
| Generic UI primitives| `components/ui/`      |
| Form controls        | `components/form/`    |
| Icons                | `components/icons/`   |
| Charts/visualization | `components/charts/`  |
| Complex components   | `components/` (root)  |

## User Interaction

When encountering `@praetorian-chariot/ui` imports, prompt the user:

```yaml
AskUserQuestion:
  question: "This file imports from @praetorian-chariot/ui (deprecated).
            Would you like to migrate these components to local?"
  options:
    - "Yes, migrate now" - Migrate component(s) and update all imports
    - "No, continue" - Keep using deprecated import for now
    - "Migrate ALL remaining" - Full migration of all remaining components
```

## Edge Cases

### Component Already Exists Locally

If local version exists with same name:

- **Do NOT overwrite** - local version may have enhancements
- Use the existing local version
- Log: "Component already exists locally, using existing version"

### Circular Dependencies

If component A imports B and B imports A:

- Migrate both in single operation
- Ensure both files updated before import resolution

### Type-Only Exports

Some components export types alongside component:

```typescript
// Both must migrate together
export interface ButtonProps { ... }
export const Button = ...
```

Migrate interface and component together.

## Available Components in Deprecated Library

```text
Button, Checkbox, Container, CopyToClipboard, DashedDropdown, Drawer,
Dropdown, EpssChart, FeatureCheckbox, FeatureRadio, IconToggle, LeftNav,
Modal, OverflowText, Popover, QueryBuilder, QueryBuilderRelationship,
SearchBar, SearchDropdown, Slider, SortableColumns, Stepper, Tabs, Tag,
Tooltip, ViewToggle
```

Plus icons in `modules/chariot-ui-components/src/icons/`

## Anti-Patterns

### Do NOT import from deprecated library for new code

```typescript
// WRONG - using deprecated library
import { Button } from '@praetorian-chariot/ui';

// CORRECT - use local
import { Button } from '@/components/Button';
```

### Do NOT modify chariot-ui-components directly

If you need to modify a component, migrate it first:

1. Migrate to local
2. Update all references
3. Then modify the local version

### Do NOT leave partial migrations

After migrating a component, ALL references must be updated. Never leave a mix of:

```typescript
// File A
import { Button } from '@/components/Button';

// File B (WRONG - still using deprecated)
import { Button } from '@praetorian-chariot/ui';
```

## Checklist

Before working with components:

- [ ] Check if component exists locally first
- [ ] If using `@praetorian-chariot/ui`, offer migration
- [ ] If migrating, identify ALL dependencies
- [ ] Migrate dependencies first (bottom-up)
- [ ] Update ALL imports across codebase
- [ ] Verify with `npm run ts` and `npm run build`

## References

- [references/import-transforms.md](references/import-transforms.md) - Detailed import transformation rules
- [references/migration-example.md](references/migration-example.md) - Full migration walkthrough
