/**
 * label-discover.ts - Schema Discovery for Linear Label API
 *
 * Discovers actual field structure by querying the API.
 * Run: npx tsx .claude/tools/linear/internal/label-discover.ts
 */

import { createLinearClient } from '../client.js';
import { executeGraphQL } from '../graphql-helpers.js';

// Test query to discover label fields
const LABELS_QUERY = `
  query Labels {
    issueLabels(first: 5) {
      nodes {
        id
        name
        description
        color
        parent { id name }
        team { id name }
        isGroup
        createdAt
        updatedAt
        archivedAt
      }
    }
  }
`;

async function discoverLabelSchema() {
  const client = await createLinearClient();

  console.log('=== Discovering Label Schema ===\n');

  // Query existing labels
  try {
    const labels = await executeGraphQL(client, LABELS_QUERY, {});
    console.log('Label fields discovered:');
    console.log(JSON.stringify(labels, null, 2));
  } catch (error) {
    console.error('Query error:', error);
  }
}

discoverLabelSchema().catch(console.error);
