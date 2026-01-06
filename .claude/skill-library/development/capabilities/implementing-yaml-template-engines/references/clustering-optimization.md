# Clustering Optimization

**Request clustering optimization for executing multiple templates with one HTTP request.**

## Overview

Request clustering is a critical performance optimization that reduces HTTP requests by 10x or more. Instead of making N HTTP requests for N templates, group templates with identical requests and execute them once, then evaluate all templates against the same response.

**Primary source:** `github.com/projectdiscovery/nuclei` - Request deduplication and clustering logic

## Clustering Strategy

### Key Insight

Multiple templates often make identical HTTP requests:

```yaml
# Template 1: Detect Apache version
http:
  - method: GET
    path: ["{{BaseURL}}/"]

# Template 2: Detect exposed admin panel
http:
  - method: GET
    path: ["{{BaseURL}}/"]

# Template 3: Check for information disclosure
http:
  - method: GET
    path: ["{{BaseURL}}/"]
```

**Without clustering:** 3 identical GET requests
**With clustering:** 1 GET request, evaluate 3 templates

## Cluster Key Generation

```go
type ClusterKey struct {
    Method  string
    Path    string
    Body    string
    Headers string // Canonicalized
}

func (k ClusterKey) String() string {
    h := sha256.New()
    h.Write([]byte(k.Method))
    h.Write([]byte(k.Path))
    h.Write([]byte(k.Body))
    h.Write([]byte(k.Headers))
    return hex.EncodeToString(h.Sum(nil))
}

func generateClusterKey(req *HTTPRequest, ctx *VariableContext) ClusterKey {
    // Interpolate variables to get concrete request
    path := InterpolateString(req.Path[0], ctx)
    body := InterpolateString(req.Body, ctx)
    headers := canonicalizeHeaders(req.Headers, ctx)

    return ClusterKey{
        Method:  req.Method,
        Path:    path,
        Body:    body,
        Headers: headers,
    }
}

func canonicalizeHeaders(headers map[string]string, ctx *VariableContext) string {
    // Sort headers by key for consistent hashing
    keys := make([]string, 0, len(headers))
    for k := range headers {
        keys = append(keys, k)
    }
    sort.Strings(keys)

    var buf strings.Builder
    for _, k := range keys {
        value := InterpolateString(headers[k], ctx)
        buf.WriteString(k)
        buf.WriteString(":")
        buf.WriteString(value)
        buf.WriteString(";")
    }

    return buf.String()
}
```

## Cluster Building

```go
type TemplateCluster struct {
    Key       ClusterKey
    Request   *HTTPRequest
    Templates []*CompiledTemplate
}

func BuildClusters(templates []*CompiledTemplate, ctx *VariableContext) []*TemplateCluster {
    clusterMap := make(map[string]*TemplateCluster)

    for _, template := range templates {
        for _, req := range template.Requests {
            key := generateClusterKey(req, ctx)
            keyStr := key.String()

            cluster, ok := clusterMap[keyStr]
            if !ok {
                cluster = &TemplateCluster{
                    Key:       key,
                    Request:   req,
                    Templates: []*CompiledTemplate{},
                }
                clusterMap[keyStr] = cluster
            }

            cluster.Templates = append(cluster.Templates, template)
        }
    }

    // Convert map to slice
    clusters := make([]*TemplateCluster, 0, len(clusterMap))
    for _, cluster := range clusterMap {
        clusters = append(clusters, cluster)
    }

    return clusters
}
```

## Cluster Execution

```go
func ExecuteClusters(clusters []*TemplateCluster, target string) []*TemplateResult {
    var results []*TemplateResult
    var mu sync.Mutex

    var wg sync.WaitGroup
    for _, cluster := range clusters {
        wg.Add(1)
        go func(c *TemplateCluster) {
            defer wg.Done()

            // Execute ONE HTTP request
            response, err := executeHTTPRequest(c.Request, target)
            if err != nil {
                log.Errorf("Request failed: %v", err)
                return
            }

            // Evaluate ALL templates in cluster against same response
            for _, template := range c.Templates {
                matched := evaluateMatchers(template.Matchers, response)
                if matched {
                    result := &TemplateResult{
                        TemplateID: template.ID,
                        Matched:    true,
                        Response:   response,
                    }

                    mu.Lock()
                    results = append(results, result)
                    mu.Unlock()
                }
            }
        }(cluster)
    }

    wg.Wait()
    return results
}
```

## Advanced Clustering

### Multi-Path Clustering

Templates with multiple paths can still be clustered:

```yaml
# Template with path list
http:
  - method: GET
    path:
      - "{{BaseURL}}/admin"
      - "{{BaseURL}}/login"
```

```go
func BuildMultiPathClusters(templates []*CompiledTemplate, ctx *VariableContext) []*TemplateCluster {
    clusterMap := make(map[string]*TemplateCluster)

    for _, template := range templates {
        for _, req := range template.Requests {
            // Create a cluster for EACH path
            for _, pathExpr := range req.PathExpressions {
                path := InterpolateString(pathExpr, ctx)

                // Generate cluster key with specific path
                key := ClusterKey{
                    Method:  req.Method,
                    Path:    path,
                    Body:    InterpolateString(req.Body, ctx),
                    Headers: canonicalizeHeaders(req.Headers, ctx),
                }

                keyStr := key.String()
                if _, ok := clusterMap[keyStr]; !ok {
                    clusterMap[keyStr] = &TemplateCluster{
                        Key:       key,
                        Request:   req,
                        Templates: []*CompiledTemplate{},
                    }
                }

                clusterMap[keyStr].Templates = append(
                    clusterMap[keyStr].Templates, template)
            }
        }
    }

    return convertMapToClusters(clusterMap)
}
```

