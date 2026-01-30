
Windows Update and the Windows Setup application must be able to correctly apply important security updates, even when the system volume is almost full (they need to ensure that there is enough disk space). Windows 10 introduced Storage Reserves as a way to achieve this goal. Before we describe the Storage Reserves, it is necessary that you understand how NTFS reservations work and why they're needed.

When the NTFS file system mounts a volume, it calculates the volume's in-use and free space. No

on-disk attributes exist for keeping track of these two counters; NTFS maintains and stores the Volume

bitmap on disk, which represents the state of all the clusters in the volume. The NTFS mounting code

scans the bitmap and counts the number of used clusters, which have their bit set to 1 in the bitmap,

CHAPTER 11   Caching and file systems      685


---

and, through a simple equation (total number of clusters of the volume minus the number of used ones), calculates the number of free clusters. The two calculated counters are stored in the volume control block (VCB) data structure, which represents the mounted volume and exists only in memory until the volume is dismounted.

During normal volume I/O activity, NTFS must maintain the total number of reserved clusters. This counter needs to exist for the following reasons:

- ■ When writing to compressed and sparse files, the system must ensure that the entire file is writable because an application that is operating on this kind of file could potentially store valid uncompressed data on the entire file.
■ The first time a writable image-backed section is created, the file system must reserve available space for the entire section size, even if no physical space is still allocated in the volume.
■ The USN Journal and TxF use the counter to ensure that there is space available for the USN log and NTFS transactions.
NTFS maintains another counter during normal I/O activities, Total Free Available Space, which is the final space that a user can see and use for storing new files or data. These three concepts are parts of NTFS Reservations. The important characteristic of NTFS Reservations is that the counters are only inmemory volatile representations, which will be destroyed at volume dismounting time.

Storage Reserve is a feature based on NTFS reservations, which allow files to have an assigned Storage Reserve area. Storage Reserve defines 15 different reservation areas (2 of which are reserved by the OS), which are defined and stored both in memory and in the NTFS on-disk data structures.

To use the new on-disk reservations, an application defines a volume's Storage Reserve area by using the FSCTL_QUERY_STORAGEreserve file system control code, which specifies, through a data structure, the total amount of reserved space and an Area ID. This will update multiple counters in the VCB (Storage Reserve areas are maintained in-memory) and insert new data in the SSarat named data stream of the $l1tabmat metadata file. The $SSarat data stream contains a data structure that tracks each Reserve area, including the number of reserved and used clusters. An application can query information about Storage Reserve areas through the FSCTL_QUERY_STORAGEreserve file system control code and can delete a Storage Reserve using the FSCTL_DELETE_STORAGEreserve code.

After a Storage Reserve area is defined, the application is guaranteed that the space will no longer be used by any other components. Applications can then assign files and directories to a Storage Reserve area using the NTSetInformationFile native API with the FileStorageReservedInformationEx information class. The NTFS file system driver manages the request by updating the in-memory reserved and used clusters counters of the Reserve area, and by updating the volume's total number of reserved clusters that belong to NTFS reservations. It also stores and updates the on-disk $STANDARD_INFO attribute of the target file. The latter maintains 4 bits to store the Storage Reserve area ID. In this way, the system is able to quickly enumerate each file that belongs to a reserve area by just parsing MFT entries. (NTFS implements the enumeration in the FSCTL_QUERY_FILE_LAYOUT code's dispatch function.) A user can enumerate the files that belong to a Storage Reserve by using the fsutil storageReserve findByID command, specifying the volume path name and Storage Reserve ID she is interested in.

---

Several basic file operations have new side effects due to Storage Reserves, like file creation and

renaming. Newly created files or directories will automatically inherit the storage reserve ID of their

parent; the same applies for files or directories that get renamed (moved) to a new parent. Since a

rename operation can change the Storage Reserve ID of the file or directory, this implies that the op eration might fail due to lack of disk space. Moving a nonempty directory to a new parent implies that

the new Storage Reserve ID is recursively applied to all the files and subdirectories. When the reserved

space of a Storage Reserve ends, the system starts to use the volume's free available space, so there is

no guarantee that the operation always succeeds.

## EXPERIMENT: Witnessing storage reserves

Starting from the May 2019 Update of Windows 10 (19H1), you can look at the existing NTFS reserves through the built-in fsutil.exe tool:

```bash
C:\fsutil\storagereserve query c:
reserve ID:        1
Flags:            0x00000000
Space Guarantee:   0x0             (0 MB)
Space Used:       0x0             (0 MB)
reserve ID:        2
Flags:            0x00000000
Space Guarantee:   0x0             (0 MB)
Space Used:       0x199ed000     (400 MB)
```

Windows Setup defines two NTFS reserves: a Hard reserve (ID 1), used by the Setup application to store its files, which can't be deleted or replaced by other applications, and a Soft reserve (ID 2), which is used to store temporary files, like system logs and Windows Update downloaded files. In the preceding example, the Setup application has been already able to install all its files (and no Windows Update is executing), so the Hard Reserve is empty; the Soft reserve has all its reserved space allocated. You can enumerate all the files that belong to the reserve using the fsutil storagereserve findByD command. (Be aware that the output is very large, so you might consider redirecting the output to a file using the > operator.)

```bash
C:\fsutil storagereserve findbyGrid c: 2
...
******** File 0x00020000000018762 *******
File reference number :   0x00020000000018762
File attributes :    0x000000020: Archive
File entry flags :    0x00000000
Link (PathName: Name) :  0x0000000010000001165: NTFS Name :      _
Windows\System32\winnet\Loop_001Alerts.exevt
Link (ParentID: Name) :  0x000100000000001165: DOS Name :   :OALERT-1.EVT
Creation Time :   12/9/2018 3:26:55
Last Access Time :  12/10/2018 0:21:57
Last Write Time :  12/10/2018 0:21:57
Change Time :     12/10/2018 0:21:57
LastUn :      44,846,752
OwnerId :        0
SecurityId :     551
```

CHAPTER 11   Caching and file systems     687


---

```bash
StorageReserveId         : 2
  Stream                   : 0x010   ::$STANDARD_INFORMATION
     Attributes               : 0x00000000: *NONE*
     Flags                   : 0x0000000c: Resident | No clusters allocated
     Size                   : 72
     Allocated Size      : 72
    Stream                   : 0x030  ::$FILE_NAME
     Attributes               : 0x00000000: *NONE*
     Flags                   : 0x0000000c: Resident | No clusters allocated
     Size                   : 90
     Allocated Size      : 96
    Stream                   : 0x030  ::$FILE_NAME
     Attributes               : 0x00000000: *NONE*
     Flags                   : 0x0000000c: Resident | No clusters allocated
     Size                   : 90
     Allocated Size      : 96
    Stream                   : 0x080  ::$DATA
     Attributes               : 0x00000000: *NONE*
     Flags                   : 0x00000000: *NONE*
     Size                   : 69,632
     Allocated Size      : 69,632
     Extents                : 1 Extents
                          : 1: VCN: 0 Clusters: 17 LCN: 3,820,235
```

## Transaction support

By leveraging the Kernel Transaction Manager (KTM) support in the kernel, as well as the facilities provided by the Common Log File System, NTFS implements a transactional model called transactional NTFS or TxF. TxF provides a set of user-mode APIs that applications can use for transacted operations on their files and directories and also a file system control (FSCTL) interface for managing its resource managers.

![Figure](figures/Winternals7thPt2_page_719_figure_003.png)

Note Windows Vista added the support for TxF as a means to introduce atomic transactions to Windows. The NTFS driver was modified without actually changing the format of the NTFS data structures, which is why the NTFS format version number, 3.1, is the same as it has been since Windows XP and Windows Server 2003. TxF achieves backward compatibility by reusing the attribute type ($LOGGED_UTILITY_STREAM) that was previously used only for EFS support instead of adding a new one.

T xF is a powerful API, but due to its complexity and various issues that developers need to consider, they have been adopted by a low number of applications. At the time of this writing, Microsoft is considering deprecating T xF APIs in a future version of Windows. For the sake of completeness, we present only a general overview of the T xF architecture in this book.

The overall architecture for TxF, shown in Figure 11-54, uses several components:

- • Transacted APIs implemented in the Kernel32.dll library

