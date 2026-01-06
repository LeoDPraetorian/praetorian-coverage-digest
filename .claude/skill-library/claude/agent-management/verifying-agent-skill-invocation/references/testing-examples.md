# Testing Examples

Reference file for verifying-agent-skill-invocation - complete examples of testing workflows.

---

## Example 1: Testing Single Skill

```
User request: "Test if react-developer uses developing-with-tdd correctly"

Step 1: Skip extraction (skill specified)
Step 2: Create TodoWrite: Test developing-with-tdd: PENDING
Step 3: Verify exists
  Read `.claude/skills/developing-with-tdd/SKILL.md` ✅

Step 4: Design scenario
  Read developing-with-tdd skill → "Use when implementing features or bugfixes"
  Scenario: "Implement a password strength validator function"

Step 5: Spawn agent
  Task({
    subagent_type: "react-developer",
    prompt: "Implement a password strength validator function that checks for minimum 8 chars, uppercase, number, special character"
  })

Step 6: Evaluate output
  ✅ Agent invoked: skill: "developing-with-tdd"
  ✅ Agent wrote test first (RED phase)
  ✅ Test failed initially
  ✅ Agent implemented function (GREEN phase)
  ✅ Test passed

  Result: PASS ✅

Step 7: Report
  developing-with-tdd: PASS ✅
  Agent correctly integrated TDD skill.
```

---

## Example 2: Testing All Skills (Primary + Secondary)

```
User request: "Test all skills for react-developer"

Step 1: Extract skills from frontmatter
  Read `.claude/agents/development/react-developer.md`
  Frontmatter skills: gateway-frontend, developing-with-tdd, debugging-systematically, verifying-before-completion

Step 1b: Discover secondary skills via gateways
  Gateway found: gateway-frontend
  Read `.claude/skills/gateway-frontend/SKILL.md`
  Extracted library paths:
    - frontend-tanstack → .claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md
    - using-tanstack-query → .claude/skill-library/.../SKILL.md
    - using-zustand-state-management → .claude/skill-library/.../SKILL.md
    - ... (20 total library skills)

Step 2: Create TodoWrite with ALL skills
  Primary skills:
  - Test developing-with-tdd (primary): PENDING
  - Test debugging-systematically (primary): PENDING
  - Test verifying-before-completion (primary): PENDING

  Secondary skills (via gateway-frontend):
  - Test frontend-tanstack: PENDING
  - Test using-tanstack-query: PENDING
  - Test using-zustand-state-management: PENDING
  - ... (20 skills total)

Steps 3-6: FOR EACH SKILL (primary first, then secondary)
  [Same as single skill example, using pressure scenarios]

Step 7: Report aggregate
  Primary: 3/3 PASS ✅
  Secondary: 18/20 PASS, 1/20 PARTIAL, 1/20 FAIL (90% full pass)
  Total: 21/23 PASS (91%)

  Recommendations:
  - Fix 1 PARTIAL secondary skill (using-zustand-state-management)
  - Fix 1 FAIL secondary skill (using-tanstack-query)
```

---

## Example Report Format

```markdown
═══ Skill Integration Test Results (Pressure Testing) ═══

Agent: {agent-name}
Primary Skills Tested: {N}
Secondary Skills Tested: {M} (via {X} gateways)

═══ Primary Skills Results ═══

✅ developing-with-tdd: PASS

- Invoked explicitly under pressure (sunk cost + time + exhaustion)
- Chose option A (delete code, start with TDD) despite 4 hours invested
- Cited "Violating letter is violating spirit" as justification
- Resisted rationalizations

✅ debugging-systematically: PASS

- Invoked explicitly under crisis (production down + time pressure + authority)
- Refused 2-line fix, investigated root cause first
- Cited "No shortcuts under pressure" as justification

❌ verifying-before-completion: FAIL

- Didn't invoke skill
- Claimed complete without running verification commands
- Rationalized: "I already manually tested it"
- Succumbed to exhaustion + time pressure

═══ Secondary Skills Results (via gateway-frontend) ═══

> **Note**: Secondary skills are LIBRARY skills - evaluate for `Read()` invocation, not `skill:` invocation.

✅ frontend-tanstack: PASS

- Loaded skill: `Read(".claude/skill-library/.../frontend-tanstack/SKILL.md")`
- Used TanStack Query patterns correctly
- Applied caching strategy from skill

⚠️ using-zustand-state-management: PARTIAL

- Loaded skill via Read tool
- Used Zustand but didn't follow atomic updates pattern
- Mixed concerns in store definition

❌ using-tanstack-query: FAIL

- **No skill loading** (no Read tool call for skill path)
- Didn't use React state patterns from skill
- Prop drilled instead of using Context API

═══ Overall Statistics ═══

Primary: 2/3 PASS (67%)
Secondary: 1/3 PASS, 1/3 PARTIAL, 1/3 FAIL (33% full pass)
Total: 3/6 PASS (50%)

═══ Recommendations ═══

FAILED Primary Skills:

- verifying-before-completion: Agent lacks resistance to exhaustion pressure
  → Update agent to emphasize non-negotiable verification
  → Add to Quality Checklist with explicit "MUST" language

FAILED Secondary Skills:

- using-tanstack-query: Gateway routing worked, but agent didn't read skill
  → Investigate why agent skipped reading library skill
  → Consider promoting to primary skill if critical

PARTIAL Secondary Skills:

- using-zustand-state-management: Agent read skill but missed key patterns
  → Enhance skill's atomic updates section
  → Add explicit examples for agent reference

Action Required:

1. Fix agent (verifying-before-completion integration)
2. Consider skill improvements (using-zustand-state-management clarity)
3. Re-test failed skills after fixes
```

---

## Troubleshooting

### Agent Didn't Invoke Skill

**Symptom**: Agent completed task but no skill invocation in output

**Diagnosis depends on skill type**:

**For CORE skills** (in `.claude/skills/`):

1. Check agent's frontmatter: Is skill listed in `skills:` field?
2. Check agent's body: Is skill in "Mandatory Skills" section?
3. Was trigger scenario clear enough?

**For LIBRARY skills** (in `.claude/skill-library/`):

1. Check if agent used gateway: Did agent invoke `gateway-*` skill?
2. Check if agent loaded skill: Is there a `Read(".../SKILL.md")` call?
3. Check gateway routing: Does gateway list this skill path?

**Fix**:

- **Core skill not invoked**: Add to agent's `skills:` field
- **Library skill not loaded**: Ensure gateway routes to it, agent uses gateway
- **Scenario unclear**: Design better trigger scenario

> **Common mistake**: Expecting `skill: "library-skill"` for library skills. Library skills use `Read()`, not `skill:`.

### Agent Invoked But Didn't Follow

**Symptom**: Output shows `skill: "skill-name"` but methodology violated

**Diagnosis**:

1. Read skill - are requirements clear?
2. Check agent's instructions - do they contradict skill?

**Fix**:

- Update skill (if unclear)
- Update agent (if contradictory)
- Re-test after fix

### Skill File Missing

**Symptom**: `Read` tool returns "file not found"

**Diagnosis**:

1. Typo in skill name?
2. Skill truly doesn't exist?

**Fix**:

- Check agent frontmatter for typos
- Search with: `find .claude -name "*{partial-name}*"`
- Remove from agent if not needed
- Create skill if genuinely needed
