## Dispatch or deferred procedure call (DPC) interrupts

A DPC is typically an interrupt-related function that performs a processing task after all device interrupts have already been handled. The functions are called deferred because they might not execute immediately. The kernel uses DPCs to process timer expiration (and release threads waiting for the timers) and to reschedule the processor after a thread's quantum expires (note that this happens at DPC IRQL but not really through a regular kernel DPC). Device drivers use DPCs to process interrupts and perform actions not available at higher IRQLs. To provide timely service for hardware interrupts, Windows—with the cooperation of device drivers—attempts to keep the IRQL below device IRQL levels. One way that this goal is achieved is for device driver ISRs to perform the minimal work necessary to acknowledge their device, save volatile interrupt state, and defer data transfer or other less timecritical interrupt processing activity for execution in a DPC at DPC/dispatch IRQL. (See Chapter 6 in Part 1 for more information on the I/O system.)

In the case where the IRQL is passive or at APC level, DPCs will immediately execute and block all other non-hardware-related processing, which is why they are also often used to force immediate execution of high-priority system code. Thus, DPCs provide the operating system with the capability to generate an interrupt and execute a system function in kernel mode. For example, when a thread can no longer continue executing, perhaps because it has terminated or because it voluntarily enters a wait state, the kernel calls the dispatcher directly to perform an immediate context switch. Sometimes, however, the kernel detects that rescheduling should occur when it is deep within many layers of code. In this situation, the kernel requests dispatching but defers its occurrence until it completes its current activity. Using a DPC software interrupt is a convenient way to achieve this delayed processing.

The kernel always raises the processor's IRQL to DPC/dispatch level or above when it needs to synchronize access to scheduling-related kernel structures. This disables additional software interrupts and thread dispatching. When the kernel detects that dispatching should occur, it requests a DPC/dispatch-level interrupt; but because the IRQL is at or above that level, the processor holds the interrupt in check. When the kernel completes its current activity, it sees that it will lower the IRQL below DPC/dispatch level and checks to see whether any dispatch interrupts are pending. If there are, the IRQL drops to DPC/dispatch level, and the dispatch interrupts are processed. Activating the thread dispatcher by

---

using a software interrupt is a way to defer dispatching until conditions are right. A DPC is represented by a DPC object, a kernel control object that is not visible to user-mode programs but is visible to device drivers and other system code. The most important piece of information the DPC object contains is the address of the system function that the kernel will call when it processes the DPC interrupt. DPC routines that are waiting to execute are stored in kernel-managed queues, one per processor, called DPC queues. To request a DPC, system code calls the kernel to initialize a DPC object and then places it in a DPC queue.

By default, the kernel places DPC objects at the end of one of two DPC queues belonging to the processor on which the DPC was requested (typically the processor on which the ISR executed). A device driver can override this behavior, however, by specifying a DPC priority (low, medium, high, or high, where medium is the default) and by targeting the DPC at a particular processor. A DPC aimed at a specific CPU is known as a targeted DPC. If the DPC has a high priority, the kernel inserts the DPC object at the front of the queue; otherwise, it is placed at the end of the queue for all other priorities.

When the processor's IRQL is about to drop from an IRQL of DPC/dispatch level or higher to a lower IRQL (APC or passive level), the kernel processes DPCs. Windows ensures that the IRQL remains at DPC/ dispatch level and pulls DPC objects off the current processor's queue until the queue is empty (that is, the kernel "drains" the queue), calling each DPC function in turn. Only when the queue is empty will the kernel let the IRQL drop below DPC/dispatch level and let regular thread execution continue. DPC processing is depicted in Figure 8-17.

![Figure](figures/Winternals7thPt2_page_086_figure_003.png)

FIGURE 8-17 Delivering a DPC.

DPC priorities can affect system behavior another way. The kernel usually initiates DPC queue

draining with a DPC/dispatch-level interrupt. The kernel generates such an interrupt only if the DPC is

directed at the current processor (the one on which the ISR executes) and the DPC has a priority higher

than low. If the DPC has a low priority, the kernel requests the interrupt only if the number of outstand ing DPC requests (stored in the DpcQueueDepth field of the KPRCB) for the processor rises above a

threshold (called MaximumDpcQueueDepth in the KPRCB) or if the number of DPCs requested on the

processor within a time window is low.

---

If a DPC is targeted at a CPU different from the one on which the ISR is running and the DPC's priority is either high or medium-high, the kernel immediately signals the target CPU (by sending it a dispatch (PI)) to drain its DPC queue, but only as long as the target processor is idle. If the priority is medium or low, the number of DPCs queued on the target processor (this being the DpcQueueDepth again) must exceed a threshold (the MaximumDpcQueueDepth) for the kernel to trigger a DPC/dispatch interrupt. The system idle thread also drains the DPC queue for the processor it runs on. Although DPC targeting and priority levels are flexible, device drivers rarely need to change the default behavior of their DPC objects. Table 8-7 summarizes the situations that initiate DPC queue draining. Medium-high and high appear, and are, in fact, equal priorities when looking at the generation rules. The difference comes from their insertion in the list, with high interrupts being at the head and medium-high interrupts at the tail.

TABLE 8-7 DPC interrupt generation rules

<table><tr><td>DPC Priority</td><td>DPC Targeted at ISR&#x27;s Processor</td><td>DPC Targeted at Another Processor</td></tr><tr><td>Low</td><td>DPC queue length exceeds maximum DPC queue length, or DPC request rate is less than minimum DPC request rate</td><td>DPC queue length exceeds maximum DPC queue length, or system is idle</td></tr><tr><td>Medium</td><td>Always</td><td>DPC queue length exceeds maximum DPC queue length, or system is idle</td></tr><tr><td>Medium-High</td><td>Always</td><td>Target processor is idle</td></tr><tr><td>High</td><td>Always</td><td>Target processor is idle</td></tr></table>


Additionally, Table 8-8 describes the various DPC adjustment variables and their default values, as

well as how they can be modified through the registry. Outside of the registry, these values can also be

set by using the SystemDpcBehaviorInformation system information class.

TABLE 8-8 DPC interrupt generation variables

<table><tr><td>Variable</td><td>Definition</td><td>Default</td><td>Override Value</td></tr><tr><td>KiMaximumDpcQueueDepth</td><td>Number of DPCs queued before an interrupt will be sent even for Medium or below DPCs</td><td>4</td><td>DpcQueueDepth</td></tr><tr><td>KiMinimumDpcRate</td><td>Number of DPCs per clock tick where low DPCs will not cause a local interrupt to be generated</td><td>3</td><td>MinimumDpcRate</td></tr><tr><td>KiIdealDpcRate</td><td>Number of DPCs per clock tick before the maximum DPC queue depth is decremented if DPCs are pending but no interrupt was generated</td><td>20</td><td>IdealDpcRate</td></tr><tr><td>KiAdjustDpcThreshold</td><td>Number of clock ticks before the maximum DPC queue depth is incremented if DPCs aren&#x27;t pending</td><td>20</td><td>AdjustDpcThreshold</td></tr></table>


