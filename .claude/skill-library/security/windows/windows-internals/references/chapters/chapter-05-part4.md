## Working sets

Now that you've looked at how Windows keeps track of physical memory and how much memory it can support, we'll explain how Windows keeps subset of virtual addresses in physical memory.

As you'll recall, a subset of virtual pages resident in physical memory is called a working set. There are three kinds of working sets:

- ■ Process working sets These contain the pages referenced by threads within a single process.

■ System working sets These contain the resident subset of the pageable system code (for

example, Ntoskrnl.exe and drivers), paged pool, and the system cache.

■ Session’s working set Each session has a working set that contains the resident subset of the

kernel-mode session-specific data structures allocated by the kernel-mode part of the Windows

subsystem (Win32k.sys), session paged pool, session mapped views, and other session-space

device drivers.
412   CHAPTER 5   Memory management


---

Before examining the details of each type of working set, let's look at the overall policy for deciding which pages are brought into physical memory and how long they remain.

## Demand paging

The Windows memory manager uses a demand-paging algorithm with clustering to load pages into memory. When a thread receives a page fault, the memory manager loads into memory the faulted page plus a small number of pages preceding and/or following it. This strategy attempts to minimize the number of paging I/Os a thread will incur. Because programs—especially large ones—tend to execute in small regions of their address space at any given time, loading clusters of virtual pages reduces the number of disk reads. For page faults that reference data pages in images, the cluster size is three pages. For all other page faults, the cluster size is seven pages.

However, a demand-paging policy can result in a process incurring many page faults when its

threads first begin executing or when they resume execution at a later point. To optimize the startup of

a process (and the system), Windows has an intelligent prefetch engine called the logical prefetcher, de scribed in the next section. Further optimization and prefetching is performed by another component,

called SuperFetch, described later in the chapter.

## Logical prefetcher and ReadyBoot

During a typical system boot or application startup, the order of faults is such that some pages are brought in from one part of a file, then perhaps from a distant part of the same file, then from a different file, then perhaps from a directory, and then again from the first file. This jumping around slows down each access considerably. Indeed, analysis shows that disk seek times are a dominant factor in slowing boot and application startup times. By prefetching batches of pages all at once, you can achieve a more sensible ordering of access without excessive backtracking, thus improving the overall time for system and application startup. The pages that are needed can be known in advance because of the high correlation in accesses across boots or application starts.

The prefetcher tries to speed the boot process and application startup by monitoring the data

and code accessed by boot and application startups and using that information at the beginning of

a subsequent boot or application startup to read in the code and data. When the prefetcher is active,

the memory manager notifies the prefetcher code in the kernel of page faults--those that require that

data be read from disk (hard faults) and those that simply require data already in memory to be added

to a process's working set (soft faults). The prefetcher monitors the first 10 seconds of application

startup. For boot, the prefetcher by default traces from system start through the 30 seconds following

the start of the user's shell (typically Explorer) or, failing that, through 60 seconds following Windows

service initialization or through 120 seconds, whichever comes first.

The trace assembled in the kernel notes faults taken on the NTFS master file table (MFT) metadata file (if the application accesses files or directories on NTFS volumes), referenced files, and referenced directories. With the trace assembled, the kernel prefetcher code waits for requests from the prefetcher component of the SuperFetch service (%SystemRoot%\System32\Sysmain.dll), running in an instance of XsVshot. The SuperFetch service is responsible for both the logical prefetching component in the kernel

CHAPTER 5     Memory management      413


---

and the SuperFetch component that we'll talk about later. The prefetcher signals the \KernelIoObjects\ PrefetchFacesReady event to inform the SuperFetch service that it can now query trace data.

![Figure](figures/Winternals7thPt1_page_431_figure_001.png)

Note You can enable or disable prefetching of the boot or application startups by editing the DWORD registry value EnablePrefetcher in the HKLM\SYSTEM\CurrentControlSet\ Control\Session Manager\Memory Management\PrefetchParameters key. Set it to 0 to disable prefetching altogether, 1 to enable prefetching of only applications, 2 for prefetching of boot only, and 3 for both boot and applications.

The SuperFetch service (which hosts the logical prefetcher, although it is a completely separate component from the actual SuperFetch functionality) performs a call to the internal NtQuerySystemInformation system call requesting the trace data. The logical prefetcher post-processes the trace data, combining it with previously collected data, and writes it to a file in the %SystemRoot%\Prefetch folder. (See Figure 5-33.) The file's name is the name of the application to which the trace applies followed by a dash and the hexadecimal representation of a hash of the file's path. The file has a .pf extension. An example would be NOTEPAD-9FB27C0E.PF.

![Figure](figures/Winternals7thPt1_page_431_figure_004.png)

FIGURE 5-33 Prefetch folder.

There is an exception to the file name rule for images that host other components, including the Microsoft Management Console (%SystemRoot%\System32\Mcmc.exe), the service hosting process (%SystemRoot%\System32\Svcost.exe), the RunDLL component (%SystemRoot%\System32\Rundll32.exe), and Dllhost (%SystemRoot%\System32\Dllhost.exe). Because add-on components are specified on the command line for these applications, the prefetcher includes the command line in the generated hash.

414   CHAPTER 5   Memory management


---

Thus, invocations of these applications with different components on the command line will result in different traces.

For a system boot, a different mechanism is used, called ReadyBoot. ReadyBoot tries to optimize I/O

operations by creating large and efficient I/O reads and storing the data in RAM. When system compo nents require the data, it's serviced through the stored RAM. This especially benefits mechanical disks,

but can be also useful for SSDs. Information on the files to prefetch is stored after boot in the ReadyBoot

subdirectory of the Prefetch directory shown in Figure 5-33. Once boot is complete, the cached data in

RAM is deleted. For very fast SSDs, ReadyBoot is off by default because its gains are marginal, if any.

When the system boots or an application starts, the prefetcher is called to give it an opportunity to prefetch. The prefetcher looks in the prefetch directory to see if a trace file exists for the prefetch scenario in question. If it does, the prefetcher calls NTFS to prefetch any MFT metadata file references, reads in the contents of each of the directories referenced, and finally opens each file referenced. It then calls the memory manager function MmPrefetchPages to read in any data and code specified in the trace that's not already in memory. The memory manager initiates all the reads asynchronously and then waits for them to complete before letting an application's startup continue.

## EXPERIMENT: Watching prefetch file reads and writes

