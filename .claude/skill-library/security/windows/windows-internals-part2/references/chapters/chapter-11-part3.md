## The NT File System (NTFS)

In the following section, we analyze the internal architecture of the NTFS file system, starting by looking at the requirements that drove its design. We examine the on-disk data structures, and then we move on to the advanced features provided by the NTFS file system, like the Recovery support, tiered volumes, and the Encrypting File System (EFS).

### High-end file system requirements

From the start, NTFS was designed to include features required of an enterprise-class file system. To minimize data loss in the face of an unexpected system outage or crash, a file system must ensure that the integrity of its metadata is guaranteed at all times; and to protect sensitive data from unauthorized access, a file system must have an integrated security model. Finally, a file system must allow for software-based data redundancy as a low-cost alternative to hardware-redundant solutions for protecting user data. In this section, you find out how NTFS implements each of these capabilities.

628     CHAPTER 11   Caching and file systems


---

## Recoverability

To address the requirement for reliable data storage and data access, NTFS provides file system recovery based on the concept of an atomic transaction. Atomic transactions are a technique for handling modifications to a database so that system failures don't affect the correctness or integrity of the database. The basic tenet of atomic transactions is that some database operations, called transactions, are all-or-nothing propositions. (A transaction is defined as an I/O operation that alters file system data or changes the volume's directory structure.) The separate disk updates that make up the transaction must be executed atomically-that is, once the transaction begins to execute, all its disk updates must be completed. If a system failure interrupts the transaction, the part that has been completed must be undone, or rolled back. The rollback operation returns the database to a previously known and consistent state, as if the transaction had never occurred.

NTFS uses atomic transactions to implement its file system recovery feature. If a program initiates an I/O operation that alters the structure of an NTFS volume—that is, changes the directory structure, extends a file, allocates space for a new file, and so on—NTFS treats that operation as an atomic transaction. It guarantees that the transaction is either completed or, if the system fails while executing the transaction, rolled back. The details of how NTFS does this are explained in the section "NTFS recovery support" later in the chapter. In addition, NTFS uses redundant storage for vital file system information so that if a sector on the disk goes bad, NTFS can still access the volume's critical file system data.

## Security

Security in NTFS is derived directly from the Windows object model. Files and directories are protected from being accessed by unauthorized users. (For more information on Windows security, see Chapter 7, "Security, " in Part 1.) An open file is implemented as a file object with a security descriptor stored on disk in the hidden $Secure metadata, in a stream named $SDS (Security Descriptor Stream). Before a process can open a handle to any object, including a file object, the Windows security system verifies that the process has appropriate authorization to do so. The security descriptor, combined with the requirement that a user log on to the system and provide an identifying password, ensures that no process can access a file unless it is given specific permission to do so by a system administrator or by the file's owner. (For more information about security descriptors, see the section "Security descriptors and access control" in Chapter 7 in Part 1.).

## Data redundancy and fault tolerance

In addition to recoverability of file system data, some customers require that their data not be endangered by a power outage or catastrophic disk failure. The NTFS recovery capabilities ensure that the file system on a volume remains accessible, but they make no guarantees for complete recovery of user files. Protection for applications that can't risk losing file data is provided through data redundancy.

Data redundancy for user files is implemented via the Windows layered driver, which provides fault-tolerant disk support. NTFS communicates with a volume manager, which in turn communicates with a disk driver to write data to a disk. A volume manager can mirror, or duplicate, data from one disk onto another disk so that a redundant copy can always be retrieved. This support is commonly called

CHAPTER 11   Caching and file systems      629


---

RAID level 1. Volume managers also allow data to be written in stripes across three or more disks, using the equivalent of one disk to maintain parity information. If the data on one disk is lost or becomes inaccessible, the driver can reconstruct the disk's contents by means of exclusive-OR operations. This support is called RAID level 5.

In Windows 7, data redundancy for NTFS implemented via the Windows layered driver was provided by Dynamic Disks. Dynamic Disks had multiple limitations, which have been overcome in Windows 8.1 by introducing a new technology that virtualizes the storage hardware, called Storage Spaces. Storage Spaces is able to create virtual disks that already provide data redundancy and fault tolerance. The volume manager doesn't differentiate between a virtual disk and a real disk (so user mode components can't see any difference between the two). The NTFS file system driver cooperates with Storage Spaces for supporting tiered disks and RAID virtual configurations. Storage Spaces and Spaces Direct will be covered later in this chapter.

## Advanced features of NTFS

In addition to NTFS being recoverable, secure, reliable, and efficient for mission-critical systems, it includes the following advanced features that allow it to support a broad range of applications. Some of these features are exposed as APIs for applications to leverage, and others are internal features:

- ●  Multiple data streams

●  Unicode-based names

●  General indexing facility

●  Dynamic bad-cluster remapping

●  Hard links

●  Symbolic (soft) links and junctions

●  Compression and sparse files

●  Change logging

●  Per-user volume quotas

●  Link tracking

●  Encryption

●  POSIX support

●  Defragmentation

●  Read-only support and dynamic partitioning

●  Tiered volume support
The following sections provide an overview of these features.

---

## Multiple data streams

In NTFS, each unit of information associated with a file—including its name, its owner, its time stamps, its contents, and so on—is implemented as a file attribute (NTFS object attribute). Each attribute consists of a single stream—that is, a simple sequence of bytes. This generic implementation makes it easy to add more attributes (and therefore more streams) to a file. Because a file's data is 'just another attribute' of the file and because new attributes can be added, NTFS files (and file directories) can contain multiple data streams.

An NTFS file has one default data stream, which has no name. An application can create additional, named data streams and access them by referring to their names. T o avoid altering the Windows I/O APIs, which take a string as a file name argument, the name of the data stream is specified by appending a colon (:) to the file name. Because the colon is a reserved character, it can serve as a separator between the file name and the data stream name, as illustrated in this example:

```bash
myfile.dat:stream2
```

Each stream has a separate allocation size (which defines how much disk space has been reserved for it), actual size (which is how many bytes the caller has used), and valid data length (which is how much of the stream has been initialized). In addition, each stream is given a separate file lock that is used to lock byte ranges and to allow concurrent access.

