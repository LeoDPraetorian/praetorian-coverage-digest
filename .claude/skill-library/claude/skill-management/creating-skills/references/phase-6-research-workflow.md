# Phase 6: Research Workflow

## Sub-Phase 6.1: Research Decision

Ask user via AskUserQuestion: "Would you like to conduct research to populate the skill content?"

Options:

- "Yes, research sources (Recommended)"
- "No, skip research"

**If "No"**:

- Populate from original request (not templates)
- Create reference files only with actual content
- Skip to Phase 7 (library) or Phase 8 (core)
- Document in changelog

**If "Yes"**: Continue to Sub-Phase 6.2.

## Sub-Phase 6.2: Execute Research

**BEFORE invoking orchestrating-research, set up continuation state:**

1. Write remaining phases to TodoWrite (these persist across the research context switch):

   ```
   TodoWrite([
     { content: 'Sub-Phase 6.2: Execute research', status: 'in_progress', activeForm: 'Executing research' },
     { content: 'Sub-Phase 6.3: Incorporate research into skill', status: 'pending', activeForm: 'Incorporating research' },
     { content: 'Phase 7: Gateway update', status: 'pending', activeForm: 'Updating gateway' },
     { content: 'Phase 8: GREEN verification', status: 'pending', activeForm: 'Verifying skill works' },
     { content: 'Phase 9: REFACTOR pressure tests', status: 'pending', activeForm: 'Pressure testing' }
   ])
   ```

2. Then invoke orchestrating-research:

   ```
   Read(".claude/skill-library/research/orchestrating-research/SKILL.md")
   ```

**IMMEDIATELY after orchestrating-research returns:**

YOU MUST execute these steps in sequence WITHOUT stopping:

1. Mark Sub-Phase 6.2 complete in TodoWrite
2. Check TodoWrite for next pending phase (should be 6.3)
3. Read SYNTHESIS.md from output directory
4. **Proceed directly to Sub-Phase 6.3** (do NOT report completion, do NOT wait for user)

The signal `WORKFLOW_CONTINUATION_REQUIRED` means: "Resume workflow at next TodoWrite item NOW."

**Do NOT:**

- Report 'Research complete!' to user and stop
- Summarize research findings and wait for acknowledgment
- Say "NEXT ACTION: Read SYNTHESIS.md and proceed to Sub-Phase 6.3" without actually doing it
- Wait for user to type 'continue'
- Mark all phases complete when only 6.2 is done

The orchestrating-research skill provides intent expansion, parallel research across 6 sources, conflict detection, and comprehensive SYNTHESIS.md.

**Why research matters:** [research-rationalizations.md](research-rationalizations.md) - Skills from training data have ~30% stale information.

## Sub-Phase 6.3: Incorporate Research into Skill

**POST-RESEARCH RESUME POINT - This phase executes IMMEDIATELY after Sub-Phase 6.2 returns.**

Read SYNTHESIS.md from `.claude/.output/research/{timestamp}-{topic}/` (orchestrating-research creates OUTPUT_DIR with SYNTHESIS.md and source files), update SKILL.md with patterns/docs/practices, populate references/, replace placeholders with real examples.

**After reading SYNTHESIS.md:**

1. **Expand TodoWrite** - Create per-file items for required references (see [research-integration.md](research-integration.md) for skill type → reference file mapping)
2. **Map content** - Route SYNTHESIS.md sections to reference files using mapping table
3. **Create files** - Write each reference file with >50 lines from research sources (not placeholders)
   3b. **Verify reference file line counts:**

```bash
for file in references/*.md; do
  lines=$(wc -l < "$file")
  if [ "$lines" -gt 400 ]; then
    echo "❌ CRITICAL: $file is $lines lines - split required"
    exit 1
  elif [ "$lines" -gt 350 ]; then
    echo "⚠️ WARNING: $file is $lines lines - approaching limit"
  fi
done
```

**If any reference file > 400 lines:** Split by H2 headers into separate files before proceeding.

4. **Verify** - Run bash check confirming all files exist with content

**Verification gate (blocks Phase 7):**

```bash
for file in workflow.md advanced-patterns.md; do
  [ ! -f "references/$file" ] || [ $(wc -l < "references/$file") -lt 50 ] && echo "FAIL: $file missing/stub" && exit 1
  [ $(wc -l < "references/$file") -gt 400 ] && echo "FAIL: $file exceeds 400 lines" && exit 1
done
```

**See:** [research-integration.md](research-integration.md) for rationalization counters, verification gates, and anti-patterns.
