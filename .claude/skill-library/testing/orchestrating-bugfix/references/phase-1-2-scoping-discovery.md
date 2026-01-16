# Phase 1-2: Bug Scoping and Discovery

**Purpose:** Parse bug symptoms, identify candidate locations, and optionally spawn Explore agents to find bug-related code.

## Phase Structure

Phase 1-2 is divided into two stages:
1. **Stage 1 (Scoping):** Parse symptoms, grep for clues, calculate agent count
2. **Stage 2 (Discovery):** Spawn 0-5 Explore agents if location unknown

## Required Skill

**MUST invoke before proceeding:**

```
Read(".claude/skill-library/testing/discovering-bugs-for-fixing/SKILL.md")
```

The discovering-bugs-for-fixing skill handles the complete scoping and discovery workflow.

## Stage 1: Scoping

### Inputs

From Phase 0:
- `bug-symptoms.md` - User's bug description
- Error messages or stack traces (if available)
- Expected vs actual behavior

### Workflow

The discovering-bugs-for-fixing skill will:

1. **Parse Symptoms**
   - Extract error messages
   - Identify UI components or API endpoints involved
   - List affected features

2. **Grep for Clues**
   - Search for error message text
   - Find components/functions mentioned in symptoms
   - Locate test files for affected features

3. **Calculate Agent Count**
   - 0 agents: Location known from grep results
   - 1-2 agents: Single component, narrow scope
   - 3-5 agents: Multiple possible locations, broad scope

### Outputs

- `bug-scoping-report.json` with:
  ```json
  {
    "symptom_analysis": {
      "error_messages": ["ValidationError: Email required"],
      "affected_components": ["LoginForm", "validateEmail"],
      "affected_features": ["user authentication"]
    },
    "grep_results": {
      "error_messages_found": ["src/components/LoginForm.tsx:123"],
      "component_locations": ["src/components/LoginForm.tsx"],
      "test_file_locations": ["src/components/LoginForm.test.tsx"]
    },
    "discovery_plan": {
      "agents_needed": 2,
      "search_scope": "narrow",
      "confidence": "medium"
    }
  }
  ```

## Stage 2: Discovery (Conditional)

### When to Skip

Skip if discovery_plan.agents_needed = 0:
- Bug location identified by grep
- Error message points to specific file:line
- Component explicitly named in symptoms

### When to Execute

Execute if discovery_plan.agents_needed >= 1:
- Bug location unclear from grep
- Multiple candidate locations found
- Generic error requires code exploration

### Workflow

The discovering-bugs-for-fixing skill spawns Explore agents in parallel:

**Agent count scale:**
- 1-2 agents: Narrow scope (single feature)
- 3-4 agents: Medium scope (multiple components)
- 5 agents: Broad scope (cross-cutting concern)

**Each agent receives:**
```
Task: Explore codebase to find [specific aspect]

Scope:
- Pattern: [glob pattern like src/**/*.tsx]
- Keyword: [error message or component name]
- Focus: [data flow, validation logic, event handlers]

OUTPUT_DIR: [from Phase 0]
Mode: quick  # Not "very thorough" - this is lightweight discovery
```

### Outputs

- `candidate-locations.md`:
  ```markdown
  # Candidate Bug Locations

  ## High Confidence

  ### src/components/LoginForm.tsx - validateEmail()
  - Contains validation logic for email field
  - Matches error message pattern
  - No null check before regex test

  ## Medium Confidence

  ### src/utils/validation.ts - isValidEmail()
  - Called by LoginForm
  - Could be source of ValidationError
  - But error message suggests component-level issue

  ## Low Confidence

  ### src/api/auth.ts - login()
  - Server-side validation possible
  - But error appears client-side from stack trace
  ```

## Decision Point

After Phase 1-2 completes:

**IF 0 candidates found:**
- STOP workflow
- Ask user via AskUserQuestion:
  ```
  No candidate locations found for this bug.

  Can you provide:
  - More specific error messages?
  - Steps to reproduce?
  - Files you suspect are involved?
  ```

**IF candidates found:**
- Proceed to Phase 3 (Investigation)
- Pass candidate-locations.md to debugger agent

## Conditional: Parallel Investigation

If discovering-bugs-for-fixing returns >=3 candidates AND they are independent (different features/modules):

**Consider** invoking `dispatching-parallel-agents` to spawn multiple debugger agents investigating different candidates simultaneously.

**Criteria for parallelization:**
- 3+ candidates
- Independent code paths (no shared state)
- Candidates in different features/modules

## Example Scenarios

### Scenario 1: Location Known

**Symptoms:** "LoginForm shows 'Email required' even when email is entered"
**Grep results:** Found `"Email required"` in `LoginForm.tsx:123`
**Decision:** agents_needed = 0, skip discovery, proceed to Phase 3

### Scenario 2: Narrow Discovery

**Symptoms:** "Form validation error but not sure which field"
**Grep results:** Multiple validation functions found
**Decision:** agents_needed = 2, spawn focused Explore agents

### Scenario 3: Broad Discovery

**Symptoms:** "App crashes on submit but no error message"
**Grep results:** Generic error in multiple submit handlers
**Decision:** agents_needed = 5, spawn broad Explore agents

## Common Issues

### Issue: Too many candidates (>10)

**Solution:** Refine symptoms with user:
```
Bug scope is too broad. Can you specify:
- Which feature/page has the bug?
- What action triggers it?
- Any error message text?
```

### Issue: No grep results

**Solution:** Adjust search terms:
- Try partial error messages
- Search for component names
- Look for related functionality

## Next Phase

Proceed to [Phase 3: Investigation](phase-3-investigation.md) with candidate-locations.md

## Related Skills

- `discovering-bugs-for-fixing` - Complete scoping and discovery workflow
- `dispatching-parallel-agents` - Parallel investigation for multiple candidates
