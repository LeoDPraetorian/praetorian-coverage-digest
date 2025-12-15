# Common Violations & Fixes

Real examples of UI/UX law violations in Chariot and how to fix them.

## Navigation Violations

### Violation: Too Many Top-Level Menu Items

**Laws Violated:** Hick's Law, Miller's Law

**Example:**
```typescript
// ❌ WRONG: 12 top-level items (exceeds 7±2 limit)
const navigation = [
  'Dashboard', 'Assets', 'Domains', 'IPs', 'Web Apps',
  'Cloud Resources', 'Vulnerabilities', 'Scans', 'Reports',
  'Integrations', 'Settings', 'Help'
];
```

**Fix:**
```typescript
// ✅ CORRECT: 6 top-level items with logical grouping
const navigation = [
  { label: 'Dashboard', href: '/dashboard' },
  {
    label: 'Assets',
    submenu: ['All Assets', 'Domains', 'IPs', 'Web Apps', 'Cloud Resources']
  },
  { label: 'Vulnerabilities', href: '/vulnerabilities' },
  { label: 'Scans', href: '/scans' },
  { label: 'Reports', href: '/reports' },
  {
    label: 'More',
    submenu: ['Integrations', 'Settings', 'Help']
  }
];
```

---

## Form Violations

### Violation: Long Single-Page Form

**Laws Violated:** Miller's Law, Cognitive Load, Zeigarnik Effect

**Example:**
```typescript
// ❌ WRONG: 18 fields on one page
<form>
  <Input name="firstName" />
  <Input name="lastName" />
  {/* ... 14 more fields ... */}
  <Input name="notes" />
  <Button>Submit</Button>
</form>
```

**Fix:**
```typescript
// ✅ CORRECT: Multi-step form with progress
<MultiStepForm steps={3} current={currentStep}>
  <ProgressBar value={(currentStep / 3) * 100} />

  {currentStep === 1 && (
    <div>
      <h2>Step 1: Basic Information</h2>
      <Input name="firstName" />
      <Input name="lastName" />
      <Input name="email" />
      <Input name="company" />
    </div>
  )}

  {currentStep === 2 && (
    <div>
      <h2>Step 2: Security</h2>
      {/* 5-6 security fields */}
    </div>
  )}

  {currentStep === 3 && (
    <div>
      <h2>Step 3: Preferences</h2>
      {/* Remaining fields */}
    </div>
  )}
</MultiStepForm>
```

### Violation: No Field Validation

