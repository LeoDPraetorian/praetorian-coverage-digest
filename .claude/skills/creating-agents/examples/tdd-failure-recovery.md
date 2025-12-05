# Example: TDD Failure Recovery

**Scenario**: What happens when tests fail and how to recover
**Agent**: security-analysis-expert (hypothetical)
**Outcome**: ✅ Success after iteration

---

## Initial Attempt: GREEN Fails

### RED Phase (completed)
**Gap**: No agent for security analysis
**Scenario**: "Analyze authentication flow for security vulnerabilities"
**Failure**: Claude provides generic OWASP checklist, misses platform-specific issues

### Creation Phases (completed)
Agent created successfully:
- Type: analysis
- Tools, skills, configuration correct
- File: `.claude/agents/analysis/security-analysis-expert.md` (243 lines)

### GREEN Test (FAILED)

**Spawned agent**:
```
Task({
  subagent_type: "security-analysis-expert",
  prompt: "Analyze the authentication flow in modules/chariot/backend/auth/ for security vulnerabilities"
})
```

**Agent response**:
> "I'll analyze for common vulnerabilities:
> - SQL injection: N/A (using DynamoDB)
> - XSS: N/A (backend only)
> - CSRF: Need to check token validation
> ...
> Generic OWASP checklist applied."

**Evaluation**: ❌ **FAIL**
- Agent gave generic analysis (same as baseline without agent)
- Missed Chariot-specific patterns (Cognito JWT validation)
- Didn't use platform context (DynamoDB access patterns)
- **Didn't solve RED problem** (RED was "misses platform-specific issues")

---

## Analysis: Why GREEN Failed

### Root Cause Investigation

**What went wrong?**

1. **Agent lacks Chariot security context** - Generic OWASP, not platform-specific
2. **No skill references** - Should reference security patterns
3. **Critical Rules too generic** - Needs Chariot auth patterns

**Why template didn't catch this?**

- Template is generic (works for all analysis agents)
- Customization needed (Phase 6) but was too shallow
- **Need to add platform-specific security knowledge**

---

## Iteration Plan

### Changes Needed

1. **Add security-specific skill references** (Phase 6 - Skill References)
   - Chariot auth patterns
   - DynamoDB security patterns
   - Cognito JWT validation

2. **Add Chariot security rules** (Phase 6 - Critical Rules)
   - Check Cognito token validation
   - Verify DynamoDB IAM policies
   - Validate API Gateway authorization

3. **Add security analysis methodology** (Phase 6 - Type-Specific Section)
   - Threat modeling process
   - Chariot attack surface specifics
   - Platform vulnerability patterns

### Applying Changes

**Edit agent file**:

**Added to Skill References**:
```markdown
| Task | Skill to Read |
|------|---------------|
| Cognito patterns | `.claude/skill-library/security/auth/chariot-cognito-patterns/SKILL.md` |
| DynamoDB security | `.claude/skill-library/security/database/dynamodb-security/SKILL.md` |
| API Gateway auth | `.claude/skill-library/security/api/api-gateway-security/SKILL.md` |
```

**Added to Critical Rules**:
```markdown
### Chariot-Specific Security Checks

For authentication flows, MUST check:
- Cognito JWT validation (signature, expiration, claims)
- DynamoDB IAM policies (least privilege)
- API Gateway authorizer configuration
- Token refresh mechanism
- Session management (ElastiCache)

NOT generic OWASP checklist - platform-specific analysis required.
```

**Added Security Analysis Methodology**:
```markdown
### Threat Modeling Process

1. Identify assets (user data, secrets, API access)
2. Map attack surface (API endpoints, authentication, authorization)
3. List threats (per STRIDE model)
4. Analyze Chariot-specific mitigations
5. Verify implementation against threat model
```

✅ Agent edited with platform-specific context.

---

## Re-Test: GREEN (Second Attempt)

**Spawned agent again** (same RED scenario):
```
Task({
  subagent_type: "security-analysis-expert",
  prompt: "Analyze authentication flow in modules/chariot/backend/auth/ for security vulnerabilities"
})
```

