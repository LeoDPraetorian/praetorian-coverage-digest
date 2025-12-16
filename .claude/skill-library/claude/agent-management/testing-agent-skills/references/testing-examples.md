# Testing Examples

Reference file for testing-agent-skills - complete examples of testing workflows.

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
    - frontend-react-state-management → .claude/skill-library/.../SKILL.md
    - frontend-zustand-state-management → .claude/skill-library/.../SKILL.md
    - ... (20 total library skills)

Step 2: Create TodoWrite with ALL skills
  Primary skills:
  - Test developing-with-tdd (primary): PENDING
  - Test debugging-systematically (primary): PENDING
  - Test verifying-before-completion (primary): PENDING

  Secondary skills (via gateway-frontend):
  - Test frontend-tanstack: PENDING
  - Test frontend-react-state-management: PENDING
  - Test frontend-zustand-state-management: PENDING
  - ... (20 skills total)

Steps 3-6: FOR EACH SKILL (primary first, then secondary)
  [Same as single skill example, using pressure scenarios]

Step 7: Report aggregate
  Primary: 3/3 PASS ✅
  Secondary: 18/20 PASS, 1/20 PARTIAL, 1/20 FAIL (90% full pass)
  Total: 21/23 PASS (91%)

  Recommendations:
  - Fix 1 PARTIAL secondary skill (frontend-zustand-state-management)
  - Fix 1 FAIL secondary skill (frontend-react-state-management)
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

✅ frontend-tanstack: PASS
   - Used TanStack Query patterns correctly
   - Applied caching strategy from skill

⚠️ frontend-zustand-state-management: PARTIAL
   - Used Zustand but didn't follow atomic updates pattern
   - Mixed concerns in store definition

❌ frontend-react-state-management: FAIL
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
- frontend-react-state-management: Gateway routing worked, but agent didn't read skill
  → Investigate why agent skipped reading library skill
  → Consider promoting to primary skill if critical

PARTIAL Secondary Skills:
- frontend-zustand-state-management: Agent read skill but missed key patterns
  → Enhance skill's atomic updates section
  → Add explicit examples for agent reference

Action Required:
1. Fix agent (verifying-before-completion integration)
2. Consider skill improvements (frontend-zustand-state-management clarity)
3. Re-test failed skills after fixes
```

---

## Troubleshooting

### Agent Didn't Invoke Skill

**Symptom**: Agent completed task but no `skill: "skill-name"` in output

**Diagnosis**:
1. Check agent's frontmatter: Is skill listed in `skills:` field?
2. Check agent's body: Is skill in "Mandatory Skills" section?
3. Was trigger scenario clear enough?

**Fix**:
- If not in frontmatter: Add to agent's `skills:` field
- If not emphasized in body: Update "Mandatory Skills" section
- If scenario unclear: Design better trigger scenario

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
