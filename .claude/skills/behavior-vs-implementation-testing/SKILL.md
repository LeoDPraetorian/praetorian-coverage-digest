---
name: behavior-vs-implementation-testing
description: Use when writing tests, reviewing test quality, or when tests pass but production is broken - distinguishes testing user-visible behavior from testing implementation details like mock calls or internal state, preventing false confidence from tests that verify mocks work instead of verifying features work
---

# Behavior vs Implementation Testing

## Overview

**Test what users see, not what mocks do.**

Tests must verify user-visible outcomes and API integration correctness, not just that internal functions were called.

**Core principle:** If a test only verifies mock behavior, it provides zero confidence about production.

## When to Use

Use when:
- Writing new tests
- Reviewing test PRs
- Tests pass but production broken
- Extensive mocking in tests
- Impersonation/context switching features
- Form submissions and workflows

**Especially when:**
- Test only checks `toHaveBeenCalled()`
- Test verifies internal state changes
- Production fails despite passing tests
- Users report bugs tests should have caught

## The Decision Tree

```
Is this test verifying:

├─ User-visible outcome?
│  └─ ✅ GOOD (behavior test)
│     Examples: Text appears, button enables, form submits, data persists
│
├─ API response correctness?
│  └─ ✅ GOOD (integration test)
│     Examples: Correct data returned, status codes, error handling
│
├─ Mock function was called?
│  └─ ❌ BAD (implementation test)
│     Fix: Test what happens AFTER the call (UI update, data change)
│
├─ Internal state changed?
│  └─ ❌ BAD (implementation test)
│     Fix: Test user-visible result of state change
│
└─ Function was invoked with params?
   └─ ⚠️ INSUFFICIENT (parameter verification without behavior)
      Fix: ALSO verify user-visible outcome
```

## Implementation vs Behavior Examples

### Example 1: Impersonation Feature

**❌ Implementation Testing** (What went wrong in session):
```typescript
it('should pass impersonated email to API', async () => {
  let capturedEmail: string | undefined;

  server.use(
    http.get('*/my', ({ request }) => {
      capturedEmail = request.headers.get('account');
      return HttpResponse.json({ count: 0, my: [] });
    })
  );

  render(<SettingsCards email="customer@example.com" />);

  expect(capturedEmail).toBe('customer@example.com');
  // ✅ Test passes - header forwarding works
  // ❌ Doesn't verify impersonation actually works for users
});
```

**Problem**: Tests that HTTP header forwarding works, not that impersonation works

