/**
 * Agent Manager Type Definitions
 *
 * Core types for agent lifecycle management including parsing,
 * auditing, and compliance validation.
 */

import { z } from 'zod';

// =============================================================================
// Agent Categories
// =============================================================================

export const AGENT_CATEGORIES = [
  'architecture',
  'development',
  'testing',
  'quality',
  'analysis',
  'research',
  'orchestrator',
  'mcp-tools',
] as const;

export type AgentCategory = (typeof AGENT_CATEGORIES)[number];

export const AgentCategorySchema = z.enum(AGENT_CATEGORIES);

// =============================================================================
// Agent Colors
// =============================================================================

export const AGENT_COLORS = [
  'green',
  'blue',
  'red',
  'purple',
  'orange',
  'cyan',
  'pink',
  'yellow',
] as const;

export type AgentColor = (typeof AGENT_COLORS)[number];

/**
 * Mapping of agent type to expected color
 * Enforces visual consistency across agent categories
 */
export const COLOR_BY_TYPE: Record<AgentCategory, AgentColor> = {
  development: 'green',
  architecture: 'blue',
  quality: 'red',
  analysis: 'purple',
  orchestrator: 'orange',
  research: 'cyan',
  testing: 'pink',
  'mcp-tools': 'yellow',
};

// =============================================================================
// Permission Modes
// =============================================================================

export const PERMISSION_MODES = [
  'default',
  'plan',
  'acceptEdits',
  'bypassPermissions',
] as const;

export type PermissionMode = (typeof PERMISSION_MODES)[number];

/**
 * Mapping of agent type to expected permission mode
 * Enforces security posture by category
 */
export const PERMISSION_MODE_BY_TYPE: Record<AgentCategory, PermissionMode> = {
  development: 'default',
  architecture: 'plan',
  quality: 'plan',
  analysis: 'plan',
  orchestrator: 'default',
  research: 'default',
  testing: 'default',
  'mcp-tools': 'default',
};

// =============================================================================
// Description Status
// =============================================================================

export type DescriptionStatus =
  | 'valid'           // Single-line description, properly formatted
  | 'block-scalar-pipe'    // Uses | block scalar (broken)
  | 'block-scalar-folded'  // Uses > block scalar (broken)
  | 'missing'         // No description field
  | 'empty';          // Empty description

// =============================================================================
// Agent Frontmatter
// =============================================================================

export interface AgentFrontmatter {
  name: string;
  description: string;
  type?: AgentCategory;
  permissionMode?: PermissionMode;
  tools?: string;
  skills?: string;
  model?: string;
  color?: AgentColor;
}

export const AgentFrontmatterSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(1024), // Must match DESCRIPTION_LIMITS.maxLength
  type: AgentCategorySchema.optional(),
  permissionMode: z.enum(PERMISSION_MODES).optional(),
  tools: z.string().optional(),
  skills: z.string().optional(),
  model: z.string().optional(),
  color: z.enum(AGENT_COLORS).optional(),
});

// =============================================================================
// Frontmatter Field Ordering
// =============================================================================

/**
 * Canonical order for frontmatter fields
 * Enforces consistent ordering for readability and merge conflict reduction
 */
export const FRONTMATTER_FIELD_ORDER = [
  'name',
  'description',
  'type',
  'permissionMode',
  'tools',
  'skills',
  'model',
  'color',
] as const;

// =============================================================================
// Tool Appropriateness Rules
// =============================================================================

/**
 * Tools required for specific agent types
 * Missing these tools is an ERROR
 */
export const REQUIRED_TOOLS_BY_TYPE: Partial<Record<AgentCategory, string[]>> = {
  development: ['Edit', 'Write', 'Bash'],
  testing: ['Bash'],
};

/**
 * Tools forbidden for specific agent types
 * Having these tools is an ERROR
 */
export const FORBIDDEN_TOOLS_BY_TYPE: Partial<Record<AgentCategory, string[]>> = {
  quality: ['Edit', 'Write'], // Reviewers should be read-only
  analysis: ['Edit', 'Write'], // Analysts should be read-only
};

/**
 * Tools recommended for specific agent types
 * Missing these is an INFO (suggestion)
 */
export const RECOMMENDED_TOOLS_BY_TYPE: Partial<Record<AgentCategory, string[]>> = {
  architecture: ['Read', 'Glob', 'Grep', 'TodoWrite'],
  orchestrator: ['Task', 'TodoWrite'],
};

// =============================================================================
// Agent Info (Full Parsed Agent)
// =============================================================================

export interface AgentInfo {
  // File info
  filePath: string;
  fileName: string;
  category: AgentCategory;

  // Parsed content
  frontmatter: AgentFrontmatter;
  rawFrontmatter: string; // Original YAML block
  body: string; // Content after frontmatter

  // Metrics
  lineCount: number;
  bodyLineCount: number;

  // Status
  descriptionStatus: DescriptionStatus;
  hasExamples: boolean;
  hasUseWhenTrigger: boolean;
  hasGatewaySkill: boolean;
  hasOutputFormat: boolean;
  hasEscalationProtocol: boolean;

