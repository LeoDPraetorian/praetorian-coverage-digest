## ReFS architecture

As already introduced in previous paragraphs, RefS (the Resilient file system) is a hybrid of the NTFS implementation and Minstore, where every file and directory is a B+ tree configured by a particular schema. The file system volume is a flat namespace of directories. As discussed previously, NTFS is composed of different components:

- ■ Core FS support: Describes the interface between the file system and other system compo-
nents, like the cache manager and the I/O subsystem, and exposes the concept of file create,
open, read, write, close, and so on.
■ High-level FS feature support: Describes the high-level features of a modern file system,
like file compression, file links, quota tracking, reparse points, file encryption, recovery support,
and so on.
■ On-disk dependent components and data structures MFT and file records, clusters, index
package, resident and nonresident attributes, and so on (see the “The NT file system (NTFS)”
section earlier in this chapter for more details).
ReFS keeps the first two parts largely unchanged and replaces the rest of the on-disk dependent components with Minstore, as shown in Figure 11-84.

---

![Figure](figures/Winternals7thPt2_page_780_figure_000.png)

FIGURE 11-84 ReFS architecture's scheme.

In the "NTFS driver" section of this chapter, we introduced the entities that link a file handle to the file system's on-disk structure. In the ReFS file system driver, those data structures (the stream control block, which represents the NTFS attribute that the caller is trying to read, and the file control block, which contains a pointer to the file record in the disk's MFT) are still valid, but have a slightly different meaning in respect to their underlying durable storage. The changes made to these objects go through Minstore instead of being directly translated in changes to the on-disk MFT. As shown in Figure 11-85, in ReFS:

- ■ A file control block (FCB) represents a single file or directory and, as such, contains a pointer to
the Minstore B+ tree, a reference to the parent directory's stream control block and key (the
directory name). The FCB is pointed to by the file object, through the FsContext2 field.
■ A stream control block (SCB) represents an opened stream of the file object. The data struc-
ture used in ReFS is a simplified version of the NTFS one. When the SCB represents directories,
though, the SCB has a link to the directory's index, which is located in the B+ tree that repre-
sents the directory. The SCB is pointed to by the file object, through the FsContext field.
■ A volume control block (VCB) represents a currently mounted volume, formatted by ReFS.
When a properly formatted volume has been identified by the ReFS driver, a VCB data structure
is created, attached into the volume device object extension, and linked into a list located in a
global data structure that the ReFS file system driver allocates at its initialization time. The VCB
contains a table of all the directory FCBs that the volume has currently opened, indexed by their
reference ID.
CHAPTER 11   Caching and file systems      749


---

![Figure](figures/Winternals7thPt2_page_781_figure_000.png)

FIGURE 11-85 ReFS files and directories in-memory data structures.

In RefS, every open file has a single FCB in memory that can be pointed to by different SCBs (depending on the number of streams opened). Unlike NTFS, where the FCB needs only to know the MFT entry of the file to correctly change an attribute, the FCB in RefS needs to point to the B+ tree that represents the file record. Each row in the file's B+ tree represents an attribute of the file, like the ID, full name, extents table, and so on. The key of each row is the attribute code (an integer value).

File records are entries in the directory in which files reside. The root node of the B+ tree that represents a file is embedded into the directory entry's value data and never appears in the object table. The file data streams, which are represented by the extents table, are embedded B+ trees in the file record. The extents table is indexed by range. This means that every row in the extent table has a VCN range used as the row's key, and the LCN of the file's extent used as the row's value. In ReFS, the extents table could become very large (it is indeed a regular B+ tree). This allows ReFS to support huge files, bypassing the limitations of NTFS.

Figure 11-86 shows the object table, files, directories, and the file extent table, which in ReFS are all represented through B+ trees and provide the file system namespace.

![Figure](figures/Winternals7thPt2_page_781_figure_005.png)

FIGURE 11-86 Files and directories in RefS.

750     CHAPTER 11   Caching and file systems


---

Directories are Minstore B+ trees that are responsible for the single, flat namespace. A RefS directory can contain:

- ■ Files

■ Links to directories

■ Links to other files (file IDs)
Rows in the directory B+ tree are composed of a <key, <type, value> pair, where the key is the entry's name and the value depends on the type of directory entry. With the goal of supporting queries and other high-level semantics, Minstore also stores some internal data in invisible directory rows. These kinds of rows have have their key starting with a Unicode zero character. Another row that is worth mentioning is the directory's file row. Every directory has a record, and in RefS that file record is stored as a file row in the self-same directory, using a well-known zero key. This has some effect on the in-memory data structures that RefS maintains for directories. In NTFS, a directory is really a property of a file record (through the Index Root and Index Allocation attributes); in RefS, a directory is a file record stored in the directory itself (called directory index record). Therefore, whenever RefS manipulates or inspects files in a directory, it must ensure that the directory index is open and resident in memory. To be able to update the directory, RefS stores a pointer to the directory's index record in the opened stream control block.

The described configuration of the ReFS B+ tree does not solve an important problem. Every time the system wants to enumerate the files in a directory, it needs to open and parse the B+ tree of each file. This means that a lot of I/O requests to different locations in the underlying medium are needed. If the medium is a rotational disk, the performance would be rather bad.

