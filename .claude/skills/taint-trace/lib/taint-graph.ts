export type NodeType = 'function' | 'parameter' | 'variable';

export interface TaintNode {
  id: string;              // Unique identifier
  type: NodeType;
  function: string;        // Function name
  address?: string;        // Memory address (for functions)
  paramIndex?: number;     // Parameter index (for parameters)
  varName?: string;        // Variable name (for variables)
  isTainted: boolean;      // Taint status
}

export type EdgeType = 'dataflow' | 'call';
export type Transformation =
  | 'assignment'
  | 'pointer_arithmetic'
  | 'string_operation'
  | 'arithmetic'
  | 'return_value';

export interface TaintEdge {
  from: string;            // Source node ID
  to: string;              // Target node ID
  type: EdgeType;
  transformation?: Transformation;
  metadata?: {
    operation?: string;    // e.g., "buffer + offset"
    sanitized?: boolean;   // Whether data was sanitized
    [key: string]: any;    // Additional metadata
  };
}

export class TaintGraph {
  private nodes: Map<string, TaintNode> = new Map();
  private edges: Map<string, TaintEdge[]> = new Map();

  constructor() {}

  addNode(node: TaintNode): void {
    this.nodes.set(node.id, node);
  }

  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  getNode(id: string): TaintNode | undefined {
    return this.nodes.get(id);
  }

  addEdge(edge: TaintEdge): void {
    if (!this.edges.has(edge.from)) {
      this.edges.set(edge.from, []);
    }
    this.edges.get(edge.from)!.push(edge);
  }

  getEdgesFrom(nodeId: string): TaintEdge[] {
    return this.edges.get(nodeId) || [];
  }

  getTaintedNodes(): TaintNode[] {
    return Array.from(this.nodes.values()).filter(n => n.isTainted);
  }

  getAllNodes(): TaintNode[] {
    return Array.from(this.nodes.values());
  }

  findPaths(sourceId: string, sinkId: string): string[][] {
    const paths: string[][] = [];
    const visited = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      currentPath.push(nodeId);

      if (nodeId === sinkId) {
        paths.push([...currentPath]);
      } else {
        const edges = this.getEdgesFrom(nodeId);
        for (const edge of edges) {
          dfs(edge.to);
        }
      }

      currentPath.pop();
      visited.delete(nodeId);
    };

    dfs(sourceId);
    return paths;
  }
}
