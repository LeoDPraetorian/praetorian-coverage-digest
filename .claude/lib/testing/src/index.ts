/**
 * @claude/testing - Universal MCP Testing Library
 *
 * Shared testing infrastructure for all MCP wrappers using Vitest.
 *
 * @example Basic Unit Test
 * ```typescript
 * import { describe, it, expect, vi, beforeEach } from 'vitest';
 * import { createMCPMock, Context7Responses } from '@claude/testing';
 * import { myWrapper } from './my-wrapper';
 * import * as mcpClient from '../config/lib/mcp-client';
 *
 * vi.mock('../config/lib/mcp-client');
 *
 * describe('myWrapper', () => {
 *   let mcpMock: ReturnType<typeof createMCPMock>;
 *
 *   beforeEach(() => {
 *     mcpMock = createMCPMock();
 *     vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
 *   });
 *
 *   it('should work', async () => {
 *     mcpMock.mockResolvedValue({ data: 'test' });
 *     const result = await myWrapper.execute({ input: 'test' });
 *     expect(result).toBeDefined();
 *   });
 * });
 * ```
 */

// ============================================================================
// Mocking Utilities
// ============================================================================

export {
  createMCPMock,
  createMCPServerMock,
  setupMCPMock,
  spyOnMCPCalls,
  MCPErrors,
  type MockResponse,
  type MockError,
} from './mocks/mcp-client-mock';

export {
  buildMockResponse,
  Context7Responses,
  LinearResponses,
  CurrentsResponses,
  SerenaResponses,
  SalesforceResponses,
  GenericResponses,
  TestData,
} from './mocks/response-builders';

// ============================================================================
// Test Fixtures
// ============================================================================

export {
  PathTraversalScenarios,
  CommandInjectionScenarios,
  XSSScenarios,
  ControlCharacterScenarios,
  getAllSecurityScenarios,
  testSecurityScenarios,
  type SecurityTestCase,
} from './fixtures/security-scenarios';

export {
  NetworkErrorScenarios,
  ServerErrorScenarios,
  AuthErrorScenarios,
  ResourceErrorScenarios,
  ValidationErrorScenarios,
  getAllErrorScenarios,
  testErrorScenarios,
  EdgeCaseData,
  type ErrorScenario,
} from './fixtures/error-scenarios';

// ============================================================================
// Assertion Helpers
// ============================================================================

export {
  assertSchemaAccepts,
  assertSchemaRejects,
  testSchema,
  generateStringTests,
  generateNumberTests,
  extractZodErrors,
  assertWrapperInputValidation,
} from './assertions/schema-assertions';
