/**
 * Audit Runner
 *
 * Orchestrates all 8 audit phases and generates reports.
 */

import {
  AgentInfo,
  AuditResult,
  AuditPhaseResult,
  AuditPhaseNumber,
  AUDIT_PHASE_NAMES,
} from './types.js';
import { runPhase1 } from './phases/phase1-frontmatter-syntax.js';
import { runPhase2 } from './phases/phase2-description-quality.js';
import { runPhase3 } from './phases/phase3-prompt-efficiency.js';
import { runPhase4 } from './phases/phase4-skill-integration.js';
import { runPhase5 } from './phases/phase5-output-standardization.js';
import { runPhase6 } from './phases/phase6-escalation-protocol.js';
import { runPhase7 } from './phases/phase7-body-references.js';
import { runPhase8 } from './phases/phase8-skill-coverage.js';

/**
 * Phase runners by number
 */
const PHASE_RUNNERS: Record<AuditPhaseNumber, (agent: AgentInfo) => AuditPhaseResult> = {
  1: runPhase1,
  2: runPhase2,
  3: runPhase3,
  4: runPhase4,
  5: runPhase5,
  6: runPhase6,
  7: runPhase7,
  8: runPhase8,
};

/**
 * Run audit on an agent
 *
 * @param agent - Agent info to audit
 * @param phases - Optional specific phases to run (default: all)
 * @returns Complete audit result
 */
export function runAudit(
  agent: AgentInfo,
  phases?: AuditPhaseNumber[]
): AuditResult {
  const phasesToRun = phases || ([1, 2, 3, 4, 5, 6, 7, 8] as AuditPhaseNumber[]);
  const phaseResults: AuditPhaseResult[] = [];

  // Run each phase
  for (const phaseNum of phasesToRun) {
    const runner = PHASE_RUNNERS[phaseNum];
    if (runner) {
      const result = runner(agent);
      phaseResults.push(result);
    }
  }

  // Calculate summary
  let totalIssues = 0;
  let errors = 0;
  let warnings = 0;
  let passed = 0;
  let failed = 0;
  let autoFixable = 0;

  for (const result of phaseResults) {
    const phaseErrors = result.issues.filter(i => i.severity === 'error').length;
    const phaseWarnings = result.issues.filter(i => i.severity === 'warning').length;

    totalIssues += result.issues.length;
    errors += phaseErrors;
    warnings += phaseWarnings;

    if (result.passed) {
      passed++;
    } else {
      failed++;
    }

    if (result.autoFixable && result.suggestions.length > 0) {
      autoFixable += result.suggestions.filter(s => s.autoFixable).length;
    }
  }

  return {
    agent,
    timestamp: new Date().toISOString(),
    phases: phaseResults,
    summary: {
      totalIssues,
      errors,
      warnings,
      passed,
      failed,
      autoFixable,
    },
  };
}

/**
 * Format audit result as markdown report
 */
