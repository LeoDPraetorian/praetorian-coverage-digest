# Phase 4: Skill Discovery

**Identify relevant skills based on codebase discovery findings and store for agent prompt construction.**

---

## Overview

Skill Discovery uses Phase 3's codebase and protocol findings to identify which skills agents will need:

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

Read `technologies_detected` from Phase 3 discovery. For fingerprintx plugins:

```yaml
technologies_detected:
  backend: ["Go", "fingerprintx patterns"]
  testing: ["Go testing", "Docker", "testify"]
```

**Fingerprintx-specific technology-to-gateway mapping:**

| Technology Category   | Primary Gateway      | Secondary Gateways   |
| --------------------- | -------------------- | -------------------- |
| Go, {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins       | gateway-backend      | gateway-capabilities |
| fingerprintx patterns | gateway-capabilities | -                    |
| Go testing, testify   | gateway-testing      | -                    |
| Security scanning     | gateway-security     | -                    |

**Output:** List of relevant gateways for this plugin.

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
3. **Protocol research** from Phase 3

Against gateway routing tables:

**Fingerprintx-specific pattern matching:**

| Detected Pattern        | Matched Skill                | Gateway Source       |
| ----------------------- | ---------------------------- | -------------------- |
| Go plugin files         | go-best-practices            | gateway-backend      |
| fingerprintx module     | writing-nerva-tcp-udp-modules | gateway-capabilities |
| Protocol banner parsing | researching-protocols        | gateway-capabilities |
| Version extraction      | researching-version-markers  | gateway-capabilities |
| Go test files           | implementing-golang-tests    | gateway-testing      |
| testify assertions      | implementing-golang-tests    | gateway-testing      |
| Shodan validation       | validating-live-with-shodan  | gateway-capabilities |

---

## Step 5: Write Skill Manifest

Create `.fingerprintx-development/skill-manifest.yaml`:

```yaml
# Skill Manifest
# Generated: {timestamp}
# Source: Phase 4 Skill Discovery

# Gateways relevant to this plugin
relevant_gateways:
  - gateway: gateway-capabilities
    reason: "Fingerprintx plugin development"
  - gateway: gateway-backend
    reason: "Go implementation"
  - gateway: gateway-testing
    reason: "Go testing patterns"

# Skills by domain (for agent prompt injection in later phases)
skills_by_domain:
  capabilities:
    core_skills:
      - developing-with-tdd
      - adhering-to-dry
      - adhering-to-yagni
      - verifying-before-completion
    library_skills:
      - path: ".claude/skill-library/development/capabilities/nerva/writing-nerva-tcp-udp-modules/SKILL.md"
        trigger: "Fingerprintx plugin development"
      - path: ".claude/skill-library/development/capabilities/reviewing-capability-implementations/SKILL.md"
        trigger: "Capability review phase"
      - path: ".claude/skill-library/research/researching-protocols/SKILL.md"
        trigger: "Protocol detection strategy"
      - path: ".claude/skill-library/research/researching-version-markers/SKILL.md"
        trigger: "Version extraction (if open-source)"

  backend:
    core_skills:
      - developing-with-tdd
      - adhering-to-dry
    library_skills:
      - path: ".claude/skill-library/development/backend/go-best-practices/SKILL.md"
        trigger: "Go implementation"

  testing:
    core_skills:
      - developing-with-tdd
      - verifying-before-completion
    library_skills:
      - path: ".claude/skill-library/testing/backend/implementing-golang-tests/SKILL.md"
        trigger: "Go test files"

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
    - writing-nerva-tcp-udp-modules
  phase_11_code_quality:
    - verifying-before-completion
    - reviewing-capability-implementations
  phase_13_testing:
    - developing-with-tdd
    - verifying-before-completion
    - implementing-golang-tests
```

---

## Step 6: Update MANIFEST.yaml

```yaml
phases:
  4_skill_discovery:
    status: "complete"
    completed_at: "{timestamp}"

skills_mapped:
  - writing-nerva-tcp-udp-modules
  - researching-protocols
  - researching-version-markers
  - go-best-practices
  - implementing-golang-tests

skill_discovery:
  completed_at: "{timestamp}"
  gateways_relevant: 3
  library_skills_identified: 6
  manifest_path: ".fingerprintx-development/skill-manifest.yaml"
```

---

## Step 7: Update TodoWrite & Report

```markdown
## Skill Discovery Complete

**Gateways Relevant:** 3 (capabilities, backend, testing)
**Library Skills Identified:** 6

**Key Skills for This Plugin:**

- Capabilities: writing-nerva-tcp-udp-modules, researching-protocols
- Backend: go-best-practices
- Testing: implementing-golang-tests

**Manifest written to:** .fingerprintx-development/skill-manifest.yaml

-> Proceeding to Phase 5: Complexity Assessment
```

---

## How Later Phases Use This Manifest

The skill manifest is consumed by agent-spawning phases:

| Phase                      | Reads From Manifest             | Injects Into                 |
| -------------------------- | ------------------------------- | ---------------------------- |
| Phase 7: Architecture Plan | `skills_by_domain.capabilities` | Capability-lead agent prompt |
| Phase 8: Implementation    | `skills_by_domain.capabilities` | Capability-developer prompt  |
| Phase 11: Code Quality     | `skills_by_domain.capabilities` | Capability-reviewer prompt   |
| Phase 13: Testing          | `skills_by_domain.testing`      | Capability-tester prompt     |

**Example prompt injection (handled in later phase):**

```markdown
Based on codebase discovery, you MUST read these skills BEFORE starting:
{{#each skills_by_domain.capabilities.library_skills}}

- {{this.path}}
  {{/each}}
```

The injection logic lives in delegation templates, not in this phase.

---

## Fingerprintx-Specific Skills

These skills are almost always relevant for fingerprintx plugins:

| Skill                                  | Phase | Purpose                            |
| -------------------------------------- | ----- | ---------------------------------- |
| `writing-nerva-tcp-udp-modules`         | 8     | Go plugin implementation patterns  |
| `researching-protocols`                | 3     | Protocol banner detection strategy |
| `researching-version-markers`          | 3     | Version fingerprint extraction     |
| `go-best-practices`                    | 8     | Go coding conventions              |
| `implementing-golang-tests`            | 13    | Go test patterns                   |
| `reviewing-capability-implementations` | 11    | Capability review checklist        |
| `validating-live-with-shodan`          | 14    | Real-world validation              |

---

## Edge Cases

### No Technologies Detected

If Phase 3 found no specific patterns:

- Use only core skills for capabilities domain
- Document as "standard plugin implementation"
- Follow base fingerprintx patterns

### Complex Protocol

If protocol requires multiple detection strategies:

- Include all relevant research skills
- Flag for extra architecture attention
- Document complexity in manifest notes

---

## Related References

- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Provides technologies_detected
- [Phase 5: Complexity](phase-5-complexity.md) - Uses skill count for estimation
- [Delegation Templates](delegation-templates.md) - Uses manifest for prompt construction
- [Compaction Gates](compaction-gates.md) - Gate 1 precedes this phase
