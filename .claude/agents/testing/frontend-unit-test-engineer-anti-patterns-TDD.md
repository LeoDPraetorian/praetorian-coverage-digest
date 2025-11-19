# TDD Validation: testing-anti-patterns → frontend-unit-test-engineer

**Date**: 2025-11-18
**Gap**: Unit test engineer tests mock behavior without recognizing anti-pattern
**Status**: RED-GREEN-REFACTOR cycle

---

## RED Phase: Baseline Without Skill Reference

**Scenario**: Write unit tests for SettingsPage with mocked ConfirmationModal, 30 min deadline

**Agent behavior WITHOUT testing-anti-patterns skill:**

### What Agent Created

✅ **Good practices**:
- Module-level mocking (`vi.mock`)
- Mock preserves interaction contract (onConfirm prop)
- User workflow testing (click → modal appears → confirm)
- Proper test structure with describe blocks

### Anti-Pattern #1 Violation: Testing Mock Behavior

**❌ Agent tested mock's data-testid**:
```typescript
it('should render modal after clicking Save button', async () => {
  await user.click(saveButton);
  expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument(); // ❌
});
```

**What's wrong**:
- Testing that mock's `data-testid="confirmation-modal"` exists
- Verifying mock rendered, not SettingsPage behavior
- Test passes if mock works, fails if mock breaks
- Tells us nothing about real component

**What should test instead**:
- If modal must be mocked: Test SettingsPage's state management (`showModal` flag)
- Or don't mock modal: Test complete workflow end-to-end
- Or test side effects: What happens after modal confirms?

### Agent's Rationalization (Implicit)

Agent said:
> "The modal is complex and has API calls, so you want to mock it"

**Rationalization captured**:
- "Modal is complex" → Must mock
- "Mock the behavior" → Test mock behavior
- Didn't question if mocking was necessary

**Missing question**: "Should I mock at all, or test the real modal?"

### Critical Gap

**❌ NEVER mentioned testing-anti-patterns skill**

Agent referenced:
- ❌ No mention of anti-patterns
- ❌ No questioning if testing mock is wrong
- ❌ No awareness of "test real behavior not mock behavior"

**Pattern**: Agent follows instructions ("mock the modal") without questioning if it leads to testing mock behavior.

---

## What Agent SHOULD Have Caught

**testing-anti-patterns skill Anti-Pattern #1**:
> "Testing Mock Behavior - Are we testing the behavior of a mock?"

**Gate function agent should use**:
```
BEFORE asserting on any mock element:
  Ask: "Am I testing real component behavior or just mock existence?"

  IF testing mock existence:
    STOP - Delete the assertion or unmock the component
```

**In this case**:
- `expect(screen.getByTestId('confirmation-modal'))` ← This is mock's testid
- Question: "Am I testing real component behavior?"
- Answer: NO - testing mock's presence
- Action: Either unmock or test different behavior

---

## Correct Approaches (What Skill Would Suggest)

### Option 1: Don't Mock (Preferred)
```typescript
// Test real ConfirmationModal integration
it('should show confirmation and save on confirm', async () => {
  render(<SettingsPage />);

  await user.click(screen.getByRole('button', { name: /save/i }));

  // Test real modal content
  expect(screen.getByText('Are you sure?')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /confirm/i }));

  // Verify save happened (API call, state change, etc.)
  await waitFor(() => {
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });
});
```

### Option 2: If Must Mock, Test Different Behavior
```typescript
// Don't test mock's testid, test SettingsPage's state
it('should manage modal visibility state', async () => {
  const { rerender } = render(<SettingsPage />);

  // Verify initial state (showModal=false)
  // Not by checking mock presence, but by checking
  // SettingsPage's behavior when showModal changes

  await user.click(screen.getByRole('button', { name: /save/i }));

  // Verify callback was passed correctly
  const { ConfirmationModal } = await import('./ConfirmationModal');
  expect(ConfirmationModal).toHaveBeenCalledWith(
    expect.objectContaining({ onConfirm: expect.any(Function) }),
    expect.anything()
  );
});
```

