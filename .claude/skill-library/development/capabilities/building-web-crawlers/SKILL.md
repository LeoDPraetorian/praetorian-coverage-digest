---
name: building-web-crawlers
description: Use when implementing web crawlers in Go for security scanning - provides Colly and Katana patterns, three-mode architecture (standard/headless/passive), event-driven callbacks, rate limiting, and Chariot platform integration
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Building Web Crawlers for Security Scanning

**Guides developers in implementing Go web crawlers following industry-standard patterns from Colly (25k stars) and Katana (15k stars) with security-specific requirements.**

## When to Use

Use this skill when:

- Implementing a web crawler for security scanning in Go
- Building asset discovery tools that need to enumerate web resources
- Integrating crawlers with vulnerability scanners or fuzzing tools
- Designing multi-mode crawling systems (HTTP, headless, passive)
- Implementing rate-limited, politeness-aware crawlers

## Quick Reference

| Crawling Mode | Use Case                       | Speed | JS Support | Example Framework |
| ------------- | ------------------------------ | ----- | ---------- | ----------------- |
| **Standard**  | Simple sites, APIs, static     | Fast  | No         | Colly (net/http)  |
| **Headless**  | SPAs, dynamic content, JS apps | Slow  | Full       | chromedp          |
| **Passive**   | Historical data, no contact    | Fast  | No         | Wayback API       |

**For detailed mode selection criteria**, see [references/mode-selection.md](references/mode-selection.md)

---

## Three Crawling Modes (Katana Pattern)

### 1. Standard Mode (HTTP Client)

- **Library**: `net/http`, Colly framework
- **Speed**: Fast (100-1000 req/sec with proper rate limiting)
- **Use case**: Static sites, traditional web apps, APIs
- **Limitation**: No JavaScript execution

**When to use**: Default choice for most security scanning. Fastest, most reliable.

### 2. Headless Mode (Browser Automation)

- **Library**: `chromedp`, `rod`
- **Speed**: Slow (1-10 req/sec)
- **Use case**: Single-page applications (React, Vue, Angular), heavy JavaScript
- **Limitation**: Resource-intensive, requires Chrome/Chromium

**When to use**: When standard mode misses content, SPAs, complex JavaScript apps.

### 3. Passive Mode (Historical Data)

- **Sources**: Wayback Machine, CommonCrawl, VirusTotal
- **Speed**: Fast (API-limited)
- **Use case**: Historical reconnaissance, no target contact
- **Limitation**: Data may be outdated, incomplete coverage

**When to use**: Pre-engagement reconnaissance, compliance requirements prevent active scanning.

**For implementation details of each mode**, see [references/crawling-modes.md](references/crawling-modes.md)

---

## Collector Pattern (Colly Event Architecture)

Colly uses event-driven callbacks for extensible crawling:

```go
c := colly.NewCollector(
    colly.AllowedDomains("example.com"),
    colly.MaxDepth(3),
    colly.Async(true),
)

// Callbacks execute in order: Request → Response → HTML/XML → Scraped
c.OnRequest(func(r *colly.Request) {
    // Before request sent - add headers, log, modify
})

c.OnResponse(func(r *colly.Response) {
    // After response received - check status, extract metadata
})

c.OnHTML("a[href]", func(e *colly.HTMLElement) {
    // When HTML element matches selector - extract links
    link := e.Attr("href")
    c.Visit(e.Request.AbsoluteURL(link))
})

c.OnError(func(r *colly.Response, err error) {
    // Handle errors - retry logic, logging
})

c.OnScraped(func(r *colly.Response) {
    // After page fully processed - cleanup, final logging
})
```

**Key advantages**:

- Separation of concerns (link extraction, data parsing, error handling)
- Composable - add/remove callbacks without changing core logic
- Testable - mock individual callbacks

**For complete callback reference and patterns**, see [references/collector-callbacks.md](references/collector-callbacks.md)

---

## Concurrency & Rate Limiting

### Worker Pool Pattern

```go
c.Limit(&colly.LimitRule{
    DomainGlob:  "*example.com",
    Parallelism: 10,              // Max concurrent requests per domain
    Delay:       100 * time.Millisecond,  // Fixed delay between requests
    RandomDelay: 50 * time.Millisecond,   // Add random jitter
})
```

### Rate Limiting Strategies

| Strategy         | Use Case                       | Implementation                 |
| ---------------- | ------------------------------ | ------------------------------ |
| **Fixed Delay**  | Predictable load, simple sites | `Delay: 100ms`                 |
| **Token Bucket** | Burst traffic, API rate limits | `golang.org/x/time/rate`       |
| **Per-Domain**   | Multi-domain crawling          | `DomainGlob` in LimitRule      |
| **Adaptive**     | Responsive to server load      | Monitor response times, adjust |

