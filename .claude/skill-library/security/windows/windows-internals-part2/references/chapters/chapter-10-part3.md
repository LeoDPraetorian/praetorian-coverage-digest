## Windows Management Instrumentation

Windows Management Instrumentation (WMI) is an implementation of Web-Based Enterprise

Management (WBEM), a standard that the Distributed Management Task Force (DMTF—an indus try consortium) defines. The WBEM standard encompasses the design of an extensible enterprise

486 CHAPTER 10 Management, diagnostics, and tracing


---

data-collection and data-management facility that has the flexibility and extensibility required to manage local and remote systems that comprise arbitrary components.

## WMI architecture

WMI consists of four main components, as shown in Figure 10-27: management applications, WMI infrastructure, providers, and managed objects. Management applications are Windows applications that access and display or process data about managed objects. A simple example of a management application is a performance tool replacement that relies on WMI rather than the Performance API to obtain performance information. A more complex example is an enterprise-management tool that lets administrators perform automated inventories of the software and hardware configuration of every computer in their enterprise.

![Figure](figures/Winternals7thPt2_page_518_figure_003.png)

FIGURE 10-27 WMI architecture.

Developers typically must target management applications to collect data from and manage specific objects. An object might represent one component, such as a network adapter device, or a collection of components, such as a computer. (The computer object might contain the network adapter object.) Providers need to define and export the representation of the objects that management applications are interested in. For example, the vendor of a network adapter might want to add adapterspecific properties to the network adapter WMI support that Windows includes, querying and setting the adapter's state and behavior as the management applications direct. In some cases (for example, for device drivers), Microsoft supplies a provider that has its own API to help developers leverage the provider's implementation for their own managed objects with minimal coding effort.

CHAPTER 10    Management, diagnostics, and tracing     487


---

The WMI infrastructure, the heart of which is the Common Information Model (CIM) Object Manager (CIMOM), is the glue that binds management applications and providers. (CIM is described later in this chapter.) The infrastructure also serves as the object-class store and, in many cases, as the storage manager for persistent object properties. WMI implements the store, or repository, as an on-disk database named the CIMOM Object Repository. As part of its infrastructure, WMI supports several APIs through which management applications access object data and providers supply data and class definitions.

Windows programs and scripts (such as Windows PowerShell) use the WMI COM API, the primary management API, to directly interact with WMI. Other APIs layer on top of the COM API and include an Open Database Connectivity (ODBC) adapter for the Microsoft Access database application. A database developer uses the WMI ODBC adapter to embed references to object data in the developer's database. Then the developer can easily generate reports with database queries that contain WMI-based data. WMI ActiveX controls support another layered API. Web developers use the ActiveX controls to construct web-based interfaces to WMI data. Another management API is the WMI scripting API, for use in script-based applications (like Visual Basic Scripting Edition). WMI scripting support exists for all Microsoft programming language technologies.

Because WMI COM interfaces are for management applications, they constitute the primary API for providers. However, unlike management applications, which are COM clients, providers are COM or Distributed COM (DCOM) servers (that is, the providers implement COM objects that WMI interacts with). Possible embodiments of a WMI provider include DLLs that load into a WMI's manager process or stand-alone Windows applications or Windows services. Microsoft includes a number of built-in providers that present data from well-known sources, such as the Performance API, the registry, the Event Manager, Active Directory, SNMP, and modern device drivers. The WMI SDK lets developers develop third-party WMI providers.

## WMI providers

At the core of WBMF is the DMTF-defined CIM specification. The CIM specifies how management

systems represent, from a systems management perspective, anything from a computer to an applica tion or device on a Computer. Provider developers use the CIM to represent the components that make

up the parts of an application for which the developers want to enable management. Developers use

the Managed Object Format (MOF) language to implement a CIM representation.

In addition to defining classes that represent objects, a provider must interface WMI to the objects. WMI classifies providers according to the interface features the providers supply. Table 10-14 lists WMI provider classifications. Note that a provider can implement one or more features; therefore, a provider can be, for example, both a class and an event provider. To clarify the feature definitions in Table 10-14, let's look at a provider that implements several of those features. The Event Log provider supports several objects, including an Event Log Computer, an Event Log Record, and an Event Log File. The Event Log is an instance provider because it can define multiple instances for several of its classes. One class for which the Event Log provider defines multiple instances is the Event Log File class (Win32NTEventLogFile); the Event Log provider defines an instance of this class for each of the system's event logs (that is, System Event Log, Application Event Log, and Security Event Log).

---

TABLE 10-14 Provider classifications

<table><tr><td>Classification</td><td>Description</td></tr><tr><td>Class</td><td>Can supply, modify, delete, and enumerate a provider-specific class. It can also support query processing. Active Directory is a rare example of a service that is a class provider.</td></tr><tr><td>Instance</td><td>Can supply, modify, delete, and enumerate instances of system and provider-specific classes. An instance represents a managed object. It can also support query processing.</td></tr><tr><td>Property</td><td>Can supply and modify individual object property values.</td></tr><tr><td>Method</td><td>Supplies methods for a provider-specific class.</td></tr><tr><td>Event</td><td>Generates event notifications.</td></tr><tr><td>Event consumer</td><td>Maps a physical consumer to a logical consumer to support event notification.</td></tr></table>


The Event Log provider defines the instance data and lets management applications enumerate the records. To let management applications use WMI to back up and restore the Event Log files, the Event Log provider implements backup and restore methods for Event Log File objects. Doing so makes the Event Log provider a Method provider. Finally, a management application can register to receive notification whenever a new record writes to one of the Event Logs. Thus, the Event Log provider serves as an Event provider when it uses WMI event notification to tell WMI that Event Log records have arrived.

## The Common Information Model and the Managed Object Format Language

The CIM follows in the steps of object-oriented languages such as C++ and C#, in which a modeler designs representations as classes. Working with classes lets developers use the powerful modeling techniques of inheritance and composition. Subclasses can inherit the attributes of a parent class, and they can add their own characteristics and override the characteristics they inherit from the parent class. A class that inherits properties from another class derives from that class. Classes also compose a developer can build a class that includes other classes. CIM classes consist of properties and methods. Properties describe the configuration and state of a WMI-managed resource, and methods are executable functions that perform actions on the WMI-managed resource.

The DMTF provides multiple classes as part of the WBEM standard. These classes are CIM's basic

language and represent objects that apply to all areas of management. The classes are part of the

CIM core model. An example of a core class is CIM_ManagedSystemElement . This class contains a

few basic properties that identify physical components such as hardware devices and logical compo nents such as processes and files. The properties include a caption, description, installation date, and

status. Thus, the CIM_LogicalElement and CIM_PhysicalElement classes inherit the attributes of the

CIM_ManagedSystemElement class. These two classes are also part of the CIM core model. The WBEM

standard calls these classes abstract classes because they exist solely as classes that other classes inherit

(that is, no object instances of an abstract class exist). You can therefore think of abstract classes as tem plates that define properties for use in other classes.

A second category of classes represents objects that are specific to management areas but independent of a particular implementation. These classes constitute the common model and are considered an extension of the core model. An example of a common-model class is the CIM_FileSystem class,

CHAPTER 10    Management, diagnostics, and tracing      489


---

which inherits the attributes of CIM_LogicalElement. Because virtually every operating system—including Windows, Linux, and other varieties of UNIX—rely on file system–based structured storage, the

CIM_FileSystem class is an appropriate constituent of the common model.

The final class category, the extended model, comprises technology-specific additions to the

common model. Windows defines a large set of these classes to represent objects specific to the

Windows environment. Because all operating systems store data in files, the CIM model includes the

CIM_LogicalFile class. The CIM_DataFile class inherits the CIM_LogicalFile class, and Windows adds the

Win32_PageFile and Win32_ShortCutFile file classes for those Windows file types.

Windows includes different WMI management applications that allow an administrator to interact with WMI namespaces and classes. The WMI command-line utility (WMIc.exe) and Windows PowerShell are able to connect to WMI, execute queries, and invoke WMI class object methods. Figure 10-28 shows a PowerShell window extracting information of the Win32_NTEventlogFile class, part of the Event Log provider. This class makes extensive use of inheritance and derives from CIM_ DataFile. Event Log files are data files that have additional Event Log—specific attributes such as a log file name (LogFileName) and a count of the number of records that the file contains (NumberOfRecords). The Win32_NTEventlogFile is based on several levels of inheritance, in which CIM_DataFile derives from CIM_LogicalFile, which derives from CIM_LogicalElement, and CIM_LogicalElement derives from CIM_ManagedSystemElement.

![Figure](figures/Winternals7thPt2_page_521_figure_003.png)

FIGURE 10-28 Windows PowerShell extracting information from the Win32_NTEventlogFile class.

---

As stated earlier, WMI provider developers write their classes in the MOF language. The following output shows the definition of the Event Log provider's Win32_NTEventLogFile, which has been queried in Figure 10-28:

```bash
{dynamic: ToInstance, provider("MS_NT_EVENTLOG_PROVIDER"): ToInstance, SupportsUpdate,
  Locale(1033): ToInstance, UUID([8502C75B-5FBB-11D2-AAC1-006008C78BC]): ToInstance}
class Win32_NTEventLogFile : CIM_DataFile
  {Fixed: ToSubClass, read: ToSubClass} string LogFileName;
  {read: ToSubClass, write: ToSubClass} uint32 MaxFileSize;
  {read: ToSubClass} uint32 NumberOfRecords;
  {read: ToSubClass, volatile: ToSubClass, ValueMap("0", "1..365", "4294967295"):
  ToSubClass} string OverwritePolicy;
  {read: ToSubClass, write: ToSubClass, Range("0-365 | 4294967295"): ToSubClass}
  uint32 OverwriteOutdated;
  {read: ToSubClass, write: ToSubClass, source:
    [ValueMap("0", "8", "21", ".."): ToSubClass, implemented, Privileges{
    "SeSecurityPrivilege", "SeBackupPrivilege"): ToSubClass]
    uint32 ClearEventlog(in) string ArchiveFileName;
    [ValueMap("0", "8", "21", "183", ".."): ToSubClass, implemented, Privileges{
    "SeSecurityPrivilege", "SeBackupPrivilege"): ToSubClass]
    uint32 BackupEventlog(in) string ArchiveFileName;
  };
```

