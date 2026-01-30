## NTFS file system driver

As described in Chapter 6 in Part I, in the framework of the Windows /O system, NTS and other file systems are loadable device drivers that run in kernel mode. They are invoked indirectly by applications that use Windows or other /O APIs. As Figure 11-28 shows, the Windows environment subsystems call Windows system services, which in turn locate the appropriate loaded drivers and call them. (For a description of system service dispatching, see the section "System service dispatching" in Chapter 8.)

![Figure](figures/Winternals7thPt2_page_683_figure_002.png)

FIGURE 11-28 Components of the Windows I/O system.

The layered drivers pass I/O requests to one another by calling the Windows executive's I/O manager. Relying on the I/O manager as an intermediary allows each driver to maintain independence so that it can be loaded or unloaded without affecting other drivers. In addition, the NTFS driver interacts with the three other Windows executive components, shown in the left side of Figure 11-29, which are closely related to file systems.

The log file service (LFS) is the part of NTFS that provides services for maintaining a log of disk

writes. The log file that LFS writes is used to recover an NTFS-formatted volume in the case of a system

failure. (See the section "Log file service" later in this chapter.)

652      CHAPTER 11   Caching and file systems


---

![Figure](figures/Winternals7thPt2_page_684_figure_000.png)

FIGURE 11-29 NTFS and related components.

As we have already described, the cache manager is the component of the Windows executive that provides systemwide caching services for NTFS and other file system drivers, including network file system drivers (servers and redirectors). All file systems implemented for Windows access cached files by mapping them into system address space and then accessing the virtual memory. The cache manager provides a specialized file system interface to the Windows memory manager for this purpose. When a program tries to access a part of a file that isn't loaded into the cache (a cache miss), the memory manager calls NTFS to access the disk driver and obtain the file contents from disk. The cache manager optimizes disk I/O by using its lazy writer threads to call the memory manager to flush cache contents to disk as a background activity (asynchronous disk writing).

NTFS, like other file systems, participates in the Windows object model by implementing files as objects. This implementation allows files to be shared and protected by the object manager, the component of Windows that manages all executive-level objects. (The object manager is described in the section “Object manager” in Chapter 8.)

An application creates and accesses files just as it does other Windows objects: by means of object

handles. By the time an I/O request reaches NTFS, the Windows object manager and security system

have already verified that the calling process has the authority to access the file object in the way it is

attempting to. The security system has compared the caller's access token to the entries in the access

control list for the file object. (See Chapter 7 in Part 1 for more information about access control lists.)

The I/O manager has also transformed the file handle into a pointer to a file object. NTFS uses the

information in the file object to access the file on disk.

Figure 11-30 shows the data structures that link a file handle to the file system's on-disk structure.

CHAPTER 11   Caching and file systems     653


---

![Figure](figures/Winternals7thPt2_page_685_figure_000.png)

FIGURE 11-30 NTFS data structures.

NTFS follows several pointers to get from the file object to the location of the file on disk. As

Figure 11-30 shows, a file object, which represents a single call to the open-file system service, points to

a stream control block (SCB) for the file attribute that the caller is trying to read or write. In Figure 11-30,

a process has opened both the unnamed data attribute and a named stream (alternate data attribute)

for the file. The SCBs represent individual file attributes and contain information about how to find

specific attributes within a file. All the SCBs for a file point to a common data structure called a file con trol block (FCB). The FCB contains a pointer (actually, an index into the MFT, as explained in the section

“File record numbers” later in this chapter) to the file’s record in the disk-based master file table (MFT),

which is described in detail in the following section.

## NTFS on-disk structure

This section describes the on-disk structure of an NTFS volume, including how disk space is divided and organized into clusters, how files are organized into directories, how the actual file data and attribute information is stored on disk, and finally, how NTFS data compression works.

---

## Volumes

The structure of NTFS begins with a volume. A volume corresponds to a logical partition on a disk, and it's created when you format a disk or part of a disk for NTFS. You can also create a RAID virtual disk that spans multiple physical disks by using Storage Spaces, which is accessible through the Manage Storage Spaces control panel snap-in, or by using Storage Spaces commands available from the Windows PowerShell (like the New-StoragePool command, used to create a new storage pool. A comprehensive list of PowerShell commands for Storage Spaces is available at the following link: https://docs.microsoft .com/en-us/powershell/module/storagespaces/)

A disk can have one volume or several. NTFS handles each volume independently of the others.

Three sample disk configurations for a 2-TB hard disk are illustrated in Figure 11-31.

![Figure](figures/Winternals7thPt2_page_686_figure_003.png)

FIGURE 11-31 Sample disk configurations.

A volume consists of a series of files plus any additional unallocated space remaining on the disk

partition. In all FAT file systems, a volume also contains areas specially formatted for use by the file

system. An NTFS or ReFS volume, however, stores all file system data, such as bitmaps and directories,

and even the system bootstrap, as ordinary files.

![Figure](figures/Winternals7thPt2_page_686_figure_006.png)

Note The on-disk format of NTFS volumes on Windows 10 and Windows Server 2019 is version 3.1, the same as it has been since Windows XP and Windows Server 2003. The version number of a volume is stored in its $Volume metadata file.

## Clusters

The cluster size on an NTFS volume, or the cluster factor, is established when a user formats the volume with either the format command or the Disk Management MMC snap-in. The default cluster factor varies with the size of the volume, but it is an integral number of physical sectors, always a power of 2 (1 sector, 2 sectors, 4 sectors, 8 sectors, and so on). The cluster factor is expressed as the number of bytes in the cluster, such as 512 bytes, 1 KB, 2 KB, and so on.

---

Internally, NTFS refers only to clusters. (However, NTFS forms low-level volume I/O operations such that clusters are sector-aligned and have a length that is a multiple of the sector size.) NTFS uses the cluster as its unit of allocation to maintain its independence from physical sector sizes. This independence allows NTFS to efficiently support very large disks by using a larger cluster factor or to support newer disks that have a sector size other than 512 bytes. On a larger volume, use of a larger cluster factor can reduce fragmentation and speed allocation, at the cost of wasted disk space. (If the cluster size is 64 KB, and a file is only 16 KB, then 48 KB are wasted.) Both the format command available from the command prompt and the Format menu option under the All Tasks option on the Action menu in the Disk Management MMC snap-in choose a default cluster factor based on the volume size, but you can override this size.

NTFS refers to physical locations on a disk by means of logical cluster numbers (LCNs). LCNs are

simply the numbering of all clusters from the beginning of the volume to the end. To convert an LCN

to a physical disk address, NTFS multiplies the LCN by the cluster factor to get the physical byte offset

on the volume, as the disk driver interface requires. NTFS refers to the data within a file by means of

virtual cluster numbers (VCNs). VCNs number the clusters belonging to a particular file from 0 through

m. VCNs aren't necessarily physically contiguous, however; they can be mapped to any number of LCNs

on the volume.

## Master file table

In NTFS, all data stored on a volume is contained in files, including the data structures used to locate

and retrieve files, the bootstrap data, and the bitmap that records the allocation state of the entire vol ume (the NTFS metadata). Storing everything in files allows the file system to easily locate and maintain

the data, and each separate file can be protected by a security descriptor. In addition, if a particular

part of the disk goes bad, NTFS can relocate the metadata files to prevent the disk from becoming

inaccessible.

The MFT is the heart of the NTFS volume structure. The MFT is implemented as an array of file records. The size of each file record can be 1 KB or 4 KB, as defined at volume-format time, and depends on the type of the underlying physical medium: new physical disks that have 4 KB native sectors size and tiered disks generally use 4 KB file records, while older disks that have 512 bytes sectors size use 1 KB file records. The size of each MFT entry does not depend on the clusters size and can be overridden at volume-format time through the Format /1 command. (The structure of a file record is described in the “File records” section later in this chapter.) Logically, the MFT contains one record for each file on the volume, including a record for the MFT itself. In addition to the MFT, each NTFS volume includes a set of metadata files containing the information that is used to implement the file system structure. Each of these NTFS metadata files has a name that begins with a dollar sign ($) and is hidden. For example, the file name of the MFT is $MFT. The rest of the files on an NTFS volume are normal user files and directories, as shown in Figure 11-32.

Usually, each MFT record corresponds to a different file. If a file has a large number of attributes or becomes highly fragmented, however, more than one record might be needed for a single file. In such cases, the first MFT record, which stores the locations of the others, is called the base file record.

656 CHAPTER 11 Caching and file systems


---

![Figure](figures/Winternals7thPt2_page_688_figure_000.png)

FIGURE 11-32 File records for NTFS metadata files in the MFT.

