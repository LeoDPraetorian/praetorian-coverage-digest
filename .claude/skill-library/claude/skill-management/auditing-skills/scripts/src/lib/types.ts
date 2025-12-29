/**
 * Core types for skill audit tool
 */

export type SkillType =
  | 'reasoning'      // Process-driven, Claude is the engine
  | 'tool-wrapper'   // CLI-driven, Claude just executes
  | 'hybrid';        // Mix of both

export interface SkillFrontmatter {
  name: string;
  description: string;
  'allowed-tools'?: string;
  'skill-type'?: SkillType;  // Optional frontmatter override
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
  skillType: SkillType;  // Auto-detected or from frontmatter
}

export type IssueSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface Issue {
  severity: IssueSeverity;
  message: string;
  /** What to do about this issue (displayed in Recommendation column) */
  recommendation?: string;
  /** Additional context/details (displayed as sub-items or collapsed) */
  context?: string[];
  line?: number;
  fix?: () => Promise<void>;
  autoFixable?: boolean;
}

/**
 * Structured issue for table formatting
 * Separates issue description from recommendation for clean table display
 */
export interface StructuredIssue {
  phase: string;           // "Phase 1: Description Format"
  phaseNumber: number;     // 1 (for sorting)
  severity: IssueSeverity; // CRITICAL | WARNING | INFO
  issue: string;           // Short description
  recommendation: string;  // What to do about it
  details?: string;        // Additional context (optional)
}

/**
 * Agent recommendation for skill usage
 * Used by Phase 15 (Orphan Detection) to suggest which agents should use a skill
 */
export interface AgentRecommendation {
  agent: string;              // Agent name (e.g., "frontend-developer")
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;              // 0-100 match score
  matchReasons: string[];     // Reasons for the match
  recommendation: string;     // What to do (e.g., "Add to gateway-frontend")
}

export interface SkillAuditResult {
  skillName: string;
  skillPath: string;
  status: 'PASS' | 'NEEDS_IMPROVEMENT' | 'FAIL';
  issues: Issue[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
}

export interface AuditSummary {
  totalSkills: number;
  passCount: number;
  needsImprovementCount: number;
  failCount: number;
  totalCritical: number;
  totalWarnings: number;
  totalInfo: number;
  results: SkillAuditResult[];
}

export interface PhaseResult {
  phaseName: string;
  skillsAffected: number;
  issuesFound: number;
  issuesFixed: number;
  details: string[];
  /** Raw Issue objects for table formatting (preserves recommendation/context) */
  rawIssues?: Issue[];
}

export interface ProgressMetrics {
  phase1: {
    compliant: number;
    total: number;
    percentage: number;
  };
  phase2: {
    hasField: number;
    total: number;
    percentage: number;
  };
  phase3: {
    optimal: number;
    tooShort: number;
    tooLong: number;
    total: number;
    percentage: number;
  };
  phase4: {
    cleanLinks: number;
    brokenLinks: number;
    total: number;
    percentage: number;
  };
  phase5: {
    cleanOrg: number;
    orphanedFiles: number;
    total: number;
    percentage: number;
  };
  overallScore: number;
}

export interface SkillToolSet {
  category: string;
  tools: string[];
}

export const TOOL_SETS: Record<string, string[]> = {
  'claude-agent': ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash'],
  'testing': ['Read', 'Bash', 'Grep', 'Glob'],
  'frontend': ['Read', 'Write', 'Edit', 'Bash', 'Grep'],
  'backend': ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
  'mcp-integration': ['Read', 'Bash', 'WebFetch'],
  'debug': ['Read', 'Bash', 'Grep', 'Glob'],
  'git': ['Bash', 'Read'],
  'security': ['Read', 'Grep', 'Bash'],
  'default': ['Read', 'Write', 'Bash'],
};

export interface FixOptions {
  dryRun: boolean;
  interactive: boolean;
  autoFix: boolean;
  /** Optional skill name to target a single skill instead of all skills */
  skillName?: string;
}

export interface ValidatorResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// Interactive Fix Mode Types (Claude-mediated)
// ============================================

/**
 * Structured output for Claude-mediated fix workflow.
 * Deterministic fixes auto-apply, semantic fixes return suggestions
 * for Claude to present to users via AskUserQuestion.
 */
export interface FixSuggestionOutput {
  skill: string;
  skillPath: string;

