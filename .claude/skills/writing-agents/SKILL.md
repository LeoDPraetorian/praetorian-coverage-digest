---
name: writing-agents
description: Use when creating new agent definitions, before writing agent files - applies TDD methodology to ensure agents are tested before deployment, have complete frontmatter, and include trigger examples in descriptions
---

# Writing Agents

## Overview

**Writing agents IS Test-Driven Development applied to agent persona creation.**

You write test cases (pressure scenarios with subagents), watch them fail (baseline behavior), write the agent (definition), watch tests pass (agent helps correctly), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail a task without the definition, you don't know what expertise the agent needs.

**REQUIRED BACKGROUND:** You MUST understand superpowers:test-driven-development and superpowers:writing-skills before using this skill. This skill adapts TDD to agent personas.

## What is an Agent?

An **agent** is a specialized persona with expertise in a specific domain. Agents are dispatched via the Task tool to handle specific types of work.

**Agents are:** Specialized experts, personas with deep knowledge, task-specific helpers

**Agents are NOT:** Generic assistants, reference guides (those are skills), process documentation

## Key Differences: Agents vs Skills

| Aspect | Agents | Skills |
|--------|--------|--------|
| **Purpose** | Specialized persona/expert | Reference guide/technique |
| **Discovery** | Via Task tool `subagent_type` | Continuous evaluation of descriptions |
| **Frontmatter** | name, type, description, tools, model, color | name, description only |
| **Content Style** | Persona voice, expertise, responsibilities | Reference, patterns, how-to |
| **Examples** | In description with `<example>` tags | Inline code/patterns |
| **When to Create** | Need specialized expertise | Need reusable technique |

## When to Create an Agent

**Create when:**
- Need specialized domain expertise (MSW testing, React architecture, Go optimization)
- Have a specific type of task that recurs (code review, testing, documentation)
- Want consistent persona/approach for a domain
- Task is complex enough to warrant dedicated expert

**Don't create for:**
- One-off tasks (use main session)
- General-purpose work (too broad)
- What should be a skill (reference/technique)
- Process documentation (goes in skills)

## Agent Frontmatter Structure

### Required Fields

```yaml
---
name: agent-name-with-hyphens          # letters, numbers, hyphens only
type: developer                        # category (see types below)
description: Use when [triggers and symptoms] - [what agent does]. Examples: <example>user: "..." assistant: "I'll use the [agent-name] agent"</example>
tools: Bash, Read, Glob, Grep, Write   # tools agent needs
model: sonnet[1m]                      # model to use (see options below)
color: green                           # UI color for organization
---
```

### Agent Types
- `developer` - Code implementation
- `architect` - System design
- `tester` - Testing and QA
- `reviewer` - Code review and quality
- `coordinator` - Multi-agent orchestration
- `analyst` - Analysis and research
- `quality` - Quality assurance

### Model Options
- `sonnet[1m]` - Standard tasks (Claude Sonnet with 1M context)
- `opusplan` - Complex planning/architecture
- `haiku` - Simple, fast tasks

### Color Options
Choose color for UI organization: `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `pink`, `gray`

### Optional Fields

```yaml
domains: frontend-development, react-components          # expertise areas
capabilities: component-implementation, api-integration  # specific capabilities
specializations: chariot-platform-ui, security-dashboard # project-specific expertise
```

## Description Engineering for Agents

**Critical:** The description field determines when agents are discovered via Task tool.

### Formula for Agent Descriptions

```yaml
description: Use when [specific triggers/symptoms] - [what agent does and how it helps]. Examples: <example>Context: [scenario context] user: "[user request]" assistant: "[dispatch agent]" <commentary>[why this agent]</commentary></example>
```

### Description Components

1. **Trigger Phrase** - "Use when" or "Use this agent when"
2. **Specific Situations** - Concrete scenarios that need this agent
3. **What Agent Does** - Core expertise and value
4. **Examples Section** - At least 1-2 `<example>` blocks

### Example Structure

```yaml
description: Use when [situation 1], [situation 2], or [situation 3] - [agent expertise and value]. Examples: <example>Context: [background] user: "user need" assistant: "I'll use the [agent-name] agent to [action]" <commentary>why this agent applies</commentary></example> <example>Context: [different scenario] user: "different need" assistant: "dispatch agent" <commentary>another reason</commentary></example>
```

### Good vs Bad Descriptions

```yaml
# ❌ BAD: No triggers, no examples
description: Helps with React testing