One component in Windows that uses multiple data streams is the Attachment Execution Service, which is invoked whenever the standard Windows API for saving internet-based attachments is used by applications such as Edge or Outlook. Depending on which zone the file was downloaded from (such as the My Computer zone, the Intranet zone, or the Untrusted zone), Windows Explorer might warn the user that the file came from a possibly untrusted location or even completely block access to the file. For example, Figure 11-24 shows the dialog box that's displayed when executing Process Explorer after it was downloaded from the Sysinternals site. This type of data stream is called the $Zone.Identifier and is colloquially referred to as the "Mark of the Web. "

![Figure](figures/Winternals7thPt2_page_662_figure_006.png)

Note If you clear the check box for Always Ask Before Opening This File, the zone identifier data stream will be removed from the file.

![Figure](figures/Winternals7thPt2_page_662_figure_008.png)

FIGURE 11-24 Security warning for files downloaded from the internet.

CHAPTER 11   Caching and file systems      631


---

Other applications can use the multiple data stream feature as well. A backup utility, for example, might use an extra data stream to store backup-specific time stamps on files. Or an archival utility might implement hierarchical storage in which files that are older than a certain date or that haven't been accessed for a specified period of time are moved to offline storage. The utility could copy the file to offline storage, set the file's default data stream to 0, and add a data stream that specifies where the file is stored.

## EXPERIMENT: Looking at streams

Most Windows applications aren't designed to work with alternate named streams, but both the echo and more commands are. Thus, a simple way to view streams in action is to create a named stream using echo and then display it using more. The following command sequence creates a file named test with a stream named stream:

```bash
c:\Test\echo Hello from a named stream! > test\stream
c:\Test\more < test\stream
Hello from a named stream!
c:\Test
```

If you perform a directory listing, Test's file size doesn't reflect the data stored in the alternate stream because NTFS returns the size of only the unnamed data stream for file query operations, including directory listings.

```bash
c:\Test\dir test
    Volume in drive C is 0S.
    Volume Serial Number is F080-620F
    Directory of c:\Test
12/07/2018 05:33 PM                0 test
                1 File(s)        0 bytes
                0 Dir(s)   18,083,577,856 bytes free
c:\Test>
```

You can determine what files and directories on your system have alternate data streams

with the Streams utility from Sysinternals (see the following output) or by using the /r switch

in the dir command.

```bash
c:\Test\streams test
streams v1.60 - Reveal NTFS alternate streams.
Copyright (C) 2005-2016 Mark Russinovich
Sysinternals - www.sysinternals.com
c:\Test\test:
        :stream:$DATA 29
```

---

## Unicode-based names

Like Windows as a whole, NTFS supports 16-bit Unicode 1.0/UTF-16 characters to store names of files, directories, and volumes. Unicode allows each character in each of the world's major languages to be uniquely represented (Unicode can even represent emoji, or small drawings), which aids in moving data easily from one country to another. Unicode is an improvement over the traditional representation of international characters—using a double-byte coding scheme that stores some characters in 8 bits and others in 16 bits, a technique that requires loading various code pages to establish the available characters. Because Unicode has a unique representation for each character, it doesn't depend on which code page is loaded. Each directory and file name in a path can be as many as 255 characters long and can contain Unicode characters, embedded spaces, and multiple periods.

## General indexing facility

The NTFS architecture is structured to allow indexing of any file attribute on a disk volume using a B-tree structure. (Creating indexes on arbitrary attributes is not exported to users.) This structure enables the file system to efficiently locate files that match certain criteria—for example, all the files in a particular directory. In contrast, the FAT file system indexes file names but doesn’t sort them, making lookups in large directories slow.

Several NTFS features take advantage of general indexing, including consolidated security descriptors, in which the security descriptors of a volume's files and directories are stored in a single internal stream, have duplicates removed, and are indexed using an internal security identifier that NTFS defines. The use of indexing by these features is described in the section "NTFS on-disk structure" later in this chapter.

## Dynamic bad-cluster remapping

Ordinarily, if a program tries to read data from a bad disk sector, the read operation fails and the data in the allocated cluster becomes inaccessible. If the disk is formatted as a fault-tolerant NTFS volume, however, the Windows volume manager—or Storage Spaces, depending on the component that provides data redundancy—dynamically retrieves a good copy of the data that was stored on the bad sector and then sends NTFS a warning that the sector is bad. NTFS will then allocate a new cluster, replacing the cluster in which the bad sector resides, and copies the data to the new cluster. It adds the bad cluster to the list of bad clusters on that volume (stored in the hidden metadata file $BadClus) and no longer uses it. This data recovery and dynamic bad-cluster remapping is an especially useful feature for file servers and fault-tolerant systems or for any application that can't afford to lose data. If the volume manager or Storage Spaces is not used when a sector goes bad (such as early in the boot sequence), NTFS still replaces the cluster and doesn't reuse it, but it can't recover the data that was on the bad sector.

---

## Hard links

A hard link allows multiple paths to refer to the same file. (Hard links are not supported on directories.) If you create a hard link named C:\Documents\Spec.doc that refers to the existing file C:\Users \Administrator\Documents\Spec.doc, the two paths link to the same on-disk file, and you can make changes to the file using either path. Processes can create hard links with the Windows CreateHardLink function.

NTFS implements hard links by keeping a reference count on the actual data, where each time a hard link is created for the file, an additional file name reference is made to the data. This means that if you have multiple hard links for a file, you can delete the original file name that referenced the data (C:\Users\Administrator\Documents\Spec.doc in our example), and the other hard links (C:\Documents\Spec.doc) will remain and point to the data. However, because hard links are on-disk local references to data (represented by a file record number), they can exist only within the same volume and can't span volumes or computers.

EXPERIMENT: Creating a hard link

There are two ways you can create a hard link: the fsutil hardlink create command or the mklink utility with the /H option. In this experiment we'll use mklink because we'll use this utility later to create a symbolic link as well. First, create a file called test.txt and add some text to it, as shown here.

```bash
C:\>echo Hello from a Hard Link > test.txt
```

Now create a hard link called hard.txt as shown here:

```bash
C:\mklink hard.txt test.txt /H
  Hallink created for hard.txt <====> test.txt
```

If you list the directory's contents, you'll notice that the two files will be identical in every way, with the same creation date, permissions, and file size: only the file names differ.

```bash
c:\>dir *.txt
    Volume in drive C is 05
    Volume Serial Number is F080-620F
    Directory of c:\
12/07/2018 05:46 PM        26 hard.txt
12/07/2018 05:46 PM        26 test.txt
               2 File(s)      52 bytes
               0 Dir(s) 15,150,333,952 bytes free
```

