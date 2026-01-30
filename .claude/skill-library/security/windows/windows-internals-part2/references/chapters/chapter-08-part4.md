
Enhanced timers were introduced to satisfy a long list of requirements that previous timer system improvements had still not yet addressed. For one, although timer coalescing reduced power usage, it also made timers have inconsistent expiration times, even when there was no need to reduce power (in other words, coalescing was an all-or-nothing proposition). Second, the only mechanism in Windows for high-resolution timers was for applications and drivers to lower the clock tick globally, which, as we've seen, had significant negative impact on systems. And, ironically, even though the resolution of these timers was now higher, they were not necessarily more precise because regular time expiration can happen before the clock tick, regardless of how much more granular it's been made.

Finally, recall that the introduction of Connected/Modern Standby, described in Chapter 6 of Part 1, added features such as timer virtualization and the Desktop Activity Modulator (DAM), which actively delay the expiration of timers during the resiliency phase of Modern Standby to simulate S3 sleep. However, some key system timer activity must still be permitted to periodically run even during this phase.

These three requirements led to the creation of enhanced timers, which are also internally known as Timer2 objects, and the creation of new system calls such as NtCreateTimer2 and NtSetTimer2, as well as driver APIs such as ExAllocateTimer and ExSetTimer. Enhanced timers support four modes of behavior, some of which are mutually exclusive:

- ■ No-wake This type of enhanced timer is an improvement over timer coalescing because it
provides for a tolerable delay that is only used in periods of sleep.
■ High-resolution This type of enhanced timer corresponds to a high-resolution timer with a
precise clock rate that is dedicated to it. The clock rate will only need to run at this speed when
approaching the expiration of the timer.
■ Idle-resilient This type of enhanced timer is still active even during deep sleep, such as the
resiliency phase of modern standby.
■ Finite This is the type for enhanced timers that do not share one of the previously described
properties.
High-resolution timers can also be idle resilient, and vice-versa. Finite timers, on the other hand, cannot have any of the described properties. Therefore, if finite enhanced timers do not have any "special" behavior, why create them at all? It turns out that since the new Timer2 infrastructure was a rewrite of the legacy timer logic that's been there since the start of the kernel's life, it includes a few other benefits regardless of any special functionality:

- ■ It uses self-balancing red-black binary trees instead of the linked lists that form the timer table.

■ It allows drivers to specify an enable and disable callback without worrying about manually

creating DPCs.

■ It includes new, clean, ETW tracing entries for each operation, aiding in troubleshooting.

■ It provides additional security-in-depth through certain pointer obfuscation techniques and

additional assertions, hardening against data-only exploits and corruption.
---

Therefore, driver developers that are only targeting Windows 8.1 and later are highly recommended to use the new enhanced timer infrastructure, even if they do not require the additional capabilities.

![Figure](figures/Winternals7thPt2_page_110_figure_001.png)

Note The documented ExAllocateTimer API does not allow drivers to create idle-resilient timers. In fact, such an attempt crashes the system. Only Microsoft inbox drivers can create such timers through the ExAllocateTimerInternal API. Readers are discouraged from attempting to use this API because the kernel maintains a static, hard-coded list of every known legitimate caller, tracked by a unique identifier that must be provided, and further has knowledge of how many such timers the component is allowed to create. Any violations result in a system crash (blue screen of death).

Enhanced timers also have a more complex set of expiration rules than regular timers because they end up having two possible due times. The first, called the minimum due time, specifies the earliest system clock time at which point the timer is allowed to expire. The second, maximum due time, is the latest system clock time at which the timer should ever expire. Windows guarantees that the timer will expire somewhere between these two points in time, either because of a regular clock tick every interval (such as 15 ms), or because of an ad-hoc check for timer expiration (such as the one that the idle thread does upon waking up from an interrupt). This interval is computed by taking the expected expiration time passed in by the developer and adjusting for the possible “no wake tolerance” that was passed in. If unlimited wake tolerance was specified, then the timer does not have a maximum due time.

As such, a Timer2 object lives in potentially up to two red-black tree nodes—node 0, for the minimum due time checks, and node 1, for the maximum due time checks. No-wake and high-resolution timers live in node 0, while finite and idle-resilient timers live in node 1.

Since we mentioned that some of these attributes can be combined, how does this fit in with the two nodes? Instead of a single red-black tree, the system obviously needs to have more, which are called collections (see the public KTIMER2_COLLECTION_INDEX data structure), one for each type of enhanced timer we've seen. Then, a timer can be inserted into node 0 or node 1, or both, or neither, depending on the rules and combinations shown in Table 8-11.

TABLE 8-11 Timer types and node collection indices

<table><tr><td>Timer type</td><td>Node 0 collection index</td><td>Node 1 collection index</td></tr><tr><td>No-wake</td><td>NoWake, if it has a tolerance</td><td>NoWake, if it has a non-unlimited or no tolerance</td></tr><tr><td>Finite</td><td>Never inserted in this node</td><td>Finite</td></tr><tr><td>High-resolution</td><td>Hr, always</td><td>Finite, if it has a non-unlimited or no tolerance</td></tr><tr><td>Idle-resilient</td><td>NoWake, if it has a tolerance</td><td>Ir, if it has a non-unlimited or no tolerance</td></tr><tr><td>High-resolution &amp; Idle-resilient</td><td>Hr, always</td><td>Ir, if it has a non-unlimited or no tolerance</td></tr></table>


Think of node 1 as the one that mirrors the default legacy timer behavior—every clock tick, check if a timer is due to expire. Therefore, a timer is guaranteed to expire as long as it's in at least node 1, which implies that its minimum due time is the same as its maximum due time. If it has unlimited tolerance;

---

however, it won't be in node 1 because, technically, the timer could never expire if the CPU remains sleeping forever.

High-resolution timers are the opposite; they are checked exactly at the "right" time they're supposed to expire and never earlier, so node 0 is used for them. However, if their precise expiration time is "too early" for the check in node 0, they might be in node 1 as well, at which point they are treated like a regular (finite) timer (that is, they expire a little bit later than expected). This can also happen if the caller provided a tolerance, the system is idle, and there is an opportunity to coalesce the timer.

Similarly, an idle-resilient timer, if the system isn't in the resiliency phase, lives in the NoWake collection if it's not also high resolution (the default enhanced timer state) or lives in the Hr collection otherwise. However, on the clock tick, which checks node 1, it must be in the special /r collection to recognize that the timer needs to execute even though the system is in deep sleep.

Although it may seem confusing at first, this state combination allows all legal combinations of timers to behave correctly when checked either at the system clock tick (node 1—enforcing a maximum due time) or at the next closest due time computation (node 0—enforcing a minimum due time).

As each timer is inserted into the appropriate collection (KTIMER2_COLLECTION) and associated red-black tree node(s), the collection's next due time is updated to be the earliest due time of any timer in the collection, whereas a global variable (KiNextTimer2Due) reflects the earliest due time of any timer in any collection.

EXPERIMENT: Listing enhanced system timers

