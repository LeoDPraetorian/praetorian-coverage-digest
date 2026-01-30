## I/O completion ports

Writing a high-performance server application requires implementing an efficient threading model. Having either too few or too many server threads to process client requests can lead to performance problems. For example, if a server creates a single thread to handle all requests, clients can become starved because the server will be tied up processing one request at a time. A single thread could simultaneously process multiple requests, switching from one to another as I/O operations are started. However, this architecture introduces significant complexity and can't take advantage of systems with more than one logical processor. At the other extreme, a server could create a big pool of threads so that virtually every client request is processed by a dedicated thread. This scenario usually leads to thread-thrashing, in which lots of threads wake up, perform some CPU processing, block while waiting for I/O, and then, after request processing is completed, block again waiting for a new request. If nothing else, having too many threads results in excessive context switching, caused by the scheduler having to divide processor time among multiple active threads; such a scheme will not scale.

The goal of a server is to incur as few context switches as possible by having its threads avoid unnecessary blocking, while at the same time maximizing parallelism by using multiple threads. The idea is for there to be a thread actively servicing a client request on every processor and for those threads

CHAPTER 6 I/O system 541


---

not to block when they complete a request if additional requests are waiting. For this optimal process to work correctly, however, the application must have a way to activate another thread when a thread processing a client request blocks I/O (such as when it reads from a file as part of the processing).

## The IoCompletion object.

Applications use the IoCompletion executive object, which is exported to the Windows API as a completion port, as the focal point for the completion of I/O associated with multiple file handles. Once a file is associated with a completion port, any asynchronous I/O operations that complete on the file result in a completion packet being queued to the completion port. A thread can wait for any outstanding I/Os to complete on multiple files simply by waiting for a completion packet to be queued to the completion port. The Windows API provides similar functionality with the WaitForMultipleObjects API function, but completion ports have one important advantage: concurrency. Concurrency refers to the number of threads that an application has actively servicing client requests, which is controlled with the aid of the system.

When an application creates a completion port, it specifies a concurrency value. This value indicates the maximum number of threads associated with the port that should be running at any given time. As stated earlier, the ideal is to have one thread active at any given time for every processor in the system. Windows uses the concurrency value associated with a port to control how many threads an application has active. If the number of active threads associated with a port equals the concurrency value, a thread that is waiting on the completion port won't be allowed to run. Instead, an active thread will finish processing its current request, after which it will check whether another packet is waiting at the port. If one is, the thread simply grabs the packet and goes off to process it. When this happens, there is no context switch, and the CPUs are utilized nearly to their full capacity.

## Using completion ports

Figure 6-24 shows a high-level illustration of completion-port operation. A completion port is created with a call to the CreateIoCompletionPort Windows API function. Threads that block on a completion port become associated with the port and are awakened in last in, first out (LIFO) order so that the thread that blocked most recently is the one that is given the next packet. Threads that block for long periods of time can have their stacks swapped out to disk, so if there are more threads associated with a port than there is work to process, the in-memory footprints of threads blocked the longest are minimized.

A server application will usually receive client requests via network endpoints that are identified by file handles. Examples include Windows Sockets 2 (Winsock2) sockets or named pipes. As the server creates its communications endpoints, it associates them with a completion port and its threads wait for incoming requests by calling GetQueuedCompletionStatus(Ex) on the port. When a thread is given a packet from the completion port, it will go off and start processing the request, becoming an active thread. A thread will block many times during its processing, such as when it needs to read or write data to a file on disk or when it synchronizes with other threads. Windows detects this activity and recognizes that the completion port has one less active thread. Therefore, when a thread becomes inactive because it blocks, a thread waiting on the completion port will be awakened if there is a packet in the queue.

542    CHAPTER 6  I/O system

---

![Figure](figures/Winternals7thPt1_page_560_figure_000.png)

FIGURE 6-24 I/O completion-port operation.

Microsoft's guidelines are to set the concurrency value roughly equal to the number of processors

in a system. Keep in mind that it's possible for the number of active threads for a completion port to

exceed the concurrency limit. Consider a case in which the limit is specified as 1:

- 1. A client request comes in and a thread is dispatched to process the request, becoming active.

2. A second request arrives, but a second thread waiting on the port isn't allowed to proceed

because the concurrency limit has been reached.

3. The first thread blocks, waiting for a file I/O, so it becomes inactive.

4. The second thread is released.

5. While the second thread is still active, the first thread's file I/O is completed, making it active

again. At that point—and until one of the threads blocks—the concurrency value is 2, which

is higher than the limit of 1. Most of the time, the count of active threads will remain at or just

above the concurrency limit.
The completion port API also makes it possible for a server application to queue privately defined

completion packets to a completion port by using the PostQueuedCompletionStatus function. A

server typically uses this function to inform its threads of external events, such as the need to shut

down gracefully.

Applications can use thread-agnostic I/O, described earlier, with I/O completion ports to avoid associating threads with their own I/Os and associating them with a completion port object instead. In addition to the other scalability benefits of I/O completion ports, their use can minimize context switches. Standard I/O completions must be executed by the thread that initiated the I/O, but when an I/O associated with an I/O completion port completes, the I/O manager uses any waiting thread to perform the completion operation.

---

## I/O completion port operation

Windows applications create completion ports by calling the CreateIoCompletionPort Windows API

and specifying a NULL completion port handle. This results in the execution of the NtCreateIoComple tion system service. The executive’s IoCompletion object contains a kernel synchronization object

called a kernel queue. Thus, the system service creates a completion port object and initializes a queue

object in the port’s allocated memory. (A pointer to the port also points to the queue object because

the queue is the first member of the completion port.) A kernel queue object has a concurrency value

that is specified when a thread initializes it, and in this case the value that is used is the one that was

passed to CreateIoCompletionPort. KeInitializeQueue is the function that NtCreateIoCompletion

calls to initialize a port’s queue object.

When an application calls CreateIoCompletionPort to associate a file handle with a port, the NtSetInformationFile system service is executed with the file handle as the primary parameter. The information class that is set is FileCompletionInformation, and the completion port's handle and the CompletionKey parameter from CreateIoCompletionPort are the data values. NtSetInformationFile dereferences the file handle to obtain the file object and allocates a completion context data structure.

Finally, NtSetInformationFile sets the CompletionContext field in the file object to point at the

context structure. When an asynchronous I/O operation completes on a file object, the I/O manager

checks whether the CompletionContext field in the file object is non-NULL. If it is, the I/O manager