## Symbolic (soft) links and junctions

In addition to hard links, NTFS supports another type of file-name aliasing called symbolic links or soft links. Unlike hard links, symbolic links are strings that are interpreted dynamically and can be relative or absolute paths that refer to locations on any storage device, including ones on a different local volume or even a share on a different system. This means that symbolic links don't actually increase the reference count of the original file, so deleting the original file will result in the loss of the data, and a symbolic link that points to a nonexisting file will be left behind. Finally, unlike hard links, symbolic links can point to directories, not just files, which gives them an added advantage.

634     CHAPTER 11   Caching and file systems


---

For example, if the path C:\Drivers is a directory symbolic link that redirects to %SystemRoot\\ System32\Drivers, an application reading C:\Drivers.\Ntsfs.sys actually reads %SystemRoot%\System. Drivers\Ntsfs.sys. Directory symbolic links are a useful way to lift directories that are deep in a directory tree to a more convenient depth without disturbing the original tree's structure or contents. The example just cited lifts the Drivers directory to the volume's root directory, reducing the directory depth of Ntsfs.sys from three levels to one when Ntsfs.sys is accessed through the directory symbolic link. File symbolic links work much the same way—you can think of them as shortcuts, except they're actually implemented on the file system instead of being .lnk files managed by Windows Explorer. Just like hard links, symbolic links can be created with the mklink utility (without the /H option) or through the CreateSymbolicLink API.

Because certain legacy applications might not behave securely in the presence of symbolic links, especially across different machines, the creation of symbolic links requires the SeCreateSymbolicLink privilege, which is typically granted only to administrators. Starting with Windows 10, and only if Developer Mode is enabled, callers of CreateSymbolicLink API can additionally specify the SYMBOLIC_ LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE flag to overcome this limitation (this allows a standard user is still able to create symbolic links from the command prompt window). The file system also has a behavior option called SymlinkEvaluation that can be configured with the following command:

```bash
fsutil behavior set SymLinkEvaluation
```

By default, the Windows default symbolic link evaluation policy allows only local-to-local and localto-remote symbolic links but not the opposite, as shown here:

```bash
D:\fusft behavior query\SymLinkEvaluation\
Local to local symbolic links are enabled
Local to remote symbolic links are enabled
No local symbolic links are enabled but links are disabled.
Remote to Remote symbolic links are disabled.
```

Symbolic links are implemented using an NTFS mechanism called reparse points. (Reparse points are discussed further in the section "Reparse points" later in this chapter.) A reparse point is a file or directory that has a block of data called reparse data associated with it. Reparse data is user-defined data about the file or directory, such as its state or location that can be read from the reparse point by the application that created the data. A file system filter driver, or the I/O manager. When NTFS encounters a reparse point during a file or directory lookup, it returns the STATUS_REPARSE status code, which signals file system filter drivers that are attached to the volume and the I/O manager to examine the reparse data. Each reparse point type has a unique reparse tag. The reparse tag allows the component responsible for interpreting the reparse point's reparse data to recognize the reparse point without having to check the reparse data. A reparse tag owner, either a file system filter driver or the I/O manager, can choose one of the following options when it recognizes reparse data:

- ■ The reparse tag owner can manipulate the path name specified in the file I/O operation
that crosses the reparse point and let the I/O operation reissue with the altered path name.


Junctions (described shortly) take this approach to redirect a directory lookup, for example,


■ The reparse tag owner can remove the reparse point from the file, after the file in some way,
and then reissue the file I/O operation.
CHAPTER 11   Caching and file systems      635


---

There are no Windows functions for creating reparse points. Instead, processes must use the FSCTLSET_REPARSE_POINT file system control code with the Windows DeviceIoControl function. A process

can query a reparse point's contents with the FSCTL_GET_REPARSE_POINT file system control code.

The FILE_ATTRIBUTE_REPARSE_POINT flag is set in a reparse point's file attributes, so applications can

check for reparse points by using the Windows GetLastErrorAttributes function.

Another type of reparse point that NTFS supports is the junction (also known as Volume Mount point). Junctions are a legacy NTFS concept and work almost identically to directory symbolic links, except they can only be local to a volume. There is no advantage to using a junction instead of a directory symbolic link, except that junctions are compatible with older versions of Windows, while directory symbolic links are not.

As seen in the previous section, modern versions of Windows now allow the creation of reparse points that can point to non-empty directories. The system behavior (which can be controlled from minifiers drivers) depends on the position of the reparse point in the target file's full path. The filter manager, NTFS, and ReFS file system drivers use the exposed FsRtlisNonEmptyDirectoryReparsePointAllowed API to detect if a reparse point type is allowed on non-empty directories.

## EXPERIMENT: Creating a symbolic link

This experiment shows you the main difference between a symbolic link and a hard link, even when dealing with files on the same volume. Create a symbolic link called soft.txt as shown here, pointing to the test.txt file created in the previous experiment:

```bash
C:\mcknight\soft.txt test.txt
symbolic link created for soft.txt <===> test.txt
```

If you list the directory's contents, you'll notice that the symbolic link doesn't have a file size and is identified by the <SYMLLINK> type.Furthermore, you'll note that the creation time is that of the symbolic link, not of the target file. The symbolic link can also have security permissions that are different from the permissions on the target file.

```bash
C:\dir *.txt
 Volume in drive C is 05
 Volume Serial Number is 38D4-EA71
 Directory of C\\
05/12/2012 11:55 PM        8 hard.txt
05/13/2012 12:28 AM   <SYMLINK>    soft.txt [test.txt]
05/12/2012 11:55 PM        8 test.txt
        3 File(s)            16 bytes
        0 Dir(s) 10,636,480,512 bytes free
```

Finally, if you delete the original test.txt file, you can verify that both the hard link and symbolic link still exist but that the symbolic link does not point to a valid file anymore, while the hard link references the file data.

636     CHAPTER 11   Caching and file systems


---

## Compression and sparse files

NTFS supports compression of file data. Because NTFS performs compression and decompression procedures transparently, applications don't have to be modified to take advantage of this feature. Directories can also be compressed, which means that any files subsequently created in the directory are compressed.

Applications compress and decompress files by passing DeVideoControl the FSCTL_SET COMPRESSION file system control code. They query the compression state of a file or directory

with the FSCTL_GET_COMPRESSION file system control code. A file or directory that is compressed

