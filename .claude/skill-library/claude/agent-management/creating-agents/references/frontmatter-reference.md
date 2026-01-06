# Agent Frontmatter Reference

**Purpose**: Detailed explanation of all frontmatter fields

**When to read**: Phase 4 (Configuration) and Phase 8 (Compliance validation)

---

## Frontmatter Structure

```yaml
---
name: agent-name
description: Use when [trigger] - [capabilities].\n\n<example>...\n</example>
type: development
permissionMode: default
tools: Bash, Edit, Read, TodoWrite, Write
skills: gateway-frontend, developing-with-tdd
model: sonnet
color: green
---
```

**All fields**: name, description, type, permissionMode, tools, skills, model, color (8 required + skills optional)

---

## Field Definitions

### name (Required)

**Format**: `^[a-z][a-z0-9-]*$` (kebab-case)

**Rules**:

- Lowercase letters, numbers, hyphens only
- Must start with lowercase letter
- Must match filename (if file is `python-developer.md`, name must be `python-developer`)
- Max 64 characters

**Valid examples**:

- `python-developer`
- `frontend-architect`
- `backend-security`

**Invalid examples**:

- `Python-Developer` (capitals)
- `python_developer` (underscore)
- `python developer` (space)
- `123-developer` (starts with number)

---

### description (Required)

**Format**: Single-line string with `\n` escapes for multi-line content

**Critical**: NEVER use YAML block scalars (`|` or `>`). They break agent discovery.

**Pattern**: `"Use when [trigger] - [capabilities].\n\n<example>...\n</example>"`

**Rules**:

- Max 1,024 characters
- Must start with "Use when" (discovery trigger)
- Must include at least one `<example>` block
- Use `\n` for line breaks, `\n\n` for paragraph breaks
- Single-line in YAML (no block scalars)

**Valid example**:

```yaml
description: Use when developing Python applications - CLI tools, Lambda functions, pytest patterns.\n\n<example>\nContext: User needs CLI\nuser: "Create Click CLI"\nassistant: "I'll use python-developer"\n</example>
```

**Invalid examples**:

```yaml
# ❌ Block scalar (returns literal "|")
description: |
  Use when developing Python applications

# ❌ Missing "Use when"
description: Python development agent

# ❌ No examples
description: Use when developing Python applications - CLI tools, pytest
```

### Example Block Format

**Within description, use this pattern**:

```
\n\n<example>\nContext: {Situation}\nuser: "{User request}"\nassistant: "{How Claude should respond}"\n</example>
```

**Multiple examples** (2-3 recommended):

```
...\n</example>\n\n<example>\n...
```

**Why examples matter**: Help Claude's selection mechanism understand when to use this agent.

---

### type (Required)

**Valid values**: `architecture`, `development`, `testing`, `quality`, `analysis`, `research`, `orchestrator`, `mcp-tools`

**Determines**:

- Directory location (`.claude/agents/{type}/`)
- Default permissionMode
- Color
- Common tools/skills

**Must match one of 8 types** - no custom types.

---

### permissionMode (Required)

**Valid values**: `default`, `plan`, `acceptEdits`, `bypassPermissions`

**Common values**:

- `default` - Normal file operations (most agents)
- `plan` - Read-only during planning (architecture, analysis, research)

**Rare values**:

- `acceptEdits` - Pre-approve all edits (not recommended)
- `bypassPermissions` - Skip permission prompts (dangerous, avoid)

**By type**:
| Type | permissionMode |
|------|----------------|
| architecture | plan |
| development | default |
| testing | default |
| quality | default |
| analysis | plan |
| research | plan |
| orchestrator | default |
| mcp-tools | default |

---

### tools (Required)

**Format**: Comma-separated list, alphabetically sorted

**Example**: `Bash, Edit, Grep, Glob, Read, TodoWrite, Write`

**Available tools**:

- Read, Write, Edit (file operations)
- Bash (command execution)
- Grep, Glob (search)
- Task (spawn sub-agents)
- Skill (invoke skills)
- AskUserQuestion (user interaction)
- TodoWrite (task tracking)
- WebFetch, WebSearch (web research)
- MultiEdit (bulk editing - rare)

**Required for all types**: `Read`, `TodoWrite`

**By type** (see type-selection-guide.md for details):

- development: Read, Write, Edit, Bash, TodoWrite (+ Grep, Glob, MultiEdit useful)
- architecture: Read, Grep, Glob, Bash, TodoWrite (+ WebFetch, WebSearch useful)
- testing: Read, Write, Edit, Bash, TodoWrite (+ Grep, Glob)
- quality: Read, Grep, Glob, Bash, TodoWrite (NO Write/Edit)
- orchestrator: Task, AskUserQuestion, Read, TodoWrite

