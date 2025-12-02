/**
 * Phase 5C: Script Organization
 * Detects Python/bash/shell scripts at skill root - should be in scripts/ subdirectory
 * Per official docs: "Place utilities in a dedicated scripts/ subdirectory"
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SkillFile, Issue, PhaseResult, FixOptions } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

/**
 * Script file extensions that should be in scripts/ subdirectory
 */
const SCRIPT_EXTENSIONS = ['.py', '.sh', '.bash', '.zsh', '.fish', '.pl', '.rb'];

export class Phase6ScriptOrganization {
  /**
   * Check if file is a script that should be in scripts/ subdirectory
   */
  private static isScript(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return SCRIPT_EXTENSIONS.includes(ext);
  }

  /**
   * Find all scripts at skill root (not in scripts/ subdirectory)
   */
  private static async findScriptsAtRoot(skillDir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(skillDir, { withFileTypes: true });
      const scripts: string[] = [];

      for (const entry of entries) {
        if (entry.isFile() && this.isScript(entry.name)) {
          scripts.push(entry.name);
        }
      }

      return scripts;
    } catch (error) {
      return [];
    }
  }

  /**
   * Validate script organization for a single skill
   */
  static async validate(skill: SkillFile): Promise<Issue[]> {
    const issues: Issue[] = [];
    const scriptsAtRoot = await this.findScriptsAtRoot(skill.directory);

    if (scriptsAtRoot.length > 0) {
      // Count by type for better reporting
      const pythonScripts = scriptsAtRoot.filter(f => f.endsWith('.py'));
      const bashScripts = scriptsAtRoot.filter(f =>
        f.endsWith('.sh') || f.endsWith('.bash') || f.endsWith('.zsh') || f.endsWith('.fish')
      );
      const otherScripts = scriptsAtRoot.filter(f =>
        !pythonScripts.includes(f) && !bashScripts.includes(f)
      );

      issues.push({
        severity: 'WARNING',
        message: `${scriptsAtRoot.length} script file(s) at root (should be in scripts/ subdirectory per progressive disclosure best practices)`,
        autoFixable: true,
        fix: async () => {
          await this.moveScriptsToSubdirectory(skill.directory, scriptsAtRoot, false);
        },
      });

      // Detail each script type
      if (pythonScripts.length > 0) {
        issues.push({
          severity: 'INFO',
          message: `Python scripts: ${pythonScripts.join(', ')} → scripts/`,
          autoFixable: true,
        });
      }

      if (bashScripts.length > 0) {
        issues.push({
          severity: 'INFO',
          message: `Shell scripts: ${bashScripts.join(', ')} → scripts/ (consider TypeScript migration per Phase 8)`,
          autoFixable: true,
        });
      }

      if (otherScripts.length > 0) {
        issues.push({
          severity: 'INFO',
          message: `Other scripts: ${otherScripts.join(', ')} → scripts/`,
          autoFixable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Move scripts from root to scripts/ subdirectory
   */
  private static async moveScriptsToSubdirectory(
    skillDir: string,
    scriptFiles: string[],
    dryRun: boolean
  ): Promise<void> {
    const scriptsDir = path.join(skillDir, 'scripts');

    if (!dryRun) {
      // Create scripts/ directory if it doesn't exist
      await fs.mkdir(scriptsDir, { recursive: true });

      // Move each script
      for (const scriptFile of scriptFiles) {
        const sourcePath = path.join(skillDir, scriptFile);
        const targetPath = path.join(scriptsDir, scriptFile);
        await fs.rename(sourcePath, targetPath);
      }
    }
  }

  /**
   * Run Phase 5C audit on all skills (or a single skill if skillName provided)
   */
  static async run(skillsDir: string, options?: FixOptions): Promise<PhaseResult> {
    let skillPaths = await SkillParser.findAllSkills(skillsDir);

    // Filter to single skill if specified
    if (options?.skillName) {
      skillPaths = skillPaths.filter(p => p.includes(`/${options.skillName}/SKILL.md`));
      if (skillPaths.length === 0) {
        return {
          phaseName: 'Phase 6: Script Organization',
          skillsAffected: 0,
          issuesFound: 0,
          issuesFixed: 0,
          details: [`Skill not found: ${options.skillName}`],
        };
      }
    }

    let skillsAffected = 0;
    let issuesFound = 0;
    let issuesFixed = 0;
    const details: string[] = [];

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const issues = await this.validate(skill);

      if (issues.length > 0) {
        skillsAffected++;
        issuesFound += issues.length;

        details.push(`${skill.name}:`);

        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);

          // Auto-fix if enabled
          if (options?.autoFix && issue.autoFixable && issue.fix) {
            if (!options.dryRun) {
              await issue.fix();
              issuesFixed++;
              details.push(`    ✓ Fixed`);
            } else {
              details.push(`    (would fix in non-dry-run mode)`);
            }
          }
        }
      }
    }

    return {
      phaseName: 'Phase 6: Script Organization',
      skillsAffected,
      issuesFound,
      issuesFixed,
      details,
    };
  }

  /**
   * Get script organization statistics
   */
  static async getStatistics(skillsDir: string): Promise<{
    properlyOrganized: number;
    scriptsAtRoot: number;
    skillsWithScriptsAtRoot: number;
    total: number;
    percentage: number;
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let totalScriptsAtRoot = 0;
    let skillsWithScriptsAtRoot = 0;

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const scriptsAtRoot = await this.findScriptsAtRoot(skill.directory);

      if (scriptsAtRoot.length > 0) {
        skillsWithScriptsAtRoot++;
        totalScriptsAtRoot += scriptsAtRoot.length;
      }
    }

    const total = skillPaths.length;
    const properlyOrganized = total - skillsWithScriptsAtRoot;
    const percentage = total > 0 ? (properlyOrganized / total) * 100 : 0;

    return {
      properlyOrganized,
      scriptsAtRoot: totalScriptsAtRoot,
      skillsWithScriptsAtRoot,
      total,
      percentage,
    };
  }
}
