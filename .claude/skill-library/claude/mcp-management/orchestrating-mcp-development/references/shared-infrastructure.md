# Shared Infrastructure

Agents MUST reference these shared utilities from the .claude/ directory:

## Testing Infrastructure (@claude/testing)

Located at .claude/lib/testing/. Provides:

- createMCPMock() - Mock MCP client for unit tests
- MCPErrors - Standard error scenarios (timeout, auth, rate limit)
- testSecurityScenarios() - Automated security test runner
- Response builders: LinearResponses, Context7Responses, CurrentsResponses, SerenaResponses

tool-tester MUST use these instead of manual vi.mock() patterns.

## Response Utilities

Located at .claude/tools/config/lib/response-utils.ts. Provides:

- truncate(value, 'SHORT'|'MEDIUM'|'LONG') - Token-efficient string truncation
- pickFields(obj, ['id', 'title']) - Type-safe field filtering
- buildListResponse(items, limit, transform) - Standardized list responses with summary
- estimateTokens(data) - Token count estimation for responses
- normalizeArrayResponse(rawData) - Handle varying MCP response formats

tool-developer MUST use these for response filtering instead of manual implementation.

## Input Sanitization

Located at .claude/tools/config/lib/sanitize.ts. Provides:

- validateNoPathTraversal(input) - Blocks ../ patterns
- validateNoCommandInjection(input) - Blocks shell metacharacters
- validateNoControlChars(input) - Blocks ASCII control characters
- validateNoXSS(input) - Blocks script injection patterns
- createSecureStringValidator(fieldName, options) - Zod superRefine helper

tool-developer MUST use these as Zod refinements for all user inputs.

## MCP Client

Located at .claude/tools/config/lib/mcp-client.ts. Provides:

- callMCPTool(mcpName, toolName, params) - Direct MCP calls
- MCPPort interface - Hexagonal port for dependency injection
- defaultMCPClient - Default MCPPort implementation
- createMockMCPClient(responses) - Factory for test mocks

For simple wrappers, use callMCPTool directly. For complex/testable wrappers, use MCPPort injection pattern.

## Secrets Infrastructure (1Password Integration)

Located at .claude/tools/config/lib/secrets-provider.ts. Provides secure credential resolution.

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| SecretsProvider | secrets-provider.ts | Interface for credential sources |
| OnePasswordSecretsProvider | secrets-provider.ts | 1Password CLI integration with 15-min cache |
| createHTTPClientAsync() | http-client.ts | Async HTTP client with 1Password support |

### Credential Resolution Order

1. **1Password** (via SecretsProvider) - Recommended for all API keys
2. **Environment Variable** - Fallback for CI/CD or local override
3. **Default** - Only for PUBLIC values (e.g., OAuth clientIds)

### Usage Pattern for REST API Wrappers

```typescript
// client.ts - Use async client creation
import { createHTTPClientAsync, type HTTPServiceConfig } from '../config/lib/http-client.js';

const serviceConfig: HTTPServiceConfig = {
  baseUrl: 'https://api.example.com',
  auth: { type: 'header', headerName: 'X-API-Key', credentialKey: 'apiKey' },
};

// RECOMMENDED: Async client (uses 1Password)
export async function createExampleClientAsync() {
  return createHTTPClientAsync('example', serviceConfig);
}

// DEPRECATED: Sync client (uses credentials.json)
export function createExampleClient() {
  console.warn('DEPRECATED: Use createExampleClientAsync()');
  return createHTTPClient('example', serviceConfig);
}
```

### Adding a New Service to 1Password

1. Add to serviceItems in `.claude/tools/1password/lib/config.ts`:
   ```typescript
   serviceItems: {
     // ... existing
     'new-service': 'New Service API Key',
   }
   ```

2. Create item in 1Password vault 'Claude Code Tools':
   - Item name: 'New Service API Key'
   - Field: password (contains API key)

3. Use `createHTTPClientAsync('new-service', config)` in wrapper

### Services Currently Configured

| Service | 1Password Item | Auth Type |
|---------|---------------|-----------|
| currents | Currents API Key | Header |
| context7 | Context7 API Key | Header |
| perplexity | Perplexity API Key | Header |
| shodan | Shodan API Key | Query param |
| featurebase | Featurebase API Key | Header |

### Important Notes

- **NEVER store API keys in credentials.json** - it's deprecated
- **ALL new REST API wrappers MUST use async pattern**
- **OAuth services (Linear) don't use 1Password** - they use OAuth tokens in ~/.claude-oauth/
- **MCP servers get credentials via environment injection** - see mcp-client.ts credential flow
