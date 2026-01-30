## APPENDIX  AUXILIARY SOURCES

![Figure](figures/EvadingEDR_page_291_figure_001.png)

Modern EDRs sometimes make use of less popular components not covered in this book so far. These auxiliary telemetry urces can provide immense value to the

EDR, offering access to data that would otherwise be unavailable from other sensors.

Because these data sources are uncommon, we won't take a deep dive into their inner workings. Instead, this appendix covers some examples of them, how they work, and what they can offer an EDR agent. This is by no means an exhaustive list, but it shines a light on some of the more niche components you may encounter during your research.

### Alternative Hooking Methods

This book has shown the value of intercepting function calls, inspecting the parameters passed to them, and observing their return values. The most prevalent method of hooking function calls at the time of this writing relies

---

on injecting a DLL into the target process and modifying the execution flow of another DLL's exported functions, such as those of ntdll.dll , forcing execution to pass through the EDR's DLL. However, this method is trivial to bypass due to weaknesses inherent in its implementation (see Chapter 2).

Other, more robust methods of intercepting function calls exist, such as using the Microsoft-Windows-Threat-Intelligence ETW provider to indirectly intercept certain syscalls in the kernel, but these have their own limitations. Having multiple techniques for achieving the same effect provides advantages for defenders, as one method may work better in some contexts than others. For this reason, some vendors have leveraged alternative hooking methods in their products to augment their ability to monitor calls to suspicious functions.

"In a 2015 Recon talk titled "Esoteric Hooks," Alex Ionescu expounded on some of these techniques. A few mainstream EDR vendors have implemented one of the methods he outlines: Nirvana hooks. Where gardenvariety function hooking works by intercepting the function's caller, this technique intercepts the point at which the syscall returns to user mode from the kernel. This allows the agent to identify syscalls that didn't originate from a known location, such as the copy of ntdll.dll mapped into a process's address space. Thus, it can detect the use of manual syscalls, a technique that has become relatively common in offensive tools in recent years.

There are a few notable downsides to this hooking method, though.

First, it relies on an undocumented PROCESS_INFORMATION_CLASS and associated structure being passed to NtSetInformationProcess() for each process the product wishes to monitor. Because it isn't formally supported, Microsoft may modify its behavior or disable it entirely at any time. Additionally, the developer must identify the source of the call by capturing the return context and correlating it to a known good image in order to detect manual syscall invocation. Lastly, this hooking method is simple to evade, as adversaries can remove the hook from their process by nulling out the callback via a call to NtSetInformationProcess(), similarly to how the security process initially placed it.

Even if Nirvana hooks are relatively easy to evade, not every adversary has the capability to do so, and the telemetry they provide might still be valuable. Vendors can employ multiple techniques to provide the coverage they desire.

## RPC Filters

Recent attacks have rekindled interest in RPC tradecraft. Lee Christensen's PrinterBug and topotam's PetriPotam exploits, for example, have proven their utility in Windows environments. In response, EDR vendors have begun paying attention to emerging RPC tradecraft in hopes of detecting and preventing their use.

RPC traffic is notoriously difficult to work with at scale. One way EDRs can monitor it is by using RPC filters. These are essentially firewall rules based on RPC interface identifiers, and they're simple to create and deploy using

266    Appendix

---

built-in system utilities. For example, Listing A-1 demonstrates how to ban all inbound DCSync traffic to the current host using netsh.exe interactively. An EDR could deploy this rule on all domain controllers in an environment.

```bash
netsh> rpc filter
netsh rpc filter> add rule layer=um actiontype=block
Ok.
netsh rpc filter: add condition field=if uuid matchtype=equal \
data=e3514235-4b06-11d1-ab04-0cc04fczdcd2
Ok.
netsh rpc filter> add filter
FilterKey: 64377823-cff4-11ec-967c-000c29760114
Ok.
netsh rpc filter> show filter
Listing all RPC Filters.
----------------------
filterKey: 64377823-cff4-11ec-967c-000c29760114
displayData.name: RPCFilter
displayData.description: RPC Filter
filterId: 0x12794
layerKey: um
weight: type: FWP_EMPTY Value: Empty
action.type: block
numFilterConditions: 1
filterCondition[0]
      fieldKey: lf_uuid
      matchType: FWP_MATCH_EQUAL
          conditionValue: Type: FWP_BYTE_ARRAY16_TYPE Value: e3514235 11d14b06 c00004ab d2dcc2af
```

Listing A-1. Adding and listing RPC filters using netsh

These commands add a new RPC filter that specifically blocks any communications using the Directory Replication Service RPC interface (which has the GUID $3514225-4806-1D31-AB04-0004FC0D02). Once the filter is installed via the add filter command, it is live on the system, prohibiting DCSync.

Whenever the RPC filter blocks a connection, the Microsoft-WindowsRPC provider will emit an ETW similar to the one shown in Listing A-2.