If you capture a trace of application startup with Process Monitor from Sysinternals on a client edition of Windows (Windows Server editions disable prefetching by default), you can see the prefetcher check for and read the application's prefetch file (if it exists). In addition, you can see the prefetcher write out a new copy of the file roughly 10 seconds after the application starts. Here is a capture of Notepad startup with an Include filter set to prefetch so that Process Monitor shows only accesses to the %SystemRoot%\Prefetch directory:

![Figure](figures/Winternals7thPt1_page_432_figure_005.png)

CHAPTER 5     Memory management      415


---

Lines 0-3 show the Notepad prefetch file being read in the context of the Notepad process during its startup. Lines 7–19 (which have time stamps 10 seconds later than the first four lines) show the SuperRefresh service—running in the context of a Svchost process—writing out the updated prefetch file.

To minimize seeking even further, every three days or so, during system idle periods, the SuperFetch

service organizes a list of files and directories in the order that they are referenced during a boot or

application start and stores it in a file named %SystemRoot%\Prefetch\Layout.ini (see Figure 5-34).

This list also includes frequently accessed files tracked by SuperFetch.

![Figure](figures/Winternals7thPt1_page_433_figure_002.png)

FIGURE 5-34 Prefetch defragmentation layout file.

It then launches the system defragmenter with a command-line option that tells the defragmenter to defragment based on the contents of the file instead of performing a full defrag. The defragmenter finds a contiguous area on each volume large enough to hold all the listed files and directories that reside on that volume and then moves them in their entirety into that area so that they are stored one after the other. Thus, future prefetch operations will even be more efficient because all the data read in is now stored physically on the disk in the order it will be read. Because the files defragmented for prefetching usually number only in the hundreds, this defragmentation is much faster than full-volume defragmentations.

## Placement policy

When a thread receives a page fault, the memory manager must determine where in physical memory

to put the virtual page. The set of rules it uses to determine the best position is called a placement

policy. Windows considers the size of CPU memory caches when choosing page frames to minimize

unnecessary thrashing of the cache.

416    CHAPTER 5   Memory management


---

If physical memory is full when a page fault occurs, Windows uses a replacement policy to determine which virtual page must be removed from memory to make room for the new page. Common replacement policies include least recently used (LRU) and first in, first out (FIFO). The LRU algorithm (also known as the clock algorithm, as implemented in most versions of UNIX) requires the virtual memory system to track when a page in memory is used. When a new page frame is required, the page that hasn't been used for the greatest amount of time is removed from the working set. The FIFO algorithm is somewhat simpler: It removes the page that has been in physical memory for the greatest amount of time, regardless of how often it's been used.

Replacement policies can be further characterized as either global or local. A global replacement

policy allows a page fault to be satisfied by any page frame, regardless of whether that frame is owned

by another process. For example, a global replacement policy using the FIFO algorithm would locate

the page that has been in memory the longest and would free it to satisfy a page fault. A local replace ment policy would limit its search for the oldest page to the set of pages already owned by the process

that incurred the page fault. Be aware that global replacement policies make processes vulnerable to

the behavior of other processes. For example, an ill-behaved application can undermine the entire

operating system by inducing excessive paging activity in all processes.

Windows implements a combination of local and global replacement policies. When a working set reaches its limit and/or needs to be trimmed because of demands for physical memory, the memory manager removes pages from working sets until it has determined there are enough free pages.

## Working set management

Every process starts with a default working set minimum of 50 pages and a working set maximum of 345 pages. Although it has little effect, you can change these working set limits with the Windows SetProcessWorkingSetSize function, although you must have the increase scheduling priority (SeIncreaseBasePriorityPrivilege) privilege to do this. However, unless you have configured the process to use hard working set limits, these limits are ignored. That is, the memory manager will permit a process to grow beyond its maximum if it is paging heavily and there is ample memory. (Conversely the memory manager will shrink a process below its working set minimum if it is not paging and there is a high demand for physical memory on the system.) You can set hard working set limits using the SetProcessWorkingSetSizeX function along with the QUINTA_LIMITS_HARDWS_MAX_ENABLE flag, but it is almost always better to let the system manage your working set.

On 32 bit systems, the maximum working set size can't exceed the system-wide maximum calcu lated at system initialization time, stored in the M1MaximumWorkingSet kernel variable. On x64 systems,

physical memory would be the practical upper limit, as the virtual address space is so vast. The working

set maximums are listed in Table 5-15.

TABLE 5-15 Upper limit for working set maximums

<table><tr><td>Windows Version</td><td>Working Set Maximum</td></tr><tr><td>x86, ARM</td><td>2 GB—64 KB (0x7FF0000)</td></tr><tr><td>x86 versions of Windows booted with increaseuserva</td><td>2 GB—64 KB + user virtual address increase</td></tr><tr><td>x64 (Windows 8, Server 2012)</td><td>8,192 GB (8 TB)</td></tr><tr><td>X64 (Windows 8.1, 10, Server 2012 R2, 2016)</td><td>128 TB</td></tr></table>


CHAPTER 5     Memory management     417


---

When a page fault occurs, the process's working set limits and the amount of free memory on the system are examined. If conditions permit, the memory manager allows a process to grow to its working set maximum (or beyond if the process does not have a hard working set limit and there are enough free pages available). However, if memory is tight, Windows replaces rather than adds pages in a working set when a fault occurs.

Windows attempts to keep memory available by writing modified pages to disk. Still, when modified pages are being generated at a very high rate, more memory is required to meet memory demands. Therefore, when physical memory runs low, the working set manager, a routine that runs in the context of the balance set manager system thread (described in the next section), initiates automatic working set trimming to increase the amount of free memory available in the system. You can also initiate working set trimming of your own process—for example, after process initialization—with the aforementioned Windows SetProcessWorkingSetSizeEx function.

The working set manager examines available memory and decides which, if any, working sets need

to be trimmed. If there is ample memory, the working set manager calculates how many pages could

be removed from working sets if needed. If trimming is needed, it looks at working sets that are above

their minimum setting. It also dynamically adjusts the rate at which it examines working sets and

arranges the list of processes that are candidates to be trimmed into an optimal order. For example,

processes with many pages that have not been accessed recently are examined first; larger processes

that have been idle longer are considered before smaller processes that are running more often; the

process running the foreground application is considered last; and so on.

