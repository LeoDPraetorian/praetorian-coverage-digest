---
name: writing-linear-epics-stories
description: Creates well-structured Linear epics and sub-issues through systematic codebase research, thoughtful breakdown, and rich documentation with diagrams.
allowed-tools: Read, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Writing Linear Epics & Stories

Structured workflow for creating comprehensive Linear epics with well-organized sub-issues that include detailed descriptions, ASCII diagrams, architecture workflows, and proper dependency management.

## When to Use This Skill

Use this skill when you need to:
- Create a new feature initiative as a Linear epic with multiple sub-issues
- Break down a large project into coordinated work items
- Document complex technical work with proper context and visuals
- Ensure all stakeholders understand dependencies and implementation phases

**Symptoms that indicate you need this skill:**
- User says "create an epic for..." or "write tickets for..."
- Complex feature requiring multiple engineers or phases
- Need to communicate technical architecture to non-technical stakeholders
- Work spans multiple domains (frontend, backend, infrastructure)

## Quick Start

```
User: "Create an epic for implementing real-time notifications"

You:
1. Research codebase for existing notification patterns
2. Identify technical components involved
3. Break down into epic + sub-issues
4. Create Linear tickets with detailed descriptions
5. Link dependencies and set priorities
```

## Table of Contents

This skill is organized into detailed reference documents:

### Core Workflow
- **[Complete Workflow](references/workflow.md)** - Step-by-step process with validation loops
- **[Research Phase](references/research-phase.md)** - How to explore codebase effectively
- **[Breakdown Strategy](references/breakdown-strategy.md)** - Epic vs story decisions

### Documentation Standards
- **[Description Templates](references/description-templates.md)** - Rich content patterns
- **[Diagram Conventions](references/diagram-conventions.md)** - ASCII art for architecture
- **[Dependency Management](references/dependency-management.md)** - Parent/child linking

### Technical Details
- **[Linear API Patterns](references/linear-api-patterns.md)** - Wrapper usage, quirks, limitations

## Core Workflow (High-Level)

### Phase 1: Research & Understanding (30-40% of time)

**Before writing any tickets**, deeply understand the codebase:

1. **Explore existing patterns**
   - Search for similar features
   - Identify relevant components
   - Find integration points

2. **Map dependencies**
   - What needs to be built first?
   - What can be parallelized?
   - What blocks what?

See [Research Phase](references/research-phase.md) for detailed exploration techniques.

### Phase 2: Structure & Breakdown (20-30% of time)

**Design the epic/story hierarchy:**

1. **Identify the epic**
   - What's the overarching goal?
   - What value does it deliver?
   - Who are the stakeholders?

2. **Break into sub-issues**
   - Foundation issues (infrastructure, setup)
   - Core implementation issues
   - Integration/testing issues

See [Breakdown Strategy](references/breakdown-strategy.md) for decision framework.

### Phase 3: Documentation & Creation (30-40% of time)

**Write comprehensive ticket descriptions:**

1. **Epic description** includes:
   - Overview & vision
   - Sub-issue list with purposes
   - Architecture diagram
   - Success criteria

2. **Sub-issue descriptions** include:
   - Clear scope & purpose
   - Technical approach
   - Dependencies
   - Success criteria
   - Implementation phases (if complex)

See [Description Templates](references/description-templates.md) for content patterns.

### Phase 4: Linear Creation & Linking

**Create tickets in proper order:**

1. Create epic first (to get parent ID)
2. Create sub-issues with `parentId` linking
3. Verify all tickets created successfully
4. Handle API quirks (control characters, field limits)

See [Linear API Patterns](references/linear-api-patterns.md) for implementation details.

## Best Practices

### Research Phase
- ✅ Spend 30-40% of time researching before writing tickets
- ✅ Use Explore agent for broad codebase understanding
- ✅ Grep for specific patterns, APIs, integration points
- ❌ Don't start writing tickets without codebase context

### Breakdown Strategy
- ✅ 1 epic + 4-8 sub-issues is ideal scope
- ✅ Sub-issues should be independently testable
- ✅ Mark dependencies explicitly
- ❌ Don't create >10 sub-issues (split into multiple epics)
- ❌ Don't make sub-issues depend on each other in complex chains

### Documentation Quality
- ✅ Include ASCII diagrams for architecture
- ✅ Show workflow with arrows and decision trees
- ✅ Provide code examples where helpful
- ✅ List success criteria as checkboxes
- ❌ Don't use control characters (newlines OK, null bytes not)
- ❌ Don't write essays - use bullet points and structure

### Linear API Usage
- ✅ Use `createIssue` wrapper, not direct MCP
- ✅ Handle description sanitization (allow newlines, block control chars)
- ✅ Set priority (2=High is standard)
- ✅ Link sub-issues via `parentId`
- ❌ Don't exceed Linear field length limits
- ❌ Don't forget to verify ticket creation succeeded

## Critical Rules

### 1. Research First, Always

**NEVER create tickets without codebase research.** Generic tickets are useless.

### 2. Use TodoWrite for Progress Tracking

Create todos for each phase:
- [ ] Research codebase
- [ ] Design breakdown
- [ ] Write epic description
- [ ] Write sub-issue descriptions
- [ ] Create Linear tickets
- [ ] Verify links and dependencies

### 3. Progressive Disclosure in Descriptions

Keep ticket descriptions scannable:
- Overview section (1-2 paragraphs)
- Table of contents with links
- Detailed sections below
- Success criteria at end

### 4. Validate Before Creating

Before calling Linear API:
- ✅ Epic description complete?
- ✅ All sub-issue descriptions written?
- ✅ Dependencies mapped?
- ✅ Diagrams included?
- ❌ Don't create half-baked tickets

## Example Output

```
Epic: Real-Time Notification System (CHARIOT-1000)
├── Infrastructure: Message Queue Setup (CHARIOT-1001)
├── Backend: WebSocket Server (CHARIOT-1002)
├── Backend: Notification Service (CHARIOT-1003)
├── Frontend: WebSocket Client (CHARIOT-1004)
├── Frontend: Notification UI Components (CHARIOT-1005)
└── Integration: E2E Testing (CHARIOT-1006)
```

Each ticket includes:
- Rich description with context
- ASCII architecture diagrams
- Implementation phases
- Success criteria
- Dependency notes

## Troubleshooting

### "Control characters not allowed" error

**Problem**: Linear API rejects description with null bytes or other control chars

**Solution**: The `validateNoControlCharsAllowWhitespace` validator in Linear wrapper allows newlines but blocks dangerous characters. If you still get errors:
1. Check for non-printable characters in source text
2. Remove emojis if present
3. Verify markdown doesn't have hidden characters

See [Linear API Patterns](references/linear-api-patterns.md) for complete troubleshooting.

### Epic created but sub-issues fail

**Problem**: Parent ID correct but sub-issue creation fails

**Solution**:
1. Verify parent ID from epic creation response
2. Check sub-issue description length (Linear has limits)
3. Create sub-issues one at a time to isolate failures
4. Log each response to debug

### Too many sub-issues

**Problem**: Breakdown has >10 sub-issues

**Solution**: Split into multiple epics:
- Epic 1: Foundation + Core
- Epic 2: Integrations + Advanced Features

## Related Skills

- `gateway-mcp-tools` - Access Linear MCP wrappers
- `brainstorming` - Refine scope before breakdown
- `writing-plans` - Similar structured documentation approach
