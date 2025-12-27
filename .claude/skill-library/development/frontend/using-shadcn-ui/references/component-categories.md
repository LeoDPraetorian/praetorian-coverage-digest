# shadcn/ui Component Categories Reference

Complete reference for all shadcn/ui component categories and their use cases.

## Core Component Categories

| Category         | Common Use Cases       | Example Components                             |
| ---------------- | ---------------------- | ---------------------------------------------- |
| **Forms**        | User input, validation | Input, Form, Select, Checkbox, Field           |
| **Overlays**     | Modals, popovers       | Dialog, Popover, Tooltip, Sheet                |
| **Navigation**   | Menus, sidebars        | Sidebar, Dropdown Menu, Navigation Menu, Tabs  |
| **Feedback**     | Notifications          | Sonner, Alert, Progress, Skeleton, Spinner     |
| **Data Display** | Tables, charts, cards  | Table, Card, Badge, Avatar, Chart              |
| **Layout**       | Containers, panels     | Separator, Resizable, Scroll Area              |
| **New (2025)**   | Enhanced inputs        | Spinner, Kbd, Button Group, Input Group, Item  |

## Detailed Category Breakdown

### Forms Components

| Component       | Use Case                        | Installation Command              |
| --------------- | ------------------------------- | --------------------------------- |
| `Input`         | Single-line text entry          | `npx shadcn@latest add input`     |
| `Textarea`      | Multi-line text entry           | `npx shadcn@latest add textarea`  |
| `Select`        | Dropdown selection              | `npx shadcn@latest add select`    |
| `Checkbox`      | Boolean selection               | `npx shadcn@latest add checkbox`  |
| `Radio Group`   | Single choice from options      | `npx shadcn@latest add radio-group` |
| `Switch`        | Toggle on/off                   | `npx shadcn@latest add switch`    |
| `Slider`        | Range selection                 | `npx shadcn@latest add slider`    |
| `Form`          | Form wrapper with validation    | `npx shadcn@latest add form`      |
| `Label`         | Form field labels               | `npx shadcn@latest add label`     |

### Overlay Components

| Component   | Use Case                    | Installation Command              |
| ----------- | --------------------------- | --------------------------------- |
| `Dialog`    | Modal windows               | `npx shadcn@latest add dialog`    |
| `Popover`   | Floating content panels     | `npx shadcn@latest add popover`   |
| `Tooltip`   | Hover information           | `npx shadcn@latest add tooltip`   |
| `Sheet`     | Slide-out panels            | `npx shadcn@latest add sheet`     |
| `Alert Dialog` | Confirmation modals      | `npx shadcn@latest add alert-dialog` |
| `Hover Card` | Rich hover previews        | `npx shadcn@latest add hover-card` |

### Navigation Components

| Component         | Use Case                  | Installation Command                    |
| ----------------- | ------------------------- | --------------------------------------- |
| `Sidebar`         | App sidebars (25 parts)   | `npx shadcn@latest add sidebar`         |
| `Dropdown Menu`   | Action menus              | `npx shadcn@latest add dropdown-menu`   |
| `Navigation Menu` | Site navigation           | `npx shadcn@latest add navigation-menu` |
| `Tabs`            | Tabbed content            | `npx shadcn@latest add tabs`            |
| `Menubar`         | Application menus         | `npx shadcn@latest add menubar`         |
| `Context Menu`    | Right-click menus         | `npx shadcn@latest add context-menu`    |
| `Breadcrumb`      | Path navigation           | `npx shadcn@latest add breadcrumb`      |
| `Pagination`      | Page navigation           | `npx shadcn@latest add pagination`      |

#### Sidebar (October 2024)

25 composable parts for building sidebars:

| Part                | Purpose                    |
| ------------------- | -------------------------- |
| `SidebarProvider`   | Handles collapsible state  |
| `Sidebar`           | Main container             |
| `SidebarHeader`     | Sticky header              |
| `SidebarFooter`     | Sticky footer              |
| `SidebarContent`    | Scrollable content area    |
| `SidebarGroup`      | Section within content     |
| `SidebarTrigger`    | Toggle button              |
| `SidebarMenu`       | Menu container             |
| `SidebarMenuItem`   | Menu item wrapper          |
| `SidebarMenuButton` | Clickable menu item        |

### Feedback Components

| Component   | Use Case                    | Installation Command              |
| ----------- | --------------------------- | --------------------------------- |
| `Sonner`    | Toast notifications         | `npx shadcn@latest add sonner`    |
| `Alert`     | Status messages             | `npx shadcn@latest add alert`     |
| `Progress`  | Loading/completion status   | `npx shadcn@latest add progress`  |
| `Skeleton`  | Loading placeholders        | `npx shadcn@latest add skeleton`  |
| `Spinner`   | Loading indicators (2025)   | `npx shadcn@latest add spinner`   |
| ~~`Toast`~~ | ~~Deprecated~~ → Use Sonner | ~~`npx shadcn@latest add toast`~~ |

