# Phase 26 Fix Procedure

**When detected:** Genuine stubs (empty/incomplete reference files) found during semantic review

**🚨 CRITICAL: Never use training data to populate missing content. Always invoke orchestrating-research.**

## Fix Procedure

### Step 1: Enumerate ALL stubs from audit

Before invoking research, list ALL stub files identified:

1. Read audit output for Phase 26 findings
2. Extract each file path flagged as stub/incomplete
3. Create TodoWrite item for EACH file (see Step 4a below for example)
4. Confirm stub count with user via output message: 'Audit found N stub files: [list]. Proceeding with research to populate all N.'

Example audit output analysis:

```
Audit Phase 26 findings:
- references/workflow.md: Empty file (stub)
- references/api-reference.md: Only 12 lines (incomplete)
- references/patterns.md: Contains '[TODO]' markers

Stub count: 3 files
```

### Step 2: Identify genuine stubs

Phase 26 flags files that are truly incomplete (not templates, not anti-pattern examples, not redirects)

### Step 3: Ask user about research

Use AskUserQuestion to confirm research approach:

- Option A: 'Yes, invoke orchestrating-research (Recommended)'
- Option B: 'No, user will provide content directly'

### Step 4: If user selects 'Yes' - Set up continuation state BEFORE invoking research

a. Write remaining fix phases to TodoWrite with per-stub items:

**Enumerate ALL stub files from audit output. Create one TodoWrite item per stub file. Do NOT use a single generic item.**

```
TodoWrite([
  { content: 'Phase 26: Research for stub content', status: 'in_progress', activeForm: 'Researching stub content' },
  { content: 'Populate references/workflow.md from synthesis', status: 'pending', activeForm: 'Populating workflow.md' },
  { content: 'Populate references/api-reference.md from synthesis', status: 'pending', activeForm: 'Populating api-reference.md' },
  { content: 'Populate references/patterns.md from synthesis', status: 'pending', activeForm: 'Populating patterns.md' },
  // ... one todo item per stub file identified by audit in Step 1
  { content: 'Verify ALL stubs have >50 lines content', status: 'pending', activeForm: 'Verifying stub content' },
  { content: 'Step 6: Verify fixes', status: 'pending', activeForm: 'Verifying fixes' },
  { content: 'Step 7: Update changelog', status: 'pending', activeForm: 'Updating changelog' }
])
```

b. Invoke orchestrating-research:

```
Read(".claude/skill-library/research/orchestrating-research/SKILL.md")
```

c. When orchestrating-research returns with 'WORKFLOW_CONTINUATION_REQUIRED':

- Mark research todo as complete
- Read ${OUTPUT_DIR}/SYNTHESIS.md
- Extract patterns, code examples, and citations based on stub file type mapping (see table below)
- Continue immediately with per-stub population todos (workflow.md, api-reference.md, etc.)
- Populate EACH stub file with verified content from appropriate SYNTHESIS.md sections (NOT placeholder text)
- Mark each stub todo complete as you finish it
- Complete verification todo (check >50 lines, no placeholders)
- Continue through Step 6 (Verify) and Step 7 (Changelog)

**Research-to-Stub Mapping Table:**

For each stub file, identify its type from the filename, then extract content from the corresponding SYNTHESIS.md section:

| Stub File Type       | Primary Source in SYNTHESIS.md     | What to Extract                          |
| -------------------- | ---------------------------------- | ---------------------------------------- |
| workflow.md          | Findings by Interpretation         | Step-by-step procedures, decision points |
| api-reference.md     | context7-\*.md + Executive Summary | Official API docs, method signatures     |
| patterns.md          | Cross-Interpretation Patterns      | Common patterns, best practices          |
| advanced-patterns.md | github-\*.md findings              | Complex implementations, edge cases      |
| troubleshooting.md   | Conflicts & Discrepancies          | Trade-offs, common issues, resolutions   |
| configuration.md     | codebase-\*.md + web-\*.md         | Setup guides, environment config         |
| examples.md          | All sources - code blocks          | Real-world usage examples                |

**Do NOT:**

- Report 'Research complete!' and stop
- Summarize findings and wait for user to say 'continue'
- Generate content from training data
- Create TODO comments or stub content

### Step 5: Verification Checkpoint (MANDATORY before Step 6)

After populating all stub files, verify ALL criteria pass:

**Verification Checklist:**

- [ ] SYNTHESIS.md has been read completely
- [ ] ALL stub files identified by audit in Step 1 have been populated
- [ ] Each populated file has >50 lines of substantive content
- [ ] No files contain placeholder text like '[Content to be added]' or 'TODO'
- [ ] Content is sourced from research (not training data)

**Bash verification script:**

```bash
# Verify all stubs populated with real content
STUBS_FROM_AUDIT=('references/workflow.md' 'references/patterns.md')  # from audit Step 1
for stub in "${STUBS_FROM_AUDIT[@]}"; do
  if [ ! -f "$stub" ]; then
    echo "FAIL: $stub still missing"
    exit 1
  fi
  LINES=$(wc -l < "$stub")
  if [ "$LINES" -lt 50 ]; then
    echo "FAIL: $stub has only $LINES lines (need >50)"
    exit 1
  fi
  if grep -q '\[Content to be added\]\|TODO\|PLACEHOLDER' "$stub"; then
    echo "FAIL: $stub still contains placeholder text"
    exit 1
  fi
done
echo "All stubs verified"
```

**Cannot proceed to Step 6 (Verify fixes) until verification passes** ✅

### Step 6: If user selects 'No' (skipped research)

Wait for user to provide content, then apply it to the incomplete files, run verification checkpoint (Step 5 above), and continue with Step 6 (Verify fixes).

## Why research is mandatory for stubs

Using training data produces outdated or incorrect content. Research ensures skills contain verified, current information from authoritative sources.

## See Also

- [Phase 26 Semantic Review](.claude/skill-library/claude/skill-management/auditing-skills/references/phase-26-semantic-review.md)
