# Splitting Large Research Outputs

**🚨 CRITICAL: Each reference file MUST be <400 lines.**

When research returns large documents (API docs, advanced patterns, etc.), split them logically into multiple files following progressive disclosure patterns.

---

## Splitting Strategy

**Phase 1: Assess size** - If a category would exceed 400 lines, split is required.

**Phase 2: Split by logical groupings:**

| Original File          | Split Into                                                                     | Criteria               |
| ---------------------- | ------------------------------------------------------------------------------ | ---------------------- |
| `api-reference.md`     | `api-core.md`, `api-hooks.md`, `api-utilities.md`                              | By API category/module |
| `advanced-patterns.md` | `patterns-performance.md`, `patterns-error-handling.md`, `patterns-testing.md` | By concern             |
| `workflow.md`          | `workflow-setup.md`, `workflow-implementation.md`, `workflow-deployment.md`    | By phase               |
| `configuration.md`     | `config-local.md`, `config-cloud.md`, `config-security.md`                     | By environment/concern |

**Phase 3: Update SKILL.md links** - Point to the split files, not the original.

---

## Example: Splitting Large API Documentation

Research returns 650 lines of API documentation. Split by module:

```
references/
├── api-core.md (180 lines)        # Core methods: create, read, update, delete
├── api-hooks.md (220 lines)       # React hooks: useQuery, useMutation, useInfiniteQuery
├── api-utilities.md (150 lines)   # Helper functions: QueryClient, hydration, devtools
└── api-advanced.md (100 lines)    # Advanced: custom fetchers, retry logic, cache manipulation
```

**SKILL.md references:**

```markdown
## API Reference

- [Core API](references/api-core.md) - CRUD operations
- [Hooks API](references/api-hooks.md) - React integration
- [Utilities](references/api-utilities.md) - Helper functions
- [Advanced](references/api-advanced.md) - Custom configurations
```

---

## File Naming Convention for Split Files

```
{category}-{subcategory}.md

Examples:
- api-core.md, api-hooks.md, api-advanced.md
- patterns-performance.md, patterns-caching.md
- workflow-phase1.md, workflow-phase2.md
```

---

## Common Split Patterns

### API Documentation (by module)

| Module Type    | File Name          | Content                            |
| -------------- | ------------------ | ---------------------------------- |
| Core/CRUD      | `api-core.md`      | Basic operations, primary methods  |
| Hooks          | `api-hooks.md`     | React hooks, state management      |
| Utilities      | `api-utilities.md` | Helper functions, type definitions |
| Advanced       | `api-advanced.md`  | Complex configurations, edge cases |
| Authentication | `api-auth.md`      | Auth methods, token handling       |

### Patterns (by concern)

| Concern          | File Name                    | Content                             |
| ---------------- | ---------------------------- | ----------------------------------- |
| Performance      | `patterns-performance.md`    | Optimization, caching, lazy loading |
| Error Handling   | `patterns-error-handling.md` | Error boundaries, retry logic       |
| Testing          | `patterns-testing.md`        | Test utilities, mocking patterns    |
| State Management | `patterns-state.md`          | State patterns, derived state       |

### Workflow (by phase)

| Phase          | File Name                    | Content                     |
| -------------- | ---------------------------- | --------------------------- |
| Setup          | `workflow-setup.md`          | Installation, configuration |
| Implementation | `workflow-implementation.md` | Core development steps      |
| Testing        | `workflow-testing.md`        | Test writing, validation    |
| Deployment     | `workflow-deployment.md`     | Build, deploy, monitoring   |

---

## Verification After Splitting

```bash
# Verify ALL reference files are 50-400 lines
for file in references/*.md; do
  lines=$(wc -l < "$file")
  if [ "$lines" -lt 50 ]; then
    echo "❌ FAIL: $file has $lines lines (min: 50)"
    exit 1
  elif [ "$lines" -gt 400 ]; then
    echo "❌ FAIL: $file has $lines lines (max: 400) - MUST SPLIT"
    exit 1
  else
    echo "✅ PASS: $file has $lines lines"
  fi
done
```

---

## Anti-Patterns

| Anti-Pattern                      | Why It's Wrong                        | Fix                                |
| --------------------------------- | ------------------------------------- | ---------------------------------- |
| Keep 500+ line file "temporarily" | Blocks Phase 7, causes context issues | Split immediately when detected    |
| Split alphabetically              | Loses logical grouping                | Split by concern/module/phase      |
| Create too many small files (<50) | Fragments knowledge                   | Combine related content            |
| Duplicate content across splits   | Maintenance burden                    | Single source of truth per concept |
| Skip updating SKILL.md links      | Broken references                     | Update all links after split       |

---

## Related

- [Research Integration](research-integration.md) - Main research workflow
- [Line Count Limits](.claude/skills/managing-skills/references/patterns/line-count-limits.md) - Complete thresholds
- [Progressive Disclosure](.claude/skills/managing-skills/references/progressive-disclosure.md) - Content organization
