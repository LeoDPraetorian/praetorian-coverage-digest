/**
 * Suggest Mode for Skill Manager Fix
 *
 * Detects ALL fixes (deterministic + hybrid + semantic) and outputs them as
 * suggestions. Nothing is auto-applied - Claude presents each fix
 * for user to Accept/Skip.
 *
 * Hybrid phases (4, 10, 19) return both deterministic fixes AND ambiguous cases
 * that need Claude reasoning.
 */

import { dirname } from 'path';
import { SkillAuditor } from './audit-engine.js';
import { SkillParser } from './utils/skill-parser.js';
import type {
  FixSuggestionOutput,
  SemanticSuggestion,
  Issue,
  AmbiguousCase,
  Phase4AmbiguousCase,
  Phase10AmbiguousCase,
  Phase19AmbiguousCase,
  SuggestionOption
} from './types.js';
import { SUGGESTION_PATTERNS, buildApplyCommand } from './suggestion-patterns.js';
import { Phase4BrokenLinks } from './phases/phase4-broken-links.js';
import { Phase10ReferenceAudit } from './phases/phase10-reference-audit.js';
import { Phase19PathResolution } from './phases/phase19-path-resolution.js';

/**
 * Run fix in suggest mode:
 * 1. Detect deterministic fixes (phases 2, 5, 6, 7, 12) via dry-run
 * 2. Run hybrid phases (4, 10, 19) - get deterministic fixes + ambiguous cases
 * 3. Generate semantic suggestions (phases 1, 3, 9, 11, 13)
 * 4. Return ALL as structured JSON for Claude to present
 */
