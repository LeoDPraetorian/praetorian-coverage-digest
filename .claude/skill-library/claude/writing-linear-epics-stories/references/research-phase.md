# Research Phase

How to effectively explore the codebase before writing Linear tickets.

## Why Research First?

**Without research:**
- ❌ Generic tickets with no technical context
- ❌ Miss existing patterns/components to reuse
- ❌ Overlook integration points
- ❌ Underestimate/overestimate complexity

**With research:**
- ✅ Tickets grounded in actual codebase
- ✅ Leverage existing patterns
- ✅ Accurate dependency identification
- ✅ Realistic scope assessment

**Time allocation: 30-40% of total effort**

---

## Research Workflow

### Step 1: Understand User Intent

Before diving into code, clarify the ask:

**Questions to answer:**
- What problem are we solving?
- Who are the users/stakeholders?
- What's the expected timeline?
- Are there existing similar features?
- What's the definition of "done"?

### Step 2: Broad Codebase Exploration

Use the Explore agent for high-level understanding:

```typescript
Task("Explore notification patterns in codebase",
     `Find:
      - Existing notification implementations
      - WebSocket usage patterns
      - Message queue integrations
      - Related frontend components`,
     "Explore")
```

**What Explore finds:**
- File locations for relevant code
- Existing patterns and conventions
- Integration points
- Potential reusable components

### Step 3: Targeted Code Search

After Explore gives you locations, use Grep for specific patterns:

**Search for APIs:**
```bash
# Find API endpoints
grep -r "api/notifications" modules/chariot/backend/

# Find handler patterns
grep -r "NotificationHandler" modules/chariot/backend/
```

**Search for components:**
```bash
# Find React components
grep -r "Notification" modules/chariot/ui/src/components/

# Find hooks
grep -r "useNotification" modules/chariot/ui/src/hooks/
```

**Search for data models:**
```bash
# Find type definitions
grep -r "interface Notification" modules/

# Find database schemas
grep -r "Notification" modules/tabularium/
```

### Step 4: Read Key Files

Once you've identified relevant files, read them:

```typescript
Read("modules/chariot/backend/pkg/handler/handlers/notification/notification.go")
Read("modules/chariot/ui/src/components/Notification/NotificationToast.tsx")
Read("modules/tabularium/pkg/model/model/notification.go")
```

**What to look for:**
- Existing patterns (how similar features are implemented)
- Naming conventions
- Architecture patterns (repository pattern, hooks, etc.)
- Integration points (APIs, databases, queues)

### Step 5: Map Technical Components

Create a mental model of the stack:

**Frontend:**
```
ui/src/sections/notifications/
├── components/
│   ├── NotificationList.tsx
│   ├── NotificationToast.tsx
│   └── NotificationSettings.tsx
├── hooks/
│   ├── useNotifications.ts
│   └── useWebSocket.ts
└── state/
    └── notificationStore.ts
```

**Backend:**
```
backend/pkg/
├── handler/handlers/notification/
│   ├── notification.go (HTTP handlers)
│   └── websocket.go (WebSocket handlers)
├── services/notification/
│   └── service.go (Business logic)
└── repositories/notification/
    └── repository.go (Data access)
```

**Infrastructure:**
```
AWS Resources:
- API Gateway WebSocket API
- Lambda functions for handlers
- DynamoDB table for notification storage
- SQS queue for async processing
- ElastiCache for presence tracking
```

### Step 6: Identify Integration Points

Map how new code will connect to existing systems:

**Example: Real-Time Notifications**

**Integrations needed:**
1. **Frontend → Backend WebSocket**
   - Existing: No WebSocket client
   - New: Create `useWebSocket` hook

2. **Backend → Database**
   - Existing: DynamoDB repository pattern
   - Reuse: Copy pattern from existing handlers

3. **Backend → Message Queue**
   - Existing: SQS integration in other features
   - Reuse: Copy SQS publish pattern

4. **Authentication**
   - Existing: Cognito middleware
   - Reuse: Same auth pattern for WebSocket

---

## Research Deliverables

By end of research, you should have:

### 1. Component Inventory

