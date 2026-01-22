# Agent Output Validation: Examples

**Parent**: [agent-output-validation.md](agent-output-validation.md)

Complete validation examples showing success and failure scenarios, protocol rationale, and limitations.

---

## Complete Validation Example

### Scenario

Orchestrator spawns frontend-developer for implementation phase with task: "Implement user profile component with TanStack Query and form validation"

**Agent prompt includes:**

```markdown
MANDATORY SKILLS (invoke ALL before completing):

**Tier 1 (Universal - ALL 8 required):**

- using-skills: Skill discovery and usage framework
- discovering-reusable-code: Search for reusable patterns first
- semantic-code-operations: Use Serena MCP for semantic code operations
- calibrating-time-estimates: Prevent time pressure rationalization
- enforcing-evidence-based-analysis: Prevent hallucinations
- gateway-frontend: Route to frontend library skills
- persisting-agent-outputs: Write output to designated file
- verifying-before-completion: Verify all exit criteria

**Tier 2 (Developer role):**

- developing-with-tdd: Write tests before implementation

**Tier 3 (Gateway routing):**
After invoking gateway-frontend, READ the following library skills:

- using-tanstack-query (task keyword: "TanStack Query")
- implementing-react-hook-form-zod (task keyword: "form validation")
```

### Agent Returns

Orchestrator receives Task completion and reads output file:

```bash
cat .claude/.output/features/2026-01-19/frontend-developer-implementation.md
```

### Output File Content (End)

```markdown
... [implementation details] ...

---

## METADATA

{
"agent": "frontend-developer",
"task": "Implement user profile component with TanStack Query and form validation",
"skills_invoked": [
"using-skills",
"discovering-reusable-code",
"semantic-code-operations",
"calibrating-time-estimates",
"enforcing-evidence-based-analysis",
"gateway-frontend",
"persisting-agent-outputs",
"verifying-before-completion",
"developing-with-tdd"
],
"library_skills_read": [
".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md",
".claude/skill-library/development/frontend/implementing-react-hook-form-zod/SKILL.md"
],
"files_modified": [
"src/components/UserProfile.tsx",
"src/hooks/useUserProfile.ts",
"src/components/UserProfileForm.tsx"
],
"status": "complete"
}
```

### Validation Execution

```javascript
const result = validateAgentOutput(
  agentOutput,
  "Implement user profile component with TanStack Query and form validation",
  "frontend-developer"
);

// STEP 1: Tier 1 validation
// ✅ All 8 universal skills present + gateway-frontend

// STEP 2: Tier 2 validation
// ✅ developing-with-tdd present (developer role)

// STEP 3: Gateway match validation
// ✅ gateway-frontend matches agent type

// STEP 4: Extract keywords
// Keywords: ['React', 'TanStack Query', 'form validation']

// STEP 5: Tier 3 mandatory validation
// ✅ Not a tester, skip gateway-testing mandatory check

// STEP 6: Tier 4 task-specific validation
// Expected: using-tanstack-query, implementing-react-hook-form-zod
// Found: Both present in library_skills_read
// ✅ PASS

// STEP 7: Return
result = { valid: true, message: "All 4 tiers validated successfully" };
```

### Orchestrator Action

```markdown
✅ Validation PASSED for frontend-developer
All 4 tiers compliant:

- Tier 1: 8/8 universal skills ✅
- Tier 2: 1/1 role skills ✅
- Tier 3 Gateway: 1/1 required gateways ✅
- Tier 4: 2/2 task-specific library skills ✅

→ Proceeding to Phase 7 (Plan Completion Review)
```

---

## Tester Role Example

### Scenario

Orchestrator spawns frontend-tester for test implementation with task: "Write unit tests for UserProfile component with TanStack Query hooks"

**Agent prompt includes:**

