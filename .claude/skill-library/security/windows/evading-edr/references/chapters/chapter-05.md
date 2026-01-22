## 5 IMAGE-LOAD AND REGISTRY NOTIFICATIONS

![Figure](figures/EvadingEDR_page_105_figure_001.png)

The last two kinds of notification callback routines we'll cover in this book are imageload notifications and registry notifications.

An image-load notification occurs whenever an

executable, DLL, or driver is loaded into memory on the system. A registry notification is triggered when specific operations in the registry occur, such as key creation or deletion.

In addition to these notification types, in this chapter we'll also cover how EDRs commonly rely on image-load notifications for a technique called KAPC injection , which is used to inject their function-hooking DLLs. Lastly, we'll discuss an evasion method that targets an EDR's driver directly, potentially bypassing all the notification types we've discussed.

---

## How Image-Load Notifications Work

By collecting image-load telemetry, we can gain extremely valuable information about a process's dependencies. For example, offensive tools that use in-memory .NET assemblies, such as the execute-assembly command in Cobalt Strike's Beacon, routinely load the common language runtime chr.dll into their processes. By correlating an image load of chr.dll with certain attributes in the process's PE header, we can identify non-.NET processes that load chr.dll , potentially indicating malicious behavior.

### Registering a Callback Routine

The kernel facilitates these image-load notifications through the ntTlsSetLoad

ImageNotifyRoutine() API. If a driver wants to receive these events, the developers simply pass in their callback function as the only parameter to that API, as shown in Listing 5-1.

```bash
NTSTATUS DriverEntry(PDRIVER_OBJECT pDriverObj, UNICODE_STRING pRegPath)
{
   NTSTATUS status = STATUS_SUCCESS;
      --snip--
   status = PsSetLoadImageNotifyRoutine(ImageLoadNotificationCallback);
   --snip--
}
void ImageLoadNotificationCallback(
      UNICODE_STRING FullImageName,
      HANDLE ProcessId,
      PIIMAGE_INFO ImageInfo)
{
   --snip--
```

Listing 5-1: Registering an image-load callback routine

Now the system will invoke the internal callback function

ImageLoadNotificationCallback() each time a new image is loaded into a

process.

### Viewing the Callback Routines Registered on a System

The system also adds a pointer to the function to an array, nt!PspLoad ImageNotifyRoutine(). We can traverse this array in the same way as the array used for process-notification callbacks discussed in Chapter 3. In Listing 5-2, we do this to list the image-load callbacks registered on the system.

```bash
1: ¼d> dx ((void**)&0x40)&nt!PspLoadImageNotifyRoutine)
.Where(a => a != 0)
.Select(a => @getSysm(@getCallbackRoutine(a).Function))
```

80 Chapter 5

---

```bash
[0]    :  WdWriter+0x46b7b0  ffff8803 4a6eb7b0
[1]    :  ahcache(CTlmplImageCallBack    ffff8803 4c95eb20)
```

Listing 5-2: Enumerating image-load callbacks

There are notably fewer callbacks registered here than there were for process-creation notifications. Process notifications have more non-security uses than image loads, so developers are more interested in implementing them. Conversely, image loads are a critical datapoint for EDRs, so we can expect to see any EDRs loaded on the system here alongside Defender [6] and the Customer Interaction Tracker [1] .

## Collecting Information from Image Loads

When an image is loaded, the callback routine receives a pointer to an

IMAGE_INFO structure, defined in Listing 5-3. The EDR can collect telemetry from it.

```bash
typedef struct _IMAGE_INFO {
    union {
    ULONG Properties;
    struct {
        ULONG ImageAddressingMode : 8;
        ULONG SystemModeImage : 1;
        ULONG ImageMappedToAllPids : 1;
        ULONG ExtendedInfoPresent : 1;
        ULONG MachineTypeMismatch : 1;
        ULONG ImageSignatureLevel : 4;
        ULONG ImageSignatureType : 3;
        ULONG ImagePartialMap : 1;
        ULONG Reserved : 12;
    };
} PVOID ImageBase;
    ULONG ImageSelector;
    SIZE_T ImageSize;
    ULONG ImageSectionNumber;
} IMAGE_INFO, *IMAGE_INFO;
```

Listing 5-3: The IMAGE_INFO structure definition

This structure has a few particularly interesting fields. First, SystemModeImage is set to 0 if the image is mapped to user address space, such as in DLLs and EXEs. If this field is set to 1, the image is a driver being loaded into kernel address space. This is useful to an EDR because malicious code that loads into kernel mode is generally more dangerous than code that loads into user mode.

The ImageSignatureLevel field represents the signature level assigned to the image by Code Integrity, a Windows feature that validates digital signatures, among other things. This information is useful for systems that implement some type of software restriction policy. For example, an organization might require that certain systems in the enterprise run signed code

Image-Load and Registry Notifications 8

---

only. These signature levels are constants defined in the niddk.h header and shown in Listing 5-4.

```bash
#define SE_SIGNING_LEVEL_UNChecked       0x00000000
#define SE_SIGNING_LEVEL_UNSligned       0x00000001
#define SE_SIGNING_LEVEL_ENTERPRISE      0x00000002
#define SE_SIGNING_LEVEL_CUSTOM_1        0x00000003
#define SE_SIGNING_LEVEL_DEVELOPER      SE_SIGNING_LEVEL_CUSTOM_1
#define SE_SIGNING_LEVEL_AUTHENICODE      0x00000004
#define SE_SIGNING_LEVEL_CUSTOM_2        0x00000005
#define SE_SIGNING_LEVEL_STORE        0x00000006
#define SE_SIGNING_LEVEL_CUSTOM_3        0x00000007
#define SE_SIGNING_LEVEL_ANTIMALWARE      SE_SIGNING_LEVEL_CUSTOM_3
#define SE_SIGNING_LEVEL_MICROSOFT       0x00000008
#define SE_SIGNING_LEVEL_CUSTOM_4        0x00000009
#define SE_SIGNING_LEVEL_CUSTOM_5        0x0000000A
#define SE_SIGNING_LEVEL_DYNAMIC_CODEGEN  0x0000000B
#define SE_SIGNING_LEVEL_WINDOWS        0x0000000C
#define SE_SIGNING_LEVEL_CUSTOM_7        0x0000000D
#define SE_SIGNING_LEVEL_WINDOWS_TCB         0x0000000E
#define SE_SIGNING_LEVEL_CUSTOM_6        0x0000000F
```

Listing 5-4: Image signature levels

The purpose of each value isn't well documented, but some are selfexplanatory. For instance, SE_SIGNING_LEVEL_UNUSED is for unsigned code, SE_SIGNING_LEVEL_WINDOWS indicates that the image is an operating system component, and SE_SIGNING_LEVEL_ANTIMALWARE has something to do with antimalware protections.

The ImageSignatureType field, a companion to ImageSignatureLevel, defines the signature type with which Code Integrity has labeled the image to indicate how the signature was applied. The SE_IMAGE_SIGNATURE_TYPE enumeration that defines these values is shown in Listing 5-5.

```bash
typedef enum _SE_IMAGE_SIGNATURE_TYPE
{
    SeImageSignatureNone = 0,
    SeImageSignatureEmbedded,
    SeImageSignatureCache,
    SeImageSignatureCatalogCached,
    SeImageSignatureCatalogNotCached,
    SeImageSignatureCatalogHint,
    SeImageSignaturePackageCatalog,
} SE_IMAGE_SIGNATURE_TYPE, *PSE_IMAGE_SIGNATURE_TYPE;
```

Listing 5-5: The SE_IMAGE_SIGNATURE_TYPE enumeration

The Code Integrity internals related to these properties are outside the scope of this chapter, but the most commonly encountered are

SeImageSignatureNone (meaning the file is unsigned), SeImageSignatureEmbedded (meaning the signature is embedded in the file), and SeImageSignatureCache (meaning the signature is cached on the system).

82 Chapter 5

---

If the ImagePartailMap value is nonzero, the image being mapped into the process's virtual address space isn't complete. This value, added in Windows 10, is set in cases such as when kernel32HAppFileOff16() is invoked to map a small portion of a file whose size is larger than that of the process's address space. The ImageBase field contains the base address into which the image will be mapped, in either user or kernel address space, depending on the image type.

It is worth noting that when the image-load notification reaches the driver, the image is already mapped. This means that the code inside the DLL is in the host process's virtual address space and ready to be executed. You can observe this behavior with WinDbg, as demonstrated in Listing 5-6.

```bash
0: kd> bp ntlpsCallImageNotifyRoutines
0: kd> g
Breakpoint 0 hit
ntlpsCallImageNotifyRoutines:
ffffffff803'49402bc0 488bc4      mov   rax,rsp
0: kd> dt _UNICODE_STRING @rcc
ntdll!_UNICODE_STRING
    {"SystemRoot!System32!ntdll.dll"
  +0x000 Length        : 0x3c
  +0x002 MaximumLength : 0x3e
  +0x008 Buffer        : 0xfffff803'49789b98 ¤"SystemRoot!System32!ntdll.dll"
```

Listing 5-6: Extracting the image name from an image-load notification

We first set a breakpoint on the function responsible for traversing the array of registered callback routines. Then we investigate the RCX register when the debugger breaks. Remember that the first parameter passed to the callback routine, stored in RCX, is a Unicode string containing the name of the image being loaded .

Once we have this image in our sights, we can view the current process's VADs, shown in Listing 5-7, to see which images have been loaded into the current process, where, and how.

```bash
0 :kd> lvad
VAD          Level Commit
--snip--
ffffffff8b952fd80 0    0 Mapped READONLY Pagefile section, shared commit 0x1
ffffffff8b952eda20 0    2 Mapped READONLY Pagefile section, shared commit 0x23
ffffffff8b952d60 1    1 Mapped NO_ACCESS Pagefile section, shared commit 0xE0e
ffffffff8b952c5e0 2    4 Mapped Exec EXECUTE_WRITECOPY \windows\System32\notepad.exe
ffffffff8b952db20 3    16 Mapped Exec EXECUTE_WRITECOPY \windows\System32\ntdll.dll
```

Listing 5-7: Checking the VADs to find the image to be loaded

The last line of the output shows that the target of the image-load notipation, $ntlldll$ in our example, is labeled Mapped . In the case of EDR, this means that we know the DLL is located on disk and copied into memory. The loader needs to do a few things, such as resolving the DLL's dependencies, before the OILMain() function inside the DLL is called and its code

---

begins to execute. This is particularly relevant only in situations where the EDR is working in prevention mode and might take action to stop the DLL from executing in the target process.

## Evading Image-Load Notifications with Tunneling Tools

An evasion tactic that has gained popularity over the past few years is to proxy one's tooling rather than run it on the target. When an attacker avoids running post-exploitation tooling on the host, they remove many host-based indicators from the collection data, making detection extremely difficult for the EDR. Most adversary toolkits contain utilities that collect network information or act on other hosts in the environment. However, these tools generally require only a valid network path and the ability to authenticate to the system with which they want to interact. So attackers don't have to execute them on a host in the target environment.

One way of staying off the host is by proxies the tools from an outside computer and then routing the tool's traffic through the compromised host. Although this strategy has recently become more common for its usefulness in evading EDR solutions, the technique isn't new, and most attackers have performed it for years by using the Metasploit Framework's auxiliary modules, particularly when their complex tool sets won't work on the target for some reason. For example, attackers sometimes wish to make use of the tools provided by Impacket, a collection of classes written in Python for working with network protocols. If a Python interpreter isn't available on the target machine, the attackers need to hack together an executable file to drop and execute on the host. This creates a lot of headaches and limits the operational viability of many toolkits, so attackers turn to proxying instead.

