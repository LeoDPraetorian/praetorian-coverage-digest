
When a file stream is encrypted or decrypted, it is exclusively locked by the NTFS file system driver. This means that no applications can access the file during the entire encryption or decryption process. For large files, this limitation can break the file's availability for many seconds—or even minutes. Clearly this is not acceptable for large file-server environments.

To resolve this, recent versions of Windows 10 introduced online encryption support. Through the right synchronization, the NTFS driver is able to perform file encryption and decryption without retaining exclusive file access. EFS enables online encryption only if the target encryption stream is a data stream (named or unnamed) and is nonresident. (Otherwise, a standard encryption process starts.) If both conditions are satisfied, the EFS service sends a FSCTL_SET_ENCRYPTION control code to the NTFS driver to set a flag that enables online encryption.

Online encryption is possible thanks to the "SEfsBackup" attribute (of type $LOGGED_UTILITY_STREAM) and to the introduction of range locks, a new feature that allows the file system driver to lock (in an exclusive or shared mode) only only a portion of a file. When online encryption is enabled, the


NTfsEncryptDecryptOnLine internal function starts the encryption and decryption process by creating the SEfsBackup attribute (and its SCB) and by acquiring a shared lock on the first 2-MB range of the file. A shared lock means that multiple readers can still read from the file range, but other writers need to wait until the end of the encryption or decryption operation before they can write new data.

The NTFS driver allocates a 2-MB buffer from the nonpaged pool and reserves some clusters from

the volume, which are needed to represent 2 MB of free space. (The total number of clusters depends

on the volume cluster's size.) The online encryption function reads the original data from the physical

disk and stores it in the allocated buffer. If BitLocker encryption offload is not enabled (described in the

previous section), the buffer is encrypted using EFS services; otherwise, the BitLocker driver encrypts

the data when the buffer is written to the previously reserved clusters.

At this stage, NTFS locks the entire file for a brief amount of time: only the time needed to remove the clusters containing the unencrypted data from the original stream's extent table, assign them to the $EfsBackup non-resident attribute, and replace the removed range of the original stream's extent table with the new clusters that contain the newly encrypted data. Before releasing the exclusive lock, the NTFS driver calculates a new high watermark value and stores it both in the original file in-memory SCB and in the EFS payload of the $EFS alternate data stream. NTFS then releases the exclusive lock. The clusters that contain the original data are first zoned out; then, if there are no more blocks to process, they are eventually freed. Otherwise, the online encryption cycle restarts with the next 2-MB chunk.

The high watermark value stores the file offset that represents the boundary between encrypted and nonencrypted data. Any concurrent write beyond the watermark can occur in its original form; other concurrent writes before the watermark need to be encrypted before they can succeed. Writes to the current locked range are not allowed. Figure 11-72 shows an example of an ongoing online encryption for a 16-MB file. The first two blocks (2 MB in size) already have been encrypted; the high watermark value is set to 4 MB, dividing the file between its encrypted and non-encrypted data. A range lock is set on the 2-MB block that follows the high watermark. Applications can still read from that block, but they can't write any new data (in the latter case, they need to wait). The block's data is encrypted

CHAPTER 11    Caching and file systems      719


---

and stored in reserved clusters. When exclusive file ownership is taken, the original block's clusters are remapped to the $ EFsBackup stream (by removing or splitting their entry in the original file's extent table and inserting a new entry in the $EFsBackup attribute), and the new clusters are inserted in place of the previous ones. The high watermark value is increased, the file lock is released, and the online encryption process proceeds to the next stage starting at the 6-MB offset; the previous clusters located in the $EFsBackup stream are concurrently zeroed-out and can be reused for new stages.

![Figure](figures/Winternals7thPt2_page_751_figure_001.png)

FIGURE 11-72 Example of an ongoing online encryption for a 16MB file.

The new implementation allows NTFS to encrypt or decrypt in place, getting rid of temporary files (see the previous "Encrypting file data" section for more details). More importantly, it allows NTFS to perform file encryption and decryption while other applications can still use and modify the target file stream (the time spent with the exclusive lock hold is small and not perceptible by the application that is attempting to use the file).

## Direct Access (DAX) disks

Persistent memory is an evolution of solid-state disk technology: a new kind of nonvolatile storage

medium that has RAM-like performance characteristics (low latency and high bandwidth), resides on

the memory bus (DDR), and can be used like a standard disk device.

Direct Access Dicks (DAX) is the term used by the Windows operating system to refer to such persistent memory technology (another common term used is storage class memory, abbreviated as SCM). A nonvolatile dual in-line memory module (NVDIMM), shown in Figure 11-73, is an example of this new type of storage. NVDIMM is a type of memory that retains its contents even when electrical power is removed. "Dual in-line" identifies the memory as using DIMM packaging. At the time of writing, there are three different types of NVDIMMs: NVDIMM-F contains only flash storage; NVDIMM-N, the most common, is

---

produced by combining flash storage and traditional DRAM chips on the same module; and NVDIMM-P

has persistent DRAM chips, which do not lose data in event of power failure.

One of the main characteristics of DAX, which is key to its fast performance, is the support of zerocopy access to persistent memory. This means that many components, like the file system driver and memory manager, need to be updated to support DAX, which is a disruptive technology.

Windows Server 2016 was the first Windows operating system to supports DAX: the new storage

model provides compatibility with most existing applications, which can run on DAX disks without any

modification. For fastest performance, files and directories on a DAX volume need to be mapped in

memory using memory-mapped APIs, and the volume needs to be formatted in a special DAX mode.

At the time of this writing, only NTFS supports DAX volumes.

![Figure](figures/Winternals7thPt2_page_752_figure_003.png)

FIGURE 11-73 An NVDMM, which has DRAM and Flash chips. An attached battery or on-board supercapacitors are needed for maintaining the data in the DRAM chips.

The following sections describe the way in which direct access disks operate and detail the archi tecture of the new driver model and the modification on the main components responsible for DAX

volume support: the NTFS driver, memory manager, cache manager, and I/O manager. Additionally,

inbox and third-party file system filter drivers (including mini filters) must also be individually updated

to take full advantage of DAX.

## DAX driver model

To support DAX volumes, Windows needed to introduce a brand-new storage driver model. The SCM Bus Driver (Scmbus.sys) is a new bus driver that enumerates physical and logical persistent memory (PM) devices on the system, which are attached to its memory bus (the enumeration is performed thanks to the NFT/ ACPI table). The bus driver, which is not considered part of the I/O path, is a primary bus driver managed by the ACPI enumerator, which is provided by the HAL (hardware abstraction layer) through the hardware database registry key {HKL/M/SYSTEMCurrentControlSetEnum,ACPI}. More details about Plug & Play Device enumeration are available in Chapter 6 of Part 1.

CHAPTER 11   Caching and file systems      721


---

Figure 11-74 shows the architecture of the SCM storage driver model. The SCM bus driver creates

two different types of device objects:

- ■ Physical device objects (PDOs) represent physical PM devices. A NVDIMM device is usually composed of one or multiple interleave NVDIMM-N modules. In the former case, the SCM bus driver creates only one physical device object representing the NVDIMM unit. In the latter case, it creates two distinct devices that represent each NVDIMM-N module. All the physical devices are managed by the miniport driver, Nvdimm.sys, which controls a physical NVDIMM and is responsible for monitoring its health.
■ Functional device objects (FDOs) represent single DAX disks, which are managed by the persistent memory driver, Pmem.sys. The driver controls any byte-addressable interleave sets and is responsible for all I/O directed to a DAX volume. The persistent memory driver is the class driver for each DAX disk. (It replaces Disk.sys in the classical storage stack.)
Both the SCM bus driver and the NVDIMM miniport driver expose some interfaces for communication with the PM class driver. Those interfaces are exposed through an IRP_MJ_PNP major function by using the IRP_MN_QUERY_INTERFACE request. When the request is received, the SCM bus driver knows that it should expose its communication interface because callers specify the {8de064ff-b63042e4-ea88-6f24c8641175} interface GUID. Similarly, the persistent memory driver requires communication interface to the NVDIMM devices through the {0079c21b-917e-405e-cea9-0732b5bbceb} GUID.

