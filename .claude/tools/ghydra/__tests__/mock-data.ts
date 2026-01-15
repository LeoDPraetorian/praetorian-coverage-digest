/**
 * Shared Mock Data for Ghydra MCP Wrappers
 *
 * This file provides reusable test fixtures for all 35 ghydra wrapper tests.
 * Created as part of TDD workflow for instances-list (first tool).
 */

/**
 * Raw instance data (as returned by MCP server)
 */
export interface RawInstance {
  host: string;
  port: number;
  url: string;
  status: string;
  program: string | null;
  current: boolean;
  // Additional fields that will be filtered out
  lastConnected?: string;
  version?: string;
  pid?: number;
  uptime?: number;
  capabilities?: string[];
}

/**
 * Mock: Single connected instance with program loaded
 */
export const mockConnectedInstance: RawInstance = {
  host: 'localhost',
  port: 13100,
  url: 'http://localhost:13100',
  status: 'connected',
  program: 'malware.exe',
  current: true,
  lastConnected: '2026-01-13T16:00:00Z',
  version: '11.0.3',
  pid: 12345,
  uptime: 3600,
  capabilities: ['decompile', 'disassemble', 'analyze'],
};

/**
 * Mock: Disconnected instance
 */
export const mockDisconnectedInstance: RawInstance = {
  host: 'localhost',
  port: 13101,
  url: 'http://localhost:13101',
  status: 'disconnected',
  program: null,
  current: false,
  lastConnected: '2026-01-13T15:00:00Z',
  version: '11.0.3',
  pid: 0,
  uptime: 0,
  capabilities: [],
};

/**
 * Mock: Multiple instances (some connected, some not)
 */
export const mockMultipleInstances: RawInstance[] = [
  {
    host: 'localhost',
    port: 13100,
    url: 'http://localhost:13100',
    status: 'connected',
    program: 'malware.exe',
    current: true,
    lastConnected: '2026-01-13T16:00:00Z',
    version: '11.0.3',
    pid: 12345,
    uptime: 3600,
    capabilities: ['decompile', 'disassemble'],
  },
  {
    host: 'localhost',
    port: 13101,
    url: 'http://localhost:13101',
    status: 'connected',
    program: 'firmware.bin',
    current: false,
    lastConnected: '2026-01-13T15:30:00Z',
    version: '11.0.3',
    pid: 12346,
    uptime: 1800,
    capabilities: ['decompile'],
  },
  {
    host: 'localhost',
    port: 13102,
    url: 'http://localhost:13102',
    status: 'disconnected',
    program: null,
    current: false,
    lastConnected: '2026-01-13T14:00:00Z',
    version: '11.0.2',
    pid: 0,
    uptime: 0,
    capabilities: [],
  },
];

/**
 * Mock: Instance with null/undefined fields
 */
export const mockInstanceWithNulls: Partial<RawInstance> = {
  host: 'localhost',
  port: 13100,
  url: 'http://localhost:13100',
  // status is missing (undefined)
  program: null,
  current: false,
};

/**
 * Mock: Instance with malicious program name (path traversal)
 */
export const mockInstanceWithMaliciousProgram: RawInstance = {
  host: 'localhost',
  port: 13100,
  url: 'http://localhost:13100',
  status: 'connected',
  program: '../../../etc/passwd',
  current: true,
};

/**
 * Mock: Instance with invalid port
 */
export const mockInstanceWithInvalidPort = {
  host: 'localhost',
  port: 99999, // Invalid port
  url: 'http://localhost:99999',
  status: 'connected',
  program: 'test.exe',
  current: false,
};

/**
 * Mock: Empty instances array
 */
export const mockEmptyInstances: RawInstance[] = [];

/**
 * Mock: All instances disconnected
 */
export const mockAllDisconnected: RawInstance[] = [
  {
    host: 'localhost',
    port: 13100,
    url: 'http://localhost:13100',
    status: 'disconnected',
    program: null,
    current: false,
  },
  {
    host: 'localhost',
    port: 13101,
    url: 'http://localhost:13101',
    status: 'disconnected',
    program: null,
    current: false,
  },
];
