# Phase Details Reference

**30 validation phases (17 minimum for viable audit, 29 applicable excluding N/A)** documented across 5 reference files for progressive loading.

## Quick Navigation

| Category                        | Phases | File                                                             | Notes                                            |
| ------------------------------- | ------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| Overview & Detection Principles | -      | [phase-details-overview.md](phase-details-overview.md)           | Read this first                                  |
| **Criticality Reference**       | -      | [phase-quick-reference.md](phase-quick-reference.md)             | **Check criticality levels**                     |
| Deterministic                   | 1-9    | [phase-details-deterministic.md](phase-details-deterministic.md) | Objective rules                                  |
| Hybrid                          | 10-14  | [phase-details-hybrid.md](phase-details-hybrid.md)               | Context-aware                                    |
| Claude-Automated                | 15-25  | [phase-details-automated.md](phase-details-automated.md)         | Semantic reasoning                               |
| Human-Required & Gateway        | 26-29  | [phase-details-human-gateway.md](phase-details-human-gateway.md) | Includes 28-29 (Claude-Automated but co-located) |

## How to Use

1. Read [phase-quick-reference.md](phase-quick-reference.md) for **criticality levels** (determines which phases to check)
2. Read [phase-details-overview.md](phase-details-overview.md) for detection principles
3. Read specific category files for phases you're validating

**Minimum viable audit:** Check all CRITICAL + HIGH phases (17 phases).
**Full audit:** Check all phases except N/A (29 phases).

## Why This Split?

The original 1,985-line phase-details.md exceeded Claude's effective working memory. While the Read tool returns all content, agents cannot effectively recall specific phase details from line 1,800+ when working.

**Token economics:** Reading a 2,000-line file costs ~4,000-5,000 tokens. With the split:

- Overview: ~100 lines (~200 tokens)
- Specific category: 200-500 lines (~400-1,000 tokens)
- Total for targeted reading: ~600-1,200 tokens vs 4,000-5,000 tokens

This enables targeted loading of only relevant phases, reducing token usage by 75-85%.