export async function runSuggestMode(
  skillPath: string,
  skillName: string,
  dryRun: boolean
): Promise<FixSuggestionOutput> {
  const skillDir = dirname(skillPath);
  const parentDir = dirname(skillDir);
  const auditor = new SkillAuditor(parentDir);

  const allSuggestions: SemanticSuggestion[] = [];

  // Parse skill once for reuse
  const skill = await SkillParser.parseSkillFile(skillPath);

  // ALWAYS use dry-run to detect issues without applying
  const fixOptions = {
    dryRun: true,  // Never auto-apply in suggest mode
    autoFix: true,
    interactive: false,
    skillName,
  };

  // Step 1: Detect PURELY DETERMINISTIC fixes (phases 2, 5, 6, 7, 12)
  try {
    // Phase 2: Allowed tools
    const result2 = await auditor.fixPhase2(fixOptions);
    if (result2.phase2.issuesFound > 0) {
      const suggestion = generateDeterministicSuggestion(
        2,
        'phase2-allowed-tools',
        'Allowed-tools field needs updating',
        result2.phase2.details,
        skillName
      );
      if (suggestion) allSuggestions.push(suggestion);
    }

    // Phase 5: File organization
    const result5 = await auditor.fixPhase5(fixOptions);
    if (result5.phase5.issuesFound > 0) {
      const suggestion = generateDeterministicSuggestion(
        5,
        'phase5-file-organization',
        'File organization issues',
        result5.phase5.details,
        skillName
      );
      if (suggestion) allSuggestions.push(suggestion);
    }

    // Phase 6: Script organization
    const result6 = await auditor.fixPhase6(fixOptions);
    if (result6.phase6.issuesFound > 0) {
      const suggestion = generateDeterministicSuggestion(
        6,
        'phase6-script-organization',
        'Script organization issues',
        result6.phase6.details,
        skillName
      );
      if (suggestion) allSuggestions.push(suggestion);
    }

    // Phase 7: Output Directory Pattern
    const result7 = await auditor.fixPhase7(fixOptions);
    if (result7.phase7.issuesFound > 0) {
      const suggestion = generateDeterministicSuggestion(
        7,
        'phase7-output-directory',
        'Output directory pattern issues',
        result7.phase7.details,
        skillName
      );
      if (suggestion) allSuggestions.push(suggestion);
    }

    // Phase 12: CLI error handling
    const result12 = await auditor.fixPhase12(fixOptions);
    if (result12.phase12.issuesFound > 0) {
      const suggestion = generateDeterministicSuggestion(
        12,
        'phase12-cli-error-handling',
        'CLI error handling issues',
        result12.phase12.details,
        skillName
      );
      if (suggestion) allSuggestions.push(suggestion);
    }
  } catch (error) {
    console.error('Warning: Some deterministic checks failed', error);
  }

  // Step 2: Run HYBRID phases (4, 10, 19) - deterministic + ambiguous cases
  try {
    // Phase 4: Broken links (HYBRID)
    const result4 = await Phase4BrokenLinks.fixHybrid(skill, true);
    if (result4.fixedCount > 0) {
      // Deterministic fixes available
      allSuggestions.push({
        id: 'phase4-broken-links-auto',
        phase: 4,
        title: 'Broken Links (Auto-fixable)',
        explanation: `${result4.fixedCount} broken link(s) can be auto-fixed (files exist elsewhere)`,
        options: [
          { key: 'accept', label: 'Accept', description: 'Auto-fix path corrections' },
          { key: 'skip', label: 'Skip', description: 'Keep broken links' }
        ],
        applyCommand: buildApplyCommand(skillName, 'phase4-broken-links', false),
      });
    }
    // Ambiguous cases need Claude reasoning
    for (const ambiguous of result4.ambiguousCases) {
      allSuggestions.push(convertAmbiguousToSuggestion(ambiguous, skillName));
    }

    // Phase 10: Reference audit (HYBRID)
    const result10 = await Phase10ReferenceAudit.fixHybrid(skillPath, parentDir, true);
    if (result10.fixedCount > 0) {
      // Deterministic fixes available (from registry)
      allSuggestions.push({
        id: 'phase10-deprecated-refs-auto',
        phase: 10,
        title: 'Deprecated References (Auto-fixable)',
        explanation: `${result10.fixedCount} deprecated reference(s) can be auto-fixed (found in registry)`,
        options: [
          { key: 'accept', label: 'Accept', description: 'Auto-fix from deprecation registry' },
          { key: 'skip', label: 'Skip', description: 'Keep deprecated references' }
        ],
        applyCommand: buildApplyCommand(skillName, 'phase10-deprecated-refs', false),
      });
    }
    // Ambiguous cases (fuzzy matches) need Claude reasoning
    for (const ambiguous of result10.ambiguousCases) {
      allSuggestions.push(convertAmbiguousToSuggestion(ambiguous, skillName));
    }

    // Phase 19: Path resolution (HYBRID - gateway skills only)
    const result19 = await Phase19PathResolution.suggestFixes(skill);
    for (const ambiguous of result19) {
      allSuggestions.push(convertAmbiguousToSuggestion(ambiguous, skillName));
    }
  } catch (error) {
    console.error('Warning: Some hybrid checks failed', error);
  }

  // Step 3: Generate SEMANTIC suggestions (phases 1, 3, 9, 11, 13)
  const phase1Suggestion = await generatePhase1Suggestion(skill, skillName);
  if (phase1Suggestion) allSuggestions.push(phase1Suggestion);

  const phase3Suggestion = await generatePhase3Suggestion(skill, skillName);
  if (phase3Suggestion) allSuggestions.push(phase3Suggestion);

  const phase9Suggestion = await generatePhase9Suggestion(skill, skillName);
  if (phase9Suggestion) allSuggestions.push(phase9Suggestion);

  const phase11Suggestion = await generatePhase11Suggestion(skill, skillName);
  if (phase11Suggestion) allSuggestions.push(phase11Suggestion);

  const phase13Suggestion = await generatePhase13Suggestion(skill, skillName);
  if (phase13Suggestion) allSuggestions.push(phase13Suggestion);

  // Step 3: Build output (no more separate deterministic/semantic)
  const output: FixSuggestionOutput = {
    skill: skillName,
    skillPath,
    deterministic: {
      applied: 0,  // Nothing auto-applied in suggest mode
      details: [],
    },
    semantic: allSuggestions,
    summary: {
      deterministicApplied: 0,
      semanticPending: allSuggestions.length,
      status: allSuggestions.length > 0 ? 'NEEDS_INPUT' : 'COMPLETE',
    },
  };

  return output;
}

