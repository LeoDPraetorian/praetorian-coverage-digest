#!/usr/bin/env node
/**
 * test.ts - Agent Discovery Testing CLI
 *
 * ⚠️ INTERNAL UTILITY - Not invoked by agent-manager skill
 *
 * This CLI is for maintainers debugging agent discovery issues.
 * It performs basic structural tests (file exists, parses correctly, description visible).
 *
 * Users should invoke: skill: "testing-agent-skills"
 * That skill performs full behavioral validation by spawning agents.
 *
 * Usage (for maintainers only):
 *   npm run test -- <name>
 *   npm run test -- <name> <skill-name>
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { findAgent } from './lib/agent-finder.js';
import { parseAgent } from './lib/agent-parser.js';

const program = new Command();

program
  .name('test')
  .description('Test agent discovery and configuration')
  .argument('<name>', 'Agent name to test')
  .argument('[skill]', 'Optional skill name to verify auto-load')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (name, skill, options) => {
    try {
      const results: Array<{ test: string; passed: boolean; details: string }> = [];

      // Test 1: Agent exists
      console.log(chalk.cyan('\n═══ Discovery Tests ═══\n'));

      const spinner1 = ora('Test 1: Agent exists...').start();
      const agent = findAgent(name);

      if (!agent) {
        spinner1.fail('Agent not found');
        console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not a test failure.'));
        console.error(chalk.gray('  Check that the agent name is correct and exists in .claude/agents/'));
        process.exit(2);
      }

      spinner1.succeed(`Agent found: ${agent.filePath}`);
      results.push({
        test: 'Agent exists',
        passed: true,
        details: agent.filePath,
      });

      // Test 2: Agent parses correctly (already parsed by findAgent)
      const spinner2 = ora('Test 2: Agent parses correctly...').start();
      try {
        spinner2.succeed('Agent parsed successfully');
        results.push({
          test: 'Agent parses',
          passed: true,
          details: `Name: ${agent.frontmatter.name}, Category: ${agent.category}`,
        });
      } catch (err) {
        spinner2.fail(`Parse failed: ${err}`);
        console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not a test failure.'));
        console.error(chalk.gray(`  ${err}`));
        process.exit(2);
      }

      // Test 3: Description is not block scalar
      const spinner3 = ora('Test 3: Description syntax valid...').start();

      if (agent.descriptionStatus === 'valid') {
        spinner3.succeed('Description is single-line (valid)');
        results.push({
          test: 'Description syntax',
          passed: true,
          details: 'Single-line description',
        });
      } else {
        spinner3.fail(`Description uses block scalar: ${agent.descriptionStatus}`);
        results.push({
          test: 'Description syntax',
          passed: false,
          details: `Block scalar detected: ${agent.descriptionStatus}. Claude sees "|" or ">" instead of content.`,
        });
      }

      // Test 4: Description starts with "Use when"
      const spinner4 = ora('Test 4: Description has trigger...').start();

      if (agent.hasUseWhenTrigger) {
        spinner4.succeed('Description starts with "Use when"');
        results.push({
          test: 'Description trigger',
          passed: true,
          details: 'Starts with "Use when"',
        });
      } else {
        spinner4.fail('Description does not start with "Use when"');
        results.push({
          test: 'Description trigger',
          passed: false,
          details: 'Missing "Use when" trigger phrase',
        });
      }

      // Test 5: Has examples
      const spinner5 = ora('Test 5: Has examples...').start();

      if (agent.hasExamples) {
        spinner5.succeed('Description contains examples');
        results.push({
          test: 'Has examples',
          passed: true,
          details: 'Contains <example> blocks',
        });
      } else {
        spinner5.warn('No examples in description (recommended)');
        results.push({
          test: 'Has examples',
          passed: false, // warning, not failure
          details: 'No <example> blocks found',
        });
      }

      // Test 6: Line count
      const spinner6 = ora('Test 6: Line count within limits...').start();
      const lineLimit = ['architecture', 'orchestrator'].includes(agent.category) ? 400 : 300;

      if (agent.lineCount <= lineLimit) {
        spinner6.succeed(`Line count: ${agent.lineCount}/${lineLimit}`);
        results.push({
          test: 'Line count',
          passed: true,
          details: `${agent.lineCount} lines (max: ${lineLimit})`,
        });
      } else {
        spinner6.fail(`Line count exceeds limit: ${agent.lineCount}/${lineLimit}`);
        results.push({
          test: 'Line count',
          passed: false,
          details: `${agent.lineCount} lines exceeds ${lineLimit} line limit`,
        });
      }

      // Test 7: Gateway skill
      const spinner7 = ora('Test 7: Gateway skill configured...').start();

      if (agent.hasGatewaySkill) {
        spinner7.succeed('Has gateway skill in frontmatter');
        results.push({
          test: 'Gateway skill',
          passed: true,
          details: `skills: ${agent.frontmatter.skills}`,
        });
      } else {
        spinner7.warn('No gateway skill in frontmatter');
        results.push({
          test: 'Gateway skill',
          passed: false,
          details: 'Consider adding gateway-frontend, gateway-backend, etc.',
        });
      }

      // Test 8: Output format
      const spinner8 = ora('Test 8: Output format defined...').start();

      if (agent.hasOutputFormat) {
        spinner8.succeed('Has output format section');
        results.push({
          test: 'Output format',
          passed: true,
          details: 'Contains "Output Format" section',
        });
      } else {
        spinner8.warn('No output format section');
        results.push({
          test: 'Output format',
          passed: false,
          details: 'Missing standardized JSON output section',
        });
      }

      // Test 9: Escalation protocol
      const spinner9 = ora('Test 9: Escalation protocol defined...').start();

      if (agent.hasEscalationProtocol) {
        spinner9.succeed('Has escalation protocol');
        results.push({
          test: 'Escalation protocol',
          passed: true,
          details: 'Contains "Escalation Protocol" section',
        });
      } else {
        spinner9.warn('No escalation protocol');
        results.push({
          test: 'Escalation protocol',
          passed: false,
          details: 'Missing escalation/handoff section',
        });
      }

      // Test 10: Optional skill auto-load test
      if (skill) {
        const spinner10 = ora(`Test 10: Skill "${skill}" in frontmatter...`).start();
        const skills = (agent.frontmatter.skills || '').toLowerCase();

        if (skills.includes(skill.toLowerCase())) {
          spinner10.succeed(`Skill "${skill}" found in frontmatter`);
          results.push({
            test: 'Skill auto-load',
            passed: true,
            details: `skills field includes "${skill}"`,
          });
        } else {
          spinner10.fail(`Skill "${skill}" not in frontmatter`);
          results.push({
            test: 'Skill auto-load',
            passed: false,
            details: `skills field: ${agent.frontmatter.skills || '(empty)'}`,
          });
        }

        // Router: Skill Integration Testing (instruction-based)
        console.log(chalk.cyan('\n═══ Skill Integration Testing ═══\n'));
        console.log('The test above checks if the skill is in frontmatter.');
        console.log(chalk.bold('To test if the agent actually USES the skill correctly:\n'));
        console.log(chalk.white('  skill: "testing-agent-skills"\n'));
        console.log('Then provide:');
        console.log(chalk.gray(`  - Agent: ${name}`));
        console.log(chalk.gray(`  - Skill: ${skill}\n`));
        console.log('The skill will guide you through:');
        console.log(chalk.gray('  1. Verify skill file exists'));
        console.log(chalk.gray('  2. Design trigger scenario'));
        console.log(chalk.gray('  3. Spawn agent with Task tool'));
        console.log(chalk.gray('  4. Evaluate if agent invoked and followed skill'));
        console.log(chalk.gray('  5. Report PASS/FAIL/PARTIAL with reasoning'));
      }

      // Show results
      showResults(results, options.verbose);

      // Discovery test instruction
      console.log(chalk.cyan('\n═══ Manual Discovery Test ═══'));
      console.log('In a NEW Claude Code session, ask:');
      console.log(chalk.white(`  "What is the description for the ${name} agent? Quote it exactly."`));
      console.log('');
      console.log(chalk.gray('Expected: Full description text'));
      console.log(chalk.gray('Failure: Claude says "|" or ">" or must read the file'));

      // Test result summary
      const failures = results.filter((r) => !r.passed);

      console.log('');
      if (failures.some((f) => f.test === 'Description syntax')) {
        console.log(chalk.red.bold('═══════════════════════════════════════════════════════════════'));
        console.log(chalk.red.bold('  TEST RESULT: CRITICAL FAILURE'));
        console.log(chalk.red(`  Description syntax invalid - agent "${name}" is INVISIBLE to Claude`));
        console.log(chalk.gray(`  Run: npm run --silent fix -- ${name} --suggest`));
        console.log(chalk.red.bold('═══════════════════════════════════════════════════════════════'));
      } else if (failures.length > 3) {
        console.log(chalk.red.bold('═══════════════════════════════════════════════════════════════'));
        console.log(chalk.red.bold('  TEST RESULT: FAILED'));
        console.log(chalk.red(`  Agent "${name}" has ${failures.length} test failure(s)`));
        console.log(chalk.gray(`  Run: npm run --silent fix -- ${name} --suggest`));
        console.log(chalk.red.bold('═══════════════════════════════════════════════════════════════'));
      } else if (failures.length > 0) {
        console.log(chalk.yellow.bold('═══════════════════════════════════════════════════════════════'));
        console.log(chalk.yellow.bold('  TEST RESULT: PASSED WITH WARNINGS'));
        console.log(chalk.yellow(`  Agent "${name}" has ${failures.length} minor issue(s)`));
        console.log(chalk.gray(`  Run: npm run --silent fix -- ${name} --suggest`));
        console.log(chalk.yellow.bold('═══════════════════════════════════════════════════════════════'));
      } else {
        console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
        console.log(chalk.green.bold('  TEST RESULT: PASSED'));
        console.log(chalk.green(`  Agent "${name}" passed all discovery tests`));
        console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
      }

      // Exit 0 for successful test run (even with failures)
      // Test failures are not tool errors - the test ran correctly
      // Exit 2 is reserved for actual tool errors (file not found, parse errors, etc.)

    } catch (err) {
      console.error(chalk.red(`\n⚠️  Tool Error - This is a tool failure, not a test failure.`));
      console.error(chalk.gray(`  ${err}`));
      process.exit(2);
    }
  });

function showResults(
  results: Array<{ test: string; passed: boolean; details: string }>,
  verbose = false
): void {
  console.log(chalk.cyan('\n═══ Test Summary ═══\n'));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  console.log(`Total: ${results.length} | ${chalk.green(`Passed: ${passed}`)} | ${chalk.red(`Failed: ${failed}`)}`);

  if (verbose) {
    console.log('\nDetails:');
    for (const r of results) {
      const icon = r.passed ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${icon} ${r.test}: ${chalk.gray(r.details)}`);
    }
  }
}

program.parse();
