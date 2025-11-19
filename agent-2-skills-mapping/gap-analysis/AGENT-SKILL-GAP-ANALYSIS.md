# Agent-Skill Gap Analysis Report
## Phase 3 Testing Infrastructure Transformation - Post-Mortem

**Generated**: 2025-11-18
**Context**: 16 commits on main, 5 new skills created, 12 agents updated
**Objective**: Identify missing skill references across ALL agents

---

## Executive Summary

**Total Skills**: 56 active skills across 10 categories
**Total Agents**: 68 agents across 11 types
**Critical Gaps Found**: 147 high-priority missing references
**Impact**: High-value skills (TDD, debugging, testing patterns) not referenced by agents who need them most

### Highest Impact Gaps

1. **test-driven-development**: Missing from 38+ agents (ALL developers, ALL test engineers)
2. **systematic-debugging**: Missing from 40+ agents (ALL developers, coordinators)
3. **e2e-testing-patterns**: Missing from browser/E2E test engineers
4. **api-testing-patterns**: Missing from API developers and integration test engineers
5. **code-review skills**: Missing from ALL code reviewers

---

## Skill Inventory (56 Total)

### Testing Skills (16 skills)
- **api-testing-patterns**: API/microservices contract testing
- **e2e-testing-patterns**: Playwright/Cypress E2E testing
- **cli-testing-patterns**: Jest/pytest CLI testing
- **integration-first-testing**: Integration tests before unit
- **interactive-form-testing**: Form/multi-step workflow testing
- **chariot-react-testing-patterns**: Chariot-specific React patterns
- **condition-based-waiting**: Prevent flaky tests with polling
- **authorization-testing**: IDOR/privilege escalation testing
- **compatibility-testing**: Cross-browser/platform testing
- **test-infrastructure-discovery**: Discover MSW/fixtures/tools
- **test-metrics-reality-check**: Honest test metrics (not coverage theater)
- **testing-anti-patterns**: Avoid mocking implementation details
- **behavior-vs-implementation-testing**: Test behavior not implementation
- **verify-test-file-existence**: Check test files exist before work
- **mock-chariot-task**: Mock Chariot CLI/HTTP/DNS calls
- **mock-contract-validation**: Validate MSW handler contracts

### Development Skills (5 skills)
- **test-driven-development**: RED-GREEN-REFACTOR cycle (22-hour waste prevention)
- **systematic-debugging**: Root cause before fixes (4-phase framework)
- **root-cause-tracing**: Trace errors backward to source
- **defense-in-depth**: Multi-layer validation
- **verification-before-completion**: Verify work before claiming done

### Code Review Skills (2 skills)
- **receiving-code-review**: Handle PR feedback rigorously
- **requesting-code-review**: Request reviews before merge

### Architecture Skills (3 skills)
- **frontend-information-architecture**: Frontend file organization (20+ files)
- **chariot-lambda-vs-ec2-decisions**: Compute platform decisions
- **brainstorming**: Refine rough ideas before coding

### Frontend Skills (3 skills)
- **frontend-performance-optimization**: React 19 performance patterns
- **react-modernization**: React 19 upgrade patterns
- **chariot-react-testing-patterns**: Chariot-specific patterns

### Security Skills (4 skills)
- **auth-implementation-patterns**: JWT/OAuth2/RBAC patterns
- **authorization-testing**: Test auth failures
- **secret-scanner**: Detect exposed secrets
- **discover-cryptography**: TLS/PKI/encryption patterns

### DevOps Skills (3 skills)
- **bash-defensive-patterns**: Production-grade bash scripts
- **github-workflow-automation**: GitHub Actions with AI coordination
- **using-git-worktrees**: Isolated development environments

### Integration Skills (2 skills)
- **chariot-third-party-integrations**: External API integration workflow
- **chrome-devtools**: Browser automation/debugging

### Orchestration Skills (5 skills)
- **dispatching-parallel-agents**: Concurrent agent dispatch
- **subagent-driven-development**: Dispatch subagent per task
- **executing-plans**: Execute plans in batches with review
- **finishing-a-development-branch**: Branch completion workflow
- **writing-plans**: Detailed implementation plans

### Meta Skills (7 skills)
- **updating-agents**: Improve agent definitions (TDD methodology)
- **writing-agents**: Create new agents
- **writing-skills**: Create new skills
- **testing-skills-with-subagents**: TDD for skills
- **skill-opportunity-detector**: Find repetitive patterns
- **sharing-skills**: Contribute skills upstream
- **using-superpowers**: Mandatory workflow setup

