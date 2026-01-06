---
name: optimizing-typescript-performance
description: Use when diagnosing slow TypeScript builds (>1 min), type instantiation depth errors, IDE performance issues, or optimizing compiler performance in large codebases and monorepos
allowed-tools: Read, Bash, Grep, Glob
---

# Optimizing TypeScript Performance

**Systematic approach to diagnosing and fixing TypeScript compiler performance issues in large codebases.**

## Quick Reference

| Performance Issue                    | Diagnostic Tool             | Primary Solution                |
| ------------------------------------ | --------------------------- | ------------------------------- |
| Build times >1 minute                | `tsc --diagnostics`         | Project references, incremental |
| Type instantiation depth error       | Code review                 | Add recursion depth limits      |
| Out of memory                        | `NODE_OPTIONS` heap size    | Split projects, skip lib checks |
| IDE freezing/slow autocomplete       | `tsc --generateTrace`       | Exclude patterns, restart TS    |
| Excessive type instantiation warning | `tsc --extendedDiagnostics` | Simplify types, add caching     |
| Large union types slow               | Profile with trace          | Break down unions, use literals |

## When to Use This Skill

Use when experiencing:

- **Build time issues**: TypeScript compilation >1 minute (local or CI)
- **Compilation errors**: "Type instantiation is excessively deep and possibly infinite"
- **Memory errors**: Out of heap memory during `tsc` execution
- **IDE degradation**: Slow autocomplete, hover tooltips timing out, unresponsive editor
- **Monorepo challenges**: Multiple TypeScript projects with shared dependencies (Chariot: 16 submodules)
- **Generated code**: Large type files from code generation tools (Tabularium schema types)

**You MUST use TodoWrite before starting** to track diagnostic, optimization, and measurement steps.

**Red flags requiring immediate optimization:**

- CI build timeout due to TypeScript compilation
- Developers disabling type checking to "get work done"
- IDE TypeScript server frequently crashing
- Build times increasing linearly with codebase growth

## Core Problem This Solves

TypeScript compiler performance issues manifest in four critical scenarios:

### Scenario 1: 10-Minute Build Times in CI

**Symptom**: CI pipeline spends majority of time on `tsc` step
**Root causes**: No incremental builds, checking all libraries, no project references
**Impact**: Slow feedback loop, blocked deployments

### Scenario 2: IDE Freezes on Hover

**Symptom**: TypeScript language server unresponsive when hovering over types
**Root causes**: Complex type inference, deeply nested types, large union expansion
**Impact**: Developer productivity loss, frustration

### Scenario 3: Type Instantiation Depth Error

```
error TS2589: Type instantiation is excessively deep and possibly infinite.
```

**Root causes**: Recursive types without depth limits, deeply nested conditional types
**Impact**: Compilation failure, blocked development

### Scenario 4: Out of Memory Errors

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Root causes**: Large type files, excessive type widening, monorepo without project split
**Impact**: Cannot compile, local development blocked

## Progressive Disclosure

**Quick start (15 min):**

- Run diagnostics to identify bottleneck
- Apply targeted optimization (skip lib checks, incremental)
- Measure improvement

**Comprehensive optimization (60 min):**

- Full diagnostic analysis (`--generateTrace`)
- Type-level refactoring (recursive types, depth limits)
- Project architecture changes (project references)
- CI/CD optimization

**Deep dives (references/):**

- [Diagnostic Tools Reference](references/diagnostic-tools.md) - Complete guide to `--diagnostics`, `--extendedDiagnostics`, `--generateTrace`
- [Type-Level Optimizations](references/type-optimizations.md) - Tail recursion, caching, depth limits
- [Project Configuration](references/project-config.md) - Project references, incremental compilation, composite projects
- [Chariot-Specific Patterns](references/chariot-patterns.md) - Tabularium, 16-submodule monorepo, real performance wins

## Diagnostic Workflow

### Step 1: Run Basic Diagnostics

```bash
npx tsc --diagnostics
```

**Key metrics to capture:**

```text
Files:            542
Lines:            148234
Identifiers:      52341
Symbols:          47892
Types:            18234
Instantiations:   94532
Memory used:      387234K
I/O Read time:    0.23s
Parse time:       2.34s
Bind time:        1.12s
Check time:       12.45s  ← PRIMARY BOTTLENECK
Emit time:        0.89s
Total time:       16.80s
```

