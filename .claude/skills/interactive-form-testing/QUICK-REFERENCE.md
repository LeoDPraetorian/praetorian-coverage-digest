# Interactive Form Testing - Quick Reference

## The Three Critical Patterns

### 1. State Transition Testing

**Always test button states at EVERY step**:

```typescript
it('should enable Save after upload', async () => {
  expect(saveButton).toBeDisabled();  // ✅ Initial state
  await user.upload(fileInput, file);
  expect(saveButton).not.toBeDisabled();  // ✅ Final state
});
```

### 2. Prop Verification

**Always verify WHAT callbacks receive**:

```typescript
// ❌ WRONG: Only checks if called
expect(mockOnSave).toHaveBeenCalled();

// ✅ CORRECT: Verifies exact parameters
expect(mockOnSave).toHaveBeenCalledWith({
  name: 'John',
  userId: 'user-123',  // Verify correct ID
});
```

### 3. Multi-Step Workflows

**Test complete user journeys**:

```typescript
it('should complete upload → enable → save workflow', async () => {
  expect(saveButton).toBeDisabled();     // Step 1
  await user.upload(fileInput, file);     // Step 2
  expect(saveButton).not.toBeDisabled(); // Step 3
  await user.click(saveButton);           // Step 4
  expect(mockOnSave).toHaveBeenCalled(); // Step 5
});
```

## Checklist for Every Form Test

When testing ANY form component:

- [ ] Initial button disabled state
- [ ] Button enabled after valid change
- [ ] Button disabled when reverted
- [ ] Callback parameter verification (use `toHaveBeenCalledWith`)
- [ ] File upload state transition (if applicable)
- [ ] Complete workflow test

## Common Bug Patterns

### Bug: Button Won't Enable After Upload

**Cause**: Only tracking text changes, not file uploads

**Test**:
```typescript
it('should enable Save after upload alone', async () => {
  expect(saveButton).toBeDisabled();
  await user.upload(fileInput, file);
  expect(saveButton).not.toBeDisabled(); // Catches the bug
});
```

### Bug: Wrong Identifier Passed

**Cause**: Using wrong prop (orgId instead of userId)

**Test**:
```typescript
expect(mockUpload).toHaveBeenCalledWith(
  expect.any(ArrayBuffer),
  'user-123'  // NOT 'org-456'
);
```

### Bug: Wrong API Context

**Cause**: Using useOrgMy instead of useMy

**Test**:
```typescript
expect(mockUseMy).toHaveBeenCalled();
expect(mockUseOrgMy).not.toHaveBeenCalled();
```

## See Full Documentation

For comprehensive patterns and examples:
- **Agent**: `.claude/agents/testing/frontend-unit-test-engineer.md`
- **Skill**: `.claude/skills/interactive-form-testing/SKILL.md`
- **Coordinator**: `.claude/agents/orchestrator/test-coordinator.md`
