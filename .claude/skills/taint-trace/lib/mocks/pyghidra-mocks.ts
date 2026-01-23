/**
 * Mock PyGhidra MCP responses for testing taint analysis logic
 * without calling real PyGhidra MCP server.
 */

export interface MockExportedSymbol {
  name: string;
  address: string;
  type?: string;
}

export interface MockListExportsOutput {
  items: MockExportedSymbol[];
  summary: {
    total: number;
    returned: number;
  };
  estimatedTokens: number;
}

export interface MockDecompileFunctionOutput {
  code: string;
  function_signature?: string;
  summary: {
    function_name: string;
    total_lines: number;
    returned_lines: number;
    was_truncated: boolean;
    truncated_lines: number;
  };
  estimatedTokens: number;
}

/**
 * Mock list-exports response with common source functions
 */
export async function mockListExports(binaryName: string): Promise<MockListExportsOutput> {
  const items: MockExportedSymbol[] = [
    { name: 'main', address: '0x401000', type: 'function' },
    { name: 'recv', address: '0x402000', type: 'function' },
    { name: 'strcpy', address: '0x403000', type: 'function' },
    { name: 'system', address: '0x404000', type: 'function' },
    { name: 'printf', address: '0x405000', type: 'function' },
  ];

  return {
    items,
    summary: {
      total: items.length,
      returned: items.length
    },
    estimatedTokens: 500
  };
}

export interface MockCrossReference {
  from_address: string;
  from_function: string;
  to_address: string;
  xref_type: string;
}

export interface MockListCrossReferencesOutput {
  items: MockCrossReference[];
  summary: {
    total: number;
    returned: number;
  };
  estimatedTokens: number;
}

/**
 * Mock decompile-function response with realistic C-style code
 */
export async function mockDecompileFunction(
  binaryName: string,
  functionName: string
): Promise<MockDecompileFunctionOutput> {
  const code = `void ${functionName}(int argc, char **argv) {
  char buffer[64];
  if (argc > 1) {
    strcpy(buffer, argv[1]);
  }
  return;
}`;

  return {
    code,
    function_signature: `void ${functionName}(int, char**)`,
    summary: {
      function_name: functionName,
      total_lines: 7,
      returned_lines: 7,
      was_truncated: false,
      truncated_lines: 0
    },
    estimatedTokens: 200
  };
}

/**
 * Mock list-cross-references response with function call xrefs
 */
export async function mockListCrossReferences(
  binaryName: string,
  nameOrAddress: string
): Promise<MockListCrossReferencesOutput> {
  const items: MockCrossReference[] = [
    {
      from_address: '0x401050',
      from_function: 'main',
      to_address: '0x402000',
      xref_type: 'CALL'
    },
    {
      from_address: '0x401080',
      from_function: 'processPacket',
      to_address: '0x402000',
      xref_type: 'CALL'
    }
  ];

  return {
    items,
    summary: {
      total: items.length,
      returned: items.length
    },
    estimatedTokens: 300
  };
}