• A library for reading TxF logs (%SystemRoot(%System32\Txfw32.dll)
688      CHAPTER 11   Caching and file systems


---

- • A COM component for TxF logging functionality (%SystemRoot\System32\TxFlog.dll)

• The transactional NTFS library inside the NTFS driver

• The CLFS infrastructure for reading and writing log records
![Figure](figures/Winternals7thPt2_page_720_figure_001.png)

FIGURE 11-54 TxF architecture.

## Isolation

Although transactional file operations are opt-in, just like the transactional registry (TxR) operations described in Chapter 10, TxF has an effect on regular applications that are not transaction-aware because it ensures that the transactional operations are isolated. For example, if an antivirus program is scanning a file that's currently being modified by another application via a transacted operation, TxF must ensure that the scanner reads the pretransaction data, while applications that access the file within the transaction work with the modified data. This model is called read-committed isolation.

Read-committed isolation involves the concept of transacted writers and transacted readers. The former always view the most up-to-date version of a file, including all changes made by the transaction that is currently associated with the file. At any given time, there can be only one transacted writer for a file, which means that its write access is exclusive. Transacted readers, on the other hand, have access only to the committed version of the file at the time they open the file. They are therefore isolated from changes made by transacted writers. This allows for readers to have a consistent view of a file, even when a transacted writer commits its changes. To see the updated data, the transacted reader must open a new handle to the modified file.

Nontransacted writers, on the other hand, are prevented from opening the file by both transacted writers and transacted readers, so they cannot make changes to the file without being part of the transaction. Nontransacted readers act similarly to transacted readers in that they see only the file contents that were last committed when the file handle was open. Unlike transacted readers, however, they do not receive read-committed isolation, and as such they always receive the updated view of the latest committed version of a transacted file without having to open a new file handle. This allows nontransaction-aware applications to behave as expected.

CHAPTER 11   Caching and file systems      689


---

To summarize, TxF's read-committed isolation model has the following characteristics:

- ■ Changes are isolated from transacted readers.
■ Changes are rolled back (undone) if the associated transaction is rolled back, if the machine
crashes, or if the volume is forcibly dismounted.
■ Changes are flushed to disk if the associated transaction is committed.
## Transactional APIs

TxF implements transacted versions of the Windows file I/O APIs, which use the suffix Transacted:

- ■ Create APIs
CreateDirectoryTransacted, CreateFileTransacted, CreateHardLinkTransacted,
CreateSymbolicLinkTransacted

■ Find APIs
FindFirstFileNameTransacted, FindFirstFileTransacted, FindFirstStreamTransacted

■ Query APIs
GetCompressedFileSizeTransacted, GetFileAttributesTransacted,
GetFullPathNameTransacted, GetLongPathNameTransacted

■ Delete APIs
DeleteFileTransacted, RemoveDirectoryTransacted

■ Copy and Move/Rename APIs
CopyFileTransacted, MoveFileTransacted

■ Set APIs
SetFileAttributesTransacted
In addition, some APIs automatically participate in transacted operations when the file handle they

are passed is part of a transaction, like one created by the CreateFileTransacted API. Table 11-10 lists

Windows APIs that have modified behavior when dealing with a transacted file handle.

TABLE 11-10 API behavior changed by TxF

<table><tr><td>API Name</td><td>Change</td></tr><tr><td>CloseHandle</td><td>Transactions aren&#x27;t committed until all applications close transacted handles to the file.</td></tr><tr><td>CreateFileMapping, MapViewOfFile</td><td>Modifications to mapped views of a file part of a transaction are associated with the transaction themselves.</td></tr><tr><td>FindNextFile, ReadDirectoryChanges, GetInformationByHandle, GetFileSize</td><td>If the file handle is part of a transaction, read-isolation rules are applied to these operations.</td></tr><tr><td>GetVolumeInformation</td><td>Function returns FILE_SUPPORTS_TRANSACTIONS if the volume supports TAF.</td></tr><tr><td>ReadFile, WriteFile</td><td>Read and write operations to a transacted file handle are part of the transaction.</td></tr><tr><td>SetFileInformationByHandle</td><td>Changes to the FileBasicInfo, FileRenameInfo, FileAllocationInfo, FileEndOfFileInfo, and FileDispositionInfo classes are transacted if the file handle is part of a transaction.</td></tr><tr><td>SetEndOfFile, SetFileShortName, SetFileTime</td><td>Changes are transacted if the file handle is part of a transaction.</td></tr></table>


690     CHAPTER 11   Caching and file systems


---

## On-disk implementation

As shown earlier in Table 11-7, TxF uses the $LOGGED_UTILITY_STREAM attribute type to store additional data for files and directories that are or have been part of a transaction. This attribute is called $TXF_DATA and contains important information that allows TxF to keep active offline data for a file part of a transaction. The attribute is permanently stored in the MFT; that is, even after the file is no longer part of a transaction, the stream remains, for reasons explained soon. The major components of the attribute are shown in Figure 11-55.

<table><tr><td>File record number of RM root</td></tr><tr><td>Flags</td></tr><tr><td>TxF file ID (TxFID)</td></tr><tr><td>LSN for NTFS metadata</td></tr><tr><td>LSN for user data</td></tr><tr><td>LSN for directory index</td></tr><tr><td>USN index</td></tr></table>


FIGURE 11-55 $TXF_DATA attribute.

The first field shown is the file record number of the root of the resource manager responsible for

the transaction associated with this file. For the default resource manager, the file record number is 5,

which is the file record number for the root directory (\) in the MFT, as shown earlier in Figure 11-31.

TxF needs this information when it creates an FCB for the file so that it can link it to the correct resource

manager, which in turn needs to create an enlistment for the transaction when a transacted file request

is received by NTFS.

Another important piece of data stored in the $TXF_DATA attribute is the TxF file ID, or TxID, and this explains why $TXF_DATA attributes are never deleted. Because NTFS writes file names to its records when writing to the transaction log, it needs a way to uniquely identify files in the same directory that may have had the same name. For example, if sample.txt is deleted from a directory in a transaction and later a new file with the same name is created in the same directory (and as part of the same transaction), TxF needs a way to uniquely identify the two instances of sample.txt. This identification is provided by a 64-bit unique number, the TxID, that TxF increments when a new file (or an instance of a file) becomes part of a transaction. Because they can never be reused, TxIDs are permanent, so the $TXF_DATA attribute will never be removed from a file.

Last but not least, three CLFS (Common Logging File System) LSNs are stored for each file part of a transaction. Whenever a transaction is active, such as during create, rename, or write operations, TxF writes a log record to its CLFS log. Each record is assigned an LSN, and that LSN gets written to the appropriate field in the $TXF_DATA attribute. The first LSN is used to store the log record that identifies the changes to NTFS metadata in relation to this file. For example, if the standard attributes of a file are changed as part of a transacted operation, TxF must update the relevant MFT file record, and the LSN for the log record describing the change is stored. TxF uses the second LSN when the file's data is modified. Finally, TxF uses the third LSN when the file name index for the directory requires a change related to a transaction the file took part in, or when a directory was part of a transaction and received a TxDI.

CHAPTER 11    Caching and file systems      691


---

The $TXF_DATA attribute also stores internal flags that describe the state information to TxF and the index of the USN record that was applied to the file on commit. A TxF transaction can span multiple USN records that may have been partly updated by NTFS's recovery mechanism (described shortly), so the index tells TxF how many more USN records must be applied after a recovery.

TxF uses a default resource manager, one for each volume, to keep track of its transactional state.

TxF, however, also supports additional resource managers called secondary resource managers. These

resource managers can be defined by application writers and have their metadata located in any

directory of the application's choosing, defining their own transactional work units for undo, backup,

restore, and redo operations. Both the default resource manager and secondary resource managers

contain a number of metadata files and directories that describe their current state:

- ■ The $Txf directory, located into $Xtend\$.RmMetadata directory, which is where files are linked
when they are deleted or overwritten by transactional operations.
■ The $Tops, or Txf Old Page Stream (TOPS) file, which contains a default data stream and an al-
ternate data stream called $T. The default stream for the TOPS file contains metadata about the
resource manager, such as its GUID, its CLFS log policy, and the LSN at which recovery should
start. The $T stream contains file data that is partially overwritten by a transactional writer (as
opposed to a full overwrite, which would move the file into the $Txf directory).
■ The Txf log files, which are CLFS log files storing transaction records. For the default resource
manager, these files are part of the $TxfLog directory, but secondary resource managers can
store them anywhere. Txf uses a multiplier base log file called $TxfLog.bfl. The file $Xtend\
\$RmMetadata\$.TxfLog.\$.TxfLog contains two streams: the KtmLog stream used for Kernel
Transaction Manager metadata records, and the TxfLog stream, which contains the Txf
log records.
## EXPERIMENT: Querying resource manager information

You can use the built-in Futlit eXe command-line program to query information about the default resource manager as well as to create, start, and stop secondary resource managers and configure their logging policies and behaviors. The following command queries information about the default resource manager, which is identified by the root directory (\):

```bash
d:\fsutil resource info \
Resource Manager Identifier :   81E83020-E6FB-11E8-8B62-D89EF3A38A7
KTM Log Path for RM: \Device\HarddiskVolume8,$Extend\$RMMetadata,$TxfLog$\Txflog::KtmLog
Space used by TOPS:   1 Mb
TOPS free space:     100%
RM State:              Active
Running transactions: 0
One phase commits:      0
Multiple phase commits:    0
System initiated rollbacks: 0
Age of oldest transaction: 00:00:00
Logging Mode:       Simple
Number of containers: 2
```

692     CHAPTER 11   Caching and file systems


---

```bash
Container size:      10 Mb
Total log capacity:   20 Mb
Total free log space:  19 Mb
Minimum containers:    1
Maximum containers:    20
Log growth increment:  2 container(s)
Auto shrink:          Not enabled
```

RM prefers availability over consistency.

As mentioned, the fsutil resource command has many options for configuring T x resource

managers, including the ability to create a secondary resource manager in any directory of your

choice. For example, you can use the fsutil resource create c:\rmtree command to create a

secondary resource manager in the Rmtree directory, followed by the fsutil resource start

c:\rmtree command to initiate it. Note the presence of the $T ops and $T xtLogContainer* files

and of the T xtLog and $T xt directories in this folder.

## Logging implementation

As mentioned earlier, each time a change is made to the disk because of an ongoing transaction, TxF writes a record of the change to its log. TxF uses a variety of log record types to keep track of transactional changes, but regardless of the record type, all TxF log records have a generic header that contains information identifying the type of the record, the action related to the record, the TxDI that the record applies to, and the GUID of the KTM transaction that the record is associated with.

A redo record specifies how to reapply a change part of a transaction that's already been committed to the volume if the transaction has actually never been flushed from cache to disk. An undo record, on the other hand, specifies how to reverse a change part of a transaction that hasn't been committed at the time of a rollback. Some records are redo-only, meaning they don't contain any equivalent undo data, whereas other records contain both redo and undo information.

Through the TOPS file, TxF maintains two critical pieces of data, the base LSN and the restart LSN.

The base LSN determines the LSN of the first valid record in the log, while the restart LSN indicates

at which LSN recovery should begin when starting the resource manager. When TxF writes a restart

record, it updates these two values, indicating that changes have been made to the volume and flushed

out to disk—meaning that the file system is fully consistent up to the new restart LSN.

TXF also writes compensating log records, or CLRs. These records store the actions that are being performed during transaction rollback. They're primarily used to store the undo-next LSN, which allows the recovery process to avoid repeated undo operations by bypassing undo records that have already been processed, a situation that can happen if the system fails during the recovery phase and has already performed part of the undo pass. Finally, TXf also deals with prepare records, abort records, and commit records, which describe the state of the KTM transactions related to TXF.

CHAPTER 11   Caching and file systems     693


---

NTFS recovery support

NTFS recovery support ensures that if a power failure or a system failure occurs, no file system operations (transactions) will be left incomplete, and the structure of the disk volume will remain intact without the need to run a disk repair utility. The NTFS Chkdsk utility is used to repair catastrophic disk corruption caused by I/O errors (bad disk sectors, electrical anomalies, or disk failures, for example) or software bugs. But with the NTFS recovery capabilities in place, Chkdsk is rarely needed.

As mentioned earlier (in the section "Recoverability"), NTFS uses a transaction-processing scheme to implement recoverability. This strategy ensures a full disk recovery that is also extremely fast (on the order of seconds) for even the largest disks. NTFS limits its recovery procedures to file system data to ensure that at the very least the user will never lose a volume because of a corrupted file system; however, unless an application takes specific action (such as flushing cached files to disk), NTFS's recovery support doesn't guarantee user data to be fully updated if a crash occurs. This is the job of transactional NTFS (TxF).

The following sections detail the transaction-logging scheme NTFS uses to record modifications to

file system data structures and explain how NTFS recovers a volume if the system fails.

## Design

NTFS implements the design of a recoverable file system. These file systems ensure volume consistency by

using logging techniques (sometimes called journaling) originally developed for transaction processing.

If the operating system crashes, the recoverable file system restores consistency by executing a recovery

procedure that accesses information that has been stored in a log file. Because the file system has logged

its disk writes, the recovery procedure takes only seconds, regardless of the size of the volume (unlike

in the FAT file system, where the repair time is related to the volume size). The recovery procedure for a

recoverable file system is exact, guaranteeing that the volume will be restored to a consistent state.

A recoverable file system incurs some costs for the safety it provides. Every transaction that alters the volume structure requires that one record be written to the log file for each of the transaction's suboperations. This logging overhead is ameliorated by the file system's batching of log records—writing many records to the log file in a single I/O operation. In addition, the recoverable file system can employ the optimization techniques of a lazy write file system. It can even increase the length of the intervals between cache flushes because the file system metadata can be recovered if the system crashes before the cache changes have been flushed to disk. This gain over the caching performance of lazy write file systems makes up for, and often exceeds, the overhead of the recoverable file system's logging activity.

Neither careful write nor lazy write file systems guarantee protection of user file data. If the system crashes while an application is writing a file, the file can be lost or corrupted. Worse, the crash can corrupt a lazy write file system, destroying existing files or even rendering an entire volume inaccessible.

The NTFS recoverable file system implements several strategies that improve its reliability over that of the traditional file systems. First, NTFS recoverability guarantees that the volume structure won't be corrupted, so all files will remain accessible after a system failure. Second, although NTFS doesn't guarantee protection of user data in the event of a system crash—some changes can be lost from the

---

cache—applications can take advantage of the NTFS write-through and cache-flushing capabilities to ensure that file modifications are recorded on disk at appropriate intervals.

Both cache write-through—forcing write operations to be immediately recorded on disk—and cache flushing—forcing cache contents to be written to disk—are efficient operations. NTFS doesn't have to do extra disk I/O to flush modifications to several different file system data structures because changes to the data structures are recorded—in a single write operation—in the log file, if a failure occurs and cache contents are lost, the file system modifications can be recovered from the log. Furthermore, unlike the FAT file system, NTFS guarantees that user data will be consistent and available immediately after a write-through operation or a cache flush, even if the system subsequently fails.

## Metadata logging

NTFS provides file system recoverability by using the same logging technique used by TxF, which consists of recording all operations that modify file system metadata to a log file. Unlike TxF, however, NTFS's built-in file system recovery support doesn't make use of CLFS but uses an internal logging implementation called the log file service (which is not a background service process as described in Chapter 10). Another difference is that while TxF is used only when callers opt in for transacted operations, NTFS records all metadata changes so that the file system can be made consistent in the face of a system failure.

## Log file service

The log file service (LFS) is a series of kernel-mode routines inside the NTFS driver that NTFS uses to access the log file. NTFS passes the LFS a pointer to an open file object, which specifies a log file to be accessed. The LFS either initializes a new log file or calls the Windows cache manager to access the existing log file through the cache, as shown in Figure 11-56. Note that although LFS and CLFS have similar sounding names, they're separate logging implementations used for different purposes, although their operation is similar in many ways.

![Figure](figures/Winternals7thPt2_page_726_figure_006.png)

FIGURE 11-56 Log file service (LFS).

CHAPTER 11   Caching and file systems     695


---

The LFS divides the log file into two regions: a restart area and an "infinite" logging area, as shown in Figure 11-57.

![Figure](figures/Winternals7thPt2_page_727_figure_001.png)

FIGURE 11-57 Log file regions.

NTFS calls the LFS to read and write the restart area. NTFS uses the restart area to store context information such as the location in the logging area at which NTFS begins to read during recovery after a system failure. The LFS maintains a second copy of the restart data in case the first becomes corrupted or otherwise inaccessible. The remainder of the log file is the logging area, which contains transaction records NTFS writes to recover a volume in the event of a system failure. The LFS makes the log file appear infinite by reusing it circularly (while guaranteeing that it doesn't overwrite information it needs). Just like CLFS, the LFS uses LSNs to identify records written to the log file. As the LFS cycles through the file, it increases the values of the LSNs. NTFS uses 64 bits to represent LSNs, so the number of possible LSNs is so large as to be virtually infinite.

NTFS never reads transactions from or writes transactions to the log file directly. The LFS provides

services that NTFS calls to open the log file, write log records, read log records in forward or backward

order, flush log records up to a specified LSN, or set the beginning of the log file to a higher LSN. During

recovery, NTFS calls the LFS to perform the same actions as described in the TxF recovery section: a redo

pass for nonflushed committed changes, followed by an undo pass for noncommitted changes.

Here's how the system guarantees that the volume can be recovered:

- 1. NTFS first calls the LFS to record in the (cached) log file any transactions that will modify the

volume structure.

2. NTFS modifies the volume (also in the cache).

3. The cache manager prompts the LFS to flush the log file to disk. (The LFS implements the flush

by calling the cache manager back, telling it which pages of memory to flush. Refer back to the

calling sequence shown in Figure 11-56.)

4. After the cache manager flushes the log file to disk, it flushes the volume changes (the meta-

data operations themselves) to disk.
These steps ensure that if the file system modifications are ultimately unsuccessful, the corresponding transactions can be retrieved from the log file and can be either redone or undone as part of the file system recovery procedure.

---

File system recovery begins automatically the first time the volume is used after the system is rebooted. NTFS checks whether the transactions that were recorded in the log file before the crash were applied to the volume, and if they weren't, it restores them. NTFS also guarantees that transactions not completely logged before the crash are undone so that they don't appear on the volume.

## Log record types

The NTFS recovery mechanism uses similar log record types as the TxF recovery mechanism: update records, which correspond to the redo and undo records that TxF uses, and checkpoint records, which are similar to the restart records used by TxF. Figure 11-58 shows three update records in the log file. Each record represents one suboperation of a transaction, creating a new file. The redo entry in each update record tells NTFS how to reapply the suboperation to the volume, and the undo entry tells NTFS how to roll back (undo) the suboperation.

![Figure](figures/Winternals7thPt2_page_728_figure_003.png)

FIGURE 11-58 Update records in the log file.

After logging a transaction (in this example, by calling the LFS to write the three update records to the log file), NTFS performs the suboperations on the volume itself, in the cache. When it has finished updating the cache, NTFS writes another record to the log file, recording the entire transaction as complete—a suboperation known as committing a transaction. Once a transaction is committed, NTFS guarantees that the entire transaction will appear on the volume, even if the operating system subsequently fails.

When recovering after a system failure, NTFS reads through the log file and recedes each committed transaction. Although NTFS completed the committed transactions from before the system failure, it doesn't know whether the cache manager flushed the volume modifications to disk in time. The updates might have been lost from the cache when the system failed. Therefore, NTFS executes the committed transactions again just to be sure that the disk is up to date.

After redoing the committed transactions during a file system recovery, NTFS locates all the transactions in the log file that weren't committed at failure and rolls back each suboperation that had been logged. In Figure 11-58, NTFS would first undo the T1c suboperation and then follow the backward pointer to T1b and undo that suboperation. It would continue to follow the backward pointers, undoing suboperations, until it reached the first suboperation in the transaction. By following the pointers, NTFS knows how many and which update records it must undo to roll back a transaction.

CHAPTER 11   Caching and file systems      697


---

Redo and undo information can be expressed either physically or logically. As the lowest layer of

software maintaining the file system structure, NTFS writes update records with physical descriptions that

specify volume updates in terms of particular byte ranges on the disk that are to be changed, moved,

and so on, unlike IxF, which uses logical descriptions that express updates in terms of operations such as

"delete file A.dat". NTFS writes update records (usually several) for each of the following transactions:

- ● Creating a file

● Deleting a file

● Extending a file

● Truncating a file

● Setting file information.

● Renaming a file

● Changing the security applied to a file
The redo and undo information in an update record must be carefully designed because although NTFS undoes a transaction, recovers from a system failure, or even operates normally, it might try to redo a transaction that has already been done or, conversely, to undo a transaction that never occurred or that has already been undone. Similarly, NTFS might try to redo or undo a transaction consisting of several update records, only some of which are complete on disk. The format of the update records must ensure that executing redundant redo or undo operations is idempotent—that is, has a neutral effect. For example, setting a bit that is already set has no effect, but toggling a bit that has already been toggled does. The file system must also handle intermediate volume states correctly.

In addition to update records, NTFS periodically writes a checkpoint record to the log file, as illustrated in Figure 11-59.

![Figure](figures/Winternals7thPt2_page_729_figure_004.png)

FIGURE 11-59 Checkpoint record in the log file.

A checkpoint record helps NTFS determine what processing would be needed to recover a volume if a crash were to occur immediately. Using information stored in the checkpoint record, NTFS knows, for example, how far back in the log file it must go to begin its recovery. After writing a checkpoint record, NTFS stores the LSN of the record in the restart area so that it can quickly find its most recently written checkpoint record when it begins file system recovery after a crash occurs; this is similar to the restart LSN used by TxF for the same reason.

---

Although the LFS presents the log file to NTFS as if it were infinitely large, it isn't. The generous size

of the log file and the frequent writing of checkpoint records (an operation that usually frees up space

in the log file) make the possibility of the log file filling up a remote one. Nevertheless, the LFS, just like

CLFS, accounts for this possibility by tracking several operational parameters:

- ■ The available log space

■ The amount of space needed to write an incoming log record and to undo the write, should
that be necessary

■ The amount of space needed to roll back all active (noncommitted) transactions, should that
be necessary
If the log file doesn't contain enough available space to accommodate the total of the last two items, the LFS returns a "log file full" error, and NTFS raises an exception. The NTFS exception handler rolls back the current transaction and places it in a queue to be restarted later.

To free up space in the log file, NTFS must momentarily prevent further transactions on files. T o

do so, NTFS blocks file creation and deletion and then requests exclusive access to all system files and

shared access to all user files. Gradually, active transactions either are completed successfully or receive

the "log file full" exception. NTFS rolls back and queues the transactions that receive the exception.

Once it has blocked transaction activity on files as just described, NTFS calls the cache manager to flush unwritten data to disk, including unwritten log file data. After everything is safely flushed to disk, NTFS no longer needs the data in the log file. It resets the beginning of the log file to the current position, making the log file "empty." Then it restarts the queued transactions. Beyond the short pause in I/O processing, the log file full error has no effect on executing programs.

This scenario is one example of how NTFS uses the log file not only for file system recovery but also for error recovery during normal operation. You find out more about error recovery in the following section.

## Recovery

NTFS automatically performs a disk recovery the first time a program accesses an NTFS volume after the system has been booted. (If no recovery is needed, the process is trivial.) Recovery depends on two tables NTFS maintains in memory: a transaction table, which behaves just like the one TxF maintains, and a dirty page table, which records which pages in the cache contain modifications to the file system structure that haven't yet been written to disk. This data must be flushed to disk during recovery.

NTFS writes a checkpoint record to the log file once every 5 seconds. Just before it does, it calls the LFS to store a current copy of the transaction table and of the dirty page table in the log file. NTFS then records in the checkpoint record the LSNs of the log records containing the copied tables. When recovery begins after a system failure, NTFS calls the LFS to locate the log records containing the most recent checkpoint record and the most recent copies of the transaction and dirty page tables. It then copies the tables to memory.

The log file usually contains more update records following the last checkpoint record. These update records represent volume modifications that occurred after the last checkpoint record was

CHAPTER 11   Caching and file systems      699


---

written. NTFS must update the transaction and dirty page tables to include these operations. After updating the tables, NTFS uses the tables and the contents of the log file to update the volume itself.

To perform its volume recovery, NTFS scans the log file three times, loading the file into memory

during the first pass to minimize disk I/O. Each pass has a particular purpose:

- 1. Analysis

2. Redoing transactions

3. Undoing transactions
## Analysis pass

During the analysis pass, as shown in Figure 11-60, NTFS scans forward in the log file from the beginning of the last checkpoint operation to find update records and use them to update the transaction and dirty page tables it copied to memory. Notice in the figure that the checkpoint operation stores three records in the log file and that update records might be interspersed among these records. NTFS therefore must start its scan at the beginning of the checkpoint operation.

![Figure](figures/Winternals7thPt2_page_731_figure_005.png)

FIGURE 11-60 Analysis pass.

Most update records that appear in the log file after the checkpoint operation begins represent a modification to either the transaction table or the dirty page table. If an update record is a "transaction committed" record, for example, the transaction the record represents must be removed from the transaction table. Similarly, if the update record is a page update record that modifies a file system data structure, the dirty page table must be updated to reflect that change.

Once the tables are up to date in memory, NTFS scans the tables to determine the LSN of the oldest update record that logs an operation that hasn't been carried out on disk. The transaction table contains the LSNs of the noncommitted (incomplete) transactions, and the dirty page table contains the LSNs of records in the cache that haven't been flushed to disk. The LSN of the oldest update record that NTFS finds in these two tables determines where the redo pass will begin. If the last checkpoint record is older, however, NTFS will start the redo pass there instead.

![Figure](figures/Winternals7thPt2_page_731_figure_009.png)

Note: the TxF recovery model, there is no distinct analysis pass. Instead, as described in the TxF recovery section, TxF performs the equivalent work in the redo pass.

---

## Redo pass

During the redo pass, as shown in Figure 11-61, NTFS scans forward in the log file from the LSN of the

oldest update record, which it found during the analysis pass. It looks for page update records, which

contain volume modifications that were written before the system failure but that might not have been

flushed to disk. NTFS restores these updates in the cache.

![Figure](figures/Winternals7thPt2_page_732_figure_002.png)

FIGURE 11-61 Redo pass.

When NTFS reaches the end of the log file, it has updated the cache with the necessary volume modifications, and the cache manager‛s lazy writer can begin writing cache contents to disk as the background.

## Undo pass

After it completes the redo pass, NTFS begins its undo pass, in which it rolls back any transactions that

weren't committed when the system failed. Figure 11-62 shows two transactions in the log file: transac tion 1 was committed before the power failure, but transaction 2 wasn't. NTFS must undo transaction 2.

![Figure](figures/Winternals7thPt2_page_732_figure_007.png)

FIGURE 11-62 Undo pass.

Suppose that transaction 2 created a file, an operation that comprises three suboperations, each with its own update record. The update records of a transaction are linked by backward pointers in the log file because they aren't usually contiguous.

The NTFS transaction table lists the LSN of the last-logged update record for each noncommitted transaction. In this example, the transaction table identifies LSN 4049 as the last update record logged for transaction 2. As shown from right to left in Figure 11-63, NTFS rolls back transaction 2.

CHAPTER 11   Caching and file systems      701


---

![Figure](figures/Winternals7thPt2_page_733_figure_000.png)

FIGURE 11-63 Undoing a transaction.

After locating LSN 4049, NTFS finds the undo information and executes it, cleaning bits 3 through 9 in its allocation bitmap. NTFS then follows the backward pointer to LSN 4048, which directs it to remove the new file name from the appropriate file name index. Finally, it follows the last backward pointer and deallocates the MFT file record reserved for the file, as the update record with LSN 4046 specifies. Transaction 2 is now rolled back. If there are other noncommitted transactions to undo, NTFS follows the same procedure to roll them back. Because undoing transactions affects the volume's file system structure, NTFS must log the undo operations in the log file. After all, the power might fail again during the recovery, and NTFS would have to redo its undo operations!

When the undo pass of the recovery is finished, the volume has been restored to a consistent state.

At this point, NTFS is prepared to flush the cache changes to disk to ensure that the volume is up to

date. Before doing so, however, it executes a callback that TxF registers for notifications of LFS flushes.

Because TxF and NTFS both use write-ahead logging, TxF must flush its log through CLFS before the

NTFS log is flushed to ensure consistency of its own metadata. (And similarly, the TOPS file must be

flushed before the CLFS-managed log files.) NTFS then writes an "empty" LFS restart area to indicate

that the volume is consistent and that no recovery need be done if the system should fail again imme diately. Recovery is complete.

NTFS guarantees that recovery will return the volume to some preexisting consistent state, but not necessarily to the state that existed just before the system crash. NTFS can't make that guarantee because, for performance, it uses a lazy commit algorithm, which means that the log file isn't immediately flushed to disk each time a transaction committed record is written. Instead, numerous transaction committed records are batched and written together, either when the cache manager calls the LFS to flush the log file to disk or when the LFS writes a checkpoint record (once every 5 seconds) to the log file. Another reason the recovered volume might not be completely up to date is that several parallel transactions might be active when the system crashes, and some of their transaction committed records might make it to disk, whereas others might not. The consistent volume that recovery produces includes all the volume updates whose transaction committed records made it to disk and none of the updates whose transaction committed records didn't make it to disk.

---

NTFS uses the log file to recover a volume after the system fails, but it also takes advantage of an important freebie it gets from logging transactions. File systems necessarily contain a lot of code devoted to recovering from file system errors that occur during the course of normal file I/O. Because NTFS logs each transaction that modifies the volume structure, it can use the log file to recover when a file system error occurs and thus can greatly simplify its error handling code. The log file full error described earlier is one example of using the log file for error recovery.

Most I/O errors that a program receives aren't file system errors and therefore can't be resolved entirely by NTFS. When called to create a file, for example, NTFS might begin by creating a file record in the MFT and then enter the new file's name in a directory index. When it tries to allocate space for the file in its bitmap, however, it could discover that the disk is full and the create request can't be completed. In such a case, NTFS uses the information in the log file to undo the part of the operation it has already completed and to deallocate the data structures it reserved for the file. Then it returns a disk full error to the caller, which in turn must respond appropriately to the error.

## NTFS bad-cluster recovery

The volume manager included with Windows (VolMgr) can recover data from a bad sector on a fault-tolerant volume, but if the hard disk doesn't perform bad-sector remapping or runs out of spare sectors, the volume manager can't perform bad-sector replacement to replace the bad sector. When the file system reads from the sector, the volume manager instead recovers the data and returns the warning to the file system that there is only one copy of the data.

The FAT file system doesn't respond to this volume manager warning. Moreover, neither FAT nor the volume manager keeps track of the bad sectors, so a user must run the Chkdsk or Format utility to prevent the volume manager from repeatedly recovering data for the file system. Both Chkdsk and Format are less than ideal for removing bad sectors from use. Chkdsk can take a long time to find and remove bad sectors, and Format wipes all the data off the partition it's formatting.

In the file system equivalent of a volume manager's bad-sector replacement, NTFS dynamically replaces the cluster containing a bad sector and keeps track of the bad cluster so that it won't be reused. (Recall that NTFS maintains portability by addressing logical clusters rather than physical sectors.) NTFS performs these functions when the volume manager can't perform bad-sector replacement. When a volume manager returns a bad-sector warning or when the hard disk driver returns a bad-sector error, NTFS allocates a new cluster to replace the one containing the bad sector. NTFS copies the data that the volume manager has recovered into the new cluster to reestablish data redundancy.

Figure 11-64 shows an MFT record for a user file with a bad cluster in one of its data runs as it existed before the cluster went bad. When it receives a bad-sector error, NTFS reassigns the cluster containing the sector to its bad-cluster file, SBadClus. This prevents the bad cluster from being allocated to another file. NTFS then allocates a new cluster for the file and changes the file's VCN-to-LCN mappings to point to the new cluster. This bad-cluster remapping (introduced earlier in this chapter) is illustrated in Figure 11-64. Cluster number 1357, which contains the bad sector, must be replaced by a good cluster.

CHAPTER 11   Caching and file systems      703


---

![Figure](figures/Winternals7thPt2_page_735_figure_000.png)

FIGURE 11-64 MFT record for a user file with a bad cluster.

Bad-sector errors are undesirable, but when they do occur, the combination of NTFS and the

volume manager provides the best possible solution. If the bad sector is on a redundant volume,

the volume manager recovers the data and replaces the sector if it can. If it can't replace the sector,

it returns a warning to NTFS, and NTFS replaces the cluster containing the bad sector.

If the volume isn't configured as a redundant volume, the data in the bad sector can't be recovered. When the volume is formatted as a FAT volume and the volume manager can't recover the data, reading from the bad sector yields indeterminate results. If some of the file system's control structures reside in the bad sector, an entire file or group of files (or potentially, the whole disk) can be lost. At best, some data in the affected file (often, all the data in the file beyond the bad sector) is lost. Moreover, the FAT file system is likely to reallocate the bad sector to the same or another file on the volume, causing the problem to resurface.

Like the other file systems, NTFS can't recover data from a bad sector without help from a volume manager. However, NTFS greatly contains the damage a bad sector can cause. If NTFS discovers the bad sector during a read operation, it remaps the cluster the sector is in, as shown in Figure 11-65. If the volume isn't configured as a redundant volume, NTFS returns a data read error to the calling program. Although the data that was in that cluster is lost, the rest of the file—and the file system—remains intact; the calling program can respond appropriately to the data loss, and the bad cluster won't be reused in future allocations. If NTFS discovers the bad cluster on a write operation rather than a read, NTFS remaps the cluster before writing and thus loses no data and generates no error.

The same recovery procedures are followed if file system data is stored in a sector that goes bad.


If the bad sector is on a redundant volume, NTFS replaces the cluster dynamically, using the data

recovered by the volume manager. If the volume isn't redundant, the data can't be recovered, so NTFS

sets a bit in the $Volume metadata file that indicates corruption on the volume. The NTFS Chkdsk utility

checks this bit when the system is next rebooted, and if the bit is set, Chkdsk executes, repairing the file

system corruption by reconstructing the NTFS metadata.

---

![Figure](figures/Winternals7thPt2_page_736_figure_000.png)

FIGURE 11-65 Bad-cluster remapping.

In rare instances, file system corruption can occur even on a fault-tolerant disk configuration. A double error can destroy both file system data and the means to reconstruct it. If the system crashes while NTFS is writing the mirror copy of an MFT file record—of a file name index or of the log file, for example—the mirror copy of such file system data might not be fully updated. If the system were rebooted and a bad-sector error occurred on the primary disk at exactly the same location as the incomplete write on the disk mirror, NTFS would be unable to recover the correct data from the disk mirror. NTFS implements a special scheme for detecting such corruptions in file system data. If it ever finds an inconsistency, it sets the corruption bit in the volume file, which causes Chkdsk to reconstruct the NTFS metadata when the system is next rebooted. Because file system corruption is rare on a fault-tolerant disk configuration, Chkdsk is seldom needed. It is supplied as a safety precaution rather than as a firstline data recovery strategy.

The use of Chkdsk on NTFS is vastly different from its use on the FAT file system. Before writing anything to disk, FAT sets the volume's dirty bit and then resets the bit after the modification is complete. If any I/O operation is in progress when the system crashes, the dirty bit is left set and Chkdsk runs when the system is rebooted. On NTFS, Chkdsk runs only when unexpected or unreadable file system data is found, and NTFS can't recover the data from a redundant volume or from redundant file system structures on a single volume. (The system boot sector is duplicated—in the last sector

CHAPTER 11   Caching and file systems      705


---

of a volume—as are the parts of the MFT ($MtMirr) required for booting the system and running the NTFS recovery procedure. This redundancy ensures that NTFS will always be able to boot and recover itself.)

Table 11-11 summarizes what happens when a sector goes bad on a disk volume formatted for one of the Windows-supported file systems according to various conditions we've described in this section.

TABLE 11-11 Summary of NTFS data recovery scenarios

<table><tr><td>Scenario</td><td>With a Disk That Supports Bad-Sector Remapping and Has Spare Sectors</td><td>With a Disk That Does Not Perform Bad-Sector Remapping or Has No Spare Sectors</td></tr><tr><td>Fault-tolerant volume$^{1}$</td><td>1. Volume manager recovers the data.2. Volume manager performs bad-sector replacement.3. File system remains unaware of the error.</td><td>1. Volume manager recovers the data.2. Volume manager sends the data and a bad-sector error to the file system.3. NTFS performs cluster remapping.</td></tr><tr><td>Non-fault-tolerant volume</td><td>1. Volume manager can&#x27;t recover the data.2. Volume manager sends a bad-sector error to the file system.3. NTFS performs cluster remapping. Data is lost.$^{2}$</td><td>1. Volume manager can&#x27;t recover the data.2. Volume manager sends a bad-sector error to the file system.3. NTFS performs cluster remapping. Data is lost.</td></tr></table>


1 A fault-tolerant volume is one of the following: a mirror set (RAID-1) or a RAID-5 set. 2 In a write operation, no data is lost: NTFS remanage the cluster before the write.

If the volume on which the bad sector appears is a fault-tolerant volume—a mirrored RAID-1) or RAID-5 / RAID-6 volume—and if the hard disk is one that supports bad-sector replacement (and that hasn’t run out of spare sectors), it doesn’t matter which file system you’re using (FAT or NTFS). The volume manager replaces the bad sector without the need for user or file system intervention.

If a bad sector is located on a hard disk that doesn't support bad sector replacement, the file system is responsible for replacing (remapping) the bad sector or—in the case of NTFS—the cluster in which the bad sector resides. The FAT file system doesn't provide sector or cluster remapping. The benefits of NTFS cluster remapping are that bad spots in a file can be fixed without harm to the file (or harm to the file system, as the case may be) and that the bad cluster will never be used again.

## Self-healing

With today's multiterabyte storage devices, taking a volume offline for a consistency check can result in a service outage of many hours. Recognizing that many disk corruptions are localized to a single file or portion of metadata, NTFS implements a self-healing feature to repair damage while a volume remains online. When NTFS detects corruption, it prevents access to the damaged file or files and creates a system worker thread that performs Chkdsk-like corrections to the corrupted data structures, allowing access to the repaired files when it has finished. Access to other files continues normally during this operation, minimizing service disruption.

You can use the fsutil repair set command to view and set a volume's repair options, which are


summarized in Table 11-12. The Fustlit utility uses the FSCTL_SET_REPAIR file system control code to set


these settings, which are saved in the VCB for the volume.

---

TABLE 11-12 NTFS self-healing behaviors

<table><tr><td>Flag</td><td>Behavior</td></tr><tr><td>SET_REPAIR_ENABLED</td><td>Enable self-healing for the volume.</td></tr><tr><td>SET_REPAIR_WARN_ABOUT_DATA_LOSS</td><td>If the self-healing process is unable to fully recover a file, specifies whether the user should be visually warned.</td></tr><tr><td>SET_REPAIR_DISABLED_AND_BUGCHECK_ON_CORRUPTION</td><td>If the NtfsBugCheckOnCorrupt NTFS registry value was set by using fsutil behavior set NtfsBugCheckOnCorrupt 1 and this flag is set, the system will crash with a STOP error 0x24, indicating file system corruption. This setting is automatically cleared during boot time to avoid repeated reboot cycles.</td></tr></table>


In all cases, including when the visual warning is disabled (the default), NTFS will log any self-healing operation it undertook in the System event log.

Apart from periodic automatic self-healing, NTFS also supports manually initiated self-healing cycles (this type of self-healing is called proactive) through the FSCTL_INITIATE_REPAIR and FSCTL_ WAIT_FOR_REPAIR control codes, which can be initiated with the fsutil repair initiate and fsutil repair wait commands. This allows the user to force the repair of a specific file and to wait until repair of that file is complete.

To check the status of the self-healing mechanism, the FSTCL_QUERY_REPAIR control code or the

fustil repair query command can be used, as shown here:

```bash
C:\>fsutil repair query c:
Self healing state on c: is: 0x9
 Values: 0x1 - Enable general repair.
        0x9 - Enable repair and warn about potential data loss.
        0x10 - Disable repair and buchheck once on first corruption.
```

## Online check-disk and fast repair

Rare cases in which disk-corruptions are not managed by the NTFS file system driver (through self-healing, Log file service, and so on) require the system to run the Windows Check Disk tool and to put the volume offline. There are a variety of unique causes for disk corruption: whether they are caused by media errors from the hard disk or transient memory errors, corruptions can happen in file system metadata. In large file servers, which have multiple terabytes of disk space, running a complete Check Disk can require days. Having a volume offline for so long in these kinds of scenarios is typically not acceptable.

Before Windows 8, NTFS implemented a simpler health model, where the file system volume was either healthy or not (through the dirty bit stored in the $VOLUME_INFORMATION attribute). In that model, the volume was taken offline for as long as necessary to fix the file system corruptions and bring the volume back to a healthy state. Downtime was directly proportional to the number of files in the volume. Windows 8, with the goal of reducing or avoiding the downtime caused by file system corruption, has redesigned the NTFS health model and disk check.

The new model introduces new components that cooperate to provide an online check-disk tool and to drastically reduce the downtime in case severe file-system corruption is detected. The NTFS file system driver is able to identify multiple types of corruption during normal system I/O. If a corruption is detected,

CHAPTER 11   Caching and file systems      707


---

NTFS tries to self-healt it (see the previous paragraph). If it doesn't succeed, the NTFS File system driver writes a new corruption record to the $Verify stream of the $Extend\SRmMetadata$Repair file.

A corruption record is a common data structure that NTFS uses for describing metadata corruptions

and is used both in-memory and on-disk. A corruption record is represented by a fixed-size header,

which contains version information, flags, and uniquely represents the record type through a GUID, a

variable-sized description for the type of corruption that occurred, and an optional context.

After the entry has been correctly added, NTFS emits an ETW event through its own event provider (named Microsoft-Windows-Ntfs-UBPM). This ETW event is consumed by the service control manager, which will start the Spot Verifier service (more details about triggered-start services are available in Chapter 10).

The Spot Verifier service (implemented in the Svsvc.dll library) verifies that the signaled corruption is not a false positive (some corruptions are intermittent due to memory issues and may not be a result of an actual corruption on disk). Entries in the $Verify stream are removed while being verified by the Spot Verifier. If the corruption (described by the entry) is not a false positive, the Spot Verifier triggers the Proactive Scan Bit (P-Bit) in the $VOLUME_INFORMATION attribute of the volume, which will trigger an online scan of the file system. The online scan is executed by the Proactive Scanner, which is run as a maintenance task by the Windows task scheduler (the task is located in Microsoft\Windows\Chkdsk, as shown in Figure 10-6) when the time is appropriate.

![Figure](figures/Winternals7thPt2_page_739_figure_004.png)

FIGURE 11-66 The Proactive Scan maintenance task.

---

The Proactive scanner is implemented in the Units.dll library, which is imported by the Windows Check Disk tool (Chkdsk.exe). When the Proactive Scanner runs, it takes a snapshot of the target volume through the Volume Shadow Copy service and runs a complete Check Disk on the shadow volume. The shadow volume is read-only; the check disk code detects this and, instead of directly fixing the errors, uses the self-healing feature of NTFS to try to automatically fix the corruption. If it fails, it sends a FSCTL_CORRUPTION_HANDLING code to the file system driver, which in turn creates an entry in the $Corrupt stream of the $Extend\$.RmMetadata$| Repair metadata file and sets the volume's dirty bit.

The dirty bit has a slightly different meaning compared to previous editions of Windows. The $VOLUME~INFORMATION attribute of the NTFS root namespace still contains the dirty bit, but also contains the~P-bit, which is used to require a Proactive Scan, and the F-bit, which is used to require a full check disk~due to the severity of a particular corruption. The dirty bit is set to 1 by the file system driver if the P-bit~or the F-bit are enabled, or if the $Corrupt stream contains one or more corruption records.

If the corruption is still not resolved, at this stage there are no other possibilities to fix it when the volume is offline (this does not necessarily require an immediate volume unmounting). The Spot Fixer is a new component that is shared between the Check Disk and the Autocheck tool. The Spot Fixer consumes the records inserted in the $Corrupt stream by the Proactive scanner. At boot time, the Autocheck native application detects that the volume is dirty, but, instead of running a full check disk, it fixes only the corrupted entries located in the $Corrupt stream, an operation that requires only a few seconds. Figure 11-67 shows a summary of the different repair methodology implemented in the previously described components of the NTFS file system.

![Figure](figures/Winternals7thPt2_page_740_figure_003.png)

FIGURE 11-67 A scheme that describes the components that cooperate to provide online check disk and fast corruption repair for NTFS volumes.

A Proactive scan can be manually started for a volume through the chkdsk /scan command. In the same way, the Spot Fixer can be executed by the Check Disk tool using the /spotfix command-line argument.

CHAPTER 11   Caching and file systems      709


---

EXPERIMENT: Testing the online disk check

You can test the online checkdisk by performing a simple experiment. Assuming that you would like to execute an online checkdisk on the D: volume, start by playing a large video stream from the D drive. In the meantime, open an administrative command prompt window and start an online checkdisk through the following command:

```bash
C:\chkdsk d: /scan
The type of the file system is NTFS.
Volume label is DATA.
Stage 1: Examining basic file system structure ...
0401984 file records processed.
File verification completed.
 3778 large file records processed.
 0 bad file records processed.
Stage 2: Examining file name linkage ...
Progress: 3454102 of 4056090 done; Stage: 85%; Total: 51%; ETA:   00:04:43 ...
```

You will find that the video stream won't be stopped and continues to play smoothly. In case

the online checkdisk finds an error that it isn't able to correct while the volume is mounted, it will

be inserted in the $Corrupt stream of the $Repair system file. T o fix the errors, a volume dismount

is needed, but the correction will be very fast. In that case, you could simply reboot the machine

or manually execute the Spot Fixer through the command line:

```bash
C:\>chkdsk d: /spotfix
```

In case you choose to execute the Spot Fixer, you will find that the video stream will be interrupted, because the volume needs to be unmounted.

## Encrypted file system

Windows includes a full-volume encryption feature called Windows BitLocker Drive Encryption. BitLocker encrypts and protects volumes from offline attacks, but once a system is booted, BitLocker's job is done. The Encrypting File System (EFS) protects individual files and directories from other authenticated users on a system. When choosing how to protect your data, it is not an either/or choice between BitLocker and EFS; each provides protection from specific—and nonoverlapping—threats. Together, BitLocker and EFS provide a "defense in depth" for the data on your system.

The paradigm used by EFS is to encrypt files and directories using symmetric encryption (a single key that is used for encrypting and decrypting the file). The symmetric encryption key is then encrypted using asymmetric encryption (one key for encryption—often referred to as the public key—and a different key for decryption—often referred to as the private key) for each user who is granted access to the file. The details and theory behind these encryption methods is beyond the scope of this book; however, a good primer is available at https://docs.microsoft.com/en-us/windows/desktop/SecCrypto/ cryptography-essentials.

---

EFS works with the Windows Cryptography Next Generation (CNG) APIs, and thus may be configured to use any algorithm supported by (or added to) CNG. By default, EFS will use the Advanced Encryption Standard (AES) for symmetric encryption (256-bit key) and the Rivest-Shamir-Adleman (RSA) public key algorithm for asymmetric encryption (2,048-bit keys).

Users can encrypt files via Windows Explorer by opening a file's Properties dialog box, clicking Advanced, and then selecting the Encrypt Contents To Secure Data option, as shown in Figure 1168. (A file may be encrypted or compressed, but not both.) Users can also encrypt files via a commandline utility named Cipher (%SystemRoot%\System32\Cipher.exe) or programmatically using Windows APIs such as EncryptFile and AddUsersToEncryptedFile.

Windows automatically encrypts files that reside in directories that are designated as encrypted directories. When a file is encrypted, EFS generates a random number for the file that EFS calls the file's File Encryption Key (FEK). EFS uses the FEK to encrypt the file's contents using symmetric encryption. EFS then encrypts the FEK using the user's asymmetric public key and stores the encrypted FEK in the $EFS alternate data stream for the file. The source of the public key may be administratively specified to come from an assigned X.509 certificate or a smartcard or can be randomly generated (which would then be added to the user's certificate store, which can be viewed using the Certificate Manager (%SystemRoot%) System32\Certmgr.msc). After EFS completes these steps, the file is secure; other users can't decrypt the data without the file's decrypted FEK, and they can't decrypt the FEK without the user private key.

