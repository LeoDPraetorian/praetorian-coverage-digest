## Synchronization

The concept of mutual exclusion is a crucial one in operating systems development. It refers to the guar antee that one, and only one, thread can access a particular resource at a time. Mutual exclusion is neces sary when a resource doesn't lend itself to shared access or when sharing would result in an unpredictable

outcome. For example, if two threads copy a file to a printer port at the same time, their output could

be interspersed. Similarly, if one thread reads a memory location while another one writes to it, the first

thread will receive unpredictable data. In general, writable resources can't be shared without restrictions,

---

whereas resources that aren't subject to modification can be shared. Figure 8-37 illustrates what happens when two threads running on different processors both write data to a circular queue.

![Figure](figures/Winternals7thPt2_page_202_figure_001.png)

FIGURE 8-37 Incorrect sharing of memory.

Because the second thread obtained the value of the queue tail pointer before the first thread finished updating it, the second thread inserted its data into the same location that the first thread used, overwriting data and leaving one queue location empty. Even though Figure 8-37 illustrates what could happen on a multiprocessor system, the same error could occur on a single-processor system if the operating system performed a context switch to the second thread before the first thread updated the queue tail pointer.

Sections of code that access a nonshareable resource are called critical sections. To ensure correct

code, only one thread at a time can execute in a critical section. While one thread is writing to a file, up dating a database, or modifying a shared variable, no other thread can be allowed to access the same

resource. The pseudocode shown in Figure 8-37 is a critical section that incorrectly accesses a shared

data structure without mutual exclusion.

The issue of mutual exclusion, although important for all operating systems, is especially important (and intricate) for a tightly coupled, symmetric multiprocessing (SMP) operating system such as Windows, in which the same system code runs simultaneously on more than one processor, sharing certain data structures stored in global memory. In Windows, it is the kernel's job to provide mechanisms that system code can use to prevent two threads from modifying the same data at the same time. The kernel provides mutual-exclusion primitives that it and the rest of the executive use to synchronize their access to global data structures.

Because the scheduler synchronizes access to its data structures at DPC/dispatch level IRQL, the kernel and executive cannot rely on synchronization mechanisms that would result in a page fault or reschedule operation to synchronize access to data structures when the IRQL is DPC/dispatch level or higher (levels known as an elevated or high IRQL). In the following sections, you'll find out how the kernel and executive use mutual exclusion to protect their global data structures when the IRQL is high and what mutual-exclusion and synchronization mechanisms the kernel and executive use when the IRQL is low (below DPC/dispatch level).

CHAPTER 8    System mechanisms      171


---

## High-IRQL synchronization

At various stages during its execution, the kernel must guarantee that one, and only one, processor at a time is executing within a critical section. Kernel critical sections are the code segments that modify a global data structure such as the kernel's dispatcher database or its DPC queue. The operating system can't function correctly unless the kernel can guarantee that threads access these data structures in a mutually exclusive manner.

The biggest area of concern is interrupts. For example, the kernel might be updating a global data

structure when an interrupt occurs whose interrupt-handling routine also modifies the structure.

Simple single-processor operating systems sometimes prevent such a scenario by disabling all inter rupts each time they access global data, but the Windows kernel has a more sophisticated solution.

Before using a global resource, the kernel temporarily masks the interrupts whose interrupt handlers

also use the resource. It does so by raising the processor's IRQL to the highest level used by any po tential interrupt source that accesses the global data. For example, an interrupt at DPC/dispatch level

causes the dispatcher, which uses the dispatcher database, to run. Therefore, any other part of the

kernel that uses the dispatcher database raises the IRQL to DPC/dispatch level, masking DPC/dispatch level interrupts before using the dispatcher database.

This strategy is fine for a single-processor system, but it's inadequate for a multiprocessor configuration. Raising the IRQL on one processor doesn't prevent an interrupt from occurring on another processor. The kernel also needs to guarantee mutually exclusive access across several processors.

### Interlocked operations

