# Breakdown Strategy

How to break down features into well-structured epics and sub-issues.

## Epic vs Sub-Issue Decision Framework

### What Makes a Good Epic?

An epic represents a **complete user-facing feature or initiative**.

**Characteristics:**
- Delivers end-to-end value
- Spans multiple technical domains (frontend + backend + infrastructure)
- Requires coordination across 4-8 sub-issues
- Takes 2-6 weeks to complete
- Has clear success criteria

**Examples:**
- ✅ "Real-Time Notification System"
- ✅ "Asset Discovery Automation"
- ✅ "Multi-Factor Authentication"
- ❌ "Add button to settings" (too small, just a sub-issue)
- ❌ "Improve the entire platform" (too big, needs multiple epics)

### What Makes a Good Sub-Issue?

A sub-issue is an **independently testable unit of work**.

**Characteristics:**
- Can be completed by one person
- Has clear start and end conditions
- Produces testable output
- Size: S (< 1 day), M (2-4 days), L (5+ days)
- Minimal dependencies on other sub-issues

**Examples:**
- ✅ "Implement WebSocket server Lambda function"
- ✅ "Create notification toast component"
- ✅ "Add DynamoDB table for notification storage"
- ❌ "Build backend" (too vague, not testable)
- ❌ "Do everything" (not scoped)

---

## Breakdown Patterns

### Pattern 1: Layer-Based Breakdown

Break down by technical layer:

```
Epic: Real-Time Notifications

Sub-Issues:
1. Infrastructure: API Gateway WebSocket + DynamoDB table
2. Backend: WebSocket connection handler
3. Backend: Notification dispatching service
4. Frontend: WebSocket client hook
5. Frontend: Notification UI components
6. Integration: E2E tests for delivery flow
```

**When to use:**
- Full-stack features
- Clear technical boundaries
- Independent layer development possible

**Pros:**
- Easy to parallelize (frontend + backend can work concurrently after infrastructure)
- Clear ownership (backend team vs frontend team)

**Cons:**
- Risk of integration issues at end
- May need frequent sync meetings

### Pattern 2: Slice-Based Breakdown

Break down by vertical slices of functionality:

```
Epic: User Profile Management

Sub-Issues:
1. Basic Profile View (frontend + backend + storage)
2. Profile Editing (frontend + backend + validation)
3. Avatar Upload (frontend + backend + S3)
4. Privacy Settings (frontend + backend + permissions)
```

**When to use:**
- Features with multiple related workflows
- Want to ship incrementally
- Single team owns full stack

**Pros:**
- Each sub-issue delivers end-to-end value
- Can deploy incrementally
- Easier to demo progress

**Cons:**
- More context switching between frontend/backend
- Harder to parallelize work

### Pattern 3: Dependency-First Breakdown

Start with foundation, build up:

```
Epic: Asset Discovery Pipeline

Dependencies:
1. Foundation: S3 bucket + SQS queue (no dependencies)
2. Core: Discovery Lambda (depends on 1)
3. Core: Parsing Lambda (depends on 1)
4. Integration: Orchestration Lambda (depends on 2, 3)
5. UI: Discovery dashboard (depends on 4)
6. Testing: E2E validation (depends on all)
```

**When to use:**
- Heavy infrastructure dependencies
- Complex orchestration
- Need strict ordering

**Pros:**
- Clear build order
- Reduces rework (foundation solid before building on it)

**Cons:**
- Less parallelization
- Delays visible progress (UI comes late)

---

## Optimal Sub-Issue Count

**Sweet spot: 4-8 sub-issues per epic**

| Count | Assessment | Action |
|-------|------------|--------|
| 1-3 | Too few - sub-issues likely too large | Split sub-issues into smaller pieces |
| 4-8 | Optimal - manageable coordination | Proceed as planned |
| 9-12 | Getting complex - consider splitting | Review if epic can be split |
| 13+ | Too many - coordination overhead high | Split into multiple epics |

**Example: Too many sub-issues**

```
Epic: Complete Platform Redesign (20 sub-issues)
❌ This should be split into multiple epics:
- Epic 1: Navigation & Layout Redesign (5 sub-issues)
- Epic 2: Component Library Refresh (6 sub-issues)
- Epic 3: Dashboard Redesign (5 sub-issues)
- Epic 4: Settings Redesign (4 sub-issues)
```

---

## Dependency Management

### Types of Dependencies

**1. Technical Dependencies**
- Infrastructure must exist before application code
- Backend APIs must exist before frontend can call them
- Database schema must exist before querying

**2. Domain Dependencies**
- Authentication before authorization
- User creation before user management
- Asset discovery before asset enrichment

**3. Shared Dependencies**
- Multiple sub-issues depend on same foundation
- Shared component used by multiple features

### Visualizing Dependencies

**Simple Linear:**
```
A → B → C → D
```

**Parallel with Merge:**
```
    ┌─→ B ──┐
A ──┤       ├─→ D
    └─→ C ──┘
```

**Complex Tree:**
```
        A (Infrastructure)
       ↙ ↓ ↘
      B  C  D (Core services)
       ↘ ↓ ↙
        E (Integration)
         ↓
        F (UI)
```

