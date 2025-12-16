# Structured Test Format for Skill Updates

**Regression-testable format for documenting skill update failures and expected behavior.**

## When to Use

Create structured tests for:
- Critical skill updates affecting workflows
- Fixes for reported bugs (regression prevention)
- Changes to mandatory rules or checkpoints
- Major content additions

## File Location

Create test files in the skill's `evaluations/` directory:
```
{skill-path}/evaluations/test-case-{number}.json
```

## Test Case Schema

```json
{
  "name": "Descriptive test name",
  "created": "YYYY-MM-DD",
  "type": "update-regression",
  "query": "Specific user request that triggered this update",
  "before_behavior": "What the skill did wrong before this update",
  "expected_behavior": [
    "Behavior 1 - what skill should do after update",
    "Behavior 2 - what skill should do after update"
  ],
  "red_failure": "The specific failure documented in RED phase"
}
```

## Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Short, descriptive test name |
| `created` | Yes | Date test was created (YYYY-MM-DD) |
| `type` | Yes | Always `"update-regression"` for update tests |
| `query` | Yes | The user request that triggered this update |
| `before_behavior` | Yes | What the skill did wrong before |
| `expected_behavior` | Yes | Array of expected behaviors after update |
| `red_failure` | Yes | The specific failure from RED phase |

## Example Test Cases

### Rule Change Test
```json
{
  "name": "REFACTOR skip detection",
  "created": "2025-12-15",
  "type": "update-regression",
  "query": "Update my skill with a minor typo fix",
  "before_behavior": "REFACTOR was skipped for all minor changes including rule tweaks",
  "expected_behavior": [
    "Skill correctly identifies if change is cosmetic-only",
    "REFACTOR runs for any rule or workflow changes",
    "Skip criteria requires ALL cosmetic conditions met"
  ],
  "red_failure": "Rule modifications were skipped under 'minor wording change' rationalization"
}
```

### Workflow Change Test
```json
{
  "name": "Backup creation mandatory",
  "created": "2025-12-15",
  "type": "update-regression",
  "query": "Fix the description in my skill",
  "before_behavior": "Fixes were applied without creating backups",
  "expected_behavior": [
    "Backup is created before any edits",
    "Backup location is documented",
    "Cannot proceed without backup verification"
  ],
  "red_failure": "Auto-fix corrupted skill with no way to rollback"
}
```

### Content Update Test
```json
{
  "name": "Progressive disclosure enforcement",
  "created": "2025-12-15",
  "type": "update-regression",
  "query": "Add detailed examples to my skill",
  "before_behavior": "Content was added inline, exceeding 500 line limit",
  "expected_behavior": [
    "Size check occurs before adding content",
    "Content >50 lines triggers extraction workflow",
    "Final SKILL.md stays under 500 lines"
  ],
  "red_failure": "Skill became 687 lines with inline content"
}
```

## Benefits of Structured Tests

- **Regression testing**: Re-run after future changes to ensure fix still works
- **Quantitative**: Track pass/fail rate over time
- **Documentation**: Shows what changed and why
- **Team visibility**: Others understand the update rationale
- **Audit trail**: Links RED failures to expected GREEN behavior

## Running Tests

Currently, tests are run manually by:
1. Loading the skill
2. Presenting the `query` to Claude
3. Verifying Claude exhibits all `expected_behavior`
4. Comparing to `before_behavior` to confirm improvement

**Note**: Anthropic doesn't provide built-in evaluation tooling. You may build custom test runners or use manual verification.
