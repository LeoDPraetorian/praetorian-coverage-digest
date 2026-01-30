
If you create a temporary file by specifying the flag FILE_ATTRIBUTE.Temporary in a call to the Windows CreateFile function, the lazy writer won't write dirty pages to the disk unless there is a severe shortage of physical memory or the file is explicitly flushed. This characteristic of the lazy writer improves system performance—the lazy writer doesn't immediately write data to a disk that might ultimately be discarded. Applications usually delete temporary files soon after closing them.

## Forcing the cache to write through to disk

Because some applications can't tolerate even momentary delays between writing a file and seeing

the updates on disk, the cache manager also supports write-through caching on a per-file object basis;

changes are written to disk as soon as they're made. To turn on write-through caching, set the FILE_

FLAG_WRITE_THROUGH flag in the call to the CreateFile function. Alternatively, a thread can explicitly

flush an open file by using the Windows FlushFileBuffers function when it reaches a point at which the

data needs to be written to disk.

## Flushing mapped files

If the lazy writer must write data to disk from a view that's also mapped into another process's address space, the situation becomes a little more complicated because the cache manager will only know about the pages it has modified. (Pages modified by another process are known only to that process because the modified bit in the page table entries for modified pages is kept in the process private page tables.) To address this situation, the memory manager informs the cache manager when a user maps a file. When such a file is flushed in the cache (for example, as a result of a call to the Windows FlushFileBuffers function), the cache manager writes the dirty pages in the cache and then checks to see whether the file is also mapped by another process. When the cache manager sees that the file is also mapped by another process, the cache manager then flushes the entire view of the section to write out pages that the second process might have modified. If a user maps a view of a file that is also open in the cache, when the view is unmapped, the modified pages are marked as dirty so that when the lazy writer thread later flushes the view, those dirty pages will be written to disk. This procedure works as long as the sequence occurs in the following order:

- 1. A user unmaps the view.

2. A process flushes file buffers.
If this sequence isn't followed, you can't predict which pages will be written to disk.

---

EXPERIMENT: Watching cache flushes

You can see the cache manager map views into the system cache and flush pages to disk by running the Performance Monitor and adding the Data Maps/sec and Lazy Write Flushes/sec counters. (You can find these counters under the "Cache" group.) Then, copy a large file from one location to another. The generally higher line in the following screenshot shows Data Maps/sec, and the other shows Lazy Write Flushes/sec. During the file copy, Lazy Write Flushes/sec significantly increased.

![Figure](figures/Winternals7thPt2_page_627_figure_002.png)

## Write throttling

The file system and cache manager must determine whether a cached write request will affect system performance and then schedule any delayed writes. First, the file system asks the cache manager whether a certain number of bytes can be written right now without hurting performance by using the CcCanWrite function and blocking that write if necessary. For asynchronous I/O, the file system sets up a callback with the cache manager for automatically writing the bytes when writes are again permitted by calling CcDeferWrite. Otherwise, it just blocks and waits on CcCanWrite to continue. Once it's notified of an impending write operation, the cache manager determines how many dirty pages are in the cache and how much physical memory is available. If few physical pages are free, the cache manager momentarily blocks the file system thread that's requesting to write data to the cache. The cache manager’s lazy writer flushes some of the dirty pages to disk and then allows the blocked file system thread to continue. This write throttling prevents system performance from degrading because of a lack of memory when a file system or network server issues a large write operation.

---

![Figure](figures/Winternals7thPt2_page_628_figure_000.png)

Note The effects of write throttling are volume-aware, such that if a user is copying a large file on, say, a RAID-0 SSD while also transferring a document to a portable USB thumb drive, writes to the USB disk will not cause write throttling to occur on the SSD transfer.

The dirty page threshold is the number of pages that the system cache will allow to be dirty before throttling cached writers. This value is computed when the cache manager partition is initialized (the system partition is created and initialized at phase 1 of the NT kernel startup) and depends on the product type (client or server). As seen in the previous paragraphs, two other values are also computed—the top dirty page threshold and the bottom dirty page threshold. Depending on memory consumption and the rate at which dirty pages are being processed, the lazy writer scan calls the internal function CAdjustThrottle, which, on server systems, performs dynamic adjustment of the current threshold based on the calculated top and bottom values. This adjustment is made to preserve the read cache in cases of a heavy write load that will inevitably overrun the cache and become throttled. Table 11-1 lists the algorithms used to calculate the dirty page thresholds.

TABLE 11-1 Algorithms for calculating the dirty page thresholds

<table><tr><td>Product Type</td><td>Dirty Page Threshold</td><td>Top Dirty Page Threshold</td><td>Bottom Dirty Page Threshold</td></tr><tr><td>Client</td><td>Physical pages / 8</td><td>Physical pages / 8</td><td>Physical pages / 8</td></tr><tr><td>Server</td><td>Physical pages / 2</td><td>Physical pages / 2</td><td>Physical pages / 8</td></tr></table>


Write throttling is also useful for network redirectors transmitting data over slow communication lines. For example, suppose a local process writes a large amount of data to a remote file system over a slow 640 Kbps line. The data isn't written to the remote disk until the cache manager's lazy writer flushes the cache. If the redirector has accumulated lots of dirty pages that are flushed to disk at once, the recipient could receive a network timeout before the data transfer completes. By using the CcSetDirtyPageThreshold function, the cache manager allows network redirectors to set a limit on the number of dirty cache pages they can tolerate (for each stream), thus preventing this scenario. By limiting the number of dirty pages, the redirector ensures that a cache flush operation won't cause a network timeout.

## System threads

As mentioned earlier, the cache manager performs lazy write and read-ahead I/O operations by

submitting requests to the common critical system worker thread pool. However, it does limit the use

of these threads to one less than the total number of critical system worker threads. In client systems,

there are 5 total critical system worker threads, whereas in server systems there are 10.

Internally, the cache manager organizes its work requests into four lists (though these are serviced by the same set of executive worker threads):

- The express queue is used for read-ahead operations.

• The regular queue is used for lazy write scans (for dirty data to flush), write-behinds, and

lazy closes.
---

- ■ The fast teardown queue is used when the memory manager is waiting for the data section

owned by the cache manager to be freed so that the file can be opened with an image section

instead, which causes CcWriteBehind to flush the entire file and tear down the shared cache map.

■ The post tick queue is used for the cache manager to internally register for a notification after

each "tick" of the lazy writer thread—in other words, at the end of each pass.
To keep track of the work items the worker threads need to perform, the cache manager creates

its own internal per-processor look-aside list—a fixed-length list (one for each processor) of worker

queue item structures. (Look-aside lists are discussed in Chapter 5 of Part 1.) The number of worker

queue items depends on system type: 128 for client systems, and 256 for server systems. For cross processor performance, the cache manager also allocates a global look-aside list at the same sizes as

just described.

## Aggressive write behind and low-priority lazy writes

With the goal of improving cache manager performance, and to achieve compatibility with low-speed disk devices (like eMMC disks), the cache manager lazy writer has gone through substantial improvements in Windows 8.1 and later.

As seen in the previous paragraphs, the lazy writer scan adjusts the dirty page threshold and its

top and bottom limits. Multiple adjustments are made on the limits, by analyzing the history of the

total number of available pages. Other adjustments are performed to the dirty page threshold itself

by checking whether the lazy writer has been able to write the expected total number of pages in the

last execution cycle (one per second). If the total number of written pages in the last cycle is less than

the expected number (calculated by the CCalculatePagesToWrite routine), it means that the underly ing disk device was not able to support the generated I/O throughput, so the dirty page threshold is

lowered (this means that more I/O throttling is performed, and some cache manager clients will wait

when calling CCanIWrite API). In the opposite case, in which there are no remaining pages from the

last cycle, the lazy writer scan can easily raise the threshold. In both cases, the threshold needs to stay

inside the range described by the bottom and top limits.

The biggest improvement has been made thanks to the Extra Write Behind worker threads. In server SKUs, the maximum number of these threads is nine (which corresponds to the total number of critical system worker threads minus one), while in client editions it is only one. When a system lazy write scan is requested by the cache manager, the system checks whether dirty pages are contributing to memory pressure (using a simple formula that verifies that the number of dirty pages are less than a quarter of the dirty page threshold, and less than half of the available pages). If so, the systemwide cache manager thread pool routine (CcWorkerThread) uses a complex algorithm that determines whether it can add another lazy writer thread that will write dirty pages to disk in parallel with the others.

To correctly understand whether it is possible to add another thread that will emit additional I/Os, without getting worse system performance, the cache manager calculates the disk throughput of the old lazy write cycles and keeps track of their performance. If the throughput of the current cycles is equal or better than the previous one, it means that the disk can support the overall I/O level, so it makes sense to add another lazy writer thread (which is called an Extra Write Behind thread in this

598     CHAPTER 11   Caching and file systems


---

case). If, on the other hand, the current throughput is lower than the previous cycle, it means that the

