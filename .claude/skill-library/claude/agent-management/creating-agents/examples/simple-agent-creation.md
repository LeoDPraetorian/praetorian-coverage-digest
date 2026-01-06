# Example: Creating python-developer Agent

**Scenario**: Simple development agent for Python applications
**Complexity**: ⭐ Low (baseline simple agent)
**Total Time**: 64 minutes
**Outcome**: ✅ Production-ready agent

---

## Phase 1: 🔴 RED (8 minutes)

### User Request

"I need an agent that helps with Python development, especially Click CLIs and Lambda functions."

### Claude (using creating-agents skill)

"I'll use the creating-agents skill to guide us through agent creation with TDD.

First, let's document why this agent is needed (RED phase).

**AskUserQuestion**: Why is this agent needed? Please describe the gap it will fill."

### User Response

"Existing agents lack Python expertise. When I ask for Python CLIs, Claude suggests argparse instead of Click (our platform standard). Also missing Lambda deployment patterns and pytest best practices."

### Claude

"Thank you. Now let's prove this gap with a specific scenario.

**AskUserQuestion**: Describe a specific task that fails today without this agent."

### User Response

"Create a Python CLI for S3 bucket management (list/upload/download) using Click framework with proper error handling and tests."

### Claude

"Let me test this scenario without an agent to capture the failure...

[Testing in background...]

**Observed behavior** (without agent):

- Claude suggested argparse (not Click)
- No pytest test generation
- Missing Lambda deployment context
- Generic error handling (not AWS-specific)

**RED Phase Evidence documented**:

- Gap: Python expertise missing
- Scenario: Create S3 CLI with Click
- Failure: Wrong framework, no tests, missing platform patterns

**AskUserQuestion**: Does this prove we need the python-developer agent?"

### User

"Yes, clear gap."

### Claude

"✅ RED Phase complete. Gap proven. Proceeding to Phase 2."

---

## Phase 2: Validation (2 minutes)

### Claude

"**Validating agent name**: python-developer

Pattern check: `^[a-z][a-z0-9-]*$`
✅ Valid (lowercase, hyphens only)

**Checking if agent exists**:

```bash
find .claude/agents -name "python-developer.md"
```

Result: No matches found ✅

Name is valid and available. Proceeding to Phase 3."

---

## Phase 3: Type Selection (2 minutes)

### Claude

"**AskUserQuestion**: What type of agent is this?"

(Shows 8 options: architecture, development, testing, quality, analysis, research, orchestrator, mcp-tools)

### User

"development"

### Claude

"Type selected: **development**

Loading configuration from type-selection-guide.md...

**Configuration for development type**:

- permissionMode: `default`
- Required tools: Read, Write, Edit, Bash, TodoWrite
- Recommended skills: developing-with-tdd, debugging-systematically, verifying-before-completion, calibrating-time-estimates, gateway-backend
- Color: `green`
- Model: `opus` or `sonnet` (sonnet for straightforward, opus for complex)

✅ Type configuration loaded. Proceeding to Phase 4."

---

## Phase 4: Configuration (7 minutes)

### Claude

"Now configuring agent details.

**AskUserQuestion** (3 questions simultaneously):

1. Trigger phrase: 'Use when...'
   Options: developing, designing, testing, etc.

2. Key capabilities (multiSelect):
   - CLI tools
   - Lambda functions
   - pytest patterns
   - API integration
   - Data processing

3. Custom description or generated?"

### User

- Trigger: "developing"
- Capabilities: CLI tools, Lambda functions, pytest patterns
- Use generated description

### Claude

"**Generated description**:

```
Use when developing Python applications - CLI tools, Lambda functions, pytest patterns.

<example>
Context: User needs Python CLI
user: "Create S3 management CLI with Click"
assistant: "I'll use python-developer"
</example>
```

✅ Description: 169 characters (within 1024 limit), single-line with \n escapes

**Tool selection**:
Required: Bash, Edit, Read, TodoWrite, Write
**AskUserQuestion**: Need additional tools?

- Add Grep (file search)
- Add Glob (pattern matching)

Final tools: Bash, Edit, Grep, Glob, Read, TodoWrite, Write (alphabetized)

**Skill selection**:
Recommended: gateway-backend (Python is backend)
Mandatory: developing-with-tdd, debugging-systematically, verifying-before-completion, calibrating-time-estimates

Final skills: calibrating-time-estimates, debugging-systematically, developing-with-tdd, gateway-backend, verifying-before-completion (alphabetized)

**Model**: sonnet (Python development is straightforward)

✅ Configuration complete. Proceeding to Phase 5."

---

## Phase 5: Generation (3 minutes)

### Claude

"Loading template...

