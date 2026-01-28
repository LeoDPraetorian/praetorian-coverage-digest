# Agent Matrix for Capability Development

**Agent selection based on capability type and phase.**

---

## Overview

This matrix defines which agents to spawn based on `capability_type` detected in Phase 3 (Codebase Discovery).

---

## Capability Type Detection

From Phase 3 `technologies_detected`:

| Indicator                          | Capability Type |
| ---------------------------------- | --------------- |
| `.vql` files in aegis-capabilities | VQL             |
| `.yaml` with `id:` field (nuclei)  | Nuclei          |
| `.go` implementing `janus.Tool`    | Janus           |
| `.go` in `plugins/` (fingerprintx) | Fingerprintx    |
| `.go` with scanner interface       | Scanner         |

---

## Agent Matrix by Phase

### Phase 7: Architecture Plan

| Capability Type | Agents (spawn in parallel)         | Count |
| --------------- | ---------------------------------- | ----- |
| VQL             | `capability-lead`, `security-lead` | 2     |
| Nuclei          | `capability-lead`, `security-lead` | 2     |
| Janus           | `capability-lead`, `backend-lead`  | 2     |
| Fingerprintx    | `capability-lead`, `backend-lead`  | 2     |
| Scanner         | `capability-lead`, `backend-lead`  | 2     |

**Parallel execution:** Yes - spawn all in SINGLE message.

### Phase 8: Implementation

| Capability Type | Agents                 | Parallel?    |
| --------------- | ---------------------- | ------------ |
| VQL             | `capability-developer` | N/A (single) |
| Nuclei          | `capability-developer` | N/A (single) |
| Janus           | `capability-developer` | N/A (single) |
| Fingerprintx    | `capability-developer` | N/A (single) |
| Scanner         | `capability-developer` | N/A (single) |

### Phase 11: Code Quality

| Capability Type | Stage 1 (sequential)  | Stage 2 (parallel)                        | Total |
| --------------- | --------------------- | ----------------------------------------- | ----- |
| VQL             | `capability-reviewer` | `capability-reviewer`                     | 1     |
| Nuclei          | `capability-reviewer` | `capability-reviewer`                     | 1     |
| Janus           | `capability-reviewer` | `capability-reviewer`, `backend-reviewer` | 2     |
| Fingerprintx    | `capability-reviewer` | `capability-reviewer`, `backend-reviewer` | 2     |
| Scanner         | `capability-reviewer` | `capability-reviewer`, `backend-reviewer` | 2     |

**Two-stage pattern:** Stage 1 MUST pass before Stage 2.

### Phase 12: Test Planning

| Capability Type | Agents      | Count |
| --------------- | ----------- | ----- |
| All             | `test-lead` | 1     |

### Phase 13: Testing

| Capability Type | Agents (spawn all in parallel)                        | Count |
| --------------- | ----------------------------------------------------- | ----- |
| VQL             | `capability-tester` x3 (detection, FP, platform)      | 3     |
| Nuclei          | `capability-tester` x3 (detection, FP, CVE coverage)  | 3     |
| Janus           | `capability-tester` x3 (pipeline, integration, error) | 3     |
| Fingerprintx    | `capability-tester` x3 (detection, protocol, edge)    | 3     |
| Scanner         | `capability-tester` x3 (integration, rate, error)     | 3     |

**Parallel execution:** Yes - spawn ALL in SINGLE message.

### Phase 15: Test Quality

| Capability Type | Agents      | Count |
| --------------- | ----------- | ----- |
| All             | `test-lead` | 1     |

---

## Agent Counts Summary

| Capability Type | Phase 7 | Phase 8 | Phase 11 | Phase 12 | Phase 13 | Phase 15 | Total |
| --------------- | ------- | ------- | -------- | -------- | -------- | -------- | ----- |
| VQL             | 2       | 1       | 1        | 1        | 3        | 1        | 9     |
| Nuclei          | 2       | 1       | 1        | 1        | 3        | 1        | 9     |
| Janus           | 2       | 1       | 2        | 1        | 3        | 1        | 10    |
| Fingerprintx    | 2       | 1       | 2        | 1        | 3        | 1        | 10    |
| Scanner         | 2       | 1       | 2        | 1        | 3        | 1        | 10    |

---

## Mandatory Skills by Agent

### Architects (Phase 7)

| Agent             | Mandatory Skills                                        |
| ----------------- | ------------------------------------------------------- |
| `capability-lead` | `adhering-to-dry`, `adhering-to-yagni`, `writing-plans` |
| `security-lead`   | `adhering-to-dry`, Security-specific skills             |
| `backend-lead`    | `adhering-to-dry`, `adhering-to-yagni`, Go patterns     |

### Developers (Phase 8)

| Agent                  | Mandatory Skills                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `capability-developer` | `developing-with-tdd`, `verifying-before-completion`, Skills from `skill-manifest.yaml` |

### Reviewers (Phase 11)

| Agent                 | Mandatory Skills                                   |
| --------------------- | -------------------------------------------------- |
| `capability-reviewer` | `adhering-to-dry`, Capability-type-specific skills |
| `backend-reviewer`    | `adhering-to-dry`, Go best practices               |

### Testers (Phase 13)

| Agent               | Mandatory Skills                                         |
| ------------------- | -------------------------------------------------------- |
| `capability-tester` | `developing-with-tdd`, Skills from `skill-manifest.yaml` |
| `test-lead`         | Test planning skills                                     |

---

## Skill Injection Protocol

For each agent spawn, inject skills from `skill-manifest.yaml`:

```yaml
# From Phase 4 skill-manifest.yaml
skills_by_domain:
  capability:
    library_skills:
      - path: ".claude/skill-library/development/capabilities/writing-vql-capabilities/SKILL.md"
        trigger: "VQL capability type detected"
      - path: ".claude/skill-library/development/capabilities/writing-nuclei-templates/SKILL.md"
        trigger: "Nuclei capability type detected"
      - path: ".claude/skill-library/development/capabilities/nerva/writing-nerva-tcp-udp-modules/SKILL.md"
        trigger: "Fingerprintx capability type detected"
```

**Include in agent prompt:**

```markdown
MANDATORY SKILLS TO READ BEFORE STARTING:

Based on codebase discovery (Phase 3) and skill discovery (Phase 4), you MUST read:

- .claude/skill-library/development/capabilities/writing-vql-capabilities/SKILL.md
  (Reason: VQL capability type detected)

YOU MUST READ THESE BEFORE WRITING CODE. No exceptions.
```

---

## File Scope Boundaries

| Agent                  | Allowed Paths                               | Mode       |
| ---------------------- | ------------------------------------------- | ---------- |
| `capability-developer` | `{resolved_path}/` (see below)              | Read/Write |
| `capability-reviewer`  | Capability artifact paths                   | Read-only  |
| `capability-tester`    | `*_test.go`, `*_test.vql`, test data        | Read/Write |

**Path locations:**
- External (migrated): `{CAPABILITIES_ROOT}/modules/{capability}/`
- Internal (not yet migrated): `modules/{module}/` (e.g., chariot-aegis-capabilities, msp-definitions)

---

## Related References

- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Architect agents
- [Phase 8: Implementation](phase-8-implementation.md) - Developer agents
- [Phase 11: Code Quality](phase-11-code-quality.md) - Reviewer agents
- [Phase 13: Testing](phase-13-testing.md) - Tester agents
- [File Scope Boundaries](file-scope-boundaries.md) - Conflict detection
- [Capability Types](capability-types.md) - Type-specific details
