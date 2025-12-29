/**
 * @chariot/auditing-skills - Public API
 *
 * This module exposes the public interface for skill auditing and fixing.
 * Internal implementation details remain in ./lib/ but consumers should
 * only import from this index.
 *
 * Usage:
 *   import { SkillAuditor, findSkill, FIXABLE_PHASES } from '@chariot/auditing-skills';
 */

// Re-export from @chariot/lib for convenience
export {
  findProjectRoot,
  resolveProjectPath,
  getAllSkillDirectories,
  findSkillPath,
  isInSubmodule,
  getCurrentSubmoduleName,
  resolveSkillDirectory,
  clearCache,
} from '@chariot/lib';

// Core audit functionality
export { SkillAuditor, PHASE_COUNT } from './lib/audit-engine.js';

// Phase registry (needed by fix tools)
export {
  PHASE_REGISTRY,
  FIXABLE_PHASES,
  getPhaseKey,
  findPhasesByNumber,
  findPhaseByKey,
  type PhaseDefinition,
  type PhaseClass,
} from './lib/phase-registry.js';

// Skill discovery
export {
  findSkill,
  findSimilarSkills,
  listAllSkills,
  type SkillInfo,
  type SkillLocation,
} from './lib/skill-finder.js';

// Fix infrastructure (for fixing-skills)
export { runSuggestMode } from './lib/fix-suggest.js';
export { applySemanticFix } from './lib/fix-applier.js';

// Types - export all public types
export type {
  // Core types
  SkillType,
  SkillFrontmatter,
  SkillFile,
  IssueSeverity,
  Issue,
  StructuredIssue,
  SkillAuditResult,
  AuditSummary,
  PhaseResult,
  ProgressMetrics,
  FixOptions,
  ValidatorResult,

  // Fix suggestion types
  FixSuggestionOutput,
  SemanticSuggestion,
  SuggestionOption,
  ApplyFixResult,
  ExtendedFixOptions,

  // Skill creation types
  SkillCategory,
  SkillTypeOption,

  // Context7 types
  Context7SourceMetadata,
  Context7DocsContent,
  Context7ApiFunction,
  Context7CodeExample,
  Context7Pattern,
  Context7TroubleshootingItem,
  Context7Data,
  Context7Instructions,
  CreateStage,
  CreateSuggestionWithContext7,
  UpdateSuggestionWithContext7,
  Context7DiffResult,

  // Hybrid fix types
  AmbiguousCase,
  HybridFixOption,
  Phase4AmbiguousCase,
  Phase10AmbiguousCase,
  Phase19AmbiguousCase,
  FuzzyMatch,
  HybridPhaseResult,
  Phase4HybridResult,
  Phase10HybridResult,
  Phase19HybridResult,
  HybridFixOptions,
  HybridApplyAction,
  HybridApplyRequest,

  // Agent recommendation
  AgentRecommendation,
} from './lib/types.js';

// Constants
export { TOOL_SETS, SKILL_TYPE_OPTIONS } from './lib/types.js';

// Context7 integration (for updating-skills and creating-skills)
export {
  parseContext7Data,
  hashContent,
  generateApiReference,
  generatePatterns,
  generateExamples,
  generateLibrarySkillTemplate,
  createContext7SourceMetadata,
  compareContext7Data,
  generateContext7Instructions,
} from './lib/context7-integration.js';