To solve the issue, ReFS stores a STANDARD_INFORMATION data structure in the root node of the file's embedded table (instead of storing it in a row of the child file's B+ table). The STANDARD _INFORMATION data includes all the information needed for the enumeration of a file (like the file's access time, size, attributes, security descriptor ID, the update sequence number, and so on). A file's embedded root node is stored in a leaf bucket of the parent directory's B+ tree. By having the data structure located in the file's embedded root node, when the system enumerates files in a directory, it only needs to parse entries in the directory B+ tree without accessing any B+ tables describing individual files. The B+ tree that represents the directory is already in the page table, so the enumeration is quite fast.

## ReFS on-disk structure

This section describes the on-disk structure of a ReFS volume, similar to the previous NTFS section. The section focuses on the differences between NTFS and ReFS and will not cover the concepts already described in the previous section.

The Boot sector of a ReFS volume consists of a small data structure that, similar to NTFS, contains basic volume information (serial number, cluster size, and so on), the file system identifier (the ReFS OEM string and version), and the ReFS container size (more details are covered in the “Shingled magnetic recording (SMR) volumes” section later in the chapter). The most important data structure in the volume is the volume super block. It contains the offset of the latest volume checkpoint records and

CHAPTER 11   Caching and file systems     751


---

is replicated in three different clusters. ReFS, to be able to mount a volume, reads one of the volume

checkpoints, verifies and parses it (the checkpoint record includes a checksum), and finally gets the

offset of each global table.

The volume mounting process opens the object table and gets the needed information for reading

the root directory, which contains all of the directory trees that compose the volume namespace. The

object table, together with the container table, is indeed one of the most critical data structures that is

the starting point for all volume metadata. The container table exposes the virtualization namespace,

so without it, ReFS would not able to correctly identify the final location of any cluster. Minstore op tionally allows clients to store information within its object table rows. The object table row values, as

shown in Figure 11-87, have two distinct parts: a portion owned by Minstore and a portion owned by

ReFS. ReFS stores parent information as well as a high watermark for USN numbers within a directory

(see the section "Security and change journal" later in this chapter for more details).

![Figure](figures/Winternals7thPt2_page_783_figure_002.png)

FIGURE 11-87 The object table entry composed of a ReFS part (bottom rectangle) and Minstore part (top rectangle).

## Object IDs

Another problem that ReFS needs to solve regards file IDs. For various reasons—primarily for tracking and storing metadata about files in an efficient way without tying information to the namespace— ReFS needs to support applications that open a file through their file ID (using the OpenFileById API, for example). NTFS accomplishes this through the $Extend$\ObjectId file (using the $O index root attribute; see the previous NTFS section for more details). In ReFS, assigning an ID to every directory is trivial; indeed, Minstore stores the object ID of a directory in the object table. The problem arises when the system needs to be able to assign an ID to a file; ReFS doesn’t have a central file ID repository like NTFS does. To properly find a file ID located in a directory tree, ReFS splits the file ID space into two portions: the directory and the file. The directory ID consumes the directory portion and is indexed into the key of an object table’s row. The file portion is assigned out of the directory’s internal file ID space. An ID that represents a directory usually has a zero in its file portion, but all files inside the directory share the same directory portion. ReFS supports the concept of file IDs by adding a separate row (composed of a <FileId, FileName> pair) in the directory’s B+ tree, which maps the file ID to the file name within the directory.

---

When the system is required to open a file located in a ReFS volume using its file ID, ReFS satisfies the request by:

- 1. Opening the directory specified by the directory portion

2. Querying the Field row in the directory B+ tree that has the key corresponding to the

file portion

3. Querying the directory B+ tree for the file name found in the last lookup.
Careful readers may have noted that the algorithm does not explain what happens when a file is renamed or moved. The ID of a renamed file should be the same as its previous location, even if the ID of the new directory is different in the directory portion of the file ID. ReFS solves the problem by replacing the original file ID entry, located in the old directory B+ tree, with a new "tombstone" entry, which, instead of specifying the target file name in its value, contains the new assigned ID of the renamed file (with both the directory and the file portion changed). Another new File ID entry is also allocated in the new directory B+ tree, which allows assigning the new local file ID to the renamed file. If the file is then moved to yet another directory, the second directory has its ID entry deleted because it's no longer needed; one tombstone, at most, is present for any given file.

## Security and change journal

The mechanics of supporting Windows object security in the file system lie mostly in the higher components that are implemented by the portions of the file system remained unchanged since NTFS. The underlying on-disk implementation has been changed to support the same set of semantics. In RefS, object security descriptors are stored in the volume's global security directory B+ table. A hash is computed for every security descriptor in the table (using a proprietary algorithm, which operates only on self-relative security descriptors), and an ID is assigned to each.

When the system attaches a new security descriptor to a file, the ReFS driver calculates the security descriptor's hash and checks whether it's already present in the global security table. If the hash is present in the table, ReFS resolves its ID and stores it in the STANDARD_INFORMATION data structure located in the embedded root node of the file's B+ tree. In case the hash does not already exist in the global security table, ReFS executes a similar procedure but first adds the new security descriptor in the global B+ tree and generates its new ID.

The rows of the global security table are of the format <hash, ID>, <security descriptor, ref. count>,

where the hash and the ID are as described earlier, the security descriptor is the raw byte payload of

the security descriptor itself, and ref. count is a rough estimate of how many objects on the volume are

using the security descriptor.

As described in the previous section, NTFS implements a change journal feature, which provides applications and services with the ability to query past changes to files within a volume. ReFS implements an NTFS-compatible change journal implemented in a slightly different way. The ReFS journal stores change entries in the change journal file located in another volume's global MInstore B+ tree, the metadata directory table. ReFS opens and parses the volume's change journal file only once the volume is mounted. The maximum size of the journal is stored in the $USN_MAX attribute of the journal

CHAPTER 11    Caching and file systems      753


---

file. In RefS, each file and directory contains its last USN (update sequence number) in the STANDARD INFORMATION data structure stored in the embedded root node of the parent directory. Through the journal file and the USN number of each file and directory, RefS can provide the three FSCTL used for reading and enumerate the volume journal file:

- ■ FSCTL_READ_USN_JOURNAL: Reads the USN journal directly. Callers specify the journal ID
they're reading and the number of the USN record they expect to read.

■ FSCTL_READ_FILE_USN_DATA: Retrieves the USN change journal information for the specified
file or directory.

■ FSCTL_ENUM_USN_DATA: Scans all the file records and enumerates only those that have last
updated the USN journal with a USN record whose USN is within the range specified by the
caller. ReFS can satisfy the query by scanning the object table, then scanning each directory
referred to by the object table, and returning the files in those directories that fall within the
timeline specified. This is slow because each directory needs to be opened, examined, and so
on. (Directories* B+ trees can be spread across the disk.) The way ReFS optimizes this is that it
stores the highest USN of all files in a directory in that directory's object table entry. This way,
ReFS can satisfy this query by visiting only directories it knows are within the range specified.
## ReFS advanced features

In this section, we describe the advanced features of RefS, which explain why the RefS file system is a better fit for large server systems like the ones used in the infrastructure that provides the Azure cloud.

### File's block cloning (snapshot support) and sparse VDL

Traditionally, storage systems implement snapshot and clone functionality at the volume level (see

dynamic volumes, for example). In modern datacenters, when hundreds of virtual machines run and

are stored on a unique volume, such techniques are no longer able to scale. One of the original goals of

the ReFS design was to support file-level snapshots and scalable cloning support (a VM typically maps

to one or a few files in the underlying host storage), which meant that ReFS needed to provide a fast

method to clone an entire file or even only chunks of it. Cloning a range of blocks from one file into a

range of another file allows not only file-level snapshots but also finer-grained cloning for applications

that need to shuffle blocks within one or more files. VHD diff-disk merge is one example.

ReFS exposes the new FSCTL_DUPLICATE_EXTENTS_TO_FILE to duplicate a range of blocks from one file into another range of the same file or to a different file. Subsequent to the clone operation, writes into cloned ranges of either file will proceed in a write-to-new fashion, preserving the cloned block. When there is only one remaining reference, the block can be written in place. The source and target file handle, and all the details from which the block should be cloned, which blocks to clone from the source, and the target range are provided as parameters.

---

As already seen in the previous section, ReFS indexes the LCNs that make up the file's data stream into the extent index table, an embedded B+ tree located in a row of the file record. To support block cloning, Minstore uses a new global index B+ tree (called the block count reference table) that tracks the reference counts of every extent of blocks that are currently cloned. The index starts out empty. The first successful clone operation adds one or more rows to the table, indicating that the blocks now have a reference count of two. If one of the views of those blocks were to be deleted, the rows would be removed. This index is consulted in write operations to determine if write-to-new is required or if writein-place can proceed. It's also consulted before marking free blocks in the allocator. When freeing clusters that belong to a file, the reference counts of the cluster-range is decremented. If the reference count in the table reaches zero, the space is actually marked as freed.

Figure 11-88 shows an example of file cloning. After cloning an entire file (File 1 and File 2 in the picture), both files have identical extent tables, and the Minstore block count reference table shows two references to both volume extents.

![Figure](figures/Winternals7thPt2_page_786_figure_002.png)

FIGURE 11-88 Cloning an ReFS file.

Minstore automatically merges rows in the block reference count table whenever possible with

the intention of reducing the size of the table. In Windows Server 2016, HyperV makes use of the

new cloning FSCTL. As a result, the duplication of a VM, and the merging of its multiple snapshots,

is extremely fast.

ReFS supports the concept of a file Valid Data Length (VDL) in a similar way to NTFS. Using the $$ZeroRangeInStream file data stream, ReFS keeps track of the valid or invalid state for each allocated file's data block. All the new allocations requested to the file are in an invalid state; the first write to the file makes the allocation valid. ReFS returns zeroed content to read requests from invalid file ranges. The technique is similar to the DAL, which we explained earlier in this chapter. Applications can logically zero a portion of file without actually writing any data using the FSCTL_SET_ZERO_DATA file system control code (the feature is used by HyperV to create fixed-size VHDs very quickly).

CHAPTER 11   Caching and file systems     755


---

## EXPERIMENT: Witnessing ReFS snapshot support through HyperV

In this experiment, you're going to use HyperV for testing the volume snapshot support of ReFS.


Using the HyperV manager, you need to create a virtual machine and install any operating system on it. At the first boot, take a checkpoint on the VM by right-clicking the virtual machine name and selecting the Checkpoint menu item. Then, install some applications on the virtual machine (the example below shows a Windows Server 2012 machine with Office installed) and take another checkpoint.

![Figure](figures/Winternals7thPt2_page_787_figure_002.png)

---

If you turn off the virtual machine and, using File Explorer, locate where the virtual hard disk file resides, you will find the virtual hard disk and multiple other files that represent the differential content between the current checkpoint and the previous one.

![Figure](figures/Winternals7thPt2_page_788_figure_001.png)

If you open the HyperV Manager again and delete the entire checkpoint tree (by rightclicking the first root checkpoint and selecting the Delete Checkpoint Subtree menu item), you will find that the entire merge process takes only a few seconds. This is explained by the fact that HyperV uses the block-cloning support of ReFS, through the FSCTL_DUPPLICATE_EXTENTS_TO_FILE I/O control code, to properly merge the checkpoints' content into the base virtual hard disk file. As explained in the previous paragraphs, block cloning doesn't actually move any data. If you repeat the same experiment with a volume formatted using an exFAT or NTFS file system, you will find that the time needed to merge the checkpoints is much larger.

## ReFS write-through

One of the goals of ReFS was to provide close to zero unavailability due to file system corruption. In the next section, we describe all of the available online repair methods that ReFS employs to recover from disk damage. Before describing them, it's necessary to understand how ReFS implements writethrough when it writes the transactions to the underlying medium.

The term write-through refers to any primitive modifying operation (for example, create file, extend file, or write block) that must not complete until the system has made a reasonable guarantee that the results of the operation will be visible after crash recovery. Write-through performance is critical for different I/O scenarios, which can be broken into two kinds of file system operations: data and metadata.

CHAPTER 11   Caching and file systems     757


---

When RefS performs an update-in-place to a file without requiring any metadata mutation (like when the system modifies the content of an already-allocated file, without extending its length), the write-through performance has minimal overhead. Because RefS uses allocate-on-write for metadata, it's expensive to give write-through guarantees for other scenarios when metadata change. For example, ensuring that a file has been renamed implies that the metadata blocks from the root of the file system down to the block describing the file's name must be written to a new location. The allocateon-write nature of RefS has the property that it does not modify data in place. One implication of this is that recovery of the system should never have to undo any operations, in contrast to NTFS.

To achieve write-through, Minstore uses write-ahead-logging (or WAL). In this scheme, shown in Figure 11-89, the system appends records to a log that is logically infinitely long; upon recovery, the log is read and replayed. Minstore maintains a log of logical redo transaction records for all tables except the allocator table. Each log record describes an entire transaction, which has to be replayed at recovery time. Each transaction record has one or more operation redo records that describe the actual high-level operation to perform (such as insert [key K / value V] pair in Table X). The transaction record allows recovery to separate transactions and is the unit of atomicity (no transactions will be partially redone). Logically, logging is owned by every ReFS transaction; a small log buffer contains the log record. If the transaction is committed, the log buffer is appended to the in-memory volume log, which will be written to disk later; otherwise, if the transaction aborts, the internal log buffer will be discarded. Write-through transactions wait for confirmation from the log engine that the log has committed up until that point, while non-write-through transactions are free to continue without confirmation.

![Figure](figures/Winternals7thPt2_page_789_figure_002.png)

FIGURE 11-89 Scheme of Minstore's write-ahead logging.

Furthermore, RefS makes use of checkpoints to commit some views of the system to the underlying

disk, consequently rendering some of the previously written log records unnecessary. A transaction's

redo log records no longer need to be redone once a checkpoint commits a view of the affected trees

to disk. This implies that the checkpoint will be responsible for determining the range of log records

that can be discarded by the log engine.

---

## ReFS recovery support

To properly keep the file system volume available at all times, ReFS uses different recovery strategies.


While NTFS has similar recovery support, the goal of ReFS is to get rid of any offline check disk utilities

(like the Chkdsk tool used by NTFS) that can take many hours to execute in huge disks and require the

operating system to be rebooted. There are mainly four ReFS recovery strategies:

- • Metadata corruption is detected via checksums and error-correcting codes. Integrity streams
validate and maintain the integrity of the file's data using a checksum of the file's actual content
(the checksum is stored in a row of the file's B+ tree table), which maintains the integrity of the
file itself and not only on its file-system metadata.

• ReFS intelligently repairs any data that is found to be corrupt, as long as another valid copy is
available. Other copies might be provided by ReFS itself (which keeps additional copies of its
own metadata for critical structures such as the object table) or through the volume redundan-
cy provided by Storage Spaces (see the “Storage Spaces” section later in this chapter).

• ReFS implements the salvage operation, which removes corrupted data from the file system
namespace while it's online.

• ReFS rebuilds lost metadata via best-effort techniques.
The first and second strategies are properties of the Minstore library on which ReFS depends (more details about the integrity streams are provided later in this section). The object table and all the global Minstore B+ tree tables contain a checksum for each link that points to the child (or director) nodes stored in different disk blocks. When Minstore detects that a block is not what it expects, it automatically attempts repair from one of its duplicated copies (if available). If the copy is not available, Minstore returns an error to the ReFS upper layer. ReFS responds to the error by initializing online salvage.

The term salvage refers to any fixes needed to restore as much data as possible when ReFS detects metadata corruption in a directory B+ tree. Salvage is the evolution of the zap technique. The goal of the zap was to bring back the volume online, even if this could lead to the loss of corrupted data. The technique removed all the corrupted metadata from the file namespace, which then became available after the repair.

Assume that a director node of a directory B+ tree becomes corrupted. In this case, the zap operation will fix the parent node, rewriting all the links to the child and rebalancing the tree, but the data originally pointed by the corrupted node will be completely lost. Minstore has no idea how to recover the entries addressed by the corrupted director node.

To solve this problem and properly restore the directory tree in the salvage process, ReFS needs

to know subdirectories' identifiers, even when the directory table itself is not accessible (because it

has a corrupted director node, for example). Restoring part of the lost directory tree is made possible

by the introduction of a volume global table, called called the parent-child table, which provides a

directory's information redundancy.

A key in the parent-child table represents the parent table's ID, and the data contains a list of child table IDs. Salvage scans this table, reads the child tables list, and re- creates a new non-corrupted Btree that contains all the subdirectories of the corrupted node. In addition to needing child table IDs, to

CHAPTER 11   Caching and file systems     759


---

completely restore the corrupted parent directory, ReFS still needs the name of the child tables, which were originally stored in the keys of the parent B+ tree. The child table has a self-record entry with this information (of type link to directory; see the previous section for more details). The salvage process opens the recovered child table, reads the self-record, and reinserts the directory link into the parent table. The strategy allows ReFS to recover all the subdirectories of a corrupted director or root node (but still not the files). Figure 11-90 shows an example of zap and salvage operations on a corrupted root node representing the Bar directory. With the salvage operation, ReFS is able to quickly bring the file system back online and loses only two files in the directory.

![Figure](figures/Winternals7thPt2_page_791_figure_001.png)

FIGURE 11-90 Comparison between the zap and salvage operations.

The ReFS file system, after salvage completes, tries to rebuild missing information using various best-effort techniques; for example, it can recover missing file IDs by reading the information from other buckets (thanks to the collating rule that separates files' IDs and tables). Furthermore, ReFS also augments the MInstorage object table with a little bit of extra information to expedite repair. Although ReFS has these best-effort heuristics, it's important to understand that ReFS primarily relies on the redundancy provided by metadata and the storage stack in order to repair corruption without data loss.

In the very rare cases in which critical metadata is corrupted, ReFS can mount the volume in readonly mode, but not for any corrupted tables. For example, in case that the container table and all of its duplicates would all be corrupted, the volume wouldn't be mountable in read-only mode. By skipping over these tables, the file system can simply ignore the usage of such global tables (like the allocator, for example), while still maintaining a chance for the user to recover her data.

Finally, ReFS also supports file integrity streams, where a checksum is used to guarantee the integrity of a file's data (and not only of the file system's metadata). For integrity streams, ReFS stores the checksum of each run that composes the file's extent table (the checksum is stored in the data section of an extent table's row). The checksum allows ReFS to validate the integrity of the data before accessing it. Before returning any data that has integrity streams enabled, ReFS will first calculate its checksum and compares it to the checksum contained in the file metadata. If the checksums don't match, then the data is corrupt.

