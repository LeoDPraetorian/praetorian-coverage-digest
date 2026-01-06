/**
 * Serena MCP Wrappers
 *
 * Semantic code analysis and editing tools via Language Server Protocol.
 *
 * Categories:
 * - Symbol Operations: find_symbol, get_symbols_overview, find_referencing_symbols,
 *   replace_symbol_body, insert_after_symbol, insert_before_symbol, rename_symbol
 * - Memory: write_memory, read_memory, list_memories, delete_memory, edit_memory
 * - File/Search: list_dir, find_file, search_for_pattern
 * - Config: activate_project, get_current_config
 * - Workflow: check_onboarding_performed, onboarding, initial_instructions,
 *   think_about_collected_information, think_about_task_adherence, think_about_whether_you_are_done
 */

// Symbol Operations
export { findSymbol } from './find-symbol.js';
export { getSymbolsOverview } from './get-symbols-overview.js';
export { findReferencingSymbols } from './find-referencing-symbols.js';
export { replaceSymbolBody } from './replace-symbol-body.js';
export { insertAfterSymbol } from './insert-after-symbol.js';
export { insertBeforeSymbol } from './insert-before-symbol.js';
export { renameSymbol } from './rename-symbol.js';

// Memory
export { writeMemory } from './write-memory.js';
export { readMemory } from './read-memory.js';
export { listMemories } from './list-memories.js';
export { deleteMemory } from './delete-memory.js';
export { editMemory } from './edit-memory.js';

// File/Search
export { listDir } from './list-dir.js';
export { findFile } from './find-file.js';
export { searchForPattern } from './search-for-pattern.js';

// Config
export { activateProject } from './activate-project.js';
export { getCurrentConfig } from './get-current-config.js';

// Workflow
export { checkOnboardingPerformed } from './check-onboarding-performed.js';
export { onboarding } from './onboarding.js';
export { initialInstructions } from './initial-instructions.js';
export { thinkAboutCollectedInformation } from './think-about-collected-information.js';
export { thinkAboutTaskAdherence } from './think-about-task-adherence.js';
export { thinkAboutWhetherYouAreDone } from './think-about-whether-you-are-done.js';

/**
 * All Serena wrappers as a map for dynamic access
 */
export const serenaTools = {
  // Symbol Operations
  findSymbol: () => import('./find-symbol.js').then(m => m.findSymbol),
  getSymbolsOverview: () => import('./get-symbols-overview.js').then(m => m.getSymbolsOverview),
  findReferencingSymbols: () => import('./find-referencing-symbols.js').then(m => m.findReferencingSymbols),
  replaceSymbolBody: () => import('./replace-symbol-body.js').then(m => m.replaceSymbolBody),
  insertAfterSymbol: () => import('./insert-after-symbol.js').then(m => m.insertAfterSymbol),
  insertBeforeSymbol: () => import('./insert-before-symbol.js').then(m => m.insertBeforeSymbol),
  renameSymbol: () => import('./rename-symbol.js').then(m => m.renameSymbol),
  // Memory
  writeMemory: () => import('./write-memory.js').then(m => m.writeMemory),
  readMemory: () => import('./read-memory.js').then(m => m.readMemory),
  listMemories: () => import('./list-memories.js').then(m => m.listMemories),
  deleteMemory: () => import('./delete-memory.js').then(m => m.deleteMemory),
  editMemory: () => import('./edit-memory.js').then(m => m.editMemory),
  // File/Search
  listDir: () => import('./list-dir.js').then(m => m.listDir),
  findFile: () => import('./find-file.js').then(m => m.findFile),
  searchForPattern: () => import('./search-for-pattern.js').then(m => m.searchForPattern),
  // Config
  activateProject: () => import('./activate-project.js').then(m => m.activateProject),
  getCurrentConfig: () => import('./get-current-config.js').then(m => m.getCurrentConfig),
  // Workflow
  checkOnboardingPerformed: () => import('./check-onboarding-performed.js').then(m => m.checkOnboardingPerformed),
  onboarding: () => import('./onboarding.js').then(m => m.onboarding),
  initialInstructions: () => import('./initial-instructions.js').then(m => m.initialInstructions),
  thinkAboutCollectedInformation: () => import('./think-about-collected-information.js').then(m => m.thinkAboutCollectedInformation),
  thinkAboutTaskAdherence: () => import('./think-about-task-adherence.js').then(m => m.thinkAboutTaskAdherence),
  thinkAboutWhetherYouAreDone: () => import('./think-about-whether-you-are-done.js').then(m => m.thinkAboutWhetherYouAreDone),
};
