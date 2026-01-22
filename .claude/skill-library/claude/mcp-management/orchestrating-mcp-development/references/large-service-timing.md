**Parent document**: [large-service-handling.md](large-service-handling.md)

# Large Service Timing Estimates

Per-tool and service-level time estimates for orchestrating large MCP wrapper development.

## Per-Tool Time Estimates

Based on historical data, average time per tool per phase:

| Phase                  | Time per Tool | Notes                          |
| ---------------------- | ------------- | ------------------------------ |
| 2. Schema Discovery    | 2-3 min       | Manual testing + documentation |
| 4. Architecture        | 1-2 min       | tool-lead per tool             |
| 4. Test Planning       | 2-3 min       | tool-tester per tool           |
| 4. Test Implementation | 3-5 min       | tool-tester writes 18 tests    |
| 5. Test Planning       | <1 min        | CLI execution                  |
| 6. Implementation      | 4-6 min       | tool-developer per tool        |
| 7. Code Review         | 2-3 min       | tool-reviewer per tool         |
| 8. Testing             | 1-2 min       | CLI execution with coverage    |
| 9. Audit               | <1 min        | CLI execution per tool         |

**Total per tool:** ~15-25 minutes (varies by complexity)

### Per-Phase Breakdown

#### Phase 3: Schema Discovery (2-3 min per tool)

- MCP list_tools call: 5-10s
- Schema documentation parsing: 1-2 min
- Manual testing: 30s-1 min
- Writing schema-discovery.md: 30s

#### Phase 6: Architecture (1-2 min per tool)

- tool-lead analyzes schema: 30s
- Determines token optimization: 30s
- Writes architecture.md: 30s-1 min

#### Phase 6: Test Planning (2-3 min per tool)

- tool-tester reads architecture: 30s
- Plans 18 test cases: 1-2 min
- Writes test-plan.md: 30s

#### Phase 6: Test Implementation (3-5 min per tool)

- tool-tester writes test file: 2-3 min
- Configures mocks: 1 min
- Verifies test structure: 30s-1 min

#### Phase 7: Test Planning (<1 min)

- Run tests (should all fail): 10-20s
- Verify failure reasons: 10-20s
- Update MANIFEST.yaml: 5-10s

#### Phase 8: Implementation (4-6 min per tool)

- tool-developer writes wrapper: 3-4 min
- Implements Zod schema: 1 min
- Implements response filtering: 1 min
- Verification: 30s

#### Phase 9: Code Review (2-3 min per tool)

- Stage 1 (spec compliance): 1-1.5 min
- Stage 2 (quality + security): 1-1.5 min
- Writing review reports: 30s

#### Phase 10: Testing (1-2 min)

- Run tests (should all pass): 30s-1 min
- Coverage check: 20-30s
- Verify 80%+ coverage: 10-20s

#### Phase 11: Audit (<1 min)

- Run audit command: 20-30s
- Verify compliance: 10-20s

## Service-Level Time Estimates

| Tool Count | Batch Size | Batches | Est. Duration | With Checkpoints |
| ---------- | ---------- | ------- | ------------- | ---------------- |
| 5          | 5          | 1       | 75-125 min    | 90-140 min       |
| 10         | 5          | 2       | 150-250 min   | 165-275 min      |
| 15         | 4          | 4       | 225-375 min   | 255-420 min      |
| 20         | 4          | 5       | 300-500 min   | 345-570 min      |
| 25         | 3          | 9       | 375-625 min   | 450-750 min      |
| 30         | 3          | 10      | 450-750 min   | 540-900 min      |

**Note:** Checkpoints add ~10-15 minutes each for human review and approval.

### Duration Breakdown by Service Size

#### Small Service (5-10 tools)

```
Total time: 75-250 minutes (1.25-4.15 hours)

Breakdown:
- Phase 1: 5-10 min (setup)
- Phase 3: 10-30 min (schema discovery)
- Phase 5: 15-20 min (shared architecture + checkpoint)
- Phase 6: 30-100 min (per-tool work)
- Phase 7: 2-5 min (RED gate)
- Phase 8: 20-60 min (implementation)
- Phase 9: 10-30 min (code review)
- Phase 10: 5-10 min (GREEN gate)
- Phase 11: 2-5 min (audit)
- Phase 12: 5-10 min (completion)

Checkpoints: 1 (Phase 5 architecture)
```

#### Medium Service (11-15 tools)

```
Total time: 165-420 minutes (2.75-7 hours)

Breakdown:
- Phase 1: 5-10 min
- Phase 3: 22-45 min
- Phase 5: 15-20 min + checkpoint
- Phase 6: 66-165 min
- Phase 7: 3-8 min
- Phase 8: 44-90 min
- Phase 9: 22-45 min
- Phase 10: 11-15 min
- Phase 11: 3-8 min
- Phase 12: 5-10 min

Checkpoints: 2 (Phase 5 + Phase 10)
```

#### Large Service (16-25 tools)

