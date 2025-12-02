// src/generators/skill-generator.ts
/**
 * Enhanced Skill Generator - Creates skill structure from all research phases
 *
 * Uses the synthesizer to combine:
 * - Requirements from brainstorming
 * - CodebasePatterns from codebase research
 * - ResearchData from Context7
 * - WebResearch from web research
 *
 * Generates:
 * - SKILL.md (300-600 lines) with real content
 * - references/ directory with documentation
 * - templates/ directory with code examples
 * - examples/ directory with workflow examples
 * - .local/metadata.json for tracking
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { findProjectRoot } from '../../../../../lib/find-project-root.js';
import {
  synthesizeContent,
  generateFrontmatter,
  buildSections,
  buildReferences,
  buildTemplates,
  buildExamples,
} from '../lib/synthesizer.js';
import type {
  GenerationInput,
  GenerationResult,
  GeneratedSkill,
  GeneratedFile,
  SynthesizedContent,
  Requirements,
  ResearchData,
  CodebasePatterns,
} from '../lib/types.js';

const PROJECT_ROOT = findProjectRoot();

/**
 * Enhanced skill generator that uses all research phases
 */
export class EnhancedSkillGenerator {
  private input: GenerationInput;
  private synthesized: SynthesizedContent | null = null;

  constructor(input: GenerationInput) {
    this.input = input;
  }

  /**
   * Get the skill directory path based on location
   */
  getSkillPath(): string {
    const { requirements } = this.input;
    const location = requirements.location;

    if (location === 'core') {
      return join(PROJECT_ROOT, '.claude/skills', requirements.name);
    }

    // Library location: { library: 'category/path' }
    const categoryPath = typeof location === 'object' ? location.library : 'development';
    return join(PROJECT_ROOT, '.claude/skill-library', categoryPath, requirements.name);
  }

  /**
   * Generate complete skill structure
   */
  async generate(): Promise<GenerationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Synthesize content from all sources
      this.synthesized = synthesizeContent(this.input);

      // Build SKILL.md content
      const skillMd = this.buildSkillMd();

      // Validate line count
      const lineCount = skillMd.split('\n').length;
      if (lineCount < 100) {
        warnings.push(`Generated SKILL.md has only ${lineCount} lines (target: 300+)`);
      }

      // Build all files
      const files: GeneratedFile[] = [];

      // SKILL.md
      files.push({
        path: 'SKILL.md',
        content: skillMd,
        type: 'skill-md',
      });

      // References
      files.push(...this.synthesized.references);

      // Templates
      files.push(...this.synthesized.templates);

      // Examples
      files.push(...this.synthesized.examples);

      // Metadata
      files.push({
        path: '.local/metadata.json',
        content: JSON.stringify(this.synthesized.metadata, null, 2),
        type: 'metadata',
      });

      const skill: GeneratedSkill = {
        name: this.input.requirements.name,
        location: this.getSkillPath(),
        files,
        summary: {
          skillMdLines: lineCount,
          referenceCount: this.synthesized.references.length,
          templateCount: this.synthesized.templates.length + this.synthesized.examples.length,
        },
      };

