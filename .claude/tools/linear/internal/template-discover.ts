/**
 * template-discover.ts - Schema Discovery for Linear Templates API
 *
 * Discovers actual field structure by querying the templates API.
 * Run: npx tsx .claude/tools/linear/internal/template-discover.ts
 */

import { createLinearClient } from '../client.js';
import { executeGraphQL } from '../graphql-helpers.js';

// Test query to discover template fields
const TEMPLATES_QUERY = `
  query Templates {
    templates {
      id
      name
      description
      type
      createdAt
      updatedAt
    }
  }
`;

interface TemplatesResponse {
  templates?: Array<{
    id: string;
    name: string;
    description?: string | null;
    type?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }> | null;
}

async function discoverTemplateSchema() {
  const client = await createLinearClient();

  console.log('=== Discovering Templates Schema ===\n');

  try {
    const response = await executeGraphQL<TemplatesResponse>(client, TEMPLATES_QUERY, {});
    console.log('Templates response structure:');
    console.log(JSON.stringify(response, null, 2));

    // Analyze types
    const templates = response.templates || [];
    console.log(`\n=== Analysis ===`);
    console.log(`Total templates: ${templates.length}`);

    const types = new Map<string, number>();
    for (const t of templates) {
      const type = t.type || 'unknown';
      types.set(type, (types.get(type) || 0) + 1);
    }

    console.log('\nTemplates by type:');
    for (const [type, count] of types) {
      console.log(`  ${type}: ${count}`);
    }

    console.log('\n=== Sample Project Template ===');
    const projectTemplate = templates.find(t => t.type === 'project');
    if (projectTemplate) {
      console.log(JSON.stringify(projectTemplate, null, 2));
    } else {
      console.log('No project templates found');
    }

    console.log('\n=== Sample Issue Template ===');
    const issueTemplate = templates.find(t => t.type === 'issue');
    if (issueTemplate) {
      console.log(JSON.stringify(issueTemplate, null, 2));
    } else {
      console.log('No issue templates found');
    }

  } catch (error) {
    console.error('Query error:', error);
  }
}

discoverTemplateSchema().catch(console.error);
