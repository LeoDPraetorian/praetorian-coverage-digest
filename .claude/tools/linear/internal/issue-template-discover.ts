/**
 * issue-template-discover.ts - Verify template-project associations
 *
 * Displays issue templates and their associated projects (via templateData).
 *
 * Run: npx tsx .claude/tools/linear/internal/issue-template-discover.ts
 *
 * Output shows:
 * - Template ID and name
 * - Associated projectId (if any)
 * - Associated teamId (if any)
 */

import { createLinearClient } from '../client.js';
import { executeGraphQL } from '../graphql-helpers.js';

const TEMPLATES_QUERY = `
  query Templates {
    templates {
      id
      name
      type
      templateData
    }
  }
`;

interface TemplatesResponse {
  templates?: Array<{
    id: string;
    name: string;
    type?: string | null;
    templateData?: unknown;
  }> | null;
}

interface ParsedTemplateData {
  projectId?: string;
  teamId?: string;
  [key: string]: unknown;
}

function parseTemplateData(raw: unknown): ParsedTemplateData | null {
  if (!raw) return null;

  // Handle JSON string
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ParsedTemplateData;
    } catch {
      return null;
    }
  }

  // Handle object
  if (typeof raw === 'object') {
    return raw as ParsedTemplateData;
  }

  return null;
}

async function discoverIssueTemplates() {
  const client = await createLinearClient();

  console.log('=== Issue Template Discovery ===\n');

  const response = await executeGraphQL<TemplatesResponse>(
    client,
    TEMPLATES_QUERY,
    {}
  );

  const templates = response.templates || [];

  console.log(`Total templates: ${templates.length}\n`);

  // Group by type
  const issueTemplates = templates.filter(t => t.type === 'issue');
  const projectTemplates = templates.filter(t => t.type === 'project');

  console.log(`Issue templates: ${issueTemplates.length}`);
  console.log(`Project templates: ${projectTemplates.length}\n`);

  // Show templateData for each issue template
  console.log('--- Issue Templates ---\n');

  for (const template of issueTemplates) {
    console.log(`Template: ${template.name}`);
    console.log(`  ID: ${template.id}`);

    const data = parseTemplateData(template.templateData);

    if (data?.projectId) {
      console.log(`  projectId: ${data.projectId}`);
    }
    if (data?.teamId) {
      console.log(`  teamId: ${data.teamId}`);
    }
    if (!data?.projectId && !data?.teamId) {
      console.log(`  (no project or team association)`);
    }
    console.log();
  }

  // Summary
  console.log('--- Summary ---\n');
  const templatesWithProject = issueTemplates.filter(t => {
    const data = parseTemplateData(t.templateData);
    return data?.projectId;
  });

  console.log(`Issue templates with projectId: ${templatesWithProject.length}/${issueTemplates.length}`);

  if (templatesWithProject.length > 0) {
    console.log('\nTemplate-Project Associations:');
    for (const template of templatesWithProject) {
      const data = parseTemplateData(template.templateData);
      console.log(`  ${template.name} → ${data?.projectId}`);
    }
  }
}

discoverIssueTemplates().catch(console.error);
