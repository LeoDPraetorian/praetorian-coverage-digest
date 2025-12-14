# Content Population Details (Phase 5 & 6)

Detailed guidance for path validation (Phase 5) and populating agent sections, success criteria, and verification steps (Phase 6).

## Phase 5: Path Validation

Before creating the agent file, validate the full path follows the correct pattern.

### Path Pattern

```
.claude/agents/{type}/{agent-name}.md
```

Where:
- `{type}` = Agent type selected in Phase 3 (architecture/development/testing/quality/analysis/research/orchestrator/mcp-tools)
- `{agent-name}` = Agent name validated in Phase 2 (kebab-case, lowercase)

### Validation Steps

1. **Construct Path**: Build path from Phase 2 name and Phase 3 type
   ```
   const path = `.claude/agents/${type}/${agentName}.md`
   ```

2. **Validate Pattern**: Check path matches expected pattern
   - Type directory exists in `.claude/agents/`
   - Name matches validated name from Phase 2
   - Extension is `.md`

3. **Common Mistakes to Catch**:
   - ❌ Wrong type directory (e.g., `development` when user selected `testing`)
   - ❌ Name mismatch (e.g., `my_agent.md` instead of `my-agent.md`)
   - ❌ Wrong extension (e.g., `.txt` instead of `.md`)
   - ❌ Missing type directory (e.g., `.claude/agents/my-agent.md`)

4. **Auto-Correction**: If path doesn't match pattern, auto-correct and inform user
   ```
   ⚠️ Path corrected:
   Expected: .claude/agents/development/feature-analyzer.md
   You provided: .claude/agents/feature-analyzer.md
   Using corrected path.
   ```

### Example Validation

**Scenario**: Phase 2 name = `api-test-engineer`, Phase 3 type = `testing`

**Valid Path**: `.claude/agents/testing/api-test-engineer.md` ✅

**Invalid Paths**:
- `.claude/agents/api-test-engineer.md` ❌ (missing type directory)
- `.claude/agents/development/api-test-engineer.md` ❌ (wrong type)
- `.claude/agents/testing/api_test_engineer.md` ❌ (underscore instead of hyphen)
- `.claude/agents/testing/ApiTestEngineer.md` ❌ (wrong case)

### Before Writing File

**Checklist**:
- [ ] Path constructed from Phase 2 name and Phase 3 type
- [ ] Path matches pattern `.claude/agents/{type}/{agent-name}.md`
- [ ] Type directory matches Phase 3 selection
- [ ] Agent name matches Phase 2 validation
- [ ] Extension is `.md`

**If validation fails**: Auto-correct path, show user the corrected path, then proceed with corrected path.

## 7 Required Sections (Phase 6)

Populate these sections via Edit tool:

### Section 1: EXTREMELY_IMPORTANT Block (MANDATORY)

Add immediately after frontmatter.

- Use template from `references/extremely-important-pattern.md`
- Replace `{skill-1}`, `{skill-2}`, etc. with agent's mandatory skills
- Include all anti-rationalization rules
- Verify placement: First content after `---` closing frontmatter

**CRITICAL**: This section is NON-NEGOTIABLE. Every agent must have it.

### Section 2: Core Responsibilities (3-5 items)

Ask user what the agent's primary responsibilities are, then update agent.

### Section 3: Critical Rules (type-specific)

Ask user for type-specific rules, then update agent.

### Section 4: Skill References (if gateway present)

Generate from `references/skill-integration-guide.md`.

### Section 5: Output Format

Verify JSON present for structured outputs.

### Section 6: Escalation Protocol

Ask user for escalation conditions, then update agent.

### Section 7: Quality Checklist (6-8 items)

Generate type-specific quality checklist.

**Each section**: Ask user (if needed) → Edit agent → Verify updated.

## Success Criteria Verification

After populating all 7 sections, validate agent has clear completion criteria.

### Why This Matters

- Agents without success criteria leave users uncertain when task is complete
- Ambiguous completion states lead to over/under-work
- Clear criteria improve agent quality and user confidence

### Scan for Success Criteria

```bash
Grep -i "success criteria\|definition of done\|complete when\|task complete if" .claude/agents/{type}/{agent-name}.md
```

### If Pattern NOT Found

```
⚠️ WARNING: No success criteria detected

Agent: {agent-name}
Type: {agent-type}

Success criteria help users know when the agent's task is complete.
Common patterns not found:
- "Success Criteria"
- "Definition of Done"
- "Complete when"
- "Task complete if"
```

### User Options

**Ask User** via AskUserQuestion:
```
Question: How should we add completion criteria?
Header: Success Criteria
Options:
  - Add dedicated "Success Criteria" section (Recommended)
  - Add to Quality Checklist (simpler, less explicit)
  - Not needed (agent has implicit completion)
```

### Dedicated Section Template

```markdown
## Success Criteria

Task complete when:

1. ✅ **{Primary deliverable}** - {Specific condition}
   - Example: Code written and passes type checking
   - Example: Tests created and passing
   - Example: Architecture document created with diagrams

2. ✅ **{Secondary requirement}** - {Validation method}
   - Example: Documentation updated
   - Example: Dependencies installed
   - Example: Security review passed

3. ✅ **{Quality gate}** - {Acceptance criteria}
   - Example: No linting errors
   - Example: Test coverage ≥80%
   - Example: User confirmed approach

4. ✅ **{User confirmation}** (if applicable)
   - Example: User approved design
   - Example: User tested functionality
   - Example: User confirmed requirements met

**Do not claim complete without meeting all criteria** ✅
```

