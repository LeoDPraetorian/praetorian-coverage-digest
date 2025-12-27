# Skill File Organization Patterns

Complete guide to organizing skill files using progressive disclosure.

## Organization Philosophy

**Lean core + organized details = progressive disclosure**

- SKILL.md: Overview and workflow (1,000-2,000 words for reasoning skills)
- references/: Detailed documentation (unlimited) - **evergreen content agents read**
- examples/: Real-world demonstrations (unlimited)
- templates/: Ready-to-use starter files (unlimited)
- scripts/: Executable utilities (unlimited)
- .local/: Temporal artifacts (git-ignored) - **NOT for agent consumption**

**Critical distinction:**

- `references/` = Evergreen documentation that teaches agents how to use the skill
- `.local/` = Temporal artifacts from skill creation/validation (TDD logs, test results, backups)

## When to Use Each Directory

### references/ - Detailed Documentation

**Use for:**

- API references (>100 lines)
- Comprehensive guides
- Field listings and schemas
- Advanced patterns
- Troubleshooting guides
- Best practices collections
- **External documentation links** (20+ links for library skills)

**Examples:**

- `references/api-schema.md` - Complete API field reference
- `references/advanced-patterns.md` - Complex usage patterns
- `references/troubleshooting.md` - Common issues and solutions
- `references/best-practices.md` - Collected wisdom
- `references/links-to-official-docs.md` - External documentation links (library skills)

**Structure:**

```
references/
├── core-concepts.md        # Fundamental concepts
├── api-reference.md        # Complete API/schema
├── advanced-patterns.md    # Complex usage
├── troubleshooting.md      # Problem solving
└── links-to-official-docs.md # External docs (library skills, 20+ links)
```

### examples/ - Real-World Demonstrations

**Use for:**

- Complete working examples
- Before/after comparisons
- Good vs bad demonstrations
- Case studies
- Migration examples
- Success stories

**Examples:**

- `examples/good-skill-example.md` - Model to follow
- `examples/bad-skill-example.md` - Mistakes to avoid
- `examples/migration-case-study.md` - Real migration
- `examples/before-after.md` - Transformation demo

**Structure:**

```
examples/
├── good-example.md         # What to do
├── bad-example.md          # What not to do
├── case-study-1.md         # Real-world usage
└── migration-example.md    # Transformation story
```

### templates/ - Starter Files

**Use for:**

- Copy-paste templates
- Boilerplate code
- Configuration starters
- Common patterns
- Quick-start files

**Examples:**

- `templates/SKILL-template.md` - Basic skill structure
- `templates/frontmatter-template.yaml` - YAML frontmatter
- `templates/marketplace.json` - Marketplace starter
- `templates/config-template.json` - Configuration starter

**Structure:**

```
templates/
├── basic-template.md       # Simple starter
├── advanced-template.md    # Feature-rich starter
└── config-template.json    # Configuration starter
```

### scripts/ - Executable Utilities

**Use for:**

- Helper scripts (bash, python, etc.)
- Validation utilities
- Code generators
- Automation tools
- Test helpers

**Examples:**

- `scripts/validate.sh` - Validation script
- `scripts/generate.py` - Code generator
- `scripts/helper.sh` - Utility functions

**Structure:**

```
scripts/
├── validate.sh             # Validation
├── generate.py             # Generation
└── helper.sh               # Utilities
```

### .local/ - Temporal Artifacts (NOT for agents)

**Use for:**

- TDD phase documentation (RED/GREEN/REFACTOR logs)
- Pressure test scenarios and results
- Baseline failure captures
- Quality check results
- Audit results and reports
- Backups created by fix/update operations
- CHANGELOG.md (version history)
- Any generated/temporal content

**NOT for:**

- Documentation agents should read (use references/)
- Examples agents should learn from (use examples/)
- Anything that teaches skill usage

**Why this matters:**
TDD artifacts document HOW the skill was validated, not HOW to use the skill. Putting them in `references/` causes:

