# Design Decision Framework

Decision trees for applying UI/UX laws to common scenarios in Chariot.

## Navigation Design

### Decision Tree

```
Is this primary navigation?
├─ YES: Apply Hick's Law + Miller's Law
│  ├─ Limit to 5-7 top-level items
│  ├─ Group similar items into categories
│  └─ Use familiar patterns (Jakob's Law)
│
└─ NO: Is this a dropdown/submenu?
   ├─ YES: Progressive disclosure
   │  ├─ Show 5-7 common options
   │  └─ Hide advanced options in "More"
   │
   └─ NO: Is this in-page navigation?
      └─ Use tabs (3-5 max) or side navigation
```

### Implementation Pattern

```typescript
// Primary navigation: 7 items (Hick's + Miller's)
const primaryNav = [
  'Dashboard',
  'Assets',
  'Vulnerabilities',
  'Scans',
  'Reports',
  'Settings',
  'Help'
];

// Submenu: Progressive disclosure
<DropdownMenu>
  <DropdownTrigger>Settings</DropdownTrigger>
  <DropdownContent>
    {/* Common options (always visible) */}
    <DropdownItem>Account</DropdownItem>
    <DropdownItem>Security</DropdownItem>
    <DropdownItem>Notifications</DropdownItem>

    {/* Advanced options (expandable) */}
    <DropdownGroup label="Advanced">
      <DropdownItem>API Keys</DropdownItem>
      <DropdownItem>Webhooks</DropdownItem>
      <DropdownItem>Audit Logs</DropdownItem>
    </DropdownGroup>
  </DropdownContent>
</DropdownMenu>
```

---

## Form Design

### Decision Tree

```
How many fields in the form?
├─ 1-5 fields: Single page form
│  └─ Apply: Proximity, Common Region, Serial Position Effect
│
├─ 6-12 fields: Single page with grouping
│  └─ Apply: Miller's Law (group into 3-4 sections)
│
└─ 13+ fields: Multi-step form
   └─ Apply: Hick's Law + Zeigarnik Effect + Goal Gradient
```

### Implementation Patterns

#### Single Page Form (1-5 fields)

```typescript
<form className="space-y-4">
  {/* Important field first (Serial Position Effect) */}
  <Input label="Name" required />
  <Input label="Email" type="email" required />
  <Textarea label="Message" />

  <div className="flex gap-2 pt-4">
    {/* Primary action left (Serial Position) */}
    <Button variant="primary">Submit</Button>
    <Button variant="secondary">Cancel</Button>
  </div>
</form>
```

#### Grouped Form (6-12 fields)

```typescript
<form className="space-y-8">
  {/* Group 1: Personal Info */}
  <FieldGroup title="Personal Information">
    <div className="grid grid-cols-2 gap-4">
      <Input label="First Name" />
      <Input label="Last Name" />
    </div>
    <Input label="Email" />
  </FieldGroup>

  {/* Group 2: Organization */}
  <FieldGroup title="Organization">
    <Input label="Company Name" />
    <Select label="Industry" options={industries} />
  </FieldGroup>

  {/* Actions at end */}
  <div className="flex gap-2">
    <Button variant="primary">Save</Button>
    <Button variant="secondary">Cancel</Button>
  </div>
</form>
```

#### Multi-Step Form (13+ fields)

```typescript
<MultiStepForm
  steps={[
    { title: 'Basic Info', fields: 4 },
    { title: 'Security', fields: 3 },
    { title: 'Preferences', fields: 5 }
  ]}
  currentStep={currentStep}
>
  {/* Progress bar (Zeigarnik + Goal Gradient) */}
  <ProgressBar
    value={(currentStep / totalSteps) * 100}
    label={`Step ${currentStep} of ${totalSteps}`}
  />

  <StepContent step={currentStep} />

  <div className="flex justify-between">
    <Button
      variant="secondary"
      onClick={goBack}
      disabled={currentStep === 0}
    >
      Back
    </Button>
    <Button variant="primary" onClick={goNext}>
      {currentStep === totalSteps - 1 ? 'Submit' : 'Continue'}
    </Button>
  </div>
</MultiStepForm>
```

---

## Visual Design

### Color Application

**Primary Action:**
- Law: Von Restorff Effect
- Implementation: Accent color, larger size, unique shape

```typescript
<Button
  variant="primary"
  size="lg"
  className="bg-blue-600 hover:bg-blue-700 shadow-md"
>
  Run Scan
</Button>
```

**Status Communication:**
- Law: Aesthetic-Usability Effect + Similarity
- Implementation: Consistent color coding

```typescript
const statusColors = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700'
};
```

### Layout Hierarchy

**Apply Gestalt principles:**
1. **Proximity:** Group related elements (12-16px gaps within, 32-48px between)
2. **Similarity:** Consistent styling for related actions
3. **Common Region:** Cards/boxes for grouped content
4. **Figure/Ground:** Contrast for emphasis

```typescript
<div className="space-y-8"> {/* Between groups */}
  <Section title="Account">
    <Card>
      <div className="space-y-4"> {/* Within group */}
        <SettingRow>Profile</SettingRow>
        <SettingRow>Password</SettingRow>
      </div>
    </Card>
  </Section>

  <Section title="Security">
    <Card>
      <div className="space-y-4">
        <SettingRow>Two-Factor Auth</SettingRow>
        <SettingRow>API Keys</SettingRow>
      </div>
    </Card>
  </Section>
</div>
```

