# Progress File Lifecycle Flowchart

Visual representation of when and how to manage progress files.

## Decision Flowchart: Should I Create a Progress File?

```
                    ┌──────────────────────────────┐
                    │   Starting new orchestration  │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   How many phases?           │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
            ┌───────────────┐            ┌───────────────┐
            │   1-2 phases  │            │   3+ phases   │
            └───────┬───────┘            └───────┬───────┘
                    │                            │
                    ▼                            ▼
            ┌───────────────┐            ┌───────────────┐
            │  Skip progress │           │ Create progress│
            │     file       │           │     file       │
            └───────────────┘            └───────────────┘
```

## Decision Flowchart: Session Start

```
                    ┌──────────────────────────────┐
                    │      New session started      │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  ls .claude/progress/*.md    │
                    │     Any files exist?         │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
            ┌───────────────┐            ┌───────────────┐
            │      No       │            │      Yes      │
            └───────┬───────┘            └───────┬───────┘
                    │                            │
                    ▼                            ▼
            ┌───────────────┐            ┌───────────────┐
            │  Start fresh  │            │  Read file    │
            │  orchestration│            │  Check status │
            └───────────────┘            └───────┬───────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              │                  │                  │
                              ▼                  ▼                  ▼
                    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
                    │  in_progress    │ │    blocked      │ │    complete     │
                    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
                             │                   │                   │
                             ▼                   ▼                   ▼
                    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
                    │ Resume from     │ │ Resolve blocker │ │ Archive or      │
                    │ current phase   │ │ then resume     │ │ delete file     │
                    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Lifecycle States

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PROGRESS FILE LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐     ┌─────────────┐     ┌───────────┐     ┌──────────┐   │
│  │ Creation │ ──► │ in_progress │ ──► │  blocked  │ ──► │ complete │   │
│  └──────────┘     └─────────────┘     └───────────┘     └──────────┘   │
│       │                 │                   │                 │         │
│       │                 │                   │                 │         │
│       │                 ▼                   ▼                 ▼         │
│       │           ┌───────────┐      ┌───────────┐     ┌───────────┐   │
│       │           │  Update   │      │  Resolve  │     │  Archive  │   │
│       │           │ after each│◄─────│  blocker  │     │    or     │   │
│       │           │   phase   │      └───────────┘     │  Delete   │   │
│       │           └───────────┘                        └───────────┘   │
│       │                                                                 │
│       └─────────────────────────────────────────────────────────────►   │
│                     (Skip if simple task)                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Update Triggers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         UPDATE TRIGGERS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────┐                                            │
│  │    Agent completes      │ ──► Update completed phases                │
│  │                         │     Add agent output                       │
│  └─────────────────────────┘     Update timestamp                       │
│                                                                         │
│  ┌─────────────────────────┐                                            │
│  │   Blocker encountered   │ ──► Update status to "blocked"             │
│  │                         │     Document blocker                       │
│  └─────────────────────────┘     Add to Error Log                       │
│                                                                         │
│  ┌─────────────────────────┐                                            │
│  │    Scope changes        │ ──► Update pending phases                  │
│  │                         │     Document reason                        │
│  └─────────────────────────┘     Update Overview                        │
│                                                                         │
│  ┌─────────────────────────┐                                            │
│  │    Error resolved       │ ──► Add to Error Log                       │
│  │                         │     Document resolution                    │
│  └─────────────────────────┘     Update status if unblocked             │
│                                                                         │
│  ┌─────────────────────────┐                                            │
│  │   30 min checkpoint     │ ──► Update timestamp                       │
│  │   (long phases)         │     Add progress note                      │
│  └─────────────────────────┘                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Cleanup Decision

```
                    ┌──────────────────────────────┐
                    │    Orchestration complete    │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   Does file have reference   │
                    │          value?              │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
            ┌───────────────┐            ┌───────────────┐
            │      Yes      │            │      No       │
            │               │            │               │
            │ - Architecture│            │ - Simple task │
            │   decisions   │            │ - Info in PR  │
            │ - May repeat  │            │ - No patterns │
            │ - User wants  │            │ - User says   │
            └───────┬───────┘            └───────┬───────┘
                    │                            │
                    ▼                            ▼
            ┌───────────────┐            ┌───────────────┐
            │    ARCHIVE    │            │    DELETE     │
            │               │            │               │
            │ mv file.md    │            │ rm file.md    │
            │ archived/     │            │               │
            └───────────────┘            └───────────────┘
```

## Complete Flow Example

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXAMPLE: 5-Phase Orchestration                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Session 1                                                              │
│  ─────────                                                              │
│  1. User: "Implement job processing with tests"                         │
│  2. Orchestrator: Create progress file                                  │
│  3. Phase 1: Architecture → Complete → Update file                      │
│  4. Phase 2: Infrastructure → Complete → Update file                    │
│  5. Phase 3: Implementation → Started → Context exhausted               │
│                                                                         │
│  Session 2 (Resume)                                                     │
│  ─────────────────                                                      │
│  1. User: "Continue job processing"                                     │
│  2. Orchestrator: Read progress file                                    │
│  3. Status: in_progress, Current: Phase 3                               │
│  4. Resume Phase 3: Implementation → Complete → Update file             │
│  5. Phase 4: Testing → Complete → Update file                           │
│  6. Session ends                                                        │
│                                                                         │
│  Session 3 (Resume)                                                     │
│  ─────────────────                                                      │
│  1. Orchestrator: Read progress file                                    │
│  2. Status: in_progress, Current: Phase 5                               │
│  3. Phase 5: Review → Complete → Update file                            │
│  4. All phases complete → Status: complete                              │
│  5. Archive progress file                                               │
│  6. Return final summary                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      INTEGRATION POINTS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  orchestrating-multi-agent-workflows                                    │
│  ────────────────────────────────────                                   │
│  • Creates progress file at orchestration start                         │
│  • Updates after each agent completes                                   │
│  • References this skill for persistence patterns                       │
│                                                                         │
│  TodoWrite                                                              │
│  ─────────                                                              │
│  • Progress file: Cross-session state                                   │
│  • TodoWrite: Within-session tracking                                   │
│  • Sync: Create todos from pending phases at session start              │
│                                                                         │
│  Agents                                                                 │
│  ──────                                                                 │
│  • Agent outputs stored in progress file                                │
│  • Context from file passed to next agent                               │
│  • Handoff info preserved across sessions                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```