/**
 * Generate a suggestion for a deterministic fix
 */
function generateDeterministicSuggestion(
  phase: number,
  id: string,
  title: string,
  details: string[],
  skillName: string
): SemanticSuggestion | null {
  if (details.length === 0) return null;

  const pattern = SUGGESTION_PATTERNS[id as keyof typeof SUGGESTION_PATTERNS];

  // If pattern exists, use it; otherwise create a default one
  let explanation: string;
  if (pattern && typeof pattern.explanationTemplate === 'function') {
    // Call with empty args for patterns that don't need params
    explanation = (pattern.explanationTemplate as any)();
  } else {
    explanation = details.join('\n');
  }

  const options = pattern?.options || [
    { key: 'accept' as const, label: 'Accept', description: 'Apply this fix' },
    { key: 'skip' as const, label: 'Skip', description: 'Keep current state' },
  ];

  return {
    id,
    phase,
    title: pattern?.title || title,
    explanation,
    currentValue: details.join('\n'),
    options,
    applyCommand: buildApplyCommand(skillName, id, false),
  };
}

/**
 * Phase 1: Description quality suggestions
 */
async function generatePhase1Suggestion(
  skill: { name: string; frontmatter: { description: string }; skillType: string },
  skillName: string
): Promise<SemanticSuggestion | null> {
  const description = skill.frontmatter.description || '';
  const descLength = description.length;

  // Determine target based on skill type
  const isComplex = skill.skillType === 'reasoning' || skill.skillType === 'hybrid';
  const targetMin = isComplex ? 400 : 200;
  const targetMax = isComplex ? 800 : 400;

  // Check if description is too short
  if (descLength < targetMin) {
    const pattern = SUGGESTION_PATTERNS['phase1-description-short'];
    return {
      id: 'phase1-description',
      phase: 1,
      title: pattern.title,
      explanation: pattern.explanationTemplate(descLength, targetMin, targetMax),
      currentValue: description.length > 100 ? description.substring(0, 100) + '...' : description,
      suggestedValue: generateImprovedDescription(description, skill.skillType),
      options: pattern.options,
      applyCommand: buildApplyCommand(skillName, 'phase1-description', true),
    };
  }

  // Check if description is too long
  if (descLength > 1024) {
    const pattern = SUGGESTION_PATTERNS['phase1-description-long'];
    return {
      id: 'phase1-description',
      phase: 1,
      title: pattern.title,
      explanation: pattern.explanationTemplate(descLength, 1024),
      currentValue: description.substring(0, 100) + '...',
      suggestedValue: description.substring(0, 1000) + '...',
      options: pattern.options,
      applyCommand: buildApplyCommand(skillName, 'phase1-description', true),
    };
  }

  // Check for "Use when" trigger
  if (!description.toLowerCase().startsWith('use when')) {
    const pattern = SUGGESTION_PATTERNS['phase1-missing-trigger'];
    return {
      id: 'phase1-description',
      phase: 1,
      title: pattern.title,
      explanation: pattern.explanationTemplate(),
      currentValue: description.length > 100 ? description.substring(0, 100) + '...' : description,
      suggestedValue: `Use when ${description.toLowerCase()}`,
      options: pattern.options,
      applyCommand: buildApplyCommand(skillName, 'phase1-description', true),
    };
  }

  return null;
}

/**
 * Phase 3: Line count suggestions (Anthropic recommends <500 lines)
 * Thresholds: <350 safe, 350-450 caution, 450-500 warning, >500 critical
 */
