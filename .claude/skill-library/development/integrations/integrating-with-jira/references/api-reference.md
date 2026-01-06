# Jira REST API Reference

**Complete endpoint catalog across Jira Platform, Software, and Service Management APIs.**

## API Overview

Jira provides three distinct REST APIs:

| API                             | Base Path               | Purpose               | Endpoints |
| ------------------------------- | ----------------------- | --------------------- | --------- |
| **Jira Platform API**           | `/rest/api/3/`          | Core functionality    | 200+      |
| **Jira Software API**           | `/rest/agile/1.0/`      | Agile features        | 50+       |
| **Jira Service Management API** | `/rest/servicedeskapi/` | Service desk features | 40+       |

## API Specifications

### OpenAPI Specification (Cloud)

```
https://developer.atlassian.com/cloud/jira/platform/swagger-v3.v3.json
```

Use with OpenAPI Generator or Swagger Codegen to generate client libraries.

### Postman Collection

Available in Atlassian Developer Portal for interactive API exploration.

### WADL (Server/Data Center)

```
https://{host}/rest/api/2/application.wadl
```

Legacy XML format, deprecated in favor of OpenAPI.

## Core Platform API Endpoints

### Issues

| Operation       | Method | Endpoint                                       |
| --------------- | ------ | ---------------------------------------------- |
| Create issue    | POST   | `/rest/api/3/issue`                            |
| Get issue       | GET    | `/rest/api/3/issue/{issueIdOrKey}`             |
| Edit issue      | PUT    | `/rest/api/3/issue/{issueIdOrKey}`             |
| Delete issue    | DELETE | `/rest/api/3/issue/{issueIdOrKey}`             |
| Bulk create     | POST   | `/rest/api/3/issue/bulk`                       |
| Bulk edit       | PUT    | `/rest/api/3/issue/bulk`                       |
| Get transitions | GET    | `/rest/api/3/issue/{issueIdOrKey}/transitions` |
| Do transition   | POST   | `/rest/api/3/issue/{issueIdOrKey}/transitions` |
| Assign issue    | PUT    | `/rest/api/3/issue/{issueIdOrKey}/assignee`    |

### Search

| Operation       | Method   | Endpoint                           |
| --------------- | -------- | ---------------------------------- |
| Search (offset) | GET/POST | `/rest/api/3/search`               |
| Search (token)  | POST     | `/rest/api/3/search/jql`           |
| Validate JQL    | POST     | `/rest/api/3/jql/parse`            |
| Autocomplete    | GET      | `/rest/api/3/jql/autocompletedata` |

### Comments

| Operation      | Method | Endpoint                                        |
| -------------- | ------ | ----------------------------------------------- |
| Get comments   | GET    | `/rest/api/3/issue/{issueIdOrKey}/comment`      |
| Add comment    | POST   | `/rest/api/3/issue/{issueIdOrKey}/comment`      |
| Get comment    | GET    | `/rest/api/3/issue/{issueIdOrKey}/comment/{id}` |
| Update comment | PUT    | `/rest/api/3/issue/{issueIdOrKey}/comment/{id}` |
| Delete comment | DELETE | `/rest/api/3/issue/{issueIdOrKey}/comment/{id}` |

### Attachments

| Operation               | Method | Endpoint                                       |
| ----------------------- | ------ | ---------------------------------------------- |
| Get attachment          | GET    | `/rest/api/3/attachment/{id}`                  |
| Delete attachment       | DELETE | `/rest/api/3/attachment/{id}`                  |
| Add attachment          | POST   | `/rest/api/3/issue/{issueIdOrKey}/attachments` |
| Get attachment metadata | GET    | `/rest/api/3/attachment/meta`                  |

### Worklogs

| Operation      | Method | Endpoint                                        |
| -------------- | ------ | ----------------------------------------------- |
| Get worklogs   | GET    | `/rest/api/3/issue/{issueIdOrKey}/worklog`      |
| Add worklog    | POST   | `/rest/api/3/issue/{issueIdOrKey}/worklog`      |
| Get worklog    | GET    | `/rest/api/3/issue/{issueIdOrKey}/worklog/{id}` |
| Update worklog | PUT    | `/rest/api/3/issue/{issueIdOrKey}/worklog/{id}` |
| Delete worklog | DELETE | `/rest/api/3/issue/{issueIdOrKey}/worklog/{id}` |

