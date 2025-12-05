/**
 * Phase 4: Skill Integration Validation
 *
 * AUTO-FIXABLE: Yes (path replacement, library skill removal)
 *
 * Checks:
 * - Uses gateway skills in frontmatter (e.g., gateway-frontend)
 * - Does NOT use direct library paths in frontmatter
 * - Does NOT use library skill names in frontmatter (must be in body)
 * - Has "Skill References" section in body
 * - References load on-demand pattern
 * - Tool appropriateness by type (required/forbidden/recommended)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  AgentInfo,
  AuditPhaseResult,
  AuditIssue,
  FixSuggestion,
  REQUIRED_TOOLS_BY_TYPE,
  FORBIDDEN_TOOLS_BY_TYPE,
  RECOMMENDED_TOOLS_BY_TYPE,
} from '../types.js';
import { findCoreSkills, findLibrarySkills } from '../skill-checker.js';
import { recommendGateways } from '../skill-recommender.js';
import { generateSkillReferences, formatSkillReferencesTable } from '../skill-references-generator.js';
import { getRepoRoot } from '../agent-finder.js';

export const PHASE_NUMBER = 4;
export const PHASE_NAME = 'Skill Integration';
export const AUTO_FIXABLE = true;

/**
 * Gateway skills that should be used instead of direct paths
 */
const GATEWAY_SKILLS = [
  'gateway-frontend',
  'gateway-backend',
  'gateway-testing',
  'gateway-security',
  'gateway-mcp-tools',
  'gateway-integrations',
];

/**
 * Map of library path patterns to gateway recommendations
 */
const LIBRARY_TO_GATEWAY_MAP: Record<string, string> = {
  'frontend': 'gateway-frontend',
  'react': 'gateway-frontend',
  'state': 'gateway-frontend',
  'ui': 'gateway-frontend',
  'backend': 'gateway-backend',
  'go': 'gateway-backend',
  'api': 'gateway-backend',
  'aws': 'gateway-backend',
  'testing': 'gateway-testing',
  'test': 'gateway-testing',
  'e2e': 'gateway-testing',
  'security': 'gateway-security',
  'auth': 'gateway-security',
  'mcp': 'gateway-mcp-tools',
  'linear': 'gateway-mcp-tools',
  'integration': 'gateway-integrations',
};

/**
 * Normalize skills field to string (handles arrays, objects, etc.)
 */
function normalizeSkills(skills: unknown): string {
  if (typeof skills === 'string') {
    return skills;
  }
  if (Array.isArray(skills)) {
    return skills.join(', ');
  }
  if (skills && typeof skills === 'object') {
    return JSON.stringify(skills);
  }
  return '';
}

/**
 * Check if skills field contains direct library paths
 */
function findDirectLibraryPaths(skills: string): string[] {
  if (typeof skills !== 'string') {
    return [];
  }

  const paths: string[] = [];

  // Look for .claude/skill-library paths
  const libraryPattern = /\.claude\/skill-library\/[^\s,]+/g;
  const matches = skills.match(libraryPattern);

  if (matches) {
    paths.push(...matches);
  }

  return paths;
}

/**
 * Suggest gateway skill based on library path
 */
function suggestGateway(libraryPath: string): string | null {
  const lowerPath = libraryPath.toLowerCase();

  for (const [keyword, gateway] of Object.entries(LIBRARY_TO_GATEWAY_MAP)) {
    if (lowerPath.includes(keyword)) {
      return gateway;
    }
  }

  return null;
}

/**
 * Check if body has skill references section
 */
function hasSkillReferencesSection(body: string): boolean {
  return /##\s*Skill\s+References/i.test(body);
}

/**
 * Parse skill references from body "Skill References" section
 *
 * Extracts file paths from markdown table like:
 * | Task | Skill to Read |
 * |------|---------------|
 * | React state | `.claude/skill-library/.../SKILL.md` |
 */
