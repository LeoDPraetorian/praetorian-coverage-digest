# GitHub API Protocol Selection and GraphQL Patterns

**Source**: GitHub REST and GraphQL API Official Documentation (via Context7)
**Research Date**: 2026-01-03
**Context7 Library ID**: `/websites/github_en_rest`

---

## Executive Summary

GitHub offers two complementary API protocols: REST API v3 (HTTP-based, version 2022-11-28) and GraphQL API v4 (query-based). The choice between them depends on specific use case requirements:

- **GraphQL v4**: Optimal for bandwidth-constrained applications, complex nested queries, and precise data control. Single request can replace multiple REST calls (e.g., 1 GraphQL query vs 11 REST requests for follower data).
- **REST v3**: Preferred for developer familiarity, straightforward CRUD operations, simpler integrations, and existing tooling/libraries.
- **Hybrid Approach**: GitHub explicitly supports using both APIs together via Node IDs, enabling developers to leverage strengths of each protocol.

**Key Finding**: v3 and v4 are NOT equivalent. GraphQL v4 is missing functionality compared to REST v3 (e.g., repository deletion, collaborator management). A complete migration from v3 to v4 is neither possible nor recommended.

---

## REST API v3 Architecture

### Versioning Strategy

- **Date-based versioning** format: `YYYY-MM-DD` (e.g., `2022-11-28`)
- Version specified via `X-GitHub-Api-Version` header in requests
- Default version: `2022-11-28` (if header omitted)
- **Support window**: 24+ months for previous versions following new release
- Unsupported version requests return `400` error

### Endpoint Structure

- **Resource-based organization** mirroring logical domains:
  - Actions, Activity, Apps, Billing, Branches, Checks, Codespaces, Commits
  - Deployments, Gists, Issues, Organizations, Pull Requests, Repositories
  - Teams, Users, Git Database, Marketplace, Migrations, Search
- **Base URL**: `https://api.github.com`
- **Access**: All operations over HTTPS
- **Data format**: JSON (send and receive)

### Design Patterns

- **HTTP Verbs**: RESTful semantics (GET, POST, PUT, PATCH, DELETE)
- **Hypermedia**: `*_url` properties linking to related resources (HATEOAS)
- **Pagination**: Standardized `ListOptions` with `NextPage` navigation
- **Rate Limiting**: Detectable via `RateLimitError` and `AbuseRateLimitError` types
- **Conditional Requests**: ETag support for HTTP caching (RFC 9111)
- **Webhooks**: Event-based notifications with payload validation

---

## GraphQL API v4 Architecture

### Schema Design

- **Strongly-typed schema** defining type system and relationships
- **Query Type**: Root type for read operations
- **Mutation Type**: Root type for write operations
- **Schema components**: Objects, Scalars, Enums, Interfaces, Unions, Input Objects

### Core Principles

- **Specification-based**: Validates schema validity on API server
- **Hierarchical design**: Query shape mirrors JSON response shape
- **Developer flexibility**: "Ability to define precisely the data you want to fetch"

### Endpoint

- **Single endpoint**: `https://api.github.com/graphql` (all operations POST)

### Query Structure Fundamentals

- Selections must terminate at scalar fields (validation error otherwise)
- Request method: POST for all operations (queries and mutations)
- Variables enable dynamic parameterization without string interpolation

### Available Query Operations

- Repository lookup by owner and name
- Repository owner lookup by login
- Search across resources (max 1,000 results)
- User lookup by login

---

## Protocol Selection Criteria

### Choose GraphQL v4 When:

- ✅ Developing mobile applications (bandwidth constraints)
- ✅ Need nested data across multiple resources
- ✅ Minimizing request count is priority
- ✅ Precise control over response structure required
- ✅ Working with deeply related entities (e.g., repository → issues → comments → reactions)

**Performance Impact:** Real-world comparison shows 2100 repos fetched in 8 seconds with GraphQL vs 50 repos in 30 seconds with REST.

### Choose REST v3 When:

- ✅ Developer familiarity with HTTP verbs/concepts matters
- ✅ Building simpler integrations (standard CRUD)
- ✅ Working with familiar tooling/libraries
- ✅ Stateless operations benefit from caching strategies
- ✅ Integration with third-party services (many REST-focused)
- ✅ Simple projects where standard operations are sufficient

### Hybrid Approach (Recommended)

- "You don't need to exclusively use one API over the other"
- Node IDs enable seamless movement between both APIs
- Create module with interface for all requests, gradually migrate v3 → v4 as functionality becomes available

---

## Data Fetching Patterns Comparison

### REST API

```
GET /repos/{owner}/{repo}
GET /repos/{owner}/{repo}/issues
GET /repos/{owner}/{repo}/issues/{issue_number}/comments
```

Result: 3 separate requests, pre-determined response structures, includes unused fields

### GraphQL API

```graphql
query {
  repository(owner: "...", name: "...") {
    issues(first: 10) {
      edges {
        node {
          comments(first: 5) {
            edges {
              node {
                body
                author {
                  login
                }
              }
            }
          }
        }
      }
    }
  }
}
```

Result: 1 request, exactly the data requested, no unused fields

---

## GraphQL Query Examples

### Basic Repository Query

```graphql
query {
  repository(owner: "octocat", name: "Hello-World") {
    name
    description
    stargazerCount
    forkCount
    issues(first: 10, states: OPEN) {
      nodes {
        title
        number
        createdAt
        author {
          login
        }
      }
    }
  }
}
```

### Cursor-Based Pagination

```graphql
query ($cursor: String) {
  organization(login: "github") {
    repositories(first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        name
        description
        url
        primaryLanguage {
          name
        }
        stargazerCount
      }
    }
  }
}
```

### Search Query