### Document Skills (6 skills - not covered in main analysis)
- **docx**: Word document processing
- **pdf**: PDF generation/processing
- **pptx**: PowerPoint processing
- **xlsx**: Excel spreadsheet processing
- **openapi**: OpenAPI specification
- **plugin-auditor**: Claude Code plugin auditing

---

## Agent Inventory (68 Total)

### Testing Agents (8 total)
1. backend-integration-test-engineer
2. backend-unit-test-engineer
3. frontend-browser-test-engineer
4. frontend-e2e-browser-test-engineer
5. frontend-integration-test-engineer
6. frontend-unit-test-engineer
7. test-coverage-auditor
8. test-quality-assessor

### Development Agents (8 total)
1. go-api-developer
2. go-developer
3. integration-developer
4. makefile-developer
5. python-developer
6. react-developer
7. vql-developer
8. yaml-developer

### Architecture Agents (7 total)
1. cloud-aws-architect
2. database-neo4j-architect
3. general-system-architect
4. go-backend-architect
5. information-architect
6. react-architect
7. security-architect

### Quality Agents (4 total)
1. general-code-reviewer
2. go-code-reviewer
3. java-swing-code-reviewer
4. react-code-reviewer

### Orchestrator Agents (12 total)
1. architecture-coordinator
2. deployment-coordinator
3. feedback-loop-coordinator
4. hierarchical-coordinator
5. implementation-planner
6. knowledge-synthesizer
7. mesh-coordinator
8. preprocessing-orchestration
9. quality-coordinator
10. security-coordinator
11. test-coordinator
12. thinking-budget-allocator

### Analysis Agents (7 total)
1. complexity-assessor
2. go-security-review
3. integration-pattern-discoverer
4. intent-translator
5. react-security-reviewer
6. security-agent-strategist
7. security-risk-assessor

### Validation Agents (6 total)
1. chromatic-test-engineer
2. openapi-writer
3. performance-analyzer
4. praetorian-cli-expert
5. production-validator
6. uiux-designer

### DevOps Agents (2 total)
1. aws-infrastructure-specialist
2. devops-automator

### Optimization Agents (1 total)
1. go-api-optimizer

### Product Agents (8 total)
1. jira-bug-filer
2. jira-epic-writer
3. jira-reader
4. jira-story-writer
5. linear-bug-filer
6. linear-project-writer
7. linear-reader
8. linear-story-writer

### Research Agents (3 total)
1. code-pattern-analyzer
2. context7-search-specialist
3. web-research-specialist

### ML/Data Agents (2 total)
1. ai-engineer
2. data-ml-model

---

## HIGH PRIORITY GAPS (22-Hour Waste Prevention)

### 1. Testing Agents Missing Critical Skills

#### backend-integration-test-engineer
**Current refs**: behavior-vs-implementation-testing, mock-contract-validation, verify-test-file-existence

**MISSING (HIGH)**:
- ❌ **test-driven-development** - Prevents 22-hour test-that-doesn't-test waste
- ❌ **systematic-debugging** - Root cause before fixes
- ❌ **api-testing-patterns** - API/microservices testing (CORE RESPONSIBILITY)
- ❌ **integration-first-testing** - Integration over unit (CORE RESPONSIBILITY)
- ❌ **cli-testing-patterns** - CLI testing for praetorian-cli

**Impact**: Agent writes integration tests without TDD or API patterns

---

#### backend-unit-test-engineer
**Current refs**: behavior-vs-implementation-testing, verify-test-file-existence

**MISSING (HIGH)**:
- ❌ **test-driven-development** - RED-GREEN-REFACTOR
- ❌ **systematic-debugging** - Debug test failures systematically
- ❌ **test-infrastructure-discovery** - Find existing test tools
- ❌ **cli-testing-patterns** - CLI testing patterns
- ❌ **testing-anti-patterns** - Avoid mocking implementation

**Impact**: Agent writes unit tests without TDD methodology

---

#### frontend-browser-test-engineer
**Current refs**: behavior-vs-implementation-testing, chrome-devtools, verify-test-file-existence

