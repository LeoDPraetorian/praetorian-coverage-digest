# Progressive Disclosure for Skills

How to organize skill content so Claude reads only what's needed, when it's needed.

## Principle

**Don't load everything upfront.** Provide a lean core (SKILL.md) with links to detailed content that Claude reads on demand.

**Benefits:**
- ✅ Faster skill activation (less to read initially)
- ✅ Token efficiency (details loaded only when needed)
- ✅ Better organization (content grouped by purpose)
- ✅ Easier maintenance (update one reference file)

## Official Claude Code Pattern

From https://code.claude.com/docs/en/skills:

```
skill-name/
├── SKILL.md              # Lean core (1,000-2,000 words for reasoning skills)
├── references/           # Detailed documentation
│   ├── api-reference.md
│   └── advanced-patterns.md
├── examples/             # Real-world case studies
│   ├── good-example.md
│   └── common-mistakes.md
├── templates/            # Starter files
│   └── template.md
└── scripts/              # Executable utilities
    └── helper.sh
```

## Chariot Standard (What We Use)

We use **directories** (not singular files) for better organization:

```
skill-name/
├── SKILL.md              # Lean (~1,500 words target for reasoning skills)
├── references/           # DIRECTORY with multiple files
│   ├── reference-1.md
│   ├── reference-2.md
│   └── reference-3.md
├── examples/             # DIRECTORY with multiple examples
│   ├── example-1.md
│   └── example-2.md
└── templates/            # DIRECTORY with multiple templates
    ├── template-1.md
    └── template-2.md
```

**Why directories:**
- More organized when you have 4+ references
- Easier to find specific content
- Natural grouping by topic
- Scales better

## SKILL.md Target: 1,000-2,000 Words (Reasoning Skills)

**Keep in SKILL.md:**
- Overview (what is this, core principle)
- When to use (symptoms, triggers)
- Core workflow (main steps)
- Quick reference (table or bullets)
- Links to detailed content

**Move to references/:**
- Detailed explanations (>200 words per topic)
- API references (field listings, schemas)
- Advanced patterns
- Comprehensive guides
- Edge cases and troubleshooting

**Move to examples/:**
- Complete case studies
- Good vs bad comparisons
- Real-world scenarios
- Before/after demonstrations

**Move to templates/:**
- Starter files
- Copy-paste templates
- Common patterns ready to use

## How Claude Reads Progressive Skills

### Initial Load (SKILL.md only)

When skill matches a task:
1. Claude reads SKILL.md
2. Scans overview and when-to-use
3. Reads core workflow
4. Checks quick reference

**Token cost:** ~1,500 words = ~2,000 tokens (reasoning skills)

### On-Demand Loading (References)

When Claude needs details:
1. Sees link: `[references/api-reference.md](references/api-reference.md)`
2. Reads that specific file
3. Gets detailed information
4. Returns to main workflow

**Token cost:** Only what's needed, when needed

### Example: marketplace-management Skill

**SKILL.md (885 words):**
```markdown
## Creating a Marketplace

See [references/marketplace-schema.md](references/marketplace-schema.md)
for complete schema.

Basic structure:
```json
{
  "name": "...",
  "owner": {...},
  "plugins": []
}
```

[Minimal workflow...]
```

**When Claude needs schema details:**
- Reads references/marketplace-schema.md
- Gets complete field reference
- Returns to workflow

**Benefit:** Doesn't load 2,000-word schema unless needed.

## Organizing Content by Type

### references/ Directory

**Purpose:** Detailed technical documentation

**Contents:**
- API references (field listings, schemas)
- Detailed explanations (advanced topics)
- Comprehensive guides (step-by-step deep dives)
- Troubleshooting guides
- Best practices collections

**Examples:**
- `references/marketplace-schema.md` (complete JSON schema)
- `references/frontmatter-fields.md` (all YAML fields)
- `references/progressive-disclosure.md` (this file!)

### examples/ Directory

**Purpose:** Real-world case studies and demonstrations

**Contents:**
- Complete working examples
- Good vs bad comparisons
- Before/after transformations
- Common mistake demonstrations
- Success stories

**Examples:**
- `examples/chariot-marketplace.md` (real marketplace)
- `examples/migration-case-study.md` (actual migration)
- `examples/good-skill-structure.md`
- `examples/common-mistakes.md`

### templates/ Directory

**Purpose:** Ready-to-use starter files

**Contents:**
- Copy-paste templates
- Common pattern starters
- Configuration templates
- Boilerplate code

**Examples:**
- `templates/SKILL-template.md` (starter SKILL.md)
- `templates/marketplace.json` (marketplace template)
- `templates/frontmatter-template.yaml`

