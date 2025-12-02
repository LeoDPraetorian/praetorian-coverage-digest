# Task Domain Detection - Pressure Test Scenarios

## Purpose
Stress test the skill with adversarial, ambiguous, and edge-case scenarios to validate robustness.

## Test Categories

### Category 1: Maximum Ambiguity (Stress Confidence Scoring)

**Scenario 1.1: Minimal Context**
```
Task: "Fix the bug"
Expected Behavior:
- Should explicitly state INSUFFICIENT INFORMATION
- Should list domains that MIGHT apply (with LOW confidence)
- Should ask clarifying questions about which bug, which domain
- Should NOT default to spawning agents without clarity
```

**Scenario 1.2: Contradictory Signals**
```
Task: "Add backend authentication but only update the UI"
Expected Behavior:
- Should identify contradiction explicitly
- Should classify as AMBIGUOUS with reasoning
- Should ask user to clarify: backend API + frontend UI, OR frontend-only?
- Should provide confidence scores showing uncertainty
```

**Scenario 1.3: Domain-Neutral Language**
```
Task: "Improve the system"
Expected Behavior:
- Should flag as TOO VAGUE for classification
- Should list possible interpretations (performance, security, UI/UX)
- Should request specific area to improve
- Should NOT assume any domain
```

### Category 2: Technology Abstraction (Stress Domain Mapping)

**Scenario 2.1: Unknown Technology**
```
Task: "Add Redis caching to user sessions"
Expected Behavior:
- Should abstract "Redis" to "caching layer"
- Should identify backend domain (HIGH confidence)
- Should suggest aws-infrastructure-specialist (ElastiCache in Chariot)
- Should NOT block on "Redis not explicitly supported"
```

**Scenario 2.2: Technology Mismatch**
```
Task: "Create PostgreSQL table for user profiles"
Expected Behavior:
- Should abstract "PostgreSQL" to "database schema"
- Should note Chariot uses DynamoDB, NOT PostgreSQL
- Should suggest database-architect OR go-api-developer (DynamoDB patterns)
- Should NOT block, should provide adaptation path
```

**Scenario 2.3: Multi-Technology Stack**
```
Task: "Set up Kafka event streaming between microservices"
Expected Behavior:
- Should abstract "Kafka" to "event streaming"
- Should suggest Chariot alternatives (Kinesis, SQS)
- Should identify backend + infrastructure domains
- Should provide HIGH confidence despite tech mismatch
```

### Category 3: Full-Stack vs Single-Domain Disambiguation

**Scenario 3.1: Implicit Full-Stack**
```
Task: "Add user profiles"
Expected Behavior:
- Should classify as FULL-STACK (HIGH confidence 90%+)
- Should spawn BOTH go-api-developer AND react-developer
- Should explicitly state "Requires both backend (profile API) and frontend (profile UI)"
- Should NOT assume frontend-only OR backend-only
```

**Scenario 3.2: Explicit Backend-Only with Frontend Confusion**
```
Task: "Add /api/profiles endpoint. Frontend team will handle the UI."
Expected Behavior:
- Should classify as BACKEND-ONLY (HIGH confidence 95%+)
- Should spawn ONLY go-api-developer
- Should explicitly note "Frontend explicitly excluded"
- Should NOT spawn react-developer
```

**Scenario 3.3: Implicit Frontend-Only**
```
Task: "Add profile page. API already returns profile data."
Expected Behavior:
- Should classify as FRONTEND-ONLY (HIGH confidence 95%+)
- Should spawn ONLY react-developer
- Should explicitly note "Backend API exists, no backend work needed"
- Should NOT spawn go-api-developer
```

### Category 4: Test Agent Ordering (Stress Phase Separation)

**Scenario 4.1: Test-First Language**
```
Task: "Write tests for authentication and implement the feature"
Expected Behavior:
- Should REORDER to implementation-first approach
- Should explicitly state "Implementation must precede testing"
- Phase 1: Implement authentication (go-api-developer, react-developer)
- Phase 2: Write tests (backend-unit-test-engineer, etc.)
- Should NOT spawn test agents in Phase 1
```

**Scenario 4.2: Mixed Implementation and Testing**
```
Task: "Add filter dropdown, update Makefile, and write E2E tests"
Expected Behavior:
- Should separate into distinct phases
- Phase 1: react-developer (filter dropdown)
- Phase 2: makefile-developer (Makefile dependencies)
- Phase 3: frontend-e2e-browser-test-engineer (tests AFTER implementation)
- Should NOT list test agents with implementation agents
```

