// src/lib/types.ts
import { z } from 'zod';

/**
 * Context7 package match from search
 */
export interface Context7Package {
  id: string;
  name: string;
  version: string;
  pageCount: number;
  description: string;
  status: 'recommended' | 'caution' | 'deprecated';
}

/**
 * Context7 documentation content
 */
export interface Context7Documentation {
  packageId: string;
  packageName: string;
  version: string;
  fetchedAt: string;
  content: string;
  sections: DocumentationSection[];
}

/**
 * Documentation section (parsed from content)
 */
export interface DocumentationSection {
  title: string;
  type: 'api' | 'guide' | 'example' | 'migration' | 'other';
  content: string;
  codeBlocks: CodeBlock[];
}

/**
 * Code block extracted from documentation
 */
export interface CodeBlock {
  language: string;
  code: string;
  context: string; // surrounding text
}

/**
 * Web source for research
 */
export interface WebSource {
  url: string;
  title: string;
  type: 'github-repo' | 'github-examples' | 'official-docs' | 'maintainer-blog' | 'quality-blog' | 'article';
  score: number;
  modifiers: ScoreModifier[];
  fetchedAt?: string;
  content?: string;
}

/**
 * Score modifier applied to web sources
 */
export interface ScoreModifier {
  reason: string;
  delta: number;
}

/**
 * Combined research data from all sources
 */
export interface ResearchData {
  topic: string;
  createdAt: string;
  context7: {
    packages: Context7Package[];
    selectedPackages: string[];
    documentation: Context7Documentation[];
  };
  web: {
    sources: WebSource[];
    selectedSources: string[];
    fetchedContent: Array<{
      url: string;
      content: string;
    }>;
  };
  metadata: {
    totalPages: number;
    totalCodeBlocks: number;
    primaryVersion: string;
  };
}

/**
 * Generated skill structure
 */
export interface GeneratedSkill {
  name: string;
  location: string;
  files: GeneratedFile[];
  summary: {
    skillMdLines: number;
    referenceCount: number;
    templateCount: number;
  };
}

/**
 * Generated file content
 */
export interface GeneratedFile {
  path: string;
  content: string;
  type: 'skill-md' | 'reference' | 'template' | 'metadata';
}

/**
 * Research options
 */
export const ResearchOptionsSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  context7Only: z.boolean().default(false),
  includeWeb: z.boolean().default(false),
  output: z.string().optional(),
});

export type ResearchOptions = z.infer<typeof ResearchOptionsSchema>;

/**
 * Generate options
 */
export const GenerateOptionsSchema = z.object({
  fromResearch: z.string().min(1, 'Research data path is required'),
  location: z.string().optional(),
  dryRun: z.boolean().default(false),
});

export type GenerateOptions = z.infer<typeof GenerateOptionsSchema>;

/**
 * Source quality weights for scoring
 */
export const SOURCE_WEIGHTS: Record<WebSource['type'], { base: number; decay: number }> = {
  'official-docs': { base: 100, decay: 0 },
  'github-repo': { base: 95, decay: 0 },
  'github-examples': { base: 92, decay: 0 },
  'maintainer-blog': { base: 85, decay: 0.05 },
  'quality-blog': { base: 70, decay: 0.1 },
  'article': { base: 50, decay: 0.15 },
};

/**
 * Trusted domains with score boosts
 */
export const TRUSTED_DOMAINS: Record<string, number> = {
  'tanstack.com': 20,
  'react.dev': 18,
  'github.com/tanstack': 15,
  'tkdodo.eu': 15,
  'kentcdodds.com': 12,
  'joshwcomeau.com': 10,
};

// ============================================================================
// Phase 2: Codebase Research Types
// ============================================================================

/**
 * Discovered submodule in modules/ directory
 */
export interface Submodule {
  name: string;
  path: string;
  purpose: string;
  keywords: string[];
  languages: ('go' | 'typescript' | 'python' | 'vql' | 'other')[];
  hasClaudeMd: boolean;
}

/**
 * Skill frontmatter parsed from SKILL.md
 */
export interface SkillFrontmatter {
  name: string;
  description: string;
  allowedTools?: string[];
  skills?: string[];
}

/**
 * Skill directory structure analysis
 */
export interface SkillStructure {
  hasReferences: boolean;
  hasTemplates: boolean;
  hasExamples: boolean;
  hasScripts: boolean;
  referenceFiles: string[];
  templateFiles: string[];
  exampleFiles: string[];
  lineCount: number;
}

/**
 * Similar skill found during codebase analysis
 */
export interface SimilarSkill {
  name: string;
  path: string;
  location: 'core' | 'library';
  similarity: number;
  structure: SkillStructure;
  frontmatter: SkillFrontmatter;
}

/**
 * Code pattern match from codebase search
 */
export interface CodeMatch {
  file: string;
  line: number;
  content: string;
  context: string;
  matchType: 'pattern' | 'import' | 'usage' | 'definition';
}

/**
 * Test file match from codebase search
 */
export interface TestMatch {
  file: string;
  testName: string;
  testType: 'unit' | 'integration' | 'e2e';
  relevance: number;
}

/**
 * Project conventions extracted from CLAUDE.md and DESIGN-PATTERNS.md
 */
export interface ProjectConventions {
  namingPatterns: string[];
  fileOrganization: string[];
  codingStandards: string[];
  testingPatterns: string[];
  securityPatterns: string[];
  source: string;
}

/**
 * Combined codebase research results
 */
export interface CodebasePatterns {
  similarSkills: SimilarSkill[];
  relatedCode: CodeMatch[];
  conventions: ProjectConventions;
  relatedTests: TestMatch[];
  submodules: Submodule[];
}

