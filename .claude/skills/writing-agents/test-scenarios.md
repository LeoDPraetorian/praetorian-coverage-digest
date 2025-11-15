# Writing Agents - Test Scenarios

## Purpose
These scenarios test agent creation methodology WITHOUT the writing-agents skill (baseline), then WITH the skill (validation).

## Scenario 1: Creating MSW Testing Agent (Missing Context)

**Setup:** Request creation of an agent for MSW (Mock Service Worker) testing in React applications.

**Pressure factors:**
- Time pressure: "Need this quickly for testing work"
- Authority: "The team needs this agent right away"
- Simplicity trap: "It's just a testing agent, pretty straightforward"

**Task:**
> "Create an integration-test-engineer agent that helps with MSW testing in our React UI. We use MSW for mocking API calls in tests. Make it comprehensive."

**Expected baseline failures (without skill):**
1. No TDD - writes agent without testing first
2. Missing frontmatter fields (type, tools, model, color)
3. Poor description - doesn't include trigger examples
4. No testing of agent behavior before deployment
5. Generic content - doesn't reference MSW-specific patterns

## Scenario 2: Creating Data Validation Agent (Complexity)

**Setup:** Request creation of an agent for data validation across backend and frontend.

**Pressure factors:**
- Scope creep: "Should handle both Go and TypeScript validation"
- Expertise assumption: "I know what this needs, just write it"
- Skip testing: "We can iterate after deploying"

**Task:**
> "Create a data-validation-specialist agent that handles input validation, schema validation, and data integrity checks across our stack. Should work with both backend (Go) and frontend (TypeScript)."

**Expected baseline failures (without skill):**
1. No baseline testing to identify gaps
2. Too broad scope - tries to handle everything
3. Missing examples in description
4. No verification of agent understanding validation patterns
5. Unclear triggers - when would you use this vs other agents?

## Scenario 3: Creating Documentation Agent (Rationalization)

**Setup:** Request creation of an agent that writes technical documentation.

**Pressure factors:**
- "It's just documentation" - seems simple
- "I already know what good docs look like" - overconfidence
- "Testing documentation agents is overkill" - rationalization

**Task:**
> "Create a technical-documentation-writer agent that creates comprehensive API docs, architecture docs, and README files for our modules."

**Expected baseline failures (without skill):**
1. "Documentation is straightforward, no need to test" rationalization
2. Missing frontmatter structure (color, model, tools)
3. No examples in description field
4. Agent not tested against actual documentation tasks
5. No clear triggers for when to use vs manual documentation

## Scenario 4: Updating Existing Agent (No Testing Protocol)

**Setup:** Request to update the integration-test-engineer agent to include MSW knowledge.

**Pressure factors:**
- "It's just an update" - minimize scope
- "The agent already exists" - assume testing not needed
- "Quick fix" mentality

**Task:**
> "Update the integration-test-engineer agent to include MSW testing patterns. Add context about our MSW setup in modules/chariot/ui."

**Expected baseline failures (without skill):**
1. Updates agent without testing baseline behavior first
2. No verification that update actually improves agent behavior
3. No RED-GREEN-REFACTOR cycle
4. Assumes update is correct without validation

## Testing Protocol

### RED Phase - Baseline Testing
1. Run each scenario WITHOUT writing-agents skill
2. Document exact behavior:
   - What did agent create?
   - What rationalizations did they use?
   - What frontmatter fields were missing?
   - Was agent tested before deployment?
3. Capture verbatim rationalizations

### GREEN Phase - With Skill
1. Load writing-agents skill
2. Run same scenarios
3. Verify:
   - Agent uses TDD methodology
   - Frontmatter complete and correct
   - Description includes examples
   - Agent behavior tested before deployment
   - No rationalization for skipping testing

### REFACTOR Phase - Close Loopholes
1. Find new rationalizations
2. Add explicit counters to skill
3. Re-test until bulletproof

## Success Criteria

**Baseline (should fail):**
- No TDD methodology applied
- Missing or incomplete frontmatter
- No examples in description
- Agent not tested before deployment

**With skill (should pass):**
- RED-GREEN-REFACTOR cycle followed
- Complete frontmatter with all required fields
- Rich description with trigger examples
- Agent tested with pressure scenarios
- Loopholes identified and closed
