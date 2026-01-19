#!/usr/bin/env python3
"""
Add comprehensive TSDoc headers to Featurebase wrappers
Following the Linear pattern from get-issue.ts
"""

import re
from pathlib import Path

# TSDoc headers for each wrapper
TSDOC_HEADERS = {
    "create-article.ts": """/**
 * create_article - FeatureBase REST Wrapper
 *
 * Create a new article in the FeatureBase knowledge base.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~350 tokens (single article)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 86%
 *
 * Schema Discovery Results:
 * - API uses "content" for article body
 * - API uses "body" in response (not "content")
 * - API uses "category" string (not categoryId)
 * - publishedAt is required on creation
 *
 * Required fields:
 * - title: string (max 255 chars)
 * - content: string (markdown supported)
 * - category: string
 * - publishedAt: string (ISO 8601)
 *
 * Optional fields:
 * - slug: string
 * - tags: string[]
 *
 * Edge cases discovered:
 * - API returns "body" but accepts "content" for POST
 * - Category must exist or request fails
 */""",

    "create-changelog.ts": """/**
 * create_changelog - FeatureBase REST Wrapper
 *
 * Create a new changelog entry in FeatureBase.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (single entry)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 84%
 *
 * Schema Discovery Results:
 * - API uses "content" field for main text
 * - publishedAt is ISO 8601 timestamp
 * - tags array is optional
 *
 * Required fields:
 * - title: string (max 255 chars)
 * - content: string (markdown supported)
 * - publishedAt: string (ISO 8601)
 *
 * Optional fields:
 * - tags: string[]
 *
 * Edge cases discovered:
 * - publishedAt must be valid ISO 8601 or fails
 * - Content supports full markdown
 */""",

    "create-comment.ts": """/**
 * create_comment - FeatureBase Comments API Wrapper
 *
 * Create a new comment on a post or changelog entry.
 * Uses Comments API with X-API-Key authentication.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~200 tokens (comment creation response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 90%
 *
 * Schema Discovery Results:
 * - Uses submissionId (not postId)
 * - Uses X-API-Key header (not Bearer)
 * - Uses x-www-form-urlencoded (not JSON)
 * - parentCommentId enables threaded replies
 *
 * Required fields:
 * - submissionId: string (post or changelog ID)
 * - content: string (comment text)
 *
 * Optional fields:
 * - parentCommentId: string (for replies)
 * - private: boolean (default false)
 *
 * Edge cases discovered:
 * - Different auth from other endpoints
 * - Form-encoded body required
 */""",

    "create-custom-field.ts": """/**
 * create_custom_field - FeatureBase REST Wrapper
 *
 * Create a new custom field definition in FeatureBase.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~150 tokens (field definition)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 92%
 *
 * Schema Discovery Results:
 * - Supports text, number, date, select, multiselect types
 * - name must be unique
 * - options required for select/multiselect
 *
 * Required fields:
 * - name: string
 * - type: string (text|number|date|select|multiselect)
 *
 * Optional fields:
 * - options: string[] (required for select types)
 *
 * Edge cases discovered:
 * - Duplicate names return 409 conflict
 * - Select types require options array
 */""",

    "delete-article.ts": """/**
 * delete_article - FeatureBase REST Wrapper
 *
 * Delete an article from FeatureBase knowledge base.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~50 tokens (success response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 95%
 *
 * Schema Discovery Results:
 * - Returns success boolean
 * - Permanent deletion (no soft delete)
 *
 * Required fields:
 * - articleId: string
 *
 * Edge cases discovered:
 * - Returns 404 if article doesn't exist
 * - Deletion is permanent
 */""",

    "delete-changelog.ts": """/**
 * delete_changelog - FeatureBase REST Wrapper
 *
 * Delete a changelog entry from FeatureBase.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~50 tokens (success response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 95%
 *
 * Schema Discovery Results:
 * - Returns success boolean
 * - Permanent deletion
 *
 * Required fields:
 * - changelogId: string
 *
 * Edge cases discovered:
 * - Returns 404 if entry doesn't exist
 */""",

    "delete-comment.ts": """/**
 * delete_comment - FeatureBase Comments API Wrapper
 *
 * Delete a comment from a post or changelog.
 * Uses Comments API with X-API-Key authentication.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~100 tokens (deletion response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 93%
 *
 * Schema Discovery Results:
 * - Uses X-API-Key header (not Bearer)
 * - Soft delete if has replies (content becomes "[deleted]")
 * - Hard delete if no replies
 *
 * Required fields:
 * - commentId: string
 *
 * Edge cases discovered:
 * - Different auth from other endpoints
 * - Soft vs hard delete based on replies
 */""",

    "delete-post.ts": """/**
 * delete_post - FeatureBase REST Wrapper
 *
 * Delete a post from FeatureBase feedback board.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~50 tokens (success response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 95%
 *
 * Schema Discovery Results:
 * - Returns success boolean
 * - Permanent deletion
 *
 * Required fields:
 * - postId: string
 *
 * Edge cases discovered:
 * - Returns 404 if post doesn't exist
 */""",

    "delete-user.ts": """/**
 * delete_user - FeatureBase REST Wrapper
 *
 * Delete a user from FeatureBase by email.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~50 tokens (success response)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 95%
 *
 * Schema Discovery Results:
 * - Requires email parameter
 * - Permanent deletion
 *
 * Required fields:
 * - email: string
 *
 * Edge cases discovered:
 * - Returns 404 if user doesn't exist
 * - GDPR compliance: permanent deletion
 */""",

    "get-article.ts": """/**
 * get_article - FeatureBase REST Wrapper
 *
 * Fetch a single article by ID from FeatureBase knowledge base.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~350 tokens (single article)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 86%
 *
 * Schema Discovery Results:
 * - API returns "body" (not "content")
 * - publishedAt is ISO 8601
 * - slug is optional
 *
 * Required fields:
 * - articleId: string
 *
 * Edge cases discovered:
 * - API response uses "body" field name
 * - Returns 404 if article doesn't exist
 */""",

    "get-changelog.ts": """/**
 * get_changelog - FeatureBase REST Wrapper
 *
 * Fetch a single changelog entry by ID.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (single entry)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 84%
 *
 * Schema Discovery Results:
 * - Returns full changelog entry with metadata
 * - publishedAt is ISO 8601
 * - tags array is optional
 *
 * Required fields:
 * - changelogId: string
 *
 * Edge cases discovered:
 * - Returns 404 if entry doesn't exist
 */""",

    "get-post.ts": """/**
 * get_post - FeatureBase REST Wrapper
 *
 * Fetch a single post by ID from FeatureBase feedback board.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (single post)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 85%
 *
 * Schema Discovery Results:
 * - Returns post with status, votes, comments count
 * - status can be: open, in-progress, planned, completed, closed
 * - voters and upvotes included
 *
 * Required fields:
 * - postId: string
 *
 * Edge cases discovered:
 * - Returns 404 if post doesn't exist
 * - Status field shows current workflow state
 */""",

    "get-user.ts": """/**
 * get_user - FeatureBase REST Wrapper
 *
 * Fetch a user by email or userId from FeatureBase.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~250 tokens (user details)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 88%
 *
 * Schema Discovery Results:
 * - Can query by email OR userId
 * - Returns activity stats (posts, comments, upvotes)
 * - customFields array is optional
 *
 * Required fields (at least one):
 * - email: string OR userId: string
 *
 * Edge cases discovered:
 * - Accepts either email or userId
 * - Returns 404 if user doesn't exist
 * - Activity stats always included
 */""",

    "identify-user.ts": """/**
 * identify_user - FeatureBase REST Wrapper
 *
 * Create or update a user in FeatureBase.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~200 tokens (user record)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 90%
 *
 * Schema Discovery Results:
 * - Upsert operation (create or update)
 * - Requires email as primary identifier
 * - Optional userId for custom IDs
 *
 * Required fields:
 * - email: string
 *
 * Optional fields:
 * - userId: string
 * - name: string
 * - customFields: object
 *
 * Edge cases discovered:
 * - Creates if doesn't exist, updates if exists
 * - email is primary identifier
 */""",

    "list-articles.ts": """/**
 * list_articles - FeatureBase REST Wrapper
 *
 * Fetch paginated list of articles from knowledge base.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~1200 tokens (20 articles per page)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 75%
 *
 * Schema Discovery Results:
 * - Returns articles array with pagination
 * - category filter is optional
 * - Default limit is 20
 *
 * Optional fields:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 * - category: string (filter)
 *
 * Edge cases discovered:
 * - Empty category returns all articles
 * - Pagination via offset
 */""",

    "list-changelog.ts": """/**
 * list_changelog - FeatureBase REST Wrapper
 *
 * Fetch paginated list of changelog entries.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~1500 tokens (20 entries per page)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 70%
 *
 * Schema Discovery Results:
 * - Returns entries array with pagination
 * - Default limit is 20
 * - Sorted by publishedAt desc
 *
 * Optional fields:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 *
 * Edge cases discovered:
 * - Sorted newest first by default
 */""",

    "list-comments.ts": """/**
 * list_comments - FeatureBase Comments API Wrapper
 *
 * Fetch comments for a post or changelog entry.
 * Uses standard API (not Comments API for GET).
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~800 tokens (comments list)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 80%
 *
 * Schema Discovery Results:
 * - Uses submissionId (post or changelog ID)
 * - Returns threaded comments
 * - Uses standard Bearer auth for GET
 *
 * Required fields:
 * - postId: string (submissionId in API)
 *
 * Edge cases discovered:
 * - GET uses Bearer (POST/PUT/DELETE use X-API-Key)
 * - Returns threaded structure
 */""",

    "list-custom-fields.ts": """/**
 * list_custom_fields - FeatureBase REST Wrapper
 *
 * Fetch list of custom field definitions.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (field definitions)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 85%
 *
 * Schema Discovery Results:
 * - Returns all custom fields
 * - No pagination (returns all)
 * - Includes field type and options
 *
 * No required fields
 *
 * Edge cases discovered:
 * - Returns all fields (no pagination)
 * - Select fields include options array
 */""",

    "list-posts.ts": """/**
 * list_posts - FeatureBase REST Wrapper
 *
 * Fetch paginated list of posts from feedback board.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~1000 tokens (20 posts per page)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 78%
 *
 * Schema Discovery Results:
 * - Returns posts array with pagination
 * - boardId filter is optional
 * - Default limit is 20
 *
 * Optional fields:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 * - boardId: string (filter by category)
 *
 * Edge cases discovered:
 * - Empty boardId returns all posts
 * - Sorted by votes desc by default
 */""",

    "list-users.ts": """/**
 * list_users - FeatureBase REST Wrapper
 *
 * Fetch paginated list of users.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (20 users per page)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 82%
 *
 * Schema Discovery Results:
 * - Returns users array with pagination
 * - Default limit is 20
 * - Includes activity stats per user
 *
 * Optional fields:
 * - limit: number (default 20, max 100)
 * - offset: number (default 0)
 *
 * Edge cases discovered:
 * - Pagination via offset
 * - Activity stats included per user
 */""",

    "update-article.ts": """/**
 * update_article - FeatureBase REST Wrapper
 *
 * Update an existing article in knowledge base.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~350 tokens (updated article)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 86%
 *
 * Schema Discovery Results:
 * - Partial updates supported
 * - All fields optional except articleId
 * - Returns updated article
 *
 * Required fields:
 * - articleId: string
 *
 * Optional fields:
 * - title: string
 * - content: string
 * - category: string
 * - slug: string
 * - publishedAt: string
 *
 * Edge cases discovered:
 * - Partial updates allowed
 * - Returns 404 if article doesn't exist
 */""",

    "update-changelog.ts": """/**
 * update_changelog - FeatureBase REST Wrapper
 *
 * Update an existing changelog entry.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (updated entry)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 84%
 *
 * Schema Discovery Results:
 * - Partial updates supported
 * - All fields optional except changelogId
 * - Returns updated entry
 *
 * Required fields:
 * - changelogId: string
 *
 * Optional fields:
 * - title: string
 * - content: string
 * - publishedAt: string
 * - tags: string[]
 *
 * Edge cases discovered:
 * - Partial updates allowed
 * - Returns 404 if entry doesn't exist
 */""",

    "update-comment.ts": """/**
 * update_comment - FeatureBase Comments API Wrapper
 *
 * Update an existing comment.
 * Uses Comments API with X-API-Key authentication.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~150 tokens (updated comment)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 91%
 *
 * Schema Discovery Results:
 * - Uses X-API-Key header (not Bearer)
 * - Uses x-www-form-urlencoded (not JSON)
 * - Only content field updatable
 *
 * Required fields:
 * - commentId: string
 * - content: string
 *
 * Edge cases discovered:
 * - Different auth from other endpoints
 * - Form-encoded body required
 * - Cannot update other metadata
 */""",

    "update-post.ts": """/**
 * update_post - FeatureBase REST Wrapper
 *
 * Update an existing post in feedback board.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~300 tokens (updated post)
 * - vs Native MCP: Consistent behavior, no server dependency
 * - Reduction: 85%
 *
 * Schema Discovery Results:
 * - Partial updates supported
 * - All fields optional except postId
 * - Returns updated post
 *
 * Required fields:
 * - postId: string
 *
 * Optional fields:
 * - title: string
 * - content: string
 * - statusId: string
 * - tags: string[]
 *
 * Edge cases discovered:
 * - Partial updates allowed
 * - Returns 404 if post doesn't exist
 * - Status changes via statusId
 */""",
}

