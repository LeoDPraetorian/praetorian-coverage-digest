# Skill Quality Checklist

Use this checklist with TodoWrite to validate generated skills before completion.

## TodoWrite Integration

Create these todos after generating the skill:

```
1. "Validate SKILL.md structure"
2. "Validate description format"
3. "Validate line count"
4. "Validate code examples"
5. "Validate references"
6. "Run managing-skills audit"
```

## Checklist Items

### 1. SKILL.md Structure

| Check               | Requirement                                |
| ------------------- | ------------------------------------------ |
| [ ] Frontmatter     | Has `name`, `description`, `allowed-tools` |
| [ ] When to Use     | Clear triggers and scenarios               |
| [ ] Quick Reference | Table with key patterns/APIs               |
| [ ] Core Concepts   | 3-5 sections with code examples            |
| [ ] Anti-Patterns   | At least 1 "don't do this" section         |
| [ ] References      | Links to reference files                   |
| [ ] Related Skills  | Links to related skills                    |

### 2. Description Format

| Check                      | Requirement                           |
| -------------------------- | ------------------------------------- | -------------- |
| [ ] Starts with "Use when" | `Use when [trigger] - [capabilities]` |
| [ ] Under 120 characters   | Fits in skill discovery budget        |
| [ ] Has keywords           | Searchable terms for discovery        |
| [ ] No block scalars       | No `                                  | `or`>` in YAML |

**Good**: `Use when developing React components - hooks, state, testing patterns`
**Bad**: `A comprehensive guide to React development` (no trigger)

### 3. Line Count

**All skills:** Keep SKILL.md under 500 lines for optimal performance.

See [Skill Compliance Contract](../../../../../skills/managing-skills/references/skill-compliance-contract.md) for authoritative thresholds and extraction guidance.

Check with:

```bash
wc -l .claude/skills/SKILL_NAME/SKILL.md
# or for library skills:
wc -l .claude/skill-library/CATEGORY/SKILL_NAME/SKILL.md
```

### 4. Code Examples

| Check                | Requirement                                   |
| -------------------- | --------------------------------------------- |
| [ ] Real code        | From codebase research, not invented          |
| [ ] Language tags    | All code blocks have language (```typescript) |
| [ ] Runnable         | Examples can be copied and executed           |
| [ ] No placeholders  | No `// TODO` or `...` in examples             |
| [ ] Chariot patterns | Follows project conventions                   |

### 5. References

| Check                      | Requirement                                  |
| -------------------------- | -------------------------------------------- |
| [ ] At least 2 files       | `references/` has 2+ markdown files          |
| [ ] No broken links        | All `[text](path)` links resolve             |
| [ ] Progressive disclosure | Detailed content in references, not SKILL.md |

### 6. Skill Manager Audit

Run the audit to catch additional issues:

```bash
cd .claude/skills/managing-skills/scripts
npm run audit -- SKILL_NAME
```

Common audit failures:

- Phase 1: Invalid frontmatter
- Phase 2: Description doesn't start with "Use when"
- Phase 5: Line count exceeds maximum
- Phase 7: Broken reference links

## Quality Gates

### Must Pass (Blocking)

- [ ] Frontmatter valid YAML
- [ ] Description starts with "Use when"
- [ ] Line count under maximum
- [ ] No TODO placeholders

### Should Pass (Warning)

- [ ] Quick reference table present
- [ ] At least 3 code examples
- [ ] References directory exists
- [ ] Related skills listed

### Nice to Have

- [ ] Templates directory for library skills
- [ ] Migration guide for versioned libraries
- [ ] Troubleshooting section

## Validation Script

Quick validation for core requirements:

```bash
SKILL_PATH=".claude/skills/SKILL_NAME/SKILL.md"

# Check frontmatter
head -20 "$SKILL_PATH" | grep -q "^name:" && echo "✅ Has name" || echo "❌ Missing name"
head -20 "$SKILL_PATH" | grep -q "^description:" && echo "✅ Has description" || echo "❌ Missing description"

# Check description format
grep "^description:" "$SKILL_PATH" | grep -q "Use when" && echo "✅ Starts with 'Use when'" || echo "❌ Wrong description format"

# Check line count
LINES=$(wc -l < "$SKILL_PATH")
echo "📏 Line count: $LINES"

# Check for TODOs
grep -c "TODO" "$SKILL_PATH" && echo "⚠️ Has TODOs" || echo "✅ No TODOs"
```

## Related

- [Skill Structure](skill-structure.md) - Directory and file structure
- [Source Quality](source-quality.md) - Research source criteria
