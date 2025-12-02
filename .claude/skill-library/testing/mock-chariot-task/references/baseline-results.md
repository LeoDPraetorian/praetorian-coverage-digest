# Baseline Testing Results (RED Phase)

## Scenario 1: Time Pressure + Missing Context

**Agent Response:** Used generic Go testing patterns with interface-based dependency injection

**Violations Observed:**

1. **Didn't use collector pattern**: Created custom interfaces (CommandExecutor, HTTPClient, DNSResolver) instead of using existing CLICollector, HTTPCollector, DNSCollector from pkg/tasks/collector/

2. **Didn't implement MockCollectors method**: No mention of adding MockCollectors() method to capability struct

3. **Wrong file organization**: Created mocks.go in capability directory instead of separate {capability}_mock.go file with proper structure

4. **Missed mock constructors pattern**: Didn't create NewMock{Capability} constructor or NewMock{Capability}CLICollector helpers

5. **Didn't follow XYZ embedding**: No mention of embedding collectors via XYZ struct, capability inherits collectors through embedding chain

6. **Inline mocks in test**: Put mock implementations directly in test file/mocks.go instead of dedicated mock file with helper functions

7. **No reference to existing examples**: Didn't mention looking at nuclei, whois, or edgar capabilities for established patterns

8. **Missed HTTP URL matching patterns**: No mention of MustRegisterHTTP (exact) vs MustRegisterHTTPPattern (regex) distinction

9. **Didn't address date filtering**: No awareness that mock data dates must be recent to pass capability date filters

10. **No target-specific mock generation**: Didn't create helper functions like generateNmapOutput(target) that use target properties

**Rationalizations Used:**
- "Based on Go testing best practices" (ignoring Chariot-specific patterns)
- "Interface-based dependency injection" (reinventing existing collector system)
- "Complete isolation" (achievable with collectors, no need for custom approach)
- "Time constraint: 30 minutes" (still chose non-standard approach)

**Key Insight:** Without explicit guidance, agents default to generic patterns even when project has established conventions. The collector system exists but isn't discovered without pointer.

## Next Steps

Need to test remaining scenarios to capture more rationalizations:
- Scenario 2: Sunk cost with existing code
- Scenario 3: Following existing pattern (nuclei)
- Scenario 4: Date filtering bug
- Scenario 5: Multi-collector coordination

Then write minimal skill addressing these specific violations.
