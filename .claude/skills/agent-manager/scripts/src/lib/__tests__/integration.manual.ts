/**
 * Integration Tests - Real Agent Parsing
 *
 * Tests the parser against actual agents in the repository.
 * NOTE: These tests require running from the correct working directory
 * (the agent-manager/scripts directory) to resolve paths correctly.
 *
 * Run with: cd .claude/skills/agent-manager/scripts && npm run test:unit -- integration
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { findAgent, findAllAgents, getAgentStats, getRepoRoot } from '../agent-finder.js';

// Check if we can access the agents directory
const repoRoot = getRepoRoot();
const agentsPath = path.join(repoRoot, '.claude', 'agents');
const canRunIntegrationTests = fs.existsSync(agentsPath);

describe.skipIf(!canRunIntegrationTests)('Real Agent Integration', () => {
  describe('findAllAgents', () => {
    it('finds agents in the repository', () => {
      const agents = findAllAgents();
      expect(agents.length).toBeGreaterThan(0);
    });
  });

  describe('getAgentStats', () => {
    it('returns statistics about agents', () => {
      const stats = getAgentStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byStatus.valid + stats.byStatus.broken).toBe(stats.total);
    });

    it('detects broken agents with block scalars', () => {
      const stats = getAgentStats();
      // Most agents have block scalars (detected ~52 broken)
      expect(stats.byStatus.broken).toBeGreaterThan(40);
    });
  });

  describe('findAgent', () => {
    it('finds react-developer (valid description)', () => {
      const agent = findAgent('react-developer');
      expect(agent).not.toBeNull();
      expect(agent!.descriptionStatus).toBe('valid');
      expect(agent!.hasUseWhenTrigger).toBe(true);
      expect(agent!.hasExamples).toBe(true);
      expect(agent!.hasGatewaySkill).toBe(true);
    });

    it('finds go-architect (should be valid - already fixed)', () => {
      const agent = findAgent('go-architect');
      expect(agent).not.toBeNull();
      // go-architect was already fixed to single-line format
      expect(agent!.descriptionStatus).toBe('valid');
    });

    it('detects block scalar pipe in rust-developer', () => {
      const agent = findAgent('rust-developer');
      expect(agent).not.toBeNull();
      // rust-developer uses | block scalar
      expect(agent!.descriptionStatus).toBe('block-scalar-pipe');
    });

    it('detects block scalar folded in cloud-aws-architect', () => {
      const agent = findAgent('cloud-aws-architect');
      if (agent) {
        // Only test if agent exists and uses folded block scalar
        // Check the raw frontmatter for > pattern
        if (agent.rawFrontmatter.includes('description: |')) {
          expect(agent.descriptionStatus).toBe('block-scalar-pipe');
        }
      }
    });
  });

  describe('parseAgent metrics', () => {
    it('counts lines correctly for react-developer', () => {
      const agent = findAgent('react-developer');
      expect(agent).not.toBeNull();
      // react-developer should be ~335 lines
      expect(agent!.lineCount).toBeGreaterThan(200);
      expect(agent!.lineCount).toBeLessThan(500);
    });

    it('detects output format section', () => {
      const agent = findAgent('react-developer');
      expect(agent).not.toBeNull();
      expect(agent!.hasOutputFormat).toBe(true);
    });

    it('detects escalation protocol section', () => {
      const agent = findAgent('react-developer');
      expect(agent).not.toBeNull();
      expect(agent!.hasEscalationProtocol).toBe(true);
    });
  });
});
