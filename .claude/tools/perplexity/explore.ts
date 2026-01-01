/**
 * Perplexity MCP Server Exploration Script
 *
 * Discovers all tools and their schemas from the Perplexity MCP server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Connect to Perplexity MCP server and enumerate all tools
 */
async function exploreMCP() {
  console.log('🔍 Exploring Perplexity MCP Server...\n');

  // Get API key from environment
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.error('❌ PERPLEXITY_API_KEY environment variable not set');
    process.exit(1);
  }

  // Create transport
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@perplexity-ai/mcp-server'],
    env: {
      ...process.env,
      PERPLEXITY_API_KEY: apiKey
    }
  });

  // Create client
  const client = new Client(
    { name: 'perplexity-explorer', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    // Connect
    console.log('📡 Connecting to Perplexity MCP server...');
    await client.connect(transport);
    console.log('✅ Connected!\n');

    // List tools
    console.log('📋 Listing available tools...');
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools:\n`);

    for (const tool of tools.tools) {
      console.log(`  - ${tool.name}: ${tool.description}`);
      if (tool.inputSchema) {
        console.log(`    Input schema: ${JSON.stringify(tool.inputSchema, null, 2)}`);
      }
    }

    console.log('\n🔬 Testing each tool...\n');

    // Test each tool
    for (const tool of tools.tools) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Testing: ${tool.name}`);
      console.log('='.repeat(80));

      await exploreTool(client, tool.name, tool.description || '', tool.inputSchema as any);
    }

    // Close connection
    await client.close();
    console.log('\n✅ Exploration complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
    process.exit(1);
  }
}

/**
 * Explore a single tool with multiple test cases
 */
async function exploreTool(
  client: Client,
  toolName: string,
  description: string,
  inputSchema: any
) {
  const docsDir = path.join(__dirname, 'docs');
  const docPath = path.join(docsDir, `${toolName}-discovery.md`);

  let documentation = `# ${toolName} - Schema Discovery\n\n`;
  documentation += `**Description:** ${description}\n\n`;
  documentation += `**Discovery Date:** ${new Date().toISOString()}\n\n`;
  documentation += `---\n\n`;
  documentation += `## Input Schema\n\n\`\`\`json\n${JSON.stringify(inputSchema, null, 2)}\n\`\`\`\n\n`;

  // Define test cases based on the tool
  const testCases = getTestCases(toolName);

  documentation += `## Test Cases\n\n`;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n  Test ${i + 1}: ${testCase.name}`);
    console.log(`  Params: ${JSON.stringify(testCase.params, null, 2)}`);

    documentation += `### Test Case ${i + 1}: ${testCase.name}\n\n`;
    documentation += `**Input:**\n\`\`\`json\n${JSON.stringify(testCase.params, null, 2)}\n\`\`\`\n\n`;

    try {
      const startTime = Date.now();
      const result = await client.callTool({
        name: toolName,
        arguments: testCase.params
      });
      const duration = Date.now() - startTime;

      const content = result.content as Array<{ type: string; text?: string }> | undefined;
      if (content && content.length > 0 && content[0].type === 'text' && content[0].text) {
        const response = JSON.parse(content[0].text);
        const responseSize = JSON.stringify(response).length;
        const estimatedTokens = Math.ceil(responseSize / 4); // Rough estimate

        console.log(`  ✅ Success (${duration}ms, ~${estimatedTokens} tokens)`);
        console.log(`  Response keys: ${Object.keys(response).join(', ')}`);

        documentation += `**Output:**\n\n`;
        documentation += `- Duration: ${duration}ms\n`;
        documentation += `- Response size: ${responseSize} bytes (~${estimatedTokens} tokens)\n`;
        documentation += `- Response keys: ${Object.keys(response).join(', ')}\n\n`;
        documentation += `\`\`\`json\n${JSON.stringify(response, null, 2).substring(0, 2000)}\n...\n\`\`\`\n\n`;

        // Analyze response structure
        documentation += `**Schema Analysis:**\n\n`;
        documentation += analyzeResponseSchema(response);
        documentation += `\n`;

      } else {
        console.log(`  ✅ Success but unexpected response format`);
        documentation += `**Output:** Unexpected response format\n\n`;
      }

    } catch (error) {
      const err = error as Error;
      console.log(`  ❌ Error: ${err.message}`);
      documentation += `**Error:** ${err.message}\n\n`;
    }
  }

  // Add token reduction strategy
  documentation += `## Token Reduction Strategy\n\n`;
  documentation += getTokenReductionStrategy(toolName);
  documentation += `\n\n`;

  // Add security considerations
  documentation += `## Security Considerations\n\n`;
  documentation += getSecurityConsiderations(toolName);
  documentation += `\n`;

  // Write documentation
  fs.writeFileSync(docPath, documentation);
  console.log(`\n  📝 Documentation saved to: ${docPath}`);
}

/**
 * Get test cases for a specific tool
 */
