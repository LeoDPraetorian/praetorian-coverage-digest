# Operational Fields (Never Modify Without Approval)

**Complete catalog of Nighthawk profile fields that should NEVER be modified without explicit user approval, with explanations of why they're operational and what breaks if changed.**

---

## Why These Fields Are Operational

**Operational fields** control:
- C2 functionality (connection, communication protocols)
- Beacon timing (affects detection surface, operational rhythm)
- EDR evasion techniques (70+ interconnected OPSEC settings)
- Code injection behavior (methods, memory usage, execution)

**Modifying these without approval can**:
- ❌ Break C2 connectivity
- ❌ Reduce OPSEC effectiveness
- ❌ Introduce agent instability
- ❌ Trigger detection (by disabling evasion techniques)
- ❌ Cause operational failures during engagement

---

## Connection Level Fields

### api.host

**Location**: `c2-profile.api.host`

**Purpose**: IP address or hostname of Nighthawk operations server

**Why Operational**: Changing this disconnects agent from C2 server

**When to Modify**: Only when deploying to different operations server for engagement-specific infrastructure

**Example**:
```json
{
  "api": {
    "host": "127.0.0.1"  // ❌ Never change without approval
  }
}
```

**What Breaks**: Agent cannot connect to C2, no commands received, no results returned

### api.port

**Location**: `c2-profile.api.port`

**Purpose**: Port number for operations server API

**Why Operational**: Changing this disconnects agent from C2 server

**Example**:
```json
{
  "api": {
    "port": 8888  // ❌ Never change without approval
  }
}
```

**What Breaks**: Same as `api.host` - connection failure

### strategy

**Location**: `c2-profile.strategy`

**Purpose**: C2 endpoint type to be created by Nighthawk server

**Why Operational**: Changing this changes the entire C2 channel type

**Supported Values**: `"http"` (only built-in strategy currently)

**Example**:
```json
{
  "strategy": "http"  // ❌ Never change without approval
}
```

**What Breaks**: C2 server may not support alternative strategy, agent-server protocol mismatch

---

## Timing Level Fields

### general-config.settings.interval

**Location**: `c2-profile.general-config.settings.interval`

**Purpose**: Beacon sleep time in seconds between C2 communications

**Why Operational**:
1. **Detection Surface**: Longer intervals = less frequent beacons = lower detection risk but slower operator response
2. **Self-Encryption Trigger**: If `interval` > `opsec.self-encrypt-after`, agent self-encrypts during sleep
3. **Operational Rhythm**: Operators plan around beacon frequency

**Example**:
```json
{
  "settings": {
    "interval": 10  // ❌ Never change without approval
  }
}
```

**What Breaks**:
- Too short (< 5 sec): High beacon frequency, increased detection risk
- Too long (> 60 sec): Slow operator response, may miss time-sensitive commands
- Crosses self-encrypt-after threshold: Changes memory encryption behavior unexpectedly

**User Approval Required**: Discuss trade-offs (OPSEC vs. responsiveness) before modifying

### general-config.settings.jitter

**Location**: `c2-profile.general-config.settings.jitter`

**Purpose**: Percentage to randomly increase interval (0-100)

**Why Operational**:
1. **Timing Randomization**: Prevents predictable beacon timing that aids detection
2. **OPSEC Profile**: Jitter percentage affects statistical detectability

**Example**:
```json
{
  "settings": {
    "jitter": 20  // ❌ Never change without approval
  }
}
```

**Calculation**: `interval=10, jitter=20` → actual sleep = random(10, 12) seconds

**What Breaks**:
- Too low (< 10%): Predictable timing, easier to fingerprint
- Too high (> 50%): Unpredictable behavior, may affect operational planning

**User Approval Required**: Jitter is carefully chosen in baseline profile for OPSEC balance

---

## OPSEC Level Fields (70+ Settings)

**Location**: `c2-profile.general-config.opsec.*`