**Placement**: Add after Escalation Protocol, before Related Agents/Resources.

### Quality Checklist Alternative

Edit Quality Checklist section to include completion criteria items:

```markdown
## Quality Checklist

Before completing task, verify:

- [ ] {Primary deliverable completed}
- [ ] {Secondary requirements met}
- [ ] {Quality gates passed}
- [ ] {No outstanding errors or warnings}
- [ ] {User confirmation obtained (if applicable)}
- [ ] Task meets all acceptance criteria
```

### Type-Specific Success Criteria

| Agent Type | Typical Success Criteria |
|-----------|--------------------------|
| architecture | Design document complete, diagrams created, patterns documented, user approved |
| development | Code written, tests pass, type checking clean, no linting errors |
| testing | Tests written, all tests pass, coverage meets threshold, no flaky tests |
| quality | Review complete, issues documented, recommendations provided, checklist complete |
| analysis | Analysis complete, findings documented, recommendations provided, metrics calculated |
| research | Information gathered, sources documented, summary provided, user confirmed relevance |
| orchestrator | All sub-tasks complete, coordination successful, results aggregated, no blocking issues |
| mcp-tools | Tool executed, results validated, errors handled, output formatted |

## Verification Steps Validation

After populating all 7 sections, validate agent includes explicit verification instructions.

### Why This Matters

- Agents without verification steps often skip validation before claiming completion
- This violates the `verifying-before-completion` skill pattern
- Clear verification instructions prevent "done!" claims without evidence

### Scan for Verification Patterns

```bash
Grep -i "verify\|confirm\|check that\|ensure\|validate\|test that" .claude/agents/{type}/{agent-name}.md
```

Count verification-related instructions (exclude frontmatter, count only in body content):
- "verify", "confirm", "check that", "ensure", "validate", "test that"
- Case-insensitive matches
- Focus on imperative usage (instructions, not descriptions)

### Insufficient Verification Warning

**If <3 verification instructions found**:

```
⚠️ WARNING: Insufficient verification steps detected

Agent: {agent-name}
Type: {agent-type}
Verification instructions: {count} (recommended: ≥3)

Pattern: verifying-before-completion requires agents to verify work before claiming completion.
Common verification gaps:
- No instruction to run tests before claiming tests pass
- No instruction to check build before claiming build succeeds
- No instruction to verify output before claiming task complete
- No instruction to confirm requirements met before marking done
```

### User Options for Verification

**Ask User** via AskUserQuestion:
```
Question: How should we add verification instructions?
Header: Verification Steps
Options:
  - Add to Quality Checklist (Recommended - explicit verification items)
  - Add to Success Criteria (verification as completion requirement)
  - Add to Critical Rules (mandate verification before claims)
  - Not needed (agent has implicit verification)
```

### Quality Checklist Option

```markdown
## Quality Checklist

Before completing task, verify:

- [ ] {Primary deliverable completed}
- [ ] Run verification command: {specific command}
- [ ] Confirm output shows expected results (no failures)
- [ ] Test original symptom/requirement is resolved
- [ ] No regressions introduced (existing tests still pass)
- [ ] {Other quality gates}
```

### Success Criteria Option

```markdown
## Success Criteria

Task complete when:

1. ✅ **{Primary deliverable}** - {Specific condition}
   - **Verification**: Run {command}, confirm {expected output}

2. ✅ **{Secondary requirement}** - {Validation method}
   - **Verification**: Check {specific check}, ensure {criteria met}

3. ✅ **No regressions** - Existing functionality preserved
   - **Verification**: Run {test suite}, confirm 0 failures
```

### Critical Rules Option

```markdown
## Critical Rules

- **Verify before claiming**: Never claim "tests pass", "build succeeds", "task complete" without running verification command and confirming output
- **Evidence before assertions**: Run the command, read the output, THEN make the claim
- **No "should work"**: Confidence is not evidence - verify with actual command execution
```

### Verification Checklist

- [ ] Agent includes ≥3 verification-related instructions
- [ ] Instructions are imperative (tell agent to verify, not describe)
- [ ] Verification commands are specific (not "check code works")
- [ ] Verification tied to completion claims (in Quality Checklist or Success Criteria)

### Type-Specific Verification Examples

| Agent Type | Typical Verification Instructions |
|-----------|----------------------------------|
| architecture | Verify design covers all requirements, confirm diagrams render correctly, validate patterns documented |
| development | Run tests and confirm 0 failures, build code and check exit 0, verify linter passes with no errors |
| testing | Run test suite and confirm all pass, verify coverage meets threshold, check no flaky tests |
| quality | Verify all issues documented, confirm recommendations actionable, validate checklist complete |
| analysis | Verify all metrics calculated, confirm findings documented, validate recommendations provided |
| research | Verify sources documented, confirm information accurate, validate summary complete |
| orchestrator | Verify all sub-tasks complete, confirm no blocking issues, validate results aggregated |
| mcp-tools | Verify tool executed successfully, confirm output formatted correctly, validate errors handled |

**Reference Pattern**: See `verifying-before-completion` skill for detailed verification requirements.