allocates a completion packet and queues it to the completion port by calling KeInsertQueue with the

port as the queue on which to insert the packet (this works because the completion port object and

queue object have the same address).

When a server thread invokes GetQueuedCompletionStatus, the NtRemoveIoCompletion system service is executed. After validating parameters and translating the completion port handle to a pointer to the port, NtRemoveIoCompletion calls IoRemoveIoCompletion, which eventually calls KeRemoveQueueEx. For high-performance scenarios, it's possible that multiple I/Os may have been completed, and although the thread will not block, it will still call into the kernel each time to get one item. The GetQueuedCompletionStatus or GetQueuedCompletionStatusEx API allows applications to retrieve more than one I/O completion status at the same time, reducing the number of user-to-kernel roundtrips and maintaining peak efficiency. Internally, this is implemented through the NtRemoveIoCompletionEx function. This calls IoRemoveIoCompletion with a count of queued items, which is passed on to KeRemoveQueueEx.

As you can see, KeRemoveQueueEx and KeInsertQueue are the engine behind completion ports. They are the functions that determine whether a thread waiting for an I/O completion packet should be activated. Internally, a queue object maintains a count of the current number of active threads and the maximum number of active threads. If the current number equals or exceeds the maximum when a thread calls KeRemoveQueueEx, the thread will be put (in LIFO order) onto a list of threads waiting for a turn to process a completion packet. The list of threads hangs off the queue object. A thread's control block data structure (KTHREAD) has a pointer in it that references the queue object of a queue that it's associated with; if the pointer is NULL, the thread isn't associated with a queue.

544 CHAPTER 6 I/O system


---

Windows keeps track of threads that become inactive because they block on something other than the completion port by relying on the queue pointer in a thread's control block. The scheduler routines that possibly result in a thread blocking (such as KeWaitForSingleObject, KeDelayExecutionThread, and so on) check the thread's queue pointer. If the pointer isn't NULL, the functions call KiActivateWaiterQueue, a queue-related function that decrements the count of active threads associated with the queue. If the resulting number is less than the maximum and at least one completion packet is in the queue, the thread at the front of the queue's thread list is awakened and given the oldest packet. Conversely, whenever a thread that is associated with a queue wakes up after blocking, the scheduler executes the KiUnwaitThread function, which increments the queue's active count.

The PostQueuedCompletionStatus Windows API function results in the execution of the NtSetIoCompletion system service. This function simply inserts the specified packet onto the completion port's queue by using KeInsertQueue.

Figure 6-25 shows an example of a completion port object in operation. Even though two threads

are ready to process completion packets, the concurrency value of 1 allows only one thread associated

with the completion port to be active, and so the two threads are blocked on the completion port.

![Figure](figures/Winternals7thPt1_page_562_figure_003.png)

FIGURE 6-25 I/O completion port object in operation.

You can fine-tune the exact notification model of the I/O completion port through the SetFile CompletionNotificationModes API, which allows application developers to take advantage of additional, specific improvements that usually require code changes but can offer even more throughput. Three notification-mode optimizations are supported, which are listed in Table 6-4. Note that these modes are per file handle and cannot be changed after being set.

TABLE 6-4 I/O completion port notification modes

<table><tr><td>Notification Mode</td><td>Meaning</td></tr><tr><td>Skip completion port on success (FILE_SKIP_COMPLETION_PORT_ON_SUCCESS=1)</td><td>If the following three conditions are true, the I/O manager does not queue a completion entry to the port when it would ordinarily do so. First, a completion port must be associated with the file handle. Second, the file must be opened for asynchronous I/O. Third, the request must return success immediately without returning ERROR_PENDING.</td></tr></table>


Continues...

---

TABLE 6-4 I/O completion port notification modes (continued)

<table><tr><td>Notification Mode</td><td>Meaning</td></tr><tr><td>Skip set event on handle (FILE_SKIP_SET_EVENT_ON_HANDLE=2)</td><td>The I/O manager does not set the event for the file object if a request returns with a success code or the error returned is ERROR_PENDING and the function that is called is not a synchronous function. If an explicit event is provided for the request, it is still signaled.</td></tr><tr><td>Skip set user event on fast I/O (FILE_SKIP_SET_USER_EVENT_ON_FAST_IO=4)</td><td>The I/O manager does not set the explicit event provided for the request if a request takes the fast I/O path and returns with a success code or the error returned is ERROR_PENDING and the function that is called is not a synchronous function.</td></tr></table>


## I/O prioritization

Without I/O priority, background activities like search indexing, virus scanning, and disk defragmenting can severely impact the responsiveness of foreground operations. For example, a user who launches an application or opens a document while another process is performing disk I/O will experience delays as the foreground task waits for disk access. The same interference also affects the streaming playback of multimedia content like music from a disk.

Windows includes two types of I/O prioritization to help foreground I/O operations get preference:

priority on individual I/O operations and I/O bandwidth reservations.

## I/O priorities

The Windows I/O manager internally includes support for five I/O priorities, as shown in Table 6-5, but only three of the priorities are used. (Future versions of Windows may support High and Low.)

TABLE 6-5   I/O priorities

<table><tr><td>I/O Priority</td><td>Usage</td></tr><tr><td>Critical</td><td>Memory manager</td></tr><tr><td>High</td><td>Not used</td></tr><tr><td>Normal</td><td>Normal application I/O</td></tr><tr><td>Low</td><td>Not used</td></tr><tr><td>Very Low</td><td>Scheduled tasks, SuperFetch, defragmenting, content indexing, background activities</td></tr></table>


I/O has a default priority of Normal, and the memory manager uses Critical when it wants to write dirty memory data out to disk under low-memory situations to make room in RAM for other data and code. The Windows Task Scheduler sets the I/O priority for tasks that have the default task priority to Very Low. The priority specified by applications that perform background processing is Very Low. All the Windows background operations, including Windows Defender scanning and desktop search indexing, use Very Low I/O priority.

---

## Prioritization strategies

Internally, the five I/O priorities are divided into two I/O prioritization modes, called strategies. These are the hierarchy exception and the idle prioritization strategies. Hierarchy prioritization deals with all the I/O priorities except Very Low. It implements the following strategy:

- ■ All critical-priority I/O must be processed before any high-priority I/O.
■ All high-priority I/O must be processed before any normal-priority I/O.
■ All normal-priority I/O must be processed before any low-priority I/O.
■ All low-priority I/O is processed after any higher-priority I/O.
As each application generates I/Os, IRPs are put on different I/O queues based on their priority, and the hierarchy strategy decides the ordering of the operations.

