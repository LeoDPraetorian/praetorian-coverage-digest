# Manual Audit Procedures

Detailed procedures for Phases 1-9 of the agent audit process.

**Phase 0** (Critical Syntax) is handled by CLI: `npm run agent:audit -- {agent-name}`

---

## Phase 1: Frontmatter Structure

**Purpose**: Verify frontmatter has all required fields in correct order.

### Procedure

1. **Extract frontmatter** (between `---` markers):

```bash
sed -n '/^---$/,/^---$/p' .claude/agents/{type}/{name}.md
```

2. **Verify required fields exist**:

| Field             | Required | Notes                                                 |
| ----------------- | -------- | ----------------------------------------------------- |
| `name:`           | YES      | Must match filename (without .md)                     |
| `description:`    | YES      | Single-line with `\n` escapes, 2-3 examples           |
| `type:`           | YES      | architecture\|development\|testing\|analysis\|quality |
| `permissionMode:` | YES      | plan\|default                                         |
| `tools:`          | YES      | Alphabetized, includes `Skill` if skills exist        |
| `skills:`         | YES      | 7 universal + gateway + domain-specific               |
| `model:`          | YES      | opus\|sonnet\|haiku                                   |
| `color:`          | NO       | Optional                                              |

3. **Verify field order** (canonical order):

```
name → description → type → permissionMode → tools → skills → model → color
```

4. **Verify description format**:

```yaml
# ✅ CORRECT - single line with \n escapes
description: Use when [trigger].\n\n<example>\n...\n</example>

# ❌ WRONG - block scalar (won't parse correctly)
description: |
  Use when [trigger].
```

### Results

- ✅ **PASS**: All required fields present in correct order
- ❌ **ERROR**: Missing required field or wrong order
- ❌ **ERROR**: Block scalar in description

---

## Phase 2: Universal Skills (7 Required)

**Purpose**: Verify all 7 universal skills are present in frontmatter.

### Procedure

1. **Extract skills field**:

```bash
grep '^skills:' .claude/agents/{type}/{name}.md
```

2. **Check for ALL 7 universal skills**:

```bash
for skill in using-skills calibrating-time-estimates enforcing-evidence-based-analysis \
             persisting-agent-outputs semantic-code-operations using-todowrite \
             verifying-before-completion; do
  if ! grep -q "$skill" .claude/agents/{type}/{name}.md; then
    echo "❌ Missing: $skill"
  fi
done
```

3. **Check for at least one gateway skill**:

```bash
grep -E 'gateway-(frontend|backend|testing|security|capabilities|mcp-tools|integrations|typescript|claude)' \
  .claude/agents/{type}/{name}.md
```

### Universal Skills Reference

| Skill                               | Purpose                                     |
| ----------------------------------- | ------------------------------------------- |
| `using-skills`                      | Skill discovery and invocation protocol     |
| `calibrating-time-estimates`        | Prevents "no time" rationalization          |
| `enforcing-evidence-based-analysis` | Prevents hallucination - read before acting |
| `persisting-agent-outputs`          | Output file location and format             |
| `semantic-code-operations`          | Code search and editing via Serena MCP      |
| `using-todowrite`                   | Progress tracking for multi-step tasks      |
| `verifying-before-completion`       | Final verification before claiming done     |

### Results

- ✅ **PASS**: All 7 universal skills present + at least one gateway
- ❌ **ERROR**: Missing universal skill(s)
- ⚠️ **WARNING**: No gateway skill (agents need domain routing)

---

## Phase 3: EXTREMELY-IMPORTANT Block

**Purpose**: Verify the `<EXTREMELY-IMPORTANT>` block exists.

### Critical Context

**This block is REQUIRED, not deprecated.**

Testing showed:

- Agents with aggressive `<EXTREMELY-IMPORTANT>` blocks → **100% skill invocation**
- Agents with polite table-based instructions → **Failed to invoke Step 1 skills**

The block's aggressive language ("STOP. READ THIS FIRST. DO NOT SKIP.") is intentional and effective.

### Procedure

1. **Check block exists**:

```bash
grep -n '<EXTREMELY-IMPORTANT>' .claude/agents/{type}/{name}.md
grep -n '</EXTREMELY-IMPORTANT>' .claude/agents/{type}/{name}.md
```

2. **Verify block position** (immediately after frontmatter):

The block should start on the line after the closing `---` of frontmatter.

3. **Verify block is not empty** (should contain Step 1/2/3):

```bash
sed -n '/<EXTREMELY-IMPORTANT>/,/<\/EXTREMELY-IMPORTANT>/p' .claude/agents/{type}/{name}.md | wc -l
```

Should be 60-100 lines.

