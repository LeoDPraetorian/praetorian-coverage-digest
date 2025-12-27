# Examples

## Component Testing Example

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("CVSSCell", () => {
  it("should render CVSS score when available", () => {
    const risk: Partial<RiskWithVulnerability> = {
      cvss: 9.8,
      name: "Test Vulnerability",
    };

    render(<CVSSCell risk={risk as RiskWithVulnerability} />);

    expect(screen.getByText("9.8")).toBeInTheDocument();
  });

  it("should render dash when CVSS is undefined", () => {
    const risk: Partial<RiskWithVulnerability> = {
      name: "Test Vulnerability",
    };

    const { container } = render(<CVSSCell risk={risk as RiskWithVulnerability} />);

    expect(container.textContent).toBe("-");
  });
});
```

## Hook Testing Example

```typescript
import { renderHook } from "@testing-library/react";
import { beforeEach, vi } from "vitest";

vi.mock("./useSortableColumn");

import { useSortableColumn } from "./useSortableColumn";

describe("useSmartColumnPositioning", () => {
  beforeEach(() => {
    (useSortableColumn as ReturnType<typeof vi.fn>).mockReturnValue({
      activeColumns: ["identifier", "name"],
      setActiveColumns: vi.fn(),
      columns: mockColumns,
    });
  });

  it("should return columns and activeColumns", () => {
    const { result } = renderHook(() =>
      useSmartColumnPositioning({ key: "test", defaultColumns, defaultConfig })
    );

    expect(result.current.columns).toBeDefined();
    expect(result.current.activeColumns).toEqual(["identifier", "name"]);
  });
});
```

## Integration Test Example with User Interactions

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

## Related

- [Main Skill](../SKILL.md)
- [Component Testing Patterns](component-testing-patterns.md)
- [Hook Testing Patterns](hook-testing-patterns.md)
- [Common Scenarios](common-scenarios.md)
