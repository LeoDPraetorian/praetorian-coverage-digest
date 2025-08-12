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

**CRITICAL: ALL BACKEND DEVELOPMENT MUST FOLLOW THE 6-PHASE FUNCTIONAL PIPELINE BELOW**

### 🏭 MANDATORY 6-PHASE BACKEND FUNCTIONAL PIPELINE

**VERY IMPORTANT**: Every backend development task MUST follow the streamlined 6-phase functional pipeline. Each phase executes completely, returns control to the orchestrator, which then launches the next phase in sequence.

### 6-Phase Functional Pipeline Structure

#### Phase 1: backend-summarize (Business Analyst)
**ROLE**: Requirements analysis and functional specification
- **RESPONSIBILITY**: Break down feature requests into comprehensive functional requirements
- **EXPERTISE**: Backend system requirements, API specifications, data modeling
- **DELIVERABLE**: Complete functional requirements document with acceptance criteria
- **NEXT PHASE**: Passes requirements to Solution Architect for technical planning

#### Phase 2: backend-plan (Solution Architect)
**ROLE**: Technical planning and architecture design
- **RESPONSIBILITY**: Transform requirements into detailed technical implementation plans
- **EXPERTISE**: Go/AWS architecture, technology selection, system design
- **DELIVERABLE**: Comprehensive technical plan with component architecture and technology stack
- **NEXT PHASE**: Passes implementation plan to Senior Developer

#### Phase 3: backend-implement (Senior Developer)
**ROLE**: Core implementation and feature development
- **RESPONSIBILITY**: Build production-ready Go code, CloudFormation templates, and APIs
- **EXPERTISE**: Go development, AWS services, tabularium types, API implementation
- **DELIVERABLE**: Complete, working implementation with proper error handling
- **NEXT PHASE**: Passes implemented code to Test Engineer

#### Phase 4: backend-test (Test Engineer)
**ROLE**: Comprehensive testing and quality assurance
- **RESPONSIBILITY**: Create thorough unit and integration test suites
- **EXPERTISE**: Go testing patterns, API testing, test coverage analysis
- **DELIVERABLE**: Comprehensive test suite with high coverage and quality validation
- **NEXT PHASE**: Passes tested code to QA Engineer

#### Phase 5: backend-validate (QA Engineer)
**ROLE**: System validation and integration testing
- **RESPONSIBILITY**: Validate feature works correctly in actual technology stack
- **EXPERTISE**: System testing, performance validation, security testing
- **DELIVERABLE**: Validated feature with real-world testing and quality confirmation
- **NEXT PHASE**: Passes validated feature to DevOps Engineer

#### Phase 6: backend-commit (DevOps Engineer)
**ROLE**: Deployment and final submission
- **RESPONSIBILITY**: Deploy infrastructure, handle git operations, create PRs
- **EXPERTISE**: AWS deployment, SAM validation, git workflows, production deployment
- **DELIVERABLE**: Deployed feature with PRs created and infrastructure validated
- **FINAL RESULT**: Complete feature delivery ready for production

### Backend Workflow Auto-Orchestration

#### Claude Direct Orchestration
**CLAUDE AUTOMATICALLY DETECTS AND EXECUTES** the 6-phase pipeline when backend feature requests are detected:

**Auto-Detection Triggers:**
- "implement [API/endpoint/service] for [entity]"
- "build a backend for [feature]"
- "I need an API that [functionality]"
- "add [authentication/integration/processing] to backend"
- "create [data types/models] for [entities]"
- "integrate [external service] with Chariot"

**Automatic Execution Flow:**
```
🏭 Claude detects backend request → Auto-launch 6-Phase Pipeline

Phase 1: Task(backend-summarize) → Complete → Auto-proceed
Phase 2: Task(backend-plan) → Complete → Auto-proceed
Phase 3: Task(backend-implement) → Complete → Auto-proceed
Phase 4: Task(backend-test) → Complete → Auto-proceed
Phase 5: Task(backend-validate) → Complete → Auto-proceed
Phase 6: Task(backend-commit) → Complete → Feature Delivered ✅
```

**Claude's Orchestration Behavior:**
- **AUTO-LAUNCH**: Immediately start Phase 1 upon detecting backend feature requests
- **SEQUENTIAL EXECUTION**: Execute each phase completely before proceeding to next
- **CONTEXT PASSING**: Pass all outputs from each phase to the next phase
- **PROGRESS REPORTING**: Provide clear phase completion summaries
- **QUALITY GATES**: Ensure each phase delivers quality work before proceeding

### Team Coordination Model

#### Functional Pipeline Benefits
- **Clear Handoffs**: Each phase completes before the next begins
- **Specialized Expertise**: Each team member focuses on their domain
- **Quality Gates**: No phase proceeds until previous phase delivers quality work
- **Systematic Progress**: Predictable workflow with measurable milestones
- **Error Isolation**: Issues contained within specific phases

