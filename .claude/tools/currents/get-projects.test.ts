/**
 * Get Projects Tool Tests
 *
 * Tests the getProjects tool wrapper with real MCP server connection.
 */

import { getProjects } from './get-projects';
import { isMCPAvailable } from '../config/lib/mcp-client';

describe('getProjects', () => {
  beforeAll(async () => {
    const mcpAvailable = await isMCPAvailable('currents', 'currents-get-projects');
    if (!mcpAvailable) {
      throw new Error('Currents MCP server not available. Install: npx -y @modelcontextprotocol/server-currents');
    }
  });

  it('should fetch projects from real MCP server', async () => {
    const result = await getProjects.execute({});

    expect(Array.isArray(result.projects)).toBe(true);
    expect(typeof result.totalProjects).toBe('number');
    expect(typeof result.estimatedTokens).toBe('number');
  });

  it('should return projects with id and name', async () => {
    const result = await getProjects.execute({});

    if (result.projects.length > 0) {
      const project = result.projects[0];
      expect(typeof project.id).toBe('string');
      expect(typeof project.name).toBe('string');
    }
  });

  it('should have correct tool name', () => {
    expect(getProjects.name).toBe('currents.get-projects');
  });

  it('should have input and output schemas', () => {
    expect(getProjects.inputSchema).toBeDefined();
    expect(getProjects.outputSchema).toBeDefined();
  });
});
