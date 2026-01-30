## Packaged applications

Starting with Windows 8, there was a need for some APIs that run on different kind of devices, from a mobile phone, up to an Xbox and to a fully-fledged personal computer. Windows was indeed starting to be designed even for new device types, which use different platforms and CPU architectures (ARM is a good example). A new platform-agnostic application architecture, Windows Runtime (also known as "WinRT") was first introduced in Windows 8. WinRT supported development in C++, JavaScript, and managed languages (C#, VB.Net, and so on), was based on COM, and supported natively both x86, AMD64, and ARM processors. Universal Windows Platform (UWP) is the evolution of WinRT. It has been designed to overcome some limitations of WinRT and it is built on the top of it. UWP applications no longer need to indicate which OS version has been developed for in their manifest, but instead they target one or more device families.

UWP provides Universal Device Family APIs, which are guaranteed to be present in all device families, and Extension APIs, which are device specific. A developer can target one device type, adding the extension SDK in its manifest; furthermore, she can conditionally test the presence of an API at runtime and adapt the app's behavior accordingly. In this way, a UWP app running on a smartphone may start behaving the way it would if it were running on a PC when the phone is connected to a desktop computer or a suitable docking station.

UWP provides multiple services to its apps:

- ■  Adaptive controls and input—the graphical elements respond to the size and DPI of the screen
by adjusting their layout and scale. Furthermore, the input handling is abstracted to the under-
lying app. This means that a UWP app works well on different screens and with different kinds
of input devices, like touch, a pen, a mouse, keyboard, or an Xbox controller

■  One centralized store for every UWP app, which provides a seamless install, uninstall, and
upgrade experience

■  A unified design system, called Fluent (integrated in Visual Studio)

■  A sandbox environment, which is called AppContainer
---

AppContainers were originally designed for WinRT and are still used for UWP applications. We already covered the security aspects of AppContainers in Chapter 7 of Part 1.

To properly execute and manage UWP applications, a new application model has been built in

Windows, which is internally called AppModel and stands for "Modern Application Model." The

Modern Application Model has evolved and has been changed multiple times during each release of

the OS. In this book, we analyze the Windows 10 Modern Application Model. Multiple components are

part of the new model and cooperate to correctly manage the states of the packaged application and

its background activities in an energy-efficient manner.

- ■ Host Activity Manager (HAM) The Host activity manager is a new component, introduced
in Windows 10, which replaces and integrates many of the old components that control the
life (and the states) of a UWP application (Process Lifetime Manager, Foreground Manager,
Resource Policy, and Resource Manager). The Host Activity Manager lives in the Background
Task Infrastructure service (BrokerInfrastructure), not to be confused with the Background
Broker Infrastructure component, and works deeply tied to the Process State Manager. It is
implemented in two different libraries, which represent the client (Rmclient.dll) and server
(PsmServiceExtHost.dll) interface.

■ Process State Manager (PSM) PSM has been partly replaced by HAM and is considered
part of the latter (actually PSM became a HAM client). It maintains and stores the state of
each host of the packaged application. It is implemented in the same service of the HAM
(BrokerInfrastructure), but in a different DLL: Psmsrv.dll.

■ Application Activation Manager (AAM) AAM is the component responsible in the dif-
ferent kinds and types of activation of a packaged application. It is implemented in the
ActivationManager.dll library, which lives in the User Manager service. Application Activation
Manager is a HAM client.

■ View Manager (VM) VM detects and manages UWP user interface events and activities
and talks with HAM to keep the UI application in the foreground and in a nonsuspended state.
Furthermore, VM helps HAM in detecting when a UWP application goes into background
state. View Manager is implemented in the CoreUiComponents.dll .Net managed library, which
depends on the Modern Execution Manager client interface (ExecModelClient.dll) to properly
register with HAM. Both libraries live in the User Manager service, which runs in a Sihost process
(the service needs to proper manage UI events)

■ Background Broker Infrastructure (BI) BI manages the applications background tasks, their
execution policies, and events. The core server is implemented mainly in the bisrv.dll library,
manages the events that the brokers generate, and evaluates the policies used to decide whether
to run a background task. The Background Broker Infrastructure lives in the BrokerInfrastructure
service and, at the time of this writing, is not used for Centennial applications.
There are some other minor components that compose the new application model that we have not mentioned here and are beyond the scope of this book.

---

With the goal of being able to run even standard Win32 applications on secure devices like Windows 10 S, and to enable the conversion of old application to the new model, Microsoft has designed the Desktop Bridge (internally called Centennial). The bridge is available to developers through Visual Studio or the Desktop App Converter. Running a Win32 application in an AppContainer, even if possible, is not recommended, simply because the standard Win32 applications are designed to access a wider system API surface, which is much reduced in AppContainers.

## UWP applications

We already covered an introduction of UWP applications and described the security environment in which they run in Chapter 7 of Part 1. To better understand the concepts expressed in this chapter, it is useful to define some basic properties of the modern UWP applications. Windows 8 introduced significant new properties for processes:

- Package identity

Application identity

AppContainer

Modern UI
We have already extensively analyzed the AppContainer (see Chapter 7 in Part 1). When the user downloads a modern UWP application, the application usually came encapsulated in an AppX package. A package can contain different applications that are published by the same author and are linked together. A package identity is a logical construct that uniquely defines a package. It is composed of five parts: name, version, architecture, resource id, and publisher. The package identity can be represented in two ways: by using a Package Full Name (formerly known as Package Moniker), which is a string composed of all the single parts of the package identity, concatenated by an underscore character, or by using a Package Family name, which is another string containing the package name and publisher. The publisher is represented in both cases by using a Base32-encoded string of the full publisher name. In the UWP world, the terms "Package ID" and "Package full name" are equivalent. For example, the Adobe Photoshop package is distributed with the following full name:

AdobeSystemsIncorporated.AdobePhotoshopExpress_2.6.235.0_neutral_split.scale-125xyz6bjz8te8ga, where

- ■ AdobeSystemsincorporated.AdobePhotoshopExpress is the name of the package.

■ 2.6.235.0 is the version.

■ neutral is the targeting architecture.

■ split_scale is the resource id.

■ ynb6jyztte8ga is the base32 encoding (Crockford's variant, which excludes the letters i, l, u, and
o to avoid confusion with digits) of the publisher.
---

Its package family name is the simpler "AdobeSystemsincorporated.AdobePhotoshopExpress _ynbj6yi2te8ga" string.

Every application that composes the package is represented by an application identity. An application identity uniquely identifies the collection of windows, processes, shortcuts, icons, and functionality that form a single user-facing program, regardless of its actual implementation (so this means that in the UWP world, a single application can be composed of different processes that are still part of the same application identity). The application identity is represented by a simple string (in the UWP world, called Package Relative Application ID, often abbreviated as PRAID). The latter is always combined with the package family name to compose the Application User Model ID (often abbreviated as AUMID). For example, the Windows modern Start menu application has the following AUMID: Microsoft.Windows. ShellExperienceHost_cw5lnh2txyew/App, where the App part is the PRAID.

Both the package full name and the application identity are located in the WIN/SSYSAPPID Security

attribute of the token that describes the modern application security context. For an extensive descrip tion of the security environment in which the UWP applications run, refer to Chapter 7 in Part 1.

## Centennial applications

Starting from Windows 10, the new application model became compatible with standard Win32 applications. The only procedure that the developer needs to do is to run the application installer program with a special Microsoft tool called Desktop App Converter. The Desktop App Converter launches the installer under a sandboxed server Silo (internally called Argon Container) and intercepts all the file system and registry I/O that is needed to create the application package, storing all its files in VFS (virtualized file system) private folders. Entirely describing the Desktop App Converter application is outside the scope of this book. You can find more details of Windows Containers and Silos in Chapter 3 of Part 1.

The Centennial runtime, unlike UWP applications, does not create a sandbox where Centennial processes are run, but only applies a thin virtualization layer on the top of them. As result, compared to standard Win32 programs, Centennial applications don't have lower security capabilities, nor do they run with a lower integrity-level token. A Centennial application can even be launched under an administrative account. This kind of application runs in application silos (internally called Helium Container), which, with the goal of providing State separation while maintaining compatibility, provides two forms of "jails": Registry Redirection and Virtual File System (VFS). Figure 8-42 shows an example of a Centennial application: Kali Linux.

At package activation, the system applies registry redirection to the application and merges the main system hives with the Centennial Application registry hives. Each Centennial application can include three different registry hives when installed in the user workstation: registry.dat, user.dat, and (optionally) userclasdat. The registry files generated by the Desktop Convert represent "immutable" hives, which are written at installation time and should not change. At application startup, the Centennial runtime merges the immutable hives with the real system registry hives (actually, the Centennial runtime executes a "detokenizing" procedure because each value stored in the hive contains relative values).

---

FIGURE 8-42 Kali Linux distributed on the Windows Store is a typical example of Centennial application.

<table><tr><td>Operation</td><td>Result</td></tr><tr><td>All writes to HKEY_LOCAL_MACHINE\Software</td><td>The operation returns a dynamic merge of the package hives with the local system counterpart. Registry keys and values that exist in the package have the local system.</td></tr><tr><td>All writes inside the package</td><td>Redirected to the Centennial application.</td></tr><tr><td>All writes outside the package</td><td>Writes to HKEY_LOCAL_MACHINE\Software are allowed if a registry value exists in one of the package hives.</td></tr></table>

CHAPTER 8 System mechanisms 247


---

When the Centennial runtime sets up the Silo application container, it walks all the file and direc tories located into the VFS folder of the package. This procedure is part of the Centennial Virtual File

System configuration that the package activation provides. The Centennial runtime includes a list of

mapping for each folder located in the VFS directory, as shown in Table 8-35.

TABLE 8-35 List of system folders that are virtualized for Centennial apps

<table><tr><td>Folder Name</td><td>Redirection Target</td><td>Architecture</td></tr><tr><td>SystemX86</td><td>C:\Windows\SystemWOW64</td><td>32-bit/64-bit</td></tr><tr><td>System</td><td>C:\Windows\System32</td><td>32-bit/64-bit</td></tr><tr><td>SystemX64</td><td>C:\Windows\System32</td><td>64-bit only</td></tr><tr><td>ProgramFilesX86</td><td>C:\Program Files(x86)</td><td>32-bit/64-bit</td></tr><tr><td>ProgramFilesX64</td><td>C:\Program Files</td><td>64-bit only</td></tr><tr><td>ProgramFilesCommonX86</td><td>C:\Program Files(x86)\Common Files</td><td>32-bit/64-bit</td></tr><tr><td>ProgramFilesCommonX64</td><td>C:\Program Files\Common Files</td><td>64-bit only</td></tr><tr><td>Windows</td><td>C:\Windows</td><td>Neutral</td></tr><tr><td>CommonAppData</td><td>C:\ProgramData</td><td>Neutral</td></tr></table>


The File System Virtualization is provided by three different drivers, which are heavily used for

Argon containers:

- ■ Windows Bind minifilter driver (BindFlt) Manages the redirection of the Centennial ap-
plication's files. This means that if the Centennial app wants to read or write to one of its existing
virtualized files, the I/O is redirected to the file's original position. When the application creates
instead a file on one of the virtualized folders (for example, in C:\Windows), and the file does
not already exist, the operation is allowed (assuming that the user has the needed permissions)
and the redirection is not applied.

■ Windows Container Isolation minifilter driver (Wcifs) Responsible for merging the
content of different virtualized folders (called layers) and creating a unique view. Centennial
applications use this driver to merge the content of the local user's application data folder
(usually C:\Users\<UserName>\AppData) with the app's application cache folder, located in C\
User\<UserName>\Appdata\Local\Packages\<Package FullName\LocalCache. The driver is
even able to manage the merge of multiple packages, meaning that each package can operate
on its own private view of the merged folders. To support this feature, the driver stores a Layer
ID of each package in the Reparse point of the target folder. In this way, it can construct a layer
map in memory and is able to operate on different private areas (internally called Scratch areas).
This advanced feature, at the time of this writing, is configured only for related set, a feature
described later in the chapter.

■ Windows Container Name Virtualization minifilter driver (Wcnfs) While Wcifs driver
merges multiple folders, Wcnfs is used by Centennial to set up the name redirection of the local
user application data folder. Unlike from the previous case, when the app creates a new file or
folder in the virtualized application data folder, the file is stored in the application cache folder,
and not in the real one, regardless of whether the file already exists.

CHAPTER 8 System mechanisms

---

One important concept to keep in mind is that the BindIFilter operates on single files, whereas Wcnfs

and Wcifs drivers operate on folders. Centennial uses minifilters' communication ports to correctly set up

the virtualized file system infrastructure. The setup process is completed using a message-based commu nication system (where the Centennial runtime sends a message to the minifilter and waits for its re sponse). Table 8-36 shows a summary of the file system virtualization applied to Centennial applications.

TABLE 8-36 File system virtualization applied to Centennial applications

<table><tr><td>Operation</td><td>Result</td></tr><tr><td>Read or enumeration of a well-known Windows folder</td><td>The operation returns a dynamic merge of the corresponding VFS folder with the local system counterpart. File that exists in the VFS folder always had pre-cedence with respect to files that already exist in the local system one.</td></tr><tr><td>Writes on the application data folder</td><td>All the writes on the application data folder are redirected to the local Centennial application cache.</td></tr><tr><td>All writes inside the package folder</td><td>Forbidden, read-only.</td></tr><tr><td>All writes outside the package folder</td><td>Allowed if the user has permission.</td></tr></table>


## The Host Activity Manager

Windows 10 has unified various components that were interacting with the state of a packaged application in a noncoordinated way. As a result, a brand-new component, called Host Activity Manager (HAM) became the central component and the only one that manages the state of a packaged application and exposes a unified API set to all its clients.

Unlike its predecessors, the Host Activity Manager exposes activity-based interfaces to its clients.


A host is the object that represents the smallest unit of isolation recognized by the Application model.

Resources, suspend/resume and freeze states, and priorities are managed as a single unit, which usu ally corresponds to a Windows Job object representing the packaged application. The job object may

contain only a single process for simple applications, but it could contain even different processes for

applications that have multiple background tasks (such as multimedia players, for example).

In the new Modern Application Model, there are three job types:

- ■ Mixed A mix of foreground and background activities but typically associated with the fore-
ground part of the application. Applications that include background tasks (like music playing
or printing) use this kind of job type.
■ Pure A host that is used for purely background work.
■ System A host that executes Windows code on behalf of the application (for example, back-
ground downloads).
An activity always belongs to a host and represents the generic interface for client-specific concepts such as windows, background tasks, task completions, and so on. A host is considered "Active" if its job is unfrozen and it has at least one running activity. The HAM clients are components that interact and control the lifetime of activities. Multiple components are HAM clients: View Manager, Broker Infrastructure, various Shell components (like the Shell Experience Host), AudioSrv, Task completions, and even the Windows Service Control Manager.

---

The Modern application's lifecycle consists of four states: running, suspending, suspend-complete, and suspended (states and their interactions are shown in Figure 8-43).

- ■ Running The state where an application is executing part of its code, other than when it's
suspending. An application could be in "running" state not only when it is in a foreground state
but even when it is running background tasks, playing music, printing, or any number of other
background scenarios.
■ Suspending This state represents a time-limited transition state that happens where HAM
asks the application to suspend. HAM can do this for different reasons, like when the applica-
tion loses the foreground focus, when the system has limited resources or is entering a battery-
safe mode, or simply because an app is waiting for some UI event. When this happens, an
app has a limited amount of time to go to the suspended state (usually 5 seconds maximum);
otherwise, it will be terminated.
■ SuspendComplete This state represents an application that has finished suspending and
notifies the system that it is done. Therefore, its suspend procedure is considered completed.
■ Suspended Once an app completes suspension and notifies the system, the system freez-
es the application's job object using the NtSetInformationJobObject API call (through the
JobObjectFreezeInformation information class) and, as a result, none of the app code can run.
![Figure](figures/Winternals7thPt2_page_281_figure_002.png)