has the FILE_ATTRIBUTE_COMPRESSED flag set in its attributes, so applications can also determine a

file or directory's compression state with GetFileAttributes.

A second type of compression is known as sparse files. If a file is marked as sparse, NTFS doesn't allocate space on a volume for portions of the file that an application designates as empty. NTFS returns 0-filled buffers when an application reads from empty areas of a sparse file. This type of compression can be useful for client/server applications that implement circular-buffer logging, in which the server records information to a file, and clients asynchronously read the information. Because the information that the server writes isn't needed after a client has read it, there's no need to store the information in the file. By making such a file sparse, the client can specify the portions of the file it reads as empty, freeing up space on the volume. The server can continue to append new information to the file without fear that the file will grow to consume all available space on the volume.

As with compressed files, NTFS manages sparse files transparently. Applications specify a file's

sparseness state by passing the FSTCL_SET_SPARSE file system control code to DevicetoControl. To set

a range of a file to empty, applications use the FSCTL_SET_ZERO_DATA code, and they can ask NTFS

for a description of what parts of a file are sparse by using the control code FSTCL_QUERY_ALLOCATED

_RANGES. One application of sparse files is the NTFS change journal, described next.

## Change logging

Many types of applications need to monitor volumes for file and directory changes. For example, an automatic backup program might perform an initial full backup and then incremental backups based on file changes. An obvious way for an application to monitor a volume for changes is for it to scan the volume, recording the state of files and directories, and on a subsequent scan detect differences. This process can adversely affect system performance, however, especially on computers with thousands or tens of thousands of files.

An alternate approach is for an application to register a directory notification by using the FindFirst

ChangeNotification or ReadDirectoryChangesWWindows function. As an input parameter, the application

specifies the name of a directory it wants to monitor, and the function returns whenever the contents

of the directory change. Although this approach is more efficient than volume scanning, it requires

the application to be running at all times. Using these functions can also require an application to scan

directories because FindFirstChangeNotification doesn't indicate what changed—just that something

in the directory has changed. An application can pass a buffer to ReadDirectoryChangesW that the FSD

CHAPTER 11   Caching and file systems      637


---

fills in with change records. If the buffer overflows, however, the application must be prepared to fall back on scanning the directory.

NTFS provides a third approach that overcomes the drawbacks of the first two: an application can configure the NTFS change journal facility by using the DeviceloControl function's FSCTL_CREATE_ USN_JOURNAL file system control code (USN is update sequence number) to have NTFS record information about file and directory changes to an internal file called the change journal. A change journal is usually large enough to virtually guarantee that applications get a chance to process changes without missing any. Applications use the FSCTL_QUERY_USN_JOURNAL file system control code to read records from a change journal, and they can specify that the DeviceloControl function not complete until new records are available.

## Per-user volume quotas

Systems administrators often need to track or limit user disk space usage on shared storage volumes, so NTFS includes quota-management support. NTFS quota-management support allows for per-user specification of quota enforcement, which is useful for usage tracking and tracking when a user reaches warning and limit thresholds. NTFS can be configured to log an event indicating the occurrence to the System event log if a user surpasses his warning limit. Similarly, if a user attempts to use more volume storage then her quota limit permits. NTFS can log an event to the System event log and fail the application file I/O that would have caused the quota violation with a “disk full” error code.

NTFS tracks a user's volume usage by relying on the fact that it tags files and directories with the se curity ID (SID) of the user who created them. (See Chapter 7, "Security," in Part 1 for a definition of SIDs.)

The logical sizes of files and directories a user owns count against the user's administrator-defined

quota limit. Thus, a user can't circumvent his or her quota limit by creating an empty sparse file that is

larger than the quota would allow and then fill the file with nonzero data. Similarly, whereas a 50 KB file

might compress to 10 KB, the full 50 KB is used for quota accounting.

By default, volumes don't have quota tracking enabled. You need to use the Quota tab of a volume's Properties dialog box, shown in Figure 11-25, to enable quotas, to specify default warning and limit thresholds, and to configure the NTFS behavior that occurs when a user hits the warning or limit threshold. The Quota Entries tool, which you can launch from this dialog box, enables an administrator to specify different limits and behavior for each user. Applications that want to interact with NTFS quota management use COM quota interfaces, including IDiskQuotaControl, IDiskQuotaUser, and IDiskQuotaEvents.

---

![Figure](figures/Winternals7thPt2_page_670_figure_000.png)

FIGURE 11-25 The Quota Settings dialog accessible from the volume's Properties window.

## Link tracking

Shell shortcuts allow users to place files in their shell namespaces (on their desktops, for example) that link to files located in the file system namespace. The Windows Start menu uses shell shortcuts extensively. Similarly, object linking and embedding (OLE) links allow documents from one application to be transparently embedded in the documents of other applications. The products of the Microsoft Office suite, including PowerPoint, Excel, and Word, use OLE linking.

Although shell and OLE links provide an easy way to connect files with one another and with the shell namespace, they can be difficult to manage if a user moves the source of a shell or OLE link (a link source is the file or directory to which a link points). NTFS in Windows includes support for a service application called distributed link-tracking, which maintains the integrity of shell and OLE links when link targets move. Using the NTFS link-tracking support, if a link target located on an NTFS volume moves to any other NTFS volume within the originating volume's domain, the link-tracking service can transparently follow the movement and update the link to reflect the change.

