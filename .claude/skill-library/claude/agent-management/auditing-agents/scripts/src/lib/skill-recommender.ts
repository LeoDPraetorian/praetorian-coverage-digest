/**
 * Skill Recommender - Recommend skills for agents (inverse of agent-analyzer)
 *
 * agent-analyzer: skill → agents (which agents should use this skill?)
 * skill-recommender: agent → skills (which skills should this agent use?)
 *
 * Used by auditing-agents --skills flag to show recommended skills.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

// =============================================================================
// Types
// =============================================================================

export interface AgentMetadata {
  name: string;
  path: string;
  category: string;
  description: string;
  tools: string[];
  skills: string[];
  content: string;
}

export interface SkillMetadata {
  name: string;
  path: string;
  description: string;
  allowedTools: string[];
  domain: string;
  location: 'core' | 'library';
}

export interface SkillRecommendation {
  skill: string;
  path: string;
  score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  action: string;
  breakdown: {
    domain: number;
    triggers: number;
    tools: number;
    related: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

// Domain hierarchy for matching
const DOMAIN_HIERARCHY: Record<string, string[]> = {
  development: ['frontend', 'backend', 'python', 'integrations'],
  testing: ['frontend-testing', 'backend-testing', 'e2e', 'unit', 'integration'],
  quality: ['review', 'analysis', 'coverage'],
  architecture: ['frontend-architecture', 'backend-architecture', 'security-architecture'],
  security: ['auth', 'cryptography', 'threat-modeling'],
  claude: ['skill-management', 'agent-management', 'mcp-management'],
};

// Adjacent domain pairs (can match with reduced score)
const ADJACENT_DOMAINS = [
  ['development', 'testing'],
  ['development', 'quality'],
  ['architecture', 'development'],
  ['security', 'testing'],
  ['testing', 'quality'],
  ['frontend', 'development'],
  ['backend', 'development'],
];

// Synonym groups for trigger matching
const SYNONYMS = [
  ['test', 'testing', 'tests', 'e2e', 'unit', 'spec'],
  ['component', 'components', 'UI', 'interface', 'widget'],
  ['api', 'endpoint', 'REST', 'graphql', 'handler'],
  ['state', 'data', 'store', 'query', 'cache'],
  ['debug', 'debugging', 'troubleshoot', 'fix', 'investigate'],
  ['style', 'styling', 'CSS', 'tailwind', 'design'],
  ['react', 'frontend', 'tsx', 'jsx', 'component'],
  ['go', 'golang', 'backend', 'handler', 'lambda'],
  ['python', 'py', 'script', 'cli'],
  ['security', 'auth', 'authentication', 'authorization', 'jwt'],
  ['form', 'validation', 'input', 'submit'],
  ['performance', 'optimize', 'speed', 'efficient'],
];

// =============================================================================
// Project Root Detection
// =============================================================================

function getProjectRoot(): string {
  try {
    // Try superproject first (for submodule detection)
    let gitRoot = '';
    try {
      gitRoot = execSync('git rev-parse --show-superproject-working-tree', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
    } catch {
      // Not in submodule
    }

    if (!gitRoot || gitRoot.length === 0) {
      gitRoot = execSync('git rev-parse --show-toplevel', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
    }

    return gitRoot;
  } catch {
    throw new Error('Could not find project root');
  }
}

// =============================================================================
// Skill Discovery
// =============================================================================

/**
 * Parse YAML frontmatter from skill file
 */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[key] = value;
    }
  }

  return frontmatter;
}

/**
 * Extract skill metadata from a SKILL.md file
 */
function extractSkillMetadata(skillPath: string, location: 'core' | 'library'): SkillMetadata | null {
  try {
    const content = readFileSync(skillPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    const skillDir = dirname(skillPath);
    const name = frontmatter.name || basename(skillDir);

    // Extract domain from path
    const pathParts = skillPath.split('/');
    let domain = 'unknown';

    if (location === 'library') {
      // Path: .claude/skill-library/{category}/{domain}/...
      const libraryIndex = pathParts.indexOf('skill-library');
      if (libraryIndex >= 0 && pathParts.length > libraryIndex + 2) {
        domain = `${pathParts[libraryIndex + 1]}/${pathParts[libraryIndex + 2]}`;
      }
    } else {
      // Core skill: .claude/skills/{skill-name}/SKILL.md
      domain = 'core';
    }

    // Parse allowed-tools
    const allowedTools = frontmatter['allowed-tools']
      ? frontmatter['allowed-tools'].split(',').map(t => t.trim())
      : [];

    return {
      name,
      path: skillPath,
      description: frontmatter.description || '',
      allowedTools,
      domain,
      location,
    };
  } catch {
    return null;
  }
}

/**
 * Recursively find all SKILL.md files in a directory
 */
function findSkillFiles(dir: string, results: string[] = []): string[] {
  if (!existsSync(dir)) return results;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

        // Check if this directory has a SKILL.md
        const skillFile = join(fullPath, 'SKILL.md');
        if (existsSync(skillFile)) {
          results.push(skillFile);
        }

        // Continue recursively
        findSkillFiles(fullPath, results);
      }
    }
  } catch {
    // Ignore errors
  }

  return results;
}

