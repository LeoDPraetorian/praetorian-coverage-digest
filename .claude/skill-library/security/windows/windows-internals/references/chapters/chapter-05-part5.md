## PFN data structures

Although PFN database entries are of fixed length, they can be in several different states, depending on the state of the page. Thus, individual fields have different meanings depending on the state. Figure 5-39 shows the formats of PFN entries for different states.

![Figure](figures/Winternals7thPt1_page_457_figure_002.png)

FIGURE 5-39 States of PFN database entries (specific layouts are conceptual).

Several fields are the same for several PFN types, but others are specific to a given type of PFN. The following fields appear in more than one PFN type:

- ■ PTE address This is the virtual address of the PTE that points to this page. Also, since PTE
addresses will always be aligned on a 4-byte boundary (8 bytes on 64-bit systems), the two
low-order bits are used as a locking mechanism to serialize access to the PFN entry.
■ Reference count This is the number of references to this page. The reference count is incre-
mented when a page is first added to a working set and/or when the page is locked in memory for
I/O (for example, by a device driver). The reference count is decremented when the share count be-
comes 0 or when pages are unlocked from memory. When the share count becomes 0, the page is
no longer owned by a working set. Then, if the reference count is also zero, the PFN database entry
that describes the page is updated to add the page to the free, standby, or modified list.
■ Type This is the type of page represented by this PFN. (Types include active/valid, standby,
modified, modified-no-write, free, zeroed, bad, and transition.)
■ Flags The information contained in the flags field is shown in Table 5-20.
■ Priority This is the priority associated with this PFN, which will determine on which standby
list it will be placed.

CHAPTER 5 Memory management

From the Library of
---

- ■  Original PTE contents  All PFN database entries contain the original contents of the PTE that
pointed to the page (which could be a prototype PTE). Saving the contents of the PTE allows it
to be restored when the physical page is no longer resident. PFN entries for AWE allocations are
exceptions; they store the AWE reference count in this field instead.
■  PFN of PTE  This is the physical page number of the page table page containing the PTE that
points to this page.
■  Color Besides being linked together on a list, PFN database entries use an additional field to
link physical pages by "color," which is the page's NUMA node number.
■  Flags A second flags field is used to encode additional information on the PTE. These flags are
described in Table 5-21.
TABLE 5-20 Flags within PFN database entries

<table><tr><td>Flag</td><td>Meaning</td></tr><tr><td>Write in progress</td><td>This indicates that a page write operation is in progress. The first DWORD contains the address of the event object that will be signaled when the I/O is complete.</td></tr><tr><td>Modified state</td><td>This indicates whether the page was modified. (If the page was modified, its contents must be saved to disk before removing it from memory.)</td></tr><tr><td>Read in progress</td><td>This indicates that an in-page operation is in progress for the page. The first DWORD contains the address of the event object that will be signaled when the I/O is complete.</td></tr><tr><td>ROM</td><td>This indicates that this page comes from the computer&#x27;s firmware or another piece of read-only memory such as a device register.</td></tr><tr><td>In-page error</td><td>This indicates that an I/O error occurred during the in-page operation on this page. (In this case, the first field in the PFN contains the error code.)</td></tr><tr><td>Kernel stack</td><td>This indicates that this page is being used to contain a kernel stack. In this case, the PFN entry contains the owner of the stack and the next stack PFN for this thread.</td></tr><tr><td>Removal requested</td><td>This indicates that the page is the target of a remove (due to ECC/scrubbing or hot memory removal).</td></tr><tr><td>Parity error</td><td>This indicates that the physical page contains parity or error correction control errors.</td></tr></table>


TABLE 5-21 Secondary flags within PFN database entries

<table><tr><td>Flag</td><td>Meaning</td></tr><tr><td>PFN image verified</td><td>This indicates that the code signature for this PFN (contained in the cryptographic signature catalog for the image being backed by this PFN) has been verified.</td></tr><tr><td>AWE allocation</td><td>This indicates that this PFN backs an AWE allocation.</td></tr><tr><td>Prototype PTE</td><td>This indicates that the PTE referenced by the PFN entry is a prototype PTE. For example, this page is shareable.</td></tr></table>


The remaining fields are specific to the type of PFN. For example, the first PFN in Figure 5-39 repre sents a page that is active and part of a working set. The share count field represents the number of PTEs

that refer to this page. (Pages marked read-only, copy-on-write, or shared read/write can be shared by

multiple processes.) For page table pages, this field is the number of valid and transition PTEs in the page

table. As long as the share count is greater than 0, the page isn't eligible for removal from memory.

CHAPTER 5     Memory management      441


---

The working set index field is an index into the process working set list (or the system or session working set list, or zero if not in any working set) where the virtual address that maps this physical page resides. If the page is a private page, the working set index field refers directly to the entry in the working set list because the page is mapped only at a single virtual address. In the case of a shared page, the working set index is a hint that is guaranteed to be correct only for the first process that made the page valid. (Other processes will try to use the same index where possible.) The process that initially sets this field is guaranteed to refer to the proper index and doesn't need to add a working set list hash entry referenced by the virtual address into its working set hash tree. This guarantee reduces the size of the working set hash tree and makes searches faster for these entries.

The second PFN in Figure 5-39 is for a page on either the standby or the modified list. In this case, the forward and backward link fields link the elements of the list together within the list. This linking allows pages to be easily manipulated to satisfy page faults. When a page is on one of the lists, the share count is by definition 0 (because no working set is using the page) and therefore can be overlaid with the backward link. The reference count is also 0 if the page is on one of the lists. If it is non-zero (because an I/O could be in progress for this page—for example, when the page is being written to disk), it is first removed from the list.

The third PFN in Figure 5-39 is for a page that belongs to a kernel stack. As mentioned earlier, kernel stacks in Windows are dynamically allocated, expanded, and freed whenever a callback to user mode is performed and/or returns, or when a driver performs a callback and requests stack expansion. For these PFNs, the memory manager must keep track of the thread actually associated with the kernel stack, or if it is free it keeps a link to the next free look-aside stack.

The fourth PFN in Figure 5-39 is for a page that has an I/O in progress (for example, a page read).

While the I/O is in progress, the first field points to an event object that will be signaled when the I/O

completes. If an in-page error occurs, this field contains the Windows error status code representing

the I/O error. This PFN type is used to resolve collided page faults.

In addition to the PFN database, the system variables in Table 5-22 describe the overall state of

physical memory.

TABLE 5-22 System variables that describe physical memory

<table><tr><td>Variable (Windows 10 and Server 2016)</td><td>Variable (Windows 8.x and Server 2012/R2)</td><td>Description</td></tr><tr><td>MiSystemPartition.Vp.NumberOfPhysicalPages</td><td>MmNumberOfPhysicalPages</td><td>This is the total number of physical pages available on the system.</td></tr><tr><td>MiSystemPartition.Vp.AvailablePages</td><td>MmAvailablePages</td><td>This is the total number of available pages on the system—the sum of the pages on the zeroed, free, and standby lists.</td></tr><tr><td>MiSystemPartition.Vp.ResidentAvailablePages</td><td>MmResidentAvailablePages</td><td>This is the total number of physical pages that would be available if every process was trimmed to its minimum working set size and all of its pages were flushed to disk.</td></tr><tr><td colspan="3">CHAPTER 5 Memory management</td></tr><tr><td colspan="3">From the Library</td></tr></table>