```graphql
query SearchIssues($query: String!) {
  search(query: $query, type: ISSUE, first: 100) {
    issueCount
    edges {
      node {
        ... on Issue {
          title
          url
          state
          repository {
            nameWithOwner
          }
        }
      }
    }
  }
}
```

Example queries:

- `is:issue is:open label:bug repo:owner/repo`
- `is:pr is:merged author:username created:>2024-01-01`

---

## Conflicts and Trade-offs

### Feature Parity

- **Conflict**: GraphQL v4 missing functionality compared to REST v3
- **Trade-off**: Use hybrid approach, leverage both APIs where each excels
- **Implication**: Cannot fully deprecate REST v3 in favor of GraphQL v4

### Developer Experience

- **REST Advantage**: Familiar HTTP verbs, extensive tooling, simpler debugging
- **GraphQL Advantage**: Type safety, single endpoint, precise data control
- **Trade-off**: Learning curve vs efficiency gains

### Performance

- **REST Issue**: Over-fetching (pre-determined structures), multiple round trips
- **GraphQL Issue**: Complex queries can be expensive on server, query depth limits needed
- **Trade-off**: Network efficiency vs server computation cost

### Caching

- **REST Advantage**: HTTP caching (ETags, conditional requests), CDN-friendly
- **GraphQL Challenge**: POST requests bypass HTTP caches, requires client-side caching (Apollo, Relay)
- **Trade-off**: Infrastructure simplicity vs query flexibility

### Versioning Philosophy

- **REST v3**: Calendar-based versioning, explicit breaking changes, 24+ month support window
- **GraphQL v4**: Schema evolution via additive changes, deprecation annotations, no version in URL
- **Trade-off**: Explicit migrations vs continuous schema growth

---

## Client Library Selection

### Go Projects

- **REST v3**: `github.com/google/go-github/v80` (11k+ stars, Google-maintained, BSD-3-Clause)
- **GraphQL v4**: `github.com/shurcooL/githubv4` (1.2k+ stars, MIT, type-safe)
- **Hybrid**: Use both libraries with abstraction layer

### TypeScript/JavaScript

- **REST + GraphQL**: `@octokit/octokit` (7.6k+ stars, official, MIT)
- Single package supporting both protocols

### Other Languages

- Check official Octokit organization for language-specific clients
- Prioritize official/community-maintained libraries

---

## Architecture Patterns

### Repository Pattern

```go
type GitHubRepository interface {
    GetRepository(ctx context.Context, owner, name string) (*Repository, error)
    ListIssues(ctx context.Context, owner, name string, opts *IssueListOptions) ([]*Issue, error)
}

type restV3Client struct { /* REST implementation */ }
type graphQLV4Client struct { /* GraphQL implementation */ }
```

### Adapter Pattern

- Convert between REST and GraphQL response structures
- Normalize error handling across protocols
- Unified pagination interface

### Feature Flags

- Toggle between REST and GraphQL per operation
- A/B test performance characteristics
- Gradual rollout of protocol changes

---

## Migration Strategies

### v3 to v4 Challenges

- **Feature Parity Gap**: v4 missing functionality (repository deletion, collaborator management)
- **Different Paradigms**: REST (resource-based) vs GraphQL (graph-based)
- **Cannot Fully Migrate**: Certain v3 requests have no v4 equivalent

### Recommended Migration Path

1. **Modular Design**: Create request interface abstraction layer
2. **Gradual Migration**: Migrate endpoints available in v4, keep v3 for missing functionality
3. **Performance Gains First**: Migrate high-request-count operations to GraphQL
4. **Complementary Usage**: Use both APIs where each excels

### REST API Version Migration

1. Review breaking change documentation for new version
2. Update integration code to use `X-GitHub-Api-Version` header
3. Test updated integration thoroughly
4. Deploy before old version support window expires (24+ months)

---

## Best Practices

1. **Request Only What You Need**: Avoid fetching unused fields in GraphQL
2. **Use Pagination**: Don't fetch >100 items in one query
3. **Fragment Reusability**: Extract common fields into GraphQL fragments
4. **Monitor Query Cost**: Check rateLimit field for GraphQL cost
5. **Type Generation**: Use GraphQL Code Generator for TypeScript types
6. **Caching**: Implement Apollo Client caching for repeated GraphQL queries

---

## Sources

### Official GitHub Documentation

- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [GitHub GraphQL API Documentation](https://docs.github.com/en/graphql)
- [Comparing GitHub's REST API and GraphQL API](https://docs.github.com/en/rest/about-the-rest-api/comparing-githubs-rest-api-and-graphql-api?apiVersion=2022-11-28)
- [About the GraphQL API](https://docs.github.com/en/graphql/overview/about-the-graphql-api)
- [GitHub REST API Versions](https://docs.github.com/rest/overview/api-versions)
- [Introduction to GraphQL](https://docs.github.com/en/graphql/guides/introduction-to-graphql)
- [Migrating from REST to GraphQL](https://docs.github.com/en/graphql/guides/migrating-from-rest-to-graphql)

### GitHub Blog

- [To infinity and beyond: enabling the future of GitHub's REST API with API versioning](https://github.blog/developer-skills/github/to-infinity-and-beyond-enabling-the-future-of-githubs-rest-api-with-api-versioning/)

### Client Libraries

- [google/go-github](https://github.com/google/go-github) - Official Go REST v3 client (11k+ stars, BSD-3-Clause)
- [shurcooL/githubv4](https://github.com/shurcooL/githubv4) - Go GraphQL v4 client (1.2k+ stars, MIT)
- [octokit/octokit.js](https://github.com/octokit/octokit.js) - Official TypeScript/JavaScript client (7.6k+ stars, MIT)
