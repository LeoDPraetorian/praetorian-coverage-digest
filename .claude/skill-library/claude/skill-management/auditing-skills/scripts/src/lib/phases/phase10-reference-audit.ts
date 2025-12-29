/**
 * Phase 10: Reference Audit (Hybrid)
 * Checks deprecation registry for stale /command, skill name, and agent references.
 *
 * Hybrid behavior:
 * - DETERMINISTIC: Auto-fix references found in deprecation registry
 * - AMBIGUOUS: For non-registry references, fuzzy match against existing skills/agents
 *   - Options: replace with suggested match, remove reference, keep as-is
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  Issue,
  PhaseResult,
  SkillFile,
  Phase10AmbiguousCase,
  Phase10HybridResult,
  HybridFixOption,
  FuzzyMatch
} from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';
import chalk from 'chalk';

interface DeprecationEntry {
  replacedBy: string;
  deprecatedDate: string;
  reason: string;
}

interface DeprecationRegistry {
  lastUpdated: string;
  commands: Record<string, DeprecationEntry>;
  skills: Record<string, DeprecationEntry>;
  agents: Record<string, DeprecationEntry>;
  mcpTools: Record<string, DeprecationEntry>;
  patterns: Record<string, { issue: string; fix: string }>;
}

export class Phase10ReferenceAudit {
  private static registry: DeprecationRegistry | null = null;

  /**
   * Load the deprecation registry
   */
  private static async loadRegistry(skillsDir: string): Promise<DeprecationRegistry | null> {
    if (this.registry) return this.registry;

    const registryPath = path.join(skillsDir, 'lib', 'deprecation-registry.json');

    try {
      const content = await fs.readFile(registryPath, 'utf-8');
      this.registry = JSON.parse(content);
      return this.registry;
    } catch {
      console.log(chalk.yellow('  Warning: Deprecation registry not found at lib/deprecation-registry.json'));
      return null;
    }
  }

  /**
   * Check a single skill for deprecated references
   */
  static async validate(skill: { name: string; directory: string; content: string }, skillsDir?: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const dir = skillsDir || path.dirname(path.dirname(skill.directory));
    const registry = await this.loadRegistry(dir);

    if (!registry) {
      return issues; // Can't audit without registry
    }

    const content = skill.content;

    // Check for deprecated commands
    for (const [oldCmd, entry] of Object.entries(registry.commands || {})) {
      // Match command invocations like /write-agent, `/write-agent`, etc.
      const cmdRegex = new RegExp(oldCmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(cmdRegex);

      if (matches && matches.length > 0) {
        issues.push({
          severity: 'WARNING',
          message: `Deprecated command reference: "${oldCmd}" → should be "${entry.replacedBy}" (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
          autoFixable: true,
        });
      }
    }

    // Check for deprecated skills
    for (const [oldSkill, entry] of Object.entries(registry.skills || {})) {
      const skillRegex = new RegExp(oldSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(skillRegex);

      if (matches && matches.length > 0) {
        issues.push({
          severity: 'WARNING',
          message: `Deprecated skill reference: "${oldSkill}" → should be "${entry.replacedBy}" (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
          autoFixable: true,
        });
      }
    }

    // Check for deprecated agents
    for (const [oldAgent, entry] of Object.entries(registry.agents || {})) {
      const agentRegex = new RegExp(oldAgent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(agentRegex);

      if (matches && matches.length > 0) {
        issues.push({
          severity: 'WARNING',
          message: `Deprecated agent reference: "${oldAgent}" → should be "${entry.replacedBy || '[deleted]'}" (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`,
          autoFixable: entry.replacedBy ? true : false,
        });
      }
    }

    // Check for anti-patterns
    for (const [pattern, entry] of Object.entries(registry.patterns || {})) {
      const patternRegex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(patternRegex);

      if (matches && matches.length > 0) {
        issues.push({
          severity: 'INFO',
          message: `Anti-pattern detected: "${pattern}" - ${entry.issue}. Fix: ${entry.fix}`,
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Run phase on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string, options?: any): Promise<PhaseResult> {
    // Get all skill directories
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const skillDirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'lib' && e.name !== 'node_modules')
      .map(e => e.name);

    const skills: SkillFile[] = [];
    for (const skillName of skillDirs) {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
      try {
        await fs.access(skillPath);
        const skill = await SkillParser.parseSkillFile(skillPath);
        skills.push(skill);
      } catch {
        continue; // Skip if no SKILL.md
      }
    }

    return this.runOnParsedSkills(skills, skillsDir, options);
  }

  /**
   * Run phase on pre-parsed skills (performance optimized)
   * Note: skillsDir is required for loading deprecation registry
   */
  static async runOnParsedSkills(skills: SkillFile[], skillsDir: string, options?: any): Promise<PhaseResult> {
    const result: PhaseResult = {
      phaseName: 'Phase 10: Reference Audit',
      skillsAffected: 0,
      issuesFound: 0,
      issuesFixed: 0,
      details: [],
    };

    const registry = await this.loadRegistry(skillsDir);

    if (!registry) {
      result.details.push('[INFO] Deprecation registry not found - skipping reference audit');
      return result;
    }

    for (const skill of skills) {
      try {
        // Also read content from references/, examples/, templates/
        let fullContent = skill.content;

        const subDirs = ['references', 'examples', 'templates'];
        for (const subDir of subDirs) {
          const subPath = path.join(skill.directory, subDir);
          try {
            const files = await fs.readdir(subPath);
            for (const file of files) {
              if (file.endsWith('.md')) {
                const fileContent = await fs.readFile(path.join(subPath, file), 'utf-8');
                fullContent += '\n' + fileContent;
              }
            }
          } catch {
            // Subdir doesn't exist, skip
          }
        }

        const issues = await this.validate({
          name: skill.name,
          directory: skill.directory,
          content: fullContent
        }, skillsDir);

        if (issues.length > 0) {
          result.skillsAffected++;
          result.issuesFound += issues.length;
          result.details.push(`${skill.name}:`);

          // Auto-fix if enabled
          if (options?.autoFix && !options.dryRun) {
            const fixed = await this.fix(skill.path, skillsDir, options.dryRun);
            if (fixed > 0) {
              result.issuesFixed += fixed;
              result.details.push(`  ✓ Fixed ${fixed} deprecated reference(s)`);
            }
          } else {
            for (const issue of issues) {
              result.details.push(`  - [${issue.severity}] ${issue.message}`);
              if (options?.dryRun && issue.autoFixable) {
                result.details.push(`    (would fix in non-dry-run mode)`);
              }
            }
          }
        }
      } catch (error) {
        result.details.push(`[WARNING] Could not parse ${skill.name}: ${error}`);
      }
    }

    if (result.skillsAffected === 0) {
      result.details.push('[INFO] No deprecated references found');
    }

    return result;
  }

  /**
   * Fix deprecated references using registry mappings
   */
  static async fix(skillPath: string, skillsDir: string, dryRun: boolean = false): Promise<number> {
    const registry = await this.loadRegistry(skillsDir);
    if (!registry) {
      return 0; // Can't fix without registry
    }

    const skill = await SkillParser.parseSkillFile(skillPath);
    let content = skill.content;
    let fixedCount = 0;

    // Fix deprecated commands
    for (const [oldCmd, entry] of Object.entries(registry.commands || {})) {
      const cmdRegex = new RegExp(oldCmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (cmdRegex.test(content)) {
        content = content.replace(cmdRegex, entry.replacedBy);
        fixedCount++;
      }
    }

    // Fix deprecated skills
    for (const [oldSkill, entry] of Object.entries(registry.skills || {})) {
      const skillRegex = new RegExp(oldSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (skillRegex.test(content)) {
        content = content.replace(skillRegex, entry.replacedBy);
        fixedCount++;
      }
    }

    // Fix deprecated agents
    for (const [oldAgent, entry] of Object.entries(registry.agents || {})) {
      if (entry.replacedBy) {
        const agentRegex = new RegExp(oldAgent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        if (agentRegex.test(content)) {
          content = content.replace(agentRegex, entry.replacedBy);
          fixedCount++;
        }
      }
    }

    // Write fixed content if changes made and not dry-run
    if (fixedCount > 0 && !dryRun) {
      await fs.writeFile(skillPath, content, 'utf-8');
    }

    return fixedCount;
  }

  /**
   * HYBRID FIX: Fix references with deterministic registry fixes + fuzzy matching for ambiguous cases
   *
   * Returns both:
   * - fixedCount: Number of references auto-fixed (from registry)
   * - ambiguousCases: References not in registry that might be typos (needs Claude reasoning)
   */
  static async fixHybrid(
    skillPath: string,
    skillsDir: string,
    dryRun: boolean = false
  ): Promise<{ fixedCount: number; ambiguousCases: Phase10AmbiguousCase[] }> {
    const registry = await this.loadRegistry(skillsDir);
    const skill = await SkillParser.parseSkillFile(skillPath);
    let content = skill.content;
    let fixedCount = 0;
    const ambiguousCases: Phase10AmbiguousCase[] = [];

    // Get existing skills and agents for fuzzy matching
    const existingSkills = await this.getAllSkillNames(skillsDir);
    const existingAgents = await this.getAllAgentNames(skillsDir);

    // DETERMINISTIC: Fix deprecated references from registry
    if (registry) {
      // Fix deprecated commands
      for (const [oldCmd, entry] of Object.entries(registry.commands || {})) {
        const cmdRegex = new RegExp(oldCmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        if (cmdRegex.test(content)) {
          content = content.replace(cmdRegex, entry.replacedBy);
          fixedCount++;
        }
      }

      // Fix deprecated skills
      for (const [oldSkill, entry] of Object.entries(registry.skills || {})) {
        const skillRegex = new RegExp(oldSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        if (skillRegex.test(content)) {
          content = content.replace(skillRegex, entry.replacedBy);
          fixedCount++;
        }
      }

      // Fix deprecated agents
      for (const [oldAgent, entry] of Object.entries(registry.agents || {})) {
        if (entry.replacedBy) {
          const agentRegex = new RegExp(oldAgent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          if (agentRegex.test(content)) {
            content = content.replace(agentRegex, entry.replacedBy);
            fixedCount++;
          }
        }
      }
    }

    // AMBIGUOUS: Find potential phantom references and fuzzy match
    const phantomRefs = await this.findPhantomReferences(content, existingSkills, existingAgents, registry);

    for (const phantom of phantomRefs) {
      const fuzzyMatches = this.fuzzyMatchReference(
        phantom.reference,
        phantom.type === 'skill' ? existingSkills : existingAgents
      );

      if (fuzzyMatches.length > 0) {
        // Build options for user
        const options: HybridFixOption[] = fuzzyMatches.slice(0, 3).map(match => ({
          key: 'replace',
          label: `Replace with "${match.name}"`,
          description: `${Math.round(match.score * 100)}% match`,
          value: `${phantom.reference}:${match.name}`
        }));

        options.push({
          key: 'remove',
          label: 'Remove reference',
          description: 'Delete this reference from the document',
          value: phantom.reference
        });

        options.push({
          key: 'keep',
          label: 'Keep as-is',
          description: 'Leave the reference unchanged',
          value: phantom.reference
        });

        ambiguousCases.push({
          phase: 10,
          type: 'phantom-reference-fuzzy',
          context: `Reference "${phantom.reference}" not found. Did you mean one of these?`,
          options,
          reference: phantom.reference,
          refType: phantom.type,
          fuzzyMatches
        });
      }
    }

    // Write fixed content if changes made and not dry-run
    if (fixedCount > 0 && !dryRun) {
      await fs.writeFile(skillPath, content, 'utf-8');
    }

    return { fixedCount, ambiguousCases };
  }

  /**
   * Get all skill names from the skills directory
   */
  private static async getAllSkillNames(skillsDir: string): Promise<string[]> {
    const skills: string[] = [];

    // Core skills
    const coreSkillsDir = path.join(skillsDir, '..', 'skills');
    try {
      const entries = await fs.readdir(coreSkillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          skills.push(entry.name);
        }
      }
    } catch {
      // Core skills dir doesn't exist
    }

    // Library skills (recursive)
    const libraryDir = path.join(skillsDir, '..', 'skill-library');
    try {
      const librarySkills = await this.findSkillsRecursively(libraryDir);
      skills.push(...librarySkills);
    } catch {
      // Library dir doesn't exist
    }

    return skills;
  }

  /**
   * Recursively find skill names in a directory
   */
  private static async findSkillsRecursively(dir: string): Promise<string[]> {
    const skills: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subDir = path.join(dir, entry.name);

          // Check if this directory contains SKILL.md
          try {
            await fs.access(path.join(subDir, 'SKILL.md'));
            skills.push(entry.name);
          } catch {
            // Not a skill directory, search deeper
            const subSkills = await this.findSkillsRecursively(subDir);
            skills.push(...subSkills);
          }
        }
      }
    } catch {
      // Directory not readable
    }

    return skills;
  }

  /**
   * Get all agent names from the agents directory
   */
  private static async getAllAgentNames(skillsDir: string): Promise<string[]> {
    const agents: string[] = [];
    const agentsDir = path.join(skillsDir, '..', 'agents');

    try {
      const categories = await fs.readdir(agentsDir, { withFileTypes: true });

      for (const category of categories) {
        if (category.isDirectory() && !category.name.startsWith('.')) {
          const categoryDir = path.join(agentsDir, category.name);
          const agentFiles = await fs.readdir(categoryDir);

          for (const file of agentFiles) {
            if (file.endsWith('.md') && !file.startsWith('.')) {
              agents.push(file.replace('.md', ''));
            }
          }
        }
      }
    } catch {
      // Agents dir doesn't exist
    }

    return agents;
  }

  /**
   * Find potential phantom references in content
   * Looks for backtick-quoted names that look like skill/agent references
   */
  private static async findPhantomReferences(
    content: string,
    existingSkills: string[],
    existingAgents: string[],
    registry: DeprecationRegistry | null
  ): Promise<Array<{ reference: string; type: 'skill' | 'agent' | 'command' | 'mcp-tool' }>> {
    const phantoms: Array<{ reference: string; type: 'skill' | 'agent' | 'command' | 'mcp-tool' }> = [];

    // Pattern for skill references: `skill-name` or `skill-name` skill
    const skillPattern = /`([a-z][a-z0-9-]*(?:-[a-z0-9]+)+)`(?:\s+skill)?/gi;
    let match;

    while ((match = skillPattern.exec(content)) !== null) {
      const ref = match[1];

      // Skip if it's a known skill
      if (existingSkills.includes(ref)) continue;

      // Skip if it's in the deprecation registry (will be handled deterministically)
      if (registry?.skills?.[ref]) continue;

      // Skip common non-skill patterns
      if (this.isLikelyNotReference(ref)) continue;

      // Check if it looks like a skill name (has hyphens, reasonable length)
      if (ref.includes('-') && ref.length >= 5 && ref.length <= 50) {
        phantoms.push({ reference: ref, type: 'skill' });
      }
    }

    // Pattern for agent references
    const agentPattern = /`([a-z][a-z0-9-]*(?:-[a-z0-9]+)+)`(?:\s+agent)?/gi;
    skillPattern.lastIndex = 0; // Reset

    while ((match = agentPattern.exec(content)) !== null) {
      const ref = match[1];

      // Skip if already found as skill phantom
      if (phantoms.some(p => p.reference === ref)) continue;

      // Skip if it's a known agent
      if (existingAgents.includes(ref)) continue;

      // Skip if it's in the deprecation registry
      if (registry?.agents?.[ref]) continue;

      // Check if it looks like an agent name
      if (ref.includes('-') && ref.length >= 5 && ref.length <= 50) {
        // Only add if it matches agent naming patterns
        if (ref.includes('developer') || ref.includes('tester') || ref.includes('reviewer') ||
            ref.includes('lead') || ref.includes('orchestrator') || ref.includes('assessor')) {
          phantoms.push({ reference: ref, type: 'agent' });
        }
      }
    }

    return phantoms;
  }

  /**
   * Check if a string is likely NOT a skill/agent reference
   */
  private static isLikelyNotReference(ref: string): boolean {
    const nonRefPatterns = [
      /^npm-/,           // npm packages
      /^git-/,           // git commands
      /^node-/,          // node modules
      /^ts-/,            // typescript things
      /^pre-/,           // prefixes
      /^post-/,
      /^semi-/,
      /^non-/,
      /^re-/,
      /^co-/,
      /-config$/,        // config files
      /-test$/,          // test files
      /-spec$/,
      /-type$/,
      /-mode$/,
      /-style$/,
      /-based$/,
      /-like$/,
      /-ish$/,
    ];

    return nonRefPatterns.some(pattern => pattern.test(ref));
  }

  /**
   * Fuzzy match a reference against existing names using Levenshtein distance
   */
  private static fuzzyMatchReference(query: string, candidates: string[]): FuzzyMatch[] {
    const matches: FuzzyMatch[] = [];

    for (const candidate of candidates) {
      const score = this.calculateSimilarity(query.toLowerCase(), candidate.toLowerCase());

      // Only include matches with >60% similarity
      if (score > 0.6) {
        matches.push({ name: candidate, score });
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * Returns 0-1 (1 = identical)
   */
  private static calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const matrix: number[][] = [];

    // Initialize matrix
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const distance = matrix[a.length][b.length];
    const maxLength = Math.max(a.length, b.length);
    return 1 - distance / maxLength;
  }

  /**
   * Apply a hybrid fix decision (called after user confirms)
   */
  static async applyHybridFix(
    skillPath: string,
    action: 'replace' | 'remove' | 'keep',
    value: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (action === 'keep') {
        return { success: true, message: `Kept reference "${value}" unchanged` };
      }

      let content = await fs.readFile(skillPath, 'utf-8');

      switch (action) {
        case 'replace': {
          // value format: "oldRef:newRef"
          const [oldRef, newRef] = value.split(':');
          if (!oldRef || !newRef) {
            return { success: false, message: 'Invalid replace format. Expected "oldRef:newRef"' };
          }
          const pattern = new RegExp(`\`${oldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``, 'g');
          content = content.replace(pattern, `\`${newRef}\``);
          await fs.writeFile(skillPath, content, 'utf-8');
          return { success: true, message: `Replaced "${oldRef}" with "${newRef}"` };
        }

        case 'remove': {
          // Remove the backtick-quoted reference
          const pattern = new RegExp(`\`${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``, 'g');
          content = content.replace(pattern, value); // Replace with unquoted text
          await fs.writeFile(skillPath, content, 'utf-8');
          return { success: true, message: `Removed backticks from "${value}"` };
        }

        default:
          return { success: false, message: `Unknown action: ${action}` };
      }
    } catch (error) {
      return { success: false, message: `Failed to apply fix: ${error}` };
    }
  }
}
