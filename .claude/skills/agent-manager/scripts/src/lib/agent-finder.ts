/**
 * Agent Finder
 *
 * Discovers and locates agents across all category directories.
 * Uses git-based path resolution via shared findProjectRoot().
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AgentCategory,
  AgentInfo,
  AGENT_CATEGORIES,
  AGENTS_BASE_PATH,
} from './types.js';
import { parseAgent } from './agent-parser.js';
import { findProjectRoot } from '../../../../../lib/find-project-root.js';

/**
 * Get the repository root directory using git-based resolution
 */
export function getRepoRoot(): string {
  return findProjectRoot();
}

/**
 * Get the base agents directory path
 */
export function getAgentsBasePath(): string {
  return path.join(getRepoRoot(), AGENTS_BASE_PATH);
}

/**
 * Get all agent category directories
 */
export function getAgentCategories(): AgentCategory[] {
  const basePath = getAgentsBasePath();

  if (!fs.existsSync(basePath)) {
    return [];
  }

  return AGENT_CATEGORIES.filter((category) => {
    const categoryPath = path.join(basePath, category);
    return fs.existsSync(categoryPath) && fs.statSync(categoryPath).isDirectory();
  });
}

/**
 * Get all agent files in a category
 */
export function getAgentFilesInCategory(category: AgentCategory): string[] {
  const categoryPath = path.join(getAgentsBasePath(), category);

  if (!fs.existsSync(categoryPath)) {
    return [];
  }

  return fs
    .readdirSync(categoryPath)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(categoryPath, file));
}

/**
 * Find a single agent by name
 *
 * @param name - Agent name (with or without .md extension)
 * @returns AgentInfo if found, null otherwise
 */
export function findAgent(name: string): AgentInfo | null {
  const normalizedName = name.replace(/\.md$/, '');

  for (const category of getAgentCategories()) {
    const filePath = path.join(
      getAgentsBasePath(),
      category,
      `${normalizedName}.md`
    );

    if (fs.existsSync(filePath)) {
      try {
        return parseAgent(filePath);
      } catch (error) {
        console.error(`Error parsing agent ${filePath}:`, error);
        return null;
      }
    }
  }

  return null;
}

/**
 * Find all agents across all categories
 *
 * @returns Array of AgentInfo for all agents
 */
export function findAllAgents(): AgentInfo[] {
  const agents: AgentInfo[] = [];

  for (const category of getAgentCategories()) {
    const files = getAgentFilesInCategory(category);

    for (const filePath of files) {
      try {
        const agent = parseAgent(filePath);
        agents.push(agent);
      } catch (error) {
        console.error(`Error parsing agent ${filePath}:`, error);
      }
    }
  }

  return agents.sort((a, b) => a.frontmatter.name.localeCompare(b.frontmatter.name));
}

/**
 * Find agents by category
 *
 * @param type - Agent category to filter by
 * @returns Array of AgentInfo in that category
 */
export function findAgentsByType(type: AgentCategory): AgentInfo[] {
  const files = getAgentFilesInCategory(type);
  const agents: AgentInfo[] = [];

  for (const filePath of files) {
    try {
      const agent = parseAgent(filePath);
      agents.push(agent);
    } catch (error) {
      console.error(`Error parsing agent ${filePath}:`, error);
    }
  }

  return agents.sort((a, b) => a.frontmatter.name.localeCompare(b.frontmatter.name));
}

/**
 * Check if an agent exists
 *
 * @param name - Agent name to check
 * @returns true if agent exists
 */
export function agentExists(name: string): boolean {
  return findAgent(name) !== null;
}

/**
 * Get the file path for a new agent
 *
 * @param name - Agent name
 * @param category - Agent category
 * @returns Full file path
 */
export function getNewAgentPath(name: string, category: AgentCategory): string {
  const normalizedName = name.replace(/\.md$/, '');
  return path.join(getAgentsBasePath(), category, `${normalizedName}.md`);
}

/**
 * Get agent statistics
 *
 * @returns Object with counts by category and status
 */
export function getAgentStats(): {
  total: number;
  byCategory: Record<AgentCategory, number>;
  byStatus: {
    valid: number;
    broken: number;
  };
} {
  const agents = findAllAgents();

  const byCategory = {} as Record<AgentCategory, number>;
  for (const category of AGENT_CATEGORIES) {
    byCategory[category] = 0;
  }

  let valid = 0;
  let broken = 0;

  for (const agent of agents) {
    byCategory[agent.category]++;

    if (agent.descriptionStatus === 'valid') {
      valid++;
    } else {
      broken++;
    }
  }

  return {
    total: agents.length,
    byCategory,
    byStatus: { valid, broken },
  };
}

/**
 * Get archived agents
 *
 * @returns Array of AgentInfo from .archived directory
 */
export function getArchivedAgents(): AgentInfo[] {
  const archivedPath = path.join(getAgentsBasePath(), '.archived');

  if (!fs.existsSync(archivedPath)) {
    return [];
  }

  const files = fs
    .readdirSync(archivedPath)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(archivedPath, file));

  const agents: AgentInfo[] = [];

  for (const filePath of files) {
    try {
      // Parse archived agents with special handling
      const content = fs.readFileSync(filePath, 'utf-8');
      const agent = parseAgent(filePath);
      // Override category for archived
      (agent as any).category = '.archived' as AgentCategory;
      agents.push(agent);
    } catch (error) {
      console.error(`Error parsing archived agent ${filePath}:`, error);
    }
  }

  return agents;
}