  /** Fixes applied automatically (deterministic) */
  deterministic: {
    applied: number;
    details: string[];
  };

  /** Issues needing user decision (semantic) */
  semantic: SemanticSuggestion[];

  /** Overall summary */
  summary: {
    deterministicApplied: number;
    semanticPending: number;
    status: 'COMPLETE' | 'NEEDS_INPUT' | 'FAILED';
  };
}

/**
 * A suggestion for a semantic fix that requires user input.
 * Claude interprets this and presents it to the user.
 */
export interface SemanticSuggestion {
  /** Unique ID for apply command (e.g., "phase1-description") */
  id: string;

  /** Phase number for reference */
  phase: number;

  /** User-friendly title (no jargon) */
  title: string;

  /** Why this matters (1-2 sentences, user-facing) */
  explanation: string;

  /** Current value if applicable */
  currentValue?: string;

  /** Suggested fix value */
  suggestedValue?: string;

  /** Available options for user */
  options: SuggestionOption[];

  /** For Claude: command to apply this fix (not shown to user) */
  applyCommand: string;
}

/**
 * An option the user can choose for a semantic fix
 */
export interface SuggestionOption {
  key: 'accept' | 'skip' | 'custom';
  label: string;
  description?: string;
}

/**
 * Result of applying a semantic fix
 */
export interface ApplyFixResult {
  success: boolean;
  message: string;
  fixId: string;
}

/**
 * Extended fix options for the new modes
 */
export interface ExtendedFixOptions extends FixOptions {
  /** Output suggestions as JSON for Claude to interpret */
  suggest?: boolean;
  /** Apply a specific semantic fix by ID */
  apply?: string;
  /** Value to use when applying semantic fix */
  value?: string;
}

// ============================================
// Skill Type Classification
// ============================================

/**
 * Categories of skills for template selection
 */
export type SkillCategory = 'process' | 'library' | 'integration' | 'tool-wrapper';

/**
 * Skill type option for user selection
 */
export interface SkillTypeOption {
  value: SkillCategory;
  label: string;
  description: string;
}

export const SKILL_TYPE_OPTIONS: SkillTypeOption[] = [
  { value: 'process', label: 'Process/Pattern', description: 'Methodology, workflow, or best practice (TDD, debugging, brainstorming)' },
  { value: 'library', label: 'Library/Framework', description: 'Documentation for npm package, API, or framework (TanStack Query, Zustand)' },
  { value: 'integration', label: 'Integration', description: 'Connecting two or more tools/services together' },
  { value: 'tool-wrapper', label: 'Tool Wrapper', description: 'Wraps CLI tool or MCP server' },
];

// ============================================
// Context7 Integration Types
// ============================================

/**
 * Metadata stored in .local/context7-source.json for tracking documentation source
 */
export interface Context7SourceMetadata {
  /** Library name as queried (e.g., "tanstack-query") */
  libraryName: string;
  /** Resolved library ID from context7 */
  libraryId: string;
  /** ISO timestamp when docs were fetched */
  fetchedAt: string;
  /** Library version if detected */
  version?: string;
  /** Hash of fetched content for diff comparison */
  docsHash: string;
}

/**
 * Parsed content from context7 documentation query
 */
export interface Context7DocsContent {
  /** Raw documentation text */
  rawDocs: string;
  /** Extracted API functions/methods */
  apiFunctions?: Context7ApiFunction[];
  /** Extracted code examples */
  codeExamples?: Context7CodeExample[];
  /** Common usage patterns */
  patterns?: Context7Pattern[];
  /** Troubleshooting/FAQ items */
  troubleshooting?: Context7TroubleshootingItem[];
}

/**
 * API function extracted from context7 docs
 */
export interface Context7ApiFunction {
  name: string;
  signature?: string;
  description: string;
  parameters?: { name: string; type: string; description: string }[];
  returnType?: string;
  example?: string;
}

/**
 * Code example extracted from context7 docs
 */
export interface Context7CodeExample {
  title: string;
  description?: string;
  code: string;
  language: string;
  category?: 'basic' | 'advanced' | 'edge-case';
}

/**
 * Usage pattern extracted from context7 docs
 */
export interface Context7Pattern {
  name: string;
  description: string;
  code?: string;
  when: string;
}

/**
 * Troubleshooting item from context7 docs
 */
export interface Context7TroubleshootingItem {
  issue: string;
  solution: string;
  code?: string;
}

/**
 * Full context7 data structure (saved to temp file)
 */
export interface Context7Data {
  libraryName: string;
  libraryId: string;
  fetchedAt: string;
  version?: string;
  content: Context7DocsContent;
}

/**
 * Output when skill creation needs context7 data
 */
export interface Context7Instructions {
  libraryName: string;
  steps: string[];
}

/**
 * Multi-stage workflow stages for skill creation (simplified - research mode removed)
 */
export type CreateStage =
  | 1  // Location: core vs library
  | 2  // Category: which library folder (if library selected)
  | 3  // Skill type: process, library, integration, tool-wrapper
  | 4  // Context7: query documentation? (if library/integration type)
  | 5; // Ready: all inputs collected

/**
 * Extended create suggestion with context7 support and multi-stage workflow
 * (Simplified - research mode removed, use 'researching-skills' skill instead)
 */
export interface CreateSuggestionWithContext7 {
  skill: string;
  status: 'NEEDS_INPUT' | 'NEEDS_CONTEXT7' | 'READY' | 'ERROR';