async function generatePhase3Suggestion(
  skill: { name: string; lineCount: number },
  skillName: string
): Promise<SemanticSuggestion | null> {
  const { lineCount } = skill;

  // Unified thresholds from Anthropic best practices
  const CRITICAL_LIMIT = 500;
  const WARNING_THRESHOLD = 450;

  if (lineCount > CRITICAL_LIMIT) {
    const pattern = SUGGESTION_PATTERNS['phase3-too-long'];
    return {
      id: 'phase3-linecount',
      phase: 3,
      title: pattern.title,
      explanation: pattern.explanationTemplate(lineCount, CRITICAL_LIMIT),
      currentValue: `${lineCount} lines`,
      suggestedValue: `Extract sections to references/ to get under ${CRITICAL_LIMIT} lines`,
      options: pattern.options,
      applyCommand: buildApplyCommand(skillName, 'phase3-linecount', false),
    };
  }

  if (lineCount > WARNING_THRESHOLD) {
    const pattern = SUGGESTION_PATTERNS['phase3-approaching-limit'];
    return {
      id: 'phase3-linecount',
      phase: 3,
      title: pattern.title,
      explanation: pattern.explanationTemplate(lineCount, CRITICAL_LIMIT),
      currentValue: `${lineCount} lines`,
      suggestedValue: `Plan extraction before adding more content`,
      options: pattern.options,
      applyCommand: buildApplyCommand(skillName, 'phase3-linecount', false),
    };
  }

  return null;
}

/**
 * Phase 9: Non-TypeScript script suggestions
 */
async function generatePhase9Suggestion(
  skill: { name: string; directory: string },
  skillName: string
): Promise<SemanticSuggestion | null> {
  // Import Phase 9 to check for scripts
  const { Phase9BashTypeScriptMigration } = await import('./phases/phase9-bash-typescript-migration.js');

  const issues = await Phase9BashTypeScriptMigration.validate({
    ...skill,
    path: `${skill.directory}/SKILL.md`,
    frontmatter: { name: skill.name, description: '' },
    content: '',
    wordCount: 0,
    lineCount: 0,
    skillType: 'reasoning',
  });

  // Check if there are non-TypeScript scripts
  const scriptIssues = issues.filter(i => i.message.includes('non-TypeScript script'));
  if (scriptIssues.length > 0) {
    const scriptList = issues
      .filter(i => i.message.includes('→'))
      .map(i => i.message.replace('    → ', ''))
      .join(', ');

    const pattern = SUGGESTION_PATTERNS['phase9-scripts'];
    return {
      id: 'phase9-scripts',
      phase: 9,
      title: pattern.title,
      explanation: pattern.explanationTemplate(scriptIssues.length, scriptList || 'See audit for details'),
      currentValue: scriptList || 'Non-TypeScript scripts detected',
      options: pattern.options,
      applyCommand: buildApplyCommand(skillName, 'phase9-scripts', false),
    };
  }

  return null;
}

/**
 * Phase 11: Command portability suggestions
 */
