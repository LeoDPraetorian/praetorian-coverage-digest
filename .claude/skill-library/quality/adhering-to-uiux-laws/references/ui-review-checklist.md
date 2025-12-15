# UI Review Checklist

Systematic validation workflow for applying UI/UX laws to Chariot interfaces.

## How to Use This Checklist

1. **Select relevant sections** based on component type (form, navigation, data display, etc.)
2. **Review each item** and mark pass/fail
3. **Document violations** with specific examples
4. **Apply fixes** from [Common Violations & Fixes](common-violations.md)
5. **Re-validate** after fixes

## Navigation Review

### Hick's Law Compliance
- [ ] Top-level navigation has ≤7 items
- [ ] Dropdown menus have ≤7 visible options
- [ ] Progressive disclosure used for advanced options
- [ ] Related items grouped into categories

### Jakob's Law Compliance
- [ ] Logo in top-left (links to home)
- [ ] User menu in top-right
- [ ] Standard icons used (hamburger, search, cart)
- [ ] Familiar terminology ("Settings" not "Configuration")

### Serial Position Effect
- [ ] Most important items at start or end of navigation
- [ ] Less important items in middle

**Pass Criteria:** All items checked

---

## Form Review

### Miller's Law Compliance
- [ ] Single-page forms have ≤12 fields
- [ ] Forms with 13+ fields use multi-step pattern
- [ ] Fields grouped into 3-4 logical sections
- [ ] Each section has ≤5-7 fields

### Cognitive Load
- [ ] Smart defaults pre-filled when possible
- [ ] Required fields clearly marked
- [ ] Help text provided for complex fields
- [ ] Validation messages are clear and actionable

### Goal Gradient Effect (Multi-Step Forms)
- [ ] Progress indicator shows step X of Y
- [ ] Motivational messaging based on completion
- [ ] "Almost done!" messages near end
- [ ] Steps have clear titles

### Error Prevention (Nielsen #5)
- [ ] Inline validation with real-time feedback
- [ ] Destructive actions require confirmation
- [ ] Disabled states prevent invalid submissions
- [ ] Input types match data (email, number, date)

**Pass Criteria:** 90%+ items checked

---

## Button & Interactive Element Review

### Fitts' Law Compliance
- [ ] Touch targets ≥44x44px (mobile) or ≥32x32px (desktop)
- [ ] Primary CTA is largest button on screen
- [ ] Related actions positioned close together (< 24px gap)
- [ ] Click area expanded beyond visual size (padding)

### Von Restorff Effect
- [ ] Primary CTA uses distinct color (accent)
- [ ] Primary CTA is visually isolated from other buttons
- [ ] Dangerous actions use red/destructive styling
- [ ] Only 1-2 buttons use accent color per screen

### Doherty Threshold
- [ ] Button clicks provide feedback <100ms (visual state change)
- [ ] Disabled buttons have clear disabled styling
- [ ] Loading states shown for operations >400ms
- [ ] Optimistic updates used where appropriate

**Pass Criteria:** All items checked

---

## Visual Layout Review

### Gestalt: Proximity
- [ ] Related elements grouped with tight spacing (12-16px)
- [ ] Unrelated elements separated with wide spacing (32-48px)
- [ ] Spacing ratio is 2-3x between vs within groups

### Gestalt: Similarity
- [ ] Similar actions have consistent styling
- [ ] Status indicators use consistent colors
- [ ] Icon style consistent across app
- [ ] Typography scale applied consistently

### Gestalt: Common Region
- [ ] Cards/containers group related content
- [ ] Background colors distinguish sections
- [ ] Borders/shadows create clear boundaries

### Aesthetic-Usability Effect
- [ ] Consistent spacing and alignment
- [ ] Smooth transitions and animations
- [ ] Quality typography (readable, scalable)
- [ ] Cohesive color palette

**Pass Criteria:** 85%+ items checked

---

## Data Display Review

### Miller's Law (Tables)
- [ ] Visible columns limited to 5-7
- [ ] Additional columns accessible via customization
- [ ] Most important columns at left and right (Serial Position)

### Miller's Law (Dashboards)
- [ ] Default widgets limited to 6-8
- [ ] Related widgets grouped visually
- [ ] Custom dashboard layout available for power users

