/**
 * Phase 18: Routing Table Format Validation
 * Validates gateway routing tables show full paths, not just skill names
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

/**
 * Represents a table row with position metadata for accurate header detection
 */
interface TableRow {
  /** The raw content of the row */
  content: string;
  /** Which table this row belongs to (0-indexed, for files with multiple tables) */
  tableIndex: number;
  /** Position within the table: 0=header, 1=separator, 2+=data rows */
  rowIndex: number;
}

export class Phase18RoutingTableFormat {
  /**
   * Check if skill is a gateway skill
   */
  private static isGatewaySkill(skill: SkillFile): boolean {
    return skill.name.startsWith('gateway-');
  }

  /**
   * Extract table rows from markdown content with position metadata.
   * Uses position-based detection to accurately identify header vs data rows.
   *
   * Row positions within each table:
   * - rowIndex 0: Header row (e.g., "| Need | Skill Path |")
   * - rowIndex 1: Separator row (e.g., "|------|------------|")
   * - rowIndex 2+: Data rows (should contain full paths)
   */
  private static extractTableRows(content: string): TableRow[] {
    const rows: TableRow[] = [];
    const lines = content.split('\n');
    let inTable = false;
    let currentTableIndex = -1;
    let currentRowIndex = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect table row (starts and ends with |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (!inTable) {
          // Starting a new table
          inTable = true;
          currentTableIndex++;
          currentRowIndex = 0;
        }
        rows.push({
          content: trimmed,
          tableIndex: currentTableIndex,
          rowIndex: currentRowIndex,
        });
        currentRowIndex++;
      } else if (inTable) {
        // Table ended (non-table line encountered)
        inTable = false;
      }
    }

    return rows;
  }

  /**
   * Check if a table row contains a full path (not just skill name)
   */
  private static hasFullPath(row: string): boolean {
    // Full path pattern: .claude/skill-library/.../SKILL.md
    return /\.claude\/skill-library\/[^|]+SKILL\.md/i.test(row);
  }

  /**
   * Check if a table row is a data row that should contain a path.
   * Uses position-based detection: rows at index 0 (header) and 1 (separator)
   * are skipped; rows at index 2+ are data rows.
   */
  private static isDataRow(row: TableRow): boolean {
    // Header row (index 0) and separator row (index 1) are not data rows
    // Data rows start at index 2
    return row.rowIndex >= 2;
  }

  /**
   * Validate routing table format for a single skill
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];

    // Only validate gateway skills
    if (!this.isGatewaySkill(skill)) {
      return issues;
    }

    const { content } = skill;
    const tableRows = this.extractTableRows(content);

    if (tableRows.length === 0) {
      issues.push({
        severity: 'CRITICAL',
        message: 'Gateway has no routing tables',
        autoFixable: false,
      });
      return issues;
    }

    // Check each DATA row for proper path format
    // Uses position-based filtering: only rows at index 2+ are data rows
    let rowsWithoutPaths = 0;
    const problematicRows: string[] = [];

    for (const row of tableRows) {
      // Skip header (index 0) and separator (index 1) rows using position-based detection
      if (!this.isDataRow(row)) {
        continue;
      }

      // Data rows should contain full paths
      if (!this.hasFullPath(row.content)) {
        rowsWithoutPaths++;
        // Extract first 50 chars for context
        const preview = row.content.substring(0, 50).replace(/\|/g, ' | ');
        problematicRows.push(preview);
      }
    }

    if (rowsWithoutPaths > 0) {
      issues.push({
        severity: 'CRITICAL',
        message: `Found ${rowsWithoutPaths} table row(s) without full paths (should be .claude/skill-library/.../SKILL.md)`,
        autoFixable: true, // Can auto-convert skill names to paths
      });

      if (problematicRows.length > 0) {
        issues.push({
          severity: 'INFO',
          message: `Example rows: ${problematicRows.slice(0, 3).join('; ')}`,
          autoFixable: false,
        });
      }
    }

    // Check for proper path format (starts with .claude/skill-library/)
    const pathPattern = /\.claude\/skill-library\/[\w-]+\/[\w-]+\/[\w-]+\/SKILL\.md/g;
    const paths = content.match(pathPattern) || [];
    const shortPaths = paths.filter(p => !p.includes('/'));

    if (shortPaths.length > 0) {
      issues.push({
        severity: 'WARNING',
        message: `Found ${shortPaths.length} path(s) that may be too short (should include category/domain/skill)`,
        autoFixable: false,
      });
    }

    return issues;
  }

  /**
   * Fix routing table paths by expanding skill names to full paths
   * Returns number of paths expanded
   */
  static async fix(skill: SkillFile, dryRun: boolean = false): Promise<number> {
    if (!this.isGatewaySkill(skill)) {
      return 0; // Only fix gateway skills
    }

    const { findSkill } = await import('../skill-finder.js');
    const tableRows = this.extractTableRows(skill.content);
    let pathsExpanded = 0;
    let content = skill.content;

    // Process each data row
    for (const row of tableRows) {
      if (!this.isDataRow(row)) {
        continue; // Skip header and separator rows
      }

      // Check if row needs fixing (doesn't have full path)
      if (!this.hasFullPath(row.content)) {
        // Extract potential skill name from row
        // Common patterns: "skill-name", "`skill-name`", "some-skill"
        const skillNameMatch = row.content.match(/[a-z][a-z0-9-]+(?:-[a-z0-9]+)+/i);

        if (skillNameMatch) {
          const skillName = skillNameMatch[0];
          const foundSkill = findSkill(skillName);

          if (foundSkill) {
            // Replace skill name with full path
            const fullPath = foundSkill.path.replace(
              /.*\/(\.claude\/skill-library\/.*)$/,
              '$1'
            );

            // Replace in content (only this specific row occurrence)
            content = content.replace(row.content, row.content.replace(skillName, fullPath));
            pathsExpanded++;
          }
        }
      }
    }

    // Write changes if not dry run and paths were expanded
    if (!dryRun && pathsExpanded > 0) {
      const fs = await import('fs/promises');
      await fs.writeFile(skill.path, content, 'utf-8');
    }

    return pathsExpanded;
  }

  /**
   * Run Phase 18 audit on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run Phase 18 audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[]): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skill of skills) {
      // Only audit gateway skills
      if (!this.isGatewaySkill(skill)) {
        continue;
      }

      const issues = this.validate(skill);

      if (issues.length > 0) {
        skillsAffected++;
        issuesFound += issues.length;

        details.push(`${skill.name}:`);
        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);
        }
      }
    }

    return {
      phaseName: 'Phase 18: Routing Table Format',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }
}
