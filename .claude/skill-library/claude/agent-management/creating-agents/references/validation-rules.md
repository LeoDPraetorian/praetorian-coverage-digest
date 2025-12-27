# Validation Rules (Phase 2)

Comprehensive validation rules for agent name format, existence checking, and duplicate detection.

## 2.1 Name Format Validation

**CRITICAL**: Agent names MUST follow the regex pattern: `^[a-z][a-z0-9-]*$` (kebab-case)

### Validation Steps

1. **Test name against regex pattern programmatically**:

   ```bash
   # Test if name matches pattern
   echo "{agent-name}" | grep -E '^[a-z][a-z0-9-]*$'
   ```

2. **If regex test fails**, identify specific violation:

### Invalid Name Examples

| Invalid Name       | Violation          | Why Invalid                                                   |
| ------------------ | ------------------ | ------------------------------------------------------------- |
| `Python-Developer` | Capital letters    | Pattern requires lowercase only (`^[a-z]...`)                 |
| `python_developer` | Underscore         | Pattern allows only hyphens as separators (`[a-z0-9-]`)       |
| `python developer` | Space              | Pattern allows only letters, numbers, hyphens (no whitespace) |
| `123-developer`    | Starts with number | Pattern requires starting with letter (`^[a-z]`)              |
| `python-`          | Ends with hyphen   | Pattern allows hyphens only between words, not trailing       |

### Valid Name Examples

- `python-developer` ✅
- `frontend-architect` ✅
- `go-code-reviewer` ✅
- `react-test-engineer` ✅

### Validation Output Format

```
Agent Name: {proposed-name}
Regex Pattern: ^[a-z][a-z0-9-]*$

Validation Result:
✅ VALID - Name matches required pattern
OR
❌ INVALID - {Specific violation from table above}
```

**If invalid**, prompt for corrected name and re-validate until PASS.

**Cannot proceed without valid name** ✅

## 2.2 Existence Check

```bash
find .claude/agents -name "{name}.md"
```

If exists → Suggest `updating-agents` skill.

## 2.3 Duplicate Detection

**Prevent duplicate functionality by searching existing agent descriptions.**

### Search Strategy

1. Extract keywords from proposed agent name and description
2. Search all agent descriptions for similar keywords
3. Calculate overlap percentage
4. Warn if >50% overlap detected

### Keyword Extraction

```bash
# From proposed name/description, extract key terms
# Remove common words (the, a, an, for, when, etc.)
# Focus on: domain (react, go, testing), action (develop, review, test), specialty
```

### Search All Agents

```bash
# Search all agent descriptions
Grep -n "description:" .claude/agents/**/*.md --output_mode content
```

### Calculate Overlap

For each existing agent:

1. Extract keywords from its description
2. Count matching keywords with proposed agent
3. Calculate: (matching_keywords / total_proposed_keywords) \* 100

### Warning Threshold

**If >50% overlap detected**:

```
⚠️ WARNING: Similar agents detected

Proposed: {agent-name} - {description}

Similar agents found:
- {existing-agent-1} ({overlap}% match) - {description}
  Location: .claude/agents/{type}/{name}.md

- {existing-agent-2} ({overlap}% match) - {description}
  Location: .claude/agents/{type}/{name}.md
```

### User Confirmation

**Ask User** via AskUserQuestion:

```
Question: Similar agents exist with {overlap}% keyword overlap. Is this a duplicate?
Header: Duplicate Check
Options:
  - No - This agent has different focus, proceed with creation
  - Yes - This is duplicate, I should update existing agent instead
  - Clarify - Show me the existing agent descriptions to compare
```

### Response Handling

**If "Yes - duplicate"**:

- Stop creation workflow
- Suggest: `skill: "updating-agents"` with {existing-agent-name}

**If "Clarify"**:

- Read and display full descriptions of similar agents
- Re-prompt with duplicate check question

**If "No - different focus"**:

- Record confirmation in notes
- Proceed to Phase 3

### Why This Matters

- Prevents redundant agents with overlapping functionality
- Encourages updating/enhancing existing agents vs creating new ones
- Maintains clean agent taxonomy
- Reduces maintenance burden