  // Color validation (Feature 1)
  hasCorrectColor: boolean;

  // Frontmatter ordering (Feature 3)
  frontmatterFieldOrder: string[];
  hasCorrectFieldOrder: boolean;
}

// =============================================================================
// Audit Types
// =============================================================================

export type AuditPhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface AuditPhaseResult {
  phase: AuditPhaseNumber;
  name: string;
  passed: boolean;
  autoFixable: boolean;
  issues: AuditIssue[];
  suggestions: FixSuggestion[];
}

export interface AuditIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  details?: string;
}

export interface FixSuggestion {
  id: string;
  phase: AuditPhaseNumber;
  description: string;
  autoFixable: boolean;
  currentValue?: string;
  suggestedValue?: string;
  apply?: () => Promise<void>;
}

export interface AuditResult {
  agent: AgentInfo;
  timestamp: string;
  phases: AuditPhaseResult[];
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    passed: number;
    failed: number;
    autoFixable: number;
  };
}

// =============================================================================
// CLI Options
// =============================================================================

export interface CreateOptions {
  name: string;
  description?: string;
  type: AgentCategory;
  suggest?: boolean;
}

export interface UpdateOptions {
  name: string;
  changes?: string;
  suggest?: boolean;
}

export interface AuditOptions {
  name?: string;
  all?: boolean;
  phase?: AuditPhaseNumber;
  json?: boolean;
}

export interface FixOptions {
  name: string;
  dryRun?: boolean;
  suggest?: boolean;
  apply?: string;
  value?: string;
}

export interface RenameOptions {
  oldName: string;
  newName: string;
}

export interface TestOptions {
  name: string;
  skill?: string;
}

export interface SearchOptions {
  query: string;
  type?: AgentCategory;
  limit?: number;
}

export interface ListOptions {
  type?: AgentCategory;
  status?: 'valid' | 'broken' | 'all';
}

// =============================================================================
// Search Results
// =============================================================================

export interface SearchResult {
  agent: AgentInfo;
  score: number;
  matches: {
    nameExact: boolean;
    nameSubstring: boolean;
    descriptionMatch: boolean;
    typeMatch: boolean;
    skillsMatch: boolean;
  };
}

// =============================================================================
// Lean Agent Template
// =============================================================================

export interface LeanAgentTemplate {
  name: string;
  description: string;
  type: AgentCategory;
  permissionMode: PermissionMode;
  tools: string[];
  skills: string[];
  model: string;
  roleStatement: string;
  responsibilities: string[];
  skillReferences: Array<{ task: string; skillPath: string }>;
  criticalRules: Array<{ category: string; rules: string[] }>;
  mandatorySkills: Array<{ name: string; when: string; use: string }>;
  escalationConditions: Array<{ condition: string; recommendAgent: string }>;
  qualityChecklist: string[];
}

// =============================================================================
// Constants
// =============================================================================

export const AGENTS_BASE_PATH = '.claude/agents';

export const LINE_COUNT_LIMITS = {
  target: 300,
  warning: 250,
  complexMax: 400,
} as const;

export const DESCRIPTION_LIMITS = {
  maxLength: 1024,
  warningLength: 800,
} as const;

export const AUDIT_PHASE_NAMES: Record<AuditPhaseNumber, string> = {
  1: 'Frontmatter Syntax',
  2: 'Description Quality',
  3: 'Prompt Efficiency',
  4: 'Skill Integration',
  5: 'Output Standardization',
  6: 'Escalation Protocol',
  7: 'Body References',
  8: 'Skill Coverage',
};

export const AUDIT_PHASE_AUTO_FIXABLE: Record<AuditPhaseNumber, boolean> = {
  1: true, // Syntax fixes
  2: false, // Requires semantic understanding
  3: false, // Requires content extraction
  4: true, // Path replacement
  5: false, // Requires template generation
  6: false, // Requires context understanding
  7: false, // Phantom skills require manual review
  8: true, // Can auto-add recommended skills
};

// =============================================================================
// Skill Recommendation Types (Feature 7)
// =============================================================================

export interface SkillRecommendation {
  skillName: string;
  relevanceScore: number; // 1-10
  reason: string;
  source: 'type' | 'tools' | 'body-keywords' | 'category';
}

/**
 * Skills recommended by agent type
 */
export const SKILLS_BY_TYPE: Record<AgentCategory, string[]> = {
  development: ['developing-with-tdd', 'debugging-systematically', 'verifying-before-completion'],
  testing: ['developing-with-tdd', 'verifying-before-completion'],
  architecture: ['writing-plans', 'brainstorming'],
  quality: ['verifying-before-completion'],
  analysis: ['verifying-before-completion'],
  research: ['verifying-before-completion'],
  orchestrator: ['writing-plans', 'executing-plans'],
  'mcp-tools': ['gateway-mcp-tools'],
};

/**
 * Skills recommended by keyword presence in body or name
 */
export const SKILLS_BY_KEYWORD: Record<string, string[]> = {
  react: ['gateway-frontend'],
  frontend: ['gateway-frontend'],
  go: ['gateway-backend'],
  golang: ['gateway-backend'],
  backend: ['gateway-backend'],
  security: ['gateway-security'],
  test: ['gateway-testing'],
  e2e: ['gateway-testing'],
  mcp: ['gateway-mcp-tools'],
  integration: ['gateway-integrations'],
};