export function formatAuditReport(result: AuditResult): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Audit Report: ${result.agent.frontmatter.name}`);
  lines.push('');
  lines.push(`**File:** \`${result.agent.filePath}\``);
  lines.push(`**Category:** ${result.agent.category}`);
  lines.push(`**Lines:** ${result.agent.lineCount}`);
  lines.push(`**Timestamp:** ${result.timestamp}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Phases Passed | ${result.summary.passed}/${result.phases.length} |`);
  lines.push(`| Total Issues | ${result.summary.totalIssues} |`);
  lines.push(`| Errors | ${result.summary.errors} |`);
  lines.push(`| Warnings | ${result.summary.warnings} |`);
  lines.push(`| Auto-Fixable | ${result.summary.autoFixable} |`);
  lines.push('');

  // Overall status
  const overallPassed = result.summary.errors === 0;
  lines.push(`**Overall Status:** ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
  lines.push('');

  // Description Status (critical)
  lines.push('## Description Status');
  lines.push('');
  const statusEmoji = result.agent.descriptionStatus === 'valid' ? '✅' : '❌';
  lines.push(`**Status:** ${statusEmoji} ${result.agent.descriptionStatus}`);
  if (result.agent.descriptionStatus !== 'valid') {
    lines.push('');
    lines.push('> ⚠️ **CRITICAL:** Block scalar descriptions break Claude Code discovery.');
    lines.push('> Claude sees the literal `|` or `>` character instead of your description.');
  }
  lines.push('');

  // Phase Results
  lines.push('## Phase Results');
  lines.push('');

  for (const phase of result.phases) {
    const phaseStatus = phase.passed ? '✅' : '❌';
    const autoFixNote = phase.autoFixable ? ' (auto-fixable)' : '';

    lines.push(`### Phase ${phase.phase}: ${phase.name} ${phaseStatus}${autoFixNote}`);
    lines.push('');

    if (phase.issues.length === 0) {
      lines.push('No issues found.');
    } else {
      for (const issue of phase.issues) {
        const severityEmoji = {
          error: '🔴',
          warning: '🟡',
          info: 'ℹ️',
        }[issue.severity];

        lines.push(`- ${severityEmoji} **${issue.severity.toUpperCase()}:** ${issue.message}`);
        if (issue.details) {
          lines.push(`  - ${issue.details}`);
        }
      }
    }

    lines.push('');
  }

  // Suggestions
  const allSuggestions = result.phases.flatMap(p => p.suggestions);
  if (allSuggestions.length > 0) {
    lines.push('## Fix Suggestions');
    lines.push('');

    for (const suggestion of allSuggestions) {
      const autoTag = suggestion.autoFixable ? '**[AUTO-FIX]**' : '**[MANUAL]**';
      lines.push(`### ${autoTag} ${suggestion.id}`);
      lines.push('');
      lines.push(suggestion.description);

      if (suggestion.currentValue) {
        lines.push('');
        lines.push('**Current:**');
        lines.push('```');
        lines.push(suggestion.currentValue);
        lines.push('```');
      }

      if (suggestion.suggestedValue) {
        lines.push('');
        lines.push('**Suggested:**');
        lines.push('```');
        lines.push(suggestion.suggestedValue);
        lines.push('```');
      }

      lines.push('');
    }
  }

  // Quick Metrics
  lines.push('## Agent Metrics');
  lines.push('');
  lines.push(`| Metric | Status |`);
  lines.push(`|--------|--------|`);
  lines.push(`| Has "Use when" trigger | ${result.agent.hasUseWhenTrigger ? '✅' : '❌'} |`);
  lines.push(`| Has examples | ${result.agent.hasExamples ? '✅' : '❌'} |`);
  lines.push(`| Has gateway skill | ${result.agent.hasGatewaySkill ? '✅' : '❌'} |`);
  lines.push(`| Has output format | ${result.agent.hasOutputFormat ? '✅' : '❌'} |`);
  lines.push(`| Has escalation protocol | ${result.agent.hasEscalationProtocol ? '✅' : '❌'} |`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Format audit results for multiple agents as summary table
 */
export function formatBatchAuditSummary(results: AuditResult[]): string {
  const lines: string[] = [];

  lines.push('# Batch Audit Summary');
  lines.push('');
  lines.push(`**Total Agents:** ${results.length}`);
  lines.push(`**Passed:** ${results.filter(r => r.summary.errors === 0).length}`);
  lines.push(`**Failed:** ${results.filter(r => r.summary.errors > 0).length}`);
  lines.push('');

  lines.push('| Agent | Category | Lines | Status | Errors | Warnings | Description |');
  lines.push('|-------|----------|-------|--------|--------|----------|-------------|');

  for (const result of results) {
    const status = result.summary.errors === 0 ? '✅' : '❌';
    const descStatus = result.agent.descriptionStatus === 'valid' ? '✅' : '⚠️';

    lines.push(
      `| ${result.agent.frontmatter.name} ` +
      `| ${result.agent.category} ` +
      `| ${result.agent.lineCount} ` +
      `| ${status} ` +
      `| ${result.summary.errors} ` +
      `| ${result.summary.warnings} ` +
      `| ${descStatus} ${result.agent.descriptionStatus} |`
    );
  }

  lines.push('');

  // Category breakdown
  lines.push('## By Category');
  lines.push('');

  const byCategory = new Map<string, { passed: number; failed: number }>();
  for (const result of results) {
    const cat = result.agent.category;
    const current = byCategory.get(cat) || { passed: 0, failed: 0 };
    if (result.summary.errors === 0) {
      current.passed++;
    } else {
      current.failed++;
    }
    byCategory.set(cat, current);
  }

  lines.push('| Category | Passed | Failed |');
  lines.push('|----------|--------|--------|');
  for (const [category, counts] of byCategory) {
    lines.push(`| ${category} | ${counts.passed} | ${counts.failed} |`);
  }

  lines.push('');

  return lines.join('\n');
}
