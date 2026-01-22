# Event Patterns

Event handling patterns for Sigma.js interactions.

## Event Types

### Node Events

```typescript
sigma.on("enterNode", ({ node }) => {
  console.log("Mouse entered node:", node);
});

sigma.on("leaveNode", ({ node }) => {
  console.log("Mouse left node:", node);
});

sigma.on("clickNode", ({ node, event }) => {
  console.log("Clicked node:", node);
  event.preventSigmaDefault(); // Prevent camera behavior
});

sigma.on("doubleClickNode", ({ node }) => {
  console.log("Double-clicked node:", node);
});

sigma.on("rightClickNode", ({ node }) => {
  console.log("Right-clicked node:", node);
});
```

### Stage Events (Background)

```typescript
sigma.on("clickStage", ({ event }) => {
  console.log("Clicked background");
});

sigma.on("doubleClickStage", () => {
  console.log("Double-clicked background");
});

sigma.on("rightClickStage", () => {
  console.log("Right-clicked background");
});
```

### Edge Events

```typescript
sigma.on("enterEdge", ({ edge }) => {
  console.log("Mouse entered edge:", edge);
});

sigma.on("leaveEdge", ({ edge }) => {
  console.log("Mouse left edge:", edge);
});

sigma.on("clickEdge", ({ edge }) => {
  console.log("Clicked edge:", edge);
});
```

## Hover State Management

**Problem:** Hovering nodes requires updating state without infinite loops.

**Solution:** Use state with stable event handlers:

```typescript
import { useState, useEffect, useCallback } from "react";
import { useSigma } from "@react-sigma/core";

export const useNodeHover = () => {
  const sigma = useSigma();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const handleEnterNode = useCallback(({ node }: { node: string }) => {
    setHoveredNode(node);
  }, []);

  const handleLeaveNode = useCallback(() => {
    setHoveredNode(null);
  }, []);

  useEffect(() => {
    sigma.on("enterNode", handleEnterNode);
    sigma.on("leaveNode", handleLeaveNode);

    return () => {
      sigma.off("enterNode", handleEnterNode);
      sigma.off("leaveNode", handleLeaveNode);
    };
  }, [sigma, handleEnterNode, handleLeaveNode]);

  return hoveredNode;
};
```

**Critical:** Use `useCallback` to prevent re-registering handlers on every render.

## Node Selection

```typescript
export const useNodeSelection = () => {
  const sigma = useSigma();
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  const handleClickNode = useCallback(({ node, event }: { node: string; event: MouseEvent }) => {
    event.preventSigmaDefault();

    setSelectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(node)) {
        next.delete(node); // Toggle off
      } else {
        if (!event.shiftKey) {
          next.clear(); // Clear if not shift-clicking
        }
        next.add(node);
      }
      return next;
    });
  }, []);

  const handleClickStage = useCallback(() => {
    setSelectedNodes(new Set()); // Clear selection
  }, []);

  useEffect(() => {
    sigma.on("clickNode", handleClickNode);
    sigma.on("clickStage", handleClickStage);

    return () => {
      sigma.off("clickNode", handleClickNode);
      sigma.off("clickStage", handleClickStage);
    };
  }, [sigma, handleClickNode, handleClickStage]);

  return selectedNodes;
};
```

## Visual Feedback on Hover

```typescript
export const useHoverHighlight = () => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const hoveredNode = useNodeHover();

  useEffect(() => {
    if (!hoveredNode) {
      // Reset all nodes to default state
      graph.forEachNode((node) => {
        graph.setNodeAttribute(node, "highlighted", false);
      });
      sigma.refresh();
      return;
    }

    // Highlight hovered node and neighbors
    graph.forEachNode((node) => {
      const isHovered = node === hoveredNode;
      const isNeighbor = graph.hasEdge(hoveredNode, node) || graph.hasEdge(node, hoveredNode);
      graph.setNodeAttribute(node, "highlighted", isHovered || isNeighbor);
    });

    sigma.refresh();
  }, [sigma, graph, hoveredNode]);
};
```

## Context Menu

```typescript
export const useContextMenu = () => {
  const sigma = useSigma();
  const [contextMenu, setContextMenu] = useState<{
    node: string;
    x: number;
    y: number;
  } | null>(null);

  const handleRightClickNode = useCallback(
    ({ node, event }: { node: string; event: MouseEvent }) => {
      event.preventDefault();
      event.preventSigmaDefault();

      setContextMenu({
        node,
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  const handleClickStage = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    sigma.on("rightClickNode", handleRightClickNode);
    sigma.on("clickStage", handleClickStage);

    return () => {
      sigma.off("rightClickNode", handleRightClickNode);
      sigma.off("clickStage", handleClickStage);
    };
  }, [sigma, handleRightClickNode, handleClickStage]);

  return contextMenu;
};
```

## Drag and Drop

```typescript
export const useNodeDrag = () => {
  const sigma = useSigma();
  const graph = sigma.getGraph();
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    ({ node, event }: { node: string; event: MouseEvent }) => {
      event.preventSigmaDefault();
      setDraggedNode(node);

      const nodePos = {
        x: graph.getNodeAttribute(node, "x"),
        y: graph.getNodeAttribute(node, "y"),
      };

      const mousePos = sigma.viewportToGraph({ x: event.x, y: event.y });
      dragOffset.current = {
        x: mousePos.x - nodePos.x,
        y: mousePos.y - nodePos.y,
      };
    },
    [sigma, graph]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!draggedNode) return;

      const mousePos = sigma.viewportToGraph({ x: event.x, y: event.y });
      graph.setNodeAttribute(draggedNode, "x", mousePos.x - dragOffset.current.x);
      graph.setNodeAttribute(draggedNode, "y", mousePos.y - dragOffset.current.y);
      sigma.refresh();
    },
    [sigma, graph, draggedNode]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  useEffect(() => {
    sigma.on("downNode", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      sigma.off("downNode", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [sigma, handleMouseDown, handleMouseMove, handleMouseUp]);

  return draggedNode;
};
```

## Event Cleanup Pattern

**Critical:** Always clean up event listeners to prevent memory leaks:

```typescript
useEffect(() => {
  const handler = (data) => {
    // Handle event
  };

  sigma.on("event", handler);

  return () => {
    sigma.off("event", handler);
  };
}, [sigma]);
```

## Preventing Default Behavior

```typescript
sigma.on("clickNode", ({ node, event }) => {
  event.preventSigmaDefault(); // Prevent default Sigma behavior
  event.preventDefault(); // Prevent browser default
  event.stopPropagation(); // Stop event bubbling
});
```

## Performance Considerations

1. **Use `useCallback` for all event handlers** - prevents re-registration on every render
2. **Debounce frequent events** - mousemove, camera updates
3. **Batch graph updates** - use `updateNodeAttributes()` instead of multiple `setNodeAttribute()` calls
4. **Call `sigma.refresh()` once** - after all updates, not per update

## See Also

- [Sigma.js Events API](https://www.sigmajs.org/docs/latest/api/events.html)
- [preventing-react-hook-infinite-loops](../../development/preventing-react-hook-infinite-loops/) - Stable event handlers
