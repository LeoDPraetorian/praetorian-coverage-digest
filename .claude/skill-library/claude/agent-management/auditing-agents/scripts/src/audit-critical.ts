#!/usr/bin/env node
/**
 * audit-critical.ts - Critical Agent Validation
 *
 * This is the ONLY audit that remains as code because:
 * 1. Block scalars make agents invisible to Claude (high impact)
 * 2. Detection requires complex regex patterns (hard for Claude)
 * 3. Failure rate was 8/10 agents before enforcement (proven need)
 *
 * All other audit checks moved to instruction-based checklist in creating-agents Phase 8.
 *
 * Usage:
 *   npm run audit-critical -- <agent-name>           Check specific agent
 *   npm run audit-critical -- <agent-name> --skills  Check agent + show skill recommendations
 *   npm run audit-critical                           Check all agents
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Issues found (with report)
 *   2 - Tool error (file not found, etc.)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { basename, join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import {
  extractAgentMetadata,
  getSkillRecommendations,
  formatSkillRecommendationTable,
} from './lib/skill-recommender.js';

/**
 * Issue types that critical audit checks for
 */
type IssueType =
  | 'block-scalar-pipe'
  | 'block-scalar-folded'
  | 'missing-description'
  | 'empty-description'
  | 'name-mismatch';

/**
 * Issue found during audit
 */
interface CriticalIssue {
  agent: string; // File path
  agentName: string; // Just the name
  issue: IssueType;
  line?: number;
  current?: string; // Current problematic value
  expected?: string; // Expected value
}

/**
 * Audit result
 */
interface AuditResult {
  passed: boolean;
  agentsChecked: number;
  issuesFound: CriticalIssue[];
  agentPath?: string; // Path to audited agent (for skill recommendations)
}

/**
 * Find project root using git
 */
function getRepoRoot(): string {
  // Try superproject first (for submodule detection)
  try {
    const superRoot = execSync('git rev-parse --show-superproject-working-tree', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (superRoot) return superRoot;
  } catch {
    // Not in submodule
  }

  return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
}

/**
 * Recursively find all .md files in a directory
 */
function findAgentFiles(dir: string, pattern?: string): string[] {
  const results: string[] = [];

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories
        if (entry.name.startsWith('.')) continue;
        // Recurse into subdirectories
        results.push(...findAgentFiles(fullPath, pattern));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // If pattern specified, match against filename (without .md)
        if (pattern) {
          const nameWithoutExt = entry.name.replace('.md', '');
          if (nameWithoutExt === pattern) {
            results.push(fullPath);
          }
        } else {
          // No pattern - include all .md files
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Silently skip directories we can't read
  }

  return results;
}

/**
 * Detect if description uses block scalar
 * Returns the type of block scalar or null if none
 */
function detectBlockScalar(content: string): 'pipe' | 'folded' | null {
  // Pattern: description: | or description: >
  // Allows for optional indicators like |- or >+
  const pipePattern = /^description:\s*\|[-+]?\s*$/m;
  const foldedPattern = /^description:\s*>[-+]?\s*$/m;

  if (pipePattern.test(content)) {
    return 'pipe';
  }

  if (foldedPattern.test(content)) {
    return 'folded';
  }

  return null;
}

/**
 * Extract description field from content
 * Returns the description value or null if not found
 */
function extractDescription(content: string): string | null {
  // Match description: "value" or description: value (single-line)
  const singleLinePattern = /^description:\s*["']?(.+?)["']?\s*$/m;
  const match = content.match(singleLinePattern);

  if (match && match[1]) {
    return match[1].trim();
  }

  // Check if description field exists at all
  if (/^description:/m.test(content)) {
    // Field exists but might be empty or block scalar
    return '';
  }

  return null; // Field doesn't exist
}

/**
 * Extract name field from frontmatter
 */
function extractName(content: string): string | null {
  const namePattern = /^name:\s*(.+?)$/m;
  const match = content.match(namePattern);
  return match ? match[1].trim() : null;
}

/**
 * Get line number of a pattern match
 */
function getLineNumber(content: string, pattern: RegExp): number | undefined {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return i + 1; // Line numbers start at 1
    }
  }
  return undefined;
}

/**
 * Audit a single agent file
 */