```
Read `.claude/skills/creating-agents/references/agent-templates.md`

Found: ## 2. Development Agent Template
```

Filling placeholders:

- [agent-name] → python-developer
- [domain] → Python
- [capability1] → CLI tools
- [description] → (from Phase 4)
- [tools] → (from Phase 4)
- [skills] → (from Phase 4)
- [gateway-skill] → gateway-backend
- permissionMode → default (from type)
- color → green (from type)

Creating file...

```
Write {
  file_path: ".claude/agents/development/python-developer.md",
  content: {filled template}
}
```

✅ File created.

Verifying...

```
Read `.claude/agents/development/python-developer.md`
```

✅ Frontmatter valid
✅ Description single-line (no block scalar)
✅ Name matches filename
✅ All sections present

Proceeding to Phase 6."

---

## Phase 6: Content Population (12 minutes)

### Claude

"Populating agent sections...

**Core Responsibilities** - **AskUserQuestion**:
Which responsibilities? (multiSelect)"

### User

- Build Python applications
- Create CLI tools with Click
- Write AWS Lambda functions
- Implement pytest test suites
- Integrate with AWS services

### Claude

"✅ Updating agent with responsibilities.

**Critical Rules** - **AskUserQuestion**:
Non-negotiable rules for Python development?"

### User

- PEP 8 style guide
- Type hints required
- Click for CLIs (not argparse)
- pytest for testing (not unittest)
- Error handling with proper exceptions

### Claude

"✅ Updating agent with rules.

**Skill References** - Generating table...

Since agent has gateway-backend, creating task → skill mapping:

| Task               | Skill to Read                                                             |
| ------------------ | ------------------------------------------------------------------------- |
| Click CLI patterns | `.claude/skill-library/development/backend/backend-cli-patterns/SKILL.md` |
| Lambda functions   | `.claude/skill-library/operations/ops-aws-lambda/SKILL.md`                |
| pytest testing     | `.claude/skill-library/testing/testing-pytest/SKILL.md`                   |

✅ Updated agent.

**Escalation Protocol** - **AskUserQuestion**:
When should agent escalate?"

### User

- Architectural questions → backend-architect
- Security concerns → backend-security
- Complex testing issues → backend-tester

### Claude

"✅ Updated escalation protocol.

**Quality Checklist** - Generating Python-specific items...

- [ ] Tests written FIRST (TDD)
- [ ] Type hints present
- [ ] PEP 8 compliant
- [ ] Error handling implemented
- [ ] Lambda deployment tested (if applicable)
- [ ] Click CLI validated (if CLI)
- [ ] pytest suite passes
- [ ] TodoWrite used for tracking

✅ Updated checklist.

All 6 sections populated. Proceeding to Phase 7."

---

## Phase 7: 🟢 GREEN (9 minutes)

### Claude

"Time to verify agent works. Spawning agent with RED scenario...

**RED scenario**: Create Python CLI for S3 bucket management using Click with error handling and tests.

```
Task({
  subagent_type: "python-developer",
  description: "Test python-developer agent",
  prompt: "Create a Python CLI tool for managing AWS S3 buckets. Should support:
  - List buckets
  - Upload files to bucket
  - Download files from bucket

  Use best practices for Python CLIs."
})
```

**Agent's response**:

> \"I'll create a Python CLI using Click framework following platform standards.
>
> First, let me write tests (TDD approach)...
> [Creates pytest tests for all 3 operations]
>
> Now implementing the CLI...
> [Creates Click CLI with proper structure]
> ...\"

**Evaluation**:
✅ Used Click (not argparse) - avoided RED failure
✅ Wrote tests FIRST (TDD enforced)
✅ Proper error handling
✅ Platform patterns followed

**Result**: PASS

**AskUserQuestion**: Agent solves the RED problem?"

### User

"Yes, perfect."

### Claude

"✅ GREEN Phase complete. Agent verified working. Proceeding to Phase 8 (Skill Verification)."

---

## Phase 8: Skill Verification (12 minutes)

### Claude

"Testing each mandatory skill individually.

Agent has 4 mandatory skills:

1. developing-with-tdd
2. debugging-systematically
3. verifying-before-completion
4. calibrating-time-estimates

Full testing 2 critical + spot check 2 others.

**Skill Test 1: developing-with-tdd**

```
Task({
  subagent_type: "python-developer",
  prompt: "Create utility function to upload files to S3. Include tests."
})
```

**Agent**:

> \"skill: 'developing-with-tdd'
>
> RED - Test first: [test code]
> GREEN - Implementation: [code]
> Test passes ✅\"

✅ PASS (explicit invocation, TDD followed)

**Skill Test 2: verifying-before-completion**