When the working set manager finds processes that are using more than their minimums, it looks

for pages to remove from the working sets, making the pages available for other uses. If the amount of

free memory is still too low, the working set manager continues removing pages from processes' work ing sets until it achieves a minimum number of free pages on the system.

The working set manager tries to remove pages that haven't been accessed recently by checking the accessed bit in the hardware PTE to see whether a page has been accessed. If the bit is clear, the page is said to be aged. That is, a count is incremented indicating that the page hasn't been referenced since the last working set trim scan. Later, the age of pages is used to locate candidate pages to remove from the working set.

If the hardware PTE accessed bit is set, the working set manager clears it and goes on to examine the next page in the working set. In this way, if the accessed bit is clear the next time the working set manager examines the page, it knows that the page hasn't been accessed since the last time it was examined. This scan for pages to remove continues through the working set list until either the number of desired pages has been removed or the scan has returned to the starting point. The next time the working set is trimmed, the scan picks up where it left off last.

## EXPERIMENT: Viewing process working set sizes

You can use Performance Monitor to examine process working set sizes by looking at the perfor mance counters shown in the following table. Several other process viewer utilities (such as Task

Manager and Process Explorer) also display the process working set size.

---

<table><tr><td>Counter</td><td>Description</td></tr><tr><td>Process: Working Set</td><td>This notes the current size of the selected process&#x27;s working set in bytes.</td></tr><tr><td>Process: Working Set Peak</td><td>This tracks the peak size of the selected process&#x27;s working set in bytes.</td></tr><tr><td>Process: Page Faults/Sec</td><td>This indicates the number of page faults for the process that occur each second.</td></tr></table>


You can also get the total of all the process working sets by selecting the _Total process in

the instance box in Performance Monitor. This process isn't real; it's simply a total of the process specific counters for all processes currently running on the system. The total you see is larger

than the actual RAM being used, however, because the size of each process working set includes

pages being shared by other processes. Thus, if two or more processes share a page, the page is

counted in each process's working set.

## EXPERIMENT: Working set versus virtual size

Earlier in this chapter, you used the TestLimit utility to create two processes: one with a large amount of memory that was merely reserved, and one in which the memory was private committed. You then examined the difference between them with Process Explorer. Now we will create a third TestLimit process—one that not only commits the memory but also accesses it, thus bringing it into its working set. Follow these steps:

1. Create a new TestLimit process.

```bash
C:\Users\pavelytest\limits -d 1 -c 800
Testlimit v5.24 - test Windows limits
Copyright (C) 2012-2015 Mark Russinovich
Sysinternals - www.sysinternals.com
Process ID: 13008
Leaking private bytes with touch 1 MB at a time...
Leaked 800 MB of private memory (800 MB total leaked). Lasterror: 0
The operation completed successfully.
```

2. Open Process Explorer.

3. Open the View menu, choose Select Columns, and click the Process Memory tab.

4. Enable the Private Bytes, Virtual Size, Working Set Size, WS Shareable Bytes, and

WS Private Bytes counters.

5. Find the three instances of TestLimit, as shown in the display:

CHAPTER 5   Memory management      419


---

![Figure](figures/Winternals7thPt1_page_437_figure_000.png)

The new TestLimit process is the third one shown, PID 13008. It is the only one of the three that

actually referenced the memory allocated, so it is the only one with a working set that reflects

the size of the test allocation.

Note that this result is possible only on a system with enough RAM to allow the process to

grow to such a size. Even on this system, not quite all of the private bytes (821,888 K) are in the

WS Private portion of the working set. A small number of the private pages have been pushed

out of the process working set due to replacement or have not been paged in yet.

## EXPERIMENT: Viewing the working set list in the debugger

You can view the individual entries in the working set by using the kernel debugger !w31e command.


The following example shows a partial output of the working set of WinDnq (32-bit system):


1

```bash
tkds !wsle 7
Working Set Instance @ c0802d50
Working Set Shared @ c0802e30
    FirstFree     f7d    FirstDynamic      6
    LastEntry    203d    NextSlot        6    LastInitialized    2063
    NonDirect     0    HashTable        0    HashTableSize      0
Reading the WSLE data ...................................................
.........
Virtual Address        Age    Locked   ReferenceCount
        c0603009       0    0    1
        c0602009       0    0    1
        c0601009       0    0    1
        c0600009       0    0    1
        c0802d59       6    0    1
        c0604019       0    0    1
        c0800409       2    0    1
        c0006209       1    0    1
        77290a05       5    0    1
        7739aa05       5    0    1
        c0014209       1    0    1
CHAPTER 5  Memory management
From the Librar
```

---

<table><tr><td>c0004209</td><td>1</td><td>0</td><td>1</td></tr><tr><td>72a37805</td><td>4</td><td>0</td><td>1</td></tr><tr><td>b50409</td><td>2</td><td>0</td><td>1</td></tr><tr><td>b52809</td><td>4</td><td>0</td><td>1</td></tr><tr><td>7731dc05</td><td>6</td><td>0</td><td>1</td></tr><tr><td>bbec09</td><td>6</td><td>0</td><td>1</td></tr><tr><td>bbfc09</td><td>6</td><td>0</td><td>1</td></tr><tr><td>6c801805</td><td>4</td><td>0</td><td>1</td></tr><tr><td>772a1405</td><td>2</td><td>0</td><td>1</td></tr><tr><td>944209</td><td>1</td><td>0</td><td>1</td></tr><tr><td>77316a05</td><td>5</td><td>0</td><td>1</td></tr><tr><td>773a4209</td><td>1</td><td>0</td><td>1</td></tr><tr><td>77317405</td><td>2</td><td>0</td><td>1</td></tr><tr><td>772d6605</td><td>3</td><td>0</td><td>1</td></tr><tr><td>a71409</td><td>2</td><td>0</td><td>1</td></tr><tr><td>c1d409</td><td>2</td><td>0</td><td>1</td></tr><tr><td>772d4a05</td><td>5</td><td>0</td><td>1</td></tr><tr><td>77342c05</td><td>6</td><td>0</td><td>1</td></tr><tr><td>6c80f605</td><td>3</td><td>0</td><td>1</td></tr><tr><td>77320405</td><td>2</td><td>0</td><td>1</td></tr><tr><td>77323205</td><td>1</td><td>0</td><td>1</td></tr><tr><td>77321405</td><td>2</td><td>0</td><td>1</td></tr><tr><td>7fffe0215</td><td>1</td><td>0</td><td>1</td></tr><tr><td>a5fc09</td><td>6</td><td>0</td><td>1</td></tr><tr><td>7735cc05</td><td>6</td><td>0</td><td>1</td></tr><tr><td>...</td><td></td><td></td><td></td></tr></table>