```
Total time: 240-750 minutes (4-12.5 hours)

Breakdown:
- Phase 1: 10-15 min (includes persistence setup)
- Phase 3: 32-75 min
- Phase 5: 20-30 min + checkpoint
- Phase 6: 96-275 min
- Phase 7: 5-13 min
- Phase 8: 64-150 min
- Phase 9: 32-75 min
- Phase 10: 16-25 min
- Phase 11: 5-13 min
- Phase 12: 10-15 min

Checkpoints: 3-4 (Phase 5 + 1-2 progress + Phase 10)
Sessions: 1-2 (split at ~6 hour mark if needed)
```

#### Extra Large Service (26-40+ tools)

```
Total time: 390-1000+ minutes (6.5-16.5+ hours)

Breakdown:
- Phase 1: 10-20 min (includes persistence setup)
- Phase 3: 52-120 min
- Phase 5: 20-30 min + checkpoint
- Phase 6: 156-440 min
- Phase 7: 8-20 min
- Phase 8: 104-240 min
- Phase 9: 52-120 min
- Phase 10: 26-40 min
- Phase 11: 8-20 min
- Phase 12: 10-20 min

Checkpoints: 4-6 (Phase 5 + 2-4 progress + Phase 10)
Sessions: 2-3 (split at 4-6 hour intervals)
```

## Timing Factors & Adjustments

### Complexity Multipliers

| Complexity | Multiplier | Example                         |
| ---------- | ---------- | ------------------------------- |
| Simple     | 0.8x       | List operation, <5 input fields |
| Medium     | 1.0x       | CRUD operations, 5-10 fields    |
| Complex    | 1.5x       | Nested data, >10 fields, search |

**Example:**

```
Tool: GitHub search-repositories
Complexity: Complex (>10 input fields, nested results)

Base time: 20 min per tool
Adjusted: 20 × 1.5 = 30 min per tool
```

### Retry Impact on Timing

| Retry Type     | Average Delay | Frequency | Impact                |
| -------------- | ------------- | --------- | --------------------- |
| Review retry   | +5-10 min     | 10-20%    | +1-2 min per tool     |
| Test fix retry | +3-5 min      | 5-10%     | +0.5-1 min per tool   |
| Gate re-run    | +2-3 min      | 5%        | +0.2-0.5 min per tool |

**Realistic estimate includes retry buffer: +10-15% of base time**

### Checkpoint Overhead

| Checkpoint Type  | Time Added | Frequency                 |
| ---------------- | ---------- | ------------------------- |
| Architecture     | 10-15 min  | Once (Phase 5)            |
| Progress report  | 5-10 min   | Every 6-12 tools (large+) |
| Issue escalation | 15-30 min  | Rare (<5%)                |
| User question    | 2-5 min    | As needed                 |

## Session Planning Recommendations

### Single-Session Services (<6 hours)

| Size   | Tool Count | Total Time | Session Strategy         |
| ------ | ---------- | ---------- | ------------------------ |
| Small  | 5-10       | 1-4 hours  | Complete in one session  |
| Medium | 11-15      | 3-7 hours  | Complete in one session  |
| Large  | 16-20      | 4-9 hours  | Complete or split at 6hr |

### Multi-Session Services (>6 hours)

| Size        | Tool Count | Total Time  | Session Strategy                      |
| ----------- | ---------- | ----------- | ------------------------------------- |
| Large       | 21-25      | 6-12 hours  | Split at 6hr mark (after 12-15 tools) |
| Extra Large | 26-35      | 7-14 hours  | 2-3 sessions (split every 4-6 hours)  |
| Massive     | 36-40+     | 9-16+ hours | 3+ sessions (split every 4 hours)     |

### Optimal Session Length

**Recommendation:** 4-6 hour sessions with breaks

- Avoid >8 hour sessions (context window risk)
- Avoid <2 hour sessions (checkpoint overhead)
- Target 3-5 sessions for 30+ tool services

## Real-World Timing Data

### Observed Service Completions

```
Service: Linear (12 tools, medium complexity)
Estimated: 180-270 min
Actual: 195 min
Checkpoints: 2 (architecture + completion)
Retries: 1 (spec compliance)
```

```
Service: GitHub (28 tools, medium-high complexity)
Estimated: 420-630 min
Actual: 510 min (2 sessions: 320 min + 190 min)
Checkpoints: 4 (architecture + 2 progress + completion)
Retries: 4 (2 spec, 2 quality)
Sessions: 2 (split at 16/28 tools)
```

```
Service: Jira (18 tools, medium complexity)
Estimated: 270-405 min
Actual: 340 min (1 session)
Checkpoints: 3 (architecture + 1 progress + completion)
Retries: 2 (1 spec, 1 security)
```

### Timing Lessons Learned

1. **Complexity adjustments accurate:** 1.5x multiplier for complex tools validated
2. **Checkpoint overhead underestimated:** Add 15-20% not 10%
3. **Retry buffer needed:** 10-15% buffer covers most retries
4. **Session splits at 6hr optimal:** Context window stable up to 6 hours
5. **Progress checkpoints save time:** Early issue detection prevents rework

## Related References

- [Large Service Handling](large-service-handling.md) - Batch sizing and session timeout prevention
- [Large Service Examples](large-service-examples.md) - Complete workflow examples with timing