      return {
        success: true,
        skill,
        synthesized: this.synthesized,
        errors,
        warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Generation failed: ${message}`);

      return {
        success: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Build complete SKILL.md content
   */
  private buildSkillMd(): string {
    if (!this.synthesized) {
      throw new Error('Must call generate() first');
    }

    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`name: ${this.synthesized.frontmatter.name}`);
    lines.push(`description: ${this.synthesized.frontmatter.description}`);
    lines.push(`allowed-tools: ${this.synthesized.frontmatter.allowedTools.join(', ')}`);
    if (this.synthesized.frontmatter.skills && this.synthesized.frontmatter.skills.length > 0) {
      lines.push(`skills: ${this.synthesized.frontmatter.skills.join(', ')}`);
    }
    lines.push('---');
    lines.push('');

    // Title
    const title = this.formatTitle(this.input.requirements.name);
    lines.push(`# ${title}`);
    lines.push('');

    // Sections
    for (const section of this.synthesized.sections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Write generated files to disk
   */
  async writeFiles(result: GenerationResult): Promise<void> {
    if (!result.success || !result.skill) {
      throw new Error('Cannot write files: generation failed');
    }

    const basePath = result.skill.location;

    for (const file of result.skill.files) {
      const fullPath = join(basePath, file.path);
      const dir = dirname(fullPath);

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(fullPath, file.content);
    }
  }

  /**
   * Format skill name as title
   */
  private formatTitle(name: string): string {
    return name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

/**
 * Legacy SkillGenerator for backwards compatibility
 * Uses ResearchData only (Context7 + web)
 */
export class SkillGenerator {
  private researchData: ResearchData;
  private location: string;
  private skillName: string;

  constructor(researchData: ResearchData, location?: string) {
    this.researchData = researchData;
    this.location = location || 'library:development';
    this.skillName = this.generateSkillName();
  }

  /**
   * Generate skill name from topic
   */
  private generateSkillName(): string {
    const topic = this.researchData.topic.toLowerCase();

    // Handle common patterns
    if (topic.includes('tanstack')) {
      const lib = topic.replace('tanstack', '').trim();
      return `frontend-tanstack-${lib || 'core'}`;
    }

    // Generic: prefix with domain and sanitize
    const sanitized = topic.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `library-${sanitized}`;
  }

  /**
   * Get full skill directory path
   */
  private getSkillPath(): string {
    if (this.location === 'core') {
      return join(PROJECT_ROOT, '.claude/skills', this.skillName);
    }

    // Library location: library:domain or library:domain/subdomain
    const locationParts = this.location.replace('library:', '').split('/');
    return join(PROJECT_ROOT, '.claude/skill-library', ...locationParts, this.skillName);
  }

  /**
   * Generate using enhanced generator with adapted input
   */
  async generate(): Promise<GeneratedSkill> {
    // Adapt ResearchData to GenerationInput
    const requirements: Requirements = {
      name: this.skillName,
      initialPrompt: `Use when working with ${this.researchData.topic}`,
      skillType: 'library',
      location:
        this.location === 'core'
          ? 'core'
          : { library: this.location.replace('library:', '') },
      purpose: `Working with ${this.researchData.topic}`,
      workflows: ['Basic usage', 'Advanced patterns', 'Troubleshooting'],
      audience: 'intermediate',
      contentPreferences: ['api-reference', 'examples', 'best-practices'],
      libraryName: this.researchData.topic,
      searchPatterns: [this.researchData.topic],
      context7Query: this.researchData.topic,
    };

    const input: GenerationInput = {
      requirements,
      context7Data: this.researchData,
      webResearch:
        this.researchData.web.sources.length > 0
          ? {
              sources: this.researchData.web.sources,
              fetchedContent: this.researchData.web.fetchedContent,
            }
          : undefined,
    };

    const enhanced = new EnhancedSkillGenerator(input);
    const result = await enhanced.generate();

    if (!result.success || !result.skill) {
      throw new Error(`Generation failed: ${result.errors.join(', ')}`);
    }

    return result.skill;
  }

  /**
   * Write generated files to disk
   */
  async writeFiles(skill: GeneratedSkill): Promise<void> {
    const basePath = skill.location;

    for (const file of skill.files) {
      const fullPath = join(basePath, file.path);
      const dir = dirname(fullPath);

      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(fullPath, file.content);
    }
  }
}

/**
 * Generate skill from all research phases (recommended)
 */
export async function generateSkill(input: GenerationInput): Promise<GenerationResult> {
  const generator = new EnhancedSkillGenerator(input);
  return generator.generate();
}

/**
 * Generate and write skill in one step
 */
export async function generateAndWriteSkill(input: GenerationInput): Promise<GenerationResult> {
  const generator = new EnhancedSkillGenerator(input);
  const result = await generator.generate();

  if (result.success) {
    await generator.writeFiles(result);
  }

  return result;
}
