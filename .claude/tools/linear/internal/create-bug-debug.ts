import { callMCPTool } from '../../config/lib/mcp-client';

async function createBug() {
  try {
    console.log('Creating issue with params:');
    const params = {
      title: 'API key table not updating after key creation',
      description: 'After creating a new API key in User Settings, the API key table does not automatically update to show the newly created key.',
      team: 'Chariot Team',
      assignee: '37a14d82-adde-462c-b803-93340cd4120a',
      priority: 2,
      labels: ['bug']
    };
    console.log(JSON.stringify(params, null, 2));
    
    const rawData = await callMCPTool('linear', 'create_issue', params);
    console.log('\nRaw response:');
    console.log(JSON.stringify(rawData, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

createBug();