Notice that some entries in the working set list are page table pages (the ones with addresses

greater than 0xC0000000), some are from system DLLs (the ones in the 0x7nnnnnnn range), and

some are from the code of Windbg.exe itself.

## Balance set manager and swapper

Working set expansion and trimming take place in the context of a system thread called the balance set

manager (Kebal onceSetManager function). The balance set manager is created during system initial ization. Although the balance set manager is technically part of the kernel, it calls the memory man ger's working set manager (MMWorkingSetManager) to perform working set analysis and adjustment.

The balance set manager waits for two different event objects: an event that is signaled when a

periodic timer set to fire once per second expires and an internal working set manager event that the

memory manager signals at various points when it determines that working sets need to be adjusted.

For example, if the system is experiencing a high page fault rate or the free list is too small, the memory

manager wakes up the balance set manager so that it will call the working set manager to begin trim ming working sets. When memory is more plentiful, the working set manager permits faulting process es to gradually increase the size of their working sets by faulting pages back into memory. However, the

working sets will grow only as needed.

CHAPTER 5     Memory management      421


---

When the balance set manager wakes up because its 1-second timer has expired, it takes the following steps:

- 1. If the system supports Virtual Secure Mode (VSM, Windows 10 and Server 2016), then the
secure kernel is called to do its periodic housekeeping (Vs1SecureKernelPeriodicTick).

2. Calls a routine to adjust IRP credits to optimize the usage of the per-processor look-aside lists
used in IRP completion (IoAdjustIrpCredits). This allows better scalability when certain
processors are under heavy I/O load. (See Chapter 6 for more on IRPs.)

3. Checks the look-aside lists and adjusts their depths (if necessary) to improve access time and
reduce pool usage and pool fragmentation (ExAdjustLookasideDepth).

4. Calls to adjust the Event Tracing for Windows (ETW) buffer pool size to use ETW memory buf-
fers more efficiently (EtwAdjustTraceBuffers). (For more on ETW, see Chapter 8 in Part 2.)

5. Calls the memory manager's working set manager. The working set manager has its own inter-
nal counters that regulate when to perform working set trimming and how aggressively to trim.

6. Enforces execution time for jobs (PsEnforceExecutionLimits).

7. Every eighth time the balance set manager wakes up because its 1-second timer has expired,
it signals an event that wakes up another system thread called the wrapper (KeSwapProcess-
OrStack). It attempts to outswap kernel stacks for threads that have not executed for a long
time. The wrapper thread (which runs at priority 23) looks for threads that have been in a user
mode wait state for 15 seconds. If it finds one, it puts the thread's kernel stack in transition
(moving the pages to the modified or standby lists) to reclaim its physical memory, operating
on the principle that if a thread has been waiting that long, it's going to be waiting even longer.
When the last thread in a process has its kernel stack removed from memory, the process is
marked to be entirely outswapped. That's why, for example, processes that have been idle for a
long time (such as Wininit or Winlogon) can have a working set size of zero.
## System working sets

Just as processes have working sets that manage pageable portions of the process address space, the

pageable code and data in the system address space is managed using three global working sets, collectively known as the system working sets. These global working sets are as follows:

- ■ System cache working set This contains pages that are resident in the system cache.

■ Paged pool working set This contains pages that are resident in the paged pool.

■ System PTEs working set This contains pageable code and data from loaded drivers and the

kernel image and pages from sections that have been mapped into the system space.
Table 5-16 shows where these system working set types are stored.

---

TABLE 5-16   System working sets

<table><tr><td>System Working Set Type</td><td>Stored in (Windows 8.x, Server 2012/R2)</td><td>Stored in (Windows 10, Server 2016)</td></tr><tr><td>System cache</td><td>MmSystemCacheWS</td><td>MiState.SystemVa.SystemWs[0]</td></tr><tr><td>Paged pool</td><td>MmPagedPoolWS</td><td>MiState.SystemVa.SystemWs[2]</td></tr><tr><td>System PTEs</td><td>MmSystemPtesWS</td><td>MiState.SystemVa.SystemWs[1]</td></tr></table>


You can examine the sizes of these working sets or the sizes of the components that contribute to

them with the performance counters or system variables shown in Table 5-17. (Note that the perfor mance counter values are in bytes, whereas the system variables are measured in pages.)

TABLE 5-17 System working set performance counters

<table><tr><td>Performance Counter (in Bytes)</td><td>System Variable (in Pages)</td><td>Description</td></tr><tr><td>Memory: Cache Bytes Memory: System Cache Resident Bytes</td><td>WorkingSetSize member</td><td>This is the physical memory consumed by the file system cache.</td></tr><tr><td>Memory: Cache Bytes Peak</td><td>PeakWorkingSetSize member (Windows 10 and 2016) Peak member (Windows 8.x and 2012/R2)</td><td>This is the peak system working set size.</td></tr><tr><td>Memory: System Driver Resident Bytes</td><td>SystemPageCounts: SystemDriverPage (global, Windows 10 and Server 2016) MeSystemDriverPage (global, Windows 8.x and Server 2012/R2)</td><td>This is the physical memory consumed by pageable device driver code.</td></tr><tr><td>Memory: Pool Paged Resident Bytes</td><td>WorkingSetSize member</td><td>This is the physical memory consumed by paged pool.</td></tr></table>


You can also examine the paging activity in the system cache working set by examining the Memory Cache Faults/Sec performance counter. This counter describes page faults that occur in the system cache working set (both hard and soft). The PageFaultCount member in the system cache working set structure contains the value for this counter.

## Memory notification events

Windows provides a way for user-mode processes and kernel-mode drivers to be notified when physical memory, paged pool, non-paged pool, and commit charge are low and/or plentiful. This informaction can be used to determine memory usage as appropriate. For example, if available memory is low, the application can reduce memory consumption. If available paged pool is high, the driver can allocate more memory. Finally, the memory manager also provides an event that permits notification when corrupted pages have been detected.