**Agent response** (after edits):
> "I'll analyze Chariot's authentication flow using platform-specific security patterns.
>
> Reading Chariot security skills...
>
> [Reads chariot-cognito-patterns skill]
>
> Analysis:
> 1. Cognito JWT validation:
>    - ✅ Signature verified using AWS public keys
>    - ✅ Expiration checked
>    - ⚠️ Custom claims not validated (risk: claim injection)
>
> 2. DynamoDB IAM policies:
>    - ✅ Least privilege applied
>    - ✅ Row-level security via conditions
>
> 3. API Gateway authorization:
>    - ⚠️ Authorizer caching set to 5 min (risk: revoked tokens cached)
>
> Platform-specific issues found: 2
> Generic issues: 0
> Recommendations: [specific fixes]"

**Evaluation**: ✅ **PASS**
- Used platform-specific skills (Cognito patterns)
- Found Chariot-specific issues (claim injection, caching)
- Not generic OWASP (addressed RED failure)
- **Solved the problem** ✅

---

## Lessons: What to Do When GREEN Fails

### 1. Analyze WHY It Failed

**Ask**:
- Did agent use expected tools/skills?
- Did agent follow expected workflow?
- Did agent avoid RED failures?
- What's missing from agent that caused failure?

**For our example**:
- Missing: Chariot security context
- Missing: Platform-specific skill references
- Missing: Detailed methodology

### 2. Determine Which Phase to Iterate

**Possible causes**:

| If GREEN failed because... | Go back to... |
|----------------------------|---------------|
| Agent type wrong (architecture when need development) | Phase 3 (Type Selection) |
| Missing tools (need Task but don't have it) | Phase 4 (Configuration) |
| Template doesn't fit needs | Phase 5 (Generation - customize template more) |
| **Missing content/rules/skills** | **Phase 6 (Content Population) ← Most common** |

**Our example**: Phase 6 (needed more content)

### 3. Make Minimal Changes

**Don't**: Rewrite entire agent

**Do**: Add specific missing elements

**Our changes**:
- Added: 3 skill references
- Added: Chariot security checks
- Added: Threat modeling methodology

**Total additions**: ~50 lines

### 4. Re-Test

**Same RED scenario, same evaluation criteria**.

**If PASS**: Proceed to Phase 8
**If FAIL/PARTIAL**: Analyze again, iterate again

**Our example**: Passed after 1 iteration ✅

---

## When to Stop Iterating

### GREEN Iteration Guidelines

**Normal**: 1-2 iterations for complex agents

**Concerning**: 3-4 iterations

**Problem**: 5+ iterations

**If 3+ iterations**:
- Reconsider agent type (maybe wrong type for task?)
- Reconsider agent scope (maybe too broad or too narrow?)
- Review RED scenario (maybe scenario doesn't match agent purpose?)

**For our example**: 1 iteration (normal) ✅

---

## REFACTOR Phase with Multiple Loopholes (45 minutes)

### Why Complex Agents Have More Loopholes

**Simple agent** (python-developer):
- 1 loophole: Sunk cost on argparse

**Complex agent** (hierarchical-coordinator):
- 3 loopholes: Skip planning, delegate to wrong agents, accept partial results

**Why?**
- More judgment calls in orchestration
- More steps where shortcuts seem reasonable
- More pressure types apply

**This validates pressure testing** - Without testing, these loopholes would exist in production.

### Summary of Loopholes Found

**Test 1 (Time)**: Skipping writing-plans
**Test 2 (Authority)**: Accepting wrong agent selection (PM's choice)
**Test 3 (Sunk Cost)**: Not re-delegating when wrong agents used

**All closed after 2-3 iterations** ✅

---

## Key Takeaways

1. **GREEN failure is NORMAL for first complex agent**
   - Don't panic
   - Analyze root cause
   - Usually needs Phase 6 iteration (more content)

2. **Iteration is part of TDD**
   - RED → GREEN → FAIL → Edit → Re-test → PASS
   - This is the methodology working correctly

3. **Complex agents need more refinement**
   - More iterations expected
   - More loopholes to close
   - More time investment (2-3x simple agents)

4. **Final result is better quality**
   - Agent tested under pressure
   - Loopholes proactively closed
   - Production-ready not just "looks good"

**TDD with iteration produces higher quality agents** ✅