FIGURE 8-43 Scheme of the lifecycle of a packaged application.

With the goal of preserving system efficiency and saving system resources, the Host Activity Manager by default will always require an application to suspend. HAM clients need to require keeping an application alive to HAM. For foreground applications, the component responsible in keeping the app alive is the View Manager. The same applies for background tasks: Broker Infrastructure is the component responsible for determining which process hosting the background activity should remain alive (and will request to HAM to keep the application alive).

Packaged applications do not have a Terminated state. This means that an application does not have a real notion of an Exit or Terminate state and should not try to terminate itself. The actual model for terminating a Packaged application is that first it gets suspended, and then HAM, if required, calls NTTerminateJobObject API on the application's job object. HAM automatically manages the app lifetime and destroys the process only as needed. HAM does not decide itself to terminate the application; instead, its clients are required to do so (the View Manager or the Application Activation Manager are good examples). A packaged application can't distinguish whether it has been suspended or terminated. This allows Windows to automatically restore the previous state of the application even if it has been terminated or if the system has been rebooted. As a result, the packaged application model is completely different from the standard Win32 application model.

CHAPTER 8 System mechanisms



---

To properly suspend and resume a Packaged application, the Host Activity manager uses the new

PsFreezeProcess and PsThawProcess kernel APIs. The process Freeze and Thaw operations are similar to

