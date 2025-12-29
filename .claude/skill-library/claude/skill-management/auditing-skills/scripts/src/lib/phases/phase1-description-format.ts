/**
 * Phase 1: Description Format Validation
 * Ensures all skill descriptions start with "Use when" or "Use this skill when"
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

type SkillComplexity = 'simple' | 'moderate' | 'complex';

interface ComplexityRanges {
  min: number;
  max: number;
  rationale: string;
}

const COMPLEXITY_RANGES: Record<SkillComplexity, ComplexityRanges> = {
  simple: { min: 200, max: 400, rationale: 'Single purpose, limited APIs' },
  moderate: { min: 400, max: 600, rationale: 'Multiple use cases, several APIs' },
  complex: { min: 600, max: 800, rationale: 'Many APIs, migration scenarios, multiple symptoms' },
};

export class Phase1DescriptionFormat {
  /**
   * Validate name format (lowercase, hyphens, max 64 chars)
   */
  private static validateNameFormat(name: string): Issue[] {
    const issues: Issue[] = [];

    // Check 1: Max 64 characters
    if (name.length > 64) {
      issues.push({
        severity: 'CRITICAL',
        message: `Name is ${name.length} characters (max 64)`,
        autoFixable: false,
      });
    }

    // Check 2: Lowercase letters, numbers, and hyphens only
    if (!/^[a-z0-9-]+$/.test(name)) {
      const invalidChars = name.match(/[^a-z0-9-]/g) || [];
      const uniqueInvalid = [...new Set(invalidChars)];
      issues.push({
        severity: 'CRITICAL',
        message: `Name contains invalid characters: ${uniqueInvalid.map(c => `"${c}"`).join(', ')} (only lowercase letters, numbers, hyphens allowed)`,
        autoFixable: false,
      });
    }

    // Check 3: No leading/trailing hyphens
    if (name.startsWith('-') || name.endsWith('-')) {
      issues.push({
        severity: 'WARNING',
        message: 'Name should not start or end with a hyphen',
        autoFixable: false,
      });
    }

    // Check 4: No consecutive hyphens
    if (/--/.test(name)) {
      issues.push({
        severity: 'WARNING',
        message: 'Name should not contain consecutive hyphens',
        autoFixable: false,
      });
    }

    return issues;
  }

  /**
   * Validate description format for a single skill
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];

    // Check 0a: Validate name format
    const nameIssues = this.validateNameFormat(skill.name);
    issues.push(...nameIssues);

    // Check 0b: Gerund naming convention (WARNING)
    // Recommended: Use gerund form (verb + -ing) for process/action skills
    // Exceptions: gateway-*, *-manager, and nouns representing libraries/tools
    const isGateway = skill.name.startsWith('gateway-');
    const isManager = skill.name.endsWith('-manager');
    const hasGerund = /ing-|ing$/.test(skill.name);

    if (!isGateway && !isManager && !hasGerund) {
      issues.push({
        severity: 'WARNING',
        message: 'Name should use gerund form (verb + -ing) for clarity. Example: "adhering-to-dry" instead of "dry-principles"',
        autoFixable: false,
      });
    }

    // Check 0c: SKILL.md must exist (basic requirement)
    // Note: If we got here, SKILL.md exists (parser succeeded)
    // But we should validate the frontmatter is valid

    const { description } = skill.frontmatter;

    // Check for YAML parse errors
    if (description === 'YAML_PARSE_ERROR') {
      issues.push({
        severity: 'CRITICAL',
        message: 'Invalid YAML in frontmatter - likely special characters in description',
        autoFixable: false,
      });
      return issues;
    }

    if (!description) {
      issues.push({
        severity: 'CRITICAL',
        message: 'Missing description field in frontmatter',
        autoFixable: false,
      });
      return issues;
    }

    // Check if description starts with "Use when" (case-insensitive)
    const startsWithUseWhen = /^Use\s+(when|this\s+skill\s+when)/i.test(description.trim());

    if (!startsWithUseWhen) {
      // Detect pattern and suggest transformation
      const suggestion = this.suggestTransformation(description);

      issues.push({
        severity: 'WARNING',
        message: `Description doesn't start with "Use when"`,
        recommendation: suggestion
          ? `Transform to: "${suggestion}"`
          : 'Rewrite description starting with "Use when..." pattern',
        autoFixable: false, // Requires reasoning and context understanding
      });
    }

    // Check description length (max 1,024 chars)
    if (description.length > 1024) {
      issues.push({
        severity: 'CRITICAL',
        message: `Description is ${description.length} characters (>1,024 limit)`,
        autoFixable: false,
      });
    }

    // Check for first person voice (I, me, my)
    if (/\b(I|me|my|I'll|I'm|I've)\b/.test(description)) {
      issues.push({
        severity: 'WARNING',
        message: 'Description uses first person voice (should be third person)',
        autoFixable: false,
      });
    }

    // Check for second person voice (you, your)
    if (/\b(you|your|you're|you'll)\b/i.test(description)) {
      issues.push({
        severity: 'WARNING',
        message: 'Description uses second person voice (should be third person)',
        autoFixable: false,
      });
    }

    // CSO (Claude Search Optimization) Checks
    const csoIssues = this.validateCSO(skill, description);
    issues.push(...csoIssues);

    return issues;
  }

  /**
   * Validate CSO (Claude Search Optimization) for discoverability
   * Returns consolidated issues with context embedded
   */
  private static validateCSO(skill: SkillFile, description: string): Issue[] {
    const issues: Issue[] = [];

    // Detect skill complexity
    const complexity = this.detectComplexity(skill);
    const range = COMPLEXITY_RANGES[complexity];
    const descLength = description.length;

    // Character count by complexity - only report if there's an actionable issue
    if (complexity === 'complex' && descLength < 400) {
      // Over-reduction trap: Complex skill with short description
      issues.push({
        severity: 'WARNING',
        message: `Complex skill with short description (${descLength} chars)`,
        recommendation: 'Add error keywords, symptom keywords, and API names for better discoverability',
        context: [`Target: ${range.min}-${range.max} chars for complex skills`],
        autoFixable: false,
      });
    }

    // Keyword coverage analysis - consolidated
    const keywordIssues = this.analyzeKeywordCoverage(skill, description, complexity);
    issues.push(...keywordIssues);

    return issues;
  }

  /**
   * Detect skill complexity based on content
   */
  private static detectComplexity(skill: SkillFile): SkillComplexity {
    const { content, name } = skill;
    const combined = `${name} ${content}`.toLowerCase();

    // Complex indicators
    const complexIndicators = [
      /\bmigration\b/i,
      /\bv\d+\s+to\s+v\d+/i, // Version migrations
      /multiple\s+apis/i,
      /\bbreaking\s+changes\b/i,
      /\(\w+,\s+\w+,\s+\w+.*\)/i, // Multiple API names in parens
    ];

    const complexCount = complexIndicators.filter(p => p.test(combined)).length;

    if (complexCount >= 2) {
      return 'complex';
    }

    // Simple indicators
    const simpleIndicators = [
      /single\s+purpose/i,
      /focused/i,
      /specific\s+task/i,
    ];

    const simpleCount = simpleIndicators.filter(p => p.test(combined)).length;

    if (simpleCount >= 1 && content.length < 1500) {
      return 'simple';
    }

    // Default to moderate
    return 'moderate';
  }

  /**
   * Analyze keyword coverage for discoverability
   * Returns consolidated issue with recommendation
   */
  private static analyzeKeywordCoverage(
    skill: SkillFile,
    description: string,
    complexity: SkillComplexity
  ): Issue[] {
    if (complexity !== 'complex') {
      return []; // Only check complex skills
    }

    // Check for common CSO elements in complex skills
    const hasErrorKeywords = /error|exception|warning|failure|issue/i.test(description);
    const hasSymptomKeywords = /flaky|inconsistent|hanging|stale|slow|broken/i.test(description);
    const hasAPINames = /use\w+|get\w+|set\w+|create\w+/i.test(description); // Common API patterns

    const missing: string[] = [];

    if (!hasErrorKeywords) {
      missing.push('error keywords (error, exception, failure)');
    }

    if (!hasSymptomKeywords) {
      missing.push('symptom keywords (flaky, slow, broken)');
    }

    if (!hasAPINames && /api|library|framework/i.test(skill.content)) {
      missing.push('API names');
    }

    if (missing.length >= 2) {
      return [{
        severity: 'INFO',
        message: `CSO: Complex skill missing ${missing.length} keyword types for discoverability`,
        recommendation: 'Add error messages users see, symptom keywords, and specific API names',
        context: missing,
        autoFixable: false,
      }];
    }

    return [];
  }

  /**
   * Suggest transformation for common patterns
   */
  private static suggestTransformation(description: string): string | null {
    const trimmed = description.trim();

    // Pattern: "This skill helps..."
    if (/^This skill helps/i.test(trimmed)) {
      const rest = trimmed.replace(/^This skill helps\s+/i, '');
      return `Use when ${rest}`;
    }

    // Pattern: "Master/Specialized/Expert..."
    if (/^(Master|Specialized|Expert|Use this to)/i.test(trimmed)) {
      return `Use when you need to ${trimmed.toLowerCase()}`;
    }

    // Pattern: Verb-first (e.g., "Create", "Implement", "Design")
    if (/^(Create|Implement|Design|Build|Configure|Manage|Test|Debug|Analyze)/i.test(trimmed)) {
      return `Use when you need to ${trimmed.toLowerCase()}`;
    }

    // Pattern: Noun phrase (e.g., "A tool for...")
    if (/^(A tool|A skill|A guide|A system)/i.test(trimmed)) {
      return `Use when ${trimmed.toLowerCase().replace(/^(a|an|the)\s+/, '')}`;
    }

    return null;
  }

  /**
   * Run Phase 1 audit on all skills (backward compatible - parses files)
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run Phase 1 audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[]): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skill of skills) {
      const issues = this.validate(skill);

      if (issues.length > 0) {
        skillsAffected++;
        issuesFound += issues.length;

        details.push(`${skill.name}:`);
        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);
        }
      }
    }

    return {
      phaseName: 'Phase 1: Description Format',
      skillsAffected,
      issuesFound,
      issuesFixed: 0, // Manual fixes required
      details,
    };
  }

  /**
   * Get compliance rate
   */
  static async getCompliance(skillsDir: string): Promise<{
    compliant: number;
    total: number;
    percentage: number;
  }> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    let compliant = 0;

    for (const skillPath of skillPaths) {
      const skill = await SkillParser.parseSkillFile(skillPath);
      const issues = this.validate(skill);

      // Compliant if no CRITICAL or WARNING issues
      const hasCriticalOrWarning = issues.some(
        (issue) => issue.severity === 'CRITICAL' || issue.severity === 'WARNING'
      );

      if (!hasCriticalOrWarning) {
        compliant++;
      }
    }

    const total = skillPaths.length;
    const percentage = total > 0 ? (compliant / total) * 100 : 0;

    return { compliant, total, percentage };
  }
}
