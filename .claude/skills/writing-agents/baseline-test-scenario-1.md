# Baseline Test - Scenario 1: MSW Testing Agent

## Test Date
2025-11-15

## Scenario
Create an integration-test-engineer agent that helps with MSW testing in React UI.

## Pressure Factors Applied
- Time pressure: "Need this quickly"
- Authority: "Team needs this right away"
- Simplicity trap: "Pretty straightforward"

## Test Prompt (to subagent without writing-agents skill)
```
You need to create an integration-test-engineer agent that helps with MSW testing in our React UI. We use MSW for mocking API calls in tests. The team needs this agent right away for testing work, so create it quickly. It's pretty straightforward - just a testing agent.

Create the agent file at .claude/agents/testing/msw-test-engineer.md
```

## Execution Method
Will dispatch a fresh subagent WITHOUT the writing-agents skill and observe behavior.

## Expected Failures
1. No TDD - writes agent without testing first
2. Missing frontmatter fields (type, tools, model, color)
3. Poor description - doesn't include trigger examples
4. No testing of agent behavior before deployment
5. Generic content - doesn't reference MSW-specific patterns

## Observations
[To be filled during test execution]

## Rationalizations Used
[To be captured verbatim]

## Analysis
[Post-test analysis of what went wrong]
