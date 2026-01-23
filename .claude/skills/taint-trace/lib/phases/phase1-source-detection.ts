export interface DetectedSource {
  function: string;
  address: string;
  paramIndex: number; // Default to 1 for now
}

export async function detectSources(
  binaryName: string,
  sourcePatterns: string[],
  listExportsFn: (binaryName: string) => Promise<any>
): Promise<DetectedSource[]> {
  // Get all functions
  const exports = await listExportsFn(binaryName);

  // Filter to source patterns
  const sources: DetectedSource[] = [];
  for (const item of exports.items) {
    if (sourcePatterns.includes(item.name)) {
      sources.push({
        function: item.name,
        address: item.address,
        paramIndex: 1 // TODO: Determine from decompilation
      });
    }
  }

  return sources;
}

export async function confirmSourceUsage(
  sources: DetectedSource[],
  binaryName: string,
  decompileFn: (binaryName: string, functionName: string) => Promise<any>
): Promise<DetectedSource[]> {
  const confirmed: DetectedSource[] = [];

  for (const source of sources) {
    try {
      // Decompile the function to verify it exists and can be analyzed
      await decompileFn(binaryName, source.function);

      // For now, just verify decompilation succeeds
      // TODO: Parse decompiled code to extract parameter usage info
      confirmed.push(source);
    } catch (error) {
      // Skip sources that fail to decompile
      console.warn(`Failed to decompile ${source.function}:`, error);
    }
  }

  return confirmed;
}
