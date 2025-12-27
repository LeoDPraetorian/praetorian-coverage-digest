# Phase 1: Description Format

## What It Checks

**Name validation:**

- Lowercase letters, numbers, hyphens only
- Maximum 64 characters
- No leading/trailing hyphens
- No consecutive hyphens

**Description validation:**

- Must start with "Use when..." or "Use this skill when..."
- Maximum 1024 characters (hard limit)
- Single-line format only (no YAML block scalars: `>-`, `|`, `>`)
- Third-person voice (no "you", "your")
- Appropriate length for complexity (200-800 chars based on skill type)

## Why It Matters

**CRITICAL: Claude Code cannot parse YAML block scalars.**

When a skill uses:

```yaml
description: >-
  Use when doing something...
```

Claude sees an **empty description**. The skill exists but Claude doesn't know when to use it because the description field is empty to the parser.

**Historical impact:** 116 of 147 skills (79%) had broken descriptions using `>-` block scalars.

## Detection Patterns

### CRITICAL Issues

**1. YAML Block Scalars**

```yaml
# All of these break Claude Code:
description: >-   # Folded scalar with strip
description: |    # Literal scalar
description: >    # Folded scalar
description: |-   # Literal with strip
```

**2. Missing Description**

```yaml
# No description field at all
---
name: my-skill
---
```

**3. Invalid YAML**

```yaml
description: Use when: doing something  # Colon causes parse error
```

### WARNING Issues

**1. Doesn't Start with "Use when"**

```yaml
description: This skill helps with data processing...
# Should be: Use when processing data...
```

**2. First/Second Person Voice**

```yaml
description: Use when you need to process data...  # "you"
description: Use this to help your workflow...     # "your"
```

**3. Length Issues**

```yaml
# Too short for complex skill (missing keywords)
description: Use when testing React components  # 38 chars, but skill covers Playwright, fixtures, page objects, etc.

# Too long (exceeds 1024 limit)
description: Use when implementing... [1100 characters]
```

### INFO Issues

**1. Suboptimal Length for Complexity**

```yaml
# Complex skill with simple description (400 chars)
# Should be 600-800 chars to include all keywords for discovery
```

## Auto-Fix Capability

❌ **NOT auto-fixable** - requires semantic understanding and domain knowledge:

**Why not auto-fixable:**

- Converting `>-` to single-line: Needs intelligent line joining
- Rewriting to start with "Use when": Requires understanding skill purpose
- Voice conversion: Needs content rewriting (you → third person)
- Length optimization: Requires keyword analysis and prioritization

**Solution**: Defer to `claude-skill-write` for manual remediation.

## Examples

### Example 1: YAML Block Scalar (CRITICAL)

**Before:**

```yaml
description: >-
  Use when implementing TanStack Query v5
  data fetching patterns with useQuery,
  useMutation, and useInfiniteQuery.
```

**Issues**: Uses `>-` block scalar - Claude sees empty description

**After:**

```yaml
description: Use when implementing TanStack Query v5 data fetching patterns with useQuery, useMutation, useInfiniteQuery for React applications - handles query caching, mutations, infinite scrolling, optimistic updates, error handling, retry logic.
```

**Fixed**: Single-line, includes keywords, under 1024 chars

### Example 2: Wrong Voice (WARNING)

**Before:**

```yaml
description: Use when you need to debug React components and hooks
```

**Issues**: Second person ("you need to")

**After:**

```yaml
description: Use when debugging React components and hooks - systematic troubleshooting for useState, useEffect, custom hooks, rendering issues.
```

**Fixed**: Third person, added keywords

### Example 3: Complexity Mismatch (INFO)

**Before (complex skill with simple description):**

```yaml
description: Use when testing with Playwright # 38 chars
```

**Issues**: Skill covers fixtures, page objects, assertions, test organization - but description too short for discovery

**After:**

```yaml
description: Use when testing with Playwright - implements page object model, fixtures, test organization, assertions, test data management, parallel execution, screenshot capture, trace collection for E2E testing.
```

**Fixed**: 210 chars, includes all major features for keyword matching

## Edge Cases

**1. Multi-Domain Skills**

Skills covering multiple areas need comprehensive keywords:

```yaml
# Bad: Generic
description: Use when working with authentication

# Good: Specific
description: Use when implementing authentication - JWT tokens, OAuth2, Cognito integration, session management, token refresh, RBAC, API key authentication
```

**2. Migration Skills**

Include version numbers and breaking changes:

```yaml
description: Use when migrating from React Query v4 to v5 - handles breaking changes (onSuccess removed, suspense enabled by default, initialPageParam required), updates query/mutation syntax, refactors infinite queries
```

**3. Error-Driven Skills**

Include actual error messages users will see:

```yaml
description: Use when encountering "initialPageParam is required" error in useInfiniteQuery, fixing "onSuccess is not a function" after v5 upgrade, resolving stale data issues
```

## Manual Remediation Steps

**For YAML block scalar violations:**

1. Copy the multiline description content
2. Join lines with spaces: `line1 line2 line3`
3. Remove extra whitespace: `s/\s+/ /g`
4. Ensure starts with "Use when..."
5. Verify under 1024 characters
6. Check third person voice
7. Test: Parse YAML to confirm no errors

**For voice violations:**

1. Replace "you/your" patterns:
   - "you need to" → omit or use third person
   - "your workflow" → "workflows"
   - "helps you" → "provides" or "enables"

2. Rewrite in third person:
   - "Use when you're debugging" → "Use when debugging"
   - "When you encounter" → "When encountering"

**For length optimization:**

1. Assess skill complexity (simple/moderate/complex)
2. Target appropriate range (200-400 / 400-600 / 600-800)
3. Add keywords without fluff:
   - Error messages users see
   - API/function names
   - Symptoms and patterns
   - Related technologies
4. Avoid over-reduction trap (keep essential keywords)

## Related Phases

- [Phase 3: Word Count](phase-03-word-count.md) - Affects overall description length strategy
- [Phase 2: Allowed-Tools](phase-02-allowed-tools.md) - Required field, often missing
- CSO Optimization (in claude-skill-write) - Keyword optimization techniques

## Quick Reference

| Issue                    | Severity | Auto-Fix | Solution                  |
| ------------------------ | -------- | -------- | ------------------------- |
| YAML block scalar (`>-`) | CRITICAL | ❌       | claude-skill-write        |
| Missing "Use when"       | WARNING  | ❌       | claude-skill-write        |
| Wrong voice (you/your)   | WARNING  | ❌       | claude-skill-write        |
| Length suboptimal        | INFO     | ❌       | claude-skill-write        |
| Exceeds 1024 chars       | CRITICAL | ❌       | claude-skill-write (trim) |