function parseSkillReferencesFromBody(body: string): Array<{ task: string; skillPath: string }> {
  const references: Array<{ task: string; skillPath: string }> = [];

  // Find the Skill References section
  const sectionMatch = body.match(/##\s*Skill\s+References[\s\S]*?(?=##|$)/i);
  if (!sectionMatch) {
    return references;
  }

  const section = sectionMatch[0];

  // Extract table rows (| Task | `.claude/skill-library/...` |)
  const rowPattern = /\|\s*([^|]+)\s*\|\s*`([^`]+)`\s*\|/g;
  let match;

  while ((match = rowPattern.exec(section)) !== null) {
    const task = match[1].trim();
    const skillPath = match[2].trim();

    // Skip header rows and placeholders
    if (task.toLowerCase() === 'task' || task.startsWith('[')) {
      continue;
    }

    references.push({ task, skillPath });
  }

  return references;
}

/**
 * Check if body mentions load on-demand pattern
 */
function hasLoadOnDemandPattern(body: string): boolean {
  const patterns = [
    /Load\s+On-Demand/i,
    /on-demand/i,
    /just-in-time/i,
    /Read\s+tool\s+with.*path/i,
    /gateway.*skill/i,
  ];

  return patterns.some((p) => p.test(body));
}

/**
 * Parse tools from comma-separated string
 */
function parseTools(tools: string | undefined): string[] {
  if (!tools) {
    return [];
  }
  return tools
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Parse skill names from comma-separated string
 */
function parseSkillNames(skills: string | undefined): string[] {
  if (!skills) {
    return [];
  }
  return skills
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.includes('/')) // Filter out paths
    .filter((s) => !s.startsWith('.claude')); // Filter out full paths
}

/**
 * Cache for library skill names to avoid repeated filesystem scans
 */
let librarySkillsCache: Set<string> | null = null;
let coreSkillsCache: Set<string> | null = null;

/**
 * Get library skill names (cached)
 */
function getLibrarySkillNames(): Set<string> {
  if (librarySkillsCache === null) {
    librarySkillsCache = new Set(findLibrarySkills());
  }
  return librarySkillsCache;
}

/**
 * Get core skill names (cached)
 */
function getCoreSkillNames(): Set<string> {
  if (coreSkillsCache === null) {
    coreSkillsCache = new Set(findCoreSkills());
  }
  return coreSkillsCache;
}

/**
 * Check if a skill name is a library skill (not allowed in frontmatter)
 *
 * Valid in frontmatter: gateway-* skills + core skills from .claude/skills/
 * Invalid in frontmatter: any skill name that exists in .claude/skill-library/
 */
function isLibrarySkill(skillName: string): boolean {
  // Gateway skills are always valid
  if (skillName.startsWith('gateway-')) {
    return false;
  }

  // Check if it exists in core skills (valid)
  const coreSkills = getCoreSkillNames();
  if (coreSkills.has(skillName)) {
    return false;
  }

  // Check if it exists in library skills (invalid)
  const librarySkills = getLibrarySkillNames();
  return librarySkills.has(skillName);
}

/**
 * Find library skill names in frontmatter that should be in body instead
 */
function findLibrarySkillsInFrontmatter(skills: string): string[] {
  const skillNames = parseSkillNames(skills);
  return skillNames.filter((name) => isLibrarySkill(name));
}

/**
 * Run Phase 4 audit on an agent
 */
export function runPhase4(agent: AgentInfo): AuditPhaseResult {
  const issues: AuditIssue[] = [];
  const suggestions: FixSuggestion[] = [];

  const skills = normalizeSkills(agent.frontmatter.skills);

  // Check 1: Multi-gateway recommendation (Feature 8)
  // Determine primary and secondary gateways
  const existingSkills = parseSkillNames(skills);
  const gatewayRecommendations = recommendGateways(agent);

  for (const { gateway, isPrimary, reason } of gatewayRecommendations) {
    if (!existingSkills.includes(gateway)) {
      issues.push({
        severity: isPrimary ? 'warning' : 'info',
        message: isPrimary
          ? `Missing primary gateway skill: "${gateway}"`
          : `Consider adding secondary gateway: "${gateway}"`,
        details: reason,
      });

      suggestions.push({
        id: `phase4-add-gateway-${gateway}`,
        phase: 4,
        description: `Add ${gateway} to skills`,
        autoFixable: true,
        currentValue: skills || '(empty)',
        suggestedValue: skills ? `${skills}, ${gateway}` : gateway,
      });
    }
  }

  // Check 2: Direct library paths in frontmatter
  const directPaths = findDirectLibraryPaths(skills);
  if (directPaths.length > 0) {
    issues.push({
      severity: 'error',
      message: 'Direct library paths in frontmatter skills field',
      details: `Found: ${directPaths.join(', ')}`,
    });

    for (const path of directPaths) {
      const suggestedGateway = suggestGateway(path);
      // Generate unique ID based on last path segment
      const pathId = path.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || 'path';
      suggestions.push({
        id: `phase4-replace-path-${pathId}`,
        phase: 4,
        description: `Replace library path with gateway skill`,
        autoFixable: true,
        currentValue: path,
        suggestedValue: suggestedGateway || 'gateway-frontend',
      });
    }
  }

  // Check 3: Skill References section in body (Feature 8: Real skill generation)
  if (!hasSkillReferencesSection(agent.body)) {
    issues.push({
      severity: 'warning',
      message: 'Missing "Skill References" section in body',
      details: 'Agents should document which skills to load for specific tasks',
    });

    // Generate actual skill references from gateway(s)
    const refs = generateSkillReferences(agent);
    const tableContent = formatSkillReferencesTable(refs);

    suggestions.push({
      id: 'phase4-references-section',
      phase: 4,
      description: 'Add Skill References section with gateway skills',
      autoFixable: true,  // NOW auto-fixable with real content
      suggestedValue: `## Skill References (Load On-Demand via Gateway)

