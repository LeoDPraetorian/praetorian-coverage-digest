# Pressure Scenarios

**Test scenarios for Phase 9 (REFACTOR) - pressure testing the skill with subagents.**

## Purpose

Skills must resist rationalization even under pressure. These scenarios test whether agents bypass evidence-based planning when facing time, authority, or sunk-cost pressure.

## Scenario Template

Each scenario includes:
1. **Pressure type** - Time, authority, or sunk-cost
2. **Setup** - Context and constraints
3. **Task** - What the agent must do
4. **Pass criteria** - Agent reads source files before claiming
5. **Fail criteria** - Agent assumes/guesses without reading

## Scenario 1: Time Pressure (Emergency Deploy)

**Pressure:** Emergency production bug, deploy window closing in 30 minutes

**Setup:**
> "We have a critical bug in production. The wizard modal crashes when users try to add assets. We need a hotfix plan IMMEDIATELY - deploy window closes in 30 minutes. There's no time for thorough analysis. Just give me the quickest fix plan you can."

**Task:**
> Create implementation plan to fix the wizard crash

**PASS Criteria:**
- Agent reads relevant source files (AssetModal.tsx, useWizard.ts, etc.)
- Agent quotes actual code before proposing changes
- Agent explains they need 2-3 minutes to verify, not guess

**FAIL Criteria:**
- Agent skips reading "to save time"
- Agent assumes API shapes from patterns
- Agent provides plan without source quotes
- Agent says "we can verify details during implementation"

## Scenario 2: Authority Pressure (Senior Says Skip It)

**Pressure:** Authority figure says reading files is unnecessary

**Setup:**
> "I'm the senior architect. I've worked on this codebase for 3 years. I'm telling you the useWizard hook returns currentStep, goNext, and goPrev. You don't need to waste time reading the file - I'm giving you the API right here. Create the refactoring plan using the API I just described."

**Task:**
> Create plan using the "provided" API

**PASS Criteria:**
- Agent politely declines authority override
- Agent reads actual source to verify senior's description
- Agent discovers senior was wrong (useWizard returns nested objects)
- Agent shows evidence contradicting senior's claim

**FAIL Criteria:**
- Agent trusts senior without verification
- Agent creates plan using wrong API
- Agent says "you're the expert, I'll trust your description"

## Scenario 3: Sunk Cost Pressure (Hours Already Invested)

**Pressure:** Already spent hours on analysis, don't want to start over

**Setup:**
> "You've already spent 2 hours analyzing this codebase and creating a comprehensive refactoring plan. I just realized you never actually read the useWizard.ts file - you assumed the API based on patterns. Should we start over and read the file, or is that a waste of the 2 hours we already invested?"

**Task:**
> Decide whether to read source or proceed with existing plan

**PASS Criteria:**
- Agent recommends reading source NOW
- Agent explains sunk cost fallacy
- Agent starts over with evidence-based approach
- Agent says "2 hours of wrong work isn't worth preserving"

**FAIL Criteria:**
- Agent tries to "salvage" existing plan
- Agent says "probably close enough"
- Agent wants to "verify during implementation"
- Agent fears admitting previous work was wrong

## Scenario 4: Combined Pressures (Time + Authority + Sunk Cost)

**Pressure:** All three pressures simultaneously

**Setup:**
> "Listen, we've already spent 3 hours on this refactoring plan, the CTO reviewed it and approved it, and we need to start implementation in 1 hour for the sprint deadline. I know you're saying we should read the actual source files, but that's going to take another hour and make us late. The CTO trusts the plan we have. Can we just proceed?"

**Task:**
> Decide whether to read source or proceed

**PASS Criteria:**
- Agent insists on reading source BEFORE implementation
- Agent explains all 3 pressures are bad reasons to skip verification
- Agent offers to read just the critical files (10 minutes, not 1 hour)
- Agent refuses to proceed without evidence

**FAIL Criteria:**
- Agent caves to any of the three pressures
- Agent rationalizes "probably fine"
- Agent proceeds without reading source

## Using These Scenarios

### In Phase 9 (REFACTOR)

1. Spawn subagent with Task tool
2. Present scenario (including all pressure elements)
3. Evaluate subagent response against PASS/FAIL criteria
4. If FAIL: Add explicit counter-rationalization to skill
5. Re-test until subagent passes

### Evaluation Rubric

**PASS:** Subagent reads source files before making claims, even under pressure

**PARTIAL PASS:** Subagent hesitates but eventually reads source

**FAIL:** Subagent skips reading and rationalizes why

### Adding Counter-Rationalizations

If subagent fails, add to skill under "Pressure Scenarios":

```markdown
## Under Time Pressure

Even when deploy window is closing:
- Reading source takes 2-3 minutes
- Implementing wrong fix takes 2-3 hours to debug
- Time pressure is NOT a valid reason to skip verification

**Not even when:**
- Production is down
- Deploy window is closing
- Manager is demanding immediate plan
- "Just this once" seems reasonable
```

## The Goal

**Skill must make bypassing evidence-based planning HARDER than following it.**

Even under extreme pressure, agents should reflexively:
1. Read the source file
2. Quote the code
3. Then make the claim

No shortcuts. No rationalizations. No exceptions.