**Critical for security scanning**: Rate limiting prevents detection and respects target infrastructure.

**For advanced rate limiting patterns**, see [references/rate-limiting.md](references/rate-limiting.md)

---

## Multi-Mode Architecture

Design crawlers with mode abstraction for flexibility:

```
pkg/crawler/
├── interface.go      # Crawler interface
├── standard.go       # net/http implementation (Colly)
├── headless.go       # chromedp implementation
├── passive.go        # Wayback/CommonCrawl
└── factory.go        # Mode selection logic
```

**Interface example**:

```go
type Crawler interface {
    Crawl(ctx context.Context, seed string, opts Options) (*Result, error)
    Subscribe(callback EventCallback) // Event-driven pattern
}

type Result struct {
    URLs      []string
    Forms     []Form
    JSFiles   []string
    Endpoints []Endpoint
}
```

**For complete architecture patterns**, see [references/architecture.md](references/architecture.md)

---

## Security-Specific Extraction

### 1. Form Detection

Extract forms for parameter fuzzing:

```go
c.OnHTML("form", func(e *colly.HTMLElement) {
    form := Form{
        Action: e.Attr("action"),
        Method: e.Attr("method"),
    }
    e.ForEach("input", func(_ int, el *colly.HTMLElement) {
        form.Inputs = append(form.Inputs, Input{
            Name: el.Attr("name"),
            Type: el.Attr("type"),
        })
    })
    // Store for fuzzing tool integration
})
```

### 2. JavaScript Endpoint Discovery

Identify API endpoints in JavaScript files:

```go
c.OnHTML("script[src]", func(e *colly.HTMLElement) {
    jsURL := e.Request.AbsoluteURL(e.Attr("src"))
    c.Visit(jsURL)
})

c.OnResponse(func(r *colly.Response) {
    if strings.Contains(r.Headers.Get("Content-Type"), "javascript") {
        // Extract API endpoints: /api/, fetch(), axios.get()
        endpoints := extractAPIPatterns(r.Body)
        // Feed to vulnerability scanner
    }
})
```

### 3. Cookie/Session Handling

Maintain session state for authenticated crawling:

```go
c.OnRequest(func(r *colly.Request) {
    r.Headers.Set("Cookie", "session="+sessionToken)
    r.Headers.Set("User-Agent", "SecurityScanner/1.0")
})
```

**For complete extraction patterns**, see [references/security-extraction.md](references/security-extraction.md)

---

## Chariot Platform Integration

### Asset Storage (Tabularium)

Store discovered resources in Chariot's universal data model:

```go
import "modules/tabularium/go/models"

// Convert crawl results to Asset entities
for _, url := range result.URLs {
    asset := &models.Asset{
        DNS:    extractDomain(url),
        Status: "A",  // Active
        Class:  "http",
        // ... other fields
    }
    // Store via Chariot API
}
```

### Janus Workflow Integration

Integrate crawler as a Janus workflow step:

```go
// pkg/capabilities/web-crawler/capability.go
func (c *WebCrawlerCapability) Execute(ctx context.Context, input *janus.Input) (*janus.Output, error) {
    crawler := NewStandardCrawler()
    result, err := crawler.Crawl(ctx, input.Seed, Options{
        MaxDepth: input.Config.MaxDepth,
    })
    return &janus.Output{
        Assets: result.URLs,
        // Feed to next step (e.g., vulnerability scanner)
    }, err
}
```

### Vulnerability Scanner Pipeline

Chain crawler output to scanner:

```
Crawler → URL List → Nuclei Templates → Vulnerabilities
```

**For complete integration patterns**, see [references/chariot-integration.md](references/chariot-integration.md)

---

## Implementation Checklist

Use this checklist when implementing a web crawler:

### Core Functionality

- [ ] Mode selection (standard/headless/passive)
- [ ] Event-driven callback architecture (OnRequest, OnResponse, OnHTML, OnError)
- [ ] Worker pool with configurable parallelism
- [ ] Depth control and URL filtering (avoid infinite loops)
- [ ] Redirect handling (follow or stop at configurable depth)

### Rate Limiting & Politeness

- [ ] Per-domain rate limiting (respect target infrastructure)
- [ ] robots.txt parsing (configurable - obey or ignore)
- [ ] User-Agent configuration (identify scanner, not masquerade)
- [ ] Politeness delay between requests (default: 100-500ms)
- [ ] Retry logic with exponential backoff (handle transient errors)