The idle prioritization strategy, on the other hand, uses a separate queue for non-idle priority I/O.


Because the system processes all hierarchy prioritized I/O before idle I/O, it’s possible for the I/Os in this

queue to be starved, as long as there’s even a single non-idle I/O on the system in the hierarchy priority

strategy queue.

To avoid this situation, as well as to control back-off (the sending rate of I/O transfers), the idle strategy uses a timer to monitor the queue and guarantee that at least one I/O is processed per unit of time (typically, half a second). Data written using non-idle I/O priority also causes the cache manager to write modifications to disk immediately instead of doing it later and to bypass its read-ahead logic for read operations that would otherwise preemptively read from the file being accessed. The prioritization strategy also waits for 50 milliseconds after the completion of the last non-idle I/O in order to issue the next idle I/O. Otherwise, idle I/O would occur in the middle of non-idle streams, causing costly seeks.

Combining these strategies into a virtual global I/O queue for demonstration purposes, a snapshot

of this queue might look similar to Figure 6-26. Note that within each queue, the ordering is first-in,

first-out (FIFO). The order in the figure is shown only as an example.

![Figure](figures/Winternals7thPt1_page_564_figure_007.png)

FIGURE 6-26 Sample entries in a global I/O queue.

User-mode applications can set I/O priority on three different objects. The functions SetPriorityClass (with the PROCESS_MODE_BACKGROUND_BEGIN value) and SetThreadPriority (with the THREAD_ MODE_BACKGROUND_BEGIN value), set the priority for all the I/Os that are generated by either the entire process or specific threads (the priority is stored in the IRP of each request). These functions work only on the current process or thread and lower the I/O priority to Very Low. In addition, these also lower the scheduling priority to 4 and the memory priority to 1. The function SetFileInformationByHandle can set the priority for a specific file object (the priority is stored in the file object). Drivers can also set I/O priority directly on an IRP by using the IoSetIoPriorityItnt API.

---

![Figure](figures/Winternals7thPt1_page_565_figure_000.png)

Note The I/O priority field in the IRP and/or file object is a hint. There is no guarantee that the I/O priority will be respected or even supported by the different drivers that are part of the storage stack.

The two prioritization strategies are implemented by two different types of drivers. The hierarchy strategy is implemented by the storage port drivers, which are responsible for all I/Os on a specific port, such as ATA, SCSI, or USB. Only the ATA port driver (Atapor.sys) and USB port driver (Ubsbtor.sys) implement this strategy, while the SCSI and storage port drivers (Scsiport.sys and Storport.sys) do not.

![Figure](figures/Winternals7thPt1_page_565_figure_003.png)

Note All port drivers check specifically for Critical priority I/Os and move them ahead of

their queues, even if they do not support the full hierarchy mechanism. This mechanism is in

place to support critical memory manager paging I/Os to ensure system reliability.

This means that consumer mass storage devices such as IDE or SATA hard drives and USB flash disks will take advantage of I/O prioritization, while devices based on SCSI, Fiber Channel, and iSCSI will not.

On the other hand, it is the system storage class device driver (Classppv.sys) that enforces the idle

strategy, so it automatically applies to I/Os directed at all storage devices, including SCSI drives. This

separation ensures that idle I/Os will be subject to back-off algorithms to ensure a reliable system

during operation under high idle I/O usage and so that applications that use them can make forward

progress. Placing support for this strategy in the Microsoft-provided class driver avoids performance

problems that would have been caused by lack of support for it in legacy third-party port drivers.

Figure 6-27 displays a simplified view of the storage stack that shows where each strategy is implemented. See Chapter 12 in Part 2 for more information on the storage stack.

![Figure](figures/Winternals7thPt1_page_565_figure_008.png)

FIGURE 6-27 Implementation of I/O prioritization across the storage stack.

548 CHAPTER 6 |/O system


---

## I/O priority inversion avoidance

To avoid I/O priority inversion, in which a high I/O priority thread is starved by a low I/O priority thread, the executive resource (ERESOURCE) locking functionality uses several strategies. The ERESOURCE was picked for the implementation of I/O priority inheritance specifically because of its heavy use in file system and storage drivers, where most I/O priority inversion issues can appear. (See Chapter 8 in Part 2 for more on executive resources.)

If an ERESOURCE is being acquired by a thread with low I/O priority, and there are currently waiters

on the ERESOURCE with normal or higher priority, the current thread is temporarily boosted to normal

I/O priority by using the PsBoostThreadTo API, which increments the T oBoostCount in the ETHEAD

structure. It also notifies Autoboot if the thread I/O priority was boosted or the boost was removed.

(Refer to Chapter 4 for more on Autobot.)

It then calls the IoBoostThreadIoPriority API, which enumerates all the IRPs queued to the target thread (recall that each thread has a list of pending IRPs) and checks which ones have a lower priority than the target priority (normal in this case), thus identifying pending idle I/O priority IRPs. In turn, the device object responsible for each of those IRPs is identified, and the I/O manager checks whether a priority callback has been registered, which driver developers can do through the IoRegisterPriori tyCallBack API and by setting the DO_PRIORITY_CALLBACK_ENABLED flag on their device object.

Depending on whether the IRP was a paging I/O, this mechanism is called threaded boost or paging

boost. Finally, if no matching IRPs were found, but the thread has at least some pending IRPs, all are boosted regardless of device object or priority, which is called blanket boosting.

## I/O priority boosts and bumps

Windows uses a few other subtle modifications to normal I/O paths to avoid starvation, inversion, or otherwise unwanted scenarios when I/O priority is being used. T ypically, these modifications are done by boosting I/O priority when needed. The following scenarios exhibit this behavior:

- When a driver is being called with an IRP targeted to a particular file object, Windows makes
sure that if the request comes from kernel mode, the IRP uses normal priority even if the file
object has a lower I/O priority hint. This is called a kernel bump.
When reads or writes to the paging file are occurring (through IoPageRead and IoPageWrite),
Windows checks whether the request comes from kernel mode and is not being performed on
behalf of Superfetch (which always uses idle I/O). In this case, the IRP uses normal priority even if
the current thread has a lower I/O priority. This is called a paging bump.
The following experiment will show you an example of Very Low I/O priority and how you can use Process Monitor to look at I/O priorities on different requests.

EXPERIMENT: Very low versus normal I/O throughput

