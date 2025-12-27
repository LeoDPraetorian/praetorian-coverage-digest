---
name: adhering-to-uiux-laws
description: Applies cognitive psychology and UX laws (Hick's, Fitts', Miller's, Gestalt, Nielsen's heuristics) to interface design. Use when designing UI, reviewing interfaces, or ensuring UX consistency.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Adhering to UI/UX Laws

## When to Use This Skill

Use this skill when:

- **Designing new UI components** or features for Chariot
- **Reviewing interface designs** for usability and consistency
- **Refactoring existing interfaces** to improve user experience
- **Making design decisions** about layout, navigation, or interactions
- **Resolving usability conflicts** between team members
- **Ensuring accessibility** and cognitive ergonomics

**Symptoms that indicate you need this skill:**

- Users complain about "too many options" (Hick's Law violation)
- Navigation feels inconsistent across pages (Jakob's Law violation)
- Important buttons are hard to click on mobile (Fitts' Law violation)
- Forms feel overwhelming (Miller's Law violation)
- Interface loads slowly without feedback (Doherty Threshold violation)

## Quick Start

### Example 1: Simplifying Navigation (Hick's Law)

**Problem:** Settings page has 15 top-level menu items

**Solution:**

```typescript
// ❌ WRONG: Too many choices (violates Hick's Law)
const menuItems = [
  "Profile",
  "Password",
  "Email",
  "Notifications",
  "Privacy",
  "Security",
  "Billing",
  "Subscription",
  "API Keys",
  "Webhooks",
  "Integrations",
  "Export",
  "Import",
  "Logs",
  "Advanced",
];

// ✅ CORRECT: Grouped into 5-7 categories (follows Hick's Law + Miller's Law)
const menuGroups = [
  { label: "Account", items: ["Profile", "Password", "Email"] },
  { label: "Preferences", items: ["Notifications", "Privacy"] },
  { label: "Security", items: ["Security", "API Keys", "Webhooks"] },
  { label: "Billing", items: ["Billing", "Subscription"] },
  { label: "Data", items: ["Export", "Import", "Integrations", "Logs"] },
];
```

### Example 2: Optimizing Button Size (Fitts' Law)

```typescript
// ❌ WRONG: Small, hard-to-click targets
<Button className="px-2 py-1 text-xs">Delete Asset</Button>

// ✅ CORRECT: Larger targets (44x44px minimum for touch)
<Button className="px-4 py-2.5 text-sm min-h-[44px]">Delete Asset</Button>
```

## Table of Contents

This skill is organized into detailed reference documents. Read them as needed:

### Core Principles

- **[Cognitive Psychology Laws](references/cognitive-psychology-laws.md)** - Hick's Law, Miller's Law, cognitive load
- **[Performance & Responsiveness](references/performance-responsiveness.md)** - Doherty Threshold, Fitts' Law
- **[Visual Perception (Gestalt)](references/gestalt-principles.md)** - Proximity, Similarity, Common Region, Closure
- **[User Behavior Psychology](references/user-behavior-psychology.md)** - Peak-End Rule, Serial Position Effect, Zeigarnik Effect

### Practical Application

- **[Design Decision Framework](references/design-decision-framework.md)** - Decision trees for common scenarios
- **[Nielsen's 10 Usability Heuristics](references/nielsens-heuristics.md)** - Foundational usability principles
- **[Chariot-Specific Patterns](references/chariot-patterns.md)** - How laws apply to security platform UI

### Validation & Quality

- **[UI Review Checklist](references/ui-review-checklist.md)** - Law-by-law validation
- **[Common Violations & Fixes](references/common-violations.md)** - Real examples from Chariot

## Core Workflow

When designing or reviewing UI, follow this systematic approach:

### 1. **Understand the User Goal**

- What task is the user trying to accomplish?
- What's their mental model coming into this interface?
- What expectations do they have? (Jakob's Law)

### 2. **Apply Decision Framework**

For your specific scenario, consult:

- **Navigation design** → [Design Decision Framework](references/design-decision-framework.md#navigation)
- **Form design** → [Design Decision Framework](references/design-decision-framework.md#forms)
- **Visual hierarchy** → [Design Decision Framework](references/design-decision-framework.md#visual-design)
- **Performance** → [Design Decision Framework](references/design-decision-framework.md#performance)

### 3. **Validate Against Laws**

Use the [UI Review Checklist](references/ui-review-checklist.md) to systematically verify:

- Cognitive load is minimized (Hick's, Miller's)
- Interactive elements are accessible (Fitts')
- Visual grouping is clear (Gestalt principles)
- Feedback is timely (Doherty Threshold)

### 4. **Document Decisions**

Record which laws influenced your design:

```typescript
// Example: Asset table pagination
// Applying Serial Position Effect - most important actions at start/end
const actions = [
  "Select All", // Start (high priority)
  "Export Selected",
  "Bulk Edit",
  "Delete Selected", // End (high priority, dangerous action)
];
```

## Best Practices

### ✅ Do This

- **Apply multiple laws together** - Laws reinforce each other (e.g., Hick's Law + Miller's Law for navigation)
- **Use progressive disclosure** - Hide complexity until needed (Tesler's Law)
- **Provide immediate feedback** - Meet Doherty Threshold (<400ms)
- **Test with real users** - Laws provide guidance, not guarantees
- **Document law-based decisions** - Help team understand "why" behind design choices

### ❌ Don't Do That

- **Don't follow laws blindly** - Context matters; sometimes breaking a law is correct
- **Don't optimize prematurely** - Focus on high-impact areas first (Pareto Principle)
- **Don't sacrifice usability for aesthetics** - Balance Aesthetic-Usability Effect with actual functionality
- **Don't add unnecessary features** - Follow Occam's Razor (simplest solution wins)

## Critical Rules

1. **Hick's Law Limit**: Navigation/menus should have ≤7 top-level items (apply Miller's Law too)
2. **Fitts' Law Minimum**: Touch targets must be ≥44x44px (iOS/Android guideline)
3. **Doherty Threshold**: UI feedback must appear within 400ms
4. **Miller's Law**: Chunk information into groups of 5-7 items
5. **Jakob's Law**: Follow platform conventions unless you have strong evidence to diverge

## Law-Specific Quick Reference

| Law                        | Application             | Chariot Example                                |
| -------------------------- | ----------------------- | ---------------------------------------------- |
| **Hick's Law**             | Reduce choices          | Settings tabs: 5 groups vs 15 items            |
| **Fitts' Law**             | Larger/closer targets   | Primary CTA buttons 44x44px minimum            |
| **Miller's Law**           | Chunk to 7±2 items      | Navigation limited to 7 main sections          |
| **Doherty Threshold**      | <400ms feedback         | Loading spinners, optimistic updates           |
| **Jakob's Law**            | Follow conventions      | Hamburger menu, shopping cart icon             |
| **Aesthetic-Usability**    | Polish matters          | Consistent styling increases perceived quality |
| **Serial Position Effect** | Important items at ends | "Save" and "Cancel" at form start/end          |
| **Peak-End Rule**          | Memorable moments       | Success animations, thank-you messages         |

See [Cognitive Psychology Laws](references/cognitive-psychology-laws.md) for complete definitions and examples.

## Troubleshooting

### Problem: "Interface feels cluttered and overwhelming"

**Likely violations:**

- Hick's Law (too many options)
- Miller's Law (information overload)
- Gestalt principles (poor visual grouping)

**Fix:**

1. Apply progressive disclosure (hide advanced features)
2. Group related items using Gestalt Law of Common Region
3. Limit visible options to 5-7 using Hick's Law

See [Common Violations & Fixes](references/common-violations.md#cluttered-interface)

### Problem: "Users can't find important actions"

**Likely violations:**

- Serial Position Effect (buried in middle)
- Von Restorff Effect (doesn't stand out)
- Gestalt principles (poor visual hierarchy)

**Fix:**

1. Move to start or end of list (Serial Position Effect)
2. Use contrasting color (Von Restorff Effect)
3. Increase size (Fitts' Law + visual hierarchy)

See [Common Violations & Fixes](references/common-violations.md#hidden-actions)

### Problem: "Mobile users struggle with buttons"

**Likely violations:**

- Fitts' Law (targets too small)
- Proximity (actions too far apart)

**Fix:**

1. Increase touch targets to ≥44x44px
2. Add spacing between adjacent buttons
3. Position frequent actions within thumb reach

See [Chariot-Specific Patterns](references/chariot-patterns.md#mobile-optimizations)

## Integration with Chariot Development

This skill integrates with:

- **frontend-developer** - Apply laws during React component creation
- **uiux-designer** - Referenced for design decisions and Figma reviews
- **frontend-reviewer** - Validate law compliance during code review

## Related Skills

- **uiux-designer** - Broader UI/UX design skill including visual design, accessibility
- **react-performance-optimization** - Performance aspects (Doherty Threshold)
- **code-review-checklist** - Quality validation workflows

## Change Log

- **2025-12-14**: Initial creation with 31 UI/UX laws from web research
