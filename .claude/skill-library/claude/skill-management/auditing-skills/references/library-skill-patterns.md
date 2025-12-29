# Library Skill Patterns

**How to identify library skills and check for external documentation links during semantic review.**

---

## What is a Library Skill?

A **library skill** wraps external tools, libraries, or frameworks that have their own official documentation.

### Characteristics

Library skills typically:

- Document an npm package (React, TanStack Query, Zod)
- Wrap external APIs (GitHub, Linear, Jira, Stripe)
- Cover third-party services (Chromatic, Playwright, Sentry)
- Explain framework usage (Next.js, Vite, Tailwind)

### Location Pattern

Library skills are usually in:

- `.claude/skill-library/development/frontend/` (UI libraries)
- `.claude/skill-library/development/backend/` (Backend libraries/APIs)
- `.claude/skill-library/development/integrations/` (Third-party integrations)
- `.claude/skill-library/claude/mcp-tools/` (MCP tool wrappers)

---

## Identifying Library Skills

### Quick Check

**Does the skill's primary purpose involve external documentation that exists outside this repository?**

| If skill is about...    | Library Skill? | Needs External Docs?                   |
| ----------------------- | -------------- | -------------------------------------- |
| React Hook Form usage   | ✅ Yes         | ✅ Yes - official React Hook Form docs |
| TanStack Query patterns | ✅ Yes         | ✅ Yes - official TanStack docs        |
| TDD methodology         | ❌ No          | ❌ No - internal process skill         |
| Systematic debugging    | ❌ No          | ❌ No - internal process skill         |
| GitHub API integration  | ✅ Yes         | ✅ Yes - GitHub API docs               |
| Jira API integration    | ✅ Yes         | ✅ Yes - Jira API docs                 |
| Progressive disclosure  | ❌ No          | ❌ No - internal architecture pattern  |

### Decision Tree

```
Does the skill teach how to use an external tool/library/service?
├─ Yes → Library skill, should have external docs
│   ├─ Has npm package? → Official npm/package docs
│   ├─ Has API? → Official API documentation
│   └─ Has service? → Official service documentation
└─ No → Process/pattern skill, internal references only
```

---

## External Documentation Check

### What to Look For

During semantic review, check if library skills have:

**Option 1: Brief list in SKILL.md (5-10 links)**

```markdown
## Related Resources

### Official Documentation

- **React 19 Release**: https://react.dev/blog/2024/12/05/react-19
- **useActionState**: https://react.dev/reference/react/useActionState
- **useOptimistic**: https://react.dev/reference/react/useOptimistic
```

**Option 2: Comprehensive file (20+ links)**

```
references/links-to-official-docs.md
```

Referenced from SKILL.md:

```markdown
## Related Resources

For comprehensive official documentation links, see [references/links-to-official-docs.md](references/links-to-official-docs.md).
```

### Checking Pattern

1. **Identify library skill** (uses external tool/library/framework)
2. **Check for "## Related Resources" section** in SKILL.md
3. **Check for references/links-to-official-docs.md** if comprehensive
4. **Flag as WARNING** if missing (not error)

### Warning Format

```
⚠️ External Documentation Links

Library skill wrapping [external-tool] is missing external documentation links.

Expected:
- Brief list (5-10 links): Add "## Related Resources" section to SKILL.md
- Comprehensive (20+): Create references/links-to-official-docs.md

See: .claude/skill-library/claude/skill-management/creating-skills/references/skill-templates.md
     (External Documentation Links Pattern section)
```

---

## Examples

### Library Skills WITH External Docs ✅

**using-modern-react-patterns** (after update):

- Has "## Related Resources" section in SKILL.md
- Links to 6 React 19 official docs
- Brief list (appropriate for focused skill)

**implementing-react-hook-form-zod**:

- Has references/links-to-official-docs.md
- 50+ categorized links to official documentation
- Comprehensive file (appropriate for complex integration)

**frontend-tanstack**:

- Has "## Related Resources" section in SKILL.md
- Links to TanStack Query, Router, Table docs
- Brief list with key references

### Library Skills MISSING External Docs ⚠️

**Example pattern to flag:**

Skill: `stripe-integration`
Location: `.claude/skill-library/development/integrations/stripe-integration/`
Description: "Use when integrating Stripe payment processing..."
Content: Documents Stripe API usage, webhook handling, error codes
Issue: ❌ No "## Related Resources" section, no references/links-to-official-docs.md
Expected: ✅ Links to Stripe API docs, webhook reference, error code reference

### Non-Library Skills (No External Docs Needed) ✅

**developing-with-tdd**:

- ✅ No external docs needed (internal methodology)
- ✅ Has internal references only (RED-GREEN-REFACTOR patterns)

**debugging-systematically**:

- ✅ No external docs needed (internal process)
- ✅ Has internal references only (root cause analysis, hypothesis testing)

**adhering-to-yagni**:

- ✅ No external docs needed (internal principle)
- ✅ References internal examples only

---

## Semantic Review Workflow

### Step 1: Classify Skill

Read skill description and content:

- Is this a library/integration skill?
- Does it wrap an external tool/service?

### Step 2: Check for External Docs

If library skill:

- Look for "## Related Resources" in SKILL.md
- Look for references/links-to-official-docs.md
- Check if links are present and relevant

### Step 3: Flag as Warning

If library skill is missing external docs:

- **Severity:** WARNING (not error)
- **Rationale:** Skill may still be functional, but less discoverable
- **Action:** Suggest adding external docs section
- **Reference:** Point to creating-skills template

### Step 4: Report Findings

```markdown
## Semantic Review Findings

### External Documentation Links

- **Issue:** Library skill missing official documentation links
- **Current:** No "## Related Resources" section in SKILL.md
- **Expected:** Brief list (5-10 links) to official docs
- **Suggested links:**
  - Official docs homepage
  - API reference
  - Getting started guide
  - Migration guide (if applicable)
- **Template:** See creating-skills/references/skill-templates.md (External Documentation Links Pattern)
```

---

## Common Edge Cases

### Case 1: Skill wraps multiple libraries

**Example:** `implementing-react-hook-form-zod`

**Solution:** Comprehensive file (references/links-to-official-docs.md) with sections for each library

### Case 2: Library has minimal documentation

**Example:** Small utility library with just README

**Solution:** Brief list with GitHub repo link + README

### Case 3: Internal wrapper around external tool

**Example:** MCP tool wrappers

**Solution:** Link to both MCP server docs AND tool's official docs

### Case 4: Framework-specific patterns

**Example:** `nextjs-ssr-patterns`

**Solution:** Link to Next.js docs for referenced features

---

## Related

- [External Documentation Links Pattern](../../creating-skills/references/skill-templates.md#external-documentation-links-pattern) - Template guidance
- [Post-Audit Semantic Review](../../../skills/managing-skills/references/audit-phases.md#post-audit-semantic-review) - Complete semantic review checklist
- [Progressive Disclosure](../../../skills/managing-skills/references/progressive-disclosure.md) - When to use comprehensive file vs brief list
