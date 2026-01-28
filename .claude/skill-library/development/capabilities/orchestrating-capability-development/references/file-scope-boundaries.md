# File Scope Boundaries

**Parallel agent conflict prevention for capability development.**

**Purpose**: Parallel agent conflict prevention through non-overlapping file scopes.

---

## Overview

When spawning parallel agents, define non-overlapping file scopes to prevent conflicts. Capability development is primarily sequential within a single capability, but parallel execution occurs during review and testing phases.

---

## Dual Repository Structure

Capabilities exist in **two locations** during the migration period:

1. **External capabilities repo** (migrated): `{CAPABILITIES_ROOT}/modules/{capability}/`
2. **Internal chariot modules** (not yet migrated): `modules/{module}/`

### External Capabilities Repository

Capabilities that have been migrated live in a separate super-repo (`capabilities`) that can be cloned anywhere:

```
{CAPABILITIES_ROOT}/modules/{capability}/
```

**Migrated capabilities include:** nebula, fingerprintx, nuclei-templates, trajan, augustus, diocletian, noseyparker, noseyparker-explorer, noseyparkerplusplus, brutus, capability-sdk

### Internal Modules (Not Yet Migrated)

Capabilities not yet migrated remain in praetorian-development-platform super-repo:

```
modules/{module}/
```

**Internal module locations include:**

- **chariot** or **guard** - Core platform with Guard backend (`modules/chariot/backend/` or `modules/guard/backend/`)
  - Guard backend capabilities: `backend/pkg/tasks/capabilities/`
- **tabularium** - Shared data models and schemas (`modules/tabularium/`)
- **janus** - Security tool orchestration framework (`modules/janus/`)
- **chariot-aegis-capabilities** - VQL-based security capabilities (`modules/chariot-aegis-capabilities/`)
- **msp-definitions** - MSP vulnerability content (`modules/msp-definitions/`)
- **praetorian-cli** - Python CLI and SDK (`modules/praetorian-cli/`)
- Any other `modules/` subdirectories

### Path Resolution

During Phase 3 (Codebase Discovery), determine which location applies:

1. Check if capability exists in `{CAPABILITIES_ROOT}/modules/` (external repo)
2. If not found, check internal modules in praetorian-development-platform:
   - `modules/chariot/backend/pkg/tasks/capabilities/` or `modules/guard/backend/pkg/tasks/capabilities/` (Guard backend)
   - `modules/chariot-aegis-capabilities/` (VQL capabilities)
   - `modules/tabularium/` (data models)
   - `modules/janus/` (tool orchestration)
   - Other `modules/` subdirectories
3. Document resolved path in MANIFEST.yaml

---

## Discovery Protocol for External Repo

Resolve `{CAPABILITIES_ROOT}` in this order:

1. **Environment variable** (highest priority):

   ```bash
   export CAPABILITIES_ROOT="/path/to/capabilities"
   ```

2. **Config file** (`.claude/config.local.json`, gitignored):

   ```json
   {
     "external_repos": {
       "capabilities": "../capabilities"
     }
   }
   ```

3. **Common locations** (fallback search):
   - `../capabilities`
   - `~/dev/capabilities`
   - `$GOPATH/src/github.com/praetorian-inc/capabilities`

4. **Ask user** if not found

### Validation

Before proceeding, verify the path exists:

```bash
# External repo
ls {CAPABILITIES_ROOT}/modules/

# Internal modules
ls modules/
```

---

## Capability File Scope Matrix

All capabilities follow a unified pattern. The `{resolved_path}` is determined during Phase 3 (Codebase Discovery) based on where the capability lives.

| Agent Type           | File Scope             | Access Mode | Phase |
| -------------------- | ---------------------- | ----------- | ----- |
| Explore              | Both repos (discovery) | READ-ONLY   | 3     |
| capability-lead      | Output directory only  | WRITE       | 7     |
| capability-developer | `{resolved_path}/`     | READ-WRITE  | 8     |
| capability-reviewer  | `{resolved_path}/`     | READ-ONLY   | 11    |
| capability-tester    | `{resolved_path}/`     | READ-WRITE  | 13    |

### Examples

| User Request                     | Location | Resolved Path                                                                                        |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| "Add MySQL fingerprint"          | External | `{CAPABILITIES_ROOT}/modules/fingerprintx/`                                                          |
| "Create CVE template"            | External | `{CAPABILITIES_ROOT}/modules/nuclei-templates/`                                                      |
| "Improve secret scanning"        | External | `{CAPABILITIES_ROOT}/modules/noseyparker/`                                                           |
| "Add AWS capability"             | External | `{CAPABILITIES_ROOT}/modules/diocletian/`                                                            |
| "CI/CD security check"           | External | `{CAPABILITIES_ROOT}/modules/trajan/`                                                                |
| "VQL artifact"                   | Internal | `modules/chariot-aegis-capabilities/`                                                                |
| "MSP definition"                 | Internal | `modules/msp-definitions/`                                                                           |
| "S3 bucket detection capability" | Internal | `modules/chariot/backend/pkg/tasks/capabilities/` or `modules/guard/backend/pkg/tasks/capabilities/` |
| "Tabularium schema update"       | Internal | `modules/tabularium/`                                                                                |
| "Janus tool chain"               | Internal | `modules/janus/`                                                                                     |

### Path Resolution in MANIFEST

```yaml
capability_location:
  type: "external" # or "internal"
  resolved_path: "{CAPABILITIES_ROOT}/modules/fingerprintx/"
  # OR for internal:
  # type: "internal"
  # resolved_path: "modules/chariot-aegis-capabilities/"
  # OR for Guard backend capabilities:
  # type: "internal"
  # resolved_path: "modules/chariot/backend/pkg/tasks/capabilities/" or "modules/guard/backend/pkg/tasks/capabilities/"
  # OR for Tabularium:
  # type: "internal"
  # resolved_path: "modules/tabularium/"
```

---

## Shared Files (Conflict Risk)

Within each capability module, certain files may be shared registration points:

| Pattern          | Risk                     | Mitigation            |
| ---------------- | ------------------------ | --------------------- |
| `**/registry.go` | Tool/plugin registration | Lock before modifying |
| `**/types.go`    | Type constant additions  | Lock before modifying |
| `**/plugins.go`  | Plugin imports           | Sequential edits only |
| `README.md`      | Index/documentation      | Sequential edits only |

**Note**: Specific shared files vary by capability. Identify them during Phase 3 (Codebase Discovery).

---

## Parallel Execution Safety

### Safe to Parallelize

- capability-lead + security-lead (separate output files)
- capability-reviewer + backend-reviewer (READ-ONLY, same paths OK)
- Multiple testers on different test files
- Work on different capabilities (`{CAPABILITIES_ROOT}/modules/A/` vs `{CAPABILITIES_ROOT}/modules/B/`)

### Requires Sequential Execution

- Any agent modifying shared registration files within a capability
- capability-developer on same capability (single implementation at a time)
- Cross-capability changes (e.g., SDK changes affecting multiple consumers)

---

## Cross-Repository Considerations

The capabilities repo is separate from chariot-development-platform. When capability changes require corresponding changes in the main platform:

1. **Identify dependencies**: Does the capability change require backend/frontend updates?
2. **Coordinate branches**: Create matching feature branches in both repos
3. **Test integration**: Verify capability works with platform before merging either

---

## Related References

- [file-conflict-protocol.md](file-conflict-protocol.md) - Conflict detection protocol
- [file-locking.md](file-locking.md) - Lock mechanism
