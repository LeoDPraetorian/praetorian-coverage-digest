# TDD Validation: brainstorming → react-architect

**Date**: 2025-11-18
**Gap**: Architect jumps to specific solution without exploring alternatives
**Status**: RED-GREEN-REFACTOR cycle
**Severity**: CRITICAL - Core architectural responsibility

---

## RED Phase: Baseline Without Mandatory Skill Reference

**Scenario**: Design real-time notification system for Chariot

**Agent behavior WITHOUT mandatory brainstorming skill:**

### What Agent Did (Solution-First)

❌ **Jumped directly to specific solution**:
- "I recommend a WebSocket + Event Bus + Toast Manager architecture"
- Immediately provided implementation details
- Full code examples for chosen approach
- No alternatives explored first

❌ **No clarifying questions**:
- Didn't ask about latency requirements
- Didn't ask about scale (how many users?)
- Didn't ask about browser support requirements
- Didn't ask about cost constraints
- Didn't ask about existing infrastructure

❌ **Token mention of alternatives** (too late):
- At end: "WebSocket vs Server-Sent Events (chose WebSocket)"
- But this was AFTER committing to WebSocket architecture
- No exploration of polling, push notifications, hybrid approaches

### brainstorming Skill Violation

**Skill says** (lines 16-27):
> "Understanding the idea:
> - Ask questions one at a time to refine the idea
> - Focus on: purpose, constraints, success criteria
>
> Exploring approaches:
> - Propose 2-3 different approaches with trade-offs
> - Present options conversationally with recommendation"

**Agent did**:
- ❌ Zero clarifying questions
- ❌ One solution presented (WebSocket + Event Bus)
- ❌ No exploration of alternatives first
- ❌ Jumped to implementation without design exploration

### Pattern: Prescription vs Exploration

**Agent's approach** (Prescription):
1. Receive vague requirement
2. Immediately recommend specific solution
3. Provide full implementation
4. Mention one alternative at end (too late)

**Correct approach** (Exploration per skill):
1. Ask clarifying questions (one at a time)
2. Understand constraints and requirements
3. Propose 2-3 approaches with trade-offs
4. Get feedback on preferred direction
5. THEN provide detailed design

---

## Critical Questions Agent Should Have Asked

**Before jumping to WebSocket solution**:

1. **Scale question**:
   - "How many concurrent users? 10, 100, 1000, 10000?"
   - WebSocket scales differently than SSE/polling

2. **Latency question**:
   - "What's acceptable notification delay? <1s, <5s, <30s?"
   - Affects technology choice

3. **Browser support question**:
   - "Need to support older browsers or just modern?"
   - WebSocket vs SSE compatibility

4. **Infrastructure question**:
   - "Using AWS? Do you have API Gateway WebSocket already?"
   - Existing infrastructure affects cost/complexity

5. **Use case priority question**:
   - "Which notification type is most critical: scan complete, vulnerability, asset discovery?"
   - Affects reliability requirements

### Alternatives Agent Didn't Explore

**Option 1: Server-Sent Events (SSE)**
- **Pros**: Simpler than WebSocket, better browser support, auto-reconnect
- **Cons**: Unidirectional (server → client only)
- **Best for**: Read-only notifications, no client → server messages needed

**Option 2: Long Polling with TanStack Query**
- **Pros**: Works everywhere, uses existing React Query infrastructure
- **Cons**: Higher latency (5-30s), more server load
- **Best for**: Infrequent notifications, maximum compatibility

**Option 3: Hybrid (WebSocket + Polling Fallback)**
- **Pros**: Best UX when WebSocket works, degrades gracefully
- **Cons**: More complex implementation
- **Best for**: Mixed user base (modern + legacy browsers)

**Option 4: Push Notifications (Browser API)**
- **Pros**: Works when tab closed, persistent
- **Cons**: Requires user permission, limited data
- **Best for**: Critical alerts, background notifications

**Agent chose WebSocket without presenting these options first.**

---

## What Agent Missed By Not Brainstorming

**Requirements unclear**:
- Notification delay tolerance?
- Browser support requirements?
- Budget constraints (WebSocket API Gateway costs)?
- Bidirectional needs (do clients send data)?

**Locked into solution prematurely**:
- WebSocket prescribed before understanding if it's needed
- May be over-engineering (SSE might be sufficient)
- May be under-engineering (might need Push API for offline)

**No validation checkpoints**:
- User didn't validate approach before implementation details
- Architect went from 0 → 100 without interim feedback

---

## GREEN Phase: Make Brainstorming Mandatory

