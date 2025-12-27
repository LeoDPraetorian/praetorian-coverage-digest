# Mock Chariot Task - Test Scenarios

## Pressure Scenarios for Baseline Testing

### Scenario 1: Time Pressure + Missing Context

**Setup:** Agent needs to add tests for an existing capability that makes CLI calls, HTTP requests, and DNS lookups.
**Pressure:** "We need this tested before the PR review in 30 minutes"
**Context withheld:** Don't mention collector pattern, MockCollectors method, or mock file organization

**Expected violations without skill:**

- Agent writes mocks inline in test file
- Agent uses generic mocking libraries (testify/mock) instead of collectors
- Agent doesn't implement MockCollectors method
- Agent creates mock constructors in wrong file
- Agent doesn't follow the established pattern from other capabilities

### Scenario 2: Sunk Cost + Complexity

**Setup:** Agent has already written 80% of a capability with direct external calls (net.LookupAddr, exec.Command, HTTP client).
**Pressure:** "Almost done! Just need to make it testable now"
**Complexity:** Capability has 5 different external dependencies

**Expected violations without skill:**

- Agent tries to retrofit mocks without understanding collector pattern
- Agent adds test-only methods to production code
- Agent doesn't refactor to use embedded collectors
- Agent creates inconsistent mock registration patterns
- Agent doesn't follow HTTP URL matching conventions (exact vs pattern)

### Scenario 3: Authority + Existing "Working" Code

**Setup:** Agent is told "The nuclei capability already has mocks that work - follow that pattern"
**Pressure:** Senior engineer expects consistency with existing code
**Twist:** Agent must discover the pattern by reading nuclei capability files

**Expected violations without skill:**

- Agent doesn't know to look for MockCollectors method in nuclei.go
- Agent doesn't find nuclei_mock.go file with constructors
- Agent doesn't understand the separation between main file and mock file
- Agent creates mocks in test file instead of dedicated mock file
- Agent doesn't follow helper function pattern for generating mock output

### Scenario 4: Exhaustion + Date Filtering Bug

**Setup:** Agent has implemented mocks but tests show empty graph. Debug for 20 minutes.
**Pressure:** Late in session, agent frustrated, wants quick fix
**Hidden issue:** Mock data dates are too old and filtered out

**Expected violations without skill:**

- Agent doesn't check date filtering in mock data
- Agent adds debug logging instead of fixing mock dates
- Agent suspects capability logic rather than mock data
- Agent doesn't understand 1-second timeout constraint
- Agent doesn't verify HTTP mock URL matching (exact vs pattern)

### Scenario 5: Multi-Collector Confusion

**Setup:** Capability needs CLI, HTTP, and DNS collectors with complex interactions
**Pressure:** "Make sure all three work together in tests"
**Complexity:** HTTP responses contain URLs that need DNS resolution

**Expected violations without skill:**

- Agent doesn't understand collector initialization order
- Agent doesn't properly separate collector constructors
- Agent creates interdependencies between mock collectors
- Agent doesn't follow naming convention: NewMock{Capability}CLICollector
- Agent doesn't implement MockCollectors method returning []xyz.XYZOption

## Success Criteria

**With skill present, agent should:**

1. Implement MockCollectors method in main capability file (between Match and Invoke)
2. Create separate mock file with proper naming: {capability}\_mock.go
3. Use correct mock registration methods:
   - CLICollector: MustRegisterCommand with regex
   - HTTPCollector: MustRegisterHTTP for exact URLs, MustRegisterHTTPPattern for patterns
   - DNSCollector: MustRegisterResolve / MustRegisterReverseLookup
4. Generate helper functions for mock output based on target properties
5. Ensure mock dates are recent (not filtered out)
6. Follow established file organization pattern from reference examples

## Testing Protocol

1. **Baseline (RED)**: Run each scenario WITHOUT skill loaded, document exact rationalizations
2. **With Skill (GREEN)**: Run same scenarios WITH skill, verify compliance
3. **Refactor**: Capture any new rationalizations and add explicit counters to skill
4. **Verification**: Re-run all scenarios to confirm loopholes closed