```bash
An RPC call was blocked by an RPC firewall filter.
ProcessName: lsss.exe
InterfaceUuid: e3514235-4b06-11d1-a04c-004cf2cd2d
RpcFilterKey: 6377823-cf1a-11ec-967c-0029760114
```

Listing A-2. An ETW event showing activity blocked by a filter

While this event is better than nothing, and defenders could theoretically use it to build detections, it lacks much of the context needed for a robust detection. For example, the principal that issued the request and the direction of traffic (as in, inbound or outbound) are not immediately clear, making it difficult to filter events to help tune a detection.

Auxiliary Sources      267

---

A better option may be to consume a similar event from the MicrosoftWindows-Security-Auditing Secure ETV provider. Since this provider is protected, standard applications can't consume from it. It is, however, fed into the Windows Event Log, where it populates Event ID 5157 whenever the base filtering engine component of the Windows Filtering Platform blocks a request. Listing A-3 contains an example of Event ID 5157. You can see how much more detailed it is than the one emitted by Microsoft-Windows-RPC.

```bash
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
<System>
    <Provider Name="Microsoft-Windows-Security-Auditing" Guid="{54849625-5478-4994
        -A6BA-3f3b80328c30D}"/>
    <EventID>5157c/EventID>
    <Version>1c/Version>
    <Level>0c/Level>
    <Task>12810c/Task>
    <Opcode>0c/Opcode>
    <Keywords>0x801000000000000</Keywords>
    <TimeCreated SystemTime="2022-05-10T12:19:09.6927526002" />
    <EventRecordID>11289563c/EventRecordID>
    <Correlation />
    <execution ProcessID="4" ThreadID="3444" />
    <Channel>Security</Channel>
    <Computer>sun.milkyway.lab</Computer>
    <Security />
</System>
<EventData>
    <Data Name="ProcessID">644</Data>
    <Data Name="Application">device\harddiskvolume2\windows\system32\lsas.exe</Data>
    <Data Name="Direction">%314592</Data>
    <Data Name="SourceAddress">192.168.1.20</Data>
    <Data Name="SourcePort">62749</Data>
    <Data Name="DestAddress">192.168.1.15</Data>
    <Data Name="DestPort">49667c</Data>
    <Data Name="Protocol">6x</Data>
    <Data Name="FilterRID">75664</Data>
    <Data Name="LayerName">%314610c</Data>
    <Data Name="LayerRID">46c</Data>
    <Data Name="RemoteUserID">5>1-0-0c</Data>
    <Data Name="RemoteMachineID">5>1-0-0c</Data>
</EventData>
</Event>
```

Listing A-3: An event manifest for the Microsoft-Windows-Security-Auditing Secure ETW provider

While this event contains much more data, it also has some limitations. Notably, although the source and destination ports are included, the interface ID is missing, making it difficult to determine whether the event is related to the filter that blocks DCSync attempts or another filter entirely. Additionally, this event operates inconsistently across Windows versions, generating correctly in some and completely missing in others. Therefore, some defenders might prefer to use the less-enriched but more consistent RPC event as their primary data source.

268    Appendix

---

## Hypervisors

Hypervisors virtualize one or more guest operating systems, then act as an intermediary between the guest and either the hardware or the base operating system, depending on the hypervisor's architecture. This intermediary position provides EDRs with a unique opportunity for detection.

### How Hypervisors Work

The inner workings of a hypervisor are relatively simple once you understand a few core concepts. Windows runs code at several rings; the code running in a higher ring, such as ring 3 for user mode, is less privileged than code running at a lower one, such as ring 0 for the kernel. Root mode, where the hypervisor resides, operates at ring 0, the lowest architecturally supported privilege level, and limits the operations that the guest, or nonroot mode system, can perform. Figure A-1 shows this process.

![Figure](figures/EvadingEDR_page_295_figure_004.png)

Figure A-1. The operation of VMEKIT and VMEINTER

When a virtualized guest system attempts to execute an instruction or perform some action that the hypervisor must handle, a VMEXIT instruction occurs. When this happens, control transitions from the guest to the hypervisor. The Virtual Machine Control Structure (VMCS) preserves the state of the processor for both the guest and the hypervisor so that it can be restored later. It also keeps track of the reason for the VMEXIT. One VMCS exists for each logical processor of the system, and you can read more about them in volume 3C of the Intel Software Developer's Manual.

### NOTE

For the sake of simplicity, this brief explanation covers the operation of a hypervisor based on Intel VT-x, as Intel CPUs remain the most popular at the time of this writing.

When the hypervisor enters root-mode operation, it may emulate, modify, and log the activity based on the reason for the VMEXIT . These exits may occur for many common reasons, including instructions such as RDMSR , for reading model-specific registers, and CPUID , which returns information about the processor. After the completion of the root-mode operation, execution is transferred back to non-root-mode operation via a VMRESUME instruction, allowing the guest to continue.

There are two types of hypervisors. Products such as Microsoft's Hyper-V and VMware's ESX are what we call Type I hypervisors. This means the hypervisor runs on the bare metal system, as shown in Figure A-2.

