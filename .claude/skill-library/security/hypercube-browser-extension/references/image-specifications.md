# Image Generation Specifications

**Structured image requirements and prompts for browser extension assets - designed for consumption by future image generation skills.**

---

## Purpose

This document provides machine-readable specifications for generating all required images for hypercube-ng browser extensions. Future image generation skills can parse the JSON blocks to automatically generate correctly-sized, branded assets.

---

## Variable Placeholders

All prompts use these variables that must be replaced based on pretext:

| Variable             | Example (SecureWeb Guardian) | Example (DevAPI Tester) |
| -------------------- | ---------------------------- | ----------------------- |
| `{EXTENSION_NAME}`   | SecureWeb Guardian           | DevAPI Tester Pro       |
| `{PRIMARY_COLOR}`    | #667eea (purple-blue)        | #2563eb (blue)          |
| `{SECONDARY_COLOR}`  | #764ba2 (purple)             | #1e40af (dark blue)     |
| `{ICON_SYMBOL}`      | shield                       | code brackets           |
| `{THEME}`            | security/protection          | developer/technical     |
| `{PRIMARY_METAPHOR}` | shield, lock, guard          | code, API, terminal     |

---

## Extension Icons

### Requirements

```json
{
  "asset_type": "extension_icons",
  "required_sizes": [
    { "width": 16, "height": 16, "filename": "icon16.png", "usage": "Browser toolbar" },
    { "width": 48, "height": 48, "filename": "icon48.png", "usage": "Extensions management page" },
    { "width": 128, "height": 128, "filename": "icon128.png", "usage": "Chrome Web Store listing" }
  ],
  "format": "PNG",
  "transparency": "optional but recommended",
  "color_space": "sRGB"
}
```

### Design Specifications

```json
{
  "design_guidelines": {
    "style": "flat design, modern, minimal",
    "recognizability": "Must be clear at 16px scale",
    "consistency": "Same symbol/motif across all sizes",
    "background": "Gradient or solid color matching {PRIMARY_COLOR}",
    "foreground": "Icon symbol in white or contrasting color",
    "padding": "10-15% margin from edges",
    "uniqueness": "Each extension needs visually distinct icon (different colors/symbols)"
  }
}
```

### Image Prompts

**16x16 Icon**:

```
Create a 16x16 pixel browser extension icon for {EXTENSION_NAME}.

Design requirements:
- Style: Flat design, minimal, modern
- Background: Gradient from {PRIMARY_COLOR} to {SECONDARY_COLOR}
- Symbol: Simple {ICON_SYMBOL} in white, centered
- Recognizable: Must be clear at tiny scale
- Format: PNG with transparency
- Theme: {THEME}

Keep extremely simple - at 16px, only basic shapes are visible. Focus on clear silhouette.
```

**48x48 Icon**:

```
Create a 48x48 pixel browser extension icon for {EXTENSION_NAME}.

Design requirements:
- Style: Flat design with subtle depth, modern
- Background: Gradient from {PRIMARY_COLOR} (#667eea) to {SECONDARY_COLOR} (#764ba2)
- Symbol: {ICON_SYMBOL} icon in white, centered, with subtle shadow
- Padding: 15% margin from edges
- Details: Can include more refinement than 16px version
- Format: PNG with transparency
- Consistency: Must match 16px and 128px versions

Add subtle shadow or gradient to symbol for depth while maintaining flat design aesthetic.
```

**128x128 Icon**:

```
Create a 128x128 pixel browser extension icon for {EXTENSION_NAME}.

Design requirements:
- Style: Modern flat design with professional polish
- Background: Smooth gradient from {PRIMARY_COLOR} to {SECONDARY_COLOR}, top-left to bottom-right
- Symbol: Detailed {ICON_SYMBOL} in white, centered, professional rendering
- Padding: 12% margin from edges
- Polish: Subtle highlights, shadows, or gradients on symbol
- Format: PNG with transparency
- Theme: {THEME} - should convey trustworthiness
- Consistency: Must clearly match 16px and 48px versions

This is the "hero" icon - users see this prominently in Chrome Web Store. Make it professional and polished while maintaining brand consistency.
```

