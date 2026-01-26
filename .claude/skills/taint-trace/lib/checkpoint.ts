import fs from 'fs';

/**
 * Load checkpoint from a file
 */
export function loadCheckpointFromFile(filePath: string): any | null {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Save checkpoint to a file
 */
export function saveCheckpointToFile(filePath: string, checkpoint: any): void {
  fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), 'utf-8');
}

/**
 * Merge partial results with existing checkpoint
 */
export function mergePartialResults(checkpoint: any, newResults: any): any {
  const merged = { ...checkpoint };

  // Merge functions_analyzed
  merged.functions_analyzed =
    (checkpoint.functions_analyzed || 0) + (newResults.functions_analyzed || 0);

  // Merge paths arrays
  const checkpointPaths = checkpoint.paths || [];
  const newPaths = newResults.paths || [];
  merged.paths = [...checkpointPaths, ...newPaths];

  return merged;
}
