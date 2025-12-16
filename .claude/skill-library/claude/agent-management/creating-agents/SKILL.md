---
name: creating-agents
description: Use when creating new agents - guides through 10-phase TDD workflow (RED-GREEN-REFACTOR), template generation, EXTREMELY_IMPORTANT block pattern, and mandatory pressure testing with subagents for bulletproof agent creation
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion, Task, Skill
---

# Creating Agents

**Instruction-driven agent creation with mandatory TDD and subagent pressure testing.**

**MANDATORY**: You MUST use TodoWrite to track all 10 phases. Complex workflow - mental tracking leads to skipped steps.

---

## When to Use

- Creating new agent from scratch
- User says "create an agent for X"
- Building specialized sub-agent for Task tool

**NOT for**: Updating existing agents (use `updating-agents` skill)

---

## Quick Reference

| Phase | Purpose | Time | Checkpoint |
|-------|---------|------|------------|
| **1. 🔴 RED** | Prove gap exists | 5-10 min | Gap documented, failure captured |
| **2. Validation** | Name format, existence, duplicates | 3-5 min | Name valid, no conflicts |
| **3. Type** | Select from 8 types | 2 min | Type selected |
| **4. Configuration** | Description, tools, skills | 5-7 min | Config complete, ≤1024 chars |
| **5. Generation** | Create file from template | 2 min | File created, line count checked |
| **6. Content** | Populate 7 sections + EXTREMELY_IMPORTANT | 17-22 min | All sections filled |
| **7. 🟢 GREEN** | Verify agent works | 5-10 min | Agent solves RED problem |
| **8. 🎯 SKILL VERIFICATION** | Test process + behavioral compliance | 15-25 min | All skills PASS |
| **9. Compliance** | Quality checks + audit | 5 min | Audit passed |
| **10. 🔵 REFACTOR** | Pressure test | 15-20 min | 3/3 tests PASS |

**Total**: 77-114 minutes

---

## Phase 1: 🔴 RED (Prove Gap Exists)

**You CANNOT skip this phase. TDD is mandatory.**

1. **Document Gap** (AskUserQuestion): Ask why agent is needed
2. **Capture Failure**: Record what fails today without this agent
3. **Confirm RED**: Ask "Does this prove we need the agent?"

**Cannot proceed without RED confirmation** ✅

**Detailed workflow**: Read `references/tdd-workflow.md`

---

## Phase 2: Validation

1. **Validate Name**: Must match `^[a-z][a-z0-9-]*$` (kebab-case)
2. **Check Existence**: `find .claude/agents -name "{name}.md"`
3. **Check Duplicates**: Search for >50% keyword overlap with existing agents

**Cannot proceed without valid name and duplicate check** ✅

**Detailed rules**: Read `references/validation-rules.md`

---

## Phase 3: Type Selection

Ask user to select from 8 types via AskUserQuestion:

| Type | Permission Mode | Use For |
|------|----------------|---------|
| architecture | plan | System design |
| development | default | Implementation |
| testing | default | Testing, QA |
| quality | plan | Code review |
| analysis | plan | Security/complexity |
| research | default | Web search, docs |
| orchestrator | default | Multi-agent coordination |
| mcp-tools | default | MCP wrapper access |

**Detailed guide**: Read `references/type-selection-guide.md`

---

## Phase 4: Configuration

1. **Description**: Generate with trigger phrase, capabilities, example block
   - Must be ≤1024 characters (hard limit)
   - Single-line with `\n` escapes (NO `|` or `>`)
2. **Tools**: Select and alphabetize; validate against known tools
3. **Skills**: Select gateway based on type; alphabetize
4. **Model**: Choose based on type (opus/sonnet/haiku/inherit)

**Cannot proceed with invalid tools or >1024 char description** ✅

**Detailed rules**: Read `references/configuration-rules.md`

---

## Phase 5: Generation

