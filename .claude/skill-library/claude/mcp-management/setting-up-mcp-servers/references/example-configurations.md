# Example Configurations

**Complete examples of MCP server configurations with context.**

## Example 1: Currents (npm with stderr suppression)

**Context:** Currents is an npm package that writes warnings to stderr. We suppress stderr to avoid noise in MCP logs.

**Discovery:**

- Search: "currents mcp server npm"
- Found: `@currents/mcp` on npm

**Configuration:**

```typescript
'currents': {
  command: 'sh',
  args: ['-c', 'npx -y @currents/mcp 2>/dev/null'],
  envVars: { 'CURRENTS_API_KEY': 'apiKey' }
}
```

**Credentials:**

- Add to `.claude/tools/config/credentials.json`:
  ```json
  {
    "apiKey": "your-currents-api-key-here"
  }
  ```

**Verification:**

```bash
timeout 10 npx -y @currents/mcp --help 2>/dev/null
```

## Example 2: Serena (Python/uvx from GitHub)

**Context:** Serena is a Python MCP for semantic code operations, installed via uvx from GitHub.

**Discovery:**

- Search: "serena mcp github"
- Found: `https://github.com/oraios/serena`
- Detected: `pyproject.toml` → Python/uvx

**Configuration:**

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

**No credentials required** - uses local filesystem access only.

**Verification:**

```bash
timeout 10 uvx --from git+https://github.com/oraios/serena serena --help
```

## Example 3: Linear (OAuth via mcp-remote)

**Context:** Linear uses OAuth for authentication via mcp-remote proxy.

**Discovery:**

- Search: "linear mcp"
- Found: `https://mcp.linear.app/sse` (OAuth endpoint)

**Configuration:**

```typescript
'linear': {
  command: 'sh',
  args: ['-c', 'npx -y mcp-remote https://mcp.linear.app/sse 2>/dev/null'],
  envVars: { 'LINEAR_SCOPES': 'read,write,issues:create' }
}
```

**OAuth Flow:**

1. First MCP call triggers browser OAuth flow
2. User authorizes in browser
3. Token stored by mcp-remote
4. Subsequent calls use stored token

**Verification:**

```bash
# Will open browser for OAuth on first run
npx -y mcp-remote https://mcp.linear.app/sse --help 2>/dev/null
```

## Example 4: Chariot (Go module, local)

**Context:** Internal Chariot MCP server written in Go, part of monorepo.

**Discovery:**

- User provided: `modules/chariot/backend/cmd/tools/chariot-mcp`
- Detected: `go.mod` → Go module

**Configuration:**

```typescript
'chariot': {
  command: 'go',
  args: ['run', 'modules/chariot/backend/cmd/tools/chariot-mcp'],
  envVars: {}
}
```

**External Credentials:**

```typescript
const usesExternalCredentials = [
  "nebula",
  "praetorian-cli",
  "chariot", // ← Add here
];
```

**Why:** Uses AWS credentials from `~/.aws/credentials`

**Verification:**

```bash
cd modules/chariot/backend/cmd/tools/chariot-mcp
go run . --help
```

## Example 5: Chrome DevTools (npm with stderr suppression)

**Context:** Chrome DevTools MCP writes connection logs to stderr.

**Discovery:**

- Search: "chrome devtools mcp npm"
- Found: `@modelcontextprotocol/server-chrome-devtools`

**Configuration:**

```typescript
'chrome-devtools': {
  command: 'sh',
  args: ['-c', 'npx -y @modelcontextprotocol/server-chrome-devtools 2>/dev/null'],
  envVars: {}
}
```

**No credentials required** - connects to local Chrome instance.

**Verification:**

```bash
# Start Chrome with debugging port
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Test MCP
timeout 10 npx -y @modelcontextprotocol/server-chrome-devtools --help 2>/dev/null
```

## Example 6: Praetorian CLI (npm with external credentials)

**Context:** Praetorian CLI uses `.env` credentials from super-repo root.

**Discovery:**

- Search: "praetorian-cli mcp npm"
- Found: `@praetorian-inc/praetorian-cli` (internal package)

**Configuration:**

```typescript
'praetorian-cli': {
  command: 'npx',
  args: ['-y', '@praetorian-inc/praetorian-cli', 'mcp'],
  envVars: {}
}
```

**External Credentials:**

```typescript
const usesExternalCredentials = [
  "nebula",
  "praetorian-cli", // ← Already included
];
```

**Why:** Reads from `.env` in repository root:

```
PRAETORIAN_CLI_USERNAME=user@example.com
PRAETORIAN_CLI_PASSWORD=password
```

**Verification:**

```bash
# Must be in super-repo root with .env present
npx -y @praetorian-inc/praetorian-cli mcp --help
```
