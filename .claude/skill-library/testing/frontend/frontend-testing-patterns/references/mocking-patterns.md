# Mocking Patterns

## Pattern 1: Vitest Module Mocking

```typescript
// Mock module BEFORE importing
vi.mock("@/hooks/useAxios");

// Import mocked modules
import { useAxios } from "@/hooks/useAxios";

// Set mock implementation
(useAxios as Mock).mockReturnValue({
  get: mockAxiosGet,
  post: mockAxiosPost,
});

// Mock specific function calls
mockAxiosGet.mockResolvedValueOnce({ data: mockData });
mockAxiosGet.mockRejectedValueOnce(new Error("API error"));
```

## Pattern 2: Component Mocking for Integration Tests

```typescript
vi.mock("@/components/Tabs", () => ({
  default: ({ tabs, onSelect }: TabsProps) => (
    <div data-testid="tabs-component">
      {tabs.map((tab) => (
        <button key={tab.value} onClick={() => onSelect(tab)}>
          {tab.label}
        </button>
      ))}
    </div>
  ),
}));
```

## Pattern 3: Partial Mocking with importActual

```typescript
vi.mock("@/utils/helpers", async () => {
  const actual = await vi.importActual("@/utils/helpers");
  return {
    ...actual,
    specificFunction: vi.fn().mockReturnValue("mocked value"),
  };
});
```

## Pattern 4: Mocking Global State

```typescript
// Mock global state when needed
vi.mock("@/state/global.state", () => ({
  useGlobalState: () => ({
    drawerState: mockDrawerState,
    setDrawerState: mockSetDrawerState,
  }),
}));
```

## Pattern 5: Mocking Authentication

```typescript
// Mock auth context
vi.mock("@/state/auth", () => ({
  useAuth: () => ({
    user: mockUser,
    isPraetorianUser: true,
    logout: vi.fn(),
  }),
}));
```

## Related

- [Main Skill](../SKILL.md)
- [MSW Mocking Reference](msw-mocking.md)