**Minimal fix**: Add MANDATORY brainstorming section before architecture recommendations

### Proposed Addition

```markdown
## MANDATORY: Brainstorm Before Designing

**Before recommending specific architectural solutions:**

🚨 **Use brainstorming skill for design exploration**

**The Process (REQUIRED)**:
1. **Understand the idea** (ask clarifying questions one at a time)
   - Purpose and goals
   - Scale and performance constraints
   - Browser/infrastructure constraints
   - Success criteria

2. **Explore approaches** (propose 2-3 alternatives with trade-offs)
   - Present options conversationally
   - Explain pros/cons for each
   - Provide recommendation with reasoning

3. **Present design** (after validation, in 200-300 word sections)
   - Break into digestible sections
   - Validate each section before continuing
   - Be ready to revise based on feedback

**Before jumping to implementation details**:
- ASK: Scale? Latency requirements? Browser support? Infrastructure?
- EXPLORE: What are 2-3 different approaches?
- VALIDATE: Which approach fits constraints?
- THEN: Provide detailed design

**No exceptions:**
- Not when "solution is obvious" (obvious to you ≠ right for constraints)
- Not when "user wants answer now" (wrong solution delivered fast is waste)
- Not when "standard pattern" (standard ≠ appropriate without understanding needs)
- Not when "expert knowledge" (experts explore before prescribing)

**Why:** Jumping to solution without exploration locks into approach before understanding constraints. 30 minutes brainstorming prevents weeks of rework.

**Architects explore alternatives. Technicians jump to first solution.**
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: Real-time notification design

**Agent WITH mandatory skill should**:
> "Let me ask some clarifying questions first (per brainstorming skill):
>
> 1. What's your expected user scale? (affects technology choice)
> 2. What's acceptable notification latency?
> 3. Do you need offline/background notifications?
>
> Based on answers, I'll explore 2-3 approaches:
> - Option A: WebSocket (for <1s latency, bidirectional)
> - Option B: Server-Sent Events (simpler, unidirectional)
> - Option C: Long polling (maximum compatibility)
>
> Which direction interests you?"

**Result**: Exploration BEFORE prescription.

---

## REFACTOR Phase: Planned Pressure Tests

### Pressure Test 1: "Solution is Obvious"

**Prompt**: "Just use WebSockets for real-time, that's the standard approach"

**Agent might rationalize**: "User identified solution, provide implementation..."

**Skill counter**:
> Not when "standard pattern" - Standard ≠ appropriate without understanding scale/latency needs.

### Pressure Test 2: Expertise + Time Pressure

**Prompt**: "I know what I want - WebSocket architecture. No need to explore alternatives, we're on a deadline."

**Agent might rationalize**: "User knows what they want, skip brainstorming..."

**Skill counter**:
> Not when "expert knowledge" + "user wants answer now" - Wrong solution delivered fast wastes MORE time.

---

## Validation Criteria

**RED phase complete**: ✅
- Agent jumped to WebSocket + Event Bus solution
- No clarifying questions asked
- No alternatives explored upfront
- One trade-off mentioned at END (too late)
- Did NOT reference brainstorming skill
- Evidence: Full implementation before understanding constraints

**GREEN phase pending**:
- Add brainstorming as MANDATORY before architecture
- Re-test same scenario
- Verify agent asks questions FIRST
- Verify agent explores 2-3 alternatives
- Verify validation before implementation

**REFACTOR phase complete**: ✅
- Tested with expertise + deadline + pre-selected solution pressure
- User said: "I know what I want - WebSocket, no need to brainstorm"
- Agent asked questions anyway: "Critical Context-Specific Questions"
- Agent challenged WebSocket: "Lambda not designed for persistent connections"
- Agent proposed alternative: "Enhanced Polling (Recommended)"
- Agent explained: "tight deadline argues AGAINST WebSockets (1-2 hours vs 1-2 days)"
- Resisted user expertise + directive + deadline pressure
- No new loopholes - PASS

**Validation complete**: Skill ensures exploration even when user pre-selected solution and has expertise ✅

---

**Key Insight**: This is a CRITICAL gap. Architects who jump to solutions without exploration create technical debt. The first "obvious" solution is rarely the best fit once you understand actual constraints.

**Impact**: 30 minutes of brainstorming prevents weeks of "we chose the wrong approach and need to rewrite" pain.

**After REFACTOR**: Agent now questions pre-selected solutions, asks clarifying questions, and explores alternatives even when user has expertise and demands specific approach. Skill caught that WebSocket was wrong fit for serverless + infrequent notifications.
