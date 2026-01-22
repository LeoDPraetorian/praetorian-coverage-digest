# Phase 4: Skill Discovery

**Check for vendor-specific skill and identify relevant skills for agent prompts.**

**This file provides:** Complete phase protocol for integration development.

---

## Overview

Skill Discovery for integration development has two purposes:

1. **Vendor Skill Check**: Verify or create `integrating-with-{vendor}` skill
2. **Gateway Skills**: Identify relevant skills from gateways

**Entry Criteria:** Phase 3 (Codebase Discovery) complete, compaction gate 1 passed.

**Exit Criteria:** Vendor skill checked/created, skill manifest written.

---

## Step 1: Check for Existing Vendor Skill

**Location to check:**

```
.claude/skill-library/development/integrations/integrating-with-{vendor}/
```

**Search pattern:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
ls -la "$ROOT/.claude/skill-library/development/integrations/" | grep -i "{vendor}"
```

---

## Step 2: IF Skill EXISTS

1. Read SKILL.md and all references/
2. Extract key patterns:
   - Authentication flow and initialization
   - Rate limit headers and backoff strategy
   - Pagination parameter names
   - Data mapping examples
   - Known gotchas
3. Create `skill-summary.md` with extracted patterns

**skill-summary.md structure:**

```markdown
# Skill Summary: integrating-with-{vendor}

## Source

Skill location: .claude/skill-library/development/integrations/integrating-with-{vendor}/

## Authentication

- Method: {from skill}
- Initialization: {code example}

## Rate Limiting

- Limits: {from skill}
- Headers: {X-RateLimit-\*, Retry-After}
- Backoff: {exponential, fixed}

## Pagination

- Type: {token | page | cursor}
- Parameters: {from skill}
- Termination: {from skill}

## Data Mapping

| Vendor Entity | Chariot Model | Notes |
| ------------- | ------------- | ----- |

## Known Issues

- {from skill references/}
```

---

## Step 3: IF Skill DOES NOT EXIST

**🛑 Human Checkpoint**: Confirm skill creation

```markdown
No existing skill found for {vendor}.

Create new `integrating-with-{vendor}` skill?

- This will invoke skill-manager to create the skill
- Skill will be populated with vendor API information
- Estimated time: 5-10 minutes
```

Use AskUserQuestion with options:

- **Yes, create skill** (Recommended)
- **No, proceed without** (Not recommended)

**IF approved:**

1. Invoke skill-manager:

   ```
   Skill('skill-manager', args='create integrating-with-{vendor}')
   ```

2. Wait for skill creation to complete

3. Read newly created skill and create `skill-summary.md`

---

## Step 4: Discover Available Gateways

**Do NOT hardcode gateway lists.** Discover dynamically:

```bash
Glob(".claude/skills/gateway-*/SKILL.md")
```

---

## Step 5: Map Technologies to Gateways

Read `technologies_detected` from Phase 3 MANIFEST (if available):

```yaml
technologies_detected:
  backend: ["Go", "errgroup", "AWS Lambda"]
  testing: ["Go testing", "httptest", "mock servers"]
```

Map each technology category to gateways:

| Technology Category | Primary Gateway      | Secondary Gateways |
| ------------------- | -------------------- | ------------------ |
| Go, Lambda, AWS     | gateway-backend      | -                  |
| Third-party APIs    | gateway-integrations | gateway-backend    |
| Testing patterns    | gateway-testing      | -                  |

**For integration development, the following gateways are always relevant:**

| Gateway              | Reason                                |
| -------------------- | ------------------------------------- |
| gateway-integrations | Integration patterns, P0 requirements |
| gateway-backend      | Go patterns, Lambda handlers          |
| gateway-testing      | Integration test patterns             |

Invoke each relevant gateway to extract library skills.

---

## Step 6: Match Keywords to Library Skills

Cross-reference:

1. **Task description** from Phase 2 (Triage)
2. **P0 examples found** from Phase 3 (Codebase Discovery)
3. **Technologies detected** from Phase 3

Against gateway routing tables:

| Detected Pattern       | Matched Skill             | Gateway Source       |
| ---------------------- | ------------------------- | -------------------- |
| Go integration handler | developing-integrations   | gateway-integrations |
| VMFilter usage         | validating-integrations   | gateway-integrations |
| errgroup pattern       | go-best-practices         | gateway-backend      |
| Integration test files | testing-integrations      | gateway-testing      |
| Vendor-specific API    | integrating-with-{vendor} | gateway-integrations |

---

## Step 7: Write Skill Manifest

Create `{OUTPUT_DIR}/skill-manifest.yaml`:

```yaml
# Skill Manifest
# Generated: {timestamp}
# Source: Phase 4 Skill Discovery

# Vendor-specific skill
vendor_skill:
  exists: true # or false
  path: ".claude/skill-library/development/integrations/integrating-with-{vendor}/SKILL.md"
  summary_path: "{OUTPUT_DIR}/skill-summary.md"

