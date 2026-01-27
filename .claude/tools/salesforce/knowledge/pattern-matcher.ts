/**
 * Pattern Matcher - Fuzzy Matching for Natural Language Queries
 *
 * Provides text normalization, tokenization, and similarity scoring
 * for matching user queries against cached patterns.
 *
 * Security Considerations (from security-lead-review.md):
 * - DOS-01: Long input strings must process within 100ms
 * - DOS-02: Matching against 1000 patterns must complete in <500ms
 * - DOS-03: Pathological Levenshtein cases need early termination
 *
 * @see Architecture: /.claude/.output/mcp-wrappers/2026-01-16-165022-salesforce-knowledge-layer/tool-lead-architecture.md
 */

/**
 * Stop words to filter out during tokenization
 * These common words don't contribute to query meaning
 */
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
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
  'must',
  'shall',
  'can',
  'need',
  'show',
  'me',
  'my',
  'get',
  'find',
  'list',
  'give',
  'display',
  'what',
  'which',
  'where',
  'when',
  'who',
  'how',
  'all',
  'some',
  'any',
  'for',
  'of',
  'to',
  'in',
  'on',
  'at',
  'by',
  'with',
  'from',
  'as',
  'into',
  'about',
  'and',
  'or',
  'but',
  'if',
  'then',
  'else',
  'than',
  'so',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'only',
  'just',
  'please',
]);

/**
 * Meaningful short terms to preserve (business/fiscal terms)
 */
const MEANINGFUL_SHORT_TERMS = new Set([
  'q1',
  'q2',
  'q3',
  'q4',
  'fy',
  'ps',
  'cs',
  'mr',
  'ar',
  'id',
]);

/**
 * Normalizes a query string for consistent matching
 *
 * - Converts to lowercase
 * - Removes punctuation and special characters
 * - Collapses multiple spaces to single space
 * - Trims leading/trailing whitespace
 * - Handles unicode by converting to ASCII equivalent or removing
 *
 * @param query - Raw query string
 * @returns Normalized lowercase string
 */
export function normalizeQuery(query: string): string {
  // Handle null/undefined gracefully
  if (query === null || query === undefined) {
    return '';
  }

  // Convert to string if needed
  let normalized = String(query);

  // Convert to lowercase
  normalized = normalized.toLowerCase();

  // Normalize unicode to ASCII (NFD decomposition + remove diacritics)
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters

  // Replace newlines and tabs with spaces
  normalized = normalized.replace(/[\n\t\r]/g, ' ');

  // Remove punctuation and special characters (keep alphanumeric and spaces)
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');

  // Collapse multiple spaces to single space
  normalized = normalized.replace(/\s+/g, ' ');

  // Trim leading and trailing whitespace
  normalized = normalized.trim();

  return normalized;
}

/**
 * Tokenizes a normalized query string into meaningful words
 *
 * - Splits on whitespace
 * - Filters out stop words
 * - Filters out short terms (< 2 chars) except meaningful business terms
 * - Returns unique tokens
 *
 * @param normalizedQuery - Normalized query string (from normalizeQuery)
 * @returns Array of meaningful tokens
 */
export function tokenize(normalizedQuery: string): string[] {
  if (!normalizedQuery) {
    return [];
  }

  const words = normalizedQuery.split(' ');
  const tokens: string[] = [];
  const seen = new Set<string>();

  for (const word of words) {
    // Skip empty strings
    if (!word) {
      continue;
    }

    // Skip stop words
    if (STOP_WORDS.has(word)) {
      continue;
    }

    // Skip short terms unless they're meaningful business terms
    if (word.length < 2 && !MEANINGFUL_SHORT_TERMS.has(word)) {
      continue;
    }

    // Skip if already seen (deduplication)
    if (seen.has(word)) {
      continue;
    }

    seen.add(word);
    tokens.push(word);
  }

  return tokens;
}

