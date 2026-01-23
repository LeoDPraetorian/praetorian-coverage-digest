# Release Mode - Clean Public Repository Creation

**Procedures for creating a new public repository with clean history from internal repository.**

## Purpose

Release mode handles the final step of OSS release:
- Preserves internal repository by renaming it to `{name}-internal`
- Creates new **private** repository with original name and clean git history
- **Copies metadata for SEO optimization** (description, topics/tags, homepage)
- Copies code with single "Initial public release" commit (no git history)
- Generates IT ticket template for archiving internal repo and making new repo public

**⚠️ CRITICAL:**
- This renames your current repository. Existing clones and CI/CD will break.
- You do NOT have permissions to archive repos or make repos public.
- You MUST submit an IT ticket after this step completes.

## Pre-Release Requirements

**Before running release mode:**

1. ✅ Run `oss-releaser audit` - must pass with no critical issues
2. ✅ Run `oss-releaser prepare` - all files created/updated
3. ✅ Legal approval obtained (if required)
4. ✅ Security team approval (if required)
5. ✅ Team notified of repository rename
6. ✅ CI/CD configurations documented (will need updating)
7. ✅ All local changes committed

## Release Workflow

### Step 1: Capture Current Repository Metadata

```bash
#!/bin/bash
# Capture ALL metadata before renaming (for SEO optimization)

REPO_NAME=$(gh repo view --json name -q '.name')
ORG=$(gh repo view --json owner -q '.owner.login')
DESC=$(gh repo view --json description -q '.description')
HOMEPAGE=$(gh repo view --json homepageUrl -q '.homepageUrl')

# Get topics/tags as comma-separated list (for SEO)
TOPICS=$(gh repo view --json repositoryTopics -q '.repositoryTopics[].name' | tr '\n' ',' | sed 's/,$//')

echo "======================================="
echo "Repository Metadata Capture (for SEO)"
echo "======================================="
echo "Repository: ${ORG}/${REPO_NAME}"
echo "Description: $DESC"
echo "Topics: $TOPICS"
echo "Homepage: $HOMEPAGE"
echo ""
echo "⚠️  This metadata will be copied to the new public repo for SEO optimization"
echo ""
echo "This will be renamed to: ${ORG}/${REPO_NAME}-internal"
echo "New private repo will be: ${ORG}/${REPO_NAME} (requires IT ticket to make public)"
echo ""
read -p "Proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted"
  exit 1
fi
```

### Step 2: Rename Current Repository

```bash
echo "Step 1/7: Renaming current repository..."

# Rename via GitHub CLI
gh repo rename "${REPO_NAME}-internal" --yes

echo "✓ Renamed to ${REPO_NAME}-internal"

# Update local remote
git remote set-url origin "https://github.com/${ORG}/${REPO_NAME}-internal.git"
```

**⚠️ Breaking Change:** This breaks:
- All existing clones (remote URL changes)
- CI/CD pipelines referencing old name
- Documentation with repository links
- Package manifests (go.mod, package.json)

### Step 3: Create New Private Repository

```bash
echo "Step 2/7: Creating new private repository..."

# Create new PRIVATE repo (user lacks permissions to make public)
gh repo create "${ORG}/${REPO_NAME}" \
  --private \
  --description "$DESC" \
  ${HOMEPAGE:+--homepage "$HOMEPAGE"}

echo "✓ Created ${ORG}/${REPO_NAME} (private)"
echo ""
echo "⚠️  Note: Repository created as PRIVATE"
echo "   You'll need to submit an IT ticket to make it public"
```

### Step 4: Copy Code (No Git History)

```bash
echo "Step 3/7: Copying code with clean history..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone internal repo
git clone "https://github.com/${ORG}/${REPO_NAME}-internal.git" source
cd source

# Remove git history
rm -rf .git

# Initialize fresh repo
git init
git add .

# Create single commit
git commit -m "Initial public release"

echo "✓ Created clean repository with single commit"
```

### Step 5: Push to New Public Repository

```bash
echo "Step 4/7: Pushing to new public repository..."

# Add new origin
git remote add origin "https://github.com/${ORG}/${REPO_NAME}.git"

# Push
git push -u origin main

echo "✓ Pushed to ${ORG}/${REPO_NAME}"
```