---

## Performance

### Response Time Guidelines

**Apply Doherty Threshold + Goal Gradient:**

| Operation | Target | Implementation |
|-----------|--------|----------------|
| Button click | <100ms | Optimistic updates, `useOptimistic` |
| Page navigation | <400ms | Prefetch, skeleton screens |
| Form submission | <1s | Loading spinner, progress bar |
| File upload | Variable | Progress bar with percentage |
| Long operation (>3s) | N/A | Progress + time estimate |

### Implementation

```typescript
// <100ms: Instant feedback
const [copied, setCopied] = useState(false);
const handleCopy = async () => {
  setCopied(true); // Instant UI update
  await navigator.clipboard.writeText(text);
  setTimeout(() => setCopied(false), 1500);
};

// 400ms-1s: Loading indicator
const { data, isLoading } = useQuery({
  queryKey: ['assets'],
  queryFn: fetchAssets,
});

if (isLoading) return <Skeleton />;

// >3s: Progress bar
const [progress, setProgress] = useState(0);
for (let i = 0; i < total; i++) {
  await processItem(items[i]);
  setProgress(((i + 1) / total) * 100);
}
```

---

## Mobile Optimization

### Touch Target Sizing

**Apply Fitts' Law:**

```typescript
// Minimum: 44x44px (iOS), 48x48px (Android)
<Button className="px-6 py-3 min-h-[48px] min-w-[48px]">
  Action
</Button>

// Icon buttons
<IconButton size="lg" className="h-12 w-12">
  <TrashIcon />
</IconButton>
```

### Mobile-Specific Patterns

```typescript
// Full-width buttons on mobile
<Button className="w-full sm:w-auto">
  Submit
</Button>

// Bottom sheet for mobile actions (thumb-reachable)
<Sheet>
  <SheetContent side="bottom">
    <SheetHeader>Actions</SheetHeader>
    <div className="space-y-2">
      <Button className="w-full">Edit</Button>
      <Button className="w-full">Share</Button>
      <Button className="w-full" variant="destructive">Delete</Button>
    </div>
  </SheetContent>
</Sheet>
```

---

## Data Display

### Table Design

**Apply Hick's + Miller's + Fitts':**

```typescript
// Limit visible columns to 5-7 (Miller's Law)
const visibleColumns = [
  'Name',        // Most important (Serial Position)
  'Status',
  'Risk Score',
  'Last Scan',
  'Actions'      // Important + dangerous (Serial Position)
];

// Large action buttons (Fitts' Law)
<TableCell className="text-right">
  <div className="flex gap-2 justify-end">
    <IconButton size="md" onClick={handleEdit}>
      <EditIcon />
    </IconButton>
    <DropdownMenu>
      <DropdownTrigger asChild>
        <IconButton size="md">
          <MoreIcon />
        </IconButton>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem>Duplicate</DropdownItem>
        <DropdownItem>Archive</DropdownItem>
        <DropdownItem>Delete</DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  </div>
</TableCell>
```

### Dashboard Widgets

**Apply Miller's Law + Proximity:**

```typescript
// Limit to 6 default widgets (Miller's Law)
const defaultWidgets = [
  'Asset Count',
  'Critical Vulnerabilities',
  'Scan Status',
  'Risk Score Trend',
  'Recent Findings',
  'Scheduled Scans'
];

// Group related widgets (Proximity)
<div className="grid grid-cols-2 gap-6">
  {/* Group 1: Counts */}
  <div className="space-y-4">
    <Widget type="asset-count" />
    <Widget type="vulnerability-count" />
  </div>

  {/* Group 2: Trends */}
  <div className="space-y-4">
    <Widget type="risk-trend" />
    <Widget type="scan-history" />
  </div>
</div>
```

---

## Error Handling

### Error Messages

**Apply Jakob's Law + Nielsen's Heuristics:**

```typescript
// ✅ GOOD: Clear, actionable error message
<Alert variant="error">
  <AlertTitle>Unable to save changes</AlertTitle>
  <AlertDescription>
    Your session has expired. Please log in again to continue.
  </AlertDescription>
  <AlertAction>
    <Button onClick={handleLogin}>Log In</Button>
  </AlertAction>
</Alert>

// ❌ BAD: Technical, unclear error
<Alert variant="error">
  <AlertDescription>
    Error 401: Unauthorized
  </AlertDescription>
</Alert>
```

### Validation Feedback

**Apply Doherty Threshold + Visual Feedback:**

```typescript
// Instant validation feedback (<400ms)
<Input
  label="Email"
  error={emailError}
  onChange={(e) => {
    const email = e.target.value;
    // Instant validation
    if (!email.includes('@')) {
      setEmailError('Email must include @');
    } else {
      setEmailError(null);
    }
  }}
/>
```

## Related References

- [Cognitive Psychology Laws](cognitive-psychology-laws.md) - Core principles
- [Performance & Responsiveness](performance-responsiveness.md) - Speed guidelines
- [UI Review Checklist](ui-review-checklist.md) - Validation workflow
- [Chariot-Specific Patterns](chariot-patterns.md) - Platform applications
