# Red Flags Checklist

**Warning signs you're about to waste Day 1 on unit tests.**

## Before Writing Any Test

Check yourself against these red flags:

### 🚩 Optimization Thinking

- [ ] "I'm fastest at unit tests"
- [ ] "Let me start with what I'm comfortable with"
- [ ] "Unit tests give faster feedback"
- [ ] "I'll do integration later"

**If ANY checked:** STOP. Start with integration.

---

### 🚩 Metrics Thinking

- [ ] "File coverage will look good"
- [ ] "Manager measures files with tests"
- [ ] "60 files = 60 tests = 100% coverage"
- [ ] "This will show good progress"

**If ANY checked:** STOP. Start with integration.

---

### 🚩 Rationalization Thinking

- [ ] "I'll course-correct if needed"
- [ ] "I'll realize issues later and pivot"
- [ ] "Play to my strength first"
- [ ] "This is just one file, doesn't count"

**If ANY checked:** STOP. Start with integration.

---

### 🚩 Authority Thinking

- [ ] "Following standard TDD practice"
- [ ] "Unit tests are best practice"
- [ ] "Everyone starts with unit tests"
- [ ] "The testing pyramid says..."

**If ANY checked:** STOP. Start with integration.

---

## The One Question

**"Will I realize on Day 2 these unit tests don't catch bugs?"**

- **YES** → Start with integration NOW, save Day 1
- **NO** → You'll waste Day 1, pivot Day 2 anyway

**Evidence from baseline:** Agent's own plan showed Day 1 unit → Day 2 crisis → pivot

---

## When It's REALLY Okay to Unit Test First

Never.

(Well, almost never. If you're testing a pure utility function with zero integration points, fine. But if you're reading this checklist, that's not what you're doing.)

**Integration first. Always.**
