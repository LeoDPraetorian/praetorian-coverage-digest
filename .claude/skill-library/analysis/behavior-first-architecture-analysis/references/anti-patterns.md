# Anti-Patterns in Architecture Analysis

Common mistakes that lead to mischaracterization.

## Anti-Pattern 1: Keyword-Based Capability Assessment

**What It Looks Like**:

```
grep -r "workflow" → no results
Conclusion: "No workflow engine exists"
```

**Why It's Wrong**:

- Different naming conventions (e.g., `JobChainer`, `TaskDispatcher`, `EventHandler`)
- Implicit patterns don't have explicit names
- Convention-based systems may not name their conventions

**Correct Approach**:

1. Ask "what happens when X occurs?" not "is there an X handler?"
2. Trace execution from entry points
3. Document the PATTERN, not the presence/absence of a name

---

## Anti-Pattern 2: Spec-Based Comparison

**What It Looks Like**:

```
Spec says: "System shall have workflow orchestration"
Code has: Event-driven dispatch via type matching
Conclusion: "Workflow orchestration: 5% complete"
```

**Why It's Wrong**:

- Specs describe WHAT (requirements), not HOW (implementation)
- Different paradigms can satisfy the same requirement
- Percentage assessments without execution tracing are meaningless

**Correct Approach**:

1. Understand what behavior the spec requires
2. Determine if the code achieves that behavior (regardless of approach)
3. Document paradigm differences, not "completion percentages"

---

## Anti-Pattern 3: Single-Source Truth

**What It Looks Like**:

```
Checked: pkg/workflow/ directory
Found: Empty
Conclusion: "No workflow implementation"
```

**Why It's Wrong**:

- Functionality may be distributed across multiple locations
- Naming conventions vary between teams and codebases
- Emergent patterns don't live in single directories

**Correct Approach**:

1. Use 4 different entry points to triangulate
2. If all 4 agents find the same pattern, it's reliable
3. If agents disagree, investigate the discrepancy

---

## Anti-Pattern 4: Architecture Doc Trust

**What It Looks Like**:

```
README says: "We use a three-tier architecture"
Conclusion: Document this as the architecture
```

**Why It's Wrong**:

- Documentation drifts from implementation
- Aspirational docs describe intended, not actual state
- Only code execution is ground truth

**Correct Approach**:

1. Use docs as starting hypotheses, not conclusions
2. Verify every architectural claim with code traces
3. Note divergences between docs and reality

---

## Anti-Pattern 5: Absence of Evidence = Evidence of Absence

**What It Looks Like**:

```
Searched for: StateManager, WorkflowEngine, Orchestrator
Found: None
Conclusion: "System lacks orchestration"
```

**Why It's Wrong**:

- Searched for expected names, not actual patterns
- 3 keyword searches ≠ thorough investigation
- Implicit orchestration won't have these names

**Correct Approach**:

1. Trace what actually coordinates execution
2. Search for patterns, not names:
   - Type switches / pattern matching
   - Queue consumers
   - Event handlers
   - Registry lookups
3. Document what you DID find, then assess

---

## Anti-Pattern 6: Premature Gap Declaration

**What It Looks Like**:

```
Agent 1 didn't find X
Conclusion: "X is a critical gap"
```

**Why It's Wrong**:

- Single-agent analysis has blind spots
- Different entry points reveal different aspects
- "Gap" claims require counter-evidence documentation

**Correct Approach**:
Before declaring a gap:

1. Did 4 agents from different angles all fail to find it?
2. Did each agent search for 3+ alternative implementations?
3. Is this actually missing, or a different paradigm?
4. Document the counter-evidence searches performed

---

## Summary: Questions to Ask Before Concluding

| Before Saying        | Ask First                                          |
| -------------------- | -------------------------------------------------- |
| "X is missing"       | Did I search for alternative implementations?      |
| "X% complete"        | What execution traces support this percentage?     |
| "Critical gap"       | Did multiple agents from different angles confirm? |
| "Doesn't match spec" | Does behavior differ, or just naming/paradigm?     |
| "Incomplete"         | Incomplete compared to what explicit standard?     |
| "No orchestration"   | Did I trace what actually coordinates execution?   |
