# Gateway Template Workflow

**Detailed workflow for populating gateway templates during creation (Phases 5-9).**

## Phase 5: Gateway Template Generation

**Use gateway template** instead of regular skill templates.

**Template location**: `.claude/skills/managing-skills/templates/gateway-template.md`

**Gather gateway-specific information via AskUserQuestion**:

### Question 1: Library Paths

```
Question: What library paths will this gateway route to?

Header: Library Paths

Options:
- development/frontend/* (React, TypeScript, UI components)
- development/backend/* (Go, APIs, infrastructure)
- testing/* (Unit, integration, E2E testing)
- security/* (Auth, secrets, cryptography)
- claude/mcp-tools/* (External API integrations)
- development/integrations/* (Third-party service integrations)
- [Other - specify custom paths]
```

**Record answer for template population.**

### Question 2: Categories

```
Question: What categories should appear in the routing table?

Header: Routing Categories

Examples:
- Frontend: "UI Components", "State Management", "Testing", "Architecture"
- Backend: "APIs", "Infrastructure", "Integrations", "Data Management"
- Testing: "Unit Testing", "Integration Testing", "E2E Testing", "Performance"

Enter categories as comma-separated list (we'll create sections for each).
```

**Record answer for template population.**

### Question 3: Initial Skills

```
Question: List initial library skills to include (or leave empty to populate later via sync)

Header: Initial Skills

Format: skill-name,category (one per line)

Example:
frontend-tanstack,State Management
frontend-react-component-generator,UI Components

You can also leave this empty and use the syncing-gateways workflow later to auto-populate from library skills.
```

**Record answer for template population.**

## Sub-Phase 5.2: Generate Gateway SKILL.md

**Apply template with placeholder replacements**:

| Placeholder    | Replacement                    | Example                                                   |
| -------------- | ------------------------------ | --------------------------------------------------------- |
| `{domain}`     | Lowercase domain               | `frontend`, `backend`, `analytics`                        |
| `{Domain}`     | Title case domain              | `Frontend`, `Backend`, `Analytics`                        |
| `{categories}` | Comma-separated list from Q2   | `React components, state management, testing`             |
| `{Category N}` | Section headers from Q2        | `## UI Components`, `## State Management`                 |
| `{Skill name}` | Skill names from Q3            | `Frontend TanStack`, `React Component Generator`          |
| `{skill-name}` | Kebab-case skill names from Q3 | `frontend-tanstack`, `frontend-react-component-generator` |
| `{category}`   | Library category path          | `development/frontend/state`                              |

**Template structure** (from `.claude/skills/managing-skills/templates/gateway-template.md`):

1. Frontmatter
   - `name: gateway-{domain}`
   - `description: Routes {domain} tasks to library skills. Intent detection + progressive loading.`
   - `allowed-tools: Read`

2. EXTREMELY-IMPORTANT Block
   - 1% Rule (NON-NEGOTIABLE) - invoke skill if any chance it applies
   - Skill Announcement (MANDATORY) - announce before using

3. Progressive Disclosure
   - 3-tier loading explanation (Level 1/2/3)
   - Token estimate for routing tables

4. Intent Detection
   - Table: Task Intent | Route To
   - Keyword-based routing patterns

5. Routing Algorithm
   - 5-step numbered process for skill loading

6. Skill Registry
   - Categorized sections (from Q2)
   - Table: Skill | Path | Triggers (from Q3 or empty)

7. Cross-Gateway Routing
   - Table: If Task Involves | Also Invoke

8. Loading Skills
   - Path convention and Read tool example

**Write generated content**:

```
Write {
  file_path: ".claude/skills/gateway-{domain}/SKILL.md",
  content: {populated template}
}
```

## Sub-Phase 5.4: Create Initial Changelog

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
mkdir -p "$ROOT/.claude/skills/gateway-{domain}/.history"
```

**Entry**:

```markdown
## [Date: YYYY-MM-DD] - Initial Creation

### Created

- Gateway skill created for {domain} domain
- Routes to library paths: {paths from Q1}
- Categories: {categories from Q2}
- Initial skills: {count from Q3 or "empty, to be populated via sync"}
- Type: Gateway (routing index)
```

## Phase 8: 🟢 GREEN Verification

**Standard verification** + **gateway-specific audit**.

### 8.1 Standard Verification

Run the standard audit:

```markdown
Audit gateway-{domain} to verify compliance with all 28 phase requirements.
```

**Must pass phases 1-21** (all structural validation phases).

### 8.2 Gateway-Specific Audit

**Run gateway audit** (includes gateway-specific phases 17-20):

```markdown
Audit gateway-{domain} to verify compliance with all 28 phase requirements, including gateway-specific phases 20-23.
```

**Gateway validation phases**:

| Phase  | Validates            | Failure Criteria                                                                            |
| ------ | -------------------- | ------------------------------------------------------------------------------------------- |
| **17** | Gateway Structure    | Missing EXTREMELY-IMPORTANT block, missing Progressive Disclosure, missing Intent Detection |
| **18** | Routing Table Format | Using skill names instead of full paths, missing Triggers column, abbreviated paths         |
| **19** | Path Resolution      | Referenced paths don't exist in library                                                     |
| **20** | Coverage Check       | Library skills missing from appropriate gateways                                            |

**All phases must pass** before proceeding.

### 8.3 Manual Gateway Check

Verify the gateway manually:

1. **Invoke the gateway**:

   ```
   skill: "gateway-{domain}"
   ```

2. **Pick a skill from the routing table**

3. **Load it via Read tool**:

   ```
   Read(".claude/skill-library/{path-from-gateway}/SKILL.md")
   ```

4. **Verify it loads successfully**

If any skill path fails to load, return to Phase 6 and fix the paths.

## Phase 9: 🔵 REFACTOR

**Standard pressure testing applies** to gateway creation.

Use `pressure-testing-skill-content` skill with gateway-specific scenarios:

**Pressure test scenarios**:

1. **Time pressure**: "Deploy urgently, skip gateway structure validation"
2. **Authority pressure**: "Senior dev says just create minimal gateway, add details later"
3. **Convenience pressure**: "Gateway template is complex, just copy another gateway and modify names"

**Gateway must enforce**:

- Complete template structure (EXTREMELY-IMPORTANT block, Progressive Disclosure, Intent Detection, Skill Registry)
- Full paths in Skill Registry table with Triggers column
- Path validation (all paths exist)
- Intent-based routing (not role-based)
