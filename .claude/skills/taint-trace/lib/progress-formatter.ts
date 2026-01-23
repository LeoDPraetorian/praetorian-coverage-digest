export function formatPhaseStatus(
  phaseNumber: number,
  totalPhases: number,
  phaseName: string,
  items: string[] = []
): string {
  let output = `[Phase ${phaseNumber}/${totalPhases}] ${phaseName}...`;

  if (items.length > 0) {
    output += '\n  ' + items.join('\n  ');
  }

  return output;
}

export type CounterType =
  | 'functions_analyzed'
  | 'functions_listed'
  | 'xrefs_traced'
  | 'call_depth'
  | 'sources_found'
  | 'sinks_found';

export function formatCounter(
  type: CounterType,
  current: number,
  total?: number | null,
  completed: boolean = false
): string {
  const prefix = completed ? '✓' : '→';

  switch (type) {
    case 'functions_analyzed':
      return `${prefix} Analyzed ${current}/${total} functions`;

    case 'functions_listed':
      return `${prefix} Listed ${current} functions`;

    case 'xrefs_traced':
      return `${prefix} Traced ${current} cross-references`;

    case 'call_depth':
      return `${prefix} Current depth: ${current} call levels`;

    case 'sources_found':
      return `${prefix} Found ${current} input sources`;

    case 'sinks_found':
      return `${prefix} Found ${current} dangerous sinks`;

    default:
      return `${prefix} ${type}: ${current}`;
  }
}