The RefS file system exposes the FSCTL_SCRUB_DATA control code, which is used by the scrubber (also known as the data integrity scanner). The data integrity scanner is implemented in the Dscan.dll library and is exposed as a task scheduler task, which executes at system startup and every week. When the scrubber sends the FSCTL to the RefS driver, the latter starts an integrity check of the entire volume: the RefS driver checks the boot section, each global B+ tree, and file system's metadata.

760 CHAPTER 11 Caching and file systems


---

![Figure](figures/Winternals7thPt2_page_792_figure_000.png)

Note The online Salvage operation, described in this section, is different from its offline counterpart. The refusutil.exe tool, which is included in Windows, supports this operation. The tool is used when the volume is so corrupted that it is not even mountable in read-only mode (a rare condition). The offline Salvage operation navigates through all the volume clusters, looking for what appears to be metadata pages, and uses best-effort techniques to assemble them back together.

## Leak detection

A cluster leak describes the situation in which a cluster is marked as allocated, but there are no references to it. In ReFS, cluster leaks can happen for different reasons. When a corruption is detected on a directory, online salvage is able to isolate the corruption and rebuild the tree, eventually losing only some files that were located in the root directory itself. A system crash before the tree update algorithm has written a Minstore transaction to disk can lead to a file name getting lost. In this case, the file's data is correctly written to disk, but ReFS has no metadata that point to it. The B+ tree table representing the file itself still can exist somewhere in the disk, but its embedded table is no longer linked in any directory B+ tree.

