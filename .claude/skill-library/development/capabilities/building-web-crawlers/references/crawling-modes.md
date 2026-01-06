# Crawling Modes Implementation

**Detailed implementation guidance for each crawling mode.**

## Standard Mode (Colly Framework)

### Basic Setup

```go
import "github.com/gocolly/colly/v2"

c := colly.NewCollector(
    colly.AllowedDomains("example.com"),
    colly.MaxDepth(3),
    colly.Async(true),
)

// Configure concurrency
c.Limit(&colly.LimitRule{
    DomainGlob:  "*",
    Parallelism: 10,
    Delay:       100 * time.Millisecond,
})

// Extract links
c.OnHTML("a[href]", func(e *colly.HTMLElement) {
    link := e.Attr("href")
    c.Visit(e.Request.AbsoluteURL(link))
})

c.Visit("https://example.com")
c.Wait()
```

### Connection Pooling

Colly automatically manages connection pooling via net/http. Configure limits:

```go
c.WithTransport(&http.Transport{
    MaxIdleConns:        100,
    MaxIdleConnsPerHost: 10,
    IdleConnTimeout:     90 * time.Second,
})
```

### Request Middleware

```go
c.OnRequest(func(r *colly.Request) {
    r.Headers.Set("User-Agent", "SecurityScanner/1.0")
    r.Headers.Set("Accept", "text/html,application/json")
    log.Printf("Visiting %s", r.URL)
})
```

---

## Headless Mode (chromedp)

### Browser Context Setup

```go
import (
    "context"
    "github.com/chromedp/chromedp"
)

// Allocator with options
opts := append(chromedp.DefaultExecAllocatorOptions[:],
    chromedp.Flag("headless", true),
    chromedp.Flag("disable-gpu", true),
    chromedp.Flag("no-sandbox", true),
    chromedp.UserAgent("SecurityScanner/1.0"),
)

allocCtx, cancel := chromedp.NewExecAllocator(context.Background(), opts...)
defer cancel()

ctx, cancel := chromedp.NewContext(allocCtx)
defer cancel()
```

### Navigate and Extract

```go
var body string
var urls []string

err := chromedp.Run(ctx,
    chromedp.Navigate(url),
    chromedp.WaitVisible("body", chromedp.ByQuery),
    chromedp.OuterHTML("html", &body, chromedp.ByQuery),
    chromedp.Evaluate(`Array.from(document.querySelectorAll('a')).map(a => a.href)`, &urls),
)
```

### Wait for Dynamic Content

```go
chromedp.Run(ctx,
    chromedp.Navigate(url),
    // Wait for specific element
    chromedp.WaitVisible("#dynamic-content", chromedp.ByID),
    // Wait for network idle
    chromedp.Sleep(2 * time.Second),
    chromedp.OuterHTML("html", &body),
)
```

### Resource Optimization

```go
// Disable images, CSS for faster crawling
chromedp.Run(ctx,
    chromedp.ActionFunc(func(ctx context.Context) error {
        return chromedp.EvaluateAsDevTools(`
            chrome.debugger.sendCommand('Network.setBlockedURLs', {
                urls: ['*.png', '*.jpg', '*.css', '*.woff']
            })
        `, nil).Do(ctx)
    }),
)
```

---

## Passive Mode (Historical Sources)

### Wayback Machine API

```go
import "net/http"

// Get available snapshots
func getWaybackSnapshots(url string) ([]string, error) {
    apiURL := fmt.Sprintf("http://web.archive.org/cdx/search/cdx?url=%s&output=json", url)
    resp, err := http.Get(apiURL)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Parse JSON response
    var snapshots [][]string
    json.NewDecoder(resp.Body).Decode(&snapshots)

    // Extract URLs
    var urls []string
    for i, snap := range snapshots {
        if i == 0 { continue } // Skip header
        timestamp := snap[1]
        original := snap[2]
        waybackURL := fmt.Sprintf("http://web.archive.org/web/%s/%s", timestamp, original)
        urls = append(urls, waybackURL)
    }
    return urls, nil
}
```

### CommonCrawl Index

```go
// Search CommonCrawl index
func searchCommonCrawl(domain string) ([]string, error) {
    // Use latest index
    indexURL := "https://index.commoncrawl.org/CC-MAIN-2024-10-index"

    apiURL := fmt.Sprintf("%s?url=%s&output=json", indexURL, domain)
    resp, err := http.Get(apiURL)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Parse JSONL response (one JSON object per line)
    scanner := bufio.NewScanner(resp.Body)
    var urls []string
    for scanner.Scan() {
        var record struct {
            URL string `json:"url"`
        }
        json.Unmarshal(scanner.Bytes(), &record)
        urls = append(urls, record.URL)
    }
    return urls, nil
}
```

### VirusTotal Historical Data

```go
// Requires API key
func getVirusTotalURLs(domain string, apiKey string) ([]string, error) {
    client := &http.Client{}
    req, _ := http.NewRequest("GET",
        fmt.Sprintf("https://www.virustotal.com/api/v3/domains/%s/urls", domain),
        nil,
    )
    req.Header.Set("x-apikey", apiKey)

    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Parse response
    var result struct {
        Data []struct {
            Attributes struct {
                URL string `json:"url"`
            } `json:"attributes"`
        } `json:"data"`
    }
    json.NewDecoder(resp.Body).Decode(&result)

    var urls []string
    for _, item := range result.Data {
        urls = append(urls, item.Attributes.URL)
    }
    return urls, nil
}
```

---

## Mode Selection Logic

```go
type CrawlerMode int

const (
    ModeStandard CrawlerMode = iota
    ModeHeadless
    ModePassive
)

func selectMode(opts Options) CrawlerMode {
    // Passive mode if no contact allowed
    if opts.NoContact {
        return ModePassive
    }

    // Headless if JS detection needed
    if opts.DetectJS {
        return ModeHeadless
    }

    // Default to standard
    return ModeStandard
}
```