```markdown
MANDATORY SKILLS (invoke ALL before completing):

**Tier 1 (Universal - ALL 8 required):**

- using-skills: Skill discovery and usage framework
- discovering-reusable-code: Search for existing test patterns first
- semantic-code-operations: Use Serena MCP for semantic code operations
- calibrating-time-estimates: Prevent time pressure rationalization
- enforcing-evidence-based-analysis: Read source before writing tests
- gateway-frontend: Route to frontend library skills
- gateway-testing: Route to testing library skills (MANDATORY for testers)
- persisting-agent-outputs: Write output to designated file
- verifying-before-completion: Verify all tests pass

**Tier 2 (Tester role):**

- developing-with-tdd: Write tests following TDD methodology

**Tier 3 (Gateway Mandatory - ALL testers MUST read these):**
After invoking gateway-testing, READ these 4 mandatory library skills:

- `Read(".claude/skill-library/testing/testing-anti-patterns/SKILL.md")`
- `Read(".claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md")`
- `Read(".claude/skill-library/testing/condition-based-waiting/SKILL.md")`
- `Read(".claude/skill-library/testing/avoiding-low-value-tests/SKILL.md")`

**Tier 4 (Task-specific from gateway routing):**

- `Read(".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md")` (task keyword: "TanStack Query")
- `Read(".claude/skill-library/testing/frontend/creating-mocks/SKILL.md")` (task keyword: "unit tests")
```

### Agent Returns (Compliant)

```json
{
  "agent": "frontend-tester",
  "task": "Write unit tests for UserProfile component with TanStack Query hooks",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-frontend",
    "gateway-testing",
    "persisting-agent-outputs",
    "verifying-before-completion",
    "developing-with-tdd"
  ],
  "library_skills_read": [
    ".claude/skill-library/testing/testing-anti-patterns/SKILL.md",
    ".claude/skill-library/testing/behavior-vs-implementation-testing/SKILL.md",
    ".claude/skill-library/testing/condition-based-waiting/SKILL.md",
    ".claude/skill-library/testing/avoiding-low-value-tests/SKILL.md",
    ".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md",
    ".claude/skill-library/testing/frontend/creating-mocks/SKILL.md"
  ],
  "files_modified": ["src/components/__tests__/UserProfile.test.tsx"],
  "status": "complete"
}
```

### Validation Execution

```javascript
// STEP 1: Tier 1 validation
// ✅ All 8 universal skills present

// STEP 2: Tier 2 validation
// ✅ developing-with-tdd present (tester role)

// STEP 3: Gateway match validation
// ✅ gateway-frontend AND gateway-testing present (frontend-tester requires both)

// STEP 4: Extract keywords
// Keywords: ['unit tests', 'TanStack Query', 'hooks']

// STEP 5: Tier 3 mandatory validation
// ✅ Agent IS a tester - checking gateway-testing mandatory skills
// ✅ testing-anti-patterns present
// ✅ behavior-vs-implementation-testing present
// ✅ condition-based-waiting present
// ✅ avoiding-low-value-tests present
// All 4 mandatory testing library skills present

// STEP 6: Tier 4 task-specific validation
// Expected: using-tanstack-query, creating-mocks
// Found: Both present in library_skills_read
// ✅ PASS

// STEP 7: Return
result = { valid: true, message: "All 4 tiers validated successfully" };
```

### Orchestrator Action

```markdown
✅ Validation PASSED for frontend-tester
All 4 tiers compliant:

- Tier 1: 8/8 universal skills ✅
- Tier 2: 1/1 role skills ✅
- Tier 3 Gateway: 2/2 required gateways ✅
- Tier 3 Mandatory: 4/4 testing library skills ✅
- Tier 4: 2/2 task-specific library skills ✅

→ Proceeding to test review phase
```

---

## Lead/Architect Role Example

### Scenario

Orchestrator spawns frontend-lead for architecture phase with task: "Design component architecture for dashboard metrics feature"

**Agent prompt includes:**

```markdown
MANDATORY SKILLS (invoke ALL before completing):

**Tier 1 (Universal - ALL 8 required):**

- using-skills: Skill discovery and usage framework
- discovering-reusable-code: Search for existing patterns first
- semantic-code-operations: Use Serena MCP for semantic code operations
- calibrating-time-estimates: Prevent time pressure rationalization
- enforcing-evidence-based-analysis: Analyze existing code before designing
- gateway-frontend: Route to frontend library skills
- persisting-agent-outputs: Write output to designated file
- verifying-before-completion: Verify design completeness

**Tier 2 (Lead/Architect role):**

- brainstorming: Explore design alternatives before committing
- writing-plans: Create detailed implementation plan for developers
```

