/**
 * resolve-template.ts - Find issue template associated with a project
 *
 * Queries Linear templates and matches them to projects via templateData.projectId
 */

import { executeGraphQL } from '../graphql-helpers.js';
import type { HTTPPort } from '../../config/lib/http-client.js';

const TEMPLATES_WITH_DATA_QUERY = `
  query Templates {
    templates {
      id
      name
      type
      templateData
    }
  }
`;

interface TemplatesWithDataResponse {
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

/**
 * Parse templateData field which can be JSON string or object
 *
 * @param raw - Raw templateData from GraphQL (string or object)
 * @returns Parsed templateData or null if invalid
 */
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

/**
 * Find issue template associated with a project
 *
 * @param client - GraphQL client
 * @param projectId - Project UUID to find template for
 * @returns Template ID if found, undefined if no template associated
 *
 * @example
 * const templateId = await resolveTemplateForProject(client, '48e717eb-...');
 * // Returns: '0259235b-2bf0-459d-8b10-bd8039986239' or undefined
 */
export async function resolveTemplateForProject(
  client: HTTPPort,
  projectId: string
): Promise<string | undefined> {
  const response = await executeGraphQL<TemplatesWithDataResponse>(
    client,
    TEMPLATES_WITH_DATA_QUERY,
    {}
  );

  const templates = response.templates || [];

  // Find issue template with matching projectId
  for (const template of templates) {
    if (template.type !== 'issue') continue;

    const data = parseTemplateData(template.templateData);
    if (data?.projectId === projectId) {
      return template.id;
    }
  }

  return undefined;
}
