## Dispatcher database

To make thread-scheduling decisions, the kernel maintains a set of data structures known collectively

as the dispatcher database. The dispatcher database keeps track of which threads are waiting to execute

and which processors are executing which threads.

228   CHAPTER 4   Threads


---

To improve scalability, including thread-dispatching concurrency, Windows multiprocessor systems

have per-processor dispatcher ready queues and shared processor group queues, as illustrated in Fig ure 4-9. In this way, each CPU can check its own shared ready queue for the next thread to run without

having to lock the system-wide ready queues.

![Figure](figures/Winternals7thPt1_page_246_figure_001.png)

FIGURE 4-9 Windows multiprocessor dispatcher database. (This example shows six processors. P represents processes; T represents threads.)

Windows versions prior to Windows 8 and Windows Server 2012 used per-processor ready queues

and a per-processor ready summary, which were stored as part of processor control block (PRCB) struc ture. (To see the fields in the PRCB, type dt nt1_kprcb in the kernel debugger.) Starting with Windows

8 and Windows Server 2012, a shared ready queue and ready summary are used for a group of proces sors. This enables the system to make better decisions about which processor to use next for that group

of processors. (The per-CPU ready queues are still there and used for threads with affinity constraints.)

![Figure](figures/Winternals7thPt1_page_246_figure_004.png)

Note Because the shared data structure must be protected (by a spinlock), the group should not be too large. That way, contention on the queues is insignificant. In the current implementation, the maximum group size is four logical processors. If the number of logical processors is greater than four, then more than one group would be created, and the available processors spread evenly. For example, on a six-processor system, two groups of three processors each would be created.

The ready queues, ready summary (described next), and some other information is stored in a kernel structure named KSHARED_READY_QUEUE that is stored in the PRCB. Although it exists for every processor, it's used only on the first processor of each processor group, sharing it with the rest of the processors in that group.

CHAPTER 4   Threads      229


---

The dispatcher ready queues (ReadyList) is Head in KSHARED_READY_QUEUE) contain the threads that are in the ready state, waiting to be scheduled for execution. There is one queue for each of the 32 priority levels. T o speed up the selection of which thread to run or preempt, Windows maintains a 32-bit bitmap called the ready summary (ReadySummary). Each bit set indicates one or more threads in the ready queue for that priority level (bit 0 represents priority 0, bit 1 priority 1, and so on).

Instead of scanning each ready list to see whether it is empty or not (which would make scheduling

decisions dependent on the number of different priority threads), a single bit scan is performed as a

native processor command to find the highest bit set. Regardless of the number of threads in the ready

queue, this operation takes a constant amount of time.

The dispatcher database is synchronized by raising IRQL to DISPATCH_LEVEL (2). (For an explanation of interrupt priority levels, or IRQLs, see Chapter 6.) Raising IRQL in this way prevents other threads from interrupting thread dispatching on the processor because threads normally run at IRQL 0 or 1. However, more is required than just raising IRQL because other processors can simultaneously raise to the same IRQL and attempt to operate on their dispatcher database. How Windows synchronizes access to the dispatcher database is explained later in this chapter in the section "Multiprocessor systems."

## EXPERIMENT: Viewing ready threads

You can view the list of ready threads with the kernel-debugger! I ready command. This command displays the thread or list of threads that are ready to run at each priority level. Here is an example generated on a 32-bit machine with four logical processors:

```bash
0: kd> !Ready
KSHARED_READY_QUEUE 8147e800: (00) ****----------------------
SharedReadyQueue 8147e800: Ready Threads at priority 8
    THREAD 80af8bc0 Cid 1300.15c4 Teb: 7ffbd0b0 Win32Thread: 00000000 READY on
processor 80000002
    THREAD 80b58bc0 Cid 0454.0fc0 Teb: 7f82e000 Win32Thread: 00000000 READY on
processor 80000003
SharedReadyQueue 8147e800: Ready Threads at priority 7
    THREAD a24b4700 Cid 0004.11dc Teb: 00000000 Win32Thread: 00000000 READY on
processor 80000001
    THREAD a1bad040 Cid 0004.096c Teb: 00000000 Win32Thread: 00000000 READY on
processor 80000003
SharedReadyQueue 8147e800: Ready Threads at priority 6
    THREAD a1bad4c0 Cid 0004.0950 Teb: 00000000 Win32Thread: 00000000 READY on
processor 80000004
    THREAD 80b5e040 Cid 0574.12a4 Teb: 7fc3300 Win32Thread: 00000000 READY on
processor 80000000
SharedReadyQueue 8147e800: Ready Threads at priority 4
    THREAD 80b09bc0 Cid 0004.12dc Teb: 00000000 Win32Thread: 00000000 READY on
processor 80000003
SharedReadyQueue 8147e800: Ready Threads at priority 0
    THREAD 82889bc0 Cid 0004.0008 Teb: 00000000 Win32Thread: 00000000 READY on
processor 80000000
Processor 0: No threads in READY state
Processor 1: No threads in READY state
Processor 2: No threads in READY state
Processor 3: No threads in READY state
```

230    CHAPTER 4   Threads


---

The processor numbers have a 0x8000000 added to them, but the actual processor numbers are easy to see. The first line shows the address of the KSHARED_READY_QUEUE with the group number in parentheses (00 in the output) and then a graphic representation of the processors in this particular group (the four asterisks).

The last four lines seem odd, as they appear to indicate no ready threads, contradicting the

preceding output. These lines indicate ready threads from the older DispatcherReadyListHead

member of the PRCB because the per-processor ready queues are used for threads that have

restrictive affinity (set to run on a subset of processors inside that processor group).

You can also dump the KSHARED_READY_QUEUE with the address given by the !ready command:

```bash
0: kd- dt nt1_KSHARED_READY_QUEUE 8147e800
+0x000 Lock                : 0
+0x004 ReadySummary :   0x1d1
+0x008 ReadyListHead :  [32] _LIST_ENTRY [ 0x82889c5c - 0x82889c5c ]
+0x108 RunningSummary :  [32]  "???"
+0x128 Span               :  4
+0x12c LowProcIndex      :  0
+0x130 QueueIndex        :  1
+0x134 ProcCount         :  4
+0x138 Affinity           :  0xf
```

The ProcCount member shows the processor count in the shared group (4 in this example). Also note the ReadySummary value, 0x1d. This translates to 111010001 in binary. Reading the binary one bits from right to left, this indicates that threads exist in priorities 0, 4, 6, 7, 8, which match the preceding output.

## Quantum

As mentioned earlier in the chapter, a quantum is the amount of time a thread is permitted to run before Windows checks to see whether another thread at the same priority is waiting to run. If a thread completes its quantum and there are no other threads at its priority, Windows permits the thread to run for another quantum.