### Agent Returns (Compliant)

```json
{
  "agent": "frontend-lead",
  "task": "Design component architecture for dashboard metrics feature",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-frontend",
    "persisting-agent-outputs",
    "verifying-before-completion",
    "brainstorming",
    "writing-plans"
  ],
  "library_skills_read": [
    ".claude/skill-library/development/frontend/using-tanstack-query/SKILL.md",
    ".claude/skill-library/development/frontend/using-zustand-state-management/SKILL.md"
  ],
  "files_modified": [],
  "status": "complete"
}
```

### Validation Execution

```javascript
// STEP 1: Tier 1 validation
// ✅ All 8 universal skills present

// STEP 2: Tier 2 validation
// ✅ brainstorming present (lead/architect role)
// ✅ writing-plans present (lead/architect role)

// STEP 3: Gateway match validation
// ✅ gateway-frontend present (frontend-lead requires it)

// STEP 4-6: Tier 3-4 validation (architecture tasks may have minimal library skills)
// ✅ PASS - no mandatory testing skills required (not a tester)

// STEP 7: Return
result = { valid: true, message: "All 4 tiers validated successfully" };
```

---

## Reviewer Role Example

### Scenario

Orchestrator spawns frontend-reviewer for code review with task: "Review UserProfile implementation against architecture plan"

**Agent prompt includes:**

```markdown
MANDATORY SKILLS (invoke ALL before completing):

**Tier 1 (Universal - ALL 8 required):**

- using-skills: Skill discovery and usage framework
- discovering-reusable-code: Check for patterns that should have been reused
- semantic-code-operations: Use Serena MCP for semantic code analysis
- calibrating-time-estimates: Prevent rushed reviews
- enforcing-evidence-based-analysis: Base feedback on actual code
- gateway-frontend: Route to frontend library skills for pattern validation
- persisting-agent-outputs: Write review output to designated file
- verifying-before-completion: Verify review is thorough

**Tier 2 (Reviewer role):**

- (none - reviewers only require Tier 1)

**Tier 4 (Task-specific for validation):**

- `Read(".claude/skill-library/development/frontend/reviewing-frontend-implementations/SKILL.md")`
```

### Agent Returns (Compliant)

```json
{
  "agent": "frontend-reviewer",
  "task": "Review UserProfile implementation against architecture plan",
  "skills_invoked": [
    "using-skills",
    "discovering-reusable-code",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "gateway-frontend",
    "persisting-agent-outputs",
    "verifying-before-completion"
  ],
  "library_skills_read": [
    ".claude/skill-library/development/frontend/reviewing-frontend-implementations/SKILL.md"
  ],
  "files_modified": [],
  "status": "complete"
}
```

### Validation Execution

```javascript
// STEP 1: Tier 1 validation
// ✅ All 8 universal skills present

// STEP 2: Tier 2 validation
// ✅ No additional skills required (reviewer role)

// STEP 3: Gateway match validation
// ✅ gateway-frontend present (frontend-reviewer requires it)

// STEP 4-6: Tier 3-4 validation
// ✅ PASS - no mandatory testing skills (not a tester)
// ✅ reviewing-frontend-implementations present (task-specific)

// STEP 7: Return
result = { valid: true, message: "All 4 tiers validated successfully" };
```

---

## Failure Example

### Agent Returns (Non-Compliant)

```json
{
  "agent": "frontend-developer",
  "task": "Implement user profile component with TanStack Query and form validation",
  "skills_invoked": ["using-skills", "gateway-frontend", "persisting-agent-outputs"],
  "library_skills_read": [],
  "files_modified": ["src/components/UserProfile.tsx"],
  "status": "complete"
}
```

### Validation Execution

```javascript
// STEP 1: Tier 1 validation
// ❌ FAIL - Missing: discovering-reusable-code, semantic-code-operations,
//            calibrating-time-estimates, enforcing-evidence-based-analysis,
//            verifying-before-completion

result = {
  valid: false,
  tier: 1,
  missing: [
    "discovering-reusable-code",
    "semantic-code-operations",
    "calibrating-time-estimates",
    "enforcing-evidence-based-analysis",
    "verifying-before-completion",
  ],
};
```

