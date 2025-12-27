/**
 * Deterministic table formatter for skill management output.
 *
 * This module provides consistent, reproducible table formatting
 * for findings from auditing-skills, finding-agents-for-skills, etc.
 *
 * Key principle: Same input → Same output, ALWAYS.
 */

// ANSI color codes - fixed values for determinism
const COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
} as const;

// Fixed column widths for deterministic output
const COLUMN_WIDTHS = {
  severity: 12,
  phase: 26,
  issue: 58,
  recommendation: 58,
} as const;

// Severity symbols - consistent across all output
const SEVERITY_SYMBOLS = {
  CRITICAL: '●',
  WARNING: '▲',
  INFO: '○',
} as const;

export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';
export type Source = 'structural' | 'semantic' | 'agent-analysis' | 'gateway';

export interface Finding {
  severity: Severity;
  phase: string;
  issue: string;
  recommendation: string;
  source?: Source;
}

export interface FindingCounts {
  structural: { critical: number; warning: number; info: number };
  semantic: { critical: number; warning: number; info: number };
}

/**
 * Truncate string to max length with ellipsis.
 * Deterministic: same input always produces same output.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str.padEnd(maxLength);
  }
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Get severity sort order (CRITICAL first, then WARNING, then INFO).
 */
function severityOrder(severity: Severity): number {
  switch (severity) {
    case 'CRITICAL':
      return 0;
    case 'WARNING':
      return 1;
    case 'INFO':
      return 2;
    default:
      return 3;
  }
}

/**
 * Sort findings by severity (deterministic sort).
 */
function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const severityDiff = severityOrder(a.severity) - severityOrder(b.severity);
    if (severityDiff !== 0) return severityDiff;
    // Secondary sort by phase for stability
    return a.phase.localeCompare(b.phase);
  });
}

/**
 * Format a single table row.
 */
function formatRow(finding: Finding): string {
  const { gray } = COLORS;
  const symbol = SEVERITY_SYMBOLS[finding.severity];

  const severityCell = ` ${symbol} ${finding.severity}`.padEnd(COLUMN_WIDTHS.severity + 2);
  const phaseCell = truncate(finding.phase, COLUMN_WIDTHS.phase);
  const issueCell = truncate(finding.issue, COLUMN_WIDTHS.issue);
  const recCell = truncate(finding.recommendation, COLUMN_WIDTHS.recommendation);

  return `${gray}║${COLORS.reset}${severityCell}${gray}│${COLORS.reset} ${phaseCell} ${gray}│${COLORS.reset} ${issueCell} ${gray}│${COLORS.reset} ${recCell} ${gray}║${COLORS.reset}`;
}

/**
 * Format the table header.
 */
function formatHeader(): string {
  const { gray, cyan } = COLORS;
  const w = COLUMN_WIDTHS;

  const topBorder =
    `${gray}╔${'═'.repeat(w.severity + 2)}╤${'═'.repeat(w.phase + 2)}╤${'═'.repeat(w.issue + 2)}╤${'═'.repeat(w.recommendation + 2)}╗${COLORS.reset}`;

  const headerRow =
    `${gray}║${cyan} ${'Severity'.padEnd(w.severity + 1)}${gray}│${cyan} ${'Phase'.padEnd(w.phase + 1)}${gray}│${cyan} ${'Issue'.padEnd(w.issue + 1)}${gray}│${cyan} ${'Recommendation'.padEnd(w.recommendation + 1)}${gray}║${COLORS.reset}`;

  const headerSeparator =
    `${gray}╟${'─'.repeat(w.severity + 2)}┼${'─'.repeat(w.phase + 2)}┼${'─'.repeat(w.issue + 2)}┼${'─'.repeat(w.recommendation + 2)}╢${COLORS.reset}`;

  return `${topBorder}\n${headerRow}\n${headerSeparator}`;
}

/**
 * Format the table footer.
 */
function formatFooter(): string {
  const { gray } = COLORS;
  const w = COLUMN_WIDTHS;

  return `${gray}╚${'═'.repeat(w.severity + 2)}╧${'═'.repeat(w.phase + 2)}╧${'═'.repeat(w.issue + 2)}╧${'═'.repeat(w.recommendation + 2)}╝${COLORS.reset}`;
}

/**
 * Format row separator.
 */
function formatRowSeparator(): string {
  const { gray } = COLORS;
  const w = COLUMN_WIDTHS;

  return `${gray}╟${'─'.repeat(w.severity + 2)}┼${'─'.repeat(w.phase + 2)}┼${'─'.repeat(w.issue + 2)}┼${'─'.repeat(w.recommendation + 2)}╢${COLORS.reset}`;
}

/**
 * Format findings into a deterministic ANSI table.
 *
 * @param findings - Array of findings to format
 * @returns Formatted table string (deterministic output)
 */
export function formatFindingsTable(findings: Finding[]): string {
  if (findings.length === 0) {
    return `\n${COLORS.green}✅ No issues found.${COLORS.reset}\n`;
  }

  const sortedFindings = sortFindings(findings);
  const lines: string[] = [];

  lines.push(formatHeader());

  sortedFindings.forEach((finding, index) => {
    lines.push(formatRow(finding));
    if (index < sortedFindings.length - 1) {
      lines.push(formatRowSeparator());
    }
  });

  lines.push(formatFooter());

  return lines.join('\n');
}

/**
 * Format the completion message.
 *
 * @param counts - Finding counts by source and severity
 * @returns Formatted completion message (deterministic output)
 */
export function formatCompletionMessage(counts: FindingCounts): string {
  const structTotal =
    counts.structural.critical + counts.structural.warning + counts.structural.info;
  const semTotal = counts.semantic.critical + counts.semantic.warning + counts.semantic.info;
  const totalCritical = counts.structural.critical + counts.semantic.critical;

  const status = totalCritical > 0 ? 'FAILED' : 'PASSED';
  const statusColor = totalCritical > 0 ? COLORS.red : COLORS.green;

  const lines: string[] = [
    '',
    '─'.repeat(67),
    `  ${statusColor}AUDIT RESULT: ${status}${COLORS.reset}`,
    `  Structural: ${structTotal} issue(s) | Semantic: ${semTotal} issue(s)`,
    '─'.repeat(67),
  ];

  return lines.join('\n');
}

/**
 * Count findings by severity and source.
 */
export function countFindings(findings: Finding[]): FindingCounts {
  const counts: FindingCounts = {
    structural: { critical: 0, warning: 0, info: 0 },
    semantic: { critical: 0, warning: 0, info: 0 },
  };

  for (const f of findings) {
    const source = f.source === 'semantic' ? 'semantic' : 'structural';
    const severity = f.severity.toLowerCase() as 'critical' | 'warning' | 'info';
    counts[source][severity]++;
  }

  return counts;
}