![Figure](figures/Winternals7thPt2_page_742_figure_003.png)

FIGURE 11-68 Encrypt files by using the Advanced Attributes dialog box.

Symmetric encryption algorithms are typically very fast, which makes them suitable for encrypting large amounts of data, such as file data. However, symmetric encryption algorithms have a weakness: You can bypass their security if you obtain the key. If multiple users want to share one encrypted file protected only using symmetric encryption, each user would require access to the file's FEK. Leaving the FEK unencrypted would obviously be a security problem, but encrypting the FEK once would require all the users to share the same FEK decryption key—another potential security problem.

Keeping the FEK secure is a difficult problem, which EFS addresses with the public key—based half of

its encryption architecture. Encrypting a file's FEK for individual users who access the file lets multiple

users share an encrypted file. EFS can encrypt a file's FEK with each user's public key and can store each

user's encrypted FEK in the file's $EFS data stream. Anyone can access a user's public key, but no one

CHAPTER 11   Caching and file systems      711


---

can use a public key to decrypt the data that the public key encrypted. The only way users can decrypt a file is with their private key, which the operating system must access. A user's private key decrypts the user's encrypted copy of a file's FEK. Public key-based algorithms are usually slow, but EFS uses these algorithms only to encrypt FEKs. Splitting key management between a publicly available key and a private key makes key management a little easier than symmetric encryption algorithms do and solves the dilemma of keeping the FEK secure.

