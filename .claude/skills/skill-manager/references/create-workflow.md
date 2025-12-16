# Create Operation Workflow

Complete workflow for creating new skills with TDD enforcement and progressive disclosure.

## Overview

The create operation follows the RED-GREEN-REFACTOR TDD cycle to ensure skills actually solve the problems they're meant to address.

## Workflow Steps

### Step 1: RED Phase - Prove Gap Exists

**Before writing any skill code:**

1. Document the gap or need
   - What behavior is missing?
   - What mistake do agents make without this skill?
   - What instruction would prevent the mistake?

2. Test scenario WITHOUT the skill
   - Create test scenario
   - Run it
   - **MUST FAIL** in the expected way
   - Document exact failure behavior (verbatim)

**If the test doesn't fail, you don't have a gap. Stop.**

### Step 2: Generate Skill Structure

**Instruction-based operation. Use the `creating-skills` skill:**

```
skill: "creating-skills"
```

The creating-skills skill guides you through a **multi-stage interactive workflow**. Each stage asks one question and Claude presents options via AskUserQuestion.

#### Multi-Stage Workflow

| Stage | Question | Condition |
|-------|----------|-----------|
| 1 | Location: Core or Library? | Always |
| 2 | Category: Which library folder? | If library selected |
| 3 | Skill Type: process/library/integration/tool-wrapper | Always |
| 4 | Context7: Query for documentation? | If library or integration type |
| 5 | Ready | All inputs collected |

**Stage Progression:**

```bash
# Stage 1: Initial call
npm run create -- my-skill "Use when..." --suggest
# Returns: location question

# Stage 2: After user selects library
npm run create -- my-skill "Use when..." --suggest --location library
# Returns: category question (dynamically scans .claude/skill-library/)

# Stage 3: After user selects category
npm run create -- my-skill "Use when..." --suggest --location library --category development/integrations
# Returns: skillType question

# Stage 4: After user selects integration (conditional)
npm run create -- my-skill "Use when..." --suggest --location library --category development/integrations --skill-type integration
# Returns: context7 question (only for library/integration types)

# Stage 5: Ready to create
npm run create -- my-skill "Use when..." --suggest --location library --category development/integrations --skill-type integration --query-context7 no
# Returns: READY status with final createCommand
```

**JSON Output Structure:**

```json
{
  "skill": "my-skill",
  "status": "NEEDS_INPUT",
  "stage": 2,
  "stagesRemaining": 3,
  "collectedAnswers": {
    "description": "Use when...",
    "location": "library"
  },
  "questions": [
    {
      "id": "category",
      "question": "Which folder should this skill be placed in?",
      "type": "select",
      "options": [
        { "value": "development/integrations", "label": "Development → Integrations", "description": "4 skills" }
      ],
      "required": true
    }
  ],
  "nextStageCommand": "npm run create -- my-skill \"Use when...\" --suggest --location library",
  "createCommand": "npm run create -- my-skill \"Use when...\" --location library --category $CATEGORY"
}
```

**Direct Creation (Skip Interactive):**

If you know all the options upfront, skip the interactive workflow:

```bash
npm run create -- my-skill "Use when description" \
  --location library \
  --category development/integrations \
  --skill-type integration
```

**Creates directory with:**
- SKILL.md (template based on skill type)
- references/ (empty)
- examples/ (empty)
- templates/ (empty)
- .local/ (for metadata)

### Step 3: GREEN Phase - Minimal Implementation

1. Fill in SKILL.md with minimal content
   - What to do
   - When to use it
   - How to verify

2. Re-test scenario WITH the skill
   - **MUST PASS** now
   - Skill must actually teach the behavior

3. Verify no regressions
   - Existing behaviors still work

**If test still fails, skill is incomplete. Fix it.**

### Step 4: Progressive Disclosure

Organize content:

**SKILL.md (< 300 lines):**
- Quick reference table
- Essential workflows
- Critical rules
- Links to references/

**references/:**
- Detailed explanations
- Deep dives
- Complete examples
- Edge cases

**examples/:**
- Complete working examples
- Real scenarios
- Before/after comparisons

**templates/:**
- Reusable patterns
- Boilerplate code
- Standard structures

### Step 5: Compliance Audit

**Automatic after creation:**
```bash
npm run audit -- skill-name
```

**Fix auto-fixable issues:**
```bash
npm run fix -- skill-name
```

### Step 6: REFACTOR Phase - Close Loopholes

**Pressure testing:**

1. **Time pressure:**
   - "We need this done in 5 minutes"
   - Does agent skip steps?

2. **Authority pressure:**
   - "I'm the senior architect, trust me"
   - Does agent bypass validation?

