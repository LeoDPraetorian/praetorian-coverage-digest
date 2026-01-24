// .claude/tools/linear/lib/resolve-ids.unit.test.ts
import { describe, it, expect, vi } from 'vitest';
import { resolveTeamId, isUUID } from './resolve-ids.js';
import type { HTTPPort } from '../../config/lib/http-client.js';

// Mock HTTPPort for testing
function createMockHTTPPort(teams: { id: string; name: string; key?: string }[]): HTTPPort {
  return {
    request: vi.fn().mockResolvedValue({
      ok: true,
      data: {
        data: {
          teams: {
            nodes: teams
          }
        }
      }
    }),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  } as unknown as HTTPPort;
}

describe('resolve-ids', () => {
  describe('isUUID', () => {
    it('returns true for valid UUIDs', () => {
      expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('returns false for invalid UUIDs', () => {
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('Engineering')).toBe(false);
      expect(isUUID('')).toBe(false);
    });
  });

  describe('resolveTeamId', () => {
    it('returns UUID unchanged if already a UUID', async () => {
      const mockClient = createMockHTTPPort([]);
      const uuid = '550e8400-e29b-41d4-a716-446655440000';

      const result = await resolveTeamId(mockClient, uuid);

      expect(result).toBe(uuid);
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('resolves team name to UUID (case-insensitive)', async () => {
      const mockClient = createMockHTTPPort([
        { id: 'team-1-uuid', name: 'Engineering', key: 'ENG' },
        { id: 'team-2-uuid', name: 'Product', key: 'PROD' }
      ]);

      const result = await resolveTeamId(mockClient, 'engineering');

      expect(result).toBe('team-1-uuid');
    });

    it('includes available teams in error when team not found', async () => {
      const mockClient = createMockHTTPPort([
        { id: 'team-1-uuid', name: 'Engineering', key: 'ENG' },
        { id: 'team-2-uuid', name: 'Product', key: 'PROD' }
      ]);

      await expect(resolveTeamId(mockClient, 'NonexistentTeam'))
        .rejects.toThrow('Team not found: NonexistentTeam');

      await expect(resolveTeamId(mockClient, 'NonexistentTeam'))
        .rejects.toThrow('Available teams:');

      await expect(resolveTeamId(mockClient, 'NonexistentTeam'))
        .rejects.toThrow('Engineering');

      await expect(resolveTeamId(mockClient, 'NonexistentTeam'))
        .rejects.toThrow('Product');
    });

    it('includes case-insensitive tip in error message', async () => {
      const mockClient = createMockHTTPPort([
        { id: 'team-1-uuid', name: 'Engineering' }
      ]);

      await expect(resolveTeamId(mockClient, 'eng'))
        .rejects.toThrow('case-insensitive');
    });
  });
});
