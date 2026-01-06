# Crawling Mode Selection Criteria

**Guide for choosing between standard HTTP, headless browser, and passive historical modes.**

## Decision Matrix

| Criteria                 | Standard | Headless | Passive |
| ------------------------ | -------- | -------- | ------- |
| **Target has JS**        | ❌       | ✅       | ⚠️      |
| **Speed critical**       | ✅       | ❌       | ✅      |
| **Historical data OK**   | ❌       | ❌       | ✅      |
| **No target contact**    | ❌       | ❌       | ✅      |
| **Resource constrained** | ✅       | ❌       | ✅      |
| **API endpoints**        | ✅       | ✅       | ⚠️      |
| **Authentication**       | ✅       | ✅       | ❌      |

## Standard Mode (net/http + Colly)

**Use when:**

- Target is traditional web app (server-side rendering)
- Static HTML content
- API endpoints with JSON responses
- Speed is critical (100-1000 req/sec)
- Low resource usage required

**Don't use when:**

- Heavy JavaScript rendering
- Single-page applications (React, Vue, Angular)
- Content loaded dynamically after page load
- Browser-specific behavior matters

**Performance**: Fast, efficient, scales well.

## Headless Mode (chromedp)

**Use when:**

- Single-page applications
- JavaScript-heavy sites
- AJAX content loading
- Browser automation needed
- Testing dynamic UI

**Don't use when:**

- Simple static sites
- Speed is critical
- Resource-constrained environment
- Large-scale crawling (1000+ URLs)

**Performance**: Slow (1-10 req/sec), resource-intensive (300MB+ per browser instance).

## Passive Mode (Wayback/CommonCrawl)

**Use when:**

- Pre-engagement reconnaissance
- Historical data analysis
- Cannot contact target directly
- Compliance restrictions
- Looking for removed/deleted pages

**Don't use when:**

- Need current data
- Authenticated areas
- Recently deployed sites
- Complete coverage required

**Performance**: Fast (API-limited), but data may be outdated.

## Hybrid Strategy

Many security tools use hybrid approaches:

1. **Start with Standard**: Fast initial discovery
2. **Detect JS frameworks**: Check for React, Vue, Angular indicators
3. **Switch to Headless**: Re-crawl JS-heavy sections
4. **Passive supplement**: Add Wayback data for historical endpoints

**Katana implements this**: Automatic mode switching based on response analysis.
