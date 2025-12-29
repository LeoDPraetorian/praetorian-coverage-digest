/**
 * Phase 22: Context7 Staleness Check
 *
 * Detects when context7-sourced documentation is more than 30 days old.
 * Skills created from context7 data should be refreshed periodically to reflect
 * upstream library updates (new APIs, deprecations, pattern changes).
 *
 * **Validates:**
 * - `.local/context7-source.json` exists and has valid `fetchedAt` date
 * - Documentation age is <= 30 days
 *
 * **Rationale:**
 * - Frontend/backend libraries evolve rapidly (React, TanStack Query, etc.)
 * - New APIs, deprecated patterns, and breaking changes require skill updates
 * - Stale docs lead to outdated recommendations and broken examples
 *
 * **Resolution:**
 * - Run: `npm run update -- <skill> --refresh-context7 --context7-data /path/to/new.json`
 * - Query context7 MCP for updated documentation first
 * - Save results to JSON file, then run refresh command
 *
 * @see `.claude/skill-library/claude/skill-management/updating-skills/SKILL.md`
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import type { SkillFile, Issue, PhaseResult } from '../types.js';

const STALENESS_THRESHOLD_DAYS = 30;

interface Context7SourceMetadata {
  libraryName: string;
  libraryId: string;
  fetchedAt: string;
  version?: string;
  docsHash: string;
}

/**
 * Calculate days between two dates
 */
function daysBetween(dateStr1: string, dateStr2: string): number {
  const date1 = new Date(dateStr1);
  const date2 = new Date(dateStr2);
  const diffMs = date2.getTime() - date1.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Phase 22: Context7 Staleness Check
 */
export class Phase22Context7Staleness {
  /**
   * Run phase on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const { SkillParser } = await import('../utils/skill-parser.js');
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
        details.push(...issues.map(i => `${skill.name}: ${i.message}`));
      }
    }

    return {
      phaseName: 'Phase 22: Context7 Staleness',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }

  /**
   * Validate a single skill for context7 staleness
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];
    const skillDir = dirname(skill.path);
    const metadataPath = join(skillDir, '.local/context7-source.json');

    // Check if context7 metadata exists
    if (!existsSync(metadataPath)) {
      // Not a context7-sourced skill, no issue
      return [];
    }

    // Read and parse metadata
    let metadata: Context7SourceMetadata;
    try {
      const content = readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(content) as Context7SourceMetadata;
    } catch (error) {
      issues.push({
        severity: 'WARNING',
        message: 'Context7 metadata exists but is invalid JSON',
        recommendation: 'Verify .local/context7-source.json format or remove if corrupted',
      });
      return issues;
    }

    // Validate required fields
    if (!metadata.libraryName || !metadata.fetchedAt) {
      issues.push({
        severity: 'WARNING',
        message: 'Context7 metadata missing required fields (libraryName, fetchedAt)',
        recommendation: 'Regenerate metadata or remove corrupted file',
      });
      return issues;
    }

    // Check staleness
    const now = new Date().toISOString();
    const daysSinceFetch = daysBetween(metadata.fetchedAt, now);

    if (daysSinceFetch > STALENESS_THRESHOLD_DAYS) {
      const skillName = skill.path.split('/').slice(-2, -1)[0]; // Extract skill directory name
      issues.push({
        severity: 'WARNING',
        message: `Context7 documentation is ${daysSinceFetch} days old (library: ${metadata.libraryName})`,
        recommendation: `Run: npm run update -- ${skillName} --refresh-context7 --context7-data /path/to/new.json`,
      });
    }

    return issues;
  }
}
