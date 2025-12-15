# Nielsen's 10 Usability Heuristics

Foundational usability principles established by Jakob Nielsen in 1994, refined from analysis of 249 usability problems.

**Durability:** These heuristics remain relevant 30+ years later because they address fundamental human-computer interaction mismatches.

## The 10 Heuristics

### 1. Visibility of System Status

**Principle:** Keep users informed about what's happening through timely feedback.

**Timeframe:** Feedback within 400ms (Doherty Threshold)

```typescript
// ✅ GOOD: Clear system status
function ScanStatus({ status }) {
  return (
    <div className="flex items-center gap-2">
      {status === 'running' && (
        <>
          <Spinner className="h-4 w-4" />
          <span>Scanning... 45% complete</span>
        </>
      )}
      {status === 'complete' && (
        <>
          <CheckIcon className="h-4 w-4 text-green-600" />
          <span>Scan complete</span>
        </>
      )}
      {status === 'failed' && (
        <>
          <XIcon className="h-4 w-4 text-red-600" />
          <span>Scan failed - Click for details</span>
        </>
      )}
    </div>
  );
}
```

---

### 2. Match Between System and Real World

**Principle:** Use familiar language and concepts, following real-world conventions.

```typescript
// ✅ GOOD: Natural language
<Button>Save Changes</Button>
<Button>Delete Asset</Button>
<Button>Export to CSV</Button>

// ❌ BAD: Technical jargon
<Button>Persist State</Button>
<Button>Remove Entity</Button>
<Button>Serialize to Comma-Separated Values</Button>
```

**Chariot example:**
- "Assets" not "Entities"
- "Scan" not "Execute Discovery Protocol"
- "Vulnerabilities" not "Security Findings"

---

### 3. User Control and Freedom

**Principle:** Provide undo/redo and easy exits from unwanted states.

```typescript
// ✅ GOOD: Easy undo
function BulkDelete({ selectedAssets }) {
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDelete = async () => {
    await deleteAssets(selectedAssets);
    setIsDeleted(true);

    toast.success(
      <div>
        <p>Deleted {selectedAssets.length} assets</p>
        <Button size="sm" onClick={handleUndo}>Undo</Button>
      </div>,
      { duration: 10000 } // 10 second undo window
    );
  };

  return <Button onClick={handleDelete}>Delete Selected</Button>;
}
```

**Implementation patterns:**
- Undo buttons in toasts
- Modal confirmation for destructive actions
- "X" close buttons in all dialogs
- Escape key closes modals
- Back button functionality

---

### 4. Consistency and Standards

**Principle:** Follow platform conventions. Don't make users wonder if different words/actions mean the same thing.

```typescript
// ✅ GOOD: Consistent terminology
const actions = {
  create: 'Create',  // Always "Create", never "Add" or "New"
  edit: 'Edit',      // Always "Edit", never "Modify" or "Change"
  delete: 'Delete',  // Always "Delete", never "Remove" or "Trash"
  save: 'Save'       // Always "Save", never "Submit" or "Apply"
};

// ✅ GOOD: Consistent button placement
<div className="flex gap-2">
  <Button variant="primary">Save</Button> {/* Primary always first */}
  <Button variant="secondary">Cancel</Button>
</div>
```

---

### 5. Error Prevention

**Principle:** Design to prevent errors before they occur.

```typescript
// ✅ GOOD: Prevent errors through validation
<Input
  label="Email"
  type="email" // Browser validation
  required
  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
  onChange={(e) => {
    // Real-time validation
    const isValid = e.target.value.includes('@');
    setError(isValid ? null : 'Email must include @');
  }}
/>

// ✅ GOOD: Disable actions that would cause errors
<Button
  onClick={handleDelete}
  disabled={selectedAssets.length === 0} // Prevent empty deletion
>
  Delete Selected ({selectedAssets.length})
</Button>

// ✅ GOOD: Confirmation for destructive actions
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete Account</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
    <AlertDialogDescription>
      This action cannot be undone. This will permanently delete your
      account and remove all data from our servers.
    </AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>
        Yes, delete account
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 6. Recognition Rather Than Recall

**Principle:** Minimize memory load by making objects, actions, and options visible.

```typescript
// ✅ GOOD: Show recent searches (recognition)
<SearchInput
  placeholder="Search assets..."
  recentSearches={[
    'status:critical',
    'type:domain',
    'last-scan:>7d'
  ]}
  onSelectRecent={(query) => setSearch(query)}
/>

// ✅ GOOD: Autocomplete (recognition)
<Combobox
  label="Assign to"
  options={users}
  renderOption={(user) => (
    <div className="flex items-center gap-2">
      <Avatar src={user.avatar} />
      <div>
        <div>{user.name}</div>
        <div className="text-xs text-gray-500">{user.email}</div>
      </div>
    </div>
  )}
/>
```

**Techniques:**
- Recent items lists
- Autocomplete suggestions
- Visual icons (not just text labels)
- Breadcrumbs (show current location)
- Tooltips on hover

---

### 7. Flexibility and Efficiency of Use

**Principle:** Accelerators for expert users while keeping interface simple for novices.

```typescript
// ✅ GOOD: Keyboard shortcuts for experts
<Command>
  <CommandInput placeholder="Search or run command..." />
  <CommandList>
    <CommandGroup heading="Quick Actions">
      <CommandItem onSelect={createAsset}>
        <PlusIcon className="mr-2" />
        Create Asset
        <CommandShortcut>⌘N</CommandShortcut>
      </CommandItem>
      <CommandItem onSelect={runScan}>
        <PlayIcon className="mr-2" />
        Run Scan
        <CommandShortcut>⌘R</CommandShortcut>
      </CommandItem>
    </CommandGroup>
  </CommandList>
