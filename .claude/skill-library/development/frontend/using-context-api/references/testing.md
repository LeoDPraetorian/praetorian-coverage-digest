# Testing Context

**Comprehensive testing strategies for React Context providers and consumers.**

## Testing Philosophy

**Test behavior, not implementation details:**

- ✅ Test that consumers receive correct values
- ✅ Test that actions update state correctly
- ✅ Test error handling (missing provider)
- ❌ Don't test internal Context mechanics
- ❌ Don't test React's Context implementation

## Setup: Testing Utilities

### Custom Render with Provider

```tsx
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { ThemeProvider } from './ThemeContext';

type CustomRenderOptions = RenderOptions & {
  initialTheme?: 'light' | 'dark';
};

function customRender(
  ui: ReactElement,
  { initialTheme = 'light', ...options }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
```

**Usage:**

```tsx
import { render, screen } from './test-utils';

test('renders with theme', () => {
  render(<ThemedButton />, { initialTheme: 'dark' });
  expect(screen.getByRole('button')).toHaveClass('dark');
});
```

### Testing Context Hook Directly

```tsx
import { renderHook } from '@testing-library/react';
import { ReactNode } from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';

test('useTheme returns theme value', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  const { result } = renderHook(() => useTheme(), { wrapper });

  expect(result.current.theme).toBe('light');
});
```

## Testing Provider

### Test Initial State

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

test('provides initial theme', () => {
  function TestComponent() {
    const { theme } = useTheme();
    return <div>Theme: {theme}</div>;
  }

  render(
    <ThemeProvider>
      <TestComponent />
    </ThemeProvider>
  );

  expect(screen.getByText('Theme: light')).toBeInTheDocument();
});
```

### Test State Updates

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeContext';

test('toggles theme when action is called', async () => {
  const user = userEvent.setup();

  function TestComponent() {
    const { theme, toggleTheme } = useTheme();
    return (
      <div>
        <div>Theme: {theme}</div>
        <button onClick={toggleTheme}>Toggle</button>
      </div>
    );
  }

  render(
    <ThemeProvider>
      <TestComponent />
    </ThemeProvider>
  );

  expect(screen.getByText('Theme: light')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /toggle/i }));

  expect(screen.getByText('Theme: dark')).toBeInTheDocument();
});
```

### Test with Initial Props

```tsx
test('uses initial theme from props', () => {
  function TestComponent() {
    const { theme } = useTheme();
    return <div>Theme: {theme}</div>;
  }

  render(
    <ThemeProvider initialTheme="dark">
      <TestComponent />
    </ThemeProvider>
  );

  expect(screen.getByText('Theme: dark')).toBeInTheDocument();
});
```

## Testing Consumer Components

### Test Component Receives Context

```tsx
import { render, screen } from './test-utils';
import { ThemedButton } from './ThemedButton';

test('button receives theme from context', () => {
  render(<ThemedButton />, { initialTheme: 'dark' });

  const button = screen.getByRole('button');
  expect(button).toHaveClass('dark');
});
```

### Test Component Updates on Context Change

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from './ThemeContext';
import { ThemedButton } from './ThemedButton';

