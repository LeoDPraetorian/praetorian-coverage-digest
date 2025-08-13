# Claude Configuration for Chariot Development Platform

This file contains configuration and context for the Claude Code assistant working on the Chariot security platform development environment.

## Project Overview

Chariot is a comprehensive attack surface management platform consisting of multiple modules:

- **chariot**: Core backend services (Go) and CLI tools
- **janus**: Security testing frameworks and tools
- **nebula**: Cloud security reconnaissance and analysis tools
- **tabularium**: Data management and API layer
- **nuclei-templates**: Security scanning templates
- **praetorian-cli**: Command-line interface tools

## Development Workflow Philosophy

**NEW APPROACH**: We use an **organic, flexible development workflow** that adapts to the specific needs of each task rather than following a rigid predetermined sequence. This approach works effectively for backend and CLI development.

### Core Development Principles

#### 🎯 Goal-Oriented Development
- Start with **clear success criteria** and work backwards to determine the best approach
- Allow the natural flow of the task to determine which tools and techniques to use
- Adapt the process based on what the specific task requires

#### 🧰 Tool-Based Rather Than Phase-Based
Instead of rigid phases, we have a **toolkit of specialized capabilities** that can be used as needed:

**Research & Discovery Tools:**
- **requirements-researcher**: Analyzes requirements, explores existing patterns, researches best practices
- **codebase-explorer**: Investigates existing code, capabilities, and architectural patterns
- **web-researcher**: Searches for external documentation, APIs, and integration patterns

**Implementation Tools:**
- **go-developer**: Writes Go backend code, APIs, CLI tools, CloudFormation templates
- **integration-specialist**: Handles external service integrations and data flows
- **infrastructure-engineer**: Manages AWS resources, SAM templates, deployment configurations

**Quality Assurance Tools:**
- **test-engineer**: Creates unit tests, integration tests, and test automation
- **code-reviewer**: Reviews code quality, security, and adherence to standards
- **validator**: Tests features against real systems and validates end-to-end functionality
- **deployment-manager**: Handles git operations, PR creation, and production deployment

### Flexible Workflow Process

#### Phase 1: Discovery & Planning
**Objective**: Understand the problem and define success criteria

**Available Tools**: Use any combination as needed
- Research requirements and existing patterns
- Explore codebase for reusable components
- Define clear acceptance criteria
- Create implementation strategy
- Identify potential challenges and solutions

#### Phase 2: Dynamic Implementation
**Objective**: Build the solution using the most appropriate tools for the task

**Adaptive Process**: 
- Select tools based on what the task requires (backend, CLI, integration, etc.)
- Use tools in whatever order makes sense for the specific problem
- Switch between tools fluidly as needs evolve
- Iterate on implementation based on feedback and discoveries

#### Phase 3: Validation & Delivery
**Objective**: Ensure quality and deploy the solution

**Quality Gates**:
- Comprehensive testing (unit, integration, end-to-end)
- Code review and security validation
- Real-world testing against actual systems
- Deployment and final verification

### Technology Stack Context

#### Backend Technologies
- **Language**: Go
- **Cloud**: AWS (Lambda, CloudFormation, S3, etc.)
- **Data**: Tabularium types and interfaces
- **Architecture**: Microservices with SAM (Serverless Application Model)

#### CLI Technologies
- **Language**: Go
- **CLI Framework**: Cobra or similar
- **Configuration**: YAML/JSON config files
- **Distribution**: Binary executables

#### Key Directories
- `/backend/`: Go-based backend services
- `/backend/pkg/`: Shared Go packages and utilities  
- `/backend/cmd/`: Command-line applications
- `/backend/cf-templates/`: CloudFormation infrastructure templates
- `/cli/`: Command-line interface applications

### Chariot Stack Setup

#### Quick Stack Deployment
For setting up a complete Chariot development environment:

```bash
# Deploy complete stack (CloudFormation backend + React UI)
make chariot

# Generate test user with UUID-based credentials
make user
```

**What this does:**
1. **make chariot**: Deploys AWS CloudFormation stack, builds Docker containers, starts React UI on https://localhost:3000
2. **make user**: Creates AWS Cognito user with UUID-based email/password, stores credentials in root `.env` file

**Credentials Format:**
- Email: `{uuid}@praetorian.com`
- Password: `{uuid-without-dashes}Aa1!` (meets AWS Cognito policy)
- Environment variables: `PRAETORIAN_CLI_USERNAME` and `PRAETORIAN_CLI_PASSWORD`

**Important Notes:**
- `.env` file is gitignored to protect credentials
- Credentials are compatible with Praetorian CLI authentication
- UI accessible at https://localhost:3000 immediately after deployment

### Development Standards

#### Code Quality Requirements
- **Linting**: Run `make lint` before committing
- **Testing**: Run `make test` to execute all tests
- **Type Checking**: Ensure code compiles without errors
- **Documentation**: Follow language-specific documentation conventions

#### Security Considerations
- **Defensive Security Only**: Only assist with defensive security tasks
- **No Malicious Code**: Refuse to create or improve potentially malicious code
- **Security Best Practices**: Never expose secrets or credentials in code

### Workflow Guidelines

