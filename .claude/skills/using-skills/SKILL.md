---
name: using-skills
description: Use when starting any conversation - establishes mandatory workflows for finding and using skills via Skill tool (core) or skill-search CLI (library)
allowed-tools: Read, Bash, Grep, Glob
---

<EXTREMELY-IMPORTANT>
If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST read the skill.

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

This is not negotiable. This is not optional. You cannot rationalize your way out of this.
</EXTREMELY-IMPORTANT>

# Getting Started with Skills

## MANDATORY FIRST RESPONSE PROTOCOL

Before responding to ANY user message, you MUST complete this checklist:

1. Ask yourself: "Does ANY skill match this request?"
2. If yes → Find and read the skill (see "Two Ways to Access Skills" below)
3. Announce which skill you're using
4. Follow the skill exactly

**Responding WITHOUT completing this checklist = automatic failure.**

## Critical Rules

1. **Use Read tool before announcing skill usage.** The session-start hook does NOT read skills for you. Announcing without calling Read = lying.

2. **Follow mandatory workflows.** Brainstorming before coding. Check for relevant skills before ANY task.

3. **Create TodoWrite todos for checklists.** Mental tracking = steps get skipped. Every time.

## Two Ways to Access Skills

Chariot has two skill locations:

### Core Skills → Skill Tool

~35 high-frequency skills live in `.claude/skills/` (flat structure).
These ARE auto-discovered by Claude Code's Skill tool.

```
Example: skill: "brainstorming"
Example: skill: "developing-with-tdd"
```

### Library Skills → skill-search CLI + Read Tool

~120 specialized skills live in `.claude/skill-library/` (nested structure).
These are NOT visible to the Skill tool. Use the skill-search CLI to discover them.

## Finding Skills (Core + Library)

The skill-search CLI searches BOTH core skills and library skills, showing:

- `[CORE]` skills → Use with Skill tool: `skill: "name"`
- `[LIB]` skills → Use with Read tool: `Read path/to/SKILL.md`

**Search command:**

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && cd "$ROOT/.claude" && npm run -w @chariot/auditing-skills search -- "QUERY"
```

**Examples:**

```bash
# Search for debugging skills
npm run -w @chariot/auditing-skills search -- "debug"

# Search for React/frontend skills
npm run -w @chariot/auditing-skills search -- "react testing"

# List ALL skills (empty query)
npm run -w @chariot/auditing-skills search -- ""

# Filter by domain
npm run -w @chariot/auditing-skills search -- "testing" --domain frontend

# Limit results
npm run -w @chariot/auditing-skills search -- "security" --limit 5
```

**Output shows access method:**

```
[CORE] debugging-systematically (Score: 95)
   → skill: "debugging-systematically"

[LIB] using-tanstack-query (Score: 87)
   → Path: /Users/.../chariot-development-platform/.claude/skill-library/development/frontend/using-tanstack-query/SKILL.md
```

## Using Search Results

**For CORE skills** - Use the Skill tool:

```
skill: "debugging-systematically"
```

**For LIB skills** - Use the Read tool with the **absolute path** shown in search output.

**CRITICAL - Path Resolution Rules:**

1. **Read tool REQUIRES absolute paths** - Never use relative paths like `.claude/...` or `skill-library/...`

2. **Use search output directly** - The search CLI outputs absolute paths. Copy and use them exactly:

   ```
   # Search output shows:
   Path: /Users/you/chariot-development-platform/.claude/skill-library/.../SKILL.md

   # Use that exact path with Read tool
   Read("/Users/you/chariot-development-platform/.claude/skill-library/.../SKILL.md")
   ```

3. **If constructing paths manually**, get ROOT first:

   ```bash
   ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
   echo "$ROOT/.claude/skill-library/path/to/SKILL.md"
   ```

   Then use the echoed path with Read tool.

4. **Never guess paths** - If unsure, run the search command to get the correct absolute path.

## Common Rationalizations That Mean You're About To Fail

If you catch yourself thinking ANY of these thoughts, STOP. You are rationalizing. Check for and use the skill.

- "This is just a simple question" → WRONG. Questions are tasks. Check for skills.
- "I can check git/files quickly" → WRONG. Files don't have conversation context. Check for skills.
- "Let me gather information first" → WRONG. Skills tell you HOW to gather information. Check for skills.
- "This doesn't need a formal skill" → WRONG. If a skill exists for it, use it.
- "I remember this skill" → WRONG. Skills evolve. Read the current version.
- "This doesn't count as a task" → WRONG. If you're taking action, it's a task. Check for skills.
- "The skill is overkill for this" → WRONG. Skills exist because simple things become complex. Use it.
- "I'll just do this one thing first" → WRONG. Check for skills BEFORE doing anything.
- "Session-start showed it to me" → WRONG. That was using-skills only. Read the actual skill.

**Why:** Skills document proven techniques that save time and prevent mistakes. Not using available skills means repeating solved problems and making known errors.

If a skill for your task exists, you must use it or you will fail at your task.

## Skills with Checklists

If a skill has a checklist, YOU MUST create TodoWrite todos for EACH item.

**Don't:**

- Work through checklist mentally
- Skip creating todos "to save time"
- Batch multiple items into one todo
- Mark complete without doing them

**Why:** Checklists without TodoWrite tracking = steps get skipped. Every time. The overhead of TodoWrite is tiny compared to the cost of missing steps.

## Announcing Skill Usage

After you've read a skill with Read tool, announce you're using it:

"I've read the [Skill Name] skill and I'm using it to [what you're doing]."

**Examples:**

- "I've read the Brainstorming skill and I'm using it to refine your idea into a design."
- "I've read the Test-Driven Development skill and I'm using it to implement this feature."
- "I've read the Systematic Debugging skill and I'm using it to find the root cause."

**Why:** Transparency helps your human partner understand your process and catch errors early. It also confirms you actually read the skill.

## Example: Finding and Using a Skill

```bash
# User asks to fix a bug - search for relevant skills
$ npm run -w @chariot/auditing-skills search -- "debug"

