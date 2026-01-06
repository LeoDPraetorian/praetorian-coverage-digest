# Interface Layer

[<- Back to Overview](../OVERVIEW.md)

> **Implementation Status**: :white_check_mark: MOSTLY COMPLETE (85%)
>
> - GUI (Web): :white_check_mark: Complete - React 19 + TypeScript, 80+ components, 19 feature sections
> - CLI: :white_check_mark: Complete - Python Click framework, 22 command handlers
> - Burp Suite Plugin: :x: Not started - only skill template exists, no code
> - Cursor/MCP: :white_check_mark: Complete - full MCP server + TypeScript wrappers
> - Platform APIs: :white_check_mark: Complete - 119+ Lambda endpoints, REST architecture
> - PlexTrac: :white_check_mark: Complete - full integration with UI components
>
> **Key Finding**: Core user interfaces are production-ready. Burp Suite plugin is the only major gap.

The Interface Layer provides all human-computer interaction points for the Chariot platform, enabling operators to monitor, control, and interact with the platform's capabilities through multiple channels tailored to different use cases and user preferences.

## Table of Contents

- [Overview](#overview)
- [Graphical User Interface (GUI)](#graphical-user-interface-gui)
- [Command-Line Interface (CLI)](#command-line-interface-cli)
- [Burp Suite Chariot Plugin](#burp-suite-chariot-plugin)
- [Cursor and MCP Integration](#cursor-and-mcp-integration)
- [Platform APIs](#platform-apis)
- [Reporting Integration (PlexTrac)](#reporting-integration-plextrac)

---

## Overview

The UI Interface is the primary human-computer interface for Chariot, providing operators with the necessary tools for monitoring, oversight, and direct interaction with the platform's capabilities.

```

                     Interface Layer



     GUI        CLI       Burp      Cursor
    (Web)    chariot-    Plugin      + MCP
               cli




                          v

                   Platform API


                          v

                     PlexTrac
                    Reporting



```

---

## Graphical User Interface (GUI)

The web-based GUI provides a comprehensive view of all platform activities.

### Core Features

| Feature                       | Description                                              |
| ----------------------------- | -------------------------------------------------------- |
| **Dashboards**                | Situational awareness across all operations              |
| **Asset Management**          | Detailed views for managing discovered assets            |
| **Findings Management**       | Review and triage security findings                      |
| **Attack Path Visualization** | Understanding engagement outcomes and kill chains        |
| **Agent Interaction**         | Conversational, Cursor-like interface with Planner Agent |
| **Workflow Builder**          | Visual creation of custom attack chains                  |

### Primary Use Cases

1. **Monitoring**: Real-time visibility into agent activities and scan progress
2. **Oversight**: Review AI decisions and approve high-risk actions
3. **Analysis**: Explore attack surface and investigate findings
4. **Configuration**: Set up engagements, scopes, and constraints
5. **Reporting**: Generate and export assessment results

### Future Enhancements

- Enhanced Attack Path Visualization
- Advanced Query Builder for graph exploration
- Customer Management Dashboard
- Workflow UI Builder (n8n-style interface)

---

## Command-Line Interface (CLI)

The `chariot-cli` offers a powerful, terminal-based interface for power users and automation scripts.

### Key Capabilities

```bash
# Launch agent-led assessments
chariot assess --target example.com --scope external

# Monitor running workflows
chariot workflow status --trace-id abc123

# Manage platform configurations
chariot config set --key rate_limit --value 100

# Execute specific capabilities
chariot exec --capability nuclei-scan --target https://example.com

# Query attack surface
chariot query --type assets --filter "status=active"
```

### Use Cases

| Use Case              | Description                        |
| --------------------- | ---------------------------------- |
| **Automation**        | Script-driven security operations  |
| **CI/CD Integration** | Security testing in pipelines      |
| **Bulk Operations**   | Mass asset management and scanning |
| **Power Users**       | Efficient command-line workflows   |
| **Remote Access**     | SSH-based platform interaction     |

---

## Burp Suite Chariot Plugin

> **[Not Implemented]**: Only a skill template exists. No actual plugin code has been written.

A dedicated Burp Suite extension serving as a critical interface between manual testing workflows and the Chariot platform.

### Core Functions

1. **Traffic Capture**
   - Capture HTTP(S) request/response pairs during manual testing
   - Provide visibility into manual testing activities
   - Enable correlation between manual and automated findings

2. **Flagging and Analysis**
   - Engineers flag specific request/response pairs for AI analysis
   - Direct submission to Chariot agents for investigation
   - Priority queuing for high-interest traffic

3. **Finding Submission**
   - Direct submission of confirmed vulnerabilities to reporting pipeline
   - Labeled data generation for future model training
   - One-click PlexTrac integration

4. **Real-Time Insights**
   - Live connection with Chariot backend services
   - AI-assisted insights during manual testing
   - Context-aware suggestions based on traffic patterns

### Cross-Domain Synergy

```

   Burp Suite    > Chariot Backend
  Manual Testing <   AI Analysis


         v                       v

  Source Code           Dynamic Test
   Analysis      >   Strategies

```

The plugin creates a bi-directional communication channel between manual testing workflows and Chariot's AI capabilities, allowing human expertise to guide and enhance AI-driven analysis.

---

## Cursor and MCP Integration

Chariot directly integrates with the Cursor development environment through a "Chariot Tool" using the Model Context Protocol (MCP).

### Integration Architecture

```

                    Cursor Environment

                Cursor Agent (User)

                        v

                 Chariot Tool



                          MCP Protocol
                         v

                  Chariot Backend

    MCP Server  >    Agora     >  Janus/
                       (Registry)         Aegis


```

### Request Flow

1. Operator instructs Cursor agent to use Chariot tool
2. Cursor client communicates with Chariot-hosted MCP Server
3. Chariot backend receives request
4. Agora registry validates and routes capability
5. Task dispatched to correct execution service (Janus or Aegis)
6. Results returned through MCP to Cursor

### Benefits

| Benefit                     | Description                                       |
| --------------------------- | ------------------------------------------------- |
| **Cloud-Powered Execution** | Offload intensive tasks to Chariot infrastructure |
| **Centralized Telemetry**   | Capture structured data for AI model training     |
| **Unified Tooling**         | Single interface for PS and MS teams              |
| **Platform Adoption**       | Drive engagement through existing workflows       |

---

## Platform APIs

External APIs for integration with other systems and programmatic access to Chariot capabilities.

### API Categories

| Category           | Purpose                       | Examples                      |
| ------------------ | ----------------------------- | ----------------------------- |
| **Discovery API**  | Query available capabilities  | List tools, workflows, agents |
| **Execution API**  | Request capability execution  | Run scans, trigger workflows  |
| **Management API** | Configure platform settings   | Scope management, constraints |
| **Data API**       | Access findings and assets    | Query graph, export results   |
| **ML API**         | Access trained model insights | Risk scoring, recommendations |

### Authentication and Security

- OAuth 2.0 / API key authentication
- Role-based access control
- Scope-limited tokens
- Audit logging for all API calls

---

## Reporting Integration (PlexTrac)

Standardized reporting mechanism for findings generated by Chariot capabilities.

### Integration Flow

```
Chariot Capability

        v

 Finding (Schema)
  - Normalized
  - Validated


         v

 Registry Mapping
  (Agora)


         v

  PlexTrac Entry
  - Formatted
  - Categorized

```

### Mapping Features

- **Automatic Normalization**: Findings converted to PlexTrac schema
- **Centralized Metadata**: Mapping rules managed via registry
- **Custom Templates**: Organization-specific report formatting
- **Evidence Attachment**: Screenshots, logs, and proof of concept
- **Severity Mapping**: Consistent risk scoring across findings