NTFS link-tracking support is based on an optional file attribute known as an object ID. An application can assign an object ID to a file by using the FSCTL_CREATE_OR_GET_OBJECT_ID (which assigns an ID if one isn't already assigned) and FSCTL_SET_OBJECT_ID file system control codes. Object IDs are queried with the FSCTL_CREATE_OR_GET_OBJECT_ID and FSCTL_GET_OBJECT_ID file system control codes. The FSCTL_DELETE_OBJECT_ID file system control code lets applications delete object IDs from files.

CHAPTER 11   Caching and file systems     639


---

## Encryption

Corporate users often store sensitive information on their computers. Although data stored on company servers is usually safely protected with proper network security settings and physical access control, data stored on laptops can be exposed when a laptop is lost or stolen. NTFS file permissions don't offer protection because NTFS volumes can be fully accessed without regard to security by using NTFS file-reading software that doesn't require Windows to be running. Furthermore, NTFS file permissions are rendered useless when an alternate Windows installation is used to access files from an administrator account. Recall from Chapter 6 in Part 1 that the administrator account has the take-ownership and backup privileges, both of which allow it to access any secured object by overriding the object's security settings.

NTFS includes a facility called Encrypting File System (EFS), which users can use to encrypt sensitive data. The operation of EFS, as that of file compression, is completely transparent to applications, which means that file data is automatically decrypted when an application running in the account of a user authorized to view the data reads it and is automatically encrypted when an authorized application changes the data.

![Figure](figures/Winternals7thPt2_page_671_figure_003.png)

Note NTFS doesn't permit the encryption of files located in the system volume's root directory or in the Windows directory because many files in these locations are required during the boot process, and EFS isn't active during the boot process. BitLocker is a technology much better suited for environments in which this is a requirement because it supports fullvolume encryption. As we will describe in the next paragraphs, Bitlocker collaborates with NTFS for supporting file-encryption.

EFS relies on cryptographic services supplied by Windows in user mode, so it consists of both a kernel-mode component that tightly integrates with NTFS as well as user-mode DLLs that communicate with the Local Security Authority Subsystem (LSASS) and cryptographic DLLs.

Files that are encrypted can be accessed only by using the private key of an account's EFS private/ public key pair, and private keys are locked using an account's password. Thus, EFS-encrypted files on lost or stolen laptops can't be accessed using any means (other than a brute-force cryptographic attack) without the password of an account that is authorized to view the data.

Applications can use the EncryptFile and DecryptFile Windows API functions to encrypt and decrypt files, and FileEncryptionStatus to retrieve a file or directory's EFS-related attributes, such as whether the file or directory is encrypted. A file or directory that is encrypted has the FILE_ATTRIBUTE_ENCRYPTED flag set in its attributes, so applications can also determine a file or directory's encryption state with GetFileAttributes.

---

## POSIX-style delete semantics

The POSIX Subsystem has been deprecated and is no longer available in the Windows operating system. The Windows Subsystem for Linux (WSL) has replaced the original POSIX Subsystem. The NFT file system driver has been updated to unify the differences between I/O operations supported in Windows and those supported in Linux. One of these differences is provided by the Linux unlink (or rm) command, which deletes a file or a folder. In Windows, an application can't delete a file that is in use by another application (which has an open handle to it); conversely, Linux usually supports this: other processes continue to work well with the original deleted file. To support WSL, the NFTs file system driver in Windows 10 supports a new operation: POSIX Delete.

The Win32 DeleteFile API implements standard file deletion. The target file is opened (a new handle is created), and then a disposition label is attached to the file through the NtSetInformationFile native API. The label just communicates to the NTFS file system driver that the file is going to be deleted. The file system driver checks whether the number of references to the FCB (File Control Block) is equal to 1, meaning that there is no other outstanding open handle to the file. If so, the file system driver marks the file as "deleted on close" and then returns. Once when the handle to the file is closed does the IRPMI_CLEANUP dispatch routine physically remove the file from the underlying medium.

A similar architecture is not compatible with the Linux unlink command. The WSL subsystem, when it needs to erase a file, employs POSIX-style deletion; it calls the NtSetInformationFile native API with the new FileDispositionInformationEx information class, specifying a flag (FILEDisposition_POSIX_ SEMANCTS). The NTFS file system driver marks the file as POSIX deleted by inserting a flag in its Context Control Block (CCB, a data structure that represents the context of an open instance of an on-disk object). It then re-opens the file with a special internal routine and attaches the new handle (which we will call the PosixDeleted handle) to the SCB (stream control block). When the original handle is closed, the NTFS file system driver detects the presence of the PosixDeleted handle and queues a work item for closing it. When the work item completes, the Cleanup routine detects that the handle is marked as POSIX delete and physically moves the file in the "%$extend,$$delete$" hidden directory. Other applications can still operate on the original file, which is no longer in the original namespace and will be deleted only when the last file handle is closed (the first delete request has marked the FCS as delete-on-close).

If for any unusual reason the system is not able to delete the target file (due to a dangling reference in a defective kernel driver or due to a sudden power interruption), the next time that the NTFS file system has the chance to mount the volume, it checks the $\Extend\$Deleted directory and deletes every file included in it by using standard file deletion routines.

![Figure](figures/Winternals7thPt2_page_672_figure_005.png)

Note Starting with the May 2019 Update (19H), Windows 10 now uses POSIX delete as the default file deletion method. This means that the DeleteFile API uses the new behavior.

CHAPTER 11   Caching and file systems      641


---

## EXPERIMENT: Witnessing POSIX delete

In this experiment, you're going to witness a POSIX delete through the FsTool application, which is available in this book's downloadable resources. Make sure you're using a copy of Windows Server 2019 (RSS). Indeed, newer client releases of Windows implement POSIX deletions by default. Start by opening a command prompt window. Use the /touch FsTool command-line argument to generate a txt file that's exclusively used by the application:

```bash
D:\FsTool.exe /touch d:\Test.txt
NTFS / ReFS Tool v1.1
Copyright (C) 2018 Andrea Allievi (Aal186)
Touching "d:\Test.txt" file... Success.
    The File handle is valid... Press Enter to write to the file.
```

When requested, instead of pressing the Enter key, open another command prompt window

and try to open and delete the file:

```bash
D:\type Test.txt
The process cannot access the file because it is being used by another process.
D:\del Test.txt
D:\\dir Test.txt
 Volume in drive D is DATA
 Volume Serial Number is 62C1-9EB3
 Directory of D\{
12/13/2018  12:34 AM             49 Test.txt
               1 File(s)       49 bytes
               0 Dir(s)   1,486,254,481,408 bytes free
```

As expected, you can't open the file while FSTool has exclusive access to it. When you try to delete the file, the system marks it for deletion, but it's not able to remove it from the file system namespace. If you try to delete the file again with File Explorer, you can witness the same behavior. When you press Enter in the first command prompt window and you exit the FSTool application, the file is actually deleted by the NTFS file system driver.

The next step is to use a POSIX deletion for getting rid of the file. You can do this by specifying

the /pdel command-line argument to the FsTool application. In the first command prompt win dow, restart FsTool with the /touch command-line argument (the original file has been already

marked for deletion, and you can’t delete it again). Before pressing Enter, switch to the second

window and execute the following command:

```bash
D:\FsTool \pde\ Test.txt
NTFS / ReFS Tool v0.1
Copyright (C) 2018 Andrea Allievi (AaL86)
Deleting ".Test.txt" file (Posix semantics)... Success.
Press any key to exit...
```

---

```bash
D:\dir Test.txt
    Volume in drive D is DATA
    Volume Serial Number is 62C1-9EB3
    Directory of D:\\
File Not Found
```

In this case the Test.txt file has been completely removed from the file system's namespace but is still valid. If you press Enter in the first command prompt window, FsTool is still able to write data to the file. This is because the file has been internally moved into the $\$Extend\$Deleted hidden system directory.

## Defragmentation

Even though NTFS makes efforts to keep files contiguous when allocating blocks to extend a file, a volume’s files can still become fragmented over time, especially if the file is extended multiple times or when there is limited free space. A file is fragmented if its data occupies discontiguous clusters. For example, Figure 11-26 shows a fragmented file consisting of five fragments. However, like most file systems (including versions of FAT on Windows), NTFS makes no special efforts to keep files contiguous (this is handled by the built-in defragmenter), other than to reserve a region of disk space known as the master file table (MFT) zone for the MFT. (NTFS lets other files allocate from the MFT zone when volume free space runs low.) Keeping an area free for the MFT can help it stay contiguous, but it, too, can become fragmented. (See the section “Master file table” later in this chapter for more information on MFTs.)

![Figure](figures/Winternals7thPt2_page_674_figure_004.png)

FIGURE 11-26 Fragmented and contiguous files.

To facilitate the development of third-party disk fragmentation tools, Windows includes a defragmentation API that such tools can use to move file data so that files occupy contiguous clusters. The API consists of file system controls that let applications obtain a map of a volume's free and in-use clusters (FSCTL_GET_VOLUME_BITMAP), obtain a map of a file's cluster usage (FSCTL_GET_RETRIEVAL - POINTERS), and move a file (FSCTL_MOVE_FILE).

CHAPTER 11   Caching and file systems     643


---

Windows includes a built-in defragmentation tool that is accessible by using the Optimize Drives utility (%SystemRoot%\System32\Defrag.exe), shown in Figure 11-27, as well as a command-line interface, %SystemRoot%\System32\Defrag.exe, that you can run interactively or schedule, but that does not produce detailed reports or offer control—such as excluding files or directories—over the defragmentation process.

![Figure](figures/Winternals7thPt2_page_675_figure_001.png)

FIGURE 11-27 The Optimize Drives tool.

The only limitation imposed by the defragmentation implementation in NTFS is that paging

files and NTFS log files can't be defragmented. The Optimize Drives tool is the evolution of the Disk

Defragmenter, which was available in Windows 7. The tool has been updated to support tiered vol umes, SMR disks, and SSD disks. The optimization engine is implemented in the Optimize Drive service

(Defragsvc.dll), which exposes the IDefragEngine COM interface used by both the graphical tool and

the command-line interface.

For SSD disks, the tool also implements the retrim operation. To understand the retrim operation, a quick introduction of the architecture of a solid-state drive is needed. SSD disks store data in flash memory cells that are grouped into pages of 4 to 16 KB, grouped together into blocks of typically 128 to 512 pages. Flash memory cells can only be directly written to when they're empty. If they contain data, the contents must be erased before a write operation. An SSD write operation can be done on a single page but, due to hardware limitations, erase commands always affect entire blocks; consequently, writing data to empty pages on an SSD is very fast but slows down considerably once previously written pages need to be overwritten. (In this case, first the content of the entire block is stored in

---

cache, and then the entire block is erased from the SSD. The overwritten page is written to the cached block, and finally the entire updated block is written to the flash medium.) To overcome this problem, the NTFS File System Driver tries to send a TRIM command to the SSD controller every time it deletes the disk's clusters (which could partially or entirely belong to a file). In response to the TRIM command, the SSD, if possible, starts to asynchronously erase entire blocks. Noteworthy is that the SSD controller can't do anything in case the deleted area corresponds only to some pages of the block.

