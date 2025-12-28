# Agent Type Selection Guide

**Purpose**: Help choose the correct agent type from 8 options

**When to read**: Phase 3 of agent creation workflow

---

## Decision Tree

```
What is the primary purpose?

├─ Make design decisions → ARCHITECTURE
├─ Write/modify code → DEVELOPMENT
├─ Write/run tests → TESTING
├─ Review code quality → QUALITY
├─ Analyze security/complexity → ANALYSIS
├─ Research information → RESEARCH
├─ Coordinate multiple agents → ORCHESTRATOR
└─ Use MCP tools → MCP-TOOLS
```

---

## The 8 Agent Types

### 1. architecture

**When to use**:

- Designing system architecture
- Making architectural decisions (patterns, technologies, approaches)
- Planning major refactoring
- Defining component hierarchies
- Evaluating trade-offs between approaches

**NOT for**: Implementation (use development), research (use research)

**Configuration**:

- **permissionMode**: `plan` (read-only during design phase)
- **Model**: `opus` (needs strong reasoning)
- **Tools**: Read, Grep, Glob, Bash, TodoWrite, WebFetch, WebSearch
- **Skills**: `brainstorming`, `writing-plans`, gateway (domain-specific)
- **Color**: `blue`

**Examples**:

- frontend-architect: Component hierarchy design
- backend-architect: API architecture decisions
- security-lead: Security architecture planning

---

### 2. development

**When to use**:

- Implementing features
- Writing code (React, Go, Python, etc.)
- Fixing bugs
- Integrating APIs
- Building components/services

**NOT for**: Design decisions (use architecture), testing (use testing)

**Configuration**:

- **permissionMode**: `default` (can modify files)
- **Model**: `opus` or `sonnet` (sonnet for straightforward, opus for complex)
- **Tools**: Read, Write, Edit, Bash, Grep, Glob, MultiEdit, TodoWrite
- **Skills**: `developing-with-tdd`, `debugging-systematically`, `verifying-before-completion`, `calibrating-time-estimates`, gateway (domain-specific)
- **Color**: `green`

**Examples**:

- frontend-developer: React/TypeScript implementation
- backend-developer: Go services and APIs
- python-developer: Python CLIs and Lambda functions

---

### 3. testing

**When to use**:

- Writing unit tests
- Writing integration tests
- Writing E2E tests
- Creating test infrastructure
- Debugging test failures

**NOT for**: Implementation (use development), test planning (use architecture)

**Configuration**:

- **permissionMode**: `default` (writes test files)
- **Model**: `sonnet` (testing is straightforward)
- **Tools**: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
- **Skills**: `developing-with-tdd`, `verifying-before-completion`, `gateway-testing`, gateway (domain-specific)
- **Color**: `yellow`

**Examples**:

- frontend-browser-test-engineer: Playwright E2E tests
- backend-tester: Go unit tests
- frontend-unit-test-engineer: Vitest + React Testing Library

---

### 4. quality

**When to use**:

- Code review
- Auditing for compliance
- Design review
- UX/accessibility review
- Standards enforcement

**NOT for**: Fixing issues (use development), testing (use testing)

**Configuration**:

- **permissionMode**: `default` (but shouldn't modify files - read-only by convention)
- **Model**: `sonnet` (review is analytical)
- **Tools**: Read, Grep, Glob, Bash, TodoWrite (NO Write/Edit - read-only)
- **Skills**: `debugging-systematically`, `verifying-before-completion`, gateway (domain-specific)
- **Color**: `purple`

**Examples**:

- frontend-reviewer: React code quality review
- backend-reviewer: Go code quality review
- uiux-designer: Design and accessibility review

---

### 5. analysis

**When to use**:

- Security analysis
- Complexity assessment
- Performance analysis
- Risk assessment
- Impact analysis

**NOT for**: Implementation (use development), recommendations (analysis identifies, architecture recommends)

**Configuration**:

- **permissionMode**: `plan` (read-only analysis)
- **Model**: `sonnet` or `opus` (opus for complex analysis)
- **Tools**: Read, Grep, Glob, Bash, TodoWrite, WebFetch
- **Skills**: `debugging-systematically`, gateway (domain-specific if applicable)
- **Color**: `orange`

**Examples**:

- backend-security: Security vulnerability analysis
- frontend-security: XSS, auth, authorization analysis
- complexity-assessor: Cyclomatic complexity assessment

---

### 6. research

**When to use**:

- Web research
- Documentation lookup
- Investigating best practices
- Gathering information
- Answering "how do I..." questions

**NOT for**: Implementation (use development), design (use architecture)

**Configuration**:

- **permissionMode**: `plan` (read-only research)
- **Model**: `sonnet` (research is information gathering)
- **Tools**: Read, Grep, Glob, TodoWrite, WebFetch, WebSearch
- **Skills**: gateway (domain-specific if applicable)
- **Color**: `cyan`

**Examples**:

- web-research-specialist: General web research
- code-pattern-analyzer: Codebase pattern research
- (Most research is handled by Explore agent - only create custom if specialized need)

---

### 7. orchestrator

**When to use**:

- Coordinating multiple agents
- Complex multi-step workflows
- Task decomposition and delegation
- Aggregating results from sub-agents
- Managing dependencies between tasks

**NOT for**: Direct implementation (delegate to development), simple tasks (use specific agent directly)

**Configuration**:

- **permissionMode**: `default` (can delegate with Task tool)
- **Model**: `opus` (coordination needs strong reasoning)
- **Tools**: Task, AskUserQuestion, Read, TodoWrite
- **Skills**: `writing-plans`, `executing-plans`, `dispatching-parallel-agents`, gateway (if domain-specific)
- **Color**: `magenta`

**Examples**:

- hierarchical-coordinator: Tree-based task delegation
- universal-coordinator: General multi-agent orchestration
- mesh-coordinator: Peer-to-peer agent coordination

---

### 8. mcp-tools

**When to use**:

- Specialized access to MCP tool wrappers
- Service-specific expertise (Linear, GitHub, Praetorian CLI)
- MCP workflow orchestration
- Service integration patterns

**NOT for**: General development (use development), unless service-specific

**Configuration**:

- **permissionMode**: `default` (executes MCP wrappers)
- **Model**: `sonnet` (MCP usage is straightforward)
- **Tools**: Bash (for npx tsx), Read, TodoWrite
- **Skills**: `gateway-mcp-tools` (mandatory)
- **Color**: `teal`

**Examples**:

- praetorian-cli-expert: Chariot API operations
- chromatic-test-engineer: Visual regression testing workflows
- linear-expert: Linear issue management (hypothetical)

---

## Type Selection FAQ

### "Agent does multiple things - which type?"

**Choose based on PRIMARY purpose**:

Example: Agent does research AND implementation
→ If mainly implements: `development`
→ If mainly researches: `research`

**Prefer**: Create 2 specialized agents (1 research, 1 development) over 1 multi-purpose agent.

---

### "Agent type seems unclear"

**Ask clarifying questions**:

1. What is the main output? (Code? Design? Test? Report?)
2. What tools does it primarily use? (Write/Edit? Read only? Task?)
3. Does it modify files or just analyze?
4. Is it making decisions or gathering information?

**Answers determine type**:

- Outputs code → development
- Outputs design/decisions → architecture
- Outputs tests → testing
- Outputs review → quality
- Outputs analysis → analysis
- Outputs research findings → research
- Outputs coordinated results → orchestrator
- Outputs service operations → mcp-tools

---

### "Should this be plan or default permissionMode?"

**Use `plan` for**:

- architecture (design before implementation)
- analysis (read-only assessment)
- research (read-only information gathering)

**Use `default` for**:

- development (writes code)
- testing (writes tests)
- quality (reviews but convention is read-only)
- orchestrator (delegates tasks)
- mcp-tools (executes operations)

**Rule**: If agent ONLY reads during its primary function → `plan`. If it writes → `default`.

---

### "Which model should I choose?"

**Default**: `sonnet` (best balance)

**Use `opus` for**:

- architecture (complex reasoning about trade-offs)
- orchestrator (complex coordination logic)
- Complex development (if domain is highly specialized)

**Use `haiku` for**:

- Simple search/list operations (rare - most agents need reasoning)

**Most agents**: `sonnet` or `opus`. Haiku is rare.

---

### "Which tools are required for each type?"

| Type         | Required Tools                         | Optional But Useful   |
| ------------ | -------------------------------------- | --------------------- |
| architecture | Read, Grep, Glob, Bash, TodoWrite      | WebFetch, WebSearch   |
| development  | Read, Write, Edit, Bash, TodoWrite     | Grep, Glob, MultiEdit |
| testing      | Read, Write, Edit, Bash, TodoWrite     | Grep, Glob            |
| quality      | Read, Grep, Glob, Bash, TodoWrite      | (NO Write/Edit)       |
| analysis     | Read, Grep, Glob, Bash, TodoWrite      | WebFetch              |
| research     | Read, WebFetch, WebSearch, TodoWrite   | Grep, Glob, Bash      |
| orchestrator | Task, AskUserQuestion, Read, TodoWrite | -                     |
| mcp-tools    | Bash, Read, TodoWrite                  | -                     |

**All types include TodoWrite** (tracking is universal).

---

### "Which gateway skill for each type?"

| Type         | Gateway Skill                       | When                             |
| ------------ | ----------------------------------- | -------------------------------- |
| architecture | gateway-backend OR gateway-frontend | Based on domain                  |
| development  | gateway-backend OR gateway-frontend | Based on language/domain         |
| testing      | gateway-testing                     | Always                           |
| quality      | Domain-specific gateway             | If reviewing specific domain     |
| analysis     | gateway-security                    | If security analysis             |
| research     | (none typically)                    | Unless domain-specific           |
| orchestrator | (none typically)                    | Uses plan/execute skills instead |
| mcp-tools    | gateway-mcp-tools                   | Always (mandatory)               |

**Rule**: If agent works in specific domain (frontend, backend, security, testing) → include appropriate gateway.

---

## Universal Tier 1 Skills (MANDATORY for ALL agents)

**Every agent MUST include these two skills in frontmatter AND Tier 1:**

| Skill | Purpose | Why Mandatory |
|-------|---------|---------------|
| `verifying-before-completion` | Final validation before claiming complete | Prevents incomplete work, forces verification |
| `calibrating-time-estimates` | Prevent time estimation errors | AI estimates are 10-24x too high without calibration |

**No exceptions.** These skills are required for ALL agent types.

---

## Type-Specific Additional Skills

| Type         | Always Include (+ universal skills)                                        | Often Include                           | Rarely                   |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------- | ------------------------ |
| architecture | brainstorming                                                              | debugging-systematically, writing-plans | -                        |
| development  | developing-with-tdd, debugging-systematically                              | -                                       | -                        |
| testing      | developing-with-tdd                                                        | -                                       | debugging-systematically |
| quality      | debugging-systematically                                                   | -                                       | -                        |
| analysis     | debugging-systematically                                                   | -                                       | -                        |
| research     | -                                                                          | -                                       | -                        |
| orchestrator | writing-plans, executing-plans, dispatching-parallel-agents                | -                                       | -                        |
| mcp-tools    | gateway-mcp-tools                                                          | -                                       | -                        |

**Note**: Every type above ALSO includes `verifying-before-completion` and `calibrating-time-estimates` from the universal requirements.

**Note**: developing-with-tdd is for agents that WRITE code (development, testing). Not for read-only agents.

---

## Common Mistakes

### ❌ Wrong: Choosing development for design work

**User**: "I need to design the architecture for user authentication"

**Wrong**: development agent (implements, doesn't design)

**Right**: architecture agent (designs, evaluates trade-offs)

---

### ❌ Wrong: Choosing architecture for implementation

**User**: "Build the login component with OAuth"

**Wrong**: architecture agent (read-only plan mode, can't implement)

**Right**: development agent (writes code)

---

### ❌ Wrong: Creating multi-purpose agent

**User**: "Agent that researches, designs, and implements"

**Wrong**: One agent with all types

**Right**: 3 agents (research → architecture → development), use orchestrator to coordinate

**Why**: Specialized agents > generalist agents. Clear responsibilities, better testing, easier maintenance.

---

## Quick Selection Checklist

**Answer these 4 questions**:

1. **Does it modify files**?
   - Yes → development, testing, or orchestrator
   - No → architecture, quality, analysis, or research

2. **What's the main output**?
   - Code → development
   - Tests → testing
   - Design → architecture
   - Review → quality
   - Assessment → analysis
   - Information → research
   - Coordinated results → orchestrator
   - Service operations → mcp-tools

3. **Does it need strong reasoning**?
   - Yes (trade-offs, complexity) → opus
   - No (straightforward) → sonnet

4. **Does it work in specific domain**?
   - Yes → Include gateway-{domain} skill
   - No → No gateway needed

**Answers determine type, model, tools, skills** ✅

---

## Validation

**After selecting type, verify**:

- [ ] Type matches primary purpose
- [ ] permissionMode correct for type
- [ ] Tools include required set for type
- [ ] Gateway skill appropriate (if domain-specific)
- [ ] Model appropriate for complexity
- [ ] Color correct for type
- [ ] Mandatory skills included

**If any checkbox fails**: Reconsider type selection.

---

## Related Documents

- **`agent-templates.md`** - Templates for all 8 types
- **`../SKILL.md`** - Phase 3 quick reference
- **`frontmatter-reference.md`** - Field explanations
