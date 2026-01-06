# Trigger Scenario Examples

**Purpose**: Pre-designed scenarios that trigger specific skill invocations

**When to read**: Step 4 of verifying-agent-skill-invocation workflow (designing trigger scenarios)

---

## How to Use This Reference

### Finding Scenarios

1. Identify skill you're testing (e.g., `developing-with-tdd`)
2. Find skill in table below
3. Use provided scenario OR adapt for your context

### Adapting Scenarios

**Template pattern**:

```
[ACTION] [SPECIFIC TASK] [CONTEXT/CONSTRAINTS]
```

**Good scenario**:

```
Implement a user authentication function that validates email and password against database records.
```

**Bad scenario** (too vague):

```
Write some code.
```

---

## Common Mandatory Skills

### developing-with-tdd

**Skill Description**: "Use when implementing features or bugfixes - enforces RED-GREEN-REFACTOR cycle"

**Trigger Scenarios**:

1. **Simple function**:

   ```
   Implement a password strength validator that checks for minimum 8 characters,
   at least one uppercase letter, one number, and one special character.
   ```

2. **Component with logic**:

   ```
   Create a React form component for user registration with email validation,
   password strength checking, and matching password confirmation fields.
   ```

3. **Backend handler**:
   ```
   Implement a Go HTTP handler for creating user accounts that validates input,
   checks for duplicate emails, and returns appropriate error codes.
   ```

**Why these trigger TDD**:

- Clear requirements → testable assertions
- Specific validation rules → concrete test cases
- "Implement" verb → new code requires tests

---

### debugging-systematically

**Skill Description**: "Use when encountering bugs, test failures, or unexpected behavior"

**Trigger Scenarios**:

1. **UI bug**:

   ```
   There's a bug in the asset search page. When users type in the search box,
   the results flicker and sometimes show duplicates. Debug this issue.
   ```

2. **Backend error**:

   ```
   The user login endpoint is returning 500 errors intermittently. The logs show
   "database connection timeout" but the database is healthy. Find the root cause.
   ```

3. **Test failure**:
   ```
   The unit test for password validation is failing with "Expected false, got true"
   for the input "weak". Debug why the validator accepts weak passwords.
   ```

**Why these trigger systematic debugging**:

- Describes symptoms (not root cause)
- Requires investigation
- "Debug this" or "Find root cause" explicit instruction

---

### verifying-before-completion

**Skill Description**: "Use when about to claim work complete - requires running verification commands"

**Trigger Scenarios**:

1. **After implementation**:

   ```
   You just finished implementing the email verification feature. It works in your
   manual testing. Are you done?
   ```

2. **After bug fix**:

   ```
   You fixed the logout bug. The logout button now responds correctly when you
   click it in the browser. Can you mark this as complete?
   ```

3. **After refactoring**:
   ```
   You refactored the authentication module to use the new token service. The code
   looks good and compiles without errors. Ready to commit?
   ```

**Why these trigger verification**:

- Implies manual testing only ("works in your manual testing")
- Asks "Are you done?" or "Ready to commit?"
- Tempts claiming complete without formal verification

---

### gateway-frontend

**Skill Description**: "Use when developing frontend - React patterns, state management, UI components"

**Trigger Scenarios**:

1. **New component**:

   ```
   Create a reusable dropdown component for selecting user roles (Admin, Editor, Viewer)
   with proper keyboard navigation and ARIA attributes.
   ```

2. **State management**:

   ```
   Implement global state for user preferences (theme, language, notifications) using
   the appropriate state management pattern for this application.
   ```

3. **Data fetching**:
   ```
   Create a custom hook for fetching and caching user profile data with loading
   states, error handling, and automatic refetch on window focus.
   ```

**Why these trigger gateway-frontend**:

- React-specific tasks (component, hook, state)
- Frontend concerns (UI, accessibility, state)
- Requires frontend patterns and best practices

---

### gateway-backend

**Skill Description**: "Use when developing backend - Go APIs, AWS services, database integration"

**Trigger Scenarios**:

1. **API endpoint**:

   ```
   Implement a REST endpoint POST /api/assets that creates a new asset record
   with validation, duplicate checking, and returns appropriate status codes.
   ```

2. **Database operation**:

   ```
   Create a DynamoDB query function that retrieves all assets for an account
   with pagination support and filtering by status.
   ```

3. **Lambda function**:
   ```
   Implement an AWS Lambda function that processes SQS messages for vulnerability
   scanning jobs, with error handling and dead letter queue support.
   ```

**Why these trigger gateway-backend**:

- Backend-specific tasks (API, database, Lambda)
- Go language context
- AWS service integration

---

### gateway-testing

**Skill Description**: "Use when writing tests - unit, integration, E2E, mocking patterns"

**Trigger Scenarios**:

