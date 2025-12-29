/**
 * Phase Registry: Single source of truth for all audit phases
 * Implements Open/Closed Principle: extend by adding to array, not modifying consumers
 */

import { Phase1DescriptionFormat } from './phases/phase1-description-format.js';
import { Phase2AllowedTools } from './phases/phase2-allowed-tools.js';
import { Phase3LineCount } from './phases/phase3-line-count.js';
import { Phase4BrokenLinks } from './phases/phase4-broken-links.js';
import { Phase5OrganizeFiles } from './phases/phase5-organize-files.js';
import { Phase6ScriptOrganization } from './phases/phase6-script-organization.js';
import { Phase7OutputDirectory } from './phases/phase7-output-directory.js';
import { Phase8TypeScriptStructure } from './phases/phase8-typescript-structure.js';
import { Phase9BashTypeScriptMigration } from './phases/phase9-bash-typescript-migration.js';
import { Phase10ReferenceAudit } from './phases/phase10-reference-audit.js';
import { Phase11CommandAudit } from './phases/phase11-command-audit.js';
import { Phase12CliErrorHandling } from './phases/phase12-cli-error-handling.js';
import { Phase13StateExternalization } from './phases/phase13-state-externalization.js';
import { Phase14aTableFormatting } from './phases/phase14a-table-formatting.js';
import { Phase14bCodeBlockQuality } from './phases/phase14b-code-block-quality.js';
import { Phase14cHeaderHierarchy } from './phases/phase14c-header-hierarchy.js';
import { Phase15OrphanDetection } from './phases/phase15-orphan-detection.js';
import { Phase16WindowsPaths } from './phases/phase16-windows-paths.js';
import { Phase17GatewayStructure } from './phases/phase17-gateway-structure.js';
import { Phase18RoutingTableFormat } from './phases/phase18-routing-table-format.js';
import { Phase19PathResolution } from './phases/phase19-path-resolution.js';
import { Phase20CoverageCheck } from './phases/phase20-coverage-check.js';
import { Phase21LineNumberReferences } from './phases/phase21-line-number-references.js';
import { Phase22Context7Staleness } from './phases/phase22-context7-staleness.js';
import type { PhaseResult, SkillFile, Issue } from './types.js';

/**
 * Phase class interface - all phases must implement these static methods
 * Note: Using 'any' for flexibility since phase signatures vary (some sync, some async, different parameters)
 */
export interface PhaseClass {
  validate: any;
  runOnParsedSkills: any;
  fix?: any;
}

/**
 * Phase definition with metadata
 */
export interface PhaseDefinition {
  number: number;
  subPhase?: string;
  name: string;
  phase: PhaseClass;
  fixable: boolean;
  requiresSkillsDir?: boolean;
  isGatewayOnly?: boolean;
}

/**
 * Complete registry of all audit phases
 * Add new phases here - all consumers will automatically pick them up
 */
export const PHASE_REGISTRY: PhaseDefinition[] = [
  // Core validation phases (1-9)
  { number: 1, name: 'Description Format', phase: Phase1DescriptionFormat, fixable: false },
  { number: 2, name: 'Allowed-Tools Field', phase: Phase2AllowedTools, fixable: true },
  { number: 3, name: 'Line Count', phase: Phase3LineCount, fixable: false },
  { number: 4, name: 'Broken Links', phase: Phase4BrokenLinks, fixable: true },
  { number: 5, name: 'Organize Files', phase: Phase5OrganizeFiles, fixable: true },
  { number: 6, name: 'Script Organization', phase: Phase6ScriptOrganization, fixable: true },
  { number: 7, name: 'Output Directory', phase: Phase7OutputDirectory, fixable: true },
  { number: 8, name: 'TypeScript Structure', phase: Phase8TypeScriptStructure, fixable: false },
  { number: 9, name: 'Bash→TypeScript Migration', phase: Phase9BashTypeScriptMigration, fixable: false },

  // Reference and command auditing (10-13)
  { number: 10, name: 'Reference Audit', phase: Phase10ReferenceAudit, fixable: true, requiresSkillsDir: true },
  { number: 11, name: 'Command Audit', phase: Phase11CommandAudit, fixable: false },
  { number: 12, name: 'CLI Error Handling', phase: Phase12CliErrorHandling, fixable: true },
  { number: 13, name: 'State Externalization', phase: Phase13StateExternalization, fixable: false },

  // Visual and style auditing (14a-16)
  { number: 14, subPhase: 'a', name: 'Table Formatting', phase: Phase14aTableFormatting, fixable: true },
  { number: 14, subPhase: 'b', name: 'Code Block Quality', phase: Phase14bCodeBlockQuality, fixable: false },
  { number: 14, subPhase: 'c', name: 'Header Hierarchy', phase: Phase14cHeaderHierarchy, fixable: false },
  { number: 15, name: 'Orphan Detection', phase: Phase15OrphanDetection, fixable: false },
  { number: 16, name: 'Windows Paths', phase: Phase16WindowsPaths, fixable: true },

  // Gateway-specific validation (17-20)
  { number: 17, name: 'Gateway Structure', phase: Phase17GatewayStructure, fixable: false, isGatewayOnly: true },
  { number: 18, name: 'Routing Table Format', phase: Phase18RoutingTableFormat, fixable: true, isGatewayOnly: true },
  { number: 19, name: 'Path Resolution', phase: Phase19PathResolution, fixable: false, isGatewayOnly: true },
  { number: 20, name: 'Coverage Check', phase: Phase20CoverageCheck, fixable: false, requiresSkillsDir: true, isGatewayOnly: true },

  // Advanced validation (21-22)
  { number: 21, name: 'Line Number References', phase: Phase21LineNumberReferences, fixable: false },
  { number: 22, name: 'Context7 Staleness', phase: Phase22Context7Staleness, fixable: false },
];

/**
 * Total number of distinct phase numbers (some have sub-phases)
 */
export const PHASE_COUNT = Math.max(...PHASE_REGISTRY.map(p => p.number));

/**
 * Phases that have auto-fix capability
 */
export const FIXABLE_PHASES = PHASE_REGISTRY.filter(p => p.fixable);

/**
 * Get display key for a phase (e.g., "14a", "14b", "10")
 */
export function getPhaseKey(phase: PhaseDefinition): string {
  return phase.subPhase ? `${phase.number}${phase.subPhase}` : `${phase.number}`;
}

/**
 * Find phase definition(s) by number
 * Returns array since some phase numbers have sub-phases (e.g., 14a, 14b, 14c)
 */
export function findPhasesByNumber(phaseNumber: number): PhaseDefinition[] {
  return PHASE_REGISTRY.filter(p => p.number === phaseNumber);
}

/**
 * Find a specific phase by key (e.g., "14a", "10")
 */
export function findPhaseByKey(phaseKey: string): PhaseDefinition | undefined {
  const match = phaseKey.match(/^(\d+)([a-z])?$/);
  if (!match) return undefined;

  const number = parseInt(match[1], 10);
  const subPhase = match[2];

  return PHASE_REGISTRY.find(p => p.number === number && p.subPhase === subPhase);
}