Audialry Sources 269

---

![Figure](figures/EvadingEDR_page_296_figure_000.png)

Figure A-2: A Type 1 hypervisor architecture

The other kind of hypervisor, Type 2 , runs in an operating system installed on the bare metal system. Examples of these include VMware's Workstation and Oracle's VirtualBox. The Type 2 architecture is shown in Figure A-3 .

![Figure](figures/EvadingEDR_page_296_figure_003.png)

Figure A-3: A Type 2 hypervisor architecture

Type 2 hypervisors are interesting because they can virtualize a system that is already running. Thus, rather than requiring the end user to log in to their system, start an application such as VMware Workstation, launch a virtual machine, log in to the virtual machine, and then do their work from that virtual machine, their host is the virtual machine. This makes the hypervisor layer transparent to the user (and resident attackers) while allowing the EDR to collect all the telemetry available.

Most EDRs that implement a hypervisor take the Type 2 approach. Even so, they must follow a complicated series of steps to virtualize an existing system. Full hypervisor implementation is far beyond the scope of this book. If this topic interests you, both Daax Rynd and Sina Karvandi have excellent resources for implementing your own.

## Security Use Cases

A hypervisor can provide visibility into system operations at a layer deeper than nearly any other sensor. Using one, an endpoint security product can detect attacks missed by the sensors in other rings, such as the following:

### Virtual Machine Detection

Some malware attempts to detect that it is running in a virtual machine by issuing a CPUID instruction. Since this instruction causes a WEXBIT, the hypervisor has the ability to choose what to return to the caller, allowing it to trick the malware into thinking it isn't running in a VM.

---

## Syscall Interception

A hypervisor can potentially leverage the Extended Feature Enable Register (EFER) function to exit on each syscall and emulate its operation.

## Control Register Modification

A hypervisor can detect the modification of bits in a control register (such as the SMEP bit in the CRt register), which is behavior that could be part of an exploit. Additionally, the hypervisor can exit when a control register is changed, allowing it to inspect the guest execution context to identify things such as token-stealing attacks.

## Memory Change Tracing

A hypervisor can use the page-modification log in conjunction with Extended Page Tables (EPT) to track changes to certain regions of memory.

## Branch Tracing

A hypervisor can leverage the last branch record, a set of registers used to trace branches, interrupts, and exceptions, along with EPT to trace the execution of the program beyond monitoring its syscalls.

## Evading the Hypervisor

One of the difficult things about operating against a system onto which a vendor has deployed a hypervisor is that, by the time you know you're in a virtual machine, you've likely already been detected. Thus, malware developers commonly use virtual-machine-detection functions, such as CPU instructions or sleep acceleration, prior to executing their malware. If the malware finds that it is running in a virtual machine, it may opt to terminate or merely do something benign.

Another option available to attackers is unloading the hypervisor. In the case of Type 2 hypervisors, you might be able to interact with the driver via an I/O control code, by changing the boot configuration, or by directly stopping the controlling service in order to cause the hypervisor to devirtualize the processors and unload, preventing its ability to monitor future actions. To date, there are no public reports of a real-world adversary employing these techniques.

---



---

## INDEX

### A

access mask, 67–68 AcquireFileForMTCreateSection callback, 105 address space layout randomization (ASLR), 87 advaþi ETW functions, 146–149, 211, 253 agent design, 9–11 advanced, 11 basic, 9 intermediate, 10 alertable state, 86–87, 90 algorithmic encoding, 185 altitude, 106 of popular EDRs, 108 Alvarez, Victor, 175 AMSI, 144, 183, 250 checking the trust level for, 190 creating a new session of, 187 initializing, 189 patching, 197–199 scanning the buffer of, 187–189 AMSI Attribute enumeration, 194–195 amsiCAMSiAntimalware::Scan() function, 192 amsi.dll, 189 AMSI scan result values, 188 Ancarani, Riccardo, 118 anonymous pipes, 118 Antimalware Scan Interface. See AMSI anti-transomware, 11, 117 antivirus scanning engine, 172 AppInIt_011s infrastructure, 22 APT3, 247 Arbitrary Code Guard (ACG), 91 assembly GUID, 180 aïllbé4.sys, 235 ATT&CK evaluations, 247 Awesome Procedures on Cypher, 222

### B

bustion, 85 BDCB_CALLBACK_TYPE enumeration, 204 BDCB_CLASSIFICATION enumeration, 206 BDCB_IMAGE_INFORMATION structure, 204, 206 BdcbStatusUpdate events, 204 values of, 206–207 Beacon executing PowerShell with, 253 memory allocation, 234 named pipes, 117–118 postexploitation with, 249–250 beaconing, 11, 13, 85, 125, 142, 245–246 Beacon Object File (BOF), 59, 250 Bifrost, 8–9 BitLocker, 213 Blackbone, 56 BloodHound, 166, 222 Blue Screen of Death, 88 bootkits, 212–213 Boot Manager, 213, 229 bootmgrfi.sfl, 213 boot-start service, 210 boundary-oriented architecture, 124 Batus, Sergey, 215 breakpoint (bp), 34, 83, 167 Bring Your Own Vulnerable Driver (BYOD), 212 brittle detections, 7 Bundesamt für Sicherheit in der Informationsstechnik (BSI), 206 bypasses, types of, 12