Several components work together to make EFS work, as the diagram of EFS architecture in Figure 11-69 shows. EFS support is merged into the NTFS driver. Whenever NTFS encounters an encrypted file, NTFS executes EFS functions that it contains. The EFS functions encrypt and decrypt file data as applications access encrypted files. Although EFS stores an FEK with a file's data, users' public keys encrypt the FEK. To encrypt or decrypt file data, EFS must decrypt the file's FEK with the aid of CNG key management services that reside in user mode.

![Figure](figures/Winternals7thPt2_page_743_figure_002.png)

FIGURE 11-69 EFS architecture.

The Local Security Authority Subsystem (LSASS, %SystemRoot%\System32\Lass.exe) manages

logon sessions but also hosts the EFS service (Efssvc.dll). For example, when EFS needs to decrypt a FEK

to decrypt file data a user wants to access, NTFS sends a request to the EFS service inside LSASS.

712     CHAPTER 11   Caching and file systems


---

## Encrypting a file for the first time

The NTFS driver calls its EFS helper functions when it encounters an encrypted file. A file's attributes record that the file is encrypted in the same way that a file records that it's compressed (discussed earlier in this chapter). NTFS has specific interfaces for converting a file from nonencrypted to encrypted form, but user-mode components primarily drive the process. As described earlier, Windows lets you encrypt a file in two ways: by using the cipher command-line utility or by checking the Encrypt Contents To Secure Data check box in the Advanced Attributes dialog box for a file in Windows Explorer. Both Windows Explorer and the cipher command rely on the Encrypt File Windows API.