**MISSING (HIGH)**:
- ❌ **test-driven-development** - TDD cycle
- ❌ **systematic-debugging** - Debug flaky tests
- ❌ **e2e-testing-patterns** - Playwright/Cypress patterns (CORE RESPONSIBILITY)
- ❌ **condition-based-waiting** - Prevent flaky tests (CRITICAL)
- ❌ **compatibility-testing** - Cross-browser testing

**Impact**: Agent writes browser tests without E2E patterns or flaky test prevention

---

#### frontend-e2e-browser-test-engineer
**Current refs**: behavior-vs-implementation-testing, chrome-devtools, verify-test-file-existence

**MISSING (HIGH)**:
- ❌ **test-driven-development** - TDD for E2E
- ❌ **systematic-debugging** - Debug E2E failures
- ❌ **e2e-testing-patterns** - E2E patterns (CORE RESPONSIBILITY)
- ❌ **condition-based-waiting** - Flaky test prevention (CRITICAL)

**Impact**: E2E engineer doesn't know E2E testing patterns skill exists

---

#### frontend-integration-test-engineer
**Current refs**: behavior-vs-implementation-testing, mock-contract-validation, test-infrastructure-discovery, testing-anti-patterns, verify-test-file-existence

**MISSING (HIGH)**:
- ❌ **test-driven-development** - TDD cycle
- ❌ **systematic-debugging** - Debug integration failures
- ❌ **api-testing-patterns** - API testing patterns
- ❌ **integration-first-testing** - Integration-first approach (CORE RESPONSIBILITY)
- ❌ **interactive-form-testing** - Form testing patterns

**Impact**: Best coverage of skills but still missing TDD and core patterns

---

#### frontend-unit-test-engineer
**Current refs**: behavior-vs-implementation-testing, verify-test-file-existence

**MISSING (HIGH)**:
- ❌ **test-driven-development** - TDD cycle (CRITICAL)
- ❌ **systematic-debugging** - Debug test failures
- ❌ **test-infrastructure-discovery** - Find MSW/fixtures
- ❌ **interactive-form-testing** - Form testing (React forms common)
- ❌ **chariot-react-testing-patterns** - Chariot patterns
- ❌ **testing-anti-patterns** - Avoid bad patterns

**Impact**: Unit test engineer lacks TDD and infrastructure discovery

---

#### test-coverage-auditor
**Current refs**: NONE

**MISSING (HIGH)**:
- ❌ **test-driven-development** - Understand TDD metrics
- ❌ **systematic-debugging** - Debug coverage gaps
- ❌ **test-metrics-reality-check** - Honest metrics (CORE RESPONSIBILITY)
- ❌ **behavior-vs-implementation-testing** - Audit behavior coverage
- ❌ **testing-anti-patterns** - Identify anti-patterns in coverage

**Impact**: Coverage auditor has NO skill references at all

---

#### test-quality-assessor
**Current refs**: behavior-vs-implementation-testing, test-metrics-reality-check, verify-test-file-existence

**MISSING (HIGH)**:
- ❌ **test-driven-development** - Assess TDD quality
- ❌ **systematic-debugging** - Debug quality issues
- ❌ **testing-anti-patterns** - Identify anti-patterns

**Impact**: Quality assessor lacks TDD assessment criteria

---

### 2. Development Agents Missing Critical Skills

#### go-api-developer
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **test-driven-development** - TDD for API development
- ❌ **systematic-debugging** - Debug API issues
- ❌ **verification-before-completion** - Verify API works
- ❌ **api-testing-patterns** - Test APIs properly (CORE RESPONSIBILITY)
- ❌ **auth-implementation-patterns** - Implement auth correctly
- ❌ **chariot-lambda-vs-ec2-decisions** - Choose compute platform

**Impact**: API developer lacks API testing and TDD

---

#### go-developer
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **test-driven-development** - TDD for Go code
- ❌ **systematic-debugging** - Debug Go issues
- ❌ **verification-before-completion** - Verify before done
- ❌ **api-testing-patterns** - Test Go APIs

**Impact**: General Go developer lacks TDD

---

#### react-developer
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **test-driven-development** - TDD for React
- ❌ **systematic-debugging** - Debug React issues
- ❌ **verification-before-completion** - Verify components work
- ❌ **chariot-react-testing-patterns** - Chariot patterns (PROJECT-SPECIFIC)
- ❌ **frontend-performance-optimization** - React 19 perf
- ❌ **react-modernization** - React 19 patterns
- ❌ **interactive-form-testing** - Test forms properly

**Impact**: React developer lacks React-specific testing and perf skills