The retrim operation analyzes the SSD disk and starts to send a TRIM command to every cluster in the free space (in chunks of 1-MB size). There are different motivations behind this:

- ■ TRIM commands are not always emitted. (The file system is not very strict on trims.)
■ The NFTS File System emits TRIM commands on pages, but not on SSD blocks. The Disk
Optimizer, with the retrim operation, searches fragmented blocks. For those blocks, it first
moves valid data back to some temporary blocks, defragmenting the original ones and insert-
ing even pages that belongs to other fragmented blocks; finally, it emits TRIM commands on
the original cleaned blocks.
![Figure](figures/Winternals7thPt2_page_676_figure_003.png)

Note The way in which the Disk Optimizer emits TRIM commands on free space is somewhat tricky: Disk Optimizer allocates an empty sparse file and searches for a chunk (the size of which varies from 128 KB to 1 GB) of free space. It then calls the file system through the FSCTL_MOVE_FILE control code and moves data from the sparse file (which has a size of 1 GB but does not actually contain any valid data) into the empty space. The underlying file system actually erases the content of the one or more SSD blocks (sparse files with no valid data yield back chunks of zeroed data when read). This is the implementation of the TRIM command that the SSD firmware does.

For Tiered and SMR disks, the Optimize Drives tool supports two supplementary operations: Slabify (also known as Slab Consolidation) and Tier Optimization. Big files stored on tiered volumes can be composed of different Extents residing in different tiers. The Slab consolidation operation not only defragments the extent table (a phase called Consolidation) of a file, but it also moves the file content in congruent slabs (a slab is a unit of allocation of a thinly provisioned disk; see the "Storage Spaces" section later in this chapter for more information). The final goal of Slab Consolidation is to allow files to use a smaller number of slabs. Tier Optimization moves frequently accessed files (including files that have been explicitly pinned) from the capacity tier to the performance tier and, vice versa, moves less frequently accessed files from the performance tier to the capacity tier. To do so, the optimization engine consults the tiering engine, which provides file extents that should be moved to the capacity tier and those that should be moved to the performance tier, based on the Heat map for every file accessed by the user.

![Figure](figures/Winternals7thPt2_page_676_figure_006.png)

Note Tiered disks and the tiering engine are covered in detail in the following sections of the current chapter.

---

### EXPERIMENT: Retrim an SSD volume

You can execute a Retrim on a fast SSD or NVMe volume by using the defrag.exe /L command, as in the following example:

