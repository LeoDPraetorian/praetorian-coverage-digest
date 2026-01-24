/**
 * Tests for resolve-template.ts - Template lookup by project ID
 */

import { describe, it, expect, vi } from 'vitest';
import { resolveTemplateForProject } from './resolve-template';
import type { HTTPPort } from '../../config/lib/http-client';

// Mock executeGraphQL
vi.mock('../graphql-helpers', () => ({
  executeGraphQL: vi.fn(),
}));

import { executeGraphQL } from '../graphql-helpers';

describe('resolveTemplateForProject', () => {
  it('should return template ID when project has associated template', async () => {
    const mockClient = {} as HTTPPort;
    const projectId = '48e717eb-2956-4a92-bf35-ad72f32371bf';
    const expectedTemplateId = '0259235b-2bf0-459d-8b10-bd8039986239';

    // Mock GraphQL response with matching template
    vi.mocked(executeGraphQL).mockResolvedValueOnce({
      templates: [
        {
          id: expectedTemplateId,
          name: 'Project Issue Template',
          type: 'issue',
          templateData: {
            projectId: projectId,
            teamId: '4bfbfdff-6fba-4b9d-833c-0e8bea37524a',
          },
        },
      ],
    });

    const result = await resolveTemplateForProject(mockClient, projectId);

    expect(result).toBe(expectedTemplateId);
  });

  it('should return undefined when no template matches project', async () => {
    const mockClient = {} as HTTPPort;
    const projectId = 'no-matching-project-id';

    // Mock GraphQL response with non-matching template
    vi.mocked(executeGraphQL).mockResolvedValueOnce({
      templates: [
        {
          id: 'other-template-id',
          name: 'Other Project Template',
          type: 'issue',
          templateData: {
            projectId: 'different-project-id',
          },
        },
      ],
    });

    const result = await resolveTemplateForProject(mockClient, projectId);

    expect(result).toBeUndefined();
  });

  it('should handle templateData as JSON string', async () => {
    const mockClient = {} as HTTPPort;
    const projectId = '48e717eb-2956-4a92-bf35-ad72f32371bf';
    const expectedTemplateId = 'template-with-string-data';

    // Mock GraphQL response with templateData as JSON string
    vi.mocked(executeGraphQL).mockResolvedValueOnce({
      templates: [
        {
          id: expectedTemplateId,
          name: 'Template With String Data',
          type: 'issue',
          templateData: JSON.stringify({
            projectId: projectId,
            teamId: '4bfbfdff-6fba-4b9d-833c-0e8bea37524a',
          }),
        },
      ],
    });

    const result = await resolveTemplateForProject(mockClient, projectId);

    expect(result).toBe(expectedTemplateId);
  });

  it('should only match issue templates, not project templates', async () => {
    const mockClient = {} as HTTPPort;
    const projectId = '48e717eb-2956-4a92-bf35-ad72f32371bf';

    // Mock GraphQL response with project template (type !== 'issue')
    vi.mocked(executeGraphQL).mockResolvedValueOnce({
      templates: [
        {
          id: 'project-template-id',
          name: 'Project Template',
          type: 'project',
          templateData: {
            projectId: projectId, // Even though it matches, type is wrong
          },
        },
        {
          id: 'issue-template-id',
          name: 'Issue Template',
          type: 'issue',
          templateData: {
            projectId: projectId, // This should match
          },
        },
      ],
    });

    const result = await resolveTemplateForProject(mockClient, projectId);

    expect(result).toBe('issue-template-id');
  });

  it('should handle empty templates array', async () => {
    const mockClient = {} as HTTPPort;
    const projectId = '48e717eb-2956-4a92-bf35-ad72f32371bf';

    // Mock empty response
    vi.mocked(executeGraphQL).mockResolvedValueOnce({
      templates: [],
    });

    const result = await resolveTemplateForProject(mockClient, projectId);

    expect(result).toBeUndefined();
  });

  it('should handle null templates response', async () => {
    const mockClient = {} as HTTPPort;
    const projectId = '48e717eb-2956-4a92-bf35-ad72f32371bf';

    // Mock null response
    vi.mocked(executeGraphQL).mockResolvedValueOnce({
      templates: null,
    });

    const result = await resolveTemplateForProject(mockClient, projectId);

    expect(result).toBeUndefined();
  });

  it('should handle template with missing templateData', async () => {
    const mockClient = {} as HTTPPort;
    const projectId = '48e717eb-2956-4a92-bf35-ad72f32371bf';

    // Mock response with template missing templateData
    vi.mocked(executeGraphQL).mockResolvedValueOnce({
      templates: [
        {
          id: 'template-without-data',
          name: 'Template Without Data',
          type: 'issue',
          templateData: null,
        },
      ],
    });

    const result = await resolveTemplateForProject(mockClient, projectId);

    expect(result).toBeUndefined();
  });

  it('should handle invalid JSON in templateData string', async () => {
    const mockClient = {} as HTTPPort;
    const projectId = '48e717eb-2956-4a92-bf35-ad72f32371bf';

    // Mock response with invalid JSON string
    vi.mocked(executeGraphQL).mockResolvedValueOnce({
      templates: [
        {
          id: 'template-with-invalid-json',
          name: 'Template With Invalid JSON',
          type: 'issue',
          templateData: 'not valid json{',
        },
      ],
    });

    const result = await resolveTemplateForProject(mockClient, projectId);

    expect(result).toBeUndefined();
  });
});
