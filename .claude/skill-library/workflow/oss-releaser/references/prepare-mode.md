# Prepare Mode - OSS Preparation with File Modification

**Complete procedures for preparing repository for OSS release.**

## Purpose

Prepare mode:
- Creates missing LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY files
- Adds copyright headers to all source files
- Sets GitHub metadata (description, topics)
- Runs security scans
- Generates preparation summary

**Key principle:** All operations are idempotent (safe to re-run).

## 8-Phase Prepare Workflow

### Phase 1: Prerequisites

**Validate before making changes:**

```bash
# Check git status
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ Uncommitted changes. Commit or stash first."
  exit 1
fi

# Create backup branch
git checkout -b backup/pre-oss-$(date +%Y%m%d)
git checkout -
echo "✓ Backup branch created"

# Check for submodules
if [ -f .gitmodules ]; then
  echo "⚠️  Submodules detected - each needs separate OSS prep"
fi
```

**Reference:** [prerequisite-checks.md](prerequisite-checks.md)

### Phase 2: GitHub Metadata

**Set repository metadata for discoverability:**

```bash
# Prompt user for description (if not set)
current_desc=$(gh repo view --json description -q '.description')
if [ -z "$current_desc" ]; then
  echo "Enter repository description (80-160 chars):"
  read -r new_desc
  gh repo edit --description "$new_desc"
fi

# Suggest topics based on tech stack
if [ -f go.mod ]; then
  echo "Detected: Go project"
  echo "Suggested topics: golang, cli, security, [domain-specific]"
elif [ -f package.json ]; then
  echo "Detected: TypeScript/JavaScript project"
  echo "Suggested topics: typescript, nodejs, [domain-specific]"
fi

echo "Enter topics (comma-separated, 5-8 recommended):"
read -r topics
gh repo edit --add-topic "$topics"
```

**Reference:** [github-seo-optimization.md](github-seo-optimization.md)

### Phase 3: Create LICENSE

**Idempotent LICENSE creation:**

```bash
if [ ! -f LICENSE ]; then
  echo "Creating Apache 2.0 LICENSE..."

  # Copy template
  cp {skill-path}/references/templates/LICENSE .

  # Update copyright year
  current_year=$(date +%Y)
  sed -i '' "s/\[yyyy\]/$current_year/" LICENSE

  echo "✓ LICENSE created"
else
  # Validate existing
  if grep -q "Apache License.*Version 2.0" LICENSE; then
    echo "✓ LICENSE already exists (Apache 2.0)"
  else
    echo "⚠️  LICENSE exists but may not be Apache 2.0"
  fi
fi
```

**Template:** [templates/LICENSE](templates/LICENSE)
**Reference:** [license-validation.md](license-validation.md)

### Phase 4: Create Documentation Files

#### 4.1 CONTRIBUTING.md (Tech-Stack Customized)

```bash
if [ ! -f CONTRIBUTING.md ]; then
  echo "Generating CONTRIBUTING.md..."

  # Detect tech stack
  if [ -f go.mod ]; then
    tech_stack="go"
  elif [ -f requirements.txt ] || [ -f pyproject.toml ]; then
    tech_stack="python"
  elif [ -f package.json ]; then
    if grep -q '"react"' package.json; then
      tech_stack="react"
    else
      tech_stack="typescript"
    fi
  elif [ -f Cargo.toml ]; then
    tech_stack="rust"
  else
    tech_stack="generic"
  fi

  echo "Detected tech stack: $tech_stack"

  # Ask for customization needs
  echo "CONTRIBUTING.md needs customization for:"
  echo "- Development setup (tools, versions)"
  echo "- Testing commands"
  echo "- Project-specific workflows"
  echo ""
  echo "Proceed with generating template? (you'll need to customize it)"
  read -r confirm

  if [ "$confirm" = "y" ] || [ "$confirm" = "yes" ]; then
    cp {skill-path}/references/templates/CONTRIBUTING.md .
    echo "✓ CONTRIBUTING.md created (REQUIRES CUSTOMIZATION)"
    echo "⚠️  Edit CONTRIBUTING.md to match your project's tech stack"
  fi
fi
```

