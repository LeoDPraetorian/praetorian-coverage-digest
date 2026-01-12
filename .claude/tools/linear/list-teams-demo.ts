/**
 * Demonstration of parent field addition to list-teams
 *
 * Shows that the wrapper now correctly includes optional parent field
 */

import { listTeamsOutput } from './list-teams.js';
import type { ListTeamsOutput } from './list-teams.js';

console.log('🔍 Linear list-teams Parent Field Demo\n');

// Test 1: Team without parent (top-level)
console.log('Test 1: Top-level team (no parent)');
const topLevelTeam: ListTeamsOutput = {
  teams: [
    {
      id: 'team-1',
      name: 'Engineering',
      key: 'ENG',
    },
  ],
  totalTeams: 1,
  estimatedTokens: 50,
};
const validatedTopLevel = listTeamsOutput.parse(topLevelTeam);
console.log('Input:', JSON.stringify(topLevelTeam.teams[0], null, 2));
console.log('✅ Valid - no parent field required\n');

// Test 2: Team with parent (sub-team)
console.log('Test 2: Sub-team (with parent)');
const subTeam: ListTeamsOutput = {
  teams: [
    {
      id: 'team-2',
      name: 'Frontend',
      key: 'ENG-FE',
      parent: {
        id: 'team-1',
        name: 'Engineering',
      },
    },
  ],
  totalTeams: 1,
  estimatedTokens: 75,
};
const validatedSubTeam = listTeamsOutput.parse(subTeam);
console.log('Input:', JSON.stringify(subTeam.teams[0], null, 2));
console.log('✅ Valid - parent field included\n');

// Test 3: Mixed hierarchy
console.log('Test 3: Mixed hierarchy (some with parents, some without)');
const mixedHierarchy: ListTeamsOutput = {
  teams: [
    {
      id: 'team-1',
      name: 'Engineering',
      key: 'ENG',
    },
    {
      id: 'team-2',
      name: 'Frontend',
      key: 'ENG-FE',
      parent: {
        id: 'team-1',
        name: 'Engineering',
      },
    },
    {
      id: 'team-3',
      name: 'Backend',
      key: 'ENG-BE',
      parent: {
        id: 'team-1',
        name: 'Engineering',
      },
    },
    {
      id: 'team-4',
      name: 'Product',
      key: 'PROD',
    },
  ],
  totalTeams: 4,
  estimatedTokens: 200,
};
const validatedMixed = listTeamsOutput.parse(mixedHierarchy);
console.log('Teams:', mixedHierarchy.teams.length);
console.log('  - Top-level:', mixedHierarchy.teams.filter(t => !t.parent).length);
console.log('  - Sub-teams:', mixedHierarchy.teams.filter(t => t.parent).length);
console.log('✅ Valid - mixed hierarchy supported\n');

console.log('✅ Phase 2 complete! The wrapper now:');
console.log('   - Includes optional parent field in output schema');
console.log('   - Parent contains id and name');
console.log('   - Backward compatible (parent is optional)');
console.log('   - Supports mixed hierarchies');
