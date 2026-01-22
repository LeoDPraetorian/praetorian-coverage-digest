# Agent Matrix for Feature Development

**Agent selection based on feature type and phase.**

---

## Overview

This matrix defines which agents to spawn based on `feature_type` detected in Phase 3 (Codebase Discovery).

---

## Feature Type Detection

From Phase 3 `technologies_detected`:

| Indicator                          | Feature Type |
| ---------------------------------- | ------------ |
| Only `.tsx`, `.ts` in `src/`       | Frontend     |
| Only `.go` in `modules/*/backend/` | Backend      |
| Both TypeScript and Go files       | Full-stack   |

---

## Agent Matrix by Phase

### Phase 7: Architecture Plan

| Feature Type | Agents (spawn in parallel)                       | Count |
| ------------ | ------------------------------------------------ | ----- |
| Frontend     | `frontend-lead`, `security-lead`                 | 2     |
| Backend      | `backend-lead`, `security-lead`                  | 2     |
| Full-stack   | `frontend-lead`, `backend-lead`, `security-lead` | 3     |

**Parallel execution:** Yes - spawn all in SINGLE message.

### Phase 8: Implementation

| Feature Type | Agents                                    | Parallel?              |
| ------------ | ----------------------------------------- | ---------------------- |
| Frontend     | `frontend-developer`                      | N/A (single)           |
| Backend      | `backend-developer`                       | N/A (single)           |
| Full-stack   | `frontend-developer`, `backend-developer` | Yes if no file overlap |

**File overlap check:** See [file-scope-boundaries.md](file-scope-boundaries.md).

### Phase 11: Code Quality

| Feature Type | Stage 1 (sequential) | Stage 2 (parallel)                       | Total |
| ------------ | -------------------- | ---------------------------------------- | ----- |
| Frontend     | `frontend-reviewer`  | `frontend-reviewer`, `frontend-security` | 2     |
| Backend      | `backend-reviewer`   | `backend-reviewer`, `backend-security`   | 2     |
| Full-stack   | Both reviewers       | All 4 reviewers                          | 4     |

**Two-stage pattern:** Stage 1 MUST pass before Stage 2.

### Phase 12: Test Planning

| Feature Type | Agents      | Count |
| ------------ | ----------- | ----- |
| Frontend     | `test-lead` | 1     |
| Backend      | `test-lead` | 1     |
| Full-stack   | `test-lead` | 1     |

**Note:** Same agent for all types - test-lead analyzes both domains.

### Phase 13: Testing

| Feature Type | Agents (spawn all in parallel)                      | Count |
| ------------ | --------------------------------------------------- | ----- |
| Frontend     | `frontend-tester` x3 (unit, integration, e2e)       | 3     |
| Backend      | `backend-tester` x3 (unit, integration, acceptance) | 3     |
| Full-stack   | 3 frontend + 3 backend                              | 6     |

**Parallel execution:** Yes - spawn ALL in SINGLE message.

### Phase 15: Test Quality

| Feature Type | Agents      | Count |
| ------------ | ----------- | ----- |
| Frontend     | `test-lead` | 1     |
| Backend      | `test-lead` | 1     |
| Full-stack   | `test-lead` | 1     |

**Note:** Same agent for all types - validates against test plan.

---

## Agent Counts Summary

| Feature Type | Phase 7 | Phase 8 | Phase 11 | Phase 12 | Phase 13 | Phase 15 | Total |
| ------------ | ------- | ------- | -------- | -------- | -------- | -------- | ----- |
| Frontend     | 2       | 1       | 2        | 1        | 3        | 1        | 10    |
| Backend      | 2       | 1       | 2        | 1        | 3        | 1        | 10    |
| Full-stack   | 3       | 2       | 4        | 1        | 6        | 1        | 17    |

---

## Mandatory Skills by Agent

### Architects (Phase 7)

| Agent           | Mandatory Skills                                          |
| --------------- | --------------------------------------------------------- |
| `frontend-lead` | `adhering-to-dry`, `adhering-to-yagni`, `writing-plans`   |
| `backend-lead`  | `adhering-to-dry`, `adhering-to-yagni`, `writing-plans`   |
| `security-lead` | `adhering-to-dry`, Security-specific skills from manifest |

### Developers (Phase 8)

| Agent                | Mandatory Skills                                                                        |
| -------------------- | --------------------------------------------------------------------------------------- |
| `frontend-developer` | `developing-with-tdd`, `verifying-before-completion`, Skills from `skill-manifest.yaml` |
| `backend-developer`  | `developing-with-tdd`, `verifying-before-completion`, Skills from `skill-manifest.yaml` |

### Reviewers (Phase 11)

| Agent               | Mandatory Skills                                     |
| ------------------- | ---------------------------------------------------- |
| `frontend-reviewer` | `adhering-to-dry`, Skills from `skill-manifest.yaml` |
| `backend-reviewer`  | `adhering-to-dry`, Skills from `skill-manifest.yaml` |
| `frontend-security` | Security-specific skills                             |
| `backend-security`  | Security-specific skills                             |

### Testers (Phase 13)

| Agent             | Mandatory Skills                                         |
| ----------------- | -------------------------------------------------------- |
| `frontend-tester` | `developing-with-tdd`, Skills from `skill-manifest.yaml` |
| `backend-tester`  | `developing-with-tdd`, Skills from `skill-manifest.yaml` |
| `test-lead`       | Test planning skills                                     |

---

## Skill Injection Protocol

For each agent spawn, inject skills from `skill-manifest.yaml`:

```yaml
# From Phase 4 skill-manifest.yaml
skills_by_domain:
  frontend:
    library_skills:
      - path: ".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md"
        trigger: "TanStack Query detected"
      - path: ".claude/skill-library/development/frontend/using-tanstack-table/SKILL.md"
        trigger: "TanStack Table detected"
  backend:
    library_skills:
      - path: ".claude/skill-library/development/backend/go-best-practices/SKILL.md"
        trigger: "Go files detected"
```

**Include in agent prompt:**

```markdown
MANDATORY SKILLS TO READ BEFORE STARTING:

Based on codebase discovery (Phase 3) and skill discovery (Phase 4), you MUST read:

- .claude/skill-library/development/frontend/using-tanstack-query/SKILL.md
  (Reason: TanStack Query detected in useAssets.ts)

YOU MUST READ THESE BEFORE WRITING CODE. No exceptions.
```

---

## File Scope Boundaries

| Agent                | Allowed Paths                | Mode       |
| -------------------- | ---------------------------- | ---------- |
| `frontend-developer` | `src/`, `modules/*/ui/`      | Read/Write |
| `backend-developer`  | `modules/*/backend/`, `pkg/` | Read/Write |
| `frontend-reviewer`  | `src/`, `modules/*/ui/`      | Read-only  |
| `backend-reviewer`   | `modules/*/backend/`, `pkg/` | Read-only  |
| `frontend-tester`    | `*.test.tsx`, `*.spec.ts`    | Read/Write |
| `backend-tester`     | `*_test.go`                  | Read/Write |

**Conflict detection:** If frontend-developer and backend-developer would touch same file, execute sequentially.

---

## Related References

- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Architect agents
- [Phase 8: Implementation](phase-8-implementation.md) - Developer agents
- [Phase 11: Code Quality](phase-11-code-quality.md) - Reviewer agents
- [Phase 13: Testing](phase-13-testing.md) - Tester agents
- [File Scope Boundaries](file-scope-boundaries.md) - Conflict detection
- [Delegation Templates](delegation-templates.md) - Agent prompt templates