---

## EXPERIMENT: Viewing PFN entries

You can examine individual PFN entries with the kernel debugger !pfn command. You need to

supply the PFN as an argument. (For example, !pfn 0 shows the first entry, !pfn 1 shows the

second, and so on.) In the following example, the PTE for virtual address 0xD20000 is displayed,

followed by the PFN that contains the page directory, and then the actual page:

```bash
!kbx !pte d20000
                          VA 00d20000
PDE at C0600030        PTE at C0606900
contains 000000003E989867 contains 8000000093257847
pfn 3e989    ---DA--UwEV pfn 93257    ---D---UW-V
!kbx !pfn 3e989
    PFN 0003E989 at address 868D8AFC
    flink     00000071 blink / share count 00000144 pteaddress C0600030
    reference count 0001  Cached   color 0   Priority 5
    restore pte 00000080 containing page 069683 Active      M
Modified
!kbx !pfn 93257
    PFN 00093257 at address 87218184
    flink     000003F9 blink / share count 00000001 pteaddress C006900
    reference count 0001  Cached   color 0   Priority 5
    restore pte 00000080 containing page 03E989 Active      M
    Modified
```

You can also use the MemInfo tool to obtain information about a PFN. MemInfo can sometimes give you more information than the debugger's output, and it does not require being booted into debugging mode. Here's MemInfo's output for those same two PFNs:

```bash
C:\Tools\MemInfo.exe -p 3e989
0x3E989000 Active     Page Table      5   N/A             0xC0006000 0x8E499480
C:\Tools\MemInfo.exe -p 93257
0x93257000 Active     Process Private  5   windbg.exe      0x00D20000 N/A
```

From left to right, the information shown includes the physical address, type, page priority,

process name, virtual address, and potential extra information. MemInfo correctly recognized

that the first PFN was a page table and that the second PFN belongs to WinDbg, which was the

active process when the !pte dZ0000 command was used in the debugger.

## Page file reservation

We have already seen some mechanisms used by the memory manager to attempt to reduce physical

memory consumption and thus reduce accessing page files. Using the standby and modified list is one

such mechanism, and so is memory compression (see the "Memory compression" section later in this

chapter). Another optimization the memory uses is directly related to accessing page files themselves.

CHAPTER 5   Memory management     443


---

Rotational hard disks have a moving head that travels to a target sector before the disk can actually read or write. This seek time is relatively expensive (in the order of milliseconds) and so the total disk activity is the seek time added to the actual read/write time. If the amount of data accessed contiguously from the seek position is large, then the seek time may be negligible. But if the head must seek a lot while accessing scattered data on the disk, the aggregated seek time becomes the main issue.

When the Session Manager (Smss.exe) creates a page file, it queries the disk of the file's partition to find whether it's a rotational disk or a solid-state drive (SSD). If it's rotational, it activates a mechanism called page file reservations that tries to keep contiguous pages in physical memory contiguous in the page file as well. If the disk is an SSD (or a hybrid, which for the sake of page file reservation is treated as SSD), then page file reservation adds no real value (since there is no moving head), and the feature is not utilized for this particular page file.

Page file reservation is handled in three locations within the memory manager: working set manager, modified page writer, and page fault handler. The working set manager performs working set trimming by calling the MiFreeals laList routine. The routine takes a list of pages from a working set and for each page it decrements its share count. If it reaches zero, the page can be placed on the modified list, changing the relevant PTE into a transition PTE. The old valid PTE is saved in the PFN.

The invalid PTE has two bits related to page file reservation: page file reserved and page file allocated (refer to Figure 5-24). When a physical page is needed and is taken from one of the "free" page lists (free, zero or standby) to become an active (valid) page, an invalid PTE is saved into the Original PTE field of the PFN. This field is the key for tracking page file reservation.

The MiCheckServePageFileSpace routine tries to create page file reservation cluster starting

from a specified page. It checks if page file reservation is disabled for the target page file and if there

is already page file reservation for this page (based on the original PTE), and if any of these conditions

is true, the function aborts further processing for this page. The routine also checks if the page type is

of user pages, and if not, it boils out. Page file reservation is not attempted for other page types (such

as paged pool), because it was not found to be particularly beneficial (because of unpredictable usage

patterns, for example), which led to small clusters. Finally, MiCheckServePageFileSpace calls MiRe servePageFileSpace to do the actual work.

The search for page file reservation starts backward from the initial PTE. The goal is to locate eligible consecutive pages where reservation is possible. If the PTE that maps the neighboring page represents a decommitted page, a non-paged pool page; or if it's already reserved, then the page cannot be used; the current page will become the lower limit of the reservation cluster. Otherwise, the search continues backward. Then the search starts from the initial page forward, trying to gather as many eligible pages as possible. The cluster size must be at least 16 pages for the reservation to take place (the maximum cluster size is 512 pages). Figure 5-40 shows an example of a cluster bound by invalid page on one hand and an existing cluster on the other (note that it can span page tables within the same page directory).

---

![Figure](figures/Winternals7thPt1_page_462_figure_000.png)

FIGURE 5-40 Page file reservation cluster.

Once the page cluster is computed, free page file space must be located to be reserved for this clus ter of pages. Page file allocations are managed by a bitmap (where each set bit indicates a used page in

the file). For page file reservation, a second bitmap is used that indicates pages that have been reserved

(but not necessarily written to yet—this is the job of the page file allocation bitmap). Once there is page

file space that is not reserved and not allocated (based on these bitmaps), the relevant bits are set in

the reservation bitmap only. It is the job of the modified page writer to set these bits in the allocation

bitmap when it writes the contents of the pages to disk. If not enough page file space could be found

for the required cluster size, page file expansion is attempted, and if that already happened (or the

maximum page file size is the expanded size), then the cluster size is reduced to fit in the reservation

size that was located.

![Figure](figures/Winternals7thPt1_page_462_figure_003.png)

Note The clustered pages (except the original starting PTE) are not linked to any of the physical page lists. The reservation information is placed in the Original PTE of the PFN.

The modified page writer needs to handle writing pages that have reservations as a special case. It uses all the gathered information described previously to build an MDL that contains the correct PFNs for the cluster that is used as part of writing to the page file. Building the cluster includes finding contiguous pages that can span reservation clusters. If there are "holes" between clusters, a dummy page is added in between (a page that contains all bytes with 0xFF value). If the dummy page count is above 32, the cluster is broken. This "walk" is done going forward and then backward to build the final cluster to write. Figure 5-41 shows an example of the state of pages after such a cluster has been built by the modified page writer.

CHAPTER 5   Memory manage

445

---

![Figure](figures/Winternals7thPt1_page_463_figure_000.png)

FIGURE 5-41 Cluster built before writing.

Finally, the page fault handler uses the built information from the reservation bitmap and the PTEs

to determine the start and end points of clusters, to efficiently load back needed pages with minimal

seeking of the mechanical disk head.

## Physical memory limits

Now that you've learned how Windows keeps track of physical memory, we'll describe how much of it Windows can actually support. Because most systems access more code and data than can fit in physical memory as they run, physical memory is essentially a window into the code and data used over time. The amount of memory can therefore affect performance because when data or code that a process or the operating system needs is not present, the memory manager must bring it in from disk or remote storage.

