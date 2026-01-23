import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AgentPromptParams {
  binary_path: string;
  sources: string[];
  sinks: string[];
  cache_file: string;
}

/**
 * Builds agent prompt by substituting variables in orchestrator-prompt.md template
 */
export function buildAgentPrompt(params: AgentPromptParams): string {
  const templatePath = path.join(__dirname, '../orchestrator-prompt.md');
  const template = fs.readFileSync(templatePath, 'utf-8');

  // Substitute variables
  let prompt = template;
  prompt = prompt.replace(/{BINARY_PATH}/g, params.binary_path);
  prompt = prompt.replace(/{SOURCES}/g, JSON.stringify(params.sources));
  prompt = prompt.replace(/{SINKS}/g, JSON.stringify(params.sinks));
  prompt = prompt.replace(/{CACHE_FILE}/g, params.cache_file);

  return prompt;
}

interface TaintSource {
  function: string;
  param_index: number;
  type: string;
}

interface TaintPath {
  source: string;
  sink: string;
  risk_level: string;
}

interface VulnerabilitySummary {
  high?: number;
  medium?: number;
  low?: number;
  critical?: number;
}

interface TaintSummary {
  total_sources: number;
  vulnerabilities: VulnerabilitySummary;
}

interface AgentOutputResult {
  sources: TaintSource[];
  paths: TaintPath[];
  summary: TaintSummary;
}

/**
 * Parses and validates JSON output from taint analysis agent
 */
export function parseAgentOutput(output: string): AgentOutputResult {
  let parsed: any;

  try {
    parsed = JSON.parse(output);
  } catch (error) {
    throw new Error(`Failed to parse agent output: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }

  // Validate required fields
  if (!parsed.sources || !Array.isArray(parsed.sources)) {
    throw new Error('Missing required field: sources (must be array)');
  }
  if (!parsed.paths || !Array.isArray(parsed.paths)) {
    throw new Error('Missing required field: paths (must be array)');
  }
  if (!parsed.summary || typeof parsed.summary !== 'object') {
    throw new Error('Missing required field: summary (must be object)');
  }

  return parsed as AgentOutputResult;
}
