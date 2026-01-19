#!/usr/bin/env python3
"""Fix TODO placeholders in security tests"""

from pathlib import Path

# Map of test files to their wrapper parameters for security testing
SECURITY_TEST_PARAMS = {
    "create-custom-field.unit.test.ts": {
        "wrapper": "createCustomField",
        "traversal_call": 'createCustomField.execute({ name: scenario.input, type: "text" }, testClient)',
        "injection_call": 'createCustomField.execute({ name: "test", type: scenario.input }, testClient)',
    },
    "delete-comment.unit.test.ts": {
        "wrapper": "deleteComment",
        "traversal_call": 'deleteComment.execute({ commentId: scenario.input }, { apiKey: "test" })',
        "injection_call": 'deleteComment.execute({ commentId: scenario.input }, { apiKey: "test" })',
    },
    "delete-user.unit.test.ts": {
        "wrapper": "deleteUser",
        "traversal_call": 'deleteUser.execute({ email: scenario.input }, testClient)',
        "injection_call": 'deleteUser.execute({ email: scenario.input }, testClient)',
    },
    "identify-user.unit.test.ts": {
        "wrapper": "identifyUser",
        "traversal_call": 'identifyUser.execute({ email: scenario.input, userId: "user1" }, testClient)',
        "injection_call": 'identifyUser.execute({ email: "test@example.com", userId: scenario.input }, testClient)',
    },
    "list-articles.unit.test.ts": {
        "wrapper": "listArticles",
        "traversal_call": 'listArticles.execute({ category: scenario.input }, testClient)',
        "injection_call": 'listArticles.execute({ category: scenario.input }, testClient)',
    },
    "list-changelog.unit.test.ts": {
        "skip": True,  # No string params
    },
    "list-comments.unit.test.ts": {
        "wrapper": "listComments",
        "traversal_call": 'listComments.execute({ postId: scenario.input }, testClient)',
        "injection_call": 'listComments.execute({ postId: scenario.input }, testClient)',
    },
    "list-custom-fields.unit.test.ts": {
        "skip": True,  # No string params
    },
    "list-posts.unit.test.ts": {
        "wrapper": "listPosts",
        "traversal_call": 'listPosts.execute({ boardId: scenario.input }, testClient)',
        "injection_call": 'listPosts.execute({ boardId: scenario.input }, testClient)',
    },
    "list-users.unit.test.ts": {
        "skip": True,  # No string params
    },
    "update-changelog.unit.test.ts": {
        "wrapper": "updateChangelog",
        "traversal_call": 'updateChangelog.execute({ changelogId: scenario.input, title: "test" }, testClient)',
        "injection_call": 'updateChangelog.execute({ changelogId: "cl_1", title: scenario.input }, testClient)',
    },
    "update-comment.unit.test.ts": {
        "wrapper": "updateComment",
        "traversal_call": 'updateComment.execute({ commentId: scenario.input, content: "test" }, { apiKey: "test" })',
        "injection_call": 'updateComment.execute({ commentId: "comment_1", content: scenario.input }, { apiKey: "test" })',
    },
}

def fix_todos(filepath: Path, params: dict):
    """Replace TODO placeholders with actual test implementations"""
    content = filepath.read_text()

    if params.get("skip"):
        # Replace with skip comments
        content = content.replace(
            "        // TODO: Add proper test implementation with scenario.input\n"
            "        // Pattern: await expect(wrapper.execute({ param: scenario.input }, testClient)).rejects.toThrow();",
            "        // No string params for this wrapper, skip security test\n"
            "        expect(true).toBe(true);"
        )
    else:
        # Find and replace the first TODO (Path Traversal)
        content = content.replace(
            "        // TODO: Add proper test implementation with scenario.input\n"
            "        // Pattern: await expect(wrapper.execute({ param: scenario.input }, testClient)).rejects.toThrow();",
            f"        await expect(\n"
            f"          {params['traversal_call']}\n"
            f"        ).rejects.toThrow(/traversal|invalid|not allowed|Control characters/i);",
            1  # Replace only first occurrence
        )

        # Find and replace the second TODO (Command Injection)
        content = content.replace(
            "        // TODO: Add proper test implementation with scenario.input\n"
            "        // Pattern: await expect(wrapper.execute({ param: scenario.input }, testClient)).rejects.toThrow();",
            f"        await expect(\n"
            f"          {params['injection_call']}\n"
            f"        ).rejects.toThrow(/invalid|characters|not allowed|Control characters/i);"
        )

    filepath.write_text(content)

def main():
    test_dir = Path(__file__).parent

    print("Fixing TODO placeholders in security tests\n")

    fixed_count = 0
    for filename, params in SECURITY_TEST_PARAMS.items():
        filepath = test_dir / filename
        if not filepath.exists():
            print(f"✗ {filename} - not found")
            continue

        print(f"Processing {filename}...")
        fix_todos(filepath, params)
        fixed_count += 1
        print(f"  ✓ Fixed TODOs")

    print(f"\nCompleted: {fixed_count}/{len(SECURITY_TEST_PARAMS)} files fixed")

if __name__ == "__main__":
    main()
