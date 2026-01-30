## CHAPTER 10  Management, diagnostics, and tracing

This chapter describes fundamental mechanisms in the Microsoft Windows operating system that are critical to its management and configuration. In particular, we describe the Windows registry, services, the Unified Background process manager, and Windows Management Instrumentation (WMI). The chapter also presents some fundamental components used for diagnosis and tracing purposes like Event Tracing for Windows (ETW), Windows Notification Facility (WNF), and Windows Error Reporting (WER). A discussion on the Windows Global flags and a brief introduction on the kernel and User Shim Engine conclude the chapter.

### The registry

The registry plays a key role in the configuration and control of Windows systems. It is the repository for both systemwide and per-user settings. Although most people think of the registry as static data stored on the hard disk, as you'll see in this section, the registry is also a window into various inmemory structures maintained by the Windows executive and kernel.

We're starting by providing you with an overview of the registry structure, a discussion of the data types it supports, and a brief tour of the key information Windows maintains in the registry. Then we look inside the internals of the configuration manager, the executive component responsible for implementing the registry database. Among the topics we cover are the internal on-disk structure of the registry, how Windows retrieves configuration information when an application requests it, and what measures are employed to protect this critical system database.

### Viewing and changing the registry

In general, you should never have to edit the registry directly. Application and system settings stored in the registry that require changes should have a corresponding user interface to control their modification. However, as we mention several times in this book, some advanced and debug settings have no editing user interface. Therefore, both graphical user interface (GUI) and command-line tools are included with Windows to enable you to view and modify the registry.

Windows comes with one main GUI tool for editing the registry—Regedit.exe—and several command-line registry tools. Reg.exe, for instance, has the ability to import, export, back up, and

---

restore keys, as well as to compare, modify, and delete keys and values. It can also set or query flags used in UAC virtualization. Regini.exe, on the other hand, allows you to import registry data based on text files that contain ASCII or Unicode configuration data.

The Windows Driver Kit (WDK) also supplies a redistributable component, Offreg5.dll, which hosts

the Offline Registry Library. This library allows loading registry hive files (covered in the "Hives" section

later in the chapter) in their binary format and applying operations on the files themselves, bypassing

the usual logical loading and mapping that Windows requires for registry operations. Its use is primari ly to assist in offline registry access, such as for purposes of integrity checking and validation. It can also

provide performance benefits if the underlying data is not meant to be visible by the system because

the access is done through local file I/O instead of registry system calls.

## Registry usage

There are four principal times at which configuration data is read:

- During the initial boot process, the boot loader reads configuration data and the list of boot de-
vice drivers to load into memory before initializing the kernel. Because the Boot Configuration
Database (BCD) is really stored in a registry hive, one could argue that registry access happens
even earlier, when the Boot Manager displays the list of operating systems.

During the kernel boot process, the kernel reads settings that specify which device drivers to
load and how various system elements—such as the memory manager and process manager—
configure themselves and tune system behavior.

During logon, Explorer and other Windows components read per-user preferences from the
registry, including network drive-letter mappings, desktop wallpaper, screen saver, menu be-
havior, icon placement, and, perhaps most importantly, which startup programs to launch and
which files were most recently accessed.

During their startup, applications read systemwide settings, such as a list of optionally installed
components and licensing data, as well as per-user settings that might include menu and tool-
bar placement and a list of most-recently accessed documents.
However, the registry can be read at other times as well, such as in response to a modification of a registry value or key. Although the registry provides asynchronous callbacks that are the preferred way to receive change notifications, some applications constantly monitor their configuration settings in the registry through polling and automatically take updated settings into account. In general, however, on an idle system there should be no registry activity and such applications violate best practices. (Process Monitor, from Sysinternals, is a great tool for tracking down such activity and the applications at fault.)

The registry is commonly modified in the following cases:

- ■ Although not a modification, the registry's initial structure and many default settings are
defined by a prototype version of the registry that ships on the Windows setup media that is
copied onto a new installation.
---

- ■ Application setup utilities create default application settings and settings that reflect installa-
tion configuration choices.
■ During the installation of a device driver, the Plug and Play system creates settings in the reg-
istry that tell the I/O manager how to start the driver and creates other settings that configure
the driver's operation. (See Chapter 6,
"I/O system," in Part 1 for more information on how
device drivers are installed.)
■ When you change application or system settings through user interfaces, the changes are often
stored in the registry.
## Registry data types

The registry is a database whose structure is similar to that of a disk volume. The registry contains keys, which are similar to a disk's directories, and values, which are comparable to files on a disk. A key is a container that can consist of other keys (subkeys) or values. Values, on the other hand, store data. Toplevel keys are root keys. Throughout this section, we'll use the words subkey and key interchangeably.

Both keys and values borrow their naming convention from the file system. Thus, you can uniquely identify a value with the name mark, which is stored in a key called trade, with the name trademark. One exception to this naming scheme is each key's unnamed value. Regedit displays the unnamed value as (Default).

Values store different kinds of data and can be one of the 12 types listed in Table 10-1. The majority of registry values are REG_DWORD, REG_BINARY, or REG_SZ. Values of type REG_DWORD can store numbers or Booleans (true/false values); REG_BINARY values can store numbers larger than 32 bits or raw data such as encrypted passwords; REG_SZ values store strings (Unicode, of course) that can represent elements such as names, file names, paths, and types.

TABLE 10-1 Registry value types

<table><tr><td>Value Type</td><td>Description</td></tr><tr><td>REG_NONE</td><td>No value type</td></tr><tr><td>REG_SZ</td><td>Fixed-length Unicode string</td></tr><tr><td>REG_EXPAND_SZ</td><td>Variable-length Unicode string that can have embedded environment variables</td></tr><tr><td>REG_BINARY</td><td>Arbitrary-length binary data</td></tr><tr><td>REG_DWORD</td><td>32-bit number</td></tr><tr><td>REG_DWORD_BIG_ENDIAN</td><td>32-bit number, with high byte first</td></tr><tr><td>REG_LINK</td><td>Unicode symbolic link</td></tr><tr><td>REG_MULTI_SZ</td><td>Array of Unicode NULL-terminated strings</td></tr><tr><td>REG_RESOURCE_LIST</td><td>Hardware resource description</td></tr><tr><td>REG_FULL_RESOURCE_DESCRIPTOR</td><td>Hardware resource description</td></tr><tr><td>REG_RESOURCE_REQUIREMENTS_LIST</td><td>Resource requirements</td></tr><tr><td>REG_QWORD</td><td>64-bit number</td></tr></table>


CHAPTER 10    Management, diagnostics, and tracing     393


---

The REG_LINK type is particularly interesting because it lets a key transparently point to another

key. When you traverse the registry through a link, the path searching continues at the target of the

link. For example, if \Root\Link has a REG_LINK value of \Root2\RegKey and RegKey contains the value

RegValue, two paths identify RegValue:\Root1\Link\RegValue and \Root2\RegKey\RegValue. As ex plained in the next section, Windows prominently uses registry links: three of the six registry root keys

are just links to subkeys within the three nonlink root keys.

## Registry logical structure