One term worth reviewing is dynamic, which is a descriptive designator for the Win32_NTEventLogFile class that the MOF file in the preceding output shows. Dynamic means that the WMI infrastructure asks the WMI provider for the values of properties associated with an object of that class whenever a management application queries the object's properties. A static class is one in the WMI repository; the WMI infrastructure refers to the repository to obtain the values instead of asking a provider for the values. Because updating the repository is a relatively expensive operation, dynamic providers are more efficient for objects that have properties that change frequently.

## EXPERIMENT: Viewing the MOF definitions of WMI classes

You can view the MOF definition for any WMI class by using the Windows Management

Instrumentation Tester tool (WbemTest) that comes with Windows. In this experiment, we

look at the MOF definition for the Win32_NTEventLogFile class:

- 1. Type Wbemtest in the Cortana search box and press Enter. The Windows Management

Instrumentation T
ester should open.

2. Click the Connect button, change the Namespace to root\cmv2, and connect. The tool

should enable all the command buttons, as shown in the following figure:
---

![Figure](figures/Winternals7thPt2_page_523_figure_000.png)

- 3. Click the Enum Classes button, select the Recursive option button, and then click OK.

4. Find Win32_NTEventLogFile in the list of classes, and then double-click it to see its class

properties.

5. Click the Show MOF button to open a window that displays the MOF text.
After constructing classes in MOF, WMI developers can supply the class definitions to WMI in several ways. WDM driver developers compile a MOF file into a binary MOF (BMF) file—a more compact binary representation than an MOF file—and can choose to dynamically give the BMF files to the WDM infrastructure or to statically include it in their binary. Another way is for the provider to compile the MOF and use WMI COM APIs to give the definitions to the WMI infrastructure. Finally, a provider can use the MOF Compiler (Mocomp.exe) tool to give the WMI infrastructure a classes-compiled representation directly.

![Figure](figures/Winternals7thPt2_page_523_figure_003.png)

Note Previous editions of Windows (until Windows 7) provided a graphical tool, called WMI CIM Studio, shipped with the WMI Administrative Tool. The tool was able to graphically show WMI namespaces, classes, properties, and methods. Nowadays, the tool is not supported or available for download because it was superseded by the WMI capacities of Windows PowerShell. PowerShell is a scripting language that does not run with a GUI. Some third-party tools present a similar interface of CIM Studio. One of them is WMI Explorer, which is downloadable from https://github.com/vinaypammani/wmie2/releases.

---

The Common Information Model (CIM) repository is stored in the %SystemRoot%\System32\wbrem.

Repository paths and includes the following:

- ■ Index.btr
Binary-tree (btree) index file

■ MappingX.map Transaction control files (X is a number starting from 1)

■ Objects.data CIM repository where managed resource definitions are stored
### The WMI namespace

Classes define objects, which are provided by a WMI provider. Objects are class instances on a system. WMI uses a namespace that contains several subnamespaces that WMI arranges hierarchically to organize objects. A management application must connect to a namespace before the application can access objects within the namespace.

WMI names the namespace root directory ROOT. All WMI installations have four predefined

namespaces that reside beneath root: CIMV2, Default, Security, and WMI. Some of these namespaces

have other namespaces within them. For example, CIMV2 includes the Applications and ms_409

namespaces as subnamespaces. Providers sometimes define their own namespaces; you can see the

WMI namespace (which the Windows device driver WMI provider defines) beneath ROOT in Windows.

Unlike a file system namespace, which comprises a hierarchy of directories and files, a WMI namespace is only one level deep. Instead of using names as a file system does, WMI uses object properties that it defines as keys to identify the objects. Management applications specify class names with key names to locate specific objects within a namespace. Thus, each instance of a class must be uniquely identifiable by its key values. For example, the Event Log provider uses the Win32_NTLogEvent class to represent records in an Event Log. This class has two keys: LogFile, a string; and RecordNumber, an unsigned integer. A management application that queries WMI for instances of Event Log records obtains them from the provider key pairs that identify records. The application refers to a record using the syntax that you see in this sample object path name:

```bash
\\ANDREA-LAPTO!root\!CIMV2:Win32_NTLogEvent.Logfiles="Application",
                                             RecordNumber="1"
```

The first component in the name \\ANDREA-LAPTOP\ identifies the computer on which the object is located, and the second component (\root\CIMV2) is the namespace in which the object resides. The class name follows the colon, and key names and their associated values follow the period. A comma separates the key values.

WMI provides interfaces that let applications enumerate all the objects in a particular class or to

make queries that return instances of a class that match a query criterion.

## Class association

Many object types are related to one another in some way. For example, a computer object has a

processor, software, an operating system, active processes, and so on. WMI lets providers construct an

association class to represent a logical connection between two different classes. Association classes

CHAPTER 10    Management, diagnostics, and tracing     493


---

associate one class with another, so the classes have only two properties: a class name and the Ref modifier. The following output shows an association in which the Event Log provider's MOF file associates the Win32_NTLogEvent class with the Win32_ComputerSystem class. Given an object, a management application can query associated objects. In this way, a provider defines a hierarchy of objects.

```bash
[dynamic: ToInstance, provider{"MS_NT_EVENTLOG_PROVIDER": ToInstance, EnumPrivileges{"SeSe
curityPrivilege":} ToSubClass, Privileges{"SeSecurityPrivilege":} ToSubClass, Locale{1033};
ToInstance, UUID("{8502C57F-5FBB-11D2-AAC1-006008C78BC7}):" ToInstance, Association:
DisableOverride ToInstanceToSubClass]
class Win32_NTLogEventComputer
    {  key, read: ToSubClass] Win32_ComputerSystem ref Computer;
        {key, read: ToSubClass] Win32_NTLogEvent ref Record;
    };
```

Figure 10-29 shows a PowerShell window displaying the first Win32_NTLogEventComputer class

instance located in the CIMV2 namespace. From the aggregated class instance, a user can query the as sociated Win32_ComputerSystem object instance WIN-46E4EFBB6Q, which generated the event with

record number 1031 in the Application log file.

![Figure](figures/Winternals7thPt2_page_525_figure_003.png)

FIGURE 10-29 The Win32_NTLogEventComputer association class.

---

## EXPERIMENT: Using WMII scripts to manage systems

A powerful aspect of WMI is its support for scripting languages. Microsoft has generated hundreds of scripts that perform common administrative tasks for managing user accounts, files, the registry, processes, and hardware devices. The Microsoft TechNet Scripting Center website serves as the central location for Microsoft scripts. Using a script from the scripting center is as easy as copying its text from your Internet browser, storing it in a file with a vbs extension, and running it with the command cscript .vbs, where script is the name you gave the script. Script is the command-line interface to Windows Script Host (WSH).

Here's a sample TechNet script that registers to receive events when Win32_Process object

instances are created, which occur whenever a process starts and prints a line with the name of

the process that the object represents:

```bash
strComputer = "."
Set objWMService = GetObject("winmgms:")
    & {"ImpersonationLevel=impersonate\| " & strComputer & "\root\cim2"}
Set colMonitoredProcesses = objWMService.
    ExecNotificationQuery("SELECT * FROM __InstanceCreationEvent__ -
        & " WITHIN 1 WHERE TargetInstance ISA 'Win32_Process'")
i = 0
Do While i = 0
    Set objLatestProcess = colMonitoredProcesses.NextEvent
    Wscript.Echo objLatestProcess.TargetInstance.Name
Loop
```

The line that invokes ExecNotificationQuery does so with a parameter that includes a select statement, which highlights WMI's support for a read-only subset of the ANSI standard Structured Query Language (SQL), known as WQL, to provide a flexible way for WMI consumers to specify the information they want to extract from WMI providers. Running the sample script with Cscript and then starting Notepad results in the following output:

```bash
C:\cscript monproc.vbs
Microsoft (R) Windows Script Host Version 5.812
Copyright (C) Microsoft Corporation. All rights reserved.
NOTEPAD.EXE
```

PowerShell supports the same functionality through the Register-WmiEvent and Get-Event commands:

```bash
PS C:\> Register-WmiEvent -Query "SELECT * FROM ..._InstanceCreationEvent WITHIN 1 WHERE
TargetInstance ISA "Win32_Process" -SourceIdentifier "TestWmiRegistration"
PS C:\> (Get-Event)[0].SourceEventArgs.NewEvent.TargetInstance | Select-Object -Property
ProcessId, ExecutablePath
ProcessId ExecutablePath
        76016 C:\WINDOWS\system32\notepad.exe
PS C:\> Unregister-Event -SourceIdentifier "TestWmiRegistration"
```

---

## WMI implementation

The WMI service runs in a shared Svchost process that executes in the local system account. It loads providers into the WmiPrvSE.exe provider-hosting process, which launches as a child of the DCOM Launcher (RPC service) process. WMI executes Wmiprvse in the local system, local service, or network service account, depending on the value of the HostingModel property of the WMI Win32Provider object instance that represents the provider implementation. A Wmiprvse process exits after the provider is removed from the cache, one minute following the last provider request it receives.