### Issue Links

| Operation      | Method | Endpoint                         |
| -------------- | ------ | -------------------------------- |
| Get link types | GET    | `/rest/api/3/issueLinkType`      |
| Create link    | POST   | `/rest/api/3/issueLink`          |
| Get link       | GET    | `/rest/api/3/issueLink/{linkId}` |
| Delete link    | DELETE | `/rest/api/3/issueLink/{linkId}` |

### Watchers & Votes

| Operation      | Method | Endpoint                                    |
| -------------- | ------ | ------------------------------------------- |
| Get watchers   | GET    | `/rest/api/3/issue/{issueIdOrKey}/watchers` |
| Add watcher    | POST   | `/rest/api/3/issue/{issueIdOrKey}/watchers` |
| Remove watcher | DELETE | `/rest/api/3/issue/{issueIdOrKey}/watchers` |
| Get votes      | GET    | `/rest/api/3/issue/{issueIdOrKey}/votes`    |
| Add vote       | POST   | `/rest/api/3/issue/{issueIdOrKey}/votes`    |
| Remove vote    | DELETE | `/rest/api/3/issue/{issueIdOrKey}/votes`    |

### Projects

| Operation         | Method | Endpoint                               |
| ----------------- | ------ | -------------------------------------- |
| Get all projects  | GET    | `/rest/api/3/project`                  |
| Create project    | POST   | `/rest/api/3/project`                  |
| Get project       | GET    | `/rest/api/3/project/{projectIdOrKey}` |
| Update project    | PUT    | `/rest/api/3/project/{projectIdOrKey}` |
| Delete project    | DELETE | `/rest/api/3/project/{projectIdOrKey}` |
| Get project types | GET    | `/rest/api/3/project/type`             |
| Search projects   | GET    | `/rest/api/3/project/search`           |

### Components

| Operation        | Method | Endpoint                                          |
| ---------------- | ------ | ------------------------------------------------- |
| Get components   | GET    | `/rest/api/3/project/{projectIdOrKey}/components` |
| Create component | POST   | `/rest/api/3/component`                           |
| Get component    | GET    | `/rest/api/3/component/{id}`                      |
| Update component | PUT    | `/rest/api/3/component/{id}`                      |
| Delete component | DELETE | `/rest/api/3/component/{id}`                      |

### Versions

| Operation      | Method | Endpoint                                          |
| -------------- | ------ | ------------------------------------------------- |
| Get versions   | GET    | `/rest/api/3/project/{projectIdOrKey}/versions`   |
| Create version | POST   | `/rest/api/3/version`                             |
| Get version    | GET    | `/rest/api/3/version/{id}`                        |
| Update version | PUT    | `/rest/api/3/version/{id}`                        |
| Delete version | DELETE | `/rest/api/3/version/{id}`                        |
| Merge versions | PUT    | `/rest/api/3/version/{id}/mergeto/{moveIssuesTo}` |

### Users

| Operation             | Method | Endpoint                             |
| --------------------- | ------ | ------------------------------------ |
| Get current user      | GET    | `/rest/api/3/myself`                 |
| Search users          | GET    | `/rest/api/3/user/search`            |
| Find users assignable | GET    | `/rest/api/3/user/assignable/search` |
| Get user              | GET    | `/rest/api/3/user`                   |
| Get user groups       | GET    | `/rest/api/3/user/groups`            |

### Groups

| Operation              | Method | Endpoint                    |
| ---------------------- | ------ | --------------------------- |
| Get all groups         | GET    | `/rest/api/3/groups/picker` |
| Create group           | POST   | `/rest/api/3/group`         |
| Get group              | GET    | `/rest/api/3/group`         |
| Delete group           | DELETE | `/rest/api/3/group`         |
| Get group members      | GET    | `/rest/api/3/group/member`  |
| Add user to group      | POST   | `/rest/api/3/group/user`    |
| Remove user from group | DELETE | `/rest/api/3/group/user`    |

