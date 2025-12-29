/**
 * Gateway Updater
 *
 * Automatically updates gateway skills when library skills are created, updated, or migrated.
 * Maintains synchronization between library skills and their gateway routing tables.
 */

import * as fs from 'fs';
import * as path from 'path';
import { findProjectRoot } from '@chariot/lib';

const PROJECT_ROOT = findProjectRoot();

export interface GatewayEntry {
  title: string;        // e.g., "Frontend TanStack"
  path: string;         // e.g., ".claude/skill-library/.../SKILL.md"
  description: string;  // e.g., "TanStack Query for server state"
}

/**
 * Category to Gateway mapping
 * Maps library category paths to gateway skill names
 */
const CATEGORY_TO_GATEWAY: Record<string, string> = {
  'development/frontend': 'gateway-frontend',
  'development/backend': 'gateway-backend',
  'testing': 'gateway-testing',
  'security': 'gateway-security',
  'claude/mcp-tools': 'gateway-mcp-tools',
  'development/integrations': 'gateway-integrations',
};

/**
 * Detect which gateway skill should be updated for a given category
 *
 * @param category - Library category path (e.g., "development/frontend/state")
 * @returns Gateway skill name (e.g., "gateway-frontend") or null if no match
 */
export function detectGatewayForCategory(category: string): string | null {
  // Try exact match first
  if (CATEGORY_TO_GATEWAY[category]) {
    return CATEGORY_TO_GATEWAY[category];
  }

  // Try prefix match (e.g., "development/frontend/state" -> "development/frontend")
  for (const [prefix, gateway] of Object.entries(CATEGORY_TO_GATEWAY)) {
    if (category.startsWith(prefix + '/') || category === prefix) {
      return gateway;
    }
  }

  return null;
}

/**
 * Parse gateway skill file to extract all skill entries
 *
 * @param gatewayName - Gateway skill name (e.g., "gateway-frontend")
 * @returns Array of gateway entries
 */
export function parseGatewaySkill(gatewayName: string): GatewayEntry[] {
  const gatewayPath = path.join(PROJECT_ROOT, '.claude/skills', gatewayName, 'SKILL.md');

  if (!fs.existsSync(gatewayPath)) {
    throw new Error(`Gateway skill not found: ${gatewayPath}`);
  }

  const content = fs.readFileSync(gatewayPath, 'utf-8');
  const entries: GatewayEntry[] = [];

  // Parse entries in format:
  // **Title**: `path/to/SKILL.md`
  // - Description
  const entryPattern = /\*\*([^*]+)\*\*:\s*`([^`]+)`\s*\n-\s*([^\n]+)/g;
  let match;

  while ((match = entryPattern.exec(content)) !== null) {
    entries.push({
      title: match[1].trim(),
      path: match[2].trim(),
      description: match[3].trim(),
    });
  }

  return entries;
}

/**
 * Add a skill entry to a gateway skill
 *
 * @param gatewayName - Gateway skill name (e.g., "gateway-frontend")
 * @param skillName - Skill name (e.g., "my-new-skill")
 * @param skillPath - Relative path to skill SKILL.md
 * @param description - One-line description of the skill
 * @param section - Optional section header to add under (auto-detects if not provided)
 */
export function addSkillToGateway(
  gatewayName: string,
  skillName: string,
  skillPath: string,
  description: string,
  section?: string
): void {
  const gatewayPath = path.join(PROJECT_ROOT, '.claude/skills', gatewayName, 'SKILL.md');

  if (!fs.existsSync(gatewayPath)) {
    throw new Error(`Gateway skill not found: ${gatewayPath}`);
  }

  let content = fs.readFileSync(gatewayPath, 'utf-8');

  // Check if entry already exists
  const existingEntries = parseGatewaySkill(gatewayName);
  if (existingEntries.some(e => e.path === skillPath)) {
    console.log(`Skill already exists in gateway: ${skillPath}`);
    return;
  }

  // Format skill name as title (kebab-case -> Title Case)
  const title = skillName
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Create entry
  const entry = `\n**${title}**: \`${skillPath}\`\n- ${description}\n`;

  // If section provided, add under that section
  if (section) {
    const sectionPattern = new RegExp(`^## ${section}$`, 'm');
    const match = content.match(sectionPattern);

    if (match) {
      // Find the position after the section header
      const sectionIndex = match.index! + match[0].length;

      // Find the next section or end of content
      const nextSectionPattern = /\n## /g;
      nextSectionPattern.lastIndex = sectionIndex;
      const nextMatch = nextSectionPattern.exec(content);

      const insertPosition = nextMatch ? nextMatch.index : content.length;

      // Insert entry before next section
      content = content.slice(0, insertPosition) + entry + content.slice(insertPosition);
    } else {
      // Section doesn't exist, add it before "Usage Example" or at end
      const usagePattern = /^## Usage Example$/m;
      const usageMatch = content.match(usagePattern);

      const insertPosition = usageMatch ? usageMatch.index! : content.length;

      const newSection = `\n## ${section}\n${entry}`;
      content = content.slice(0, insertPosition) + newSection + '\n' + content.slice(insertPosition);
    }
  } else {
    // Auto-detect section based on skill path
    const autoSection = detectSectionFromPath(skillPath);

    if (autoSection) {
      return addSkillToGateway(gatewayName, skillName, skillPath, description, autoSection);
    } else {
      // Add before "Usage Example" section or at end
      const usagePattern = /^## Usage Example$/m;
      const match = content.match(usagePattern);

      const insertPosition = match ? match.index! : content.length;
      content = content.slice(0, insertPosition) + entry + '\n' + content.slice(insertPosition);
    }
  }

  fs.writeFileSync(gatewayPath, content, 'utf-8');
}