When it first accesses a volume, NTFS must mount it—that is, read metadata from the disk and construct internal data structures so that it can process application file system accesses. To mount the volume, NTFS looks in the volume boot record (VBR) (located at LCN_0), which contains a data structure called the boot parameter block (BPP), to find the physical disk address of the MFT. The MFT's file record is the first entry in the table; the second file record points to a file located in the middle of the disk called the MFT mirror (file name $MFTMirr) that contains a copy of the first four rows of the MFT. This partial copy of the MFT is used to locate metadata files if part of the MFT file can't be read for some reason.

Once NTFS finds the file record for the MFT, it obtains the VCN-to-LCN mapping information in the

file record's data attribute and stores it into memory. Each run (runs are explained later in this chapter

in the section "Resident and nonresident attributes") has a VCN-to-LCN mapping and a run length

because that's all the information necessary to locate the LCN for any VCN. This mapping information

CHAPTER 11   Caching and file systems     657


---

tells NTFS where the runs containing the MFT are located on the disk. NTFS then processes the MFT records for several more metadata files and opens the files. Next, NTFS performs its file system recovery operation (described in the section "Recovery" later in this chapter), and finally, it opens its remaining metadata files. The volume is now ready for user access.

![Figure](figures/Winternals7thPt2_page_689_figure_001.png)

Note For the sake of clarity, the text and diagrams in this chapter depict a run as including a VCN, an LCN, and a run length. NTFS actually compresses this information on disk into an LCN/next-VCN pair. Given a starting VCN, NTFS can determine the length of a run by subtracting the starting VCN from the next VCN.

As the system runs, NTFS writes to another important metadata file, the log file (file name $LogFile). NTFS uses the log file to record all operations that affect the NTFS volume structure, including file creation or any commands, such as copy, that alter the directory structure. The log file is used to recover an NTFS volume after a system failure and is also described in the “Recovery” section.

Another entry in the MFT is reserved for the root directory (also known as \; for example, C:\). Its file record contains an index of the files and directories stored in the root of the NTFS directory structure. When NTFS is first asked to open a file, it begins its search for the file in the root directory's file record. After opening a file, NTFS stores the file's MFT record number so that it can directly access the file's MFT record when it reads and writes the file later.

NTFS records the allocation state of the volume in the bitmap file (file name $BitMap). The data

attribute for the bitmap file contains a bitmap, each of whose bits represents a cluster on the volume,

identifying whether the cluster is free or has been allocated to a file.

The security file (file name $Secure) stores the volume-wide security descriptor database. NTFS files and directories have individually settable security descriptors, but to conserve space, NTFS stores the settings in a common file, which allows files and directories that have the same security settings to reference the same security descriptor. In most environments, entire directory trees have the same security settings, so this optimization provides a significant saving of disk space.

Another system file, the boot file (file name $Boot), stores the Windows bootstrap code if the volume is a system volume. On nonsystem volumes, there is code that displays an error message on the screen if an attempt is made to boot from that volume. For the system to boot, the bootstrap code must be located at a specific disk address so that the Boot Manager can find it. During formatting, the format command defines this area as a file by creating a file record for it. All files are in the MFT, and all clusters are either free or allocated to a file—there are no hidden files or clusters in NTFS, although some files (metadata) are not visible to users. The boot file as well as NTFS metadata files can be individually protected by means of the security descriptors that are applied to all Windows objects. Using this "everything on the disk is a file" model also means that the bootstrap can be modified by normal file I/O, although the boot file is protected from editing.

NTFS also maintains a bad-cluster file (file name $BadCus)for recording any bad spots on the disk volume and a file known as the volume file (file name $Volume), which contains the volume name, the

---

version of NTFS for which the volume is formatted, and a number of flag bits that indicate the state and health of the volume, such as a bit that indicates that the volume is corrupt and must be repaired by the Chkdsk utility. (The Chkdsk utility is covered in more detail later in the chapter.) The uppercase file (file name $UpCase) includes a translation table between lowercase and uppercase characters. NTFS maintains a file containing an attribute definition table (file name $AttrDef) that defines the attribute types supported on the volume and indicates whether they can be indexed, recovered during a system recovery operation, and so on.

![Figure](figures/Winternals7thPt2_page_690_figure_001.png)

Note Figure 11-32 shows the Master File Table of a NTFS volume and indicates the specific entries in which the metadata files are located. It is worth mentioning that file records at position less than 16 are guaranteed to be fixed. Metadata files located at entries greater than 16 are subject to the order in which NTFS creates them. Indeed, the format tool doesn't create any metadata file above position 16; this is the duty of the NTFS file system driver while mounting the volume for the first time (after the formatting has been completed). The order of the metadata files generated by the file system driver is not guaranteed.

