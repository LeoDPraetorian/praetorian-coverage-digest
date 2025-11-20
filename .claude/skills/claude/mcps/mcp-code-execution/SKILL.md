---
name: mcp-code-execution
description: Use when configuring AI agents to consume MCP servers via code execution for token efficiency, implementing progressive tool discovery through filesystem exploration, or reducing context window usage by 98%+ - covers code execution environments, security sandboxing, privacy preservation, and when to use code execution vs direct tool calls
---

# Code Execution with MCP

Master the code execution pattern for MCP consumption that achieves 98.7% token reduction through progressive disclosure and in-environment data processing.

## When to Use This Pattern

**Use code execution when:**
- Connecting to MCP servers with hundreds or thousands of tools
- Processing large datasets (spreadsheets, transcripts, logs) from MCP tools
- Intermediate results would consume excessive context tokens
- Privacy preservation requires tokenizing sensitive data
- Need state persistence across agent sessions
- Building reusable skill libraries for agents

**Use direct tool calls when:**
- Working with 5-10 well-defined tools
- Results are naturally concise (<1000 tokens)
- No intermediate data processing needed
- Simplicity and lower infrastructure overhead preferred

## Core Problem Solved

### Traditional MCP Token Overhead

**Tool Definition Bloat:**
- Loading all tool definitions into context consumes 100,000+ tokens
- Example: 1,000 tools × 150 tokens each = 150,000 tokens before any work

**Intermediate Result Bloat:**
- Tool results flow through model context multiple times
- Example: Download 2-hour meeting transcript (25,000 tokens) → Attach to Salesforce → 50,000 tokens consumed

### Code Execution Solution

Agents write TypeScript/Python code to interact with MCP servers:

```
servers/
├── google-drive/
│   └── getDocument.ts
├── salesforce/
│   └── updateRecord.ts
└── slack/
    └── sendMessage.ts
```

**Token Reduction: 150,000 → 2,000 tokens (98.7% savings)**

## How It Works

### 1. Progressive Disclosure via Filesystem

Instead of loading all tool definitions upfront:

1. **Agent explores filesystem** to discover available MCP servers
2. **Loads only needed tool definitions** from specific server files
3. **Writes code** to call tools and process results
4. **Filters data in execution environment** before returning to model

**Example workflow:**
```typescript
// Agent writes code to:
1. List servers/ directory
2. Load servers/google-drive/getDocument.ts
3. Call getDocument(id="meeting-transcript")
4. Process 10,000 lines in code
5. Return only 5 relevant summary points
```

### 2. Context-Efficient Data Processing

**Problem:** Large datasets consume context when passed through model

**Solution:** Process data in execution environment

```typescript
// Instead of returning all 10,000 rows:
const spreadsheet = await excel.read("sales_data.xlsx");
const filtered = spreadsheet
  .filter(row => row.revenue > 100000)
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 5); // Top 5 only

return filtered; // 5 rows instead of 10,000
```

### 3. Privacy Preservation

**Tokenize sensitive data automatically:**

```typescript
const email = "john.doe@company.com";
const tokenized = tokenize(email); // → "USER_EMAIL_001"

// Flow tokenized data between systems
await salesforce.updateContact(tokenized);
// Original email never enters model context
```

### 4. State Persistence

**Save results to files for reusability:**

```typescript
// Agent can save work and resume later
const results = await analyzeData();
fs.writeFileSync("analysis_results.json", JSON.stringify(results));

// Later sessions can load cached results
const cached = JSON.parse(fs.readFileSync("analysis_results.json"));
```

## Implementation Requirements

### Secure Execution Environment

Code execution requires infrastructure that traditional tool calls don't:

**Required components:**
- **Sandboxing**: Isolated execution (containers, VMs, or sandboxed runtimes)
- **Resource limits**: CPU, memory, disk quotas to prevent abuse
- **Timeout enforcement**: Kill long-running processes
- **Network restrictions**: Limit outbound connections
- **Monitoring**: Log execution for debugging and audit

**See @security-sandboxing.md for complete security requirements.**