/**
 * Remove a skill entry from a gateway skill
 *
 * @param gatewayName - Gateway skill name (e.g., "gateway-frontend")
 * @param skillName - Skill name to remove
 */
export function removeSkillFromGateway(gatewayName: string, skillName: string): void {
  const gatewayPath = path.join(PROJECT_ROOT, '.claude/skills', gatewayName, 'SKILL.md');

  if (!fs.existsSync(gatewayPath)) {
    throw new Error(`Gateway skill not found: ${gatewayPath}`);
  }

  let content = fs.readFileSync(gatewayPath, 'utf-8');

  // Remove entry matching the skill name (case-insensitive)
  const titlePattern = skillName
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Pattern: **Title**: `path`\n- description\n
  const entryPattern = new RegExp(
    `\\*\\*${titlePattern}\\*\\*:\\s*\`[^\`]+\`\\s*\\n-\\s*[^\\n]+\\n?`,
    'g'
  );

  const originalContent = content;
  content = content.replace(entryPattern, '');

  if (content === originalContent) {
    console.log(`Skill not found in gateway: ${skillName}`);
    return;
  }

  fs.writeFileSync(gatewayPath, content, 'utf-8');
}

/**
 * Update skill path in a gateway skill (for migrations)
 *
 * @param gatewayName - Gateway skill name (e.g., "gateway-frontend")
 * @param oldPath - Old skill path
 * @param newPath - New skill path
 */
export function updateSkillPathInGateway(
  gatewayName: string,
  oldPath: string,
  newPath: string
): void {
  const gatewayPath = path.join(PROJECT_ROOT, '.claude/skills', gatewayName, 'SKILL.md');

  if (!fs.existsSync(gatewayPath)) {
    throw new Error(`Gateway skill not found: ${gatewayPath}`);
  }

  let content = fs.readFileSync(gatewayPath, 'utf-8');

  // Replace old path with new path
  const originalContent = content;
  content = content.replace(new RegExp(escapeRegExp(oldPath), 'g'), newPath);

  if (content === originalContent) {
    console.log(`Old path not found in gateway: ${oldPath}`);
    return;
  }

  fs.writeFileSync(gatewayPath, content, 'utf-8');
}

/**
 * Detect section from skill path
 * Maps skill library paths to gateway section headers
 */
function detectSectionFromPath(skillPath: string): string | null {
  if (skillPath.includes('/ui/')) return 'UI Components & Styling';
  if (skillPath.includes('/state/')) return 'State Management';
  if (skillPath.includes('/testing/')) return 'Testing';
  if (skillPath.includes('/patterns/')) return 'Patterns & Architecture';
  if (skillPath.includes('/forms/')) return 'Forms & Validation';
  if (skillPath.includes('/tools/')) return 'Development Tools';
  if (skillPath.includes('/backend/api/')) return 'API Development';
  if (skillPath.includes('/backend/database/')) return 'Database';
  if (skillPath.includes('/backend/infrastructure/')) return 'Infrastructure';
  if (skillPath.includes('/security/auth/')) return 'Authentication & Authorization';
  if (skillPath.includes('/security/crypto/')) return 'Cryptography';
  if (skillPath.includes('/mcp-tools/')) return 'MCP Tools';
  if (skillPath.includes('/integrations/')) return 'Third-Party Integrations';

  return null;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get all gateway skills
 */
export function getAllGateways(): string[] {
  return Object.values(CATEGORY_TO_GATEWAY).filter((v, i, a) => a.indexOf(v) === i);
}

/**
 * Validate gateway entries point to existing skills
 *
 * @param gatewayName - Gateway skill name
 * @returns Object with valid and broken entries
 */
export function validateGatewayEntries(gatewayName: string): {
  valid: GatewayEntry[];
  broken: GatewayEntry[];
} {
  const entries = parseGatewaySkill(gatewayName);
  const valid: GatewayEntry[] = [];
  const broken: GatewayEntry[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(PROJECT_ROOT, entry.path);
    if (fs.existsSync(absolutePath)) {
      valid.push(entry);
    } else {
      broken.push(entry);
    }
  }

  return { valid, broken };
}

/**
 * Find library skills not referenced in any gateway
 *
 * @returns Array of skill paths that should be in gateways but aren't
 */
export function findMissingGatewayEntries(): string[] {
  const libraryDir = path.join(PROJECT_ROOT, '.claude/skill-library');
  const missing: string[] = [];

  // Get all library skills
  const librarySkills = findAllLibrarySkills(libraryDir);

  // Get all gateway entries
  const allGateways = getAllGateways();
  const allEntries: Set<string> = new Set();

  for (const gateway of allGateways) {
    try {
      const entries = parseGatewaySkill(gateway);
      entries.forEach(e => allEntries.add(e.path));
    } catch (error) {
      // Gateway doesn't exist or parse error, skip
      continue;
    }
  }

  // Find skills not in any gateway
  for (const skillPath of librarySkills) {
    const relativePath = path.relative(PROJECT_ROOT, skillPath);
    if (!allEntries.has(relativePath)) {
      missing.push(relativePath);
    }
  }

  return missing;
}

/**
 * Recursively find all SKILL.md files in library
 */
function findAllLibrarySkills(dir: string): string[] {
  const skills: string[] = [];

  if (!fs.existsSync(dir)) {
    return skills;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      skills.push(...findAllLibrarySkills(fullPath));
    } else if (entry.name === 'SKILL.md') {
      skills.push(fullPath);
    }
  }

  return skills;
}
