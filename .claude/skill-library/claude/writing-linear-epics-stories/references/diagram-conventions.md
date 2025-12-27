# Diagram Conventions

ASCII art patterns for documenting system architecture, workflows, and dependencies in Linear tickets.

## Why Use ASCII Diagrams?

**Benefits:**

- ✅ Renders in plain text (Linear, GitHub, Slack)
- ✅ Version control friendly (diffs work)
- ✅ No external tools needed
- ✅ Fast to create and modify

**Use for:**

- System architecture (components + connections)
- Data flow (how information moves)
- Workflows (step-by-step processes)
- Decision trees (conditional logic)
- Dependency graphs (what blocks what)

---

## Architecture Diagrams

### Basic Component Diagram

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  Component  │──────→│  Component   │──────→│  Component  │
│      A      │←──────│      B       │←──────│      C      │
└─────────────┘       └──────────────┘       └─────────────┘
```

**When to use:** Show how major components connect

**Example: Real-Time Notifications**

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│   Client    │──WS──→│   API GW     │──────→│   Lambda    │
│   Browser   │←──────│   WebSocket  │←──────│   Handler   │
└─────────────┘       └──────────────┘       └─────────────┘
                                                     │
                                                     ▼
                                              ┌─────────────┐
                                              │   DynamoDB  │
                                              └─────────────┘
```

### Multi-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  React   │  │  Zustand │  │ TanStack │                 │
│  │ Components│  │  State   │  │  Query   │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                        Backend Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Lambda  │  │   API    │  │  Auth    │                 │
│  │ Functions│  │ Gateway  │  │ Cognito  │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         Data Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ DynamoDB │  │  Neo4j   │  │   S3     │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

**When to use:** Complex systems with multiple tiers

---

## Data Flow Diagrams

### Linear Flow

```
Event Triggered
    │
    ▼
Create Notification
    │
    ▼
Store in DynamoDB
    │
    ▼
Push to SQS Queue
    │
    ▼
Lambda Processes
    │
    ▼
WebSocket Broadcast
    │
    ▼
Client Receives
```

**When to use:** Sequential processes

### Branching Flow

```
User Request
    │
    ├─→ If authenticated
    │       │
    │       ▼
    │   Process Request
    │       │
    │       ▼
    │   Return Data
    │
    └─→ If not authenticated
            │
            ▼
        Return 401 Error
```

**When to use:** Conditional logic, decision points

### Parallel Processing

```
Input Data
    │
    ├──→ Worker 1 ──→ Process A ──┐
    │                              │
    ├──→ Worker 2 ──→ Process B ──┤
    │                              ├──→ Aggregate Results
    ├──→ Worker 3 ──→ Process C ──┤
    │                              │
    └──→ Worker 4 ──→ Process D ──┘
```

**When to use:** Concurrent operations, parallelization

---

## Workflow Diagrams

### Step-by-Step Process

```
1. User Action
    ↓
2. Frontend Validation
    ↓
3. API Request
    ↓
4. Backend Processing
    ↓
5. Database Update
    ↓
6. Response to Client
    ↓
7. UI Update
```

**When to use:** Implementation workflows, user journeys

### State Machine

```
[Idle] ─────────→ [Loading] ─────────→ [Success]
  ↑                   │                     │
  │                   ▼                     │
  │              [Error] ←──────────────────┘
  │                   │
  └───────────────────┘
```

**When to use:** Component state transitions

---

## Dependency Graphs

### Hierarchical Dependencies

```
CHARIOT-1853: Epic
├── CHARIOT-1854: Agent Sandbox (BUILD FIRST)
│
├── CHARIOT-1852: FP Refinement
│   └── Depends on: 1854
│
├── CHARIOT-1855: 3rd Party Mapping
│   └── Depends on: 1854
│
├── CHARIOT-1856: Comparison Engine
│   ├── Depends on: 1854
│   └── Depends on: 1855
│
├── CHARIOT-1857: Template Generation
│   ├── Depends on: 1854
│   └── Depends on: 1856
│
└── CHARIOT-1858: Chat Interface
    └── Shared by: 1852, 1856, 1857
```

**When to use:** Epic breakdowns, task dependencies

### Network Dependencies

```
                         ┌─────────────────────────┐
                         │  (1) Agent Sandbox      │
                         │  [BUILD FIRST]          │
                         └───────────┬─────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│ (2) FP Refine   │      │ (3) 3rd Party       │      │ (5) Template        │
│                 │      │ Mapping Engine      │      │ Generation          │
└────────┬────────┘      └──────────┬──────────┘      └──────────┬──────────┘
         │                          │                            │
         │                          ▼                            │
         │               ┌─────────────────────┐                 │
         │               │ (4) Comparison &    │◀────────────────┘
         │               │ Validation Engine   │
         │               └──────────┬──────────┘
         │                          │
         └──────────────────────────┼──────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────┐
                         │ (6) Human-in-the-Loop   │
                         │ Chat Interface          │
                         └─────────────────────────┘
```

