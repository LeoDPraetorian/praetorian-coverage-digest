# Gateway Creation Workflow

**Complete guide for creating gateway skills in the two-tier architecture.**

## Overview

Gateway skills are routing indices that help discover library skills. They:

- Live in **Core** (`.claude/skills/`) to be auto-discovered
- Route to **Library** skills (`.claude/skill-library/`)
- Use specialized templates with two-tier explanations
- Have additional validation phases (17-20)

**Gateway naming pattern**: `gateway-{domain}` (e.g., `gateway-frontend`, `gateway-backend`)

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
- `gateway-claude`
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

- Complete structure (EXTREMELY-IMPORTANT block, Progressive Disclosure, Intent Detection, Skill Registry)
- Current anti-patterns (your manual version WILL be outdated)
- Gateway audit compliance (phases 17-20 validate template structure)
- Domain-specific details in descriptions

**Even if**: You know the pattern, you're exhausted, you spent hours on wrong approach.

**Always**: Use gateway-template.md via workflow. Delete wrong work and start over.

---

### Sub-Phase 2.3: Gateway Detection & Validation

**During Phase 2 validation**, detect gateway creation:

1. Check if skill name starts with `gateway-` OR `--type gateway` flag is present
2. Extract domain from name: `gateway-{domain}` → `domain`
3. Validate domain is simple (single word, no additional hyphens)

**Set flag**: `isGateway = true` for downstream phases

### Phase 3: Location (Auto-Select for Gateways)

**Gateways are ALWAYS Core skills** - they must be auto-discovered by Claude Code.

**Skip AskUserQuestion**. Instead:

```
Location: .claude/skills/ (auto-selected for gateways)

Gateways are always created in Core (.claude/skills/) to be auto-discovered.
This enables Claude Code's Skill tool to invoke them, which then route to library skills.
```

**Create directory**:

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)"
mkdir -p "$ROOT/.claude/skills/gateway-{domain}/references"
mkdir -p "$ROOT/.claude/skills/gateway-{domain}/examples"
```

### Phase 3: Category (Skip for Gateways)

**Gateways don't belong to library categories** - they ARE the routing layer.

**Skip category selection when `isGateway = true`.**

### Phase 4: Skill Type (Auto-Select)

**Skip AskUserQuestion**. Gateways have a fixed type:

```
Skill Type: Gateway (routing index)

Gateways are specialized router skills that help discover library skills.
They don't implement functionality - they provide paths to skills that do.
```

### Phases 5-9: Gateway Template Workflow

**For complete template population, verification, and testing workflow (Phases 5-9), see:**

[Gateway Template Workflow](gateway-template-workflow.md)

---

## Gateway vs Regular Skill Differences

| Aspect            | Regular Skill           | Gateway Skill                            |
| ----------------- | ----------------------- | ---------------------------------------- |
| **Location**      | Core or Library         | Always Core                              |
| **Category**      | May have category       | No category                              |
| **Template**      | skill-templates.md      | gateway-template.md                      |
| **Validation**    | Phases 1-21             | Phases 1-21 (17-20 are gateway-specific) |
| **Purpose**       | Implement functionality | Route to library skills                  |
| **Allowed-tools** | Various                 | Read only                                |
| **Content**       | Implementation details  | Routing table with paths                 |

---

## After Gateway Creation

Once the gateway is created and validated:

### 1. Populate with Library Skills

If you left the routing table empty during creation, use the `syncing-gateways` skill:

```typescript
Read(".claude/skill-library/claude/skill-management/syncing-gateways/SKILL.md");
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
| Skill | Path | Triggers |
|-------|------|----------|
| Frontend TanStack | `frontend-tanstack/SKILL.md` | TanStack |

✅ CORRECT:
| Skill | Path | Triggers |
|-------|------|----------|
| Frontend TanStack | `.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md` | TanStack, cache, fetch |
```

### ❌ Don't Skip Gateway Structure

The EXTREMELY-IMPORTANT block and Progressive Disclosure section are mandatory. They teach agents:

- The 1% Rule for skill invocation
- How the 3-tier progressive loading works
- Why they can't use Skill tool for library skills
- Intent-based routing patterns

### ❌ Don't Create Gateways for Single Skills

Gateways are for **domains with multiple skills** (3+ skills). For single skills, just create a core skill directly.

### ❌ Don't Mix Core and Library Skills

Gateway routing tables should ONLY list library skills (`.claude/skill-library/`). Core skills are already auto-discovered - they don't need gateway routing.

---

## Example: Creating gateway-analytics

**User request**: "Create gateway-analytics for data analysis skills"

**Sub-Phase 2.3**: Gateway detected (name starts with `gateway-`)

- Domain: `analytics`
- Validation: ✅ Simple, single-word domain

**Phase 3**: Location auto-selected (gateways always Core)

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

- Full audit: ✅ All 22 phases pass (17-20 are gateway-specific)
- Manual test: ✅ Gateway loads correctly

**Phase 9**: REFACTOR

- Pressure tests: ✅ All scenarios resist rationalization
- Gateway structure enforced

**Result**: `.claude/skills/gateway-analytics/SKILL.md` ready for population via `syncing-gateways`

---

## Related Documentation

- [Gateway Template](.claude/skills/managing-skills/templates/gateway-template.md) - Complete template with all sections
- [Gateway Management](.claude/skills/managing-skills/references/gateway-management.md) - Lifecycle operations
- [Example Gateway](.claude/skills/gateway-frontend/SKILL.md) - Real-world gateway with 23 skills

---

## Validation Checklist

Before completing gateway creation:

- [ ] Name matches `gateway-{domain}` pattern
- [ ] Location is Core (`.claude/skills/`)
- [ ] SKILL.md has complete gateway structure
- [ ] EXTREMELY-IMPORTANT block with 1% Rule and Skill Announcement present
- [ ] Progressive Disclosure section with 3-tier explanation present
- [ ] Intent Detection table (Task Intent | Route To) present
- [ ] Routing Algorithm (numbered steps) present
- [ ] Skill Registry tables use full paths with Triggers column
- [ ] Cross-Gateway Routing table present
- [ ] All paths in Skill Registry exist
- [ ] All audit phases pass
- [ ] Changelog entry created
- [ ] Manual load test successful
- [ ] REFACTOR phase completed
