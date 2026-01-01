# Output Format Template

Complete template for synthesizing codebase research findings.

## Full Synthesis Document Template

```markdown
# Codebase Research: {Topic}

**Date:** {YYYY-MM-DD}

**Researcher:** {Your name or "Claude"}

**Purpose:** {Why this research was conducted - e.g., "Creating skill for Go handler patterns"}

---

## Target

- **Path:** `{TARGET_PATH}`
- **Detected Stack:** {languages, frameworks discovered}
- **Structure:** {monorepo | single-project | polyglot}
- **Primary Language:** {language with most files}
- **Frameworks:** {list key frameworks/libraries}

---

## Scope

**Research goals:**

- {Goal 1 - e.g., "Identify handler patterns"}
- {Goal 2 - e.g., "Document error handling conventions"}
- {Goal 3 - e.g., "Find test organization structure"}

**Specific patterns sought:**

- {Pattern 1 - e.g., "Repository interfaces"}
- {Pattern 2 - e.g., "Middleware functions"}
- {Pattern 3 - e.g., "Error wrapping"}

**Files analyzed:** {count}

---

## Discovered Patterns

### Pattern 1: {Name}

**Location:** {file paths relative to TARGET_PATH}

**Convention:** {description of the pattern}

**Example:**

\`\`\`{language}
{code snippet demonstrating pattern}
\`\`\`

**Function signature:** `{signature}` (from `{file}`)

**Usage context:** {where/when this pattern is used}

**Variations:** {if pattern has multiple forms}

---

### Pattern 2: {Name}

{Same structure as Pattern 1}

---

### Pattern 3: {Name}

{Same structure as Pattern 1}

---

## Naming Conventions

### Files

- **{Language 1}:** {convention} - Examples: {examples}
- **{Language 2}:** {convention} - Examples: {examples}
- **Test files:** {pattern} - Examples: {examples}

### Functions

- **Exported:** {convention} - Examples: {examples}
- **Internal:** {convention} - Examples: {examples}
- **Handlers:** {pattern} - Examples: {examples}
- **Hooks (if applicable):** {pattern} - Examples: {examples}

### Types/Interfaces

- **Entities:** {convention} - Examples: {examples}
- **Props (if React):** {pattern} - Examples: {examples}
- **State:** {pattern} - Examples: {examples}
- **Services/Repositories:** {pattern} - Examples: {examples}
- **Errors:** {pattern} - Examples: {examples}

---

## Directory Structure

\`\`\`
{TARGET_PATH}/
├── {dir1}/ # {purpose}
│ ├── {subdir1}/ # {purpose}
│ └── {subdir2}/ # {purpose}
├── {dir2}/ # {purpose}
│ ├── {subdir3}/
│ └── {subdir4}/
└── {file}
\`\`\`

**Organizational pattern:** {feature-based | layered | domain-driven | etc.}

**Key observations:**

- {Observation 1 about structure}
- {Observation 2 about structure}
- {Observation 3 about structure}

---

## Code Examples for Skill

| Pattern        | File          | Function Signature     | Usage           |
| -------------- | ------------- | ---------------------- | --------------- |
| {pattern name} | `{file-path}` | `{function-signature}` | {when/how used} |
| {pattern name} | `{file-path}` | `{function-signature}` | {when/how used} |
| {pattern name} | `{file-path}` | `{function-signature}` | {when/how used} |

**Notes:**

- All file paths are relative to `{TARGET_PATH}`
- Use function signatures (NOT line numbers) when referencing in skill
- See `references/examples/` for detailed code examples

---

## Anti-Patterns Found

### Anti-pattern 1: {Name}

**Description:** {what the anti-pattern is}

**Location:** {where observed}

**Why to avoid:** {problems it causes}

**Correct pattern:** {what to do instead}

**Reference:** {file showing correct pattern}

---

### Anti-pattern 2: {Name}

{Same structure as Anti-pattern 1}

---

## Import/Dependency Patterns

### {Language 1}

**Convention:** {description of import style}

**Example:**

\`\`\`{language}
{import example}
\`\`\`

**Grouping:** {how imports are organized}

**Path resolution:** {relative vs absolute, aliases}

---

### {Language 2}

{Same structure as Language 1}

---

## Error Handling Patterns

### {Language 1}

**Convention:** {description of error handling style}

**Example:**

\`\`\`{language}
{error handling example}
\`\`\`

**Error types:**

- **Sentinel errors:** {if used, examples}
- **Custom types:** {if used, examples}
- **Wrapping:** {pattern used}

---

### {Language 2}

{Same structure as Language 1}

---

## Recommendations for Skill

### What to Include

1. **{Recommendation 1}**
   - Why: {justification}
   - Examples: {which examples to use}

2. **{Recommendation 2}**
   - Why: {justification}
   - Examples: {which examples to use}

3. **{Recommendation 3}**
   - Why: {justification}
   - Examples: {which examples to use}

### What to Emphasize

- **{Emphasis 1}:** {why this is important}
- **{Emphasis 2}:** {why this is important}
- **{Emphasis 3}:** {why this is important}

### What to Avoid

- **{Avoid 1}:** {why}
- **{Avoid 2}:** {why}
- **{Avoid 3}:** {why}

### Structure Recommendations

**Suggested skill sections:**

1. **Quick Reference** - Table with pattern names and file references
2. **Pattern 1 Section** - Detailed explanation with code examples
3. **Pattern 2 Section** - Detailed explanation with code examples
4. **Pattern 3 Section** - Detailed explanation with code examples
5. **Anti-patterns** - What NOT to do
6. **Related Patterns** - References to related skills/docs

---

## References

### Files Read

- `{file-1}` - {purpose, key takeaways}
- `{file-2}` - {purpose, key takeaways}
- `{file-3}` - {purpose, key takeaways}
- `{file-4}` - {purpose, key takeaways}
- `{file-5}` - {purpose, key takeaways}

### External Documentation

- {Link 1} - {description}
- {Link 2} - {description}

### Related Skills

- **{skill-1}:** {how it relates}
- **{skill-2}:** {how it relates}

---

## Appendix: Search Commands Used

### Technology Detection

\`\`\`bash
{commands run for language detection}
{commands run for framework detection}
{commands run for monorepo detection}
\`\`\`

### Pattern Discovery

\`\`\`bash
{commands run for pattern 1}
{commands run for pattern 2}
{commands run for pattern 3}
\`\`\`

### File Selection

\`\`\`bash
{commands used to select representative files}
\`\`\`

---

**End of Research Document**
```

