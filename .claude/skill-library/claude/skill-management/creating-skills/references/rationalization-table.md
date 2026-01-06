# Skill Creation Rationalization Table

Extends [shared rationalization prevention](../../using-skills/references/rationalization-prevention.md).

## Phase-Specific Rationalizations

### Phase 1: RED (Prove Gap Exists)

| Rationalization                        | Why It's Wrong                                     | Response                                 |
| -------------------------------------- | -------------------------------------------------- | ---------------------------------------- |
| 'Skip RED, I know the skill is needed' | RED proves gap with evidence, not intuition        | DENIED. Document failure behavior first. |
| 'The user said they need it'           | User requests don't prove implementation gap       | DENIED. Test scenario without skill.     |
| 'Similar skill failed before'          | Similar != identical. Document THIS gap.           | DENIED. Capture specific failure.        |
| 'RED is bureaucracy'                   | RED prevents skills that don't solve real problems | DENIED. TDD is mandatory.                |

### Phase 2: Validation

| Rationalization                  | Why It's Wrong                              | Response                                |
| -------------------------------- | ------------------------------------------- | --------------------------------------- |
| 'Name is close enough'           | Non-compliant names break discovery         | DENIED. Use kebab-case gerund form.     |
| 'I checked, skill doesn't exist' | Must search both core and library locations | NOT ACCEPTED. Run both search commands. |

### Phase 5: Generation

| Rationalization                    | Why It's Wrong                         | Response                                |
| ---------------------------------- | -------------------------------------- | --------------------------------------- |
| '500 lines is close enough'        | >500 causes context overflow in agents | DENIED. Extract to references/.         |
| 'I'll add references later'        | 'Later' has ~5% completion rate        | DENIED. Create reference structure now. |
| 'Empty placeholder files are fine' | Placeholders become permanent stubs    | DENIED. Only create files with content. |

### Phase 6: Research

| Rationalization                      | Why It's Wrong                                     | Response                                      |
| ------------------------------------ | -------------------------------------------------- | --------------------------------------------- |
| 'Skip research, I know the topic'    | Training data is stale; research gets current info | DENIED. Invoke orchestrating-research.        |
| 'Research takes too long'            | Research prevents 10x rework from wrong patterns   | DENIED. Research is investment, not overhead. |
| 'Simple skill doesn't need research' | Simple topics have edge cases too                  | DENIED. Research validates assumptions.       |
| 'I can use my training data'         | Training data may be outdated or incorrect         | DENIED. Research gets verified current info.  |

### Phase 7: Gateway Update

| Rationalization                   | Why It's Wrong                       | Response                                       |
| --------------------------------- | ------------------------------------ | ---------------------------------------------- |
| 'Gateway update can happen later' | 'Later' has ~5% completion rate      | DENIED. Update gateway now.                    |
| 'Obvious which gateway to use'    | Purpose determines gateway, not path | DENIED. Confirm with user via AskUserQuestion. |

### Phase 8: GREEN (Verify Skill Works)

| Rationalization                      | Why It's Wrong                            | Response                          |
| ------------------------------------ | ----------------------------------------- | --------------------------------- |
| 'Skill looks complete'               | Looking complete != passing original test | DENIED. Re-test the RED scenario. |
| 'Skip audit, I followed the process' | Audits catch issues process missed        | DENIED. Run compliance audit.     |

### Phase 9: REFACTOR (Pressure Test)

| Rationalization                          | Why It's Wrong                                  | Response                                          |
| ---------------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| 'Skip pressure testing, skill is simple' | Simple skills still get bypassed under pressure | DENIED. Run three pressure tests.                 |
| 'Pressure tests are overkill'            | Pressure tests catch rationalization loopholes  | DENIED. Skills must resist pressure.              |
| 'One pressure test is enough'            | Three tests cover different bypass patterns     | DENIED. Run time, authority, and sunk cost tests. |

## Cross-Phase Rationalizations

| Rationalization              | Why It's Wrong                          | Response                             |
| ---------------------------- | --------------------------------------- | ------------------------------------ |
| 'TDD is optional for skills' | TDD is mandatory per skill architecture | DENIED. Complete RED-GREEN-REFACTOR. |
| 'This skill is different'    | All skills follow the same workflow     | DENIED. No exceptions.               |
| '8/9 phases is close enough' | Phases are all-or-nothing               | DENIED. Complete all 9 phases.       |
