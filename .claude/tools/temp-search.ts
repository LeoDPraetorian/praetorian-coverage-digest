import { findSymbol } from './serena/find-symbol.js';

(async () => {
  try {
    const result = await findSymbol.execute({
      name_path_pattern: 'validateCredentials',
      relative_path: 'backend',
      substring_matching: true,
      include_body: true,
      depth: 0,
      include_kinds: [],
      exclude_kinds: [],
      max_answer_chars: -1,
      semanticContext: 'Find validateCredentials function in chariot backend module'
    });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
