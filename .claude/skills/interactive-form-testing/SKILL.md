---
name: interactive-form-testing
description: Use when testing React forms with file uploads, button states, and multi-step workflows - provides state transition patterns, prop verification, and interactive workflow testing to catch bugs that simple callback tests miss
---

# Interactive Form Testing Patterns

## Overview

Interactive forms have **state machines** that must be tested:
- Button states: disabled ↔ enabled
- Form states: pristine → dirty → submitting → success/error
- Upload states: empty → uploading → uploaded → error

**Common bug classes these patterns catch**:
1. Save button doesn't enable after upload (state transition bug)
2. Wrong parameters passed to callbacks (prop verification bug)
3. Wrong data fetched (API context bug)

## When to Use

Use this skill when testing:
- Forms with file uploads
- Forms with Save/Submit buttons
- Multi-step user workflows
- Components with conditional button states
- Upload → Save → Success patterns

## Testing Behavior, Not Implementation

**CRITICAL: Test user outcomes, not code internals**

### The Golden Rule

**Before writing ANY test**: "Does this test verify something the user sees or experiences?"
- YES → Proceed with test
- NO → Rewrite to test behavior

### Implementation vs Behavior

❌ **Implementation Testing** (provides false confidence):
```typescript
it('should call onUpload callback', () => {
  const mockOnUpload = vi.fn();
  render(<Form onUpload={mockOnUpload} />);

  user.upload(fileInput, file);

  expect(mockOnUpload).toHaveBeenCalled();
  // ❌ Only tests callback invoked
  // ❌ Doesn't verify UI updates, file displays, Save enables
  // ❌ Production can be broken while test passes
});
```

✅ **Behavior Testing** (catches real bugs):
```typescript
it('should enable Save after file upload and show preview', () => {
  render(<Form />);

  const saveButton = screen.getByText('Save');
  expect(saveButton).toBeDisabled(); // Initial state

  user.upload(fileInput, file);

  // Verify user-visible outcomes
  expect(saveButton).not.toBeDisabled(); // Save enabled
  expect(screen.getByRole('img')).toHaveAttribute('src', expect.stringContaining('file')); // Preview shows

  user.click(saveButton);
  expect(screen.getByText('Uploaded successfully')).toBeInTheDocument(); // Success message
});
```

**Why behavior testing matters**: Implementation tests verified callback invoked but missed that Save button never enabled. Users couldn't save. Test passed, feature broken.

**REQUIRED SKILL**: Use behavior-vs-implementation-testing skill for comprehensive guidance and session failure examples

---

## Core Patterns

### Pattern 1: State Transition Testing

Test all button state changes throughout the form lifecycle:

**Basic State Transition**:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';