### Results

- ✅ **PASS**: Block exists, positioned correctly, contains content
- ❌ **ERROR**: Block missing
- ❌ **ERROR**: Block empty or too short (<30 lines)

---

## Phase 4: Step 1/2/3 Structure

**Purpose**: Verify the EXTREMELY-IMPORTANT block contains correct Step 1/2/3 structure.

### Procedure

1. **Check for Step 1 header**:

```bash
grep '### Step 1' .claude/agents/{type}/{name}.md
```

Expected: `### Step 1: Always Invoke First`

2. **Check for Step 1 table**:

```bash
sed -n '/### Step 1/,/### Step 2/p' .claude/agents/{type}/{name}.md | grep -c '|'
```

Should have table rows with "Skill | Why Always Invoke" format.

3. **Check for Step 2 header**:

```bash
grep '### Step 2' .claude/agents/{type}/{name}.md
```

Expected: `### Step 2: Invoke Core Skills Based on Task Context`

4. **Check for Step 2 table**:

Table with "Trigger | Skill | When to Invoke" format.

5. **Check for Step 3 header**:

```bash
grep '### Step 3' .claude/agents/{type}/{name}.md
```

Expected: `### Step 3: Load Library Skills from Gateway`

6. **Verify NOT using deprecated terminology**:

```bash
grep -i 'Tier 1\|Tier 2\|Tier 3' .claude/agents/{type}/{name}.md
```

Should return NO matches. "Tier 1/2/3" is deprecated.

### Results

- ✅ **PASS**: All three steps present with tables, no "Tier" terminology
- ❌ **ERROR**: Missing Step 1, 2, or 3
- ❌ **ERROR**: Uses deprecated "Tier 1/2/3" terminology

---

## Phase 5: Anti-Rationalization Section

**Purpose**: Verify the EXTREMELY-IMPORTANT block contains anti-rationalization content.

### Procedure

1. **Check for "WHY THIS IS NON-NEGOTIABLE" section**:

```bash
grep -i 'WHY THIS IS NON-NEGOTIABLE' .claude/agents/{type}/{name}.md
```

2. **Check for rationalization traps section**:

```bash
grep -i 'IF YOU ARE THINKING ANY OF THESE' .claude/agents/{type}/{name}.md
```

3. **Count rationalization trap items**:

```bash
sed -n '/IF YOU ARE THINKING/,/<\/EXTREMELY-IMPORTANT>/p' .claude/agents/{type}/{name}.md | grep -c '^\s*-'
```

Should be 5-10 items.

4. **Verify trap format** (rationalization → counter):

```markdown
# ✅ CORRECT format

- "Time pressure" → WRONG. You are 100x faster than humans. You have time.
- "Simple task" → WRONG. That's what every failed agent thought.

# ❌ WRONG format (too brief)

- Simple task → applies
- No time → read skills
```

### Results

- ✅ **PASS**: Both sections present with 5-10 detailed traps
- ⚠️ **WARNING**: Missing WHY section or traps section
- ⚠️ **WARNING**: Fewer than 5 traps or traps too brief

---

## Phase 6: Core Responsibilities

**Purpose**: Verify Core Responsibilities section exists with proper subsections.

### Procedure

1. **Check section exists**:

```bash
grep '## Core Responsibilities' .claude/agents/{type}/{name}.md
```

