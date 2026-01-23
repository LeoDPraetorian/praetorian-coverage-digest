/**
 * MCP client wrapper for pyghidra
 *
 * STUB IMPLEMENTATION - This is mocked in tests
 */

export async function callMcpTool<T = any>(
  toolName: string,
  params: Record<string, any>
): Promise<T> {
  throw new Error('callMcpTool should be mocked in tests');
}
