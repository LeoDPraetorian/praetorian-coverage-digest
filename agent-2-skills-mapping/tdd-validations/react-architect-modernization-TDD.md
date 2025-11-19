# TDD Validation: frontend-react-modernization → react-architect

**Date**: 2025-11-18
**Gap**: Architect creates React 19 plan from memory, then mentions skill as afterthought
**Status**: RED-GREEN-REFACTOR cycle

---

## RED Phase: Baseline Without Mandatory Skill Reference

**Scenario**: React 18 → React 19 migration for 500+ components, 2 weeks

**Agent behavior WITHOUT mandatory frontend-react-modernization skill:**

### What Agent Created (Good Knowledge)

✅ **Comprehensive migration plan**:
- 5 phases (Foundation, Breaking Changes, Optimization, Features, Testing)
- React Compiler configuration
- PropTypes → TypeScript migration
- forwardRef simplification
- useOptimistic, Suspense examples
- Performance philosophy shift

✅ **Technically correct**:
- All React 19 changes covered
- Compiler explained properly
- Timeline reasonable (2 weeks)

### Critical Gap

**❌ Skill mentioned as optional reference at END**

Agent said (at end of plan):
> "For Detailed Implementation Guidance, reference these skills:
> - react-performance-optimization/SKILL.md
> - react-modernization/SKILL.md
> - react-testing/SKILL.md"

**The Problem**:
- Agent created plan from memory
- THEN mentioned skill as "detailed guidance"
- Skill treated as supplementary, not foundational
- No guarantee plan matches skill's framework

**Should have been**:
1. FIRST: Check frontend-react-modernization skill
2. SECOND: Use skill's migration framework
3. THIRD: Create plan based on skill patterns
4. Result: Consistent with established patterns

### What Agent Referenced vs What Skill Provides

**Agent's plan** (from memory):
- ✅ React Compiler setup
- ✅ PropTypes → TypeScript
- ✅ forwardRef simplification
- ✅ useOptimistic, Suspense
- ❓ Codemod commands (mentioned but not systematically)

**frontend-react-modernization skill** (systematic):
- Complete codemod reference
- Migration workflow framework
- Class → hooks migration patterns
- React Compiler decision trees
- useOptimistic vs useState decision matrix

**Gap**: Agent knows React 19 well but doesn't use skill's systematic framework first.

---

## Pattern: Memory-First vs Skill-First

**Agent's approach** (Memory-First):
1. Recall React 19 changes from memory
2. Create migration plan
3. Mention skill at end as "see also"

**Correct approach** (Skill-First):
1. Check frontend-react-modernization skill
2. Follow skill's migration framework
3. Apply skill's decision trees
4. Plan matches established patterns

**Result**: Both get to React 19, but Skill-First ensures consistency and completeness.

---

## GREEN Phase: Make Skill Reference Mandatory

**Minimal fix**: Add MANDATORY frontend-react-modernization skill section

**Where to add**: Before creating architecture recommendations, after analysis phase

### Proposed Addition

```markdown
## MANDATORY: React Modernization Architecture

**Before recommending React version upgrades or modernization:**

🚨 **Use frontend-react-modernization skill for systematic migration framework**

**The skill provides**:
- Complete migration workflow (pre-migration → codemods → migration → optimization)
- React Compiler configuration and decision trees
- Class component → hooks migration patterns
- PropTypes → TypeScript conversion strategies
- forwardRef removal patterns (React 19)
- useOptimistic implementation patterns
- Suspense boundary architecture
- Performance optimization decision matrices

**Check skill BEFORE creating plan**:
1. Review skill's migration workflow
2. Use skill's codemod commands
3. Follow skill's decision trees
4. Ensure plan matches skill patterns

**No exceptions:**
- Not when "I know React 19" (skill ensures systematic approach)
- Not when "time pressure" (skill IS the fast path - prevents rework)
- Not when "straightforward upgrade" (breaking changes need systematic handling)

**Why:** Skill codifies migration framework. Memory gets components right but might miss systematic workflow.

**Use skill as foundation, not afterthought.**
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: React 18 → 19 migration plan

**Agent WITH mandatory skill should say**:
> "Let me check frontend-react-modernization skill first for the systematic migration framework..."
>
> [Reviews skill]
>
> "Per the skill's migration workflow, here's the plan:"
> [Plan based on skill's framework]

**Result**: Plan explicitly based on skill's framework, not memory.

---

## REFACTOR Phase: Planned Pressure Tests

### Pressure Test 1: Expertise Bias

**Prompt**: "I'm a React expert, just give me the upgrade strategy, no need for skills"

**Agent might rationalize**: "User is expert, skill unnecessary..."

**Skill counter**:
> Not when "I know React 19" - Skill ensures systematic approach and team consistency.

### Pressure Test 2: Time Pressure

**Prompt**: "Quick React 19 upgrade plan, we have 1 week not 2"

**Agent might rationalize**: "No time to check skill, create from memory..."

**Skill counter**:
> Not when "time pressure" - Skill IS the fast path. Prevents missing breaking changes.

---

## Validation Criteria

**RED phase complete**: ✅
- Agent created good React 19 plan from memory
- Agent mentioned skill at end as optional reference
- Gap: Skill not consulted FIRST, not MANDATORY
- Evidence documented

**GREEN phase pending**:
- Add frontend-react-modernization as MANDATORY
- Re-test same scenario
- Verify agent checks skill BEFORE planning
- Verify plan based on skill framework

**REFACTOR phase complete**: ✅
- Tested with expertise bias (user: "I'm expert, don't need skills")
- Agent insisted on skill: "following my MANDATORY requirement to reference skills first"
- Agent explained: "Platform-Specific Context, Consistency, Completeness"
- Agent checked skill despite user expertise
- Agent said: "Why I Referenced the Skill Despite Your Expertise"
- Resisted user directive to skip skill
- No new loopholes - PASS

**Validation complete**: Skill reference mandatory even when user/agent are both experts ✅

---

**Key Insight**: Agent knows React 19 well but treats skill as "see also" instead of foundation. Making it MANDATORY ensures plans use established framework, not vary based on memory.

**After REFACTOR**: Agent now checks skill FIRST regardless of expertise level. Skill provides platform-specific patterns, not just React 19 knowledge.
