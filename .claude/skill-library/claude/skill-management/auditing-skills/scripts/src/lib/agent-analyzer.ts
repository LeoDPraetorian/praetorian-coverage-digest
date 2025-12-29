// src/lib/agent-analyzer.ts
/**
 * Agent Analyzer - Extract metadata from agents for skill-to-agent matching
 *
 * Used by Phase 15 (Agent Recommendation) to determine which agents
 * should incorporate a given skill.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';
import { findProjectRoot } from '@chariot/lib';
import chalk from 'chalk';
import Table from 'cli-table3';

const PROJECT_ROOT = findProjectRoot();
const AGENTS_DIR = join(PROJECT_ROOT, '.claude/agents');

export interface AgentMetadata {
  name: string;
  path: string;
  category: string;
  description: string;
  tools: string[];
  skills: string[];
  type: string;
  content: string;
}

export interface SkillMetadata {
  name: string;
  path: string;
  description: string;
  allowedTools: string[];
  domain: string;
}

export interface MatchScore {
  agent: string;
  score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasons: string[];
  action: string;
  breakdown: {
    domain: number;
    triggers: number;
    tools: number;
    similar: number;
  };
}

// Domain hierarchy for matching
const DOMAIN_HIERARCHY: Record<string, string[]> = {
  development: ['frontend', 'backend', 'python'],
  testing: ['frontend-testing', 'backend-testing', 'e2e'],
  quality: ['review', 'analysis'],
  architecture: ['frontend-architecture', 'backend-architecture', 'security'],
  claude: ['skill-management', 'agent-management'],
};

// Adjacent domain pairs that can match with reduced score
const ADJACENT_DOMAINS = [
  ['development', 'testing'],
  ['development', 'quality'],
  ['architecture', 'development'],
  ['security', 'testing'],
  ['testing', 'quality'],
];

// Synonym groups for trigger matching
const SYNONYMS = [
  ['test', 'testing', 'tests', 'e2e', 'unit'],
  ['component', 'components', 'UI', 'interface'],
  ['api', 'endpoint', 'REST', 'graphql'],
  ['state', 'data', 'store', 'query'],
  ['debug', 'debugging', 'troubleshoot', 'fix'],
  ['style', 'styling', 'CSS', 'tailwind'],
  ['react', 'frontend', 'tsx', 'jsx'],
  ['go', 'golang', 'backend'],
  ['python', 'py', 'script'],
  ['security', 'auth', 'authentication', 'authorization'],
];

/**
 * Extract metadata from a single agent file
 */