Many command-and-control agents, such as Beacon and its socks command, support some form of proxying. Figure 5-1 shows a common proxying architecture.

![Figure](figures/EvadingEDR_page_110_figure_005.png)

Figure 5-1: A generic proxying architecture

After deploying the command-and-control agent in the target environment, operators will start a proxy on their server and then associate the agent with the proxy. From thereon, all traffic routed through the proxy

84 Chapter 5

---

will pass through a bastion , a host used to obfuscate the true location of the command-and-control server, to the deployed agent, allowing the operator to tunnel their tools into the environment. An operator may then use tools such as Proxychains or Proxifier to force their post-exploitation tooling, running on some external host, to ship its traffic through the proxy and act as if it were running on the internal environment.

There is, however, one significant downside to this tactic. Most offensive security teams use noninteractive sessions, which introduce a planned delay between the command-and-control agent's check-ins with its server. This allows the beaconing behavior to blend into the system's normal traffic by reducing the total volume of interactions and matching the system's typical communications profile. For example, in most environments, you wouldn't find much traffic between a workstation and a banking site. By increasing the interval between check-ins to a server posing as a legitimate banking service, attackers can blend into the background. But when proxing, this practice becomes a substantial headache, as many tools aren't built to support high-latency channels. Imagine trying to browse a web page but only being allowed to make one request per hour (and then having to wait another hour for the results).

To work around this, many operators will reduce the check-in intervals to nearly zero, creating an interactive session. This lessens network latency, allowing the post-exploitation tooling to run without delay. However, because nearly all command-and-control agents use a single communications channel for check-ins, tasking, and the sending of output, the volume of traffic over this single channel can become significant, tipping off defenders that suspicious beaconing activity is taking place. This means attackers must make some trade-offs between host-based and network-based indicators with respect to their operating environment.

As EDR vendors enhance their ability to identify beaconing traffic, offensive teams and developers will continue to advance their tradecraft to evade detection. One of the next logical steps in accomplishing this is to use multiple channels for command-and-control tasking rather than only one, either by employing a secondary tool, such as gTunnel, or by building this support into the agent itself. Figure 5 - 2 shows an example of how this could work.

![Figure](figures/EvadingEDR_page_111_figure_004.png)

Figure 5-2: The gTunnel proxying architecture

---

In this example, we still use the existing command-and-control channel to control the agent deployed on the compromised host, but we also add a gTunnel channel that allows us to proxy our tooling. We execute the tooling on our attacker host, virtually eliminating the risk of host-based detection, and route the tool's network traffic through gTunnel to the compromised system, where it continues as if it originated from the compromised host. This still leaves open the opportunity for defenders to detect the attack using network-based detections, but it greatly reduces the attacker's footprint on the host.

## Triggering KAPC Injection with Image-Load Notifications

Chapter 2 discussed how EDRs often inject function-hooking DLLs into newly created processes to monitor calls to certain functions of interest. Unfortunately for vendors, there is no formally supported way of injecting a DLL into a process from kernel mode. Ironically, one of their most common methods of doing so is a technique often employed by the malware they seek to detect: APC injection. Most EDR vendors use KAPC injection, a procedure that instructs the process being spawned to load the EDR's DLL, despite it not being explicitly linked to the image being executed.

To inject a DLL, EDRs can't simply write the contents of the image into the process's virtual address space however they wish. The DLL must be mapped in a manner that follows the PE format. To achieve this from kernel mode, the driver can use a pretty neat trick: relying on an image-load callback notification to watch for a newly created process loading ntdll.dll . Loading ntdll.dll is one of the first things a new process does, so if the driver can notice this happening, it can act on the process before the main thread begins its execution: a perfect time to place its hooks. This section walks you through the steps to inject a function-hooking DLL into a newly created 64-bit process.

### Understanding KAPC Injection

KAPC injection is relatively straightforward in theory and only gets murky when we talk about its actual implementation in a driver. The general gist is that we want to tell a newly created process to load the DLL we specify. In the case of EDRs, this will almost always be a function-hooking DLL. APCs, one of several methods of signaling a process to do something for us, wait until a thread is in an alertable state, such as when the thread executes kernels132!51eepEx() or kernel32!WaitForSingleObjectEx(), to perform the task we requested.

KAPC injection queues this task from kernel mode, and unlike plain user-mode APC injection, the operating system doesn't formally support it, making its implementation a bit hacky. The process consists of a few steps. First, the driver is notified of an image load, whether it be the process image (such as notepad.exe) or a DLL that the EDR is interested in. Because the notification occurs in the context of the target process, the driver then searches the currently loaded modules for the address of a function that

86 Chapter 5

---

can load a DLL, specifically dtl11\dtl0adll(). Next, the driver initializes a few key structures, providing the name of the DLL to be injected into the process; initializes the KAPC, and queues it for execution into the process. Whenever a thread in the process enters an alertable state, the APC will be executed and the EDR driver's DLL will be loaded.

To better understand this process, let's step through each of these stages in greater detail.

## Getting a Pointer to the DLL-Loading Function

Before the driver can inject its DLL, it must get a pointer to the undocumented ndtll16tcdta01() function, which is responsible for loading a DLL into a process, similarly to kernel32!LoadLibrary(). This is defined in Listing 5-8.

```bash
NTSTATUS
LdrLoadDll(IN PWSTR SearchPath OPTIONAL,
          IN PULONG DLCharacteristics OPTIONAL,
          IN PUNICODE_STRING DLName,
          OUT PVOID *BaseAddress)
```

Listing 5-8: The LdrLoadDll() definition

Note that there is a difference between a DLL being loaded and it being fully mapped into the process. For this reason, a post-operation callback may be more favorable than a pre-operation callback for some drivers. This is because, when a post-operation callback routine is notified, the image is fully mapped, meaning that the driver can get a pointer to ntdllldrvIo@01() in the mapped copy of ntdll.dll. Because the image is mapped into the current process, the driver also doesn't need to worry about address space layout randomization (ASLR).

## Preparing to Inject

Once the driver gets a pointer to ntdll1!ldrtofl(), it has satisfied the most important requirement for performing KAPC injection and can start injecting its DLL into the new process. Listing 5-9 shows how an EDR's driver might perform the initialization steps necessary to do so.

```bash
typedef struct _INJECTION_CTX
{
    UNICODE_STRING dll;
    WCHAR Buffer[MAX_PATH];
} INJECTION_CTX, *PINJECTION_CTX
void Injector()
{
   NTSTATUS status = STATUS_SUCCESS;
   PINJECTION_CTX ctx = NULL;
   const UNICODE_STRING DllName = RTL_CONSTANT_STRING(L"hooks.dll");
   --snip--
                                                               ImageLoad and Registry Notifications   87
```

---

```bash
# status = ZwAllocateVirtualMemory(
        zwCurrentProcess(),
        (PVOID *)&ctx,
        0,
        sizeof(INJECTION_CTX),
        MEM_COMMIT | MEMreserve,
        PAGE_READWRITE
    );
   --snip--
     RtlInitEmptyUnicodeString(
        &ctx->Dll,
        ctx->Buffer,
        sizeof(ctx->Buffer)
    );
  # RtlUnicodeStringCopyString(
        &ctx->Dll,
        DllName
    );
   --snip--
```

Listing 5-9. Allocating memory in the target process and initializing the context structure

The driver allocates memory inside the target process ❶ for a context structure containing the name of the DLL to be injected ❷.

## Creating the KAPC Structure

After this allocation and initialization completes, the driver needs to allocate space for a KPC structure, as shown in Listing 5-10. This structure holds the information about the routine to be executed in the target thread.

```bash
PKAPC pKapc = (PKAPC)ExAllocatePoolWithTag(
    NonPagedPool,
    sizeof(KAPC),
    'CPAK'
);
```

Listing 5-10: Allocating memory for the KAPC structure

The driver allocates this memory in NonPagedPool , a memory pool that guarantees the data will stay in physical memory rather than being paged out to disk as long as the object is allocated. This is important because the thread into which the DLL is being injected may be running at a high interrupt request level, such as DISPATCH_LEVEL , in which case it shouldn't access memory in the PagedPool , as this causes a fatal error that usually results in an IRQL_NOT_LESS_OR_EQUAL bug check (also known as the Blue Screen of Death).

88 Chapter 5

---

Next, the driver initializes the previously allocated KPC structure using the undocumented KtInitializeApc() API, shown in Listing 5-11.

```bash
VOID KeInitializeApc(
    PKAPC_Apc,
    PTHREAD_Thread,
    KAPC_ENVIRONMENT Environment,
    PKERKERNL_ROUTINE KernelRoutine,
    PKRUNDOWN_ROUTINE RundownRoutine,
    PKNORMAL_ROUTINE NormalRoutine,
    KPROCESSOR_MODE ApcMode,
    PVOID NormalContext
);
Listing 5-11: The nt!KeInitializeApc() definition
```

In our driver, the call to nt!NInitializeApc() would look something like what is shown in Listing 5-12.

```bash
KeInitializeApc(
    pKapc,
    KeGetCurrentThread(),
    OriginalApcEnvironment,
    (PKERNEL_ROUTINE)OurKernelRoutine,
    NULL,
    (PKNORMAL_ROUTINE)pfnIdrLoadDll,
    UserMode,
    NULL
    );
Listing 5-12: The call to nt!KeInitializeApc() with the details for DLL injection
```

This function first takes the pointer to the KAPC structure created previously, along with a pointer to the thread into which the APC should be queued, which can be the current thread in our case. Following these parameters is a member of the KAPC_ENVIRONMENT enumeration, which should be 0 or 1 . ApcEnvironment (0), to indicate that the APC will run in the thread's process context.

The next three parameters, the routines, are where a bulk of the work happens. The KernelRoutine, named OurKernelRoutine() in our example code, is the function to be executed in kernel mode at APC_LEVEL before the APC is delivered to user mode. Most often, it simply frees the KAPC object and returns. The R!ndownRoutine function is executed if the target thread is terminated before the APC was delivered. This should free the KAPC object, but we've kept it empty in our example for the sake of simplicity. The N$mainRoutine function should execute in user mode at PASSIVE_LEVEL when the APC is delivered. In our case, this should be the function pointer to ntdll1drLoadDll(). The last two parameters, ApcMode and NormalContext, are set to UserMode (1) and the parameter passed as NormalRoutine, respectively.

---

### Queueing the APC

Lastly, the driver needs to queue this APC. The driver calls the undocumented function VkImsentQueueApp(), defined in Listing 5-13.

```bash
BOOL KeInsert0QueueApc(
    PRKAPC Apc,
    PVOID SystemArgument1,
    PVOID SystemArgument2,
    KPRIORITY Increment
};
```

Listing 5-13: The nt!KeInsertQueueApc() definition

This function is quite a bit simpler than the previous one. The first input parameter is the APC, which will be the pointer to the KMC we created. Next are the arguments to be passed. These should be the path to the DLL to be loaded and the length of the string containing the path. Because these are the two members of our custom INJECTION_CTX structure, we simply reference the members here. Finally, since we're not incrementing anything, we can set Increment to 0.

At this point, the DLL is queued for injection into the new process whenever the current thread enters an alertable state, such as if it calls kernel32!WaitForSingleObject() or Sleep(). After the APC completes, the EDR will start to receive events from the DLL containing its hooks, allowing it to monitor the execution of key APIs inside the injected function.

## Preventing KAPC Injection