**MUST be alphabetically sorted** (audit requirement).

---

### skills (Optional but Recommended)

**Format**: Comma-separated list, alphabetically sorted

**Gateway skills**:

- `gateway-frontend` - React, TypeScript, UI
- `gateway-backend` - Go, APIs, infrastructure
- `gateway-testing` - Test patterns and frameworks
- `gateway-security` - Security, auth, cryptography
- `gateway-mcp-tools` - MCP wrapper access
- `gateway-integrations` - Third-party API patterns

**Process skills**:

- `brainstorming` - Explore alternatives before deciding (architecture mandatory)
- `developing-with-tdd` - RED-GREEN-REFACTOR for code (development, testing mandatory)
- `debugging-systematically` - Root cause investigation (most agents)
- `verifying-before-completion` - Final validation (most agents)
- `calibrating-time-estimates` - Prevent estimation errors (development, architecture)
- `writing-plans` - Task breakdown (orchestrator mandatory)
- `executing-plans` - Plan execution (orchestrator)
- `dispatching-parallel-agents` - Parallel coordination (orchestrator)

**By type**:

- architecture: brainstorming, calibrating-time-estimates, verifying-before-completion, gateway-{domain}
- development: developing-with-tdd, debugging-systematically, verifying-before-completion, calibrating-time-estimates, gateway-{domain}
- testing: developing-with-tdd, verifying-before-completion, gateway-testing, gateway-{domain}
- mcp-tools: gateway-mcp-tools (mandatory)

**MUST be alphabetically sorted if multiple** (audit requirement).

---

### model (Optional)

**Valid values**: `inherit`, `sonnet`, `opus`, `haiku`