/**
 * Calculates Levenshtein distance between two strings
 *
 * Uses optimized algorithm with:
 * - O(min(m,n)) space complexity (single row)
 * - Early termination when distance exceeds maxDistance
 *
 * @param s1 - First string
 * @param s2 - Second string
 * @param maxDistance - Maximum distance to compute (for early termination)
 * @returns Edit distance between strings
 */
export function levenshteinDistance(
  s1: string,
  s2: string,
  maxDistance: number = Infinity
): number {
  // Handle empty strings
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  // Ensure s1 is the shorter string for memory optimization
  if (s1.length > s2.length) {
    [s1, s2] = [s2, s1];
  }

  const m = s1.length;
  const n = s2.length;

  // Early termination: if length difference exceeds maxDistance
  if (n - m > maxDistance) {
    return n - m;
  }

  // Use single row for O(min(m,n)) space
  let previousRow = new Array(m + 1);
  let currentRow = new Array(m + 1);

  // Initialize first row
  for (let j = 0; j <= m; j++) {
    previousRow[j] = j;
  }

  for (let i = 1; i <= n; i++) {
    currentRow[0] = i;
    let minInRow = i;

    for (let j = 1; j <= m; j++) {
      const cost = s1[j - 1] === s2[i - 1] ? 0 : 1;

      currentRow[j] = Math.min(
        currentRow[j - 1] + 1, // Insertion
        previousRow[j] + 1, // Deletion
        previousRow[j - 1] + cost // Substitution
      );

      minInRow = Math.min(minInRow, currentRow[j]);
    }

    // Early termination: if minimum in row exceeds maxDistance
    if (minInRow > maxDistance) {
      return minInRow;
    }

    // Swap rows
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  return previousRow[m];
}

/**
 * Checks if shorter string is a subsequence of longer string
 * (characters appear in order, not necessarily contiguous)
 *
 * @param shorter - Shorter string (subsequence candidate)
 * @param longer - Longer string to check in
 * @returns True if shorter is a subsequence of longer
 */
function isSubsequence(shorter: string, longer: string): boolean {
  let shorterIdx = 0;
  for (let i = 0; i < longer.length && shorterIdx < shorter.length; i++) {
    if (longer[i] === shorter[shorterIdx]) {
      shorterIdx++;
    }
  }
  return shorterIdx === shorter.length;
}

/**
 * Determines if two strings match within a fuzzy threshold
 *
 * Match criteria (in order):
 * 1. Exact match (case-insensitive)
 * 2. Substring match (one contains the other)
 * 3. Subsequence match (for short strings, chars appear in order)
 * 4. Levenshtein distance within threshold
 *
 * Threshold interpretation:
 * - If threshold > 1: absolute max edit distance
 * - If threshold <= 1: percentage of shorter string length
 * - Default: 30% of shorter string length
 *
 * @param target - Target string to match against
 * @param candidate - Candidate string to check
 * @param threshold - Optional threshold (absolute if >1, percentage if <=1)
 * @returns True if strings match within threshold
 */
export function fuzzyMatch(
  target: string,
  candidate: string,
  threshold?: number
): boolean {
  // Handle empty strings
  if (!target && !candidate) return true;
  if (!target || !candidate) return false;

  // Normalize both strings for comparison
  const normalizedTarget = target.toLowerCase();
  const normalizedCandidate = candidate.toLowerCase();

  // Exact match
  if (normalizedTarget === normalizedCandidate) {
    return true;
  }

  // Substring match (one contains the other)
  if (
    normalizedTarget.includes(normalizedCandidate) ||
    normalizedCandidate.includes(normalizedTarget)
  ) {
    return true;
  }

  // For short strings (<=4 chars), also try subsequence matching
  // This allows "ps" to match "professional services"
  const shorter = normalizedTarget.length <= normalizedCandidate.length
    ? normalizedTarget
    : normalizedCandidate;
  const longer = normalizedTarget.length > normalizedCandidate.length
    ? normalizedTarget
    : normalizedCandidate;

  if (shorter.length <= 4 && shorter.length >= 2) {
    // Check if all chars of shorter appear in order in longer (word boundaries)
    // Only match if short string is alphabetic (not alphanumeric like "q1")
    if (/^[a-z]+$/.test(shorter) && isSubsequence(shorter, longer)) {
      return true;
    }
  }

  // Calculate max distance
  const shorterLength = Math.min(normalizedTarget.length, normalizedCandidate.length);
  let maxDistance: number;

  if (threshold === undefined) {
    // Default: 35% of shorter string length (allows 2 char diff for 6+ char words)
    maxDistance = Math.floor(shorterLength * 0.35);
  } else if (threshold > 1) {
    // Absolute distance (e.g., threshold=10 means max 10 edits)
    maxDistance = Math.floor(threshold);
  } else {
    // Percentage (e.g., threshold=0.3 means 30% of shorter length)
    maxDistance = Math.floor(shorterLength * threshold);
  }

  // If threshold is 0, only exact matches count (already checked above)
  if (maxDistance === 0) {
    return false;
  }

  // Levenshtein distance check with early termination
  const distance = levenshteinDistance(normalizedTarget, normalizedCandidate, maxDistance);

  return distance <= maxDistance;
}

/**
 * Calculates similarity score between two query strings
 *
 * Scoring factors:
 * - Token overlap (Jaccard similarity)
 * - Fuzzy token matching (for typos)
 * - Token order consideration
 *
 * @param query1 - First query string
 * @param query2 - Second query string
 * @returns Similarity score between 0.0 and 1.0
 */
export function scoreSimilarity(query1: string, query2: string): number {
  // Normalize and tokenize both queries
  const normalized1 = normalizeQuery(query1);
  const normalized2 = normalizeQuery(query2);

  const tokens1 = tokenize(normalized1);
  const tokens2 = tokenize(normalized2);

  // Handle edge cases
  if (tokens1.length === 0 && tokens2.length === 0) {
    return 0; // No tokens = no meaningful comparison
  }
  if (tokens1.length === 0 || tokens2.length === 0) {
    return 0; // One has no tokens
  }

  // Exact normalized match
  if (normalized1 === normalized2) {
    return 1.0;
  }

  // Calculate fuzzy token matches
  let matchedCount = 0;
  let orderBonus = 0;
  const matched2 = new Set<number>();

  for (let i = 0; i < tokens1.length; i++) {
    const token1 = tokens1[i];

    for (let j = 0; j < tokens2.length; j++) {
      if (matched2.has(j)) continue;

      const token2 = tokens2[j];

      if (fuzzyMatch(token1, token2)) {
        matchedCount++;
        matched2.add(j);

        // Smaller bonus for matching position (order consideration)
        if (i === j) {
          orderBonus += 0.05;
        }
        break;
      }
    }
  }

  // Calculate base score using Jaccard-style similarity
  const unionSize = tokens1.length + tokens2.length - matchedCount;
  const baseScore = matchedCount / unionSize;

  // Add order bonus (capped)
  const finalScore = Math.min(1.0, baseScore + orderBonus);

  return finalScore;
}

/**
 * Finds best matching patterns from a list based on query similarity
 *
 * @param query - User's natural language query
 * @param patterns - Array of patterns to match against
 * @param threshold - Minimum similarity score to consider a match (default: 0.6)
 * @returns Array of matching patterns sorted by score (descending)
 */
export function findBestMatches<T extends { normalizedQuery: string; confidence: number; useCount: number }>(
  query: string,
  patterns: T[],
  threshold: number = 0.6
): Array<{ pattern: T; score: number }> {
  const normalizedQuery = normalizeQuery(query);
  const results: Array<{ pattern: T; score: number }> = [];

  for (const pattern of patterns) {
    const similarity = scoreSimilarity(normalizedQuery, pattern.normalizedQuery);

    if (similarity >= threshold) {
      // Composite score: similarity * confidence * log10(useCount + 1)
      const useCountFactor = Math.log10(pattern.useCount + 1);
      const compositeScore = similarity * pattern.confidence * useCountFactor;

      results.push({
        pattern,
        score: compositeScore,
      });
    }
  }

  // Sort by composite score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}
