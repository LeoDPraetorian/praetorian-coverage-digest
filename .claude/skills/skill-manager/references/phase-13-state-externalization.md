# Phase 13: State Externalization Audit

## What It Checks

**Complex skill detection:**
- Section count: ≥5 H2 headers indicates multi-step process
- Workflow keywords: systematic, protocol, workflow, phase, checklist, step-by-step
- Word count: >1500 words suggests comprehensive multi-step guidance
- Frontmatter override: `complexity: high` or `requires-state-tracking: true`

**TodoWrite mandate validation:**
- Strong mandate: MUST/REQUIRED/CRITICAL with TodoWrite
- Weak mandate: should/recommend/consider with TodoWrite
- Missing mandate: No TodoWrite references in skill body

**Complexity threshold:**
- Skill is complex if frontmatter override OR meets 2 of 3 heuristics

## Why It Matters

**Cognitive Offloading Prevents Context Drift**

Complex, multi-step workflows require external state tracking. Without TodoWrite mandates, agents:
- Forget completed steps in long workflows
- Experience context drift across phases
- Repeat work already done
- Skip critical verification steps
- Lose track of what remains

**Historical Evidence**: Skills with protocol-based workflows (debugging-systematically, developing-with-tdd) that mandate TodoWrite have 90%+ task completion rates. Skills without mandates show 60-70% completion with missed steps.

**The Problem**: Agents rely on conversation history for state. In multi-step processes (8+ steps), context window limits cause earlier steps to be forgotten. External state (TodoWrite) acts as short-term memory.

## Detection Patterns

### CRITICAL Issues

**1. Complex Skill Missing TodoWrite Mandate**
```markdown
# Skill has 7 sections, contains "protocol", 2100 words
# No mention of TodoWrite in body

**Issue**: Multi-step workflow without state tracking = guaranteed context drift
**Severity**: CRITICAL
**Impact**: Agents will forget steps, skip validations, repeat completed work
```

**2. Complex Skill with Weak Mandate**
```markdown
# Skill has 6 sections, contains "systematic", 1800 words
# Body says: "You should use TodoWrite to track progress"

**Issue**: Weak language (should) doesn't enforce discipline
**Severity**: WARNING
**Impact**: Agents treat as optional, skip under time pressure
```

### WARNING Issues

**1. Upgrade Weak to Strong Mandate**
```markdown
# Found: "You should use TodoWrite..."
# Should be: "You MUST use TodoWrite BEFORE starting..."

**Rationale**: Complex workflows require mandatory state tracking
```

### INFO Issues

**1. Simple Skill with Strong Mandate**
```markdown
# Skill has 2 sections, 600 words, no workflow keywords
# Body says: "You MUST use TodoWrite..."

**Issue**: TodoWrite adds overhead to simple, single-step tasks
**Severity**: INFO (not a compliance violation)
**Recommendation**: Consider if mandate is necessary for this skill
```

**2. Complexity Detection Metadata**
```markdown
# Provides transparency on why skill was flagged as complex
**Example**: Complexity detected: 8 sections (≥5 threshold), contains workflow keywords, 2200 words (>1500 threshold)
```

## Auto-Fix Capability

❌ **NOT auto-fixable** - requires semantic understanding:

**Why not auto-fixable:**
- Adding TodoWrite mandate requires understanding workflow structure
- Mandate placement depends on skill organization (after "When to Use"? In "Process"?)
- Explaining why TodoWrite is needed requires reasoning about cognitive load
- Example TodoWrite structure depends on skill's specific steps

**Solution**: Defer to `claude-skill-write` for manual remediation.

**What could be auto-detected:**
- Complexity score (heuristics)
- TodoWrite presence (regex)
- Mandate strength (pattern matching)

**What cannot be automated:**
- Writing appropriate mandate language
- Explaining context drift risk for specific workflow
- Creating example TodoWrite structure for skill
- Deciding optimal placement in skill document

## Examples

### Example 1: Compliant Complex Skill

**debugging-systematically (PASS):**
```markdown
## State Tracking

You MUST use TodoWrite BEFORE starting this debugging workflow.

**Why**: This is a 4-phase process (Investigation → Analysis → Hypothesis → Implementation). External state tracking prevents:
- Forgetting completed investigation steps
- Context drift between phases
- Repeating hypothesis tests already done
- Losing track of eliminated root causes

**TodoWrite Structure**:
1. Phase 1: Root Cause Investigation (status)
2. Phase 2: Pattern Analysis (status)
3. Phase 3: Hypothesis Testing (status)
4. Phase 4: Implementation & Validation (status)
```

