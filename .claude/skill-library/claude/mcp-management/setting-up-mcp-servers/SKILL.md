---
name: setting-up-mcp-servers
description: Use when setting up a new MCP server for wrapping - detects if MCP is configured, guides installation from npm/PyPI/GitHub/local, adds config to mcp-client.ts, verifies MCP responds. Supports npm (npx), Python (uvx), Go, and OAuth MCPs.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, AskUserQuestion, TodoWrite
---

# Setting Up MCP Servers

**Detect, install, and configure MCP (Model Context Protocol) servers before creating wrappers.**

## When to Use

Use this skill when:

- Before creating MCP wrappers when the MCP is not yet configured
- When `/mcp-manager create` is called for an unconfigured MCP
- When manually setting up a new MCP server integration
- When `orchestrating-mcp-development` needs MCP setup before schema discovery

**You MUST use TodoWrite before starting** to track all workflow steps through the 8-step MCP setup process.

## Quick Reference

| Step | Action                           | Tools Used          |
| ---- | -------------------------------- | ------------------- |
| 1    | Check if MCP already configured  | Read, Grep          |
| 2    | Ask user for installation source | AskUserQuestion     |
| 3    | Search/locate MCP package        | WebSearch, WebFetch |
| 4    | Determine command configuration  | Analysis            |
| 5    | Check credential requirements    | WebSearch, WebFetch |
| 6    | Add config to mcp-client.ts      | Edit                |
| 7    | Verify MCP works                 | Bash                |
| 8    | Return structured result         | Output              |

## Workflow

### Step 1: Check if MCP is Already Configured

Read `.claude/tools/config/lib/mcp-client.ts` and search for the MCP name in the configs object:

```typescript
const configs: Record<string, MCPServerConfig> = {
  'currents': { command: 'sh', args: [...], envVars: {...} },
  'linear': { command: 'sh', args: [...], envVars: {...} },
  // ... other configured MCPs
};
```

**If found:** Return `{ status: 'already_configured', mcpName: name }`

**If not found:** Proceed to Step 2

### Step 2: Ask User for Installation Source

Use AskUserQuestion to determine how to set up the MCP:

```typescript
AskUserQuestion({
  questions: [
    {
      header: "MCP Setup",
      question: 'MCP "{mcpName}" is not configured. How would you like to set it up?',
      multiSelect: false,
      options: [
        {
          label: "Search for it (Recommended)",
          description: "Search npm, PyPI, and GitHub for the MCP package",
        },
        {
          label: "GitHub repository",
          description: "Provide or confirm a GitHub URL to install from",
        },
        {
          label: "Local directory",
          description: "Point to an already-downloaded MCP on your filesystem",
        },
        {
          label: "Skip setup",
          description: "MCP is configured elsewhere or I will set it up manually",
        },
      ],
    },
  ],
});
```

### Step 3a: Search Path

If user selected search, use WebSearch to find the MCP package:

**Search queries to try:**

- `{mcpName} mcp server npm`
- `{mcpName} mcp modelcontextprotocol`
- `{mcpName} mcp github`

**Look for:**

- npm packages: `@org/{mcpName}-mcp`, `{mcpName}-mcp-server`, `@modelcontextprotocol/server-{mcpName}`
- PyPI packages: `{mcpName}-mcp`, `mcp-{mcpName}`
- GitHub repos: `github.com/*/{mcpName}*mcp`

Present findings to user with AskUserQuestion to confirm the correct package.

### Step 3b: GitHub Path

If user selected GitHub, ask for GitHub URL if not provided:

```typescript
AskUserQuestion({
  questions: [
    {
      header: "GitHub URL",
      question: "What is the GitHub repository URL for this MCP?",
      multiSelect: false,
      options: [{ label: "https://github.com/...", description: "Enter the full GitHub URL" }],
    },
  ],
});
```

Then detect the package type by fetching repo contents:

- `package.json` exists → npm/Node.js MCP
- `pyproject.toml` or `setup.py` exists → Python/uvx MCP
- `go.mod` exists → Go MCP

### Step 3c: Local Path

If user selected local, ask for the local directory path, then detect package type from:

- `package.json` → npm
- `pyproject.toml` → Python/uvx
- `go.mod` → Go

### Step 4: Determine Command Configuration

Based on detected source type, build the MCPServerConfig. For complete configuration patterns, see [Command Configurations](references/command-configurations.md).

**Quick reference:**

| Source Type   | Command       | Args Pattern                                                   |
| ------------- | ------------- | -------------------------------------------------------------- |
| npm           | `npx` or `sh` | `['-y', '@package/name']`                                      |
| Python/PyPI   | `uvx`         | `['-y', 'package-name']`                                       |
| Python/GitHub | `uvx`         | `['--from', 'git+https://...', 'package', 'start-mcp-server']` |
| Go            | `go`          | `['run', './path/to/module']`                                  |
| OAuth         | `sh`          | `['-c', 'npx -y mcp-remote https://...']`                      |

### Step 5: Check for Credential Requirements