You can chart the organization of the registry via the data stored within it. There are nine root keys (and you can't add new root keys or delete existing ones) that store information, as shown in Table 10-2.

TABLE 10-2 The nine root keys

<table><tr><td>Root Key</td><td>Description</td></tr><tr><td>HKEY_CURRENT_USER</td><td>Stores data associated with the currently logged-on user</td></tr><tr><td>HKEY_CURRENT_USER_LOCAL_SETTINGS</td><td>Stores data associated with the currently logged-on user that are local to the machine and are excluded from a roaming user profile</td></tr><tr><td>HKEY_USERS</td><td>Stores information about all the accounts on the machine</td></tr><tr><td>HKEY_CLASSES_ROOT</td><td>Stores file association and Component Object Model (COM) object registration information</td></tr><tr><td>HKEY_LOCAL_MACHINE</td><td>Stores system-related information</td></tr><tr><td>HKEY_PERFORMANCE_DATA</td><td>Stores performance information</td></tr><tr><td>HKEY_PERFORMANCE_NLSTEXT</td><td>Stores text strings that describe performance counters in the local language of the area in which the computer system is running</td></tr><tr><td>HKEY_PERFORMANCE_TEXT</td><td>Stores text strings that describe performance counters in US English.</td></tr><tr><td>HKEY_CURRENT_CONFIG</td><td>Stores some information about the current hardware profile (deprecated)</td></tr></table>


Why do root-key names begin with an H? Because the root-key names represent Windows handles

(H) to keys (KEY). As mentioned in Chapter 1, "Concepts and tools" of Part 1, HKLM is an abbreviation

used for HKEY_LOCAL_MACHINE. Table 10-3 lists all the root keys and their abbreviations. The follow ing sections explain in detail the contents and purpose of each of these root keys.

TABLE 10-3 Registry root keys

<table><tr><td>Root Key</td><td>Abbreviation</td><td>Description</td><td>Link</td></tr><tr><td>HKEY_CURRENT_USER</td><td>HKCU</td><td>Points to the user profile of the currently logged-on user</td><td>Subkey under HKEY_USERS corresponding to currently logged-on user</td></tr><tr><td>HKEY_CURRENT_USER_LOCAL_SETTINGS</td><td>HKCULS</td><td>Points to the local settings of the currently logged-on user</td><td>Link to HKCU\Software\Classes\Local Settings</td></tr><tr><td>HKEY_USERS</td><td>HKU</td><td>Contains subkeys for all loaded user profiles</td><td>Not a link</td></tr></table>


---

<table><tr><td>Root Key</td><td>Abbreviation</td><td>Description</td><td>Link</td></tr><tr><td>HKEY_CLASSES_ROOT</td><td>HKCR</td><td>Contains file association and COM registration information</td><td>Not a direct link, but rather a merged view of HKLM\SOFTWARE\Classes and HKEY_USERS\<ID>\SOFTWARE\Classes</td></tr><tr><td>HKEY_LOCAL_MACHINE</td><td>HKLM</td><td>Global settings for the machine</td><td>Not a link</td></tr><tr><td>HKEY_CURRENT_CONFIG</td><td>HKCC</td><td>Current hardware profile</td><td>HKLM\SYSTEM\SOFTWARE\CurrentControlSet\Hardware Profiles\Current</td></tr><tr><td>HKEY_PERFORMANCE_DATA</td><td>HKPD</td><td>Performance counters</td><td>Not a link</td></tr><tr><td>HKEY_PERFORMANCE_NLSTEXT</td><td>HKPT</td><td>Performance counters text strings</td><td>Not a link</td></tr><tr><td>HKEY_PERFORMANCE_TEXT</td><td>HKPT</td><td>Performance counters text strings in US English</td><td>Not a link</td></tr></table>

HKEY_CURRENT_USER

The HKCU root key contains data regarding the preferences and software configuration of the locally logged-on user. It points to the currently logged-on user's user profile, located on the hard disk at \Users\<username>\Ntuser.dat. (See the section "Registry internals" later in this chapter to find out how root keys are mapped to files on the hard disk.) Whenever a user profile is loaded (such as at logon time or when a service process runs under the context of a specific username), HKCU is created to map to the user's key under HKEY_USERS (so if multiple users are logged on in the system, each user would see a different HKCU). Table 10-4 lists some of the subkeys under HKCU.

TABLE 10-4 | HKEY_CURRENT_USER subkeys

<table><tr><td>Subkey</td><td>Description</td></tr><tr><td>AppEvents</td><td>Sound/event associations</td></tr><tr><td>Console</td><td>Command window settings (for example, width, height, and colors)</td></tr><tr><td>Control Panel</td><td>Screen saver, desktop scheme, keyboard, and mouse settings, as well as accessibility and regional settings</td></tr><tr><td>Environment</td><td>Environment variable definitions</td></tr><tr><td>EUDC</td><td>Information on end-user defined characters</td></tr><tr><td>Keyboard Layout</td><td>Keyboard layout setting (for example, United States or United Kingdom)</td></tr><tr><td>Network</td><td>Network drive mappings and settings</td></tr><tr><td>Printers</td><td>Printer connection settings</td></tr><tr><td>Software</td><td>User-specific software preferences</td></tr><tr><td>Volatile Environment</td><td>Volatile environment variable definitions</td></tr></table>

CHAPTER 10 | Management, diagnostics, and tracing      395


---

## HKEY_USERS

HKU contains a subkey for each loaded user profile and user class registration database on the system. It also contains a subkey named HKU/DEFAULT that is linked to the profile for the system (which is used by processes running under the local system account and is described in more detail in the section "Services" later in this chapter). This is the profile used by Winlogon, for example, so that changes to the desktop background settings in that profile will be implemented on the logon screen. When a user logs on to a system for the first time and her account does not depend on a roaming domain profile (that is, the user's profile obtained from a central network location at the direction of a domain controller), the system creates a profile for her account based on the profile stored in %SystemDrive%\Users\@Default.

The location under which the system stores profiles is defined by the registry value HKLM\Software\Microsoft\Windows NT\CurrentVersion\ProfileList\ProfilesDirectory, which is by default set to %SystemDrive%\Users. The ProfileList key also stores the list of profiles present on a system. Information for each profile resides under a subkey that has a name reflecting the security identifier (SID) of the account to which the profile corresponds. (See Chapter 7, "Security," of Part 1 for more information on SIDs.) Data stored in a profile's key includes the time of the last load of the profile in the LocalProfileLoadTimeLow value, the binary representation of the account SID in the Sid value, and the path to the profile's on-disk hive (Ntuser.dat file, described later in this chapter in the "Hives" section) in the directory given by the ProfileImagePath value. Windows shows profiles stored on a system in the User Profiles management dialog box, shown in Figure 10-1, which you access by clicking Configure Advanced User Profile Properties in the User Accounts Control Panel applet.

![Figure](figures/Winternals7thPt2_page_427_figure_003.png)

FIGURE 10-1 The User Profiles management dialog box.

---

## EXPERIMENT: Watching profile loading and unloading

You can see a profile load into the registry and then unload by using the Runas command to launch a process in an account that's not currently logged on to the machine. While the new process is running, run Regedit and note the loaded profile key under HKEY_USERS. After terminating the process, perform a refresh in Regedit by pressing the F5 key, and the profile should no longer be present.

![Figure](figures/Winternals7thPt2_page_428_figure_002.png)

## HKEY_CLASSES_ROOT

HKCR consists of three types of information: file extension associations, COM class registrations, and the virtualized registry root for User Account Control (UAC). (See Chapter 7 of Part 1 for more information on UAC.) A key exists for every registered file name extension. Most keys contain a REG_SZ value that points to another key in HKCR containing the association information for the class of files that extension represents.

For example, HKCR.xls would point to information on Microsoft Office Excel files. For example, the default value contains "Excel Sheet.8" that is used to instantiate the Excel COM object. Other keys contain configuration details for all COM objects registered on the system. The UAC virtualized registry is located in the VirtualStore key, which is not related to the other kinds of data stored in HKCR.

The data under HKEY_CLASSES_ROOT comes from two sources:

- ■ The per-user class registration data in HKCU\SOFTWARE\Classes (mapped to the file on hard
disk \Users\<username>\AppData\Local\Microsoft\Windows\Usrclass.dat)

■ Systemwide class registration data in HKLM\SOFTWARE\Classes
CHAPTER 10    Management, diagnostics, and tracing     397


---

There is a separation of per-user registration data from systemwide registration data so that roaming profiles can contain customizations. Nonprivileged users and applications can read systemwide data and can add new keys and values to systemwide data (which are mirrored in their per-user data), but they can only modify existing keys and values in their private data. It also closes a security hole: a nonprivileged user cannot change or delete keys in the systemwide version HKEY_CLASSES_ROOT; thus, it cannot affect the operation of applications on the system.

## HKEY_LOCAL_MACHINE

HKLM is the root key that contains all the systemwide configuration subkeys: BCD00000000, COMPONENTS

(loaded dynamically as needed), HARDWARE, SAM, SECURITY, SOFTWARE, AND SYSTEM.

The HKLM\BCD00000000 subkey contains the Boot Configuration Database (BCD) information

loaded as a registry hive. This database replaces the Boot.ini file that was used before Windows Vista

and adds greater flexibility and isolation of per-installation boot configuration data. The BCD00000000

subkey is backed by the hidden BCD file, which, on UEFI systems, is located in \EFI\Microsoft\Boot. (For

more information on the BCD, see Chapter 12, “Startup and shutdown”).

Each entry in the BCD, such as a Windows installation or the command-line settings for the installation, is stored in the Objects subkey, either as an object referenced by a GUID (in the case of a boot entry) or as a numeric subkey called an element. Most of these raw elements are documented in the BCD reference in Microsoft Docs and define various command-line settings or boot parameters. The value associated with each element subkey corresponds to the value for its respective command-line flag or boot parameter.

The BCDEdit command-line utility allows you to modify the BCD using symbolic names for the elements and objects. It also provides extensive help for all the boot options available. A registry hive can be opened remotely as well as imported from a hive file: you can modify or read the BCD of a remote computer by using the Registry Editor. The following experiment shows you how to enable kernel debugging by using the Registry Editor.

EXPERIMENT: Remote BCD editing

Although you can modify offline BCD stores by using the bcdedit /store command, in this experiment you will enable debugging through editing the BCD store inside the registry. For the purposes of this example, you edit the local copy of the BCD, but the point of this technique is that it can be used on any machine's BCD hive. Follow these steps to add the /DEBUG commandline flag:

- 1. Open the Registry Editor and then navigate to the HKLM\BCD00000000 key. Expand
every subkey so that the numerical identifiers of each Elements key are fully visible.
---

- 2. Identify the boot entry for your Windows installation by locating the Description with
a Type value of 0x10200003, and then select the 12000004 key in the Elements tree. In
the Element value of that subkey, you should find the name of your version of Windows,
such as Windows 10. In recent systems, you may have more than one Windows installa-
tion or various boot applications, like the Windows Recovery Environment or Windows
Resume Application. In those cases, you may need to check the 22000002 Elements
subkey, which contains the path, such as Windows.

3. Now that you've found the correct GUID for your Windows installation, create a new
subkey under the Elements subkey for that GUID and name it 0x260000a0. If this subkey
already exists, simply navigate to it. The found GUID should correspond to the identifi-
er value under the Windows Boot Loader section shown by the bcdedit /v command
(you can use the /store command-line option to inspect an offline store file).

4. If you had to create the subkey, now create a binary value called Element inside it.

5. Edit the value and set it to 1. This will enable kernel-mode debugging. Here's what these
changes should look like:
![Figure](figures/Winternals7thPt2_page_430_figure_001.png)

![Figure](figures/Winternals7thPt2_page_430_figure_002.png)

Note The 0x12000004 ID corresponds to BcdLibraryString_ApplicationPath, whereas the 0x22000002 ID corresponds to BcdOSLoaderString_SystemRoot. Finally, the ID you added, 0x2600000a0, corresponds to BcdOSLoaderBoolean_KeyDebuggerEnabled. These values are documented in the BCD reference in Microsoft Docs.

CHAPTER 10    Management, diagnostics, and tracing     399


---

The HKLM/COMPONENTS subkey contains information pertinent to the Component Based

Servicing (CBS) stack. This stack contains various files and resources that are part of a Windows installa tion image (used by the Automated Installation Kit or the OEM Preinstallation Kit) or an active instal lation. The CBS APIs that exist for servicing purposes use the information located in this key to identify

installed components and their configuration information. This information is used whenever compo nents are installed, updated, or removed either individually (called units) or in groups (called packages).

To optimize system resources, because this key can get quite large, it is only dynamically loaded and

unloaded as needed if the CBS stack is servicing a request. This key is backed by the COMPONENTS

hive file located in \Windows\system32\config.

The HKLM/HARDWARE subkey maintains descriptions of the system's legacy hardware and some

hardware device-to-driver mappings. On a modern system, only a few peripherals—such as keyboard,

mouse, and ACPI BIOS data—are likely to be found here. The Device Manager tool lets you view regis try hardware information that it obtains by simply reading values out of the HARDWARE key (although

it primarily uses the HKLM/SYSTEM\CurrentControlSetEnum tree).

HKLM:SAM holds local account and group information, such as user passwords, group definitions, and domain associations. Windows Server systems operating as domain controllers store domain accounts and groups in Active Directory, a database that stores domainwide settings and information. (Active Directory isn't described in this book.) By default, the security descriptor on the SAM key is configured so that even the administrator account doesn't have access.

HKLM:SECURITY stores systemwide security policies and user-rights assignments. HKLM:SAM is

linked into the SECURITY subkey under HKLM:SECURITY:SAM. By default, you can't view the contents

of HKLM:SECURITY or HKLM:SAM because the security settings of those keys allow access only by the

System account. (System accounts are discussed in greater detail later in this chapter.) You can change

the security descriptor to allow read access to administrators, or you can use PSevc to run Regedit in the

local system account if you want to peer inside. However, that glimpse won't be very revealing because

the data is undocumented and the passwords are encrypted with one-way mapping—that is, you can't

determine a password from its encrypted form. The SAM and SECURITY subkeys are backed by the SAM

and SECURITY hive files located in the Windows\system32\config path of the boot partition.

HLM'SOFTWARE is where Windows stores systemwide configuration information not needed to boot the system. Also, third-party applications store their systemwide settings here, such as paths to application files and directories and licensing and expiration date information.

HKLMSYSTEM contains the systemwide configuration information needed to boot the system, such as which device drivers to load and which services to start. The key is backed by the SYSTEM hive file located in \Windows\system32\config. The Windows Loader uses registry services provided by the Boot Library for being able to read and navigate through the SYSTEM hive.

## HKEY_CURRENT_CONFIG

HKEY_CURRENT_CONFIG is just a link to the current hardware profile, stored under HKLM\SYSTEM\

CurrentControlSet\Hardware Profiles\Current. Hardware profiles are no longer supported in Windows,

but the key still exists to support legacy applications that might depend on its presence.

---

## HKEY_PERFORMANCE_DATA and HKEY_PERFORMANCE_TEXT

The registry is the mechanism used to access performance counter values on Windows, whether those

are from operating system components or server applications. One of the side benefits of providing

access to the performance counters via the registry is that remote performance monitoring works "for

free" because the registry is easily accessible remotely through the normal registry APIs.

You can access the registry performance counter information directly by opening a special key

named HKEY_PERFORMANCE_DATA and querying values beneath it. You won't find this key by look ing in the Registry Editor; this key is available only programmatically through the Windows registry

functions, such as RegQueryValueEx. Performance information isn't actually stored in the registry; the

registry functions redirect access under this key to live performance information obtained from perfor mance data providers.

The HKEY_PERFORMANCE_TEXT is another special key used to obtain performance counter information (usually name and description). You can obtain the name of any performance counter by querying data from the special Counter registry value. The Help special registry value yields all the counters description instead. The information returned by the special key are in US English. The HKEY_ PERFORMANCE_NLSTEXT retrieves performance counters names and descriptions in the language in which the OS runs.

You can also access performance counter information by using the Performance Data Helper (PDH) functions available through the Performance Data Helper API (Pdh.dll). Figure 10-2 shows the components involved in accessing performance counter information.

![Figure](figures/Winternals7thPt2_page_432_figure_005.png)

FIGURE 10-2 Registry performance counter architecture.

As shown in Figure 10-2, this registry key is abstracted by the Performance Library (Perfilib), which is statically linked in Advapi32.dll. The Windows kernel has no knowledge about the HKEY_PERFORMANCE_DATA registry key, which explains why it is not shown in the Registry Editor.

CHAPTER 10 Management, diagnostics, and tracing 401


---

## Application hives

Applications are normally able to read and write data from the global registry. When an application opens a registry key, the Windows kernel performs an access check verification against the access token of its process (or thread in case the thread is impersonating: see Chapter 7 in Part 1 for more details) and the ACL that a particular key contains. An application is also able to load and save registry hires by using the RegSaveKeyEx and RegLoadKeyX APIs. In those scenarios, the application operates on data that other processes running at a higher or same privilege level can interfere with. Furthermore, for loading and saving hires, the application needs to enable the Backup and Restore privileges. The two privileges are granted only to processes that run with an administrative account.

Clearly this was a limitation for most applications that want to access a private repository for storing their own settings. Windows 7 has introduced the concept of application hives. An application hive is a standard hive file (which is linked to the proper log files) that can be mounted visible only to the application that requested it. A developer can create a base hive file by using the RegSaveKeyEx API (which exports the content of a regular registry key in an hive file). The application can then mount the hive privately using the RegLoadAppKey function (specifying the REG_PROCESS_APPKEY flag prevents other applications from accessing the same hive). Internally, the function performs the following operations:

- 1. Creates a random GUID and assigns it to a private namespace, in the form of \Registry\

A\<Random Guid>. (\Registry forms the NT kernel registry namespace, described in the

"The registry namespace and operation" section later in this chapter.)

2. Converts the DOS path of the specified hive file name in NT format and calls the NtLoadKeyEx

native API with the proper set of parameters.
The NtLoadKeyEx function calls the regular registry callbacks. However, when it detects that the hive is an application hive, it uses CmLoadAppKey to load it (and its associated log files) in the private namespace, which is not enumerable by any other application and is tied to the lifetime of the calling process. (The hive and log files are still mapped in the "registry process," though. The registry process will be described in the "Startup and registry process" section later in this chapter.) The application can use standard registry APIs to read and write its own private settings, which will be stored in the application hive. The hive will be automatically unloaded when the application exits or when the last handle to the key is closed.

Application hives are used by different Windows components, like the Application Compatibility

telemetry agent (CompatTelRunner.exe) and the Modern Application Model. Universal Windows

Platform (UWP) applications use application hives for storing information of WinRT classes that can be

instantiated and are private for the application. The hive is stored in a file called ActivationStore.dat

and is consumed primarily by the Activation Manager when an application is launched (or more pre cisely, is "activated"). The Background Infrastructure component of the Modern Application Model uses

the data stored in the hive for storing background tasks information. In that way, when a background

task timer elapses, it knows exactly in which application library the task's code resides (and the activa tion type and threading model).

Furthermore, the modern application stack provides to UWP developers the concept of Application Data containers, which can be used for storing settings that can be local to the device in which the

---

application runs (in this case, the data container is called local) or can be automatically shared between all the user's devices that the application is installed on. Both kinds of containers are implemented in the Windows.Storage.ApplicationData.dll WinRT library, which uses an application hive, local to the application (the backing file is called settings.dat), to store the settings created by the UWP application.

Both the settings.dat and the ActivationStore.dat hive files are created by the Modern Application Model’s Deployment process (at app-installation time), which is covered extensively in Chapter 8, “System mechanisms,” (with a general discussion of packaged applications), The Application Data containers are documented at https://docs.microsoft.com/en-us/windows/uwp/get-started/ settings-learning-track.

## Transactional Registry (TxR)

Thanks to the Kernel Transaction Manager (KTM; for more information see the section about the KTM in Chapter 8), developers have access to a straightforward API that allows them to implement robust error-recovery capabilities when performing registry operations, which can be linked with nonregistry operations, such as file or database operations.

Three APIs support transactional modification of the registry: RegCreateKeyTransacted, RegOpenKeyTransacted, and RegDeleteKeyTransacted. These new routines take the same parameters as their nontransacted analogs except that a new transaction handle parameter is added. A developer supplies this handle after calling the KTM function CreateTransaction.

After a transacted create or open operation, all subsequent registry operations—such as creat ing, deleting, or modifying values inside the key—will also be transacted. However, operations on

the subkeys of a transacted key will not be automatically transacted, which is why the third API,

RegDeleteKeyTransacted exists. It allows the transacted deletion of subkeys, which RegDeleteKeyEx

would not normally do.

Data for these transacted operations is written to log files using the common logging file system (CLS) services, similar to other KTM operations. Until the transaction is committed or rolled back (both of which might happen programmatically or as a result of a power failure or system crash, depending on the state of the transaction), the keys, values, and other registry modifications performed with the transaction handle will not be visible to external applications through the nontransacted APIs. Also, transactions are isolated from each other; modifications made inside one transaction will not be visible from inside other transactions or outside the transaction until the transaction is committed.

![Figure](figures/Winternals7thPt2_page_434_figure_007.png)

Note A nontransactional writer will abort a transaction in case of conflict—for example, if a value was created inside a transaction and later, while the transaction is still active, a nontransactional writer tries to create a value under the same key. The nontransactional operation will succeed, and all operations in the conflicting transaction will be aborted.

The isolation level (the "I" in ACID) implemented by TxR resource managers is read-commit, which means that changes become available to other readers (transacted or not) immediately after being committed. This mechanism is important for people who are familiar with transactions in databases,

CHAPTER 10 Management, diagnostics, and tracing 403


---

where the isolation level is predictable-reads (or cursor-stability, as it is called in database literature). With a predictable-reads isolation level, after you read a value inside a transaction, subsequent reads returns the same data. Read-commit does not make this guarantee. One of the consequences is that registry transactions can't be used for "atomic" increment/decrement operations on a registry value.

To make permanent changes to the registry, the application that has been using the transaction

handle must call the KTM function CommitTransaction. (If the application decides to undo the changes,

such as during a failure path, it can call the RollbackTransaction API.) The changes are then visible

through the regular registry APIs as well.

![Figure](figures/Winternals7thPt2_page_435_figure_002.png)

Note If a transaction handle created with CreateTransaction is closed before the transaction is committed (and there are no other handles open to that transaction), the system rolls back that transaction.

Apart from using the CLFS support provided by the KTM, TRk also stores its own internal log files in the %SystemRoot%\System32\Config\Trx folder on the system volume; these files have a .regtrans-ms extension and are hidden by default. There is a global registry resource manager (RM) that services all the hives mounted at boot time. For every hive that is mounted explicitly, an RM is created. For applications that use registry transactions, the creation of an RM is transparent because KTM ensures that all RMs taking part in the same transaction are coordinated in the two-phase commit/abort protocol. For the global registry RM, the CLFS log files are stored, as mentioned earlier, inside System32\Config\Trx. For other hives, they are stored alongside the hive (in the same directory). They are hidden and follow the same naming convention, ending in .regtrans-ms. The log file names are prefixed with the name of the hive to which they correspond.

## Monitoring registry activity

Because the system and applications depend so heavily on configuration settings to guide their behavior, system and application failures can result from changing registry data or security. When the system or an application fails to read settings that it assumes it will always be able to access, it might not function properly, display error messages that hide the root cause, or even crash. It's virtually impossible to know what registry keys or values are misconfigured without understanding how the system or the application that's failing is accessing the registry. In such situations, the Process Monitor utility from Windows Sysinternals (https://docs.microsoft.com/en-us/sysinternals/) might provide the answer.

Process Monitor lets you monitor registry activity as it occurs. For each registry access, Process Monitor shows you the process that performed the access; the time, type, and result of the access; and the stack of the thread at the moment of the access. This information is useful for seeing how applications and the system rely on the registry, discovering where applications and the system store configuration settings, and troubleshooting problems related to applications having missing registry keys or values. Process Monitor includes advanced filtering and highlighting so that you can zoom in on an activity related to specific keys or values or to the activity of particular processes.

---

## Process Monitor internals

Process Monitor relies on a device driver that it extracts from its executable image at runtime before starting it. Its first execution requires that the account running it has the Load Driver privilege as well as the Debug privilege; subsequent executions in the same boot session require only the Debug privilege. Because, once loaded, the driver remains resident.

## EXPERIMENT: Viewing registry activity on an idle system

Because the registry implements the RegNotifyChangeKey function that applications can use to request notification of registry changes without polling for them, when you launch Process Monitor on a system that's idle you should not see repetitive accesses to the same registry keys or values. Any such activity identifies a poorly written application that unnecessarily negatively affects a system's overall performance.

Run Process Monitor, make sure that only the Show Registry Activity icon is enabled in the toolbar (with the goal to remove noise generated by the File system, network, and processes or threads) and, after several seconds, examine the output log to see whether you can spot polling behavior. Right-click an output line associated with polling and then choose Process Properties from the context menu to view details about the process performing the activity.

## EXPERIMENT: Using Process Monitor to locate application registry settings

In some troubleshooting scenarios, you might need to determine where in the registry the system or an application stores particular settings. This experiment has you use Process Monitor to discover the location of Notepad's settings. Notepad, like most Windows applications, saves user preferences—such as word-wrap mode, font and font size, and window position—across executions. By having Process Monitor watching when Notepad reads or writes its settings, you can identify the registry key in which the settings are stored. Here are the steps for doing this:

- 1. Have Notepad save a setting you can easily search for in a Process Monitor trace.
You can do this by running Notepad, setting the font to Times New Roman, and then
exiting Notepad.

2. Run Process Monitor. Open the filter dialog box and the Process Name filter, and type
notepad.exe as the string to match. Confirm by clicking the Add button. This step
specifies that Process Monitor will log only activity by the notepad.exe process.

3. Run Notepad again, and after it has launched, stop Process Monitor's event capture by
toggling Capture Events on the Process Monitor File menu.

4. Scroll to the top line of the resultant log and select it.
---

5. Press Ctrl+F to open a Find dialog box, and search for times new. Process Monitor

should highlight a line like the one shown in the following screen that represents

Notepad reading the font value from the registry. Other operations in the immediate

vicinity should relate to other Notepad settings.

![Figure](figures/Winternals7thPt2_page_437_figure_001.png)

6. Right-click the highlighted line and click Jump To. Process Monitor starts Regedit (if it's not already running) and causes it to navigate to and select the Notepad-referenced registry value.

## Registry internals

This section describes how the configuration manager—the executive subsystem that implements the registry—organizes the registry's on-disk files. We'll examine how the configuration manager manages the registry as applications and other operating system components read and change registry keys and values. We'll also discuss the mechanisms by which the configuration manager tries to ensure that the registry is always in a recoverable state, even if the system crashes while the registry is being modified.

### Hives

On disk, the registry isn't simply one large file but rather a set of discrete files called hives. Each hive contains a registry tree, which has a key that serves as the root or starting point of the tree. Subkeys and their values reside beneath the root. You might think that the root keys displayed by the Registry Editor correlate to the root keys in the hives, but such is not the case. Table 10-5 lists registry hives and their on-disk file names. The path names of all hives except for user profiles are coded into the configuration manager. As the configuration manager loads hives, including system profiles, it notes each hive's path in the values under the HKLM\SYSTEM\CurrentControlSet\Control\HiveList subkey, moving the path if the hive is unloaded. It creates the root keys, linking these hives together to build the registry structure you're familiar with and that the Registry Editor displays.

---

TABLE 10-5 On-disk files corresponding to paths in the registry

<table><tr><td>Hive Registry Path</td><td>Hive File Path</td></tr><tr><td>HKEY_LOCAL_MACHINE\BCD00000000</td><td>\EFI\Microsoft\Boot</td></tr><tr><td>HKEY_LOCAL_MACHINE\COMPONENTS</td><td>%SystemRoot%\System32\Config\Components</td></tr><tr><td>HKEY_LOCAL_MACHINE\SYSTEM</td><td>%SystemRoot%\System32\Config\System</td></tr><tr><td>HKEY_LOCAL_MACHINE\SAM</td><td>%SystemRoot%\System32\Config\Sam</td></tr><tr><td>HKEY_LOCAL_MACHINE\SECURITY</td><td>%SystemRoot%\System32\Config\Security</td></tr><tr><td>HKEY_LOCAL_MACHINE\SOFTWARE</td><td>%SystemRoot%\System32\Config\Software</td></tr><tr><td>HKEY_LOCAL_MACHINE\HARDWARE</td><td>Volatile hive</td></tr><tr><td>HKEY_LOCAL_MACHINE\WindowsAppLockerCache</td><td>%SystemRoot%\System32\AppDataLocker\AppDataCache.dat</td></tr><tr><td>HKEY_LOCAL_MACHINE\ELAM</td><td>%SystemRoot%\System32\Config\Elam</td></tr><tr><td>HKEY_USERS\<SID of local service account&gt;</td><td>%SystemRoot%\ServiceProfiles\LocalService\NtUser.dat</td></tr><tr><td>HKEY_USERS\<SID of network service account&gt;</td><td>%SystemRoot%\ServiceProfiles\NetworkService\NtUser.dat</td></tr><tr><td>HKEY_USERS\<SID of username&gt;</td><td>\Users\username\ntUser.dat</td></tr><tr><td>HKEY_USERS\<SID of username\Classes</td><td>\Users\username\AppData\Local\Microsoft\Windows\Usrclass.dat</td></tr><tr><td>HKEY_USERS\DEFAULT</td><td>%SystemRoot%\System32\Config\Default</td></tr><tr><td>Virtualized HKEY_LOCAL_MACHINE\SOFTWARE</td><td>Different paths. Usually \ProgramData\Packages\PackageFullName\&lt;UserIDid&gt;\SystemAppData\Helium\Cache\RandomName\.dat for Centennial</td></tr><tr><td>Virtualized HKEY_CURRENT_USER</td><td>Different paths. Usually \ProgramData\Packages\PackageFullName\&lt;UserIDid&gt;\SystemAppData\Helium\User.dat for Centennial</td></tr><tr><td>Virtualized HKEY_LOCAL_MACHINE\SOFTWARE\Classes</td><td>Different paths. Usually \ProgramData\Packages\PackageFullName\&lt;UserIDid&gt;\SystemAppData\Helium\UserClass\dat for Centennial</td></tr></table>


You'll notice that some of the hives listed in Table 10-5 are volatile and don't have associated files. The system creates and manages these hives entirely in memory; the hives are therefore temporary. The system creates volatile hives every time it boots. An example of a volatile hive is the HKLM\ HARDWARE hive, which stores information about physical devices and the devices' assigned resources. Resource assignment and hardware detection occur every time the system boots, so not storing this data on disk is logical. You will also notice that the last three entries in the table represent virtualized hives. Starting from Windows 10 Anniversary Update, the NT kernel supports the Virtualized Registry (VReg), with the goal to provide support for Centennial packaged applications, which runs in a Helium container. Every time the user runs a centennial application (like the modern Skype, for example), the system mounts the needed package hives. Centennial applications and the Modern Application Model have been extensively discussed in Chapter 8.

CHAPTER 10      Management, diagnostics, and tracing      407


---

## EXPERIMENT: Manually loading and unloading hives

Regetid has the ability to load hives that you can access through its File menu. This capability can be useful in troubleshooting scenarios where you want to view or edit a hive from an unbootable system or a backup medium. In this experiment, you'll use Regedit to load a version of the HKLMSYSTEM hive that Windows Setup creates during the install process.

- 1. Hives can be loaded only underneath HKLM or HKU, so open Regedit, select HKLM,
and choose Load Hive from the Regedit File menu.

2. Navigate to the %SystemRoot%\System32\Config\RegBack directory in the Load Hive
dialog box, select System, and open it. Some newer systems may not have any file in
the RegBack folder. In that case, you can try the same experiment by opening the ELAM
hive located in the Config folder. When prompted, type Test as the name of the key
under which it will load.

3. Open the newly created HKLM\Test key and explore the contents of the hive.

4. Open HKLM\SYSTEM\CurrentControlSet\Control\HiveList and locate the entry
\Registry\Machine\Test, which demonstrates how the configuration manager lists
loaded hives in the HiveList key.

5. Select HKLM\Test and then choose Unload Hive from the Regedit File menu to unload
the hive.
### Hive size limits

In some cases, hive sizes are limited. For example, Windows places a limit on the size of the HKLMSYSTEM hive. It does so because Winload reads the entire HKLM_SYSTEM hive into physical memory near the start of the boot process when virtual memory paging is not enabled. Winload also loads Ntoskrnl and boot device drivers into physical memory, so it must constrain the amount of physical memory assigned to HKLM_SYSTEM. (See Chapter 12 for more information on the role Winload plays during the startup process.) On 32-bit systems, Winload allows the hive to be as large as 400 MB or half the amount of physical memory on the system, whichever is lower. On x64 systems, the lower bound is 2 GB.

### Startup and the registry process

Before Windows 8.1, the NT kernel was using paged pool for storing the content of every loaded hive file. Most of the hives loaded in the system remained in memory until the system shutdown (a good example is the SOFTWARE hive, which is loaded by the Session Manager after phase 1 of the System startup is completed and sometimes could be multiple hundreds of megabytes in size). Paged pool memory could be paged out by the balance set manager of the memory manager, if it is not accessed for a certain amount of time (see Chapter 5, "Memory management, " in Part 1 for more details). This implies that unused parts of a hive do not remain in the working set for a long time. Committed virtual

---

memory is backed by the page file and requires the system Commit charge to be increased, reducing

the total amount of virtual memory available for other purposes.

To overcome this problem, Windows 10 April 2018 Update (R54) introduced support for the section backed registry. At phase 1 of the NT kernel initialization, the Configuration manager startup routine

initializes multiple components of the Registry: cache, worker threads, transactions, callbacks support,

and so on. It then creates the Key object type, and, before loading the needed hives, it creates the

Registry process. The Registry process is a fully-protected (same protection as the SYSTEM process:

WinSystem level), minimal process, which the configuration manager uses for performing most of the

I/Os on opened registry hives. At initialization time, the configuration manager maps the preloaded

hives in the Registry process. The preloaded hives (SYSTEM and ELAM) continue to reside in nonpaged

memory, though (which is mapped using kernel addresses). Later in the boot process, the Session

Manager loads the Software hive by invoking the NtInitializeRegistry system call.

A section object backed by the "SOFTWARE" hive file is created: the configuration manager divides

the file in 2-MB chunks and creates a reserved mapping in the Registry process's user-mode address

space for each of them (using the NtMapViewOfSection native API. Reserved mappings are tracked by

valid VADs, but no actual pages are allocated. See Chapter 5 in Part 1 for further details). Each 2-MB

view is read-only protected. When the configuration manager wants to read some data from the hive,

it accesses the view's pages and produces an access fault, which causes the shared pages to be brought

into memory by the memory manager. At that time, the system working set charge is increased, but

not the commit charge (the pages are backed by the hive file itself, and not by the page file).

At initialization time, the configuration manager sets the hard-working set limit to the Registry process at 64 MB. This means that in high memory pressure scenarios, it is guaranteed that no more than 64 MB of working set is consumed by the registry. Every time an application or the system uses the APIs to access the registry, the configuration manager attaches to the Registry process address space, performs the needed work, and returns the results. The configuration manager doesn't always need to switch address spaces: when the application wants to access a registry key that is already in the cache (a Key control block already exists), the configuration manager skips the process attach and returns the cached data. The registry process is primarily used for doing I/O on the low-level hive file.

When the system writes or modifies registry keys and values stored in a hive, it performs a copyon-write operation (by first changing the memory protection of the 2 MB view to PAGE_WRITECOPY). Writing to memory marked as copy-on-write creates new private pages and increases the system commit charge. When a registry update is requested, the system immediately writes new entries in the hive's log, but the writing of the actual pages belonging to the primary hive file is deferred. Dirty hive's pages, as for every normal memory page, can be paged out to disk. Those pages are written to the primary hive file when the hive is being unloaded or by the Reconciler; one of the configuration manager's lazy writer threads that runs by default once every hour (the time period is configurable by setting the HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Configuration Manager\ RegistryLazyReconcileInterval registry value).

The Reconciler and the Incremental logging are discussed in the “Incremental logging” section later in this chapter.

CHAPTER 10    Management, diagnostics, and tracing     409


---

## Registry symbolic links

A special type of key known as a registry symbolic link makes it possible for the configuration manager to link keys to organize the registry. A symbolic link is a key that redirects the configuration manager to another key. Thus, the key HKLM\SAM is a symbolic link to the key at the root of the SAM hive. Symbolic links are created by specifying the REG_CREATE_LINK parameter to RegCreateKey or RegCreateKeyEx. Internally, the configuration manager will create a REG_LINK value called SymbolicLinkValue, which contains the path to the target key. Because this value is a REG_LINK instead of a REG_SZ, it will not be visible with Regedit—it is, however, part of the on-disk registry hive.

## EXPERIMENT: Looking at hive handles

The configuration manager opens hives by using the kernel handle table (described in Chapter 8) so that it can access hives from any process context. Using the kernel handle table is an efficient alternative to approaches that involve using drivers or executive components to access from the System process only handles that must be protected from user processes. You can start Process Explorer as Administrator to see the hive handles, which will be displayed as being opened in the System process. Select the System process, and then select Handles from the Lower Pane View menu entry on the View menu. Sort by handle type, and scroll until you see the hive files, as shown in the following screen.

![Figure](figures/Winternals7thPt2_page_441_figure_004.png)

---

## Hive structure

The configuration manager logically divides a hive into allocation units called blocks in much the same way that a file system divides a disk into clusters. By definition, the registry block size is 4096 bytes (4 KB). When new data expands a hive, the hive always expands in block-granular increments. The first block of a hive is the base block.

The base block includes global information about the hive, including a signature—regf—that identifies the file as a hive, two updated sequence numbers, a time stamp that shows the last time a write operation was initiated on the hive, information on registry repair or recovery performed by Winload, the hive format version number, a checksum, and the hive file's internal file name (for example,

\Device\Harddisk\Volume1\WINDOWS\SYSTEM32\CONFIG\SAM). We'll clarify the significance of the two updated sequence numbers and time stamp when we describe how data is written to a hive file.

The hive format version number specifies the data format within the hive. The configuration manager uses hive format version 1.5, which supports large values (values larger than 1 MB are supported) and improved searching (instead of caching the first four characters of a name, a hash of the entire name is used to reduce collisions). Furthermore, the configuration manager supports differencing hives introduced for container support. Differencing hives uses hive format 1.6.

Windows organizes the registry data that a hive stores in containers called cells. A cell can hold a key, a value, a security descriptor, a list of subkeys, or a list of key values. A four-byte character tag at the beginning of a cell's data describes the data's type as a signature. Table 10-6 describes each cell data type in detail. A cell's header is a field that specifies the cell's size as the 1's complement (not present in the CM Structures). When a cell joins a hive and the hive must expand to contain the cell, the system creates an allocation unit called a bin.

A bin is the size of the new cell rounded up to the next block or page boundary, whichever is higher.

The system considers any space between the end of the cell and the end of the bin to be free space

that it can allocate to other cells. Bins also have headers that contain a signature, hbin, and a field that

records the offset into the hive file of the bin and the bin's size.

TABLE 10-6 Cell data types

<table><tr><td>Data Type</td><td>Structure Type</td><td>Description</td></tr><tr><td>Key cell</td><td>CM_KEY_NODE</td><td>A cell that contains a registry key, also called a key node. A key cell contains a signature (kn for a key, kl for a link node), the time stamp of the most recent update to the key, the cell index of the key&#x27;s parent key cell, the cell index of the subkey-list cell that identifies the key&#x27;s subkeys, a cell index for the key&#x27;s security descriptor cell, a cell index for a string key that contains the key&#x27;s key value, and a cell index for a key&#x27;s key value. The key is a example CurrentControlSet. It also saves cached information such as the number of subkeys under the key, as well as the size of the largest key, value name, value data, and class name of the subkeys under this key.</td></tr><tr><td>Value cell</td><td>CM_KEY_VALUE</td><td>A cell that contains information about a key&#x27;s value. This cell includes a signature (kv), the value&#x27;s type (for example, REG_DWORD or REG_BINARY), and the value&#x27;s name (for example, Boot-Execute). A value cell also contains the cell index of the cell that contains the value&#x27;s data.</td></tr></table>


CHAPTER 10   Management, diagnostics, and tracing     411


---

<table><tr><td>Data Type</td><td>Structure Type</td><td>Description</td></tr><tr><td>Big Value cell</td><td>CM_BIG_DATA</td><td>A cell that represents a registry value bigger than 16 kB. For this kind of cell type, the cell content is an array of cell indexes each pointing to a 16-kB cell, which contains a chunk of the registry value.</td></tr><tr><td>Subkey-list cell</td><td>CM_KEY_INDEX</td><td>A cell composed of a list of cell indexes for key cells that are all subkeys of a common parent key.</td></tr><tr><td>Value-list cell</td><td>CM_KEY_INDEX</td><td>A cell composed of a list of cell indexes for value cells that are all values of a common parent key.</td></tr><tr><td>Security-descriptor cell</td><td>CM_KEY_SECURITY</td><td>A cell that contains a security descriptor. Security-descriptor cells include a signature (ks) at the head of the cell and a reference count that record the number of key nodes that share the security descriptor. Multiple key cells can share security-descriptor cells.</td></tr></table>


By using bins instead of cells, to track active parts of the registry, Windows minimizes some management chores. For example, the system usually allocates and deallocates bins less frequently than it does cells, which lets the configuration manager manage memory more efficiently. When the configuration manager reads a registry hive into memory, it reads the whole hive, including empty bins, but it can choose to discard them later. When the system adds and deletes cells in a hive, the hive can contain empty bins interspersed with active bins. This situation is similar to disk fragmentation, which occurs when the system creates and deletes files on the disk. When a bin becomes empty, the configuration manager joins to the empty bin any adjacent empty bins to form as large a contiguous empty bin as possible. The configuration manager also joins adjacent deleted cells to form larger free cells. (The configuration manager shrinks a hive only when bins at the end of the hive become free. You can compact the registry by backing it up and restoring it using the Windows RegSaveKey and RegReplaceKey functions, which are used by the Windows Backup utility. Furthermore, the system compacts the bins at hive initialization time using the Reorganization algorithm, as described later.)

The links that create the structure of a hive are called cell indexes. A cell index is the offset of a cell into the hive file minus the size of the base block. Thus, a cell index is like a pointer from one cell to another cell that the configuration manager interprets relative to the start of a hive. For example, as you saw in Table 10-6, a cell that describes a key contains a field specifying the cell index of its parent key; a cell index for a subkey specifies the cell that describes the subkeys that are subordinate to the specified subkey. A subkey-list cell contains a list of cell indexes that refer to the subkey's key cells. Therefore, if you want to locate, for example, the key cell of subkey A whose parent is key B, you must first locate the cell containing key B's subkey list using the subkey-list cell index in key B's cell. Then you locate each of key B's subkey cells by using the list of cell indexes in the subkey-list cell. For each subkey cell, you check to see whether the subkey's name, which a key cell stores, matches the one you want to locate—in this case, subkey A.

The distinction between cells, bins, and blocks can be confusing, so let's look at an example of a simple registry hive layout to help clarify the differences. The sample registry hive file in Figure 10-3 contains a base block and two bins. The first bin is empty, and the second bin contains several cells. Logically, the hive has only two keys: the root key Root and a subkey of Root. Sub Key. Root has two values, Val 1 and Val 2. A subkey-list cell locates the root key's subkey, and a value-list cell locates the root key's values. The free spaces in the second bin are empty cells. Figure 10-3 doesn't show the security cells for the two keys, which would be present in a hive.

---

![Figure](figures/Winternals7thPt2_page_444_figure_000.png)

FIGURE 10-3 Internal structure of a registry hive.

To optimize searches for both values and subkeys, the configuration manager sorts subkey-list cells

alphabetically. The configuration manager can then perform a binary search when it looks for a subkey

within a list of subkeys. The configuration manager examines the subkey in the middle of the list, and

if the name of the subkey the configuration manager is looking for alphabetically precedes the name

of the middle subkey, the configuration manager knows that the subkey is in the first half of the subkey

list; otherwise, the subkey is in the second half of the subkey list. This splitting process continues until

the configuration manager locates the subkey or finds no match. Value-list cells aren't sorted, however,

so new values are always added to the end of the list.

## Cell maps

If hives never grew, the configuration manager could perform all its registry management on the inmemory version of a hive as if the hive were a file. Given a cell index, the configuration manager could calculate the location in memory of a cell simply by adding the cell index, which is a hive file offset, to the base of the in-memory hive image. Early in the system boot, this process is exactly what Winload does with the SYSTEM hive: Winload reads the entire SYSTEM hive into memory as a read-only hive and adds the cell indexes to the base of the in-memory hive image to locate cells. Unfortunately, hives grow as they take on new keys and values, which means the system must allocate new reserved views and extend the hive file to store the new bins that contain added keys and values. The reserved views that keep the registry data in memory aren't necessarily contiguous.

To deal with noncontiguous memory addresses referencing hive data in memory, the configuration manager adopts a strategy similar to what the Windows memory manager uses to map virtual memory addresses to physical memory addresses. While a cell index is only an offset in the hive file, the configuration manager employs a two-level scheme, which Figure 10-4 illustrates, when it represents the hive using the mapped views in the registry process. The scheme takes as input a cell index (that is, a hive file offset) and returns as output both the address in memory of the block the cell index resides in and the address in memory of the block the cell resides in. Remember that a bin can contain one or more blocks and that hives grow in bins, so Windows always represents a bin with a contiguous region of memory. Therefore, all blocks within a bin occur within the same 2-MB hive's mapped view.

CHAPTER 10    Management, diagnostics, and tracing     413


---

![Figure](figures/Winternals7thPt2_page_445_figure_000.png)

FIGURE 10-4 Structure of a cell index.

To implement the mapping, the configuration manager divides a cell index logically into fields, in the same way that the memory manager divides a virtual address into fields. Windows interprets a cell index's first field as an index into a hive's cell map directory. The cell map directory contains 1024 entries, each of which refers to a cell map table that contains 512 map entries. An entry in this cell map table is specified by the second field in the cell index. That entry locates the bin and block memory addresses of the cell.

In the final step of the translation process, the configuration manager interprets the last field of the cell index as an offset into the identified block to precisely locate a cell in memory. When a hive initializes, the configuration manager dynamically creates the mapping tables, designating a map entry for each block in the hive, and it adds and deletes tables from the cell directory as the changing size of the hive requires.

## Hive reorganization

As for real file systems, registry hives suffer fragmentation problems: when cells in the bin are freed and it is not possible to coalescence them in a contiguous manner, fragmented little chunks of free space are created into various bins. If there is not enough available contiguous space for new cells, new bins are appended at the end of the hive file, while the fragmented ones will be rarely repurposed. To overcome this problem, starting from Windows 8.1, every time the configuration manager mounts a hive file, it checks whether a hive's reorganization needs to be performed. The configuration manager records the time of the last reorganization in the hive's basic block. If the hive has valid log files, is not volatile, and if the time passed after the previous reorganization is greater than seven days, the reorganization operation is started. The reorganization is an operation that has two main goals: shrink the hive file and optimize it. It starts by creating a new empty hive that is identical to the original one but does not contains any cells in it. The created clone is used to copy the root key of the original hive, with all its values (but no subkeys). A complex algorithm analyzes all the child keys; indeed, during its normal

---

activity, the configuration manager records whether a particular key is accessed, and, if so, stores an index representing the current runtime phase of the operating system (Boot or normal) in its key cell.

The reorganization algorithm first copies the keys accessed during the normal execution of the OS, then the ones accessed during the boot phase, and finally the keys that have not been accessed at all (since the last reorganization). This operation groups all the different keys in contiguous bins of the hive file. The copy operation, by definition, produces a nonfragmented hive file (each cell is stored sequentially in the bin, and new bin are always appended at the end of the file). Furthermore, the new hive has the characteristic to contain hot and cold classes of keys stored in big contiguous chunks. This result renders the boot and runtime phase of the operating system much quicker when reading data from the registry.

The reorganization algorithm resets the access state of all the new copied cells. In this way, the system can track the hive's keys usage by restarting from a neutral state. The new usage statistics will be consumed by the next reorganization, which will start after seven days. The configuration manager stores the results of a reorganization cycle in the HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Configuration\Manager\Defrag registry key, as shown in Figure 10-5. In the sample screenshot, the last reorganization was run on April 10, 2019 and saved 10 MB of fragmented hive space.

![Figure](figures/Winternals7thPt2_page_446_figure_003.png)

FIGURE 10-5 Registry reorganization data.

## The registry namespace and operation

The configuration manager defines a key object type to integrate the registry's namespace with the kernel's general namespace. The configuration manager inserts a key object named Registry into the root of the Windows namespace, which serves as the entry point to the registry. Regedit shows key names in the form HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet, but the Windows subsystem translates such names into their object namespace form (for example, \Registry\Machine\System\ CurrentControlSet). When the Windows object manager parses this name, it encounters the key

CHAPTER 10    Management, diagnostics, and tracing     415


---

object by the name of Registry first and hands the rest of the name to the configuration manager. The configuration manager takes over the name parsing, looking through its internal hive tree to find the desired key or value. Before we describe the flow of control for a typical registry operation, we need to discuss key objects and key control blocks. Whenever an application opens or creates a registry key, the object manager gives a handle with which to reference the key to the application. The handle corresponds to a key object that the configuration manager allocates with the help of the object manager. By using the object manager's object support, the configuration manager takes advantage of the security and reference-counting functionality that the object manager provides.

For each open registry key, the configuration manager also allocates a key control block. A key control block stores the name of the key, includes the cell index of the key node that the control block refers to, and contains a flag that notes whether the configuration manager needs to delete the key cell that the key control block refers to when the last handle for the key closes. Windows places all key control blocks into a hash table to enable quick searches for existing key control blocks by name. A key object points to its corresponding key control block, so if two applications open the same registry key, each receives a key object, and both key objects point to a common key control block.

When an application opens an existing registry key, the flow of control starts with the application specifying the name of the key in a registry API that invokes the object manager's name-parsing routine. The object manager, upon encountering the configuration manager's registry key object in the namespace, hands the path name to the configuration manager. The configuration manager performs a lookup on the key control block hash table. If the related key control block is found there, there's no need for any further work (no registry process attach is needed); otherwise, the lookup provides the configuration manager with the closest key control block to the searched key, and the lookup continues by attaching to the registry process and using the in-memory hive data structures to search through keys and subkeys to find the specified key. If the configuration manager finds the key cell, the configuration manager searches the key control block tree to determine whether the key is open (by the same application or another one). The search routine is optimized to always start from the closest ancestor with a key control block already opened. For example, if an application opens \Registry\ Machine\Key\Subkey2, and \Registry\Machine is already open, the parse routine uses the key control block of \Registry\Machine as a starting point. If the key is open, the configuration manager increments the existing key control block's reference count. If the key isn't open, the configuration manager allocates a new key control block and inserts it into the tree. Then the configuration manager allocates a key object, points the key object at the key control block, detaches from the Registry process, and returns control to the object manager, which returns a handle to the application.

When an application creates a new registry key, the configuration manager first finds the key cell for the new key's parent. The configuration manager then searches the list of free cells for the hive in which the new key will reside to determine whether cells exist that are large enough to hold the new key cell. If there aren't any free cells large enough, the configuration manager allocates a new bin and uses it for the cell, placing any space at the end of the bin on the free cell list. The new key cell fills with pertinent information—including the key's name—and the configuration manager adds the key cell to the subkey list of the parent key's subkey-list cell. Finally, the system stores the cell index of the parent cell in the new subkey's key cell.

---

The configuration manager uses a key control block's reference count to determine when to delete the key control block. When all the handles that refer to a key in a key control block close, the reference count becomes 0, which denotes that the key control block is no longer necessary. If an application that calls an API to delete the key sets the delete flag, the configuration manager can delete the associated key from the key's hive because it knows that no application is keeping the key open.

## EXPERIMENT: Viewing key control blocks

You can use the kernel debugger to list all the key control blocks allocated on a system with the


lreg openkeys command. Alternatively, if you want to view the key control block for a particular

open key, use lreg querykey:

```bash
0: kd> !reg querykey \Registry\machine\software\microsoft
Found KCB = ffffae08c156ae60 :: \REGISTRY\MACHINE\SOFTWARE\MICROSOFT
Hive        ffffae08c03b0000
KeyNode     00000225e8c3475c
[SubKeyAddr]                     [SubKeyName]
225e8d2364                          .NETFramework
225e8d24074                       AccountsControl
225e8d240d4                       Active Setup
225e8d2f0f54                       ActiveSync
225e8d241d                       ActiveZone
225e8d242c                       Advanced INF Setup
225e8d24294                       ALG
225e8d242ec                       AllUserInstallAgent
225e8d24354                       AMSI
225e8d243f4                       Analog
225e8d2448c                       AppServiceProtocols
225e6c61f4c                       AppV
225e8d2451c                       Assistance
225e8d2458c                       AuthHost
...
```

You can then examine a reported key control block with the !reg kcb command:

```bash
kd> !reg kcb ffffae08c156ae60
Key        :  \REGISTRY\MACHINE\SOFTWARE\MICROSOFT
RefCount    :  1f
Flags       :  CompressedName, Stable
ExtFlags    :
Parent       :  0xe1997368
KeyHive      :  0x1ca3a768
KeyCell       :  0x64e598 [cell index]
TotalLevels   :  4
DelayedCloseIndex: 2048
MaxNameLen    :  0x3c
MaxValueNemenl :  0x0
MaxValueDataLen :  0x0
LastWriteTime    :  0x1c42501:0x7eb6d470
KeyBodyListHead :  0xE1034d70 0xE1034d70
```

---

```bash
SubKeyCount     :  137
ValueCache_Count : 0
KCBlock        :  0xe1034d40
KeyLock         :  0xe1034d40
```

The Flags field indicates that the name is stored in compressed form, and the SubKeyCount field shows that the key has 137 subkeys.

## Stable storage

To make sure that a nonvolatile registry hive (one with an on-disk file) is always in a recoverable state,

the configuration manager uses log hives. Each nonvolatile hive has an associated log hive, which is a

hidden file with the same base name as the hive and a logN extension. To ensure forward progress, the

configuration manager uses a dual-logging scheme. There are potentially two log files: log1 and log2.

If, for any reason, .log1 was written but a failure occurred while writing dirty data to the primary log

file, the next time a flush happens, a switch to .log2 occurs with the cumulative dirty data. If that fails

as well, the cumulative dirty data (the data in .log1 and the data that was dirtied in between) is saved in

.log2. As a consequence, .log1 will be used again next time around, until a successful write operation is

done to the primary log file. If no failure occurs, only .log1 is used.

For example, if you look in your %SystemRoot%\System32\Config directory (and you have the Show Hidden Files And Folders folder option selected and Hide Protected Operating System Files unselected; otherwise, you won’t see any file), you’ll see System.log1, Sam.log1, and other .log1 and .log2 files. When a hive initializes, the configuration manager allocates a bit array in which each bit represents a 512-byte portion, or sector, of the hive. This array is called the dirty sector array because a bit set in the array means that the system has modified the corresponding sector in the hive in memory and must write the sector back to the hive file. (A bit not set means that the corresponding sector is up to date with the in-memory hive’s contents.)

When the creation of a new key or value or the modification of an existing key or value takes place, the configuration manager notes the sectors of the primary hive that change and writes them in the hive's dirty sectors array in memory. Then the configuration manager schedules a lazy flush operation, or a log sync. The hive lazy writer system thread wakes up one minute after the request to synchronize the hive's log. It generates new log entries from the in-memory hive sectors referenced by valid bits of the dirty sectors array and writes them to the hive log files on disk. At the same time, the system flushes all the registry modifications that take place between the time a hive sync is requested and the time the hive sync occurs. The lazy writer uses low priority I/Os and writes dirty sectors to the log file on disk (and not to the primary hive). When a hive sync takes place, the next hive sync occurs no sooner than one minute later.

If the lazy writer simply wrote all a hive's dirty sectors to the hive file and the system crashed in midoperation, the hive file would be in an inconsistent (corrupted) and unrecoverable state. To prevent such an occurrence, the lazy writer first dumps the hive's dirty sector array and all the dirty sectors to the hive's log file, increasing the log file's size if necessary. A hive's basic block contains two sequence numbers. After the first flush operation (and not in the subsequent flushes), the configuration manager updates one of the sequence number, which become bigger than the second one. Thus, if the system

---

crashes during the write operations to the hive, at the next reboot the configuration manager notices that the two sequence numbers in the hive's base block don't match. The configuration manager can update the hive with the dirty sectors in the hive's log file to roll the hive forward. The hive is then up to date and consistent.

After writing log entries in the hive's log, the lazy flusher clears the corresponding valid bits in the dirty sector array but inserts those bits in another important vector: the unreconciled array. The latter is used by the configuration manager to understand which log entries to write in the primary hive. Thanks to the new incremental logging support (discussed later), the primary hive file is rarely written during the runtime execution of the operating system. The hive's sync protocol (not to be confused by the log sync) is the algorithm used to write all the in-memory and in-log registry's modifications to the primary hive file and to set the two sequence numbers in the hive. It is indeed an expensive multistage operation that is described later.

The Reconciler, which is another type of lazy writer system thread, wakes up once every hour, freezes

up the log, and writes all the dirty log entries in the primary hive file. The reconciliation algorithm

knows which parts of the in-memory hive to write to the primary file thanks to both the dirty sectors

and unreconciled array. Reconciliation happens rarely, though. If a system crashes, the configuration

manager has all the information needed to reconstruct a hive, thanks to the log entries that have been

already written in the log files. Performing registry reconciliation only once per hour (or when the size

of the log is behind a threshold, which depends on the size of the volume in which the hive reside) is a

big performance improvement. The only possible time window in which some data loss could happen

in the hive is between log flushes.

Note that the Reconciliation still does not update the second sequence number in the main hive file.

The two sequence numbers will be updated with an equal value only in the "validation" phase (another

form of hive flushing), which happens only at the hive's unload time (when an application calls the

RegUnloadKey API), when the system shuts down, or when the hive is first loaded. This means that in

most of the lifetime of the operating system, the main registry hive is in a dirty state and needs its log

file to be correctly read.

The Windows Boot Loader also contains some code related to registry reliability. For example, it can

parse the System.log file before the kernel is loaded and do repairs to fix consistency. Additionally, in

certain cases of hive corruption (such as if a base block, bin, or cell contains data that fails consistency

checks), the configuration manager can reinitialize corrupted data structures, possibly deleting subkeys

in the process, and continue normal operation. If it must resort to a self-healing operation, it pops up a

system error dialog box notifying the user.

## Incremental logging

As mentioned in the previous section, Windows 8.1 introduced a big improvement on the performance

of the hive sync algorithm thanks to incremental logging. Normally, cells in a hive file can be in four

different states:

- ■ Clean The cell's data is in the hive's primary file and has not been modified.

■ Dirty The cell's data has been modified but resides only in memory.
CHAPTER 10    Management, diagnostics, and tracing      419


---

- ■ Unreconciled The cell's data has been modified and correctly written to a log file but isn't in
the primary file yet.
■ Dirty and Unreconciled After the cell has been written to the log file, it has been modified
again. Only the first modification is on the log file, whereas the last one resides in memory only.
The original pre-Windows 8.1 synchronization algorithm was executing five seconds after one or more cells were modified. The algorithm can be summarized in four steps:

- 1. The configuration manager writes all the modified cells signaled by the dirty vector in a single

entry in the log file.

2. It invalidates the hive's base block (by setting only one sequence number with an incremented

value than the other one).

3. It writes all the modified data on the primary hive's file.

4. It performs the validation of the primary hive (the validation sets the two sequence numbers

with an identical value in the primary hive file).
To maintain the integrity and the recoverability of the hive, the algorithm should emit a flush operation to the file system driver after each phase; otherwise, corruption could happen. Flush operations on random access data can be very expensive (especially on standard rotation disks).

Incremental logging solved the performance problem. In the legacy algorithm, one single log entry was written containing all the dirty data between multiple hive validations; the incremental model broke this assumption. The new synchronization algorithm writes a single log entry every time the lazy flusher executes, which, as discussed previously, invalidates the primary hive's base block only in the first time it executes. Subsequent flushes continue to write new log entries without touching the hive's primary file. Every hour, or if the space in the log exhausts, the Reconciler writes all the data stored in the log entries to the primary hive's file without performing the validation phase. In this way, space in the log file is reclaimed while maintaining the recoverability of the hive. If the system crashes at this stage, the log contains original entries that will be reapplied at hive loading time; otherwise, new entries are reapplied at the beginning of the log, and, in case the system crashes later, at hive load time only the new entries in the log are applied.

Figure 10-6 shows the possible crash situations and how they are managed by the incremental logging scheme. In case A, the system has written new data to the hive in memory, and the lazy flusher has written the corresponding entries in the log (but no reconciliation happened). When the system restarts, the recovery procedure applies all the log entries to the primary hive and validates the hive file again. In case B, the reconciler has already written the data stored in the log entries to the primary hive before the crash (no hive validation happened). At system reboot, the recovery procedure reapplies the existing log entries, but no modification in the primary hive file are made. Case C shows a similar situation of case B but where a new entry has been written to the log after the reconciliation. In this case, the recovery procedure writes only the last modification that is not in the primary file.

---

![Figure](figures/Winternals7thPt2_page_452_figure_000.png)

FIGURE 10-6 Consequences of possible system crashes in different times.

The hive's validation is performed only in certain (rare) cases. When a hive is unloaded, the system performs reconciliation and then validates the hive's primary file. At the end of the validation, it sets the two sequence numbers of the hive's primary file to a new identical value and emits the last file system flush request before unloading the hive from memory. When the system restarts, the hive load's code detects that the hive primary is in a clean state (thanks to the two sequence numbers having the same value) and does not start any form of the hive's recovery procedure. Thanks to the new incremental synchronization protocol, the operating system does not suffer any longer for the performance penalties brought by the old legacy logging protocol.

![Figure](figures/Winternals7thPt2_page_452_figure_003.png)

Note Loading a hive created by Windows 8.1 or a newer operating system in older machines is problematic in case the hive's primary file is in a non-clean state. The old OS (Windows 7, for example) has no idea how to process the new log files. For this reason, Microsoft created the RegHiveRecovery minifilter driver, which is distributed through the Windows Assessment and Deployment Kit (ADK). The RegHiveRecovery driver uses Registry callbacks, which intercept "hive load" requests from the system and determine whether the hive's primary file needs recovery and uses incremental logs. If so, it performs the recovery and fixes the hive's primary file before the system has a chance to read it.

CHAPTER 10    Management, diagnostics, and tracing     421


---

## Registry filtering

The configuration manager in the Windows kernel implements a powerful model of registry filtering, which allows for monitoring of registry activity by tools such as Process Monitor. When a driver uses the callback mechanism, it registers a callback function with the configuration manager. The configuration manager executes the driver's callback function before and after the execution of registry system services so that the driver has full visibility and control over registry accesses. Antivirus products that scan registry data for viruses or prevent unauthorized processes from modifying the registry are other users of the callback mechanism.

Registry callbacks are also associated with the concept of altitudes. Altitudes are a way for different vendors to register a "height" on the registry filtering stack so that the order in which the system calls each callback routine can be deterministic and correct. This avoids a scenario in which an antivirus product would scan encrypted keys before an encryption product would run its own callback to decrypt them. With the Windows registry callback model, both types of tools are assigned a base altitude corresponding to the type of filtering they are doing—in this case, encryption versus scanning. Secondly, companies that create these types of tools must register with Microsoft so that within their own group, they will not collide with similar or competing products.

The filtering model also includes the ability to either completely take over the processing of the registry operation (bypassing the configuration manager and preventing it from handling the request) or redirect the operation to a different operation (such as WoW64's registry redirection). Additionally, it is also possible to modify the output parameters as well as the return value of a registry operation.

Finally, drivers can assign and tag per-key or per-operation driver-defined information for their own

purposes. A driver can create and assign this context data during a create or open operation, which the

configuration manager remembers and returns during each subsequent operation on the key.

## Registry virtualization
