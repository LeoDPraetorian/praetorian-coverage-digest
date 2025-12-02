# Hook Testing Patterns

Patterns for testing custom React hooks with Vitest and React Testing Library.

## Pattern 1: Custom Hook with Mocked Dependencies

```typescript
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies BEFORE importing
vi.mock("./useSortableColumn", () => ({
  useSortableColumn: vi.fn(),
}));

import { useSortableColumn } from "./useSortableColumn";
import { useSmartColumnPositioning } from "./useSmartColumnPositioning";

describe("useSmartColumnPositioning", () => {
  let mockSetActiveColumns: ReturnType<typeof vi.fn>;
  let mockActiveColumns: string[] | undefined;

  beforeEach(() => {
    mockSetActiveColumns = vi.fn();
    mockActiveColumns = ["identifier", "name"];

    (useSortableColumn as ReturnType<typeof vi.fn>).mockReturnValue({
      activeColumns: mockActiveColumns,
      setActiveColumns: mockSetActiveColumns,
      columns: mockColumns,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return columns and activeColumns", () => {
    const { result } = renderHook(() =>
      useSmartColumnPositioning({
        key: "test",
        defaultColumns,
        defaultConfig,
        positioningRules: {},
      })
    );

    expect(result.current.columns).toBe(mockColumns);
    expect(result.current.activeColumns).toBe(mockActiveColumns);
  });
});
```

## Pattern 2: Hook with React Query Integration

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

// Mock dependencies
vi.mock("@/hooks/useAxios");
vi.mock("@/hooks/useQueryKeys");

import { useAxios } from "@/hooks/useAxios";
import { useGetUserKey } from "@/hooks/useQueryKeys";
import { useStatisticsBatch } from "@/hooks/useStatisticsBatch";

describe("useStatisticsBatch", () => {
  let queryClient: QueryClient;
  let mockAxiosGet: Mock;

  beforeEach(() => {
    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
        },
      },
    });

    mockAxiosGet = vi.fn();
    (useAxios as Mock).mockReturnValue({
      get: mockAxiosGet,
    });

    (useGetUserKey as Mock).mockImplementation((keys: string[]) => [
      "user123",
      ...keys,
    ]);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should fetch batch statistics successfully", async () => {
    mockAxiosGet.mockResolvedValueOnce({
      data: [
        { statistics: [mockStatistic1] },
        { statistics: [mockStatistic2] },
      ],
    });

    const { result } = renderHook(
      () =>
        useStatisticsBatch({
          statisticKeys: ["asset#origin", "asset#status"],
          enabled: true,
        }),
      { wrapper }
    );

    // Initially pending
    expect(result.current.status).toBe("pending");
    expect(result.current.isLoading).toBe(true);

    // Wait for success
    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeDefined();
  });

  it("should not fetch when enabled is false", async () => {
    const { result } = renderHook(
      () =>
        useStatisticsBatch({
          statisticKeys: ["asset#origin"],
          enabled: false,
        }),
      { wrapper }
    );

    expect(result.current.status).toBe("pending");
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });
});
```

## Testing Async Operations

```typescript
it("should fetch data successfully", async () => {
  mockAxiosGet.mockResolvedValueOnce({ data: mockData });

  const { result } = renderHook(() => useCustomHook(), { wrapper });

  // Wait for async operation
  await waitFor(() => {
    expect(result.current.status).toBe("success");
  });

  expect(result.current.data).toEqual(mockData);
});
```

## Testing Error States

```typescript
it("should handle API errors gracefully", async () => {
  const mockError = {
    response: {
      status: 500,
      data: "Internal server error",
    },
    message: "Network error",
  };

  mockAxiosGet.mockRejectedValueOnce(mockError);

  const { result } = renderHook(() => useCustomHook(), { wrapper });

  await waitFor(() => {
    expect(result.current.status).toBe("error");
  });

  expect(result.current.error).toBeDefined();
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
