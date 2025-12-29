/**
 * Phase 21: Line Number Reference Detection
 *
 * Detects static line number references in code examples and markdown links.
 * Line numbers create maintenance debt as they become outdated with code changes.
 *
 * **Validates:**
 * - No `:123` or `:123-127` patterns in file references
 * - No `file.go:123` or `file.ts:456-789` patterns
 *
 * **Rationale:**
 * - Line numbers drift with every code change (inserts, deletions, refactors)
 * - Creates false precision that requires constant maintenance
 * - Method signatures and structural descriptions are more durable
 *
 * **Recommended patterns:**
 * - ✅ `file.go` - `func (t *Type) MethodName(...)`
 * - ✅ `file.go` (between Match() and Invoke() methods)
 * - ❌ `file.go:123-127` (becomes outdated)
 *
 * @see `.claude/skills/managing-skills/references/patterns/code-reference-patterns.md`
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

/**
 * Pattern to detect line number references:
 * - file.ext:123
 * - file.ext:123-456
 * - (file.ext:123)
 * - `file.ext:123-456`
 *
 * Matches:
 * - Any file extension followed by colon and numbers
 * - Single line: :123
 * - Line range: :123-456
 * - With or without backticks/parentheses
 */
const LINE_NUMBER_PATTERN = /([a-zA-Z0-9_\-\/\.]+\.[a-z]+):(\d+)(-\d+)?/g;

/**
 * Exceptions - patterns that look like line numbers but aren't:
 * - URLs with ports: https://localhost:3000
 * - Docker ports: container:8080
 * - IPv6 addresses
 * - Time formats: 12:30
 */
const EXCEPTION_PATTERNS = [
  /https?:\/\/[^\s]+:\d+/g,        // URLs with ports
  /\b[a-z]+:\d{2,5}\b/g,           // Service:port (e.g., postgres:5432)
  /\d{1,2}:\d{2}(:\d{2})?/g,       // Time format 12:30 or 12:30:45
  /\[[0-9a-fA-F:]+\]/g,            // IPv6 addresses
];

interface LineNumberMatch {
  filePath: string;
  lineNumber: string;
  lineRange?: string;
  fullMatch: string;
  lineNum: number;
  context: string;
}

function isException(text: string): boolean {
  return EXCEPTION_PATTERNS.some(pattern => pattern.test(text));
}

function extractLineNumberReferences(content: string): LineNumberMatch[] {
  const lines = content.split('\n');
  const matches: LineNumberMatch[] = [];

  lines.forEach((line, index) => {
    // Skip if line contains exception patterns
    if (isException(line)) {
      return;
    }

    // Find all line number patterns in this line
    const lineMatches = Array.from(line.matchAll(LINE_NUMBER_PATTERN));

    for (const match of lineMatches) {
      const [fullMatch, filePath, lineNumber, lineRange] = match;

      // Additional validation: file should have common code extension
      const validExtensions = ['.go', '.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.java', '.rs', '.c', '.cpp', '.h'];
      const hasValidExtension = validExtensions.some(ext => filePath.endsWith(ext));

      if (hasValidExtension) {
        matches.push({
          filePath,
          lineNumber,
          lineRange: lineRange?.substring(1), // Remove leading dash
          fullMatch,
          lineNum: index + 1,
          context: line.trim(),
        });
      }
    }
  });

  return matches;
}

function generateIssues(skill: SkillFile, matches: LineNumberMatch[]): Issue[] {
  if (matches.length === 0) {
    return [];
  }

  // Consolidate all line number references into a single issue with context
  return [{
    severity: 'WARNING',
    message: `${matches.length} line number reference(s) detected - use method signatures instead`,
    recommendation: 'Replace line numbers with method signatures or structural descriptions',
    context: matches.map(m =>
      `Line ${m.lineNum}: ${m.fullMatch} → use "${m.filePath}" - func MethodName(...)`
    ),
    autoFixable: false,
  }];
}

export class Phase21LineNumberReferences {
  /**
   * Run phase on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run phase on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[]): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skill of skills) {
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
      phaseName: 'Phase 21: Line Number References',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }

  /**
   * Validate a single skill
   */
  static validate(skill: SkillFile): Issue[] {
    const content = skill.content || '';
    const matches = extractLineNumberReferences(content);

    if (matches.length === 0) {
      return [];
    }

    return generateIssues(skill, matches);
  }
}
