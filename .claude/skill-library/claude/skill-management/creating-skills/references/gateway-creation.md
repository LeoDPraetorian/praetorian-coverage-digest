# Gateway Creation Workflow

**Complete guide for creating gateway skills in the two-tier architecture.**

## Overview

Gateway skills are routing indices that help discover library skills. They:

- Live in **Core** (`.claude/skills/`) to be auto-discovered
- Route to **Library** skills (`.claude/skill-library/`)
- Use specialized templates with two-tier explanations
- Have additional validation phases (17-20)

**Gateway naming pattern**: `gateway-{domain}` (e.g., `gateway-frontend`, `gateway-analytics`)

---

## When Creating a Gateway

You're creating a gateway if:

- Skill name starts with `gateway-`
- User passes `--type gateway` flag
- User explicitly requests "create a gateway"

**Gateway names MUST match pattern**: `gateway-{domain}`

**Valid examples**:

- `gateway-frontend`
- `gateway-backend`
- `gateway-analytics`
- `gateway-security`

**Invalid examples**:

- `gateway` (missing domain)
- `gateway-foo-bar` (domain should be simple, single word)
- `frontend-gateway` (wrong order)

---

## Gateway Creation Phases

### 🚨 CRITICAL: Follow Template Workflow

**Do NOT**:

- ❌ Copy gateway-frontend and modify names ("faster", "same result")
- ❌ Manually adapt existing work ("sunk cost", "already done")
- ❌ Skip questions and create minimal structure ("pragmatic", "add details later")

**WHY**: Template workflow ensures:

- Complete structure (Understanding section, IMPORTANT block, two-tier table)
- Current anti-patterns (your manual version WILL be outdated)
- Gateway audit compliance (phases 17-20 validate template structure)
- Domain-specific details in descriptions

**Even if**: You know the pattern, you're exhausted, you spent hours on wrong approach.

**Always**: Use gateway-template.md via workflow. Delete wrong work and start over.

---

### Phase 1: Gateway Detection & Validation

**After name validation**, detect gateway creation:

1. Check if skill name starts with `gateway-` OR `--type gateway` flag is present
2. Extract domain from name: `gateway-{domain}` → `domain`
3. Validate domain is simple (single word, no additional hyphens)

**Set flag**: `isGateway = true` for downstream phases

### Phase 2: Location (Auto-Select)

**Gateways are ALWAYS Core skills** - they must be auto-discovered by Claude Code.

**Skip AskUserQuestion**. Instead:

```
Location: .claude/skills/ (auto-selected for gateways)

Gateways are always created in Core (.claude/skills/) to be auto-discovered.
This enables Claude Code's Skill tool to invoke them, which then route to library skills.
```

**Create directory**:

```bash
mkdir -p .claude/skills/gateway-{domain}/references
mkdir -p .claude/skills/gateway-{domain}/examples
```

### Phase 3: Category (Skip Entirely)

**Gateways don't belong to library categories** - they ARE the routing layer.

**Skip Phase 3 entirely when `isGateway = true`.**

### Phase 4: Skill Type (Auto-Select)

**Skip AskUserQuestion**. Gateways have a fixed type:

```
Skill Type: Gateway (routing index)

Gateways are specialized router skills that help discover library skills.
They don't implement functionality - they provide paths to skills that do.
```

### Phase 5: Gateway Template Generation

**Use gateway template** instead of regular skill templates.

**Template location**: `.claude/skills/managing-skills/templates/gateway-template.md`

**Gather gateway-specific information via AskUserQuestion**:

#### Question 1: Library Paths

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

#### Question 2: Categories

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

#### Question 3: Initial Skills

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

### Phase 6: Generate Gateway SKILL.md

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
   - `description: Use when developing {domain} applications - access {categories}.`
   - `allowed-tools: Read`

2. Understanding This Gateway
   - How you got here (Skill tool invocation)
   - What this gateway provides (routing table)
   - How to load library skills (Read tool)

3. Critical: Two-Tier Skill System
   - Table showing Core vs Library tiers
   - IMPORTANT block with anti-patterns

4. How to Use This Gateway
   - 4-step workflow for finding and loading skills

5. Routing Table: Library Skills
   - Categorized sections (from Q2)
   - Skills with full paths (from Q3 or empty)

