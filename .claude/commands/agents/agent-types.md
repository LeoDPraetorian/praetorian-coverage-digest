# agent-types

Complete guide to all 100+ available agent types in Claude Flow for the Chariot Development Platform.

## Core Development Agents
- `general-purpose` - General-purpose agent for researching complex questions and multi-step tasks
- `refinement` - SPARC Refinement phase specialist for iterative improvement
- `pseudocode` - SPARC Pseudocode phase specialist for algorithm design
- `architecture` - SPARC Architecture phase specialist for system design
- `specification` - SPARC Specification phase specialist for requirements analysis
- `sparc-coord` - SPARC methodology orchestrator for systematic development
- `sparc-coder` - Transform specifications into working code with TDD practices
- `base-template-generator` - Create foundational templates and boilerplate code

## Core Coordination Agents (NEW)
- `coder` - Implementation specialist for writing clean, efficient code with coordination capabilities
- `planner` - Strategic planning and task orchestration agent
- `researcher` - Research coordination and information synthesis specialist
- `reviewer` - Code review coordination and quality assurance oversight
- `tester` - Testing coordination across unit, integration, and E2E test suites

## Orchestration & Planning Agents
- `knowledge-synthesizer` - Consolidate information from multiple sources
- `intent-translator` - Clarify vague or incomplete user requests

## AI & Machine Learning Specialists
- `ml-developer` - Machine learning model development, training, and deployment
- `ai-engineer` - AI/ML features, language models, recommendation systems
- `flow-nexus-neural` - Neural network training and deployment with cloud infrastructure

## Architecture & Design Specialists
- `system-architect` - System architecture and high-level technical decisions
- `security-architect` - Secure platform architecture and threat modeling
- `project-structure-architect` - Project directory layouts and information hierarchies
- `react-typescript-architect` - React TypeScript architecture and component design
- `database-architect-neo4j` - Neo4j graph database schemas for Chariot's data models
- `designer` - UI/UX design, visual design systems, and accessibility

## Backend Development Specialists
- `golang-api-developer` - Go backend APIs, REST endpoints, GraphQL resolvers
- `golang-developer` - Expert-level Go development and complex algorithms
- `go-api-optimizer` - Go API performance and concurrency patterns
- `vql-developer` - VQL queries for Praetorian Aegis Agent security operations
- `integration-developer` - Third-party service integrations and external APIs
- `yaml-developer` - YAML files for infrastructure-as-code and configuration

## Frontend Development Specialists
- `react-developer` - React frontend applications and UI features
- `react-typescript-architect` - React TypeScript architecture patterns

## Testing Specialists
- `e2e-test-engineer` - End-to-end tests using Playwright
- `integration-test-engineer` - Third-party service integrations testing
- `unit-test-engineer` - Backend services and CLI component unit tests
- `chromatic-test-engineer` - Visual regression testing with Chromatic platform
- `tdd-london-swarm` - TDD London School specialist for mock-driven development

## Code Quality & Review Specialists
- `go-security-reviewer` - Go backend code security vulnerability review
- `go-code-reviewer` - Golang-specific comprehensive code quality reviews
- `code-review-swarm` - Multi-agent comprehensive code reviews
- `code-quality` - Language agnostic code quality reviews and refactoring
- `code-explorer` - Deep codebase analysis and architectural pattern recognition
- `capability-analyzer` - Tool analysis and comprehensive report generation

## DevOps & Infrastructure Specialists
- `devops-automator` - CI/CD pipelines and cloud infrastructure automation
- `devops-deployment` - Git operations, PR creation, and production deployment
- `infrastructure-engineer` - AWS infrastructure and CloudFormation deployment
- `aws-infrastructure-specialist` - Expert AWS resource management and cost optimization
- `cicd-engineer` - GitHub Actions CI/CD pipeline creation and optimization
- `makefile-developer` - Makefile creation and build automation

## Swarm Coordination Specialists
- `hierarchical-coordinator` - Complex multi-agent workflows with hierarchical command
- `mesh-coordinator` - Peer-to-peer mesh network architectures with distributed consensus
- `adaptive-coordinator` - Dynamic topology switching with self-organizing patterns
- `task-orchestrator` - Central coordination for task decomposition and execution
- `memory-coordinator` - Persistent memory management across sessions