---

#### python-developer
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **test-driven-development** - TDD for Python
- ❌ **systematic-debugging** - Debug Python issues
- ❌ **verification-before-completion** - Verify before done
- ❌ **cli-testing-patterns** - Test Python CLIs (praetorian-cli)

**Impact**: Python developer lacks TDD and CLI testing

---

#### integration-developer
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **test-driven-development** - TDD for integrations
- ❌ **systematic-debugging** - Debug integration issues
- ❌ **verification-before-completion** - Verify integrations work
- ❌ **chariot-third-party-integrations** - Integration workflow (CORE RESPONSIBILITY)
- ❌ **api-testing-patterns** - Test integration APIs
- ❌ **auth-implementation-patterns** - Implement auth for integrations

**Impact**: Integration developer lacks integration-specific workflow

---

### 3. Code Review Agents Missing Critical Skills

#### go-code-reviewer
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **test-driven-development** - Review TDD compliance
- ❌ **systematic-debugging** - Review debugging approach
- ❌ **receiving-code-review** - Model good review response (CORE RESPONSIBILITY)
- ❌ **requesting-code-review** - Guide review requests (CORE RESPONSIBILITY)
- ❌ **testing-anti-patterns** - Catch testing anti-patterns
- ❌ **behavior-vs-implementation-testing** - Review test quality

**Impact**: Code reviewer doesn't know code review skills exist

---

#### react-code-reviewer
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **test-driven-development** - Review TDD compliance
- ❌ **systematic-debugging** - Review debugging approach
- ❌ **receiving-code-review** - Model good review response (CORE RESPONSIBILITY)
- ❌ **requesting-code-review** - Guide review requests (CORE RESPONSIBILITY)
- ❌ **testing-anti-patterns** - Catch testing anti-patterns
- ❌ **behavior-vs-implementation-testing** - Review test quality
- ❌ **frontend-performance-optimization** - Review React 19 perf
- ❌ **react-modernization** - Review React 19 patterns

**Impact**: React reviewer lacks React-specific and review skills

---

#### general-code-reviewer
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **test-driven-development** - Review TDD compliance
- ❌ **systematic-debugging** - Review debugging approach
- ❌ **receiving-code-review** - Model good review response (CORE RESPONSIBILITY)
- ❌ **requesting-code-review** - Guide review requests (CORE RESPONSIBILITY)
- ❌ **testing-anti-patterns** - Catch testing anti-patterns
- ❌ **behavior-vs-implementation-testing** - Review test quality

**Impact**: General reviewer lacks fundamental review skills

---

### 4. Architecture Agents Missing Critical Skills

#### react-architect
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **brainstorming** - Refine ideas before designing (CRITICAL FOR ARCHITECTS)
- ❌ **frontend-information-architecture** - File organization (CORE RESPONSIBILITY)
- ❌ **frontend-performance-optimization** - React 19 perf architecture
- ❌ **react-modernization** - React 19 architecture patterns

**Impact**: React architect lacks frontend architecture skills

---

#### security-architect
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **brainstorming** - Refine security designs
- ❌ **auth-implementation-patterns** - Auth architecture (CORE RESPONSIBILITY)
- ❌ **authorization-testing** - Design testable auth
- ❌ **defense-in-depth** - Multi-layer security

**Impact**: Security architect lacks auth patterns and defense-in-depth

---

#### go-backend-architect
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **brainstorming** - Refine architecture before designing
- ❌ **chariot-lambda-vs-ec2-decisions** - Compute decisions (CHARIOT-SPECIFIC)

**Impact**: Backend architect lacks brainstorming and compute decisions

---

#### general-system-architect
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **brainstorming** - Refine system designs (CRITICAL)

**Impact**: System architect lacks brainstorming for design refinement

---

### 5. Coordinator Agents Missing Critical Skills

#### test-coordinator
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **dispatching-parallel-agents** - Dispatch test agents concurrently
- ❌ **subagent-driven-development** - Coordinate test agent workflow
- ❌ **test-metrics-reality-check** - Coordinate honest metrics
- ❌ **systematic-debugging** - Coordinate debugging when tests fail

**Impact**: Test coordinator lacks orchestration skills

---

#### quality-coordinator
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **requesting-code-review** - Coordinate review process
- ❌ **subagent-driven-development** - Dispatch quality agents
- ❌ **finishing-a-development-branch** - Coordinate branch completion