#### Phase Execution Standards
- **Complete Execution**: Each phase must fully complete its responsibilities
- **Quality Deliverables**: No shortcuts or incomplete work passed forward
- **Clear Communication**: Status updates and deliverable summaries required
- **Context Preservation**: All relevant information passed between phases
- **Error Recovery**: Failed phases retry with feedback before escalation

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
- **Functional Pipeline Execution**: 6 phases execute sequentially, each completing before next
- **Phase-Specific Expertise**: Each phase focuses on its specialized domain and responsibilities
- **Quality Review Gates**: Use backend-reviewer agent between each phase to validate deliverables
- **Context Preservation**: Pass all relevant information between phases
- **Pattern Reuse First**: Every phase prioritizes reusing existing Chariot patterns over creating new ones
- **Simplicity Bias**: All phases avoid overengineering and complex architectures
- **Infrastructure as Code**: Use CloudFormation for all AWS resources

### Functional Pipeline Examples

#### Example 1: New API Endpoint Implementation
**6-Phase Functional Pipeline Execution:**

1. **Claude** → Executes **Task(backend-summarize)**
   - **Business Analyst** analyzes requirements for new API endpoint
   - **Output**: Complete functional requirements with API specifications and acceptance criteria
   - **Claude automatically executes Task(backend-reviewer) to validate requirements**

2. **Claude** → Executes **Task(backend-plan)**  
   - **Solution Architect** creates technical implementation plan
   - **Research**: Technology choices, existing patterns, architecture design
   - **Output**: Detailed technical plan with Go/AWS implementation strategy
   - **Claude automatically executes Task(backend-reviewer) to validate technical plan**

3. **Claude** → Executes **Task(backend-implement)**
   - **Senior Developer** builds production-ready implementation
   - **Creates**: Go code, tabularium types, CloudFormation templates, API handlers
   - **Output**: Complete, working implementation with error handling
   - **Claude automatically executes Task(backend-reviewer) to validate implementation**

4. **Claude** → Executes **Task(backend-test)**
   - **Test Engineer** creates comprehensive test suite
   - **Creates**: Unit tests, integration tests, API endpoint tests, performance benchmarks
   - **Output**: High-coverage test suite validating all functionality
   - **Claude automatically executes Task(backend-reviewer) to validate test suite**

5. **Claude** → Executes **Task(backend-validate)**
   - **QA Engineer** validates feature in real technology stack
   - **Tests**: System integration, performance, security, real-world scenarios
   - **Output**: Validated feature confirmed to work with actual Chariot stack
   - **Claude automatically executes Task(backend-reviewer) to validate system validation**

6. **Claude** → Executes **Task(backend-commit)**
   - **DevOps Engineer** deploys and submits feature
   - **Handles**: AWS deployment, git operations, PR creation, infrastructure validation
   - **Output**: Deployed feature with PRs created and ready for production

#### Example 2: Complex Integration Feature (e.g., Okta SSO)
**6-Phase Pipeline with External Service Integration and Review Gates:**

1. **Phase 1**: Business Analyst breaks down SSO requirements, correlation logic, asset management → **Review Gate**
2. **Phase 2**: Solution Architect designs OAuth2 integration, API patterns, data flow architecture → **Review Gate**
3. **Phase 3**: Senior Developer implements Okta client, correlation services, tabularium types → **Review Gate**
4. **Phase 4**: Test Engineer creates comprehensive tests including external service mocks → **Review Gate**
5. **Phase 5**: QA Engineer validates integration with real Okta instance and end-to-end workflows → **Review Gate**
6. **Phase 6**: DevOps Engineer deploys infrastructure, handles secrets management, creates PRs

### Success Criteria

Every backend development task is considered complete only when the **6-Phase Functional Pipeline** has been fully executed:

✅ **Phase 1 (backend-summarize)**: Complete functional requirements with acceptance criteria  
✅ **Phase 2 (backend-plan)**: Detailed technical implementation plan with architecture decisions  
✅ **Phase 3 (backend-implement)**: Production-ready code with proper error handling and patterns
✅ **Phase 4 (backend-test)**: Comprehensive test suite with high coverage and quality validation
✅ **Phase 5 (backend-validate)**: System validation with real-world testing confirmation  
✅ **Phase 6 (backend-commit)**: Deployed feature with PRs created and infrastructure validated

### Critical Reminders

**FUNCTIONAL PIPELINE EXECUTION**: 
- **Backend-Orchestrator**: Executes 6 phases sequentially using Task tool
- **Each Phase**: Completes fully before returning control to orchestrator
- **Context Passing**: Each phase receives outputs from previous phase
- **Quality Gates**: No phase proceeds until previous phase delivers quality work
- **Error Handling**: Failed phases retry with feedback before escalation

**Key Principles**:
- **Sequential Execution**: Phases run one at a time, never in parallel
- **Complete Handoffs**: Each team member finishes their work before next phase
- **Quality Review Gates**: Backend-reviewer validates each deliverable before proceeding
- **Specialized Expertise**: Each phase focuses on its specific domain and responsibilities
- **Pattern Reuse Priority**: Every phase maximizes reuse of existing Chariot patterns
- **Simplicity Enforcement**: All phases avoid overengineering and complex architectures
- **Production Quality**: Every deliverable meets production standards

**Remember**: The 6-phase functional pipeline with review gates ensures systematic, high-quality backend development through proper sequential execution, quality validation, and pattern reuse. Following this structure is MANDATORY for all backend development tasks.