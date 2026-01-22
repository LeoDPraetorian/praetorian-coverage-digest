# Scratchpad Template

Copy-paste template for iteration scratchpads.

## Template

```markdown
# Iteration Scratchpad: {task-description}

## Configuration

- **Completion Promise**: {promise}
- **Max Iterations**: {max}
- **Started**: {timestamp}

## Iteration History

### Iteration 1

- **Status**: in_progress
- **Accomplished**: [Starting task - initial assessment]
- **Errors encountered**: None yet
- **Next steps**: [First action to take]

### Iteration 2

- **Status**: progressing
- **Accomplished**: [What was done]
- **Errors encountered**: [Any errors to avoid]
- **Next steps**: [Next action]

## Context

### Key Decisions

- [Important decisions made during iterations]

### Files Touched

- [File paths modified]

### Patterns Discovered

- [Patterns to follow in future iterations]

## Error History (Last 5)

| Iteration | Error                | Resolution Attempted    |
| --------- | -------------------- | ----------------------- |
| 2         | TypeError at line 45 | Added null check        |
| 3         | Test timeout         | Increased async timeout |

## Notes

[Any additional context for future iterations]
```

## Field Descriptions

### Status Values

| Status        | Meaning                             |
| ------------- | ----------------------------------- |
| `in_progress` | Currently working, not blocked      |
| `progressing` | Making forward progress             |
| `blocked`     | Cannot proceed without intervention |

### Accomplished

Brief description of what was done this iteration. Be specific:

```markdown
# Good

- Fixed login test by adding mock for authService
- Implemented retry logic in fetchUser()

# Bad

- Worked on tests
- Made some fixes
```

### Errors Encountered

Track errors to avoid repetition:

```markdown
# Good

- TypeError: Cannot read property 'id' of null at auth.ts:45
- Test timeout: login.test.ts:78 exceeded 5000ms

# Bad

- Some errors
- Tests failed
```

### Next Steps

What to try in the next iteration:

```markdown
# Good

- Add null check for user.profile before accessing
- Mock the network delay in integration tests

# Bad

- Fix the bug
- Make tests pass
```

## Location Rules

**In orchestrated workflow**:

```
{feature_directory}/scratchpad-{task-slug}.md
```

**Standalone**:

```
.claude/.output/scratchpad-{timestamp}-{task-slug}.md
```

## Naming Convention

**Task slug**: Lowercase, hyphenated description of task.

Examples:

- `scratchpad-fix-auth-tests.md`
- `scratchpad-implement-retry-logic.md`
- `scratchpad-research-oauth-patterns.md`

## Example: Test-Fix Scratchpad

```markdown
# Iteration Scratchpad: Fix Authentication Tests

## Configuration

- **Completion Promise**: ALL_TESTS_PASSING
- **Max Iterations**: 5
- **Started**: 2026-01-14T10:30:00Z

## Iteration History

### Iteration 1

- **Status**: in_progress
- **Accomplished**: Ran test suite, identified 3 failing tests in auth.test.ts
- **Errors encountered**: None
- **Next steps**: Fix login test - missing authService mock

### Iteration 2

- **Status**: progressing
- **Accomplished**: Fixed login test by mocking authService.authenticate()
- **Errors encountered**: logout test still failing - different issue
- **Next steps**: Investigate logout test - seems to be async timing issue

### Iteration 3

- **Status**: progressing
- **Accomplished**: Fixed logout test with proper async/await handling
- **Errors encountered**: None
- **Next steps**: Fix refresh token test - last one failing

### Iteration 4

- **Status**: in_progress
- **Accomplished**: Fixed refresh token test, all tests passing
- **Errors encountered**: None
- **Next steps**: N/A - ALL_TESTS_PASSING

## Context

### Key Decisions

- Used jest.mock() for authService rather than manual mock
- Added 100ms delay in logout test to handle async cleanup

### Files Touched

- src/auth/**tests**/auth.test.ts
- src/auth/authService.ts (added exportable mock helper)

### Patterns Discovered

- All auth tests need authService mock setup in beforeEach
- Logout cleanup requires await on async operations

## Error History (Last 5)

| Iteration | Error                                      | Resolution Attempted            |
| --------- | ------------------------------------------ | ------------------------------- |
| 1         | authService.authenticate is not a function | Added jest.mock for authService |
| 2         | logout test timeout                        | Added async/await to cleanup    |

## Notes

Authentication tests now all passing. Pattern established for future auth-related tests.
```