**Template:** [templates/CONTRIBUTING.md](templates/CONTRIBUTING.md)
**Customization Guide:** [customization-requirements.md](customization-requirements.md)

#### 4.2 CODE_OF_CONDUCT.md

```bash
if [ ! -f CODE_OF_CONDUCT.md ]; then
  cp {skill-path}/references/templates/CODE_OF_CONDUCT.md .
  echo "✓ CODE_OF_CONDUCT.md created (Contributor Covenant v2.1)"
else
  echo "✓ CODE_OF_CONDUCT.md already exists"
fi
```

#### 4.3 SECURITY.md

```bash
if [ ! -f SECURITY.md ]; then
  cp {skill-path}/references/templates/SECURITY.md .
  echo "✓ SECURITY.md created"
else
  echo "✓ SECURITY.md already exists"
fi
```

#### 4.4 README.md Enhancement

```bash
# Check for required sections
echo "Checking README.md sections..."

for section in "Installation" "Usage" "Contributing" "License"; do
  if ! grep -qi "## $section" README.md; then
    echo "⚠️  README.md missing ## $section section"
    echo "   Consider adding it manually"
  fi
done

# Suggest license badge if missing
if ! grep -q "Apache%202.0" README.md; then
  echo ""
  echo "Suggested license badge for README.md:"
  echo '[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)'
fi
```

### Phase 5: Add Copyright Headers

**Automated header addition with year detection:**

```bash
add_copyright_headers() {
  echo "Adding copyright headers..."

  added=0
  skipped=0

  # Process Go files
  while IFS= read -r file; do
    if head -3 "$file" | grep -q "Copyright.*Praetorian"; then
      ((skipped++))
    else
      # Get year range
      first_year=$(git log --follow --format=%ad --date=format:%Y "$file" 2>/dev/null | tail -1)
      current_year=$(date +%Y)

      if [ -z "$first_year" ] || [ "$first_year" = "$current_year" ]; then
        years="$current_year"
      else
        years="$first_year-$current_year"
      fi

      # Add header
      {
        echo "// Copyright $years Praetorian Security, Inc."
        echo "// SPDX-License-Identifier: Apache-2.0"
        echo ""
        cat "$file"
      } > "$file.tmp"
      mv "$file.tmp" "$file"

      ((added++))
    fi
  done < <(find . -type f -name "*.go" ! -path "*/vendor/*" ! -path "*/.git/*")

  echo "Copyright headers: $added added, $skipped skipped (already present)"
}
```

**Complete implementation:** [copyright-header-automation.md](copyright-header-automation.md)

### Phase 6: Security Scanning

**Run noseyparker and generate findings:**

```bash
echo "Running noseyparker scan..."

datastore="np-datastore-$(date +%Y%m%d)"

# Scan
noseyparker scan --datastore "$datastore" .

# Generate report
noseyparker report --datastore "$datastore" --format json > noseyparker-prepare.json

# Analyze
total=$(jq '.matches | length' noseyparker-prepare.json)

if [ "$total" -eq 0 ]; then
  echo "✓ No secrets detected"
else
  echo "⚠️  Found $total potential secrets"
  echo "Review required: noseyparker-prepare.json"

  # Show summary
  jq -r '.matches | group_by(.rule_name) | map("\(.| length) \(.[0].rule_name)")| .[]' noseyparker-prepare.json
fi

# Internal references
echo "Scanning for internal references..."
grep -r "praetorian\.internal" . --exclude-dir={node_modules,.git} > internal-refs.txt || true

if [ -s internal-refs.txt ]; then
  ref_count=$(wc -l < internal-refs.txt)
  echo "⚠️  Found $ref_count internal references - review internal-refs.txt"
else
  echo "✓ No internal references found"
fi
```

**Reference:** [secret-scanning-strategy.md](secret-scanning-strategy.md)

