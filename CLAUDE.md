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

**CRITICAL: ALL BACKEND DEVELOPMENT MUST FOLLOW THE 4-AGENT PIPELINE BELOW**

### 🚨 MANDATORY 4-AGENT BACKEND PIPELINE

**VERY IMPORTANT**: Every backend development task MUST follow the streamlined 4-agent pipeline. Each agent's ONLY role is to coordinate and execute the appropriate specialized subagents - they should NEVER implement code directly except for the Submission Agent.

### 4-Agent Pipeline Structure

#### 1. Backend Summarizer Agent
**ROLE**: Requirements analysis and task breakdown coordination
- **COORDINATES**: `backend-requirements-analyzer` for breaking down feature descriptions
- **DELEGATES TO**: Requirements analysis subagents
- **OUTPUTS**: Clear, structured requirements summary
- **NEVER IMPLEMENTS**: Only coordinates analysis work through subagents

#### 2. Backend Planner Agent  
**ROLE**: Implementation strategy and research coordination
- **COORDINATES**: 
  - `backend-tech-research-advisor` for technology evaluation
  - `backend-functionality-analyzer` for existing system analysis
  - `backend-new-functionality-agent` for new component design
  - `backend-unit-test-planner` for testing strategy
  - `backend-implementation-planner` for comprehensive planning
- **DELEGATES TO**: All research and planning subagents
- **OUTPUTS**: Detailed implementation plan with technology choices
- **NEVER IMPLEMENTS**: Only coordinates planning work through subagents

#### 3. Backend Implementer Agent
**ROLE**: Core implementation coordination and execution management
- **COORDINATES**:
  - `backend-cloud-infrastructure-architect` for AWS resources
  - `backend-datatypes` for tabularium data types
  - `backend-feature-implementer` for feature implementation
  - `backend-cli-implementer` for CLI functionality
  - `backend-unit-test-generator` for test creation
  - `backend-deployment-agent` for deployment setup
  - `backend-validation-agent` for validation testing
  - `backend-code-quality-reviewer` for code review
- **DELEGATES TO**: All implementation and testing subagents
- **OUTPUTS**: Complete, tested, and validated implementation
- **NEVER IMPLEMENTS**: Only coordinates implementation work through subagents

#### 4. Backend Submission Agent
**ROLE**: Final submission and delivery (ONLY agent that can implement directly)
- **CAN IMPLEMENT**: This agent can directly perform code operations
- **HANDLES**:
  - Git operations (commit, push, PR creation)
  - Final code organization and cleanup
  - Repository coordination across submodules
  - Error resolution and final validation
- **USES**: `git-commit-push-pr` when needed for multi-repository coordination
- **OUTPUTS**: Deployed feature with PRs opened and ready for review

### Backend Orchestrator Agent Rules

#### Primary Responsibility: 4-Agent Execution ONLY
**ROLE**: Execute the 4 main pipeline agents in sequence
- **ONLY EXECUTES**: Summarizer → Planner → Implementer → Submission
- **NEVER IMPLEMENTS**: Does not coordinate subagents directly
- **NEVER CREATES**: Does not create files or make code changes
- **COORDINATES**: Only the 4 main pipeline agents, nothing else
- **REPORTS**: Progress through the 4-agent pipeline to the user

### Pipeline Agent Coordination Rules

#### Summarizer, Planner, and Implementer Agents
**CRITICAL COORDINATION ROLE**: Each of these 3 agents MUST:
- **EXECUTE appropriate specialized subagents** for their domain
- **SUMMARIZE results** from subagent execution
- **REPORT BACK** to the orchestrator with clear outputs
- **COORDINATE multiple subagents** within their domain as needed
- **NEVER IMPLEMENT CODE** - all implementation through subagents only

#### Submission Agent Exception
**SPECIAL IMPLEMENTATION PERMISSION**: The Submission Agent ONLY can:
- **DIRECTLY IMPLEMENT** git operations, file organization, and final submission tasks
- **COORDINATE** `git-commit-push-pr` for complex multi-repository scenarios
- **RESOLVE** final integration issues and deployment problems
- **EXECUTE** all final delivery tasks without delegating

### Workflow Enforcement Rules

**MANDATORY PIPELINE EXECUTION**:
1. **Backend-Orchestrator** executes Summarizer Agent
2. **Summarizer Agent** coordinates requirements analysis subagents
3. **Backend-Orchestrator** executes Planner Agent  
4. **Planner Agent** coordinates research and planning subagents
5. **Backend-Orchestrator** executes Implementer Agent
6. **Implementer Agent** coordinates all implementation subagents
7. **Backend-Orchestrator** executes Submission Agent
8. **Submission Agent** directly handles final delivery and submission

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

#### Example 1: New API Endpoint Implementation
**4-Agent Pipeline Execution:**

1. **Backend-Orchestrator** → Executes **Summarizer Agent**
   - **Summarizer Agent** coordinates `backend-requirements-analyzer` 
   - **Output**: Clear API endpoint requirements and specifications

2. **Backend-Orchestrator** → Executes **Planner Agent**  
   - **Planner Agent** coordinates:
     - `backend-functionality-analyzer` → Check existing API patterns
     - `backend-tech-research-advisor` → Research optimal approaches
     - `backend-implementation-planner` → Create detailed implementation plan
   - **Output**: Comprehensive implementation strategy

3. **Backend-Orchestrator** → Executes **Implementer Agent**
   - **Implementer Agent** coordinates:
     - `backend-feature-implementer` → Implement the endpoint
     - `backend-unit-test-generator` → Create comprehensive tests  
     - `backend-code-quality-reviewer` → Review implementation
     - `backend-validation-agent` → Test against actual stack
   - **Output**: Complete, tested, validated implementation

4. **Backend-Orchestrator** → Executes **Submission Agent**
   - **Submission Agent** directly handles:
     - Git operations (commit, push)
     - PR creation and repository coordination
     - Final deployment coordination
   - **Output**: Deployed feature with PRs ready for review

#### Example 2: Cross-Module Feature Development  
**4-Agent Pipeline with Multi-Repository Coordination:**

1. **Summarizer Agent** → Coordinates requirements analysis across modules
2. **Planner Agent** → Coordinates research and planning for all affected components  
3. **Implementer Agent** → Coordinates implementation across multiple domains
4. **Submission Agent** → Uses `git-commit-push-pr` for cross-repository coordination

### Success Criteria

Every backend development task is considered complete only when the **4-Agent Pipeline** has been fully executed:

✅ **Summarizer Agent**: Requirements fully analyzed and documented by coordination subagents  
✅ **Planner Agent**: Implementation strategy created through coordinated research subagents  
✅ **Implementer Agent**: Complete implementation delivered through coordinated specialized subagents  
✅ **Submission Agent**: Final delivery with PRs created and deployment verified  

### Critical Reminders

**COORDINATION IS KEY**: 
- **Backend-Orchestrator**: ONLY executes the 4 main agents
- **3 Pipeline Agents**: ONLY coordinate specialized subagents (never implement)
- **Submission Agent**: ONLY agent allowed to implement directly
- **All Implementation Work**: MUST be done by specialized subagents

**Remember**: The 4-agent pipeline exists to ensure systematic, high-quality backend development through proper delegation and coordination. Following this structure is MANDATORY for all backend development tasks.