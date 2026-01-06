# Prompt Templates for Behavior-First Analysis

Complete prompt templates for spawning parallel Explore agents.

## Agent 1: Request-to-Execution Flow

```markdown
## Task: Trace Request-to-Execution Flow

CRITICAL: Do NOT search for "workflow", "orchestrator", or expected component names. Trace actual code paths.

### Starting Point

Find HTTP handlers or API Gateway entry points in the backend. Start from where external requests arrive.

### Trace Forward

For a typical request (e.g., security scan, data processing):

1. What handler receives it?
2. What function does the handler call?
3. How does that function dispatch work?
4. What determines what happens next?

Follow the code path through 5+ hops. Document each with file:line.

### Discovery Questions

- Is there a central dispatcher? Or distributed handling?
- How does the system decide which component runs?
- Is this event-driven, queue-based, or synchronous?

### Output Format

REQUEST FLOW: [request type]

1. [file:line] - [function] - [what it does]
2. [file:line] - [function] - [what it does]
   ...

PATTERN IDENTIFIED: [event-driven / state-machine / queue-based / other]
EVIDENCE: [specific code showing the pattern]

### Counter-Evidence Requirement

If you think something is "missing", first search for:

- Alternative implementations (different naming)
- Implicit patterns (e.g., type matching instead of explicit routing)
- Convention-based dispatch

Thoroughness: very thorough
```

## Agent 2: Object Lifecycle and Chaining

```markdown
## Task: Trace Core Object Lifecycle and Chaining

CRITICAL: Do NOT search for "workflow engine" or expected names. Discover what actually exists.

### Starting Point

Find core domain object code (Job, Task, Asset, etc.). Look for:

- Struct/type definitions
- Creation functions
- State transitions
- Completion handlers

### Trace the Lifecycle

1. How is the object created? What triggers creation?
2. What states can it have? Where are transitions?
3. When it completes, what happens next?
4. How do objects chain to other objects?

### Key Functions to Find

Search for patterns like:

- `Send()` or similar dispatch methods
- `Match()` or type-based routing
- `GetTargetTasks()` or next-step determination
- `spawnAll()` or parallel execution

For each, document: file:line, what it does, how it's called.

### Discovery Questions

- Is chaining explicit (workflow definition) or implicit (type matching)?
- Are workflows emergent from object types, or predefined?
- How does the system know what to run after one step completes?

### Output Format

OBJECT LIFECYCLE:
Creation: [file:line] - [how objects start]
States: [list with file:line for transitions]
Completion: [file:line] - [what triggers next steps]
Chaining: [file:line] - [mechanism for A → B]

ORCHESTRATION PATTERN: [describe what you found, not what you expected]
CODE EVIDENCE: [key snippets showing the pattern]

Thoroughness: very thorough
```

## Agent 3: Registration and Dispatch

```markdown
## Task: Trace Registration and Dispatch

CRITICAL: Discover the actual pattern. Do NOT assume there's a specific component to find.

### Starting Point

Find registration-related code. Look for:

- Component registration (how components declare what they handle)
- Component matching (how requests route to components)
- Component execution (how components are invoked)

### Key Patterns to Trace

1. **Registration**: How does a component say "I handle X"?
   - Is there a registry? Event subscription? Type declaration?

2. **Matching**: When work arrives, how is the right component selected?
   - Explicit routing table? Type matching? Pattern matching?

3. **Dispatch**: How is the component actually invoked?
   - Direct call? Queue message? Event emission?

### Specific Code to Find

Look for functions/patterns like:

- `Match(target)` or similar
- `Register()` or component declaration
- Type-based dispatch (interfaces, type switches)
- Event handlers or message processors

### Output Format

REGISTRATION PATTERN:

- [file:line] - [how components register]
- Example: [code snippet]

MATCHING PATTERN:

- [file:line] - [how matching works]
- Example: [code snippet]

DISPATCH PATTERN:

- [file:line] - [how execution happens]
- Example: [code snippet]

PARADIGM: [event-driven registry / explicit workflow / hybrid / other]
COMPARISON: This is similar to [known pattern/framework]

### Before Claiming Gaps

If you think orchestration is "incomplete":

1. Have you traced what Match() actually does?
2. Have you found all registration points?
3. Could "emergent workflows" be the design intent?

Thoroughness: very thorough
```

## Agent 4: Reverse-Trace from Database Writes

```markdown
## Task: Reverse-Trace from Database Writes

CRITICAL: Work BACKWARD from effects to causes. Avoid keyword-based assumptions.

### Starting Point

Find where state changes are persisted. Look for:

- Database writes (PutItem, UpdateItem, INSERT, UPDATE)
- Status field updates
- Relationship creation

### Trace Backward

For each state change you find:

1. What function writes this state?
2. What called that function?
3. What triggered that caller?
4. Trace back 4+ levels to the originating event

### Specific Traces to Perform

1. **Status → Running**: What sets status to running? Trace back.
2. **Status → Complete**: What marks completion? What happens after?
3. **New object creation**: When existing objects spawn new objects, trace that path.
4. **Discovery writes**: When new entities are found, trace the write path.

### Discovery Questions

- Is there a central coordinator managing these writes?
- Or do components write directly with implicit coordination?
- Where is the "truth" of what-runs-when encoded?

### Output Format

STATE CHANGE: [description]
Write Location: [file:line]
Trace Back: 4. [file:line] - [function] - [triggered by] 3. [file:line] - [function] - [triggered by] 2. [file:line] - [function] - [triggered by]

1. [file:line] - [function] - [original trigger]

COORDINATION PATTERN: [centralized / distributed / hybrid]

### Synthesize

After tracing 4+ state changes:

- What's the common pattern?
- Is there implicit coordination via types/events?
- Where is orchestration logic actually encoded?

Thoroughness: very thorough
```

## Spawning Agents in Parallel

Use Task tool with `subagent_type="Explore"` and include the full prompt template:

```typescript
// Spawn all 4 agents in parallel in a single message
Task(
  (subagent_type = "Explore"),
  (prompt = "[Agent 1 prompt]"),
  (description = "Trace request flow")
);
Task(
  (subagent_type = "Explore"),
  (prompt = "[Agent 2 prompt]"),
  (description = "Trace object lifecycle")
);
Task(
  (subagent_type = "Explore"),
  (prompt = "[Agent 3 prompt]"),
  (description = "Trace registration/dispatch")
);
Task(
  (subagent_type = "Explore"),
  (prompt = "[Agent 4 prompt]"),
  (description = "Reverse-trace from DB")
);
```

All agents run concurrently. Wait for all to return before synthesizing.
