/**
 * Shared types for skill compliance tool
 */

export interface SkillFrontmatter {
  name: string;
  description: string;
  'allowed-tools'?: string;
  skills?: string;
  [key: string]: unknown;
}

export interface SkillFile {
  path: string;
  directory: string;
  name: string;
  frontmatter: SkillFrontmatter;
  content: string;
  wordCount: number;
  lineCount: number;  // Added for Phase 3 (Anthropic recommends <500 lines)
}

export type IssueSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface Issue {
  severity: IssueSeverity;
  message: string;
  line?: number;
  phase: number;
  autoFixable: boolean;
}

export interface PhaseResult {
  phaseName: string;
  phaseNumber: number;
  skillsAffected: number;
  issuesFound: number;
  issuesFixed: number;
  details: string[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export interface AuditResult {
  phases: PhaseResult[];
  totalSkills: number;
  totalCritical: number;
  totalWarnings: number;
  totalInfo: number;
  summary: string;
}

export interface FixOptions {
  dryRun: boolean;
  verbose: boolean;
  phase?: string;  // '2', '5', 'all', etc.
  skillName?: string;
}

export interface ValidatorResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
