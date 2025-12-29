---
name: enforcing-information-architecture
description: Use when refactoring frontend sections with 20+ files, deciding where new components belong, or organizing React codebases - provides file structure standards based on complexity tiers (flat, tab-based, hook-based, feature-module patterns) matching metrics/vulnerabilities gold standards
allowed-tools: "Read, Write, Edit, Bash, Grep"
---

# Frontend Information Architecture

## Overview

Standardized file and directory organization patterns for React frontend sections. Prevents the "where does this file go?" problem by providing clear structure based on section complexity (file count and feature depth).

**Core Principle**: Structure should match complexity. Simple features stay flat. Complex features get organized hierarchies. Let file count and feature independence drive organization decisions.

## Code Structure Standards

Standards for organizing code **within** files (complements directory organization above). Ensures consistency in import order, file length, and component internal structure.

**For detailed code structure patterns, see [Code Structure Standards](references/code-structure-standards.md)**:

- **Import Order (Strict)** - React core → Local UI (@/components/ui) → Platform utilities (@/utils) → Types (blank lines between groups)
- **File Length Limits (Hard)** - Components <300 lines, Functions <30 lines, Hooks <50 lines (not guidelines - actual limits)
- **Component Internal Structure** - Types → Constants → Helper functions → Main component (with hook order: global state → API → local state → computed → effects)

**Quick Reference**:

| Aspect          | Standard                  | Example                                   |
| --------------- | ------------------------- | ----------------------------------------- |
| Import groups   | 4 groups with blank lines | React → UI → Utils → Types                |
| Component limit | 300 lines (hard)          | Extract hooks at 200 lines                |
| Function limit  | 30 lines (hard)           | Break into subfunctions                   |
| Hook limit      | 50 lines (hard)           | Split by concern                          |
| Hook order      | Specific sequence         | Global → API → Local → Computed → Effects |

## When to Use

**Use when:**

- Refactoring a section with 20+ files showing organizational strain
- Creating new section and deciding initial structure
- Components directory has 10+ mixed-purpose files
- Unclear where feature-specific vs shared components belong
- Need to decide: flat file vs subdirectory vs feature module

**Symptoms this addresses:**

- "Components directory is becoming a junk drawer"
- "Can't find files quickly"
- "Unclear which components are shared vs feature-specific"
- "Section structure doesn't scale as features grow"

**Don't use when:**

- Section has <15 files (keep it simple)
- Just renaming files (use naming conventions only)
- Project-specific conventions (document in CLAUDE.md)

## Before You Start

**🚨 MANDATORY: You MUST use TodoWrite before starting** to track all refactoring steps and organizational decisions. This skill has 17 sections with multiple decision points - mental tracking will cause missed steps.

## Complexity-Based Organization Tiers

### Tier 1: Flat Pattern (<20 files)

**Structure:**

```
section/
├── index.tsx
├── ComponentA.tsx
├── ComponentB.tsx
├── hooks.ts
├── types.ts
└── utils.ts
```

**When**: Simple features, minimal state, few components
**Example**: Small utility sections, simple dashboards

---

### Tier 2: Tab-Based Pattern (20-60 files)

**Structure:**

```
section/
├── index.tsx (orchestration)
├── tabs/
│   ├── Tab1.tsx
│   ├── Tab2.tsx
│   └── Tab3.tsx
├── components/
│   ├── primitives/     # Shared UI building blocks
│   ├── forms/          # Form components (3+ threshold)
│   ├── modals/         # Modal dialogs (3+ threshold)
│   └── index.ts
├── hooks/
│   └── index.ts
├── types.ts
└── constants.ts
```

**When**: Features with clear tab/mode separation
**Example**: Settings section (after refactoring)
**Key Pattern**: Organize components by purpose when hitting thresholds

---

### Tier 3: Hook-Based Pattern (60-100 files)

**Structure:**