/**
 * Get all skill metadata (core + library)
 */
export function getAllSkillMetadata(): SkillMetadata[] {
  const projectRoot = getProjectRoot();
  const skills: SkillMetadata[] = [];

  // 1. Core skills
  const coreDir = join(projectRoot, '.claude/skills');
  if (existsSync(coreDir)) {
    const coreSkills = findSkillFiles(coreDir);
    for (const skillPath of coreSkills) {
      const metadata = extractSkillMetadata(skillPath, 'core');
      if (metadata) skills.push(metadata);
    }
  }

  // 2. Library skills
  const libraryDir = join(projectRoot, '.claude/skill-library');
  if (existsSync(libraryDir)) {
    const librarySkills = findSkillFiles(libraryDir);
    for (const skillPath of librarySkills) {
      const metadata = extractSkillMetadata(skillPath, 'library');
      if (metadata) skills.push(metadata);
    }
  }

  return skills;
}

// =============================================================================
// Agent Metadata Extraction
// =============================================================================

/**
 * Extract agent metadata from agent file
 */
export function extractAgentMetadata(agentPath: string): AgentMetadata | null {
  if (!existsSync(agentPath)) return null;

  try {
    const content = readFileSync(agentPath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    // Extract body (everything after frontmatter)
    const bodyMatch = content.match(/^---[\s\S]*?---\n([\s\S]*)/);
    const body = bodyMatch ? bodyMatch[1] : content;

    // Parse tools (comma-separated)
    const tools = frontmatter.tools
      ? frontmatter.tools.split(',').map(t => t.trim())
      : [];

    // Parse skills (comma-separated)
    const skills = frontmatter.skills
      ? frontmatter.skills.split(',').map(s => s.trim())
      : [];

    // Extract category from path
    const pathParts = agentPath.split('/');
    const agentsIndex = pathParts.indexOf('agents');
    const category = agentsIndex >= 0 && pathParts.length > agentsIndex + 1
      ? pathParts[agentsIndex + 1]
      : 'unknown';

    return {
      name: frontmatter.name || basename(agentPath, '.md'),
      path: agentPath,
      category,
      description: frontmatter.description || '',
      tools,
      skills,
      content: body,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// Scoring Functions
// =============================================================================

/**
 * Extract triggers/keywords from a description
 */
function extractTriggers(description: string): string[] {
  // Extract key phrases after "Use when"
  const useWhenMatch = description.match(/Use when (.+?)(?:\s*[-–—]|$)/i);
  if (useWhenMatch) {
    return useWhenMatch[1]
      .split(/[,;]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 2);
  }

  // Fallback: split on common separators
  return description
    .split(/[,;.\-]/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 3 && t.length < 30);
}

/**
 * Check if two terms match (including synonyms)
 */
function fuzzyMatch(a: string, b: string): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  // Direct match
  if (aLower.includes(bLower) || bLower.includes(aLower)) {
    return true;
  }

  // Synonym match
  return SYNONYMS.some(
    group => group.some(s => aLower.includes(s)) && group.some(s => bLower.includes(s))
  );
}

/**
 * Check if domains are adjacent
 */
function areAdjacentDomains(domainA: string, domainB: string): boolean {
  const aCat = domainA.split('/')[0];
  const bCat = domainB.split('/')[0];

  return ADJACENT_DOMAINS.some(
    pair => (pair[0] === aCat && pair[1] === bCat) || (pair[0] === bCat && pair[1] === aCat)
  );
}

/**
 * Calculate domain match score (40 points max)
 */
function calculateDomainScore(skill: SkillMetadata, agent: AgentMetadata): number {
  const skillDomain = skill.domain.toLowerCase();
  const agentCategory = agent.category.toLowerCase();
  const agentDesc = agent.description.toLowerCase();

  // Exact category match
  if (skillDomain.includes(agentCategory) || agentCategory.includes(skillDomain.split('/')[0])) {
    return 40;
  }

  // Check if skill domain appears in agent description
  const domainParts = skillDomain.split('/');
  if (domainParts.some(part => agentDesc.includes(part))) {
    return 30;
  }

  // Adjacent domains
  if (areAdjacentDomains(skillDomain, agentCategory)) {
    return 20;
  }

  // Check hierarchy
  for (const [parent, children] of Object.entries(DOMAIN_HIERARCHY)) {
    if (agentCategory.includes(parent) && children.some(c => skillDomain.includes(c))) {
      return 25;
    }
    if (skillDomain.includes(parent) && children.some(c => agentCategory.includes(c))) {
      return 25;
    }
  }

  return 0;
}

/**
 * Calculate trigger overlap score (30 points max)
 */
function calculateTriggerScore(skill: SkillMetadata, agent: AgentMetadata): number {
  const skillTriggers = extractTriggers(skill.description);
  const agentTriggers = extractTriggers(agent.description);

  if (skillTriggers.length === 0 || agentTriggers.length === 0) {
    return 0;
  }

  // Calculate matches
  const matches = skillTriggers.filter(st =>
    agentTriggers.some(at => fuzzyMatch(st, at))
  );

  // Also check agent body for skill triggers
  const bodyMatches = skillTriggers.filter(st =>
    agent.content.toLowerCase().includes(st)
  );

  const totalMatches = new Set([...matches, ...bodyMatches]).size;
  const similarity = totalMatches / Math.max(skillTriggers.length, 1);

  return Math.min(Math.round(similarity * 30), 30);
}

/**
 * Calculate tool compatibility score (15 points max)
 */
function calculateToolScore(skill: SkillMetadata, agent: AgentMetadata): number {
  if (!skill.allowedTools || skill.allowedTools.length === 0) {
    return 15; // No tool requirements = compatible with all
  }

  if (!agent.tools || agent.tools.length === 0) {
    return 5; // Agent has no tools specified, partial compatibility
  }

  const agentToolsSet = new Set(agent.tools.map(t => t.toLowerCase()));
  const compatible = skill.allowedTools.filter(t =>
    agentToolsSet.has(t.toLowerCase())
  );

  const compatibility = compatible.length / skill.allowedTools.length;
  return Math.round(compatibility * 15);
}

/**
 * Calculate related skills score (15 points max)
 */
function calculateRelatedScore(skill: SkillMetadata, agent: AgentMetadata): number {
  const agentSkills = agent.skills.map(s => s.toLowerCase());

  // Check if agent already references this skill
  if (agentSkills.includes(skill.name.toLowerCase())) {
    return -100; // Already has it, don't recommend
  }

  // Check for sibling skills (same prefix)
  const skillPrefix = skill.name.split('-').slice(0, 2).join('-').toLowerCase();
  const hasSiblings = agentSkills.some(s => {
    const prefix = s.split('-').slice(0, 2).join('-').toLowerCase();
    return prefix === skillPrefix && s !== skill.name.toLowerCase();
  });

  if (hasSiblings) {
    return 10; // Has sibling skills
  }

  // Check if agent body mentions the skill domain
  const skillDomainKeyword = skill.domain.split('/').pop()?.toLowerCase() || '';
  if (skillDomainKeyword && agent.content.toLowerCase().includes(skillDomainKeyword)) {
    return 5;
  }

  return 0;
}

// =============================================================================
// Main Scoring and Recommendation Functions
// =============================================================================

/**
 * Calculate match score for a skill against an agent
 */
export function calculateSkillMatch(skill: SkillMetadata, agent: AgentMetadata): SkillRecommendation {
  const domainScore = calculateDomainScore(skill, agent);
  const triggerScore = calculateTriggerScore(skill, agent);
  const toolScore = calculateToolScore(skill, agent);
  const relatedScore = calculateRelatedScore(skill, agent);

  // If agent already has this skill, return with negative score
  if (relatedScore === -100) {
    return {
      skill: skill.name,
      path: skill.path,
      score: -100,
      confidence: 'LOW',
      reasons: ['Already referenced by agent'],
      action: 'Already in agent',
      breakdown: { domain: 0, triggers: 0, tools: 0, related: -100 },
    };
  }

  const totalScore = domainScore + triggerScore + toolScore + relatedScore;

  // Determine confidence
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  if (totalScore >= 70 && domainScore >= 30) {
    confidence = 'HIGH';
  } else if (totalScore >= 40) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  // Build reasons
  const reasons: string[] = [];
  if (domainScore >= 30) reasons.push(`Domain match (${domainScore}/40)`);
  else if (domainScore >= 20) reasons.push(`Related domain (${domainScore}/40)`);
  if (triggerScore >= 15) reasons.push(`Trigger overlap (${triggerScore}/30)`);
  if (toolScore >= 10) reasons.push(`Tool compatibility (${toolScore}/15)`);
  if (relatedScore >= 5) reasons.push(`Related skills (${relatedScore}/15)`);

  // Recommend action
  let action: string;
  if (confidence === 'HIGH') {
    action = skill.location === 'core'
      ? `Add to frontmatter skills: ${skill.name}`
      : `Add to Tier 3 triggers`;
  } else if (confidence === 'MEDIUM') {
    action = `Review for relevance`;
  } else {
    action = `Not recommended`;
  }

  return {
    skill: skill.name,
    path: skill.path,
    score: totalScore,
    confidence,
    reasons,
    action,
    breakdown: {
      domain: domainScore,
      triggers: triggerScore,
      tools: toolScore,
      related: relatedScore,
    },
  };
}

/**
 * Rank all skills for a given agent
 */
export function rankSkillsForAgent(agent: AgentMetadata): SkillRecommendation[] {
  const skills = getAllSkillMetadata();
  const scores = skills.map(skill => calculateSkillMatch(skill, agent));

  // Filter out already-referenced and sort by score descending
  return scores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Get categorized skill recommendations for an agent
 */
export function getSkillRecommendations(agent: AgentMetadata): {
  high: SkillRecommendation[];
  medium: SkillRecommendation[];
  low: SkillRecommendation[];
  alreadyHas: string[];
} {
  const skills = getAllSkillMetadata();
  const agentSkillsLower = agent.skills.map(s => s.toLowerCase());

  const alreadyHas = skills
    .filter(s => agentSkillsLower.includes(s.name.toLowerCase()))
    .map(s => s.name);

  const scores = rankSkillsForAgent(agent);

  return {
    high: scores.filter(s => s.confidence === 'HIGH'),
    medium: scores.filter(s => s.confidence === 'MEDIUM'),
    low: scores.filter(s => s.confidence === 'LOW'),
    alreadyHas,
  };
}

// =============================================================================
// Table Formatting
// =============================================================================

/**
 * Format skill recommendations as a table (ASCII-only for compatibility)
 */
export function formatSkillRecommendationTable(recommendations: SkillRecommendation[]): string {
  if (recommendations.length === 0) {
    return chalk.yellow('  No skill recommendations found.\n');
  }

  // Sort by confidence then score
  const CONFIDENCE_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sorted = [...recommendations].sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence];
    }
    return b.score - a.score;
  });

  // Build table manually (avoid cli-table3 dependency issues)
  const lines: string[] = [];

  // Header
  lines.push(chalk.gray('┌──────────────┬──────────────────────────────────┬───────┬────────────────────────────────────────────────┐'));
  lines.push(
    chalk.gray('│') +
    chalk.cyan.bold(' Confidence   ') +
    chalk.gray('│') +
    chalk.cyan.bold(' Skill                            ') +
    chalk.gray('│') +
    chalk.cyan.bold(' Score ') +
    chalk.gray('│') +
    chalk.cyan.bold(' Match Reasons                                  ') +
    chalk.gray('│')
  );
  lines.push(chalk.gray('├──────────────┼──────────────────────────────────┼───────┼────────────────────────────────────────────────┤'));

  // Rows
  for (const rec of sorted.slice(0, 15)) { // Limit to top 15
    const confStr = formatConfidence(rec.confidence).padEnd(12);
    const skillStr = rec.skill.slice(0, 32).padEnd(32);
    const scoreStr = rec.score.toString().padStart(5);
    const reasonsStr = rec.reasons.slice(0, 2).join('; ').slice(0, 46).padEnd(46);

    lines.push(
      chalk.gray('│') +
      ` ${confStr} ` +
      chalk.gray('│') +
      ` ${chalk.white(skillStr)} ` +
      chalk.gray('│') +
      ` ${chalk.white.bold(scoreStr)} ` +
      chalk.gray('│') +
      ` ${chalk.gray(reasonsStr)} ` +
      chalk.gray('│')
    );
  }

  lines.push(chalk.gray('└──────────────┴──────────────────────────────────┴───────┴────────────────────────────────────────────────┘'));

  if (sorted.length > 15) {
    lines.push(chalk.gray(`  ... and ${sorted.length - 15} more skills (showing top 15)`));
  }

  return '\n' + lines.join('\n') + '\n';
}

/**
 * Format confidence level with color
 */
function formatConfidence(confidence: 'HIGH' | 'MEDIUM' | 'LOW'): string {
  switch (confidence) {
    case 'HIGH':
      return chalk.green.bold('● HIGH');
    case 'MEDIUM':
      return chalk.yellow.bold('▲ MEDIUM');
    case 'LOW':
      return chalk.blue('○ LOW');
  }
}

// =============================================================================
// Exports for CLI
// =============================================================================

export {
  getProjectRoot,
  extractTriggers,
  fuzzyMatch,
};
