/**
 * Phase 14b: Code Block Quality
 * Validates code blocks for proper formatting and language tags:
 * - All code blocks have language tags (```bash, ```typescript, etc.)
 * - No generic ``` without language
 * - Language tag matches content (bash commands have ```bash)
 * - Lines not excessively long (>120 chars warning)
 */

import type { SkillFile, Issue, PhaseResult } from '../types.js';
import { SkillParser } from '../utils/skill-parser.js';

interface CodeBlockInfo {
  startLine: number;
  endLine: number;
  language: string;
  content: string;
  raw: string;
}

// Language detection patterns
const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  bash: [
    /^(npm|yarn|pnpm|make|git|cd|ls|mkdir|rm|cp|mv|cat|echo|curl|wget)\s/m,
    /^\$\s+/m, // Shell prompt
    /^#!\s*\/bin\/(ba)?sh/m, // Shebang
    /&&\s*\\/m, // Line continuation
    /\|\s*(grep|awk|sed|xargs)/m, // Piped commands
  ],
  typescript: [
    /^import\s+.*from\s+['"][^'"]+['"]/m,
    /^export\s+(interface|type|const|function|class)/m,
    /:\s*(string|number|boolean|void|any|unknown)\b/m,
    /^interface\s+\w+/m,
    /^type\s+\w+\s*=/m,
    /<[A-Z]\w*(\s|>)/m, // Generic types or JSX
  ],
  javascript: [
    /^const\s+\w+\s*=/m,
    /^let\s+\w+\s*=/m,
    /^function\s+\w+/m,
    /=>\s*{/m,
    /require\(['"][^'"]+['"]\)/m,
  ],
  json: [
    /^\s*\{[\s\S]*"[^"]+"\s*:/m,
    /^\s*\[[\s\S]*\{/m,
  ],
  yaml: [
    /^\s*[a-z_-]+:\s*$/m,
    /^\s*-\s+[a-z_-]+:/m,
  ],
  markdown: [
    /^#+\s+/m,
    /^\*\*[^*]+\*\*/m,
    /^\[.+\]\(.+\)/m,
  ],
  go: [
    /^package\s+\w+/m,
    /^func\s+\w+/m,
    /^import\s*\(/m,
    /^\s*type\s+\w+\s+struct/m,
  ],
  python: [
    /^def\s+\w+\(/m,
    /^class\s+\w+:/m,
    /^import\s+\w+/m,
    /^from\s+\w+\s+import/m,
    /^\s*if\s+__name__\s*==\s*['"]__main__['"]/m,
  ],
  sql: [
    /^SELECT\s+/im,
    /^INSERT\s+INTO/im,
    /^UPDATE\s+\w+\s+SET/im,
    /^CREATE\s+(TABLE|INDEX|VIEW)/im,
  ],
  css: [
    /^\s*\.[a-z-]+\s*\{/m,
    /^\s*#[a-z-]+\s*\{/m,
    /^\s*@media\s/m,
    /^\s*@import\s/m,
  ],
  html: [
    /^<!DOCTYPE\s+html>/im,
    /<html[^>]*>/im,
    /<div[^>]*>/im,
    /<script[^>]*>/im,
  ],
  cypher: [
    /MATCH\s*\(/im,
    /CREATE\s*\(/im,
    /-\[:\w+\]->/m,
    /RETURN\s+\w+/im,
  ],
};

// Known valid language tags
const VALID_LANGUAGES = new Set([
  'bash', 'sh', 'shell', 'zsh',
  'typescript', 'ts', 'tsx',
  'javascript', 'js', 'jsx',
  'json', 'jsonc',
  'yaml', 'yml',
  'markdown', 'md',
  'go', 'golang',
  'python', 'py',
  'sql',
  'css', 'scss', 'sass', 'less',
  'html', 'htm', 'xml',
  'cypher',
  'rust', 'rs',
  'java',
  'c', 'cpp', 'c++', 'cxx',
  'csharp', 'cs',
  'ruby', 'rb',
  'php',
  'swift',
  'kotlin', 'kt',
  'scala',
  'r',
  'perl',
  'lua',
  'vim',
  'diff',
  'text', 'txt', 'plaintext',
  'console', 'terminal',
  'graphql', 'gql',
  'dockerfile',
  'makefile',
  'ini', 'toml',
  'nginx',
  'apache',
  'vql', // Velociraptor Query Language
]);

export class Phase14bCodeBlockQuality {
  static readonly MAX_LINE_LENGTH = 120;
  static readonly MAX_LINE_WARNING = 100;

  /**
   * Extract all code blocks from markdown content
   */
  private static extractCodeBlocks(content: string): CodeBlockInfo[] {
    const blocks: CodeBlockInfo[] = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const match = line.match(/^```(\w*)/);

      if (match) {
        const startLine = i + 1; // 1-indexed
        const language = match[1] || '';
        const contentLines: string[] = [];
        const rawLines: string[] = [line];
        i++;

        // Collect content until closing ```
        while (i < lines.length && !lines[i].startsWith('```')) {
          contentLines.push(lines[i]);
          rawLines.push(lines[i]);
          i++;
        }

        if (i < lines.length) {
          rawLines.push(lines[i]); // closing ```
        }

        blocks.push({
          startLine,
          endLine: i + 1,
          language,
          content: contentLines.join('\n'),
          raw: rawLines.join('\n'),
        });
      }
      i++;
    }

    return blocks;
  }

  /**
   * Detect the likely language of a code block
   */
  private static detectLanguage(content: string): string | null {
    for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          return lang;
        }
      }
    }
    return null;
  }

  /**
   * Check if a language tag is valid
   */
  private static isValidLanguage(language: string): boolean {
    return VALID_LANGUAGES.has(language.toLowerCase());
  }

  /**
   * Validate a single code block
   */
  private static validateCodeBlock(block: CodeBlockInfo): Issue[] {
    const issues: Issue[] = [];

    // Check for missing language tag
    if (!block.language) {
      const suggestedLang = this.detectLanguage(block.content);
      if (suggestedLang) {
        issues.push({
          severity: 'WARNING',
          message: `Code block at line ${block.startLine} missing language tag (suggested: ${suggestedLang})`,
          line: block.startLine,
          autoFixable: true,
        });
      } else {
        issues.push({
          severity: 'INFO',
          message: `Code block at line ${block.startLine} missing language tag`,
          line: block.startLine,
          autoFixable: false,
        });
      }
    } else {
      // Check if language tag is valid
      if (!this.isValidLanguage(block.language)) {
        issues.push({
          severity: 'INFO',
          message: `Unknown language tag "${block.language}" at line ${block.startLine}`,
          line: block.startLine,
          autoFixable: false,
        });
      }

      // Check for mismatched language
      const detectedLang = this.detectLanguage(block.content);
      if (detectedLang && detectedLang !== block.language.toLowerCase()) {
        // Allow some equivalents
        const equivalents: Record<string, string[]> = {
          bash: ['sh', 'shell', 'zsh', 'console', 'terminal'],
          typescript: ['ts', 'tsx'],
          javascript: ['js', 'jsx'],
          yaml: ['yml'],
          markdown: ['md'],
          python: ['py'],
          go: ['golang'],
        };

        const isEquivalent = equivalents[detectedLang]?.includes(block.language.toLowerCase()) ||
                           equivalents[block.language.toLowerCase()]?.includes(detectedLang);

        if (!isEquivalent) {
          issues.push({
            severity: 'INFO',
            message: `Code block at line ${block.startLine} tagged as "${block.language}" but looks like ${detectedLang}`,
            line: block.startLine,
            autoFixable: false,
          });
        }
      }
    }

    // Check for excessively long lines
    const lines = block.content.split('\n');
    let longLineCount = 0;
    let criticalLongLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length;
      if (lineLength > this.MAX_LINE_LENGTH) {
        criticalLongLines++;
        longLineCount++;
      } else if (lineLength > this.MAX_LINE_WARNING) {
        longLineCount++;
      }
    }

    if (criticalLongLines > 0) {
      issues.push({
        severity: 'WARNING',
        message: `Code block at line ${block.startLine} has ${criticalLongLines} line(s) exceeding ${this.MAX_LINE_LENGTH} chars`,
        line: block.startLine,
        autoFixable: false,
      });
    } else if (longLineCount > 0) {
      issues.push({
        severity: 'INFO',
        message: `Code block at line ${block.startLine} has ${longLineCount} line(s) exceeding ${this.MAX_LINE_WARNING} chars`,
        line: block.startLine,
        autoFixable: false,
      });
    }

    return issues;
  }

  /**
   * Validate code block quality for a single skill
   * Returns consolidated issues with context listing affected lines
   */
  static validate(skill: SkillFile): Issue[] {
    const issues: Issue[] = [];
    const blocks = this.extractCodeBlocks(skill.content);

    if (blocks.length === 0) {
      return []; // No code blocks - that's fine for some skills
    }

    // Collect issues by category for consolidation
    const missingLanguageTags: { line: number; suggested: string | null }[] = [];
    const unknownLanguages: { line: number; tag: string }[] = [];
    const mismatchedLanguages: { line: number; tagged: string; detected: string }[] = [];
    const longLineBlocks: { line: number; count: number; critical: boolean }[] = [];

    for (const block of blocks) {
      // Check missing language tags
      if (!block.language) {
        const suggested = this.detectLanguage(block.content);
        missingLanguageTags.push({ line: block.startLine, suggested });
      } else {
        // Check unknown language tags
        if (!this.isValidLanguage(block.language)) {
          unknownLanguages.push({ line: block.startLine, tag: block.language });
        }

        // Check mismatched languages
        const detected = this.detectLanguage(block.content);
        if (detected && detected !== block.language.toLowerCase()) {
          const equivalents: Record<string, string[]> = {
            bash: ['sh', 'shell', 'zsh', 'console', 'terminal'],
            typescript: ['ts', 'tsx'],
            javascript: ['js', 'jsx'],
            yaml: ['yml'],
            markdown: ['md'],
            python: ['py'],
            go: ['golang'],
          };
          const isEquivalent = equivalents[detected]?.includes(block.language.toLowerCase()) ||
                              equivalents[block.language.toLowerCase()]?.includes(detected);
          if (!isEquivalent) {
            mismatchedLanguages.push({ line: block.startLine, tagged: block.language, detected });
          }
        }
      }

      // Check long lines
      const lines = block.content.split('\n');
      let longCount = 0;
      let criticalCount = 0;
      for (const line of lines) {
        if (line.length > this.MAX_LINE_LENGTH) {
          criticalCount++;
          longCount++;
        } else if (line.length > this.MAX_LINE_WARNING) {
          longCount++;
        }
      }
      if (longCount > 0) {
        longLineBlocks.push({ line: block.startLine, count: longCount, critical: criticalCount > 0 });
      }
    }

    // Create consolidated issues

    // Missing language tags - single issue with context
    if (missingLanguageTags.length > 0) {
      const severity = missingLanguageTags.length > 2 ? 'WARNING' : 'INFO';
      const withSuggestions = missingLanguageTags.filter(m => m.suggested);
      issues.push({
        severity,
        message: `${missingLanguageTags.length} of ${blocks.length} code blocks missing language tags`,
        recommendation: 'Add language tags to code blocks for proper syntax highlighting',
        context: missingLanguageTags.map(m =>
          m.suggested
            ? `Line ${m.line}: suggest \`\`\`${m.suggested}`
            : `Line ${m.line}: unable to detect language`
        ),
        autoFixable: withSuggestions.length > 0,
      });
    }

    // Unknown language tags - single issue with context
    if (unknownLanguages.length > 0) {
      issues.push({
        severity: 'INFO',
        message: `${unknownLanguages.length} code block(s) use unknown language tags`,
        recommendation: 'Use standard language tags (bash, typescript, python, etc.)',
        context: unknownLanguages.map(u => `Line ${u.line}: unknown tag "${u.tag}"`),
        autoFixable: false,
      });
    }

    // Mismatched languages - single issue with context
    if (mismatchedLanguages.length > 0) {
      issues.push({
        severity: 'INFO',
        message: `${mismatchedLanguages.length} code block(s) have mismatched language tags`,
        recommendation: 'Update language tags to match actual content',
        context: mismatchedLanguages.map(m => `Line ${m.line}: tagged "${m.tagged}" but looks like ${m.detected}`),
        autoFixable: false,
      });
    }

    // Long lines - single issue with context
    const criticalBlocks = longLineBlocks.filter(b => b.critical);
    if (criticalBlocks.length > 0) {
      issues.push({
        severity: 'WARNING',
        message: `${criticalBlocks.length} code block(s) have lines exceeding ${this.MAX_LINE_LENGTH} chars`,
        recommendation: 'Break long lines for readability',
        context: criticalBlocks.map(b => `Line ${b.line}: ${b.count} long line(s)`),
        autoFixable: false,
      });
    }

    return issues;
  }

  /**
   * Run Phase 14b audit on all skills
   */
  static async run(skillsDir: string): Promise<PhaseResult> {
    const skillPaths = await SkillParser.findAllSkills(skillsDir);
    const skills = await Promise.all(skillPaths.map(p => SkillParser.parseSkillFile(p)));
    return this.runOnParsedSkills(skills);
  }

  /**
   * Run Phase 14b audit on pre-parsed skills (performance optimized)
   */
  static async runOnParsedSkills(skills: SkillFile[]): Promise<PhaseResult> {
    let skillsAffected = 0;
    let issuesFound = 0;
    const details: string[] = [];

    for (const skill of skills) {
      const issues = this.validate(skill);

      // Only count as affected if there are warnings or criticals
      const significantIssues = issues.filter(i => i.severity !== 'INFO');

      if (significantIssues.length > 0) {
        skillsAffected++;
        issuesFound += significantIssues.length;

        details.push(`${skill.name}:`);
        for (const issue of issues) {
          details.push(`  - [${issue.severity}] ${issue.message}`);
        }
      }
    }

    return {
      phaseName: 'Phase 14b: Code Block Quality',
      skillsAffected,
      issuesFound,
      issuesFixed: 0,
      details,
    };
  }
}
