# Common Patterns

Frequently used patterns with shadcn/ui components.

## Loading States

```typescript
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function LoadingButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await someAsyncAction()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button disabled={isLoading} onClick={handleClick}>
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading ? "Loading..." : "Submit"}
    </Button>
  )
}
```

## Sonner (Toast Notifications)

> **Note:** The Toast component is deprecated. Use Sonner instead.

```bash
npx shadcn@latest add sonner
```

### Setup (in layout)

```typescript
// app/layout.tsx
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

### Basic Usage

```typescript
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function SonnerExample() {
  return (
    <Button onClick={() => toast.success("Changes saved!")}>
      Show Toast
    </Button>
  )
}
```

### Toast Variants

```typescript
// Success
toast.success("Operation completed!")

// Error
toast.error("Something went wrong")

// Warning
toast.warning("Please check your input")

// Info
toast.info("New updates available")

// Loading (returns ID for dismissal)
const toastId = toast.loading("Processing...")
// Later: toast.dismiss(toastId)
```

### Promise Integration (Best for Async)

```typescript
// Automatically shows loading → success/error
toast.promise(saveData(), {
  loading: "Saving...",
  success: "Data saved successfully!",
  error: "Failed to save data",
})

// With data transformation
toast.promise(fetchUser(id), {
  loading: "Loading user...",
  success: (data) => `Welcome, ${data.name}!`,
  error: (err) => `Error: ${err.message}`,
})
```

### With Actions (Undo Pattern)

```typescript
toast("File deleted", {
  description: "The file has been moved to trash",
  action: {
    label: "Undo",
    onClick: () => restoreFile(),
  },
})

// With cancel button
toast("Confirm action", {
  action: {
    label: "Confirm",
    onClick: () => performAction(),
  },
  cancel: {
    label: "Cancel",
    onClick: () => console.log("Cancelled"),
  },
})
```

### Custom Duration & Position

```typescript
// Custom duration (ms)
toast.success("Quick message", { duration: 2000 })

// Persistent (must dismiss manually)
toast.info("Important notice", { duration: Infinity })

// Position (set on Toaster component)
<Toaster position="top-center" />
// Options: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
```

### Rich Content

```typescript
toast(
  <div className="flex items-center gap-2">
    <CheckCircle className="h-4 w-4 text-green-500" />
    <span>Custom JSX content</span>
  </div>
)
```

## Data Tables

```bash
npx shadcn@latest add table
```

### Basic Table

```typescript
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const invoices = [
  { invoice: "INV001", status: "Paid", amount: "$250.00" },
  { invoice: "INV002", status: "Pending", amount: "$150.00" },
  { invoice: "INV003", status: "Unpaid", amount: "$350.00" },
]

export function InvoiceTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.invoice}>
            <TableCell className="font-medium">{invoice.invoice}</TableCell>
            <TableCell>{invoice.status}</TableCell>
            <TableCell className="text-right">{invoice.amount}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Table with Actions

```typescript
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Add to each row:
<TableCell>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem>Edit</DropdownMenuItem>
      <DropdownMenuItem>Duplicate</DropdownMenuItem>
      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
```

## Skeleton Loading

```bash
npx shadcn@latest add skeleton
```

```typescript
import { Skeleton } from "@/components/ui/skeleton"

export function CardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-[125px] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  )
}

export function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
```

## Dropdown Menu

```bash
npx shadcn@latest add dropdown-menu
```

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Menu</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Billing</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## Tabs

```bash
npx shadcn@latest add tabs
```

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsTabs() {
  return (
    <Tabs defaultValue="account" className="w-full">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <p>Account settings here.</p>
      </TabsContent>
      <TabsContent value="password">
        <p>Password settings here.</p>
      </TabsContent>
      <TabsContent value="notifications">
        <p>Notification settings here.</p>
      </TabsContent>
    </Tabs>
  )
}
```

## Accordion (FAQ Pattern)

```bash
npx shadcn@latest add accordion
```

```typescript
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  { question: "Is it accessible?", answer: "Yes, follows WAI-ARIA guidelines." },
  { question: "Is it customizable?", answer: "Yes, you own the code." },
]

export function FAQ() {
  return (
    <Accordion type="single" collapsible>
      {faqs.map((faq, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger>{faq.question}</AccordionTrigger>
          <AccordionContent>{faq.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
```
