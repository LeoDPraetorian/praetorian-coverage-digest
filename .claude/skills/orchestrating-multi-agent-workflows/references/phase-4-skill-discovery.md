# Phase 4: Skill Discovery

**Identify relevant skills based on codebase discovery findings and store for agent prompt construction.**

---

## Overview

Skill Discovery uses Phase 3's technology findings to identify which skills agents will need:

1. Discover available gateways dynamically (no hardcoded lists)
2. Map detected technologies to relevant gateways
3. Extract library skills from gateway routing tables
4. Write skill manifest for later phases to consume

**Entry Criteria:**

- Phase 3 (Codebase Discovery) complete, technologies_detected documented
- **COMPACTION GATE:** Must complete [compaction-gates.md](compaction-gates.md) protocol before proceeding (Gate 1: after Phase 3)

**Exit Criteria:** Skill manifest written to output directory, ready for agent prompt construction.

---

## Step 1: Discover Available Gateways

**Do NOT hardcode gateway lists.** Discover dynamically:

```bash
Glob(".claude/skills/gateway-*/SKILL.md")
```

This returns all available gateways:

- gateway-backend
- gateway-capabilities
- gateway-claude
- gateway-frontend
- gateway-integrations
- gateway-mcp-tools
- gateway-security
- gateway-testing
- gateway-typescript
- (any new gateways added later)

Store the list for Step 2.

---

## Step 2: Map Technologies to Gateways

Read `technologies_detected` from Phase 3 MANIFEST:

```yaml
technologies_detected:
  frontend: ["React", "TypeScript", "TanStack Query", "Zustand", "Tailwind CSS"]
  backend: ["Go", "AWS Lambda", "DynamoDB"]
  testing: ["Vitest", "Playwright", "MSW"]
```

Map each technology category to gateways:

| Technology Category     | Primary Gateway      | Secondary Gateways |
| ----------------------- | -------------------- | ------------------ |
| React, TypeScript, UI   | gateway-frontend     | gateway-typescript |
| Go, Lambda, AWS         | gateway-backend      | -                  |
| Vitest, Playwright, MSW | gateway-testing      | -                  |
| Third-party APIs        | gateway-integrations | gateway-backend    |
| VQL, Nuclei, scanners   | gateway-capabilities | gateway-backend    |
| MCP tools               | gateway-mcp-tools    | gateway-typescript |
| Auth, secrets, crypto   | gateway-security     | (domain gateway)   |

**Output:** List of relevant gateways for this workflow.

---

## Step 3: Invoke Relevant Gateways

For each relevant gateway identified in Step 2:

```
Skill("gateway-{name}")
```

Read the gateway's routing tables to extract:

- **Mandatory skills** - Always needed for this domain
- **Keyword-triggered skills** - Match against task keywords and file patterns

---

## Step 4: Match Keywords to Library Skills

Cross-reference:

1. **Task description** from Phase 2 (Triage)
2. **Affected files** from Phase 3 (Codebase Discovery)
3. **Technologies detected** from Phase 3

Against gateway routing tables:

| Detected Pattern          | Matched Skill                  | Gateway Source   |
| ------------------------- | ------------------------------ | ---------------- |
| TanStack Query in imports | using-tanstack-query           | gateway-frontend |
| TanStack Table component  | using-tanstack-table           | gateway-frontend |
| Zustand store files       | using-zustand-state-management | gateway-frontend |
| Go test files             | implementing-golang-tests      | gateway-backend  |
| Lambda handler pattern    | implementing-lambda-handlers   | gateway-backend  |
| Playwright test files     | testing-with-playwright        | gateway-testing  |

---

## Step 5: Write Skill Manifest

Create `{OUTPUT_DIR}/skill-manifest.yaml`:

```yaml
# Skill Manifest
# Generated: {timestamp}
# Source: Phase 4 Skill Discovery

# Gateways discovered dynamically
available_gateways:
  - gateway-backend
  - gateway-capabilities
  - gateway-claude
  - gateway-frontend
  - gateway-integrations
  - gateway-mcp-tools
  - gateway-security
  - gateway-testing
  - gateway-typescript

# Gateways relevant to this workflow
relevant_gateways:
  - gateway: gateway-frontend
    reason: "React, TypeScript, TanStack Query detected"
  - gateway: gateway-backend
    reason: "Go, Lambda handlers detected"
  - gateway: gateway-testing
    reason: "Vitest, Playwright detected"

# Skills by domain (for agent prompt injection in later phases)
skills_by_domain:
  frontend:
    core_skills:
      - developing-with-tdd
      - adhering-to-dry
      - adhering-to-yagni
      - verifying-before-completion
    library_skills:
      - path: ".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md"
        trigger: "TanStack Query in useUser.ts"
      - path: ".claude/skill-library/development/frontend/using-tanstack-table/SKILL.md"
        trigger: "TanStack Table in AssetTable.tsx"
      - path: ".claude/skill-library/development/frontend/preventing-react-hook-infinite-loops/SKILL.md"
        trigger: "Custom hooks detected"

  backend:
    core_skills:
      - developing-with-tdd
      - adhering-to-dry
      - verifying-before-completion
    library_skills:
      - path: ".claude/skill-library/development/backend/implementing-lambda-handlers/SKILL.md"
        trigger: "Lambda handler pattern in handlers/"
      - path: ".claude/skill-library/development/backend/go-best-practices/SKILL.md"
        trigger: "Go files detected"

  testing:
    core_skills:
      - developing-with-tdd
      - verifying-before-completion
    library_skills:
      - path: ".claude/skill-library/testing/testing-anti-patterns/SKILL.md"
        trigger: "Mandatory for all testing"
      - path: ".claude/skill-library/testing/frontend/testing-with-vitest/SKILL.md"
        trigger: "Vitest config detected"
      - path: ".claude/skill-library/testing/frontend/testing-with-playwright/SKILL.md"
        trigger: "Playwright config detected"

# Phase-specific skill requirements
phase_skills:
  phase_6_brainstorming:
    - brainstorming
  phase_7_architecture_plan:
    - brainstorming
    - writing-plans
    - enforcing-evidence-based-analysis
  phase_8_implementation:
    - developing-with-tdd
    - adhering-to-dry
    - adhering-to-yagni
  phase_11_code_quality:
    - verifying-before-completion
  phase_13_testing:
    - developing-with-tdd
    - verifying-before-completion
```

---

## Step 6: Update MANIFEST.yaml

```yaml
phases:
  4_skill_discovery:
    status: "complete"
    completed_at: "{timestamp}"

skill_discovery:
  completed_at: "{timestamp}"
  gateways_discovered: 9
  gateways_relevant: 3

  relevant_gateways:
    - gateway-frontend
    - gateway-backend
    - gateway-testing

  library_skills_identified: 8

  manifest_path: "{OUTPUT_DIR}/skill-manifest.yaml"
```

---

## Step 7: Update TodoWrite & Report

```markdown
## Skill Discovery Complete

**Gateways Discovered:** 9 available
**Gateways Relevant:** 3 (frontend, backend, testing)
**Library Skills Identified:** 8

**Key Skills for This Workflow:**

- Frontend: using-tanstack-query, using-tanstack-table, preventing-react-hook-infinite-loops
- Backend: implementing-lambda-handlers, go-best-practices
- Testing: testing-anti-patterns, testing-with-vitest, testing-with-playwright

**Manifest written to:** {OUTPUT_DIR}/skill-manifest.yaml

→ Proceeding to Phase 5: Complexity Assessment
```

---

## How Later Phases Use This Manifest

The skill manifest is consumed by agent-spawning phases:

| Phase                      | Reads From Manifest         | Injects Into           |
| -------------------------- | --------------------------- | ---------------------- |
| Phase 7: Architecture Plan | `skills_by_domain.{domain}` | Architect agent prompt |
| Phase 8: Implementation    | `skills_by_domain.{domain}` | Developer agent prompt |
| Phase 11: Code Quality     | `skills_by_domain.{domain}` | Reviewer agent prompt  |
| Phase 13: Testing          | `skills_by_domain.testing`  | Tester agent prompt    |

**Example prompt injection (handled in later phase):**

```markdown
Based on codebase discovery, you MUST read these skills BEFORE starting:
{{#each skills_by_domain.frontend.library_skills}}

- {{this.path}}
  {{/each}}
```

The injection logic lives in delegation templates, not in this phase.

---

## Edge Cases

### No Technologies Detected

If Phase 3 found no specific technologies:

- Use only mandatory gateway skills
- Document as "generic implementation"
- Flag for human review

### New Gateway Added

Because we discover gateways dynamically via Glob, new gateways are automatically included. No hardcoded lists to update.

### Gateway Removed/Renamed

If a gateway in `relevant_gateways` no longer exists:

- Glob will not return it
- Log warning in manifest
- Continue with available gateways

---

## Related References

- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Provides technologies_detected
- [Phase 5: Complexity](phase-5-complexity.md) - Uses skill count for estimation
- [Delegation Templates](delegation-templates.md) - Uses manifest for prompt construction
- [using-skills](../../using-skills/SKILL.md) - Skill discovery framework
