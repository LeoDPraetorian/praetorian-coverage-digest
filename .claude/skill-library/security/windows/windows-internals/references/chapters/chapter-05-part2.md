## The segment heap

Figure 5-9 shows the architecture of the segment heap, introduced in Windows 10.

![Figure](figures/Winternals7thPt1_page_353_figure_005.png)

FIGURE 5-9   Segment heap.

The actual layer that manages an allocation depends on the allocation size as follows:

- ■ For small sizes (less than or equal to 16,368 bytes), the LFH allocator is used, but only if the size is
determined to be a common one. This is a similar logic to the LFH front layer of the NT heap. If
the LFH has not kicked in yet, the variable size (VS) allocator will be used instead.
---

- ■ For sizes less than or equal to 128 KB (and not serviced by the LFH), the VS allocator is used. Both
VS and LFH allocators use the back end to create the required heap sub-segments as necessary.
■ Allocations larger than 128 KB and less than or equal to 508 KB are serviced directly by the heap
back end.
■ Allocations larger than 508 KB are serviced by calling the memory manager directly (Vi r t ua1 -
A110c) since these are so large that using the default 64 KB allocation granularity (and rounding
to the nearest page size) is deemed good enough.
Here is a quick comparison of the two heap implementations:

- ■ In some scenarios, the segment heap may be somewhat slower than the NT heap. However, it's
likely that future Windows versions would make it on par with the NT heap.
■ The segment heap has a lower memory footprint for its metadata, making it better suited for
low-memory devices such as phones.
■ The segment heap's metadata is separated from the actual data, while the NT heap's metadata
is interspersed with the data itself. This makes the segment heap more secure, as it's more dif-
ficult to get to the metadata of an allocation given just a block address.
■ The segment heap can be used only for a growable heap. It cannot be used with a user-supplied
memory mapped file. If such a segment heap creation is attempted, an NT heap is created
instead.
■ Both heaps support LFH-type allocations, but their internal implementation is completely dif-
ferent. The segment heap has a more efficient implementation in terms of memory consump-
tion and performance.
As mentioned, UWP apps use segment heaps by default. This is mainly because of their lower memory footprint, which is suitable for low-memory devices. It's also used with certain system processes based on executable name: csrss.exe, lsaas.exe, runtimebroker.exe, services.exe, smss.exe, and svchost. exe.

The segment heap is not the default heap for desktop apps because there are some compatibility

concerns that may affect existing applications. It's likely that in future versions, however, it will become

the default. T o enable or disable the segment heap for a specific executable, you can set an Image File

Execution Options value named FrontEndHeapDebugOptions (DWORD):

- ■ Bit 2 (4) to disable segment heap

■ Bit 3 (8) to enable segment heap
You can also globally enable or disable the segment heap by adding a value named Enabled

(DWORD) to the HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Segment Heap registry

key. A zero value disables the segment heap and a non-zero value enables it.

CHAPTER 5   Memory management     337


---

## EXPERIMENT: Viewing basic heap information

In this experiment, we'll examine some heaps of a UWP process.

1. Using Windows 10, run the Windows calculator. (Click the Start button and type Calculator to find it.)

2. The calculator in Windows 10 has been turned into a UWP app (Calculator.Exe). Run

WinDBg and attach to the calculator process.

3. Once attached, WinDbg breaks into the process. Issue the !heap command to get a quick summary of heaps in the process:

```bash
0:033> !heap
        Heap Address      NT/Segment Heap
        2531eb90000      Segment Heap
        2531e980000      NT Heap
        2531eb10000      Segment Heap
        25320a40000      Segment Heap
        253215a0000      Segment Heap
        253214f0000      Segment Heap
        2531eb70000      Segment Heap
        25326920000      Segment Heap
        253215d0000      NT Heap
```

4. Notice the various heaps with their handle and type (segment or NT). The first heap is

the default process heap. Because it's growable and not using any preexisting memory

block, it's created as a segment heap. The second heap is used with a user-defined

memory block (described earlier in the "Process heaps" section). Because this feature is

currently unsupported by the segment heap, it's created as an NT heap.

5. An NT heap is managed by the NtD11\HEAP structure. Let's view this structure for the second heap:

```bash
0:033> dt ntdll__heap 2513e980000
+0x000 Segment        : _HEAP_SEGMENT
+0x000 Entry          : _HEAP_ENTRY
+0x010 SegmentSignature : 0xffefee
+0x014 SegmentFlags      : 1
+0x018 SegmentListEntry : _LIST_ENTRY [ 0x00000253'1e980120 -
0x00000253'1e980120  ]
+0x028 Heap           : 0x00000253'1e980000 _HEAP
+0x030 BaseAddress     : 0x00000253'1e980000 Void
+0x038 NumberOfPages    : 0x10
+0x040 FirstEntry       : 0x00000253'1e980720 _HEAP_ENTRY
+0x048 LastValiedEntry   : 0x00000253'1e980000 _HEAP_ENTRY
+0x050 NumberOfUnCommittedPages : 0xf
+0x054 NumberOfUnCommittedRanges : 1
+0x058 SegmentAllocatorBackTraceIndex : 0
```

---

```bash
+0x05a Reserved        : 0
  +0x060 UCRSegmentList   : _LIST_ENTRY [ 0x00000253'1e980fe0-
0x00000253'1e980fe0 ]
  +0x070 Flags           : 0x8000
  +0x074 ForceFlags      : 0
  +0x078 CompatibilityFlags : 0
  +0x07c EncodeFlagMask    : 0x100000
  +0x080 Encoding         : _HEAP_ENTRY
  +0x090 Interceptor     : 0
  +0x094 VirtualMemoryThreshold : 0xff00
  +0x098 Signature        : 0xeeeffeff
  +0x0a0 SegmentReserve : 0x100000
  +0x0a8 SegmentCommit : 0x2000
  +0x0b0 DeCommitFreeBlockThreshold : 0x100
  +0x0b8 DeCommitTotalFreeThreshold : 0x1000
  +0x0c0 TotalFreeSize    : 0x8a
  +0x0c8 MaximumAllocationSize : 0x00007fff'fffdeff
  +0x0d0 ProcessHeapsListIndex : 2
  ...
  +0x178 FrontEndHeap       : (null)
  +0x180 FrontHeapLockCount : 0
  +0x182 FrontEndHeapType : 0 '''
  +0x183 RequestedFrontEndHeapType : 0 '''
  +0x188 FrontEndHeapUsageData : (nullT)
  +0x190 FrontEndHeapMaximumIndex : 0
  +0x192 FrontEndHeapStatusBitmap : [129] ""
  +0x218 Counters          : _HEAP_COUNTERS
  +0x290 TuningParameters : _HEAP_TUNING_PARAMETERS
```

6. Notice the FrontEndHeap field. This field indicates whether a front-end layer exists. In the preceding output, it's null, meaning there is no front-end layer. A non-null value indicates an LFH front-end layer (since it's the only one defined).