### C

CALLBACK_ENTRY_ITEM structure, 65 CallTreeToJSON.py, 222 canary file, 117

---

Chester, Adam, 42–43, 91, 166 choke point, 124 Christensen, Lee, 249, 266 Giholas, Pierre, 74 ci1g_cliOptions overwriting, 101 classify callouts, 135 chr.dll, 80, 166–167, 169 Cobalt Strike, 59, 80, 104, 117–118, 151, 234, 249–250, 253 Cobalt Strike Beacon. See Beacon Coburn, Ceri, 199 Code Integrity, 81–82 Code Signing EKU, 208, 230 command and control, establishing, 244–245 command line tampering, 41–45 common language runtime, 80, 164, 167 COMplus_effInEnabled environment variable, 165 COM server, 193, 247–248, 257 conditional jump, 23 ConsoleCtrlHandler() routine, 158 Control Flow Guard (CFG), 189–190 ConvertFromStd5String cmdlet, 145–146 countersignature, 202–203, 210 CREATE_SUSPENDED flag, 44 CreatingThreadField field, 37–38, 48 Cryptography API: Next Generation (CNG), 206 Cypher, 222–223, 226

## D

dbghelpMiniDumpwriteDump() function, 116, 181 debugging symbols, 256 debug registers, 199 default-username-was-alreadytaken, 252 DefenderCheck, 178-179 Delpy, Benjamin, 100 detections, 4 detour function, 19-22 Detrahere, 201 DigitalOcean, 245 dnSpy, 179-180, 186 download crawle, 185, 253

Driver Signature Enforcement, 169, 212 Duggan, Daniel, 198

## E

Early Launch Antimalware. See ELAM early-launch drivers registry hive, 205 Early Launch EKU, 208 Early-Launch load-order group, 211 edges, 222 ELAM, 202, 205, 209 callback routines, 203–206 developing, 203 loading a driver, 208–212 load order, 210–212 object identifiers, 209 performance requirements, 205 signatures, 205 registration, 229 Elastic detection rules, 8 Empire, 184 encryption, 185 endpoint-based network monitoring, 124–125 Enhanced Key Usage (EKU) extensions, 208, 229 entropy, 253 enumerating shares, 260–262 environmental keying, 254 EProcess5 structure, 53–54, 57, 227 process-image information of, 55 ESPecter bootstrap, 212–213 ETW, 143–144, 146–147, 149, 151, 155, 157–158 consumers, 151 controllers, 149 emitting events, 146 locating event sources, 147 processing events, 158 providers, 144 sensors, 221, 225 starting a trace session, 155 stopping a trace session, 157 ETWinEnabled registry key value, 165 ETW_REG_ENTRY structure, 165, 235–236 EtWi. See Microsoft-Windows-ThreatIntelligence EtWin sensor prefs, 221 evading funtion hooks, 24

274      Index

---

evading memory scanners, 246 evading network filters, 139–142 evading object callbacks, 68–69 events.h, 159 EVENT_DESCRIPTOR structure, 158 EVENT_ENABLE parameters, 154 event ID 4663, 261 event ID 5140, 261 event object, 158 EVENT_RECORD structure, 158 members of, 158–169

Event Tracing for Windows. See ETW Excel Add-On (XLI) files, 240, 242–243

execute-assembly Beacon command, 59, 118 EX_FAST_REF structures, 36 Extended Validation (EV) certificate, 212

## F

Fast I/O, 105 fault tolerance, 262 file detections, 116–117 file-digest algorithm, 210, 250 file exfiltration, 262–263 file handler, hijacking a, 251–258 file signature, 262 FileStandardInformation class, 57 filesystem canaries, 116–117 filesystem minifilter drivers, 103, 106, 108, 114–116, 118 activating, 114–115 altitudes of, 119 architecture, 106–108 callback routines, 106, 110, 113–114 detecting adversary tradecraft, 116–118 evading, 118–120 FLT structures, 111–114 load-order groups, 107 managing, 115–116 unloading, 113, 119 writing, 108–110 filesystem stack, 104–106 filter manager, 104 FilterUnhookCallback callback, 114 FindETWProviderImage, 147