1. **Load Template**: Read `references/agent-templates.md`
2. **Fill Placeholders**: Replace all `[BRACKETS]`
3. **Path Validation**: Validate path matches `.claude/agents/{type}/{agent-name}.md` (details in `references/content-population-details.md`)
4. **Create File**: Write to validated path
5. **Verify**: Read file, check frontmatter valid
6. **Line Count Check**: Immediately after file creation:
   ```bash
   LINE_COUNT=$(wc -l < .claude/agents/{type}/{agent-name}.md)
   echo "Agent line count: $LINE_COUNT"

   # Determine agent complexity
   if [[ "{type}" == "architecture" || "{type}" == "orchestrator" ]]; then
     MAX_LINES=400
     WARN_LINES=350
     AGENT_TYPE="complex"
   else
     MAX_LINES=300
     WARN_LINES=250
     AGENT_TYPE="standard"
   fi

   if [ $LINE_COUNT -gt $MAX_LINES ]; then
     echo "❌ ERROR: $AGENT_TYPE agent is $LINE_COUNT lines (limit: $MAX_LINES)"
     echo "MUST extract patterns to skills before proceeding to Phase 6"
     exit 1
   elif [ $LINE_COUNT -gt $WARN_LINES ]; then
     echo "⚠️  WARNING: $AGENT_TYPE agent is $LINE_COUNT lines (approaching $MAX_LINES limit)"
     echo "Consider extracting detailed patterns to skills"
   fi
   ```
7. **Gateway Enforcement**: Ensure `skills:` uses gateways, not direct paths

8. **Create Initial Changelog**:
   ```bash
   mkdir -p .claude/agents/{type}/.history
   cat > .claude/agents/{type}/.history/{agent-name}-CHANGELOG << 'EOF'
## [$(date +%Y-%m-%d)] - Initial Creation

### Created
- Initial agent creation with 10-phase TDD workflow
- Type: {type}
- Purpose: {one-line description from Phase 1}

### RED Phase Evidence
- Gap: {documented gap from Phase 1}
- Failure: {captured failure scenario}

### Validation
- GREEN: Pending
- REFACTOR: Pending
- Compliance: Pending
EOF
   ```

**Color mapping**: architecture=blue, development=green, testing=yellow, quality=purple, analysis=orange, research=cyan, orchestrator=magenta, mcp-tools=teal

**Detailed templates**: Read `references/agent-templates.md`

---

## Phase 6: Content Population

Populate 7 required sections via Edit tool:

1. **EXTREMELY_IMPORTANT Block** (MANDATORY) - Template in `references/extremely-important-pattern.md`
2. **Core Responsibilities** (3-5 items)
3. **Critical Rules** (type-specific)
4. **Skill References** (if gateway present)
5. **Output Format** (verify JSON present)
6. **Escalation Protocol**
7. **Quality Checklist** (6-8 items)

**After populating**:
- Verify Success Criteria present (scan for "success criteria", "complete when")
- Verify ≥3 verification instructions (scan for "verify", "confirm", "ensure")

**Detailed guidance**: Read `references/content-population-details.md` and `references/skill-integration-guide.md`

---

## Phase 7: 🟢 GREEN (Verify Works)

1. **Spawn Agent**: `Task({ subagent_type: "{agent-name}", prompt: "{RED scenario}" })`
2. **Evaluate**: PASS (solves problem) / FAIL (repeats RED failure)
3. **Confirm GREEN**: Ask "Does agent solve the problem?"

**Cannot proceed without PASS** ✅

**Detailed guide**: Read `references/tdd-workflow.md`

---

## Phase 8: 🎯 Skill Verification

Test BOTH process compliance AND behavioral compliance.

| Process | Behavioral | Result | Action |
|---------|-----------|--------|--------|
| ✅ | ✅ | **PASS** | Proceed |
| ✅ | ❌ | **FAIL** | Strengthen EXTREMELY_IMPORTANT block |
| ❌ | ✅ | **FAIL** | Agent follows but doesn't announce |
| ❌ | ❌ | **FAIL** | Add explicit counter to anti-rationalization |

1. **Invoke**: `skill: "testing-agent-skills"` with agent name
2. **Evaluate**: Check for explicit invocation AND pattern adherence
3. **Discovery Test**: Test in NEW session for explicit skill invocation

**Cannot proceed without all PASS (process + behavioral + discovery)** ✅

**Detailed protocol**: Read `references/skill-verification.md`

---

## Phase 9: Compliance

1. **Critical Audit**:
   ```bash
   REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null); REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}" && cd "$REPO_ROOT/.claude/skill-library/claude/agent-management/auditing-agents/scripts" && npm run --silent audit-critical -- {agent-name}
   ```

2. **EXTREMELY_IMPORTANT Validation**: If `skills:` in frontmatter, block MUST exist

