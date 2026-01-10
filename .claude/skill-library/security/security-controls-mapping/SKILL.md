---
name: security-controls-mapping
description: Use when mapping security controls for threat modeling - identifies authentication, authorization, validation, cryptography, logging controls and gaps per STRIDE categories
allowed-tools: Read, Write, Grep, Glob, Bash, TodoWrite
---

# Security Controls Mapping

**Systematic methodology for mapping existing security controls and identifying gaps for Phase 4 of threat modeling.**

## When to Use

Use this skill when:
- Performing Phase 4 of threat modeling (security controls analysis)
- Analyzing security mechanisms after codebase mapping (Phase 3)
- Need to map controls to STRIDE threat categories
- Preparing structured input for Phase 5 (threat identification)
- Identifying control gaps for security test planning

**You MUST use TodoWrite** to track progress through all 8 control categories.

---

## Phase 1 Context (Required Inputs)

**Phase 4 evaluates security controls against Phase 1 compliance requirements.**

### What Phase 1 Provides

Phase 1 (Business Context Discovery) produces:
- **Compliance requirements** (SOC2, PCI-DSS, HIPAA, GDPR) → Validate specific regulatory controls
- **Regulatory gaps** → Document which requirements are not met
- **Compliance status** → Track progress toward compliance (requirements met/gaps)