suspend and resume, with the following two major differences:

- ■ A new thread that is injected or created in a context of a deep-frozen process will not
run even in case the CREATE_SUSPENDED flag is not used at creation time or in case the
NtResumeProcess API is called to start the thread.
■ A new Freeze counter is implemented in the EPROCESS data structures. This means that a pro-
cess could be frozen multiple times. To allow a process to be thawed, the total number of thaw
requests must be equal to the number of freeze requests. Only in this case are all the nonsus-
pended threads allowed to run.
## The State Repository

The Modern Application Model introduces a new way for storing packaged applications' settings, package dependencies, and general application data. The State Repository is the new central store that contains all this kind of data and has an important central rule in the management of all modern applications: Every time an application is downloaded from the store, installed, activated, or removed, new data is read or written to the repository. The classical usage example of the State Repository is represented by the user clicking on a tile in the Start menu. The Start menu resolves the full path of the application's activation file (which could be an EXE or a DLL, as already seen in Chapter 7 of Part 1), reading from the repository. (This is actually simplified, because the ShellExecutionHost process enumerates all the modern applications at initialization time.)

The State Repository is implemented mainly in two libraries: Windows.StateRepository.dll and Windows.StateRepositoryCore.dll. Although the State Repository Service runs the server part of the repository, UWP applications talk with the repository using the Windows.StateRepositoryClient.dll library. (All the repository APIs are full trust, so WinRT clients need a Proxy to correctly communicate with the server. This is the rule of another DLL, named Windows.StateRepositoryPs.dll.) The root location of the State Repository is stored in the HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\ Appx\PackageRepositoryRoot registry value, which usually points to the C:\ProgramData\Microsoft\ Windows\AppData\S repository path.

