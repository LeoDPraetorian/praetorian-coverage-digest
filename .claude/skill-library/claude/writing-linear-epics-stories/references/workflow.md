# Writing Linear Epics & Stories - Complete Workflow

Step-by-step process for creating well-structured Linear epics with comprehensive sub-issues.

## Table of Contents

- [Phase 1: Research & Understanding](#phase-1-research--understanding)
- [Phase 2: Structure & Breakdown](#phase-2-structure--breakdown)
- [Phase 3: Documentation & Content](#phase-3-documentation--content)
- [Phase 4: Linear Creation](#phase-4-linear-creation)
- [Validation Loops](#validation-loops)

---

## Phase 1: Research & Understanding

**Time allocation: 30-40% of total effort**

### Step 1.1: Understand User Intent

Ask clarifying questions if needed:

- What's the core value being delivered?
- Who are the primary users/stakeholders?
- What's the timeline/priority?
- Are there existing related features?

### Step 1.2: Explore Codebase

Use the Explore agent for broad discovery:

```typescript
Task(
  "Explore codebase for notification patterns",
  "Find existing notification implementations, WebSocket usage, message queuing patterns",
  "Explore"
);
```

**What to search for:**

- Similar features already implemented
- Relevant backend services/APIs
- Frontend components that might be reused
- Integration points with existing systems
- Database schemas or models

### Step 1.3: Identify Technical Components

Map out the technical landscape:

```
Frontend:
- React components in ui/src/sections/notifications/
- WebSocket client hooks in ui/src/hooks/useWebSocket.ts
- State management with Zustand

Backend:
- Lambda functions in backend/pkg/handler/handlers/notification/
- DynamoDB tables for notification storage
- SQS queues for async processing

Infrastructure:
- API Gateway WebSocket API
- ElastiCache for presence tracking
```

### Step 1.4: Map Dependencies

Create a dependency graph:

```
Infrastructure Setup (AWS resources)
    ↓
Backend WebSocket Server (Lambda + API Gateway)
    ↓
Backend Notification Service (Business logic)
    ↓
Frontend WebSocket Client (Connection management)
    ↓
Frontend UI Components (User interface)
    ↓
Integration Testing (E2E validation)
```

**Validation Loop:**

- Do you understand the technical components?
- Have you identified all dependencies?
- Can you explain the data flow?

If not → Continue research.
If yes → Proceed to Phase 2.

---

## Phase 2: Structure & Breakdown

**Time allocation: 20-30% of total effort**

### Step 2.1: Define the Epic

An epic represents the **complete feature/initiative**.

**Epic characteristics:**

- Describes the overarching goal
- Provides business context
- Lists all sub-issues
- Shows architecture/workflow diagrams
- Defines success criteria

**Example epic title:**

```
Epic: Real-Time Notification System
```

### Step 2.2: Identify Sub-Issues

Break down into **independently testable** units of work.

**Sub-issue types:**

1. **Foundation/Infrastructure** (build first)
   - AWS resources, database schemas, queues
   - Example: "Set up API Gateway WebSocket API"

2. **Core Implementation** (main logic)
   - Backend services, APIs, business logic
   - Example: "Implement notification dispatching service"

3. **User Interface** (after backend ready)
   - Frontend components, user interactions
   - Example: "Build notification toast component"

4. **Integration** (after components exist)
   - Testing, monitoring, deployment
   - Example: "E2E tests for notification delivery"

**Optimal sub-issue count: 4-8**

- Too few (<4): Sub-issues too large, hard to parallelize
- Too many (>10): Coordination overhead, split into multiple epics

### Step 2.3: Assign Dependencies

Mark which sub-issues must complete before others start:

```
CHARIOT-1001 (Infrastructure) → No dependencies
CHARIOT-1002 (Backend WebSocket) → Depends on 1001
CHARIOT-1003 (Backend Service) → Depends on 1002
CHARIOT-1004 (Frontend Client) → Depends on 1002
CHARIOT-1005 (Frontend UI) → Depends on 1004
CHARIOT-1006 (Integration Tests) → Depends on 1003, 1005
```

### Step 2.4: Size Estimation

Estimate complexity (not time):

| Size | Description              | Example                                |
| ---- | ------------------------ | -------------------------------------- |
| S    | <1 day, clear approach   | Add a new API endpoint                 |
| M    | 2-4 days, some unknowns  | Implement WebSocket server             |
| L    | 5+ days, research needed | Design distributed notification system |

**Validation Loop:**

- Is each sub-issue independently testable?
- Are dependencies clear and minimal?
- Is the epic scope reasonable (4-8 sub-issues)?

If not → Refine breakdown.
If yes → Proceed to Phase 3.

---

## Phase 3: Documentation & Content

**Time allocation: 30-40% of total effort**

### Step 3.1: Write Epic Description

**Epic description template:**

```markdown
## Overview

[2-3 sentence summary of what this epic delivers]

## Vision

[Why are we building this? What value does it provide?]

## Sub-Issues (Implementation Phases)

### Phase 1: Foundation

- [ ] CHARIOT-XXXX: [Sub-issue title] - [Purpose]

### Phase 2: Core Implementation

- [ ] CHARIOT-XXXX: [Sub-issue title] - [Purpose]

### Phase 3: Integration

- [ ] CHARIOT-XXXX: [Sub-issue title] - [Purpose]

## Architecture

\`\`\`
[ASCII diagram showing system components and data flow]
\`\`\`

## Implementation Phases

**Phase 1: Foundation**

- Description of what gets built first

**Phase 2: Core**

- Description of main functionality

**Phase 3: Integration**

- Description of final integration

## Success Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Related Work

- Link to relevant documentation
- Link to similar features
```

### Step 3.2: Write Sub-Issue Descriptions

**Sub-issue description template:**

```markdown
## Overview

[What this sub-issue accomplishes]

## Technical Approach

[How it will be implemented]

## Components Involved

- Component 1: Purpose
- Component 2: Purpose

## Dependencies

- Depends on: CHARIOT-XXXX (reason)
- Blocks: CHARIOT-YYYY (reason)

## Implementation Steps

1. Step 1
2. Step 2
3. Step 3

## Success Criteria

- [ ] Criterion 1
- [ ] Criterion 2

## Parent Epic

CHARIOT-XXXX: [Epic title]
```

### Step 3.3: Create Diagrams

Use ASCII art for architecture:

**Data flow diagram:**

```
┌─────────┐       ┌──────────┐       ┌─────────┐
│ Client  │──WS──→│ API GW   │──────→│ Lambda  │
│ Browser │←──────│ WebSocket│←──────│ Handler │
└─────────┘       └──────────┘       └─────────┘
                                           │
                                           ▼
                                     ┌──────────┐
                                     │ DynamoDB │
                                     └──────────┘
```

**Workflow diagram:**

```
Event Triggered
    ↓
Create Notification
    ↓
Store in DynamoDB
    ↓
Push to SQS Queue
    ↓
Lambda Processes
    ↓
WebSocket Broadcast
    ↓
Client Receives
```

**Decision tree:**

```
User Action
    ├─ If critical → Immediate push notification
    ├─ If medium → Batched notification
    └─ If low → Email digest only
```

### Step 3.4: Add Code Examples (When Helpful)

Include relevant code snippets:

```typescript
// Example WebSocket hook usage
const { isConnected, send } = useWebSocket({
  onMessage: (notification) => {
    toast.show(notification.message);
  },
});
```

**Validation Loop:**

- Is the epic description comprehensive?
- Do sub-issue descriptions provide clear scope?
- Are diagrams included and helpful?
- Are success criteria measurable?

If not → Improve documentation.
If yes → Proceed to Phase 4.

---

## Phase 4: Linear Creation

**Time allocation: 10-20% of total effort**

### Step 4.1: Create Epic First

```typescript
const epicResult = await createIssue.execute({
  team: "Chariot",
  title: "Epic: Real-Time Notification System",
  description: epicDescription, // From Phase 3
  priority: 2, // High
});

const epicId = epicResult.issue.id; // Save for linking sub-issues
```

### Step 4.2: Create Sub-Issues with Parent Linking

```typescript
for (const subIssue of subIssues) {
  const result = await createIssue.execute({
    team: "Chariot",
    title: subIssue.title,
    description: subIssue.description,
    priority: subIssue.priority,
    parentId: epicId, // Link to epic
  });

  console.log(`Created: ${result.issue.identifier}`);
}
```

### Step 4.3: Verify Creation

After all tickets created:

- Check epic URL shows all sub-issues
- Verify descriptions render correctly (markdown, diagrams)
- Confirm dependencies are clear in descriptions

### Step 4.4: Handle API Quirks

**Control character sanitization:**

The Linear wrapper uses `validateNoControlCharsAllowWhitespace` which:

- ✅ Allows: newlines (`\n`), tabs (`\t`), carriage returns (`\r`)
- ❌ Blocks: null bytes, backspace, form feed, etc.

If you get "Control characters not allowed" error:

1. Check for non-printable characters in source
2. Remove emojis
3. Verify no hidden characters in copied text

**Field length limits:**

Linear has field length limits (not documented but exist). If description is very long:

- Use progressive disclosure pattern
- Link to external docs for details
- Keep core content in description

**Validation Loop:**

- All tickets created successfully?
- Parent/child links working?
- Descriptions rendering correctly?

If not → Debug and fix issues.
If yes → Epic creation complete!

---

## Validation Loops Summary

| Phase            | Validation Question                   | Action if No      |
| ---------------- | ------------------------------------- | ----------------- |
| 1: Research      | Understand components & dependencies? | Continue research |
| 2: Breakdown     | Sub-issues independent & scoped well? | Refine structure  |
| 3: Documentation | Epic & sub-issues comprehensive?      | Improve content   |
| 4: Creation      | All tickets created and linked?       | Debug and retry   |

**Total time: 2-4 hours for complex epic**

- Simple epic (4 sub-issues): 1-2 hours
- Complex epic (8 sub-issues): 3-4 hours
- Very complex (split into multiple epics): 5+ hours
