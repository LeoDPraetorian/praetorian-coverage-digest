# Claude Configuration for Chariot Development Platform

This file contains configuration and context for the Claude Code assistant working on the Chariot security platform development environment.

## Project Overview

Chariot is a comprehensive attack surface management platform consisting of multiple modules:

- **chariot**: Core backend services (Go) and frontend UI (React/TypeScript)
- **janus**: Security testing frameworks and tools
- **nebula**: Cloud security reconnaissance and analysis tools
- **tabularium**: Data management and API layer
- **nuclei-templates**: Security scanning templates
- **praetorian-cli**: Command-line interface tools

## Backend Development Workflow

**CRITICAL: ALL BACKEND DEVELOPMENT MUST FOLLOW THE STRUCTURED WORKFLOW BELOW**

### 🚨 MANDATORY BACKEND DEVELOPMENT PROCESS

**VERY IMPORTANT**: Every backend development task MUST be performed using the appropriate specialized subagents. The backend-orchestrator agent's ONLY role is to coordinate and delegate to other subagents - it should NEVER implement code directly.

### Backend Development Workflow Stages

#### 1. Requirements Analysis & Planning
- **ALWAYS START HERE** for any backend task
- Use `backend-requirements-analyzer` to break down feature descriptions into detailed functional requirements
- Use `backend-implementation-planner` to create comprehensive implementation plans
- Use `backend-functionality-analyzer` to identify reusable components and existing patterns

#### 2. Research & Technology Selection
- Use `backend-tech-research-advisor` for evaluating technology options and architectural decisions
- Research existing codebase patterns and technologies before implementing

#### 3. Data Types & Infrastructure
- Use `backend-datatypes` for adding new data types to the tabularium system
- Use `backend-cloud-infrastructure-architect` for adding cloud resources and AWS service integrations

#### 4. Implementation
- Use `backend-feature-implementer` for implementing specific features using existing infrastructure
- Use `backend-cli-implementer` for CLI functionality and command implementations
- **NEVER skip the implementation phase** - all code changes must go through proper implementation agents

#### 5. Testing Strategy & Implementation
- Use `backend-unit-test-planner` to plan comprehensive unit test coverage
- Use `backend-unit-test-generator` to create actual unit tests for implemented features
- **ALL NEW BACKEND CODE MUST HAVE UNIT TESTS**

#### 6. Quality Assurance & Validation
- Use `backend-code-quality-reviewer` to review all code changes before committing
- Use `backend-validation-agent` to test changes against the actual technology stack
- **NEVER skip code review and validation**

#### 7. Deployment
- Use `backend-deployment-agent` for deploying to AWS infrastructure
- Validate deployments and handle any deployment issues

#### 8. Multi-Repository Coordination
- Use `backend-feature-coordinator` when implementing features across multiple domains
- Use `git-commit-push-pr` for committing changes across multiple submodules and creating PRs

### Agent Usage Rules

#### Backend Orchestrator Agent
**ROLE**: Coordination and delegation ONLY
- **NEVER implement code directly**
- **NEVER create files or make code changes**
- **ONLY coordinate other specialized agents**
- **MUST delegate all implementation work to appropriate subagents**

#### Implementation Workflow Enforcement
**MANDATORY**: Every backend task must follow this pattern:

1. **Start with Analysis**: Always begin with requirements analysis and planning agents
2. **Research First**: Use research agents to understand existing patterns and technologies
3. **Design Before Build**: Create implementation plans before writing any code
4. **Implement Properly**: Use specialized implementation agents for actual coding
5. **Test Everything**: Generate comprehensive unit tests for all new functionality
6. **Review & Validate**: Use quality assurance agents before committing
7. **Deploy Correctly**: Use deployment agents for production releases

### Technology Stack Context

#### Backend Technologies
- **Language**: Go
- **Cloud**: AWS (Lambda, CloudFormation, S3, etc.)
- **Data**: Tabularium types and interfaces
- **Architecture**: Microservices with SAM (Serverless Application Model)

#### Key Directories
- `/backend/`: Go-based backend services
- `/backend/pkg/`: Shared Go packages and utilities  
- `/backend/cmd/`: Command-line applications
- `/backend/cf-templates/`: CloudFormation infrastructure templates

### Development Standards

#### Code Quality Requirements
- **Linting**: Run `make lint` before committing
- **Testing**: Run `make test` to execute all backend tests  
- **Type Checking**: Ensure Go code compiles without errors
- **Documentation**: Follow Go documentation conventions

#### Security Considerations
- **Defensive Security Only**: Only assist with defensive security tasks
- **No Malicious Code**: Refuse to create or improve potentially malicious code
- **Security Best Practices**: Never expose secrets or credentials in code

### Critical Workflow Reminders

#### ⚠️ NEVER Skip These Steps:
1. **Requirements Analysis**: Every task starts with proper requirements breakdown
2. **Technology Research**: Understand existing patterns before implementing
3. **Unit Test Generation**: All new code must have comprehensive tests
4. **Code Quality Review**: Review all changes before committing
5. **Validation Testing**: Test against actual technology stack
6. **Proper Agent Usage**: Use the correct specialized agent for each task type

#### ⚠️ ALWAYS Follow These Patterns:
- **Backend-Orchestrator Delegates Only**: Never implements code directly
- **Specialized Agents Implement**: Each agent handles its specific domain
- **Human-in-the-Loop**: Pause for approval on significant architectural decisions
- **Test-Driven Development**: Write tests alongside implementation
- **Infrastructure as Code**: Use CloudFormation for all AWS resources

### Agent Coordination Examples

#### Example 1: New API Endpoint
1. `backend-requirements-analyzer` → Define functional requirements
2. `backend-functionality-analyzer` → Check existing API patterns  
3. `backend-implementation-planner` → Create implementation plan
4. `backend-feature-implementer` → Implement the endpoint
5. `backend-unit-test-generator` → Create comprehensive tests
6. `backend-code-quality-reviewer` → Review implementation
7. `backend-validation-agent` → Test against actual stack
8. `backend-deployment-agent` → Deploy to AWS

#### Example 2: Cross-Module Feature
1. `backend-requirements-analyzer` → Break down requirements
2. `backend-functionality-analyzer` → Identify reusable components
3. `backend-feature-coordinator` → Coordinate implementation across modules
4. `backend-unit-test-planner` → Plan testing strategy
5. `backend-code-quality-reviewer` → Review all changes
6. `git-commit-push-pr` → Commit across submodules and create PRs

### Success Criteria

Every backend development task is considered complete only when:

✅ **Requirements are fully analyzed and documented**  
✅ **Implementation follows existing patterns and best practices**  
✅ **Comprehensive unit tests are created and passing**  
✅ **Code quality review is completed with no issues**  
✅ **Changes are validated against the actual technology stack**  
✅ **Deployment is successful and verified**  

**Remember**: The backend development workflow exists to ensure high-quality, maintainable, and secure code. Following every step is not optional - it is MANDATORY for all backend development tasks.