### Phase 7: Generate Summary

**Create comprehensive summary report:**

```markdown
# OSS Preparation Summary

**Repository:** {name}
**Date:** {date}
**Prepared By:** oss-releaser v1.1.0

## Changes Made

### Files Created
- LICENSE (Apache 2.0)
- CONTRIBUTING.md (⚠️ REQUIRES CUSTOMIZATION)
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- SECURITY.md

### Copyright Headers
- Added: 391 files
- Skipped: 321 files (already present)
- Total coverage: 100% (712/712)

### GitHub Metadata
- Description: Set ({char_count} chars)
- Topics: Added {topics}

## Security Scan Results

- Noseyparker: {findings_count} findings
- Internal references: {ref_count} found

## Action Items

### Critical (Before Release)
- [ ] Customize CONTRIBUTING.md for your tech stack
- [ ] Review {secrets_count} secret findings
- [ ] Review {ref_count} internal references

### Recommended
- [ ] Enhance README with missing sections
- [ ] Add issue templates
- [ ] Add PR template

## Next Steps

1. Address action items above
2. Run `oss-releaser audit` to verify
3. Test build from clean checkout
4. Get legal/security approval
5. Run `oss-releaser release` to create public repo
```

**Save to:** `oss-prepare-summary-{date}.md`

**Template:** [summary-report-template.md](summary-report-template.md)

### Phase 8: Human Review

**Present final checklist:**

```
Preparation complete. Review checklist:

- [ ] All files created
- [ ] Copyright headers added (100% coverage)
- [ ] GitHub metadata optimized
- [ ] CONTRIBUTING.md customized for tech stack
- [ ] No critical secrets found
- [ ] Internal references reviewed
- [ ] Build passes from clean checkout

Ready to proceed with `oss-releaser release`?
```

## Complete Prepare Script

```bash
#!/bin/bash
# oss-prepare.sh - Complete OSS preparation

set -e

SKILL_PATH="/path/to/.claude/skill-library/workflow/oss-releaser"

echo "======================================="
echo "OSS Preparation"
echo "======================================="
echo ""

# Phase 1: Prerequisites
echo "[Phase 1/8] Prerequisites..."
# Git validation, backup branch creation
echo ""

# Phase 2: GitHub Metadata
echo "[Phase 2/8] GitHub Metadata..."
# Set description, topics
echo ""

# Phase 3: LICENSE
echo "[Phase 3/8] LICENSE..."
# Create if missing
echo ""

# Phase 4: Documentation
echo "[Phase 4/8] Documentation..."
# CONTRIBUTING, CODE_OF_CONDUCT, SECURITY
echo ""

# Phase 5: Copyright Headers
echo "[Phase 5/8] Copyright Headers..."
# Add to all source files
echo ""

# Phase 6: Security Scan
echo "[Phase 6/8] Security Scanning..."
# Noseyparker + internal refs
echo ""

# Phase 7: Summary
echo "[Phase 7/8] Generating Summary..."
# Create summary report
echo ""

# Phase 8: Review
echo "[Phase 8/8] Final Review..."
# Present checklist
echo ""

echo "======================================="
echo "✓ Preparation Complete"
echo "======================================="
echo ""
echo "Review: oss-prepare-summary-$(date +%Y%m%d).md"
echo "Next: Run 'oss-releaser audit' to verify"
```

## Idempotent Guarantees

Every operation checks before modifying:

| Operation         | Idempotent Check                             |
| ----------------- | -------------------------------------------- |
| Create LICENSE    | `[ ! -f LICENSE ]` before creating           |
| Create CONTRIB    | `[ ! -f CONTRIBUTING.md ]` before creating   |
| Add copyright     | `grep -q "Copyright.*Praetorian"` before add |
| Set GitHub desc   | Overwrites (idempotent by nature)            |
| Add GitHub topics | `--add-topic` only adds if not present       |

**Reference:** [idempotent-operations.md](idempotent-operations.md)