**Without Phase 1**: Control mapping is generic (finds controls, but doesn't validate compliance).
**With Phase 1**: Mapping validates regulatory requirements (compliance-driven evaluation).

### Required Files

**Load before control analysis**:
- `../phase-1/summary.md` - Quick compliance overview
- `../phase-1/compliance-requirements.json` - Specific regulatory requirements to validate

**Error Handling**: If Phase 1 files missing, skill MUST error and instruct user to run `business-context-discovery` skill first.

### For Complete Phase 1 Integration Details

**See [references/phase-1-compliance-integration.md](references/phase-1-compliance-integration.md)** for:
- Compliance validation workflow (load requirements, map to control categories, validate, generate status)
- `control-gaps.json` schema with `compliance_requirement` field
- Summary generation with compliance evaluation section
- Testing scenarios and validation examples
- Complete examples for PCI-DSS, SOC2, HIPAA validation

---

## Critical Rules

### This is Formal Threat Modeling, Not a Quick Security Review

**If you're under time pressure:**
- ✅ Reduce SCOPE (analyze fewer control categories)
- ✅ Request deadline extension
- ✅ Communicate you need X hours for proper methodology
- ❌ Skip categories or produce ad-hoc output structure

**Why structured artifacts are non-negotiable:**
- Phase 5 (threat modeling) requires specific JSON files per control category
- STRIDE threat mapping depends on consistent control categorization
- Phase 6 (test planning) prioritizes based on control gaps
- Ad-hoc output = Phase 5 cannot consume your results

### Output Schema is Non-Negotiable

**MUST produce these exact files (per architecture spec):**
```
phase-4/
├── authentication.json
├── authorization.json
├── input-validation.json
├── output-encoding.json
├── cryptography.json
├── secrets-management.json
├── logging-audit.json
├── rate-limiting.json
├── cors-csp.json           # Browser security only (skip for backend-only)
├── dependency-security.json
├── control-gaps.json
└── summary.md
```

**NOT acceptable alternatives:**
- ❌ "security-controls-inventory.json" (wrong name)
- ❌ "stride-control-mapping.json" (not in spec)
- ❌ "consolidated-controls.json" (Phase 5 can't find it)

### Expertise Does Not Replace Methodology

**Common rationalizations to avoid:**
- ❌ "I can see the auth is Cognito, no need to document"
- ❌ "Quick grep for validation patterns is sufficient"
- ❌ "Single JSON file is cleaner than 12 files"
- ❌ "I'll note gaps inline instead of separate file"

**Reality:**
- Documenting controls creates audit trail
- Systematic detection catches edge cases
- Separate files enable parallel analysis
- Gaps file enables prioritized test planning

### "Substance Over Structure" is a Trap

<EXTREMELY_IMPORTANT>
The 12-file output structure is NOT arbitrary preference. It is MANDATORY for Phase 5 automation.

**FACT**: The `threat-modeling-orchestrator` skill (`.claude/skills/threat-modeling-orchestrator/`) loads these files by exact name:
```
Phase 5 loads: authentication.json, authorization.json, input-validation.json, etc.
Phase 5 CANNOT load: security-controls-inventory.json, stride-control-mapping.json
```

If you produce wrong file names, Phase 5 orchestrator fails. This is not opinion - this is code dependency.
</EXTREMELY_IMPORTANT>

**Common rationalizations to reject:**

❌ **"The work is substantively complete, just wrong structure"**
- Reality: Phase 5 orchestrator cannot load your files → Phase 5 fails → Threat model incomplete
- This isn't about quality - it's about interface contract

❌ **"7 files contain same information as 12 files"**
- Reality: Information is useless if consumer can't find it
- Phase 5 does `Read authentication.json` - file must exist with that exact name

❌ **"I'll restructure tomorrow when fresh"**
- Reality: "Tomorrow" means Phase 4 incomplete tonight → Phase 5 blocked → Workflow stops
- Reality: Restructuring takes 2-3 minutes for AI (not 1-2 hours) - exhaustion is irrelevant

❌ **"Skills are guidance, not law - adapt to context"**
- Reality: Interface contracts ARE law - Phase 5 expects specific inputs
- Reality: This skill IS the contract between Phase 4 and Phase 5
- Adapting = breaking the contract = blocking downstream work

❌ **"YAGNI - no tooling exists for this format"**
- Reality: The tooling IS Phase 5's orchestrator - already written, already expects these files
- Reality: You're not building for hypothetical future - you're building for next phase TODAY

❌ **"Single consolidated file is cleaner/better organized"**
- Reality: "Better" is irrelevant - what matters is "compatible with Phase 5"
- Reality: Separate files enable parallel agent work on different categories
- Reality: You don't get to redesign interfaces mid-workflow

❌ **"Keep both formats / Convert later"**
- Reality: Maintaining duplicate state violates DRY and creates sync bugs
- Reality: "Convert later" = technical debt when conversion takes 2-3 minutes now

**The ONLY acceptable responses:**
1. ✅ Delete wrong format, create correct format (takes 2-3 minutes for AI)
2. ✅ Reduce scope (map fewer categories, but use correct schema)
3. ✅ Stop entirely and communicate "Phase 4 incomplete" (don't ship wrong format)

**NOT acceptable:**
- ❌ Ship wrong format and claim it's "substantively equivalent"
- ❌ Ship wrong format and defer fixing to "tomorrow"
- ❌ Ship both formats (duplicate state)
- ❌ Argue the skill is wrong (follow it, then propose update)

**Bottom line**: You don't have 7 files of good work. You have 0 files of usable work for Phase 5. Restructure now (2-3 minutes) or communicate Phase 4 failed.

---

## Quick Reference

| Step | Purpose | Output |
|------|---------|--------|
| 1. Load Phase 3 Artifacts | Get architecture context | Phase 3 summary loaded |
| 2. Authentication Controls | Map auth mechanisms | `authentication.json` |
| 3. Authorization Controls | Map authz patterns | `authorization.json` |
| 4. Input Validation | Map validation patterns | `input-validation.json` |
| 5. Output Encoding | Map output security | `output-encoding.json` |
| 6. Cryptography | Map encryption/hashing | `cryptography.json` |
| 7. Secrets Management | Map secret handling | `secrets-management.json` |
| 8. Supporting Controls | Logging, rate limiting, CORS, deps | 4 JSON files |
| 9. Gap Analysis | Identify missing controls | `control-gaps.json` |
| 10. Summary | Compress for handoff | `summary.md` (<2000 tokens) |

---

## Core Workflow

This skill supports two execution modes:

1. **Per-Concern Mode (Default)**: Investigate individual security concerns from Phase 1 across relevant control categories
2. **Full-Mapping Mode (Legacy)**: Map all controls across all categories in a single pass

**For detailed step-by-step instructions** for full-mapping mode, see [references/detailed-workflow.md](references/detailed-workflow.md).

**For per-concern execution**, follow investigation patterns in the Parallelization Strategy section below.

---

## Output Artifacts

All outputs go to: `.claude/.output/threat-modeling/{timestamp}-{slug}/phase-4/`

| File | STRIDE Defense | Consumer |
|------|----------------|----------|
| `authentication.json` | Spoofing | Phase 5 threat scenarios |
| `authorization.json` | Elevation of Privilege | Phase 5 threat scenarios |
| `input-validation.json` | Tampering | Phase 5 threat scenarios |
| `output-encoding.json` | Information Disclosure | Phase 5 threat scenarios |
| `cryptography.json` | Information Disclosure | Phase 5 threat scenarios |
| `secrets-management.json` | Information Disclosure | Phase 5 threat scenarios |
| `logging-audit.json` | Repudiation | Phase 5 threat scenarios |
| `rate-limiting.json` | Denial of Service | Phase 5 threat scenarios |
| `cors-csp.json` | Browser Security | Phase 5 (frontend only) |
| `dependency-security.json` | Supply Chain | Phase 5 threat scenarios |
| `control-gaps.json` | All | Phase 6 test planning |
| `summary.md` | - | Orchestrator handoff |

See [references/output-schemas.md](references/output-schemas.md) for JSON schemas.

---

## Parallelization Strategy

### Per-Concern Batched Execution (Default)

The orchestrator spawns **one agent per security concern from Phase 1**, executing in **severity-ordered batches**:

```
Orchestrator workflow:
1. Load Phase 1 concerns (from phase-1/security-concerns.json)
2. Group by severity: CRITICAL → HIGH → MEDIUM → LOW → INFO
3. For each batch (severity level):
   ├── Spawn parallel agents, one per concern
   │   ├── Task("security-controls-mapper", "Investigate auth bypass in login endpoint")
   │   ├── Task("security-controls-mapper", "Investigate SQL injection in search API")
   │   └── Task("security-controls-mapper", "Investigate XSS in user profile")
   └── Wait for batch completion before next severity
4. Consolidate investigation files → 12 category JSON files
5. Generate control-gaps.json and summary.md
```

**Key differences from legacy approach:**
- **NOT** spawning one agent per category (authentication.json, authorization.json, etc.)
- **INSTEAD** spawning one agent per concern (identified in Phase 1)
- **Agents** investigate single concern across relevant categories
- **Orchestrator** consolidates investigations into the 12 category files

**See [threat-modeling-orchestrator/references/phase-4-batched-execution.md](../../skills/threat-modeling-orchestrator/references/phase-4-batched-execution.md)** for complete batching algorithm.

---

## Two-Tier Output Structure

**Understanding the dual output layers:**

### Tier 1: Investigation Files (Per-Concern)

Each agent produces ONE investigation file:
```
phase-4/investigations/{severity}/{concern-id}-{name}.json
```

**Example:**
```
phase-4/investigations/CRITICAL/c7f2a-auth-bypass-in-login.json
phase-4/investigations/HIGH/d8e1b-sql-injection-in-search.json
```

**Schema:** See [threat-modeling-orchestrator/references/investigation-file-schema.md](../../skills/threat-modeling-orchestrator/references/investigation-file-schema.md)

**Key fields:**
- `concern_id` - Links to Phase 1 concern
- `controls_found` - Array of controls relevant to this concern
- `control_categories` - Which of the 12 categories this concern touches (e.g., ["authentication", "authorization"])
- `gaps_identified` - Control weaknesses for this specific concern

### Tier 2: Category Files (Consolidated)

The **ORCHESTRATOR** (not individual agents) consolidates investigations into 12 category files:

```
phase-4/
├── authentication.json      # Consolidates all auth-related controls from investigations
├── authorization.json       # Consolidates all authz-related controls
├── input-validation.json    # Consolidates validation controls
├── output-encoding.json     # Consolidates encoding controls
├── cryptography.json        # Consolidates crypto controls
├── secrets-management.json  # Consolidates secrets handling
├── logging-audit.json       # Consolidates logging controls
├── rate-limiting.json       # Consolidates rate limiting
├── cors-csp.json           # Consolidates browser security
├── dependency-security.json # Consolidates dependency controls
├── control-gaps.json       # Aggregated gaps from all investigations
└── summary.md              # Executive summary
```

**Consolidation algorithm:** See [threat-modeling-orchestrator/references/consolidation-algorithm.md](../../skills/threat-modeling-orchestrator/references/consolidation-algorithm.md)

**Why two tiers?**
1. **Investigation files** = granular per-concern work products (enables parallel execution)
2. **Category files** = standardized Phase 5 inputs (STRIDE mapping requires this structure)
3. **Orchestrator** handles deduplication and aggregation across investigations

### Legacy Full-Mapping Mode

For backward compatibility, single-agent mode still supported:
```
Task("security-controls-mapper", "Map all authentication controls") → authentication.json
Task("security-controls-mapper", "Map all authorization controls") → authorization.json
```

This mode produces Tier 2 files directly (no investigation files).

---

## Troubleshooting

**Problem**: No auth controls detected
**Solution**: Check for custom auth middleware. Look for request interceptors, middleware chains.

**Problem**: Can't verify control effectiveness
**Solution**: Mark as "unverified" in gap analysis. Flag for penetration testing in Phase 6.

**Problem**: Mixed frontend/backend codebase
**Solution**: Run separately for each. Frontend needs CORS/CSP, backend doesn't.

**Problem**: Microservices architecture
**Solution**: Map controls per service. Note service-to-service auth separately.

---

## References

- [references/output-schemas.md](references/output-schemas.md) - JSON schemas for all artifacts
- [references/detection-patterns.md](references/detection-patterns.md) - Extended detection patterns
- [references/stride-mapping.md](references/stride-mapping.md) - STRIDE threat category details

## Related Skills

- `business-context-discovery` - Phase 1: REQUIRED before this skill - discovers compliance requirements (SOC2, PCI-DSS, HIPAA, GDPR)
- `codebase-sizing` - Phase 2: Sizing analysis before mapping
- `codebase-mapping` - Phase 3: Maps architecture before controls mapping
- `threat-modeling` - Phase 5: Uses control maps for threat identification
- `security-test-planning` - Phase 6: Uses control gaps for test prioritization
