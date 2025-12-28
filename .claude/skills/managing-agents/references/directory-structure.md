# Agent Directory Structure

Agents are organized by purpose in `.claude/agents/`. Each category has a specific focus and typically a default permission mode.

## Directory Layout

```
.claude/agents/
├── architecture/     # 7 agents - system design (permissionMode: plan)
├── development/      # 16 agents - implementation (permissionMode: default)
├── testing/          # 8 agents - unit, integration, e2e
├── quality/          # 5 agents - code review, auditing
├── analysis/         # 6 agents - security, complexity (permissionMode: plan)
├── research/         # 3 agents - web search, docs (permissionMode: plan)
├── orchestrator/     # 8 agents - coordination, workflows
├── mcp-tools/        # 2 agents - specialized MCP access
└── .archived/        # Deprecated agents with reason
```

## Category Guidelines

### architecture/

- **Purpose:** System design, architectural patterns, technology decisions
- **Permission Mode:** `plan` (requires user approval before implementation)
- **Examples:** `frontend-architect`, `backend-architect`, `security-lead`

### development/

- **Purpose:** Implementation, coding, feature development
- **Permission Mode:** `default` (can implement directly)
- **Examples:** `frontend-developer`, `backend-developer`, `python-developer`

### testing/

- **Purpose:** Unit tests, integration tests, E2E tests
- **Permission Mode:** `default`
- **Examples:** `frontend-unit-test-engineer`, `backend-tester`, `frontend-e2e-test-engineer`

### quality/

- **Purpose:** Code review, auditing, quality assessment
- **Permission Mode:** `default`
- **Examples:** `frontend-reviewer`, `backend-reviewer`, `uiux-designer`

### analysis/

- **Purpose:** Security analysis, complexity assessment, threat modeling
- **Permission Mode:** `plan` (analysis requires review before action)
- **Examples:** `codebase-mapper`, `security-controls-mapper`, `security-test-planner`

### research/

- **Purpose:** Web research, documentation lookup, codebase exploration
- **Permission Mode:** `plan` (research should be reviewed before implementation)
- **Examples:** `code-pattern-analyzer`

### orchestrator/

- **Purpose:** Multi-phase workflows, agent coordination
- **Permission Mode:** `default`
- **Examples:** `frontend-orchestrator`, `backend-orchestrator`

### mcp-tools/

- **Purpose:** Specialized access to MCP servers (Linear, Praetorian CLI, etc.)
- **Permission Mode:** `default`
- **Examples:** `praetorian-cli-expert`, `chromatic-test-engineer`

### .archived/

- **Purpose:** Deprecated agents kept for historical reference
- **Naming:** Original agent name with deprecation reason in README
- **Note:** Archived agents should include deprecation date and replacement recommendation

## Placement Guidelines

When creating a new agent, choose the category based on its **primary purpose**:

- **Designs systems?** → `architecture/`
- **Writes code?** → `development/`
- **Writes tests?** → `testing/`
- **Reviews code?** → `quality/`
- **Analyzes security?** → `analysis/`
- **Researches information?** → `research/`
- **Coordinates other agents?** → `orchestrator/`
- **Wraps MCP tools?** → `mcp-tools/`

If an agent spans multiple categories, choose the category that represents the **majority of its work**.
