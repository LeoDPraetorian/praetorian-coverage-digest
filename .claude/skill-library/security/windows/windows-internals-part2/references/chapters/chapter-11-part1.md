## Caching and file systems

The cache manager is a set of kernel-mode functions and system threads that cooperate with the memory manager to provide data caching for all Windows file system drivers (both local and network). In this chapter, we explain how the cache manager, including its key internal data structures and functions, works; how it is sized at system initialization time; how it interacts with other elements of the operating system; and how you can observe its activity through performance counters. We also describe the five flags on the Windows CreateFile function that affect file caching and DAX volumes, which are memory-mapped disks that bypass the cache manager for certain types of I/O.

The services exposed by the cache manager are used by all the Windows File System drivers, which cooperate strictly with the former to be able to manage disk I/O as fast as possible. We describe the different file systems supported by Windows, in particular with a deep analysis of NTFS and ReFS (the two most used file systems). We present their internal architecture and basic operations, including how they interact with other system components, such as the memory manager and the cache manager.

The chapter concludes with an overview of Storage Spaces, the new storage solution designed to replace dynamic disks. Spaces can create tiered and thinly provisioned virtual disks, providing features that can be leveraged by the file system that resides at the top.

### Terminology

To fully understand this chapter, you need to be familiar with some basic terminology:

- Disks are physical storage devices such as a hard disk, CD-ROM, DVD, Blu-ray, solid-state disk
(SSD), Non-volatile Memory disk (NVME), or flash drive.
Sectors are hardware-addressable blocks on a storage medium. Sector sizes are determined
by hardware. Most hard disk sectors are 4,096 or 512 bytes, DVD-ROM and Blu-ray sectors are
typically 2,048 bytes. Thus, if the sector size is 4,096 bytes and the operating system wants to
modify the 5120th byte on a disk, it must write a 4,096-byte block of data to the second sector
on the disk.
Partitions are collections of contiguous sectors on a disk. A partition table or other disk-
management database stores a partition's starting sector, size, and other characteristics and
is located on the same disk as the partition.
Volumes are objects that represent sectors that file system drivers always manage as a single
unit. Simple volumes represent sectors from a single partition, whereas multipartition volumes

56


---

represent sectors from multiple partitions. Multipartition volumes offer performance, reliability, and sizing features that simple volumes do not.

■ File system formats define the way that file data is stored on storage media, and they affect a file system's features. For example, a format that doesn't allow user permissions to be associated with files and directories can't support security. A file system format also can impose limits on the sizes of files and storage devices that the file system supports. Finally, some file system formats efficiently implement support for either large or small files or for large or small disks. NTFS, exFAT, and ReFS are examples of file system formats that offer different sets of features and usage scenarios.

Clusters are the addressable blocks that many file system formats use. Cluster size is always a multiple of the sector size, as shown in Figure 11-1, in which eight sectors make up each cluster, which are represented by a yellow band. File system formats use clusters to manage disk space more efficiently; a cluster size that is larger than the sector size divides a disk into more manageable blocks. The potential trade-off of a larger cluster size is wasted disk space, or internal fragmentation, that results when file sizes aren't exact multiples of the cluster size.

![Figure](figures/Winternals7thPt2_page_597_figure_003.png)

FIGURE 11-1 Sectors and clusters on a classical spinning disk.

■ Metadata is data stored on a volume in support of file system format management. It isn't typically made accessible to applications. Metadata includes the data that defines the placement of files and directories on a volume, for example.

## Key features of the cache manager

The cache manager has several key features:

- ⊠ Supports all file system types (both local and network), thus removing the need for each file
system to implement its own cache management code.
⊠ Uses the memory manager to control which parts of which files are in physical memory (trading
off demands for physical memory between user processes and the operating system).
⊠ Caches data on a virtual block basis (offsets within a file)—in contrast to many caching systems,
which cache on a logical block basis (offsets within a disk volume)—allowing for intelligent
---

read-ahead and high-speed access to the cache without involving file system drivers. (This method of caching, called fast I/O, is described later in this chapter)

- ■ Supports "hints" passed by applications at file open time (such as random versus sequential

access, temporary file creation, and so on).

■ Supports recoverable file systems (for example, those that use transaction logging) to recover

data after a system failure.

■ Supports solid state, NVMe, and direct access (DAX) disks.
Although we talk more throughout this chapter about how these features are used in the cache

manager, in this section we introduce you to the concepts behind these features.

## Single, centralized system cache

Some operating systems rely on each individual file system to cache data, a practice that results either in duplicated caching and memory management code in the operating system or in limitations on the kinds of data that can be cached. In contrast, Windows offers a centralized caching facility that caches all externally stored data, whether on local hard disks, USB removable drives, network file servers, or DVD-ROMs. Any data can be cached, whether it's user data streams (the contents of a file and the ongoing read and write activity to that file) or file system metadata (such as directory and file headers). As we discuss in this chapter, the method Windows uses to access the cache depends on the type of data being cached.

## The memory manager

One unusual aspect of the cache manager is that it never knows how much cached data is actually in physical memory. This statement might sound strange because the purpose of a cache is to keep a subset of frequently accessed data in physical memory as a way to improve I/O performance. The reason the cache manager doesn't know how much data is in physical memory is that it accesses data by mapping views of files into system virtual address spaces, using standard section objects (or file mapping objects in Windows API terminology). (Section objects are a basic primitive of the memory manager and are explained in detail in Chapter 5, "Memory Management" of Part 1). As addresses in these mapped views are accessed, the memory manager pages-in-blocks that aren't in physical memory. And when memory demands dictate, the memory manager unmaps these pages out of the cache and, if the data has changed, pages the data back to the files.

By caching on the basis of a virtual address space using mapped files, the cache manager avoids generating read or write I/O request packets (IRPs) to access the data for files it's caching. Instead, it simply copies data to or from the virtual addresses where the portion of the cached file is mapped and relies on the memory manager to fault in (or out) the data in to (or out of) memory as needed. This process allows the memory manager to make global trade-offs on how much RAM to give to the system cache versus how much to give to user processes. (The cache manager also initiates I/O, such as lazy writing, which we describe later in this chapter; however, it calls the memory manager to write the pages.) Also, as we discuss in the next section, this design makes it possible for processes that open cached files to see the same data as do other processes that are mapping the same files into their user address spaces.

CHAPTER 11   Caching and file systems     567


---

## Cache coherency

One important function of a cache manager is to ensure that any process that accesses cached data will get the most recent version of that data. A problem can arise when one process opens a file (and hence the file is cached) while another process maps the file into its address space directly (using the Windows MapViewOfFile function). This potential problem doesn't occur under Windows because both the cache manager and the user applications that map files into their address spaces use the same memory management file mapping services. Because the memory manager guarantees that it has only one representation of each unique mapped file (regardless of the number of section objects or mapped views), it maps all views of a file (even if they overlap) to a single set of pages in physical memory, as shown in Figure 11-2. (For more information on how the memory manager works with mapped files, see Chapter 5 of Part 1.)

![Figure](figures/Winternals7thPt2_page_599_figure_002.png)

