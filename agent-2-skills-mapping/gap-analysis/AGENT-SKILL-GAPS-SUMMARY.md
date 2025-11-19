# Agent-Skill Gap Analysis - Executive Summary

**Date**: 2025-11-18
**Context**: Post Phase 3 Testing Infrastructure Transformation
**Scope**: 68 agents × 56 skills = 3,808 possible references analyzed

---

## Top-Line Findings

### Critical Statistics
- **Total missing references**: 143 gaps identified
- **Current TDD adoption**: 4 out of 68 agents (~6%)
- **Current debugging adoption**: 0 out of 68 agents (0%)
- **Code review skills**: 0 out of 3 code reviewers have review skills
- **E2E patterns**: 0 out of 3 E2E/browser test engineers have E2E patterns

### Validation Results (Key Gaps Confirmed)
✗ frontend-e2e-browser-test-engineer missing e2e-testing-patterns
✗ backend-integration-test-engineer missing api-testing-patterns
✗ go-code-reviewer missing receiving-code-review
✗ react-architect missing brainstorming
✗ test-coverage-auditor missing test-metrics-reality-check

---

## Most Critical Gaps (Highest Impact)

### 1. Universal Development Skills
**Impact**: Affects ALL development work, prevents 22-hour TDD wastes

- **test-driven-development**
  - Current: 4/68 agents (6%)
  - Should be: 19+ agents (ALL developers, ALL test engineers, ALL reviewers)
  - Gap: 15+ agents missing
  - Impact: Agents write code without watching tests fail first

- **systematic-debugging**
  - Current: 0/68 agents (0%)
  - Should be: 28+ agents (ALL developers, ALL test engineers, ALL coordinators)
  - Gap: 28+ agents missing
  - Impact: Agents guess at fixes instead of finding root cause

- **verification-before-completion**
  - Current: Unknown (low)
  - Should be: 16+ agents (ALL developers, ALL test engineers)
  - Gap: ~15 agents missing
  - Impact: Agents claim "done" without verification

---

### 2. Testing Domain Expertise
**Impact**: Test engineers lack domain-specific testing patterns

- **e2e-testing-patterns**
  - Missing from: frontend-e2e-browser-test-engineer (CORE RESPONSIBILITY)
  - Missing from: frontend-browser-test-engineer (CORE RESPONSIBILITY)
  - Missing from: chromatic-test-engineer
  - Impact: E2E engineers don't know E2E patterns skill exists

