# File Scope Boundaries

**Parallel agent conflict prevention for integration development.**

**This file provides:** Complete file scope boundary protocol for integration development.

---

## Overview

When spawning parallel agents, define non-overlapping file scopes to prevent conflicts. Integration development is primarily sequential within a single vendor integration, but parallel execution occurs during review and testing phases.

---

## Integration File Scope Matrix

| Agent Type            | File Scope                                                    | Access Mode | Phase |
| --------------------- | ------------------------------------------------------------- | ----------- | ----- |
| Explore               | `modules/chariot/backend/pkg/integrations/`                   | READ-ONLY   | 3     |
| integration-lead      | Output directory only                                         | WRITE       | 7     |
| security-lead         | Output directory only                                         | WRITE       | 7     |
| integration-developer | `modules/chariot/backend/pkg/integrations/{vendor}/`          | READ-WRITE  | 8     |
| integration-reviewer  | `modules/chariot/backend/pkg/integrations/{vendor}/`          | READ-ONLY   | 11    |
| backend-security      | `modules/chariot/backend/pkg/integrations/{vendor}/`          | READ-ONLY   | 11    |
| backend-tester        | `modules/chariot/backend/pkg/integrations/{vendor}/*_test.go` | READ-WRITE  | 13    |

---

## Integration File Structure

Standard integration creates these files:

```
modules/chariot/backend/pkg/integrations/{vendor}/
├── {vendor}.go           # Main integration logic (EXCLUSIVE: integration-developer)
├── client.go             # API client (EXCLUSIVE: integration-developer)
├── collector.go          # Asset/risk collection (EXCLUSIVE: integration-developer)
├── types.go              # Vendor-specific types (EXCLUSIVE: integration-developer)
├── {vendor}_test.go      # Unit tests (EXCLUSIVE: backend-tester)
└── testdata/             # Test fixtures (EXCLUSIVE: backend-tester)
    └── *.json
```

---

## Shared Files (Conflict Risk)

These files are modified during integration development - require coordination:

| File                                                   | Risk                     | Mitigation            |
| ------------------------------------------------------ | ------------------------ | --------------------- |
| `modules/chariot/backend/pkg/integrations/registry.go` | Integration registration | Lock before modifying |
| `modules/chariot/backend/pkg/integrations/types.go`    | Shared types             | Lock before modifying |
| `modules/chariot/backend/pkg/secrets/secrets.go`       | Credential constants     | Sequential edits only |
| `modules/chariot/ui/src/sections/integrations/`        | Frontend integration UI  | Separate workflow     |

---

## P0 Compliance File Checks

Integration development has P0 requirements that affect specific files:

| P0 Requirement         | File(s) Affected | Agent                 |
| ---------------------- | ---------------- | --------------------- |
| VMFilter               | `{vendor}.go`    | integration-developer |
| CheckAffiliation       | `{vendor}.go`    | integration-developer |
| errgroup               | `collector.go`   | integration-developer |
| Pagination             | `client.go`      | integration-developer |
| ValidateCredentials    | `{vendor}.go`    | integration-developer |
| Error Handling         | All `.go` files  | integration-developer |
| File Size (<500 lines) | All `.go` files  | integration-reviewer  |

---

## Parallel Execution Safety

### Safe to Parallelize

- integration-lead + security-lead (separate output files in Phase 7)
- integration-reviewer + backend-security (READ-ONLY, same paths OK)
- Multiple testers on different test files (if multiple test files exist)

### Requires Sequential Execution

- Any agent modifying registry.go or shared types
- integration-developer (single integration at a time)
- Frontend integration work (separate workflow, not parallel with backend)

---

## Related References

- [file-conflict-protocol.md](file-conflict-protocol.md) - Conflict detection algorithm
- [file-locking.md](file-locking.md) - Lock mechanism
- [p0-compliance.md](p0-compliance.md) - P0 requirements checklist