6. Quick Lookup by Task (optional)
   - Task-based index

7. Related Gateways
   - Links to other gateway skills

**Write generated content**:

```
Write {
  file_path: ".claude/skills/gateway-{domain}/SKILL.md",
  content: {populated template}
}
```

### Phase 7: Create Initial Changelog

```bash
mkdir -p .claude/skills/gateway-{domain}/.history
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

### Phase 8: 🟢 GREEN Verification

**Standard verification** + **gateway-specific audit**.

#### 8.1 Standard Verification

Run the standard audit:

```bash
cd .claude
npm run audit -- gateway-{domain}
```

**Must pass phases 1-21** (all structural validation phases).

#### 8.2 Gateway-Specific Audit

**Run gateway audit** (includes gateway-specific phases 17-20):

```bash
REPO_ROOT=$(git rev-parse --show-superproject-working-tree 2>/dev/null)
REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
cd "$REPO_ROOT/.claude" && npm run audit -- gateway-{domain}
```

**Gateway validation phases**:

| Phase  | Validates            | Failure Criteria                                                                      |
| ------ | -------------------- | ------------------------------------------------------------------------------------- |
| **17** | Gateway Structure    | Missing "Understanding This Gateway", missing IMPORTANT block, missing two-tier table |
| **18** | Routing Table Format | Using skill names instead of full paths, abbreviated paths                            |
| **19** | Path Resolution      | Referenced paths don't exist in library                                               |
| **20** | Coverage Check       | Library skills missing from appropriate gateways                                      |

**All phases must pass** before proceeding.

#### 8.3 Manual Gateway Check

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

### Phase 9: 🔵 REFACTOR

**Standard pressure testing applies** to gateway creation.

Use `testing-skills-with-subagents` skill with gateway-specific scenarios:

**Pressure test scenarios**:

1. **Time pressure**: "Deploy urgently, skip gateway structure validation"
2. **Authority pressure**: "Senior dev says just create minimal gateway, add details later"
3. **Convenience pressure**: "Gateway template is complex, just copy another gateway and modify names"

**Gateway must enforce**:

- Complete template structure (Understanding section, IMPORTANT block, two-tier table)
- Full paths in routing table (not abbreviated)
- Path validation (all paths exist)
- Proper categorization

---

## Gateway vs Regular Skill Differences

| Aspect            | Regular Skill           | Gateway Skill                         |
| ----------------- | ----------------------- | ------------------------------------- |
| **Location**      | Core or Library         | Always Core                           |
| **Category**      | May have category       | No category                           |
| **Template**      | skill-templates.md      | gateway-template.md                   |
| **Validation**    | Phases 1-21             | Phases 1-21 (17-20 are gateway-specific) |
| **Purpose**       | Implement functionality | Route to library skills               |
| **Allowed-tools** | Various                 | Read only                             |
| **Content**       | Implementation details  | Routing table with paths              |

---

## After Gateway Creation

Once the gateway is created and validated:

### 1. Populate with Library Skills

If you left the routing table empty during creation, use the `syncing-gateways` skill:

```typescript
Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md")
// Follow Single Gateway workflow for gateway-{domain}
```

This workflow discovers library skills matching the gateway's domain and guides you to add them to the routing table.

### 2. Update Related Gateways

Add your new gateway to the "Related Gateways" section of existing gateways:

```markdown
## Related Gateways