underlying disk is not able to sustain additional parallel writes, so the Extra Write Behind thread is

removed. This feature is called Aggressive Write Behind.

In Windows client editions, the cache manager enables an optimization designed to deal with lowspeed disks. When a lazy writer scan is requested, and when the file system drivers write to the cache, the cache manager employs an algorithm to decide if the lazy writers threads should execute at low priority. (For more information about thread priorities, refer to Chapter 4 of Part 1.) The cache manager applies by-default low priority to the lazy writers if the following conditions are met (otherwise, the cache manager still uses the normal priority):

- The caller is not waiting for the current lazy scan to be finished.
The total size of the partition's dirty pages is less than 32 MB.
If the two conditions are satisfied, the cache manager queues the work items for the lazy writers in the low-priority queue. The lazy writers are started by a system worker thread, which executes at priority 6 – Lowest. Furthermore, the lazy writer set its I/O priority to Lowest just before emitting the actual I/O to the correct file-system driver.

## Dynamic memory

As seen in the previous paragraph, the dirty page threshold is calculated dynamically based on the available amount of physical memory. The cache manager uses the threshold to decide when to throttle incoming writes and whether to be more aggressive about writing behind.

Before the introduction of partitions, the calculation was made in the CcInitializeCacheManager routine (by checking the MmNumberOfPhysicalPages global value), which was executed during the kernel's phase 1 initialization. Now, the cache manager Partition's initialization function performs the calculation based on the available physical memory pages that belong to the associated memory partition. (For further details about cache manager partitions, see the section "Memory partitions support," earlier in this chapter.) This is not enough, though, because Windows also supports the hot-addition of physical memory, a feature that is deeply used by HyperV for supporting dynamic memory for child VMs.

During memory manager phase 0 initialization, MICreatePfnDatabase calculates the maximum possible size of the PFN database. On 64-bit systems, the memory manager assumes that the maximum possible amount of installed physical memory is equal to all the addressable virtual memory range (256 TB on non-LAS7 systems, for example). The system asks the memory manager to reserve the amount of virtual address space needed to store a PFN for each virtual page in the entire address space. (The size of this hypothetical PFN database is around 64 GB). MICreateSparsePfnDatabase then cycles between each valid physical memory range that Winload has detected and maps valid PFNs into the database. The PFN database uses sparse memory. When the MIAddPhysicalMemory routines detect new physical memory, it creates new PFNs simply by allocating new regions inside the PFN databases. Dynamic Memory has already been described in Chapter 9, "Virtualization technologies"; further details are available there.

CHAPTER 11   Caching and file systems     599


---

The cache manager needs to detect the new hot-added or hot-removed memory and adapt to the

new system configuration, otherwise multiple problems could arise.

- ■ In cases where new memory has been hot-added, the cache manager might think that the system
has less memory, so its dirty pages threshold is lower than it should be. As a result, the cache man-
ager doesn't cache as many dirty pages as it should, so it throttles writes much sooner.
■ If large portions of available memory are locked or aren't available anymore, performing
cached I/O on the system could hurt the responsiveness of other applications (which, after the
hot-remove, will basically have no more memory).
To correctly deal with this situation, the cache manager doesn't register a callback with the memory manager but implements an adaptive correction in the lazy writer scan (LWS) thread. Other than scanning the list of shared cache map and deciding which dirty page to write, the LWS thread has the ability to change the dirty pages threshold depending on foreground rate, its write rate, and available memory. The LWS maintains a history of average available physical pages and dirty pages that belong to the partition. Every second, the LWS thread updates these lists and calculates aggregate values. Using the aggregate values, the LWS is able to respond to memory size variations, absorbing the spikes and gradually modifying the top and bottom thresholds.

## Cache manager disk I/O accounting

Before Windows 8.1, it wasn't possible to precisely determine the total amount of I/O performed by a single process. The reasons behind this were multiple:

- ■ Lazy writes and read-aheads don't happen in the context of the process/thread that caused the
I/O. The cache manager writes out the data lazily, completing the write in a different context
(usually the System context) of the thread that originally wrote the file. (The actual I/O can even
happen after the process has terminated.) Likewise, the cache manager can choose to read-
ahead, bringing in more data from the file than the process requested.
■ Asynchronous I/O is still managed by the cache manager, but there are cases in which the cache
manager is not involved at all, like for non-cached I/Os.
■ Some specialized applications can emit low-level disk I/O using a lower-level driver in the disk stack.
Windows stores a pointer to the thread that emitted the I/O in the tail of the IRP. This thread is not always the one that originally started the I/O request. As a result, a lot of times the I/O accounting was wrongly associated with the System process. Windows 8.1 resolved the problem by introducing the PkUpdateDiskCounter API, used by both the cache manager and file system drivers, which need to tightly cooperate. The function stores the total number of bytes read and written and the number of I/O operations in the core EPROCESS data structure that is used by the NT kernel to describe a process. (You can read more details in Chapter 3 of Part 1.)

The cache manager updates the process disk counters (by calling the PsUpdateDiskCounters function) while performing cached reads and writes (through all of its exposed file system interfaces) and while emitting read-aheads I/O (through CcScheduleReadAheadEx exported API). NTFS and ReFS file systems drivers call the PsUpdateDiskCounters while performing non-cached and paging I/O.

600      CHAPTER 11   Caching and file systems

---

Like CcScheduleReadAheadEx, multiple cache manager APIs have been extended to accept a pointer

to the thread that has emitted the I/O and should be charged for it (CcCopyReadEx and CcCopyWriteEx

are good examples). In this way, updated file system drivers can even control which thread to charge in

case of asynchronous I/O.

Other than per-process counters, the cache manager also maintains a Global Disk I/O counter, which globally keeps track of all the I/O that has been issued by file systems to the storage stack. (The counter is updated every time a non-cached and paging I/O is emitted through file system drivers.) Thus, this global counter, when subtracted from the total I/O emitted to a particular disk device (a value that an application can obtain by using the /OCTL_DISK_PERFORMANCE control code), represents the I/O that could not be attributed to any particular process (paging I/O emitted by the Modified Page Writer for example, or I/O performed internally by Mini-filter drivers).

The new per-process disk counters are exposed through the NTQuerySystemInformation API using

the SystemProcessInformation information class. This is the method that diagnostics tools like Task

Manager or Process Explorer use for precisely querying the I/O numbers related to the processes cur rently running in the system.

## EXPERIMENT: Counting disk I/Os

You can see a precise counting of the total system I/Os by using the different counters exposed by the Performance Monitor. Open Performance Monitor and add the FileSystem Bytes Read and FileSystem Bytes Written counters, which are available in the FileSystem Disk Activity group. Furthermore, for this experiment you need to add the per-process disk I/O counters that are available in the Process group, named IO Read Bytes/sec and IO Write Bytes/sec. When you add these last two counters, make sure that you select the Explorer process in the Instances Of Selected Object box.

![Figure](figures/Winternals7thPt2_page_632_figure_005.png)

When you start to copy a big file, you see the counters belonging to Explorer processes increasing until they reach the counters showed in the global file System Disk activity.

CHAPTER 11   Caching and file systems      601


---

## File systems

In this section, we present an overview of the supported file system formats supported by Windows.


We then describe the types of file system drivers and their basic operation, including how they interact

with other system components, such as the memory manager and the cache manager. Following that,

we describe in detail the functionality and the data structures of the two most important file systems:


NTFS and ReFS. We start by analyzing their internal architectures and then focus on the on-disk layout

of the two file systems and their advanced features, such as compression, recoverability, encryption,

tiering support, file-snapshot, and so on.

### Windows file system formats

Windows includes support for the following file system formats:

- • CDFS

• UDF

• FAT12, FAT16, and FAT32

• exFAT

• NTFS

• ReFS
Each of these formats is best suited for certain environments, as you'll see in the following sections.

### CDFS

CDFS (%SystemRoot%\System32\Drivers\Cdfs.sys), or CD-ROM file system, is a read-only file system driver that supports a superset of the ISO-9660 format as well as a superset of the Joliet disk format. Although the ISO-9660 format is relatively simple and has limitations such as ASCII uppercase names with a maximum length of 32 characters, Joliet is more flexible and supports Unicode names of arbitrary length. If structures for both formats are present on a disk (to offer maximum compatibility), CDFS uses the Joliet format. CDFS has a couple of restrictions:

- ● A maximum file size of 4 GB

● A maximum of 65,535 directories
CDFS is considered a legacy format because the industry has adopted the Universal Disk Format (UDF) as the standard for optical media.

---

## UDF

