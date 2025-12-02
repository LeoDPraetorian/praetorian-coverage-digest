/**
 * Shared types for MCP Manager CLI
 */

// Exit codes
// EXIT_SUCCESS (0): Operation completed successfully (even if issues were found)
// EXIT_ERROR (2): Tool error (invalid arguments, file not found, parse errors)
// Note: EXIT_ISSUES is deprecated - we return EXIT_SUCCESS even when issues are found
// because non-zero exit codes cause Claude Code's Bash tool to show "Error: Exit code N"
// which confuses users. Issues are communicated via clear visual banners instead.
export const EXIT_SUCCESS = 0;
export const EXIT_ISSUES = 1;  // DEPRECATED - use EXIT_SUCCESS with visual banners instead
export const EXIT_ERROR = 2;

// Audit severity levels
export type Severity = 'CRITICAL' | 'WARNING' | 'INFO';

// Audit issue
export interface Issue {
  severity: Severity;
  phase: number;
  message: string;
  file?: string;
  line?: number;
  suggestion: string;
}

// Audit result
export interface AuditResult {
  issues: Issue[];
  status: 'PASS' | 'WARN' | 'FAIL' | 'SKIP';
}

// Test result
export interface TestResult {
  passed: boolean;
  failures: number;
  coverage: number;
  duration: number;
}

// TDD phase
export type TDDPhase = 'RED' | 'GREEN' | 'REFACTOR';

// CLI operation
export type Operation = 'create' | 'verify-red' | 'generate-wrapper' | 'verify-green' | 'update' | 'audit' | 'fix' | 'test' | 'generate-skill';

// CLI options
export interface CLIOptions {
  operation: Operation;
  name?: string;
  service?: string;
  tool?: string;
  phase?: number;
  all?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
}

// Schema field representation (for skill-schema synchronization)
export interface SchemaField {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

// Schema mismatch representation
export interface SchemaMismatch {
  field: string;
  issue: 'missing' | 'type' | 'optionality' | 'extra';
  wrapperValue?: string;
  skillValue?: string;
}

// Skill-schema synchronization result
export interface SchemaSyncResult {
  wrapperFields: SchemaField[];
  skillFields: SchemaField[];
  mismatches: SchemaMismatch[];
}