**Production Reality**: Header forwarding worked, but:
- Wrong user data displayed (cache key didn't include email)
- Edit actions used wrong email (mutation context broken)
- Feature flags didn't respect impersonation

**Test gave FALSE CONFIDENCE**: Header mechanism worked, feature was broken

---

**✅ Behavior Testing** (What should have been tested):
```typescript
it('should display impersonated user settings, not admin settings', async () => {
  const customerSettings = {
    orgName: 'Customer Org',
    scanLevel: 'H', // Heavy scan for customer
    rateLimit: 10
  };

  server.use(
    http.get('*/my', ({ request }) => {
      const email = request.headers.get('account');

      if (email === 'customer@example.com') {
        return HttpResponse.json({
          count: 1,
          my: [{ name: 'org-name', value: customerSettings.orgName }]
        });
      }

      // Default admin data
      return HttpResponse.json({
        count: 1,
        my: [{ name: 'org-name', value: 'Admin Org' }]
      });
    })
  );

  render(<SettingsCards email="customer@example.com" />);

  // Test what USER SEES
  await waitFor(() => {
    expect(screen.getByText('Customer Org')).toBeInTheDocument();
  });

  // NOT admin data
  expect(screen.queryByText('Admin Org')).not.toBeInTheDocument();

  // Edit actions disabled for impersonation
  expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
});
```

**Why this is better**:
- Verifies user sees correct data
- Verifies edit actions properly disabled
- Would catch cache key issues
- Would catch mutation context issues
- Tests the actual feature, not just the mechanism

---

### Example 2: Form Submission

**❌ Implementation Testing**:
```typescript
it('should call onSubmit when Save clicked', async () => {
  const mockOnSubmit = vi.fn();

  render(<ProfileForm onSubmit={mockOnSubmit} />);

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByText('Save'));

  expect(mockOnSubmit).toHaveBeenCalled();
  // ✅ Test passes - callback invoked
  // ❌ Doesn't verify form actually submits or data saves
});
```

**Problem**: Only tests callback invoked, not that:
- Data actually saves to backend
- Success message shows to user
- Form resets or closes
- Loading state handled correctly

---

**✅ Behavior Testing**:
```typescript
it('should save profile and show success message', async () => {
  server.use(
    http.post('*/profile', async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({ success: true, name: body.name });
    })
  );

  render(<ProfileForm />);

  // User action
  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByText('Save'));

  // Verify user-visible outcome
  await waitFor(() => {
    expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
  });

  // Verify data persisted
  expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
});
```

**Why this is better**:
- Tests complete user workflow
- Verifies API integration works
- Verifies UI updates correctly
- Would catch broken API calls
- Would catch missing success messages

---

### Example 3: File Upload

**❌ Implementation Testing**:
```typescript
it('should call onUpload when file selected', async () => {
  const mockOnUpload = vi.fn();

  render(<ProfilePictureForm onUpload={mockOnUpload} />);

  await user.upload(fileInput, new File(['test'], 'pic.png'));

  expect(mockOnUpload).toHaveBeenCalled();
  // Only tests callback happened
});
```

---

**✅ Behavior Testing**:
```typescript
it('should upload picture, enable Save, and show preview', async () => {
  server.use(
    http.post('*/upload', async ({ request }) => {
      return HttpResponse.json({ url: 'https://cdn.example.com/pic.jpg' });
    })
  );

  render(<ProfilePictureForm />);

  const saveButton = screen.getByText('Save');
  expect(saveButton).toBeDisabled(); // Initial state

  // Upload file
  await user.upload(fileInput, new File(['test'], 'pic.png', { type: 'image/png' }));

  // Verify Save enabled
  await waitFor(() => {
    expect(saveButton).not.toBeDisabled();
  });

  // Verify preview shows
  const preview = await screen.findByRole('img', { name: /profile/i });
  expect(preview).toHaveAttribute('src', expect.stringContaining('pic.jpg'));
});
```

**Why this is better**:
- Tests complete workflow (upload → enable → preview)
- Verifies button state transitions
- Verifies preview displays
- Would catch state tracking bugs

---

## The Mandatory Question

**Before writing ANY test, ask:**

```
"Does this test verify something the user sees or experiences?"

YES → Good test, proceed
NO  → Bad test, rewrite to test behavior
```

## Quick Reference

| Test Type | What It Verifies | Value |
|-----------|------------------|-------|
| **Behavior** | User sees "Success message" | ✅ HIGH - Catches real bugs |
| **Behavior** | Data persists after save | ✅ HIGH - Verifies integration |
| **Behavior** | Button enables after input | ✅ HIGH - Tests user flow |
| **Implementation** | mockFn called | ❌ LOW - Mocks can lie |
| **Implementation** | Internal state = X | ❌ LOW - Users don't see state |
| **Implementation** | Function invoked | ❌ LOW - Doesn't test outcome |

## Common Violations

### Violation 1: Testing Only Header Passing

```typescript
// ❌ BAD
it('should pass customer email to API', () => {
  let email;
  server.use(http.get('*/api', ({ request }) => {
    email = request.headers.get('customer-email');
  }));

  render(<Component customerEmail="test@example.com" />);
  expect(email).toBe('test@example.com');
  // Tests mechanism, not feature
});

// ✅ GOOD
it('should display customer data when impersonating', () => {
  server.use(http.get('*/api', ({ request }) => {
    const email = request.headers.get('customer-email');
    if (email === 'test@example.com') {
      return HttpResponse.json({ name: 'Customer Inc' });
    }
    return HttpResponse.json({ name: 'Default Org' });
  }));

  render(<Component customerEmail="test@example.com" />);

  // Test what user SEES
  expect(screen.getByText('Customer Inc')).toBeInTheDocument();
  expect(screen.queryByText('Default Org')).not.toBeInTheDocument();
});
```

### Violation 2: Testing Only Callback Invocation

```typescript
// ❌ BAD
it('should call onSave', () => {
  const mock = vi.fn();
  render(<Form onSave={mock} />);
  user.click(saveButton);
  expect(mock).toHaveBeenCalled();
});

// ✅ GOOD
it('should save and show success', async () => {
  server.use(http.post('*/save', () => HttpResponse.json({ ok: true })));

  render(<Form />);
  await user.click(saveButton);

  expect(await screen.findByText('Saved!')).toBeInTheDocument();
});
```

### Violation 3: Testing State Without UI Verification

```typescript
// ❌ BAD
it('should set loading state', () => {
  render(<Component />);
  fireEvent.click(submitButton);
  expect(component.state.loading).toBe(true);
  // Tests internal state users don't see
});

// ✅ GOOD
it('should show loading indicator during submit', async () => {
  render(<Component />);
  await user.click(submitButton);

  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(submitButton).toBeDisabled();
});
```

## Real-World Impact

**From 22-hour test session:**

**Implementation tests written**:
- Verified email header forwarding (17 tests)
- Verified callbacks invoked (50+ tests)
- Verified mock setup worked (266 tests)

**Result**: Tests passed, production broken

**Behavior tests missing**:
- Did impersonated user data display?
- Did edit actions disable correctly?
- Did mutations use correct context?
- Did feature flags respect impersonation?

**Impact**: Production issues not caught by tests

**With behavior testing**:
- Would have caught cache key issues (wrong data displayed)
- Would have caught mutation context (wrong email used)
- Would have caught feature flag issues (not respecting impersonation)

**Time saved**: 22 hours debugging production vs catching in tests

## Integration with TDD

**TDD naturally prevents implementation testing:**

1. **Write test FIRST** (before implementation)
   - Forces you to think about what users experience
   - Can't test internal state that doesn't exist yet

2. **Watch it FAIL** (with no mocks)
   - Confirms test tests real behavior
   - Reveals what actually needs to happen

3. **Minimal implementation** (to pass)
   - Implements what test requires
   - No extra internals to accidentally test

**If you're testing mocks, you added them AFTER implementing** - violated TDD

## Red Flags - STOP and Rewrite

If you catch yourself:
- Only asserting on `toHaveBeenCalled()`
- Testing that state variable changed
- Verifying function invoked
- Checking mock received correct params WITHOUT checking outcome
- Test doesn't use screen.getBy* or screen.findBy*
- Test would pass if feature completely broken but mocks work

**ALL of these mean**: Rewrite to test behavior

## The Bottom Line

```
Tests must verify USER OUTCOMES, not CODE INTERNALS
```

**Ask yourself**: If this test passes, am I confident the feature works for users?

- YES → Good test
- NO → Implementation test, rewrite for behavior

**Session evidence**: 266 tests passed, production broken. Tests verified mocks, not features.
