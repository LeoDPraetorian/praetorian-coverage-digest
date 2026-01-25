import { describe, it, expect, vi } from 'vitest';
import { getTemplate, getTemplateParams, getTemplateOutput } from './get-template.js';
import type { HTTPPort } from '../config/lib/http-client.js';

describe('get-template', () => {
  describe('Parameter Validation', () => {
    it('should validate required id field', () => {
      expect(() => getTemplateParams.parse({})).toThrow();
      expect(() => getTemplateParams.parse({ id: '' })).toThrow();
    });

    it('should accept valid UUID id', () => {
      const result = getTemplateParams.parse({
        id: '0259235b-2bf0-459d-8b10-bd8039986239'
      });
      expect(result.id).toBe('0259235b-2bf0-459d-8b10-bd8039986239');
    });

    it('should reject control characters in id', () => {
      expect(() => getTemplateParams.parse({ id: 'test\n\r' })).toThrow();
      expect(() => getTemplateParams.parse({ id: 'test\x00' })).toThrow();
    });
  });

  describe('GraphQL Query', () => {
    it('should fetch template with templateData field', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            data: {
              template: {
                id: '0259235b-2bf0-459d-8b10-bd8039986239',
                name: 'Project Template',
                description: 'Test template description',
                type: 'project',
                templateData: JSON.stringify({
                  title: 'New Project',
                  descriptionData: {
                    type: 'doc',
                    content: [
                      { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }
                    ]
                  },
                  stateId: 'state-123',
                  priority: 2,
                  teamId: 'team-456'
                }),
                team: {
                  id: 'team-456',
                  name: 'Engineering'
                },
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z'
              }
            }
          }
        })
      };

      const result = await getTemplate.execute(
        { id: '0259235b-2bf0-459d-8b10-bd8039986239' },
        mockClient
      );

      expect(result.id).toBe('0259235b-2bf0-459d-8b10-bd8039986239');
      expect(result.name).toBe('Project Template');
      expect(result.type).toBe('project');
      expect(result.content.title).toBe('New Project');
      expect(result.content.descriptionData).toBeDefined();
      expect(result.content.descriptionText).toContain('Hello world');
      expect(result.content.stateId).toBe('state-123');
      expect(result.content.priority).toBe(2);
      expect(result.content.teamId).toBe('team-456');
      expect(result.team).toEqual({ id: 'team-456', name: 'Engineering' });
    });

    it('should handle template without team', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            data: {
              template: {
                id: 'template-id',
                name: 'Issue Template',
                type: 'issue',
                templateData: JSON.stringify({ title: 'New Issue' }),
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z'
              }
            }
          }
        })
      };

      const result = await getTemplate.execute(
        { id: 'template-id' },
        mockClient
      );

      expect(result.team).toBeUndefined();
    });

    it('should extract plain text from ProseMirror descriptionData', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            data: {
              template: {
                id: 'template-id',
                name: 'Test',
                type: 'project',
                templateData: JSON.stringify({
                  descriptionData: {
                    type: 'doc',
                    content: [
                      { type: 'paragraph', content: [{ type: 'text', text: 'First paragraph' }] },
                      { type: 'paragraph', content: [{ type: 'text', text: 'Second paragraph' }] }
                    ]
                  }
                }),
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z'
              }
            }
          }
        })
      };

      const result = await getTemplate.execute(
        { id: 'template-id' },
        mockClient
      );

      expect(result.content.descriptionText).toContain('First paragraph');
      expect(result.content.descriptionText).toContain('Second paragraph');
    });

    it('should handle templateData as JSON string', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            data: {
              template: {
                id: 'template-id',
                name: 'Test',
                type: 'issue',
                templateData: '{"title":"Test Title","priority":1}',
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z'
              }
            }
          }
        })
      };

      const result = await getTemplate.execute(
        { id: 'template-id' },
        mockClient
      );

      expect(result.content.title).toBe('Test Title');
      expect(result.content.priority).toBe(1);
    });

    it('should handle templateData as object', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            data: {
              template: {
                id: 'template-id',
                name: 'Test',
                type: 'issue',
                templateData: { title: 'Test Title', priority: 1 },
                createdAt: '2025-01-01T00:00:00.000Z',
                updatedAt: '2025-01-02T00:00:00.000Z'
              }
            }
          }
        })
      };

      const result = await getTemplate.execute(
        { id: 'template-id' },
        mockClient
      );

      expect(result.content.title).toBe('Test Title');
      expect(result.content.priority).toBe(1);
    });

    it('should throw error when template not found', async () => {
      const mockClient: HTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            data: {
              template: null
            }
          }
        })
      };

      await expect(
        getTemplate.execute({ id: 'nonexistent-id' }, mockClient)
      ).rejects.toThrow('Template not found: nonexistent-id');
    });
  });

  describe('Output Validation', () => {
    it('should validate complete output with all fields', () => {
      const output = {
        id: 'template-id',
        name: 'Test Template',
        type: 'project' as const,
        description: 'Test description',
        content: {
          title: 'New Project',
          descriptionData: { type: 'doc', content: [] },
          descriptionText: 'Plain text',
          stateId: 'state-123',
          priority: 2,
          teamId: 'team-456',
          labelIds: ['label-1', 'label-2']
        },
        team: { id: 'team-456', name: 'Engineering' },
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        estimatedTokens: 100
      };

      expect(() => getTemplateOutput.parse(output)).not.toThrow();
    });

    it('should validate minimal output', () => {
      const output = {
        id: 'template-id',
        name: 'Test',
        type: 'issue' as const,
        content: {},
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
        estimatedTokens: 50
      };

      expect(() => getTemplateOutput.parse(output)).not.toThrow();
    });
  });
});