User-mode processes can be notified only of low or high memory conditions. An application can call the CreateMemoryResourceNotification function, specifying whether low or high memory notification is desired. The returned handle can be provided to any of the wait functions. When memory is low (or high), the wait completes, thus notifying the thread of the condition. Alternatively, the QueryMemoryResourceNotification can be used to query the system memory condition at any time without blocking the calling thread.

CHAPTER 5     Memory management      423


---

Drivers, on the other hand, use the specific event name that the memory manager has set up in the \ KernelObjects object manager directory. This is because notification is implemented by the memory manager signaling one of the globally named event objects it defines, shown in Table 5-18. When a given memory condition is detected, the appropriate event is signaled, thus waking up any waiting threads.

TABLE 5-18  Memory manager notification events

<table><tr><td>Event Name</td><td>Description</td></tr><tr><td>HighCommitCondition</td><td>This event is set when the commit charge is near the maximum commit limit—in other words, memory usage is very high, very little space is available in physical memory or paging files, and the operating system cannot increase the size of its paging files.</td></tr><tr><td>HighMemoryCondition</td><td>This event is set whenever the amount of free physical memory exceeds the defined amount.</td></tr><tr><td>HighNonPagedPoolCondition</td><td>This event is set whenever the amount of non-paged pool exceeds the defined amount.</td></tr><tr><td>HighPagedPoolCondition</td><td>This event is set whenever the amount of paged pool exceeds the defined amount.</td></tr><tr><td>LowCommitCondition</td><td>This event is set when the commit charge is low relative to the current commit limit—in other words, memory usage is low and a lot of space is available in physical memory or paging files.</td></tr><tr><td>LowMemoryCondition</td><td>This event is set whenever the amount of free physical memory falls below the defined amount.</td></tr><tr><td>LowNonPagedPoolCondition</td><td>This event is set whenever the amount of free non-paged pool falls below the defined amount.</td></tr><tr><td>LowPagedPoolCondition</td><td>This event is set whenever the amount of free paged pool falls below the defined amount.</td></tr><tr><td>MaximumCommitCondition</td><td>This event is set when the commit charge is near the maximum commit limit—in other words, memory usage is very high, very little space is available in physical memory or paging files, and the operating system cannot increase the size or number of paging files.</td></tr><tr><td>MemoryErrors</td><td>This indicates that a bad page (non-zeroed zero page) has been detected.</td></tr></table>


![Figure](figures/Winternals7thPt1_page_441_figure_003.png)

Note You can override the high and low memory values by adding the LowMemoryThreshold or HighMemoryThreshold DWORD registry value under HKLM\SYSTEM\CurrentControlSet\ Control\SessionManager\Memory Management. This specifies the number of megabytes to use as the low or high threshold. You can also configure the system to crash when a bad page is detected instead of signaling a memory error event by setting the PageValidationAction DWORD registry value in the same key to 1.

## EXPERIMENT: Viewing the memory resource notification events

To see the memory resource notification events, run WinObj from Sysinternals and click the

KernelObjects folder. You will see both the low and high memory condition events shown in the

pane on the right:

424   CHAPTER 5   Memory management


---

![Figure](figures/Winternals7thPt1_page_442_figure_000.png)

If you double-click either event, you can see how many handles and/or references have been made to the objects. To see whether any processes in the system have requested memory resource notification, search the handle table for references to LowMemoryCondition or HighMemoryCondition. To do so, use Process Explorer's Find menu (choose Find Handle or DLL) or use WinDbg. (For a description of the handle table, see the section "Object manager" in Chapter 8 in Part 2.)

## Page frame number database

Several previous sections concentrated on the virtual view of a Windows process—page tables, PTEs, and VADs. The remainder of this chapter will explain how Windows manages physical memory, starting with how Windows keeps track of physical memory. Whereas working sets describe the resident pages owned by a process or the system, the PFN database describes the state of each page in physical memory. The page states are listed in Table 5-19.

TABLE 5-19 Physical page states

<table><tr><td>Status</td><td>Description</td></tr><tr><td>Active (also called valid)</td><td>The page is part of a working set (either a process working set, a session working set, or a system working set), or it&#x27;s not in any working set (for example, a non-paged kernel page) and a valid PTE usually points to it.</td></tr><tr><td>Transition</td><td>This is a temporary state for a page that isn&#x27;t owned by a working set and isn&#x27;t on any paging list. A page is in this state when an I/O to the page is in progress. The PTE is encoded so that collided page faults can be recognized and handled properly. (This use of the term transition differs from the use of the word in the section on invalid PTEs. An invalid transition PTE refers to a page on the standby or modified list.)</td></tr><tr><td>Standby</td><td>The page previously belonged to a working set but was removed or was prefetched/clustered directly into the standby list. The page wasn&#x27;t modified since it was last written to disk. The PTE still refers to the physical page but it is marked invalid and in transition.</td></tr></table>


---

TABLE 5-19 Physical page states (continued)

<table><tr><td>Status</td><td>Description</td></tr><tr><td>Modified</td><td>The page previously belonged to a working set but was removed. However, the page was modified while it was in use and its current contents haven’t yet been written to disk or remote storage. The PTE still refers to the physical page but is marked invalid and in transition. It must be written to the backing store before the physical page can be reused.</td></tr><tr><td>Modified no-write</td><td>This is the same as a modified page except that the page has been marked so that the memory manager’s modified page writer won’t write it to disk. The cache manager marks pages as modified no-write at the request of file system drivers. For example, NTFS uses this state for pages containing file system metadata so that it can first ensure that transaction log entries are flushed to disk before the pages they are protecting are written to disk. (NTFS transaction logging is explained in Chapter 13, “File systems,” in Part 2.)</td></tr><tr><td>Free</td><td>The page is free but has unspecified dirty data in it. For security reasons, these pages can’t be given as a user page to a user process without being initialized with zeroes, but they can be overwritten with new data (for example, from a file) before being given to a user process.</td></tr><tr><td>Zeroed</td><td>The page is free and has been initialized with zeroes by the zero page thread or was determined to already contain zeroes.</td></tr><tr><td>Rom</td><td>The page represents read-only memory.</td></tr><tr><td>Bad</td><td>The page has generated parity or other hardware errors and can’t be used (or used as part of an enclave).</td></tr></table>


The PFN database consists of an array of structures that represent each physical page of memory

on the system. The PFN database and its relationship to page tables are shown in Figure 5-35. As this

