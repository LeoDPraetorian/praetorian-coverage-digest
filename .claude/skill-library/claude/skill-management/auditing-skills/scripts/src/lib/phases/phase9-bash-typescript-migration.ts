/**
 * Phase 9: Non-TypeScript Script Detection
 * Detects non-TypeScript scripts anywhere in skill, recommends TypeScript migration for:
 * - Cross-platform compatibility (shell scripts don't work on Windows)
 * - Testing infrastructure (vitest/jest set up for TypeScript)
 * - Consistency (standardize on TypeScript for all skill tooling)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SkillFile, Issue, PhaseResult, FixOptions } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

/**
 * Script types to detect (non-TypeScript)
 */
const SCRIPT_TYPES = {
  shell: {
    extensions: ['.sh', '.bash', '.zsh', '.fish'],
    name: 'Shell',
    reason: 'Not cross-platform (Windows incompatible)',
  },
  python: {
    extensions: ['.py'],
    name: 'Python',
    reason: 'No testing infrastructure (use vitest instead of pytest)',
  },
  ruby: {
    extensions: ['.rb'],
    name: 'Ruby',
    reason: 'No testing infrastructure',
  },
  perl: {
    extensions: ['.pl', '.pm'],
    name: 'Perl',
    reason: 'No testing infrastructure',
  },
  php: {
    extensions: ['.php'],
    name: 'PHP',
    reason: 'No testing infrastructure',
  },
  javascript: {
    extensions: ['.js', '.mjs', '.cjs'],
    name: 'JavaScript',
    reason: 'Use TypeScript for type safety',
  },
};

/**
 * All non-TypeScript extensions
 */
const ALL_SCRIPT_EXTENSIONS = Object.values(SCRIPT_TYPES).flatMap(t => t.extensions);

export class Phase9BashTypeScriptMigration {
  /**
   * Check if file is a non-TypeScript script
   */
  private static isNonTypeScriptScript(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ALL_SCRIPT_EXTENSIONS.includes(ext);
  }

  /**
   * Get script type info for a filename
   */
  private static getScriptType(filename: string): { name: string; reason: string } | null {
    const ext = path.extname(filename).toLowerCase();
    for (const [, info] of Object.entries(SCRIPT_TYPES)) {
      if (info.extensions.includes(ext)) {
        return { name: info.name, reason: info.reason };
      }
    }
    return null;
  }

