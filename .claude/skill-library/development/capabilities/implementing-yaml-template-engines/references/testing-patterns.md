# Testing Patterns

**Testing patterns with unit/integration/e2e test pyramid for template engines.**

## Test Pyramid

```
      E2E Tests (5%)
    ┌────────────────┐
    │ Real targets   │
    │ Full workflow  │
    └────────────────┘

    Integration Tests (15%)
  ┌──────────────────────┐
  │ Template execution   │
  │ Mock HTTP responses  │
  └──────────────────────┘

  Unit Tests (80%)
┌────────────────────────────┐
│ Parser, Compiler, Matcher  │
│ Extractor, DSL, Registry   │
└────────────────────────────┘
```

## Unit Tests (80%)

### Parser Tests

```go
func TestParseTemplate(t *testing.T) {
    yaml := `
id: test-template
info:
  name: Test
  severity: high
http:
  - method: GET
    path: ["{{BaseURL}}/"]
    matchers:
      - type: word
        words: ["admin"]
`

    template, err := ParseTemplate([]byte(yaml))
    require.NoError(t, err)
    assert.Equal(t, "test-template", template.ID)
    assert.Equal(t, "high", template.Info.Severity)
}

func TestParseInvalidTemplate(t *testing.T) {
    yaml := `invalid yaml: [unclosed`

    _, err := ParseTemplate([]byte(yaml))
    require.Error(t, err)

    var parseErr *ParseError
    assert.True(t, errors.As(err, &parseErr))
    assert.Greater(t, parseErr.Line, 0)
}
```

### Matcher Tests

```go
func TestWordMatcher(t *testing.T) {
    matcher := &WordMatcher{
        Words: []string{"admin", "root"},
    }

    tests := []struct {
        name     string
        body     string
        expected bool
    }{
        {"match admin", "Welcome to admin panel", true},
        {"match root", "root user detected", true},
        {"no match", "regular content", false},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            response := &Response{Body: tt.body}
            assert.Equal(t, tt.expected, matcher.Match(response))
        })
    }
}

func TestRegexMatcher(t *testing.T) {
    matcher := &RegexMatcher{
        Patterns: []*regexp.Regexp{
            regexp.MustCompile(`admin.*panel`),
        },
    }

    assert.True(t, matcher.Match(&Response{Body: "admin control panel"}))
    assert.False(t, matcher.Match(&Response{Body: "user dashboard"}))
}
```

### Extractor Tests

```go
func TestJSONExtractor(t *testing.T) {
    extractor := &JSONExtractor{
        JSON: []string{"$.user.id", "$.data.token"},
    }

    body := `{"user": {"id": "123"}, "data": {"token": "abc"}}`
    response := &Response{Body: body}

    values := extractor.Extract(response)
    assert.ElementsMatch(t, []string{"123", "abc"}, values)
}
```

## Integration Tests (15%)

### Template Execution Tests

```go
func TestExecuteTemplate(t *testing.T) {
    // Mock HTTP server
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(200)
        w.Write([]byte("admin panel detected"))
    }))
    defer server.Close()

    // Load and compile template
    template := loadTestTemplate("admin-detection.yaml")
    compiled, err := CompileTemplate(template)
    require.NoError(t, err)

    // Execute
    result, err := Execute(compiled, server.URL)
    require.NoError(t, err)

    assert.True(t, result.Matched)
}
```

### Registry Tests

```go
func TestRegistryLoadAndGet(t *testing.T) {
    registry := NewRegistry(NewFileLoader())

    err := registry.LoadFromDirectory("testdata/templates")
    require.NoError(t, err)

    template, ok := registry.Get("admin-panel-detection")
    assert.True(t, ok)
    assert.NotNil(t, template)
}

func TestRegistryHotReload(t *testing.T) {
    tmpDir := t.TempDir()
    registry := NewRegistry(NewFileLoader())

    // Initial load
    writeTemplate(tmpDir, "test.yaml", templateV1)
    registry.LoadFromDirectory(tmpDir)

    template1, _ := registry.Get("test")
    assert.Equal(t, 1, template1.Version)

    // Update template
    writeTemplate(tmpDir, "test.yaml", templateV2)
    registry.reloadTemplate(filepath.Join(tmpDir, "test.yaml"))

    template2, _ := registry.Get("test")
    assert.Equal(t, 2, template2.Version)
}
```

### Clustering Tests

```go
func TestRequestClustering(t *testing.T) {
    templates := []*CompiledTemplate{
        {ID: "t1", Requests: []HTTPRequest{{Method: "GET", Path: "/"}}},
        {ID: "t2", Requests: []HTTPRequest{{Method: "GET", Path: "/"}}},
        {ID: "t3", Requests: []HTTPRequest{{Method: "POST", Path: "/"}}},
    }

    clusters := BuildClusters(templates, &VariableContext{})

    // t1 and t2 should be in same cluster (identical GET /)
    // t3 should be in different cluster (POST)
    assert.Len(t, clusters, 2)

    getCluster := findCluster(clusters, "GET", "/")
    assert.Len(t, getCluster.Templates, 2)

    postCluster := findCluster(clusters, "POST", "/")
    assert.Len(t, postCluster.Templates, 1)
}
```

## E2E Tests (5%)

### Full Workflow Tests

```go
func TestEndToEndDetection(t *testing.T) {
    // Start real vulnerable app
    app := startVulnerableApp()
    defer app.Close()

    // Load real templates
    registry := NewRegistry(NewFileLoader())
    registry.LoadFromDirectory("templates/")

    // Execute scan
    scanner := NewScanner(registry)
    results := scanner.Scan(app.URL)

    // Verify detections
    assert.True(t, hasMatch(results, "admin-panel-exposed"))
    assert.True(t, hasMatch(results, "default-credentials"))
}
```

### Performance Tests

```go
func TestScanPerformance(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping performance test")
    }

    registry := NewRegistry(NewFileLoader())
    registry.LoadFromDirectory("templates/")

    start := time.Now()
    scanner := NewScanner(registry)
    _ = scanner.Scan("http://testsite.local")

    duration := time.Since(start)
    assert.Less(t, duration, 30*time.Second, "Scan should complete in <30s")
}
```

## Test Fixtures

### Template Fixtures

```go
// testdata/templates/test-word-matcher.yaml
const testWordMatcherTemplate = `
id: test-word-matcher
info:
  name: Test Word Matcher
  severity: info
http:
  - method: GET
    path: ["{{BaseURL}}/"]
    matchers:
      - type: word
        words: ["test"]
`

func loadTestTemplate(name string) *Template {
    data, _ := os.ReadFile(filepath.Join("testdata/templates", name))
    template, _ := ParseTemplate(data)
    return template
}
```

### Response Fixtures

```go
func mockResponse(statusCode int, body string) *Response {
    return &Response{
        StatusCode: statusCode,
        Headers:    make(map[string]string),
        Body:       body,
    }
}
```

## Coverage Targets

- **Unit tests**: >80% coverage
- **Integration tests**: Critical paths covered
- **E2E tests**: Real-world scenarios covered

See: chariot-integration.md for Chariot-specific testing patterns