You can use the I/O Priority sample application (included in this book's utilities) to look at the throughput difference between two threads with different I/O priorities. Follow these steps:

CHAPTER 6 I/O system     549


---

1. Launch IoPriority.exe.

2. In the dialog box, under Thread 1, check the Low Priority check box.

3. Click the Start I/O button. You should notice a significant difference in speed between the two threads, as shown in the following screenshot:

![Figure](figures/Winternals7thPt1_page_567_figure_003.png)

![Figure](figures/Winternals7thPt1_page_567_figure_004.png)

Note If both threads run at low priority and the system is relatively idle, their throughput will be roughly equal to the throughput of a single normal I/O priority in the example. This is because low-priority I/Os are not artificially throttled or otherwise hindered if there isn't any competition from higher-priority I/O.

4. Open the process in Process Explorer and look at the low I/O priority thread to see the priorities:

![Figure](figures/Winternals7thPt1_page_567_figure_007.png)

5. You can also use Process Monitor to trace IO Priority's I/Os and look at their I/O priority hint. To do so, launch Process Monitor, configure a filter for I/Opriority.exe, and repeat the experiment. In this application, each thread reads from a file named _File_ concatenated with the thread ID.

---

6. Scroll down until you see a write to File_1. You should see output similar to the following:

![Figure](figures/Winternals7thPt1_page_568_figure_001.png)

7. Notice that I/Os directed at _File_7920 in the screenshot have a priority of very low.


Looking at the Time of Day and Relative Time columns, you'll also notice that the I/Os

are spaced half a second from each other, which is another sign of the idle strategy in

action.

## EXPERIMENT: Performance analysis of I/O priority boosting/bumping

The kernel exposes several internal variables that can be queried through the undocumented

SystemLowPriorityIoInformation system class available in NtQuerySystemInformation.

However, even without writing or relying on such an application, you can use the local kernel

debugger to view these numbers on your system. The following variables are available:

- ■ IoLowPriorityReadOperationCount and IoLowPriorityWriteOperationCount

■ IoKernelIssuedToBoostedCount

■ IoPagingReadLowPriorityCount and IoPagingWriteLowPriorityCount

■ IoPagingReadLowPriorityBumpedCount and IoPagingWriteLowPriorityBumpedCount

■ IoBoostedThreadedIrpCount and IoBoostedPagingIrpCount

■ IoBlanketBoostCount
You can use the dd memory-dumping command in the kernel debugger to see the values of

these variables (all are 32-bit values).

## Bandwidth reservation (scheduled file I/O)

Windows I/O bandwidth-reservation support is useful for applications that desire consistent I/O

throughput. For example, using the SetFileBandwidthReservation call, a media player application

can ask the I/O system to guarantee it the ability to read data from a device at a specified rate. If the

device can deliver data at the requested rate and existing reservations allow it, the I/O system gives the

application guidance as to how fast it should issue I/Os and how large the I/O should be.

CHAPTER 6   I/O system   551


---

The I/O system won't service other I/Os unless it can satisfy the requirements of applications that

have made reservations on the target storage device. Figure 6-28 shows a conceptual timeline of I/Os

issued on the same file. The shaded regions are the only ones that will be available to other applications.

If I/O bandwidth is already taken, new I/Os will have to wait until the next cycle.

<table><tr><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>Groove Music</td><td></td><td>Groove Music</td><td>Groove Music</td><td></td><td>Groove Music</td></tr><tr><td>Reserved I/O</td><td>Walk-in I/O</td><td>Reserved I/O</td><td>Reserved I/O</td><td>Walk-in I/O</td><td>Reserved I/O</td></tr></table>


FIGURE 6-28 Effect of I/O requests during bandwidth reservation.

Like the hierarchy prioritization strategy, bandwidth reservation is implemented at the port driver level, which means it is available only for IDE, SATA, or USB-based mass-storage devices.

## Container notifications

Container notifications are specific classes of events that drivers can register for through an asynchronous callback mechanism by using the IoRegisterContainerNotification API and selecting the notification class that interests them. Thus far, one such class is implemented in Windows: IoSession StateNotification. This class allows drivers to have their registered callback invoked whenever a change in the state of a given session is registered. The following changes are supported:

- ■ A session is created or terminated.

■ A user connects to or disconnects from a session.

■ A user logs on to or logs off from a session.
By specifying a device object that belongs to a specific session, the driver callback will be active only

for that session. In contrast, by specifying a global device object (or no device object at all), the driver will

receive notifications for all events on a system. This feature is particularly useful for devices that participate

in the Plug and Play device redirection functionality that is provided through Terminal Services, which allows

a remote device to be visible on the connecting host's Plug and Play manager bus as well (such as audio or

printer device redirection). Once the user disconnects from a session with audio playback, for example, the

device driver needs a notification in order to stop redirecting the source audio stream.

## Driver Verifier

Driver Verifier is a mechanism that can be used to help find and isolate common bugs in device drivers or other kernel-mode system code. Microsoft uses Driver Verifier to check its own device drivers as well as all device drivers that vendors submit for WHQL testing. Doing so ensures that the drivers submitted are compatible with Windows and free from common driver errors. (Although not described in this book, there is also a corresponding Application Verifier tool that has resulted in quality improvements for user-mode code in Windows.)

552 CHAPTER 6 I/O system

---

![Figure](figures/Winternals7thPt1_page_570_figure_000.png)

Note Although Driver Verifier serves primarily as a tool to help device driver developers discover bugs in their code, it is also a powerful tool for system administrators experiencing crashes. Chapter 15 in Part 2 describes its role in crash analysis troubleshooting.

Driver Verifier consists of support in several system components: the memory manager, I/O manager, and HAL all have driver verification options that can be enabled. These options are configured using the Driver Verifier Manager (%SystemRoot%/System32\Verifier.exe). When you run Driver Verifier with no command-line arguments, it presents a wizard-style interface, as shown in Figure 6-29. (You can also enable and disable Driver Verifier, as well as display current settings, by using its commandline interface. From a command prompt, type verifier /? to see the switches.)

![Figure](figures/Winternals7thPt1_page_570_figure_003.png)

FIGURE 6-29 Driver Verifier Manager.

Driver Verifier Manager distinguishes between two sets of settings: standard and additional. This

is somewhat arbitrary, but the standard settings represent the more common options that should be

probably selected for every driver being tested, while the additional settings represent those settings

that are less common or specific to some types of drivers. Selecting Create Custom Settings from the

