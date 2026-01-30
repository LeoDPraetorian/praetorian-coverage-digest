## CHAPTER 3  Processes and jobs

In this chapter, we'll explain the data structures and algorithms that deal with processes and jobs in Windows. First we'll take a general look at process creation. Then we'll examine the internal structures that make up a process. Next we'll look at protected processes and how they differ from non-protected ones. After that we outline the steps involved in creating a process (and its initial thread). The chapter concludes with a description of jobs.

Because processes touch so many components in Windows, a number of terms and data structures (such as working sets, threads, objects and handles, system memory heaps, and so on) are referred to in this chapter but are explained in detail elsewhere in the book. To fully understand this chapter, you need to be familiar with the terms and concepts explained in Chapter 1, “Concepts and tools,” and Chapter 2, “System architecture,” such as the difference between a process and a thread, the Windows virtual address space layout, and the difference between user mode and kernel mode.

### Creating a process

The Windows API provides several functions for creating processes. The simplest is CreateProcess, which attempts to create a process with the same access token as the creating process. If a different token is required, CreateProcessAsUser can be used, which accepts an extra argument (the first)—a handle to a token object that was already somehow obtained (for example, by calling the LogonUser function).

Other process creation functions include CreateProcessWithToken() and CreateProcessWithLogon() (both part of advapi32.Dll). CreateProcessWithToken() is similar to CreateProcessAsUser, but the two differ in the privileges required for the caller. (Check the Windows SDK documentation for the specifics.) CreateProcessWithLogon() is a handy shortcut to log on with a given user's credentials and create a process with the obtained token in one stroke. Both call the Secondary Logon service (selogon.dll, hosted in a SvcHost.Exe) by making a Remote Procedure Call (RPC) to do the actual process creation. SeLogon executes the call in its internal S1rCreateProcessWithLogon function, and if all goes well, eventually calls CreateProcessAsUser. The SecLogon service is configured by default to start manually, so the first time CreateProcessWithToken() or CreateProcessWithLogon() is called, the service is started. If the service fails to start (for example, an administrator can configure the service to be disabled), these functions will fail. The runas command-line utility, which you may be familiar with, makes use of these functions.

101


---

Figure 3-1 shows the call graph described above.

![Figure](figures/Winternals7thPt1_page_119_figure_001.png)

FIGURE 3-1 Process creation functions. Functions marked with dotted boxes are internal.

All the above documented functions expect a proper Portable Executable (PE) file (although the EXE extension is not strictly required), batch file, or 16-bit COM application. Beyond that, they have no knowledge of how to connect files with certain extensions (for example, .txt) to an executable (for example, Notepad). This is something that is provided by the Windows Shell, in functions such as ShellExecute and She11ExecuteEx. These functions can accept any file (not just executables) and try to locate the executable to run based on the file extensions and the registry settings at HKEY_CLASSES_ ROOT. (See Chapter 9, "Management mechanisms, " in Windows Internals Part 2 for more on this.) Eventually, She11Execute(Ex) calls CreateProcess with a proper executable and appends appropriate arguments on the command line to achieve the user's intention (such as editing a TXT file by appending the file name to Notepad.exe).

Ultimately, all these execution paths lead to a common internal function, CreateProcessInternal, which starts the actual work of creating a user-mode Windows process. Eventually (if all goes well), CreateProcessInternal calls NtCreateUserProcess in Ntdll.dll to make the transition to kernel mode and continue the kernel-mode part of process creation in the function with the same name (NtCreateUserProcess), part of the Executive.

## CreateProcess* functions arguments

It's worthwhile to discuss the arguments to the CreateProcess* family of functions, some of which will be referred to in the section on the flow of CreateProcess. A process created from user mode is always created with one thread within it. This is the thread that eventually will execute the main function of the executable. Here are the important arguments to the CreateProcess* functions:

- ■ For CreateProcessAsUser and CreateProcessWithToken#, the token handle under which the
new process should execute. Similarly, for CreateProcessWithLogon#, the username, domain
and password are required.
---

<table><tr><td>■ The executable path and command-line arguments.</td></tr><tr><td>■ Optional security attributes applied to the new process and thread object that's about to be created.</td></tr><tr><td>■ A Boolean flag indicating whether all handles in the current (creating) process that are marked inheritable should be inherited (copied) to the new process. (See Chapter 8, "System mecha-nisms," in Part 2 for more on handles and handle inheritance.)</td></tr><tr><td>■ Various flags that affect process creation. Here are some examples. (Check the Windows SDK documentation for a complete list.)</td></tr><tr><td>■ CREATE_SUSPENDED This creates the initial thread of the new process in the suspended state. A later call to ResumeThread will cause the thread to begin execution.</td></tr><tr><td>■ DEBUG_PROCESS The creating process is declaring itself to be a debugger, creating the new process under its control.</td></tr><tr><td>■ EXTENDED_STARTUPINFO_PRESENT The extended STARTUPINFOEX structure is provided instead of STARTUPINFO (described below).</td></tr><tr><td>■ An optional environment block for the new process (specifying environment variables). If not specified, it will be inherited from the creating process.</td></tr><tr><td>■ An optional current directory for the new process. (If not specified, it uses the one from the creating process.) The created process can later call SetCurrentDirectory to set a different one. The current directory of a process is used in various non-full paths searches (such as when loading a DLL with a filename only).</td></tr><tr><td>■ A STARTUPINFO or STARTUPINFOEX structure that provides more configuration for process-cre-ation. STARTUPINFOEX contains an additional opaque field that represents a set of process and thread attributes that are essentially an array of key/value pairs. These attributes are filled by calling UpdateProcThreadAttributes once for each attribute that's needed. Some of these at-titudes are undocumented and used internally, such as when creating store apps, as described in the next section.</td></tr><tr><td>■ A PROCESS_INFORMATION structure that is the output of a successful process creation. This structure holds the new unique process ID, the new unique thread ID, a handle to the new pro-cess and a handle to the new thread. The handles are useful for the creating process if it wants to somehow manipulate the new process or thread in some way after creation.</td></tr><tr><td>Creating Windows modern processes</td></tr><tr><td>Chapter 3 described the new types of applications available starting from Windows 8 and Windows 8000. The names of these apps have changed over time, but we'll refer to them as modern apps, UWP apps, or immersive processes, to distinguish them from the classic, also known as desktop, applications.</td></tr><tr><td>CHAPTER 3 Processes and jobs 103</td></tr><tr><td>From the Library of Michael Weber</td></tr></table>

---

Creating a modern application process requires more than just calling CreateProcess with the correct executable path. There are some required command-line arguments. Yet another requirement is adding an undocumented process attribute (using UpdateProcThreadAttribute) with a key named PROC_THREAD_ATTRIBUTE_PACKAGE_FULL_NAME with the value set to the full store app package name. Although this attribute is undocumented, there are other ways (from an API perspective) to execute a store app. For example, the Windows API includes a COM interface called IApplicationActivationManager that is implemented by a COM class with a CLSID named CLSID_ApplicationActivationManager. One of the methods in the interface is ActivateApplication, which can be used to launch a store app after obtaining something known as AppUserModelId from the store app full package name by calling GetPackageApplicationIds. (See the Windows SDK for more information on these APIs.)

Package names and the way a store app is typically created, from a user tapping on a modern app

tile, eventually leading to CreateProcess, is discussed in Chapter 9 in Part 2.

## Creating other kinds of processes

Although Windows applications launch either classic or modern applications, the Executive includes support for additional kinds of processes that must be started by bypassing the Windows API, such as native processes, minimal processes, or Pico processes. For example, we described in Chapter 2 the existence of Smss, the Session Manager, which is an example of a native image. Since it is created directly by the kernel, it obviously does not use the CreateProcess API, but instead calls directly into NtCreateUserProcess. Similarly, when Smss creates Autodsk (the check disk utility) or Ccss (the Windows subsystem process), the Windows API is also not available, and NtCreateUserProcess must be used. Additionally, native processes cannot be created from Windows applications, as the CreateProcessInternal function will reject images with the native subsystem image type. To alleviate these complications, the native library, Ntdll.dll, includes an exported helper function called RtlCreateUserProcess, providing a simpler wrapper around NtCreateUserProcess.

As its name suggests, NtCreateUserProcess is used for the creation of user-mode processes. However, as we saw in Chapter 2, Windows also includes a number of kernel-mode processes, such as the System process and the Memory Compression processes (which are minimal processes), plus the possibility of Pico processes managed by a provider such as the Windows Subsystem for Linux. The creation of such processes is instead provided by the NtCreateProcessEx system call, with certain capabilities reserved solely for kernel-mode callers (such as the creation of minimal processes).

Finally, Pico providers call a helper function, which takes care of both creating the minimal process as well as initializing its Pico provider context—PcpCreatePicoProcess. This function is not exported, and is only available to Pico providers through their special interface.

As we'll see in the flow section later in this chapter, although NtCreateProcessEx and NtCreateUserProcess are different system calls, the same internal routines are used to perform the work: PspAllocateProcess and PspInsertProcess. All the possible ways we've enumerated so far to create a process, and any ways you can imagine, from a WMI PowerShell cmdlet to a kernel driver, will end up there.

---

## Process internals

This section describes the key Windows process data structures maintained by various parts of the

system and describes different ways and tools to examine this data.

Each Windows process is represented by an executive process (EPROCESS) structure. Besides con taining many attributes relating to a process, an EPROCESS contains and points to a number of other

related data structures. For example, each process has one or more threads, each represented by an

executive thread (ETHREAD) structure. (Thread data structures are explained in Chapter 4, "Threads.")

The EPROCESS and most of its related data structures exist in system address space. One exception is the Process Environment Block (PEB), which exists in the process (user) address space (because it contains information accessed by user-mode code). Additionally, some of the process data structures used in memory management, such as the working set list, are valid only within the context of the current process, because they are stored in process-specific system space. (See Chapter 5, "Memory management," for more information on process address space.)

For each process that is executing a Windows program, the Windows subsystem process (Csrss) maintains a parallel structure called the CSR_PROCESS. Additionally, the kernel-mode part of the Windows subsystem (Win32k.sys) maintains a per-process data structure, w32PROCESS, which is created the first time a thread calls a Windows USER or GDI function that is implemented in kernel mode. This happens as soon as the User32.dll library is loaded. Typical functions that cause this library to be loaded are CreateWindow(Ex) and GetMessage.

Since the kernel-mode Windows subsystem makes heavy use of DirectX-based hardware accelerated graphics, the Graphics Device Interface (GDI) component infrastructure causes the DirectX Graphics Kernel (Dxgkml.sys) to initialize a structure of its own, DXPROCESS. This structure contains information for DirectX objects (surfaces, shaders, etc.) and the GPGPU-related counters and policy settings for both computational and memory management–related scheduling.

