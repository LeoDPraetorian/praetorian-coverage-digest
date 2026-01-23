---
name: oss-releaser
description: Use when preparing repositories for open-source release - supports audit, prepare, and release subcommands for compliance checking and automated OSS preparation
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# OSS Release Management

**Subcommand-based workflow for auditing, preparing, and releasing open-source repositories.**

## When to Use

- Auditing OSS readiness: "audit this repo for OSS compliance"
- Preparing for release: "prepare this repo for OSS release"
- Creating clean public repo: "release this as open source"
- User says: "open source this repo", "add copyright headers", "OSS compliance check"

**You MUST use TodoWrite** to track progress.

## Subcommands

| Subcommand | Purpose                                    | Modifies Files |
| ---------- | ------------------------------------------ | -------------- |
| `audit`    | Read-only compliance validation            | No             |
| `prepare`  | Create/update files for OSS preparation    | Yes            |
| `release`  | Create clean public repo from internal one | Yes            |

### Detecting Subcommand

**Parse user request for intent:**

| User Says                            | Route To  |
| ------------------------------------ | --------- |
| "audit", "check", "validate", "ready" | `audit`   |
| "prepare", "add files", "setup"       | `prepare` |
| "release", "publish", "make public"   | `release` |

**Default:** If ambiguous, ask user which mode.

---

## Audit Mode (Read-Only)

**Purpose:** Validate OSS readiness without modifying files.

### Audit Workflow

1. **Check LICENSE** - Exists? Apache 2.0?
2. **Check Documentation** - README sections? CONTRIBUTING? CODE_OF_CONDUCT? SECURITY?
3. **Check Copyright** - Count files with/without headers
4. **Check GitHub Metadata** - Description set? Topics configured?
5. **Scan Secrets** - Run noseyparker (read-only)
6. **Scan Internal Refs** - Grep for internal domains/emails
7. **Generate Report** - Compliance status with action items

### Audit Commands

```bash
# 1. LICENSE check
[ -f LICENSE ] && grep -q "Apache License.*Version 2.0" LICENSE && echo "✓ LICENSE" || echo "❌ LICENSE"

# 2. Documentation check
for file in README.md CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md; do
  [ -f "$file" ] && echo "✓ $file" || echo "❌ $file"
done

# 3. Copyright coverage
total=$(find . -name "*.go" -o -name "*.py" -o -name "*.ts" | wc -l)
with_copyright=$(find . \( -name "*.go" -o -name "*.py" -o -name "*.ts" \) -exec grep -l "Copyright.*Praetorian" {} \; | wc -l)
echo "Copyright: $with_copyright/$total files ($(( with_copyright * 100 / total ))%)"

# 4. GitHub metadata
gh repo view --json description,repositoryTopics

# 5. Secret scan
noseyparker scan --datastore np-audit-$(date +%Y%m%d) .
noseyparker report --datastore np-audit-$(date +%Y%m%d)

# 6. Internal references
grep -r "praetorian\.internal" . --exclude-dir={node_modules,.git} | wc -l
```

### Audit Output

```markdown
# OSS Readiness Audit

**Repository:** {name}
**Date:** {date}
**Status:** {Ready | Needs Work | Blocked}

## Compliance Checklist

- [x] LICENSE (Apache 2.0)
- [ ] README.md (missing "Contributing" section)
- [ ] CONTRIBUTING.md (missing)
- [x] CODE_OF_CONDUCT.md
- [x] SECURITY.md
- [ ] Copyright headers (45% coverage - 321/712 files)
- [x] GitHub description set
- [ ] GitHub topics (only 2, need 5-8)
- [ ] Secret scan (3 findings - review required)
- [ ] Internal references (12 found)

## Action Items

### Critical
- Add CONTRIBUTING.md
- Add copyright headers to 391 files
- Review 3 secret findings

### Recommended
- Add 3-6 more GitHub topics
- Review 12 internal references

## Next Step

Run `oss-releaser prepare` to fix identified issues.
```

**See:** [references/audit-mode.md](references/audit-mode.md) for complete audit procedures.

---

## Prepare Mode (File Modification)

**Purpose:** Create/update files based on audit findings or full OSS preparation.

### Prepare Workflow

1. **Prerequisites** - Validate state, backup
2. **GitHub Metadata** - Set description, topics
3. **Create LICENSE** - Apache 2.0 from template
4. **Create Documentation** - CONTRIBUTING (customized), CODE_OF_CONDUCT, SECURITY
5. **Add Copyright** - Headers with year detection
6. **Security Scan** - Noseyparker + internal ref detection
7. **Generate Summary** - Report with changes made
8. **Human Review** - Final approval

### Key Operations

**All operations are idempotent** (safe to re-run):

```bash
# Create LICENSE if missing
[ ! -f LICENSE ] && cp {skill-templates}/LICENSE . && echo "✓ Created LICENSE"

# Create CONTRIBUTING.md (tech-stack customized)
{detect_stack} && generate_contributing_md

# Add copyright headers (checks for existing)
add_copyright_headers_to_all_source_files

# Set GitHub metadata
gh repo edit --description "{value proposition}" --add-topic {topics}
```

