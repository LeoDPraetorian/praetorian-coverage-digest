// Error handling utilities for chrome-devtools wrappers

export class ChromeDevToolsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ChromeDevToolsError';
  }
}

export class ValidationError extends ChromeDevToolsError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends ChromeDevToolsError {
  constructor(message: string, details?: unknown) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}

export class ElementNotFoundError extends ChromeDevToolsError {
  constructor(selector: string) {
    super(`Element not found: ${selector}`, 'ELEMENT_NOT_FOUND', { selector });
    this.name = 'ElementNotFoundError';
  }
}

export class PageNotFoundError extends ChromeDevToolsError {
  constructor(pageId: string) {
    super(`Page not found: ${pageId}`, 'PAGE_NOT_FOUND', { pageId });
    this.name = 'PageNotFoundError';
  }
}

export class NavigationError extends ChromeDevToolsError {
  constructor(url: string, details?: Record<string, unknown>) {
    super(`Navigation failed to: ${url}`, 'NAVIGATION_ERROR', { url, ...details });
    this.name = 'NavigationError';
  }
}

/**
 * Wrap errors with context for better debugging
 */
export function wrapError(error: unknown, context: string): ChromeDevToolsError {
  if (error instanceof ChromeDevToolsError) {
    return error;
  }

  if (error instanceof Error) {
    return new ChromeDevToolsError(
      `${context}: ${error.message}`,
      'WRAPPED_ERROR',
      { originalError: error }
    );
  }

  return new ChromeDevToolsError(
    `${context}: ${String(error)}`,
    'UNKNOWN_ERROR',
    { originalError: error }
  );
}