> **Note:** The Toast component is deprecated. Use Sonner instead for toast notifications.

### Data Display Components

| Component    | Use Case                   | Installation Command               |
| ------------ | -------------------------- | ---------------------------------- |
| `Table`      | Tabular data               | `npx shadcn@latest add table`      |
| `Card`       | Content containers         | `npx shadcn@latest add card`       |
| `Badge`      | Status indicators          | `npx shadcn@latest add badge`      |
| `Avatar`     | User images                | `npx shadcn@latest add avatar`     |
| `Calendar`   | Date display/selection     | `npx shadcn@latest add calendar`   |
| `Data Table` | Advanced tables with sorting | (Custom composition)             |
| `Carousel`   | Image/content slider       | `npx shadcn@latest add carousel`   |

### Layout Components

| Component      | Use Case                  | Installation Command                 |
| -------------- | ------------------------- | ------------------------------------ |
| `Separator`    | Visual dividers           | `npx shadcn@latest add separator`    |
| `Aspect Ratio` | Responsive containers     | `npx shadcn@latest add aspect-ratio` |
| `Scroll Area`  | Custom scrollbars         | `npx shadcn@latest add scroll-area`  |
| `Collapsible`  | Expandable sections       | `npx shadcn@latest add collapsible`  |
| `Accordion`    | Stacked collapsibles      | `npx shadcn@latest add accordion`    |
| `Resizable`    | Resizable panels          | `npx shadcn@latest add resizable`    |

### Action Components

| Component        | Use Case                 | Installation Command                   |
| ---------------- | ------------------------ | -------------------------------------- |
| `Button`         | Clickable actions        | `npx shadcn@latest add button`         |
| `Button Group`   | Grouped actions (2025)   | `npx shadcn@latest add button-group`   |
| `Toggle`         | On/off button            | `npx shadcn@latest add toggle`         |
| `Toggle Group`   | Grouped toggles          | `npx shadcn@latest add toggle-group`   |
| `Command`        | Command palette          | `npx shadcn@latest add command`        |

### Chart Components

Charts are built on Recharts - you're not locked into an abstraction:

| Component      | Use Case               | Installation Command               |
| -------------- | ---------------------- | ---------------------------------- |
| `Chart`        | Base chart component   | `npx shadcn@latest add chart`      |
| `ChartTooltip` | Custom chart tooltips  | Included with Chart                |
| `ChartLegend`  | Chart legends          | Included with Chart                |

**Chart types supported:** Area, Bar, Line, Pie, Radar, Radial

```typescript
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis } from "recharts"

export function MyChart({ data }) {
  return (
    <ChartContainer config={chartConfig}>
      <AreaChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip />
        <Area dataKey="value" />
      </AreaChart>
    </ChartContainer>
  )
}
```

### New Components (October 2025)

| Component      | Use Case                     | Installation Command                  |
| -------------- | ---------------------------- | ------------------------------------- |
| `Spinner`      | Loading indicators           | `npx shadcn@latest add spinner`       |
| `Kbd`          | Keyboard key display         | `npx shadcn@latest add kbd`           |
| `Button Group` | Action grouping/split button | `npx shadcn@latest add button-group`  |
| `Input Group`  | Enhanced inputs with addons  | `npx shadcn@latest add input-group`   |
| `Field`        | Form field (multi-library)   | `npx shadcn@latest add field`         |
| `Item`         | Flexible list/card container | `npx shadcn@latest add item`          |
| `Empty`        | Empty state displays         | `npx shadcn@latest add empty`         |

#### Input Group Example

```typescript
import { InputGroup, InputGroupControl } from "@/components/ui/input-group"
import { Search } from "lucide-react"

<InputGroup>
  <Search className="h-4 w-4" />
  <InputGroupControl>
    <Input placeholder="Search..." data-slot="input-group-control" />
  </InputGroupControl>
</InputGroup>
```

#### Kbd Example

```typescript
import { Kbd } from "@/components/ui/kbd"

<p>Press <Kbd>⌘</Kbd> + <Kbd>K</Kbd> to open command palette</p>
```

## Installation Tips

**Install multiple components at once:**
```bash
npx shadcn@latest add button card dialog dropdown-menu input form
```

**Install all components (not recommended for production):**
```bash
npx shadcn@latest add --all
```

**Check what's installed:**
```bash
ls components/ui/
```

## Component Dependencies

Some components require others:

| Component | Requires |
|-----------|----------|
| `Form`    | `Label`, `Button` |
| `Data Table` | `Table`, `Button`, `Dropdown Menu` |
| `Date Picker` | `Calendar`, `Popover`, `Button` |
| `Combobox` | `Command`, `Popover`, `Button` |