### Step 6: Copy Metadata

```bash
echo "Step 5/7: Copying metadata..."

# Set topics
if [ -n "$TOPICS" ]; then
  gh repo edit "${ORG}/${REPO_NAME}" --add-topic "$TOPICS"
  echo "✓ Topics copied"
fi

# Set homepage (if present)
if [ -n "$HOMEPAGE" ]; then
  gh repo edit "${ORG}/${REPO_NAME}" --homepage "$HOMEPAGE"
  echo "✓ Homepage set"
fi

# Additional settings
gh repo edit "${ORG}/${REPO_NAME}" \
  --enable-issues \
  --enable-wiki=false \
  --enable-projects=false

echo "✓ Repository settings configured"
```

### Step 7: Submit IT Ticket for Final Steps

```bash
echo "Step 6/7: Final administrative tasks..."
echo ""
echo "⚠️  You do not have permissions to complete the following tasks."
echo "   Please submit an IT ticket requesting:"
echo ""
echo "   1. Archive repository: ${ORG}/${REPO_NAME}-internal"
echo "   2. Make repository public: ${ORG}/${REPO_NAME}"
echo ""
echo "IT Ticket Template:"
echo "---"
echo "Subject: OSS Release - Archive internal repo and publish public repo"
echo ""
echo "Request:"
echo "1. Archive repository: ${ORG}/${REPO_NAME}-internal"
echo "   - This is the old internal version, now replaced by public release"
echo ""
echo "2. Change repository visibility to PUBLIC: ${ORG}/${REPO_NAME}"
echo "   - New repository is ready for public release"
echo "   - All compliance checks passed"
echo "   - Legal/security approval obtained"
echo ""
echo "Repository URLs:"
echo "- Internal (to archive): https://github.com/${ORG}/${REPO_NAME}-internal"
echo "- Public (to publish): https://github.com/${ORG}/${REPO_NAME}"
echo "---"
echo ""

# Optional: Add archive notice to internal repo README
read -p "Add archive notice to ${REPO_NAME}-internal README? (yes/no): " add_notice

if [ "$add_notice" = "yes" ]; then
  cd "$ORIGINAL_DIR"
  if [ -f README.md ]; then
    {
      echo "# ⚠️ ARCHIVED - See Public Release"
      echo ""
      echo "This repository has been replaced by the public open-source version:"
      echo "https://github.com/${ORG}/${REPO_NAME}"
      echo ""
      echo "**This internal version is archived and will no longer be maintained.**"
      echo ""
      echo "---"
      echo ""
      cat README.md
    } > README.tmp
    mv README.tmp README.md

    git add README.md
    git commit -m "docs: mark repository as archived, point to public release"
    git push

    echo "✓ Archive notice added to internal repo README"
  fi
fi
```

### Step 8: Verify New Repository & Next Steps

```bash
echo "Step 7/7: Verifying new repository..."

# Clone new repo to verify
cd "$TEMP_DIR"
git clone "https://github.com/${ORG}/${REPO_NAME}.git" verify
cd verify

# Run audit
echo "Running OSS audit on new repository..."
# Invoke oss-releaser audit

# Check commit history (should be single commit)
commit_count=$(git rev-list --count HEAD)
if [ "$commit_count" -eq 1 ]; then
  echo "✓ Clean history (1 commit)"
else
  echo "⚠️  Expected 1 commit, found $commit_count"
fi

echo ""
echo "======================================="
echo "✓ Release Preparation Complete"
echo "======================================="
echo ""
echo "New repository (PRIVATE): https://github.com/${ORG}/${REPO_NAME}"
echo "Internal repository: https://github.com/${ORG}/${REPO_NAME}-internal"
echo ""
echo "📋 NEXT STEPS - Submit IT Ticket:"
echo ""
echo "   Subject: OSS Release - Archive internal repo and publish public repo"
echo ""
echo "   Request:"
echo "   1. Archive: https://github.com/${ORG}/${REPO_NAME}-internal"
echo "   2. Make PUBLIC: https://github.com/${ORG}/${REPO_NAME}"
echo ""
echo "   Justification:"
echo "   - All OSS compliance checks passed"
echo "   - Legal/security approval obtained"
echo "   - Metadata copied for SEO (description, topics)"
echo "   - Clean git history (single commit)"
echo ""
echo "After IT completes ticket, the repository will be publicly available."
echo "======================================="
```