**What exists:**
- [ ] Frontend components to reuse
- [ ] Backend services to integrate with
- [ ] Database schemas to extend
- [ ] Infrastructure resources to leverage

**What's needed:**
- [ ] New components to build
- [ ] New APIs to create
- [ ] New infrastructure to provision

### 2. Dependency Map

```
New Feature Dependencies:
- Depends on: Existing auth system (Cognito)
- Depends on: Existing database layer (DynamoDB repository)
- Integrates with: Existing notification preferences (Settings page)
- Extends: Existing user model (add notification_preferences field)
```

### 3. Pattern Documentation

**Patterns to follow:**
- API handler pattern: `handler → service → repository`
- React hooks pattern: `useX` for data fetching
- State management: Zustand stores in `state/`
- Error handling: Standardized error responses

### 4. Technical Architecture Sketch

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   Client    │──WS──→│   API GW     │──────→│   Lambda    │
│   Browser   │←──────│   WebSocket  │←──────│   Handler   │
└─────────────┘       └──────────────┘       └─────────────┘
                                                     │
                      ┌──────────────┐              │
                      │     SQS      │←─────────────┘
                      │    Queue     │
                      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   Lambda     │
                      │  Processor   │
                      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   DynamoDB   │
                      └──────────────┘
```

---

## Research Techniques

### For New Features

**Goal**: Understand how similar features are built

**Approach:**
1. Find analogous features (e.g., if building notifications, look at alerts or messages)
2. Study their architecture end-to-end
3. Identify reusable patterns
4. Note differences in new requirements

### For Integrations

**Goal**: Understand integration points and contracts

**Approach:**
1. Find where existing system exposes APIs
2. Check authentication/authorization requirements
3. Understand data formats (JSON schemas, etc.)
4. Review error handling patterns

### For Infrastructure

**Goal**: Understand existing AWS resources and patterns

**Approach:**
1. Check CloudFormation/SAM templates
2. Identify existing Lambda functions
3. Note naming conventions
4. Understand networking setup (VPC, subnets)

---

## Common Research Patterns

### Pattern 1: "Find Similar Feature"

```bash
# User wants real-time notifications
# Find existing real-time features:

grep -r "WebSocket" modules/chariot/
grep -r "SSE" modules/chariot/  # Server-Sent Events
grep -r "Polling" modules/chariot/  # Long polling

# If nothing found → Green field, more design work needed
# If found → Study implementation, reuse patterns
```

### Pattern 2: "Trace Data Flow"

```
1. Find frontend component making API call
   → Read component code
   → Identify API endpoint

2. Find backend handler for that endpoint
   → Read handler code
   → Identify service layer call

3. Find service implementation
   → Read service code
   → Identify repository/database access

4. Find data model
   → Read model definition
   → Understand schema
```

### Pattern 3: "Map Dependencies"

```bash
# Start with entry point (e.g., notification creation)

1. What triggers it? (User action, cron job, webhook?)
2. What services does it call? (Auth, storage, queue?)
3. What data does it need? (User prefs, config, etc.)
4. What can fail? (Network, auth, rate limits?)
5. What happens on failure? (Retry, alert, log?)
```

---

## Research Anti-Patterns

### ❌ Skipping Research

**Symptom**: Start writing tickets immediately

**Why it's bad**: Tickets are generic, miss reusable patterns, wrong complexity estimates

**Fix**: Always spend 30-40% of time researching

### ❌ Surface-Level Search

**Symptom**: Only search file names, don't read code

**Why it's bad**: Miss important implementation details, integration patterns

**Fix**: Read key files deeply, understand how things actually work

### ❌ Analysis Paralysis

**Symptom**: Spend hours reading every file tangentially related

**Why it's bad**: Diminishing returns, wastes time

**Fix**: Set time box (1-2 hours), focus on core components

---

## Research Checklist

Before moving to breakdown phase, confirm:

- [ ] I understand what problem we're solving
- [ ] I've found relevant existing code
- [ ] I've identified reusable components
- [ ] I've mapped integration points
- [ ] I've sketched the technical architecture
- [ ] I can explain the data flow
- [ ] I know what needs to be built vs reused
- [ ] I understand the dependencies