You also can use the same kernel debugger shown earlier to display enhanced timers (Timer2's), which are shown at the bottom of the output:

```bash
KTIMER2s:
Address,                Due time,                        Exp. Type  Callback, Attributes,
ffffffffa840f6070b0  1825b8f1f4 [11/30/2020 20:50:16.089] (Interrupt) [None] NWF (1826ea6e14
                                                [11/30/2020 20:50:18.089]
ffffffffa83ff903e48  1825c45674 [11/30/2020 20:50:16.164] (Interrupt) [None] NW P (27ef6380)
ffffffffa843fdb24960  1825dd19e8 [11/30/2020 20:50:16.326] (Interrupt) [None] NWF (1828da0a68
                                                [11/30/2020 20:50:21.326]
ffffffffa8410c07eb8  1825e2d9c6 [11/30/2020 20:50:16.364] (Interrupt) [None] NW P (27ef6380)
ffffffffa83f75bd38e  1825e6fc84  [11/30/2020 20:50:16.391] (Interrupt) [None] NW P (27ef6380)
ffffffffa8407010e60  1825ec5ae8 [11/30/2020 20:50:16.426] (Interrupt) [None] NWF (1828e4a68
                                                [11/30/2020 20:50:21.426]
ffffffffa843f7a194a0  1825fe1d10 [11/30/2020 20:50:16.543] (Interrupt) [None] NWF (18277fa410
                                                [11/30/2020 20:50:18.543]
ffffffffa843fd29a8f8  18261691e3 [11/30/2020 20:50:16.703] (Interrupt) [None] NW P (11e1a300)
ffffffffa843ffcc2660  18261707d3 [11/30/2020 20:50:16.706] (Interrupt) [None] NWF (18265bd903
                                                [11/30/2020 20:50:17.157]
ffffffffa8437a19e30  182619f439 [11/30/2020 20:50:16.725] (Interrupt) [None] NWF (18291ea4b9
                                                [11/30/2020 20:50:21.725]
ffffffffa843ff9cfe48  182745de01 [11/30/2020 20:50:18.691] (Interrupt) [None] NW P (11e1a300)
ffffffffa843f3ce740  1827656a749 [11/30/2020 20:50:18.897] (Interrupt)
                          Wdf010001FxTimer::_FxTimerExtCallbackThunk Context @ ffffffff4a83fdb7360) NWF
(1827ddbfe29 11/30/2020 20:50:19.897) IP (02fafa08)
```

---

```bash
FFFFF48404c02938   18276c500 [11/30/2020 20:50:18.943] {Interrupt} {None} NW P (27ef6380)
 FFFFF483fde8e300   1827a0fdb5 [11/30/2020 20:50:19.288] {Interrupt} {None} NWf (183091c635
                                             [11/30/2020 20:50:34.288]
 FFFFF483fde88580   1827d4fcfb5 [11/30/2020 20:50:19.628] {Interrupt} {None} NWf (1829062b5
                                             [11/30/2020 20:50:21.628]
```

In this example, you can mostly see No-wake (NW) enhanced timers, with their minimum due

time shown. Some are periodic (P) and will keep being reinserted at expiration time. A few also

have a maximum due time, meaning that they have a tolerance specified, showing you the latest

time at which they might expire. Finally, one enhanced timer has a callback associated with it,

owned by the Windows Driver Foundation (WDF) framework (see Chapter 6 of Part 1 for more

information on WDF drivers).

## System worker threads

During system initialization, Windows creates several threads in the System process, called system worker threads, which exist solely to perform work on behalf of other threads. In many cases, threads executing at DPC/dispatch level need to execute functions that can be performed only at a lower IRQL. For example, a DPC routine, which executes in an arbitrary thread context (because DPC execution can usur any thread in the system) at DPC/dispatch level IRQL might need to access paged pool or wait for a dispatcher object used to synchronize execution with an application thread. Because a DPC routine can't lower the IRQL, it must pass such processing to a thread that executes at an IRQL below DPC/dispatch level.

Some device drivers and executive components create their own threads dedicated to processing work at passive level; however, most use system worker threads instead, which avoids the unnecessary scheduling and memory overhead associated with having additional threads in the system. An executive component requests a system worker thread's services by calling the executive functions

ExQueueWorkItem or IoQueueWorkItem. Device drivers should use only the latter (because this associates the work item with a Device object, allowing for greater accountability and the handling of scenarios in which a driver unloads while its work item is active). These functions place a work item on a queue dispatcher object where the threads look for work. (Queue dispatcher objects are described in more detail in the section "I/O completion ports" in Chapter 6 in Part 1.)

The ioQueueWorkItemEx, iosizeForWorkItem, iInitializeWorkItem, and ioUninitializeWorkItem APIs

act similarly, but they create an association with a driver's Driver object or one of its Device objects.

Work items include a pointer to a routine and a parameter that the thread passes to the routine when it processes the work item. The device driver or executive component that requires passive-level execution implements the routine. For example, a DPC routine that must wait for a dispatcher object can initialize a work item that points to the routine in the driver that waits for the dispatcher object. At some stage, a system worker thread will remove the work item from its queue and execute the driver's routine. When the driver's routine finishes, the system worker thread checks to see whether there are more work items to process. If there aren't any more, the system worker thread blocks until a work item

---

is placed on the queue. The DPC routine might or might not have finished executing when the system

worker thread processes its work item.

There are many types of system worker threads:

- ■ Normal worker threads execute at priority 8 but otherwise behave like delayed worker threads.
■ Background worker threads execute at priority 7 and inherit the same behaviors as normal
worker threads.
■ Delayed worker threads execute at priority 12 and process work items that aren't considered
time-critical.
■ Critical worker threads execute at priority 13 and are meant to process time-critical work items.
■ Super-critical worker threads execute at priority 14, otherwise mirroring their critical counterparts.
■ Hyper-critical worker threads execute at priority 15 and are otherwise just like other critical threads.
■ Real-time worker threads execute at priority 18, which gives them the distinction of operating in
the real-time scheduling range (see Chapter 4 of Part 1 for more information), meaning they are
not subject to priority boosting nor regular time slicing.
Because the naming of all of these worker queues started becoming confusing, recent versions of

Windows introduced custom priority worker threads, which are now recommended for all driver devel opers and allow the driver to pass in their own priority level.

A special kernel function, ExpLegacyWorkerInitialization, which is called early in the boot process, appears to set an initial number of delayed and critical worker queue threads, configurable through optional registry parameters. You may even have seen these details in an earlier edition of this book. Note, however, that these variables are there only for compatibility with external instrumentation tools and are not actually utilized by any part of the kernel on modern Windows 10 systems and later. This is because recent kernels implemented a new kernel dispatcher object, the priority queue (KPRQUEUE), coupled it with a fully dynamic number of kernel worker threads, and further split what used to be a single queue of worker threads into per-NUMA node worker threads.

On Windows 10 and later, the kernel dynamically creates additional worker threads as needed, with a default maximum limit of 4096 (see ExpMaximumKernelWorkerThreads) that can be configured through the registry up to a maximum of 16,384 threads and down to a minimum of 32. You can set this using the MaximumKernelWorkerThreads value under the registry key HKLM\SYSTEM\ CurrentControlSet\Control\SessionManager\Execute.

Each partition object, which we described in Chapter 5 of Part 1, contains an executive partition, which is the portion of the partition object relevant to the executive—namely, the system worker thread logic. It contains a data structure tracking the work queue manager for each NUMA node part of the partition (a queue manager is made up of the deadlock detection timer, the work queue item reaper, and a handle to the actual thread doing the management). It then contains an array of pointers to each of the eight possible work queues (EX_WORK_QUEUE). These queues are associated with an individual index and track the number of minimum (guaranteed) and maximum threads, as well as how many work items have been processed so far.

CHAPTER 8 System mechanisms



---

Every system includes two default work queues: the ExPool queue and the IoPool queue. The former is used by drivers and system components using the ExQueueWorkItem API, whereas the latter is meant for IoAllocateWorkItem-type APIs. Finally, up to six more queues are defined for internal system use, meant to be used by the internal (non-exported) ExQueueWorkItemToPrivatePool API, which takes in a pool identifier from 0 to 5 (making up queue indices 2 to 7). Currently, only the memory manager's Store Manager (see Chapter 5 of Part 1 for more information) leverages this capability.

The executive tries to match the number of critical worker threads with changing workloads as the system executes. Whenever work items are being processed or queued, a check is made to see if a new worker thread might be needed. If so, an event is signaled, waking up the

ExpWorkQueueManagerThread for the associated NUMA node and partition. An additional worker

thread is created in one of the following conditions:

- There are fewer threads than the minimum number of threads for this queue.
The maximum thread count hasn't yet been reached, all worker threads are busy, and there are
pending work items in the queue, or the last attempt to try to queue a work item failed.
Additionally, once every second, for each worker queue manager (that is, for each NUMA node on each partition) the ExpWorkQueueManagerThread can also try to determine whether a deadlock may have occurred. This is defined as an increase in work items queued during the last interval without a matching increase in the number of work items processed. If this is occurring, an additional worker thread will be created, regardless of any maximum thread limits, hoping to clear out the potential deadlock. This detection will then be disabled until it is deemed necessary to check again (such as if the maximum number of threads has been reached). Since processor topologies can change due to hot add dynamic processors, the thread is also responsible for updating any affinities and data structures to keep track of the new processors as well.

Finally, once every double the worker thread timeout minutes (by default 10, so once every 20 minutes), this thread also checks if it should destroy any system worker threads. Through the same registry key, this can be configured to be between 2 and 120 minutes instead, using the value

WorkerThreadTimeoutSeconds. This is called reaping and ensures that system worker thread counts do not get out of control. A system worker thread is reaped if it has been waiting for a long time (defined as the worker thread timeout value) and no further work items are waiting to be processed (meaning the current number of threads are clearing them all out in a timely fashion).

## EXPERIMENT: Listing system worker threads

Unfortunately, due to the per-partition reshuffling of the system worker thread functionality (which is no longer per-NUMA node as before, and certainly no longer global), the kernel debugger's lexquem command can no longer be used to see a listing of system worker threads classified by their type and will error out.

Since the EPARTITION, EX_PARTITION, and EX_WORK_QUEUE data structures are all available in the public symbols, the debugger data model can be used to explore the queues and their

CHAPTER 8 System mechanisms     83


---

manager. For example, here is how you can look at the NUMA Node 0 worker thread manager for the main (default) system partition:

```bash
!kdx dx ((ntl_EX_PARTITION)(&ntl_EX_PARTITION)&!ntl:PpsSystemPartition)->ExPartition->
     WorkQueueManagers[0]
((ntl_EX_PARTITION)&(ntl_EX_PARTITION)&!ntl:PpsSystemPartition)->ExPartition->
     WorkQueueManagers[0]   : 0xffff483edea99d0 [Type: EX_WORK_QUEUE_MANAGER *)
     [+0x000] Partition       : 0xffff483ede1090 [Type: EX_PARTITION *]
     [+0x008] Node          : 0xfffff80467f24440 [Type: .ENODE *]
     [+0x100] Event        : Type: _KVENT]
     [+0x000] DeadlockTime    : Type: .KVENT]
     [+0x008] ReaperEvent      : Type: .KVENT]
     [+0x008] ReaperTimer      : Type: .KTIMER2
     [+0x108] ThreadHandle      : 0xffffff80000008 [Type: void *]
     [+0x110] ExitThread       : 0x0 [Type: unsigned long]
     [+0x114] ThreadSeed       : 0x1 [Type: unsigned short]
```

Alternatively, her is the ExPool for NUMA Node 0, which currently has 15 threads and has processed almost 4 million work items so far!

```bash
!kbx dx ((ntl_EX_PARTITION)(&ntl_EX_PARTITION)&&ntlPspSystemPartition->ExPartition>>
WorkQueue[0][0],
((ntl_EX_PARTITION)&(ntl_EX_PARTITION)&&ntlPspSystemPartition)->ExPartition>>
WorkQueue[0][0],d : 0xffff4836edde4c70 [Type: _EX_WORK_QUEUE *]
[+0x00] WorkPrioque    [Type: _KPIQUEUE]
[+0x2b0] Partition     : 0xffff4836edde1090 [Type: _EX_PARTITION *]
[+0x2b8] Node           : 0xffff80467f2f40 [Type: _ENODE *]
[+0x2c0] WorkItemsProcessed : 39420957 [Type: unsigned long]
[+0x2c4] WorkItemsProcessedLastPass : 931167 [Type: unsigned long]
[+0x2c8] ThreadCount   : 15 [Type: long]
[+0x2cc (30: 0)] MinThreads      : 0 [Type: long]
[+0x2cc (31:33)] TryFailed      : 0 [Type: unsigned long]
[+0x2d0] MaxThreads     : 4096 [Type: long]
[+0x2d4] QueueIndex       : ExPoolUntrusted () [Type: _EXQUEUEINDEX]
[+0x2d8] AllThreadsExitedEvent : 0x0 [Type: _KEVENT *]
```

You could then look into the ThreadList field of the WorkPriorQueue to enumerate the worker

threads associated with this queue:

```bash
1kxd dx -r0 @queue = ((ntl_EX_PARTITION)*((ntl_EPARITION)*&ntl_PsySystemPartition)>\
ExPartition)=)→WorkQueues[0][0]
@queue = ((ntl_EX_PARTITION)*((ntl_EPARTION)*&ntl_PsySystemPartition)>ExPartition)=)
    WorkQueues[0][0] = 0x8994a83e4de4c70 [Type: _EX_WORK_QUEUE*]
1kxd dx Debugger.Utility.Collections.FromListEntry(@@queue->WorkPriQueue.ThreadListHead,
    "ntl_KTHREAD", "QueueListEntry")
Debugger.Utility.Collections.FromListEntry(@@queue->WorkPriQueue.ThreadListHead,
    "ntl_KTHREAD", "QueueListEntry")
    [0x0]                [Type: _KTHREAD]
    [0x1]                [Type: _KTHREAD]
    [0x2]                [Type: _KTHREAD]
    [0x3]                [Type: _KTHREAD]
    [0x4]                [Type: _KTHREAD]
    [0x5]                [Type: _KTHREAD]
    [0x6]                [Type: _KTHREAD]
```

---

```bash
[0x7]       [Type: _KTHREAD]
[0x8]       [Type: _KTHREAD]
[0x9]       [Type: _KTHREAD]
[0xa]       [Type: _KTHREAD]
[0xb]       [Type: _KTHREAD]
[0xc]       [Type: _KTHREAD]
[0xd]       [Type: _KTHREAD]
[0xe]       [Type: _KTHREAD]
[0xf]       [Type: _KTHREAD]
```

That was only the ExPool. Recall that the system also has an IoPool, which would be the next

index (1) on this NUMA Node (0). You can also continue the experiment by looking at private

pools, such as the Store Manager's pool.

```bash
lkbd dx ((nti_EX_PARTITION)*((nti_EX_PARTITION*)&ntiPspSystemPartition)->ExPartition>>
WorkQueues[0],1);
((nti_EX_PARTITION)*((nti_EX_PARTITION*)&ntiPspSystemPartition)->ExPartition>>
WorkQueues[0],1, d : 0xfffff483ede7c50 [Type: EX_WORK_QUEUE *]
[-0x000] WorkPrQueue      : [Type: _KRIQUEUE]
[-0x2b0] Partition       : 0xfffff483ede51090 [Type: EX_PARTITION *]
[-0x2b8] Node             : 0xfffff486f74f4440 [Type: _ENODE *]
[-0x2c0] ItemsProcessed : 100767 [Type: unsigned long]
[-0x2c4] WorkItemsProcessedLastPassed : 10485 [Type: unsigned long]
[-0x2c8] ThreadCount      : 5 [Type: long]
[-0x2cc (30: 0)] MinThreads   : 0 [Type: long]
[-0x2cc (31:31)] TryFailed    : 0 [Type: unsigned long]
[-0x2d0] MaxThreads      : 4096 [Type: long]
[-0x2d4] QueueIndex       : IoPoolUntrusted (1) [Type: _EXQUEUEINDEX]
[-0x2d8] AllThreadsExitedEvent : 0x0 [Type: _KEVENT *]
```

## Exception dispatching

In contrast to interrupts, which can occur at any time, exceptions are conditions that result directly from the execution of the program that is running. Windows uses a facility known as structured exception handling, which allows applications to gain control when exceptions occur. The application can then fix the condition and return to the place the exception occurred, unwind the stack (thus terminating execution of the subroutine that raised the exception), or declare back to the system that the exception isn't recognized, and the system should continue searching for an exception handler that might process the exception. This section assumes you're familiar with the basic concepts behind Windows structured exception handling—if you're not, you should read the overview in the Windows API reference documentation in the Windows SDK or Chapters 23 through 25 in Jeffrey Richter and Christophe Nasarre's book Windows via C/C++ (Microsoft Press, 2007) before proceeding. Keep in mind that although exception handling is made accessible through language extensions (for example, the __try construct in Microsoft Visual C++), it is a system mechanism and hence isn't language specific.

On the x86 and x64 processors, all exceptions have predefined interrupt numbers that directly correspond to the entry in the IDT that points to the trap handler for a particular exception. Table 8-12 shows x86-defined exceptions and their assigned interrupt numbers. Because the first entries of the IDT are used for exceptions, hardware interrupts are assigned entries later in the table, as mentioned earlier.

CHAPTER 8    System mechanisms      85


---

All exceptions, except those simple enough to be resolved by the trap handler, are serviced by a kernel module called the exception dispatcher. The exception dispatcher's job is to find an exception handler that can dispose of the exception. Examples of architecture-independent exceptions that the kernel defines include memory-access violations, integer divide-by-zero, integer overflow, floatingpoint exceptions, and debugger breakpoints. For a complete list of architecture-independent exceptions, consult the Windows SDK reference documentation.

TABLE 8-12 x86 exceptions and their interrupt numbers

<table><tr><td>Interrupt Number</td><td>Exception</td><td>Mnemonic</td></tr><tr><td>0</td><td>Divide Error</td><td>#DE</td></tr><tr><td>1</td><td>Debug (Single Step)</td><td>#DB</td></tr><tr><td>2</td><td>Non-Maskable Interrupt (NMI)</td><td>-</td></tr><tr><td>3</td><td>Breakpoint</td><td>#BP</td></tr><tr><td>4</td><td>Overflow</td><td>#OF</td></tr><tr><td>5</td><td>Bounds Check (Range Exceeded)</td><td>#BR</td></tr><tr><td>6</td><td>Invalid Opcode</td><td>#UD</td></tr><tr><td>7</td><td>NPX Not Available</td><td>#NM</td></tr><tr><td>8</td><td>Double Fault</td><td>#DF</td></tr><tr><td>9</td><td>NPX Segment Overrun</td><td>-</td></tr><tr><td>10</td><td>Invalid Task State Segment (TSS)</td><td>#TS</td></tr><tr><td>11</td><td>Segment Not Present</td><td>#NP</td></tr><tr><td>12</td><td>Stack-Segment Fault</td><td>#SS</td></tr><tr><td>13</td><td>General Protection</td><td>#GP</td></tr><tr><td>14</td><td>Page Fault</td><td>#PF</td></tr><tr><td>15</td><td>Intel Reserved</td><td>-</td></tr><tr><td>16</td><td>x87 Floating Point</td><td>#MF</td></tr><tr><td>17</td><td>Alignment Check</td><td>#AC</td></tr><tr><td>18</td><td>Machine Check</td><td>#MC</td></tr><tr><td>19</td><td>SIMD Floating Point</td><td>#XM or #XF</td></tr><tr><td>20</td><td>Virtualization Exception</td><td>#VE</td></tr><tr><td>21</td><td>Control Protection (CET)</td><td>#CP</td></tr></table>


The kernel traps and handles some of these exceptions transparently to user programs. For example, encountering a breakpoint while executing a program being debugged generates an exception, which the kernel handles by calling the debugger. The kernel handles certain other exceptions by returning an unsuccessful status code to the caller.

A few exceptions are allowed to filter back, untouched, to user mode. For example, certain types of memory-access violations or an arithmetic overflow generate an exception that the operating system

---

doesn't handle. 32-bit applications can establish frame-based exception handlers to deal with these exceptions. The term frame-based refers to an exception handler's association with a particular procedure activation. When a procedure is invoked, a stack frame representing that activation of the procedure is pushed onto the stack. A stack frame can have one or more exception handlers associated with it, each of which protects a particular block of code in the source program. When an exception occurs, the kernel searches for an exception handler associated with the current stack frame. If none exists, the kernel searches for an exception handler associated with the previous stack frame, and so on, until it finds a frame-based exception handler. If no exception handler is found, the kernel calls its own default exception handlers.

For 64-bit applications, structured exception handling does not use frame-based handlers (the

frame-based technology has been proven to be attackable by malicious users). Instead, a table of

handlers for each function is built into the image during compilation. The kernel looks for handlers as sociated with each function and generally follows the same algorithm we described for 32-bit code.

Structured exception handling is heavily used within the kernel itself so that it can safely verify whether pointers from user mode can be safely accessed for read or write access. Drivers can make use of this same technique when dealing with pointers sent during I/O control codes (IOCTLs).

Another mechanism of exception handling is called vectored exception handling. This method can be used only by user-mode applications. You can find more information about it in the Windows SDK or Microsoft Docs at https://docs.microsoft.com/en-us/windows/win32/debug/vectored-exception-handling.

When an exception occurs, whether it is explicitly raised by software or implicitly raised by hardware, a chain of events begins in the kernel. The CPU hardware transfers control to the kernel trap handler, which creates a trap frame (as it does when an interrupt occurs). The trap frame allows the system to resume where it left off if the exception is resolved. The trap handler also creates an exception record that contains the reason for the exception and other pertinent information.

If the exception occurred in kernel mode, the exception dispatcher simply calls a routine to locate a frame-based exception handler that will handle the exception. Because unhandled kernel-mode exceptions are considered fatal operating system errors, you can assume that the dispatcher always finds an exception handler. Some traps, however, do not lead into an exception handler because the kernel always assumes such errors to be fatal; these are errors that could have been caused only by severe bugs in the internal kernel code or by major inconsistencies in driver code (that could have occurred only through deliberate, low-level system modifications that drivers should not be responsible for). Such fatal errors will result in a bug check with the UNEXPECTED_KERNEL_MODE_TRAP code.

If the exception occurred in user mode, the exception dispatcher does something more elaborate. The Windows subsystem has a debugger port (this is actually a debugger object, which will be discussed later) and an exception port to receive notification of user-mode exceptions in Windows processes. (In this case, by “port” we mean an ALPC port object, which will be discussed later in this chapter.) The kernel uses these ports in its default exception handling, as illustrated in Figure 8-24.

Debugger breakpoints are common sources of exceptions. Therefore, the first action the exception dispatcher takes is to see whether the process that incurred the exception has an associated debugger

---

process. If it does, the exception dispatcher sends a debugger object message to the debug object associated with the process (which internally the system refers to as a "port" for compatibility with programs that might rely on behavior in Windows 2000, which used an LPC port instead of a debug object).

![Figure](figures/Winternals7thPt2_page_119_figure_001.png)

FIGURE 8-24 Dispatching an exception.

If the process has no debugger process attached or if the debugger doesn't handle the exception, the exception dispatcher switches into user mode, copies the trap frame to the user stack formatted as a CONTEXT data structure (documented in the Windows SDK), and calls a routine to find a structured or vectored exception handler. If none is found or if none handles the exception, the exception dispatcher switches back into kernel mode and calls the debugger again to allow the user to do more debugging. (This is called the second-chance notification.)

If the debugger isn't running and no user-mode exception handlers are found, the kernel sends a message to the exception port associated with the thread's process. This exception port, if one exists, was registered by the environment subsystem that controls this thread. The exception port gives the environment subsystem, which presumably is listening at the port, the opportunity to translate the exception into an environment-specific signal or exception. However, if the kernel progresses this far in processing the exception and the subsystem doesn't handle the exception, the kernel sends a message to a systemwide error port that Csrs (Client/Server Run-Time Subsystem) uses for Windows Error Reporting (WER)—which is discussed in Chapter 10—and executes a default exception handler that simply terminates the process whose thread caused the exception.

---

## Unhandled exceptions

All Windows threads have an exception handler that processes unhandled exceptions. This exception handler is declared in the internal Windows start-of-thread function. The start-of-thread function runs when a user creates a process or any additional threads. It calls the environment-supplied thread start routine specified in the initial thread context structure, which in turn calls the user-supplied thread start routine specified in the CreateThread call.

The generic code for the internal start-of-thread functions is shown here:

```bash
VOID RtlUserThreadStart(VOID)
{
   LPVOID StartAddress = RCX;   // Located in the initial thread context structure
   LPVOID Argument = RDX;  // Located in the initial thread context structure
   LPVOID Win32StartAddr;
   if (Kernel32ThreadInitThunkFunction != NULL) {
       Win32StartAddr = Kernel32ThreadInitThunkFunction;
   } else {
       Win32StartAddr = StartAddress;
   }
   __try
   {
       DWORD ThreadExitCode = Win32StartAddr(Argument);
       RtlExitUserThread(ThreadExitCode);
   }
   __except(RtlpGetExceptionFilter(GetExceptionInformation()))
   {
       NtTerminateProcess(NtCurrentProcess, GetLastErrorCode());
   }
   }
```

Notice that the Windows unhandled exception filter is called if the thread has an exception that it doesn't handle. The purpose of this function is to provide the system-defined behavior for what to do when an exception is not handled, which is to launch the Wdfault.exe process. However, in a default configuration, the Windows Error Reporting service, described in Chapter 10, will handle the exception and this unhandled exception filter never executes.

## EXPERIMENT: Viewing the real user start address for Windows threads

The fact that each Windows thread begins execution in a system-supplied function (and not

the user-supplied function) explains why the start address for thread 0 is the same for every

Windows process in the system (and why the start addresses for secondary threads are also the

same). To see the user-supplied function address, use Process Explorer or the kernel debugger.

Because most threads in Windows processes start from one of the system-supplied wrapper

functions, Process Explorer, when displaying the start address of threads in a process, skips the

initial call frame that represents the wrapper function and instead shows the second frame on the

stack. For example, notice the thread start address of a process running Notepad.exe:

---

![Figure](figures/Winternals7thPt2_page_121_figure_000.png)

Process Explorer does display the complete call hierarchy when it displays the call stack. Notice the following results when the Stack button is clicked:

![Figure](figures/Winternals7thPt2_page_121_figure_002.png)

---

Line 20 in the preceding screen shot is the first frame on the stack—the start of the internal

thread wrapper. The second frame (line 19) is the environment subsystem's thread wrapper—in

this case, kernel32, because you are dealing with a Windows subsystem application. The third

frame (line 18) is the main entry point into Notepad.exe.

To show the correct function names, you should configure Process Explorer with the proper symbols. First you need to install the Debugging Tools, which are available in the Windows SDK or WDK. Then you should select the Configure Symbols menu item located in the Options menu. The dbghelp.dll path should point to the file located in the debugging tools folder (usually C\ Program Files\Windows Kits\10\Debuggers; note that the dbghelp.dll file located in C:\Windows\ System32 would not work), and the Symbols path should be properly configured to download the symbols from the Microsoft symbols store in a local folder, as in the following figure:

![Figure](figures/Winternals7thPt2_page_122_figure_002.png)

## System service handling

As Figure 8-24 illustrated, the kernel's trap handlers dispatch interrupts, exceptions, and system service calls. In the preceding sections, you saw how interrupt and exception handling work; in this section, you'll learn about system services. A system service dispatch (shown in Figure 8-25) is triggered as a result of executing an instruction assigned to system service dispatching. The instruction that Windows uses for system service dispatching depends on the processor on which it is executing and whether Hypervisor Code Integrity (HCVI) is enabled, as you're about to learn.

![Figure](figures/Winternals7thPt2_page_122_figure_005.png)

FIGURE 8-25 System service dispatching.

---

## Architectural system service dispatching

On most x64 systems, Windows uses the syscall instruction, which results in the change of some of the

key processor state we have learned about in this chapter, based on certain preprogrammed model

specific registers (MSRs):

- 0x00000081, known as STAR (SYSCALL Target Address Register)

0x00000082, known as LSTAR (Long-Mode STAR)

0x00000084, known as SFMASK (SYSCALL Flags Mask)
Upon encountering the syscall instruction, the processor acts in the following manner:

- The Code Segment (CS) is loaded from Bits 32 to 47 in STAR, which Windows sets to 0x010
(KGT64_R0_CODE).

The Stack Segment (SS) is loaded from Bits 32 to 47 in STAR plus 8, which gives us 0x0018
(KGT_R0_DATA).

The Instruction Pointer (IPI) is saved in RCX, and the new value is loaded from LSTAR, which
Windows sets to KiSystemCall64 if the Meltdown (KVA Shadowing) mitigation is not needed,
or KiSystemCall64Shadow otherwise. (More information on the Meltdown vulnerability was
provided in the "Hardware side-channel vulnerabilities" section earlier in this chapter.)

The current processor flags (RFLAGS) are saved in R11 and then masked with $MASK, which
Windows sets to 0x4700 (Trap Flag, Direction Flag, Interrupt Flag, and Nested Task Flag).

The Stack Pointer (RSP) and all other segments (DS, ES, FS, and GS) are kept to their current
user-space values.
Therefore, although the instruction executes in very few processor cycles, it does leave the processor in an insecure and unstable state—the user-mode stack pointer is still loaded. GS is still pointing to the TEB, but the Ring Level, or CPL, is now 0, enabling kernel mode privileges. Windows acts quickly to place the processor in a consistent operating environment. Outside of the KVA shadow-specific operations that might happen on legacy processors, these are the precise steps that KSYSTEMCell64 must perform:

By using the swaps instruction, GS now points to the PCR, as described earlier in this chapter.

The current stack pointer (RSP) is saved into the UserRsp field of the PCR. Because GS has now correctly been loaded, this can be done without using any stack or register.

The new stack pointer is loaded from the RspBase field of the PRCB (recall that this structure is stored as part of the PCR).

Now that the kernel stack is loaded, the function builds a trap frame, using the format described earlier in the chapter. This includes storing in the frame the SegSs set to $GCDT_R3_DATA (0x28), Rsp from the UserRsp in the PCR, EFlags from R11, SegCs set to $GCDT_R3_CODE (0x33), and storing Rip from RCX. Normally, a processor trap would've set these fields, but Windows must emulate the behavior based on how syscall operates.

---

Loading RCX from R10. Normally, the X64 ABI dictates that the first argument of any function (including a syscall) be placed in RCX—yet the syscall instruction overrides RCX with the instruction pointer of the caller, as shown earlier. Windows is aware of this behavior and copies RCX into R10 before issuing the syscall instruction, as you'll soon see, so this step restores the value.

The next steps have to do with processor mitigations such as Supervisor Mode Access Prevention (SMAP)—such as issuing the stac instruction—and the myriad processor side-channel mitigations, such as clearing the branch tracing buffers (BTB) or return store buffer (RSB). Additionally, on processors with Control-flow Enforcement Technology (CET), the shadow stack for the thread must also be synchronized correctly. Beyond this point, additional elements of the trap frame are stored, such as various nonvolatile registers and debug registers, and the nonarchitectural handling of the system call begins, which we discuss in more detail in just a bit.

Not all processors are x64, however, and it's worth pointing out that on x86 processors, for example, a different instruction is used, which is called Sysenter. As 32-bit processors are increasingly rare, we don't spend too much time digging into this instruction other than mentioning that its behavior is similar—a certain amount of processor state is loaded from various MSRs, and the kernel does some additional work, such as setting up the trap frame. More details can be found in the relevant Intel processor manuals. Similarly, ARM-based processors use the svc instruction, which has its own behavior and OSlevel handling, but these systems still represent only a small minority of Windows installations.

There is one more corner case that Windows must handle; processors without Mode Base Execution Controls (MBEC) operating while Hypervisor Code Integrity (HCVI) is enabled suffer from a design issue that violates the promises HCVI provides. (Chapter 9 covers HCVI and MBEC.) Namely, an attacker could allocate user-space executable memory, which HCVI allows (by marking the respective SLAT entry as executable), and then corrupt the PTE (which is not protected against kernel modification) to make the virtual address appear as a kernel page. Because the MMU would see the page as being kernel, Supervisor Mode Execution Prevention (SMEP) would not prohibit execution of the code, and because it was originally allocated as a user physical page, the SLAT entry wouldn't prohibit the execution either. The attacker has now achieved arbitrary kernel-mode code execution, violating the basic tenet of HCVI.

MBEC and its sister technologies (Restricted User Mode) fix this issue by introducing distinct kernel

versus user executable bits in the SLAT entry data structures, allowing the hypervisor (or the Secure

Kernel, through VT-L1-specific hypercalls) to mark user pages as kernel non executable but user execut able. Unfortunately, on processors without this capability, the hypervisor has no choice but to trap all

code privilege level changes and swap between two different sets of SLAT entries—ones marking all

user physical pages as nonexecutable, and ones marking them as executable. The hypervisor traps CPL

changes by making the IDT appear empty (effectively setting its limit to 0) and decoding the underly ing instruction, which is an expensive operation. However, as interrupts can directly be trapped by the

hypervisor, avoiding these costs, the system call dispatch code in user space prefers issuing an interrupt

if it detects an HVC1-enabled system without MBEC-like capabilities. The SystemCall bit in the Shared

User Data structure described in Chapter 4, Part 1, is what determines this situation.

Therefore, when SystemCall is set to 1, x64 Windows uses the int 0x2e instruction, which results in a trap, including a fully built-out trap frame that does not require OS involvement. Interestingly, this happens to be the same instruction that was used on ancient x86 processors prior to the Pentium Pro,

CHAPTER 8   System mechanisms      93


---

and continues to still be supported on x86 systems for backward compatibility with three-decade-old software that had unfortunately hardcoded this behavior. On x64, however, int 0x2e can be used only in this scenario because the kernel will not fill out the relevant ID entry otherwise.

Regardless of which instruction is ultimately used, the user-mode system call dispatching code always stores a system call index in a register—EAX on x86 and x64, R12 on 32-bit ARM, and X9 on ARM64— which will be further inspected by the nonarchitectural system call handling code we'll see next. And, to make things easy, the standard function call processor ABI (application binary interface) is maintained across the boundary—for example, arguments are placed on the stack on x86, and RCX (technically R10 due to the behavior of syscall), RDX, R8, R9 plus the stack for any arguments past the first four on x64.

Once dispatching completes, how does the processor return to its old state? For trap-based system calls that occurred through int 0x2e, the iret instruction restores the processor state based on the hardware trap frame on the stack. Forsyscall and syenter, though, the processor once again leverages the MSRs and hardcoded registers we saw on entry, through specialized instructions called rsynet and syseint, respectively. Here's how the former behaves:

- ■ The Stack Segment (SS) is loaded from bits 48 to 63 in STAR, which Windows sets to 0x0023
(KGDT_R3_DATA).

■ The Code Segment (CS) is loaded from bits 48 to 63 in STAR plus 0x10, which gives us 0x0033
(KGDT64_R3_CODE).

■ The Instruction Pointer (RIP) is loaded from RCX.

■ The processor flags (RFLAGS) are loaded from R11.

■ The Stack Pointer (RSP) and all other segments (DS, ES, FS, and GS) are kept to their current
kernel-space values.
Therefore, just like for system call entry, the exit mechanics must also clean up some processor state. Namely, RSP is restored to the Rsp field that was saved on the manufactured hardware trap frame from the entry code we analyzed, similar to all the other saved registers. RCX register is loaded from the saved Rsp, R11 is loaded from EFlags, and the swaps instruction is used right before issuing the sysret instruction. Because DS, ES, and FS were never touched, they maintain their original user-space values. Finally, EDX and XMMO through XMM5 are zeroed out, and all other nonvolatile registers are restored from the trap frame before the sysret instruction. Equivalent actions are taken on for xsexit and ARM64's exit instruction (eret). Additionally, if CET is enabled, just like in the entry path, the shadow stack must correctly be synchronized on the exit path.

## EXPERIMENT: Locating the system service dispatcher

As mentioned, x64 system calls occur based on a series of MSRs, which you can use the rdmsr debugger command to explore. First, take note of STAR, which shows KGDT_R0_CODE (0x0010) and KGDT64_R3_DATA (0x0023).

```bash
1kbd-msddr-c000081
src{c000081} = 0230100100000000
```

---

Next, you can investigate LSTAR, and then use the ln command to see if it's pointing to


KiSystemCall64 (for systems that don't require KVA Shadowing) or KiSystemCall64Shadow (for

those that do):

```bash
!kds - rmdws c000082
src(c000082) = ffffffff804 7ebd3740
```

```bash
1kb+, ln ####F804 7ed7b340
####804-7edb340)   ntKiSystemCall164
```

Finally, you can look at SFMASK, which should have the values we described earlier:

```bash
lkd=.rmds-.c000084
smf<core000084> = 00000000'00004700
```

x86 system calls occur through xyster, which uses a different set of MSRs, including 0x176, which stores the 32-bit system call handler:

```bash
lkd-rmdsr 176
msr{176} =00000000'8208c9c0
```

```bash
!kbd -l 00000000 820c80c
(820e6c0) ntkfastCallEntry
```

Finally, on both x86 systems as well as x43 systems without MBEC but with HVC, you can see

the int 0x2e handler registered in the IDT with the !idt 0x2e debugger command:

```bash
!kb! !idt 2e
Dumping IDT: ffff8047af03000
2e:        ffff8047ebd3040 ntKiSystemService
```

You can disassemble the KISystemService or KISystemCall64 routine with the u command. For the interrupt handler, you'll eventually notice

```bash
ntKi1sSystemService=0x227:
ffff804 7eb3267 483c408
00000000
00000000
1fence
ffff804 7eb326e 5c60425530800000000
mov     byte ptr_gs:[853h],0
ffff804 7eb3277 e940070000
jmp      ntKi1sSystemServiceCeller (ffff804 7eb3980)
```

while the MSR handler will fall in

```bash
ntlk1kSystemCa1164+0x27:
        ####F804 7eb3970 4883c04        add    rsp,8
        ####F804 7eb3974 0faee8        lfence
        ####F804 7eb3977 65C60425350000000 mov        byte ptr gs:[853h],0
ntlk1kSystemServiceUser:
        ####F804 7eb3980 645ab02        mov        byte ptr [rbp-55h],2
```

This shows you that eventually both code paths arrive in KI/SystemServiceUser, which then does

most common actions across all processors, as discussed in the next section.

---

## Nonarchitectural system service dispatching

As Figure 8-25 illustrates, the kernel uses the system call number to locate the system service information in the system service dispatch table. On x86 systems, this table is like the interrupt dispatch table described earlier in the chapter except that each entry contains a pointer to a system service rather than to an interrupt-handling routine. On other platforms, including 32-bit ARM and ARM64, the table is implemented slightly differently; instead of containing pointers to the system service, it contains offsets relative to the table itself. This addressing mechanism is more suited to the x64 and ARM64 application binary interface (ABI) and instruction-encoding format, and the RISC nature of ARM processors in general.

![Figure](figures/Winternals7thPt2_page_127_figure_002.png)

Note System service numbers frequently change between OS releases. Not only does Microsoft occasionally add or remove system services, but the table is also often randomized and shuffled to break attacks that hardcode system call numbers to avoid detection.

Regardless of architecture, the system service dispatcher performs a few common actions on

all platforms:

- ■ Save additional registers in the trap frame, such as debug registers or floating-point registers.
■ If this thread belongs to a pico process, forward to the system call pico provider routine
(see Chapter 3, Part 1, for more information on pico providers).
■ If this thread is an UMS scheduled thread, call KiUmsCallEntry to synchronize with the pri-
mary (see Chapter 1, Part 1, for an introduction on UMS). For UMS primary threads, set the
UmsPerformingSyscall flag in the thread object.
■ Save the first parameter of the system call in the FirstArgument field of the thread object and
the system call number in SystemCallNumber.
■ Call the shared user/kernel system call handler (KiSystemServiceStart), which sets the TrapFrame
field of the thread object to the current stack pointer where it is stored.
■ Enable interrupt delivery.
At this point, the thread is officially undergoing a system call, and its state is fully consistent and

can be interrupted. The next step is to select the correct system call table and potentially upgrade the

thread to a GUI thread, details of which will be based on the GuiThread and RestrictedGuiThread fields

of the thread object, and which will be described in the next section. Following that, GDI Batching op erations will occur for GUI threads, as long as the TEB's GdiBatchCount field is non-zero.

Next, the system call dispatcher must copy any of the caller's arguments that are not passed by

register (which depends on the CPU architecture) from the thread's user-mode stack to its kernel-mode

stack. This is needed to avoid having each system call manually copy the arguments (which would

require assembly code and exception handling) and ensure that the user can't change the arguments

as the kernel is accessing them. This operation is done within a special code block that is recognized

by the exception handlers as being associated to user stack copying, ensuring that the kernel does not

---

crash in the case that an attacker, or incorrectly written program, is messing with the user stack. Since

system calls can take an arbitrary number of arguments (well, almost), you see in the next section how

the kernel knows how many to copy.

Note that this argument copying is shallow: If any of the arguments passed to a system service points to a buffer in user space, it must be probed for safe accessibility before kernel-mode code can read and/or write from it. If the buffer will be accessed multiple times, it may also need to be captured, or copied, into a local kernel buffer. The responsibility of this probe and capture operation lies with each individual system call and is not performed by the handler. However, one of the key operations that the system call dispatcher must perform is to set the previous mode of the thread. This value corresponds to either KernelMode or UserMode and must be synchronized whenever the current thread executes a trap, identifying the privilege level of the incoming exception, trap, or system call. This will allow the system call, using ExGetPreviousMode, to correctly handle user versus kernel callers.

Finally, two last steps are taken as part of the dispatcher's body. First, if DTrace is configured and system call tracing is enabled, the appropriate entry/exit callbacks are called around the system call. Alternatively, if ETW tracing is enabled but not DTrace, the appropriate ETW events are logged around the system call. Finally, if neither DTrace nor ETW are enabled, the system call is made without any additional logic. The second, and final, step, is to increment the KeSystemCalls variable in the PRCB, which is exposed as a performance counter that you can track in the Performance & Reliability Monitor.

At this point, system call dispatching is complete, and the opposite steps will then be taken as part

of system call exit. These steps will restore and copy user-mode state as appropriate, handle user-mode

APC delivery as needed, address side-channel mitigations around various architectural buffers, and

eventually return with one of the CPU instructions relevant for this platform.

## Kernel-issued system call dispatching

Because system calls can be performed both by user-mode code and kernel mode, any pointers, handles, and behaviors should be treated as if coming from user-mode—which is clearly not correct.

To solve this, the kernel exports specialized Zw versions of these calls—that is, instead of NTCreateFile, the kernel exports ZwCreateFile. Additionally, because Zw functions must be manually exported by the kernel, only the ones that Microsoft wishes to expose for third-party use are present. For example, ZwCreateUserProcess is not exported by name because kernel drivers are not expected to launch user applications. These exported APIs are not actually simple aliases or wrappers around the NT versions. Instead, they are "trampolines" to the appropriate NT system call, which use the same system call-dispatching mechanism.

Like KI/SystemCall64 does, they too build a fake hardware trap frame (pushing on the stack the data that the CPU would generate after an interrupt coming from kernel mode), and they also disable interrupts, just like a trap would. On x64 systems, for example, the KGD764.R0_CODE (0x0010) selector is pushed as CS, and the current kernel stack as RSP. Each of the trampolines places the system call number in the appropriate register (for example, EAX on x86 and x64, and then calls KIServiceInternal, which saves additional data in the trap frame, reads the current previous mode, stores it in the trap frame, and then sets the previous mode to KernelMode (this is an important difference).

---

## User-issued system call dispatching

As was already introduced in Chapter 1 of Part 1, the system service dispatch instructions for Windows executive services exist in the system library Ntllc.dll. Subsystem DLLs call functions in Ntllc to implement their documented functions. The exception is Windows USER and GDI functions, including DirectX Kernel Graphics, for which the system service dispatch instructions are implemented in Win32u.dll. Ntllc.dll is not involved. These two cases are shown in Figure 8-26.

As shown in the figure, the Windows WriteFile function in Kernel32.dll imports and calls the WriteFile function in API-MS-Win-Core-File-LT-1-0.dll, one of the MinWin redirection DLLs (see Chapter 3, Part 1, for more information on API redirection), which in turn calls the WriteFile function in KernelBase.dll, where the actual implementation lies. After some subsystem-specific parameter checks, it then calls the NtWriteFile function in Ntdll.dll, which in turn executes the appropriate instruction to cause a system service trap, passing the system service number representing NtWriteFile.

The system service dispatcher in Ntoskrnl.exe (in this example, KIeSystemService) then calls the real

NtWriteFile to process the I/O request. For Windows USER, GDI, and DirectX Kernel Graphics func tions, the system service dispatch calls the function in the loadable kernel-mode part of the Windows

subststem, Win32k.sys, which might then filter the system call or forward it to the appropriate module,

either Win32k.base.sys or Win32k.full.sys on Desktop systems, Win32kmin.sys on Windows 10X systems,

or Dxgkmi.sys if this was a DirectX call.

![Figure](figures/Winternals7thPt2_page_129_figure_004.png)

FIGURE 8-26 System service dispatching.

---

## System call security

Since the kernel has the mechanisms that it needs for correctly synchronizing the previous mode for system call operations, each system call service can rely on this value as part of processing. We previously mentioned that these functions must first probe any argument that's a pointer to a user-mode buffer of any sort. By probe, we mean the following:

- 1. Making sure that the address is below MmUserProbeAddress, which is 64 KB below the highest
user-mode address (such as 0x7FFF000 on 32-bit).

2. Making sure that the address is aligned to a boundary matching how the caller intends to access
its data—for example, 2 bytes for Unicode characters, 8 bytes for a 64-bit pointer, and so on.

3. If the buffer is meant to be used for output, making sure that, at the time the system call begins,
it is actually writable.
Note that output buffers could become invalid or read-only at any future point in time, and the

system call must always access them using SEH, which we described earlier in this chapter, to avoid

crashing the kernel. For a similar reason, although input buffers aren't checked for readability, because

they will likely be imminently used anyway, SEH must be used to ensure they can be safely read. SEH

doesn't protect against alignment mismatches or wild kernel pointers, though, so the first two steps

must still be taken.

It's obvious that the first check described above would fail for any kernel-mode caller right away, and this is the first part where previous mode comes in—probing is skipped for non-UserMode calls, and all buffers are assumed to be valid, readable and/or writeable as needed. This isn't the only type of validation that a system call must perform, however, because some other dangerous situations can arise:

- The caller may have supplied a handle to an object. The kernel normally bypasses all security
access checks when referencing objects, and it also has full access to kernel handles (which we
describe later in the "Object Manager" section of this chapter), whereas user-mode code does
not. The previous mode is used to inform the Object Manager that it should still perform access
checks because the request came from user space.

■ In even more complex cases, it's possible that flags such as OBJ_FORCE_ACCESS_CHECK need
to be used by a driver to indicate that even though it is using the Zw API, which sets the previ-
ous mode to KernelMode, the Object Manager should still treat the request as if coming from
UserMode.

■ Similarly, the caller may have specified a file name. It's important for the system call, when
opening the file, to potentially use the IO_FORCE_ACCESS_CHECKING flag, to force the security
reference monitor to validate access to the file system, as otherwise a call such as ZwCreateFile
would change the previous mode to KernelMode and bypass access checks. Potentially, a driver
may also have to do this if it's creating a file on behalf of an IRP from user-space.

■ File system access also brings risks with regard to symbolic links and other types of
redirection attacks, where privileged kernel-mode code might be incorrectly using various
process-specific/user-accessible reparse points.
---

- ■ Finally, and in general, any operation that results in a chained system call, which is performed
with the Zw interface, must keep in mind that this will reset the previous mode to KernelMode
and respond accordingly.
## Service descriptor tables

We previously mentioned that before performing a system call, the user-mode or kernel-mode trampolines will first place a system call number in a processor register such as RAX, R12, or X8. This number is technically composed of two elements, which are shown in Figure 8-27. The first element, stored in the bottom 12 bits, represents the system call index. The second, which uses the next higher 2 bits (1213), is the table identifier. As you're about to see, this allows the kernel to implement up to four different types of system services, each stored in a table that can house up to 4096 system calls.

![Figure](figures/Winternals7thPt2_page_131_figure_003.png)

FIGURE 8-27 System service number to system service translation.

The kernel keeps track of the system service tables using three possible arrays—KeServiceDescriptor

Table, KeServiceDescriptorTableShadow, and KeServiceDescriptorTableFilter. Each of these arrays can

have up to two entries, which store the following three pieces of data:

- ■ A pointer to the array of system calls implemented by this service table

■ The number of system calls present in this service table, called the limit

■ A pointer to the array of argument bytes for each of the system calls in this service table
The first array only ever has one entry, which points to KIServiceTable and KArgumentTable, with a little over 450 system calls (the precise number depends on your version of Windows). All threads, by default, issue system calls that only access this table. On x86, this is enforced by the ServiceTable pointer in the thread object, while all other platforms hardcode the symbol KeServiceDescriptorTable in the system call dispatcher.

---

The first time that a thread makes a system call that's beyond the limit, the kernel calls PsConvertTo GuiThread, which notifies the USER and GDI services in Win32k.sys about the thread and sets either the thread object's GuiThread flag or its RestrictedGuiThread flag after these return successfully. Which one is used depends on whether the EnableFilteredWin32kSystemCalls process mitigation option is enabled, which we described in the "Process-mitigation policies" section of Chapter 7, Part 1. On x86 systems, the thread object's ServiceTable pointer now changes to KeServiceDescriptorTableShadow or KeServiceDescriptorTableFilter depending on which of the flags is set, while on other platforms it is a hardcoded symbol chosen at each system call. (Although less performant, the latter avoids an obvious hooking point for malicious software to abuse.)

As you can probably guess, these other arrays include a second entry, which represents the Windows USER and GDI services implemented in the kernel-mode part of the Windows subsystem, Win32k.sys, and, more recently, the DirectX Kernel Subsystem services implemented by Dxgkrnl.sys, albeit these still transit through Win32k.sys initially. This second entry points to W32pServiceTable or W32pServiceTableFilter and W32pArgumentTable or W32pArgumentTableFilter, respectively, and has about 1250 system calls or more, depending on your version of Windows.

![Figure](figures/Winternals7thPt2_page_132_figure_002.png)

Note Because the kernel does not link against Win32k.sys, it exports a


KeAddSystemServiceTable function that allows the addition of an additional entry into

the KeServiceDescriptorTableShadow and the KeServiceDescriptorTableFilter table if it has

not already been filled out. If Win32k.sys has already called these APIs, the function fails,

and PatchGuard protects the arrays once this function has been called, so that the structures

effectively become read only.

The only material difference between the Filter entries is that they point to system calls in Win32k.sys with names like stub_UsersGetThreadState, while the real array points to NtUserGetThreadState. The former stubs will check if Win32k.sys filtering is enabled for this system call, based, in part, on the filter set that's been loaded for the process. Based on this determination, they will either fail the call and return STATUS_INVALID_SYSTEM_SERVICE if the filter set prohibits it or end up calling the original function (such as NtUserGetThreadState), with potential telemetry if auditing is enabled.

The argument tables, on the other hand, are what help the kernel to know how many stack bytes need to be copied from the user stack into the kernel stack, as explained in the dispatching section earlier. Each entry in the argument table corresponds to the matching system call with that index and stores the count of bytes to copy (up to 255). However, kernels for platforms other than x86 employ a mechanism called system call table compaction, which combines the system call pointer from the call table with the byte count from the argument table into a single value. The feature works as follows:

1. Take the system call function pointer and compute the 32-bit difference from the beginning of the system call table itself. Because the tables are global variables inside of the same module that contains the functions, this range of ±2 GB should be more than enough.

---

- 2. Take the stack byte count from the argument table and divide it by 4, converting it into an

argument count (some functions might take 8-byte arguments, but for these purposes, they'll

simply be considered as two "arguments").

3. Shift the 32-bit difference from the first step by 4 bits to the left, effectively making it a 28-bit

difference (again, this is fine—no kernel component is more than 256 MB) and perform a bit-

wise or operation to add the argument count from the second step.

4. Override the system call function pointer with the value obtained in step 3.
This optimization, although it may look silly at first, has a number of advantages: It reduces cache usage by not requiring two distinct arrays to be looked up during a system call, it simplifies the amount of pointer dereferences, and it acts as a layer of obfuscation, which makes it harder to hook or patch the system call table while making it easier for PatchGuard to defend it.

## EXPERIMENT: Mapping system call numbers to functions and arguments

You can duplicate the same lookup performed by the kernel when dealing with a system call

ID to figure out which function is responsible for handling it and how many arguments it takes.

On an x86 system, you can just ask the debugger to dump each system call table, such as

KiServiceTable with the dps command, which stands for dump pointer symbol, which will actu ally perform a lookup for you. You can then similarly dump the KiArgumentTable (or any of the

Win32k.sys ones) with the db command or dump bytes.

A more interesting exercise, however, is dumping this data on an ARM64 or x64 system, due to the encoding we described earlier. The following steps will help you do that.

- 1. You can dump a specific system call by undoing the compaction steps described earlier.


Take the base of the table and add it to the 28-bit offset that's stored at the desired

index, as shown here, where system call 3 in the kernel's service table is revealed to be

NtMapUserPhysicalPagesScatter:

!kdvs ??((ULONG)(ntKiServiceTable[3]) >> 4) + (int64)ntKiServiceTable

unsigned int64 0xfffff803'1213e030


!kdvs ln 0xfffff803'1213e030
ntNtMapUserPhysicalPagesScatter
2. You can see the number of stack-based 4-byte arguments this system call takes by taking the 4-bit argument count:

```bash
llkc__dx ((!!(int)k!&k!ServiceTable))[3] & 0xF)
((int)*k!ntk1ServiceTable))[3] & 0xF);
```

3. Note that this doesn't mean the system call has no arguments. Because this is an x64 system, the call could take anywhere between 0 and 4 arguments, all of which are in registers (RCX, RDX, R8, and R9).

---

4. You could also use the debugger data model to create a LINQ predicate using projection,

dumping the entire table, leveraging the fact that the KIServiceLimit variable corresponds

to the same limit field in the service descriptor table (just like W32pServiceLimit for the

Win32k.sys entries in the shadow descriptor table). The output would look like this:

```bash
lkd= dx @Table= &ntiKiServiceTable
@Table = &ntiKiServiceTable : 0xffff8047ee24800 [Type: void *]
lkd= dx (((int(*)[90000])&ntiKiServiceTable)))->Take(*int*)&ntiKiServiceLimit)->
     Select(x => (x >> 4) + @Stable)
        <<(int[90000])&ntiKiServiceTable))->Take(*int*)&ntiKiServiceLimit)->Select
        (x => (x >> 4) + @Stable)
[0]                : 0xffff8047eb081d0 [Type: void *]
[1]                : 0xffff8047eb10940 [Type: void *]
[2]                : 0xffff8047f0b7800 [Type: void *]
[3]                : 0xffff8047f29f50 [Type: void *]
[4]                : 0xffff8047f012450 [Type: void *]
[5]                : 0xffff8047f04bc5c0 [Type: void *]
[6]                : 0xffff8047f003b20 [Type: void *]
```

5. You could use a more complex version of this command that would also allow you to

convert the pointers into their symbolic forms, essentially reimplementing the dps

command that works on x86 Windows:

```bash
!kdx <- @$y$print = (x => Debugger.Utility.Control.ExecuteCommand(".print \"%y\n\", " +
((unsigned__int64x).ToDisplayString("x")).First()$
@$y$print = (x => Debugger.Utility.Control.ExecuteCommand(".print \"%y\n\", " +
((unsigned__int64x).ToDisplayString("x")).First()$
!kdx <- dx ((int(*)[00000])&(@t!KiServiceTable))->Take((int*)&nt!KiServiceLimit)->Select
        ((int(*)[00000])&(@t!KiServiceTable))->Take((int*)&nt!KiServiceLimit)->Select(x =>
@$y$print((x -> 4) &85abb)
[0]                : ntNTAccessCheck (ffffffff8047be0b01d0)
[1]                : ntNTWorkerFactoryWorkerReady (ffffffff8047feb10940)
[2]                : ntNTAcceptConnectPort (ffffffff8047f0b7800)
[3]                : ntNTMapUserPhysicalPagesScanner (ffffffff8047f79ff50)
[4]                : ntNTwaitForSingleObject (ffffffff8047f012450)
[5]                : ntNTCallbackReturn (ffffffff8047bec5cc0)
```

6. Finally, as long as you're only interested in the kernel's service table and not the Win2k2.sys entries, you can also use the !hcskwctl -v command in the debugger, whose output will include all of this data while also checking for inline hooks that a rootkit may have attached:

```bash
!kd# 0xhccsvctl -v
#    ServiceTableEntry                          DecodedEntryTarget(Address)                     CompactedOffset
#                                                               nt!\tAccessCheck(0xfffff8047eb08110)   On-S219196e
1    0xfffff8047ee24800        nt!\tWorkerFactoryWorkerReady(0xfffff8047eb10940)   On-S1637248e
2    0xfffff8047ee24808        nt!\tAcceptConnectPort(0xfffff8047f0b7800)   0x3188226
3    0xfffff8047ee2480c        nt!\tMapUserPhysicalPagesScatter(0xfffff8047f299f50)   0x74806258
4    0xfffff8047ee24810        nt!\tWaitForSingleObject(0xfffff8047f012450)   0x2359680
```

---

### EXPERIMENT: Viewing system service activity

You can monitor system service activity by watching the System Calls/Sec performance counter in the System object. Run the Performance Monitor, click Performance Monitor under Monitoring Tools, and click the Add button to add a counter to the chart. Select the System object, select the System Calls/Sec counter, and then click the Add button to add the counter to the chart.

You'll probably want to change the maximum to a much higher value, as it's normal for a system to have hundreds of thousands of system calls a second, especially the more processors the system has. The figure below shows what this data looked like on the author's computer.

![Figure](figures/Winternals7thPt2_page_135_figure_003.png)