Beginning in Windows build 10586, processes may prevent DLLs not signed by Microsoft from being loaded into them via process and thread mitigation policies. Microsoft originally implemented this functionality so that browsers could prevent third-party DLLs from injecting into them, which could impact their stability.

The mitigation strategies work as follows. When a process is created via the user-mode process-creation API, a pointer to a STARTUPINFOX structure is expected to be passed as a parameter. Inside this structure is a pointer to an attribute list, PROC_THREAD_ATTRIBUTE_LIST . This attribute list, once initialized, supports the attribute PROC_THREAD_ATTRIBUTE_MITIGATION_POLICY . When this attribute is set, the lpValue member of the attribute may be a pointer to a DWORD containing the PROCESS_CREATION_MITIGATION_POLICY_BLOCK_NON_MICROSOFT BinaryS_Always_on flag. If this flag is set, only DLLs signed by Microsoft will be permitted to load in the process. If a program tries to load a DLL not signed by Microsoft, a STATUS_INVALID_IMAGE_ERROR will be returned. By leveraging this attribute, processes can prevent EDRs from injecting their function-hooking DLL, allowing them to operate without fear of function interception.

A caveat to this technique is that the flag is only passed to processes being created and does not apply to the current process. Because of this,

90 Chapter 5

---

it is best suited for command-and-control agents that rely on the fork/run architecture for post-exploitation tasks, as each time the agent queues a task, the sacrificial process will be created and have the mitigation policy applied. If a malware author would like this attribute to apply to their original process, they could leverage the kernel32\SetProcess#MitigationPolicy() API and its associated ProcessSignaturePolicy policy. By the time the process would be able to make this API call, however, the EDR's function-hooking DLL would be loaded in the process and its hooks placed, rendering this technique nonviable.

Another challenge with using this technique is that EDR vendors have begun to get their DLLs attestation-signed by Microsoft, as shown in Figure 5-3, allowing them to be injected into processes even if the flag was set.

![Figure](figures/EvadingEDR_page_117_figure_002.png)

Figure 5-3: CrowdStrike Falcon's DLL countersigned by Microsoft

In his post "Protecting Your Malware with blockfills and ACG," Adam Chester describes using the PROCESS_CREATION_MITIGATION_POLICY_PROHIBIT \_DYNAMIC_CODE_ALWAYS_ON flag, commonly referred to as Arbitrary Code Guard (ACG), to prevent the modification of executable regions of memory, a requirement of placing function hooks. While this flag prevented function hooks from being placed, it also prevented many off-the-shelf commandand-control agents' shellcode from executing during testing, as most rely on manually setting pages of memory to read-write-execute (RWX).

## How Registry Notifications Work

Like most software, malicious tools commonly interact with the registry, such as by querying values and creating new keys. In order to capture these interactions, drivers can register notification callback routines that get alerted any time a process interacts with the registry, allowing the driver to prevent, tamper with, or simply log the event.

Image-Load and Registry Notifications 91

---

Some offensive techniques rely heavily on the registry. We can often detect these through registry events, assuming we know what we're looking for. Table 5-1 shows a handful of different techniques, what registry keys they interact with, and their associated REG_NOTIFY_CLASS class (a value we'll discuss later in this section).

Table 5-1: Attacker Tradecraft in the Registry and the Related REG_NOTIFY_CLASS Members

<table><tr><td>Technique</td><td>Registry location</td><td>REG_NOTIFY_CLASS members</td></tr><tr><td>Run-key persistence</td><td>HKLM\Software\Microsoft\Windows\CurrentVersion\Run</td><td>RegntCreateKey(Ex)</td></tr><tr><td>Security Support Provider (SSP) persistence</td><td>HKLM\SYSTEM\CurrentControlSet\Control\Lsa\Security Packages</td><td>RegntSetValueKey</td></tr><tr><td>Component Object Model (COM) hijack</td><td>HKLM\SOFTWARE\Classes\CLSID\CLSID&gt;</td><td>RegntSetValueKey</td></tr><tr><td>Service hijack</td><td>HKLM\SYSTEM\CurrentControlSet\Services\&lt;ServiceName&gt;</td><td>RegntSetValueKey</td></tr><tr><td>Link-Local Multicast Name Resolution (LLMNR) poisoning</td><td>HKLM\Software\Policies\Microsoft\Windows NT\DNSClient</td><td>RegntQueryValueKey</td></tr><tr><td>Security Account Manager dumping</td><td>HKLM\SAM</td><td>Regnt(Pre/Post)SaveKey</td></tr></table>

To explore how adversaries interact with the registry, consider the technique of service hijacking. On Windows, services are a way of creating long-running processes that can be started manually or on boot, similar to daemons on Linux. While the service control manager manages these services, their configurations are stored exclusively in the registry, under the HKEY_LOCAL_MACHINE (HKLM) hive. For the most part, services run as the privileged NT AUTHORITYSYSTEM account, which gives them pretty much full control over the system and makes them a juicy target for attackers.

One of the ways that adversaries abuse services is by modifying the registry values that describe the configuration of a service. Inside a service's configuration, there exists a value, ImagePath , that contains the path to the service's executable. If an attacker can change this value to the path for a piece of malware they've placed on the system, their executable will be run in this privileged context when the service is restarted (most often on system reboot).

Because this attack procedure relies on registry value modification, an EDR driver that is monitoring RegSetValueKey-type events could detect the adversary's activity and respond accordingly.

## Registering a Registry Notification

To register a registry callback routine, drivers must use the ntlcm@register callback(x) function defined in Listing 5-14. The Cm prefix references the configuration manager, which is the component of the kernel that oversees the registry.

92 Chapter 5

---

```bash
NTSTATUS CmRegisterCallbackEx(
    PEX_CALLBACK_FUNCTION Function,
    PCUNICODE_STRING        Altitude,
    PVOID             Driver,
    PVOID             Context,
    PLARGE_INTEGER      Cookie,
    PVOID             Reserved
);
```

Listing 5-14: The nt!CmRegisterCallbackEx() prototype

Of the callbacks covered in this book, the registry callback type has the most complex registration function, and its required parameters are slightly different from those for the other functions. First, the function parameter is the pointer to the driver's callback. It must be defined as an EX_CALLBACK_FUNCTION, according to Microsoft's Code Analysis for Drivers and the Static Driver Verifier, and it returns an NTSTATUS. Next, as in objectnotification callbacks, the AltTexture parameter defines the callback's position in the callback stack. The driver is a pointer to the driver object, and Context is an optional value that can be passed to the callback function but is very rarely used. Lastly, the Cookie parameter is a LARGE_INTEGER passed to ntCoRegRegisterCallback() when unloading the driver.

When a registry event occurs, the system invokes the callback function. Registry callback functions use the prototype in Listing 5-15.

```bash
NTSTATUS ExCallbackFunction(
  PVOID CallbackContext,
  PVOID Argument1,
  PVOID Argument2
)
```

Listing 5-15: The nt!ExCallbackFunction() prototype

The parameters passed to the function may be difficult to make sense of at first due to their vague names. The Context parameter is the value defined in the registration function's Context parameter, and Amount is a value from the REG_NOTIFY class enumeration that specifies the type of action that occurred, such as a value being read or a new key being created. While Microsoft lists 62 members of this enumeration, those with the member prefixes Regt, RegtPre, and RegtPost represent the same activity generating notifications at different times, so by deduplicating the list, we can identify 24 unique operations. These are shown in Table 5-2.

Table 5-2: Stripped REG_NOTIFY_CLASS Members and Descriptions

<table><tr><td>Registry operation</td><td>Description</td></tr><tr><td>DeleteKey</td><td>A registry key is being deleted.</td></tr><tr><td>SetValueKey</td><td>A value is being set for a key.</td></tr><tr><td>DeleteValueKey</td><td>A value is being deleted from a key.</td></tr></table>

(continued)

Image-load and Registry Notifications 93

---

Table 5-2: Stripped REG_NOTIFY_CLASS Members and Descriptions (continued)

<table><tr><td>Registry operation</td><td>Description</td></tr><tr><td>SetInformationKey</td><td>Metadata is being set for a key.</td></tr><tr><td>RenameKey</td><td>A key is being renamed.</td></tr><tr><td>EnumerateKey</td><td>Subkeys of a key are being enumerated.</td></tr><tr><td>EnumerateValueKey</td><td>Values of a key are being enumerated.</td></tr><tr><td>QueryKey</td><td>A key&#x27;s metadata is being read.</td></tr><tr><td>QueryValueKey</td><td>A value in a key is being read.</td></tr><tr><td>QueryMultipleValueKey</td><td>Multiple values of a key are being queried.</td></tr><tr><td>CreateKey</td><td>A new key is being created.</td></tr><tr><td>OpenKey</td><td>A handle to a key is being opened.</td></tr><tr><td>KeyHandleClose</td><td>A handle to a key is being closed.</td></tr><tr><td>CreateKeyEx</td><td>A key is being created.</td></tr><tr><td>OpenKeyEx</td><td>A thread is trying to open a handle to an existing key.</td></tr><tr><td>FlushKey</td><td>A key is being written to disk.</td></tr><tr><td>LoadKey</td><td>A registry hive is being loaded from a file.</td></tr><tr><td>UnLoadKey</td><td>A registry hive is being unloaded.</td></tr><tr><td>QueryKeySecurity</td><td>A key&#x27;s security information is being queried.</td></tr><tr><td>SetKeySecurity</td><td>A key&#x27;s security information is being set.</td></tr><tr><td>RestoreKey</td><td>A key&#x27;s information is being restored.</td></tr><tr><td>SaveKey</td><td>A key&#x27;s information is being saved.</td></tr><tr><td>ReplaceKey</td><td>A key&#x27;s information is being replaced.</td></tr><tr><td>QueryKeyName</td><td>The full registry path of a key is being queried.</td></tr></table>

The Argument2 parameter is a pointer to a structure that contains information relevant to the operation specified in Argument1. Each operation has its own associated structure. For example, RegntPrecreateKeyEx operations use the REG_CREATE_KEY_INFORMATION structure. This information provides the relevant context for the registry operation that occurred on the system, allowing the EDR to extract the data it needs to make a decision on how to proceed.

Every pre-operation member of the REG_NOTIFY_CLASS enumeration (those that begin with RegtPre or simply Reght) uses structures specific to the type of operation. For example, the RegtPreQueryKey operation uses the REG_QUERY_KEY_INFORMATION structure. These pre-operation callbacks allow the driver to modify or prevent the request from completing before execution is handed off to the configuration manager. An example of this using the previous RegtPreQueryKey member would be to modify the KeyInformation member of the REG_QUERY_KEY_INFOATION structure to change the type of information returned to the caller.

Post-operation callbacks always use the REG_POST_OPERATION_INFORMATION structure, with the exception of RegtPostCreateKey and RegtPostDenkey.

---

which use the REG_POST_CREATE_KEY_INFORMATION and REG_POST_OPEN_KEY_INFORMATION structures, respectively. This post-operation structure consists of a few interesting members. The Object member is a pointer to the registrykey object for which the operation was completed. The Status member is the NTSTATUS value that the system will return to the caller. The ReturnStatus member is an NTSTATUS value that, if the callback routine returns STATUS \_CALLBACK_BYPASS, will be returned to the caller. Lastly, the PreInformation member contains a pointer to the structure used for the corresponding pre-operation callback. For example, if the operation being processed is RegntPreQueryKey, the PreInformation member would be a pointer to a REG \_QUERY_KEY_INFORMATION structure.

While these callbacks don't allow the same level of control as preoperation callbacks do, they still give the driver some influence over the value returned to the caller. For example, the EDR could collect the return value and log that data.

