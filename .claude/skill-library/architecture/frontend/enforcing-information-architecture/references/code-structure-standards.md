# Code Structure Standards

## Overview

Standards for organizing code within TypeScript/React files. Complements the file organization patterns in the main skill by defining import order, file length limits, and component internal structure.

**Core Principle**: Consistent code structure makes files scannable and predictable across the codebase.

---

## Import Order (Strict)

**Mandatory order with blank lines between groups:**

```typescript
// 1. React core imports
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// 2. Local UI components (@/components/ui)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// 3. Platform utilities and hooks (@/utils, @/hooks)
import { cn } from "@/utils/cn";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/date";

// 4. Types and interfaces
import type { Asset } from "@/types/asset";
import type { User } from "@/types/user";
```

**Rules**:

1. **Group 1: React core** - react, react-router, react-dom
2. **Group 2: Local UI** - @/components/ui imports (Shadcn, design system)
3. **Group 3: Platform utilities** - @/utils, @/hooks, @/lib
4. **Group 4: Types** - type imports, interfaces

**Blank line between each group** - Makes groups visually distinct

**Within groups**: Alphabetical order (optional but recommended)

**External libraries** (lodash, date-fns, etc.): Place in Group 3 with platform utilities

**Example violations**:

```typescript
❌ WRONG - No grouping, mixed order
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { Asset } from '@/types/asset';
import { cn } from '@/utils/cn';

✅ RIGHT - Proper grouping with blank lines
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { cn } from '@/utils/cn';

import type { Asset } from '@/types/asset';
```

---

## File Length Limits (Hard Limits)

**These are NOT guidelines - they are HARD LIMITS:**

| File Type  | Hard Limit | Consider Split At | Action Required       |
| ---------- | ---------- | ----------------- | --------------------- |
| Components | 300 lines  | 200 lines         | Extract hooks/utils   |
| Functions  | 30 lines   | 20 lines          | Break into subfuncs   |
| Hooks      | 50 lines   | 40 lines          | Split concerns        |
| Utilities  | 100 lines  | 80 lines          | Create separate files |

**Components: 300 Line Hard Limit**

When component approaches 200 lines, consider:

1. **Extract custom hooks** - Move complex logic to hooks/
2. **Split into subcomponents** - Break UI into smaller pieces
3. **Extract helper functions** - Move pure functions outside component
4. **Create feature module** - If component is doing too much, split feature

**Example: Component exceeding limit**

```typescript
// ❌ WRONG - 350 line component with inline logic
export const AssetTable = () => {
  // 100 lines of state and logic
  const [filters, setFilters] = useState({});
  const [sorting, setSorting] = useState({});
  // ... more state

  // 100 lines of handlers
  const handleFilterChange = () => { /* ... */ };
  const handleSort = () => { /* ... */ };
  // ... more handlers

  // 150 lines of rendering
  return (
    <div>
      {/* Complex table rendering */}
    </div>
  );
};

// ✅ RIGHT - Extract hooks and subcomponents
// hooks/useAssetTable.ts (40 lines)
export const useAssetTable = () => {
  const [filters, setFilters] = useState({});
  const [sorting, setSorting] = useState({});
  return { filters, sorting, handleFilterChange, handleSort };
};

// components/AssetTableHeader.tsx (60 lines)
export const AssetTableHeader = ({ onFilterChange }) => {
  return <div>{/* Header UI */}</div>;
};

// components/AssetTableRow.tsx (50 lines)
export const AssetTableRow = ({ asset }) => {
  return <tr>{/* Row UI */}</tr>;
};

// AssetTable.tsx (80 lines - under limit)
export const AssetTable = () => {
  const { filters, sorting, handleFilterChange, handleSort } = useAssetTable();

  return (
    <div>
      <AssetTableHeader onFilterChange={handleFilterChange} />
      {assets.map(asset => <AssetTableRow key={asset.id} asset={asset} />)}
    </div>
  );
};
```

**Functions: 30 Line Hard Limit**

Break functions exceeding 30 lines into smaller, focused functions:

```typescript
// ❌ WRONG - 45 line function doing too much
const processAssets = (assets: Asset[]) => {
  // Validation (10 lines)
  if (!assets || !Array.isArray(assets)) return [];
  const validAssets = assets.filter((a) => a.id && a.name);

  // Transformation (15 lines)
  const enriched = validAssets.map((asset) => ({
    ...asset,
    displayName: formatDisplayName(asset),
    riskScore: calculateRisk(asset),
  }));

  // Grouping (10 lines)
  const grouped = enriched.reduce((acc, asset) => {
    const key = asset.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(asset);
    return acc;
  }, {});

  // Sorting (10 lines)
  Object.keys(grouped).forEach((key) => {
    grouped[key].sort((a, b) => b.riskScore - a.riskScore);
  });

  return grouped;
};

// ✅ RIGHT - Split into focused functions
const validateAssets = (assets: Asset[]): Asset[] => {
  if (!assets || !Array.isArray(assets)) return [];
  return assets.filter((a) => a.id && a.name);
};

const enrichAsset = (asset: Asset) => ({
  ...asset,
  displayName: formatDisplayName(asset),
  riskScore: calculateRisk(asset),
});

const groupByType = (assets: Asset[]) => {
  return assets.reduce(
    (acc, asset) => {
      const key = asset.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(asset);
      return acc;
    },
    {} as Record<string, Asset[]>
  );
};

const sortByRisk = (grouped: Record<string, Asset[]>) => {
  Object.values(grouped).forEach((group) => {
    group.sort((a, b) => b.riskScore - a.riskScore);
  });
  return grouped;
};

// Main function becomes orchestration (15 lines)
const processAssets = (assets: Asset[]) => {
  const valid = validateAssets(assets);
  const enriched = valid.map(enrichAsset);
  const grouped = groupByType(enriched);
  return sortByRisk(grouped);
};
```

**Hooks: 50 Line Hard Limit**

Custom hooks exceeding 50 lines should be split by concern:

```typescript
// ❌ WRONG - 80 line hook doing too much
const useAssetManagement = () => {
  // Fetching (20 lines)
  const { data, isLoading } = useQuery(...);

  // Filtering (20 lines)
  const [filters, setFilters] = useState({});
  const filtered = useMemo(() => applyFilters(data, filters), [data, filters]);

  // Actions (20 lines)
  const updateMutation = useMutation(...);
  const deleteMutation = useMutation(...);

  // UI state (20 lines)
  const [selected, setSelected] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  return { /* everything */ };
};

// ✅ RIGHT - Split into focused hooks
// hooks/useAssetData.ts (25 lines)
export const useAssetData = () => {
  const { data, isLoading } = useQuery(...);
  return { assets: data, isLoading };
};

// hooks/useAssetFilters.ts (30 lines)
export const useAssetFilters = (assets: Asset[]) => {
  const [filters, setFilters] = useState({});
  const filtered = useMemo(() => applyFilters(assets, filters), [assets, filters]);
  return { filtered, filters, setFilters };
};

// hooks/useAssetActions.ts (40 lines)
export const useAssetActions = () => {
  const updateMutation = useMutation(...);
  const deleteMutation = useMutation(...);
  return { update: updateMutation.mutate, delete: deleteMutation.mutate };
};

// Main component uses focused hooks (20 lines)
const AssetTable = () => {
  const { assets, isLoading } = useAssetData();
  const { filtered, filters, setFilters } = useAssetFilters(assets);
  const { update, delete: deleteAsset } = useAssetActions();

  return <div>{/* UI */}</div>;
};
```

**Why Hard Limits Matter**:

- **Readability**: Files >300 lines become hard to scan
- **Testability**: Smaller units are easier to test
- **Maintainability**: Easier to understand and modify
- **Code Review**: Reviewers can comprehend smaller files
- **Merge Conflicts**: Smaller files reduce conflict probability

---

## Component Internal Structure (Mandatory Order)

**Every component file MUST follow this order:**

