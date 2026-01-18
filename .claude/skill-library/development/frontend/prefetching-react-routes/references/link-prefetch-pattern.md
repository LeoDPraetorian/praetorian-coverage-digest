# Link Prefetch Pattern (Browser Hint)

## Overview

The Link Prefetch pattern uses HTML `<link rel='prefetch'>` to hint to the browser that a resource will be needed soon. React Router 7 implements this natively via the `prefetch` prop.

## How It Works

When React Router sees `<Link prefetch="intent">`, it:

1. Attaches hover and focus event listeners to the link
2. On hover/focus, creates `<link rel='prefetch' href='/assets/route-chunk.js'>`
3. Browser downloads the chunk at **lowest priority** (Lowest in Chrome DevTools)
4. Downloaded chunk goes into browser cache
5. On navigation, React Router loads from cache instead of network

## Browser Hint Priority

Browser resource priorities (Chrome):

| Priority | Use Case | Example |
|----------|----------|---------|
| Highest | Critical render-blocking | `<script>` in `<head>` |
| High | Visible images, fonts | `<img>` above fold |
| Medium | Scripts, stylesheets | Async scripts |
| Low | Prefetched resources | `<link rel='prefetch'>` |
| **Lowest** | Speculative prefetch | React Router prefetch |

This ensures prefetching never blocks critical resources.

## Fallback Behavior

**What if the browser ignores the hint?**

Browsers may ignore prefetch hints when:
- Network is congested
- Device is in low-power mode
- Too many concurrent requests
- Cache is full

**React Router handles this gracefully:**
- If prefetch fails or is ignored, navigation triggers normal lazy load
- User sees regular loading experience (not slower, just not faster)
- No error messages or broken functionality

## Verification

**DevTools Network Tab:**

```
Name                          Status  Type     Initiator     Size    Time
route-dashboard-abc123.js     200     script   Prefetch      42KB    245ms
```

**Check if prefetching is working:**

1. Open DevTools Network tab
2. Clear network log
3. Hover over navigation link (don't click)
4. Look for route chunk files with "Prefetch" initiator
5. If you see them downloading, it's working

**If not working:**

- Check browser support (all modern browsers support rel='prefetch')
- Verify React Router version >=7.0
- Check for conflicting link event handlers
- Ensure route uses lazy loading

## Cross-Origin Prefetch

Prefetch works across origins with CORS:

```html
<link rel='prefetch' href='https://cdn.example.com/chunk.js' crossorigin='anonymous'>
```

React Router handles crossorigin attributes automatically for CDN-hosted chunks.

## Mobile Behavior

**Limitation:** Hover doesn't work on touch devices (no cursor).

React Router also listens for `touchstart` on mobile, but this fires on tap (too late for prefetch benefit).

**Mobile strategy:**
- Use `prefetch='intent'` for desktop benefit
- Add route-based prediction for mobile instant navigation
- Or use `prefetch='viewport'` for links visible on screen

## Related Patterns

- Eager Loading (custom hook triggers import() directly)
- Route Prediction (prefetch based on current route)
- Viewport Prefetch (prefetch when link scrolls into view)