### Header Variations

Handle templates with variable-dependent headers:

```yaml
# Template A
http:
  - method: GET
    path: ["{{BaseURL}}/"]
    headers:
      User-Agent: "Scanner/1.0"

# Template B
http:
  - method: GET
    path: ["{{BaseURL}}/"]
    headers:
      User-Agent: "Mozilla/5.0"
```

**Solution:** These create separate clusters due to different headers.

## Cluster Statistics

```go
type ClusterStats struct {
    TotalTemplates   int
    TotalClusters    int
    RequestReduction float64 // Percentage reduction
    LargestCluster   int     // Most templates in one cluster
}

func CalculateStats(templates []*CompiledTemplate, clusters []*TemplateCluster) ClusterStats {
    totalRequests := 0
    for _, t := range templates {
        totalRequests += len(t.Requests)
    }

    largestCluster := 0
    for _, c := range clusters {
        if len(c.Templates) > largestCluster {
            largestCluster = len(c.Templates)
        }
    }

    reduction := 0.0
    if totalRequests > 0 {
        reduction = float64(totalRequests-len(clusters)) / float64(totalRequests) * 100
    }

    return ClusterStats{
        TotalTemplates:   len(templates),
        TotalClusters:    len(clusters),
        RequestReduction: reduction,
        LargestCluster:   largestCluster,
    }
}
```

## Performance Comparison

### Without Clustering

```go
// Execute each template individually
for _, template := range templates {
    for _, req := range template.Requests {
        response := httpClient.Do(req) // HTTP request
        if evaluateMatchers(template.Matchers, response) {
            // Found match
        }
    }
}
// Total HTTP requests: N templates × M requests = N*M requests
```

### With Clustering

```go
// Build clusters
clusters := BuildClusters(templates, ctx)

// Execute clusters
for _, cluster := range clusters {
    response := httpClient.Do(cluster.Request) // ONE HTTP request

    for _, template := range cluster.Templates {
        if evaluateMatchers(template.Matchers, response) {
            // Found match
        }
    }
}
// Total HTTP requests: K clusters (K << N*M)
```

**Benchmark results (example):**

- 1000 templates without clustering: 1000 HTTP requests
- 1000 templates with clustering: 100 HTTP requests (90% reduction)
- Scan time: 50 seconds → 5 seconds

## Cache Key Stability

**Problem:** Variable values change between scans, breaking clusters.

**Solution:** Use template-level variables, not target-specific variables:

```go
func generateStableClusterKey(req *HTTPRequest) ClusterKey {
    // Use template variables only ({{BaseURL}}, {{Path}})
    // Don't interpolate target-specific values yet

    return ClusterKey{
        Method:  req.Method,
        Path:    req.Path[0], // Keep template expression
        Body:    req.Body,
        Headers: canonicalizeTemplateHeaders(req.Headers),
    }
}
```

## When Clustering Fails

### Dynamic Content Requirements

Some templates REQUIRE different requests:

```yaml
# Template requires custom User-Agent per target
http:
  - method: GET
    path: ["{{BaseURL}}/"]
    headers:
      User-Agent: "{{CustomUserAgent}}"
```

**Solution:** Mark templates as non-clusterable:

```go
type HTTPRequest struct {
    Method      string
    Path        []string
    NonCluster  bool `yaml:"no-cluster"` // Opt-out flag
}

func BuildClusters(templates []*CompiledTemplate, ctx *VariableContext) []*TemplateCluster {
    // ... clustering logic

    // Handle non-clusterable templates separately
    for _, template := range templates {
        for _, req := range template.Requests {
            if req.NonCluster {
                // Create single-template cluster
                cluster := &TemplateCluster{
                    Key:       generateUniqueKey(),
                    Request:   req,
                    Templates: []*CompiledTemplate{template},
                }
                clusters = append(clusters, cluster)
            }
        }
    }

    return clusters
}
```

## Cluster Debugging

```go
func PrintClusterReport(clusters []*TemplateCluster) {
    fmt.Printf("=== Cluster Report ===\n")
    fmt.Printf("Total clusters: %d\n\n", len(clusters))

    for i, cluster := range clusters {
        fmt.Printf("Cluster %d:\n", i+1)
        fmt.Printf("  Method: %s\n", cluster.Key.Method)
        fmt.Printf("  Path: %s\n", cluster.Key.Path)
        fmt.Printf("  Templates: %d\n", len(cluster.Templates))

        for _, t := range cluster.Templates {
            fmt.Printf("    - %s\n", t.ID)
        }
        fmt.Println()
    }
}
```

## Integration with Nuclei

**Nuclei clustering features:**

- Automatic request deduplication
- Path-based clustering for multi-path templates
- Header normalization for consistent keys
- Opt-out mechanism for special cases

**Study these patterns:**

- How Nuclei generates cluster keys
- When clustering is disabled (e.g., race conditions)
- Cluster execution parallelization

## Best Practices

1. **Cluster Early**: Build clusters before execution, not during
2. **Stable Keys**: Use template expressions, not interpolated values
3. **Measure Impact**: Log reduction percentage for tuning
4. **Opt-Out Support**: Allow templates to disable clustering
5. **Test Coverage**: Verify clustering doesn't break matchers
6. **Debug Logging**: Print cluster assignments for troubleshooting

## Performance Gains

**Typical results:**

- Small template sets (10-100): 50-70% reduction
- Medium template sets (100-1000): 70-85% reduction
- Large template sets (1000+): 85-95% reduction

**Best case:** 100 templates → 5 clusters (95% reduction)
**Worst case:** 100 templates → 100 clusters (0% reduction, all unique)
