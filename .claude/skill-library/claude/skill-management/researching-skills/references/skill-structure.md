# Skill Structure Specification

## Overview

Generated skills follow the progressive disclosure pattern: a lean SKILL.md with detailed references/ and templates/ directories.

## Directory Structure

```
skill-name/
├── SKILL.md                 # Keep under 500 lines (main entry point)
├── references/              # 8-15 documentation files
│   ├── {package-name}.md    # Full package documentation
│   ├── {package-name}-api.md # API reference (for large docs)
│   └── {package-name}-guides.md # Guides (for large docs)
├── templates/               # 5-10 code templates
│   ├── typescript/          # TypeScript examples
│   │   ├── README.md        # Index of templates
│   │   └── 01-example.ts    # Individual template
│   └── javascript/          # JavaScript examples
└── .local/
    └── metadata.json        # Generation metadata
```

## SKILL.md Structure

### Frontmatter

```yaml
---
name: skill-name # kebab-case, matches directory
description: Use when working with X - patterns, best practices, API reference
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---
```

### Required Sections

1. **Title and Overview**
   - H1 title matching skill purpose
   - 2-3 sentence summary
   - "When to Use" bullet points

2. **Quick Reference**
   - Table of key APIs/patterns
   - Links to reference files

3. **Core Concepts**
   - Essential patterns (3-5)
   - Brief explanations with code

4. **Common Patterns**
   - Real-world usage examples
   - Code blocks with context

5. **References**
   - Links to references/ files
   - External resource links

6. **Templates**
   - Summary of available templates
   - Organized by language

### Line Count Guidelines

**All skills:** Keep SKILL.md under 500 lines for optimal performance.

See [Skill Compliance Contract](../../../../../skills/managing-skills/references/skill-compliance-contract.md) for authoritative line count limits and thresholds.

## Reference Files

### Purpose

Store detailed documentation that would bloat SKILL.md.

### Naming Convention

- `{package-name}.md` - Main package documentation
- `{package-name}-api.md` - API reference
- `{package-name}-guides.md` - Guides and tutorials

### Content

- Full API documentation
- Detailed guides
- Migration notes
- Troubleshooting

## Template Files

### Purpose

Provide ready-to-use code examples.

### Organization

```
templates/
├── typescript/
│   ├── README.md            # Index with descriptions
│   ├── 01-basic-usage.ts
│   ├── 02-with-options.ts
│   └── 03-error-handling.ts
└── javascript/
    └── ...
```

### Template File Format

```typescript
// Source: {Section Title}
// Context: {Brief explanation}

{
  code;
}
```

### README.md Index

Each language directory has a README.md:

```markdown
# TypeScript Templates

10 code templates for TypeScript.

## 1. Basic Usage

\`\`\`typescript
import { useQuery } from '@tanstack/react-query';
// ...
\`\`\`

## 2. With Options

// ...
```

## Metadata File

### Location

`.local/metadata.json`

### Content

```json
{
  "generated": "2024-01-01T00:00:00Z",
  "topic": "tanstack query",
  "sources": {
    "context7": ["/npm/@tanstack/react-query"],
    "web": ["https://tanstack.com/query/latest"]
  },
  "stats": {
    "sections": 25,
    "codeBlocks": 50
  }
}
```

## Quality Requirements

### SKILL.md

- [ ] Frontmatter with name, description, allowed-tools
- [ ] Description starts with "Use when"
- [ ] Quick reference table
- [ ] 3-5 core concepts with code
- [ ] Links to references/
- [ ] Line count within guidelines

### References

- [ ] At least 1 reference file per Context7 package
- [ ] API docs separate from guides (if large)
- [ ] All links resolve

### Templates

- [ ] At least 5 code templates
- [ ] Organized by language
- [ ] README.md index for each language
- [ ] Source attribution in each file