function auditAgent(filePath: string): CriticalIssue[] {
  const issues: CriticalIssue[] = [];
  const agentName = basename(filePath, '.md');

  try {
    const content = readFileSync(filePath, 'utf-8');

    // Check 1: Block scalar detection
    const blockScalarType = detectBlockScalar(content);

    if (blockScalarType === 'pipe') {
      issues.push({
        agent: filePath,
        agentName,
        issue: 'block-scalar-pipe',
        line: getLineNumber(content, /^description:\s*\|/m),
        current: '|',
      });
    }

    if (blockScalarType === 'folded') {
      issues.push({
        agent: filePath,
        agentName,
        issue: 'block-scalar-folded',
        line: getLineNumber(content, /^description:\s*>/m),
        current: '>',
      });
    }

    // Check 2: Missing or empty description
    const description = extractDescription(content);

    if (description === null) {
      issues.push({
        agent: filePath,
        agentName,
        issue: 'missing-description',
      });
    } else if (description === '') {
      issues.push({
        agent: filePath,
        agentName,
        issue: 'empty-description',
        line: getLineNumber(content, /^description:/m),
      });
    }

    // Check 3: Name matches filename
    const name = extractName(content);
    if (name && name !== agentName) {
      issues.push({
        agent: filePath,
        agentName,
        issue: 'name-mismatch',
        line: getLineNumber(content, /^name:/m),
        current: name,
        expected: agentName,
      });
    }
  } catch (error) {
    console.error(chalk.red('⚠️  Tool Error - Failed to parse agent file'));
    console.error(chalk.gray('This is a tool failure (file read/parse error), not an audit violation'));
    console.error(chalk.gray(`File: ${filePath}`));
    console.error(chalk.red(String(error)));
    // Don't throw - continue checking other files
  }

  return issues;
}

/**
 * Format issue for display
 */
function formatIssue(issue: CriticalIssue): void {
  const location = issue.line ? ` (line ${issue.line})` : '';

  switch (issue.issue) {
    case 'block-scalar-pipe':
      console.log(chalk.red(`  ${issue.agentName}${location}: Block scalar pipe detected`));
      console.log(chalk.gray(`    Description uses | (pipe) - Claude sees literal "|", not content`));
      console.log(chalk.yellow(`    Fix: Convert to single-line with \\n escapes`));
      console.log(chalk.gray(`    Example: description: "Use when...\\n\\n<example>...\\n</example>"`));
      break;

    case 'block-scalar-folded':
      console.log(chalk.red(`  ${issue.agentName}${location}: Block scalar folded detected`));
      console.log(chalk.gray(`    Description uses > (folded) - Claude sees literal ">", not content`));
      console.log(chalk.yellow(`    Fix: Convert to single-line with \\n escapes`));
      break;

    case 'missing-description':
      console.log(chalk.red(`  ${issue.agentName}: Missing description field`));
      console.log(chalk.gray(`    No description field found in frontmatter`));
      console.log(chalk.yellow(`    Fix: Add description: "Use when..."`));
      break;

    case 'empty-description':
      console.log(chalk.red(`  ${issue.agentName}${location}: Empty description`));
      console.log(chalk.gray(`    Description field exists but is empty`));
      console.log(chalk.yellow(`    Fix: Provide description content`));
      break;

    case 'name-mismatch':
      console.log(chalk.red(`  ${issue.agentName}${location}: Name mismatch`));
      console.log(chalk.gray(`    Frontmatter name: "${issue.current}"`));
      console.log(chalk.gray(`    Filename: "${issue.expected}"`));
      console.log(chalk.yellow(`    Fix: Update name field to "${issue.expected}" OR rename file`));
      break;
  }

  console.log(); // Blank line between issues
}

/**
 * Show skill recommendations for an agent
 */
function showSkillRecommendations(agentPath: string): void {
  console.log(chalk.blue.bold('\n📊 Skill Recommendations\n'));
  console.log(chalk.gray('Which skills should this agent incorporate?\n'));

  const agentMetadata = extractAgentMetadata(agentPath);
  if (!agentMetadata) {
    console.log(chalk.yellow('  Could not extract agent metadata.\n'));
    return;
  }

  const recommendations = getSkillRecommendations(agentMetadata);

  if (recommendations.high.length === 0 && recommendations.medium.length === 0) {
    console.log(chalk.yellow('  No strong skill matches found.'));
    console.log(chalk.gray('  This agent may already have comprehensive skill coverage.\n'));

    if (recommendations.alreadyHas.length > 0) {
      console.log(chalk.gray(`  Already references ${recommendations.alreadyHas.length} skill(s):`));
      recommendations.alreadyHas.slice(0, 5).forEach(s => {
        console.log(chalk.gray(`    • ${s}`));
      });
      if (recommendations.alreadyHas.length > 5) {
        console.log(chalk.gray(`    ... and ${recommendations.alreadyHas.length - 5} more`));
      }
      console.log();
    }
    return;
  }

  // Show only HIGH and MEDIUM matches
  const relevantMatches = [...recommendations.high, ...recommendations.medium];
  console.log(formatSkillRecommendationTable(relevantMatches));

  // Summary
  console.log(chalk.bold('Summary:'));
  console.log(chalk.green(`  HIGH confidence: ${recommendations.high.length} skill(s)`));
  console.log(chalk.yellow(`  MEDIUM confidence: ${recommendations.medium.length} skill(s)`));
  console.log(chalk.gray(`  LOW confidence: ${recommendations.low.length} skill(s) (not shown)`));
  console.log(chalk.gray(`  Already referenced: ${recommendations.alreadyHas.length} skill(s)\n`));
}