The State Repository is implemented across multiple databases, called partitions. Tables in the database are called entities. Partitions have different access and lifetime constraints:

- ■ Machine This database includes package definitions, an application's data and identities, and
primary and secondary tiles (used in the Start menu), and it is the master registry that defines
who can access which package. This data is read extensively by different components (like
the TileDataRepository library, which is used by Explorer and the Start menu to manage the
different tiles), but it's written primarily by the AppX deployment (rarely by some other minor
components). The Machine partition is usually stored in a file called StateRepository-Machine.
srd located into the state repository root folder.
■ Deployment Stores machine-wide data mostly used only by the deployment service
(AppSvc) when a new package is registered or removed from the system. It includes the
CHAPTER 8    System mechanisms      251


---

applications file list and a copy of each modern application's manifest file. The Deployment

partition is usually stored in a file called StateRepository-Deployment.srd.

All partitions are stored as SQLite databases. Windows compiles its own version of SQLite into the StateRepository.Core.dll library. This library exposes the State Repository Data Access Layer (also known as DAL) APIs that are mainly wrappers to the internal database engine and are called by the State Repository service.

Sometimes various components need to know when some data in the State Repository is written

or modified. In Windows 10 Anniversary update, the State Repository has been updated to support

changes and events tracking. It can manage different scenarios:

- ■ A component wants to subscribe for data changes for a certain entity. The component receives
a callback when the data is changed and implemented using a SQL transaction. Multiple SQL
transactions are part of a Deployment operation. At the end of each database transaction,
the State Repository determines if a Deployment operation is completed, and, if so, calls each
registered listener.

■ A process is started or wakes from Suspend and needs to discover what data has changed since
it was last notified or looked at. State Repository could satisfy this request using the Changelog
field, which, in the tables that supports this feature, represents a unique temporal identifier
of a record.

■ A process retrieves data from the State Repository and needs to know if the data has changed
since it was last examined. Data changes are always recorded in compatible entities via a new
table called Changelog. The latter always records the time, the change ID of the event that cre-
ated the data, and, if applicable, the change ID of the event that deleted the data.
The modern Start menu uses the changes and events tracking feature of the State Repository to work properly. Every time the ShellExperienceHost process starts, it requests the State Repository to notify its controller (NotificationController.dll) every time a tile is modified, created, or removed. When the user installs or removes a modern application through the Store, the application deployment server executes a DB transaction for inserting or removing the tile. The State Repository, at the end of the transaction, signals an event that wakes up the controller. In this way, the Start menu can modify its appearance almost in real time.

![Figure](figures/Winternals7thPt2_page_283_figure_005.png)

Note In a similar way, the modern Start menu is automatically able to add or remove an

entry for every new standard Win32 application installed. The application setup program

usually creates one or more shortcuts in one of the classic Start menu folder locations

(stystemwide path: C:\ProgramData\Microsoft\Windows\Start Menu, or per-user path:

C:\Users\<UserName>\AppData\Roaming\Microsoft\Windows\Start Menu). The modern

Start menu uses the services provided by the AppResolver library to register file system

notifications on all the Start menu folders (through the ReadDirectoryChangesWin32 API).

In this way, whenever a new shortcut is created in the monitored folders, the library can get

a callback and signal the Start menu to redraw itself.

---

Experiment: Witnessing the state repository

You can open each partition of the state repository fairly easily using your preferred SQLite browser application. For this experiment, you need to download and install an SQLite browser, like the open-source DB Browser for SQLite, which you can download from http://sqlite.com. org/ The State Repository is not accessible by standard users. Furthermore, each partition’s file could be in use in the exact moment that you will access it. Thus, you need to copy the database file in another folder before trying to open it with the SQLite browser. Open an administrative command prompt (by typing cmd in the Send As a Command prompt) and select the Run As Administrator after right-clicking the Command Prompt label and choose the following commands:

C:\WINDOWS\system32\cd C:\ProgramData\Microsoft\Windows\App\Repository\ C:\ProgramData\Microsoft\Windows\App\Repository\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c:\c

---

srd file. The main view of DB Browser for SQLite is the database structure. For this experiment you need to choose the Browse Data sheet and navigate through the tables like Package, Application, PackageLocation, and PrimaryTile.

The Application Activation Manager and many other components of the Modern Application Model use standard SQL queries to extract the needed data from the State Repository. For example, to extract the package location and the executable name of a modern application, a SQL query like the following one could be used:

```bash
SELECT p.DisplayName, p.PackageFullName, p1.InstalledLocation, a.Executable, pm.Name
FROM Package AS p
INNER JOIN PackageLocation AS pl ON p.PackageID=pl.Package
INNER JOIN PackageFamily AS pm ON p.PackageFamily=pm.PackageFamilyID
INNER JOIN Application AS a ON a.Package=P..PackageID
WHERE pm.PackageFamilyName="-Package Family Name-"
```

The DAL (Data Access Layer) uses similar queries to provide services to its clients.

![Figure](figures/Winternals7thPt2_page_285_figure_004.png)

You can annotate the total number of records in the table and then install a new application from the store. If, after the deployment process is completed, you again copy the database file, you will find that number of the records change. This happens in multiple tables. Especially if the new app installs a new tile, even the PrimaryTile table adds a record for the new tile shown in the Start menu.

---

## The Dependency Mini Repository

Opening an SQLite database and extracting the needed information through an SQL query could be an expensive operation. Furthermore, the current architecture requires some interprocess communication done through RPC. Those two constraints sometimes are too restrictive to be satisfied. A classic example is represented by a user launching a new application (maybe an Execution Alias) through the command-line console. Checking the State Repository every time the system spawns a process introduces a big performance issue. T o fix these problems, the Application Model has introduced another smaller store that contains Modern applications' information: the Dependency Mini Repository (DMR).