Search the MCP documentation or README for:

- API_KEY, TOKEN, SECRET environment variables
- OAuth requirements
- Authentication sections

If credentials required, ask user:

```typescript
AskUserQuestion({
  questions: [
    {
      header: "Credentials",
      question: "This MCP requires authentication. How is it configured?",
      multiSelect: false,
      options: [
        { label: "API Key", description: "Requires an API key in credentials.json" },
        { label: "OAuth", description: "Uses browser-based OAuth flow" },
        { label: "None", description: "No authentication required" },
        { label: "External", description: "Uses system credentials (AWS, etc.)" },
      ],
    },
  ],
});
```

**If API Key:** Add entry to `.claude/tools/config/credentials.json` (prompt user for key or placeholder)

### Step 6: Add Configuration to mcp-client.ts

Edit `.claude/tools/config/lib/mcp-client.ts` to add the new config:

```typescript
// Add after existing configs, before the closing brace
'{mcpName}': {
  command: '{command}',
  args: {argsArray},
  envVars: {envVarsObject}
},
```

Also add to `usesExternalCredentials` array if applicable:

```typescript
const usesExternalCredentials = [
  "nebula",
  "praetorian-cli",
  // ... add new MCP if it uses external auth
  "{mcpName}",
];
```

### Step 7: Verify MCP Works

Test that the MCP starts and responds:

```bash
# For npm
timeout 10 npx -y @package/name --help || echo 'MCP verification needed'

# For uvx
timeout 10 uvx --from git+https://github.com/... package --help || echo 'MCP verification needed'
```

If possible, make a test MCP call using the mcp-client infrastructure to verify connectivity.

### Step 8: Return Result

Output structured result:

```json
{
  "status": "configured",
  "mcpName": "{mcpName}",
  "source": "npm|pypi|github|local",
  "command": "{command}",
  "args": ["arg1", "arg2"],
  "configLocation": ".claude/tools/config/lib/mcp-client.ts",
  "credentialsRequired": true|false,
  "credentialsConfigured": true|false,
  "verificationPassed": true|false,
  "notes": "Any important notes for the user"
}
```

## Examples

For complete examples with detailed configurations, see [Example Configurations](references/example-configurations.md).

### Example 1: npm package (Currents)

Input: MCP name 'currents'
Search finds: `@currents/mcp` on npm

Config added:

```typescript
'currents': {
  command: 'sh',
  args: ['-c', 'npx -y @currents/mcp 2>/dev/null'],
  envVars: { 'CURRENTS_API_KEY': 'apiKey' }
}
```

### Example 2: Python/uvx from GitHub (Serena)

Input: MCP name 'serena'
Search finds: github.com/oraios/serena (Python, uvx)

Config added:

```typescript
'serena': {
  command: 'uvx',
  args: [
    '--from',
    'git+https://github.com/oraios/serena',
    'serena',
    'start-mcp-server',
    '--context',
    'claude-code',
    '--project-from-cwd'
  ],
  envVars: {}
}
```

### Example 3: OAuth MCP (Linear)

Input: MCP name 'linear'
Search finds: Uses OAuth via mcp-remote

Config added:

```typescript
'linear': {
  command: 'sh',
  args: ['-c', 'npx -y mcp-remote https://mcp.linear.app/sse 2>/dev/null'],
  envVars: { 'LINEAR_SCOPES': 'read,write,issues:create' }
}
```

### Example 4: Go module (internal)

Input: MCP name 'chariot'
User provides: Local path `modules/chariot/backend/cmd/tools/chariot-mcp`

Config added:

```typescript
'chariot': {
  command: 'go',
  args: ['run', 'modules/chariot/backend/cmd/tools/chariot-mcp'],
  envVars: {}
}
```

## Error Handling

For complete error handling patterns, see [Error Handling](references/error-handling.md).

**Common issues:**

- **WebSearch fails**: Ask user to provide GitHub URL directly
- **Package detection fails**: Ask user to specify command type (npm/uvx/go)
- **Verification fails**: Warn user but still save config, note in output
- **mcp-client.ts edit fails**: Provide the config block for manual addition

## Integration with orchestrating-mcp-development

This skill is invoked early in the MCP wrapper creation workflow, before schema discovery:

- Phase 1: Setup workspace
- **Phase 2: MCP Setup** ← This skill
- Phase 3: Schema Discovery (requires working MCP)
- ...

The orchestrator should invoke this skill with:

```typescript
Skill('setting-up-mcp-servers', args: '{mcpName}')
```

And check the returned status before proceeding to schema discovery.

## Output Location

This skill modifies:

- `.claude/tools/config/lib/mcp-client.ts` (adds MCP config)
- `.claude/tools/config/credentials.json` (if API key needed)

No separate output file is created - the config is added directly to the codebase.

## Related Skills

- `orchestrating-mcp-development` - Invokes this skill before schema discovery
- `managing-mcp-wrappers` - References configured MCPs for wrapper operations
- `gateway-mcp-tools` - Routes to MCP-specific library skills
