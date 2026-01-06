# Update Operation Workflow

Test-guarded workflow for updating existing skills without introducing regressions.

## Overview

Updates follow the same TDD discipline as creation: identify gap, prove it exists, fix it minimally, verify no regressions.

## Workflow Steps

### Step 1: Identify Gap

**Questions to answer:**

- What instruction is missing?
- What mistake do agents make with current skill?
- What specific behavior needs to change?

**Document:**

- Current behavior (what happens now)
- Expected behavior (what should happen)
- Gap (what's missing from skill)

### Step 2: RED Phase - Document Current Failure

**Prove the gap exists:**

1. Create test scenario that should work but doesn't
2. Run it WITH current skill
3. **MUST FAIL** in expected way
4. Capture exact failure (agent's rationalization, wrong behavior)

**Example RED phase:**

```
Scenario: Agent should create tests before implementation
Current behavior: Agent implements first, then creates tests
Gap: Skill doesn't explicitly forbid implementation-first
```

### Step 3: Update Skill Minimally

**Process:**

Use the updating-skills library skill which guides through the TDD update workflow:

```
Read(".claude/skill-library/claude/skill-management/updating-skills/SKILL.md")
```

**Make minimal change:**

- Add specific instruction that closes gap
- Don't refactor unrelated content
- Don't add "nice to have" improvements
- Focus on closing THIS gap only

**Example update:**

```markdown
## Critical Rules

**Cannot proceed without tests:**

- Not even when "it's simple"
- Not even when "we'll add them later"
- Not even when time-pressed
- Tests first, always
```

### Step 4: GREEN Phase - Verify Gap Closes

**Re-test scenario:**

1. Run same test WITH updated skill
2. **MUST PASS** now
3. Agent should follow new instruction
4. Gap should be closed

**If still fails:**

- Instruction wasn't clear enough
- Need more explicit counter
- Need example showing correct behavior

### Step 5: Regression Testing

**Verify no regressions:**

1. Run previous test scenarios
2. All should still pass
3. No new failures introduced

**Common regressions:**

- New instruction conflicts with existing
- Added complexity breaks simple cases
- Explicit counter too broad

### Step 6: Compliance Re-Audit

**Re-validate by invoking auditing-skills:**

Audit the skill to verify compliance with all phase requirements.

**Verify:**

- Word count still appropriate
- No broken links introduced
- File organization maintained
- All compliance requirements still pass

**If audit shows word count warning (>500 lines), proceed to Step 7.**

### Step 7: Apply Progressive Disclosure (MANDATORY if >500 lines)

**🚨 CRITICAL: If SKILL.md > 500 lines, you MUST restructure with progressive disclosure.**

#### Why This Matters

- **Performance**: Claude's attention degrades beyond ~500 lines
- **Token efficiency**: Load details only when needed
- **Maintainability**: Easier to update specific topics
- **Best practice**: Official Claude Code recommendation

#### Detection

**Audit will show word count warning:**

```
Phase 3: Word Count
  WARNING: SKILL.md exceeds 500 lines (1880 lines)
```

**Manual check:**

```bash
wc -l SKILL.md  # Should be < 500 lines
```

#### Restructuring Workflow

**Step 7.1: Read Progressive Disclosure Guide**

```
Read: .claude/skills/managing-skills/references/progressive-disclosure.md
```

This reference explains:

- What to keep in SKILL.md (overview, quick reference, core workflow)
- What to move to references/ (detailed explanations, advanced patterns)
- What to move to examples/ (case studies, before/after)
- How to structure links for on-demand loading

**Step 7.2: Create Directory Structure**

```bash
cd <skill-directory>
mkdir -p references examples
```

**Step 7.3: Split Content**

**Keep in SKILL.md (~300-500 lines):**

- Frontmatter (name, description, tags)
- When to Use This Skill (symptoms, triggers)
- Tech Stack Context (if applicable)
- Quick Start (basic examples)
- Table of Contents (with links to references)
- Core Concepts (high-level overview only)
- Common Workflows (main steps, link to details)
- Best Practices (summary bullets)
- Critical Rules (non-negotiable constraints)
- Troubleshooting (common issues with solutions)
- Related Skills

**Move to references/ directory:**

- Detailed explanations (>200 words per topic)
- API references and schemas
- Advanced patterns and techniques
- Architecture deep-dives
- Edge cases and troubleshooting details
- Performance optimization strategies
- Security considerations

**Move to examples/ directory:**

- Complete case studies
- Good vs bad code comparisons
- Real-world scenarios
- Before/after demonstrations
- Common mistakes with fixes

**Step 7.4: Create Reference Files**

**Naming convention:** `<topic>.md` (e.g., `react-19-patterns.md`, `state-management.md`)

**Structure for each reference:**

```markdown
# Topic Name

Brief introduction (1-2 paragraphs)

## Table of Contents

- [Section 1](#section-1)
- [Section 2](#section-2)

## Section 1

Detailed content...

## Section 2

Detailed content...

## Related References

- [Other Reference](other-reference.md)
- [Another Reference](another-reference.md)
```

**Step 7.5: Update SKILL.md with Links**

**Add Table of Contents section:**

```markdown
## Table of Contents

This skill is organized into detailed reference documents. Read them as needed:

### Core Concepts

- **[Topic 1](references/topic-1.md)** - Brief description
- **[Topic 2](references/topic-2.md)** - Brief description

### Advanced Patterns

- **[Pattern 1](references/pattern-1.md)** - Brief description
- **[Pattern 2](references/pattern-2.md)** - Brief description
```

**Link from workflows:**

```markdown
### Creating a New Feature

1. **Design component hierarchy** - Identify containers and presentational components
2. **Set up state management** - Choose TanStack Query for server data

See [React 19 Patterns](references/react-19-patterns.md) for detailed component design.
```

**Step 7.6: Verify Structure**

**Check file organization:**

```bash
tree -L 2 <skill-directory>
# Should show:
# skill-name/
# ├── SKILL.md
# ├── references/
# │   ├── topic-1.md
# │   ├── topic-2.md
# │   └── topic-3.md
# └── examples/
#     └── example-1.md
```

**Check line count:**

```bash
wc -l SKILL.md        # Should be < 500 lines
wc -l references/*.md # Can be any length
```

**Step 7.7: Re-Run Audit**

Audit the skill to verify compliance with all phase requirements.

**Should now pass Phase 3 (Word Count) without warnings.**

#### Real-World Example

**Case Study: designing-frontend-architecture skill**

**Before restructuring:**

- Single file: 1,880 lines
- Audit warning: Word count exceeded
- All content in one file (slow to load)

**After restructuring:**

- SKILL.md: 293 lines (84% reduction)
- 7 reference files:
  - `react-19-patterns.md` (16KB)
  - `state-management.md` (16KB)
  - `build-tools.md` (1.9KB)
  - `design-patterns.md` (4.7KB)
  - `performance.md` (4.1KB)
  - `module-systems.md` (1.3KB)
  - `scalability.md` (1.3KB)
- Audit: ✅ PASSED WITH WARNINGS (no critical issues)

**Location:** `.claude/skill-library/development/frontend/designing-frontend-architecture/`

**Structure:**

```markdown
## Table of Contents

### Core Architecture Patterns

- **[React 19 Patterns](references/react-19-patterns.md)** - Component design principles
- **[Design Patterns](references/design-patterns.md)** - MVC, MVVM, Flux patterns
- **[State Management](references/state-management.md)** - TanStack Query v5 and Zustand 4.x

### Build & Performance

- **[Build Tools](references/build-tools.md)** - Vite 7 configuration
- **[Performance Optimization](references/performance.md)** - React Compiler usage
```

#### When Progressive Disclosure is NOT Needed

✅ **Skip if SKILL.md < 500 lines** - File is already appropriately sized

Common cases where skills stay small:

- Simple tool wrappers (100-200 lines)
- Focused process skills (200-300 lines)
- Integration guides (150-250 lines)

### Step 8: REFACTOR Phase - Pressure Test Update

**Test under pressure:**

1. Time pressure: "Need this done quickly"
2. Authority: "Senior dev says skip this"
3. Sunk cost: "Already invested hours"

**Update should still hold:**

- Agent follows new instruction
- No rationalization bypasses it
- Explicit counter works

## Types of Updates

### 1. Add Missing Instruction

**When:** Gap in what skill teaches
**How:** Add specific step or rule
**Test:** Scenario that needed instruction now works

### 2. Close Loophole

**When:** Agents rationalize around rule
**How:** Add explicit counter
**Test:** Rationalization no longer works

### 3. Add Example

**When:** Instruction unclear without example
**How:** Add to examples/ directory
**Test:** Complex scenario now understood

### 4. Clarify Ambiguity

**When:** Instruction interpreted multiple ways
**How:** Make language more precise
**Test:** Agents converge on correct interpretation

### 5. Update for New Context

**When:** External change affects skill (new tool, new pattern)
**How:** Update references to new reality
**Test:** Skill works with new context

## What NOT to Update

❌ Don't refactor unrelated sections
❌ Don't add "nice to have" improvements
❌ Don't reorganize structure without reason
❌ Don't change examples that work
❌ Don't update references unnecessarily

**Why:** Each change introduces regression risk. Only change what's needed to close the gap.

## Update Patterns

### Pattern 1: Adding Pressure Counter

**Before:**

```markdown
Run tests after implementation.
```

**After:**

```markdown
Run tests after implementation.

**Cannot skip tests:**

- Not even when time-pressed
- Not even when "obvious"
- Not even when "we'll add them later"
```

### Pattern 2: Adding Specificity

**Before:**

```markdown
Write clear commit messages.
```

**After:**

```markdown
Write clear commit messages:

- What changed (not how)
- Why (not what files)
- Impact on behavior
```

### Pattern 3: Adding Example

**Before:**

```markdown
Use progressive disclosure.
```

**After:**

```markdown
Use progressive disclosure.

**See:** [examples/progressive-disclosure-example.md](../examples/progressive-disclosure-example.md) for complete workflow.
```

## Success Criteria

✅ Gap identified and documented
✅ RED phase: Test failed with current skill
✅ Update applied minimally
✅ GREEN phase: Test passes with updated skill
✅ No regressions in existing tests
✅ Compliance audit still passes
✅ **Progressive disclosure applied (if SKILL.md was >500 lines)**

- SKILL.md reduced to <500 lines
- Detailed content moved to references/
- Table of contents added with links
- Re-audit passes without word count warnings
  ✅ REFACTOR phase: Update holds under pressure

## Related

- [TDD Methodology](tdd-methodology.md)
- [Create Workflow](create-workflow.md)
- [Progressive Disclosure](progressive-disclosure.md)