| Gateway  | Invoke With                 | Use For               |
| -------- | --------------------------- | --------------------- |
| {Domain} | `skill: "gateway-{domain}"` | {Description from Q2} |
```

### 3. Test End-to-End

Test the complete workflow:

1. Invoke gateway: `skill: "gateway-{domain}"`
2. Find a skill in routing table
3. Load via Read: `Read("{path}")`
4. Verify skill loads and is usable
5. Confirm TodoWrite mandate is enforced

---

## Common Gateway Anti-Patterns

### ❌ Don't Skip Template Workflow (Even When You "Know the Pattern")

**Rationalization**: "I'll copy gateway-frontend and modify names. Faster than answering questions."

**Reality**: Template workflow exists for consistency and completeness:

- Questions ensure you think about domain structure upfront
- Template includes all required sections (you WILL forget some)
- Workflow validates against gateway-specific audit phases (17-20)
- Copying misses domain-specific details in descriptions and examples

**Even if**: You've created 10 gateways before, you're exhausted, it's faster to copy.

**Follow the workflow**: Read gateway-creation.md, answer questions, generate from template.

### ❌ Don't Manually Adapt Existing Work (Sunk Cost Fallacy)

**Rationalization**: "I already created structure. I'll just add gateway sections manually."

**Reality**: Manual adaptation bypasses validation and misses updates:

- Template ensures complete structure (Understanding section, IMPORTANT block, two-tier table)
- Template has current anti-patterns (your manual version will be outdated)
- Gateway audit phases (17-20) validate template-generated structure
- 25 minutes of work in wrong direction ≠ justification for wrong result

**Even if**: You spent hours, it's 7pm, you're exhausted, deleting feels wasteful.

**Delete and start over**: Sunk cost is sunk. Correct process matters more than speed.

### ❌ Don't Create Gateway Without Library Skills

Gateways with empty routing tables are confusing. Either:

- Populate with initial skills during creation (Q3)
- Immediately run `syncing-gateways` after creation

### ❌ Don't Use Abbreviated Paths

```markdown
❌ WRONG:
| Skill | Path |
|-------|------|
| Frontend TanStack | `frontend-tanstack/SKILL.md` |

✅ CORRECT:
| Skill | Path |
|-------|------|
| Frontend TanStack | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` |
```

### ❌ Don't Skip Gateway Structure

The "Understanding This Gateway" section and IMPORTANT block are mandatory. They teach agents:

- How the two-tier system works
- Why they can't use Skill tool for library skills
- Correct patterns for loading library skills

### ❌ Don't Create Gateways for Single Skills

Gateways are for **domains with multiple skills** (3+ skills). For single skills, just create a core skill directly.

### ❌ Don't Mix Core and Library Skills

Gateway routing tables should ONLY list library skills (`.claude/skill-library/`). Core skills are already auto-discovered - they don't need gateway routing.

---

## Example: Creating gateway-analytics

**User request**: "Create gateway-analytics for data analysis skills"

**Phase 1**: Gateway detected (name starts with `gateway-`)

- Domain: `analytics`
- Validation: ✅ Simple, single-word domain

**Phase 2**: Location auto-selected

- `.claude/skills/gateway-analytics/`

**Phase 3**: Category skipped (gateways don't have categories)

**Phase 4**: Type auto-selected (Gateway)

**Phase 5**: Template generation

- Q1 Paths: `analytics/*, operations/monitoring`
- Q2 Categories: "Data Processing, Visualization, Reporting"
- Q3 Skills: (empty, will populate via sync)

**Phase 6**: SKILL.md generated with:

- `name: gateway-analytics`
- `description: Use when developing analytics applications - access data processing, visualization, reporting.`
- Empty routing table (to be populated)

**Phase 7**: Changelog created

**Phase 8**: Verification

- Full audit: ✅ All 21 phases pass (17-20 are gateway-specific)
- Manual test: ✅ Gateway loads correctly

**Phase 9**: REFACTOR

- Pressure tests: ✅ All scenarios resist rationalization
- Gateway structure enforced

**Result**: `.claude/skills/gateway-analytics/SKILL.md` ready for population via `syncing-gateways`

---

## Related Documentation

- [Gateway Template](../.claude/skills/managing-skills/templates/gateway-template.md) - Complete template with all sections
- [Gateway Patterns](../../../docs/GATEWAY-PATTERNS.md) - Architecture and design principles
- [Gateway Management](../.claude/skills/managing-skills/references/gateway-management.md) - Lifecycle operations
- [Example Gateway](../.claude/skills/gateway-frontend/SKILL.md) - Real-world gateway with 23 skills

---

## Validation Checklist

Before completing gateway creation:

- [ ] Name matches `gateway-{domain}` pattern
- [ ] Location is Core (`.claude/skills/`)
- [ ] SKILL.md has complete gateway structure
- [ ] "Understanding This Gateway" section present
- [ ] IMPORTANT block with anti-patterns present
- [ ] Two-tier system table present
- [ ] Routing table uses full paths (not abbreviated)
- [ ] All paths in routing table exist
- [ ] All 21 phases pass audit
- [ ] Changelog entry created
- [ ] Manual load test successful
- [ ] REFACTOR phase completed
