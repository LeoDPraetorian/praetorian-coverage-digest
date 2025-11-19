# Interactive Form Testing Architecture

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Test Coordinator Agent                       │
│  (Orchestrates test generation for new features)                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Spawns agents based on component type
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌───────────────────────────┐  ┌──────────────────────────────┐
│ Frontend Unit Test         │  │ Other Testing Agents         │
│ Engineer Agent             │  │ (integration, E2E, etc.)     │
│                            │  └──────────────────────────────┘
│ References:                │
│ - State transition patterns│
│ - Prop verification rules  │
│ - Workflow test checklist  │
└────────────┬───────────────┘
             │
             │ Uses for detailed patterns
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Interactive Form Testing Skill                      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Pattern 1   │  │  Pattern 2   │  │  Pattern 3   │         │
│  │    State     │  │    Prop      │  │    Multi-    │         │
│  │ Transitions  │  │Verification  │  │  Step Flow   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │         Real-World Bug Examples                   │           │
│  │  - Button disabled after upload                   │           │
│  │  - Wrong identifier passed                        │           │
│  │  - Wrong API context used                         │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Information Flow

```
1. Developer implements form component (e.g., UserProfileModal.tsx)
                        │
                        ▼
2. Test Coordinator analyzes component
   - Has form? ✓
   - Has file upload? ✓
   - Has Save button? ✓
                        │
                        ▼
3. Coordinator spawns frontend-unit-test-engineer
   with interactive-form-testing skill
                        │
                        ▼
4. Agent generates tests using patterns from skill:
   ├─ Initial button disabled
   ├─ Upload → button enabled
   ├─ Exact parameter verification
   ├─ Complete workflow
   └─ Context verification
                        │
                        ▼
5. Generated tests catch bugs before manual testing
```

## Pattern Application Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Form Component Analysis                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   Has Submit Button?    │
              └──────────┬──────────────┘
                         │ YES
                         ▼
              ┌─────────────────────────┐
              │ Apply Pattern 1:        │
              │ State Transition Tests  │
              │ - Initial disabled      │
              │ - Enabled after change  │
              │ - Disabled when reverted│
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   Has Callbacks?        │
              └──────────┬──────────────┘
                         │ YES
                         ▼
              ┌─────────────────────────┐
              │ Apply Pattern 2:        │
              │ Prop Verification       │
              │ - Use toHaveBeenCalled  │
              │   With()                │
              │ - Verify exact params   │
              │ - Verify correct IDs    │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │   Has File Upload?      │
              └──────────┬──────────────┘
                         │ YES
                         ▼
              ┌─────────────────────────┐
              │ Apply Pattern 3:        │
              │ Multi-Step Workflow     │
              │ - Upload step           │
              │ - Enable step           │
              │ - Save step             │
              │ - Close step            │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │ Apply Pattern 4:        │
              │ Multiple Change Types   │
              │ - Text changes alone    │
              │ - Upload changes alone  │
              │ - Both together         │
              └──────────┬──────────────┘
                         │
                         ▼
              ┌─────────────────────────┐
              │ Apply Pattern 5:        │
              │ Loading States          │
              │ - During submission     │
              │ - Error handling        │
              │ - Success state         │
              └─────────────────────────┘
```

## Bug Prevention Matrix

```
┌───────────────────────────────────────────────────────────────────┐
│                         Bug Class                                  │
├────────────────┬──────────────────────┬────────────────────────────┤
│ State          │ Pattern 1            │ Test button state at       │
│ Transition     │ State Transitions    │ every step                 │
│ Bugs           │                      │                            │
├────────────────┼──────────────────────┼────────────────────────────┤
│ Prop           │ Pattern 2            │ Use toHaveBeenCalledWith   │
│ Verification   │ Prop Verification    │ with exact values          │
│ Bugs           │                      │                            │
├────────────────┼──────────────────────┼────────────────────────────┤
│ API Context    │ Pattern 2 + 3        │ Verify correct hooks and   │
│ Bugs           │ Verification +       │ identifiers used           │
│                │ Workflow             │                            │
└────────────────┴──────────────────────┴────────────────────────────┘
```

## Test Coverage Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     Form Component Tests                         │
│                                                                   │
│  Layer 1: State Management                                       │
│  ├─ Initial state (disabled)                                     │
│  ├─ Changed state (enabled)                                      │
│  ├─ Reverted state (disabled)                                    │
│  └─ Loading state (disabled)                                     │
│                                                                   │
│  Layer 2: User Interactions                                      │
│  ├─ Text input changes                                           │
│  ├─ File uploads                                                 │
│  ├─ Button clicks                                                │
│  └─ Form resets                                                  │
│                                                                   │
│  Layer 3: Callback Verification                                  │
│  ├─ Correct parameters                                           │
│  ├─ Correct identifiers                                          │
│  ├─ Correct data context                                         │
│  └─ Call count verification                                      │
│                                                                   │
│  Layer 4: Workflows                                              │
│  ├─ Upload → Enable → Save                                       │
│  ├─ Change → Enable → Revert                                     │
│  ├─ Error → Stay Disabled                                        │
│  └─ Loading → Completion                                         │
│                                                                   │
│  Layer 5: Edge Cases                                             │
│  ├─ Multiple consecutive changes                                 │
│  ├─ Rapid clicks                                                 │
│  ├─ Network errors                                               │
│  └─ Invalid inputs                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Decision Tree

```
Test Coordinator receives form component
    │
    ├─ Has form elements? ───────── NO ──→ Use standard unit test agent
    │
    │ YES
    │
    ├─ Has submit/save button? ──── NO ──→ Use standard component test agent
    │
    │ YES
    │
    ├─ Has file upload? ────────────┐
    │                                │ YES
    │ NO                             │
    │                                ▼
    │                    ┌───────────────────────────┐
    │                    │ Spawn frontend-unit-test- │
    │                    │ engineer WITH             │
    │                    │ interactive-form-testing  │
    │                    │ skill                     │
    │                    │                           │
    │                    │ Patterns: 1,2,3,4,5       │
    │                    └───────────────────────────┘
    │
    ▼
