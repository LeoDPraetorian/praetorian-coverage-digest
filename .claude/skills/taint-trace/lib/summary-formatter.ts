/**
 * Formatting utilities for taint analysis summaries
 */

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Format risk level with emoji badge
 */
export function formatRiskBadge(level: string): string {
  const normalized = level.toLowerCase() as RiskLevel;

  const badges: Record<RiskLevel, string> = {
    critical: '🔴 CRITICAL',
    high: '🟠 HIGH',
    medium: '🟡 MEDIUM',
    low: '🟢 LOW'
  };

  return badges[normalized] || `⚪ ${level.toUpperCase()}`;
}

export interface TaintPathSummary {
  source: string;
  sink: string;
  call_chain: string[];
  risk_level: string;
}

/**
 * Format taint path as readable description
 */
export function formatTaintPathDescription(path: TaintPathSummary): string {
  const riskBadge = formatRiskBadge(path.risk_level);
  const { source, sink, call_chain } = path;

  // For long paths (>5 functions), show source ... middle ... sink
  let pathDisplay: string;
  if (call_chain.length > 5) {
    const middle = call_chain.slice(1, -1);
    pathDisplay = `${source} → ... (${middle.length} functions) ... → ${sink}`;
  } else {
    pathDisplay = call_chain.join(' → ');
  }

  return `[${riskBadge}] ${pathDisplay}`;
}

/**
 * Generate interactive command suggestions
 */
export function generateInteractiveCommands(pathCount: number): string {
  const commands: string[] = [];

  commands.push('**Interactive Commands:**');
  commands.push('');

  if (pathCount > 0) {
    commands.push(`- "show full chain for path N" - Expand path with transformations (N = 1-${pathCount})`);
  }

  commands.push('- "show decompiled code at FUNCTION" - View decompiled function code');
  commands.push('- "are there paths to SINK?" - Re-query with custom sink functions');
  commands.push('');
  commands.push('Examples:');
  commands.push('  - Show full chain for path 1');
  commands.push('  - Show code at recv');
  commands.push('  - Are there paths to EVP_EncryptInit?');

  return commands.join('\n');
}