---

## Minimal Template (For Simple Research)

For quick research sessions with limited scope:

```markdown
# Codebase Research: {Topic}

## Target

- Path: `{TARGET_PATH}`
- Stack: {detected languages/frameworks}

## Patterns Found

### {Pattern 1}

- **Location:** `{file}`
- **Signature:** `{function-signature}`
- **Usage:** {description}

### {Pattern 2}

{Same structure}

## Recommendations

- {Recommendation 1}
- {Recommendation 2}
- {Recommendation 3}

## Examples for Skill

| Pattern   | File     | Signature | Usage   |
| --------- | -------- | --------- | ------- |
| {pattern} | `{file}` | `{sig}`   | {usage} |
```

---

## Using the Output in Skill Creation

### Step 1: Save Synthesis Document

```
Write({skill-path}/references/codebase-research-{topic}.md, synthesized-content)
```

### Step 2: Extract Key Patterns for SKILL.md

From synthesis document, pull:

- **Quick Reference table** → Goes in SKILL.md
- **Pattern summaries** → Condensed version in SKILL.md
- **Detailed explanations** → Goes in `references/` files

### Step 3: Reference in Skill Content

**In SKILL.md:**

```markdown
## Handler Pattern

Lambda handlers follow a four-step structure. See `handler/asset.go` - `func AssetHandler(...)` for the canonical implementation.

**For complete examples and variations, see [references/codebase-research-handlers.md](references/codebase-research-handlers.md).**
```

**In gateway skill (if library skill):**

```markdown
| Skill Name     | Path                      | Purpose                                       |
| -------------- | ------------------------- | --------------------------------------------- |
| `{skill-name}` | `.../skill-name/SKILL.md` | {description} (informed by codebase research) |
```

---

## Progressive Disclosure Integration

**SKILL.md (concise):**

- Quick Reference table
- Pattern names and signatures
- Brief usage descriptions
- Links to references/

**references/codebase-research-{topic}.md (detailed):**

- Full synthesis document with all findings
- Complete code examples
- Anti-patterns and variations
- Search commands used

**references/examples/{pattern}-example.md (deep dive):**

- Line-by-line explanation of specific example
- Related patterns
- Common mistakes
- When to use vs not use

This three-tier structure keeps SKILL.md concise (<500 lines) while preserving research depth.

---

## Output Checklist

Before completing research phase, verify output includes:

- [ ] Target details (path, stack, structure)
- [ ] Scope documentation (goals, patterns sought)
- [ ] Discovered patterns (3+ patterns minimum)
- [ ] Naming conventions (files, functions, types)
- [ ] Directory structure with comments
- [ ] Code examples table (with file paths and signatures)
- [ ] Anti-patterns identified (what NOT to do)
- [ ] Recommendations for skill content
- [ ] Search commands used (for reproducibility)
- [ ] References to files read

**If any element missing, research phase is incomplete.**

---

## Example Complete Output

See `examples/go-handler-research.md` for a complete example of synthesized research output following this template.
