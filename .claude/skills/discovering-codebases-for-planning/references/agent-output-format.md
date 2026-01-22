# Agent Output Format - Structured Tables for Discovery

**Purpose**: Standardize agent output to enable automated synthesis in Stage 3.

**Why structured tables**: Enables parsing, deduplication, and merging across multiple agent reports.

---

## Output File Naming

```
discovery-{component-name}.md
```

**Component name**: Derived from path, kebab-case

**Examples**:

- `modules/chariot/ui/src/features/metrics` → `discovery-metrics-frontend.md`
- `modules/chariot/backend/pkg/metrics` → `discovery-metrics-backend.md`
- `modules/janus/pkg/scanner` → `discovery-janus-scanner.md`

---

## Required Sections

Every discovery report MUST include these sections (even if empty):

1. Component Overview
2. Existing Code to Extend
3. Utilities to Reuse
4. Patterns to Follow
5. File Placement Guidance
6. Anti-Patterns to Avoid

**If a section has no findings**: Include section with "None found" or empty table.

---

## Section 1: Component Overview

**Format**: Prose + metadata list

**Content**:

```markdown
## Component Overview

**Path**: `modules/chariot/ui/src/features/metrics`

**Files Analyzed**: 23 TypeScript files

**Primary Purpose**: Metrics dashboard UI implementation. Displays vulnerability trends, asset counts, and risk scores via interactive charts.

**Tech Stack**: React 19, TypeScript, TanStack Query, Recharts

**Dependencies**:

- `src/hooks/useMetrics.ts` (data fetching)
- `src/utils/formatters.ts` (date/number formatting)
- `src/components/charts/` (shared chart components)
```

**Purpose**: Provide context for synthesis phase. Helps understand component's role in the feature.

---

## Section 2: Existing Code to Extend

**Format**: Markdown table

**Columns**:

1. Name (function/class/component name)
2. Location (file path + function/class name, NO line numbers)
3. Current Purpose (what it does now)
4. Extension Point (how to modify for this feature)

**Example**:

```markdown
## 2. Existing Code to Extend

| Name              | Location                                                             | Current Purpose              | Extension Point                      |
| ----------------- | -------------------------------------------------------------------- | ---------------------------- | ------------------------------------ |
| MetricsDashboard  | Dashboard.tsx - MetricsDashboard component                           | Display vulnerability trends | Add filter controls for date ranges  |
| useMetrics        | hooks/useMetrics.ts - useMetrics hook                                | Fetch metrics from API       | Add parameters for filtering         |
| getMetricsHandler | backend/pkg/metrics/handlers/get_metrics.go - GetMetricsHandler func | Return all metrics           | Add query string parsing for filters |
```

**If no code to extend**:

```markdown
## 2. Existing Code to Extend

No existing code identified for extension. This is a greenfield component.
```

---

## Section 3: Utilities to Reuse

**Format**: Markdown table

**Columns**:

1. Name (function name)
2. Location (file path + function name)
3. Signature (function signature with types)
4. Use Case (when to use it)

**Example**:

```markdown
## 3. Utilities to Reuse

| Name         | Location                           | Signature                                    | Use Case                                |
| ------------ | ---------------------------------- | -------------------------------------------- | --------------------------------------- |
| formatDate   | utils/formatters.ts - formatDate   | `(date: Date, format?: string) => string`    | Format all timestamps in dashboard      |
| formatNumber | utils/formatters.ts - formatNumber | `(num: number, decimals?: number) => string` | Format metric values (e.g., 1.2K)       |
| useDebounce  | hooks/useDebounce.ts - useDebounce | `<T>(value: T, delay: number) => T`          | Debounce filter input changes           |
| apiClient    | lib/api.ts - apiClient             | `{ get, post, put, delete }`                 | All API calls - don't create new client |
```

**If no utilities to reuse**:

```markdown
## 3. Utilities to Reuse

No shared utilities identified. Consider extracting common patterns if duplication occurs.
```

---

## Section 4: Patterns to Follow

**Format**: Markdown table

**Columns**:

1. Pattern (pattern name/description)
2. Description (what the pattern enforces)
3. Example Location (where it's demonstrated)

**Example**:

```markdown
## 4. Patterns to Follow

| Pattern                    | Description                                                            | Example Location                            |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| Feature-based organization | All feature code (components, hooks, utils) colocates in `features/X/` | `features/metrics/`, `features/assets/`     |
| TanStack Query for API     | Use `useQuery` for GET, `useMutation` for POST/PUT/DELETE              | `hooks/useMetrics.ts`, `hooks/useAssets.ts` |
| Barrel exports             | Each feature exports via `index.ts` barrel                             | `features/metrics/index.ts`                 |
| Component file structure   | One component per file, matching filename (PascalCase)                 | `Dashboard.tsx` exports `MetricsDashboard`  |
| Error boundaries           | Wrap async components with React Suspense + ErrorBoundary              | `App.tsx` - Suspense wrapper pattern        |
```

**If no patterns to follow**:

```markdown
## 4. Patterns to Follow

No established patterns identified. Recommend following industry best practices for React/TypeScript.
```

---

## Section 5: File Placement Guidance

**Format**: Prose (not table)

**Content**: WHERE to place new code, with rationale.

**Example**:

```markdown
## 5. File Placement Guidance

### New React Components

**Recommendation**: Place in `features/metrics/components/`

**Rationale**: Existing metrics components follow feature-based organization. All metrics-related UI colocates here for easy discovery and maintenance.

**Naming**: Use PascalCase, descriptive names matching component purpose:

- ✅ `MetricsDashboardFilter.tsx`
- ✅ `MetricsTrendChart.tsx`
- ❌ `Filter.tsx` (too generic)

### New Custom Hooks

**Recommendation**:

- Feature-specific hooks → `features/metrics/hooks/`
- Reusable across features → `hooks/`

**Rationale**: Keep domain logic close to components. Only promote to shared `hooks/` if 2+ features use it.

**Naming**: Prefix with `use`, camelCase:

- ✅ `useMetricsFilter.ts`
- ✅ `useMetricsExport.ts`

### New Utilities

**Recommendation**:

- Metrics-specific → `features/metrics/utils/`
- Generic formatters/validators → `utils/`

**Rationale**: Avoid premature abstraction. Start in feature directory, refactor to shared if reused.
```

**If no guidance**:

```markdown
## 5. File Placement Guidance

No existing patterns to guide placement. Recommend following standard React project structure.
```

---

## Section 6: Anti-Patterns to Avoid

**Format**: Bulleted list with rationale

**Content**: Specific code smells, deprecated patterns, or duplications to NOT replicate.

**Example**:

```markdown
## 6. Anti-Patterns to Avoid

- **Do not duplicate MetricsContext** - Extend the existing Context instead of creating a new one. Found in 2 places but should be unified.

- **Do not use fetch directly** - Always use the `apiClient` wrapper. Direct fetch calls found in legacy code lack auth headers and error handling.

- **Do not create inline data transformations** - Extract to utility functions for testability. Found in `Dashboard.tsx` lines 45-67 (candidate for refactor).

- **Do not mix feature and shared code** - Keep feature-specific logic in `features/metrics/`, not in shared `components/` or `hooks/`. Violation found in `components/MetricsCard.tsx` (should move to `features/metrics/`).

- **Do not use deprecated `useState` for server state** - TanStack Query is the standard. Found in older components that predate Query adoption.
```

**If no anti-patterns**:

```markdown
## 6. Anti-Patterns to Avoid

No significant anti-patterns identified. Codebase follows consistent standards.
```

---

## Formatting Requirements

### Table Alignment

Use Prettier-compatible table alignment:

```bash
npx prettier --write discovery-*.md
```

**Before**:

```
| Name | Location | Purpose |
|---|---|---|
| foo | bar.ts | baz |
```

**After**:

```
| Name | Location | Purpose |
| ---- | -------- | ------- |
| foo  | bar.ts   | baz     |
```

### Code Reference Pattern

**❌ NEVER use line numbers**:

```
Dashboard.tsx:45-67
```

**✅ ALWAYS use function/class names**:

```
Dashboard.tsx - MetricsDashboard component
utils.ts - formatDate function
handlers.go - GetMetricsHandler func
```

**Rationale**: Line numbers drift with every code change. Function/class names are stable identifiers.

---

## Validation Checklist

Before submitting discovery report, verify:

- [ ] File named `discovery-{component-name}.md`
- [ ] All 6 sections present (even if some are empty)
- [ ] Tables use 3+ columns (Name, Location, Purpose/Description minimum)
- [ ] No line numbers in Location column (use function/class names)
- [ ] Tables formatted with Prettier (aligned columns)
- [ ] Anti-patterns are SPECIFIC (not generic advice like "write good code")
- [ ] File placement guidance includes RATIONALE (not just "put it here")

---

## Example Reports

See [examples/agent-reports/](../examples/agent-reports/) for complete examples:

- `discovery-metrics-frontend.md` - React/TypeScript component (high reuse)
- `discovery-metrics-backend.md` - Go API handler (moderate reuse)
- `discovery-janus-scanner.md` - Security scanner integration (greenfield)

Each example demonstrates:

- Complete section coverage
- Proper table formatting
- Specific, actionable findings
- Rationale for recommendations
