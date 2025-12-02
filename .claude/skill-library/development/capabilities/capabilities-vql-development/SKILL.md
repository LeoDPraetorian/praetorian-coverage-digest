---
name: capabilities-vql-development
description: Use when developing VQL artifacts - Velociraptor query language, Aegis capabilities, artifact testing
allowed-tools: Read, Write, Bash, Glob, Grep
skill-type: process
---

# VQL Development for Chariot Aegis

**You MUST use TodoWrite before starting to track all development steps.**

This skill covers Velociraptor Query Language (VQL) artifact development for the Chariot Aegis security platform. VQL artifacts define security capabilities executed on endpoints via Aegis agents.

## Quick Reference

| Task | Pattern | Example |
|------|---------|---------|
| Simple health check | Single source, execve | `CheckDiskSpace.yaml` |
| Multi-OS capability | Per-source preconditions | `VirtualisationCheck.yaml` |
| Orchestrator | Child artifact aggregation | `HealthCheck.yaml` |
| Detection artifact | Severity scoring, MITRE mapping | `ProcessInjection.yaml` |
| Server-side monitor | `type: SERVER_EVENT` with clock() | `Monitor.HealthCheck.yaml` |

## Directory Structure

```
modules/chariot-aegis-capabilities/
├── aegis-capabilities/              # VQL artifact definitions
│   ├── healthchecks/               # System health monitoring
│   │   ├── linux/
│   │   └── windows/
│   ├── management/                 # Administrative artifacts
│   ├── monitors/                   # Continuous monitoring (SERVER_EVENT)
│   ├── offsec/                     # Offensive security testing
│   │   ├── linux/ad/              # Active Directory (Bloodhound, Certipy)
│   │   ├── linux/network/         # Network analysis
│   │   ├── linux/web/             # Web scanning
│   │   └── windows/ad/            # AD testing (PingCastle, group3r)
│   └── utils/                      # Reusable utility artifacts
├── aegis-registry/                 # Go capability registration
└── devops/generator/               # JSON → YAML generator
```

## VQL Artifact Anatomy

### Complete Template

```yaml
# Header: Artifact Identification
name: Praetorian.Aegis.{OS}.{Domain}.{Function}
description: |
  Multi-line description including:
  - What the artifact detects/does
  - MITRE ATT&CK mappings (if applicable)
  - Key methods and caveats

author: Praetorian Security Team
version: 1.0.0

# Artifact Type
type: CLIENT                    # CLIENT | SERVER_EVENT | VELOCIRAPTOR

# Access Control
required_permissions:
  - EXECVE
  - READ_FILESYSTEM

# Global Precondition
precondition: SELECT OS FROM info() WHERE OS = 'linux'

# User-Configurable Parameters
parameters:
  - name: ProcessWhitelist
    description: Comma-separated processes to exclude
    type: csv                   # string | int | bool | choices | csv | upload
    default: ""
    required: false

# Query Sources
sources:
  - name: SourceName
    description: What this source collects
    precondition: SELECT OS FROM info() WHERE OS = 'windows'
    query: |
      LET var_name <= SELECT * FROM some_source
      SELECT * FROM var_name WHERE condition

# Output Schema (optional, recommended for complex artifacts)
column_types:
  - name: EventTime
    type: timestamp
  - name: Severity
    type: string
```

## Pattern 1: Simple Health Check

**Use Case**: Single system query with minimal processing

```yaml
name: Praetorian.Aegis.Linux.CheckDiskSpace
description: Checks disk space on Linux endpoints.

required_permissions:
  - EXECVE
precondition: SELECT OS FROM info() WHERE OS = 'linux'

sources:
  - query: |
      SELECT * FROM execve(argv=[
        "/bin/bash", "-c",
        "df -h | awk '$NF==\"/\"{gsub(/G/,\"\"); print $2}'"
      ])
```

## Pattern 2: Multi-OS Capability

**Use Case**: Same capability with platform-specific implementations

```yaml
name: Praetorian.Aegis.VirtualisationCheck
description: Checks CPU virtualisation support across Windows, Linux, macOS.

sources:
  # Windows Implementation
  - name: WindowsVirtCheck
    precondition: SELECT OS FROM info() WHERE OS = 'windows'
    query: |
      SELECT
        VMMonitorModeExtensions AS VMX_Support,
        VirtualizationFirmwareEnabled AS VirtualizationEnabled
      FROM wmi(query="SELECT * FROM Win32_Processor")

  # Linux Implementation
  - name: LinuxVirtCheck
    precondition: SELECT OS FROM info() WHERE OS = 'linux'
    query: |
      LET cpuinfo <= read_file(filename="/proc/cpuinfo")
      SELECT
        cpuinfo =~ "vmx" AS VMX_Flag,
        cpuinfo =~ "svm" AS SVM_Flag
      FROM scope()

  # macOS Implementation
  - name: MacOSVirtCheck
    precondition: SELECT OS FROM info() WHERE OS = 'darwin'
    query: |
      SELECT Stdout =~ "1" AS VirtualizationSupported
      FROM execve(argv=["sysctl", "kern.hv_support"])
```

## Pattern 3: Orchestrator Artifact

**Use Case**: Aggregate results from multiple child artifacts