firmware rootkits, 212 Fix, Berndt, 172 FLT _ CALLBACK _ DATA structure, 111, 121 important members of, 111–112 FLTFL _ REGISTRATION structure, 109 fields of, 109–115 FltLib, 116 fltime.exe, 116, 118 fltmgr! minifiler functions, 108, 113–115, 121, 128–129 fltmgr.sysx, 105 fork&run, 58–59, 91, 199 F-PROT, 172 FRISK Software, 172 FSFilter Activity Monitor, 107 FSFilter Anti-Virus, 107 function hooks detecting, 22–24 evading, 24 FWP _ MATCH _ TYPE enumeration, 131 FWP _ structures, 130–131, 134, 136 FwpsCalloutClassify@nt callout function, 135 FWPS structures, 129, 135–139 fwpcu!t! filter engine functions, 130 FWP _ VALUE _ structure, 136

## G

GenerateFileNameCallback function, 114 Get-SmShare PowerShell command, 260 Get-WmiObject PowerShell command, 260 Ghidra, 221 global uniqueness, 243 Golchikov, Andrey, 165 Graeber, Matt, 197 Green, Benjamin, 74 gTunnel, 85–86

## H

Hall, Dylan, 169 HAMSICONTEXT handle, 191-192 HAMSSESSION handle, 191, 193 handle duplication, 63-64, 68 hardware breakpoint, 199 hijacking a file handler, 251-258 HKU hive, 254

Index   275

---

hThemAll.cpp, 77


Hypervisor-Protected Code Integrity


(HVCI), 101

## |

IAntimalware interface, 189 IAntimalwareProvider::Scan(), 192 IDA, 221-222 IMAGE_INFO structure, 81 image-load notifications, 79 collecting information, 81 evading, 84 regarding a callback routine, 80 viewing signature levels, 80-82 Impacket, 84 INF file, 115 InfinityHook, 169 initial access, 240-246 InlineExecute-Assembly Beacon object file, 250 interrupt request levels, 88 Interrupt Request Packets (IRPs), 105 Invoke-Expression PowerShell command, 185 I/O completion port, 75-76 iorate_sys, 208 IROL_NOT_LESS_OR_EQUAL bug check, 88

## J

jitter, 245

JiP instruction, 19

JiE instruction, 23

Johnson, Jonathan, 12

## K

KAPC_ENVIRONMENT enumeration, 89 KAPC injection, 22, 79, 86-91 mitigation of, 90 registration functions, 89-90 Keyberoasting, 8, 13 kernel32j functions, 9 allocating memory on the heap, 47 creating a base service, 233-234 creating a process, 45 creating a remote thread, 244 creating a transaction object, 51 duplicating a handle, 73, 251 installing an ELAM certificate, 232


1

loading a library, 87 locking a file, 110 mapping a portion of a file, 83 opening a process, 18, 47 placing a thread in an alertable state, 86 populating a process attribute list, 46 reading process memory, 43 resuming a suspended thread, 44 rolling back a transaction, 51 setting a process mitigation policy, 91 writing process memory, 44 kernel address space layout randomization (KASLR), 236 kernel asynchronous procedure call (KAPC) injection, 22, 79, 86–91 Kernel Driver Utility (KDU), 169 kernel-mode driver, 5, 9–11, 33 Kernel Patch Protection (KPP), 19 key derivation, 255 known unknowns, 247–248 Kogan, Eugene, 51 Korkin, Igor, 165

## L

Landau, Gabriel, 52 language emulation, 184–185, 197 lateral movement, 124, 258–262 layered network drivers, 125 legacy filters, 104–106 Leidy, Emily, 247 LetsEncrypt SSL certificate, 245 lha.sys, 235 Liberman, Tal, 51 LIST _ ENTR structure, 65 living-off-the-land, 184 LLVM, 256 loading an ELAM driver, 208–212 logman, 149–151 luis.exe, 34, 67–69, 71–73

## M

magic bytes, 262–263 maillots, 103–104, 116 major functions and their purposes, 110

---

makecert.exe, 208–210 Malleable profile, 59, 117 Managed Object Format (MOF), 146 manifests, 146 Marnerides, Angelos K., 74 Matrosov, Alex, 213 Measured Boot, 206–207, 213 measurements, 213 memcpy() function, 169, 243 memory scanner, evading, 246 Metasploit, 84 Michael, Duane, 186 Microsoft Defender, 115 AMSI provider, 186 ELAM, 205 filters, 141 minifilter, 115 object callback routines, 66 process protection, 228 ruleset, 177 scanning, 173 Microsoft Defender for Endpoint (MDE), 215 Microsoft Defender IOfaceAntivirus, 186 Microsoft Detours, 19 MICROSOFTELAMCERTIFICATEINFO ELAM driver resource, 229 Microsoft Macro Assembler (MASM), 25 Microsoft Virus Initiative (MVI), 202 Microsoft-Windows-DNS-Client, 245 Microsoft-Windows-DotNETRuntime, 144, 151, 155, 162, 164, 166, 249 Microsoft Windows Early Launch Antimalware Publisher, 202 Microsoft-Windows-Kernel-Process, 242, 245 Microsoft-Windows-Security-Auditing, 261, 268 Microsoft-Windows-SecurityMitigations sensors, 221 Microsoft-Windows-SMBClient, 261 Microsoft-Windows-ThreatIntelligence, 219 consuming events, 226 ETW provider, 216 evasion, 234–237 event sources, 221 sensors, 221