FIGURE 11-2 Coherent caching scheme.

So, for example, if Process 1 has a view (View 1) of the file mapped into its user address space, and

Process 2 is accessing the same view via the system cache, Process 2 sees any changes that Process

1 makes as they're made, not as they're flushed. The memory manager won't flush all user-mapped

---

pages—only those that it knows have been written to (because they have the modified bit set).

Therefore, any process accessing a file under Windows always sees the most up-to-date version of that

file, even if some processes have the file open through the I/O system and others have the file mapped

into their address space using the Windows file mapping functions.

![Figure](figures/Winternals7thPt2_page_600_figure_001.png)

Note Cache coherency in this case refers to coherency between user-mapped data and cached I/O and not between noncached and cached hardware access and I/Os, which are almost guaranteed to be incoherent. Also, cache coherency is somewhat more difficult for network redirectors than for local file systems because network redirectors must implement additional flushing and purge operations to ensure cache coherency when accessing network data.

## Virtual block caching

The Windows cache manager uses a method known as virtual block caching, in which the cache manager keeps track of which parts of which files are in the cache. The cache manager is able to monitor these file portions by mapping 256 KB views of files into system virtual address spaces, using special system cache routines located in the memory manager. This approach has the following key benefits:

- ■ It opens up the possibility of doing intelligent read-ahead; because the cache tracks which parts
of which files are in the cache, it can predict where the caller might be going next.
■ It allows the I/O system to bypass going to the file system for requests for data that is already
in the cache (fast I/O). Because the cache manager knows which parts of which files are in the
cache, it can return the address of cached data to satisfy an I/O request without having to call
the file system.
Details of how intelligent read-ahead and fast I/O work are provided later in this chapter in the "Fast I/O" and "Read-ahead and write-behind" sections.

## Stream-based caching

The cache manager is also designed to do stream caching rather than file caching. A stream is a sequence of bytes within a file. Some file systems, such as NTFS, allow a file to contain more than one stream; the cache manager accommodates such file systems by caching each stream independently. NTFS can exploit this feature by organizing its master file table (described later in this chapter in the "Master file table" section) into streams and by caching these streams as well. In fact, although the cache manager might be said to cache files, it actually caches streams (all files have at least one stream of data) identified by both a file name and, if more than one stream exists in the file, a stream name.

![Figure](figures/Winternals7thPt2_page_600_figure_009.png)

Note Internally, the cache manager is not aware of file or stream names but uses pointers to these structures.

---

## Recoverable file system support

Recoverable file systems such as NTFS are designed to reconstruct the disk volume structure after a system failure. This capability means that I/O operations in progress at the time of a system failure must be either entirely completed or entirely backed out from the disk when the system is restarted. Halfcompleted I/O operations can corrupt a disk volume and even render an entire volume inaccessible. To avoid this problem, a recoverable file system maintains a log file in which it records every update it intends to make to the file system structure (the file system's metadata) before it writes the change to the volume. If the system fails, interrupting volume modifications in progress, the recoverable file system uses information stored in the log to reissue the volume updates.

To guarantee a successful volume recovery, every log file record documenting a volume update must be completely written to disk before the update itself is applied to the volume. Because disk writes are cached, the cache manager and the file system must coordinate metadata updates by ensuring that the log file is flushed ahead of metadata updates. Overall, the following actions occur in sequence:

- 1. The file system writes a log file record documenting the metadata update it intends to make.

2. The file system calls the cache manager to flush the log file record to disk.

3. The file system writes the volume update to the cache—that is, it modifies its cached metadata.

4. The cache manager flushes the altered metadata to disk, updating the volume struc-

ture. (Actually, log file records are batched before being flushed to disk, as are volume

modifications.)
![Figure](figures/Winternals7thPt2_page_601_figure_004.png)

Note The term metadata applies only to changes in the file system structure: file and directory creation, renaming, and deletion.

When a file system writes data to the cache, it can supply a logical sequence number (LSN) that

identifies the record in its log file, which corresponds to the cache update. The cache manager keeps

track of these numbers, recording the lowest and highest LSNs (representing the oldest and newest

log file records) associated with each page in the cache. In addition, data streams that are protected by

transaction log records are marked as "no write" by NTFS so that the mapped page writer won't inad vertently write out these pages before the corresponding log records are written. (When the mapped

page writer sees a page marked this way, it moves the page to a special list that the cache manager

then flushes at the appropriate time, such as when lazy writer activity takes place.)

When it prepares to flush a group of dirty pages to disk, the cache manager determines the highest LSN associated with the pages to be flushed and reports that number to the file system. The file system can then call the cache manager back, directing it to flush log file data up to the point represented by the reported LSN. After the cache manager flushes the log file up to that LSN, it flushes the corresponding volume structure updates to disk, thus ensuring that it records what it's going to do before actually doing it. These interactions between the file system and the cache manager guarantee the recoverability of the disk volume after a system failure.

570     CHAPTER 11   Caching and file systems


---

## NTFS MFT working set enhancements

As we have described in the previous paragraphs, the mechanism that the cache manager uses to

cache files is the same as general memory mapped I/O interfaces provided by the memory manager

to the operating system. For accessing or caching a file, the cache manager maps a view of the file in

the system virtual address space. The contents are then accessed simply by reading off the mapped

virtual address range. When the cached content of a file is no longer needed (for various reasons—see

the next paragraphs for details), the cache manager unmaps the view of the file. This strategy works

well for any kind of data files but has some problems with the metadata that the file system maintains

for correctly storing the files in the volume.

When a file handle is closed (or the owning process dies), the cache manager ensures that the cached data is no longer in the working set. The NTFS file system accesses the Master File Table (MFT) as a big file, which is cached like any other user files by the cache manager. The problem with the MFT is that, since it is a system file, which is mapped and processed in the System process context, nobody will ever close its handle (unless the volume is unmounted), so the system never unwraps any cached view of the MFT. The process that initially caused a particular view of MFT to be mapped might have closed the handle or exited, leaving potentially unwanted views of MFT still mapped into memory consuming valuable system cachy (these views will be unmapped only if the system runs into memory pressure).

Windows 8.1 resolved this problem by storing a reference counter to every MFT record in a dynami cally allocated multilevel array, which is stored in the NTFS file system Volume Control Block (VCB)

structure. Every time a File Control Block (FCB) data structure is created (further details on the FCB

and VCB are available later in this chapter), the file system increases the counter of the relative MFT

index record. In the same way, when the FCB is destroyed (meaning that all the handles to the file or

directory that the MFT entry refers to are closed), NTFS dereferences the relative counter and calls the

CCUmapFileOffsetFromSystemCache cache manager routine, which will unmap the part of the MFT

that is no longer needed.

## Memory partitions support

