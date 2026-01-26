import {
  MockExportedSymbol,
  MockListExportsOutput,
  MockDecompileFunctionOutput,
  MockListCrossReferencesOutput,
  MockCrossReference,
  mockListExports,
  mockDecompileFunction,
  mockListCrossReferences
} from './pyghidra-mocks.js';

export interface MockScenario {
  functions?: MockExportedSymbol[];
  decompileResults?: Record<string, string>; // functionName -> code
  xrefs?: Record<string, MockCrossReference[]>; // functionName -> xrefs
}

export interface MockPyghidraClient {
  listExports(binaryName: string): Promise<MockListExportsOutput>;
  decompileFunction(binaryName: string, functionName: string): Promise<MockDecompileFunctionOutput>;
  listCrossReferences(binaryName: string, nameOrAddress: string): Promise<MockListCrossReferencesOutput>;
}

export function createMockPyghidraClient(scenario?: MockScenario): MockPyghidraClient {
  return {
    async listExports(binaryName: string): Promise<MockListExportsOutput> {
      if (scenario?.functions) {
        return {
          items: scenario.functions,
          summary: {
            total: scenario.functions.length,
            returned: scenario.functions.length
          },
          estimatedTokens: 500
        };
      }
      return mockListExports(binaryName);
    },

    async decompileFunction(binaryName: string, functionName: string): Promise<MockDecompileFunctionOutput> {
      if (scenario?.decompileResults?.[functionName]) {
        const code = scenario.decompileResults[functionName];
        const lines = code.split('\n');

        return {
          code,
          function_signature: `void ${functionName}()`,
          summary: {
            function_name: functionName,
            total_lines: lines.length,
            returned_lines: lines.length,
            was_truncated: false,
            truncated_lines: 0
          },
          estimatedTokens: 200
        };
      }
      return mockDecompileFunction(binaryName, functionName);
    },

    async listCrossReferences(binaryName: string, nameOrAddress: string): Promise<MockListCrossReferencesOutput> {
      if (scenario?.xrefs?.[nameOrAddress]) {
        const items = scenario.xrefs[nameOrAddress];
        return {
          items,
          summary: {
            total: items.length,
            returned: items.length
          },
          estimatedTokens: 300
        };
      }
      return mockListCrossReferences(binaryName, nameOrAddress);
    }
  };
}

/**
 * Pre-built scenario: Simple buffer overflow vulnerability
 * main() -> recv() -> strcpy()
 */
export function createBufferOverflowScenario(): MockScenario {
  return {
    functions: [
      { name: 'main', address: '0x401000', type: 'function' },
      { name: 'recv', address: '0x402000', type: 'function' },
      { name: 'strcpy', address: '0x403000', type: 'function' }
    ],
    decompileResults: {
      'main': `int main(int argc, char **argv) {
  char buffer[64];
  recv(sockfd, buffer, 1024, 0);
  return 0;
}`,
      'recv': 'int recv(int sockfd, void *buf, size_t len, int flags);',
      'strcpy': 'char *strcpy(char *dest, const char *src);'
    },
    xrefs: {
      'recv': [
        {
          from_address: '0x401050',
          from_function: 'main',
          to_address: '0x402000',
          xref_type: 'CALL'
        }
      ],
      'strcpy': []
    }
  };
}
