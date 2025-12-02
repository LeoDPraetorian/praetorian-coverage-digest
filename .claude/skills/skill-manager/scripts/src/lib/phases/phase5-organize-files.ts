/**
 * Phase 5B: Organize Orphaned Files
 * Moves DOCUMENTATION .md files from skill root to references/examples/templates/
 * NOTE: Does NOT move runtime artifacts (Phase 6 handles those)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SkillFile, Issue, PhaseResult, FixOptions } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

/**
 * Runtime artifact patterns (handled by Phase 6, not Phase 5B)
 */
const RUNTIME_PATTERNS = [
  /^audit-.*\.(md|txt|json)$/,
  /^report-.*\.(md|txt|json)$/,
  /^run-.*\.(log|txt)$/,
  /^test-results-.*\.(md|txt|json|xml)$/,
  /^output-.*\.(md|txt)$/,
  /^results-.*\.(md|txt|json)$/,
  /^generated-.*\.(md|txt)$/,
  /^IMPLEMENTATION.*\.md$/i,
  /^FINAL.*\.md$/i,
  /^STATUS.*\.md$/i,
  /.*\.tmp$/,
];

export class Phase5OrganizeFiles {
  /**
   * Check if file is a runtime artifact (should be handled by Phase 6)
   */
  private static isRuntimeArtifact(filename: string): boolean {
    return RUNTIME_PATTERNS.some(pattern => pattern.test(filename));
  }

  /**
   * Check if file is a non-standard README
   */
  private static isNonStandardReadme(filename: string): boolean {
    return /^README.*\.md$/i.test(filename) && filename !== 'README.md';
  }

  /**
   * Validate file organization for a single skill
   */
  static async validate(skill: SkillFile): Promise<Issue[]> {
    const issues: Issue[] = [];
    const allOrphanedFiles = await SkillParser.findOrphanedFiles(skill.directory);

    // Filter out runtime artifacts (handled by Phase 6)
    const orphanedFiles = allOrphanedFiles.filter(
      file => !this.isRuntimeArtifact(path.basename(file))
    );

    // Check for non-standard READMEs
    const nonStandardReadmes = allOrphanedFiles.filter(
      file => this.isNonStandardReadme(path.basename(file))
    );

    if (nonStandardReadmes.length > 0) {
      for (const file of nonStandardReadmes) {
        const filename = path.basename(file);
        issues.push({
          severity: 'WARNING',
          message: `Non-standard README: ${filename} (should be README.md or delete)`,
          autoFixable: false, // Requires review/renaming
        });
      }
    }

    // Check for README.md at root (optional but discouraged per docs)
    const readmePath = path.join(skill.directory, 'README.md');
    const hasReadme = await fs.access(readmePath).then(() => true).catch(() => false);

    if (hasReadme) {
      issues.push({
        severity: 'INFO',
        message: 'README.md exists (SKILL.md is sufficient per official docs)',
        autoFixable: false,
      });
    }

    if (orphanedFiles.length > 0) {
      issues.push({
        severity: 'WARNING',
        message: `${orphanedFiles.length} orphaned .md file(s) at root`,
        autoFixable: true,
        fix: async () => {
          await this.organizeFiles(skill.directory, orphanedFiles, false);
        },
      });

      for (const file of orphanedFiles) {
        const filename = path.basename(file);
        const targetDir = this.determineTargetDirectory(filename);

        issues.push({
          severity: 'INFO',
          message: `${filename} → ${targetDir}/`,
          autoFixable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Determine target directory based on filename pattern
   */
  private static determineTargetDirectory(filename: string): string {
    const lower = filename.toLowerCase();

    if (/example|demo|sample|case-study/.test(lower)) {
      return 'examples';
    }

    if (/template|starter|boilerplate/.test(lower)) {
      return 'templates';
    }

    if (/reference|guide|detail|advanced|api/.test(lower)) {
      return 'references';
    }

    // Default to references for other documentation
    return 'references';
  }

  /**
   * Organize orphaned files into proper directories
   */
  private static async organizeFiles(
    skillDir: string,
    orphanedFiles: string[],
    dryRun: boolean
  ): Promise<void> {
    for (const file of orphanedFiles) {
      const filename = path.basename(file);
      const targetDirName = this.determineTargetDirectory(filename);
      const targetDir = path.join(skillDir, targetDirName);
      const targetPath = path.join(targetDir, filename);

      if (!dryRun) {
        // Create target directory if it doesn't exist
        await fs.mkdir(targetDir, { recursive: true });

        // Move the file
        await fs.rename(file, targetPath);
      }
    }
  }

  /**
   * Run Phase 5B audit on all skills (or a single skill if skillName provided)
   */
  static async run(skillsDir: string, options?: FixOptions): Promise<PhaseResult> {
    let skillPaths = await SkillParser.findAllSkills(skillsDir);

    // Filter to single skill if specified
    if (options?.skillName) {
      skillPaths = skillPaths.filter(p => p.includes(`/${options.skillName}/SKILL.md`));
      if (skillPaths.length === 0) {
        return {
          phaseName: 'Phase 5: Organize Files',
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
      phaseName: 'Phase 5: Organize Files',
      skillsAffected,
      issuesFound,
      issuesFixed,
      details,
    };
  }

  /**
   * Get file organization statistics
   */
  static async getStatistics(skillsDir: string): Promise<{
    cleanOrg: number;
    orphanedFiles: number;
    skillsWithOrphans: number;
    total: number;
    percentage: number;
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let totalOrphanedFiles = 0;
    let skillsWithOrphans = 0;

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const orphans = await SkillParser.findOrphanedFiles(skill.directory);

      if (orphans.length > 0) {
        skillsWithOrphans++;
        totalOrphanedFiles += orphans.length;
      }
    }

    const total = skillPaths.length;
    const cleanOrg = total - skillsWithOrphans;
    const percentage = total > 0 ? (cleanOrg / total) * 100 : 0;

    return {
      cleanOrg,
      orphanedFiles: totalOrphanedFiles,
      skillsWithOrphans,
      total,
      percentage,
    };
  }
}
