---
name: coordinating-competing-systems
description: Use when multiple async systems interact (layout vs rendering, animation vs interaction, loading vs display) - provides guard patterns and sequencing strategies
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, TodoWrite, AskUserQuestion
---

# Coordinating Competing Systems

**Guard patterns and sequencing strategies for managing interfering async systems in complex UIs.**

## Problem Statement

Complex UIs have multiple systems that can interfere:

- Layout algorithms need all nodes visible, but culling hides nodes
- Animations conflict with user interactions
- Data loading interrupts rendering
- Multiple async processes race to update state

## When to Use This Skill

Invoke when:

- Feature works alone but breaks when combined with another
- Disabling one system makes another work
- Timing-dependent bugs ("works sometimes")
- Systems that were "temporarily disabled"
- Comments like "TODO: fix interference with X"

## Recognition Patterns

| Symptom                    | Likely Cause              |
| -------------------------- | ------------------------- |
| Layout never settles       | Culling interfering       |
| Janky animations           | User interaction conflict |
| Flash of incomplete data   | Render racing with fetch  |
| Clicks during zoom trigger | Event handler race        |
| Feature disabled in code   | Unresolved interference   |

## Core Pattern: Guard Conditions

**Principle**: Check compatibility before acting. Don't let systems blindly operate when another needs control.

### Pattern 1: State-Based Guards

Check if another system is in a compatible state before acting.

**When to use**: One system needs exclusive access or complete data.

```typescript
// Example: Don't cull nodes while layout is running
const useViewportCulling = ({ graph, enabled }: Props) => {
  const updateVisibility = useCallback(() => {
    // GUARD: Check if layout is still running
    const layout = graph?.getAttribute("layout");
    if (layout?.isRunning()) {
      return; // Skip - layout needs all nodes
    }

    // Safe to cull now
    cullNodesOutsideViewport(graph);
  }, [graph]);

  // ...
};
```

**Key insight**: The guard reads current state and decides whether to proceed.

**See**: [references/state-guards.md](references/state-guards.md) for advanced guard patterns, common mistakes, and testing strategies.

### Pattern 2: Event-Based Sequencing

Wait for completion events before starting dependent operations.

**When to use**: System B depends on System A finishing completely.

```typescript
// Example: Start culling only after layout completes
const useLayoutThenCull = (graph: Graph) => {
  const [layoutComplete, setLayoutComplete] = useState(false);

  useEffect(() => {
    const layout = graph.getAttribute("layout");
    if (!layout) return;

    // Listen for layout completion
    const checkComplete = () => {
      if (!layout.isRunning()) {
        setLayoutComplete(true);
      }
    };

    // Poll for completion (some layouts don't emit events)
    const interval = setInterval(checkComplete, 100);
    return () => clearInterval(interval);
  }, [graph]);

  // Only enable culling after layout
  useViewportCulling({
    graph,
    enabled: layoutComplete,
  });
};
```

**Key insight**: Explicit sequencing through state/events, not implicit timing.

**See**: [references/sequencing.md](references/sequencing.md) for event patterns, polling strategies, and error handling.

### Pattern 3: Priority Queuing

Queue operations and execute in priority order with dependency checks.

**When to use**: Multiple operations compete for same resource, need ordering.

```typescript
type Operation = {
  id: string;
  priority: number;
  execute: () => void | Promise<void>;
  blockedBy?: string[];
};

const useOperationQueue = () => {
  const queue = useRef<Operation[]>([]);
  const running = useRef<Set<string>>(new Set());

  const enqueue = useCallback((op: Operation) => {
    queue.current.push(op);
    processQueue();
  }, []);

  const processQueue = useCallback(async () => {
    // Sort by priority
    queue.current.sort((a, b) => b.priority - a.priority);

    for (const op of queue.current) {
      // Check blockers
      const blocked = op.blockedBy?.some((id) => running.current.has(id));
      if (blocked) continue;

      // Execute
      running.current.add(op.id);
      queue.current = queue.current.filter((o) => o.id !== op.id);

      await op.execute();
      running.current.delete(op.id);
    }
  }, []);

  return { enqueue };
};
```

**Key insight**: Centralized queue with explicit dependencies and priorities.

**See**: [references/queuing.md](references/queuing.md) for queue implementations, priority strategies, and backpressure handling.