参考文献

Microsoft-Windows-WeiO, 14, 145, 245 Minidrv, 100–101, 207–208 Minikat, 7, 68–69, 72–73, 180–181, 207 minifilter. See filesystems minifilter drivers Ministry of State Security (China), 247 @modelexblog, 27 mojo, 117 MQW instruction, 236 MgClient.dll, 192–193 MpQwiz.dll, 186, 190–191 msf.sys, 104 msfengp.exe, 228 mssefl.sys, 212 map.sys, 208 mutexcs, 69, 71, 114

## N

@n4rlb, 212 named pipes, 103 detections, 117-118 NDIS, 125-126 interaction between types of drivers, 126 types, 125 Neo4j, 221-223 NET_BUFFER structure, 138 net.exe, 260 NetFilter toolkit, 212 netsh command, 139-140 network-based monitoring, 124-125 Network Driver Interface Specification. See NDIS network filter drivers, 123 callouts, 128 detecting adversary tradecraft, 135 evading, 139-142 filter arbitration, 127 filter engine, 127 legacy driver types, 125 network intrusion detection system (NIDS), 124 NewSelfSignedCertificate cmdlet, 230 New Technology File System (NTFS), 105 nodes, 222 NonPagedPool memory, 88 notification callback routines, 33-34 npfs.sys, 103

Index: 277

---

ntddkk.h header, 82 ntdll.dll, 22–31, 83, 86–87 commonly hooked functions, 19 getting function pointers, 168–169 remapping, 28–31 ntdll functions allocating virtual memory, 23 creating a file, 20 creating a process, 31, 35, 51 creating a thread, 26 loading a DLL, 87 querying an image, 57 querying an object, 71 querying a process, 43 querying system information, 67, 237 registering an ETW event, 147 setting a file for deletion, 53 writing an ETW event, 167 ntEfw functions ETW providers enabling, 216 registering, 217 non-data requests, collecting information about, 105 nfs.sys, 103–104, 106 NObjectManager, 140–141 Get-FacAllOut cmdlet, 141 Get-FacFilter cmdlet, 140 nt!_OBJECT_TYPE structure, 65–66 ntoskr.exe, 101, 148, 222, 226

## 0

obfuscation, 119, 172, 185, 197 object callbacks, 62 evading, 68–69 structures, 62–63, 66–68, 73 object manager, 61 objects, 61 ObjectType structure, 63–64, 67 supported values, 63 on-access scanning, 173–174 on-demand scanning, 173 OperationRegistrationCount member, 62, 64 optional callbacks, 114 OriginalDesiredAccess member, 68

1

## P

PagedPool memory, 88 page hashes, 210 Palntir, 165 ParentImage property, 39 ParentProcessId field, 38, 48 parent process spoofing, 47 PatchGuard, 19, 169 patching, 19, 165, 167–169 payloads delivering, 242 encryption, 242 writing, 240 PEB, 42 returning the image path from, 55 PebBaseAddress member, 44 PerfView, 219 persistence, 246–249 metrics, 246–247 PFLT_FILTER filter pointer, 115 pico, 56 Plug and Play manager, 207 post-operation callbacks, 34, 113–114 PPL, 227 pre-operation callbacks, 34, 110–113 supported values, 112–113 privilege escalation, 250 ProcDump, 68 PROCESS_ALL_ACCESS right, 68 ProcessBasicInformation information class, 44 process callback routine, registering, 35–36 PROCESS_CREATE_PROCESS right, 47 process doppelgänging, 51 PROCESS_DUP_HANDLE right, 251 process environment block (PEB), 42–44, 50, 53–58 Process Explorer, xiii, 73, 227, 234 process ghosting, 52–53, 57 Process Hacker, 42, 44, 47–48 process herpderping, 52 process hollowing, 50 process-image modification, 49–58 detecting, 53–57 doppelgänging, 51 ghosting, 52

参考文献

---

herpadeeping, 52 hollowing, 50 process notifications, 34–39 creation events, collecting information from, 37–39 registering, 35–36 viewing callbacks, 36–37 ProcessParameters PEB field, 42–44, 55, 57 process protections, 227–228 PROCESS_QUERY_INFORMATION right, 72 PROCESS VM_READ right, 47, 68–69, 71 ProgID, 256–257 programmatic identifier, 256 protected processes, 227–228 Protected Process Light (PPL), 227 Proxifier, 85 Proxychains, 85 proxying architecture, 84–85 PsExec, 5, 258

## Q

quote, 213

## R