---

## Chrome Web Store Assets

### Requirements

```json
{
  "asset_type": "chrome_store_promotional",
  "required_assets": [
    {
      "name": "small_tile",
      "width": 440,
      "height": 280,
      "filename": "small_promo_tile.png",
      "usage": "Chrome Web Store small promotional tile",
      "format": "PNG",
      "required": true
    },
    {
      "name": "screenshots",
      "width": 1280,
      "height": 800,
      "filename": "screenshot_*.png",
      "usage": "Extension functionality demonstration",
      "format": "PNG or JPEG",
      "quantity": "1-5 images",
      "required": true
    },
    {
      "name": "marquee",
      "width": 1400,
      "height": 560,
      "filename": "marquee_promo_tile.png",
      "usage": "Chrome Web Store featured placement",
      "format": "PNG",
      "required": false
    }
  ]
}
```

### Small Promotional Tile (440x280)

```
Create a 440x280 pixel promotional tile for {EXTENSION_NAME} Chrome extension.

Design requirements:
- Background: Gradient matching extension theme ({PRIMARY_COLOR} to {SECONDARY_COLOR})
- Layout: Icon on left (96x96), text on right
- Icon: Large version of extension icon (128px scaled to 96px)
- Text content:
  * Extension name: {EXTENSION_NAME} (bold, white, 32px)
  * Tagline: One-line benefit (white, 18px)
  * Key feature: 1-2 word highlight (white, 14px)
- Style: Professional, clean, matches extension branding
- Theme: {THEME}
- Format: PNG

Example layout:
[Icon]  {EXTENSION_NAME}
        Real-time protection for safer browsing
        ★★★★★ Trusted by 250K+ users
```

### Screenshots (1280x800)

**Screenshot 1 - Extension Popup**:

```
Create a 1280x800 screenshot showing the {EXTENSION_NAME} browser extension popup interface.

Content:
- Browser chrome mockup at top (Chrome UI with address bar showing "example.com")
- Extension popup displayed (380x500px, positioned top-right)
- Popup shows:
  * Extension name and logo
  * "Protection Active" status with green indicator
  * Statistics grid: Threats Blocked, Sites Scanned, Cookies Analyzed
  * Feature list with icons
- Background: Light gray (#f5f5f5) desktop mockup
- Style: Modern, professional, clean
- Theme: {THEME}
- Colors: Match extension ({PRIMARY_COLOR}, {SECONDARY_COLOR})

Make it look like actual browser screenshot showing extension in action.
```

**Screenshot 2 - Features Overview**:

```
Create a 1280x800 promotional image highlighting {EXTENSION_NAME} key features.

Layout:
- Title: "{EXTENSION_NAME} Features" (centered, top)
- 4 feature cards in 2x2 grid:
  * Card 1: Real-Time Threat Detection (icon + text)
  * Card 2: Smart Cookie Protection (icon + text)
  * Card 3: Automatic Blocking (icon + text)
  * Card 4: Privacy-First Design (icon + text)
- Background: Gradient ({PRIMARY_COLOR} to {SECONDARY_COLOR})
- Style: Professional infographic style
- Colors: White text, icon backgrounds match theme
- Theme: {THEME}

Clean, modern design that could be used in marketing materials.
```

**Screenshot 3 - Protection in Action** (Optional):

```
Create a 1280x800 screenshot showing {EXTENSION_NAME} blocking a threat.

Content:
- Browser window showing warning page: "Threat Blocked"
- Extension icon in toolbar with red badge notification
- URL bar shows suspicious domain (example: "paypa1-login.com")
- Warning message explains why site was blocked
- "Continue Anyway" and "Go Back" buttons
- Extension popup overlay showing threat details
- Background: Browser UI mockup
- Style: Realistic browser screenshot
- Theme: Security/protection

Show the extension actively protecting user from phishing attempt.
```

---

## Website Images

### Requirements

