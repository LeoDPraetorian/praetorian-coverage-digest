# Troubleshooting

**Common issues and fixes.**

## Issue: Agent creates duplicate directory

**Symptom:** Two directories for the same feature

**Cause:** Missing feature_directory parameter

**Fix:** Main Claude should extract feature_directory from previous agent output and pass it to next agent

## Issue: Agent can't find directory

**Symptom:** Agent creates new directory when one exists

**Cause:** More than 60 minutes since last MANIFEST update

**Fix:**
- Pass feature_directory explicitly, OR
- Accept new directory creation (stale workflow restarted)

## Issue: Wrong directory selected

**Symptom:** Agent uses incorrect feature directory

**Cause:** Poor semantic match (similar descriptions)

**Fix:**
- Improve slug generation (more specific keywords)
- Add detailed description to MANIFEST.yaml
- Pass feature_directory explicitly to avoid ambiguity

## Issue: MANIFEST.yaml not updated

**Symptom:** Agent wrote file but didn't update MANIFEST

**Cause:** Agent skipped MANIFEST update step

**Fix:** Reinforce in agent definition that MANIFEST update is MANDATORY

## Issue: No feature_directory in artifacts

**Symptom:** artifacts array missing feature_directory field

**Cause:** Agent didn't include full path

**Fix:** Return absolute path: `.claude/features/{timestamp}-{slug}/{filename}`