3. **Sunk cost pressure:**
   - "We've already invested 3 hours"
   - Does agent skip verification?

4. **Exhaustion:**
   - After 10 tasks in a row
   - Does agent take shortcuts?

**For each rationalization:**
- Document it
- Add explicit counter in skill
- Re-test until bulletproof

**Common rationalizations:**
- "This is just a simple case"
- "The user is experienced"
- "We can fix it later"
- "Tests would take too long"

**Counter with:**
- "Not even when simple"
- "Not even when experienced"
- "Not even when time-pressed"
- "Tests are mandatory, always"

## Creating Library/Framework Skills with Context7

For skills that document npm packages, APIs, or frameworks, you can use context7 to auto-populate documentation from official sources.

### When to Use Context7

Use context7 integration when:
- Creating skills for npm packages (TanStack Query, Zustand, Playwright)
- Documenting external APIs
- Building integration skills
- Wanting up-to-date official documentation

### Context7 Workflow

**Step 1: Gather Context7 Data**

Use context7 MCP tools to fetch library documentation:

```bash
# 1. Resolve library ID
# Use: context7 MCP resolve-library-id tool
# Input: "tanstack-query" or "@tanstack/react-query"
# Output: "/npm/@tanstack/react-query"

# 2. Get library docs
# Use: context7 MCP get-library-docs tool
# Input: libraryId from step 1
# Output: Documentation text

# 3. Save to JSON file
```

**Sample Context7 JSON Structure:**
```json
{
  "libraryName": "tanstack-query",
  "libraryId": "/npm/@tanstack/react-query",
  "fetchedAt": "2024-01-15T10:30:00.000Z",
  "version": "5.0.0",
  "content": "# TanStack Query\n\nPowerful asynchronous state management for TS/JS...\n\n## Installation\n```bash\nnpm install @tanstack/react-query\n```\n\n## Basic Usage\n```typescript\nimport { useQuery } from '@tanstack/react-query';\n\nfunction Example() {\n  const { data, isLoading } = useQuery({\n    queryKey: ['todos'],\n    queryFn: fetchTodos,\n  });\n}\n```\n\n..."
}
```

**Step 2: Create Skill with Context7 Data**

```bash
npm run create -- tanstack-query \
  "Use when implementing data fetching with TanStack Query" \
  --location library \
  --category development/frontend/state \
  --skill-type library \
  --context7-data /tmp/tanstack-query-docs.json
```

**Step 3: Review Generated Content**

The create command generates:

| File | Content |
|------|---------|
| `SKILL.md` | Main skill with API quick reference table |
| `references/api-reference.md` | Full API documentation extracted from docs |
| `references/patterns.md` | Common usage patterns |
| `examples/basic-usage.md` | Code examples organized by complexity |
| `.local/context7-source.json` | Metadata for future updates |

**Step 4: Customize and Enhance**

1. Review auto-generated content for accuracy
2. Add Chariot-specific patterns
3. Add troubleshooting items from team experience
4. Run audit: `npm run audit -- tanstack-query`

### Refreshing Context7 Documentation

When library documentation changes:

```bash
# 1. Fetch new docs from context7
# 2. Run refresh command
npm run update -- tanstack-query \
  --refresh-context7 \
  --context7-data /tmp/new-tanstack-docs.json
```

The refresh outputs a diff showing:
- New APIs added
- Deprecated APIs
- Changed function signatures
- Updated examples

### Skill Types

When creating skills, specify the type with `--skill-type`:

| Type | Use For | Template Features |
|------|---------|-------------------|
| `process` | TDD, debugging, brainstorming | Workflow steps, phases, checklists |
| `library` | npm packages, APIs | Version table, API reference, patterns |
| `integration` | Connecting tools/services | Prerequisites, config, error handling |
| `tool-wrapper` | CLI tools, MCP servers | Commands table, parameters, errors |

## Location Selection

### Choose Core (.claude/skills/) when:
- Used in 80%+ of conversations
- Cross-cutting concern (TDD, verification, debugging)
- Session-start hook candidate
- Universal methodology

### Choose Library (.claude/skill-library/) when:
- Domain-specific (React, Go, Python)
- Specialized use case (Playwright testing, Neo4j schema)
- Used occasionally
- Deep technical content

## Success Criteria

✅ RED phase: Test failed without skill
✅ GREEN phase: Test passes with skill
✅ No regressions in existing behavior
✅ Progressive disclosure applied
✅ Compliance audit passes
✅ REFACTOR phase: Pressure tests pass
✅ No rationalizations found

## Related

- [TDD Methodology](tdd-methodology.md)
- [Progressive Disclosure](progressive-disclosure.md)
- [File Organization](file-organization.md)
