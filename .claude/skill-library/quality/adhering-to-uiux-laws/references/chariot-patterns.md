# Chariot-Specific Patterns

How UI/UX laws apply to Chariot's security platform interfaces.

## Settings Page Pattern (Linear-Inspired)

**Laws Applied:** Law of Common Region, Proximity, Serial Position Effect

**Pattern:** Unified cards with dividers showing current state + edit actions

```typescript
// Settings organized in single cards with automatic dividers
<SettingSection
  title="Scan Settings"
  description="Configure how and when Chariot scans your assets"
>
  <SettingContentCard className="divide-y divide-chariot-stroke">
    <SettingRow>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">Scan Frequency</h3>
          <p className="text-sm text-chariot-text-secondary">
            Run automated scans daily
          </p>
        </div>
        <Button onClick={openEditModal} label="Edit" />
      </div>
    </SettingRow>

    {/* Automatic divider between rows */}
    <SettingRow>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Notification Email</h3>
        <Button onClick={openEditModal} label="Edit" />
      </div>
    </SettingRow>

    <SettingRow>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Scan Headers</h3>
        <CopyableValue value={scanHeader} />
      </div>
    </SettingRow>
  </SettingContentCard>
</SettingSection>
```

**Benefits:**
- Common Region: Single card groups all related settings
- Proximity: Tight spacing within card (16px), wide spacing between sections (56px)
- Serial Position: Most important settings first
- Aesthetic-Usability: Clean, scannable layout

---

## Copyable Values Pattern