/**
 * Main audit function
 */
async function auditCritical(agentPattern?: string): Promise<AuditResult> {
  const root = getRepoRoot();
  const agentsDir = join(root, '.claude/agents');

  // Find agent files recursively
  const agentFiles = findAgentFiles(agentsDir, agentPattern);

  if (agentFiles.length === 0) {
    if (agentPattern) {
      console.error(chalk.yellow(`\n⚠️  No agent found matching: ${agentPattern}`));
      console.error(chalk.gray('  Check that the agent name is correct and exists in .claude/agents/'));
    } else {
      console.error(chalk.yellow('\n⚠️  No agent files found in .claude/agents/'));
      console.error(chalk.gray('  Are you running from the correct directory?'));
    }
    process.exit(2); // Tool error
  }

  // Audit each agent
  const allIssues: CriticalIssue[] = [];

  for (const file of agentFiles) {
    const issues = auditAgent(file);
    allIssues.push(...issues);
  }

  // Report results
  if (allIssues.length === 0) {
    console.log(chalk.green(`\n✅ Critical audit passed`));
    console.log(chalk.gray(`  Checked ${agentFiles.length} agent(s)`));
    console.log(chalk.gray(`  No critical issues found\n`));
    return {
      passed: true,
      agentsChecked: agentFiles.length,
      issuesFound: [],
      agentPath: agentFiles.length === 1 ? agentFiles[0] : undefined,
    };
  }

  // Issues found
  console.log(chalk.red(`\n❌ Critical audit failed`));
  console.log(chalk.gray(`  Checked ${agentFiles.length} agent(s)`));
  console.log(chalk.red(`  Found ${allIssues.length} critical issue(s)\n`));

  // Group by agent
  const byAgent = allIssues.reduce((acc, issue) => {
    if (!acc[issue.agentName]) {
      acc[issue.agentName] = [];
    }
    acc[issue.agentName].push(issue);
    return acc;
  }, {} as Record<string, CriticalIssue[]>);

  // Format output
  for (const [agentName, issues] of Object.entries(byAgent)) {
    console.log(chalk.cyan(`\n${agentName}:`));
    issues.forEach(formatIssue);
  }

  console.log(chalk.yellow('Run with --help for fix guidance\n'));

  return {
    passed: false,
    agentsChecked: agentFiles.length,
    issuesFound: allIssues,
    agentPath: agentFiles.length === 1 ? agentFiles[0] : undefined,
  };
}

/**
 * Parse CLI arguments
 */
function parseArgs(args: string[]): { agentName?: string; showSkills: boolean; showHelp: boolean } {
  const showHelp = args.includes('--help') || args.includes('-h');
  const showSkills = args.includes('--skills');

  // Filter out flags to get agent name
  const nonFlags = args.filter(a => !a.startsWith('-'));
  const agentName = nonFlags[0];

  return { agentName, showSkills, showHelp };
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const { agentName, showSkills, showHelp } = parseArgs(args);

  // Help
  if (showHelp) {
    console.log(`
${chalk.cyan('audit-critical')} - Critical agent validation

${chalk.bold('Usage:')}
  npm run audit-critical -- <agent-name>             Check specific agent
  npm run audit-critical -- <agent-name> --skills    Check agent + skill recommendations
  npm run audit-critical                             Check all agents
  npm run audit-critical -- --help                   Show this help

${chalk.bold('Checks:')}
  1. Block scalar detection (| or > in description)
  2. Missing/empty description
  3. Name field matches filename

${chalk.bold('Options:')}
  --skills    Show recommended skills for the agent (like auditing-skills --agents)
  --help, -h  Show this help

${chalk.bold('Exit codes:')}
  0 - All checks passed
  1 - Issues found
  2 - Tool error (file not found, etc.)

${chalk.bold('Examples:')}
  npm run audit-critical -- frontend-developer
  npm run audit-critical -- frontend-developer --skills
  npm run audit-critical
`);
    process.exit(0);
  }

  // Run audit
  const result = await auditCritical(agentName);

  // Show skill recommendations if requested and single agent
  if (showSkills && result.agentPath) {
    showSkillRecommendations(result.agentPath);
  } else if (showSkills && !agentName) {
    console.log(chalk.yellow('\n⚠️  --skills requires a specific agent name'));
    console.log(chalk.gray('  Example: npm run audit-critical -- frontend-developer --skills\n'));
  }

  process.exit(result.passed ? 0 : 1);
}

// Export for testing
export { auditCritical, auditAgent, detectBlockScalar, extractDescription, extractName };

// Run main function (executed when file is run via tsx)
main();
