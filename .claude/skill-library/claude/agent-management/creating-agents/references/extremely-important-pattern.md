# EXTREMELY_IMPORTANT Block Pattern

**All agents MUST include an EXTREMELY_IMPORTANT block at the top of their prompt** (inspired by obra/superpowers pattern). This block enforces mandatory skill invocation and prevents rationalization.

## Critical Understanding: skills: Frontmatter Does NOT Auto-Invoke

**IMPORTANT**: The `skills:` field in agent frontmatter makes skills AVAILABLE (0 token discovery cost), but does NOT automatically invoke them. Agents must EXPLICITLY use the Skill tool.

| Frontmatter | Effect | Agent Behavior Required |
|-------------|--------|-------------------------|
| `skills: gateway-frontend` | Makes gateway available (discovery) | Agent must invoke: `skill: "gateway-frontend"` |
| (no skills field) | No skills pre-loaded | Agent can still invoke skills (execution cost) |

**Why this matters**: obra/superpowers discovered that "making tools available" ≠ "agent uses tools". Agents need explicit instructions AND anti-rationalization rules.

## Purpose

- **Process Compliance**: Agent explicitly invokes skills (visible in output: "I'm using the X skill")
- **Behavioral Compliance**: Agent follows skill patterns (invisible - correct approach without announcement)

**Both are required. Process compliance WITHOUT behavioral compliance = lip service. Behavioral compliance WITHOUT process compliance = unverifiable.**

## Template

```markdown
<EXTREMELY_IMPORTANT>
Before starting ANY task, you MUST:

1. **Check for applicable skills** via gateway-{domain}
2. **Explicitly invoke skills** using: skill: "skill-name"
3. **Announce invocation** in your output: "I'm using the {skill-name} skill to {action}"

**Mandatory Skills for This Agent:**
- `{skill-1}` - Use when {trigger condition}
- `{skill-2}` - Use when {trigger condition}
- `{skill-3}` - Use when {trigger condition}

**Anti-Rationalization Rules:**
- ❌ "I don't need the skill because {reason}" → WRONG. If skill applies, use it.
- ❌ "The skill is overkill for this simple task" → WRONG. Simplicity is when mistakes happen.
- ❌ "I'll just do this one quick thing first" → WRONG. Check skills BEFORE any action.
- ❌ "I remember the skill's content" → WRONG. Skills evolve. Read current version.
- ❌ "This doesn't count as {skill trigger}" → WRONG. When in doubt, use the skill.

**If you catch yourself thinking "but this time is different"** → STOP. That's rationalization. Use the skill.
</EXTREMELY_IMPORTANT>
```

## Placement

Insert immediately after frontmatter, before any other content. First thing agent sees = first thing agent must do.

## Discovery Testing Protocol

After creating an agent, test explicit invocation in a **NEW Claude Code session** (critical - agent metadata is cached).

**Why fresh session?** Agent frontmatter and descriptions are cached at session start. Edits won't be visible until restart.

```
User: [Agent-appropriate task that triggers mandatory skill]

Expected Output (within first 3 messages):
"I'm using the {skill-name} skill to {action}"
OR
skill: "{skill-name}"

✅ PASS: Explicit invocation visible in output
❌ FAIL: Agent completes task correctly BUT doesn't announce skill usage
```

**Behavioral compliance alone is NOT enough.** Agent must demonstrate process compliance.

**Common failure**: Agent knows WHAT to do (behavioral) but doesn't announce HOW (process). This breaks trust and makes debugging impossible.

## Compliance Types

| Compliance Type | What It Means | How to Verify |
|----------------|---------------|---------------|
| **Process** | Agent explicitly invokes skill (visible) | Check output for "skill: X" or "I'm using X skill" |
| **Behavioral** | Agent follows skill patterns (correct approach) | Evaluate if task executed per skill's guidance |

**BOTH are required. Process without behavioral = lip service. Behavioral without process = unverifiable.**

## Required Elements Checklist

When creating or validating an EXTREMELY_IMPORTANT block, verify:

- [ ] **Absolute language**: "MUST", "NEVER", "ALWAYS" (not "should" or "consider")
- [ ] **Explicit invocation syntax**: Shows `skill: "skill-name"` format
- [ ] **Anti-rationalization rules**: Minimum 5 rules countering common bypasses
- [ ] **Validation warning**: "If you catch yourself thinking 'but this time is different' → STOP"

## Why This Matters

- `skills:` frontmatter makes skills AVAILABLE (0 tokens)
- It does NOT automatically invoke them
- Without EXTREMELY_IMPORTANT block, agents bypass skills (20% compliance rate)
- With block, compliance increases to 80%+

## Validation in Phase 9

**CRITICAL**: If agent has `skills:` in frontmatter, it MUST have an EXTREMELY_IMPORTANT block.

**Validation Steps**:

1. Check frontmatter for `skills:` field:
   ```bash
   Grep "^skills:" .claude/agents/{type}/{agent-name}.md
   ```

2. If `skills:` field present, verify EXTREMELY_IMPORTANT block exists:
   ```bash
   Grep "<EXTREMELY_IMPORTANT>" .claude/agents/{type}/{agent-name}.md
   ```

3. If block NOT found AND skills present:
   - ❌ **ERROR**: Agent has mandatory skills but missing EXTREMELY_IMPORTANT block
   - **Action**: Return to Phase 6.1 and add the block
   - **Cannot proceed without this block** ✅