3. **Line Count Validation** (ENFORCED):
   ```bash
   LINE_COUNT=$(wc -l < .claude/agents/{type}/{agent-name}.md)
   echo "Agent line count: $LINE_COUNT"

   # Determine agent complexity
   if [[ "{type}" == "architecture" || "{type}" == "orchestrator" ]]; then
     MAX_LINES=400
     WARN_LINES=350
     AGENT_TYPE="complex"
   else
     MAX_LINES=300
     WARN_LINES=250
     AGENT_TYPE="standard"
   fi

   if [ $LINE_COUNT -gt $MAX_LINES ]; then
     echo "❌ ERROR: $AGENT_TYPE agent is $LINE_COUNT lines (limit: $MAX_LINES)"
     echo "MUST extract patterns to skills before proceeding"
     exit 1
   elif [ $LINE_COUNT -gt $WARN_LINES ]; then
     echo "⚠️  WARNING: $AGENT_TYPE agent is $LINE_COUNT lines (approaching $MAX_LINES limit)"
     echo "Consider extracting patterns to skills for future maintainability"
   else
     echo "✅ Line count within acceptable range for $AGENT_TYPE agent"
   fi
   ```

   **Cannot proceed past this checkpoint if over limit** ✅

4. **Check Single Responsibility** (over-engineering detection):
   ```bash
   # Count distinct responsibility sections (h2 headers related to different domains)
   AGENT_FILE=".claude/agents/{type}/{agent-name}.md"

   # Extract h2 headers from agent body (skip frontmatter)
   HEADERS=$(sed -n '/^---$/,/^---$/!p' "$AGENT_FILE" | grep -E '^## ' | sed 's/^## //')

   # Common responsibility domain keywords
   FRONTEND_PATTERN="React|Frontend|UI|Component|Browser|Client"
   BACKEND_PATTERN="Backend|API|Server|Database|Lambda|Handler"
   TESTING_PATTERN="Test|E2E|Unit|Integration|Coverage"
   SECURITY_PATTERN="Security|Auth|Vulnerability|Compliance"
   INFRA_PATTERN="Infrastructure|Deploy|AWS|Cloud|Docker"

   # Count distinct domains mentioned in headers
   FRONTEND_COUNT=$(echo "$HEADERS" | grep -iE "$FRONTEND_PATTERN" | wc -l | tr -d ' ')
   BACKEND_COUNT=$(echo "$HEADERS" | grep -iE "$BACKEND_PATTERN" | wc -l | tr -d ' ')
   TESTING_COUNT=$(echo "$HEADERS" | grep -iE "$TESTING_PATTERN" | wc -l | tr -d ' ')
   SECURITY_COUNT=$(echo "$HEADERS" | grep -iE "$SECURITY_PATTERN" | wc -l | tr -d ' ')
   INFRA_COUNT=$(echo "$HEADERS" | grep -iE "$INFRA_PATTERN" | wc -l | tr -d ' ')

   # Count how many domains have headers (>0 mentions)
   DOMAIN_COUNT=0
   [ "$FRONTEND_COUNT" -gt 0 ] && DOMAIN_COUNT=$((DOMAIN_COUNT + 1))
   [ "$BACKEND_COUNT" -gt 0 ] && DOMAIN_COUNT=$((DOMAIN_COUNT + 1))
   [ "$TESTING_COUNT" -gt 0 ] && DOMAIN_COUNT=$((DOMAIN_COUNT + 1))
   [ "$SECURITY_COUNT" -gt 0 ] && DOMAIN_COUNT=$((DOMAIN_COUNT + 1))
   [ "$INFRA_COUNT" -gt 0 ] && DOMAIN_COUNT=$((DOMAIN_COUNT + 1))

   echo "Distinct responsibility domains: $DOMAIN_COUNT"

   if [ $DOMAIN_COUNT -gt 3 ]; then
     echo "⚠️  WARNING: Agent appears to handle $DOMAIN_COUNT distinct responsibilities"
     echo "This suggests over-engineering. Consider splitting into multiple focused agents:"
     [ "$FRONTEND_COUNT" -gt 0 ] && echo "  - Frontend-focused agent"
     [ "$BACKEND_COUNT" -gt 0 ] && echo "  - Backend-focused agent"
     [ "$TESTING_COUNT" -gt 0 ] && echo "  - Testing-focused agent"
     [ "$SECURITY_COUNT" -gt 0 ] && echo "  - Security-focused agent"
     [ "$INFRA_COUNT" -gt 0 ] && echo "  - Infrastructure-focused agent"
     echo ""
     echo "Anti-pattern detected: Agent that does 'X AND Y AND Z'"
     echo "Lean agents (<300 lines) should have single, focused responsibility"
   else
     echo "✅ Agent has focused responsibility ($DOMAIN_COUNT domain(s))"
   fi
   ```

   **Common anti-patterns**:
   - "frontend-and-backend-developer" → Split into frontend-developer + backend-developer
   - "test-writer-and-runner" → Split into test-engineer + test-runner
   - "security-architect-and-auditor" → Split into security-architect + security-reviewer

   **This is a WARNING, not a blocker** - but strongly consider splitting before proceeding.