**Why Operational**: These 70+ settings form an **interconnected system** for EDR evasion. Modifying one can affect others. Changing these without deep understanding can break agent functionality or reduce OPSEC effectiveness.

### Loader Configuration (Do Not Modify)

**loader-strategy** - How reflective loader allocates memory
- Values: "winapi", "native", "syscalls", "threadpool"
- Default: "syscalls"
- **Why**: Affects detection surface (syscalls = more OPSEC, winapi = more compatible)

**loader-loadlib** - How dependencies are loaded
- Values: "winapi", "threadpool", "darkload"
- Default: "winapi"
- **Why**: Affects image load telemetry (darkload = no events, winapi = events visible)

**loader-getproc** - How API addresses are resolved
- Values: "winapi", "native", "threadpool"
- Default: "native"
- **Why**: Affects EDR hook evasion during loader execution

**loader-disable-pi-callback** - Disable ProcessInstrumentationCallback during load
- Values: true/false
- Default: true
- **Why**: PI callback can intercept syscalls from virtual memory

**loader-indirect-syscalls** - Proxy syscalls via ntdll gadget during load
- Values: true/false
- Default: true
- **Why**: Evades detection of syscalls from non-ntdll memory

**loader-unhook** - Unhook DLLs before reflective load
- Values: true/false
- Default: true
- **Why**: Removes EDR hooks before agent execution

**loader-erase-keystub** - Erase keying shellcode after load
- Values: true/false
- Default: true
- **Why**: Removes IOC (executable keying stub) from memory

### Syscall Configuration (Do Not Modify)

**use-syscalls** - Use direct syscalls instead of ntdll exports
- Values: true/false
- Default: true
- **Why**: Bypasses userland hooks placed by EDR on ntdll exports

**use-syscalls-x86** - Enable syscalls for x86 agents
- Values: true/false
- Default: true
- **Why**: x86 syscalls have different calling convention, this enables them

**indirect-syscalls** - Execute syscall via ntdll gadget
- Values: true/false
- Default: true
- **Why**: Makes syscall appear to originate from ntdll (where syscalls belong), not implant memory

**indirect-syscalls-from-dlls** - DLLs to source syscall gadgets from
- Values: string[] (partial DLL names, e.g., `["umppc", "cylance"]`)
- Default: `[]`
- **Why**: Some EDR DLLs explicitly allow syscalls from their own memory - leverage this

**syscalls-spoof-ret-dlls** - DLLs to spoof return address from
- Values: string[] (partial DLL names)
- Default: `[]`
- **Why**: EDR may validate syscall caller via return address - spoof to evade

### Unhooking Configuration (Do Not Modify)

**unhook-dlls** - DLLs to unhook during initialization
- Values: string[] (e.g., `["kernel32.dll", "ntdll.dll", "kernelbase.dll", "winhttp.dll"]`)
- Default: `["kernel32.dll", "ntdll.dll", "kernelbase.dll", "winhttp.dll"]`
- **Why**: Removes EDR hooks on common API DLLs

**unhook-syscalls** - Unhook syscall stubs in ntdll
- Values: true/false
- Default: true
- **Why**: EDR may hook syscall stubs - unhooking enables clean syscall execution

**unhook-via-native** - Use native API for unhooking
- Values: true/false
- Default: true
- **Why**: WinAPI may be hooked (catch-22), native API + syscalls avoid this

**unhook-using-wpm** - Use WriteProcessMemory for unhooking
- Values: true/false
- Default: true
- **Why**: Some EDR hook VirtualProtect - using WPM bypasses this

**unhook-clear-guard** - Clear PAGE_GUARD traps during unhooking
- Values: true/false
- Default: true
- **Why**: EDR may use guard pages to detect unhooking - clearing prevents triggering

### Self-Encryption Configuration (Do Not Modify)