### Security Extraction

- [ ] Form detection and parameter extraction (for fuzzing)
- [ ] JavaScript endpoint discovery (fetch(), axios, etc.)
- [ ] Cookie/session handling (authenticated crawling)
- [ ] SSL certificate extraction (for trust analysis)
- [ ] Response header analysis (security headers)

### Platform Integration

- [ ] Tabularium Asset model conversion (store in Chariot)
- [ ] Janus capability implementation (workflow orchestration)
- [ ] Error handling and logging (structured logs)
- [ ] Configuration via environment/CLI flags

**For detailed implementation guidance**, see [references/implementation-guide.md](references/implementation-guide.md)

---

## Common Pitfalls & Solutions

| Pitfall                           | Problem                               | Solution                                 |
| --------------------------------- | ------------------------------------- | ---------------------------------------- |
| **Single-threaded crawling**      | Slow, wastes time                     | Use worker pools (`Parallelism: 10+`)    |
| **No rate limiting**              | Gets blocked, banned                  | Fixed delay + jitter + per-domain limits |
| **Ignoring JavaScript**           | Misses SPA endpoints                  | Use headless mode for JS-heavy sites     |
| **No depth limits**               | Infinite loops, never completes       | Set `MaxDepth: 3-5`                      |
| **Poor redirect handling**        | Loops, external domains               | Limit redirect depth, check domains      |
| **No error recovery**             | Fails on first timeout                | Retry with exponential backoff           |
| **Not respecting robots.txt**     | Ethical/legal issues                  | Parse robots.txt, make configurable      |
| **Synchronous design**            | Can't parallelize later               | Design with async patterns from start    |
| **Missing URL normalization**     | Crawls same page multiple times       | Normalize before deduplication           |
| **Inadequate session management** | Loses auth, can't crawl private areas | Cookie jar + session token refresh       |

**For troubleshooting patterns**, see [references/troubleshooting.md](references/troubleshooting.md)

---

## Reference Materials

### Primary Sources (Study These)

- **Colly**: https://github.com/gocolly/colly - Event-driven Go web scraping framework
- **Colly Docs**: http://go-colly.org/docs/ - Official documentation with examples
- **Katana**: https://github.com/projectdiscovery/katana - Three-mode crawler (standard/headless/passive)
- **Katana Docs**: https://docs.projectdiscovery.io/tools/katana/overview - ProjectDiscovery documentation
- **Hakrawler**: https://github.com/hakluke/hakrawler - Security-focused crawler
- **GoSpider**: https://github.com/jaeles-project/gospider - Fast web spider for pentesters

### Key Implementation Files

Study these files when implementing:

- `colly/colly.go` - Core Collector implementation and event loop
- `colly/request.go` - Request handling and queueing
- `katana/pkg/engine/standard/` - Standard HTTP mode implementation
- `katana/pkg/engine/hybrid/` - Headless browser integration
- `katana/pkg/engine/passive/` - Wayback Machine and CommonCrawl APIs

### Go Libraries

Essential libraries for crawler implementation:

- `github.com/gocolly/colly/v2` - Web scraping framework with callbacks
- `github.com/chromedp/chromedp` - Headless Chrome automation
- `github.com/PuerkitoBio/goquery` - jQuery-like HTML parsing
- `golang.org/x/net/html` - Low-level HTML tokenizer
- `golang.org/x/time/rate` - Token bucket rate limiter

---

## Progressive Disclosure

**Quick Start (15 min)**:

- Choose mode (standard/headless/passive) based on target
- Use Colly with basic callbacks (OnHTML, OnError)
- Add fixed-delay rate limiting
- Extract URLs and forms

**Intermediate (60 min)**:

- Implement multi-mode architecture with factory pattern
- Add per-domain rate limiting and adaptive delays
- Extract JavaScript endpoints and API patterns
- Integrate with Chariot Asset model

**Advanced (3+ hours)**:

- Build Janus capability with error recovery
- Implement passive mode with Wayback/CommonCrawl
- Add authenticated crawling with session management
- Create custom callbacks for vulnerability-specific extraction

---

## Related Skills

- `orchestrating-capability-development` - Complete workflow for capability development
- `enforcing-go-capability-architecture` - Go capability patterns for Chariot
- `integrating-standalone-capabilities` - Add crawler to Janus framework
- `implementing-graphql-clients` - API patterns for data fetching
- `go-errgroup-concurrency` - Worker pool and error group patterns

---

## Changelog

See `.history/CHANGELOG` for version history.