Windows 10, with the goal to provide support for Hyper-V containers containers and game mode, introduced the concept of partitions. Memory partitions have already been described in Chapter 5 of Part 1. As seen in that chapter, memory partitions are represented by a large data structure (MI PARTITION), which maintains memory-related management structures related to the partition, such as page lists (standby, modified, zero, free, and so on), commit charge, working set, page trimmer, modified page writer, and zero-page thread. The cache manager needs to cooperate with the memory manager in order to support partitions. During phase 1 of NT kernel initialization, the system creates and initializes the cache manager partition (for further details about Windows kernel initialization, see Chapter 12, “Startup and shutdown”), which will be part of the System Executive partition (MemoryPartition0). The cache manager’s code has gone through a big refactoring to support partitions; all the global cache manager data structures and variables have been moved in the cache manager partition data structure (CC_PARTITION).

CHAPTER 11   Caching and file systems      571


---

The cache manager's partition contains cache-related data, like the global shared cache maps list,

the worker threads list (read-ahead, write-behind, and extra write-behind; lazy writer and lazy writer

scan; async reads), lazy writer scan events, an array that holds the history of write-behind throughout,

the upper and lower limit for the dirty pages threshold, the number of dirty pages, and so on. When

the cache manager system partition is initialized, all the needed system threads are started in the

context of a System process which belongs to the partition. Each partition always has an associated

minimal System process, which is created at partition-creation time (by the NtCreatePartition API).

When the system creates a new partition through the NTCreatePartition API, it always creates and initializes an empty MI_PARTITION object (the memory is moved from a parent partition to the child, or hot-added later by using the NtManagePartition function). A cache manager partition object is created only on-demand. If no files are created in the context of the new partition, there is no need to create the cache manager partition object. When the file system creates or opens a file for caching access, the CcInitializeCacheMap(Ex) function checks which partition the file belongs to and whether the partition has a valid link to a cache manager partition. In case there is no cache manager partition, the system creates and initializes a new one through the CcCreatePartition routine. The new partition starts separate cache manager-related threads (read-ahead, lazy writers, and so on) and calculates the new values of the dirty page threshold based on the number of pages that belong to the specific partition.

The file object contains a link to the partition it belongs to through its control area, which is initially allocated by the file system driver when creating and mapping the Stream Control Block (SCB). The partition of the target file is stored into a file object extension (of type MemoryPartitionInformation) and is checked by the memory manager when creating the section object for the SCB. In general, files are shared entities, so there is no way for File System drivers to automatically associate a file to a different partition than the System Partition. An application can set a different partition for a file using the NSetInformationFileKernel API, through the new FileMemoryPartitionInformation class.

## Cache virtual memory management

Because the Windows system cache manager caches data on a virtual basis, it uses up regions of system virtual address space (instead of physical memory) and manages them in structures called virtual address control blocks, or VACBs. VACBs define these regions of address space into 256 KB slots called views. When the cache manager initializes during the bootup process, it allocates an initial array of VACBs to describe cached memory. As caching requirements grow and more memory is required, the cache manager allocates more VACB arrays, as needed. It can also shrink virtual address space as other demands put pressure on the system.

At a file's first I/O (read or write) operation, the cache manager maps a 256 KB view of the 256 KBaligned region of the file that contains the requested data into a free slot in the system cache address space. For example, if 10 bytes starting at an offset of 300,000 bytes were read into a file, the view that would be mapped would begin at offset 262144 (the second 256 KB-aligned region of the file) and extend for 256 KB.

---

The cache manager maps views of files into slots in the cache's address space on a round-robin basis, mapping the first requested view into the first 256 KB slot, the second view into the second 256 KB slot, and so forth, as shown in Figure 11-3. In this example, File B was mapped first. File A second, and File C third, so File B's mapped chunk occupies the first slot in the cache. Notice that only the first 256 KB portion of File B has been mapped, which is due to the fact that only part of the file has been accessed. Because File C is only 100 KB (and thus smaller than one of the views in the system cache), it requires its own 256 KB slot in the cache.

![Figure](figures/Winternals7thPt2_page_604_figure_001.png)

FIGURE 11-3 Files of varying sizes mapped into the system cache.

The cache manager guarantees that a view is mapped as long as it's active (although views can

remain mapped after they become inactive). A view is marked active, however, only during a read

or write operation to or from the file. Unless a process opens a file by specifying the FILE_FLAG_

RANDOM_ACCESS flag in the call to CreateFile, the cache manager unmaps inactive views of a file as it

maps new views for the file if it detects that the file is being accessed sequentially. Pages for unmapped

views are sent to the standby or modified lists (depending on whether they have been changed), and

because the memory manager exports a special interface for the cache manager, the cache manager

can direct the pages to be placed at the end or front of these lists. Pages that correspond to views of

files opened with the FILE_FLAG_SEQUENTIAL SCAN flag are moved to the front of the lists, whereas

all others are moved to the end. This scheme encourages the reuse of pages belonging to sequentially

read files and specifically prevents a large file copy operation from affecting more than a small part of

physical memory. The flag also affects unmapping. The cache manager will aggressively unmap views

when this flag is supplied.

If the cache manager needs to map a view of a file, and there are no more free slots in the cache, it will unmap the least recently mapped inactive view and use that slot. If no views are available, an I/O error is returned, indicating that insufficient system resources are available to perform the operation. Given that views are marked active only during a read or write operation, however, this scenario is extremely unlikely because thousands of files would have to be accessed simultaneously for this situation to occur.

CHAPTER 11   Caching and file systems      573


---

## Cache size

In the following sections, we explain how Windows computes the size of the system cache, both virtually and physically. As with most calculations related to memory management, the size of the system cache depends on a number of factors.

## Cache virtual size

On a 32-bit Windows system, the virtual size of the system cache is limited solely by the amount of kernel-mode virtual address space and the SystemCacheLimit registry key that can be optionally configured. (See Chapter 5 of Part 1 for more information on limiting the size of the kernel virtual address space.) This means that the cache size is capped by the 2-GB system address space, but it is typically significantly smaller because the system address space is shared with other resources, including system paged table entries (PTEs), nonpaged and paged pool, and page tables. The maximum virtual cache size is 64 TB on 64-bit Windows, and even in this case, the limit is still tied to the system address space size: in future systems that will support the 56-bit addressing mode, the limit will be 32 PB (petabytes).

## Cache working set size

As mentioned earlier, one of the key differences in the design of the cache manager in Windows from that of other operating systems is the delegation of physical memory management to the global memory manager. Because of this, the existing code that handles working set expansion and trimming, as well as managing the modified and standby lists, is also used to control the size of the system cache, dynamically balancing demands for physical memory between processes and the operating system.

The system cache doesn't have its own working set but shares a single system set that includes cache data, paged pool, pageable kernel code, and pageable driver code. As explained in the section "System working sets" in Chapter 5 of Part 1, this single working set is called internally the system cache working set even though the system cache is just one of the components that contribute to it. For the purposes of this book, we refer to this working set simply as the system working set. Also explained in Chapter 5 is the fact that if the LargeSystemCache registry value is 1, the memory manager favors the system working set over that of processes running on the system.

## Cache physical size

While the system working set includes the amount of physical memory that is mapped into views in the

cache's virtual address space, it does not necessarily reflect the total amount of file data that is cached

in physical memory. There can be a discrepancy between the two values because additional file data