Except for the idle process, every EPROCESS structure is encapsulated as a process object by the

executive object manager (described in Chapter 8 in Part 2). Because processes are not named objects,

they are not visible in the WinObj tool (from Sysinternals). You can, however, see the Type object called

Process in the ObjectTypes directory (in WinObj). A handle to a process provides, through use of the

process-related APIs, access to some of the data in the EPROCESS structure and in some of its associated

structures.

Many other drivers and system components, by registering process-creation notifications, can choose to create their own data structures to track information they store on a per-process basis. (The executive functions PSetCreateProcessNotifyRoutine(Ex, Ex2) allow this and are documented in the WDK). When one discusses the overhead of a process, the size of such data structures must often be taken into consideration, although it is nearly impossible to obtain an accurate number. Additionally, some of these functions allow such components to disallow, or block, the creation of processes. This provides anti-malware vendors with an architectural way to add security enhancements to the operating system, either through hash-based blacklisting or other techniques.

---

First let's focus on the Process object. Figure 3-2 shows the key fields in an EPROCESS structure.

![Figure](figures/Winternals7thPt1_page_123_figure_001.png)

FIGURE 3-2 Important fields of the executive process structure.

Similar to the way the kernel's APIs and components are divided into isolated and layered modules with their own naming conventions, the data structures for a process follow a similar design. As shown in Figure 3-2, the first member of the executive process structure is called Pcb (Process Control Block). It is a structure of type KPROCESS, for kernel process. Although routines in the executive store information in the EPROCESS, the dispatcher, scheduler, and interrupt/time accounting code—being part of the operating system kernel—use the KPROCESS instead. This allows a layer of abstraction to exist between the executive's high-level functionality and its underlying low-level implementation of certain functions, and helps prevent unwanted dependencies between the layers. Figure 3-3 shows the key fields in a KPROCESS structure.

---

![Figure](figures/Winternals7thPt1_page_124_figure_000.png)

FIGURE 3-3 Important fields of the kernel process structure.

## EXPERIMENT: Displaying the format of an EPROCESS structure

For a list of the fields that make up an EPROCESS structure and their offsets in hexadecimal, type


dt ntl_eprocess in the kernel debugger. (See Chapter 1 for more information on the kernel

debugger and how to perform kernel debugging on the local system.) The output (truncated for

the sake of space) on a 64-bit Windows 10 system looks like this:

```bash
tkd> dt ntl_eProcess
     +0x000 Pcb             : _KPROCESS
     +0x2d8 ProcessLock       : _EX_PUSH_LOCK
     +0x2e0 RndownProtect      : _EX_RNDOWN_REF
     +0x2e4 UniqueProcessId : Ptr64 Void
     +0x2f0 ActiveProcessLinks : _LIST_ENTRY
  ...
     +0x3a8 Win32Process    : : Ptr64 Void
     +0x3b0 Job                 : :Ptr64 _EJOB
  ...
     +0x418 ObjectTable      : :Ptr64 _HANDLE_TABLE
     +0x420 DebugPort         : :Ptr64 Void
     +0x428 WoW64Process      : :Ptr64 _EWOW64PROCESS
  ...
     +0x758 SharedCommitCharge : Uint8B
     +0x760 SharedCommitLock : _EX_PUSH_LOCK
     +0x768 SharedCommitLinks : :LIST_ENTRY
```

CHAPTER 3   Processes and jobs      107


---

```bash
+0x778 AllowedPduSets  : Uint8B
+0x780 DefaultPduSets : Uint8B
+0x778 AllowedPduSetsIndirect : Ptr64 Uint88
+0x780 DefaultPduSetsIndirect : Ptr64 Uint88
```

The first member of this structure (Pcb) is an embedded structure of type KPROCESS. This is

where scheduling and time-accounting data is stored. You can display the format of the kernel

process structure in the same way as the EPROCESS:

```bash
!kb<dt ntl_kprocess
+0x000 Header        : _DISPATCHER_HEADER
+0x018 ProfileListHead  : _LIST_ENTRY
+0x028 DirectoryTableBase : Uint8B
+0x030 ThreadListHead : _LIST_ENTRY
+0x040 ProcessLock   : Uint4B
  ....
+0x26c KernelTime      : Uint4B
+0x270 UserTime       : Uint4B
+0x274 IdtFreeSelectorHint : Uint2B
+0x276 IdtTableLength : Uint2B
+0x278 IdtSystemDescriptor : _KGDENTRY64
+0x288 IdtBaseAddress : Ptr64 Void
+0x290 IdtProcessLock  : _FAST_MUTEX
+0x2c8 InstrumentationCallback : Ptr64 Void
+0x2d0 SecurePld      : Uint8B
```

The dt command also enables you to view the specific contents of one field or multiple fields by typing their names following the structure name. For example, typing dt ntl_eprocess UniqueProcessId displays the process ID field. In the case of a field that represents a structure— such as the Pcb field of EPROCESS, which contains the KPROCESS substructure—adding a period after the field name will cause the debugger to display the substructure. For example, an alternative way to see the KPROCESS is to type dt ntl_eprocess Pcb. You can continue to recurse this way by adding more field names (within KPROCESS) and so on. Finally, the -r switch of the dt command allows you to recurse through all the substructures. Adding a number after the switch controls the depth of recursion the command will follow.

The dt command used as shown earlier shows the format of the selected structure, not the contents of any particular instance of that structure type. T o show an instance of an actual process, you can specify the address of an EPROCESS structure as an argument to the dt command. You can get the addresses of almost all of the EPROCESS structures in the system by using the !process 0 0 command (the exception being the system idle process). Because the KPROCESS is the first thing in the EPROCESS, the address of an EPROCESS will also work as the address of a KPROCESS with dt _kprocess.

---

## EXPERIMENT: Using the kernel debugger !process command

The kernel debugger I Process command displays a subset of the information in a process object and its associated structures. This output is arranged in two parts for each process. First you see the information about the process, as shown here. When you don’t specify a process address or ID, I Process lists information for the process owning the thread currently running on CPU 0, which will be WinDbg itself (or i'vekd if it's used in lieu of WinDbg) on a single-processor system.

```bash
!kds !process
PROCESS ffffe0011c3243c0
    SessionId: 2  Cid: 0e38      Peb: 5F2f1de000  ParentCid: 0f08
    DirBase: 38b3e0000  ObjectTable: ffffcc00a0b22200  HandleCount: <Data Not Accessible>
    Image: windbg.exe
    VadRoot ffffec0011badae60 Vads 117 Clone 0 Private 3563. Modified 228. Locked 1.
    DeviceMap ffffcc000984e4330
        Token                          ffffcc000a13f39a0
        ElapsedTime                       00:00:20.772
        UserTime                       00:00:00.000
        KernelTime                       00:00:00.015
        QuotaPoolUsage[PagedPool]     299512
        QuotaPoolUsage[NonPagedPool]   16240
        Working Set Sizes (now,min,max)   (9719, 50, 345) (38876KB, 200KB, 1380KB)
        PeakWorkingSetSize            9947
        VirtualSize                       2097319 Mb
        PeakVirtualSize                 2097321 Mb
        PageFaultCount                   13603
        MemoryPriority                 FOREGROUND
        BasePriority                   8
        CommitCharge                 3994
        Job                          fffffe0011b853690
```

After the basic process output comes a list of the threads in the process. That output is explained in the “Experiment: Using the kernel debugger Thread command” section in Chapter 4.

Other commands that display process information include !handle, which dumps the process

