# Self-Consistency Patterns for Orchestration

Multiple reasoning paths to catch first-impression bias and improve accuracy.

## Code Quality Review: Two-Pass Verification

Include this block in code quality review prompts:

```markdown
## Self-Consistency: Two-Pass Review

### Pass 1: Fresh Read (Top-Down)

Read code from start to finish. Note your initial impressions:

- Overall structure assessment
- First issues that jump out
- Quality gut feeling (1-10)

Document: "Pass 1 findings: [list]"

### Pass 2: Critical Read (Adversarial)

Now read again, actively looking for problems your first pass might have missed:

**Actively seek**:

- Edge cases not handled
- Error paths not tested
- Assumptions not validated
- Security issues overlooked
- Performance concerns ignored

Document: "Pass 2 findings: [list]"

### Consistency Check

Compare Pass 1 and Pass 2:

| Finding | Pass 1       | Pass 2       | Consistent? |
| ------- | ------------ | ------------ | ----------- |
| [issue] | Noted/Missed | Noted/Missed | Yes/No      |

**If inconsistent** (Pass 2 found things Pass 1 missed):

- These are likely real issues that superficial review misses
- Weight these findings higher in final assessment

**Final verdict must account for both passes.**

---

### Example

**Pass 1** (3 minutes):

- Code looks clean
- Good naming
- Tests present
- Gut feeling: 8/10
- Issues found: None obvious

**Pass 2** (5 minutes, adversarial):

- Looking for missing error handling... Found: API call line 45 has no try/catch
- Looking for edge cases... Found: Empty array not handled in line 67
- Looking for security... Found: User input not sanitized line 23
- Issues found: 3 significant

**Consistency check**:

- Pass 1 found 0 issues
- Pass 2 found 3 issues
- Inconsistent! Pass 1 was superficial.

**Revised verdict**: Not 8/10, actually needs fixes before approval.

---

**ALWAYS do both passes. Pass 1 alone is insufficient.**
```

## Architecture Decision: Alternative Perspective Check

Include this block in architecture prompts:

```markdown
## Self-Consistency: Alternative Perspective

After reaching your recommendation, verify it with this check:

### Step 1: State your recommendation

"I recommend Option A: Redux for state management"

### Step 2: Argue AGAINST your recommendation

"If I were arguing for Option B (React Context), I would say:

- Simpler, no additional dependency
- Sufficient for our 5-component state sharing
- Team already knows React, learning curve for Redux"

### Step 3: Argue FOR the alternative

"Option B advantages I may have underweighted:

- Maintenance burden lower
- Bundle size smaller
- Faster initial implementation"

### Step 4: Check if you should switch

"Does the alternative argument reveal a flaw in my original reasoning?"

If yes: Switch recommendation, document why
If no: Keep recommendation, document why alternative was rejected

### Step 5: Document the check

"Self-consistency check performed:

- Original: Redux (complex state, time-travel debugging)
- Alternative considered: React Context
- Alternative argument: Simpler for small state
- Decision: KEEP Redux because state will grow (roadmap shows 3 more features)
- Confidence: High (alternative argument didn't reveal flaw)"

---

**This prevents anchoring bias on first option considered.**
```

## Research Synthesis: Multi-Path Aggregation

Include this block in synthesis prompts:

```markdown
## Self-Consistency: Multi-Path Synthesis

### Approach 1: Source-First Aggregation

Start with each source, extract findings, then combine.

Result of Approach 1: "[Key synthesis from source-first]"

### Approach 2: Claim-First Aggregation

Start with major claims, then check which sources support each.

Result of Approach 2: "[Key synthesis from claim-first]"

### Approach 3: Conflict-First Aggregation

Start with disagreements, resolve them, then build consensus.

Result of Approach 3: "[Key synthesis from conflict-first]"

### Consistency Check

| Synthesis Aspect | Approach 1 | Approach 2 | Approach 3 | Consistent? |
| ---------------- | ---------- | ---------- | ---------- | ----------- |
| Main conclusion  | X          | X          | X          | Yes/No      |
| Key finding 1    | X          | X          | X          | Yes/No      |
| Key finding 2    | X          | X          | X          | Yes/No      |

**If all three approaches reach same conclusion**: High confidence (0.85+)
**If two agree, one differs**: Medium confidence (0.7), investigate difference
**If all three differ**: Low confidence (0.5), flag for human review

---

**Final synthesis must reconcile all three approaches.**
```