**Laws Applied:** Doherty Threshold, System Status Visibility (Nielsen #1)

**Pattern:** Clickable value with green flash feedback + toast

```typescript
const [copied, setCopied] = useState(false);

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(value);

    // Instant visual feedback (0ms - meets Doherty Threshold)
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);

    // Secondary confirmation
    toast.success('Copied to clipboard');
  } catch (error) {
    toast.error('Failed to copy');
  }
};

<button
  onClick={handleCopy}
  className={cn(
    'rounded-md px-3 py-1.5 transition-colors font-mono text-sm',
    copied
      ? 'bg-green-500/10 text-green-600 ring-1 ring-green-500/20'
      : 'bg-chariot-background-secondary text-chariot-text-primary hover:bg-chariot-background-tertiary'
  )}
>
  {value}
</button>
```

**Why this works:**
- Doherty Threshold: Green flash appears in 0ms (instant)
- System Status: User immediately knows action succeeded
- Aesthetic-Usability: Smooth color transition feels polished

**Use cases:**
- Webhook URLs
- API keys
- Scan headers
- Asset identifiers

---

## Asset Table Pattern

**Laws Applied:** Miller's Law, Fitts' Law, Serial Position Effect

```typescript
// Limit to 6 essential columns (Miller's Law)
const columns = [
  {
    id: 'name',
    label: 'Name',
    width: '30%',
    // First column (Serial Position - most important)
  },
  { id: 'riskScore', label: 'Risk Score', width: '15%' },
  { id: 'vulnerabilities', label: 'Vulnerabilities', width: '15%' },
  { id: 'lastScan', label: 'Last Scan', width: '15%' },
  { id: 'status', label: 'Status', width: '15%' },
  {
    id: 'actions',
    label: 'Actions',
    width: '10%',
    // Last column (Serial Position - important + interactive)
  }
];

// Action buttons meet Fitts' Law (44x44px minimum)
function AssetActions({ asset }) {
  return (
    <div className="flex items-center gap-2 justify-end">
      <IconButton
        size="md" // 40x40px
        onClick={() => handleEdit(asset)}
        aria-label="Edit asset"
      >
        <EditIcon className="h-4 w-4" />
      </IconButton>

      <DropdownMenu>
        <DropdownTrigger asChild>
          <IconButton size="md" aria-label="More actions">
            <MoreVerticalIcon className="h-4 w-4" />
          </IconButton>
        </DropdownTrigger>
        <DropdownContent align="end">
          <DropdownItem onClick={() => handleDuplicate(asset)}>
            Duplicate
          </DropdownItem>
          <DropdownItem onClick={() => handleArchive(asset)}>
            Archive
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem
            onClick={() => handleDelete(asset)}
            className="text-red-600"
          >
            Delete
          </DropdownItem>
        </DropdownContent>
      </DropdownMenu>
    </div>
  );
}
```

---

## Vulnerability Triage Pattern

**Laws Applied:** Cognitive Load, Peak-End Rule, Progressive Disclosure

**Pattern:** Minimal card for scanning → Full details for decision-making

```typescript
// Card view: Minimal cognitive load for scanning
<VulnerabilityCard>
  <div className="flex items-start justify-between">
    <div>
      <h3 className="font-semibold">{vuln.title}</h3>
      <div className="flex items-center gap-2 mt-1">
        <SeverityBadge severity={vuln.cvss}>
          {vuln.severity}
        </SeverityBadge>
        <span className="text-sm text-gray-600">{vuln.cve}</span>
      </div>
    </div>

    <Button size="sm" onClick={openDetails}>
      Triage
    </Button>
  </div>

  {/* Key decision factors only */}
  <div className="mt-3 space-y-1 text-sm">
    <div className="flex items-center gap-2">
      <AssetIcon className="h-4 w-4" />
      <span>{vuln.affectedAssets.length} assets affected</span>
    </div>
    <div className="flex items-center gap-2">
      {vuln.exploitAvailable ? (
        <>
          <WarningIcon className="h-4 w-4 text-red-600" />
          <span className="text-red-600">Public exploit available</span>
        </>
      ) : (
        <>
          <CheckIcon className="h-4 w-4 text-green-600" />
          <span className="text-green-600">No known exploits</span>
        </>
      )}
    </div>
  </div>
</VulnerabilityCard>

// Details view: Progressive disclosure of full information
<Sheet>
  <SheetContent className="w-[600px]">
    <SheetHeader>
      <SheetTitle>{vuln.title}</SheetTitle>
    </SheetHeader>

    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="assets">Affected Assets</TabsTrigger>
        <TabsTrigger value="remediation">Remediation</TabsTrigger>
        <TabsTrigger value="technical">Technical Details</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        {/* Full CVSS breakdown, description, etc. */}
      </TabsContent>

      {/* Other tabs... */}
    </Tabs>

    {/* Triage actions at end (Peak-End Rule) */}
    <SheetFooter>
      <Button variant="primary" onClick={handleAccept}>
        Accept Risk
      </Button>
      <Button variant="secondary" onClick={handleScheduleFix}>
        Schedule Fix
      </Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

**Why this works:**
- Card: Low cognitive load for quick scanning (3-4 key facts)
- Details: Full information when making decisions
- Peak-End Rule: Clear actions at end of triage flow

---

## Scan Launch Pattern

**Laws Applied:** Goal Gradient Effect, Doherty Threshold, Peak-End Rule

```typescript
// Multi-step scan wizard
function ScanWizard() {
  const steps = ['Select Assets', 'Configure Scan', 'Review & Launch'];
  const [currentStep, setCurrentStep] = useState(0);
  const [scanProgress, setScanProgress] = useState(0);

  return (
    <Dialog open={isOpen}>
      <DialogContent>
        {/* Progress indicator (Goal Gradient Effect) */}
        <ProgressBar
          value={(currentStep / steps.length) * 100}
          label={`Step ${currentStep + 1} of ${steps.length}`}
        />

        {currentStep === 0 && <SelectAssetsStep />}
        {currentStep === 1 && <ConfigureScanStep />}
        {currentStep === 2 && <ReviewStep />}

        {/* Motivational messaging based on progress */}
        {currentStep === steps.length - 1 && (
          <p className="text-sm text-green-600 font-semibold">
            Almost done! Review and launch your scan.
          </p>
        )}

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setCurrentStep(current => current - 1)}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          <Button
            variant="primary"
            onClick={currentStep === steps.length - 1 ? handleLaunch : handleNext}
          >
            {currentStep === steps.length - 1 ? 'Launch Scan' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Scan results: Peak-End Rule
function ScanComplete({ results }) {
  return (
    <div className="text-center py-12">
      {/* Peak moment: Celebration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
      >
        <CheckCircleIcon className="h-24 w-24 text-green-500 mx-auto" />
      </motion.div>

      <h2 className="text-2xl font-bold mt-6">Scan Complete!</h2>
      <p className="text-gray-600 mt-2">
        Scanned {results.assetCount} assets in {results.duration}
      </p>

      {results.criticalCount === 0 ? (
        <p className="text-lg text-green-600 mt-4 font-semibold">
          ✓ No critical vulnerabilities found
        </p>
      ) : (
        <p className="text-lg text-red-600 mt-4">
          Found {results.criticalCount} critical vulnerabilities
        </p>
      )}

      {/* Positive ending: Clear next steps */}
      <div className="flex gap-3 justify-center mt-8">
        <Button variant="primary" onClick={viewResults}>
          View Full Report
        </Button>
        <Button variant="secondary" onClick={scheduleNext}>
          Schedule Next Scan
        </Button>
      </div>
    </div>
  );
}
```

---

## Dashboard Widget Pattern

**Laws Applied:** Miller's Law, Aesthetic-Usability Effect

```typescript
// Limit to 6 default widgets (Miller's Law)
const defaultLayout = [
  { id: 'asset-count', title: 'Total Assets', col: 1, row: 1 },
  { id: 'critical-vulns', title: 'Critical Vulnerabilities', col: 2, row: 1 },
  { id: 'scan-status', title: 'Scan Status', col: 1, row: 2 },
  { id: 'risk-trend', title: 'Risk Score Trend', col: 2, row: 2 },
  { id: 'recent-findings', title: 'Recent Findings', col: 1, row: 3 },
  { id: 'scheduled-scans', title: 'Scheduled Scans', col: 2, row: 3 }
];

// Polished widget design (Aesthetic-Usability Effect)
<Card className="
  bg-gradient-to-br from-white to-gray-50
  border border-gray-200
  shadow-sm hover:shadow-md
  transition-shadow duration-200
  rounded-lg
  overflow-hidden
">
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <AssetIcon className="h-5 w-5 text-blue-600" />
        </div>
        <CardTitle className="text-base font-semibold">
          Total Assets
        </CardTitle>
      </div>
      <DropdownMenu>
        <DropdownTrigger asChild>
          <IconButton size="sm">
            <MoreVerticalIcon />
          </IconButton>
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem>Refresh</DropdownItem>
          <DropdownItem>Customize</DropdownItem>
          <DropdownItem>Remove</DropdownItem>
        </DropdownContent>
      </DropdownMenu>
    </div>
  </CardHeader>

  <CardContent>
    <div className="text-4xl font-bold text-gray-900">
      1,234
    </div>
    <p className="text-sm text-gray-600 mt-1">
      +42 this week
    </p>
  </CardContent>
</Card>
```

---

## Mobile Optimizations

**Laws Applied:** Fitts' Law, Jakob's Law

### Bottom Sheet for Mobile Actions

```typescript
// Actions in thumb-reachable zone (bottom 1/3 of screen)
<Sheet>
  <SheetTrigger asChild>
    <Button className="w-full sm:w-auto">Actions</Button>
  </SheetTrigger>

  <SheetContent side="bottom" className="h-auto">
    <SheetHeader>
      <SheetTitle>Asset Actions</SheetTitle>
    </SheetHeader>

    <div className="space-y-2 py-4">
      <Button
        className="w-full min-h-[48px] justify-start"
        onClick={handleEdit}
      >
        <EditIcon className="mr-3" />
        Edit Asset
      </Button>
      <Button
        className="w-full min-h-[48px] justify-start"
        onClick={handleShare}
      >
        <ShareIcon className="mr-3" />
        Share
      </Button>
      <Button
        className="w-full min-h-[48px] justify-start text-red-600"
        onClick={handleDelete}
      >
        <TrashIcon className="mr-3" />
        Delete
      </Button>
    </div>
  </SheetContent>
</Sheet>
```

### Floating Action Button

```typescript
// Primary action always accessible (Fitts' Law + Jakob's Law)
<button
  onClick={handleCreateAsset}
  className="
    fixed bottom-6 right-6
    h-14 w-14 rounded-full
    bg-blue-600 text-white
    shadow-lg hover:shadow-xl
    flex items-center justify-center
    z-50
    sm:hidden
  "
  aria-label="Create new asset"
>
  <PlusIcon className="h-6 w-6" />
</button>
```

## Related References

- [Design Decision Framework](design-decision-framework.md) - When to apply these patterns
- [UI Review Checklist](ui-review-checklist.md) - Validate Chariot patterns
- [Common Violations & Fixes](common-violations.md) - Pattern violations