## Mitigating Performance Challenges

One of the biggest challenges that EDRs face when receiving registry notifications is performance. Because the driver can't filter the events, it receives every registry event that occurs on the system. If one driver in the callback stack performs some operation on the data received that takes an excessive amount of time, it can cause serious system performance degradation. For example, during one test, a Windows virtual machine performed nearly 20,000 registry operations per minute at an idle state, as shown in Figure 5 - 4 . If a driver took some action for each of these events that lasted an additional millisecond, it would cause a nearly 30 percent degradation to system performance.

![Figure](figures/EvadingEDR_page_121_figure_004.png)

Figure 5.4: A total of 19,833 registry events captured in one minute

To reduce the risk of adverse performance impacts, EDR drivers must carefully select what they monitor. The most common way that they do

Image-load and Registry Notifications 95

---

this is by monitoring only certain registry keys and selectively capturing event types. Listing 5-16 demonstrates how an EDR might implement this behavior.

```bash
NTSTATUS RegistryNotificationCallback(
        PVOID pCallbackContext,
        PVOID pRegNotifyClass,
        PVOID pInfo)
{
    NTSTATUS status = STATUS_SUCCESS;
  ⚐ switch (((REG_NOTIFY_CLASS)(ULONG_PTR)pRegNotifyClass))
    {
      case RegNtPostCreateKey:
        ⚐ PREG_POST_OPERATION_INFORMATION_pPostInfo =
            ((PREG_POST_OPERATION_INFORMATION)pInfo;
            --snjp--
            break;
    }
      case RegNtPostSetValueKey:
        {
            --snjp--
            break;
    }
    default:
            break;
    }
   return status;
}
```

Listing 5-16: Scoping a registry callback notification routine to work with specific operations only

In this example, the driver first casts the pRegNotifyClass input parameter to a REG_NOTIFY_CLASS structure for comparison using a switch case. This is to make sure it's working with the correct structure. The driver then checks whether the class matches one that it supports (in this case, key creation and the setting of a value). If it does match, the pInfo member is cast to the appropriate structure so that the driver can continue to parse the event notification data.

An EDR developer may want to limit its scope even further to lessen the performance hit the system will take. For instance, if a driver wants to monitor service creation via the registry, it would need to check for registry-key creation events in the HKLM\SYSTEM\CurrentControlSet\Services) path only.

## Evading Registry Callbacks

Registry callbacks have no shortage of evasion opportunities, most of which are due to design decisions aimed at improving system performance. When drivers reduce the number of registry events they monitor, they can

96 Chapter 5

---

introduce blind spots in their telemetry. For example, if they're only monitoring events in HKLM , the hive used for the configuration of items shared across the system, they won't detect any per-user registry keys created in HKCU or HKU , the hives used to configure items specific to a single principal. And if they're monitoring registry-key creation events only, they'll miss registry-key restoration events. EDRs commonly use registry callbacks to help protect unauthorized processes from interacting with registry keys associated with its agent, so it's safe to assume that some of the allowable performance overhead is tied up in that logic.

This means that there are likely coverage gaps in the sensor that attackers can abuse. For example, Listing 5-17 contains the decompilation of a popular endpoint security product's driver to show how it handles a number of registry operations.

```bash
switch(RegNotifyClass) {
case RegNtDeleteKey:
    pObject = *RegOperationInfo;
    local_a0 = pObject;
  ● CmSetCallbackObjectContext(pObject, &g_RegistryCookie), NewContext, 0);
default:
    goto LAb_18000a2c2;
case RegNtDeleteValueKey:
    pObject = *RegOperationInfo;
    local_a0 = pObject;
  ● NewContext = (undefined8 *)InternalGetNamefromRegistryObject(pObject);
    CmSetCallbackObjectContext(pObject, &g_RegistryCookie, NewContext, 0);
    goto LAb_18000a2c2;
case RegNtPreEnumerateKey:
    iVar9 = *(int *)(RegOperationInfo + 2);
    pObject = RegOperationInfo[1];
    iVar8 = 1;
    local_b0 = 1;
    local_b4 = iVar9;
    local_a0 = pObject;
    break;
  --snip--
```

Listing 5-17: Registry callback routine disassembly

The driver uses a switch case to handle notifications related to different types of registry operations. Specifically, it monitors key-deletion, value-deletion, and key-enumeration events. On a matching case, it extracts certain values based on the operation type and then processes them. In some cases, it also applies a context to the object ❶ to allow for advanced processing. In others, it calls an internal function ❷ using the extracted data.

There are a few notable gaps in coverage here. For instance, RegIt

PostSetValueKey, the operation of which the driver is notified whenever the RegSetValueEx) API is called, is handled in a case much later in the switch statement. This case would detect an attempt to set a value in a registry key, such as to create a new service. If the attacker needs to create a new

---

registry subkey and set values inside it, they'll need to find another method that the driver doesn't cover. Thankfully for them, the driver doesn't process the RegtPutToAdKey or RegtPostToAdKey operations, which would detect a registry hive being loaded from a file as a subkey. So, the operator may be able to leverage the RegtToAdKey API to create and populate their service registry key, effectively creating a service without being detected.

Revisiting the post-notification call RegItPostSetValueKey, we can see that the driver exhibits some interesting behavior common among most products, shown in Listing 5-18.

```bash
--snip--
case RegNtPostSetValueKey:
  ⚜ RegOperationStatus = RegOperationInfo->Status;
  ⚜ pObject = RegOperationInfo->Object;
    iVar7 = 1;
    local_b0 = 1;
    pBuffer = puVar5;
    p = puVar5;
    local_b4 = RegOperationStatus;
    local_a0 = pObject;
} if ((RegOperationStatus < 0 || (pObject == (PVOID)0x0)) { ⚜
LAB_18000a252:
    if (pBuffer != (undefined8 *)0x0) {
      ⚜ ExFramePoolWithTag(pBuffer, 0);
      NewContext = (undefined8 *)0x0;
    }
} else {
    if ((pBuffer != (undefined8 *)0x0 ||
      ⚜ (pBuffer = (undefined8 *)InternalGetNameFromRegistryObject((longlong)pObject),
        NewContext = pBuffer, pBuffer != (undefined8 *)0x0) {
        uBufferSize = &local_98;
        if (local_98 == 0) {
            uBufferSize = (ushort *)0x0;
        }
        local_80 = (undefined8 *)FUN_1800099e0(iVar7, (ushort *)pBuffer, uBufferSize));
        if (local_80 != (undefined8 *)0x0) {
            FUN_1800a3f0(local_80, (undefined8 *)0x0);
            local_b8 = 1;
        }
        goto LAB_18000a252;
    }
}
```

Listing 5-18: Registry-notification processing logic

This routine extracts the Status ❶ and Object ❷ members from the associated REG_POST_OPERATION_INFORMATION structure and stores them as local variables. Then it checks that these values aren't STATUS_SUCCESS or NULL, respectively ❸. If the values fail the check, the output buffer used for relaying messages to the user-mode client is freed ❹ and the context set for the

---

object is nulled. This behavior may seem strange at first, but it relates to the internal function renamed InternalGitNameFromRegistryObject() for clarity. ❸ Listing 5-19 contains the decompilation of this function.

```bash
void * InternalGetNameFromRegistryObject(longlong RegObject)
  {
  NTSTATUS status;
  NTSTATUS status2;
  POBJECT_NAME_INFORMATION pBuffer;
  PVOID null;
  PVOID pObjectName;
  ulong pulReturnLength;
  ulong ullength;
  null = (PVOID)0x0;
  pulReturnLength = 0;
 ● if (RegObject) != 0 {
      status = ObQueryNameString(RegObject, 0, 0, &pulReturnLength);
      ullength = pulReturnLength;
      pObjectName = null;
      if ((status = 0x3ffffff) &&
          pBuffer = (POBJECT_NAME_INFORMATION)ExAllocatePoolWithTag(
              PagedPool, (ulonglong)pReturnLength, 0x6f616D6C),
          pBuffer |= (POBJECT_NAME_INFORMATION)0x0) {
            memset(pBuffer, 0, (ulonglong)ullength);
     ● status2 = ObQueryNameString(RegObject, pBuffer, ullength, &pulReturnLength);
        pObjectName = pBuffer;
        if (status2 < 0) {
            ExFreePoolWithTag(pBuffer, 0);
            pObjectName = null;
        }
        }
      return pObjectName;
    }
  return (void *)0x0;
```

Listing 5-19: The InternalGetNameFromRegistryObject() disassembly

