# Gestalt Principles (Visual Perception)

Psychological laws describing how humans naturally organize visual elements into patterns and groups.

**Core Philosophy:** "The whole is greater than the sum of its parts"

## Table of Contents

- [Law of Proximity](#law-of-proximity)
- [Law of Similarity](#law-of-similarity)
- [Law of Common Region](#law-of-common-region)
- [Law of Uniform Connectedness](#law-of-uniform-connectedness)
- [Law of Closure](#law-of-closure)
- [Law of Continuity](#law-of-continuity)
- [Figure/Ground](#figureground)

---

## Law of Proximity

**Definition:** Elements positioned close together are perceived as belonging to the same group.

### Application

```typescript
// ✅ GOOD: Form fields grouped by proximity
<form className="space-y-8">
  {/* Group 1: Personal Info (close spacing) */}
  <div className="space-y-3">
    <Input label="First Name" />
    <Input label="Last Name" />
    <Input label="Email" />
  </div>

  {/* Gap indicates separation */}

  {/* Group 2: Security (close spacing) */}
  <div className="space-y-3">
    <Input label="Password" type="password" />
    <Input label="Confirm Password" type="password" />
  </div>
</form>
```

**Spacing guide:**
- **Within group:** 12-16px (0.75-1rem)
- **Between groups:** 32-48px (2-3rem)
- **Ratio:** 2-3x difference makes grouping obvious

### Chariot Example: Settings Layout

```typescript
// Settings cards with proximity grouping
<div className="space-y-14"> {/* Large gaps between sections */}
  <SettingSection title="Account">
    <div className="space-y-6"> {/* Medium gaps within section */}
      <SettingRow>Profile Settings</SettingRow>
      <SettingRow>Password</SettingRow>
      <SettingRow>Email Preferences</SettingRow>
    </div>
  </SettingSection>

  <SettingSection title="Security">
    <div className="space-y-6">
      <SettingRow>Two-Factor Auth</SettingRow>
      <SettingRow>API Keys</SettingRow>
    </div>
  </SettingSection>
</div>
```

---

## Law of Similarity

**Definition:** Elements sharing visual characteristics (color, shape, size) are perceived as related.

### Application

```typescript
// ✅ GOOD: Consistent styling for related actions
<div className="flex gap-2">
  {/* All edit actions: Blue + pencil icon */}
  <Button variant="secondary" className="text-blue-600">
    <PencilIcon /> Edit Profile
  </Button>
  <Button variant="secondary" className="text-blue-600">
    <PencilIcon /> Edit Settings
  </Button>

  {/* All delete actions: Red + trash icon */}
  <Button variant="destructive">
    <TrashIcon /> Delete Account
  </Button>
  <Button variant="destructive">
    <TrashIcon /> Delete Data
  </Button>
</div>
```

**Similarity signals:**
- **Color:** Same color = same category
- **Shape:** Consistent button shapes for actions
- **Size:** Similar importance = similar size
- **Icons:** Consistent iconography

### Chariot Example: Status Badges

```typescript
// Consistent badge styling for statuses
<div className="flex gap-2">
  <Badge className="bg-green-100 text-green-700">Active</Badge>
  <Badge className="bg-green-100 text-green-700">Healthy</Badge>
  <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
  <Badge className="bg-yellow-100 text-yellow-700">Warning</Badge>
  <Badge className="bg-red-100 text-red-700">Critical</Badge>
  <Badge className="bg-red-100 text-red-700">Failed</Badge>
</div>
```

**Users instantly understand:**
- Green = positive states
- Yellow = caution states
- Red = critical states

---

## Law of Common Region

**Definition:** Elements within a defined boundary (box, background) are perceived as grouped.

### Application

```typescript
// ✅ GOOD: Cards create visual regions
<div className="grid grid-cols-2 gap-4">
  <Card className="bg-white border p-6">
    <h3>Asset Count</h3>
    <p className="text-3xl font-bold">1,234</p>
  </Card>

  <Card className="bg-white border p-6">
    <h3>Vulnerabilities</h3>
    <p className="text-3xl font-bold">42</p>
  </Card>
</div>
```

**Region indicators:**
- **Background color:** Distinguishes sections
- **Borders:** Clear boundaries
- **Shadows:** Depth creates separation
- **Spacing:** Negative space around region

### Chariot Example: Settings Cards

```typescript
// Unified card with dividers (from Linear pattern)
<SettingContentCard className="divide-y divide-chariot-stroke">
  <SettingRow> {/* First item */}
    <div className="flex justify-between">
      <div>
        <h3>Scan Frequency</h3>
        <p>How often to run automated scans</p>
      </div>
      <Button onClick={openModal}>Edit</Button>
    </div>
  </SettingRow>

  <SettingRow> {/* Second item */}
    <div className="flex justify-between">
      <h3>Notification Email</h3>
      <Button onClick={openModal}>Edit</Button>
    </div>
  </SettingRow>
</SettingContentCard>
```

**Benefits:**
- Single card = all related settings
- Dividers = separate items within group
- Common region = unified concept

---

## Law of Uniform Connectedness

**Definition:** Elements visually connected (lines, arrows, color) are perceived as more related.

### Application

```typescript
// ✅ GOOD: Visual connectors show relationships
<div className="space-y-4">
  {/* Connected with lines */}
  <div className="flex items-center gap-2">
    <div className="h-8 w-8 rounded-full bg-blue-500" />
    <div className="h-px w-12 bg-gray-300" /> {/* Line connector */}
    <div className="h-8 w-8 rounded-full bg-blue-500" />
    <div className="h-px w-12 bg-gray-300" />
    <div className="h-8 w-8 rounded-full bg-blue-500" />
  </div>

  {/* Breadcrumbs with separators */}
  <nav className="flex items-center gap-2 text-sm">
    <a href="/">Home</a>
    <ChevronRight className="h-4 w-4 text-gray-400" />
    <a href="/assets">Assets</a>
    <ChevronRight className="h-4 w-4 text-gray-400" />
    <span>Asset Details</span>
  </nav>
</div>
```

### Chariot Example: Attack Path Visualization

```typescript
// Asset relationships with visual connections
<div className="relative">
  {assets.map((asset, i) => (
    <div key={asset.id} className="relative">
      <AssetNode asset={asset} />

      {i < assets.length - 1 && (
        <svg className="absolute left-1/2 top-full h-8 w-px">
          <line
            x1="0" y1="0"
            x2="0" y2="100%"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4"
          />
        </svg>
      )}
    </div>
  ))}
</div>
```

**Visual connection = relationship**

---

## Law of Closure

**Definition:** People perceive complete shapes even when parts are missing—brains "fill in gaps."

### Application

```typescript
// ✅ GOOD: Minimalist icons using closure
<svg viewBox="0 0 24 24" fill="none">
  {/* Incomplete circle - brain fills in the gap */}
  <path
    d="M3 12a9 9 0 0 1 9-9m9 9a9 9 0 0 1-9 9"
    stroke="currentColor"
    strokeWidth="2"
  />
</svg>
```

**Benefits:**
- Cleaner design
- Less visual weight
- Still recognizable

### Chariot Example: Loading States

```typescript
// Incomplete circles = progress/loading
<div className="relative h-12 w-12">
  <svg className="animate-spin">
    <circle
      cx="24" cy="24" r="20"
      stroke="currentColor"
      strokeWidth="4"
      strokeDasharray="80 40" // Gap implies motion
      fill="none"
    />
  </svg>
</div>
```

---

## Law of Continuity

**Definition:** Elements arranged on a line or curve are perceived as related and following a path.

### Application

```typescript
// ✅ GOOD: Aligned form labels and inputs
<form className="space-y-4">
  {/* Vertical alignment creates visual flow */}
  <div>
    <Label>Name</Label>
    <Input />
  </div>
  <div>
    <Label>Email</Label>
    <Input />
  </div>
  <div>
    <Label>Password</Label>
    <Input />
  </div>
</form>
```

**Alignment guide:**
- Left-align labels and inputs (vertical flow)
- Consistent spacing creates rhythm
- Eye follows natural path top-to-bottom

### Chariot Example: Timeline View

```typescript
// Events on timeline follow continuity
<div className="relative pl-8">
  {/* Vertical line */}
  <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-300" />

  {events.map(event => (
    <div key={event.id} className="relative pb-8">
      {/* Dot on line */}
      <div className="absolute left-[-2rem] top-0 h-4 w-4 rounded-full bg-blue-500" />

      {/* Event content */}
      <Card>{event.description}</Card>
    </div>
  ))}
</div>
```

**Benefits:**
- Clear chronological flow
- Dots on line = connected events
- Easy to scan and follow

---

## Figure/Ground

**Definition:** Users perceive objects as either foreground (figure) or background (ground).

### Application

```typescript
// ✅ GOOD: Modal with clear figure/ground
<div className="fixed inset-0 z-50">
  {/* Ground: Semi-transparent overlay */}
  <div className="absolute inset-0 bg-black/50" onClick={closeModal} />

  {/* Figure: Modal dialog */}
  <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-md mx-auto mt-20 p-6">
    <h2>Confirm Delete</h2>
    <p>Are you sure you want to delete this asset?</p>
    <div className="flex gap-2 mt-4">
      <Button variant="destructive">Delete</Button>
      <Button variant="secondary">Cancel</Button>
    </div>
  </div>
</div>
```

**Techniques:**
- **Contrast:** High contrast = figure
- **Depth:** Shadows create layers
- **Color:** Brighter = foreground
- **Blur:** Background blur emphasizes figure

### Chariot Example: Asset Details Drawer

```typescript
// Drawer with clear figure/ground separation
<Sheet open={isOpen}>
  {/* Ground: Page content (dimmed) */}
  <SheetOverlay className="bg-black/20" />

  {/* Figure: Drawer (bright, high contrast) */}
  <SheetContent className="bg-white w-[600px]">
    <SheetHeader>
      <SheetTitle>Asset Details</SheetTitle>
    </SheetHeader>

    <div className="py-6">
      <AssetDetailsForm />
    </div>
  </SheetContent>
</Sheet>
```

## Related References

- [Cognitive Psychology Laws](cognitive-psychology-laws.md) - How users process information
- [Design Decision Framework](design-decision-framework.md) - When to apply Gestalt principles
- [UI Review Checklist](ui-review-checklist.md) - Visual grouping validation