## Performance & Monitoring Specialists
- `perf-analyzer` - Performance bottleneck analysis and workflow optimization
- `performance-monitor` - Real-time metrics collection and SLA monitoring
- `topology-optimizer` - Dynamic swarm topology reconfiguration
- `benchmark-suite` - Comprehensive performance benchmarking
- `resource-allocator` - Adaptive resource allocation and capacity planning
- `load-balancing-coordinator` - Dynamic task distribution and load balancing

## Research & Information Specialists
- `context7-search-specialist` - Library documentation and technical problem-solving
- `web-research-specialist` - Web sources research and online data compilation

## Repository & Version Control Specialists
- `repo-architect` - Repository structure optimization and multi-repo management
- `pr-manager` - Pull request management with automated reviews and workflows
- `github-modes` - GitHub integration for workflow orchestration
- `code-review-swarm` - Intelligent code reviews beyond static analysis
- `workflow-automation` - GitHub Actions workflow automation
- `multi-repo-swarm` - Cross-repository orchestration
- `sync-coordinator` - Multi-repository synchronization
- `release-swarm` - Complex software release orchestration
- `release-manager` - Automated release coordination and deployment
- `swarm-pr` - Pull request swarm management
- `swarm-issue` - GitHub issue-based swarm coordination
- `issue-tracker` - Intelligent issue management and project coordination
- `project-board-sync` - GitHub Projects visual task management

## Project Management & Documentation Specialists
- `jira-epic-writer` - Create and improve Jira epics with company templates
- `jira-bug-filer` - Structured bug reports and categorization
- `jira-story-writer` - Create and improve Jira user stories and tasks
- `jira-reader` - Retrieve, analyze, and format Jira issue data
- `openapi-writer` - OpenAPI/Swagger documentation creation and maintenance

## Consensus & Distributed Systems Specialists
- `byzantine-coordinator` - Byzantine fault-tolerant consensus protocols
- `raft-manager` - Raft consensus algorithm with leader election
- `gossip-coordinator` - Gossip-based consensus protocols
- `crdt-synchronizer` - Conflict-free Replicated Data Types
- `quorum-manager` - Dynamic quorum adjustment and membership management
- `security-manager` - Comprehensive security for distributed consensus

## Flow Nexus Cloud Platform Specialists
- `flow-nexus-swarm` - AI swarm orchestration in Flow Nexus cloud platform
- `flow-nexus-sandbox` - E2B sandbox deployment and management
- `flow-nexus-neural` - Neural network training with Flow Nexus infrastructure
- `flow-nexus-workflow` - Event-driven workflow automation with message queues
- `flow-nexus-app-store` - Application marketplace and template management
- `flow-nexus-auth` - Authentication and user management for Flow Nexus
- `flow-nexus-payments` - Credit management and billing operations
- `flow-nexus-challenges` - Coding challenges and gamification systems
- `flow-nexus-user-tools` - User management and system utilities

## Utility & Setup Specialists
- `statusline-setup` - Configure Claude Code status line settings
- `output-style-setup` - Create Claude Code output styles
- `migration-planner` - Migration plans for command-based to agent-based systems

## Command Usage

### List Available Agents
```bash
npx claude-flow agents list
```

### Spawn Specific Agents (Use Claude Code's Task tool)
```javascript
// Concurrent agent execution pattern
Task("Backend API development", "Build REST endpoints...", "golang-api-developer")
Task("Frontend UI implementation", "Create React components...", "react-developer") 
Task("E2E test creation", "Write Playwright tests...", "e2e-test-engineer")
Task("Security review", "Analyze for vulnerabilities...", "go-security-reviewer")
```

### Agent Selection Guidelines

**For Chariot Security Platform Development:**
- `security-architect` - Security platform design
- `golang-api-developer` - Go backend APIs
- `react-typescript-architect` - Frontend architecture
- `database-architect-neo4j` - Graph database design
- `vql-developer` - Security capability development
- `e2e-test-engineer` - User workflow testing

**For Multi-Agent Coordination:**
- `hierarchical-coordinator` - Complex multi-step tasks
- `mesh-coordinator` - Distributed peer-to-peer work
- `adaptive-coordinator` - Dynamic optimization

**For Code Quality & Security:**
- `go-security-reviewer` - Security vulnerability analysis
- `code-review-swarm` - Comprehensive multi-agent review
- `unit-test-engineer` - Test suite development

This comprehensive agent ecosystem enables sophisticated AI-assisted development workflows with specialized expertise for every aspect of the Chariot Development Platform.