NTFS stores several metadata files in the extensions (directory name $X\text{end} metadata directory, including the object identifier file (file name $Object), the quota file (file name $Quota), the change journal file (file name $UsnJnl), the reparse point file (file name $Reparse), the Posix delete support directory ($Deleted), and the default resource manager directory (directory name $RmMetadata). These files store information related to extended features of NTFS. The object identifier file stores file object IDs, the quota file stores quota limit and behavior information on volumes that have quotas enabled, the change journal file records file and directory changes, and the reparse point file stores information about which files and directories on the volume include reparse point data.

The Posix Delete directory ($Deleted) contains files, which are invisible to the user, that have been deleted using the new Posix semantic. Files deleted using the Posix semantic will be moved in this directory when the application that has originally requested the file deletion closes the file handle. Other applications that may still have a valid reference to the file continue to run while the file's name is deleted from the namespace. Detailed information about the Posix deletion has been provided in the previous section.

The default resource manager directory contains directories related to transnational NTFS (TxF) support, including the transaction log directory (directory name $TxFLog), the transaction isolation directory (directory name $TxI, and the transaction repair directory (file name $Repair). The transaction log directory contains the TxF base log file (file name $TxILog.blf) and any number of log container files, depending on the size of the transaction log, but it always contains at least two: one for the Kernel Transaction Manager (KTM) log stream (file name $TxILogContainer00000000000000000000), and one for the TxF log stream (file name $TxILogContainer00000000000000000000). The transaction log directory also contains the txf old page stream (file name $Top), which we'll describe later.

CHAPTER 11   Caching and file systems      659


---

## EXPERIMENT: Viewing NTFS information

You can use the built-in Futil.exe command-line program to view information about an NTFS

volume, including the placement and size of the MFT and MFT zone:

```bash
d:\fsutil \fsinfo ntfsinfo d:
NTFS Volume Serial Number :   0x48323940323933f2
NTFS Version    :      3.1
LFS Version     :      2.0
Number Sectors :      0x000000011c5f6fff
Total Clusters :      0x0000000238bedff
Free Clusters :      0x00000001aa6e5925
Total Reserved :      0x00000000000011cd
Bytes Per Sector :      512
Bytes Per Physical Sector :  4096
Bytes Per Cluster :      4096
Bytes Per FileRecord Segment :  4096
Bytes Per FileRecord Segment =  1
Mft Valid Data Length :      0x0000000064650000
Mft Start Lcn :      0x000000000000c000
Mft2 Start Lcn :      0x0000000000000002
Mft Zone Start :      0x000000000069f760
Mft Zone End  :      0x000000000069f7700
Max Device Trim Extent Count :  4294967295
Max Device Trim Byte Count :  0x10000000
Max Volume Trim Extent Count :  62
Max Volume Trim Byte Count :  0x10000000
Resource Manager Identifier :    81E83020-EGF8-11E8-8862-D89EF33A38A7
```

In this example, the D: volume uses 4 KB file records (MFT entries), on a 4 KB native sector size disk (which emulates old 512-byte sectors) and uses 4 KB clusters.

## File record numbers

A file on an NTFS volume is identified by a 64-bit value called a file record number, which consists of a file number and a sequence number. The file number corresponds to the position of the file's file record in the MFT minus 1 (or to the position of the base file record minus 1 if the file has more than one file record). The sequence number, which is incremented each time an MFT file record position is reused, enables NTFS to perform internal consistency checks. A file record number is illustrated in Figure 11-33.

![Figure](figures/Winternals7thPt2_page_691_figure_006.png)

FIGURE 11-33 File record number.

660      CHAPTER 11 Caching and file systems


---

## File records

Instead of viewing a file as just a repository for textual or binary data, NTFS stores files as a collection

of attribute/value pairs, one of which is the data it contains (called the unnamed data attribute). Other

attributes that compose a file include the file name, time stamp information, and possibly additional

named data attributes. Figure 11-34 illustrates an MFT record for a small file.

![Figure](figures/Winternals7thPt2_page_692_figure_002.png)

FIGURE 11-34 MFT record for a small file.

Each file attribute is stored as a separate stream of bytes within a file. Strictly speaking, NTFS doesn't read and write files; it reads and writes attribute streams. NTFS supplies these attribute operations: create, delete, read (byte range), and write (byte range). The read and write services normally operate on the file's unnamed data attribute. However, a caller can specify a different data attribute by using the named data stream syntax.

Table 11-6 lists the attributes for files on an NTFS volume. (Not all attributes are present for every file.) Each attribute in the NTFS file system can be unnamed or can have a name. An example of a named attribute is the $LOGGED_UTILITY_STREAM, which is used for various purposes by different NTFS components. Table 11-7 lists the possible $LOGGED_UTILITY_STREAM attribute's names and their respective purposes.

---

TABLE 11-6 Attributes for NTFS files

<table><tr><td>Attribute</td><td>Attribute Type Name</td><td>Resident?</td><td>Description</td></tr><tr><td>Volume information</td><td>$VOLUME_INFORMATION, $VOLUME_NAME</td><td>Always, Always</td><td>These attributes are present only in the $Volume metadata file. They store volume version and label information.</td></tr><tr><td>Standard information</td><td>$STANDARD_INFORMATION</td><td>Always</td><td>File attributes such as read-only, archive, and so on; time stamps, including when the file was created or last modified.</td></tr><tr><td>File name</td><td>$FILE_NAME</td><td>Maybe</td><td>The file&#x27;s name in Unicode 1.0 characters. A file can have multiple file name attributes, as it does when a hard link to a file exists or when a file with a long name has an automatically generated short name for access by MS-DOS and 16-bit Windows applications.</td></tr><tr><td>Security descriptor</td><td>$SECURITY_DESCRIPTOR</td><td>Maybe</td><td>This attribute is present for backward compatibility with previous versions of NTFS and is rarely used in the current version of NTFS (3.1). NTFS stores almost all security descriptors in the $SECURE metadata file, including name and files and directories that have the same settings. Previous versions of NTFS stored private security descriptor information with each file and directory. Some files still include a $SECURITY_DESCRIPTOR attribute, such as $Boot.</td></tr><tr><td>Data</td><td>$DATA</td><td>Maybe</td><td>The contents of the file. In NTFS, a file has one default unnamed data attribute and can have additional named data attributes—that is, a file can have multiple data streams. A directory has no default data attribute but can have optional named data attributes.</td></tr><tr><td>Index root, index allocation</td><td>$INDEX_ROOT, $INDEX_ALLOCATION</td><td>Always, Never</td><td>Named data streams can be used even for particular system purposes. For example, the Storage Reserve Area Table (SRAT) stream (SRAT) is used by the Storage Service for creating Space reservations on a volume. This attribute is applied only on the $IBM file system. The Storage Reserves are described later in this chapter.</td></tr><tr><td>Attribute list</td><td>$ATTRIBUTE_LIST</td><td>Maybe</td><td>A list of the attributes that make up the file and the file record number of the MFT entry where each attribute is located. This attribute is present when a file requires more than one MFT file record.</td></tr><tr><td>Index Bitmap</td><td>$BITMAP</td><td>Maybe</td><td>This attribute is used for different purposes: for nonresident directories (where an $INDEX_ALLOCATION always exists), the bitmap records which 4 KB-sized index blocks are already in use by this file, and the file is not used as B-tree grows. In the MFT there is an unrelated &quot;$Bitmap&quot; attribute that tracks which MFT segments are in use, and which are free for future use by new files or by existing files that require more space.</td></tr></table>


662      CHAPTER 11   Caching and file systems


---

<table><tr><td>Attribute</td><td>Attribute Type Name</td><td>Resident?</td><td>Description</td></tr><tr><td>Object ID</td><td>$OBJECT_ID</td><td>Always</td><td>A 16-byte identifier (GUID) for a file or directory. The link-tracking service assigns object IDs to shell shortcut and OLE link source files. NTFS provides APIs so that files and directories can be opened with the object type names than their name.</td></tr><tr><td>Reparse information</td><td>$REPARSE_POINT</td><td>Maybe</td><td>This attribute stores a file's reparse point data. NTFS junctions and mount points include this attribute.</td></tr><tr><td>Extended attributes</td><td>$EA,$EA_INFORMATION</td><td>Maybe, Always</td><td>Extended attributes are name/value pairs and aren't normally used but are provided for backward compatibility with OS/2 applications.</td></tr><tr><td>Logged utility stream</td><td>$LOGGED_UTILITY_STREAM</td><td>Maybe</td><td>This attribute type can be used for various purposes by different NTFS components. See Table 11-7 for more details.</td></tr></table>


TABLE 11-7 \$LOGGED_UTILITY_STREAM attribute

<table><tr><td>Attribute</td><td>Attribute Type Name</td><td>Resident?</td><td>Description</td></tr><tr><td>Encrypted File Stream</td><td>$EFS</td><td>Maybe</td><td>EFS stores data in this attribute that&#x27;s used to manage a file&#x27;s encryption, such as the encrypted version of the key needed to decrypt the file and a list of users who are authorized to access the file.</td></tr><tr><td>Online encryption backup</td><td>$EfsBackup</td><td>Maybe</td><td>The attribute is used by the EFS Online encryption to store chunks of the original encrypted data stream.</td></tr><tr><td>Transactional NTFSData</td><td>$TXF_DATA</td><td>Maybe</td><td>When a file or directory becomes part of a transaction, $TXF also stores transaction data in the $TXF_DATA attribute, such as the file&#x27;s unique transaction ID.</td></tr><tr><td>Desired Storage Class</td><td>$DSC</td><td>Resident</td><td>The desired storage class is used for &quot;pinning&quot; a file to a preferred storage tier. See the &quot;NTFS support for tiered volumes&quot; section for more details.</td></tr></table>


Table 11-6 shows attribute names; however, attributes actually correspond to numeric type codes, which NTFS uses to order the attributes within a file record. The file attributes in an MFT record are ordered by these type codes (numerically in ascending order), with some attribute types appearing more than once—if a file has multiple data attributes, for example, or multiple file names. All possible attribute types (and their names) are listed in the $AttrDef metadata file.

Each attribute in a file record is identified with its attribute type code and has a value and an optional name. An attribute's value is the byte stream composing the attribute. For example, the value of the $FILE_NAME attribute is the file's name; the value of the $DATA attribute is whatever bytes the user stored in the file.

Most attributes never have names, although the index-related attributes and the $DATA attribute often do. Names distinguish between multiple attributes of the same type that a file can include. For example, a file that has a named data stream has two $DATA attributes: an unnamed $DATA attribute storing the default unnamed data stream, and a named $DATA attribute having the name of the alternate stream and storing the named stream's data.

CHAPTER 11   Caching and file systems      663


---

## File names

Both NTFs and FAT allow each file name in a path to be as many as 255 characters long. File names can

contain Unicode characters as well as multiple periods and embedded spaces. However, the FAT file

system supplied with MS-DOS is limited to 8 (non-Unicode) characters for its file names, followed by

a period and a 3-character extension. Figure 11-35 provides a visual representation of the different file

namespaces Windows supports and shows how they intersect.

Windows Subsystem for Linux (WSL) requires the biggest namespace of all the application execu tion environments that Windows supports, and therefore the NTFS namespace is equivalent to the

WSL namespace. WSL can create names that aren't visible to Windows and MS-DOS applications,

including names with trailing periods and trailing spaces. Ordinarily, creating a file using the large

POSIX namespace isn't a problem because you would do that only if you intended WSL applications

to use that file.

![Figure](figures/Winternals7thPt2_page_695_figure_003.png)

FIGURE 11-35 Windows file namespaces.

The relationship between 32-bit Windows applications and MS-DOS and 16-bit Windows applications is a much closer one, however. The Windows area in Figure 11-35 represents file names that the Windows subsystem can create on an NTFS volume but that MS-DOS and 16-bit Windows applications can't see. This group includes file names longer than the 8.3 format of MS-DOS names, those containing Unicode (international) characters, those with multiple period characters or a beginning period, and those with embedded spaces. For compatibility reasons, when a file is created with such a name, NTFS automatically generates an alternate, MS-DOS-style file name for the file. Windows displays these short names when you use the /x option with the dir command.

The MS-DOS file names are fully functional aliases for the NTFS files and are stored in the same


directory as the long file names. The MFT record for a file with an autogenerated MS-DOS file name is


shown in Figure 11-36.

---

![Figure](figures/Winternals7thPt2_page_696_figure_000.png)

FIGURE 11-36 MFT file record with an MS-DOS file name attribute.

The NTFS name and the generated MS-DOS name are stored in the same file record and therefore refer to the same file. The MS-DOS name can be used to open, read from, write to, or copy the file. If a user renames the file using either the long file name or the short file name, the new name replaces both the existing names. If the new name isn't a valid MS-DOS name, NTFS generates another MS-DOS name for the file. (Note that NTFS only generates MS-DOS-style file names for the first file name.)

![Figure](figures/Winternals7thPt2_page_696_figure_003.png)

Note Hard links are implemented in a similar way. When a hard link to a file is created, NTFS adds another file name attribute to the file's MFT file record, and adds an entry in the Index Allocation attribute of the directory in which the new link resides. The two situations differ in one regard, however. When a user deletes a file that has multiple names (hard links), the file record and the file remain in place. The file and its record are deleted only when the last file name (hard link) is deleted. If a file has both an NTFS name and an autogenerated MS-DOS name, however, a user can delete the file using either name.

Here's the algorithm NTFS uses to generate an MS-DOS name from a long file name. The algorithm is actually implemented in the kernel function RtlGenerate8dotName and can change in future Windows releases. The latter function is also used by other drivers, such as CDFS, FAT, and third-party file systems:

- 1. Remove from the long name any characters that are illegal in MS-DOS names, including spaces

and Unicode characters. Remove preceding and trailing periods. Remove all other embedded

periods, except the last one.

2. Truncate the string before the period (if present) to six characters (it may already be six or fewer

because this algorithm is applied when any character that is illegal in MS-DOS is present in the

name). If it is two or fewer characters, generate and concatenate a four-character hex checksum

string. Append the string ~n (where n is a number, starting with 1, that is used to distinguish

different files that truncate to the same name). Truncate the string after the period (if present)

to three characters.

3. Put the result in uppercase letters. MS-DOS is case-insensitive, and this step guarantees that

NTFS won’t generate a new name that differs from the old name only in case.

4. If the generated name duplicates an existing name in the directory, increment the ~n string. If n

is greater than 4, and a checksum was not concatenated already, truncate the string before the

period to two characters and generate and concatenate a four-character hex checksum string.
CHAPTER 11   Caching and file systems      665


---

Table 11-8 shows the long Windows file names from Figure 11-35 and their NTFS-generated MS-DOS versions. The current algorithm and the examples in Figure 11-35 should give you an idea of what NTFSgenerated MS-DOS-style file names look like.

![Figure](figures/Winternals7thPt2_page_697_figure_001.png)

Note Since Windows 8.1, by default all the NTFs nonbootable volumes have short name generation disabled. You can disable short name generation even in older version of Windows by setting HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\ NtfDisable8dot3NameCreation in the registry to a DWORD value of 1 and restarting the machine. This could potentially break compatibility with older applications, though.

TABLE 11-8 NTFS-generated file names

<table><tr><td>Windows Long Name</td><td>NTFS-Generated Short Name</td></tr><tr><td>LongFileName</td><td>LONGFI~1</td></tr><tr><td>UnicodeName.FDPL</td><td>UNICOD~1</td></tr><tr><td>File.Name.With.Dots</td><td>FILENA~1.DOT</td></tr><tr><td>File.Name2.With.Dots</td><td>FILENA~2.DOT</td></tr><tr><td>File.Name3.With.Dots</td><td>FILENA~3.DOT</td></tr><tr><td>File.Name4.With.Dots</td><td>FILENA~4.DOT</td></tr><tr><td>File.Name5.With.Dots</td><td>FIF596~1.DOT</td></tr><tr><td>Name.With Embedded Spaces</td><td>NAMEVI~1</td></tr><tr><td>.BeginningDot</td><td>BEGINN~1</td></tr><tr><td>254.two characters</td><td>255440~1.TWO</td></tr><tr><td>©</td><td>6E2D~1</td></tr></table>


## Tunneling

NTFS uses the concept of tunneling to allow compatibility with older programs that depend on the file system to cache certain file metadata for a period of time even after the file is gone, such as when it has been deleted or renamed. With tunneling, any new file created with the same name as the original file, and within a certain period of time, will keep some of the same metadata. The idea is to replicate behavior expected by MS-DOS programs when using the sds save programming method, in which modified data is copied to a temporary file, the original file is deleted, and then the temporary file is renamed to the original name. The expected behavior in this case is that the renamed temporary file should appear to be the same as the original file; otherwise, the creation time would continuously update itself with each modification (which is how the modified time is used).

NTFS uses tunneling so that when a file name is removed from a directory, its long name and short name, as well as its creation time, are saved into a cache. When a new file is added to a directory, the cache is searched to see whether there is any tunneled data to restore. Because these operations apply to directories, each directory instance has its own cache, which is deleted if the directory is removed.

666      CHAPTER 11   Caching and file systems


---

NTFS will use tunneling for the following series of operations if the names used result in the deletion and re-creation of the same file name:

- • Delete + Create

• Delete + Rename

• Rename + Create

• Rename + Rename
By default, NTFS keeps the tunneling cache for 15 seconds, although you can modify this timeout by creating a new value called MaximumTunnelEntryAgeInSeconds in the HKLM\SYSTEM\ CurrentControlSet\Control\FileSystem registry key. Tunneling can also be completely disabled by creating a new value called MaximumTunnelEntries and setting it to 0; however, this will cause older applications to break if they rely on the compatibility behavior. On NTFS volumes that have short name generation disabled (see the previous section), tunneling is disabled by default.

You can see tunneling in action with the following simple experiment in the command prompt:

- 1. Create a file called file1.

2. Wait for more than 15 seconds (the default tunnel cache timeout).

3. Create a file called file2.

4. Perform a dir /TC. Note the creation times.

5. Rename file1 to file.

6. Rename file2 to file1.

7. Perform a dir /TC. Note that the creation times are identical.
## Resident and nonresident attributes

If a file is small, all its attributes and their values (its data, for example) fit within the file record that describes the file. When the value of an attribute is stored in the MFT (either in the file's main file record or an extension record located elsewhere within the MFT), the attribute is called a resident attribute. (In Figure 11-37, for example, all attributes are resident.) Several attributes are defined as always being resident so that NTFS can locate nonresident attributes. The standard information and index root attributes are always resident, for example.

Each attribute begins with a standard header containing information about the attribute—information that NTFS uses to manage the attributes in a generic way. The header, which is always resident, records whether the attribute's value is resident or nonresident. For resident attributes, the header also contains the offset from the header to the attribute's value and the length of the attribute's value, as Figure 11-37 illustrates for the file name attribute.

When an attribute's value is stored directly in the MFT, the time it takes NTFS to access the value is greatly reduced. Instead of looking up a file in a table and then reading a succession of allocation

CHAPTER 11   Caching and file systems      667


---

units to find the file's data (as the FAT file system does, for example), NTFS accesses the disk once and retrieves the data immediately.

![Figure](figures/Winternals7thPt2_page_699_figure_001.png)

FIGURE 11-37 Resident attribute header and value.

The attributes for a small directory, as well as for a small file, can be resident in the MFT , as Figure 11-38 shows. For a small directory, the index root attribute contains an index (organized as a B-tree) of file record numbers for the files (and the subdirectories) within the directory.

![Figure](figures/Winternals7thPt2_page_699_figure_004.png)

FIGURE 11-38 MFT file record for a small directory.

Of course, many files and directories can't be squeezed into a 1 KB or 4 KB, fixed-size MFT record. If a particular attribute's value, such as a file's data attribute, is too large to be contained in an MFT file record, NTFS allocates clusters for the attribute's value outside the MFT. A contiguous group of clusters is called a run (or an extent). If the attribute's value later grows (if a user appends data to the file, for example), NTFS allocates another run for the additional data. Attributes whose values are stored in runs (rather than within the MFT) are called nonresident attributes. The file system decides whether a particular attribute is resident or nonresident; the location of the data is transparent to the process accessing it.

When an attribute is nonresident, as the data attribute for a large file will certainly be, its header

contain the information NTFS needs to locate the attribute's value on the disk. Figure 11-39 shows a

nonresident data attribute stored in two runs.

![Figure](figures/Winternals7thPt2_page_699_figure_008.png)

FIGURE 11-39 MFT file record for a large file with two data runs.

668      CHAPTER 11   Caching and file systems


---

Among the standard attributes, only those that can grow can be nonresident. For files, the attributes

that can grow are the data and the attribute list (not shown in Figure 11-39). The standard information

and file name attributes are always resident.

A large directory can also have nonresident attributes (or parts of attributes), as Figure 11-40 shows. In this example, the MFT file record doesn't have enough room to store the B-tree that contains the index of files that are within this large directory. A part of the index is stored in the index root attribute, and the rest of the index is stored in nonresident runs called index allocations. The index root, index allocation, and bitmap attributes are shown here in a simplified form. They are described in more detail in the next section. The standard information and file name attributes are always resident. The header and at least part of the value of the index root attribute are also resident for directories.

![Figure](figures/Winternals7thPt2_page_700_figure_002.png)

FIGURE 11-40 MFT file record for a large directory with a nonresident file name index.

When an attribute's value can't fit in an MFT file record and separate allocations are needed, NTFS

keeps track of the runs by means of VCN-to-LCN mapping pairs. LCNs represent the sequence of

clusters on an entire volume from 0 through n. VCNs number the clusters belonging to a particular file

from 0 through m. For example, the clusters in the runs of a nonresident data attribute are numbered

as shown in Figure 11-41.

![Figure](figures/Winternals7thPt2_page_700_figure_005.png)

FIGURE 11-41 VCNs for a nonresident data attribute.

If this file had more than two runs, the numbering of the third run would start with VCN 8. As

Figure 11-42 shows, the data attribute header contains VCN-to-LCN mappings for the two runs here,

which allows NTFS to easily find the allocations on the disk.

CHAPTER 11 Caching and file systems   669


---

![Figure](figures/Winternals7thPt2_page_701_figure_000.png)

FIGURE 11-42 VCN-to-LCN mappings for a nonresident data attribute.

Although Figure 11-41 shows just data runs, other attributes can be stored in runs if there isn't enough room in the MFT file record to contain them. And if a particular file has too many attributes to fit in the MFT record, a second MFT record is used to contain the additional attributes (or attribute headers for nonresident attributes). In this case, an attribute called the attribute list is added. The attribute list attribute contains the name and type code of each of the file's attributes and the file number of the MFT record where the attribute is located. The attribute list attribute is provided for those cases where all of a file's attributes will not fit within the file's file record or when a file grows so large or so fragmented that a single MFT record can't contain the multitude of VCN-to-LCN mappings needed to find all its runs. Files with more than 200 runs typically require an attribute list. In summary, attribute headers are always contained within file records in the MFT, but an attribute's value may be located outside the MFT in one or more extents.

## Data compression and sparse files

NTFS supports compression on a per-file, per-directory, or per-volume basis using a variant of the LZ77 algorithm, known as LZNT1. (NTFS compression is performed only on user data, not file system metadata.) In Windows 8.1 and later, files can also be compressed using a newer suite of algorithms, which include LZX (most compact) and XPRESS (including using 4, 8, or 16K block sizes, in order of speed). This type of compression, which can be used through commands such as the compact shell command (as well as File Provider APIs), leverages the Windows Overlay Filter (WOF) file system filter driver (Wof.sys), which uses an NTFS alternate data stream and sparse files, and is not part of the NTFS driver per se. WOF is outside the scope of this book, but you can read more about it here: https://devblogs.microsoft. com/oldnewthing/20190618-00/?p=102597.

You can tell whether a volume is compressed by using the Windows GetVolumeInformation function. To retrieve the actual compressed size of a file, use the Windows GetCompressedFileSize function. Finally, to examine or change the compression setting for a file or directory, use the Windows DevelopeControl function. (See the FSCTL_GET_COMPRESSION and FSCTL_SET_COMPRESSION file system control codes.) Keep in mind that although setting a file's compression state compresses (or decompresses) the file right away, setting a directory's or volume's compression state doesn't cause any immediate compression or decompression. Instead, setting a directory's or volume's compression state sets a default


CHAPTER 11 Caching and file systems

---

compression state that will be given to all newly created files and subdirectories within that directory or

volume (although, if you were to set directory compression using the directory's property page within

Explorer, the contents of the entire directory tree will be compressed immediately).

The following section introduces NTFS compression by examining the simple case of compressing sparse data. The subsequent sections extend the discussion to the compression of ordinary files and sparse files.

![Figure](figures/Winternals7thPt2_page_702_figure_002.png)

Note NTFS compression is not supported in DAX volumes or for encrypted files.

## Compressing sparse data

Sparse data is often large but contains only a small amount of nonzero data relative to its size. A sparse matrix is one example of sparse data. As described earlier, NTFS uses VCNs, from 0 through m, to enumerate the clusters of a file. Each VCN maps to a corresponding LCN, which identifies the disk location of the cluster. Figure 11-43 illustrates the runs (disk allocations) of a normal, noncompressed file, including its VCNs and the LCNs they map to.

![Figure](figures/Winternals7thPt2_page_702_figure_006.png)

FIGURE 11-43 Runs of a noncompressed file.

This file is stored in three runs, each of which is 4 clusters long, for a total of 12 clusters. Figure 11-44 shows the MFT record for this file. As described earlier, to save space, the MFT record's data attribute, which contains VCN-to-LCN mappings, records only one mapping for each run, rather than one for each cluster. Notice, however, that each VCN from 0 through 11 has a corresponding LCN associated with it. The first entry starts at VCN 0 and covers 4 clusters, the second entry starts at VCN 4 and covers 4 clusters, and so on. This entry format is typical for a noncompressed file.

<table><tr><td>Standard information</td><td colspan="2">File name</td><td colspan="3">Data</td></tr><tr><td rowspan="4"></td><td rowspan="4"></td><td>Starting VCN</td><td>Starting LCN</td><td>Number of clusters</td><td></td></tr><tr><td>0</td><td>1355</td><td>4</td><td></td></tr><tr><td>4</td><td>1588</td><td>4</td><td></td></tr><tr><td>8</td><td>2033</td><td>4</td><td></td></tr></table>


FIGURE 11-44 MFT record for a noncompressed file.

When a user selects a file on an NTFS volume for compression, one NTFS compression technique is to remove long strings of zeros from the file. If the file's data is sparse, it typically shrinks to occupy a

CHAPTER 11 Caching and file systems   671


---

fraction of the disk space it would otherwise require. On subsequent writes to the file, NTFS allocates space only for runs that contain nonzero data.

Figure 11-45 depicts the runs of a compressed file containing sparse data. Notice that certain ranges of the file's VCNs (16-31 and 64-127) have no disk allocations.

![Figure](figures/Winternals7thPt2_page_703_figure_002.png)

FIGURE 11-45 Runs of a compressed file containing sparse data.

The MFT record for this compressed file omits blocks of VCNs that contain zeros and therefore have no physical storage allocated to them. The first data entry in Figure 11-46, for example, starts at VCN 0 and covers 16 clusters. The second entry jumps to VCN 32 and covers 16 clusters.

![Figure](figures/Winternals7thPt2_page_703_figure_005.png)

FIGURE 11-46 MFT record for a compressed file containing sparse data.

When a program reads data from a compressed file, NTFS checks the MFT record to determine whether a VCN-to-LCN mapping covers the location being read. If the program is reading from an unallocated "hole" in the file, it means that the data in that part of the file consists of zeros, so NTFS returns zeros without further accessing the disk. If a program writes nonzero data to a "hole," NTFS quietly allocates disk space and then writes the data. This technique is very efficient for sparse file data that contains a lot of zero data.

672      CHAPTER 11   Caching and file systems


---

## Compressing nonsparse data

The preceding example of compressing a sparse file is somewhat contrived. It describes "compression" for a case in which whole sections of a file were filled with zeros, but the remaining data in the file wasn't affected by the compression. The data in most files isn't sparse, but it can still be compressed by the application of a compression algorithm.

In NTFS, users can specify compression for individual files or for all the files in a directory. (New files created in a directory marked for compression are automatically compressed—existing files must be compressed individually when programmatically enabling compression with FSCTL_SET_ COMPRESSION.) When it compresses a file, NTFS divides the file's unprocessed data into compression units 16 clusters long (equal to 128 KB for a 8 KB cluster, for example). Certain sequences of data in a file might not compress much, if at all; so for each compression unit in the file, NTFS determines whether compressing the unit will save at least 1 cluster of storage. If compressing the unit won't free up at least 1 cluster, NTFS allocates a 16-cluster run and writes the data in that unit to disk without compressing it. If the data in a 16-cluster unit will compress to 15 or fewer clusters, NTFS allocates only the number of clusters needed to contain the compressed data and then writes it to disk. Figure 11-47 illustrates the compression of a file with four runs. The unshaded areas in this figure represent the actual storage locations that the file occupies after compression. The first, second, and fourth runs were compressed; the third run wasn't. Even with one noncompressed run, compressing this file saved 26 clusters of disk space, or 41%.

![Figure](figures/Winternals7thPt2_page_704_figure_003.png)

FIGURE 11-47 Data runs of a compressed file.

![Figure](figures/Winternals7thPt2_page_704_figure_005.png)

Note Although the diagrams in this chapter show contiguous LCNs, a compression unit need not be stored in physically contiguous clusters. Runs that occupy noncontiguous clusters produce slightly more complicated MFT records than the one shown in Figure 11-47.

CHAPTER 11   Caching and file systems      673

---

When it writes data to a compressed file, NTFS ensures that each run begins on a virtual 16-cluster boundary. Thus the starting VCN of each run is a multiple of 16, and the runs are no longer than 16 clusters. NTFS reads and writes at least one compression unit at a time when it accesses compressed files. When it writes compressed data, however, NTFS tries to store compression units in physically contiguous locations so that it can read them all in a single I/O operation. The 16-cluster size of the NTFS compression unit was chosen to reduce internal fragmentation: the larger the compression unit, the less the overall disk space needed to store the data. This 16-cluster compression unit size represents a trade-off between producing smaller compressed files and slowing read operations for programs that randomly access files. The equivalent of 16 clusters must be decompressed for each cache miss. (A cache miss is more likely to occur during random file access.) Figure 11-48 shows the MFT record for the compressed file shown in Figure 11-47.

<table><tr><td>Standard information</td><td rowspan="5">File name</td><td colspan="4">Data</td></tr><tr><td></td><td>Starting VCN</td><td>Starting LCN</td><td>Number of clusters</td><td></td></tr><tr><td rowspan="4"></td><td>0</td><td>19</td><td>4</td><td></td></tr><tr><td>16</td><td>23</td><td>8</td><td></td></tr><tr><td>32</td><td>97</td><td>16</td><td></td></tr><tr><td></td><td>48</td><td>113</td><td>10</td><td></td></tr></table>


FIGURE 11-48 MFT record for a compressed file.

One difference between this compressed file and the earlier example of a compressed file containing sparse data is that three of the compressed runs in this file are less than 16 clusters long. Reading this information from a file's MFT file record enables NTFS to know whether data in the file is compressed. Any run shorter than 16 clusters contains compressed data that NTFS must decompress when it first reads the data into the cache. A run that is exactly 16 clusters long doesn't contain compressed data and therefore requires no decompression.

If the data in a run has been compressed, NTFS decompresses the data into a scratch buffer and

then copies it to the caller's buffer. NTFS also loads the decompressed data into the cache, which makes

subsequent reads from the same run as fast as any other cached read. NTFS writes any updates to the

file to the cache, leaving the lazy writer to compress and write the modified data to disk asynchro nously. This strategy ensures that writing to a compressed file produces no more significant delay than

writing to a noncompressed file would.

NTFS keeps disk allocations for a compressed file contiguous whenever possible. As the LCNs indi cate, the first two runs of the compressed file shown in Figure 11-47 are physically contiguous, as are

the last two. When two or more runs are contiguous, NTFS performs disk read-ahead, as it does with

the data in other files. Because the reading and decompression of contiguous file data take place asyn chronously before the program requests the data, subsequent read operations obtain the data directly

from the cache, which greatly enhances read performance.

---

## Sparse files

Sparse files (the NTFS file type, as opposed to files that consist of sparse data, as described earlier) are essentially compressed files for which NTFS doesn't apply compression to the file's nonsparse data. However, NTFS manages the run data of a sparse file's MFT record the same way it does for compressed files that consist of sparse and nonsparse data.

## The change journal file

The change journal file, $\Extend\UsnJnl, is a sparse file in which NTFS stores records of changes to files and directories. Applications like the Windows File Replication Service (FRS) and the Windows Search service make use of the journal to respond to file and directory changes as they occur.

The journal stores change entries in the $1 data stream and the maximum size of the journal in the $Max data stream. Entries are versioned and include the following information about a file or directory change:

- ● The time of the change

● The reason for the change (see Table 11-9)

● The file or directory’s attributes

● The file or directory’s name

● The file or directory’s MFT file record number

● The file record number of the file’s parent directory

● The security ID

● The update sequence number (USN) of the record

● Additional information about the source of the change (a user, the FRS, and so on)
TABLE 11-9 Change journal change reasons

<table><tr><td>Identifier</td><td>Reason</td></tr><tr><td>USN_REASON_DATA_OVERWRITE</td><td>The data in the file or directory was overwritten.</td></tr><tr><td>USN_REASON_DATA_EXTEND</td><td>Data was added to the file or directory.</td></tr><tr><td>USN_REASON_DATA_TRUNCATION</td><td>The data in the file or directory was truncated.</td></tr><tr><td>USN_REASON_NAMED_DATA_OVERWRITE</td><td>The data in a file&#x27;s data stream was overwritten.</td></tr><tr><td>USN_REASON_NAMED_DATA_EXTEND</td><td>The data in a file&#x27;s data stream was extended.</td></tr><tr><td>USN_REASON_NAMED_DATA_TRUNCATION</td><td>The data in a file&#x27;s data stream was truncated.</td></tr><tr><td>USN_REASON_FILE_CREATE</td><td>A new file or directory was created.</td></tr><tr><td>USN_REASON_FILE_DELETE</td><td>A file or directory was deleted.</td></tr><tr><td>USN_REASON_EA_CHANGE</td><td>The extended attributes for a file or directory changed.</td></tr><tr><td>USN_REASON_SECURITY_CHANGE</td><td>The security descriptor for a file or directory was changed.</td></tr><tr><td>USN_REASON_RENAME_OLD_NAME</td><td>A file or directory was renamed; this is the old name.</td></tr></table>


CHAPTER 11   Caching and file systems      675


---

<table><tr><td>Identifier</td><td>Reason</td></tr><tr><td>USN_REASON_RENAME_NEW_NAME</td><td>A file or directory was renamed; this is the new name.</td></tr><tr><td>USN_REASON_INDEXABLE_CHANGE</td><td>The indexing state for the file or directory was changed (whether or not the indexing service will process this file or directory).</td></tr><tr><td>USN_REASON_BASIC_INFO_CHANGE</td><td>The file or directory attributes and/or the time stamps were changed.</td></tr><tr><td>USN_REASON_HARD_LINK_CHANGE</td><td>A hard link was added or removed from the file or directory.</td></tr><tr><td>USN_REASON_COMPRESSION_CHANGE</td><td>The compression state for the file or directory was changed.</td></tr><tr><td>USN_REASON_ENCRYPTION_CHANGE</td><td>The encryption state (EFS) was enabled or disabled for this file or directory.</td></tr><tr><td>USN_REASON_OBJECT_ID_CHANGE</td><td>The object ID for this file or directory was changed.</td></tr><tr><td>USN_REASON_REPARSE_POINT_CHANGE</td><td>The reparse point for a file or directory was changed, or a new reparse point (such as a symbolic link) was added or deleted from a file or directory.</td></tr><tr><td>USN_REASON_STREAM_CHANGE</td><td>A new data stream was added to or removed from a file or renamed.</td></tr><tr><td>USN_REASON_TRANSACTED_CHANGE</td><td>This value is added (OReD) to the change reason to indicate that the change was the result of a recent commit of a TxF transaction.</td></tr><tr><td>USN_REASON_CLOSE</td><td>The handle to a file or directory was closed, indicating that this is the final modification made to the file in this series of operations.</td></tr><tr><td>USN_REASON_INTEGRITY_CHANGE</td><td>The content of a file&#x27;s extent (run) has changed, so the associated integrity stream has been updated with a new checksum. This identifier is generated by the ReFS file system.</td></tr><tr><td>USN_REASON_DESIRED_STORAGE_CLASS_CHANGE</td><td>The event is generated by the NTFS file system driver when a stream is moved from the capacity to the performance tier or vice versa.</td></tr></table>


## EXPERIMENT: Reading the change journal

You can use the built-in %SystemRoot%\System32\fsutil.exe tool to create, delete, or query journal information with the built-in Fsutil.exe utility, as shown here:

```bash
d:\fsutil use jquery journal d:
   Usn Journal ID   : 0x0148f4c8383c7c2
   First Usn       : 0x0000000000000000
   Next Usn       : 0x0000000000000000
   Lowest Valid Usn : 0x0000000000000000
   Maximum Valid : 0x0000000000000000
   Maximum Size : 0x0000000000000000
   Allocation Delta : 0x0000000000000000
   Minimum record version supported : 2
   Maximum record version supported : 4
   Write range tracking: Disabled
```

The output indicates the maximum size of the change journal on the volume (10 MB) and its current state. As a simple experiment to see how NTFS records changes in the journal, create a file called Usn.txt in the current directory, rename it to UsnNew.txt, and then dump the journal with Fsutil, as shown here:

```bash
d:\echo Hello USn Journal>> Usn.txt
d:\rem Usn.txt UsnNew.txt
```

---

```bash
d:\>fsutil usn readjournal d:
  ...
  Usn              : 2656
  File name        : Usn.txt
  File name length : 14
  Reason            : 0x00000100: File create
  Time stamp        : 12/8/2018 15:22:05
  File attributes      : 0x00000020: Archive
  File ID             : 00000000000000000000c000000617912
  Parent file ID       : 0000000000000000000018000000617ab6
  Source info         : 0x00000000: *NONE*
  Security ID        : 0
  Major version      : 3
  Minor version       : 0
  Record length    : 96
  Usn              : 2736
  File name        : Usn.txt
  File name length : 14
  Reason            : 0x00000102: Data extend | File create
  Time stamp        : 12/8/2018 15:22:05
  File attributes      : 0x00000020: Archive
  File ID             : 00000000000000000000c000000617912
  Parent file ID       : 0000000000000000000018000000617ab6
  Source info         : 0x00000000: *NONE*
  Security ID        : 0
  Major version       : 0
  Minor version       : 0
  Record length    : 96
  Usn              : 2816
  File name        : Usn.txt
  File name length : 14
  Reason            : 0x80000102: Data extend | File create | Close
  Time stamp        : 12/8/2018 15:22:05
  File attributes      : 0x00000020: Archive
  File ID             : 00000000000000000000c000000617912
  Parent file ID       : 0000000000000000000018000000617ab6
  Source info         : 0x00000000: *NONE*
  Security ID        : 0
  Major version       : 3
  Minor version       : 0
  Record length    : 96
  Usn              : 2896
  File name        : Usn.txt
  File name length : 14
  Reason            : 0x00001000: Rename: old name
  Time stamp        : 12/8/2018 15:22:15
  File attributes      : 0x00000020: Archive
  File ID             : 00000000000000000000c000000617912
  Parent file ID       : 0000000000000000000018000000617ab6
  Source info         : 0x00000000: *NONE*
```

CHAPTER 11   Caching and file systems     677


---

```bash
Major version    : 3
Minor version    : 0
Record length    : 96
Usn               : 2976
File name        : UsnNew.txt
File name length : 20
Reason            : 0x00002000: Rename: new name
Time stamp       : 12/8/2018 15:22:15
File attributes      : 0x00000020: Archive
File ID             : 00000000000000000000c000000617912
Parent file ID     : 0000000000000000000018000000617ab6
Source info        : 0x000000000: "NONE"
Security ID         : 0
Major version    : 3
Minor version      : 0
Record length    : 96
Usn               : 3056
File name        : UsnNew.txt
File name length : 20
Reason           : 0x80002000: Rename: new name | Close
Time stamp       : 12/8/2018 15:22:15
File attributes      : 0x00000020: Archive
File ID             : 00000000000000000000c000000617912
Parent file ID    : 00000000000000000001800000617ab6
Source info        : 0x000000000: "NONE"
Security ID         : 0
Major version    : 3
Minor version      : 0
Record length    : 96
```

The entries reflect the individual modification operations involved in the operations underlying the command-line operations. If the change journal isn't enabled on a volume (this happens especially on non-system volumes where no applications have requested file change notification or the USN Journal creation), you can easily create it with the following command (in the example a 10-MB journal has been requested):

```bash
d:\>fsutil usn createJournal d: m=10485760 a=2097152
```

The journal is sparse so that it never overflows; when the journal's on-disk size exceeds the maximum defined for the file, NTFS simply begins zeroing the file data that precedes the window of change information having a size equal to the maximum journal size, as shown in Figure 11-49. To prevent constant resizing when an application is continuously exceeding the journal's size, NTFS shrinks the journal only when its size is twice an application-defined value over the maximum configured size.

---

![Figure](figures/Winternals7thPt2_page_710_figure_000.png)

FIGURE 11-49 Change journal ($Usn$jml) space allocation.

## Indexing

In NTFS, a file directory is simply an index of file names—that is, a collection of file names (along with their file record numbers) organized as a B-tree. To create a directory, NTFS indexes the file name attributes of the files in the directory. The MFT record for the root directory of a volume is shown in Figure 11-50.

![Figure](figures/Winternals7thPt2_page_710_figure_004.png)

FIGURE 11-50 File name index for a volume's root directory.

CHAPTER 11 Caching and file systems   679


---

Conceptually, an MFT entry for a directory contains in its index root attribute a sorted list of the

files in the directory. For large directories, however, the file names are actually stored in 4 KB, fixed size index buffers (which are the nonresident values of the index allocation attribute) that contain and

organize the file names. Index buffers implement a B-tree data structure, which minimizes the number

of disk accesses needed to find a particular file, especially for large directories. The index root attribute

contains the first level of the B-tree (root subdirectories) and points to index buffers containing the

next level (more subdirectories, perhaps, or files).

Figure 11-50 shows only file names in the index root attribute and the index buffers (file6, for example), but each entry in an index also contains the record number in the MFT where the file is described and time stamp and file size information for the file. NTFS duplicates the time stamps and file size information from the file's MFT record. This technique, which is used by FAT and NTFS, requires updated information to be written in two places. Even so, it's a significant speed optimization for directory browsing because it enables the file system to display each file's time stamps and size without opening every file in the directory.

The index allocation attribute maps the VCNs of the index buffer runs to the LCNs that indicate where the index buffers reside on the disk, and the bitmap attribute keeps track of which VCNs in the index buffers are in use and which are free. Figure 11-50 shows one file entry per VCN (that is, per cluster), but file name entries are actually packed into each cluster. Each 4 KB index buffer will typically contain about 20 to 30 file name entries (depending on the lengths of the file names within the directory).

The B-tree data structure is a type of balanced tree that is ideal for organizing sorted data stored on a disk because it minimizes the number of disk accesses needed to find an entry. In the MFT, a directory's index root attribute contains several file names that act as indexes into the second level of the B-tree. Each file name in the index root attribute has an optional pointer associated with it that points to an index buffer. The index buffer points to containing file names with lexicographically values less than its own. In Figure 11-50, for example, file4 is a first-level entry in the B-tree. It points to an index buffer containing file names that are (lexicographically) less than itself—the file names file0, file1, and file3. Note that the names file1, file3, and so on that are used in this example are not literal file names but names intended to show the relative placement of files that are lexicographically ordered according to the displayed sequence.

Storing the file names in B-trees provides several benefits. Directory lookups are fast because the file names are stored in a sorted order. And when higher-level software enumerates the files in a directory, NTFS returns already-sorted names. Finally, because B-trees tend to grow wide rather than deep, NTFS's fast lookup times don't degrade as directories grow.

NTFS also provides general support for indexing data besides file names, and several NTFS features—including object IDs, quota tracking, and consolidated security—use indexing to manage internal data.

The B-tree indexes are a generic capability of NITFS and are used for organizing security descriptors,

security IDs, object IDs, disk quota records, and reparse points. Directories are referred to as file name

indexes, whereas other types of indexes are known as view indexes.

---

## Object IDs

In addition to storing the object ID assigned to a file or directory in the $OBJECT_ID attribute of its MFT record, NTFS also keeps the correspondence between object IDs and their file record numbers in the $O index of the $\Extend\JobID metadata file. The index collates entries by object ID (which is a GUID), making it easy for NTFS to quickly locate a file based on its ID. This feature allows applications, using the NTCreateFile native API with the FILE_OPEN_BY_FILE_ID flag, to open a file or directory using its object ID. Figure 11-51 demonstrates the correspondence of the $ObjId metadata file and $OBJECT_ ID attributes in MFT records.

![Figure](figures/Winternals7thPt2_page_712_figure_002.png)

FIGURE 11-51 $ObjId and $OBJECT_ID relationships.

### Quota tracking

NTFS stores quota information in the $\X$text and \X quota metadata file, which consists of the named index root attributes SO and SQ. Figure 11-52 shows the organization of these indexes. Just as NTFS assigns each security descriptor a unique internal security ID, NTFS assigns each user a unique user ID. When an administrator defines quota information for a user, NTFS allocates a user ID that corresponds to the user's SID. In the SQ index, NTFS creates an entry that maps an SID to a user ID and sorts the index by SID; in the QO index, NTFS creates a quota control entry. A quota control entry contains the value of the user's quota limits, as well as the amount of disk space the user consumes on the volume.

When an application creates a file or directory, NTFS obtains the application user's SID and looks up the associated user ID in the $O index. NTFS records the user ID in the new file or directory's $STANDARD_ INFORMATION attribute, which counts all disk space allocated to the file or directory against that user's quota. Then NTFS looks up the quota entry in the $Q index and determines whether the new allocation causes the user to exceed his or her warning or limit threshold. When a new allocation causes the user to

CHAPTER 11   Caching and file systems      681


---

exceed a threshold. NTFS takes appropriate steps, such as logging an event to the System event log or

not letting the user create the file or directory. As a file or directory changes size, NTFS updates the quota

control entry associated with the user ID stored in the $STANDARD_INFORMATION attribute. NTFS uses

the NTFS generic B-tree indexing to efficiently correlate user IDs with account SIDs and, given a user ID, to

efficiently look up a user's quota control information.

![Figure](figures/Winternals7thPt2_page_713_figure_001.png)

FIGURE 11-52 $Quota indexing.

## Consolidated security

NTFS has always supported security, which lets an administrator specify which users can and can't access individual files and directories. NTFS optimizes disk utilization for security descriptors by using a central metadata file named $Secure to store only one instance of each security descriptor on a volume.

The $Secure file contains two index attributes—$SDH (Security Descriptor Hash) and $SII (Security ID Index)—and a data-stream attribute named $DDS (Security Descriptor Stream), as Figure 11-53 shows. NTS assigns every unique security descriptor on a volume an internal NTS security ID (not to be confused with a Windows SID, which uniquely identifies computers and user accounts) and hashes the security descriptor according to a simple hash algorithm. A hash is a potentially nonunique shorthand representation of a descriptor. Entries in the $SDH index map the security descriptor hashes to the security descriptor's storage location within the $DDS data attribute, and the $SII index entries map NTFS security IDs to the security descriptor's location in the $DDS data attribute.

When you apply a security descriptor to a file or directory, NTFS obtains a hash of the descriptor and looks through the $SDH index for a match. NTFS sorts the $SDH index entries according to the hash of their corresponding security descriptor and stores the entries in a B-tree. If NTFS finds a match for the descriptor in the $SDH index, NTFS locates the offset of the entry's security descriptor from the entry's offset value and reads the security descriptor from the $SDS attribute. If the hashes match but the security descriptors don't, NTFS looks for another matching entry in the $SDH index. When NTFS finds a precise match, the file or directory to which you're applying the security descriptor can reference the existing security descriptor in the $SDS attribute. NTFS makes the reference by reading the NTFS security identifier

682      CHAPTER 11    Caching and file systems


---

from the $SDH entry and storing it in the file or directory's $STANDARD_INFORMATION attribute. The NTFS $STANDARD_INFORMATION attribute, which all files and directories have, stores basic information about a file, including its attributes, time stamp information, and security identifier.

![Figure](figures/Winternals7thPt2_page_714_figure_001.png)

FIGURE 11-53 $Secure indexing.

If NTFS doesn't find in the $SDH index an entry that has a security descriptor that matches the descriptor you're applying, the descriptor you're applying is unique to the volume, and NTFS assigns the descriptor a new internal security ID. NTFS internal security IDs are 32-bit values, whereas SIDs are typically several times larger, so representing SIDs with NTFS security IDs saves space in the $STANDARDINFORMATION attribute. NTFS then adds the security descriptor to the end of the $SDS data attribute, and it adds to the $SDH and $SII indexes entries that reference the descriptor's offset in the $SDS data.

When an application attempts to open a file or directory, NTFS uses the SSII index to look up the file or directory's security descriptor. NTFS reads the file or directory's internal security ID from the MFT entry's $STANDARD_INFORMATION attribute. It then uses the $Secure file's SSII index to locate the ID's entry in the $SDS data attribute. The offset into the $SDS attribute lets NTFS read the security descriptor and complete the security check. NTFS stores the 32 most recently accessed security descriptors with their SSII index entries in a cache so that it accesses the $Secure file only when the SSII isn't cached.

NTFS doesn't delete entries in the $Secure file, even if no file or directory on a volume references the entry. Not deleting these entries doesn't significantly decrease disk space because most volumes, even those used for long periods, have relatively few unique security descriptors.

NTFS use of generic B-tree indexing lets files and directories that have the same security settings efficiently share security descriptors. The $S$II index lets NTFS quickly look up a security descriptor in the $Secure file while performing security checks, and the $SDH index lets NTFS quickly determine whether a security descriptor being applied to a file or directory is already stored in the $Secure file and can be shared.

CHAPTER 11   Caching and file systems      683


---

## Reparse points

As described earlier in the chapter, a reparse point is a block of up to 16 KB of application-defined reparse data and a 32-bit reparse tag that are stored in the $REPOSE_POINT attribute of a file or directory. Whenever an application creates or deletes a reparse point, NTFS updates the $Extend-$Reparse metadata file, in which NTFS stores entries that identify the file record numbers of files and directories that contain reparse points. storing the records in a central location enables NTFS to provide interfaces for applications to enumerate all a volume's reparse points or just specific types of reparse points, such as mount points. The $Extend-$Reparse file uses the generic B-tree indexing facility of NTFS by collating the file's entries (in an index named $R) by reparse point tags and file record numbers.

EXPERIMENT: Looking at different reparse points

A file or directory reparse point can contain any kind of arbitrary data. In this experiment, we use the built-in funtile.exe tool to analyze the reparse point content of a symbolic link and of a Modern application's AppExecutionAlias, similar to the experiment in Chapter 8. First you need to create a symbolic link:

```bash
C:\mklink\text_link.txt.d:\Test.txt
symbolic link created for test_link.txt <======> d:\Test.txt
```

Then you can use the fsutil reparsePoint query command to examine the reparse point content:

```bash
C:\fsutil.reparsePoint query test_link.txt
Reparse Tag Value : 0xa000000c
Tag value: Microsoft
Tag value: Name Surrogate
Tag value: Symbolic Link
Reparse Data Length: 0x00000040
Reparse Data:
0000: 16 00 1e 00 00 00 16 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
```

As expected, the content is a simple data structure (REPARSE_DATA_BUFFER, documented in

Microsoft Docs), which contains the symbolic link target and the printed file name. You can even

delete the reparse point by using fsutil reparsePoint delete command:

```bash
C:\more test_link.txt
This is a test file!
C:\fsutil reparsePoint delete test_link.txt
C:\more test_link.txt
```

---

If you delete the reparse point, the file become a 0 bytes file. This is by design because the

unnamed data stream ($DATA) in the link file is empty. You can repeat the experiment with an

AppExecutionAlias of an installed Modern application (in the following example, Spotify was used):

```bash
C:\cd C:\Users\Andrea\AppData\Local\Microsoft\WindowsApps
C:\users\Andrea\AppData\Local\Microsoft\WindowsApps>fsutil reparsePoint query Spotify.exe
Reparse Tag Value: 0x8000001b
Tag value: Microsoft
Reparse Data Length: 0x00000178
Reparse Data:
0000: 03 00 00 00 53 00 70 00 6f 00 74 00 69 00 60 00 ...S.p.o.t.i.f.
0010: 79 00 41 00 42 00 2e 00 53 00 70 00 6f 00 74 00 y.A.B..S.p.o.t.
0020: 69 00 66 00 79 00 40 00 75 00 73 00 69 00 63 00 i.f.y.M.s.u.s.i.c.
0030: 5f 00 7a 00 70 00 64 00 6e 00 65 00 6b 00 64 00 ..z.p.d.n.e.k.d.
0040: 72 00 74 00 72 00 65 00 61 00 30 00 00 00 53 00 r.z.r.e.a.o..0 ...
0050: 70 00 6f 00 74 00 69 00 66 00 79 00 41 00 42 00 p.o.t.i.f.y.A.B.
0060: 2e 00 53 00 70 00 6f 00 74 00 69 00 66 00 00 ...S.p.o.t.i.f.y.
0070: 4d 00 75 00 73 00 73 00 75 00 75 00 7a 00 70 00 M.s.u.s.i.c...z.p.
0080: 00 6e 00 64 00 6e 00 64 00 64 00 64 00 64 00 64 00 d.n.e.k.d.r.z.r.
0090: 65 00 60 00 20 21 00 53 00 70 64 00 69 00 66 00 74 00 z.p.o.t.i.f.y.
00a0: 69 00 66 00 79 00 00 43 00 3a 00 5c 00 50 00 i.f.y....C....\P.
00b0: 72 00 6f 00 67 00 72 00 61 00 64 00 20 00 46 00 r.o.g.r.a.m..F.
00c0: 69 00 6c 00 65 00 73 00 5c 00 57 00 69 00 6e 00 i.l.e.s..\W.i.n.
00d0: 64 00 6f 00 77 00 73 00 41 00 70 00 70 00 73 00 d.o.w.s.a.p.p.o.n.
00e0: 5c 00 53 00 70 00 6f 00 74 00 69 00 66 00 79 00 ..S.p.o.t.i.f.y.
00f0: 41 00 42 00 2e 53 00 70 00 6f 00 74 00 69 00 A.B..S.p.o.t.i.f.
0100: 66 00 79 00 4d 00 75 00 73 00 69 00 63 00 5f 00 f.y.M.u.s.i.c..
0110: 31 20 0e 00 39 00 34 00 2e 00 32 00 36 00 32 00 1...9.4.,2.6.2.
0120: 2e 00 30 00 5f 00 78 00 38 00 36 00 5f 00 5f 00 ...x..o.x.8.6....,
0130: 7a 00 70 00 64 00 6e 00 65 00 6b 00 64 00 72 00 z.p.d.n.e.k.d.r.
0140: 7a 00 72 00 65 00 61 00 30 00 5c 00 53 00 70 00 z.r.e.a.o..\S.p.
0150: 6f 00 74 00 69 00 66 00 79 00 4d 00 69 00 67 00 o.t.i.f.y.M.i.g.
0160: 72 00 61 00 74 00 6f 00 72 02 0e 00 65 00 78 00 r.a.t.o.r..e.x.
0170: 65 00 00 00 30 00 00 00
e...0...
```

From the preceding output, we can see another kind of reparse point, the AppExecutionAlias, used by Modern applications. More information is available in Chapter 8.

## Storage reserves and NTFS reservations
