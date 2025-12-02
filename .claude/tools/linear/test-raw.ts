import { callMCPTool } from '../config/lib/mcp-client';

async function testRaw() {
  console.log('Testing raw Linear MCP response...\n');

  try {
    console.log('=== LIST ISSUES ===');
    const issues = await callMCPTool('linear', 'list_issues', { assignee: 'me', limit: 2 });
    console.log('Issues response type:', typeof issues);
    console.log('Issues response:', JSON.stringify(issues, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testRaw();
