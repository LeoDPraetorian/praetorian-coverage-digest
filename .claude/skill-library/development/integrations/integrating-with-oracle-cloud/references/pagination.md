# OCI Pagination Patterns

**Complete guide to handling paginated results in Oracle Cloud Infrastructure SDK operations.**

Source: Official OCI SDK Documentation, GitHub Examples

---

## Overview

OCI list operations return paginated results to prevent overwhelming responses. Results are split into pages with continuation tokens.

**Key Concepts:**

- **Page size (limit)**: Number of items per page (default varies by service, typically 100)
- **Page token**: Opaque token for fetching next page (`opc-next-page` header)
- **Total items**: Often unknown until fetching all pages
- **Order**: Results ordered by resource creation time (newest first, typically)

---

## Go SDK Pagination

### Manual Pagination

**Pattern:** Use `opc-next-page` response header to fetch subsequent pages.

```go
import (
    "context"
    "github.com/oracle/oci-go-sdk/v65/common"
    "github.com/oracle/oci-go-sdk/v65/core"
)

func listAllInstances(client core.ComputeClient, compartmentId string) ([]core.Instance, error) {
    var allInstances []core.Instance

    request := core.ListInstancesRequest{
        CompartmentId: common.String(compartmentId),
        Limit:         common.Int(100), // Items per page
    }

    for {
        response, err := client.ListInstances(context.Background(), request)
        if err != nil {
            return nil, err
        }

        // Collect instances from this page
        allInstances = append(allInstances, response.Items...)

        // Check if more pages exist
        if response.OpcNextPage == nil {
            break // No more pages
        }

        // Set page token for next request
        request.Page = response.OpcNextPage
    }

    return allInstances, nil
}
```

**Key Points:**

- `response.OpcNextPage` contains next page token (nil when no more pages)
- Set `request.Page` to continue from last position
- Loop until `OpcNextPage` is nil

### ListPager Helper (Recommended)

**Pattern:** Use built-in pager for cleaner code.

```go
import "github.com/oracle/oci-go-sdk/v65/core"

func listAllInstancesWithPager(client core.ComputeClient, compartmentId string) ([]core.Instance, error) {
    var allInstances []core.Instance

    request := core.ListInstancesRequest{
        CompartmentId: common.String(compartmentId),
        Limit:         common.Int(100),
    }

    // Create pager
    pager := core.NewListInstancesPager(client, request)

    // Iterate through pages
    for pager.HasNextPage() {
        page, err := pager.GetNextPage(context.Background())
        if err != nil {
            return nil, err
        }

        allInstances = append(allInstances, page.Items...)
    }

    return allInstances, nil
}
```

**Advantages:**

- Simpler code (no manual token management)
- Built-in error handling
- Consistent API across services

**Available Pagers:**

- `core.NewListInstancesPager`
- `core.NewListVcnsPager`
- `objectstorage.NewListObjectsPager`
- `identity.NewListUsersPager`
- Most list operations have corresponding pagers

---

## Python SDK Pagination

### Manual Pagination

```python
from oci.core import ComputeClient

def list_all_instances(client: ComputeClient, compartment_id: str):
    all_instances = []
    page = None

    while True:
        response = client.list_instances(
            compartment_id=compartment_id,
            limit=100,
            page=page
        )

        all_instances.extend(response.data)

        # Check for next page
        if not response.headers.get('opc-next-page'):
            break

        page = response.headers['opc-next-page']

    return all_instances
```

### Pagination Utilities (Recommended)

**Eager Loading (load all pages at once):**

```python
from oci.pagination import list_call_get_all_results

# Fetch all pages and return complete list
all_instances = list_call_get_all_results(
    client.list_instances,
    compartment_id=compartment_id
).data
```

**Lazy Loading (generator for memory efficiency):**

```python
from oci.pagination import list_call_get_all_results_generator

# Generator yields one response at a time (memory efficient)
for response in list_call_get_all_results_generator(
    client.list_instances,
    'data',  # Extract 'data' field from each response
    compartment_id=compartment_id
):
    for instance in response:
        process_instance(instance)
```

**Record-Level Iteration:**

```python
# Generator yields individual records (most convenient)
for instance in list_call_get_all_results_generator(
    client.list_instances,
    'data',
    compartment_id=compartment_id
):
    process_instance(instance)
```

**Advantages:**