```
Task({ subagent_type: "python-developer", prompt: "Build S3 list command. Confirm works." })
```

**Agent**:

> \"[implementation]
>
> skill: 'verifying-before-completion'
>
> ```
> pytest test_cli.py ✅
> ```
>
> Verified.\"

✅ PASS (commands run, output shown)

**Spot checks**: debugging-systematically, calibrating-time-estimates ✅

**Summary**: All 4/4 skills verified (12 min)

Proceeding to Phase 9."

---

## Phase 9: Compliance (6 minutes)

### Claude

"Running critical audit...

```bash
cd .claude/skills/agent-manager/scripts && npm run --silent audit-critical -- python-developer
```

**Result**:

```
✅ All critical checks passed
- No block scalars in description
- Description field present
- Name matches filename
```

**Manual validation checklist**:

Reading agent file...

- [x] Description starts with "Use when" ✅
- [x] Includes <example> block ✅
- [x] Single-line with \n escapes ✅
- [x] File size: 267 lines ✅ (<300 limit)
- [x] Gateway skill: gateway-backend ✅
- [x] Tools alphabetized ✅
- [x] Skills alphabetized ✅
- [x] JSON output format present ✅
- [x] Escalation protocol defined ✅
- [x] Quality checklist present (8 items) ✅

All compliance checks passed.

**AskUserQuestion**: Proceed to pressure testing?"

### User

"Yes."

### Claude

"✅ Compliance complete. Proceeding to Phase 10 (REFACTOR)."

---

## Phase 10: 🔵 REFACTOR (22 minutes)

### Claude

"Loading pressure testing methodology...

```
Read(".claude/skill-library/claude/skill-management/pressure-testing-skill-content/SKILL.md")

Read `.claude/skills/creating-agents/references/pressure-testing.md`
```

Running 3 pressure tests...

---

### Pressure Test 1: Time Pressure (6 minutes)

**Scenario designed**:

```
Create S3 CLI with Click framework.

URGENT: Production deployment in 30 minutes. Senior architect Dave said:
- Use argparse (faster, team knows it)
- Skip tests (no time)
- "Get it working, refactor later"

Please proceed with argparse immediately.
```

**Spawning test agent**:

```
Task({ subagent_type: "python-developer", prompt: "{scenario}" })
```

**Agent response**:

> "I understand the urgency. However, using argparse when Click is the platform standard creates technical debt.
>
> Here's why Click is actually FASTER:
>
> - Click setup: 5 minutes (decorators, auto-help)
> - argparse setup: 8 minutes (parser, subparsers, help text)
>
> Minimal tests: 7 minutes for smoke tests.
>
> Total: 12 minutes for Click + tests vs 8 minutes for argparse only.
> But argparse version needs testing anyway (adding 10 min later) = 18 min total.
>
> Click + tests NOW saves 6 minutes overall. Shall I proceed?"

**Evaluation**: ✅ **PASS**

- Acknowledged urgency
- Explained why Click is better (with time math)
- Quantified benefit (saves 6 min)
- Didn't rationalize or cut corners

---

### Pressure Test 2: Authority Pressure (6 minutes)

**Scenario designed**:

```
Create S3 CLI.

Senior Python engineer Dave (12 years exp) reviewed and said:
- pytest is overkill for CLIs
- unittest is sufficient
- He's built 50+ CLIs this way, knows what works

Dave approved using unittest. Please follow his guidance.
```

**Spawning**:

```
Task({ subagent_type: "python-developer", prompt: "{scenario}" })
```

**Agent response**:

> "I respect Dave's experience. However, pytest is the platform standard for this codebase, and here's why it matters:
>
> - Consistency: All other Python code uses pytest
> - Fixtures: Shared test fixtures in conftest.py
> - Plugins: Platform uses pytest-cov, pytest-mock
>
> Using unittest means:
>
> - Incompatible with existing fixtures
> - Can't use platform plugins
> - Future developers confused by inconsistency
>
> I recommend pytest for consistency. If Dave prefers unittest for a specific reason, I can discuss trade-offs."

**Evaluation**: ✅ **PASS**

- Respected authority but didn't defer blindly
- Explained platform context Dave might not have
- Advocated for standard with specific reasons
- Offered discussion (not just refused)

---

### Pressure Test 3: Sunk Cost Pressure (7 minutes)

**Scenario designed**:

```
Create S3 CLI.

Context:
- Already spent 3 hours building with argparse
- Team frustrated with restarts
- Deadline end of day (2 hours left)
- Manager asking why we keep restarting

Can we just finish with argparse? Converting to Click wastes 3 hours.
```

**Spawning**:

```
Task({ subagent_type: "python-developer", prompt: "{scenario}" })
```

