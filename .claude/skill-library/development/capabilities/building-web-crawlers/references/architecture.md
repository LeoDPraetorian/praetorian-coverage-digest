# Multi-Mode Crawler Architecture

**Design patterns for building flexible, extensible web crawlers with multiple modes.**

## Interface-Based Design

### Core Interfaces

```go
package crawler

import "context"

// Crawler defines the main crawling interface
type Crawler interface {
    Crawl(ctx context.Context, seed string, opts Options) (*Result, error)
    Subscribe(callback EventCallback)
    Close() error
}

// Options configures crawling behavior
type Options struct {
    MaxDepth      int
    Parallelism   int
    RateLimit     float64
    UserAgent     string
    Timeout       time.Duration
    FollowRedirects bool
    RespectRobotsTxt bool
}

// Result contains discovered resources
type Result struct {
    URLs      []string
    Forms     []Form
    JSFiles   []string
    Endpoints []Endpoint
    Cookies   []Cookie
    Errors    []error
}

// EventCallback handles crawl events
type EventCallback func(event Event)

// Event represents a crawl event
type Event struct {
    Type      EventType
    URL       string
    Timestamp time.Time
    Data      interface{}
}

type EventType int

const (
    EventURLDiscovered EventType = iota
    EventPageCrawled
    EventError
    EventComplete
)
```

---

## Factory Pattern

### Mode Selection

```go
package crawler

type Mode string

const (
    ModeStandard Mode = "standard"
    ModeHeadless Mode = "headless"
    ModePassive  Mode = "passive"
)

// Factory creates crawlers based on mode
type Factory struct {
    config Config
}

func NewFactory(config Config) *Factory {
    return &Factory{config: config}
}

func (f *Factory) Create(mode Mode) (Crawler, error) {
    switch mode {
    case ModeStandard:
        return NewStandardCrawler(f.config), nil
    case ModeHeadless:
        return NewHeadlessCrawler(f.config), nil
    case ModePassive:
        return NewPassiveCrawler(f.config), nil
    default:
        return nil, fmt.Errorf("unknown mode: %s", mode)
    }
}

// Auto-detect best mode based on URL
func (f *Factory) CreateAuto(ctx context.Context, url string) (Crawler, error) {
    // Quick probe to detect JS frameworks
    hasJS, err := detectJavaScript(ctx, url)
    if err != nil {
        return nil, err
    }

    if hasJS {
        return f.Create(ModeHeadless)
    }

    return f.Create(ModeStandard)
}
```

---

## Standard Mode Implementation

```go
package crawler

import "github.com/gocolly/colly/v2"

type StandardCrawler struct {
    collector *colly.Collector
    config    Config
    callbacks []EventCallback
}

func NewStandardCrawler(config Config) *StandardCrawler {
    c := colly.NewCollector(
        colly.MaxDepth(config.MaxDepth),
        colly.Async(true),
    )

    c.Limit(&colly.LimitRule{
        DomainGlob:  "*",
        Parallelism: config.Parallelism,
        Delay:       time.Duration(1.0/config.RateLimit) * time.Second,
    })

    return &StandardCrawler{
        collector: c,
        config:    config,
    }
}

func (s *StandardCrawler) Crawl(ctx context.Context, seed string, opts Options) (*Result, error) {
    result := &Result{
        URLs: make([]string, 0),
    }

    // Setup callbacks
    s.collector.OnHTML("a[href]", func(e *colly.HTMLElement) {
        link := e.Request.AbsoluteURL(e.Attr("href"))
        result.URLs = append(result.URLs, link)
        s.notifyEvent(Event{
            Type: EventURLDiscovered,
            URL:  link,
            Timestamp: time.Now(),
        })
        e.Request.Visit(link)
    })

    s.collector.OnResponse(func(r *colly.Response) {
        s.notifyEvent(Event{
            Type: EventPageCrawled,
            URL:  r.Request.URL.String(),
            Timestamp: time.Now(),
        })
    })

    if err := s.collector.Visit(seed); err != nil {
        return nil, err
    }

    s.collector.Wait()
    return result, nil
}

func (s *StandardCrawler) Subscribe(callback EventCallback) {
    s.callbacks = append(s.callbacks, callback)
}

func (s *StandardCrawler) notifyEvent(event Event) {
    for _, cb := range s.callbacks {
        cb(event)
    }
}

func (s *StandardCrawler) Close() error {
    return nil
}
```

---

## Headless Mode Implementation

```go
package crawler

import "github.com/chromedp/chromedp"

type HeadlessCrawler struct {
    allocCtx  context.Context
    config    Config
    callbacks []EventCallback
}

func NewHeadlessCrawler(config Config) *HeadlessCrawler {
    opts := append(chromedp.DefaultExecAllocatorOptions[:],
        chromedp.Flag("headless", true),
        chromedp.Flag("disable-gpu", true),
        chromedp.UserAgent(config.UserAgent),
    )

    allocCtx, _ := chromedp.NewExecAllocator(context.Background(), opts...)

    return &HeadlessCrawler{
        allocCtx: allocCtx,
        config:   config,
    }
}

func (h *HeadlessCrawler) Crawl(ctx context.Context, seed string, opts Options) (*Result, error) {
    ctx, cancel := chromedp.NewContext(h.allocCtx)
    defer cancel()

    result := &Result{
        URLs: make([]string, 0),
    }

    var urls []string
    err := chromedp.Run(ctx,
        chromedp.Navigate(seed),
        chromedp.WaitVisible("body"),
        chromedp.Evaluate(`Array.from(document.querySelectorAll('a')).map(a => a.href)`, &urls),
    )

    if err != nil {
        return nil, err
    }

    result.URLs = urls

    h.notifyEvent(Event{
        Type: EventPageCrawled,
        URL:  seed,
        Timestamp: time.Now(),
    })

    return result, nil
}

func (h *HeadlessCrawler) Subscribe(callback EventCallback) {
    h.callbacks = append(h.callbacks, callback)
}

func (h *HeadlessCrawler) notifyEvent(event Event) {
    for _, cb := range h.callbacks {
        cb(event)
    }
}

func (h *HeadlessCrawler) Close() error {
    return nil
}
```

