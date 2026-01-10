## 12  MICROSOFT-WINDOWS-THREAT- INTELLIGENCE

![Figure](figures/EvadingEDR_page_241_figure_001.png)

For years, Microsoft Defender for Endpoint (MDE) presented a huge challenge for offensive security practitioners because it could detect issues that all the other EDR

vendors missed. One of the primary reasons for its effectiveness is its use of the Microsoft-Windows-ThreatIntelligence (EtwTi) ETW provider. Today, developers who publish ELAM drivers use it to access some of the most powerful detection sources on Windows.

Despite its name, this ETW provider won't provide you with attribution information. Rather, it reports on events that were previously unavailable to EDRs, like memory allocations, driver loads, and syscall policy violations to Win32h , the kernel component of the Graphics Device Interface. These events functionally replace the information EDR vendors gleaned from user-mode function hooking, which attackers can easily evade, as covered in Chapter 2.

---

Because events from this provider originate from the kernel, the provider is more difficult to evade, has greater coverage than user-mode alternatives, and is less risky than function hooking, as the provider is integrated into the operating system itself. Due to these factors, it is rare to encounter mature EDR vendors that don't use it as a telemetry source.

This chapter covers how the EtwiT provider works, its detection sources, the types of events it emits, and how attackers may evade detection.

## Reverse Engineering the Provider

Before we cover the types of events emitted by the EtwiTi provider, you should understand how it gets the information in the first place. Unfortunately, Microsoft provides no public documentation about the provider's internals, so discovering this is largely a manual effort.

As a case study, this section covers one example of EwiT's source: what happens when a developer changes the protection level of a memory allocation to mark it as executable. Malware developers frequently use this technique: they'll first write shellcode to an allocation marked with read-write (RW) permissions and then change these to read-execute (RX) through an API such as kerne132[VirtualProtect] before they execute the shellcode.

When the malware developer calls this API, execution eventually flows down to the syscall for ndllntProtectVirtualMemory(). Execution is transferred into the kernel, where some safety checks and validations occur. Then, nt!MmProtectVirtualMemory() is called to change the protection level on the allocation. This is all pretty standard, and it would be reasonable to assume that nt!MmProtectVirtualMemory() would clean up and return at this point. However, one last conditional block of code in the kernel, shown in Listing 12-1, calls nt!EwToLogProtectExecVm() if the protection change succeeded.

```bash
#if ((-1 << (int)status) &&
  (status = protectionMask, ProtectionMask = MiMakeProtectionMask(protectionMask),
    ((uVar2 | ProtectionMask) & 2) != 0)) {
    puStack_c0 = (ulonglong)*((ulonglong)puStack_c0 & 0xffffffe00000000 | (ulonglong)status);
    OldProtection = param_4;
    EtwIlogProtectExecVm(TargetProcess,AccessMode,BaseAddress,NumberOfBytes);
}
```

Listing 12-1: The EtwTi function called inside ntlntProtectVirtualMemory()

The name of this function implies that it is responsible for logging protection changes for executable regions of memory.

### Checking That the Provider and Event Are Enabled

Within the function is a call to ntlProviderEnabled(), which is defined in Listing 12.2. It verifies that a given ETV provider is enabled on the system.

```bash
BOOLEAN EtoProviderEnabled(
    REHANDLE REHandle,
```

216 Chapter 12

---

```bash
UCHAR     Level,
  ULONGLONG KeyWord
);
```

Listing 12-2: The nt!EtwProviderEnabled() definition

The most interesting part of this function is the Regularde parameter, which is the global EwtThreatInProvRegandle, in the case of this provider. This handle is referenced in every EwtTi function, meaning we can use it to find other functions of interest. If we examine the cross-reference to the global ETW provider handle, as shown in Figure 12-1 , we can see 31 other references made to it, most of which are other EwtTi functions.

![Figure](figures/EvadingEDR_page_243_figure_003.png)

Figure 12-1: Cross-references to ThreatIntProviderGuid

One of the cross-references originates from nt|EwtgInitialize(), a function called during the boot process that, among other things, is responsible for registering system ETW providers. To do this, it calls the nt|EwtgRegister() function. The signature for this function is shown in Listing 12-3.

```bash
NTSTATUS EtwRegister(
    LPCGUID           ProviderId,
    PETCHENABLECALLBACK enableCallback,
    PVOID             CallbackContext,
    PREGHANDLE        RegHandle
);
```

Listing 12-3: The nt!EtwRegister() definition

This function is called during the boot process with a pointer to a

GUID named ThreatProviderGuid, shown in Listing 12-4.

```bash
//...
EtwRegister(&ThreatIntProviderGuid,0,0,&EtwThreatIntProvRegHandle);
```

Listing 12-4: Registering ThreatIntProviderGuid

The GUID pointed to is in the .data section, shown in Figure 12.2 as fae1897c-bb5d-5668-f18ee-040fad8d344.

