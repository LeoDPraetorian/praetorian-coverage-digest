# Delegation Templates

Pre-built prompt templates for delegating to specialized agents.

## Template Structure

Every delegation prompt should include:

```markdown
Task: [Clear objective - what to accomplish]

Context from prior phases:
- [Key decisions from architecture]
- [Implementation details if relevant]
- [File locations, patterns used]

Scope: [What to do] / [What NOT to do]

Expected output:
- [Specific deliverables]
- [File locations for artifacts]
- [Output format for results]
```

## Architecture Agent Templates

### Backend Architecture

```markdown
Task: Design [feature] architecture for the Chariot backend

Requirements:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

Constraints:
- Must integrate with existing DynamoDB single-table design
- Follow Chariot's handler/service/repository pattern
- Consider async processing via SQS if appropriate

Scope: Architecture decisions only. Do NOT implement code.

Expected output:
- Service boundaries and responsibilities
- Database schema design (DynamoDB key patterns)
- API contract (endpoints, request/response)
- Queue design if async processing needed
- Return as structured JSON with rationale for each decision
```

### Frontend Architecture

```markdown
Task: Design component architecture for [feature]

Requirements:
- [User-facing requirement 1]
- [User-facing requirement 2]

Current context:
- Existing section: src/sections/[section]/
- Related components: [list any similar components]

Constraints:
- Follow Chariot UI complexity tiers (Tier 1/2/3)
- Use TanStack Query for data fetching
- Use Zustand only if complex cross-component state needed

Scope: Architecture decisions only. Do NOT implement code.

Expected output:
- Component hierarchy and file organization
- State management approach (local vs shared)
- Data fetching strategy
- Return as structured JSON with tier classification
```

## Developer Agent Templates

### Backend Implementation

```markdown
Task: Implement [feature] based on architecture decisions

Context from architecture:
- API contract: [endpoints, methods]
- Database schema: [DynamoDB patterns]
- Service boundaries: [which packages]

Location: modules/chariot/backend/pkg/handler/handlers/[domain]/

Implementation requirements:
1. Create handler following existing patterns in [similar handler]
2. Add input validation using JSON schema
3. Implement service layer if business logic complex
4. Add structured logging with request IDs

Scope: Implementation + basic tests. Do NOT create acceptance tests.

Expected output:
- Handler file at [path]
- Service file at [path] if needed
- Unit test file with table-driven tests
- Return structured JSON with files created and test results
```

### Frontend Implementation

```markdown
Task: Implement [component] based on architecture decisions

Context from architecture:
- Component tier: [1/2/3]
- State approach: [local/Zustand/context]
- API endpoints: [list endpoints]

Location: src/sections/[section]/components/

Implementation requirements:
1. Follow Chariot UI patterns from [similar component]
2. Use TanStack Query for data fetching
3. Include loading and error states
4. Add appropriate accessibility attributes

Scope: Implementation + basic tests. Follow TDD.

Expected output:
- Component file at [path]
- Hook file at [path] if data fetching needed
- Unit test file with React Testing Library
- Return structured JSON with files created and test results
```

## Test Engineer Templates

### Unit Test Engineer

```markdown
Task: Create comprehensive unit tests for [component/handler]

Context from implementation:
- File location: [path to file]
- Key functionality: [list main functions]
- Dependencies: [what's mocked vs real]

Test requirements:
1. Cover happy path for each public function
2. Cover error scenarios and edge cases
3. Use table-driven tests for multiple scenarios
4. Mock external dependencies (APIs, database)

Scope: Unit tests ONLY. Do NOT create integration or E2E tests.

Expected output:
- Test file at [path]
- Minimum 80% coverage for the file
- Return structured JSON with:
  - Test count
  - Coverage percentage
  - Any gaps identified
```

### Integration Test Engineer

```markdown
Task: Create integration tests for [API/service]

Context from implementation:
- API endpoints: [list endpoints]
- External dependencies: [AWS services, third-party APIs]
- Expected behavior: [describe flows]

Test requirements:
1. Test API contract compliance
2. Use MSW for HTTP mocking / localstack for AWS
3. Cover success and error response codes
4. Validate response shapes

Scope: Integration tests ONLY. Do NOT create E2E or unit tests.

Expected output:
- Test file at [path]
- MSW handlers if HTTP mocking needed
- Return structured JSON with test results
```

### E2E Test Engineer

```markdown
Task: Create E2E tests for [user workflow]

Context from implementation:
- Page location: [route/URL]
- User flow: [step by step]
- Key interactions: [buttons, forms, etc.]

Test requirements:
1. Use Playwright page object model
2. Cover complete user journey
3. Include assertions for each step
4. Handle loading states with waitFor

Scope: E2E tests ONLY. Do NOT create unit or integration tests.

Expected output:
- Test file at e2e/tests/[path]
- Page object if new page being tested
- Return structured JSON with:
  - Scenarios covered
  - Test results
  - Screenshots if failures
```

## Reviewer Agent Templates

### Code Quality Review

```markdown
Task: Review implementation for code quality

Files to review:
- [path 1]
- [path 2]

Context:
- Requirements: [original requirements]
- Architecture decisions: [key decisions]

Review criteria:
1. Does implementation match requirements?
2. Are patterns consistent with codebase?
3. Is error handling comprehensive?
4. Is code maintainable and readable?

Scope: Review ONLY. Do NOT fix issues yourself.

Expected output:
Return structured JSON with:
- assessment: "approved" | "changes_required"
- strengths: [list]
- issues: [
    { severity: "critical|important|minor", description, file, line }
  ]
- suggestions: [optional improvements]
```

### Security Review

```markdown
Task: Review implementation for security vulnerabilities

Files to review:
- [path 1]
- [path 2]

Context:
- Feature handles: [auth/user input/secrets/etc.]
- Attack surface: [describe exposure]

Review criteria:
1. Input validation (injection prevention)
2. Authentication/authorization checks
3. Sensitive data handling
4. Error messages (no information leakage)
5. OWASP Top 10 compliance

Scope: Security review ONLY. Do NOT fix issues yourself.

Expected output:
Return structured JSON with:
- risk_level: "low" | "medium" | "high" | "critical"
- vulnerabilities: [
    { severity, type, description, file, line, remediation }
  ]
- recommendations: [security improvements]
```

## Using Templates

### 1. Select appropriate template

Match task to agent type:
- Design decisions → Architecture template
- Write code → Developer template
- Write tests → Test Engineer template
- Review code → Reviewer template

### 2. Fill in context

Replace placeholders with:
- Actual file paths
- Real requirements
- Prior phase outputs

### 3. Adjust scope

Be explicit about boundaries:
- What agent SHOULD do
- What agent should NOT do

### 4. Verify output format

Ensure you request:
- Specific deliverables
- Structured JSON for easy parsing
- Files created/modified list