7. A segment heap is defined with the NtD11\[_SEGMENT_HEAP structure. Here's the default

process heap:

```bash
0:033> dt ntdll_segment_heap 2531eb90000
+0x000 TotalReservedPages : 0x815
+0x008 TotalCommittedPages : 0x6ac
+0x010 Signature      : 0xddeddee
+0x014 GlobalFlags    : 0
+0x018 FreeCommittedPages : 0
+0x020 Interceptor      : 0
+0x024 ProcessHeapListIndex : 1
+0x026 GloballockCount : 0
+0x028 GloballockOwner : 0
+0x030 LargeMetadataLock : _RTL_SRWLOCK
+0x038 LargeAllocMetadata : _RTL_RB_TREE
+0x048 LargeReservedPages : 0
+0x050 LargeCommittedPages : 0
+0x058 SegmentAllocatorLock : _RTL_SRWLOCK
+0x060 SegmentListHead  : _LIST_ENTRY_0x00000253'1ec00000
```

CHAPTER 5   Memory management     339


---

```bash
0x0000253'28a00000  ]
+0x070 SegmentCount    : 8
+0x078 FreePageRanges   : _RTL_RB_TREE
+0x088 StackTraceInitVar : _RTL_RUN_ONCE
+0x090 ContextExtendLock : _RTL_SRNLOCK
+0x098 A1locatedBase    : 0x0000253'1eb93200  ""
+0x0a0 UncommittedBase : 0x0000253'1eb94000  """ memory read error at
address 0x0000253'1eb94000  """
+0x0a8 ReservedLimit   : 0x0000253'1eba5000  """ memory read error at
address 0x0000253'1eba5000  """
+0x0b0 VsContext       : _HEAP_VS_CONTEXT
+0x120 LfNContext      : _HEAP_LFH_CONTEXT
```

8. Notice the Signature field. It's used to distinguish between the two types of heaps.

9. Notice the SegmentSignature field of the _HEAP structure. It is in the same offset (0x10). This is how functions such as RtlAlllocateHeap know which implementation to turn to based on the heap handle (address) alone.

10. Notice the last two fields in the _SEGMENT_HEAP. These contain the VS and LHI allocator information.

11. T o get more information on each heap, issue the !heap -s command:

```bash
0:033> !heap -s
```

<table><tr><td></td><td></td><td rowspan="2">Global Flags</td><td>Process</td><td>Total</td><td>Total</td></tr><tr><td>Heap Address</td><td>Signature</td><td>Heap List Index</td><td>Reserved Bytes (K)</td><td>Committed Bytes (K)</td></tr><tr><td>2531eb90000</td><td>ddeeddee</td><td>0</td><td>1</td><td>8276</td><td>6832</td></tr><tr><td>2531eb10000</td><td>ddeeddee</td><td>0</td><td>3</td><td>1108</td><td>868</td></tr><tr><td>25320a40000</td><td>ddeeddee</td><td>0</td><td>4</td><td>1108</td><td>16</td></tr><tr><td>253215a0000</td><td>ddeeddee</td><td>0</td><td>5</td><td>1108</td><td>20</td></tr><tr><td>253214f0000</td><td>ddeeddee</td><td>0</td><td>6</td><td>3156</td><td>816</td></tr><tr><td>2531eb70000</td><td>ddeeddee</td><td>0</td><td>7</td><td>1108</td><td>24</td></tr><tr><td>2532692000</td><td>ddeeddee</td><td>0</td><td>8</td><td>1108</td><td>32</td></tr></table>


```bash
*****************************************************************************
*********************
*                            NT HEAP STATS BELOW
*********************
*********************
*LFH Key        : 0xd7b666e8f5a4b98
Termination on corruption : ENABLED
Affinity manager status:
   - Virtual affinity limit 8
   - Current entries in use 0
   - Statistics:  Swaps=0, Resets=0, Allocs=0
********************
     Heap     Flags   Reserv Commit  Virt    Free List   UCR  Virt
Lock  Fast
```

---

<table><tr><td></td><td>(k)</td><td>(k)</td><td>(k)</td><td>(k)</td><td>length</td><td>blocks</td></tr><tr><td>cont. heap</td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>-----------------------------</td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>000002531e980000 00008000</td><td>64</td><td>4</td><td>64</td><td>2</td><td>1</td><td>1 0</td></tr><tr><td>00000253215d0000 00000001</td><td>16</td><td>16</td><td>16</td><td>10</td><td>1</td><td>1 0</td></tr><tr><td>N/A</td><td></td><td></td><td></td><td></td><td></td><td></td></tr><tr><td>-----------------------------</td><td></td><td></td><td></td><td></td><td></td><td></td></tr></table>


12. Notice the first part of the output. It shows extended information on segment heaps (if any). The second part shows extended information on NTT heaps in the process.

The !heap debugger command provides a multitude of options for viewing, investigating, and searching heaps. See the "Debugger Tools for Windows" documentation for more information.

## Heap security features

As the heap manager has evolved, it has taken an increased role in early detection of heap usage errors

and in mitigating effects of potential heap-based exploits. These measures exist to lessen the security

effect of potential vulnerabilities in applications. Both the NT-heap and the segment-heap implemen tations have multiple mechanisms that reduce the likelihood of memory exploitation.

The metadata used by the heaps for internal management is packed with a high degree of randomization to make it difficult for an attempted exploit to patch the internal structures to prevent crashes or conceal the attack attempt. These blocks are also subject to an integrity-check mechanism on the header to detect simple corruptions such as buffer overruns. Finally, the heap uses a small degree of randomization of the base address or handle. By using the HeapSetInformation API with the HeapEnableTerminationOnCorruption class, processes can opt in for an automatic termination in case of detected inconsistencies to avoid executing unknown code.

As an effect of block metadata randomization, using the debugger to simply dump a block header as an area of memory is not that useful. For example, the size of the block and whether it is busy are not easy to spot from a regular dump. The same applies to LFH blocks. They have a different type of metadata stored in the header, also partially randomized. To dump these details, the !heap -i command in the debugger does all the work to retrieve the metadata fields from a block, also flagging checksum or free-list inconsistencies if they exist. The command works for both LFH and regular heap blocks. The total size of the blocks, the user-requested size, the segment owning the block, and the header partial checksum are available in the output, as shown in the following sample. Because the randomization algorithm uses the heap granularity, the !heap -i command should be used only in the proper context of the heap containing the block. In the example, the heap handle is 0x0011a0000. If the current heap context were different, the decoding of the header would be incorrect. To set the proper context, the same !heap -i command with the heap handle as an argument must be executed first.

CHAPTER 5     Memory management      341


---

```bash
0:004> !heap -i 000001f72a5e0000
Heap context set to the heap 0x000001f72a5e0000
0:004> !heap -i 000001f72a5eb180
Detailed information for block entry 000001f72a5eb180
Assumed heap       : 0x000001f72a5e0000 (Use |heap -i NewHeapHandle to change)
Header content    : 0x2FB514DC 0x1000021F (decoded : 0x7F01007E 0x10000048)
Owning segment    : 0x000001f72a5e0000 (offset 0)
Block Flags        : 0x1 (busy )
Total block size   : 0x7e units (0x7e0 bytes)
Requested size      : 0x7d0 bytes (unused 0x10 bytes)
Previous block size: 0x48 units (0x480 bytes)
Block CRC          : 0K - 0x7f
Previous block      : 0x000001f72a5ead00
Next block        : 0x000001f72a5eb960
```

## Segment heap-specific security features

The segment heap implementation uses many security mechanisms to make it harder to corrupt memory or to allow code injection by an attacker. Here are a few of them:

- ■ Fail fast on linked list node corruption The segment heap uses linked lists to track seg-
ments and sub-segments. As with the NT heap, checks are added in the list node insertion and
removal to prevent arbitrary memory writes due to corrupted list nodes. If a corrupted node is
detected, the process is terminated via a call to RtlFailFast.

■ Fail fast on red-black (RB) tree node corruption The segment heap uses RB trees to track
free back-end and VS allocations. Node insertion and deletion functions validate the nodes
involved or, if corrupted, invoke the fail-fast mechanism.

■ Function pointer decoding Some aspects of the segment heap allow for callbacks (in
VsContext and LfHContext structures, part of the _SEGONT_HEAP structure). An attacker can
override these callbacks to point to his or her own code. However, the function pointers are en-
coded by using a XOR function with an internal random heap key and the context address, both
of which cannot be guessed in advance.

■ Guard pages When LFH and VS sub-segments and large blocks are allocated, a guard page is
added at the end. This helps to detect overflows and corruption of adjacent data. See the sec-
tion "Stacks" later in this chapter for more information on guard pages.
## Heap debugging features

The heap manager includes several features to help detect bugs by using the following heap settings:

- ■ Enable tail checking The end of each block carries a signature that is checked when the

block is released. If a buffer overrun destroys the signature entirely or partially, the heap will

report this error.
---

- ■ Enable free checking A free block is filled with a pattern that is checked at various points
when the heap manager needs to access the block, such as at removal from the free list to sat-
isfy an allocate request. If the process continues to write to the block after freeing it, the heap
manager will detect changes in the pattern and the error will be reported.

■ Parameter checking This function consists of extensive checking of the parameters passed
to the heap functions.

■ Heap validation The entire heap is validated at each heap call.

■ Heap tagging and stack traces support This function supports the specification of tags for
allocation and/or captures user-mode stack traces for the heap calls to help narrow the possible
causes of a heap error.
The first three options are enabled by default if the loader detects that a process is started under the control of a debugger. (A debugger can override this behavior and turn off these features.) You can specify the heap debugging features for an executable image by setting various debugging flags in the image header using the Gflags tool. (See the next experiment and the section "Windows global flags" in Chapter 8 in Part 2.) Alternatively, you can enable heap debugging options using the !heap command in the standard Windows debuggers. (See the debugger help for more information.)

Enabling heap-debugging options affects all heaps in the process. Also, if any of the heap-debugging options are enabled, the LFH will be disabled automatically and the core heap will be used (with the required debugging options enabled). The LFH is also not used for heaps that are not expandable (because of the extra overhead added to the existing heap structures) or for heaps that do not allow serialization.

## Pageheap

Because the tail and free checking options described in the preceding sections might discover corruptions that occurred well before the problem was detected, an additional heap debugging capability, called pageheap, is provided. Pageheap directs all or part of the heap calls to a different heap manager. You can enable pageheap using the Gflags tool (part of the Debugging Tools for Windows). When enabled, the heap manager places allocations at the end of pages and reserves the page that immediately follows. Because reserved pages are not accessible, any buffer overruns that occur will cause an access violation, making it easier to detect the offending code. Optionally, pageheap allows for the placement of blocks at the beginning of the pages, with the preceding page reserved, to detect buffer underun problems (a rare occurrence). Pageheap also can protect freed pages against any access to detect references to heap blocks after they have been freed.

Note that using the pageheap can cause you to run out of address space (in 32-bit processes)

because of the significant overhead added for small allocations. Also, performance can suffer due to

the increase of references to demand zero pages, loss of locality, and additional overhead caused by

frequent calls to validate heap structures. A process can reduce the impact by specifying that the page heap be used only for blocks of certain sizes, address ranges, and/or originating DLLs.

CHAPTER 5   Memory management     343


---

## EXPERIMENT: Using pageheap

In this experiment, you'll turn on pageheap for Notepad.exe and see its effects.

1. Run Notepad.exe.

2. Open Task Manager, click to the Details tab, and add the Commit Size column to the

display.

3. Notice the commit size of the notepad instance you just launched.

4. Run Gflags.exe, located in the folder where Debugging Tools for Windows is installed (requires elevation).

5. Click the Image File tab.

6. In the Image text box, type notepad.exe. Then press the Tab key. The various check boxes should be selected.

7. Select the Enable Page Heap check box. The dialog box should look like this:

![Figure](figures/Winternals7thPt1_page_361_figure_009.png)

8. Click Apply.

9. Run another instance of Notepad. (Don't close the first one.)

10. In Task Manager, compare the commit size of both notepad instances. Notice that the second instance has a much larger commit size even though both are empty notepad processes. This is due to the extra allocations that pageheap provides. Here's a screenshot from 32-bit Windows 10:

344 CHAPTER 5 Memory management


---

![Figure](figures/Winternals7thPt1_page_362_figure_000.png)

11. To get a better sense of the extra memory allocated, use the VMMap Sysinternals tool.


While the notepad processes are still running, open VMMap.exe and select the notepad

instance that is using pageheap:

![Figure](figures/Winternals7thPt1_page_362_figure_002.png)

12. Open another instance of VMMap and select the other notepad instance. Place the windows side by side to see both:

CHAPTER 5   Memory management      345


---

![Figure](figures/Winternals7thPt1_page_363_figure_000.png)

13. Notice that the difference in the commit size is clearly visible in the Private Data (yellow) part.

14. Click the Private Data line in the middle display on both VMMap instances to see its parts in the bottom display (sorted by size in the screenshot):

![Figure](figures/Winternals7thPt1_page_363_figure_003.png)

15. The left screenshot (notepad with pagegap) clearly consumes more memory. Open one of the 1,024 KB chunks. You should see something like this:

![Figure](figures/Winternals7thPt1_page_363_figure_005.png)

16. You can clearly see the reserved pages between committed pages that help catch buffer overruns and underruns courtesy of pageheap. Uncheck the Enable Page Heap option in Gflags and click Apply so future instances of notepad will run without pageheap.

For more information on pageheap, see the "Debugging Tools for Windows" help file.

346    CHAPTER 5   Memory management


---

## Fault-tolerant heap

Microsoft has identified the corruption of heap metadata as one of the most common causes of application failures. Windows includes a feature called the fault-tolerant heap (FTH) to mitigate these problems and to provide better problem-solving resources to application developers. The FTH is implemented in two primary components:

- The detection component (FTH server)

• The mitigation component (FTH client)
The detection component is a DLL called Fhsvc.dll that is loaded by the Windows Security Center

service (Wscsvc.dll), which in turn runs in one of the shared service processes under the local service

account. It is notified of application crashes by the Windows Error Reporting (WER) service.

Suppose an application crashes in Ntidll.dll with an error status indicating either an access violation or a heap-corruption exception. If it is not already on the FTH service's list of watched applications, the service creates a "ticket" for the application to hold the FTH data. If the application subsequently crashes more than four times in an hour, the FTH service configures the application to use the FTH client in the future.

The FTH client is an application-compatible shim. This mechanism has been used since Windows

XP to allow applications that depend on a particular behavior of older Windows systems to run on later

systems. In this case, the shim mechanism intercepts the calls to the heap routines and redirects them

to its own code. The FTH code implements numerous mitigations that attempt to allow the application

to survive despite various heap-related errors.

For example, to protect against small buffer overrun errors, the FTH adds 8 bytes of padding and an FTH reserved area to each allocation. T o address a common scenario in which a block of heap is accessed after it is freed, HeapFree calls are implemented only after a delay. "Freed" blocks are put on a list, and freed only when the total size of the blocks on the list exceeds 4 MB. Attempts to free regions that are not actually part of the heap, or not part of the heap identified by the heap handle argument to HeapFree, are simply ignored. In addition, no blocks are actually freed once exit or RtlExitUserProcess has been called.

The FTH server continues to monitor the failure rate of the application after the mitigations have been installed. If the failure rate does not improve, the mitigations are removed.

You can observe the activity of the fault-tolerant heap in the Event Viewer. Follow these steps:

- 1. Open a Run prompt and type eventwvr.msc.

2. In the left pane, choose Event Viewer, select Applications and Services Logs, choose

Microsoft, select Windows, and click Fault-Tolerant-Heap.

3. Click the Operational log.

4. The FTH may be disabled completely in the registry. In the HKLM\Software\Microsoft\FTH key,

set the Enabled value to 0.
CHAPTER 5     Memory management      347


---

That same key contains the various FTH settings, such as the delay mentioned earlier and an exclusion list of executables (which includes by default system processes such as smss.exe, csrs.exe, wininit. exe, services.exe, winlogon.exe and taskhost.exe). A rule list is also included (RuleList value), which lists the modules and exception type (and some flags) to watch for in order for FTH to kick in. By default, a single rule is listed, indicating heap problems in Ntdll.dll of type STATUS_ACCESS_VIOLATION (0x0000005).

The FTH does not normally operate on services, and it is disabled on Windows server systems for

performance reasons. A system administrator can manually apply the shim to an application or service

executable by using the Application Compatibility Toolkit.

## Virtual address space layouts

This section describes the components in the user and system address space, followed by the specific layouts on 32-bit (x86 and ARM) and 64-bit (x64) systems. This information will help you to understand the limits on process and system virtual memory on these platforms.

Three main types of data are mapped into the virtual address space in Windows:

- ■ Per-process private code and data As explained in Chapter 1, each process has a private
address space that cannot be accessed by other processes. That is, a virtual address is always
evaluated in the context of the current process and cannot refer to an address defined by any
other process. Threads within the process can therefore never access virtual addresses outside
this private address space. Even shared memory is not an exception to this rule, because shared
memory regions are mapped into each participating process, and so are accessed by each
process using per-process addresses. Similarly, the cross-process memory functions (Read-
ProcessMemory and WriteProcessMemory) operate by running kernel-mode code in the con-
text of the target process. The process virtual address space, called page tables, is described in
the "Address translation" section. Each process has its own set of page tables. They are stored
in kernel-mode-only accessible pages so that user-mode threads in a process cannot modify
their own address space layout.
■ Session-wide code and data Session space contains information that is common to each
session. (For a description of sessions, see Chapter 2.) A session consists of the processes and
other system objects such as the window station, desktops, and windows that represent a single
user's logon session. Each session has a session-specific paged pool area used by the kernel-mode
portion of the Windows subsystem (Win32k.sys) to allocate session-private GUI data structures.
In addition, each session has its own copy of the Windows subsystem process (Csrrs.exe) and
logon process (Winlogon.exe). The Session Manager process (Smss.exe) is responsible for
creating new sessions, which includes loading a session-private copy of Win32k.sys, creating
the session-private object manager namespace (see Chapter 8 in Part 2 for more details on the
object manager), and creating the session-specific instances of the Csrrs.exe and Winlogon.exe
processes. To virtualize sessions, all session-wide data structures are mapped into a region of
system space called session space. When a process is created, this range of addresses is mapped
to the pages associated with the session that the process belongs to.
CHAPTER 5 Memory management
From the Library of I
---

■ System-wide code and data System space contains global operating system code and data structures visible by kernel-mode code regardless of which process is currently executing. System space consists of the following components:

- ● System code This contains the OS image, HAL, and device drivers used to boot the system.

● Nonpaged pool This is the non-pageable system memory heap.

● Paged pool This is the pageable system memory heap.

● System cache This is virtual address space used to map files open in the system cache.
(See Chapter 1, “Startup and shutdown,” in Part 2 for detailed information.)

● System page table entries (PTEs) This is the pool of system PTEs used to map system
pages such as I/O space, kernel stacks, and memory descriptor lists. You can see how many
system PTEs are available by using Performance Monitor to examine the value of the Memory:
Free System Page Table Entries counter.

● System working set lists These are the working set list data structures that describe the
three system working sets: system cache, paged pool, and system PTEs.

● System mapped views This is used to map Win32k.sys, the loadable kernel-mode part of
the Windows subsystem, as well as kernel-mode graphics drivers it uses. (See Chapter 2 for
more information on Win32k.sys.)

● Hyperspace This is a special region used to map the process working set list and other
per-process data that doesn’t need to be accessible in arbitrary process context. Hyperspace
is also used to temporarily map physical pages into the system space. One example of this is
invalidating page table entries in page tables of processes other than the current one, such
as when a page is removed from the standby list.

● Crash dump information This is reserved to record information about the state of a
system crash.

● HAL usage This is system memory reserved for HAL-specific structures.
Now that we've described the basic components of the virtual address space in Windows, let's examine the specific layout on the x86, ARM, and x64 platforms.

## x86 address space layouts

By default, each user process on 32-bit versions of Windows has a 2 GB private address space. (The operating system takes the remaining 2 GB.) However, for x86, the system can be configured with the increaseusbv BCD boot option to permit user address spaces up to 3 GB. Two possible address space layouts are shown in Figure 5-10.

The ability of a 32-bit process to grow beyond 2 GB was added to accommodate the need for 32-bit applications to keep more data in memory than could be done with a 2 GB address space. Of course, 64-bit systems provide a much larger address space.

CHAPTER 5     Memory management      349


---

![Figure](figures/Winternals7thPt1_page_367_figure_000.png)

FIGURE 5-10 x86 virtual address space layouts (2 GB on the left, 3 GB on the right).

For a process to grow beyond 2 GB of address space, the image file must have the IMAGE_FILELARGE_ADDRESS_AWARE flag set in the image header (in addition to the global increaseurswa setting). Otherwise, Windows reserves the additional address space for that process so that the application won't see virtual addresses greater than 0x7FFFFFFF. Access to the additional virtual memory is opt-in because some applications assume they'll be given at most 2 GB of the address space. Because the high bit of a pointer referencing an address below 2 GB is always zero (31 bits are needed to reference a 2 GB address space), these applications would use the high bit in their pointers as a flag for their own data—clearing it, of course, before referencing the data. If they ran with a 3 GB address space, they would inadvertently truncate pointers that have values greater than 2 GB, causing program errors, including possible data corruption. You set this flag by specifying the /LARGEADDRESSRAWER linker flag when building the executable. Alternatively, use the Property page in Visual Studio (choose Linker select System, and click Enable Large Addresses). You can add the flag to an executable image even without building (no source code required) by using a tool such as Editbin.exe (part of the Windows SDK tools), assuming the file is not signed. This flag has no effect when running the application on a system with a 2 GB user address space.

Several system images are ranked as large address space aware so that they can take advantage of systems running with large process address spaces. These include the following:

- •
<lsass.exe> The Local Security Authority Subsystem

•
<inetinfo.exe> Internet Information Server

•
<chkdsk.exe> The Check Disk utility
350    CHAPTER 5   Memory management


---

- • Smss.exe The Session Manager

• Dllhst3g.exe A special version of Dllhost.exe (for COM+ applications)
## EXPERIMENT: Checking whether an application is large address aware

You can use the Dumpbin utility from the Visual Studio Tools (and older versions of the Windows SDK) to check other executables to see if they support large address spaces. Use the /headers flag to display the results. Here's a sample output of Dumpbin on the Session Manager:

```bash
dumpbin /headers c:\windows\system32\smss.exe
Microsoft (R) COFFE/PE Dumper Version 14.00.24213.1
Copyright (C) Microsoft Corporation.  All rights reserved.
Dump of file c:\windows\system32\smss.exe
PE signature found
File Type: EXECUTABLE IMAGE
FILE HEADER VALUES
        14C machine (x86)
        5 number of sections
       57898F8A time date stamp Sat Jul 16 04:36:10 2016
           0 file pointer to symbol table
           0 number of symbols
          E0 size of optional header
          122 characteristics
        Executable
             Application can handle large (>2GB) addresses
             32 bit word machine
```

Finally, memory allocations using VirrtuaA11oc, VirrtuaA11ocEx, and VirrtuaA11ocExNuma start with low virtual addresses and grow higher by default. Unless a process allocates a lot of memory or has a very fragmented virtual address space, it will never get back very high virtual addresses. Therefore, for testing purposes, you can force memory allocations to start from high addresses by using the MEM_TOP_DOWN flag to the VirrtuaA11oc* functions or by adding a DWORD registry value named A11ocationPreference to the HKLM\SYSTEM\CurrentControlSet\Controlex\Session Manager\Memory Management key and setting its value to 0x100000.

The following output shows runs of the T estLimit utility (shown in previous experiments) leaking memory on a 32-bit Windows machine booted without the increaseurserv option:

```bash
TestLimit.exe -r
TestLimit v5.24 - test Windows limits
Copyright (C) 2012-2015 Mark Russinovich
Sysinternals - www.sysinternals.com
Process ID: 5500
Reserving private bytes (MB)...
Leaked 1978 MB of reserved memory (1940 MB total leaked). Lasterror: 8
```

---

The process managed to reserve close to the 2 GB limit (but not quite). The process address space

has the EXE code and various DLLs mapped, so naturally it's not possible in a normal process to reserve

the entire address space.

On that same system, you can switch to a 3 GB address space by running the following command

from an administrative command window:

C:\WINDOWS\system32\bcdedit /set increaseuserserva 3072

The operation completed successfully.

Notice that the command allows you to specify any number (in MB) between 2.048 (the 2 GB default) to 3.072 (the 3 GB maximum). After you restart the system so that the setting can take effect, running TestLimit again produces the following:

```bash
TestLimit.exe -r
Testlimit v5.24 - test Windows limits
Copyright (C) 2012-2015 Mark Russinovich
Sysinternals - www.sysinternals.com
Process ID: 2308
Reserving private bytes (MB)...
Leaked 2999 MB of reserved memory (2999 MB total leaked). Lasterror: 8
```

TestLimit was able to leak close to 3 GB, as expected. This is only possible because TestLimit was

linked with /LARGEADDRESSAWARE. Had it not been, the results would have been essentially the same as

on the system booted without increaseurserva.

![Figure](figures/Winternals7thPt1_page_369_figure_007.png)

Note To revert a system to the normal 2 GB address space per process, run the bcdedit / deletevalue increaseusername command.

## x86 system address space layout

The 32-bit versions of Windows implement a dynamic system address space layout by using a virtual address allocator. (We'll describe this functionality later in this section.) There are still a few specifically reserved areas, as shown in Figure 5-10. However, many kernel-mode structures use dynamic address space allocation. These structures are therefore not necessarily virtually contiguous with themselves. Each can easily exist in several disjointed pieces in various areas of system address space. The uses of system address space that are allocated in this way include the following:

- ●  Non-paged pool

●  Paged pool

●  Special pool
---

- ● System PTEs

● System mapped views

● File system cache

● PFN database

● Session space
## x86 session space

For systems with multiple sessions (which is almost always the case, as session 0 is used by system

processes and services, while session 1 is used for the first logged on user), the code and data unique to

each session are mapped into system address space but shared by the processes in that session. Figure

5-11 shows the general layout of session space. The sizes of the components of session space, just like

the rest of kernel system address space, are dynamically configured and resized by the memory man ager on demand.

![Figure](figures/Winternals7thPt1_page_370_figure_003.png)

FIGURE 5-11  x86 session space layout (not proportional).

### EXPERIMENT: Viewing sessions

You can display which processes are members of which sessions by examining the session ID.

You can do this using Task Manager, Process Explorer, or the kernel debugger. Using the kernel

debugger, you can list the active sessions with the !session command as follows:

```bash
1kb+ :1session
Sessions on machine: 3
Valid Sessions: 0 1 2
Current Session 2
```

You can then set the active session using the $session->command and display the address

of the session data structures and the processes in that session with the 1-process command.

```bash
1kb+ 1session = 1
Sessions on machine : 3
```

CHAPTER 5   Memory management     353


---

```bash
Implicit process is now d4921040
Using session 1
  tkd> !sprocess
Dumping Session 1
  _MM_SESSION_SPACE d9306000
  _MMSESSION     d9306c80
  PROCESS d4921040 SessionId: 1  Cid: 01d8   Peb: 00668000  ParentCid: 0138
     DirBase: 179c5080  ObjectTable: 00000000  HandleCount: 0.
     Image: smsr.exe
  PROCESS d186c180  SessionId: 1  Cid: 01ec   Peb: 00401000  ParentCid: 01d8
     DirBase: 179c5040  ObjectTable: d584d8c0  HandleCount: <Data Not Accessible>
     Image: csrsr.exe
  PROCESS d49acc40  SessionId: 1  Cid: 022c   Peb: 03119000  ParentCid: 01d8
     DirBase: 179c50C0  ObjectTable: d232e5c0  HandleCount: <Data Not Accessible>
     Image: winlogon.exe
  PROCESS d0918c0  SessionId: 1  Cid: 0374   Peb: 003c4000  ParentCid: 022c
     DirBase: 179c5160  ObjectTable: d28f6fc0  HandleCount: <Data Not Accessible>
     Image: logonUI.exe
  PROCESS d08e900  SessionId: 1  Cid: 037c   Peb: 00d8b000  ParentCid: 022c
     DirBase: 179c5180  ObjectTable: d249640  HandleCount: <Data Not Accessible>
     Image: dwm.exe
```

To view the details of the session, dump the MM_SESSION_SPACE structure using the dt command, as follows:

```bash
tksd  dt ntl_mm_session_space d9306000
    +0x000 ReferenceCount : 0n4
    +0x004 u             : <unnamed-tag>
    +0x008 SessionId         : 1
    +0x00c ProcessReferenceToSession : 0n6
    +0x010 ProcessList      : _LIST_ENTRY [ 0xd4921128 - 0xdc08e9e8 ]
    +0x018 SessionPageDirectoryIndex : 0x1617f
    +0x01c NonPagablePages  : 0x28
    +0x020 CommittedPages   : 0x290
    +0x024 PagedPoolStart   : 0xc000000 Void
    +0x028 PagedPoolEnd     : 0xffbbbbfff Void
    +0x02c SessionObject     : 0xd49222b0 Void
    +0x030 SessionObjectHandle : 0x800003ac Void
    +0x034 SessionPoolAllLocationFailures : [4] 0
    +0x044 ImageTree       : _RTL_AVL_TREE
    +0x048 LocaleId        : 0x409
    +0x04c AttachCount      : 0
    +0x050 AttachGate      : _KATE
    +0x060 WsListEntry    : _LIST_ENTRY [ 0xcdcde060 - 0xd6307060 ]
    +0x080 Lookaside       : [24] _GENERAL_LOOKASIDE
    +0xc80 Session          : _MMSESSION
  ...
CHAPTER 5  Memory management
                                                               From the Library of
```

---

## EXPERIMENT: Viewing session space utilization

You can view session space memory utilization with the !vm 4 command in the kernel debugger. For example, the following output was taken from a 32-bit Windows client system with a remote desktop connection, resulting in three sessions—the default two sessions plus the remote session. (The addresses are for the MM_SESSION_SPACE objects shown earlier.)

```bash
!kds !vm 4
...
Terminal Server Memory Usage By Session:
Session ID 0 @ d6307000:
Paged Pool Usage:    2012 Kb
NonPaged Usage:      108 Kb
Commit Usage:        2292 Kb
Session ID 1 @ d9306000:
Paged Pool Usage:    2288 Kb
NonPaged Usage:      160 Kb
Commit Usage:        2624 Kb
Session ID 2 @ cdcde000:
Paged Pool Usage:    7740 Kb
NonPaged Usage:      208 Kb
Commit Usage:        8144 Kb
Session Summary
Paged Pool Usage:    12040 Kb
NonPaged Usage:      476 Kb
Commit Usage:        13060 Kb
```

## System page table entries

System page table entries (PTEs) are used to dynamically map system pages such as I/O space, kernel stacks, and the mapping for memory descriptor lists (MDLs, discussed to some extent in Chapter 6). System PTEs aren't an infinite resource. On 32-bit Windows, the number of available system PTEs is such that the system can theoretically describe 2 GB of contiguous system virtual address space. On Windows 10 64 bit and Server 2016, system PTEs can describe up to 16 TB of contiguous virtual address space.

## EXPERIMENT: Viewing system PTE information

You can see how many system PTEs are available by examining the value of the Memory: Free System Page Table Entries counter in Performance Monitor or by using the !sysptes or !vm command in the debugger. You can also dump the _MI_SYSTEM_PTE_TYPE structure as part of the memory state (MIState) variable (or the MISystemT eInfo global variable on Windows 8.x/2012/R2). This will also show you how many PTE allocation failures occurred on the system. A high count indicates a problem and possibly a system PTE leak.

CHAPTER 5     Memory management      355


---

```bash
kd> !syptes
  System PTE Information
    Total System Ptes 216560
    starting PTE: c0400000
    free blocks: 969   total free: 16334   largest free block: 264
  kd> ? MiState
  Evaluate expression: -2128443008 = 81228980
  kd> dt nt!\_MI_SYSTEM_INFORMATION SystemPtes
    +0x3040 SystemPtes : _MI_SYSTEM_PTE_STATE
  kd> dt nt!\_mi_system_pte_state SystemViewPteInfo 81228980+3040
    +0x10c SystemViewPteInfo : _MI_SYSTEM_PTE_TYPE
  kd> dt nt!\_mi_system_pte_type 81228980+3040+10c
    +0x000 Bitmap        : _RTL_BITMAP
    +0x008 BasePte       : 0xc0400000  _MMPTE
    +0x00c Flags          : 0xe
    +0x010 VaType         : c ( MiVaDriverImages )
    +0x014 FailureCount      : 0x8122bae4  -> 0
    +0x018 PteFailures      : 0
    +0x01c SpinLock        : 0
    +0x01c GlobalPushButton : (null)
    +0x020 Vm             : 0x8122c008 _MMSUPPORT_INSTANCE
    +0x024 TotalSystemPtes : 0x120
    +0x028 Hint            : 0x2576
    +0x02c LowestBitEverAllocated : 0xc80
    +0x030 CachedPtes      : (null)
    +0x034 TotalFreeSystemPtes : 0x73
  If you are seeing lots of system PTE failures, you can enable system PTE tracking by creating a
  new DWORD value in the HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory
  Management key called TrackPtes and setting its value to 1. You can then use !syptes 4 to
  show a list of allocators.
```

## ARM address space layout

As shown in Figure 5-12, the ARM address space layout is nearly identical to the x86 address space. The memory manager treats ARM-based systems exactly as x86 systems in terms of pure memory management. The differences are at the address translation layer, described in the section "Address translation" later in this chapter.

356    CHAPTER 5   Memory management


---

FIGURE 5-12 ARM virtual address space layout.

64-bit address layout

The theoretical 64-bit virtual address space is 16 exabytes (EB), or 18,446,744,073,709,551,616 bytes. Current processor limitations allow for 48 address lines only, limiting the possible address space to 256 TB (2 to the 48th power). The address space is divided in half, where the lower 128 TB are available as private user processes and the upper 128 TB are system space. System space is divided into several different-sized regions (Windows 10 and Server 2016), as shown in Figure 5-13. Clearly, 64 bits provides a tremendous leap in terms of address space sizes as opposed to 32 bit. The actual starts of various kernel sections are not necessarily those shown, as ASLR is in effect in kernel space in the latest versions of Windows.

CHAPTER 5 Memory management 357


---

![Figure](figures/Winternals7thPt1_page_375_figure_000.png)

FIGURE 5-13 x64 address space layout.

![Figure](figures/Winternals7thPt1_page_375_figure_002.png)

Note Windows 8 and Server 2012 are limited to 16 TB of address space. This is because of

Windows implementation limitations, described in Chapter 10 of the sixth edition of Windows

Internals Part 2. Of these, 8 TB is per process and the other 8 TB is used for system space.

Thirty-two-bit images that are large address space aware receive an extra benefit while running on 64-bit Windows (under Wow64). Such an image will actually receive all 4 GB of user address space available. After all, if the image can support 3 GB pointers, 4 GB pointers should not be any different, because unlike the switch from 2 GB to 3 GB, there are no additional bits involved. The following output shows TestLimit running as a 32-bit application, reserving address space on a 64-bit Windows machine.

```bash
C:\Tools\Sysinternals>Testlimit.exe -r
Testlimit v5.24 - test Windows limits
Copyright (C) 2012-2015 Mark Russinovich
Sysinternals - www.sysinternals.com
Process ID: 264
Reserving private bytes (MB)...
Leaked 4008 MB of reserved memory (4008 MB total leaked). Lasterror: 8
Not enough storage is available to process this command.
CHAPTER 5   Memory management
```

---

These results depend on TestLimit having been linked with the /LARGEADDRESSAWARE option. Had it not been, the results would have been about 2 GB for each. Sixty-four-bit applications linked without / LARGEADDRESSAWARE are constrained to the first 2 GB of the process virtual address space, just like 32bit applications. (This flag is set by default in Visual Studio for 64-bit builds.)

## x64 virtual addressing limitations

As discussed, 64 bits of virtual address space allow for a possible maximum of 16 EB of virtual memory —a notable improvement over the 4 GB offered by 32-bit addressing. Obviously, neither today's computers nor tomorrow's are even close to requiring support for that much memory.

Accordingly, to simplify chip architecture and avoid unnecessary overhead—particularly in address translation (described later)—AMD's and Intel's current x64 processors implement only 256 TB of virtual address space. That is, only the low-order 48 bits of a 64-bit virtual address are implemented. However, virtual addresses are still 64 bits wide, occupying 8 bytes in registers or when stored in memory. The high-order 16 bits (bits 48 through 63) must be set to the same value as the highest-order implemented bit (bit 47), in a manner similar to sign extension in two's complement arithmetic. An address that conforms to this rule is said to be a canonical address.

Under these rules, the bottom half of the address space starts at 0x0000000000000000 as expected, but ends at 0x00007FFFFFFFCCC. The top half of the address space starts at 0xFFFF800000000000 and ends at 0xFFFFFFFFFFFFFFF. Each canonical portion is 128 TB. As newer processors implement more of the address bits, the lower half of memory will expand upward toward 0x7FFFFFFFFFFFFF, while the upper half will expand downward toward 0x8000000000000000.

## Dynamic system virtual address space management

Thirty-two-bit versions of Windows manage the system address space through an internal kernel vir tual allocator mechanism, described in this section. Currently, 64-bit versions of Windows have no need

to use the allocator for virtual address space management (and thus bypass the cost) because each

region is statically defined (refer to Figure 5-13).

When the system initializes, the MInitializeDynamicCva function sets up the basic dynamic ranges

and sets the available virtual address to all available kernel space. It then initializes the address space

ranges for boot loader images, process space (hyperspace), and the HAL through the MInitialize SystemVairaRange function, which is used to set hard-coded address ranges (on 32-bit systems only).

Later, when non-paged pool is initialized, this function is used again to reserve the virtual address

ranges for it. Finally, whenever a driver loads, the address range is relabeled to a driver-image range

instead of a boot-loaded range.

After this point, the rest of the system virtual address space can be dynamically requested and learned through MObtainSystemVla (and its analogous MObtainServices onVa) and MReturnSystemVa. Operations such as expanding the system cache, the system PTEs, non-paged pool, paged pool, and/or special pool; mapping memory with large pages; creating the PFN database; and creating a new session all result in dynamic virtual address allocations for a specific range.

CHAPTER 5   Memory management     359


---

Each time the kernel virtual address space allocator obtains virtual memory ranges for use by a certain

type of virtual address, it updates the MSystemVatType array, which contains the virtual address type for

the newly allocated range. The values that can appear in MSystemVatType are shown in Table 5-8.

TABLE 5-8 System virtual address types

<table><tr><td>Region</td><td>Description</td><td>Limitable</td></tr><tr><td>MiVaUnused (0)</td><td>Unused</td><td>N/A</td></tr><tr><td>MiVaSessionSpace (1)</td><td>Addresses for session space</td><td>Yes</td></tr><tr><td>MiVaProcessSpace (2)</td><td>Addresses for process address space</td><td>No</td></tr><tr><td>MiVaBootLoaded (3)</td><td>Addresses for images loaded by the boot loader</td><td>No</td></tr><tr><td>MiVaPfnDatabase (4)</td><td>Addresses for the PFN database</td><td>No</td></tr><tr><td>MiVaNonPagedPool (5)</td><td>Addresses for the non-paged pool</td><td>Yes</td></tr><tr><td>MiVaPagedPool (6)</td><td>Addresses for the paged pool</td><td>Yes</td></tr><tr><td>MiVaSpecialPoolPaged (7)</td><td>Addresses for the special pool (paged)</td><td>No</td></tr><tr><td>MiVaSystemCache (8)</td><td>Addresses for the system cache</td><td>No</td></tr><tr><td>MiVaSystemPtes (9)</td><td>Addresses for system PTEs</td><td>Yes</td></tr><tr><td>MiVaHal (10)</td><td>Addresses for the HAL</td><td>No</td></tr><tr><td>MiVaSessionGlobalSpace (11)</td><td>Addresses for session global space</td><td>No</td></tr><tr><td>MiVaDriverImages (12)</td><td>Addresses for loaded driver images</td><td>No</td></tr><tr><td>MiVaSpecialPoolNonPaged (13)</td><td>Addresses for the special pool (non-paged)</td><td>Yes</td></tr><tr><td>MiVaSystemPtesLarge (14)</td><td>Addresses for large page PTEs</td><td>Yes</td></tr></table>


Although the ability to dynamically reserve virtual address space on demand allows better management of virtual memory, it would be useless without the ability to free this memory. As such, when the paged pool or system cache can be shrunk, or when special pool and large page mappings are freed, the associated virtual address is freed. Another case is when the boot registry is released. This allows dynamic management of memory depending on each component's use. Additionally, components can reclaim memory through MlRelaInsystemVla, which requests virtual addresses associated with the system cache to be flushed out (through the dereference segment thread) if available virtual address space has dropped below 128 MB. Reclaiming can also be satisfied if initial non-paged pool has been freed.

In addition to better proportioning and better management of virtual addresses dedicated to different kernel memory consumers, the dynamic virtual address allocator also has advantages when it comes to memory footprint reduction. Instead of having to manually pre-allocate static page table entries and page tables, paging-related structures are allocated on demand. On both 32-bit and 64-bit systems, this reduces boot-time memory usage because unused addresses won’t have their page tables allocated. It also means that on 64-bit systems, the large address space regions that are reserved don’t need to have their page tables mapped in memory. This allows them to have arbitrarily large limits, especially on systems that have little physical RAM to back the resulting paging structures.

360    CHAPTER 5   Memory management


---

## EXPERIMENT: Querying system virtual address usage (Windows 10 and Server 2016)

You can look at the current and peak usage of each system virtual address type by using the kernel debugger. The global variable MiVisibleState (of type MI_VISIBLE_STATE) provides information available in the public symbols. (The example is on x86 Windows 10.)

1. To get a sense of the data provided by MiVisibleState, dump the structure with values:

```bash
!kdt dt nti_mi_visible_state poi(ntiMiVisibleState)
+0x000 SpecialPool      :_MI_SPECIAL_POOL
+0x048 SessionWlist       :_LIST_ENTRY []0x91364060 - 0xa9172060 ]
+0x050 SessionBitmap   :_0x820c3a0_RBT_BITMAP
+0x054 PagedPoolInfo    :_MM_PACED_POOL_INFO
+0x070 MaximumNonPagedPoolInPages : 0x80000
+0x074 SizeOfPagedPoolInPages : 0x7fc00
+0x078 SystemPteInfo      :_MI_SYSTEM_PTE_TYPE
+0x0b0 NonPagedPoolCommit :0x3272
+0x0b4 BootCommit      :0x186d
+0x0b8 MdPagesAllocated :0x105
+0x0bc SystemPageTableCommit : 0x1e1
+0x0c0 SpecialPagesInUse : 0
+0x0c4 WsOverheadPages : 0x775
+0x0c8 VadBitmapPages : 0x30
+0x0cc ProcessCommit : 0x040
+0x0d0 SharedCommit : 0x712a
+0x0d4 DriverCommit : 0x7276
+0x100 SystemWs         :[3] _MMSUPPORT_FULL
+0x2c0 SystemCacheShared : _MMSSUPPORT_SHARED
+0x2e4 MapCacheFailures : 0
+0x2e8 PageFileHashPages : 0x30
+0x2ee PteHeader      : _SYSPTES_HEADER
+0x378 SessionSpecialPool : 0x85201f48 _MI_SPECIAL_POOL
+0x37c SystemValTypeCount : [15] 0
+0x3b SystemValType       : [1024] ""
+0x7b SystemValTypeCountFailures : [15] 0
+0x7f SystemValTypeCountLimit : [15] 0
+0x830 SystemValTypeCountPeak : [15] 0
+0x86c SystemAvailableIvea : 0x38800000
```

2. Notice the last arrays with 15 elements each, corresponding to the system virtual

address types from T able 5-8. Here are the SystemVaT ypeCount and SystemVaT ype CountPeak arrays:

```bash
!kdc dt nt!\mi_visible_state poi(nt!\mivisiblestate) -a SystemVaTypeCount
+0x37c SystemVaTypeCount :
    [00] 0
    [01] 0x1c
    [02] 0xb
    [03] 0x15
    [04] 0xf
    [05] 0x1b
```

CHAPTER 5     Memory management      361


---

```bash
[06] 0x46
        [07] 0
        [08] 0x125
        [09] 0x38
        [10] 2
        [11] 0xb
        [12] 0x19
        [13] 0
        [14] 0xd
        \kd< dt ntl_mi_visible_state poi(ntlmivisiblestate) -a SystemVaTypeCountPeak
            +0x830 SystemVaTypeCountPeak :
            [00] 0
            [01] 0x1f
            [02] 0
            [03] 0x1f
            [04] 0xf
            [05] 0x1d
            [06] 0x51
            [07] 0
            [08] 0x1e6
            [09] 0x55
            [10] 0
            [11] 0xb
            [12] 0x5d
            [13] 0
            [14] 0xe
```

## EXPERIMENT: Querying system virtual address usage (Windows 8.x and Server 2012/R2)

You can look at the current and peak usage of each system virtual address type by using the kernel debugger. For each system virtual address type described in Table 5-8, the M1SystemVaT ypeCount, M1SystemVaT ypeCountFailures, and M1SystemVaT ypeCountPeak global arrays in the kernel contain the sizes, count failures, and peak sizes for each type. The size is in multiples of a PDE mapping (see the "Address translation" section later in this chapter), which is effectively the size of a large page (2 MB on x86). Here's how you can dump the usage for the system, followed by the peak usage. You can use a similar technique for the failure counts. (The example is from a 32-bit Windows 8.1 system.)

```bash
1kds-dd /c 1 MiSystemVaTypeCount L f
 81c16640 00000000
 81c16644 0000001e
 81c16648 0000000b
 81c1664c 00000018
 81c16650 0000000f
 81c16654 00000017
 81c16658 0000005f
 81c1665c 00000000
 81c16660 000000c7
CHAPTER 5 Memory management
From the Library of
```

---

```bash
81c16664  00000021
  81c16668  00000002
  81c1666c  00000008
  81c16670  0000001c
  81c16674  00000000
  81c16678  0000000b
  1kds-dd / c l MiSystemVaTypeCountPeak L f
  81c16b60  00000000
  81c16b64  00000021
  81c16b68  00000000
  81c16b6c  00000022
  81c16b70  0000000f
  81c16b74  0000001e
  81c16b78  0000007e
  81c16b7c  00000000
  81c16b80  000000e3
  81c16b84  00000027
  81c16b88  00000000
  81c16b8c  00000008
  81c16b90  00000059
  81c16b94  00000000
  81c16b98  0000000b
```

Theoretically, the different virtual address ranges assigned to components can grow arbitrarily in size if enough system virtual address space is available. In practice, on 32-bit systems, the kernel allocator implements the ability to set limits on each virtual address type for the purposes of both reliability and stability. (On 64-bit systems, kernel address space exhaustion is currently not a concern.) Although no limits are imposed by default, system administrators can use the registry to modify these limits for the virtual address types that are currently marked as limitable (see Table 5-8).

If the current request during the MObtainSystemV4 call exceeds the available limit, a failure is marked (see the previous experiment) and a reclaim operation is requested regardless of available memory. This should help alleviate memory load and might allow the virtual address allocation to work during the next attempt. Recall, however, that reclaiming affects only system cache and non-paged pool.

## EXPERIMENT: Setting system virtual address limits

The MsiSystemValueCountLimit array contains limitations for system virtual address usage

that can be set for each type. Currently, the memory manager allows only certain virtual address

types to be limited, and it provides the ability to use an undocumented system call to set limits

for the system dynamically during run time. (These limits can also be set through the registry, as

described at http://msdn.microsoft.com/en-us/library/bb870880.aspx.) These limits can be set for

those types marked in Table 5-8.

You can use the MemLimit utility (found in this book's downloadable resources) on 32-bit systems to query and set the different limits for these types and to see the current and peak virtual address space usage. Here's how you can query the current limits with the -q flag:

CHAPTER 5   Memory management      363


---

```bash
C:\Tools>\MemLimit.exe -q
  MemLimit v1.01 - Query and set hard limits on system VA space consumption
  Copyright (C) 2008-2016 by Alex Ionescu
  www.alex-ionescu.com
  System Va Consumption:
  Type                Current                Peak                Limit
  Non Paged Pool        45056 KB      55296 KB      0 KB
  Paged Pool            15152 KB      165888 KB      0 KB
  System Cache          446464 KB      479232 KB      0 KB
  System PTEs           90112 KB      135168 KB      0 KB
  Session Space         63488 KB      73728 KB      0 KB
    As an experiment, use the following command to set a limit of 100 MB for paged pool:
  memLimit.exe -p 100M
    Now use the Sysinternals TestLimit tool to create as many handles as possible. Normally, with
  enough paged pool, the number should be around 16 million. But with the limit to 100 MB, it's less:
  C:\Tools\Sysinternals\TestLimit.exe -h
  TestLimit v5.24 - test Windows limits
  Copyright (C) 2012-2015 Mark Russinovich
  Sysinternals - www.sysinternals.com
  Process ID: 4780
  Creating handles...
  Created 10727844 handles. Lasterror: 1450
    See Chapter 8 in Part 2 for more information about objects, handles, and page-pool con-
  sumption.
```

## System virtual address space quotas

The system virtual address space limits described in the previous section allow for the limiting of system-wide virtual address space usage of certain kernel components. However, they work only on 32-bit systems when applied to the system as a whole. T o address more specific quota requirements that system administrators might have, the memory manager collaborates with the process manager to enforce either system-wide or user-specific quotas for each process.

You can configure the PagedPoolQota, NonPagedPoolQota, PagingFileQota, and Working SetPagesQota values in the HKLM\SYSTEM\CurrentControlSet\Control\SessionManager\Memory

Management key to specify how much memory of each type a given process can use. This information

is read at initialization, and the default system quota block is generated and then assigned to all system

processes. (User processes get a copy of the default system quota block unless per-user quotas have

been configured, as explained next.)

---

To enable per-user quotas, you can create subkeys under the HKLM\SYSTEM\CurrentControlSet\ Session Manager\Quota System registry key, each one representing a given user SID. The values mentioned previously can then be created under this specific SID subkey, enforcing the limits only for the processes created by that user. Table 5-9 shows how to configure these values (which can be done at run time or not) and which privileges are required.

TABLE 5-9 Process quota types

<table><tr><td>Value Name</td><td>Description</td><td>Value Type</td><td>Dynamic</td><td>Privilege</td></tr><tr><td>PagedPoolQuota</td><td>This is the maximum size of paged pool that can be allocated by this process.</td><td>Size in MB</td><td>Only for processes running with the system token</td><td>SeIncreaseQuotaPrivilege</td></tr><tr><td>NonPagedPoolQuota</td><td>This is the maximum size of non-paged pool that can be allocated by this process.</td><td>Size in MB</td><td>Only for processes running with the system token</td><td>SeIncreaseQuotaPrivilege</td></tr><tr><td>PagingFileQuota</td><td>This is the maximum number of pages that a process can have backed by the page file.</td><td>Pages</td><td>Only for processes running with the system token</td><td>SeIncreaseQuotaPrivilege</td></tr><tr><td>WorkingSetPagesQuota</td><td>This is the maximum number of pages that a process can have in its working set (in physical memory).</td><td>Pages</td><td>Yes</td><td>SeIncreaseBasePriorityPrivilege unless operation is a purge request</td></tr></table>


## User address space layout

Just as address space in the kernel is dynamic, the user address space is also built dynamically. The addresses of the thread stacks, process heaps, and loaded images (such as DLLs and an application's executable) are dynamically computed (if the application and its images support it) through the ASLR mechanism.

At the operating system level, user address space is divided into a few well-defined regions of memory, as shown in Figure 5-14. The executable and DLLs themselves are present as memory-mapped image files, followed by the heap(s) of the process and the stack(s) of its thread(s). Apart from these regions (and some reserved system structures such as the TEBs and PEB), all other memory allocations are run-time dependent and generated. ASLR is involved with the location of all these run timedependent regions and, combined with DEP, provides a mechanism for making remote exploitation of a system through memory manipulation harder to achieve. Because Windows code and data are placed at dynamic locations, an attacker cannot typically hard-code a meaningful offset into either a program or a system-supplied DLL.

CHAPTER 5     Memory management      365


---

![Figure](figures/Winternals7thPt1_page_383_figure_000.png)

FIGURE 5-14 User address space layout with ASLR enabled.

## EXPERIMENT: Analyzing user virtual address space

The VMMap utility from Sysinternals can show you a detailed view of the virtual memory being used by any process on your machine. This information is divided into categories for each type of allocation, summarized as follows:

- ■ Image This displays memory allocations used to map the executable and its dependencies (such as dynamic libraries) and any other memory-mapped image (portable executable format) files.

■ Mapped File This displays memory allocations for memory mapped data files.

■ Shareable This displays memory allocations marked as shareable, typically including shared memory (but not memory-mapped files, which are listed under either Image or Mapped File).

■ Heap This displays memory allocated for the heap(s) that this process owns.

■ Managed Heap This displays memory allocated by the .NET CLR (managed objects). It would show nothing for a process that does not use .NET.

■ Stack This displays memory allocated for the stack of each thread in this process.

■ Private Data This displays memory allocations marked as private other than the stack and heap, such as internal data structures.
The following shows a typical view of Explorer (64 bit) as seen through VMMap:

---

![Figure](figures/Winternals7thPt1_page_384_figure_000.png)

Depending on the type of memory allocation, VMMap can show additional information such

as file names (for mapped files), heap IDs and types (for heap allocations), and thread IDs (for

stack allocations). Furthermore, each allocation's cost is shown both in committed memory and

working set memory. The size and protection of each allocation is also displayed.

ASLR begins at the image level, with the executable for the process and its dependent DLLs. Any image file that has specified ASLR support in its PE header (IMAGE_DLL_CHARACTERISTICS_DYNAMIC_ BASE), typically specified by using the /DYNAMICBASE linker flag in Microsoft Visual Studio, and contains a relocation section will be processed by ASLR. When such an image is found, the system selects an image offset valid globally for the current boot. This offset is selected from a bucket of 256 values, all of which are 64 KB aligned.

## Image randomization

For executables, the load offset is calculated by computing a delta value each time an executable is

loaded. This value is a pseudo-random 8-bit number from 0x10000 to 0xFE0000, calculated by taking

the current processor's time stamp counter (TSC), shifting it by four places, and then performing a

division modulo 254 and adding 1. This number is then multiplied by the allocation granularity of 64 KB

discussed earlier. By adding 1, the memory manager ensures that the value can never be 0, so executa bles will never load at the address in the PE header if ASLR is being used. This delta is then added to the

executable's preferred load address, creating one of 256 possible locations within 16 MB of the image

address in the PE header.

CHAPTER 5     Memory management      367


---

For DLLs, computing the load offset begins with a per-boot, system-wide value called the image

bias. This is computed by MInitializeRelocations and stored in the global memory state structure

(MI_SYSTEM_INFORMATION) in the MlState.Sections.ImageB1 as fields (MlImageB1 as global variable

in Windows 8.x/2012/R2). This value corresponds to the TSC of the current CPU when this function was

called during the boot cycle, shifted and masked into an 8-bit value. This provides 256 possible values

on 32 bit systems; similar computations are done for 64-bit systems with more possible values as the

address space is vast. Unlike executables, this value is computed only once per boot and shared across

the system to allow DLLs to remain shared in physical memory and relocated only once. If DLLs were

remapped at different locations inside different processes, the code could not be shared. The loader

would have to fix up address references differently for each process, thus turning what had been share able read-only code into process-private data. Each process using a given DLL would have to have its

own private copy of the DLL in physical memory.

Once the offset is computed, the memory manager initializes a bitmap called ImageBitmap (MImageBitmap global variable in Windows 8.x/2012/R2), which is part of the MT_SECTION1_STATE structure. This bitmap is used to represent ranges from 0x50000000 to 0x78000000 for 32-bit systems (see the numbers for 64-bit systems below), and each bit represents one unit of allocation (64 KB, as mentioned). Whenever the memory manager loads a DLL, the appropriate bit is set to mark its location in the system. When the same DLL is loaded again, the memory manager shares its section object with the already relocated information.

As each DLL is loaded, the system scans the bitmap from top to bottom for free bits. The ImageBia's value computed earlier is used as a start index from the top to randomize the load across different boots as suggested. Because the bitmap will be entirely empty when the first DLL (which is always Ntdll, dll) is loaded, its load address can easily be calculated. (Sixty-four-bit systems have their own bias.)

- ■ 32 bit 0x78000000 - (ImageBias + NtD1[Sizein64KBChunks] * 0x10000

■ 64 bit 0x7FFFFF0000 - (ImageBias64High + NtD1[Sizein64KBChunks] * 0x10000
Each subsequent DLL will then load in a 64 KB chunk below. Because of this, if the address of Ntdll.

dll is known, the addresses of other DLLs could easily be computed. To mitigate this possibility, the or der in which known DLLs are mapped by the Session Manager during initialization is also randomized

when Smss.exe loads.

Finally, if no free space is available in the bitmap (which would mean that most of the region defined

for ASLR is in use), the DLL relocation code defaults back to the executable case, loading the DLL at a 64

KB chunk within 16 MB of its preferred base address.

EXPERIMENT: Calculating the load address of Ntdll.dll

With what you learned in the previous section, you can calculate the load address of Ntldll.dll with the kernel variable information. The following calculation is done on a Windows 10 x86 system:

1. Start local kernel debugging.

---

2. Find the ImageBias value:

```bash
tkd- ? nt!mistate
Evaluate expression: -2113373760 = 820879c0
tkd- dt_nti_mi_system_information sections.imagebias 820879c0
  +0x500 Sections        :
    +0x0dc ImageBias       : 0x6e
```

3. Open Explorer and find the size of Ntll.dll in the System32 directory. On this system, it's 1547 KB = 0x182c00, so the size in 64 KB chunks is 0x19 (always rounding up). The result is 0x78000000 - (0x6E + 0x19) * 0x10000 = 0x7790000.

4. Open Process Explorer, find any process, and look at the load address (in the Base or Image Base columns) of Ndtll.dll. You should see the same value.

5. Try to do the same for a 64-bit system.

## Stack randomization

The next step in ASLR is to randomize the location of the initial thread's stack and, subsequently, of each new thread. This randomization is enabled unless the StackRandomizationDisabled flag was enabled for the process, and consists of first selecting one of 32 possible stack locations separated by either 64 KB or 256 KB. You select this base address by finding the first appropriate free memory region and then choosing the xth available region, where x is once again generated based on the current processor's TSC shifted and masked into a 5-bit value. (This allows for 32 possible locations.)

When this base address has been selected, a new TSC-derived value is calculated—this one 9 bits

long. The value is then multiplied by 4 to maintain alignment, which means it can be as large as 2,048

bytes (half a page). It is added to the base address to obtain the final stack base.

## Heap randomization

ASLR randomizes the location of the initial process heap and subsequent heaps when created in user mode. The Rt1CreateHeap function uses another pseudo-random TSC-derived value to determine the base address of the heap. This value, 5 bits this time, is multiplied by 64 KB to generate the final base address, starting at 0, giving a possible range of 0x00000000 to 0x001F0000 for the initial heap. Additionally, the range before the heap base address is manually deallocated to force an access violation if an attack is doing a brute-force sweep of the entire possible heap address range.

## ASLR in kernel address space

ASLR is also active in kernel address space. There are 64 possible load addresses for 32-bit drivers and

256 for 64-bit drivers. Relocating user-space images requires a significant amount of work area in

kernel space, but if kernel space is tight, ASLR can use the user-mode address space of the System pro cess for this work area. On Windows 10 (version 1607) and Server 2016, ASLR is implemented for most

system memory regions, such as paged and non-paged pools, system cache, page tables, and the PFN

database (initialized by M1AssignToPLeveIRanges).

CHAPTER 5     Memory management      369


---

## Controlling security mitigations

As you've seen, ASLR and many other security mitigations in Windows are optional because of their potential compatibility effects: ASLR applies only to images with the IMAGE_DLL_CHARACTERISTICS_ DYNAMIC_BASE bit in their image headers, hardware no-execute (DEP) can be controlled by a combination of boot options and linker options, and so on. T o allow both enterprise customers and individual users more visibility and control of these features, Microsoft publishes the Enhanced Mitigation Experience Toolkit (EMET). EMET offers centralized control of the mitigations built into Windows and adds several more mitigations not yet part of the Windows product. Additionally, EMET provides notification capabilities through the event log to let administrators know when certain software has experienced access faults because mitigations have been applied. Finally, EMET enables manual opt-out for certain applications that might exhibit compatibility issues in certain environments, even though they were opted in by the developer.

![Figure](figures/Winternals7thPt1_page_387_figure_002.png)

Note EMET is in version 5.5 at the time of this writing. Its end of support has been extended

to the end of July 2018. However, some of its features are integrated in current Windows

versions.

EXPERIMENT: Looking at ASLR protection on processes

You can use Process Explorer from Sysinternals to look over your processes (and, just as important, the DLLs they load) to see if they support ASLR. Even if just one DLL loaded by a process does not support ASLR, it can make the process much more vulnerable to attacks.

To look at the ASLR status for processes, follow these steps:

- 1. Right-click any column in the process tree and choose Select Columns.

2. Select ASLR Enabled on the Process Image and DLL tabs.

3. Notice that all in-box Windows programs and services are running with ASLR enabled,
but third-party applications may or may not run with ASLR.
In the example, we have highlighted the Notepad.exe process. In this case, its load address is 0x7FFD76B0000. If you were to close all instances of Notepad and then start another, you would find it at a different load address. If you shut down and reboot the system and then try the experiment again, you will find that the ASLR-enabled DLLs are at different load addresses after each boot.

---

![Figure](figures/Winternals7thPt1_page_388_figure_000.png)