**Default if omitted**: `inherit` (inherits from main session's model)

**CRITICAL**: This controls MODEL selection, not context. Context is ALWAYS isolated for sub-agents.

---

#### When to use `inherit` (Recommended for 40%+ of agents)

**Use inherit when task complexity varies and user's session model reflects their current priority.**

**Development agents** (backend-developer, frontend-developer, python-developer, integration-developer):

- Opus session: User needs careful reasoning for complex feature
- Sonnet session: User wants fast iteration for simple fix

**Testing agents** (unit, e2e, integration, acceptance, coverage):

- Opus session: User wants comprehensive test suite with edge cases
- Sonnet session: User wants quick test coverage for simple feature

**MCP tool agents** (praetorian-cli-expert, chromatic-test-engineer):

- Opus session: User needs complex data analysis
- Sonnet session: User wants quick data retrieval

**Benefit**: Agents adapt to user's workflow preference (speed vs thoroughness).

**Research**: [Anthropic Multi-Agent Research](https://www.anthropic.com/engineering/multi-agent-research-system)

> "Using 'inherit' is particularly useful when you want your subagents to adapt to the model choice of the main conversation"

---

#### When to use `opus` (Architecture, Security, Quality)

**Use opus when errors are costly and deep reasoning is non-negotiable.**

**Architecture agents** (backend-architect, frontend-architect, security-lead):

- Reason: System design requires trade-off analysis
- Cost of error: Architectural mistakes are expensive to fix later

**Security analysis** (backend-security, frontend-security):

- Reason: Vulnerability detection requires thoroughness
- Cost of error: Missing vulnerabilities is unacceptable

**Code review** (backend-reviewer, frontend-reviewer):

- Reason: Quality gates, subtle bug detection
- Cost of error: Bad code merges create technical debt

**UX design** (uiux-designer):

- Reason: WCAG 2.1 AA compliance, design system consistency
- Cost of error: Accessibility violations, poor user experience

**Benefit**: Guaranteed high-quality output regardless of user's main session model.

---

#### When to use `sonnet` (Orchestration, Infrastructure)

**Use sonnet when speed is valuable and task is well-defined.**

**Orchestrators** (backend-orchestrator, frontend-orchestrator):

- Reason: Coordination and delegation, not deep analysis
- Benefit: Faster coordination, responsive task delegation

**Infrastructure** (aws-infrastructure-specialist):

- Reason: Mechanical tasks (CDK patterns, resource configuration)
- Benefit: Faster execution, sufficient reasoning for patterns

**Pattern analysis** (use native Explore agent):

- Reason: Native Explore agent handles codebase discovery
- Benefit: Built-in tooling optimized for exploration

**Benefit**: Faster execution for tasks that don't benefit from Opus-level reasoning.

---

#### When to use `haiku` (Rare)

**Use haiku only for very simple tasks**:

- Simple list operations
- Basic formatting tasks
- Minimal reasoning required

**Note**: Very rare in practice. If considering haiku, question whether the task needs an agent at all.

---

#### Context vs Model Clarification

**CRITICAL**: Do not confuse context isolation with model inheritance.

| Aspect      | Configuration                           | Behavior                                                 |
| ----------- | --------------------------------------- | -------------------------------------------------------- |
| **Context** | NOT configurable                        | ALWAYS isolated (sub-agents never see main conversation) |
| **Model**   | `inherit` / `sonnet` / `opus` / `haiku` | Can inherit from main session OR be explicit             |

**Why this matters**:

- Context isolation prevents information overload
- Model inheritance allows adaptation to user preference
- These are independent concerns

---

#### Decision Flowchart

```
START: What type of agent?
│
├─ Architecture / Security / Code Review?
│  └─ YES → opus (non-negotiable quality)
│
├─ Orchestrator / Infrastructure?
│  └─ YES → sonnet (speed beneficial)
│
├─ Development / Testing / MCP Tools?
│  └─ YES → inherit (user controls priority)
│
└─ Very simple task?
   └─ YES → haiku (rare)
```

---

### color (Required)

**Valid values**: Color names matching type

**By type** (MUST match):
| Type | Color | Hex (informational) |
|------|-------|---------------------|
| architecture | blue | For design/planning |
| development | green | For building |
| testing | yellow | For validation |
| quality | purple | For review |
| analysis | orange | For assessment |
| research | cyan | For investigation |
| orchestrator | magenta | For coordination |
| mcp-tools | teal | For integration |

**Must match type** - audit checks this.

---

## Validation Checklist

**Before proceeding from Phase 4 (Configuration)**:

- [ ] name is kebab-case (lowercase, hyphens only)
- [ ] name matches filename (will be checked in Phase 5)
- [ ] description starts with "Use when"
- [ ] description includes `<example>` block
- [ ] description is single-line with `\n` escapes (NO `|` or `>`)
- [ ] description <1024 characters
- [ ] type is one of 8 valid values
- [ ] permissionMode matches type (plan for architecture/analysis/research, default otherwise)
- [ ] tools include required minimum for type
- [ ] tools are alphabetically sorted
- [ ] skills include gateway if domain-specific
- [ ] skills include mandatory skills for type
- [ ] skills are alphabetically sorted (if multiple)
- [ ] model is sonnet/opus/haiku (sonnet default)
- [ ] color matches type

**All items required for valid frontmatter** ✅

---

## Common Errors

### Block Scalar Description

**Error**:

```yaml
description: |
  Use when developing...
```

**Why wrong**: Parser returns literal `|`, agent is invisible to Claude's selection.

**Fix**:

```yaml
description: Use when developing...\n\n<example>...\n</example>
```

---

### Missing Example

**Error**:

```yaml
description: Use when developing Python applications
```

**Why wrong**: No examples to guide Claude's selection.

**Fix**:

```yaml
description: Use when developing Python applications - CLI tools, pytest.\n\n<example>\nContext: User needs CLI\nuser: "Create CLI"\nassistant: "I'll use python-developer"\n</example>
```

---

### Tools Not Alphabetized

**Error**:

```yaml
tools: Write, Read, Bash, Edit
```

**Why wrong**: Audit Phase 1 checks alphabetization.

**Fix**:

```yaml
tools: Bash, Edit, Read, Write
```

---

### Wrong permissionMode for Type

**Error**:

```yaml
type: architecture
permissionMode: default # WRONG
```

**Why wrong**: Architecture agents should be plan mode (read-only during design).

**Fix**:

```yaml
type: architecture
permissionMode: plan
```

---

### Color Mismatch

**Error**:

```yaml
type: development
color: blue # WRONG (blue is for architecture)
```

**Why wrong**: Audit Phase 1 checks color matches type.

**Fix**:

```yaml
type: development
color: green
```

---

## Quick Reference

**Minimal valid frontmatter**:

```yaml
---
name: my-agent
description: Use when [trigger] - [caps].\n\n<example>...\n</example>
type: development
permissionMode: default
tools: Bash, Read, TodoWrite, Write
color: green
---
```

**Full frontmatter**:

```yaml
---
name: my-agent
description: Use when [trigger] - [caps].\n\n<example>...\n</example>
type: development
permissionMode: default
tools: Bash, Edit, Grep, Glob, Read, TodoWrite, Write
skills: debugging-systematically, developing-with-tdd, gateway-frontend, verifying-before-completion
model: opus
color: green
---
```

**All fields present, alphabetized, correct for type** ✅

---

## Related Documents

- **`type-selection-guide.md`** - Which type to choose
- **`skill-integration-guide.md`** - Which skills to include
- **`agent-templates.md`** - Complete template examples
- **`../SKILL.md`** - Phase 4 quick reference