On client versions of Windows, threads run for two clock intervals by default. On server systems, threads run for 12 clock intervals by default. (We'll explain how to change these values in the "Controlling the quantum" section.) The rationale for the longer default value on server systems is to minimize context switching. By having a longer quantum, server applications that wake up because of a client request have a better chance of completing the request and going back into a wait state before their quantum ends.

The length of the clock interval varies according to the hardware platform. The frequency of the clock

interrupts is up to the HAL, not the kernel. For example, the clock interval for most x86 unprocessors is

about 10 milliseconds (note that these machines are no longer supported by Windows and are used here

only for example purposes), and for most x86 and x64 multiprocessors it is about 15 milliseconds. This

clock interval is stored in the kernel variable KeMaximumIncrement as hundreds of nanoseconds.

CHAPTER 4  Threads      231


---

Although threads run in units of clock intervals, the system does not use the count of clock ticks as the gauge for how long a thread has run and whether its quantum has expired. This is because thread run-time accounting is based on processor cycles. When the system starts up, it multiplies the processor speed (CPU clock cycles per second) in hertz (Hz) by the number of seconds it takes for one clock tick to fire (based on the KeLax100Increment value described earlier) to calculate the number of clock cycles to which each quantum is equivalent. This value is stored in the kernel variable KCyclesPerClockQuantum.

The result of this accounting method is that threads do not actually run for a quantum number

based on clock ticks. Instead, they run for a quantum target, which represents an estimate of what the

number of CPU clock cycles the thread has consumed should be when its turn would be given up. This

target should be equal to an equivalent number of clock interval timer ticks. This is because, as you just

saw, the calculation of clock cycles per quantum is based on the clock interval timer frequency, which

you can check using the following experiment. Note, however, that because interrupt cycles are not

charged to the thread, the actual clock time might be longer.

## EXPERIMENT: Determining the clock interval frequency

The Windows GetSystemTimeAdjustment function returns the clock interval. T o determine the clock interval, run the clockres tool from Sysinternals. Here's the output from a quad-core 64-bit Windows 10 system:

```bash
C:\clockres
ClockRes v2.0 - View the system clock resolution
Copyright (C) 2009 Mark Russinovich
SysInternals - www.sysinternals.com
Maximum timer interval: 15.600 ms
Minimum timer interval: 0.500 ms
Current timer interval: 1.000 ms
```

The current interval may be lower than the maximum (default) clock interval because of

multimedia timers. Multimedia timers are used with functions such as timeBeginPeriod and

timeSetEvent that are used to receive callbacks with intervals of 1 millisecond (ms) at best. This

causes a global reprogramming of the kernel interval timer, meaning the scheduler wakes up in

more frequent intervals, which can degrade system performance. In any case, this does not affect

quantum lengths, as described in the next section.

It's also possible to read the value using the kernel global variable KeMaximumIncrement as shown here (not the same system as the previous example):

```bash
0: kb-dd ntkiMaximumIncrement L1
814973b4  0002625a
0: kb-  0002625a
Evaluate expression: 156250 = 0002625a
```

This corresponds to the default of 15.6 ms.

---

## Quantum accounting

Each process has a quantum reset value in the process control block (KPROCESS). This value is used when creating new threads inside the process and is duplicated in the thread control block (KTHREAD), which is then used when giving a thread a new quantum target. The quantum reset value is stored in terms of actual quantum units (we'll discuss what these mean soon), which are then multiplied by the number of clock cycles per quantum, resulting in the quantum target.

As a thread runs, CPU clock cycles are charged at different events, such as context switches, interrupts, and certain scheduling decisions. If, at a clock interval timer interrupt, the number of CPU clock cycles charged has reached (or passed) the quantum target, quantum end processing is triggered. If there is another thread at the same priority waiting to run, a context switch occurs to the next thread in the ready queue.

Internally, a quantum unit is represented as one-third of a clock tick. That is, one clock tick equals three quantities. This means that on client Windows systems, threads have a quantum reset value of 6 (2 * 3) and that server systems have a quantum reset value of 36 (12 * 3) by default. For this reason, the KiCyclicsPerClockQuantum value is divided by 3 at the end of the calculation previously described, because the original value describes only CPU clock cycles per clock interval timer tick.

The reason a quantum was stored internally as a fraction of a clock tick rather than as an entire tick was to allow for partial quantum decay-on-wait completion on versions of Windows prior to Windows Vista. Prior versions used the clock interval timer for quantum expiration. If this adjustment had not been made, it would have been possible for threads to never have their quantums reduced. For example, if a thread ran, entered a wait state, ran again, and entered another wait state but was never the currently running thread when the clock interval timer fired, it would never have its quantum charged for the time it was running. Because threads now have CPU clock cycles charged instead of quanṭums, and because this no longer depends on the clock interval timer, these adjustments are not required.

## EXPERIMENT: Determining the clock cycles per quantum

Windows doesn't expose the number of clock cycles per quantum through any function. However,

with the calculation and description we've given, you should be able to determine this on your

own using the following steps and a kernel debugger such as WinDbg in local debugging mode:

1. Obtain your processor frequency as Windows has detected it. You can use the value

stored in the PRCB's MHz field, which you can display with the !cui nfo command.

Here is a sample output of a four-processor system running at 2794 megahertz (MHz):

```bash
1kds -lcpinfo
   CP  F/M/S Manufacturer  MHz PRCB Signature  MSR 88 Signature Features
 0  6,60,3 GenuineIntel 2794 FFFFFFFF00000000 &FFFFFFF00000000<a3cd3fff
 1  6,60,3 GenuineIntel 2794 FFFFFFFF00000000 &FFFFFFF00000000<a3cd3fff
 2  6,60,3 GenuineIntel 2794 FFFFFFFF00000000 &a3cd3fff
 3  6,60,3 GenuineIntel 2794 FFFFFFFF00000000 &a3cd3fff
```

---

2. Convert the number to hertz (Hz). This is the number of CPU clock cycles that occur each second on your system—in this case, 2,794,000,000 cycles per second.

3. Obtain the clock interval on your system by using clockres. This measures how long

it takes before the clock fires. On the sample system used here, this interval was 15.625

msec.

4. Convert this number to the number of times the clock interval timer fires each second. One second equals 1,000 ms, so divide the number derived in step 3 by 1,000. In this case, the timer fires every 0.015625 seconds.

5. Multiply this count by the number of cycles each second that you obtained in step 2. In this case, 43,656,250 cycles have elapsed after each clock interval.

6. Remember that each quantum unit is one-third of a clock interval, so divide the number of cycles by 3. This gives you 14,528,083, or 0x0DEC13 in hexadecimal. This is the number of clock cycles each quantum unit should take on a system running at 2,794 MHz with a clock interval of around 15.6 ms.

7. To verify your calculation, dump the value of k1CyclesPerClockQuant on your system. It should match (or be close enough because of rounding errors).

```bash
!kbk_dd nt!K1CyclesPerClockQuantum L1
814975c 00dec010
```

## Controlling the quantum

You can change the thread quantum for all processes, but you can choose only one of two settings:

short (two clock ticks, which is the default for client machines) or long (12 clock ticks, which is the

default for server systems).

![Figure](figures/Winternals7thPt1_page_251_figure_009.png)

Note By using the job object on a system running with long quantum, you can select other quantum values for the processes in the job.

To change this setting, right-click the This PC icon on the desktop. Alternatively, in Windows Explorer, choose Properties, click the Advanced System Settings label, click the Advanced tab, click the Settings button in the Performance section, and click yet another Advanced tab. Figure 4-10 shows the resulting dialog box.

---

![Figure](figures/Winternals7thPt1_page_252_figure_000.png)

FIGURE 4-10 Quantum configuration in the Performance Options dialog box.

This dialog box contains two key options:

- ■ Programs This setting designates the use of short, variable quantums, which is the default for
client versions of Windows (and other client-like versions, such as mobile, XBOX, HoloLens, and
so on). If you install Terminal Services on a server system and configure the server as an applica-
tion server, this setting is selected so that the users on the terminal server have the same quan-
tum settings that would normally be set on a desktop or client system. You might also select this
manually if you were running Windows Server as your desktop OS.
■ Background Services This setting designates the use of long, fixed quantums—the default
for server systems. The only reason you might select this option on a workstation system is if
you were using the workstation as a server system. However, because changes in this option
take effect immediately, it might make sense to use it if the machine is about to run a back-
ground or server-style workload. For example, if a long-running computation, encoding, or
modeling simulation needs to run overnight, you could select the Background Services option
at night and return the system to Programs mode in the morning.
## Variable quantums

When variable quantums are enabled, the variable quantum table (PspVariableQuantums), which holds an array of six quantum numbers, is loaded into the PspForegroundQuantum table (a three-element array) that is used by the PspComputeQuantum function. Its algorithm will pick the appropriate quantum index based on whether the process is a foreground process—that is, whether it contains the thread that owns the foreground window on the desktop. If this is not the case, an index of 0 is chosen, which corresponds to the default thread quantum described earlier. If it is a foreground process, the quantum index corresponds to the priority separation.

CHAPTER 4  Threads      235


---

This priority separation value determines the priority boost (described in the upcoming section

"Priority boosts") that the scheduler will apply to foreground threads, and it is thus paired with an appropriate extension of the quantum. For each extra priority level (up to 2), another quantum is given to the thread. For example, if the thread receives a boost of one priority level, it receives an extra quantum as well. By default, Windows sets the maximum possible priority boost to foreground threads, meaning that the priority separation will be 2, which means quantum index 2 is selected in the variable quantum table. This leads to the thread receiving two extra quantums, for a total of three quantums.

Table 4-2 describes the exact quantum value (recall that this is stored in a unit representing one-third

of a clock tick) that will be selected based on the quantum index and which quantum configuration is

in use.

TABLE 4-2 Quantum values

<table><tr><td></td><td colspan="3">Short Quantum Index</td><td colspan="3">Long Quantum Index</td></tr><tr><td>Variable</td><td>6</td><td>12</td><td>18</td><td>12</td><td>24</td><td>36</td></tr><tr><td>Fixed</td><td>18</td><td>18</td><td>18</td><td>36</td><td>36</td><td>36</td></tr></table>


Thus, when a window is brought into the foreground on a client system, all the threads in the process containing the thread that owns the foreground window have their quantums tripled. Threads in the foreground process run with a quantum of six clock ticks, whereas threads in other processes have the default client quantum of two clock ticks. In this way, when you switch away from a CPU-intensive process, the new foreground process will get proportionally more of the CPU. This is because when its threads run, they will have a longer turn than background threads (again, assuming the thread priorities are the same in both the foreground and background processes).

## Quantum settings registry value

The user interface that controls quantum settings described earlier modifies the registry value Win32 PrioritySeparation in the key HKLM\SYSTEM\CurrentControl\Set\Control\PriorityControl. In

addition to specifying the relative length of thread quantums (short or long), this registry value also

defines whether variable quantums should be used, as well as the priority separation (which, as you've

seen, will determine the quantum index used when variable quantums are enabled). This value consists

of 6 bits divided into the three 2-bit fields shown in Figure 4-11.

![Figure](figures/Winternals7thPt1_page_253_figure_007.png)

FIGURE 4-11 Fields of the Win32PrioritySeparation registry value.

The fields shown in Figure 4-11 can be defined as follows:

- ■ Short vs. Long A value of 1 specifies long quantums, and a value of 2 specifies short ones.
A setting of 0 or 3 indicates that the default appropriate for the system will be used (short for
client systems, long for server systems).
---

- ■ Variable vs. Fixed A value of 1 means to enable the variable quantum table based on the

algorithm shown in the "Variable quantums" section. A setting of 0 or 3 means that the default

appropriate for the system will be used (variable for client systems, fixed for server systems).

■ Priority Separation This field (stored in the kernel variable PsPrioritySeparation) defines

the priority separation (up to 2), as explained in the "Variable quantums" section.
When you use the Performance Options dialog box (refer to Figure 4-10), you can choose from

only two combinations: short quantums with foreground quantums tripled, or long quantums with no

quantum changes for foreground threads. However, you can select other combinations by modifying

the Win32PrioritySeparation registry value directly.

Threads that are part of a process running in the idle process priority class always receive a single

thread quantum, ignoring any sort of quantum configuration settings, whether set by default or set

through the registry.

On Windows Server systems configured as application servers, the initial value of the Win32ProritySeparation registry value will be hex 26, which is identical to the value set by the Optimize Performance for Programs option in the Performance Options dialog box. This selects quantum and priorityboost behavior like that on Windows client systems, which is appropriate for a server used primarily to host users' applications.

On Windows client systems and on servers not configured as application servers, the initial value

of the Win32PrioritySeparation registry setting will be 2. This provides values of 0 for the Short

vs. Long and Variable vs. Fixed Bit fields, relying on the default behavior of the system (depending on

whether it is a client system or a server system) for these options. However, it provides a value of 2 for

the Priority Separation field. After the registry value has been changed via the Performance Options

dialog box, it cannot be restored to this original value other than by modifying the registry directly.

## EXPERIMENT: Effects of changing the quantum configuration

Using a local kernel debugger, you can see how the two quantum configuration settings, Programs

and Background Services, affect the PspPrioritySeparation and PspForegroundQuantum tables,

as well as modify the QuantumReset value of threads on the system. Take the following steps:

- 1. Open the System utility in Control Panel or right-click the This PC icon on the desktop
and choose Properties.

2. Click the Advanced System Settings label, click the Advanced tab, click the Settings
button in the Performance section, and click the second Advanced tab.

3. Select the Programs option and click Apply. Keep this dialog box open for the duration
of the experiment.

4. Dump the values of PsPrioritySeparation and PspForegroundQuantum, as shown
here. The values shown are what you should see on a Windows system after making the
change in steps 1–3. Notice how the variable short quantum table is being used and that
a priority boost of 2 will apply to foreground applications:
---

```bash
!kbd_tdo!NsPSPrioritySeparation L1
!ffccc8f0756e0388 00000002
!kbd_tdo!NsPSForegroundQuantum L3
!ffccc8f076189028 06 0c 12
```

5. Look at the QuantumReset value of any process on the system. As noted, this is the

default full quantum of each thread on the system when it is replenished. This value is

cached into each thread of the process, but the KPROCESS structure is easier to look at.

Notice in this case it is 6, because WinDbg, like most other applications, gets the quan tum set in the first entry of the PspForegroundQuantum table:

```bash
!kbd .process
Implicit process is now ffffe001'4f51f080
!kbd dt nt1_KPACCESS ffffe001'4f51f080 QuantumReset
    +0x1bd QuantumReset : 6 ''
```

6. Change the Performance option to Background Services in the dialog box you opened in steps 1 and 2.

7. Repeat the commands shown in steps 4 and 5. You should see the values change in a manner consistent with our discussion in this section:

```bash
1kb- dd ntlPsPrioritySeparation L1
ffffffff80375e0388 00000000
1kb- db ntlPsForegroundQuantum L3
ffffffff8037618928 24 24 24
1kb- dt ntl_XPCRESS fffff0e0f14f51f080 QuantumReset
    +0x1bt QuantumReset : 36 '$'
```

## Priority boosts

The Windows scheduler periodically adjusts the current (dynamic) priority of threads through an

internal priority-boosting mechanism. In many cases, it does so to decrease various latencies (that is,

to make threads respond faster to the events they are waiting on) and increase responsiveness. In oth ers, it applies these boosts to prevent inversion and starvation scenarios. Here are some of the boost

scenarios that will be described in this section (and their purpose):

- ■ Boosts due to scheduler/dispatcher events (latency reduction)

■ Boosts due to I/O completion (latency reduction)

■ Boosts due to user interface (UI) input (latency reduction/responsiveness)

■ Boosts due to a thread waiting on an executive resource (ERESOURCE) for too long (starvation

avoidance)

■ Boosts when a thread that's ready to run hasn't been running for some time (starvation and

priority-inversion avoidance)

APTER 4 Threads

From the Library
---

Like any scheduling algorithms, however, these adjustments aren't perfect, and they might not benefit all applications.

![Figure](figures/Winternals7thPt1_page_256_figure_001.png)

Note Windows never boosts the priority of threads in the real-time range (16 through 3).

Therefore, scheduling is always predictable with respect to other threads in this range. Windows

assumes that if you're using the real-time thread priorities, you know what you're doing.

Client versions of Windows also include a pseudo-boosting mechanism that occurs during multimedia playback. Unlike the other priority boosts, multimedia-playback boosts are managed by a kernel-mode driver called the Multimedia Class Scheduler Service (mmcss.sys). They are not really boosts, however. The driver merely sets new priorities for the threads as needed. Therefore, none of the rules regarding boosts apply. We'll first cover the typical kernel-managed priority boosts and then talk about MMCS and the kind of "boosting" it performs.

## Boosts due to scheduler/dispatcher events

Whenever a dispatch event occurs, the KIeXeTDiDispatcher routine is called. Its job is to process the deferred ready list by calling KIiProcessThreadwa1tList and then call kzCheckForThreadD1spatch to check whether any threads on the current processor should not be scheduled. Whenever such an event occurs, the caller can also specify which type of boost should be applied to the thread, as well as what priority increment the boost should be associated with. The following scenarios are considered as AdjJust1RawIt dispatch events because they deal with a dispatcher (synchronization) object entering a signaled state, which might cause one or more threads to wake up:

- ■ An asynchronous procedure call (APC; described in Chapter 6 and in more detail in Chapter 8 in
Part 2) is queued to a thread.
■ An event is set or pulsed.
■ A timer was set, or the system time was changed, and timers had to be reset.
■ A mutex was released or abandoned.
■ A process exited.
■ An entry was inserted in a queue (KQUEUE), or the queue was flushed.
■ A semaphore was released.
■ A thread was alerted, suspended, resumed, frozen, or thawed.
■ A primary UMS thread is waiting to switch to a scheduled UMS thread.
For scheduling events associated with a public API (such as SetEvent), the boost increment applied is specified by the caller. Windows recommends certain values to be used by developers, which will be described later. For alerts, a boost of 2 is applied (unless the thread is put in an alert wait by calling KeAlertThreadByThreadId, in which case the applied boost is 1), because the alert API does not have a parameter allowing a caller to set a custom increment.

---

The scheduler also has two special AdjustBoost dispatch events, which are part of the lock-ownership priority mechanism. These boosts attempt to fix situations in which a caller that owns the lock at prioritity x ends up releasing the lock to a waiting thread at priority < x. In this situation, the new owner thread must wait for its turn (if running at priority x), or worse, it might not even get to run at all if its priority is lower than x. This means the releasing thread continues its execution, even though it should have caused the new owner thread to wake up and take control of the processor. The following two dispatcher events cause an AdjustBoost dispatcher exit:

- ■ An event is set through the KeSetEventBoostPriority interface, which is used by the

ERESOURCE reader-writer kernel lock.

■ A gate is set through the KeSignalGate interface, which is used by various internal mechanisms

when releasing a gate lock.
## Unwait boosts

Unwait boosts attempt to decrease the latency between a thread waking up due to an object being

signaled (thus entering the ready state) and the thread actually beginning its execution to process the

unwait (thus entering the running state). Generally speaking, it is desirable that a thread that wakes up

from a waiting state would be able to run as soon as possible.

The various Windows header files specify recommended values that kernel-mode callers of APIs

such as KeReleaseMutex, KeSetEvent and KeReleaseSemaphore should use, which correspond to

definitions such as MUTANT_INCREMENT, SEMAPHORE_INCREMENT, and EVENT_INCREMENT. These three

definitions have always been set to 1 in the headers, so it is safe to assume that most unwait on these

objects result in a boost of 1. In the user-mode API, an increment cannot be specified, nor do the native

system calls such as NtSetEvent have parameters to specify such a boost. Instead, when these APIs call

the underlying Ke interface, they automatically use the default _INCREMENT definition. This is also the

case when mutexes are abandoned or timers are reset due to a system time change: The system uses

the default boost that normally would have been applied when the mutex would have been released.

Finally, the APC boost is completely up to the caller. Soon, you'll see a specific usage of the APC boost

related to I/O completion.

Note Some dispatcher objects don't have boosts associated with them. For example, when a timer is set or expires, or when a process is signaled, no boost is applied.

All these boosts of 1 attempt to solve the initial problem by assuming that both the releasing and

waiting threads are running at the same priority. By boosting the waiting thread by one priority level,

the waiting thread should preempt the releasing thread as soon as the operation completes. Unfortu nately, on uniprocessor systems, if this assumption does not hold, the boost might not do much. For

example, if the waiting thread is at priority 4 and the releasing thread is at priority 8, waiting at priority

5 won't do much to reduce latency and force preemption. On multiprocessor systems, however, due to

the stealing and balancing algorithms, this higher-priority thread may have a better chance of getting

picked up by another logical processor. This is due to a design choice made in the initial NT architecture,

---

which is to not track lock ownership (except a few locks). This means the scheduler can't be sure who really owns an event and if it's really being used as a lock. Even with lock-ownership tracking, ownership is not usually passed (to avoid convoy issues) other than in the executive resource case, explained in an upcoming section.

For certain kinds of lock objects that use events or gates as their underlying synchronization object, the lock-ownership boost resolves the dilemma. Also, on a multiprocessor machine, the ready thread might get picked up on another processor (due to the processor distribution and load-balancing schemes you'll see later), and its high priority might increase the chances of it running on that secondary processor instead.

## Lock-ownership boosts

Because the executive-resource (ERESOURCE) and critical-section lock use underlying dispatcher objects, releasing these locks results in an unwait boost as described earlier. On the other hand, because the high-level implementation of these objects tracks the owner of the lock, the kernel can make a more informed decision as to what kind of boost should be applied by using the AdjustBoost reason. In these kinds of boosts, AdjustIncrement is set to the current priority of the releasing (or setting) thread, minus any graphical user interface (GUI) foreground separation boost. In addition, before the

KiEx1Dtlspatcher function is called, KiRemoveBoostThread is called by the event and gate code to return the releasing thread back to its regular priority. This step is needed to avoid a lock-convey situation, in which two threads repeatedly passing the lock between one another get ever-increasing boosts.

Note Pushlocks, which are unfair locks because ownership of the lock in a contended acquisition path is not predictable (rather, it's random, like a spinlock), do not apply priority boosts due to lock ownership. This is because doing so only contributes to preemption and priority proliferation, which isn't required because the lock becomes immediately free as soon as it is released (bypassing the normal wait/unwait path).

Other differences between the lock-ownership boost and unwait boost will be exposed in the way

the scheduler actually applies boosting, which is the subject of the next section.

## Priority boosting after I/O completion

Windows gives temporary priority boosts upon completion of certain I/O operations so that threads that were waiting for an I/O have more of a chance to run right away and process whatever was being waited for. Although you'll find recommended boost values in the Windows Driver Kit (WDK) header files (by searching for #define IO, in Wdm.h or Ntdk.h), the actual value for the boost is up to the device driver. (These values are listed in Table 4-3.) It is the device driver that specifies the boost when it completes an I/O request on its call to the kernel function, IoCompleteRequest. In Table 4-3, notice that I/O requests to devices that warrant better responsiveness have higher boost values.

CHAPTER 4  Threads      241


---

TABLE 4-3 Recommended boost values

<table><tr><td>Device</td><td>Boost</td></tr><tr><td>Disk, CD-ROM, parallel, video</td><td>1</td></tr><tr><td>Network, mailslot, named pipe, serial</td><td>2</td></tr><tr><td>Keyboard, mouse</td><td>6</td></tr><tr><td>Sound</td><td>8</td></tr></table>


![Figure](figures/Winternals7thPt1_page_259_figure_002.png)

Note You might intuitively expect better responsiveness from your video card or disk than a boost of 1. However, the kernel is in fact trying to optimize for latency, to which some devices (as well as human sensory inputs) are more sensitive than others. To give you an idea, a sound card expects data around every 1 ms to play back music without perceptible glitches, while a video card needs to output at only 24 frames per second, or about once every 40 ms, before the human eye can notice glitches.

As hinted earlier, these I/O completion boosts rely on the unwait boosts seen in the previous section. Chapter 6 shows the mechanism of I/O completion in depth. For now, the important detail is that the kernel implements the signaling code in the IoCompleteRequest API through the use of either an APC (for asynchronous I/O) or through an event (for synchronous I/O). When a driver passes in—for example, IO_DISK_INCREMENT to IoCompleteRequest for an asynchronous disk read—the kernel calls KeInsertQueueApc with the boost parameter set to IO_DISK_INCREMENT. In turn, when the thread's wait is broken due to the APC, it receives a boost of 1.

Be aware that the boost values given in Table 4-3 are merely recommendations by Microsoft. Driver developers are free to ignore them, and certain specialized drivers can use their own values. For example, a driver handling ultrasound data from a medical device, which must notify a user-mode visualization application of new data, would probably use a boost value of 8 as well, to satisfy the same latency as a sound card. In most cases, however, due to the way Windows driver stacks are built (again, see Chapter 6 for more information), driver developers often write minidrivers, which call into a Microsoft-owned driver that supplies its own boost to IoCompleteRequest. For example, RAID or SATA controller card developers typically call StorPortCompleteRequest to complete processing their requests. This call does not have any parameter for a boost value, because the StorPort.sys driver fills in the right value when calling the kernel. Additionally, whenever any file system driver (identified by setting its device type to FILE_ DEVICE_DISK_FILE_SYSTEM or FILE_DEVICE_NETWORK_FILE_SYSTEM) completes its request, a boost of IO_DISK_INCREMENT is always applied if the driver passed in IO_NO_INCREMENT (0) instead. So this boost value has become less of a recommendation and more of a requirement enforced by the kernel.

## Boosts during waiting on executive resources

When a thread attempts to acquire an executive resource (ERESOURCE; see Chapter 8 in Part 2 for more

information on kernel-synchronization objects) that is already owned exclusively by another thread, it

must enter a wait state until the other thread has released the resource. To limit the risk of deadlocks,

the executive performs this wait in intervals of 500 ms instead of doing an infinite wait on the resource.

242    CHAPTER 4  Threads


---

At the end of these 500 ms, if the resource is still owned, the executive attempts to prevent CPU starvation by acquiring the dispatcher lock, boosting the owning thread or threads to 15 (if the original owner priety is less than the waiter's and not already 15), resetting their quantums, and performing another wait.

Because executive resources can be either shared or exclusive, the kernel first boosts the exclusive

owner and then checks for shared owners and boosts all of them. When the waiting thread enters the

wait state again, the hope is that the scheduler will schedule one of the owner threads, which will have

enough time to complete its work and release the resource. Note that this boosting mechanism is used

only if the resource doesn't have the Disable Boost flag set, which developers can choose to set if the

priority-inversion mechanism described here works well with their usage of the resource.

Additionally, this mechanism isn't perfect. For example, if the resource has multiple shared owners, the executive boosts all those threads to priority 15. This results in a sudden surge of high-priority threads on the system, all with full quantums. Although the initial owner thread will run first (because it was the first to be boosted and therefore is first on the ready list), the other shared owners will run next because the waiting thread's priority was not boosted. Only after all the shared owners have had a chance to run and their priority has been decreased below the waiting thread will the waiting thread finally get its chance to acquire the resource. Because shared owners can promote or convert their ownership from shared to exclusive as soon as the exclusive owner releases the resource, it's possible for this mechanism not to work as intended.

## Priority boosts for foreground threads after waits

As will be described shortly, whenever a thread in the foreground process completes a wait operation on a kernel object, the kernel boosts its current (not base) priority by the current value of PsPrioritySeparation. (The windowing system is responsible for determining which process is considered to be in the foreground.) As described earlier in this chapter in the section "Controlling the quantum," PsPrioritySeparation reflects the quantum-table index used to select quanmums for the threads of foreground applications. However, in this case, it is being used as a priority boost value.

The reason for this boost is to improve the responsiveness of interactive applications. By giving the

foreground application a small boost when it completes a wait, it has a better chance of running right

away, especially when other processes at the same base priority might be running in the background.

EXPERIMENT: Watching foreground priority boosts and decays

Using the CPU Stress tool, you can watch priority boosts in action. Take the following steps:

- 1. Open the System utility in Control Panel or right-click the This Computer icon on the
desktop and choose Properties.

2. Click the Advanced System Settings label, click the Advanced tab, click the Settings
button in the Performance section, and click the Advanced tab.

3. Select the Programs option. This gives PsPrioritySeparation a value of 2.
---

4. Run CPU Stress, right-click thread 1, and choose Busy from the context menu.

5. Start the Performance Monitor tool.

6. Click the Add Counter toolbar button or press Ctrl+I to open the Add Counters dialog

box.

7. Select the Thread object and then select the Priority Current counter.

8. In the Instances box, select <All Instances> and click Search.

9. Scroll down to the CPUSTRES process, select the second thread (thread 1; the first thread is the GUI thread) and click the Add button. You should see something like this:

![Figure](figures/Winternals7thPt1_page_261_figure_006.png)

10. Click OK.

11. Right-click the counter and select Properties.

12. Click the Graph tab and change the maximum vertical scale to 16. Then click OK.

13. Bring the CPUSTRES process to the foreground. You should see the priority of the CPUSTRES thread being boosted by 2 and then decaying back to the base priority. CPUSTRES periodically receives a boost of 2 because the thread you're monitoring is sleeping about 25 percent of the time and then waking up. (This is the Busy activity level.) The boost is applied when the thread wakes up. If you set the activity level to Maximum, you won't see any boosts because Maximum in CPUSTRES puts the thread into an infinite loop. Therefore, the thread doesn't invoke any wait functions and there fore doesn't receive any boosts.

---

![Figure](figures/Winternals7thPt1_page_262_figure_000.png)

14. When you've finished, exit Performance Monitor and CPU Stress.

## Priority boosts after GUI threads wake up

Threads that own windows receive an additional boost of 2 when they wake up because of windowing

activity such as the arrival of window messages. The windowing system (Win32k.sys) applies this boost

when it calls KeSetEvent to set an event used to wake up a GUI thread. The reason for this boost is

similar to the previous one: to favor interactive applications.

## EXPERIMENT: Watching priority boosts on GUI threads

You can see the windowing system apply its boost of 2 for GUI threads that wake up to process

window messages by monitoring the current priority of a GUI application and moving the mouse

across the window. Just follow these steps:

- 1. Open the System utility in Control Panel.

2. Click the Advanced System Settings label, click the Advanced tab, click the Settings

button in the Performance section, and click the Advanced tab.

3. Select the Programs option. This gives PsPrioritySeparation a value of 2.

4. Run Notepad.
---

5. Start the Performance Monitor tool.

6. Click the Add Counter toolbar button or press Ctrl+I to open the Add Counters dialog

box.

7. Select the Thread object and then select the Priority Current counter.

8. In the Instances box, type Notepad. Then click Search.

9. Scroll down to the Notepad/0 entry, click it, click the Add button, and then click OK.

10. As in the previous experiment, change the maximum vertical scale to 16. You should see the priority of thread 0 in Notepad at 8 or 10. (Because Notepad entered a wait state shortly after it received the boost of 2 that threads in the foreground process receive, it might not yet have decayed from 10 to 8.)

11. With Performance Monitor in the foreground, move the mouse across the Notepad window. (Make both windows visible on the desktop.) Notice that the priority sometimes remains at 10 and sometimes at 9, for the reasons just explained.

![Figure](figures/Winternals7thPt1_page_263_figure_007.png)

Note You won't likely catch Notepad at 8. This is because it runs so little after receiving the GUI thread boost of 2 that it never experiences more than one priority level of decay before waking up again. (This is due to additional windowing activity and the fact that it receives the boost of 2 again.)

12. Bring Notepad to the foreground. You should see the priority rise to 12 and remain there. This is because the thread is receiving two boosts: the boost of 2 applied to GUI threads when they wake up to process windowing input and an additional boost of 2 because Notepad is in the foreground. (Or, you may see it drop to 11 if it experiences the normal priority decay that occurs for boosted threads on the quantum end.)

13. Move the mouse over Notepad while it's still in the foreground. You might see the priority drop to 11 (or maybe even 10) as it experiences the priority decay that normally occurs on booted threads as they complete their turn. However, the boost of 2 that is applied because it's the foreground process remains as long as Notepad remains in the foreground.

14. Exit Performance Monitor and Notepad.

## Priority boosts for CPU starvation

Imagine the following situation: A priority 7 thread is running, preventing a priority 4 thread from ever receiving CPU time. However, a priority 11 thread is waiting for some resource that the priority 4 thread has locked. But because the priority 7 thread in the middle is eating up all the CPU time, the priority 4 thread will never run long enough to finish whatever it's doing and release the resource blocking the priority 11 thread. This scenario is known as priority inversion.

246   CHAPTER 4  Threads


---

What does Windows do to address this situation? An ideal solution (at least in theory) would be

to track locks and owners and boost the appropriate threads so that forward progress can be made.

This idea is implemented with a feature called Autoboost, described later in this chapter in the section

"Autoboost." However, for general starvation scenarios, the following mitigation is used.

You saw how the code responsible for executive resources manages this scenario by boosting

the owner threads so that they can have a chance to run and release the resource. However, execu tive resources are only one of the many synchronization constructs available to developers, and the

boosting technique will not apply to any other primitive. Therefore, Windows also includes a generic

CPU starvation-relief mechanism as part of a thread called the balance-set manager. (This is a system

thread that exists primarily to perform memory-management functions and is described in more detail

in Chapter 5.) Once per second, this thread scans the ready queues for any threads that have been in

the ready state (that is, haven't run) for approximately 4 seconds. If it finds such a thread, the balance set manager boosts the thread's priority to 15 and sets the quantum target to an equivalent CPU clock

cycle count of 3 quantum units. After the quantum expires, the thread's priority decays immediately

to its original base priority. If the thread wasn't finished and a higher-priority thread is ready to run,

the decayed thread returns to the ready queue, where it again becomes eligible for another boost if it

remains there for another 4 seconds.

The balance-set manager doesn't actually scan all the ready threads every time it runs. To minimize the CPU time it uses, it scans only 16 ready threads; if there are more threads at that priority level, it remembers where it left off and picks up again on the next pass. Also, it boosts only 10 threads per pass. If it finds more than 10 threads merging this particular boost (which indicates an unusually busy system), it stops the scan and picks up again on the next pass.

![Figure](figures/Winternals7thPt1_page_264_figure_003.png)

Note As mentioned, scheduling decisions in Windows are not affected by the number of threads and are made in constant time. Because the balance-set manager must scan ready queues manually, this operation depends on the number of threads on the system; more threads require more scanning time. However, the balance-set manager is not considered part of the scheduler or its algorithms and is simply an extended mechanism to increase reliability. Additionally, because of the cap on threads and queues to scan, the performance impact is minimized and predictable in a worst-case scenario.

## EXPERIMENT: Watching priority boosts for CPU starvation

Using the CPU Stress tool, you can watch priority boosts in action. In this experiment, you'll see CPU usage change when a thread's priority is boosted. Take the following steps:

- 1. Run CPUSTRES.exe.

2. The activity level of thread 1 is Low. Change it to Maximum.

3. The thread priority of thread 1 is Normal. Change it to Lowest.
---

4. Click thread 2. Its activity level is Low. Change it to Maximum.

5. Change the process affinity mask to a single logical processor. To do so, open the Process menu and choose Affinity. (It doesn't matter which processor.) Alternatively, use Task Manager to make the change. The screen should look something like this:

![Figure](figures/Winternals7thPt1_page_265_figure_002.png)

6. Start the Performance Monitor tool.

7. Click the Add Counter toolbar button or press Ctrl+I to open the Add Counters dialog box.

8. Select the Thread object and then select the Priority Current counter.

9. In the Instances box, type CPUSTRES and click Search.

10. Select threads 1 and 2 (thread 0 is the GUI thread), click the Add button, and click OK.

11. Change the vertical scale maximum to 16 for both counters.

12. Because Performance Monitor refreshes once per second, you may miss the priority boosts. To help with that, press Ctrl+H to freeze the display. Then force updates to occur more frequently by pressing and holding down Ctrl+U. With some luck, you may see a priority boost for the lower-priority thread to level 15 like so:

![Figure](figures/Winternals7thPt1_page_265_figure_010.png)

13. Exit Performance Monitor and CPU Stress.

248    CHAPTER 4  Threads


---

## Applying boosts

Back in KiExitDispatcher, you saw that KiProcessThreadWaitList is called to process any threads in the deferred ready list. It is here that the boost information passed by the caller is processed. This is done by looping through each DeferredReady thread, unlinking its wait blocks (only Active and Bypassed blocks are unlinked), and setting two key values in the kernel's thread control block: AdjustReason and AdjustIncrement. The reason is one of the two Adjust possibilities seen earlier, and the increment corresponds to the boost value. KiDeferredReadyThread is then called. This makes the thread ready for execution by running two algorithms: the quantum and priority selection algorithm (which you are about to see in two parts) and the processor selection algorithm (which is shown in the "Processor selection" section later in this chapter).

Let's first look at when the algorithm applies boosts, which happens only in cases when a thread is not in the real-time priority range. For an AdjustUwa1t boost, it will be applied only if the thread is not already experiencing an unusual boost and only if the thread has not disabled boosting by calling SetThreadPriorityToBoost, which sets the DisableBoost flag in the KTHREAD. Another situation that can disable boosting in this case is if the kernel has realized that the thread has actually exhausted its quantum (but the clock interrupt did not fire to consume it) and it has come out of a wait that lasted less than two clock ticks.

If these situations are not currently true, the new priority of the thread will be computed by adding the AdjustIncrement to the thread's current base priority. Additionally, if the thread is known to be part of a foreground process (meaning that the memory priority is set to MEMORY_PRIORITY_FOREGROUND, which is configured by Win32k.sys when focus changes), this is where the priority-separation boost (PsPrioritySeparation) is applied by adding its value on top of the new priority. This is also known as the foreground priority boost, which was explained earlier.

Finally, the kernel checks whether this newly computed priority is higher than the current priority of

the thread, and it limits this value to an upper bound of 15 to avoid crossing into the real-time range. It

then sets this value as the thread's new current priority. If any foreground separation boost was applied,

it sets this value in the ForegroundBoost field of the KTHREAD, which results in a Prio rityDecrement

equal to the separation boost.

For AdjustBoost boosts, the kernel checks whether the thread's current priority is lower than the

AdjustIncrement (recall this is the priority of the setting thread) and whether the thread's current pri ority is below 13. If so, and priority boosts have not been disabled for the thread, the AdjustIncrement

priority is used as the new current priority, limited to a maximum of 13. Meanwhile, the UnusualBoost

field of the KTHREAD contains the boost value, which results in a PriorityDecrement equal to the lock ownership boost.

In all cases where a Prio rityDecrement is present, the quantum of the thread is also recomputed to be the equivalent of only one clock tick, based on the value of KillClockQuantumTarget. This ensures that foreground and unusual boosts will be lost after one clock tick instead of the usual two (or other configured value), as will be shown in the next section. This also happens when an AdjustBoost is requested but the thread is running at priority 13 or 14 or with boosts disabled.

After this work is complete, AdjustReason is now set to AdjustNone.

CHAPTER 4  Threads      249


---

## Removing boosts

Removing boosts is done in KiDeferredReadyThread as boosts and quantum recomputations are

being applied (as shown in the previous section). The algorithm first begins by checking the type of

adjustment being done.

For an AdjustNone scenario, which means the thread became ready perhaps due to a preemption, the thread's quantum will be recomputed if it already hit its target but the clock interrupt has not yet noticed, as long as the thread was running at a dynamic priority level. Additionally, the thread's priority will be recomputed. For an AdjustUwait or AdjustBoost scenario on a non-real-time thread, the kernel checks whether the thread silently exhausted its quantum (as in the prior section). If so, or if the thread was running with a base priority of 14 or higher, or if no PriorityDecrement is present and the thread has completed a wait that lasted longer than two clock ticks, the quantum of the thread is recomputed, as is its priority.

Priority recomputation happens on non-real-time threads. It's done by taking the thread's current priority, subtracting its foreground boost, subtracting its unusual boost (the combination of these last two items is the PriorityDecrement), and finally subtracting 1. This new priority is bounded with the base priority as the lowest bound and any existing priority decrement is zeroed out (clearing unusual and foreground boosts). This means that in the case of a lock-ownership boost or any of the other unusual boosts explained, the entire boost value is now lost. On the other hand, for a regular Adj ust tNowait ! boost, the priority naturally trickles down by 1 due to the subtraction by 1. This lowering eventually stops when the base priority is hit due to the lower bound check.

There is another instance where boosts must be removed, which goes through the KIRemoveBoostThread function. This is a special-case boost removal that occurs due to the lock-ownership boost rule, which specifies that the setting thread must lose its boost when donating its current priority to the waking thread (to avoid a lock convoy). It is also used to undo the boost due to targeted deferred procedure calls (DPCs) as well as the boost against ERESOURCE lock-starvation boost. The only special detail about this routine is that when computing the new priority, it takes special care to separate the ForegroundBoost and UnusualBoost components of the PriorityDecrement to maintain any GUI foreground-separation boost that the thread accumulated. This behavior, which appeared starting with Windows 7, ensures that threads relying on the lock-ownership boost do not behave erratically when running in the foreground, or vice-versa.

Figure 4-12 displays an example of how normal boosts are removed from a thread as it experiences

quantum end.

![Figure](figures/Winternals7thPt1_page_267_figure_006.png)

FIGURE 4-12 Priority boosting and decay.

250    CHAPTER 4   Threads

---

## Priority boosts for multimedia applications and games

Although Windows' CPU-starvation priority boosts might be enough to get a thread out of an abnormally long wait state or potential deadlock, they simply cannot deal with the resource requirements imposed by a CPU-intensive application such as Windows Media Player or a 3D computer game.

Skipping and other audio glitches have long been a common source of irritation among Windows users. The Windows user-mode audio stack exacerbates this situation because it offers even more chances for preemption. To address this, client versions of Windows use the MMCSS driver (described earlier in this chapter), implemented in %SystemRoot%\System32\Drivers\MMCSS.sys. Its purpose is to ensure glitch-free multimedia playback for applications that register with it.

![Figure](figures/Winternals7thPt1_page_268_figure_003.png)

Note Windows 7 implements MMCS5 as a service (rather than a driver). This posed a potential risk, however. If the MMCS5 managing thread blocked for any reason, the threads managed by it would retain their real-time priorities, potentially causing system-wide starvation. The solution was to move the code to the kernel where the managing thread (and other resources used by MMCS5) could not be touched. There are other benefits to being a kernel driver, such as holding a direct pointer to process and thread objects rather than IDs or handles. This bypasses searches based on IDs or handles and allows faster communication with the scheduler and Power Manager.

Client applications can register with MMCSS by calling AvSetMmThreadCharacteristics with

a task name that must match one of the subkeys under HKLM\SOFTWARE\Microsoft\Windows NT\

CurrentVersion\Multimedia\SystemProfileTasks. (The list can be modified by OEMs to include

other specific tasks as appropriate.) Out of the box, the following tasks exist:

- ● Audio

● Capture

● Distribution

● Games

● Low Latency

● Playback

● Pro Audio

● Window Manager
Each of these tasks includes information about the various properties that differentiate them.

The most important one for scheduling is called the Scheduling Category, which is the primary factor

determining the priority of threads registered with MMCS. Table 4-4 shows the various scheduling

categories.

---

TABLE 4-4 Scheduling categories

<table><tr><td>Category</td><td>Priority</td><td>Description</td></tr><tr><td>High</td><td>23-26</td><td>Pro Audio threads running at a higher priority than any other thread on the system except for critical system threads</td></tr><tr><td>Medium</td><td>16-22</td><td>The threads part of a foreground application such as Windows Media Player</td></tr><tr><td>Low</td><td>8-15</td><td>All other threads that are not part of the previous categories</td></tr><tr><td>Exhausted</td><td>4-6</td><td>Threads that have exhausted their share of the CPU and will continue running only if no other higher-priority threads are ready to run</td></tr></table>


The main mechanism behind MMCSS boosts the priority of threads inside a registered process to the priority level matching their scheduling category and relative priority within this category for a guaranteed period. It then lowers those threads to the exhausted category so that other, non-multimedia threads on the system can also get a chance to execute.

By default, multimedia threads get 80 percent of the CPU time available, while other threads receive 20 percent. (Based on a sample of 10 ms, that would be 8 ms and 2 ms, respectively.) You can change this percentage by modifying the SystemResponsiveness registry value under the HKLM\SOFTWARE\ Microsoft\Windows NT\CurrentVersionOn\Multimedia1SystemProfile key. The value can range from 10 to 100 percent (20 is the default; setting a value lower than 10 evaluates to 10), which indicates the CPU percentage guaranteed to the system (not the registered audio apps). MMCS5 scheduling thread runs at priority 27 because they need to preempt any Pro Audio threads to lower their priority to the exhausted category.

As discussed, changing the relative thread priorities within a process does not usually make sense, and no tool allows this because only developers understand the importance of the various threads in their programs. On the other hand, because applications must manually register with MMCS and provide it with information about what kind of thread this is, MMCS does have the necessary data to change these relative thread priorities—and developers are well aware that this will happen.

## EXPERIMENT: MMCSS priority boosting

In this experiment, you'll see the effects of MMCSS priority boosting.

- 1. Run Windows Media Player (wmplayer.exe). (Other playback programs might not take
advantage of the API calls required to register with MMCSS.)

2. Play some audio content.

3. Using Task Manager or Process Explorer, set the affinity of the Wmplayer.exe process so
that it runs on only one CPU.

4. Start the Performance Monitor tool.

5. Using Task Manager, change Performance Monitor's priority class to Realtime so it will
have a better chance of recording activity.
---

- 6. Click the Add Counter toolbar button or press Ctrl+I to open the Add Counters dialog box.

7. Select the Thread object and then select the Priority Current.

8. In the Instances box, type Wmplayer, click Search, and then select all its threads.

9. Click the Add button and click OK.

10. Open the Action menu and choose Properties.

11. On the Graph tab, change the maximum vertical scale to 32. You should see one or more
priority-16 threads inside Wmplayer, which will be constantly running unless there is a
higher-priority thread requiring the CPU after they are dropped to the exhausted category.

12. Run CPU Stress.

13. Set the activity level of thread 1 to Maximum.

14. The priority of thread 1 is Normal. Change it to Time Critical.

15. Change the CPUSTRES priority class to High.

16. Change the CPUSTRES affinity to use the same CPU used for Wmplayer. The system
should slow down considerably, but the music playback should continue. Every so often,
you'll be able to get back some responsiveness from the rest of the system.

17. In Performance Monitor, notice that the WmPlayer priority 16 threads drop from time to
time as shown here:
![Figure](figures/Winternals7thPt1_page_270_figure_001.png)

CHAPTER 4  Threads      253


---

MMCS5' functionality does not stop at simple priority boosting, however. Because of the nature of network drivers on Windows and the NDIS stack, DPCs are quite common mechanisms for delaying work after an interrupt has been received from the network card. Because DPCs run at an IRQL level higher than user-mode code (see Chapter 6 for more information on DPCs and IRQLs), long-running network card driver code can still interrupt media playback—for example, during network transfers or when playing a game.

MMCSs sends a special command to the network stack, telling it to throttle network packets during the duration of the media playback. This throttling is designed to maximize playback performance—at the cost of some small loss in network throughput (which would not be noticeable for network operations usually performed during playback, such as playing an online game). The exact mechanisms behind it do not belong to any area of the scheduler, so we'll leave them out of this description.

MMCSs also supports a feature called deadline scheduling. The idea is that an audio-playing program does not always need the highest priority level in its category. If such a program uses buffering (obtaining audio data from disk or network) and then plays the buffer while building the next buffer, deadline scheduling allows a client thread to indicate a time when it must get the high priority level to avoid glitches, but live with a slightly lower priority (within its category) in the meantime. A thread can use the AvTaskIndex yields function to indicate the next time it must be allowed to run, specifying the time it needs to get the highest priority within its category. Until that time arrives, it gets the lowest priority within its category, potentially freeing more CPU time to the system.

## Autoboost

Autoboot is a framework targeted at the priority-inversion problem described in the previous section. The idea is to track lock owners and lock waiters in such a way that would allow boosting the appropriate threads' priorities (I/O priority as well if needed) to allow threads to make forward progress. The lock information is stored in a static array of KLOCK_ENTRY objects inside the KTHREAD structure. The current implementation uses a maximum of six entries. Each KLOCK_ENTRY maintains two binary trees: one for locks owned by the thread and the other for locks waited on by the thread. These trees are keyed by priority so that constant time is required to determine the highest priority to which boosting should be applied. If boost is required, the owner's priority is set to the waiter's priority. It may also boost I/O priority if these were issued with low priority. (See Chapter 6 for more on I/O priority.) As with all priority boosts, the maximum priority achievable by Autoboost is 15. (The priority of real-time threads is never boosted.)

Current implementation uses the Autoboost framework for pushlocks and guarded mutexes synchronization primitives, which are exposed to kernel code only. (See Chapter 8 in Part 2 for more on these objects.) The framework is also used by some executive components for specialized cases. Future versions of Windows may implement Autoboost for user-mode accessible objects that have an ownership concept, such as critical sections.

---

## Context switching

A thread's context and the procedure for context switching vary depending on the processor's archi tecture. A typical context switch requires saving and reloading the following data:

- ■ Instruction pointer

■ Kernel stack pointer

■ A pointer to the address space in which the thread runs (the process's page table directory)
The kernel saves this information from the old thread by pushing it onto the current (old thread's) kernel-mode stack, updating the stack pointer, and saving the stack pointer in the old thread's KTHREAD structure. The kernel stack pointer is then set to the new thread's kernel stack, and the new thread's context is loaded. If the new thread is in a different process, it loads the address of its page table directory into a special processor register so that its address space is available. (See the description of address translation in Chapter 5.) If a kernel APC that needs to be delivered is pending, an interrupt at IRQL 1 is requested. (For more information on APCS, see Chapter 8 in Part 2.) Otherwise, control passes to the new thread's restored instruction pointer and the new thread resumes execution.

## Direct Switch

Windows 8 and Server 2012 introduced an optimization called Direct Switch, that allows a thread to donate its quantum and boost to another thread, which is then immediately scheduled on the same processor. In synchronous client/server scenarios, this can produce significant throughput improvements because the client/server threads are not migrated to other processors that may be idle or parked. Another way to think about this is that at any given time, only the client or the server thread is running, so the thread scheduler should treat them as a single logical thread. Figure 4-13 shows the effect of using Direct Switch.

![Figure](figures/Winternals7thPt1_page_272_figure_006.png)

FIGURE 4-13   Direct Switch.

---

The scheduler has no way of knowing that the first thread (T1 in Figure 4-13) is about to enter a wait state after signaling some synchronization object that the second thread (T2) is waiting on. Therefore, a special function must be called to let the scheduler know that this is the case (atomic signal and wait).

If possible, the KiDi1rectSwi tchThread function performs the actual switch. It's called by KiExi t dispatcher if passed a flag indicating to use Direct Switch if possible. Priority donation, in which the first thread's priority is "donated" to the second thread (if the latter's priority is lower than the former), is applied if specified by yet another bit flag to KiExi tds patcher. In the current implementation, these two flags are always specified together (or none at all), meaning in any Direct Switch attempt, priority donation is attempted as well. Direct Switch can fail—for example, if the target thread's affinity precludes it from running on the current processor. However, if it succeeds, the quantum of the first thread is transferred to the target thread and the first thread loses its remaining quantum.

Direct Switch is currently used in the following scenarios:

- ■ If a thread calls the SignalObjectAndWait Windows API (or its kernel equivalent
NtSignalAndWaitForSingleObject)

■ ALPC (described in Chapter 8 in Part 2)

■ Synchronous remote procedure call (RPC) calls

■ COM remote calls (currently MTA [multithreaded apartment] to MTA only)
## Scheduling scenarios

Windows answers the question of "Who gets the CPU?" based on thread priority, but how does this approach work in practice? The following sections illustrate just how priority-driven preemptive multitasking works on the thread level.

### Voluntary switch

A thread might voluntarily relinquish use of the processor by entering a wait state on some object

(such as an event, a mutex, a semaphore, an I/O completion port, a process, a thread, and so on) by

calling one of the Windows wait functions such as WaitForSingleObject or WaitForMultipleObjects.

(Waiting for objects is described in more detail in Chapter 8 in Part 2.)

Figure 4-14 illustrates a thread entering a wait state and Windows selecting a new thread to run. In Figure 4-14, the top block (thread) is voluntarily relinquishing the processor so that the next thread in the ready queue can run. (This is represented by the halo it has when in the Running column.) Although it might appear from this figure that the relinquishing thread's priority is being reduced, it's not. It's just being moved to the wait queue of the objects the thread is waiting for.

---

![Figure](figures/Winternals7thPt1_page_274_figure_000.png)

FIGURE 4-14   Voluntary switching.

## Preemption

In this scheduling scenario, a lower-priority thread is preempted when a higher-priority thread becomes ready to run. This situation might occur for a couple of reasons:

- ■ A higher-priority thread's wait completes (the event that the other thread was waiting for has
occurred).
■ A thread priority is increased or decreased.
In either of these cases, Windows must determine whether the currently running thread should continue to run or be preempted to allow a higher-priority thread to run.

![Figure](figures/Winternals7thPt1_page_274_figure_006.png)

Note Threads running in user mode can preempt threads running in kernel mode. The

mode in which the thread is running doesn't matter; the thread priority is the determining

factor.

When a thread is preempted, it is put at the head of the ready queue for the priority it was running at (see Figure 4-15).

![Figure](figures/Winternals7thPt1_page_274_figure_009.png)

FIGURE 4-15 Preemptive thread scheduling.

CHAPTER 4  Threads     257


---

In Figure 4-15, a thread with priority 18 emerges from a wait state and repossesses the CPU, causing the thread that had been running (at priority 16) to be bumped to the head of the ready queue. Notice that the bumped thread doesn't go to the end of the queue. Rather, it goes to the beginning. When the preempting thread has finished running, the bumped thread can complete its quantum.

## Quantum end

When the running thread exhausts its CPU quantum, Windows must determine whether the thread's priority should be decremented and then whether another thread should be scheduled on the processor.

If the thread priority is reduced (for example, because of some boost it received before), Windows

looks for a more appropriate thread to schedule, such as one in a ready queue with a higher priority

than the new priority for the currently running thread. If the thread priority isn't reduced and there

are other threads in the ready queue at the same priority level, Windows selects the next thread in the

ready queue at that same priority level. It then moves the previously running thread to the tail of that

queue, giving it a new quantum value and changing its state from running to ready. This is illustrated

in Figure 4-16. If no other thread of the same priority is ready to run, the thread gets to run for another

quantum.

![Figure](figures/Winternals7thPt1_page_275_figure_004.png)

FIGURE 4-16 Quantum-end thread scheduling.

As you saw, instead of simply relying on a clock interval timer-based quantum to schedule threads, Windows uses an accurate CPU clock cycle count to maintain quantum targets. Windows also uses this count to determine whether quantum end is currently appropriate for the thread—something that might have happened previously and is important to discuss.

Using a scheduling model that relies only on the clock interval timer, the following situation can occur:

- ■ Threads A and B become ready to run during the middle of an interval. (Scheduling code runs
not just at each clock interval, so this is often the case.)
■ Thread A starts running but is interrupted for a while. The time spent handling the interrupt is
charged to the thread.
■ Interrupt processing finishes and thread A starts running again, but it quickly hits the next clock
interval. The scheduler can assume only that thread A had been running all this time and now
switches to thread B.
---

- ■ Thread 8 starts running and has a chance to run for a full clock interval (barring preemption or
interrupt handling).
In this scenario, thread A was unfairly penalized in two different ways. First, the time it spent handling a device interrupt was counted against its own CPU time, even though the thread probably had nothing to do with the interrupt. (Interrupts are handled in the context of whichever thread was running at the time, as discussed in Chapter 6.) It was also unfairly penalized for the time the system was idling inside that clock interval before it was scheduled. Figure 4-17 illustrates this scenario.

![Figure](figures/Winternals7thPt1_page_276_figure_002.png)

FIGURE 4-17 Unfair time slicing in pre-Vista versions of Windows.

Windows keeps an accurate count of the exact number of CPU clock cycles spent doing work that the thread was scheduled to do (which means excluding interrupts). It also keeps a quantum target of clock cycles that should have been spent by the thread at the end of its quantum. Therefore, both of the unfair decisions that would have been made against thread A as described in the preceding paragraph will not happen in Windows. Instead, the following situation occurs:

- ■ Threads A and B become ready to run during the middle of an interval.
■ Thread A starts running but is interrupted for a while. The CPU clock cycles spent handling the
interrupt are not charged to the thread.
■ Interrupt processing finishes and thread A starts running again, but it quickly hits the next clock
interval. The scheduler looks at the number of CPU clock cycles charged to the thread and com-
pares them to the expected CPU clock cycles that should have been charged at quantum end.
■ Because the former number is much smaller than it should be, the scheduler assumes that
thread A started running in the middle of a clock interval and might have been additionally
interrupted.
■ Thread A gets its quantum increased by another clock interval, and the quantum target is
recalculated. Thread A now has its chance to run for a full clock interval.
■ At the next clock interval, thread A has finished its quantum, and thread B now gets a chance
to run.
Figure 4-18 illustrates this scenario.

CHAPTER 4   Threads      259


---

![Figure](figures/Winternals7thPt1_page_277_figure_000.png)

FIGURE 4-18 Fair time slicing in current versions of Windows.

### Termination

When a thread finishes running (either because it returned from its main routine, called ExitThread, or was killed with TerminateThread), it moves from the running state to the terminated state. If there are no handles open on the thread object, the thread is removed from the process thread list and the associated data structures are deallocated and released.

## Idle threads

When no runnable thread exists on a CPU, Windows dispatches that CPU's idle thread. Each CPU has its own dedicated idle thread. This is because on a multiprocessor system, one CPU can be executing a thread while other CPUs might have no threads to execute. Each CPU's idle thread is found via a pointer in that CPU's PRCB.

All the idle threads belong to the idle process. The idle process and idle threads are special cases in

many ways. They are, of course, represented by EPROCESS/KPROCESS and ETHREAD/THREAD structures,

but they are not executive manager processes and thread objects. Nor is the idle process on the system

process list. (This is why it does not appear in the output of the kernel debugger's J process 0 0 com mand.) However, the idle thread or threads and their process can be found in other ways.

EXPERIMENT: Displaying the structures of the idle threads and idle process

You can find the idle thread and process structures in the kernel debugger via the !pcr command.

(PCR is short for processor control region.) This command displays a subset of information from

the PCR and from the associated PRCB. !pcr takes a single numeric argument, which is the

number of the CPU whose PCR is to be displayed. The boot processor is processor 0. It is always

present, so !pcr 0 should always work. The following output shows the results of this command

from a local kernel debugging session for a 64-bit, eight-processor system:

```bash
!kbd !pcr
KPCR for Processor 0 at ffff80174b0000:
    Major 1 Minor 1
    Ntlib.ExceptionList: FFFFF80176b4a00
        Ntlib.StackBase: FFFFF80176b4b070
        Ntlib.StackLimit: 00000000101e3f8
        Ntlib.SubSystemLib: FFFFF80174b000001
        Ntlib.Version: 0000000074db0180
        Ntlib.UserPointer: FFFFF80174b000001
```

260   CHAPTER 4   Threads


---

```bash
NetTib.SelfTib: 00000098a70f2000
        SelfPc:    0000000000000000
        Prcb:      ffff8f0174bd0180
        Irql:       0000000000000000
        IRR:        0000000000000000
        IDR:        0000000000000000
        InterruptMode: 0000000000000000
        IDT:        0000000000000000
        GDT:       0000000000000000
        TSS:       0000000000000000
CurrentThread: Ffff8b82fa27c080
        NextThread: 0000000000000000
        IdleThread:    ffff8f0174c4c940
        DpcQueue:
```

This output shows that CPU 0 was executing a thread other than its idle thread at the time the

memory dump was obtained because the CurrentThread and IdleThread pointers are differ ent. (On a multi-CPU system you can try! 1.pcr 1, 1.pcr 2, and so on, until you run out. Observe

that each IdleThread pointer is different.)

Now use the !thread command on the indicated idle thread address:

```bash
!kbc !thread ffff80174c4c940
THREAD ffff80174c4c940 Cid 0000.0000  Tue: 00000000000000000000 Win32Thread:
00000000000000000000 RUNNING on processor 0
Not impersonating
DeviceMap        ffff800a52e17ce0
Owning Process      ffff8f0174c4b940     Image:        Idle
Attached Process      ffff8b882e7ec7640     Image:        System
Wait Start TickCount   1637993    Ticks: 30 (00:00:00:00.468)
Context Switch Count   25908837       IdealProcessor: 0
UserTime            00:00:00.000
KernelTime           05:51:23.796
Win32 Start Address nt!KidIdleLoop (0xffff801749e0770)
Stack Int ffff8ff80176b52c90 Current ffff80176b52c20
Base ffff80176b53000 Limit ffff80176b4d000 Call 0000000000000000
Priority 0 BasePriority 0 PriorityDecrement 0 IoPriority 0 PagePriority 5
```

Finally, use the !process command on the owning process shown in the preceding output.


For brevity, we'll add a second parameter value of 3, which causes !process to emit only minimal


information for each thread:

```bash
!kb: !process ffffff80174cb4940 3
PROCESS ffffff80174cb4940
    SessionId: none Cid: 0000     Peb: 00000000  ParentCid: 0000
    DirBase: 001aa000  ObjectTable: ffff800a52e14040  HandleCount: 2011.
    Image: Idle
    VadRoot ffff8b82e7e1ae70 Vads 1 Clone 0 Private 7. Modified 1627. Locked 0.
        DeviceMap 0000000000000000
```

---

```bash
Token                          ffff800a52e17040
        ElapsedTime                       07:07:04.015
        UserTime                         00:00:00.000
        KernelTime                       00:00:00.000
        QuotaPoolUsage[PagedPool]      0
        QuotaPoolUsage[NonPagedPool]    0
        Working Set Sizes (now,min,max)   (7, 50, 450) (28KB, 200KB, 1800KB)
        PeakWorkingSetSize                 1
        VirtualSize                     0 Mb
        PeakVirtualSize                   0 Mb
        PageFaultCount                   2
        MemoryPriority                 BACKGROUND
        BasePriority                   0
        CommitCharge                   0
                THREAD FFFFFf80174c4c940 Cid 0000.0000  Teb: 0000000000000000
                Win32Thread: 0000000000000000 RUNNING on processor 0
                THREAD FFFF9d81e230ccc0  Cid 0000.0000  Teb: 0000000000000000
                Win32Thread: 0000000000000000 RUNNING on processor 1
                THREAD FFFF9d81e1bd9cc0  Cid 0000.0000  Teb: 0000000000000000
                Win32Thread: 0000000000000000 RUNNING on processor 2
                THREAD FFFF9d81e2062cc0  Cid 0000.0000  Teb: 0000000000000000
                Win32Thread: 0000000000000000 RUNNING on processor 3
                THREAD FFFF9d81e21a7cc0  Cid 0000.0000  Teb: 0000000000000000
                Win32Thread: 0000000000000000 RUNNING on processor 4
                THREAD FFFF9d81e22ebcc0  Cid 0000.0000  Teb: 0000000000000000
                Win32Thread: 0000000000000000 RUNNING on processor 5
                THREAD FFFF9d81e2428cc0  Cid 0000.0000  Teb: 0000000000000000
                Win32Thread: 0000000000000000 RUNNING on processor 6
                THREAD FFFF9d81e256bc0  Cid 0000.0000  Teb: 0000000000000000
                Win32Thread: 0000000000000000 RUNNING on processor 7
    These process and thread addresses can also be used with dt: ntl_EPROCESS, dt ntl_
    KTHREAD, and other such commands.
```

The preceding experiment shows some of the anomalies associated with the idle process and its threads. The debugger indicates an Image name of Idle (which comes from the EPROCESS structure's ImageFileName member), but various Windows utilities report the idle process using different names. Task Manager and Process Explorer call it System Idle Process, while t11st calls it System Process. The process ID and thread IDs (the client IDs, or Cid in the debugger's output) are 0, as are the PEB and TEB pointers and potentially many other fields in the idle process or its threads. Because the idle process has no user-mode address space and its threads execute no user-mode code, they have no need of the various data required to manage a user-mode environment. Also, the idle process is not an objectmanager process object, and its idle threads are not object-manager thread objects. Instead, the initial idle thread and idle process structures are statically allocated and used to bootstrap the system before the process manager and the object manager are initialized. Subsequent idle thread structures are allocated dynamically (as simple allocations from a non-paged pool, bypassing the object manager) as additional processors are brought online. Once process management initializes, it uses the special variable PSEidleProcess to refer to the idle process.

262   CHAPTER 4  Threads


---

Perhaps the most interesting anomaly regarding the idle process is that Windows reports the priority of the idle threads as 0. In reality, however, the values of the idle threads' priority members are irrelevant because these threads are selected for dispatching only when there are no other threads to run. Their priority is never compared with that of any other thread. Nor is it used to put an idle thread on a ready queue, as idle threads are never part of any ready queues. (Only one thread per Windows system is actually running at priority 0—the page zero thread, explained in Chapter 5.)

Just as the idle threads are special cases in terms of selection for execution, they are also special cases for preemption. The idle thread's routine, K1D1eLoop, performs a number of operations that preclude its being preempted by another thread in the usual fashion. When no non-idle threads are available to run on a processor, that processor is marked as idle in its PRCB. After that, if a thread is stopped for execution on the idle processor, the thread's address is stored in the NextThread object of the idle processor's PRCB. The idle thread checks this point on each pass through its loop.

Although some details of the flow vary between architectures (this is one of the few variations written in assembly and not in C), the basic sequence of operations of the idle thread is as follows:

1. The idle thread enables interrupts allowing any pending interrupts to be delivered, and then disables them (using the STI and CLI instructions on x66 and x64 processors). This is desirable because significant parts of the idle thread execute with interrupt disabled.

2. On the debug build on some architectures, the idle thread tries whether there is a kernel debugger trying to break into the system. If so, it gives it access.

3. The idle thread checks whether any DPCs (described in Chapter 6) are pending if the DPCs are pending. The idle loop calls K1Ret1reDPCIst to deliver them. This will also perform timer expiration, as well as deferred ready processing; the latter is explained in the upcoming "Multiprocessor systems" section. K1Ret1ireDPCIst must be entered with interrupts disabled, which is why interrupts are left disabled at the end of step 1. K1RetireDPCIst exists with interrupts disabled as well.

4. The idle thread checks whether quantum end processing has been requested. If so, K1QuantumEnd is called to process the request.

5. The idle thread checks whether a thread has been selected to run next on the processor. If so, it dispatches that thread. This could be the case if, for example, a DPC or timer expiration processed in step 3 resolved the wait of a waiting thread, or if another processor selected a thread for this processor to run while it was already in the idle loop.

6. If requested, the idle thread checks for threads ready to run on other processors and, if possible, schedules one of them locally. (This operation is explained in the upcoming "Idle scheduler" section).

7. The idle thread calls the registered power-management processor idle routine (in case any power-management functions need to be performed), which is either in the processor power driver (such as intelppm.sys) or in the HAL if such a driver is unavailable.

CHAPTER 4 Threads 263


---

## Thread suspension

Threads can be suspended and resumed explicitly with the SuspendThread and ResumeThread API

functions, respectively. Every thread has a suspend count, which is incremented by suspension and

decremented by resuming. If the count is 0, the thread is free to execute. Otherwise, it will not execute.

Suspension works by queuing a kernel APC to the thread. When the thread is switched in to execute, the APC is executed first. This puts the thread in a wait state on event that is signaled when the thread is finally resumed.

This suspension mechanism has a noticeable drawback if the thread is in a wait state while a suspension request comes in, because it means that the thread needs to wake up just to be suspended. This can result in a kernel stack inswap (if the thread's kernel stack was swapped out). Windows 8.1 and Server 2012 R2 added a mechanism called Lightweight Suspend to allow for the suspension of a thread that is in a wait state not by using the APC mechanism, but by directly manipulating the thread's object in memory and marking it as suspended.

## (Deep) freeze

Freezing is a mechanism by which processes enter a suspended state that cannot be changed by calling

ResumeThread on threads in the process. This is useful when the system needs to suspend a UWP app.

This happens when a Windows app goes to the background—for example, because another app comes

to the foreground in Tablet mode or the app is minimized in Desktop mode. In this case, the system

gives to the app roughly five seconds to do work, typically to save application state. Saving state is im portant because Windows apps may be killed without any notice if memory resources become low. If

the app is killed, the state can be reloaded on the next launch and the user would have the perception

that the app never really went away. Freezing a process means suspending all threads in such a way that

ResumeThread is not able to wake. A flag in the KTHREAD structure indicates whether a thread is frozen.

For a thread to be able to execute, its suspend count must be 0 and the Frozen flag must be clear.

Deep freeze adds another constraint: Newly created threads in the process cannot start as well. For example, if a call to CreateRemoteThreadEx is used to create a new thread in a deep-frozen process, the thread will be frozen before actually starting. This is the typical usage of the freezing capability.

Process- and thread-freezing functionality is not exposed directly to user mode. It is used internally

by the Process State Manager (PSM) service that is responsible for issuing the requests to the kernel for

deep freezing and thawing (unfreezing).

You can also freeze processes using jobs. The ability to freeze and unfreeze a job is not publicly

documented, but it's possible to do using the standard NtSetInformationJobObject system call. This

is typically used for Windows apps, as all Windows apps processes are contained in jobs. Such a job

may contain a single process (the Windows app itself), but it can also contain background task-hosting

processes related to the same Windows app so that freezing or thawing (unfreezing) all processes under

that job can be done in a single stroke. (See Chapter 8 in Part 2 for more on Windows apps.)

---

## EXPERIMENT: Deep freeze

In this experiment, you'll watch deep freeze happening by debugging a virtual machine.

1. Open WinDbg with admin privileges and attach to a virtual machine running Windows 10.

2. Press Ctrl+Break to break into the VM.

3. Set a breakpoint when deep freeze begins with a command to show the process that is

frozen:

```bash
bp nt!PsFreezeProcess "!process -1 0; g"
```

4. Enter the g (go) command or press F5. You should see many deep freeze occurrences.

5. Start the Cortana UI from the taskbar and then close the UI. After about 5 seconds you

should see something like the following:

```bash
PROCESS #8158500  SessionId: 2  Cid: 12c8   Pcb: 03945000  ParentCid: 02ac
    DirBase: 054007e0  ObjectTable: b0a8a040  HandleCount: 988.
    Image: SearchUI.exe
```

6. Now break into the debugger and show more info on that process:

```bash
1: kd> !process 8f518500 1
PROCESS 8f518500 SessionId: 2 Cid: 12c8   Peb: 03945000  ParentCid: 02ac
DeepFreeze
    DirBase: 054007e0  ObjectTable: b0a8a040  HandleCount: 988.
        Image: SearchUI.exe
        VadRoot 95cliff08 Vads 405 Clone 0 Private 7682 Modified 201241. Locked 0.
        DeviceMap a12509c0
        Token               b0a65bd0
        ElapsedTime            04:02:33.518
        UserTime                00:00:06.937
        KernelTime              00:00:00.703
        QuotaPoolUsage[PagedPool]      562688
        QuotaPoolUsage[NonPagedPool]     34392
        Working Set Sizes (now,min,max)  (20470, 50, 345) (81880KB, 200KB, 1380KB)
        PeakWorkingSetSize       25878
        VirtualSize              367 Mb
        PeakVirtualSize           400 Mb
        PageFaultCount             307764
        MemoryPriority             BACKGROUND
        BasePriority              8
        CommitCharge             8908
        Job                       8f575030
```

7. Notice the DeepFreeze attribute written by the debugger. Also notice that the process is part of a job. Use the !job command to see more details:

```bash
! kb: !job 8f575030
job at 8f575030
    Basic Accounting Information
        TotalUserTime:       0x0
```

CHAPTER 4   Threads      265


---

```bash
TotalKernelTime:        0x0
  TotalCycleTime:       0x0
  ThisPeriodTotalUserTime:  0x0
  ThisPeriodTotalkernelTime:  0x0
  TotalPageFaultCount:      0x0
  TotalProcesses:       0x1
  ActiveProcesses:       0x1
  FreezeCount:           1
  BackgroundCount:       0
  TotalTerminatedProcesses:  0x0
  PeakJobMemoryUsed:       0x38e2
  PeakProcessMemoryUsed:     0x38e2
Job Flags
  [cpu rate control]
  [frozen]
  [wake notification allocated]
  [wake notification enabled]
  [timers virtualized]
  [job swapped]
Limit Information (LimitFlags: 0x0)
Limit Information (EffectiveLimitFlags: 0x3000)
CPU Rate Control
  Rate = 100.00%
  Scheduling Group: a469f330
```

8. The job is under CPU rate control (see the section "CPU rate limits" later in this chapter for more on CPU rate control) and is frozen. Detach from the VM and close the debugger.