figure shows, valid PTEs usually point to entries in the PFN database (and the PFN index points to the

page in physical memory), and the PFN database entries (for non-prototype PFNs) point back to the page

table that is using them (if it is being used by a page table). For prototype PFNs, they point back to the

prototype PTE.

![Figure](figures/Winternals7thPt1_page_443_figure_003.png)

FIGURE 5-35 Page tables and the PFN database.

426 CHAPTER 5 Memory management


---

Of the page states listed in Table 5-19, six are organized into linked lists so that the memory manager can quickly locate pages of a specific type. (Active/valid pages, transition pages, and overloaded "bad" pages aren't in any system-wide page list.) Additionally, the standby state is associated with eight different lists ordered by priority. (We'll talk about page priority later in this section.) Figure 5-36 shows an example of how these entries are linked together.

![Figure](figures/Winternals7thPt1_page_444_figure_001.png)

FIGURE 5-36 Page lists in the PFN database.

In the next section, you'll find out how these linked lists are used to satisfy page faults and how

pages move to and from the various lists.

## EXPERIMENT: Viewing the PFN database

You can use the MemInfo tool from the Windows Internals book's website to dump the size of the various paging lists by using the -s flag. The following is the output from this command:

```bash
C:\Tools\MemInfo.exe -s
MemInfo v3.00 - Show PFN database informati
Copyright (C) 2007-2016 Alex Ionescu
www.alex-ionescu.com
Initializing PFN Database... Done
PFN Database List Statistics
             Zeroed:     4867   (   19468 kb)
```

---

```bash
Free:     3076 (   12304 kb)
        Standby: 4669104 (18676416 kb)
        Modified:    7845 (   31380 kb)
        ModifiedNoWrite:   117 (    468 kb)
        Active/Valid: 3677990 (14711960 kb)
        Transition:    5 (    20 kb)
        Bad:      0 (    0 kb)
        Unknown:     1277 (   5108 kb)
        TOTAL: 8364281 (33457124 kb)
```

Using the kernel debugger !memusage command, you can obtain similar information, although this will take considerably longer to execute.

## Page list dynamics

Figure 5-37 shows a state diagram for page frame transitions. For simplicity, the modified-no-write, bad and ROM lists aren't shown.

![Figure](figures/Winternals7thPt1_page_445_figure_004.png)

FIGURE 5-37 State diagram for physical pages.

Page frames move between the paging lists in the following ways:

- ■ When the memory manager needs a zero-initialized page to service a demand-zero page fault
(a reference to a page that is defined to be all zeroes or to a user-mode committed private page
that has never been accessed), it first attempts to get one from the zero page list. If the list is
empty, it gets one from the free page list and zeroes the page. If the free list is empty, it goes to
the standby list and zeroes that page.
428    CHAPTER 5   Memory management

---

One reason zero-initialized pages are needed is to meet security requirements such as the

Common Criteria (CC). Most CC profiles specify that user-mode processes be given initialized

page frames to prevent them from reading a previous process's memory contents. Thus, the

memory manager gives user-mode processes zeroed page frames unless the page is being

read in from a backing store. In that case, the memory manager prefers to use non-zeroed page

frames, initializing them with the data off the disk or remote storage. The zero page list is popu lated from the free list by the zero page thread system thread (thread 0 in the System process).

The zero page thread waits on a gate object to signal it to go to work. When the free list has

eight or more pages, this gate is signaled. However, the zero page thread will run only if at least

one processor has no other threads running, because the zero page thread runs at priority 0

and the lowest priority that a user thread can be set to is 1

![Figure](figures/Winternals7thPt1_page_446_figure_001.png)

Note When memory needs to be zeroed as a result of a physical page allocation by a driver that calls MAllocatePageForMinEx, by a Windows application that calls A11ocateUserPhysicalPages or A11ocateUserPhysicalPagesNuma, or when an application allocates large pages, the memory manager zeroes the memory by using a higher-performing function called MZeroInParallel that maps larger regions than the zero page thread, which only zeroes a page at a time. In addition, on multiprocessor systems, the memory manager creates additional system threads to perform the zeroing in parallel (and in a NUMA-optimized fashion on NUMA platforms).

- When the memory manager doesn't require a zero-initialized page, it goes first to the free list.
If that's empty, it goes to the zeroed list. If the zeroed list is empty, it goes to the standby lists.
Before the memory manager can use a page frame from the standby lists, it must first backtrack
and remove the reference from the invalid PTE (or prototype PTE) that still points to the page
frame. Because entries in the PFN database contain pointers back to the previous user's page
table page (or to a page of prototype PTE pool for shared pages), the memory manager can
quickly find the PTE and make the appropriate change.
When a process must give up a page out of its working set either because it referenced a new
page and its working set was full or the memory manager trimmed its working set, the page
goes to the standby lists if the page was clean (not modified) or to the modified list if the page
was modified while it was resident.
When a process exits, all the private pages go to the free list. Also, when the last reference to
a page-file-backed section is closed, and the section has no remaining mapped views, these
pages also go to the free list.
## EXPERIMENT: The free and zero page lists

You can observe the release of private pages at process exit with Process Explorer's System Information display. Begin by creating a process with numerous private pages in its working set. We did this in an earlier experiment with the TestLimit utility:

CHAPTER 5   Memory management      429


---

```bash
C:\Tools\Sysinternals\TestLimit.exe -d 1 -c 1500
  TestLimit v5.24 - test Windows limits
  Copyright (C) 2012-2015 Mark Russinovich
  Sysinternals - www.sysinternals.com
  Process ID: 13928
  Leaking private bytes with touch 1 MB at a time...
  Leaked 1500 MB of private memory (1500 MB total leaked). Lasterror: 0
  The operation completed successfully.
```

The -d option causes TestLimit to not only allocate the memory as private committed, but to touch it—that is, to access it. This causes physical memory to be allocated and assigned to the process to realize the area of private committed virtual memory. If there is sufficient available RAM on the system, the entire 1,500 MB should be in RAM for the process. The process will now wait until you cause it to exit or terminate (perhaps by pressing Ctrl+C in its command window). After you do, follow these steps:

- 1. Open Process Explorer.

2. Open the View menu, choose System Information, and click the Memory tab.

3. Observe the size of the Free and Zeroed lists.

4. Terminate or exit the TestLimit process.
You may see the free page list briefly increase in size. We say "may" because the zero page

