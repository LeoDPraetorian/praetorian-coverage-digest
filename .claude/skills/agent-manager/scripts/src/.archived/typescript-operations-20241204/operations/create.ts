#!/usr/bin/env node
/**
 * create.ts - TDD Agent Creation CLI
 *
 * Usage:
 *   npm run create -- <name> "<desc>" --type <category>
 *   npm run create -- <name> --suggest
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { findAgent, getRepoRoot } from './lib/agent-finder.js';
import { parseAgent } from './lib/agent-parser.js';
import { runAudit, formatAuditReport } from './lib/audit-runner.js';
import { AgentCategory, AGENT_CATEGORIES } from './lib/types.js';
import { formatMarkdownTables } from './lib/format-tables.js';
import { parseGatewaySkill, findRoutesForKeywords } from './lib/gateway-parser.js';
import { formatSkillReferencesForTemplate } from './lib/skill-references-generator.js';

const program = new Command();

/**
 * Lean agent template following the gold standard pattern
 */
function generateLeanTemplate(
  name: string,
  description: string,
  category: AgentCategory
): string {
  const title = name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  // Determine gateway based on category
  let gateway = 'gateway-frontend';
  switch (category) {
    case 'architecture':
    case 'development':
      if (name.includes('go') || name.includes('backend')) {
        gateway = 'gateway-backend';
      } else if (name.includes('react') || name.includes('frontend')) {
        gateway = 'gateway-frontend';
      }
      break;
    case 'testing':
      gateway = 'gateway-testing';
      break;
    case 'analysis':
      gateway = 'gateway-security';
      break;
    case 'mcp-tools':
      gateway = 'gateway-mcp-tools';
      break;
  }

  // Determine tools based on category
  let tools = 'Read, Write, Edit, Bash, Glob, Grep';
  if (category === 'architecture' || category === 'analysis') {
    tools = 'Read, Glob, Grep, TodoWrite, WebFetch, WebSearch';
  }

  // Generate real skill references from gateway (Feature 8)
  const gatewayInfo = parseGatewaySkill(gateway);
  const relevantRoutes = gatewayInfo
    ? findRoutesForKeywords(gatewayInfo, [name, category])
    : [];
  const skillRefsTable = formatSkillReferencesForTemplate(relevantRoutes.slice(0, 5));

  return `---
name: ${name}
description: ${description}
type: ${category}
permissionMode: default
tools: ${tools}
skills: ${gateway}
model: sonnet
---

# ${title}

You are a specialized ${category} agent.

## Core Responsibilities

- [Responsibility 1]
- [Responsibility 2]
- [Responsibility 3]

## Skill References (Load On-Demand via Gateway)

**IMPORTANT**: Before implementing, consult the \`${gateway}\` skill.

${skillRefsTable}

## Critical Rules (Non-Negotiable)

### [Rule Category 1]
- Specific rule that cannot live in skills

### [Rule Category 2]
- Platform-specific constraints

## Mandatory Skills (Must Use)

### Test-Driven Development
**When**: Writing new code or fixes
**Use**: \`developing-with-tdd\` skill

### Systematic Debugging
**When**: Investigating bugs
**Use**: \`debugging-systematically\` skill

### Verification
**When**: Before completing any task
**Use**: \`verifying-before-completion\` skill

## Output Format (Standardized)

Return results as structured JSON:

\`\`\`json
{
  "status": "complete|blocked|needs_review",
  "summary": "1-2 sentence description of what was done",
  "files_modified": ["path/to/file1.ts", "path/to/file2.ts"],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "command_output": "relevant output snippet"
  },
  "handoff": {
    "recommended_agent": "agent-name-if-needed",
    "context": "what the next agent should know/do"
  }
}
\`\`\`

## Escalation Protocol

**Stop and escalate if**:
- Architecture decision needed → Recommend \`${category}-architect\`
- Security concern identified → Recommend \`security-architect\`
- Blocked by unclear requirements → Use AskUserQuestion tool
- Outside expertise needed → Recommend relevant specialist

## Quality Checklist

Before completing, verify:
- [ ] All requirements addressed
- [ ] Tests pass (if applicable)
- [ ] No regressions introduced
- [ ] Code follows project patterns
`;
}

