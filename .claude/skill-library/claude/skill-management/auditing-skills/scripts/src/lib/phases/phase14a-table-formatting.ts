/**
 * Phase 14a: Markdown Table Formatting
 * Validates markdown tables for proper structure and formatting:
 * - Tables have header row with separators (|---|---|)
 * - Column count is consistent across all rows
 * - No broken/malformed table syntax
 * - Alignment indicators are valid (:---, :---:, ---:)
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

interface TableInfo {
  startLine: number;
  endLine: number;
  headerRow: string;
  separatorRow: string;
  dataRows: string[];
  columnCount: number;
}

export class Phase14aTableFormatting {
  /**
   * Extract all tables from markdown content
   */
  private static extractTables(content: string): TableInfo[] {
    const lines = content.split('\n');
    const tables: TableInfo[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check if this line looks like a table header (contains |)
      if (this.isTableRow(line)) {
        // Check if next line is a separator row
        const nextLine = lines[i + 1];
        if (nextLine && this.isSeparatorRow(nextLine)) {
          // Found a table, collect all rows
          const startLine = i + 1; // 1-indexed
          const headerRow = line;
          const separatorRow = nextLine;
          const dataRows: string[] = [];
          const headerColumnCount = this.countColumns(headerRow);

          let j = i + 2;
          while (j < lines.length && this.isTableRow(lines[j])) {
            dataRows.push(lines[j]);
            j++;
          }

          tables.push({
            startLine,
            endLine: j, // 1-indexed end
            headerRow,
            separatorRow,
            dataRows,
            columnCount: headerColumnCount,
          });

          i = j;
          continue;
        }
      }
      i++;
    }

    return tables;
  }

  /**
   * Check if a line looks like a table row
   */
  private static isTableRow(line: string): boolean {
    const trimmed = line.trim();
    // Must start with | or contain | and have content
    return trimmed.includes('|') && trimmed.length > 1;
  }

  /**
   * Check if a line is a separator row (|---|---|)
   */
  private static isSeparatorRow(line: string): boolean {
    const trimmed = line.trim();
    // Separator row should only contain |, -, :, and whitespace
    return /^\|?[\s\-:|]+\|?$/.test(trimmed) && trimmed.includes('-');
  }

  /**
   * Count columns in a table row
   */
  private static countColumns(row: string): number {
    const trimmed = row.trim();
    // Split by | and filter out empty strings from leading/trailing pipes
    const cells = trimmed.split('|').filter((cell, index, arr) => {
      // Keep non-empty cells, but filter edge empties from | at start/end
      if (index === 0 && cell.trim() === '') return false;
      if (index === arr.length - 1 && cell.trim() === '') return false;
      return true;
    });
    return cells.length;
  }

  /**
   * Validate separator row alignment indicators
   */
  private static validateSeparatorRow(separatorRow: string): Issue[] {
    const issues: Issue[] = [];
    const cells = separatorRow.split('|').filter(c => c.trim() !== '');

    for (const cell of cells) {
      const trimmed = cell.trim();
      // Valid patterns: ---, :---, ---:, :---:
      if (!/^:?-+:?$/.test(trimmed)) {
        issues.push({
          severity: 'WARNING',
          message: `Invalid separator cell: "${trimmed}" (expected pattern like ---, :---, ---:, or :---:)`,
          autoFixable: true,
        });
      }
    }

    return issues;
  }

  /**
   * Validate a single table
   */
  private static validateTable(table: TableInfo): Issue[] {
    const issues: Issue[] = [];

    // Check separator row validity
    const separatorIssues = this.validateSeparatorRow(table.separatorRow);
    for (const issue of separatorIssues) {
      issue.line = table.startLine + 1;
      issues.push(issue);
    }

    // Check separator column count matches header
    const separatorColumnCount = this.countColumns(table.separatorRow);
    if (separatorColumnCount !== table.columnCount) {
      issues.push({
        severity: 'CRITICAL',
        message: `Table separator row has ${separatorColumnCount} columns but header has ${table.columnCount} columns (line ${table.startLine + 1})`,
        line: table.startLine + 1,
        autoFixable: false,
      });
    }

    // Check each data row column count
    for (let i = 0; i < table.dataRows.length; i++) {
      const row = table.dataRows[i];
      const rowColumnCount = this.countColumns(row);
      const lineNum = table.startLine + 2 + i;

      if (rowColumnCount !== table.columnCount) {
        issues.push({
          severity: 'WARNING',
          message: `Table row has ${rowColumnCount} columns but header has ${table.columnCount} columns (line ${lineNum})`,
          line: lineNum,
          autoFixable: false,
        });
      }
    }

    // Check for empty header cells
    const headerCells = table.headerRow.split('|').filter(c => c.trim() !== '');
    const emptyHeaders = headerCells.filter(c => c.trim() === '');
    if (emptyHeaders.length > 0) {
      issues.push({
        severity: 'INFO',
        message: `Table has ${emptyHeaders.length} empty header cell(s) (line ${table.startLine})`,
        line: table.startLine,
        autoFixable: false,
      });
    }

    return issues;
  }

  /**
   * Validate table formatting for a single skill
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];

    // Extract tables from content (not code blocks)
    const contentWithoutCodeBlocks = skill.content.replace(/```[\s\S]*?```/g, '');
    const tables = this.extractTables(contentWithoutCodeBlocks);

    if (tables.length === 0) {
      // No tables - that's fine, just info
      return [];
    }

    // Validate each table
    for (const table of tables) {
      const tableIssues = this.validateTable(table);
      issues.push(...tableIssues);
    }

    // Add summary if all tables are valid
    if (issues.length === 0 && tables.length > 0) {
      issues.push({
        severity: 'INFO',
        message: `Found ${tables.length} well-formatted table(s)`,
        autoFixable: false,
      });
    }

    return issues;
  }

  /**
   * Run Phase 14a audit on all skills
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const issues = this.validate(skill);

      // Only count as affected if there are warnings or criticals
      const significantIssues = issues.filter(i => i.severity !== 'INFO');

      if (significantIssues.length > 0) {
        skillsAffected++;
        issuesFound += significantIssues.length;

        details.push(`${skill.name}:`);
        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);
        }
      }
    }

    return {
      phaseName: 'Phase 14a: Table Formatting',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }
}