  /**
   * Find all non-TypeScript scripts in skill directory (recursively)
   */
  private static async findNonTypeScriptScripts(skillDir: string): Promise<Array<{ path: string; type: string; reason: string }>> {
    const scripts: Array<{ path: string; type: string; reason: string }> = [];

    const walk = async (dir: string, relativePath = '') => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

          // Skip node_modules, .git, dist, .local
          if (entry.isDirectory()) {
            if (!['node_modules', '.git', 'dist', '.local'].includes(entry.name)) {
              await walk(fullPath, relPath);
            }
          } else if (entry.isFile() && this.isNonTypeScriptScript(entry.name)) {
            const typeInfo = this.getScriptType(entry.name);
            if (typeInfo) {
              scripts.push({ path: relPath, type: typeInfo.name, reason: typeInfo.reason });
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    };

    await walk(skillDir);
    return scripts;
  }

  /**
   * Legacy method for backward compatibility
   */
  private static async findShellScripts(skillDir: string): Promise<string[]> {
    const scripts = await this.findNonTypeScriptScripts(skillDir);
    return scripts.filter(s => s.type === 'Shell').map(s => s.path);
  }

  /**
   * Analyze shell script complexity (simple heuristic)
   */
  private static async analyzeScriptComplexity(scriptPath: string): Promise<{
    complexity: 'simple' | 'moderate' | 'complex';
    lineCount: number;
    hasPipes: boolean;
    hasGit: boolean;
    hasNpm: boolean;
  }> {
    try {
      const content = await fs.readFile(scriptPath, 'utf-8');
      const lines = content.split('\n');
      const lineCount = lines.filter(l => l.trim() && !l.trim().startsWith('#')).length;

      const hasPipes = content.includes('|');
      const hasGit = content.includes('git ');
      const hasNpm = content.includes('npm ') || content.includes('npx ');

      let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
      if (lineCount > 100 || (hasPipes && hasGit && hasNpm)) {
        complexity = 'complex';
      } else if (lineCount > 30 || hasPipes) {
        complexity = 'moderate';
      }

      return { complexity, lineCount, hasPipes, hasGit, hasNpm };
    } catch (error) {
      return {
        complexity: 'simple',
        lineCount: 0,
        hasPipes: false,
        hasGit: false,
        hasNpm: false,
      };
    }
  }

  /**
   * Validate non-TypeScript scripts and recommend migration
   */
  static async validate(skill: SkillFile): Promise<Issue[]> {
    const issues: Issue[] = [];
    const scripts = await this.findNonTypeScriptScripts(skill.directory);

    if (scripts.length === 0) {
      return issues;
    }

    // Group scripts by type
    const byType: Record<string, Array<{ path: string; reason: string }>> = {};
    for (const script of scripts) {
      if (!byType[script.type]) {
        byType[script.type] = [];
      }
      byType[script.type].push({ path: script.path, reason: script.reason });
    }

    // Build context array with all script details
    const context: string[] = [];

    // Add each type with its scripts
    for (const [type, typeScripts] of Object.entries(byType)) {
      const reason = typeScripts[0].reason;
      context.push(`${type} (${typeScripts.length}): ${reason}`);
      for (const script of typeScripts) {
        context.push(`  → ${script.path}`);
      }
    }

    // For shell scripts, add complexity analysis
    const shellScripts = scripts.filter(s => s.type === 'Shell');
    if (shellScripts.length > 0) {
      const scriptAnalyses = await Promise.all(
        shellScripts.map(async script => {
          const fullPath = path.join(skill.directory, script.path);
          const analysis = await this.analyzeScriptComplexity(fullPath);
          return { script: script.path, ...analysis };
        })
      );

      const simpleScripts = scriptAnalyses.filter(s => s.complexity === 'simple');
      const moderateScripts = scriptAnalyses.filter(s => s.complexity === 'moderate');
      const complexScripts = scriptAnalyses.filter(s => s.complexity === 'complex');

      if (simpleScripts.length > 0) {
        context.push(`Migration effort - Simple (${simpleScripts.length}): ${simpleScripts.map(s => s.script).join(', ')}`);
      }
      if (moderateScripts.length > 0) {
        context.push(`Migration effort - Moderate (${moderateScripts.length}): ${moderateScripts.map(s => s.script).join(', ')}`);
      }
      if (complexScripts.length > 0) {
        context.push(`Migration effort - Complex (${complexScripts.length}): ${complexScripts.map(s => s.script).join(', ')}`);
      }
    }

    // Single consolidated issue with all details in context
    issues.push({
      severity: 'WARNING',
      message: `${scripts.length} non-TypeScript script(s) detected - migrate to TypeScript`,
      recommendation: 'See references/npm-workspace-pattern.md for TypeScript CLI setup. Benefits: cross-platform, vitest testing, type safety',
      context,
      autoFixable: false,
    });

    return issues;
  }

  /**
   * Run Phase 9 audit on all skills
   */
  static async run(skillsDir: string, options?: FixOptions): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
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
        }
      }
    }

    return {
      phaseName: 'Phase 9: Non-TypeScript Script Migration',
      skillsAffected,
      issuesFound,
      issuesFixed,
      details,
    };
  }

  /**
   * Get bash→TypeScript migration statistics
   */
  static async getStatistics(skillsDir: string): Promise<{
    skillsWithShellScripts: number;
    totalShellScripts: number;
    simpleScripts: number;
    moderateScripts: number;
    complexScripts: number;
    total: number;
    percentage: number;
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let skillsWithShellScripts = 0;
    let totalShellScripts = 0;
    let simpleScripts = 0;
    let moderateScripts = 0;
    let complexScripts = 0;

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const shellScripts = await this.findShellScripts(skill.directory);

      if (shellScripts.length > 0) {
        skillsWithShellScripts++;
        totalShellScripts += shellScripts.length;

        // Analyze complexity
        for (const script of shellScripts) {
          const fullPath = path.join(skill.directory, script);
          const analysis = await this.analyzeScriptComplexity(fullPath);

          if (analysis.complexity === 'simple') simpleScripts++;
          else if (analysis.complexity === 'moderate') moderateScripts++;
          else complexScripts++;
        }
      }
    }

    const total = skillPaths.length;
    const percentage =
      total > 0 ? ((total - skillsWithShellScripts) / total) * 100 : 0;

    return {
      skillsWithShellScripts,
      totalShellScripts,
      simpleScripts,
      moderateScripts,
      complexScripts,
      total,
      percentage,
    };
  }
}