thread is awakened as soon as there are only eight pages on the free list, and it acts very quickly.

Process Explorer updates this display only once per second, and it is likely that most of the pages

were already zeroed and moved to the zeroed page list before it happened to "catch" this state.

If you can see the temporary increase in the free list, you will then see it drop to zero, and a cor responding increase will occur in the zeroed page list. If not, you will simply see the increase in

the zeroed list.

## EXPERIMENT: The modified and standby page lists

You can observe the movement of pages from process working set to the modified page list and

then to the standby page list with the VMMap and RAMMap Sysinternals tools and the live kernel

debugger. Follow these steps:

- 1. Open RAMMap and observe the state of the quiet system. This is an x86 system with

3 GB of RAM. The columns in this display represent the various page states shown in

Figure 5-37 (a few of the columns not important to this discussion have been narrowed

for ease of reference).
430    CHAPTER 5   Memory management


---

![Figure](figures/Winternals7thPt1_page_448_figure_000.png)

2. The system has about 420 MB of RAM free (sum of the free and zeroed page lists).

About 580 MB is on the standby list (hence part of "available," but likely containing data

recently lost from processes or being used by SuperFetch). About 830 MB is "active," being mapped directly to virtual addresses via valid page table entries.

3. Each row further breaks down into page state by usage or origin (process private, mapped file, and so on). For example, at the moment, of the active 830 MB, about 400 MB is due to process private allocations.

4. Now, as in the previous experiment, use the TestLimit utility to create a process with a large number of pages in its working set. Again, we will use the -d option to cause TestLimit to write to each page, but this time we will use it without a limit, so as to create as many private modified pages as possible:

```bash
C:\Tools\Sysinternals>TestLimit.exe -d
Testlimit v5.24 - test Windows limits
Copyright (C) 2012-2015 Mark Russinovich
Sysinternals - www.sysinternals.com
Process ID: 7548
Leaking private bytes with touch (MB)...
Leaked 1975 MB of private memory (1975 MB total leaked). Lasterror: 8
```

5. TestLimit has now created 1975 allocations of 1 MB each. In RAMMap, use the File |

Refresh command to update the display (because of the cost of gathering its informa tion, RAMMap does not update continuously).

---

![Figure](figures/Winternals7thPt1_page_449_figure_000.png)

6. You will see that over 2.8 GB are now active, of which 2.4 GB are in the Process Private

row. This is due to the memory allocated and accessed by the TestLimit process. Note

also that the standby, zeroed, and free lists are now much smaller. Most of the RAM

allocated to TestLimit came from these lists.

7. Next, in RAMMap, check the process's physical page allocations. Change to the

Physical Pages tab, and set the filter at the bottom to the Process column and the

value TestLimit.exe. This display shows all the physical pages that are part of the

process working set.

![Figure](figures/Winternals7thPt1_page_449_figure_003.png)

432    CHAPTER 5   Memory management


---

8. We would like to identify a physical page involved in the allocation of virtual address space done by TestLimit's -d option. RAMMap does not give an indication about which virtual allocations are associated with RAMMap's VirtualAlloc calls. However, we can get a good hint of this through the VMMap tool. Using VMMap on the same process, we find the following:

![Figure](figures/Winternals7thPt1_page_450_figure_001.png)

9. In the lower part of the display, we find hundreds of allocations of process private data, each 1 MB in size and with 1 MB committed. These match the size of the allocations done by TestLimit. One of these is highlighted in the preceding screenshot. Note the starting virtual address, 0x310000.

10. Now go back to RAMMap's physical memory display. Arrange the columns to make the Virtual Address column easily visible, click it to sort by that value, and you can find that virtual address:

CHAPTER 5   Memory management     433


---

![Figure](figures/Winternals7thPt1_page_451_figure_000.png)

11. This shows that the virtual page starting at 0x310000 is currently mapped to physical address 0x212D1000. TestLimit's -d option writes the program's own name to the first bytes of each allocation. We can demonstrate this with the !dc (display characters using physical address) command in the local kernel debugger:

```bash
!kds: !dc 0x212d1000
#212d1000 74736554 6964694c 00000074 00000000 TestLimit.......
#212d1010 00000000 00000000 00000000 00000000 ..............
```

12. If you're not quick enough, this may fail—the page may be removed from the working

set. For the final leg of the experiment, we will demonstrate that this data remains intact

(for a while, anyway) after the process working set is reduced and this page is moved to

the modified and then the standby page list.

13. In VMMap, having selected the TestLimit process, open the View menu and choose

Empty Working Set to reduce the process's working set to the bare minimum.

VMMap's display should now look like this:

![Figure](figures/Winternals7thPt1_page_451_figure_005.png)

434 CHAPTER 5   Memory management


---

14. Notice that the Working Set bar graph is practically empty. In the middle section, the process shows a total working set of only 4 KB, and almost all of it is in page tables. Now return to RAMMap and refresh it. On the Use Counts tab, you will find that active pages have been reduced tremendously, with a large number of pages on the modified list and some on the standby list:

![Figure](figures/Winternals7thPt1_page_452_figure_001.png)

15. RAMMap's Processes tab confirms that the TestLimit process contributed most of those

pages to those lists:

![Figure](figures/Winternals7thPt1_page_452_figure_003.png)

CHAPTER 5     Memory management     435


---

## Page priority

Every physical page in the system has a page priority value assigned to it by the memory manager. The page priority is a number in the range 0 to 7. Its main purpose is to determine the order in which pages are consumed from the standby list. The memory manager divides the standby list into eight sublists that each stores pages of a particular priority. When the memory manager wants to take a page from the standby list, it takes pages from low-priority lists first.

Each thread and process in the system is also assigned a page priority. A page's priority usually reflects the page priority of the thread that first causes its allocation. (If the page is shared, it reflects the highest page priority among the sharing threads.) A thread inherits its page-priority value from the process to which it belongs. The memory manager uses low priorities for pages it reads from disk speculatively when anticipating a process's memory accesses.

