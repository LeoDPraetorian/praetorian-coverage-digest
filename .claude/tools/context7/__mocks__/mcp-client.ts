/**
 * Mock MCP Client for Testing
 *
 * This is a manual mock that avoids importing find-project-root
 */

import { vi } from 'vitest';

export const callMCPTool = vi.fn();