### EXPERIMENT: Viewing Wmiprvse creation

You can see WmiPrvSE being created by running Process Explorer and executing Wmic. A WmiPrvSE process will appear beneath the Svchost process that hosts the DCOM Launcher service. If Process Explorer job highlighting is enabled, it will appear with the job highlight color because, to prevent a runaway provider from consuming all virtual memory resources on a system, Wmiprvse executes in a job object that limits the number of child processes it can create and the amount of virtual memory each process and all the processes of the job can allocate. (See Chapter 5 for more information on job objects.)

![Figure](figures/Winternals7thPt2_page_527_figure_004.png)

Most WMI components reside by default in %SystemRoot%\System32 and %SystemRoot%\System32.

Wbem, including Windows MOF files, built-in provider DLLs, and management application WMI DLLs.

Look in the %SystemRoot%\System32\Wbem directory, and you'll find Ntvc1.mf, the Event Log provider

MOF file. You'll also find Ntvc1.dll, the Event Log provider's DLL, which the WMI service uses.

---

Providers are generally implemented as dynamic link libraries (DLLs) exposing COM servers that implement a specified set of interfaces (IWebmServices is the central one. Generally, a single provider is implemented as a single COM server). WMI includes many built-in providers for the Windows family of operating systems. The built-in providers, also known as standard providers, supply data and management functions from well-known operating system sources such as the Win32 subsystem, event logs, performance counters, and registry. Table 10-15 lists several of the standard WMI providers included with Windows.

TABLE 10-15 Standard WMI providers included with Windows

<table><tr><td>Provider</td><td>Binary</td><td>Namespace</td><td>Description</td></tr><tr><td>Active Directory provider</td><td>dsprov.dll</td><td>root\directory\ldap</td><td>Maps Active Directory objects to WMI</td></tr><tr><td>Event Log provider</td><td>ntevt.dll</td><td>root\cimv2</td><td>Manages Windows event logs—for example, read, backup, clear, copy, delete, monitor, rename, compress, uncompress, and change event log settings</td></tr><tr><td>Performance Counter provider</td><td>wbemperf.dll</td><td>root\cimv2</td><td>Provides access to raw performance data</td></tr><tr><td>Registry provider</td><td>stdprov.dll</td><td>root\default</td><td>Reads, writes, enumerates, monitors, creates, and deletes registry keys and values</td></tr><tr><td>Virtualization provider</td><td>vmmsprox.dll</td><td>root\virtualization\w2</td><td>Provides access to virtualization services implemented in vmms.exe, like managing virtual machines in the host system and retrieving information of the host system peripherals from a guest VM</td></tr><tr><td>WDM provider</td><td>wmiprov.dll</td><td>root\wmi</td><td>Provides access to information on WDM device drivers</td></tr><tr><td>Win32 provider</td><td>cimwin32.dll</td><td>root\cimv2</td><td>Provides information about the computer, disks, peripheral devices, files, folders, file systems, networking components, operating system, printers, processes, security, services, shares, SAM users and groups, and more</td></tr><tr><td>Windows Installer provider</td><td>msiprov.dll</td><td>root\cimv2</td><td>Provides access to information about installed software</td></tr></table>


Ntevt.dll, the Event Log provider DLL, is a COM server, registered in the HLKM\Software\Classes\ CLSID registry key with the {55C5B4C-517D-1d11-A857-0C0C4FD9159E} CLSID. (You can find it in the MOF descriptor). Directories beneath %SystemRoot%\System32\Wbem store the repository, log files, and third-party MOF files. WMI implements the repository—named the CIMOM object repository— using a proprietary version of the Microsoft JET database engine. The database file, by default, resides in SystemRoot%\System32\Wbem\Repository\.

WMI honors numerous registry settings that the service's HKLM\SOFTWARE\MicrosoftWBM\ CIMOM registry key stores, such as thresholds and maximum values for certain parameters.

Device drivers use special interfaces to provide data to and accept commands—called the WMI System Control commands—from WMI. These interfaces are part of the WDM, which is explained in Chapter 6 of Part 1. Because the interfaces are cross-platform, they fall under the \rootWMI namespace.

---

## WMI security

WMI implements security at the namespace level. If a management application successfully connects to a namespace, the application can view and access the properties of all the objects in that namespace. An administrator can use the WMI Control application to control which users can access a namespace. Internally, this security model is implemented by using ACLs and Security Descriptors, part of the standard Windows security model that implements Access Checks. (See Chapter 7 of Part 1 for more information on access checks.)

To start the WMI Control application, open the Control Panel by typing Computer Management in the Cortana search box. Next, open the Services And Applications node. Right-click WMI Control and select Properties to launch the WMI Control Properties dialog box, as shown in Figure 10-30. To configure security for namespaces, click the Security tab, select the namespace, and click Security. The other tabs in the WMI Control Properties dialog box let you modify the performance and backup settings that the registry stores.

![Figure](figures/Winternals7thPt2_page_529_figure_003.png)

FIGURE 10-30 The WMI Control Properties application and the Security tab of the root\virtualization\v2 namespace.

---

Event Tracing for Windows (ETW)

Event Tracing for Windows (ETW) is the main facility that provides to applications and kernel-mode drivers the ability to consume, consume, and manage log and trace events. The events can be stored in a log file or in a circular buffer, or they can be consumed in real time. They can be used for debugging a driver, a framework like the .NET CLR, or an application and to understand whether there could be potential performance issues. The ETW facility is mainly implemented in the NT kernel, but an application can also use private loggers, which do not transition to kernel-mode at all. An application that uses ETW can be one of the following categories:

■ Controller A controller starts and stops event tracing sessions, manages the size of the buffer pools, and enables providers so they can log events to the session. Example controllers include Reliability and Performance Monitor and XPerf from the Windows Performance Toolkit (now part of the Windows Assessment and Deployment Kit, available from https://docs. microsoft.com/en-us/windowshardware/get-started/sdk/install/).

■ Provider A provider is an application or a driver that contains event tracing instrumentation. A provider registers with ETW a provider GUID (globally unique identifiers), which defines the events it can produce. After the registration, the provider can generate events, which can be enabled or disabled by the controller application through an associated trace session.

■ Consumer A consumer is an application that selects one or more trace sessions for which it wants to read trace data. Consumers can receive events stored in log files, in a circular buffer, or from sessions that deliver events in real time.

It's important to mention that in ETW, every provider, session, trait, and provider's group is represented by a GUID (more information about these concepts are provided later in this chapter). Four different technologies used for providing events are built on the top of ETW. They differ mainly in the method in which they store and define events (there are other distinctions though):

■ MOF (or classic) providers are the legacy ones, used especially by WMI. MOF providers store the events descriptor in MOF classes so that the consumer knows how to consume them.

■ WPP (Windows software trace processor) providers are used for tracing the operations of an application or driver (they are an extension of WMI event tracing) and use a TMF (trace message format) file for allowing the consumer to decode trace events.

■ Manifest-based providers use an XML manifest file to define events that can be decoded by the consumer.

■ TraceLogging providers, which, like WPP providers, are used for fast tracing the operation of an application or driver, use self-describing events that contain all the required information for the consumption by the controller.

CHAPTER 10   Management, diagnostics, and tracing    499


---

When first installed, Windows already includes dozens of providers, which are used by each component of the OS for logging diagnostics events and performance traces. For example, Hyper-V has multiple providers, which provide tracing events for the Hypervisor, Dynamic Memory, Vid driver, and Virtualization stack. As shown in Figure 10-31, ETW is implemented in different components:

- Most of the ETW implementation (global session creation, provider registration and enable-
ment, main logger thread) resides in the NT kernel.

The Host for SCM/SDDL/LSA Lookup APIs library (sechost.dll) provides to applications the main
user-mode APIs used for creating an ETW session, enabling providers and consuming events.
Sechost uses services provided by Ntidll to invoke ETW in the NT kernel. Some ETW user-mode
APIs are implemented directly in Ntidll without exposing the functionality to Sechost. Provider
registration and events generation are examples of user-mode functionalities that are imple-
mented in Ntidll (and not in Sechost).

The Event Trace Decode Helper Library (TDH.dll) implements services available for consumers
to decode ETW events.

The Eventing Consumption and Configuration library (WevtApi.dll) implements the Windows
Event Log APIs (also known as Evt APIs), which are available to consumer applications for man-
aging providers and events on local and remote machines. Windows Event Log APIs support
XPath 1.0 or structured XML queries for parsing events produced by an ETW session.

The Secure Kernel implements basic secure services able to interact with ETW in the NT kernel
that lives in VTL 0. This allows trustlets and the Secure Kernel to use ETW for logging their own
secure events.
![Figure](figures/Winternals7thPt2_page_531_figure_002.png)

FIGURE 10-31 ETW architecture.

---

ETW initialization

The ETW initialization starts early in the NT kernel startup (for more details on the NT kernel initialization, see Chapter 12). It is orchestrated by the internal EwinsInitialize to properly allocate and initialize the per-silo ETW-specific data structure that stores the array of logger contexts representing global ETW sessions (see the “ETW session” section later in this chapter for more details). The maximum number of global sessions is queried from the HKLM\System\CurrentControlSet\ControlWMI\ETwMaxLogging resistive value, which should be between 32 and 256. (64 is the default number in case the registry value does not exist).

Later, in the NT kernel startup, the IoInItSystemPreDrivers routine of phase 1 continues with the initialization of ETW, which performs the following steps:

1. Acquires the system startup time and reference system time and calculates the QPC frequency.

2. Initializes the ETW security key and reads the default session and provider's security descriptor.

3. Initializes the per-processor global tracing structures located in the PCRB.

4. Creates the real-time ETW consumer object type (called EtwConsumer), which is used to allow a user-mode real-time consumer process to connect to the main ETW logger thread and the ETW registration (internally called EtwRegistration) object type, which allow a provider to be registered from a user-mode application.

5. Registers the ETW bugcheck callback, used to dump logger sessions data in the bugcheck dump.

6. Initializes the Global Logger and Autologgers sessions based on the AutoLogger and GlobalLogger registry keys located under the HKLM\System\CurrentControlSet\ControlWMI root key.

7. Uses the EtwRegister kernel API to register various NT kernel event providers, like the Kernel Event Tracing, General Events provider, Process, Disk, File Name, IO, and Memory providers, and so on.

8. Publishes the ETW initialized WNF state name to indicate that the ETW subsystem is initialized.

9. Writes the SystemStart event to both the Global Trace logging and General Events providers. The event, which is shown in Figure 10-32, logs the approximate OS Start time.

10. If required, loads the FileInfo driver, which provides supplemental information on files I/O to Superfetch (more information on the Proactive memory management is available in Chapter 5 of Part 1).

CHAPTER 10    Management, diagnostics, and tracing      501


---

![Figure](figures/Winternals7thPt2_page_533_figure_000.png)

FIGURE 10-32 The SystemStart ETW event displayed by the Event Viewer.

In early boot phases, the Windows registry and I/O subsystems are still not completely initialized. So ETW can't directly write to the log files. Late in the boot process, after the Session Manager (SMSX.exe) has correctly initialized the software hive, the last phase of ETW initialization takes place. The purpose of this phase is just to inform each already-registered global ETW session that the file system is ready, so that they can flush out all the events that are recorded in the ETW buffers to the log file.

## ETW sessions

One of the most important entities of ETW is the Session (internally called logger instance), which is a glue between providers and consumers. An event tracing session records events from one or more providers that a controller has enabled. A session usually contains all the information that describes which events should be recorded by which providers and how the events should be processed. For example, a session might be configured to accept all events from the Microsoft-Windows-Hyper-V-Hypervisor provider (which is internally identified using the {52f68f8-995e-434c-a91e-199986449890} GUID). The user can also configure filters. Each event generated by a provider (or a provider group) can be filtered based on event level (information, warning, error, or critical), event keyword, event ID, and other characteristics. The session configuration can also define various other details for the session, such as what time source should be used for the event timestamps (for example, QPC, TSC, or system time), which events should have stack traces captured, and so on. The session has the important rule to host the ETW logger thread, which is the main entity that flushes the events to the log file or delivers them to the real-time consumer.


CHAPTER 10 Management, diagnostics, and tracing


---

Sessions are created using the StartTrace API and configured using ControlTrace and EnableTraceEx2.

Command-line tools such as xperf, logman, tracerlog, and weventful use these APIs to start or control

trace sessions. A session also can be configured to be private to the process that creates it. In this case,

ETW is used for consuming events created only by the same application that also acts as provider. The

application thus eliminates the overhead associated with the kernel-mode transition. Private ETW ses sions can record only events for the threads of the process in which it is executing and cannot be used

with real-time delivery. The internal architecture of private ETW is not described in this book.

When a global session is created, the StartTrace API validates the parameters and copies them in a data structure, which the NTtraceControl API uses to invoke the internal function EtwpStartLogger in the kernel. An ETW session is represented internally through an ETW_LOGGER_CONTEXT data structure, which contains the important pointers to the session memory buffers, where the events are written to. As discussed in the “ETW initialization” section, a system can support a limited number of ETW sessions, which are stored in an array located in a global per-SILO data structure. EtwpStartLogger checks the global sessions array, determining whether there is free space or if a session with the same name already exists. If that is the case, it exits and signals an error. Otherwise, it generates a session GUID (if not already specified by the caller), allocates and initializes an ETW_LOGGER_CONTEXT data structure representing the session, assigns to it an index, and inserts it in the per-silo array.

ETW queries the session's security descriptor located in the HLKM\System(ImportantControlSet\ Control\WmiSecurity registry key. As shown in Figure 10-33, each registry value in the key is named as the session GUID (the registry key, however, also contains the provider's GUID) and contains the binary representation of a self-relative security descriptor. If a security descriptor for the session does not exist, a default one is returned for the session (see the "Witnessing the default security descriptor of ETW sessions" experiment later in this chapter for details).

![Figure](figures/Winternals7thPt2_page_534_figure_003.png)

FIGURE 10-33 The ETW security registry key.

CHAPTER 10    Management, diagnostics, and tracing     503


---

The EwpStartLogger function performs an access check on the session's security descriptor, requesting the TRACELOG_GUID_ENABLE access right (and the TRACELOG_CREATE_REALTIME or TRACELOG_ CREATE_ONDISK depending on the log file mode) using the current process's access token. If the check succeeds, the routine calculates the default size and numbers of event buffers, which are calculated based on the size of the system physical memory (the default buffer size is 8, 16, or 64KB). The number of buffers depends on the number of system processors and on the presence of the EVENT_TRACE _NO_PER_PROCESSOR_BUFFERING logger mode flag, which prevents events (which can be generated from different processors) to be written to a per-processor buffer.

ETW acquires the session's initial reference time stamp. Three clock resolutions are currently supported: Query performance counter (QPC, a high-resolution time stamp not affected by the system clock), System time, and CPU cycle counter. The EtwpAllocateTraceBuffer function is used to allocate each buffer associated with the logger session (the number of buffers was calculated before or specified as input from the user). A buffer can be allocated from the paged pool, nonpaged pool, or directly from physical large pages, depending on the logging mode. Each buffer is stored in multiple internal per-session lists, which are able to provide fast lookup both to the ETW main logger thread and ETW providers. Finally, if the log mode is not set to a circular buffer, the EtwpStartLogger function starts the main ETW logger thread, which has the goal of flushing events written by the providers associated with the session to the log file or to the real-time consumer. After the main thread is started, ETW sends a session notification to the registered session notification provider (GUID 2a6e185b-90de-4fc5-826c-9f44e608a427), a special provider that allows its consumers to be informed when certain ETW events happen (like a new session being created or destroyed, a new log file being created, or a log error being raised).

## EXPERIMENT: Enumerating ETW sessions

In Windows 10, there are multiple ways to enumerate active ETW sessions. In this and all the next experiments regarding ETW, you will use the XPERF tool, which is part of the Windows Performance Toolkit distributed in the Windows Assessment and Deployment Kit (ADK), which is freely downloadable from https://docs.microsoft.com/en-us/windows-hardware/get-started/ adk-install.

Enumerating active ETW sessions can be done in multiple ways. XPERF can do it while

