# Phase 10: Domain Compliance

**Validate domain-specific P0 requirements before code review.**

---

## Overview

Domain Compliance validates that implementation meets mandatory patterns specific to the work domain. This is a **blocking gate** between Implementation (Phase 8) and Code Quality (Phase 11).

**Entry Criteria:** Phase 9 (Design Verification) complete.

**Exit Criteria:** All P0 requirements pass (or user explicitly approves proceeding with documented violations).

---

## Step 1: Identify Domain

Determine which P0 table applies based on work type (from Phase 2 Triage):

| Work Type / Domain | P0 Table Reference       | Validation Skill          |
| ------------------ | ------------------------ | ------------------------- |
| Integration APIs   | Integration Development  | `validating-integrations` |
| VQL/Nuclei/Janus   | Capability Development   | (TBD)                     |
| fingerprintx       | Fingerprintx Development | (TBD)                     |
| React/TypeScript   | Frontend Development     | (TBD)                     |
| Go/Lambda          | Backend Development      | (TBD)                     |

**If domain unclear:** Check `technologies_detected` from Phase 3 MANIFEST.

---

## Step 2: Run P0 Checks

Execute all P0 checks for the identified domain. See [p0-compliance.md](p0-compliance.md) for complete tables per domain.

**Example P0 table structure (see domain orchestration for specifics):**

| P0 Requirement  | Validation Command     | Blocking |
| --------------- | ---------------------- | -------- |
| {requirement_1} | {validation_command_1} | Always   |
| {requirement_2} | {validation_command_2} | Always   |
| {requirement_N} | {validation_command_N} | Always   |

**P0 tables by domain orchestration:**

- Integration Development → `orchestrating-integration-development` P0 table
- Capability Development → `orchestrating-capability-development` P0 table
- Frontend Development → `orchestrating-feature-development` frontend P0 table
- Backend Development → `orchestrating-feature-development` backend P0 table

**Run ALL checks** - do not stop at first failure.

---

## Step 3: Classify Results

For each P0 check:

| Status     | Meaning              | Action                            |
| ---------- | -------------------- | --------------------------------- |
| ✅ PASS    | Requirement met      | Document evidence                 |
| ❌ FAIL    | Requirement violated | Document violation + fix guidance |
| ⚠️ WARNING | Soft limit exceeded  | Document, proceed with note       |

---

## Step 4: Proceed or Escalate

**Decision matrix:**

| Result           | Action                                | Human Checkpoint? |
| ---------------- | ------------------------------------- | ----------------- |
| ✅ All PASS      | Proceed to Phase 11                   | No                |
| ❌ Any FAIL      | Generate compliance report + escalate | **YES**           |
| ⚠️ Warnings only | Document + ask user preference        | Optional          |

**If violations found:**

```typescript
AskUserQuestion({
  questions: [
    {
      question: `P0 Compliance found ${count} violations. How to proceed?`,
      header: "P0 Gate",
      multiSelect: false,
      options: [
        {
          label: "Fix violations now (Recommended)",
          description: "I will guide you through fixes",
        },
        {
          label: "Proceed anyway",
          description: "Document violations, likely rejected in code review",
        },
        { label: "Review violations", description: "Show me details of each violation" },
      ],
    },
  ],
});
```

---

## Step 5: Update MANIFEST.yaml

```yaml
phases:
  10_domain_compliance:
    status: "complete"
    completed_at: "{timestamp}"
    domain: "{domain}" # integration, capability, frontend, backend

compliance:
  p0_checks:
    - requirement: "{p0_requirement_1}"
      status: "pass"
      evidence: "{file}:{line} (description)"
    - requirement: "{p0_requirement_2}"
      status: "fail"
      evidence: "{file}:{line} (description)"
      fix_guidance: "See domain orchestration for reference implementation"

  violations_count: { count }
  warnings_count: { count }

  # If user approved proceeding with violations
  gate_override:
    approved_by: "user"
    reason: "{user_provided_reason}"
    timestamp: "{timestamp}"
```

---

## Step 6: Update TodoWrite & Report

```
TodoWrite([
  { content: "Phase 10: Domain Compliance", status: "completed", activeForm: "Validating compliance" },
  { content: "Phase 11: Code Quality", status: "in_progress", activeForm: "Reviewing code quality" },
  // ... rest
])
```

Output to user:

```markdown
## Domain Compliance Complete

**Domain:** {domain}
**P0 Checks:** {count} executed

| Requirement        | Status | Evidence                     |
| ------------------ | ------ | ---------------------------- |
| {p0_requirement_1} | ✅     | {file}:{line}, {file}:{line} |
| {p0_requirement_2} | ✅     | {file}:{line} (description)  |
| ...                | ...    | ...                          |

**Violations:** {count}
**Warnings:** {count}

→ Proceeding to Phase 11: Code Quality
```

---

## Edge Cases

### Domain Has No P0 Checks Defined

If domain P0 table says "(TBD)":

1. Document that P0 checks not yet defined for this domain
2. Proceed to Phase 11 with note
3. Use general code quality checks in Phase 11

### User Overrides P0 Gate

If user chooses "Proceed anyway":

1. **Document ALL violations** in MANIFEST with `gate_override`
2. **Warn** that code review will likely flag these
3. **Proceed** to Phase 11

### Multiple Domains

For full-stack features touching multiple domains:

1. Run P0 checks for EACH domain
2. ALL domains must pass (or be overridden)
3. Document domain-by-domain in MANIFEST

---

## Skip Conditions

Phase 10 runs for ALL work types. However, the P0 table may be minimal or empty for some domains.

| Work Type | P0 Checks                |
| --------- | ------------------------ |
| BUGFIX    | Domain-specific (if any) |
| SMALL     | Domain-specific (if any) |
| MEDIUM    | Full P0 table            |
| LARGE     | Full P0 table            |

---

## Related References

- [Phase 9: Design Verification](phase-9-design-verification.md) - Previous phase
- [Phase 11: Code Quality](phase-11-code-quality.md) - Next phase
- [p0-compliance.md](p0-compliance.md) - Complete P0 tables per domain
- [gated-verification.md](gated-verification.md) - Two-stage verification pattern