The simplest form of synchronization mechanism relies on hardware support for multiprocessorsafe manipulation of integer values and for performing comparisons. They include functions such as InterlockedIncrement, InterlockedDecrement, InterlockedExchange, and InterlockedCompareExchange. The InterlockedDecrement function, for example, uses the x68 and x64 lock instruction prefix (for example, lock xadd) to lock the multiprocessor bus during the addition operation so that another processor that's also modifying the memory location being decremented won't be able to modify it between the decrementing processor's read of the original value and its write of the decremented value. This form of basic synchronization is used by the kernel and drivers. In today's Microsoft compiler suite, these functions are called intrinsic because the code for them is generated in an inline assembler, directly during the compilation phase, instead of going through a function call (it's likely that pushing the parameters onto the stack, calling the function, copying the parameters into registers, and then popping the parameters off the stack and returning to the caller would be a more expensive operation than the actual work the function is supposed to do in the first place.)

### Spinlocks

The mechanism the kernel uses to achieve multiprocessor mutual exclusion is called a spinlock. A

spinlock is a locking primitive associated with a global data structure, such as the DPC queue shown

in Figure 8-38.

---

FIGURE 8-38 Using a spinlock.

Before entering either critical section shown in Figure 8-38, the kernel must acquire the spinlock associated with the protected DPC queue. If the spinlock isn't free, the kernel keeps trying to acquire the lock until it succeeds. The spinlock gets the name from the fact that the kernel (and thus, the processor) waits, "spinning, " until it gets the lock.

Spinlocks, like the data structures they protect, reside in nonpaged memory mapped into the system address space. The code to acquire and release a spinlock is written in assembly language for speed and to exploit whatever locking mechanism the underlying processor architecture provides. On many architectures, spinlocks are implemented with a hardware–supported test-and-set operation, such the lock structure mentioned earlier can also be used on the test and-set instruction. Testing and acquiring the value of a lock unit prevents a second thread from grabbing the lock between the time the first thread tests the variable and acquires the lock. Additionally, a hardware instruction such the lock instruction mentioned earlier can also be used on the test and-set operation, resulting in the combined lock bts opcode on x64 processors, which also locks the multiprocessor bus; otherwise, it would be possible for more than one processor to perform the operation atomically. (Without the lock, the operation is guaranteed to be atomic only on the current processor.) Similarly, on ARM processors, instructions such as /dex and strex can be used in a similar fashion.

All kernel-mode spinlocks in Windows have an associated IRQL that is always DPC/dispatch level or higher. Thus, when a thread is trying to acquire a spinlock, all other activity at the IRQL and level ceases on that processor. Because thread dispatching happens at DPC/dispatch level, a thread that holds a spinlock is never preempted because the IRQL masks the dispatching mechanisms. This masking allows code executing in a critical section protected by a spinlock to continue executing so that it will release the lock quickly. The kernel uses spinlocks with great care, minimizing the number of instructions it executes while it holds a spinlock. Any processor that attempts to acquire the spinlock will essentially be busy, waiting indefinitely, consuming power (a busy wait results in 100% CPU usage) and performing no actual work.

CHAPTER 8 System mechanisms 173


---

On x86 and x64 processors, a special pause assembly instruction can be inserted in busy wait loops, and on ARM processors, yield provides a similar benefit. This instruction offers a hint to the processor that the loop instructions it is processing are part of a spinlock (or a similar construct) acquisition loop. The instruction provides three benefits:

- ■ It significantly reduces power usage by delaying the core ever so slightly instead of continuously
looping.
■ On SMT cores, it allows the CPU to realize that the "work" being done by the spinning logical
core is not terribly important and awards more CPU time to the second logical core instead.
■ Because a busy wait loop results in a storm of read requests coming to the bus from the waiting
thread (which might be generated out of order), the CPU attempts to correct for violations of
memory order as soon as it detects a write (that is, when the owning thread releases the lock).
Thus, as soon as the spinlock is released, the CPU reorders any pending memory read opera-
tions to ensure proper ordering. This reordering results in a large penalty in system perfor-
mance and can be avoided with the pause instruction.
If the kernel detects that it is running under a Hyper-V compatible hypervisor, which supports the spinlock enlightenment (described in Chapter 9), the spinlock facility can use the

HviNotifyLongSpinWait library function when it detects that the spinlock is currently owned by another CPU, instead of contiguously spinning and use the pause instruction. The function emits a HvCallNotifyLongSpinWait hypercall to indicate to the hypervisor scheduler that another VP should take over instead of emulating the spin.

The kernel makes spinlocks available to other parts of the executive through a set of kernel functions, including KeAcquireSpinLock and KeReleaseSpinLock. Device drivers, for example, require spinlocks to guarantee that device registers and other global data structures are accessed by only one part of a device driver (and from only one processor) at a time. Spinlocks are not for use by user programs— user programs should use the objects described in the next section. Device drivers also need to protect access to their own data structures from interrupts associated with themselves. Because the spinlock APIs typically raise the IRQL only to DPC/dispatch level, this isn't enough to protect against interrupts. For this reason, the kernel also exports the KeAcquireInterruptSpinLock and KeReleaseInterruptSpinLock APIs that take as a parameter the KINTERRUPT object discussed at the beginning of this chapter. The system looks inside the interrupt object for the associated DIRQL with the interrupt and raises the IRQL to the appropriate level to ensure correct access to structures shared with the ISR.

Devices can also use the KeSynchronizationExecution API to synchronize an entire function with an ISR

instead of just a critical section. In all cases, the code protected by an interrupt spinlock must execute

extremely quickly--any delay causes higher-than-normal interrupt latency and will have significant

negative performance effects.

Kernel spinlocks carry with them restrictions for code that uses them. Because spinlocks always have

an IRQ of DPC/dispatch level or higher, as explained earlier, code holding a spinlock will crash the

system if it attempts to make the scheduler perform a dispatch operation or if it causes a page fault.

---

## Queued spinlocks

To increase the scalability of spinlocks, a special type of spinlock, called a queued spinlock, is used in

many circumstances instead of a standard spinlock, especially when contention is expected, and fair ness is required.

A queued spinlock works like this: When a processor wants to acquire a queued spinlock that is currently held, it places its identifier in a queue associated with the spinlock. When the processor that's holding the spinlock releases it, it hands the lock over to the next processor identified in the queue. In the meantime, a processor waiting for a busy spinlock checks the status not of the spinlock itself but of a per-processor flag that the processor ahead of it in the queue sets to indicate that the waiting processor's turn has arrived.

The fact that queued spinlocks result in spinning on per-processor flags rather than global spinlocks has two effects. The first is that the multiprocessor's bus isn't as heavily trafficked by interprocessor synchronization, and the memory location of the bit is not in a single NUMA node that then has to be snooped through the caches of each logical processor. The second is that instead of a random processor in a waiting group acquiring a spinlock, the queued spinlock enforces first-in, first-out (FIFO) ordering to the lock. FIFO ordering means more consistent performance (fairness) across processors accessing the same locks. While the reduction in bus traffic and increase in fairness are great benefits, queued spinlocks do require additional overhead, including extra interlocked operations, which do add their own costs. Developers must carefully balance the management overhead with the benefits to decide if a queued spinlock is worth it for them.

Windows uses two different types of queued spinlocks. The first are internal to the kernel only, while the second are available to external and third-party drivers as well. First, Windows defines a number of global queued spinlocks by storing pointers to them in an array contained in each processor's processor control region (PCR). For example, on x64 systems, these are stored in the LockArray field of the KPCR data structure.

A global spinlock can be acquired by calling KeAcquireQueuedSpinLock with the index into the array

at which the pointer to the spinlock is stored. The number of global spinlocks originally grew in each

release of the operating system, but over time, more efficient locking hierarchies were used that do not

require global per-processor locking. You can view the table of index definitions for these locks in the

WDK header file Wdm.h under the KSPIN_LOCK_QUEUE_NUMBER enumeration, but note, however,

that acquiring one of these queued spinlocks from a device driver is an unsupported and heavily

frowned-upon operation. As we said, these locks are reserved for the kernel's internal use.

---

## EXPERIMENT: Viewing global queued spinlocks

You can view the state of the global queuesinocks (the ones pointed to by the queued spinlock array in each processor's CPU) by using the !qlocks kernel debugger command. In the following example, note that none of the locks are acquired on any of the processors, which is a standard situation on a local system doing live debugging.

```bash
!kds!qlocks
Key: O = Owner, 1-m = Wait order, blank = not owned/waiting, C = corrupt
                          Processor Number
                          Lock Name        0  1  2  3  4  5  6  7
KE    - Unused Spare
MM   - Unused Spare
MM   - Unused Spare
MM   - Unused Spare
CC   - Vacb
CC   - Master
EX   - NonPagedPool
IO   - Cancel
CC   - Unused Spare
```

### In-stack queued spinlocks

Device drivers can use dynamically allocated queues spinlocks with the KeAcquireInStackQueued SpinLock and KeReleaseInStackQueuedSpinlock functions. Several components—including the cache manager, executive pool manager, and NTFS—take advantage of these types of locks instead of using global queued spinlocks.

KeAcquireInStockQueuedSpinLock takes a pointer to a spinlock data structure and a spinlock queue

handle. The spinlock queue handle is actually a data structure in which the kernel stores information

about the lock's status, including the lock's ownership and the queue of processors that might be

waiting for the lock to become available. For this reason, the handle shouldn't be a global variable. It is

usually a stack variable, guaranteeing locality to the caller thread and is responsible for the InStack part

of the spinlock and API name.

### Reader/writer spin locks

While using queued spinlocks greatly improves latency in highly contended situations, Windows supports another kind of spinlock that can offer even greater benefits by potentially eliminating contention in many situations to begin with. The multi-reader, single-writer spinlock, also called the executive spinlock, is an enhancement on top of regular spinlocks, which is exposed through the ExAcquireSpinLockExclusive, ExAcquireSpinLockShared API, and their ExReleaseXxx counterparts. Additionally, ExTryAcquireSpinLockSharedAtDpcLevel and ExTryConvertSharedSpinLockToExclusive functions exist for more advanced use cases.

---

As the name suggests, this type of lock allows nonconmented shared acquisition of a spinlock if no writer is present. When a writer is interested in the lock, readers must eventually release the lock, and no further readers will be allowed while the writer is active (nor additional writers). If a driver developer often finds themself iterating over a linked list, for example, while only rarely inserting or removing items, this type of lock can remove contention in the majority of cases, removing the need for the complexity of a queued spinlock.

## Executive interlocked operations

The kernel supplies some simple synchronization functions constructed on spinlocks for more advanced operations, such as adding and removing entries from singly and doubly linked lists. Examples include ExinterlockedPopEntryList and ExinterlockedPushEntryList for singly linked lists, and ExinterlockedInsertHeadList and ExinterlockedRemoveHeadList for doubly linked lists. A few other functions, such as ExinterlockedAddUlong and ExinterlockedAddLargeInteger also exist. All these functions require a standard spinlock as a parameter and are used throughout the kernel and device drivers' code.

Instead of relying on the standard APIs to acquire and release the spinlock parameter, these functions place the code required inline and also use a different ordering scheme. Whereas the Ke spinlock APIs first test and set the bit to see whether the lock is released and then atomically perform a locked test-and-set operation to make the acquisition, these routines disable interrupts on the processor and immediately attempt an atomic test-and-set. If the initial attempt fails, interrupts are enabled again, and the standard busy waiting algorithm continues until the test-and-set operation returns 0—in which case the whole function is restarted again. Because of these subtle differences, a spinlock used for the executive interlocked functions must not be used with the standard kernel APIs discussed previously. Naturally, noninterlocked list operations must not be mixed with interlocked operations.

![Figure](figures/Winternals7thPt2_page_208_figure_004.png)

Note Certain executive interlocked operations silently ignore the spinlock when possible.

For example, the ExInterlockedIncrementLong or ExInterlockedCompareExchange APIs use

the same lock prefix used by the standard interlocked functions and the intrinsic functions.

These functions were useful on older systems (or non-x86 systems) where the lock operation

was not suitable or available. For this reason, these calls are now deprecated and are silently

inlined in favor of the intrinsic functions.

## Low-IRQL synchronization

Executive software outside the kernel also needs to synchronize access to global data structures in a multiprocessor environment. For example, the memory manager has only one page frame database, which it accesses as a global data structure, and device drivers need to ensure that they can gain exclusive access to their devices. By calling kernel functions, the executive can create a spinlock, acquire it, and release it.

---

Spinlocks only partially fill the executive's needs for synchronization mechanisms, however. Because

waiting for a spinlock literally stalls a processor, spinlocks can be used only under the following strictly

limited circumstances:

- The protected resource must be accessed quickly and without complicated interactions with
other code.
The critical section code can't be paged out of memory, can't make references to pageable
data, can't call external procedures (including system services), and can't generate interrupts or
exceptions.
These restrictions are confining and can't be met under all circumstances. Furthermore, the executive needs to perform other types of synchronization in addition to mutual exclusion, and it must also provide synchronization mechanisms to user mode.

There are several additional synchronization mechanisms for use when spinlocks are not suitable:

- ■ Kernel dispatcher objects (mutexes, semaphores, events, and timers)

■ Fast mutexes and guarded mutexes

■ Pushlocks

■ Executive resources

■ Run-once initialization (InitOnce)
Additionally, user-mode code, which also executes at low IRQL must be able to have its own locking primitives. Windows supports various user-mode-specific primitives:

- ■ System calls that refer to kernel dispatcher objects (mutants, semaphores, events, and timers)

■ Condition variables (CondVars)

■ Slim Reader-Writer Locks (SRW Locks)

■ Address-based waiting

■ Run-once initialization (InitOnce)

■ Critical sections
We look at the user-mode primitives and their underlying kernel-mode support later; for now, we focus on kernel-mode objects. Table 8-26 compares and contrasts the capabilities of these mechanisms and their interaction with kernel-mode APC delivery.

---

TABLE 8-26 Kernel synchronization mechanisms

<table><tr><td></td><td>Exposed for Use by Device Drivers</td><td>Disables Normal Kernel-Mode APCs</td><td>Disables Special Kernel-Mode APCs</td><td>Supports Recursive Acquisition</td><td>Supports Shared and Exclusive Acquisition</td></tr><tr><td>Kernel dispatcher mutexes</td><td>Yes</td><td>Yes</td><td>No</td><td>Yes</td><td>No</td></tr><tr><td>Kernel dispatcher semapheres, events, timers</td><td>Yes</td><td>No</td><td>No</td><td>No</td><td>No</td></tr><tr><td>Fast mutexes</td><td>Yes</td><td>Yes</td><td>Yes</td><td>No</td><td>No</td></tr><tr><td>Guarded mutexes</td><td>Yes</td><td>Yes</td><td>Yes</td><td>No</td><td>No</td></tr><tr><td>Pushlocks</td><td>Yes</td><td>No</td><td>No</td><td>No</td><td>Yes</td></tr><tr><td>Executive resources</td><td>Yes</td><td>No</td><td>No</td><td>Yes</td><td>Yes</td></tr><tr><td>Rundown protections</td><td>Yes</td><td>No</td><td>No</td><td>Yes</td><td>No</td></tr></table>


## Kernel dispatcher objects

The kernel furnishes additional synchronization mechanisms to the executive in the form of kernel objects, known collectively as dispatcher objects. The Windows API-visible synchronization objects acquire their synchronization capabilities from these kernel dispatcher objects. Each Windows API-visible object that supports synchronization encapsulates at least one kernel dispatcher object. The executive’s synchronization semantics are visible to Windows programmers through the WaitForSingleObject and WaitForMultipleObjects functions, which the Windows subsystem implements by calling analogous system services that the Object Manager supplies. A thread in a Windows application can synchronize with a variety of objects, including a Windows process, thread, event, semaphore, mutex, writable timer, I/O completion port, ALPC port, registry key, or file object. In fact, almost all objects exposed by the kernel can be waited on. Some of these are proper dispatcher objects, whereas others are larger objects that have a dispatcher object within them (such as ports, keys, or files). Table 8-27 (later in this chapter in the section “What signals an object?”) shows the proper dispatcher objects, so any other object that the Windows API allows waiting on probably internally contains one of those primitives.

Two other types of executive synchronization mechanisms worth noting are the executive resource and the pushlock. These mechanisms provide exclusive access (like a mutex) as well as shared read access (multiple readers sharing read-only access to a structure). However, they're available only to kernel-mode code and thus are not accessible from the Windows API. They're also not true objects— they have an API exposed through raw pointers and Ex APIs, and the Object Manager and its handle system are not involved. The remaining subsections describe the implementation details of waiting for dispatcher objects.

## Waiting for dispatcher objects

The traditional way that a thread can synchronize with a dispatcher object is by waiting for the object's handle, or, for certain types of objects, directly waiting on the object's pointer. The NTWaitForXxx class of APIs (which is also what's exposed to user mode) works with handles, whereas the KeWaitForXxx APIs deal directly with the dispatcher object.

---

Because the Nt API communicates with the Object Manager (ObWaitForXxx class of functions), it goes through the abstractions that were explained in the section on object types earlier in this chapter. For example, the Nt API allows passing in a handle to a File Object, because the Object Manager uses the information in the object type to redirect the wait to the Event field inside of FILE_OBJECT. The Ke API, on the other hand, only works with true dispatcher objects—that is to say, those that begin with a DISPATCHER_HEADER structure. Regardless of the approach taken, these calls ultimately cause the kernel to put the thread in a wait state.

A completely different, and more modern, approach to waiting on dispatcher objects is to rely on

asynchronous waiting . This approach leverages the existing I/O completion port infrastructure to as sociate a dispatcher object with the kernel queue backing the I/O completion port, by going through

an intermediate object called a wait completion packet . Thanks to this mechanism, a thread essentially

registers a wait but does not directly block on the dispatcher object and does not enter a wait state.

Instead, when the wait is satisfied, the I/O completion port will have the wait completion packet insert ed, acting as a notification for anyone who is pulling items from, or waiting on, the I/O completion port.

This allows one or more threads to register wait indications on various objects, which a separate thread

(or pool of threads) can essentially wait on. As you've probably guessed, this mechanism is the linchpin

of the Thread Pool API's functionality supporting wait callbacks, in APIs such as CreateThreadPoolWait

and SetThreadPoolWait .

Finally, an extension of the asynchronous waiting mechanism was built into more recent builds of Windows 10, through the DPC Wait Event functionality that is currently reserved for Hyper-V (although the API is exported, it is not yet documented). This introduces a final approach to dispatcher waits, reserved for kernel-mode drivers, in which a deferred procedure call (DPC, explained earlier in this chapter) can be associated with a dispatcher object, instead of a thread or I/O completion port. Similar to the mechanism described earlier, the DPC is registered with the object, and when the wait is satisfied, the DPC is then queued into the current processor's queue (as if the driver had now just called IKeplerQueueDpc). When the dispatcher lock is dropped and the IRQL returns below DISPATCH LEVEL, the DPC executes on the current processor, which is the driver-supplied callback that can now react to the signal state of the object.

Irrespective of the waiting mechanism, the synchronization object(s) being waited on can be in one of two states: signaled state or nonsigned state. A thread can't resume its execution until its wait is satisfied, a condition that occurs when the dispatcher object whose handle the thread is waiting for also undergoes a state change, from the nonsigned state to the signaled state (when another thread sets an event object, for example).

To synchronize with an object, a thread calls one of the wait system services that the Object

Manager supplies, passing a handle to the object it wants to synchronize with. The thread can wait for

one or several objects and can also specify that its wait should be canceled if it hasn't ended within a

certain amount of time. Whenever the kernel sets an object to the signaled state, one of the kernel's

signal routines checks to see whether any threads are waiting for the object and not also waiting for

other objects to become signaled. If there are, the kernel releases one or more of the threads from their

waiting state so that they can continue executing.

---

To be asynchronously notified of an object becoming signaled, a thread creates an I/O completion

port, and then calls NTCreateWaitCompletionPacket to create a wait completion packet object and re ceive a handle back to it. Then, it calls NtAssociateWaitCompletionPacket, passing in both the handle to

the I/O completion port as well as the handle to the wait completion packet it just created, combined

with a handle to the object it wants to be notified about. Whenever the kernel sets an object to the

signaled state, the signal routines realize that no thread is currently waiting on the object, and instead

check whether an I/O completion port has been associated with the wait. If so, it signals the queue ob ject associated with the port, which causes any threads currently waiting on it to wake up and consume

the wait completion packet (or, alternatively, the queue simply becomes signaled until a thread comes

in and attempts to wait on it). Alternatively, if no I/O completion port has been associated with the wait,

then a check is made to see whether a DPC is associated instead, in which case it will be queued on the

current processor. This part handles the kernel-only DPC Wait Event mechanism described earlier.

The following example of setting an event illustrates how synchronization interacts with thread dispatching:

- ■ A user-mode thread waits for an event object's handle.
■ The kernel changes the thread's scheduling state to waiting and then adds the thread to a list of
threads waiting for the event.
■ Another thread sets the event.
■ The kernel marches down the list of threads waiting for the event. If a thread's conditions for
waiting are satisfied (see the following note), the kernel takes the thread out of the waiting
state. If it is a variable-priority thread, the kernel might also boost its execution priority. (For
details on thread scheduling, see Chapter 4 of Part 1.)
![Figure](figures/Winternals7thPt2_page_212_figure_003.png)

Note Some threads might be waiting for more than one object, so they continue waiting, unless they specified a WaitAny wait, which will wake them up as soon as one object (instead of all) is signaled.

## What signals an object?

The signaled state is defined differently for different objects. A thread object is in the nonsignaled state

during its lifetime and is set to the signaled state by the kernel when the thread terminates. Similarly,

the kernel sets a process object to the signaled state when the process's last thread terminates. In con trast, the timer object, like an alarm, is set to "go off" at a certain time. When its time expires, the kernel

sets the timer object to the signaled state.

When choosing a synchronization mechanism, a programmer must take into account the rules governing the behavior of different synchronization objects. Whether a thread's wait ends when an object is set to the signaled state varies with the type of object the thread is waiting for, as Table 8-27 illustrates.

---

TABLE 8-27 Definitions of the signaled state

<table><tr><td>Object Type</td><td>Set to Signed State When</td><td>Effect on Waiting Threads</td></tr><tr><td>Process</td><td>Last thread terminates.</td><td>All are released.</td></tr><tr><td>Thread</td><td>Thread terminates.</td><td>All are released.</td></tr><tr><td>Event (notification type)</td><td>Thread sets the event.</td><td>All are released.</td></tr><tr><td>Event (synchronization type)</td><td>Thread sets the event.</td><td>One thread is released and might receive a boost; the event object is reset.</td></tr><tr><td>Gate (locking type)</td><td>Thread signals the gate.</td><td>First waiting thread is released and receives a boost.</td></tr><tr><td>Gate (signaling type)</td><td>Thread signals the type.</td><td>First waiting thread is released.</td></tr><tr><td>Keyed event</td><td>Thread sets event with a key.</td><td>Thread that&#x27;s waiting for the key and which is of the same process as the signaler is released.</td></tr><tr><td>Semaphore</td><td>Semaphore count drops by 1.</td><td>One thread is released.</td></tr><tr><td>Timer (notification type)</td><td>Set time arrives or time interval expires.</td><td>All are released.</td></tr><tr><td>Timer (synchronization type)</td><td>Set time arrives or time interval expires.</td><td>One thread is released.</td></tr><tr><td>Mutex</td><td>Thread releases the mutex.</td><td>One thread is released and takes ownership of the mutex.</td></tr><tr><td>Queue</td><td>Item is placed on queue.</td><td>One thread is released.</td></tr></table>


When an object is set to the signaled state, waiting threads are generally released from their wait

states immediately.

For example, a notification event object (called a manual reset event in the Windows API) is used to

announce the occurrence of some event. When the event object is set to the signaled state, all threads

waiting for the event are released. The exception is any thread that is waiting for more than one object

at a time; such a thread might be required to continue waiting until additional objects reach the sig naled state.

In contrast to an event object, a mutex object has ownership associated with it (unless it was acquired during a DPC). It is used to gain mutually exclusive access to a resource, and only one thread at a time can hold the mutex. When the mutex object becomes free, the kernel sets it to the signaled state and then selects one waiting thread to execute, while also inheriting any priority boost that had been applied. (See Chapter 4 of Part 1 for more information on priority boosting.) The thread selected by the kernel acquires the mutex object, and all other threads continue waiting.

A mutex object can also be abandoned, something that occurs when the thread currently owning

it becomes terminated. When a thread terminates, the kernel enumerates all mutexes owned by the

thread and sets them to the abandoned state, which, in terms of signaling logic, is treated as a signaled

state in that ownership of the mutex is transferred to a waiting thread.

---

This brief discussion wasn't meant to enumerate all the reasons and applications for using the various executive objects but rather to list their basic functionality and synchronization behavior. For information on how to put these objects to use in Windows programs, see the Windows reference documentation on synchronization objects or Jeffrey Richter and Christophe Nasser's book Windows via C/C++ from Microsoft Press.

## Object-less waiting (thread alerts)

While the ability to wait for, or be notified about, an object becoming signaled is extremely powerful, and the wide variety of dispatcher objects at programmers' disposal is rich, sometimes a much simpler approach is needed. One thread wants to wait for a specific condition to occur, and another thread needs to signal the occurrence of the condition. Although this can be achieved by tying an event to the condition, this requires resources (memory and handles, to name a couple), and acquisition and creation of resources can fail while also taking time and being complex. The Windows kernel provides two mechanisms for synchronization that are not tied to dispatcher objects:

- • Thread alerts

• Thread alert by ID
Although their names are similar, the two mechanisms work in different ways. Let's look at how thread alerts work. First, the thread wishing to synchronize enters an alertable sleep by using SleepX (ultimately resulting in NtDelayExecutionThread). A kernel thread could also choose to use KeDelayExecutionThread. We previously explained the concept of alertability earlier in the section on software interrupts and APCs. In this case, the thread can either specify a timeout value or make the sleep infinite. Secondly, the other side uses the NtAlertThread (or KeAlertThread) API to alert the thread, which causes the sleep to abort, returning the status code STATUS_ALERTED. For the sake of completeness, it's also worth noting that a thread can choose not to enter an alertable sleep state, but instead, at a later time of its choosing, call the NtTestAlert (or KeTestAlertThread) API. Finally, a thread could also avoid entering an alertable wait state by suspending itself instead (NtSuspendThread or KeSuspendThread). In this case, the other side can use NtAlertResumeThread to both alert the thread and then resume it.

Although this mechanism is elegant and simple, it does suffer from a few issues, beginning with the fact that there is no way to identify whether the alert was the one related to the wait—in other words, any other thread could've also alerted the waiting thread, which has no way of distinguishing between the alerts. Second, the alert API is not officially documented—meaning that while internal kernel and user services can leverage this mechanism, third-party developers are not meant to use alerts. Third, once a thread becomes alerted, any pending queued APCs also begin executing—such as user-mode APCs if these alert APIs are used by applications. And finally, NtAblerThread still requires opening a handle to the target thread—a operation that technically counts as acquiring a resource, an operation which can fail. Callers could theoretically open their handles ahead of time, guaranteeing that the alert will succeed, but that still does add the cost of a handle in the whole mechanism.

To respond to these issues, the Windows kernel received a more modern mechanism starting with Windows 8, which is the alert by ID. Although the system calls behind this mechanism— NtAlertThreadByThreadadd and NtWaitForAlertByThreadadd—are not documented, the Win32 user-mode wait API that we describe later is. These system calls are extremely simple and require zero resources,

CHAPTER 8    System mechanisms      183


---

using only the Thread ID as input. Of course, since without a handle, this could be a security issue, the one disadvantage to these APIs is that they can only be used to synchronize with threads within the current process.

Explaining the behavior of this mechanism is fairly obvious: first, the thread blocks with the NtWaitForAlertByThreadId API, passing in an optional timeout. This makes the thread enter a real wait, without alertability being a concern. In fact, in spite of the name, this type of wait is non-alertable, by design. Next, the other thread calls the NtAlertThreadByThreadId API, which causes the kernel to look up the Thread ID, make sure it belongs to the calling process, and then check whether the thread is indeed blocking on a call to NtWaitForAlertByThreadId. If the thread is in this state, it's simply woken up. This simple, elegant mechanism is the heart of a number of user-mode synchronization primitives later in this chapter and can be used to implement anything from barriers to more complex synchronization methods.

## Data structures

Three data structures are key to tracking who is waiting, how they are waiting, what they are waiting for, and which state the entire wait operation is at. These three structures are the dispatcher header, the wait block, and the wait status register. The former two structures are publicly defined in the WDK include file Wdm.h, whereas the latter is not documented but is visible in public symbols with the type KWAIT_ STATUS_REGISTER (and the Flags field corresponds to the KWAIT_STATE enumeration).

The dispatcher header is a packed structure because it needs to hold a lot of information in a fixedsize structure. (See the upcoming "EXPERIMENT: Looking at wait queues" section to see the definition of the dispatcher header data structure.) One of the main techniques used in its definition is to store mutually exclusive flags at the same memory location (offset) in the structure, which is called a union in programming theory. By using the Type field, the kernel knows which of these fields is relevant. For example, a mutex can be Abandoned, but a timer can be Relative. Similarly, a timer can be Inserted into the timer list, but debugging can only be Active for a process. Outside of these specific fields, the dispatcher header also contains information that's meaningful regardless of the dispatcher object: the Signed state and the Wait List Head for the wait blocks associated with the object.

These wait blocks are what represents that a thread (or, in the case of asynchronous waiting, an I/O

completion port) is tied to an object. Each thread that is in a wait state has an array of up to 64 wait

blocks that represent the object(s) the thread is waiting for (including, potentially, a wait block point ing to the internal thread timer that's used to satisfy a timeout that the caller may have specified).

Alternatively, if the alert-by-ID primitives are used, there is a single block with a special indication that

is not a dispatcher-based wait. The Object field is replaced by a Hint that is specified by the caller of

NtWaitForAlertByThreadID. This array is maintained for two main purposes:

- When a thread terminates, all objects that it was waiting on must be dereferenced, and the wait
blocks deleted and disconnected from the object(s).
When a thread is awakened by one of the objects it's waiting on (that is, by becoming signaled
and satisfying the wait), all the other objects it may have been waiting on must be dereferenced
and the wait blocks deleted and disconnected.
---

Just like a thread has this array of all the objects it's waiting on, as we mentioned just a bit earlier, each dispatcher object also has a linked list of wait blocks tied to it. This list is kept so that when a dispatcher object is signaled, the kernel can quickly determine who is waiting on (or which I/O completion part is tied to) that object and apply the wait satisfaction logic we explain shortly:

Finally, because the balance set manager thread running on each CPU (see Chapter 5 of Part 1 for

more information about the balance set manager) needs to analyze the time that each thread has

been waiting for (to decide whether to page out the kernel stack), each PRCB has a list of eligible wait

ing threads that last ran on that processor. This reuses the Ready List field of the KTHREAD structure

because a thread can't both be ready and waiting at the same time. Eligible threads must satisfy the

following three conditions:

- • The wait must have been issued with a wait mode of UserMode (KernelMode waits are assumed
to be time-sensitive and not worth the cost of stack swapping).

• The thread must have the EnableStackSwap flag set (kernel drivers can disable this with the
KeSetKernelStackSwapEnable API).

• The thread's priority must be at or below the Win32 real-time priority range start (24—the
default for a normal thread in the "real-time" process priority class).
The structure of a wait block is always fixed, but some of its fields are used in different ways depending on the type of wait. For example, typically, the wait block has a pointer to the object being waited on, but as we pointed out earlier, for an alert-by-ID wait, there is no object involved, so this represents the Hint that was specified by the caller. Similarly, while a wait block usually points back to the thread waiting on the object, it can also point to the queue of an I/O completion port, in the case where a wait completion packet was associated with the object as part of an asynchronous wait.

Two fields that are always maintained, however, are the wait type and the wait block state, and, depending on the type, a wait key can also be present. The wait type is very important during wait satisfaction because it determines which of the five possible types of satisfaction regimes to use: for a wait any, the kernel does not care about the state of any other object because at least one of them (the current one!) is now signaled. On the other hand, for a wait all, the kernel can only wake the thread if all the other objects are also in a signaled state at the same time, which requires iterating over the wait blocks and their associated objects.

Alternatively, a wait dequeue is a specialized case for situations where the dispatcher object is actually a queue (I/O completion port), and there is a thread waiting on it to have completion packets available (by calling KeRemoveQueue(Ex) or (NtIo)RemoveIoCompletion). Wait blocks attached to queues function in a LIFO wake order (instead of FIFO like other dispatcher objects), so when a queue is signaled, this allows the correct actions to be taken (keep in mind that a thread could be waiting on multiple objects, so it could have other wait blocks, in a wait any or wait all state, that must still be handled regularly).

For a wait notification, the kernel knows that no thread is associated with the object at all and that this is an asynchronous wait with an associated I/O completion port whose queue will be signaled. (Because a queue is itself a dispatcher object, this causes a second order wait satisfaction for the queue and any threads potentially waiting on it.)

---

Finally, a wait DPC, which is the newest wait type introduced, lets the kernel know that there is no thread nor I/O completion port associated with this wait, but a DPC object instead. In this case, the pointer is to an initialized KPCD structure, which the kernel queues on the current processor for nearly immediate execution once the dispatcher lock is dropped.

The wait block also contains a volatile wait block state (KWAITBlock_STATE) that defines the current state of this wait block in the transactional wait operation it is currently engaged in. The different states, their meaning, and their effects in the wait logic code are explained in Table 8-28.

TABLE 8-28 Wait block states

<table><tr><td>State</td><td>Meaning</td><td>Effect</td></tr><tr><td>WaitBlockActive (4)</td><td>This wait block is actively linked to an object as part of a thread that is in a wait state.</td><td>During wait satisfaction, this wait block will be unlinked from the wait block list.</td></tr><tr><td>WaitBlockInactive (5)</td><td>The thread wait associated with this wait block has been satisfied (or the timeout has already expired while setting it up).</td><td>During wait satisfaction, this wait block will not be unlinked from the wait block list because the wait satisfaction must have already unlinked it during its active state.</td></tr><tr><td>WaitBlockSuspended (6)</td><td>The thread associated with this wait block is undergoing a lightweight suspend operation.</td><td>Essentially treated the same as WaitBlockActive but only ever used when resuming a thread. Ignored during regular wait satisfaction (should never be seen, as suspended threads can&#x27;t be waiting on something local).</td></tr><tr><td>WaitBlockBypassStart (0)</td><td>A signal is being delivered to the thread while the wait has not yet been committed.</td><td>During wait satisfaction (which would be immediate, before the thread enters the true state), the waiting period is a system view to the signaler because there is a risk that the wait object might be on the stack—marking the wait block as inactive would cause the waiter to unwind the stack while the signaler might still be accessing it.</td></tr><tr><td>WaitBlockBypassComplete (1)</td><td>The thread wait associated with this wait block has now been properly synchronized (the wait satisfaction has completed), and the bypass scenario is now completed.</td><td>The wait block is now essentially treated the same as an inactive wait block (ignored).</td></tr><tr><td>WaitBlockSuspendBypassStart (2)</td><td>A signal is being delivered to the thread while the lightweight suspend has not yet been committed.</td><td>The wait block is treated essentially the same as a WaitBlockBypassStart.</td></tr><tr><td>WaitBlockSuspendBypassComplete (3)</td><td>The lightweight suspend associated with this wait block has now been properly synchronized.</td><td>The wait block now behaves like a WaitBlockSuspended.</td></tr></table>


Finally, we mentioned the existence of a wait status register. With the removal of the global kernel dispatcher lock in Windows 7, the overall state of the thread (or any of the objects it is being required to start waiting on) can now change while wait operations are still being set up. Since there's no longer any global state synchronization, there is nothing to stop another thread—executing on a different logical processor—from signaling one of the objects being waited, or alerting the thread, or even sending it an APC. As such, the kernel dispatcher keeps track of a couple of additional data points for

CHAPTER 8 System mechanisms



---

each waiting thread object: the current fine-grained wait state of the thread (KWAIT_STATE, not to be confused with the wait block state) and any pending state changes that could modify the result of an ongoing wait operation. These two pieces of data are what make up the wait status register (KWAIT_STATUS_REGISTER).

When a thread is instructed to wait for a given object (such as due to a WaitForSingleObject call), it first attempts to enter the in-progress wait state (WaitInProgress) by beginning the wait. This operation succeeds if there are no pending alerts to the thread at the moment (based on the alertability of the wait and the current processor mode of the wait, which determine whether the alert can preempt the wait). If there is an alert, the wait is not entered at all, and the caller receives the appropriate status code; otherwise, the thread now enters the WaitInProgress state, at which point the main thread state is set to Waiting, and the wait reason and wait time are recorded, with any timeout specified also being registered.

Once the wait is in progress, the thread can initialize the wait blocks as needed (and mark them as WaitBlockActive in the process) and then proceed to lock all the objects that are part of this wait. Because each object has its own lock, it is important that the kernel be able to maintain a consistent locking ordering scheme when multiple processors might be analyzing a wait chain consisting of many objects (caused by a WaitForMultipleObjects call). The kernel uses a technique known as address ordering to achieve this: because each object has a distinct and static kernel-mode address, the objects can be ordered in monotonically increasing address order, guaranteeing that locks are always acquired and released in the same order by all callers. This means that the caller-supplied array of objects will be duplicated and sorted accordingly.

The next step is to check for immediate satisfaction of the wait, such as when a thread is being told to wait on a mutex that has already been released or an event that is already signaled. In such cases, the wait is immediately satisfied, which involves unlinking the associated wait blocks (however, in this case, no wait blocks have yet been inserted) and performing a wait exit (processing any pending scheduler operations marked in the wait status register). If this shortcut fails, the kernel next attempts to check whether the timeout specified for the wait (if any) has already expired. In this case, the wait is not "satisfied" but merely "timed out," which results in slightly faster processing of the exit code, albeit with the same result.

If none of these shortcuts were effective, the wait block is inserted into the thread's wait list, and the thread now attempts to commit its wait. (Meanwhile, the object lock or locks have been released, allowing other processors to modify the state of any of the objects that the thread is now supposed to attempt waiting on.) Assuming a noncontented scenario, where other processors are not interested in this thread or its wait objects, the wait switches into the committed state as long as there are no pending changes marked by the wait status register. The commit operation links the waiting thread in the PRCB list, activates an extra wait queue thread if needed, and inserts the timer associated with the wait timeout, if any. Because potentially quite a lot of cycles have elapsed by this point, it is again possible that the timeout has already elapsed. In this scenario, inserting the timer causes immediate signaling of the thread and thus a wait satisfaction on the timer and the overall timeout of the wait. Otherwise, in the much more common scenario, the CPU now context-switches away to the next thread that is ready for execution. (See Chapter 4 of Part 1 for more information on scheduling.)

In highly condemned code paths on multiprocessor machines, it is possible and likely that the

thread attempting to commit its wait has experienced a change while its wait was still in progress. One

CHAPTER 8 System mechanisms      187


---

possible scenario is that one of the objects it was waiting on has just been signaled. As touched upon earlier, this causes the associated wait block to enter the WaitBlockBypassStart state, and the thread's wait status register now shows the WaitAborted wait state. Another possible scenario is for an alert or APC to have been issued to the waiting thread, which does not set the WaitAborted state but enables one of the corresponding bits in the wait status register. Because APCs can break waits (depending on the type of APC, wait mode, and alertability), the APC is delivered, and the wait is aborted. Other operations that modify the wait status register without generating a full abort cycle include modifications to the thread's priority or affinity, which are processed when exiting the wait due to failure to commit, as with the previous cases mentioned.

As we briefly touched upon earlier, and in Chapter 4 of Part 1 in the scheduling section, recent versions of Windows implemented a lightweight suspend mechanism when SuspendThread and ResumeThread are used, which no longer always queues an APC that then acquires the suspend event embedded in the thread object. Instead, if the following conditions are true, an existing wait is instead converted into a suspend state:

- ■ KiDisableLightWeightSuspend is 0 (administrators can use the DisableLightWeightSuspend value
in the HKLM\SYSTEM\CurrentControlSet\Session Manager\Kernel registry key to turn off this
optimization).

■ The thread state is Waiting—that is, the thread is already in a wait state.

■ The wait status register is set to WaitCommitted—that is, the thread's wait has been fully
engaged.

■ The thread is not an UMS primary or scheduled thread (see Chapter 4 of Part 1 for more infor-
mation on User Mode Scheduling) because these require additional logic implemented in the
scheduler's suspend APC.

■ The thread issued a wait while at IRQL 0 (passive level) because waits at APC_LEVEL require
special handling that only the suspend APC can provide.

■ The thread does not have APCs currently disabled, nor is there an APC in progress, because
these situations require additional synchronization that only the delivery of the scheduler's
suspend APC can achieve.

■ The thread is not currently attached to a different process due to a call to KeStackAttachProcess
because this requires special handling just like the preceding bullet.

■ If the first wait block associated with the thread's wait is not in a WaitBlockInactive block
state, its wait type must be WaitAll; otherwise, this means that the there's at least one active
WaitAny block.
As the preceding list of criteria is hinting, this conversion happens by taking any currently active wait blocks and converting them to a WaitBlockSuspended state instead. If the wait block is currently pointing to an object, it is unlinked from its dispatcher header's wait list (such that signaling the object will no longer wake up this thread). If the thread had a timer associated with it, it is canceled and removed from the thread's wait block array, and a flag is set to remember that this was done. Finally, the original wait mode (Kernel or User) is also preserved in a flag as well.

---

Because it no longer uses a true wait object, this mechanism required the introduction the three additional wait block states shown in Table 8-28 as well as four new wait states: WaitSuspendInProgress, WaitSuspended, WaitResumeInProgress, and WaitResumeAborted. These new states behave in a similar manner to their regular counterparts but address the same possible race conditions described earlier during a lightweight suspend operation.

For example, when a thread is resumed, the kernel detects whether it was placed in a lightweight

suspend state and essentially undoes the operation, setting the wait register to WaitResumeProgress.

Each wait block is then enumerated, and for any block in the WaitBlockSuspended state, it is placed in

WaitBlockActive and linked back into the object's dispatcher header's wait block list, unless the object

became signaled in the meantime, in which case it is made WaitBlockInactive instead, just like in a regu lar wake operation. Finally, if the thread had a timeout associated with its wait that was canceled, the

thread's timer is reimented into the timer table, maintaining its original expiration (timeout) time.

Figure 8-39 shows the relationship of dispatcher objects to wait blocks to threads to PRCB (it assumes the threads are eligible for stack swapping). In this example, CPU 0 has two waiting (committed) threads: Thread 1 is waiting for object B, and thread 2 is waiting for objects A and B. If object A is signaled, the kernel sees that because thread 2 is also waiting for another object, thread 2 can't be readied for execution. On the other hand, if object B is signaled, the kernel can ready thread 1 for execution right away because it isn't waiting for any other objects. (Alternatively, if thread 1 was also waiting for other objects but its wait type was a WaitAny, the kernel could still wake it up.)

![Figure](figures/Winternals7thPt2_page_220_figure_003.png)

FIGURE 8-39 Wait data structures.

CHAPTER 8    System mechanisms      189


---

EXPERIMENT: Looking at wait queues

You can see the list of objects a thread is waiting for with the kernel debugger's !thread command.

For example, the following excerpt from the output of a !process command shows that the

thread is waiting for an event object:

```bash
!kdt !process 0 4 explorer.exe
    THREAD ffff898f2b345080  Cid 27bc.137c  Tab: 000000000006ba000
    Win32Thread 0000000000000000  WAIT: (UserRequest) UserMode Non-Alertable
        ffff898f2b36b4ba60  SynchronizationEvent
```

You can use the dx command to interpret the dispatcher header of the object like this:

```bash
!kdx dt (nt1_DISPATCH_HEADER*) 0xffff89f82b64ba60
(nt1_DISPATCH_HEADER*) 0xffff89f82b64ba60: 0xffff89f82b64ba60 [Type: _DISPATCHER_HEADER*]
    [+0x000] Lock        : 393217 [Type: long]
    [+0x000] LockMV       : 393217 [Type: long]
    [+0x000] Type        : 0x1 [Type: unsigned char]
    [+0x001] Signalling   : 0x0 [Type: unsigned char]
    [+0x002] Size        : 0x6 [Type: unsigned char]
    [+0x003] Reserved1      : 0x0 [Type: unsigned char]
    [+0x000] TimerType     : 0x1 [Type: unsigned char]
    [+0x001] TimerControlFlags : 0x0 [Type: unsigned char]
    [+0x001] (0: 0) Absolute    : 0x0 [Type: unsigned char]
    [+0x001] (1: 11) Wake        : 0x0 [Type: unsigned char]
    [+0x01] (7: 22) EncodedTolerableDelay : 0x0 [Type: unsigned char]
    [+0x002] Hand          : 0x6 [Type: unsigned char]
    [+0x003] TimerMiscFlags : 0x0 [Type: unsigned char]
    [+0x003] (5: 0) Index        : 0x0 [Type: unsigned char]
    [+0x003] (6: 0) Inde        : 0x0 [Type: unsigned char]
    [+0x003] (7: 77) Expired      : 0x0 [Type: unsigned char]
    [+0x000] Timer2Type     : 0x1 [Type: unsigned char]
    [+0x001] Timer2Flags    : 0x0 [Type: unsigned char]
    [+0x001] (0: 0) Timer2Inserted : 0x0 [Type: unsigned char]
    [+0x01] (1: 11) Timer2Expires  : 0x0 [Type: unsigned char]
    [+0x01] (2: 22) Timer2CancelPending : 0x0 [Type: unsigned char]
    [+0x01] (3: 33) Timer2SetPending : 0x0 [Type: unsigned char]
    [+0x01] (4: 47) Timer2Running  : 0x0 [Type: unsigned char]
    [+0x01] (5: 57) Timer2Disabled  : 0x0 [Type: unsigned char]
    [+0x01] (7: 67) Timer2ReservedFlags : 0x0 [Type: unsigned char]
    [+0x002] Timer2ComponentId : 0x6 [Type: unsigned char]
    [+0x003] Timer2RelativeId : 0x0 [Type: unsigned char]
    [+0x000] QueueType       : 0x1 [Type: unsigned char]
    [+0x001] QueueControlFlags : 0x0 [Type: unsigned char]
    [+0x01] (0: 0) Abandoned      : 0x0 [Type: unsigned char]
    [+0x01] (1: 11) DisableIncrement : 0x0 [Type: unsigned char]
    [+0x01] (7: 22) QueueReservedControlFlags : 0x0 [Type: unsigned char]
    [+0x002] QueueSize     : 0x6 [Type: unsigned char]
    [+0x003] QueueReserved    : 0x0 [Type: unsigned char]
    [+0x000] ThreadType     : 0x1 [Type: unsigned char]
    [+0x001] ThreadReserved  : 0x0 [Type: unsigned char]
    [+0x002] ThreadControlFlags : 0x6 [Type: unsigned char]
    [+0x002] (0: 0) CycleProfiling   : 0x0 [Type: unsigned char]
    [+0x002] (1: 11) CounterProfiling : 0x1 [Type: unsigned char]
```

---

1


1


1

Because this structure is a union, you should ignore any values that do not correspond to the given object type because they are not relevant to it. Unfortunately, it is not easy to tell which fields are relevant to which type, other than by looking at the Windows kernel source code and the WDK header files' comments. For convenience, Table 8-29 lists the dispatcher flags and the objects to which they apply.

TABLE 8-29 Usage and meaning of the dispatcher headers flags

<table><tr><td>Flag</td><td>Applies To</td><td>Meaning</td></tr><tr><td>Type</td><td>All dispatcher objects</td><td>Value from the OBJECTS enumeration that identifies the type of dispatcher object that this is.</td></tr><tr><td>Lock</td><td>All objects</td><td>Used for locking an object during wait operations that need to modify its state or linkage, actually corresponds to bit 7 (0x80) of the Type field.</td></tr><tr><td>Signaling</td><td>Gates</td><td>A priority boost should be applied to the woken thread when the gate is signaled.</td></tr><tr><td>Sire</td><td>Events, Semaphores, Gates, Processes</td><td>Size of the object divided by 4 to fit in a single byte.</td></tr><tr><td>TimerType</td><td>Idle Resilient Timers</td><td>Mapping of the Type field.</td></tr><tr><td>TimerInserted</td><td>Idle Resilient Timers</td><td>Set if the timer was inserted into the timer handle table.</td></tr><tr><td>TimerExpiring</td><td>Idle Resilient Timers</td><td>Set if the timer is undergoing expiration.</td></tr><tr><td>TimerCancelPending</td><td>Idle Resilient Timers</td><td>Set if the timer is being canceled.</td></tr><tr><td>TimerRunning</td><td>Idle Resilient Timers</td><td>Set if the timer's callback is currently active.</td></tr><tr><td>TimerDisabled</td><td>Idle Resilient Timers</td><td>Set if the timer has been disabled.</td></tr></table>

CHAPTER 8 System mechanisms 191


---

<table><tr><td>Flag</td><td>Applies To</td><td>Meaning</td></tr><tr><td>Timer2ComponentId</td><td>Idle Resilient Timers</td><td>Identifies the well-known component associated with the timer.</td></tr><tr><td>Timer2Relativeld</td><td>Idle Resilient Timers</td><td>Within the component ID specified earlier, identifies which of its timers this is.</td></tr><tr><td>TimerType</td><td>Timers</td><td>Mapping of the Type field.</td></tr><tr><td>Absolute</td><td>Timers</td><td>The expiration time is absolute, not relative.</td></tr><tr><td>Wake</td><td>Timers</td><td>This is a wakeable timer, meaning it should exit a standby state when signaled.</td></tr><tr><td>EncodedTolerableDelay</td><td>Timers</td><td>The maximum amount of tolerance (shifted as a power of two) that the timer can support when running outside of its expected periodicity.</td></tr><tr><td>Hand</td><td>Timers</td><td>Index into the timer handle table.</td></tr><tr><td>Index</td><td>Timers</td><td>Index into the timer expiration table.</td></tr><tr><td>Inserted</td><td>Timers</td><td>Set if the timer was inserted into the timer handle table.</td></tr><tr><td>Expired</td><td>Timers</td><td>Set if the timer has already expired.</td></tr><tr><td>ThreadType</td><td>Threads</td><td>Mapping of the Type field.</td></tr><tr><td>ThreadReserved</td><td>Threads</td><td>Unused.</td></tr><tr><td>CycleProfiling</td><td>Threads</td><td>CPU cycle profiling has been enabled for this thread.</td></tr><tr><td>CounterProfiling</td><td>Threads</td><td>Hardware CPU performance counter monitoring/profiling has been enabled for this thread.</td></tr><tr><td>GroupScheduling</td><td>Threads</td><td>Scheduling groups have been enabled for this thread, such as when running under DFSS mode (Distributed Fair-Share Scheduler) or with a Job Object that implements CPU throttling.</td></tr><tr><td>AffinitySet</td><td>Threads</td><td>The thread has a CPU Set associated with it.</td></tr><tr><td>Tagged</td><td>Threads</td><td>The thread has been assigned a property tag.</td></tr><tr><td>EnergyProfiling</td><td>Threads</td><td>Energy estimation is enabled for the process that this thread belongs to.</td></tr><tr><td>SchedulerAssist</td><td>Threads</td><td>The Hyper-V XTS (eXtended Scheduler) is enabled, and this thread belongs to a virtual processor (VP) thread inside of a VM minimal process.</td></tr><tr><td>Instrumented</td><td>Threads</td><td>Specifies whether the thread has a user-mode instrumentation callback.</td></tr><tr><td>ActiveDR7</td><td>Threads</td><td>Hardware breakpoints are being used, so DR7 is active and should be sanitized during context operations. This flag is also sometimes called DebugActive.</td></tr><tr><td>Minimal</td><td>Threads</td><td>This thread belongs to a minimal process.</td></tr><tr><td>AllSyscall</td><td>Threads</td><td>An alternate system call handler has been registered for the process that owns this thread, such as a Pico Provider or a Windows CE PAL.</td></tr></table>


---

<table><tr><td>Flag</td><td>Applies To</td><td>Meaning</td></tr><tr><td>UmsScheduled</td><td>Threads</td><td>This thread is a UMS Worker (scheduled) thread.</td></tr><tr><td>UmsPrimary</td><td>Threads</td><td>This thread is a UMS Scheduler (primary) thread.</td></tr><tr><td>MutantType</td><td>Mutants</td><td>Mapping of the Type field.</td></tr><tr><td>MutantSize</td><td>Mutants</td><td>Unused.</td></tr><tr><td>DpcActive</td><td>Mutants</td><td>The mutant was acquired during a DPC.</td></tr><tr><td>MutantReserved</td><td>Mutants</td><td>Unused.</td></tr><tr><td>QueueType</td><td>Queues</td><td>Mapping of the Type field.</td></tr><tr><td>Abandoned</td><td>Queues</td><td>The queue no longer has any threads that are waiting on it.</td></tr><tr><td>DisableIncrement</td><td>Queues</td><td>No priority boost should be given to a thread waking up to handle a packet on the queue.</td></tr></table>

Finally, the dispatcher header also has the SignalState field, which we previously mentioned, and the WaitListHead, which was also described. Keep in mind that when the wait list head points are identical, this can either mean that there are no threads waiting or that one thread is waiting on this object. You can tell the difference if the identical pointer happens to be the address of the list itself—which indicates that there's no waiting thread at all. In the earlier example, 0xFFFF898F2B3451C0 was not the address of the list, so you can dump the wait block as follows:

1kb<dt ntl_KWAIT BLOCK">0xffff898F2b3451c0 (ntl_KWAIT BLOCK">0xffff898F2b3451c0 [0x000] WaitListEntry [Type: _LIST_ENTRY] [0x0x10] WaitType : 0x1 [Type: unsigned char] [0x0x11] BlockState : 0x4 [Type: unsigned char] [0x0x12] WaitKey : 0x0 [Type: unsigned short] [0x0x14] SpareLong : 6066 [Type: long] [0x0x18] Thread : 0xffff898F2b345080 [Type: _KTHREAD *) [0x0x18] NotificationQueue: 0xffff898F2b345080 [Type: _KQUEUE *) [0x0x20] Object : 0xffff898F2b64ba60 [Type: void *) [0x0x28] SparePtr : 0x0 [Type: void =]

In this case, the wait type indicates a WaitAny, so we know that there is a thread blocking on the event, whose pointer we are given. We also see that the wait block is active. Next, we can investigate a few wait-related fields in the thread structure:

1kb<dt ntl_KWAIT BLOCK>0xffff898F2b345080 WaitRegister.State WaitIrql WaitBlockCount WaitReason WaitTime +0x070 WaitRegister : 0x001 +0x186 WaitIrql : 0 ' ' +0x187 WaitMode : 1 ' ' +0x1b4 WaitTime : 0x30b38f8 +0x24b WaitBlockCount : 0x1 ' ' +0x283 WaitReason : 0x6 ' '

CHAPTER 8 System mechanisms 193


---

The data shows that this is a committed wait that was performed at IRQL 0 (Passive Level)

with a wait mode of UserMode, at the time shown in 15 ms clock ticks since boot, with the reason

indicating a user-mode application request. We can also see that this is the only wait block this

thread has, meaning that it is not waiting for any other object.

If the wait list head had more than one entry, you could've executed the same commands on

the second pointer value in the WaitListEntry field of the wait block (and eventually executing

!thread on the thread pointer in the wait block) to traverse the list and see what other threads

are waiting for the object. If those threads were waiting for more than one object, you'd have to

look at their WaitBlockCount to see how many other wait blocks were present, and simply keep

incrementing the pointer by sizeof(KWAIT, BLOCK).

Another possibility is that the wait type would have been WaitNotification, at which point you'd have used the notification queue pointer instead to dump the Queue (KQUEUE) structure, which is itself a dispatcher object. Potentially, it would also have had its own nonempty wait block list, which would have revealed the wait block associated with the worker thread that will be asynchronously receiving the notification that the object has been signaled. To determine which callback would eventually execute, you would have to dump user-mode thread pool data structures.

## Keyed events

A synchronization object called a keyed event bears special mention because of the role it played in user-mode-exclusive synchronization primitives and the development of the alert-by-ID primitive, which you'll shortly realize is Windows' equivalent of the futex in the Linux operating system (a wellstudied computer science concept). Keyed events were originally implemented to help processes deal with low-memory situations when using critical sections, which are user-mode synchronization objects that we'll see more about shortly. A keyed event, which is not documented, allows a thread to specify a "key" for which it waits, where the thread wakes when another thread of the same process signals the event with the same key. As we pointed out, if this sounds familiar to the alerting mechanism, it is because keyed events were its precursor.

If there was contention, EnterCriticalSection would dynamically allocate an event object, and the thread wanting to acquire the critical section would wait for the thread that owns the critical section to signal it in LeaveCriticalSection. Clearly, this introduces a problem during low-memory conditions: critical section acquisition could fail because the system was unable to allocate the event object required. In a pathological case, the low-memory condition itself might have been caused by the application trying to acquire the critical section, so the system would deadlock in this situation. Low memory wasn't the only scenario that could cause this to fail—a less likely scenario was handle exhaustion. If the process reached its handle limit, the new handle for the event object could fail.

It might seem that preallocating a global standard event object, similar to the reserve objects we

talked about previously, would fix the issue. However, because a process can have multiple critical sec tions, each of which can have its own locking state, this would require an unknown number of preal located event objects, and the solution doesn’t work. The main feature of keyed events, however, was

194      CHAPTER 8    System mechanisms


---

that a single event could be reused among different threads, as long as each one provided a different key to distinguish itself. By providing the virtual address of the critical section itself as the key, this effectively allows multiple critical sections (and thus, waiters) to use the same keyed event handle, which can be preallocated at process startup time.

When a thread signals a keyed event or performs a wait on it, it uses a unique identifier called a

key, which identifies the instance of the keyed event (an association of the keyed event to a single

critical section). When the owner thread releases the keyed event by signaling it, only a single thread

waiting on the key is woken up (the same behavior as synchronization events, in contrast to notifica tion events). Going back to our use case of critical sections using their address as a key, this would im ply that each process still needs its own keyed event because virtual addresses are obviously unique

to a single process address space. However, it turns out that the kernel can wake only the waiters in

the current process so that the key is even isolated across processes, meaning that there can be only

a single keyed event object for the entire system.

As such, when EnterCriticalSection called NtWaitForKeyedEvent to perform a wait on the keyed event, it gave a NULL handle as parameter for the keyed event, telling the kernel that it was unable to create a keyed event. The kernel recognizes this behavior and uses a global keyed event named ExpCritSecOutOfMemoryEvent. The primary benefit is that processes don’t need to waste a handle for a named keyed event anymore because the kernel keeps track of the object and its references.

However, keyed events were more than just a fallback object for low-memory conditions. When multiple waiters are waiting on the same key and need to be woken up, the key is signaled multiple times, which requires the object to keep a list of all the waiters so that it can perform a "wake" operation on each of them. (Recall that the result of signaling a keyed event is the same as that of signaling a synchronization event.) However, a thread can signal a keyed event without any threads on the waiter list. In this scenario, the signaling thread instead waits on the event itself.

Without this fallback, a signaling thread could signal the keyed event during the time that the usermode code saw the keyed event as unsigned and attempted a wait. The wait might have come after the signaling thread signaled the keyed event, resulting in a missed pulse, so the waiting thread would deadlock. By forcing the signaling thread to wait in this scenario, it actually signals the keyed event only when someone is looking (waiting). This behavior made them similar, but not identical, to the Linux

futex, and enabled their usage across a number of user-mode primitives, which we'll see shortly, such as

Slim Read Writer (SRW) Locks.

![Figure](figures/Winternals7thPt2_page_226_figure_005.png)

Note When the keyed-event wait code needs to perform a wait, it uses a built-in semaphore located in the kernel-mode thread object (ETHREAD) called KeyedWaitSemaphore. (This semaphore shares its location with the ALPC wait semaphore.) See Chapter 4 of Part 1 for more information on thread objects.

Keyed events, however, did not replace standard event objects in the critical section implementation. The initial reason, during the Windows XP timeframe, was that keyed events did not offer scalable performance in heavy-usage scenarios. Recall that all the algorithms described were meant to be used

---

only in critical, low-memory scenarios, when performance and scalability aren't all that important. To replace the standard event object would've placed strain on keyed events that they weren't implemented to handle. The primary performance bottleneck was that keyed events maintained the list of waiters described in a doubly linked list. This kind of list has poor traversal speed, meaning the time required to loop through the list. In this case, this time depended on the number of waiter threads. Because the object is global, dozens of threads could be on the list, requiring long traversal times every single time a key was set or waited on.

![Figure](figures/Winternals7thPt2_page_227_figure_001.png)

Note The head of the list is kept in the keyed event object, whereas the threads are linked through the KeyedWaitChain field (which is shared with the thread's exit time, stored as a LARGE_INTEGER, the same size as a doubly linked list) in the kernel-mode thread object (ETHREAD). See Chapter 4 of Part 1 for more information on this object.

Windows Vista improved keyed-event performance by using a hash table instead of a linked list to hold the watter threads. This optimization is what ultimately allowed Windows to include the three new lightweight user-mode synchronization primitives (to be discussed shortly) that all depended on the keyed event. Critical sections, however, continued to use event objects, primarily for application compatibility and debugging, because the event object and internals are well known and documented, whereas keyed events are opaque and not exposed to the Win32 API.

With the introduction of the new alerting by Thread ID capabilities in Windows 8, however, this all

changed again, removing the usage of keyed events across the system (save for one situation in init

once synchronization, which we'll describe shortly). And, as more time had passed, the critical section

structure eventually dropped its usage of a regular event object and moved toward using this new ca pability as well (with an application compatibility shim that can revert to using the original event object

if needed).

## Fast mutexes and guarded mutexes

Fast mutexes, which are also known as executive mutexes, usually offer better performance than mutex objects because, although they are still built on a dispatcher object—an event—they perform a wait only if the fast mutex is contended. Unlike a standard mutex, which always attempts the acquisition through the dispatcher, this gives the fast mutex especially good performance in contended environments. Fast mutexes are used widely in device drivers.

This efficiency comes with costs, however, as fast mutexes are only suitable when all kernel-mode

APC (described earlier in this chapter) delivery can be disabled, unlike regular mutex objects that block

only normal APC delivery. Reflecting this, the executive defines two functions for acquiring them:

ExAcquireFastMutex and ExAcquireFastMutexUnsafe The former function blocks all APC Delivery by

raising the IRQL of the processor to APC level. The latter, "unsafe" function, expects to be called with

all kernel-mode APC delivery already disabled, which can be done by raising the IRQL to APC level.

ExTryToAcquireFastMutex performs similarly to the first, but it does not actually wait if the fast mutex is

already held, returning FALSE instead. Another limitation of fast mutexes is that they can't be acquired

recursively, unlike mutex objects.

---

In Windows 8 and later, guarded mutexes are identical to fast mutexes but are acquired

with KeAcquireGuardedMutex and KeAcquireGuardedMutexUnsafe. Like fast mutexes, a

KeTryToAcquireGuardedMutex method also exists.

Prior to Windows 8, these functions did not disable APCs by raising the IRQL to APC level, but by entering a guarded region instead, which set special counters in the thread's object structure to disable APC delivery until the region was exited, as we saw earlier. On older systems with a PIC (which we also talked about earlier in this chapter), this was faster than touching the IRQL. Additionally, guarded mutexes used a gate dispatcher object, which was slightly faster than an event—another difference that is no longer true.

Another problem related to the guarded mutex was the kernel function KeAreApcsDisabled. Prior to Windows Server 2003, this function indicated whether normal APCs were disabled by checking whether the code was running inside a critical section. In Windows Server 2003, this function was changed to indicate whether the code was in a critical or guarded region, changing the functionality to also return TRUE if special kernel APCs are also disabled.

Because there are certain operations that drivers should not perform when special kernel APCs are disabled, it made sense to call KeGetCurrentIql to check whether the IRQ is APC level or not, which was the only way special kernel APCs could have been disabled. However, with the introduction of guarded regions and guarded mutexes, which were heavily used even by the memory manager, this check failed because guarded mutexes did not raise IRQ. Drivers then had to call KeAreAllApcsDisabled for this purpose, which also checked whether special kernel APCs were disabled through a guarded region. These idiosyncrasies, combined with fragile checks in Driver Verifier causing false positives, ultimately all led to the decision to simply make guarded mutexes revert to just being fast mutexes.

## Executive resources

Executive resources are a synchronization mechanism that supports shared and exclusive access; like fast mutexes, they require that all kernel-mode APC delivery be disabled before they are acquired. They are also built on dispatcher objects that are used only when there is contention. Executive resources are used throughout the system, especially in file-system drivers, because such drivers tend to have long-lasting wait periods in which I/O should still be allowed to some extent (such as reads).

Threads waiting to acquire an executive resource for shared access wait for a semaphore associated

with the resource, and threads waiting to acquire an executive resource for exclusive access wait for an

event. A semaphore with unlimited count is used for shared waiters because they can all be woken and

granted access to the resource when an exclusive holder releases the resource simply by signaling the

semaphore. When a thread waits for exclusive access of a resource that is currently owned, it waits on

a synchronization event object because only one of the waiters will wake when the event is signaled. In

the earlier section on synchronization events, it was mentioned that some event await operations can

actually cause a priority boost. This scenario occurs when executive resources are used, which is one

reason why they also track ownership like mutexes do. (See Chapter 4 of Part 1 for more information on

the executive resource priority boost.)

---

Because of the flexibility that shared and exclusive access offer, there are several functions for

acquiring resources: ExAcquireResourceSharedLite, ExAcquireResourceExclusiveLite, ExAcquireShared

StarveExclusive, and ExAcquireSharedWaitForExclusive. These functions are documented in the WDK.

Recent versions of Windows also added fast executive resources that use identical API names but add the word "fast," such as ExAcquireFastResourceExclusive, ExReleaseFastResource, and so on. These are meant to be faster replacements due to different handling of lock ownership, but no component uses them other than the Resilient File System (ReFS). During highly contended file system access, ReFS has slightly better performance than NTFS, in part due to the faster locking.

## EXPERIMENT: Listing acquired executive resources

The kernel debugger !locks command uses the kernel's linked list of executive resources and dumps their state. By default, the command lists only executive resources that are currently owned, but the -d option is documented as listing all executive resources—unfortunately, this is no longer the case. However, you can still use the -v flag to dump verbose information on all resources instead. Here is partial output of the command:

```bash
!kb! !locks -v
    **** DUMP OF ALL RESOURCE OBJECTS *****
Resource @ nt!ExpFirmwareTableResource (0xfffff8047ee34440)    Available
Resource @ nt!PsloadedModuleResource (0xfffff8047ee48120)    Available
    Contention Count = 2
Resource @ nt!SpRmdBlock (0xfffff8047ef06350)        Available
    Contention Count = 93
Resource @ nt!SpRmdBlock (0xfffff8047ef06388)      Available
Resource @ nt!SpRmdBlock (0xfffff8047fe06420)      Available
Resource @ nt!SpRmdBlock (0xfffff8047fe06488)      Available
Resource @ nt!SpRmdGlobalSecurityBlock (0xfffff8047fe06490)    Available
Resource @ nt!SpRmdGlobalSecurityInfo (0xfffff8047fe064E0)    Available
Resource @ nt!SpRmdDeletedLogOpenInfo (0xfffff8047e6d0D0)    Available
Resource @ 0xfffff80f30a8550    Available
Resource @ nt!PnpRegistryDeviceResource (0xfffff8047ee62b00)    Available
    Contention Count = 27385
Resource @ nt!PopPolicyLock (0xfffff8047ee458c0)    Available
    Contention Count = 14
Resource @ 0xfffff80f30a8950    Available
Resource @ 0xfffff80f30a82d0    Available
```

Note that the contention count, which is extracted from the resource structure, records

the number of times threads have tried to acquire the resource and had to wait because it was

already owned. On a live system where you break in with the debugger, you might be lucky

enough to catch a few held resources, as shown in the following output:

```bash
2: kd> !locks
   **** DUMP OF ALL RESOURCE OBJECTS *****
KD: Scanning for held locks.....
   Resource @ 0ffdefa073ad36a28   Shared 1 owning threads
     Contention Count = 28
     Threads: ffffde07a9374080-01->
```

198      CHAPTER 8    System mechanisms


---

```bash
KD: Scanning for held locks....
Resource 0 0xffffde07a2bfb350    Shared 1 owning threads
   Contention Count = 2
   Threads: ffffde07a9374080-01<<>
KD: Scanning for held locks.......................................................
..................................................................
Resource 0 0xffffde07a18070c00    Shared 1 owning threads
     Threads: ffffde07aa3f31083-01<<> """ Actual Thread ffffde07aa3f1080
KD: Scanning for held locks.......................................................
..................................................................
Resource 0 0xffffde07a8995900    Exclusively owned
     Threads: ffffde07a9374080-01<<>
KD: Scanning for held locks.......................................................
    9706 total locks, 4 locks currently held
```

You can examine the details of a specific resource object, including the thread that owns the resource and any threads that are waiting for the resource, by specifying the -w switch and the address of the resource, if you find one that's currently acquired (owned). For example, here's a held shared resource that seems to be associated with NTFS, while a thread is attempting to read from the file system:

```bash
2: kd> !locks -v 0xffffde07a33d6a28
Resource 0 0xffffde07a33d6a28    Shared 1 owning threads
   Contention Count = 28
     Threads: ffffde07a9374080-01=0
     THREAD ffffde07a9374080    Cid 0544.1494    Teb: 000000ed8de12000
     Win32Thread: 0000000000000000 WAIT: (Executive) KernelMode Non-Alertable
     ffff828794a387b8 NotificationEvent
     IRP List:
       ffffde07a936da20: (0006,0478) Flags: 00020043    Mdl: ffffde07a8a75950
       ffffde07a94fa20: (0006,0478) Flags: 000000884    Mdl: 000000000
     Not impersonating
     DeviceMap               ffff8786f6fc35840
     Ownership Process         ffffde07a7f990c0    Image:        svchost.exe
     Attached Process          N/A      Image:            N/A
     Wait Start TickCount       3649      Ticks: 0
     Context Switch Count        31      IdealProcessor: 1
     UserTime                 00:00:00.015
     KernelTime                00:00:00.000
     Win32 Start Address 0x00007ff926812390
     Stack Init ffff8287943aa650 Current ffff8287943a8030
     Base ffff8287943a000 Limit ffff8287943a4000 Call 000000000000000
     Priority 7 BasePriority 6 PriorityDecrement 0 IoPriority 0 PagePriority 1
     Child-SP              RetAddr       Call Site
     ffff8287 943a8070 ffff8801 104423a nt!k1SwpContext+0x76
     ffff8287 943a810o ffff801 10445d53 nt!k1SwpThread+0x5ba
     ffff8287 943a8270 ffff8801 10446579 nt!k1CommThreadWait+0x153
     ffff8287 943a8310 ffff8001 1263e62 nt!k1KeWafForSingleObject+0x239
     ffff8287 943a8400 ffff8801 1263d682 NtfsNftfsNonCachedI0+0xa52
     ffff8287 943a860o ffff8001 1263b576 NtfsNtfsCommonRead+0xd152
     ffff8287 943a8850 ffff8001 1049a725 NtfsNtfsSrdRead+0x96
     ffff8287 943a8290 ffff8001 11826591 nt!IoCallDriver+0x55
```

CHAPTER 8    System mechanisms      199


---

## Pushlocks

Pushlocks are another optimized synchronization mechanism built on event objects; like fast and

guarded mutexes, they wait for an event only when there's contention on the lock. They offer advan tages over them, however, in that they can also be acquired in shared or exclusive mode, just like an

executive resource. Unlike the latter, however, they provide an additional advantage due to their size:

a resource object is 104 bytes, but a pushlock is pointer sized. Because of this, pushlocks do not require

allocation nor initialization and are guaranteed to work in low-memory conditions. Many components

inside of the kernel moved away from executive resources to pushlocks, and modern third-party driv ers all use pushlocks as well.

There are four types of pushlocks: normal, cache-aware, auto-expand, and address-based. Normal pushlocks require only the size of a pointer in storage (4 bytes on 32-bit systems, and 8 bytes on 64-bit systems). When a thread acquires a normal pushlock, the pushlock code marks the pushlock as owned if it is not currently owned. If the pushlock is owned exclusively or the thread wants to acquire the thread exclusively and the pushlock is owned on a shared basis, the thread allocates a wait block on the thread's stack, initializes an event object in the wait block, and adds the wait block to the wait list associated with the pushlock. When a thread releases a pushlock, the thread wakes a waiter, if any are present, by signaling the event in the waiter's wait block.

Because a pushlock is only pointer-sized, it actually contains a variety of bits to describe its state.

The meaning of those bits changes as the pushlock changes from being contended to noncontended.

In its initial state, the pushlock contains the following structure:

- ■ One lock bit, set to 1 if the lock is acquired

■ One waiting bit, set to 1 if the lock is contended and someone is waiting on it

■ One waking bit, set to 1 if the lock is being granted to a thread and the waiter's list needs to be

optimized

■ One multiple shared bit, set to 1 if the pushlock is shared and currently acquired by more than

one thread

■ 28 (on 32-bit Windows) or 60 (on 64-bit Windows) share count bits, containing the number of

threads that have acquired the pushlock
As discussed previously, when a thread acquires a pushlock exclusively while the pushlock is already

acquired by either multiple readers or a writer, the kernel allocates a pushlock wait block. The structure

of the pushlock value itself changes. The share count bits now become the pointer to the wait block.

Because this wait block is allocated on the stack, and the header files contain a special alignment direc tive to force it to be 16-byte aligned, the bottom 4 bits of any pushlock wait-block structure will be all

zeros. Therefore, those bits are ignored for the purposes of pointer dereferencing: instead, the 4 bits

shown earlier are combined with the pointer value. Because this alignment removes the share count

bits, the share count is now stored in the wait block instead.

A cache-aware pushlock adds layers to the normal (basic) pushlock by allocating a pushlock for each

processor in the system and associating it with the cache-aware pushlock. When a thread wants to

---

acquire a cache-aware pushlock for shared access, it simply acquires the pushlock allocated for its current processor in shared mode, to acquire a cache-aware pushlock exclusively, the thread acquires the pushlock for each processor in exclusive mode.

As you can imagine, however, with Windows now supporting systems of up to 2560 processors, the number of potential cache-padded slots in the cache-aware pushlock would require immense fixed allocations, even on systems with few processors. Support for dynamic hot-add of processors makes the problem even harder because it would technically require the preallocation of all 2560 slots ahead of time, creating multi-KB lock structures. To solve this, modern versions of Windows also implement the auto-expand push lock. As the name suggests, this type of cache-aware pushlock can dynamically grow the number of cache slots as needed, both based on contention and processor count, while guaranteeing forward progress, leveraging the executive's slot allocator, which pre-reserves paged or nonpaged pool (depending on flags that were passed in when allocating the auto-expand pushlock).

Unfortunately for third-party developers, cache-aware (and their newer cousins, auto-expand)

pushlocks are not officially documented for use, although certain data structures, such as FCB Headers in

Windows 10 21H1 and later, do opaquely use them (more information about the FCB structure is available

in Chapter 11.) Internal parts of the kernel in which auto-expand pushlocks are used include the memory

manager, where they are used to protect Address Windowing Extension (AWE) data structures.

Finally, another kind of nondocumented, but exported, push-lock is the address-based pushlock,

which rounds out the implementation with a mechanism similar to the address-based wait we'll shortly

see in user mode. Other than being a different “kind” of pushlock, the address-based pushlock refers

more to the interface behind its usage. On one end, a caller uses ExBlockOnAddressPushLock, passing

in a pushlock, the virtual address of some variable of interest, the size of the variable (up to 8 bytes),

and a comparison address containing the expected, or desired, value of the variable. If the variable

does not currently have the expected value, a wait is initialized with ExTimedWaitForUnblockPushLock.

This behaves similarly to contended pushlock acquisition, with the difference that a timeout value

can be specified. On the other end, a caller uses ExUnlockOnAddressPushLockEx after making a change

to an address that is being monitored to signal a waiter that the value has changed. This technique

is especially useful when dealing with changes to data protected by a lock or interlocked operation,

so that racing readers can wait for the writer’s notification that their change is complete, outside of a

lock. Other than a much smaller memory footprint, one of the large advantages that pushlocks have

over executive resources is that in the noncontented case they do not require lengthy accounting and

integer operations to perform acquisition or release. By being as small as a pointer, the kernel can use

atomic CPU instructions to perform these tasks. (For example, on x86 and x64 processors, lock cmpxchg

is used, which atomically compares and exchanges the old lock with a new lock.) If the atomic compare

and exchange fails, the lock contains values the caller did not expect (callers usually expect the lock to

be unused or acquired as shared), and a call is then made to the more complex contended version.

To improve performance even further, the kernel exposes the pushlock functionality as inline functions, meaning that no function calls are ever generated during noncontended acquisition—the assembly code is directly inserted in each function. This increases code size slightly, but it avoids the slowness of a function call. Finally, pushlocks use several algorithmic tricks to avoid lock convoys (a situation that can occur when multiple threads of the same priority are all waiting on a lock and little

CHAPTER 8    System mechanisms      201


---

actual work gets done), and they are also self-optimizing: the list of threads waiting on a pushlock will be periodically rearranged to provide fairer behavior when the pushlock is released.

One more performance optimization that is applicable to pushlock acquisition (including for addressbased pushlocks) is the opportunistic spinlock-like behavior during contention, before performing the dispatcher object wait on the pushlock wait block's event. If the system has at least one other unparked processor (see Chapter 4 of Part 1 for more information on core parking), the kernel enters a tight spinbased loop for ExpSpinCycleCount cycles just like a spinlock would, but without raising the IRQL issuing a yield instruction (such as a pause on x86/6x4) for each iteration. If during any of the iterations, the pushlock now appears to be released, an interlocked operation to acquire the pushlock is performed.

If the spin cycle times out, or the interlocked operation failed (due to a race), or if the system does

not have at least one additional unparked processor, then KeWaitForSingleObject is used on the event

object in the pushlock wait block. ExpSpinCycleCount is set to 10240 cycles on any machine with more

than one logical processor and is not configurable. For systems with an AMD processor that imple ments the MWAITT (MWAIT Type) specification, the monitorx and mwaitx instructions are used

instead of a spin loop. This hardware-based feature enables waiting, at the CPU level, for the value at an

address to change without having to enter a loop, but they allow providing a timeout value so that the

wait is not indefinite (which the kernel supplies based on ExpSpinCycleCount).

On a final note, with the introduction of the AutoBoost feature (explained in Chapter 4 of Part 1),

pushlocks also leverage its capabilities by default, unless callers use the newer ExXxxPushLockXxxEx,

functions, which allow passing in the EX_PUSH_LOCK_FLAG_DISABLE_AUTOBOST flag that disables

the functionality (which is not officially documented). By default, the non-Ex functions now call the

newer Ex functions, but without supplying the flag.

## Address-based waits

Based on the lessons learned with keyed events, the key synchronization primitive that the Windows

kernel now exposes to user mode is the alert-by-ID system call (and its counterpart to wait-on-alert-byID). With these two simple system calls, which require no memory allocations or handles, any number

of process-local synchronizations can be built, which will include the addressed-based waiting mecha nism we're about to see, on top of which other primitives, such as critical sections and SRW locks, are

based upon.

Address-based waiting is based on three documented Win32 API calls: WaitOnAddress, WakeBy

AddressSingle, and WakeByAddressAll. These functions in KernelBase.dll are nothing more than for warders into NtDll.dll, where the real implementations are present under similar names beginning with

Rtl, standing for Run Time Library. The Wait API takes in an address pointing to a value of interest, the

size of the value (up to 8 bytes), and the address of the undesired value, plus a timeout. The Wake APIs

take in the address only.

First, RtlWaitOnAddress builds a local address wait block tracking the thread ID and address and

inserts it into a per-process hash table located in the Process Environment Block (PEB). This mir rors the work done by ExBlockOnAddressPushLock as we saw earlier, except that a hash table wasn't

needed because the caller had to store a push lock pointer somewhere. Next, just like the kernel API,

RtlWaitOnAddress checks whether the target address already has a value different than the undesirable

202      CHAPTER 8    System mechanisms


---

one and, if so, removes the address wait block, returning FALSE. Otherwise, it will call an internal func tion to block.

If there is more than one unparked processor available, the blocking function will first attempt to

avoid entering the kernel by spinning in user mode on the value of the address wait block bit indicating

availability, based on the value of RtlpWaitOnAddressSpinCount, which is hardcoded to 1024 as long as

the system has more than one processor. If the wait block still indicates contention, a system call is now

made to the kernel using NtWaitForAlertByThreadId, passing in the address as the hint parameter, as

well as the timeout.

If the function returns due to a timeout, a flag is set in the address wait block to indicate this, and the block is removed, with the function returning STATUS_TIMEOUT. However, there is a subtle race condition where the caller may have called the Wake function just a few cycles after the wait has timed out. Because the wait block flag is modified with a compare-exchange instruction, the code can detect this and actually calls NtWaitForAlertByThreadId a second time, this time without a timeout. This is guaranteed to return because the code knows that a wake is in progress. Note that in nontimeout cases, there's no need to remove the wait block, because the waker has already done so.

On the writer's side, both RtlWakeOnAddressSingle and RtlWakeOnAddressAll leverage the same helper function, which hashes the input address and looks it up in the PEB's hash table introduced earlier in this section. Carefully synchronizing with compare-exchange instructions, it removes the address wait block from the hash table, and, if committed to wake up any waiters, it iterates over all matching wait blocks for the same address, calling NtAlertThreadByThreadId for each of them, in the All usage of the API, or only the first one, in the Single version of the API.

With this implementation, we essentially now have a user-mode implementation of keyed events that does not rely on any kernel object or handle, not even a single global one, completely removing any failures in low-resource conditions. The only thing the kernel is responsible for is putting the thread in a wait state or waking up the thread from that wait state.

The next few sections cover various primitives that leverage this functionality to provide synchronization during contention.

## Critical sections

Critical sections are one of the main synchronization primitives that Windows provides to user-mode application developers on top of the kernel-based synchronization primitives. Critical sections and the other user-mode primitives you'll see later have one major advantage over their kernel counterparts, which is saving a round trip to kernel mode in cases in which the lock is noncontented (which is typically 99 percent of the time or more). Contended cases still require calling the kernel, however, because it is the only piece of the system that can perform the complex waking and dispatching logic required to make these objects work.

Critical sections can remain in user mode by using a local bit to provide the main exclusive locking

logic, much like a pushlock. If the bit is 0, the critical section can be acquired, and the owner sets the bit

to 1. This operation doesn't require calling the kernel but uses the interlocked CPU operations dis cussed earlier. Releasing the critical section behaves similarly, with bit state changing from 1 to 0 with

CHAPTER 8 System mechanisms 203


---

an interlocked operation. On the other hand, as you can probably guess, when the bit is already 1 and

another caller attempts to acquire the critical section, the kernel must be called to put the thread in a

wait state.

Akin to pushlocks and address-based waits, critical sections implement a further optimization to avoid entering the kernel: spinning, much like a spinlock (albeit at IRQ_0—Passive Level) on the lock bit, hoping it clears up quickly enough to avoid the blocking wait. By default, this is set to 2000 cycles, but it can be configured differently by using the InitializeCriticalSectionEx or InitializeCriticalSectionAndSpinCount API at creation time, or later, by calling SetCriticalSectionSpinCount.

![Figure](figures/Winternals7thPt2_page_235_figure_002.png)

Note As we discussed, because WaitForAddressSingle already implements a busy spin wait as an optimization, with a default 1024 cycles, technically there are 3024 cycles spent spinning by default—first on the critical sections' lock bit and then on the wait address block's lock bit, before actually entering the kernel.

When they do need to enter the true contention path, critical sections will, the first time they're called, attempt to initialize their LockSemaphore field. On modern versions of Windows, this is only done if RtlpForceCSToUseEvents is set, which is the case if the KACF_ALLOCDEBUGINFOORCRITSECTIONS (0x400000) flag is set through the Application Compatibility Database on the current process. If the flag is set, however, the underlying dispatcher event object will be created (even if the field refers to semaphore, the object is an event). Then, assuming that the event was created, a call to WaitForSingleObject is performed to block on the critical section (typically with a per-process configurable timeout value, to aid in the debugging of deadlocks, after which the wait is reattempted).

In cases where the application compatibility shim was not requested, or in extreme low-memory conditions where the shim was requested but the event could not be created, critical sections no longer use the event (nor any of the keyed event functionality described earlier). Instead, they directly leverage the address-based wait mechanism described earlier (also with the same deadlock detection timeout mechanism from the previous paragraph). The address of the local bit is supplied to the call to WaitOnAddress, and as soon as the critical section is released by LeaveCriticalSection, it either calls SetEvent on the event object or WakeAddressSingle on the local bit.

![Figure](figures/Winternals7thPt2_page_235_figure_006.png)

Note Even though we've been referring to APIs by their Win32 name, in reality, critical sections are implemented by Ntdll.dll, and KernelBase.dll merely forwards the functions to identical functions starting with Rtl instead, as they are part of the Run Time Library. Therefore, RtlLeaveCriticalSection calls NtSetEvent, RtlWakeAddressSingle, and so on.

Finally, because critical sections are not kernel objects, they have certain limitations. The primary

one is that you cannot obtain a kernel handle to a critical section; as such, no security, naming, or other

Object Manager functionality can be applied to a critical section. Two processes cannot use the same

critical section to coordinate their operations, nor can duplication or inheritance be used.

---

## User-mode resources

User-mode resources also provide more fine-grained locking mechanisms than kernel primitives. A resource can be acquired for shared mode or for exclusive mode, allowing it to function as a multiplereader (shared), single-writer (exclusive) lock for data structures such as databases. When a resource is acquired in shared mode and other threads attempt to acquire the same resource, no trip to the kernel is required because none of the threads will be waiting. Only when a thread attempts to acquire the resource for exclusive access, or the resource is already locked by an exclusive owner, is this required.

To make use of the same dispatching and synchronization mechanism you saw in the kernel, resources make use of existing kernel primitives. A resource data structure (RTL_RESOURCE) contains handles to two kernel semaphore objects. When the resource is acquired exclusively by more than one thread, the resource releases the exclusive semaphore with a single release count because it permits only one owner. When the resource is acquired in shared mode by more than one thread, the resource releases the shared semaphore with as many release counts as the number of shared owners. This level of detail is typically hidden from the programmer, and these internal objects should never be used directly.

Resources were originally implemented to support the SAM (or Security Account Manager, which is

discussed in Chapter 7 of Part 1) and not exposed through the Windows API for standard applications.

Slim Reader-Writer Locks (SRW Locks), described shortly, were later implemented to expose a similar

but highly optimized locking primitive through a documented API, although some system components

still use the resource mechanism.

## Condition variables

Condition variables provide a Windows native implementation for synchronizing a set of threads that are waiting on a specific result to a conditional test. Although this operation was possible with other user-mode synchronization methods, there was no atomic mechanism to check the result of the conditional test and to begin waiting on a change in the result. This required that additional synchronization be used around such pieces of code.

A user-mode thread initializes a condition variable by calling InitializeConditionVariable to set up the initial state. When it wants to initiate a wait on the variable, it can call SleepConditionVariableCS, which uses a critical section (that the thread must have initialized) to wait for changes to the variable, or, even better, SleepConditionVariableSRW, which instead uses a Slim Reader/Writer (SRW) lock, which we describe next, giving the caller the advantage to do a shared (reader) of exclusive (writer) acquisition.

Meanwhile, the setting thread must use WakeConditionVariable (or WakeAllConditionVariable) after

it has modified the variable. This call releases the critical section or SRW lock of either one or all waiting

threads, depending on which function was used. If this sounds like address-based waiting, it's because

it is—with the additional guarantee of the atomic compare-and-wait operation. Additionally, condition

variables were implemented before address-based waiting (and thus, before alert-by-ID) and had to

rely on keyed events instead, which were only a close approximation of the desired behavior.

Before condition variables, it was common to use either a notification event or a synchronization event (recall that these are referred to as auto-reset or manual-reset in the Windows API) to signal the

---

change to a variable, such as the state of a worker queue. Waiting for a change required a critical section to be acquired and then released, followed by a wait on an event. After the wait, the critical section had to be reacquired. During this series of acquisitions and releases, the thread might have switched contexts, causing problems if one of the threads called PulseEvent (a similar problem to the one that keyed events solve by forcing a wait for the signaling thread if there is no waiter). With condition variables, acquisition of the critical section or SRW lock can be maintained by the application while SleepConditionVariableCS/SRW is called and can be released only after the actual work is done. This makes writing work-queue code (and similar implementations) much simpler and predictable.

With both SRW locks and critical sections moving to the address-based wait primitives, however, conditional variables can now directly leverage NtWaitForAlertByThreadID and directly signal the thread, while building a conditional variable wait block that's structurally similar to the address wait block we described earlier. The need for keyed events is thus completely elided, and they remain only for backward compatibility.

## Slim Reader/Writer (SRW) locks

Although condition variables are a synchronization mechanism, they are not fully primitive locks because they do implicit value comparisons around their locking behavior and rely on higherlevel abstractions to be provided (namely, a lock!). Meanwhile, address-based waiting is a primitive operation, but it provides only the basic synchronization primitive, not true locking. In between these two worlds, Windows has a true locking primitive, which is nearly identical to a pushlock: the Slim Reader/Writer lock (SRW lock).

Like their kernel counterparts, SRW locks are also pointer sized, use atomic operations for acquisition and release, rearrange their waiter lists, protect against lock convoys, and can be acquired both in shared and exclusive mode. Just like pushlocks, SRW locks can be upgraded, or converted, from shared to exclusive and vice versa, and they have the same restrictions around recursive acquisition. The only real difference is that SRW locks are exclusive to user-mode code, whereas pushlocks are exclusive to kernel-mode code, and the two cannot be shared or exposed from one layer to the other. Because SRW locks also use the NTWaitForAlertByThreadId primitive, they require no memory allocation and are guaranteed never to fail (other than through incorrect usage).

Not only can SRW locks entirely replace critical sections in application code, which reduces the need to allocate the large CRITICAL_SECTION structure (and which previously required the creation of an event object), but they also offer multiple-reader, single-writer functionality. SRW locks must first be initialized with InitializeSRWLock or can be statically initialized with a sentinel value, after which they can be acquired or released in either exclusive or shared mode with the appropriate APIs: AcquireSRWLockExclusive, ReleaseSRWLockExclusive, AcquireSRWLockShared, and ReleaseSRWLockShared. APIs also exist for opportunistically trying to acquire the lock, guaranteeing that no blocking operation will occur, as well as converting the lock from one mode to another.

---

![Figure](figures/Winternals7thPt2_page_238_figure_000.png)

Note Unlike most other Windows APIs, the SRW locking functions do not return with a value—instead, they generate exceptions if the lock could not be acquired. This makes it obvious that an acquisition has failed so that code that assumes success will terminate instead of potentially proceeding to corrupt user data. Since SRW locks do not fail due to resource exhaustion, the only such exception possible is STATUS_RESOURCE_NOT_OWNED in the case that a nonshared SRW lock is incorrectly being released in shared mode.

The Windows SRW locks do not prefer readers or writers, meaning that the performance for either case should be the same. This makes them great replacements for critical sections, which are writteronly or exclusive synchronization mechanisms, and they provide an optimized alternative to resources. If SRW locks were optimized for readers, they would be poor exclusive-only locks, but this isn't the case. This is why we earlier mentioned that conditional variables can also use SRW locks through the SleepConditionVariableSRW API. That being said, since keyed events are no longer used in one mechanism (SRW) but are still used in the other (CS), address-based waiting has muted most benefits other than code size—and the ability to have shared versus exclusive locking. Nevertheless, code targeting older versions of Windows should use SRW locks to guarantee the increased benefits are there on kernels that still used keyed events.

## Run once initialization

The ability to guarantee the atomic execution of a piece of code responsible for performing some sort of initialization task—such as allocating memory, initializing certain variables, or even creating objects on demand—is a typical problem in multithreaded programming. In a piece of code that can be called simultaneously by multiple threads (a good example is the DllMain routine, which initializes a DLL), there are several ways of attempting to ensure the correct, atomic, and unique execution of initialization tasks.

For this scenario, Windows implements init once, or one-time initialization (also called run once initialization internally). The API exists both as a Win32 variant, which calls into Ntdll.dll's Run Time Library (Rtl) as all the other previously seen mechanisms do, as well as the documented Rtl set of APIs, which are exposed to kernel programmers in Ntoskrnl.exe instead (obviously, user-mode developers could bypass Win32 and use the Rtl functions in Ntdll.dll too, but that is never recommended). The only difference between the two implementations is that the kernel ends up using an event object for synchronization, whereas user mode uses a keyed event instead (in fact, it passes in a NULL handle to use the low-memory keyed event that was previously used by critical sections).

![Figure](figures/Winternals7thPt2_page_238_figure_006.png)

Note Since recent versions of Windows now implement an address-based pushlock in kernel mode, as well as the address-based wait primitive in user mode, the Rtl library could probably be updated to use RtlWakeAddressSingle and ExBlockOnAddressPushLock, and in fact a future version of Windows could always do that—the keyed event merely provided a more similar interface to a dispatcher event object in older Windows versions. As always, do not rely on the internal details presented in this book, as they are subject to change.

---

The init once mechanism allows for both synchronous (meaning that the other threads must wait for initialization to complete) execution of a certain piece of code, as well as asynchronous (meaning that the other threads can attempt to do their own initialization and race) execution. We look at the logic behind asynchronous execution after explaining the synchronous mechanism.

In the synchronous case, the developer writes the piece of code that would normally execute after double-checking the global variable in a dedicated function. Any information that this routine needs can be passed through the parameter variable that the init once routine accepts. Any output information is returned through the context variable. (The status of the initialization itself is returned as a Boolean.) All the developer has to do to ensure proper execution is call InitOnceExecuteOnce with the parameter, context, and run-once function pointer after initializing an INIT_ONCE object with InitOnceInitialize API. The system takes care of the rest.

For applications that want to use the asynchronous model instead, the threads call InitOnceBeginInitialize and receive a BOOLEAN pending status and the context described earlier. If the pending status is FALSE, initialization has already taken place, and the thread uses the context value for the result. (It's also possible for the function to return FALSE, meaning that initialization failed.) However, if the pending status comes back as TRUE, the thread should race to be the first to create the object. The code that follows performs whatever initialization tasks are required, such as creating objects or allocating memory. When this work is done, the thread calls InitOnceComplete with the result of the work as the context and receives a BOOLEAN status. If the status is TRUE, the thread won the race, and the object that it created or allocated is the one that will be the global object. The thread can now save this object or return it to a caller, depending on the usage.

In the more complex scenario when the status is FALSE, this means that the thread lost the race. The thread must undo all the work it did, such as deleting objects or freeing memory, and then call InitOnceBeginInitialize again. However, instead of requesting to start a race as it did initially, it uses the INIT_ONCE_CHECK_ONLY flag, knowing that it has lost, and requests the winner's context instead (for example, the objects or memory that were created or allocated by the winner). This returns another status, which can be TRUE, meaning that the context is valid and should be used or returned to the caller, or FALSE, meaning that initialization failed and nobody has been able to perform the work (such as in the case of a low-memory condition, perhaps).

In both cases, the mechanism for run-once initialization is similar to the mechanism for condition

variables and SRW locks. The init once structure is pointer-size, and inline assembly versions of the SRW

acquisition/release code are used for the noncontended case, whereas keyed events are used when

contention has occurred (which happens when the mechanism is used in synchronous mode) and the

other threads must wait for initialization. In the asynchronous case, the locks are used in shared mode,

so multiple threads can perform initialization at the same time. Although not as highly efficient as the

alert-by-ID primitive, the usage of a keyed event still guarantees that the init once mechanism will func tion even in most cases of memory exhaustion.

---