export function extractAgentMetadata(agentPath: string): AgentMetadata | null {
  if (!existsSync(agentPath)) {
    return null;
  }

  try {
    const content = readFileSync(agentPath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    // Parse tools (comma-separated string)
    const tools = frontmatter.tools
      ? frontmatter.tools.split(',').map((t: string) => t.trim())
      : [];

    // Parse skills (comma-separated string)
    const skills = frontmatter.skills
      ? frontmatter.skills.split(',').map((s: string) => s.trim())
      : [];

    // Extract category from path
    const pathParts = agentPath.split('/');
    const agentsIndex = pathParts.indexOf('agents');
    const category = agentsIndex >= 0 ? pathParts[agentsIndex + 1] : 'unknown';

    return {
      name: frontmatter.name || basename(agentPath, '.md'),
      path: agentPath,
      category,
      description: frontmatter.description || '',
      tools,
      skills,
      type: frontmatter.type || category,
      content: body,
    };
  } catch (error) {
    // YAML parsing errors are common due to \n in descriptions
    // Silently skip malformed agent files
    return null;
  }
}

/**
 * Get all agent metadata
 * Note: Agents with YAML parsing errors (e.g., \n in descriptions) are skipped
 */
export function getAllAgentMetadata(): AgentMetadata[] {
  const agents: AgentMetadata[] = [];

  if (!existsSync(AGENTS_DIR)) {
    return agents;
  }

  const categories = readdirSync(AGENTS_DIR);

  for (const category of categories) {
    const categoryPath = join(AGENTS_DIR, category);
    const stat = statSync(categoryPath);

    if (!stat.isDirectory() || category.startsWith('.')) {
      continue;
    }

    const files = readdirSync(categoryPath);

    for (const file of files) {
      if (!file.endsWith('.md')) {
        continue;
      }

      const agentPath = join(categoryPath, file);
      const metadata = extractAgentMetadata(agentPath);

      if (metadata) {
        agents.push(metadata);
      }
    }
  }

  return agents;
}

/**
 * Extract domain from skill path
 */
export function extractDomain(path: string): string {
  // Path format: .claude/skill-library/{category}/{domain}/{skill}/SKILL.md
  const parts = path.split('/');
  const libraryIndex = parts.indexOf('skill-library');

  if (libraryIndex >= 0 && parts.length > libraryIndex + 2) {
    return `${parts[libraryIndex + 1]}/${parts[libraryIndex + 2]}`;
  }

  // Core skill: .claude/skills/{skill}/SKILL.md
  const skillsIndex = parts.indexOf('skills');
  if (skillsIndex >= 0) {
    return 'core';
  }

  return 'unknown';
}

/**
 * Extract triggers from description
 */
export function extractTriggers(description: string): string[] {
  // Extract key phrases after "Use when"
  const useWhenMatch = description.match(/Use when (.+?)(?:\s*[-–—]|$)/i);
  if (!useWhenMatch) {
    // Fallback: split on common separators
    return description
      .split(/[,;]/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 2);
  }

  const triggers = useWhenMatch[1]
    .split(/[,;]/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 2);

  return triggers;
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
 * Check if one domain is parent of another
 */
function isParentDomain(parent: string, child: string): boolean {
  const parentCat = parent.split('/')[0];
  const childParts = child.split('/');

  // Check if child is in parent's hierarchy
  if (DOMAIN_HIERARCHY[parentCat]) {
    return DOMAIN_HIERARCHY[parentCat].some(sub => childParts.some(p => p.includes(sub)));
  }

  return false;
}

/**
 * Calculate domain match score (40 points max)
 */
export function calculateDomainScore(skill: SkillMetadata, agent: AgentMetadata): number {
  const skillDomain = skill.domain;
  const agentDomain = agent.category;

  // Exact category match
  if (skillDomain.includes(agentDomain) || agentDomain.includes(skillDomain.split('/')[0])) {
    return 40;
  }

  // Parent/child relationship
  if (isParentDomain(skillDomain, agentDomain) || isParentDomain(agentDomain, skillDomain)) {
    return 30;
  }

  // Adjacent domains
  if (areAdjacentDomains(skillDomain, agentDomain)) {
    return 20;
  }

  // Check if agent description mentions skill domain
  const skillDomainParts = skillDomain.split('/');
  if (skillDomainParts.some(part => agent.description.toLowerCase().includes(part))) {
    return 15;
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
  const matches = skillTriggers.filter(st => agentTriggers.some(at => fuzzyMatch(st, at)));

  // Jaccard-like similarity
  const similarity = matches.length / Math.max(skillTriggers.length, 1);
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
    return 0; // Agent has no tools
  }

  const agentToolsSet = new Set(agent.tools.map(t => t.toLowerCase()));
  const compatible = skill.allowedTools.filter(t => agentToolsSet.has(t.toLowerCase()));

  const compatibility = compatible.length / skill.allowedTools.length;
  return Math.round(compatibility * 15);
}

/**
 * Calculate similar skills score (15 points max)
 */
function calculateSimilarSkillsScore(skill: SkillMetadata, agent: AgentMetadata): number {
  const skillCategory = skill.domain;

  // Get skills agent already references
  const agentSkills = agent.skills;

  // Check if any are in same category or have same prefix
  const skillPrefix = skill.name.split('-').slice(0, 2).join('-');

  let score = 0;

  // Check for skills in same domain
  if (agentSkills.some(s => s.includes(skillCategory.split('/').pop() || ''))) {
    score += 5;
  }

  // Check for sibling skills (same prefix)
  const siblings = agentSkills.filter(s => {
    const prefix = s.split('-').slice(0, 2).join('-');
    return prefix === skillPrefix;
  });

  score += Math.min(siblings.length * 5, 10);

  return Math.min(score, 15);
}

/**
 * Calculate match score for a skill against an agent
 */
export function calculateMatchScore(skill: SkillMetadata, agent: AgentMetadata): MatchScore {
  const domainScore = calculateDomainScore(skill, agent);
  const triggerScore = calculateTriggerScore(skill, agent);
  const toolScore = calculateToolScore(skill, agent);
  const similarScore = calculateSimilarSkillsScore(skill, agent);

  const totalScore = domainScore + triggerScore + toolScore + similarScore;

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
  if (triggerScore >= 15) reasons.push(`Trigger overlap (${triggerScore}/30)`);
  if (toolScore >= 10) reasons.push(`Tool compatibility (${toolScore}/15)`);
  if (similarScore >= 5) reasons.push(`Similar skills (${similarScore}/15)`);

  // Recommend action
  let action: string;
  if (confidence === 'HIGH') {
    if (agent.name.includes('gateway')) {
      action = `Add to ${agent.name} routing table`;
    } else {
      action = `Reference in ${agent.name} instructions`;
    }
  } else if (confidence === 'MEDIUM') {
    action = `Consider adding to ${agent.name} (review recommended)`;
  } else {
    action = `Not recommended for ${agent.name}`;
  }

  return {
    agent: agent.name,
    score: totalScore,
    confidence,
    reasons,
    action,
    breakdown: {
      domain: domainScore,
      triggers: triggerScore,
      tools: toolScore,
      similar: similarScore,
    },
  };
}

/**
 * Rank all agents for a given skill
 */
export function rankAgentsForSkill(skill: SkillMetadata): MatchScore[] {
  const agents = getAllAgentMetadata();
  const scores = agents.map(agent => calculateMatchScore(skill, agent));

  // Sort by score descending
  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Check if a skill is orphaned (no discovery path)
 */
export function isOrphanedSkill(skill: SkillMetadata): boolean {
  const agents = getAllAgentMetadata();

  // Check if any agent references this skill
  const inAgent = agents.some(
    a => a.skills.includes(skill.name) || a.content.includes(skill.name)
  );

  // Core skills are always discoverable
  const isCoreSkill = skill.path.includes('/skills/') && !skill.path.includes('/skill-library/');

  // Check if skill is mentioned in any gateway (core skills starting with gateway-)
  const inGateway = isSkillInGateway(skill.name);

  // Check if skill is mentioned in any router skill (e.g., managing-skills)
  const inRouter = isSkillInRouterSkill(skill.name);

  return !inAgent && !isCoreSkill && !inGateway && !inRouter;
}

/**
 * Check if a skill is mentioned in any gateway routing table
 */
function isSkillInGateway(skillName: string): boolean {
  const gatewaysDir = join(PROJECT_ROOT, '.claude/skills');

  if (!existsSync(gatewaysDir)) {
    return false;
  }

  try {
    const entries = readdirSync(gatewaysDir);

    for (const entry of entries) {
      if (!entry.startsWith('gateway-')) {
        continue;
      }

      const gatewayPath = join(gatewaysDir, entry, 'SKILL.md');
      if (!existsSync(gatewayPath)) {
        continue;
      }

      const content = readFileSync(gatewayPath, 'utf-8');
      if (content.includes(skillName)) {
        return true;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return false;
}

/**
 * Router skills that provide discovery paths (like gateways but not named gateway-*)
 */
const ROUTER_SKILLS = ['managing-skills'];

/**
 * Check if a skill is mentioned in any router skill (non-gateway routers)
 */
function isSkillInRouterSkill(skillName: string): boolean {
  const skillsDir = join(PROJECT_ROOT, '.claude/skills');

  if (!existsSync(skillsDir)) {
    return false;
  }

  try {
    for (const routerName of ROUTER_SKILLS) {
      const routerPath = join(skillsDir, routerName, 'SKILL.md');
      if (!existsSync(routerPath)) {
        continue;
      }

      const content = readFileSync(routerPath, 'utf-8');
      if (content.includes(skillName)) {
        return true;
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return false;
}

/**
 * Get agent recommendation summary for a skill
 */
export function getAgentRecommendations(
  skill: SkillMetadata
): {
  high: MatchScore[];
  medium: MatchScore[];
  low: MatchScore[];
  isOrphaned: boolean;
} {
  const scores = rankAgentsForSkill(skill);

  return {
    high: scores.filter(s => s.confidence === 'HIGH'),
    medium: scores.filter(s => s.confidence === 'MEDIUM'),
    low: scores.filter(s => s.confidence === 'LOW'),
    isOrphaned: isOrphanedSkill(skill),
  };
}

/**
 * Format category with symbol and color (matching audit table severity style)
 * Uses simple geometric Unicode symbols for consistent terminal width
 */
function formatCategoryBadge(category: string): string {
  switch (category) {
    case 'development':
      return chalk.green.bold('● DEV');
    case 'testing':
      return chalk.blue.bold('● TEST');
    case 'architecture':
      return chalk.magenta.bold('● ARCH');
    case 'quality':
      return chalk.yellow.bold('● QUALITY');
    case 'analysis':
      return chalk.cyan.bold('● ANALYSIS');
    case 'orchestrator':
      return chalk.red.bold('● ORCH');
    case 'mcp-tools':
      return chalk.gray.bold('○ MCP');
    case 'research':
      return chalk.white.bold('○ RESEARCH');
    default:
      return chalk.gray(`○ ${category.toUpperCase().substring(0, 8)}`);
  }
}

/**
 * Format agent list for Claude semantic evaluation
 * @deprecated Use formatAgentDataForAnalysis() + renderAgentTableWithScores() instead
 */
export function formatAgentListForClaudeEvaluation(
  skill: SkillMetadata,
  agents?: AgentMetadata[]
): string {
  // Redirect to new two-phase pattern
  return formatAgentDataForAnalysis(skill, agents);
}

/**
 * Phase 1: Output skill + agent data for Claude to analyze
 * Returns JSON that Claude can read and score
 */
export function formatAgentDataForAnalysis(
  skill: SkillMetadata,
  agents?: AgentMetadata[]
): string {
  const agentList = agents || getAllAgentMetadata();

  // Sort agents by category for consistent output
  const sortedAgents = [...agentList].sort((a, b) => a.category.localeCompare(b.category));

  const data = {
    skill: {
      name: skill.name,
      description: skill.description,
      domain: skill.domain,
    },
    agents: sortedAgents.map(a => ({
      name: a.name,
      category: a.category,
      description: a.description || '(see agent file for details)',
    })),
    instructions: {
      task: 'Score each agent 0-40 based on how well this skill aligns with the agent purpose',
      scoring: {
        40: 'Directly aligned - agent primary purpose matches skill',
        30: 'Related - agent would benefit from this skill',
        20: 'Tangential - possible but not primary use case',
        10: 'Weak - minimal connection',
        0: 'None - no relevance',
      },
      output_format: 'agent-name:score (comma-separated, only agents with score >= 20)',
      example: 'frontend-developer:40,frontend-architect:30,security-lead:20',
    },
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Phase 2: Render agent table with Claude-provided scores
 * Takes comma-separated scores string: "agent1:40,agent2:30,agent3:0"
 */
export function renderAgentTableWithScores(
  skill: SkillMetadata,
  scoresInput: string,
  agents?: AgentMetadata[]
): string {
  const agentList = agents || getAllAgentMetadata();

  // Parse scores string into map
  const scoreMap = new Map<string, number>();
  if (scoresInput) {
    scoresInput.split(',').forEach(pair => {
      const [name, score] = pair.trim().split(':');
      if (name && score) {
        scoreMap.set(name.trim(), parseInt(score.trim(), 10));
      }
    });
  }

  // Build scored agent list
  interface ScoredAgent {
    name: string;
    category: string;
    description: string;
    score: number;
  }

  const scoredAgents: ScoredAgent[] = agentList
    .map(a => ({
      name: a.name,
      category: a.category,
      description: a.description || '(see agent file)',
      score: scoreMap.get(a.name) ?? 0,
    }))
    .filter(a => a.score >= 20)  // Only show relevant agents
    .sort((a, b) => b.score - a.score);  // Sort by score descending

  // Create table
  const table = new (Table as any)({
    head: [
      chalk.bold('Score'),
      chalk.bold('Agent'),
      chalk.bold('Category'),
      chalk.bold('Description'),
    ],
    colWidths: [10, 30, 14, 80],
    wordWrap: true,
    style: {
      head: ['cyan'],
      border: ['gray'],
      compact: false,
    },
    chars: {
      'top': '═', 'top-mid': '╤', 'top-left': '╔', 'top-right': '╗',
      'bottom': '═', 'bottom-mid': '╧', 'bottom-left': '╚', 'bottom-right': '╝',
      'left': '║', 'left-mid': '╟', 'mid': '─', 'mid-mid': '┼',
      'right': '║', 'right-mid': '╢', 'middle': '│',
    },
  });

  // Format score with color
  const formatScore = (score: number): string => {
    if (score >= 40) return chalk.green.bold(`● ${score}`);
    if (score >= 30) return chalk.yellow.bold(`▲ ${score}`);
    return chalk.blue(`○ ${score}`);
  };

  // Truncate description
  const truncateDesc = (desc: string): string => {
    if (!desc) return chalk.gray.italic('(see agent file)');
    const firstSentence = desc.split(/[.!?]/)[0];
    if (firstSentence.length <= 75) return firstSentence;
    return desc.substring(0, 72) + '...';
  };

  for (const agent of scoredAgents) {
    table.push([
      formatScore(agent.score),
      chalk.white.bold(agent.name),
      formatCategoryBadge(agent.category),
      truncateDesc(agent.description),
    ]);
  }

  // Build output
  let output = '\n';
  output += chalk.bold.underline('Agent Recommendations for: ') + chalk.cyan(skill.name) + '\n\n';

  if (scoredAgents.length === 0) {
    output += chalk.yellow('No agents scored >= 20. This skill may be highly specialized.\n');
  } else {
    output += table.toString() + '\n';
    output += chalk.gray(`\nShowing ${scoredAgents.length} agent(s) with score >= 20\n`);
  }

  return output;
}

/**
 * Format agent recommendations as a beautiful table
 * Similar to audit table but for agent matching scores
 * @deprecated Use formatAgentListForClaudeEvaluation instead
 */
export function formatRecommendationTable(matches: MatchScore[]): string {
  // Sort by confidence (HIGH → MEDIUM → LOW) then by score
  const CONFIDENCE_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const sorted = [...matches].sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence];
    }
    return b.score - a.score; // Higher score first
  });

  const table = new (Table as any)({
    head: [
      chalk.bold('Confidence'),
      chalk.bold('Agent'),
      chalk.bold('Score'),
      chalk.bold('Match Reasons'),
      chalk.bold('Recommended Action')
    ],
    colWidths: [14, 30, 8, 50, 50], // Fixed widths for consistency
    wordWrap: true,
    style: {
      head: ['cyan'],
      border: ['gray'],
      compact: false,
    },
    chars: {
      // Unicode box drawing (beautiful!)
      'top': '═',
      'top-mid': '╤',
      'top-left': '╔',
      'top-right': '╗',
      'bottom': '═',
      'bottom-mid': '╧',
      'bottom-left': '╚',
      'bottom-right': '╝',
      'left': '║',
      'left-mid': '╟',
      'mid': '─',
      'mid-mid': '┼',
      'right': '║',
      'right-mid': '╢',
      'middle': '│'
    }
  });

  // Add rows with color-coded confidence
  for (const match of sorted) {
    table.push([
      formatConfidence(match.confidence),
      chalk.gray(match.agent),
      chalk.white.bold(match.score.toString()),
      match.reasons.join('; '),
      chalk.italic(match.action)
    ]);
  }

  return '\n' + table.toString() + '\n';
}

/**
 * Format confidence level with symbol and color (deterministic)
 * Uses simple geometric Unicode symbols for consistent terminal width
 * (Emojis like 🟢 🟡 🔵 cause alignment issues due to variable rendering)
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