**Scenario 4.3: Test-Only Request**
```
Task: "Write unit tests for the authentication module"
Expected Behavior:
- Should classify as TESTING-ONLY (HIGH confidence)
- Should verify authentication code EXISTS before spawning test agents
- Should suggest backend-unit-test-engineer
- Should NOT spawn implementation agents
```

### Category 5: Multi-Domain Parallelization (Stress Execution Planning)

**Scenario 5.1: Independent Domains**
```
Task: "Add export CSV button and update GitHub Actions workflow"
Expected Behavior:
- Should identify 2 INDEPENDENT domains
- Phase 1 (PARALLEL):
  - react-developer (export button)
  - yaml-developer (GitHub Actions)
- Should NOT make them sequential
- Should explicitly state "Independent - can run in parallel"
```

**Scenario 5.2: Dependent Domains**
```
Task: "Add WebSocket endpoint, create UI to consume it, and update Makefile for dependencies"
Expected Behavior:
- Should identify dependencies
- Phase 1 (PARALLEL): go-api-developer (WebSocket), react-developer (UI client)
- Phase 2 (SEQUENTIAL): makefile-developer (AFTER Phase 1, needs dependency list)
- Should explicitly state dependency reasoning
```

**Scenario 5.3: Complex Dependency Chain**
```
Task: "Design security architecture, implement backend API, create frontend UI, add CI/CD pipeline"
Expected Behavior:
- Should create multi-phase plan with clear dependencies
- Phase 1: security-architect (architecture FIRST)
- Phase 2 (PARALLEL): go-api-developer, react-developer (implementation)
- Phase 3: devops-automator, yaml-developer (CI/CD AFTER code exists)
- Should NOT run all in parallel
```

### Category 6: Agent Selection Specificity (Stress Agent Choice)

**Scenario 6.1: Generic Request Needing Specific Agent**
```
Task: "Build a REST API for managing assets"
Expected Behavior:
- Should choose go-api-developer (SPECIFIC), NOT go-developer (generic)
- Should explicitly state "REST API requires API-specific patterns"
- Should provide HIGH confidence (95%+)
- Should NOT use generic backend agents
```

**Scenario 6.2: Architecture vs Implementation**
```
Task: "Should we use microservices or monolith for new feature?"
Expected Behavior:
- Should choose go-architect (architecture decision), NOT go-developer
- Should classify as ARCHITECTURE-ONLY (no implementation yet)
- Should provide HIGH confidence for architect selection
- Should NOT spawn implementation agents until architecture decided
```

**Scenario 6.3: Multiple Agent Options**
```
Task: "Add database for storing scan results"
Expected Behavior:
- Should list MULTIPLE options with confidence:
  1. go-api-developer (if DynamoDB single-table) - MEDIUM confidence
  2. database-neo4j-architect (if graph relationships) - LOW confidence
  3. database-architect (if new schema design) - MEDIUM confidence
- Should ask user to clarify database type OR default to Chariot standard
- Should provide reasoning for each option
```

### Category 7: YAML Domain Detection (Stress Infrastructure Recognition)

**Scenario 7.1: Implicit YAML**
```
Task: "Add staging deployment pipeline"
Expected Behavior:
- Should identify YAML domain (HIGH confidence)
- Should suggest yaml-developer + devops-automator
- Should explicitly note "Deployment pipelines use YAML configuration"
- Should NOT miss YAML domain
```

**Scenario 7.2: CloudFormation Infrastructure**
```
Task: "Add DynamoDB table via CloudFormation"
Expected Behavior:
- Should identify BOTH YAML and AWS infrastructure domains
- Should spawn yaml-developer (CloudFormation syntax)
- Should spawn aws-infrastructure-specialist (AWS resource design)
- Should note both agents work together
```

**Scenario 7.3: GitHub Actions Workflow**
```
Task: "Add automated security scanning on PR"
Expected Behavior:
- Should identify YAML domain (HIGH confidence)
- Should spawn yaml-developer (.github/workflows/*.yml)
- Should potentially spawn devops-automator (if complex automation)
- Should NOT miss that workflows are YAML files
```

### Category 8: Confidence Score Calibration (Stress Scoring Accuracy)

**Scenario 8.1: Should Be HIGH but Might Be Misclassified**
```
Task: "Add login form component with email and password fields"
Expected Behavior:
- React/Frontend: HIGH (98%+) - Explicit UI component
- Testing: MEDIUM (70%) - Implied
- Backend: LOW (10%) - No backend mentioned
- Should NOT give backend HIGH confidence
```