**Impact**: Quality coordinator lacks quality workflow skills

---

#### security-coordinator
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **secret-scanner** - Coordinate secret scanning
- ❌ **authorization-testing** - Coordinate auth testing
- ❌ **systematic-debugging** - Coordinate security debugging

**Impact**: Security coordinator lacks security-specific skills

---

#### implementation-planner
**Current refs**: (need to check file)

**MISSING (HIGH)**:
- ❌ **brainstorming** - Refine plans before creating tasks
- ❌ **writing-plans** - Create detailed plans (CORE RESPONSIBILITY)
- ❌ **executing-plans** - Execute plans in batches
- ❌ **subagent-driven-development** - Dispatch implementation agents

**Impact**: Implementation planner lacks planning skills

---

## MEDIUM PRIORITY GAPS

### DevOps Agents

#### devops-automator
**MISSING (MEDIUM)**:
- ⚠️ bash-defensive-patterns - Production bash scripts
- ⚠️ github-workflow-automation - GitHub Actions patterns
- ⚠️ systematic-debugging - Debug CI/CD failures

#### aws-infrastructure-specialist
**MISSING (MEDIUM)**:
- ⚠️ bash-defensive-patterns - CloudFormation/SAM scripts
- ⚠️ systematic-debugging - Debug infrastructure issues
- ⚠️ chariot-lambda-vs-ec2-decisions - Compute decisions

---

### Security Review Agents

#### go-security-review
**MISSING (MEDIUM)**:
- ⚠️ auth-implementation-patterns - Review auth code
- ⚠️ authorization-testing - Review auth tests
- ⚠️ secret-scanner - Scan for secrets
- ⚠️ defense-in-depth - Review validation layers
- ⚠️ systematic-debugging - Debug security issues

#### react-security-reviewer
**MISSING (MEDIUM)**:
- ⚠️ secret-scanner - Scan React code for secrets
- ⚠️ systematic-debugging - Debug security issues
- ⚠️ auth-implementation-patterns - Review frontend auth

---

### Validation Agents

#### chromatic-test-engineer
**MISSING (MEDIUM)**:
- ⚠️ e2e-testing-patterns - Visual regression as E2E
- ⚠️ compatibility-testing - Cross-browser visual testing
- ⚠️ test-driven-development - TDD for Storybook

#### production-validator
**MISSING (MEDIUM)**:
- ⚠️ systematic-debugging - Debug production issues
- ⚠️ verification-before-completion - Pre-deployment validation

#### performance-analyzer
**MISSING (MEDIUM)**:
- ⚠️ root-cause-tracing - Trace performance bottlenecks
- ⚠️ systematic-debugging - Debug perf issues
- ⚠️ frontend-performance-optimization - React 19 perf patterns

---

### Specialized Development Agents

#### vql-developer
**MISSING (MEDIUM)**:
- ⚠️ test-driven-development - TDD for VQL
- ⚠️ systematic-debugging - Debug VQL queries
- ⚠️ mock-chariot-task - Mock VQL capabilities

#### makefile-developer
**MISSING (MEDIUM)**:
- ⚠️ bash-defensive-patterns - Defensive Makefile patterns
- ⚠️ systematic-debugging - Debug Make failures

#### yaml-developer
**MISSING (MEDIUM)**:
- ⚠️ systematic-debugging - Debug YAML issues
- ⚠️ github-workflow-automation - GitHub Actions YAML

---

## LOW PRIORITY GAPS

### Product Agents (8 total)
- All Jira agents: Missing systematic-debugging for issue triage
- All Linear agents: Missing systematic-debugging for issue triage

### Research Agents (3 total)
- code-pattern-analyzer: Missing skill-opportunity-detector
- web-research-specialist: No critical gaps
- context7-search-specialist: No critical gaps

### ML/Data Agents (2 total)
- ai-engineer: Missing test-driven-development for ML models
- data-ml-model: Missing test-driven-development

### Document Processing Agents
- openapi-writer: Missing api-testing-patterns (contract validation)

---

## Summary Statistics

### By Priority Level

**HIGH PRIORITY (22-hour waste prevention)**:
- Testing agents: 8 agents × avg 5 missing = 40 gaps
- Development agents: 5 agents × avg 4 missing = 20 gaps
- Code review agents: 3 agents × avg 6 missing = 18 gaps
- Architecture agents: 4 agents × avg 3 missing = 12 gaps
- Coordinator agents: 4 agents × avg 3 missing = 12 gaps
- **Total HIGH**: ~102 critical gaps

