# Agent Fix Phase Categorization

**Comprehensive mapping of all agent audit phases to fix categories.**

This document categorizes all 19 agent audit phases (Phase 0 + Phases 1-18) by fix type, following the pattern from `fixing-skills` three-tier model.

---

## Fix Categories

### Deterministic (CLI Auto-Fix)

**Handler:** TypeScript CLI (`npm run agent:fix`)
**User Interaction:** None (auto-apply)
**Phases:** 0, 2, 16

These fixes have **one correct answer** and can be applied automatically without human judgment:
- Block scalar conversion
- Name mismatch correction
- Frontmatter field reordering
- Table separator formatting

### Claude-Automated

**Handler:** Claude reasoning (no confirmation)
**User Interaction:** None (Claude applies directly)
**Phases:** 1, 3, 6, 9, 14, 15

These fixes require **semantic understanding** but have clear correct outcomes:
- PermissionMode alignment
- Tool validation corrections
- Pattern delegation
- Skill Loading Protocol generation
- Deprecated pattern removal
- Library path corrections

### Hybrid (CLI + Claude Reasoning)

**Handler:** CLI detection + Claude confirmation
**User Interaction:** Confirm ambiguous cases via AskUserQuestion
**Phases:** 4-5, 10-11, 17

These fixes have **multiple valid approaches** requiring user choice:
- Gateway enforcement (which gateway?)
- Library skill corrections (replace or keep?)
- Content duplication cleanup (delete or refactor?)

### Human-Required

**Handler:** Interactive guidance
**User Interaction:** Full user involvement
**Phases:** 7-8, 12-13, 18

These fixes require **genuine human judgment** that cannot be automated:
- Phantom/deprecated skill alternatives (domain knowledge)
- Coverage gap recommendations (architectural decisions)
- New skill discovery (skill ecosystem understanding)

---

## Complete Phase Table

| Phase | Name | Category | Handler | User Interaction |
|-------|------|----------|---------|------------------|
| **0** | Block Scalar Detection | Deterministic | CLI `agent:fix` | None (auto-apply) |
| **0** | Name Mismatch | Deterministic | CLI `agent:fix` | None (auto-apply) |
| **1** | PermissionMode Alignment | Claude-Automated | Claude applies | None (Claude decides) |
| **2** | Frontmatter Organization | Deterministic | CLI `agent:fix` | None (auto-apply) |
| **3** | Tool Validation | Claude-Automated | Claude applies | None (Claude decides) |
| **4** | Gateway Enforcement | Hybrid | Claude + Ask | Confirm gateway choice |
| **5** | Frontmatter Skill Location | Hybrid | Claude + Ask | Confirm replacement |
| **6** | Pattern Delegation | Claude-Automated | Claude applies | None (Claude decides) |
| **7** | Phantom Skills Detection | Human-Required | Interactive | User provides alternatives |
| **8** | Deprecated Skills Detection | Human-Required | Interactive | User provides migrations |
| **9** | Skill Loading Protocol | Claude-Automated | Claude applies | None (Claude decides) |
| **10** | Library Skills in Frontmatter | Hybrid | Claude + Ask | Confirm gateway replacement |
| **11** | Incorrect Skill Invocations | Hybrid | Claude + Ask | Confirm Read() replacement |
| **12** | Gateway Coverage | Human-Required | Interactive | User decides gateway additions |
| **13** | Skill Gap Analysis | Human-Required | Interactive | User decides skill additions |
| **14** | Deprecated Pattern Detection | Claude-Automated | Claude applies | None (Claude decides) |
| **15** | Library Skill Path Validation | Claude-Automated | Claude applies | None (Claude decides) |
| **16** | Markdown Table Formatting | Deterministic | CLI `agent:fix` | None (auto-apply) |
| **17** | Skill Content Duplication | Hybrid | Claude + Ask | Confirm deletion/refactor |
| **18** | New Skill Discovery | Human-Required | Interactive | User reviews suggestions |

---

## Fix Type Details

### Deterministic Fixes (Phase 0, 2, 16)

**Automated via CLI** - No confirmation needed

#### Phase 0: Block Scalar Detection
- **Issue:** Description uses `|` or `>` block scalars
- **Fix:** Convert to single-line format with `\n` escapes
- **Why deterministic:** Only one valid format (single-line)

#### Phase 0: Name Mismatch
- **Issue:** Frontmatter name ≠ filename
- **Fix:** Update frontmatter to match filename
- **Why deterministic:** Filename is source of truth

#### Phase 2: Frontmatter Organization
- **Issue:** Fields out of canonical order
- **Fix:** Reorder to: name, description, type, permissionMode, tools, skills, model, color
- **Why deterministic:** Canonical order is fixed

#### Phase 16: Markdown Table Formatting
- **Issue:** Table separators with < 3 dashes
- **Fix:** Replace with `|---|`
- **Why deterministic:** Markdown spec requires ≥3 dashes

---

### Claude-Automated Fixes (Phase 1, 3, 6, 9, 14, 15)

**Applied by Claude without confirmation** - Clear correct outcome

#### Phase 1: PermissionMode Alignment
- **Issue:** PermissionMode doesn't match agent type
- **Fix:** Set based on type (architecture/quality/analysis → `plan`, others → `default`)
- **Why Claude-automated:** Type mapping is deterministic, but requires understanding agent purpose

#### Phase 3: Tool Validation
- **Issue:** Missing required tools, forbidden tools present, OR missing Skill tool when skills exist
- **Fix:**
  - Add required tools (Edit/Write/Bash for development)
  - Remove forbidden tools (Edit/Write for quality/analysis)
  - **NEW:** Add Skill tool in alphabetical order when agent has skills in frontmatter
