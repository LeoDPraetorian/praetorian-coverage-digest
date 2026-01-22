# Validation and Anti-Patterns

**Validation checklist and common anti-patterns for skill creation.**

---

## Validation Checklist

Before completing, verify:

- [ ] Name is kebab-case
- [ ] Skill doesn't already exist
- [ ] Directory structure created correctly
- [ ] SKILL.md has proper frontmatter (name, description, allowed-tools)
- [ ] Description starts with "Use when"
- [ ] Description is <120 characters
- [ ] At least one reference file created
- [ ] Gateway updated (if library skill)

---

## Error Handling

**If creation fails:** `rm -rf {skill-path}` to clean up partial directories.

---

## Anti-Patterns

### ❌ Don't Copy-Paste Without Context or Skip Research

Don't fill templates with placeholder text. Use `orchestrating-research` to find real patterns (see Phase 6 rationalization table).

### ❌ Don't Exceed Line Limits (MANDATORY)

**🚨 CRITICAL: SKILL.md MUST be <500 lines**

- **Target**: 300-500 lines for SKILL.md
- **Always use references/** for detailed documentation (<400 lines each)
- **Always use progressive disclosure pattern** from the start
- **Plan content distribution** during Phase 5 (Generation), not after

**If you create a skill >500 lines:**

1. You violated the creation workflow
2. You must immediately restructure with progressive disclosure
3. See `.claude/skills/managing-skills/references/progressive-disclosure.md`

**Real example**: `designing-frontend-architecture` skill has 293-line SKILL.md + 7 reference files (16KB total content). This is the standard.

### ❌ Don't Include Time-Sensitive Information

Avoid info that becomes outdated. Document current method prominently, collapse deprecated patterns in `<details>` tags.

### ❌ Don't Use Fractional Major Phase Numbers

Skills must use sequential integer phase numbers (Phase 1, 2, 3, 4...) not fractional (Phase 1.5, 3.5, 4.5).

**Rule**: [Phase Numbering](.claude/skills/managing-skills/references/patterns/changelog-format.md)

**Acceptable**: Sub-steps within phases (Sub-Phase 5.1, 5.2, 5.3) for decomposition

**When adding phases**: Renumber subsequent phases to maintain sequential integers

**Caught by**: auditing-skills Phase 7 (Phase Numbering Hygiene)
