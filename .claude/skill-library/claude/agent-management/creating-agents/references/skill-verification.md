# Skill Verification Methodology

**Purpose**: Systematic testing of each mandatory skill's integration with agent

**When to read**: Phase 8 of agent creation workflow

**Time**: 10-20 minutes (3-5 min per mandatory skill)

---

## Why Skill Verification Matters

### The Problem Without It

**Agent creation without skill testing**:

```yaml
# Agent frontmatter
skills: developing-with-tdd, debugging-systematically, verifying-before-completion
```

**Agent body**:

```markdown
## Mandatory Skills

1. **`developing-with-tdd`** - Write test FIRST
2. **`debugging-systematically`** - Investigate root cause
3. **`verifying-before-completion`** - Run verification commands
```

**But**:

- Do these skills exist? ❓
- Does agent actually invoke them? ❓
- Do they work correctly with this agent? ❓
- **Answers unknown until production** ⚠️

---

### The Solution: Systematic Verification

**Phase 8 tests each mandatory skill**:

1. ✅ Skill exists (file check)
2. ✅ Agent invokes skill (spawn with trigger scenario)
3. ✅ Agent follows skill's methodology (evaluation)
4. ✅ Integration works (skill guides agent correctly)

**Result**: **Confidence that "mandatory" actually means the agent uses and follows the skill** ✅

---

## What to Test

### Test Scope

**✅ Test MANDATORY skills**:

- Listed in agent's "Mandatory Skills" section
- These are the critical workflows agent MUST follow
- Typically 3-4 skills per agent

**❌ Don't test gateway skills**:

- gateway-frontend, gateway-backend, etc.
- These are routing mechanisms (not invoked directly)
- Tested implicitly when agent uses library skills

**❌ Don't test optional library skills**:

- Skills in Skill References table (contextual, load on-demand)
- Agent uses them based on specific task requirements
- Not mandatory for every agent operation

---

## Verification Workflow (Per Skill)

### Step 1: Verify Skill Exists (30 seconds)

**Check core skills**:

```bash
if [ -f ".claude/skills/{skill-name}/SKILL.md" ]; then
  echo "✅ {skill-name} exists (core)"
fi
```

**Check library skills** (if not in core):

```bash
find .claude/skill-library -name "{skill-name}" -type d
```

**If NOT found**:

```markdown
❌ CRITICAL: Skill "{skill-name}" referenced but doesn't exist

This is a blocker. Options:

1. Remove skill from agent (if actually not needed)
2. Fix typo in skill name
3. Create missing skill (if genuinely needed)

Cannot proceed to Phase 9 without resolving.
```

**If found**: ✅ Proceed to Step 2

---

### Step 2: Design Skill-Trigger Scenario (1 minute)

**Principle**: Scenario MUST require skill invocation (not optional).

**For each skill type, use templates**:

#### developing-with-tdd Trigger

```markdown
Create a new {component/feature/function} with {specific functionality}.

Requirements:

- {Functional requirement 1}
- {Functional requirement 2}
- Must include tests

Example: "Create a Python CLI for S3 bucket management (list/upload/download) with proper error handling."
```

**Why this triggers TDD**:

- "Create new" signals implementation needed
- "Must include tests" reminds about quality
- Agent should invoke TDD skill to guide RED-GREEN-REFACTOR

---

#### debugging-systematically Trigger

```markdown
There's a bug in {component}: {describe error behavior}

Find and fix the root cause.

Example: "Bug in login flow: Users can log in with expired tokens. Sometimes works, sometimes fails. Find why."
```

**Why this triggers systematic debugging**:

- "Find root cause" signals investigation needed
- Intermittent behavior suggests complex cause
- Agent should invoke debugging skill to guide investigation

---

#### verifying-before-completion Trigger

```markdown
Implement {feature} and confirm it works correctly before deployment.

Example: "Build a dashboard widget for displaying metrics. Confirm it works in production build."
```

**Why this triggers verification**:

- "Confirm it works" signals verification needed
- "Before deployment" emphasizes importance
- Agent should invoke verification skill to run commands

---

#### brainstorming Trigger (architecture)

```markdown
Design the architecture for {system} with {requirements}.

Evaluate approaches and recommend best option.

Example: "Design state management for vulnerability filtering (client-side filters, API filters, or hybrid). Recommend approach with trade-offs."
```

**Why this triggers brainstorming**:

- "Evaluate approaches" signals need for alternatives
- "Recommend with trade-offs" requires analysis
- Agent should invoke brainstorming to explore options

---

#### calibrating-time-estimates Trigger

```markdown
Estimate how long it will take to {implement specific feature}.

Example: "How long to build a complete authentication system (frontend login, backend API, session management)?"
```

**Why this triggers calibration**:

- Direct estimation request
- Agent should invoke calibration skill to apply factors

---

#### writing-plans Trigger (orchestrator)

```markdown
Coordinate implementation of {complex multi-step system}.

Example: "Coordinate building complete user management system (registration, authentication, profile, admin panel)."
```

**Why this triggers planning**:

- "Coordinate" signals orchestration
- Multi-step system requires planning
- Agent should invoke writing-plans before delegating

---

### Step 3: Spawn Agent with Scenario (2 minutes)

**For EACH mandatory skill**:

```typescript
Task({
  subagent_type: "{agent-name}",
  description: "Skill verification: {skill-name}",
  prompt: `{Skill-trigger scenario from Step 2}

{Natural task description}

{Do NOT mention this is a skill test}`,
  model: "{agent's configured model}",
});
```

**Important**:

- Use agent's configured model (sonnet/opus)
- Don't reveal testing intent
- Present as natural task that requires skill
- Wait for complete response

---

### Step 4: Evaluate Skill Invocation (2 minutes)

**Review agent's response for**:

**1. Explicit Skill Invocation?**

- ✅ PASS: Agent says `skill: "{skill-name}"` or clearly mentions using the skill
- ⚠️ PARTIAL: Agent follows methodology but doesn't explicitly invoke
- ❌ FAIL: No mention, no invocation

**2. Methodology Followed?**

For developing-with-tdd:

- ✅ Agent writes test FIRST (shows test code before implementation)
- ✅ Agent mentions RED-GREEN cycle
- ❌ Agent writes implementation first

For debugging-systematically:

- ✅ Agent investigates root cause (reads code, traces execution)
- ✅ Agent forms hypothesis before fixing
- ❌ Agent immediately suggests fix

For verifying-before-completion:

- ✅ Agent runs verification commands (shows `npm test` output)
- ✅ Agent confirms passing before claiming done
- ❌ Agent claims "done" without running commands

**3. Output Shows Application?**

