# User Behavior Psychology

Laws explaining how users remember, judge, and interact with experiences.

## Table of Contents

- [Jakob's Law](#jakobs-law)
- [Peak-End Rule](#peak-end-rule)
- [Serial Position Effect](#serial-position-effect)
- [Zeigarnik Effect](#zeigarnik-effect)
- [Von Restorff Effect](#von-restorff-effect)
- [Goal Gradient Effect](#goal-gradient-effect)
- [Parkinson's Law](#parkinsons-law)
- [Aesthetic-Usability Effect](#aesthetic-usability-effect)

---

## Jakob's Law

**Definition:** Users spend most of their time on other sites, so they prefer your interface to work the same way.

### Application

Follow established conventions:

```typescript
// ✅ GOOD: Standard patterns users already know
<Header>
  <Logo /> {/* Top-left */}
  <Navigation /> {/* Top-center/left */}
  <UserMenu /> {/* Top-right */}
</Header>

<SearchInput
  icon={<MagnifyingGlass />} {/* Left side */}
  placeholder="Search..." {/* Gray hint text */}
/>

<Button variant="primary">Save</Button> {/* Not "Persist" */}
<Button variant="secondary">Cancel</Button> {/* Not "Abort" */}
```

**Common conventions:**

- Logo top-left (clicks to home)
- Search icon = magnifying glass
- Hamburger menu = navigation
- Shopping cart icon = checkout
- Three dots = more options

### When to Break Conventions

Only when you have strong evidence:

- A/B testing shows better results
- Your users are domain experts (different conventions)
- Innovation provides significant value

---

## Peak-End Rule

**Definition:** People judge experiences based on the peak moment and the ending, not the average.

### Application

Create delightful peaks and positive endings:

```typescript
// ✅ GOOD: Memorable success moment
function ScanComplete() {
  return (
    <div className="text-center py-12">
      {/* Peak moment: Celebration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
      >
        <CheckCircleIcon className="h-24 w-24 text-green-500 mx-auto" />
      </motion.div>

      <h2 className="text-2xl font-bold mt-6">Scan Complete!</h2>
      <p className="text-gray-600 mt-2">
        Found 0 critical vulnerabilities. Your assets are secure.
      </p>

      {/* Positive ending: Clear next steps */}
      <div className="flex gap-3 justify-center mt-8">
        <Button onClick={viewResults}>View Full Report</Button>
        <Button variant="secondary" onClick={scheduleNext}>Schedule Next Scan</Button>
      </div>
    </div>
  );
}
```

**Peak moments in Chariot:**

- Scan completes successfully
- Vulnerability resolved
- New asset discovered
- Report generated

**Positive endings:**

- Thank you messages
- Success confirmations
- Clear next steps
- Achievement unlocked

---

## Serial Position Effect

**Definition:** Users remember first (primacy) and last (recency) items best.

### Application

```typescript
// ✅ GOOD: Important actions at start and end
const navigationItems = [
  'Dashboard',        // First (high priority)
  'Assets',
  'Vulnerabilities',
  'Scans',
  'Reports',
  'Settings',
  'Help'              // Last (high priority)
];

// Form buttons
<div className="flex justify-between mt-8">
  <Button variant="primary">Save Changes</Button> {/* First */}
  <Button variant="destructive">Delete Account</Button> {/* Last */}
</div>
```

**Chariot application:**

- Primary CTA = leftmost button
- Dangerous action = rightmost button
- Less important actions = middle

---

## Zeigarnik Effect

**Definition:** Incomplete tasks stay in memory and create motivation to finish.

### Application

```typescript
// ✅ GOOD: Progress indicators create completion urge
function OnboardingFlow() {
  const steps = ['Profile', 'Team', 'Integrations', 'First Scan'];
  const currentStep = 2;

  return (
    <div>
      {/* Progress bar creates Zeigarnik tension */}
      <ProgressBar
        value={(currentStep / steps.length) * 100}
        label={`${currentStep} of ${steps.length} complete`}
      />

      <StepIndicator steps={steps} current={currentStep} />

      {/* Current step content */}
      <StepContent />

      <div className="flex justify-between mt-6">
        <Button variant="secondary" onClick={goBack}>Back</Button>
        <Button variant="primary" onClick={goNext}>
          Continue {/* Creates forward momentum */}
        </Button>
      </div>
    </div>
  );
}
```

**Other applications:**

- Profile completion percentage
- Checklist with unchecked items
- "2 steps remaining" messages
- Gamification badges

---

## Von Restorff Effect (Isolation Effect)

**Definition:** Items that stand out are more memorable.

### Application

```typescript
// ✅ GOOD: CTA stands out from other actions
<div className="flex gap-2">
  <Button variant="secondary">Cancel</Button>
  <Button variant="secondary">Save Draft</Button>

  {/* Primary CTA stands out with color + size */}
  <Button
    variant="primary"
    size="lg"
    className="bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg"
  >
    <RocketIcon className="mr-2" />
    Launch Scan
  </Button>
</div>
```

**Techniques for isolation:**

- Unique color (accent color)
- Larger size
- Different shape
- Icon/illustration
- Animation

**When to apply:**

- Primary call-to-action
- Critical warnings
- Special offers
- Important notifications

---

## Goal Gradient Effect

**Definition:** Motivation increases as users get closer to completing a goal.

### Application

```typescript
// ✅ GOOD: Show progress and proximity to completion
function AssetImport({ totalAssets, importedAssets }) {
  const progress = (importedAssets / totalAssets) * 100;
  const remaining = totalAssets - importedAssets;

  return (
    <div>
      <ProgressBar value={progress} />

      {/* Motivational messaging based on proximity */}
      {progress < 50 && (
        <p>Importing {importedAssets} of {totalAssets} assets...</p>
      )}
      {progress >= 50 && progress < 90 && (
        <p className="text-blue-600">Halfway there! {remaining} remaining.</p>
      )}
      {progress >= 90 && (
        <p className="text-green-600 font-semibold">
          Almost done! Just {remaining} more...
        </p>
      )}
    </div>
  );
}
```

**Applications:**

- Multi-step forms with step indicators
- File uploads with percentage
- Profile completion scores
- Onboarding checklists

---

## Parkinson's Law

**Definition:** Work expands to fill the time available. Tasks take as long as the time allotted.

### Application

```typescript
// ✅ GOOD: Set time expectations to create urgency
<Card>
  <h3>Quick Scan</h3>
  <p className="text-sm text-gray-600">
    <ClockIcon className="inline h-4 w-4" /> Takes about 2 minutes
  </p>
  <Button onClick={startQuickScan}>Start Now</Button>
</Card>

// Countdown timer for urgency
<div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
  <p className="font-semibold">Limited time: 15% off annual plans</p>
  <Countdown endTime={offerEndTime} />
</div>
```

**Techniques:**

- Display estimated time
- Add countdown timers
- Show "Just one step left!"
- Create artificial deadlines
- Provide time-based incentives

---

## Aesthetic-Usability Effect

**Definition:** Users perceive aesthetically pleasing designs as more usable.

### Application

Invest in visual polish:

```typescript
// ✅ GOOD: Polish creates perceived usability
<Card className="
  bg-gradient-to-br from-white to-gray-50
  border border-gray-200
  shadow-sm hover:shadow-md
  transition-all duration-200
  rounded-lg
  overflow-hidden
">
  <div className="p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
        <ShieldIcon className="h-6 w-6 text-blue-600" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">Security Score</h3>
        <p className="text-sm text-gray-600">Last updated 2 hours ago</p>
      </div>
    </div>

    <div className="text-4xl font-bold text-gray-900">
      92
      <span className="text-lg text-gray-500">/100</span>
    </div>

    <ProgressBar value={92} className="mt-3" />
  </div>
</Card>
```

**Polish elements:**

- Subtle gradients
- Smooth transitions
- Consistent spacing
- Quality typography
- Thoughtful color palette
- Micro-interactions

**Balance:** Don't sacrifice usability for aesthetics, but recognize polish matters.

## Related References

- [Cognitive Psychology Laws](cognitive-psychology-laws.md) - Information processing
- [Performance & Responsiveness](performance-responsiveness.md) - Speed and feedback
- [Design Decision Framework](design-decision-framework.md) - Application strategies