- `list_call_get_all_results`: Simple, fetches everything upfront
- `list_call_get_all_results_generator`: Memory efficient for large datasets
- Automatic pagination handling

---

## TypeScript SDK Pagination

### Manual Pagination

```typescript
import * as core from "oci-core";
import * as common from "oci-common";

async function listAllInstances(
  client: core.ComputeClient,
  compartmentId: string
): Promise<core.models.Instance[]> {
  const allInstances: core.models.Instance[] = [];
  let page: string | undefined;

  do {
    const request: core.requests.ListInstancesRequest = {
      compartmentId: compartmentId,
      limit: 100,
      page: page,
    };

    const response = await client.listInstances(request);
    allInstances.push(...response.items);

    // Get next page token from header
    page = response.opcNextPage;
  } while (page);

  return allInstances;
}
```

### Async Iterator Pattern

```typescript
async function* paginateInstances(
  client: core.ComputeClient,
  compartmentId: string
): AsyncIterableIterator<core.models.Instance> {
  let page: string | undefined;

  do {
    const response = await client.listInstances({
      compartmentId,
      limit: 100,
      page,
    });

    for (const instance of response.items) {
      yield instance;
    }

    page = response.opcNextPage;
  } while (page);
}

// Usage
for await (const instance of paginateInstances(client, compartmentId)) {
  processInstance(instance);
}
```

---

## Pagination Best Practices

### 1. Set Appropriate Limit

**Too Small:**

- More API calls
- Higher latency
- Increased risk of rate limiting

**Too Large:**

- Potential timeout on slow networks
- Memory pressure
- Some services cap limit (e.g., max 1000)

**Recommended:**

- Start with 100-500 items per page
- Adjust based on item size and network conditions

```go
request := core.ListInstancesRequest{
    CompartmentId: common.String(compartmentId),
    Limit:         common.Int(500), // Reasonable default
}
```

### 2. Handle Empty Pages

```python
response = client.list_instances(compartment_id=compartment_id)

if not response.data:
    print("No instances found")
    return []

# Continue processing
```

### 3. Timeout Considerations

For large datasets, use context with timeout:

```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
defer cancel()

pager := core.NewListInstancesPager(client, request)
for pager.HasNextPage() {
    page, err := pager.GetNextPage(ctx) // Use context with timeout
    if err != nil {
        return nil, err
    }
    // Process page
}
```

### 4. Progress Tracking

```python
total_count = 0
page_count = 0

for response in list_call_get_all_results_generator(
    client.list_instances,
    'data',
    compartment_id=compartment_id
):
    page_count += 1
    total_count += len(response)
    print(f"Fetched page {page_count}, total items: {total_count}")
```

### 5. Concurrent Page Fetching (Advanced)

**⚠️ Warning:** May violate rate limits. Use carefully.

```go
import "golang.org/x/sync/errgroup"

func listAllInstancesConcurrent(client core.ComputeClient, compartmentId string) ([]core.Instance, error) {
    // First, get first page to determine if pagination needed
    firstRequest := core.ListInstancesRequest{
        CompartmentId: common.String(compartmentId),
        Limit:         common.Int(100),
    }

    firstResponse, err := client.ListInstances(context.Background(), firstRequest)
    if err != nil {
        return nil, err
    }

    instances := firstResponse.Items

    // If no more pages, return
    if firstResponse.OpcNextPage == nil {
        return instances, nil
    }

    // Fetch remaining pages concurrently (use with caution - rate limits!)
    var mu sync.Mutex
    g, ctx := errgroup.WithContext(context.Background())

    page := firstResponse.OpcNextPage
    for page != nil {
        currentPage := page
        g.Go(func() error {
            request := core.ListInstancesRequest{
                CompartmentId: common.String(compartmentId),
                Limit:         common.Int(100),
                Page:          currentPage,
            }

            response, err := client.ListInstances(ctx, request)
            if err != nil {
                return err
            }

            mu.Lock()
            instances = append(instances, response.Items...)
            mu.Unlock()

            return nil
        })

        // Move to next page (sequential to build page list)
        nextRequest := core.ListInstancesRequest{
            CompartmentId: common.String(compartmentId),
            Limit:         common.Int(100),
            Page:          page,
        }
        nextResponse, _ := client.ListInstances(context.Background(), nextRequest)
        page = nextResponse.OpcNextPage
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }

    return instances, nil
}
```