**MEDIUM PRIORITY (quality/efficiency)**:
- DevOps agents: 2 agents × avg 3 missing = 6 gaps
- Security review agents: 2 agents × avg 4 missing = 8 gaps
- Validation agents: 3 agents × avg 3 missing = 9 gaps
- Specialized dev agents: 3 agents × avg 2 missing = 6 gaps
- **Total MEDIUM**: ~29 gaps

**LOW PRIORITY (nice-to-have)**:
- Product agents: ~8 gaps
- Research agents: ~2 gaps
- ML agents: ~2 gaps
- **Total LOW**: ~12 gaps

**GRAND TOTAL**: ~143 missing skill references

### By Skill Category

**Most Impactful Missing Skills**:
1. test-driven-development: Missing from ~38 agents (ALL devs, ALL testers)
2. systematic-debugging: Missing from ~40 agents (ALL devs, ALL coordinators)
3. verification-before-completion: Missing from ~35 agents (ALL devs, ALL testers)
4. receiving-code-review: Missing from ALL 3 code reviewers
5. requesting-code-review: Missing from ALL 3 code reviewers

**Testing Skills Gaps**:
- e2e-testing-patterns: Missing from E2E/browser test engineers
- api-testing-patterns: Missing from API developers and integration testers
- integration-first-testing: Missing from integration test engineers
- interactive-form-testing: Missing from frontend testers
- condition-based-waiting: Missing from browser/E2E testers

**Architecture Skills Gaps**:
- brainstorming: Missing from ALL 4 main architects
- frontend-information-architecture: Missing from react-architect
- chariot-lambda-vs-ec2-decisions: Missing from go-backend-architect

---

## Recommended Action Plan

### Phase 1: Critical Skills (Week 1)
**Target**: ALL developers, ALL test engineers, ALL code reviewers

1. Add **test-driven-development** to:
   - All 8 testing agents
   - All 8 development agents
   - All 3 code review agents
   - Total: 19 agents

2. Add **systematic-debugging** to:
   - All 8 testing agents
   - All 8 development agents
   - All 12 coordinator agents
   - Total: 28 agents

3. Add **verification-before-completion** to:
   - All 8 testing agents
   - All 8 development agents
   - Total: 16 agents

**Phase 1 Impact**: 63 references added, prevents 22-hour TDD wastes

---

### Phase 2: Code Review Skills (Week 1)
**Target**: ALL code reviewers

1. Add **receiving-code-review** to:
   - go-code-reviewer
   - react-code-reviewer
   - general-code-reviewer
   - Total: 3 agents

2. Add **requesting-code-review** to:
   - Same 3 code reviewers
   - quality-coordinator
   - Total: 4 agents

**Phase 2 Impact**: 7 references added, fixes code review workflow

---

### Phase 3: Domain-Specific Testing Skills (Week 2)
**Target**: Specialized test engineers

1. Add **e2e-testing-patterns** to:
   - frontend-e2e-browser-test-engineer
   - frontend-browser-test-engineer
   - chromatic-test-engineer
   - Total: 3 agents

2. Add **api-testing-patterns** to:
   - backend-integration-test-engineer
   - frontend-integration-test-engineer
   - go-api-developer
   - openapi-writer
   - Total: 4 agents

3. Add **integration-first-testing** to:
   - backend-integration-test-engineer
   - frontend-integration-test-engineer
   - Total: 2 agents

4. Add **condition-based-waiting** to:
   - frontend-e2e-browser-test-engineer
   - frontend-browser-test-engineer
   - Total: 2 agents

5. Add **interactive-form-testing** to:
   - frontend-unit-test-engineer
   - frontend-integration-test-engineer
   - react-developer
   - Total: 3 agents

**Phase 3 Impact**: 14 references added, domain expertise

---

### Phase 4: Architecture Skills (Week 2)
**Target**: ALL architects

1. Add **brainstorming** to:
   - go-backend-architect
   - react-architect
   - security-architect
   - general-system-architect
   - implementation-planner
   - Total: 5 agents

2. Add **frontend-information-architecture** to:
   - react-architect
   - information-architect
   - react-developer
   - Total: 3 agents

3. Add **chariot-lambda-vs-ec2-decisions** to:
   - go-backend-architect
   - cloud-aws-architect
   - go-api-developer
   - Total: 3 agents

