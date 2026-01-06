/**
 * MSW Handlers for Linear GraphQL API
 *
 * Mock handlers for testing Linear wrappers without hitting the real API.
 * Uses MSW's graphql link for GraphQL operation matching.
 */

import { graphql, HttpResponse } from 'msw';

// Linear GraphQL API endpoint
const linearApi = graphql.link('https://api.linear.app/graphql');

/**
 * Default mock data for common operations
 */
export const mockData = {
  initiative: {
    id: 'init-uuid-123',
    name: 'Q1 2025 Roadmap',
    description: 'Quarterly planning initiative',
    targetDate: '2025-03-31',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  issueRelation: {
    id: 'rel-uuid-123',
    type: 'blocks',
    issue: { id: 'issue-1', identifier: 'CHARIOT-100' },
    relatedIssue: { id: 'issue-2', identifier: 'CHARIOT-101' },
  },
  cycle: {
    id: 'cycle-uuid-123',
    name: 'Sprint 1',
    number: 1,
    startsAt: '2025-01-06T00:00:00Z',
    endsAt: '2025-01-20T00:00:00Z',
  },
};

/**
 * Initiative mutation handlers
 */
export const initiativeHandlers = [
  // Create Initiative
  linearApi.mutation('InitiativeCreate', ({ variables }) => {
    return HttpResponse.json({
      data: {
        initiativeCreate: {
          success: true,
          initiative: {
            ...mockData.initiative,
            name: variables.input?.name || mockData.initiative.name,
            description: variables.input?.description || mockData.initiative.description,
          },
        },
      },
    });
  }),

  // Get Initiative
  linearApi.query('Initiative', ({ variables }) => {
    return HttpResponse.json({
      data: {
        initiative: {
          ...mockData.initiative,
          id: variables.id || mockData.initiative.id,
        },
      },
    });
  }),

  // List Initiatives
  linearApi.query('Initiatives', () => {
    return HttpResponse.json({
      data: {
        initiatives: {
          nodes: [mockData.initiative],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      },
    });
  }),

  // Update Initiative
  linearApi.mutation('InitiativeUpdate', ({ variables }) => {
    return HttpResponse.json({
      data: {
        initiativeUpdate: {
          success: true,
          initiative: {
            ...mockData.initiative,
            ...variables.input,
          },
        },
      },
    });
  }),

  // Delete Initiative
  linearApi.mutation('InitiativeDelete', () => {
    return HttpResponse.json({
      data: {
        initiativeDelete: {
          success: true,
        },
      },
    });
  }),

  // Link Project to Initiative
  linearApi.mutation('InitiativeToProjectCreate', ({ variables }) => {
    return HttpResponse.json({
      data: {
        initiativeToProjectCreate: {
          success: true,
          initiativeToProject: {
            id: 'link-uuid-123',
            initiative: { id: variables.initiativeId },
            project: { id: variables.projectId },
          },
        },
      },
    });
  }),
];

/**
 * Issue Relation handlers
 */
export const issueRelationHandlers = [
  // Create Issue Relation
  linearApi.mutation('IssueRelationCreate', ({ variables }) => {
    return HttpResponse.json({
      data: {
        issueRelationCreate: {
          success: true,
          issueRelation: {
            ...mockData.issueRelation,
            type: variables.input?.type || mockData.issueRelation.type,
          },
        },
      },
    });
  }),

  // Delete Issue Relation
  linearApi.mutation('IssueRelationDelete', () => {
    return HttpResponse.json({
      data: {
        issueRelationDelete: {
          success: true,
        },
      },
    });
  }),

  // List Issue Relations
  linearApi.query('IssueRelations', () => {
    return HttpResponse.json({
      data: {
        issueRelations: {
          nodes: [mockData.issueRelation],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      },
    });
  }),
];

/**
 * Cycle handlers
 */
export const cycleHandlers = [
  // Get Cycle
  linearApi.query('Cycle', ({ variables }) => {
    return HttpResponse.json({
      data: {
        cycle: {
          ...mockData.cycle,
          id: variables.id || mockData.cycle.id,
        },
      },
    });
  }),

  // Create Cycle
  linearApi.mutation('CycleCreate', ({ variables }) => {
    return HttpResponse.json({
      data: {
        cycleCreate: {
          success: true,
          cycle: {
            ...mockData.cycle,
            ...variables.input,
          },
        },
      },
    });
  }),
];

/**
 * Project handlers
 */
export const projectHandlers = [
  // Delete Project
  linearApi.mutation('ProjectDelete', () => {
    return HttpResponse.json({
      data: {
        projectDelete: {
          success: true,
        },
      },
    });
  }),
];

/**
 * Error handlers for testing error scenarios
 */
export const errorHandlers = {
  notFound: linearApi.query('Initiative', () => {
    return HttpResponse.json({
      errors: [{ message: 'Initiative not found', path: ['initiative'] }],
    });
  }),

  unauthorized: linearApi.query('Initiative', () => {
    return HttpResponse.json({
      errors: [{ message: 'Authentication required', extensions: { code: 'UNAUTHENTICATED' } }],
    });
  }),

  rateLimited: linearApi.query('Initiative', () => {
    return HttpResponse.json({
      errors: [{ message: 'Rate limit exceeded', extensions: { code: 'RATE_LIMITED' } }],
    });
  }),
};

/**
 * All handlers combined for test setup
 */
export const allHandlers = [
  ...initiativeHandlers,
  ...issueRelationHandlers,
  ...cycleHandlers,
  ...projectHandlers,
];