### scripts/ Directory

**Purpose:** Executable utilities and helpers

**Contents:**
- Helper scripts
- Validation utilities
- Code generators
- Automation tools

**Examples:**
- `scripts/validate-skill.sh`
- `scripts/word-count.sh`
- `scripts/extract-frontmatter.sh`

## Linking to Supporting Files

### Relative Links from SKILL.md

```markdown
## API Reference

See [references/api-schema.md](references/api-schema.md) for complete field reference.

## Examples

For real-world usage, see [examples/case-study.md](examples/case-study.md).

## Templates

Use [templates/starter.md](templates/starter.md) as starting point.
```

### When Claude Sees Link

Claude automatically reads linked files when relevant to current task.

**Don't force-load with @:**
```markdown
❌ See @references/api-schema.md  # Force-loads immediately
✅ See [references/api-schema.md](references/api-schema.md)  # Load on demand
```

## Word Count Targets

Based on skill usage frequency and complexity:

| Skill Type | SKILL.md Target | Total OK |
|------------|-----------------|----------|
| Frequently loaded | ~1,500 words | Any (in references/) |
| Moderate use | ~1,500 words | Any (in references/) |
| Complex domain | ~2,000 words | Any (in references/) |
| Simple utility | ~800 words | Keep inline if possible |

**Rule:** Keep SKILL.md under 2,000 words. Move details to references/.

## Real Example: claude-marketplace-management

**SKILL.md:** 885 words
- Overview and core concepts
- Basic workflows
- Links to 4 detailed references
- Links to 2 real examples
- Links to 2 templates

**references/** (4 files, ~8,000 words):
- marketplace-schema.md (complete JSON schema)
- plugin-entry-format.md (detailed entry guide)
- distribution.md (GitHub, git, local methods)
- team-config.md (auto-install configuration)

**examples/** (2 files, ~4,000 words):
- chariot-marketplace.md (real marketplace analysis)
- migration-example.md (step-by-step case study)

**templates/** (2 files):
- marketplace.json (ready to use)
- plugin-entry.json (copy-paste)

**Total:** 885 + 8,000 + 4,000 = ~12,885 words
**Initial load:** 885 words only
**On-demand:** References when needed

## Migration Pattern

### Before (Monolithic)

```
skill-name/
├── SKILL.md (5,000 words - everything inline)
└── supporting-file.md (at root)
```

**Problems:**
- SKILL.md too large
- All content loads upfront
- Hard to find specific topics
- Difficult to maintain

### After (Progressive)

```
skill-name/
├── SKILL.md (1,500 words - core only)
├── references/
│   ├── topic-1.md (extracted details)
│   ├── topic-2.md (extracted details)
│   └── topic-3.md (extracted details)
├── examples/
│   └── case-study.md (real-world)
└── templates/
    └── starter.md (ready-to-use)
```

**Benefits:**
- Lean core (faster activation)
- Organized by content type
- Load details on demand
- Easy to maintain

## Common Patterns

### Extract API/Schema Details

**Before:** 500-line API reference in SKILL.md
**After:** Link to references/api-reference.md

### Extract Case Studies

**Before:** Multiple examples inline
**After:** Link to examples/real-world-case.md

### Extract Templates

**Before:** Boilerplate code blocks in SKILL.md
**After:** Actual files in templates/

### Extract Advanced Topics

**Before:** "Advanced usage" section (800 words)
**After:** Link to references/advanced-patterns.md

## Best Practices

**SKILL.md should be:**
- Scannable (quick reference tables)
- Workflow-focused (step-by-step)
- Principle-driven (why, not just what)
- Link-rich (references detailed docs)

**references/ should be:**
- Comprehensive (all details)
- Well-organized (one topic per file)
- Cross-referenced (link between references)
- Searchable (good headings)

**examples/ should be:**
- Real-world (not contrived)
- Complete (runnable/usable)
- Explanatory (why it works)
- Diverse (good and bad)

**templates/ should be:**
- Ready-to-use (copy-paste)
- Well-commented (explain blanks)
- Common patterns (not edge cases)
- Tested (actually work)

## Verification

After restructuring, check:

```bash
# SKILL.md word count
wc -w SKILL.md
# Target: 1,000-2,000 words for reasoning skills

# Directory structure
ls -la
# Should see: references/, examples/, templates/

# Files organized
ls references/
ls examples/
ls templates/
```

## Summary

**Progressive disclosure means:**
1. Lean SKILL.md (~1,500 words for reasoning skills)
2. Detailed content in references/
3. Real examples in examples/
4. Starter files in templates/
5. Links connect everything
6. Claude loads on demand

**Result:** Faster activation, better organization, easier maintenance.
