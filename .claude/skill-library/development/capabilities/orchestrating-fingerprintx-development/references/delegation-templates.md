# Delegation Templates

Pre-built prompt templates for delegating to capability agents in fingerprintx plugin development.

---

## Template Structure

Every delegation prompt should include:

```markdown
Task: [Clear objective - what to accomplish]

Context from prior phases:

- [Protocol research findings]
- [Detection strategy decisions]
- [Similar plugin patterns found]

Scope: [What to do] / [What NOT to do]

Mandatory skills to invoke:

- [List required skills]

Expected output:

- [Specific deliverables]
- [File locations for artifacts]
- [Output format for results]
```

---

## Capability Lead Template (Phase 7)

```markdown
Task: Design {protocol} fingerprintx plugin architecture

Protocol research summary:

- Default ports: {ports}
- Banner pattern: {pattern}
- Version markers: {markers or "N/A - closed source"}
- Detection strategy selected: {from Phase 6}

Similar plugins found:

- {similar_plugin_1}: {patterns to reuse}
- {similar_plugin_2}: {patterns to reuse}

Requirements:

1. Define detection logic structure
2. Specify version extraction method (if applicable)
3. Plan error handling for edge cases
4. Design test approach

Scope: Architecture decisions only. Do NOT implement code.

Expected output (write to .fingerprintx-development/architecture.md):

- Detection algorithm pseudocode
- File structure and locations
- Type constant naming
- Test vector requirements
- Return as structured markdown with rationale

Mandatory skills to Read BEFORE starting:

- .claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md
```

---

## Capability Developer Template (Phase 8)

```markdown
Task: Implement {protocol} fingerprintx plugin following TDD

Context from architecture (Phase 7):

- Detection approach: {approach}
- File locations: {files}
- Type constant: Service{Protocol} = "{protocol-lowercase}"

Protocol detection details:

- Banner pattern: {from research}
- Version extraction: {method}
- Default ports: {ports}

Location: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/

Implementation order (TDD):

1. Write test cases FIRST based on test vectors
2. Run tests (expect FAIL - RED)
3. Implement plugin.go to make tests pass (GREEN)
4. Refactor if needed

Scope:

- DO: Implement plugin.go and {protocol}\_test.go
- DO: Update {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go with type constant
- DO: Update {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go with import
- DO NOT: Implement Docker validation (Phase 13)
- DO NOT: Skip tests or write code before tests

Mandatory skills to invoke BEFORE starting:

- Skill("developing-with-tdd")
- Read(".claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md")
- Skill("verifying-before-completion")

Expected output (write to .fingerprintx-development/agents/capability-developer.md):

- Files created/modified with paths
- Test results (must show RED then GREEN)
- Any implementation notes or edge cases found

Return: Structured JSON with file paths and test output
```

---

## Capability Reviewer Template (Phase 11)

```markdown
Task: Review {protocol} fingerprintx plugin for code quality and pattern compliance

Implementation to review:

- Plugin: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
- Tests: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}\_test.go
- Type constant: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/types.go (diff only)
- Import: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/plugins.go (diff only)

Architecture to compare against:

- {path to architecture.md}

Review checklist:

1. Pattern compliance - follows similar plugin patterns
2. Detection accuracy - matches protocol research
3. Version extraction - correct implementation (if applicable)
4. Error handling - graceful failures
5. Test coverage - all detection paths tested
6. Code quality - Go best practices, naming conventions

Scope:

- DO: Review code quality and pattern compliance
- DO: Flag any P0 violations (see domain compliance)
- DO NOT: Make code changes (reviewer only)
- DO NOT: Run tests (trust Phase 10 results)

Mandatory skills to invoke BEFORE starting:

- Read(".claude/skill-library/development/capabilities/reviewing-capability-implementations/SKILL.md")
- Skill("verifying-before-completion")

Expected output (write to .fingerprintx-development/agents/capability-reviewer.md):

- Approval/rejection decision
- Issues found (if any) with severity
- Recommendations for improvement
- P0 compliance status

Return: Structured JSON with approval status and findings list
```

---

## Capability Tester Template (Phase 13)

```markdown
Task: Comprehensive testing of {protocol} fingerprintx plugin

Implementation to test:

- Plugin: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/plugin.go
- Existing tests: {CAPABILITIES_ROOT}/modules/fingerprintx/pkg/plugins/services/{protocol}/{protocol}\_test.go

Test plan from Phase 12:

- {test plan summary}

Testing phases:

1. Unit test execution - run existing tests
2. Additional edge cases - add any missing tests
3. Docker validation - test against real service containers
4. Shodan validation - validate against live hosts (requires API key)

Docker containers to use:

- {container_image_1}:{version}
- {container_image_2}:{version}

Scope:

- DO: Run all unit tests
- DO: Add additional edge case tests
- DO: Run Docker container tests
- DO: Run Shodan validation if API key available
- DO NOT: Modify plugin.go (testing only)

Mandatory skills to invoke BEFORE starting:

- Skill("developing-with-tdd")
- Read(".claude/skill-library/development/capabilities/validating-live-with-shodan/SKILL.md")
- Skill("verifying-before-completion")

Expected output (write to .fingerprintx-development/agents/capability-tester.md):

- Unit test results with coverage %
- Docker test results per version
- Shodan validation results (detection rate)
- Any new test files created

Return: Structured JSON with pass/fail status and coverage metrics
```

---

## Context Awareness in Delegations

### Token Thresholds

Before spawning agents, check current token usage:

| Threshold         | Action                                            |
| ----------------- | ------------------------------------------------- |
| <75% (150k)       | Proceed normally                                  |
| 75-80% (150-160k) | SHOULD compact - proactive compaction recommended |
| 80-85% (160-170k) | MUST compact - compact NOW before spawning        |
| >85% (170k)       | Hook BLOCKS agent spawning until /compact         |

**See:** [compaction-gates.md](compaction-gates.md) for compaction protocol.

### Agent Prompt Context Size

Keep agent prompts focused:

| Agent Type           | Max Context | Include                               | Exclude               |
| -------------------- | ----------- | ------------------------------------- | --------------------- |
| capability-lead      | 2000 tokens | Protocol research, detection strategy | Full discovery output |
| capability-developer | 3000 tokens | Architecture summary, file paths      | Research details      |
| capability-reviewer  | 2000 tokens | Architecture, implementation files    | Discovery, research   |
| capability-tester    | 2000 tokens | Test plan, file locations             | Implementation logs   |

### Fresh Agent Principle

Each `Task()` spawns a NEW agent instance:

- No context pollution from previous agents
- Include ALL necessary context in the prompt
- Reference files instead of inlining content
- Never ask agent to "continue" previous work

---

## Skill Requirements in Agent Prompts

Every agent prompt MUST include mandatory skills. Use this pattern:

```markdown
Mandatory skills to invoke BEFORE starting:

- Skill("developing-with-tdd")
- Read(".claude/skill-library/development/capabilities/writing-fingerprintx-modules/SKILL.md")
- Skill("verifying-before-completion")
```

**DO NOT delegate without skill requirements** - agents need guidance to follow patterns.

---

## Related References

- [Agent Matrix](agent-matrix.md) - Agent selection rules
- [Phase 7: Architecture Plan](phase-7-architecture-plan.md) - Lead agent usage
- [Phase 8: Implementation](phase-8-implementation.md) - Developer agent usage
- [Phase 11: Code Quality](phase-11-code-quality.md) - Reviewer agent usage
- [Phase 13: Testing](phase-13-testing.md) - Tester agent usage