```bash
D:\defrag /L c:
Microsoft Drive Optimizer
Copyright (c) Microsoft Corp.
Invoking retrim on (C:)...
The operation completed successfully.
Post Defragmentation Report:
        Volume Information:
            Volume size            = 475.87 GB
            Free space           = 343.80 GB
        Retrim:
            Total space trimmed     = 341.05 GB
```

In the example, the volume size was 475.87 GB, with 343.80 GB of free space. Only 341 GB

have been erased and trimmed. Obviously, if you execute the command on volumes backed by

a classical HDD, you will get back an error. (The operation requested is not supported by the

hardware backing the volume.)

## Dynamic partitioning

The NTFS driver allows users to dynamically resize any partition, including the system partition, either shrinking or expanding it (if enough space is available). Expanding a partition is easy if enough space exists on the disk and the expansion is performed through the FSCTL.INPAND_VOLUME file system control code. Shrinking a partition is a more complicated process because it requires moving any file system data that is currently in the area to be thrown away to the region that will still remain after the shrinking process (a mechanism similar to defragmentation). Shrinking is implemented by two components: the shrinking engine and the file system driver.

The shrinking engine is implemented in user mode. It communicates with NTFS to determine the maximum number of reclaimable bytes—that is, how much data can be moved from the region that will be resized into the region that will remain. The shrinking engine uses the standard defragmentation mechanism shown earlier, which doesn’t support relocating page file fragments that are in use or any other files that have been marked as unmovable with the FSCTL_MARKER_HANDLE file system control code (like the hibernation file). The master file table backup ($MftMirr), the NTFS metadata transaction log ($LogFile), and the volume label file ($Volume) cannot be moved, which limits the minimum size of the shrunk volume and causes wasted space.

---

The file system driver shrinking code is responsible for ensuring that the volume remains in a consistent state throughout the shrinking process. To do so, it exposes an interface that uses three requests that describe the current operation, which are sent through the FSCTL_SHRINK_VOLUME control code:

- ■ The ShrinkPrepare request, which must be issued before any other operation. This request
takes the desired size of the new volume in sectors and is used so that the file system can block
further allocations outside the new volume boundary. The ShrinkPrepare request doesn't verify
whether the volume can actually be shrunk by the specified amount, but it does ensure that the
amount is numerically valid and that there aren't any other shrinking operations ongoing. Note
that after a prepare operation, the file handle to the volume becomes associated with the shrink
request. If the file handle is closed, the operation is assumed to be aborted.
■ The ShrinkCommit request, which the shrinking engine issues after a ShrinkPrepare request. In
this state, the file system attempts the removal of the requested number of clusters in the most
recent prepare request. (If multiple prepare requests have been sent with different sizes, the last
one is the determining one.) The ShrinkCommit request assumes that the shrinking engine has
completed and will fail if any allocated blocks remain in the area to be shrunk.
■ The ShrinkAbort request, which can be issued by the shrinking engine or caused by events such
as the closure of the file handle to the volume. This request undoes the ShrinkCommit operation
by returning the partition to its original size and allows new allocations outside the shrunk region
to occur again. However, defragmentation changes made by the shrinking engine remain.
If a system is rebooted during a shrinking operation, NTFS restores the file system to a consistent

state via its metadata recovery mechanism, explained later in the chapter. Because the actual shrink

operation isn't executed until all other operations have been completed, the volume retains its original

size and only defragmentation operations that had already been flushed out to disk persist.

Finally, shrinking a volume has several effects on the volume shadow copy mechanism. Recall that the copy-on-write mechanism allows VSS to simply retain parts of the file that were actually modified while still linking to the original file data. For deleted files, this file data will not be associated with visible files but appears as free space instead—free space that will likely be located in the area that is about to be shrunk. The shrinking engine therefore communicates with VSS to engage it in the shrinking process. In summary, the VSS mechanism's job is to copy deleted file data into its differencing area and to increase the differencing area as required to accommodate additional data. This detail is important because it poses another constraint on the size to which even volumes with ample free space can shrink.

## NTFS support for tiered volumes

Tiered volumes are composed of different types of storage devices and underlying media. Tiered volumes are usually created on the top of a single physical or virtual disk. Storage Spaces provides virtual disks that are composed of multiple physical disks, which can be of different types (and have different performance): fast NVMe disks, SSD, and Rotating Hard-Disk. A virtual disk of this type is called a tiered disk. (Storage Spaces uses the name Storage Tiers.) On the other hand, tiered volumes could be created on the top of physical SMR disks, which have a conventional "random-access" fast zone and a "strictly sequential" capacity area. All tiered volumes have the common characteristic that they are composed

CHAPTER 11   Caching and file systems      647


---

by a "performance" tier, which supports fast random I/O, and a "capacity" tier, which may or may not support random I/O, is slower, and has a large capacity.

![Figure](figures/Winternals7thPt2_page_679_figure_001.png)

Note SMR disks, tiered volumes, and Storage Spaces will be discussed in more detail later in this chapter.

The NTFS File System driver supports tiered volumes in multiple ways:

- ■ The volume is split in two zones, which correspond to the tiered disk areas (capacity and
performance).
■ The new $DSC attribute (of type $LOGGED_UTILITY_STREAM) specifies which tier the file
should be stored in. NTFS exposes a new "pinning" interface, which allows a file to be locked in a
particular tier (from here derives the term "pinning") and prevents the file from being moved by
the tiering engine.
■ The Storage Tiers Management service has a central role in supporting tiered volumes. The
NTFS file system driver records ETW "heat" events every time a file stream is read or written.
The tiering engine consumes these events, accumulates them (in 1-MB chunks), and periodically
records them in a JET database (once every hour). Every four hours, the tiering engine processes
the Heat database and through a complex "heat aging" algorithm decides which file is consid-
ered recent (hot) and which is considered old (cold). The tiering engine moves the files between
the performance and the capacity tiers based on the calculated Heat data.
Furthermore, the NTFS allocator has been modified to allocate file clusters based on the tier area

that has been specified in the $DSC attribute. The NTFS Allocator uses a specific algorithm to decide

from which tier to allocate the volume's clusters. The algorithm operates by performing checks in the

following order:

- 1. If the file is the Volume USN Journal, always allocate from the Capacity tier.

2. MFT entries (File Records) and system metadata files are always allocated from the

Performance tier.

3. If the file has been previously explicitly "pinned" (meaning that the file has the $DSC attribute),

