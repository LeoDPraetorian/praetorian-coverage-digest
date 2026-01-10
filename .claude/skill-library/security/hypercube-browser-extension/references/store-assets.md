# Chrome Web Store Asset Requirements

**Asset specifications, design guidelines, and branding patterns for Chrome Store listings.**

**Source**: `modules/hypercube-ng/examples/antiphish-solutions/` assets, Chrome Store docs

---

## Required Assets

### Extension Icons (REQUIRED)

**Sizes needed:**
- 16x16 pixels (PNG)
- 48x48 pixels (PNG)
- 128x128 pixels (PNG)

**Usage:**
- 16px: Browser toolbar
- 48px: Extensions management page
- 128px: Chrome Web Store listing

**Format:** PNG with transparency (RGBA) or solid background (RGB)

### Store Screenshots (REQUIRED)

**Specifications:**
- **Dimensions**: 1280x800 or 640x400 pixels
- **Format**: PNG or JPEG
- **Quantity**: Minimum 1, recommended 3-5
- **Content**: Show extension UI in action

**Best practices:**
- Show actual extension functionality
- Clean, professional appearance
- Text is legible
- No placeholder content
- Consistent branding

### Promotional Tiles (OPTIONAL)

**Small tile**: 440x280 pixels (PNG/JPEG)
- Shown in Chrome Web Store search results
- Simple branding, key value prop

**Marquee tile**: 1400x560 pixels (PNG/JPEG)
- Featured placement (if selected by Chrome Store team)
- Professional graphic design recommended

---

## Asset Examples from Antiphish-Solutions

**Available in**: `modules/hypercube-ng/examples/antiphish-solutions/`

| File | Size | Purpose |
|------|------|---------|
| `antiphish_protector_logo.png` | 128x128 | Extension icon (transparent) |
| `antiphish_protector_logo_bg.png` | 128x128 | Extension icon (with background) |
| `screenshot.png` | 1200x800 | Store screenshot (main) |
| `antiphish_protector_store_1.png` | 1280x800 | Store screenshot (alt) |
| `antiphish_protector_store_2.png` | 1280x800 | Store screenshot (alt) |
| `antiphish_protector.png` | 1280x800 | Main promo image |
| `antiphish_protector_small_promo_tile.png` | 440x280 | Small tile |
| `store_marquee_promo_tile.png` | 1400x560 | Marquee tile |

**Total**: 8 assets for complete listing

---

## Design Guidelines

### Branding Elements

**Color scheme** (antiphish-solutions example):
- Primary: #3BA7FF (bright blue)
- Secondary: #1B4B87 (dark blue)
- Background: #0A1628 (navy)
- Accent: Gradient from primary to secondary

**Typography**:
- Modern sans-serif (Inter, Segoe UI, SF Pro)
- Bold weights for headings
- Regular for body text

**Visual style**:
- Gradient backgrounds
- Shield/protection imagery for security tools
- Minimalist, clean design
- High contrast for readability

### Icon Design

**Best practices:**
- Simple, recognizable at 16px
- Meaningful symbol (shield for security, lock for privacy, etc.)
- Works in monochrome (for dark/light themes)
- No text (too small to read at 16px)

**File formats:**
- PNG with transparency preferred
- RGBA color mode
- High DPI displays (design at 256x256, downscale to 128x128)

### Screenshot Design

**Layout:**
- Extension UI prominently displayed
- Clear visual hierarchy
- Annotations optional (arrows, callouts)
- Professional, not cluttered

**Content:**
- Show key features
- Demonstrate value proposition
- Real data (not "Lorem ipsum")
- Consistent branding across all screenshots

---

## Asset Creation Tools

### Figma (Recommended)

**Pros:** Professional design tool, templates available, vector-based
**Cons:** Learning curve, subscription cost

**Workflow:**
1. Design at high resolution (2x or 4x target size)
2. Export as PNG at exact dimensions
3. Optimize with ImageOptim or TinyPNG

### Browser Screenshots

**For realistic UI screenshots:**

```bash
# Load extension in Chrome
chrome://extensions/ → Load unpacked

# Open extension popup
# Use browser dev tools: Cmd+Shift+I (Mac) / Ctrl+Shift+I (Windows)
# Take screenshot
```

**Tools:**
- Chrome DevTools screenshot feature
- Cleanshot X (Mac)
- ShareX (Windows)
- Firefox screenshot tool (built-in)

### AI-Generated Assets

**For logos/icons:**
- DALL-E 3, Midjourney for logo concepts
- Remove background with remove.bg
- Upscale with Upscale.media

**Prompt example:**
```
"Modern shield logo for cybersecurity browser extension, blue gradient, minimalist design, flat style, transparent background"
```

---

## Asset Checklist

Before Chrome Store submission:

- [ ] 3 icon sizes (16x16, 48x48, 128x128) as PNG
- [ ] Minimum 1 screenshot (1280x800 or 640x400)
- [ ] Recommended: 3-5 screenshots showing different features
- [ ] Optional: Small promo tile (440x280)
- [ ] Optional: Marquee tile (1400x560)
- [ ] All assets reference extension branding consistently
- [ ] Icons load correctly in manifest.json paths
- [ ] Screenshots show professional, functional UI
- [ ] No placeholder or "Lorem ipsum" content
- [ ] File sizes reasonable (<500KB per PNG)

---

## Image Optimization

**Reduce file size without quality loss:**

```bash
# Using ImageOptim (Mac)
# Drag-drop PNG files → automatic optimization

# Using TinyPNG (web-based)
# Upload PNG → download optimized version

# Using pngquant (CLI)
pngquant --quality=80-95 icon128.png -o icon128-optimized.png
```

**Benefits:**
- Faster Chrome Store page load
- Smaller extension package size
- Better user experience

**Target sizes:**
- Icons: <50KB each
- Screenshots: <200KB each
- Promo tiles: <300KB each

---

## References

- **Example assets**: `modules/hypercube-ng/examples/antiphish-solutions/*.png`
- **Chrome Store image guidelines**: https://developer.chrome.com/docs/webstore/images/
- **Design inspiration**: Browse top-rated Chrome extensions