**When to use:** Complex dependency networks

---

## Decision Trees

### Binary Decisions

```
Vulnerability Detected
    │
    ├─ If critical severity
    │     │
    │     ├─ If exploitable → Immediate alert
    │     │
    │     └─ If not exploitable → Standard workflow
    │
    └─ If low/medium severity
          │
          └─ Standard workflow
```

**When to use:** Conditional branching logic

### Multi-Way Decisions

```
User Role
    ├─ Admin
    │     ├─ Full access to all features
    │     ├─ Can modify settings
    │     └─ Can manage users
    │
    ├─ Power User
    │     ├─ Read/write access
    │     └─ Limited settings
    │
    └─ Viewer
          └─ Read-only access
```

**When to use:** Permission models, routing logic

---

## Box Drawing Characters

Common characters for creating diagrams:

```
Corners:        ┌ ┐ └ ┘
Lines:          │ ─ ┼ ├ ┤ ┬ ┴
Arrows:         → ← ↑ ↓ ↔ ↕
Connectors:     ▼ ▲ ◄ ►
```

**Creating boxes:**

```
┌─────────────┐
│   Content   │
└─────────────┘
```

**Creating connections:**

```
Component A ──→ Component B
Component C ←── Component D
```

---

## Best Practices

### ✅ Do

- **Use consistent spacing** - Align boxes and arrows
- **Label components clearly** - No abbreviations unless obvious
- **Show data flow direction** - Use arrows to indicate flow
- **Keep it simple** - Only show relevant components
- **Add legends if needed** - Explain symbols or abbreviations

### ❌ Don't

- **Overly complex diagrams** - Split into multiple simpler diagrams
- **Inconsistent formatting** - Use same style throughout
- **Missing labels** - Every component should be named
- **ASCII art for art's sake** - Only use if it adds clarity

---

## Examples from Our Recent Work

### Example 1: Nuclei Template Intelligence (CHARIOT-1853)

**Architecture diagram showing agent coordination:**

```
                         ┌─────────────────────────┐
                         │  (1) Agent Sandbox      │
                         │  Infrastructure         │
                         │  [BUILD FIRST]          │
                         └───────────┬─────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                           │                           │
         ▼                           ▼                           ▼
┌─────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│ (2) FP Refine   │      │ (3) 3rd Party       │      │ (5) Template        │
│ [CHARIOT-1852]  │      │ Mapping Engine      │      │ Generation          │
└────────┬────────┘      └──────────┬──────────┘      └──────────┬──────────┘
         │                          │                            │
         │                          ▼                            │
         │               ┌─────────────────────┐                 │
         │               │ (4) Comparison &    │◀────────────────┘
         │               │ Validation Engine   │
         │               └──────────┬──────────┘
         │                          │
         └──────────────────────────┼──────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────────┐
                         │ (6) Human-in-the-Loop   │
                         │ Chat Interface          │
                         └─────────────────────────┘
```

**What it shows:**

- Agent Sandbox is foundation (built first)
- Multiple agents depend on Sandbox
- Comparison Engine depends on Mapping
- Template Generation depends on Comparison
- Chat Interface is shared by multiple agents

### Example 2: Template Refinement Workflow (CHARIOT-1852)

**User flow showing interaction:**

```
Evidence Tab (Enhanced)
├── Attributes section (existing)
│   ├── Cli: msfconsole command...
│   └── Port: 30011
│
└── Nuclei Template section (NEW)
    ├── Template YAML viewer (syntax highlighted)
    ├── Copy button
    └── [📝 Revise Template] button
            │
            └── Opens Template Revision Chat Modal
                ├── Conversational interface
                ├── User explains false positive reason
                ├── Agent analyzes and proposes changes
                ├── TDD test results display
                ├── Template diff viewer
                └── [Submit for Review] → Creates PR
```

**What it shows:**

- Hierarchical UI structure
- User interaction flow
- Modal workflow
- Final action (PR creation)

---

## Template Library

Copy-paste these as starting points:

### Simple Linear Flow

```
Step 1
  │
  ▼
Step 2
  │
  ▼
Step 3
```

### Component Connection

```
┌─────────┐       ┌─────────┐
│ Comp A  │──────→│ Comp B  │
└─────────┘       └─────────┘
```

### Three-Tier Architecture

```
┌───────────────────────┐
│   Frontend Layer      │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│   Backend Layer       │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│   Data Layer          │
└───────────────────────┘
```

### Parallel Branches

```
Input
  ├─→ Branch A
  ├─→ Branch B
  └─→ Branch C
```