async function generatePhase11Suggestion(
  skill: { name: string; content: string },
  skillName: string
): Promise<SemanticSuggestion | null> {
  // Check for cd commands without repo-root detection
  const cdPattern = /cd\s+["']?(?!.*\$REPO_ROOT)(?!.*\$\()\.claude\/|cd\s+["']?\.claude\//gm;
  const matches = skill.content.match(cdPattern);

  if (matches && matches.length > 0) {
    const pattern = SUGGESTION_PATTERNS['phase11-cd-command'];
    const lines = skill.content.split('\n');
    let lineNumber = 0;
    for (let i = 0; i < lines.length; i++) {
      if (cdPattern.test(lines[i])) {
        lineNumber = i + 1;
        break;
      }
    }

    return {
      id: 'phase11-command',
      phase: 11,
      title: pattern.title,
      explanation: pattern.explanationTemplate(lineNumber, matches[0]),
      currentValue: matches[0],
      suggestedValue: 'Use repo-root detection: cd "$REPO_ROOT/.claude/..."',
      options: SUGGESTION_PATTERNS['phase11-cd-command'].options,
      applyCommand: buildApplyCommand(skillName, 'phase11-command', true),
    };
  }

  return null;
}

/**
 * Phase 13: State externalization suggestions
 */
async function generatePhase13Suggestion(
  skill: { name: string; content: string; wordCount: number },
  skillName: string
): Promise<SemanticSuggestion | null> {
  // Check for complexity indicators
  const hasWorkflowKeywords = /systematic|protocol|phase|workflow|checklist/i.test(skill.content);
  const sectionCount = (skill.content.match(/^##\s+/gm) || []).length;
  const isComplex = sectionCount >= 5 || hasWorkflowKeywords;

  // Check if TodoWrite mandate exists
  const hasTodoWriteMandate = /MUST use TodoWrite|TodoWrite.*mandatory|mandatory.*TodoWrite/i.test(skill.content);

  if (isComplex && !hasTodoWriteMandate) {
    const reasons = [];
    if (sectionCount >= 5) reasons.push(`${sectionCount} sections`);
    if (hasWorkflowKeywords) reasons.push('workflow keywords');

    const pattern = SUGGESTION_PATTERNS['phase13-todowrite'];
    return {
      id: 'phase13-todowrite',
      phase: 13,
      title: pattern.title,
      explanation: pattern.explanationTemplate(reasons.join(', ')),
      suggestedValue: 'Add: "You MUST use TodoWrite before starting to track all workflow steps"',
      options: pattern.options,
      applyCommand: buildApplyCommand(skillName, 'phase13-todowrite', false),
    };
  }

  return null;
}

/**
 * Generate an improved description (simple heuristic)
 */
function generateImprovedDescription(current: string, skillType: string): string {
  // If it doesn't start with "Use when", add it
  let improved = current;
  if (!current.toLowerCase().startsWith('use when')) {
    improved = `Use when ${current.toLowerCase()}`;
  }

  // Add common enhancement phrases based on skill type
  if (skillType === 'reasoning' && improved.length < 300) {
    improved += ' - provides systematic approach with clear workflow steps';
  } else if (skillType === 'tool-wrapper' && improved.length < 200) {
    improved += ' - wraps CLI commands for consistent execution';
  }

  return improved;
}

/**
 * Convert an ambiguous case from a hybrid phase to a semantic suggestion
 * for Claude to present to the user
 */
function convertAmbiguousToSuggestion(
  ambiguous: AmbiguousCase,
  skillName: string
): SemanticSuggestion {
  // Generate title based on phase and type
  const titles: Record<string, string> = {
    'broken-link-missing': 'Broken Link - File Not Found',
    'phantom-reference-fuzzy': 'Phantom Reference - Did You Mean?',
    'broken-gateway-path': 'Broken Gateway Path',
  };

  // Convert HybridFixOption[] to SuggestionOption[]
  const options: SuggestionOption[] = ambiguous.options.map(opt => ({
    key: opt.key as 'accept' | 'skip' | 'custom',
    label: opt.label,
    description: opt.description,
  }));

  // Build explanation with context
  let explanation = ambiguous.context;

  // Add phase-specific details
  if (ambiguous.phase === 4) {
    const p4 = ambiguous as Phase4AmbiguousCase;
    if (p4.surroundingContext) {
      explanation += `\n\nContext: "${p4.surroundingContext}"`;
    }
    if (p4.similarFiles.length > 0) {
      explanation += `\n\nSimilar files found: ${p4.similarFiles.slice(0, 3).join(', ')}`;
    }
  } else if (ambiguous.phase === 10) {
    const p10 = ambiguous as Phase10AmbiguousCase;
    if (p10.fuzzyMatches.length > 0) {
      const matchList = p10.fuzzyMatches
        .slice(0, 3)
        .map(m => `${m.name} (${Math.round(m.score * 100)}%)`)
        .join(', ');
      explanation += `\n\nSimilar matches: ${matchList}`;
    }
  } else if (ambiguous.phase === 19) {
    const p19 = ambiguous as Phase19AmbiguousCase;
    if (p19.fuzzyMatches.length > 0) {
      const matchList = p19.fuzzyMatches
        .slice(0, 3)
        .map(m => `${m.name} (${Math.round(m.score * 100)}%)`)
        .join(', ');
      explanation += `\n\nSimilar skills: ${matchList}`;
    }
  }

  return {
    id: `phase${ambiguous.phase}-${ambiguous.type}`,
    phase: ambiguous.phase,
    title: titles[ambiguous.type] || `Phase ${ambiguous.phase} Issue`,
    explanation,
    options,
    applyCommand: buildApplyCommand(skillName, `phase${ambiguous.phase}-${ambiguous.type}`, true),
  };
}
