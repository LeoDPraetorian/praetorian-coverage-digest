# Pagination Testing

**Testing patterns for paginated API responses in Go integration tests.**

## Two Pagination Approaches

### Application-Layer Pagination (Chariot Pattern)

**Pattern**: Cursor-based continuation in application logic, HTTP layer doesn't know about pagination.

```go
func (task *Integration) Discover() error {
    apiURL := task.BaseURL + "/resources"

    for apiURL != "" {
        result, err := web.Request[Response](apiURL, task.Token)
        if err != nil {
            return err
        }

        // Send each item
        for _, item := range result.Items {
            asset := model.NewAsset(item.ID, item.Name)
            task.job.Send(&asset)
        }

        // Continue to next page
        apiURL = result.NextPageURL  // Cursor-based
    }

    return nil
}
```

**Testing**:
```go
func TestIntegration_Pagination(t *testing.T) {
    page1Called := false
    page2Called := false

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        page := r.URL.Query().Get("page")

        if page == "" || page == "1" {
            page1Called = true
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(Response{
                Items: []Item{{ID: "1"}, {ID: "2"}},
                NextPageURL: server.URL + "/resources?page=2",
            })
        } else if page == "2" {
            page2Called = true
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(Response{
                Items: []Item{{ID: "3"}, {ID: "4"}},
                NextPageURL: "",  // Last page
            })
        }
    }))
    defer server.Close()

    task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()
    require.NoError(t, err)

    // Verify both pages were called
    assert.True(t, page1Called)
    assert.True(t, page2Called)

    // Verify all 4 assets collected
    assert.Equal(t, 4, len(aws.Graph.Nodes))
}
```

### HTTP-Layer Pagination (Link Headers, Page Tokens)

**Pattern**: Pagination metadata in HTTP headers or response body.

```go
func TestAPI_LinkHeaderPagination(t *testing.T) {
    currentPage := 1

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        pageParam := r.URL.Query().Get("page")
        if pageParam != "" {
            fmt.Sscanf(pageParam, "%d", &currentPage)
        }

        if currentPage == 1 {
            w.Header().Set("Link", `<http://api.example.com/users?page=2>; rel="next"`)
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode([]User{{ID: "1"}, {ID: "2"}})
        } else if currentPage == 2 {
            // Last page - no Link header
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode([]User{{ID: "3"}, {ID: "4"}})
        }
    }))
    defer server.Close()

    client := NewAPIClient(server.URL)
    users, err := client.FetchAllUsers()
    require.NoError(t, err)
    assert.Len(t, users, 4)
}
```

## Page Token Pattern

```go
func TestAPI_PageTokenPagination(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        pageToken := r.URL.Query().Get("page_token")

        if pageToken == "" {
            // First page
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(map[string]interface{}{
                "data": []map[string]string{
                    {"id": "1", "name": "Alice"},
                    {"id": "2", "name": "Bob"},
                },
                "next_page_token": "token-abc123",
            })
        } else if pageToken == "token-abc123" {
            // Second page
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(map[string]interface{}{
                "data": []map[string]string{
                    {"id": "3", "name": "Charlie"},
                    {"id": "4", "name": "Diana"},
                },
                "next_page_token": "",  // Last page
            })
        }
    }))
    defer server.Close()

    client := NewAPIClient(server.URL)
    users, err := client.FetchAllUsers()
    require.NoError(t, err)
    assert.Len(t, users, 4)
}
```

## Testing maxPages Limit (Prevent Infinite Loops)

```go
func TestIntegration_MaxPagesLimit(t *testing.T) {
    requestCount := 0

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestCount++
        
        // Always return next page (simulating infinite pagination)
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(Response{
            Items: []Item{{ID: fmt.Sprintf("%d", requestCount)}},
            NextPageURL: server.URL + fmt.Sprintf("/resources?page=%d", requestCount+1),
        })
    }))
    defer server.Close()

    task := NewIntegration(job, &integration, 
        base.WithHTTPBaseURL(server.URL),
        base.WithMaxPages(5),  // Limit to 5 pages
    )
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()
    require.NoError(t, err)

    // Verify only 5 pages were fetched
    assert.Equal(t, 5, requestCount)
    assert.Equal(t, 5, len(aws.Graph.Nodes))
}
```

## Empty Response Handling

```go
func TestIntegration_EmptyResponse(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(Response{
            Items:       []Item{},  // Empty
            NextPageURL: "",
        })
    }))
    defer server.Close()

    task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()
    require.NoError(t, err)

    // Should complete without error
    assert.Equal(t, 0, len(aws.Graph.Nodes))
}
```

## Multi-Page Scenarios

```go
func TestIntegration_ThreePages(t *testing.T) {
    pages := [][]Item{
        {{ID: "1"}, {ID: "2"}},  // Page 1
        {{ID: "3"}, {ID: "4"}},  // Page 2
        {{ID: "5"}},             // Page 3
    }

    currentPage := 0

    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if currentPage >= len(pages) {
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode(Response{Items: []Item{}, NextPageURL: ""})
            return
        }

        nextPageURL := ""
        if currentPage < len(pages)-1 {
            nextPageURL = server.URL + fmt.Sprintf("/resources?page=%d", currentPage+1)
        }

        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(Response{
            Items:       pages[currentPage],
            NextPageURL: nextPageURL,
        })

        currentPage++
    }))
    defer server.Close()

    task := NewIntegration(job, &integration, base.WithHTTPBaseURL(server.URL))
    aws := mock.NewMockAWS("test@example.com")

    inv := invoker.NewInvoker(aws, task)
    err := inv.Invoke()
    require.NoError(t, err)

    assert.Equal(t, 5, len(aws.Graph.Nodes))  // 2 + 2 + 1 = 5
}
```

## Best Practices

1. ✅ Test empty responses (no panic, no error)
2. ✅ Test single-page responses (no nextPageURL)
3. ✅ Test multi-page responses (verify all pages fetched)
4. ✅ Test maxPages limit enforcement (prevent infinite loops)
5. ✅ Verify page count with request counter
6. ✅ Use stateful mock servers to track pagination state

## References

- Application-layer pagination example: `modules/chariot/backend/pkg/tasks/integrations/entraid/entraid.go:147`
- Mock pagination in xpanse: `modules/chariot/backend/pkg/tasks/integrations/xpanse/xpanse_mock.go`
