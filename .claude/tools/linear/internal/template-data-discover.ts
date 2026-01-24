/**
 * template-data-discover.ts - Compare templateData structure between working templates
 *
 * Purpose: Discover the exact templateData JSON structure by comparing:
 * 1. Working project template (created via UI): 11156350-e6e1-4712-b992-9e5b6e176ee3
 * 2. API-created issue template: 0259235b-2bf0-459d-8b10-bd8039986239
 *
 * Run: npx tsx .claude/tools/linear/internal/template-data-discover.ts
 */

import { createLinearClient } from '../client.js';
import { executeGraphQL } from '../graphql-helpers.js';

// Query a single template by ID with full templateData field
const TEMPLATE_QUERY = `
  query Template($id: String!) {
    template(id: $id) {
      id
      name
      type
      description
      templateData
      createdAt
      updatedAt
      team {
        id
        name
      }
    }
  }
`;

interface TemplateResponse {
  template: {
    id: string;
    name: string;
    type: string;
    description?: string | null;
    templateData: unknown; // JSON structure to discover
    createdAt: string;
    updatedAt: string;
    team?: {
      id: string;
      name: string;
    } | null;
  };
}

async function discoverTemplateData() {
  const client = await createLinearClient();

  console.log('=== Template Data Structure Discovery ===\n');

  // Template IDs to compare
  const workingProjectTemplateId = '11156350-e6e1-4712-b992-9e5b6e176ee3';
  const apiIssueTemplateId = '0259235b-2bf0-459d-8b10-bd8039986239';

  try {
    // Query working project template (created via UI)
    console.log('=== 1. Working Project Template (UI-created) ===');
    console.log(`ID: ${workingProjectTemplateId}\n`);

    const projectResponse = await executeGraphQL<TemplateResponse>(
      client,
      TEMPLATE_QUERY,
      { id: workingProjectTemplateId }
    );

    console.log('Basic fields:');
    console.log(`  Name: ${projectResponse.template.name}`);
    console.log(`  Type: ${projectResponse.template.type}`);
    console.log(`  Description: ${projectResponse.template.description || '(none)'}`);
    console.log(`  Team: ${projectResponse.template.team?.name || '(none)'}`);
    console.log();

    console.log('templateData structure (raw):');
    const projectDataRaw = projectResponse.template.templateData;
    console.log(JSON.stringify(projectDataRaw, null, 2));
    console.log();

    // Parse templateData if it's a JSON string
    let projectData: any = projectDataRaw;
    if (typeof projectDataRaw === 'string') {
      console.log('templateData is a JSON string, parsing...');
      try {
        projectData = JSON.parse(projectDataRaw);
        console.log('Parsed templateData structure:');
        console.log(JSON.stringify(projectData, null, 2));
      } catch (e) {
        console.log('Failed to parse templateData:', e);
      }
      console.log();
    }

    // Analyze project templateData keys
    if (projectData && typeof projectData === 'object') {
      const keys = Object.keys(projectData);
      console.log('templateData keys:', keys.join(', '));
      console.log();
    }

    // Query API-created issue template
    console.log('\n=== 2. API-Created Issue Template ===');
    console.log(`ID: ${apiIssueTemplateId}\n`);

    const issueResponse = await executeGraphQL<TemplateResponse>(
      client,
      TEMPLATE_QUERY,
      { id: apiIssueTemplateId }
    );

    console.log('Basic fields:');
    console.log(`  Name: ${issueResponse.template.name}`);
    console.log(`  Type: ${issueResponse.template.type}`);
    console.log(`  Description: ${issueResponse.template.description || '(none)'}`);
    console.log(`  Team: ${issueResponse.template.team?.name || '(none)'}`);
    console.log();

    console.log('templateData structure (raw):');
    const issueDataRaw = issueResponse.template.templateData;
    console.log(JSON.stringify(issueDataRaw, null, 2));
    console.log();

    // Parse templateData if it's a JSON string
    let issueData: any = issueDataRaw;
    if (typeof issueDataRaw === 'string') {
      console.log('templateData is a JSON string, parsing...');
      try {
        issueData = JSON.parse(issueDataRaw);
        console.log('Parsed templateData structure:');
        console.log(JSON.stringify(issueData, null, 2));
      } catch (e) {
        console.log('Failed to parse templateData:', e);
      }
      console.log();
    }

    // Analyze issue templateData keys
    if (issueData && typeof issueData === 'object') {
      const keys = Object.keys(issueData);
      console.log('templateData keys:', keys.join(', '));
      console.log();
    }

    // Compare structures
    console.log('\n=== 3. Comparison Analysis ===\n');

    const projectKeys = projectData && typeof projectData === 'object'
      ? Object.keys(projectData as object)
      : [];
    const issueKeys = issueData && typeof issueData === 'object'
      ? Object.keys(issueData as object)
      : [];

    console.log('Keys in project template:', projectKeys.join(', ') || '(none)');
    console.log('Keys in issue template:', issueKeys.join(', ') || '(none)');
    console.log();

    // Check for descriptionData
    const projectHasDesc = projectKeys.includes('descriptionData');
    const issueHasDesc = issueKeys.includes('descriptionData');

    console.log(`descriptionData present in project template: ${projectHasDesc ? 'YES' : 'NO'}`);
    console.log(`descriptionData present in issue template: ${issueHasDesc ? 'YES' : 'NO'}`);
    console.log();

    // Analyze descriptionData structure if present
    if (projectHasDesc && projectData && typeof projectData === 'object') {
      console.log('\n=== 4. Project Template descriptionData Structure ===\n');
      const descData = (projectData as any).descriptionData;
      console.log('Full descriptionData JSON:');
      console.log(JSON.stringify(descData, null, 2));
      console.log();

      if (descData && typeof descData === 'object') {
        console.log('descriptionData keys:', Object.keys(descData).join(', '));
        if ('content' in descData) {
          console.log('\ndescriptionData.content structure:');
          console.log(JSON.stringify((descData as any).content, null, 2));
        }
      }
    }

    if (issueHasDesc && issueData && typeof issueData === 'object') {
      console.log('\n=== 5. Issue Template descriptionData Structure ===\n');
      const descData = (issueData as any).descriptionData;
      console.log('Full descriptionData JSON:');
      console.log(JSON.stringify(descData, null, 2));
      console.log();

      if (descData && typeof descData === 'object') {
        console.log('descriptionData keys:', Object.keys(descData).join(', '));
        if ('content' in descData) {
          console.log('\ndescriptionData.content structure:');
          console.log(JSON.stringify((descData as any).content, null, 2));
        }
      }
    }

    // Summary
    console.log('\n=== 6. Key Findings ===\n');
    console.log('1. Template types:');
    console.log(`   - Project (UI): ${projectResponse.template.type}`);
    console.log(`   - Issue (API): ${issueResponse.template.type}`);
    console.log();
    console.log('2. templateData structure:');
    console.log(`   - Project has ${projectKeys.length} keys`);
    console.log(`   - Issue has ${issueKeys.length} keys`);
    console.log();
    console.log('3. descriptionData field:');
    console.log(`   - Present in project: ${projectHasDesc}`);
    console.log(`   - Present in issue: ${issueHasDesc}`);
    console.log();
    console.log('4. Format:');
    console.log('   - ProseMirror format expected for descriptionData');
    console.log('   - Should contain "type", "content" array structure');

  } catch (error) {
    console.error('Query error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if ('errors' in error) {
        console.error('GraphQL errors:', (error as any).errors);
      }
    }
  }
}

discoverTemplateData().catch(console.error);