EFS stores only one block of information in an encrypted file, and that block contains an entry for each user sharing the file. These entries are called key entries, and EFS stores them in the data decryption field (DDF) portion of the file's EFS data. A collection of multiple key entries is called a key ring because, as mentioned earlier, EFS lets multiple users share encrypted files.

Figure 11-70 shows a file's EFS information format and key entry format. EFS stores enough information in the first part of a key entry to precisely describe a user's public key. This data includes the user's security ID (SID) (note that the SID is not guaranteed to be present), the container name in which the key is stored, the cryptographic provider name, and the asymmetric key pair certificate hash. Only the asymmetric key pair certificate hash is used by the decryption process. The second part of the key entry contains an encrypted version of the FEK. EFS uses the CNG to encrypt the FEK with the selected asymmetric encryption algorithm and the user's public key.

![Figure](figures/Winternals7thPt2_page_744_figure_004.png)

FIGURE 11-70 Format of EFS information and key entries.

EFS stores information about recovery key entries in a file's data recovery field (DRF). The format of DRF entries is identical to the format of DDF entries. The DRF's purpose is to list designated accounts, or recovery agents, decrypt a user's file when administrative authority must have access to the user's data. For example, suppose a company employee forgot his or her logon password. An administrator can reset the user's password, but without recovery agents, no one can recover the user's encrypted data.

