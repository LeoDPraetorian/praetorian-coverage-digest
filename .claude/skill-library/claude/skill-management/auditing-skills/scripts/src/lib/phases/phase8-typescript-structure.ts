/**
 * Phase 8: TypeScript Project Structure Validation
 * Validates npm workspace pattern - TypeScript files must be in scripts/ subdirectory
 * Also validates TypeScript compilation, vitest configuration, and test execution
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import type { SkillFile, Issue, PhaseResult, FixOptions } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

/**
 * Result of running a command
 */
interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Run a command and capture output
 */
function runCommand(command: string, cwd: string): CommandResult {
  try {
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000, // 2 minute timeout
    });
    return { success: true, output: output.trim() };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string; message?: string };
    return {
      success: false,
      output: execError.stdout || '',
      error: execError.stderr || execError.message || 'Unknown error',
    };
  }
}

export class Phase8TypeScriptStructure {
  /**
   * Check if skill is instruction-only (no CLI references in content)
   * Instruction-only skills don't need TypeScript infrastructure
   */
  private static isInstructionOnly(skill: SkillFile): boolean {
    // Check frontmatter for explicit opt-out
    if (skill.frontmatter['cli-driven'] === false ||
        skill.frontmatter['instruction-only'] === true) {
      return true;
    }

    // Check if content references CLI commands
    const cliPatterns = [
      /npm run\s+\w+/,
      /npx\s+tsx/,
      /npm run -w @chariot/,
    ];

    for (const pattern of cliPatterns) {
      if (pattern.test(skill.content)) {
        return false; // Has CLI references
      }
    }

    // No CLI references found - this is instruction-only
    return true;
  }