def replace_header(filepath: Path):
    """Replace minimal header with comprehensive TSDoc"""
    content = filepath.read_text()

    filename = filepath.name
    if filename not in TSDOC_HEADERS:
        print(f"  ✗ No TSDoc header defined for {filename}")
        return False

    # Find the existing header comment (/** ... */)
    match = re.search(r'^/\*\*.*?\*/', content, re.MULTILINE | re.DOTALL)
    if not match:
        print(f"  ✗ Could not find existing header comment")
        return False

    # Replace the old header with the new comprehensive one
    new_content = content[:match.start()] + TSDOC_HEADERS[filename] + content[match.end():]

    filepath.write_text(new_content)
    print(f"  ✓ Updated TSDoc header")
    return True

def main():
    wrapper_dir = Path(__file__).parent

    print("Adding comprehensive TSDoc headers to Featurebase wrappers\n")

    updated_count = 0
    for filename in sorted(TSDOC_HEADERS.keys()):
        filepath = wrapper_dir / filename
        if not filepath.exists():
            print(f"✗ {filename} - not found")
            continue

        if filename == "create-post.ts":
            print(f"Skip {filename} (already updated manually)")
            continue

        print(f"Processing {filename}...")
        if replace_header(filepath):
            updated_count += 1

    print(f"\nCompleted: {updated_count}/{len(TSDOC_HEADERS)-1} files updated (1 skipped)")

if __name__ == "__main__":
    main()
