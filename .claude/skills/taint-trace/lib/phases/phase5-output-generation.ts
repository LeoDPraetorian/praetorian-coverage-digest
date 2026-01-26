import { RiskLevel } from './phase4-path-ranking';

export interface Summary {
  total_sources: number;
  total_sinks: number;
  vulnerabilities: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  total_functions: number;
  analysis_time_ms: number;
}

export interface PathWithRisk {
  risk_level: RiskLevel;
}

export interface PathDescription {
  source: string;
  sink: string;
  call_chain: string[];
  risk_level: RiskLevel;
}

/**
 * formatSummary - Creates summary object
 * @param totalSources Number of source functions
 * @param totalSinks Number of sink functions
 * @param paths Array of paths with risk levels
 * @param totalFunctions Total functions analyzed
 * @param analysisTimeMs Time spent in milliseconds
 * @returns Summary object
 */
export function formatSummary(
  totalSources: number,
  totalSinks: number,
  paths: PathWithRisk[],
  totalFunctions: number,
  analysisTimeMs: number
): Summary {
  const vulnerabilities = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  for (const path of paths) {
    vulnerabilities[path.risk_level]++;
  }

  return {
    total_sources: totalSources,
    total_sinks: totalSinks,
    vulnerabilities,
    total_functions: totalFunctions,
    analysis_time_ms: analysisTimeMs
  };
}

/**
 * generatePathDescription - Creates human-readable description
 * @param path Path with source, sink, call chain, and risk level
 * @returns Human-readable description
 */
export function generatePathDescription(path: PathDescription): string {
  const { source, sink, call_chain, risk_level } = path;

  // Identify source type
  const networkSources = ['recv', 'recvfrom', 'accept', 'read'];
  const isNetworkSource = networkSources.includes(source);
  const sourceType = isNetworkSource ? 'network input' : 'input';

  // Identify sink type
  const commandSinks = ['system', 'exec', 'execve', 'popen'];
  const isCommandSink = commandSinks.includes(sink);
  const sinkType = isCommandSink ? 'command execution' : 'memory operation';

  const chainLength = call_chain.length;

  return `${risk_level.toUpperCase()}: ${sourceType} from '${source}' flows through ${chainLength} function(s) to ${sinkType} '${sink}'`;
}