**IMPORTANT**: Before implementing, consult the relevant gateway skill.

${tableContent}`,
    });
  }

  // Check 3b: Validate existing skill references (Feature 8: Broken path detection)
  const existingRefs = parseSkillReferencesFromBody(agent.body);
  const repoRoot = getRepoRoot();
  const coreSkills = getCoreSkillNames();

  for (const ref of existingRefs) {
    // Check if it's a skill name (no path separators) vs a file path
    const isSkillName = !ref.skillPath.includes('/') && !ref.skillPath.startsWith('.');

    if (isSkillName) {
      // Validate as skill name - check if it exists in core skills or is a valid gateway
      const isGateway = ref.skillPath.startsWith('gateway-');
      const isCoreSkill = coreSkills.has(ref.skillPath);

      if (isGateway) {
        // Gateway skills - validate against known gateways
        if (!GATEWAY_SKILLS.includes(ref.skillPath)) {
          issues.push({
            severity: 'warning',
            message: `Unknown gateway skill in body: "${ref.skillPath}"`,
            details: `Valid gateways: ${GATEWAY_SKILLS.join(', ')}`,
          });
        }
        // Valid gateway - no error
      } else if (!isCoreSkill) {
        // Not a gateway and not a core skill - may be invalid
        issues.push({
          severity: 'warning',
          message: `Skill reference "${ref.skillPath}" not found in core skills`,
          details: 'Consider using a gateway skill or full path to skill library',
        });
      }
    } else {
      // Validate as file path
      const fullPath = path.join(repoRoot, ref.skillPath);
      if (!fs.existsSync(fullPath)) {
        issues.push({
          severity: 'error',
          message: `Broken skill reference: "${ref.skillPath}"`,
          details: 'Path does not exist in skill library',
        });
      }
    }
  }

  // Check 4: Load on-demand pattern mentioned
  if (!hasLoadOnDemandPattern(agent.body)) {
    issues.push({
      severity: 'info',
      message: 'Load on-demand pattern not explicitly mentioned',
      details: 'Consider documenting the just-in-time skill loading workflow',
    });
  }

  // Check 5: Verify gateway skills listed are valid
  for (const gateway of GATEWAY_SKILLS) {
    if (skills.includes(gateway)) {
      // Valid gateway found - good
      break;
    }
  }

  // Check for invalid gateway names
  const gatewayPattern = /gateway-[\w-]+/g;
  const gatewayMatches = skills.match(gatewayPattern) || [];
  for (const match of gatewayMatches) {
    if (!GATEWAY_SKILLS.includes(match)) {
      issues.push({
        severity: 'warning',
        message: `Unknown gateway skill: ${match}`,
        details: `Valid gateways: ${GATEWAY_SKILLS.join(', ')}`,
      });
    }
  }

  // Tool Appropriateness Checks (Feature 5)
  const agentTools = parseTools(agent.frontmatter.tools);
  const agentType = agent.frontmatter.type || agent.category;

  // Check 6: Required tools present
  const requiredTools = REQUIRED_TOOLS_BY_TYPE[agentType] || [];
  for (const tool of requiredTools) {
    if (!agentTools.includes(tool)) {
      issues.push({
        severity: 'error',
        message: `Missing required tool "${tool}" for type "${agentType}"`,
        details: `Type "${agentType}" requires: ${requiredTools.join(', ')}`,
      });

      suggestions.push({
        id: `phase4-add-tool-${tool}`,
        phase: 4,
        description: `Add required tool "${tool}"`,
        autoFixable: true,
        currentValue: agent.frontmatter.tools || '(empty)',
        suggestedValue: agent.frontmatter.tools
          ? `${agent.frontmatter.tools}, ${tool}`
          : tool,
      });
    }
  }

  // Check 7: Forbidden tools absent
  const forbiddenTools = FORBIDDEN_TOOLS_BY_TYPE[agentType] || [];
  for (const tool of forbiddenTools) {
    if (agentTools.includes(tool)) {
      issues.push({
        severity: 'error',
        message: `Forbidden tool "${tool}" for type "${agentType}"`,
        details: `Type "${agentType}" (reviewers/analysts) should be read-only`,
      });

      suggestions.push({
        id: `phase4-remove-tool-${tool}`,
        phase: 4,
        description: `Remove forbidden tool "${tool}"`,
        autoFixable: true,
        currentValue: agent.frontmatter.tools,
        suggestedValue: agentTools.filter((t) => t !== tool).join(', '),
      });
    }
  }

  // Check 8: Recommended tools suggested
  const recommendedTools = RECOMMENDED_TOOLS_BY_TYPE[agentType] || [];
  for (const tool of recommendedTools) {
    if (!agentTools.includes(tool)) {
      issues.push({
        severity: 'info',
        message: `Missing recommended tool "${tool}" for type "${agentType}"`,
        details: `Consider adding ${tool} for better ${agentType} workflow`,
      });

      suggestions.push({
        id: `phase4-recommend-tool-${tool}`,
        phase: 4,
        description: `Add recommended tool "${tool}"`,
        autoFixable: true,
        currentValue: agent.frontmatter.tools || '(empty)',
        suggestedValue: agent.frontmatter.tools
          ? `${agent.frontmatter.tools}, ${tool}`
          : tool,
      });
    }
  }

  // Check 9: Library skill names in frontmatter
  // Library skills from .claude/skill-library/ should NOT be in frontmatter
  // They should be referenced in the body "Skill References" section instead
  const librarySkillsInFrontmatter = findLibrarySkillsInFrontmatter(skills);
  if (librarySkillsInFrontmatter.length > 0) {
    for (const librarySkill of librarySkillsInFrontmatter) {
      issues.push({
        severity: 'error',
        message: `Library skill "${librarySkill}" should not be in frontmatter`,
        details: `Library skills belong in body "Skill References" section, not frontmatter. Only gateway-* skills and core skills from .claude/skills/ are allowed in frontmatter.`,
      });

      // Calculate the new skills value without this library skill
      const currentSkillNames = parseSkillNames(skills);
      const newSkillNames = currentSkillNames.filter((s) => s !== librarySkill);

      suggestions.push({
        id: `phase4-remove-library-skill-${librarySkill}`,
        phase: 4,
        description: `Remove library skill "${librarySkill}" from frontmatter`,
        autoFixable: true,
        currentValue: skills,
        suggestedValue: newSkillNames.join(', ') || '(empty)',
      });
    }
  }

  return {
    phase: PHASE_NUMBER,
    name: PHASE_NAME,
    passed: issues.filter((i) => i.severity === 'error').length === 0,
    autoFixable: AUTO_FIXABLE,
    issues,
    suggestions,
  };
}