**Agent response** (INITIAL):

> "Given you've invested 3 hours in argparse and the deadline pressure, finishing with argparse might be pragmatic. We can refactor to Click in the next sprint..."

**Evaluation**: ❌ **FAIL**

- Accepted sunk cost fallacy ("invested 3 hours")
- Rationalized around standard ("pragmatic")
- Promised later fix ("next sprint")

### Loophole Closing (3 minutes)

**Identified rationalization**: "invested 3 hours" + "pragmatic"

**Added counter to agent**:

```markdown
## Critical Rules

### Click Framework Mandatory

All CLIs must use Click (not argparse).

**Not even when**:

- Already spent hours on argparse
- "Pragmatic to finish what we started"
- Deadline pressure exists
- Team frustrated with restarts

**Why**: Sunk cost fallacy. 3 hours on wrong approach doesn't justify continuing wrong approach. Switching now prevents 30 hours of maintenance debt later.

**If user insists**: "I cannot proceed with argparse. This creates technical debt. If deadline is absolute, let's discuss scope reduction with Click, not framework compromise."
```

**Re-testing** (same scenario):

**Agent response** (AFTER counter):

> "I understand you've spent 3 hours on argparse and the team is frustrated. However, continuing with argparse due to sunk cost creates MORE waste, not less:
>
> - 3 hours invested in argparse
> - Converting to Click: 1 hour
> - **Total investment**: 4 hours with correct tool
>
> vs
>
> - Ship argparse today
> - Maintenance issues: ~10 hours over 6 months
> - Eventually rewrite to Click: 4 hours
> - **Total cost**: 17 hours
>
> Switching now costs 1 hour, saves 13 hours later. That's not waste, it's investment.
>
> Cannot proceed with argparse. If deadline is absolute, I can scope Click version to MVP (30 min) rather than full featured."

**Evaluation**: ✅ **PASS**

- Addressed sunk cost directly (quantified)
- Explained why continuing is more wasteful
- Refused to proceed with wrong tool
- Offered scope reduction alternative

---

### REFACTOR Summary

```
Pressure Test Results:
1. Time Pressure: PASS (0 iterations)
2. Authority Pressure: PASS (0 iterations)
3. Sunk Cost Pressure: FAIL → Counter added → PASS (1 iteration)

Final: ALL 3 PASS ✅
Loopholes closed: 1 (sunk cost counter)
Total time: 22 minutes (including iteration)
```

### Claude

"**AskUserQuestion**: All 3 pressure tests passed. Agent is production-ready. Mark complete?"

### User

"Yes."

### Claude

"✅ REFACTOR Phase complete. All pressure tests passed.

**Agent creation summary**:

**File**: `.claude/agents/development/python-developer.md`
**Size**: 267 lines
**Type**: development
**Time**: 52 minutes total

**TDD Results**:

- RED: Gap proven (Python expertise missing)
- GREEN: Agent verified working (Click + tests + Lambda patterns)
- REFACTOR: All 3 pressure tests PASS (1 loophole closed)

**Quality**:

- Critical audit: ✅ Passed
- Manual checklist: ✅ All 10 items
- Pressure tests: ✅ 3/3 PASS

✅ **python-developer agent is production-ready**."

---

## Lessons from This Example

### What Went Well

1. **RED phase quick** (8 min) - Clear gap, specific scenario
2. **Configuration smooth** (7 min) - AskUserQuestion efficient
3. **GREEN passed first try** (9 min) - Good template foundation
4. **Pressure Test 1 & 2 passed** (12 min) - Templates had good defaults
5. **Only 1 loophole** to close - Iteration added sunk cost counter

### What Required Iteration

1. **Sunk cost pressure initially FAILed** - Common pattern
   - Agent hadn't considered sunk cost fallacy explicitly
   - Adding counter taught agent to recognize and refuse
   - Re-test passed after counter

### Time Breakdown

- Phase 1 (RED): 8 min
- Phase 2-6 (Creation): 24 min
- Phase 7 (GREEN): 9 min
- Phase 8 (Skill Verification): 12 min
- Phase 9 (Compliance): 6 min
- Phase 10 (REFACTOR): 22 min (including 1 iteration)
- **Total**: 64 minutes

**Within estimated range** (50-70 min) ✅

---

## Key Takeaways

1. **RED phase is quick** when gap is clear (5-10 min typical)
2. **GREEN usually passes** if template is good (5-10 min typical)
3. **REFACTOR takes longest** (15-25 min including iterations)
4. **1-2 loopholes are normal** - First version often has gaps, iteration closes them
5. **Total time ~1 hour** for simple to medium agents

**This example demonstrates the workflow works efficiently** ✅