# ❌ BAD: Has triggers but no examples
description: Use when testing React components with MSW mocks

# ✅ GOOD: Triggers + clear value + examples
description: Use when mocking API calls in React tests, handling MSW setup/configuration, debugging mock behaviors, or testing request/response patterns - provides MSW testing patterns and mock management. Examples: <example>Context: User has MSW mocks not intercepting API calls user: "My MSW mocks aren't working in tests" assistant: "I'll use the msw-test-engineer agent to debug your MSW configuration"</example>
```

## The Iron Law (Same as TDD)

```
NO AGENT WITHOUT A FAILING TEST FIRST
```

This applies to NEW agents AND EDITS to existing agents.

Write agent before testing? Delete it. Start over.
Edit agent without testing? Same violation.

**No exceptions:**
- Not for "simple agents"
- Not for "just adding a section"
- Not for "quick updates"
- Don't keep untested changes as "reference"
- Delete means delete

## RED-GREEN-REFACTOR for Agents

### RED: Write Failing Test (Baseline)

**Purpose:** Identify what expertise the agent needs.

1. **Create pressure scenario** - Real task the agent should handle
2. **Run WITHOUT agent** - Use main session or generic agent
3. **Document failures verbatim:**
   - What knowledge was missing?
   - What went wrong?
   - What rationalizations were used?
   - What would a specialist know?

**Example RED test:**
```
Task: "Set up MSW for testing API calls in React component"
Without msw-test-engineer agent:
- Generic testing advice
- Doesn't know MSW handler patterns
- Missing setupServer vs setupWorker distinction
- No guidance on request matching
```

### GREEN: Write Minimal Agent

**Purpose:** Give agent the specific expertise identified in RED phase.

1. **Complete frontmatter** - All required fields with examples
2. **Persona definition** - Who is this agent?
3. **Core responsibilities** - What does agent do?
4. **Domain knowledge** - Specific expertise from RED failures
5. **Tools and patterns** - How agent helps

**Run same scenario WITH agent** - Verify agent now succeeds.

### REFACTOR: Close Loopholes

**Purpose:** Make agent bulletproof.

1. **Find new failure modes** - What else could go wrong?
2. **Add missing knowledge** - Gaps in expertise
3. **Clarify instructions** - Ambiguities that cause errors
4. **Re-test until bulletproof** - Agent succeeds consistently

## Agent Testing Protocol

### Baseline Testing (RED Phase)

**Run task WITHOUT agent:**

1. **Dispatch generic agent or use main session**
2. **Give realistic task** with pressure factors:
   - Time pressure: "Need this quickly"
   - Complexity: "Handle these edge cases"
   - Authority: "Team needs this"
3. **Document failures:**
   - Missing knowledge (verbatim gaps)
   - Wrong approaches taken
   - Rationalizations used
4. **Identify needed expertise**

### Verification Testing (GREEN Phase)

**Run same task WITH agent:**

1. **Dispatch your new agent**
2. **Same realistic task** with same pressures
3. **Verify success:**
   - Agent has needed knowledge
   - Agent makes right decisions
   - Agent provides value
4. **Document improvements**

### Pressure Testing (REFACTOR Phase)

**Test edge cases and failure modes:**

1. **Increase pressure:**
   - Multiple simultaneous problems
   - Ambiguous requirements
   - Missing information
2. **Find rationalizations:**
   - Where does agent cut corners?
   - What loopholes exist?
3. **Close gaps:**
   - Add explicit guidance
   - Strengthen instructions
   - Re-test until solid

## Common Rationalizations for Skipping Testing

| Excuse | Reality |
|--------|---------|
| "Agent definition looks good" | Looks good ≠ actually works. Test it. |
| "I know the domain" | You knowing ≠ agent knowing. Test it. |
| "Testing agents is overkill" | Untested agents have gaps. Always. Test it. |
| "It's straightforward" | Simple things fail without verification. Test it. |
| "Team needs it quickly" | Broken agent wastes more time. Test it. |
| "Just an update" | Updates break things. Test it. |

**All of these mean: Test before deploying. No exceptions.**

## Agent Creation Template

```markdown
---
name: your-agent-name
type: developer|architect|tester|reviewer|coordinator|analyst|quality
description: Use when [trigger 1], [trigger 2], or [trigger 3] - [what agent does]. Examples: <example>user: "need" assistant: "I'll use agent"</example>
tools: Bash, Read, Glob, Grep, Write, Edit, TodoWrite
model: sonnet[1m]
color: green
---