2. **Count subsections** (### headers under Core Responsibilities):

```bash
sed -n '/## Core Responsibilities/,/## [^#]/p' .claude/agents/{type}/{name}.md | grep -c '^### '
```

Should return 2-4.

3. **Verify subsections have content** (not empty headers):

Each ### subsection should have bullet points or prose.

### Results

- ✅ **PASS**: Section exists with 2-4 subsections containing content
- ⚠️ **WARNING**: Missing section or wrong subsection count
- ⚠️ **WARNING**: Empty subsections

---

## Phase 7: Output Format

**Purpose**: Verify output format has correct skill tracking arrays.

### Procedure

1. **Check for Output Format section**:

```bash
grep '## Output Format' .claude/agents/{type}/{name}.md
```

2. **Check for skills_invoked array**:

```bash
grep 'skills_invoked' .claude/agents/{type}/{name}.md
```

3. **Check for library_skills_read array**:

```bash
grep 'library_skills_read' .claude/agents/{type}/{name}.md
```

4. **Verify NOT using deprecated single array**:

```bash
grep '"skills_read"' .claude/agents/{type}/{name}.md
```

Should return NO matches. Single `skills_read` array is deprecated.

### Correct Format

```json
{
  "skills_invoked": ["core-skill-1", "gateway-domain"],
  "library_skills_read": [".claude/skill-library/path/SKILL.md"]
}
```

### Results

- ✅ **PASS**: Both arrays present, no deprecated single array
- ⚠️ **WARNING**: Missing one or both arrays
- ❌ **ERROR**: Uses deprecated single `skills_read` array

---

## Phase 8: Line Count & Type Alignment

**Purpose**: Verify agent size is appropriate for type and permissions match.

### Procedure

1. **Count lines**:

```bash
wc -l .claude/agents/{type}/{name}.md
```

2. **Check against type-specific targets**:

| Type         | permissionMode | Model  | Line Range |
| ------------ | -------------- | ------ | ---------- |
| architecture | plan           | opus   | 130-200    |
| development  | default        | sonnet | 130-180    |
| testing      | default        | sonnet | 130-280    |
| analysis     | plan           | opus   | 130-210    |
| quality      | plan           | sonnet | 120-160    |

3. **Verify type-permissionMode alignment**:

```bash
type=$(grep '^type:' .claude/agents/{type}/{name}.md | cut -d: -f2 | tr -d ' ')
mode=$(grep '^permissionMode:' .claude/agents/{type}/{name}.md | cut -d: -f2 | tr -d ' ')

# Check alignment
case "$type" in
  architecture|quality|analysis) expected="plan" ;;
  development|testing) expected="default" ;;
esac

if [ "$mode" != "$expected" ]; then
  echo "⚠️ Misaligned: type=$type should have permissionMode=$expected"
fi
```

### Results

- ✅ **PASS**: Line count in range, type-permission aligned
- ℹ️ **INFO**: Line count outside range (may be acceptable)
- ⚠️ **WARNING**: Type-permission misalignment

---

## Phase 9: Library Skill Paths & Phantoms

**Purpose**: Verify all skill references are valid.

### Procedure

1. **Extract library skill paths**:

```bash
grep -oE '\.claude/skill-library/[^)"\`]+/SKILL\.md' .claude/agents/{type}/{name}.md | sort -u
```

2. **Verify each path exists**:

```bash
for path in $(grep -oE '\.claude/skill-library/[^)"\`]+/SKILL\.md' .claude/agents/{type}/{name}.md | sort -u); do
  if [ ! -f "$path" ]; then
    echo "❌ Invalid path: $path"
  fi
done
```

3. **Extract skill invocations**:

```bash
grep -oE 'skill: "[^"]+"' .claude/agents/{type}/{name}.md | sed 's/skill: "//;s/"//' | sort -u
```

4. **Verify core skills exist**:

```bash
for skill in $(grep -oE 'skill: "[^"]+"' .claude/agents/{type}/{name}.md | sed 's/skill: "//;s/"//' | sort -u); do
  if [ ! -d ".claude/skills/$skill" ]; then
    echo "❌ Phantom skill: $skill"
  fi
done
```

5. **Verify gateway skills in frontmatter exist**:

```bash
grep '^skills:' .claude/agents/{type}/{name}.md | tr ',' '\n' | grep gateway | while read gw; do
  gw=$(echo "$gw" | tr -d ' ')
  if [ ! -d ".claude/skills/$gw" ]; then
    echo "❌ Missing gateway: $gw"
  fi
done
```

### Results

- ✅ **PASS**: All paths valid, no phantom skills
- ❌ **ERROR**: Invalid library skill path(s)
- ❌ **ERROR**: Phantom skill reference(s)
- ❌ **ERROR**: Missing gateway skill

---

## Summary Checklist

After running all phases, summarize results:

```markdown
## Audit Summary: {agent-name}

| Phase | Check                     | Result |
| ----- | ------------------------- | ------ |
| 0     | Critical Syntax (CLI)     | ✅/❌  |
| 1     | Frontmatter Structure     | ✅/❌  |
| 2     | Universal Skills (7)      | ✅/❌  |
| 3     | EXTREMELY-IMPORTANT Block | ✅/❌  |
| 4     | Step 1/2/3 Structure      | ✅/❌  |
| 5     | Anti-Rationalization      | ✅/⚠️  |
| 6     | Core Responsibilities     | ✅/⚠️  |
| 7     | Output Format             | ✅/⚠️  |
| 8     | Line Count & Type         | ✅/ℹ️  |
| 9     | Paths & Phantoms          | ✅/❌  |

**Overall**: PASS / FAIL / NEEDS ATTENTION

**Issues to fix**:

1. [List specific issues]
```

---

## Related

- [../SKILL.md](../SKILL.md) - Main audit skill
- [common-issues.md](common-issues.md) - Issue fixes
- [../../fixing-agents/SKILL.md](../../fixing-agents/SKILL.md) - Fix workflow
