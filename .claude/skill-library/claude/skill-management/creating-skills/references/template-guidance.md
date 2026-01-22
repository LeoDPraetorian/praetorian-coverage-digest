# Template Guidance for Skill Creation

**Detailed guidance on skill templates, line count management, and tool access control.**

---

## Line Count Thresholds

**Unified thresholds across all skill management:**

| Lines   | Status        | Action                      |
| ------- | ------------- | --------------------------- |
| < 350   | ✅ Safe       | Ideal target for new skills |
| 350-450 | ⚠️ Caution    | Monitor during creation     |
| 450-500 | ⚠️ Warning    | Extract before proceeding   |
| > 500   | ❌ Hard limit | MUST restructure            |

**SKILL.md Structure (Target: 300-450 lines):**

See [skill-templates.md](skill-templates.md) for complete templates by skill type.

**Required sections:**

- Frontmatter (name, description, allowed-tools)
- When to Use
- Quick Reference / Quick Start
- Core Workflow (with links to references/)
- Critical Rules
- Related Skills

---

## Description Requirements (CRITICAL for Discovery)

**🚨 MUST be third-person** - Description is injected into system prompt, inconsistent point-of-view breaks discovery.

```yaml
# ✅ CORRECT: Third-person
description: Processes Excel files and generates reports. Use when analyzing spreadsheets or .xlsx files.

# ❌ WRONG: First-person
description: I can help you process Excel files and generate reports.

# ❌ WRONG: Second-person
description: You can use this to process Excel files and generate reports.
```

**Why this matters:** The description appears in Claude's system prompt. Using "I" or "You" creates point-of-view confusion that degrades skill selection accuracy.

**Pattern:** `[Action verb]s [object]` - "Processes files", "Analyzes data", "Generates reports"

---

## Tool Access Control (Optional but Recommended)

Use `allowed-tools` to restrict which tools Claude can use when executing this skill. This improves security and prevents unintended side effects.

**Tool scoping patterns:**

| Skill Type   | Tools                                 | Example            |
| ------------ | ------------------------------------- | ------------------ |
| Read-only    | `Read, Grep, Glob`                    | Analysis skills    |
| Git workflow | `Bash(git:*), Read, Write`            | Version control    |
| Full access  | `Read, Write, Edit, Bash, Grep, Glob` | Development skills |

**Examples:**

### Read-Only Analysis Skill

```yaml
allowed-tools: Read, Grep, Glob
```

For skills that analyze code but shouldn't modify anything (code review, architecture analysis).

### Git Workflow Skill

```yaml
allowed-tools: Bash(git:*), Read, Write, TodoWrite
```

For skills that manage version control but shouldn't run arbitrary commands.

### Full Development Skill

```yaml
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
```

For skills that implement features and need broad tool access.

### MCP Integration Skill

```yaml
allowed-tools: mcp__service-name__*, Read, TodoWrite
```

For skills that wrap MCP server tools.

---

## Content Placement Strategy

**SKILL.md** = overview, quick examples, core workflow, critical rules (target: 300-450 lines)

