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

- Phase 3 (Codebase Discovery) complete, capability_type confirmed, technologies_detected documented
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
  capability: ["VQL", "Velociraptor artifacts"]
  testing: ["VQL test harness", "Go test fixtures"]
```

**Capability-specific technology-to-gateway mapping:**

| Capability Type     | Primary Gateway      | Secondary Gateways |
| ------------------- | -------------------- | ------------------ |
| VQL                 | gateway-capabilities | gateway-security   |
| Nuclei              | gateway-capabilities | gateway-security   |
| Janus               | gateway-capabilities | gateway-backend    |
| Fingerprintx        | gateway-capabilities | gateway-backend    |
| Scanner Integration | gateway-capabilities | gateway-backend    |

**Technology-to-gateway mapping by detected technology:**

| Technology Category    | Primary Gateway      | Secondary Gateways |
| ---------------------- | -------------------- | ------------------ |
| VQL, Velociraptor      | gateway-capabilities | -                  |
| Nuclei, YAML templates | gateway-capabilities | -                  |
| Go, interfaces         | gateway-backend      | -                  |
| Go testing, fixtures   | gateway-testing      | -                  |
| API integration        | gateway-integrations | -                  |
| Security detection     | gateway-security     | -                  |

**Output:** List of relevant gateways for this capability.

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
2. **Capability type** from Phase 3 (Codebase Discovery)
3. **Technologies detected** from Phase 3

Against gateway routing tables:

**Capability-specific pattern matching:**

| Capability Type | Matched Skills                       | Gateway Source       |
| --------------- | ------------------------------------ | -------------------- |
| VQL             | writing-vql-capabilities             | gateway-capabilities |
| VQL             | reviewing-capability-implementations | gateway-capabilities |
| Nuclei          | writing-nuclei-templates             | gateway-capabilities |
| Nuclei          | reviewing-capability-implementations | gateway-capabilities |
| Janus           | writing-janus-tool-chains            | gateway-capabilities |
| Janus           | go-best-practices                    | gateway-backend      |
| Fingerprintx    | writing-fingerprintx-modules         | gateway-capabilities |
| Fingerprintx    | go-best-practices                    | gateway-backend      |
| Scanner         | developing-integrations              | gateway-integrations |
| Scanner         | go-best-practices                    | gateway-backend      |

---

## Step 5: Write Skill Manifest

Create `.capability-development/skill-manifest.yaml`:

```yaml
# Skill Manifest
# Generated: {timestamp}
# Source: Phase 4 Skill Discovery
# Capability Type: {capability_type}

# Gateways relevant to this capability
relevant_gateways:
  - gateway: gateway-capabilities
    reason: "VQL capability development"
  - gateway: gateway-security
    reason: "Security detection patterns"

# Skills by domain (for agent prompt injection in later phases)
skills_by_domain:
  capabilities:
    core_skills:
      - developing-with-tdd
      - adhering-to-dry
      - adhering-to-yagni
      - verifying-before-completion
    library_skills:
      - path: ".claude/skill-library/development/capabilities/writing-vql-capabilities/SKILL.md"
        trigger: "VQL capability type detected"
      - path: ".claude/skill-library/development/capabilities/reviewing-capability-implementations/SKILL.md"
        trigger: "Capability review required"

  testing:
    core_skills:
      - developing-with-tdd
      - verifying-before-completion
    library_skills:
      - path: ".claude/skill-library/testing/testing-capabilities/SKILL.md"
        trigger: "Capability testing required"

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

# Capability-type-specific skills
capability_type_skills:
  VQL:
    - writing-vql-capabilities
    - vql-artifact-patterns
  Nuclei:
    - writing-nuclei-templates
    - nuclei-matcher-patterns
  Janus:
    - writing-janus-tool-chains
    - go-best-practices
  Fingerprintx:
    - writing-fingerprintx-modules
    - go-best-practices
  Scanner:
    - developing-integrations
    - go-best-practices
```

---

## Step 6: Update MANIFEST.yaml

```yaml
phases:
  4_skill_discovery:
    status: "complete"
    completed_at: "{timestamp}"

skills_mapped:
  - writing-vql-capabilities
  - reviewing-capability-implementations
  - testing-capabilities

skill_discovery:
  completed_at: "{timestamp}"
  gateways_relevant: 2
  library_skills_identified: 3
  manifest_path: ".capability-development/skill-manifest.yaml"
```

---

## Step 7: Update TodoWrite & Report

```markdown
## Skill Discovery Complete

**Gateways Relevant:** 2 (capabilities, security)
**Library Skills Identified:** 3

**Key Skills for This Capability:**

- Capabilities: writing-vql-capabilities, reviewing-capability-implementations
- Testing: testing-capabilities

**Manifest written to:** .capability-development/skill-manifest.yaml

-> Proceeding to Phase 5: Complexity Assessment
```

---

## How Later Phases Use This Manifest

The skill manifest is consumed by agent-spawning phases:

| Phase                      | Reads From Manifest             | Injects Into                |
| -------------------------- | ------------------------------- | --------------------------- |
| Phase 7: Architecture Plan | `skills_by_domain.capabilities` | capability-lead prompt      |
| Phase 8: Implementation    | `skills_by_domain.capabilities` | capability-developer prompt |
| Phase 11: Code Quality     | `skills_by_domain.capabilities` | capability-reviewer prompt  |
| Phase 13: Testing          | `skills_by_domain.testing`      | capability-tester prompt    |

**Example prompt injection (handled in later phase):**

```markdown
Based on codebase discovery, you MUST read these skills BEFORE starting:
{{#each skills_by_domain.capabilities.library_skills}}

- {{this.path}}
  {{/each}}
```

The injection logic lives in delegation templates, not in this phase.

---

## Capability-Type-Specific Skill Sets

### VQL Capabilities

```yaml
mandatory_skills:
  - writing-vql-capabilities
  - vql-artifact-patterns
  - reviewing-capability-implementations
conditional_skills:
  - vql-collector-patterns # If custom collector needed
  - vql-performance-optimization # If large-scale scanning
```

### Nuclei Templates

```yaml
mandatory_skills:
  - writing-nuclei-templates
  - nuclei-matcher-patterns
  - reviewing-capability-implementations
conditional_skills:
  - nuclei-workflow-patterns # If multi-step workflow
  - nuclei-extractor-patterns # If dynamic extraction needed
```

### Janus/Fingerprintx/Scanner

```yaml
mandatory_skills:
  - go-best-practices
  - developing-integrations # Scanner only
  - reviewing-capability-implementations
conditional_skills:
  - go-concurrency-patterns # If parallel processing
  - go-interface-design # If new interfaces
```

---

## Edge Cases

### No Technologies Detected

If Phase 3 found no specific technologies:

- Use only core skills from capability_type domain
- Document as "generic implementation"
- Flag for human review

### Multiple Capability Types

If capability spans multiple types (e.g., Janus chain + Fingerprintx):

- Include skills from all relevant capability types
- Separate into primary/secondary sections in manifest

---

## Related References

- [Phase 3: Codebase Discovery](phase-3-codebase-discovery.md) - Provides technologies_detected
- [Phase 5: Complexity](phase-5-complexity.md) - Uses skill count for estimation
- [Delegation Templates](delegation-templates.md) - Uses manifest for prompt construction
- [Compaction Gates](compaction-gates.md) - Gate 1 precedes this phase
- [Capability Types](capability-types.md) - Capability-specific skill requirements
