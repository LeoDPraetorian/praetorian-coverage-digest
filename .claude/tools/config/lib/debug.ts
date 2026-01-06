/**
 * Debug Logging Utility
 *
 * Centralized debug logging that can be controlled via environment variables.
 * In production, all debug output is silenced unless explicitly enabled.
 *
 * Environment variables:
 *   - MCP_DEBUG=1         Enable all MCP debug logging
 *   - SERENA_DEBUG=1      Enable Serena-specific debug logging
 *   - MCP_DEBUG_LEVEL=    Set log level (error, warn, info, debug)
 *
 * @module debug
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(namespace?: 'serena' | 'mcp'): boolean {
  // Check namespace-specific flag first
  if (namespace === 'serena' && process.env.SERENA_DEBUG === '1') {
    return true;
  }

  // Check general MCP debug flag
  if (process.env.MCP_DEBUG === '1') {
    return true;
  }

  return false;
}

/**
 * Get the current log level (defaults to 'error' in production, 'info' in debug)
 */
function getLogLevel(): number {
  const envLevel = process.env.MCP_DEBUG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVELS) {
    return LOG_LEVELS[envLevel];
  }

  // Default: only errors in production, info in debug mode
  // Check both SERENA_DEBUG and MCP_DEBUG for any debug mode
  const anyDebugEnabled = isDebugEnabled('serena') || isDebugEnabled('mcp');
  return anyDebugEnabled ? LOG_LEVELS.info : LOG_LEVELS.error;
}

/**
 * Create a namespaced logger
 *
 * @example
 * ```typescript
 * const log = createLogger('Serena');
 * log.info('Connection established');  // [Serena] Connection established
 * log.debug('Detailed info');          // Only shown if SERENA_DEBUG=1
 * log.error('Failed', error);          // Always shown
 * ```
 */
export function createLogger(namespace: string) {
  const prefix = `[${namespace}]`;
  const isSerena = namespace.toLowerCase().includes('serena');

  const shouldLog = (level: LogLevel): boolean => {
    // Errors are always logged
    if (level === 'error') return true;

    // Check if debug is enabled for this namespace
    if (!isDebugEnabled(isSerena ? 'serena' : 'mcp')) {
      return false;
    }

    // Check log level
    return LOG_LEVELS[level] <= getLogLevel();
  };

  return {
    error: (...args: unknown[]) => {
      console.error(prefix, ...args);
    },

    warn: (...args: unknown[]) => {
      if (shouldLog('warn')) {
        console.warn(prefix, ...args);
      }
    },

    info: (...args: unknown[]) => {
      if (shouldLog('info')) {
        console.log(prefix, ...args);
      }
    },

    debug: (...args: unknown[]) => {
      if (shouldLog('debug')) {
        console.log(prefix, '[DEBUG]', ...args);
      }
    },
  };
}

/**
 * Pre-configured loggers for common namespaces
 */
export const serenaLog = createLogger('Serena');
export const serenaPoolLog = createLogger('Serena Pool');
export const mcpLog = createLogger('MCP');

/**
 * One-off conditional log (for cases where creating a logger is overkill)
 *
 * @example
 * ```typescript
 * debugLog('serena', 'info', 'Routing to module:', moduleName);
 * ```
 */
export function debugLog(
  namespace: 'serena' | 'mcp',
  level: LogLevel,
  ...args: unknown[]
): void {
  if (level === 'error') {
    console.error(`[${namespace}]`, ...args);
    return;
  }

  if (!isDebugEnabled(namespace)) {
    return;
  }

  const currentLevel = getLogLevel();
  if (LOG_LEVELS[level] <= currentLevel) {
    const fn = level === 'warn' ? console.warn : console.log;
    fn(`[${namespace}]`, ...args);
  }
}
