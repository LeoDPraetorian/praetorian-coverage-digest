/**
 * Phase 10: Reference Audit
 * Checks deprecation registry for stale /command, skill name, and agent references
 * Integrates logic from claude-skill-audit-references skill
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Issue, PhaseResult } from '../types.js';
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
   * Run phase on all skills (with optional auto-fix)
   */
  static async run(skillsDir: string, options?: any): Promise<PhaseResult> {
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

    // Get all skill directories
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    const skillDirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'lib' && e.name !== 'node_modules')
      .map(e => e.name);

    for (const skillName of skillDirs) {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');

      try {
        await fs.access(skillPath);
      } catch {
        continue; // Skip if no SKILL.md
      }

      try {
        const skill = await SkillParser.parseSkillFile(skillPath);

        // Also read content from references/, examples/, templates/
        let fullContent = skill.content;

        const subDirs = ['references', 'examples', 'templates'];
        for (const subDir of subDirs) {
          const subPath = path.join(skillsDir, skillName, subDir);
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
          result.details.push(`${skillName}:`);

          // Auto-fix if enabled
          if (options?.autoFix && !options.dryRun) {
            const fixed = await this.fix(skillPath, skillsDir, options.dryRun);
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
        result.details.push(`[WARNING] Could not parse ${skillName}: ${error}`);
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
}