Unlike from the State Repository, the Dependency Mini Repository does not make use of any

database but stores the data in a Microsoft-proprietary binary format that can be accessed by any file

system in any security context (even a kernel-mode driver could possibly parse the DMR data). The

System Metadata directory, which is represented by a folder named Packages in the State Repository

root path, contains a list of subfolders, one for every installed package. The Dependency Mini Repository

is represented by a .pckgdep file, named as the user's SID. The DMR file is created by the Deployment

service when a package is registered for a user (for further details, see the "Package registration" sec tion later in this chapter).

The Dependency Mini Repository is heavily used when the system creates a process that belongs to

a packaged application (in the AppX Pre-CreateProcess extension). Thus, it's entirely implemented in

the Win32 kernelbase.dll (with some stub functions in kernelappcore.dll). When a DMR file is opened

at process creation time, it is read, parsed, and memory-mapped into the parent process. After the

child process is created, the loader code maps it even in the child process. The DMR file contains vari ous information, including

- ■ Package information, like the ID, full name, full path, and publisher

■ Application information: application user model ID and relative ID, description, display name,

and graphical logos

■ Security context: AppContainer SID and capabilities

■ Target platform and the package dependencies graph (used in case a package depends on one

or more others)
The DMR file is designed to contain even additional data in future Windows versions, if required.

Using the Dependency Mini Repository file, the process creation is fast enough and does not require a

query into the State Repository. Noteworthy is that the DMR file is closed after the process creation. So,

it is possible to rewrite the .pckgdep file, adding an optional package even when the Modern applica tion is executing. In this way, the user can add a feature to its modern application without restarting

it. Some small parts of the package mini repository (mostly only the package full name and path) are

replicated into different registry keys as cache for a faster access. The cache is often used for common

operations (like understanding if a package exists).

---

## Background tasks and the Broker Infrastructure

UWP applications usually need a way to run part of their code in the background. This code doesn't need to interact with the main foreground process. UWP supports background tasks, which provide functionality to the application even when the main process is suspended or not running. There are multiple reasons why an application may use background tasks: real-time communications, mails, IM, multimedia music, video player, and so on. A background task could be associated by triggers and conditions. A trigger is a global system asynchronous event that, when it happens, signals the starting of a background task. The background task at this point may or may not be started based on its applied conditions. For example, a background task used in an IM application could start only when the user logs on (a system event trigger) and only if the Internet connection is available (a condition).

In Windows 10, there are two types of background tasks:

- ■ In-process background task The application code and its background task run in the same
process. From a developer's point of view, this kind of background task is easier to implement, but
it has the big drawback that if a bug hits its code, the entire application crashes. The in-process
background task doesn't support all triggers available for the out-of-process background tasks.
■ Out-of-process background task The application code and its background task run in dif-
ferent processes (the process could run in a different job object, too). This type of background
task is more resilient, runs in the backgroundtaskhost.exe host process, and can use all the trig-
gers and the conditions. If a bug hits the background task, this will never kill the entire applica-
tion. The main drawback is originated from the performance of all the RPC code that needs to
be executed for the interprocess communication between different processes.
To provide the best user experience for the user, all background tasks have an execution time limit of 30 seconds total. After 25 seconds, the Background Broker Infrastructure service calls the task's Cancellation handler (in WinRT, this is called OnCanceled event). When this event happens, the background task still has 5 seconds to completely clean up and exit. Otherwise, the process that contains the Background Task code (which could be BackgroundTaskHost.exe in case of out-of-process tasks; otherwise, it's the application process) is terminated. Developers of personal or business UWP applications can remove this limit, but such an application could not be published in the official Microsoft Store.

The Background Broker Infrastructure (BI) is the central component that manages all the Background tasks. The component is implemented mainly in bisrv.dll (the server side), which lives in the Broker Infrastructure service. Two types of clients can use the services provided by the Background Broker Infrastructure: Standard Win32 applications and services can import the bi.dll Background Broker Infrastructure client library; WinRT applications always link to biwint.dll, the library that provides WinRT APIs to modern applications. The Background Broker Infrastructure could not exist without the brokers. The brokers are the components that generate the events that are consumed by the Background Broker Server. There are multiple kinds of brokers. The most important are the following:

- System Event Broker   Provides triggers for system events like network connections' state

changes, user logon and logoff, system battery state changes, and so on

Time Broker   Provides repetitive or one-shot timer support
---

- ■ Network Connection Broker Provides a way for the UWP applications to get an event when
a connection is established on certain ports

■ Device Services Broker Provides device arrivals triggers (when a user connects or discon-
nects a device). Works by listening Pnp events originated from the kernel

■ Mobile Broad Band Experience Broker Provides all the critical triggers for phones and SIMs
The server part of a broker is implemented as a windows service. The implementation is different for every broker. Most work by subscribing to WNF states (see the "Windows Notification Facility" section earlier in this chapter for more details) that are published by the Windows kernel; others are built on top of standard Win32 APIs (like the Time Broker). Covering the implementation details of all the brokers is outside the scope of this book. A broker can simply forward events that are generated somewhere else (like in the Windows kernel) or can generate new events based on some other conditions and states. Brokers forward events that they managed through WNF: each broker creates a WNF state name that the background infrastructure subscribes to. In this way, when the broker publishes new state data, the Broker Infrastructure, which is listening, wakes up and forwards the event to its clients.

Each broker includes even the client infrastructure: a WinRT and a Win32 library. The Background Broker Infrastructure and its brokers expose three kinds of APIs to its clients:

- ■ Non-trust APIs  Usually used by WinRT components that run under AppContainer or in
a sandbox environment. Supplementary security checks are made. The callers of this kind
of API can't specify a different package name or operate on behalf of another user (that is,
BiRtCreateEventForApp).

■ Partial-trust APIs  Used by Win32 components that live in a Medium-IL environment. Callers
of this kind of API can specify a Modern application's package full name but can't operate on
behalf of another user (that is, BiPtCreateEventForApp).

