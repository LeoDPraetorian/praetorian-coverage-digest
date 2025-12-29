/**
 * Phase 14c: Header Hierarchy
 * Validates markdown header structure:
 * - Single H1 (# Title) at top
 * - No skipped levels (H1 → H3 without H2)
 * - Consistent ATX style (# not underlines)
 * - No orphan headers (header with no following content)
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

interface HeaderInfo {
  level: number;
  text: string;
  line: number;
  style: 'atx' | 'setext';
}

export class Phase14cHeaderHierarchy {
  /**
   * Extract all headers from markdown content (outside code blocks)
   */
  private static extractHeaders(content: string): HeaderInfo[] {
    const headers: HeaderInfo[] = [];

    // Remove code blocks first
    const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, (match) => {
      // Replace with same number of newlines to preserve line numbers
      return '\n'.repeat(match.split('\n').length - 1);
    });

    const lines = withoutCodeBlocks.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1; // 1-indexed

      // ATX-style headers (# Header)
      const atxMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (atxMatch) {
        headers.push({
          level: atxMatch[1].length,
          text: atxMatch[2].trim(),
          line: lineNum,
          style: 'atx',
        });
        continue;
      }

      // Setext-style headers (underline with === or ---)
      // Check if next line is === or ---
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const currentText = line.trim();

        // Must have text on current line and underline on next
        if (currentText && /^=+\s*$/.test(nextLine)) {
          headers.push({
            level: 1,
            text: currentText,
            line: lineNum,
            style: 'setext',
          });
          continue;
        }

        if (currentText && /^-+\s*$/.test(nextLine) && nextLine.length >= 3) {
          // Setext H2 (---), but need to distinguish from horizontal rules
          // HR typically has no text above or is preceded by blank line
          if (currentText.length > 0) {
            headers.push({
              level: 2,
              text: currentText,
              line: lineNum,
              style: 'setext',
            });
            continue;
          }
        }
      }
    }

    return headers;
  }

  /**
   * Check for content between headers (returns list of orphan headers for consolidation)
   */
  private static findOrphanHeaders(content: string, headers: HeaderInfo[]): HeaderInfo[] {
    const orphans: HeaderInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < headers.length - 1; i++) {
      const currentHeader = headers[i];
      const nextHeader = headers[i + 1];

      // Check lines between this header and next
      const startLine = currentHeader.line;
      const endLine = nextHeader.line - 1;

      // Count non-empty, non-header lines
      let contentLines = 0;
      for (let lineNum = startLine + 1; lineNum <= endLine && lineNum <= lines.length; lineNum++) {
        const line = lines[lineNum - 1].trim();
        // Skip empty lines, code block markers, and setext underlines
        if (line && !line.startsWith('#') && !/^[=-]+$/.test(line) && !line.startsWith('```')) {
          contentLines++;
        }
      }

      if (contentLines === 0) {
        orphans.push(currentHeader);
      }
    }

    return orphans;
  }

  /**
   * Validate header hierarchy for a single skill
   * Returns consolidated issues with context
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];
    const headers = this.extractHeaders(skill.content);

    if (headers.length === 0) {
      issues.push({
        severity: 'WARNING',
        message: 'No headers found in skill',
        recommendation: 'Add at least an H1 header (# Title) at the top of the skill',
        autoFixable: false,
      });
      return issues;
    }

    // Collect header structure issues
    const structureIssues: string[] = [];

    // Check for setext-style headers (prefer ATX)
    const setextHeaders = headers.filter(h => h.style === 'setext');
    if (setextHeaders.length > 0) {
      structureIssues.push(`${setextHeaders.length} setext-style header(s) (prefer ATX style with #)`);
    }

    // Check for H1 headers
    const h1Headers = headers.filter(h => h.level === 1);
    if (h1Headers.length === 0) {
      issues.push({
        severity: 'WARNING',
        message: 'No H1 header (# Title) found',
        recommendation: 'Add a main title using # at the top',
        autoFixable: false,
      });
    } else if (h1Headers.length > 1) {
      structureIssues.push(`Multiple H1 headers: ${h1Headers.map(h => `"${h.text}"`).join(', ')}`);
    }

    // Check first header is H1
    if (headers[0].level !== 1) {
      issues.push({
        severity: 'WARNING',
        message: `First header is H${headers[0].level} ("${headers[0].text}") instead of H1`,
        recommendation: 'Change first header to H1 or add H1 title above it',
        line: headers[0].line,
        autoFixable: false,
      });
    }

    // Check for skipped levels - collect all and consolidate
    const skippedLevels: { line: number; from: number; to: number }[] = [];
    for (let i = 0; i < headers.length - 1; i++) {
      const current = headers[i];
      const next = headers[i + 1];
      if (next.level > current.level + 1) {
        skippedLevels.push({ line: next.line, from: current.level, to: next.level });
      }
    }

    if (skippedLevels.length > 0) {
      issues.push({
        severity: 'WARNING',
        message: `${skippedLevels.length} skipped header level(s) found`,
        recommendation: 'Fix header hierarchy - each level should increase by 1',
        context: skippedLevels.map(s => `Line ${s.line}: H${s.from} → H${s.to} (should be H${s.from + 1})`),
        autoFixable: true,
      });
    }

    // Check for orphan headers (headers with no content) - consolidated
    const orphanHeaders = this.findOrphanHeaders(skill.content, headers);
    if (orphanHeaders.length > 0) {
      issues.push({
        severity: 'INFO',
        message: `${orphanHeaders.length} header(s) have no content before next header`,
        recommendation: 'Add content under headers or remove empty sections',
        context: orphanHeaders.map(h => `Line ${h.line}: "${h.text}"`),
        autoFixable: false,
      });
    }

    // Check for very deep nesting (H5, H6)
    const deepHeaders = headers.filter(h => h.level >= 5);
    if (deepHeaders.length > 0) {
      issues.push({
        severity: 'INFO',
        message: `${deepHeaders.length} deeply nested header(s) (H5/H6) found`,
        recommendation: 'Consider restructuring to reduce nesting depth',
        context: deepHeaders.map(h => `Line ${h.line}: "${h.text}" (H${h.level})`),
        autoFixable: false,
      });
    }

    // Add structure issues as single INFO if any
    if (structureIssues.length > 0 && issues.filter(i => i.severity !== 'INFO').length === 0) {
      issues.push({
        severity: 'INFO',
        message: 'Minor header structure issues found',
        recommendation: 'Consider fixing for consistency',
        context: structureIssues,
        autoFixable: setextHeaders.length > 0,
      });
    }

    return issues;
  }

  /**
   * Run Phase 14c audit on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run Phase 14c audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[]): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skill of skills) {
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
      phaseName: 'Phase 14c: Header Hierarchy',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }
}