// =============================================================================
// Gateway Domain Mappings (Feature 8: Multi-Gateway Support)
// =============================================================================

/**
 * Domain keywords for each gateway skill
 * Used for keyword-based gateway recommendation
 */
export const GATEWAY_DOMAINS: Record<string, string[]> = {
  'gateway-frontend': ['react', 'typescript', 'ui', 'component', 'hook', 'state', 'tanstack', 'zustand'],
  'gateway-backend': ['go', 'golang', 'api', 'aws', 'lambda', 'dynamodb', 'handler'],
  'gateway-testing': ['test', 'vitest', 'playwright', 'e2e', 'unit', 'integration', 'mock'],
  'gateway-security': ['auth', 'security', 'vulnerability', 'owasp', 'encryption'],
  'gateway-mcp-tools': ['mcp', 'linear', 'context7', 'praetorian'],
  'gateway-integrations': ['integration', 'webhook', 'api', 'oauth'],
};

/**
 * Primary gateway skill for each agent type
 * Used as the default gateway when creating new agents
 */
export const TYPE_TO_PRIMARY_GATEWAY: Record<AgentCategory, string> = {
  development: 'gateway-frontend',  // Refined by name (go/backend → gateway-backend)
  testing: 'gateway-testing',
  architecture: 'gateway-backend',
  quality: 'gateway-testing',
  analysis: 'gateway-security',
  research: 'gateway-backend',
  orchestrator: 'gateway-mcp-tools',
  'mcp-tools': 'gateway-mcp-tools',
};

/**
 * Secondary gateway skills for each agent type
 * NOTE: Domain gateways (frontend/backend) are determined by agent NAME, not type
 * This prevents false positives like frontend-unit-test-engineer getting gateway-backend
 */
export const TYPE_TO_SECONDARY_GATEWAYS: Record<AgentCategory, string[]> = {
  development: [],  // Domain determined by agent name (go-* → backend, react-* → frontend)
  testing: [],      // Domain determined by agent name (frontend-* → frontend, backend-* → backend)
  architecture: ['gateway-security'],  // Architects often need security patterns
  quality: [],      // Domain determined by agent name
  analysis: [],     // Domain determined by agent name
  research: [],
  orchestrator: [],
  'mcp-tools': [],
};

/**
 * Keyword to gateway mapping for intelligent gateway recommendation
 * Used to determine additional gateways based on agent name/body content
 */
export const KEYWORD_TO_GATEWAY_MAP: [string, string][] = [
  // Frontend keywords
  ['react', 'gateway-frontend'],
  ['frontend', 'gateway-frontend'],
  ['ui', 'gateway-frontend'],
  ['component', 'gateway-frontend'],
  ['typescript', 'gateway-frontend'],

  // Backend keywords
  ['go', 'gateway-backend'],
  ['golang', 'gateway-backend'],
  ['backend', 'gateway-backend'],
  ['api', 'gateway-backend'],
  ['aws', 'gateway-backend'],
  ['lambda', 'gateway-backend'],

  // Testing keywords
  ['test', 'gateway-testing'],
  ['testing', 'gateway-testing'],
  ['e2e', 'gateway-testing'],
  ['playwright', 'gateway-testing'],
  ['vitest', 'gateway-testing'],

  // Security keywords
  ['security', 'gateway-security'],
  ['auth', 'gateway-security'],
  ['vulnerability', 'gateway-security'],

  // MCP keywords
  ['mcp', 'gateway-mcp-tools'],
  ['linear', 'gateway-mcp-tools'],
  ['context7', 'gateway-mcp-tools'],

  // Integration keywords
  ['integration', 'gateway-integrations'],
  ['webhook', 'gateway-integrations'],
  ['oauth', 'gateway-integrations'],
];

/**
 * Gateway recommendation result
 * Used by recommendGateways() in skill-recommender.ts
 */
export interface GatewayRecommendation {
  gateway: string;
  isPrimary: boolean;
  reason: string;
  relevanceScore: number;
}

// =============================================================================
// Interactive Fix Workflow (JSON Output Mode)
// =============================================================================

/**
 * Fix question for Claude-mediated input gathering
 * Matches AskUserQuestion tool API
 */
export interface FixQuestion {
  id: string;
  question: string;
  header: string;
  multiSelect: boolean;
  options: Array<{
    label: string;
    description: string;
  }>;
}

/**
 * Output from fix.ts --suggest mode
 * Enables Claude to intercept and present interactive fix selection
 */
export interface FixSuggestionOutput {
  agent: string;
  status: 'NEEDS_INPUT' | 'READY' | 'ERROR';
  error?: string;

  // Fix categories
  autoFixable: FixSuggestion[];
  manual: FixSuggestion[];

  // Interactive workflow
  questions?: FixQuestion[];
  collectedAnswers?: {
    selectedFixes?: string[]; // Array of fix IDs
  };

  // Commands
  applyCommand?: string; // Final command to apply selected fixes
}