### Option 3: Test Side Effects, Not Mock Presence
```typescript
// Test what happens AFTER modal interaction
it('should save settings when modal confirms', async () => {
  const mockSaveApi = vi.fn();

  render(<SettingsPage />);

  await user.click(screen.getByRole('button', { name: /save/i }));
  await user.click(screen.getByTestId('modal-confirm-button'));

  // Test BEHAVIOR: API called, toast shown, navigation occurred
  expect(mockSaveApi).toHaveBeenCalledWith(/* correct params */);
  expect(screen.getByText('Saved!')).toBeInTheDocument();
});
```

---

## GREEN Phase: Add Skill Reference to Agent

**Minimal fix needed**: Add testing-anti-patterns to REQUIRED SKILLS

**Where to add**: In "Before Creating Any Tests" section or new section after BOI

### Proposed Addition

```markdown
## MANDATORY: Avoid Testing Anti-Patterns

**Before writing mocks or assertions:**

🚨 **Use testing-anti-patterns skill to avoid common testing mistakes**

**The Iron Laws**:
1. NEVER test mock behavior (test real component behavior)
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding dependencies

**The Gate Question** (before asserting on mocks):
"Am I testing real component behavior or just mock existence?"
- Real behavior → Proceed
- Mock existence → STOP, delete assertion or unmock

**Common anti-patterns to avoid**:
- Testing `data-testid` of mocked components (Anti-Pattern #1)
- Mocking components that don't need mocking
- Testing that mocks were called without verifying user outcome
- Adding test helpers to production code

**No exceptions:**
- Not when "user said to mock it" (question if mocking is needed)
- Not when "mock is easier" (easier ≠ better test)
- Not when "time pressure" (anti-patterns create technical debt)

**Why:** Testing mocks creates false confidence. Tests pass, mocks work, production broken.
```

---

## Expected GREEN Phase Behavior

**Re-test same scenario**: "Write unit tests for SettingsPage, mock the modal"

**Agent WITH skill should**:
- Question if mocking is necessary
- If mocks, ask: "Am I testing mock or real behavior?"
- Catch `expect(screen.getByTestId('confirmation-modal'))` as anti-pattern
- Reference testing-anti-patterns skill explicitly

**Result**: Either no mock (test real modal) or tests side effects not mock presence.

---

## REFACTOR Phase: Planned Pressure Tests

### Pressure Test 1: User Explicitly Requests Mock

**Prompt**: "Please mock the ConfirmationModal and verify it renders"

**Agent might follow blindly**: "User said to verify modal renders, so..."

**Skill counter**:
> "Am I testing real component behavior or just mock existence?"
> Answer: Mock existence → STOP

### Pressure Test 2: Time Pressure

**Prompt**: "Quick test for SettingsPage, just mock the modal to save time"

**Agent might rationalize**: "Mocking is faster..."

**Skill counter**:
> Not when "mock is easier" - Testing mock behavior creates false confidence.

---

## Validation Criteria

**RED phase complete**: ✅
- Agent tested mock's data-testid (Anti-Pattern #1)
- Agent did NOT mention testing-anti-patterns skill
- Agent didn't question if testing mock behavior
- Evidence documented

**GREEN phase pending**:
- Add skill reference to agent
- Re-test same scenario
- Verify agent catches anti-pattern
- Verify agent questions approach

**REFACTOR phase complete**: ✅
- Tested when user explicitly demands mock assertion ("verify modal is rendered")
- Agent pushed back: "I need to push back on this request"
- Agent used gate question: "Am I testing MY code's behavior or framework/mock?"
- Agent referenced testing-anti-patterns skill explicitly
- Agent said: "This is a critical testing anti-pattern"
- Provided alternative: Test real component with real behavior
- Resisted authority + deadline pressure (EOD)
- No new loopholes - PASS

**Validation complete**: Skill provides pushback capability even when user explicitly requests anti-pattern ✅

---

**Key Insight**: Agent creates technically correct mocks but tests the mocks instead of behavior. Skill provides gate function to catch this before writing assertion.

**After REFACTOR**: Agent now questions mock testing requests, uses gate function, and provides better alternatives even under authority/deadline pressure.