#### ✅ DO:
- **Use agents proactively**: ALWAYS launch appropriate specialized agents for every task
- **Start with success criteria**: Use requirements-researcher to define what "done" looks like
- **Leverage agent expertise**: Trust agent specialization over general approaches
- **Orchestrate multiple agents**: Use concurrent and sequential patterns for comprehensive results
- **Reuse existing patterns**: Use codebase-explorer to discover and leverage existing components
- **Maintain quality gates**: Use test-engineer, code-reviewer, and validator for all code

#### ❌ DON'T:
- **Skip agent usage**: Never perform tasks directly when a specialized agent is available
- **Work without discovery**: Don't implement without using codebase-explorer to find existing patterns
- **Force rigid sequences**: Don't follow a predetermined order if it doesn't fit the task
- **Skip quality agents**: Never deploy code without test-engineer, code-reviewer, and validator
- **Ignore agent recommendations**: Trust specialized agent expertise over general approaches

### Example Workflows

**Note**: For all development work, ensure Chariot stack is set up first using `make chariot` and `make user` to provide a working environment for testing and validation.

#### Backend API Development (Agent-First)
1. **requirements-researcher** + **codebase-explorer** (concurrent) → analyze requirements and existing patterns
2. **go-developer** + **test-engineer** (parallel) → implement handlers and tests simultaneously  
3. **code-reviewer** + **validator** → quality assessment and real-world testing
4. **deployment-manager** → CloudFormation deployment and documentation

#### CLI Tool Development (Agent-First)
1. **requirements-researcher** → analyze CLI requirements and user experience needs
2. **codebase-explorer** → identify existing CLI patterns and command structures
3. **go-developer** + **test-engineer** (parallel) → implement commands and tests
4. **validator** → test functionality and user experience
5. **deployment-manager** → package, distribute, and document

#### Integration Project (Agent-First) 
1. **web-researcher** → research external service APIs and best practices
2. **codebase-explorer** → find existing integration patterns
3. **integration-specialist** → implement data flow and authentication
4. **go-developer** → create CLI management interfaces
5. **test-engineer** + **validator** (parallel) → comprehensive testing
6. **deployment-manager** → deploy and validate with real services

### Agent-First Development Approach

**CRITICAL: Agents should ALWAYS be used when applicable.** The specialized agent system is designed to provide superior results through expert knowledge and focused capabilities.

#### Mandatory Agent Usage
**Claude must proactively use specialized agents for all tasks that fall within their expertise areas:**

- **ALL Research Tasks**: ALWAYS use requirements-researcher, codebase-explorer, or web-researcher
- **ALL Implementation Tasks**: ALWAYS use go-developer, integration-specialist, or infrastructure-engineer  
- **ALL Quality Assurance**: ALWAYS use test-engineer, code-reviewer, or validator
- **ALL Deployment Tasks**: ALWAYS use deployment-manager

#### When to Use Each Agent

**Research & Discovery (Use First):**
- **requirements-researcher**: ANY requirement analysis, success criteria definition, or pattern research
- **codebase-explorer**: ANY code exploration, pattern identification, or architectural analysis
- **web-researcher**: ANY external research, API documentation, or best practice investigation

**Implementation (Use for All Development):**
- **go-developer**: ANY Go code, backend services, CLI tools, or infrastructure code
- **integration-specialist**: ANY external service connections, API integrations, or data flows
- **infrastructure-engineer**: ANY AWS resources, CloudFormation, deployment configurations

**Quality Assurance (Use for All Code):**
- **test-engineer**: ANY testing requirements - unit, integration, or end-to-end tests
- **code-reviewer**: ANY code quality assessment, security review, or standards compliance
- **validator**: ANY real-world testing, system validation, or end-to-end verification

**Deployment & Operations:**
- **deployment-manager**: ANY git operations, PR creation, CI/CD, or production deployment

#### Agent Orchestration Patterns

**Concurrent Pattern**: Use multiple agents simultaneously
- Launch requirements-researcher + codebase-explorer for comprehensive discovery
- Run go-developer + test-engineer + code-reviewer in parallel during implementation
- Coordinate validator + deployment-manager for release validation

**Sequential Pattern**: Chain agents for dependent tasks
- requirements-researcher → go-developer → test-engineer → validator → deployment-manager

**Group Chat Pattern**: Multiple agents collaborating on complex decisions
- code-reviewer + test-engineer + validator for comprehensive quality assessment

### Success Metrics

A development task is complete when:

✅ **Requirements are fully met** with clear acceptance criteria satisfied  
✅ **Code quality standards** are maintained (tests, linting, security)  
✅ **Integration works** with existing Chariot systems and patterns
✅ **Documentation is complete** for significant changes or new features
✅ **Deployment is successful** and validated in appropriate environments

### Key Reminders

- **Flexibility is key**: Adapt the process to fit the task, not the other way around
- **Quality is non-negotiable**: Maintain high standards regardless of approach
- **Collaboration over silos**: Tools work together fluidly rather than in isolation
- **Continuous improvement**: Learn from each project to improve future workflows
- **User-focused**: Always keep the end user and system reliability in mind

This organic approach allows for maximum flexibility while maintaining the high quality and reliability that Chariot requires.