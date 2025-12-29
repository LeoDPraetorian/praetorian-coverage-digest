/**
 * Phase 11: Command Example Audit
 * Validates bash command examples in SKILL.md use correct patterns
 *
 * Detects:
 * - CRITICAL: --prefix .claude/skills/skill-name without /scripts suffix
 * - WARNING: cd .claude/skills/... without repo-root detection
 * - WARNING: npm run --prefix with relative path assuming cwd is repo root
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { Issue, PhaseResult } from '../types.js';

export class Phase11CommandAudit {
  /**
   * Check if a line is in a "WRONG" example context
   */
  private static isInWrongExample(lines: string[], lineIndex: number): boolean {
    // Look back up to 5 lines for "WRONG" or "❌" markers
    for (let i = Math.max(0, lineIndex - 5); i <= lineIndex; i++) {
      const line = lines[i];
      if (line.includes('WRONG') || line.includes('❌') || line.includes('breaks') || line.includes('Problem')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if line has repo-root detection on same or preceding line
   */
  private static hasRepoRootDetection(lines: string[], lineIndex: number): boolean {
    const currentLine = lines[lineIndex];

    // Check current line
    if (currentLine.includes('REPO_ROOT=') || currentLine.includes('$REPO_ROOT')) {
      return true;
    }

    // Check preceding line
    if (lineIndex > 0) {
      const prevLine = lines[lineIndex - 1];
      if (prevLine.includes('REPO_ROOT=')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if line is inside a code block
   */
  private static isInCodeBlock(lines: string[], lineIndex: number): boolean {
    let inCodeBlock = false;
    for (let i = 0; i < lineIndex; i++) {
      if (lines[i].trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
      }
    }
    return inCodeBlock;
  }

  /**
   * Validate a single skill for command pattern issues
   */
  static async validate(skill: { name: string; directory: string; content: string }): Promise<Issue[]> {
    const issues: Issue[] = [];
    const lines = skill.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Skip if in a "WRONG" example context
      if (this.isInWrongExample(lines, i)) {
        continue;
      }

      // Skip if not in a code block (only audit actual commands)
      if (!this.isInCodeBlock(lines, i)) {
        continue;
      }

      // Rule 1: CRITICAL - --prefix without /scripts suffix
      const prefixMatch = line.match(/--prefix\s+(\.claude\/skills\/[^\s/"']+)(?!\/scripts)/);
      if (prefixMatch) {
        const badPath = prefixMatch[1];
        // Make sure it's not already pointing to /scripts
        if (!badPath.endsWith('/scripts')) {
          issues.push({
            severity: 'CRITICAL',
            message: `Line ${lineNumber}: --prefix path "${badPath}" missing /scripts suffix - npm will fail to find package.json`,
            autoFixable: false,
          });
        }
      }

      // Rule 2: WARNING - cd .claude/skills without repo-root detection
      if (line.match(/\bcd\s+["']?\.claude\/skills\//) && !this.hasRepoRootDetection(lines, i)) {
        const cdMatch = line.match(/cd\s+["']?(\.claude\/skills\/[^\s"'&;]+)/);
        if (cdMatch) {
          const cdPath = cdMatch[1];
          issues.push({
            severity: 'WARNING',
            message: `Line ${lineNumber}: cd to "${cdPath}" without repo-root detection - breaks in submodules`,
            autoFixable: false,
          });
        }
      }

      // Rule 3: WARNING - npm run --prefix without REPO_ROOT
      if (line.match(/npm\s+run\s+--prefix\s+\.claude\//) && !this.hasRepoRootDetection(lines, i)) {
        issues.push({
          severity: 'WARNING',
          message: `Line ${lineNumber}: npm --prefix with relative path - breaks when cwd is not repo root`,
          autoFixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Run phase on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    // Get all skill directories
    let entries;
    try {
      entries = await fs.readdir(skillsDir, { withFileTypes: true });
    } catch {
      return {
        phaseName: 'Phase 11: Command Example Audit',
        skillsAffected: 0,
        issuesFound: 0,
        issuesFixed: 0,
        details: ['[ERROR] Could not read skills directory'],
      };
    }

    const skillDirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'lib' && e.name !== 'node_modules')
      .map(e => e.name);

    const skills: Array<{ name: string; directory: string; content: string }> = [];
    for (const skillName of skillDirs) {
      const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        skills.push({
          name: skillName,
          directory: path.join(skillsDir, skillName),
          content,
        });
      } catch {
        continue; // Skip if no SKILL.md
      }
    }

    return this.runOnParsedSkills(skills);
  }

  /**
   * Run phase on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: Array<{ name: string; directory: string; content: string }>): Promise<PhaseResult> {
    const result: PhaseResult = {
      phaseName: 'Phase 11: Command Example Audit',
      skillsAffected: 0,
      issuesFound: 0,
      issuesFixed: 0,
      details: [],
    };

    for (const skill of skills) {
      const issues = await this.validate(skill);

      if (issues.length > 0) {
        result.skillsAffected++;
        result.issuesFound += issues.length;
        result.details.push(`${skill.name}:`);

        for (const issue of issues) {
          result.details.push(`  - [${issue.severity}] ${issue.message}`);
        }
      }
    }

    if (result.skillsAffected === 0) {
      result.details.push('[INFO] No command pattern issues found');
    }

    return result;
  }
}