**self-encrypt-mode** - Encryption strategy during sleep
- Values: "off", "stub", "no-stub-rop", "no-stub-timer", "no-stub-regwait"
- Default: "no-stub-timer" (most OPSEC)
- **Why**: Different strategies have different stability/OPSEC trade-offs

**self-encrypt-mode-x86** - Override encryption strategy for x86 agents
- Values: Same as self-encrypt-mode
- Default: "no-stub-rop"
- **Why**: x86 timer-based encryption less stable, ROP is safer

**self-encrypt-mode-x64** - Override encryption strategy for x64 agents
- Values: Same as self-encrypt-mode
- Default: "no-stub-timer"
- **Why**: x64 timer-based encryption more stable

**self-encrypt-after** - Minimum interval for encryption to trigger
- Values: number (seconds)
- Default: 5
- **Why**: Self-encryption is expensive (500-1000ms CPU time), only for longer sleeps

**self-encrypt-while-listening** - Encrypt during P2P listening
- Values: true/false
- Default: true
- **Why**: P2P agents should self-encrypt between servicing connections

**self-encrypt-evade-detections** - Additional threadpool evasion techniques
- Values: true/false
- Default: true
- **Why**: Bypasses detection of threadpool timer-based encryption

**reapply-opsec-on-self-encrypt** - Re-run unhooking before/after encryption
- Values: true/false
- Default: true
- **Why**: EDR may re-hook DLLs periodically - reapplication defeats this

### Detection Evasion Configuration (Do Not Modify)

**patch-etw-event** - Patch NtTraceEvent to reduce ETW telemetry
- Values: true/false
- Default: true
- **Why**: ETW events feed EDR drivers - patching reduces telemetry

**patch-amsi** - Patch AmsiScanBuffer to evade AV scanning of .NET assemblies
- Values: true/false
- Default: true
- **Why**: AMSI scans .NET assemblies loaded in-process - patching prevents scanning

**disable-pi-callback** - Clear ProcessInstrumentationCallback
- Values: true/false
- Default: true
- **Why**: PI callback intercepts syscalls made from user-space

**clear-dll-notifications** - Clear DLL load notification callbacks
- Values: true/false
- Default: true
- **Why**: EDR uses DLL notifications to intercept loads - clearing prevents interception

**clear-veh-on-unhook** - Replace vectored exception handlers during unhooking
- Values: true/false
- Default: false
- **Why**: Guard pages + VEH can detect unhooking - replacement defeats this

**clear-hwbp-on-unhook** - Clear hardware breakpoints during unhooking
- Values: true/false
- Default: true
- **Why**: Hardware breakpoints can intercept unhooking - clearing prevents triggering

**use-hwbp-for** - Install patches via hardware breakpoints
- Values: string[] (e.g., `["patch-etw-event", "patch-amsi"]`)
- Default: `["patch-etw-event", "patch-amsi"]`
- **Why**: Hardware breakpoint patching = no memory modification (harder to detect)

### Thread Obfuscation Configuration (Do Not Modify)

**masquerade-thread-stacks** - Overwrite thread contexts during encryption
- Values: true/false
- Default: true
- **Why**: Stack traces appear legitimate (not pointing to implant memory)

**use-threadpool** - Use threadpool API for thread creation
- Values: true/false
- Default: true
- **Why**: Evades kernel-side thread creation callbacks

**sleep-mode** - How agent sleeps at rest
- Values: "sleep", "delay", "wait-single", "wait-multiple", "wait-signal"
- Default: "wait-single"
- **Why**: Different sleep modes have different detection signatures

**call-stack-masking** - Mask call stacks during execution
- Values: true/false
- Default: true
- **Why**: Prevents stack walking from revealing implant memory

### Memory Management Configuration (Do Not Modify)

**encrypt-heap-mode** - Heap memory encryption during sleep
- Values: "off", "implant", "implant+zero"
- Default: "implant"
- **Why**: Protects heap allocations from memory scanners

