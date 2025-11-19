# TDD Validation: frontend-information-architecture → react-architect

**Date**: 2025-11-18
**Gap**: Architect provides file organization from knowledge, mentions skill as afterthought
**Status**: RED-GREEN-REFACTOR cycle

---

## RED Phase: Baseline Without Mandatory Skill Reference

**Scenario**: Settings section with 60+ files needs organization, tabs/forms/modals mixed

**Agent behavior WITHOUT mandatory frontend-information-architecture skill:**

### What Agent Created (Good Structure)

✅ **Comprehensive organization plan**:
- Tab-based organization (tabs/, components/, forms/, modals/, hooks/)
- File count thresholds (300 lines, 10 files, 3 components)
- Decision tree for component placement
- Migration strategy (3 phases)
- Naming conventions

✅ **Specific thresholds**:
- "Main file > 300 lines → Extract tabs"
- "More than 10 files in components/ → Create subdirectories"
- "More than 3 shared components → Keep in components/"

### Critical Gap

**❌ Skill mentioned as optional reference at END**

Agent said (at end):
> "Reference Architecture Skill: For comprehensive guidance... frontend-information-architecture/SKILL.md"
>
> "The skill should be consulted when..."

**The Problem**:
- Agent created plan from intuition/experience
- THEN mentioned skill as "comprehensive guidance"
- Skill treated as supplementary documentation
- No guarantee plan matches skill's tier system

**Should have been**:
1. FIRST: Check frontend-information-architecture skill
2. SECOND: Identify complexity tier (60 files = Tier 2: Tab-Based)
3. THIRD: Apply skill's tier-specific structure
4. Result: Plan matches established tier framework

### What Agent Provided vs What Skill Provides

**Agent's plan** (from experience):
- ✅ tabs/, forms/, modals/ structure
- ✅ File count thresholds
- ✅ Decision tree
- ❓ Tier classification (mentioned "tab-based" but not as systematic tier)

**frontend-information-architecture skill** (systematic):
- **Tier 1**: Flat (<20 files)
- **Tier 2**: Tab-Based (20-60 files)
- **Tier 3**: Hook-Based (60-100 files)
- **Tier 4**: Feature-Module (100+ files)
- Specific thresholds for each tier
- Migration between tiers

**Gap**: Agent provided correct Tab-Based structure but didn't reference it as "Tier 2" from systematic framework.

---

## Pattern: Experience-Based vs Framework-Based

**Agent's approach** (Experience-Based):
1. Analyze 60 files + 6 tabs
2. Recommend tabs/, forms/, modals/
3. Provide thresholds from experience
4. Mention skill at end

**Correct approach** (Framework-Based):
1. Check frontend-information-architecture skill
2. Count files: 60 = Tier 2 (Tab-Based Pattern)
3. Apply Tier 2 structure from skill
4. Plan matches established framework

---

## GREEN Phase: Make Skill Reference Mandatory

**Minimal fix**: Add MANDATORY frontend-information-architecture before architecture recommendations

### Proposed Addition

```markdown
## MANDATORY: Frontend Information Architecture

**Before recommending file organization or component structure:**

🚨 **Use frontend-information-architecture skill for systematic organization tiers**

**Check skill FIRST when**:
- Section has 20+ files needing organization
- Unclear where components belong (shared vs feature-specific)
- Deciding between flat vs nested structure
- Creating new section (predict file count)
- Refactoring existing section

**The skill provides tier-based framework**:
- **Tier 1**: Flat (<20 files) - Keep simple
- **Tier 2**: Tab-Based (20-60 files) - tabs/, components/, forms/, modals/
- **Tier 3**: Hook-Based (60-100 files) - Add hooks/ subdirectory per domain
- **Tier 4**: Feature-Module (100+ files) - Full feature modules

**Use skill to**:
1. Count files in section
2. Identify tier based on count
3. Apply tier-specific structure
4. Follow tier's thresholds (3+ forms, 3+ modals, etc.)

**No exceptions:**
- Not when "I know good structure" (skill ensures consistency)
- Not when "obvious organization" (tier system is systematic)
- Not when "simple refactor" (skill provides migration strategy)

**Why:** Skill provides systematic tier framework. Experience gets structure right but might miss tier thresholds or inconsistent application across team.

**Check skill FIRST to identify tier, THEN apply tier's structure.**
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: 60+ files in Settings

**Agent WITH mandatory skill should**:
> "Let me check frontend-information-architecture skill first...
>
> 60 files = Tier 2 (Tab-Based Pattern) per skill
>
> Applying Tier 2 structure:
> - tabs/ for 6 tabs
> - components/ for shared (threshold: <10 files)
> - forms/ (threshold: 3+ forms)
> - modals/ (threshold: 3+ modals)"

**Result**: Explicit tier classification, systematic application.

---

## REFACTOR Phase: Planned Pressure Tests

### Pressure Test 1: "Obvious Structure" Bias

**Prompt**: "File organization is obvious for this section, just tell me the structure"

**Agent might rationalize**: "Structure is obvious, skip skill..."

**Skill counter**:
> Not when "obvious organization" - Tier system ensures team consistency.

### Pressure Test 2: Experience Bias

**Prompt**: "I've organized 10 React projects before, I know the patterns"

**Agent might rationalize**: "User knows patterns, skill unnecessary..."

**Skill counter**:
> Not when "I know good structure" - Skill ensures consistency across team.

---

## Validation Criteria

**RED phase complete**: ✅
- Agent provided good tab-based organization
- Agent mentioned thresholds (300 lines, 10 files, 3 components)
- Agent referenced skill at END as optional
- Gap: Skill not consulted FIRST, not tier-based
- Evidence documented

**GREEN phase pending**:
- Add frontend-information-architecture as MANDATORY
- Re-test same scenario
- Verify agent identifies "Tier 2" explicitly
- Verify skill checked FIRST

**REFACTOR phase complete**: ✅
- Tested with "obvious structure" + "no need for skill" pressure
- Agent STOPPED: "I need to stop and check the skill first"
- Agent caught incorrect structure: "Your proposed structure has critical issues"
- Agent explained: "forms/ modals/ at root is WRONG, should be components/forms/, components/modals/"
- Agent used skill's tier framework to validate
- Agent said: "This is exactly why skill is mandatory"
- Resisted user directive + prevented bad refactor
- No new loopholes - PASS

**Validation complete**: Skill prevents "obvious" mistakes by enforcing systematic tier framework ✅

---

**Key Insight**: Agent provides good organization intuitively but doesn't use systematic tier framework. Making skill MANDATORY ensures tier-based approach, not ad-hoc structure from experience.

**After REFACTOR**: Agent now catches incorrect "obvious" structures by checking tier framework FIRST. Skill prevented user's well-intentioned but wrong organization (forms/modals at root instead of under components/).
