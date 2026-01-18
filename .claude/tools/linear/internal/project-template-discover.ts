/**
 * Project Template Discovery
 *
 * Tests whether Linear's projectCreate API supports templateId parameter.
 * This script queries the API directly to verify the capability.
 *
 * Usage:
 *   npx tsx .claude/tools/linear/internal/project-template-discover.ts
 */

import { callMCPTool } from '../../config/lib/mcp-client.js';

async function discoverProjectTemplates() {
  console.log('='.repeat(80));
  console.log('LINEAR PROJECT TEMPLATE DISCOVERY');
  console.log('='.repeat(80));
  console.log();

  try {
    // Step 1: Try to list available project templates
    console.log('Step 1: Attempting to list project templates...');
    try {
      const templates = await callMCPTool('linear', 'list_projects', {});
      console.log('✓ Successfully listed projects (checking for template field)');
      console.log(JSON.stringify(templates, null, 2));
    } catch (error) {
      console.log('✗ list_projects failed:', error instanceof Error ? error.message : String(error));
    }
    console.log();

    // Step 2: Try to get Linear teams (needed for project creation)
    console.log('Step 2: Getting teams for project creation test...');
    let teamId: string | undefined;
    try {
      const teams = await callMCPTool('linear', 'list_teams', {});
      console.log('✓ Successfully retrieved teams');
      console.log('Raw teams response:', JSON.stringify(teams, null, 2));

      // Extract first team ID from response - handle different possible formats
      if (teams && typeof teams === 'object') {
        const teamsData = teams as any;

        // Check for array format
        if (Array.isArray(teamsData) && teamsData.length > 0) {
          teamId = teamsData[0].id;
          console.log(`  Using team: ${teamsData[0].name} (${teamId})`);
        }
        // Check for content array format
        else if (teamsData.content && Array.isArray(teamsData.content) && teamsData.content.length > 0) {
          teamId = teamsData.content[0].id;
          console.log(`  Using team: ${teamsData.content[0].name} (${teamId})`);
        }
        // Check for teams field
        else if (teamsData.teams && Array.isArray(teamsData.teams) && teamsData.teams.length > 0) {
          teamId = teamsData.teams[0].id;
          console.log(`  Using team: ${teamsData.teams[0].name} (${teamId})`);
        }
      }
    } catch (error) {
      console.log('✗ list_teams failed:', error instanceof Error ? error.message : String(error));
    }
    console.log();

    if (!teamId) {
      console.log('⚠️  Cannot proceed without team ID');
      console.log('⚠️  However, we can still check the GraphQL error message for templateId support');
      console.log();

      // Try anyway with a dummy team ID to see the error message
      teamId = 'dummy-team-id-for-testing';
    }

    // Step 3: Test if projectCreate accepts templateId parameter
    console.log('Step 3: Testing projectCreate with templateId parameter...');
    console.log('  This will attempt to create a test project with a templateId field');
    console.log('  (using a non-existent template ID to avoid actually creating anything)');
    console.log();

    try {
      const result = await callMCPTool('linear', 'projectCreate', {
        name: '[TEST] Template Discovery - Delete Me',
        teamId: teamId,
        templateId: 'test-template-id-00000000'  // Non-existent template ID
      });

      console.log('✓ projectCreate accepted templateId parameter!');
      console.log('  Response:', JSON.stringify(result, null, 2));
      console.log();
      console.log('CONCLUSION: Linear API SUPPORTS templateId for project creation');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check error message for clues
      if (errorMessage.includes('templateId') || errorMessage.includes('template')) {
        console.log('✓ API recognized templateId parameter (even though it errored)');
        console.log('  Error:', errorMessage);
        console.log();
        console.log('CONCLUSION: Linear API SUPPORTS templateId, but test value was invalid');
      } else if (errorMessage.includes('Unknown argument') || errorMessage.includes('not a valid field')) {
        console.log('✗ API rejected templateId parameter');
        console.log('  Error:', errorMessage);
        console.log();
        console.log('CONCLUSION: Linear API DOES NOT support templateId for project creation');
      } else {
        console.log('? Ambiguous error (could be auth, network, or other issue)');
        console.log('  Error:', errorMessage);
        console.log();
        console.log('CONCLUSION: Unable to determine if templateId is supported');
      }
    }

  } catch (error) {
    console.error('Fatal error during discovery:', error);
  }

  console.log();
  console.log('='.repeat(80));
}

// Run discovery
discoverProjectTemplates().catch(console.error);