The built-in refutil.exe tool available in Windows supports the Leak Detection operation, which can

scan the entire volume and, using Minstore, navigate through the entire volume namespace. It then

builds a list of every B+ tree found in the namespace (every tree is identified by a well-known data

structure that contains an identification header), and, by querying the Minstore allocators, compares

the list of each identified tree with the list of trees that have been marked valid by the allocator. If it

finds a discrepancy, the leak detection tool notifies the ReFS file system driver, which will mark the clus ters allocated for the found leaked tree as freed.

Another kind of leak that can happen on the volume affects the block reference counter table, such

as when a cluster's range located in one of its rows has a higher reference counter number than the

actual files that reference it. The lower-case tool is able to count the correct number of references and

fix the problem.

To correctly identify and fix leaks, the leak detection tool must operate on an offline volume, but, using a similar technique to NTFS' online scan, it can operate on a read-only snapshot of the target volume, which is provided by the Volume Shadow Copy service.

CHAPTER 11   Caching and file systems      761


---

### EXPERIMENT: Use Refsutil to find and fix leaks on a ReFS volume

In this experiment, you use the built-in refusE exe tool on a ReFS volume to find and fix cluster

leaks that could happen on a ReFS volume. By default, the tool doesn't require a volume to be

unmounted because it operates on a read-only volume snapshot. To let the tool fix the found