**Complexity**: 8 sections, "protocol" keyword, 2400 words
**Mandate**: Strong (MUST use TodoWrite BEFORE)
**Result**: PASS ✅

### Example 2: Complex Skill Missing Mandate (CRITICAL)

**claude-skill-write (CRITICAL):**
```markdown
# Skill Content
## Overview
Progressive disclosure TDD workflow...

## The Process
1. Test Phase (RED)
2. Implementation Phase (GREEN)
3. Refactor Phase

[... 2500 words, 10 sections, "systematic" keyword ...]

# No TodoWrite mention anywhere
```

**Issues Detected**:
- [CRITICAL] Complex skill missing TodoWrite mandate (Reasons: 10 sections, contains workflow keywords, 2500 words)
- [INFO] Add mandate: "You MUST use TodoWrite before starting to track all steps"
- [INFO] Complexity detected: 10 sections (≥5 threshold), contains workflow keywords, 2500 words (>1500 threshold)

**Fix Required**: Add State Tracking section with MUST mandate

### Example 3: Weak Mandate (WARNING)

**workflow-executor (WARNING):**
```markdown
## Tracking Progress

You should use TodoWrite to keep track of completed tasks.

This helps maintain awareness of what's been done.
```

**Issues Detected**:
- [WARNING] Complex skill has weak TodoWrite mandate (found: "You should use TodoWrite")
- [INFO] Upgrade to strong mandate: Replace "should" with "MUST"

**Fix Required**: Change "should use" → "MUST use BEFORE starting"

### Example 4: False Positive (Frontmatter Override)

**reference-documentation-skill (INFO):**
```markdown
---
name: reference-documentation-skill
complexity: low
---

# Has 8 sections (examples), 2000 words, but no workflow
```

**Issues Detected**: None (frontmatter override respected)

## Complexity Detection Heuristics

### Heuristic Thresholds

**Section Count**: ≥5 H2 headers
- Rationale: 5+ sections typically indicates multi-phase process
- Counting method: `(content.match(/^## /gm) || []).length`
- Example: Overview, Process Step 1, Step 2, Step 3, Step 4, Verification = 6 sections

**Workflow Keywords**: Case-insensitive presence
- Pattern: `/\b(systematic|protocol|workflow|phase|checklist|step-by-step)\b/i`
- Rationale: These words signal structured, multi-step processes
- Examples: "systematic debugging", "protocol-based workflow", "phase 1, phase 2"

**Word Count**: >1500 words
- Rationale: Comprehensive guidance requires length; simple skills are <1000 words
- Counting method: `content.split(/\s+/).length`
- Note: Includes code blocks (intentional - complex code examples indicate complexity)

**Complexity Threshold**: 2 of 3 criteria
- Must meet at least 2 heuristics to be flagged as complex
- Prevents single-heuristic false positives
- Example: 6 sections + "protocol" keyword = complex (even if 1200 words)

### Frontmatter Overrides

**Force complex:**
```yaml
---
complexity: high
---
```

**Force simple (opt-out):**
```yaml
---
complexity: low
---
```

**Alternative force complex:**
```yaml
---
requires-state-tracking: true
---
```

**When to use overrides:**
- False positive: Skill flagged but shouldn't be (reference docs with many sections)
- False negative: Skill missed but should be flagged (nested lists instead of H2 headers)

## TodoWrite Mandate Patterns

### Strong Mandate Patterns (PASS)

**Pattern 1: MUST**
```regex
/\bMUST\s+.*TodoWrite\b/i
```
**Examples**:
- "You MUST use TodoWrite before starting"
- "TodoWrite MUST be used for this workflow"

**Pattern 2: REQUIRED**
```regex
/\bREQUIRED\s+.*TodoWrite\b/i
```
**Examples**:
- "TodoWrite is REQUIRED for this multi-step process"
- "State tracking via TodoWrite is REQUIRED"

**Pattern 3: CRITICAL**
```regex
/\bCRITICAL.*TodoWrite\b/i
```
**Examples**:
- "CRITICAL: Use TodoWrite to track all steps"

**Pattern 4: Imperative BEFORE**
```regex
/TodoWrite\s+BEFORE\s+/i
```
**Examples**:
- "Use TodoWrite BEFORE starting this workflow"
- "Create TodoWrite todos BEFORE phase 1"