Besides affecting performance, the amount of physical memory affects other resource limits. For example, the amount of non-paged pool is backed by physical memory, thus obviously constrained by physical memory. Physical memory also contributes to the system virtual memory limit, which is the sum of roughly the size of physical memory plus the current configured size of all paging files. Physical memory also can indirectly limit the maximum number of processes.

Windows support for physical memory is dictated by hardware limitations, licensing, operating system data structures, and driver compatibility. The following URL shows the memory limits of the various Windows editions: https://msdn.microsoft.com/en-us/library/windows/desktop/aa366778.aspx. Table 5-23 summarizes the limits in Windows 8 and higher versions.

446 CHAPTER 5   Memory management

---

TABLE 5-23 Limitations on physical memory support in Windows

<table><tr><td>Operating System Version/Edition</td><td>32-Bit Maximum</td><td>64-Bit Maximum</td></tr><tr><td>Windows 8.x Professional and Enterprise</td><td>4 GB</td><td>512</td></tr><tr><td>Windows 8.x (all other editions)</td><td>4 GB</td><td>128 GB</td></tr><tr><td>Windows Server 2012/R2 Standard and Datacenter</td><td>N/A</td><td>4 TB</td></tr><tr><td>Windows Server 2012/R2 Essentials</td><td>N/A</td><td>64 GB</td></tr><tr><td>Windows Server 2012/R2 Foundation</td><td>N/A</td><td>32 GB</td></tr><tr><td>Windows Storage Server 2012 Workgroup</td><td>N/A</td><td>32 GB</td></tr><tr><td>Windows Storage Server 2012 Standard Hyper-V Server 2012</td><td>N/A</td><td>4 TB</td></tr><tr><td>Windows 10 Home</td><td>4 GB</td><td>128 GB</td></tr><tr><td>Windows 10 Pro, Education and Enterprise</td><td>4 GB</td><td>2 TB</td></tr><tr><td>Windows Server 2016 Standard and Datacenter</td><td>N/A</td><td>24 TB</td></tr></table>


At the time of this writing, the maximum supported physical memory is 4 TB on some Server 2012/R2 editions and 24 TB on Server 2016 editions. The limitations don’t come from any implementation or hardware limitation, but because Microsoft will support only configurations it can test. As of this writing, these were the largest tested and supported memory configurations.

## Commit charge and the system commit limit

We are now in a position to more thoroughly discuss the concepts of commit charge and the system commit limit.

Whenever virtual address space is created—for example, by a VirtualAlloc (for committed memory) or MapViewFile call—the system must ensure that there is room to store it, either in RAM or in backing store, before successfully completing the create request. For mapped memory (other than sections mapped to the page file), the file associated with the mapping object referenced by the

MapViewFile call provides the required backing store. All other virtual allocations rely on systemmanaged shared resources for storage: RAM and the paging file(s). The purpose of the system commit limit and commit charge is to track all uses of these resources to ensure they are never overcommitted—that is, that there is never more virtual address space defined than there is space to store its contents, either in RAM or in backing store (on disk).

![Figure](figures/Winternals7thPt1_page_411_figure_003.png)

Note This section makes frequent references to paging files. It is possible (though not generally recommended) to run Windows without any paging files. Essentially, this means that when RAM is exhausted, there is no room to grow and memory allocations fail, generating a blue screen. You can consider every reference to paging files here to be qualified by "if one or more paging files exist."

Conceptually, the system commit limit represents the total committed virtual address space that can be created in addition to virtual allocations that are associated with their own backing store—that is, in addition to sections mapped to files. Its numeric value is simply the amount of RAM available to Windows plus the current sizes of any page files. If a page file is expanded or new page files are created, the commit limit increases accordingly. If no page files exist, the system commit limit is simply the total amount of RAM available to Windows.

Commit charge is the system-wide total of all committed memory allocations that must be kept in either RAM or in a paging file. From the name, it should be apparent that one contributor to commit charge is process-private committed virtual address space. However, there are many other contributors, some of them not so obvious.

Windows also maintains a per-process counter called the process page file quota. Many of the allocations that contribute to commit charge also contribute to the process page file quota. This represents each process's private contribution to the system commit charge. Note, however, that this does not represent current page file usage. It represents the potential or maximum page file usage, should all these allocations have to be stored there.

The following types of memory allocations contribute to the system commit charge and, in many cases,

to the process page file quota. (Some of these will be described in detail in later sections of this chapter.)

- ■ Private committed memory This is memory allocated with the Virtua1Alloc call with the
MEM_COMMIT option. This is the most common type of contributor to the commit charge. These
allocations are also charged to the process page file quota.
---

- ■ Page-file-backed mapped memory This is memory allocated with a MapViewOffFile call
that references a section object, which in turn is not associated with a file. The system uses a
portion of the page file as the backing store instead. These allocations are not charged to the
process page file quota.

■ Copy-on-write regions of mapped memory (even if it is associated with ordinary mapped
files) The mapped file provides backing store for its own unmodified content. However,
should a page in the copy-on-write region be modified, it can no longer use the original
mapped file for backing store. It must be kept in RAM or in a paging file. These allocations are
not charged to the process page file quota.

■ Non-paged and paged pool and other allocations in system space that are not backed
by explicitly associated files Even the currently free regions of the system memory pools
contribute to commit charge. The non-pageable regions are counted in the commit charge
even though they will never be written to the page file because they permanently reduce the
amount of RAM available for private pageable data. These allocations are not charged to the
process page file quota.

■ Kernel stacks Threads' stacks when executing in kernel mode.

■ Page tables Most of these are themselves pageable, and they are not backed by mapped
files. However, even if they are not pageable, they occupy RAM. Therefore, the space required
for them contributes to commit charge.

■ Space for page tables that are not yet actually allocated As you'll see, where large areas
of virtual space have been defined but not yet referenced (for example, private committed vir-
tual space), the system need not actually create page tables to describe it. However, the space
for these as-yet-nonexistent page tables is charged to commit charge to ensure that the page
tables can be created when they are needed.

■ Allocations of physical memory made via the Address Windowing Extension (AWE) APIs
As discussed previously, consume physical memory directly.
For many of these items, the commit charge may represent the potential use of storage rather than its actual use. For example, a page of private committed memory does not actually occupy either a physical page of RAM or the equivalent page file space until it's been referenced at least once. Until then, it is a demand-zero page (described later). But commit charge accounts for such pages when the virtual space is first created. This ensures that when the page is later referenced, actual physical storage space will be available for it.

A region of a file mapped as copy-on-write has a similar requirement. Until the process writes to the region, all pages in it are backed by the mapped file. However, the process may write to any of the pages in the region at any time. When that happens, those pages are thereafter treated as private to the process. Their backing store is, thereafter, the page file. Charging the system commit for them when the region is first created ensures that there will be private storage for them later, if and when the write accesses occur.

A particularly interesting case occurs when reserving private memory and later committing it. When the reserved region is created with VirtualAlloc, system commit charge is not charged for the actual virtual region. On Windows 8 and Server 2012 and earlier versions, it is charged for any new page table