  /** Current stage in multi-stage workflow (1-5) */
  stage?: CreateStage;

  /** Total number of stages remaining */
  stagesRemaining?: number;

  /** Answers collected from previous stages */
  collectedAnswers?: {
    description?: string;
    location?: 'core' | 'library';
    category?: string;      // Library category path (e.g., "development/integrations")
    skillType?: SkillCategory;
    queryContext7?: boolean;
  };

  /** Command to run for next stage with current answers */
  nextStageCommand?: string;

  error?: string;
  questions?: {
    id: string;
    question: string;
    type: 'select' | 'input' | 'multiselect';
    options?: { value: string; label: string; description?: string }[];
    placeholder?: string;
    required: boolean;
  }[];
  context7Instructions?: Context7Instructions;
  createCommand?: string;

  /** Instructions for next step in workflow */
  nextStep?: string;
}

/**
 * Update suggestion with context7 refresh option
 */
export interface UpdateSuggestionWithContext7 {
  skill: string;
  skillPath: string;
  hasContext7Source: boolean;
  context7Metadata?: {
    libraryName: string;
    fetchedAt: string;
    version?: string;
  };
  questions?: {
    id: string;
    question: string;
    type: 'select' | 'input';
    options?: { value: string; label: string; description: string }[];
    placeholder?: string;
    required: boolean;
  }[];
}

/**
 * Diff result when comparing context7 documentation versions
 */
export interface Context7DiffResult {
  hasChanges: boolean;
  newApis: string[];
  deprecatedApis: string[];
  changedSignatures: { name: string; oldSig: string; newSig: string }[];
  updatedExamples: number;
  summary: string;
}

// ============================================
// Hybrid Fix Types (CLI + Claude Reasoning)
// ============================================
// These types support the hybrid fix model where:
// - CLI handles deterministic cases automatically
// - Ambiguous cases are passed to Claude for reasoning
// - User confirms ambiguous case resolutions

/**
 * Base interface for ambiguous cases that need Claude reasoning.
 * Each hybrid phase extends this with phase-specific fields.
 */
export interface AmbiguousCase {
  /** Phase number (4, 10, 19) */
  phase: number;
  /** Type identifier for the ambiguous case */
  type: string;
  /** Human-readable context explaining the issue */
  context: string;
  /** Available resolution options */
  options: HybridFixOption[];
}

/**
 * Option for resolving an ambiguous case.
 * More flexible than SuggestionOption to support hybrid-specific actions.
 */
export interface HybridFixOption {
  /** Action key (e.g., 'create', 'remove', 'replace', 'fix') */
  key: string;
  /** User-friendly label */
  label: string;
  /** Additional description */
  description?: string;
  /** Value to pass when applying (e.g., file path, replacement name) */
  value?: string;
}

/**
 * Phase 4: Broken link where file doesn't exist anywhere.
 * CLI can't auto-fix, needs Claude to decide: create, remove, or use similar.
 */
export interface Phase4AmbiguousCase extends AmbiguousCase {
  phase: 4;
  type: 'broken-link-missing';
  /** The link text from markdown [linkText](path) */
  linkText: string;
  /** The broken path from markdown [text](linkPath) */
  linkPath: string;
  /** Surrounding text for context (~100 chars) */
  surroundingContext: string;
  /** Similar files found in skill directory */
  similarFiles: string[];
}

/**
 * Phase 10: Reference not in deprecation registry.
 * CLI can't auto-fix, needs Claude to fuzzy match and suggest.
 */
export interface Phase10AmbiguousCase extends AmbiguousCase {
  phase: 10;
  type: 'phantom-reference-fuzzy';
  /** The reference that wasn't found */
  reference: string;
  /** Type of reference (skill, agent, command, mcp-tool) */
  refType: 'skill' | 'agent' | 'command' | 'mcp-tool';
  /** Fuzzy matches with similarity scores */
  fuzzyMatches: FuzzyMatch[];
}

/**
 * Phase 19: Broken gateway path.
 * Needs Claude to determine: fix typo, remove entry, or note for creation.
 */
export interface Phase19AmbiguousCase extends AmbiguousCase {
  phase: 19;
  type: 'broken-gateway-path';
  /** The path in the routing table that doesn't resolve */
  brokenPath: string;
  /** Skill name from the routing table */
  skillName: string;
  /** Fuzzy matches against existing skill paths */
  fuzzyMatches: FuzzyMatch[];
}

/**
 * Fuzzy match result with similarity score
 */
export interface FuzzyMatch {
  /** The matched name or path */
  name: string;
  /** Similarity score 0-1 (higher = more similar) */
  score: number;
  /** Full path if applicable */
  path?: string;
}

/**
 * Result from a hybrid phase fix that includes both
 * deterministic fixes and ambiguous cases for Claude.
 */
export interface HybridPhaseResult extends PhaseResult {
  /** Cases that couldn't be auto-fixed and need Claude reasoning */
  ambiguousCases: AmbiguousCase[];
}

/**
 * Phase 4 specific result
 */
export interface Phase4HybridResult extends HybridPhaseResult {
  ambiguousCases: Phase4AmbiguousCase[];
}

/**
 * Phase 10 specific result
 */
export interface Phase10HybridResult extends HybridPhaseResult {
  ambiguousCases: Phase10AmbiguousCase[];
}

/**
 * Phase 19 specific result
 */
export interface Phase19HybridResult extends HybridPhaseResult {
  ambiguousCases: Phase19AmbiguousCase[];
}

/**
 * Extended fix options to support hybrid mode
 */
export interface HybridFixOptions extends FixOptions {
  /** Return ambiguous cases instead of just counts */
  returnAmbiguous?: boolean;
}

/**
 * Apply command for hybrid fixes
 * Format: phase{N}-{type} --value "{action}:{details}"
 * Examples:
 *   phase4-broken-link-missing --value "create:references/workflow.md"
 *   phase4-broken-link-missing --value "remove:[link text]"
 *   phase4-broken-link-missing --value "replace:oldpath:newpath"
 *   phase10-phantom-reference-fuzzy --value "replace:debugging-systematically"
 *   phase19-broken-gateway-path --value "fix:correct/path/to/skill"
 *   phase19-broken-gateway-path --value "remove:skill-name"
 */
export type HybridApplyAction =
  | { action: 'create'; path: string; content?: string }
  | { action: 'remove'; target: string }
  | { action: 'replace'; from: string; to: string }
  | { action: 'fix'; newPath: string };

/**
 * Parsed hybrid fix application request
 */
export interface HybridApplyRequest {
  phase: 4 | 10 | 19;
  type: string;
  action: HybridApplyAction;
  skillPath: string;
}

// ============================================
// Research Integration (Simplified)
// ============================================
// Research mode removed from skill-manager workflow
// Use the 'researching-skills' skill instead for research workflows
// The instruction-only skill guides Claude through research using native tools:
// - Grep/Glob for codebase research
// - MCP tools for Context7 documentation
// - WebSearch/WebFetch for web research