- **Why Claude-automated:** Rules are clear and deterministic, alphabetization is mechanical
- **Category:** Deterministic for Skill tool addition (exact alphabetical position)

#### Phase 6: Pattern Delegation
- **Issue:** Agent embeds >200 chars of TDD/debugging/verification patterns
- **Fix:** Remove embedded content, add skill reference in Tier 3
- **Why Claude-automated:** Pattern detection requires semantic understanding

#### Phase 9: Skill Loading Protocol
- **Issue:** Agent with `skills:` frontmatter missing Tiered Skill Loading Protocol
- **Fix:** Generate complete protocol (Tier 1/2/3, Anti-Bypass, skills_read)
- **Why Claude-automated:** Template-based but requires understanding agent's skills

#### Phase 14: Deprecated Pattern Detection
- **Issue:** `<EXTREMELY_IMPORTANT>` blocks, duplicate sections
- **Fix:** Delete deprecated patterns, consolidate duplicates
- **Why Claude-automated:** Structural patterns are clear to detect and remove

#### Phase 15: Library Skill Path Validation
- **Issue:** Skill paths point to renamed/moved skills
- **Fix:** Update paths to correct locations
- **Why Claude-automated:** Path resolution is deterministic once skill found

---

### Hybrid Fixes (Phase 4-5, 10-11, 17)

**Claude detects + User confirms** - Multiple valid approaches

#### Phase 4-5: Gateway Enforcement / Frontmatter Skill Location
- **Issue:** Library skill in frontmatter instead of gateway
- **Ambiguity:** Which gateway? (frontend/backend/testing/security/integrations)
- **Ask:** "Replace 'using-react-patterns' with which gateway?"
- **Options:** gateway-frontend, gateway-backend, gateway-testing, Keep as-is

#### Phase 10-11: Library Skills in Frontmatter / Incorrect Invocations
- **Issue:** Library skill referenced where core skill expected
- **Ambiguity:** Replace or keep for specific reason?
- **Ask:** "Replace library skill with gateway?"
- **Options:** Yes replace, No keep (has justification), Remove reference

#### Phase 17: Skill Content Duplication
- **Issue:** Agent body duplicates skill content (>100 chars)
- **Ambiguity:** Delete section or refactor to agent-specific summary?
- **Ask:** "Agent duplicates content from '{skill}'. How to fix?"
- **Options:** Delete section + add Tier 3, Refactor to summary, Keep (agent-specific twist)

---

### Human-Required Fixes (Phase 7-8, 12-13, 18)

**Interactive guidance** - Genuine human judgment needed

#### Phase 7-8: Phantom / Deprecated Skills
- **Issue:** Reference to non-existent or deprecated skill
- **Why human:** Requires domain knowledge to suggest correct alternative
- **Guidance:**
  1. Search for similar skills: `npm run search -- "{skill-name}"`
  2. Review suggestions and choose appropriate replacement
  3. Update all references

#### Phase 12-13: Gateway Coverage / Skill Gap Analysis
- **Issue:** Agent missing recommended gateway or mandatory universal skills
- **Why human:** Architectural decision about skill additions
- **Guidance:**
  1. Review agent's domain and responsibilities
  2. Decide if suggested gateway/skills are appropriate
  3. Add to frontmatter + Tier 1 if accepted

#### Phase 18: New Skill Discovery
- **Issue:** Missing applicable skills from gateways, orphaned skills, miscategorization
- **Why human:** Requires understanding of skill ecosystem and agent's needs
- **Guidance:**
  1. Review 3-tier analysis (gateway coverage, orphaned skills, miscategorization)
  2. Evaluate each suggestion against agent's actual needs
  3. Add skills that genuinely enhance agent capabilities

---

## Workflow Integration

### In auditing-agents Post-Audit Actions

When audit finds issues, user is prompted:

```
Question: The audit found fixable issues. How would you like to proceed?
Options:
  - Run full fixing workflow (Recommended)
  - Apply deterministic fixes only → npm run agent:fix
  - Show fix categorization → Read this file
  - Skip
```

### In fixing-agents Workflow

**Step 4: Apply Fixes** is split by category:

```
Step 4a: Apply Deterministic Fixes (CLI)
  → npm run agent:fix -- <agent-name>

Step 4b: Apply Claude-Automated Fixes
  → Claude applies Phases 1, 3, 6, 9, 14, 15 directly

Step 4c: Apply Hybrid Fixes
  → Claude detects Phases 4-5, 10-11, 17 and uses AskUserQuestion

Step 4d: Guide Human-Required Fixes
  → Interactive guidance for Phases 7-8, 12-13, 18
```

---

## Phase Details Reference

**For complete procedures for each phase, see:** [workflow-manual-checks.md](../../auditing-agents/references/workflow-manual-checks.md)

That document contains:
- Verification steps for each phase
- Grep commands to detect issues
- Pass/warning/error criteria
- Why each check matters

---

## Comparison to Skill Phases

**Agents have simpler fix model than skills:**

| Aspect | Skills (21 phases) | Agents (19 phases) |
|--------|-------------------|-------------------|
| Deterministic fixes | 7 (CLI) | 4 (CLI) |
| Claude-Automated | 6 | 6 |
| Hybrid | 5 | 5 |
| Human-Required | 3 | 4 |

**Why agents are simpler:**
- No directory structure validation (agents are single files)
- No TypeScript compilation (agents don't have scripts/)
- No skill-specific edge cases (allowed-tools, phantom references complex for skills)

**Why agents have more human-required phases:**
- Phase 18 (New Skill Discovery) is agent-specific
- Skills don't have equivalent "find new patterns to load" phase
