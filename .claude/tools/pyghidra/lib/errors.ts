/**
 * Pyghidra error types
 */

export class PyghidraError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN',
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PyghidraError';
  }
}

export class SymbolNotFoundError extends PyghidraError {
  constructor(
    symbolName: string,
    binaryName: string,
    suggestions?: string[]
  ) {
    const suggestionText = suggestions?.length
      ? ` Did you mean: ${suggestions.join(', ')}?`
      : '';
    super(
      `Symbol "${symbolName}" not found in "${binaryName}".${suggestionText}`,
      'SYMBOL_NOT_FOUND',
      { symbolName, binaryName, suggestions }
    );
    this.name = 'SymbolNotFoundError';
  }
}

export class BinaryNotFoundError extends PyghidraError {
  constructor(binaryName: string, suggestions?: string[]) {
    const suggestionText = suggestions?.length
      ? ` Did you mean: ${suggestions.join(', ')}?`
      : '';
    super(
      `Binary not found: "${binaryName}".${suggestionText} Use list_project_binaries to see available binaries.`,
      'BINARY_NOT_FOUND',
      { binaryName, suggestions }
    );
    this.name = 'BinaryNotFoundError';
  }
}

export class ValidationError extends PyghidraError {
  constructor(field: string, message: string) {
    super(message, 'VALIDATION_ERROR', { field });
    this.name = 'ValidationError';
  }
}

export class ImportError extends PyghidraError {
  constructor(binaryPath: string, reason: string) {
    super(
      `Failed to import binary "${binaryPath}": ${reason}`,
      'IMPORT_ERROR',
      { binaryPath, reason }
    );
    this.name = 'ImportError';
  }
}

export class ServerUnavailableError extends PyghidraError {
  constructor(
    port: number,
    public readonly recoverySuggestions: string[]
  ) {
    const suggestions = recoverySuggestions.length > 0
      ? `\n\nRecovery suggestions:\n${recoverySuggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : '';
    super(
      `PyGhidra server is not available on port ${port}.${suggestions}`,
      'SERVER_UNAVAILABLE',
      { port, recoverySuggestions }
    );
    this.name = 'ServerUnavailableError';
  }
}

export function parseMcpError(error: unknown): PyghidraError {
  const message = error instanceof Error ? error.message : String(error);

  // Classify error based on message content
  if (message.includes('not found') || message.includes('ENOENT')) {
    return new PyghidraError(message, 'NOT_FOUND');
  }
  if (message.includes('permission denied') || message.includes('EACCES')) {
    return new PyghidraError(message, 'PERMISSION_DENIED');
  }
  if (message.includes('already exists')) {
    return new PyghidraError(message, 'ALREADY_EXISTS');
  }

  return new PyghidraError(message, 'IMPORT_ERROR');
}