1. **Unit tests**:

   ```
   Write unit tests for the password validation function covering valid passwords,
   weak passwords, empty input, and special character edge cases.
   ```

2. **Integration tests**:

   ```
   Create integration tests for the user registration endpoint that verify database
   writes, duplicate email handling, and response codes.
   ```

3. **E2E tests**:
   ```
   Write Playwright E2E tests for the complete user login flow including navigation,
   form filling, authentication, and redirect to dashboard.
   ```

**Why these trigger gateway-testing**:

- "Write tests" explicit instruction
- Specific test types mentioned
- Testing concerns (coverage, mocking, E2E)

---

## Designing Custom Trigger Scenarios

### Step 1: Read the Skill

```bash
Read `.claude/skills/{skill-name}/SKILL.md`
```

Look for:

- **Description field**: `"Use when [TRIGGER]..."`
- **When to Use** section
- **Examples** showing triggering contexts

### Step 2: Match the Trigger Condition

Your scenario must match the skill's "Use when" trigger.

**Example**:

```yaml
# Skill description
description: Use when implementing security features - authentication, authorization, input validation, cryptography
```

**Matching scenario**:

```
Implement JWT-based authentication for the API with token validation,
refresh token support, and role-based access control.
```

**Why it matches**: "Implementing security features" + "authentication" keyword

### Step 3: Make It Specific

**Vague** (won't clearly trigger):

```
Build something secure
```

**Specific** (clearly triggers):

```
Implement input sanitization for the user profile update endpoint to prevent
XSS attacks and SQL injection.
```

**Specificity checklist**:

- [ ] Action verb (implement, create, debug, test)
- [ ] Concrete deliverable (function, component, endpoint)
- [ ] Clear requirements (what it should do)
- [ ] Optional: Constraints or edge cases

### Step 4: Avoid Ambiguity

**Ambiguous**:

```
Make the code better
```

Could trigger: refactoring, optimization, testing, debugging, etc.

**Unambiguous**:

```
Refactor the authentication module to extract common token validation logic
into a reusable middleware function.
```

Clearly triggers: refactoring patterns

---

## Scenario Testing Checklist

Before using a trigger scenario, verify:

- [ ] Clearly requires the skill being tested
- [ ] Specific enough to have concrete deliverable
- [ ] Not ambiguous (doesn't trigger multiple skills)
- [ ] Realistic (not academic or artificial)
- [ ] Concise (1-3 sentences max)

---

## When Scenarios Don't Trigger

### Agent Doesn't Invoke Expected Skill

**Possible reasons**:

1. **Scenario too vague** - Agent didn't recognize trigger
2. **Skill not in agent frontmatter** - Agent can't access skill
3. **Agent instructions unclear** - Doesn't know when to invoke
4. **Scenario triggers different skill** - Ambiguous scenario

**Diagnosis**:

```
1. Read agent frontmatter → Is skill listed in `skills:` field?
2. Read agent body → Does "Mandatory Skills" section mention it?
3. Read skill description → Does scenario match "Use when"?
4. Check scenario → Is it unambiguous?
```

**Fix**:

- Update scenario to better match skill trigger
- OR update agent to emphasize this skill
- OR accept that scenario doesn't require this skill

---

## Advanced: Multi-Skill Scenarios

Some tasks naturally require multiple skills:

```
Implement a user authentication feature with email/password validation,
secure password hashing, and comprehensive test coverage.
```

**Expected skills invoked**:

- `developing-with-tdd` (implementing feature)
- `gateway-backend` (authentication, security patterns)
- `gateway-testing` (test coverage)

**Use for**: Integration testing (does agent coordinate multiple skills?)

**Not for**: Single skill verification (use focused scenarios instead)

---

## Scenario Template Library

### Generic Template

```
[VERB] a [COMPONENT/FUNCTION/FEATURE] that [REQUIREMENTS] with [CONSTRAINTS/EDGE CASES].
```

### Examples by Skill Type

**Implementation skills** (developing-with-tdd, gateway-frontend, gateway-backend):

```
Implement a [specific feature] that [clear requirements].
Create a [component/function] with [validation/features].
Build a [system] that handles [scenarios].
```

**Debugging skills** (debugging-systematically):

```
There's a bug where [symptom]. [Additional context]. Debug this.
The [feature] is failing with [error]. Find root cause.
[Component] doesn't work when [condition]. Investigate.
```

**Verification skills** (verifying-before-completion):

```
You just finished [task]. It works in [manual test]. Are you done?
You [completed work]. [Evidence of manual validation]. Ready to commit?
```

**Architecture skills** (gateway-security, gateway-integrations):

```
Design [system] that [requirements] with [security/integration concerns].
```

---

## Next Steps

After reading trigger scenarios, return to verifying-agent-skill-invocation workflow Step 4.