CHAPTER 5   Memory management      395


---

pages that will be required to describe the region, even though these might not yet exist or even be

eventually needed. Starting with Windows 8.1 and Server 2012 R2, page table hierarchies for reserved

regions are not charged immediately; this means that huge reserved memory regions can be allocated

without exhausting page tables. This becomes important in some security features, such as Control Flow

Guard (CFG, see Chapter 7 for more details). If the region or a part of it is later committed, system com mit is charged to account for the size of the region (and page tables), as is the process page file quota.

To put it another way, when the system successfully completes, for example, a Vktrua1Alloc commit or MapViewOff1Ie call, it makes a commitment that the necessary storage will be available when needed, even if it wasn't needed at that moment. Thus, a later memory reference to the allocated region can never fail for lack of storage space. (Of course, it could still fail for other reasons, such as page protection, the region being deallocated, and so on.) The commit charge mechanism allows the system to keep this commitment.

The commit charge appears in the Performance Monitor counters as Memory: Committed Bytes. It is also the first of the two numbers displayed on the Task Manager's Performance tab with the legend Commit (the second being the commit limit), and it is displayed by Process Explorer's System Information Memory tab as Commit Charge – Current.

The process page file quota appears in the performance counters as Process: Page File Bytes. The same data appears in the Process: Private Bytes performance counter. (Neither term exactly describes the true meaning of the counter.)

If the commit charge ever reaches the commit limit, the memory manager will attempt to increase

the commit limit by expanding one or more page files. If that is not possible, subsequent attempts to

allocate virtual memory that uses commit charge will fail until some existing committed memory is

freed. The performance counters listed in T able 5-13 allow you to examine private committed memory

usage on a system-wide, per-process, or per-page-file, basis.

TABLE 5-13  Committed memory and page file performance counters

<table><tr><td>Performance Counter</td><td>Description</td></tr><tr><td>Memory: Committed Bytes</td><td>This is the number of bytes of virtual (not reserved) memory that has been committed. This number does not necessarily represent page file usage because it includes private committed pages in physical memory that have never been paged out. Rather, it represents the charged amount that must be backed by page file space and/or RAM.</td></tr><tr><td>Memory: Commit Limit</td><td>This is the number of bytes of virtual memory that can be committed without having to extend the paging files. If the paging files can be extended, this limit is soft.</td></tr><tr><td>Process: Page File Quota</td><td>This is the process&#x27;s contribution to Memory: Committed Bytes.</td></tr><tr><td>Process: Private Bytes</td><td>This is the same as Process: Page File Quota.</td></tr><tr><td>Process: Working Set - Private</td><td>This is the subset of Process: Page File Quota that is currently in RAM and can be referenced without a page fault. It is also a subset of Process: Working Set.</td></tr><tr><td>Process: Working Set</td><td>This is the subset of Process: Virtual Bytes that is currently in RAM and can be referenced without a page fault.</td></tr><tr><td>Process: Virtual Bytes</td><td>This is the total virtual memory allocation of the process, including mapped regions, private committed regions, and private reserved regions.</td></tr><tr><td>Paging File: % Usage</td><td>This is the percentage of the page file space that is currently in use.</td></tr><tr><td>Paging File: % Usage Peak</td><td>This is the highest observed value of Paging File: % Usage.</td></tr><tr><td colspan="2">CHAPTER 5 Memory management</td></tr><tr><td colspan="2">From the Library of</td></tr></table>


---

## Commit charge and page file size

The counters in Table 5-13 can assist you in choosing a custom page file size. The default policy based on the amount of RAM works acceptably for most machines, but depending on the workload, it can result in a page file that's unnecessarily large or not large enough.

To determine how much page-file space your system really needs based on the mix of applications that have run since the system booted, examine the peak commit charge in the Memory tab of Process Explorer's System Information display. This number represents the peak amount of page file space since the system booted that would have been needed if the system had to page out the majority of private committed virtual memory (which rarely happens).

If the page file on your system is too big, the system will not use it any more or less. In other words, increasing the size of the page file does not change system performance. It simply means the system can have more committed virtual memory. If the page file is too small for the mix of applications you are running, you might get a "system running low on virtual memory" error message. In this case, check to see whether a process has a memory leak by examining the process private bytes count. If no process appears to have a leak, check the system paged pool size. If a device driver is leaking paged pool, this might also explain the error. Refer to the "Troubleshooting a pool leak" experiment in the "Kernelmode heaps (system memory pools)" section for information on troubleshooting a pool leak.

EXPERIMENT: Viewing page file usage with Task Manager

You can view committed memory usage with Task Manager. T o do so, click its Performance tab.

You'll see the following counters related to page files:

![Figure](figures/Winternals7thPt1_page_414_figure_006.png)

CHAPTER 5   Memory management      397


---

The system commit total is displayed under the Committed label as two numbers. The first number represents potential page file usage, not actual page file usage. It is how much page file space would be used if all the private committed virtual memory in the system had to be paged out all at once. The second number displayed is the commit limit, which is the maximum virtual memory usage that the system can support before running out of virtual memory. (This includes virtual memory backed in physical memory as well as by the paging files.) The commit limit is essentially the size of RAM plus the current size of the paging files. It therefore does not account for possible page file expansion.

Process Explorer's System Information display shows an additional piece of information about system commit usage—namely, the percentage of the peak as compared to the limit and the current usage as compared to the limit:

![Figure](figures/Winternals7thPt1_page_415_figure_002.png)

## Stacks

Whenever a thread runs, it must have access to a temporary storage location in which to store function parameters, local variables, and the return address after a function call. This part of memory is called a stack. On Windows, the memory manager provides two stacks for each thread: the user stack and the kernel stack, as well as per-processor stacks called DPC stacks. Chapter 2 briefly discussed how system calls cause the thread to switch from a user stack to its kernel stack. Now we'll look at some extra services the memory manager provides to efficiently use stack space.

---

## User stacks

When a thread is created, the memory manager automatically reserves a predetermined amount of virtual memory, which by default is 1 MB. This amount can be configured in the call to the CreateThread or CreateRemoteThread(Ex) function or when compiling the application by using the / STACK: reserve switch in the Microsoft C/C++ compiler, which stores the information in the image header. Although 1 MB is reserved, only the first page of the stack will be committed (unless the PE header of the image specifies otherwise), along with a guard page. When a thread's stack grows large enough to touch the guard page, an exception occurs, causing an attempt to allocate another guard. Through this mechanism, a user stack doesn't immediately consume all 1 MB of committed memory but instead grows with demand. (However, it will never shrink back.)

EXPERIMENT: Creating the maximum number of threads

With only 2 GB of user address space available to each 32-bit process, the relatively large

memory that is reserved for each thread's stack allows for an easy calculation of the maximum

number of threads that a process can support: a little less than 2,048, for a total of nearly 2 GB of

memory (unless the increaseusername BCD option is used and the image is large address space

aware). By forcing each new thread to use the smallest possible stack reservation size, 64 KB, the

limit can grow to about 30,000 threads. You can test this for yourself by using the TestLimit utility

from Sysinternals. Here is some sample output:

```bash
C:\Tools\Sysinternals\Testlimit.exe -t
Testlimit v5.24 - test Windows limits
Copyright (C) 2012-2015 Mark Russinovic
Sysinternals - www.sysinternals.com
Process ID: 17260
Creating threads with 64 KGB stacks...
Created 29000 threads. Lasterror: 8
```

If you attempt this experiment on a 64-bit Windows installation (with 128 TB of User address space available), you would expect to see potentially hundreds of thousands of threads created (assuming sufficient memory was available). Interestingly, however, TestLimit actually creates fewer threads than on a 32-bit machine. This has to do with the fact that TestLimit.exe is a 32-bit application and thus runs under the Wow64 environment. (See Chapter 8 in Part 2 for more information on Wow64.) Each thread will therefore have not only its 32-bit Wow64 stack but also its 64-bit stack, thus consuming more than twice the memory, while keeping only 2 GB of address space. To properly test the thread-creation limit on 64-bit Windows, use the Testlimit64. exe binary instead.

You will need to terminate TestLimit with Process Explorer or Task Manager. You cannot use


Ctrl-C to break the application because this operation itself creates a new thread, which will not

be possible once memory is exhausted.

---

## Kernel stacks

Although user stack sizes are typically 1 MB, the amount of memory dedicated to the kernel stack is

significantly smaller: 12 KB on 32-bit systems and 16 KB on 64-bit systems, followed by another guard

page, for a total of 16 or 20 KB of virtual address space. Code running in the kernel is expected to have

less recursion than user code, as well as contain more efficient variable use and keep stack buffer sizes

low. Because kernel stacks live in system address space (which is shared by all processes), their memory

usage has a bigger impact of the system.

Although kernel code is usually not recursive, interactions between graphics system calls handled by Win32k.sys and its subsequent callbacks into user mode can cause recursive re-entries in the kernel on the same kernel stack. As such, Windows provides a mechanism for dynamically expanding and shrinking the kernel stack from its initial size. As each additional graphics call is performed from the same thread, another 16 KB kernel stack is allocated. (This happens anywhere in system address space. The memory manager provides the ability to jump stacks when nearing the guard page.) Whenever each call returns to the caller (unwinding), the memory manager frees the additional kernel stack that had been allocated, as shown in Figure 5-28. This mechanism allows reliable support for recursive system calls as well as efficient use of system address space. It is provided for use by driver developers when performing recursive callouts through the KeExpandKernelStackAndCallOut(Ex) APIs, as necessary.

![Figure](figures/Winternals7thPt1_page_417_figure_003.png)

FIGURE 5-28 Kernel stack jumping.

EXPERIMENT: Viewing kernel-stack usage

You can use the RamMap tool from Sysinternals to display the physical memory currently being occupied by kernel stacks. Here's a screenshot from the Use Counts tab:

```bash
#include "DriverLoader.h"
#include "VideoDevice.h"
#include "VideoData.h"
```

To view kernel-stack usage, try the following:

- 1. Repeat the previous TestLimit experiment, but don't terminate TestLimit yet.

2. Switch to RamMap.

3. Open the File menu and select Refresh (or press F5). You should see a much higher

kernel stack size:
---

```bash
Driver Locked  34,892.84K   34,892.8K
Kernel Locks   346.07K   329.91K
Total      349.91K   349.91K   6,160.65K
```

Running TestLimit a few more times (without closing previous instances) would easily exhaust

physical memory on a 32-bit system, and this limitation results in one of the primary limits on

system-wide 32-bit thread count.

### DPC stack

Windows keeps a per-processor DPC stack available for use by the system whenever DPCs are executing. This approach isolates the DPC code from the current thread's kernel stack. (This is unrelated to the DPC's actual operation because DPCs run in arbitrary thread context. See Chapter 6 for more on DPCs.) The DPC stack is also configured as the initial stack for handling the sytemter (x86), svc (ARM), or syscall1 (x64) instruction during a system call. The CPU is responsible for switching the stack when these instructions are executed, based on one of the model-specific registers (MSRs on x86/x64). However, Windows does not want to reprogram the MSR for every context switch because that is an expensive operation. Windows therefore configures the per-operator DPC stack pointer in the MSR.

## Virtual address descriptors

The memory manager uses a demand-paging algorithm to know when to load pages into memory,

waiting until a thread references an address and incurs a page fault before retrieving the page from

disk. Like copy-on-write, demand paging is a form of lazy evaluation—waiting to perform a task until it

is required.

The memory manager uses lazy evaluation not only to bring pages into memory but also to construct the page tables required to describe new pages. For example, when a thread commits a large region of virtual memory with VirtuaAlloc, the memory manager could immediately construct the page tables required to access the entire range of allocated memory. But what if some of that range is never accessed? Creating page tables for the entire range would be a wasted effort. Instead, the memory manager waits to create a page table until a thread incurs a page fault. It then creates a page table for that page. This method significantly improves performance for processes that reserve and/or commit a lot of memory but access it sparsely.

The virtual address space that would be occupied by such as-yet-nonexistent page tables is charged to the process page file quota and to the system commit charge. This ensures that space will be available for them should they actually be created. With the lazy-evaluation algorithm, allocating even large blocks of memory is a fast operation. When a thread allocates memory, the memory manager must respond with a range of addresses for the thread to use. To do this, the memory manager maintains another set of data structures to keep track of which virtual addresses have been reserved in the process's address space and which have not. These data structures are known as Virtual Address Descriptors (VADs). VADs are allocated in non-paged pool.

CHAPTER 5    Memory management      401


---

## Process VADs

For each process, the memory manager maintains a set of VADs that describes the status of the process's address space. VADs are organized into a self-balancing AVL tree (named after its inventors, AdelsonVelsky and Landis, where the heights of the two child subtrees of any node differ by at most 1; this makes the insertion, lookup, and deletion very fast). On average, this results in the fewest comparisons when searching for a VAD corresponding with a virtual address. There is one VAD for each virtually contiguous range of not-free virtual addresses that all have the same characteristics (reserved versus committed versus mapped, memory access protection, and so on). Figure 5-29 shows a diagram of a VAD tree.

![Figure](figures/Winternals7thPt1_page_419_figure_002.png)

FIGURE 5-29 VADs.

When a process reserves address space or maps a view of a section, the memory manager creates a

VAD to store any information supplied by the allocation request, such as the range of addresses being

reserved, whether the range will be shared or private, whether a child process can inherit the contents

of the range, and the page protection applied to pages in the range.

When a thread first accesses an address, the memory manager must create a PTE for the page con taining the address. To do so, it finds the VAD whose address range contains the accessed address and

uses the information it finds to fill in the PTE. If the address falls outside the range covered by the VAD or

in a range of addresses that are reserved but not committed, the memory manager knows that the thread

didn't allocate the memory before attempting to use it and therefore generates an access violation.

EXPERIMENT: Viewing VADs

You can use the kernel debugger's !vad command to view the VADs for a given process. First find the address of the root of the VAD tree with the !process command. Then specify that address to the !vad command, as shown in the following example of the VAD tree for a process running Explorer.exe:

```bash
!kbd !process 0 1 explorer.exe
PROCESS ffffc8069382e080
    SessionId: 1 Cid: 43e0      Peb: 00bc5000   ParentCid: 0338
    DirBase: 554ab7000  ObjectTable: ffffda8f62811d80  HandleCount: 823.
    Image: explorer.exe
        VadRoot ffffc806912337f0 Vads 505 Clone 0 Private 5088. Modified 2146. Locked 0.
    ...
CHAPTER 5   Memory management
```