- **api-testing-patterns**
  - Missing from: backend-integration-test-engineer (CORE RESPONSIBILITY)
  - Missing from: frontend-integration-test-engineer
  - Missing from: go-api-developer (writes APIs but doesn't know testing patterns)
  - Impact: API testing done without contract testing patterns

- **integration-first-testing**
  - Missing from: backend-integration-test-engineer (CORE RESPONSIBILITY)
  - Missing from: frontend-integration-test-engineer (CORE RESPONSIBILITY)
  - Impact: Integration engineers may write unit tests instead

- **condition-based-waiting**
  - Missing from: frontend-e2e-browser-test-engineer
  - Missing from: frontend-browser-test-engineer
  - Impact: Flaky tests with hardcoded timeouts

---

### 3. Code Review Workflow
**Impact**: Code reviewers lack code review skills (ironic)

- **receiving-code-review** - 0/3 code reviewers
  - Missing from: go-code-reviewer
  - Missing from: react-code-reviewer
  - Missing from: general-code-reviewer
  - Impact: Reviewers can't model good review response

- **requesting-code-review** - 0/3 code reviewers
  - Missing from: go-code-reviewer
  - Missing from: react-code-reviewer
  - Missing from: general-code-reviewer
  - Impact: Reviewers can't guide review requests

---

### 4. Architecture Quality
**Impact**: Architects lack design refinement skills

- **brainstorming** - 0/4 main architects
  - Missing from: go-backend-architect
  - Missing from: react-architect
  - Missing from: security-architect
  - Missing from: general-system-architect
  - Impact: Architects jump to solutions without exploring alternatives

---

### 5. Test Quality Assurance
**Impact**: Quality agents lack quality assessment skills

- **test-metrics-reality-check**
  - Missing from: test-coverage-auditor (CORE RESPONSIBILITY)
  - Missing from: test-coordinator
  - Impact: Coverage theater goes unchecked

- **test-coverage-auditor has ZERO skill references**
  - No testing skills
  - No development skills
  - No quality skills
  - Impact: Auditor has no context for what to audit

---

## Gap Distribution by Agent Type

### Testing Agents (8 total)
- **Average gaps per agent**: 5 missing skills
- **Total gaps**: ~40 references
- **Critical gaps**: TDD, debugging, domain patterns
- **Status**: Moderate coverage (3-5 skills each) but missing fundamentals

### Development Agents (8 total)
- **Average gaps per agent**: 4 missing skills
- **Total gaps**: ~32 references
- **Critical gaps**: TDD, debugging, verification, domain skills
- **Status**: Low coverage, missing universal practices

### Code Review Agents (3 total)
- **Average gaps per agent**: 6 missing skills
- **Total gaps**: ~18 references
- **Critical gaps**: Review skills, TDD, testing patterns
- **Status**: Zero coverage of code review skills

### Architecture Agents (7 total)
- **Average gaps per agent**: 3 missing skills
- **Total gaps**: ~21 references
- **Critical gaps**: Brainstorming, domain architecture patterns
- **Status**: Low coverage of design skills

### Coordinator Agents (12 total)
- **Average gaps per agent**: 3 missing skills
- **Total gaps**: ~36 references
- **Critical gaps**: Debugging, orchestration patterns
- **Status**: Low coverage of coordination skills

---

## Impact Assessment

### High-Impact Gaps (Prevent Major Wastes)
These gaps cause 22-hour wastes, failed deployments, and quality issues:

1. **test-driven-development** (19+ agents need it, 4 have it)
   - Prevents: Writing tests that don't test (22-hour waste)
   - Prevents: Test coverage theater
   - Prevents: "Tests pass but prod is broken"

2. **systematic-debugging** (28+ agents need it, 0 have it)
   - Prevents: Guess-and-check debugging
   - Prevents: Symptom fixes that mask root cause
   - Prevents: Creating new bugs while fixing old ones

3. **e2e-testing-patterns** (3 agents need it, 0 have it)
   - Prevents: Flaky E2E tests
   - Prevents: Slow test suites
   - Prevents: Testing wrong things

4. **api-testing-patterns** (4+ agents need it, 0 have it)
   - Prevents: Breaking API contracts
   - Prevents: Missing integration bugs
   - Prevents: Over-mocking in tests

5. **Code review skills** (3 agents need them, 0 have them)
   - Prevents: Poor review quality
   - Prevents: Unclear review requests
   - Prevents: Defensive review responses

---

### Medium-Impact Gaps (Reduce Quality/Efficiency)
These gaps reduce code quality and slow development:

1. **verification-before-completion** (~16 agents need it)
   - Impact: Agents claim done without testing
   - Impact: PRs created with broken code

2. **testing-anti-patterns** (~8 agents need it)
   - Impact: Agents mock implementation details
   - Impact: Tests become brittle

3. **brainstorming** (~8 agents need it)
   - Impact: Architects skip design exploration
   - Impact: Solutions not optimal

4. **Frontend modernization skills** (~4 agents need them)
   - Impact: React code doesn't use React 19 patterns
   - Impact: Performance not optimized

---

### Low-Impact Gaps (Nice-to-Have)
These gaps are minor or apply to rarely-used agents:

1. Document processing skills (docx, pdf, pptx, xlsx)
2. Product management skills (Jira/Linear agents)
3. Research skills (web search, pattern analysis)
4. Meta skills (skill writing, agent writing)

---

## Recommended Prioritization

### Phase 1: Universal Skills (Week 1) - 63 references
**Goal**: Ensure ALL development agents follow TDD and debugging

1. Add **test-driven-development** to 19 agents
   - All 8 development agents
   - All 8 testing agents
   - All 3 code review agents

2. Add **systematic-debugging** to 28 agents
   - All 8 development agents
   - All 8 testing agents
   - All 12 coordinator agents

3. Add **verification-before-completion** to 16 agents
   - All 8 development agents
   - All 8 testing agents

**Impact**: Prevents 22-hour wastes across all agents

---

### Phase 2: Code Review Skills (Week 1) - 7 references
**Goal**: Fix code review workflow

1. Add **receiving-code-review** to 3 code reviewers
2. Add **requesting-code-review** to 3 code reviewers + quality-coordinator

**Impact**: Fixes code review quality and workflow

---

### Phase 3: Testing Domain Skills (Week 2) - 14 references
**Goal**: Test engineers know domain patterns

1. Add **e2e-testing-patterns** to 3 E2E/browser agents
2. Add **api-testing-patterns** to 4 API/integration agents
3. Add **integration-first-testing** to 2 integration agents
4. Add **condition-based-waiting** to 2 browser agents
5. Add **interactive-form-testing** to 3 frontend test agents

**Impact**: Test engineers use correct testing patterns

---

### Phase 4: Architecture Skills (Week 2) - 11 references
**Goal**: Architects refine designs

1. Add **brainstorming** to 5 architects + planner
2. Add **frontend-information-architecture** to 3 frontend agents
3. Add **chariot-lambda-vs-ec2-decisions** to 3 backend agents

**Impact**: Better architecture decisions

---

### Phases 5-8: Remaining 48 references (Weeks 3-4)
See main analysis document for details

---

## Success Criteria

### Quantitative Metrics
- **Phase 1**: 63/143 gaps closed (44%)
- **Phase 2**: 70/143 gaps closed (49%)
- **Phase 3**: 84/143 gaps closed (59%)
- **Phase 4**: 95/143 gaps closed (66%)
- **Phase 5-8**: 143/143 gaps closed (100%)

### Qualitative Validation
Test each agent after adding skills:

1. **TDD validation**: Ask agent to implement feature
   - ✓ Should mention writing test first
   - ✓ Should write failing test
   - ✓ Should implement minimal code
   - ✓ Should refactor after passing

2. **Debugging validation**: Give agent a bug
   - ✓ Should investigate root cause first
   - ✓ Should NOT propose immediate fix
   - ✓ Should trace error backward
   - ✓ Should validate hypothesis

3. **Domain skill validation**: Ask agent to do core task
   - ✓ Should mention relevant skill
   - ✓ Should follow skill patterns
   - ✓ Should reference skill documentation

---

## Implementation Template

For each agent update:

```markdown
## Essential Skills

Use these skills to guide your work:

### Core Development Practices
- **test-driven-development**: Write the test first, watch it fail, write minimal code to pass. NO code without failing test first.
- **systematic-debugging**: Four-phase framework - complete root cause investigation before proposing any fixes.
- **verification-before-completion**: Verify all functionality works before claiming done. Run tests, check in browser, validate edge cases.

### [Domain-Specific Skills]
- **[domain-skill]**: [Brief description of when/how to use]
```

---

## Key Insights

### Why These Gaps Exist
1. **Rapid agent creation**: Agents added quickly without skill review
2. **Skill creation outpaced agent updates**: 5 new skills in Phase 3, agents not updated
3. **No systematic skill-agent mapping**: Manual skill references, easy to miss
4. **Agent proliferation**: 68 agents hard to keep synchronized

### Prevention Strategy
1. **Agent creation checklist**: Require skill mapping before creating agent
2. **Skill impact analysis**: When creating skill, identify which agents need it
3. **Periodic gap analysis**: Run this analysis quarterly
4. **Automated validation**: Script to check agent-skill alignment

### Long-Term Solution
Consider:
1. **Skill inheritance**: Agent types inherit base skills automatically
2. **Skill categories**: Agents declare categories, get skills automatically
3. **Validation tests**: Test agents mention skills when triggered

---

## Next Steps

1. **Review this analysis** with team (30 min)
2. **Approve phased approach** (15 min)
3. **Execute Phase 1** (Week 1): Add TDD, debugging, verification to all dev agents
4. **Validate Phase 1** (Week 1): Test 3 sample agents, verify behavior
5. **Execute Phase 2** (Week 1): Add code review skills
6. **Continue phases 3-8** (Weeks 2-4)
7. **Final validation** (Week 4): Test full agent ecosystem

---

## Appendix: Quick Reference

### Universal Skills (Every Agent Needs These)
- test-driven-development
- systematic-debugging
- verification-before-completion

### Agent Type → Core Skills

**Testing Agents**:
- test-driven-development
- systematic-debugging
- verification-before-completion
- behavior-vs-implementation-testing
- testing-anti-patterns
- verify-test-file-existence
- test-infrastructure-discovery
- [+ domain skill: e2e/api/cli/integration]

**Development Agents**:
- test-driven-development
- systematic-debugging
- verification-before-completion
- [+ domain skill: API/frontend/backend/integration]

**Code Review Agents**:
- test-driven-development
- systematic-debugging
- receiving-code-review
- requesting-code-review
- testing-anti-patterns
- behavior-vs-implementation-testing

**Architecture Agents**:
- brainstorming
- systematic-debugging
- [+ domain skill: frontend/backend/security/cloud]

**Coordinator Agents**:
- systematic-debugging
- dispatching-parallel-agents
- subagent-driven-development
- [+ domain skill: test/quality/security/deployment]

---

## Conclusion

This analysis reveals **systemic gaps** in agent skill references:

- **6% TDD adoption** when it should be universal
- **0% debugging adoption** when it should be universal
- **0/3 code reviewers** have code review skills
- **0/3 E2E engineers** have E2E testing patterns
- **Test coverage auditor** has ZERO skill references

**These gaps directly cause 22-hour wastes** like:
- Tests that don't test (no TDD)
- Guess-and-check debugging (no systematic approach)
- Poor code reviews (no review skills)
- Flaky E2E tests (no E2E patterns)

**Recommended action**: Execute phased rollout over 4 weeks, starting with universal skills that prevent the biggest wastes.
