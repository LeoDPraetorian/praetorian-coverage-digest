# Few-Shot Patterns for Orchestration

Concrete examples that agents can follow. Include 2-3 examples per pattern.

## Developer Agent: TDD Pattern

Include this block in developer prompts:

````markdown
## TDD Pattern (Follow These Examples)

### Example 1: Simple Function

**Task**: Add function to validate email format

**Step 1 - Write failing test first**:

```typescript
// tests/validators.test.ts
describe("validateEmail", () => {
  it("returns true for valid email", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("returns false for missing @", () => {
    expect(validateEmail("userexample.com")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(validateEmail("")).toBe(false);
  });
});
```
````

**Step 2 - Run test, verify it fails for the RIGHT reason**:

```
FAIL  tests/validators.test.ts
  ● validateEmail › returns true for valid email
    ReferenceError: validateEmail is not defined
```

✓ Correct failure - function doesn't exist yet

**Step 3 - Write minimal code to pass**:

```typescript
// src/validators.ts
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

**Step 4 - Run test, verify it passes**:

```
PASS  tests/validators.test.ts
  ✓ validateEmail › returns true for valid email (2ms)
  ✓ validateEmail › returns false for missing @ (1ms)
  ✓ validateEmail › returns false for empty string (1ms)
```

### Example 2: React Component with State

**Task**: Add toggle button that tracks enabled/disabled state

**Step 1 - Write failing test first**:

```typescript
// ToggleButton.test.tsx
describe('ToggleButton', () => {
  it('renders with initial disabled state', () => {
    render(<ToggleButton />);
    expect(screen.getByRole('button')).toHaveTextContent('Enable');
  });

  it('toggles to enabled when clicked', async () => {
    render(<ToggleButton />);
    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('Disable');
  });

  it('calls onChange with new state', async () => {
    const onChange = vi.fn();
    render(<ToggleButton onChange={onChange} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
```

**Step 2 - Verify failure**:

```
FAIL  ToggleButton.test.tsx
  ● ToggleButton › renders with initial disabled state
    Error: Unable to find role="button"
```

✓ Correct - component doesn't exist

**Step 3 - Minimal implementation**:

```typescript
// ToggleButton.tsx
interface ToggleButtonProps {
  onChange?: (enabled: boolean) => void;
}

export function ToggleButton({ onChange }: ToggleButtonProps) {
  const [enabled, setEnabled] = useState(false);

  const handleClick = () => {
    const newState = !enabled;
    setEnabled(newState);
    onChange?.(newState);
  };

  return (
    <button onClick={handleClick}>
      {enabled ? 'Disable' : 'Enable'}
    </button>
  );
}
```

**Step 4 - Verify pass**: All tests green ✓

---

**Now apply this exact pattern to your task. Do not skip steps.**

````

## Tester Agent: Test Case Pattern

Include this block in tester prompts:

```markdown
## Test Case Construction Pattern

### Example 1: API Endpoint Tests

**Feature**: GET /api/users/:id endpoint

**Test categories to cover**:

1. **Happy path**: Valid request returns expected data
2. **Edge cases**: Boundary values, empty states
3. **Error cases**: Invalid input, missing resources, auth failures
4. **Integration**: Actual service interactions (if integration test)

```typescript
describe('GET /api/users/:id', () => {
  // Happy path
  describe('when user exists', () => {
    it('returns 200 with user data', async () => {
      const response = await request(app).get('/api/users/123');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: '123',
        email: expect.any(String),
      });
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('handles UUID format IDs', async () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const response = await request(app).get(`/api/users/${uuid}`);
      expect(response.status).toBe(200);
    });
  });

  // Error cases
  describe('when user does not exist', () => {
    it('returns 404 with error message', async () => {
      const response = await request(app).get('/api/users/nonexistent');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('when not authenticated', () => {
    it('returns 401', async () => {
      const response = await request(app)
        .get('/api/users/123')
        .set('Authorization', ''); // No token
      expect(response.status).toBe(401);
    });
  });
});
````

### Example 2: Component Behavior Tests

**Feature**: SearchInput component with debounced search

```typescript
describe('SearchInput', () => {
  // Happy path
  it('calls onSearch after debounce delay', async () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} debounceMs={300} />);

    await userEvent.type(screen.getByRole('textbox'), 'query');

    // Should NOT call immediately
    expect(onSearch).not.toHaveBeenCalled();

    // Should call after debounce
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('query');
    }, { timeout: 400 });
  });

  // Edge cases
  it('cancels pending search on new input', async () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} debounceMs={300} />);

    await userEvent.type(screen.getByRole('textbox'), 'first');
    await userEvent.clear(screen.getByRole('textbox'));
    await userEvent.type(screen.getByRole('textbox'), 'second');

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('second');
    }, { timeout: 400 });
  });

  // Error handling
  it('handles empty input gracefully', async () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} debounceMs={300} />);

    await userEvent.type(screen.getByRole('textbox'), '   ');

    await waitFor(() => {
      expect(onSearch).not.toHaveBeenCalled();
    }, { timeout: 400 });
  });
});
```

---

**Apply this structure: Happy path → Edge cases → Error cases**

````

## Research Agent: Source Analysis Pattern

Include this block in research agent prompts:

```markdown
## Source Analysis Pattern

### Example: Analyzing a GitHub Repository

**Source**: github.com/example/auth-library

**Step 1 - Identify what to extract**:
- Primary pattern used
- Key implementation decisions
- Trade-offs acknowledged
- Community adoption signals

**Step 2 - Structured analysis**:
```json
{
  "source": "github.com/example/auth-library",
  "pattern_identified": "JWT with refresh token rotation",
  "key_decisions": [
    "Uses short-lived access tokens (15 min)",
    "Refresh tokens stored in httpOnly cookies",
    "Implements token family tracking for rotation"
  ],
  "trade_offs_noted": [
    "More complex than simple JWT",
    "Requires server-side refresh token storage"
  ],
  "adoption_signals": {
    "stars": 5200,
    "last_commit": "2025-12-01",
    "open_issues": 23,
    "used_by": 450
  },
  "relevance_to_query": 0.9,
  "limitations": "Focused on Node.js, patterns may differ for other runtimes"
}
````

**Step 3 - Extract key finding**:
"JWT refresh token rotation with family tracking (github.com/example/auth-library, 5.2K stars) - uses 15-min access tokens with httpOnly cookie storage"

---

**Follow this pattern for each source you analyze.**

```

```