executed with the following command (usually XPERF is installed in C:\Program Files

(x86\Windows Kits\10\Windows Performance Toolkit):

```bash
xperf -Loggers
```

The output of the command can be huge, so it is strongly advised to redirect the output in

a TXT file:

```bash
xperf -Loggers > ETW_Sessions.txt
```

---

The tool can decode and show in a human-readable form all the session configuration data.


An example is given from the EventLog-Application session, which is used by the Event logger


service (Wevtsvc.dll) to write events in the Application.evtx file shown by the Event Viewer:

```bash
Logger Name        : EventLog-Application
Logger Id            : 9
Logger Thread Id      : 0000000000000008C
Buffer Size          : 64
Maximum Buffers      : 64
Minimum Buffers       : 2
Number of Buffers      : 2
Free Buffers          : 2
Buffers Written       : 252
Events Lost          : 0
Log Buffers Lost      : 0
Real Time Buffers Lost: 0
Flush Timer           : 1
Age Limit             : 0
Real Time Mode         : Enabled
Log File Mode         : Secure PersistOnHybridShutdown PagedMemory IndependentSession
NoPerProcessorBuffering
Maximum File Size    : 100
Log Filename        : 100
Trace Flags         : "Microsoft-Windows-CertificateServicesClient-Lifecycle-User":0x800
000000000000000:0xff+&"Microsoft-Windows-SenseIR":0x8000000000000000:0xff+
... (output cut for space reasons)
```

The tool is also able to decode the name of each provider enabled in the session and the

bitmask of event categories that the provider should write to the sessions. The interpretation of

the bitmask (shown under "Trace Flags") depends on the provider. For example, a provider can

define that the category 1 (bit 0 set) indicates the set of events generated during initialization

and cleanup, category 2 (bit 1 set) indicates the set of events generated when registry I/O is per formed, and so on. The trace flags are interpreted differently for System sessions (see the "System

loggers" section for more details.) In that case, the flags are decoded from the enabled kernel

flags that specify which kind of kernel events the system session should log.

The Windows Performance Monitor, in addition to dealing with system performance counters, can easily enumerate the ETW sessions. Open Performance Monitor (by typing perfmon in the Cortana search box), expand the Data Collector Sets, and click Event Trace Sessions. The application should list the same sessions listed by XPERF. If you right-click a session's name and select Properties, you should be able to navigate between the session's configurations. In particular, the Security property sheet decodes the security descriptor of the ETW session.

CHAPTER 10    Management, diagnostics, and tracing     505


---

![Figure](figures/Winternals7thPt2_page_537_figure_000.png)

Finally, you also can use the Microsoft Logman console tool (%SystemRoot%\System32\ logman.exe) to enumerate active ETS sessions (by using the -ets-command-line argument).

## ETW providers

As stated in the previous sections, a provider is a component that produces events (while the application that includes the provider contains event tracing instrumentation). ETW supports different kinds of providers, which all share a similar programming model. (They are mainly different in the way in which they encode events.) A provider must be initially registered with ETW before it can generate any event. In a similar way, a controller application should enable the provider and associate it with an ETW session to be able to receive events from the provider. If no session has enabled a provider, the provider will not generate any event. The provider defines its interpretation of being enabled or disabled. Generally, an enabled provider generates events, and a disabled provider does not.

### Providers registration

Each provider's type has its own API that needs to be called by a provider application (or driver) for reg istering a provider. For example, manifest-based providers rely on the EventRegister API for user-mode

registrations, and EtwRegister for kernel-mode registrations. All the provider types end up calling the

internal EtwpRegisterProvider function, which performs the actual registration process (and is imple mented in both the NT kernel and NTDLL). The latter allocates and initializes an ETW_GUID_ENTRY data

structure, which represents the provider (the same data structure is used for notifications and traits).

The data structure contains important information, like the provider GUID, security descriptor, refer ence counter, enablement information (for each ETW session that enables the provider), and a list of

provider's registrations.

---

For user-mode provider registrations, the NT kernel performs an access check on the calling process's token, requesting the TRACELOG_REGISTER_GUIDS access right. If the check succeeds, or if the registration request originated from kernel code, ETW inserts the new ETW_GUID_ENTRY data structure in a hash table located in the global ETW per-silo data structure, using a hash of the provider's GUID as the table's key (this allows fast lookup of all the providers registered in the system.) In case an entry with the same GUID already exists in the hash table, ETW uses the existing entry instead of the new one. A GUID could already exist in the hash table mainly for two reasons:

- ■ Another driver or application has enabled the provider before it has been actually registered
(see the "Providers enablement" section later in this chapter for more details) .
■ The provider has been already registered once. Multiple registration of the same provider GUID
are supported.
After the provider has been successfully added into the global list, ETW creates and initializes an ETW registration object, which represents a single registration. The object encapsulates an ETW_REG_ ENTRY data structure, which ties the provider to the process and session that requested its registration. (ETW also supports registration from different sessions). The object is inserted in a list located in the ETW_GUID_ENTRY (the EtwRegistration object type has been previously created and registered with the NT object manager at ETW initialization time). Figure 10-34 shows the two data structures and their relationships. In the figure, two providers' processes (process A, living in session 4, and process B, living in session 16) have registered for provider 1. Thus two ETW_REG_ENTRY data structures have been created and linked to the ETW_GUID_ENTRY representing provider 1.

![Figure](figures/Winternals7thPt2_page_538_figure_003.png)

FIGURE 10-34 The ETW_GUID_ENTRY data structure and the ETW_REG_ENTRY.

At this stage, the provider is registered and ready to be enabled in the session(s) that requested it (through the EnableTrace API). In case the provider has been already enabled in at least one session before its registration, ETW enables it (see the next section for details) and calls the Enablement callback, which can be specified by the caller of the EventRegister (or EtwRegister) API that started the registration process.

CHAPTER 10    Management, diagnostics, and tracing     507


---

## EXPERIMENT: Enumerating ETW providers

As for ETV sessions, XPERF can enumerate the list of all the current registered providers (the WEEVTUTIL tool, installed with Windows, can do the same). Open an administrative command prompt window and move to the Windows Performance Toolkit path. To enumerate the registered providers, use the -providers command option. The option supports different flags. For this experiment, you will be interested in the I and R flags, which tell XPERF to enumerate the installed or registered providers. As we will discuss in the "Decoding events" section later in this chapter, the difference is that a provider can be registered (by specifying a GUID) but not installed in the HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\WINEVT\Publishers registry key. This will prevent any consumer from decoding the event using TDH routines. The following commands

```bash
cd /d "C:\Program Files (x66)\Windows Kits\10\Windows Performance Toolkit"
xperf -providers R > registered_providers.txt
xperf -providers I > installed_providers.txt
```

produce two text files with similar information. If you open the registered_providers.txt file, you will find a mix of names and GUIDs. Names identify providers that are also installed in the Publisher registry key, whereas GUID represents providers that have just been registered through the EventRegister API discussed in this section. All the names are present also in the installed_ providers.txt file with their respective GUIDs, but you won't find any GUID listed in the first text file in the installed providers list.

XPERF also supports the enumeration of all the kernel flags and groups supported by system

loggers (discussed in the "System loggers" section later in this chapter) through the K flag (which

is a superset of the KF and KG flags).

## Provider Enablement

As introduced in the previous section, a provider should be associated with an ETW session to be able to generate events. This association is called Provider Enablement, and it can happen in two ways: before or after the provider is registered. A controller application can enable a provider on a session through the EnableTraceEx API. The API allows you to specify a bitmask of keywords that determine the category of events that the session wants to receive. In the same way, the API supports advanced filters on other kinds of data, like the process IDs that generate the events, package ID, executable name, and so on. (You can find more information at https://docs.microsoft.com/en-us/windows/win32/dpl/ evntprov/ns-evntprov-event_filter_descriptor.)

Provider Enablement is managed by ETW in kernel mode through the internal EtwpEnableGuid function. For user-mode requests, the function performs an access check on both the session and provider security descriptors, requesting the TRACELOG_GUID_ENABLE access right on behalf of the calling process's token. If the logger session includes the SECURITY_TRACE flag, EtwpEnableGuid requires that the calling process is a PPL (see the "ETW security" section later in this chapter for more details). If the check succeeds, the function performs a similar task to the one discussed previously for provider registrations:


CHAPTER 10 Management, diagnostics, and tracing




---

- ■ It allocates and initializes an ETW_GUID_ENTRY data structure to represent the provider or use
the one already linked in the global ETW-per-silo data structure in case the provider has been
already registered.
■ Links the provider to the logger session by adding the relative session enablement information
in the ETW_GUID_ENTRY.
In case the provider has not been previously registered, no ETW registration object exists that's linked in the ETW_GUID_ENTRY data structure, so the procedure terminates. (The provider will be enabled after it is first registered.) Otherwise, the provider is enabled.

While legacy MOF providers and WPP providers can be enabled only to one session at time, Manifest-based and Tracelocking providers can be enabled on a maximum of eight sessions. As previously shown in Figure 10-32, the ETW_GUID_ENTRY data structure contains enablement information for each possible ETW session that enabled the provider (eight maximum). Based on the enabled sessions, the EtwpEnableGuid function calculates a new session enablement mask, storing it in the ETW_ REG_ENTRY data structure (representing the provider registration). The mask is very important because it's the key for event generations. When an application or driver writes an event to the provider, a check is made: if a bit in the enablement mask equals 1, it means that the event should be written to the buffer maintained by a particular ETW session; otherwise, the session is skipped and the event is not written to its buffer.

Note that for secure sessions, a supplemental access check is performed before updating the session enablement mask in the provider registration. The ETW session's security descriptor should allow the TRACELOG_LOG_EVENT access right to the calling process's access token. Otherwise, the relative bit in the enablement mask is not set to 1. The target ETW session will not receive any event from the provider registration.) More information on secure sessions is available in the "Secure loggers and ETW security" section later in this chapter.

## Providing events

After registering one or more ETW providers, a provider application can start to generate events. Note that events can be generated even though a controller application hasn't had the chance to enable the provider in an ETW session. The way in which an application or driver can generate events depends on the type of the provider. For example, applications that write events to manifest-based providers usually directly create an event descriptor (which respects the XML manifest) and use the EventWrite API to write the event to the ETW sessions that have the provider enabled. Applications that manage MOF and WPP providers rely on the TraceEvent API instead.

Events generated by manifest-based providers, as discussed previously in the "ETW session" section, can be filtered by multiple means. ETW locates the ETW_GUID_ENTRY data structure from the provider registration object, which is provided by the application through a handle. The internal

etwpEventWriteFull function uses the provider's registration session enablement mask to cycle between all the enabled ETW sessions associated with the provider (represented by an ETW_LOGGER_CONTEXT). For each session, it checks whether the event satisfies all the filters. If so, it calculates the full size of the event's payload and checks whether there is enough free space in the session's current buffer.

CHAPTER 10    Management, diagnostics, and tracing     509


---

If there is no available space, ETW checks whether there is another free buffer in the session: free buffers are stored in a FIFO (first-in, first-out) queue. If there is a free buffer, ETW marks the old buffer as "dirty" and switches to the new free one. In this way, the Logger thread can wake up and flush the entire buffer to a log file or deliver it to a real-time consumer. If the session's log mode is a circular logger, no logger thread is ever created: ETW simply loads the old full buffer at the end of the free buffers queue (as a result the queue will never be empty). Otherwise, if there isn't a free buffer in the queue, ETW tries to allocate an additional buffer before returning an error to the caller.

After enough space in a buffer is found, EtwgEventWriteFull atomically writes the entire event

payload in the buffer and exits. Note that in case the session enablement mask is 0, it means that no

sessions are associated with the provider. As a result, the event is lost and not logged anywhere.

MOF and WPP events go through a similar procedure but support only a single ETW session and generally support fewer filters. For these kinds of providers, a supplemental check is performed on the associated session: If the controller application has marked the session as secure, nobody can write any events. In this case, an error is yielded back to the caller (secure sessions are discussed later in the "Secure loggers and ETW security" section).

## EXPERIMENT: Listing processes activity using ETW

In this experiment, we will use ETV to monitor system's processes activity. Windows 10 has two providers that can monitor this information: Microsoft-Windows-Kernel-Process and the NT kernel logger through the PROC_THREAD kernel flags. You will use the former, which is a classic provider and already has all the information for decoding its events. You can capture the trace with multiple tools. You still use XPERF (Windows Performance Monitor can be used, too).

Open a command prompt window and type the following commands:

```bash
cd /c:\Program Files (x86)\Windows Kits\10\windows.Performance Toolkit
xpref --startTestSession --on Microsoft-Windows-Kernel-Process -f c:\process_trace.exe}
```

The command starts an ETW session called TestSession (you can replace the name) that will

consume events generated by the Kernel-Process provider and store them in the C:\process_

trace.et log file (you can also replace the file name).

To verify that the session has actually started, repeat the steps described previously in the

"Enumerating ETW sessions" experiment. (The TestSession trace session should be listed by both XPERF and the Windows Performance Monitor.) Now, you should start some new processes or applications (like Notepad or Paint, for example).

To stop the ETW session, use the following command:

```bash
xperf -stop TestSession
```

The steps used for decoding the ETL file are described later in the "Decoding an ETL file" experiment. Windows includes providers for almost all its components. The Microsoft-WindowsMSPaint provider, for example, generates events based on Paint's functionality. You can try this experiment by capturing events from the MsPaint provider.

---

## ETW Logger thread

The Logger thread is one of the most important entities in ETW. Its main purpose is to flush events to the log file or deliver them to the real-time consumer, keeping track of the number of delivered and lost events. A logger thread is started every time an ETW session is initially created, but only in case the session does not use the circular log mode. Its execution logic is simple. After it's started, it links itself to the ETW_LOGGER_CONTEXT data structure representing the associated ETW session and waits on two main synchronization objects. The Flush event is signaled by ETW every time a buffer belonging to a session becomes full (which can happen after a new event has been generated by a provider—for example, as discussed in the previous section, "Providing events"), when a new real-time consumer has requested to be connected, or when a logger session is going to be stopped. The TimeOut timer is initialized to a valid value (usually 1 second) only in case the session is a real-time one or in case the user has explicitly required it when calling the StartTrace API for creating the new session.

When one of the two synchronization objects is signaled, the logger thread rearms them and checks whether the file system is ready. If not, the main logger thread returns to sleep again (no sessions should be flushed in early boot stages). Otherwise, it starts to flush each buffer belonging to the session to the log file or the real-time consumer.

For real-time sessions, the logger thread first creates a temporary per-session ETL file in the %\SystemRoot\%\System32\.\LogFiles\WM\.\RTBackup folder (as shown in Figure 10-35.) The log file name is generated by adding the EtwRT prefix to the name of the real-time session. The file is used for saving temporary events before they are delivered to a real-time consumer (the log file can also store lost events that have not been delivered to the consumer in the proper time frame). When started, real-time autologgers restore lost events from the log file with the goal of delivering them to their consumer.

![Figure](figures/Winternals7thPt2_page_542_figure_004.png)

FIGURE 10-35 Real-time temporary ETL log files.

CHAPTER 10   Management, diagnostics, and tracing     511


---

The logger thread is the only entity able to establish a connection between a real-time consumer

and the session. The first time that a consumer calls the ProcessTrace API for receiving events from a

real-time session, ETW sets up a new RealTimeConsumer object and uses it with the goal of creating a

link between the consumer and the real-time session. The object, which resolves to an ETW_REALTIME_

CONSUMER data structure in the NT kernel, allows events to be "injected" in the consumer's process

address space (another user-mode buffer is provided by the consumer application).

For non-real-time sessions, the logger thread opens (or creates, in case the file does not exist) the initial ETL log file specified by the entity that created the session. The logger thread can also create a brand-new log file in case the session's log mode specifies the EVENT_TRACE_FILE_MODE_NEWFILE flag, and the current log file reaches the maximum size.

At this stage, the ETW logger thread initiates a flush of all the buffers associated with the session

to the current log file (which, as discussed, can be a temporary one for real-time sessions). The flush is

performed by adding an event header to each event in the buffer and by using the NtWriteFile API for

writing the binary content to the ETL log file. For real-time sessions, the next time the logger thread

wakes up, it is able to inject all the events stored in the temporary log file to the target user-mode real time consumer application. Thus, for real-time sessions, ETW events are never delivered synchronously.

## Consuming events

Events consumption in ETW is performed almost entirely in user mode by a consumer application, thanks to the services provided by the Sechost.dll. The consumer application uses the OpenTrace API for opening an ETL log file produced by the main logger thread or for establishing the connection to a real-time logger. The application specifies an event callback function, which is called every time ETW consumes a single event. Furthermore, for real-time sessions, the application can supply an optional buffer-callback function, which receives statistics for each buffer that ETW flushes and is called every time a single buffer is full and has been delivered to the consumer.

The actual event consumption is started by the ProcessTrace API. The APIs work for both standard

and real-time sessions, depending on the log file mode flags passed previously to OpenTrace.

For real-time sessions, the API uses kernel mode services (accessed through the NTTraceControl

system call) to verify that the ETW session is really a real-time one. The NT kernel verifies that the secu rity descriptor of the ETW session grants the TRACELOG_ACCESS_REALTIME access right to the caller

process's token. If it doesn't have access, the API fails and returns an error to the controller applica tion. Otherwise, it allocates a temporary user-mode buffer and a bitmap used for receiving events and

connects to the main logger thread (which creates the associated EtwConsumer object; see the "ETW

logger thread" section earlier in this chapter for details). Once the connection is established, the API

waits for new data arriving from the session's logger thread. When the data comes, the API enumerates

each event and calls the event callback.

For normal non-real-time ETW sessions, the ProcessTrace API performs a similar processing, but instead of connecting to the logger thread, it just opens and parses the ETL log file, reading each buffer one by one and calling the event callback for each found event (events are sorted in chronological order). Differently from real-time loggers, which can be consumed one per time, in this case the API

512 CHAPTER 10 Management, diagnostics, and tracing


---

can work even with multiple trace handles created by the OpenTrace API, which means that it can parse

events from different ETL log files.

Events belonging to ETW sessions that use circular buffers are not processed using the described methodology. (There is indeed no logger thread that dumps any event.) Usually a controller application uses the FlushTrace API when it wants to dump a snapshot of the current buffers belonging to an ETW session configured to use a circular buffer into a log file. The API invokes the NT kernel through the NtTraceControl system call, which locates the ETW session and verifies that its security descriptor grants the TRACELOG_CREATE_ODISK access right to the calling process's access token. If so, and if the controller application has specified a valid log file name, the NT kernel invokes the internal EtwpBufferingModeFlush routine, which creates the new ETL file, adds the proper headers, and writes all the buffers associated with the session. A consumer application can then parse the events written in the new log file by using the OpenTrace and ProcessTrace APIs, as described earlier.

## Events decoding

When the ProcessTrace API identifies a new event in an ETW buffer, it calls the event callback, which is generally located in the consumer application. T o be able to correctly process the event, the consumer application should decode the event payload. The Event Trace Decode Helper Library (TDH.dll) provides services to consumer applications for decoding events. As discussed in the previous sections, a provider application (or driver), should include information that describes how to decode the events generated by its registered providers.

This information is encoded differently based on the provider type. Manifest-based providers, for example, compile the XML descriptor of their events in a binary file and store it in the resource section of their provider application (or driver). As part of provider registration, a setup application should register the provider's binary in the HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\WINEV7\ Publishers registry key. The latter is important for event decoding, especially for the following reasons:

- The system consults the Publishers key when it wants to resolve a provider name to its GUID
(from an ETW point of view, providers do not have a name). This allows tools like Xperf to dis-
play readable provider names instead of their GUIDs.
The Trace Decode Helper Library consults the key to retrieve the provider's binary file, parse its
resource section, and read the binary content of the events descriptor.
After the event descriptor is obtained, the Trace Decode Helper Library gains all the needed information for decoding the event (by parsing the binary descriptor) and allows consumer applications to use the TdhGetEventInformation API to retrieve all the fields that compose the event's payload and the correct interpretation the data associated with them. TDH follows a similar procedure for MOF and WPP providers (while TraceLogging incorporates all the decoding data in the event payload, which follows a standard binary format).

Note that all events are natively stored by ETW in an ETL log file, which has a well-defined uncom pressed binary format and does not contain event decoding information. This means that if an ETL file

is opened by another system that has not acquired the trace, there is a good probability that it will not

be able to decode the events. To overcome these issues, the Event Viewer uses another binary format:

CHAPTER 10    Management, diagnostics, and tracing     513


---

EVTX. This format includes all the events and their decoding information and can be easily parsed by any application. An application can use the EvtExportLog Windows Event Log API to save the events included in an ETL file with their decoding information in an EVTX file.

## EXPERIMENT: Decoding an ETL file

Windows has multiple tools that use the EvtExportLog API to automatically convert an ETL log file

and include all the decoding information. In this experiment, you use netsh.exe, but TraceRpt.exe

also works well:

1. Open a command prompt and move to the folder where the ETL file produced by the

previous experiment ("Listing processes activity using ETW") resides and insert

```bash
netsh trace convert input-process_trace.etl output-process_trace.txt dump=txt
overwrite=yes
```

2. where process_trace.etl is the name of the input log file, and process_trace.

txt file is the name of the output decoded text file.

3. If you open the text file, you will find all the decoded events (one for each line) with a description, like the following:

```bash
[21B0C.1154::2020-05-01 12:04:42.075601200 {Microsoft-Windows-Kernel-Process}
Process 1808 started at time  2020 - 05 - 01:019:00+04.075562702 by parent 6924
running in session 1 with name \Device\HarddiskVolume4\Windows\System32\notepad.
exe.
```

4. From the log, you will find that rarely some events are not decoded completely or do

not contain any description. This is because the provider manifest does not include the

needed information (a good example is given from the ThreadWorkOnBehalfUpdate

event). You can get rid of those events by acquiring a trace that does not include their

keyword. The event keyword is stored in the CSV or EVTX file.

5. Use netsh.exe to produce an EVTX file with the following command:

```bash
netsh trace convert input-process_trace.etl output=process_trace.evtx dump=evtx
overwrite=yes
```

6. Open the Event Viewer. On the console tree located in the left side of the window, right-click the Event Viewer (Local) root node and select Open Saved Logs. Choose the just-created process_trace.evtx file and click Open.

7. In the Open Saved Log window, you should give the log a name and select a folder to display it. (The example accepted the default name, process_trace and the default Saved Logs folder.)

---

8. The Event Viewer should now display each event located in the log file. Click the Date

and Time column for ordering the events by Date and Time in ascending order (from

the oldest one to the newest). Search for ProcessStart with Ctrl+F to find the event indi cating the Notepad.exe process creation:

![Figure](figures/Winternals7thPt2_page_546_figure_001.png)

9. The ThreadWorkOnBehalfUpdate event, which has no human-readable description, causes too much noise, and you should get rid of it from the trace. If you click one of those events and open the Details tab, in the System node, you will find that the event belongs to the WINEVENT_KEYWORD_WORK_ON_BEHALF category, which has a keyword bitmask set to 0x80000000000002000. (Keep in mind that the highest 16 bits of the keywords are reserved for Microsoft-defined categories.) The bitwise NOT operation of the 0x800000000000002000 64-bit value is 0x7FFFFFFFFFFFFDDFF.

10. Close the Event Viewer and capture another trace with XPERF by using the following command:

```bash
xperf --startTestSession --on Microsoft-Windows-Kernel-Process:0x7FFFFFFFFFFFFFFFF
c:\process_trace.etl
```

11. Open Notepad or some other application and stop the trace as explained in the "Listing processes activity using ETW" experiment. Convert the ETL file to an ETVX. This time, the obtained decoded log should be smaller in size, and it does not contain ThreadWorkOn behalfUpdate events.

---

## System loggers

What we have described so far is how normal ETW sessions and providers work. Since Windows XP, ETW has supported the concepts of system loggers, which allow the NT kernel to globally emit log events that are not tied to any provider and are generally used for performance measurements. At the time of this writing, there are two main system loggers available, which are represented by the NT kernel logger and Circular Kernel Context Logger (while the Global logger is a subset of the NT kernel logger). The NT kernel supports a maximum of eight system logger sessions. Every session that receives events from a system logger is considered a system session.

To start a system session, an application makes use of the StartTrace API, but it specifies the EVENT_ TRACE_SYSTEM_LOGGER_MODE flag or the GUID of a system logger session as input parameters. Table 10-16 lists the system logger with their GUIDs. The EtwpStartLogger function in the NT kernel recognizes the flag or the special GUIDs and performs an additional check against the NT kernel logger security descriptor, requesting the TRACELOG_GUID_ENABLE access right on behalf of the caller process access token. If the check passes, ETW calculates a system logger index and updates both the logger group mask and the system global performance group mask.

TABLE 10-16 System loggers

<table><tr><td>INDEX</td><td>Name</td><td>GUID</td><td>Symbol</td></tr><tr><td>0</td><td>NT kernel logger</td><td>{9e814aad-3204-11d2-9a82-006008a86939}</td><td>SystemTraceControlGuid</td></tr><tr><td>1</td><td>Global logger</td><td>{e8908abc-aab4-11d2-9a93-00805f85d7c6}</td><td>GlobalLoggerGuid</td></tr><tr><td>2</td><td>Circular Kernel Context Logger</td><td>{54dea73a-edf-42a4-af71-3e63d056f174}</td><td>CXCLGuid</td></tr></table>


The last step is the key that drives system loggers. Multiple low-level system functions, which can

run at a high IRQL (the Context Swapper is a good example), analyzes the performance group mask

and decides whether to write an event to the system logger. A Controller application can enable or

disable different events logged by a system logger by modifying the EnableFlags bit mask used by the

StartTrace API and ControlTrace API. The events logged by a system logger are stored internally in the

global performance group mask in a well-defined order. The mask is composed of an array of eight 32 bit values. Each index in the array represents a set of events. System event sets (also called Groups) can

be enumerated using the Xperf tool. Table 10-17 lists the system logger events and the classification in

their groups. Most of the system logger events are documented at https://docs.microsoft.com/en-us/

windows/win32/api/entrace/ns-entrace-event_trace_properties.

---

TABLE 10-17 System logger events (kernel flags) and their group

<table><tr><td>Name</td><td>Description</td><td>Group</td></tr><tr><td>ALL_FAULTS</td><td>All page faults including hard, copy-on-write, demand-zero faults, and so on</td><td>None</td></tr><tr><td>ALPC</td><td>Advanced Local Procedure Call</td><td>None</td></tr><tr><td>CACHE_FLUSH</td><td>Cache flush events</td><td>None</td></tr><tr><td>CC</td><td>Cache manager events</td><td>None</td></tr><tr><td>CLOCKINT</td><td>Clock interrupt events</td><td>None</td></tr><tr><td>COMPACT_CSWITCH</td><td>Compact context switch</td><td>Diag</td></tr><tr><td>CONTMMENGEN</td><td>Contiguous memory generation</td><td>None</td></tr><tr><td>CPU_CONFIG</td><td>NUMA topology, processor group, and processor index</td><td>None</td></tr><tr><td>CSWITCH</td><td>Context switch</td><td>IOTrace</td></tr><tr><td>DEBUG_EVENTS</td><td>Debugger scheduling events</td><td>None</td></tr><tr><td>DISK_IO</td><td>Disk I/O</td><td>All except SysProf, ReferenceSet, and Network</td></tr><tr><td>DISK_IO_INIT</td><td>Disk I/O initiation</td><td>None</td></tr><tr><td>DISPATCHER</td><td>CPU scheduler</td><td>None</td></tr><tr><td>DPC</td><td>DPC events</td><td>Diag, DiagEasy, and Latency</td></tr><tr><td>DPC_QUEUE</td><td>DPC queue events</td><td>None</td></tr><tr><td>DRIVERS</td><td>Driver events</td><td>None</td></tr><tr><td>FILE_IO</td><td>File system operation end times and results</td><td>FileIO</td></tr><tr><td>FILE_IO_INIT</td><td>File system operation (create/open/close/read/write)</td><td>FileIO</td></tr><tr><td>FILENAME</td><td>FileName (e.g., FileName create/delete/rundown)</td><td>None</td></tr><tr><td>FLT_FASTIO</td><td>Minifilter fastio callback completion</td><td>None</td></tr><tr><td>FLT_IO</td><td>Minifilter callback completion</td><td>None</td></tr><tr><td>FLT_IO_FAILURE</td><td>Minifilter callback completion with failure</td><td>None</td></tr><tr><td>FLT_IO_INIT</td><td>Minifilter callback initiation</td><td>None</td></tr><tr><td>FOOTPRINT</td><td>Support footprint analysis</td><td>ReferenceSet</td></tr><tr><td>HARD_FAULTS</td><td>Hard page faults</td><td>All except SysProf and Network</td></tr><tr><td>HIBERRUNDOWN</td><td>Rundown(s) during hibernate</td><td>None</td></tr><tr><td>IDLE_STATES</td><td>CPU idle states</td><td>None</td></tr><tr><td>INTERRUPT</td><td>Interrupt events</td><td>Diag, DiagEasy, and Latency</td></tr><tr><td>INTERRUPT_STEER</td><td>Interrupt steering events</td><td>Diag, DiagEasy, and Latency</td></tr><tr><td>IPI</td><td>Inter-processor interrupt events</td><td>None</td></tr><tr><td>KE_CLOCK</td><td>Clock configuration events</td><td>None</td></tr><tr><td>KQUEUE</td><td>Kernel queue enqueue/dequeue</td><td>None</td></tr><tr><td>LOADER</td><td>Kernel and user mode image load/unload events</td><td>Base</td></tr></table>


CHAPTER 10    Management, diagnostics, and tracing     517


---

<table><tr><td>Name</td><td>Description</td><td>Group</td></tr><tr><td>MEMINFO</td><td>Memory list info</td><td>Base, ResidentSet, and ReferenceSet</td></tr><tr><td>MEMINFO_WS</td><td>Working set info</td><td>Base and ReferenceSet</td></tr><tr><td>MEMORY</td><td>Memory tracing</td><td>ResidentSet and ReferenceSet</td></tr><tr><td>NETWORKTRACE</td><td>Network events (e.g., tcp/udp send/receive)</td><td>Network</td></tr><tr><td>OPTICAL_IO</td><td>Optical I/O</td><td>None</td></tr><tr><td>OPTICAL_IO_INIT</td><td>Optical I/O initiation</td><td>None</td></tr><tr><td>PERF_COUNTER</td><td>Process perf counters</td><td>Diag and DiagEasy</td></tr><tr><td>PMC_PROFILE</td><td>PMC sampling events</td><td>None</td></tr><tr><td>POOL</td><td>Pool tracing</td><td>None</td></tr><tr><td>POWER</td><td>Power management events</td><td>ResumeTrace</td></tr><tr><td>PRIORITY</td><td>Priority change events</td><td>None</td></tr><tr><td>PROC_THREAD</td><td>Process and thread create/delete</td><td>Base</td></tr><tr><td>PROFILE</td><td>CPU sample profile</td><td>SysProf</td></tr><tr><td>REFSET</td><td>Support footprint analysis</td><td>ReferenceSet</td></tr><tr><td>REG_HIVE</td><td>Registry hive tracing</td><td>None</td></tr><tr><td>REGISTRY</td><td>Registry tracing</td><td>None</td></tr><tr><td>SESSION</td><td>Session rundown/create/delete events</td><td>ResidentSet and ReferenceSet</td></tr><tr><td>SHOULDYIELD</td><td>Tracing for the cooperative DPC mechanism</td><td>None</td></tr><tr><td>SPINLOCK</td><td>Spinlock collisions</td><td>None</td></tr><tr><td>SPLIT_IO</td><td>Split I/O</td><td>None</td></tr><tr><td>SYSCALL</td><td>System calls</td><td>None</td></tr><tr><td>TIMER</td><td>Timer settings and its expiration</td><td>None</td></tr><tr><td>VAMAP</td><td>MapFile info</td><td>ResidentSet and ReferenceSet</td></tr><tr><td>VIRT_ALLOC</td><td>Virtual allocation reserve and release</td><td>ResidentSet and ReferenceSet</td></tr><tr><td>WDF_DPC</td><td>WDF DPC events</td><td>None</td></tr><tr><td>WDF_INTERRUPT</td><td>WDF interrupt events</td><td>None</td></tr></table>


When the system session starts, events are immediately logged. There is no provider that needs to be enabled. This implies that a consumer application has no way to generically decode the event. System logger events use a precise event encoding format (called NTPERF), which depends on the event type. However, most of the data structures representing different NT kernel logger events are usually documented in the Windows platform SDK.

---

EXPERIMENT: Tracing TCP/IP activity with the kernel logger

In this experiment, you listen to the network activity events generated by the System Logger using the Windows Performance Monitor. As already introduced in the "Enumerating ETW sessions" experiment, the graphical tool is not just able to obtain data from the system performance counters but is also able to start, stop, and manage ETW sessions (system session included). To enable the kernel logger and have it generate a log file of TCPIP/ICP activity, follow these steps:

1. Run the Performance Monitor (by typing perfmon in the Cortana search box) and click Data Collector Sets, User Defined.

2. Right-click User Defined, choose New, and select Data Collector Set.

3. When prompted, enter a name for the data collector set (for example, experiment), and choose Create Manually (Advanced) before clicking Next.

4. In the dialog box that opens, select Create Data Logs; check Event Trace Data, and then click Next. In the Providers area, click Add, and locate Windows Kernel Trace. Click OK. In the Properties list, select Keywords (Any), and then click Edit.

![Figure](figures/Winternals7thPt2_page_550_figure_006.png)

5. From the list shown in the Property window, select Automatic and check only net for

Network TCP/IP, and then click OK.

---

6. Click Next to select a location where the files are saved. By default, this location is %SystemDrive%\PerfLog\%\Admin\experiment\, if this is how you named the data collector set. Click Next, and in the Run As edit box, enter the Administrator account name and set the password to match it. Click Finish. You should now see a window similar to the one shown here:

![Figure](figures/Winternals7thPt2_page_551_figure_001.png)

7. Right-click the name you gave your data collector set (experiment in our example), and

then click Start. Now generate some network activity by opening a browser and visiting

a website.

8. Right-click the data collector set node again and then click Stop.

If you follow the steps listed in the "Decoding an ETL file" experiment to decode the acquired ETL trace file, you will find that the best way to read the results is by using a CSV file type. This is because the System session does not include any decoding information for the events, so the netsh.exe has no regular way to encode the customized data structures representing events in the EVTX file.

Finally, you can repeat the experiment using XPERF with the following command (optionally replacing the C:\network.etl file with your preferred name):

```bash
xperf -on NETWORKTRACE -f c:\network.etl
```

After you stop the system trace session and you convert the obtained trace file, you will get similar events as the ones obtained with the Performance Monitor.

---

## The Global logger and Autologgers

Certain logger sessions start automatically when the system boots. The Global logger session records events that occur early in the operating system boot process, including events generated by the NT kernel logger. (The Global logger is actually a system logger, as shown in Table 10-16.) Applications and device drivers can use the Global logger session to capture traces before the user logs in (some device drivers, such as disk device drivers, are not loaded at the time the Global logger session begins.) While the Global logger is mostly used to capture traces produced by the NT kernel provider (see Table 10-17), Autologgers are designed to capture traces from classic ETW providers (and not from the NT kernel logger).

You can configure the Global logger by setting the proper registry values in the GlobalLogger key, which

is located in the HKLM\SYSTEM\CurrentControlSet\Control-WMI root key. In the same way, Autologgers

can be configured by creating a registry subkey, named as the logging session, in the Autologgers key (lo cated in the WMI root key). The procedure for configuring and starting Autologgers is documented at

https://docs.microsoft.com/en-us/windows/win32/etw/configuring-and-starting-an-Autologger-session.

As introduced in the "ETW initialization" section previously in this chapter, ETW starts the Global logger and Autologgers almost at the same time, during the early phase 1 of the NT kernel initialization. The EtwStartAutoLogger internal function queries all the logger configuration data from the registry, validates it, and creates the logger session using the EtwStartLogger routine, which has already been extensively discussed in the "ETW sessions" section. The Global logger is a system logger, so after the session is created, no further providers are enabled. Unlike the Global logger, Autologgers require providers to be enabled. They are started by enumerating each session's name from the Autologger registry key. After a session is created, ETW enumerates the providers that should be enabled in the session, which are listed as subkeys of the Autologger key (a provider is identified by a GUID). Figure 10-36 shows the multiple providers enabled in the EventLog-System session. This session is one of the main Windows Logs displayed by the Windows Event Viewer (captured by the Event Logger service).

![Figure](figures/Winternals7thPt2_page_552_figure_004.png)

FIGURE 10-36 The EventLog-System Autologger's enabled providers.

After the configuration data of a provider is validated, the provider is enabled in the session through

the internal EtwEnableTrace function, as for classic ETW sessions.

CHAPTER 10    Management, diagnostics, and tracing     521


---

## ETW security

Starting and stopping an ETW session is considered a high-privilege operation because events can include system data that can be used to exploit the system integrity (this is especially true for system loggers). The Windows Security model has been extended to support ETW security. As already introduced in previous sections, each operation performed by ETW requires a well-defined access right that must be granted by a security descriptor protecting the session, provider, or provider's group (depending on the operation). Table 10-18 lists all the new access rights introduced for ETW and their usage.

TABLE 10-18 ETW security access rights and their usage

<table><tr><td>Value</td><td>Description</td><td>Applied to</td></tr><tr><td>WMIGUID_QUERY</td><td>Allows the user to query information about the trace session</td><td>Session</td></tr><tr><td>WMIGUID_NOTIFICATION</td><td>Allows the user to send a notification to the session&#x27;s notification provider</td><td>Session</td></tr><tr><td>TRACELOG_CREATE_REALTIME</td><td>Allows the user to start or update a real-time session</td><td>Session</td></tr><tr><td>TRACELOG_CREATE_ONDISK</td><td>Allows the user to start or update a session that writes events to a log file</td><td>Session</td></tr><tr><td>TRACELOG_GUID_ENABLE</td><td>Allows the user to enable the provider</td><td>Provider</td></tr><tr><td>TRACELOG_LOG_EVENT</td><td>Allows the user to log events to a trace session if the session is running in SECURE mode</td><td>Session</td></tr><tr><td>TRACELOG_ACCESS_REALTIME</td><td>Allows a consumer application to consume events in real time</td><td>Session</td></tr><tr><td>TRACELOG_REGISTER_GUIDS</td><td>Allows the user to register the provider (creating the EtwRegistration object backed by the ETW_REG_ENTRY data structure)</td><td>Provider</td></tr><tr><td>TRACELOG_JOIN_GROUP</td><td>Allows the user to insert a manifest-based or tracelogging provider to a Providers group (part of the ETW traits, which are not described in this book)</td><td>Provider</td></tr></table>


Most of the ETW access rights are automatically granted to the SYSTEM account and to members of the Administrators, Local Service, and Network Service groups. This implies that normal users are not allowed to interact with ETW (unless an explicit session and provider security descriptor allows it). To overcome the problem, Windows includes the Performance Log Users group, which has been designed to allow normal users to interact with ETW (especially for controlling trace sessions). Although all the ETW access rights are granted by the default security descriptor to the Performance Log Users group, Windows supports another group, called Performance Monitor Users, which has been designed only to receive or send notifications to the session notification provider. This is because the group has been designed to access system performance counters, enumerated by tools like Performance Monitor and Resource Monitor, and not to access the full ETW events. The two tools have been already described in the "Performance monitor and resource monitor" section of Chapter 1 in Part 1.

As previously introduced in the “ETW Sessions” section of this chapter, all the ETW security descriptors are stored in the HKLM\System\CurrentControlSet\Control\Wmi\Security registry key in a binary format. In ETW, everything that is represented by a GUID can be protected by a customized security descriptor. To manage ETW security, applications usually do not directly interact with security descriptors stored in the registry but use the EventAccessControl and EventAccessQuery APIs implemented in Sechost.dll.

---

Experiment: Witnessing the default security descriptor of ETW sessions

A kernel debugger can easily show the default security descriptor with ETW sessions that do not have a specific one associated with them. In this experiment, you need a Windows 10 machine with a kernel debugger already attached and connected to a host system. Otherwise, you can use a local kernel debugger, or LiveKd (downloadable from https://docs.microsoft.com/ en-us/sysinternals/downloads/livekd/). After the correct symbols are considered, you should be able to dump the default SD using the following command:

!sd pol(ntlEtpDefaultTraceSecurityDescriptor)

The output should be similar to the cut for space reasons:

->Revision: 0x1
