/**
 * MSW Mock Handlers for FeatureBase API
 *
 * Provides mock HTTP responses for testing FeatureBase tools.
 * Based on verified pattern from .claude/tools/shodan/__tests__/
 */

import { http, HttpResponse } from 'msw';

const BASE_URL = 'https://do.featurebase.app';

/**
 * Mock handlers for FeatureBase API endpoints
 */
export const featurebaseHandlers = [
  // Posts endpoints
  http.get(`${BASE_URL}/v2/posts`, () => {
    return HttpResponse.json({
      results: [
        {
          id: 'post_test123',
          slug: 'test-post',
          title: 'Test Post',
          content: 'Test content for post',
          postStatus: {
            name: 'in-progress',
            type: 'status',
          },
          categoryId: 'board_test',
          date: '2026-01-09T10:00:00Z',
          lastModified: '2026-01-09T11:00:00Z',
          upvotes: 42,
          commentCount: 0,
          postTags: ['test', 'example'],
        },
      ],
      page: 1,
      limit: 100,
      totalPages: 1,
      totalResults: 1,
    });
  }),

  http.get(`${BASE_URL}/v2/posts/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      slug: 'test-post',
      title: 'Test Post',
      content: 'Test content',
      postStatus: {
        name: 'in-progress',
        type: 'status',
      },
      categoryId: 'board_test',
      date: '2026-01-09T10:00:00Z',
      lastModified: '2026-01-09T11:00:00Z',
      upvotes: 42,
      commentCount: 0,
      postTags: ['test'],
    });
  }),

  http.post(`${BASE_URL}/v2/posts`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: 'post_new123',
      ...body,
      date: '2026-01-12T12:00:00Z',
      lastModified: '2026-01-12T12:00:00Z',
      upvotes: 0,
    });
  }),

  http.put(`${BASE_URL}/v2/posts/:id`, async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.id,
      ...body,
      lastModified: '2026-01-13T12:00:00Z',
    });
  }),

  http.delete(`${BASE_URL}/v2/posts/:id`, ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  // Changelog endpoints (note: endpoint is v2/changelogs with 's')
  http.get(`${BASE_URL}/v2/changelogs`, () => {
    return HttpResponse.json({
      results: [
        {
          id: 'changelog_test123',
          title: 'Test Changelog',
          content: 'Test changelog content',
          publishedAt: '2026-01-09T10:00:00Z',
          updatedAt: '2026-01-09T11:00:00Z',
          tags: ['feature', 'update'],
        },
      ],
      page: 1,
      totalResults: 1,
    });
  }),

  http.get(`${BASE_URL}/v2/changelogs/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Test Changelog',
      content: 'Test changelog content',
      publishedAt: '2026-01-09T10:00:00Z',
      createdAt: '2026-01-09T09:00:00Z',
      updatedAt: '2026-01-09T11:00:00Z',
      tags: ['feature', 'update'],
    });
  }),

  http.post(`${BASE_URL}/v2/changelogs`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: 'changelog_new123',
      ...body,
      createdAt: '2026-01-13T10:00:00Z',
      updatedAt: '2026-01-13T10:00:00Z',
    });
  }),

  http.put(`${BASE_URL}/v2/changelogs/:id`, async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.id,
      title: body.title || 'Test Changelog',
      content: body.content || 'Test changelog content',
      publishedAt: body.publishedAt || '2026-01-09T10:00:00Z',
      updatedAt: '2026-01-13T12:00:00Z',
      tags: body.tags || ['feature', 'update'],
    });
  }),

  http.delete(`${BASE_URL}/v2/changelogs/:id`, ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  // Articles endpoints (endpoint is v2/help_center/articles per API docs)
  http.get(`${BASE_URL}/v2/help_center/articles`, () => {
    return HttpResponse.json({
      results: [
        {
          id: 'article_test123',
          title: 'Test Article',
          body: 'Test article content', // API uses "body" not "content"
          description: 'Test article description',
          slug: 'test-article',
          createdAt: '2026-01-09T10:00:00Z',
          updatedAt: '2026-01-09T11:00:00Z',
        },
      ],
      page: 1,
      totalResults: 1,
    });
  }),

  http.get(`${BASE_URL}/v2/help_center/articles/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Test Article',
      body: 'Test article content',
      description: 'Test article description',
      slug: 'test-article',
      createdAt: '2026-01-09T10:00:00Z',
      updatedAt: '2026-01-09T11:00:00Z',
    });
  }),

  http.post(`${BASE_URL}/v2/help_center/articles`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: 'article_new123',
      ...body,
      createdAt: '2026-01-13T10:00:00Z',
      updatedAt: '2026-01-13T10:00:00Z',
    });
  }),

  http.put(`${BASE_URL}/v2/help_center/articles/:id`, async ({ params, request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      id: params.id,
      title: body.title || 'Test Article',
      body: body.body || 'Test article content',
      description: body.description || 'Test article description',
      slug: body.slug || 'test-article',
      createdAt: body.createdAt || '2026-01-09T10:00:00Z',
      updatedAt: '2026-01-13T12:00:00Z',
    });
  }),

  http.delete(`${BASE_URL}/v2/help_center/articles/:id`, ({ params }) => {
    return HttpResponse.json({ success: true, id: params.id });
  }),

  // Users endpoints
  http.get(`${BASE_URL}/v2/organization/identifyUser`, ({ request }) => {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const userId = url.searchParams.get('userId');

    if (!email && !userId) {
      return HttpResponse.json(
        { error: 'email or userId is required' },
        { status: 400 }
      );
    }

    // Mock user data
    return HttpResponse.json({
      user: {
        email: email || 'test@example.com',
        userId: userId || 'user_test123',
        name: 'Test User',
        customFields: {
          plan: 'enterprise',
          accountType: 'premium',
        },
        companies: [
          {
            id: 'company_test',
            name: 'Test Company',
            monthlySpend: 5000,
          },
        ],
        createdAt: '2026-01-09T10:00:00Z',
        lastActivity: '2026-01-17T12:00:00Z',
        totalPosts: 5,
        totalComments: 12,
        totalUpvotes: 8,
      },
    });
  }),

  http.post(`${BASE_URL}/v2/organization/identifyUser`, async ({ request }) => {
    const body = await request.json() as any;
    // API returns wrapped format with success, user, and action fields
    return HttpResponse.json({
      success: true,
      user: {
        id: body.userId || 'user_new123',
        email: body.email,
        userId: body.userId,
        name: body.name,
        customFields: body.customFields || {},
        companies: body.companies || [],
        createdAt: '2026-01-18T08:00:00Z',
        updatedAt: '2026-01-18T08:00:00Z',
      },
      action: 'created' as const,
    });
  }),

  http.get(`${BASE_URL}/v2/organization/identifyUser/query`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    // Mock user list data
    return HttpResponse.json({
      users: [
        {
          email: 'user1@example.com',
          userId: 'user_test1',
          name: 'User One',
          customFields: {
            plan: 'starter',
          },
          companies: [
            {
              id: 'company_test1',
              name: 'Company One',
              monthlySpend: 1000,
            },
          ],
          createdAt: '2026-01-01T10:00:00Z',
          lastActivity: '2026-01-17T10:00:00Z',
          totalPosts: 10,
          totalComments: 25,
          totalUpvotes: 15,
        },
        {
          email: 'user2@example.com',
          userId: 'user_test2',
          name: 'User Two',
          customFields: {
            plan: 'enterprise',
          },
          companies: [
            {
              id: 'company_test2',
              name: 'Company Two',
              monthlySpend: 5000,
            },
          ],
          createdAt: '2026-01-05T10:00:00Z',
          lastActivity: '2026-01-16T14:00:00Z',
          totalPosts: 20,
          totalComments: 50,
          totalUpvotes: 30,
        },
      ],
      page,
      limit,
      totalPages: 1,
      totalResults: 2,
    });
  }),

  http.delete(`${BASE_URL}/v2/organization/deleteUser`, ({ request }) => {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    const userId = url.searchParams.get('userId');

    if (!email && !userId) {
      return HttpResponse.json(
        { error: 'email or userId is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      success: true,
      email: email || undefined,
      userId: userId || undefined,
    });
  }),

  // Custom Fields endpoints
  http.get(`${BASE_URL}/v2/custom_fields`, () => {
    return HttpResponse.json({
      fields: [
        {
          id: 'cf_test123',
          name: 'subscription_plan',
          type: 'string',
          options: ['free', 'pro', 'enterprise'],
          required: false,
          createdAt: '2026-01-09T10:00:00Z',
          updatedAt: '2026-01-09T10:00:00Z',
        },
        {
          id: 'cf_test456',
          name: 'mrr',
          type: 'number',
          min: 0,
          max: 1000000,
          required: false,
          createdAt: '2026-01-09T10:05:00Z',
          updatedAt: '2026-01-09T10:05:00Z',
        },
        {
          id: 'cf_test789',
          name: 'beta_features_enabled',
          type: 'boolean',
          required: false,
          createdAt: '2026-01-09T10:10:00Z',
          updatedAt: '2026-01-09T10:10:00Z',
        },
      ],
    });
  }),

  http.post(`${BASE_URL}/v2/custom_fields`, async ({ request }) => {
    const body = await request.json() as any;
    return HttpResponse.json({
      field: {
        id: 'cf_new123',
        ...body,
        required: body.required ?? false,
        createdAt: '2026-01-17T15:00:00Z',
        updatedAt: '2026-01-17T15:00:00Z',
      },
    });
  }),

  // Comments endpoints (use X-API-Key auth, not Bearer)
  http.get(`${BASE_URL}/v2/comment`, ({ request }) => {
    // Verify X-API-Key header
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: 'X-API-Key header required' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const submissionId = url.searchParams.get('submissionId');
    const changelogId = url.searchParams.get('changelogId');

    if (!submissionId && !changelogId) {
      return HttpResponse.json(
        { error: 'submissionId or changelogId required' },
        { status: 400 }
      );
    }

    return HttpResponse.json({
      comments: [
        {
          id: 'comment_test123',
          content: 'This is a test comment',
          createdAt: '2026-01-17T10:00:00Z',
          author: {
            id: 'user_test',
            name: 'Test User',
            email: 'test@example.com',
            profilePicture: 'https://example.com/pic.jpg',
          },
          parentCommentId: null,
          isPrivate: false,
          isPinned: false,
          upvotes: 5,
          downvotes: 1,
          score: 4,
          replyCount: 2,
        },
      ],
      page: 1,
      totalPages: 1,
      totalResults: 1,
    });
  }),

  http.post(`${BASE_URL}/v2/comment`, async ({ request }) => {
    // Verify X-API-Key header
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: 'X-API-Key header required' },
        { status: 401 }
      );
    }

    // Parse form data (application/x-www-form-urlencoded)
    const text = await request.text();
    const params = new URLSearchParams(text);

    const submissionId = params.get('submissionId');
    const changelogId = params.get('changelogId');
    const content = params.get('content');
    const parentCommentId = params.get('parentCommentId');
    const isPrivate = params.get('isPrivate') === 'true';

    // Validation
    if (!submissionId && !changelogId) {
      return HttpResponse.json(
        { error: 'submissionId or changelogId required' },
        { status: 400 }
      );
    }

    if (!content) {
      return HttpResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    if (content.length > 10000) {
      return HttpResponse.json(
        { error: 'content must be less than 10000 characters' },
        { status: 400 }
      );
    }

    // Return created comment
    return HttpResponse.json({
      id: 'comment_new123',
      submissionId: submissionId || undefined,
      changelogId: changelogId || undefined,
      content,
      parentCommentId: parentCommentId || undefined,
      isPrivate,
      createdAt: '2026-01-17T16:00:00Z',
      updatedAt: '2026-01-17T16:00:00Z',
      author: {
        id: 'user_test',
        name: 'Test User',
        email: 'test@example.com',
      },
      upvotes: 0,
      downvotes: 0,
      score: 0,
    });
  }),

  http.put(`${BASE_URL}/v2/comment/:id`, async ({ params, request }) => {
    // Verify X-API-Key header
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: 'X-API-Key header required' },
        { status: 401 }
      );
    }

    // Parse form data (application/x-www-form-urlencoded)
    const text = await request.text();
    const urlParams = new URLSearchParams(text);

    const content = urlParams.get('content');
    const isPinned = urlParams.get('isPinned');
    const isPrivate = urlParams.get('isPrivate');

    // Validate content length if provided
    if (content && content.length > 10000) {
      return HttpResponse.json(
        { error: 'content must be less than 10000 characters' },
        { status: 400 }
      );
    }

    // Return updated comment with values from request
    return HttpResponse.json({
      id: params.id,
      submissionId: 'post_test123',
      content: content || 'Existing comment content',
      isPinned: isPinned === 'true',
      isPrivate: isPrivate === 'true',
      createdAt: '2026-01-17T16:00:00Z',
      updatedAt: '2026-01-17T16:05:00Z',
      author: {
        id: 'user_test',
        name: 'Test User',
        email: 'test@example.com',
      },
      upvotes: 5,
      downvotes: 1,
      score: 4,
    });
  }),

  // http.put handler for test overrides (same behavior as PATCH)
  http.put(`${BASE_URL}/v2/comment/:id`, async ({ params, request }) => {
    // Verify X-API-Key header
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: 'X-API-Key header required' },
        { status: 401 }
      );
    }

    // Parse form data (application/x-www-form-urlencoded)
    const text = await request.text();
    const urlParams = new URLSearchParams(text);

    const content = urlParams.get('content');
    const isPinned = urlParams.get('isPinned');
    const isPrivate = urlParams.get('isPrivate');

    // Validate content length if provided
    if (content && content.length > 10000) {
      return HttpResponse.json(
        { error: 'content must be less than 10000 characters' },
        { status: 400 }
      );
    }

    // Return updated comment with values from request
    return HttpResponse.json({
      id: params.id,
      submissionId: 'post_test123',
      content: content || 'Existing comment content',
      isPinned: isPinned === 'true',
      isPrivate: isPrivate === 'true',
      createdAt: '2026-01-17T16:00:00Z',
      updatedAt: '2026-01-17T16:05:00Z',
      author: {
        id: 'user_test',
        name: 'Test User',
        email: 'test@example.com',
      },
      upvotes: 5,
      downvotes: 1,
      score: 4,
    });
  }),

  // http.patch handler for update-comment (same behavior as PUT)
  http.patch(`${BASE_URL}/v2/comment/:id`, async ({ params, request }) => {
    // Verify X-API-Key header
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: 'X-API-Key header required' },
        { status: 401 }
      );
    }

    // Parse form data (application/x-www-form-urlencoded)
    const text = await request.text();
    const urlParams = new URLSearchParams(text);

    const content = urlParams.get('content');
    const isPinned = urlParams.get('isPinned');
    const isPrivate = urlParams.get('isPrivate');

    // Validate content length if provided
    if (content && content.length > 10000) {
      return HttpResponse.json(
        { error: 'content must be less than 10000 characters' },
        { status: 400 }
      );
    }

    // Return updated comment with values from request
    return HttpResponse.json({
      id: params.id,
      submissionId: 'post_test123',
      content: content || 'Existing comment content',
      isPinned: isPinned === 'true',
      isPrivate: isPrivate === 'true',
      createdAt: '2026-01-17T16:00:00Z',
      updatedAt: '2026-01-17T16:05:00Z',
      author: {
        id: 'user_test',
        name: 'Test User',
        email: 'test@example.com',
      },
      upvotes: 5,
      downvotes: 1,
      score: 4,
    });
  }),

  http.delete(`${BASE_URL}/v2/comment/:id`, ({ params, request }) => {
    // Verify X-API-Key header
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return HttpResponse.json(
        { error: 'X-API-Key header required' },
        { status: 401 }
      );
    }

    // Simulate 404 for not found
    if (params.id === 'comment_notfound') {
      return HttpResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    // Simulate soft delete for comments with replies
    if (params.id === 'comment_with_replies') {
      return HttpResponse.json({
        deletionType: 'soft',
      });
    }

    // Default: hard delete
    return HttpResponse.json({
      deletionType: 'hard',
    });
  }),
];