**backing-module** - Migrate into legitimate DLL memory
- Values: object `{"x64": "dll-name", "x86": "dll-name"}`
- Default: `{"x64": "chakra.dll", "x86": "chakra.dll"}`
- **Why**: Prevents unbacked executable memory (all implant memory backed by legitimate DLL)

**stomp-pe-header** - Overwrite PE header in memory
- Values: true/false
- Default: true
- **Why**: Hides PE signature from memory scanners

**darkload-dll-*** - Dark loading configuration (multiple related settings)
- **Why**: Complex, interconnected settings for DLL loading without image load events

### Complete OPSEC Settings List (Never Modify)

**Loader (8 settings)**:
1. `loader-strategy` - Memory allocation method
2. `loader-loadlib` - Dependency loading method
3. `loader-getproc` - API resolution method
4. `loader-disable-pi-callback` - PI callback disable during load
5. `loader-indirect-syscalls` - Syscall indirection during load
6. `loader-unhook` - Unhook before load
7. `loader-unhook-clear-guard` - Clear guard pages during load unhook
8. `loader-avoid-heapalloc` - Avoid heap allocation during load

**Syscalls (6 settings)**:
1. `use-syscalls` - Direct syscall usage
2. `use-syscalls-x86` - Syscalls for x86
3. `indirect-syscalls` - Syscall indirection via ntdll
4. `indirect-syscalls-from-dlls` - DLLs for syscall gadgets
5. `syscalls-spoof-ret-dlls` - DLLs for return address spoofing

**Unhooking (10 settings)**:
1. `unhook-dlls` - DLLs to unhook
2. `unhook-syscalls` - Unhook syscall stubs
3. `unhook-syscalls-from-wow64` - Unhook syscalls from WOW64
4. `unhook-using-wpm` - Use WPM for unhooking
5. `unhook-via-native` - Use native API for unhooking
6. `unhook-clear-guard` - Clear guard pages during unhooking
7. `clear-veh-on-unhook` - Clear VEH during unhooking
8. `clear-veh-on-imp-res` - Clear VEH during import resolution
9. `clear-hwbp-on-unhook` - Clear HWBP during unhooking
10. `clear-hwbp-on-imp-res` - Clear HWBP during import resolution

**Self-Encryption (9 settings)**:
1. `self-encrypt-mode` - Encryption strategy
2. `self-encrypt-mode-x86` - x86-specific override
3. `self-encrypt-mode-x64` - x64-specific override
4. `self-encrypt-after` - Minimum interval for encryption
5. `self-encrypt-while-listening` - Encrypt during P2P listening
6. `self-encrypt-evade-detections` - Additional evasion techniques
7. `reapply-opsec-on-self-encrypt` - Re-run unhooking around encryption

**Detection Evasion (8 settings)**:
1. `patch-etw-event` - Patch NtTraceEvent
2. `patch-etw-event-stealth` - Stealthy ETW patching
3. `patch-amsi` - Patch AmsiScanBuffer
4. `patch-amsi-stealth` - Stealthy AMSI patching
5. `disable-pi-callback` - Disable PI callback
6. `clear-dll-notifications` - Clear DLL notification callbacks
7. `use-hwbp-for` - Use hardware breakpoints for patches
8. `update-opsec-on-config-change` - Reapply OPSEC when config changes

**Thread Obfuscation (5 settings)**:
1. `masquerade-thread-stacks` - Masquerade thread stacks
2. `use-threadpool` - Use threadpool for thread creation
3. `sleep-mode` - Sleep mode strategy
4. `call-stack-masking` - Mask call stacks
5. `call-stack-masking-random` - Randomize masked call stacks