■ Full-trust API  Used only by high-privileged system or administrative Win32 services. Callers
of these APIs can operate on behalf of different users and on different packages (that is,
BiCreateEventForPackageName).
Clients of the brokers can decide whether to subscribe directly to an event provided by the

specific broker or subscribe to the Background Broker Infrastructure. WinRT always uses the latter

method. Figure 8-44 shows an example of initialization of a Time trigger for a Modern Application

Background task.

![Figure](figures/Winternals7thPt2_page_288_figure_005.png)

FIGURE 8-44 Architecture of the Time Broker.

CHAPTER 8    System mechanisms      257


---

Another important service that the Background Broker Infrastructure provides to the Brokers and to its clients is the storage capability for background tasks. This means that when the user shuts down and then restarts the system, all the registered background tasks are restored and rescheduled as before the system was restarted. To achieve this properly, when the system boots and the Service Control Manager (for more information about the Service Control Manager, refer to Chapter 10) starts the Broker Infrastructure service, the latter, as a part of its initialization, allocates a root storage GUID, and, using NtLoadKeyEx native API, loads a private copy of the Background Broker registry hive. The service tells NT kernel to load a private copy of the hive using a special flag {REG_APP_HIVE}. The BI hive resides in the C:\Windows\System32\Config\BBI file. The root key of the hive is mounted as \Registry\A\<Root Storage GUID> and is accessible only to the Broker Infrastructure service's process (svcshost.exe, in this case; Broker Infrastructure runs in a shared service host). The Broker Infrastructure hive contains a list of events and work items, which are ordered and identified using GUIDs.

- ■ An event represents a Background task's trigger It is associated with a broker ID (which

represents the broker that provides the event type), the package full name, and the user of the

UWP application that it is associated with, and some other parameters.

■ A work item represents a scheduled Background task It contains a name, a list of condi-

tions, the task entry point, and the associated trigger event GUID.
The BI service enumerates each subkey and then restores all the triggers and background tasks. It

clears orphaned events (the ones that are not associated with any work items). It then finally publishes

a WNF ready state name. In this way, all the brokers can wake up and finish their initialization.

The Background Broker Infrastructure is deeply used by UWP applications. Even regular Win32 applications and services can make use of BI and brokers, through their Win32 client libraries. Some notable examples are provided by the Task Scheduler service, Background Intelligent Transfer service, Windows Push Notification service, and AppReadiness.

## Packaged applications setup and startup

Packaged application lifetime is different than standard Win32 applications. In the Win32 world, the setup procedure for an application can vary from just copying and pasting an executable file to executing complex installation programs. Even if launching an application is just a matter of running an executable file, the Windows loader takes care of all the work. The setup of a Modern application is instead a well-defined procedure that passes mainly through the Windows Store. In Developer mode, an administrator is even able to install a Modern application from an external .Appx file. The package file needs to be digitally signed, though. This package registration procedure is complex and involves multiple components.

Before digging into package registration, it's important to understand another key concept that belongs to Modern applications: package activation. Package activation is the process of launching a Modern application, which can or cannot show a GUI to the user. This process is different based on the type of Modern application and involves various system components.

---

## Package activation

A user is not able to launch a UWP application by just executing its .exe file (excluding the case of the

new AppExecution aliases, created just for this reason. We describe AppExecution aliases later in this

chapter). To correctly activate a Modern application, the user needs to click a tile in the modern menu,

