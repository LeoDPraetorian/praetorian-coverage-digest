/**
 * Command Manager Types
 * Shared types for command lifecycle management
 */

export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface Issue {
  check: number;
  name: string;
  severity: Severity;
  message: string;
  fix?: string;
}

export interface AuditResult {
  command: string;
  path: string;
  passed: boolean;
  issues: Issue[];
  checks: CheckResult[];
}

export interface CheckResult {
  check: number;
  name: string;
  passed: boolean;
  severity?: Severity;
  message: string;
}

export interface CommandInfo {
  name: string;
  path: string;
  description?: string;
  allowedTools?: string[];
  skills?: string[];
  argumentHint?: string;
  model?: string;
  lineCount: number;
}

export interface FixResult {
  command: string;
  path: string;
  applied: boolean;
  changes: FixChange[];
  dryRun: boolean;
}

export interface FixChange {
  type: 'remove-tool' | 'add-verbatim' | 'trim-description' | 'add-argument-hint';
  before: string;
  after: string;
}

export interface CreateOptions {
  name: string;
  description?: string;
  backingSkill?: string;
  useRouterPattern: boolean;
}

export interface ListResult {
  commands: CommandStatus[];
  summary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
  };
}

export interface CommandStatus {
  name: string;
  description: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  issues: number;
}

// Exit codes
export const EXIT_SUCCESS = 0;
export const EXIT_ISSUES = 1;
export const EXIT_ERROR = 2;