**Memory Management (20+ settings)**:
1. `encrypt-heap-mode` - Heap encryption mode
2. `hide-windows` - Hide process windows
3. `backing-module` - Backing module DLL
4. `stomp-pe-header` - Stomp PE header
5. `loadlibrary-mode` - DLL loading mode
6. `block-dlls` - Block specific DLLs
7. `darkload-dll-exclusions` - DLLs to NOT darkload
8. `darkload-dll-inclusions` - DLLs to darkload
9. `darkload-dll-remove-from-peb` - Remove from PEB
10. `darkload-dll-remove-from-hashlinks` - Remove from hash links
11. `darkload-dll-only-implant-threads` - Darkload only for implant threads
12. `darkload-dll-encrypt-at-sleep` - Encrypt darkloaded DLLs at sleep
13. `mem-hiding-*` - Memory hiding configuration (7 related settings)
14. `preload-libraries` - Libraries to preload
15. `inproc-*` - In-process execution configuration (10+ settings)
16. `extra-life` - Extra life mode
17. `exec-module-stomp-*` - Module stomping configuration

**Loader Export/Export (2 settings)**:
1. `loader-export` - Reflective loader export name
2. `ordinary-export` - Ordinary DLL export name

**Thread Behavior (2 settings)**:
1. `loader-thread-behaviour` - Thread behavior mode
2. `opsec-setthreadcontext` - OPSEC for SetThreadContext

**Total OPSEC Settings**: **70+** interconnected flags

**What Breaks**: Complex interactions mean unpredictable failures. Examples:
- Disable `use-syscalls` → May trigger EDR hooks → Detection
- Disable `patch-amsi` → .NET assemblies scanned → Detection
- Change `self-encrypt-mode` from "no-stub-timer" to "stub" → Leaves executable stub in memory → IOC
- Disable `unhook-dlls` → EDR hooks remain → Behavior monitored → Detection
- Change `sleep-mode` → May trigger threat hunting tools looking for specific sleep API usage

---

## Injection Level Fields (Do Not Modify Without Approval)

### general-config.injector.methods

**Location**: `c2-profile.general-config.injector.methods`

**Purpose**: 7-step injection chain specifying which API to use for each step

