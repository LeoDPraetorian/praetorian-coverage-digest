/**
 * Shared utilities for MCP Manager
 */

import * as fs from 'fs';
import * as path from 'path';
import { findProjectRoot } from '../../../../lib/find-project-root.js';

// Re-export findProjectRoot as findRepoRoot for backward compatibility
export function findRepoRoot(): string {
  return findProjectRoot();
}

export function getToolsDir(): string {
  const repoRoot = findRepoRoot();
  return path.join(repoRoot, '.claude', 'tools');
}

export function getSkillsDir(): string {
  const repoRoot = findRepoRoot();
  return path.join(repoRoot, '.claude', 'skills');
}

export function findWrapperFile(name: string): string | null {
  const toolsDir = getToolsDir();

  // Handle formats: "<service>/<tool>" or "<tool>.ts"
  const normalized = name.replace(/\.ts$/, '');
  const parts = normalized.split('/');

  if (parts.length === 2) {
    // Service/tool format
    const [service, tool] = parts;
    const fullPath = path.join(toolsDir, service, `${tool}.ts`);
    return fs.existsSync(fullPath) ? fullPath : null;
  }

  // Search all services for tool name
  const services = fs.readdirSync(toolsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const service of services) {
    const toolPath = path.join(toolsDir, service, `${normalized}.ts`);
    if (fs.existsSync(toolPath)) {
      return toolPath;
    }
  }

  return null;
}

/**
 * Find wrapper file(s) by name or service directory
 * Returns array of wrapper paths
 * Supports:
 * - Service name: "<service>" -> all wrappers in .claude/tools/<service>/
 * - Service/tool: "<service>/<tool>" -> single wrapper
 * - Tool name: "<tool>" -> searches all services
 */
export function findWrapperFiles(name: string): string[] {
  const toolsDir = getToolsDir();
  const normalized = name.replace(/\.ts$/, '');
  const parts = normalized.split('/');

  if (parts.length === 2) {
    // Service/tool format - return single file
    const [service, tool] = parts;
    const fullPath = path.join(toolsDir, service, `${tool}.ts`);
    return fs.existsSync(fullPath) ? [fullPath] : [];
  }

  // Check if name is a service directory
  const serviceDir = path.join(toolsDir, normalized);
  if (fs.existsSync(serviceDir) && fs.statSync(serviceDir).isDirectory()) {
    // Return all wrappers in service (exclude test files, index, directories like internal/)
    return fs.readdirSync(serviceDir, { withFileTypes: true })
      .filter(d => d.isFile() && d.name.endsWith('.ts') && !d.name.includes('test') && !d.name.includes('index'))
      .map(d => path.join(serviceDir, d.name));
  }

  // Fallback: search all services for tool name (exclude internal/, lib/, config/)
  const services = fs.readdirSync(toolsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .filter(d => !d.name.startsWith('.') && d.name !== 'config' && d.name !== 'lib' && d.name !== 'internal')
    .map(d => d.name);

  for (const service of services) {
    const toolPath = path.join(toolsDir, service, `${normalized}.ts`);
    if (fs.existsSync(toolPath)) {
      return [toolPath];
    }
  }

  return [];
}

export function formatSeverity(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return '🔴';
    case 'WARNING': return '🟡';
    case 'INFO': return 'ℹ️';
    default: return '•';
  }
}

export function formatStatus(status: string): string {
  switch (status) {
    case 'PASS': return '✅ PASS';
    case 'WARN': return '⚠️ WARN';
    case 'FAIL': return '❌ FAIL';
    case 'SKIP': return '⏭️ SKIP';
    default: return status;
  }
}