Because user-mode threads execute at low IRQL, the chances are good that a DPC will interrupt the execution of an ordinary user's thread. DPC routines execute without regard to what thread is running, meaning that when a DPC routine runs, it can't assume what process address space is currently mapped. DPC routines can call kernel functions, but they can't call system services, generate page faults, or create or wait for dispatcher objects (explained later in this chapter). They can, however, access nonpaged system memory addresses, because system address space is always mapped regardless of what the current process is.

---

Because all user-mode memory is pageable and the DPC executes in an arbitrary process context, DPC code should never access user-mode memory in any way. On systems that support Supervisor Mode Access Protection (SMAP) or Privileged Access Never (PAN), Windows activates these features for the duration of the DPC queue processing (and routine execution), ensuring that any user-mode memory access will immediately result in a bugcheck.

Another side effect of DPCs interrupting the execution of threads is that they end up "stealing" from the run time of the thread; while the scheduler thinks that the current thread is executing, a DPC is executing instead. In Chapter 4, Part 1, we discussed mechanisms that the scheduler uses to make up for this lost time by tracking the precise number of CPU cycles that a thread has been running and defeating DPC and ISR time, when applicable.

While this ensures the thread isn't penalized in terms of its quantum, it does still mean that from the user's perspective, the wall time (also sometimes called clock time) is the real-life passage of time) is still being spent on something else. Imagine a user currently streaming their favorite song off the Internet: If a DPC were to take 2 seconds to run, those 2 seconds would result in the music skipping or repeating in a small loop. Similar impacts can be felt on video streaming or even keyboard and mouse input. Because of this, DPCs are a primary cause for perceived system unresponsiveness of client systems or workstation workloads because even the highest-priority thread will be interrupted by a running DPC. For the benefit of drivers with long-running DPCs, Windows supports threaded DPCs. Threaded DPCs, as their name implies, function by executing the DPC routine at passive level on a real-time priority (priority 31) thread. This allows the DPC to preempt most user-mode threads (because most application threads don't run at real-time priority ranges), but it allows other interrupts, nonthreaded DPCs, APCS, and other priority 31 threads to preempt the runtime.

The threaded DPC mechanism is enabled by default, but you can disable it by adding a DWORD value named ThreadDpcEnable in the HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\ControlVariable\Value Manager\Kernel key, and setting it to 0. A threaded DPC must be initialized by a developer through the InitializeThreadedDpc API, which sets the DPC internal type to ThreadedDpcObject. Because threaded DPCs can be disabled, driver developers who make use of threaded DPCs must write their routines following the same rules as for nonthreaded DPC routines and cannot pass a memory memory from the dispatcher waits, or make assumptions about the IRQL level at which they are executing. In addition, they must not use the KeAcquire/ReleaseSpinLockAtDpcLevel APIs because the functions assume the CPU is at dispatch level. Instead, threaded DPCs must use KeAcquire/ReleaseSpinLockForDpc, which performs the appropriate action after checking the current IRQL.

While threaded DPCs are a great feature for driver developers to protect the system's resources when possible, they are an opt-in feature—from the developer's point of view and even the system administrator. As such, the vast majority of DPCs still execute nonthreaded and can result in perceived system lag. Windows employs a vast arsenal of performance tracking mechanisms to diagnose and assist with DPC-related issues. The first of these, of course, is to track DPC (and ISR) time both through performance counters, as well as through precise ETW tracing.

CHAPTER 8 System mechanisms 57


---

## EXPERIMENT: Monitoring DPC activity

You can use Process Explorer to monitor DPC activity by opening the System Information dialog

box and switching to the CPU tab, where it lists the number of interrupts and DPCs executed each

time Process Explorer refreshes the display (1 second by default):

![Figure](figures/Winternals7thPt2_page_089_figure_002.png)

![Figure](figures/Winternals7thPt2_page_089_figure_003.png)

---

You can also use the kernel debugger to investigate the various fields in the KPRCB that start

with Dpc, such as DpcRequestRate, DpcLastCount, DpcTime, and DpcData (which contains the

DpcQueueDepth and DpcCount for both nonthreaded and threaded DPCs). Additionally, newer

versions of Windows also include an IsrDpcStats field that is a pointer to an _ISRDPCSTATS

structure that is present in the public symbol files. For example, the following command will show

you the total number of DPCs that have been queued on the current KPRCB (both threaded and

nonthreaded) versus the number that have executed:

```bash
!kcd $ dx new { QueueDpcCount = 0 &prcr->DpcData[0].DpcCount + 0&prcr->DpcData[1].DpcCount,
ExecuteDpcData = { Int[__ISRDPCSTAT$] &prcr->IsrDpcStats ->DpcCount }
    QueueDpcCount  :  3370380
    ExecutedDpcData  :  1766914 {Type: unsigned __int64}
```

The discrepancy you see in the example output is expected; drivers might have queued a DPC that was already in the queue, a condition that Windows handles safely. Additionally, a DPC initially queued for a specific processor (but not targeting any specific one), may in some cases execute on a different processor, such as when the driver uses KeSetTargetProcessorDpc (the API allows a driver to target the DPC to a particular processor).

Windows doesn’t just expect users to manually look into latency issues caused by DPCs; it also includes built-in mechanisms to address a few common scenarios that can cause significant problems. The first is the DPC Watchdog and DPC Timeout mechanism, which can be configured through certain registry values in HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SessionManager\ Kernel such as DPCTimeout, DpcWatchdogPeriod, and DpcWatchdogProfileOffset.

The DPC Watchdog is responsible for monitoring all execution of code at DISPATCH_LEVEL or

above, where a drop in IRQL has not been registered for quite some time. The DPC Timeout, on the

other hand, monitors the execution time of a specific DPC. By default, a specific DPC times out after

20 seconds, and all DISPATCH_LEVEL (and above) execution times out after 2 minutes. Both limits are

configurable with the registry values mentioned earlier (DPCTimeout controls a specific DPC time

limit, whereas the DpcWatchdogPeriod controls the combined execution of all the code running at

high IRQL). When these thresholds are hit, the system will either bugcheck with DPC_WATCHDOG_

VIATION (indicating which of the situations was encountered), or, if a kernel debugger is attached,

raise an assertion that can be continued.

Driver developers who want to do their part in avoiding these situations can use the

KeQueryDpcWatchdogInformation API to see the current values configured and the time remaining.

Furthermore, the KeShouldYieldProcessor API takes these values (and other system state values) into

consideration and returns to the driver a hint used for making a decision whether to continue its DPC

work later, or if possible, drop the IRQ back to PASSIVE_LEVEL (in the case where a DPC wasn't execut ing, but the driver was holding a lock or synchronizing with a DPC in some way).

On the latest builds of Windows 10, each PRCB also contains a DPC Runtime History Table

(DpcRuntimeHistoryHashTable), which contains a hash table of buckets tracking specific DPC callback

functions that have recently executed and the amount of CPU cycles that they spent running. When

CHAPTER 8    System mechanisms      59


---

analyzing a memory dump or remote system, this can be useful in figuring out latency issues without access to a UI tool, but more importantly, this data is also now used by the kernel.

When a driver developer queues a DPC through KeInstertQueueDpc, the API will enumerate the processor's table and check whether this DPC has been seen executing before with a particularly long runtime (a default of 100 microseconds but configurable through the LongDpcRuntimeThreshold registry value in HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\SessionManager\Kernel). If this is the case, the LongDpcPresent field will be set in the DpcData structure mentioned earlier.

For each idle thread (See Part 1, Chapter 4 for more information on thread scheduling and the idle thread), the kernel now also creates a DPC Delegate Thread. These are highly unique threads that belong to the System Idle Process—just like Idle Threads—and are never part of the scheduler's default thread selection algorithms. They are merely kept in the back pocket of the kernel for its own purposes. Figure 8-18 shows a system with 16 logical processors that now has 16 idle threads as well as 16 DPC delegate threads. Note that in this case, these threads have a real Thread ID (TID), and the Processor column should be treated as such for them.

![Figure](figures/Winternals7thPt2_page_091_figure_003.png)

FIGURE 8-18 The DPC delegate threads on a 16-CPU system.

60      CHAPTER 8    System mechanisms


---

Whenever the kernel is dispatching DPCs, it checks whether the DPC queue depth has passed the threshold of such long-running DPCs (this defaults to 2 but is also configurable through the same registry key we've shown a few times). If this is the case, a decision is made to try to mitigate the issue by looking at the properties of the currently executing thread: Is it idle? Is it a real-time thread? Does its affinity mask indicate that it typically runs on a different processor? Depending on the results, the kernel may decide to schedule the DPC delegate thread instead, essentially swapping the DPC from its thread-starving position into a dedicated thread, which has the highest priority possible (still executing at DISPATCH_LEVEL). This gives a chance to the old preempted thread (or any other thread in the standby list) to be rescheduled to some other CPU.

This mechanism is similar to the Threaded DPCs we explained earlier, with some exceptions. The delegate thread still runs at DISPATCH_LEVEL. Indeed, when it is created and started in phase 1 of the NT kernel initialization (see Chapter 12 for more details), it raises its own IRQL to DISPATCH_LEVEL, saves it in the WaitIrql field of its kernel thread data structure, and voluntarily asks the scheduler to perform a context switch to another standby or ready thread (via the KtSwapThread routine.) Thus, the delegate DPCs provide an automatic balancing action that the system takes, instead of an opt-in that driver developers must judiciously leverage on their own.

If you have a newer Windows 10 system with this capability, you can run the following command in the kernel debugger to take a look at how often the delegate thread was needed, which you can infer from the amount of context switches that have occurred since boot:

```bash
lkds dx @Cursession.Processes[0].Threads.Where(t => t.KernelObject.ThreadName->t
ToDisplayString().Contains("DPC Delegate Thread")).Select(t => t.KernelObject.Tcb.
ContextSwitches).d
 [44]        : 2138 [Type: unsigned long]
 [52]        : 4 [Type: unsigned long]
 [60]        : 11 [Type: unsigned long]
 [68]        : 6 [Type: unsigned long]
 [76]        : 13 [Type: unsigned long]
 [84]        : 3 [Type: unsigned long]
 [92]        : 16 [Type: unsigned long]
 [100]       : 1 [Type: unsigned long]
 [108]       : 2 [Type: unsigned long]
 [116]       : 1 [Type: unsigned long]
 [124]       : 2 [Type: unsigned long]
 [132]       : 2 [Type: unsigned long]
 [140]       : 3 [Type: unsigned long]
 [148]       : 2 [Type: unsigned long]
 [156]       : 1 [Type: unsigned long]
 [164]       : 1 [Type: unsigned long]
```

## Asynchronous procedure call interrupts

Asynchronous procedure calls (APCs) provide a way for user programs and system code to execute

in the context of a particular user thread (and hence a particular process address space). Because

APCs are queued to execute in the context of a particular thread, they are subject to thread schedul ing rules and do not operate within the same environment as DPCs—namely, they do not operate at

DISPATCH_LEVEL and can be preempted by higher priority threads, perform blocking waits, and access

pageable memory.

---

That being said, because APCs are still a type of software interrupt, they must somehow still be able to wrangle control away from the thread's primary execution path, which, as shown in this section, is in part done by operating at a specific IROL called APC_LEVEL. This means that although APCs don't operate under the same restrictions as a DPC, there are still certain limitations imposed that developers must be wary of, which we'll cover shortly.

APCs are described by a kernel control object, called an APC object. APCs waiting to execute reside

in one of two kernel-managed APC queues. Unlike the DPC queues, which are per-processor (and di vided into threaded and nonthreaded), the APC queues are per-thread—with each thread having two

APC queues: one for kernel APCs and one for user APCs.

When asked to queue an APC, the kernel looks at the mode (user or kernel) of the APC and then inserts it into the appropriate queue belonging to the thread that will execute the APC routine. Before looking into how and when this APC will execute, let's look at the differences between the two modes. When an APC is queued against a thread, that thread may be in one of the three following situations:

- ■ The thread is currently running (and may even be the current thread)
■ The thread is currently waiting.
■ The thread is doing something else (ready, standby, and so on).
First, you might recall from Part 1, Chapter 4, "Thread scheduling," that a thread has an alertable state whenever performing a wait. Unless APCs have been completely disabled for a thread, for kernel APCs, this state is ignored—the APC always aborts the wait, with consequences that will be explained later in this section. For user NPCs however, the thread is interrupted only if the wait was alertable and instantiated on behalf of a user-mode component or if there are other pending user APCs that already started aborting the wait (which would happen if there were lots of processors trying to queue an APC to the same thread).

User APCs also never interrupt a thread that's already running in user mode; the thread needs to either perform an alertable wait or go through a ring transition or context switch that revisits the User APC queue. Kernel APCs, on the other hand, request an interrupt on the processor of the target thread, raising the IRQ to APC_LEVEL, notifying the processor that it must look at the kernel APC queue of its currently running thread. And, in both scenarios, if the thread was doing "something else," some transition that takes it into either the running or waiting state needs to occur. As a practical result of this, suspended threads, for example, don't execute APCs that are being queued to them.

We mentioned that APCs could be disabled for a thread, outside of the previously described scenarios around alertability. Kernel and driver developers can choose to do so through two mechanisms, one being to simply keep their IRQL at $APC_LEVEL or above while executing some piece of code. Because the thread is in a running state, an interrupt is normally delivered, but as per the IRQL rules we've explained, if the processor is already at $APC_LEVEL (or higher), the interrupt is masked out. Therefore, it is only once the IRQL has dropped to PASSIVE_LEVEL that the pending interrupt is delivered, causing the APC to execute.

---

The second mechanism, which is strongly preferred because it avoids changing interrupt controller state, is to use the kernel API KeEnterGuardedRegion, pairing with KeLeaveGuardedRegion when you want to restore APC delivery back to the thread. These APIs are recursive and can be called multiple times in a nested fashion. It is safe to context switch to another thread while still in such a region because the state updates a field in the thread object (KTHREAD) structure—SpecialApcDisable and not per-processor state.

Similarly, context switches can occur while at APC_LEVEL, even though this is per-processor state. The dispatcher saves the IRQL in the KTHREAD using the kernel write() and then sets the processor IRQL to the WaitIrd() of the new incoming thread (which could be PASSIVE_LEVEL). This creates an interesting scenario where technically, a PASSIVE_LEVEL thread can preempt an APCLOCKED thread. Such a possibility is common and entirely normal, proving that when it comes to thread execution, the scheduler outweighs any IRQL considerations. It is only by passing to DISPATCH_LEVEL, which leaves thread preemption, that IRQL supersedes the scheduler. Since APCLOCKED is the only IRQL that ends up behaving this way, it is often called a thread-local IRQL, which is not entirely accurate but is a sufficient approximation for the behavior described herein.

Regardless of how APCs are disabled by a kernel developer, one rule is paramount: Code can neither return to user mode with the APC at anything above PASSIVE_LEVEL nor can SpecialApcDisable be set to anything but 0. Such situations result in an immediate bugcheck, typically meaning some driver has forgotten to release a lock or leave its guarded region.

In addition to two APC modes, there are two types of APCs—for each node—a normal APCs and special APCs—both of which behave differently depending on the mode. We describe each combination:

• Special Kernel APC This combination results in an APC that is always inserted at the tail of all other existing special kernel APCh in the APC queue but before any normal kernel APCh. The kernel routine receives a pointer to the arguments and to the normal routine of the APC and operates at APC_LEVEL. It can only be inserted at the end of the APCh, which will be disabled through the mechanisms presented earlier but also through a third API called KeEnterCriticalRegion (paired with KeLeaveCriticalRegion), which updates the KernelApcDisable counter in KTHREAD but not SpecialApcDisable.

• Normal User APC This type of APC is always inserted at the kernel routine to the arguments and the normal routine. If the normal route hasn't been cleared as a result, they then drop the IRQL to PASSIVE_LEVEL and execute the normal routine and within the input arguments passed in by value this time. Once the normal route returns, the IRQL is raised back to APC_LEVEL again.

• Normal User APC This type of APC is always inserted at the kernel routine to the arguments and the normal routine. If the normal route hasn't been cleared as a result, they then drop the IRQL to PASSIVE_LEVEL and execute the normal routine and within the input arguments passed in by value this time. Once the normal route returns, the IRQL is raised back to APC_LEVEL again.

CHAPTER 8 System mechanisms 63


---

delivery (obviously, at PASSIVE_LEVEL) through the creation of a trap frame and exception frame that will eventually cause the user-mode APC dispatcher in Ntllldll.dll to take control of the thread once back in user mode, and which will call the supplied user pointer. Once the usermode APC returns, the dispatcher uses the NtContinue or NtContinueEx system call to return to the original trap frame.

- Note that if the kernel routine ended up clearing out the normal routine, then the thread, if
alerted, loses that state, and, conversely, if not alerted, becomes alerted, and the user APC
pending flag is set, potentially causing other user-mode APCs to be delivered soon. This is
performed by the KeTestAlertThread API to essentially still behave as if the normal APC would've
executed in user mode, even though the kernel routine cancelled the dispatch.
This User APC This combination of APC is a recent addition to newer builds of Windows 10
and generalizes a special dispensation that was done for the thread termination APC such that
other developers can make use of it as well. As we'll soon see, the act of terminating a remote
(oncurrent) thread requires the use of an APC, but it must also only occur once all kernel-mode
code has finished executing. Delivering the termination code as a User APC would fit the bill
quite well, but it would mean that a user-mode developer could avoid termination by perform-
ing a nonalertable wait or filling their queue with other User APCs instead.
To fix this scenario, the kernel long had a hard-coded check to validate if the kernel routine of a User APC was KcSchedulerApcTerminate. In this situation, the User APC was recognized as being "special" and put at the head of the queue. Further, the status of the thread was ignored, and the "user APC pending" state was always set, which forced execution of the APC at the next user-mode ring transition or context switch to this thread.

This functionality, however, being solely reserved for the termination code path, meant that developers who want to similarly guarantee the execution of their User APC, regardless of alertability state, had to resort to using more complex mechanisms such as manually changing the context of the thread using SetThreadContext, which is error-prone at best. In response, the QueueUserAPC2 API was created, which allows passing in the QUEUE_USER_APC_FLAGS_SPECIAL_USER_APC flag, officially exposing similar functionality to developers as well. Such APCs will always be added before any other user-mode APCs (except the termination APC, which is now extra special) and will ignore the alertable flag in the case of a waiting thread. Additionally, the APC will first be inserted exceptionally as a Special Kernel APC such that its kernel routine will execute almost instantaneously to then reregister the APC as a special user APC.

Table 8-9 summarizes the APC insertion and delivery behavior for each type of APC.

The executive uses kernel-mode APCs to perform operating system work that must be completed within the address space (in the context) of a particular thread. It can use special kernel-mode APCs to direct a thread to stop executing an interruptible system service, for example, or to record the results of an asynchronous I/O operation in a thread's address space. Environment subsystems use special kernel-mode APCs to make a thread suspend or terminate itself or to get or set its user-mode execution context. The Windows Subsystem for Linux (WSL) uses kernel-mode APCs to emulate the delivery of UNIX signals to Subsystem for UNIX Application processes.

64      CHAPTER 8   System mechanisms


---

TABLE 8-9 APC insertion and delivery

<table><tr><td>APC Type</td><td>Insertion Behavior</td><td>Delivery Behavior</td></tr><tr><td>Special (kernel)</td><td>Inserted right after the last spe-cial APC (at the head of all other normal APCs)</td><td>Kernel routine delivered at APC_LEVEL as soon as IROL drops, and the thread is not in a guarded region. It is given pointers to arguments specified when inserting the APC.</td></tr><tr><td>Normal (kernel)</td><td>Inserted at the tail of the kernel-mode APC list</td><td>Kernel routine delivered at APC_LEVEL when the thread is not in a guarded region. It is given pointers to arguments specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was cleared when the thread re-quires to argument specified when inserting the APC. Executes the normal routine, if any, in user mode at PASSIVE_LEVEL after the associated kernel routine is executed. It is given arguments returned by the associ-ated kernel routine (which can be the original argu-ments used during insertion or new ones). It is the normal routine was

---

Several Windows APIs—such as ReadFileEx, WriteFileEx, and QueueUserAPC—use user-mode APIs.

For example, the ReadFileEx and WriteFileEx functions allow the caller to specify a completion routine

to be called when the I/O operation finishes. The I/O completion is implemented by queuing an APC to

the thread that issued the I/O. However, the callback to the completion routine doesn't necessarily take

place when the APC is queued because user-mode APCs are delivered to a thread only when it's in an

alerting wait state. A thread can enter a wait state either by waiting for an object handle and specify ing that its wait is alertable (with the Windows WaitForMultipleObjectsEx function) or by testing directly

whether it has a pending APC (using SleepEx). In both cases, if a user-mode APC is pending, the kernel

interrupts (alerts) the thread, transfers control to the APC routine, and resumes the thread's execution

when the APC routine completes. Unlike kernel-mode APCs, which can execute at APC_LEVEL, user mode APCs execute at PASSIVE_LEVEL.

APC delivery can reorder the wait queues—the lists of which threads are waiting for what, and in what order they are waiting. (Wait resolution is described in the section “Low-IRQL synchronization,” later in this chapter.) If the thread is in a wait state when an APC is delivered, after the APC routine completes, the wait is reissued or re-executed. If the wait still isn't resolved, the thread returns to the wait state, but now it will be at the end of the list of objects it's waiting for. For example, because APCs are used to suspend a thread from execution, if the thread is waiting for any objects, its wait is removed until the thread is resumed, after which that thread will be at the end of the list of threads waiting to access the objects it was waiting for. A thread performing an alertable kernel-mode wait will also be woken up during thread termination, allowing such a thread to check whether it woke up as a result of termination or for a different reason.

## Timer processing

The system's clock interval timer is probably the most important device on a Windows machine, as evidenced by its high IRQL value (CLOCK_LEVEL) and due to the critical nature of the work it is responsible for. Without this interrupt, Windows would lose track of time, causing erroneous results in calculations of uptime and clock time—and worse, causing timers to no longer expire, and threads never to consume their quantum. Windows would also not be a preemptive operating system, and unless the current running thread yielded the CPU, critical background tasks and scheduling could never occur on a given processor.

### Timer types and intervals

Traditionally, Windows programmed the system clock to fire at some appropriate interval for the machine, and subsequently allowed drivers, applications, and administrators to modify the clock interval for their needs. This system clock thus fired in a fixed, periodic fashion, maintained by either by the Programmable Interrupt Timer (PIT) chip that has been present on all computers since the PC/AT or the Real Time Clock (RTC). The PIT works on a crystal that is tuned at one-third the NTSC color carrier frequency (because it was originally used for TV-Out on the first CGA video cards), and the HAL uses various achievable multiples to reach millisecond-unit intervals, starting at 1 ms all the way up to 15 ms. The RTC, on the other hand, runs at 32.768 kHz, which, by being a power of two, is easily configured to run at various intervals that are also powers of two. On RTC-based systems, the AIPC Multiprocessor HAL configured the RTC to fire every 15.6 milliseconds, which corresponds to about 64 times a second.

66      CHAPTER 8    System mechanisms


---

The PIT and RTC have numerous issues: They are slow, external devices on legacy buses, have poor granularity, force all processors to synchronize access to their hardware registers, are a pain to emulate, and are increasingly no longer found on embedded hardware devices, such as IoT and mobile. In response, hardware vendors created new types of timers, such as the ACPI Timer, also sometimes called the Power Management (PM) Timer, and the APIC Timer (which lives directly on the processor). The ACPI Timer achieved good flexibility and portability across hardware architectures, but its latency and implementation bugs caused issues. The APIC Timer, on the other hand, is highly efficient but is often already used by other platform needs, such as for profiling (although more recent processors now have dedicated profiling timers).

In response, Microsoft and the industry created a specification called the High Performance Event Timer, or HPET, which a much-improved version of the RTC. On systems with an HPET, it is used instead of the RTC or PIC. Additionally, ARM64 systems have their own timer architecture, called the Generic Interrupt Timer (GIT). All in all, the HAL maintains a complex hierarchy of finding the best possible timer on a given system, using the following order:

- 1. Try to find a synthetic hypervisor timer to avoid any kind of emulation if running inside of a

virtual machine.

2. On physical hardware, try to find a GIT. This is expected to work only on ARM64 systems.

3. If possible, try to find a per-processor timer, such as the Local APIC timer, if not already used.

4. Otherwise, find an HPET—going from an MSI-capable HPET to a legacy periodic HPET to any

kind of HPET.

5. If no HPET was found, use the RTC.

6. If no RTC is found, try to find some other kind of timer, such as the PIT or an SFI Timer, first

trying to find ones that support MSI interrupts, if possible.

7. If no timer has yet been found, the system doesn’t actually have a Windows compatible timer,

which should never happen.
The HPET and the LAPIC Timer have one more advantage—other than only supporting the typical

periodic mode we described earlier; they can also be configured in a one shot mode. This capability will

allow recent versions of Windows to leverage a dynamic tick model, which we explain later.

## Timer granularity

Some types of Windows applications require very fast response times, such as multimedia applications. In fact, some multimedia tasks require rates as low as 1 ms. For this reason, Windows from early on implemented APIs and mechanisms that enable lowering the interval of the system's clock interrupt, which results in more frequent clock interrupts. These APIs do not adjust a particular timer's specific rate (that functionality was added later, through enhanced timers, which we cover in an upcoming section); instead, they end up increasing the resolution of all timers in the system, potentially causing other timers to expire more frequently, too.

---

That being said, Windows tries its best to restore the clock timer back to its original value whenever it can. Each time a process requests a clock interval change, Windows increases an internal reference count and associates it with the process. Similarly, drivers (which can also change the clock rate) get added to the global reference count. When all drivers have restored the clock and all processes that modified the clock either have exited or restored it, Windows restores the clock to its default value (or barring that, to the next highest value that's been required by a process or driver).

## EXPERIMENT: Identifying high-frequency timers

Due to the problems that high-frequency timers can cause, Windows uses Event Tracing for Windows (ETW) to trace all processes and drivers that request a change in the system's clock interval, displaying the time of the occurrence and the requested interval. The current interval is also shown. This data is of great use to both developers and system administrators in identifying the causes of poor battery performance on otherwise healthy systems, as well as to decrease overall power consumption on large systems. To obtain it, simply run powercfg /energy, and you should obtain an HTML file called energy-report.html, similar to the one shown here:

![Figure](figures/Winternals7thPt2_page_099_figure_003.png)

---

Scroll down to the Platform Timer Resolution section, and you see all the applications that have modified the timer resolution and are still active, along with the call stacks that caused this call. Timer resolutions are shown in hundreds of nanoseconds, so a period of 20,000 corresponds to 2 ms. In the sample shown, two applications—namely, Microsoft Edge and the TightVNC remote desktop server—each requested a higher resolution.

You can also use the debugger to obtain this information. For each process, the EPROCESS

structure contains the fields shown next that help identify changes in timer resolution:

```bash
+0x4a8 TimerResolutionLink : .LIST_ENTRY | 0xfffffa80'05218fd8 - 0xfffffa80'059cd508
+0x4b8 RequestedInnerResolution : 0
+0x4bc ActiveThreadsdHighWatermark : 0x00000000
+0x4c9 TimerResolutionBlockChain : 0x7110
+0x4c9 TimerResolutionStackRecord : 0xfffffa80'0476ecd0 _PO_DIAG_STACK_RECORD
```

Note that the debugger shows you an additional piece of information: the smallest timer resolution that was ever requested by a given process. In this example, the process shown corresponds to PowerPoint 2010, which typically requests a lower timer resolution during slideshows but not during slide editing mode. The EPROCESS fields of PowerPoint, shown in the preceding code, prove this, and the stack could be parsed by dumping the PO_DIAG_STACK_RECORD structure.

Finally, the TimerResolutionLink field connects all processes that have made changes to timer resolution, through the ExpTimerResolutionListHead doubly linked list. Parsing this list with the debugger data model can reveal all processes on the system that have, or had, made changes to the timer resolution, when the powercfg command is unavailable or information on past processes is required. For example, this output shows that Edge, at various points, requested a 1 ms resolution, as did the Remote Desktop Client, and Cortana. WinDbg Preview, however, now only previously requested it but is still requesting it at the moment this command was written.

```bash
!kbd- dx -g Debugger.Utility.Collections.FromListEntry(*(nti_LIST_ENTRY*)&ntiExpTimerReso
lutionListHead, "nti_EPOCH", "TimerResolutionLink").Select(p => new { Name = ((char*
p.ImageFileName).ToDisplayString("sb"), Smallest = p.SmallestTimerResolution, Requested =
p.RequestedTimerResolution}),d
=============================
    =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =  =
```

CHAPTER 8    System mechanisms      69


---

```bash
= [15]   - mledge.exe     - 10000  - 0        =
  = [16]   - mledge.exe     - 10000  - 0        =
  = [17]   - mledge.exe     - 10000  - 0        =
  = [18]   - mledge.exe     - 10000  - 0        =
  = [19]   - SearchApp.exe    - 40000  = 0        =
  ==================================================
```

## Timer expiration

As we said, one of the main tasks of the ISR associated with the interrupt that the clock source generates is to keep track of system time, which is mainly done by the KeUpdateSystemTime routine. Its second job is to keep track of logical run time, such as process/thread execution times and the system tick time, which is the underlying number used by APIs such as GetTickCount that developers use to time operations in their applications. This part of the work is performed by KeUpdateRunTime. Before doing any of that work, however, KeUpdateRunTime checks whether any timers have expired.

Windows timers can be either absolute timers, which implies a distinct expiration time in the future, or relative timers, which contain a negative expiration value used as a positive offset from the current time during timer insertion. Internally, all timers are converted to an absolute expiration time, although the system keeps track of whether this is the "true" absolute time or a converted relative time. This difference is important in certain scenarios, such as Daylight Savings Time (or even manual clock changes). An absolute timer would still fire at 8:00 p.m. if the user moved the clock from 1:00 p.m. to 7:00 p.m., but a relative timer—say, one set to expire "in two hours"—would not feel the effect of the clock change because two hours haven't really elapsed. During system time-change events such as these, the kernel reprograms the absolute time associated with relative timers to match the new settings.

Back when the clock only fired in a periodic mode, since its expiration was at known interval multiples, each multiple of the system time that a timer could be associated with is an index called a hand, which is stored in the timer object's dispatcher header. Windows used that fact to organize all driver and application timers into linked lists based on an array where each entry corresponds to a possible multiple of the system time. Because modern versions of Windows 10 no longer necessarily run on a periodic tick (due to the dynamic tick functionality), a hand has instead been redefined as the upper 46 bits of the due time (which is in 100 ns units). This gives each hand an approximate "time" of 28 ms. Additionally, because on a given tick (especially when not firing on a fixed periodic interval), multiple hands could have expiring timers, Windows can no longer just check the current hand. Instead, a bitmap is used to track each hand in each processor's timer table. These pending hands are found using the bitmap and checked during every clock interrupt.

Regardless of method, these 256 linked lists live in what is called the timer table—which is in the PRC—enabling each processor to perform its own independent timer expiration without needing to acquire a global clock, as shown in Figure 8-19. Recent builds of Windows 10 can have up to two timer tables, for a total of 512 linked lists.

Later, you will see what determines which logical processor's timer table a timer is inserted on. Because each processor has its own timer table, each processor also does its own timer expiration

---

work. As each processor gets initialized, the table is filled with absolute timers with an infinite expiration time to avoid any incoherent state. Therefore, to determine whether a clock has expired, it is only necessary to check if there are any timers on the linked list associated with the current hand.

![Figure](figures/Winternals7thPt2_page_102_figure_001.png)

FIGURE 8-19 Example of per-processor timer lists.

Although updating counters and checking a linked list are fast operations, going through every timer and expiring it is a potentially costly operation—keep in mind that all this work is currently being performed at CLOCK_LEVEL, an exceptionally elevated IRQL. Similar to how a driver ISR queues a DPC to defer work, the clock ISR requests a DPC software interrupt, setting a flag in the PRCB so that the DPC draining mechanism knows timers need expiration. Likewise, when updating process/thread runtime, if the clock ISR determines that a thread has expired its quantum, it also queues a DPC software interrupt and sets a different PRCB flag. These flags are per-PRCB because each processor normally does its own processing of run-time updates because each processor is running a different thread and has different tasks associated with it. Table 8-10 displays the various fields used in timer expiration and processing.

DPCs are provided primarily for device drivers, but the kernel uses them, too. The kernel most frequently uses a DPC to handle quantum expiration. At every tick of the system clock, an interrupt occurs at clock IRQL. The clock interrupt handler (running at clock IRQL) updates the system time and then decrements a counter that tracks how long the current thread has run. When the counter reaches 0, the thread's time quantum has expired, and the kernel might need to reschedule the processor, a lowerpriority task that should be done at DPC/dispatch IRQL. The clock interrupt handler queues a DPC to initiate thread dispatching and then finishes its work and lowers the processor's IRQL. Because the DPC interrupt has a lower priority than do device interrupts, any pending device interrupts that surface before the clock interrupt completes are handled before the DPC interrupt occurs.

Once the IRQL eventually drops back to DISPATCH_LEVEL, as part of DPC processing, these two flags will be picked up.

CHAPTER 8    System mechanisms      71


---

TABLE 8-10 Timer processing KPRCB fields

<table><tr><td>KPRCB Field</td><td>Type</td><td>Description</td></tr><tr><td>LastTimerHand</td><td>Index (up to 256)</td><td>The last timer hand that was processed by this processor. In recent builds, part of TimerTable because there are now two tables.</td></tr><tr><td>ClockOwner</td><td>Boolean</td><td>Indicates whether the current processor is the clock owner.</td></tr><tr><td>TimerTable</td><td>KTIMER_TABLE</td><td>List heads for the timer table lists (256, or 512 on more recent builds).</td></tr><tr><td>DpcNormalTimerExpiration</td><td>Bit</td><td>Indicates that a DISPATCH_LEVEL interrupt has been raised to request timer expiration.</td></tr></table>


Chapter 4 of Part 1 covers the actions related to thread scheduling and quantum expiration. Here, we look at the timer expiration work. Because the timers are linked together by hand, the expiration code (executed by the DPC associated with the PRCB in the TimerExpirationDpc field, usually KlTimerExpirationDpc) parses this list from head to tail. (At insertion time, the timers nearest to the clock interval multiple will be first, followed by timers closer and closer to the next interval but still within this hand.) There are two primary tasks to expiring a timer:

- ■ The timer is treated as a dispatcher synchronization object (threads are waiting on the timer as
part of a timeout or directly as part of a wait). The wait-testing and wait-satisfaction algorithms
will be run on the timer. This work is described in a later section on synchronization in this chap-
ter. This is how user-mode applications, and some drivers, make use of timers.
■ The timer is treated as a control object associated with a DPC callback routine that executes
when the timer expires. This method is reserved only for drivers and enables very low latency
response to timer expiration. (The wait/dispatcher method requires all the extra logic of wait
signaling.) Additionally, because timer expiration itself executes at DISPATCH_LEVEL, where
DPCs also run, it is perfectly suited as a timer callback.
As each processor wakes up to handle the clock interval timer to perform system-time and run-time processing, it therefore also processes timer expirations after a slight latency/delay in which the lRQL drops from CLOCK_LEVEL to DISPATCH_LEVEL. Figure 8-20 shows this behavior on two processors— the solid arrows indicate the clock interrupt firing, whereas the dotted arrows indicate any timer expiration processing that might occur if the processor had associated timers.

![Figure](figures/Winternals7thPt2_page_103_figure_005.png)

FIGURE 8-20 Timer expiration.

---

## Processor selection

A critical determination that must be made when a timer is inserted is to pick the appropriate table to use—in other words, the most optimal processor choice. First, the kernel checks whether timer serialization is disabled. If it is, it then checks whether the timer has a DPC associated with its expiration, and if the DPC has been affinitized to a target processor, in which case it selects that processor's timer table. If the timer has no DPC associated with it, or if the DPC has not been bound to a processor, the kernel scans all processors in the current processor's group that have not been parked. (For more information on core parking, see Chapter 4 of Part 1.) If the current processor is parked, it picks the next closest neighboring unpaved processor in the same NUMA node; otherwise, the current processor is used.

This behavior is intended to improve performance and scalability on server systems that make use of Hyper-V, although it can improve performance on any heavily loaded system. As system timers pile up—because most drivers do not affinity their DPCs—CPU 0 becomes more and more congested with the execution of timer expiration code, which increases latency and can even cause heavy delays or missed DPCs. Additionally, timer expiration can start competing with DPCs typically associated with driver interrupt processing, such as network packet code, causing systemwide slowdowns. This process is exacerbated in a Hyper-V scenario, where CPU 0 must process the timers and DPCs associated with potentially numerous virtual machines, each with their own timers and associated devices.

By spreading the timers across processors, as shown in Figure 8-21, each processor's timer-expiration load is fully distributed among unparked logical processors. The timer object stores its associated processor number in the dispatcher header on 32-bit systems and in the object itself on 64-bit systems.

![Figure](figures/Winternals7thPt2_page_104_figure_004.png)

FIGURE 8-21 Timer queuing behaviors.

This behavior, although highly beneficial on servers, does not typically affect client systems that

much. Additionally, it makes each timer expiration event (such as a clock tick) more complex because a

processor may have gone idle but still have had timers associated with it, meaning that the processor(s)

still receiving clock ticks need to potentially scan everyone else's processor tables, too. Further, as

various processors may be cancelling and inserting timers simultaneously, it means there's inherent

asynchronous behaviors in timer expiration, which may not always be desired. This complexity makes

it nearly impossible to implement Modern Standby's resiliency phase because no one single processor

can ultimately remain to manage the clock. Therefore, on client systems, timer serialization is enabled if

Modern Standby is available, which causes the kernel to choose CPU 0 no matter what. This allows CPU

0 to behave as the default clock owner—the processor that will always be active to pick up clock inter rupts (more on this later).

---

![Figure](figures/Winternals7thPt2_page_105_figure_000.png)

Note This behavior is controlled by the kernel variable KsSerializeTimerExpiration, which is initialized based on a registry setting whose value is different between a server and client installation. By modifying or creating the value SerializeTimerExpiration under HKLM\ SYSTEM\CurrentControlSet\Control\SessionManager\Kernel and setting it to any value other than 0 or 1, serialization can be disabled, enabling timers to be distributed among processors. Deleting the value, or keeping it as 0, allows the kernel to make the decision based on Modern Standby availability, and setting it to 1 permanently enables serialization even on non-Modern Standby systems.

## EXPERIMENT: Listing system timers

You can use the kernel debugger to dump all the current registered timers on the system, as well as information on the DPC associated with each timer (if any). See the following output for a sample:

```bash
0: kb! !timer
Dump system timers
Interrupt time: 250fdc0f 0000000 [12/21/2020 03:30:27.739]
PROCESSOR O (nt!_KTIMER_TABLE ffffffff8011bea6d80 - Type 0 - High precision)
List Timer        Interrupt Low/High Fire Time                DPC/thread
PROCESSOR O (nt!_KTIMER_TABLE ffffffff8011bea6d80 - Type 1 - Standard)
List Timer        Interrupt Low/High Fire Time                DPC/thread
  1 ffffdb08d62b0f0b    0807e1fb 00000000      [        NEVER        ] thread ffffdb08d748f480
  4 ffffdb08d7837a20    68106a65 00000008   [12/21/2020 04:29:36.127]
  6 ffffdb08d2cf2c00    4c18f0d1 00000000   [12/21/2020 03:31:33.230]        tmeditTimeExpiry
                          (DPC @ ffffdb08d2fcf670)
  ffffff8011fd3da8A A fc10cdd1 00589a19   [  1/ 1/2020 00:00:00.054] tlnpExcYtoryCpicRoutine
                          (DPC @ ffffff8011fd3da8B)
  7 ffffdf08d8640400    3b2a2a33 00000000   [12/21/2020 03:31:04.772]       thread ffffdf08d85f2080
  ffffdf08d0fef300    7723f6b5 00000001  [12/21/2020 03:30:54.941]        tlnpExcYtoryCpicRoutine
                          FLTMGRIFlfltIrPcTrIStackProfileTimer (DPC @ ffffdf08d0def340)
  11 ffffff8011ffcfe70    6c2cd7643 00000000  [12/21/2020 03:32:27.052] tlnkDgTimeS1pDpcRoutine
                          (DPC @ ffffff8011ffcfe30)
  ffffdf08d75f0180    c42fec8e 00000000  [12/21/2020 03:34:54.707]       thread ffffdf08d75f0080
  ffffff80123475420    283baeb0 00000000  [12/21/2020 03:33:36.060]       tcprip!IpTimeout
                          (DPC @ ffffff80123475460)
  ...   
  58 ffffdf08d863e280 P 3fec06d0 00000000  [12/21/2020 03:31:12.803]       thread ffffdf08d8730080
                          ffffff8011fd3d948 A 90eb4dd1 00000887  [  1/ 1/2021 00:00:054] tlnpNextXpYearDpcRoutine
                          (DPC @ ffffff8011fd3d908)
  ...   
  104 ffffdf08d27e6d78 P 25a25441 00000000  [12/21/2020 03:30:28.699]       thread ffffdf08d8d27e6d38)
                          tcprip!TcpPeriodicTimeoutHandler (DPC @ ffffdf08d27e6d38)
  ffffdf08d27e6f10 P 25a25441 00000000  [12/21/2020 03:30:28.699]       thread ffffdf08d27e6ed0
                          tcprip!TcpPeriodicTimeoutHandler (DPC @ ffffdf08d27e6ed0)
  106 ffffdf08d29db048 P 251210d3 00000000  [12/21/2020 03:30:27.754]       CLASSNP!Class!CleavePacketTimerDpcr (DPC @ ffffdf08d29db088)
```

---

```bash
ffffffff80122e9d110   258f6e00 00000000 [12/21/2020 03:30:28.575]
                            NtfsNtfsVolumeCheckpointDpc (DPC @ ffffffff80122e9d0d0)
      108 ffffffff8011c6e6560   19b1caef 00000002 [12/21/2020 03:44:27.661]
             tamTpmCheckForProgressDpcRoutine (DPC @ ffffffff8011c6e65a0)
     111 ffffffff0bd2d7d540 P   25920ab5 00000000 [12/21/2020 03:28:592]
             stopportRaidXunitPendingDpcRoutine (DPC @ ffffffff80bd2d7d580)
     116 ffffffff0bd2d7da40 P   25920ab5 00000000 [12/21/2020 03:30:28.592]
             stopportRaidXUnitPendingDpcRoutine (DPC @ ffffffff80bd2d7da580)
     ...
     Total Timers: 221, Maximum List: 8
     Current Hand: 139
```

In this example, which has been shortened for space reasons, there are multiple driverassociated timers, due to expire shortly, associated with the Netbt.sys and Tcp.sys drivers (both related to networking), as well as Ntfs, the storage controller driver drivers. There are also background housekeeping timers due to expire, such as those related to power management, ETW, registry flushing, and Users Account Control (UAC) virtualization. Additionally, there are a dozen or so timers that don’t have any DPC associated with them, which likely indicates user-mode or kernel-mode timers that are used for wait dispatching. You can use !thread on the thread pointers to verify this.

Finally, three interesting timers that are always present on a Windows system are the timer that checks for Daylight Savings Time time-zone changes, the timer that checks for the arrival of the upcoming year, and the timer that checks for entry into the next century. One can easily locate them based on their typically distant expiration time, unless this experiment is performed on the eve of one of these events.

## Intelligent timer tick distribution

Figure 8-20, which shows processors handling the clock ISR and expiring timers, reveals that processor 1 wakes up several times (the solid arrows) even when there are no associated expiring timers (the dotted arrows). Although that behavior is required as long as processor 1 is running (to update the thread/process run times and scheduling state), what if processor 1 is idle (and has no expiring timers)? Does it still need to handle the clock interrupt? Because the only other work required that was referenced earlier is to update the overall system time/clock ticks, it's sufficient to designate merely one processor as the timekeeping processor (in this case, processor 0) and allow other processors to remain in their sleep state; if they wake, any time-related adjustments can be performed by resynchronizing with processor 0.

Windows does, in fact, make this realization (internally called intelligent timer tick distribution),

and Figure 8-22 shows the processor states under the scenario where processor 1 is sleeping (unlike

earlier, when we assumed it was running code). As you can see, processor 1 wakes up only five times

to handle its expiring timers, creating a much larger gap (sleeping period). The kernel uses a variable

KiPendingTimerBitmaps, which contains an array of affinity mask structures that indicate which logical

processors need to receive a clock interval for the given timer hand (clock-tick interval). It can then

CHAPTER 8 System mechanisms     75


---

appropriately program the interrupt controller, as well as determine to which processors it will send an

IPI to initiate timer processing.

![Figure](figures/Winternals7thPt2_page_107_figure_001.png)

FIGURE 8-22 Intelligent timer tick distribution applied to processor 1.

Leaving as large a gap as possible is important due to the way power management works in processors: as the processor detects that the workload is going lower and lower, it decreases its power consumption (P states), until it finally reaches an idle state. The processor then can selectively turn off parts of itself and enter deeper and deeper idle/sleep states, such as turning off caches. However, if the processor has to wake again, it will consume energy and take time to power up; for this reason, processor designers will risk entering these lower idle/sleep states (C-states) only if the time spent in a given state outweighs the time and energy it takes to enter and exit the state. Obviously, it makes no sense to spend 10 ms to enter a sleep state that will last only 1 ms. By preventing clock interrupts from waking sleeping processors unless needed (due to timers), they can enter deeper C-states and stay there longer.

## Timer coalescing

Although minimizing clock interrupts to sleeping processors during periods of no timer expiration gives a big boost to longer C-state intervals, with a timer granularity of 15 ms, many timers likely will be queued at any given hand and expire often, even if just on processor 0. Reducing the amount of software timer-expiration work would both help to decrease latency (by requiring less work at DISPATCH_LEVEL) as well as allow other processors to stay in their sleep states even longer (Because we've established that the processors wake up only to handle expiring timers, fewer timer expirations result in longer sleep times.) In truth, it is not just the number of expiring timers that really affects sleep state (it does affect latency), but the periodicity of these timer expirations—six timers all expiring at the same hand is a better option than six timers expiring at six different hands. Therefore, to fully optimize idle-time duration, the kernel needs to employ a coalescing mechanism to combine separate timer hands into an individual hand with multiple expirations.

Timer coalescing works on the assumption that most drivers and user-mode applications do not particularly care about the exact firing period of their timers (except in the case of multimedia applications, for example). This "don't care" region grows as the original timer period grows—an application waking up every 30 seconds probably doesn't mind waking up every 31 or 29 seconds instead, while a driver polling every second could probably poll every second plus or minus 50 ms without too

---

many problems. The important guarantee most periodic timers depend on is that their firing period remains constant within a certain range—for example, when a timer has been changed to fire every second plus 50 ms, it continues to fire within that range forever, not sometimes at every two seconds and other times at half a second. Even so, not all timers are ready to be coalested into coarser granularities, so Windows enables this mechanism only for timers that have marked themselves as coalescable, either through the KeSetCoalescableTimer kernel API or through its user-mode counterpart, SetWaitableTimerEx.

With these APIs, driver and application developers are free to provide the kernel with the maximum

tolerance (or tolerably delay) that their timer will endure, which is defined as the maximum amount of

time past the requested period at which the timer will still function correctly. (In the previous ex ample, the 1-second timer had a tolerance of 50 ms.) The recommended minimum tolerance is 32 ms,

which corresponds to about twice the 15.6 ms clock tick—any smaller value wouldn't really result in

any coalescing because the expiring timer could not be moved even from one clock tick to the next.

Regardless of the tolerance that is specified, Windows aligns the timer to one of four preferred coalesc ing intervals: 1 second, 250 ms, 100 ms, or 50 ms.

When a tolerable delay is set for a periodic time, Windows uses a process called shifting, which

causes the timer to drift between periods until it gets aligned to the most optimal multiple of the

period interval within the preferred coalescing interval associated with the specified tolerance (which

is then encoded in the dispatcher header). For absolute timers, the list of preferred coalescing intervals

is scanned, and a preferred expiration time is generated based on the closest acceptable coalescing

interval to the maximum tolerance the caller specified. This behavior means that absolute timers are

always pushed out as far as possible past their real expiration point, which spreads out timers as far as

possible and creates longer sleep times on the processors.

Now with timer coalescing, refer to Figure 8-20 and assume all the timers specified tolerances

and are thus coalescable. In one scenario, Windows could decide to coalesce the timers as shown in

Figure 8-23. Notice that now, processor 1 receives a total of only three clock interrupts, significantly

increasing the periods of idle sleep, thus achieving a lower C-state. Furthermore, there is less work to

do for some of the clock interrupts on processor 0, possibly removing the latency of requiring a drop

to DISPATCH_LEVEL at each clock interrupt.

![Figure](figures/Winternals7thPt2_page_108_figure_004.png)

FIGURE 8-23 Timer coalescing.

---

## Enhanced timers
