---
description: Use when creating NoseyParker credential detection rules - human-in-the-loop GitHub validation workflow
allowed-tools: Skill, AskUserQuestion, Read, Write, Bash, WebSearch
argument-hint: <credential-type>
---

# NoseyParker Rule Creation

**Query:** $ARGUMENTS

## Action

Read and follow `.claude/skill-library/development/capabilities/creating-noseyparker-rules/SKILL.md` exactly as it is written.

**Why use skill (not spawn agent)?**
- Rule creation requires human-in-the-loop at 2 checkpoints (GitHub validation + final approval)
- Skill runs IN main conversation, enabling AskUserQuestion for structured feedback
- Sequential workflow with human interaction can't be delegated to isolated subagent
- Main conversation maintains context across all 11 phases

```
Read(".claude/skill-library/development/capabilities/creating-noseyparker-rules/SKILL.md")
```

**Note:** This is a library skill accessed via Read tool, not a core skill.

## Examples

```
/noseyparker-rule Stripe API keys
/noseyparker-rule GitHub Personal Access Token (classic)
/noseyparker-rule SendGrid API keys
/noseyparker-rule Slack webhook URLs
/noseyparker-rule Twilio Account SID
/noseyparker-rule MongoDB connection string
```

## What Happens

**11-Phase Semi-Automated Workflow** (~75% automated, ~10-15 min total)

1. **Intake** (2 min) - Validate credential type, initialize project
2. **Format Research** (5-10 min, automated) - Web search for format specs
3. **Regex Generation** (2 min, automated) - Pattern templates from specs
4. **GitHub Validation** ⚠️ **HUMAN: 5 minutes**
   - Agent provides GitHub search URL
   - Human runs search, provides structured feedback
   - Agent processes feedback automatically
5. **Pattern Refinement** (3 min, automated if needed) - Process feedback, refine regex
6. **Example Preparation** (2 min, automated) - Extract/mangle examples
7. **Documentation** (3 min, automated) - Generate YAML rule file
8. **Validation Testing** (1 min, automated) - Run `noseyparker rules check`
9. **Negative Examples** (2 min, automated) - FP pattern prevention
10. **Final Approval** ⚠️ **HUMAN: 2 minutes** - Review and approve integration
11. **Integration** (2 min, automated) - Copy to target location

**Human Touchpoints:**
- Phase 4: GitHub validation (5 min - structured feedback via questions)
- Phase 10: Final approval (2 min)

**Quality Gates:**
- ✅ Minimum 20 GitHub matches (validates pattern usefulness)
- ✅ Minimum 60% real credential rate (avoids noise)
- ✅ Maximum 40% false positive rate
- ✅ Minimum 3 validated examples
- ✅ `noseyparker rules check` passes

## Output

The skill produces:
- Complete YAML rule file (`.claude/.output/noseyparker-rules/{timestamp}-{type}/rule.yml`)
- Validation results and quality metrics
- Integration ready for `modules/noseyparker/...`

## Parallelization

**Current:** Sequential workflow optimized for single rule with human feedback loops

**Future Enhancement:** Batch mode for creating multiple rules in parallel
- User provides list of credential types
- Main conversation spawns one agent per credential type
- Agents work independently through automated phases
- Human validates all GitHub searches in one batch
- Human approves all rules in final batch
- Example: `"/noseyparker-rule --batch stripe,sendgrid,twilio,slack"`

**Why not parallel now?**
- Human validation is bottleneck (GitHub search + approval)
- Sequential workflow provides better UX for single rule
- Batch mode adds complexity without clear immediate benefit
- Can be added later if demand exists

## Error Handling

If skill encounters issues:
- **No format found**: Fallback to manual format entry
- **0 GitHub matches**: Pattern too specific or credential rare
- **>90% false positives**: Format spec incorrect or pattern too generic
- **Validation fails >3 times**: Flag for manual expert review
- **Insufficient feedback**: Re-prompt with clearer instructions

## Time Savings

**Manual process:** 30-45 minutes per rule
**Automated workflow:** 10-15 minutes per rule (~70% time reduction)
**Human time:** ~7 minutes (GitHub search + final approval)
**Automation:** ~75%