describe('Form State Transitions', () => {
  it('should transition from disabled to enabled on input change', async () => {
    const user = userEvent.setup();
    renderWithProviders(<UserProfileForm />);

    const saveButton = screen.getByText('Save');

    // Initial state: button should be disabled
    expect(saveButton).toBeDisabled();

    // User action: change input
    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'John Doe');

    // Final state: button should be enabled
    expect(saveButton).not.toBeDisabled();
  });
});
```

**File Upload State Transition**:
```typescript
it('should enable Save button after file upload', async () => {
  const user = userEvent.setup();
  const mockOnUpload = vi.fn();

  renderWithProviders(
    <ProfilePictureForm onUpload={mockOnUpload} />
  );

  const saveButton = screen.getByText('Save');
  expect(saveButton).toBeDisabled();  // Initial state

  // Trigger file upload
  const file = new File(['test'], 'profile.png', { type: 'image/png' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(fileInput, file);

  // Wait for upload callback
  await waitFor(() => expect(mockOnUpload).toHaveBeenCalled());

  // Verify state transition: button should now be enabled
  expect(saveButton).not.toBeDisabled();
});
```

**Revert to Original State**:
```typescript
it('should disable Save when reverted to original value', async () => {
  const user = userEvent.setup();
  renderWithProviders(
    <UserProfileForm initialName="Original Name" />
  );

  const saveButton = screen.getByText('Save');
  const nameInput = screen.getByLabelText('Name');

  // Change value
  await user.clear(nameInput);
  await user.type(nameInput, 'New Name');
  expect(saveButton).not.toBeDisabled();

  // Revert to original
  await user.clear(nameInput);
  await user.type(nameInput, 'Original Name');

  // Button should be disabled again
  expect(saveButton).toBeDisabled();
});
```

### Pattern 2: Prop Parameter Verification

Always verify the exact parameters passed to callbacks:

**Basic Parameter Verification**:
```typescript
it('should pass exact form values to onSave callback', async () => {
  const user = userEvent.setup();
  const mockOnSave = vi.fn();

  renderWithProviders(
    <UserProfileForm onSave={mockOnSave} userId="user-123" />
  );

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.type(screen.getByLabelText('Email'), 'john@example.com');

  const saveButton = screen.getByText('Save');
  await user.click(saveButton);

  // Verify exact parameters
  expect(mockOnSave).toHaveBeenCalledWith({
    name: 'John Doe',
    email: 'john@example.com',
    userId: 'user-123',
  });

  // Verify call count
  expect(mockOnSave).toHaveBeenCalledTimes(1);
});
```

**File Upload Parameter Verification**:
```typescript
it('should pass correct file data and user context to upload callback', async () => {
  const user = userEvent.setup();
  const mockOnUpload = vi.fn();

  renderWithProviders(
    <ProfilePictureForm
      onUpload={mockOnUpload}
      userId="user-456"  // User context
      orgId="org-789"    // Should NOT be used
    />
  );

  const file = new File(['content'], 'avatar.png', { type: 'image/png' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(fileInput, file);

  await waitFor(() => {
    expect(mockOnUpload).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),  // File data
      'user-456'                // User context (NOT org-789)
    );
  });
});
```

**Context Verification**:
```typescript
it('should use correct API context (user vs organization)', async () => {
  const user = userEvent.setup();
  const mockUpdateUser = vi.fn();
  const mockUpdateOrg = vi.fn();

  // Mock the API hooks
  vi.mock('../hooks/useUpdateUser', () => ({
    useUpdateUser: () => ({
      mutate: mockUpdateUser,
    }),
  }));

  renderWithProviders(
    <UserSettingsForm userId="user-123" orgId="org-456" />
  );

  await user.type(screen.getByLabelText('Display Name'), 'New Name');
  await user.click(screen.getByText('Save'));

  // Should call user update, NOT organization update
  expect(mockUpdateUser).toHaveBeenCalledWith({
    displayName: 'New Name',
    userId: 'user-123',
  });
  expect(mockUpdateOrg).not.toHaveBeenCalled();
});
```

### Pattern 3: File Upload Workflows

Test complete upload workflows end-to-end:

**Complete Upload Workflow**:
```typescript
describe('Profile Picture Upload Workflow', () => {
  it('should complete full upload → enable → save → close workflow', async () => {
    const user = userEvent.setup();
    const mockOnUpload = vi.fn();
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    renderWithProviders(
      <ProfilePictureModal
        onUpload={mockOnUpload}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    // Step 1: Initial state
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
    expect(mockOnUpload).not.toHaveBeenCalled();

    // Step 2: Upload file
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    // Step 3: Verify upload callback with correct parameters
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(
        expect.any(ArrayBuffer)  // File content
      );
    });

    // Step 4: Verify button enabled after upload
    expect(saveButton).not.toBeDisabled();

    // Step 5: Click Save button
    await user.click(saveButton);

    // Step 6: Verify save callback
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    // Step 7: Verify modal closes after save
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
```

**Upload Error Handling**:
```typescript
it('should handle upload errors and keep button disabled', async () => {
  const user = userEvent.setup();
  const mockOnUpload = vi.fn().mockRejectedValue(new Error('Upload failed'));

  renderWithProviders(
    <ProfilePictureForm onUpload={mockOnUpload} />
  );

  const saveButton = screen.getByText('Save');
  expect(saveButton).toBeDisabled();

  // Upload file that will fail
  const file = new File(['content'], 'invalid.txt', { type: 'text/plain' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(fileInput, file);

  // Wait for error
  await waitFor(() => {
    expect(screen.getByText(/Upload failed/i)).toBeInTheDocument();
  });

  // Button should remain disabled after error
  expect(saveButton).toBeDisabled();
});
```

### Pattern 4: Multiple Change Types

Test that different types of changes are all tracked:

**Text OR File Changes**:
```typescript
describe('Multiple Change Type Detection', () => {
  it('should detect changes from text input alone', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileForm />);

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();

    // Change text field only
    await user.type(screen.getByLabelText('Name'), 'New Name');

    // Button should be enabled
    expect(saveButton).not.toBeDisabled();
  });

  it('should detect changes from file upload alone', async () => {
    const user = userEvent.setup();
    const mockOnUpload = vi.fn();

    renderWithProviders(
      <ProfileForm onUpload={mockOnUpload} />
    );

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();

    // Upload file only (no text changes)
    const file = new File(['test'], 'pic.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => expect(mockOnUpload).toHaveBeenCalled());

    // Button should be enabled from upload alone
    expect(saveButton).not.toBeDisabled();
  });

  it('should detect changes from both text AND file', async () => {
    const user = userEvent.setup();
    const mockOnUpload = vi.fn();

    renderWithProviders(
      <ProfileForm onUpload={mockOnUpload} />
    );

    const saveButton = screen.getByText('Save');

    // Change text
    await user.type(screen.getByLabelText('Name'), 'New Name');
    expect(saveButton).not.toBeDisabled();

    // Also upload file
    const file = new File(['test'], 'pic.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => expect(mockOnUpload).toHaveBeenCalled());

    // Button should still be enabled
    expect(saveButton).not.toBeDisabled();
  });
});
```

### Pattern 5: Loading and Submission States

Test the full form submission lifecycle:

**Submission States**:
```typescript
describe('Form Submission States', () => {
  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn().mockImplementation(() => {
      return new Promise(resolve => setTimeout(resolve, 100));
    });

    renderWithProviders(
      <ProfileForm onSave={mockOnSave} />
    );

    // Make a change
    await user.type(screen.getByLabelText('Name'), 'New Name');

    const saveButton = screen.getByText('Save');
    await user.click(saveButton);

    // Should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
  });

  it('should re-enable form after successful submission', async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn().mockResolvedValue({ success: true });

    renderWithProviders(
      <ProfileForm onSave={mockOnSave} />
    );

    await user.type(screen.getByLabelText('Name'), 'New Name');
    await user.click(screen.getByText('Save'));

    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Saved successfully')).toBeInTheDocument();
    });

    // Form should be re-enabled
    expect(screen.getByLabelText('Name')).not.toBeDisabled();
  });
});
```

## Real-World Bug Examples

### Bug: Save Button Disabled After Upload

**Symptom**: User uploads file, Save button stays disabled

**Root cause**: Form only tracked text field changes, not file upload changes

**Test that catches it**:
```typescript
it('should enable Save after upload (without text change)', async () => {
  const user = userEvent.setup();
  const mockOnUpload = vi.fn();

  renderWithProviders(
    <ProfileForm onUpload={mockOnUpload} />
  );

  const saveButton = screen.getByText('Save');
  expect(saveButton).toBeDisabled();

  // Upload file without changing text fields
  const file = new File(['test'], 'avatar.png', { type: 'image/png' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(fileInput, file);

  await waitFor(() => expect(mockOnUpload).toHaveBeenCalled());

  // This assertion catches the bug
  expect(saveButton).not.toBeDisabled();
});
```

**Fix**: Update form to track both text changes AND file uploads:
```typescript
const [hasChanges, setHasChanges] = useState(false);
const [hasUpload, setHasUpload] = useState(false);

const isDisabled = !hasChanges && !hasUpload;  // Either type of change enables Save
```

### Bug: Wrong Identifier Passed to Callback

**Symptom**: User profile upload uses organization S3 key instead of user S3 key

**Root cause**: Component passed wrong identifier to upload callback

**Test that catches it**:
```typescript
it('should pass user ID, not org ID', async () => {
  const user = userEvent.setup();
  const mockUpload = vi.fn();

  renderWithProviders(
    <UserProfilePicture
      onUpload={mockUpload}
      userId="user-123"
      orgId="org-456"
    />
  );

  const file = new File(['test'], 'avatar.png', { type: 'image/png' });
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  await user.upload(fileInput, file);

  await waitFor(() => {
    // This assertion catches the bug
    expect(mockUpload).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      'user-123'  // NOT 'org-456'
    );
  });
});
```

**Fix**: Use correct identifier in upload handler:
```typescript
const handleUpload = async (file: ArrayBuffer) => {
  await onUpload(file, userId);  // Use userId, not orgId
};
```

### Bug: Wrong API Context Used

**Symptom**: User settings form fetches organization data instead of user data

**Root cause**: Form used wrong React Query hook (useOrgMy instead of useMy)

**Test that catches it**:
```typescript
it('should fetch user data, not org data', async () => {
  const mockUseMy = vi.fn().mockReturnValue({
    data: { displayName: 'User Name' },
  });
  const mockUseOrgMy = vi.fn().mockReturnValue({
    data: { displayName: 'Org Name' },
  });

  vi.mock('../hooks/useMy', () => ({ useMy: mockUseMy }));
  vi.mock('../hooks/useOrgMy', () => ({ useOrgMy: mockUseOrgMy }));

  renderWithProviders(<UserSettingsForm />);

  // This assertion catches the bug
  expect(mockUseMy).toHaveBeenCalledWith({ resource: 'setting' });
  expect(mockUseOrgMy).not.toHaveBeenCalled();
});
```

**Fix**: Use correct hook:
```typescript
// Wrong
const { data } = useOrgMy({ resource: 'setting' });

// Correct
const { data } = useMy({ resource: 'setting' });
```

## Testing Checklist

When testing forms, ensure you have:

### State Transition Tests
- [ ] Initial button disabled state
- [ ] Button enabled after valid input
- [ ] Button disabled when reverted to original
- [ ] Button disabled during submission
- [ ] Button re-enabled after submission completes

### Parameter Verification Tests
- [ ] Exact callback parameters verified (use `toHaveBeenCalledWith`)
- [ ] Correct identifiers passed (user ID vs org ID)
- [ ] Correct data context used (user data vs org data)
- [ ] File data format verified (ArrayBuffer, Blob, etc.)

### Workflow Tests
- [ ] Complete upload → enable → save workflow
- [ ] Text change → enable → save workflow
- [ ] Revert → disable workflow
- [ ] Error → stay disabled workflow
- [ ] Loading state → completion workflow

### Edge Case Tests
- [ ] Multiple consecutive changes
- [ ] Rapid clicks on Save button
- [ ] Network errors during submission
- [ ] Invalid file types
- [ ] File size limits
- [ ] Concurrent form interactions

## Best Practices

### DO:
- ✅ Test button state at every step of the workflow
- ✅ Use `toHaveBeenCalledWith()` to verify exact parameters
- ✅ Test both text changes AND file uploads separately
- ✅ Test reverting changes disables the button
- ✅ Use `waitFor()` for async operations
- ✅ Test error states and loading states

### DON'T:
- ❌ Only verify callbacks were called (without parameters)
- ❌ Skip testing initial disabled state
- ❌ Assume file uploads work the same as text changes
- ❌ Forget to test reverting to original state
- ❌ Skip testing with different data contexts
- ❌ Only test the happy path

## Related Patterns

See also:
- `frontend-unit-test-engineer` agent for general unit testing patterns
- `frontend-integration-test-engineer` agent for API integration testing
- `frontend-component-test-engineer` agent for accessibility testing
- `react-testing` skill for comprehensive React testing patterns