---

## Filtering with Pagination

Combine filters with pagination for efficient queries:

### Go

```go
request := core.ListInstancesRequest{
    CompartmentId:     common.String(compartmentId),
    AvailabilityDomain: common.String("US-ASHBURN-AD-1"),
    LifecycleState:    core.InstanceLifecycleStateRunning,
    Limit:             common.Int(100),
}

pager := core.NewListInstancesPager(client, request)
for pager.HasNextPage() {
    page, err := pager.GetNextPage(context.Background())
    if err != nil {
        return err
    }

    for _, instance := range page.Items {
        // Process running instances in AD-1
    }
}
```

### Python

```python
# Filter + pagination
running_instances = list_call_get_all_results(
    client.list_instances,
    compartment_id=compartment_id,
    availability_domain='US-ASHBURN-AD-1',
    lifecycle_state='RUNNING'
).data
```

---

## Sorting with Pagination

Some list operations support sorting:

```go
request := core.ListInstancesRequest{
    CompartmentId: common.String(compartmentId),
    SortBy:        core.ListInstancesSortByTimecreated,
    SortOrder:     core.ListInstancesSortOrderDesc, // Newest first
    Limit:         common.Int(100),
}
```

**Available Sort Options:**

- `SortBy`: Field to sort by (TIMECREATED, DISPLAYNAME)
- `SortOrder`: ASC or DESC

---

## Pagination and Rate Limiting

**Important:** Each paginated request counts toward API rate limits.

**Example:** Fetching 10,000 items with limit=100 requires 100 API calls.

**Mitigation:**

- Increase page size (within service limits)
- Implement exponential backoff for 429 errors
- Use filters to reduce result set
- Cache results when appropriate

```python
from time import sleep

for response in list_call_get_all_results_generator(
    client.list_instances,
    'data',
    compartment_id=compartment_id
):
    process_batch(response)

    # Rate limit protection: pause between pages
    sleep(0.1)  # 100ms delay
```

---

## Testing Pagination

### Mock Paginated Responses

**Go:**

```go
func TestPagination(t *testing.T) {
    // Mock first page
    firstPage := core.ListInstancesResponse{
        Items: []core.Instance{{DisplayName: common.String("instance-1")}},
        OpcNextPage: common.String("page-token-2"),
    }

    // Mock second page
    secondPage := core.ListInstancesResponse{
        Items: []core.Instance{{DisplayName: common.String("instance-2")}},
        OpcNextPage: nil, // Last page
    }

    // Test pagination logic with mocked responses
}
```

**Python:**

```python
from unittest.mock import Mock, MagicMock

def test_pagination():
    client = Mock()

    # Mock responses
    response1 = Mock()
    response1.data = [{'id': '1'}]
    response1.headers = {'opc-next-page': 'token-2'}

    response2 = Mock()
    response2.data = [{'id': '2'}]
    response2.headers = {}  # No next page

    client.list_instances.side_effect = [response1, response2]

    # Test pagination function
    all_items = list_all_instances(client, 'comp-id')
    assert len(all_items) == 2
```

---

## Common Pitfalls

| Pitfall                            | Problem                       | Solution                                       |
| ---------------------------------- | ----------------------------- | ---------------------------------------------- |
| **Not checking for more pages**    | Incomplete results            | Always check `opc-next-page` or use pager      |
| **Infinite loop**                  | Page token not updated        | Ensure `page` parameter updates each iteration |
| **Memory exhaustion**              | Loading all pages into memory | Use generators for large datasets              |
| **Rate limit exceeded**            | Too many rapid requests       | Add delays or use backoff strategy             |
| **Missing limit parameter**        | Default limit may be small    | Explicitly set limit for efficiency            |
| **Ignoring errors mid-pagination** | Partial results returned      | Handle errors and decide: retry page or fail   |

---

## References

- **Go SDK Pagination Example**: [example_core_pagination_test.go](https://github.com/oracle/oci-go-sdk/blob/master/example/example_core_pagination_test.go)
- **Python SDK Pagination**: [pagination.py](https://github.com/oracle/oci-python-sdk/blob/master/examples/pagination.py)
- **Python Pagination Utilities**: [oci.pagination module](https://github.com/oracle/oci-python-sdk/tree/master/src/oci/pagination)
- **Official Docs**: [Pagination - OCI SDK](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/usingapi.htm#Pagination)