handle table (described in more detail in the section "Object handles and the process handle

table" in Chapter 8 in Part 2). Process and thread security structures are described in Chapter 7,

"Security."

Note that the output gives the address of the PEB. You can use this with the !peb command

shown in the next experiment to see a friendly view of the PEB of an arbitrary process or you can

use the regular dt command with the .PEB structure. However, because the PEB is in the user-mode

address space, it is valid only within the context of its own process. T o look at the PEB of another

process, you must first switch WinDbg to that process. You can do this with the .process /P

command, followed by the EPROCESS pointer.

---

If you're using the latest Windows 10 SDK, the updated version of WinDbg will include an intuitive

hyperlink under the PEB address, which you can click to automatically execute both the .process

command and the !peb command.

The PEB lives in the user-mode address space of the process it describes. It contains information

needed by the image loader, the heap manager, and other Windows components that need to access

it from user mode; it would be too expensive to expose all that information through system calls. The

EPROCESS and KPROCESS structures are accessible only from kernel mode. The important fields of the

PEB are illustrated in Figure 3-4 and are explained in more detail later in this chapter.

![Figure](figures/Winternals7thPt1_page_127_figure_002.png)

FIGURE 3-4 Important fields of the Process Environment Block.

## EXPERIMENT: Examining the PEB

You can dump the PEB structure with the !peb command in the kernel debugger, which displays the PEB of the process that owns the currently running thread on CPU 0. By using the information in the previous experiment, you can also use the PEB pointer as an argument to the command.

110   CHAPTER 3 Processes and jobs


---

```bash
//go:build !windows
  lkd> ./process /P ffffe001lc3243c0 : !peb 5f2f1de000
  PEB at 000003561545000
    InheritedAddressSpace:      No
    ReadImageFileExecOptions: No
    BeingDebugged:                No
    ImageBaseAddress:            00007ff64fa70000
    Ldr:                          00007fff5f2f5200
    Ldr.Initialized:            Yes
    Ldr.InInitializationOrderModuleList: 000001d3d22b3630  000001d3d6cdb60
    Ldr.InLoadOrderModuleList:      000001d3d2b3790  000001d3d6cdb40
    Ldr.InMemoryOrderModuleList:     000001d3d2b37a0  000001d3d6cdb650
        Base TimeStamp               Module
    7ff64fa70000 56ccafd Feb 23 01:15:41 2016 C:\dbg\x64windbg.exe
    7ffdf5fb0000 56cbf9dd Feb 23 08:19:09 2016 C:\WINDOWS\SYSTEM32\ntd11.dll
    7fffdf2c10000 5632d5aa Oct 30 04:27:54 2015 C:\windows\system32\KERNL32.DLL
    ...
```

The CSR_PROCESS structure contains information about processes that is specific to the Windows

subsystem (Cssr). As such, only Windows applications have a CSR_PROCESS structure associated

with them (for example, Smss does not). Additionally, because each session has its own instance of

the Windows subsystem, the CSR_PROCESS structures are maintained by the Cssr process within each

individual session. The basic structure of the CSR_PROCESS is illustrated in Figure 3-5 and is explained

in more detail later in this chapter.

![Figure](figures/Winternals7thPt1_page_128_figure_002.png)

FIGURE 3-5 Fields of the CSR process structure.

CHAPTER 3   Processes and jobs      111


---

EXPERIMENT: Examining the CSR_PROCESS

CSS processes are protected (see later in this chapter for more on protected processes), so it’s not possible to attach a user mode debugger to a Css process (not even with elevated privileges or non-invasively). Instead, we’ll use the kernel debugger.

First, list the existing Css processes:

```bash
!kb | process 0 0 cssr.exe
PROCESS ffff00077df080
    SessionId: 0 Cid: 02c0    Peb: c4e3fc0000  ParentCid: 026c
        DirBase:   ObjectTable: ffffc0004d15d040  HandleCount: 543.
        Image: cssr.exe
PROCESS ffff00078796080
        SessionId: 1 Cid: 0338    Peb: d4b4db4000  ParentCid: 0330
        DirBase:   ObjectTable: ffffc0004ddf040  HandleCount: 514.
        Image: cssr.exe
```

Next, take any one of them and change the debugger context to point to the particular process so that its user mode modules are visible:

```bash
!kd ./process /r /P ffffe00078796080
Implicit process is now ffffe00078796080
Loading User Symbols
..............
```

The /p switch changes the process context of the debugger to the provided process object

(EPROCESS, mostly needed in live debugging) and /r requests loading of user mode symbols.


Now you can look at the modules themselves using the 1m command or look at the CSR_PROCESS

structure:

```bash
!hdr- dt csrssl CSR_process
  +0x000 ClientId         : _CLIENT_ID
  +0x010 ListLink        : _LIST_ENTRY
  +0x020 ThreadList      : _LIST_ENTRY
  +0x030 NrSession       : Ptr64 CSR_NT_SESSION
  +0x038 ClientPort      : Ptr64 Void
  +0x040 ClientViewBase   : Ptr64 Char
  +0x048 ClientViewBounds : Ptr64 Char
  +0x050 ProcessHandle : Ptr64 Void
  +0x058 SequenceNumber    : Uint4B
  +0x05c Flags           : Uint4B
  +0x060 DebugFlags     : Uint4B
  +0x064 ReferenceCount  : Int4B
  +0x068 ProcessGroupId : Uint4B
  +0x06c ProcessGroupSequence : Uint4B
  +0x070 LastMessageSequence : Uint4B
  +0x074 NumOutstandingMessages : Uint4B
  +0x078 ShutdownLevel    : Uint4B
  +0x07c ShutdownFlags     : Uint4B
  +0x080 Luid             : _LUID
  +0x088 ServerDllPerProcessData : [1] Ptr64 Void
```

112   CHAPTER 3 Processes and jobs


---

The W32PROCESS structure is the final system data structure associated with processes that we'll look at. It contains all the information that the Windows graphics and window management code in the kernel (Win32k) needs to maintain state information about GUI processes (which were defined earlier as processes that have done at least one USER/GDI system call). The basic structure of the W32PROCESS is illustrated in Figure 3-6. Unfortunately, since type information for Win32k structures is not available in public symbols, we can't easily show you an experiment displaying this information. Either way, discussion of graphics-related data structures and concepts is beyond the scope of this book.

![Figure](figures/Winternals7thPt1_page_130_figure_001.png)

FIGURE 3-6 Fields of the Win32k Process structure.

## Protected processes

In the Windows security model, any process running with a token containing the debug privilege (such as an administrator's account) can request any access right that it desires to any other process running on the machine. For example, it can read and write arbitrary process memory, inject code, suspend and resume threads, and query information on other processes. Tools such as Process Explorer and Task Manager need and request these access rights to provide their functionality to users.

This logical behavior (which helps ensure that administrators will always have full control of the running code on the system) clashes with the system behavior for digital rights management requirements imposed by the media industry on computer operating systems that need to support playback of advanced, high-quality digital content such as Blu-ray media. To support reliable and protected playback of such content, Windows Vista and Windows Server 2008 introduced protected processes. These processes exist alongside normal Windows processes, but they add significant constraints to the access rights that other processes on the system (even when running with administrative privileges) can request.

Protected processes can be created by any application. However, the operating system will allow a process to be protected only if the image file has been digitally signed with a special Windows Media Certificate. The Protected Media Path (PMP) in Windows makes use of protected processes to provide protection for high-value media, and developers of applications such as DVD players can make use of protected processes by using the Media Foundation (MF) API.

CHAPTER 3   Processes and jobs      113


---

The Audio Device Graph process (AudioIg.exe) is a protected process because protected music content can be decoded through it. Related to this is the Media Foundation Protected Pipeline (Mfmp.exe), which is also a protected process for similar reasons (it does not run by default). Similarly, the Windows Error Reporting (WER; discussed in Chapter 8 in Part 2) client process (Werfaultsecure.exe) can also run protected because it needs to have access to protected processes in case one of them crashes. Finally, the System process itself is protected because some of the decryption information is generated by the Ksccd.sys driver and stored in its user-mode memory. The System process is also protected to protect the integrity of all kernel handles (because the System process's handle table contains all the kernel handles on the system). Since other drivers may also sometimes map memory inside the user-mode address space of the System process (such as Code Integrity certificate and catalog data), it's yet another reason for keeping the process protected.

At the kernel level, support for protected processes is twofold. First, the bulk of process creation occurs in kernel mode to avoid injection attacks. (The flow for both protected and standard process creation is described in detail in the next section.) Second, protected processes (and their extended cousin, Protected Processes Light [PPL], described in the next section) have special bits set in their EPROCESS structure that modify the behavior of security-related routines in the process manager to deny certain access rights that would normally be granted to administrators. In fact, the only access rights that are granted for protected processes are PROCESS_QUERY/SET_LIMTED_INFORMATION, PROCESS_TERMINATE and PROCESS_SUSPEND Resume. Certain access rights are also disabled for threads running inside protected processes. We will look at those access rights in Chapter 4 in the section "Thread internals."

Because Process Explorer uses standard user-mode Windows APIs to query information on process internals, it is unable to perform certain operations on such processes. On the other hand, a tool like WinDbg in kernel-debugging mode, which uses kernel-mode infrastructure to obtain this information, will be able to display complete information. See the experiment in the "Thread internals" section in Chapter 4 on how Process Explorer behaves when confronted with a protected process such as Audiodg.exe.

![Figure](figures/Winternals7thPt1_page_131_figure_003.png)

Note As mentioned in Chapter 1, to perform local kernel debugging, you must boot in debugging mode (enabled by using bcdedit /debug on or by using the Mscconfig advanced boot options). This mitigates against debugger-based attacks on protected processes and the PMP. When booted in debugging mode, high-definition content playback will not work.

Limiting these access rights reliably allows the kernel to sandbox a protected process from usermode access. On the other hand, because a protected process is indicated by a flag in the EPROCESS structure, an administrator can still load a kernel-mode driver that modifies this flag. However, this would be a violation of the PMP model and considered malicious, and such a driver would likely eventually be blocked from loading on a 64-bit system because the kernel-mode, code-signing policy prohibits the digital signing of malicious code. Additionally, kernel-mode patch protection, known as PatchGuard (described in Chapter 7), as well as the Protected Environment and Authentication Driver

CHAPTER 3 Processes and jobs

From the Library of

---

(Peauth.sys) will recognize and report such attempts. Even on 32-bit systems, the driver has to be recognized by PMP policy or the playback may be halted. This policy is implemented by Microsoft and not by any kernel detection. This block would require manual action from Microsoft to identify the signature as malicious and update the kernel.

## Protected Process Light (PPL)

As we just saw, the original model for protected processes focused on DRM-based content. Starting

with Windows 8.1 and Windows Server 2012 R2, an extension to the protected process model was intro duced, called Protected Process Light (PPL).

PPLs are protected in the same sense as classic protected processes: User-mode code (even running with elevated privileges) cannot penetrate these processes by injecting threads or obtaining detailed information about loaded DLLs. However, the PPL model adds an additional dimension to the quality of being protected: attribute values. The different Signers have differing trust levels, which in turn results in certain PPLs being more, or less, protected than other PPLs.

Because DRM evolved from merely multimedia DRM to also Windows licensing DRM and Windows

Store DRM, standard protected processes are now also differentiated based on the Signer value. Finally,

the various recognized Signers also define which access rights are denied to lesser protected processes.

For example, normally, the only access masks allowed are PROCESS_QUERY/SET_LIMITED_INFOATION

and PROCESS_SUSPEND_RESOLUTION. PROCESS_TERMINATE is not allowed for certain PPL signers.

Table 3-1 shows the legal values for the protection flag stored in the EPROCESS structure.

TABLE 3-1 Valid protection values for processes

<table><tr><td>Internal Protection Process Level Symbol</td><td>Protection Type</td><td>Signer</td></tr><tr><td>PS_PROTECTED_SYSTEM (0x72)</td><td>Protected</td><td>WinSystem</td></tr><tr><td>PS_PROTECTED_WINTCB (0x62)</td><td>Protected</td><td>WinTcb</td></tr><tr><td>PS_PROTECTED_WINTCB_LIGHT (0x61)</td><td>Protected Light</td><td>WinTcb</td></tr><tr><td>PS_PROTECTED_WINDOWS (0x52)</td><td>Protected</td><td>Windows</td></tr><tr><td>PS_PROTECTED_WINDOWS_LIGHT (0x51)</td><td>Protected Light</td><td>Windows</td></tr><tr><td>PS_PROTECTED_LSA_LIGHT (0x41)</td><td>Protected Light</td><td>Lsa</td></tr><tr><td>PS_PROTECTED_ANTIMALWARE_LIGHT (0x31)</td><td>Protected Light</td><td>Anti-malware</td></tr><tr><td>PS_PROTECTED_AUTHENICODE (0x21)</td><td>Protected</td><td>Authenicode</td></tr><tr><td>PS_PROTECTED_AUTHENICODE_LIGHT (0x11)</td><td>Protected Light</td><td>Authenicode</td></tr><tr><td>PS_PROTECTED_NONE (0x00)</td><td>None</td><td>None</td></tr></table>


As shown in Table 3-1, there are several signers defined, from high to low power. WinSystem is the

highest-priority signer and used for the System process and minimal processes such as the Memory

Compression process. For user-mode processes, WinTCB (Windows Trusted Computer Base) is the

highest-priority signer and leveraged to protect critical processes that the kernel has intimate knowledge

CHAPTER 3 Processes and jobs 115


---

of and might reduce its security boundary toward. When interpreting the power of a process, keep in mind that first, protected processes always trump PPLs, and that next, higher-value signer processes have access to lower ones, but not vice versa. Table 3-2 shows the signer levels (higher values denote the signer is more powerful) and some examples of their usage. You can also dump these in the debugger with the _PS_PROTECTED_SIGNER type.

TABLE 3-2 Signers and levels

<table><tr><td>Signer Name (PS_PROTECTED_SIGNER)</td><td>Level</td><td>Used For</td></tr><tr><td>PsProtectedSignerWinSystem</td><td>7</td><td>System and minimal processes (including Pico processes).</td></tr><tr><td>PsProtectedSignerWinTcb</td><td>6</td><td>Critical Windows components. PROCESS_TERMINATE is denied.</td></tr><tr><td>PsProtectedSignerWindows</td><td>5</td><td>Important Windows components handling sensitive data.</td></tr><tr><td>PsProtectedSignerLsa</td><td>4</td><td>Lsas.exe (if configured to run protected).</td></tr><tr><td>PsProtectedSignerAntimalware</td><td>3</td><td>Anti-malware services and processes, including third party. PROCESS_TERMINATE is denied.</td></tr><tr><td>PsProtectedSignerCodeGen</td><td>2</td><td>NGEN (.NET native code generation).</td></tr><tr><td>PsProtectedSignerAuthenticode</td><td>1</td><td>Hosting DRM content or loading user-mode fonts.</td></tr><tr><td>PsProtectedSignerNone</td><td>0</td><td>Not valid (no protection).</td></tr></table>


At this point you may be wondering what prohibits a malicious process from claiming it is a protected process and shielding itself from anti-malware (AM) applications. Because the Windows Media DRM Certificate is no longer necessary to run as a protected process, Microsoft extended its Code Integrity module to understand two special enhanced key usage (EKU) OIDs that can be encoded in a digital code signing certificate: 1.3.6.1.4.1.3110.3.22 and 1.3.6.1.4.1.3110.3.20. Once one of these EKUs is present, hardcoded Signer and Issuer strings in the certificate, combined with additional possible EKUs, are then associated with the various Protected Signer values. For example, the Microsoft Windows Issuer can grant the PsProtectedSignerWindows protected signer value, but only if the EKU for Windows System Component Verification (1.3.6.1.4.1.3110.3.6) is also present. As an example, Figure 3-7 shows the certificate for Smss.exe, which is permitted to run as WinNTc-Light.

Finally, note that the protection level of a process also impacts which DLLs it will be allowed to

load—otherwise, either through a logic bug or simple file replacement or plating, a legitimate protect ed process could be coerced into loading a third party or malicious library, which would now execute

with the same protection level as the process. This check is implemented by granting each process a

"Signature Level," which is stored in the SignatureLevel field of EPROCESS, and then using an inter nal lookup table to find a corresponding "DLL Signature Level," stored as SectionSignatureLevel

in EPROCESS. Any DLL loading in the process will be checked by the Code Integrity component in the

same way that the main executable is verified. For example, a process with "WinTcb" as its executable

signer will only load "Windows" or higher signed DLLs.

---

![Figure](figures/Winternals7thPt1_page_134_figure_000.png)

FIGURE 3-7 Smss certificate.

On Windows 10 and Windows Server 2016, the following processes are PPL signed with WinCbtc: Lite

sms.exe, csrrx.exe, services.exe, and winexe.exe. Lsas.exe is running as PPL on ARM-based Windows

(such as Windows mobile 10) and can run as PPL on x86/x64 if configured as such by a registry setting

or by policy (see Chapter 7 for more information). Additionally, certain services are configured to run as

Windows PPL or protected processes, such as sppsvc.exe (Software Protection Platform). You may also

notice certain service-hosting processes (Sichost.exe) running with this protection level, since many

services, such as the AppX Deployment Service and the Windows Subsystem for Linux Service, also run

protected. More information on such protected services will be described in Chapter 9 in Part 2.

The fact that these core system binaries run as TCB is critical to the security of the system. For example, Cssr.exe has access to certain private APIs implemented by the Window Manager (Win32x.sys), which could give an attacker with Administrator rights access to sensitive parts of the kernel. Similarly, Smss exe and Wininit.exe implement system startup and management logic that is critical to perform without possible interference from an administrator. Windows guarantees that these binaries will always run as WinTcb-Lite such that, for example, it is not possible for someone to launch them without specifying the correct process protection level in the process attributes when calling CreateProcess. This guarantee is known as the minimum TCB list and forces any processes with the names in Table 3-3 that are in a System path to have a minimum protection level and/or signing level regardless of the caller's input.

CHAPTER 3   Processes and jobs      117


---

TABLE 3-3 Minimum TCB

<table><tr><td>Process Name</td><td>Minimum Signature Level</td><td>Minimum Protection Level</td></tr><tr><td>Smss.exe</td><td>Inferred from protection level</td><td>WinTcb-Lite</td></tr><tr><td>Csss.exe</td><td>Inferred from protection level</td><td>WinTcb-Lite</td></tr><tr><td>Wininit.exe</td><td>Inferred from protection level</td><td>WinTcb-Lite</td></tr><tr><td>Services.exe</td><td>Inferred from protection level</td><td>WinTcb-Lite</td></tr><tr><td>Werfaultsecure.exe</td><td>Inferred from protection level</td><td>WinTcb-Full</td></tr><tr><td>Spsvc.exe</td><td>Inferred from protection level</td><td>Windows-Full</td></tr><tr><td>Genvalobj.exe</td><td>Inferred from protection level</td><td>Windows-Full</td></tr><tr><td>Lsass.exe</td><td>SE_SIGNING_LEVEL_WINDOWS</td><td>0</td></tr><tr><td>Userinit.exe</td><td>SE_SIGNING_LEVEL_WINDOWS</td><td>0</td></tr><tr><td>Winlogon.exe</td><td>SE_SIGNING_LEVEL_WINDOWS</td><td>0</td></tr><tr><td>Autochk.exe</td><td>SE_SIGNING_LEVEL_WINDOWS*</td><td>0</td></tr></table>


*Only on UEFI firmware systems

EXPERIMENT: Viewing protected processes in Process Explorer

In this experiment, we'll look at how Process Explorer shows protected processes (of either type).


Run Process Explorer and select the Protection check box in the Process Image tab to view the


Protection column:

![Figure](figures/Winternals7thPt1_page_135_figure_005.png)

Now sort by the Protection column in descending order and scroll to the top. You should see all

protected processes with their protection type. Here's a screenshot from a Windows 10 x64 machine:

118   CHAPTER 3  Processes and jobs


---

![Figure](figures/Winternals7thPt1_page_136_figure_000.png)

If you select a protected process and look at the lower part when configured to view DLLs, you'll see nothing. That's because Process Explorer uses user-mode APIs to query the loaded modules and that requires access that is not granted for accessing protected processes. The notable exception is the System process, which is protected, but Process Explorer instead shows the list of loaded kernel modules (mostly drivers) since there are no DLLs in system processes. This is done using the EnumDeviceDrivers API, which is a system API that does not require a process handle.

If you switch to Handle view, you'll see complete handle information. The reason is similar: Process Explorer uses an undocumented API that returns all handles on the system, which does not require a specific process handle. Process Explorer can identify the process simply because this information returns the PID associated with each handle.

## Third-party PPL support

The PPL mechanism extends the protection possibilities for processes beyond executables created solely by Microsoft. A common example is anti-malware (AM) software. A typical AM product consists of three main components:

- ■ A kernel driver that intercepts I/O requests to the file system and/or the network, and implements

blocking capabilities using object, process, and thread callbacks

■ A user-mode service (typically running under a privileged account) that configures the driver's

policies, receives notifications from the driver regarding "interesting" events (for example,

infected file), and may communicate with a local server or the Internet

■ A user-mode GUI process that communicates information to the user and optionally allows the

user to make decisions where applicable.
One possible way malware can attack a system is by managing to inject code inside a process running

with elevated privileges, or better; inject code specifically inside an anti-malware service and thus tam per with it or disable its operation. If, however, the AM service could run as a PPL, no code injection would

be possible, and no process termination would be allowed, meaning that the AM software would be

better protected from malware that does not employ kernel-level exploits.

CHAPTER 3 Processes and jobs     119


---

To enable this use, the AM kernel driver described above needs to have a corresponding Early-Launch

Anti Malware (ELAM) driver. While ELAM is further described in Chapter 7, the key distinction is that

such drivers require a special anti-malware certificate provided by Microsoft (after proper verification

of the software's publisher). Once such a driver is installed, it can contain a custom resource section in

its main executable (PE) file called ELAMCERTIFICATEINFO. This section can describe three additional

Signers (identified by their public key), each having up to three additional EKUs (identified by OID).

Once the Code Integrity system recognizes any file signed by one of the three Signers, containing

one of the three EKUs, it permits the process to request a PPL of PS_PROTECTED_ANTIMALWARE_LIGHT

(0x31). A canonical example of this is Microsoft's own AM known as Windows Defender. Its service on

Windows 10 (MsMpEng.exe) is signed with the anti-malware certificate for better protection against

malware attacking the AM itself, as is its Network Inspection Server (NiSvc.exe).

## Minimal and Pico processes

The types of processes we've looked at so far, and their data structures, seem to imply that their use is the execution of user-mode code, and that they contain a great deal of related data structures in memory to achieve this. Yet, not all processes are used for this purpose. For example, as we've seen, the System process is merely used as a container of most of the system threads, such that their execution time doesn't pollute arbitrary user-mode processes, as well as being used as a container of drivers' handles (called kernel handles), such that these don't end up owned by an arbitrary application either.

### Minimal processes

When a specific flag is given to the NtCreateProcessEx function, and the caller is kernel-mode, the function behaves slightly differently and causes the execution of the PsCreateMinimalProcess API. In turn, this causes a process to be created without many of the structures that we saw earlier, namely:

- ■ No user-mode address space will be set up, so no PEB and related structures will exist.

■ No NTDLL will be mapped into the process, nor will any loader/API Set information.

■ No section object will be tied to the process, meaning no executable image file is associated to

its execution or its name (which can be empty, or an arbitrary string).

■ The Minimal flag will be set in the EPROCESS flags, causing all threads to become minimal

threads, and also avoid any user-mode allocations such as their TEB or user-mode stack.

(See Chapter 4 for more information on the TEB.)
As we saw in Chapter 2, Windows 10 has at least two minimal processes—the System process and Memory Compression process—and can have a third, the Secure System process, if VirtualizationBased Security is enabled, which is described further in Chapter 2 and Chapter 7.

Finally, the other way to have minimal processes running on a Windows 10 system is to enable the

Windows Subsystem for Linux (WSL) optional feature that was also described in Chapter 2. This will

install an inbox Pico Provider composed of the Lxss.sys and LxCore.sys drivers.

120    CHAPTER 3   Processes and jobs


---

## Pico processes

While minimal processes have a limited use in terms of allowing access to user-mode virtual address space from kernel components and protecting it, Pico processes take on a more important role by permitting a special component, called a Pico Provider, to control most aspects of their execution from an operating system perspective. This level of control ultimately allows such a provider to emulate the behavior of a completely different operating system kernel, without the underlying user-mode binary being aware that it is running on a Windows-based operating system. This is essentially an implementation of the Drawbridge project from Microsoft Research, which is also used to support SQL Server for Linux in a similar way (albeit with a Windows-based Library OS on top of the Linux kernel).

To support the existence of Pico processes on the system, a provider must first be present. Such a provider can be registered with the PstRegisterPicoProvider API, but subject to a very specific rule: A Pico provider must be loaded before any other third-party drivers are loaded (including boot drivers). In fact, only one of the limited set of a dozen or so core drivers are allowed to call this API before the functionality is disabled, and these core drivers must be signed with a Microsoft Signer Certificate and Windows Component EKU. On Windows systems with the optional WSL component enabled, this core driver is called Lxss.sys, and serves as a stub driver until another driver. LxCore.sys loads a bit later and takes over the Pico provider responsibilities by transferring the various dispatch tables over to itself. Additionally, note that at the time of this writing, only one such core driver can register itself as a Pico provider.

When a Pico provider calls the registration API, it receives a set of function pointers, which allow it to

create and manage Pico processes:

- ■ One function to create a Pico process and one to create a Pico thread.
■ One function to get the context (an arbitrary pointer that the provider can use to store specific
data) of a Pico process, one to set it, and another pair of functions to do the same for Pico
threads. This will populate the Pi coContext field in ETHEAD and/or EPROCESS.
■ One function to get the CPU context structure (CONTEXT) of a Pico thread and one to set it.
■ A function to change the FS and/or GS segments of a Pico thread, which are normally used by
user-mode code to point to some thread local structure (such as the TEB on Windows).
■ One function to terminate a Pico thread and one to do the same to a Pico process.
■ One function to suspend a Pico thread and one to resume it.
As you can see, through these functions, the Pico provider can now create fully custom processes and

threads for whom it controls the initial starting state, segment registers, and associate data. However,

this alone would not allow the ability to emulate another operating system. A second set of function

pointers is transferred, this time from the provider to the kernel, which serve as callbacks whenever

certain activities of interest will be performed by a Pico thread or process.

- • A callback whenever a Pico thread makes a system call using the SYSCALL instruction

• A callback whenever an exception is raised from a Pico thread
CHAPTER 3 Processes and jobs 121


---

- ■ A callback whenever a fault during a probe and lock operation on a memory descriptor list (MDL) occurs inside a Pico thread

■ A callback whenever a caller is requesting the name of a Pico process

■ A callback whenever Event Tracing for Windows (ETW) is requesting the user-mode stack trace

of a Pico process

■ A callback whenever an application attempts to open a handle to a Pico process or Pico thread

■ A callback whenever someone requests the termination of a Pico process

■ A callback whenever a Pico thread or Pico process terminates unexpectedly
Additionally, a Pico provider also leverages Kernel Patch Protection (KPP), described in Chapter 7,

to both protect its callbacks and system calls as well as prevent fraudulent or malicious Pico providers

from registering on top of a legitimate Pico provider.

It now becomes clear that with such unparalleled access to any possible user-kernel transition or visible kernel-user interactions between a Pico process/thread and the world, it can be fully encapsulated by a Pico provider (and relevant user-mode libraries) to wrap a completely different kernel implementation than that of Windows (with some exceptions, of course, as thread scheduling rules and memory management rules, such as commit, still apply). Correctly written applications are not supposed to be sensitive to such internal algorithms, as they are subject to change even within the operating system they normally execute on.

Therefore, Pico providers are essentially custom-written kernel modules that implement the necessary callbacks to respond to the list of possible events (shown earlier) that a Pico process can cause to arise. This is how WSL is capable of running unmodified Linux ELF binaries in user-mode, limited only by the completeness of its system call emulation and related functionality.

To complete the picture on regular NT processes versus minimal processes versus Pico processes, we present Figure 3-8, showing the different structures for each.

![Figure](figures/Winternals7thPt1_page_139_figure_005.png)

---

## Trustlets (secure processes)

As covered in Chapter 2, Windows contains new virtualization-based security (VBS) features such as Device Guard and Credential Guard, which enhance the safety of the operating system and user data by leveraging the hypervisor. We saw how one such feature, Credential Guard (which is discussed at length in Chapter 7), runs in a new Isolated User Mode environment, which, while still unprivileged (ring 3), has a virtual trust level of 1 (VTL 1), granting it protection from the regular VTL 0 world in which both the NT kernel (ring 0) and applications (ring 3) live. Let's investigate how the kernel sets up such processes for execution, and the various data structures such processes use.

## Trustlet structure

To begin with, although Trustlets are regular Windows Portable Executables (PE) files, they contain some IUM-specific properties:

- ■ They can import only from a limited set of Windows system DLLs (CC/C++ Runtime, KernelBase,
Advapi, RPC Runtime, CNG Base Crypto, and NTDLL) due to the restricted number of system
calls that are available to Trustlets. Note that mathematical DLLs that operate only on data
structures (such as NTLM, ASN1, etc.) are also usable, as they don't perform any system calls.
■ They can import from an IUM-specific system DLL that is made available to them, called
Iumbase, which provides the Base IUM System API, containing support for mailslots, storage
boxes, cryptography, and more. This library ends up calling into lundll.dll, which is the VTL 1
version of Ntdll.dll, and contains secure system calls (system calls that are implemented by the
Secure Kernel, and not passed on to the Normal VTL 0 Kernel).
■ They contain a PE section named .tpb1-cv with an exported global variable named
s_IumPol1cycMetadata. This serves as metadata for the Secure Kernel to implement policy
settings around permitting VTL 0 access to the Trustlet (such as allowing debugging, crash
dump support, etc).
■ They are signed with a certificate that contains the Isolated User Mode EKU (1.3.6.1.4.1.311.10.3.37).
Figure 3-9 shows the certificate data for Lsalso.exe, showing its IUM EKU.
Additionally, Trustlets must be launched by using a specific process attribute when using


CreateProcess—both to request their execution in IUM as well as to specify launch properties.


We will describe both the policy metadata and the process attributes in the following sections.

---

![Figure](figures/Winternals7thPt1_page_141_figure_000.png)

FIGURE 3-9 Trustlet EKU in the certificate.

## Trustlet policy metadata

The policy metadata includes various options for configuring how "accessible" the Trustlet will be from VTL 0. It is described by a structure present at the $_iumPolicyMetadata export mentioned earlier, and contains a version number (currently set to 1) as well as the Trustlet ID, which is a unique number that identifies this specific Trustlet among the ones that are known to exist (for example, BioIso.exe is Trustlet ID 4). Finally, the metadata has an array of policy options. Currently, the options listed in Table 3-4 are supported. It should be obvious that as these policies are part of the signed executable data, attempting to modify them would invalidate the IUM signature and prohibit execution.

TABLE 3-4 Trustlet policy options

<table><tr><td>Policy</td><td>Meaning</td><td>More Information</td></tr><tr><td>ETW</td><td>Enables or Disables ETW</td><td></td></tr><tr><td>Debug</td><td>Configures debugging</td><td>Debug can be enabled at all times, only when SecureBoot is disabled, or using an on-demand challenge/response mechanism.</td></tr><tr><td>Crash Dump</td><td>Enables or disables crash dump</td><td></td></tr><tr><td>Crash Dump Key</td><td>Specifies Public Key for Encrypting Crash Dump</td><td>Dumps can be submitted to Microsoft Product Team, which has the private key for decryption</td></tr><tr><td>Crash Dump GUID</td><td>Specifies identifier for crash dump key</td><td>This allows multiple keys to be used/identified by the product team.</td></tr></table>


124   CHAPTER 3   Processes and jobs


---

TABLE 3-4   Trustlet policy options (continued)

<table><tr><td>Policy</td><td>Meaning</td><td>More Information</td></tr><tr><td>Parent Security Descriptor</td><td>SDDL format</td><td>This is used to validate that the owner/parent process is expected.</td></tr><tr><td>Parent Security Descriptor Revision</td><td>SDDL format revision ID</td><td>This is used to validate that the owner/parent process is expected.</td></tr><tr><td>SVN</td><td>Security version</td><td>This is a unique number that can be used by the Trustlet (along its identity) when encrypting AES256/GCM messages.</td></tr><tr><td>Device ID</td><td>Secure device PCI identifier</td><td>The Trustlet can only communicate with a Secure Device whose PCI ID matches.</td></tr><tr><td>Capability</td><td>Enables powerful VTL 1 capabilities</td><td>This enables access to the Create Secure Section API, DMA and user-mode MMIO access to Secure Devices, and Secure Storage APIs.</td></tr><tr><td>Scenario ID</td><td>Specifies the scenario ID for this binary</td><td>Encoded as a GUID, this must be specified by Trustlets when creating secure image sections to ensure it is for a known scenario.</td></tr></table>


## Trustlet attributes

Launching a Trustlet requires correct usage of the PS_CP_SECURE_PROCESS attribute, which is first used to authenticate that the caller truly wants to create a Trustlet, as well as to verify that the Trustlet the caller thinks its executing is actually the Trustlet being executed. This is done by embedding a Trustlet identifier in the attribute, which must match the Trustlet ID contained in the policy metadata. Then, one or more attributes can be specified, which are shown in Table 3-5.

TABLE 3-5 Trustlet attributes

<table><tr><td>Attribute</td><td>Meaning</td><td>More information</td></tr><tr><td>Mailbox Key</td><td>Used to retrieve mailbox data</td><td>Mailbox allow the Trustlet to share data with the VTL 0 world as long as the Trustlet key is known.</td></tr><tr><td>Collaboration ID</td><td>Sets the collaboration ID to use when using the Secure Storage IUM API</td><td>Secure Storage allows Trustlets to share data among each other, as long as they have the same collaboration ID. If no collaboration ID is present, the Trustlet instance ID will be used instead.</td></tr><tr><td>TK Session ID</td><td>Identifies the session ID used during Crypto</td><td></td></tr></table>


## System built-in Trustlets

At the time of this writing, Windows 10 contains five different Trustlets, which are identified by their identity numbers. They are described in Table 3-6. Note that Trustlet ID 0 represents the Secure Kernel itself.

---

TABLE 3-6 Built-in Trustlets

<table><tr><td>Binary Name (Trustlet ID)</td><td>Description</td><td>Policy Options</td></tr><tr><td>Lsalo.exe (1)</td><td>Credential and Key Guard Trustlet</td><td>Allow ETW, Disable Debugging, Allow Encrypted Crash Dump</td></tr><tr><td>Vmsp.exe (2)</td><td>Secure Virtual Machine Worker (vTPM Trustlet)</td><td>Allow ETW, Disable Debugging, Disable Crash Dump, Enable Secure Storage Capability, Verify Parent Security Descriptor is 5-1-5-83-0 (NT VIRTUAL MACHINE/Virtual Machines)</td></tr><tr><td>Unknown (3)</td><td>vTPM Key Enrollment Trustlet</td><td>Unknown</td></tr><tr><td>Biolso.exe (4)</td><td>Secure Biometrics Trustlet</td><td>Allow ETW, Disable Debugging, Allow Encrypted Crash Dump</td></tr><tr><td>Fsiso.exe (5)</td><td>Secure Frame Server Trustlet</td><td>Disable ETW, Allow Debugging, Enable Create Secure Section Capability, Use Scenario ID (AE53FCF6-8D89-4488-9D2E-4D00873TC5FD)</td></tr></table>


## Trustlet identity

Trustlets have multiple forms of identity that they can use on the system:

- ■  Trustlet identifier or Trustlet ID   This is a hard-coded integer in the Trustlet's policy metada-
ta, which also must be used in the Trustlet process-creation attributes. It ensures that the system
knows there are only a handful of Trustlets, and that the callers are launching the expected one.

■  Trustlet instance  This is a cryptographically secure 16-byte random number generated by
the Secure Kernel. Without the use of a collaboration ID, the Trustlet instance is what's used to
guarantee that Secure Storage APIs will only allow this one instance of the Trustlet to get/put
data into its storage blob.

■  Collaboration ID  This is used when a Trustlet would like to allow other Trustlets with the
same ID, or other instances of the same Trustlet, to share access to the same Secure Storage
blob. When this ID is present, the instance ID of the Trustlet will be ignored when calling the
Get or Put APIs.

■  Security version (SVN)  This is used for Trustlets that require strong cryptographic proof of
provenance of signed or encrypted data. It is used when encrypting AES256/GCM data by
Credential and Key Guard, and is also used by the Cryptograph Report service.

■  Scenario ID  This is used for Trustlets that create named (identity-based) secure kernel ob-
jects, such as secure sections. This GUID validates that the Trustlet is creating such objects as
part of a predetermined scenario, by tagging them in the namespace with this GUID. As such,
other Trustlets wishing to open the same named objects would thus have to have the same sce-
nario ID. Note that more than one scenario ID can actually be present, but no Trustlets currently
use more than one.
---

Isolated user-mode services

The benefits of running as a Trustlet not only include protection from attacks from the normal (VTL0) world, but also access to privileged and protected secure system calls that are only offered by the Secure Kernel to Trustlets. These include the following services:

• Secure Devices (IumCreateSecureDevice,IumDmaMapMemory,IumGetDmaEnabled,IumMapSecureIo,IumProtectSecureIo,IumQuerySecureDeviceInformation,IopUmapSecureIO, IumUpdateSecureDeviceState) These provide access to secure ACPI and/or PCI devices, which cannot be accessed from VTL 0 and are exclusively owned by the Secure Kernel (and its ancillary Secure HAL and Secure PCI services). Trustlets with the relevant capabilities (see the “Trustlet policy metadata” section earlier in this chapter) can map the registers of such a device in VTL 1 LUM, as well as potentially perform Direct Memory Access (DMA) transfers. Additionally, Trustlets can serve as user-mode devices drivers for such hardware by using the Secure Device Fabrication (SDF) located in SDFHost.dll. or Webcam/Fingerprint Sensors (over ACPI). • Secure Sections (IumCreateSecureSection,IumFlushSecureSectionBuffer,IumGetExposedSecureSection,IumOpenSecureSection) These provide the ability to both share physical pages with a VTL 0 driver (which would use Vs1CreateSecureSection) and used secure sections as well as share data solely within VTL 1 as named secured sections (the “Trustlet identity” section) with other Trustlets or other instances of the same Trustlet. Trustlets require the Secure Section described in the “Trustlet policy metadata” section to use these features. • Mailboxes (IumPostMailbox) This enables a Trustlet to share up to about up to 4 KB of data with a component in the normal (VTL 0) kernel, which can call Vs1RetrieveMailbox passing in the slot number and secret mailbox key. For example, Vds.sys on Vts 0 uses this to retrieve various secrets used by the vTPM feature from the Vnsp.exe Trustlet. • Identity Keys (IumGetIdk) This allows a Trustlet to obtain either a unique identifying decryption key or signing key. It is an essential part of the Credential Guard feature to uniquely authenticate the machine and that credentials are from IUM. • Cryptographic Services (IumCrypto) This allows a Trustlet to encrypt data with a local and/or per-boot session key generated by the Secure Kernel that is only available to IUM, to obtain a TPM binding handle, to get the FIPS mode of the Secure Kernel for IUM. It also enables a Random number generator (RNG) seed only generated by the Secure Kernel for IUM and the SVN of the Trustlet, a dump of its policy metadata, whether or not it was ever attached to a debugger, and any other Trustlet-controlled data requested. This can be used as a sort of TPM-like measurement of the Trustlet to prove that it was not tampered with.

CHAPTER 3 Processes and jobs 127


---

- ■ Secure Storage (IumSecureStorageGet, IumSecureStoragePut) This allows Trustlets that

have the Secure Storage capability (described earlier in the "Trustlet policy metadata" section)

to store arbitrarily sized storage blobs and to later retrieve them, either based on their unique

Trustlet instance or by sharing the same collaboration ID as another Trustlet.
## Trustlet-accessible system calls

As the Secure Kernel attempts to minimize its attack surface and exposure, it only provides a subset (less than 50) of all of the hundreds of system calls that a normal (VTL0) application can use. These system calls are the strict minimum necessary for compatibility with the system DLLs that Trustlets can use (refer to the section "Trustlet structure" to see these), as well as the specific services required to support the RPC runtime (Rpcrt4.dll) and ETW tracing.

- ■ Worker Factory and Thread APIs These support the Thread Pool API (used by RPC) and TLS
Slots used by the Loader.
■ Process Information API This supports TLS Slots and Thread Stack Allocation.
■ Event, Semaphore, Wait, and Completion APIs These support Thread Pool and
Synchronization.
■ Advanced Local Procedure Call (ALPC) APIs These support Local RPC over the ncalrpc
transport.
■ System Information API This supports reading Secure Boot information, basic and NUMA
system information for Kernel32.dll and Thread Pool scaling, performance, and subsets of time
information.
■ Token API This provides minimal support for RPC impersonation.
■ Virtual Memory Allocation APIs These support allocations by the User-Mode Heap
Manager.
■ Section APIs These support the Loader (for DLL Images) as well as the Secure Section
functionality (once created/exposed through secure system calls shown earlier).
■ Trace Control API This supports ETW.
■ Exception and Continue API This supports Structured Exception Handling (SEH).
It should be evident from this list that support for operations such as Device I/O, whether on files or actual physical devices, is not possible (there is no CreateFile API, to begin with), as is also the case for Registry I/O. Nor is the creation of other processes, or any sort of graphics API usage (there is no Win32k.sys driver in VTL 1). As such, Trustlets are meant to be isolated workhorse back-ends (in VTL 1) of their complex front-ends (in VTL 0), having only ALPC as a communication mechanism, or exposed secure sections (whose handle would have to had been communicated to them through ALPC). In

Chapter 7 (Security), we'll look in more detail into the implementation of a specific Trustlet—Lsalo.exe, which provides Credential and Key Guard.

---

### Experiment: Identifying secure processes

Secure processes, other than being known by their name, can be identified in the kernel debugger in two ways. First, each secure process has a secure PID, which represents its handle in the Secure Kernel's handle table. This is used by the normal (VTL0) kernel when creating threads in the process or requesting its termination. Secondly, the threads themselves have a thread cookie associated with them, which represents their index in the Secure Kernel's thread table.

You can try the following in a kernel debugger:

```bash
!kdt :!for_each_process .if @(((nt!\_EPROCESS*)@{#Process})->Pcb.SecurePid) {
  .prio: "Trustlet: %ma (%p) \n", @(((nt!\_EPROCESS*)@{#Process})->ImageFileName),
@Process }
Trustlet: Secure System (ffff9b0d8c79080)
Trustlet: Lsalso.exe (ffff9b09e2ba9640)
Trustlet: BioIso.exe (ffff9b09e61c4640)
!kdt -dt nt!\_EPROCESS ffff9b09d8c79080 Pcb.SecurePid
    +0x000 Pcb      :
    +0x2d0 SecurePid   :  0x00000001'40000004
!kdt -dt nt!\_EPROCESS ffff9b09e2ba9640 Pcb.SecurePid
    +0x000 Pcb      :
    +0x2d0 SecurePid   :  0x00000001'40000030
!kdt -dt nt!\_EPROCESS ffff9b09e61c4640 Pcb.SecurePid
    +0x000 Pcb      :
    +0x2d0 SecurePid   :  0x00000001'40000080
!kdt -iprocess ffff9b09e2ba9640 4
PROCESS ffff9b09e2ba9640
    SessionId: 0 Cid: 0388    Pcb: Gcdc62b000 ParentCid: 0328
        DirBase: F2F54000  ObjectTable: ffffc607b59b1040  HandleCount: 44.
        Image: Lsalso.exe
            THREAD ffff9b09e2ba2080  Cid 0388.038c  Teb: 0000006cdc62c000 Win32Thread:
            0000000000000 WAIT
!kdt -dt nt!\_ETHREAD ffff9b09e2ba2080 Tcb.SecureThreadCookie
    +0x000 Tcb      :
    +0x31c SecureThreadCookie    :  9
```

## Flow of CreateProcess

We've shown the various data structures involved in process-state manipulation and management and how various tools and debugger commands can inspect this information. In this section, we'll see how and when those data structures are created and filled out, as well as the overall creation and termination behaviors behind processes. As we've seen, all documented process-creation functions eventually end up calling CreateProcessInternalW, so this is where we start.

Creating a Windows process consists of several stages carried out in three parts of the operating system:

the Windows client-side library Kernel32.dll (the real work starting with CreateProcessInternalW), the

Windows executive, and the Windows subsystem process (CSSR). Because of the multiple-environment

subsystem architecture of Windows, creating an executive process object (which other subsystems can

CHAPTER 3 Processes and jobs     129


---

use) is separated from the work involved in creating a Windows subsystem process. So, although the following description of the flow of the Windows CreateProcess function is complicated, keep in mind that part of the work is specific to the semantics added by the Windows subsystem as opposed to the core work needed to create an executive process object.

The following list summarizes the main stages of creating a process with the Windows CreateProcess>

functions. The operations performed in each stage are described in detail in the subsequent sections.

![Figure](figures/Winternals7thPt1_page_147_figure_002.png)

Note Many steps of CreateProcess are related to the setup of the process virtual address space and therefore refer to many memory-management terms and structures that are defined in Chapter 5.

- 1. Validate parameters; convert Windows subsystem flags and options to their native counter-
parts; parse, validate, and convert the attribute list to its native counterpart.

2. Open the image file (.exe) to be executed inside the process.

3. Create the Windows executive process object.

4. Create the initial thread (stack, context, and Windows executive thread object).

5. Perform post-creation, Windows subsystem-specific process initialization.

6. Start execution of the initial thread (unless the CREATE_SUSPENDED flag was specified).

7. In the context of the new process and thread, complete the initialization of the address space
(for example, load required DLLs) and begin execution of the program's entry point.
Figure 3-10 shows an overview of the stages Windows follows to create a process.

![Figure](figures/Winternals7thPt1_page_147_figure_006.png)

FIGURE 3-10 The main stages of process creation.

130    CHAPTER 3   Processes and jobs


---

## Stage 1: Converting and validating parameters and flags

Before opening the executable image to run, CreateProcessInternalW performs the following steps:

1. The priority class for the new process is specified as independent bits in the CreationFlags parameter to the CreateProcess* functions. Thus, you can specify more than one priority class for a single CreateProcess* call. Windows resolves the question of which priority class to assign to the process by choosing the lowest-priority class set.

There are six process priority classes defined, each value mapped to a number:

- • Idle or Low, as Task Manager displays it (4)

• Below Normal (6)

• Normal (8)

• Above Normal (10)

• High (13)

• Real-time (24)
The priority class is used as the base priority for threads created in that process. This value does

not directly affect the process itself—only the threads inside it. A description of process priority

class and its effects on thread scheduling appears in Chapter 4.

2. If no priority class is specified for the new process, the priority class defaults to Normal. If a

Real-time priority class is specified for the new process and the process's caller doesn't have the

Increase Scheduling Priority privilege (SE_INC_BASE_PRIORITY_NAME), the High priority class is

used instead. In other words, process creation doesn't fail just because the caller has insufficient

privileges to create the process in the Real-time priority class; the new process just won't have

as high a priority as Real-time.

3. If the creation flags specify that the process will be debugged, Kernel32 initiates a connection

to the native debugging code in Ntidll.dll by calling DbgUiConnectT oDbg and gets a handle to

the debug object from the current thread's environment block (TEB).

4. Kernel32.dll sets the default hard error mode if the creation flags specified one.

5. The user-specified attribute list is converted from Windows subsystem format to native format

and internal attributes are added to it. The possible attributes that can be added to the attribute

list are listed in Table 3-7, including their documented Windows API counterparts, if any.

![Figure](figures/Winternals7thPt1_page_148_figure_010.png)

Note The attribute list passed on CreateProcess* calls permits passing back to the caller information beyond a simple status code, such as the TEB address of the initial thread or information on the image section. This is necessary for protected processes because the parent cannot query this information after the child is created.

---

TABLE 3-7 Process attributes

<table><tr><td>Native Attribute</td><td>Equivalent Win32 Attribute</td><td>Type</td><td>Description</td></tr><tr><td>PS_CP_PARENT_PROCESS</td><td>PROC_THREAD_ATTRIBUTE_PARENT_PROCESS. Also used when elevating.</td><td>Input</td><td>Handle to the parent process.</td></tr><tr><td>PS_CP_DEBUG_OBJECT</td><td>N/A. Used when using DEBUG_PROCESS as a flag.</td><td>Input</td><td>Debug object if process is being started debugged.</td></tr><tr><td>PS_CP_PRIMARY_TOKEN</td><td>N/A. Used when using CreateProcessAsUser/WithToken.</td><td>Input</td><td>Process token if CreateProcessAsUser was used.</td></tr><tr><td>PS_CP_CLIENT_ID</td><td>N/A. Returned by Win32 API as a parameter (PROCESS_INFORMATION).</td><td>Output</td><td>Returns the TID and PID of the initial thread and the process.</td></tr><tr><td>PS_CP_TEB_ADDRESS</td><td>N/A. Internally used and not exposed.</td><td>Output</td><td>Returns the address of the TEB for the initial thread.</td></tr><tr><td>PS_CP_FILENAME</td><td>N/A. Used as a parameter in CreateProcess APIs.</td><td>Input</td><td>The name of the process that should be created.</td></tr><tr><td>PS_CP_IMAGE_INFO</td><td>N/A. Internally used and not exposed.</td><td>Output</td><td>Returns SECTION_IMAGE_INFORMATION, which contains information on the version, flags, and subsystems of the executable, as well as the stack size and entry point.</td></tr><tr><td>PS_CP_MEMreserve</td><td>N/A. Internally used by SMS5 and CSRSS.</td><td>Input</td><td>An array of virtual memory reservations that should be made during initial process address space creation, always guaranteed availability because no other allocations have taken place yet.</td></tr><tr><td>PS_CP_PRIORITY_CLASS</td><td>N/A. Passed in as a parameter to the CreateProcess API.</td><td>Input</td><td>Priority class that the process should be given.</td></tr><tr><td>PS_CP_ERROR_MODE</td><td>N/A. Passed in through the CREATE_DEFAULT_ERROR_MODE flag.</td><td>Input</td><td>Hard error-processing mode for the process.</td></tr><tr><td>PS_CP_STD_HANDLE_INFO</td><td>None. Used internally.</td><td>Input</td><td>Specifies whether standard handles should be duplicated or new handles should be created.</td></tr><tr><td>PS_CP_HANDLE_LIST</td><td>PROC_THREAD_ATTRIBUTE_HANDLE_LIST</td><td>Input</td><td>A list of handles belonging to the parent process that should be inherited by the new process.</td></tr><tr><td>PS_CP_GROUP_AFFINITY</td><td>PROC_THREAD_ATTRIBUTE_group_AFFINITY</td><td>Input</td><td>Processor group(s) the thread should be allowed to run on.</td></tr><tr><td>PS_CP_PREFERRED_NODE</td><td>PROC_THREAD_ATTRIBUTES_PREFERRED_NODE</td><td>Input</td><td>The preferred (ideal) NUMA node that should be associated with the process. It affects the node on which the initial process heap and thread stack will be created (see Chapter 5).</td></tr><tr><td>PS_CP_IDEAL_PROCESSOR</td><td>PROC_THREAD_ATTRIBUTE_ID_EAL_PROCESSOR</td><td>Input</td><td>The preferred (ideal) processor that the thread should be scheduled on.</td></tr><tr><td>PS_CP_UMS_THREAD</td><td>PROC_THREAD_ATTRIBUTE_UMS_THREAD</td><td>Input</td><td>Contains the UMS attributes, completion list, and context.</td></tr></table>


132   CHAPTER 3   Processes and jobs


---

<table><tr><td>PS_CP_MITIGATION_OPTIONS</td><td>PROC_THREAD_MITIGATION_POLICY</td><td>Input</td><td>Contains information on which miti-gations (SEHOP, ATL Emulation, NX) should be enabled/disabled for the process.</td></tr><tr><td>PS_CP_PROTECTION_LEVEL</td><td>PROC_THREAD_ATTRIBUTE_PROTECTION_LEVEL</td><td>Input</td><td>Must point to one of the allowed process protection values shown in Table 3-1 or the value PROTECT_LEVEL_SAME to indicate the same protection level as the parent.</td></tr><tr><td>PS_CP_SECURE_PROCESS</td><td>None. Used internally.</td><td>Input</td><td>Indicates the process should run as an Isolated User Mode (IUM) Trustlet. See Chapter 8 in Part 2 for more details.</td></tr><tr><td>PS_CP_JOB_LIST</td><td>None. Used internally.</td><td>Input</td><td>Assigns the process to a list of jobs.</td></tr><tr><td>PS_CP_CHILD_PROCESS_POLICY</td><td>PROC_THREAD_ATTRIBUTE_CHILD_PROCESS_POLICY</td><td>Input</td><td>Specifies whether the new process is allowed to create child processes, either directly or indirectly (such as by using WMJ).</td></tr><tr><td>PS_CP_ALL_APPLICATION_PACKAGES_POLICY</td><td>PROC_THREAD_ATTRIBUTE_ALL_APPLICATION_PACKAGES_POLICY</td><td>Input</td><td>Specifies if the AppContainer token should be excluded from ACL checks that include the ALL APPLICATION PACKAGES group. The ALL RESTRICTED APPLICATION PACKAGES group will be used in-stead.</td></tr><tr><td>PS_CP_WIN32K_FILTER</td><td>PROC_THREAD_ATTRIBUTE_WIN32K_FILTER</td><td>Input</td><td>Indicates if the process will have many of its GDI/USER system calls to Win32k.sys filtered out (blocked), or if they will be permitted but audited. Used by a Microsoft Edge browser to reduce attack chance.</td></tr><tr><td>PS_CP_SAFE_OPEN_PROMPT_ORIGIN_CLAIM</td><td>None. Used internally.</td><td>Input</td><td>Used by the Mark of the Web functionality to indicate the file came from an untrusted source.</td></tr><tr><td>PS_CP_BNO_ISOLATION</td><td>PROC_THREAD_ATTRIBUTE_BNO_ISOLATION</td><td>Input</td><td>Causes the primary token of the pro-cess to be associated with an isolated BaseNamedObjects directory. (See Chapter 8 in Part 2 for more information on named objects.)</td></tr><tr><td>PS_CP_DESKTOP_APP_POLICY</td><td>PROC_THREAD_ATTRIBUTE_DESKTOP_APP_POLICY</td><td>Input</td><td>Indicates if the modern application will be allowed to launch legacy desktop applications, and if so, in what way.</td></tr><tr><td>None—used internally</td><td>PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES</td><td>Input</td><td>Specifies a pointer to a SECURITY_CAPABILITIES structure, which is used to create the AppContainer token for the process before calling NtCreateUserProcess.</td></tr></table>


6. If the process is part of a job object, but the creation flags requested a separate virtual DOS machine (VDM), the flag is ignored.

CHAPTER 3 Processes and jobs 133


---

- 7. The security attributes for the process and initial thread that were supplied to the CreateProcess
function are converted to their internal representation (OBJECT_ATTRIBUTES structures, docu-
mented in the WDK).

8. CreateProcessInternalW checks whether the process should be created as modern. The
process is to be created modern if specified so by an attribute (PROC_THREAD_ATTRIBUTE_
PACKAGE_FULL_NAME) with the full package name or the creator is itself modern (and a parent
process has not been explicitly specified by the PROC_THREAD_ATTRIBUTE_PARENT_PROCESS
attribute). If so, a call is made to the internal BaseAppExtension to gather more contextual
information on the modern app parameters described by a structure called APPX_PROCESS_
CONTEXT. This structure holds information such as the package name (internally referred to as
package moniker), the capabilities associated with the app, the current directory for the process,
and whether the app should have full trust. The option of creating full trust modern apps is not
publicly exposed, and is reserved for apps that have the modern look and feel but perform system-
level operations. A canonical example is the Settings app in Windows 10 (SystemSettings.exe).

9. If the process is to be created as modern, the security capabilities (if provided by PROC_THREAD_
ATTRIBUTE_SECURITY_CAPABILITIES) are recorded for the initial token creation by calling the
internal BaseAppCreateLowBox function. The term LowBox refers to the sandbox (AppContainer)
under which the process is to be executed. Note that although creating modern processes by
directly calling CreateProcess is not supported (instead, the COM interfaces described earlier
should be used), the Windows SDK and MSDN do document the ability to create AppContainer
legacy desktop applications by passing this attribute.

10. If a modern process is to be created, then a flag is set to indicate to the kernel to skip embedded
manifest detection. Modern processes should never have an embedded manifest as it's simply
not needed. (A modern app has a manifest of its own, unrelated to the embedded manifest
referenced here.)

11. If the debug flag has been specified (DEBUG_PROCESS), then the Debugger value under the Image
File Execution Options registry key (discussed in the next section) for the executable is marked to
be skipped. Otherwise, a debugger will never be able to create its debugger process because the
creation will enter an infinite loop (trying to create the debugger process over and over again).

12. All windows are associated with desktops, the graphical representation of a workspace. If no
desktop is specified in the STARTUPINFO structure, the process is associated with the caller's
current desktop.
![Figure](figures/Winternals7thPt1_page_151_figure_001.png)

Note The Windows 10 Virtual Desktop feature does not use multiple desktop objects (in the kernel object sense). There is still one desktop, but windows are shown and hidden as required. This is in contrast to the Systrans Desktops.exe tool, which really creates up to four desktop objects. The difference can be felt when trying to move a window from one desktop to another. In the case of desktops.exe, it can't be done, as such an operation is not supported in Windows. On the other hand, Windows 10's Virtual Desktop allows it, since there is no real "moving" going on.

---

- 13. The application and command-line arguments passed to CreateProcessInternalW are

analyzed. The executable path name is converted to the internal NT name (for example,

c:\temp\a.exe turns into something like \device\harddiskvolume1\temp\a.exe) because some

functions require it in that format.

14. Most of the gathered information is converted to a single large structure of type RTL_USER-

PROCESS_PARAMETERS.
Once these steps are completed, CreateProcessInternalW performs the initial call to NtCreate UserProcess to attempt creation of the process. Because Kernel32.dll has no idea at this point whether

the application image name is a real Windows application or a batch file (.bat or .cmd), 16-bit, or DOS

application, the call might fail, at which point CreateProcessInternalW looks at the error reason and

attempts to correct the situation.

## Stage 2: Opening the image to be executed

At this point, the creating thread has switched into kernel mode and continues the work within the

NTCreateUserProcess system call implementation.

- 1. NtCreateUserProcess first validates arguments and builds an internal structure to hold all
creation information. The reason for validating arguments again is to make sure the call to the
executive did not originate from a hack that managed to simulate the way Ntdll.dll makes the
transition to the kernel with bogus or malicious arguments.

2. As illustrated in Figure 3-11, the next stage in NtCreateUserProcess is to find the appropriate
Windows image that will run the executable file specified by the caller and to create a section
object to later map it into the address space of the new process. If the call fails for any reason, it
returns to CreateProcessInternalW with a failure state (look ahead to Table 3-8) that causes
CreateProcessInternalW to attempt execution again.
![Figure](figures/Winternals7thPt1_page_152_figure_005.png)

FIGURE 3-11 Choosing a Windows image to activate.

CHAPTER 3 Processes and jobs     135


---

3. If the process needs to be created protected, it also checks the signing policy.

4. If the process to be created is modern, a licensing check is done to make sure it's licensed and allowed to run. If the app is ipx (preinstalled with Windows), it's allowed to run regardless of license. If sideloading apps is allowed (configured through the Settings app), then any signed app can be executed, not just from the store.

5. If the process is a Trustlet, the section object must be created with a special flag that allows the secure kernel to use it.

6. If the executable file specified is a Windows EXE, NtCreateUserProcess tries to open the file

and create a section object for it. The object isn't mapped into memory yet, but it is opened.

Just because a section object has been successfully created doesn't mean the file is a valid Win dows image, however. It could be a DLL or a POSIX executable. If the file is a POSIX executable,

the call fails, because POSIX is no longer supported. If the file is a DLL, CreateProcessInternalW

fails as well.

7. Now that NtCreateUsIerProcess has found a valid Windows executable image, as part of the process creation code described in the next section, it looks in the registry under HKLM\ SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options to see whether a subkey with the file name and extension of the executable image (but without the directory and path information—for example, Notepad.exe) exists there. If it does, PspAllocateProcess looks for a value named Debugger for that key. If this value is present, the image to be run becomes the string in that value and CreateProcessInternal restarts at stage 1.

![Figure](figures/Winternals7thPt1_page_153_figure_005.png)

Tip You can take advantage of this process-creation behavior and debug the startup code of Windows services processes before they start rather than attach the debugger after starting a service, which doesn't allow you to debug the startup code.

8. On the other hand, if the image is not a Windows EXE (for example, if it's an MS-DOS or a Win16 application), CreateProcessInternalW goes through a series of steps to find a Windows support image to run it. This process is necessary because non-Windows applications aren't run directly. Windows instead uses one of a few special support images that, in turn, are responsible for actually running the non-Windows program. For example, if you attempt to run an MS-DOS or a Win16 executable (32-bit Windows only), the image to be run becomes the Windows executable Ntvdam.exe. In short, you can't directly create a process that is not a Windows process. If Windows can't find a way to resolve the activated image as a Windows process (as shown in Table 3-8), CreateProcessInternalW fails.

---

TABLE 3-8 Decision tree for stage 1 of CreateProcess

<table><tr><td>If the Image...</td><td>Create State Code</td><td>This Image Will Run...</td><td>...and This Will Happen</td></tr><tr><td>Is an MS-DOS application with an .exe, .com, or .pif extension</td><td>PsCreateFailOnSectionCreate</td><td>Ntvdm.exe</td><td>CreateProcessInternalW restarts stage 1.</td></tr><tr><td>Is a Win64 application</td><td>PsCreateFailOnSectionCreate</td><td>Ntvdm.exe</td><td>CreateProcessInternalW restarts stage 1.</td></tr><tr><td>Is a Win64 application on a 32-bit system (or a PPC, MIPS, or Alpha binary)</td><td>PsCreateFailMachineMismatch</td><td>N/A</td><td>CreateProcessInternalW will fail.</td></tr><tr><td>Has a Debugger value with another image name</td><td>PsCreateFailExeName</td><td>Name specified in the Debugger value</td><td>CreateProcessInternalW restarts stage 1.</td></tr><tr><td>Is an invalid or damaged Windows EXE</td><td>PsCreateFailExeFormat</td><td>N/A</td><td>CreateProcessInternalW will fail.</td></tr><tr><td>Cannot be opened</td><td>PsCreateFailOnFileOpen</td><td>N/A</td><td>CreateProcessInternalW will fail.</td></tr><tr><td>Is a command procedure (application with a .bat or .cmd extension)</td><td>PsCreateFailOnSectionCreate</td><td>Cmd.exe</td><td>CreateProcessInternalW restarts Stage 1.</td></tr></table>


Specifically, the decision tree that CreateProcessInternalW goes through to run an image is as follows:

- • If it's x86 32-bit Windows, and the image is an MS-DOS application with an .exe, .com, or .pdf
extension, a message is sent to the Windows subsystem to check whether an MS-DOS sup-
port process (Ntvdm.exe, specified in the HKLM\SYSTEM\CurrentControlSet\Control\WOW\
cmdline registry value) has already been created for this session. If a support process has
been created, it is used to run the MS-DOS application. (The Windows subsystem sends the
message to the virtual DOS machine (VDM) process to run the new image.) Then Create-
ProcessInternalW returns. If a support process hasn't been created, the image to be run
changes to Ntvdm.exe and CreateProcessInternalW restarts at stage 1.

• If the file to run has a .bat or .cmd extension, the image to be run becomes Cmd.exe, the
Windows command prompt, and CreateProcessInternalW restarts at stage 1. (The name
of the batch file is passed as the second parameter to Cmd.exe after the /c switch.)

• For an x86 Windows system, if the image is a Win16 (Windows 3.1) executable, CreateProcess-
InternalW must decide whether a new VDM process must be created to run it or whether
it should use the default session-wide shared VDM process (which might not yet have been
created). The CreateProcess flags CREATE_SEPARATOR_LOW_VDM and CREATE_SHARED_LOW_
VDM control this decision. If these flags aren't specified, the HKLM\SYSTEM\CurrentControlSet\
Control\WOW\DefaultSeparateVDM registry value dictates the default behavior. If the
CHAPTER 3 Processes and jobs      137


---

application is to be run in a separate VDM, the image to be run changes to Ntvdm.exe followed by some configuration parameters and the 16-bit process name, and CreateProcessInternalW restarts at stage 1. Otherwise, the Windows subsystem sends a message to see whether the shared VDM process exists and can be used. (If the VDM process is running on a different desktop or isn't running under the same security as the caller, it can't be used, and a new VDM process must be created.) If a shared VDM process can be used, the Windows subsystem sends a message to it to run the new image and CreateProcessInternalW returns. If the VDM process hasn't yet been created (or if it exists but can't be used), the image to be run changes to the VDM support image and CreateProcessInternalW restarts at stage 1.

