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
- **COMPACTION GATE 1:** Must complete [compaction-gates.md](compaction-gates.md) protocol before this phase

**Exit Criteria:** Skill manifest written to output directory, ready for agent prompt construction.

---

## Step 1: Discover Available Gateways

**Do NOT hardcode gateway lists.** Discover dynamically:

```bash
Glob(".claude/skills/gateway-*/SKILL.md")
```

This returns all available gateways automatically. Store the list for Step 2.

---

## Step 2: Map Technologies to Gateways

Read `technologies_detected` from Phase 3 discovery:

```yaml
technologies_detected:
  frontend: ["React 19", "TypeScript", "TanStack Query", "TanStack Table", "Tailwind CSS"]
  testing: ["Vitest", "Playwright", "MSW"]
```

**Feature-specific technology-to-gateway mapping:**

| Technology Category     | Primary Gateway  | Secondary Gateways |
| ----------------------- | ---------------- | ------------------ |
| React, TypeScript, UI   | gateway-frontend | gateway-typescript |
| TanStack Query/Table    | gateway-frontend | -                  |
| Go, Lambda, AWS         | gateway-backend  | -                  |
| Vitest, Playwright, MSW | gateway-testing  | -                  |
| State (Zustand)         | gateway-frontend | -                  |
| Auth, secrets           | gateway-security | (domain gateway)   |

**Output:** List of relevant gateways for this feature.

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

## Step 4: Match Patterns to Library Skills

Cross-reference:

1. **Task description** from Phase 2 (Triage)
2. **Affected files** from Phase 3 (Codebase Discovery)
3. **Technologies detected** from Phase 3

Against gateway routing tables:

**Feature-specific pattern matching:**

| Detected Pattern          | Matched Skill                        | Gateway Source   |
| ------------------------- | ------------------------------------ | ---------------- |
| TanStack Query in imports | using-tanstack-query                 | gateway-frontend |
| TanStack Table component  | using-tanstack-table                 | gateway-frontend |
| Zustand store files       | using-zustand-state-management       | gateway-frontend |
| Custom React hooks        | preventing-react-hook-infinite-loops | gateway-frontend |
| Tailwind classes          | using-tailwind-css                   | gateway-frontend |
| Vitest test files         | testing-with-vitest                  | gateway-testing  |
| Playwright spec files     | testing-with-playwright              | gateway-testing  |
| MSW handlers              | testing-with-msw                     | gateway-testing  |

---

## Step 5: Write Skill Manifest

Create `.feature-development/skill-manifest.yaml`:

```yaml
# Skill Manifest
# Generated: {timestamp}
# Source: Phase 4 Skill Discovery

# Gateways relevant to this feature
relevant_gateways:
  - gateway: gateway-frontend
    reason: "React, TypeScript, TanStack Query detected"
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
        trigger: "TanStack Query in useAssets.ts"
      - path: ".claude/skill-library/development/frontend/using-tanstack-table/SKILL.md"
        trigger: "TanStack Table in AssetTable.tsx"
      - path: ".claude/skill-library/development/frontend/preventing-react-hook-infinite-loops/SKILL.md"
        trigger: "Custom hooks detected"

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

skills_mapped:
  - using-tanstack-query
  - using-tanstack-table
  - preventing-react-hook-infinite-loops
  - testing-with-vitest
  - testing-with-playwright

skill_discovery:
  completed_at: "{timestamp}"
  gateways_relevant: 2
  library_skills_identified: 5
  manifest_path: ".feature-development/skill-manifest.yaml"
```

---

## Step 7: Update TodoWrite & Report

```markdown
## Skill Discovery Complete

**Gateways Relevant:** 2 (frontend, testing)
**Library Skills Identified:** 5

**Key Skills for This Feature:**

- Frontend: using-tanstack-query, using-tanstack-table, preventing-react-hook-infinite-loops
- Testing: testing-with-vitest, testing-with-playwright

**Manifest written to:** .feature-development/skill-manifest.yaml

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

- Use only core skills from feature_type domain
- Document as "generic implementation"
- Flag for human review

### Full-Stack Feature

If feature_type is "full-stack":

- Include skills from both frontend and backend domains
- Separate into frontend/backend sections in manifest

---

## Related References

- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Provides technologies_detected
- [Phase 5: Complexity](phase-5-complexity.md) - Uses skill count for estimation
- [Delegation Templates](delegation-templates.md) - Uses manifest for prompt construction
- [Compaction Gates](compaction-gates.md) - Gate 1 precedes this phase