function getTestCases(toolName: string): Array<{ name: string; params: any }> {
  switch (toolName) {
    case 'perplexity_search':
      return [
        {
          name: 'Simple search query',
          params: { query: 'What is Model Context Protocol?' }
        },
        {
          name: 'Technical search with options',
          params: {
            query: 'TypeScript async/await best practices 2025',
            max_results: 5
          }
        },
        {
          name: 'Search with country filter',
          params: {
            query: 'AI news December 2025',
            max_results: 10,
            country: 'US'
          }
        }
      ];

    case 'perplexity_ask':
      return [
        {
          name: 'General question',
          params: {
            messages: [
              { role: 'user', content: 'What is the capital of France?' }
            ]
          }
        },
        {
          name: 'Technical question',
          params: {
            messages: [
              { role: 'user', content: 'How does TypeScript type inference work?' }
            ]
          }
        },
        {
          name: 'Multi-turn conversation',
          params: {
            messages: [
              { role: 'user', content: 'What are REST APIs?' },
              { role: 'assistant', content: 'REST APIs are...' },
              { role: 'user', content: 'How do they compare to GraphQL?' }
            ]
          }
        }
      ];

    case 'perplexity_research':
      return [
        {
          name: 'Research topic with citations',
          params: {
            messages: [
              { role: 'user', content: 'What are the latest developments in large language models?' }
            ]
          }
        },
        {
          name: 'Technical research with strip_thinking',
          params: {
            messages: [
              { role: 'user', content: 'Compare different approaches to state management in React applications' }
            ],
            strip_thinking: true
          }
        },
        {
          name: 'Historical research without strip_thinking',
          params: {
            messages: [
              { role: 'user', content: 'Timeline of major web framework developments 2020-2025' }
            ],
            strip_thinking: false
          }
        }
      ];

    case 'perplexity_reason':
      return [
        {
          name: 'Logical problem',
          params: {
            messages: [
              { role: 'user', content: 'If all cats are animals, and some animals are pets, what can we conclude?' }
            ]
          }
        },
        {
          name: 'Mathematical reasoning with strip_thinking',
          params: {
            messages: [
              { role: 'user', content: 'Explain why the sum of angles in a triangle is 180 degrees' }
            ],
            strip_thinking: true
          }
        },
        {
          name: 'Decision analysis',
          params: {
            messages: [
              { role: 'user', content: 'What factors should be considered when choosing between microservices and monolithic architecture?' }
            ],
            strip_thinking: false
          }
        }
      ];

    default:
      return [
        {
          name: 'Generic test',
          params: { query: 'test' }
        }
      ];
  }
}

/**
 * Analyze response schema to identify field types and patterns
 */
function analyzeResponseSchema(response: any, prefix = ''): string {
  let analysis = '';

  if (typeof response !== 'object' || response === null) {
    return '';
  }

  for (const [key, value] of Object.entries(response)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key;
    const valueType = Array.isArray(value) ? 'array' : typeof value;
    const presence = value === null || value === undefined ? 'nullable' : 'present';

    analysis += `- \`${fieldPath}\`: ${valueType} (${presence})\n`;

    if (Array.isArray(value) && value.length > 0) {
      analysis += `  - Array length: ${value.length}\n`;
      analysis += `  - Element type: ${typeof value[0]}\n`;
      if (typeof value[0] === 'object') {
        analysis += analyzeResponseSchema(value[0], `${fieldPath}[0]`);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      analysis += analyzeResponseSchema(value, fieldPath);
    }
  }

  return analysis;
}

/**
 * Get token reduction strategy for a tool
 */
function getTokenReductionStrategy(toolName: string): string {
  return `Based on the test results above:

1. **Essential Fields:** Identify which fields are critical for Claude's usage
2. **Token Budget:** Aim for 80% reduction in response size
3. **Filtering Strategy:**
   - Keep: Core data fields required for decision-making
   - Truncate: Long text fields (descriptions, content) to first 500-1000 chars
   - Remove: Metadata, timestamps, internal IDs unless needed
   - Conditionally include: Optional fields only when present and valuable

**Target:** Original response ~5000 tokens → Filtered ~1000 tokens (80% reduction)`;
}

/**
 * Get security considerations for a tool
 */
function getSecurityConsiderations(toolName: string): string {
  return `### Input Validation

- **Control characters:** Reject null bytes, escape sequences
- **Path traversal:** Validate no ../ patterns in inputs
- **Command injection:** Sanitize shell metacharacters
- **SQL injection:** Escape quotes and special characters (if applicable)
- **XSS:** Sanitize HTML/script tags in query strings

### API Security

- **API key exposure:** Never log or return API keys in responses
- **Rate limiting:** Consider implementing rate limits to prevent abuse
- **Timeout:** Use 30-second timeout to prevent hanging requests
- **Error messages:** Don't leak sensitive information in error responses

### Data Privacy

- **PII handling:** Be cautious with personal information in queries/responses
- **Audit logging:** Consider logging requests for security monitoring (if enabled)`;
}

// Run exploration
exploreMCP().catch(console.error);