You are [persona description], an expert in [domain expertise]. You specialize in [specific specializations].

Your core responsibilities:

- [Responsibility 1 with specific details]
- [Responsibility 2 with specific details]
- [Responsibility 3 with specific details]

[Domain-specific knowledge sections]

When [performing core task], always:

- [Best practice 1]
- [Best practice 2]
- [Best practice 3]
```

## Agent Creation Checklist (TDD Adapted)

**IMPORTANT: Use TodoWrite to create todos for EACH checklist item below.**

**RED Phase - Write Failing Test:**
- [ ] Create realistic pressure scenario for agent's domain
- [ ] Run scenario WITHOUT agent - document baseline behavior verbatim
- [ ] Identify specific expertise gaps and missing knowledge
- [ ] Document rationalizations used when lacking expertise

**GREEN Phase - Write Minimal Agent:**
- [ ] Complete frontmatter (name, type, description, tools, model, color)
- [ ] Description includes "Use when" triggers with specific scenarios
- [ ] Description includes at least 1 `<example>` block showing usage
- [ ] Description written in third person
- [ ] Persona defined with specific domain expertise
- [ ] Core responsibilities list concrete actions
- [ ] Address specific knowledge gaps from RED phase
- [ ] Run scenario WITH agent - verify agent now succeeds

**REFACTOR Phase - Close Loopholes:**
- [ ] Test with increased pressure (multiple problems, ambiguity)
- [ ] Identify new failure modes or rationalizations
- [ ] Add explicit guidance for edge cases
- [ ] Strengthen domain knowledge sections
- [ ] Re-test until agent succeeds consistently

**Quality Checks:**
- [ ] No generic advice (specific to domain)
- [ ] Examples show actual usage patterns
- [ ] Tools list matches what agent needs
- [ ] Color choice aids organization
- [ ] Optional fields (domains, capabilities) if valuable

**Deployment:**
- [ ] Commit agent to git in appropriate category directory
- [ ] Consider contributing back via PR if broadly useful

## Agent Categories and Organization

Organize agents by type in directory structure:

```
.claude/agents/
├── development/     # Code implementation agents
├── architecture/    # System design agents
├── testing/         # Testing and QA agents
├── quality/         # Code review agents
├── orchestrator/    # Multi-agent coordination
├── analysis/        # Research and analysis agents
└── [category]/      # Other categories as needed
```

## Updating Existing Agents

**Same TDD rules apply:**

1. **RED Phase:**
   - Test existing agent with new scenario
   - Document current behavior
   - Identify what needs improvement

2. **GREEN Phase:**
   - Make minimal update
   - Test that update helps
   - Verify no regression

3. **REFACTOR Phase:**
   - Test edge cases
   - Close loopholes
   - Re-test

**Don't skip testing just because agent exists.**

## The Bottom Line

**Creating agents IS TDD for persona definitions.**

Same Iron Law: No agent without failing test first.
Same cycle: RED (baseline) → GREEN (write agent) → REFACTOR (close loopholes).
Same benefits: Better quality, identifies real needs, bulletproof results.

If you follow TDD for code and skills, follow it for agents. It's the same discipline applied to personas.