**Laws Violated:** Error Prevention (Nielsen #5), Doherty Threshold

**Example:**
```typescript
// ❌ WRONG: Validation only on submit
<form onSubmit={handleSubmit}>
  <Input name="email" />
  <Button>Submit</Button>
</form>
```

**Fix:**
```typescript
// ✅ CORRECT: Real-time validation with immediate feedback
<Input
  name="email"
  type="email"
  error={emailError}
  onChange={(e) => {
    const email = e.target.value;
    // Validate immediately (<100ms)
    if (!email.includes('@')) {
      setEmailError('Email must include @');
    } else {
      setEmailError(null);
    }
  }}
/>
```

---

## Button Violations

### Violation: Small Touch Targets

**Laws Violated:** Fitts' Law

**Example:**
```typescript
// ❌ WRONG: 28x28px button (below 44px minimum)
<Button className="px-2 py-1 text-xs">
  <TrashIcon className="h-3 w-3" />
</Button>
```

**Fix:**
```typescript
// ✅ CORRECT: 48x48px minimum (Material Design standard)
<IconButton
  size="lg"
  className="h-12 w-12"
  aria-label="Delete asset"
>
  <TrashIcon className="h-5 w-5" />
</IconButton>
```

### Violation: No Visual Feedback

**Laws Violated:** Doherty Threshold, System Status Visibility (Nielsen #1)

**Example:**
```typescript
// ❌ WRONG: No feedback on click
const handleDelete = async () => {
  await deleteAsset(id);
  toast.success('Deleted');
};
```

**Fix:**
```typescript
// ✅ CORRECT: Immediate feedback + optimistic update
const [isDeleting, setIsDeleting] = useState(false);

const handleDelete = async () => {
  // Immediate UI feedback (<100ms)
  setIsDeleting(true);

  try {
    await deleteAsset(id);
    // Optimistic removal from list
    removeFromList(id);
    toast.success('Asset deleted');
  } catch (error) {
    setIsDeleting(false);
    toast.error('Delete failed');
  }
};

<Button
  onClick={handleDelete}
  disabled={isDeleting}
  className={isDeleting ? 'opacity-50 cursor-wait' : ''}
>
  {isDeleting ? 'Deleting...' : 'Delete'}
</Button>
```

---

## Data Display Violations

### Violation: Too Many Table Columns

**Laws Violated:** Miller's Law, Cognitive Load

**Example:**
```typescript
// ❌ WRONG: 12 visible columns (exceeds 7 limit)
<Table columns={[
  'Name', 'Type', 'Status', 'Owner', 'Created', 'Updated',
  'Risk Score', 'Vulnerabilities', 'Last Scan', 'Next Scan',
  'Tags', 'Actions'
]} />
```

**Fix:**
```typescript
// ✅ CORRECT: 6 essential columns + details view
<Table columns={[
  'Name',              // Most important (Serial Position)
  'Risk Score',
  'Vulnerabilities',
  'Last Scan',
  'Status',
  'Actions'            // Important + interactive (Serial Position)
]} />

// Additional columns in expandable row details
<TableRow expandable>
  <TableCell colSpan={6}>
    <div className="grid grid-cols-3 gap-4 p-4">
      <div>Owner: {asset.owner}</div>
      <div>Created: {asset.created}</div>
      <div>Tags: {asset.tags.join(', ')}</div>
    </div>
  </TableCell>
</TableRow>
```

### Violation: Information Overload in Cards

**Laws Violated:** Aesthetic & Minimalist Design (Nielsen #8), Cognitive Load

**Example:**
```typescript
// ❌ WRONG: 10+ fields in card (information overload)
<Card>
  <div>ID: {asset.id}</div>
  <div>Name: {asset.name}</div>
  <div>Type: {asset.type}</div>
  {/* ... 7 more fields ... */}
</Card>
```

**Fix:**
```typescript
// ✅ CORRECT: 3-4 key fields + details link
<Card>
  <div className="flex justify-between items-start">
    <div>
      <h3 className="font-semibold text-lg">{asset.name}</h3>
      <div className="flex items-center gap-2 mt-1">
        <Badge>{asset.type}</Badge>
        <StatusIndicator status={asset.status} />
      </div>
      <p className="text-sm text-gray-600 mt-2">
        {asset.vulnerabilityCount} vulnerabilities
      </p>
    </div>
    <Button size="sm" variant="ghost" onClick={openDetails}>
      View Details
    </Button>
  </div>
</Card>
```

---

## Performance Violations

### Violation: No Loading States

**Laws Violated:** Doherty Threshold, System Status Visibility (Nielsen #1)

**Example:**
```typescript
// ❌ WRONG: No loading feedback (users see blank screen)
function AssetList() {
  const { data } = useQuery({ queryKey: ['assets'], queryFn: fetchAssets });
  return <Table data={data} />;
}
```

**Fix:**
```typescript
// ✅ CORRECT: Skeleton screen while loading
function AssetList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  if (isLoading) {
    return <TableSkeleton rows={10} columns={6} />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return <Table data={data} />;
}
```

### Violation: Long Operation Without Progress

**Laws Violated:** Goal Gradient Effect, System Status Visibility

**Example:**
```typescript
// ❌ WRONG: No progress indication for 30+ second operation
const handleBulkScan = async () => {
  setIsScanning(true);
  await scanAllAssets(assets);
  setIsScanning(false);
};
```

**Fix:**
```typescript
// ✅ CORRECT: Real-time progress updates
const [progress, setProgress] = useState(0);
const [isScanning, setIsScanning] = useState(false);

const handleBulkScan = async () => {
  setIsScanning(true);
  const total = assets.length;

  for (let i = 0; i < total; i++) {
    await scanAsset(assets[i]);
    setProgress(((i + 1) / total) * 100); // Update every iteration
  }

  setIsScanning(false);
  toast.success(`Scanned ${total} assets`);
};

<Dialog open={isScanning}>
  <DialogContent>
    <DialogTitle>Scanning Assets...</DialogTitle>
    <ProgressBar value={progress} />
    <p className="text-sm text-gray-600">
      {Math.round(progress)}% complete
    </p>
  </DialogContent>
</Dialog>
```

---

## Error Handling Violations

### Violation: Technical Error Messages

**Laws Violated:** Match System and Real World (Nielsen #2), Help Users Recover (Nielsen #9)

**Example:**
```typescript
// ❌ WRONG: Technical jargon, no guidance
<Alert variant="error">
  Error 401: Unauthorized - Token expired (ERR_AUTH_INVALID_TOKEN)
</Alert>
```

**Fix:**
```typescript
// ✅ CORRECT: Plain language with action
<Alert variant="error">
  <AlertTitle>Session Expired</AlertTitle>
  <AlertDescription>
    Your session has expired for security reasons. Please log in again to continue.
  </AlertDescription>
  <AlertAction>
    <Button onClick={handleLogin}>Log In</Button>
  </AlertAction>
</Alert>
```

### Violation: No Error Prevention

**Laws Violated:** Error Prevention (Nielsen #5)

**Example:**
```typescript
// ❌ WRONG: Allows destructive action without confirmation
<Button onClick={deleteAccount} variant="destructive">
  Delete Account
</Button>
```

**Fix:**
```typescript
// ✅ CORRECT: Confirmation dialog prevents accidents
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete Account</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Delete Account?</AlertDialogTitle>
    <AlertDialogDescription>
      This action cannot be undone. All your data will be permanently deleted.

      Type "DELETE" to confirm:
      <Input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="mt-2"
      />
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={deleteAccount}
        disabled={confirmText !== 'DELETE'}
      >
        Yes, Delete Account
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Mobile Violations

### Violation: Desktop-Only Touch Targets

**Laws Violated:** Fitts' Law

**Example:**
```typescript
// ❌ WRONG: 32px buttons on mobile (below 48px guideline)
<Button className="px-3 py-2">Action</Button>
```

**Fix:**
```typescript
// ✅ CORRECT: Responsive sizing (48px mobile, 40px desktop)
<Button className="px-4 py-3 sm:px-3 sm:py-2 min-h-[48px] sm:min-h-[40px]">
  Action
</Button>
```

### Violation: Actions Out of Thumb Reach

**Laws Violated:** Fitts' Law

**Example:**
```typescript
// ❌ WRONG: Primary action at top of mobile screen
<header className="fixed top-0">
  <Button onClick={handleCreate}>Create Asset</Button>
</header>
```

**Fix:**
```typescript
// ✅ CORRECT: Floating action button in thumb zone
<button
  onClick={handleCreate}
  className="
    fixed bottom-6 right-6
    h-14 w-14 rounded-full
    bg-primary text-white
    shadow-lg
    z-50
    sm:hidden
  "
>
  <PlusIcon className="h-6 w-6" />
</button>
```

---

## Visual Design Violations

### Violation: Poor Visual Grouping

**Laws Violated:** Gestalt: Proximity, Common Region

**Example:**
```typescript
// ❌ WRONG: All fields have same spacing (no grouping)
<form className="space-y-4">
  <Input name="firstName" />
  <Input name="lastName" />
  <Input name="password" />
  <Input name="confirmPassword" />
</form>
```

**Fix:**
```typescript
// ✅ CORRECT: Visual grouping with spacing + regions
<form className="space-y-8">
  {/* Group 1: Personal Info */}
  <Card className="p-4 space-y-3">
    <h3 className="font-semibold">Personal Information</h3>
    <Input name="firstName" />
    <Input name="lastName" />
  </Card>

  {/* Group 2: Security */}
  <Card className="p-4 space-y-3">
    <h3 className="font-semibold">Security</h3>
    <Input name="password" type="password" />
    <Input name="confirmPassword" type="password" />
  </Card>
</form>
```

### Violation: CTA Doesn't Stand Out

**Laws Violated:** Von Restorff Effect

**Example:**
```typescript
// ❌ WRONG: Primary CTA looks like secondary button
<div className="flex gap-2">
  <Button variant="secondary">Cancel</Button>
  <Button variant="secondary">Save</Button> {/* Should be primary! */}
</div>
```

**Fix:**
```typescript
// ✅ CORRECT: Primary CTA visually distinct
<div className="flex gap-2">
  <Button variant="secondary">Cancel</Button>
  <Button
    variant="primary"
    size="lg"
    className="shadow-md"
  >
    Save Changes
  </Button>
</div>
```

## Related References

- [UI Review Checklist](ui-review-checklist.md) - Systematic validation
- [Design Decision Framework](design-decision-framework.md) - Prevention strategies
- [Chariot-Specific Patterns](chariot-patterns.md) - Platform best practices
