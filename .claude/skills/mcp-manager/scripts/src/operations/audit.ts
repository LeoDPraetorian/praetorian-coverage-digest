/**
 * AUDIT operation
 * 10-phase validation of MCP wrapper compliance
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CLIOptions, AuditResult, Issue } from '../types.js';
import { EXIT_SUCCESS, EXIT_ISSUES, EXIT_ERROR } from '../types.js';
import { findWrapperFile, findWrapperFiles, getToolsDir, formatSeverity, formatStatus } from '../utils.js';

// Import all audit phases
import { auditPhase1 } from '../phases/phase1-schema-discovery.js';
import { auditPhase2 } from '../phases/phase2-optional-fields.js';
import { auditPhase3 } from '../phases/phase3-type-unions.js';
import { auditPhase4 } from '../phases/phase4-nested-access.js';
import { auditPhase5 } from '../phases/phase5-reference-validation.js';
import { auditUnitCoverage } from '../phases/phase6-unit-coverage.js';
import { auditIntegrationCoverage } from '../phases/phase7-integration-tests.js';
import { auditTestQuality } from '../phases/phase8-test-quality.js';
import { auditPhase9 } from '../phases/phase9-security-validation.js';
import { auditPhase10 } from '../phases/phase10-typescript-validation.js';
import { auditPhase11 } from '../phases/phase11-skill-schema-sync.js';

interface PhaseConfig {
  num: number;
  name: string;
  fn: (wrapperPath: string) => Promise<AuditResult>;
  autoFix: boolean;
}

const PHASES: PhaseConfig[] = [
  { num: 1, name: 'Schema Discovery', fn: auditPhase1, autoFix: false },
  { num: 2, name: 'Optional Fields', fn: auditPhase2, autoFix: true },
  { num: 3, name: 'Type Unions', fn: auditPhase3, autoFix: false },
  { num: 4, name: 'Nested Access Safety', fn: auditPhase4, autoFix: true },
  { num: 5, name: 'Reference Validation', fn: auditPhase5, autoFix: false },
  { num: 6, name: 'Unit Test Coverage', fn: auditUnitCoverage, autoFix: false },
  { num: 7, name: 'Integration Tests', fn: auditIntegrationCoverage, autoFix: false },
  { num: 8, name: 'Test Quality', fn: auditTestQuality, autoFix: false },
  { num: 9, name: 'Security Validation', fn: auditPhase9, autoFix: false },
  { num: 10, name: 'TypeScript Validation', fn: auditPhase10, autoFix: false },
  { num: 11, name: 'Skill-Schema Synchronization', fn: auditPhase11, autoFix: false },
];

export async function auditWrapper(options: CLIOptions): Promise<number> {
  // Handle --all flag
  if (options.all) {
    return auditAllWrappers(options);
  }

  if (!options.name) {
    console.error('❌ AUDIT requires wrapper name or --all flag');
    console.error('   Usage: npm run audit -- <name>');
    console.error('   Examples:');
    console.error('     npm run audit -- <service>           # Audit all wrappers in service');
    console.error('     npm run audit -- <service>/<tool>    # Audit specific wrapper');
    return EXIT_ERROR;
  }

  // Find wrapper file(s) - supports service names or specific wrappers
  const wrapperPaths = findWrapperFiles(options.name);
  if (wrapperPaths.length === 0) {
    console.error(`❌ Wrapper not found: ${options.name}`);
    console.error('   Try one of:');
    console.error('     - Service name: <service>');
    console.error('     - Service/tool: <service>/<tool>');
    console.error('     - Tool name: <tool>');
    return EXIT_ERROR;
  }

  // If multiple wrappers found, audit each one
  if (wrapperPaths.length > 1) {
    console.log(`🔍 Found ${wrapperPaths.length} wrappers for: ${options.name}\n`);
    return auditMultipleWrappers(wrapperPaths, options);
  }

  // Single wrapper audit
  const wrapperPath = wrapperPaths[0];
  console.log(`🔍 Auditing: ${wrapperPath}\n`);

  // Run audit phases
  const results: Map<number, AuditResult> = new Map();
  const phasesToRun = options.phase
    ? PHASES.filter(p => p.num === options.phase)
    : PHASES;

  for (const phase of phasesToRun) {
    if (options.verbose) {
      console.log(`Phase ${phase.num}: ${phase.name}...`);
    }
    const result = await phase.fn(wrapperPath);
    results.set(phase.num, result);

    if (options.verbose && result.issues.length > 0) {
      for (const issue of result.issues) {
        console.log(`  ${formatSeverity(issue.severity)} ${issue.message}`);
      }
    }
  }

  // Generate report
  const report = formatAuditReport(results, wrapperPath);
  console.log('\n' + report);

  // Determine result and show visual banner
  const hasCritical = Array.from(results.values()).some(r =>
    r.issues.some(i => i.severity === 'CRITICAL')
  );
  const hasWarnings = Array.from(results.values()).some(r =>
    r.issues.some(i => i.severity === 'WARNING')
  );

  // Clear visual summary for audit result (not a tool error)
  console.log('');
  if (hasCritical) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  AUDIT RESULT: FAILED');
    console.log(`  Wrapper "${options.name}" has critical issue(s)`);
    console.log(`  Run: npm run --silent fix -- ${options.name}`);
    console.log('═══════════════════════════════════════════════════════════════');
  } else if (hasWarnings) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  AUDIT RESULT: PASSED WITH WARNINGS');
    console.log(`  Wrapper "${options.name}" has warning(s)`);
    console.log('═══════════════════════════════════════════════════════════════');
  } else {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  AUDIT RESULT: PASSED');
    console.log(`  Wrapper "${options.name}" passed all compliance checks`);
    console.log('═══════════════════════════════════════════════════════════════');
  }

  // Exit 0 for successful audit run (even with violations)
  // Violations are not tool errors - the audit worked correctly
  // Exit 2 is reserved for actual tool errors (file not found, parse errors, etc.)
  return EXIT_SUCCESS;
}

async function auditMultipleWrappers(wrapperPaths: string[], options: CLIOptions): Promise<number> {
  let totalCritical = 0;
  let totalWarnings = 0;

  for (const wrapperPath of wrapperPaths) {
    const fileName = path.basename(wrapperPath);
    console.log(`\n━━━ ${fileName} ━━━`);

    const results: Map<number, AuditResult> = new Map();
    const phasesToRun = options.phase
      ? PHASES.filter(p => p.num === options.phase)
      : PHASES;

    for (const phase of phasesToRun) {
      const result = await phase.fn(wrapperPath);
      results.set(phase.num, result);
    }

    // Count issues
    const critical = Array.from(results.values()).reduce(
      (sum, r) => sum + r.issues.filter(i => i.severity === 'CRITICAL').length, 0
    );
    const warnings = Array.from(results.values()).reduce(
      (sum, r) => sum + r.issues.filter(i => i.severity === 'WARNING').length, 0
    );

    totalCritical += critical;
    totalWarnings += warnings;

    // Brief status
    if (critical > 0) {
      console.log(`❌ FAIL (${critical} critical, ${warnings} warnings)`);
    } else if (warnings > 0) {
      console.log(`⚠️  WARN (${warnings} warnings)`);
    } else {
      console.log(`✅ PASS`);
    }
  }

  // Summary with clear visual banner
  console.log('');
  if (totalCritical > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  AUDIT RESULT: FAILED');
    console.log(`  ${wrapperPaths.length} wrappers audited, ${totalCritical} critical issue(s), ${totalWarnings} warning(s)`);
    console.log('  Run: npm run --silent audit -- <service>/<tool> --verbose');
    console.log('═══════════════════════════════════════════════════════════════');
  } else if (totalWarnings > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  AUDIT RESULT: PASSED WITH WARNINGS');
    console.log(`  ${wrapperPaths.length} wrappers audited, ${totalWarnings} warning(s)`);
    console.log('═══════════════════════════════════════════════════════════════');
  } else {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  AUDIT RESULT: PASSED');
    console.log(`  ${wrapperPaths.length} wrappers passed all compliance checks`);
    console.log('═══════════════════════════════════════════════════════════════');
  }

  // Exit 0 for successful audit run (even with violations)
  return EXIT_SUCCESS;
}

async function auditAllWrappers(options: CLIOptions): Promise<number> {
  const toolsDir = getToolsDir();
  console.log(`🔍 Auditing all wrappers in: ${toolsDir}\n`);

  if (!fs.existsSync(toolsDir)) {
    console.error(`❌ Tools directory not found: ${toolsDir}`);
    return EXIT_ERROR;
  }

  // Find all services (exclude internal/, lib/, config/)
  const services = fs.readdirSync(toolsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => !d.name.startsWith('.') && d.name !== 'config' && d.name !== 'internal' && d.name !== 'lib')
    .map(d => d.name);

  // Filter by --service if provided
  const servicesToAudit = options.service
    ? services.filter(s => s === options.service)
    : services;

  if (servicesToAudit.length === 0) {
    console.error(`❌ No services found${options.service ? ` matching: ${options.service}` : ''}`);
    return EXIT_ERROR;
  }

  let totalCritical = 0;
  let totalWarnings = 0;
  let totalWrappers = 0;

  for (const service of servicesToAudit) {
    const serviceDir = path.join(toolsDir, service);
    // Use withFileTypes to exclude directories (like internal/)
    const wrappers = fs.readdirSync(serviceDir, { withFileTypes: true })
      .filter(d => d.isFile() && d.name.endsWith('.ts') && !d.name.includes('test') && !d.name.includes('index'))
      .map(d => d.name);

    for (const wrapper of wrappers) {
      const wrapperPath = path.join(serviceDir, wrapper);
      console.log(`\n━━━ ${service}/${wrapper} ━━━`);

      const results: Map<number, AuditResult> = new Map();
      const phasesToRun = options.phase
        ? PHASES.filter(p => p.num === options.phase)
        : PHASES;

      for (const phase of phasesToRun) {
        const result = await phase.fn(wrapperPath);
        results.set(phase.num, result);
      }

      // Count issues
      const critical = Array.from(results.values()).reduce(
        (sum, r) => sum + r.issues.filter(i => i.severity === 'CRITICAL').length, 0
      );
      const warnings = Array.from(results.values()).reduce(
        (sum, r) => sum + r.issues.filter(i => i.severity === 'WARNING').length, 0
      );

      totalCritical += critical;
      totalWarnings += warnings;
      totalWrappers++;

      // Brief status
      if (critical > 0) {
        console.log(`❌ FAIL (${critical} critical, ${warnings} warnings)`);
      } else if (warnings > 0) {
        console.log(`⚠️  WARN (${warnings} warnings)`);
      } else {
        console.log(`✅ PASS`);
      }
    }
  }

  // Summary with clear visual banner
  console.log('');
  if (totalCritical > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  AUDIT RESULT: FAILED');
    console.log(`  ${totalWrappers} wrappers audited, ${totalCritical} critical issue(s), ${totalWarnings} warning(s)`);
    console.log('  Run: npm run --silent audit -- <service>/<tool> --verbose');
    console.log('═══════════════════════════════════════════════════════════════');
  } else if (totalWarnings > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  AUDIT RESULT: PASSED WITH WARNINGS');
    console.log(`  ${totalWrappers} wrappers audited, ${totalWarnings} warning(s)`);
    console.log('═══════════════════════════════════════════════════════════════');
  } else {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  AUDIT RESULT: PASSED');
    console.log(`  ${totalWrappers} wrappers passed all compliance checks`);
    console.log('═══════════════════════════════════════════════════════════════');
  }

  // Exit 0 for successful audit run (even with violations)
  return EXIT_SUCCESS;
}

function formatAuditReport(results: Map<number, AuditResult>, file: string): string {
  let report = '📊 Audit Report\n\n';
  report += `File: ${file}\n\n`;

  // Phase summary table
  report += '| Phase | Name | Critical | Warnings | Status |\n';
  report += '|-------|------|----------|----------|--------|\n';

  for (const phase of PHASES) {
    const result = results.get(phase.num);
    if (!result) continue;

    const critical = result.issues.filter(i => i.severity === 'CRITICAL').length;
    const warnings = result.issues.filter(i => i.severity === 'WARNING').length;

    report += `| ${phase.num} | ${phase.name} | ${critical} | ${warnings} | ${formatStatus(result.status)} |\n`;
  }

  // Issue details
  const allIssues = Array.from(results.values()).flatMap(r => r.issues);
  if (allIssues.length > 0) {
    report += '\n🔍 Issue Details\n\n';
    for (const phase of PHASES) {
      const result = results.get(phase.num);
      if (!result || result.issues.length === 0) continue;

      report += `**Phase ${phase.num}: ${phase.name}**\n`;
      for (const issue of result.issues) {
        report += `  ${formatSeverity(issue.severity)} ${issue.message}\n`;
        report += `     Suggestion: ${issue.suggestion}\n`;
      }
      report += '\n';
    }
  }

  // Overall status
  const totalCritical = allIssues.filter(i => i.severity === 'CRITICAL').length;
  const totalWarnings = allIssues.filter(i => i.severity === 'WARNING').length;

  report += '📈 Overall Status\n';
  report += `  Critical: ${totalCritical}\n`;
  report += `  Warnings: ${totalWarnings}\n`;
  report += `  Result: ${totalCritical > 0 ? '❌ FAILED' : totalWarnings > 0 ? '⚠️ WARNINGS' : '✅ PASSED'}\n`;

  return report;
}
