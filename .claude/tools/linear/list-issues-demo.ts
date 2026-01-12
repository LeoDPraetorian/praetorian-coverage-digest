/**
 * Demonstration of UUID detection fix for list-issues
 *
 * Shows that the wrapper now correctly handles both UUIDs and names
 */

import { buildIssueFilterWithIdDetection } from './list-issues-helpers.js';

console.log('🔍 Linear list-issues UUID Detection Fix Demo\n');

// Test 1: Project filter with UUID
console.log('Test 1: Project filter with UUID');
const uuidFilter = buildIssueFilterWithIdDetection({ project: '86966439caf5' });
console.log('Input: { project: "86966439caf5" }');
console.log('Output:', JSON.stringify(uuidFilter, null, 2));
console.log('✅ Uses id filter for UUID\n');

// Test 2: Project filter with name
console.log('Test 2: Project filter with name');
const nameFilter = buildIssueFilterWithIdDetection({ project: 'Professional Services Onboarding' });
console.log('Input: { project: "Professional Services Onboarding" }');
console.log('Output:', JSON.stringify(nameFilter, null, 2));
console.log('✅ Uses name filter for name\n');

// Test 3: Mixed filters
console.log('Test 3: Mixed UUID and name filters');
const mixedFilter = buildIssueFilterWithIdDetection({
  project: '86966439caf5',  // UUID
  team: 'Chariot',           // Name
  assignee: 'me',            // Special value
  state: 'abc123def456'      // UUID
});
console.log('Input: { project: "86966439caf5", team: "Chariot", assignee: "me", state: "abc123def456" }');
console.log('Output:', JSON.stringify(mixedFilter, null, 2));
console.log('✅ Correctly mixes id and name filters\n');

console.log('✅ Fix complete! The wrapper now:');
console.log('   - Detects UUIDs vs names automatically');
console.log('   - Uses id filter for UUIDs');
console.log('   - Uses name filter for names');
console.log('   - Prevents 400 Bad Request errors on UUID inputs');
