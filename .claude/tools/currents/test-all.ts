import {
  getProjects,
  getRuns
} from './index';

async function testAllAPIs() {
  console.log('Testing Currents MCP Wrappers with Real API\n');

  // Test 1: Get Projects
  console.log('1. Getting projects...');
  try {
    const projects = await getProjects.execute({});
    console.log(`   ✓ Found ${projects.totalProjects} projects`);
    if (projects.totalProjects > 0) {
      console.log(`   First project: ${projects.projects[0].name} (${projects.projects[0].id})`);

      // Test 2: Get Runs for first project
      console.log('\n2. Getting runs for project...');
      const runs = await getRuns.execute({
        projectId: projects.projects[0].id,
        limit: 5
      });
      console.log(`   ✓ Found ${runs.totalRuns} runs`);
      if (runs.runs.length > 0) {
        console.log(`   Latest run: ${runs.runs[0].id} - ${runs.runs[0].status}`);
      }
    } else {
      console.log('   ⚠️  No projects found - check if you have projects in Currents dashboard');
      console.log('   API key is working (no auth errors) but account may be empty');
    }
  } catch (error) {
    console.error('   ✗ Error:', error.message);
  }

  console.log('\nDone!');
}

testAllAPIs();