CHAPTER 11    Caching and file systems      713


---

Recovery agents are defined with the Encrypted Data Recovery Agents security policy of the local computer or domain. This policy is available from the Local Security Policy MMC snap-in, as shown in Figure 11-71. When you use the Add Recovery Agent Wizard (by right-clicking Encrypting File System and then clicking Add Data Recovery Agent), you can add recovery agents and specify which private/ public key pairs (designated by their certificates) the recovery agents use for EFS recovery. Lsssrv (Local Security Authority service, which is covered in Chapter 7 of Part 1) interprets the recovery policy when it initializes and when it receives notification that the recovery policy has changed. EFS creates a DRF key entry for each recovery agent by using the cryptographic provider registered for EFS recovery.

![Figure](figures/Winternals7thPt2_page_745_figure_001.png)

FIGURE 11-71 Encrypted Data Recovery Agents group policy.

A user can create their own Data Recovery Agent (DRA) certificate by using the cipher /r command. The generated private certificate file can be imported by the Recovery Agent Wizard and by the Certificates snap-in of the domain controller or the machine on which the administrator should be able to decrypt encrypted files.

As the final step in creating EFS information for a file, Lsarsv calculates a checksum for the DDF and DRF by using the MD5 hash facility of Base Cryptographic Provider 1.0. Lsarsv stores the checksum's result in the EFS information header. EFS references this checksum during decryption to ensure that the contents of a file's EFS information haven't become corrupted or been tampered with.