This internal function takes a pointer to a registry object, which is passed in as the local variable holding the Object member of the REG_POST \_OPERATION_INFORMATION structure, and extracts the name of the registry key being acted on using nt10bqueynameString() ❸. The problem with this flow is that if the operation was unsuccessful (as in the Status member of the postoperation information structure isn't STATUS_SUCCESS), the registry object pointer is invalidated and the call to the object-name-resolution function won't be able to extract the name of the registry key. This driver contains conditional logic to check for this condition ❹.

NOTE

This specific function isn't the only API affected by this problem. We often see similar logic implemented for other functions that extract key-name information from registry objects, such as ntflcmCallbackGetKeyObjectIDEx().

---

Operationally, this means that an unsuccessful attempt to interact with the registry won't generate an event, or at least one with all the relevant details, from which a detection can be created, all because the name of the registry key is missing. Without the name of the object, the event would effectively read “this user attempted to perform this registry action at this time and it was unsuccessful”, not very actionable for defenders.

But for attackers, this detail is important because it can change the risk calculus involved in performing certain activities. If an action targeting the registry were to fail (such as an attempt to read a key that doesn't exist or to create a new service with a mistyped registry path), it would likely go unnoticed. By checking for this logic when a driver is handling post-operation registry notifications, attackers can determine which unsuccessful actions would evade detection.

## Evading EDR Drivers with Callback Entry Overwrites

In this chapter as well as Chapters 3 and 4, we covered many kinds of callback notifications and discussed various evasions geared at bypassing them. Due to the complexity of EDR drivers and their different vendor implementations, it isn't possible to entirely evade detection using these means. Rather, by focusing on evading specific components of the driver, operators can reduce the likelihood of triggering an alert.

However, if an attacker either gains administrator access on the host, has the SeloadDriverPrivilege token privilege, or encounters a vulnerable driver that allows them to write to arbitrary memory, they may choose to target the EDR's driver directly.

This process most commonly involves finding the internal list of callback routines registered on the system, such as nt!PgsCallProcessNotifyRoutines in the context of process notifications or nt!PgsCallImageNotifyRoutines for imageload notifications. Researchers have publicly demonstrated this technique in many ways. Listing 5-20 shows the output of Benjamin Delpy's Minidiv.

```bash
mimikatz # version
Windows NT 10.0 build 19042 (arch x64)
msvc 150030729 207
mimikatz # !+
[*] 'mimidrv' service not present
[*] 'mimidrv' service successfully registered
[*] 'mimidrv' service ACL to everyone
[*] 'mimidrv' service started
mimikatz # !notifProcess
[00] 0xFFFFF8061481C7A0  [ntoskrnl.exe + 0x31c7a0]
[00] 0xFFFFF806160F6C70  [cng.sys + 0x6c70]
[00] 0xFFFFF80611CB450  [WFilter.sys + 0x44550]
[00] 0xFFFFF8061683B9A0  [ksecdd.sys + 0x1b9a0]
[00] 0xFFFFF80617C245E0  [tcip!sys + 0x45e0]
```

100 Chapter 5

---

```bash
[00] 0xFFFFF80182C0D930 [iorate.sys + 0xd930]
[00] 0xFFFFF80183A050 [api1d.sys + 0x1e050]
[00] 0xFFFFF8016979C30 [c1.dll + 0x79c30]
[00] 0xFFFFF80184B0140 [dkgknl.sys + 0xd140]
[00] 0xFFFFF8019048050 [vmjbmp.sys + 0x8050]
[00] 0xFFFFF8011843E0 [peauth.sys + 0x43c00]
```

Listing 5-20: Using Mimidrv to enumerate process-notification callback routines

Minidrv searches for a byte pattern that indicates the start of the array holding the registered callback routines. It uses Windows build-specific offsets from functions inside ntkrnl.exe. After locating the list of callback routines, Minidrv determines the driver from which the callback originates by correlating the address of the callback function to the address space in use by the driver. Once it has located the callback routine in the target driver, the attacker can choose to overwrite the first byte at the entry point of the function with a RETURN instruction (0x33). This would cause the function to immediately return when execution is passed to the callback, preventing the EDR from collecting any telemetry related to the notification event or taking any preventive action.

While this technique is operationally viable, deploying it comes with significant technical hurdles. First, unsigned drivers can't be loaded onto Windows 10 or later unless the host is put into test mode. Next, the technique relies on build-specific offsets, which introduces complexity and unreliability to the tooling, as newer versions of Windows could change these patterns. Lastly, Microsoft has heavily invested in making Hypervisor-Protected Code Integrity (HVI) a default protection on Windows 10 and has enabled it by default on secured-core systems. HVI reduces the ability to load malicious or known-vulnerable drivers by protecting the code-integrity decision-making logic, including c11g \_ c0019 , which is commonly temporarily overwritten to allow an unsigned driver to be loaded. This drives up the complexity of overwriting a callback's entry point, as only HVI-compatible drivers could be loaded on the system, reducing the potential attack surface.

## Conclusion

While not as straightforward as the previously discussed callback types, image-load and registry-notification callbacks provide just as much information to an EDR. Image-load notifications can tell us when images, whether they be DLLs, executables, or drivers, are being loaded, and they give the EDR a chance to log, act, or even signal to inject its function-hooking DLL. Registry notifications provide an unparalleled level of visibility into actions affecting the registry. To date, the strongest evasion strategies an adversary can employ when facing these sensors is either to abuse a gap in coverage or logical flaw in the sensor itself or to avoid it entirely, such as by proxying in their tooling.

---

---

## 6

## FILESYSTEM MINIFILTER DRIVERS

![Figure](figures/EvadingEDR_page_129_figure_002.png)

While the drivers covered in previous chapters can monitor many important events on the system, they aren't able to detect a particular critical kind of activity: filesystem opera-

tions. Using filesystem minifilter drivers, or minifilters for short, endpoint security products can learn about the files being created, modified, written to, and deleted.

These drivers are useful because they can observe an attacker's interactions with the filesystem, such as the dropping of malware to disk. Often, they work in conjunction with other components of the system. By integrating with the agent's scanning engine, for example, they can enable the EDR to scan files.

Minifilters might, of course, monitor the native Windows filesystem, which is called the New Technology File System (NTFS) and is implemented in nfs.sys. However, they might also monitor other important filesystemes, including named pipes, a bidirectional inter-process communication mechanism implemented in ntf.sys, and maillists, a unidirectional

---

inter-process communication mechanism implemented in msfs.sys . Adversary tools, particularly command-and-control agents, tend to make heavy use of these mechanisms, so tracking their activities provides crucial telemetry. For example, Cobalt Strike's Beacon uses named pipes for tasking and the linking of peer-to-peer agents.

Minifiers are similar in design to the drivers discussed in the previous chapters, but this chapter covers some unique details about their implementations, capabilities, and operations on Windows. We'll also discuss evasion techniques that attackers can leverage to interfere with them.

## Legacy Filters and the Filter Manager

Before Microsoft introduced minifiers, EDR developers would write legacy filter drivers to monitor filesystem operations. These drivers would sit on the filesystem stack, directly inline of user-mode calls destined for the filesystem, as shown in Figure 6-1 .

![Figure](figures/EvadingEDR_page_130_figure_004.png)

Figure 6-1: The legacy filter driver architecture

These drivers were notoriously difficult to develop and support in production environments. A 2019 article published in The NT Insider, titled "Understanding Minifilters: Why and How File System Filter Drivers Evolved," highlights seven large problems that developers face when writing legacy filter drivers:

### Confusing Filter Layering

In cases when there is more than one legacy filter installed on the system, the architecture defines no order for how these drivers should be placed on the filesystem stack. This prevents the driver developer from knowing when the system will load their driver in relation to the others.

### A Lack of Dynamic Loading and Unloading

Legacy filter drivers can't be inserted into a specific location on the device stack and can only be loaded at the top of the stack. Additionally, legacy filters can't be unloaded easily and typically require a full system reboot to unload.

### Tricky Filesystem-Stack Attachment and Detachment

The mechanics of how the filesystem stack attaches and detaches devices are extremely complicated, and developers must have a

104 Chapter 6

---

substantial amount of arcane knowledge to ensure that their driver can appropriately handle odd edge cases.

## Indiscriminate IRP Processing

Legacy filter drivers are responsible for processing all Interrupt Request Packets (IRPs) sent to the device stack, regardless of whether they are interested in the IRPs or not.

## Challenges with Fast I/O Data Operations

Windows supports a mechanism for working with cached files, called Fast I/O, that provides an alternative to its standard packet-based I/O model. It relies on a dispatch table implemented in the legacy drivers. Each driver processes Fast I/O requests and passes them down the stack to the next driver. If a single driver in the stack lacks a dispatch table, it disables Fast I/O processing for the entire device stack.

## An Inability to Monitor Non-data Fast I/O Operations

In Windows, filesystems are deeply integrated into other system components, such as the memory manager. For instance, when a user requests that a file be mapped into memory, the memory manager calls the Fast I/O callback AquireFileForOrCreateSection. These non-data requests always bypass the device stack, making it hard for a legacy filter driver to collect information about them. It wasn't until Windows XP, which introduced nt!&sft!RegisterFileSystemFilterCallbacks(), that developers could request this information.

## Issues with Handling Recursion

Filesystems make heavy use of recursion, so filters in the filesystem stack must support it as well. However, due to the way that Windows manages I/O operations, this is easier said than done. Because each request passes through the entire device stack, a driver could easily deadlock or exhaust its resources if it handles recursion poorly.

To address some of these limitations, Microsoft introduced the filter manager model. The filter manager (/filter.sys) is a driver that ships with Windows and exposes functionality commonly used by filter drivers when intercepting filesystem operations. To leverage this functionality, developers can write minifilters. The filter manager then intercepts requests destined for the filesystem and passes them to the minifilters loaded on the system, which exist in their own sorted stack, as shown in Figure 6 - 2 .

Minifilers are substantially easier to develop than their legacy counterparts, and EDRs can manage them more easily by dynamically loading and unloading them on a running system. The ability to access functionality exposed by the filter manager makes for less complex drivers, allowing for easier maintenance. Microsoft has made tremendous efforts to

---

move developers away from the legacy filter model and over to the minifilter model. It has even included an optional registry value that allows administrators to block legacy filter drivers from being loaded on the system altogether.

![Figure](figures/EvadingEDR_page_132_figure_001.png)

Figure 6-2. The filter manager and minifilter architecture

## Minifilter Architecture

Minifilters have a unique architecture in several respects. First is the role of the filter manager itself. In a legacy architecture, filesystem drivers would filter I/O requests directly, while in a minifilter architecture, the filter manager handles this task before passing information about the requests to the minifilters loaded on the system. This means that minifilters are only indirectly attached to the filesystem stack. Also, they register with the filter manager for the specific operations they're interested in, removing the need for them to handle all I/O requests.

Next is how they interact with registered callback routines. As with the drivers discussed in the previous chapters, minifiers may register both preand post-operation callbacks. When a supported operation occurs, the filter manager first calls the correlated pre-operation callback function in each of the loaded minifiers. Once a minifier completes its pre-operation routine, it passes control back to the filter manager, which calls the next callback function in the subsequent driver. When all drivers have completed their pre-operation callbacks, the request travels to the filesystem driver, which processes the operation. After receiving the I/O request for completion, the filter manager invokes the post-operation callback functions in the minifilters in reverse order. Once the post-operation callbacks complete, control is transferred back to the I/O manager, which eventually passes control back to the caller application.

Each minifilter has an altitude , which is a number that identifies its location in the minifilter stack and determines when the system will load that minifilter. Altitudes address the issue of ordering that plagued legacy filter drivers. Ideally, Microsoft assigns altitudes to the minifiers of production applications, and these values are specified in the drivers' registry keys, under Altitude . Microsoft sorts altitudes into load-order groups, which are shown in Table 6 - 1 .

106 Chapter 6

---

Table 6-1: Microsoft’s Minifilter Load-Order Groups

<table><tr><td>Altitude range</td><td>Load-order group name</td><td>Minifilter role</td></tr><tr><td>420000-429999</td><td>Filter</td><td>Legacy filter drivers</td></tr><tr><td>400000-409999</td><td>FSFilter Top</td><td>Filters that must attach above all others</td></tr><tr><td>360000-389999</td><td>FSFilter Activity Monitor</td><td>Drivers that observe and report on file I/O</td></tr><tr><td>340000-349999</td><td>FSFilter Undelete</td><td>Drivers that recover deleted files</td></tr><tr><td>320000-329998</td><td>FSFilter Anti-Virus</td><td>Antimalware drivers</td></tr><tr><td>300000-309998</td><td>FSFilter Replication</td><td>Drivers that copy data to a remote system</td></tr><tr><td>280000-289998</td><td>FSFilter Continuous Backup</td><td>Drivers that copy data to backup media</td></tr><tr><td>260000-269998</td><td>FSFilter Content Screener</td><td>Drivers that prevent the creation of specific files or content</td></tr><tr><td>240000-249999</td><td>FSFilter Quota Management</td><td>Drivers that provide enhanced filesystem quotas that limit the space allowed for a volume or folder</td></tr><tr><td>220000-229999</td><td>FSFilter System Recovery</td><td>Drivers that maintain operating system integrity</td></tr><tr><td>200000-209999</td><td>FSFilter Cluster File System</td><td>Drivers used by applications that provide file server metadata across a network</td></tr><tr><td>180000-189999</td><td>FSFilter HSM</td><td>Hierarchical storage management drivers</td></tr><tr><td>170000-174999</td><td>FSFilter Imaging</td><td>ZIP-like drivers that provide a virtual namespace</td></tr><tr><td>160000-169999</td><td>FSFilter Compression</td><td>File-data compression drivers</td></tr><tr><td>140000-149999</td><td>FSFilter Encryption</td><td>File-data encryption and decryption drivers</td></tr><tr><td>130000-139999</td><td>FSFilter Virtualization</td><td>Filepath virtualization drivers</td></tr><tr><td>120000-129999</td><td>FSFilter Physical Quota Management</td><td>Drivers that manage quotes by using physical block counts</td></tr><tr><td>100000-109999</td><td>FSFilter Open File</td><td>Drivers that provide snapshots of already-opened files</td></tr><tr><td>80000-89999</td><td>FSFilter Security Enhancer</td><td>Drivers that apply file-based lockdowns and enhanced access control</td></tr><tr><td>60000-69999</td><td>FSFilter Copy Protection</td><td>Drivers that check for out-of-band data on storage media</td></tr><tr><td>40000-49999</td><td>FSFilter Bottom</td><td>Filters that must attach below all others</td></tr><tr><td>20000-29999</td><td>FSFilter System</td><td>Reserved</td></tr><tr><td>&lt;20000</td><td>FSFilter Infrastructure</td><td>Reserved for system use but attaches closest to the filesystem</td></tr></table>

Most EDR vendors register their minifiers in the FSFilter Anti-Virus or FSFilter Activity Monitor group. Microsoft publishes a list of registered altitudes, as well as their associated filenames and publishers. Table 6-2

Filesystem Minifiller Drivers 107

---

lists altitudes assigned to minifilters belonging to popular commercial EDR solutions.

Table 6-2: Altitudes of Popular EDRs

<table><tr><td>Altitude</td><td>Vendor</td><td>EDR</td></tr><tr><td>389220</td><td>Sophos</td><td>sophosed.sys</td></tr><tr><td>389040</td><td>SentinelOne</td><td>sentinelmonitor.sys</td></tr><tr><td>328010</td><td>Microsoft</td><td>wfilter.sys</td></tr><tr><td>321410</td><td>CrowdStrike</td><td>csagent.sys</td></tr><tr><td>388360</td><td>FireEye/Trellix</td><td>fekem.sys</td></tr><tr><td>386720</td><td>Bi9/Carbon Black/VMWare</td><td>carbonblackk.sys</td></tr></table>

While an administrator can change a minifilter's altitude, the system can load only one minifilter at a single altitude at one time.

## Writing a Minifilter

Let's walk through the process of writing a minifilter. Each minifilter begins with a @driverEntry() function, defined in the same way as other drivers. This function performs any required global initializations and then registers the minifilter. Finally, it starts filtering I/O operations and returns an appropriate value.

### Beginning the Registration

The first, and most important, of these actions is registration, which the driverEntry() function performs by calling flmgr\flRegisterFilter(). This function adds the minifiler to the list of registered minifiler drivers on the host and provides the filter manager with information about the minifiler, including a list of callback routines. This function is defined in Listing 6-1.

```bash
NTSTATUS FlTAPI FltRegisterFilter(
  [in) PORIVER_OBJECT  Driver,
  [in) const FLT_REGISTRATION *Registration,
  [out] PFLT_FILTER  *RetFilter
);
```

Listing 6-1: The fltmgr!FltRegisterFilter() function definition

Of the three parameters passed to it, the Registration parameter is the most interesting. This is a pointer to an FILT_REGISTRATION structure, defined in Listing 6-2, which houses all the relevant information about the minifilter.

```bash
typedef struct _FLT_REGISTRATION {
USHORT        Size;
USHORT        Version;
```

---

```bash
FLT_REGISTRATION_FLAGS    Flags;
  const FLT_CONTEXT_REGISTRATION   *ContextRegistration;
  const FLT_OPERATION_REGISTRATION  *OperationRegistration;
  PFLT_FILTER_UNLOAD_CALLBACK        FilterUnloadCallback;
  PFLT_INSTANCE_SETUP_CALLBACK       InstanceSetupCallback;
  PFLT_INSTANCE_QUERY_TEARDOWN_CALLBACK  InstanceQueryTeardownCallback;
  PFLT_INSTANCE_TEARDOWN_CALLBACK      InstanceTeardownStartCallback;
  PFLT_INSTANCE_TEARDOWN_CALLBACK      InstanceTeardownCompleteCallback;
  PFLT_GENERATE_FILE_NAME            GenerateFileNameCallback;
  PFLT_NORMALIZE_NAME_COMPONENT         NormalizeNameComponentCallback;
  PFLT_NORMALIZE_CONTEXT_CLEANUP          NormalizeContextCleanupCallback;
  PFLT_TRANSACTION_NOTIFICATION_CALLBACK  TransactionNotificationCallback;
  PFLT_NORMALIZE_NAME_COMPONENT_EX     NormalizeNameComponentExCallback;
  PFLT_SECTION_COMPLACT_NOTIFICATION_CALLBACK  SectionNotificationCallback;
  }FLT_REGISTRATION,*PFLT_REGISTRATION;
```

Listing 6-2: The FLT_REGISTRATION structure definition.

The first two members of this structure set the structure size, which is always sizeof(FLT_REGISTRATION), and the structure revision level, which is always FLT_REGISTRATION_VERSION. The next member is flags, which is a bitmask that may be zero or a combination of any of the following three values:

FLTFL_REGISTRATION_DO_NOT_SUPPORT_SERVICE_STOP (1)

The minifilter won't be unloaded in the event of a service stop request.

FLTFL_REGISTRATION_SUPPORT_NPF5_MSFS (2)

The minifilter supports named pipe and mailslot requests.

FLTFL_REGISTRATION_SUPPORT_DAX_VOLUME (4)

The minifilter supports attaching to a Direct Access (DAX) volume.

Following this member is the context registration. This will be either an array of FLT_CONTEXT_REGISTRATION structures or null. These contexts allow a minifilter to associate related objects and preserve state across I/O operations. After this array of context comes the critically important operation registration array. This is a variable length array of FLT_OPERATION \_REGISTRATION structures, which are defined in Listing 6-3. While this array can technically be null, it's rare to see that configuration in an EDR sensor. The minifilter must provide a structure for each type of I/O for which it registers a pre-operation or post-operation callback routine.

```bash
typedef struct _FLT_OPERATION_REGISTRATION {
 UCHAR       MajorFunction;
 FLT_OPERATION_REGISTRATION_FLAGS Flags;
 PFLT_PRE_OPERATION_CALLBACK  PreOperation;
 PFLT_POST_OPERATION_CALLBACK  PostOperation;
 PVOID        Reserved;
} FLT_OPERATION_REGISTRATION, *PFLT_OPERATION_REGISTRATION;
```

Listing 6-3: The FLT_OPERATION_REGISTRATION structure definition

Filesystem Monitor Drivers 109

---

The first parameter indicates which major function the minifilter is interested in processing. These are constants defined in wdm.h, and Table 6-3 lists some of those most relevant to security monitoring.

Table 6-3: Major Functions and Their Purposes

<table><tr><td>Major function</td><td>Purpose</td></tr><tr><td>IRP_MJ_CREATE (0x00)</td><td>A new file is being created or a handle to an existing one is being opened.</td></tr><tr><td>IRP_MJ_CREATE_NAMED_PIPE (0x01)</td><td>A named pipe is being created or opened.</td></tr><tr><td>IRP_MJ_CLOSE (0x02)</td><td>A handle to a file object is being closed.</td></tr><tr><td>IRP_MJ_READ (0x03)</td><td>Data is being read from a file.</td></tr><tr><td>IRP_MJ_WRITE (0x04)</td><td>Data is being written to a file.</td></tr><tr><td>IRP_MJ_QUERY_INFORMATION (0x05)</td><td>Information about a file, such as its creation time, has been requested.</td></tr><tr><td>IRP_MJ_SET_INFORMATION (0x06)</td><td>Information about a file, such as its name, is being set or updated.</td></tr><tr><td>IRP_MJ_QUERY_EA (0x07)</td><td>A file&#x27;s extended information has been requested.</td></tr><tr><td>IRP_MJ_SET_EA (0x08)</td><td>A file&#x27;s extended information is being set or updated.</td></tr><tr><td>IRP_MJ_LOCK_CONTROL (0x11)</td><td>A lock is being placed on a file, such as via a call to kernel321lockfileEx().</td></tr><tr><td>IRP_MJ_CREATE_MAILSLOT (0x13)</td><td>A new mailslot is being created or opened.</td></tr><tr><td>IRP_MJ_QUERY_SECURITY (0x14)</td><td>Security information about a file is being requested.</td></tr><tr><td>IRP_MJ_SET_SECURITY (0x15)</td><td>Security information related to a file is being set or updated.</td></tr><tr><td>IRP_MJ_SYSTEM_CONTROL (0x17)</td><td>A new driver has been registered as a supplier of Windows Management Instrumentation.</td></tr></table>

The next member of the structure specifies the flags. This bitmask describes when the callback functions should be invoked for cached I/O or paging I/O operations. At the time of this writing, there are four supported flags, all of which are prefixed with FLUTI*OPERATION_REGISTRATION* First, SKIP_PAGING_I0 indicates whether a callback should be invoked for IRP-based read or write paging I/O operations. The SKIP_CACHED_I0 flag is used to prevent the invocation of callbacks on fast I/O-based read or write cached I/O operations. Next, SKIP_NON_CACHED_I0 is used for requests issued on a Direct Access Storage Device (DASD) volume handle. Finally, SKIP_NON_CACHED_NON_PAGING_I0 prevents callback invocation on read or write I/O operations that are not cached or paging operations.

## Defining Pre-operation Callbacks

The next two members of the FLT_OPERATION_REGISTRATION structure define the pre-operation or post-operation callbacks to be invoked when each of the target major functions occurs on the system. Pre-operation callbacks

---

are passed via a pointer to an FLT_PRE_OPERATION_CALLBACK structure, and post-operation routines are specified as a pointer to an FLT_POST_OPERATION \_CALLBACK structure. While these functions' definitions aren't too dissimilar, their capabilities and limitations vary substantially.

As with callbacks in other types of drivers, pre-operation callback functions allow the developer to inspect an operation on its way to its destination (the target filesystem, in the case of a minifilter). These callback functions receive a pointer to the callback data for the operation and some opaque pointers for the objects related to the current I/O request, and they return an FLT_PREOP_CALLBACK_STATUS return code. In code, this would look like what is shown in Listing 6-4.

```bash
PFlT_PRE_OPERATION_CALLBACK PfltPreOperationCallback;
FlT_PREOP_CALLBACK_STATUS PfltPreOperationCallback{
  [in, out] PFlT_CALLBACK_Data Data,
  [in] PCFLT_RELATED_OBJECTS FltObjects,
  [out] PVOID *CompletionContext
{...}
```

Listing 6-4: Registering a pre-operation callback

The first parameter, Data, is the most complex of the three and contains all the major information related to the request that the minifilter is processing. The FLIT_CALLBACK_DATA structure is used by both the filter manager and the minifilter to process I/O operations and contains a ton of useful data for any EDR agent monitoring filesystem operations. Some of the important members of this structure include:

Flags A bitmask that describes the I/O operation. These flags may come preset from the filter manager, though the minifilter may set additional flags in some circumstances. When the filter manager initializes the data structure, it sets a flag to indicate what type of I/O operation it represents; either fast I/O, filter, or IRP operations. The filter manager may also set flags indicating whether a minifilter generated or resissued the operation, whether it came from the non-paged pool, and whether the operation completed.

Thread A pointer to the thread that initiated the I/O request. This is useful for identifying the application performing the operation.

Iopb The I/O parameter block that contains information about IRPbased operations (for example, IRP_BUFFERED_I0, which indicates that it is a buffered I/O operation); the major function code; special flags related to the operation (for example, SL_CASE-sensitive, which informs drivers in the stack that filename comparisons should be case sensitive); a pointer to the file object that is the target of the operation; and an INT PARAMETERS structure containing the parameters unique to the specific I/O operation specified by the major or minor function code member of the structure.

---

IosStatus A structure that contains the completion status of the I/O operation set by the filter manager.

TagData A pointer to an FLT_TAG_DATA_BUFFER structure containing information about reparse points, such as in the case of NTFS hard links or junctions.

RequestorMode A value indicating whether the request came from user mode or kernel mode.

This structure contains much of the information that an EDR agent needs to track file operations on the system. The second parameter passed to the pre-operation callback, a pointer to an FLT_RELATED_OBJECTS structure, provides supplemental information. This structure contains opaque pointers to the object associated with the operation, including the volume, minifilter instance, and file object (if present). The last parameter, CompletionContext, contains an optional context pointer that will be passed to the correlated post-operation callback if the minifilter returns FLT_PREOP \_SUCCESS_WITH_CALLBACK OR FLT_PREOP_SYNCHRONIZE .

On completion of the routine, the minifilter must return an FLT_PREOP \_\_CALLBACK_STATUS value. Pre-operation callbacks may return one of seven supported values:

FLT_PREOP_SUCCESS_WITH_CALLBACK (0)

Return the I/O operation to the filter manager for processing and instruct it to call the minifilter's post-operation callback during completion.

FLT_PREOP_SUCCESS_NO_CALLBACK (1)

Return the I/O operation to the filter manager for processing and instruct it not to call the minifilter's post-operation callback during completion.

FLT_PREOP_PENDING (2)

Pend the I/O operation and do not process it further until the minfilter calls f1tmpgrfIfCompletePendedPreoperation().

FLT_PREOP_DISALLOW_FASTIO (3)

Block the fast I/O path in the operation. This code instructs the filter manager not to pass the operation to any other minifilters below the current one in the stack and to only call the post-operation callbacks of those drivers at higher altitudes.

FLT_PREOP_COMPLETE (4)

Instruct the filter manager not to send the request to minifilters below the current driver in the stack and to only call the post-operation callbacks of those minifilters above it in the driver stack.

---

FLT_PREOP_SYNCHRONIZE (S)

Pass the request back to the filter manager but don't complete it. This code ensures that the minifilter's post-operation callback is called at IRQL ≤ APC_LEVEL in the context of the original thread.

FLT_PREOP_DISALLOW_FSFILTER_IO (6)

Disallow a fast QueryOpsen operation and force the operation down the slower path, causing the I/O manager to process the request using an open, query, or close operation on the file.

The filter manager invokes the pre-operation callbacks for all minifiers that have registered functions for the I/O operation being processed before passing their requests to the filesystem, beginning with the highest altitude.

## Defining Post-operation Callbacks

After the filesystem performs the operations defined in every minifilter's pre-operation callbacks, control is passed up the filter stack to the filter manager. The filter manager then invokes the post-operation callbacks of all minifilters for the request type, beginning with the lowest altitude. These post-operation callbacks have a similar definition to the pre-operation routines, as shown in Listing 6-5.

```bash
PFLT_POST_OPERATION_CALLBACK PfltPostOperationCallback;
FLT_POSTOP_CALLBACK_STATUS PfltPostOperationCallback(
    [in, out]   PFLT_CALLBACK_DATA Data,
    [in]   PCFLT_RELATED_OBJECTS FltObjects,
    [in, optional] PVOID CompletionContext,
    [in]   FLT_POST_OPERATION_FLAGS Flags
)
    {...}
```

Listing 6-5: Post-operation callback routine definitions

Two notable differences here are the addition of the Flags parameter and the different return type. The only documented flag that a minifilter can pass is FLTVLT_POST_OPERATION_DRAINING , which indicates that the minifilter is in the process of unloading. Additionally, post-operation callbacks can return different statuses. If the callback returns FLT_POSTOP_FINISHED_PROCESSING (0) , the minifilter has completed its post-operation callback routine and is passing control back to the filter manager to continue processing the I/O request. If it returns FLT_POSTOP_MORE_PROCESSING_REQUIRED (1) , the minifilter has posted the IRP-based I/O operation to a work queue and halted completion of the request until the work item completes, and it calls ifmgr.IfItComplete PendedPostOperation() . Lastly, if it returns FLT_POSTOP_DISALLOW_POSTFILTER_IO (2) , the minifilter is disallowing a fast Query open operation and forcing the operation down the slower path. This is the same as FLT_POSTOP_DISALLOW_POSTFILTER_IO .

Post-operation callbacks have some notable limitations that reduce their viability for security monitoring. The first is that they're invoked in

Filesystem Minifilter Drivers 113

---

an arbitrary thread unless the pre-operation callback passes the FLTPROP Synchronize flag, preventing the system from attributing the operation to the requesting application. Next is that post-operation callbacks are invoked at IRQL $\leq $ DISPATCH_LEVEL . This means that certain operations are restricted, including accessing most synchronization primitives (for example, mutexes), calling kernel APIs that require an IRQL $\leq $ DISPATCH_LEVEL , and accessing paged memory. One workaround to these limitations involves delaying the execution of the post-operation callback via the use of fltsgi!Flt DoCompletionProcessingWhenSafe(), but this solution has its own challenges.

The array of these FLT_OPERATION_REGISTRATION structures passed in the OperationRegistration member of FLT_REGISTRATION may look like Listing 6-6.

```bash
const FLT_OPERATION_REGISTRATION Callbacks[] = {
{IRP_MJ_CREATE, 0, MyPreCreate, MyPostCreate},
{IRP_MJ_READ, 0, MyPreRead, NULL},
{IRP_MJ_WRITE, 0, MyPreWrite, NULL},
{IRP_MJ_OPERATION_END}
};
```

Listing 6-6: An array of operation registration callback structures

This array registers pre- and post-operation callbacks for IRP_MJ_CREATE and only pre-operation callbacks for IRP_MJ_READ and IRP_MJ_WRITE. No flags are passed in for any of the target operations. Also note that the final element in the array is IRP_MJ_OPERATION_END. Microsoft requires this value to be present at the end of the array, and it serves no functional purpose in the context of monitoring.

## Defining Optional Callbacks

The last section in the FIL_REGISTRATION structure contains the optional callbacks. The first three callbacks, FilterLoadCallback, InstanceSetupCallback, and InstanceQueryToDownCallback, may all technically be null, but this will impose some restrictions on the minifilter and system behavior. For example, the system won't be able to load the minifilter or attach to new filesystem volumes. The rest of the callbacks in this section of the structure relate to various functionality provided by the minifilter. These include things such as the interception of filename requests (GenerateFileNameCallback) and filename normalization (NormalizeNameComponentCallback). In general, only the first three semi-optional callbacks are registered, and the rest are rarely used.

## Activating the Minifilter

After all callback routines have been set, a pointer to the created FLT_REGISTRATION structure is passed as the second parameter to fltmgr! FltRegister(filter(). Upon completion of this function, an opaque filter pointer (PFLT_FILTER) is returned to the caller in the &rtfilter parameter. This pointer uniquely identifies the minifilter and remains static as long as the driver is loaded on the system. This pointer is typically preserved as a global variable.

114 Chapter 6

---

When the minifilter is ready to start processing events, it passes the PFLT_FILTER pointer to fltmgrflltStartFilter(). This notifies the filter manager that the driver is ready to attach to filesystem volumes and start filtering I/O requests. After this function returns, the minifilter will be considered active and sit inline of all relevant filesystem operations. The callbacks registered in the FLT_REGISTRATION structure will be invoked for their associated major functions. Whenever the minifilter is ready to unload itself, it passes the PFLT_FILTER pointer to fltmgrflltUnregisterFilter() to remove any contexts that the minifilter has set on files, volumes, and other components and calls the registered InstanceTeardownStartCallback and

InstanceTeardownCompleteCallback functions.

## Managing a Minifilter

Compared to working with other drivers, the process of installing, loading, and unloading a minifilter requires special consideration. This is because minifilters have specific requirements related to the setting of registry values. To make the installation process easier, Microsoft recommends installing minifilters through a setup information (INF) file. The format of these INF files is beyond the scope of this book, but there are some interesting details relevant to how minifilters work that are worth mentioning.

The ClassUuid entry in the Version section of the INF file is a GUID that corresponds to the desired load-order group (for example, FSFilter Activity Monitor ). In the AddRegistry section of the file, which specifies the registry keys to be created, you'll find information about the minifilter's altitude. This section may include multiple similar entries to describe where the system should load various instances of the minifilter. The altitude can be set to the name of a variable (for example, XMRAltitude%) defined in the Strings section of the INF file. Lastly, the ServiceType entry under the ServiceInstall section is always set to SERVICE_FILE_SYSTEM_DRIVER (2).

Executing the INF installs the driver, copying files to their specified locations and setting up the required registry keys. Listing 6-7 shows an example of what this looks like in the registry keys for WdFilter, Microsoft Defender's minifilter driver.

```bash
PS > Get-ItemProperty -Path "HKL\SYSTEM\CurrentControlSet\Services\WdFilter\" | Select *
-Exclude P5 | fl
DependOnService : {FltMgr}
Description   : @%ProgramFiles%\Windows Defender\MpAsDesc.dll,-340
DisplayName   : @%ProgramFiles%\Windows Defender\MpAsDesc.dll,-330
ErrorControl  : 1
Group     : FSFilter Anti-Virus
ImagePath  : system32\drivers\wd\WdFilter.sys
Start    : 0
SupportedFeatures : 7
Type    : 2
                          Filesystem MiniFilter Drivers   115
```

---

```bash
PS > Get-ItemProperty -Path "HKL\:\SYSTEM\CurrentControlSet\Services\WdFilter\Instances\
WdFilter Instance" | Select * -Exclude PS* | fl
Altitude : 328010
Flags : 0
```

Listing 6-7: Viewing WdFilter's altitude with PowerShell

The Start key dictates when the minifilter will be loaded. The service can be started and stopped using the Service Control Manager APIs, as well as through a client such as service or the Services snap-in. In addition, we can manage minifilters with the filter manager library, FitLib , which is leveraged by the fitmc.exe utility included by default on Windows. This setup also includes setting the altitude of the minifilter, which for WdFiller is 328010.

## Detecting Adversary Tradecraft with Minifilters

Now that you understand the inner workings of minifilters, let's explore how they contribute to the detection of attacks on a system. As discussed in “Writing a Minifilter” on page 108, a minifilter can register pre- or postoperation callbacks for activities that target any filesystem, including NTFS, named pipes, and mailslots. This provides an EDR with an extremely powerful sensor for detecting adversary activity on the host.

### File Detections

If an adversary interacts with the filesystem, such as by creating new files or modifying the contents of existing files, the minifilter has an opportunity to detect the behavior. Modern attacks have tended to avoid dropping artifacts directly onto the host filesystem in this way, embracing the “disk is lava” mentality, but many hacking tools continue to interact with files due to limitations of the APIs being leveraged. For example, consider dbghelpMBmdDumpIateOump(), a function used to create process memory dumps. This API requires that the caller pass in a handle to a file for the dump to be written to. The attacker must work with files if they want to use this API, so any minifilter that processes IRP_MJ_CREATE or IRP_MJ_WRITE I/O operations can indirectly detect those memory-dumping operations.

Additionally, the attacker has no control over the format of the data being written to the file, allowing a minifilter to coordinate with a scanner to detect a memory-dump file without using function hooking. An attacker might try to work around this by opening a handle to an existing file and overwriting its content with the dump of the target process's memory, but a minifilter monitoring IRP_M2_CREATE could still detect this activity, as both the creation of a new file and the opening of a handle to an existing file would trigger it.

Some defenders use these concepts to implement filesystem canaries. These are files created in key locations that users should seldom, if ever, interact with. If an application other than a backup agent or the EDR

116 Chapter 6

---

requests a handle to a canary file, the minifilter can take immediate action, including crashing the system. Filesystem canaries provide strong (though at times brutal) anti-ransomware control, as ransomware tends to indiscriminately encrypt files on the host. By placing a canary file in a directory nested deep in the filesystem, hidden from the user but still in one of the paths typically targeted by ransomware, an EDR can limit the damage to the files that the ransomware encountered before reaching the canary.

## Named Pipe Detections

Another key piece of adversary tradecraft that minifiers can detect highly effectively is the use of named pipes. Many command-and-control agents, like Cobalt Strike's Beacon, make use of named pipes for tasking, I/O, and linking. Other offensive techniques, such as those that use token impersonation for privilege escalation, revolve around the creation of a named pipe. In both cases, a minifilter monitoring TRP_MJ_CREATE_NAMEDPIPE requests would be able to detect the attacker's behavior, in much the same way as those that detect file creation via TRP_MJ_CREATE .

Minifilters commonly look for the creation of anomalously named pipes, or those originating from atypical processes. This is useful because many tools used by adversaries rely on the use of named pipes, so an attacker who wants to blend in should pick pipe and host process names that are typical in the environment. Thankfully for attackers and defenders alike, Windows makes enumerating existing named pipes easy, and we can straightforwardly identify many of the common process-to-pipe relationships. One of the most well-known named pipes in the realm of security is mojo . When a Chromium process spawns, it creates several named pipes with the format mojo.PID.TID .VALUE for use by an IPC abstraction library called Mojo. This named pipe became popular after its inclusion in a well-known repository for documenting Cobalt Strike's Malleable profile options.

There are a few problems with using this specific named pipe that a minifilter can detect. The main one is related to the structured formatting used for the name of the pipe. Because Cobalt Stride's pipe name is a static attribute tied to the instance of the Malleable profile, it is immutable at runtime. This means that an adversary would need to accurately predict the process and thread IDs of their Beacon to ensure the attributes of their process match those of the pipe name format used by Mojo. Remember that minifilters with pre-operation callbacks for monitoring RPC \_ NO_CREATE_NAMED PIPE requests are guaranteed to be invoked in the context of the calling thread. This means that when a Beacon process creates the "mogo" named pipe, the minifilter can check that its current context matches the information in the pipe name. Pseudocode to demonstrate this would look like that shown in Listing 6-8.

```bash
DetectMojoMismatch(string mojoPipeName)
{
  pid = GetCurrentProcessId();
  tid = GetCurrentThreadId();
                             ElementsModeler.Danger    17
```

---

```bash
○ if (!mojoPipeName.contains("mojo." + pid + "." + tid + "."))
    {
      // Bad Mojo pipe found
    }
  }
```

Listing 6-8: Detecting anomalous Mojo named pipes

Since the format used in Mojo named pipes is known, we can simply concatenate the PID and TID ❶ of the thread creating the named pipe and ensure that it matches what is expected. If not, we can take some defensive action.

Not every command inside Beacon will create a named pipe. There are certain functions that will create an anonymous pipe (as in, a pipe without a name), such as execute-assembly . These types of pipes have limited operational viability, as their name can't be referenced and code can interact with them through an open handle only. What they lose in functionality, however, they gain in evasiveness.

Riccardo Ancanari's blog post "Detecting Cobalt Strike Default Modules via Named Pipe Analysis" details the OPSEC considerations related to Beacon's usage of anonymous pipes. In his research, he found that while Windows components rarely used anonymous pipes, their creation could be profiled, and their creators could be used as viable spa WTO binaries. These included ngen.exe , wsmprohost.exe , and firefox.exe , among others. By setting their sacrificial processes to one of these executables, attackers could ensure that any actions resulting in the creation of anonymous pipes would likely remain undetected.

Bear in mind, however, that activities making use of named pipes would still be vulnerable to detection, so operators would need to restrict their tradecraft to activities that create anonymous pipes only.

## Evading Minifilters

Most strategies for evading an EDR's minifiers rely on one of three techniques: unloading, prevention, or interference. Let's walk through examples of each to demonstrate how we can use them to our advantage.

### Unloading

The first technique is to completely unload the minifilter. While you'll need administrator access to do this (specifically, the SetIoDriverPrivilege token privilege), it's the most surefire way to evade the minifilter. After all, if the driver is no longer on the stack, it can't capture events.

Unloading the minifilter can be as simple as calling !fltm.exe unload , but if the vendor has put a lot of effort into hiding the presence of their minifilter, it might require complex custom tooling. To explore this idea further, let's target Symson, whose minifilter, SymsonDru , is configured in the registry, as shown in Listing 6-9.

118 Chapter 6

---

```bash
PS > Get-ItemProperty -Path "HKLm:\SYSTEM\CurrentControlSet\Services\SysmonDrv" | Select *
-Exclude PS* | fl
Type   : 1
Start   : 0
ErrorControl : 1
ImagePath : SysmonDrv.sys
DisplayName : SysmonDrv
Description : System Monitor driver
PS > Get-ItemProperty -Path "HKLm:\SYSTEM\CurrentControlSet\Services\SysmonDrv\Instances\
Sysmon Instance\" | Select * -Exclude PS* | fl
Altitude : 385201
Flags  : 0
Listing 6-9: Using PowerShell to view SysmonDrv's configuration
```

By default, SymsonDrv has the latitude 385201, and we can easily unload it via a call to !fltmc.exe !unload SymsonDrv, assuming the caller has the required privilege. Doing so would create a FilterManager event ID of 1, which indicates that a filesystem filter was unloaded, and a Symson event ID of 255, which indicates a driver communication failure. However, Symson will no longer receive events.

To complicate this process for attackers, the minifilter sometimes uses a random service name to conceal its presence on the system. In the case of Sysmon, an administrator can implement this approach during installation by passing the -d flag to the installer and specifying a new name. This prevents an attacker from using the built-in fltmc.exe utility unless they can also identify the service name.

However, an attacker can abuse another feature of production minifilters to locate the driver and unload it: their altitudes. Because Microsoft reserves specific altitudes for certain vendors, an attacker can learn these values and then simply walk the registry or use f!lib!filterFindNext() to locate any driver with the altitude in question. We can't use fltmc.exe to unload minifilters based on an altitude, but we can either resolve the driver's name in the registry or pass the minifilter's name to f!lib!filterUnload() for tooling that makes use of u!f!lib!filterFindNext(). This is how the Shlmon tool, which hunts and unloads SydronDev , works under the hood.

Defenders could further thwart attackers by modifying the minifilter's altitude. This isn't recommended in production applications, however, because another application might already be using the chosen value. EDR agents sometimes operate across millions of devices, raising the odds of an altitude collision. To mitigate this risk, a vendor might compile a list of active minifilter allocations from Microsoft and choose one not already in use, although this strategy isn't bulletproof.

In the case of Symson, defenders could either patch the installer to set the altitude value in the registry to a different value upon installation or manually change the altitude after installation by directly modifying the registry value. Since Windows doesn't place any technical controls on

Filesystem Minifilter Drivers 119

---

altitudes, the engineer could move SystomDev to any altitude they wish. Bear in mind, however, that the altitude affects the minifilter's position in the stack, so choosing too low a value could have unintended implications for the efficacy of the tool.

Even with all these obfuscation methods applied, an attacker could still unload a minifilter. Starting in Windows 10, both the vendor and Microsoft must sign a production driver before it can be loaded onto the system, and because these signatures are meant to identify the drivers, they include information about the vendor that signed them. This information is often enough to tip an adversary off to the presence of the target minifilter. In practice, the attacker could walk the registry or use the flt1tflb\fllterFindNext() approach to enumerate minifilters, extract the path to the driver on disk, and parse the digital signatures of all enumerated files until they've identified a file signed by an EDR. At that point, they can unload the minifilter using one of the previously covered methods.

As you've just learned, there are no particularly great ways to hide a minifilter on the system. This doesn't mean, however, that these obfuscations aren't worthwhile. An attacker might lack the tooling or knowledge to counter the obfuscations, providing time for the EDR's sensors to detect their activity without interference.

## Prevention

To prevent filesystem operations from ever passing through an EDR's minifilter, attackers can register their own minifilter and use it to force the completion of I/O operations. As an example, let's register a malicious preoperation callback for ISP _ NO _ WRITE requests, as shown in Listing 6-10.

```bash
PFLT_PRE_OPERATION_CALLBACK EvilPreWriteCallback;
FLT_PREOP_CALLBACK_STATUS EvilPreWriteCallback{
[in, out] PFLT_CALLBACK_DATA Data,
[in] PCFLT_RELATED_OBJECTS FlObjects,
[out] PVOID *CompletionContext
}
{
--snip--
}
```

Listing 6-10: Registering a malicious pre-operation callback routine

When the filter manager invokes this callback routine, it must return an FLT*PREOP_CALLBACK_STATUS value. One of the possible values, FLT_PREOP* COMPLETE, tells the filter manager that the current minifilter is in the process of completing the request, so the request shouldn't be passed to any minifilters below the current altitude. If a minifilter returns this value, it must set the NSTATUS value in the Status member of the I/O status block to the operation's final status. Antivirus engines whose minifiers communicate with user-mode scanning engines commonly use this functionality to

120 Chapter 6

---

determine whether malicious content is being written to a file. If the scanner indicates to the minifilter that the content is malicious, the minifilter completes the request and returns a failure status, such as STATUS_VIRUS \_INFECTED, to the caller.

But attackers can abuse this feature of minifiers to prevent the security agent from ever intercepting their filesystem operations. Using the earlier callback we registered, this would look something like what's shown in Listing 6-11 .

```bash
FLT_PREOP_CALLBACK_STATUS EvilPrePrewriteCallback
  [in, out]  PFLT_CALLBACK_DATA Data,
  [in]  PCFLT_RELATED_OBJECTS FltObjects,
  [out]  PVOID *CompletionContext
} {
  --snip--
  if (IsThisMyEvilProcess(PsGetCurrentProcessId()))
    {      --snip--
    ❸ Data->XoStatus.Status = STATUS_SUCCESS;
       return FLT_PREOP_COMPLETE
  }
  --snip--
}
```

Listing 6-11: Intercepting write operations and forcing their completion

The attacker first inserts their malicious minifilter at an altitude higher than the minifilter belonging to the EDR. Inside the malicious minifilter's pre-operation callback would exist logic to complete the I/O requests coming from the adversary's processes in user mode ❶ , preventing them from being passed down the stack to the EDR.

## Interference

A final evasion technique, interference, is built around the fact that a minifilter can alter members of the FLT _ CALLBACK_DATA structure passed to its callbacks on a request. An attacker can modify any members of this structure except the RequestorMode and Thread members. This includes the file pointer in the FLT _ TO_PARAMETER BLOCK structure's TargetFileObject member. The only requirement of the malicious minifilter is that it calls fltmgr!FltSetCallback DataDirty(), which indicates that the callback data structure has been modified when it is passing the request to minifiers lower in the stack.

An adversary can abuse this behavior to pass bogus data to the minifilter associated with an EDR by inserting itself anywhere above it in the stack, modifying the data tied to the request and passing control back to the filter manager. A minifilter that receives the modified request may evaluate whether FLTL_CALLBACK_DATA_DIRTY, which is set by fltmgrFltSet

callbackDataDirty(), is present and act accordingly, but the data will still be modified.

---

## Conclusion

Minifilters are the de facto standard for monitoring filesystem activity on Windows, whether it be for NTFS, named pipes, or even mailslots. Their implementation is somewhat more complex than the drivers discussed earlier in this book, but the way they work is very similar; they sit inline of some system operation and receive data about the activity. Attackers can evade minifilters by abusing some logical issue in the sensor or even unloading the driver entirely, but most adversaries have adapted their tradecraft to drastically limit creating new artifacts on disk to reduce the chances of a minifilter picking up their activity.

122 Chapter 6

---
