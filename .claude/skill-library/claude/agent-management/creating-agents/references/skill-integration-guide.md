# Skill Integration Guide

**Purpose**: How to integrate gateway skills and create skill reference tables

**When to read**: Phase 4.3 (Skill Selection) and Phase 6.3 (Skill References)

---

## When to Use Gateway Skills

### Decision Criteria

**Include gateway skill if**:
- Agent works in specific domain (frontend, backend, testing, security)
- Agent needs access to domain-specific patterns
- Agent delegates to specialized library skills

**Don't include gateway if**:
- Agent is domain-agnostic
- Agent uses only process skills (brainstorming, TDD, etc.)
- Agent is pure orchestrator (uses plan/execute skills instead)

---

## Gateway Mapping

### By Domain

| Domain | Gateway Skill | When to Use |
|--------|--------------|-------------|
| **Frontend** | `gateway-frontend` | React, TypeScript, UI components, state management |
| **Backend** | `gateway-backend` | Go, APIs, infrastructure, databases |
| **Testing** | `gateway-testing` | Test frameworks, patterns, E2E/unit/integration |
| **Security** | `gateway-security` | Auth, secrets, cryptography, OWASP |
| **MCP Tools** | `gateway-mcp-tools` | Linear, Praetorian CLI, Context7 wrappers |
| **Integrations** | `gateway-integrations` | Third-party API patterns |

### By Agent Type

| Agent Type | Typical Gateway |
|------------|----------------|
| architecture (backend) | gateway-backend |
| architecture (frontend) | gateway-frontend |
| architecture (security) | gateway-security |
| development (backend) | gateway-backend |
| development (frontend) | gateway-frontend |
| testing (any) | gateway-testing |
| quality (domain-specific) | gateway-{domain} |
| analysis (security) | gateway-security |
| research | (none typically) |
| orchestrator | (none - uses plan/execute skills) |
| mcp-tools | gateway-mcp-tools (mandatory) |

---

## Frontmatter vs Body References

### Frontmatter: Gateway Skills Only

**In skills field, include ONLY**:
- Gateway skills (`gateway-frontend`, `gateway-backend`, etc.)
- Core process skills (`brainstorming`, `developing-with-tdd`, etc.)

**Do NOT include**:
- Library skill paths (those go in body Skill References table)
- Library skill names directly

**Example**:
```yaml
# ✅ CORRECT - gateway in frontmatter
skills: developing-with-tdd, gateway-frontend, verifying-before-completion

# ❌ WRONG - library path in frontmatter
skills: .claude/skill-library/development/frontend/frontend-tanstack/SKILL.md

# ❌ WRONG - library skill name in frontmatter
skills: frontend-tanstack-query
```

**Why**: Frontmatter references skills that auto-load. Library skills load on-demand via body references.

---

### Body: Skill Reference Table

**In agent body, create table mapping tasks to library skills**:

```markdown
## Skill References (Load On-Demand via Gateway)

**IMPORTANT**: Before implementing, consult the `gateway-frontend` skill to see available capabilities.

### Common Skill Routing

| Task | Skill to Read |
|------|---------------|
| Data fetching | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` |
| Global state | `.claude/skill-library/development/frontend/state/frontend-zustand-state-management/SKILL.md` |
| Performance | `.claude/skill-library/development/frontend/patterns/frontend-performance-optimization/SKILL.md` |

**Workflow**:
1. Identify task domain
2. Read relevant skill from table
3. Follow loaded skill's instructions
```

**Why table is useful**:
- Quick reference for common tasks
- Direct paths (no searching)
- Progressive disclosure (load when needed)

---

## Creating Skill Reference Tables

### Step 1: Identify Common Tasks for Agent

**For each agent type/domain, list 5-10 common tasks**:

**Example for frontend-developer**:
- Data fetching (TanStack Query)
- Global state management (Zustand)
- Form handling (React Hook Form + Zod)
- Performance optimization
- File organization
- Testing patterns
- Chariot UI guidelines

---

### Step 2: Map Tasks to Library Skills

**Read gateway skill to find paths**:

```
Read `.claude/skills/gateway-frontend/SKILL.md`