## Encrypting file data

When a user encrypts an existing file, the following process occurs:

- 1. The EFS service opens the file for exclusive access.

2. All data streams in the file are copied to a plaintext temporary file in the system's

temporary directory.

3. A FEK is randomly generated and used to encrypt the file by using AES-256.
714      CHAPTER 11   Caching and file systems


---

4. A DIF is created to contain the FEK encrypted by using the user's public key. EFS automatically

obtains the user's public key from the user's X.509 version 3 file encryption certificate.

5. If a recovery agent has been designated through Group Policy, a DRF is created to contain the FEK encrypted by using RSA and the recovery agent's public key.

6. EFS automatically obtains the recovery agent's public key for file recovery from the recov ery agent's X.509 version 3 certificate, which is stored in the EFS recovery policy. If there are

multiple recovery agents, a copy of the FEK is encrypted by using each agent's public key, and a

DRF is created to store each encrypted FEK.

![Figure](figures/Winternals7thPt2_page_746_figure_003.png)

Note The file recovery property in the certificate is an example of an enhanced key usage (EKU) field. An EKU extension and extended property specify and limit the valid uses of a certificate. File Recovery is one of the EKU fields defined by Microsoft as part of the Microsoft public key infrastructure (PKI).

7. EFS writes the encrypted data, along with the DDF and the DRF, back to the file. Because symmetric encryption does not add additional data, file size increase is minimal after encryption. The metadata, consisting primarily of encrypted FEKs, is usually less than 1 KB. File size in bytes before and after encryption is normally reported to be the same.