test('button updates when theme changes', async () => {
  const user = userEvent.setup();

  function TestApp() {
    return (
      <ThemeProvider>
        <ThemedButton>Themed</ThemedButton>
        <button onClick={() => toggleTheme()}>Toggle Theme</button>
      </ThemeProvider>
    );
  }

  render(<TestApp />);

  const themedButton = screen.getByRole('button', { name: /themed/i });
  expect(themedButton).toHaveClass('light');

  await user.click(screen.getByRole('button', { name: /toggle/i }));

  expect(themedButton).toHaveClass('dark');
});
```

## Testing Custom Hooks

### Test Hook Returns Correct Value

```tsx
import { renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

test('useTheme returns theme and toggleTheme', () => {
  const wrapper = ({ children }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  const { result } = renderHook(() => useTheme(), { wrapper });

  expect(result.current.theme).toBe('light');
  expect(typeof result.current.toggleTheme).toBe('function');
});
```

### Test Hook Updates

```tsx
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

test('useTheme toggles theme', () => {
  const wrapper = ({ children }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  const { result } = renderHook(() => useTheme(), { wrapper });

  expect(result.current.theme).toBe('light');

  act(() => {
    result.current.toggleTheme();
  });

  expect(result.current.theme).toBe('dark');
});
```

### Test Hook Throws Without Provider

```tsx
import { renderHook } from '@testing-library/react';
import { useTheme } from './ThemeContext';

test('useTheme throws error without provider', () => {
  // Suppress console.error for this test
  const spy = jest.spyOn(console, 'error').mockImplementation();

  const { result } = renderHook(() => useTheme());

  expect(result.error).toEqual(
    Error('useTheme must be used within ThemeProvider')
  );

  spy.mockRestore();
});
```

## Testing Async Context

### Test Loading State

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { UserProvider, useUser } from './UserContext';

test('shows loading state while fetching user', async () => {
  function TestComponent() {
    const { user, fetchUser } = useUser();

    useEffect(() => {
      fetchUser('123');
    }, [fetchUser]);

    if (user.loading) return <div>Loading...</div>;
    if (user.error) return <div>Error: {user.error.message}</div>;
    if (user.data) return <div>User: {user.data.name}</div>;
    return null;
  }

  render(
    <UserProvider>
      <TestComponent />
    </UserProvider>
  );

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText(/User:/)).toBeInTheDocument();
  });
});
```

### Test Error State

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { UserProvider, useUser } from './UserContext';
import { server } from './mocks/server';
import { rest } from 'msw';

test('shows error when fetch fails', async () => {
  // Mock API error
  server.use(
    rest.get('/api/users/:id', (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({ message: 'Server error' }));
    })
  );

  function TestComponent() {
    const { user, fetchUser } = useUser();

    useEffect(() => {
      fetchUser('123');
    }, [fetchUser]);

    if (user.error) return <div>Error: {user.error.message}</div>;
    return <div>User: {user.data?.name}</div>;
  }

  render(
    <UserProvider>
      <TestComponent />
    </UserProvider>
  );

  await waitFor(() => {
    expect(screen.getByText(/Error:/)).toBeInTheDocument();
  });
});
```

## Testing with Multiple Contexts

### Test Nested Contexts

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from './ThemeContext';
import { UserProvider } from './UserContext';
import { App } from './App';

test('app works with multiple contexts', () => {
  render(
    <ThemeProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </ThemeProvider>
  );

  expect(screen.getByRole('main')).toBeInTheDocument();
});
```

### Test Context Interaction

```tsx
test('user profile uses theme from context', () => {
  const mockUser = { id: '1', name: 'Alice' };

  render(
    <ThemeProvider initialTheme="dark">
      <UserProvider initialUser={mockUser}>
        <UserProfile />
      </UserProvider>
    </ThemeProvider>
  );

  const profile = screen.getByTestId('user-profile');
  expect(profile).toHaveClass('dark');
  expect(profile).toHaveTextContent('Alice');
});
```

## Mocking Context for Tests

### Mock Provider for Isolated Tests

```tsx
import { createContext, useContext } from 'react';

// Real context
export const UserContext = createContext<UserContextType | undefined>(undefined);

// Mock provider for tests
export function MockUserProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: UserContextType;
}) {
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// Usage in tests
test('renders user profile', () => {
  const mockValue = {
    user: { id: '1', name: 'Alice' },
    login: jest.fn(),
    logout: jest.fn(),
  };

  render(
    <MockUserProvider value={mockValue}>
      <UserProfile />
    </MockUserProvider>
  );

  expect(screen.getByText('Alice')).toBeInTheDocument();
});
```

### Mock Context Value

```tsx
import { useUser } from './UserContext';

jest.mock('./UserContext', () => ({
  useUser: jest.fn(),
}));

test('renders with mocked context', () => {
  (useUser as jest.Mock).mockReturnValue({
    user: { id: '1', name: 'Alice' },
    login: jest.fn(),
    logout: jest.fn(),
  });

  render(<UserProfile />);

  expect(screen.getByText('Alice')).toBeInTheDocument();
});
```

## Testing Performance

### Test Re-render Count

```tsx
import { render } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

test('consumer re-renders only when context changes', () => {
  let renderCount = 0;

  function Consumer() {
    const { theme } = useTheme();
    renderCount++;
    return <div>{theme}</div>;
  }

  const { rerender } = render(
    <ThemeProvider>
      <Consumer />
    </ThemeProvider>
  );

  expect(renderCount).toBe(1);

  // Re-render provider with same value
  rerender(
    <ThemeProvider>
      <Consumer />
    </ThemeProvider>
  );

  // Should not re-render consumer (if properly memoized)
  expect(renderCount).toBe(1);
});
```

### Test Memoization

```tsx
test('context value is memoized', () => {
  const valueRefs: any[] = [];

  function Consumer() {
    const value = useTheme();
    valueRefs.push(value);
    return null;
  }

  const { rerender } = render(
    <ThemeProvider>
      <Consumer />
    </ThemeProvider>
  );

  rerender(
    <ThemeProvider>
      <Consumer />
    </ThemeProvider>
  );

  // Value reference should be the same
  expect(valueRefs[0]).toBe(valueRefs[1]);
});
```

## Integration Tests

### Test Full User Flow

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from './AuthContext';
import { App } from './App';

test('user can log in and see protected content', async () => {
  const user = userEvent.setup();

  render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );

  // Initially not authenticated
  expect(screen.getByText('Login')).toBeInTheDocument();

  // Fill login form
  await user.type(screen.getByLabelText('Email'), 'alice@example.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.click(screen.getByRole('button', { name: /login/i }));

  // After login
  await waitFor(() => {
    expect(screen.getByText('Welcome, Alice')).toBeInTheDocument();
  });
});
```

## Snapshot Testing

### Snapshot Provider Structure

```tsx
import { render } from '@testing-library/react';
import { ThemeProvider } from './ThemeContext';
import { App } from './App';

test('matches snapshot', () => {
  const { container } = render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

  expect(container.firstChild).toMatchSnapshot();
});
```

**⚠️ Use sparingly:** Snapshot tests can be brittle. Prefer behavior tests.

## Testing Best Practices

### ✅ Do

- Test behavior, not implementation
- Use custom render utilities
- Test error cases (missing provider)
- Test async state (loading, error)
- Mock API calls with MSW
- Test full user flows

### ❌ Don't

- Test Context internals
- Test React's Context implementation
- Over-use snapshot tests
- Mock `useState` or `useContext`
- Test implementation details

## Common Testing Patterns

### Pattern 1: Test Helpers

```tsx
// test-utils/render.tsx
export function renderWithProviders(ui: ReactElement, options = {}) {
  function Wrapper({ children }) {
    return (
      <ThemeProvider>
        <UserProvider>
          <FeatureFlagsProvider>
            {children}
          </FeatureFlagsProvider>
        </UserProvider>
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
```

### Pattern 2: Mock Data Factories

```tsx
// test-utils/factories.ts
export function createMockUser(overrides = {}): User {
  return {
    id: '1',
    name: 'Alice',
    email: 'alice@example.com',
    ...overrides,
  };
}

// Usage
const mockUser = createMockUser({ name: 'Bob' });
```

### Pattern 3: Custom Matchers

```tsx
// test-utils/matchers.ts
expect.extend({
  toHaveTheme(received, theme) {
    const hasClass = received.classList.contains(theme);
    return {
      pass: hasClass,
      message: () => `Expected element to have theme "${theme}"`,
    };
  },
});

// Usage
expect(button).toHaveTheme('dark');
```

## Coverage Goals

**Minimum coverage for Context:**

- [ ] Provider renders without errors
- [ ] Consumer receives initial value
- [ ] Actions update state correctly
- [ ] Hook throws without provider
- [ ] Async operations (loading/error/success)
- [ ] Multiple consumers work correctly
- [ ] Context doesn't cause unnecessary re-renders

## Further Reading

- [React Testing Library Docs](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [API Reference](./api-reference.md) - Complete Context API
- [Patterns](./patterns.md) - Advanced patterns to test