```yaml
name: Praetorian.Aegis.Linux.HealthCheck
description: Orchestrates multiple health checks.

required_permissions:
  - EXECVE
precondition: SELECT OS FROM info() WHERE OS = 'linux'

sources:
  - query: |
      # Call child artifacts
      LET DISKSPACE <= SELECT * FROM Artifact.Praetorian.Aegis.Linux.CheckDiskSpace()
      LET MEMORY <= SELECT * FROM Artifact.Praetorian.Aegis.Linux.CheckMemory()
      LET CLOUDFLARE <= SELECT * FROM Artifact.Praetorian.Aegis.Linux.CloudFlareConnectivity()

      # Aggregate into unified structure
      SELECT {
          SELECT Stdout FROM DISKSPACE
      } AS DiskSpace,
      {
          SELECT Stdout FROM MEMORY
      } AS Memory,
      {
          SELECT Stdout FROM CLOUDFLARE
      } AS CloudFlare
      FROM scope()
```

## Pattern 4: Detection Artifact with Severity Scoring

**Use Case**: Security detection with MITRE mapping and false positive filtering

```yaml
name: Praetorian.Aegis.Windows.ProcessInjection
description: |
  Detects process injection techniques.
  MITRE ATT&CK: T1055 (Process Injection)

parameters:
  - name: ProcessWhitelist
    type: csv
    default: ""
  - name: MonitorDuration
    type: int
    default: "300"

sources:
  - name: ProcessHollowing
    description: Detects process hollowing via memory unmapping
    query: |
      SELECT
        System.TimeStamp AS EventTime,
        System.ProcessName AS SourceProcess,
        EventData.TargetImage AS TargetProcess,
        'Process Hollowing' AS TechniqueName,
        'T1055.012' AS MitreTechnique,
        format(format='Suspicious memory unmapping in %v targeting %v',
               args=[SourceProcess, TargetProcess]) AS Details
      FROM watch_etw(
        guid="{3d6fa8d0-fe05-11d0-9dda-00c04fd7ba7c}",
        provider="Microsoft-Windows-Kernel-Process"
      )
      WHERE NOT SourceProcess IN ProcessWhitelist

  - name: AggregatedDetections
    description: Unified results with severity
    query: |
      LET all_detections = SELECT * FROM chain(
        a={ SELECT * FROM source(source="ProcessHollowing") },
        b={ SELECT * FROM source(source="DLLInjection") }
      )

      SELECT *,
        if(condition=TechniqueName = "Process Hollowing",
           then="CRITICAL",
           else="MEDIUM") AS Severity
      FROM all_detections
      ORDER BY Severity DESC

column_types:
  - name: EventTime
    type: timestamp
  - name: Severity
    type: string
```

## Pattern 5: Server-Side Monitor

**Use Case**: Scheduled server-side monitoring

```yaml
name: Praetorian.Aegis.Monitor.HealthCheck
type: SERVER_EVENT

sources:
  - query: |
      # Trigger every hour
      LET schedule = SELECT * FROM clock(period=3600)

      SELECT {
        SELECT hunt(
          description="Hourly Aegis Health Check",
          artifacts=['Praetorian.Aegis.Linux.HealthCheck'],
          expires=now() + 180
        ) FROM scope()
      }
      FROM schedule
```

## Common VQL Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `info()` | Get endpoint info | `SELECT OS FROM info()` |
| `execve()` | Execute command | `FROM execve(argv=["ls"])` |
| `wmi()` | Query Windows WMI | `FROM wmi(query="SELECT...")` |
| `watch_etw()` | Monitor ETW events | `FROM watch_etw(guid="...")` |
| `read_file()` | Read file contents | `read_file(filename="/etc/passwd")` |
| `glob()` | Find files | `FROM glob(globs="*.txt")` |
| `hunt()` | Dispatch to clients | `hunt(artifacts=[...])` |
| `clock()` | Schedule triggers | `FROM clock(period=3600)` |
| `chain()` | Combine sources | `chain(a={...}, b={...})` |

## VQL Syntax Patterns

### Variable Declaration

```vql
LET my_var <= SELECT * FROM source  -- Lazy evaluation
LET processed = SELECT * FROM my_var WHERE x > 10
SELECT * FROM processed
```

### Conditional Logic

```vql
SELECT
  field1,
  if(condition=field1 > 100, then="HIGH", else="LOW") AS Severity
FROM data_source
```

### Regex Matching

```vql
WHERE FieldName =~ "pattern.*here"         -- Case-sensitive
  AND FieldName =~ "(?i)case-insensitive"  -- Case-insensitive
  AND NOT FieldName =~ "exclude_pattern"   -- Negation
```

### Array Membership

```vql
LET whitelist = ('process1.exe', 'process2.exe')
WHERE NOT SourceProcess IN whitelist
```

## Naming Conventions

**Artifact Name Format**: `Praetorian.Aegis.{OS}.{Domain}.{Function}`

- `Praetorian.Aegis.Linux.HealthCheck` - Linux orchestrator
- `Praetorian.Aegis.Windows.AD.PingCastle` - Windows AD tool
- `Praetorian.Aegis.Monitor.HealthCheck` - Server-side monitor

**Config.JSON Name Format**: `{lowercase-kebab-case}`

- `windows-ad-pingcastle`
- `linux-ad-certipy`

## Testing Checklist

Before deployment:
- [ ] All sources return expected data
- [ ] Preconditions correctly filter by OS
- [ ] Parameters have sensible defaults
- [ ] Whitelisting/filtering works correctly
- [ ] MITRE mappings are accurate (if applicable)
- [ ] Performance is acceptable (test with real endpoints)
- [ ] Error handling doesn't expose sensitive data

## References

- [modules/chariot-aegis-capabilities/](../../../../modules/chariot-aegis-capabilities/) - VQL artifact source
- [Velociraptor Documentation](https://docs.velociraptor.app/docs/vql/) - Official VQL reference
- [MITRE ATT&CK](https://attack.mitre.org/) - Technique mappings