real-time consumer, 151 real-time protection, 173–174 reconnaissance, 249–250 reflection, 197, 250 REGHANDLE parameter, 149, 217, 235–236 registering a boot-start callback routine, 203–204 registering an image callback routine, 80 registering a process callback routine, 35–36 registering a registry callback routine, 92–93 registering a thread callback routine, 39–40 RegistrationContext member, 62 registry notifications, 79, 91, 95–96 evading, 96 mitigating performance challenges, 95 registering a callback, 92–95 REG_NOTIFY_CLASS registry class, 92–94, 96 remapping ntidll.dll, 28–31

remote thread creation, detecting, 40-41 ResourceFileName registry key value, 147 RFC 3161, 210 robust detections, 7 Rodionov, Eugene, 213 Roedig, Utz, 74 Rubeus, 181 rulesets, 174-175 rules of engagement, 240

## S

sacrificial process, 14, 58–59, 91, 118, 249, 253–254 Saha, Upayan, 235 scanner, 171 evading, 179–181 rulesets, 174–175 scanning models, 172–173 schedsvc.dll, 148 scheduled tasks, 247–248 Schroeder, Will, 172, 249 Seabat, 151, 164, 249–251, 254–255, 259–261 sechost! trace functions 146, 149, 151, 155 Secure Boot, 22 Secure EWTO, 11, 226–227, 268 security descriptor, 130, 134, 141, 145–146 Security Events Component Minifilter, 212 self-describing events, 146 SetoadDriverPrivilege token privilege, 100, 118 sensors, 3–4 ServiceGroupOrder, 211 Set-FileAssoc.fss, 252 srgmgtem.sys, 211 SharpHound, 166, 258 shell preview handlers, 247–248 shims, 126 shutdown handlers, 201 sigmoid.exe, 209–210, 230 SMB, 260–261 socks command, 84 software restriction policy, 81 STARTUPINFO structure, 46

Index 279

---

STATUS_FILE, DELETED error, 53 STATUS_VIRUS_INFECTED failure status, 121 string mangling, 253, 256 string obfuscation, 197 SubjectUserSid field, 254 Such, Jose Miguel, 74 Suhanov, Maxim, 213 syscall, 18–20 dynamically resolving, 27 making direct, 25–27 Sysmon, 38, 40–41, 118–120 SysmonDrv, 118–120 system access control list (SACL), 145, 261 System Guard Runtime Monitor, 212 SystemHandleInformation information class, 70 System.Management.Automation.dll, 186 System Service Dispatch Table (SSDT), 18–19, 218, 221 SysWhispers, 26–27

## T

tamper sensor, 255 tbsiTbsi_Revoke_Attestation() function, 207 tepid_sys, 126 tepp6_sys, 126 tdhl ETW functions, 159, 161–163 telemetry, 2 auxiliary sources of, 266–271 types collected, 9–12 Teodorescu, Claudiu, 165 TEST instruction, 23 thread callback routine, registering, 39–40 thread notifications, 39 ThreatIntProviderGuid GUID, 217 threat names, 178 Thuraisamy, Jackson, 26 Time-Stamp Protocol, 210 To-Be-Signed (TBS) hash, 230–231 Trace Data Helper (TDH) APIs, 146–147, 159 TRACE_EVENT_INFO structure, 160 TRACEHANDLE parameter, 153, 156, 165–166 TraceLogging, 146–147

1

trace sessions, 149-150, 165-166 trampoline, 19 Transactional NTFS (TxF), 51 transport protocol stack, 125 trap flag, 24 Truncer, Chris, 172 Trusted Boot, 202 Trusted Platform Module (TPM), 206-207, 213 tunneling, 84-86

## U

unconditional jump, 19 Uniform Resource Identifier (URI), 244 UserChoice hash, 252–253

## v

Vazarkar, Rohan, 222 vectored exception handler (VEH), 24, 199 Veil, 172 Vienna virus, 172 VirTool, 178 virtual address descriptor (VAD) tree, 56 VirusTotal, 174–175

## W

WdBoot, 211 wdboot.sys, 206 WdFilter, 115 WdFilter.sys, 37, 66 wdm.h, 110 WebClient class, 185 werfault.exe, 41 WerSvc, 41 WEVE_TEMPLATE, 147 WFP, 123, 126-128, 134, 142, 268 architecture, 126-127 base filtering engine, 127 benefits, 126 callout drivers, 128 implementing, 128-134 default filter security descriptor, 134 filter arbitration, 127-128 filter conflict, 142 filter engine, 127-128 FWPM structures, 130-131, 134, 136 .

---

layers and sublayers, 127 weight, 127 white ccl, 240, 242 whoami project, 186 Win32k, 215 Win32_SecurityDescriptorHelper WMI class, 146 Windows bootloader, 211 Windows Error Reporting, 41 Windows Filtering Platform. See WFP Windows firewall, 126, 134 Windows Hardware Quality Labs (WHQL), 212 Windows Software Trace Preprocessor (WPP), 146 Windows Subsystem for Linux (WSL), 36 winload.efi, 211 Winter-Smith, Peter, 24 WNODE_HEADER structure, 153

WPP_INT Tracing macro, 146 Wright, Mike, 172 WS2_32!send() function, 126

