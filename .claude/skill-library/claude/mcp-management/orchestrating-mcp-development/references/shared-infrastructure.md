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