[CORE] debugging-systematically (Score: 95)
   Use when encountering any bug...
   → skill: "debugging-systematically"

[LIB] debugging-chrome-console (Score: 82)
   Debug frontend issues via Chrome DevTools...
   → Path: /Users/you/chariot-development-platform/.claude/skill-library/testing/frontend/debugging-chrome-console/SKILL.md
```

Then either:

- Use `skill: "debugging-systematically"` for the core skill, OR
- Use `Read` tool with the **absolute path** shown for the library skill

Finally, announce: "I've read the debugging-systematically skill and I'm using it to investigate this bug."

## How to Read a Skill

Every skill has the same structure:

1. **Frontmatter** - `description` tells you if this skill matches your situation
2. **Overview** - Core principle in 1-2 sentences
3. **Quick Reference** - Scan for your specific pattern
4. **Implementation** - Full details and examples
5. **Supporting files** - Load only when implementing

**Many skills contain rigid rules (TDD, debugging, verification).** Follow them exactly. Don't adapt away the discipline.

**Some skills are flexible patterns (architecture, naming).** Adapt core principles to your context.

The skill itself tells you which type it is.

## Instructions ≠ Permission to Skip Workflows

Your human partner's specific instructions describe WHAT to do, not HOW.

"Add X", "Fix Y" = the goal, NOT permission to skip brainstorming, TDD, or RED-GREEN-REFACTOR.

**Red flags:** "Instruction was specific" • "Seems simple" • "Workflow is overkill"

**Why:** Specific instructions mean clear requirements, which is when workflows matter MOST. Skipping process on "simple" tasks is how simple tasks become complex problems.

## Context7-Enabled Skills

Some library skills are populated from context7 documentation (official library/framework docs). These skills can become stale as upstream libraries evolve.

**Examples of context7-enabled skills:**
- `using-tanstack-query`
- `using-shadcn-ui`
- `using-zustand-state-management`
- `using-react-hook-form-zod`

### How to Check for Staleness

After reading a library skill, check if it has context7 documentation:

1. Look for `.local/context7-source.json` in the skill directory
2. If it exists, check the `fetchedAt` date
3. If >30 days old, consider refreshing before relying on the content

**Staleness indicators:**
- Skill-search CLI now shows warnings: `⚠️ Docs 45d old`
- Update CLI prompts before modifying stale skills

### How to Refresh Stale Documentation

If you discover a skill with stale context7 docs:

```bash
npm run update -- skill-name --suggest
```

This command will:
- Check if updates are available
- Show you the refresh workflow
- Guide you through updating the documentation

**Why this matters:** Stale docs can recommend deprecated APIs, missing new features, or outdated patterns. Always check staleness for library skills before implementing their recommendations.

## Summary

**Starting any task:**

1. Ask: "Does a skill exist for this?"
2. Search with: `npm run -w @chariot/auditing-skills search -- "query"`
3. If relevant skill exists → Use Skill tool (core) or Read tool (library)
4. Announce you're using it
5. Follow what it says

**Skill has checklist?** TodoWrite for every item.

**Finding a relevant skill = mandatory to read and use it. Not optional.**