**Why Operational**: These methods control how code injection works. Changing them affects:
- Cross-architecture injection support (some methods work x86→x64, others don't)
- EDR evasion (Native methods + syscalls evade hooks, WinAPI may be hooked)
- Stability (some methods more stable than others)

**Steps**:
1. **ProcessCreate** - Create new process
2. **ProcessOpen** - Open existing process
3. **AllocMemory** - Allocate memory in remote process
4. **WriteMemory** - Write to remote process
5. **ProtectMemory** - Change memory protections
6. **ThreadOpen** - Open thread for context/APC
7. **ExecuteMemory** - Schedule execution

**Example**:
```json
{
  "injector": {
    "methods": {
      "ProcessCreate": "CreateProcessWinApi",
      "ProcessOpen": "OpenProcessNative",
      "AllocMemory": "VirtualAllocNative",
      "WriteMemory": "WriteProcMemNative",
      "ProtectMemory": "VirtualProtectNative",
      "ThreadOpen": "CreateNewThreadNative",
      "ExecuteMemory": "QueueAPCNativeIndirect"
    }
  }
}
```

**What Breaks**:
- Incompatible method combinations (e.g., CreateAndMapSectionNative for WriteMemory makes AllocMemory/ProtectMemory unnecessary)
- Cross-architecture failures (some methods don't support x86→x64 injection)
- EDR detection (WinAPI methods may be hooked, Native methods safer)

**User Approval Required**: Only modify if testing specific evasion techniques or injection methods

### general-config.injector.use-rwx

**Location**: `c2-profile.general-config.injector.use-rwx`

**Purpose**: Whether to use RWX (Read-Write-Execute) memory for injected shellcode

**Why Operational**:
- Needed for self-modifying shellcode
- Nighthawk shellcode is NOT self-modifying - can be false
- RWX memory is more suspicious (EDR flags RWX allocations)

**Default**: true

**What Breaks**: If set to false and shellcode is self-modifying → execution failure

**User Approval Required**: Discuss OPSEC trade-off (RWX = more suspicious but compatible vs. RW→RX = less suspicious but incompatible with self-modifying code)

### general-config.injector.spawn-use-process-thread

**Location**: `c2-profile.general-config.injector.spawn-use-process-thread`

**Purpose**: Whether to use new process main thread for execution (vs. creating new thread)

**Why Operational**:
- Affects number of thread creation events (main thread = 0 additional events)
- Some injection methods require ThreadOpen step, others don't

**Default**: true

**What Breaks**: Incompatibility with certain ExecuteMemory methods

**User Approval Required**: Advanced injection chain customization

### general-config.injector.delay-executememory

**Location**: `c2-profile.general-config.injector.delay-executememory`

**Purpose**: Delay in seconds before executing ExecuteMemory step

**Why Operational**:
- Creates temporal disconnect between injection and execution
- Affects timing-based detection mechanisms
- Agent can self-encrypt during delay

**Default**: 0 (no delay)

**What Breaks**: If too long → operator waits excessively for injected code to execute

**User Approval Required**: Only modify if testing timing-based evasion

---

## HTTP Structure Level Fields (Do Not Modify)

### egress-config.commands.*.build-request.method

**Location**: `c2-profile.egress-config.commands.*.build-request.method`

**Purpose**: HTTP method for request (GET, POST, PUT, DELETE)

**Why Operational**: Changing breaks C2 protocol (server expects specific methods)

**Example**:
```json
{
  "status": { "build-request": { "method": "POST" } }  // ❌ Never change
}
```

**What Breaks**: C2 server-agent protocol mismatch, commands not received/processed

### egress-config.commands.*.parse-response.*

**Location**: `c2-profile.egress-config.commands.*.parse-response.*`

**Purpose**: How to parse C2 server responses (status codes, headers, body)

**Why Operational**: Changing breaks response parsing, agent can't process C2 commands

**Example**:
```json
{
  "status": {
    "parse-response": {
      "status-code": 200,    // ❌ Never change
      "headers": { ... },    // ❌ Never change parsing logic
      "body": "..."          // ❌ Never change parsing logic
    }
  }
}
```

**What Breaks**: Agent can't parse server responses → commands not received → C2 failure

### Command Names

**Location**: `c2-profile.egress-config.commands.{status|getcommands|putresult}`

**Why Operational**: Command names are protocol-level identifiers

**Standard Commands**:
- `status` - Initial beacon
- `getcommands` - Retrieve command list
- `putresult` - Send command results

**What Breaks**: Renaming commands breaks server-agent protocol

---

## Code Module Level Fields (Mostly Do Not Modify)

### code-modules.*.type

**Location**: `c2-profile.general-config.code-modules.{encoders|egress-transports|p2p-transports}[*].type`

**Purpose**: Code type for module (only "clr" supported currently)

**Why Operational**: Changing breaks module loading

**Example**:
```json
{
  "encoders": [{
    "type": "clr"  // ❌ Never change (only supported value)
  }]
}
```

### code-modules.*.version

**Location**: `c2-profile.general-config.code-modules.*[*].version`

**Purpose**: .NET runtime version (e.g., "v4.0.30319")

**Why Operational**: Changing breaks module loading if module compiled for different .NET version

**Example**:
```json
{
  "encoders": [{
    "version": "v4.0.30319"  // ❌ Never change without recompiling module
  }]
}
```

### code-modules.*.module-name

**Location**: `c2-profile.general-config.code-modules.*[*].module-name`

**Purpose**: Namespace for module functions

**Why Operational**: Referenced in malleable profile encoder calls (e.g., `<payload:MammaMia.Text.EncodeAsItalian>`)

**Example**:
```json
{
  "encoders": [{
    "module-name": "MammaMia"  // ❌ Never change (breaks encoder function calls)
  }]
}
```

### code-modules.*.functions / method-map

**Location**: `c2-profile.general-config.code-modules.*[*].functions` or `method-map`

**Purpose**: Fully qualified method names exposed by module

**Why Operational**: These are the actual .NET methods called by agent - changing breaks functionality

**Example**:
```json
{
  "encoders": [{
    "functions": [
      "MammaMia.Text.EncodeAsItalian",  // ❌ Never change
      "MammaMia.Text.DecodeFromItalian"
    ]
  }]
}
```

### code-modules.*.code

**Location**: `c2-profile.general-config.code-modules.*[*].code`

**Purpose**: Base64-encoded module binary

**Why Operational**: This is the actual compiled code - changing breaks module execution

**Example**:
```json
{
  "encoders": [{
    "code": "TVqQAAMAAAAEAAAA..."  // ❌ Never change (actual module binary)
  }]
}
```

---

## Summary: Operational Field Categories

| Category | Field Count | Why Never Modify |
|----------|-------------|------------------|
| Connection | 3 | Breaks C2 connectivity |
| Timing | 2 | Affects detection surface, self-encryption trigger |
| OPSEC | 70+ | Interconnected evasion system - complex failures |
| Injection Methods | 7 | Changes injection behavior, may break cross-arch support |
| Injection Config | 3 | Affects memory usage, thread behavior, execution timing |
| HTTP Methods | ~3 | Breaks server-agent protocol |
| Response Parsing | ~10 | Breaks command processing |
| Code Module Core | ~20 | Breaks module loading and execution |

**Total Operational Fields**: **~120 fields**
**Total Customizable Fields**: **~20 fields**

**Ratio**: **85% operational, 15% customizable**

---

## "But I Need to Change..." Responses

**"I need to change interval because the baseline is too fast/slow for this engagement"**

→ **Get user approval first**. Explain trade-off:
- Shorter interval = more responsive but higher detection risk
- Longer interval = lower detection risk but slower response
- Affects self-encryption (if crosses `self-encrypt-after` threshold)

**"I need to disable patch-amsi because it's causing instability"**

→ **Get user approval first**. Explain impact:
- AMSI patching prevents .NET assembly scanning
- Disabling means in-process assembly execution may be detected
- Can patch on-demand instead (per-assembly basis)

**"I need to change unhook-dlls to add/remove DLLs"**

→ **Get user approval first**. Explain impact:
- Unhooking removes EDR monitoring capabilities
- Adding DLLs increases unhook time (more memory operations)
- Removing DLLs leaves hooks intact (EDR monitors API calls)

**"The backing-module DLL doesn't exist on target, I need to change it"**

→ **Get user approval first**. Alternatives:
- Verify DLL actually doesn't exist (via recon)
- Select alternative DLL that exists on target
- Disable backing module entirely (fall back to stomp-pe-header)

**"I want to test different injection methods"**

→ **Get user approval first**. This is valid for:
- Evasion testing (test which methods evade specific EDR)
- Cross-architecture scenarios (some methods required for x86→x64)
- Operational needs (some methods more stable in certain environments)

---

## Approval Workflow

**When you encounter a request to modify operational field**:

1. **Stop**: Do not modify automatically
2. **Explain**: Document why field is operational and what breaks if changed
3. **Ask user via AskUserQuestion**:
   ```
   Question: "You've requested modifying {field-name} from {current-value} to {new-value}.
            This field is OPERATIONAL because {reason}.
            Changing it may {consequences}.
            Should I proceed?"

   Options:
   - "Yes, proceed with modification" (Recommended if user understands consequences)
   - "No, keep baseline value"
   - "Explain trade-offs in more detail"
   ```
4. **Document**: If approved, document in deployment notes why modification was made and what was weighed

---

## Sources

- Nighthawk Official Documentation (OPSEC settings documentation)
- Research Synthesis (Field classification analysis)
