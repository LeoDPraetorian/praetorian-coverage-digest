// src/lib/smart-keywords.ts
/**
 * Smart keyword extraction for library/service name detection
 *
 * This module provides improved keyword extraction that filters out
 * common action words and prioritizes likely library/service names.
 */

// ============================================================================
// Filter Word Sets
// ============================================================================

/**
 * Common action words that shouldn't be used as library search queries
 */
const ACTION_WORDS = new Set([
  'create',
  'build',
  'make',
  'add',
  'implement',
  'develop',
  'write',
  'setup',
  'configure',
  'install',
  'update',
  'upgrade',
  'fix',
  'debug',
  'test',
  'run',
  'start',
  'stop',
  'deploy',
  'use',
  'using',
  'new',
  'get',
  'set',
  'handle',
  'process',
]);

/**
 * Generic skill/tech words that are too broad for library search
 */
const GENERIC_TECH_WORDS = new Set([
  'skill',
  'plugin',
  'module',
  'component',
  'service',
  'feature',
  'tool',
  'library',
  'framework',
  'package',
  'system',
  'application',
  'app',
  'project',
  'platform',
  'api',
  'sdk',
  'cli',
]);

/**
 * Project-specific words (for Chariot) that shouldn't be searched
 */
const PROJECT_WORDS = new Set([
  'chariot',
  'praetorian',
  'aegis',
  'nebula',
  'janus',
  'tabularium',
]);

/**
 * Common English stop words
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'with',
  'for',
  'from',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'as',
  'if',
  'then',
  'than',
  'so',
  'such',
  'only',
  'very',
  'just',
  'also',
  'more',
  'most',
  'other',
  'some',
  'any',
  'all',
  'both',
  'each',
  'few',
  'many',
  'several',
  'own',
  'same',
  'which',
  'who',
  'whom',
  'what',
  'when',
  'where',
  'why',
  'how',
  'not',
  'no',
  'over',
  'into',
  'under',
  'above',
  'below',
  'between',
  'through',
  'during',
  'part',
  'party',
  'third',
  '3rd',
  'ecosystem',
  'supports',
  'supporting',
  'integration',
  'integrations',
  'integrate',
]);

/**
 * All words to filter out when extracting smart keywords
 */
const ALL_FILTER_WORDS = new Set([...ACTION_WORDS, ...GENERIC_TECH_WORDS, ...PROJECT_WORDS, ...STOP_WORDS]);

// ============================================================================
// Keyword Extraction
// ============================================================================

/**
 * Extract smart keywords from text, filtering out common/generic words
 *
 * @param text - Input text (prompt, description, etc.)
 * @returns Array of keywords, prioritized by likely relevance
 */
export function extractSmartKeywords(text: string): string[] {
  // Extract all words
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !ALL_FILTER_WORDS.has(word) && !/^\d+$/.test(word));

  // Deduplicate
  const uniqueWords = [...new Set(words)];

  // Prioritize words that look like library/service names
  const prioritized = uniqueWords.sort((a, b) => {
    const aScore = scoreKeyword(a, text);
    const bScore = scoreKeyword(b, text);
    return bScore - aScore;
  });

  return prioritized;
}

/**
 * Score a keyword based on how likely it is to be a library/service name
 */
function scoreKeyword(keyword: string, originalText: string): number {
  let score = 0;

  // Proper nouns (capitalized in original) are likely names
  const capitalizedPattern = new RegExp(`\\b${keyword.charAt(0).toUpperCase()}${keyword.slice(1)}\\b`);
  if (capitalizedPattern.test(originalText)) {
    score += 50;
  }

  // Words with hyphens are likely package names
  if (keyword.includes('-')) {
    score += 30;
  }

  // Longer words are often more specific
  if (keyword.length >= 5) {
    score += 10;
  }
  if (keyword.length >= 8) {
    score += 10;
  }

  // Common library name patterns
  if (keyword.endsWith('js') || keyword.endsWith('ts')) {
    score += 20;
  }
  if (keyword.startsWith('@')) {
    score += 40;
  }

  // Known library/service name patterns
  if (isKnownServicePattern(keyword)) {
    score += 60;
  }

  return score;
}

/**
 * Check if a keyword matches known service/library patterns
 */
function isKnownServicePattern(keyword: string): boolean {
  const knownPatterns = [
    // Cloud services
    'aws',
    'azure',
    'gcp',
    'google',
    'firebase',
    'vercel',
    'netlify',
    'fastly',
    'cloudflare',
    'akamai',
    // Databases
    'postgres',
    'postgresql',
    'mysql',
    'mongodb',
    'redis',
    'dynamodb',
    'neo4j',
    // Third-party services
    'jira',
    'github',
    'gitlab',
    'bitbucket',
    'slack',
    'discord',
    'stripe',
    'twilio',
    'sendgrid',
    'okta',
    'auth0',
    'datadog',
    'sentry',
    'splunk',
    'pagerduty',
    'linear',
    'notion',
    'airtable',
    'salesforce',
    'hubspot',
    'zendesk',
    'intercom',
    'segment',
    'mixpanel',
    'amplitude',
    'plextrac',
    // Frontend
    'react',
    'vue',
    'angular',
    'svelte',
    'nextjs',
    'nuxt',
    'gatsby',
    'remix',
    'astro',
    'tanstack',
    'zustand',
    'redux',
    'mobx',
    'tailwind',
    'chakra',
    'material',
    'antd',
    // Backend
    'express',
    'fastify',
    'nest',
    'koa',
    'hapi',
    'django',
    'flask',
    'fastapi',
    'gin',
    'echo',
    'fiber',
    // Testing
    'jest',
    'vitest',
    'playwright',
    'cypress',
    'puppeteer',
    'selenium',
    // Other
    'docker',
    'kubernetes',
    'k8s',
    'terraform',
    'pulumi',
    'ansible',
    'jenkins',
    'circleci',
    'github-actions',
    'graphql',
    'grpc',
    'websocket',
    'kafka',
    'rabbitmq',
    'elasticsearch',
    'kibana',
    'prometheus',
    'grafana',
  ];

  return knownPatterns.includes(keyword);
}

// ============================================================================
// Suggestion Generation
// ============================================================================

/**
 * Generate search suggestions based on prompt
 *
 * Returns up to 4 suggestions:
 * 1. Best smart keyword
 * 2. Alternative variations
 * 3. Combined terms if relevant
 *
 * @param prompt - User's prompt
 * @returns Array of 1-4 suggestions
 */
export function generateSearchSuggestions(prompt: string): string[] {
  const keywords = extractSmartKeywords(prompt);

  if (keywords.length === 0) {
    return [];
  }

  const suggestions: string[] = [];

  // Add top keyword
  suggestions.push(keywords[0]);

  // Add second keyword if different enough
  if (keywords.length > 1 && keywords[1] !== keywords[0]) {
    suggestions.push(keywords[1]);
  }

  // Add combined term if we have two good keywords
  if (keywords.length >= 2) {
    const combined = `${keywords[0]} ${keywords[1]}`;
    if (!suggestions.includes(combined)) {
      suggestions.push(combined);
    }
  }

  // Add api-specific variant if it makes sense
  const apiVariant = `${keywords[0]}-api`;
  if (isKnownServicePattern(keywords[0]) && !suggestions.includes(apiVariant)) {
    suggestions.push(apiVariant);
  }

  return suggestions.slice(0, 4);
}

// ============================================================================
// Exports for backward compatibility
// ============================================================================

/**
 * Basic keyword extraction (for cases where smart filtering isn't needed)
 * This is a simpler version that just filters stop words
 */
export function extractBasicKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
}
