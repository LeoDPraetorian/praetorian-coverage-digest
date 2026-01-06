# Command Configurations

**Detailed MCPServerConfig patterns for different MCP types.**

## npm Packages

### Basic npm (npx)

```typescript
{
  command: 'npx',
  args: ['-y', '@package/name'],
  envVars: {}
}
```

**When to use:** Clean npm packages that don't write to stderr

### npm with stderr Suppression

```typescript
{
  command: 'sh',
  args: ['-c', 'npx -y @package/name 2>/dev/null'],
  envVars: {}
}
```

**When to use:** Noisy packages that write warnings/logs to stderr (e.g., Currents, Chrome DevTools)

### npm with API Key

```typescript
{
  command: 'sh',
  args: ['-c', 'npx -y @package/name 2>/dev/null'],
  envVars: { 'API_KEY_VAR': 'apiKey' }
}
```

**When to use:** Requires authentication via environment variable

## Python/uvx Packages

### PyPI Package

```typescript
{
  command: 'uvx',
  args: ['-y', 'package-name'],
  envVars: {}
}
```

**When to use:** Published to PyPI

### GitHub Repository

```typescript
{
  command: 'uvx',
  args: [
    '--from',
    'git+https://github.com/org/repo',
    'package-name',
    'start-mcp-server'
  ],
  envVars: {}
}
```

**When to use:** MCP only available on GitHub, not published to PyPI

**Additional args:** Some MCPs require extra args like `--context claude-code` or `--project-from-cwd`

## Go Modules

### Local Go Module

```typescript
{
  command: 'go',
  args: ['run', './path/to/module'],
  envVars: {}
}
```

**When to use:** Internal MCP written in Go, part of monorepo

### Go Module with Build

```typescript
{
  command: 'sh',
  args: ['-c', 'cd ./path && go build -o mcp-server && ./mcp-server'],
  envVars: {}
}
```

**When to use:** Requires build step before execution

## OAuth MCPs

### OAuth via mcp-remote

```typescript
{
  command: 'sh',
  args: ['-c', 'npx -y mcp-remote https://mcp.service.com/sse 2>/dev/null'],
  envVars: { 'SCOPES': 'read,write' }
}
```

**When to use:** MCP requires OAuth flow (e.g., Linear, GitHub)

**Browser flow:** mcp-remote handles OAuth handshake via browser

## External Credentials

### AWS Credentials (No envVars)

```typescript
{
  command: 'npx',
  args: ['-y', '@aws/mcp-server'],
  envVars: {}
}
```

**Note:** Add to `usesExternalCredentials` array in `mcp-client.ts`

### System Credentials

```typescript
const usesExternalCredentials = [
  "nebula", // Uses AWS credentials from ~/.aws
  "praetorian-cli", // Uses .env or system config
  "chariot", // Uses AWS credentials
  "{new-mcp}", // Add here if uses external auth
];
```

**When to use:** MCP uses credentials from OS, environment, or credential manager