### Managing Complex Dependencies

**Strategy 1: Minimize Dependencies**

**Before:**
```
Sub-Issue 1 → Sub-Issue 2 → Sub-Issue 3 → Sub-Issue 4
(Everything sequential, nothing parallel)
```

**After:**
```
Sub-Issue 1 (Foundation)
    ↓
  ┌─┴─┬─┴─┐
  2   3   4  (All can work in parallel)
```

**How**: Ensure foundation is complete and stable, then parallelize

**Strategy 2: Create Shared Foundation Issue**

Instead of:
```
Sub-Issue A needs DB schema
Sub-Issue B needs DB schema
Sub-Issue C needs DB schema
```

Do:
```
Sub-Issue 1: Create DB schema + models (foundation)
Sub-Issue 2-4: Use schema (depend on 1)
```

**Strategy 3: Use Feature Flags**

Allow sub-issues to be merged before complete:

```
Sub-Issue: "Implement notification service"
- Merge with feature flag disabled
- Other teams can depend on it
- Enable flag when ready
```

---

## Scope Management

### When to Split an Epic

**Symptoms of too-large epic:**
- More than 10 sub-issues
- Timeline > 8 weeks
- Multiple teams involved
- Unclear priorities within epic

**How to split:**

**Option 1: Phase-based split**
```
Epic 1: Notification MVP (4 sub-issues, 3 weeks)
Epic 2: Advanced Notifications (6 sub-issues, 4 weeks)
```

**Option 2: Component-based split**
```
Epic 1: Email Notifications (5 sub-issues)
Epic 2: Push Notifications (5 sub-issues)
Epic 3: In-App Notifications (4 sub-issues)
```

**Option 3: Platform-based split**
```
Epic 1: Backend Notification Infrastructure (6 sub-issues)
Epic 2: Frontend Notification UI (5 sub-issues)
```

### When to Merge Sub-Issues

**Symptoms of too-small sub-issues:**
- Sub-issue < 2 hours of work
- No testable output
- Purely refactoring or cleanup
- Can't be independently validated

**How to merge:**

**Before:**
```
Sub-Issue 1: Create component file
Sub-Issue 2: Add props interface
Sub-Issue 3: Implement render
Sub-Issue 4: Add styling
```

**After:**
```
Sub-Issue: Implement notification toast component
- Create component with props interface
- Implement render logic
- Add styling
- Success criteria: Component displays notifications correctly
```

---

## Size Estimation

### T-Shirt Sizing

| Size | Duration | Characteristics |
|------|----------|----------------|
| S | <1 day | Clear approach, minimal unknowns |
| M | 2-4 days | Some unknowns, moderate complexity |
| L | 5+ days | Research needed, high complexity |

**Don't estimate in hours** - use relative sizing

### Complexity Factors

**Increases size:**
- New technology/library to learn
- Unclear requirements
- Many integration points
- High security requirements
- Performance optimization needed

**Decreases size:**
- Similar pattern exists in codebase
- Clear specification
- Well-understood domain
- Reusable components available

### Example Estimations

**S - Simple API endpoint:**
- Copy existing pattern
- Standard CRUD operation
- Minimal validation
- Estimated: 4-6 hours

**M - New React component:**
- Design UI layout
- Implement state management
- Handle edge cases
- Write unit tests
- Estimated: 2-3 days

**L - WebSocket infrastructure:**
- Research WebSocket patterns
- Set up API Gateway
- Implement connection management
- Handle reconnection logic
- Load testing
- Estimated: 5-7 days

---

## Breakdown Checklist

Before finalizing epic breakdown, verify:

- [ ] Epic delivers complete end-user value
- [ ] 4-8 sub-issues (optimal range)
- [ ] Each sub-issue independently testable
- [ ] Dependencies are clear and documented
- [ ] Foundation issues identified (build first)
- [ ] Sub-issues sized appropriately (S/M/L)
- [ ] Parallel work opportunities identified
- [ ] Success criteria defined for epic and sub-issues

---

## Real Example: CHARIOT-1853

**Epic:** Nuclei Template Intelligence Platform

**Breakdown approach:** Dependency-first + layer-based

**Sub-Issues:**
1. **CHARIOT-1854**: Agent Sandbox Infrastructure (L)
   - Foundation - must exist first
   - No dependencies
   - Blocks everything else

2. **CHARIOT-1852**: FP Refinement Agent (M)
   - Depends on: Sandbox
   - Core workflow

3. **CHARIOT-1855**: Third-Party Mapping Engine (M)
   - Depends on: Sandbox
   - Core workflow

4. **CHARIOT-1856**: Comparison & Validation (M)
   - Depends on: Sandbox, Mapping
   - Advanced capability

5. **CHARIOT-1857**: Template Generation (L)
   - Depends on: Sandbox, Comparison
   - Advanced capability

6. **CHARIOT-1858**: Chat Interface (M)
   - Shared component
   - Used by: 1852, 1856, 1857

**Why this works:**
- 6 sub-issues (optimal range)
- Clear foundation (Sandbox)
- Parallel opportunities (1852 + 1855 can start together)
- Shared component identified (Chat Interface)
- Each sub-issue independently testable