Find routing table, extract paths for common tasks.
```

**Gateway skills list available library skills with full paths**.

**Example from gateway-frontend**:
```markdown
| Skill | Path |
|-------|------|
| frontend-tanstack | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` |
| frontend-zustand-state-management | `.claude/skill-library/development/frontend/state/frontend-zustand-state-management/SKILL.md` |
| frontend-react-hook-form-zod | `.claude/skill-library/development/frontend/frontend-react-hook-form-zod/SKILL.md` |
```

---

### Step 3: Create Table in Agent Body

**Format**:
```markdown
| Task | Skill to Read |
|------|---------------|
| {Task description} | {Full path from gateway} |
```

**Example**:
```markdown
| Task | Skill to Read |
|------|---------------|
| Data fetching | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` |
| Global state | `.claude/skill-library/development/frontend/state/frontend-zustand-state-management/SKILL.md` |
| Forms | `.claude/skill-library/development/frontend/frontend-react-hook-form-zod/SKILL.md` |
```

---

## Process Skills vs Gateway Skills

### Process Skills (Frontmatter)

**Characteristics**:
- Methodology/workflow guidance
- Apply across domains
- Located in `.claude/skills/` (core)
- Auto-load via frontmatter `skills` field

**Examples**:
- `brainstorming` - Explore alternatives
- `developing-with-tdd` - RED-GREEN-REFACTOR
- `debugging-systematically` - Root cause investigation
- `verifying-before-completion` - Final validation
- `writing-plans` - Task breakdown
- `executing-plans` - Plan execution

**Usage in agent**:
```yaml
skills: brainstorming, developing-with-tdd, verifying-before-completion
```

Agent invokes these skills directly (they auto-load).

---

### Gateway Skills (Frontmatter + Body Table)

**Characteristics**:
- Domain-specific pattern libraries
- Route to library skills
- Progressive disclosure (load on-demand)
- Frontmatter: Gateway name only
- Body: Table with library skill paths

**Examples**:
- `gateway-frontend` → routes to 20 frontend library skills
- `gateway-backend` → routes to 16 backend library skills
- `gateway-testing` → routes to 14 testing library skills

**Usage in agent**:
```yaml
# Frontmatter
skills: gateway-frontend, developing-with-tdd

# Body
## Skill References (Load On-Demand via Gateway)
| Task | Skill to Read |
|------|---------------|
| {Task} | .claude/skill-library/.../SKILL.md |
```

**Workflow**:
1. Agent sees `gateway-frontend` in frontmatter
2. Agent reads gateway to find available skills
3. Agent identifies task domain
4. Agent reads specific library skill from table
5. Agent follows library skill's instructions

---

## Alphabetization Requirement

**Skills field MUST be alphabetically sorted** (audit Phase 1 checks this).

**Examples**:

```yaml
# ✅ CORRECT
skills: brainstorming, debugging-systematically, developing-with-tdd, gateway-frontend, verifying-before-completion

# ❌ WRONG - not alphabetical
skills: developing-with-tdd, brainstorming, gateway-frontend, debugging-systematically, verifying-before-completion
```

**To alphabetize**:
1. List all skills
2. Sort case-insensitively
3. Join with `, `

---

## Validation Checklist

**After Phase 4 (Skill Selection)**:

- [ ] Gateway skill included if domain-specific
- [ ] Process skills included if needed
- [ ] All skills alphabetically sorted
- [ ] Skills field doesn't include library paths
- [ ] Skills field doesn't include library skill names directly

**After Phase 6 (Content Population)**:

- [ ] Skill References section present (if gateway included)
- [ ] Table maps common tasks to library skills
- [ ] All paths are full paths (`.claude/skill-library/...`)
- [ ] Paths match gateway's routing table
- [ ] Workflow instructions provided (how to use table)

---

## Related Documents

- **`type-selection-guide.md`** - Which gateway for each type
- **`frontmatter-reference.md`** - Skills field syntax
- **`agent-templates.md`** - Template examples with skills
- **Gateway skills** (`.claude/skills/gateway-*/SKILL.md`) - Routing tables