use a special link file that Explorer is able to parse, or use some other activation points (double-click

an application's document, invoke a special URL, and so on). The ShellExperienceHost process decides

which activation performs based on the application type.

## UWP applications

The main component that manages this kind of activation is the Activation Manager, which is implemented in ActivationManager.dll and runs in a sihost.exe service because it needs to interact with the user's desktop. The activation manager strictly cooperates with the View Manager. The modern menu calls into the Activation Manager through RPC. The latter starts the activation procedure, which is schematized in Figure 8-45:

- • Gets the SID of the user that is requiring the activation, the package family ID, and PRAID of the
package. In this way, it can verify that the package is actually registered in the system (using the
Dependency Mini Repository and its registry cache).

• If the previous check yields that the package needs to be registered, it calls into the AppX
Deployment client and starts the package registration. A package might need to be registered
in case of "on-demand registration," meaning that the application is downloaded but not
completely installed (this saves time, especially in enterprise environments) or in case the ap-
plication needs to be updated. The Activation Manager knows if one of the two cases happens
thanks to the State Repository.

• It registers the application with HAM and creates the HAM host for the new package and its
initial activity.

• Activation Manager talks with the View Manager (through RPC), with the goal of initializing the
GUI activation of the new session (even in case of background activations, the View Manager
always needs to be informed).

• The activation continues in the DicomLaunch service because the Activation Manager at this
stage uses a WinRT class to launch the low-level process creation.

• The DicomLaunch service is responsible in launching COM, DCOM, and WinRT servers in re-
sponse to object activation requests and is implemented in the rpcss.dll library. DicomLaunch
captures the activation request and prepares to call the CreateProcessAsUser Win32 API. Before
doing this, it needs to set the proper process attributes (like the package full name), ensure
that the user has the proper license for launching the application, duplicate the user token, set
the low integrity level to the new one, and stamp it with the needed security attributes. (Note
that the DicomLaunch service runs under a System account, which has TCB privilege. This kind
of token manipulation requires TCB privilege. See Chapter 7 of Part 1 for further details.) At this
point, DicomLaunch calls CreateProcessAsUser, passing the package full name through one of
the process attributes. This creates a suspended process.
CHAPTER 8 System mechanisms 259


---

- ■ The rest of the activation process continues in KernelBase.dll. The token produced by
DcomLaunch is still not an AppContainer but contains the UWP Security attributes. A Special
code in the CreateProcessInternal function uses the registry cache of the Dependency Mini
Repository to gather the following information about the packaged application: Root Folder,
Package State, AppContainer package SID, and list of application's capabilities. It then verifies
that the license has not been tampered with (a feature used extensively by games). At this point,
the Dependency Mini Repository file is mapped into the parent process, and the UWP applica-
tion DLL alternate load path is resolved.

■ The AppContainer token, its object namespace, and symbolic links are created with the
BasepCreateLowBox function, which performs the majority of the work in user mode, except for
the actual AppContainer token creation, which is performed using the NtCreateLowBoxToken
kernel function. We have already covered AppContainer tokens in Chapter 7 of Part 1.

■ The kernel process object is created as usual by using NtCreateUserProcess kernel API.

■ After the CSRSS subsystem has been informed, the BasepPostSuccessAppXExtension function
maps the Dependency Mini Repository in the PEB of the child process and unmaps it from the
parent process. The new process can then be finally started by resuming its main thread.
![Figure](figures/Winternals7thPt2_page_291_figure_001.png)

FIGURE 8-45 Scheme of the activation of a modern UWP application.

260      CHAPTER 8 System mechanisms


---

## Centennial applications

The Centennial applications activation process is similar to the UWP activation but is implemented in a totally different way. The modern menu, ShellExperienceHost, always calls into Explorer.exe for this kind of activation. Multiple libraries are involved in the Centennial activation type and mapped in Explorer, like Daxexec.dll, Twinui.dll, and Windows.Storage.dll. When Explorer receives the activation request, it gets the package full name and application id, and, through RPC, grabs the main application executable path and the package properties from the State Repository. It then executes the same steps (2 through 4) as for UWP activations. The main difference is that, instead of using the Dcom1aunch service, Centennial activation, at this stage, it launches the process using the ShellExecute API of the Shell32 library. ShellExecute code has been updated to recognize Centennial applications and to use a special activation procedure located in Windows.Storage.dll (through COM). The latter library uses RPC to call the RAILaunchProcessWithIdentity function located in the AppInfo service. AppInfo uses the State Repository to verify the license of the application, the integrity of all its files, and the calling process's token. It then stamps the token with the needed security attributes and finally creates the process in a suspended state. AppInfo passes the package full name to the CreateProcessAsUser API using the PROC_THREAD_ATTRIBUTE_PACKAGE_FULL_NAME process attribute.

Unlike the UWP activation, no AppContainer is created at all. Apply calls the PostCreateProcess

DesktopAppXAutomation function of DaxExcel.dll, with the goal of initializing the virtualization layer of Centennial applications (registry and file system). Refer to the "Centennial application" section earlier in this chapter for further information.

EXPERIMENT: Activate Modern apps through the command line

In this experiment, you will understand better the differences between UWP and Centennial, and you will discover the motivation behind the choice to activate Centennial applications using the ShellExecute API. For this experiment, you need to install at least one Centennial application. At the time of this writing, a simple method to recognize this kind of application exists by using the Windows Store. In the store, after selecting the target application, scroll down to the “Additional Information” section. If you see “This app can: Uses all system resources,” which is usually located before the “Supported languages” part, it means that the application is Centennial type.

In this experiment, you will use Notepad++, Search and install the ("unofficial) Notepad++" application from the Windows Store. Then open the Camera application and Notepad++. Open an administrative command prompt (you can do this by typing cmd in the Cortana search box and selecting Run As Administrator after right-clicking the Command Prompt label). You need to find the full path of the two running packaged applications using the following commands:

```bash
wmic process where "name='WindowsCamera.exe'" get ExecutablePath
wmic process where "name='notepad++\.exe'" get ExecutablePath
```

---

Now you can create two links to the application's executables using the commands:

```bash
#include "USERPROFILES/Desktop/notepad.exe"  <<"Notepad++ executable Full Path>>
#include "USERPROFILES/Desktop/camera.exe"  <<"windowCamera executable full path>>
```

replacing the content between the < and > symbols with the real executable path discovered by the first two commands.

You can now close the command prompt and the two applications. You should have created two new links in your desktop. Unlike with the Notepad.exe link, if you try to launch the Camera application from your desktop, the activation fails, and Windows returns an error dialog box like the following:

![Figure](figures/Winternals7thPt2_page_293_figure_004.png)

This happens because Windows Explorer uses the Shell32 library to activate executable links.


In the case of UWP, the Shell32 library has no idea that the executable it will launch is a UWP

application, so it calls the CreateProcessAsUser API without specifying any package identity.

In a different way, Shell32 can identify Centennial apps; thus, in this case, the entire activation

process is executed, and the application correctly launched. If you try to launch the two links

using the command prompt, none of them will correctly start the application. This is explained

by the fact that the command prompt doesn't make use of Shell32 at all. Instead, it invokes the

CreateProcess API directly from its own code. This demonstrates the different activations of each

type of packaged application.

![Figure](figures/Winternals7thPt2_page_293_figure_006.png)

Note Starting with Windows 10 Creators Update (RS2), the Modern Application Model supports the concept of Optional packages (internally called RelatedSet). Optional packages are heavily used in games, where the main game supports even DLC (or expansions), and in packages that represent suites: Microsoft Office is a good example. A user can download and install Word and implicitly the framework package that contains all the Office common code. When the user wants to install even Excel, the deployment operation could skip the download of the main Framework package because Word is an optional package of its main Office framework.

Optional packages have relationship with their main packages through their manifest files. In the manifest file, there is the declaration of the dependency to the main package (using AMUID). Deeply describing Optional packages architecture is beyond the scope of this book.

---

---

When the user launches an AppExecutionAlias executable, the CreateProcess API is used as usual.


The NtCreateUserProcess system call, used to orchestrate the kernel-mode process creation (see the

"Flow of CreateProcess" section of Chapter 3 in Part 1, for details) fails because the content of the file is

empty. The file system, as part of normal process creation, opens the target file (through IoCreateFileEx

API), encounters the reparse point data (while parsing the last node of the path) and returns a STATUS_

REPARSE code to the caller. NtCreateUserProcess translates this code to the STATUS_IO_REPARSE_TAG_

NOT_HANDLED error and exits. The CreateProcess API now knows that the process creation has failed

due to an invalid reparse point, so it loads and calls into the ApiSetHost.AppExecutionAlias.dll library,

which contains code that parses modern applications' reparse points.

The library's code parses the reparse point, grabs the packaged application activation data, and

calls into the AppInfo service with the goal of correctly stamping the token with the needed security at tributes. AppInfo verifies that the user has the correct license for running the packaged application and

checks the integrity of its files (through the State Repository). The actual process creation is done by the

calling process. The CreateProcess API detects the reparse error and restarts its execution starting with

the correct package executable path (usually located in C:\Program Files\WindowsApps\). This time, it

correctly creates the process and the AppContainer token or, in case of Centennial, initializes the virtu alization layer (actually, in this case, another RPC into AppInfo is used again). Furthermore, it creates the

HAM host and its activity, which are needed for the application. The activation at this point is complete.

## EXPERIMENT: Reading the AppExecution alias data

In this experiment, you extract AppExecution alias data from the 0-bytes executable file. You can use the FSReparser utility (found in this book's downloadable resources) to parse both the reparse points or the extended attributes of the NTFS file system. Just run the tool in a command prompt window and specify the READ command-line parameter:

```bash
C:\Users\Andrea\AppData\Local\Microsoft\WindowsApps>fstrparser read MicrosoftEdge.exe
File System Reparse Point / Extended Attributes Parser 0.1
Copyright 2018 by Andrea Allievi (AaLl86)
Reading UWP attributes...
Source file: MicrosoftEdge.exe.
The source file does not contain any Extended Attributes.
The file contains a valid UWP Reparse point (version 3).
Package family name: Microsoft.MicrosoftEdge_8wekyb1d3bbwe
Application User Model ID: Microsoft.MicrosoftEdge_8wekyb1d3bbwe!MicrosoftEdge
UWP App Target full path: C:\Windows\System32\SystemUWPLauncher.exe
Alias Type: UWP Simple Instance
```

As you can see from the output of the tool, the CreateProcess API can extract all the information that it needs to properly execute a modern application's activation. This explains why you can launch Edge from the command line.

---

## Package registration

When a user wants to install a modern application, usually she opens the AppStore, looks for the application, and clicks the Get button. This action starts the download of an archive that contains a bunch of files: the package manifest file, the application digital signature, and the block map, which represent the chain of trust of the certificates included in the digital signature. The archive is initially stored in the C:\Windows\SoftwareDistribution\Download folder. The AppStore process (WinStore.App.exe) communicates with the Windows Update service (wuaweng.dll), which manages the download requests.

The downloaded files are manifests that contain the list of all the modern application's files, the application dependencies, the license data, and the steps needed to correctly register the package. The Windows Update service recognizes that the download request is for a modern application, verifies the calling process token (which should be an AppContainer), and, using services provided by the AppXDeploymentClient.dll library, verifies that the package is not already installed in the system. It then creates an AppX Deployment request and, through RPC, sends it to the AppX Deployment Server. The latter runs as a PPL service in a shared service host process (which hosts even the Client License Service, running as the same protected level). The Deployment Request is placed into a queue, which is managed asynchronously. When the AppX Deployment Server sees the request, it dequeues it and spawns a thread that starts the actual modern application deployment process.

![Figure](figures/Winternals7thPt2_page_296_figure_003.png)

Note Starting with Windows 8.1, the UWP deployment stack supports the concept of bundles. Bundles are packages that contain multiple resources, like different languages or features that have been designed only for certain regions. The deployment stack implements an applicability logic that can download only the needed part of the compressed bundle after checking the user profile and system settings.

A modern application deployment process involves a complex sequence of events. We summarize here the entire deployment process in three main phases.

### Phase 1: Package staging

After Windows Update has downloaded the application manifest, the AppX Deployment Server verifies that all the package dependencies are satisfied, checks the application prerequisites, like the target supported device family (Phone, Desktop, Xbox, and so on) and checks whether the file system of the target volume is supported. All the prerequisites that the application needs are expressed in the manifest file with each dependency. If all the checks pass, the staging procedure creates the package root directory (usually in C:\Program Files\WindowsApps\<PackageFullName>) and its subfolders. Furthermore, it protects the package folders, applying proper ACLs on all of them. If the modern application is a Centennial type, it loads the daxexec.dll library and creates VFS reparse points needed by the Windows Container Isolation miniwalker (see the "Centennial applications" section earlier in this chapter) with the goal of virtualizing the application data folder properly. It finally saves the package root path into the HKLM\SOFTWARE\Classes\LocalSettings\Software\Microsoft\Windows\ CurrentVersion\AppData\PackageRepository\Packages\<PackageFullName> registry key, in the Path registry value.

---

The staging procedure then preallocates the application's files on disk, calculates the final download size, and extracts the server URL that contains all the package files (compressed in an AppX file). It finally downloads the final AppX from the remote servers, again using the Windows Update service.

### Phase 2: User data staging

This phase is executed only if the user is updating the application. This phase simply restores the user data of the previous package and stores them in the new application path.

### Phase 3: Package registration

The most important phase of the deployment is the package registration. This complex phase uses services provided by AppXDeploymentExtensions onecore.dll library (and AppXDeploymentExtensions .desktop.dll for desktop-specific deployment parts). We refer to it as Package Core Installation. At this stage, the AppX Deployment Server needs mainly to update the State Repository. It creates new entries for the package, for the one or more applications that compose the package, the new tiles, package capabilities, application license, and so on. To do this, the AppX Deployment server uses database transactions, which it finally commits only if no previous errors occurred (otherwise, they will be discarded). When all the database transactions that compose a State Repository deployment operation are committed, the State Repository can call the registered listeners, with the goal of notifying each client that has requested a notification. (See the "State Repository" section in this chapter for more information about the change and event tracking feature of the State Repository.)

The last steps for the package registration include creating the Dependency Mini Repository file and

updating the machine registry to reflect the new data stored in the State Repository. This terminates

the deployment process. The new application is now ready to be activated and run.

![Figure](figures/Winternals7thPt2_page_297_figure_006.png)

Note For readability reasons, the deployment process has been significantly simplified. For example, in the described staging phase, we have omitted some initial subphases, like the Indexing phase, which parses the AppX manifest file; the Dependency Manager phase, used to create a work plan and analyze the package dependencies; and the Package In Use phase, which has the goal of communicating with PLM to verify that the package is not already installed and in use.

Furthermore, if an operation fails, the deployment stack must be able to revert all the changes. The other revert phases have not been described in the previous section.

## Conclusion

In this chapter, we have examined the key base system mechanisms on which the Windows executive is built. In the next chapter, we introduce the virtualization technologies that Windows supports with the goal of improving the overall system security, providing a fast execution environment for virtual machines, isolated containers, and secure enclaves.

266      CHAPTER 8   System mechanisms

---

