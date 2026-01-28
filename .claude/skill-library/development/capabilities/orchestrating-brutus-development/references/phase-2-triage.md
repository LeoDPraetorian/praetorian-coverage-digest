# Phase 2: Triage

**Classify work type and determine which phases to execute.**

---

## Work Type Classification

| Work Type | Typical Scope | Example |
|-----------|---------------|---------|
| BUGFIX | Fix existing plugin | "SSH plugin fails on certain errors" |
| SMALL | Minor enhancement | "Add banner capture to MySQL" |
| MEDIUM | New standard plugin | "Create Redis plugin" |
| LARGE | Complex plugin with optional interfaces | "Create SSH plugin with KeyPlugin" |

---

## Brutus-Specific Signals

| Signal | Indicates |
|--------|-----------|
| "fix", "broken" | BUGFIX |
| "add field", "enhance" | SMALL |
| "new plugin", "create {protocol}" | MEDIUM |
| "new plugin with KeyPlugin" | LARGE |

---

## Phase Skip Matrix

| Work Type | Skipped Phases |
|-----------|----------------|
| BUGFIX | 6, 7, 9, 12 |
| SMALL | 6, 7, 9 |
| MEDIUM | 6 |
| LARGE | None |

---

## MANIFEST Update

```yaml
work_type: "MEDIUM"
triage:
  work_type: "MEDIUM"
  classified_at: "{timestamp}"
  phases_to_execute: [1,2,3,4,5,7,8,9,10,11,12,13,14,15,16]
  phases_to_skip: [6]
```

---

## Related

- [Phase 1: Setup](phase-1-setup.md) - Previous phase
- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Next phase