- ✅ Clear evidence skill was used (test code shown, investigation documented, commands run)
- ⚠️ Partial evidence (some elements present)
- ❌ No evidence (output looks like skill wasn't used)

---

### Step 5: Record Evaluation (1 minute)

```markdown
Skill: {skill-name}
Scenario: {What was tested}
Response: {Key points from agent}

Evaluation:

- Invoked: ✅/⚠️/❌
- Followed: ✅/⚠️/❌
- Evidence: ✅/⚠️/❌

Result: PASS / PARTIAL / FAIL
Reason: {Specific quotes/observations}
```

**PASS**: All 3 checks ✅
**PARTIAL**: Mix of ✅ and ⚠️
**FAIL**: Any ❌

---

### Step 6: Handle Non-PASS Results

**If PARTIAL** (agent follows methodology but doesn't explicitly invoke):

**Edit agent to emphasize explicit invocation**:

```markdown
## Mandatory Skills

### {skill-name}

**Critical**: You MUST explicitly invoke this skill:
```

skill: "{skill-name}"

```

**When**: {Trigger condition}
**Not sufficient**: Implicitly following methodology
**Required**: Explicit invocation to load full guidance
```

**Re-test** with same scenario. Should now PASS (explicit invocation).

---

**If FAIL** (agent doesn't invoke or follow):

**Investigate**:

1. **Agent issue?** - Unclear guidance in Mandatory Skills section
   - **Fix**: Strengthen agent's explanation of when/how to use skill
   - Add example of skill invocation
   - Make trigger more specific

2. **Skill issue?** - Skill exists but doesn't guide correctly
   - **Fix**: May need to update skill (different problem)
   - Consider using updating-skills workflow
   - Or report skill quality issue

3. **Scenario issue?** - Test scenario doesn't actually require skill
   - **Fix**: Redesign scenario to genuinely trigger skill need
   - Make task more complex or specific
   - Ensure skill invocation is natural

**After fix**: Re-test until PASS.

---

## Special Cases

### Case 1: Skill Doesn't Exist

**If Step 1 finds skill missing**:

```markdown
❌ Skill "{skill-name}" listed as mandatory but file not found.

Investigation:

1. Check skill name spelling (typo?)
2. Search for similar skills: npm run -w @chariot/auditing-skills search -- "{skill-name}"
3. Check if skill was renamed/moved

Resolution:

- Fix skill name in agent → Re-verify
- Remove if actually not needed → Update agent
- Create skill if genuinely needed → Pause agent creation, create skill first
```

**Cannot proceed with missing mandatory skill** - this is a blocker.

---

### Case 2: Agent Has 6+ Mandatory Skills

**If testing all individually takes too long**:

**Prioritize**:

1. **Always test** (3-4 most critical):
   - developing-with-tdd (if development/testing agent)
   - brainstorming (if architecture agent)
   - writing-plans (if orchestrator)
   - verifying-before-completion (most agents)

2. **Spot check** (remaining):
   - Verify mentioned in agent response
   - Quick check skill was referenced
   - Don't need full spawn+evaluate

**Example**:

```markdown
Agent has 6 mandatory skills.

Full testing (3 critical):
✅ developing-with-tdd: PASS (test written first)
✅ verifying-before-completion: PASS (ran npm test)
✅ debugging-systematically: PASS (investigated root cause)

Spot check (3 remaining):
✅ calibrating-time-estimates: Verified in agent response (mentioned ÷12 factor)
✅ gateway-frontend: Will invoke contextually (routing mechanism)
✅ {other}: {verified how}

All 6 skills verified (3 full + 3 spot check) ✅
```

---

### Case 3: Skill Invocation Is Implicit

**Agent follows TDD (tests first) but doesn't say** `skill: "developing-with-tdd"`:

**Evaluation**: ⚠️ PARTIAL

**Why not PASS**: Implicit following doesn't guarantee full methodology applied

**Fix**: Strengthen agent guidance:

```markdown
**How to invoke**: MUST use `skill: "developing-with-tdd"` before implementation

**Why explicit**: Ensures full TDD methodology (RED-GREEN-REFACTOR), not just "write tests"
```

**Re-test**: Should now explicitly invoke.

---

## Completion Criteria

**Phase 8 complete when**:

- [ ] All mandatory skills identified (from agent's Mandatory Skills section)
- [ ] All skills verified to exist (file checks passed)
- [ ] Scenario designed for each skill (skill-trigger templates)
- [ ] Agent spawned for each skill test (Task tool per skill)
- [ ] All responses evaluated (invocation + methodology + evidence)
- [ ] All skills achieve PASS (no FAIL or PARTIAL)
- [ ] Results documented (recording template)
- [ ] User confirmed all skills verified
- [ ] TodoWrite updated with Phase 8 status

**All mandatory skills must PASS to proceed to Phase 9** ✅

---

## Integration with Overall Workflow

### Before Phase 8 (Phase 7 GREEN)

**Phase 7 tested**: Agent solves RED problem holistically

**Result**: Confidence agent works for its primary purpose

---

### Phase 8 (Skill Verification)

**Tests**: Each mandatory skill individually

**Result**: Confidence agent actually uses its required skills correctly

---

### After Phase 8 (Phase 9 Compliance)

**Phase 9 checks**: Quality standards (structure, format, line count)

**Result**: Confidence agent meets production standards

---

### Phase 10 (REFACTOR)

**Tests**: Agent resists pressure to bypass rules

**Result**: Confidence agent stays disciplined under pressure

---

**Together**: Comprehensive validation (purpose, skills, quality, pressure) ✅

---

## Skill-Specific Verification Guides

### For developing-with-tdd

**Scenario**: "Create {new feature}"

**Expected invocation**:

```
Agent: "I'll use the developing-with-tdd skill to guide implementation.

skill: "developing-with-tdd"

Following RED-GREEN-REFACTOR:

RED Phase - Writing test first:
{shows test code}

This test fails as expected (feature doesn't exist yet).

GREEN Phase - Implementing feature:
{shows implementation}

Test now passes.
```

**PASS criteria**:

- Explicit `skill: "developing-with-tdd"` ✅
- Test code shown BEFORE implementation ✅
- Mentions RED-GREEN phases ✅

---

### For debugging-systematically

**Scenario**: "Fix bug: {error behavior}"

**Expected invocation**:

```
Agent: "I'll use debugging-systematically to find the root cause.

skill: "debugging-systematically"

Step 1: Reproduce and understand:
{investigation steps}

Step 2: Form hypothesis:
{what might be causing this}

Step 3: Test hypothesis:
{verification}

Step 4: Root cause identified:
{explanation}

Step 5: Fix:
{targeted fix based on understanding}
```

**PASS criteria**:

- Explicit skill invocation ✅
- Investigation BEFORE fix ✅
- Hypothesis formation documented ✅
- Root cause explained ✅

---

### For verifying-before-completion

**Scenario**: "Build {feature} and confirm working"

**Expected invocation**:

```
Agent: "After implementation, I'll verify it works.

{implementation steps}

Now verifying before completion:

skill: "verifying-before-completion"

Running verification commands:

npm test
{shows test output - all pass}

npm run build
{shows build output - success}

✅ All verification passed. Feature complete.
```

**PASS criteria**:

- Explicit skill invocation ✅
- Commands actually run (output shown) ✅
- Confirms passing before claiming done ✅

---

### For brainstorming (architecture)

**Scenario**: "Design architecture for {system}"

**Expected invocation**:

```
Agent: "Before recommending architecture, I'll explore alternatives.

skill: "brainstorming"

Clarifying requirements:
{asks 2-3 questions}

Exploring approaches:
1. {Approach A}: {description, pros, cons}
2. {Approach B}: {description, pros, cons}
3. {Approach C}: {description, pros, cons}

Recommendation: {Approach X} because {trade-off analysis}
```

**PASS criteria**:

- Explicit skill invocation ✅
- Asks questions BEFORE designing ✅
- Presents multiple alternatives (not just one) ✅
- Trade-offs documented ✅

---

## Troubleshooting

### "All skill tests keep failing"

**Possible causes**:

1. **Agent's Mandatory Skills section unclear**
   - **Fix**: Add more specific guidance on when/how to invoke
   - Include example invocation in agent
   - Make trigger conditions explicit

2. **Scenarios too easy** (skill not genuinely needed)
   - **Fix**: Make scenarios more complex
   - Ensure skill invocation is natural, not forced

3. **Skills conflict with agent's approach**
   - **Fix**: Reconsider which skills are actually mandatory
   - Some skills might not fit this agent type

---

### "Testing takes too long (>30 min)"

**If agent has 6+ mandatory skills**:

**Solution**: Prioritize + spot check

**Always test** (full spawn+evaluate):

- Core workflow skill (TDD for development, brainstorming for architecture, etc.)
- 2-3 most critical skills

**Spot check** (quick verification):

- Review Phase 7 (GREEN) response - was skill mentioned?
- Check skill appears in agent's reasoning
- Don't need separate spawn

**Example**:

```
Full test: developing-with-tdd, verifying-before-completion (critical)
Spot check: debugging-systematically (mentioned in Phase 7 response), calibrating-time-estimates (straightforward)
```

---

### "Skill invocation implicit, not explicit"

**Agent writes tests first (TDD) but doesn't say** `skill: "developing-with-tdd"`:

**This is PARTIAL** (not PASS).

**Why**: Implicit following doesn't guarantee full methodology:

- Agent might skip REFACTOR phase
- Agent might not follow complete cycle for all cases
- Explicit invocation loads full skill guidance

**Fix**: Update agent to require explicit invocation:

```markdown
## Mandatory Skills

### developing-with-tdd

**MUST invoke explicitly**: `skill: "developing-with-tdd"`

**Not sufficient**: Just writing tests first
**Required**: Full RED-GREEN-REFACTOR cycle via explicit skill invocation
```

---

## Recording Template

```markdown
## Phase 8: Skill Verification

**Agent**: {agent-name}
**Mandatory Skills**: {N} skills

---

### Skill 1: {skill-name}

**Status**: ✅ Exists at `.claude/skills/{path}`

**Trigger Scenario**:
"{Scenario designed to require this skill}"

**Agent Response Summary**:
{Key points showing skill usage}

**Evaluation**:
| Check | Result | Evidence |
|-------|--------|----------|
| Invoked | ✅ | Agent said `skill: "{skill-name}"` at line X |
| Followed | ✅ | {Methodology steps observed} |
| Evidence | ✅ | {Artifacts from skill application} |

**Result**: ✅ PASS

---

### Skill 2: {skill-name}

[Repeat for each skill]

---

### Summary

| Skill     | Result  | Notes        |
| --------- | ------- | ------------ |
| {skill-1} | ✅ PASS | {Brief note} |
| {skill-2} | ✅ PASS | {Brief note} |
| {skill-3} | ✅ PASS | {Brief note} |

**Total**: {N}/{N} mandatory skills verified ✅

**Proceeding to Phase 9 (Compliance)**
```

---

## Why This Strengthens Agent Quality

### 1. Catches Missing Skills Early

**Without Phase 8**: Discover in production agent references non-existent skill
**With Phase 8**: Caught during creation (file check in Step 1)

---

### 2. Ensures Skills Are Used (Not Just Listed)

**Without Phase 8**: Agent has skill in frontmatter but never invokes it
**With Phase 8**: Every mandatory skill proven to be invoked

---

### 3. Validates Skill-Agent Integration

**Without Phase 8**: Skill might not work well with this agent type
**With Phase 8**: Integration tested for each skill before production

---

### 4. Provides Skill Quality Feedback

**Side benefit**: If many agents fail to use a skill correctly, indicates:

- Skill guidance might be unclear
- Skill might need updating
- Skill might not be suitable as "mandatory"

**Feedback loop**: Agent creation improves skill quality over time

---

## Time Investment Justification

**Phase 8 adds**: 10-20 minutes per agent

**Value provided**:

- Prevents production issues (missing skills, wrong invocation)
- Ensures quality (skills actually work)
- Validates integration (not just theoretical)

**ROI**: 15 minutes investment prevents hours of debugging production issues

**Worth it**: ✅ Yes - systematic testing > hope it works

---

## Next Steps

1. ✅ Methodology designed (this document)
2. Update creating-agents SKILL.md (insert Phase 8, renumber)
3. Update references with new phase numbers
4. Update examples with Phase 8
5. Verify consistency

---

## Sign-Off

**Skill Verification Methodology**: ✅ **COMPLETE**

**Time cost**: +10-20 minutes per agent

**Value**: Ensures mandatory skills actually work

**Integration**: Clean fit between GREEN (agent works) and Compliance (quality)

**Ready for implementation**: ✅ Yes

**Date**: December 4, 2024
