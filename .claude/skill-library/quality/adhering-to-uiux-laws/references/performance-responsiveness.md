# Performance & Responsiveness

Laws governing how users perceive system performance and interact with interface elements.

## Table of Contents

- [Doherty Threshold](#doherty-threshold)
- [Fitts' Law](#fitts-law)

---

## Doherty Threshold

**Definition:** System response time should be under 400 milliseconds to maintain user engagement and productivity.

**Origin:** Walter J. Doherty's research on human-computer interaction response times

### The Magic Number: 400ms

- **<100ms:** Feels instantaneous
- **100-400ms:** Acceptable, user remains engaged
- **400ms-1s:** Noticeable delay, provide feedback
- **>1s:** Interrupts flow, must show progress indicator

### Implementation Guidelines

#### 1. Immediate Feedback for All Actions

```typescript
// ✅ GOOD: Optimistic updates with React 19 useOptimistic
import { useOptimistic } from 'react';

function AssetToggle({ asset }) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    asset.status,
    (_currentState, newStatus) => newStatus
  );

  const handleToggle = async (newStatus) => {
    // 1. Immediate UI feedback (0ms perceived delay)
    setOptimisticStatus(newStatus);

    try {
      // 2. Background API call
      await updateAsset(asset.id, { status: newStatus });
      toast.success('Status updated');
    } catch (error) {
      // 3. Automatic rollback on error (by useOptimistic)
      toast.error('Update failed');
    }
  };

  return (
    <Toggle
      checked={optimisticStatus === 'active'}
      onChange={() => handleToggle(optimisticStatus === 'active' ? 'inactive' : 'active')}
    />
  );
}
```

**Why this works:**

- User sees change instantly (meets Doherty Threshold)
- No waiting for server round-trip
- Automatic rollback if API fails
- Perceived performance >>> actual performance

#### 2. Loading States for 400ms+ Operations

```typescript
// ✅ GOOD: Show loading state immediately
function AssetList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  if (isLoading) {
    return <Skeleton count={5} />; // Shown immediately
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return <Table data={data} />;
}
```

**Loading state hierarchy:**

1. **<400ms:** No indicator needed (feels instant)
2. **400ms-1s:** Subtle spinner or skeleton
3. **1-3s:** Progress bar with percentage
4. **>3s:** Progress bar + estimated time remaining

#### 3. Skeleton Screens (Better Than Spinners)

```typescript
// ✅ BEST: Skeleton matches final layout
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <Card key={i}>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ))}
    </div>
  );
}

// ❌ WORSE: Generic spinner (no context)
function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner />
    </div>
  );
}
```

**Benefits of skeletons:**

- Shows layout structure (reduces perceived wait time)
- More informative than spinners
- Smooth transition when data loads
- Used by LinkedIn, Facebook, YouTube

### Chariot Examples

#### Asset Search with Debouncing

```typescript
// ✅ GOOD: Instant feedback + debounced API
import { useDeferredValue } from 'react';

function AssetSearch() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query); // React 19 concurrent feature

  const { data } = useQuery({
    queryKey: ['assets', 'search', deferredQuery],
    queryFn: () => searchAssets(deferredQuery),
    enabled: deferredQuery.length > 2,
  });

  return (
    <div>
      {/* Input updates immediately (0ms) - meets Doherty Threshold */}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search assets..."
      />

      {/* Results load with deferred value (debounced) */}
      {query !== deferredQuery && <LoadingIndicator />}
      <SearchResults results={data} />
    </div>
  );
}
```

**Why this works:**

- Typing feels instant (no delay)
- Search API called after typing stops (reduces requests)
- Loading indicator shows when search is running
- React 19 concurrent features prevent UI blocking

#### Bulk Actions Progress

```typescript
// ✅ GOOD: Real-time progress for long operations
function BulkDeleteAssets({ assetIds }) {
  const [progress, setProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const total = assetIds.length;

    for (let i = 0; i < total; i++) {
      await deleteAsset(assetIds[i]);
      setProgress(((i + 1) / total) * 100); // Update every iteration
    }

    setIsDeleting(false);
    toast.success(`Deleted ${total} assets`);
  };

  return (
    <Dialog>
      <Button onClick={handleDelete}>Delete {assetIds.length} Assets</Button>

      {isDeleting && (
        <div className="space-y-2">
          <ProgressBar value={progress} />
          <p className="text-sm text-gray-600">
            Deleting assets... {Math.round(progress)}%
          </p>
        </div>
      )}
    </Dialog>
  );
}
```

**Benefits:**

- User sees continuous progress
- Estimated time based on current rate
- No "black box" waiting period
- Meets Doherty Threshold with constant feedback

### API Response Time Optimization

**Backend considerations for meeting Doherty Threshold:**

```go
// Cache frequently accessed data
func GetAssets(ctx context.Context) ([]Asset, error) {
    // Check cache first (5-10ms)
    if cached, found := cache.Get("assets:list"); found {
        return cached.([]Asset), nil
    }

    // Database query (50-200ms)
    assets, err := db.Query(ctx, "SELECT * FROM assets")
    if err != nil {
        return nil, err
    }

    // Cache for 5 minutes
    cache.Set("assets:list", assets, 5*time.Minute)

    return assets, nil
}
```

**Strategies:**

1. **Cache aggressively** - Most Chariot data changes infrequently
2. **Paginate** - Don't load 10,000 assets at once
3. **Use CDN** - Static assets load in <50ms
4. **Optimize queries** - Add indexes, avoid N+1 queries
5. **Parallel requests** - Fetch independent data simultaneously

### Perceived Performance Tricks

#### Copy Button with Green Flash

```typescript
// ✅ EXCELLENT: Instant visual feedback (meets Doherty Threshold)
const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  await navigator.clipboard.writeText(value);

  // Instant green flash (0ms delay)
  setCopied(true);
  setTimeout(() => setCopied(false), 1500);

  // Toast as secondary feedback
  toast.success('Copied to clipboard');
};

<button
  onClick={handleCopy}
  className={cn(
    'rounded-md px-3 py-1.5 transition-colors',
    copied
      ? 'bg-green-500/10 text-green-600 ring-1 ring-green-500/20' // Instant feedback
      : 'bg-gray-100 hover:bg-gray-200'
  )}
>
  {value}
</button>
```

**Why this works better than toast alone:**

- Green flash: 0ms (instant visual confirmation)
- Toast: 50-100ms (secondary confirmation)
- Double feedback increases perceived responsiveness

---

## Fitts' Law

**Definition:** The time to acquire a target is a function of the distance to and size of the target.

**Formula:** `T = a + b × log₂(D/W + 1)`

- T = time to reach target
- D = distance to target
- W = width of target
- a, b = constants

**Simplified:** Bigger and closer targets are faster to click.

### Implementation Guidelines

#### 1. Minimum Touch Target Sizes

**iOS/Android guidelines: 44x44px minimum**

```typescript
// ❌ WRONG: Too small (28x28px)
<Button className="px-2 py-1 text-xs">
  Delete
</Button>

// ✅ CORRECT: 44x44px minimum
<Button className="px-4 py-2.5 text-sm min-h-[44px] min-w-[44px]">
  Delete
</Button>
```

**Sizing guide:**

- **Touch targets:** ≥44x44px (iOS), ≥48x48px (Material Design)
- **Mouse targets:** ≥32x32px acceptable
- **Primary CTAs:** Even larger (56x56px+)
- **Text links:** Larger click area than visible text

#### 2. Click Area Padding

```typescript
// ✅ GOOD: Expand clickable area beyond visual size
<a
  href="/asset/123"
  className="relative block" // Makes entire card clickable
>
  <Card className="hover:shadow-lg transition-shadow">
    <h3>{asset.name}</h3>
    <p>{asset.description}</p>
  </Card>
</a>

// Instead of:
<Card>
  <h3>{asset.name}</h3>
  <p>{asset.description}</p>
  <a href="/asset/123">View Details</a> // Tiny click target
</Card>
```

**Make the entire card clickable, not just the link**

#### 3. Proximity of Related Actions

```typescript
// ✅ GOOD: Related actions close together
<div className="flex items-center gap-2">
  <Button variant="primary">Save</Button>
  <Button variant="secondary">Cancel</Button>
</div>

// ❌ BAD: Actions far apart
<div className="flex justify-between w-full">
  <Button variant="primary">Save</Button>
  <Button variant="secondary">Cancel</Button> {/* 500px away! */}
</div>
```

**Reduce distance (D) to improve Fitts' Law**

### Chariot Examples

#### Mobile-First Button Sizing

```typescript
// Asset actions - mobile optimized
<div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
  <Button
    size="lg" // 48px height on mobile
    className="w-full sm:w-auto"
  >
    <PlayIcon className="mr-2" />
    Run Scan
  </Button>

  <Button
    size="lg"
    variant="secondary"
    className="w-full sm:w-auto"
  >
    <CalendarIcon className="mr-2" />
    Schedule
  </Button>
</div>
```

**Benefits:**

- Mobile: Full-width buttons (easy to tap)
- Desktop: Side-by-side (less distance between actions)
- Consistent 48px height meets touch guidelines

#### Table Row Actions

```typescript
// ✅ GOOD: Actions visible and large enough
<Table>
  <TableRow>
    <TableCell>{asset.name}</TableCell>
    <TableCell>{asset.status}</TableCell>
    <TableCell className="text-right">
      <div className="flex items-center justify-end gap-2">
        <IconButton
          size="md" // 40x40px
          onClick={handleEdit}
          aria-label="Edit asset"
        >
          <EditIcon />
        </IconButton>
        <IconButton
          size="md"
          onClick={handleDelete}
          aria-label="Delete asset"
        >
          <TrashIcon />
        </IconButton>
      </div>
    </TableCell>
  </TableRow>
</Table>
```

**Icon button sizing:**

- Desktop: 36-40px (adequate for mouse)
- Mobile: 44-48px (touch-friendly)
- Spacing: 8-12px between buttons (prevent mis-clicks)

#### Floating Action Button (FAB)

```typescript
// ✅ EXCELLENT: Large, fixed position, thumb-reachable
<button
  className="
    fixed bottom-6 right-6
    h-14 w-14 rounded-full // 56x56px - extra large
    bg-primary text-white
    shadow-lg hover:shadow-xl
    flex items-center justify-center
    z-50
  "
  onClick={handleCreate}
>
  <PlusIcon className="h-6 w-6" />
</button>
```

**Why this works:**

- Size: 56x56px (28% larger than minimum)
- Position: Fixed in corner (consistent location)
- Distance: Always in same place (reduces D)
- Visibility: Always available (no scrolling needed)

### Edge Cases and Exceptions

#### Small Icons in Toolbars

When space is limited, use tooltips to expand effective hit area:

```typescript
// ✅ ACCEPTABLE: Small icon + tooltip expansion
<Tooltip content="Mark as resolved">
  <IconButton
    size="sm" // 32x32px - below guideline
    className="hover:bg-gray-100 p-2" // Padding expands hit area to 40x40px
  >
    <CheckIcon className="h-4 w-4" />
  </IconButton>
</Tooltip>
```

**Padding expands actual hit area beyond visual size**

#### Dense Data Tables

For tables with many rows, prioritize:

1. **Primary action**: Large, always visible
2. **Secondary actions**: Dropdown menu (single large target)

```typescript
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-2">
    {/* Primary: Large and visible */}
    <Button size="sm" onClick={handleView}>
      View
    </Button>

    {/* Secondary: Dropdown menu */}
    <DropdownMenu>
      <DropdownTrigger asChild>
        <IconButton size="md">
          <MoreVerticalIcon />
        </IconButton>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownItem onClick={handleEdit}>Edit</DropdownItem>
        <DropdownItem onClick={handleDuplicate}>Duplicate</DropdownItem>
        <DropdownItem onClick={handleArchive}>Archive</DropdownItem>
        <DropdownItem onClick={handleDelete}>Delete</DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  </div>
</TableCell>
```

**Benefits:**

- One large target (dropdown trigger) instead of 4 small icons
- Reduces visual clutter
- Meets Fitts' Law guidelines

## Related References

- [Cognitive Psychology Laws](cognitive-psychology-laws.md) - Hick's Law, Miller's Law
- [Design Decision Framework](design-decision-framework.md) - When to apply performance laws
- [Chariot-Specific Patterns](chariot-patterns.md) - Platform-specific implementations