By default, processes have a page-priority value of 5, but the SetProcessInformation and SetThreadInformation user-mode functions allow applications to change process and thread pagepriority values. These functions call the native NtSetInformationProcess and NtSetInformationThread functions. You can look at the memory priority of a thread with Process Explorer (per-page priority can be displayed by looking at the PFN entries, as you'll see in an experiment later in the chapter). Figure 5-38 shows Process Explorer's Threads tab displaying information about Winlogon's main thread. Although the thread priority itself is high, the memory priority is still the standard 5.

![Figure](figures/Winternals7thPt1_page_453_figure_004.png)

FIGURE 5-38 Process Explorer's Threads tab.

The real power of memory priorities is realized only when the relative priorities of pages are understood at a high level, which is the role of SuperFetch, covered at the end of this chapter.

436 CHAPTER 5 Memory management


---

## EXPERIMENT: Viewing the prioritized standby lists

You can use Process Explorer to look at the size of each standby paging list by opening the System

Information dialog box and selecting the Memory tab:

![Figure](figures/Winternals7thPt1_page_454_figure_002.png)

On the recently started x86 system used in this experiment, there is about 9 MB of data


cached at priority 0, about 47 MB at priority 1, about 68 MB at priority 2, etc. The following shows what happens when we use the TestLimit tool from Sysinternals to commit and touch as much


memory as possible:

C:\Tools\Sysinternals>TestLimit.exe -d

![Figure](figures/Winternals7thPt1_page_454_figure_005.png)

Note how the lower-priority standby page lists were used first (shown by the repurposed count) and are now much smaller, while the higher lists still contain valuable cached data.

CHAPTER 5   Memory management      437


---

## Modified page writer and mapped page writer

The memory manager employs two system threads to write pages back to disk and move those pages back to the standby lists (based on their priority). One system thread writes out modified pages (MiModifiedPageWriter) to the paging file, and a second one writes modified pages to mapped files (MiModifiedPageWriter). Two threads are required to avoid creating a deadlock. This would occur if the writing of mapped file pages caused a page fault that in turn required a free page when no free pages were available, thus requiring the modified page writer to create more free pages. By having the modified page writer perform mapped file paging I/Os from a second system thread, that thread can wait without blocking regular page file I/O.

Both threads run at priority 18, and after initialization they wait for separate event objects to trigger

their operation. The mapped page writer waits on 18 event objects:

- ■ An exit event, signaling the thread to exit (not relevant to this discussion).
■ The mapped writer event, stored in the global variable MiSystemPartition.Modwriter.
MappedPageWriterEvent (MmMappedPageWriterEvent on Windows 8.x and Server 2012/R2).
This event can be signaled in the following instances:
• During a page list operation (MiInsertPageInList); this routine inserts a page into one of
the lists (standby, modified, etc.) based on its input arguments. The routine signals this event
if the number of file-system-destined pages on the modified page list has reached more
than 16 and the number of available pages has fallen below 1024.
• In an attempt to obtain free pages (MiObtainFreePages).
• By the memory manager’s working set manager (MmWorkingSetManager), which runs as part
of the kernel’s balance set manager (once every second). The working set manager signals
this event if the number of file-system-destined pages on the modified page list has reached
more than 800.
• Upon a request to flush all modified pages (MmFlushAllPages).
• Upon a request to flush all file-system-destined modified pages (MmFlushAllFilesystem-
Pages). Note that in most cases, writing modified mapped pages to their backing store files
does not occur if the number of mapped pages on the modified page list is less than the
maximum write cluster size, which is 16 pages. This check is not made in MmFlushAllFile-
systemPages or MmFlushAllPages.
■ An array of 16 events associated with 16 mapped page lists, stored in MiSystemPartition.
PageLists.MappedPageListHeadEvent (MiMappedPageListHeadEvent on Windows 8.x and
Server 2012/R2). Each time a mapped page is drilled, it is inserted into one of these 16 mapped
page lists based on a bucket number, stored in MiSystemPartition.WorkingSetControl-
>CurrentMappedPageBucket (MiCurrentMappedPageBucket on Windows 8.x and Server
2012/R2). This bucket number is updated by the working set manager whenever the system
considers that mapped pages have gotten old enough, which is currently 100 seconds (stored
in the WriteGapCounter variable in the same structure MiWriteGapCounter on Windows 8.x


CHAPTER 5 Memory management


From the Library of I
---

and Server 2012/R2 and incremented whenever the working set manager runs). The reason

for these additional events is to reduce data loss in the case of a system crash or power failure

by eventually writing out modified mapped pages even if the modified list hasn’t reached its

threshold of 800 pages.

The modified page writer waits on two events: the first is an Exit event, and the second stored in


MiSystemPartition.Modwriter.ModifiedPageWriterEvent (on Windows 8.x and Server 2012/R2

waits on a kernel gate stored in MmModifiedPageWriterGate), which can be signaled in the following

scenarios:

- ■ A request to flush all pages has been received.
■ The number of available pages—stored in MiSystemPartition.Vp.AvailablePages
(MmAvailablePages on Windows 8.x and Server 2012/R2)—drops below 128 pages.
■ The total size of the zeroed and free page lists drops below 20,000 pages, and the number of
modified pages destined for the paging file is greater than the smaller of one-sixteenth of the
available pages or 64 MB (16,384 pages).
■ When a working set is being trimmed to accommodate additional pages, if the number of
pages available is less than 15,000.
■ During a page list operation (MiInsertPageInList) this routine signals this event if the num-
ber of page-file-destined pages on the modified page list has reached more than 16 pages and
the number of available pages has fallen below 1,024.
Additionally, the modified page writer waits on two other events after the preceding event is

signaled. One is used to indicate rescanning of the paging file is required (for example, a new page

file may have been created), stored in M1SystemPartition.Modwriter.RescanPageFilesEvent

(M1RescanPageFilesEvent on Windows 8.x and Server 2012/R2). The second event is internal to the

paging file header (M1SystemPartition.Modwriter.PagingFileHeader [MmPagingFileHeader on

Windows 8.x and Server 2012/R2]), which allows the system to manually request flushing out data to

the paging file when needed.

When invoked, the mapped page writer attempts to write as many pages as possible to disk with a single I/O request. It accomplishes this by examining the original PTE field of the PFN database elements for pages on the modified page list to locate pages in contiguous locations on the disk. Once a list is created, the pages are removed from the modified list, an I/O request is issued, and, at successful completion of the I/O request, the pages are placed at the tail of the standby list corresponding to their priority.

Pages that are in the process of being written can be referenced by another thread. When this happens, the reference count and the share count in the PFN entry that represents the physical page are incremented to indicate that another process is using the page. When the I/O operation completes, the modified page writer notices that the reference count is no longer 0 and doesn't place the page on any standby list.

---

