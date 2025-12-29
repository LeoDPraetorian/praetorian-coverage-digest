# Semantic Review Output Format

**How to output semantic findings for integration with the audit CLI.**

---

## Output Format

**⛔ CRITICAL: Output semantic findings as JSON ONLY. Do NOT output tables or prose.**

The CLI handles all formatting via the shared formatter. Your role is to provide structured data, not formatted output.

After evaluating the 6 criteria, write findings to a temporary JSON file:

```bash
TMPFILE=/tmp/semantic-findings-${SKILL_NAME}.json
cat > $TMPFILE << 'EOF'
{
  "findings": [
    {
      "severity": "WARNING",
      "criterion": "Gateway Membership",
      "issue": "Frontend skill missing from gateway-frontend",
      "recommendation": "Add to gateway-frontend routing table"
    }
  ]
}
EOF
```

**If no semantic issues found:**

```bash
cat > $TMPFILE << 'EOF'
{
  "findings": []
}
EOF
```

---

## Severity Levels

| Severity     | When to Use                                                               |
| ------------ | ------------------------------------------------------------------------- |
| **CRITICAL** | Blocks discoverability or causes functional issues (missing gateway)      |
| **WARNING**  | Impacts usability or maintainability (description quality, tool mismatch) |
| **INFO**     | Suggestions for improvement (content density, documentation links)        |

**Criterion naming:** Use the checklist item name exactly (e.g., "Gateway Membership", "Description Quality", "Tool Appropriateness")

---

## Combined Output

After writing JSON file, invoke CLI to merge and format:

```bash
npm run -w @chariot/auditing-skills audit -- ${SKILL_NAME} --merge-semantic $TMPFILE
```

**The CLI outputs ONE combined deterministic table. Do NOT output completion message yourself.**

---

## Output Termination Protocol

**ABSOLUTE RULE**: After the CLI renders the combined table above, your response is COMPLETE.

**Do NOT add ANY text after the CLI command output:**

- No summary ("Audit complete", "Found X issues")
- No bullet points or recommendations
- No prose or commentary
- No "Here are the findings..."
- NOTHING

---

## Output Contract

| Role                      | Responsibility                                   |
| ------------------------- | ------------------------------------------------ |
| ✅ **You provide**        | Semantic findings as JSON                        |
| ✅ **CLI provides**       | Formatted combined table (structural + semantic) |
| ❌ **You do NOT provide** | Any text after CLI runs                          |

**Violation of this contract = task failure.**

**Why this matters**: Deterministic output requires same input → identical output every time. Claude prose is non-deterministic. The CLI formatter solves this. Your work is done when the CLI completes.