```json
{
  "asset_type": "website_images",
  "optional_assets": [
    {
      "name": "hero_illustration",
      "width": 600,
      "height": 600,
      "filename": "hero-illustration.png",
      "usage": "Homepage hero section visual",
      "format": "PNG with transparency"
    },
    {
      "name": "feature_icons",
      "width": 128,
      "height": 128,
      "filename": "feature-*.png",
      "usage": "Feature section illustrations",
      "format": "PNG with transparency",
      "quantity": "6-8 icons"
    }
  ],
  "note": "Website currently uses emoji icons. Custom images are optional enhancement."
}
```

### Hero Illustration (Optional)

```
Create a 600x600 pixel illustration for {EXTENSION_NAME} website hero section.

Style: Modern, abstract, tech-focused
Elements:
- Central: Large {ICON_SYMBOL} (shield, lock, or theme-appropriate symbol)
- Surrounding: Abstract network nodes, connection lines, or security elements
- Colors: {PRIMARY_COLOR}, {SECONDARY_COLOR}, white
- Background: Transparent or subtle gradient
- Theme: {THEME}
- Aesthetic: Professional, SaaS product illustration

Should work well on gradient background. Abstract/geometric style, not realistic.
```

### Feature Icons (Optional)

```
Create six 128x128 pixel icons for {EXTENSION_NAME} website feature sections.

Icon set:
1. Magnifying glass - Real-Time Threat Detection
2. Cookie - Smart Cookie Protection
3. Block/Stop sign - Automatic Blocking
4. Lock/Shield - Privacy-First Design
5. Lightning bolt - Zero Performance Impact
6. Circular arrows - Always Up-to-Date

Style: Line art, single color ({PRIMARY_COLOR}), minimal
Background: Transparent
Line weight: 8-10px
Padding: 20px from edges
Theme: {THEME}
Consistency: All icons use same style/weight

These replace emoji icons currently used (🔍, 🍪, 🚫, 🔒, ⚡, 🔄).
```

---

## Pretext-Specific Examples

### Security Tool (Anti-Phishing)

```json
{
  "pretext": "SecureWeb Guardian",
  "variables": {
    "EXTENSION_NAME": "SecureWeb Guardian",
    "PRIMARY_COLOR": "#667eea",
    "SECONDARY_COLOR": "#764ba2",
    "ICON_SYMBOL": "shield with checkmark",
    "THEME": "security, protection, trust",
    "PRIMARY_METAPHOR": "shield, fortress, guardian"
  },
  "icon_prompt_suffix": "Convey security, trustworthiness, and protection. Professional cybersecurity brand aesthetic."
}
```

### Developer Tool

```json
{
  "pretext": "DevAPI Tester Pro",
  "variables": {
    "EXTENSION_NAME": "DevAPI Tester Pro",
    "PRIMARY_COLOR": "#2563eb",
    "SECONDARY_COLOR": "#1e40af",
    "ICON_SYMBOL": "code brackets with lightning bolt",
    "THEME": "developer tools, technical, professional",
    "PRIMARY_METAPHOR": "code, terminal, API, debugging"
  },
  "icon_prompt_suffix": "Convey developer-focused tool, technical precision, and professional tooling. Modern dev tool aesthetic."
}
```

### VPN/Privacy Tool

```json
{
  "pretext": "PrivacyShield VPN",
  "variables": {
    "EXTENSION_NAME": "PrivacyShield VPN",
    "PRIMARY_COLOR": "#059669",
    "SECONDARY_COLOR": "#047857",
    "ICON_SYMBOL": "lock with network nodes",
    "THEME": "privacy, encryption, anonymity",
    "PRIMARY_METAPHOR": "shield, tunnel, encryption, privacy"
  },
  "icon_prompt_suffix": "Convey privacy protection, secure networking, and anonymity. VPN/security product aesthetic."
}
```

---

## Integration with Future Image Generation Skill

### Skill Interface Design

**When image generation skill exists, hypercube-browser-extension should:**

1. **Load image-specifications.md** during relevant phases
2. **Extract pretext-specific variables** from user input or pretext design
3. **Generate structured request** to image generation skill:

```javascript
// Example integration
{
  "operation": "generate_extension_assets",
  "pretext": {
    "name": "SecureWeb Guardian",
    "type": "security_tool",
    "variables": {
      "EXTENSION_NAME": "SecureWeb Guardian",
      "PRIMARY_COLOR": "#667eea",
      "SECONDARY_COLOR": "#764ba2",
      "ICON_SYMBOL": "shield with checkmark",
      "THEME": "security, protection, trust"
    }
  },
  "assets_needed": [
    "extension_icons",      // 16px, 48px, 128px
    "store_promotional",    // 440x280 tile
    "screenshots",          // 1280x800 (3 images)
    "website_hero"          // Optional 600x600
  ],
  "specifications_source": ".claude/skill-library/security/hypercube-browser-extension/references/image-specifications.md"
}
```

### Prompt Template System

**Each image type has:**

1. **Base prompt template** with {VARIABLE} placeholders
2. **Technical requirements** (size, format, color space)
3. **Style guidance** (flat design, modern, professional)
4. **Pretext-specific additions** (security vs developer vs privacy theme)

**Example workflow**:

```
1. User chooses pretext: "Anti-Phishing Security Tool"
2. Hypercube skill extracts variables:
   - PRIMARY_COLOR: #667eea
   - ICON_SYMBOL: shield
   - THEME: security
3. Loads image-specifications.md
4. Replaces {VARIABLES} in prompt templates
5. Calls image generation skill with complete prompts
6. Saves generated images to output/[timestamp]/assets/
```

---

## Phase Integration Points

### Phase 3: Extension Icons

**When to generate**: After pretext design approved, before customizing extension

**Assets needed**:

- `icon16.png`
- `icon48.png`
- `icon128.png`

**Integration**:

```markdown
#### 3.3 Generate Icons (Required)

[Current manual instructions OR future automated path:]

Option A: Manual design (Figma, icon.kitchen)
Option B: Generate via image skill:

Skill({
skill: "image-generation",
assets: ["extension_icons"],
pretext*variables: { /* extracted from Phase 1 \_/ },
specifications: "references/image-specifications.md"
})
```

### Phase 4: Chrome Store Materials

**When to generate**: After extension customized, before testing

**Assets needed**:

- Small promotional tile (440x280)
- Screenshots (1280x800, quantity: 3-5)
- Optional: Marquee tile (1400x560)

**Integration**:

```markdown
#### 4.2 Screenshots & Promotional Images

[Current manual instructions OR future automated path:]

Option A: Manual screenshots (Chrome DevTools, design tools)
Option B: Generate via image skill:

Skill({
skill: "image-generation",
assets: ["store_promotional", "screenshots"],
pretext*variables: { /* from Phase 1 \_/ },
specifications: "references/image-specifications.md",
screenshot_types: ["popup_interface", "features_overview", "protection_demo"]
})
```

### Phase 5: Website Images (Optional)

**When to generate**: During website creation

**Assets needed**:

- Hero illustration (600x600, optional)
- Feature icons (128x128, set of 6-8, optional)

**Integration**:

```markdown
#### 5.1 Website Visuals (Optional Enhancement)

Current website uses emoji icons. For premium appearance:

Skill({
skill: "image-generation",
assets: ["website_hero", "feature_icons"],
pretext*variables: { /* from Phase 1 \_/ },
specifications: "references/image-specifications.md"
})
```

---

## Prompt Engineering Best Practices

### For Consistent Branding

**All prompts for same pretext must specify**:

- Same color palette (PRIMARY_COLOR, SECONDARY_COLOR)
- Same icon symbol/motif
- Same design style (flat, modern, minimal)
- Same theme keywords

**Example - SecureWeb Guardian consistency**:

```
Icon 16px prompt includes: "gradient purple-blue (#667eea to #764ba2), shield symbol, flat design"
Icon 48px prompt includes: "gradient purple-blue (#667eea to #764ba2), shield symbol, flat design"
Icon 128px prompt includes: "gradient purple-blue (#667eea to #764ba2), shield symbol, flat design"
Promo tile includes: "gradient purple-blue (#667eea to #764ba2), shield symbol, flat design"
```

### For Different Pretexts

**Security Tool variations**:

- Anti-phishing: Shield, lock, guard imagery
- Anti-malware: Shield with virus/bug crossed out
- Privacy tool: Lock, mask, eye-with-slash

**Developer Tool variations**:

- API tester: Code brackets, terminal, API symbol
- Debugger: Bug icon, magnifying glass over code
- Linter: Checkmark, code quality symbol

**Productivity Tool variations**:

- Tab manager: Browser tabs, organization symbols
- Session saver: Bookmark, save icon, folder
- Note taker: Notepad, pencil, document

---

## Quality Checklist

Before using generated images:

- [ ] All icons same symbol/motif (visual consistency)
- [ ] Color palette matches across all assets
- [ ] 16px icon is recognizable (test at actual size)
- [ ] Screenshots show realistic extension UI
- [ ] Promotional tile includes key messaging
- [ ] No watermarks or placeholder text
- [ ] PNG files optimized (compressed)
- [ ] Transparency works on dark backgrounds (test Chrome dark mode)
- [ ] All required sizes generated
- [ ] Files named correctly (icon16.png, etc.)

---

## File Output Structure

```
output/[timestamp]/assets/
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── store/
│   ├── small_promo_tile.png
│   ├── screenshot_1_popup.png
│   ├── screenshot_2_features.png
│   └── screenshot_3_protection.png
└── website/
    ├── hero-illustration.png (optional)
    └── feature-icons/
        ├── detection-icon.png
        ├── cookie-icon.png
        ├── blocking-icon.png
        ├── privacy-icon.png
        ├── performance-icon.png
        └── update-icon.png
```

---

## Future Skill API Contract

**Expected interface for image generation skill:**

```
Input:
{
  "asset_type": "extension_icons" | "store_promotional" | "screenshots" | "website_images",
  "pretext_variables": {
    "EXTENSION_NAME": "string",
    "PRIMARY_COLOR": "#hex",
    "SECONDARY_COLOR": "#hex",
    "ICON_SYMBOL": "string",
    "THEME": "string"
  },
  "specifications_file": "path/to/this/file.md",
  "output_directory": "path/to/save/images"
}

Output:
{
  "generated_files": [
    {"path": "output/assets/icons/icon16.png", "size": "16x16", "format": "PNG"},
    {"path": "output/assets/icons/icon48.png", "size": "48x48", "format": "PNG"},
    {"path": "output/assets/icons/icon128.png", "size": "128x128", "format": "PNG"}
  ],
  "pretext_applied": {
    "EXTENSION_NAME": "SecureWeb Guardian",
    "PRIMARY_COLOR": "#667eea",
    // ...
  }
}
```

---

## Customization for Future Engagements

### Quick Regenerate (5 minutes with image skill)

```
1. Update pretext variables:
   - EXTENSION_NAME: "New Extension Name"
   - PRIMARY_COLOR: "#new-color"
   - ICON_SYMBOL: "new symbol"

2. Call image generation skill with updated variables

3. Replace old images with newly generated ones

4. Test in Chrome (chrome://extensions)
```

**Time saved**: Manual icon design (30-60 min) → Automated (5 min)

---

## Fallback: Manual Creation

**If image generation skill not available**, use these tools:

**Icons**:

- Figma: https://www.figma.com (design tool)
- icon.kitchen: Quick icon generator
- Canva: Template-based design

**Screenshots**:

- Chrome DevTools Device Mode
- macOS: Cmd+Shift+4 for screenshots
- Design tools for mockups

**Promotional Tile**:

- Canva templates
- Figma design
- Photoshop/GIMP

---

## Summary

**This document enables**:

- ✅ Structured prompts for future image generation skill
- ✅ Variable substitution for pretext customization
- ✅ Exact technical requirements (sizes, formats)
- ✅ Quality guidelines and consistency rules
- ✅ Machine-readable specifications (JSON blocks)
- ✅ Human-readable documentation

**When image generation skill exists**:

1. Load this file
2. Extract pretext variables
3. Replace {PLACEHOLDERS} in prompts
4. Generate all required assets automatically
5. Save to structured output directory

**Result**: 5-minute image generation vs 30-60 minutes manual design.