### Fitts' Law (Tables)
- [ ] Action buttons ≥32x32px
- [ ] Row hover state increases clickable area
- [ ] Primary action always visible
- [ ] Secondary actions in dropdown menu

### Cognitive Load
- [ ] Essential information only in cards/rows
- [ ] Metadata available in details view
- [ ] Progressive disclosure for advanced data
- [ ] Visual hierarchy clear (size, weight, color)

**Pass Criteria:** 90%+ items checked

---

## Performance Review

### Doherty Threshold Compliance
- [ ] Page loads show skeleton/loading state immediately
- [ ] Interactive elements respond <100ms
- [ ] Data fetches show loading indicator <400ms
- [ ] Long operations (>3s) show progress bar

### Goal Gradient Effect
- [ ] Progress bars for multi-step processes
- [ ] Percentage completion displayed
- [ ] Estimated time remaining shown for long operations
- [ ] Real-time updates (not just start/end states)

**Pass Criteria:** All items checked

---

## Mobile Optimization Review

### Fitts' Law (Mobile)
- [ ] Touch targets ≥48x48px (Material Design standard)
- [ ] Spacing between tappable elements ≥8px
- [ ] Primary actions thumb-reachable (bottom 1/3 of screen)
- [ ] Full-width buttons on small screens

### Responsive Layout
- [ ] Navigation adapts to mobile (hamburger menu)
- [ ] Forms stack vertically on mobile
- [ ] Tables use responsive patterns (cards/horizontal scroll)
- [ ] Text remains readable (≥16px font size)

**Pass Criteria:** All items checked (for mobile-enabled features)

---

## Error Handling Review

### Nielsen #9: Error Recovery
- [ ] Error messages in plain language (no codes)
- [ ] Error messages explain what happened
- [ ] Error messages suggest solutions
- [ ] Action buttons provided to resolve errors
- [ ] Retry functionality available when appropriate

### Error Prevention
- [ ] Validation runs in real-time (as user types)
- [ ] Validation messages appear immediately
- [ ] Destructive actions require explicit confirmation
- [ ] Confirmation dialogs explain consequences

**Pass Criteria:** All items checked

---

## Accessibility Review

### WCAG 2.1 AA Compliance
- [ ] Color contrast ≥4.5:1 for text
- [ ] Interactive elements have focus indicators
- [ ] Form inputs have associated labels
- [ ] Error messages programmatically linked to fields
- [ ] Keyboard navigation works for all interactions
- [ ] Screen reader support tested

### Fitts' Law (Accessibility)
- [ ] Click areas expanded for better targeting
- [ ] Tooltips appear on both hover and focus
- [ ] Skip links provided for keyboard navigation

**Pass Criteria:** All items checked

---

## Quick Pass/Fail Summary

After reviewing all relevant sections:

**Overall Score:** ___ / ___ items passed (___%)

**Pass Threshold:** ≥85% for production release

**Critical Failures:** (Must fix before release)
- [ ] Touch targets below minimum size
- [ ] Missing error messages
- [ ] Accessibility violations
- [ ] Navigation exceeds 7 items without grouping
- [ ] No loading states for >400ms operations

**Non-Critical Issues:** (Fix in next iteration)
- Suboptimal spacing
- Inconsistent styling
- Missing tooltips
- Performance optimizations

---

## Validation Workflow

### Phase 1: Pre-Implementation Review

Use this checklist during design phase:
1. Review designs in Figma
2. Validate against relevant laws
3. Document potential violations
4. Adjust design before implementation

### Phase 2: Implementation Review

During development:
1. Review code as components are built
2. Test in browser (desktop + mobile)
3. Validate interactive behaviors
4. Document deviations from checklist

### Phase 3: Pre-Merge Review

Before creating PR:
1. Complete full checklist
2. Test all user flows
3. Validate performance
4. Document any known issues

### Phase 4: PR Review

In pull request:
1. Include checklist in PR description
2. Note which sections apply
3. Document any intentional violations
4. Explain trade-offs made

## Related References

- [Common Violations & Fixes](common-violations.md) - How to fix failed items
- [Design Decision Framework](design-decision-framework.md) - Application strategies
- [Nielsen's Heuristics](nielsens-heuristics.md) - Core usability principles
