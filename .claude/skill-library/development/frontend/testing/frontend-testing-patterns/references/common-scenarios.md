# Common Testing Scenarios

## Testing Async Operations

```typescript
it("should fetch data successfully", async () => {
  mockAxiosGet.mockResolvedValueOnce({ data: mockData });

  const { result } = renderHook(() => useCustomHook(), { wrapper });

  await waitFor(() => {
    expect(result.current.status).toBe("success");
  });

  expect(result.current.data).toEqual(mockData);
});
```

## Testing Error States

```typescript
it("should handle API errors gracefully", async () => {
  mockAxiosGet.mockRejectedValueOnce({
    response: { status: 500 },
    message: "Network error",
  });

  const { result } = renderHook(() => useCustomHook(), { wrapper });

  await waitFor(() => {
    expect(result.current.status).toBe("error");
  });
});
```

## Testing Loading States

```typescript
it("should show loading state initially", () => {
  const { result } = renderHook(() => useCustomHook());

  expect(result.current.status).toBe("pending");
  expect(result.current.isLoading).toBe(true);
});
```

## Testing User Interactions

```typescript
import userEvent from "@testing-library/user-event";

it("should allow clicking preseed tab", async () => {
  const user = userEvent.setup();
  const mockOnTabChange = vi.fn();

  render(<SeedsHeader activeTab="domain" onTabChange={mockOnTabChange} />);

  const preseedTab = screen.getByTestId("tab-preseed");
  await user.click(preseedTab);

  expect(mockOnTabChange).toHaveBeenCalledWith("preseed");
});
```

## Testing Form Submission

```typescript
it("should submit form with valid data", async () => {
  const user = userEvent.setup();
  const mockOnSubmit = vi.fn();

  render(<Form onSubmit={mockOnSubmit} />);

  await user.type(screen.getByLabelText("Email"), "test@example.com");
  await user.type(screen.getByLabelText("Password"), "password123");
  await user.click(screen.getByRole("button", { name: /submit/i }));

  expect(mockOnSubmit).toHaveBeenCalledWith({
    email: "test@example.com",
    password: "password123",
  });
});
```

## Testing Conditional Rendering

```typescript
it("should show error message when validation fails", async () => {
  render(<Component />);

  // Initially no error
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();

  // Trigger validation error
  await user.click(screen.getByRole("button", { name: /submit/i }));

  // Error should appear
  expect(screen.getByRole("alert")).toHaveTextContent("Email is required");
});
```

## Related

- [Main Skill](../SKILL.md)
- [Component Testing Patterns](component-testing-patterns.md)
- [Hook Testing Patterns](hook-testing-patterns.md)
