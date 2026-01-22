# File Scope Boundaries

**Parallel agent conflict prevention for capability development.**

**Purpose**: Parallel agent conflict prevention through non-overlapping file scopes.

---

## Overview

When spawning parallel agents, define non-overlapping file scopes to prevent conflicts. Capability development is primarily sequential within a single capability, but parallel execution occurs during review and testing phases.

---

## Capability File Scope Matrix

Based on `capability_type` from Phase 3:

### VQL Capabilities

| Agent Type           | File Scope                                                   | Access Mode | Phase |
| -------------------- | ------------------------------------------------------------ | ----------- | ----- |
| Explore              | `modules/chariot-aegis-capabilities/`                        | READ-ONLY   | 3     |
| capability-lead      | Output directory only                                        | WRITE       | 7     |
| capability-developer | `modules/chariot-aegis-capabilities/{capability}/`           | READ-WRITE  | 8     |
| capability-reviewer  | `modules/chariot-aegis-capabilities/{capability}/`           | READ-ONLY   | 11    |
| capability-tester    | `modules/chariot-aegis-capabilities/{capability}/*_test.vql` | READ-WRITE  | 13    |

### Nuclei Templates

| Agent Type           | File Scope                                            | Access Mode | Phase |
| -------------------- | ----------------------------------------------------- | ----------- | ----- |
| Explore              | `modules/nuclei-templates/`                           | READ-ONLY   | 3     |
| capability-lead      | Output directory only                                 | WRITE       | 7     |
| capability-developer | `modules/nuclei-templates/{category}/{template}.yaml` | READ-WRITE  | 8     |
| capability-reviewer  | `modules/nuclei-templates/{category}/`                | READ-ONLY   | 11    |
| capability-tester    | Test environment only                                 | READ-WRITE  | 13    |

### Janus Tool Chains

| Agent Type           | File Scope                                | Access Mode | Phase |
| -------------------- | ----------------------------------------- | ----------- | ----- |
| Explore              | `modules/janus/`                          | READ-ONLY   | 3     |
| capability-lead      | Output directory only                     | WRITE       | 7     |
| backend-lead         | Output directory only                     | WRITE       | 7     |
| capability-developer | `modules/janus/pkg/{toolchain}/`          | READ-WRITE  | 8     |
| capability-reviewer  | `modules/janus/pkg/{toolchain}/`          | READ-ONLY   | 11    |
| backend-reviewer     | `modules/janus/pkg/{toolchain}/`          | READ-ONLY   | 11    |
| capability-tester    | `modules/janus/pkg/{toolchain}/*_test.go` | READ-WRITE  | 13    |

### Fingerprintx Modules

| Agent Type           | File Scope                                  | Access Mode | Phase |
| -------------------- | ------------------------------------------- | ----------- | ----- |
| Explore              | `pkg/plugins/services/`                     | READ-ONLY   | 3     |
| capability-lead      | Output directory only                       | WRITE       | 7     |
| capability-developer | `pkg/plugins/services/{protocol}/`          | READ-WRITE  | 8     |
| capability-reviewer  | `pkg/plugins/services/{protocol}/`          | READ-ONLY   | 11    |
| capability-tester    | `pkg/plugins/services/{protocol}/*_test.go` | READ-WRITE  | 13    |

### Scanner Integrations

| Agent Type           | File Scope                                                 | Access Mode | Phase |
| -------------------- | ---------------------------------------------------------- | ----------- | ----- |
| Explore              | `modules/janus-framework/`                                 | READ-ONLY   | 3     |
| capability-lead      | Output directory only                                      | WRITE       | 7     |
| capability-developer | `modules/janus-framework/pkg/scanners/{scanner}/`          | READ-WRITE  | 8     |
| capability-reviewer  | `modules/janus-framework/pkg/scanners/{scanner}/`          | READ-ONLY   | 11    |
| capability-tester    | `modules/janus-framework/pkg/scanners/{scanner}/*_test.go` | READ-WRITE  | 13    |

---

## Shared Files (Conflict Risk)

These files may be touched by capability development - require coordination:

| File                                 | Capability Type | Risk                    | Mitigation            |
| ------------------------------------ | --------------- | ----------------------- | --------------------- |
| `pkg/plugins/types.go`               | Fingerprintx    | Type constant additions | Lock before modifying |
| `pkg/plugins/plugins.go`             | Fingerprintx    | Plugin imports          | Sequential edits only |
| `modules/janus/pkg/registry.go`      | Janus           | Tool registration       | Lock before modifying |
| `modules/nuclei-templates/README.md` | Nuclei          | Template index          | Sequential edits only |

---

## Parallel Execution Safety

### Safe to Parallelize

- capability-lead + security-lead (separate output files)
- capability-reviewer + backend-reviewer (READ-ONLY, same paths OK)
- Multiple testers on different test files

### Requires Sequential Execution

- Any agent modifying shared registration files
- capability-developer on same capability (single implementation at a time)

---

## Related References

- [file-conflict-protocol.md](file-conflict-protocol.md) - Conflict detection protocol
- [file-locking.md](file-locking.md) - Lock mechanism