### Fields

| Operation           | Method | Endpoint                                                 |
| ------------------- | ------ | -------------------------------------------------------- |
| Get all fields      | GET    | `/rest/api/3/field`                                      |
| Create custom field | POST   | `/rest/api/3/field`                                      |
| Get field           | GET    | `/rest/api/3/field/{fieldId}`                            |
| Update custom field | PUT    | `/rest/api/3/field/{fieldId}`                            |
| Delete custom field | DELETE | `/rest/api/3/field/{fieldId}`                            |
| Get field contexts  | GET    | `/rest/api/3/field/{fieldId}/context`                    |
| Get field options   | GET    | `/rest/api/3/field/{fieldId}/context/{contextId}/option` |

### Issue Types

| Operation           | Method | Endpoint                     |
| ------------------- | ------ | ---------------------------- |
| Get all issue types | GET    | `/rest/api/3/issuetype`      |
| Create issue type   | POST   | `/rest/api/3/issuetype`      |
| Get issue type      | GET    | `/rest/api/3/issuetype/{id}` |
| Update issue type   | PUT    | `/rest/api/3/issuetype/{id}` |
| Delete issue type   | DELETE | `/rest/api/3/issuetype/{id}` |

### Statuses

| Operation             | Method | Endpoint                        |
| --------------------- | ------ | ------------------------------- |
| Get all statuses      | GET    | `/rest/api/3/status`            |
| Get status            | GET    | `/rest/api/3/status/{idOrName}` |
| Get status categories | GET    | `/rest/api/3/statuscategory`    |

### Priorities

| Operation      | Method | Endpoint                    |
| -------------- | ------ | --------------------------- |
| Get priorities | GET    | `/rest/api/3/priority`      |
| Get priority   | GET    | `/rest/api/3/priority/{id}` |

### Resolutions

| Operation       | Method | Endpoint                      |
| --------------- | ------ | ----------------------------- |
| Get resolutions | GET    | `/rest/api/3/resolution`      |
| Get resolution  | GET    | `/rest/api/3/resolution/{id}` |

### Workflows

| Operation            | Method | Endpoint                      |
| -------------------- | ------ | ----------------------------- |
| Get all workflows    | GET    | `/rest/api/3/workflow`        |
| Get workflow         | GET    | `/rest/api/3/workflow/search` |
| Get workflow schemes | GET    | `/rest/api/3/workflowscheme`  |

### Permissions

| Operation           | Method | Endpoint                        |
| ------------------- | ------ | ------------------------------- |
| Get my permissions  | GET    | `/rest/api/3/mypermissions`     |
| Get all permissions | GET    | `/rest/api/3/permissions`       |
| Check permissions   | POST   | `/rest/api/3/permissions/check` |

### Webhooks

| Operation           | Method | Endpoint                          |
| ------------------- | ------ | --------------------------------- |
| Get webhooks        | GET    | `/rest/api/3/webhook`             |
| Create webhook      | POST   | `/rest/api/3/webhook`             |
| Delete webhook      | DELETE | `/rest/api/3/webhook/{webhookId}` |
| Get failed webhooks | GET    | `/rest/api/3/webhook/failed`      |
| Refresh webhooks    | PUT    | `/rest/api/3/webhook/refresh`     |

### Filters

| Operation            | Method | Endpoint                       |
| -------------------- | ------ | ------------------------------ |
| Get filter           | GET    | `/rest/api/3/filter/{id}`      |
| Create filter        | POST   | `/rest/api/3/filter`           |
| Update filter        | PUT    | `/rest/api/3/filter/{id}`      |
| Delete filter        | DELETE | `/rest/api/3/filter/{id}`      |
| Get favorite filters | GET    | `/rest/api/3/filter/favourite` |
| Get my filters       | GET    | `/rest/api/3/filter/my`        |
| Search filters       | GET    | `/rest/api/3/filter/search`    |