**Pattern 5: MANDATORY**
```regex
/TodoWrite\s+is\s+MANDATORY/i
```
**Examples**:
- "TodoWrite is MANDATORY for this skill"

### Weak Mandate Patterns (WARNING)

**Pattern 1: should**
```regex
/\bshould\s+.*TodoWrite\b/i
```
**Examples**:
- "You should use TodoWrite to track progress"

**Pattern 2: recommend**
```regex
/\brecommend\s+.*TodoWrite\b/i
```
**Examples**:
- "We recommend using TodoWrite for complex workflows"

**Pattern 3: consider**
```regex
/\bconsider\s+.*TodoWrite\b/i
```
**Examples**:
- "Consider using TodoWrite to manage state"

**Pattern 4: suggest**
```regex
/\bsuggest\s+.*TodoWrite\b/i
```
**Examples**:
- "We suggest TodoWrite for multi-phase processes"

### Missing Mandate (CRITICAL for complex skills)

**Detection**: No TodoWrite references in skill body
- No strong patterns match
- No weak patterns match
- Skill is complex (meets complexity threshold)

**Severity**: CRITICAL (complex workflow without state tracking)

## Severity Matrix

| Complexity | TodoWrite Mandate | Severity | Rationale |
|------------|-------------------|----------|-----------|
| Complex | Missing | CRITICAL | High-complexity skill without state tracking = guaranteed context drift |
| Complex | Weak (should/recommend) | WARNING | Should upgrade to MUST for complex workflows |
| Complex | Strong (MUST/REQUIRED) | PASS | Compliant |
| Simple | Strong mandate | INFO | Unnecessary overhead for simple skills (not a violation) |
| Simple | Missing | PASS | Simple skills don't require TodoWrite |

**Exit Codes**:
- CRITICAL issues: Exit code 1 (compliance failure)
- WARNING issues: Exit code 1 (compliance failure)
- INFO issues: Exit code 0 (informational only)
- PASS: Exit code 0

## Remediation Guide

### Fix Pattern for CRITICAL Issues (Missing Mandate)

**Step 1: Identify Placement**
- After "When to Use" section
- Or within "Process" / "Workflow" section

**Step 2: Add State Tracking Section**

```markdown
## State Tracking

You MUST use TodoWrite BEFORE starting this workflow.

**Why:** This is a [X]-step process with [phases/stages]. External state tracking prevents:
- Forgetting completed steps
- Context drift across phases
- Repeating work already done
- Losing track of remaining tasks

**TodoWrite Structure:**
1. [Step/Phase 1]: [Description] (status)
2. [Step/Phase 2]: [Description] (status)
3. [Step/Phase 3]: [Description] (status)
...

**Example:**
\`\`\`
TodoWrite:
- [ ] Phase 1: Investigation (analyze symptoms, check logs)
- [ ] Phase 2: Hypothesis (identify potential causes)
- [ ] Phase 3: Testing (validate hypotheses)
- [ ] Phase 4: Implementation (apply fix)
\`\`\`
```

**Step 3: Verify Mandate Strength**
- Use "MUST" not "should"
- Include "BEFORE starting"
- Explain specific workflow risks

**Step 4: Test**
```bash
npm run audit -- <skill-name> --phase 13
# Expected: No CRITICAL issues
```

### Fix Pattern for WARNING Issues (Weak Mandate)

**Step 1: Find Existing TodoWrite Mention**
```bash
grep -i "todowrite" <skill-file>
```

**Step 2: Upgrade Language**

| Before | After |
|--------|-------|
| "You should use TodoWrite" | "You MUST use TodoWrite" |
| "We recommend TodoWrite" | "TodoWrite is REQUIRED" |
| "Consider using TodoWrite" | "You MUST use TodoWrite BEFORE starting" |
| "TodoWrite helps track" | "You MUST use TodoWrite to track" |

**Step 3: Add BEFORE Clause**
Always include timing: "...BEFORE starting this workflow"

**Step 4: Test**
```bash
npm run audit -- <skill-name> --phase 13
# Expected: No WARNING issues for TodoWrite
```

### Example Remediation

**Before:**
```markdown
# Skill Compliance Audit

## Overview
This skill validates and remediates 13 compliance phases...

## The Process
1. Run audit mode
2. Review results
3. Apply fixes
...
```