**Analysis**: If `Check time` > 70% of total time → type-level optimization needed

### Step 2: Extended Diagnostics (Detailed Breakdown)

```bash
npx tsc --extendedDiagnostics
```

Output includes per-phase timings and type instantiation counts. Look for:

- High instantiation counts (>100k) → complex generic types
- Excessive type widening → use `unknown` instead of `any`
- Large symbol counts → split large files

### Step 3: Generate Performance Trace (Deep Analysis)

```bash
npx tsc --generateTrace trace-output
```

Generates Chrome DevTools-compatible trace files in `trace-output/` directory.

**Analyze with:**

```bash
npm install -g @typescript/analyze-trace
analyze-trace trace-output
```

Outputs:

- Top expensive types (by instantiation cost)
- Hot files (most type checking time)
- Type expansion depth

**See:** [references/diagnostic-tools.md](references/diagnostic-tools.md) for complete analysis workflow

## Common Performance Bottlenecks

### 1. Deeply Nested Conditional Types

❌ **Problem:**

```typescript
type DeepPick<T, K> = K extends `${infer First}.${infer Rest}`
  ? First extends keyof T
    ? { [P in First]: DeepPick<T[First], Rest> }
    : never
  : K extends keyof T
    ? { [P in K]: T[K] }
    : never;
```

✅ **Solution:** Add depth limit and simplify

```typescript
type DeepPick<T, K, Depth extends number = 5> = Depth extends 0
  ? never
  : K extends `${infer First}.${infer Rest}`
    ? First extends keyof T
      ? { [P in First]: DeepPick<T[First], Rest, Prev<Depth>> }
      : never
    : K extends keyof T
      ? { [P in K]: T[K] }
      : never;

type Prev<T extends number> = [-1, 0, 1, 2, 3, 4, 5][T];
```

### 2. Excessive Type Instantiation (Large Unions)

❌ **Problem:** Union with 100+ members expands exponentially

```typescript
type EventType = "click" | "hover" | "focus";
/* ... 97 more literals ... */

type Handler<T> = T extends EventType ? (event: T) => void : never;
```

✅ **Solution:** Use discriminated unions or branded types

```typescript
type EventType = string & { __brand: "EventType" };
type Handler = (event: EventType) => void;
```

### 3. Recursive Types Without Limits

❌ **Problem:** Infinite recursion

```typescript
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };
```

TypeScript recursion limit: **50 depth** (default)

✅ **Solution:** Add explicit depth constraint

```typescript
type JSONValue<Depth extends number = 10> = Depth extends 0
  ? never
  :
      | string
      | number
      | boolean
      | null
      | JSONValue<Prev<Depth>>[]
      | { [key: string]: JSONValue<Prev<Depth>> };
```

## Type-Level Optimizations

### Cache Complex Type Computations

❌ **Recomputing on every usage:**

```typescript
function process<T>(data: T extends Array<infer U> ? U : never) {}
```

✅ **Cache with type alias:**

```typescript
type Unwrap<T> = T extends Array<infer U> ? U : never;
function process<T>(data: Unwrap<T>) {}
```

### Use `unknown` Instead of `any` for Inference

❌ **Problem:** `any` triggers excessive type widening

```typescript
function parse(data: any): any {
  return JSON.parse(data);
}
```

✅ **Solution:** Use `unknown` for controlled inference

```typescript
function parse<T = unknown>(data: string): T {
  return JSON.parse(data) as T;
}
```

**See:** [references/type-optimizations.md](references/type-optimizations.md) for comprehensive type-level patterns

## Project Configuration Optimizations

### Enable Incremental Compilation

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

**Performance gain:** 30-70% faster subsequent builds (only recompiles changed files)

### Skip Library Type Checks

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

**Performance gain:** 20-40% faster builds (skips node_modules .d.ts files)
**Tradeoff:** Miss type errors in dependencies (acceptable for most projects)

### Project References (Monorepos)

**Chariot example:** 16 submodules with shared dependencies

```json
{
  "references": [{ "path": "../shared-types" }, { "path": "../tabularium-client" }]
}
```

**Build with:**

```bash
tsc --build --incremental
```

**Performance gain:** 50-80% faster builds (parallel compilation, dependency caching)

**See:** [references/project-config.md](references/project-config.md) for complete configuration strategies

