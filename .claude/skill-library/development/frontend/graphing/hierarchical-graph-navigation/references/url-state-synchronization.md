# URL State Synchronization

Complete patterns for synchronizing hierarchical graph navigation with browser URL state.

## Why URL State Matters

**Benefits:**

- **Browser back/forward** - Users expect back button to work
- **Deep linking** - Share specific cluster view via URL
- **Bookmarking** - Save current navigation state
- **Analytics** - Track user navigation patterns

**Without URL state:** Navigation exists only in React state. Refresh loses position, back button doesn't work.

## URL Format

### Path-Based Navigation

```
/graph/{root-id}/{cluster-a-id}/{cluster-b-id}
```

**Example:**
```
/graph/root/us-east-1/production/subnet-abc123
```

**Advantages:**

- Clean, readable URLs
- Natural hierarchy representation
- SEO-friendly (if public)

### Query-Based Navigation

```
/graph?path=root,cluster-a,cluster-b
```

**Example:**
```
/graph?path=root,us-east-1,production,subnet-abc123
```

**Advantages:**

- Easier to add metadata
- Doesn't conflict with routing
- Simpler parsing

## Push State Pattern

### Basic Implementation

```typescript
useEffect(() => {
  const pathString = navigation.path
    .map(c => encodeURIComponent(c.id))
    .join('/');

  const url = `/graph/${pathString}`;

  window.history.pushState(
    { path: navigation.path, timestamp: Date.now() },
    '',
    url
  );
}, [navigation.path]);
```

**Key points:**

- `encodeURIComponent` - Handles special characters in IDs
- State object - Stores full cluster data for fast restore
- Empty title - Modern browsers don't use it
- Effect dependency - Only updates when path changes

### With Query Parameters

```typescript
useEffect(() => {
  const pathString = navigation.path.map(c => c.id).join(',');
  const query = new URLSearchParams({
    path: pathString,
    filter: activeFilter,
    type: selectedType
  });

  const url = `/graph?${query.toString()}`;

  window.history.pushState({ path: navigation.path }, '', url);
}, [navigation.path, activeFilter, selectedType]);
```

## Pop State Pattern (Back Button)

### Basic Back Button Support

```typescript
useEffect(() => {
  const handlePopState = (e: PopStateEvent) => {
    if (e.state?.path) {
      setNavigation(prev => ({
        ...prev,
        path: e.state.path,
        currentLevel: e.state.path.length - 1
      }));
    }
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
```

### With Animation

```typescript
useEffect(() => {
  const handlePopState = async (e: PopStateEvent) => {
    if (!e.state?.path) return;

    const targetLevel = e.state.path.length - 1;
    const currentLevel = navigation.currentLevel;

    if (targetLevel < currentLevel) {
      // Going back (drill up)
      await animateDrillUp();
    } else if (targetLevel > currentLevel) {
      // Going forward (drill down)
      const targetCluster = e.state.path[targetLevel];
      await animateDrillDown(targetCluster);
    }

    setNavigation(prev => ({
      ...prev,
      path: e.state.path,
      currentLevel: targetLevel
    }));
  };

  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [navigation.currentLevel]);
```

## Deep Linking

### Parse URL on Mount

```typescript
const parsePathFromUrl = (): string[] => {
  const pathname = window.location.pathname;

  // Path-based: /graph/root/cluster-a/cluster-b
  if (pathname.startsWith('/graph/')) {
    return pathname
      .replace('/graph/', '')
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent);
  }

  // Query-based: /graph?path=root,cluster-a,cluster-b
  const query = new URLSearchParams(window.location.search);
  const pathParam = query.get('path');

  if (pathParam) {
    return pathParam.split(',').map(decodeURIComponent);
  }

  return [];
};
```

### Restore Navigation from URL

