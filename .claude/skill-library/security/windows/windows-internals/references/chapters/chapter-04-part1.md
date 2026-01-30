## CHAPTER 4 Threads

This chapter explains the data structures and algorithms that deal with threads and thread scheduling in Windows. The first section shows how to create threads. Then the internals of threads and thread scheduling are described. The chapter concludes with a discussion of thread pools.

### Creating threads

Before discussing the internal structures used to manage threads, let's take a look at creating threads from an API perspective to give a sense of the steps and arguments involved.

The simplest creation function in user mode is CreateThread. This function creates a thread in the

current process, accepting the following arguments:

- ■ An optional security attributes structure This specifies the security descriptor to attach to
the newly created thread. It also specifies whether the thread handle is to be created as inherit-
able. (Handle inheritance is discussed in Chapter 8, "System mechanisms," in Windows Internals
Part 2.)
■ An optional stack size If zero is specified, a default is taken from the executable's header.
This always applies to the first thread in a user-mode process. (Thread's stack is discussed
further in Chapter 5, "Memory management.")
■ A function pointer This serves as the entry point for the new thread's execution.
■ An optional argument This is to pass to the thread's function.
■ Optional flags One controls whether the thread starts suspended (CREATE_SUSPENDED). The
other controls the interpretation of the stack size argument (initial committed size or maximum
reserved size).
On successful completion, a non-zero handle is returned for the new thread and, if requested by the

caller, the unique thread ID.

An extended thread creation function is CreateRemoteThread. This function accepts an extra argument (the first), which is a handle to a target process where the thread is to be created. You can use this function to inject a thread into another process. One common use of this technique is for a debugger to force a break in a debugged process. The debugger injects the thread, which immediately causes

---

a breakpoint by calling the DebugBreak function. Another common use of this technique is for one

process to obtain internal information about another process, which is easier when running within the

target process context (for example, the entire address space is visible). This could be done for legiti mate or malicious purposes.

To make CreateRemoteThread work, the process handle must have been obtained with enough

access rights to allow such operation. As an extreme example, protected processes cannot be injected

in this way because handles to such processes can be obtained with very limited rights only.

