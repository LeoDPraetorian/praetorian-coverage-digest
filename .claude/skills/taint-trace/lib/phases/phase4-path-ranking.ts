export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Path {
  source: string;
  sink: string;
  path: string[];
}

export interface RankedPath extends Path {
  risk_level: RiskLevel;
}

/**
 * rankPaths - Sorts paths by risk (network+system=critical, etc.)
 * @param paths Array of paths to rank
 * @returns Sorted array with risk_level assigned
 */
export function rankPaths(paths: Path[]): RankedPath[] {
  const rankedPaths: RankedPath[] = paths.map(path => ({
    ...path,
    risk_level: calculateRiskLevel(path.source, path.sink)
  }));

  // Sort by risk level (critical > high > medium > low)
  const riskOrder: Record<RiskLevel, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3
  };

  rankedPaths.sort((a, b) => riskOrder[a.risk_level] - riskOrder[b.risk_level]);

  return rankedPaths;
}

/**
 * calculateRiskLevel - Determines risk based on source and sink criticality
 */
function calculateRiskLevel(source: string, sink: string): RiskLevel {
  const networkSources = ['recv', 'recvfrom', 'accept', 'read'];
  const criticalSinks = ['system', 'exec', 'execve', 'popen'];
  const highSinks = ['strcpy', 'strcat', 'sprintf', 'gets'];

  const isNetworkSource = networkSources.includes(source);
  const isCriticalSink = criticalSinks.includes(sink);
  const isHighSink = highSinks.includes(sink);

  if (isNetworkSource && isCriticalSink) {
    return 'critical';
  } else if (isCriticalSink || isHighSink) {
    return 'high';
  } else {
    return 'medium';
  }
}

/**
 * detectSanitization - Regex for bounds checks (if.*<, sizeof, etc.)
 * @param code Code snippet to analyze
 * @returns true if sanitization detected
 */
export function detectSanitization(code: string): boolean {
  // Check for common sanitization patterns
  const patterns = [
    /if\s*\([^)]*<[^)]*\)/,        // if (x < y)
    /if\s*\([^)]*<=[^)]*\)/,       // if (x <= y)
    /if\s*\([^)]*>[^)]*\)/,        // if (x > y)
    /if\s*\([^)]*>=[^)]*\)/,       // if (x >= y)
    /sizeof\s*\(/,                  // sizeof(...)
    /strlen\s*\(/,                  // strlen(...)
    /\b(MAX|MIN)_\w+\b/,           // MAX_SIZE, MIN_LENGTH, etc.
  ];

  return patterns.some(pattern => pattern.test(code));
}