## Fixing Type Instantiation Depth Errors

### What Causes Them

1. **Recursive types without depth limits**
2. **Deeply nested conditional types** (>10 levels)
3. **Excessive type inference** (large unions with `infer`)

### How to Fix

#### Pattern 1: Add Depth Counter

```typescript
type RecursiveType<T, Depth extends number = 10> = Depth extends 0
  ? never
  : // ... recursive logic with Depth - 1
```

#### Pattern 2: Tail Recursion Optimization

❌ **Head recursion (slow):**

```typescript
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;
```

✅ **Tail recursion (faster):**

```typescript
type Flatten<T, Acc = never> = T extends Array<infer U> ? Flatten<U, Acc | U> : Acc | T;
```

## Out of Memory Errors

### Increase Node Heap Size

```bash
# Temporary (single build)
NODE_OPTIONS="--max-old-space-size=8192" npx tsc

# Permanent (package.json)
"scripts": {
  "build": "NODE_OPTIONS='--max-old-space-size=8192' tsc"
}
```

### Split Large Projects

If single `tsconfig.json` compiles >200k lines:

1. Use project references to split into smaller projects
2. Create separate `tsconfig` per module/domain
3. Use `tsc --build` for dependency-aware compilation

## IDE Performance

### TypeScript Server Tuning

**VS Code settings.json:**

```json
{
  "typescript.tsserver.maxTsServerMemory": 8192,
  "typescript.tsserver.experimental.enableProjectDiagnostics": false,
  "typescript.disableAutomaticTypeAcquisition": true
}
```

### Exclude Patterns in tsconfig

```json
{
  "exclude": ["node_modules", "dist", "build", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Restart TypeScript Server

**VS Code command palette:** TypeScript: Restart TS Server

**Performance gain:** Clears in-memory cache, resolves stale state

## Chariot-Specific Optimizations

### Optimization 1: Tabularium Generated Types

**Problem:** Tabularium code generation creates 5000+ line type files
**Solution:** Split generated types into separate packages with project references

**Before:** Single `types.ts` with all schemas (15k lines, 8s check time)
**After:** Split into `asset-types`, `risk-types`, `job-types` (2s check time per package)

### Optimization 2: Monorepo Project References

**Problem:** 16 submodules with shared dependencies, no build caching
**Solution:** Implement project references with `tsc --build`

**Before:** 12 min full build (all 16 submodules compiled independently)
**After:** 3 min full build, 30s incremental (dependency-aware, parallel compilation)

**See:** [references/chariot-patterns.md](references/chariot-patterns.md) for detailed implementation

## Performance Measurement

### Establish Baseline

```bash
# Measure current performance
time npx tsc --diagnostics > baseline.txt
```

### Apply Optimization

Example: Enable incremental compilation

```json
{
  "compilerOptions": {
    "incremental": true
  }
}
```

### Measure Improvement

```bash
# First build (cold cache)
time npx tsc --diagnostics > optimized-cold.txt

# Second build (warm cache)
time npx tsc --diagnostics > optimized-warm.txt
```

### Calculate Improvement

```bash
# Compare check times
grep "Check time:" baseline.txt optimized-cold.txt optimized-warm.txt
```

**Example result:**

```text
baseline.txt:         Check time:       12.45s
optimized-cold.txt:   Check time:        8.23s  (34% improvement)
optimized-warm.txt:   Check time:        2.45s  (80% improvement)
```

## Anti-Patterns

❌ **Don't**: Apply optimizations randomly without measurement
✅ **Do**: Run diagnostics, identify bottleneck, optimize, measure

❌ **Don't**: Use `any` everywhere to "fix" slow compilation
✅ **Do**: Use targeted type simplification and `unknown`

❌ **Don't**: Disable type checking in production builds without team agreement
✅ **Do**: Use `skipLibCheck` (safe) and measure impact

❌ **Don't**: Ignore type instantiation depth errors with `@ts-ignore`
✅ **Do**: Add depth limits to recursive types

## Related Skills

- `developing-with-tdd` (CORE) - Test performance optimizations with benchmarks
- `debugging-systematically` (CORE) - When optimization doesn't work as expected
- `structuring-workspace-packages` (LIBRARY) - Monorepo project structure patterns

## Changelog

See `.history/CHANGELOG` for version history.