  /**
   * Validate TypeScript project structure for a single skill
   * @param skill - The skill to validate
   * @param singleSkillMode - If true, only run tests for this skill. If false, run all tests (default: true)
   */
  static validate(skill: SkillFile, singleSkillMode: boolean = true): Issue[] {
    const issues: Issue[] = [];
    const skillDir = dirname(skill.path);

    // Skip TypeScript checks for instruction-only skills
    // These skills don't need CLI infrastructure
    if (this.isInstructionOnly(skill)) {
      return issues; // No TypeScript-related issues for instruction-only skills
    }

    // Check 1: package.json at skill root (CRITICAL violation)
    const rootPackageJson = join(skillDir, 'package.json');
    if (existsSync(rootPackageJson)) {
      issues.push({
        severity: 'CRITICAL',
        message: 'package.json at skill root (should be in scripts/ subdirectory per npm workspace pattern)',
        recommendation: 'Run "mv package.json package-lock.json tsconfig.json src scripts/" then remove node_modules/ and dist/',
        autoFixable: false,
        fix: undefined,
      });
    }

    // Check 2: scripts/package.json exists (TypeScript project detected)
    const scriptsPackageJson = join(skillDir, 'scripts', 'package.json');
    const hasScriptsPackageJson = existsSync(scriptsPackageJson);

    if (hasScriptsPackageJson) {
      // Check 2a: scripts/.gitignore must exist
      const scriptsGitignore = join(skillDir, 'scripts', '.gitignore');
      if (!existsSync(scriptsGitignore)) {
        issues.push({
          severity: 'CRITICAL',
          message: 'scripts/package.json exists but scripts/.gitignore is missing',
          recommendation: 'Create scripts/.gitignore with: dist/, *.log, *.tmp, .cache/',
          autoFixable: false,
        });
      } else {
        // Check 2b: .gitignore content validation
        const gitignoreContent = readFileSync(scriptsGitignore, 'utf-8');

        if (!gitignoreContent.includes('dist/')) {
          issues.push({
            severity: 'WARNING',
            message: 'scripts/.gitignore missing "dist/" exclusion',
            autoFixable: false,
          });
        }

        if (!gitignoreContent.includes('*.log')) {
          issues.push({
            severity: 'WARNING',
            message: 'scripts/.gitignore missing "*.log" exclusion',
            autoFixable: false,
          });
        }
      }

      // Check 3: Verify tsconfig.json and src/ exist
      const scriptsTsconfig = join(skillDir, 'scripts', 'tsconfig.json');
      const scriptsSrc = join(skillDir, 'scripts', 'src');

      if (!existsSync(scriptsTsconfig)) {
        issues.push({
          severity: 'WARNING',
          message: 'scripts/package.json exists but scripts/tsconfig.json missing',
          autoFixable: false,
        });
      }

      if (!existsSync(scriptsSrc)) {
        issues.push({
          severity: 'WARNING',
          message: 'scripts/package.json exists but scripts/src/ directory missing',
          autoFixable: false,
        });
      }
    }

    // Check 4: Workspace configuration (INFO level)
    // Workspace is at .claude/package.json (not .claude/skills/package.json)
    const workspaceRoot = join(skillDir, '../../package.json');
    if (!existsSync(workspaceRoot)) {
      if (hasScriptsPackageJson) {
        issues.push({
          severity: 'INFO',
          message: 'Consider creating .claude/package.json with workspace config for shared dependencies',
          autoFixable: false,
        });
      }
    } else {
      // Verify workspace config
      try {
        const workspaceContent = readFileSync(workspaceRoot, 'utf-8');
        const workspaceConfig = JSON.parse(workspaceContent);

        if (!workspaceConfig.workspaces) {
          issues.push({
            severity: 'WARNING',
            message: '.claude/package.json exists but missing "workspaces" field',
            autoFixable: false,
          });
        }
      } catch (error) {
        // Ignore parse errors
      }
    }

    // Check 5: Path resolution pattern (TypeScript files only)
    if (hasScriptsPackageJson) {
      const scriptsSrc = join(skillDir, 'scripts', 'src');
      if (existsSync(scriptsSrc)) {
        let hasGitBasedResolution = false;
        let hasHardcodedPaths = false;

        // Check all .ts files for path resolution patterns
        try {
          const tsFiles = readdirSync(scriptsSrc)
            .filter((f: string) => f.endsWith('.ts'))
            .map((f: string) => join(scriptsSrc, f));

          for (const tsFile of tsFiles) {
            const content = readFileSync(tsFile, 'utf-8');

            // Check for git-based resolution (direct git command or shared findProjectRoot utility)
            if (content.includes('git rev-parse --show-toplevel') || content.includes('findProjectRoot')) {
              hasGitBasedResolution = true;
            }

            // Check for hardcoded relative paths
            if (content.match(/join\(.*,\s*['"]\.\.\/\.\.\/['"]\)/) ||
                content.match(/join\(.*,\s*['"]\.\.\/\.\.\/\.\.\/['"]\)/)) {
              hasHardcodedPaths = true;
            }

            // Check for problematic cwd.includes pattern
            if (content.includes("cwd.includes('.claude/skills')") &&
                content.includes("'../../..'")) {
              hasHardcodedPaths = true;
            }
          }

          if (!hasGitBasedResolution && tsFiles.length > 0) {
            issues.push({
              severity: 'CRITICAL',
              message: 'TypeScript files not using git for path resolution (missing "git rev-parse --show-toplevel")',
              recommendation: 'Add findRepoRoot() function using git (see .claude/skills/managing-skills/references/patterns/repo-root-detection.md)',
              autoFixable: false,
            });
          }

          if (hasHardcodedPaths) {
            issues.push({
              severity: 'CRITICAL',
              message: 'TypeScript files using hardcoded relative paths (../../) - use findRepoRoot() with git instead',
              autoFixable: false,
            });
          }
        } catch (error) {
          // Ignore errors reading source files
        }
      }

      // Check 6: TypeScript compilation (tsc --noEmit)
      const scriptsDir = join(skillDir, 'scripts');
      const tscResult = runCommand('npx tsc --noEmit', scriptsDir);
      if (!tscResult.success) {
        // Extract error count from tsc output
        const errorMatch = tscResult.error?.match(/Found (\d+) errors?/);
        const errorCount = errorMatch ? errorMatch[1] : 'multiple';

        // Collect first few error lines as context
        const errorLines = (tscResult.error || '').split('\n').filter(l => l.trim()).slice(0, 5);

        issues.push({
          severity: 'CRITICAL',
          message: `TypeScript compilation failed with ${errorCount} error(s)`,
          recommendation: 'Fix type errors before proceeding',
          context: errorLines.length > 0 ? errorLines : undefined,
          autoFixable: false,
        });
      }

      // Check 7: tsconfig.json has vitest/globals types
      const scriptsTsconfig = join(skillDir, 'scripts', 'tsconfig.json');
      if (existsSync(scriptsTsconfig)) {
        try {
          const tsconfigContent = readFileSync(scriptsTsconfig, 'utf-8');
          const tsconfig = JSON.parse(tsconfigContent);
          const types = tsconfig.compilerOptions?.types || [];

          if (!types.includes('vitest/globals')) {
            issues.push({
              severity: 'WARNING',
              message: 'tsconfig.json missing "vitest/globals" in compilerOptions.types (required for describe/test/expect globals)',
              recommendation: 'Add "types": ["vitest/globals", "node"] to compilerOptions in tsconfig.json',
              autoFixable: false,
            });
          }

          if (!types.includes('node')) {
            issues.push({
              severity: 'WARNING',
              message: 'tsconfig.json missing "node" in compilerOptions.types (required for Node.js types)',
              autoFixable: false,
            });
          }
        } catch (error) {
          // tsconfig.json parse error handled elsewhere
        }
      }

      // Check 8: Unit tests must pass (100% required)
      // Check if test script exists in package.json
      try {
        const packageContent = readFileSync(scriptsPackageJson, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        const hasTestScript = packageJson.scripts?.['test:unit'] || packageJson.scripts?.['test'];

        if (hasTestScript) {
          // In single-skill mode, scope tests to just this skill
          // In all-skills mode, run all tests across the workspace
          let testCommand: string;
          if (singleSkillMode) {
            // Extract skill name from skill.path (e.g., ".claude/skills/skill-manager/SKILL.md" -> "skill-manager")
            const skillName = skill.path.split('/').slice(-2, -1)[0];
            const relativeSkillPath = skill.path.includes('/.claude/skill-library/')
              ? `skill-library/${skill.path.split('/skill-library/')[1].replace('/SKILL.md', '/scripts')}`
              : `skills/${skillName}/scripts`;
            testCommand = `npx vitest run ${relativeSkillPath}`;
          } else {
            testCommand = packageJson.scripts['test:unit'] ? 'npm run test:unit' : 'npm test';
          }
          const testResult = runCommand(testCommand, scriptsDir);

          if (!testResult.success) {
            // Check if it's a test failure vs other error
            const isTestFailure = testResult.error?.includes('FAIL') ||
                                  testResult.error?.includes('failed') ||
                                  testResult.output?.includes('FAIL');

            if (isTestFailure) {
              // Extract failure count from vitest/jest output
              const failMatch = (testResult.error || testResult.output || '').match(/(\d+)\s+failed/i);
              const failCount = failMatch ? failMatch[1] : 'some';

              // Collect first few failure lines as context
              const outputLines = (testResult.error || testResult.output || '').split('\n').filter(l => l.trim()).slice(0, 10);

              issues.push({
                severity: 'CRITICAL',
                message: `Unit tests failed: ${failCount} test(s) failing (100% pass required)`,
                recommendation: 'Fix failing tests before proceeding',
                context: outputLines.length > 0 ? outputLines : undefined,
                autoFixable: false,
              });
            } else {
              // Non-test error (missing dependencies, etc.)
              issues.push({
                severity: 'CRITICAL',
                message: `Test execution failed: ${testResult.error?.split('\n')[0] || 'Unknown error'}`,
                recommendation: 'Check npm install completed and dependencies are available',
                autoFixable: false,
              });
            }
          }
        } else {
          // No test script found - warn if there are test files
          const srcDir = join(skillDir, 'scripts', 'src');
          if (existsSync(srcDir)) {
            const hasTestFiles = readdirSync(srcDir, { recursive: true })
              .some((f: string | Buffer) => {
                const filename = typeof f === 'string' ? f : f.toString();
                return filename.includes('.test.') || filename.includes('.spec.');
              });

            if (hasTestFiles) {
              issues.push({
                severity: 'WARNING',
                message: 'Test files found but no test:unit or test script in package.json',
                autoFixable: false,
              });
            }
          }
        }
      } catch (error) {
        // package.json parse error handled elsewhere
      }
    }

    return issues;
  }

  /**
   * Run Phase 8 audit on all skills
   */
  static async run(skillsDir: string, options?: FixOptions): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let skillsAffected = 0;
    let issuesFound = 0;
    let issuesFixed = 0;
    const details: string[] = [];

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const issues = this.validate(skill, false); // All-skills mode (workspace-wide tests)

      if (issues.length > 0) {
        skillsAffected++;
        issuesFound += issues.length;

        details.push(`${skill.name}:`);

        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);

          // Auto-fix if enabled and fixable
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
      phaseName: 'Phase 8: TypeScript Project Structure',
      skillsAffected,
      issuesFound,
      issuesFixed,
      details,
    };
  }
}
