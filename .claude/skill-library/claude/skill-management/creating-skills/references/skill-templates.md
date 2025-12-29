# Skill Templates

**Use these templates based on skill type selected in Phase 4.**

---

## Process/Pattern Template

For methodology, workflow, or best practice skills (TDD, debugging, brainstorming).

```markdown
---
name: { skill-name }
description: Use when {trigger} - {key capabilities}
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite
---

# {Skill Title}

**{Brief description of what this skill provides.}**

## When to Use

Use this skill when:

- {Scenario 1}
- {Scenario 2}
- {Scenario 3}

## Quick Reference

| Pattern     | Solution     | Example     |
| ----------- | ------------ | ----------- |
| {Pattern 1} | {Solution 1} | {Example 1} |

## Implementation

### Step 1: {Action}

{Instructions}

### Step 2: {Action}

{Instructions}

## Examples

See [examples/example-1.md](examples/example-1.md) for complete workflow.

## References

- [references/detailed-guide.md](references/detailed-guide.md) - Deep dive into patterns
```

---

## Library/Framework Template

For npm package, API, or framework documentation skills (TanStack Query, Zustand, Zod).

````markdown
---
name: { skill-name }
description: Use when working with {library-name} - {key capabilities}
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# {Skill Title}

**{Brief description of the library and its purpose.}**

## Version & Dependencies

| Package        | Version   | Docs Source       |
| -------------- | --------- | ----------------- |
| {package-name} | {version} | {manual/context7} |

## API Quick Reference

| Function | Purpose   | Example     |
| -------- | --------- | ----------- |
| {func1}  | {purpose} | `{example}` |

## When to Use

Use this skill when:

- Working with {library-name}
- {Scenario 2}
- {Scenario 3}

## Common Patterns

### Pattern 1: {Name}

```typescript
// Code example
```
````

## API Reference

See [references/api-reference.md](references/api-reference.md) for full documentation.

## Related Resources

### Official Documentation

- **{Library Name}**: https://...
- **API Reference**: https://...
- **Migration Guide**: https://...

See [External Documentation Links Pattern](#external-documentation-links-pattern) for guidance on organizing links.

## References

- [references/patterns.md](references/patterns.md)
- [references/api-reference.md](references/api-reference.md)

````

---

## Integration Template

For skills that connect two or more tools/services (GitHub + Linear, AWS + Terraform).

```markdown
---
name: {skill-name}
description: Use when integrating {System A} with {System B} - {key capabilities}
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# {Skill Title}

**{Integration purpose - what systems/tools does this connect?}**

## Prerequisites

- {Prerequisite 1}
- {Prerequisite 2}

## Configuration

{Configuration steps and environment variables}

## Quick Reference

| Operation | Command/Pattern | Notes |
|-----------|-----------------|-------|
| {op1} | {command} | {notes} |

## When to Use

Use this skill when:
- Connecting {System A} with {System B}
- {Scenario 2}
- {Scenario 3}

## Implementation

### Step 1: {Setup}

{Instructions}

### Step 2: {Integration}

{Instructions}

## Error Handling

{Common errors and solutions}

## References

- [references/api-reference.md](references/api-reference.md)
````

---

## Tool Wrapper Template

For skills that wrap CLI tools or MCP servers (praetorian-cli, context7).

````markdown
---
name: { skill-name }
description: Use when running {tool-name} commands - {key capabilities}
allowed-tools: Read, Bash, Grep, Glob
---

# {Skill Title}

**{Tool wrapper purpose - what CLI/MCP does this wrap?}**

## Prerequisites

- {Tool installation}
- {Required permissions}

## Quick Reference

| Command | Description | Example     |
| ------- | ----------- | ----------- |
| {cmd1}  | {desc}      | `{example}` |

## When to Use

Use this skill when:

- Running {tool-name} commands
- {Scenario 2}
- {Scenario 3}

## Commands

### {Command 1}

```bash
{command example}
```
````

**Parameters:**

- `--param1`: {description}

## Error Handling

| Error    | Cause   | Solution   |
| -------- | ------- | ---------- |
| {error1} | {cause} | {solution} |

## References

- [references/commands.md](references/commands.md)

````

---

## Template Selection Guide

| Skill Type | When to Use | Template |
|------------|-------------|----------|
| Process/Pattern | Methodology, workflow, best practice | Process/Pattern |
| Library/Framework | npm package, API, framework docs | Library/Framework |
| Integration | Connecting services/tools | Integration |
| Tool Wrapper | CLI tool or MCP server wrapper | Tool Wrapper |

---

## External Documentation Links Pattern

**Standard for library skills that wrap external tools/libraries.**

### When to Add External Docs

Include a "## Related Resources" section when the skill wraps:
- npm packages (React, TanStack Query, Zod, React Hook Form)
- External APIs (GitHub, Linear, Jira)
- Third-party services (Chromatic, Playwright)
- Framework documentation (Next.js, Vite, Tailwind)

### Organization Decision Tree

**Follow Anthropic's progressive disclosure best practice:**

#### Option 1: Brief List in SKILL.md (5-10 links)

Use when external documentation is straightforward and limited.

```markdown
## Related Resources

### Official Documentation

- **React 19 Release**: https://react.dev/blog/2024/12/05/react-19
- **useActionState**: https://react.dev/reference/react/useActionState
- **useOptimistic**: https://react.dev/reference/react/useOptimistic
- **useEffectEvent**: https://react.dev/reference/react/useEffectEvent
- **You Might Not Need an Effect**: https://react.dev/learn/you-might-not-need-an-effect
````

**Place at end of SKILL.md** before any existing "## References" section.

#### Option 2: Comprehensive File (20+ links)

Use when skill wraps complex libraries with extensive documentation.

Create `references/links-to-official-docs.md`:

```markdown
# Links to Official Documentation

Organized links to official documentation and resources.

---

## {Library Name}

### Core Documentation

- **Main Site**: https://...
- **Get Started**: https://...
- **API Reference**: https://...

### Hooks/Components

- **Hook 1**: https://...
- **Hook 2**: https://...

### Advanced Usage

- **Topic 1**: https://...
- **Topic 2**: https://...

---

## Related Tools

### {Related Library 1}

- **Documentation**: https://...

---

## Community Resources

- **GitHub**: https://github.com/...
- **Discord**: https://discord.gg/...
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/...
```

Then reference from SKILL.md:

```markdown
## Related Resources

For comprehensive official documentation links, see [references/links-to-official-docs.md](references/links-to-official-docs.md).
```

### Guidelines

**Keep links current:**

- Include version information when relevant
- Link to stable documentation (not experimental/beta unless noted)
- Prefer official docs over third-party tutorials

**Organize by relevance:**

- Most important/frequently referenced links first
- Group related links together (Core, Advanced, Community)
- Use clear section headers

**Don't duplicate:**

- External docs go in "Related Resources"
- Internal references go in "References"
- Keep them separate

### Examples

**Skills with brief lists:**

- `using-modern-react-patterns` - 6 React 19 links in SKILL.md
- `optimizing-react-performance` - 7 key links in SKILL.md

**Skills with comprehensive files:**

- `implementing-react-hook-form-zod` - 50+ links in references/links-to-official-docs.md
- Complex integration skills with multiple service documentation

```

```
