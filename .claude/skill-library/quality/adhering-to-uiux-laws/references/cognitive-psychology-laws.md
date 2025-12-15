# Cognitive Psychology Laws

Laws derived from cognitive psychology research that explain how humans process information and make decisions.

## Table of Contents

- [Hick's Law](#hicks-law)
- [Miller's Law](#millers-law)
- [Cognitive Load Principles](#cognitive-load-principles)

---

## Hick's Law

**Definition:** The time it takes to make a decision increases logarithmically with the number and complexity of choices.

**Formula:** `T = b × log₂(n + 1)` where T = decision time, n = number of choices, b = constant

### When to Apply

- Designing navigation menus
- Creating dropdown selects
- Presenting action buttons
- Building configuration interfaces

### Implementation Guidelines

**Target:** 5-7 options maximum per level

**Techniques:**
1. **Group similar items** into categories
2. **Use progressive disclosure** to reveal options gradually
3. **Provide smart defaults** to reduce decision burden
4. **Implement search** for large option sets

### Chariot Examples

#### ✅ Good: Grouped Settings Navigation

```typescript
// Settings organized into 5 groups
const settingsGroups = [
  {
    title: 'Account',
    items: ['Profile', 'Password', 'Email Preferences']
  },
  {
    title: 'Security',
    items: ['Two-Factor Auth', 'API Keys', 'Session Management']
  },
  {
    title: 'Notifications',
    items: ['Email Alerts', 'Slack Integration', 'Webhooks']
  },
  {
    title: 'Billing',
    items: ['Subscription', 'Payment Method', 'Invoices']
  },
  {
    title: 'Data',
    items: ['Export', 'Import', 'Integrations']
  }
];
```

**Why this works:**
- Top level: 5 groups (within Hick's Law limit)
- Each group: 3-4 items (easy to scan)
- User makes decisions in stages, not all at once

#### ❌ Bad: Flat List of 15 Items

```typescript
const settingsItems = [
  'Profile', 'Password', 'Email Preferences', 'Two-Factor Auth',
  'API Keys', 'Session Management', 'Email Alerts', 'Slack Integration',
  'Webhooks', 'Subscription', 'Payment Method', 'Invoices',
  'Export', 'Import', 'Integrations'
];
```

**Why this fails:**
- 15 simultaneous choices overwhelm users
- No clear organization or hierarchy
- Violates both Hick's Law (too many) and Miller's Law (exceeds working memory)

### Progressive Disclosure Pattern

```typescript
// Asset actions - show common actions, hide advanced
<DropdownMenu>
  {/* Primary actions (always visible) */}
  <DropdownItem>View Details</DropdownItem>
  <DropdownItem>Edit</DropdownItem>
  <DropdownItem>Share</DropdownItem>

  {/* Advanced actions (progressive disclosure) */}
  <DropdownItem asChild>
    <Accordion>
      <AccordionTrigger>More Actions</AccordionTrigger>
      <AccordionContent>
        <DropdownItem>Duplicate</DropdownItem>
        <DropdownItem>Archive</DropdownItem>
        <DropdownItem>Transfer Ownership</DropdownItem>
      </AccordionContent>
    </Accordion>
  </DropdownItem>

  <DropdownSeparator />
  <DropdownItem variant="destructive">Delete</DropdownItem>
</DropdownMenu>
```

**Benefits:**
- Primary choices: 3 (fast decisions)
- Advanced choices: Hidden until needed
- Progressive disclosure reduces cognitive load

### Multi-Step Forms

Break complex forms into steps to apply Hick's Law:

```typescript
// ❌ WRONG: All fields on one page (12 inputs = decision paralysis)
<Form>
  <Input name="name" />
  <Input name="email" />
  <Input name="company" />
  <Select name="industry" options={50} />
  <Input name="address" />
  <Input name="city" />
  <Select name="country" options={195} />
  <Textarea name="requirements" />
  <Checkbox name="terms" />
  <Checkbox name="marketing" />
  <Checkbox name="newsletter" />
  <Button>Submit</Button>
</Form>

// ✅ CORRECT: Multi-step form (3-4 fields per step)
<MultiStepForm>
  <Step title="Basic Info">
    <Input name="name" />
    <Input name="email" />
    <Input name="company" />
  </Step>

  <Step title="Location">
    <Input name="address" />
    <Input name="city" />
    <Select name="country" options={195} />
  </Step>

  <Step title="Details">
    <Select name="industry" options={50} />
    <Textarea name="requirements" />
  </Step>

  <Step title="Preferences">
    <Checkbox name="terms" required />
    <Checkbox name="marketing" />
    <Checkbox name="newsletter" />
  </Step>
</MultiStepForm>
```

### Trade-offs

**When to violate Hick's Law:**
- Expert users need all options visible (power user mode)
- Search functionality replaces navigation
- Options are grouped so clearly that cognitive load is minimal

**Example: VS Code Command Palette**
- 1000+ commands, but search-first interface eliminates Hick's Law paralysis

---

## Miller's Law

**Definition:** The average person can hold about 7 (±2) items in working memory at once.

**Range:** 5-9 items (modern research suggests 4-5 is more realistic for complex items)

### When to Apply

- Designing navigation structures
- Creating lists and tables
- Organizing form sections
- Displaying dashboard widgets

### Implementation Guidelines

**Technique: Chunking**

Break information into meaningful groups of 5-7 items:

```typescript
// ❌ WRONG: 10-digit phone number (exceeds working memory)
<Input value="5555551234" />

// ✅ CORRECT: Chunked into 3 groups
<Input value="(555) 555-1234" />
```

**Technique: Hierarchical Organization**

```typescript
// Navigation with Miller's Law applied
const navigation = [
  'Dashboard',           // 1
  'Assets',              // 2
  'Vulnerabilities',     // 3
  'Scans',              // 4
  'Reports',            // 5
  'Settings',           // 6
  'Help'                // 7
];

// Each section has its own 5-7 subitems
const assetsSubmenu = [
  'All Assets',
  'Domains',
  'IPs',
  'Web Apps',
  'Cloud Resources'
];
```

### Chariot Examples

#### Dashboard Widget Limit

```typescript
// ✅ GOOD: 6 primary widgets
const defaultWidgets = [
  'Asset Count',
  'Critical Vulnerabilities',
  'Scan Status',
  'Risk Score Trend',
  'Recent Findings',
  'Scheduled Scans'
];

// User can add more via customization, but default is 6
```

**Why this works:**
- Users can comprehend all 6 widgets at a glance
- Within working memory capacity
- Easy to remember layout when returning

#### Table Column Limit

```typescript
// ❌ BAD: Too many columns (12 visible)
const columns = [
  'Name', 'Type', 'Status', 'Owner', 'Created', 'Updated',
  'Risk Score', 'Vulnerabilities', 'Last Scan', 'Next Scan',
  'Tags', 'Actions'
];

// ✅ GOOD: 5-7 essential columns, rest in details view
const visibleColumns = [
  'Name',
  'Risk Score',
  'Vulnerabilities',
  'Last Scan',
  'Status',
  'Actions'
];

const hiddenDetails = [
  'Owner', 'Created', 'Updated', 'Next Scan', 'Tags'
];
```

### Pagination and List Display

Apply Miller's Law to pagination options:

```typescript
// ❌ WRONG: Too many pagination options
const pageSizeOptions = [10, 20, 25, 50, 75, 100, 200, 500];

// ✅ CORRECT: 4-5 meaningful options
const pageSizeOptions = [25, 50, 100, 250];
```

### Form Field Grouping

```typescript
// User profile form - grouped into sections
<Form>
  <FieldGroup title="Basic Information">
    <Input name="firstName" />
    <Input name="lastName" />
    <Input name="email" />
  </FieldGroup>

  <FieldGroup title="Security">
    <Input name="password" />
    <Input name="confirmPassword" />
    <Checkbox name="twoFactorAuth" />
  </FieldGroup>

  <FieldGroup title="Notifications">
    <Checkbox name="emailAlerts" />
    <Checkbox name="slackNotifications" />
    <Checkbox name="webhooks" />
  </FieldGroup>
</Form>
```

**Each group: 3-4 fields (well within Miller's Law limit)**

### Trade-offs

**When to exceed 7 items:**
- Alphabetical lists where users know what they're looking for (e.g., country selector)
- Search-first interfaces (users type, not scan)
- Data tables where columns are essential to decision-making

**Mitigation strategies:**
- Add search/filter functionality
- Use progressive disclosure
- Implement virtualized scrolling for performance
- Provide column customization

---

## Cognitive Load Principles

Cognitive load is the mental effort required to process information. Minimize it for better UX.

### Types of Cognitive Load

1. **Intrinsic Load** - Inherent difficulty of the task
2. **Extraneous Load** - Unnecessary mental effort from poor design
3. **Germane Load** - Mental effort that contributes to learning

**Goal:** Minimize extraneous load, optimize germane load

### Techniques to Reduce Cognitive Load

#### 1. Clear Visual Hierarchy

```typescript
// ✅ GOOD: Clear hierarchy with sizing and spacing
<div className="space-y-6">
  <h1 className="text-2xl font-bold">Asset Details</h1>
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">Vulnerabilities</h2>
    <p className="text-sm text-gray-600">
      Found 5 critical issues requiring immediate attention
    </p>
    <VulnerabilityList />
  </div>
</div>
```

#### 2. Smart Defaults

```typescript
// ✅ GOOD: Pre-filled based on user context
<Select name="scanType" defaultValue={user.mostUsedScanType}>
  <Option value="quick">Quick Scan</Option>
  <Option value="full">Full Scan</Option>
  <Option value="targeted">Targeted Scan</Option>
</Select>
```

**Reduces decisions user must make**

#### 3. Remove Unnecessary Information

```typescript
// ❌ BAD: Information overload
<Card>
  <div>Asset ID: {asset.id}</div>
  <div>Created: {asset.createdAt}</div>
  <div>Updated: {asset.updatedAt}</div>
  <div>Created By: {asset.createdBy}</div>
  <div>Updated By: {asset.updatedBy}</div>
  <div>Version: {asset.version}</div>
  <div>Status: {asset.status}</div>
  <div>Type: {asset.type}</div>
  <div>Name: {asset.name}</div>
</Card>

// ✅ GOOD: Essential information only
<Card>
  <h3 className="text-lg font-semibold">{asset.name}</h3>
  <div className="flex items-center gap-2">
    <Badge>{asset.type}</Badge>
    <StatusIndicator status={asset.status} />
  </div>
  <p className="text-sm text-gray-600">
    Last updated {formatRelativeTime(asset.updatedAt)}
  </p>
</Card>
```

**Metadata available in details view or tooltip**

#### 4. Familiar Patterns

Follow Jakob's Law - use conventions users already know:

```typescript
// ✅ GOOD: Standard patterns
<Button variant="primary">Save Changes</Button>
<Button variant="secondary">Cancel</Button>

// Instead of:
<Button variant="primary">Persist Modifications</Button>
<Button variant="secondary">Abort Operation</Button>
```

### Cognitive Load in Chariot

**High-Load Scenario: Vulnerability Triage**

Problem: Users must process:
- Vulnerability details (CVE, CVSS, description)
- Asset context (what's affected)
- Risk assessment (exploitability, impact)
- Remediation guidance
- Business priority

**Solution: Progressive disclosure with task-focused views**

```typescript
// Primary view - minimal cognitive load
<VulnerabilityCard>
  <div className="flex items-start justify-between">
    <div>
      <h3 className="font-semibold">{vuln.title}</h3>
      <div className="flex items-center gap-2 mt-1">
        <SeverityBadge severity={vuln.cvss} />
        <span className="text-sm">{vuln.cve}</span>
      </div>
    </div>
    <Button size="sm" onClick={handleTriage}>Triage</Button>
  </div>

  {/* Key decision factors only */}
  <div className="mt-2 text-sm space-y-1">
    <div>Affected: {vuln.affectedAssets.length} assets</div>
    <div>Exploit: {vuln.exploitAvailable ? '⚠️ Public' : '✓ None known'}</div>
  </div>
</VulnerabilityCard>

// Details view - progressive disclosure
<VulnerabilityDetails>
  <Tabs>
    <Tab label="Overview">
      {/* Full description, CVSS breakdown */}
    </Tab>
    <Tab label="Affected Assets">
      {/* List of assets */}
    </Tab>
    <Tab label="Remediation">
      {/* Fix guidance */}
    </Tab>
    <Tab label="Technical Details">
      {/* Full CVE data, references */}
    </Tab>
  </Tabs>
</VulnerabilityDetails>
```

**Benefits:**
- Card view: Low cognitive load for scanning/sorting
- Details view: Full information when needed
- User controls information exposure

## Related References

- [Performance & Responsiveness](performance-responsiveness.md) - Doherty Threshold, Fitts' Law
- [Design Decision Framework](design-decision-framework.md) - When to apply each law
- [UI Review Checklist](ui-review-checklist.md) - Validation workflows