## Complete Release Script

```bash
#!/bin/bash
# oss-release.sh - Complete release automation

set -e

# Safety checks
echo "PRE-RELEASE SAFETY CHECKS"
echo "========================="
echo ""

# 1. Check audit passed
echo "Running audit..."
if ! ./oss-audit.sh; then
  echo "❌ Audit failed. Fix issues before releasing."
  exit 1
fi

# 2. Confirm with user
echo ""
echo "⚠️  WARNING: This will:"
echo "  1. Rename current repo to ${REPO_NAME}-internal"
echo "  2. Create new public repo: ${REPO_NAME}"
echo "  3. Copy code with single commit (NO git history)"
echo "  4. Archive internal repository"
echo ""
echo "This breaks existing clones and CI/CD references."
echo ""
read -p "Type 'I understand' to proceed: " confirm

if [ "$confirm" != "I understand" ]; then
  echo "Aborted"
  exit 1
fi

# Execute release workflow
# Steps 1-8 from above...

echo ""
echo "======================================="
echo "✓ OSS RELEASE COMPLETE"
echo "======================================="
echo "Public: https://github.com/${ORG}/${REPO_NAME}"
echo "Internal (archived): https://github.com/${ORG}/${REPO_NAME}-internal"
```

## Rollback Procedure

**If something goes wrong:**

```bash
# 1. Delete newly created public repo (if it exists)
gh repo delete "${ORG}/${REPO_NAME}" --yes

# 2. Rename internal repo back to original name
gh repo rename "${REPO_NAME}"

# 3. Unarchive (if already archived)
gh repo edit "${ORG}/${REPO_NAME}" --archived=false

# 4. Update local remote
git remote set-url origin "https://github.com/${ORG}/${REPO_NAME}.git"

echo "✓ Rollback complete"
```

## Post-Release Tasks

**After successful release:**

1. **Update Documentation**
   - Update company website with link to new repo
   - Announce on blog/social media
   - Update internal documentation with new repo location

2. **Update CI/CD**
   - Update workflows to reference new public repo
   - Configure secrets in new repo settings
   - Test builds in new repo

3. **Update Dependencies**
   - If other projects import this, update their imports
   - Publish packages to registries (npm, PyPI, crates.io)

4. **Monitor**
   - Watch for issues in new public repo
   - Respond to community questions
   - Monitor stars/forks/issues

## Alternative: Soft Release (Keep Internal Active)

**If you want to keep internal repo active (not archived):**

```bash
# Skip archiving step
# Keep both repos active:
# - internal: for Praetorian-only features
# - public: OSS version

# Consider:
# - Which is source of truth?
# - How to sync changes?
# - Branch strategy for private features?
```

## Security Considerations

**Before making public:**

- ✅ All secrets rotated (even if removed from code, they're in git history)
- ✅ Internal URLs/references removed
- ✅ No customer data in test fixtures
- ✅ No proprietary algorithms exposed
- ✅ No internal architecture diagrams
- ✅ License allows public release

## Legal Considerations

**Verify before release:**

- ✅ All code is Praetorian-owned or properly licensed
- ✅ No third-party code requiring attribution
- ✅ Apache 2.0 is appropriate license
- ✅ No patent implications
- ✅ No trademark concerns
- ✅ Export compliance (if security tool)

## Troubleshooting

### Repository rename fails

**Error:** "Current repository already renamed"
**Solution:** Repository name may have changed. Verify with `gh repo view`.

### Cannot create new repo (name exists)

**Error:** "Repository already exists"
**Solution:** Public repo may already exist. Delete it first or choose different name.

### Push fails - branch protection

**Error:** "Required status checks must pass"
**Solution:** New repo doesn't have branch protection yet. This shouldn't happen on initial push.

### Archive fails

**Error:** "Cannot archive repository"
**Solution:** You may not have admin permissions. Contact repository owner.
