---
name: {{name}}
description: {{description}}
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
skill-type: library
---

# {{title}}

## Version & Dependencies

| Package | Version | Docs Source |
|---------|---------|-------------|
| {{libraryName}} | {{version}} | context7 ({{date}}) |

## Overview

{{overview}}

## API Quick Reference

| Function | Purpose | Example |
|----------|---------|---------|
{{#each apiFunctions}}
| `{{name}}` | {{description}} | `{{example}}` |
{{/each}}

See [references/api-reference.md](references/api-reference.md) for full API documentation.

## When to Use

Use this skill when:
- Working with {{libraryName}}
- Implementing {{libraryName}} patterns in Chariot
- Troubleshooting {{libraryName}} issues

## Common Patterns

See [references/patterns.md](references/patterns.md) for detailed patterns.

{{#each patterns}}
### {{name}}
{{description}}
{{/each}}

## Examples

See [examples/basic-usage.md](examples/basic-usage.md) for complete examples.

## Troubleshooting

{{#each troubleshooting}}
**{{issue}}**
{{solution}}

{{/each}}

## References

- [API Reference](references/api-reference.md)
- [Common Patterns](references/patterns.md)
- [Examples](examples/basic-usage.md)
