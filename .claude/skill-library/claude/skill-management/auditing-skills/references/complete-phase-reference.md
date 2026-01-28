# Complete Phase Reference

All 29 validation phases for skill auditing:

| Phase | Name                      | Severity | Category         | What It Checks                             |
| ----- | ------------------------- | -------- | ---------------- | ------------------------------------------ |
| 1     | Description Format        | WARNING  | Claude-Automated | Starts with "Use when", <120 chars         |
| 2     | Allowed Tools             | INFO     | Deterministic    | Valid tool names in frontmatter            |
| 3     | Line Count                | CRITICAL | Claude-Automated | <500 lines hard limit                      |
| 4     | Broken Links              | WARNING  | Hybrid           | All markdown links resolve                 |
| 5     | File Organization         | WARNING  | Deterministic    | SKILL.md + references/ + scripts/          |
| 6     | Script Organization       | WARNING  | Deterministic    | Scripts in scripts/ subdirectory           |
| 7     | Output Directory          | INFO     | Deterministic    | Runtime artifacts in .local/               |
| 8     | TypeScript Structure      | CRITICAL | Human-Required   | Compiles without errors                    |
| 9     | Bash to TypeScript Migration | INFO     | Human-Required   | Cross-platform compatibility               |
| 10    | Reference Audit           | WARNING  | Hybrid           | Referenced skills/agents exist             |
| 11    | Command Audit             | WARNING  | Claude-Automated | Bash commands use repo-root pattern        |
| 12    | CLI Error Handling        | WARNING  | Deterministic    | Exit code 2 for tool errors                |
| 13    | State Externalization     | WARNING  | Claude-Automated | TodoWrite for multi-step workflows         |
| 14    | Table Formatting          | WARNING  | Deterministic    | Prettier-formatted tables                  |
| 15    | Code Block Quality        | WARNING  | Claude-Automated | Language tags present                      |
| 16    | Header Hierarchy          | INFO     | Validation-Only  | Proper H1 to H2 to H3 nesting              |
| 17    | Prose Phase References    | WARNING  | Validation-Only  | Phase references match canonical names     |
| 18    | Orphan Detection          | WARNING  | Claude-Automated | Library skills have gateway reference      |
| 19    | Windows Paths             | WARNING  | Deterministic    | No Windows backslash paths                 |
| 20    | Gateway Structure         | CRITICAL | Human-Required   | Gateway explains two-tier system           |
| 21    | Routing Table Format      | WARNING  | Deterministic    | Gateway tables show full paths             |
| 22    | Path Resolution           | WARNING  | Hybrid           | Gateway paths exist on filesystem          |
| 23    | Coverage Check            | INFO     | Hybrid           | All library skills in exactly one gateway  |
| 24    | Line Number References    | WARNING  | Claude-Automated | No hardcoded line numbers                  |
| 25    | Context7 Staleness        | WARNING  | Claude-Automated | Context7 docs <30 days old                 |
| 26    | Reference Content Quality | CRITICAL | Claude-Automated | No empty or placeholder files (report EACH file separately) |
| 28    | Integration Section       | CRITICAL | Claude-Automated | Has Called-By, Requires, Calls, Pairs-With |
| 29    | Logical Coherence         | WARNING  | Claude-Automated | Workflow logic, contradictions, missing steps, alignment |

**Note:** Phase 27 (Relative Path Depth) checks for deep relative paths (3+ levels of ../).

## Phase Categories Summary

| Category         | Count | Description                    |
| ---------------- | ----- | ------------------------------ |
| Deterministic    | 9     | One correct answer             |
| Hybrid           | 4     | Deterministic + Claude         |
| Claude-Automated | 11    | Claude decides                 |
| Human-Required   | 3     | Human judgment                 |
| Validation-Only  | 2     | Detect, no fix                 |
| Gateway-only     | 4     | Gateway skills only            |

For detailed phase documentation, see [phase-details.md](phase-details.md).