402    CHAPTER 5   Memory management


---

```bash
tkd> !vad ffffc8068aele470
     VAD       Level   Start     End Commit
    ffffc80689bc52b0  9    640      64f     0 Mapped    READWRITE
    Pagefile section, shared commit 0x1D
    ffffc80689be6900  8    650      651     0 Mapped    READONLY
    Pagefile section, shared commit 0x2
    ffffc80689bc4290  9    660      675     0 Mapped    READONLY
    Pagefile section, shared commit 0x16
    ffffc8068aef1320  7    680      6ff     32 Private    READWRITE
    ffffc8068b9b290b0  9    700      701     2 Private    READWRITE
    ffffc8068ba04f0  8    710      711     2 Private    READWRITE
    ffffc80682795760  6    720      723     0 Mapped    READONLY
    Pagefile section, shared commit 0x4
    ffffc80688d5670 10    730      731     0 Mapped    READONLY
    Pagefile section, shared commit 0x2
    ffffc8068b9bdd9e0  9    740      741     2 Private    READWRITE
    ffffc8068da57b0  8    750      755     0 Mapped    READONLY
  \Windows\en-US\explorer.exe.mui
  ...
  Total VADs: 574, average Level: 8, maximum depth: 10
  Total private commit: 0x3420 pages (53376 KB)
  Total shared commit:  0x478 pages (4576 KB)
```

## Rotate VADs

A video card driver must typically copy data from the user-mode graphics application to various other system memory, including the video card memory and the AGP port's memory, both of which have different caching attributes as well as addresses. To quickly allow these different views of memory to be mapped into a process, and to support the different cache attributes, the memory manager implements rotate VADs, which allow video drivers to transfer data directly by using the GPU and to rotate unneeded memory in and out of the process view pages on demand. Figure 5-30 shows an example of how the same virtual address can rotate between video RAM and virtual memory.

![Figure](figures/Winternals7thPt1_page_420_figure_003.png)

FIGURE 5-30 Rotate VADs.

CHAPTER 5   Memory management      403


---

NUMA

Each new release of Windows provides new enhancements to the memory manager to make better use of non-uniform memory architecture (NUMA) machines, such as large server systems as well as Intel i7 and AMD Opteron SMP workstations. The NUMA support in the memory manager adds intelligent knowledge of node information such as location, topology, and access costs to allow applications and drivers to take advantage of NUMA capabilities, while abstracting the underlying hardware details.

When the memory manager is initializing, it calls the MlComputeNumaCosts function to perform

various page and cache operations on different nodes. It then computes the time it took for those

operations to complete. Based on this information, it builds a node graph of access costs (the distance

between a node and any other node on the system). When the system requires pages for a given

operation, it consults the graph to choose the most optimal node (that is, the closest). If no memory is

available on that node, it chooses the next closest node, and so on.

Although the memory manager ensures that, whenever possible, memory allocations come from

the ideal processor's node (the ideal node) of the thread making the allocation, it also provides func tions that allow applications to choose their own node, such as the VirtualAllocExNuma, Create FileMappingNuma, MapViewOfFileExNuma, and AllocateUserPhysicalPagesNuma APIs.

The ideal node isn't used only when applications allocate memory but also during kernel operation

and page faults. For example, when a thread running on a non-ideal processor takes a page fault, the

memory manager won't use the current node. Instead, it will allocate memory from the thread's ideal

node. Although this might result in slower access time while the thread is still running on this CPU,

overall memory access will be optimized as the thread migrates back to its ideal node. In any case, if

the ideal node is out of resources, the closest node to the ideal node is chosen and not a random other

node. Just like user-mode applications, however, drivers can specify their own node when using APIs

such as MmAllocatePageForMdlEx or MmAllocateContiguousMemorySpecifyCacheNode.

Various memory manager pools and data structures are also optimized to take advantage of NUMA nodes. The memory manager tries to evenly use physical memory from all the nodes on the system to hold the non-paged pool. When a non-paged pool allocation is made, the memory manager uses the ideal node as an index to choose a virtual memory address range inside non-paged pool that corresponds to physical memory belonging to this node. In addition, per-NUMA node pool free lists are created to efficiently leverage these types of memory configurations. Apart from non-paged pool, the system cache and system PTEs are also similarly allocated across all nodes, as well as the memory manager's look-aside lists.

Finally, when the system needs to zero pages, it does so in parallel across different NUMA nodes by creating threads with NUMA affinities that correspond to the nodes in which the physical memory is located. The logical prefetcher and SuperFetch (described in the section "Proactive memory management [SuperFetch]") also use the ideal node of the target process when prefetching, while soft page faults cause pages to migrate to the ideal node of the faulting thread.

---

## Section objects

As noted earlier in this chapter in the "Shared memory and mapped files" section, the section object, which the Windows subsystem calls a file mapping object, represents a block of memory that two or more processes can share. A section object can be mapped to the paging file or to another file on disk.

The executive uses sections to load executable images into memory, and the cache manager uses them to access data in a cached file. (See Chapter 14 in Part 2 for more information on how the cache manager uses section objects.) You can also use section objects to map a file into a process address space. The file can then be accessed as a large array by mapping different views of the section object and reading or writing to memory rather than to the file—an activity called mapped file I/O. When the program accesses an invalid page (one not in physical memory), a page fault occurs and the memory manager automatically brings the page into memory from the mapped file or page file. If the application modifies the page, the memory manager writes the changes back to the file during its normal paging operations. (Alternatively, the application can flush a view explicitly by using the Windows FlushViewOffFile function.)

Like other objects, section objects are allocated and deallocated by the object manager. The object manager creates and initializes an object header, which it uses to manage the objects; the memory manager defines the body of the section object. (See Chapter 8 in Part 2 for more on the object manager). The memory manager also implements services that user-mode threads can call to retrieve and change the attributes stored in the body of section objects. The structure of a section object is shown in Figure 5-31. Table 5-14 summarizes the unique attributes stored in section objects.

![Figure](figures/Winternals7thPt1_page_422_figure_004.png)

FIGURE 5-31 A section object.

TABLE 5-14  Section object body attributes

<table><tr><td>Attribute</td><td>Purpose</td></tr><tr><td>Maximum size</td><td>This is the largest size to which the section can grow in bytes. If mapping a file, this is the maximum size of the file.</td></tr><tr><td>Page protection</td><td>This is page-based memory protection assigned to all pages in the section when it is created.</td></tr><tr><td>Paging file or mapped file</td><td>This indicates whether the section is created empty (backed by the paging file—as explained earlier, page-file-backed sections use page-file resources only when the pages need to be written out to disk) or loaded with a file (backed by the mapped file).</td></tr><tr><td>Based or not based</td><td>This indicates whether a section is a based section, which must appear at the same virtual address for all processes sharing it, or a non-based section, which can appear at different virtual addresses for different processes.</td></tr><tr><td colspan="2">CHAPTER 5 Memory management 405</td></tr><tr><td colspan="2">From the Library of Mich</td></tr></table>


---

## EXPERIMENT: Viewing section objects