```bash
// $Id$ $Date$
#include "../hoseProvision.h"
#define HOSEHOSE_H 0x00000000x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

Figure 12-2: The GUID pointed to by ThreatIntProviderGuid

Microsoft Windows Threat Intelligence  217

---

If the provider is enabled, the system checks the event descriptor to determine if the specific event is enabled for the provider. This check is performed by the nt!EvEventEnabled() function, which takes the provider handle used by nt!EvProviderEnabled() and an EVENT_DESCRIPTOR structure corresponding to the event to be logged. Logic determines which EVENT_DESCRIPTOR to use based on the calling thread's context (either user or kernel).

Following these checks, the EtwTi function builds out a structure with functions such as nt!EtwTiff1ProcessIdentity() and nt!EtwTiff1Valid(). This structure is not easily statically reversed, but thankfully, it is passed into nt!EtwWrite(), a function used for emitting events. Let's use a debugger to examine it.

## Determining the Events Emitted

At this point, we know the syscall passes data to nt!EtwLogProtectExecVm(), which emits an event over ETW using the EtwTi provider. The particular event emitted is still unknown, though. To collect this information, let's view the data in the PEVENT_DATA_DESCRIPTOR passed to ntl!EwTime() using WinDb.

By placing a conditional breakpoint on the function that writes the ETW event when its call stack includes ntlFdwLoopProtectExecVm(), we can further investigate the parameters passed to it (Listing 12-5).

```bash
Listing 12-5: Using a conditional breakpoint to watch calls to nt!\EWtWlogProtectExecVm()
1: kd> bp ntl\EWtWwrite "r $to = 0;
.foreach (p { k } {
  .if ($spat\"p\", \"nt!\EWtWlogProtectExecVm*\") {
    r $to = 1; .break
  }
  ;if($to = 0) { gc }
1: kd> g
ntl\EWtWwrite
ffffffff8077b693500 4883ec48      sub  rsp, 48h
1: kd> k
# Child-SP      RetAddr       Call Site
00  ffff9285 03dc6788  ffff8077b6c0ac99 nt!\EWtWwrite
00  ffff9285 03dc6790  ffff8077b7b96860 nt!\EWtWlogProtectExecVm+0x15c031 ♦
02  ffff9285 03dc6a90  ffff8077b7b08bb5 nt!\NTProtectVirtualMemory+0x260
03  ffff9285 03dc6a90 00007ffc 4f8fd774 nt!\KlSystemServiceCopyEnd+0x25
04  0000025 3d7bc78  00007ffc 46ab4d86 000007ffc 4f8fdb74
05  0000025 3d7bc78c 000001ca 0002a040 000007ffc 46ab4d86
06  0000025 3d7bc78c 00000000 0000008 0000001ca 0002a040
07  0000025 3d7bc78c 00000000 00000000 0x8
Listing 12-5: Using a conditional breakpoint to watch calls to nt!\EWtWlogProtectExecVm()
```

This call stack shows a call to nt!nt!Protect(VirtualMemory)() buffering from user mode and hitting the System Service Dispatch Table (SSDT) ❸ which is really just an array of addresses to functions that handle a given syscall. Control is then passed up to nt!nt!Protect(VirtualMemory) where the call to nt!nt!WallProtectExevm() ❹ is made, just as we identified earlier through static analysis.

218    Chapter 12

---

The UserDataCount parameter passed to ntlfTWrite() contains the number of EVENT_DATA_DESCRIPTOR structures in its fifth parameter, UserData. This value will be stored in the R9 register and can be used to display all entries in the UserData array, stored in RAX. This is shown in the WinDbg output in Listing 12-6.

```bash
1: kdt dy 0rax l(0x9*2)
ffff9285'03d6c7e0 ffff6a08'af571740 00000000'00000004
ffff9285'03d6c7f0 ffff6a08'af571768 00000000'00000008
ffff9285'03dc800 ffff9285'03d6c7c0 00000000'00000008
ffff9285'03dc6810 ffff6a08'af571b78 00000000'00000001
---snjp---
```

Listing 12-6: Listing the values in UserData using the number of entries stored in R9

The first 64-bit value on each line of the WinDbg output is a pointer to the data, and the next one describes the size of the data in bytes. Unfortunately, this data isn't named or labeled, so discovering what each descriptor describes is a manual process. To decipher which pointer holds which type of data, we can use the provider GUID collected earlier in this section. f4e1897c-bb5d-5668-f1d8-040f4d8d344 .

As discussed in Chapter 8, ETW providers can register an event manifest, which describes the events emitted by the provider and their contents. We can list these providers using the logman.exe utility, as shown in Listing 12-7.


Searching for the GUID associated with the EtwTi provider reveals that the provider's name is Microsoft-Windows-Threat-Intelligence.

```bash
PS > logsum query providers | findstr / "(fa897c-b5bd-5668-f1d8-00f4fd8ad344)"
    Microsoft-Windows-Threat-Intelligent (FAE1B97C-BBCD-5668-F1D8-00F4FD8DD344)
```

Listing 12-7: Retrieving the provider's name using logman.exe

After identifying the name of the provider, we can pass it to tools such as PerfView to get the provider manifest. When the PerfView command in Listing 12-8 completes, it will create the manifest in the directory from which it was called.

```bash
PS > PerfView64.exe userCommand DumpRegisteredManifest Microsoft-Windows-Threat-Intelligence
```

Listing 12-8: Using PerfView to dump the provider manifest

You can view the sections of this manifest that relate to the protection of virtual memory in the generated XML. The most important section for understanding the data in the UserData array is in the <template> tags, shown in Listing 12.9.

```bash
<template>
  --snip--
  <template tid="KERNEL ThreatINT TASK_PROTECTVMArgs_V1">
    <data name="CallingProcessId" inType="win:Uint32"/>
    <data name="CallingProcessCreateTimeTime" inType="win:FILETIME"/>
```

Microsoft-Windows-Threat-Intelligence  219

---

```bash
<data name="CallingProcessStartKey" inType="win:Uint64"/>
  <data name="CallingProcessSignatureLevel" inType="win:Uint8"/>
  <data name="CallingProcessSectionSignatureLevel" inType="win:Uint8"/>
  <data name="CallingProcessProtection" inType="win:Uint1"/>
  <data name="CallingThreadId" inType="win:Uint32"/>
  <data name="CallingThreadCreateTime" inType="win:FILETIME"/>
  <data name="TargetProcessId" inType="win:Uint32"/>
  <data name="TargetProcessCreateTime" inType="win:Uint15"/>
  <data name="TargetProcessStartKey" inType="win:Uint64"/>
  <data name="TargetProcessSignatureLevel" inType="win:Uint8"/>
  <data name="TargetProcessSectionSignatureLevel" inType="win:Uint8"/>
  <data name="TargetProcessProtection" inType="win:Uint8"/>
  <data name="OriginalProcessId" inType="win:Uint32"/>
  <data name="OriginalProcessCreateTime" inType="win:FILETIME"/>
  <data name="OriginalProcessStartKey" inType="win:Uint64"/>
  <data name="OriginalProcessSignatureLevel" inType="win:Uint8"/>
  <data name="OriginalProcessSectionSignatureLevel" inType="win:Uint8"/>
  <data name="OriginalProcessProtection" inType="win:Uint8"/>
  <data name="BaseAddress" inType="win:Pointer"/>
  <data name="RegionSize" inType="win:Pointer"/>
  <data name="ProtectionMask" inType="win:Uint32"/>
  <data name="LastProtectionMask" inType="win:Uint32"/>
  </template>
```

Listing 12-9: ETW provider manifest dumped by PerfView

Comparing the data sizes specified in the manifests with the Size field of the EVENT_DATA_DESCRIPTOR structures reveals that the data appears in the same order. Using this information, we can extract individual fields of the event. For example, ProtectionMask and LastProtectionMask correlate to ntl1!ntProtect(virtualMemory)'s NewAccessProtection and OldAccessProtection, respectively. The last two entries in the UserData array match their data type. Listing 12-10 shows how we can investigate these values using WinDbg.

```bash
1: kd> dq @rax L(0x972)
--snip--
ffffffff985' 03dc6940 ffff9285' 03dc69c0 00000000'00000004
ffffffff985' 03dc6950 ffff9285' 03dc69e8 00000000'00000004
1: kd> dd ffff9285' 03dc69c0 11
ffffffff985' 03dc69c0 00000004
1: kd> dd ffff9285' 03dc69e8 11
ffffffff985' 03dc69e8 00000020
```

Listing 12-10: Evaluating protection mask changes using WinDbg

We can inspect the values' contents to see that LastProtectionMask 2 was originally PAGE_EXECUTE_READ (0x20) and has been changed to PAGE_WRITE (0x4) ❶ Now we know that removing the executable flag in the memory allocation caused the event to fire.

220    Chapter 12

---

## Determining the Source of an Event

Although we've explored the flow from a user-mode function call to an event being emitted, we've done so for a single sensor only, n!t!wtiLog

ProtectExec$m(). At the time of this writing, there are 11 of these sensors, shown in Table 12-1.

Table 12-1: Security and Security Mitigation Sensors

<table><tr><td>Microsoft-Windows-Threat-Intelligence Sensors</td><td>Microsoft-Windows-Security-Mitigations Sensors</td></tr><tr><td>EtwTilogAllocExecVm</td><td>EtwTilogBlockNonCetBitaries</td></tr><tr><td>EtwTilogDeviceObjectLoadUnload</td><td>EtwTilogControlProtectionKernelModeReturnMismatch</td></tr><tr><td>EtwTilogDriverObjectLoad</td><td>EtwTilogControlProtectionUserModeReturnMismatch</td></tr><tr><td>EtwTilogDriverObjectUnLoad</td><td>EtwTilogProhibitChildProcessCreation</td></tr><tr><td>EtwTilogInsertQueueUserApc</td><td>EtwTilogProhibitDynamicCode</td></tr><tr><td>EtwTilogMapExecView</td><td>EtwTilogProhibitLowImageMap</td></tr><tr><td>EtwTilogProtectExecView</td><td>EtwTilogProhibitNonMicrosoftBitaries</td></tr><tr><td>EtwTilogReadWriteVm</td><td>EtwTilogProhibitWin32SystemCalls</td></tr><tr><td>EtwTilogSetContextThread</td><td>EtwTilogRedirectionTrustPolicy</td></tr><tr><td>EtwTilogSuspendResumeProcess</td><td>EtwTilogUserCetSetContextIpValidationFailure</td></tr><tr><td>EtwTilogSuspendResumeThread</td><td></td></tr></table>


An additional 10 sensors relate to security mitigations and are identified by their EtwTm prefix. These sensors emit events through a different provider, Microsoft-Windows-Security-Mitigations, but function identically to the normal EtwTi sensors. They're responsible for generating alerts about security mitigation violations, such as the loading of low-integrity-level or remote images or the triggering of Arbitrary Code Guard, based on system configuration. While these exploit mitigations are out of scope for this book, you'll occasionally encounter them while investigating EtwTi sensors.

### Using Neo4j to Discover the Sensor Triggers

What causes the sensors in Table 12-1 to emit events? Thankfully, there is a relatively easy way for us to figure this out. Most measure activity coming from user mode, and for control to transition from user mode to kernel mode, a syscall needs to be made. Execution will land in functions prefixed with %t after control is handed to the kernel, and the SSDT will handle the entry-point resolution.

Therefore, we can map paths from functions with % prefixes to functions with %T% prefixes to identify APIs that cause events to be emitted due to actions in user mode. Ghidra and IDA both offer call-tree mapping functions that serve this purpose generally. Their performance can be limited, however.

Microsoft Windows Threat Intelligence 221

---

For example, Ghida's default search depth is five nodes, and longer searches take exponentially longer. They 're also exceedingly difficult to parse.

To address this, we can use a system built for identifying paths, such as the graph database Neo4j. If you've ever used BloodHound, the attack path-mapping tool, you've used Neo4j in some form. Neo4j can map the relationships (called edges ) between any kind of item (called nodes ). For example, BloodHound uses Active Directory principals as its nodes and properties like access control entries, group membership, and Microsoft Azure permissions as edges.

In order to map nodes and edges, Neo4j supports a query language called Cypher whose syntax lies somewhere between Structured Query Language (SQL) and ASCII art and can often look like a drawn diagram. Rohan Vazarkar, one of the inventors of BloodHound, wrote a fantastic blog post about Cypher queries, “Intro to Cypher,” that remains one of the best resources on the topic.

## Getting a Dataset to Work with Neo4j

To work with Neo4j, we need a structured dataset, typically in JSON format, to define nodes and edges. We then load this dataset into the Neo4j database using functions from the Awesome Procedures on Cypher add-on library (such as apor.load.json()). After ingestion, the data is queried using Cypher in either the web interface hosted on the Neo4j server or a contracted Neo4j client.

We must extract the data needed to map call graphs into the graph database from Ghidra or IDA using a plug-in, then convert it to JSON.


Specifically, each entry in the JSON object needs to have three properties: a string containing the name of the function that will serve as the node, the entry point offset for later analysis, and the outgoing references (in other words, the functions being called by this function) to serve as the edges.

The open source Ghidra script CallTreeToJSON.py iterates over all functions in a program that Ghidra has analyzed, collects the attributes of interest, and creates new JSON objects for ingestion by Neo4j. To map the paths related to the EtwiTs sensors, we must first load and analyze ntokernel.exe , the kernel image, in Ghidra. Then we can load the Python script into Ghidra's Script Manager and execute it. This will create a file, xfs.json , that we can load into Neo4j. It contains the Cypher commands shown in Listing 12-11.

```bash
CREATE CONSTRAINT function_name ON (n:Function) ASSERT n.name IS UNIQUE
CALL apoc.read_json("file://xxref.json") YIELD value
UNWIND value as func
    MERGE (n:Function {name: func.FunctionName})
    SET n.entrypoint=func.EntryPoint
    WITH n, func
    UNWIND func.CalledBy as cb
        MERGE (m:Function {name:cb})
        MERGE (m){[:calls]~(n)
```

Listing 12-11: Loading call trees into Neo4j

222    Chapter 12

---

After importing the JSON file into Neo4j, we can query the dataset using Cypher.

## Viewing the Call Trees

To make sure everything is set up correctly, let's write a query to map the path to the ftext110pProtectText6w sensor. In plain English, the query in Listing 12-12 says, "Return the shortest paths of any length from any function name that begins with %t to the sensor function we specify."

```bash
MATCH {p->shortestPath((f:Function){'calls'1,:}}>{t:Function {name: "EtwTlLogProtectExecm"}}
WHERE {f.name} STARTS WITH 'NG' RETURN p;
```

Listing 12-12: Mapping the shortest paths between Nt functions and the EtwTiLogProtectExecVm sensor

When entered into Neo4j, it should display the path shown in Figure 12-3.

![Figure](figures/EvadingEDR_page_249_figure_006.png)

Figure 12-3: A simple path between a syscall and an EtwTi function

The call trees for other sensors are far more complex. For example, the nt\ETw11ogMapViewQuery() sensor's call tree is 12 levels deep, leading all the way back to nt\TCTeppingCreatePagingFile(). You can see this by modifying the sensor name in the previous query, generating the path in Figure 12-4.

Microsoft Windows Threat Intelligence 223

---

![Figure](figures/EvadingEDR_page_250_figure_000.png)

Figure 12.4: Paths from nt!NtCreatePagingFile() to nt!EtwTilogMapExecView()

224, Chapter 12

---

As this example demonstrates, many syscalls indirectly hit the sensor.


Enumerating these can be useful if you're looking for coverage gaps, but


the amount of information generated can quickly become overwhelming.

You might want to scope your queries to a depth of three to four levels (representing two or three calls); these should return the APIs that are directly responsible for calling the sensor function and hold the conditional logic to do so. Using the previous example, a scoped query would show that the syscall ntdll NtMapViewOfSection() calls the sensor function directly, while the syscall ntdll NtMapViewOfSectionX() calls it indirectly via a memory manager function, as shown in Figure 12-5.

![Figure](figures/EvadingEDR_page_251_figure_002.png)

Figure 12-5: Scoped query that returns more useful results

Performing this analysis across EtwTi sensor functions yields information about their callers, both direct and indirect. Table 12.2 shows some of these mappings.

Table 12-2: EtwTi Sensor-to-Syscall Mappings

<table><tr><td>Sensor</td><td>Call tree from syscall {depth = 4}</td></tr><tr><td>EtwTilogAllocExecVm</td><td>MlAllocateVirtualMemory--MtlAllocateVirtualMemory</td></tr><tr><td>EtwTilogDriverObjectLoad</td><td>IopLoadDriver--IopLoadUnloadDriver--IopLoadDriverImage--IopLoadDriverPrinter--IopLoadDriverVer--IopLoadUnloadDriver--IopLoadDriver--NtUnloadDriver</td></tr></table>


(continued)

Microsoft-WindowsThreatIntelligence 225

---

Table 12-2: ElvTi Sensor-to-Syscall Mappings (continued)

<table><tr><td>Sensor</td><td>Call tree from syscall (depth = 4)</td></tr><tr><td>EtwTilogInsertQueueUserApc</td><td>KeInsertQueueApc&lt;NTQueueApcThread</td></tr><tr><td>There are other branches of the call tree that lead to system calls, such as</td><td>KeInsertQueueApc&lt;NTQueueApcThreadEx</td></tr><tr><td>nt!IopCompleteRequest(), ntlPspGet ContextThreadInternal(), and ntlPspSet ContextThreadInternal(), but these aren't particularly useful, as many internal functions rely on these functions regardless of whether the APC is being created explicitly.</td><td>NtMapViewOfSectionMiMapViewOf SectionXcCommon&lt;NtMapViewOfSectionEx</td></tr><tr><td>EtwTilogMapExecView</td><td>NtProtectVirtualMemory</td></tr><tr><td>EtwTilogProtectExecVm</td><td>NtReadWriteVirtualMemory-</td></tr><tr><td>EtwTilogReadWriteVm</td><td>NtReadVirtualMemoryMiReadWrite VirtualMemory--NtRead VirtualMemoryExMReadWriteVirtual Memory--NtWriteVirtualMemory</td></tr><tr><td>EtwTilogSetContextThread</td><td>PspSetContextThreadInternal--NtSetContextThread</td></tr><tr><td>EtwTilogSuspendResumeThread</td><td>PsSuspendThread--</td></tr><tr><td>This sensor has additional paths that are not listed and are tied to debugging APIs, including</td><td>NtSuspendThreadPsSuspendThread--</td></tr><tr><td>ntlld1NtDebugActiveProcess(), ntld11Nt DebugContinue(), and ntld11NtRemove ProcessDebug().</td><td>NtChangeThreadStatePsSuspend Thread--PsSuspendProcess--</td></tr><tr><td>ntlld1NtDebugContinue(), and ntld11NtRemove ProcessDebug().</td><td>NtSuspendProcessMultiResume Thread--NtResumeThread</td></tr></table>


An important fact to consider when reviewing this dataset is that Ghidra does not factor conditional calls in its call trees but rather looks for call instructions inside functions. This means that while the graphs generated from the Cypher queries are technically correct, they may not be followed in all instances. To demonstrate this, an exercise for the reader is to reverse ntl1!MtAllLocaleVirtualMemory() to find where the determination to call the ntl!FwlllglgLoadLocaleWm() sensor is made.

## Consuming EtwTi Events

In Chapter 8, you learned how EDRs consume events from other ETW providers. To try consuming ETW events from EtwTi, run the commands in Listing 12-13 from an elevated command prompt.

```bash
PS > logman.exe create trace EtW1 -p Microsoft-Windows-Threat-Intelligence -o C:\EtW1.etl
PS > logman.exe start EtW1
```

Listing 12-13: Logman commands to collect events from the EtwTi provider

You'll probably receive an access denied error, despite having run the commands in high integrity. This is due to a security feature implemented by Microsoft in Windows 10 and later versions called Secure ETW, which

---

prevents malware processes from reading or tampering with antimalware traces. To accomplish this, Windows allows only processes with the PS_PROTECTED_ANTIMALWARE_LIGHT protection level and services started with the SERVICE_LAUNCH_PROTECTED_ANTIMALWARE_LIGHT service protection type to consume events from the channel.

Let's explore process protection so that you can better understand how consuming events from EtwTi works.

## Understanding Protected Processes

Process protections allow sensitive processes, such as those that interact with DRM-protected content, to evade interaction by outside processes. While originally created for software such as media players, the introduction of Protected Process Light (PPL) eventually extended this protection to other types of applications. In modern versions of Windows, you'll find PPL used heavily by not only Windows components but also third-party applications, as seen in the Process Explorer window in Figure 12-6.

![Figure](figures/EvadingEDR_page_253_figure_004.png)

Figure 12-6: Protection levels across various processes

You can view a process's protection state in the protection field of the EPROCESS structure that backs every process on Windows. This field is of the type P5_PROTECTION, which is defined in Listing 12-14.

```bash
typedef struct _PS_PROTECTION {
        union {
            UCHAR level;
            struct {
            UCHAR Type  : 3;
            UCHAR Audit : 1;
            UCHAR Signer : 4;
        };
} PS_PROTECTION, *PPS_PROTECTION;
```

Listing 12-14: The PS_PROTECTION structure definition

The Type member of PS_PROTECTION correlates to a value in the PS_PROTECTED _TYPE enumeration, defined in Listing 12-15.

Microsoft-Windows-Threat-Intelligence 227

---

```bash
kd> dt ntl! PS_PROTECTED TYPE
    PsProtectedTypeNone = 0n0
    PsProtectedTypeProtectedLight = 0n1
    PsProtectedTypeProtected = 0n2
    PsProtectedTypeMax = 0n3
```

Listing 12-15: The PS_PROTECTED_TYPE enumeration

Lastly, the SIGNer member is a value from the PS_PROTECTED_SIGNER enumeration, defined in Listing 12-16.

```bash
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id$ $Date$ $Time$
%\* $Id
```

Listing 12-16: The PS_PROTECTED_SIGNER enumeration

As an example, let's take a look at the process protection state of

msmpong.exe, Microsoft Defender's primary process, using WinDbg, as demonstrated in Listing 12-17.

```bash
kd> dt ntl_EPROCESS Protection
  +0x87a Protection : _PS_PROTECTION
kd> !process 0 0 MsMpEng.exe
PROCESS fffffa608af571300
SessionId: 0 Cid: 1134  Feb: 253d4dc000  ParentCid: 0298
     DirBase: 0fc7d002 ObjectTable: ffffdf6084b00c6c0 HandleCount: 636.
       Image: MsMpEng.exe
kd> dt ntl_PS_PROTECTION fffffa608af571300+0x87a
     +0x000 Level        : 0x31 1,1
     +0x000 Type        ⃝ 0y001
     +0x000 Audit       : 0y0
     +0x000 Signer      ⃝ 0y0011
```

Listing 12-17: Evaluating msinpeng.exe's process protection level

The process's protection type is PsProtectedTypeProtectedLight ❶ and its signer is PsProtectedSignerAntimalware (a value equivalent to 3 in decimal) ❷. With this protection level, also referred to as PsProtectedSignerAntimalware -Light, outside processes have limited ability to request access to the process, and the memory manager will prevent improperly signed modules (such as DLLs and application compatibility databases) from being loaded into the process.

---

## Creating a Protected Process

Creating a process to run with this protection level is not as simple as passing flags into kernel32!CreateProcess(), however. Windows validates the image file's digital signature against a Microsoft-owned root certificate authority used to sign many pieces of software, from drivers to third-party applications.

It also validates the file by checking for one of several Enhanced Key Usage (EKU) extensions to determine the process's granted signing level. If this granted signing level doesn't dominate the requested signing level, meaning that the signer belongs to the $domain$ task member of the RTL_PROTECTED_ACCESS structure, Windows checks whether the signing level is runtime customizable. If so, it checks whether the signing level matches any of the registered runtime signers on the system, and if a match is found, it authenticates the certificate chain with the runtime signer's registration data, such as the hash of the signer and EKUs. If all checks pass, Windows grants the requested signature level.

### Registering an ELAM Driver

To create a process or service with the required protection level, a developer needs a signed ELAM driver. This driver must have an embedded resource, MICROSYSTEMCERTIFICATEINFO, that contains the certificate hash and hashing algorithm used for the executables associated with the usermode process or service to be protected, along with up to three EKU extensions. The operating system will parse or register this information at boot via an internal call to nt!SeRegisterIamCertResources() (or an administrator can do so manually at runtime). If registration happens during the boot process, it occurs during pre-boot, before control is handed to the Windows Boot Manager, as shown in the WinDbg output in Listing 12-18.

```bash
1: kd  k
# Child-SP
                          RetAddr
                          Call Site
00 ffff8308 e406828 ffff8f04 1724c9af nt!SseRegisterElamCertResources
00 ffff8308 e406830 ffff8f04 1724fac nt!PipInitializeEarlyLaunchDrivers+0x63
02 ffff8308 e4068c0 ffff8f04 1723c40d nt!IopInitializeBootDrivers+0x53
03 ffff8308 e406a70 ffff8f04 17243e61 nt!IoInitSystemPreDrivers+0x24
04 ffff8308 e406abb0 ffff8f04 16f8596b nt!IoInitSystem+0x15
05 ffff8308 e406be0f ffff8f04 16b55855 nt!lPhaseInitialization+0x3b
06 ffff8308 e406c10 ffff8f04 16fbf818 nt!PspSystemThreadStartup+0x55
07 ffff8308 e406c60 00000000 00000000 nt!KiStartSystemThread+0x28
```

Listing 12-18: ELAM resources registered during the boot process

You'll rarely see the manual registration option implemented in enterprise products, as resources parsed at boot require no further interaction at runtime. Still, both options net the same result and can be used interchangeably.

---

## Creating a Signature

After registration, the driver becomes available for comparison when a signing-level match is found. The rest of this section covers the implementation of the consumer application in the context of an endpoint agent.

To create the resource and register it with the system, the developer first obtains a certificate that includes the Early Launch and Code Signing EKUs, either from the certificate authority or generated as a self-signed certificate for test environments. We can create a self-signed certificate using the New-SelfSignedCertificate PowerShell cmdlet, as shown in Listing 12-19.

```bash
PS > $password = Convertto-SecureString -String "ThisIsMyPassword" -Force -AsPlainText
PS > $cert = New-SelfSignedCertificate -certstoreLocation "Cert:CurrentUser\My"
>> -HashAlgorithm SHA256 -Subject "CN-MyElamCert" -TextExtension
>> @$(2.5.29.37)=(text){1.3.6.1.4.1.31.61.4.1.1.3.6.1.5.5.7.3.3}"
PS > Export-PkCertificate -cert $cert -FilePath "MyMelamCert.pbfx" -Password $password
```

Listing 12-19: Generating and exporting a code-signing certificate

This command generates a new self-signed certificate, adds both the Early Launch and Code Signing EKUs, then exports it in .pfx format.

Next, the developer signs their executable and any dependent DLLs using this certificate. You can do this using the sgntool.exe syntax included in Listing 12-20.

```bash
PS > signtool.exe sign /fd SHA256 /a /v /ph /f .\MyIamCert.pfx
>> /p "ThisIsMyPassword" .path /toMy/service.exe
```

Listing 12-20: Signing an executable using the generated certificate

At this point, the service executable meets the signing requirements to be launched as protected. But before it can be started, the driver's resource must be created and registered.

## Creating the Resource

The first piece of information needed to create the resource is the To-BeSigned (TBS) hash for the certificate. The second piece of information is the certificate's file-digest algorithm. As of this writing, this field can be one of the following four values: 0x8004 (SHA10), 8X00C (SHA256), 0x80D (SHA384), or 0x800E (SHA512). We specified this algorithm in the /fd parameter when we created the certificate with signfool.exe.

We can collect both of these values by using certmgr.exe with the -v argument, as shown in Listing 12.21.

```bash
PS > \certmgr.exe -v .\path\to\my\service.exe
--snip--
Content Hash (To-Be-Signed Hash)::
```

---

```bash
04 36 A7 99 81 81 81 07 2E DF 86 6A 52 56 78 24   ' 1 , . , , . -jRvX$'
  E7 CC 5A AA 7C A2 7C A3 4E 00 80 98 14 98 97 02   '..', ., , ., ., ., ., .,
--snip--
Content SignatureAlgorithm:: 1.2.840.113549.1.1.11 (sha256RSA)
--snip--
```

Listing 12-21: Retrieving the To Be Signed hash and signature algorithm using certmgr.exe

The hash is located under Content Hash and the signature algorithm under Content SignatureAlgorithm.

## Adding a New Resource File

Now we can add a new resource file to the driver project with the contents shown in Listing 12.22 and compile the driver.

```bash
MicrosoftElamCertificateInfo.MSElamCertInfoID
{
    1,
        "0436A798818181072EDFB66A52567824E7CC5EAAA27C0EA34E008D9B14989702\0",
        0x800C,
        L"\0"
    }
```

Listing 12-22: The MicrosoftElamCertificateInfo resource contents

The first value of this resource is the number of entries; in our case, there is only one entry, but there may be up to three. Next is the TBS hash that we collected earlier, followed by the hexadecimal value corresponding to the hashing algorithm used (SHA256 in our case).

Finally, there is a field in which we can specify additional EKUs. Developers use these to uniquely identify antimalware components signed by the same certificate authority. For example, if there are two services with the same signer on the host, but only one needs to be launched with the SERVICE_LAUNCH_PROTECTED_ANTIMALWARE_LIGHT flag, the developer could add a unique EKU when signing that service and add it to the ELAM driver's resource. The system will then evaluate this additional EKU when starting the service with the Anti-Malware protection level. Since we're not providing any additional EKUs in our resource, we pass what equates to an empty string.

## Signing the Resource

We then sign the driver using the same syntax we used to sign the service executable (Listing 1223).

```bash
PS > signTool.exe -sign /fd SHA256 /a /v /ph /f "MyLamCert.pfx" /p "ThisIsMyPassword" >
    .!path/to\myDriver.sys
```

Listing 12-23: Signing the driver with our certificate

Microsoft Windows Threat Intelligence 231

---

Now the resource will be included in the driver and is ready to be installed.

## Installing the Driver

If the developer wants the operating system to handle loading the certificate information, they simply create the kernel service as described in "Registering an ELAM Driver" on page 229. If they would like to install the ELAM certificate at runtime, they can use a registration function in their agent, such as the one shown in Listing 12-24.

```bash
BOOL RegisterELAMCertInfo(wchar_t* szPath)
{
   HANDLE hELAMFile = NULL;
   hELAMFile = CreateFileW(
        szPath, FILE_READ_DATA, FILE_SHARE_READ, NULL, OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL, NULL);
   if (hELAMFile == INVALID_HANDLE_VALUE)
      {
       wprintf(L"[-] Failed to open the ELAM driver. Error: 0x%x\n",
          GetLastError());
       return FALSE;
   }
   if (!InstallELAMCertificateInfo(HELAMFile))
   {
       wprintf(L"[-] Failed to install the certificate info. Error: 0x%x\n",
          GetLastError());
       CloseHandle(hELAMFile);
       return FALSE;
   }
   wprintf(L"*[+] Installed the certificate info");
   return TRUE;
}
```

Listing 12-24: Installing the certificate on the system

This code first opens a handle to the ELAM driver containing the


MicrosoftLamCertificateInfo resource. The handle is then passed to kernel


32!InstallELAMCertificateInfo() to install the certificate on the system.

## Starting the Service

All that is left at this point is to create and start the service with the required protection level. This can be done in any number of ways, but it is most frequently done programmatically using the Win32 API. Listing 12-25 shows an example function for doing so.

```bash
BOOL CreateProtectedService() {
    SC_HANDLE hscM = NULL;
```

232    Chapter 12

---

```bash
SC_HANDLE hService = NULL;
   SERVICE_LAUNCH_PROTECTED_INFO info;
  ● hSCM = OpenSCManagerW(NULL, NULL, SC_MANAGER_ALL_ACCESS);
     if (!hSCM) {
         return FALSE;
    }
  ● hService = CreateServiceW(
         hSCM,
         L"MyETwiConsumer",
         L"Consumer service",
         SC_MANAGER_ALL_ACCESS,
         SERVICE_WIN32_OWN_PROCESS,
         SERVICE_DEMAND_START,
         SERVICE_ERROR_NORMAL,
         L"\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X\\X
```

### Listing 12-25: Creating the consumer service

First, we open a handle to the Service Control Manager ❶ , the operating system component responsible for overseeing all services on the host. Next, we create the base service via a call to kernel32!CreateService() ❷ . This function accepts information, such as the service name, its display name, and the path to the service binary, and returns a handle to the newly created service when it completes. We then call kernel32!ChangeService Config() to set the new service's protection level ❸ .

---

When this function completes successfully, Windows will start the protected consumer service, shown running in the Process Explorer window in Figure 12-7.

![Figure](figures/EvadingEDR_page_260_figure_001.png)

Figure 12-7: EtwTi consumer service running with the required protection level

Now it can begin working with events from the EtwTi provider.

### Processing Events

You can write a consumer for the EtwiTi provider in virtually the same way as you would for a normal ETW consumer, a process discussed in Chapter 8. Once you've completed the protection and signing steps described in the previous section, the code for receiving, processing, and extracting data from events is the same as for any other provider.

However, because the EtwTi consumer service is protected, you might find it difficult to work with events during development, such as by reading printf -style output. Thankfully, the provider's manifest can provide you with event formats, IDs, and keywords, which can make working with the events much easier.

## Evading EtwTi

Because they live in the kernel, EtwTx sensors provide EDRs with a robust telemetry source that is hard to tamper with. There are, however, a few ways that attackers may either neutralize the sensors' capabilities or at least coexist with them.

### Coexistence

The simplest evasion approach involves using Neo4j to return all syscalls that hit EwtrEws sensors, then refraining from calling these functions in your operations. This means you'll have to find alternative ways to perform tasks such as memory allocation, which can be daunting.

For example, Cobalt Strike's Beacon supports three memory allocation methods: #definealloc, #mapViewOfFile, and VirtualAlloc. Those last two methods both call a syscall that EtwTi sensors monitor. The first method, on the other hand, calls rdell1rt1AllocateHeap(), which has no direct outgoing references to EtwTi functions, making it the safest bet. The downside is that it doesn't support allocations in remote processes, so you can't perform process injection with it.

As with all telemetry sources in this book, remember that some other source might be covering the gaps in the EtwiT sensors. Using @ea41a0c as an example, endpoint security agents may track and scan executable heap allocations created by user-mode programs. Microsoft may also modify

234    Chapter 12

---

APIs to call the existing sensors or add entirely new sensors at any time. This requires that teams remap the relationships from syscalls to EtwTi sensors on each new build of Windows, which can be time consuming.

## Trace-Handle Overwriting

Another option is to simply invalidate the global trace handle in the kernel. Upayan Saha's "Data Only Attack: Neutralizing EtwiProvider" blog post covers this technique in great detail. It requires the operator to have an arbitrary read-write primitive in a vulnerable driver, such as those present in previous versions of Gigabyte's aidkb64.sys and LG Device Manager's lia.sys , two signed drivers published by the PC hardware and peripheral manufacturers for legitimate device-support purposes.

The primary challenge of this technique is locating the TRACE_ENABLE_INFO structure, which defines the information used to enable the provider. Inside this structure is a member, 15EnableD, that we must manually change to 0 to prevent events from reaching the security product. We can use some of what we've already learned about how events are published to help make this process easier.

Recall from the previous sections that all sensors use the global


EtwThreatIntProvRegHandle_REGHANDLE when calling nt!EtwHandle() to emit an

event. This handle is actually a pointer to an ETV_REG_ENTRY structure, which

itself contains a pointer to an ETV_GD0_ENTRY structure in its Gd0Entry mem ber (offset 0x20), as shown in Listing 12-26.

```bash
0: kd> dt nt1_ETW_REG_ENTRY poi(nt1EtWThreatIntProvRegHandle)
--snip--
+0x020 GuidEntry        : 0xffff8e8a'901f3c50__ETW_GUID_ENTRY
--snip--
```

Listing 12-26: Getting the address of the ETW_GUID_ENTRY structure

This structure is the kernel's record of an event provider and contains an array of eight TRACE_ENABLE_INFO structures in its EnableInfo member (offset 0x80). Only the first entry, the contents of which are included in Listing 12-27, is used by default.

```bash
0: kd() dx -1d 0,0ff8e8a90062040 -r1 ($(ntkrnlmpl_TRACE_ENABLE_INFO *)0xffff8e8a901f3c0d$
    *(*(ntkrnlmpl_TRACE_ENABLE_INFO *)0xffff8e8a901f3c0d)
] [Type: TRACE_ENABLE_INFO]
    +0x000 IsEnabled        : 0x1 [Type: unsigned long]
    +0x004 Level            : 0xff [Type: unsigned char]
    +0x005 Reservedi         : 0x0 [Type: unsigned char]
    +0x006 LoggerId         : 0x4 [Type: unsigned short]
    +0x008 EnableProperty   : 0x40 [Type: unsigned long]
    +0x00c Reserved2         : 0x0 [Type: unsigned long]
    +0x010 MatchAnyKeyword : 0xcfa5555 [Type: unsigned __int64]
    +0x018 MatchAllkeyword : 0x0 [Type: unsigned __int64]
```

Listing 12-27: Extracting the contents of the first TRACE_ENABLE_INFO structure

Microsoft-Windows-Threat-Intelligence 235

---

This member is an unsigned long (really a Boolean, per Microsoft's documentation) that indicates whether the provider is enabled for the trace session.

If an attacker can flip this value to 0, they can disable the MicrosoftWindows-Threat-Intelligence provider, preventing the consumer from receiving events. Working back through these nested structures, we can find our target using the following steps:

- 1. Finding the address of the ETW_REG_ENTRY pointed to by tWThreatInt

RegHandle

2. Finding the address of the ETW GUID_ENTRY pointed to by the ETW_REG_ENTRY

structure's GuidEntry member (offset 0x20)

3. Adding 0x80 to the address to get the IsEnabled member of the first

TRACE_ENABLE_INFO structure in the array
Finding the address of EtlHeatInitIProRegandUe is the most challenging part of this technique, as it requires using the arbitrary read in the vulnerable driver to search for a pattern of opcodes that work with the pointer to the structure.

According to his blog post, Saha used ntkk@InsertQueueApc() as the starting point of the search, as this function is exported by ntooled.exe and references the address of the REGHANDLE in an early call to ntkk@ProviderEnabled. Per the Windows calling convention, the first parameter passed to a function is stored in the RCX register. Therefore, this address will be placed into the register prior to the call to ntkk@ProviderEnabled using a MOV instruction. By searching for the opcodes 48 8b 0d corresponding to mov rxcx,qword ptr [x] from the function entry point until the call to ntkk@ProviderEnabled, we can identify the virtual address of the REGHANDLE. Then, using the offsets identified earlier, we can set its IsEnabled member to 0.

Another method of locating EtbwthreatIntProvsRegHandle is to use its offset from the base address of the kernel. Due to kernel address space layout randomization (KASLR), we can't know its full virtual address, but its offset has proven to be stable across reboots. For example, on one build of Windows, this offset is 0x1970, as shown in Listing 12-28.

```bash
0: kd> vertarget
--snip--
Kernel base = 0xffff803'02c00000 PLoadedModuleList = 0xffff803'0382a230
--snip--
0: kd> x /O nt!EtWThreatIntProvRegHandle
ffffffff803'038197d0
0: kd> ? ffffffff803'038197d0 ~ 0xffff803'02c00000
Evaluate expression: 12687312 ~ 00000000 00c197d0
```

Listing 12-28: Finding the offset to the RECHANGE

The last line in this listing subtracts the base address of the kernel from the address of the REGHANDLE . We can retrieve this base address

236 Chaptel 12

---

from user mode by running ntdll\NQuesSystemInformation() with the SystemModuleInformation class, demonstrated in Listing 12-29.

```bash
void GetKernelBaseAddress()
    {
    NTQuerySystemInformation pfnNtQuerySystemInformation = NULL;
    HMODULE hKernel = NULL;
    HMODULE hhtdll = NULL;
    RTL_PROCESS_MODULES ModuleInfo = { 0 };
    hNtDll = GetModuleHandle(L"ntdll");
  @pfnNtQuerySystemInformation =
        (NtQuerySystemInformation)GetProcAddress(
            hhtDll, "NtQuerySystemInformation");
    pfnNtQuerySystemInformation(
        SystemModuleInformation,
        &ModuleInfo,
        sizeof(ModuleInfo),
        NULL);
    wprintf("Kernel Base Address: %p\n",
        @(ULONG64)ModuleInfo.Modules[0].ImageBase);
}
```

Listing 12-29: Getting the base address of the kernel

This function first gets a function pointer to ndllllntQuerySystem

Information() ❶ and then invokes it, passing in the SystemModuleInformation

information class ❷. Upon completion, this function will populate the RL

_PROCESS_MODULES structure (named ModuleInfo), at which point the address

of the kernel can be retrieved by referencing the ImageBase attribute of the

first entry in the array ❸.

You'll still require a driver with a write-where-where primitive to patch the value, but using this approach avoids us having to parse memory for opcodes. This technique also introduces the problem of tracking offsets to EwtThreatIntProvRegiande across all kernel versions on which they operate, however, so it isn't without its own challenges.

Additionally, those who employ this technique must also consider the telemetry it generates. For instance, loading a vulnerable driver is harder on Windows 11, as Hypervisor:Protected Code Integrity is enabled by default, which can block drivers known to contain vulnerabilities. At the detection level, loading a new driver will trigger the ntlfWrlLogDriverObject

Load() sensor, which may be atypical for the system or environment, causing a response.

## Conclusion

The Microsoft-Windows-Threat-Intelligence ETW provider is one of the most important data sources available to an EDR at the time of this writing.

Microsoft-Windows-Threat-Intelligence 237

---

It provides unparalleled visibility into processes executing on the system by sitting inline of their execution, similar to function-hooking DLLs. Despite their likeness, however, this provider and its hooks live in the kernel, where they are far less susceptible to evasion through direct attacks. Evading this data source is more about learning to work around it than it is about finding the glaring gap or logical flaw in its implementation.

238    Chapter 12

---