```
section/
├── index.tsx (< 300 lines via hook extraction)
├── types/
│   ├── domain1.types.ts
│   ├── domain2.types.ts
│   └── index.ts
├── config/
│   ├── columns.ts
│   ├── filters.ts
│   └── index.ts
├── hooks/
│   ├── useMainFeature.ts
│   ├── actions/         # Specialized hooks
│   │   └── useActions.ts
│   └── index.ts
├── utils/
│   ├── domain1.util.ts
│   └── index.ts
└── components/
    ├── cells/           # Table cells (5+ threshold)
    ├── modals/          # Modals (3+ threshold)
    ├── actions/         # Toolbars (2+ threshold)
    └── index.ts
```

**When**: Data-intensive features with complex business logic
**Example**: Vulnerabilities section
**Key Pattern**: Extract business logic to hooks, organize components by UI pattern

---

### Tier 4: Feature Module Pattern (80+ files)

**Structure:**

```
section/
├── index.tsx (lightweight orchestration)
├── types/, config/, constants/, hooks/, utils/  # Foundation
├── components/
│   ├── shared/          # Section-wide components
│   └── modals/
└── features/            # Self-contained feature modules
    ├── feature1/
    │   ├── index.tsx
    │   ├── components/
    │   ├── hooks/
    │   ├── types.ts
    │   └── constants.ts
    ├── feature2/
    └── index.ts
```

**When**: Multiple independent sub-features, high complexity
**Example**: Metrics section (widgets are features)
**Key Pattern**: Each feature is self-contained module with own organization

---

## Component Organization Decision Tree

```
How many files in /components/?
├─ < 5 files → Keep flat ✅
├─ 5-10 files → Watch for growth ⚠️
└─ 10+ files → Organize by type ❌

Which component type has 3+ files?
├─ 3+ modals → Create /modals/
├─ 3+ forms → Create /forms/
├─ 3+ cards → Create /cards/
├─ 5+ cells → Create /cells/
└─ All types < threshold → Keep flat
```

## Naming Conventions

### Directories

```
✅ components/        # Plural, lowercase
✅ types/            # Plural, lowercase
✅ subscription/     # Singular feature, lowercase

❌ component/        # Not plural
❌ Components/       # Not lowercase
```

### Files

```
✅ StatusCell.tsx              # PascalCase
✅ useVulnerabilityFilters.ts  # camelCase + use prefix
✅ vulnerability.types.ts      # camelCase + .types suffix
✅ ScanSettingsTab.tsx         # Tab suffix

❌ status-cell.tsx             # Not kebab-case
❌ types.ts                    # Too generic
❌ ScanSettings.tsx            # Missing Tab suffix
```

### Component Suffixes

| Suffix  | Usage           |
| ------- | --------------- |
| `Tab`   | Tab components  |
| `Cell`  | Table cells     |
| `Modal` | Modal dialogs   |
| `Form`  | Forms           |
| `Card`  | Card components |

## Subdirectory Thresholds

**When to create component subdirectories:**

| Subdirectory  | Threshold              | Purpose               |
| ------------- | ---------------------- | --------------------- |
| `tabs/`       | 3+ tab components      | Tab panel components  |
| `cells/`      | 5+ cell renderers      | Table cell components |
| `modals/`     | 3+ modals              | Modal dialogs         |
| `forms/`      | 3+ forms               | Form components       |
| `cards/`      | 4+ cards               | Card components       |
| `primitives/` | 5+ reusable primitives | Base building blocks  |

**Feature subdirectory threshold**: 5+ related files AND logically independent

## Migration Strategy

### From Tier 1 → Tier 2 (Add Tabs)

**Trigger**: Section grows to 20+ files OR adds 3+ tabs

**Actions**:

1. Create `/tabs/` directory
2. Extract tab components
3. Create `/components/` if not exists
4. Organize existing components by threshold

### From Tier 2 → Tier 3 (Extract Hooks)

**Trigger**: Main index.tsx > 300 lines OR complex business logic

**Actions**:

1. Create `/hooks/` directory
2. Extract logic from components to custom hooks
3. Organize components by UI pattern (cells, modals, actions)
4. Create `/types/` directory for domain-specific types

### From Tier 3 → Tier 4 (Feature Modules)

**Trigger**: Section has 80+ files OR 3+ independent features

**Actions**:

1. Identify self-contained features (widgets, domains)
2. Create `/features/` or domain-specific directories
3. Each feature gets full internal structure
4. Extract shared code to section-level directories

## Shareability Levels

**Level 1: Section-Scoped**

- Location: `sections/[name]/components/`
- Used only within this section

**Level 2: Multi-Section Shared**

- Location: `sections/components/`
- Used across 2-3 sections

**Level 3: Design System**

- Location: `@praetorian-chariot/ui`
- Used application-wide

**Never mix levels in same directory.**

## Testing Organization

**Co-locate tests with code:**

```
components/
├── ComponentA.tsx
└── __tests__/
    └── ComponentA.test.tsx

hooks/
├── useFeature.ts
└── __tests__/
    └── useFeature.test.tsx
```

**Section-level tests:**

```
section/
└── __tests__/
    ├── integration.test.tsx
    ├── fixtures/
    └── mocks/
```

## Quick Reference: Settings Migration

**Current (Poor Organization)**:

```
settings/
├── components/ (21 mixed files) ❌
└── 10 orphaned root files ❌
```

**Target (Tier 2 Organized)**:

```
settings/
├── tabs/
├── components/
│   ├── primitives/
│   ├── cards/
│   ├── forms/
│   ├── modals/
│   ├── sections/
│   └── integrations/
├── subscription/ (feature)
├── constants.ts
└── types.ts
```

## Common Mistakes

### Mistake 1: Premature Subdirectories

Creating `/modals/` with only 1-2 modals. Wait for threshold (3+).

### Mistake 2: Generic Naming

`types.ts` instead of `vulnerability.types.ts`. Use domain prefixes.

### Mistake 3: Wrong Tier

Organizing 15-file section with Tier 4 feature modules. Use simplest tier that fits.

### Mistake 4: Mixing Shareability

Section-specific and multi-section shared in same directory. Separate by reusability level.

### Mistake 5: Deep Nesting

Going 5+ levels deep. Stop at 3-4 levels maximum.

## Real-World Pattern: Metrics (Gold Standard)

```
metrics/ (Tier 4: Feature Module)
├── index.tsx (162 lines - lightweight)
├── types/, config/, constants/, hooks/, utils/
├── components/
│   └── modals/
└── widgets/ (features)
    ├── assets/, remediation/, vulnerabilities/
```

**Why it works:**

- Clear separation of concerns
- Scalable to 100+ files
- Easy to find components
- Self-contained widgets
- Comprehensive test coverage

**Apply this pattern when your section reaches 80+ files with independent features.**

## Depth Guidelines

**Maximum depth: 3-4 levels**

```
✅ GOOD (3 levels):
section/components/modals/[files]

⚠️ ACCEPTABLE (4 levels):
section/features/feature1/components/[files]

❌ TOO DEEP (5+ levels):
section/features/feature1/components/cards/[files]
```

**When hitting max depth**: Extract feature to root or flatten hierarchy.

## File Count Warning Thresholds

| Directory          | Warning   | Action                             |
| ------------------ | --------- | ---------------------------------- |
| Section root       | 15+ files | Create subdirectories              |
| `components/` root | 10+ files | Organize by type                   |
| `hooks/` root      | 15+ files | Create specialized subdirs         |
| Any subdirectory   | 20+ files | Split by domain or extract feature |

## Cross-Section Consistency

**All sections should have:**

- Same root-level directories (types, config, constants, hooks, utils, components)
- Same component subdirectory names (tabs, cells, modals, forms, cards)
- Same naming conventions (PascalCase components, camelCase utilities)
- Same barrel export pattern (index.ts files)

**Consistency enables:**

- Predictable file locations across sections
- Easier navigation for developers
- Transferable patterns between features
- Reduced onboarding time

## The Bottom Line

Structure follows complexity. Start simple (Tier 1), evolve as needed (Tier 2→3→4). Use file count thresholds to trigger organization improvements. Follow metrics/vulnerabilities patterns for complex sections.

**Gold Standards**:

- **Tier 4**: Metrics section (feature modules)
- **Tier 3**: Vulnerabilities section (hook-based)
- **Tier 2**: Settings section (after proposed refactoring)
