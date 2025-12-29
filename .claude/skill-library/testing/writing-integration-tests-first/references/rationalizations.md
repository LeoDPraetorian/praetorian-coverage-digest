# Rationalizations - Why Agents Skip Integration-First

**Common bias patterns that lead to unit-test-first trap.**

## Cognitive Biases

### 1. Expertise Bias

**Rationalization:** "I'm good at unit tests, so I'll start there"

**Why it's wrong:** Your skill at writing unit tests doesn't change whether they catch the bugs. Integration bugs require integration tests.

**Counter:** Expertise in the wrong tool wastes time faster.

---

### 2. Metrics Bias

**Rationalization:** "File coverage looks better with unit tests"

**Why it's wrong:** File coverage doesn't correlate with bug detection. You can have 100% file coverage and 0% workflow coverage.

**Counter:** Coverage of the wrong thing = false confidence.

---

### 3. Familiarity Bias

**Rationalization:** "Unit tests are faster and I'm comfortable with them"

**Why it's wrong:** Faster to write ≠ faster to value. Day 1 unit tests + Day 2 rewrite is SLOWER than Day 1 integration tests.

**Counter:** Fast waste is still waste.

---

### 4. Authority Bias

**Rationalization:** "Manager wants 'files with tests' metrics"

**Why it's wrong:** Manager wants bugs caught, not files checked. Integration tests catch more bugs per test written.

**Counter:** Ship results (bugs found), not activity (tests written).

---

## Common Rationalizations

| Rationalization                       | Reality                             |
| ------------------------------------- | ----------------------------------- |
| "60 files = 60 tests = good metrics"  | 60 shallow tests = 0 bugs caught    |
| "I'll realize issues and pivot later" | You WILL pivot, so why waste Day 1? |
| "Play to my strength"                 | Wrong tool wastes strength          |
| "File coverage looks good"            | Wrong coverage metric               |
| "Unit tests are faster"               | Not if you rewrite on Day 2         |

## The Meta-Rationalization

**"This skill doesn't apply to MY situation because..."**

STOP. If you're thinking this, you're already rationalizing. The skill exists BECAUSE agents rationalize.

**Not even when:**

- Your component seems "simple"
- You're "just testing one file"
- Manager is "watching metrics"
- You're "really good at unit tests"

**Integration first. Always.**
