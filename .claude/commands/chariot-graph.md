---
description: Natural language interface for Chariot graph queries - complex relationship queries via Neo4j
argument-hint: <describe your query naturally>
allowed-tools: Bash, Read
---

# Chariot Graph Queries

**Speak naturally!** Query the Chariot graph database for complex relationships and patterns.

## Natural Language Examples

### Asset Relationship Queries

```bash
# All of these work:
/chariot-graph find all assets connected to RISK-456
/chariot-graph show me assets related to vulnerability CVE-2024-1234
/chariot-graph get all assets with relationships to high-priority risks
/chariot-graph find assets connected through attack paths
```

### Vulnerability Queries

```bash
/chariot-graph show me all assets with vulnerabilities
/chariot-graph find assets affected by critical risks
/chariot-graph query assets with CVSS score above 8
/chariot-graph get all risks for domain example.com
```

### Attack Path Queries

```bash
/chariot-graph trace attack path from ASSET-123
/chariot-graph show attack surface for example.com
/chariot-graph find all paths to critical assets
```

### Status and Filter Queries

```bash
/chariot-graph list all active assets
/chariot-graph show me assets by status
/chariot-graph get assets of type domain
/chariot-graph find assets with class ipv4
```

### Complex Relationship Traversal

```bash
/chariot-graph show me assets owned by ACCOUNT-789 with their vulnerabilities
/chariot-graph find all DNS records connected to example.com
/chariot-graph trace relationships from ASSET-123 to risks
```

---

## How It Works

1. **You describe** your graph query naturally
2. **I read** the Chariot graph skill for context and query patterns
3. **I construct** the Neo4j query structure (nodes, filters, relationships)
4. **I execute** the graph query wrapper
5. **I display** results with relationship context

**No Cypher knowledge needed!** Just describe the relationships you want to explore.

---

## Implementation

When you invoke this command, I will:

1. Read the Chariot graph MCP tools skill:

```bash
Read: .claude/skill-library/claude/mcp-tools/mcp-tools-chariot/SKILL.md
```

2. Parse your natural language to build query structure:
   - **Nodes**: What entities to query (Asset, Risk, Account, etc.)
   - **Labels**: Entity types (domain, ipv4, vulnerability, etc.)
   - **Filters**: Conditions (status=A, cvss>7, etc.)
   - **Relationships**: How nodes connect (HAS_VULNERABILITY, BELONGS_TO, etc.)

3. Execute the graph query wrapper with constructed query

4. Format results showing:
   - Matched nodes
   - Relationship paths
   - Aggregated insights

---

## What You Can Do

Based on the Chariot graph MCP (3 tools available):

**Graph Queries:**

- Query nodes by labels and filters
- Traverse relationships between entities
- Find connected assets and risks
- Trace attack paths through the graph

**Common Query Patterns:**

- Assets with vulnerabilities
- Risks by severity (CVSS, EPSS, KEV)
- Attack surface mapping
- Asset discovery paths
- Integration connections

**Available Node Labels:**

- Asset, Risk, Account, Seed, Job
- Integration, Capability, Attribute
- (See CLAUDE.md for complete allowedColumns list)

**Available Relationships:**

- HAS_VULNERABILITY
- BELONGS_TO
- DISCOVERED_BY
- CONTAINS
- DEPENDS_ON

The skill will show me the exact query structure to use!

---

## Authentication

Uses the same credentials as `/chariot-api`:

**Credentials**: `.env` environment variables

- `PRAETORIAN_CLI_USERNAME`
- `PRAETORIAN_CLI_PASSWORD`

**Or via**: `make user` to generate test credentials

---

## Tips for Best Results

- **Describe relationships**: "assets connected to risks" helps me build the right query
- **Be specific about filters**: "CVSS > 8" or "status active" gives better results
- **Start simple**: Query one node type first, then add relationships
- **Use labels**: "domain assets" or "ipv4 assets" helps filter
- **Natural language works**: I'll translate to graph query structure

---

## Important: Queryable Fields

⚠️ **Graph queries MUST only use fields in `allowedColumns`** (see CLAUDE.md:195-210)

**Common queryable fields:**

- `key`, `name`, `status`, `dns`, `value`
- `cvss`, `epss`, `kev`, `priority`
- `class`, `type`, `source`, `origin`
- `created`, `updated`, `visited`

If you request a field that's not in `allowedColumns`, I'll let you know and suggest alternatives.

---

## Technical Reference

For developers or debugging, here's the underlying wrapper pattern:

### Graph Query (Direct Execution)

```bash
ROOT="$(git rev-parse --show-superproject-working-tree --show-toplevel | head -1)" && npx tsx -e "(async () => {
  const { query } = await import('$ROOT/.claude/tools/chariot/query.ts');
  const queryStructure = {
    node: {
      labels: ['Asset'],
      filters: [
        { field: 'status', operator: '=', value: 'A' }
      ]
    },
    limit: 100
  };
  const result = await query.execute({
    query: JSON.stringify(queryStructure),
    stack: 'your-stack-name',
    username: 'your-username',
    tree: false
  });
  console.log(JSON.stringify(result, null, 2));
})();" 2>/dev/null
```

**Note**: Stack and username are typically loaded from environment variables automatically.
