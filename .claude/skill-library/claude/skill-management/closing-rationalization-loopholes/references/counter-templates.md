# Counter Templates and Placement Guidelines

**Templates for writing rationalization counters with placement procedures.**

---

## Counter Template

Use this template addressing ONLY the observed rationalization:

```markdown
## [Rationalization Name] Counter

If you think: "[exact rationalization thought]"

Reality: [Why this thought is wrong]

Required action: [Specific behavior agent must do instead]
```

---

## Example Counter

**Example counter for "Quick Question Trap":**

```markdown
## Quick Analysis Counter

If you think: "This is just a simple analysis question"

Reality: ALL analysis tasks produce file artifacts. "Quick analysis" is a rationalization trap that leads to lost work and untracked decisions.

Required action:

- Invoke persisting-agent-outputs skill
- Write output to file in OUTPUT_DIRECTORY
- Include skills_invoked in metadata
```

---

## Counter Placement (DEFAULT Pattern)

**Default Pattern** (following auditing-skills model):

Counters ALWAYS go in reference files with MANDATORY Read blocks, regardless of file size.

| Scope                          | Counter File Location                                                      | MANDATORY Read Block Location                      | Create If Missing                                                                                |
| ------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Agent-specific**             | `.claude/agents/{type}/{agent}/.local/{agent}-counters.md`                 | Agent's `<EXTREMELY-IMPORTANT>` section            | Yes - `{agent}-counters.md`                                                                      |
| **Skill-wide: Orchestrations** | `.claude/skills/{skill}/references/rationalization-prevention-{domain}.md` | Skill's `## Critical Rules` section                | Yes - `rationalization-prevention-{domain}.md` where domain = feature/integration/capability/etc |
| **Skill-wide: Other**          | `.claude/skills/{skill}/references/{skill}-counters.md`                    | Skill's `## Critical Rules` or appropriate section | Yes - `{skill}-counters.md` (e.g., `verification-counters.md` for auditing-skills)               |
| **Universal**                  | `.claude/skills/using-skills/references/counters.md`                       | `using-skills` ## Red Flags section                | File exists (add to it)                                                                          |

---

## File Creation Protocol

1. Check if counter file exists with the naming convention above
2. If missing: Create it with proper header structure
3. Add MANDATORY Read block to SKILL.md in EXTREMELY-IMPORTANT tags
4. Add counter rows to the file (not to SKILL.md directly)

**Why reference files?**

1. **Prevents SKILL.md bloat** - Counters accumulate over time
2. **Easier maintenance** - All counters in one place
3. **Progressive disclosure** - Load only when needed
4. **Follows established pattern** - auditing-skills uses this successfully

---

## Example: Skill-Wide Counter

### Step 1: Create counter file

```bash
# Create references directory if needed
mkdir -p .claude/skills/orchestrating-integration-development/references

# Create counter file
# File: .claude/skills/orchestrating-integration-development/references/compaction-gate-counters.md
```

### Step 2: Add MANDATORY Read block to SKILL.md

```markdown
# In SKILL.md at appropriate section (e.g., ## Critical Rules)

<EXTREMELY-IMPORTANT>
You MUST read compaction-gate-counters.md BEFORE proceeding past any compaction gate.

\`\`\`
Read(.claude/skills/orchestrating-integration-development/references/compaction-gate-counters.md)
\`\`\`

This file contains anti-rationalization counters for "Outputs Already Persisted" and "Context Seems Fine" patterns.
</EXTREMELY-IMPORTANT>
```

**See:** [counter-placement.md](counter-placement.md) for complete scope decision tree.

---

## Counter File Verification

After creating counter file, verify:

```bash
# Check counter file exists
ls -la {skill}/references/{skill}-counters.md

# Check MANDATORY Read block added to SKILL.md
grep -A 3 "EXTREMELY-IMPORTANT" {skill}/SKILL.md | grep "Read(.*counters.md)"
```

**Counter file should have:**

- Clear section headers per counter
- "If you think:" trigger phrases (verbatim from rationalization)
- "Reality:" explanation why thought is wrong
- "Required action:" specific behavior needed
- "Not even when:" exclusions for common escape clauses

---

## Additional Requirements

### 1% Threshold Rule

If the skill/agent doesn't have it, add:

```markdown
## The 1% Rule (NON-NEGOTIABLE)

If there is even a 1% chance a skill might apply:

- You MUST invoke that skill
- This is not optional
- You cannot rationalize your way out of this

Uncertainty = Invocation. Period.
```

### Announcement Requirement

```markdown
## Skill Announcement (MANDATORY)

Before using any skill, you MUST announce it:

"I am invoking `{skill-name}` because {reason}."

No announcement = protocol violation.
```