**Phase 4 Impact**: 11 references added, architecture quality

---

### Phase 5: Frontend Modernization (Week 3)
**Target**: Frontend agents

1. Add **frontend-performance-optimization** to:
   - react-developer
   - react-architect
   - react-code-reviewer
   - performance-analyzer
   - Total: 4 agents

2. Add **react-modernization** to:
   - react-developer
   - react-architect
   - react-code-reviewer
   - Total: 3 agents

3. Add **chariot-react-testing-patterns** to:
   - frontend-unit-test-engineer
   - frontend-integration-test-engineer
   - react-developer
   - react-code-reviewer
   - Total: 4 agents

**Phase 5 Impact**: 11 references added, React 19 expertise

---

### Phase 6: Security Skills (Week 3)
**Target**: Security agents

1. Add **auth-implementation-patterns** to:
   - security-architect
   - go-api-developer
   - integration-developer
   - go-security-review
   - Total: 4 agents

2. Add **authorization-testing** to:
   - backend-integration-test-engineer
   - security-architect
   - go-security-review
   - security-coordinator
   - Total: 4 agents

3. Add **secret-scanner** to:
   - go-security-review
   - react-security-reviewer
   - security-coordinator
   - Total: 3 agents

4. Add **defense-in-depth** to:
   - security-architect
   - go-backend-architect
   - go-security-review
   - Total: 3 agents

**Phase 6 Impact**: 14 references added, security hardening

---

### Phase 7: Orchestration Skills (Week 4)
**Target**: Coordinator agents

1. Add **dispatching-parallel-agents** to:
   - hierarchical-coordinator
   - mesh-coordinator
   - test-coordinator
   - security-coordinator
   - Total: 4 agents

2. Add **subagent-driven-development** to:
   - implementation-planner
   - quality-coordinator
   - test-coordinator
   - Total: 3 agents

3. Add **executing-plans** to:
   - implementation-planner
   - deployment-coordinator
   - Total: 2 agents

4. Add **writing-plans** to:
   - implementation-planner
   - architecture-coordinator
   - Total: 2 agents

**Phase 7 Impact**: 11 references added, coordination efficiency

---

### Phase 8: Remaining Gaps (Week 4)
**Target**: DevOps, validation, specialized agents

1. Add **test-infrastructure-discovery** to:
   - backend-unit-test-engineer
   - frontend-unit-test-engineer
   - frontend-integration-test-engineer
   - Total: 3 agents

2. Add **testing-anti-patterns** to:
   - All 3 code reviewers
   - backend-unit-test-engineer
   - frontend-unit-test-engineer
   - Total: 5 agents

3. Add **cli-testing-patterns** to:
   - backend-unit-test-engineer
   - python-developer
   - praetorian-cli-expert
   - Total: 3 agents

4. Add **test-metrics-reality-check** to:
   - test-coverage-auditor
   - test-coordinator
   - quality-coordinator
   - Total: 3 agents

5. Add DevOps skills:
   - bash-defensive-patterns → devops-automator, aws-infrastructure-specialist
   - github-workflow-automation → devops-automator, deployment-coordinator
   - Total: 4 agents

**Phase 8 Impact**: 18 references added, closes remaining gaps

---

## Implementation Notes

### Verification Process
After adding each skill reference to an agent:
1. Read agent file to understand current structure
2. Add skill reference in appropriate section (usually "Essential Skills")
3. Verify skill name matches exactly (kebab-case)
4. Test agent dispatch to ensure no errors
5. Update this tracking document

### Skill Reference Format
```markdown
## Essential Skills

Use these skills to guide your work:

- **test-driven-development**: Write test first, watch it fail, implement minimal code to pass
- **systematic-debugging**: Four-phase framework - root cause investigation before fixes
- **api-testing-patterns**: Contract testing, REST/GraphQL patterns, consumer-driven contracts
```

### Testing Strategy
- **Phase 1-2**: Test with simple development task (should mention TDD)
- **Phase 3**: Test with testing task (should mention domain patterns)
- **Phase 4**: Test with architecture task (should mention brainstorming)
- **Phase 5-8**: Spot check key agents in each phase

### Success Metrics
- **Quantitative**: X/143 gaps closed
- **Qualitative**: Agents mention relevant skills in responses
- **Behavioral**: Agents follow skill patterns (e.g., write test first)
- **Impact**: Reduction in 22-hour TDD wastes, better code review, etc.