</Command>

// ✅ GOOD: Bulk actions for experts
<Table
  data={assets}
  enableRowSelection
  bulkActions={
    <div className="flex gap-2">
      <Button onClick={bulkEdit}>Edit Selected</Button>
      <Button onClick={bulkDelete}>Delete Selected</Button>
      <Button onClick={bulkExport}>Export Selected</Button>
    </div>
  }
/>
```

---

### 8. Aesthetic and Minimalist Design

**Principle:** Remove unnecessary information. Every extra unit of information competes with relevant units.

```typescript
// ✅ GOOD: Essential information only
<AssetCard>
  <h3 className="font-semibold">{asset.name}</h3>
  <div className="flex items-center gap-2 mt-1">
    <Badge variant={asset.statusColor}>{asset.status}</Badge>
    <span className="text-sm text-gray-600">
      {asset.vulnerabilityCount} vulnerabilities
    </span>
  </div>
</AssetCard>

// ❌ BAD: Information overload
<AssetCard>
  <div>ID: {asset.id}</div>
  <div>Name: {asset.name}</div>
  <div>Type: {asset.type}</div>
  <div>Status: {asset.status}</div>
  <div>Created: {asset.createdAt}</div>
  <div>Updated: {asset.updatedAt}</div>
  <div>Created By: {asset.createdBy}</div>
  <div>Updated By: {asset.updatedBy}</div>
  <div>Vulnerabilities: {asset.vulnerabilityCount}</div>
  <div>Last Scan: {asset.lastScan}</div>
</AssetCard>
```

**Guidelines:**
- Show 3-4 key fields in cards/lists
- Hide metadata in details view
- Remove decoration that doesn't add information
- Use progressive disclosure for advanced options

---

### 9. Help Users Recognize, Diagnose, and Recover from Errors

**Principle:** Error messages in plain language, precisely indicate the problem, and constructively suggest a solution.

```typescript
// ✅ GOOD: Clear error with solution
<Alert variant="error">
  <AlertTitle>Scan Failed</AlertTitle>
  <AlertDescription>
    The target domain "example.com" could not be reached.
    This might be because:
    <ul className="list-disc ml-4 mt-2">
      <li>The domain is offline</li>
      <li>Your IP is blocked by the firewall</li>
      <li>DNS resolution failed</li>
    </ul>
  </AlertDescription>
  <AlertAction>
    <Button onClick={checkConnectivity}>Test Connection</Button>
    <Button variant="secondary" onClick={retry}>Retry Scan</Button>
  </AlertAction>
</Alert>

// ❌ BAD: Technical error without guidance
<Alert variant="error">
  Error: ECONNREFUSED 192.168.1.1:443
</Alert>
```

**Error message checklist:**
- ✅ Plain language (not error codes)
- ✅ Explains what happened
- ✅ Suggests next steps
- ✅ Provides action buttons

---

### 10. Help and Documentation

**Principle:** Provide searchable, contextual help focused on user tasks.

```typescript
// ✅ GOOD: Contextual help
<div className="relative">
  <Input label="Scan Frequency" type="number" />

  <Tooltip>
    <TooltipTrigger asChild>
      <IconButton size="sm" className="absolute top-0 right-0">
        <QuestionMarkIcon />
      </IconButton>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">
      <p className="font-semibold mb-2">Scan Frequency</p>
      <p>
        How often to automatically scan your assets. Recommended:
        Daily for critical assets, weekly for standard assets.
      </p>
      <a href="/docs/scanning" className="text-blue-600 text-sm mt-2 block">
        Learn more about scanning →
      </a>
    </TooltipContent>
  </Tooltip>
</div>

// ✅ GOOD: Empty state with guidance
<EmptyState
  icon={<ScanIcon />}
  title="No scans yet"
  description="Run your first scan to discover assets and vulnerabilities."
  action={
    <Button onClick={createScan}>
      <PlayIcon className="mr-2" />
      Run First Scan
    </Button>
  }
  helpLink="/docs/getting-started"
/>
```

**Help patterns:**
- Tooltips for field-level help
- Empty states with guidance
- Onboarding tours for new users
- In-app documentation links
- Contextual help based on current page

## Applying Heuristics to Code Review

Use as checklist during UI review:

```
✓ 1. System status visible? (Loading states, progress bars)
✓ 2. Natural language? (No jargon, familiar terms)
✓ 3. Easy to undo? (Confirmation dialogs, undo toasts)
✓ 4. Consistent? (Same terms, same placements)
✓ 5. Prevents errors? (Validation, disabled states, confirmations)
✓ 6. Recognition over recall? (Visible options, autocomplete)
✓ 7. Shortcuts for experts? (Keyboard shortcuts, bulk actions)
✓ 8. Minimal design? (3-4 key fields, progressive disclosure)
✓ 9. Clear errors? (Plain language, solutions provided)
✓ 10. Help available? (Tooltips, empty states, docs)
```

## Related References

- [UI Review Checklist](ui-review-checklist.md) - Complete validation workflow
- [Common Violations & Fixes](common-violations.md) - Real examples
- [Design Decision Framework](design-decision-framework.md) - Application strategies