You can use Process Explorer from Sysinternals to see files mapped by a process. Follow these steps:

- 1. Open the View menu, choose Lower Pane View, and select DLLs.

2. Open the View menu, choose Select Columns, choose DLL, and enable the Mapping

Type column.

3. Notice the files marked as Data in the Mapping column. These are mapped files rather

than DLLs and other files the image loader loads as modules, Section objects that are

backed by a page file are indicated in the Name column as <PageFile Backed>. Other-

wise, the file name is shown.
![Figure](figures/Winternals7thPt1_page_423_figure_003.png)

Another way to view section objects is to switch to handle view (open the View menu, choose

Lower Pane View, and select Handles) and look for objects of type Section. In the following

screenshot, the object name (if it exists) is shown. This is not the file name backing the section

(if any); it's the name given to the section in the object manager's namespace. (See Chapter 8 in

Part 2 for more on the object manager.) Double-clicking the entry shows more information on

the object, such as the number of open handles and its security descriptor.

---

![Figure](figures/Winternals7thPt1_page_424_figure_000.png)

The data structures maintained by the memory manager that describe mapped sections are shown in Figure 5-32. These structures ensure that data read from mapped files is consistent regardless of the type of access (open file, mapped file, and so on). For each open file (represented by a file object), there is a single section object pointers structure. This structure is the key to maintaining data consistency for all types of file access as well as to providing caching for files. The section object pointers structure points to one or two control areas. One control area is used to map the file when it is accessed as a data file and the other is used to map the file when it is run as an executable image. A control area in turn points to subsection structures that describe the mapping information for each section of the file (read-only, read/write, copy-on-write, and so on). The control area also points to a segment structure allocated in paged pool, which in turn points to the prototype PTEs used to map to the actual pages mapped by the section object. As described earlier in this chapter, process page tables point to these prototype PTEs, which in turn map the pages being referenced.

![Figure](figures/Winternals7thPt1_page_424_figure_002.png)

FIGURE 5-32 Internal section structures.

CHAPTER 5    Memory management      407


---

Although Windows ensures that any process that accesses (reads or writes) a file will always see the same consistent data, there is one case in which two copies of pages of a file can reside in physical memory. (Even in this case, all accessors get the latest copy and data consistency is maintained.) This duplication can happen when an image file has been accessed as a data file (having been read or written) and is then run as an executable image. (An example might be when an image is linked and then run; the linker had the file open for data access, and then when the image was run, the image loader mapped it as an executable.) Internally, the following actions occur:

- 1. If the executable file was created using the file-mapping APIs or the cache manager, a data

control area is created to represent the data pages in the image file being read or written.

2. When the image is run and the section object is created to map the image as an executable,

the memory manager finds that the section object pointers for the image file point to a data

control area and flushes the section. This step is necessary to ensure that any modified pages

have been written to disk before accessing the image through the image control area.

3. The memory manager creates a control area for the image file.

4. As the image begins execution, its (read-only) pages are faulted in from the image file or cop-

ied directly over from the data file if the corresponding data page is resident.
Because the pages mapped by the data control area might still be resident (on the standby list), this is the one case in which two copies of the same data are in two different pages in memory. However, this duplication doesn't result in a data consistency issue. This is because, as mentioned, the data control area has already been flushed to disk, so the pages read from the image are up to date (and these pages are never written back to disk).

## EXPERIMENT: Viewing control areas

To find the address of the control area structures for a file, you must first get the address of the file object in question. You can obtain this address through the kernel debugger by dumping the process handle table with the !handle command and noting the object address of a file object. Although the kernel debugger !file command displays the basic information in a file object, it doesn't display the pointer to the section object pointers structure. Then, using the dt command, format the file object to get the address of the section object pointers structure. This structure consists of three pointers: a pointer to the data control area, a pointer to the shared cache map (explained in Chapter 14 in Part 2), and a pointer to the image control area. From the section object pointers structure, you can obtain the address of a control area for the file (if one exists) and feed that address into the !ca command.

For example, if you open a PowerPoint file and use !handle to display the handle table for

that process, you will find an open handle to the PowerPoint file (you can do a text search). (For

more information on using !handle, see the "Object manager" section in Chapter 8 in Part 2 or

the debugger documentation.)

```bash
tkd:: process 0 0 powerprt.exe
PROCESS ffffc8068913e080
```

408    CHAPTER 5   Memory management


---

```bash
SessionId: 1 Cid: 2b64   Pcb: 01249000  ParentCid: 1d38
    DirBase: 252e25000  ObjectTable: ffffda8f49285c40  HandleCount: 1915.
    Image: POWERNT.EXE
tkbd - process /p ffffc8068913e080
Implicit process is now ffffc806'8913e080
tkbd - handle
...
Oct08: Object: ffffc8068f56a630  GrantedAccess: 00120089 Entry: ffffda8f491d0020
Object: ffffc8068f56a630 Type: (Ffffc8068256cb00) File
ObjectHeader: ffffc8068f56a600 (new version)
        HandleCount: 1 PointerCount: 30839
        Directory Object: 00000000 Name: \WindowsInternals\7thEdition\Chapter05\
diagrams.pptx {HarddiskVolume2}
```

Taking the file object address (FFFFC8068F56A630) and formatting it with dt results in this:

```bash
1kds dt ntl_file_object ffffc8068f56a630
 +0x000 Type             : 0n5
 +0x002 Size             : 0n216
 +0x008 DeviceObject   : 0xffffc806`8408cb40 _DEVICE_OBJECT
 +0w010 Vpb              : 0xffffc806`92feb00 _VPB
 +0x018 FsContext      : 0xffffda8f`5137cdb0 Void
 +0x020 FsContext2      : 0xffffda8f`4366d590 Void
 +0x028 SectionObjectPointer : 0xffffc806`8ec0c558 _SECTION_OBJECT_POINTERS
 ...
```

Taking the address of the section object pointers structure and formatting it with dt results in this:

```bash
!kdt dt ntl_section_object_pointers 0xfffffc806*8ec058
+0x000 DataSectionObject : 0xfffffc806*8e38c10 Void
+0x008 SharedCacheMap : 0xfffffc806*8d967bd0 Void
+0x010 ImageSectionObject : (null)
```

Finally, you can use !ca to display the control area using the address:

```bash
!kbd !ca 0xfffffc80678e838c10
ControlArea @ ffffc8068e838c10
Segment        ffffda8f4d97fdc0   Flink     ffffc8068ecf97b8   BLink
ffffc8068ecf97b8
  Section Ref               1   Pfn Ref                58   Mapped Views      2
  User Ref                0   WaitForDel             0   Flush Count       0
  File Object ffffc8068e5d3d50  ModWriteCount           0   System Views      2
  WritableRefs            0
  Flags (8080) File WasPurged  \windowsInternalsBook\7thEdition\Chapter05\diagrams.pptx
Segment @ ffffda8f4d97fdc0
  ControlArea    ffffc8068e838c10  ExtendInfo   00000000000000000000
  Total Ptes         80
  Segment Size       80000   Committed           0
  Flags (c0000) ProtectionMask