## X

XLL files, 240, 242-243 functions of, 240, 242 Xperf, 149

## Y

YARA format, 174–178 alternatives, 176 conditions, 177 jumps, 176 rules, 175–177 wildcards, 176–177

## Z

Zacinto rootkit, 201 Zhang, jiajie, 74

Index 281

---



---

Evading EDR is set in New Baskerville, Futura, Dogma, and TheSansMono Condensed.

---



---

## RESOURCES

Visit https://nostarch.com/evading-edr for errata and more information.

### More no-nonsense books from

![Figure](figures/EvadingEDR_page_311_figure_003.png)

NO STARCH PRESS

![Figure](figures/EvadingEDR_page_311_figure_005.png)

THE ART OF 64-BIT ASSEMBLY, VOLUME I

x86-64, Machine Organization and Programming

BY RANDAL HYDE 1,002 pt., 1964 852-516-0105

![Figure](figures/EvadingEDR_page_311_figure_009.png)

THE GHIDRA BOOK

The Definitive Guide

BY CHRIS EAGLE AND KARA NANCE

608 pp., $59.99 ISBN 978-1-7815-0102-7

![Figure](figures/EvadingEDR_page_311_figure_013.png)

ROOTKITS AND BOOTKS

Creating Modern Malware and Genuine Anti-Bot Software

ALEX MACHONE, EUGENE NAGORSKI, and YAHUA ZHU 448 rue,54005

![Figure](figures/EvadingEDR_page_311_figure_016.png)

HOW TO HACK LIKE A LEGEND

Breaking Windows

BY SPARC FLOW AUGMENTED RESOLUTION 1978-17185-0104-8

![Figure](figures/EvadingEDR_page_311_figure_019.png)

ATTACKING NETWORK

PROTOCOLS

A Hacker's Guide to Capture, Analysis, and Exploitation

JAMES FORMAL 6813 1325 6970 1-877-51-99277500

![Figure](figures/EvadingEDR_page_311_figure_023.png)

CYBERJUTSU Cybersecurity for the Modern Ninja

BY BEN MCGARTY

RESEARCH ARTICLE

07-07-2018 17:15:45

PHONE:

800.420.7240 由 415.863.9900

EMAIL:

SALES@NOSTARCH.COM

WEB:

WWW.NOSTARCH.COM

---



---

![Figure](figures/EvadingEDR_page_313_figure_000.png)

Never before has the world relied so heavily on the Internet to stay connected and informed. That makes the Electronic Frontier Foundation's mission—to ensure that technology supports freedom, justice, and innovation for all people— more urgent than ever.

For over 30 years, EFF has fought for tech users through

activism, in the courts, and by developing software to overcome

obstacles to your privacy, security, and free expression. This

dedication empowers all of us through darkness. With your help

we can navigate toward a brighter digital future.

![Figure](figures/EvadingEDR_page_313_figure_003.png)

LEARN MORE AND JOIN EFF AT EFF.ORG/NO-STARCH-PRESS

---



---

Outsmart the Sentinel

"Unparalleled technical depth and remarkable industry insights."

—Andy Robbins, co-creator of BloodHound

Evading EDR dives deep into the world of endpoint detection and response (EDR) systems. Crafted for security professionals, this definitive guide unravels the layers of EDR, detailing how it functions, detects, and protects. It's not just about understanding the system but also about mastering the art of evading it.

You'll journey through the architectural heart of EDR agents, demystifying their components and capabilities. Discover how they intercept function calls to trace potential malware and navigate the kernel to explore EDR's advanced monitoring techniques. Learn the power of Windows native user-mode logging and how EDRs monitor file loads, handle requests, and even detect early-boot malware.

You'll also delve into:

- → Function-Hooking DLLs: How EDRs detect
malware through user-mode function
interception

→ Kernel Intricacies: From process creation
to object handle requests, the core of
EDR's monitoring prowess

→ Filesystem and Network Monitoring: The
techniques behind tracking filesystem
activity and spotting suspicious network
traffic
- Advanced Scanning: A look at
integrated scanning technologies,
beyond conventional methods
Early Launch Dynamics: Early-boot
malware detection and the intricacies
of ELAM drivers
Niche Sensors: The lesser-known tools
that enrich EDR's toolkit
From leveraging the Windows Filtering Platform to uncovering the dynamics of the Microsoft-Windows-Threat-Intelligence ETW, each chapter is a master class in itself, culminating with a real-world simulation or a red team operation aiming for stealth.

Arm yourself with the knowledge of EDR systems, because understanding the sentinel is the first step to bypassing it.

## About the Author

Matt Hand has spent his entire career in offensive security, leading operations targeting some of the largest organizations in the world. He is a subject matter expert on evasion tradecraft and is passionate about improving security for all.

![Figure](figures/EvadingEDR_page_315_figure_012.png)

THE FINEST IN GEEK ENTERTAINMENT" nostarch.com