The Windows Universal Disk Format (UDF) file system implementation is OSTA (Optical Storage Technology Association) UDF-compliant. (UDF is a subset of the ISO-13346 format with extensions for formats such as CD-R and DVD-R/RW). OSTA defined UDF in 1995 as a format to replace the ISO-9660 format for magneto-optical storage media, mainly DVD-ROM. UDF is included in the DVD specification and is more flexible than CDFS. The UDF file system format has the following traits:

- • Directory and file names can be 254 ASCII or 127 Unicode characters long.

• Files can be sparse. (Sparse files are defined later in this chapter, in the "Compression and sparse
files" section.)

• File sizes are specified with 64 bits.

• Support for access control lists (ACLs).

• Support for alternate data streams.
The UDF driver supports UDF versions up to 2.60. The UDF format was designed with rewritable media in mind. The Windows UDF driver (%SystemRoot%\System32\Drivers\Udfs.sys) provides read-write support for Blu-ray, DVD-RAM, CD-R/RW, and DVD++/R/W drives when using UDF 2.50 and read-only support when using UDF 2.60. However, Windows does not implement support for certain UDF features such as named streams and access control lists.

## FAT12, FAT16, and FAT32

Windows supports the FAT file system primarily for compatibility with other operating systems in multiboot systems, and as a format for flash drives or memory cards. The Windows FAT file system driver is implemented in %SystemRoot%\System32\Drivers\Fastfat.sys.

The name of each FAT format includes a number that indicates the number of bits that the particular format uses to identify clusters on a disk. FAT12's 12-bit cluster identifier limits a partition to storing a maximum of 2^32 (4,096) clusters. Windows permits cluster sizes from 512 bytes to 8 KB, which limits a FAT12 volume size to 32 MB.

![Figure](figures/Winternals7thPt2_page_634_figure_007.png)

Note All FAT file system types reserve the first 2 clusters and the last 16 clusters of a volume, so the number of usable clusters for a FAT2 volume, for instance, is slightly less than 4,096.

FAST16, with a 16-bit cluster identifier, can address $2^{16}$ (65,536) clusters. On Windows, FAT16 cluster sizes range from 512 bytes (the sector size) to 64 KB (on disks with a 512-byte sector size), which limits

FAT16 volume sizes to 4 GB. Disks with a sector size of 4,096 bytes allow for clusters of 256 KB. The clus ter size Windows uses depends on the size of a volume. The various sizes are listed in Table 11-2. If you

format a volume that is less than 16 MB as FAT by using the format command or the Disk Management

snap-in, Windows uses the FAT12 format instead of FAT16.

CHAPTER 11   Caching and file systems     603


---

TABLE 11-2 Default FAT16 cluster sizes in Windows

<table><tr><td>Volume Size</td><td>Default Cluster Size</td></tr><tr><td>&lt;8 MB</td><td>Not supported</td></tr><tr><td>8 MB-32 MB</td><td>512 bytes</td></tr><tr><td>32 MB-64 MB</td><td>1 KB</td></tr><tr><td>64 MB-128 MB</td><td>2 KB</td></tr><tr><td>128 MB-256 MB</td><td>4 KB</td></tr><tr><td>256 MB-512 MB</td><td>8 KB</td></tr><tr><td>512 MB-1,024 MB</td><td>16 KB</td></tr><tr><td>1 GB-2 GB</td><td>32 KB</td></tr><tr><td>2 GB-4 GB</td><td>64 KB</td></tr><tr><td>&gt;16 GB</td><td>Not supported</td></tr></table>


A FAT volume is divided into several regions, which are shown in Figure 11-14. The file allocation table, which gives the FAT file system format its name, has one entry for each cluster on a volume. Because the file allocation table is critical to the successful interpretation of a volume's contents, the FAT format maintains two copies of the table so that if a file system driver or consistency-checking program (such as Chkdsk) can't access one (because of a bad disk sector, for example), it can read from the other.

![Figure](figures/Winternals7thPt2_page_635_figure_003.png)

FIGURE 11-14 FAT format organization.

Entries in the file allocation table define file-allocation chains (shown in Figure 11-15) for files and directories, where the links in the chain are indexes to the next cluster of a file's data. A file's directory entry stores the starting cluster of the file. The last entry of the file's allocation chain is the reserved value of 0xFFFF for FAT16 and 0xFFFF for FAT12. The FAT entries for unused clusters have a value of 0. You can see in Figure 11-15 that FILE1 is assigned clusters 2, 3, and 4; FILE2 is fragmented and uses clusters 5, 6, and 8; and FILE3 uses only cluster 7. Reading a file from a FAT volume can involve reading large portions of a file allocation table to traverse the file's allocation chains.

![Figure](figures/Winternals7thPt2_page_635_figure_006.png)

FIGURE 11-15 Sample FAT file-allocation chains.

604      CHAPTER 11   Caching and file systems


---

The root directory of FAT12 and FAT16 volumes is preassigned enough space at the start of a volume to store 256 directory entries, which places an upper limit on the number of files and directories that can be stored in the root directory. (There's no preassigned space or size limit on FAT32 root directories.) A FAT directory entry is 32 bytes and stores a file's name, size, starting cluster, and time stamp (last-accessed, created, and so on) information. If a file has a name that is Unicode or that doesn't follow the MS-DOS 8.3 naming convention, additional directory entries are allocated to store the long file name. The supplementary entries precede the file's main entry. Figure 11-16 shows a sample directory entry for a file named "The quick brown fox." The system has created a THEQUI-1FOX 8.3 representation of the name (that is, you don't see a "." in the directory entry because it is assumed to come after the eighth character) and used two more directory entries to store the Unicode long file name. Each row in the figure is made up of 16 bytes.

![Figure](figures/Winternals7thPt2_page_636_figure_001.png)

FIGURE 11.16 FAT directory entry.

FAT32 uses 32-bit cluster identifiers but reserves the high 4 bits, so in effect it has 28-bit cluster identifiers. Because FAT32 cluster sizes can be as large as 64 KB, FAT32 has a theoretical ability to address 16-terabyte (TB) volumes. Although Windows works with existing FAT32 volumes of larger sizes (created in other operating systems), it limits new FAT32 volumes to a maximum of 32 GB. FAT32's higher potential cluster numbers let it manage disks more efficiently than FAT16; it can handle up to 128-GB volumes with 512-byte clusters. Table 11-3 shows default cluster sizes for FAT32 volumes.

TABLE 11-3 Default cluster sizes for FAT32 volumes

<table><tr><td>Partition Size</td><td>Default Cluster Size</td></tr><tr><td>&lt;32 MB</td><td>Not supported</td></tr><tr><td>32 MB-64 MB</td><td>512 bytes</td></tr><tr><td>64 MB-128 MB</td><td>1 KB</td></tr><tr><td>128 MB-256 MB</td><td>2 KB</td></tr><tr><td>256 MB-8 GB</td><td>4 KB</td></tr><tr><td>8 GB-16 GB</td><td>8 KB</td></tr><tr><td>16 GB-32 GB</td><td>16 KB</td></tr><tr><td>&gt;32 GB</td><td>Not supported</td></tr></table>


CHAPTER 11   Caching and file systems     605


---

Besides the higher limit on cluster numbers, other advantages FAT32 has over FAT12 and FAT16 include the fact that the FAT32 root directory isn't stored at a predefined location on the volume, the root directory doesn't have an upper limit on its size, and FAT32 stores a second copy of the boot sector for reliability. A limitation FAT32 shares with FAT16 is that the maximum file size is 4 GB because directories store file sizes as 32-bit values.

## exFAT

Designed by Microsoft, the Extended File Allocation T able file system (exFAT, also called FAT64) is an

improvement over the traditional FAT file systems and is specifically designed for flash drives. The main

goal of exFAT is to provide some of the advanced functionality offered by NTFS without the metadata

structure overhead and metadata logging that create write patterns not suited for many flash media

devices. T able 11-4 lists the default cluster sizes for exFAT.

As the FAT64 name implies, the file size limit is increased to 264, allowing files up to 16 exabytes. This change is also matched by an increase in the maximum cluster size, which is currently implemented as 32 MB but can be as large as 255 sectors. exFAT also adds a bitmap that tracks free clusters, which improves the performance of allocation and deletion operations. Finally, exFAT allows more than 1,000 files in a single directory. These characteristics result in increased scalability and support for large disk sizes.

TABLE 11-4 Default cluster sizes for exFAT volumes, 512-byte sector

<table><tr><td>Volume Size</td><td>Default Cluster Size</td></tr><tr><td>&lt; 256 MB</td><td>4 KB</td></tr><tr><td>256 MB-32 GB</td><td>32 KB</td></tr><tr><td>32 GB-512 GB</td><td>128 KB</td></tr><tr><td>512 GB-1 TB</td><td>256 KB</td></tr><tr><td>1 TB-2 TB</td><td>512 KB</td></tr><tr><td>2 TB-4 TB</td><td>1 MB</td></tr><tr><td>4 TB-8 TB</td><td>2 MB</td></tr><tr><td>8 TB-16 TB</td><td>4 MB</td></tr><tr><td>16 TB-32 TB</td><td>8 MB</td></tr><tr><td>32 TB-64 TB</td><td>16 MB</td></tr><tr><td>&gt;= 64 TB</td><td>32 MB</td></tr></table>


Additionally, exFAT implements certain features previously available only in NTFS, such as support for access control lists (ACLs) and transactions (called Transaction-Safe FAT, or TFAT). While the Windows Embedded CE implementation of exFAT includes these features, the version of exFAT in Windows does not.

![Figure](figures/Winternals7thPt2_page_637_figure_007.png)

Note ReadyBoost (described in Chapter 5 of Part 1, "Memory Management") can work with exFAT-formatted flash drives to support cache files much larger than 4 GB.

606      CHAPTER 11   Caching and file systems


---

## NTFS

As noted at the beginning of the chapter, the NTFS file system is one of the native file system formats of Windows. NTFS uses 64-bit cluster numbers. This capacity gives NTFS the ability to address volumes of up to 16 exclusterers; however, Windows limits the size of an NTFS volume to that addressable with 32-bit clusters, which is slightly less than 8 petabytes (using 2MB clusters). Table 11-5 shows the default cluster sizes for NTFS volumes. (You can override the default when you format an NTFS volume.) NTFS also supports 232-1 files per volume. The NTFS format allows for files that are 16 exabytes in size, but the implementation limits the maximum file size to 16 TB.

TABLE 11-5 Default cluster sizes for NTFS volumes

<table><tr><td>Volume Size</td><td>Default Cluster Size</td></tr><tr><td>&lt;7 MB</td><td>Not supported</td></tr><tr><td>7 MB-16 TB</td><td>4 KB</td></tr><tr><td>16 TB-32 TB</td><td>8 KB</td></tr><tr><td>32 TB-64 TB</td><td>16 KB</td></tr><tr><td>64 TB-128 TB</td><td>32 KB</td></tr><tr><td>128 TB-256 TB</td><td>64 KB</td></tr><tr><td>256 TB-512 TB</td><td>128 KB</td></tr><tr><td>512 TB-1024 TB</td><td>256 KB</td></tr><tr><td>1 PB-2 PB</td><td>512 KB</td></tr><tr><td>2 PB-4 PB</td><td>1 MB</td></tr><tr><td>4 PB-8 PB</td><td>2 MB</td></tr></table>


NTFS includes a number of advanced features, such as file and directory security, alternate data streams, disk quotas, sparse files, file compression, symbolic (soft) and hard links, support for transactional semantics, junction points, and encryption. One of its most significant features is recoverability. If a system is halted unexpectedly, the metadata of a FAT volume can be left in an inconsistent state, leading to the corruption of large amounts of file and directory data. NTFS logs changes to metadata in a transactional manner so that file system structures can be repaired to a consistent state with no loss of file or directory structure information. (File data can be lost unless the user is using TxF, which is covered later in this chapter.) Additionally, the NTFS driver in Windows also implements self-healing, a mechanism through which it makes most minor repairs to corruption of file system on-disk structures while Windows is running and without requiring a reboot.

![Figure](figures/Winternals7thPt2_page_638_figure_005.png)

Note At the time of this writing, the common physical sector size of disk devices is 4 KB. Even for these disk devices, for compatibility reasons, the storage stack exposes to file system drivers a logical sector size of 512 bytes. The calculation performed by the NTFS driver to determine the correct size of the cluster uses logical sector sizes rather than the actual physical size.

CHAPTER 11   Caching and file systems      607


---

Starting with Windows 10, NTFS supports DAX volumes natively. (DAX volumes are discussed later in this chapter, in the “DAX volumes” section.) The NTFS file system driver also supports I/O to this kind of volume using large pages. Mapping a file that resides on a DAX volume using large pages is possible in two ways: NTFS can automatically align the file to a 2-MB cluster boundary, or the volume can be formatted using a 2-MB cluster size.

## ReFS

The Resilient File System (ReFS) is another file system that Windows supports natively. It has been designed primarily for large storage servers with the goal to overcome some limitations of NTFS, like its lack of online self-healing or volume repair or the nonsupport for file snapshots. ReFS is a "writeto-new" file system, which means that volume metadata is always updated by writing new data to the underlying medium and by marking the old metadata as deleted. The lower level of the ReFS file system (which understands the on-disk data structure) uses an object store library, called Mystore, that provides a key-value table interface to its callers. Mystore is similar to a modern database engine, is portable, and uses different data structures and algorithms compared to NTFS. (Mystore uses B+ trees.)

One of the important design goals of ReFS was to be able to support huge volumes (that could have been created by Storage Spaces). Like NTFS, ReFS uses 64-bit cluster numbers and can address volumes of up 16 excluders. ReFS has no limitation on the size of the addressable values, so, theoretically, ReFS is able to manage volumes of up to 1 gigabyte (using 64 KB cluster sizes).

Unlike NTFS, Minstore doesn't need a central location to store its own metadata on the volume (although the object table could be considered somewhat centralized) and has no limitations on addressable values, so there is no need to support many different sized clusters. ReFS supports only 4 KB and 64 KB cluster sizes. ReFS, at the time of this writing, does not support DAX volumes.

We describe NTFS and ReFS data structures and their advanced features in detail later in this chapter.

## File system driver architecture

File system drivers (FSDs) manage file system formats. Although FSDs run in kernel mode, they differ in a number of ways from standard kernel-mode drivers. Perhaps most significant, they must register as an FSD with the I/O manager, and they interact more extensively with the memory manager. For enhanced performance, file system drivers also usually rely on the services of the cache manager. Thus, they use a superset of the exported Ntskrnl.exe functions that standard drivers use. Just as for standard kernel-mode drivers, you must have the Windows Driver Kit (WDK) to build file system drivers. (See Chapter 1, "Concepts and Tools, " in Part 1 and http://www.microsoft.com/whdc/devtools/wdk for more information on the WDK.)

Windows has two different types of FSDs:

- • Local FSDs manage volumes directly connected to the computer.

• Network FSDs allow users to access data volumes connected to remote computers.
---

## Local FSDs

Local FSDs include Ntfs.sys, Refs.sys, Refsvc1.sys, fastsat.sys, Exfat.sys, Udfs.sys, Cdfs.sys, and the RAW FSD (integrated in Ntoskrnl.exe). Figure 11-17 shows a simplified view of how local FSDs interact with the I/O manager and storage device drivers. A local FSD is responsible for registering with the I/O manager. Once the FSD is registered, the I/O manager can call on it to perform volume recognition when applications or the system initially access the volumes. Volume recognition involves an examination of a volume’s boot sector and often, as a consistency check, the file system metadata. If none of the registered file systems recognizes the volume, the system assigns the RAW file system driver to the volume and then displays a dialog box to the user asking if the volume should be formatted. If the user chooses not to format the volume, the RAW file system driver provides access to the volume, but only at the sector level—in other words, the user can only read or write complete sectors.

The goal of file system recognition is to allow the system to have an additional option for a valid but unrecognized file system other than RAW. To achieve this, the system defines a fixed data structure type (FILE_SYSTEM_RECOGNITION_STRUCTURE) that is written to the first sector on the volume. This data structure, if present, would be recognized by the operating system, which would then notify the user that the volume contains a valid but unrecognized file system. The system will still load the RAW file system on the volume, but it will not prompt the user to format the volume. A user application or kernel-mode driver might ask for a copy of the FILE_SYSTEM_RECOGNITION_STRUCTURE by using the new file system I/O control code FSCCTL_QUERY_FILE_SYSTEM_RECOGNITION.

The first sector of every Windows-supported file system format is reserved as the volume's boot sector. A boot sector contains enough information so that a local FSD can both identify the volume on which the sector resides as containing a format that the FSD manages and locate any other metadata necessary to identify where metadata is stored on the volume.

When a local FSD (shown in Figure 11-17) recognizes a volume, it creates a device object that represents the mounted file system format. The I/O manager makes a connection through the volume parameter block (VPB) between the volume's device object (which is created by a storage device driver) and the device object that the FSD created. The VPB's connection results in the I/O manager redirecting I/O requests targeted at the volume device object to the FSD device object.

![Figure](figures/Winternals7thPt2_page_640_figure_005.png)

FIGURE 11-17 Local FSD.

CHAPTER 11   Caching and file systems      609


---

To improve performance, local FSDs usually use the cache manager to cache file system data, including metadata. FSDs also integrate with the memory manager so that mapped files are implemented correctly. For example, FSDs must query the memory manager whenever an application attempts to truncate a file to verify that no processes have mapped the part of the file beyond the truncation point. (See Chapter 5 of Part 1 for more information on the memory manager.) Windows doesn't permit file data that is mapped by an application to be deleted either through truncation or file deletion.

Local FSDs also support file system dismount operations, which permit the system to disconnect the FSD from the volume object. A dismount occurs whenever an application requires raw access to the on-disk contents of a volume or the media associated with a volume is changed. The first time an application accesses the media after a dismount, the I/O manager reinitiates a volume mount operation for the media.

## Remote FSDs

Each remote FSD consists of two components: a client and a server. A client-side remote FSD allows applications to access remote files and directories. The client FSD component accepts I/O requests from applications and translates them into network file system protocol commands (such as SMB) that the FSD sends across the network to a server-side component, which is a remote FSD. A serverside FSD listens for commands coming from a network connection and fulfills them by issuing I/O requests to the local FSD that manages the volume on which the file or directory that the command is intended for resides.

Windows includes a client-side remote FSD named LANMan Redirector (usually referred to as just the redirector) and a server-side remote FSD named LANMan Server (%SystemRoot%\System32 \Drivers\Srv2.sys). Figure 11-18 shows the relationship between a client accessing files remotely from a server through the redirector and server FSDs.

![Figure](figures/Winternals7thPt2_page_641_figure_005.png)

FIGURE 11-18 Common Internet File System file sharing.

610 CHAPTER 11 Caching and file systems


---

Windows relies on the Common Internet File System (CIFS) protocol to format messages exchanged between the redirector and the server. CIFS is a version of Microsoft's Server Message Block (SMB) protocol. (For more information on SMB, go to https://docs.microsoft.com/en-us/windows/win32/fileio /microsoft-smb-protocol-and-cifs-protocol-overview.)

Like local FSDs, client-side remote FSDs usually use cache manager services to locally cache file data belonging to remote files and directories, and in such cases both must implement a distributed locking mechanism on the client as well as the server. SMB client-side remote FSDs implement a distributed cache cohency protocol, called oplock (opportunistic locking), so that the data an application sees when it accesses a remote file is the same as the data applications running on other computers that are accessing the same file see. Third-party file systems may choose to use the oplock protocol, or they may implement their own protocol. Although server-side remote FSDs participate in maintaining cache coherency across their clients, they don't cache data from the local FSDs because local FSDs cache their own data.

It is fundamental that whenever a resource can be shared between multiple, simultaneous acces sors, a serialization mechanism must be provided to arbitrate writes to that resource to ensure that only

one accessor is writing to the resource at any given time. Without this mechanism, the resource may

be corrupted. The locking mechanisms used by all file servers implementing the SMB protocol are the

oplock and the lease. Which mechanism is used depends on the capabilities of both the server and the

client, with the lease being the preferred mechanism.

Oplocks The oplock functionality is implemented in the file system run-time library (FsRtlXxx functions) and may be used by any file system driver. The client of a remote file server uses an oplock to dynamically determine which client-side caching strategy to use to minimize network traffic. An oplock is requested on a file residing on a share, by the file system driver or redirector, on behalf of an application when it attempts to open a file. The granting of an oplock allows the client to cache the file rather than send every read or write to the file server across the network. For example, a client could open a file for exclusive access, allowing the client to cache all reads and writes to the file, and then copy the updates to the file server when the file is closed. In contrast, if the server does not grant an oplock to a client, all reads and writes must be sent to the server.

Once an oplock has been granted, a client may then start caching the file, with the type of oplock determining what type of caching is allowed. An oplock is not necessarily held until a client is finished with the file, and it may be broken at any time if the server receives an operation that is incompatible with the existing granted locks. This implies that the client must be able to quickly react to the break of the oplock and change its caching strategy dynamically.

Prior to SMB 2.1, there were four types of oblocks:

- ■ Level 1, exclusive access This lock allows a client to open a file for exclusive access. The client
may perform read-ahead buffering and read or write caching.

■ Level 2, shared access This lock allows multiple, simultaneous readers of a file and no writers.
The client may perform read-ahead buffering and read caching of file data and attributes. A
write to the file will cause the holders of the lock to be notified that the lock has been broken.
---

- ■ Batch, exclusive access This lock takes its name from the locking used when processing
batch (bat) files, which are opened and closed to process each line within the file. The client
may keep a file open on the server, even though the application has (perhaps temporarily)
closed the file. This lock supports read, write, and handle caching.

■ Filter, exclusive access This lock provides applications and file system filters with a mecha-
nism to give up the lock when other clients try to access the same file, but unlike a Level 2 lock,
the file cannot be opened for delete access, and the other client will not receive a sharing viola-
tion. This lock supports read and write caching.
In the simplest terms, if multiple client systems are all caching the same file shared by a server, then as long as every application accessing the file (from any client or the server) tries only to read the file, those reads can be satisfied from each system's local cache. This drastically reduces the network traffic because the contents of the file aren't sent to each system from the server. Locking information must still be exchanged between the client systems and the server, but this requires very low network bandwidth. However, if even one of the clients opens the file for read and write access (or exclusive write), then none of the clients can use their local caches and all I/O to the file must go immediately to the server, even if the file is never written. (Lock modes are based upon how the file is opened, not individual I/O requests.)

An example, shown in Figure 11-19, will help illustrate oplock operation. The server automatically

grants a Level 1 oplock to the first client to open a server file for access. The redirector on the client

caches the file data for both reads and writes in the file cache of the client machine. If a second client

opens the file, it too requests a Level 1 oplock. However, because there are now two clients accessing

the same file, the server must take steps to present a consistent view of the file's data to both clients.

If the first client has written to the file, as is the case in Figure 11-19, the server revokes its oplock and

grants neither client an oplock. When the first client's oplock is revoked, or broken, the client flushes

any data it has cached for the file back to the server.

![Figure](figures/Winternals7thPt2_page_643_figure_003.png)

FIGURE 11-19 Oplock example.

---

If the first client hadn't written to the file, the first client's oplock would have been broken to a Level 2 oplock, which is the same type of oplock the server would grant to the second client. Now both clients can cache reads, but if either writes to the file, the server revokes their oplocks so that noncached operation commences. Once oplocks are broken, they aren't granted again for the same open instance of a file. However, if a client closes a file and then reopens it, the server reassesses what level of oplock to grant the client based on which other clients have the file open and whether at least one of them has written to the file.

## EXPERIMENT: Viewing the list of registered file systems

When the I/O manager loads a device driver into memory, it typically names the driver object

it creates to represent the driver so that it's placed in the \Driver object manager directory. The

driver objects for any driver the I/O manager loads that have a Type attribute value of SERVICE_

FILE_SYSTEM_DRIVER (2) are placed in the \FileSystem directory by the I/O manager. Thus, using

a tool such as WinObj (from Sysinternals), you can see the file systems that have registered on a

system, as shown in the following screenshot. Note that file system filter drivers will also show up

in this list. Filter drivers are described later in this section.

![Figure](figures/Winternals7thPt2_page_644_figure_003.png)

Another way to see registered file systems is to run the System Information viewer. Run Miniofs2 from the Start menu's Run dialog box and select System Drivers under Software Environment. Sort the list of drivers by clicking the Type column, and drivers with a Type attribute of SERVICE_FILE_SYSTEM_DRIVER group together.

CHAPTER 11   Caching and file systems      613


---

![Figure](figures/Winternals7thPt2_page_645_figure_000.png)

Note that just because a driver registers as a file system driver type doesn't mean that it is a local or remote FSD. For example, Npfs (Named Pipe File System) is a driver that implements named pipes through a file system-like private namespace. As mentioned previously, this list will also include file system filter drivers.

Leases Prior to SMB 2.1, the SMB protocol assumed an error-free network connection between the client and the server and did not tolerate network disconnection caused by transient network failures, server reboot, or cluster failovers. When a network disconnect event was received by the client, it orphaned all handles opened to the affected server(s), and all subsequent I/O operations on the orphaned handles were failed. Similarly, the server would release all opened handles and resources associated with the disconnected user session. This behavior resulted in applications losing state and in unnecessary network traffic.

---

In SMB 2.1, the concept of a lease is introduced as a new type of client caching mechanism, similar to an block. The purpose of a lease and an block is the same, but a lease provides greater flexibility and much better performance.

• Read (R), shared access Allows multiple simultaneous readers of a file, and no writers. This allows the client to perform read-ahead buffering and read caching.

• Read-Handle (RH), shared access This is similar to the Level 2 oplock, with the added benefit of allowing the client to keep a file open on the server even though the accessor on the client has closed the file. (The cache manager will lazily flush the unwritten data and purge the unmodified cache pages based on memory availability.) This is superior to a Level 2 oplock because the lease does not need to be broken between opens and closes of the file handle. (In this respect, it provides semantics similar to the Batch oplock.) This type of lease is especially useful for files that are repeatedly opened and closed because the cache is not invalidated when the file is closed and refilled when the file is opened again, providing a big improvement in performance for complex I/O intensive applications.

• Read-Write (RW), exclusive access This lease allows a client to open a file for exclusive access. This lock allows the client to perform read-ahead buffering and read or write caching.

• Read-Write-Handle (RWH), exclusive access This lock allows a client to open a file for exclusive access. This lease supports read, write, and handle caching (similar to the Read-Handle lease).

Another advantage that a lease has over an oplock is that a file may be cached, even when there are multiple handles opened to the file on the client. (This is a common behavior in many applications.) This is implemented through the use of a lease key (implemented using a GUID), which is created by the client and associated with the File Control Block (FCB) for the cached file, allowing all handles to the same file to share the same lease state, which provides caching by file rather than caching by handle. Prior to the introduction of the lease, the oplock was broken whenever a new handle was opened to the file, even from the same client. Figure 11-20 shows the oplock behavior, and Figure 11-21 shows the new lease behavior.

Prior to SMB 2.1, oplocks could only be granted or broken, but leases can also be converted. For example, a Read lease may be converted to a Read-Write lease, which greatly reduces network traffic because the cache for a particular file does not need to be invalidated and refilled, would be the case with an oplock break (of the Level 2 oplock), followed by the request and grant of a Level 1 oplock.

CHAPTER 11   Caching and file systems    615


---

![Figure](figures/Winternals7thPt2_page_647_figure_000.png)

FIGURE 11-20 Oplock with multiple handles from the same client.

616      CHAPTER 11   Caching and file systems


---

![Figure](figures/Winternals7thPt2_page_648_figure_000.png)

FIGURE 11-21 Lease with multiple handles from the same client.

CHAPTER 11   Caching and file systems      617


---

## File system operations

Applications and the system access files in two ways: directly, via file I/O functions (such as ReadFile and WriteFile), and indirectly, by reading or writing a portion of their address space that represents a mapped file section. (See Chapter 5 of Part 1 for more information on mapped files.) Figure 11-22 is a simplified diagram that shows the components involved in these file system operations and the ways in which they interact. As you can see, an FSD can be invoked through several paths:

- ■ From a user or system thread performing explicit file I/O

■ From the memory manager‛s modified and mapped page writers

■ Indirectly from the cache manager‛s lazy writer

■ Indirectly from the cache manager‛s read-ahead thread

■ From the memory manager‛s page fault handler
![Figure](figures/Winternals7thPt2_page_649_figure_003.png)

FIGURE 11-22 Components involved in file system I/O.

The following sections describe the circumstances surrounding each of these scenarios and the steps FSDs typically take in response to each one. You'll see how much FSDs rely on the memory manager and the cache manager.

618      CHAPTER 11   Caching and file systems


---

## Explicit file I/O

The most obvious way an application accesses files is by calling Windows I/O functions such as

CreateFile, ReadFile, and WriteFile. An application opens a file with CreateFile and then reads, writes, or deletes the file by passing the handle returned from CreateFile to other Windows functions. The CreateFile function, which is implemented in the Kernel32.dll Windows client-side DLL, invokes the native function NtCreateFile, forming a complete root-relative path name for the path that the application passed to it (processing ":" and ":" symbols in the path name) and prefixing the path with "??" (for example, ??\\C$\aryl1\00.do.txt).

The NtCreateFile system service uses ObOpenObjectByName to open the file, which parses the name starting with the object manager root directory and the first component of the path name ("?"). Chapter 8, "System mechanisms", includes a thorough description of object manager name resolution and its use of process device maps, but we'll review the steps it follows here with a focus on volume drive letter lookup.

The first step the object manager takes is to translate ??? to the process's per-session namespace directory that the DosDevicesDirectory field of the device map structure in the process object references (which was propagated from the first process in the logon session by using the logon session references field in the logon session's token). Only volume names for network shares and drive letters mapped by the Subst.exe utility are typically stored in the per-session directory, so on those systems when a name (C: in this example) is not present in the per-session directory, the object manager restarts its search in the directory referenced by the GlobalDosDevicesDirectory field of the device map associated with the per-session directory. The GlobalDosDevicesDirectory field always points at the [GLOBAL]? directory, which is where Windows stores volume drive letters for local volumes. (See the section "Session namespace" in Chapter 8 for more information.) Processes can also have their own device map, which is an important characteristic during impersonation over protocols such as RPC.

The symbolic link for a volume drive letter points to a volume device object under \Device, so when the object manager encounters the volume object, the object manager hands the rest of the path name to the parse function that the I/O manager has registered for device objects, loopParseDevice. (In volumes on dynamic disks, a symbolic link points to an intermediary symbolic link, which points to a volume device object.) Figure 11-23 shows how volume objects are accessed through the object manager namespace. The figure shows how the <GLOBAL?>\C: symbolic link points to the \Device\ HarddiskVolume6 volume device object.

After locking the caller's security context and obtaining security information from the caller's token, IapParseDevice creates an I/O request packet (IRP) of type IRP.ML.CREATE, creates a file object that stores the name of the file being opened, follows the VPB of the volume device object to find the volume's mounted file system device object, and uses IoCallDriver to pass the IRP to the file system driver that owns the file system device object.

When an FSD receives an IRP_ML_CREATE IRP, it looks up the specified file, performs security valida tion, and if the file exists and the user has permission to access the file in the way requested, returns

a success status code. The object manager creates a handle for the file object in the process's handle

table, and the handle propagates back through the calling chain, finally reaching the application as a

CHAPTER 11    Caching and file systems      619


---

return parameter from CreateFile. If the file system fails the create operation, the I/O manager deletes the file object it created for the file.

We've skipped over the details of how the FSD locates the file being opened on the volume, but a ReadFile function call operation shares many of the FSD's interactions with the cache manager and storage driver. Both ReadFile and CreateFile are system calls that map to I/O manager functions, but the NtReadFile system service doesn't need to perform a name lookup; it calls on the object manager to translate the handle passed from ReadFile into a file object pointer. If the handle indicates that the caller obtained permission to read the file when the file was opened, NtReadFile proceeds to create an IRP of type IRP_MJ_READ and sends it to the FSD for the volume on which the file resides. NtReadFile obtains the FSD's device object, which is stored in the file object, and calls loCallDriver, and the I/O manager locates the FSD from the device object and gives the IRP to the FSD.

![Figure](figures/Winternals7thPt2_page_651_figure_002.png)

FIGURE 11-23 Drive-letter name resolution.

---

If the file being read can be cached (that is, the FILE_FLAG_NO_BUFFERING flag wasn't passed to

CreateFile when the file was opened), the FSD checks to see whether caching has already been initiated

for the file object. The PrivateCacheMap field in a file object points to a private cache map data struc ture (which we described in the previous section) if caching is initiated for a file object. If the FSD hasn't

initialized caching for the file object (which it does the first time a file object is read from or written to),

the PrivateCacheMap field will be null. The FSD calls the cache manager's CcInitializeCacheMap function

to initialize caching, which involves the cache manager creating a private cache map and, if another file

object referring to the same file hasn't initiated caching, a shared cache map and a section object.

After it has verified that caching is enabled for the file, the FSD copies the requested file data from the cache manager's virtual memory to the buffer that the thread passed to the ReadFile function. The file system performs the copy within a try/except block so that it catches any faults that are the result of an invalid application buffer. The function the file system uses to perform the copy is the cache manager's CcCopyRead function. CcCopyRead takes as parameters a file object, file offset, and length.

When the cache manager executes CcCopyRead, it retrieves a pointer to a shared cache map, which is stored in the file object. Recall that a shared cache map stores pointers to virtual address control blocks (VACBs), with one VACB entry for each 256 KB block of the file. If the VACB pointer for a portion of a file being read is null, CcCopyRead allocates a VACB, reserving a 256 KB view in the cache manager’s virtual address space, and maps (using MmMapViewInSystemCache) the specified portion of the file into the view. Then CcCopyRead simply copies the file data from the mapped view to the buffer it was passed (the buffer originally passed to ReadFile). If the file data isn’t in physical memory, the copy operation generates page faults, which are serviced by MmAccessExceptionFault.

When a page fault occurs, MmAccessFault examines the virtual address that caused the fault and locates the virtual address descriptor (VAD) in the VAD tree of the process that caused the fault. (See Chapter 5 of Part 1 for more information on VAD trees.) In this scenario, the VAD describes the cache manager's mapped view of the file being read, so MmAccessFault calls MiDispatchFault to handle a page fault on a valid virtual memory address. MiDispatchFault locates the control area (which the VAD points to) and through the control area finds a file object representing the open file. (If the file has been opened more than once, there might be a list of file objects linked through pointers in their private cache maps.)

With the file object in hand, MiDispatchFault calls the I/O manager function IoPageRead to build an IRP (of type IRP, MI_READ) and sends the IRP to the FSD that owns the device object the file object points to. Thus, the file system is reentered to read the data that it requested via CcCopyRead, but this time the IRP is marked as noncached and paging I/O. These flags signal the FSD that it should retrieve file data directly from disk, and it does so by determining which clusters on disk contain the requested data (the exact mechanism is file-system dependent) and sending IRPs to the volume manager that owns the volume device object on which the file resides. The volume parameter block (VBP) field in the FSD's device object points to the volume device object.

The memory manager waits for the FSD to complete the IRP read and then returns control to the cache manager, which continues the copy operation that was interrupted by a page fault. When CcCopyRead completes, the FSD returns control to the thread that called NtReadFile, having copied the requested file data, with the aid of the cache manager and the memory manager, to the thread's buffer.

CHAPTER 11   Caching and file systems      621


---

The path for WriteFile is similar except that the NtWriteFile system service generates an IRP of type

IRP_ML_WRITE, and the FSD calls CcCopyWrite instead of CcCopyRead. CcCopyWrite, like CcCopyRead,

ensures that the portions of the file being written are mapped into the cache and then copies to the

cache the buffer passed to WriteFile.

If a file's data is already cached (in the system's working set), there are several variants on the scenario we've just described. If a file's data is already stored in the cache, CcCopyRead doesn't incur page faults. Also, under certain conditions, NtReadFile and NtWriteFile call an FSD's fast I/O entry point instead of immediately building and sending an IRP to the FSD. Some of these conditions follow: the portion of the file being read must reside in the first 4 GB of the file, the file can have no locks, and the portion of the file being read or written must fall within the file's currently allocated size.

The fast I/O read and write entry points for most FSDs call the cache manager's CcFastCopyRead and CcFastCopyWrite functions. These variants on the standard copy routines ensure that the file's data is mapped in the file system cache before performing a copy operation. If this condition isn't met, CcFastCopyRead and CcFastCopyWrite indicate that fast I/O isn't possible. When fast I/O isn't possible, NtReadFile and NtWriteFile fall back on creating an IRP. (See the earlier section "Fast I/O" for a more complete description of fast I/O.)

## Memory manager's modified and mapped page writer

The memory manager's modified and mapped page writer threads wake up periodically (and when available memory runs low) to flush modified pages to their backing store on disk. The threads call IoAsynchronousPageWrite to create IRPs of type IRP_MJ_WRITE and write pages to either a paging file or a file that was modified after being mapped. Like the IRPs that MiDispatchFault creates, these IRPs are flagged as noncached and paging I/O. Thus, an FSD bypasses the file system cache and issues IRPs directly to a storage driver to write the memory to disk.

### Cache manager's lazy writer

The cache manager's lazy writer thread also plays a role in writing modified pages because it periodically flushes views of file sections mapped in the cache that it knows are dirty. The flush operation, which the cache manager performs by calling MmFlushSection, triggers the memory manager to write any modified pages in the portion of the section being flushed to disk. Like the modified and mapped page writers, MmFlushSection uses IaSynchronousPageWrite to send the data to the FSD.

### Cache manager's read-ahead thread

A cache uses two artifacts of how programs reference code and data: temporal locality and spatial locality. The underlying concept behind temporal locality is that if a memory location is referenced, it is likely to be referenced again soon. The idea behind spatial locality is that if a memory location is referenced, other nearby locations are also likely to be referenced soon. Thus, a cache typically is very good at speeding up access to memory locations that have been accessed in the near past, but it's terrible at speeding up access to areas of memory that have not yet been accessed (it has zero lookahead

---

capability). In an attempt to populate the cache with data that will likely be used soon, the cache manager implements two mechanisms: a read-ahead thread and Superfetch.

As we described in the previous section, the cache manager includes a thread that is responsible for

attempting to read data from files before an application, a driver, or a system thread explicitly requests

it. The read-ahead thread uses the history of read operations that were performed on a file, which

are stored in a file object's private cache map, to determine how much data to read. When the thread

performs a read-ahead, it simply maps the portion of the file it wants to read into the cache (allocating

VACBs as necessary) and touches the mapped data. The page faults caused by the memory accesses

invoke the page fault handler, which reads the pages into the system's working set.

A limitation of the read-ahead thread is that it works only on open files. Superfetch was added to Windows to proactively add files to the cache before they're even opened. Specifically, the memory manager sends page-usage information to the Superfetch service (%SystemRoot%\System32\Sysmain. dll), and a file system minifilter provides file name resolution data. The Superfetch service attempts to find file-usage patterns—for example, payroll is run every Friday at 12:00, or Outlook is run every morning at 8:00. When these patterns are derived, the information is stored in a database and timers are requested. Just prior to the time the file would most likely be used, a timer fires and tells the memory manager to read the file into low-priority memory (using low-priority disk I/O). If the file is then opened, the data is already in memory, and there's no need to wait for the data to be read from disk. If the file isn't opened, the low-priority memory will be reclaimed by the system. The internals and full description of the Superfetch service were previously described in Chapter 5, Part 1.

## Memory manager's page fault handler

We described how the page fault handler is used in the context of explicit file I/O and cache manager

read-ahead, but it's also invoked whenever any application accesses virtual memory that is a view of

a mapped file and encounters pages that represent portions of a file that aren't yet in memory. The

memory manager's MmAccessFault handler follows the same steps it does when the cache manager

generates a page fault from CcCopyRead or CcCopyWrite, sending IRPs via IoPageRead to the file sys tem on which the file is stored.

## File system filter drivers and minifilters

A filter driver that layers over a file system driver is called a file system filter driver. Two types of file system filter drivers are supported by the Windows I/O model:

- • Legacy file system filter drivers usually create one or multiple device objects and attach them

on the file system device through the IoAttachDeviceToDeviceStack API. Legacy filter drivers

intercept all the requests coming from the cache manager or I/O manager and must implement

both standard IRP dispatch functions and the Fast I/O path. Due to the complexity involved in

the development of this kind of driver (synchronization issues, undocumented interfaces, de-

pendency on the original file system, and so on), Microsoft has developed a unified filter model

that makes use of special drivers, called minifiers, and deprecated legacy file system drivers.

(The IoAttachDeviceToDeviceStack API fails when it's called for DAX volumes).
CHAPTER 11    Caching and file systems      623


---

- ■ Minifiers drivers are clients of the Filesystem Filter Manager (Fltmgr.sys). The Filesystem Filter
Manager is a legacy file system filter driver that provides a rich and documented interface for the
creation of file system filters, hiding the complexity behind all the interactions between the file
system drivers and the cache manager. Minifiers register with the filter manager through the
FltRegisterFilter API. The caller usually specifies an instance setup routine and different operation
callbacks. The instance setup is called by the filter manager for every valid volume device that a
file system manages. The minifilter has the chance to decide whether to attach to the volume.
Minifiers can specify a Pre and Post operation callback for every major IRP function code, as well
as certain "pseudo-operations" that describe internal memory manager or cache manager se-
mantics that are relevant to file system access patterns. The Pre callback is executed before the I/O
is processed by the file system driver, whereas the Post callback is executed after the I/O operation
has been completed. The Filter Manager also provides its own communication facility that can be
employed between minifilter drivers and their associated user-mode application.
The ability to see all file system requests and optionally modify or complete them enables a range of applications, including remote file replication services, file encryption, efficient backup, and licensing. Every anti-malware product typically includes at least a minifilter driver that intercepts applications opening or modifying files. For example, before propagating the IRP to the file system driver to which the command is directed, a malware scanner examines the file being opened to ensure that it's clean. If the file is clean, the malware scanner passes the IRP on, but if the file is infected, the malware scanner quarantines or cleans the file. If the file can't be cleaned, the driver fails the IRP (typically with an access-denied error) so that the malware cannot become active.

Deeply describing the entire minfilter and legacy filter driver architecture is outside the scope

of this chapter. You can find more information on the legacy filter driver architecture in Chapter 6,

"I/O System," of Part 1. More details on minfilters are available in MSDN (https://docs.microsoft.com

/en-us/windows-hardware/drivers/ifs/file-system-minfilter-drivers).

## Data-scan sections

Starting with Windows 8.1, the Filter Manager collaborates with file system drivers to provide data-scan section objects that can be used by anti-malware products. Data-scan section objects are similar to standard section objects (for more information about section objects, see Chapter 5 of Part 1) except for the following:

- ■ Data-scan section objects can be created from minfilter callback functions, namely from call-
backs that manage the IRP_MJ_CREATE function code. These callbacks are called by the filter
manager when an application is opening or creating a file. An anti-malware scanner can create
a data-scan section and then start scanning before completing the callback.
■ FitCreateSectionForDataScan, the API used for creating data-scan sections, accepts a FILE_
OBJECT pointer. This means that callers don’t need to provide a file handle. The file handle
typically doesn’t yet exist, and would thus need to be (re)created by using FitCreateFile API,
which would then have created other file creation IRPs, recursively interacting with lower level
file system filters once again. With the new API, the process is much faster because these extra
recursive calls won’t be generated.
---

A data-scan section can be mapped like a normal section using the traditional API. This allows antimalware applications to implement their scan engine either as a user-mode application or in a kernelmode driver. When the data-scan section is mapped, IRP_MI_READ events are still generated in the minifilter driver, but this is not a problem because the minifilter doesn’t have to include a read callback at all.

## Filtering named pipes and mailslots

When a process belonging to a user application needs to communicate with another entity (a process, kernel driver, or remote application), it can leverage facilities provided by the operating system.

The most traditionally used are named pipes and mailtoils, because they are portable among other operating systems as well. A named pipe is a named, one-way communication channel between a pipe server and one or more pipe clients. All instances of a named pipe share the same pipe name, but each instance has its own buffers and handles, and provides a separate channel for client/server communication. Named pipes are implemented through a file system driver, the NFPS driver (Nfps.sys).

A Mailslot is a multi-way communication channel between a mailslot server and one or more clients. A mailslot server is a process that creates a mailslot through the CreateMailslot Win32 API, and can only read small messages (424 bytes maximum when sent between remote computers) generated by one or more clients. Clients are processes that write messages to the mailslot. Clients connect to the mailslot through the standard CreateFile API and send messages through the WriteFile function. Mailslots are generally used for broadcasting messages within a domain. If several server processes in a domain each create a mailslot using the same name, every message that is addressed to that mailslot and sent to the domain is received by the participating processes. Mailslots are implemented through the Mailslot file system driver, Msfs.sys.

Both the mailslot and NPF5 driver implement simple file systems. They manage namespaces composed of files and directories, which support security, can be opened, closed, read, written, and so on. Describing the implementation of the two drivers is outside the scope of this chapter.

Starting with Windows 8, mailslots and named pipes are supported by the Filter Manager. Minifilters are able to attach to the Mailslot and named pipe volumes (DeviceNamedPipe and DeviceMailslot, which are not real volumes), through the FLTL_REGISTRATION_SUPPORT_NFS_MSFS flag specified at registration time. A minifilter can then intercept and modify all the named pipe and Mailslot I/O that happens between local and remote process and between a user application and its kernel driver. Furthermore, minifiers can open or create a named pipe or Mailslot without generating recursive events through the FltCreateNamedPipeFile or FltCreateMailslotFile APIs.

![Figure](figures/Winternals7thPt2_page_656_figure_006.png)

Note One of the motivations that explains why the named pipe and mailslot file system drivers are simpler compared to NTFS and ReFs is that they do not interact heavily with the cache manager. The named pipe driver implements the Fast I/O path but with no cached read or write-behind support. The mailslot driver does not interact with the cache manager at all.

---

## Controlling reparse point behavior

The NTFS file system supports the concept of reparse points, blocks of 16 KB of application and systemdefined reparse data that can be associated to single files. (Reparse points are discussed more in multiple sections later in this chapter.) Some types of reparse points, like volume mount points or symbolic links, contain a link between the original file (or an empty directory), used as a placeholder, and another file, which can even be located in another volume. When the NTFS file system driver encounters a reparse point on its path, it returns an error code to the upper driver in the device stack. The latter (which could be another filter driver) analyzes the reparse point content and, in the case of a symbolic link, re-emits another I/O to the correct volume device.

This process is complex and cumbersome for any filter driver. Minifiers drivers can intercept the STATUS_REPAIR_SEP error code and reopen the reparse point through the new FltCreateFileEx2 API, which accepts a list of Extra Create Parameters (also known as ECPs), used to fine-tune the behavior of the opening/creation process of a target file in the minifier context. In general, the Filter Manager supports different ECPs, and each of them is uniquely identified by a GUID. The Filter Manager provides multiple documented APIs that deal with ECPs and ECP lists. Usually, minifiers allocate an ECP with the FltAllocateExtraCreateParameter function, populate it, and insert it into a list (through FltInsertExtraCreateParameter) before calling the Filter Manager's I/O APIs.

The FLT_CREATEFILE_TARGET extra creation parameter allows the Filter Manager to manage crossvolume file creation automatically (the caller needs to specify a flag). Minifilters don't need to perform any other complex operation.

With the goal of supporting container isolation, it's also possible to set a reparse point on nonempty

directories and, in order to support container isolation, create new files that have directory reparse

points. The default behavior that the file system has while encountering a nonempty directory reparse

point depends on whether the reparse point is applied in the last component of the file full path. If this

is the case, the file system returns the STATUS_REPARSE error code, just like for an empty directory;

otherwise, it continues to walk the path.

The Filter Manager is able to correctly deal with this new kind of reparse point through another ECP (named TYPE_OPEN_REPARSE). The ECP includes a list of descriptors (OPEN_REPARSE_LIST_ENTRY data structure), each of which describes the type of reparse point (through its Reparse Tag), and the behavior that the system should apply when it encounters a reparse point of that type while parsing a path. Minifiers, after they have correctly initialized the descriptor list, can apply the new behavior in different ways:

- ■ Issue a new open (or create) operation on a file that resides in a path that includes a reparse
point in any of its components, using the FltCreateFileEx2 function. This procedure is similar to
the one used by the FLT_CREATEFILE_TARGET ECP.
■ Apply the new reparse point behavior globally to any file that the Pre-Create callback inter-
cepts. The FltAddOpenReparseEntry and FltRemoveOpenReparseEntry APIs can be used to set
the reparse point behavior to a target file before the file is actually created (the pre-creation
callback intercepts the file creation request before the file is created). The Windows Container
Isolation minifilter driver (Wcifs.sys) uses this strategy.
---

## Process Monitor

Process Monitor (Procmon), a system activity-monitoring utility from Sysinternals that has been used throughout this book, is an example of a passive minifilter driver, which is one that does not modify the flow of IRPs between applications and file system drivers.

Process Monitor works by extracting a file system minifilter device driver from its executable image

(stored as a resource inside Procmon.exe) the first time you run it after a boot, installing the driver in

memory, and then deleting the driver image from disk (unless configured for persistent boot-time

monitoring). Through the Process Monitor GUI, you can direct the driver to monitor file system activity

on local volumes that have assigned drive letters, network shares, named pipes, and mail slots. When

the driver receives a command to start monitoring a volume, it registers filtering callbacks with the

Filter Manager, which is attached to the device object that represents a mounted file system on the

volume. After an attach operation, the I/O manager redirects an IRP targeted at the underlying device

object to the driver owning the attached device, in this case the Filter Manager, which sends the event

to registered minifilter drivers, in this case Process Monitor.

When the Process Monitor driver intercepts an IRP, it records information about the IRP's command, including target file name and other parameters specific to the command (such as read and write lengths and offsets) to a nonpaged kernel buffer. Every 500 milliseconds, the Process Monitor GUI program sends an IRP to Process Monitor's interface device object, which requests a copy of the buffer containing the latest activity, and then displays the activity in its output window. Process Monitor shows all file activity as it occurs, which makes it an ideal tool for troubleshooting file system-related system and application failures. To run Process Monitor the first time on a system, an account must have the Load Driver and Debug privileges. After loading, the driver remains resident, so subsequent executions require only the Debug privilege.

When you run Process Monitor, it starts in basic mode, which shows the file system activity most

often useful for troubleshooting. When in basic mode, Process Monitor omits certain file system opera tions from being displayed, including

- ■ I/O to NTFS metadata files

■ I/O to the paging file

■ I/O generated by the System process

■ I/O generated by the Process Monitor process
While in basic mode, Process Monitor also reports file I/O operations with friendly names rather than with the IRP types used to represent them. For example, both IRP_MJ_WRITE and FASTIO_WRITE operations display as WriteFile, and IRP_MJ_CREATE operations show as Open if they represent an open operation and as Create for the creation of new files.

---

### EXPERIMENT: Viewing Process Monitor’s minifilter driver

To see which file system minifilter drivers are loaded, start an Administrative command prompt, and run the Filter Manager control program (%SystemRoot%\System32\Fltmc.exe). Start Process Monitor (ProcMon.exe) and run Fltmc again. You see that the Process Monitor's filter driver (PROCMON20) is loaded and has a nonzero value in the Instances column. Now, exit Process Monitor and run Fltmc again. This time, you see that the Process Monitor's filter driver is still loaded, but now its instance count is zero.

![Figure](figures/Winternals7thPt2_page_659_figure_002.png)