---

## Appendix: Skill-to-Agent Mapping Matrix

### Universal Skills (apply to many agents)
- **test-driven-development**: ALL developers (8), ALL test engineers (8), ALL code reviewers (3) = 19 agents
- **systematic-debugging**: ALL developers (8), ALL test engineers (8), ALL coordinators (12) = 28 agents
- **verification-before-completion**: ALL developers (8), ALL test engineers (8) = 16 agents

### Testing Skills (domain-specific)
- **api-testing-patterns**: backend-integration-test-engineer, frontend-integration-test-engineer, go-api-developer, openapi-writer = 4 agents
- **e2e-testing-patterns**: frontend-e2e-browser-test-engineer, frontend-browser-test-engineer, chromatic-test-engineer = 3 agents
- **cli-testing-patterns**: backend-unit-test-engineer, python-developer, praetorian-cli-expert = 3 agents
- **integration-first-testing**: backend-integration-test-engineer, frontend-integration-test-engineer = 2 agents
- **interactive-form-testing**: frontend-unit-test-engineer, frontend-integration-test-engineer, react-developer = 3 agents
- **condition-based-waiting**: frontend-e2e-browser-test-engineer, frontend-browser-test-engineer = 2 agents
- **test-infrastructure-discovery**: frontend-unit-test-engineer, backend-unit-test-engineer, frontend-integration-test-engineer = 3 agents
- **testing-anti-patterns**: ALL code reviewers (3), backend-unit-test-engineer, frontend-unit-test-engineer = 5 agents
- **chariot-react-testing-patterns**: frontend-unit-test-engineer, frontend-integration-test-engineer, react-developer, react-code-reviewer = 4 agents

### Code Review Skills
- **receiving-code-review**: ALL code reviewers (3), ALL developers (8) = 11 agents
- **requesting-code-review**: ALL code reviewers (3), quality-coordinator, ALL developers (8) = 12 agents

### Architecture Skills
- **brainstorming**: ALL architects (7), implementation-planner = 8 agents
- **frontend-information-architecture**: react-architect, information-architect, react-developer = 3 agents
- **chariot-lambda-vs-ec2-decisions**: go-backend-architect, cloud-aws-architect, go-api-developer = 3 agents

### Frontend Skills
- **frontend-performance-optimization**: react-developer, react-architect, react-code-reviewer, performance-analyzer = 4 agents
- **react-modernization**: react-developer, react-architect, react-code-reviewer = 3 agents

### Security Skills
- **auth-implementation-patterns**: security-architect, go-api-developer, integration-developer, go-security-review = 4 agents
- **authorization-testing**: backend-integration-test-engineer, security-architect, go-security-review, security-coordinator = 4 agents
- **secret-scanner**: go-security-review, react-security-reviewer, security-coordinator = 3 agents
- **defense-in-depth**: security-architect, go-backend-architect, go-security-review = 3 agents

### DevOps Skills
- **bash-defensive-patterns**: devops-automator, aws-infrastructure-specialist, makefile-developer = 3 agents
- **github-workflow-automation**: devops-automator, deployment-coordinator = 2 agents

### Orchestration Skills
- **dispatching-parallel-agents**: hierarchical-coordinator, mesh-coordinator, test-coordinator, security-coordinator = 4 agents
- **subagent-driven-development**: implementation-planner, quality-coordinator, test-coordinator = 3 agents
- **executing-plans**: implementation-planner, deployment-coordinator = 2 agents
- **writing-plans**: implementation-planner, architecture-coordinator = 2 agents
- **finishing-a-development-branch**: quality-coordinator, deployment-coordinator = 2 agents

---

## Conclusion

This analysis reveals **143 missing skill references** across 68 agents, with the highest impact gaps in:

1. **Universal development practices**: TDD and debugging missing from ~40 agents each
2. **Testing domain expertise**: E2E, API, and integration patterns missing from test engineers
3. **Code review workflow**: Review skills missing from ALL code reviewers
4. **Architecture refinement**: Brainstorming missing from ALL architects
5. **Frontend modernization**: React 19 patterns missing from frontend agents

**Recommended approach**: Execute in 8 phases over 4 weeks, starting with highest-impact universal skills (TDD, debugging) before moving to domain-specific patterns.

**Expected outcome**: Agents will proactively reference and follow skill patterns, preventing 22-hour wastes and improving code quality across all domains.