```typescript
useEffect(() => {
  const restoreFromUrl = async () => {
    const pathIds = parsePathFromUrl();

    if (pathIds.length === 0) {
      // No path in URL, start at root
      const root = await fetchRootCluster();
      setNavigation({
        path: [root],
        currentLevel: 0,
        selections: new Map()
      });
      return;
    }

    // Fetch all clusters in path
    const clusters: ClusterNode[] = [];

    for (const id of pathIds) {
      try {
        const cluster = await fetchCluster(id);
        clusters.push(cluster);
      } catch (error) {
        console.error(`Failed to load cluster ${id}:`, error);
        break; // Stop at first error
      }
    }

    if (clusters.length > 0) {
      setNavigation({
        path: clusters,
        currentLevel: clusters.length - 1,
        selections: new Map()
      });
    }
  };

  restoreFromUrl();
}, []); // Run once on mount
```

### Error Handling

```typescript
const restoreFromUrlSafe = async () => {
  const pathIds = parsePathFromUrl();

  if (pathIds.length === 0) {
    return loadDefaultRoot();
  }

  const clusters: ClusterNode[] = [];
  const errors: string[] = [];

  for (const id of pathIds) {
    try {
      const cluster = await fetchCluster(id);
      clusters.push(cluster);
    } catch (error) {
      errors.push(id);
      break;
    }
  }

  if (errors.length > 0) {
    showNotification({
      title: 'Invalid navigation path',
      message: `Could not load cluster: ${errors.join(', ')}`,
      color: 'red'
    });

    // Fall back to deepest valid level
    if (clusters.length > 0) {
      setNavigation({
        path: clusters,
        currentLevel: clusters.length - 1,
        selections: new Map()
      });
    } else {
      return loadDefaultRoot();
    }
  } else {
    setNavigation({
      path: clusters,
      currentLevel: clusters.length - 1,
      selections: new Map()
    });
  }
};
```

## Query Parameter Preservation

### Preserve Filters During Navigation

```typescript
const preserveQueryParams = (
  newPath: ClusterNode[],
  currentQuery: URLSearchParams
): string => {
  const pathString = newPath.map(c => encodeURIComponent(c.id)).join('/');

  // Preserve existing query parameters
  const query = new URLSearchParams(currentQuery);

  // Add or update path
  query.set('path', pathString);

  return `/graph?${query.toString()}`;
};

const navigateWithFilters = (newCluster: ClusterNode) => {
  const currentQuery = new URLSearchParams(window.location.search);
  const url = preserveQueryParams(
    [...navigation.path, newCluster],
    currentQuery
  );

  window.history.pushState(
    { path: [...navigation.path, newCluster] },
    '',
    url
  );
};
```

### Read Query Parameters

```typescript
const getFiltersFromUrl = (): FilterState => {
  const query = new URLSearchParams(window.location.search);

  return {
    search: query.get('search') || '',
    type: query.get('type') || 'all',
    status: query.get('status') || 'all'
  };
};

useEffect(() => {
  const filters = getFiltersFromUrl();
  setFilters(filters);
}, [window.location.search]);
```

## React Router Integration

### With React Router v6

```typescript
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const HierarchicalGraph = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ '*': string }>();

  // Parse path from route params
  const pathIds = params['*']?.split('/').filter(Boolean) || [];

  useEffect(() => {
    restoreFromPathIds(pathIds);
  }, [pathIds]);

  const navigateToCluster = (cluster: ClusterNode) => {
    const newPath = [...navigation.path, cluster];
    const pathString = newPath.map(c => c.id).join('/');

    navigate(`/graph/${pathString}${location.search}`, {
      state: { path: newPath }
    });
  };

  // ...
};
```

### Route Configuration

```typescript
<Route path="/graph/*" element={<HierarchicalGraph />} />
```

## Encoding Special Characters

### Cluster IDs with Special Characters

```typescript
// Cluster ID: "us-east-1/production"
const encoded = encodeURIComponent("us-east-1/production");
// Result: "us-east-1%2Fproduction"

const decoded = decodeURIComponent(encoded);
// Result: "us-east-1/production"
```

### Unicode Characters

```typescript
// Cluster ID: "集群-A"
const encoded = encodeURIComponent("集群-A");
// Result: "%E9%9B%86%E7%BE%A4-A"

const decoded = decodeURIComponent(encoded);
// Result: "集群-A"
```

## Testing URL State

### Test URL Synchronization