```typescript
// ============================================
// 1. TYPES AND INTERFACES (Top of file)
// ============================================
interface AssetCardProps {
  asset: Asset;
  onSelect: (id: string) => void;
}

type FilterState = {
  status: string[];
  type: string[];
};

// ============================================
// 2. CONSTANTS (After types)
// ============================================
const MAX_ASSETS_PER_PAGE = 50;
const DEFAULT_FILTERS: FilterState = {
  status: [],
  type: [],
};

// ============================================
// 3. HELPER FUNCTIONS (Outside component)
// ============================================
// Pure functions that don't need component scope
const formatAssetName = (asset: Asset): string => {
  return asset.name.toUpperCase();
};

const calculateRiskColor = (score: number): string => {
  if (score > 80) return 'red';
  if (score > 50) return 'yellow';
  return 'green';
};

// ============================================
// 4. MAIN COMPONENT (Last)
// ============================================
export const AssetCard: React.FC<AssetCardProps> = ({ asset, onSelect }) => {
  // -----------------------------------------
  // 4a. Global state hooks (Zustand, Context)
  // -----------------------------------------
  const user = useAuthStore(state => state.user);
  const theme = useTheme();

  // -----------------------------------------
  // 4b. API hooks (useQuery, useMutation)
  // -----------------------------------------
  const { data: details, isLoading } = useQuery({
    queryKey: ['asset', asset.id],
    queryFn: () => fetchAssetDetails(asset.id),
  });

  const updateMutation = useMutation({
    mutationFn: updateAsset,
  });

  // -----------------------------------------
  // 4c. Local state (useState, useReducer)
  // -----------------------------------------
  const [selected, setSelected] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // -----------------------------------------
  // 4d. Computed values (useMemo, derived)
  // -----------------------------------------
  const displayName = useMemo(
    () => formatAssetName(asset),
    [asset]
  );

  const riskColor = useMemo(
    () => calculateRiskColor(asset.riskScore),
    [asset.riskScore]
  );

  // -----------------------------------------
  // 4e. Effects (useEffect)
  // -----------------------------------------
  useEffect(() => {
    if (selected) {
      onSelect(asset.id);
    }
  }, [selected, asset.id, onSelect]);

  // -----------------------------------------
  // 4f. Event handlers (inline functions)
  // -----------------------------------------
  const handleClick = () => {
    setSelected(!selected);
  };

  const handleExpand = () => {
    setExpanded(!expanded);
  };

  // -----------------------------------------
  // 4g. Render
  // -----------------------------------------
  if (isLoading) return <Skeleton />;

  return (
    <Card onClick={handleClick}>
      <h3>{displayName}</h3>
      <Badge color={riskColor}>{asset.riskScore}</Badge>
      {expanded && <AssetDetails details={details} />}
    </Card>
  );
};
```

**Why This Order Matters**:

1. **Types first** - Understand the contract before reading implementation
2. **Constants next** - See configuration values up front
3. **Helpers outside** - Pure functions don't need component context
4. **Component last** - Main logic after supporting code

**Hook Order Within Component**:

| Order | Hook Type       | Examples                   | Why First/Last                     |
| ----- | --------------- | -------------------------- | ---------------------------------- |
| 1     | Global state    | useAuthStore, useTheme     | Foundational context               |
| 2     | API hooks       | useQuery, useMutation      | Data fetching dependencies         |
| 3     | Local state     | useState, useReducer       | Component-specific state           |
| 4     | Computed values | useMemo, derived values    | Depends on state above             |
| 5     | Effects         | useEffect, useLayoutEffect | React after state/computed defined |
| 6     | Event handlers  | onClick, onChange handlers | Use state/computed/effects above   |
| 7     | Render          | JSX return                 | Uses everything above              |

**Common Violations**:

```typescript
❌ WRONG - Event handlers defined before hooks
export const Component = () => {
  const handleClick = () => setCount(count + 1); // uses count before defined
  const [count, setCount] = useState(0); // count defined after usage

  return <button onClick={handleClick}>{count}</button>;
};

✅ RIGHT - Hooks before handlers
export const Component = () => {
  const [count, setCount] = useState(0);

  const handleClick = () => setCount(count + 1);

  return <button onClick={handleClick}>{count}</button>;
};
```

```typescript
❌ WRONG - Types defined inside component
export const Component = () => {
  interface Props { name: string; } // ❌ Types inside component

  return <div>Content</div>;
};

✅ RIGHT - Types at top of file
interface Props {
  name: string;
}

export const Component: React.FC<Props> = ({ name }) => {
  return <div>{name}</div>;
};
```

```typescript
❌ WRONG - Constants defined inside component
export const Component = () => {
  const MAX_ITEMS = 50; // ❌ Recreated on every render

  return <div>{MAX_ITEMS}</div>;
};

✅ RIGHT - Constants outside component
const MAX_ITEMS = 50; // ✅ Defined once

export const Component = () => {
  return <div>{MAX_ITEMS}</div>;
};
```

---

## Enforcement Strategy

**Code Review Checklist**:

- [ ] Imports grouped correctly (React → UI → Utils → Types)
- [ ] Component file < 300 lines
- [ ] Functions < 30 lines
- [ ] Hooks < 50 lines
- [ ] Types/interfaces at top of file
- [ ] Constants after types
- [ ] Helper functions outside component
- [ ] Hooks in correct order within component

**ESLint Rules** (Recommended):

```json
{
  "rules": {
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
        "newlines-between": "always"
      }
    ],
    "max-lines": ["warn", 300],
    "max-lines-per-function": ["warn", 30]
  }
}
```

**When to Violate Limits** (Rare):

- Complex rendering logic that can't be extracted (render props, complex conditionals)
- Generated code (GraphQL types, API clients)
- Configuration files (route definitions, test fixtures)

**Document exceptions** with comments explaining why limit is exceeded.

---

## Related

- Main skill: [Frontend Information Architecture](../SKILL.md)
- Naming conventions (main skill)
- File organization patterns (main skill)
- Testing organization (main skill)