**Scenario 8.2: Should Be MEDIUM Due to Ambiguity**
```
Task: "Add real-time updates"
Expected Behavior:
- Backend (WebSocket): MEDIUM (70%) - Likely but not certain
- Frontend (WebSocket client): MEDIUM (70%) - Likely but not certain
- Should NOT give HIGH confidence without more context
- Should ask: "Real-time via WebSocket, polling, or other mechanism?"
```

**Scenario 8.3: Should Be LOW Due to Speculation**
```
Task: "Improve performance"
Expected Behavior:
- Backend optimization: LOW (40%) - Could be backend
- Frontend optimization: LOW (40%) - Could be frontend
- Database optimization: LOW (30%) - Could be database
- Should NOT give HIGH confidence to any domain
- Should ask: "Which component needs performance improvement?"
```

### Category 9: Edge Cases (Stress Boundary Conditions)

**Scenario 9.1: Empty Task**
```
Task: ""
Expected Behavior:
- Should detect empty input
- Should request task description
- Should NOT attempt classification
- Should NOT spawn any agents
```

**Scenario 9.2: Single-Word Task**
```
Task: "Dashboard"
Expected Behavior:
- Should request clarification
- Should list possible interpretations:
  - Create new dashboard (react-developer)
  - Fix dashboard bug (need more context)
  - Design dashboard architecture (react-architect)
- Should NOT assume single interpretation
```

**Scenario 9.3: Extremely Long Task Description (500+ words)**
```
Task: [Very detailed multi-paragraph task with 10+ requirements]
Expected Behavior:
- Should parse ALL requirements
- Should identify ALL domains mentioned
- Should create multi-phase execution plan
- Should NOT miss domains buried in long text
- Should handle complexity without truncation
```

### Category 10: Real-World Chariot Scenarios (Stress Platform Context)

**Scenario 10.1: Attack Surface Management Feature**
```
Task: "Add asset discovery for cloud resources"
Expected Behavior:
- Should understand Chariot domain context (Asset, Seed, Job patterns)
- Backend: HIGH (95%) - Asset discovery logic
- Frontend: MEDIUM (70%) - UI for discovered assets
- AWS: HIGH (90%) - Cloud resource scanning
- Should spawn: go-api-developer, aws-infrastructure-specialist, potentially react-developer
```

**Scenario 10.2: Security Scanning Capability**
```
Task: "Add Nuclei template integration for vulnerability scanning"
Expected Behavior:
- Should understand security scanning domain
- Backend: HIGH (95%) - Capability execution, Job processing
- Infrastructure: MEDIUM (70%) - May need Lambda/Fargate for execution
- Should spawn: go-api-developer, potentially aws-infrastructure-specialist
- Should NOT spawn frontend unless UI explicitly mentioned
```

**Scenario 10.3: Neo4j Graph Relationship**
```
Task: "Model attack paths between compromised assets"
Expected Behavior:
- Should identify Neo4j graph domain (HIGH confidence)
- Should spawn database-neo4j-architect
- Backend: HIGH (90%) - API for querying attack paths
- Frontend: MEDIUM (70%) - Visualization likely needed
- Should create multi-agent plan
```

## Success Criteria

For each scenario, the skill MUST:
1. ✅ Provide explicit confidence scores (HIGH/MEDIUM/LOW with percentages)
2. ✅ State reasoning for each classification
3. ✅ Handle ambiguity gracefully (ask questions, provide alternatives)
4. ✅ Abstract technologies correctly
5. ✅ Separate implementation and testing phases
6. ✅ Choose specific agents over generic agents
7. ✅ Identify YAML domain for infrastructure
8. ✅ Determine full-stack vs single-domain correctly
9. ✅ Create proper execution plans with parallel/sequential phasing
10. ✅ NOT block on technology mismatches

## Failure Modes to Watch For

- ❌ Spawning test agents before implementation agents
- ❌ Blocking on specific technology (PostgreSQL vs DynamoDB)
- ❌ Missing YAML domain for infrastructure tasks
- ❌ Using generic agents when specific agents exist
- ❌ No confidence scores or reasoning
- ❌ Assuming full-stack without explicitly stating it
- ❌ Ignoring explicit statements ("API already exists")
- ❌ Making all phases parallel (ignoring dependencies)
- ❌ Giving HIGH confidence to speculative classifications

## Test Execution Protocol

For each scenario:
1. Present task description to Claude using the skill
2. Capture domain classification output
3. Validate against expected behavior
4. Record deviations as failures
5. Calculate pass/fail rate per category
6. Identify patterns in failure modes

Target: 90%+ scenarios must meet ALL success criteria.