- Token bloat (agents load validation logs when trying to use skill)
- Confusion (old test scenarios reference outdated skill names/paths)
- Progressive disclosure violation (agents load content they don't need)

**Examples:**

- `.local/tdd-validation.md` - RED/GREEN/REFACTOR phase log
- `.local/pressure-test-results.md` - Pressure testing output
- `.local/baseline-failures.md` - Captured baseline failures
- `.local/audit-2024-11-30.md` - Audit results (timestamped)
- `.local/CHANGELOG.md` - Version history

**Structure:**

```
.local/
├── .gitignore              # Ignore all except CHANGELOG.md
├── CHANGELOG.md            # Version history (git-tracked)
├── tdd-validation.md       # TDD phase documentation
├── pressure-test-results.md # Pressure test output
├── baseline-failures.md    # RED phase captures
└── audit-*.md              # Timestamped audit results
```

**Standard .gitignore:**

```gitignore
# All temporal artifacts ignored
*

# Exception: CHANGELOG.md is git-tracked
!CHANGELOG.md
!.gitignore
```

## Content Size Guidelines

### SKILL.md

**Target:** 1,000-2,000 words for reasoning skills (max 2,500)

Note: Tool-wrapper skills have lower targets (200-600 words). See phase3-word-count.ts for all thresholds.

**Typical sections (~1,500 words):**

- Overview: ~200 words
- When to use: ~200 words
- Core workflow: ~600 words
- Quick reference: ~300 words
- Common patterns: ~300 words
- Troubleshooting: ~200 words

**If over 2,000 words:** Extract content to references/

### references/ Files

**No limit** - can be as long as needed

**Typical sizes:**

- API reference: 1,000-3,000 words
- Advanced patterns: 800-1,500 words
- Troubleshooting: 500-1,000 words
- Best practices: 600-1,200 words

### examples/ Files

**Typical sizes:**

- Simple example: 200-500 words
- Case study: 1,000-2,000 words
- Migration example: 1,500-3,000 words

### templates/ Files

**Minimal** - just the template with comments

**Typical sizes:**

- Simple template: 50-100 lines
- Advanced template: 100-200 lines

## Linking Between Files

### From SKILL.md to References

```markdown
For complete schema, see [references/api-schema.md](references/api-schema.md).
```

### From SKILL.md to Examples

```markdown
See [examples/case-study.md](examples/case-study.md) for real-world usage.
```

### From SKILL.md to Templates

```markdown
Use [templates/starter.md](templates/starter.md) as starting point.
```

### Between Reference Files

```markdown
For advanced patterns, see [advanced-patterns.md](advanced-patterns.md).
```

## External Documentation Links Pattern

**For library skills that wrap external tools/libraries/frameworks.**

### When to Use links-to-official-docs.md

Create `references/links-to-official-docs.md` when a skill has **20+ external documentation links**.

**Applies to:**

- npm packages (React, TanStack Query, Zod, React Hook Form)
- External APIs (GitHub, Linear, Jira, Stripe)
- Third-party services (Chromatic, Playwright, Sentry)
- Framework documentation (Next.js, Vite, Tailwind)

### Organization Decision Tree

| Link Count     | Location                               | Example                            |
| -------------- | -------------------------------------- | ---------------------------------- |
| **5-10 links** | `SKILL.md` (brief list at end)         | `using-modern-react-patterns`      |
| **20+ links**  | `references/links-to-official-docs.md` | `implementing-react-hook-form-zod` |

**Brief list in SKILL.md:**

```markdown
## Related Resources

### Official Documentation

- **React 19 Release**: https://react.dev/blog/2024/12/05/react-19
- **useActionState**: https://react.dev/reference/react/useActionState
- **useOptimistic**: https://react.dev/reference/react/useOptimistic
```

**Comprehensive file structure:**

```markdown
# Links to Official Documentation

## {Library Name}

### Core Documentation

- **Main Site**: https://...
- **API Reference**: https://...

### Advanced Usage

- **Feature 1**: https://...

## Related Tools

### {Related Library}

- **Documentation**: https://...

## Community Resources

- **GitHub**: https://github.com/...
- **Discord**: https://discord.gg/...
```

### Pattern Documentation

**Complete guidance:**

- Creating skills: `.claude/skill-library/claude/skill-management/creating-skills/references/skill-templates.md` (External Documentation Links Pattern section)
- Auditing skills: `.claude/skill-library/claude/skill-management/auditing-skills/references/library-skill-patterns.md`

## Extraction Decision Tree

```
Is it TDD/validation output (test results, pressure tests, baselines)?
├─ Yes → Save to .local/[name].md (NOT references/)
└─ No → Continue...

Is content >200 words on single topic?
├─ Yes → Extract to references/[topic].md
└─ No → Keep inline in SKILL.md

Is it a complete example or case study?
├─ Yes → Extract to examples/[name].md
└─ No → Keep as code block in SKILL.md

Is it copy-paste boilerplate?
├─ Yes → Extract to templates/[name].md
└─ No → Show inline

Is it an executable tool?
├─ Yes → Extract to scripts/[name].sh
└─ No → Keep as code example

Is it external documentation links for library skill?
├─ Yes, 5-10 links → Keep brief list in SKILL.md (## Related Resources section)
└─ Yes, 20+ links → Extract to references/links-to-official-docs.md
```

**TDD artifacts decision:**

```
Does the file document skill VALIDATION (how it was tested)?
├─ Yes → .local/ (temporal, not for agents)
└─ No → Does it document skill USAGE (how to use it)?
         ├─ Yes → references/ (evergreen, for agents)
         └─ No → Probably doesn't belong in this skill
```

## Migration Workflow

### Step 1: Identify Content to Extract

Read current SKILL.md and identify:

- Sections >200 words
- Complete examples
- Templates/boilerplate
- Detailed references

### Step 2: Create Directory Structure

```bash
mkdir -p skill-name/{references,examples,templates,scripts}
```

### Step 3: Extract Content

For each identified section:

1. Create new file in appropriate directory
2. Move content to new file
3. Replace with link in SKILL.md

### Step 4: Update Links

Update any file references:

```markdown
Before: See anthropic-best-practices.md
After: See [references/anthropic-best-practices.md](references/anthropic-best-practices.md)
```

### Step 5: Verify Word Count

```bash
wc -w SKILL.md
# Should be 1,000-2,000 words for reasoning skills
```

## Common Patterns

### Pattern 1: API-Heavy Skill

**SKILL.md:**

- Overview
- Quick reference table
- Common operations
- Link to API reference

**references/api-reference.md:**

- Complete field listing
- All parameters
- Return values
- Error codes

### Pattern 2: Technique Skill

**SKILL.md:**

- Core technique
- When to use
- Quick workflow
- Common mistakes

**examples/:**

- good-usage.md (correct application)
- bad-usage.md (common mistakes)
- real-world.md (actual case)

### Pattern 3: Configuration Skill

**SKILL.md:**

- Overview
- Basic configuration
- Common settings

**references/:**

- all-options.md (complete reference)
- advanced-config.md (complex setups)

**templates/:**

- basic-config.json
- advanced-config.json

## Best Practices

**Do:**

- ✅ Keep SKILL.md lean and workflow-focused
- ✅ Group related references together
- ✅ Provide working examples (not just theory)
- ✅ Include ready-to-use templates
- ✅ Link clearly from SKILL.md
- ✅ Put TDD artifacts in .local/ (not references/)
- ✅ Keep .local/ git-ignored (except CHANGELOG.md)

**Don't:**

- ❌ Put everything in SKILL.md
- ❌ Create directories with only 1 file
- ❌ Use generic file names (file1.md, helper.md)
- ❌ Force-load with @ syntax
- ❌ Duplicate content across files
- ❌ Put TDD/test artifacts in references/ (causes token bloat)
- ❌ Commit temporal outputs to git

## Summary

**Progressive disclosure = organized efficiency**

1. Start lean (SKILL.md ~1,500 words for reasoning skills)
2. Organize details (references/ by topic) - evergreen content for agents
3. Provide examples (examples/ for demonstration)
4. Include templates (templates/ for quick start)
5. Isolate temporal artifacts (.local/) - TDD logs, test results, backups
6. Link clearly (relative paths)
7. Claude loads on demand (token efficient)

**Key rule:** `references/` teaches usage, `.local/` documents validation.

Result: Faster activation, better organization, easier maintenance, no token bloat from TDD artifacts.