**After:**
```markdown
# Skill Compliance Audit

## Overview
This skill validates and remediates 13 compliance phases...

## State Tracking

You MUST use TodoWrite BEFORE starting any multi-skill audit or fix operation.

**Why:** This skill involves running 13 sequential phases across multiple skills. External state tracking prevents:
- Forgetting which phases have been audited
- Context drift when reviewing hundreds of issues
- Repeating audits already completed
- Losing track of which skills have been fixed

**TodoWrite Structure:**
1. Phase [1-13]: Audit [phase name] (status: pending/in_progress/completed)
2. Skill [name]: Fix [issue] (status: pending/in_progress/completed)

**Example:**
\`\`\`
TodoWrite:
- [x] Phase 1: Description Format
- [x] Phase 2: Allowed-Tools
- [ ] Phase 3: Word Count
...
- [ ] skill-name: Add TodoWrite mandate
\`\`\`

## The Process
1. Run audit mode
2. Review results
3. Apply fixes
...
```

### False Positive Handling

If a skill is flagged but shouldn't be complex:

**Option 1: Add Frontmatter Override**
```yaml
---
name: skill-name
description: ...
complexity: low
---
```

**Option 2: Add Opt-Out**
```yaml
---
name: skill-name
description: ...
requires-state-tracking: false
---
```

**When to use overrides:**
- Reference documentation with many sections but no workflow
- Skills with high word count due to examples, not complexity
- Skills with "phase" in examples but no actual multi-phase workflow

## Heuristic Calibration

### Why These Thresholds?

| Heuristic | Threshold | Rationale | Recommendation |
|-----------|-----------|-----------|----------------|
| Section Count | ≥5 H2 headers | 5+ sections typically indicates multi-phase process | Keep at 5 |
| Workflow Keywords | systematic/protocol/workflow/phase/checklist/step-by-step | These words signal structured, multi-step processes | Keep current list |
| Word Count | >1500 words | Comprehensive guidance requires length; simple skills are <1000 words | Keep at 1500 |
| 2-of-3 Rule | Must meet 2 criteria | Prevents single-heuristic false positives | Keep |

### Identifying True Positives

**Characteristics of correctly flagged complex skills:**
- Clear multi-step workflows
- Checklist-based processes
- Sequential phases that build on previous steps
- High risk of context drift if steps aren't tracked

### Handling False Positives

**Potential false positive candidates:**
- Skills with many H2 sections but independent topics (reference documentation)
- Skills with high word count due to code examples, not complexity
- Skills with "phase" in examples but no actual multi-phase workflow

**Mitigation:** Use frontmatter override `complexity: low` for edge cases.

### Detecting False Negatives

**Skills that may be missed:**
- Skills with nested lists instead of H2 headers
- Skills using different workflow terminology ("step 1, step 2" instead of "phase")
- Skills with <5 sections but still complex

**Recommendation:** Monitor skills passing audit for actual usage patterns. If agents forget steps, add explicit complexity declaration via frontmatter.

### Threshold Adjustments

**Not Recommended:**
- ❌ Lower section threshold to 4 - Would increase false positives
- ❌ Increase word count to 2000 - Would miss moderately complex skills
- ❌ Require all 3 criteria - Too strict, would miss legitimate complex skills

**Optional Enhancements (Future):**

1. **Add numbered step detection:**
   ```typescript
   // Detect "1.", "2.", "3." pattern (suggests sequential workflow)
   const hasNumberedSteps = /^\d+\.\s+/gm.test(content);
   ```

2. **Add checklist detection:**
   ```typescript
   // Detect checklist patterns
   const hasChecklists = /^-\s+\[[ x]\]/gm.test(content);
   ```

3. **Expand keyword list:**
   ```typescript
   /\b(systematic|protocol|workflow|phase|checklist|step-by-step|procedure)\b/i
   ```

## Related Phases

- [Phase 1: Description Format](phase-01-description.md) - Description should mention TodoWrite for complex skills
- [Phase 3: Word Count](phase-03-word-count.md) - Word count used as complexity heuristic
- CSO Optimization (in claude-skill-write) - Keyword optimization affects complexity detection

## Quick Reference

| Issue | Severity | Auto-Fix | Solution |
|-------|----------|----------|----------|
| Complex skill missing TodoWrite mandate | CRITICAL | ❌ | claude-skill-write |
| Complex skill with weak mandate | WARNING | ❌ | claude-skill-write |
| Simple skill with strong mandate | INFO | N/A | Consider frontmatter override |
| Complexity metadata | INFO | N/A | Informational only |
