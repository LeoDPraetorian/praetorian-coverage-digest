# Migration Example: Tag Component

Complete walkthrough of migrating the `Tag` component from `@praetorian-chariot/ui` to local.

---

## Step 1: Discovery

### 1.1 Read the source component

```bash
cat modules/chariot-ui-components/src/components/Tag.tsx
```

### 1.2 Identify dependencies

```typescript
// Found imports:
import React from "react";                    // External - keep as-is
import { twMerge } from "tailwind-merge";     // External - keep as-is
// No internal component dependencies
```

**Result:** No recursive migrations needed for Tag.

---

## Step 2: Check Local Existence

```bash
ls modules/chariot/ui/src/components/Tag.tsx 2>/dev/null
```

**If exists:** Stop - use existing local version.
**If not found:** Continue with migration.

---

## Step 3: Copy Component

```bash
cp modules/chariot-ui-components/src/components/Tag.tsx \
   modules/chariot/ui/src/components/Tag.tsx
```

### 3.1 Review and adjust imports (if needed)

The Tag component has no internal imports to rewrite. It only uses:
- React (external)
- tailwind-merge (external)

Both are available in the local project.

---

## Step 4: Find All References

```bash
grep -r "Tag.*@praetorian-chariot/ui" modules/chariot/ui/src/ \
  --include="*.tsx" --include="*.ts" -l
```

**Found files:**
```
modules/chariot/ui/src/sections/insights/queryBuilder/components/QueryGuide.tsx
modules/chariot/ui/src/sections/insights/queryBuilder/components/QueryResultsDrawer.tsx
```

---

## Step 5: Update References

### File 1: QueryGuide.tsx

```typescript
// Before
import { DashedTag, RiskTag } from '@praetorian-chariot/ui';

// After (if DashedTag migrated, RiskTag not yet)
import { DashedTag } from '@/components/DashedTag';
import { RiskTag } from '@praetorian-chariot/ui';

// Or after (if both migrated)
import { DashedTag } from '@/components/DashedTag';
import { RiskTag } from '@/components/RiskTag';
```

### File 2: QueryResultsDrawer.tsx

```typescript
// Before
import { DashedTag } from '@praetorian-chariot/ui';

// After
import { DashedTag } from '@/components/DashedTag';
```

---

## Step 6: Verification

### 6.1 TypeScript Check

```bash
cd modules/chariot/ui
npm run ts
```

**Expected:** No type errors

### 6.2 Build Check

```bash
npm run build
```

**Expected:** Build succeeds

### 6.3 Import Verification

```bash
grep -r "Tag.*@praetorian-chariot/ui" modules/chariot/ui/src/
```

**Expected:** Empty result (no remaining deprecated imports for Tag)

---

## Summary

| Phase         | Action                                      | Time   |
| ------------- | ------------------------------------------- | ------ |
| Discovery     | Read source, identify dependencies          | 1 min  |
| Local Check   | Verify component doesn't exist locally      | 30 sec |
| Copy          | Copy file, rewrite internal imports         | 2 min  |
| Find Refs     | Grep for all usages                         | 30 sec |
| Update Refs   | Transform all import statements             | 5 min  |
| Verification  | TypeScript, build, grep verification        | 2 min  |
| **Total**     |                                             | ~11 min|

---

## Complex Example: Component with Dependencies

For a component like `Dropdown` that imports other components:

```typescript
// Dropdown.tsx imports
import { Button } from './Button';
import { Popover } from './Popover';
import { SearchBar } from './SearchBar';
```

**Migration order:**
1. Migrate Button first
2. Migrate Popover
3. Migrate SearchBar
4. Then migrate Dropdown (dependencies now available)

After copying Dropdown, rewrite its imports:

```typescript
// Before (in copied file)
import { Button } from './Button';

// After
import { Button } from '@/components/Button';
```
