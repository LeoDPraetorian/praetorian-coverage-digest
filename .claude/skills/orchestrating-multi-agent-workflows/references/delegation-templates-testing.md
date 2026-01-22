# Delegation Templates: Testing

**Parent**: [delegation-templates.md](delegation-templates.md)

Templates for unit, integration, and E2E test engineer agents.

---

## Unit Test Engineer

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

---

## Integration Test Engineer

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

---

## E2E Test Engineer

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

---

## Related

- **Main templates**: [delegation-templates.md](delegation-templates.md)
- **Review + Skills**: [delegation-templates-review-skills.md](delegation-templates-review-skills.md)