### Pattern 4: Mutex/Lock Pattern

Prevent concurrent access to shared resources.

**When to use**: Critical sections that must not overlap.

```typescript
const useMutex = () => {
  const locked = useRef(false);
  const waiters = useRef<(() => void)[]>([]);

  const acquire = useCallback((): Promise<void> => {
    if (!locked.current) {
      locked.current = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      waiters.current.push(resolve);
    });
  }, []);

  const release = useCallback(() => {
    const next = waiters.current.shift();
    if (next) {
      next();
    } else {
      locked.current = false;
    }
  }, []);

  return { acquire, release };
};

// Usage
const mutex = useMutex();

const updateGraph = async () => {
  await mutex.acquire();
  try {
    // Only one update at a time
    await performUpdate();
  } finally {
    mutex.release();
  }
};
```

**Key insight**: Explicit locking prevents race conditions in async operations.

**See**: [references/mutex.md](references/mutex.md) for mutex patterns, deadlock prevention, and timeout strategies.

## Common Interference Patterns

| System A      | System B         | Symptom                    | Solution                               |
| ------------- | ---------------- | -------------------------- | -------------------------------------- |
| Force layout  | Viewport culling | Layout never settles       | Guard: cull only after layout complete |
| Animation     | User drag        | Janky movement             | Pause animation during drag            |
| Data fetch    | Render           | Flash of incomplete data   | Progressive loading with skeleton      |
| Zoom handler  | Click handler    | Clicks trigger during zoom | Debounce + event order check           |
| Batch updates | Live search      | Stale results              | Abort previous, sequence updates       |
| Undo/redo     | Auto-save        | Conflicting state          | Mutex on state modifications           |

## Debugging Interference

**4-Step Process:**

1. **Isolate**: Disable systems one at a time to find the conflict
2. **Log state transitions**: Add logging at system boundaries
3. **Check timing**: Use `performance.mark()` to see execution order
4. **Look for "temporarily disabled"**: Comments like this indicate known interference

**See**: [references/debugging.md](references/debugging.md) for complete debugging workflow, tools, and case studies.

## Real-World Example: Graph Explorer

From Chariot codebase discovery:

- `useViewportCulling.ts` was DISABLED with comment "interfering with layout"
- FA2Layout (force-directed) needs all nodes visible to calculate forces
- Without guard pattern, culling and layout fought each other
- Solution: Guard culling until `layout.isRunning()` returns false

**Reference**: `.claude/.output/features/2026-01-14-171607-graph-explorer-optimizations/architecture.md`

## Quick Decision Tree

```
Is feature broken when combined with another?
├─ YES: Likely system interference
│   ├─ Does System B need System A to finish first?
│   │   └─ Use Pattern 2: Event-Based Sequencing
│   ├─ Do systems need exclusive access to shared resource?
│   │   └─ Use Pattern 4: Mutex/Lock
│   ├─ Do systems have priority ordering?
│   │   └─ Use Pattern 3: Priority Queuing
│   └─ Does System B need to check System A's state?
│       └─ Use Pattern 1: State-Based Guards
└─ NO: Not interference, check other causes
```

## Integration

### Called By

- Frontend developers debugging timing issues
- Architecture reviews for complex UIs
- Performance optimization workflows
- Code reviews catching disabled features

### Requires (invoke before starting)

| Skill                                 | When     | Purpose                                     |
| ------------------------------------- | -------- | ------------------------------------------- |
| `debugging-systematically`            | Start    | Identify root cause before applying pattern |
| `optimizing-large-data-visualization` | Parallel | Often used together for performance         |

### Calls (during execution)

None - provides patterns, doesn't invoke other skills.

### Pairs With (conditional)

| Skill                                  | Trigger              | Purpose                           |
| -------------------------------------- | -------------------- | --------------------------------- |
| `preventing-react-hook-infinite-loops` | When guards in hooks | Avoid creating new infinite loops |
| `debugging-systematically`             | When pattern fails   | Root cause analysis               |

## Related Skills

- `debugging-systematically` - For finding interference source
- `optimizing-large-data-visualization` - Often needs coordination (LOD + layout)
- `preventing-react-hook-infinite-loops` - Avoid creating new issues with guards

## Changelog

See [.history/CHANGELOG](.history/CHANGELOG) for version history.
