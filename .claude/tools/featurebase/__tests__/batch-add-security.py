#!/usr/bin/env python3
"""
Batch add @claude/testing security scenarios to test files
"""

import re
from pathlib import Path

# Test files still needing security tests
TEST_FILES = [
    "create-comment.unit.test.ts",
    "create-custom-field.unit.test.ts",
    "delete-comment.unit.test.ts",
    "delete-user.unit.test.ts",
    "identify-user.unit.test.ts",
    "list-articles.unit.test.ts",
    "list-changelog.unit.test.ts",
    "list-comments.unit.test.ts",
    "list-custom-fields.unit.test.ts",
    "list-posts.unit.test.ts",
    "list-users.unit.test.ts",
    "update-changelog.unit.test.ts",
    "update-comment.unit.test.ts",
]

IMPORT_ADDITION = """import {
  CommandInjectionScenarios,
  PathTraversalScenarios,
} from '@claude/testing';"""

SECURITY_TESTS_TEMPLATE = """
  describe('Security Validation - Path Traversal', () => {
    PathTraversalScenarios.forEach(scenario => {
      it(`should block: ${{scenario.description}}`, async () => {
        // Test with first string parameter
        await expect(
          {wrapper_call}
        ).rejects.toThrow(/traversal|invalid|not allowed|Control characters/i);
      });
    });
  });

  describe('Security Validation - Command Injection', () => {
    CommandInjectionScenarios.forEach(scenario => {
      it(`should block: ${{scenario.description}}`, async () => {
        // Test with first string parameter
        await expect(
          {wrapper_call}
        ).rejects.toThrow(/invalid|characters|not allowed|Control characters/i);
      });
    });
  });
"""

def add_security_tests(filepath: Path):
    """Add @claude/testing imports and security tests to a test file"""
    content = filepath.read_text()

    # Skip if already has @claude/testing
    if '@claude/testing' in content:
        print(f"  ✓ Already has @claude/testing")
        return False

    # Find the last import statement
    last_import_match = None
    for match in re.finditer(r"^import .* from .*?;$", content, re.MULTILINE):
        last_import_match = match

    if not last_import_match:
        print(f"  ✗ Could not find import statements")
        return False

    # Insert @claude/testing import after last import
    insert_pos = last_import_match.end()
    new_content = (
        content[:insert_pos] +
        "\n" + IMPORT_ADDITION +
        content[insert_pos:]
    )

    # Find the closing of the main describe block (last "});" in file)
    # Insert security tests before it
    last_closing = new_content.rfind("});")
    if last_closing == -1:
        print(f"  ✗ Could not find closing describe block")
        return False

    # Determine wrapper name and typical call pattern from file
    wrapper_name = filepath.stem.replace('.unit.test', '')
    wrapper_var = wrapper_name.replace('-', '_')  # e.g., create_comment

    # Create security test block (generic pattern)
    security_tests = f"""
  describe('Security Validation - Path Traversal', () => {{
    PathTraversalScenarios.forEach(scenario => {{
      it(`should block: ${{scenario.description}}`, async () => {{
        await expect(
          {wrapper_var}.execute({{ /* add params with scenario.input */ }}, testClient)
        ).rejects.toThrow(/traversal|invalid|not allowed|Control characters/i);
      }});
    }});
  }});

  describe('Security Validation - Command Injection', () => {{
    CommandInjectionScenarios.forEach(scenario => {{
      it(`should block: ${{scenario.description}}`, async () => {{
        await expect(
          {wrapper_var}.execute({{ /* add params with scenario.input */ }}, testClient)
        ).rejects.toThrow(/invalid|characters|not allowed|Control characters/i);
      }});
    }});
  }});
"""

    # Insert before the final closing
    final_content = (
        new_content[:last_closing] +
        security_tests +
        new_content[last_closing:]
    )

    filepath.write_text(final_content)
    print(f"  ✓ Added @claude/testing imports and security tests")
    return True

def main():
    test_dir = Path(__file__).parent

    print("Batch adding @claude/testing security scenarios\n")

    updated_count = 0
    for test_file in TEST_FILES:
        filepath = test_dir / test_file
        print(f"Processing {test_file}...")

        if not filepath.exists():
            print(f"  ✗ File not found")
            continue

        if add_security_tests(filepath):
            updated_count += 1

    print(f"\nCompleted: {updated_count}/{len(TEST_FILES)} files updated")
    print("\nNOTE: Security test implementations need manual review for correct parameter mapping.")

if __name__ == "__main__":
    main()