### Orchestrator Action

```markdown
❌ Validation FAILED for frontend-developer
Tier 1 failure: Missing 5/8 universal skills

- discovering-reusable-code
- semantic-code-operations
- calibrating-time-estimates
- enforcing-evidence-based-analysis
- verifying-before-completion

→ Re-spawning with compliance template (Attempt 2/3)
```

### Re-spawn Prompt

```markdown
[ORIGINAL TASK]

---

COMPLIANCE FAILURE - Re-execution Required

---

Your previous output failed validation.

### Missing Skills

**Tier 1 (Universal):**

- discovering-reusable-code
- semantic-code-operations
- calibrating-time-estimates
- enforcing-evidence-based-analysis
- verifying-before-completion

**Tier 2 (Role-Specific):** developing-with-tdd (not found in previous attempt)

**Tier 4 (Task-Specific):**

- using-tanstack-query (task contains "TanStack Query")
- implementing-react-hook-form-zod (task contains "form validation")

### MANDATORY: Read These Library Skills NOW

Based on your task 'Implement user profile component with TanStack Query and form validation' and code touched 'UserProfile.tsx', you MUST Read():

1. .claude/skill-library/development/frontend/using-tanstack-query/SKILL.md - because task contains 'TanStack Query'
2. .claude/skill-library/development/frontend/implementing-react-hook-form-zod/SKILL.md - because task contains 'form validation'
3. ALL Tier 1 universal skills - MANDATORY for all agents

[... rest of compliance template ...]
```

---

## Why This Protocol Exists

**Real failure scenario:**

1. Orchestrator spawns developer with comprehensive skill requirements
2. Developer completes task, returns summary: "Implementation complete"
3. Orchestrator reads summary, marks phase complete
4. Agent skipped TDD, didn't use gateway routing, ignored library skills
5. Quality degraded silently across multiple dimensions

**With 4-tier validation:**

1. Orchestrator spawns developer with comprehensive skill requirements
2. Developer completes task
3. Orchestrator reads output file, parses metadata
4. **Tier 1 check**: Missing semantic-code-operations → FAIL
5. Validation fails → re-spawn with explicit Tier 1 requirements
6. Developer invokes all universal skills on second attempt
7. **Tier 4 check**: Missing using-tanstack-query → FAIL
8. Validation fails → re-spawn with gateway routing emphasis
9. Developer reads library skills on third attempt
10. Validation passes → proceed

---

## Limitations

This validation protocol detects **if** agents invoked skills and read library skills, but cannot verify **how well** they followed skill instructions. An agent could:

- Invoke a skill but skip key steps
- Mark skill as invoked in metadata dishonestly
- Read a library skill but not apply its patterns
- Follow the letter but not the spirit of the skill

**Mitigation strategies:**

1. Human checkpoints at critical phases
2. Code review by reviewer agents
3. Quality scoring framework (see [quality-scoring.md](quality-scoring.md))
4. Explicit exit criteria verification (see verifying-before-completion skill)
5. Pressure testing and loophole detection (see pressure-testing-skill-content)

---

## Related

- [Post-Completion Verification Protocol](../SKILL.md#post-completion-verification-protocol-mandatory) - Manual verification process
- [persisting-agent-outputs](../../persisting-agent-outputs/SKILL.md) - Metadata format specification
- [Agent Routing Table](../SKILL.md#agent-routing-table) - What to do when agents are blocked
- [Retry Limits with Escalation](../SKILL.md#retry-limits-with-escalation) - Max retry defaults
- [AGENT-ARCHITECTURE.md](.claude/docs/agents/AGENT-ARCHITECTURE.md) - Agent type definitions
- [SKILL-ARCHITECTURE.md](.claude/docs/skills/SKILL-ARCHITECTURE.md) - 4-tier skill hierarchy

---

## Navigation

- **Main document**: [agent-output-validation.md](agent-output-validation.md)
- **Algorithm**: [agent-output-validation-algorithm.md](agent-output-validation-algorithm.md)
- **Templates**: [agent-output-validation-templates.md](agent-output-validation-templates.md)
