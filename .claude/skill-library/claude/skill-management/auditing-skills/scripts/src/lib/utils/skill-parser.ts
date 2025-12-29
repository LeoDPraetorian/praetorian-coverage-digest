/**
 * Skill file parser using gray-matter for frontmatter
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import type { SkillFile, SkillFrontmatter, SkillType } from '../types.js';

export class SkillParser {
  /**
   * Detect skill type based on content heuristics
   */
  static detectSkillType(content: string, frontmatter: SkillFrontmatter): SkillType {
    // Frontmatter override takes precedence
    if (frontmatter['skill-type']) {
      return frontmatter['skill-type'] as SkillType;
    }

    // Heuristic: Look for CLI execution patterns
    const cliPatterns = [
      /npm run (audit|fix|validate|dev)/,
      /scripts\/[a-z-]+\.(?:ts|js)/,
      /\$REPO_ROOT.*npm run/,
      /# Navigate to.*npm run/,
    ];

    const hasCliPatterns = cliPatterns.some(pattern => pattern.test(content));

    // Heuristic: Look for scripts/ directory references
    const hasScriptsDirectory = /scripts\//.test(content);

    // Heuristic: Check for "Run:" or "Execute:" command blocks
    const hasCommandBlocks = /(?:Run|Execute):\s*```bash/.test(content);

    // Tool wrapper if strong CLI indicators present
    if (hasCliPatterns && hasScriptsDirectory && hasCommandBlocks) {
      return 'tool-wrapper';
    }

    // Heuristic: Look for process/workflow keywords
    const reasoningPatterns = [
      /## (?:Process|Workflow|Steps|Phase \d+)/i,
      /RED.*GREEN.*REFACTOR/i,
      /(?:first|then|next|finally|step \d+)/gi,
    ];

    const hasReasoningPatterns = reasoningPatterns.some(pattern => pattern.test(content));

    // Reasoning skill if multi-step process indicators
    if (hasReasoningPatterns && !hasCliPatterns) {
      return 'reasoning';
    }

    // Hybrid if both patterns present
    if (hasReasoningPatterns && hasCliPatterns) {
      return 'hybrid';
    }

    // Default: reasoning (conservative - assume needs more detail)
    return 'reasoning';
  }

  /**
   * Parse a single SKILL.md file
   */
  static async parseSkillFile(skillPath: string): Promise<SkillFile> {
    const content = await fs.readFile(skillPath, 'utf-8');
    const directory = path.dirname(skillPath);
    const skillName = path.basename(directory);

    try {
      const { data, content: markdownContent } = matter(content);

      const wordCount = this.countWords(markdownContent);
      const lineCount = this.countLines(content);  // Count lines of full file (including frontmatter)
      const skillType = this.detectSkillType(markdownContent, data as SkillFrontmatter);

      return {
        path: skillPath,
        directory,
        name: skillName,
        frontmatter: data as SkillFrontmatter,
        content: markdownContent,
        wordCount,
        lineCount,
        skillType,
      };
    } catch (error) {
      // YAML parsing failed - return with error in frontmatter
      console.warn(`Warning: Failed to parse YAML frontmatter in ${skillName}: ${error}`);

      const frontmatter = {
        name: skillName,
        description: 'YAML_PARSE_ERROR',
      };

      return {
        path: skillPath,
        directory,
        name: skillName,
        frontmatter,
        content: content,
        wordCount: this.countWords(content),
        lineCount: this.countLines(content),
        skillType: this.detectSkillType(content, frontmatter),
      };
    }
  }

  /**
   * Find all SKILL.md files in the skills directory
   */
  static async findAllSkills(skillsDir: string): Promise<string[]> {
    const skills: string[] = [];

    async function walk(dir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip nested .claude directories
        if (entry.isDirectory() && entry.name === '.claude') {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name === 'SKILL.md') {
          skills.push(fullPath);
        }
      }
    }

    await walk(skillsDir);
    return skills.sort();
  }

  /**
   * Count words in markdown content
   */
  static countWords(content: string): number {
    // Remove code blocks
    const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');

    // Remove inline code
    const withoutInlineCode = withoutCodeBlocks.replace(/`[^`]*`/g, '');

    // Remove links but keep text
    const withoutLinks = withoutInlineCode.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Count words
    const words = withoutLinks
      .split(/\s+/)
      .filter((word) => word.length > 0 && !/^[^\w]*$/.test(word));

    return words.length;
  }

  /**
   * Count lines in content (for Phase 3 validation)
   * Anthropic recommends keeping SKILL.md under 500 lines for optimal performance
   */
  static countLines(content: string): number {
    return content.split('\n').length;
  }

  /**
   * Update frontmatter in a SKILL.md file
   */
  static async updateFrontmatter(
    skillPath: string,
    updates: Partial<SkillFrontmatter>
  ): Promise<void> {
    const content = await fs.readFile(skillPath, 'utf-8');
    const parsed = matter(content);

    // Merge updates
    const newData = { ...parsed.data, ...updates };

    // Rebuild file with updated frontmatter
    const updated = matter.stringify(parsed.content, newData);

    await fs.writeFile(skillPath, updated, 'utf-8');
  }

  /**
   * Get all orphaned .md files at skill root (excluding SKILL.md and README.md)
   */
  static async findOrphanedFiles(skillDir: string): Promise<string[]> {
    const entries = await fs.readdir(skillDir, { withFileTypes: true });
    const orphans: string[] = [];

    for (const entry of entries) {
      if (
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        entry.name !== 'SKILL.md' &&
        entry.name !== 'README.md'
      ) {
        orphans.push(path.join(skillDir, entry.name));
      }
    }

    return orphans;
  }

  /**
   * Extract markdown links from content (excluding links inside code blocks)
   */
  static extractMarkdownLinks(content: string): Array<{ text: string; path: string }> {
    // Remove fenced code blocks (```...```) before extracting links
    // This prevents false positives from example code
    const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');

    // Also remove inline code (`...`)
    const withoutInlineCode = withoutCodeBlocks.replace(/`[^`]*`/g, '');

    const linkRegex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
    const links: Array<{ text: string; path: string }> = [];
    let match;

    while ((match = linkRegex.exec(withoutInlineCode)) !== null) {
      links.push({
        text: match[1],
        path: match[2],
      });
    }

    return links;
  }

  /**
   * Check if a linked file exists
   */
  static async checkLinkExists(skillDir: string, linkPath: string): Promise<boolean> {
    const fullPath = path.join(skillDir, linkPath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