### Dashboards

| Operation          | Method | Endpoint                       |
| ------------------ | ------ | ------------------------------ |
| Get all dashboards | GET    | `/rest/api/3/dashboard`        |
| Create dashboard   | POST   | `/rest/api/3/dashboard`        |
| Get dashboard      | GET    | `/rest/api/3/dashboard/{id}`   |
| Update dashboard   | PUT    | `/rest/api/3/dashboard/{id}`   |
| Delete dashboard   | DELETE | `/rest/api/3/dashboard/{id}`   |
| Search dashboards  | GET    | `/rest/api/3/dashboard/search` |

### Server Info

| Operation       | Method | Endpoint                 |
| --------------- | ------ | ------------------------ |
| Get server info | GET    | `/rest/api/3/serverInfo` |

## Jira Software API Endpoints

### Boards

| Operation               | Method | Endpoint                                        |
| ----------------------- | ------ | ----------------------------------------------- |
| Get all boards          | GET    | `/rest/agile/1.0/board`                         |
| Create board            | POST   | `/rest/agile/1.0/board`                         |
| Get board               | GET    | `/rest/agile/1.0/board/{boardId}`               |
| Delete board            | DELETE | `/rest/agile/1.0/board/{boardId}`               |
| Get board configuration | GET    | `/rest/agile/1.0/board/{boardId}/configuration` |
| Get issues for board    | GET    | `/rest/agile/1.0/board/{boardId}/issue`         |
| Get backlog             | GET    | `/rest/agile/1.0/board/{boardId}/backlog`       |

### Sprints

| Operation             | Method | Endpoint                                  |
| --------------------- | ------ | ----------------------------------------- |
| Get sprints for board | GET    | `/rest/agile/1.0/board/{boardId}/sprint`  |
| Create sprint         | POST   | `/rest/agile/1.0/sprint`                  |
| Get sprint            | GET    | `/rest/agile/1.0/sprint/{sprintId}`       |
| Update sprint         | PUT    | `/rest/agile/1.0/sprint/{sprintId}`       |
| Delete sprint         | DELETE | `/rest/agile/1.0/sprint/{sprintId}`       |
| Get issues in sprint  | GET    | `/rest/agile/1.0/sprint/{sprintId}/issue` |
| Move issues to sprint | POST   | `/rest/agile/1.0/sprint/{sprintId}/issue` |
| Swap sprints          | POST   | `/rest/agile/1.0/sprint/{sprintId}/swap`  |

### Epics

| Operation               | Method | Endpoint                                   |
| ----------------------- | ------ | ------------------------------------------ |
| Get epics for board     | GET    | `/rest/agile/1.0/board/{boardId}/epic`     |
| Get issues in epic      | GET    | `/rest/agile/1.0/epic/{epicIdOrKey}/issue` |
| Move issues to epic     | POST   | `/rest/agile/1.0/epic/{epicIdOrKey}/issue` |
| Remove issues from epic | POST   | `/rest/agile/1.0/epic/none/issue`          |
| Rank epics              | PUT    | `/rest/agile/1.0/epic/{epicIdOrKey}/rank`  |

### Backlog

| Operation              | Method | Endpoint                                |
| ---------------------- | ------ | --------------------------------------- |
| Move issues to backlog | POST   | `/rest/agile/1.0/backlog/issue`         |
| Move issues to board   | POST   | `/rest/agile/1.0/board/{boardId}/issue` |

### Issue Ranking

| Operation   | Method | Endpoint                     |
| ----------- | ------ | ---------------------------- |
| Rank issues | PUT    | `/rest/agile/1.0/issue/rank` |

## Jira Service Management API Endpoints

### Service Desks

| Operation         | Method | Endpoint                                           |
| ----------------- | ------ | -------------------------------------------------- |
| Get service desks | GET    | `/rest/servicedeskapi/servicedesk`                 |
| Get service desk  | GET    | `/rest/servicedeskapi/servicedesk/{serviceDeskId}` |

### Request Types