**See:** [references/prepare-mode.md](references/prepare-mode.md) for detailed implementation.

---

## Release Mode (Clean Private Repo)

**Purpose:** Create new private repository with clean history, then submit IT ticket for archive/public steps.

### Release Workflow

1. **Capture Metadata** - Save description, topics/tags for SEO (CRITICAL)
2. **Rename Internal Repo** - Rename `{name}` → `{name}-internal`
3. **Create Private Repo** - New repo with original `{name}` (private initially)
4. **Copy Code** - Fresh clone without git history
5. **Single Commit** - "Initial public release" (clean history)
6. **Copy Metadata** - Apply description, topics/tags to new repo (SEO optimization)
7. **Submit IT Ticket** - Request: (1) archive internal repo, (2) make new repo public
8. **Verify** - Run audit on new repo

### Release Execution (MUST RUN THESE COMMANDS)

**You MUST execute these commands in order. Do NOT just show them to the user.**

```bash
# Step 1: Capture metadata (for SEO)
REPO_NAME=$(gh repo view --json name -q '.name')
ORG=$(gh repo view --json owner -q '.owner.login')
DESC=$(gh repo view --json description -q '.description')
TOPICS=$(gh repo view --json repositoryTopics -q '.repositoryTopics[].name' | tr '\n' ',' | sed 's/,$//')
```

**CRITICAL SAFETY CHECK:** After capturing metadata, you MUST use `AskUserQuestion` to get explicit confirmation before proceeding with the destructive rename operation.

```
AskUserQuestion({
  "questions": [{
    "question": "⚠️  This will RENAME your repository and is IRREVERSIBLE. Confirm you want to proceed?",
    "header": "Confirm Rename",
    "multiSelect": false,
    "options": [
      {
        "label": "Yes, I understand - proceed with rename",
        "description": "Repository: ${ORG}/${REPO_NAME} → ${ORG}/${REPO_NAME}-internal. This breaks existing clones and CI/CD."
      },
      {
        "label": "No, cancel the release",
        "description": "Abort the release process without making any changes"
      }
    ]
  }]
})
```

If user selects "No, cancel", **STOP immediately** and do not proceed with any further steps.

If user selects "Yes, I understand", **only then** proceed with Step 2:

```bash
# Step 2: Rename current repo to {name}-internal
gh repo rename "${REPO_NAME}-internal" --yes

# Step 3: Update local remote URL
git remote set-url origin "https://github.com/${ORG}/${REPO_NAME}-internal.git"

# Step 4: Create new PRIVATE repo with original name
gh repo create "${ORG}/${REPO_NAME}" --private --description "$DESC"

# Step 5: Copy code with clean history
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"
git clone "https://github.com/${ORG}/${REPO_NAME}-internal.git" source
cd source
rm -rf .git
git init
git add .
git commit -m "Initial public release"
git remote add origin "https://github.com/${ORG}/${REPO_NAME}.git"
git push -u origin main

# Step 6: Copy metadata for SEO
gh repo edit "${ORG}/${REPO_NAME}" --add-topic "$TOPICS"

# Step 7: Generate IT ticket template
echo "======================================="
echo "✓ Release preparation complete"
echo "======================================="
echo ""
echo "Submit IT ticket requesting:"
echo "  1. Archive repository: ${ORG}/${REPO_NAME}-internal"
echo "  2. Make repository public: ${ORG}/${REPO_NAME}"
echo ""
echo "New private repo: https://github.com/${ORG}/${REPO_NAME}"
echo "Internal repo (to archive): https://github.com/${ORG}/${REPO_NAME}-internal"
```

**CRITICAL:** These steps MUST be executed. The skill should run each command and verify success before proceeding to the next step.

**See:** [references/release-mode.md](references/release-mode.md) for complete procedures.

### Release Safety Checks

**Before running release mode:**

- [ ] Run `audit` - ensure readiness
- [ ] Run `prepare` - fix all critical issues
- [ ] Legal/security approval obtained
- [ ] Backup created
- [ ] Team notified of repo rename
- [ ] CI/CD team aware (will break references)

**⚠️ WARNINGS:**
- Release mode renames the current repository (breaks clones/CI)
- You lack permissions to archive repos or make repos public
- IT ticket MUST be submitted after release completes

---

## Common Workflows

### Workflow 1: First-Time OSS Release

```
1. oss-releaser audit          # Check current state
2. oss-releaser prepare        # Fix identified issues
3. oss-releaser audit          # Verify fixes
4. oss-releaser release        # Create clean public repo
```

### Workflow 2: Audit Only (CI/CD)

```
oss-releaser audit             # Exit code 0 = ready, 1 = issues found
```

### Workflow 3: Incremental Preparation

```
1. oss-releaser audit          # Identify gaps
2. Manually fix some issues
3. oss-releaser prepare        # Auto-fix remaining
4. oss-releaser audit          # Final check
```

---

## Core Principles

### Idempotent Operations

