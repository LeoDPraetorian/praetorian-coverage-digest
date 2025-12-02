import { getProjects } from './index';

async function testProjects() {
  const result = await getProjects.execute({});
  console.log('Projects found:', result.totalProjects);
  console.log('Project data:', JSON.stringify(result.projects, null, 2));
}

testProjects();