/**
 * Module keyword mapping for relevance matching
 */
export const MODULE_KEYWORD_MAP: Record<string, string[]> = {
  'chariot': ['api', 'backend', 'lambda', 'handler', 'dynamodb', 'serverless', 'aws'],
  'chariot/ui': ['react', 'component', 'hook', 'state', 'ui', 'frontend', 'typescript'],
  'chariot/e2e': ['playwright', 'test', 'e2e', 'browser', 'automation'],
  'chariot-ui-components': ['component', 'design system', 'storybook', 'shared', 'library'],
  'nebula': ['cloud', 'security', 'scanning', 'aws', 'azure', 'gcp', 'multi-cloud'],
  'janus': ['framework', 'chain', 'tool', 'orchestration', 'security tools'],
  'janus-framework': ['go', 'library', 'links', 'chains', 'processing'],
  'tabularium': ['schema', 'model', 'codegen', 'openapi', 'data'],
  'aegiscli': ['velociraptor', 'vql', 'security', 'agent', 'capability'],
  'chariot-aegis-capabilities': ['vql', 'capability', 'security', 'velociraptor'],
  'praetorian-cli': ['cli', 'python', 'sdk', 'api client'],
  'nuclei-templates': ['vulnerability', 'template', 'scanner', 'nuclei'],
  'chariot-devops': ['devops', 'infrastructure', 'deployment', 'ci/cd'],
  'praetorian-agent-workflows': ['agent', 'workflow', 'ai', 'orchestration'],
};

// ============================================================================
// Phase 3: Brainstorming Types
// ============================================================================

/**
 * Type of skill being created
 */
export type SkillType = 'process' | 'library' | 'integration' | 'tool-wrapper';

/**
 * Target audience for the skill
 */
export type SkillAudience = 'beginner' | 'intermediate' | 'expert';

/**
 * Content preferences for skill generation
 */
export type ContentPreference =
  | 'templates'
  | 'troubleshooting'
  | 'testing'
  | 'examples'
  | 'api-reference'
  | 'best-practices'
  | 'anti-patterns'
  | 'migration-guides';

/**
 * Question type for brainstorming flow
 */
export type QuestionType = 'select' | 'multiselect' | 'text';

/**
 * Option for select/multiselect questions
 */
export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Brainstorm question definition
 */
export interface BrainstormQuestion {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  options?: QuestionOption[] | 'dynamic';
  required?: boolean;
  dependsOn?: {
    questionId: string;
    values: string[];
  };
  default?: string | string[];
}

/**
 * Answer to a brainstorm question
 */
export interface BrainstormAnswer {
  questionId: string;
  value: string | string[];
}

/**
 * Skill location specification
 */
export type SkillLocation =
  | 'core'
  | { library: string }; // category path like 'development/frontend/state'

/**
 * Requirements extracted from brainstorming
 */
export interface Requirements {
  name: string;
  initialPrompt: string;
  skillType: SkillType;
  location: SkillLocation;
  purpose: string;
  workflows: string[];
  audience: SkillAudience;
  contentPreferences: ContentPreference[];
  libraryName?: string;
  searchPatterns: string[];
  context7Query?: string;
}

/**
 * Library category discovered from filesystem
 */
export interface LibraryCategory {
  path: string;
  name: string;
  depth: number;
  skillCount: number;
}

/**
 * Brainstorming session state
 */
export interface BrainstormSession {
  answers: BrainstormAnswer[];
  currentQuestionIndex: number;
  startedAt: string;
  completedAt?: string;
}

/**
 * Result of running brainstorming phase
 */
export interface BrainstormResult {
  requirements: Requirements;
  session: BrainstormSession;
  suggestedWorkflows: string[];
}

// ============================================================================
// Phase 4: Enhanced Generation Types
// ============================================================================

/**
 * Combined input for skill generation from all research phases
 */
export interface GenerationInput {
  requirements: Requirements;
  codebasePatterns?: CodebasePatterns;
  context7Data?: ResearchData;
  webResearch?: {
    sources: WebSource[];
    fetchedContent: Array<{ url: string; content: string }>;
  };
}

/**
 * Generated section of SKILL.md
 */
export interface GeneratedSection {
  title: string;
  content: string;
  source: 'requirements' | 'codebase' | 'context7' | 'web' | 'template';
  priority: number;
}

/**
 * Template for SKILL.md structure based on similar skill
 */
export interface SkillTemplate {
  sourceName: string;
  sourcePath: string;
  sections: string[];
  hasReferences: boolean;
  hasTemplates: boolean;
  hasExamples: boolean;
  frontmatterFields: string[];
}

/**
 * Synthesized content ready for generation
 */
export interface SynthesizedContent {
  frontmatter: {
    name: string;
    description: string;
    allowedTools: string[];
    skills?: string[];
  };
  sections: GeneratedSection[];
  references: GeneratedFile[];
  templates: GeneratedFile[];
  examples: GeneratedFile[];
  metadata: GenerationMetadata;
}

/**
 * Metadata about the generation process
 */
export interface GenerationMetadata {
  generatedAt: string;
  requirements: Requirements;
  sources: {
    similarSkill?: string;
    context7Packages: string[];
    webSources: string[];
    codebaseModules: string[];
  };
  stats: {
    skillMdLines: number;
    referenceCount: number;
    templateCount: number;
    exampleCount: number;
    totalCodeBlocks: number;
  };
}

/**
 * Result of generating a skill
 */
export interface GenerationResult {
  success: boolean;
  skill?: GeneratedSkill;
  synthesized?: SynthesizedContent;
  errors: string[];
  warnings: string[];
}