program
  .name('create')
  .description('Create a new agent using TDD workflow')
  .argument('<name>', 'Agent name (kebab-case)')
  .argument('[description]', 'Agent description (must start with "Use when")')
  .option('-t, --type <category>', 'Agent category', 'development')
  .option('--suggest', 'Generate description suggestions')
  .option('--dry-run', 'Show what would be created without writing')
  .action(async (name, description, options) => {
    try {
      const repoRoot = getRepoRoot();
      const category = options.type as AgentCategory;

      // Validate category
      if (!AGENT_CATEGORIES.includes(category)) {
        console.error(chalk.red(`\n⚠️  Tool Error - Invalid category: ${category}`));
        console.log(`Valid categories: ${AGENT_CATEGORIES.join(', ')}`);
        process.exit(2);
      }

      // Check if agent already exists
      const existing = findAgent(name);
      if (existing) {
        console.error(chalk.red(`\n⚠️  Tool Error - Agent already exists: ${existing.filePath}`));
        console.log(chalk.yellow('Use "npm run update" to modify existing agents'));
        process.exit(2);
      }

      // Validate name format
      if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name)) {
        console.error(chalk.red('\n⚠️  Tool Error - Invalid name format. Must be kebab-case (e.g., my-agent)'));
        process.exit(2);
      }

      // Handle --suggest mode
      if (options.suggest) {
        console.log(chalk.cyan('\nDescription Suggestions:'));
        console.log('─'.repeat(60));
        console.log(
          `1. Use when developing ${name.replace(/-/g, ' ')} features - [capabilities].`
        );
        console.log(
          `2. Use when implementing ${name.replace(/-/g, ' ')} functionality - [capabilities].`
        );
        console.log(
          `3. Use when working on ${name.replace(/-/g, ' ')} tasks - [capabilities].`
        );
        console.log('');
        console.log(chalk.gray('Add examples with \\n\\n<example>...\\n</example>'));
        return;
      }

      // Require description
      if (!description) {
        console.error(chalk.red('\n⚠️  Tool Error - Description required'));
        console.log('Usage: npm run create -- <name> "<description>" --type <category>');
        console.log('');
        console.log('Use --suggest to get description suggestions');
        process.exit(2);
      }

      // Validate description starts with "Use when"
      if (!description.toLowerCase().startsWith('use when')) {
        console.error(chalk.red('\n⚠️  Tool Error - Description must start with "Use when"'));
        console.log(chalk.yellow('Example: "Use when developing React components - UI bugs, performance."'));
        process.exit(2);
      }

      // TDD Phase 1: RED - Document the gap
      console.log(chalk.cyan('\n═══ TDD Phase: RED ═══'));
      console.log(chalk.gray('Document the gap this agent fills:'));
      console.log(`  Name: ${chalk.white(name)}`);
      console.log(`  Category: ${chalk.white(category)}`);
      console.log(`  Purpose: ${chalk.white(description)}`);
      console.log('');

      // Generate content
      const content = generateLeanTemplate(name, description, category);
      const agentPath = path.join(repoRoot, '.claude', 'agents', category, `${name}.md`);

      if (options.dryRun) {
        console.log(chalk.yellow('\n[DRY RUN] Would create:'));
        console.log(chalk.gray(agentPath));
        console.log('─'.repeat(60));
        console.log(content);
        return;
      }

      // Create directory if needed
      const dir = path.dirname(agentPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file with formatted tables
      const spinner = ora('Creating agent...').start();
      const formattedContent = formatMarkdownTables(content);
      fs.writeFileSync(agentPath, formattedContent, 'utf-8');
      spinner.succeed(`Created: ${agentPath}`);

      // TDD Phase 2: GREEN - Verify the agent works
      console.log(chalk.cyan('\n═══ TDD Phase: GREEN ═══'));
      console.log(chalk.gray('Running compliance audit...'));

      const agent = parseAgent(agentPath);
      const auditResult = runAudit(agent);

      if (auditResult.summary.errors > 0) {
        console.log(chalk.red('\n⚠️ Agent has compliance issues:'));
        console.log(formatAuditReport(auditResult));
        console.log(chalk.yellow('Run "npm run fix -- ' + name + '" to address issues'));
      } else {
        console.log(chalk.green('✅ Agent passes all compliance checks'));
      }

      // Next steps
      console.log(chalk.cyan('\n═══ Next Steps ═══'));
      console.log('1. Customize the template placeholders');
      console.log('2. Add specific responsibilities');
      console.log('3. Update skill references table');
      console.log('4. Define escalation conditions');
      console.log('5. Run: npm run audit -- ' + name);
      console.log('6. Test discovery in new Claude Code session');
    } catch (err) {
      console.error(chalk.red(`\n⚠️  Tool Error - This is a tool failure, not a validation failure.`));
      console.error(chalk.gray(`  ${err}`));
      process.exit(2);
    }
  });

program.parse();