---

## Passive Mode Implementation

```go
package crawler

type PassiveCrawler struct {
    config    Config
    callbacks []EventCallback
}

func NewPassiveCrawler(config Config) *PassiveCrawler {
    return &PassiveCrawler{
        config: config,
    }
}

func (p *PassiveCrawler) Crawl(ctx context.Context, seed string, opts Options) (*Result, error) {
    result := &Result{
        URLs: make([]string, 0),
    }

    // Query Wayback Machine
    waybackURLs, err := queryWayback(ctx, seed)
    if err != nil {
        return nil, err
    }

    result.URLs = append(result.URLs, waybackURLs...)

    p.notifyEvent(Event{
        Type: EventComplete,
        URL:  seed,
        Timestamp: time.Now(),
        Data: map[string]int{"count": len(waybackURLs)},
    })

    return result, nil
}

func queryWayback(ctx context.Context, url string) ([]string, error) {
    apiURL := fmt.Sprintf("http://web.archive.org/cdx/search/cdx?url=%s&output=json", url)

    req, err := http.NewRequestWithContext(ctx, "GET", apiURL, nil)
    if err != nil {
        return nil, err
    }

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var snapshots [][]string
    if err := json.NewDecoder(resp.Body).Decode(&snapshots); err != nil {
        return nil, err
    }

    urls := make([]string, 0, len(snapshots))
    for i, snap := range snapshots {
        if i == 0 { continue } // Skip header
        waybackURL := fmt.Sprintf("http://web.archive.org/web/%s/%s", snap[1], snap[2])
        urls = append(urls, waybackURL)
    }

    return urls, nil
}

func (p *PassiveCrawler) Subscribe(callback EventCallback) {
    p.callbacks = append(p.callbacks, callback)
}

func (p *PassiveCrawler) notifyEvent(event Event) {
    for _, cb := range p.callbacks {
        cb(event)
    }
}

func (p *PassiveCrawler) Close() error {
    return nil
}
```

---

## Directory Structure

```
pkg/crawler/
├── interface.go          # Crawler interface
├── factory.go            # Mode selection
├── standard.go           # Colly implementation
├── headless.go           # chromedp implementation
├── passive.go            # Wayback/CommonCrawl
├── config.go             # Configuration structs
├── result.go             # Result types
├── events.go             # Event system
└── internal/
    ├── ratelimit/        # Rate limiting
    ├── robots/           # robots.txt parser
    └── filters/          # URL filtering
```

---

## Plugin Architecture (Optional)

### Plugin Interface

```go
type Plugin interface {
    Name() string
    OnRequest(*Request) error
    OnResponse(*Response) error
}

type PluginManager struct {
    plugins []Plugin
}

func (pm *PluginManager) Register(p Plugin) {
    pm.plugins = append(pm.plugins, p)
}

func (pm *PluginManager) ExecuteOnRequest(req *Request) error {
    for _, p := range pm.plugins {
        if err := p.OnRequest(req); err != nil {
            return err
        }
    }
    return nil
}
```

### Example Plugin

```go
type FormExtractorPlugin struct{}

func (f *FormExtractorPlugin) Name() string {
    return "form-extractor"
}

func (f *FormExtractorPlugin) OnRequest(req *Request) error {
    return nil
}

func (f *FormExtractorPlugin) OnResponse(resp *Response) error {
    // Extract forms from HTML
    forms := extractForms(resp.Body)
    resp.Metadata["forms"] = forms
    return nil
}
```

---

## Usage Examples

### Basic Usage

```go
factory := crawler.NewFactory(crawler.Config{
    MaxDepth:    3,
    Parallelism: 10,
    RateLimit:   10.0,
    UserAgent:   "SecurityScanner/1.0",
})

c, err := factory.Create(crawler.ModeStandard)
if err != nil {
    log.Fatal(err)
}
defer c.Close()

result, err := c.Crawl(context.Background(), "https://example.com", crawler.Options{})
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Discovered %d URLs\n", len(result.URLs))
```

### Auto-Detection

```go
c, err := factory.CreateAuto(context.Background(), "https://example.com")
if err != nil {
    log.Fatal(err)
}

result, err := c.Crawl(context.Background(), "https://example.com", crawler.Options{})
```

### Event Subscription

```go
c.Subscribe(func(event crawler.Event) {
    switch event.Type {
    case crawler.EventURLDiscovered:
        log.Printf("Found URL: %s", event.URL)
    case crawler.EventPageCrawled:
        log.Printf("Crawled: %s", event.URL)
    case crawler.EventError:
        log.Printf("Error: %v", event.Data)
    }
})
```