main wizard's page shows all options with a column indicating which is standard and which is addi tional, as shown in Figure 6-30.

Regardless of which options are selected, Driver Verifier always monitors drivers selected for verification, looking for a number of illegal and boundary operations, including calling kernel-memory pool functions at invalid IRQL, double-freeing memory, releasing spinlocks inappropriately, not freeing timers, referencing a freed object, delaying shutdown for longer than 20 minutes, and requesting a zero-size memory allocation.

CHAPTER 6   I/O system    553


---

![Figure](figures/Winternals7thPt1_page_571_figure_000.png)

FIGURE 6-30 Driver Verifier settings.

Driver Verifier settings are stored in the registry under the HKLM\SYSTEM\CurrentControlSet\ Control\SessionManager\Memory Management key. The VerifyDriverLevel value contains a bitmask that represents the verification options that are enabled. The VerifyDrivers value contains the names of the drivers to monitor. (These values won't exist in the registry until you select drivers to verify in the Driver Verifier Manager.) If you choose to verify all drivers (which you should never do, since this will cause considerable system slowdown), VerifyDrivers is set to an asterisk (*) character. Depending on the settings you have made, you might need to reboot the system for the selected verification to occur.

Early in the boot process, the memory manager reads the Driver Verifier registry values to determine which drivers to verify and which Driver Verifier options you enabled. (Note that if you boot in safe mode, any Driver Verifier settings are ignored.) Subsequently, if you've selected at least one driver for verification, the kernel checks the name of every device driver it loads into memory against the list of drivers you've selected for verification. For every device driver that appears in both places, the kernel invokes the VFLoadDriver function, which calls other internal VF* functions to replace the driver's references to a number of kernel functions with references to Driver Verifier-equivalent versions of those functions. For example, ExA1ToaclePool is replaced with a call to VeriFilerA1locatePool. The windowing system driver (Win32k.sys) also makes similar changes to use Driver Verifier-equivalent functions.

## I/O-related verification options

The various I/O-related verification options are as follows:

- ■ I/O Verification When this option is selected, the I/O manager allocates IRPs for verified
drivers from a special pool and their usage is tracked. In addition, the Driver Verifier crashes
the system when an IRP is completed that contains an invalid status or when an invalid device
554    CHAPTER 6  I/O system

---

object is passed to the I/O manager. This option also monitors all IRPs to ensure that drivers mark them correctly when completing them asynchronously, that they manage device-stack locations correctly, and that they delete device objects only once. In addition, the Verifier randomly stresses drivers by sending them fake power management and WMI IRPs, changing the order in which devices are enumerated, and adjusting the status of PnP and power IRPs when they complete to test for drivers that return incorrect status from their dispatch routines. Finally, the Verifier also detects incorrect re-initialization of remove locks while they are still being held due to pending device removal.

• DMA Checking DMA is a hardware-supported mechanism that allows devices to transfer data to or from physical memory without involving the CPU. The I/O manager provides several functions that drivers use to initiate and control DMA operations, and this option enables checks for the correct use of the functions and buffers that the I/O manager supplies for DMA operations.

■ Force Pending I/O Requests: For many devices, asynchronous I/Os complete immediately, so drivers may not be coded to properly handle the occasional asynchronous I/O. When this option is enabled, the I/O manager randomly returns STATUS_PENDING in response to a driver's calls to IoCa1 Driver, which simulates the asynchronous completion of an I/O.

■ IRP Logging This option monitors a driver's use of IRPs and makes a record of IRP usage, which is stored as WMI information. You can then use the Dc2wmiparser.exe utility in the WDK to convert these WMI records to a text file. Note that only 20 IRPs for each device will be recorded—each subsequent IRP will overwrite the least recently added entry. After a reboot, this information is discarded, so Dc2wmiparser.exe should be run if the contents of the trace are to be analyzed later.

## Memory-related verification options

The following are memory-related verification options supported by Driver Verifier. (Some are also related to I/O operations.)

### Special Pool

Selecting the Special Pool option causes the pool allocation routines to bracket pool allocations with an invalid page so that references before or after the allocation will result in a kernel-mode access violation, thus crashing the system with the finger pointed at the buggy driver. Special pool also causes some additional validation checks to be performed when a driver allocates or frees memory. With special pool enabled, the pool allocation routines allocate a region of kernel memory for Driver Verifier to use. Driver Verifier redirects memory allocation requests that drivers under verification make to the special pool area rather than to the standard kernel-mode memory pools. When a device driver allocates memory from special pool, Driver Verifier rounds up the allocation to an even-page bound-ary. Because Driver Verifier brackets the allocated page with invalid pages, if a device driver attempts to read or write past the end of the buffer, the driver will access an invalid page, and the memory manager will raise a kernel-mode access violation.

CHAPTER 6   I/O system     555


---

Figure 6-31 shows an example of the special pool buffer that Driver Verifier allocates to a device driver when Driver Verifier checks for overrun errors.

![Figure](figures/Winternals7thPt1_page_573_figure_001.png)

FIGURE 6-31 Layout of special pool allocations.

By default, Driver Verifier performs underrun detection. It does this by placing the buffer that the

device driver uses at the end of the allocated page and filling the beginning of the page with a random

pattern. Although the Driver Verifier Manager doesn't let you specify underrun detection, you can set

this type of detection manually by adding the DWORD registry value PooTTagOverruns to the HKLM\

SYSTEM\CurrentControlSet\ControlSessionManager\MemoryManagement key and setting it to 0 (or

by running the Gflags.exe utility and selecting the Verify Start option in the Kernel Special Pool Tag

section instead of the default option, Verify End). When Windows enforces underrun detection, Driver

Verifier allocates the driver's buffer at the beginning of the page rather than at the end.

The overrun-detection configuration includes some measure of underrun detection as well. When

the driver frees its buffer to return the memory to Driver Verifier, Driver Verifier ensures that the pat tern preceding the buffer hasn't changed. If the pattern is modified, the device driver has underrun the

buffer and written to memory outside the buffer.

Special pool allocations also check to ensure that the processor IRQL at the time of an allocation and dealloc is legal. This check catches an error that some device drivers make: allocating pageable memory from an IRQL at DPC/dispatch level or above.

You can also configure special pool manually by adding the DWORD registry value PooITag in the HLM\SYSTEM\CurrentControlSet\Control\SessionManager\Memory Management key, which represents the allocation tags the system uses for special pool. Thus, even if Driver Verifier isn’t configured to verify a particular device driver, if the tag the driver associates with the memory it allocates matches what is specified in the PooITag registry value, the pool allocation routines will allocate the memory from special pool. If you set the value of PooTag to 0x2a or to the wildcard (*), all memory that drivers allocate will be from special pool, provided there’s enough virtual and physical memory (drivers will revert to allocating from regular pool if there aren’t enough free pages).

## Pool tracking

If pool tracking is enabled, the memory manager checks at driver unload time whether the driver freed all the memory allocations it made. If it didn’t, it crashes the system, indicating the buggy driver. Driver Verifier also shows general pool statistics on the Driver Verifier Manager’s Pool Tracking tab (accessible from the main wizard UI by selecting Display Information About the Currently Verifiedd Drivers

556 CHAPTER 6 I/O system


---

and selecting Next twice). You can also use the !viewer kernel debugger command. This command shows more information than Driver Verifier and is useful to driver writers.

Pool tracking and special pool cover not only explicit allocation calls, such as ExA1locatePoolWith Tag, but also calls to other kernel APIs that implicitly allocate memory from pools: IoAllocateMdl,

IoAllocateIrp, and other IRP allocation calls; various Rtl string APIs; and JoSetCompletionRoutineEx.

Another driver verified function enabled by the Pool Tracking option pertains to pool quota charges. The call to ExAlllocatePoolWithQuotaTag charges the current process's pool quota for the number of bytes allocated. If such a call is made from a DPC routine, the process that is charged is unpredictable because DPC routines may execute in the context of any process. The Pool Tracking option checks for calls to this routine from the DPC routine context.

Driver Verifier can also perform locked memory page tracking, which additionally checks for pages

that have been left locked after an I/O operation completes and generates a DRIVER_LEFT_LOCKED_

PAGES_IN_PROCESS crash code instead of PROCESS_HAS_LOCKED_PAGES—the former indicates the

driver responsible for the error as well as the function responsible for the locking of the pages.

## Force IRQL Checking

One of the most common device driver bugs occurs when a driver accesses pageable data or code when the processor on which the device driver is executing is at an elevated IRQL. The memory manager can't service a page fault when the IRQL is DPC/dispatch level or above. The system often doesn't detect instances of a device driver accessing pageable data when the processor is executing at a high IRQL level because the pageable data being accessed happens to be physically resident at the time. At other times, however, the data might be paged out, which results in a system crash with the stop code IRQL_NOT_LESS_OR_EQUAL (that is, the IRQL wasn't less than or equal to the level required for the operation attempted—in this case, accessing pageable memory).

Although testing device drivers for this kind of bug is usually difficult, Driver Verifier makes it easy.

If you select the Force IRQL Checking option, Driver Verifier forces all kernel-mode pageable code and

data out of the system working set whenever a device driver under verification raises the IRQL. The in ternal function that does this is MTr-inAllSystemPagableMemory. With this setting enabled, whenever

a device driver under verification accesses pageable memory when the IRQL is elevated, the system

instantly detects the violation, and the resulting system crash identifies the faulty driver.

Another common driver crash that results from incorrect IRQL usage occurs when synchronization

objects are part of data structures that are paged and then waited on. Synchronization objects should

never be paged because the dispatcher needs to access them at an elevated IRQL, which would cause a

crash. Driver Verifier checks whether any of the following structures are present in pageable memory:

KTIMER, KMUTEX, KSFIN_LOCK, KEVENT, KSENAMEHORE, ERESOURCE, and FAST_MUTEX.

## Low Resources Simulation

Enabling Low Resources Simulation causes Driver Verifier to randomly fail memory allocations that

verified device drivers perform. In the past, developers wrote many device drivers under the assump tion that kernel memory would always be available, and that if memory ran out, the device driver

CHAPTER 6   I/O system   557


---

didn't have to worry about it because the system would crash anyway. However, because low-memory conditions can occur temporarily, and today's mobile devices are not as powerful as larger machines, it's important that device drivers properly handle allocation failures that indicate kernel memory is exhausted.

The driver calls that will be injected with random failures include the functions ExAllocatePool*,

MmProbeAndLockPages, MmMapLockedPagesSpecifyCache,MmMapIoSpace, MmAllocateContiguous Memory, MmAllocatePagesForMd1,IoAllocateIrp, IoAllocateMd1, IoAllocateWorkItem, IoAllo cateErrorLogEntry, IOSetCompletionRoutineEx, and various Rtl string APIs that allocate from the

pool. Driver Verifier also fails some allocations made by kernel GDI functions (see the WDK documenta tion for a complete list). Additionally, you can specify the following:

- ■ The probability that allocation will fail This is 6 percent by default.
■ Which applications should be subject to the simulation All are by default.
■ Which pool tags should be affected All are by default.
■ What delay should be used before fault injection starts The default is 7 minutes after the
system boots, which is enough time to get past the critical initialization period in which a low-
memory condition might prevent a device driver from loading.
You can change these customizations with command line options to verifier.exe.

After the delay period, Driver Verifier starts randomly fading allocation calls for device drivers it is verifying. If a driver doesn't correctly handle allocation failures, this will likely show up as a system crash.

## Systematic Low Resources Simulation

Similar to the Low Resources Simulation option, this option fails certain calls to the kernel and Ndis.Sys (for network drivers), but does so in a systematic way, by examining the call stack at the point of failure injection. If the driver handles the failure correctly, that call stack will not be failure injected again. This allows the driver writer to see issues in a systematic way, fix a reported issue, and then move on to the next. Examining call stacks is a relatively expensive operation, therefore verifying more than a single driver at a time with this setting is not recommended.

## Miscellaneous checks

Some of the checks that Driver Verifier calls miscellaneous allow it to detect the freeing of certain system

structures in the pool that are still active. For example, Driver Verifier will check for:

- ■ Active work items in freed memory A driver calls ExFreePool 1 to free a pool block in which

one or more work items queued with IOQueueWorkItem are present.

■ Active resources in freed memory A driver calls ExFreePool before calling ExDelete-

Resource to destroy an ERESOURCE object.

■ Active look-aside lists in freed memory A driver calls ExFreePool before calling ExDelete-

NPagedLookasideList or ExDeletePagedLookasideList to delete the look-aside list.
---

Finally, when verification is enabled, Driver Verifier performs certain automatic checks that cannot be individually enabled or disabled. These include the following:

- ● Calling MmProbeAndLockPages or MmProbeAndLockProcessPages on an MDL having incorrect
flags. For example, it is incorrect to call MmProbeAndLockPages for an MDL that was set up by
calling MmBuildMdlForNonPagedPool.

● Calling MmMapLockedPages on an MDL having incorrect flags. For example, it is incorrect to call
MmMapLockedPages for an MDL that is already mapped to a system address. Another example
of incorrect driver behavior is calling MmMapLockedPages for an MDL that was not locked.

● Calling MmUnlockPages or MmUnmapLockedPages on a partial MDL (created by using IoBuild-

PartiaMDl).

● Calling MmUnmapLockedPages on an MDL that is not mapped to a system address.

● Allocating synchronization objects such as events or mutexes from NonPagedPoolSession memory.
Driver Verifier is a valuable addition to the arsenal of verification and debugging tools available to device driver writers. Many device drivers that first ran with Driver Verifier had bugs that Driver Verifier was able to expose. Thus, Driver Verifier has resulted in an overall improvement in the quality of all kernel-mode code running in Windows.

## The Plug and Play manager

The PnP manager is the primary component involved in supporting the ability of Windows to recognize and adapt to changing hardware configurations. A user doesn't need to understand the intricacies of hardware or manual configuration to install and remove devices. For example, it's the PnP manager that enables a running Windows laptop that is placed on a docking station to automatically detect additional devices located in the docking station and make them available to the user.

Plug and Play support requires cooperation at the hardware, device driver, and operating system levels. Industry standards for the enumeration and identification of devices attached to buses are the foundation of Windows Plug and Play support. For example, the USB standard defines the way that devices on a USB bus identify themselves. With this foundation in place, Windows Plug and Play support provides the following capabilities:

- ■ The PnP manager automatically recognizes installed devices, a process that includes enumerat-
ing devices attached to the system during a boot and detecting the addition and removal of
devices as the system executes.
■ Hardware resource allocation is a role the PnP manager fills by gathering the hardware resource
requirements (interrupts, I/O memory, I/O registers, or bus-specific resources) of the devices at-
tached to a system and, in a process called resource arbitration, optimally assigning resources so
that each device meets the requirements necessary for its operation. Because hardware devices
can be added to the system after boot-time resource assignment, the PnP manager must also
be able to reassign resources to accommodate the needs of dynamically added devices.

CHAPTER 6   I/O system    559

From the Library of Mich
---

- ■ Loading appropriate drivers is another responsibility of the PnP manager. The PnP manager de-
termines, based on the identification of a device, whether a driver capable of managing the device
is installed on the system, and if one is, it instructs the I/O manager to load it. If a suitable driver
isn't installed, the kernel-mode PnP manager communicates with the user-mode PnP manager to
install the device, possibly requesting the user's assistance in locating a suitable driver.
■ The PnP manager also implements application and driver mechanisms for the detection of
hardware configuration changes. Applications or drivers sometimes require a specific hardware
device to function, so Windows includes a means for them to request notification of the presence,
addition, or removal of devices.
■ It provides a place for storing device state, and it participates in system setup, upgrade, migra-
tion, and offline image management.
■ It supports network connected devices, such as network projectors and printers, by allowing
specialized bus drivers to detect the network as a bus and create device nodes for the devices
running on it.
## Level of Plug and Play support

Windows aims to provide full support for Plug and Play, but the level of support possible depends on the attached devices and installed drivers. If a single device or driver doesn't support Plug and Play, the extent of Plug and Play support for the system can be compromised. In addition, a driver that doesn't support Plug and Play might prevent other devices from being usable by the system. Table 6-6 shows the outcome of various combinations of devices and drivers that can and can't support Plug and Play.

TABLE 6-6 Device and driver plug-and-play capability

<table><tr><td>Type of Device</td><td>Plug-and-Play Driver</td><td>Non-Plug and Play Driver</td></tr><tr><td>Plug and play</td><td>Full plug and play</td><td>No plug and play</td></tr><tr><td>Non-plug and play</td><td>Possible partial plug and play</td><td>No plug and play</td></tr></table>


A device that isn't Plug and Play-compatible is one that doesn't support automatic detection, such as a legacy ISA sound card. Because the operating system doesn't know where the hardware physically lies, certain operations—such as laptop undocking, sleep, and hibernation—are disallowed. However, if a Plug and Play driver is manually installed for the device, the driver can at least implement PnP manager-directed resource assignment for the device.

Drivers that aren't Plug and Play-compatible include legacy drivers, such as those that ran on Windows NT 4. Although these drivers might continue to function on later versions of Windows, the PnP manager can't reconfigure the resources assigned to such devices in the event that resource reallocation is necessary to accommodate the needs of a dynamically added device. For example, a device might be able to use I/O memory ranges A and B, and during the boot, the PnP manager assigns it range A. If a device that can use only A is attached to the system later, the PnP manager can't direct the first device's driver to reconfigure itself to use range B. This prevents the second device from obtaining required resources, which results in the device being unavailable for use by the system. Legacy drivers


CHAPTER 6 I/O system


From the Library of I

---

also impair a machine's ability to sleep or hibernate. (See the section "The power manager" later in this chapter for more details.)

## Device enumeration

Device enumeration occurs when the system boots, resumes from hibernation, or is explicitly instructed to do so (for example, by clicking Scan for Hardware Changes in the Device Manager UI). The PnP manager builds a device tree (described momentarily) and compares it to its known stored tree from a previous enumeration, if any. For a boot or resume from hibernation, the stored device tree is empty. Newly discovered devices and removed devices require special treatment, such as loading appropriate drivers (for a newly discovered device) and notifying drivers of a removed device.

The PnP manager begins device enumeration with a virtual bus driver called Root, which represents the entire computer system and acts as the bus driver for non-Plug and Play drivers and the HAL. The HAL acts as a bus driver that enumerates devices directly attached to the motherboard as well as system components such as batteries. Instead of actually enumerating, however, the HAL relies on the hardware description the Setup process recorded in the registry to detect the primary bus (in most cases, a PCI bus) and devices such as batteries and fans.

The primary bus driver enumerates the devices on its bus, possibly finding other buses, for which the PnP manager initializes drivers. Those drivers in turn can detect other devices, including other subsidiary buses. This recursive process of enumeration, driver loading (if the driver isn't already loaded), and further enumeration proceeds until all the devices on the system have been detected and configured.

As the bus drivers report detected devices to the PnP manager, the PnP manager creates an internal

tree called a device tree that represents the relationships between devices. Nodes in the tree are called

device nodes, or devnodes. A devnode contains information about the device objects that represent the

device as well as other Plug and Play-related information stored in the devnode by the PnP manager.

Figure 6-32 shows an example of a simplified device tree. A PCI bus serves as the system's primary bus,

which USB, ISA, and SCSI buses are connected to.

![Figure](figures/Winternals7thPt1_page_578_figure_006.png)

FIGURE 6-32 An example of a device tree.

CHAPTER 6   I/O system     561


---

The Device Manager utility, which is accessible from the Computer Management snap-in in the Programs/Administrative Tools folder of the Start menu (and also from the Device Manager link of the System utility in Control Panel), shows a simple list of devices present on a system in its default configuration. You can also select the Devices by Connection option from the Device Manager's View menu to see the devices as they relate to the device tree. Figure 6-33 shows an example of the Device Manager's Devices by connection view.

![Figure](figures/Winternals7thPt1_page_579_figure_001.png)

FIGURE 6-33 Device Manager, with the device tree shown.

## EXPERIMENT: Dumping the device tree

A more detailed way to view the device tree than using Device Manager is to use the !devnode kernel debugger command. Specifying 0 1 as command options dumps the internal device tree devnode structures, indenting entries to show their hierarchical relationships, as shown here:

```bash
1kb: !devnode 0 1
Dumping !opRootDeviceNode (= 0x85161a98)
DevNode 0x85161a98 for PDO 0x84d10390
    InstancePath is "HTEELEROOT\"
    State = DeviceNodeStarted (0x308)
    Previous State = DeviceNodeEnumerateCompletion (0x30d)
    DevNode 0x8515bea8 for PDO 0x8515b030
    DevNode 0x8515c608 for PDO 0x8515c820
    InstancePath is "Root ACPI_HAL\0000"
    State = DeviceNodeStarted (0x308)
```

562 CHAPTER 6 I/O system


---

Previous State = {DeviceNodeEnumerateCompletion (0x30d) DevNode 0x4dd56b0 for PDO 0x84dc738 InstancePath is "ACPI\_HAL\PNPCDC08\0" ServiceName is "ACPI" State = {DeviceNodeStarted (0x308) Previous State = {DeviceNodeEnumerateCompletion (0x30d) DevNode 0x85ebf1b0 for PDO 0x85ec0210 InstancePath is "ACPI\GenuineIntel_~x86_Family_6_Model_15\0" ServiceName is "intlppm" State = {DeviceNodeStarted (0x308) Previous State = {DeviceNodeEnumerateCompletion (0x30d) DevNode 0x85ed6970 for PDO 0x8515e618 InstancePath is "ACPI\GenuineIntel_~x86_Family_6_Model_15\1" ServiceName is "intlppm" State = {DeviceNodeStarted (0x308) Previous State = {DeviceNodeEnumerateCompletion (0x30d) DevNode 0x85ed75c8 for PDO 0x85ed79e8 InstancePath is "ACPI\ThermalZone\_ThM" State = {DeviceNodeStarted (0x308) Previous State = {DeviceNodeEnumerateCompletion (0x30d) DevNode 0x85ed6c80 for PDO 0x85ed858 InstancePath is "ACPI\pnp0c14\0" ServiceName is "WmiCapp" State = {DeviceNodeStarted (0x308) Previous State = {DeviceNodeEnumerateCompletion (0x30d) DevNode 0x85ed7008 for PDO 0x85ed7630 InstancePath is "ACPI\ACPI0003\28dada3ff82" ServiceName is "CmBatt" State = {DeviceNodeStarted (0x308) Previous State = {DeviceNodeEnumerateCompletion (0x30d) DevNode 0x85ed7e60 for PDO 0x84d2e030 InstancePath is "ACPI\PNPCOCA1" State = {DeviceNodeStarted (0x308)

... Information shown for each devnode is the InstancePath, which is the name of the device's enumeration registry key stored under HKLM\SYSTEM\CurrentControlSet\Enum, and the Servicelane, which corresponds to the device's driver registry key under HKLM\SYSTEM\ CurrentControlSet\Services. To see the resources assigned to each devnode, such as interrupts, ports, and memory, specify 0 3 as the command options for the I devnode command.

Device stacks

As devnodes are created by the PnP manager, driver objects and device objects are created to manage and logically represent the linkage between the devices that make up the devnode. This linkage is called a device stock (briefly discussed in the "IRP flow" section earlier in this chapter). You can be of the device stack as an ordered list of device object/driver pairs. Each device stack is built from the bot- to the top. Figure 6-34 shows an example of a devnode (a reprint of Figure 6-6), with seven device objects (all managing the same physical device). Each devnode contains at least two devices (PDO and FDO), but can contain more device objects. A device stack consists of the following:

CHAPTER 6 |/O system 563


---

![Figure](figures/Winternals7thPt1_page_581_figure_000.png)

FIGURE 6-34 Devnode (device stack).

- ■ A physical device object (PDO) that the PnP manager instructs a bus driver to create when the
bus driver reports the presence of a device on its bus during enumeration. The PDO represents
the physical interface to the device and is always at the bottom of the device stack.
■ One or more optional filter device objects (FIDOs) that layer between the PDO and the func-
tional device object (FDO; described in the next bullet), called lower filters (the term "lower" is
always considered in relation to the FDO). These may be used for intercepting IRPs coming out
of the FDO and towards the bus driver (which may be of interest to bus filters).
■ One (and only one) functional device object (FDO) that is created by the driver, which is called
a function driver, that the PnP manager loads to manage a detected device. An FDO represents
the logical interface to a device, having the most "intimate" knowledge of the functionality
provided by the device. A function driver can also act as a bus driver if devices are attached to
the device represented by the FDO. The function driver often creates an interface (essentially a
name) to the FDO's corresponding PDO so that applications and other drivers can open the de-
vice and interact with it. Sometimes function drivers are divided into a separate class/port driver
and miniport driver that work together to manage I/O for the FDO.
■ One or more optional FIDOs that layer above the FDO, called upper filters. These get first crack
at an IRP header for the FDO.
![Figure](figures/Winternals7thPt1_page_581_figure_003.png)

Note The various device objects have different names in Figure 6-34 to make them easier to describe. However, they are all instances of DEVICE_OBJECT structures.

Device stacks are built from the bottom up and rely on the I/O manager's layering functionality, so

IRPs flow from the top of a device stack toward the bottom. However, any level in the device stack can

choose to complete an IRP, as described in the "IRP flow" section earlier in this chapter.

564    CHAPTER 6  I/O system

---

