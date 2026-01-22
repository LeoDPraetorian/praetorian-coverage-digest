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

## Phase 1: {Action}

{Instructions}

### Sub-Phase 1.1: {Sub-action}

{Detailed instructions for sub-step}

## Phase 2: {Action}

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

## Phase 1: {Setup}

{Instructions}

### Sub-Phase 1.1: {Sub-setup task}

{Detailed instructions for sub-step}

## Phase 2: {Integration}

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

### Script Quality Requirements

**Solve, don't punt**: Scripts should handle errors explicitly, not fail and let Claude figure it out.

```python
# ❌ BAD: Punt to Claude
def process_file(path):
    return open(path).read()  # Just fails

# ✅ GOOD: Handle errors
def process_file(path):
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f'File {path} not found, creating default')
        with open(path, 'w') as f:
            f.write('')
        return ''
```

**No voodoo constants**: Document all magic numbers:

```python
# ❌ BAD
TIMEOUT = 47  # Why 47?

# ✅ GOOD
# HTTP requests typically complete in 30s; extra buffer for slow connections
REQUEST_TIMEOUT = 30
```

**Verbose error messages**: Help Claude fix issues:

```python
# ❌ BAD
raise ValueError('Invalid field')

# ✅ GOOD
raise ValueError(f"Field 'signature' not found. Available: {list(fields.keys())}")
```

### MCP Tool References

When referencing MCP tools, use fully qualified names to avoid 'tool not found' errors:

```markdown
Use the `BigQuery:bigquery_schema` tool to retrieve table schemas.
Use the `GitHub:create_issue` tool to create issues.
```

**Format**: `{ServerName}:{tool_name}`

Without the server prefix, Claude may fail to locate tools when multiple MCP servers are available.

## References

- [references/commands.md](references/commands.md)

```

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

For library skills wrapping external tools/libraries, see [references/external-documentation-links.md](external-documentation-links.md) for comprehensive guidance on:
- When to add external documentation links
- Organization patterns (brief vs comprehensive)
- Formatting guidelines and examples
```