| Operation               | Method | Endpoint                                                                             |
| ----------------------- | ------ | ------------------------------------------------------------------------------------ |
| Get request types       | GET    | `/rest/servicedeskapi/servicedesk/{serviceDeskId}/requesttype`                       |
| Get request type        | GET    | `/rest/servicedeskapi/servicedesk/{serviceDeskId}/requesttype/{requestTypeId}`       |
| Get request type fields | GET    | `/rest/servicedeskapi/servicedesk/{serviceDeskId}/requesttype/{requestTypeId}/field` |

### Requests (Issues)

| Operation      | Method | Endpoint                                      |
| -------------- | ------ | --------------------------------------------- |
| Get requests   | GET    | `/rest/servicedeskapi/request`                |
| Create request | POST   | `/rest/servicedeskapi/request`                |
| Get request    | GET    | `/rest/servicedeskapi/request/{issueIdOrKey}` |

### Customers

| Operation        | Method | Endpoint                                                    |
| ---------------- | ------ | ----------------------------------------------------------- |
| Get customers    | GET    | `/rest/servicedeskapi/servicedesk/{serviceDeskId}/customer` |
| Add customers    | POST   | `/rest/servicedeskapi/servicedesk/{serviceDeskId}/customer` |
| Remove customers | DELETE | `/rest/servicedeskapi/servicedesk/{serviceDeskId}/customer` |

### Organizations

| Operation              | Method | Endpoint                                                  |
| ---------------------- | ------ | --------------------------------------------------------- |
| Get organizations      | GET    | `/rest/servicedeskapi/organization`                       |
| Create organization    | POST   | `/rest/servicedeskapi/organization`                       |
| Get organization       | GET    | `/rest/servicedeskapi/organization/{organizationId}`      |
| Delete organization    | DELETE | `/rest/servicedeskapi/organization/{organizationId}`      |
| Get organization users | GET    | `/rest/servicedeskapi/organization/{organizationId}/user` |

### Queues

| Operation           | Method | Endpoint                                                                 |
| ------------------- | ------ | ------------------------------------------------------------------------ |
| Get queues          | GET    | `/rest/servicedeskapi/servicedesk/{serviceDeskId}/queue`                 |
| Get queue           | GET    | `/rest/servicedeskapi/servicedesk/{serviceDeskId}/queue/{queueId}`       |
| Get issues in queue | GET    | `/rest/servicedeskapi/servicedesk/{serviceDeskId}/queue/{queueId}/issue` |

### SLAs

| Operation    | Method | Endpoint                                          |
| ------------ | ------ | ------------------------------------------------- |
| Get SLA info | GET    | `/rest/servicedeskapi/request/{issueIdOrKey}/sla` |

## Common Query Parameters

| Parameter       | Description             | Example                            |
| --------------- | ----------------------- | ---------------------------------- |
| `expand`        | Include additional data | `?expand=changelog,renderedFields` |
| `fields`        | Limit returned fields   | `?fields=key,summary,status`       |
| `properties`    | Include properties      | `?properties=*`                    |
| `startAt`       | Pagination offset       | `?startAt=100`                     |
| `maxResults`    | Page size               | `?maxResults=50`                   |
| `nextPageToken` | Token pagination        | `?nextPageToken=abc123`            |
| `jql`           | JQL filter              | `?jql=project%3DPROJ`              |
| `orderBy`       | Sort order              | `?orderBy=created`                 |

## Response Codes Summary

| Code | Meaning                       |
| ---- | ----------------------------- |
| 200  | Success                       |
| 201  | Created                       |
| 204  | No Content (success, no body) |
| 400  | Bad Request                   |
| 401  | Unauthorized                  |
| 403  | Forbidden                     |
| 404  | Not Found                     |
| 429  | Rate Limited                  |
| 500  | Server Error                  |

## Official Documentation

- [Jira Platform REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Jira Software REST API](https://developer.atlassian.com/cloud/jira/software/rest/)
- [Jira Service Management REST API](https://developer.atlassian.com/cloud/jira/service-desk/rest/)