```

CHAPTER 5   Memory management      409


---

```bash
Subsection 1 @ ffffc8068e83e90
ControlArea 0 ffffc8068e83e10      Starting Sector      0   Number Of Sectors    58
Base Pte      ffffda8f48eb6d40  Ptes In Subsect      58   Unused Ptes        0
Flags        d Sector Offset      0   Protection        6
Accessed
Flink        ffffc8068bb7fcf0   Blink       ffffc8068bb7fcf0   MappedViews    2
Subsection 2 @ ffffc8068c2a05b0
ControlArea  ffffc8068e83e10      Starting Sector      58   Number Of Sectors    28
Base Pte      ffffda8f3cc45000  Ptes In Subsect      28   Unused Ptes        108
Flags        d Sector Offset      0   Protection        6
Accessed
Flink        ffffc8068c2e0600   Blink       ffffc8068c2e0600   MappedViews    1
```

Another technique is to display the list of all control areas with the !memusage command. The following excerpt is from the output of this command. (The command might take a long time to complete on a system with a large amount of memory.)

```bash
!kd> !memusage
loading PFN database
loading (100% complete)
Compiling memory usage data (99% Complete).
        Zeroed:      98533 (  394132 kb)
            Free:       1405 (   5620 kb)
            Standby:     331221 ( 1324884 kb)
            Modified:     83806 (  335224 kb)
            ModifiedNoWrite:    116 (    464 kb)
            Active/Valid:    1556154 ( 6224616 kb)
            Transition:      5 (    20 kb)
            SLIST/Bad:      1614 (   6456 kb)
            Unknown:       0 (    0 kb)
            TOTAL:      2072854 ( 8291416 kb)
Dangling Yes Commit:    130 (   520 kb)
Dangling No Commit:   514812 ( 2059248 kb)
   Building kernel map
   Finished building kernel map
  (Master1 0 for 1c0)
  (Master1 0 for e80)
  (Master1 0 for ec0)
  (Master1 0 for f00)
  Scanning PFN database - (02% complete)
  (Master1 0 for de80)
Scanning PFN database - (100% complete)
```

410   CHAPTER 5   Memory management


---

```bash
*__________________________________________________________________________
  Usage Summary (in Kb):
  Control    Valid Standby Dirty Shared Locked PageTables  name
  FFFFFF8cd7e4797a0    64      0      0      0   1684540      0   AWE
  ffff8c0b7e4797a0      64      0      0      0      0      0   mapped_file( Microsoft-
  Windows-Kernel-PnP%4Configuration.evtx )
  ffff8c0b7e481650      0      4      0      0      0      0   mapped_file( No name for file )
  ffff8c0b7e493c00      0      40      0      0      0      0   mapped_file( FSD-[ED5680AF-
  0543-4367-A331-850F30190B44].FSD )
  ffff8c0b7e4a1b30      8      12      0      0      0      0   mapped_file( msidle.dll )
  ffff8c0b7e4a7c40      128      0      0      0      0      0   mapped_file( Microsoft-
  Windows-Diagnosis-PCW%4Operational.evtx )
  ffff8c0b7e4a9010      16      8      0      0      16      0   mapped_file( netjoin.dll
  )a04db00   ...                           _                            _
  ffff8c0b7f8cc360  8212      0      0      0      0      0   mapped_file( OUTLOOK.EXE )
  ffff8c0b7f8cd1a0      52      28      0      0      0      0   mapped_file( verdanab.ttf )
  ffff8c0b7f8ce910      0      4      0      0      0      0   mapped_file( No name for file )
  ffff8c0b7f8d3590      0      4      0      0      0      0   mapped_file( No name for file )
  ...
```

The Control column points to the control area structure that describes the mapped file. You can display control areas, segments, and subsections with the kernel debugger !ca command. For example, to dump the control area for the mapped file Outlook.exe in this example, type the !ca command followed by the Control column number, as shown here:

```bash
tkd! !ca ffff8c0b7f8cc360
ControlArea  @ ffff8c0b7f8cc360
Segment       ffffdf08da855670 Flink        ffff8c0b834f1fd0 Blink
ffffffff8cb834f1fd0
Section Ref           1 Pfn Ref            806 Mapped Views      1
User Ref          2 WaitForDel            0 Flush Count      c5a0
File Object    ffff8c0b7f0e940  ModWriteCount      0 System Views      ffff
WritableRefs      80000161
Flags (a0) Image File
    \Program Files \x86\Microsoft Office\root\Office16\OUTLOOK.EXE
Segment @ ffffdf08da855670
ControlArea    ffff8c0b7f8cc360  BasedAddress  0000000000be0000
Total Ptes        1609
Segment Size      1609000  Committed         0
Image Commit      f4  Image Info        ffffdf08da8556b8
ProtoPtes        ffffdf08da86b000
Flags (c20000) ProtectionMask
Subsection 1 @ ffff8c0b7f8cc3e0
ControlArea  ffff8c0b7f8cc360  Starting Sector     0 Number Of Sectors   2
Base Pte        ffffdf08da8ab000  Ptes In Subsect      1 Unused Ptes      0
Flags             2 Sector Offset        0 Protection        1
Subsection 2 @ ffff8c0b7f8cc418
ControlArea  ffff8c0b7f8cc360  Starting Sector      2 Number Of Sectors 7b17
```

CHAPTER 5     Memory management      411


---

```bash
Base Pte     ffffdf08ab6b008  Ptes In Subset      f63  Unused Ptes         0
        Flags        6  Sector Offset            0  Protection                3
Subsection 3 @ ffff8c0b7f8cc450
    ControlArea fffffc0b7f8ccc360  Starting Sector      7b19  Number Of Sectors 19a4
    Base Pte     fffffd08abd72b20  Ptes In Subset      335  Unused Ptes         0
        Flags        2  Sector Offset            0  Protection                1
Subsection 4 @ ffff8c0b7f8cc488
    ControlArea fffffc0b7f8ccc360  Starting Sector      94bd  Number Of Sectors  764
    Base Pte     fffffd08abd744c8  Ptes In Subset      f2  Unused Ptes         0
        Flags        a  Sector Offset            0  Protection                5
Subsection 5 @ ffff8c0b7f8cc4c0
    ControlArea fffffc0b7f8ccc360  Starting Sector      9c21  Number Of Sectors  1
    Base Pte     fffffd08abd74c58  Ptes In Subset      1  Unused Ptes         0
        Flags        a  Sector Offset            0  Protection                5
Subsection 6 @ ffff8c0b7f8cc4f8
    ControlArea fffffc0b7f8ccc360  Starting Sector      9c22  Number Of Sectors  1
    Base Pte     fffffd08abd74c60  Ptes In Subset      1  Unused Ptes         0
        Flags        a  Sector Offset            0  Protection                5
Subsection 7 @ ffff8c0b7f8ccc530
    ControlArea fffffc0b7f8ccc360  Starting Sector      9c23  Number Of Sectors c62
    Base Pte     fffffd08abd74c68  Ptes In Subset      18d  Unused Ptes         0
        Flags        2  Sector Offset            0  Protection                1
Subsection 8 @ ffff8c0b7f8cc568
    ControlArea fffffc0b7f8ccc360  Starting Sector      a885  Number Of Sectors  771
    Base Pte     fffffd08abd75b80  Ptes In Subset      ef  Unused Ptes         0
        Flags        2  Sector Offset            0  Protection                1
```