allocate from the specified storage tier.

4. If the system runs a client edition of Windows, always prefer the Performance tier; otherwise,

allocate from the Capacity tier.

5. If there is no space in the Performance tier, allocate from the Capacity tier.
An application can specify the desired storage tier for a file by using the NTSetInformationFile API

with the FileDesiredStorageClassInformation information class. This operation is called file pinning, and,

if executed on a handle of a new created file, the central allocator will allocate the new file content in

the specified tier. Otherwise, if the file already exists and is located on the wrong tier, the tiering engine

will move the file to the desired tier the next time it runs. (This operation is called Tier optimization and

can be initiated by the Tiering Engine scheduled task or the SchedulerDefrag task.)

648     CHAPTER 11   Caching and file systems


---

![Figure](figures/Winternals7thPt2_page_680_figure_000.png)

Note It's important to note here that the support for tiered volumes in NTFS, described here, is completely different from the support provided by the ReFS file system driver.

## EXPERIMENT: Witnessing file pinning in tiered volumes

As we have described in the previous section, the NTFS allocator uses a specific algorithm to

decide which tier to allocate from. In this experiment, you copy a big file into a tiered volume

and understand what the implications of the File Pinning operation are. After the copy finishes,

open an administrative PowerShell window by right-clicking on the Start menu icon and select ing Windows PowerShell (Admin) and use the Get-FileStorageTier command to get the tier

information for the file:

```bash
PS E:\ Get-FileStorageTier -FilePath 'E:\Big_Image.iso' | FL FileSize,
DesiredStorageTierClass, SizeOnPerformanceTierClass, SizeOnCapacityTierClass,
PlacementStatus, State
FileSize                : 4556566528
DesiredStorageTierClass        : Unknown
FileSizeOnPerformanceTierClass : 0
FileSizeOnCapacityTierClass    : 4556566528
PlacementStatus            : Unknown
State                : Unknown
```

The example shows that the Big_Image.iso file has been allocated from the Capacity Tier. (The example has been executed on a Windows Server system.) To confirm this, just copy the file from the tiered disk to a fast SSD volume. You should see a slow transfer speed (usually between 160 and 250 MB/s depending on the rotating disk speed):

![Figure](figures/Winternals7thPt2_page_680_figure_006.png)

CHAPTER 11   Caching and file systems     649


---

You can now execute the "pin" request through the Set-FileStorageTier command, like in the following example:

```bash
PS E:\> Get-StorageTier -MediaType SSD | FL FriendlyName, Size, FootprintOnPool, UniqueId
FriendlyName    :  SSD
Size             :  128849018880
FootprintOnPool :  128849018880
UniqueId         :  {448a6ab-f00b-42d6-b345-c8da68869020}
PS E:\> Set-FileStorageTier -FilePath 'E:\Big_Image.iso' -DesiredStorageTierFriendlyName
  'SSP'
PS E:\> Get-FileStorageTier -FilePath 'E:\Big_Image.iso' | FL FileSize,
DesiredStorageTierClass, FileSizeOnPerformanceTierClass, FileSizeOnCapacityTierClass,
PlacementStatus, State
FileSize                 :  4556566528
DesiredStorageTierClass   :  Performance
FileSizeOnPerformanceTierClass :  0
FileSizeOnCapacityTierClass  :  4556566528
PlacementStatus        :  Not on tier
State                 :  Pending
```

The example above shows that the file has been correctly pinned on the Performance tier, but its content is still stored in the Capacity tier. When the Tiering Engine scheduled task runs, it moves the file extents from the Capacity to the Performance tier. You can force a Tier Optimization by running the Drive optimizer through the defeq.exe/g build-in tool:

```bash
PS E:> defrag /g /h e:
Microsoft Drive Optimizer
Copyright (c) Microsoft Corp.
Invoking tier optimization on Test (E:)...
Pre-Optimization Report:
     Volume Information:
            Volume size            = 2.22 TB
            Free space            = 1.64 TB
            Total fragmented space   = 36%
            Largest free space size   = 1.56 TB
     Note: File fragments larger than 64MB are not included in the fragmentation statistics.
The operation completed successfully.
Post Defragmentation Report:
     Volume Information:
            Volume size            = 2.22 TB
            Free space            = 1.64 TB
     Storage Tier Optimization Report:
```

---

```bash
% I/Os Serviced from Perf Tier  Perf Tier Size Required
        100%</td><td>28.51 GB</td></tr><tr><td rowspan="6">...</td><td>95%</td><td>22.86 GB</td></tr><tr><td>20%</td><td>2.44 GB</td></tr><tr><td>15%</td><td>1.58 GB</td></tr><tr><td>10%</td><td>873.80 MB</td></tr><tr><td>5%</td><td>361.28 MB</td></tr><tr><td>* Current size of the Performance tier: 474.98 GB</td><td>Percent of total I/Os serviced from the Performance tier: 99%</td></tr><tr><td colspan="2">Size of files pinned to the Performance tier: 4.21 GB</td></tr><tr><td colspan="2">Percent of total I/Os: 1%</td></tr><tr><td colspan="2">Size of files pinned to the Capacity tier: 0 bytes</td></tr><tr><td colspan="2">Percent of total I/Os: 0%</td></tr></table>
```

The Drive Optimizer has confirmed the "pinning" of the file. You can check again the "pinning" status by executing the Get-FileStorageT ier command and by copying the file again to an SSD volume. This time the transfer rate should be much higher, because the file content is entirely located in the Performance tier.

```bash
PS E:\_Get-FileStorageTier -FilePath 'E:\Big_Image.iso' | FL FileSize, DesiredStorageTierClass,
FileSizeOnPerformanceTierClass, FileSizeOnCapacityTierClass, PlacementStatus, State
FileSize
:      4556566528
DesiredStorageTierClass
:      Performance
FileSizeOnPerformanceTierClass : 0
FileSizeOnCapacityTierClass
:      4556566528
PlacementStatus
:      Completely on tier
State
:      OK
```

![Figure](figures/Winternals7thPt2_page_682_figure_003.png)

You could repeat the experiment in a client edition of Windows 10, by pinning the file in the Capacity tier (client editions of Windows 10 allocate file's clusters from the Performance tier by default). The same "pinning" functionality has been implemented into the FsTool application available in this book's downloadable resources, which can be used to copy a file directly into a preferred tier.

CHAPTER 11   Caching and file systems      651


---