![Figure](figures/Winternals7thPt2_page_753_figure_003.png)

FIGURE 11-74 The SCM Storage driver model.

The new storage driver model implements a clear separation of responsibilities: The PM class driver manages logical disk functionality (open, close, read, write, memory mapping, and so on), whereas NVDIMM drivers manage the physical device and its health. It will be easy in the future to add support for new types of NVDIMM by just updating the Nvdimm.sys driver. (Pmem.sys doesn't need to change.)

## DAX volumes

The DAX storage driver model introduces a new kind of volume: the DAX volumes. When a user first formats a partition through the Format tool, she can specify the /DAX argument to the command line. If the underlying medium is a DAX disk, and it's partitioned using the GPT scheme, before creating the basic disk data structure needed for the NTFS file system, the tool writes the GPT_BASIC_DATA, ATTRIBUTE_DAX

722     CHAPTER 11   Caching and file systems


---

flag in the target volume GPT partition entry (which corresponds to bit number 58). A good reference for the GUID partition table is available at https://en.wikipedia.org/wiki/GUID_Partition_Table.

When the NTFS driver then mounts the volume, it recognizes the flag and sends a STORAGE

QUERY_PROPERTY control code to the underlying storage driver. The IOCTL is recognized by the SCM

bus driver, which responds to the file system driver with another flag specifying that the underlying

disk is a DAX disk. Only the SCM bus driver can set the flag. Once the two conditions are verified, and as

long as DAX support is not disabled through the HKLM\System\CurrentControlSet\Control\FileSystem\ NtfsEnableDirectAccess registry value, NTFS enables DAX volume support.

DAX volumes are different from the standard volumes mainly because they support zero-copy access to the persistent memory. Memory-mapped files provide applications with direct access to the underlying hardware disk sectors (through a mapped view), meaning that no intermediary components will intercept any I/O. This characteristic provides extreme performance (but as mentioned earlier, can impact file system filter drivers, including minifiers).

When an application creates a memory-mapped section backed by a file that resides on a DAX volume, the memory manager asks the file system whether the section should be created in DAX mode, which is true only if the volume has been formatted in DAX mode, too. When the file is later mapped through the MapViewOffline API, the memory manager asks the file system for the physical memory range of a given range of the file. The file system driver translates the requested file range in one or more volume relative extents (sector offset and length) and asks the PM disk class driver to translate the volume extents into physical memory ranges. The memory manager, after receiving the physical memory ranges, updates the target process page tables for the section to map directly to persistent storage. This is a truly zero-copy access to storage: an application has direct access to the persistent memory. No paging reads or paging writes will be generated. This is important; the cache manager is not involved in this case. We examine the implications of this later in the chapter.

Applications can recognize DAX volumes by using the GetVolumeInformation API. If the returned flags include FILE_DAX_VOLUME, the volume is formatted with a DAX-compatible file system (only NTFs at the time of this writing). In the same way, an application can identify whether a file resides on a DAX disk by using the GetVolumeInformationByHandle API.

## Cached and noncached I/O in DAX volumes

Even though memory-mapped I/O for DAX volumes provide zero-copy access to the underlying storage, DAX volumes still support I/O through standard means (via classic ReadFile and WriteFile APIs). As described at the beginning of the chapter, Windows supports two kinds of regular I/O: cached and noncached. Both types have significant differences when issued to DAX volumes.

Cached I/O still requires interaction from the cache manager, which, while creating a shared cache

map for the file, requires the memory manager to create a section object that directly maps to the

PM hardware. NTFS is able to communicate to the cache manager that the target file is in DAX-mode

through the new CcInitializeCacheMapEx routine. The cache manager will then copy data from the user

buffer to persistent memory. cached I/O has therefore one-copy access to persistent storage. Note that

cached I/O is still coherent with other memory-mapped I/O (the cache manager uses the same section):

CHAPTER 11   Caching and file systems      723


---

as in the memory-mapped I/O case, there are still no paging reads or paging writes, so the lazy writer thread and intelligent read-ahead are not enabled.

One implication of the direct-mapping is that the cache manager directly writes to the DAX disk as soon as the NtWriteFile function completes. This means that cached I/O is essentially noncached. For this reason, noncached I/O requests are directly converted by the file system to cached I/O such that the cache manager still copies directly between the user's buffer and persistent memory. This kind of I/O is still coherent with cached and memory-mapped I/O.

NTFS continues to use standard I/O while processing updates to its metadata files. DAX mode I/O for each file is decided at stream creation time by setting a flag in the stream control block. If a file is a system metadata file, the attribute is never set, so the cache manager, when mapping such a file, creates a standard non-DAX file-backed section, which will use the standard storage stack for performing paging read or write I/Os. (Ultimately, each I/O is processed by the Pmem driver just like for block volumes, using the sector atomicity algorithm. See the “Block volumes” section for more details.) This behavior is needed for maintaining compatibility with write-ahead logging. Metadata must not be persisted to disk before the corresponding log is flushed. So, if a metadata file were DAX mapped, that write-ahead logging requirement would be broken.

### Effects on file system functionality

The absence of regular paging I/O and the application's ability to directly access persistent memory eliminate traditional hook points that the file systems and related filters use to implement various features. Multiple functionality cannot be supported on DAX-enabled volumes, like file encryption, compressed and sparse files, snapshots, and USN journal support.

In DAX mode, the file system no longer knows when a writable memory-mapped file is modified.


When the memory section is first created, the NTFS file system driver updates the file's modification

and access times and marks the file as modified in the USN change journal. At the same time, it signals

a directory change notification. DAX volumes are no longer compatible with any kind of legacy filter

drivers and have a big impact on minifiers (filter manager clients). Components like BitLocker and

the volume shadow copy driver (Volsnap.sys) don't work with DAX volumes and are removed from the

device stack. Because a minifier no longer knows if a file has been modified, an antimalware file access

scanner, such as one described earlier, can no longer know if it should scan a file for viruses. It needs

to assume, on any handle close, that modification may have occurred. In turn, this significantly harms

performance, so minifiers must manually opt-in to support DAX volumes.

## Mapping of executable images

When the Windows loader maps an executable image into memory, it uses memory-mapping services

provided by the memory manager. The loader creates a memory-mapped image section by supplying

the SEC_IMAGE flag to the NTCreateSection API. The flag specifies to the loader to map the section as

an image, applying all the necessary fixups. In DAX mode this mustn't be allowed to happen; otherwise,

all the relocations and fixups will be applied to the original image file on the PM disk. To correctly deal

---

with this problem, the memory manager applies the following strategies while mapping an executable

image stored in a DAX mode volume:

- ■ If there is already a control area that represents a data section for the binary file (meaning that
an application has opened the image for reading binary data), the memory manager creates an
empty memory-backed image section and copies the data from the existing data section to the
newly created image section; then it applies the necessary fixups.
■ If there are no data sections for the file, the memory manager creates a regular non-DAX image
section, which creates standard invalid prototype PTEs (see Chapter 5 of Part 1 for more details).
In this case, the memory manager uses the standard read and write routines of the Pmem driver
to bring data in memory when a page fault for an invalid access on an address that belongs to
the image-backed section happens.
At the time of this writing, Windows 10 does not support execution in-place, meaning that the loader is not able to directly execute an image from DAX storage. This is not a problem, though, because DAX mode volumes have been originally designed to store data in a very performant way. Execution in-place for DAX volumes will be supported in future releases of Windows.

## EXPERIMENT: Witnessing DAX I/O with Process Monitor

You can witness DAX I/Os using Process Monitor from Sysinternals and the FsTool.exe application, which is available in this book's downloadable resources. When an application reads or writes from a memory-mapped file that resides on a DAX-mode volume, the system does not generate any paging I/O, so nothing is visible to the NTFS driver or to the minifiers that are attached above or below it. To witness the described behavior, just open Process Monitor, and, assuming that you have two different volumes mounted as the P: and Q: drives, set the filters in a similar way as illustrated in the following figure (the Q: drive is the DAX-mode volume):

![Figure](figures/Winternals7thPt2_page_756_figure_005.png)

CHAPTER 11   Caching and file systems      725


---

For generating I/O on DAX-mode volumes, you need to simulate a DAX copy using the FSTool application. The following example copies an ISO image located in the P: DAX block-mode volume (even a standard volume created on the top of a regular disk is fine for the experiment) to the DAX-mode "Q" drive:

```bash
P:\fsstool.exe /daxcopy p:\Big.image.iso q:\test.iso
NTFS / ReFS Tool v0.1
Copyright (C) 2018 Andrea Allièvi (AaL186)
Starting DAX copy...
   Source file path: p:\Big.image.iso.
   Target file path: q:\test.iso.
   Source Volume: p:~\ File system: NTFS - Is DAX Volume: False.
   Target Volume: q:~\ File system: NTFS - Is DAX Volume: True.
   Source file size: 4.34 GB
Performing file copy... Success!
   Total execution time: 8 Sec.
   Copy Speed: 489.67 MB/Sec
Press any key to exit...
```

Process Monitor has captured a trace of the DAX copy operation that confirms the expected results:

![Figure](figures/Winternals7thPt2_page_757_figure_003.png)

From the trace above, you can see that on the target file (Q\Test.iso), only the

CreateFileMapping operation was intercepted: no WriteFile events are visible. While the copy

was proceeding, only paging I/O on the source file was detected by Process Monitor. These

paging I/Os were generated by the memory manager, which needed to read the data back from

the source volume as the application was generating page faults while accessing the memory mapped file.

---

To see the differences between memory-mapped I/O and standard cached I/O, you need to

copy again the file using a standard file copy operation. To see paging I/O on the source file data,

make sure to restart your system; otherwise, the original data remains in the cache:

```bash
P:\fstool.exe \copy p:\Big_image.iso q:\test.iso
NFS / ReFS Tool v0.1
Copyright (C) 2018 Andrea Allievi (Aal186)
Copying "Big_image.iso" to "test.iso" file... Success.
    Total File-Copy execution time: 13 Sec - Transfer Rate: 313.71 MB/s.
Press any key to exit...
```

If you compare the trace acquired by Process Monitor with the previous one, you can confirm that cached I/O is a one-copy operation. The cache manager still copies chunks of memory between the application-provided buffer and the system cache, which is mapped directly on the DAX disk. This is confirmed by the fact that again, no paging I/O is highlighted on the target file.

![Figure](figures/Winternals7thPt2_page_758_figure_003.png)

As a last experiment, you can try to start a DAX copy between two files that reside on the

same DAX-mode volume or that reside on two different DAX-mode volumes:

```bash
P:\fstuff /dacopy q:\test.iso q:\test_copy_2.iso
TFS /FsFS Tool v0.1
Copyright (C) 2018 Andrea Allievi (AAL186)
Starting DAX copy...
   Source file path: q:\test.iso.
   Target file path: q:\test_copy_2.iso.
   Source Volume: q: - File system: NTFS - Is DAX Volume: True.
   Target Volume: q: - File system: NTFS - Is DAX Volume: True.
Great! Both the source and the destination reside on a DAX volume.
Performing a full System Speed Copy!
```

CHAPTER 11   Caching and file systems     727


---

Source file size: 4.34 GB

Performing file copy... Success 2015-04-07 00:46:09 Copy Speed: 501.60 MB/Sec

Press any key to exit...

The trace collected in the last experiment demonstrates that memory-mapped I/O on DAX volumes doesn't generate any paging I/O. No WriteFile or ReadFile events are visible on either the source or the target file:

![Figure](figures/Winternals7thPt2_page_759_figure_004.png)

## Block volumes

Not all the limitations brought on by DAX volumes are acceptable in certain scenarios. Windows provides backward compatibility for PM hardware through block-mode volumes, which are managed by the entire legacy I/O stack as regular volumes used by rotating and SSD disk. Block volumes maintain existing storage semantics: all I/O operations traverse the storage stack on the way to the PM disk class driver. (There are no miniport drivers, though, because they're not needed.) They're fully compatible with all existing applications, legacy filters, and minifilter drivers.

Persistent memory storage is able to perform I/O at byte granularity. More accurately, I/O is performed at cache line granularity, which depends on the architecture but is usually 64 bytes. However, block mode volumes are exposed as standard volumes, which perform I/O at sector granularity (512 bytes or 4 Kbytes). If a write is in progress on a DAX volume, and suddenly the drive experiences a power failure, the block of data (sector) contains a mix of old and new data. Applications are not prepared to handle such a scenario. In block mode, the sector atomicity is guaranteed by the PM disk class driver, which implements the Block Translation Table (BTT) algorithm.

---

The BTT, an algorithm developed by Intel, splits available disk space into chunks of up to 512 GB, called arenas. For each arena, a simple indirection/lookup that uses an LBA to an internal block belonging to the arena. For each 32-bit entry in the map, the algorithm uses the two most significant bits (MSB) to store the status of the block (three states: valid, zeroed, and error). Although the table maintains the status of each LBA, the BTT algorithm provides sector parity by providing a flog area, which contains an array of nfree blocks.

An nfree block contains all the data that the algorithm needs to provide sector parity. There are 256 nfree entries in the array; an nfree entry in size, so the flog area occupies 8 KB. Each nfree is used by one CPU, so the number of nfree describes the number of concurrent atomic I/Os an arena can process concurrently. Figure 11-75 shows the layout of a DAX disk formatted in block mode. The data structures used for the BTT algorithm are not visible to the file system driver. The BTT algorithm eliminates possible subsector torn writes and, as described previously, is needed even on DAXformatted volumes in order to support file system metadata writes.

FIGURE 11-75 Layout of a DAX disk that supports sector parity (BTT algorithm).

Block mode volumes do not have the GPT_BASIC_DATA_ATTRIBUTE_DAX flag in their partition entry. NTFS behaves just like with normal volumes on the cache manager to perform cached I/O, and by processing non-cached I/O through the PM disk class driver. The Pmem driver exposes read and write functions, which performs a direct memory access (DMA) transfer by building a memory descriptor list (MDL) for both the user buffer and device physical block address (MDLs) describe in more detail in Chapter 5 of Part 1). The BTT algorithm provides sector parity. Figure 11-76 shows the I/O stack of a traditional volume, a DAX volume, and a block volume.

CHAPTER 11 Caching and file systems 729


---

![Figure](figures/Winternals7thPt2_page_761_figure_000.png)

FIGURE 11-76 Device I/O stack comparison between traditional volumes, block mode volumes, and DAX volumes.

## File system filter drivers and DAX

Legacy filter drivers and minfilters don't work with DAX volumes. These kinds of drivers usually augment file system functionality, often interacting with all the operations that a file system driver manages. There are different classes of filters providing new capabilities or modifying existing functionality of the file system driver: antivirus, encryption, replication, compression, Hierarchical Storage Management (HSM), and so on. The DAX driver model significantly modifies how DAX volumes interact with such components.

As previously discussed in this chapter, when a file is mapped in memory, the file system in DAX mode does not receive any read or write I/O requests, neither do all the filter drivers that reside above or below the file system driver. This means that filter drivers that rely on data interception will not work. To minimize possible compatibility issues, existing minifiers will not receive a notification (through the InstanceSetup callback) when a DAX volume is mounted. New and updated minifier drivers that still want to operate with DAX volumes need to specify the FLTLRegISTRATION_SUPPORT_DAX_VOLUME flag when they register with the filter manager through FltRegisterKernel API.

Minifiers that decide to support DAX volumes have the limitation that they can't intercept any

form of paging I/O. Data transformation filters (which provide encryption or compression) don't

have any chance of working correctly for memory-mapped files; antimalware filters are impacted as

730     CHAPTER 11   Caching and file systems


---

described earlier—because they must now perform scans on every open and close, losing the ability to determine whether or not a write truly happened. (The impact is mostly tied to the detection of a file last update time.) Legacy filters are no longer compatible if a driver calls the IoAttachDeviceToDevice Stack API (or similar functions), the I/O manager simply fails the request (and logs an ETW event).

## Flushing DAX mode I/Os

Traditional disks (HDD, SSD, NVme) always include a cache that improves their overall performance. When write I/Os are emitted from the storage driver, the actual data is first transferred into the cache, which will be written to the persistent medium later. The operating system provides correct flushing, which guarantees that data is written to final storage, and temporal order, which guarantees that data is written in the correct order. For normal cached I/O, an application can call the FlushFileBuffers API to ensure that the data is provably stored on the disk (this will generate an IRP with the IRP_MJ_FLUSHBUFFERS major function code that the NTFS driver will implement). Noncached I/O is directly written to disk by NTFS so ordering and flushing aren't concerns.

With DAX-mode volumes, this is not possible anymore. After the file is mapped in memory, the

NTFS driver has no knowledge of the data that is going to be written to disk. If an application is writing

some critical data structures on a DAX volume and the power fails, the application has no guarantees

that all of the data structures will have been correctly written in the underlying medium. Furthermore,

it has no guarantees that the order in which the data was written was the requested one. This is

because PM storage is implemented as classical physical memory from the CPU's point of view. The

processor uses the CPU caching mechanism, which uses its own caching mechanisms while reading or

writing to DAX volumes.

As a result, newer versions of Windows 10 had to introduce new flush APIs for DAX-mapped regions, which perform the necessary work to optimally flush PM content from the CPU cache. The APIs are available for both user-mode applications and kernel-mode drivers and are highly optimized based on the CPU architecture (standard x64 systems use the CLFLUSH and CLWB opcodes, for example). An application that wants I/O ordering and flushing on DAX volumes can call RtlGetNonVolatileToken on a PM mapped region; the function yields back a nonvolatile token that can be subsequently used with the RtlFlushNonVolatileMemory or RtlFlushNonVolatileMemoryRanges APIs. Both APIs perform the actual flush of the data from the CPU cache to the underlying PM device.

Memory copy operations executed using standard OS functions perform, by default, temporal copy operations, meaning that data always passes through the CPU cache, maintaining execution ordering. Nontemporal copy operations, on the other hand, use specialized processor opcodes (again depending on the CPU architecture; x64 CPUs use the MOVNTI opcode) to bypass the CPU cache. In this case, ordering is not maintained, but execution is faster. RtlWriteNonVolatileMemory exposes memory copy operations to and from nonvolatile memory. By default, the API performs classical temporal copy operations, but an application can request a nontemporal copy through the WRITE_NV_MEMORY_FLAG_ NON_TEMPERATURE flag and thus execute a faster copy operation.

CHAPTER 11   Caching and file systems     731


---

## Large and huge pages support

Reading or writing a file on a DAX-mode volume through memory-mapped sections is handled by the memory manager in a similar way to non-DAX sections: if the MEM_LARGE_PAGES flag is specified at map time, the memory manager detects that one or more file extents point to enough aligned, contiguous physical space (NTFS allocates the file extents), and uses large (2 MB) or huge (1 GB) pages to map the physical DAX space. (More details on the memory manager and large pages are available in Chapter 5 of Part 1.) Large and huge pages have various advantages compared to traditional 4-KB pages. In particular, they boost the performance on DAX files because they require fewer lookups in the processor's page table structures and require fewer entries in the processor's translation lookside buffer (TLB). For applications with a large memory footprint that randomly access memory, the CPU can spend a lot of time looking up TLB entries as well as reading and writing the page table hierarchy in case of TLB misses. In addition, using large/huge pages can also result in significant commit savings because only page directory parents and page directory (for large files only, not huge files) need to be charged. Page table space (4 KB per 2 MB of leaf VA space) charges are not needed or taken. So, for example, with a 2 TB file mapping, the system can save 4 GB of committed memory by using large and huge pages.

The NTFS driver cooperates with the memory manager to provide support for huge and large pages while mapping files that reside on DAX volumes:

- By default, each DAX partition is aligned on 2-MB boundaries.
NTFS supports 2-MB clusters. A DAX volume formatted with 2-MB clusters is guaranteed to use
only large pages for every file stored in the volume.
1-GB clusters are not supported by NTFS. If a file stored on a DAX volume is bigger than 1 GB,
and if there are one or more file's extents stored in enough contiguous physical space, the
memory manager will map the file using huge pages (huge pages use only two pages map
levels, while large pages use three levels).
As introduced in Chapter 5, for normal memory-backed sections, the memory manager uses large and huge pages only if the extent describing the PM pages is properly aligned on the DAX volume. (The alignment is relative to the volume's LCN and not to the file VCN.) For large pages, this means that the extent needs to start at a 2-MB boundary, whereas for huge pages it needs to start at 1-GB boundary. If a file on a DAX volume is not entirely aligned, the memory manager uses large or huge pages only on those blocks that are aligned, while it uses standard 4-KB pages for any other blocks.

In order to facilitate and increase the usage of large pages, the NTFS file system provides the FSCTLSET_DAX_ALLOC_ALIGNMENT Hint control code, which an application can use to set its preferred alignment on new file extents. The I/O control code accepts a value that specifies the preferred alignment, a starting offset (which allows specifying where the alignment requirements begin), and some flags. Usually an application sends the IOCTL to the file system driver after it has created a brand-new file but before mapping it. In this way, while allocating space for the file, NTFS grabs free clusters that fall within the bounds of the preferred alignment.

If the requested alignment is not available (due to volume high fragmentation, for example), the

IOCTL can specify the fallback behavior that the file system should apply: fail the request or revert to a

fallback alignment (which can be specified as an input parameter). The IOCTL can even be used on an

---

already-existing file for specifying alignment of new extents. An application can query the alignment of all the extents belonging to a file by using the FSCTL_QUERY_FILE_REGIONS control code or by using the fsutil dax queryfilealignment command-line tool.

## EXPERIMENT: Playing with DAX file alignment

You can witness the different kinds of DAX file alignment using the FSTool application available in this book's downloadable resources. For this experiment, you need to have a DAX volume present on your machine. Open a command prompt window and perform the copy of a big file (we suggest at least 4 GB) into the DAX volume using this tool. In the following example, two DAX disks are mounted as the P: and Q: volumes. The Big_Image.iso file is copied into the Q: DAX volume by using a standard copy operation, started by the FSTool application:

```bash
D:\fstool.exe /copy p:\Big_DVD_Image.iso q:\test.iso
NTFS / ReFS Tool v0.1
Copyright (C) 2018 Andrea Allievi (Aal86)
Copying "Big_DVD_Image.iso" to "test.iso" file... Success.
    Total File-Copy execution time: 10 Sec - Transfer Rate: 495.52 MB/s.
Press any key to exit...
```

You can check the new test.iso file's alignment by using the /queryalign command-line argument of the FsTool.exe application, or by using the queryFileAlignment argument with the built-in fsutil.exe tool available in Windows:

```bash
D:\>fsutil dax queryFileAlignment q:\test.iso
  File Region Alignment:
   Region     Alignment       StartOffset      LengthInBytes
   0        Other         0             0x1fd000
   1        Large          0x1fd000        0x3b800000
   2        Huge          0x3b9f0d00        0x0000000
   3        Large          0xfbb9d00        0x13e00000
   4        Other         0x10f7fd00        0x17e000
```

As you can read from the tool's output, the first chunk of the file has been stored in 4-KB aligned clusters. The offsets shown by the tool are not volume-relative offsets, or LCN, but file-relative offsets, or VCN. This is an important distinction because the alignment needed for large and huge pages mapping is relative to the volume's page offset. As the file keeps growing, some of its clusters will be allocated from a volume offset that is 2-MB or 1-GB aligned. In this way, those portions of the file can be mapped by the memory manager using large and huge pages. Now, as in the previous experiment, let's try to perform a DAX copy by specifying a target alignment hint:

```bash
P:\fstool.exe \daxcopy p:\Big_DVD_Image.iso q:\test.iso \align:1GB
NTFS / ReFS Tool v0.1
Copyright (C) 2018 Andrea Allievi (Aal186)
Starting DAX copy...
Source file path: p:\Big_DVD_Image.iso.
Target file path: q:\test.iso.
Source Volume: p: - File system: NTFS - Is DAX Volume: True.
```

CHAPTER 11   Caching and file systems      733


---

```bash
Target Volume: q:\ - File system: NTFS - Is DAX Volume: False.
    Source file size: 4.34 GB
    Target file alignment (IGB) correctly set.
  Performing file copy... Success!
    Total execution time: 6 Sec.
    Copy Speed: 618.81 MB/sec
  Press any key to exit...
  P:\>fsutil dax queryFileAlignment q:\test.iso
    File Region Alignment:
     Region           Alignment         StartOffset        LengthInBytes
     0             Huge              0               0x10000000
     1             Large              0x10000000      0xf800000
     2             Other              0x10f80000      0x17b000
```

In the latter case, the file was immediately allocated on the next 1-GB aligned cluster. The first 4-GB (0x100000000 bytes) of the file content are stored in contiguous space. When the memory manager maps that part of the file, it only needs to use four page director pointer table entries (PDPTs), instead of using 2048 page tables. This will save physical memory space and drastically improve the performance while the processor accesses the data located in the DAX section. To confirm that the copy has been really executed using large pages, you can attach a kernel debugger to the machine (even a local kernel debugger is enough) and use the /debug switch of the F4Tool application:

```bash
P:\fstool.exe \daxpc p:\Big_DVD_Image.iso q:\test.iso \align:1GB \debug
  NFS / ReFS Tool v0.1
  Copyright (C) 2018 Andrea Allievi (Aal186)
  Starting DAX copy...
     Source file path: p:\Big_DVD_Image.iso.
     Target file path: q:\test.iso.
     Source Volume: p:\ - File system: NTFS - Is DAX Volume: False.
     Target Volume: q:\ - File system: NTFS - Is DAX Volume: True.
     Source file size: 4.34 GB
     Target file alignment (1GB) correctly set.
  Performing file copy...
  [Debug] (PID: 10412) Source and Target file correctly mapped.
         Source file mapping address: 0x000001FC0000000 (DAX mode: 1).
         Target file mapping address: 0x000001FC0000000 (DAX mode: 1).
         File offset : 0x0 - Alignment: 1GB.
  Press enter to start the copy...
  [Debug] (PID: 10412) File chunk's copy successfully executed.
  Press enter go to the next chunk / flush the file...
```

734     CHAPTER 11   Caching and file systems


---

You can see the effective memory mapping using the debugger's !pte extension. First, you

need to move to the proper process context by using the .process command, and then you can

analyze the mapped virtual address shown by FSTool:

```bash
8: kd> !process 0n10412 0
Searching for Process with Cid == 28ac
PROCESS ffffdf28124121080
Sessionid: 2  Cid: 28ac    Feb: a29717c000  ParentCid: 31bc
     DirBase: 4cc491000  ObjectTable: ffff950f94060000  HandleCount: 49.
       Image: FsTool.exe
8: kd> .process /i ffffdf28124121080
You need to continue execution (press 'g' <enter>) for the context
to be switched. When the debugger breaks in again, you will be in
the new process context.
8: kd> g
Break instruction exception - code 80000003 (first chance)
ntIDbgBreakPointWithtStatus:
ffffffff04'3d7e8e50 cc           int    3
8: kd> !pte 0x000001F2C000000
_________________________________
PXE at FFFF8DC6E371018    PPE at FFFF8DC6E203E58    PDE at FFFF8DC407CB000
contains 0A0000057CA8867 contains 8A000152400008E7 contains 0000000000000000
pfn d57ca8e ---DA--UWEV pfn 15240000 --LDA--UW-V LARGE PAGE pfn 15240000
PTE at FFFF880F960000
contains 0000000000000000
LARGE PAGE pfn 15240000
```

The lpte debugger command confirmed that the first 1GB of space of the DAX file is mapped using huge pages. Indeed, neither the page directory nor the page table are present. The FsTool application can also be used to set the alignment of already existing files. The FSCTL_SET_DAX_ ALLOC_ALIGNMENT_HINT control code does not actually move any data though; it just provides a hint for the new allocated file extents, as the file continues to grow in the future:

```bash
D:\>fstudio e:\test.iso /align:2MB /offset:0
NTFS / ReFS Tool v0.1
Copyright (C) 2018 Andrea Allievi (AAL186)
Applying file alignment to "test.iso" (Offset 0x0)... Success.
Press any key to exit...
D:\>fsutil dax queryfileAlignment e:\test.iso
  File Region Alignment:
    Region        Alignment        StartOffset      LengthInBytes
    0            Huge          0             0x100000000
    1            Large          0x100000000     0xf800000
    2            Other         0x10f800000     0x17b000
```

CHAPTER 11   Caching and file systems      735


---

## Virtual PM disks and storages spaces support

Persistent memory was specifically designed for server systems and mission-critical applications, like huge SQL databases, which need a fast response time and process thousands of queries per second. Often, these kinds of servers run applications in virtual machines provided by HyperV. Windows Server 2019 supports a new kind of virtual hard disk: virtual PM disks. Virtual PMs are backed by a VHDPMEM file, which, at the time of this writing, can only be created (or converted from a regular VHD file) by using Windows PowerShell. Virtual PM disks directly map chunks of space located on a real DAX disk installed in the host, via a VHDPMEM file, which must reside on that DAX volume.

When attached to a virtual machine, HyperV exposes a virtual PM device (VPMEM) to the guest. This virtual PM device is described by the NVDIMM Firmware interface table (NFIT) located in the virtual UEFI BIOS. (More details about the NVFIT table are available in the ACPI 6.2 specification.) The SCM Bus driver reads the table and creates the regular device objects representing the virtual NVDIMM device and the PM disk. The Pmem disk class driver manages the virtual PM disks in the same way as normal PM disks, and creates virtual volumes on the top of them. Details about the Windows Hypervisor and its components can be found in Chapter 9. Figure 11-77 shows the PM stack for a virtual machine that uses a virtual PM device. The dark gray components are parts of the virtualized stack, whereas light gray components are the same in both the guest and the host partition.

![Figure](figures/Winternals7thPt2_page_767_figure_003.png)

FIGURE 11-77 The virtual PM architecture.

A virtual PM device exposes a contiguous address space, virtualized from the host (this means that the host VHDPMEM files don't need to be contiguous). It supports both DAX and block mode, which, as in the host case, must be decided at volume-format time, and supports large and huge pages, which are leveraged in the same way as on the host system. Only generation 2 virtual machines support virtual PM devices and the mapping of VHDPMEM files.

Storage Spaces Direct in Windows Server 2019 also supports DAX disks in its virtual storage pools. One or more DAX disks can be part of an aggregated array of mixed-type disks. The PM disks in the array can be configured to provide the capacity or performance tier of a bigger tiered virtual disk or can be configured to act as a high-performance cache. More details on Storage Spaces are available later in this chapter.

736 CHAPTER 11 Caching and file systems


---

## EXPERIMENT: Create and mount a VHDPMEM image

As discussed in the previous paragraph, virtual PM disks can be created, converted, and assigned to a HyperV virtual machine using PowerShell. In this experiment, you need a DAX disk and a generation 2 virtual machine with Windows 10 October Update (RS3, or later releases) installed (describing how to create a VM is outside the scope of this experiment). Open an administrative Windows PowerShell prompt, move to your DAX-mode disk, and create the virtual PM disk (in the example, the DAX disk is located in the Q: drive):

```bash
PS Q:\> New-VHD VmPmemDis.vhdpmem -Fixed -SizeBytes 256GB -PhysicalSectorSizeBytes 4096
ComputerName
: 37-4611k2635
Path
: Q:\VmPmemDis.vhdpmem
VhdFormat
: VHDX
VhdType
: Fixed
FileSize
: 274882101248
Size
: 274877906944
MinimumSize
:
LogicalSectorSize
: 4096
PhysicalSectorSize
: 4096
BlockSize
: 0
ParentPath
:
Identifier
: 3AA0017F-03AF-4948-80BE-B4084AA6BE24
FragmentationPercentage : 0
Alignment
: 1
Attached
: False
DiskNumber
:
IsPMENCompatible
: True
AddressAbstractionType : None
Number
:
```

Virtual PM disks can be of fixed size only, meaning that all the space is allocated for the virtual disk—this is by design. The second step requires you to create the virtual PM controller and attach it to your virtual machine. Make sure that your VM is switched off, and type the following command. You should replace "TestPmVm" with the name of your virtual machine:

```bash
PS Q:\> Add-VMPmemController -VMName "TestPmVm"
```

Finally, you need to attach the created virtual PM disk to the virtual machine's PM controller:

```bash
PS Q:\> Add-VMHardDiskDrive "TestVm" PMEM -ControllerLocation 1 -Path 'Q:\VmPmemDis.vhdlpmem'
```

You can verify the result of the operation by using the Get-VMPmemController command:

```bash
PS Q:\> Get-VRPMemController -VMName "TestVm"
VMName                ControllerNumber Drives
--------------------------
TestPMN       0             {Persistent Memory Device on PMEM controller number 0 at location 1}
```

If you switch on your virtual machine, you will find that Windows detects a new virtual disk. In the virtual machine, open the Disk Management MMC snap-in Tool (diskmgmt.msc) and initialize the disk using GPT partitioning. Then create a simple volume, assign a drive letter to it, but don’t format it.

CHAPTER 11   Caching and file systems     737


---

![Figure](figures/Winternals7thPt2_page_769_figure_000.png)

You need to format the virtual PM disk in DAX mode. Open an administrative command

prompt window in the virtual machine. Assuming that your virtual-pm disk drive letter is E, you

need to use the following command:

```bash
C:\>format e: /DAX /fs:\TNTFS /q
The type of the file system is RAW.
The new file system is NTFS.
WARNING, ALL DATA ON NON-REMOVABLE DISK
DRIVE E: WILL BE LOST!
Proceed with Format (Y/N)? y
QuickFormatting 256.0 GB.
Volume label {32 characters, ENTER for none}? DAX-In-Vm
Creating file system structures.
Format complete.
    256.0 GB total disk space.
    255.9 GB are available.
```

738     CHAPTER 11   Caching and file systems


---

You can then confirm that the virtual disk has been formatted in DAX mode by using the fsutil.exe built-in tool, specifying the fsinfo volumeinfo command-line arguments:

```bash
C:\fsutf\fsinfo volumeinfo C:
Volume Name : DAX-In-Vm
Volume Serial Number : Oxalibdc32
Max Component Length : 255
File System Name : NTFS
Is ReadWrite
Not Thinly-Providioned
Supports Case-sensitive filenames
Preserves Case of filenames
Supports Unicode in filenames
Preserves & Enforces ACL's
Supports Disk Quotas
Supports Reparse Points
Returns Handle Close Result Information
Supports POSIX-style Unix and Rename
Supports Object Identifiers
Supports Named Streams
Supports Hard Links
Supports Extended Attributes
Supports Open By FileID
Supports USN Journal
Is DAX Volume
```

## Resilient File System (ReFS)

The release of Windows Server 2012 R2 saw the introduction of a new advanced file system, the Resilient File System (also known as ReFS). This file system is part of a new storage architecture, called Storage Spaces, which, among other features, allows the creation of a tiered virtual volume composed of a solid-state drive and a classical rotational disk. (An introduction of Storage Spaces, and Tiered Storage, is presented later in this chapter). ReFS is a "write-to-new" file system, which means that file system metadata is never updated in place; updated metadata is written in a new place, and the old one is marked as deleted. This property is important and is one of the features that provides data integrity. The original goals of ReFS were the following:

- 1. Self-healing, online volume check and repair (providing close to zero unavailability due to file
system corruption) and write-through support. (Write-through is discussed later in this section.)

2. Data integrity for all user data (hardware and software).

3. Efficient and fast file snapshots (block cloning).

4. Support for extremely large volumes (exabyte sizes) and files.

5. Automatic tiering of data and metadata, support for SMR (shingled magnetic recording) and
future solid-state disks.
CHAPTER 11   Caching and file systems     739


---

There have been different versions of ReFS. The one described in this book is referred to as ReFS v2, which was first implemented in Windows Server 2016. Figure 11-78 shows an overview of the different high-level implementations between NTFS and ReFS, instead of completely rewriting the NTFS file system. ReFS uses another approach by dividing the implementation of NTFS into two parts: one part understands the on-disk format, and the other does not.

![Figure](figures/Winternals7thPt2_page_771_figure_001.png)

FIGURE 11-78 ReFS high-level implementation compared to NTFS.

ReFS replaces the on-disk storage engine with Minstore. Minstore is a recoverable object store library that provides a key-value table interface to its callers, implements allocate-on-write semantics for modification to those tables, and integrates with the Windows cache manager. Essentially, Minstore is a library that implements the core of a modern, scalable copy-on-write file system. Minstore is leveraged by ReFS to implement files, directories, and so on. Understanding the basics of Minstore is needed to describe ReFS, so let's start with a description of Minstore.

## Minstore architecture

Everything in Minstore is a table. A table is composed of multiple rows, which are made of a key-value pair. Minstore tables, when stored on disk, are represented using B+ trees. When kept in volatile memory (RAM), they are represented using hash tables. B+ trees, also known as balanced trees, have different important properties:

- 1. They usually have a large number of children per node.

2. They store data pointers (a pointer to the disk file block that contains the key value) only on the

leaves—not on internal nodes.

3. Every path from the root node to a leaf node is of the same length.
---

Other file systems (like NTFS) generally use B-trees (another data structure that generalizes a binary search-tree, not to be confused with the term "binary tree") to store the data pointer, along with the key, in each node of the tree. This technique greatly reduces the number of entries that can be packed into a node of a B-tree, thereby contributing to the increase in the number of levels in the B-tree, hence increasing the search time of a record.

Figure 11-79 shows an example of B+ tree. In the tree shown in the figure, the root and the internal node contain only keys, which are used for properly accessing the data located in the leaf's nodes. Leaf nodes are all at the same level and are generally linked together. As a consequence, there is no need to emit lots of I/O operations for finding an element in the tree.

For example, let's assume that Minstore needs to access the node with the key 20. The root node contains one key used as an index. Keys with a value above or equal to 13 are stored in one of the children indexed by the right pointer; meanwhile, keys with a value less than 13 are stored in one of the left children. When Minstore has reached the leaf, which contains the actual data, it can easily access the data also for node with keys 16 and 25 without performing any full tree scan.

Furthermore, the leaf nodes are usually linked together using linked lists. This means that for huge

trees, Minstore can, for example, query all the files in a folder by accessing the root and the intermedi ate nodes only once—assuming that in the figure all the files are represented by the values stored in

the leaves. As mentioned above, Minstore generally uses a B+ tree for representing different objects

than files or directories.

![Figure](figures/Winternals7thPt2_page_772_figure_004.png)

FIGURE 11-79 A sample B+ tree. Only the leaf nodes contain data pointers. Director nodes contain only links to children nodes.

In this book, we use the term B+ tree and B+ table for expressing the same concept. Minstore defines different kind of tables. A table can be created, it can have rows added to it, deleted from it, or updated inside of it. An external entity can enumerate the table or find a single row. The Minstore core is represented by the object table. The object table is an index of the location of every root (nonembedded) B+ trees in the volume. B+ trees can be embedded within other trees; a child tree's root is stored within the row of a parent tree.

Each table in Minstore is defined by a composite and a schema. A composite is just a set of rules that describe the behavior of the root node (sometimes even the children) and how to find and manipulate each node of the B+ table. Minstore supports two kinds of root nodes, managed by their respective composites:

CHAPTER 11   Caching and file systems      741


---

- ■ Copy on Write (CoW): This kind of root node moves its location when the tree is modified. This

means that in case of modification, a brand-new B+ tree is written while the old one is marked

for deletion. In order to deal with these nodes, the corresponding composite needs to maintain

an object ID that will be used when the table is written.

■ Embedded: This kind of root node is stored in the data portion (the value of a leaf node) of an

index entry of another B+ tree. The embedded composite maintains a reference to the index

entry that stores the embedded root node.
Specifying a schema when the table is created tells Minstore what type of key is being used, how big the root and the leaf nodes of the table should be, and how the rows in the table are laid out. ReFS uses different schemas for files and directories. Directories are B+ table objects referenced by the object table, which can contain three different kinds of rows (files, links, and file IDs). In ReFS, the key of each row represents the name of the file, link, or file ID. Files are tables that contain attributes in their rows (attribute code and value pairs).

Every operation that can be performed on a table (close, modify, write to disk, or delete) is represented by a Minstore transaction. A Minstore transaction is similar to a database transaction: a unit of work, sometimes made up of multiple operations, that can succeed or fail only in an atomic way. The way in which tables are written to the disk is through a process known as updating the tree. When a tree update is requested, transactions are drained from the tree, and no transactions are allowed to start until the update is finished.

One important concept used in RefS is the embedded table: a B+ tree that has the root node located in a row of another B+ tree. RefS uses embedded tables extensively. For example, every file is a B+ tree whose roots are embedded in the row of directories. Embedded tables also support a move operation that changes the parent table. The size of the root node is fixed and is taken from the table's schema.

## B+ tree physical layout

In Minstore, a B+ tree is made of buckets. Buckets are the Minstore equivalent of the general B+ tree nodes. Leaf buckets contain the data that the tree is storing; intermediate buckets are called director nodes and are used only for direct lookups to the next level in the tree. (In Figure 11-79, each node is a bucket.) Because director nodes are used only for directing traffic to child buckets, they need not have exact copies of a key in a child bucket but can instead pick a value between two buckets and use that. (In ReFS, usually the key is a compressed file name.) The data of an intermediate bucket instead contains both the logical cluster number (LCN) and a checksum of the bucket that it's pointing to. (The checksum allows ReFS to implement self-healing features.) The intermediate nodes of a Minstore table could be considered as a Merkle tree, in which every leaf node is labelled with the hash of a data block, and every nonleaf node is labelled with the cryptographic hash of the labels of its child nodes.

Every bucket is composed of an index header that describes the bucket, and a footer, which is an array of offsets pointing to the index entries in the correct order. Between the header and the footer there are the index entries. An index entry represents a row in the B+ table; a row is a simple data structure that gives the location and size of both the key and data (which both reside in the same bucket). Figure 11-80 shows an example of a leaf bucket containing three rows, indexed by the offsets located in the footer. In leaf pages, each row contains the key and the actual data (or the root node of another embedded tree).

742      CHAPTER 11   Caching and file systems


---

![Figure](figures/Winternals7thPt2_page_774_figure_000.png)

FIGURE 11-80 A leaf bucket with three index entries that are ordered by the array of offsets in the footer.

## Allocators

When the file system asks Minstore to allocate a bucket (the B+ table requests a bucket with a process called pinning the bucket), the latter needs a way to keep track of the free space of the underlaying medium. The first version of Minstore used a hierarchical allocator, which meant that there were multiple allocator objects, each of which allocated space out of its parent allocator. When the root allocator mapped the entire space of the volume, each allocator became a B+ tree that used the lcn-count table schema. This schema describes the row's key as a range of LCN that the allocator has taken from its parent node, and the row's value as an allocator region. In the original implementation, an allocator region described the state of each chunk in the region in relation to its children nodes: free or allocated and the owner ID of the object that owns it.

Figure 11-81 shows a simplified version of the original implementation of the hierarchical allocator.

In the picture, a large allocator has only one allocation unit set: the space represented by the bit has

been allocated for the medium allocator, which is currently empty. In this case, the medium allocator

is a child of the large allocator.

![Figure](figures/Winternals7thPt2_page_774_figure_005.png)

FIGURE 11-81 The old hierarchical allocator.

B+ tables deeply rely on allocators to get new buckets and to find space for the copy-on-write copies of existing buckets (implementing the write-to-new strategy). The latest Minstore version replaced the hierarchical allocator with a policy-driven allocator, with the goal of supporting a central location in the file system that would be able to support tiering. A tier is a type of the storage device—for

CHAPTER 11   Caching and file systems      743


---

example, an SSD, NVMe, or classical rotational disk. Tiering is discussed later in this chapter. It is basically the ability to support a disk composed of a fast random-access zone, which is usually smaller than the slow sequential-only area.

The new policy-driven allocator is an optimized version (supporting a very large number of allocations

per second) that defines different allocation areas based on the requested tier (the type of underlying

storage device). When the file system requests space for new data, the central allocator decides which

area to allocate from by a policy-driven engine. This policy engine is tiering-aware (this means that

metadata is always written to the performance tiers and never to SMR capacity tiers, due to the random write nature of the metadata), supports ReFS bands, and implements deferred allocation logic (DAL). The

deferred allocation logic relies on the fact that when the file system creates a file, it usually also allocates

the needed space for the file content. Minstore, instead of returning to the underlying file system an

LCN range, returns a token containing the space reservation that provides a guarantee against the disk

becoming full. When the file is ultimately written, the allocator assigns LCNs for the file's content and

updates the metadata. This solves problems with SMR disks (which are covered later in this chapter) and

allows ReFS to be able to create even huge files (64 TB or more) in less than a second.

The policy-driven allocator is composed of three central allocators, implemented on-disk as global B+ tables. When they're loaded in memory, the allocators are represented using AVL trees, though. An AVL tree is another kind of self-balancing binary tree that's not covered in this book. Although each row in the B+ table is still indexed by a range, the data part of the row could contain a bitmap or, as an optimization, only the number of allocated clusters (in case the allocated space is contiguous). The three allocators are used for different purposes:

- ■ The Medium Allocator (MAA) is the allocator for each file in the namespace, except for some B+
tables allocated from the other allocators. The Medium Allocator is a B+ table itself, so it needs
to find space for its metadata updates (which still follow the write-to-new strategy). This is the
role of the Small Allocator (SAA).
■ The Small Allocator (SAA) allocates space for itself, for the Medium Allocator, and for two
tables: the Integrity State table (which allows ReFS to support Integrity Streams) and the Block
Reference Counter table (which allows ReFS to support a file's block cloning).
■ The Container Allocator (CAA) is used when allocating space for the container table, a funda-
mental table that provides cluster virtualization to ReFS and is also deeply used for container
compaction. (See the following sections for more details.) Furthermore, the Container Allocator
contains one or more entries for describing the space used by itself.
When the Format tool initially creates the basic data structures for ReFS, it creates the three allocators. The Medium Allocator initially describes all the volume's clusters. Space for the SAA and CAA metadata (which are B+ tables) is allocated from the MAA (this is the only time that ever happens in the volume lifetime). An entry for describing the space used by the Medium Allocator is inserted in the SAA. Once the allocators are created, additional entries for the SAA and CAA are no longer allocated from the Medium Allocator (except in case ReFS finds corruption in the allocators themselves).

---

To perform a write-to-new operation for a file, ReFS must first consult the MAA allocator to find space for the write to go to. In a tiered configuration, it does so with awareness of the tiers. Upon successful completion, it updates the file's stream extent table to reflect the new location of that extent and updates the files metadata. The new B+ tree is then written to the disk in the free space block, and the old table is converted as free space. If the write is tagged as a write-through, meaning that the write must be discoverable after a crash, ReFS writes a log record for recording the write-to-new operation. (See the "ReFS write-through" section later in this chapter for further details).

## Page table

When Minstore updates a bucket in the B+ tree (maybe because it needs to move a child node or even add a row in the table), it generally needs to update the parent (or director) nodes. (More precisely, Minstore uses different links that point to a new and an old child bucket for every node.) This is because, as we have described earlier, every director node contains the checksum of its leaves. Furthermore, the leaf node could have been moved or could even have been deleted. This leads to synchronization problems; for example, imagine a thread that is reading the B+ tree while a row is being deleted. Locking the tree and writing every modification on the physical medium would be prohibitively expensive. Minstore needs a convenient and fast way to keep track of the information about the tree. The Minstore Page Table (unrelated to the CPU's page table), is an in-memory hash table private to each Minstore's root table— usually the directory and file table—which keeps track of which bucket is dirty, freed, or deleted. This table will never be stored on the disk. In Minstore, the terms bucket and page are used interchangeably: a page usually resides in memory, whereas a bucket is stored on disk, but they express exactly the same high-level concept. Trees and tables also are used interchangeably, which explains why the page table is called as it is. The rows of a page table are composed of the LCN of the target bucket, as a Key, and a data structure that keeps track of the page states and assists the synchronization of the B+ tree as a value.

When a page is first read or created, a new entry will be inserted into the hash table that represents

the page table. An entry into the page table can be deleted only if all the following conditions are met:

- There are no active transactions accessing the page.

The page is clean and has no modifications.

The page is not a copy-on-write new page of a previous one.
Thanks to these rules, clean pages usually come into the page table and are deleted from it repeatedly, whereas a page that is dirty would stay in the page table until the B+ tree is updated and finally written to disk. The process of writing the tree to stable media depends heavily upon the state in the page table at any given time. As you can see from Figure 11-82, the page table is used by Minstore as an in-memory cache, producing an implicit state machine that describes each state of a page.

---

![Figure](figures/Winternals7thPt2_page_777_figure_000.png)

FIGURE 11-82 The diagram shows the states of a dirty page (bucket) in the page table. A new page is produced due to copy-on-write of an old page or if the B+ tree is growing and needs more space for storing the bucket.

## Minstore I/O

In Mystore, reads and writes to the B+ tree in the final physical medium are performed in a different way: tree reads usually happen in portions, meaning that the read operation might only include some leaf buckets, for example, and occurs as part of transactional access or as a preemptive prefetch action. After a bucket is read into the cache (see the "Cache manager" section earlier in this chapter), Mystore still can't interpret its data because the bucket checksum needs to be verified. The expected checksum is stored in the parent node; when the ReFS driver (which resides above Mystore) intercepts the read data, it knows that the node still needs to be validated: the parent node is already in the cache (the tree has been already navigated for reaching the child) and contains the checksum of the child. Mystore has all the needed information for verifying that the bucket contains valid data. Note that there could be pages in the page table that have been never accessed. This is because their checksum still needs to be validated.

Minstore performs tree updates by writing the entire B+ tree as a single transaction. The tree update process writes dirty pages of the B+ tree to the physical disk. There are multiple reasons behind a tree update—an application explicitly flushing its changes, the system running in low memory or similar conditions, the cache manager flushing cached data to disk, and so on. It's worth mentioning that Minstore usually writes the new updated trees lazily with the lazy writer thread. As seen in the previous section, there are several triggers to kick in the lazy writer (for example, when the number of the dirty pages reaches a certain threshold).

Minstore is unaware of the actual reason behind the tree update request. The first thing that Minstore does is make sure that no other transactions are modifying the tree (using complex synchronization primitives). After initial synchronization, it starts to write dirty pages and with old deleted pages. In a

746     CHAPTER 11   Caching and file systems


---

write-to-new implementation, a new page represents a bucket that has been modified and its content

replaced; a freed page is an old page that needs to be unlinked from the parent. If a transaction wants to

modify a leaf node, it copies (in memory) the root bucket and the leaf page; Minstore then creates the

corresponding page table entries in the page table without modifying any link.

The tree update algorithm enumerates each page in the page table. However, the page table has no concept of which level in the B+ tree the page resides, so the algorithm checks even the B+ tree by starting from the more external node (usually the leaf), up to the root nodes. For each page, the algorithm performs the following steps:

- 1. Checks the state of the page. If it's a freed page, it skips the page. If it's a dirty page, it updates
its parent pointer and checksum and puts the page in an internal list of pages to write.

2. Discards the old page.
When the algorithm reaches the root node, it updates its parent pointer and checksum directly in

the object table and finally puts also the root bucket in the list of pages to write. Minstore is now able to

write the new tree in the free space of the underlying volume, preserving the old tree in its original loca tion. The old tree is only marked as freed but is still present in the physical medium. This is an important

characteristic that summarizes the write-to-new strategy and allows the ReFS file system (which resides

above Minstore) to support advanced online recovery features. Figure 11-83 shows an example of the tree

update process for a B+ table that contains two new leaf pages (A and B). In the figure, pages located in

the page table are represented in a lighter shade, whereas the old pages are shown in a darker shade.

![Figure](figures/Winternals7thPt2_page_778_figure_004.png)

FIGURE 11-83 Minstore tree update process.

CHAPTER 11   Caching and file systems      747


---

Maintaining exclusive access to the tree while performing the tree update can represent a performance issue; no one else can read or write from a B+ tree that has been exclusively locked. In the latest versions of Windows 10, B+ trees in Minstore became generational—a generation number is attached to each B+ tree. This means that a page in the tree can be dirty with regard to a specific generation. If a page is originally dirty for only a specific tree generation, it can be directly updated, with no need to copy-on-write because the final tree has still not been written to disk.

In the new model, the tree update process is usually split in two phases:

- ■ Failable phase: Minstore acquires the exclusive lock on the tree, increments the tree's genera-
tion number, calculates and allocates the needed memory for the tree update, and finally drops
the lock to shared.
■ Nonfailable phase: This phase is executed with a shared lock (meaning that other I/O can read
from the tree). Minstore updates the links of the director nodes and all the tree's checksums,
and finally writes the final tree to the underlying disk. If another transaction wants to modify the
tree while it's being written to disk, it detects that the tree's generation number is higher, so it
copy-on-writes the tree again.
With the new schema, Minstore holds the exclusive lock only in the faivable phase. This means that

tree updates can run in parallel with other Minstore transactions, significantly improving the overall

performance.