leaks, you can override the setting by using the /x command-line argument. Open an adminis trative command prompt and type the following command. (In the example, a 1TB ReFS volume

was mounted as the E: drive. The /x switch enables the tool's verbose output.)

```bash
C:\resfutil leak\w e:
Creating volume snapshot on drive \\?Volume{92aa4440-51de-4566-8c00-bc73e0671b92}...
 Creating the scratch file...
Beginning volume scan... This may take a while...
Begin leak verification pass 1 (Cluster leaks)...
End leak verification pass 1. Found 0 leaked clusters on the volume.
Begin leak verification pass 2 (Reference count leaks)...
End leak verification pass 2. Found 0 leaked references on the volume.
Begin leak verification pass 3 (Compacted cluster leaks)...
End leak verification pass 3.
Begin leak verification pass 4 (Remaining cluster leaks)...
End leak verification pass 4. Fixed 0 leaks during this pass.
Finished.
Found leaked clusters: 0
Found reference leaks: 0
Total cluster fixed : 0
```

## Shingled magnetic recording (SMR) volumes

At the time of this writing, one of the biggest problems that classical rotating hard disks are facing is in regard to the physical limitations inherent to the recording process. To increase disk size, the drive platter area density must always increase, while, to be able to read and write tiny units of information, the physical size of the heads of the spinning drives continue to get increasingly smaller. In turn, this causes the energy barrier for bit flips to decrease, which means that ambient thermal energy is more likely to accidentally flip bit flips, reducing data integrity. Solid state drives (SSD) have spread to a lot of consumer systems, large storage servers require more space and at a lower cost, which rotational drives still provide. Multiple solutions have been designed to overcome the rotating hard-disk problem. The most effective is called shingled magnetic recording (SMR), which is shown in Figure 11-91. Unlike PMR (perpendicular magnetic recording), which uses a parallel track layout, the head used for reading the data in SMR disks is smaller than the one used for writing. The larger writer means it can more effectively magnetize (write) the media without having to compromise readability or stability.

---

![Figure](figures/Winternals7thPt2_page_794_figure_000.png)

FIGURE 11-91 In SMR disks, the writer track is larger than the reader track.

The new configuration leads to some logical problems. It is almost impossible to write to a disk track

without partially replacing the data on the consecutive track. To solve this problem, SMR disks split the

drive into zones, which are technically called bands. There are two main kinds of zones:

- Conventional (or fast) zones work like traditional PMR disks, in which random writes are allowed.
Write pointer zones are bands that have their own "write pointer" and require strictly sequen-
tial writes. (This is not exactly true, as host-aware SMR disks also support a concept of write
preferred zones, in which random writes are still supported. This kind of zone isn't used by
ReFS though.)
Each band in an SMR disk is usually 256 MB and works as a basic unit of I/O. This means that the system can write in one band without interfering with the next band. There are three types of SMR disks:

- ■ Drive-managed: The drive appears to the host identical to a nonshingled drive. The host
does not need to follow any special protocol, as all handling of data and the existence of the
disk zones and sequential write constraints is managed by the device's firmware. This type of
SMR disk is great for compatibility but has some limitations—the disk cache used to transform
random writes in sequential ones is limited, band cleaning is complex, and sequential write
detection is not trivial. These limitations hamper performance.
■ Host-managed: The device requires strict adherence to special I/O rules by the host. The host
is required to write sequentially as to not destroy existing data. The drive refuses to execute
commands that violate this assumption. Host-managed drives support only sequential write
zones and conventional zones, where the latter could be any media including non-SMR, drive-
managed SMR, and flash.
■ Host-aware: A combination of drive-managed and host-managed, the drive can manage the
shingled nature of the storage and will execute any command the host gives it, regardless of
whether it's sequential. However, the host is aware that the drive is shingled and is able to query
the drive for getting SMR zone information. This allows the host to optimize writes for the
shingled nature while also allowing the drive to be flexible and backward-compatible. Host-
aware drives support the concept of sequential write preferred zones.
At the time of this writing, RefS is the only file system that can support host-managed SMR disks

natively. The strategy used by RefS for supporting these kinds of drives, which can achieve very large

capacities (20 terabytes or more), is the same as the one used for tiered volumes, usually generated by

Storage Spaces (see the final section for more information about Storage Spaces).

CHAPTER 11    Caching and file systems      763


---

## ReFS support for tiered volumes and SMR

Tiered volumes are similar to host-aware SMR disks. They're composed of a fast, random access area (usually provided by a SSD) and a slower sequential write area. This isn't a requirement, though; tiered disks can be composed by different random-access disks, even of the same speed. ReFS is able to properly manage tiered volumes (and SMR disks) by providing a new logical indirect layer between files and directory namespace on the top of the volume namespace. This new layer divides the volume into logical containers, which do not overlap (so a given cluster is present in only one container at time). A container represents an area in the volume and all containers on a volume are always of the same size, which is defined based on the type of the underlying disk: 64 MB for standard tiered disks and 256 MB for SMR disks. Containers are called ReFS bands because if they're used with SMR disks, the containers' size becomes exactly the same as the SMR bands' size, and each container maps one-to-one to each SMR band.

The indirection layer is configured and provided by the global container table, as shown in Figure 11-92.

The rows of this table are composed by keys that store the ID and the type of the container. Based on

the type of container (which could also be a compacted or compressed container), the row's data is

different. For noncompacted containers (details about ReFS compaction are available in the next sec tion), the row's data is a data structure that contains the mapping of the cluster range addressed by the

container. This provides to ReFS a virtual LCN-to-real LCN namespace mapping.

![Figure](figures/Winternals7thPt2_page_795_figure_003.png)

FIGURE 11-92 The container table provides a virtual LCN-to-real LCN indirection layer.

The container table is important: all the data managed by ReFS and Minstore needs to pass through the container table (with only small exceptions), so ReFS maintains multiple copies of this vital table. To perform an I/O on a block, ReFS must first look up the location of the extent's container to find the

---

real location of the data. This is achieved through the extent table, which contains target virtual LCN of the cluster range in the data section of its rows. The container ID is derived from the LCN, through a mathematical relationship. The new level of indirection allows ReFS to move the location of containers without consulting or modifying the file extent tables.

ReFS consumes tiers produced by Storage Spaces, hardware tiered volumes, and SMR disks. ReFS redirects small random I/Os to a portion of the faster tiers and destages those writes in batches to the slower tiers using sequential writes (destages happen at container granularity). Indeed, in ReFS, the term fast tier (or flash tier) refers to the random-access zone, which might be provided by the conventional bands of an SMR disk, or by the totality of an SSD or NVMe device. The term slow tier (or HDD tier) refers instead to the sequential write bands or to a rotating disk. ReFS uses different behaviors based on the class of the underlying medium. Non-SMR disks have no sequential requirements, so clusters can be allocated from anywhere on the volume; SMR disks, as discussed previously, need to have strictly sequential requirements, so ReFS never writes random data on the slow tier.

By default, all of the metadata that RefS uses needs to stay in the fast tier; RefS tries to use the fast tier even when processing general write requests. In non-SMR disks, as flash containers fill, RefS moves containers from flash to HDD (this means that in a continuous write workload, RefS is continually moving containers from flash into HDD). RefS is also able to do the opposite when needed—select containers from the HDD and move them into flash to fill with subsequent writes. This feature is called container rotation and is implemented in two stages. After the storage driver has copied the actual data, RefS modifies the container LCN mapping shown earlier. No modification in any file's extent table is needed.

Container rotation is implemented only for non-SMR disks. This is important, because in SMR disks, the RefS file system driver never automatically moves data between tiers. Applications that are SMR disk-aware and want to write data in the SMR capacity tier can use the FSCTL_SET_REFS_FILE_ STRICTLY_SEQUENTIAL control code. If an application sends the control code on a file handle, the RefS driver writes all of the new data in the capacity tier of the volume.

## EXPERIMENT: Witnessing SMR disk tiers

You can use the FSUtil tool, which is provided by Windows, to query the information of an SMR disk, like the size of each tier, the usable and free space, and so on. To do so, just run the tool in an administrative command prompt. You can launch the command prompt as administrator by searching for cmd in the Cortana Search box and by selecting Run As Administrator after rightclicking the Command Prompt label. Input the following parameters:

```bash
fsutil volume smrInfo <VolumeDrive>
```

replacing the <VolumeDrive> part with the drive letter of your SMR disk.

---

![Figure](figures/Winternals7thPt2_page_797_figure_000.png)

Furthermore, you can start a garbage collection (see the next paragraph for details about this

feature) through the following command:

```bash
fsutil volume smrGc <VolumeDrive> Action=startfullspeed
```

The garbage collection can even be stopped or paused through the relative Action param eter. You can start a more precise garbage collection by specifying the IGranularity parameter,

which specifies the granularity of the garbage collection I/O, and using the start action instead

of startfullspeed.

## Container compaction

Container rotation has performance problems, especially when storing small files that don't usually fit into an entire band. Furthermore, in SMR disks, container rotation is never executed, as we explained earlier. Recall that each SMR band has an associated write pointer (hardware implemented), which identifies the location for sequential writing. If the system were to write before or after the write pointer in a non-sequential way, it would corrupt data located in other clusters (the SMR firmware must therefore refuse such a write).

ReFS supports two types of containers: base containers, which map a virtual cluster's range directly to physical space, and compacted containers, which map a virtual container to many different base containers. To correctly map the correspondence between the space mapped by a compacted container and the base containers that compose it, ReFS implements an allocation bitmap, which is stored in the rows of the global container index table (another table, in which every row describes a single compacted container). The bitmap has a bit set to 1 if the relative cluster is allocated; otherwise, it's set to 0.

Figure 11-93 shows an example of a base container (C32) that maps a range of virtual LCNs (0x8000 to 0x8400) to real volume's LCNs (0x8800 to 0xBC00, identified by R46). As previously discussed, the container ID of a given virtual LCN range is derived from the starting virtual cluster number; all the

766      CHAPTER 11   Caching and file systems


---

containers are virtually contiguous. In this way, ReFS never needs to look up a container ID for a given container range. Container C32 of Figure 11-93 only has 560 clusters (0x230) contiguously allocated (out of its 1,024). Only the free space at the end of the base container can be used by ReFS. Or, for non-SMR disks, in case a big chunk of space located in the middle of the base container is freed, it can be reused too. Even for non-SMR disks, the important requirement here is that the space must be contiguous.

If the container becomes fragmented (because some small file extents are eventually freed), ReFS

can convert the base container into a compacted container. This operation allows ReFS to reuse the

container's free space, without reallocating any row in the extent table of the files that are using the

clusters described by the container itself.

Cluster size: 64KB Container size: 64MB (0x400 clusters)

Volume size: 1TB (0x1000000 clusters)

![Figure](figures/Winternals7thPt2_page_798_figure_003.png)

EXTENT TABLE

<table><tr><td>VCN RANGE</td><td>LCN</td><td>CONTAINER</td></tr><tr><td>[0×-0x400]</td><td>0x1B400</td><td>97</td></tr><tr><td>[0x400-0x800]</td><td>0x32000</td><td>200</td></tr><tr><td>[0x800-0xA00]</td><td>0x61E00</td><td>391</td></tr><tr><td>[0xA00-0xC00]</td><td>0x11200</td><td>68</td></tr><tr><td>[0xC00-0xD20]</td><td>0x8110</td><td>32</td></tr></table>


FIGURE 11-93 An example of a base container addressed by a 210 MB file. Container C32 uses only 35 MB of its 64 MB space.

ReFS provides a way to defragment containers that are fragmented. During normal system I/O activity, there are a lot of small files or chunks of data that need to be updated or created. As a result, containers located in the slow tier can hold small chunks of freed clusters and can become quickly fragmented. Container compaction is the name of the feature that generates new empty bands in the slow tier, allowing containers to be properly defragmented. Container compaction is executed only in the capacity tier of a tiered volume and has been designed with two different goals:

CHAPTER 11    Caching and file systems      767


---

- ■ Compaction is the garbage collector for SMR-disks: In SMR, ReFS can only write data in the
capacity zone in a sequential manner. Small data can't be singularly updated in a container lo-
cated in the slow tier. The data doesn't reside at the location pointed by the SMR write pointer,
so any I/O of this kind can potentially corrupt other data that belongs to the band. In that case,
the data is copied in a new band. Non-SMR disks don't have this problem; ReFS updates data
residing in the small tier directly.

■ In non-SMR tiered volumes, compaction is the generator for container rotation: The
generated free containers can be used as targets for forward rotation when data is moved from
the fast tier to the slow tier.
ReFS, at volume-format time, allocates some base containers from the capacity tier just for compaction; which are called compacted reserved containers . Compaction works by initially searching for fragmented containers in the slow tier. ReFS reads the fragmented container in system memory and defragments it. The defragmented data is then stored in a compacted reserved container, located in the capacity tier, as described above. The original container, which is addressed by the file extent table, becomes compacted. The range that describes it becomes virtual (compaction adds another indirection layer), pointing to virtual LCNs described by another base container (the reserved container). At the end of the compaction, the original physical container is marked as freed and is reused for different purposes. It also can become a new compacted reserved container. Because containers located in the slow tier usually become highly fragmented in a relatively small time, compaction can generate a lot of empty bands in the slow tier.

The clusters allocated by a compacted container can be stored in different base containers. To properly manage such clusters in a compacted container, which can be stored in different base containers, ReFS uses another extra layer of indirection, which is provided by the global container index table and by a different layout of the compacted container. Figure 11-94 shows the same container as Figure 11-93, which has been compacted because it was fragmented (272 of its 560 clusters have been freed). In the container table, the row that describes a compacted container stores the mapping between the cluster range described by the compacted container, and the virtual clusters described by the base containers. Compacted containers support a maximum of four different ranges (called legs). The four legs create the second indirection layer and allow ReFS to perform the container defragmentation in an efficient way. The allocation bitmap of the compacted container provides the second indirection layer, too. By checking the position of the allocated clusters (which correspond to a 1 in the bitmap), ReFS is able to correctly map each fragmented cluster of a compacted container.

In the example in Figure 11-94, the first bit set to 1 is at position 17, which is 0x11 in hexadecimal. In the example, one bit corresponds to 16 clusters; in the actual implementation, though, one bit corresponds to one cluster only. This means that the first cluster allocated at offset 0x110 in the compacted container C32 is stored at the virtual cluster 0xF2E0 in the base container C124. The free space available after the cluster at offset 0x230 in the compacted container C32, is mapped into base container C56. The physical container R46 has been remapped by ReFS and has become an empty compacted reserved container, mapped by the base container C180.

---

![Figure](figures/Winternals7thPt2_page_800_figure_000.png)

FIGURE 11-94 Container C32 has been compacted in base container C124 and C56.

In SMR disks, the process that starts the compaction is called garbage collection. For SMR disks, an application can decide to manually start, stop, or pause the garbage collection at any time through the

FSCTL_SET_REFS_SMR_VOLUME_GC_PARAMETERS file system control code.

In contrast to NTFS, on non-SMR disks, the ReFS volume analysis engine can automatically start the container compaction process. ReFS keeps track of the free space of both the slow and fast tier and the available writable free space of the slow tier. If the difference between the free space and the available space exceeds a threshold, the volume analysis engine kicks off and starts the compaction process. Furthermore, if the underlying storage is provided by Storage Spaces, the container compaction runs periodically and is executed by a dedicated thread.

## Compression and ghosting

ReFS does not support native file system compression, but, on tiered volumes, the file system is able to save more free containers on the slow tier thanks to container compression. Every time ReFS performs container compaction, it reads in memory the original data located in the fragmented base container. At this stage, if compression is enabled, ReFS compresses the data and finally writes it in a compressed compacted container. ReFS supports four different compression algorithms: LZNTI, LZX, XPRESS, and XPRESS_HUFF.

Many hierarchical storage management (HMR) software solutions support the concept of a ghosted file. This state can be obtained for many different reasons. For example, when the HSM migrates the user file (or some chunks of it) to a cloud service, and the user later modifies the copy located in the cloud through a different device, the HSM filter driver needs to keep track of which part of the file changed and needs to set the ghosted state on each modified file's range. Usually HMRs keep track of the ghosted state through their filter drivers. In RefS, this isn't needed because the RefS file system exposes a new I/O control code, FSCTL_GHOST_FILE_EXTENTS. Filter drivers can send the IOCTL to the ReFS driver to set part of the file as ghosted. Furthermore, they can query the file's ranges that are in the ghosted state through another I/O control code: FSCTL_QUERY_GHOSTED_FILE_EXTENTS.

CHAPTER 11   Caching and file systems      769


---

ReFS implements ghosted files by storing the new state information directly in the file's extent

table, which is implemented through an embedded table in the file record, as explained in the previ ous section. A filter driver can set the ghosted state for every range of the file (which must be cluster aligned). When the ReFS driver intercepts a read request for an extent that is ghosted, it returns a

STATUS_GHOSTED error code to the caller, which a filter driver can then intercept and redirect the read

to the proper place (the cloud in the previous example).

## Storage Spaces

Storage Spaces is the technology that replaces dynamic disks and provides virtualization of physical storage hardware. It has been initially designed for large storage servers but is available even in client editions of Windows 10. Storage Spaces also allows the user to create virtual disks composed of different underlying physical mediums. These mediums can have different performance characteristics.

At the time of this writing, Storage Spaces is able to work with four types of storage devices: Nonvolatile memory express (NVMe), flash disks, persistent memory (PM), SATA and SAS solid state drives (SSD), and classical rotating hard-disks (HDD). NVMe is considered the faster, and HDD is the slowest. Storage spaces was designed with four goals:

- ■ Performance: Spaces implements support for a built-in server-side cache to maximize storage

performance and support for tiered disks and RAID 0 configuration.

■ Reliability: Other than span volumes (RAID 0), spaces supports Mirror (RAID 1 and 10) and

Parity (RAID 5, 6, 50, 60) configurations when data is distributed through different physical disks

or different nodes of the cluster.

■ Flexibility: Storage spaces allows the system to create virtual disks that can be automatically

moved between a cluster's nodes and that can be automatically shrunk or extended based on

real space consumption.

■ Availability: Storage spaces volumes have built-in fault tolerance. This means that if a drive, or

even an entire server that is part of the cluster, fails, spaces can redirect the I/O traffic to other

working nodes without any user intervention (and in a way). Storage spaces don't have a single

point of failure.
Storage Spaces Direct is the evolution of the Storage Spaces technology. Storage Spaces Direct is designed for large datacenters, where multiple servers, which contain different slow and fast disks, are used together to create a pool. The previous technology didn't support clusters of servers that weren't attached to JBOD disk arrays; therefore, the term direct was added to the name. All servers are connected through a fast Ethernet connection (10GBe or 40GBe, for example). Presenting remote disks as local to the system is made possible by two drivers—the cluster miniport driver (Clusport.sys) and the cluster block filter driver (Clusbft.sys)—which are outside the scope of this chapter. All the storage physical units (local and remote disks) are added to a storage pool, which is the main unit of management, aggregation, and isolation, from where virtual disks can be created.

The entire storage cluster is mapped internally by Spaces using an XML file called BluePrint. The file is automatically generated by the Spaces GUI and describes the entire cluster using a tree of different

770     CHAPTER 11   Caching and file systems


---

storage entities: Racks, Chassis, Machines, JBODs (Just a Bunch of Disks), and Disks. These entities compose each layer of the entire cluster. A server (machine) can be connected to different JBODs or have different disks directly attached to it. In this case, a JBOD is abstracted and represented only by one entity. In the same way, multiple machines might be located on a single chassis, which could be part of a server rack. Finally, the cluster could be made up of multiple server racks. By using the Blueprint representation, Spaces is able to work with all the cluster disks and redirect I/O traffic to the correct replacement in case a fault on a disk, JBOD, or machine occurs. Spaces Direct can tolerate a maximum of two contemporary faults.

## Spaces internal architecture

One of the biggest differences between Spaces and dynamic disks is that Spaces creates virtual disk objects, which are presented to the system as actual disk device objects by the Spaces storage driver (Spaceport.sys). Dynamic disks operate at a higher level virtual volume objects are exposed to the system (meaning that user mode applications can still access the original disks). The volume manager is the component responsible for creating the single volume composed of multiple dynamic volumes. The Storage Spaces driver is a filter driver (a full filter driver rather than a minifilter) that lies between the partition manager (Partmgr.sys) and the disk class driver.

Storage Spaces architecture is shown in Figure 11-95 and is composed mainly of two parts: a platform-independent library, which implements the Spaces core, and an environment part, which is platform-dependent and links the Spaces core to the current environment. The Environment layer provides to Storage Spaces the basic core functionalities that are implemented in different ways based on the platform on which they run (because storage spaces can be used as bootable entities, the Windows boot loader and boot manager need to know how to parse storage spaces, hence the need for both a UEFI and Windows implementation). The core basic functionality includes memory management routines (alloc, free, lock, unlock and so on), device I/O routines (Control, PnP, Read, and Write), and synchronization methods. These functions are generally wrappers to specific system routines. For example, the read service, on Windows platforms, is implemented by creating an IRP of type IRP_MJ_ READ and by sending it to the correct disk driver, while, on UEFI environments, it's implemented by using the BLOCK_IOL_PROTOCOL.

![Figure](figures/Winternals7thPt2_page_802_figure_004.png)

FIGURE 11-95 Storage Spaces architecture.

---

Other than the boot and Windows kernel implementation, storage spaces must also be available during crash dumps, which is provided by the SpaceDump.sys crash dump filter driver. Storage Spaces is even available as a user-mode library (Backspace.dll), which is compatible with legacy Windows operating systems that need to operate with virtual disks created by Spaces (especially the VHD file), and even as a UEFI DXE driver (HyperSpace.efi), which can be executed by the UEFI BIOS, in cases where even the EFI System Partition itself is present on a storage space entity. Some new Surface devices are sold with a large solid-state disk that is actually composed of two or more fast NVMe disks.

Spaces Core is implemented as a static library, which is platform-independent and is imported by all of the different environment layers. Is it composed of four layers: Core, Store, Metadata, and IO.

The Core is the highest layer and implements all the services that Spaces provides. Store is the component that reads and writes records that belong to the cluster database (created from the BluePrint file). Metadata interprets the binary records read by the Store and exposes the entire cluster database through different objects: Pool, Drive, Space, Extent, Column, Tier, and Metadata. The IO component, which is the lowest layer, can emit I/Os to the correct device in the cluster in the proper sequential way, thanks to data parsed by higher layers.

## Services provided by Spaces

Storage Spaces supports different disk type configurations. With Spaces, the user can create virtual disks composed entirely of fast disks (SSD, NVMe, and PM), slow disks, or even composed of all four supported disk types (hybrid configuration). In case of hybrid deployments, where a mix of different classes of devices are used, Spaces supports two features that allow the cluster to be fast and efficient:

- ■ Server cache: Storage Spaces is able to hide a fast drive from the cluster and use it as a cache for
the slower drives. Spaces supports PM disks to be used as a cache for NVMe or SSD disks, NVMe
disks to be used as cache for SSD disks, and SSD disks to be used as cache for classical rotating
HDD disks. Unlike tiered disks, the cache is invisible to the file system that resides on the top of
the virtual volume. This means that the cache has no idea whether a file has been accessed more
recently than another file. Spaces implements a fast cache for the virtual disk by using a log that
keeps track of hot and cold blocks. Hot blocks represent parts of files (files' extents) that are often
accessed by the system, whereas cold blocks represent part of files that are barely accessed. The
log implements the cache as a queue, in which the hot blocks are always at the head, and cold
blocks are at the tail. In this way, cold blocks can be deleted from the cache if it's full and can be
maintained only on the slower storage; hot blocks usually stay in the cache for a longer time.
■ Tiering: Spaces can create tiered disks, which are managed by ReFS and NTFS. Whereas ReFS sup-
ports SMR disks, NTFS only supports tiered disks provided by Spaces. The file system keeps track of
the hot and cold blocks and rotates the bands based on the file's usage (see the "ReFS support
for tiered volumes and SMR" section earlier in this chapter). Spaces provides to the file system
driver support for pinning, a feature that can pin a file to the fast tier and lock it in the tier until
it will be unpinned. In this case, no band rotation is ever executed. Windows uses the pinning
feature to store the new files on the fast tier while performing an OS upgrade.
As already discussed previously, one of the main goals of Storage Spaces is flexibility. Spaces

supports the creation of virtual disks that are extensible and consume only allocated space in the

772      CHAPTER 11   Caching and file systems


---

underlying cluster's devices; this kind of virtual disk is called thin provisioned. Unlike fixed provisioned disks, where all of the space is allocated to the underlying storage cluster, thin provisioned disks allocate only the space that is actually used. In this way, it's possible to create virtual disks that are much larger than the underlying storage cluster. When available space gets low, a system administrator can dynamically add disks to the cluster. Storage Spaces automatically includes the new physical disks to the pool and redistributes the allocated blocks between the new disks.

Storage Spaces supports thin provisioned disks through slabs. A slab is a unit of allocation, which is

similar to the ReFS container concept, but applied to a lower-level stack: the slab is an allocation unit of

a virtual disk and not a file system concept. By default, each slab is 256 MB in size, but it can be bigger

in case the underlying storage cluster allows it (i.e., if the cluster has a lot of available space.) Spaces

core keeps track of each slab in the virtual disk and can dynamically allocate or free slabs by using its

own allocator. It's worth noting that each slab is a point of reliability: in mirrored and parity configura tions, the data stored in a slab is automatically replicated through the entire cluster.

When a thin provisioned disk is created, a size still needs to be specified. The virtual disk size will be used by the file system with the goal of correctly formatting the new volume and creating the needed metadata. When the volume is ready, Spaces allocates slabs only when new data is actually written to the disk—a method called allocate-on-write. Note that the provisioning type is not visible to the file system that resides on top of the volume, so the file system has no idea whether the underlying disk is thin or fixed provisioned.

Spaces gets rid of any single point of failure by making usage of mirroring and pairing. In big storage clusters composed of multiple disks, RAID 6 is usually employed as the parity solution. RAID 6 allows the failure of a maximum of two underlying devices and supports seamless reconstruction of data without any user intervention. Unfortunately, when the cluster encounters a single (or double) point of failure, the time needed to reconstruct the array (mean time to repair or MTTR) is high and often causes serious performance penalties.

Spaces solves the problem by using a local reconstruction code (LCR) algorithm, which reduces the number of reads needed to reconstruct a big disk array, at the cost of one additional parity unit. As shown in Figure 11-96, the LCR algorithm does so by dividing the disk array in different rows and by adding a parity unit for each row. If a disk fails, only the other disks of the row needs to be read. As a result, reconstruction of a failed array is much faster and more efficient.

![Figure](figures/Winternals7thPt2_page_804_figure_005.png)

FIGURE 11-96 RAID 6 and LRC parity.

Figure 11-96 shows a comparison between the typical RAID 6 parity implementation and the LRC implementation on a cluster composed of eight drives. In the RAID 6 configuration, if one (or two) disk(s) fail(s), to properly reconstruct the missing information, the other six disks need to be read; in LRC, only the disks that belong to the same row of the failing disk need to be read.

CHAPTER 11   Caching and file systems     773


---

## EXPERIMENT: Creating tiered volumes

Storage Spaces is supported natively by both server and client editions of Windows 10. You can create tiered disks using the graphical user interface, or you can also use Windows PowerShell. In this experiment, you will create a virtual tiered disk, and you will need a workstation that, other than the Windows boot disk, also has an empty SSD and an empty classical rotating disk (HDD). For testing purposes, you can emulate a similar configuration by using HyperV. In that case, one virtual disk file should reside on an SSD, whereas the other should reside on a classical rotating disk.

First, you need to open an administrative Windows PowerShell by right-clicking the Start

menu icon and selecting Windows PowerShell (Admin). Verify that the system has already iden tified the type of the installed disks:

```bash
PS C:\> Get-PhysicalDisk | FT DeviceId, FriendlyName, UniqueID, Size, MediaType, CanPool
-----------------------------------------------------------------------
DeviceId FriendlyName                     UniqueID                       Size MediaType CanPool
-----------------------------------------------------------------------
2             Samsung SSD 960 EVO 1TB eui.0025385C61B074F7 000204886016 SSD           False
0             Micron 1100 SATA S12GB 500075116EBAS21                     512110190592 SSD           True
1             TOSHIBA DBTO1ACAZ20                  500003F95D69494            2000398934016 HDD           True
```

In the preceding example, the system has already identified two SSDs and one classical rotating hard disk. You should verify that your empty disks have the CanPool value set to True. Otherwise, it means that the disk contains valid partitions that need to be deleted. If you're testing a virtualized environment, often the system is not able to correctly identify the media type of the underlying disk.

```bash
PS C:\> Get-PhysicalDisk | FT DeviceId, FriendlyName, UniqueID, Size, MediaType, CanPool
DeviceId FriendlyName                     UniqueID                                           Size MediaType   CanPool
---------------------------                          ----------------                          -------------------------------
2
---------------------------  Msft Virtual Disk 600248021F4EE16B94595687DDE774B  137438953472 Unspecified   True
1
---------------------------  Msft Virtual Disk 6002481070766A0A80A30797285D7  1099511627776 Unspecified   True
0
---------------------------  Msft Virtual Disk 600248048976A566FE149B000A43FC7  2478747096494 Unspecified   False
```

In this case, you should manually specify the type of disk by using the command

Set-PhysicalDisk -UniqueID {Get-PhysicalDisk}<IDX>.UniqueID -MediaType <Type>, where IDX is the row number in the previous output and MediaType is SSD or HDD, depending on the disk type. For example:

```bash
PS C:\> Set-PhysicalDisk -UniqueId (Get-PhysicalDisk)[0].UniqueID -MediaType SSD
PS C:\> Set-PhysicalDisk (Get-PhysicalDisk)[1].UniqueID -MediaType HDD
PS C:\> Get-PhysicalDisk | FT.DeviceId, FriendlyName, UniqueID, Size, MediaType, CanPool
----------------------
DeviceId FriendlyName        UniqueID                                                Size MediaType      CanPool
----------------------
2             Msft Virtual Disk 600224B02F4EE1E6B94595687D0E774B   137438953472    SSD                True
1             Msft Virtual Disk 600224B017676A490A8A0377265077   1099511627776    HDD                True
0             Msft Virtual Disk 60022804B97GA586FE14980043FCF3   274877906944    Unspecified      False
```

---

At this stage you need to create the Storage pool, which is going to contain all the physical

disks that are going to compose the new virtual disk. You will then create the storage tiers. In this

example, we named the Storage Pool as DefaultPool:

```bash
PS C:\> New-StoragePool -StorageSubSystemId {Get-StorageSubSystem}.UniqueId -FriendlyName
DefaultPool -PhysicalDisks {Get-PhysicalDisk -CanPool $true}
FriendlyName OperationalStatus HealthStatus IsPrimordial IsReadOnly
-------------------------------------------------
Pool      OK              Healthy    False            1,12 TB      512 MB
```

```bash
PS C:\> Get-StoragePool DefaultPool | New-StorageTier -FriendlyName SSD -MediaType SSD
PS C:\> Get-StoragePool DefaultPool | New-StorageTier -FriendlyName HDD -MediaType HDD
```

Finally, we can create the virtual tiered volume by assigning it a name and specifying the correct size of each tier. In this example, we create a tiered volume named TieredVirtualDisk composed of a 120-GB performance tier and a 1,000-GB capacity tier:

```bash
PS C:\> $SSD = Get-StorageTier -FriendlyName SSD
PS C:\> $HDD = Get-StorageTier -FriendlyName HDD
PS C:\> Get-StoragePool Pool | New-VirtualDisk -FriendlyName "TieredVirtualDisk"
-ResiliencySettingName "Simple" -StorageTiers $SSD, $HDD -StorageTierSizes 128GB, 1000GB
...
PS C:\> Get-VirtualDisk | FT FriendlyName, OperationalStatus, HealthStatus, Size,
FootprintOnPool
FriendlyName      OperationalStatus HealthStatus                     Size FootprintOnPool
---------------------------------------------------
TieredVirtualDisk OK                      Healthy      1202590842880    1203664584704
```

After the virtual disk is created, you need to create the partitions and format the new volume through standard means (such as by using the Disk Management snap-in or the Format tool).


After you complete volume formatting, you can verify whether the resulting volume is really a tiered volume by using the fsutil.exe tool:

```bash
PS E:\> fsutil tiering regionlist e:
Total Number of Regions for this volume: 2
Total Number of Regions returned by this operation: 2
  Region # 0:
    Tier ID: {44A48A88-F00B-42D6-8345-CD8A68869020}
    Name: TieredVirtualDisk-SSD
    Offset: 0x0000000000000000
    Length: 0x0000001df000000
  Region # 1:
    Tier ID: {16A7BB83-CE3E-4996-8FF3-BEE98B68EBE4}
    Name: TieredVirtualDisk-HDD
    Offset: 0x0000001df000000
    Length: 0x0000009Ff6e0000
```

CHAPTER 11   Caching and file systems     775


---

## Conclusion

Windows supports a wide variety of file system formats accessible to both the local system and remote clients. The file system filter driver architecture provides a clean way to extend and augment file system access, and both NTFS and ReFS provide a reliable, secure, scalable file system format for local file system storage. Although ReFS is a relatively new file system, and implements some advanced features designed for big server environments, NTFS was also updated with support for new device types and new features (like the POSIX delete, online checkdisk, and encryption).

The cache manager provides a high-speed, intelligent mechanism for reducing disk I/O and increas ing overall system throughput. By caching on the basis of virtual blocks, the cache manager can perform

intelligent read-ahead, including on remote, networked file systems. By relying on the global memory

manager's mapped file primitive to access file data, the cache manager can provide a special fast I/O

mechanism to reduce the CPU time required for read and write operations, while also leaving all matters

related to physical memory management to the Windows memory manager, thus reducing code dupli cation and increasing efficiency.

Through DAX and PM disk support, storage spaces and storage spaces direct, tiered volumes, and

SMR disk compatibility, Windows continues to be at the forefront of next-generation storage architec tures designed for high availability, reliability, performance, and cloud-level scale.

In the next chapter, we look at startup and shutdown in Windows.

---