8. The plaintext temporary file is deleted.

When a user saves a file to a folder that has been configured for encryption, the process is similar

except that no temporary file is created.

## The decryption process

When an application accesses an encrypted file, decryption proceeds as follows:

1. NTFS recognizes that the file is encrypted and sends a request to the EFS driver.

2. The EFS driver retrieves the DDF and passes it to the EFS service.

3. The EFS service retrieves the user's private key from the user's profile and uses it to decrypt the

DDF and obtain the FEK.

4. The EFS service passes the FEK back to the EFS driver.

5. The EFS driver uses the FEK to decrypt sections of the file as needed for the application.

![Figure](figures/Winternals7thPt2_page_746_figure_015.png)

Note When an application opens a file, only those sections of the file that the application is using are decrypted because EFS uses cipher block chaining. The behavior is different if the user removes the encryption attribute from the file. In this case, the entire file is decrypted and rewritten as plaintext.

CHAPTER 11   Caching and file systems      715


---

- 6. The EFS driver returns the decrypted data to NTFS, which then sends the data to the requesting
application.
## Backing up encrypted files

An important aspect of any file encryption facility's design is that file data is never available in unencrypted form except to applications that access the file via the encryption facility. This restriction particularly affects backup utilities, in which archival media store files. EFS addresses this problem by providing a facility for backup utilities so that the utilities can back up and restore files in their encrypted states. Thus, backup utilities don't have to be able to decrypt file data, nor do they need to encrypt file data in their backup procedures.

Backup utilities use the EFS API functions OpenEncryptedFileRaw, ReadEncryptedFileRaw, WriteEncrypted

FileRaw, and CloseEncryptedFileRaw in Windows to access a file's encrypted contents. After a backup

utility opens a file for raw access during a backup operation, the utility calls ReadEncryptedFileRaw to

obtain the file data. All the EFS backup utilities APIs work by issuing FSCTL to the NTFS file system. For

example, the ReadEncryptedFileRaw API first reads the $EFS stream by issuing a FSCTL_ENCRYPTION

_FSCTL_IO control code to the NTFS driver and then reads all of the file's streams (including the $DATA

stream and optional alternate data streams); in case the stream is encrypted, the ReadEncryptedFileRaw

API uses the FSCTL_READ_RAW_ENCRYPTED control code to request the encrypted stream data to the

file system driver.

### EXPERIMENT: Viewing EFS information

EFS has a handful of other API functions that applications can use to manipulate encrypted files. For example, applications use the AddUsersToEncryptedFile API function to give additional users access to an encrypted file and RemoveUsersFromEncryptedFile to revoke users' access to an encrypted file. Applications use the QueryUsersOnEncryptedFile function to obtain information about a file's associated DDF and DRF key fields. QueryUsersOnEncryptedFile returns the SID, certificate hash value, and display information that each DDF and DRF key field contains. The following output is from the EFSDump utility, from Sysinternals, when an encrypted file is specified as a command-line argument:

```bash
C:\Andrea\efsdump Test.txt
EFS Information Dumper v1.02
Copyright (C) 1999 Mark Russinovich
Systems Internals - http://www.sysinternals.com
C:\Andrea\Test.txt:
DDF Entries:
    WIN-46E4FTBP6Q\Andrea:
        Andrea(Andrea@WIN-46E4FTBP6Q)
    Unknown user:
        Tony(Tony@WIN-46E4FTBP6Q)
DRF Entry:
    Unknown user:
        EFS Data Recovery
CHAPTER 11  Caching and file systems

```

---

You can see that the file Test.txt has two DDF entries for the users Andrea and Tony and one

DRF entry for the EFS Data Recovery agent, which is the only recovery agent currently registered

on the system. You can use the cipher tool to add or remove users in the DDF entries of a file. For

example, the command


cipher /adduser /user:Tony Test.txt


enables the user Tony to access the encrypted file Test.txt (adding an entry in the DDF of the file).

## Copying encrypted files

When an encrypted file is copied, the system doesn't decrypt the file and re-encrypt it at its destination; it just copies the encrypted data and the EFS alternate data stream to the specified destination. However, if the destination does not support alternate data streams—if it is not an NTFS volume (such as a FAT volume) or is a network share (even if the network share is an NTFS volume)—the copy cannot proceed normally because the alternate data streams would be lost. If the copy is done with Explorer, a dialog box informs the user that the destination volume does not support encryption and asks the user whether the file should be copied to the destination unencrypted. If the user agrees, the file will be decrypted and copied to the specified destination. If the copy is done from a command prompt, the copy command will fail and return the error message "The specified file could not be encrypted."

## BitLocker encryption offload

The NTFS file system driver uses services provided by the Encrypting File System (EFS) to perform file encryption and decryption. These kernel-mode services, which communicate with the user-mode encrypting file service (Efssvc.dll), are provided to NTFS through callbacks. When a user or application encrypts a file for the first time, the EFS service sends a $CSTL_SET_ENCRYPTION control code to the NTFS driver. The NTFS file system driver uses the "write" EFS callback to perform in-memory encryption of the data located in the original file. The actual encryption process is performed by splitting the file content, which is usually processed in 2-MB blocks, in small 512-byte chunks. The EFS library uses the BCryptEncrypt API to actually encrypt the chunk. As previously mentioned, the encryption engine is provided by the Kernel CNG driver (Cng.sys), which supports the AES or 3DES algorithms used by EFS (along with many more). As EFS encrypts each 512-byte chunk (which is the smallest physical size of standard hard disk sectors), at every round it updates the IV (initialization vector, also known as salt value, which is a 128-bit number used to provide randomization to the encryption scheme), using the byte offset of the current block.

In Windows 10, encryption performance has increased thanks to BitLocker encryption offload. When

BitLocker is enabled, the storage stack already includes a device created by the Full Volume Encryption

Driver (Fvcvol.sys), which, if the volume is encrypted, performs real-time encryption/decryption on

physical disk sectors; otherwise, it simply passes through the I/O requests.

CHAPTER 11    Caching and file systems      717


---

The NTFS driver can defer the encryption of a file by using IRP Extensions. IRP Extensions are provided by the I/O manager (more details about the I/O manager are available in Chapter 6 of Part 1) and are a way to store different types of additional information in an IRP. At file creation time, the EFS driver probes the device stack to check whether the BitLocker control device object (CDO) is present (by using the IOCTL_FVE_GET_CDOPATH control code), and, if so, it sets a flag in the SCB, indicating that the stream can support encryption offload.

Every time an encrypted file is read or written, or when a file is encrypted for the first time, the NTFS driver, based on the previously set flag, determines whether it needs to encrypt/decrypt each file block. In case encryption offload is enabled, NTFS skips the call to EFS; instead, it adds an IRP extension to the IRP that will be sent to the related volume device for performing the physical I/O. In the IRP extension, the NTFS file system driver stores the starting virtual byte offset of the block of the file that the storage driver is going to read or write, its size, and some flags. The NTFS driver finally emits the I/O to the related volume device by using the IoCallDriver API.

The volume manager will parse the IRP and send it to the correct storage driver. The BitLocker driver recognizes the IRP extension and encrypts the data that NTFS has sent down to the device stack, using its own routines, which operate on physical sectors. (Bitlocker, as a volume filter driver, doesn't implement the concept of files and directories.) Some storage drivers, such as the Logical Disk Manager driver (VolmgrX.sys, which provides dynamic disk support) are filter drivers that attach to the volume device objects. These drivers reside below the volume manager but above the BitLocker driver, and they can provide data redundancy, striping, or storage virtualization, characteristics which are usually implemented by splitting the original IRP into multiple secondary IRPs that will be emitted to different physical disk devices. In this case, the secondary I/Os, when intercepted by the BitLocker driver, will result in data encrypted by using a different salt value that would corrupt the file data.

IRP extensions support the concept of IRP propagation, which automatically modifies the file virtual byte offset stored in the IRP extension every time the original IRP is split. Normally, the EFS driver encrypts file blocks on 512-byte boundaries, and the IRP can't be split on an alignment less than a sector size. As a result, BitLocker can correctly encrypt and decrypt the data, ensuring that no corruption will happen.

Many of BitLocker driver's routines can't tolerate memory failures. However, since IRP extension is dynamically allocated from the nonpaged pool when the IRP is split, the allocation can fail. The I/O manager resolves this problem with the IoAllocaterIrpEx routine. This routine can be used by kernel drivers for allocating IRPs (like the legacy IoAllocateIrp). But the new routine allocates an extra stack location and stores any IRP extensions in it. Drivers that request an IRP extension on IRPs allocated by the new API no longer need to allocate new memory from the nonpaged pool.

![Figure](figures/Winternals7thPt2_page_749_figure_005.png)

Note A storage driver can decide to split an IRP for different reasons—whether or not it needs to send multiple I/Os to multiple physical devices. The Volume Shadow Copy Driver (Volsnap sys), for example, splits the I/O while it needs to read a file from a copy-onwrite volume shadow copy, if the file resides in different sections: on the live volume and on the Shadow Copy's differential file (which resides in the System Volume Information hidden directory).

---

## Online encryption support