**references/** = detailed explanations, API docs, advanced patterns (<400 lines each)

**Distribution guidelines:**

| Content Type              | Location    | Rationale             |
| ------------------------- | ----------- | --------------------- |
| "Use when" triggers       | SKILL.md    | Needed for discovery  |
| Quick reference tables    | SKILL.md    | Rapid orientation     |
| Core workflow (3-5 steps) | SKILL.md    | Essential path        |
| Critical rules            | SKILL.md    | Safety and compliance |
| Detailed examples         | references/ | Deep understanding    |
| API documentation         | references/ | Reference lookup      |
| Edge cases                | references/ | Uncommon scenarios    |
| Troubleshooting           | references/ | Problem-solving       |
| Historical context        | references/ | Background info       |

---

## Progressive Disclosure Pattern

**From the start**, design skills with progressive disclosure:

1. **SKILL.md**: High-level overview with links
2. **references/**: Detailed implementation guides
3. **examples/**: Working code samples

**Example structure:**

```
my-skill/
├── SKILL.md (350 lines)
│   ├── Overview & When to Use
│   ├── Quick Reference (3-5 key patterns)
│   ├── Core Workflow (main sections with reference links)
│   └── Related Skills
├── references/
│   ├── detailed-workflow.md (comprehensive steps)
│   ├── api-reference.md (complete API docs)
│   ├── troubleshooting.md (common issues)
│   └── advanced-patterns.md (complex scenarios)
└── examples/
    ├── basic-usage.ts
    └── advanced-integration.ts
```

**Real example**: `designing-frontend-architecture` skill

- SKILL.md: 293 lines (overview + quick reference)
- references/: 7 files with 16KB detailed content
- Total: Comprehensive coverage, scannable entry point

---

### Reference Depth Limit (MANDATORY)

**Keep all references ONE level deep from SKILL.md.**

Claude may partially read deeply nested files (using `head -100` preview), missing critical content at the end.

```
❌ WRONG (too deep):
SKILL.md → refs/guide.md → refs/details.md → actual-info.md

✅ CORRECT (one level):
SKILL.md → refs/guide.md
SKILL.md → refs/details.md
SKILL.md → refs/api-reference.md
```

All referenced files should be directly accessible from SKILL.md links.

---

## Template Selection by Skill Type

See [skill-templates.md](skill-templates.md) for complete templates.

| Skill Type        | Template                    | Use When                         |
| ----------------- | --------------------------- | -------------------------------- |
| Process/Pattern   | Methodology template        | Workflows, TDD, debugging        |
| Library/Framework | npm package template        | TanStack Query, Zustand          |
| Integration       | Service connection template | GitHub + Linear, AWS + Terraform |
| Tool Wrapper      | CLI/MCP wrapper template    | praetorian-cli, context7         |
| Gateway           | Gateway template            | Routing to library skills        |

---

## Line Count Management During Creation

**Phase 5 (Generation)**: Start with conservative estimates

```bash
# After writing initial SKILL.md
wc -l {skill-path}/SKILL.md

# Target thresholds
< 350 lines: ✅ Safe, continue to research
350-400 lines: ⚠️ Caution, keep additions minimal
400-500 lines: ⚠️ Warning, plan extraction during research
> 500 lines: ❌ FAIL, must restructure immediately
```

**Phase 6 (Research)**: Add content with awareness

- For each new section: estimate lines before adding
- If addition would exceed 450 lines: extract to reference instead
- Keep running count during research phase

**Phase 8 (GREEN)**: Final validation

```bash
wc -l {skill-path}/SKILL.md
```

If > 500 lines:

1. Identify largest sections
2. Extract to references/
3. Replace with summary + link
4. Re-verify < 500 lines

---

## Common Template Anti-Patterns

### ❌ Copy-Paste Without Adaptation

Don't just fill templates with placeholder text. Research actual patterns from the codebase.

```markdown
❌ WRONG:

## Pattern 1

[TODO: Add pattern here]

✅ CORRECT:

## Repository Pattern

Interface-based data access with dependency injection:
[actual code example from codebase]
```

### ❌ Exceed Line Limits "Temporarily"

Don't rationalize: "I'll extract later, after I finish content."

Exceeding 500 lines creates friction - you must stop and restructure before continuing. This disrupts flow.

**Better**: Design for progressive disclosure from the start. Create reference files during Phase 5, populate during Phase 6.

### ❌ Skip Tool Access Control

```yaml
❌ WRONG: (no allowed-tools field)
name: my-skill
description: ...

✅ CORRECT:
name: my-skill
description: ...
allowed-tools: Read, Grep, Glob
```

Tool access control prevents unintended side effects. Always specify.

### ❌ Deeply Nested References

```markdown
❌ WRONG:
See [advanced.md](references/advanced.md) which links to [details.md](references/details.md)

✅ CORRECT:
See [advanced.md](references/advanced.md) for patterns
See [details.md](references/details.md) for implementation
```

Claude may not fully read files referenced from other reference files.

### ❌ First/Second Person Descriptions

```yaml
❌ WRONG:
description: I can help you debug React components

✅ CORRECT:
description: Debugs React components systematically. Use when encountering render issues or state bugs.
```

Point-of-view consistency matters for Claude's skill selection.

---

## Related

- [Skill Templates](skill-templates.md) - Complete templates by type
- [Progressive Disclosure](progressive-disclosure.md) - Content organization strategy
- [Gateway Creation](gateway-creation.md) - Special template for gateways
