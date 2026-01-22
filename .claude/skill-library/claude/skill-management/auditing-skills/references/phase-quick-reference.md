# Quick Phase Reference Table

This table provides a quick overview of all 30 validation phases. For detailed documentation of each phase, see [phase-details.md](phase-details.md).

## All 30 Validation Phases

| Phase | Name                      | Criticality | Finding Severity | Category         |
| ----- | ------------------------- | ----------- | ---------------- | ---------------- |
| 1     | Description Format        | CRITICAL    | WARNING          | Claude-Automated |
| 2     | Allowed Tools             | MEDIUM      | INFO             | Deterministic    |
| 3     | Line Count                | CRITICAL    | VARIES           | Hybrid           |
| 4     | Broken Links              | CRITICAL    | WARNING          | Hybrid           |
| 5     | File Organization         | HIGH        | WARNING          | Deterministic    |
| 6     | Script Organization       | LOW         | WARNING          | Deterministic    |
| 7     | Output Directory          | LOW         | INFO             | Deterministic    |
| 8     | TypeScript Structure      | CRITICAL    | CRITICAL         | Human-Required   |
| 9     | Bash→TypeScript Migration | N/A         | INFO             | Human-Required   |
| 10    | Reference Audit           | HIGH        | WARNING          | Hybrid           |
| 11    | Command Audit             | MEDIUM      | WARNING          | Claude-Automated |
| 12    | CLI Error Handling        | LOW         | WARNING          | Deterministic    |
| 13    | State Externalization     | HIGH        | WARNING          | Claude-Automated |
| 14    | Table Formatting          | HIGH        | WARNING          | Deterministic    |
| 15    | Code Block Quality        | MEDIUM      | WARNING          | Claude-Automated |
| 16    | Header Hierarchy          | LOW         | INFO             | Validation-Only  |
| 17    | Prose Phase References    | LOW         | WARNING          | Validation-Only  |
| 18    | Orphan Detection          | HIGH        | WARNING          | Claude-Automated |
| 19    | Windows Paths             | LOW         | WARNING          | Deterministic    |
| 20    | Gateway Structure         | HIGH        | CRITICAL         | Human-Required   |
| 21    | Routing Table Format      | HIGH        | WARNING          | Deterministic    |
| 22    | Path Resolution           | HIGH        | WARNING          | Hybrid           |
| 23    | Coverage Check            | MEDIUM      | INFO             | Hybrid           |
| 24    | Line Number References    | MEDIUM      | WARNING          | Claude-Automated |
| 25    | Context7 Staleness        | MEDIUM      | WARNING          | Claude-Automated |
| 26    | Reference Content Quality | CRITICAL    | CRITICAL         | Claude-Automated |
| 27    | Relative Path Depth       | CRITICAL    | CRITICAL         | Hybrid           |
| 28    | Integration Section       | CRITICAL    | CRITICAL         | Claude-Automated |
| 29    | Integration Semantic      | CRITICAL    | WARNING          | Claude-Automated |
| 30    | Logical Coherence         | CRITICAL    | WARNING          | Claude-Automated |

## Criticality Levels

Criticality determines which phases agents MUST check vs can skip:

| Criticality | Meaning                        | Agent Behavior                      |
| ----------- | ------------------------------ | ----------------------------------- |
| CRITICAL    | Blocks skill functionality     | MUST check every audit, cannot skip |
| HIGH        | Commonly violated, high impact | MUST check every audit              |
| MEDIUM      | Moderate impact                | SHOULD check if context permits     |
| LOW         | Rarely critical                | MAY skip unless specific trigger    |
| N/A         | Not applicable                 | SKIP unless explicitly requested    |

**Minimum viable audit:** All CRITICAL + HIGH phases (17 phases).
**Full audit:** All phases except N/A (29 phases).

## Phase Summary by Criticality

| Criticality | Count | Phases                         |
| ----------- | ----- | ------------------------------ |
| CRITICAL    | 9     | 1, 3, 4, 8, 26, 27, 28, 29, 30 |
| HIGH        | 8     | 5, 10, 13, 14, 18, 20, 21, 22  |
| MEDIUM      | 6     | 2, 11, 15, 23, 24, 25          |
| LOW         | 6     | 6, 7, 12, 16, 17, 19           |
| N/A         | 1     | 9                              |

## Phase Categories

| Phase Category   | Count | What                   | Example Phases                            |
| ---------------- | ----- | ---------------------- | ----------------------------------------- |
| Deterministic    | 9     | One correct answer     | Allowed tools, File organization          |
| Hybrid           | 6     | Deterministic + Claude | Line count, Broken links, Path resolution |
| Claude-Automated | 12    | Claude decides         | Orphan detection, Integration semantic    |
| Human-Required   | 3     | Human judgment         | TypeScript errors, Bash migration         |
| Validation-Only  | 2     | Detect, no fix         | Header hierarchy                          |
| Gateway-only     | 4     | Gateway skills only    | Structure, Routing, Coverage              |

For complete details on detection procedures, fixing strategies, and examples, see [phase-details.md](phase-details.md).