All prepare operations check before modifying. See [references/idempotent-operations.md](references/idempotent-operations.md).

### Repository-Specific Customization

CONTRIBUTING.md MUST be customized to tech stack. See [references/customization-requirements.md](references/customization-requirements.md).

### Templates

Complete templates provided for:
- LICENSE (Apache 2.0)
- CODE_OF_CONDUCT (Contributor Covenant v2.1)
- SECURITY.md (vulnerability reporting)
- CONTRIBUTING.md (customizable)

**Template location:** [references/templates/](references/templates/)

---

## Phase Reference

| Phase | Purpose                   | Audit | Prepare | Release | Reference                                       |
| ----- | ------------------------- | ----- | ------- | ------- | ----------------------------------------------- |
| 1     | Prerequisites             | ✓     | ✓       | ✓       | [prerequisite-checks.md](references/prerequisite-checks.md) |
| 2     | GitHub Metadata           | ✓     | ✓       | ✓       | [github-seo-optimization.md](references/github-seo-optimization.md) |
| 3     | LICENSE                   | ✓     | ✓       | ✓       | [license-validation.md](references/license-validation.md) |
| 4     | Documentation             | ✓     | ✓       | ✓       | [customization-requirements.md](references/customization-requirements.md) |
| 5     | Copyright Headers         | ✓     | ✓       | ✓       | [copyright-header-automation.md](references/copyright-header-automation.md) |
| 6     | Security Scanning         | ✓     | ✓       | ✓       | [secret-scanning-strategy.md](references/secret-scanning-strategy.md) |
| 7     | Verification              | ✓     | ✓       | ✓       | [summary-report-template.md](references/summary-report-template.md) |
| 8     | Final Review/Publish      | -     | ✓       | ✓       | -                                               |

---

## Troubleshooting

See [references/troubleshooting-guide.md](references/troubleshooting-guide.md) for:
- GitHub CLI authentication
- Copyright header issues
- Secret scanner setup
- Git problems

---

## Integration

### Called By

- `/oss-release` command
- User requests: "audit for OSS", "prepare for OSS", "release as open source"

### Requires (invoke before starting)

None - standalone workflow

### Calls (during execution)

None - self-contained using native tools

### Pairs With (conditional)

- **`optimizing-github-seo`** (LIBRARY) - Advanced GitHub SEO strategies
  - `Read(".claude/skill-library/documents/optimizing-github-seo/SKILL.md")`
- **`verifying-before-completion`** (CORE) - Final validation before release
  - `skill: "verifying-before-completion"`

---

## Examples

### Example 1: Audit Mode

```
User: "Check if brutus is ready for OSS release"

Agent: Running oss-releaser in audit mode
- ✓ LICENSE (Apache 2.0)
- ❌ CONTRIBUTING.md (missing)
- ✓ CODE_OF_CONDUCT.md
- ✓ SECURITY.md
- ⚠️  Copyright: 321/712 files (45%)
- ⚠️  GitHub topics: 2 (need 5-8)
- ❌ Secrets: 3 findings require review

Status: Needs Work - Run 'prepare' to fix
```

### Example 2: Prepare Mode

```
User: "Prepare brutus for open source"

Agent: Running oss-releaser in prepare mode
1. Creates backup branch
2. Generates CONTRIBUTING.md (customized for Go)
3. Adds copyright headers to 391 files
4. Sets GitHub topics
5. Runs noseyparker scan
6. Generates summary report
```

### Example 3: Release Mode

```
User: "Release brutus as open source"

Agent: Running oss-releaser in release mode

Executing Step 1: Capturing metadata...
✓ Repository: praetorian-inc/brutus
✓ Description: Fast AWS security scanner
✓ Topics: aws,security,golang,osint

⚠️  SAFETY CONFIRMATION REQUIRED

Agent asks user:
"⚠️  This will RENAME your repository and is IRREVERSIBLE. Confirm you want to proceed?"

Options:
- Yes, I understand - proceed with rename
  (Repository: praetorian-inc/brutus → praetorian-inc/brutus-internal. This breaks existing clones and CI/CD.)
- No, cancel the release

User selects: "Yes, I understand - proceed with rename"

Executing Step 2: Renaming repository...
✓ Renamed to praetorian-inc/brutus-internal

Executing Step 3: Updating local remote...
✓ Remote URL updated

Executing Step 4: Creating new private repository...
✓ Created praetorian-inc/brutus (private)

Executing Step 5: Copying code with clean history...
✓ Cloned internal repo
✓ Removed git history
✓ Created single commit: "Initial public release"
✓ Pushed to new repo

Executing Step 6: Copying metadata...
✓ Topics applied to new repo

Executing Step 7: Generating IT ticket...
======================================
✓ Release preparation complete
======================================

Submit IT ticket requesting:
  1. Archive repository: praetorian-inc/brutus-internal
  2. Make repository public: praetorian-inc/brutus

New private repo: https://github.com/praetorian-inc/brutus
Internal repo (to archive): https://github.com/praetorian-inc/brutus-internal
```
