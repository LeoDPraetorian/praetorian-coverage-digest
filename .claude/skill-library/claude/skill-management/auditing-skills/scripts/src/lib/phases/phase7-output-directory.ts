/**
 * Phase 7: Output Directory Pattern (Optional Best Practice)
 * Ensures skills that generate runtime artifacts have proper .local/ directory
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SkillFile, Issue, PhaseResult, FixOptions } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

export class Phase7OutputDirectory {
  /**
   * Runtime file patterns to detect
   */
  private static readonly RUNTIME_PATTERNS = [
    /^audit-.*\.(md|txt|json)$/,
    /^report-.*\.(md|txt|json)$/,
    /^run-.*\.(log|txt)$/,
    /^test-results-.*\.(md|txt|json|xml)$/,
    /^output-.*\.(md|txt)$/,
    /.*\.tmp$/,
    /^results-.*\.(md|txt|json)$/,
    /^generated-.*\.(md|txt)$/,
  ];

  /**
   * TDD artifact filename patterns (should NOT be in references/)
   * These document HOW the skill was validated, not HOW to use it
   *
   * IMPORTANT: We look for TEMPORAL indicators, not teaching docs.
   * - "tdd-methodology.md" = TEACHING doc (OK in references/)
   * - "tdd-validation-my-skill.md" = TEST RESULT (belongs in .local/)
   *
   * Pattern: Filenames with skill names, dates, or result-words
   */
  private static readonly TDD_ARTIFACT_FILENAME_PATTERNS = [
    // Validation results with skill names or dates
    /tdd-validation/i,
    /tdd-results/i,
    /tdd-test-/i,
    // Baseline test outputs (with skill name or date)
    /baseline-failures/i,
    /baseline-test-/i,
    /baseline-results/i,
    // Pressure test outputs
    /pressure-test-results/i,
    /pressure-test-\d/i,
    // Phase results (actual test outputs, not methodology docs)
    /green-phase-results/i,
    /red-phase-results/i,
    /red-phase-failures/i,
    // Quality check results
    /quality-check-results/i,
    /quality-check-\d/i,
    // Test scenario results (not templates)
    /test-scenario-results/i,
    /test-scenario-\d/i,
    // Validation results
    /validation-results/i,
    /validation-\d/i,
  ];

  /**
   * TDD artifact content patterns (should NOT be in references/)
   *
   * These match ACTUAL test output artifacts, not teaching examples.
   * Key distinction:
   * - Teaching: "Run baseline without skill" (instructions)
   * - Test result: "Agent response (verbatim):" followed by transcript
   *
   * We look for markers that ONLY appear in actual test logs:
   * - Verbatim agent transcripts
   * - Test dates/timestamps
   * - PASS/FAIL result markers in specific formats
   */
  private static readonly TDD_ARTIFACT_CONTENT_PATTERNS = [
    // Verbatim transcript markers (only in actual test logs)
    /Agent response \(verbatim\):/i,
    /\*\*Verbatim response:\*\*/i,
    /Captured output:/i,
    /Test transcript:/i,
    // Dated test results
    /Test run: \d{4}-\d{2}-\d{2}/i,
    /Tested on: \d{4}-\d{2}-\d{2}/i,
    /Test date: \d{4}-\d{2}-\d{2}/i,
    // Specific test result formats with PASS/FAIL
    /\| ?Status ?\| ?PASS ?\|/i,
    /\| ?Status ?\| ?FAIL ?\|/i,
    /\| ?Result ?\| ?PASS ?\|/i,
    /\| ?Result ?\| ?FAIL ?\|/i,
    // Numbered test case results (not instructions)
    /Test Case \d+: PASS/i,
    /Test Case \d+: FAIL/i,
    // Pressure test execution logs
    /Pressure scenario \d+.*\n.*Result:/i,
  ];

  /**
   * Patterns in skill content that indicate artifact generation
   */
  private static readonly ARTIFACT_GENERATION_PATTERNS = [
    /generate.*report/i,
    /create.*file/i,
    /write.*output/i,
    /save.*results/i,
    /audit/i,
    /test.*output/i,
    /run.*script/i,
    /produce.*artifact/i,
    /export.*data/i,
  ];

  /**
   * Validate output directory pattern for a single skill
   */
  static async validate(skill: SkillFile): Promise<Issue[]> {
    const issues: Issue[] = [];

    // Check if skill has scripts/ directory (active skill needing version tracking)
    const hasScriptsDir = await this.directoryExists(path.join(skill.directory, 'scripts'));

    // Check if skill generates artifacts OR has scripts/
    const generatesArtifacts = this.detectsArtifactGeneration(skill);
    const needsLocalDir = generatesArtifacts || hasScriptsDir;

    // Check for TDD artifacts in references/ ALWAYS (even if skill doesn't need .local/)
    // These should never be in references/ regardless of skill type
    const tddArtifacts = await this.findTddArtifactsInReferences(skill.directory);

    if (tddArtifacts.length > 0) {
      // Build context with all TDD artifact filenames
      const context = tddArtifacts.map(file => `references/${path.basename(file)}`);

      issues.push({
        severity: 'WARNING',
        message: `${tddArtifacts.length} TDD artifact(s) in references/ (should be in .local/)`,
        recommendation: 'Move to .local/ - TDD artifacts document HOW skill was validated, not HOW to use it. Reduces token bloat when agents load references/',
        context,
        autoFixable: false, // Requires manual review to ensure not breaking links
      });
    }

    if (!needsLocalDir) {
      return issues; // Return any TDD artifact issues found, skip other .local/ checks
    }

    const localDir = path.join(skill.directory, '.local');
    const gitignorePath = path.join(localDir, '.gitignore');

    // Check 1: Has .local/ directory?
    const hasLocalDir = await this.directoryExists(localDir);

    if (!hasLocalDir) {
      // INFO for artifact-generating skills (don't need warning, just guidance)
      issues.push({
        severity: 'INFO',
        message: 'Consider adding .local/ directory for runtime artifacts',
        autoFixable: true,
        fix: async () => {
          await fs.mkdir(localDir, { recursive: true });
          await this.createGitignore(gitignorePath);
        },
      });
    } else {
      // Check 2: Has .gitignore?
      const hasGitignore = await this.fileExists(gitignorePath);

      if (!hasGitignore) {
        issues.push({
          severity: 'INFO',
          message: '.local/ directory missing .gitignore',
          autoFixable: true,
          fix: async () => {
            await this.createGitignore(gitignorePath);
          },
        });
      }
    }

    // Check 3: Find loose runtime files at root
    const looseFiles = await this.findLooseRuntimeFiles(skill.directory);

    if (looseFiles.length > 0) {
      // Build context with all loose filenames
      const context = looseFiles.map(file => path.basename(file));

      issues.push({
        severity: 'INFO',
        message: `${looseFiles.length} runtime file(s) at root (consider moving to .local/)`,
        recommendation: 'Move runtime artifacts to .local/ to keep skill root clean',
        context,
        autoFixable: true,
        fix: async () => {
          await this.moveToLocal(skill.directory, looseFiles);
        },
      });
    }

    return issues;
  }

  /**
   * Detect if skill generates runtime artifacts
   */
  private static detectsArtifactGeneration(skill: SkillFile): boolean {
    const { name, content } = skill;
    const combined = `${name} ${content}`;

    return this.ARTIFACT_GENERATION_PATTERNS.some((pattern) =>
      pattern.test(combined)
    );
  }

  /**
   * Find loose runtime files at skill root
   */
  private static async findLooseRuntimeFiles(skillDir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(skillDir, { withFileTypes: true });
      const looseFiles: string[] = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const matches = this.RUNTIME_PATTERNS.some((pattern) =>
          pattern.test(entry.name)
        );

        if (matches) {
          looseFiles.push(path.join(skillDir, entry.name));
        }
      }

      return looseFiles;
    } catch {
      return [];
    }
  }

  /**
   * Find TDD artifacts in references/ directory (wrong location)
   * These should be in .local/, not references/
   */
  private static async findTddArtifactsInReferences(skillDir: string): Promise<string[]> {
    const referencesDir = path.join(skillDir, 'references');
    const tddArtifacts: string[] = [];

    try {
      const exists = await this.directoryExists(referencesDir);
      if (!exists) return [];

      const entries = await fs.readdir(referencesDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

        // Skip phase documentation files - they describe patterns, not test results
        // e.g., phase-07-output-directories.md documents TDD patterns, but is not itself a TDD result
        if (/^phase-\d+/i.test(entry.name)) continue;

        const filePath = path.join(referencesDir, entry.name);

        // Check 1: Filename matches TDD patterns
        const filenameMatches = this.TDD_ARTIFACT_FILENAME_PATTERNS.some((pattern) =>
          pattern.test(entry.name)
        );

        if (filenameMatches) {
          tddArtifacts.push(filePath);
          continue;
        }

        // Check 2: Content matches TDD patterns (for files with generic names)
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const contentMatches = this.TDD_ARTIFACT_CONTENT_PATTERNS.some((pattern) =>
            pattern.test(content)
          );

          if (contentMatches) {
            tddArtifacts.push(filePath);
          }
        } catch {
          // Skip files that can't be read
        }
      }

      return tddArtifacts;
    } catch {
      return [];
    }
  }

  /**
   * Check if directory exists
   */
  private static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create standard .gitignore for .local/ directory
   */
  private static async createGitignore(gitignorePath: string): Promise<void> {
    const content = `# Runtime artifacts and temporary files
# Generated by skills during execution

# Exclude everything by default
*

# EXCEPTIONS: Keep these in git
!.gitignore
!.gitkeep

# Explicit patterns (already excluded by * above, listed for clarity)
audit-*.md
audit-*.txt
audit-*.json
report-*.md
report-*.txt
report-*.json
test-results-*
results-*.md
run-*.log
*.log
output-*
generated-*
*.tmp
temp/
logs/
`;

    await fs.writeFile(gitignorePath, content, 'utf-8');
  }

  /**
   * Move loose runtime files to .local/
   */
  private static async moveToLocal(
    skillDir: string,
    looseFiles: string[]
  ): Promise<void> {
    const localDir = path.join(skillDir, '.local');

    // Ensure .local/ exists
    await fs.mkdir(localDir, { recursive: true });

    // Move each file
    for (const file of looseFiles) {
      const filename = path.basename(file);
      const targetPath = path.join(localDir, filename);

      await fs.rename(file, targetPath);
    }
  }

  /**
   * Run Phase 6 audit on all skills (or a single skill if skillName provided)
   */
  static async run(skillsDir: string, options?: FixOptions): Promise<PhaseResult> {
    let skillPaths = await SkillParser.findAllSkills(skillsDir);

    // Filter to single skill if specified
    if (options?.skillName) {
      skillPaths = skillPaths.filter(p => p.includes(`/${options.skillName}/SKILL.md`));
      if (skillPaths.length === 0) {
        return {
          phaseName: 'Phase 7: Output Directory Pattern',
          skillsAffected: 0,
          issuesFound: 0,
          issuesFixed: 0,
          details: [`Skill not found: ${options.skillName}`],
        };
      }
    }

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

          // Auto-fix if enabled
          if (options?.autoFix && issue.autoFixable && issue.fix) {
            if (!options.dryRun) {
              await issue.fix();
              issuesFixed++;
              details.push(`    ✓ Fixed`);
            } else {
              details.push(`    (would fix in non-dry-run mode)`);
            }
          }
        }
      }
    }

    return {
      phaseName: 'Phase 7: Output Directory Pattern',
      skillsAffected,
      issuesFound,
      issuesFixed,
      details,
    };
  }

  /**
   * Get statistics
   */
  static async getStatistics(skillsDir: string): Promise<{
    hasPattern: number;
    needsPattern: number;
    looseFiles: number;
    total: number;
    percentage: number;
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let hasPattern = 0;
    let needsPattern = 0;
    let totalLooseFiles = 0;

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);

      // Only count skills that generate artifacts
      if (!this.detectsArtifactGeneration(skill)) {
        continue;
      }

      const localDir = path.join(skill.directory, '.local');
      const hasLocalDir = await this.directoryExists(localDir);
      const looseFiles = await this.findLooseRuntimeFiles(skill.directory);

      if (hasLocalDir && looseFiles.length === 0) {
        hasPattern++;
      } else {
        needsPattern++;
        totalLooseFiles += looseFiles.length;
      }
    }

    const total = hasPattern + needsPattern;
    const percentage = total > 0 ? (hasPattern / total) * 100 : 100;

    return {
      hasPattern,
      needsPattern,
      looseFiles: totalLooseFiles,
      total,
      percentage,
    };
  }
}