### Filesystem Structure

**Organization pattern:**
```
execution-environment/
├── servers/           # MCP server tool definitions
│   ├── google-drive/
│   ├── salesforce/
│   └── slack/
├── workspace/         # Agent working directory
│   ├── data/          # Downloaded files
│   ├── results/       # Processed outputs
│   └── cache/         # Saved state
└── skills/            # Reusable code libraries
```

## Benefits Summary

| Benefit | Description | Impact |
|---------|-------------|--------|
| **Token Efficiency** | Progressive tool loading | 98.7% reduction |
| **Data Filtering** | Process in environment | Prevents context bloat |
| **Control Flow** | Native loops/conditionals | Replaces chained tool calls |
| **Privacy** | Tokenize sensitive data | Data never enters model |
| **State Persistence** | Save results to files | Resume workflows |
| **Reusability** | Build skill libraries | Share across sessions |

## Tradeoffs

### Code Execution Pattern
✅ **Pros:**
- Massive token savings (98.7%)
- Handle large datasets efficiently
- Privacy preservation built-in
- State persistence
- Reusable skill libraries

❌ **Cons:**
- Infrastructure complexity (sandboxing, monitoring)
- Security concerns (code execution risks)
- Operational overhead
- Debugging more difficult

### Direct Tool Calls Pattern
✅ **Pros:**
- Simple implementation
- No infrastructure overhead
- Easy debugging
- Lower security risk

❌ **Cons:**
- High token usage with many tools
- Context bloat with large results
- No built-in privacy preservation
- No state persistence

## Decision Framework

**Choose Code Execution when:**
- Tool count > 50
- Processing datasets > 10,000 tokens
- Privacy preservation required
- Need state across sessions
- Token efficiency critical

**Choose Direct Tool Calls when:**
- Tool count < 10
- Results naturally concise
- Simplicity preferred
- Infrastructure constraints
- Quick prototype needed

## Quick Start

### 1. Set Up Execution Environment

**See @setup-guide.md for complete setup instructions including:**
- Container/VM configuration
- Resource limit settings
- Security sandboxing
- Network restrictions
- Monitoring setup

### 2. Organize MCP Server Definitions

```bash
# Create filesystem structure
mkdir -p servers/{google-drive,salesforce,slack}

# Place tool definitions in server directories
# Format: servers/<service>/<tool>.ts
```

### 3. Configure Agent

**Point agent to execution environment:**
- Filesystem root: `/path/to/execution-environment`
- Enable code execution mode
- Configure sandboxing parameters
- Set resource limits

### 4. Test Progressive Disclosure

**Verify agent can:**
1. Explore servers/ filesystem
2. Load tool definitions on-demand
3. Write code to call tools
4. Filter results before returning

## Common Patterns

### Pattern 1: Large Dataset Processing

**See @patterns.md for complete pattern library including:**
- Spreadsheet filtering and aggregation
- Log file analysis and extraction
- Document processing and summarization
- Multi-step data transformations

### Pattern 2: Multi-Tool Workflows

**Chain tools efficiently:**
```typescript
// Download → Process → Upload
const doc = await googleDrive.getDocument(id);
const summary = processingLogic(doc);
await salesforce.createNote(summary);
// Only summary enters model context
```

### Pattern 3: Privacy-Preserving Flows

**Tokenize sensitive data:**
```typescript
const emails = extractEmails(document);
const tokenMap = tokenize(emails);
await thirdParty.sendNotifications(tokenMap.tokens);
```

## Reference Files

- **@security-sandboxing.md**: Complete security requirements and sandboxing configuration
- **@setup-guide.md**: Detailed setup instructions for execution environments
- **@patterns.md**: Common code execution patterns and examples
- **@troubleshooting.md**: Debugging and performance optimization

## Related Skills

- **mcp-builder**: Building MCP servers (server-side development)
- **serverless-compute-decision-architecture**: Choosing compute patterns for serverless

## Further Reading

- Original blog post: https://www.anthropic.com/engineering/code-execution-with-mcp
- MCP Protocol: https://modelcontextprotocol.io