┌───────────────────────────┐
│ Spawn frontend-unit-test- │
│ engineer WITH             │
│ interactive-form-testing  │
│ skill                     │
│                           │
│ Patterns: 1,2,4,5         │
│ (skip Pattern 3 - upload) │
└───────────────────────────┘
```

## File Organization

```
.claude/
├── agents/
│   ├── testing/
│   │   └── frontend-unit-test-engineer.md  ← Updated with patterns
│   └── orchestrator/
│       └── test-coordinator.md             ← Updated with requirements
│
├── skills/
│   └── interactive-form-testing/           ← NEW SKILL
│       ├── SKILL.md                        ← Full documentation
│       ├── QUICK-REFERENCE.md              ← Developer quick guide
│       └── ARCHITECTURE.md                 ← This file

INTERACTIVE-FORM-TESTING-IMPLEMENTATION.md  ← Implementation summary
```

## Usage Example: UserProfileModal

```
Component: UserProfileModal.tsx
Features: Display name input, profile picture upload, Save button

Test Coordinator Analysis:
├─ Has form? YES
├─ Has submit button? YES (Save)
└─ Has file upload? YES (profile picture)

Decision: Use frontend-unit-test-engineer with interactive-form-testing skill

Generated Tests:
├─ State Transitions (Pattern 1)
│   ├─ Initial Save disabled
│   ├─ Save enabled after name change
│   ├─ Save enabled after picture upload
│   └─ Save disabled when reverted
│
├─ Prop Verification (Pattern 2)
│   ├─ onSave called with correct displayName
│   ├─ onUpload called with userId (NOT orgId)
│   └─ Correct S3 key used (user context)
│
├─ Upload Workflow (Pattern 3)
│   ├─ Upload picture
│   ├─ Verify button enabled
│   ├─ Click Save
│   └─ Verify modal closes
│
├─ Multiple Changes (Pattern 4)
│   ├─ Name change alone enables Save
│   ├─ Picture upload alone enables Save
│   └─ Both together enable Save
│
└─ Loading States (Pattern 5)
    ├─ Shows "Saving..." during submit
    ├─ Disables form during submit
    └─ Re-enables after completion

Result: All three bug classes prevented by comprehensive tests
```

## Benefits by Role

### For AI Agents
- Clear patterns to apply automatically
- Comprehensive examples to reference
- Checklist to ensure coverage

### For Developers
- Quick reference guide for manual testing
- Pattern library for new components
- Bug examples for understanding root causes

### For Reviewers
- Checklist to verify test coverage
- Patterns to look for in PRs
- Red flags if patterns missing

### For QA Engineers
- Understanding of what's already tested
- Focus manual testing on uncovered areas
- Confidence in automated test coverage

## Maintenance

### Adding New Patterns
1. Document bug class in SKILL.md
2. Add pattern with examples
3. Update agent checklist
4. Update coordinator requirements

### Updating Existing Patterns
1. Add new examples to SKILL.md
2. Update QUICK-REFERENCE.md if pattern changes
3. Verify agents still reference correctly
4. Test with real component

### Deprecating Patterns
1. Mark as deprecated in SKILL.md
2. Add migration guide to new pattern
3. Update agent to use new pattern
4. Remove from coordinator after migration period