might be in the memory manager's standby or modified page lists.

Recall from Chapter 5 that during the course of working set trimming or page replacement, the

memory manager can move dirty pages from a working set to either the standby list or the modified

page list, depending on whether the page contains data that needs to be written to the paging file or

another file before the page can be reused. If the memory manager didn’t implement these lists, any

time a process accessed data previously removed from its working set, the memory manager would

---

have to hard-fault it in from disk. Instead, if the accessed data is present on either of these lists, the memory manager simply soft-faults the page back into the process's working set. Thus, the lists serve as in-memory caches of data that are stored in the paging file, executable images, or data files. Thus, the total amount of file data cached on a system includes not only the system working set but the combined sizes of the standby and modified page lists as well.

An example illustrates how the cache manager can cause much more file data than that containable in the system working set to be cached in physical memory. Consider a system that acts as a dedicated file server. A client application accesses file data from across the network, while a server, such as the file server driver (%SystemRoot%\System32\Drivers\Sn2.sys, described later in this chapter), uses cache manager interfaces to read and write file data on behalf of the client. If the client reads through several thousand files of 1 MB each, the cache manager will have to start reusing views when it runs out of mapping space (and can't enlarge the VACB mapping area). For each file read thereafter, the cache manager unmaps views and remaps them for new files. When the cache manager unmaps a view, the memory manager doesn't discard the file data in the cache's working set that corresponds to the view; it moves the data to the standby list. In the absence of any other demand for physical memory, the standby list can consume almost all the physical memory that remains outside the system working set. In other words, virtually all the server's physical memory will be used to cache file data, as shown in Figure 11-4.

![Figure](figures/Winternals7thPt2_page_606_figure_002.png)

FIGURE 11-4 Example in which most of physical memory is being used by the file cache.

Because the total amount of file data cached includes the system working set, modified page list, and standby list—the sizes of which are all controlled by the memory manager—it is in a sense the real cache manager. The cache manager subsystem simply provides convenient interfaces for accessing file data through the memory manager. It also plays an important role with its read-ahead and writebehind policies in influencing what data the memory manager keeps present in physical memory, as well as with managing system virtual address views of the space.

To try to accurately reflect the total amount of file data that's cached on a system, Task Manager shows a value named "cached" in its performance view that reflects the combined size of the system working set, standby list, and modified page list. Process Explorer, on the other hand, breaks up these values into Cache WS (system cache working set), Standby, and Modified. Figure 11-5 shows the system information view in Process Explorer and the Cache WS value in the Physical Memory area in the lower left of the figure, as well as the size of the standby and modified lists in the Paging Lists area near the middle of the figure. Note that the Cache value in Task Manager also includes the Paged WS,

CHAPTER 11   Caching and file systems      575


---

Kernel WS, and Driver WS values shown in Process Explorer. When these values were chosen, the vast majority of System WS came from the Cache WS. This is no longer the case today, but the anachronism remains in Task Manager.

![Figure](figures/Winternals7thPt2_page_607_figure_001.png)

FIGURE 11-5 Process Explorer's System Information dialog box.

## Cache data structures

The cache manager uses the following data structures to keep track of cached files:

- ■ Each 256 KB slot in the system cache is described by a VACB.

■ Each separately opened cached file has a private cache map, which contains information used
to control read-ahead (discussed later in the chapter in the “Intelligent read-ahead” section).

■ Each cached file has a single shared cache map structure, which points to slots in the system
cache that contain mapped views of the file.
These structures and their relationships are described in the next sections.

## Systemwide cache data structures

As previously described, the cache manager keeps track of the state of the views in the system cache by using an array of data structures called virtual address control block (VACB) arrays that are stored in nonpaged pool. On a 32-bit system, each VACB is 32 bytes in size and a VACB array is 128 KB, resulting

576 CHAPTER 11 Caching and file systems


---

in 4,096 VACBs per array. On a 64-bit system, a VACB is 40 bytes, resulting in 3,276 VACBs per array. The cache manager allocates the initial VACB array during system initialization and links it into the systemwide list of VACBs called CcVacBs. Each VACB represents one 256 KB view in the system cache, as shown in Figure 11-6. The structure of a VACB is shown in Figure 11-7.

FIGURE 11-6 System VACB array.

FIGURE 11-7 VACB data structure.

CHAPTER 11 Caching and file systems 577


---

Additionally, each VACB array is composed of two kinds of VACB: low priority mapping VACBs and high

priority mapping VACBs. The system allocates 64 initial high priority VACBs for each VACB array. High

priority VACBs have the distinction of having their views preallocated from system address space. When

the memory manager has no views to give to the cache manager at the time of mapping some data, and

if the mapping request is marked as high priority, the cache manager will use one of the preallocated

views present in a high priority VACB. It uses these high priority VACBs, for example, for critical file system

metadata as well as for purging data from the cache. After high priority VACBs are gone, however, any

operation requiring a VACB view will fall with insufficient resources. T ypically, the mapping priority is set

to the default of low, but by using the PIN_HIGH_PRIORITY flag when pinning (described later) cached

data, file systems can request a high priority VACB to be used instead, if one is needed.

As you can see in Figure 11-7, the first field in a VACB is the virtual address of the data in the system

cache. The second field is a pointer to the shared cache map structure, which identifies which file is

cached. The third field identifies the offset within the file at which the view begins (always based on

256 KB granularity). Given this granularity, the bottom 16 bits of the file offset will always be zero, so

those bits are reused to store the number of references to the view—that is, how many active reads

or writes are accessing the view. The fourth field links the VACB into a list of least-recently-used (LRU)

VACBs when the cache manager frees the VACB; the cache manager first checks this list when allocat ing a new VACB. Finally, the fifth field links this VACB to the VACB array header representing the array

in which the VACB is stored.

During an I/O operation on a file, the file's VACB reference count is incremented, and then it's decremented when the I/O operation is over. When the reference count is nonzero, the VACB is active. For access to file system metadata, the active count represents how many file system drivers have the pages in that view locked into memory.

## EXPERIMENT: Looking at VACBs and VACB statistics

The cache manager internally keeps track of various values that are useful to developers and

support engineers when debugging crash dumps. All these debugging variables start with the


CcDbg prefix, which makes it easy to see the whole list, thanks to the x command:

```bash
1: kd>d nt!tcd!ccfgg
    ####F800 0D52741c nt!CcDbgNumberOfFailedWorkQueueEntryAllocations = <no type information>
    ####F800 0D5276ec nt!CcDbgNumberOfNoopedReadAheads = <no type information>
    ####F800 0D5276e8 nt!CcDbgIsLargeThanHInt = <no type information>
    ####F800 0D5276e4 nt!CcDbgAdditionalPagesQueuedCount = <no type information>
    ####F800 0D543370 nt!CcDbgFoundAsyncReadThreadListEmpty = <no type information>
    ####F800 0D54336c nt!CcDbgNumberOfCclmapInactiveViews = <no type information>
    ####F800 0D5276eb nt!CcDbgSkippedReductions = <no type information>
    ####F800 0D542e04 nt!CcDbgDisableDAX = <no type information>
    ...
```

Some systems may show differences in variable names due to 32-bit versus 64-bit implementations. The exact variable names are irrelevant in this experiment—focus instead on the methodology that is explained. Using these variables and your knowledge of the VACB array header data structures, you can use the kernel debugger to list all the VACB array headers.

---

The CcVacArrays variable is an array of pointers to VACB array headers, which you dereference

to dump the contents of the _VACB_ARRAY_HEADERS. First, obtain the highest array index:

```bash
1: kdx_dd nt!CVacArraysHighestUsedIndex  11
ffff800 0d529c1c 00000000
```

And now you can dereference each index until the maximum index. On this system (and this is

the norm), the highest index is 0, which means there's only one header to dereference:

```bash
1: kd> ???(*((ntl_VAC_ARRAY_HEADER)***@ntl(CvcVacbArrays))[0]
struct VACB_ARRAY_HEADER = {0xfffc40d'221cb000
  +0x000 VacbArrayIndex   : 0
  +0x004 MappingCount    : 0x302
  +0x008 HighestMappedIndex : 0x301
  +0x00c Reserved       : 0
```

If there were more, you could change the array index at the end of the command with a

higher number, until you reach the highest used index. The output shows that the system has

only one VACB array with 770 (0x302) active VACBs.

Finally, the CConfigOffreeVacs variable stores the number of VACBs on the free VACB list.


Dumping this variable on the system used for the experiment results in 2.506 (0x9ca).

```bash
1: kd-- dd ntlCcbNumberOffFreeVacbs  11
!!!!f800 d0257318  000009ca
```

As expected, the sum of the free (0x9ea—2,506 decimal) and active VACBs (0x302—770 decimal) on a 64-bit system with one VACB array equals 3,276, the number of VACBs in one VACB array. If the system were to run out of free VACBs, the cache manager would try to allocate a new VACB array. Because of the volatile nature of this experiment, your system may create and/or free additional VACBs between the two steps (dumping the active and then the free VACBs). This might cause your total of free and active VACBs to not match exactly 3,276. Try quickly repeating the experiment a couple of times if this happens, although you may never get stable numbers, especially if there is a lot of file system activity on the system.

## Per-file cache data structures

Each open handle to a file has a corresponding file object. (File objects are explained in detail in Chapter 6 of Part 1, "I/O system.") If the file is cached, the file object points to a private cache map structure that contains the location of the last two reads so that the cache manager can perform intelligent read-ahead (described later, in the section "Intelligent read-ahead"). In addition, all the private cache maps for open instances of a file are linked together.

Each cached file (as opposed to file object) has a shared cache map structure that describes the state

of the cached file, including the partition to which it belongs, its size, and its valid data length. (The

function of the valid data length field is explained in the section "Write-back caching and lazy writing.")

The shared cache map also points to the section object (maintained by the memory manager and which

describes the file's mapping into virtual memory), the list of private cache maps associated with that

CHAPTER 11   Caching and file systems     579


---

file, and any VACBs that describe currently mapped views of the file in the system cache. (See Chapter 5 of Part 1 for more about section object pointers.) All the opened shared cache maps for different files are linked in a global linked list maintained in the cache manager's partition data structure. The relationships among these per-file cache data structures are illustrated in Figure 11-8.

![Figure](figures/Winternals7thPt2_page_611_figure_001.png)

FIGURE 11-8 Per-file cache data structures.

When asked to read from a particular file, the cache manager must determine the answers to two questions:

- 1. Is the file in the cache?

2. If so, which VACB, if any, refers to the requested location?
In other words, the cache manager must find out whether a view of the file at the desired address is

mapped into the system cache. If no VACB contains the desired file offset, the requested data isn't cur rently mapped into the system cache.

To keep track of which views for a given file are mapped into the system cache, the cache manager maintains an array of pointers to VACBs, which is known as the VACB index array. The first entry in the VACB index array refers to the first 256 KB of the file, the second entry to the second 256 KB, and so on. The diagram in Figure 11-9 shows four different sections from three different files that are currently mapped into the system cache.

---

When a process accesses a particular file in a given location, the cache manager looks in the appro priate entry in the file's VACB index array to see whether the requested data has been mapped into the

cache. If the array entry is nonzero (and hence contains a pointer to a VACB), the area of the file being

referenced is in the cache. The VACB, in turn, points to the location in the system cache where the view

of the file is mapped. If the entry is zero, the cache manager must find a free slot in the system cache

(and therefore a free VACB) to map the required view.

As a size optimization, the shared cache map contains a VACB index array that is four entries in size. Because each VACB describes 256 KB, the entries in this small, fixed-size index array can point to VACB array entries that together describe a file of up to 1 MB. If a file is larger than 1 MB, a separate VACB index array is allocated from nonpaged pool, based on the size of the file divided by 256 KB and rounded up in the case of a remainder. The shared cache map then points to this separate structure.

![Figure](figures/Winternals7thPt2_page_612_figure_002.png)

FIGURE 11-9 VACB index arrays.

As a further optimization, the VACB index array allocated from nonpaged pool becomes a sparse

multilevel index array if the file is larger than 32 MB, where each index array consists of 128 entries. You

can calculate the number of levels required for a file with the following formula:

(Number of bits required to represent file size - 18) / 7

Round up the result of the equation to the next whole number. The value 18 in the equation comes

from the fact that a VACB represents 256 KB, and 256 KB is 2×18. The value 7 comes from the fact that

each level in the array has 128 entries and 2×7 is 128. Thus, a file that has a size that is the maximum that

can be described with 63 bits (the largest size the cache manager supports) would require only seven

levels. The array is sparse because the only branches that the cache manager allocates are ones for

which there are active views at the lowest-level index array. Figure 11-10 shows an example of a multi level VACB array for a sparse file that is large enough to require three levels.

CHAPTER 11   Caching and file systems     581


---

![Figure](figures/Winternals7thPt2_page_613_figure_000.png)

FIGURE 11-10 Multilevel VACB arrays.

This scheme is required to efficiently handle sparse files that might have extremely large file sizes

with only a small fraction of valid data because only enough of the array is allocated to handle the

currently mapped views of a file. For example, a 32-GB sparse file for which only 256 KB is mapped into

the cache's virtual address space would require a VAC array with three allocated index arrays because

only one branch of the array has a mapping and a 32-GB file requires a three-level array. If the cache

manager didn't use the multilevel VACB index array optimization for this file, it would have to allocate

a VACB index array with 128,000 entries, or the equivalent of 1,000 VACB index arrays.

## File system interfaces

The first time a file's data is accessed for a cached read or write operation, the file system driver is

responsible for determining whether some part of the file is mapped in the system cache. If it's not,

the file system driver must call the CcInitializeCacheMap function to set up the per-file data structures

described in the preceding section.

582      CHAPTER 11   Caching and file systems


---

Once a file is set up for cached access, the file system driver calls one of several functions to access

the data in the file. There are three primary methods for accessing cached data, each intended for a

specific situation:

- The copy method copies user data between cache buffers in system space and a process buffer

in user space.

• The mapping and pinning method uses virtual addresses to read and write data directly from

and to cache buffers.

• The physical memory access method uses physical addresses to read and write data directly

from and to cache buffers.
File system drivers must provide two versions of the file read operation—cached and noncached— to prevent an infinite loop when the memory manager processes a page fault. When the memory manager resolves a page fault by calling the file system to retrieve data from the file (via the device driver, of course), it must specify this as a paging read operation by setting the “no cache” and “paging IO” flags in the IRP.

Figure 11-11 illustrates the typical interactions between the cache manager, the memory manager, and file system drivers in response to user read or write file I/O. The cache manager is invoked by a file system through the copy interfaces (the CcCopyRead and CcCopyWrite paths). To process a CcFastCopyRead or CcCopyRead read, for example, the cache manager creates a view in the cache to map a portion of the file being read and reads the file data into the user buffer by copying from the view. The copy operation generates page faults as it accesses each previously invalid page in the view, and in response the memory manager initiates noncached I/O into the file system driver to retrieve the data corresponding to the part of the file mapped to the page that faulted.

![Figure](figures/Winternals7thPt2_page_614_figure_004.png)

FIGURE 11-11 File system interaction with cache and memory managers.

The next three sections explain these cache access mechanisms, their purpose, and how they're used.

CHAPTER 11   Caching and file systems     583


---

## Copying to and from the cache

Because the system cache is in system space, it's mapped into the address space of every process. As with all system space pages, however, cache pages aren't accessible from user mode because that would be a potential security hole. (For example, a process might not have the rights to read a file whose data is currently contained in some part of the system cache.) Thus, user application file reads and writes to cached files must be serviced by kernel-mode routines that copy data between the cache's buffers in system space and the application's buffers residing in the process address space.

## Caching with the mapping and pinning interfaces

Just as user applications read and write data in files on a disk, file system drivers need to read and write

the data that describes the files themselves (the metadata, or volume structure data). Because the file

system drivers run in kernel mode, however, they could, if they could, if the cache manager were properly informed,

modify data directly in the system cache. To permit this optimization, the cache manager provides

functions that permit the file system drivers to find where in virtual memory the file system metadata

resides, thus allowing direct modification without the use of intermediary buffers.

If a file system driver needs to read file system metadata in the cache, it calls the cache manager's

mapping interface to obtain the virtual address of the desired data. The cache manager touches all the

requested pages to bring them into memory and then returns control to the file system driver. The file

system driver can then access the data directly.

If the file system driver needs to modify cache pages, it calls the cache manager's pinning services, which keep the pages active in virtual memory so that they can't be reclaimed. The pages aren't actually locked into memory (such as when a device driver locks pages for direct memory access transfers). Most of the time, a file system driver will mark its metadata stream as no write, which instructs the memory manager's mapped page writer (explained in Chapter 5 of Part 1) to not write the pages to disk until explicitly told to do so. When the file system driver unpins (releases) them, the cache manager releases its resources so that it can lazily flush any changes to disk and release the cache view that the metadata occupied.

The mapping and pinning interfaces solve one thorny problem of implementing a file system buffer management. Without directly manipulating cached metadata, a file system must predict the maximum number of buffers it will need when updating a volume's structure. By allowing the file system to access and update its metadata directly in the cache, the cache manager eliminates the need for buffers, simply updating the volume structure in the virtual memory the memory manager provides. The only limitation the file system encounters is the amount of available memory.

## Caching with the direct memory access interfaces

In addition to the mapping and pinning interfaces used to access metadata directly in the cache, the cache manager provides a third interface to cached data: direct memory access (DMA). The DMA functions are used to read from or write to cache pages without intervening buffers, such as when a network file system is doing a transfer over the network.

---

The DMA interface returns to the file system the physical addresses of cached user data (rather than the virtual addresses, which the mapping and pinning interfaces return), which can then be used to transfer data directly from physical memory to a network device. Although small amounts of data (1 KB to 2 KB) can use the usual buffer-based copying interfaces, for larger transfers the DMA interface can result in significant performance improvements for a network server processing file requests from remote systems. To describe these references to physical memory, a memory descriptor list (MDL) is used. (MDLs are introduced in Chapter 5 of Part 1.)

## Fast I/O

Whenever possible, reads and writes to cached files are handled by a high-speed mechanism named

fast I/O. Fast I/O is a means of reading or writing a cached file without going through the work of

generating an IRP. With fast I/O, the I/O manager calls the file system driver's fast I/O routine to see

whether I/O can be satisfied directly from the cache manager without generating an IRP.

Because the cache manager is architected on top of the virtual memory subsystem, file system drivers can use the cache manager to access file data simply by copying to or from pages mapped to the actual file being referenced without going through the overhead of generating an IRP.

Fast I/O doesn't always occur. For example, the first read or write to a file requires setting up the file for caching (mapping the file into the cache and setting up the cache data structures, as explained earlier in the section "Cache data structures"). Also, if the caller specified an asynchronous read or write, fast I/O isn't used because the caller might be stalled during paging I/O operations required to satisfy the buffer copy to or from the system cache and thus not really providing the requested asynchronous I/O operation. But even on a synchronous I/O operation, the file system driver might decide that it can't process the I/O operation by using the fast I/O mechanism—say, for example, if the file in question has a locked range of bytes (as a result of calls to the Windows LockFile and UnlockFile functions). Because the cache manager doesn't know what parts of which files are locked, the file system driver must check the validity of the read or write, which requires generating an IRP. The decision tree for fast I/O is shown in Figure 11-12.

These steps are involved in servicing a read or a write with fast I/O:

- 1. A thread performs a read or write operation.

2. If the file is cached and the I/O is synchronous, the request passes to the fast I/O entry point of

the file system driver stack. If the file isn't cached, the file system driver sets up the file for cach-

ing so that the next time, fast I/O can be used to satisfy a read or write request.

3. If the file system driver's fast I/O routine determines that fast I/O is possible, it calls the cache

manager's read or write routine to access the file data directly in the cache. (If fast I/O isn't pos-

sible, the file system driver returns to the I/O system, which then generates an IRP for the I/O

and eventually calls the file system's regular read routine.)

4. The cache manager translates the supplied file offset into a virtual address in the cache.
CHAPTER 11   Caching and file systems      585


---

5. For reads, the cache manager copies the data from the cache into the buffer of the process

requesting it; for writes, it copies the data from the buffer to the cache.

6. One of the following actions occurs:

- • For reads where FILE_FLAG.RANDOM_ACCESS wasn't specified when the file was opened,
the read-ahead information in the caller's private cache map is updated. Read-ahead may
also be queued for files for which the FO_RANDOM_ACCESS flag is not specified.

• For writes, the dirty bit of any modified page in the cache is set so that the lazy writer will
know to flush it to disk.

• For write-through files, any modifications are flushed to disk.
![Figure](figures/Winternals7thPt2_page_617_figure_003.png)

FIGURE 11-12 Fast I/O decision tree.

## Read-ahead and write-behind

In this section, you'll see how the cache manager implements reading and writing file data on behalf of file system drives. Keep in mind that the cache manager is involved in file I/O only when a file is opened without the FILE_FLAG_NO_BUFFERING flag and then read from or written to using the Windows I/O

586      CHAPTER 11   Caching and file systems


---

functions (for example, using the Windows ReadFile and WriteFile functions). Mapped files don't go through the cache manager, nor do files opened with the FILE_FLAG_NO_BUFFERING flag set.

![Figure](figures/Winternals7thPt2_page_618_figure_001.png)

Note When an application uses the FILE_FLAG_NO_BUFFERING flag to open a file, its file I/O must start at device-aligned offsets and be of sizes that are a multiple of the alignment size; its input and output buffers must also be device-aligned virtual addresses. For file systems, this usually corresponds to the sector size (4,096 bytes on NTFS, typically, and 2,048 bytes on CDFS). One of the benefits of the cache manager, apart from the actual caching performance, is the fact that it performs intermediate buffering to allow arbitrarily aligned and sized I/O.

## Intelligent read-ahead

The cache manager uses the principle of spatial locality to perform intelligent read-ahead by predicting what data the calling process is likely to read next based on the data that it's reading currently. Because the system cache is based on virtual addresses, which are contiguous for a particular file, it doesn't matter whether they're juxtaposed in physical memory. File read-ahead for logical block caching is more complex and requires tight cooperation between file system drivers and the block cache because that cache system is based on the relative positions of the accessed data on the disk, and, of course, files aren't necessarily stored contiguously on disk. You can examine read-ahead activity by using the Cache Read Ahead/see performance counter or the CcReadAhead/ios system variable.

Reading the next block of a file that is being accessed sequentially provides an obvious performance improvement, with the disadvantage that it will cause head seeks. To extend read-ahead benefits to cases of stridden data accesses (both forward and backward through a file), the cache manager maintains a history of the last two read requests in the private cache map for the file handle being accessed, a method known as asynchronous read-ahead with history. If a pattern can be determined from the caller's apparently random reads, the cache manager extrapolates it. For example, if the caller reads page 4,000 and then page 3,000, the cache manager assumes that the next page the caller will require is page 2,000 and prereads it.

![Figure](figures/Winternals7thPt2_page_618_figure_006.png)

Note Although a caller must issue a minimum of three read operations to establish a predictable sequence, only two are stored in the private cache map.

To make read-ahead even more efficient, the Win32 CreateFile function provides a flag indicating forward sequential file access: FILE_FLAG_SEQUENTIAL_SCAN. If this flag is set, the cache manager doesn't keep a read history for the caller for prediction but instead performs sequential read-ahead. However, as the file is read into the cache's working set, the cache manager unmaps views of the file that are no longer active and, if they are unmodified, directs the memory manager to place the pages belonging to the unmapped views at the front of the standby list so that they will be quickly reused. It also reads ahead two times as much data (2 MB instead of 1 MB, for example). As the caller continues reading, the cache manager prereads additional blocks of data, always staying about one read (of the size of the current read) ahead of the caller.

CHAPTER 11   Caching and file systems      587


---

The cache manager's read-ahead is asynchronous because it's performed in a thread separate from the caller's thread and proceeds concurrently with the caller's execution. When called to retrieve cached data, the cache manager first accesses the requested virtual page to satisfy the request and then queues an additional I/O request to retrieve additional data to a system worker thread. The worker thread then executes in the background, reading additional data in anticipation of the caller's next read request. The preread pages are faulted into memory while the program continues executing so that when the caller requests the data it's already in memory.

For applications that have no predictable read pattern, the FILE_FLAG_RANDOM_ACCESS flag can be specified when the CreateFile function is called. This flag instructs the cache manager not to attempt to predict where the application is reading next and thus disables read-ahead. The flag also stops the cache manager from aggressively unmapping views of the file as the file is accessed so as to minimize the mapping/unmapping activity for the file when the application revisits portions of the file.

## Read-ahead enhancements

Windows 8.1 introduced some enhancements to the cache manager read-ahead functionality. File system

drivers and network redirectors can decide the size and growth for the intelligent read-ahead with the

CcSetReadAheadGranularityEx API function. The cache manager client can decide the following:

■ Read-ahead granularity Sets the minimum read-ahead unit size and the end file-offset of

the next read-ahead. The cache manager sets the default granularity to 4 Kbytes (the size of a

memory page), but every file system sets this value in a different way (NTFS, for example, sets

the cache granularity to 64 Kbytes).

Figure 11-13 shows an example of read-ahead on a 200 Kbyte-sized file, where the cache granularity has been set to 64 KB. If the user requests a nonaligned 1 KB read at offset 0x10800, and if a sequential read has already been detected, the intelligent read-ahead will emit an I/O that encompasses the 64 KB of data from offset 0x10000 to 0x20000. If there were already more than two sequential reads, the cache manager emits another supplementary read from offset 0x20000 to offset 0x30000 (192 Kbytes).

![Figure](figures/Winternals7thPt2_page_619_figure_006.png)

FIGURE 11-13 Read-ahead on a 200 KB file, with granularity set to 64KB.

■ Pipeline size For some remote file system drivers, it may make sense to split large read-ahead I/O Os into smaller chunks, which will be emitted in parallel by the cache manager worker threads. A network file system can achieve a substantial better throughput using this technique.

---

■ Read-ahead aggressiveness File system drivers can specify the percentage used by the cache manager to decide how to increase the read-ahead size after the detection of a third sequential read. For example, let's assume that an application is reading a big file using a 1 MByte I/O size. After the tenth read, the application has already read 10 MBytes (the cache manager may have already prefetched some of them). The intelligent read-ahead now decides by how much to grow the read-ahead I/O size. If the file system has specified 60% of growth, the formula used is the following:

(Number of sequential reads * Size of last read) * (Growth percentage / 100)

So, this means that the next read-ahead size is 6 MB (instead of being 2 MB, assuming that the granularity is 64 KB and the I/O size is 1 MB). The default growth percentage is 50% if not modified by any cache manager client.

## Write-back caching and lazy writing

The cache manager implements a write-back cache with lazy write. This means that data written to files is first stored in memory in cache pages and then written to disk later. Thus, write operations are allowed to accumulate for a short time and are then flushed to disk all at once, reducing the overall number of disk I/O operations.

The cache manager must explicitly call the memory manager to flush cache pages because other

wise the memory manager writes memory contents to disk only when demand for physical memory

exceeds supply, as is appropriate for volatile data. Cached file data, however, represents nonvolatile

disk data. If a process modifies cached data, the user expects the contents to be reflected on disk in a

timely manner.

Additionally, the cache manager has the ability to veto the memory manager's mapped writer thread. Since the modified list (see Chapter 5 of Part 1 for more information) is not sorted in logical block address (LBA) order, the cache manager's attempts to cluster pages for larger sequential I/Os to the disk are not always successful and actually cause repeated seeks. To combat this effect, the cache manager has the ability to aggressively veto the mapped writer thread and stream out writes in virtual byte offset (VBO) order, which is much closer to the LBA order on disk. Since the cache manager now owns these writes, it can also apply its own scheduling and throttling algorithms to prefer read-ahead over write-behind and impact the system less.

The decision about how often to flush the cache is an important one. If the cache is flushed too frequently, system performance will be slowed by unnecessary I/O. If the cache is flushed too rarely, you risk losing modified file data in the cases of a system failure (a loss especially irritating to users who know that they asked the application to save the changes) and running out of physical memory (because it's being used by an excess of modified pages).

CHAPTER 11   Caching and file systems     589


---

To balance these concerns, the cache manager‛s lazy writer scan function executes on a system

worker thread once per second. The lazy writer scan has different duties:

- • Checks the number of average available pages and dirty pages (that belongs to the current
partition) and updates the dirty page threshold's bottom and the top limits accordingly. The
threshold itself is updated too, primarily based on the total number of dirty pages written in the
previous cycle (see the following paragraphs for further details). It sleeps if there are no dirty
pages to write.

• Calculates the number of dirty pages to write to disk through the CcCalculatePagesToWrite in-
ternal routine. If the number of dirty pages is more than 256 (1 MB of data), the cache manager
queues one-eighth of the total dirty pages to be flushed to disk. If the rate at which dirty pages
are being produced is greater than the amount the lazy writer had determined it should write,
the lazy writer writes an additional number of dirty pages that it calculates are necessary to
match that rate.

• Cycles between each shared cache map (which are stored in a linked list belonging to the cur-
rent partition), and, using the internal CcShouldLazyWriteCacheMap routine, determines if the
current file described by the shared cache map needs to be flushed to disk. There are different
reasons why a file shouldn't be flushed to disk: for example, an I/O could have been already
initialized by another thread, the file could be a temporary file, or, more simply, the cache map
might not have any dirty pages. In case the routine determined that the file should be flushed
out, the lazy writer scan checks whether there are still enough available pages to write, and, if
so, posts a work item to the cache manager system worker threads.
![Figure](figures/Winternals7thPt2_page_621_figure_002.png)

Note The lazy writer scan uses some exceptions while deciding the number of dirty pages mapped by a particular shared cache map to write (it doesn't always write all the dirty pages of a file); if the target file is a metadata stream with more than 256 KB of dirty pages, the cache manager writes only one-eighth of its total pages. Another exception is used for files that have more dirty pages than the total number of pages that the lazy writer scan can flush.

Lazy writer system worker threads from the systemwide critical worker thread pool actually perform the I/O operations. The lazy writer is also aware of when the memory manager's mapped page writer is already performing a flush. In these cases, it delays its write-back capabilities to the same stream to avoid a situation where two flushers are writing to the same file.

![Figure](figures/Winternals7thPt2_page_621_figure_005.png)

Note The cache manager provides a means for file system drivers to track when and how much data has been written to a file. After the lazy writer flushes dirty pages to the disk, the cache manager notifies the file system, instructing it to update its view of the valid data length for the file. (The cache manager and file systems separately track in memory the valid data length for a file.)

---

## EXPERIMENT: Watching the cache manager in action

In this experiment, we use Process Monitor to view the underlying file system activity, including cache manager read-ahead and write-behind, when Windows Explorer copies a large file (in this example, a DVD image) from one local directory to another.

First, configure Process Monitor's filter to include the source and destination file paths, the Explorer.exe and System processes, and the ReadFile and WriteFile operations. In this example, the C:\Users\Andrea\Documents\Windows_10_RS3.iso file was copied to C:\ISOs\Windows_10RS3.iso, so the filter is configured as follows:

![Figure](figures/Winternals7thPt2_page_622_figure_003.png)

You should see a Process Monitor trace like the one shown here after you copy the file:

![Figure](figures/Winternals7thPt2_page_622_figure_005.png)

The first few entries show the initial I/O processing performed by the copy engine and the first

each manager operations. Here are some of the things that you can see:

- ■ The initial 1 MB cached read from Explorer at the first entry. The size of this read depends on an
internal matrix calculation based on the file size and can vary from 128 KB to 1 MB. Because this
file was large, the copy engine chose 1 MB.
CHAPTER 11   Caching and file systems      591

---

■ The 1-MB read is followed by another 1-MB noncached read. Noncached reads typically indicate activity due to page faults or cache manager access. A closer look at the stack trace for these events, which you can see by double-clicking an entry and choosing the Stack tab, reveals that indeed the CcCopyRead cache manager routine, which is called by the NTFS driver's read routine, causes the memory manager to fault the source data into physical memory:

![Figure](figures/Winternals7thPt2_page_623_figure_001.png)

After this 1-MB page fault I/O, the cache manager's read-ahead mechanism starts reading the

file, which includes the System process's subsequent noncached 1-MB read at the 1-MB offset.

Because of the file size and Explorer's read I/O sizes, the cache manager chose 1 MB as the

optimal read-ahead size. The stack trace for one of the read-ahead operations, shown next,

confirms that one of the cache manager's worker threads is performing the read-ahead.

![Figure](figures/Winternals7thPt2_page_623_figure_003.png)

---

After this point, Explorer's 1-MB reads aren't followed by page faults, because the read-ahead

thread stays ahead of Explorer, prefetching the file data with its 1-MB noncached reads. However,

every once in a while, the read-ahead thread is not able to pick up enough data in time, and

clustered page faults do occur, which appear as Synchronous Paging I/O.

![Figure](figures/Winternals7thPt2_page_624_figure_001.png)

If you look at the stack for these entries, you'll see that instead of MmPrefetchForCacheManager,

the MmAccessFault/MmsuHeardFault routines are called.

As soon as it starts reading, Explorer also starts performing writes to the destination file.

These are sequential, cached 1-MB writes. After about 124 MB of reads, the first WriteFile opera tion from the System process occurs, shown here:

![Figure](figures/Winternals7thPt2_page_624_figure_004.png)

The write operation's stack trace, shown here, indicates that the memory manager's mapped page writer thread was actually responsible for the write. This occurs because for the first couple of megabytes of data, the cache manager hadn't started performing write-behind, so the memory manager's mapped page writer began flushing the modified destination file data. (See Chapter 10 for more information on the mapped page writer.)

CHAPTER 11   Caching and file systems     593

---

To get a clearer view of the cache manager operations, remove Explorer from the Process Monitor's filter so that only the System process operations are visible, as shown next.

![Figure](figures/Winternals7thPt2_page_625_figure_001.png)

With this view, it's much easier to see the cache manager's 1-MB write-behind operations (the maximum write sizes are 1MB on client versions of Windows and 32 MB on server versions; this experiment was performed on a client system). The stack trace for one of the write-behind operations, shown here, verifies that a cache manager worker thread is performing write-behind:

![Figure](figures/Winternals7thPt2_page_625_figure_003.png)

As an added experiment, try repeating this process with a remote copy instead (from one

Windows system to another) and by copying files of varying sizes. You'll notice some different

behaviors by the copy engine and the cache manager, both on the receiving and sending sides.

594      CHAPTER 11   Caching and file systems


---

## Disabling lazy writing for a file
