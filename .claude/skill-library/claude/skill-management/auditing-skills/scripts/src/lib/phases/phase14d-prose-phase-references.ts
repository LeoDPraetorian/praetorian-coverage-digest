/**
 * Phase 14d: Prose Phase References
 * Detects stale prose phase references after phase renumbering.
 *
 * Problem: When skills with numbered phases get refactored (phases added/removed/renumbered),
 * markdown link syntax like `[Phase 3](phase-3-file.md)` is caught by Phase 4 (Broken Links),
 * but prose references like "Return to Phase 4 (implementation)" are NOT detected.
 *
 * This phase validates prose phase references against the canonical phase list in SKILL.md.
 *
 * Detection:
 * - Extracts canonical phase map from SKILL.md (Quick Reference table or ## Phase N: headings)
 * - Scans all skill files for prose references: "Phase N (name)" or "Phase N:"
 * - Validates phase number exists and name hint matches
 *
 * Exclusions:
 * - .history/CHANGELOG files (historical references are correct for their time)
 * - Code blocks (might be examples from other systems)
 * - Cross-skill references (e.g., "threat-modeling Phase 3")
 *
 * Severity: WARNING (prose references don't break functionality)
 * Fix support: Validation-Only (requires semantic understanding)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

interface PhaseInfo {
  number: number;
  name: string;
  source: string; // Where we found this phase definition
}

interface ProseReference {
  file: string;
  line: number;
  phaseNumber: number;
  nameHint?: string;
  fullMatch: string;
}

export class Phase14dProsePhaseReferences {
  /**
   * Extract canonical phase list from SKILL.md
   * Looks in order: Quick Reference table, then ## Phase N: headings
   */
  private static extractCanonicalPhases(skillContent: string): Map<number, PhaseInfo> {
    const phases = new Map<number, PhaseInfo>();

    // Try Quick Reference table first (format: "| 0: Setup |" or "| 1: Brainstorming |")
    const tablePattern = /^\|\s*(\d+):\s*([^|]+?)\s*\|/gm;
    let match;
    while ((match = tablePattern.exec(skillContent)) !== null) {
      const phaseNum = parseInt(match[1], 10);
      const phaseName = match[2].trim();
      phases.set(phaseNum, {
        number: phaseNum,
        name: phaseName,
        source: 'Quick Reference table',
      });
    }

    // If no table found, try ## Phase N: headings
    if (phases.size === 0) {
      const headingPattern = /^##\s+Phase\s+(\d+):\s*(.+?)$/gm;
      while ((match = headingPattern.exec(skillContent)) !== null) {
        const phaseNum = parseInt(match[1], 10);
        const phaseName = match[2].trim();
        phases.set(phaseNum, {
          number: phaseNum,
          name: phaseName,
          source: 'Phase heading',
        });
      }
    }

    return phases;
  }

  /**
   * Find prose phase references in a file
   * Pattern: "Phase N (name)" or "Phase N:" where N is a number
   *
   * Excludes:
   * - Code blocks (``` fenced blocks)
   * - Cross-skill references (contains another skill name before "Phase")
   */
  private static async findProseReferences(
    filePath: string,
    skillName: string
  ): Promise<ProseReference[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const references: ProseReference[] = [];

    // Remove code blocks first to avoid false positives
    let cleanContent = content;
    const codeBlockPattern = /```[\s\S]*?```/g;
    const codeBlocks: Array<{ start: number; end: number }> = [];
    let match;

    while ((match = codeBlockPattern.exec(content)) !== null) {
      codeBlocks.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Helper to check if position is in a code block
    const isInCodeBlock = (pos: number): boolean => {
      return codeBlocks.some(block => pos >= block.start && pos < block.end);
    };

    // Pattern: "Phase N" followed by optional space and ( or :
    // Captures: "Phase 4 (implementation)" or "Phase 3:" or "Phase 2 (planning)"
    const prosePattern = /Phase\s+(\d+)(?:\s*[\(:]\s*([^)\n]+)?)?/gi;

    const lines = content.split('\n');
    let currentPos = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = currentPos;
      currentPos += line.length + 1; // +1 for newline

      // Reset regex state
      prosePattern.lastIndex = 0;

      while ((match = prosePattern.exec(line)) !== null) {
        const matchPos = lineStart + match.index;

        // Skip if in code block
        if (isInCodeBlock(matchPos)) {
          continue;
        }

        // Check for cross-skill reference (another skill name before "Phase")
        const beforeMatch = line.substring(0, match.index).toLowerCase();
        const otherSkillNames = ['threat-modeling', 'orchestrating', 'brainstorming', 'debugging'];
        const isCrossSkill = otherSkillNames.some(name =>
          beforeMatch.includes(name) && name !== skillName.toLowerCase()
        );

        if (isCrossSkill) {
          continue;
        }

        const phaseNum = parseInt(match[1], 10);
        const nameHint = match[2] ? match[2].trim().replace(/\)$/, '') : undefined;

        references.push({
          file: path.basename(filePath),
          line: i + 1,
          phaseNumber: phaseNum,
          nameHint,
          fullMatch: match[0],
        });
      }
    }

    return references;
  }

  /**
   * Validate a prose reference against canonical phases
   * Returns null if valid, error message if invalid
   */
  private static validateReference(
    ref: ProseReference,
    phases: Map<number, PhaseInfo>
  ): string | null {
    const canonicalPhase = phases.get(ref.phaseNumber);

    if (!canonicalPhase) {
      return `Phase ${ref.phaseNumber} doesn't exist (valid phases: ${Array.from(phases.keys()).join(', ')})`;
    }

    // If there's a name hint, check if it matches (case-insensitive, fuzzy)
    if (ref.nameHint) {
      const hintLower = ref.nameHint.toLowerCase();
      const nameLower = canonicalPhase.name.toLowerCase();

      // Check for exact match or partial match
      const isMatch = nameLower.includes(hintLower) || hintLower.includes(nameLower);

      if (!isMatch) {
        return `Phase ${ref.phaseNumber} is "${canonicalPhase.name}", not "${ref.nameHint}"`;
      }
    }

    return null;
  }

  /**
   * Validate prose phase references for a single skill
   */
  static async validate(skill: SkillFile): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Extract canonical phase list from SKILL.md
    const phases = this.extractCanonicalPhases(skill.content);

    if (phases.size === 0) {
      // No phases defined - this skill doesn't use numbered phases
      return issues;
    }

    // Find all files in the skill directory (SKILL.md + references/*)
    const filesToScan: string[] = [path.join(skill.directory, 'SKILL.md')];

    // Add reference files if they exist
    const refsDir = path.join(skill.directory, 'references');
    try {
      const refFiles = await fs.readdir(refsDir);
      for (const file of refFiles) {
        // Skip .history/CHANGELOG (historical references are correct)
        if (file === '.history' || file === 'CHANGELOG') continue;

        const filePath = path.join(refsDir, file);
        const stat = await fs.stat(filePath);

        if (stat.isFile() && (file.endsWith('.md') || file.endsWith('.txt'))) {
          filesToScan.push(filePath);
        }
      }
    } catch {
      // references/ directory doesn't exist, that's fine
    }

    // Scan all files for prose references
    const allReferences: ProseReference[] = [];
    for (const filePath of filesToScan) {
      try {
        const refs = await this.findProseReferences(filePath, skill.name);
        allReferences.push(...refs);
      } catch {
        // File read error, skip
      }
    }

    if (allReferences.length === 0) {
      return issues;
    }

    // Validate each reference
    const staleReferences: Array<{ ref: ProseReference; error: string }> = [];

    for (const ref of allReferences) {
      const error = this.validateReference(ref, phases);
      if (error) {
        staleReferences.push({ ref, error });
      }
    }

    // Create consolidated issue if stale references found
    if (staleReferences.length > 0) {
      const context = staleReferences.map(({ ref, error }) => {
        return `${ref.file}:${ref.line} - '${ref.fullMatch}' - ${error}`;
      });

      // Group by suggestion to help with fixing
      const suggestions = new Map<string, number>();
      for (const { error } of staleReferences) {
        suggestions.set(error, (suggestions.get(error) || 0) + 1);
      }

      const recommendation = [
        'Update prose phase references to match canonical phase names:',
        ...Array.from(suggestions.entries()).map(([msg]) => `  - ${msg}`),
      ].join('\n');

      issues.push({
        severity: 'WARNING',
        message: `${staleReferences.length} stale phase reference(s) found`,
        recommendation,
        context,
        autoFixable: false, // Validation-Only - requires semantic understanding
      });
    }

    return issues;
  }

  /**
   * Run Phase 14d audit on all skills (backward compatible - parses files)
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
   * Run Phase 14d audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[], options?: any): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skill of skills) {
      const issues = await this.validate(skill);

      if (issues.length > 0) {
        skillsAffected++;
        issuesFound += issues.length;

        details.push(`${skill.name}:`);
        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);
          if (issue.context && issue.context.length > 0) {
            for (const ctx of issue.context) {
              details.push(`    ${ctx}`);
            }
          }
        }
      }
    }

    return {
      phaseName: 'Phase 14d: Prose Phase References',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }
}