5. **Manual Checklist** (14 items):
   - [ ] Description starts with "Use when", includes `<example>`, single-line, ≤1024 chars
   - [ ] Tools/skills alphabetized
   - [ ] EXTREMELY_IMPORTANT block present (if skills: in frontmatter)
   - [ ] File <300 lines (<400 if complex) - verified by step 3
   - [ ] Gateway skills used (not direct paths)
   - [ ] JSON output format present
   - [ ] All placeholders replaced

---

## Phase 10: 🔵 REFACTOR (Pressure Test)

**NOT optional. Agents must resist pressure.**

1. **Load**: `skill: "testing-skills-with-subagents"` and read `references/pressure-testing.md`
2. **Run 3 Tests**: Time pressure, authority pressure, sunk cost pressure
3. **Close Loopholes**: If FAIL, add explicit counters to Critical Rules
4. **Confirm**: All 3 tests must PASS

**Agent complete when all 3 pressure tests PASS** ✅

**Detailed guide**: Read `references/pressure-testing.md`

---

## Validation Checkpoints

**Use TodoWrite to track**:

```
Phase 1: RED documented
Phase 2: Name validated, no conflicts
Phase 3: Type selected
Phase 4: Configuration complete
Phase 5: File generated
Phase 6: Content populated (7 sections + success criteria + verification)
Phase 7: GREEN achieved
Phase 8: Skill verification PASSED (process + behavioral + discovery)
Phase 9: Compliance passed
Phase 10: REFACTOR passed (3/3 tests)
```

**All must be complete before claiming agent ready** ✅

---

## Error Handling

### If Creation Fails Mid-Process

**Cleanup procedure for partial creation:**

1. **If file was created but validation failed (Phase 7-10):**
   ```bash
   # Keep file for debugging
   # Review which phase failed (check TodoWrite)
   # Address the failure cause
   # Resume from that phase
   ```

2. **If Phase 7 (GREEN) failed:**
   - Keep file, review RED phase documentation
   - Consider if gap was correctly identified
   - May need to revise agent content

3. **If Phase 10 (REFACTOR) failed:**
   - Strengthen Critical Rules
   - Add explicit counters to anti-rationalization patterns
   - Re-run pressure tests

4. **If abandoning creation entirely:**
   ```bash
   # Remove partially created agent
   rm .claude/agents/{type}/{agent-name}.md

   # Remove changelog if created
   rm -f .claude/agents/{type}/.history/{agent-name}-CHANGELOG
   ```

### Recovery

To resume failed creation:
1. Review which phase failed (check TodoWrite)
2. Address the failure cause
3. Resume from that phase

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|--------------|----------------|------------------|
| Skip RED phase | "Obviously needed" | Prove it with failure scenario |
| Use block scalars | Breaks discovery | Single-line with `\n` escapes |
| Embed patterns | Agent too long | Reference skills |
| Silent compliance | Can't verify skill was used | Require explicit invocation |
| Skip EXTREMELY_IMPORTANT | 20% compliance without it | Every agent needs it |

---

## Related Skills

- `updating-agents` - Modify existing agents
- `testing-skills-with-subagents` - Pressure testing
- `agent-manager` - Router to this skill
- `developing-with-tdd` - TDD philosophy
- `verifying-before-completion` - Final validation

---

## Success Criteria

Agent complete when:

1. ✅ RED phase proven (Phase 1)
2. ✅ File created with valid frontmatter (Phase 5)
3. ✅ EXTREMELY_IMPORTANT block present (Phase 6)
4. ✅ All 7 sections populated (Phase 6)
5. ✅ GREEN passed (Phase 7)
6. ✅ All mandatory skills verified (process + behavioral + discovery)
7. ✅ Compliance passed (audit + checklist + line count)
8. ✅ REFACTOR passed (3/3 pressure tests)
9. ✅ TodoWrite complete (all phases tracked)
10. ✅ User confirmed

**Do not claim complete without all 10** ✅