The final function worth mentioning here is CreateRemoteThreadEx, which is a superset of CreateThread and CreateRemoteThread. In fact, the implementation of CreateThread and CreateRemoteThread simply calls CreateRemoteThreadEx with the appropriate defaults. CreateRemoteThreadEx adds the ability to provide an attribute list (similar to the STARTUPINFOX structure's role with an additional member over STARTUPINFO when creating processes). Examples of attributes include setting the ideal processor and group affinity (both discussed later in this chapter).

If all goes well, CreateRemoteThreadEx eventually calls NtCreateThreadEx in Ntidll.dll. This makes the usual transition to kernel mode, where execution continues in the executive function NtCreateThreadEx. There, the kernel mode part of thread creation occurs (described later in this chapter, in the "Birth of a thread" section).

Creating a thread in kernel mode is achieved with the PsCreateSystemThread function (documented in the WDK). This is useful for drivers that need independent work to be processes within the system process (meaning it's not associated with any particular process). Technically, the function can be used to create a thread under any process, which is less useful for drivers.

Exiting a kernel thread's function does not automatically destroy the thread object. Instead, drivers must call PsTerminateSystemThread from within the thread function to properly terminate the thread. Consequently, this function never returns.

## Thread internals

This section discusses the internal structures used within the kernel (and some in user mode) to manage a thread. Unless explicitly stated otherwise, you can assume that anything in this section applies to both user-mode threads and kernel-mode system threads.

### Data structures

At the operating-system (OS) level, a Windows thread is represented by an executive thread object. The executive thread object encapsulates an ETHEAD structure, which in turn contains a KTHREAD structure as its first member. These are illustrated in Figure 4-1 (ETHEAD) and Figure 4-2 (KTHREAD). The ETHREAD structure and the other structures it points to exist in the system address space. The only exception is the thread environment block (TEB), which exists in the process address space (similar to a PEB, because user-mode components need to access it).

---

![Figure](figures/Winternals7thPt1_page_212_figure_000.png)

FIGURE4-1 Important fields of the executive thread structure (ETHREAD).

![Figure](figures/Winternals7thPt1_page_212_figure_002.png)

FIGURE 4-2 Important fields of the kernel thread structure (KTHREAD).

The Windows subsystem process (Csrss) maintains a parallel structure for each thread created in

a Windows subsystem application, called the CSR_THREAD. For threads that have called a Windows

subsystem USER or GDI function, the kernel-mode portion of the Windows subsystem (Win32k.sys)

maintains a per-thread data structure (W32THREAD) that the KTHREAD structure points to.

CHAPTER 4  Threads      195


---

![Figure](figures/Winternals7thPt1_page_213_figure_000.png)

Note The fact that the executive, high-level, graphics-related, Win32k thread structure is

pointed to by KTHREAD instead of the ETHREAD appears to be a layer violation or oversight in

the standard kernel's abstraction architecture. The scheduler and other low-level components

do not use this field.

Most of the fields illustrated in Figure 4-1 are self-explanatory. The first member of the ETHEAD is

called Tcb. This is short for thread control block, which is a structure of type KTHREAD. Following that are

the thread identification information, the process identification information (including a pointer to the

owning process so that its environment information can be accessed), security information in the form

of a pointer to the access token and impersonation information, fields relating to Asynchronous Local

Procedure Call (ALPC) messages, pending I/O requests (IRPs) and Windows 10-specific fields related to

power management (described in Chapter 6, “I/O system”) and CPU Sets (described later in this chapter).

Some of these key fields are covered in more detail elsewhere in this book. For more details on the inter nal structure of an ETHEAD structure, you can use the kernel debugger dt command to display its format.

Let's take a closer look at two of the key thread data structures referred to in the preceding text: ETHOD and KTHREAD. The KTHREAD structure (which is the T cb member of the ETHREAD) contains information that the Windows kernel needs to perform thread scheduling, synchronization, and timekeeping functions.

EXPERIMENT: Displaying ETHREAD and KTHREAD structures

You can display the ETHEAD and KTHREAD structures with the dt command in the kernel debugger.

The following output shows the format of an ETHEAD on a 64-bit Windows 10 system:

```bash
!kd- dt nt_etthread
  +0x000 Tcb             : _KTHREAD
  +0x5d8 CreateTime        : _LARGE_INTEGER
  +0x5e0 ExitTime         : _LARGE_INTEGER
...  _
+0x7a0 EnergyValues    : Ptr64 _THREAD_ENERGY_VALUES
+0x7a8 CmCellReferences : Uint4B
+0x7b0 SelectedCpuSets : Uint8B
+0x7b0 SelectedCpuSetsIndirect : Ptr64 Uint8B
+0x7b8 S1to             : Ptr64 _EJOB
```

You can display the KTHREAD with a similar command or by typing dt !nt!_ETHREAD Tcb, as

shown in the experiment "Displaying the format of an EPROCESS structure" in Chapter 3, "Pro cesses and jobs."

```bash
!kd+ dt nt_lkthread
+0x000 Header        : _DISPATCHER_HEADER
  +0x018 SlistFaultAddress : Ptr64 Void
  +0x020 QuantumTarget   : Uint8B
  +0x028 InitialStack    : Ptr64 Void
  +0x030 StackLimit     : Ptr64 Void
  +0x038 StackBase     : Ptr64 Void
```

196   CHAPTER 4   Threads


---

```bash
+0x040 ThreadLock       : Uint8B
    +0x048 CycleTime        : Uint8B
    +0x050 CurrentRunTime  : Uint8B
  ...+0x5a0 ReadOperationCount : Int8B
    +0x5a8 WriteOperationCount : Int8B
    +0x5b0 OtherOperationCount : Int8B
    +0x5b8 ReadTransferCount : Int8B
    +0x5c0 WriteTransferCount : Int8B
    +0x5c8 OtherTransferCount : Int8B
    +0x5d0 QueuedScb        : Ptr64_!KSCB
```

## EXPERIMENT: Using the kernel debugger !thread command

The kernel debugger |thread command dumps a subset of the information in the thread data

structures. Some key elements of the information the kernel debugger displays can't be displayed

by any utility, including the following information:

- <table><tr><td>Internal structure addresses</td></tr><tr><td>Priority details</td></tr><tr><td>Stack information</td></tr><tr><td>The pending I/O request list</td></tr><tr><td>For threads in a wait state, the list of objects the thread is waiting for</td></tr></table>
To display thread information, use either the !process command (which displays all the threads of a process after displaying the process information) or the !thread command with the address of a thread object to display a specific thread.

Let's find all instances of explorer.exe:

```bash
!kb- !process 0 0 explorer.exe
PROCESS ffffe00017f3e7c0
    SessionId: 1  Cid: 0b7c   Peb: 00291000  ParentCid: 0c34
        DirBase: 19b264000  ObjectTable: ffffc00007268cc0  HandleCount: 2248.
        Image: explorer.exe
PROCESS ffffe00018c817c0
    SessionId: 1  Cid: 23b0   Peb: 00256000  ParentCid: 03f0
        DirBase: 2da4010000  ObjectTable: ffffc0001aef0480  HandleCount: 2208.
        Image: explorer.exe
```

We'll select one of the instances and show its threads:

```bash
!kb< !process fffffe00018c817c0 2
PROCESS fffffe00018c817c0
    SessionId: 1 Cid: 23b0    Peb: 00256000  ParentCid: 03f0
        DirBase: 2d4010000  ObjectTable: ffffc0001aef0480  HandleCount: 2232.
        Image: explorer.exe
```

CHAPTER 4    Threads      197

---

```bash
...
THREAD Ffffe0001ac3c080  Cid 23b0.2b88  Teb: 0000000000257000 Win32Thread:
ffffe000157ca20 WAIT: (UserRequest) UserMode Non-Alertable
ffffe00016beb470  SynchronizationEvent
THREAD Ffffe0001af10800  Cid 23b0.2f40  Teb: 0000000000265000 Win32Thread:
ffffe000156688a0 WAIT: (UserRequest) UserMode Non-Alertable
ffffe000172ad4f0  SynchronizationEvent
ffffe0001ac26420  SynchronizationEvent
THREAD Ffffe0001b69a080  Cid 23b0.2f4c  Teb: 0000000000267000 Win32Thread:
ffffe000192c350 WAIT: (UserRequest) UserMode Non-Alertable
ffffe00018d83c00  SynchronizationEvent
ffffe0001552ff40  SynchronizationEvent
...     ...
THREAD Ffffe00023422080  Cid 23b0.3d8c  Teb: 00000000003cf000 Win32Thread:
ffffe0001eccd790 WAIT: (WrQueue) UserMode Alertable
ffffe0001aec9080  QueueObject
THREAD Ffffe00023f23080  Cid 23b0.3af8  Teb: 00000000003d1000 Win32Thread:
0000000000000000 WAIT: (WrQueue) UserMode Alertable
ffffe0001aec9080  QueueObject
THREAD Ffffe000230bf800  Cid 23b0.2d6c  Teb: 00000000003d3000 Win32Thread:
0000000000000000 WAIT: (WrQueue) UserMode Alertable
ffffe0001aec9080  QueueObject
THREAD Ffffe0001fb05800  Cid 23b0.3398  Teb: 00000000003e3000 Win32Thread:
0000000000000000 WAIT: (UserRequest) UserMode Alertable
ffffe0001d19d790  SynchronizationEvent
ffffe00022b42660  SynchronizationTimer
```

The list of threads is truncated for the sake of space. Each thread shows its address (ETHREAD),

which can be passed to the !thread command; its client ID (Cid)—process ID and thread ID (the

process ID for all the preceding threads is the same, as they are part of the same explorer.exe

process); the Thread Environment Block (TEB, discussed momentarily); and the thread state (most

should be in the wait state, with the reason for the wait in parentheses). The next line may show

a list of synchronization objects the threads is waiting on.

To get more information on a specific thread, pass its address to the !thread command:

```bash
!kbd !thread ffffe0001d45d800
  !THREAD ffffe0001d45d800  Cid 23b0.452c  Teb: 000000000026d000 Win32Thread:
  ffff0001aace630 WAIT: UserRequest) UserMode Non-Alertable
      ffff00023678350  NotificationEvent
      fffffe0002aaeb370  Semaphore Limit 0xffff
      fffffe000225645b0  SynchronizationEvent
  Not impersonating
  DeviceMap               fffffc00004f7ddb0
  Owning Process            fffffe00018c817c0        Image:        explorer.exe
CHAPTER 4  Threads
From the Library of
```

---

```bash
Attached Process      N/A               Image:        N/A
Wait Start TickCount    7233205           Ticks: 270 (00:00:04:218)
Context Switch Count    6570             IdealProcessor: 7
UserTime                00:00:00:078          _
KernelTime               00:00:00:046          _
Win32 Start Address 0c       Stack Init ffffd000271d4c90 Current ffff000271df80
Base ffff000271d5000 Limit ffffd000271cf000 Call 0000000000000000
Priority 9 BasePriority 8 PriorityDecrement 0 IoPriority 2 PagePriority 5
GetContextState failed, 0x80004001
Unable to get current machine context, HRESULT 0x80004001
Child-SP         RetAddr   :  Args to Child   :  Call Site
 ffffdf002'271d3f0    ffffff803'bef086ca :  00000000'00000000 00000000'00000001
00000000'00000000 00000000'00000000 : nt!KiSwapContext+0x76
ffffdf002'271d4100    fffffe803'bef08159 :  fffffe000'1da5800  ffffff803'00000000
fffffe000'1aee9000 00000000'0000000F : nt!KiSwapThread+0x15a
fffffe000'271d41b0    fffffe803'bef09cfe :  00000000'00000000 00000000'
fffffe000'0000000f 00000000'00000003 :  nt!KiCommitThreadWait+0x149
ffffdf000'271d4240    ffffff803'bf2445d :  ffffff000'00000003  ffffff000'271d43c0
00000000'00000000  Ffffff960'0000000e :  nt!KiWaitForMultipleObjects+0x24e
ffffdf000'271d4300    ffffff803'bf2fa246 :  ffffff803'bf1a6b40  ffffff000'271d4810
ffffdf000'271d4858    ffffff000'20aec60 :  nt!ObWaitForMultipleObjects+0x2bd
ffffdf000'271d4810    ffffff803'befda3 :  00000000'00000fa0  ffffff803'bef02aed
fffffe000'1d458000  00000000'1e22f198 :  nt!NtWaitForMultipleObjects+0xf6
ffffdf000'271d4a90    00007ffe 'f42b5c24 :  00000000'00000000 00000000
00000000'00000000'00000000'00000000 :  nt!KiSystemServiceCopyEnd+0x13 (TrapFrame @
ffffdf000'271d4b00)
00000000'1e22f178  00000000'00000000 :  00000000'00000000 00000000
00000000'00000000 00000000'00000000 :  0x00007ffe'f42b5c24
```

There is a lot of information about the thread, such as its priority, stack details, user and kernel times, and much more. You'll look at many of these details throughout this chapter and in Chapter 5, "Memory management," and Chapter 6, "I/O system. "

## EXPERIMENT: Viewing thread information with list

The following output is the detailed display of a process produced by using t1ist in the Debugging Tools for Windows. (Make sure you run t1ist from the same "bitness" as the target process.) Notice that the thread list shows Win32StartAddr. This is the address passed to the CreateThread function by the application. All the other utilities (except Process Explorer) that show the thread start address show the actual start address (a function in Ntdll.dll), not the application-specified start address.

The following output is from running t!list on Word 2016 (truncated):

```bash
C:\Dbg\tbx6t\list winword
120 WINWORD.EXE      Chapter04.docm - Word
  CWD:          C:\Users\pavely\Documents\
```

CHAPTER 4  Threads      199


---

```bash
CmdLine: "C:\Program Files (x86)\Microsoft Office\Root\Office16\WINWORD.EXE" /n
"1:\OneDrive\Windows\InternalsBook7thEdition\Chapter04\Chapter04.docm
    VirtualSize:  778012 KB  PeakVirtualSize:  832680 KB
    WorkingSetSize:185336 KB  PeakWorkingSetSize:227144 KB
    NumberOfThreads: 45
    12132 Win32StartAddr:0x00921000 LastErr:0x00000000 State:Waiting
    15540 Win32StartAddr:0x6cc2fdd8 LastErr:0x00000000 State:Waiting
    7096 Win32StartAddr:0x6cc3c6b2 LastErr:0x00000006 State:Waiting
    17696 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    17492 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    4052 Win32StartAddr:0x70aa5cf7 LastErr:0x00000000 State:Waiting
    14096 Win32StartAddr:0x70aa41d4 LastErr:0x00000000 State:Waiting
    6220 Win32StartAddr:0x70aa41d4 LastErr:0x00000000 State:Waiting
    7204 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    1196 Win32StartAddr:0x06ea016c0 LastErr:0x00000057 State:Waiting
    8848 Win32StartAddr:0x70aa41d4 LastErr:0x00000000 State:Waiting
    3352 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    11612 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    17420 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    13612 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    15052 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    12080 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    9456 Win32StartAddr:0x77c1c6d0 LastErr:0x00002f94 State:Waiting
    9808 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    16208 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    9396 Win32StartAddr:0x77c1c6d0 LastErr:0x00000000 State:Waiting
    2688 Win32StartAddr:0x70aa41d4 LastErr:0x00000000 State:Waiting
    9100 Win32StartAddr:0x70aa41d4 LastErr:0x00000000 State:Waiting
    18364 Win32StartAddr:0x70aa41d4 LastErr:0x00000000 State:Waiting
    11180 Win32StartAddr:0x70aa41d4 LastErr:0x00000000 State:Waiting
    16.0.6741.2037  shp  0x00920000 C:\Program Files (x86)\Microsoft Office\Root\
Office16\WINWORD.EXE
    10.0.10586.122  shp  0x77B00000 C:\windows\SYSTEM32\ntdl1.d1l
    10.0.10586.0  shp  0x75540000 C:\windows\SYSTEM32\KERNEL32.DLL
    10.0.10586.162  shp  0x77850000 C:\windows\SYSTEM32\KERNELBASE.d1l
    10.0.10586.63  shp  0x75A0000 C:\windows\SYSTEM32\ADVAPI32.d1l
    ...
    10.0.10586.0  shp  0x68540000 C:\windows\SYSTEM32\VssTrace.DLL
    10.0.10586.0  shp  0x5C390000 C:\windows\SYSTEM32\adslpc.d1l
    10.0.10586.122  shp  0x5DE60000 C:\windows\SYSTEM32\tasksched.d1l
    10.0.10586.0  shp  0x5E3F0000 C:\windows\SYSTEM32\srmsstormod.d1l
    10.0.10586.0  shp  0x5DCA0000 C:\windows\SYSTEM32\srmscan.d1l
    10.0.10586.0  shp  0x5D2E0000 C:\windows\SYSTEM32\wsmdr.d1l
    10.0.10586.0  shp  0x711F0000 C:\windows\SYSTEM32\smr_ps.d1l
    10.0.10586.0  shp  0x56680000 C:\windows\SYSTEM32\OpsServices.dll
    10.0.10586.0  shp  0x5D240000 C:\Program Files (x86)\Common Files\Microsoft
Shared\Office16\WXPME.DLL
    16.0.6701.1023  shp  0x77EE80000 C:\Program Files (x86)\Microsoft Office\Root\
Office16\GROOVEEX.DLL
    10.0.10586.0  shp  0x693F0000 C:\windows\system32\dataexchange.d1l
```

200   CHAPTER 4   Threads

---

The TEB, illustrated in Figure 4-3, is one of the data structures explained in this section that exists in the process address space (as opposed to the system space). Internally, it is made up of a header called the Thread Information Block (TIB), which mainly existed for compatibility with OS/2 and Win9x applications. It also allows exception and stack information to be kept into a smaller structure when creating new threads by using an initial TIB.

![Figure](figures/Winternals7thPt1_page_218_figure_001.png)

FIGURE 4-3 Important fields of the thread environment block.

The TEB stores context information for the image loader and various Windows DLLs. Because these components run in user mode, they need a data structure writable from user mode. That's why this structure exists in the process address space instead of in the system space, where it would be writable only from kernel mode. You can find the address of the TEB with the kernel debugger !thread command.

## EXPERIMENT: Examining the TEB

You can dump the TEB structure with the !t eb command in the kernel or user-mode debugger. The command can be used on its own to dump the TEB for the current thread of the debugger or with a TEB address to get it for an arbitrary thread. In case of a kernel debugger, the current process must be set before issuing the command on a TEB address so that the correct process context is used.

CHAPTER 4   Threads      201


---

To view the TEB with a user-mode debugger, follow these steps. (You'll learn how to view the

TEB using a kernel debugger in the next experiment.)

1. Open WinDbg.

2. Open the File menu and choose Run Executable.

3. Navigate to c:\windows\system32\Notepad.exe. The debugger should break at the

initial breakpoint.

4. Issue the !feb command to view the TEB of the only thread existing at the moment

(the example is from 64 bit Windows):

```bash
0:000> !feb
TEB at 000000ef125c1000
    ExceptionList:        0000000000000000
    StackBase:            000000ef12290000
    StackLimit:           000000ef1227f000
    SubSystemTib:         0000000000000000
    FiberData:             00000000000001e00
    ArbitraryUserPointer:  0000000000000000
    Self:                  000000ef125c1000
    EnvironmentPointer:     0000000000000000
    ClientId:                000000000000021bc .00000000000001b74
    RpcHandle:            0000000000000000
    Tls Storage:             00000266e572b600
    PEB Address:             000000ef125c0000
    LastErrorValue:        0
    LastStatusValue:       0
    Count Owned Locks:      0
    HardErrorMode:        0
```

5. Enter the g command or press F5 to proceed with running Notepad.

6. In Notepad, open the File menu and choose Open. Then click Cancel to dismiss the Open File dialog box.

7. Press Ctrl+Break or open the Debug menu and choose Break to forcibly break into the process.

8. Enter the <tidie> command to show all threads in the process. You should see something like this:

```bash
0:005s
 0  Id: 21bc.1b74 Suspend: 1 Teb: 000000ef'125c1000 Unfrozen
 1  Id: 21bc.640 Suspend: 1 Teb: 000000ef'125e3000 Unfrozen
 2  Id: 21bc.1a98 Suspend: 1 Teb: 000000ef'125e6500 Unfrozen
 3  Id: 21bc.860 Suspend: 1 Teb: 000000ef'125e7000 Unfrozen
 4  Id: 21bc.28e0 Suspend: 1 Teb: 000000ef'125c9000 Unfrozen
 5  Id: 21bc.23e0 Suspend: 1 Teb: 000000ef'12400000 Unfrozen
 6  Id: 21bc.24c5 Suspend: 1 Teb: 000000ef'125e6000 Unfrozen
 7  Id: 21bc.168c Suspend: 1 Teb: 000000ef'125d000 Unfrozen
```

202    CHAPTER 4    Threads


---

```bash
8  Id: 21bc.1c90 Suspend: 1 Teb: 00000ef125fe000 Unfreeze
9  Id: 21bc.1558 Suspend: 1 Teb: 00000ef125f1000 Unfreeze
10  Id: 21bc.a64 Suspend: 1 Teb: 00000ef125f3000 Unfreeze
11  Id: 21bc.20c4 Suspend: 1 Teb: 00000ef125f5000 Unfreeze
12  Id: 21bc.1524 Suspend: 1 Teb: 00000ef125f7000 Unfreeze
13  Id: 21bc.1738 Suspend: 1 Teb: 00000ef125f9000 Unfreeze
14  Id: 21bc.f48 Suspend: 1 Teb: 00000ef125f6000 Unfreeze
15  Id: 21bc.17bc Suspend: 1 Teb: 00000ef125fd000 Unfreeze
```

9. Each thread shows its TEB address. You can examine a specific thread by specifying its

TEB address to the !teb command. Here's an example for thread 9 from the preceding

output:

```bash
0:005> !feb 000000ef125f1000
TEB at 000000ef125f1000
    ExceptionList:        0000000000000000
    StackBase:          000000ef13400000
    StackLimit:         000000ef133ef000
    SubSystemTlb:        0000000000000000
    FiberData:           00000000000001e00
    ArbitraryUserPointer: 0000000000000000
    Self:                000000ef125f1000
    EnvironmentPointer:     0000000000000000
    ClientId:              000000000000021bc .0000000000001558
    RpcHandle:           0000000000000000
    Tls Storage:           00000266ea1af280
    PEB Address:           000000ef125c0000
    LastErrorValue:        0
    LastStatusValue:       c0000034
    Count Owned Locks:      0
    HardErrorMode:        0
```

10. Of course, it's possible to view the actual structure with the TEB address (truncated to conserve space):

```bash
0:005> dt ntdll_lib 000000ef'125f1000
+0x000 NtIb           : _NT_TIB
+0x038 EnvironmentPointer : (null)
+0x040 ClientId        : _CLIENT_ID
+0x050 ActiveEpochHandle : (null)
+0x058 ThreadLocalStoragePointer : 0x00000266'ea1af280 Void
+0x060 ProcessEnvironmentBlock : 0x000000ef'125c0000 _PEB
+0x068 GetLastErrorValue   : 0
+0x06c CountOfOwnedCriticalSections : 0
...
+0x1808 LockCount       : 0
+0x180c WowTebOffset    : 0n0
+0x1810 ResourceRetValue : 0x00000266'ea2a5e50 Void
+0x1818 ReservedForWdf   : (null)
+0x1820 ReservedForCrt   : 0
+0x1828 EffectiveContainerId : _GUID {00000000-0000-0000-0000-00000000000000}
```

CHAPTER 4   Threads      203


---

EXPERIMENT: Examining the TEB with a kernel debugger

Follow these steps to view the TEB with a kernel debugger:

1. Find the process for which thread's TEB is of interest. For example, the following looks for explorer.exe processes and lists its threads with basic information (truncated).

```bash
!kb: process 0 2 explorer.exe
PROCESS ffffe0012bea7840
SessionId: 2 Cid: 10d8    Pcb: 00251000 ParentCid: 10bc
     DirBase: 76e12000  ObjectTable: ffffcc00e1ca0c80 HandleCount: <Data Not
Accessible>
    Image: explorer.exe
        THREAD ffffe0012bf53080  Cid 10d8.10dc  Teb: 0000000000252000
Win32Thread: ffffe0012c153f0 WAIT: (UserRequest) UserMode Non-Alertable
            ffffe0012c257f0e   SynchronizationEvent
        THREAD ffffe0012a30f080  Cid 10d8.114c  Teb: 0000000000266000
Win32Thread: ffffe0012c2e9a02 WAIT: (UserRequest) UserMode Alertable
            ffffe0012bab85d0  SynchronizationEvent
        THREAD ffffe0012c8bd080  Cid 10d8.1178  Teb: 000000000026c000
Win32Thread: ffffe0012a801310 WAIT: (UserRequest) UserMode Alertable
            ffffe0012bfd9250  NotificationEvent
            ffffe0012c9512f0  NotificationEvent
            ffffe0012c876b80  NotificationEvent
            ffffe0012c10f6e0  NotificationEvent
            ffffe0012d0ba7e0  NotificationEvent
            ffffe0012c79d1e0  NotificationEvent
        ...
        THREAD ffffe0012c8be080  Cid 10d8.1180  Teb: 0000000000270000
Win32Thread: 0000000000000000 WAIT: (UserRequest) UserMode Alertable
            ffffe80156946440  NotificationEvent
        THREAD ffffe0012af4d040  Cid 10d8.1184  Teb: 0000000000272000
Win32Thread: ffffe0012c7c53ad WAIT: (UserRequest) UserMode Non-Alertable
            ffffe0012a3daf60  NotificationEvent
            ffffe0012c21ee70  Semaphore Limit 0xffff
            ffffe0012c8db6f0  SynchronizationEvent
        THREAD ffffe0012c88a080  Cid 10d8.1188  Teb: 0000000000274000
Win32Thread: 0000000000000000 WAIT: (UserRequest) UserMode Alertable
            ffffe0012afd4920  NotificationEvent
            ffffe0012c87b480  SynchronizationEvent
            ffffe0012c87b400  SynchronizationEvent
        ...
```

2. If more than one explorer.exe process exists, select one arbitrarily for the following steps.

---

3. Each thread shows the address of its TEB. Because the TEB is in user space, the address has meaning only in the context of the relevant process. You need to switch to the process/thread as seen by the debugger. Select the first thread of explorer because its kernel stack is probably resident in physical memory. Otherwise, you'll get an error.

```bash
!kdb .thread /p ffffe0012bf53080
Implicit thread is now fffffe001*2bf53080
Implicit process is now fffffe001*2bea7840
```

4. This switches the context to the specified thread (and by extension, the process). Now you can use the !teborg command with the TEB address listed for that thread:

```bash
!tkd: !feb 0000000000252000
TEB at 0000000000252000
    ExceptionList:        0000000000000000
    StackBase:          0000000000000000
    StackLimit:         0000000000000000
    SubSystemTlb:       0000000000000000
    FiberData:          00000000000001e00
    ArbitraryUserPointer:  0000000000000000
    Self:                00000000000252000
    EnvironmentPointer:   0000000000000000
    ClientId:             0000000000000010d8 . 000000000000010dc
    RpcHandle:          0000000000000000
    Tls Storage:           0000000009f73f30
    PEB Address:          00000000000251000
    LastErrorValue:        0
    LastStatusValue:       c0150008
    Count Owned Locks:      0
    HardErrorMode:        0
```

The CSR_THREAD, illustrated in Figure 4-4 is analogous to the data structure of CSR_PROCESS, but it's applied to threads. As you might recall, this is maintained by each Cssr process within a session and identifies the Windows subsystem threads running within it. CSR_THREAD stores a handle that Cssr keeps for the thread, various flags, the client ID (thread ID and process ID), and a copy of the thread's creation time. Note that threads are registered with Cssr when they send their first message to Cssr, typically due to some API that requires notifying Cssr of some operation or condition.

![Figure](figures/Winternals7thPt1_page_222_figure_005.png)

FIGURE 4-4 Fields of the CSR thread.

CHAPTER 4  Threads      205


---

EXPERIMENT: Examining the CSR_THREAD

You can dump the CSR_THREAD structure with the dt command in the kernel-mode debugger while the debugger context is set to a Cssr process. Follow the instructions in the experiment "Examining the CSR_PROCESS" in Chapter 3 to perform this operation. Here is an example output from Windows 10 x64 system:

```bash
tkd- dt_csrssl CSR_thread
    +0x000 CreateTime      : _LARGE_INTEGER
    +0x008 Link            : _LIST_ENTRY
    +0x018 HashLinks       : _LIST_ENTRY
    +0x028 ClientId        : _CLIENT_ID
    +0x038 Process         : _Ptr64_CSR_PROCESS
    +0x040 ThreadHandle   : _Ptr64_Void
    +0x048 Flags           : Uint48
    +0x04c ReferenceCount : Uint48
    +0x050 ImpersonateCount : Uint48
```

Finally, the W32THREAD structure, illustrated in Figure 4-5, is analogous to the data structure of

W32PROCESS, but it's applied to threads This structure mainly contains information useful for the GDI

subsystem (brushes and Device Context attributes) and DirectX, as well as for the User Mode Print

Driver (UMPD) framework that vendors use to write user-mode printer drivers. Finally, it contains a

rendering state useful for desktop compositing and anti-aliasing.

![Figure](figures/Winternals7thPt1_page_223_figure_004.png)

FIGURE 4-5 Fields of the Win32x thread.

## Birth of a thread

A thread's life cycle starts when a process (in the context of some thread, such as the thread running the main function) creates a new thread. The request filters down to the Windows executive, where the process manager allocates space for a thread object and calls the kernel to initialize the thread control block (KTHREAD). As mentioned, the various thread-creation functions eventually end up at CreateRemoteThreadEx. The following steps are taken inside this function in Kernel32.dll to create a Windows thread:

206   CHAPTER 4   Threads


---

- 1. The function converts the Windows API parameters to native flags and builds a native structure
describing object parameters (OBJECT_ATTRIBUTES, described in Chapter 8 in Part 2).

2. It builds an attribute list with two entries: client ID and TEB address. (For more information on
attribute lists, see the section "Flow of CreateProcess" in Chapter 3.)

3. It determines whether the thread is created in the calling process or another process indicated
by the handle passed in. If the handle is equal to the pseudo handle returned from GetCurrent-
Process (with a value of -1), then it's the same process. If the process handle is different, it
could still be a valid handle to the same process, so a call is made to NtQueryInformation-
Process (in Ntidll) to find out whether that is indeed the case.

4. It calls NtCreateThreadEx (in Ntidll) to make the transition to the executive in kernel mode and
continues inside a function with the same name and arguments.

5. NtCreateThreadEx (inside the executive) creates and initializes the user-mode thread context
(its structure is architecture-specific) and then calls PspCreateThread to create a suspended
executive thread object. (For a description of the steps performed by this function, see the de-
scriptions of stage 3 and stage 5 in Chapter 3 in the section "Flow of CreateProcess.") Then the
function returns, eventually ending back in user mode at CreateRemoteThreadEx.

6. CreateRemoteThreadEx allocates an activation context for the thread used by side-by-side as-
sembly support. It then queries the activation stack to see if it requires activation and activates
it if needed. The activation stack pointer is saved in the new thread's TEB.

7. Unless the caller created the thread with the CREATE_SUSPENDED flag set, the thread is now
resumed so that it can be scheduled for execution. When the thread starts running, it executes
the steps described in Chapter 3 in the section "Stage 7: performing process initialization in the
context of the new process" before calling the actual user's specified start address.

8. The thread handle and the thread ID are returned to the caller.
## Examining thread activity

Examining thread activity is especially important if you are trying to determine why a process that is hosting multiple services is running (such as Svhost.exe, Dllhost.exe, or Lsass.exe) or why a process has stopped responding.

There are several tools that expose various elements of the state of Windows threads: WinDbg (in user-process attach and kernel-debugging mode), Performance Monitor, and Process Explorer. (The tools that show thread-scheduling information are listed in the section "Thread scheduling.")

To view the threads in a process with Process Explorer, select a process and double-click it to open its Properties dialog box. Alternatively, right-click the process and select the Properties menu item.

CHAPTER 4   Threads      207


---

Then click the Threads tab. This tab shows a list of the threads in the process and four columns of information for each thread: its ID, the percentage of CPU consumed (based on the refresh interval configured), the number of cycles charged to the thread, and the thread start address. You can sort by any of these four columns.

New threads that are created are highlighted in green, and threads that exit are highlighted in red.


(To configure the highlight duration, open the Options menu and choose Difference Highlight Duration.) This might be helpful to discover unnecessary thread creation occurring in a process. (In general, threads should be created at process startup, not every time a request is processed inside a process.)

As you select each thread in the list, Process Explorer displays the thread ID, start time, state, CPU time counters, number of cycles charged, number of context switches, the ideal processor and its group, and the I/O priority, memory priority, and base and current (dynamic) priority. There is a Kill button, which terminates an individual thread, but this should be used with extreme care. Another option is the Suspend button, which prevents the thread from forward execution and thus prevents a runaway thread from consuming CPU time. However, this can also lead to deadlocks and should be used with the same care as the Kill button. Finally, the Permissions button allows you to view the security descriptor of the thread. (See Chapter 7, "Security, " for more information on security descriptors.)

Unlike Task Manager and all other process/processor monitoring tools, Process Explorer uses the clock cycle counter designed for thread run-time accounting (described later in this chapter) instead of the clock interval timer, so you will see a significantly different view of CPU consumption using Process Explorer. This is because many threads run for such a short time that they are seldom (if ever) the currently running thread when the clock interval timer interrupt occurs. As a result, they are not charged for much of their CPU time, leading clock-based tools to perceive a CPU usage of 0 percent. On the other hand, the total number of clock cycles represents the actual number of processor cycles that each thread in the process accrued. It is independent of the clock interval timer's resolution because the count is maintained internally by the processor at each cycle and updated by Windows at each interrupt entry. (A final accumulation is done before a context switch.)

The thread start address is displayed in the form module! function, where module is the name of

the .EXE or DLL. The function name relies on access to symbol files for the module (see the section

“Experiment: Viewing process details with Process Explorer” in Chapter 1, “Concepts and tools”). If you

are unsure what the module is, click the Module button to open an Explorer file Properties dialog box

for the module containing the thread’s start address (for example, the .EXE or DLL).

![Figure](figures/Winternals7thPt1_page_225_figure_005.png)

Note For threads created by the Windows CreateThread function, Process Explorer displays the function passed to CreateThread, not the actual thread start function. This is because all Windows threads start at a common thread startup wrapper function (RtlUserThreadStart in Ntdll.dll). If Process Explorer showed the actual start address, most threads in processes would appear to have started at the same address, which would not be helpful in trying to understand what code the thread was executing. However, if Process Explorer can't query the user-defined startup address (such as in the case of a protected process), it will show the wrapper function, so you will see all threads starting at RtlUserThreadStart.

208   CHAPTER 4  Threads


---

The thread start address displayed might not be enough information to pinpoint what the thread is doing and which component within the process is responsible for the CPU consumed by the thread. This is especially true if the thread start address is a generic startup function—for example, if the function name does not indicate what the thread is actually doing. In this case, examining the thread stack might answer the question. To view the stack for a thread, double-click the thread of interest (or select it and click the Stack button). Process Explorer displays the thread's stack (both user and kernel, if the thread was in kernel mode).

![Figure](figures/Winternals7thPt1_page_226_figure_001.png)

Note While the user-mode debuggers (WinDbg, Ntstd, and Cdb) permit you to attach to a process and display the user stack for a thread, Process Explorer shows both the user and kernel stack in one easy click of a button. You can also examine user and kernel thread stacks using WinDbg in local kernel debugging mode, as the next two experiments demonstrate.

When looking at 32-bit processes running on 64-bit systems as a Wow64 process (see Chapter 8 in Part 2 for more information on Wow64), Process Explorer shows both the 32-bit and 64-bit stack for threads. Because at the time of the real (64-bit system call, the thread has been switched to a 64-bit stack and context, simply looking at the thread's 64-bit stack would reveal only half the story—the 64-bit part of the thread, with Wow64's thunking code. So, when examining Wow64 processes, be sure to take into account both the 32-bit and 64-bit stacks.

## EXPERIMENT: Viewing a thread stack with a user-mode debugger

Follow these steps to attach WinDbg to a process and view thread information and its stack:

- 1. Run notepad.exe and WinDbg.exe.

2. In WinDbg, open the File menu and select Attach to Process.

3. Find the notepad.exe instance and click OK to attach. The debugger should break into

Notepad.

4. List the existing threads in the process with the -- command. Each thread shows its de-

bugger ID, the client ID (ProcessID: ThreadID), its suspend count (this should be 1 most

of the time, as it is suspended because of the breakpoint), the TEB address, and whether

it has been frozen using a debugger command.
```bash
0:005s ~
 0  Id: 612c.5f68 Suspend: 1 Feb: 00000022'41da2000 Unfrozen
 1  Id: 612c.5564 Suspend: 1 Feb: 00000022'41da4000 Unfrozen
 2  Id: 612c.4f88 Suspend: 1 Feb: 00000022'41da6000 Unfrozen
 3  Id: 612c.5608 Suspend: 1 Feb: 00000022'41da8000 Unfrozen
 4  Id: 612c.cf4 Suspend: 1 Feb: 00000022'41da0000 Unfrozen
 5  Id: 612c.9f8 Suspend: 1 Feb: 00000022'41db0000 Unfrozen
```

CHAPTER 4  Threads      209


---

5. Notice the dot preceding thread 5 in the output. This is the current debugger thread. Issue the k command to view the call stack:

```bash
0:000s+
#   Ch11-SP           RetAddr       Call Site
# 00000002'421FF7e8 00007ff8'504d9031 ntdllibDbgBreakPoint
# 010000002'421FF7f0 00007ff8'501b8102 ntdllibDbgRemoteBreakin+0x51
# 020000002'421FF820 00007ff8'504c654 KERNEL32!BaseThreadInitThunk+0x24
# 030000002'421FF850 00000000'00000000 ntdllibRtlUserThreadStart+0x34
```

6. The debugger injected a thread into Notepad's process that issues a breakpoint instruc tion (DbgBreakPoint). To view the call stack of another thread, use the ~nk command,

where n is the thread number as seen by WinDbg. (This does not change the current

debugger thread.) Here's an example for thread 2:

```bash
0:00:5s ~2k
#   Ch11d-SP      RetAddr       Call Site
00 00000022'41ff7f9e8 00007ff8'5043b5e8 ntil1i2aWaitForWorkViaWorkerFactory+0x14
01 00000022'41ff7f9e8 00007ff8'50181022 ntil1i2TpWorkerThread+0x298
02 00000022'41ff7fe0 00007ff8'5046c5b4 KERNEL32!BaseThreadInitThunk+0x22
03 00000022'41ff730 00000000'00000000 ntil1i2tllUserThreadStart+0x34
```

7. T o switch the debugger to another thread, use the -ns command (again, n is the thread number). Let's switch to thread 0 and show its stack:

```bash
0:00s~ ~0s
USER32!ZwUserGetMessage+0x14:
00007F8F*502e21d4 c3                  ret
0:00s~ k
# Child-SP      RetAddr       Call Site
00 0000022*41e7f648 00007F8F*502d3075 USER32!ZwUserGetMessage+0x14
01 00000022*41e7f650 00007F6F*88273b3b USER32!CetMessageW+0x25
02 00000022*41e7f780 000007FF*882890b5 notepadidWinMain+0x27b
03 00000022*41e7f180 000007FF*34122988 notepadid__mainCRTStartup+0x1ad
04 00000022*41e7f9f0 000007FF*504c645 KERNEL32!BaseThreadInitThunk+0x34
05 00000022*41e7fa20 00000000 00000000 ndtl!RtlUserThreadStart+0x34
```

8. Note that even though a thread might be in kernel mode at the time, a user-mode


debugger shows its last function that's still in user mode (ZwUserGetMessage in the

preceding output).

## EXPERIMENT: Viewing a thread stack with a local kernel-mode debugger

In this experiment, you'll use a local kernel debugger to view a thread's stack (both user mode

and kernel mode). The experiment uses one of Explorer's threads, but you can try it with other

processes or threads.

- 1. Show all the processes running the image explorer.exe. (Note that you may see more
than one instance of Explorer if the Launch Folder Windows in a Separate Process
---

option in Explorer options is selected. One process manages the desktop and taskbar, while the other manages Explore windows.)

```bash
!kb: !process 0 0 explorer.exe
PROCESS ffffe00197398080
    SessionId: 1  Cid: 18A0    Peb: 00320000  ParentCid: 1840
        DirBase: 1c028000  ObjectTable: ffffc00bd4aa880  HandleCount: <Data
Not Accessible>
        Image: explorer.exe
PROCESS ffffe00196039080
        SessionId: 1  Cid: 1F30    Peb: 00290000  ParentCid: 0238
        DirBase: 24cc7b000  ObjectTable: ffffc00bbbef740  HandleCount: <Data
Not Accessible>
        Image: explorer.exe
```

2. Select one instance and show its thread summary:

```bash
!kb: !process ffffe00196039080 2
PROCESS ffffe00196039080
    SessionId: 1 Cid: 1f30    Pcb: 00290000  ParentCid: 0238
        DirBase: 24cc7b000  ObjectTable: ffffc000bbbef740 HandleCount: <Data
Not Accessible>
        Image: explorer.exe
        THREAD ffffe0019758f080  Cid 1f30.0718  Teb: 0000000000291000
Win32Thread: ffffe001972e3220 WAIT: (UserRequest) UserMode Non-Alertable
            ffffe00192c08150  SynchronizationEvent
        THREAD ffffe00198911080  Cid 1f30.1aac  Teb: 00000000002a1000
Win32Thread: ffffe001926147e0 WAIT: (UserRequest) UserMode Non-Alertable
            ffffe001976e6150  SynchronizationEvent
            ffffe001987bf9e0  SynchronizationEvent
        THREAD ffffe00199553080  Cid 1f30.1ad4  Teb: 00000000002b1000
Win32Thread: ffffe0019261c740 WAIT: (UserRequest) UserMode Non-Alertable
            ffffe0019c6ab150  NotificationEvent
            ffffe0019a7da5e0  SynchronizationEvent
        THREAD ffffe0019b6b2800  Cid 1f30.1758  Teb: 00000000002bd000
Win32Thread: 0000000000000000 WAIT: (Suspended) KernelMode Non-Alertable
SuspendCount 1
        ffffe0019b6b2ae0 NotificationEvent
    ...
```

3. Switch to the context of the first thread in the process (you can select other threads):

```bash
!kdt .thread /p / ffffe0019758f080
Implicit thread is now ffffe0019758f080
Implicit process is now ffffe00196039080
Loading User Symbols
.........................................................................
```

---

4. Now look at the thread to show its details and its call stack (addresses are truncated in the shown output):

```bash
tkd: !thread ffffe019758F80B
THREAD ffffe019758F80B Cid 1f30.0718  Teb: 0000000000291000 Win32Thread :
ffffffff01972e3220 WAIT : (UserRequest)UserMode Non - Alertable
ffffffff0192c08150 SynchronizationEvent
Not impersoning
DeviceMap        ffffc000b77f1f30
Owning Process    ffffe00196039080  Image : explorer.exe
Attached Process   N / A     Image : N / A
Wait Start TickCount   17415276     Ticks : 146 (0:00 : 00 : 02.281)
Context Switch Count   2788        IdealProcessor : 4
UserID Time           00 : 00 : 00.031
UserID Time           00 : 00 : 00.000
*** WARNING : Unable to verify checksum for C : windows\explorer.exe
Win32 Start Address explorer\winMainCRTStartup(0x00007fff7b80de4a0)
Stack Init ffffdf002277c90 Current ffffdf002277fb80
Base ffffdf002277d00 Limit ffffdf0022772000 Ca1 000000000000000
Priority 8 BasePriority 8 PriorityDecrement 0 IoPriority 2 PagePriority 5
... Call Site
... ntKiISwapContext + 0x76
... ntKiISwapThread + 0x15a
... ntKiICommitThreadWait + 0x149
... ntIKeWaitForSingleObject + 0x375
... ntIOwaitForMultipleObjects + 0x2bd
... ntINwaitForMultipleObjects + 0xf6
... ntKiISystemServiceCopyEnd + 0x13 (TrapFrame @ ffffdf000'2727cb00)
... ntDll2WaitForMultipleObjects + 0x14
... KERNLEBASE!WaitForMultipleObjectsEx + 0x02
... USER32!RealMsWaitForMultipleObjectsEx + 0xdb
... USER32!MsgwaitForMultipleObjectsEx + 0x152
... explorerFrameSHPProcessMessagesUntilTEventsEx + 0x8a
... explorerFrameSHPProcessMessagesUntilTEventEx + 0x22
... explorerFrameICExplorerHostCreator::RunHost + 0x6d
... explorer!\winMain + 0xa04fd
... explorer!\__wmainCRTStartup + 0x1d6
```

## Limitations on protected process threads

As discussed in Chapter 3, protected processes (classic protected or PPL) have several limitations in terms of which access rights will be granted, even to the users with the highest privileges on the system. These limitations also apply to threads inside such a process. This ensures that the actual code running inside the protected process cannot be hijacked or otherwise affected through standard Windows functions, which require access rights that are not granted for protected process threads. In fact, the only permissions granted are THREAD_SUSPEND_MORE and THREAD_SET/query_LIMITED_INFORMATION.

212   CHAPTER 4  Threads


---

## EXPERIMENT: Viewing protected process thread information with Process  Explorer

In this experiment, you’ll view protected process thread information. Follow these steps:

1. Find any protected or PPL process, such as the Audiody.exe or Cssr.exe process inside the process list.

2. Open the process's Properties dialog box and click the Threads tab.

![Figure](figures/Winternals7thPt1_page_230_figure_004.png)

3. Process Explorer doesn't show the Win32 thread start address. Instead, it displays the

standard thread start wrapper inside Ntdll.dll. If you click the Stack button, you'll get an

error, because Process Explorer needs to read the virtual memory inside the protected

process, which it can't do.

4. Note that although the base and dynamic priorities are shown, the I/O and memory priorities are not (nor is Cycles), which is another example of the limited access right

THREAD_QUERYLIMITED_INFORMATION versus full query information access right

(THREAD_QUERY_INFORMATION).

5. Try to kill a thread inside a protected process. When you do, notice yet another accessdenied error: recall the lack of THREAD_TERMINATE access.

CHAPTER 4  Threads      213


---

Thread scheduling

This section describes the Windows scheduling policies and algorithms. The first subsection provides a condensed description of how scheduling works on Windows and a definition of key terms. Then Windows priority levels are described from both the Windows API and the Windows kernel points of view. After a review of the relevant Windows utilities and tools that relate to scheduling, the detailed data structures and algorithms that make up the Windows scheduling system are presented, including a description of common scheduling scenarios and how thread selection, as well as processor selection, occurs.

## Overview of Windows scheduling

Windows implements a priority-driven, preemptive scheduling system. At least one of the highestpriority runnable (ready) threads always runs, with the caveat that certain high-priority threads ready to run might be limited by the processors on which they might be allowed or preferred to run on— phenomenon called processor affinity. Processor affinity is defined based on a given processor group, which collects up to 64 processors. By default, threads can run only on available processors within the processor group associated with the process. (This is to maintain compatibility with older versions of Windows, which supported only 64 processors). Developers can alter processor affinity by using the appropriate APIs or by setting an affinity mask in the image header, and users can use tools to change affinity at run time or at process creation. However, although multiple threads in a process can be associated with different groups, a thread on its own can run only on the processors available within its assigned group. Additionally, developers can choose to create group-aware applications, which use extended scheduling APIs to associate logical processors on different groups with the affinity of their threads. Doing so converts the process into a multigroup process that can theoretically run its threads on any available processor within the machine.

After a thread is selected to run, it runs for an amount of time called a quantum. A quantum is the

length of time a thread is allowed to run before another thread at the same priority level is given a turn to

run. Quantum values can vary from system to system and process to process for any of three reasons:

- ■ System configuration settings (long or short quantums, variable or fixed quantums, and priority
separation)

■ Foreground or background status of the process

■ Use of the job object to alter the quantum
These details are explained in the "Quantum" section later in this chapter.

A thread might not get to complete its quantum, however, because Windows implements a preemptive scheduler. That is, if another thread with a higher priority becomes ready to run, the currently running thread might be preempted before finishing its time slice. In fact, a thread can be selected to run next and be preempted before even beginning its quantum!

The Windows scheduling code is implemented in the kernel. There's no single "scheduler" module or routine, however. The code is spread throughout the kernel in which scheduling-related events occur.

214   CHAPTER 4  Threads


---

The routines that perform these duties are collectively called the kernel's dispatcher. The following events might require thread dispatching:

- ■ A thread becomes ready to execute—for example, a thread has been newly created or has just
been released from the wait state.

■ A thread leaves the running state because its time quantum ends, it terminates, it yields execu-
tion, or it enters a wait state.

■ A thread's priority changes, either because of a system service call or because Windows itself
changes the priority value.

■ A thread's processor affinity changes so that it will no longer run on the processor on which it
was running.
At each of these junctions, Windows must determine which thread should run next on the logical processor that was running the thread, if applicable, or on which logical processor the thread should now run. After a logical processor has selected a new thread to run, it eventually performs a context switch to it. A context switch is the procedure of saving the volatile processor state associated with a running thread, loading another thread's volatile state, and starting the new thread's execution.

As noted, Windows schedules at the thread granularity level. This approach makes sense when you consider that processes don't run; rather, they only provide resources and a context in which their threads run. Because scheduling decisions are made strictly on a thread basis, no consideration is given to what process the thread belongs to. For example, if process A has 10 runnable threads, process B has 2 runnable threads, and all 12 threads are at the same priority, each thread would theoretically receive one-twelfth of the CPU time. That is, Windows wouldn't give 50 percent of the CPU to process A and 50 percent to process B.

## Priority levels

To understand the thread-scheduling algorithms, one must first understand the priority levels that

Windows uses. As illustrated in Figure 4-6, Windows uses 32 priority levels internally, ranging from 0

to 31 (31 is the highest). These values divide up as follows:

- ■ Sixteen real-time levels (16 through 31)
■ Sixteen variable levels (0 through 15), out of which level 0 is reserved for the zero page thread
(described in Chapter 5).
![Figure](figures/Winternals7thPt1_page_232_figure_007.png)

FIGURE 4-6 Thread priority levels.

CHAPTER 4  Threads      215


---

Thread priority levels are assigned from two different perspectives: those of the Windows API and

those of the Windows kernel. The Windows API first organizes processes by the priority class to which

they are assigned at creation (the numbers in parentheses represent the internal PROCESS_PRIORITY_

CLASS index recognized by the kernel):

- ● Real-Time (4)

● High (3)

● Above Normal (6)

● Normal (2)

● Below Normal (5)

● Idle (1)
The Windows API SetPriorityClass allows changing a process's priority class to one of these levels.


It then assigns a relative priority of the individual threads within those processes. Here, the numbers

represent a priority delta that is applied to the process base priority:

- Time-Critical (15)

Highest (2)

Above-Normal (1)

Normal (0)

Below-Normal (−1)

Lowest (−2)

Idle (−15)
Time-Critical and idle levels (+15 and −15) are called saturation values and represent specific levels

that are applied rather than true offsets. These values can be passed to the SetThreadPriority Win dows API to change a thread's relative priority.

Therefore, in the Windows API, each thread has a base priority that is a function of its process priority class and its relative thread priority. In the kernel, the process priority class is converted to a base priority by using the PspPriorityTable global array and the PROCESS_PRIORITY_CLASS indices shown earlier, which sets priorities of 4, 8, 13, 24, 6, and 10, respectively. (This is a fixed mapping that cannot be changed.) The relative thread priority is then applied as a differential to this base priority. For example, a Highest thread will receive a thread base priority of two levels higher than the base priority of its process.

This mapping from Windows priority to internal Windows numeric priority is shown graphically in

Figure 4-7 and textually in Table 4-1.

216   CHAPTER 4   Threads


---

![Figure](figures/Winternals7thPt1_page_234_figure_000.png)

FIGURE 4-7 A graphic view of available thread priorities from a Windows API perspective.

TABLE 4-1 Mapping Windows kernel priorities to the Windows API

<table><tr><td>Priority Class Relative Priority</td><td>Real-Time</td><td>High</td><td>Above-Normal</td><td>Normal</td><td>Below-Normal</td><td>Idle</td></tr><tr><td>Time Critical (+Saturation)</td><td>31</td><td>15</td><td>15</td><td>15</td><td>15</td><td>15</td></tr><tr><td>Highest (+2)</td><td>26</td><td>15</td><td>12</td><td>10</td><td>8</td><td>6</td></tr><tr><td>Above Normal (+1)</td><td>25</td><td>14</td><td>11</td><td>9</td><td>7</td><td>5</td></tr><tr><td>Normal (0)</td><td>24</td><td>13</td><td>10</td><td>8</td><td>6</td><td>4</td></tr><tr><td>Below Normal (-1)</td><td>23</td><td>12</td><td>9</td><td>7</td><td>5</td><td>3</td></tr><tr><td>Lowest (-2)</td><td>22</td><td>11</td><td>8</td><td>6</td><td>4</td><td>2</td></tr><tr><td>Idle (-Saturation)</td><td>16</td><td>1</td><td>1</td><td>1</td><td>1</td><td>1</td></tr></table>


You'll note that the Time-Critical and Idle relative thread priorities maintain their respective values

regardless of the process priority class (unless it is Real-Time). This is because the Windows API requests

saturation of the priority from the kernel, by passing in +16 or -16 as the requested relative priority. The

formula used to get these values is as follows (HIGH_PRIORITY equals 31):

```bash
If Time-Critical: ((HIGH_PRIORITY+1) / 2
If Idle: -((HIGH_PRIORITY+1) / 2
```

These values are then recognized by the kernel as a request for saturation, and the Saturaton field in KTHREAD is set. For positive saturation, this causes the thread to receive the highest possible priority within its priority class (dynamic or real-time); for negative saturation, it's the lowest possible one. Additionally, future requests to change the base priority of the process will no longer affect the base priority of these threads because saturated threads are skipped in the processing code.

CHAPTER 4  Threads      217


---

As shown in Table 4-1, threads have seven levels of possible priorities to set as viewed from the Windows API (six levels for the High priority class). The Real-Time priority class actually allows setting all priority levels between 16 and 31 (as shown in Figure 4-7). The values not covered by the standard constants shown in the table can be specified with the values -7, -6, -5, -4, -3, 3, 4, 5, and 6 as an argument to SetThreadPriority. (See the upcoming section "Real-Time priorities" for more information.)

Regardless of how the thread's priority came to be by using the Windows API (a combination of

process priority class and a relative thread priority), from the point of view of the scheduler, only the

final result matters. For example, priority level 10 can be obtained in two ways: a Normal priority class

process (8) with a thread relative priority of Highest (+2), or an Above-Normal priority class process (10)

and a Normal thread relative priority (0). From the scheduler's perspectives, these settings lead to the

same value (10), so these threads are identical in terms of their priority.

Whereas a process has only a single base priority value, each thread has two priority values: current (dynamic) and base. Scheduling decisions are made based on the current priority. As explained in the upcoming section called "Priority boosts," under certain circumstances, the system increases the priority of threads in the dynamic range (1 through 15) for brief periods. Windows never adjusts the priority of threads in the Real-Time range (16 through 31), so they always have the same base and current priority.

A thread's initial base priority is inherited from the process base priority. A process, by default, inherits its base priority from the process that created it. You can override this behavior on the CreateProcess function or by using the command-line start command. You can also change a process priority after it is created by using the SetPriorityClass function or by using various tools that expose that function, such as Task Manager or Process Explorer. (Right-click on the process and choose a new priority class.) For example, you can lower the priority of a CPU-intensive process so that it does not interfere with normal system activities. Changing the priority of a process changes the thread priorities up or down, but their relative settings remain the same.

Normally, user applications and services start with a normal base priority, so their initial thread typically executes at priority level 8. However, some Windows system processes (such as the Session manager, Service Control Manager, and local security authentication process) have a base process priority slightly higher than the default for the Normal class (8). This higher default value ensures that the threads in these processes will all start at a higher priority than the default value of 8.

## Real-Time priorities

You can raise or lower thread priorities within the dynamic range in any application. However, you must

have the increase scheduling priority privilege (SeIncreaseBasePriorityPrivilege) to enter the

Real-Time range. Be aware that many important Windows kernel-mode system threads run in the Real Time priority range, so if threads spend excessive time running in this range, they might block critical

system functions (such as in the memory manager, cache manager, or some device drivers).

Using the standard Windows APIs, once a process has entered the Real-Time range, all its threads

(even Idle ones) must run at one of the Real-Time priority levels. It is thus impossible to mix real-time and

dynamic threads within the same process through standard interfaces. This is because the SetThread Priority API calls the native NtSetInformationThread API with the ThreadBasePriority information

218    CHAPTER 4  Threads


---

class, which allows priorities to remain only in the same range. Furthermore, this information class allows priority changes only in the recognized Windows API deltas of -2 to 0 (or Time- Critical/Idle) unless the request comes from CSRSS or another real-time process. In other words, this means that a real-time process can pick thread priorities anywhere between 16 and 31, even though the standard Windows API relative thread priorities would seem to limit its choices based on the table that was shown earlier.

As mentioned, calling SetThreadPriority with one of a set of special values causes a call to

NtSetInformationThread with the ThreadActualBasePriority information class, the kernel base

priority for the thread can be directly set, including in the dynamic range for a real-time process.

![Figure](figures/Winternals7thPt1_page_236_figure_002.png)

Note The name real-time does not imply that Windows is a real-time OS in the common definition of the term. This is because Windows doesn't provide true, real-time OS facilities, such as guaranteed interrupt latency or a way for threads to obtain a guaranteed execution time. The term real-time really just means "higher than all the others. "

## Using tools to interact with priority

You can change (and view) the base-process priority with Task Manager and Process Explorer. You can

kill individual threads in a process with Process Explorer (which should be done, of course, with extreme

care).

You can view individual thread priorities with Performance Monitor, Process Explorer, or WinDbg.

Although it might be useful to increase or decrease the priority of a process, it typically does not make

sense to adjust individual thread priorities within a process because only a person who thoroughly

understands the program (in other words, the developer) would understand the relative importance of

the threads within the process.

The only way to specify a starting priority class for a process is with the start command in the Windows command prompt. If you want to have a program start every time with a specific priority, you can define a shortcut to use the start command by beginning the command with cmd /c. This runs the command prompt, executes the command on the command line, and terminates the command prompt. For example, to run Notepad in the Idle-process priority, the command is cmd /c start /low Notepad.exe.

## EXPERIMENT: Examining and specifying process and thread priorities

To examine and specify process and thread priorities, follow these steps:

- 1. Run notepad.exe normally—for example, by typing Notepad in a command window.

2. Open Task Manager and click to the Details tab.

3. Add a column named Base Priority. This is the name Task Manager uses for priority

class.
---

4. Find Notepad in the list. You should see something like the following:

![Figure](figures/Winternals7thPt1_page_237_figure_001.png)

5. Notice the Notepad process running with the Normal priority class (8) and that Task Manager shows the Idle priority class as Low.

6. Open Process Explorer.

7. Double-click the Notepad process to show its Properties dialog box and click the

Threads tab.

8. Select the first thread (if there's more than one). You should see something like this:

![Figure](figures/Winternals7thPt1_page_237_figure_006.png)

220    CHAPTER 4   Threads


---

9. Notice the thread's priorities. Its base priority is 8 but its current (dynamic) priority is 10. (The reason for this priority boost is discussed in the upcoming "Priority boosts" section.)

10. If you want, you can suspend and kill the thread. (Both operations must be used with caution, of course.)

11. In Task Manager, right-click the Notepad process, select Set Priority, and set the value to High, as shown here:

![Figure](figures/Winternals7thPt1_page_238_figure_003.png)

12. Accept the confirmation dialog box change and go back to Process Explorer. Notice that

the thread's priority has jumped to the new base for High (13). The dynamic priority has

made the same relative jump:

![Figure](figures/Winternals7thPt1_page_238_figure_005.png)

13. In Task Manager, change the priority class to Realtime. (You must be an administrator

on the machine for this to succeed. Note that you can also make this change in Process

Explorer.)

CHAPTER 4   Threads      221


---

14. In Process Manager, notice that the base and dynamic priorities of the thread are now 24. Recall that the kernel never applies priority boosts for threads in the Real-Time priority range.

![Figure](figures/Winternals7thPt1_page_239_figure_001.png)

## Windows System Resource Manager

Windows Server 2012 R2 Standard Edition and higher SKUs include an optionally installable

component called Windows System Resource Manager (WSRM). It permits the administrator to

configure policies that specify CPU utilization, affinity settings, and memory limits (both physical

and virtual) for processes. In addition, WSRM can generate resource-utilization reports that can

be used for accounting and verification of service-level agreements with users.

Policies can be applied for specific applications (by matching the name of the image with or

without specific command-line arguments), users, or groups. The policies can be scheduled to

take effect at certain periods or can be enabled all the time.

After you set a resource-allocation policy to manage specific processes, the WSRM service

monitors CPU consumption of managed processes and adjusts process base priorities when

those processes do not meet their target CPU allocations.

The physical memory limitation uses the function SetProcessingSetsIzeEx to set a

hard-working set maximum. The virtual memory limit is implemented by the service checking

the private virtual memory consumed by the processes. (See Chapter 5 for an explanation of

these memory limits.) If this limit is exceeded, WSRM can be configured to either kill the processes

or write an entry to the event log. This behavior can be used to detect a process with a memory

222   CHAPTER 4   Threads


---

leak before it consumes all the available committed memory on the system. Note that WSRM memory limits do not apply to Address Windowing Extensions (AWE) memory, large page memory, or kernel memory (non-paged or paged pool). (See Chapter 5 for more information on these terms.)

Thread states

Before looking at the thread-scheduling algorithms, you must understand the various execution states that a thread can be in. The thread states are as follows:

• Ready A thread in the ready state is waiting to execute or to be in-swapped after completing a wait. When looking for a thread to execute, the dispatcher considers only the threads in the ready state.

• Deferred ready This state is used for threads that have been selected to run on a specific processor but have not actually started running there. This state exists so that the kernel can minimize the amount of time the per-processor lock on the scheduling database is held.

• Standby A thread in this state has been selected to run next on a particular processor. When the correct conditions exist, the dispatcher performs a context switch to this thread. Only one thread can be in the standby state for each processor on the system. Note that a thread can be preempted out of the standby state before it ever executes (if, for example, a higher-priority thread becomes runnable before the standby thread begins execution).

• Running A thread performs a context switch to a thread, the thread enters the running state and executes. The thread's execution continues until its quantum ends (and another thread at the same priority is ready to run), it is preempted by a higher-priority thread, it terminates, it yields execution, or it voluntarily enters the waiting state.

• Waiting A thread can enter the waiting state in several ways: A thread can voluntarily wait for an object to synchronize its execution, the OS can wait on the thread's behalf (such as to resolve a paging I/O), or an environment subsystem can direct the thread to suspend itself. When the thread's wait ends, depending on its priority, the thread either begins running immediately or is moved back to the ready state.

• Transition A thread enters the transition state if it is ready for execution but its kernel stack is paged out of memory. After its kernel stack is brought back into memory, the thread enters the ready state. (Thread stacks are discussed in Chapter 5).

• Terminated When a thread finishes executing, it enters this state. After the thread is terminated, the executive thread object (the data structure in system memory that describes the thread) might or might not be deallocated. The object manager sets the policy regarding when to delete the object. For example, the object remains if there are any open handles to the thread. A thread can also enter the terminated state from other states if it's killed explicitly by some other thread—for example, by calling the TerminateThread Windows API.

• Initialized This state is used internally while a thread is being created.

CHAPTER 4 Threads 223


---

Figure 4-8 shows the main state transitions for threads. The numeric values shown represent the internal values of each state and can be viewed with a tool such as Performance Monitor. The ready and deferred ready states are represented as one. This reflects the fact that the deferred ready state acts as a temporary placeholder for the scheduling routines. This is true for the standby state as well. These states are almost always very short-lived. Threads in these states always transition quickly to ready, running, or waiting.

![Figure](figures/Winternals7thPt1_page_241_figure_001.png)

FIGURE 4-8 Thread states and transitions.

EXPERIMENT: Thread-scheduling state changes

You can watch thread-scheduling state changes with the Performance Monitor tool in Windows.

This utility can be useful when you're debugging a multithreaded application and you're unsure

about the state of the threads running in the process. To watch thread-scheduling state changes

by using the Performance Monitor tool, follow these steps:

- 1. Download the CPU Stress tool from the book's downloadable resources.

2. Run CPUSTRES.exe. Thread 1 should be active.

3. Activate thread 2 by selecting it in the list and clicking the Activate button or by right-

clicking it and selecting Activate from the context menu. The tool should look some-

thing like this:
224    CHAPTER 4   Threads


---

![Figure](figures/Winternals7thPt1_page_242_figure_000.png)

4. Click the Start button and type perfmon to start the Performance Monitor tool.

5. If necessary, select the chart view. Then remove the existing CPU counter.

6. Right-click the graph and choose Properties.

7. Click the Graph tab and change the chart vertical scale maximum to 7. (As you saw in Figure 4-8, the various states are associated with numbers 0 through 7.) Then click OK.

8. Click the Add button on the toolbar to open the Add Counters dialog box.

9. Select the Thread performance object and then select the Thread State counter.

10. Select the Show Description check box to see the definition of the values:

![Figure](figures/Winternals7thPt1_page_242_figure_008.png)

11. In the Instances box, select <All instances>. Then type cpustres and click Search.

12. Select the first three threads of cpustres (/custers/0, cpustres/1, and cpustres/2) and click the Add >> button. Then click OK. Thread 0 should be in state 5 (waiting), because that's the GUI thread and it's waiting for user input. Threads 1 and 2 should be alternating between states 2 and 5 (running and waiting). (Thread 1 may be hiding thread 2 as they're running with the same activity level and the same priority.)

CHAPTER 4  Threads      225


---

![Figure](figures/Winternals7thPt1_page_243_figure_000.png)

13. Go back to CPU Stress, right-click thread 2, and choose Busy from the activity context

menu. You should see thread 2 in state 2 (running) more often than thread 1:

![Figure](figures/Winternals7thPt1_page_243_figure_002.png)

14. Right-click thread 1 and choose an activity level of Maximum. Then repeat this step for thread 2. Both threads now should be constantly in state 2 because they're running essentially an infinite loop:

226   CHAPTER 4   Threads


---

![Figure](figures/Winternals7thPt1_page_244_figure_000.png)

If you're trying this on a single processor system, you'll see something different. Because there is only one processor, only one thread can execute at a time, so you'll see the two threads alternating between states 1 (ready) and 2 (running):

![Figure](figures/Winternals7thPt1_page_244_figure_002.png)

15. If you're on a multiprocessor system (very likely), you can get the same effect by going to Task Manager, right-clicking the CPUSTRES process, selecting Set Affinity, and then select just one processor—it doesn't matter which one—as shown here. (You can also do it from CPU Stress by opening the Process menu and selecting Affinity.)

CHAPTER 4  Threads      227


---

![Figure](figures/Winternals7thPt1_page_245_figure_000.png)

16. There's one more thing you can try. With this setting in place, go back to CPU Stress, right-click thread 1, and choose a priority of Above Normal. You'll see that thread 1 is running continuously (state 2) and thread 2 is always in the ready state (state 1). This is because there's only one processor, so in general, the higher priority thread wins out. From time to time, however, you'll see a change in thread 1's state to ready. This is because every 4 seconds or so, the starved thread gets a boost that enables it to run for a little while. (Often, this state change is not reflected by the graph because the granularity of Performance Monitor is limited to 1 second, which is too coarse.) This is described in more detail later in this chapter in the section "Priority boosts."

![Figure](figures/Winternals7thPt1_page_245_figure_002.png)

