# FeatureBase Push Workflow Testing

## Prerequisites

- Phase 5 code merged to `main` branch
- `FEATUREBASE_API_KEY` secret configured in GitHub repo settings

## Test Procedure

### Test 1: Successful Push

**Goal:** Verify workflow triggers on PR merge and pushes changes to FeatureBase.

**Steps:**

1. **Create test branch:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b test/featurebase-push-workflow
   ```

2. **Make test change:**
   - Edit `modules/chariot/docs/featurebase/posts/test-post.md`
   - Change title in frontmatter
   - Update content body

3. **Commit and push:**
   ```bash
   git add modules/chariot/docs/featurebase/posts/test-post.md
   git commit -m "test: update post for push workflow testing"
   git push origin test/featurebase-push-workflow
   ```

4. **Create PR:**
   ```bash
   gh pr create \
     --title "Test: FeatureBase push workflow" \
     --body "Testing automated push sync on PR merge"
   ```

5. **Merge PR:**
   ```bash
   gh pr merge --squash
   ```

6. **Verify workflow:**
   - Go to Actions tab: `https://github.com/praetorian-inc/chariot-development-platform/actions`
   - Find "Sync to FeatureBase" workflow run
   - Check workflow completed successfully
   - Check PR comment shows sync results (files processed, created, updated)
   - Verify FeatureBase post was updated

**Expected Results:**
- ✅ Workflow triggers on PR merge
- ✅ Validation passes
- ✅ Sync completes successfully
- ✅ PR comment shows results
- ✅ FeatureBase reflects changes

---

### Test 2: Validation Failure

**Goal:** Verify workflow fails gracefully on invalid frontmatter.

**Steps:**

1. **Create branch with invalid frontmatter:**
   ```bash
   git checkout -b test/featurebase-validation-failure
   ```

2. **Create post with missing required field:**
   ```bash
   cat > modules/chariot/docs/featurebase/posts/invalid-post.md <<EOF
   ---
   # Missing title and boardId
   featurebaseId: "test-id"
   ---

   This post has invalid frontmatter.
   EOF
   ```

3. **Commit and create PR:**
   ```bash
   git add modules/chariot/docs/featurebase/posts/invalid-post.md
   git commit -m "test: invalid frontmatter"
   git push origin test/featurebase-validation-failure
   gh pr create --title "Test: Validation failure" --body "Testing validation"
   gh pr merge --squash
   ```

4. **Verify workflow:**
   - Check workflow fails at validation step
   - Check PR comment shows validation error
   - Check GitHub issue created for failure

**Expected Results:**
- ✅ Workflow fails at validation step
- ✅ PR comment shows error details
- ✅ GitHub issue created with "automation" and "bug" labels

---

### Test 3: API Error Handling

**Goal:** Verify workflow handles FeatureBase API errors gracefully.

**Steps:**

1. **Temporarily break API key:**
   - Update `FEATUREBASE_API_KEY` secret to invalid value
   - Create and merge PR with valid markdown changes

2. **Verify workflow:**
   - Check workflow fails at sync step
   - Check PR comment shows API error
   - Check GitHub issue created

3. **Restore API key:**
   - Update secret back to valid value

**Expected Results:**
- ✅ Workflow fails gracefully on API error
- ✅ Error details logged
- ✅ GitHub issue created for manual investigation

---

### Test 4: No Changes to Sync

**Goal:** Verify workflow skips when no FeatureBase files changed.

**Steps:**

1. **Create PR without FeatureBase changes:**
   ```bash
   git checkout -b test/featurebase-no-changes
   echo "# Test" > README-test.md
   git add README-test.md
   git commit -m "test: non-featurebase change"
   git push origin test/featurebase-no-changes
   gh pr create --title "Test: No FeatureBase changes" --body "No sync needed"
   gh pr merge --squash
   ```

2. **Verify workflow:**
   - Check workflow does NOT trigger (paths filter excludes this)

**Expected Results:**
- ✅ Workflow does not run (paths filter working)

---

## Cleanup

After testing, clean up test files:

```bash
# Delete test posts if needed
rm modules/chariot/docs/featurebase/posts/invalid-post.md

# Restore any modified files
git checkout main -- modules/chariot/docs/featurebase/posts/test-post.md

# Commit cleanup
git add -A
git commit -m "chore: cleanup push workflow tests"
git push origin main
```

---

## Monitoring

After initial testing, monitor for:

1. **Workflow runs:** Check Actions tab regularly
2. **Failed syncs:** Watch for GitHub issues with "automation" label
3. **PR comments:** Verify sync results are accurate
4. **FeatureBase content:** Spot-check synced posts

---

## Troubleshooting

### Workflow not triggering

- **Check paths filter:** Ensure changes are in `modules/chariot/docs/featurebase/**`
- **Check PR merged:** Workflow only runs on merged PRs, not closed
- **Check branch:** Only triggers on PRs to `main` branch

### Validation failing

- **Check frontmatter syntax:** Must be valid YAML
- **Check required fields:** `title` and `boardId` required for posts
- **Check file encoding:** Must be UTF-8

### Sync failing

- **Check API key:** Verify `FEATUREBASE_API_KEY` secret is set
- **Check FeatureBase API:** May be rate limited or experiencing issues
- **Check git diff:** Ensure `HEAD~1` comparison is correct

---

## Success Criteria

Phase 5 testing complete when:

- [x] Successfully pushed changes to FeatureBase via PR merge
- [x] Validation caught invalid frontmatter
- [x] Workflow handled API errors gracefully
- [x] Workflow skipped when no FeatureBase changes
- [x] PR comments show accurate sync results
- [x] GitHub issues created on failures