# Relevant gateways for integration development
relevant_gateways:
  - gateway: gateway-integrations
    reason: "Integration patterns and P0 requirements"
  - gateway: gateway-backend
    reason: "Go patterns, Lambda handlers"
  - gateway: gateway-testing
    reason: "Integration test patterns"

# Skills by domain
skills_by_domain:
  integration:
    core_skills:
      - developing-with-tdd
      - adhering-to-dry
      - verifying-before-completion
    library_skills:
      - path: ".claude/skill-library/development/integrations/developing-integrations/SKILL.md"
        trigger: "P0 requirements"
      - path: ".claude/skill-library/development/integrations/validating-integrations/SKILL.md"
        trigger: "P0 validation"
      - path: ".claude/skill-library/development/integrations/integrating-with-{vendor}/SKILL.md"
        trigger: "Vendor-specific patterns"

  backend:
    core_skills:
      - developing-with-tdd
      - adhering-to-dry
    library_skills:
      - path: ".claude/skill-library/development/backend/go-best-practices/SKILL.md"
        trigger: "Go files"

  testing:
    core_skills:
      - developing-with-tdd
    library_skills:
      - path: ".claude/skill-library/testing/testing-integrations/SKILL.md"
        trigger: "Integration tests"

# Phase-specific skill requirements
phase_skills:
  phase_7_architecture:
    - gateway-integrations
    - writing-plans
    - enforcing-evidence-based-analysis
  phase_8_implementation:
    - developing-with-tdd
    - gateway-integrations
  phase_10_domain_compliance:
    - validating-integrations
  phase_13_testing:
    - testing-integrations
    - developing-with-tdd
```

---

## Step 8: Update MANIFEST.yaml

```yaml
phases:
  4_skill_discovery:
    status: "complete"
    completed_at: "{timestamp}"

skill_discovery:
  completed_at: "{timestamp}"

  vendor_skill:
    exists: true
    path: ".claude/skill-library/development/integrations/integrating-with-{vendor}/SKILL.md"
    created: false # true if created in this phase

  relevant_gateways:
    - gateway-integrations
    - gateway-backend
    - gateway-testing

  library_skills_identified: 6

  manifest_path: "{OUTPUT_DIR}/skill-manifest.yaml"
```

---

## Step 9: Update TodoWrite

```
TodoWrite([
  { content: "Phase 4: Skill Discovery", status: "completed", activeForm: "Checking vendor skill" },
  { content: "Phase 5: Complexity", status: "in_progress", activeForm: "Assessing technical complexity" },
  // ... rest
])
```

---

## Step 10: Report Results

```markdown
## Skill Discovery Complete

**Vendor Skill:** {EXISTS | CREATED | SKIPPED}
**Relevant Gateways:** 3 (integrations, backend, testing)
**Library Skills Identified:** 6

**Key Skills for This Integration:**

- Vendor: integrating-with-{vendor}
- P0: developing-integrations, validating-integrations
- Testing: testing-integrations
- Backend: go-best-practices

**Manifest written to:** {OUTPUT_DIR}/skill-manifest.yaml

→ Proceeding to Phase 5: Complexity Assessment
```

---

## How Later Phases Use This Manifest

The skill manifest is consumed by agent-spawning phases:

| Phase                       | Reads From Manifest            | Injects Into           |
| --------------------------- | ------------------------------ | ---------------------- |
| Phase 7: Architecture Plan  | `skills_by_domain.{domain}`    | Architect agent prompt |
| Phase 8: Implementation     | `skills_by_domain.{domain}`    | Developer agent prompt |
| Phase 10: Domain Compliance | `skills_by_domain.integration` | Reviewer agent prompt  |
| Phase 13: Testing           | `skills_by_domain.testing`     | Tester agent prompt    |

---

## Gate Checklist

Phase 4 is complete when:

- [ ] Checked for `integrating-with-{vendor}` skill existence
- [ ] IF skill exists: `skill-summary.md` created
- [ ] IF skill missing: Human checkpoint completed
- [ ] IF skill created: skill-manager invoked and skill exists
- [ ] Relevant gateways identified
- [ ] `skill-manifest.yaml` created with all skills
- [ ] MANIFEST.yaml updated with skill discovery results
- [ ] Phase 4 status updated to 'complete'

---

## Edge Cases

### No Technologies Detected

If Phase 3 found no specific technologies:

- Use only mandatory gateway skills (gateway-integrations, gateway-backend, gateway-testing)
- Document as "standard integration patterns"
- Flag for human review if unusual

### New Gateway Added

Because we discover gateways dynamically via Glob, new gateways are automatically included. No hardcoded lists to update.

### Gateway Removed/Renamed

If a gateway in `relevant_gateways` no longer exists:

- Glob will not return it
- Log warning in manifest
- Continue with available gateways

---

## Related References

- [checkpoint-configuration.md](checkpoint-configuration.md) - Skill creation checkpoint
- [phase-5-complexity.md](phase-5-complexity.md) - Next phase
