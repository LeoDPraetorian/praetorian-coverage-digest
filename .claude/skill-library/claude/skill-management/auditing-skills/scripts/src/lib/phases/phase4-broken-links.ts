/**
 * Phase 4: Broken Link Detection (Hybrid)
 * Finds broken markdown reference links using regex parsing.
 *
 * Hybrid behavior:
 * - DETERMINISTIC: Auto-fix when file exists elsewhere in skill directory
 * - AMBIGUOUS: When file doesn't exist anywhere, returns case for Claude reasoning
 *   - Options: create placeholder, remove reference, use similar file
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  SkillFile,
  Issue,
  PhaseResult,
  Phase4AmbiguousCase,
  Phase4HybridResult,
  HybridFixOptions,
  HybridFixOption
} from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

export class Phase4BrokenLinks {
  /**
   * Validate reference links for a single skill
   */
  static async validate(skill: SkillFile): Promise<Issue[]> {
    const issues: Issue[] = [];
    const links = SkillParser.extractMarkdownLinks(skill.content);
    const brokenLinks: Array<{ text: string; path: string }> = [];

    for (const link of links) {
      const exists = await SkillParser.checkLinkExists(skill.directory, link.path);
      if (!exists) {
        brokenLinks.push(link);
      }
    }

    if (brokenLinks.length > 0) {
      // Build context with all broken links
      const context = brokenLinks.map(link => `[${link.text}](${link.path})`);

      issues.push({
        severity: 'WARNING',
        message: `${brokenLinks.length} broken reference link(s)`,
        recommendation: 'Fix broken links or remove references to non-existent files',
        context,
        autoFixable: true,
      });
    }

    return issues;
  }

  /**
   * Fix broken links by correcting paths (simple path correction only)
   */
  static async fix(skill: SkillFile, dryRun: boolean = false): Promise<number> {
    const links = SkillParser.extractMarkdownLinks(skill.content);
    const brokenLinks: Array<{ text: string; path: string; line?: number }> = [];

    // Find broken links
    for (const link of links) {
      const exists = await SkillParser.checkLinkExists(skill.directory, link.path);
      if (!exists) {
        brokenLinks.push(link);
      }
    }

    if (brokenLinks.length === 0) {
      return 0;
    }

    let content = skill.content;
    let fixedCount = 0;

    // Try to fix each broken link
    for (const link of brokenLinks) {
      const filename = path.basename(link.path);
      const correctPath = await this.findFileInSkill(skill.directory, filename);

      if (correctPath && correctPath !== link.path) {
        // Update link path in content
        const oldLink = `[${link.text}](${link.path})`;
        const newLink = `[${link.text}](${correctPath})`;
        content = content.replace(oldLink, newLink);
        fixedCount++;
      }
    }

    // Write fixed content if changes were made and not dry-run
    if (fixedCount > 0 && !dryRun) {
      await fs.writeFile(path.join(skill.directory, 'SKILL.md'), content, 'utf-8');
    }

    return fixedCount;
  }

  /**
   * Search for file in standard skill subdirectories
   */
  private static async findFileInSkill(skillDir: string, filename: string): Promise<string | null> {
    const searchDirs = ['references', 'examples', 'templates', 'scripts', '.local'];

    for (const dir of searchDirs) {
      const searchPath = path.join(skillDir, dir, filename);
      try {
        await fs.access(searchPath);
        return `${dir}/${filename}`;
      } catch {
        // File doesn't exist here, continue searching
      }
    }

    return null;
  }

  /**
   * HYBRID FIX: Fix broken links with deterministic auto-fix + ambiguous cases for Claude
   *
   * Returns both:
   * - fixedCount: Number of links auto-fixed (file existed elsewhere)
   * - ambiguousCases: Links where file doesn't exist (needs Claude reasoning)
   */
  static async fixHybrid(
    skill: SkillFile,
    dryRun: boolean = false
  ): Promise<{ fixedCount: number; ambiguousCases: Phase4AmbiguousCase[] }> {
    const links = SkillParser.extractMarkdownLinks(skill.content);
    const brokenLinks: Array<{ text: string; path: string }> = [];

    // Find broken links
    for (const link of links) {
      const exists = await SkillParser.checkLinkExists(skill.directory, link.path);
      if (!exists) {
        brokenLinks.push(link);
      }
    }

    if (brokenLinks.length === 0) {
      return { fixedCount: 0, ambiguousCases: [] };
    }

    let content = skill.content;
    let fixedCount = 0;
    const ambiguousCases: Phase4AmbiguousCase[] = [];

    // Process each broken link
    for (const link of brokenLinks) {
      const filename = path.basename(link.path);
      const correctPath = await this.findFileInSkill(skill.directory, filename);

      if (correctPath && correctPath !== link.path) {
        // DETERMINISTIC: File exists elsewhere - auto-fix
        const oldLink = `[${link.text}](${link.path})`;
        const newLink = `[${link.text}](${correctPath})`;
        content = content.replace(oldLink, newLink);
        fixedCount++;
      } else {
        // AMBIGUOUS: File doesn't exist anywhere - needs Claude reasoning
        const similarFiles = await this.findSimilarFiles(skill.directory, filename);
        const surroundingContext = this.extractSurroundingContext(skill.content, link.text, link.path);

        // Build options for user
        const options: HybridFixOption[] = [
          {
            key: 'create',
            label: `Create ${link.path}`,
            description: 'Create a placeholder file with TODO content',
            value: link.path
          },
          {
            key: 'remove',
            label: 'Remove reference',
            description: 'Delete this link from the document',
            value: link.text
          }
        ];

        // Add similar file options if found
        for (const similar of similarFiles.slice(0, 2)) {
          options.push({
            key: 'replace',
            label: `Use ${similar}`,
            description: `Replace with existing file: ${similar}`,
            value: `${link.path}:${similar}`
          });
        }

        ambiguousCases.push({
          phase: 4,
          type: 'broken-link-missing',
          context: `Link [${link.text}](${link.path}) points to non-existent file`,
          options,
          linkText: link.text,
          linkPath: link.path,
          surroundingContext,
          similarFiles
        });
      }
    }

    // Write fixed content if changes were made and not dry-run
    if (fixedCount > 0 && !dryRun) {
      await fs.writeFile(path.join(skill.directory, 'SKILL.md'), content, 'utf-8');
    }

    return { fixedCount, ambiguousCases };
  }

  /**
   * Find files with similar names in the skill directory
   * Uses Levenshtein distance for fuzzy matching
   */
  private static async findSimilarFiles(skillDir: string, targetFilename: string): Promise<string[]> {
    const searchDirs = ['references', 'examples', 'templates', 'scripts'];
    const allFiles: string[] = [];

    // Collect all files from subdirectories
    for (const dir of searchDirs) {
      try {
        const dirPath = path.join(skillDir, dir);
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          allFiles.push(`${dir}/${file}`);
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    if (allFiles.length === 0) {
      return [];
    }

    // Calculate similarity scores
    const targetBase = path.basename(targetFilename, path.extname(targetFilename)).toLowerCase();
    const scored = allFiles.map(filePath => {
      const fileBase = path.basename(filePath, path.extname(filePath)).toLowerCase();
      const score = this.calculateSimilarity(targetBase, fileBase);
      return { filePath, score };
    });

    // Return files with >40% similarity, sorted by score
    return scored
      .filter(s => s.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .map(s => s.filePath);
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
   * Extract surrounding context around a link for Claude to understand intent
   */
  private static extractSurroundingContext(content: string, linkText: string, linkPath: string): string {
    const linkPattern = `[${linkText}](${linkPath})`;
    const index = content.indexOf(linkPattern);

    if (index === -1) {
      // Try escaped version
      const escapedPattern = `[${linkText}](${linkPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`;
      const escapedIndex = content.indexOf(escapedPattern);
      if (escapedIndex === -1) return '';
    }

    // Extract ~100 chars before and after
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + linkPattern.length + 100);
    let context = content.substring(start, end);

    // Clean up - remove partial words at boundaries
    if (start > 0) {
      const firstSpace = context.indexOf(' ');
      if (firstSpace > 0 && firstSpace < 20) {
        context = '...' + context.substring(firstSpace + 1);
      }
    }
    if (end < content.length) {
      const lastSpace = context.lastIndexOf(' ');
      if (lastSpace > context.length - 20) {
        context = context.substring(0, lastSpace) + '...';
      }
    }

    return context.trim();
  }

  /**
   * Apply a hybrid fix decision (called after user confirms)
   */
  static async applyHybridFix(
    skillPath: string,
    action: 'create' | 'remove' | 'replace',
    value: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const skillDir = path.dirname(skillPath);
      let content = await fs.readFile(skillPath, 'utf-8');

      switch (action) {
        case 'create': {
          // Create placeholder file
          const filePath = path.join(skillDir, value);
          const fileDir = path.dirname(filePath);
          await fs.mkdir(fileDir, { recursive: true });

          const filename = path.basename(value, path.extname(value));
          const placeholder = `# ${filename}\n\n<!-- TODO: Add content for this reference -->\n\nThis file was auto-generated as a placeholder.\n`;
          await fs.writeFile(filePath, placeholder, 'utf-8');
          return { success: true, message: `Created placeholder: ${value}` };
        }

        case 'remove': {
          // Remove the link reference (value is linkText)
          // Find and remove markdown links with this text
          const linkPattern = new RegExp(`\\[${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\([^)]+\\)`, 'g');
          const newContent = content.replace(linkPattern, value); // Replace link with just the text
          await fs.writeFile(skillPath, newContent, 'utf-8');
          return { success: true, message: `Removed link, kept text: "${value}"` };
        }

        case 'replace': {
          // Replace old path with new path (value is "oldPath:newPath")
          const [oldPath, newPath] = value.split(':');
          if (!oldPath || !newPath) {
            return { success: false, message: 'Invalid replace format. Expected "oldPath:newPath"' };
          }
          const newContent = content.replace(
            new RegExp(`\\]\\(${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g'),
            `](${newPath})`
          );
          await fs.writeFile(skillPath, newContent, 'utf-8');
          return { success: true, message: `Replaced ${oldPath} with ${newPath}` };
        }

        default:
          return { success: false, message: `Unknown action: ${action}` };
      }
    } catch (error) {
      return { success: false, message: `Failed to apply fix: ${error}` };
    }
  }

  /**
   * Run Phase 4 audit on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string, options?: any): Promise<PhaseResult> {
    let skillPaths = await SkillParser.findAllSkills(skillsDir);

    // Filter to single skill if specified
    if (options?.skillName) {
      skillPaths = skillPaths.filter(p => p.includes(`/${options.skillName}/SKILL.md`));
    }

    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills, options);
  }

  /**
   * Run Phase 4 audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[], options?: any): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    let issuesFixed = 0;
    const details: string[] = [];

    for (const skill of skills) {
      const issues = await this.validate(skill);

      if (issues.length > 0) {
        skillsAffected++;
        issuesFound += issues.length;

        details.push(`${skill.name}:`);

        // Auto-fix if enabled
        if (options?.autoFix && !options.dryRun) {
          const fixed = await this.fix(skill, options.dryRun);
          if (fixed > 0) {
            issuesFixed += fixed;
            details.push(`  ✓ Fixed ${fixed} broken link(s)`);
          }
        } else {
          for (const issue of issues) {
            details.push(`  - [${issue.severity}] ${issue.message}`);
            if (options?.dryRun && issue.autoFixable) {
              details.push(`    (would fix in non-dry-run mode)`);
            }
          }
        }
      }
    }

    return {
      phaseName: 'Phase 4: Broken Links',
      skillsAffected,
      issuesFound,
      issuesFixed,
      details,
    };
  }

  /**
   * Get link health statistics
   */
  static async getStatistics(skillsDir: string): Promise<{
    cleanLinks: number;
    brokenLinks: number;
    skillsWithBroken: number;
    total: number;
    percentage: number;
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let totalBrokenLinks = 0;
    let skillsWithBroken = 0;

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const issues = await this.validate(skill);

      const hasBroken = issues.some(issue => issue.message.includes('broken reference link'));

      if (hasBroken) {
        skillsWithBroken++;
        // Count how many broken links
        const brokenCount = issues.filter(issue => issue.message.startsWith('Broken:')).length;
        totalBrokenLinks += brokenCount;
      }
    }

    const total = skillPaths.length;
    const cleanLinks = total - skillsWithBroken;
    const percentage = total > 0 ? (cleanLinks / total) * 100 : 0;

    return {
      cleanLinks,
      brokenLinks: totalBrokenLinks,
      skillsWithBroken,
      total,
      percentage,
    };
  }
}
