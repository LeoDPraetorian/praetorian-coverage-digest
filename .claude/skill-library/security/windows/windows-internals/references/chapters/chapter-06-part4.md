## Device-stack driver loading

How does the PnP manager find the correct drivers as part of building the device stack? The registry has this information scattered in three important keys (and their subkeys), shown in Table 6-7. (Note that CCS is short for CurrentControlSet.)

TABLE 6-7 Important registry keys for plug-and-play driver loading

<table><tr><td>Registry Key</td><td>Short Name</td><td>Description</td></tr><tr><td>HKLM\System\CCS\Enum</td><td>Hardware key</td><td>Settings for known hardware devices</td></tr><tr><td>HKLM\System\CCS\Control\Class</td><td>Class key</td><td>Settings for device types</td></tr><tr><td>HKLM\System\CCS\Services</td><td>Software key</td><td>Settings for drivers</td></tr></table>


When a bus driver performs device enumeration and discovers a new device, it first creates a PDO to represent the existence of the physical device that has been detected. Next, it informs the PnP manager by calling IoInvalidDeviceRelations (documented in the WDK) with the BusRelations enumeration value and the PDO, indicating to the PnP manager that a change on its bus has been detected. In response, the PnP manager asks the bus driver (through an IRP) for the device identifier.

The identifiers are bus-specific: for example, a USB device identifier consists of a vendor ID (VID) for the hardware vendor that made the device and a product ID (PID) that the vendor assigned to the device. For a PCI device, a similar vendor ID is required, along with a device ID, to uniquely identify the device within a vendor (plus some optional components; see the WDK for more information on device ID formats). Together, these IDs form what Plug and Play calls a device (ID). The PnP manager also queries the bus driver for an instance ID to help it distinguish different instances of the same hardware. The instance ID can describe either a bus-relative location (for example, the USB port) or a globally unique descriptor (for example, a serial number).

The device ID and instance ID are combined to form a device instance ID (DIID), which the PnP manager uses to locate the device's key under the Hardware key shown in Table 6-7. The subkeys under that key have the form <Enumerator>\<Device ID\<Instance ID>, where the enumerator is a bus driver, the device ID is a unique identifier for a type of device, and the instance ID uniquely identifies different instances of the same hardware.

Figure 6-35 presents an example of an enumeration subkey of an Intel display card. The device's key

contains descriptive data and includes values named Service and ClassGUID (which are obtained from a

driver's INF file upon installation) that help the PnP manager locate the device's drivers as follows:

- ■ The Service value is looked up in the Software key, and there the path to the driver (SYS file) is
stored in the ImagePath value. Figure 6-36 shows the Software subkey named lgfx (from Figure
6-35) where the Intel display driver can be located. The PnP manager will load that driver (if it's
not already loaded), call its add-device routine, and there the driver will create the FDO.

■ If a value named LowerFilters is present, it contains a multiple string list of drivers to load as
lower filters, which can be located in the Software subkey. The PnP manager loads these drivers
before loading the driver associated with the Service value above.
CHAPTER 6   I/O system     565


---

![Figure](figures/Winternals7thPt1_page_583_figure_000.png)

FIGURE 6-35 Example of a Hardware subkey.

![Figure](figures/Winternals7thPt1_page_583_figure_002.png)

FIGURE 6-36 Example of a Software subkey.

- ■ If a value named UpperFilters is present, it indicates a list of driver names (under the Software
key, similar to LowerFilters) which the PnP manager will load in much the same way after it
loads the driver pointed to by the Service value.
■ The ClassGUID value represents the general type of device (display, keyboard, disk, etc), and
points to a subkey under the Class key (from Table 6-7). The key represents settings applicable to
all drivers for that type of device. In particular, if the values LowerFilters and/or UpperFilters
are present, they are treated just like the same values in the Hardware key of the particular
device. This allows, for example, the loading of an upper filter for keyboard devices, regardless
of the particular keyboard or the vendor. Figure 6-37 shows the class key for keyboard devices.
Notice the friendly name (Keyboard), although the GUID is what matters (the decision on the
particular class is provided as part of the installation INF file). An UpperFilters value exists,
listing the system provided keyboard class driver that always loads as part of any keyboard
drivernote. (You can also see the IconPath value that is used as the icon for the keyboard type
in the Device Manager's UI.)
---

![Figure](figures/Winternals7thPt1_page_584_figure_000.png)

FIGURE 6-37 The keyboard class key.

To summarize, the order of driver loading for a devnode is as follows:

- 1. The bus driver is loaded, creating the PDO.

2. Any lower filters listed in the Hardware instance key are loaded, in the order listed (multi string),

creating their filter device objects (FiDOs in Figure 6-34).

3. Any lower filters listed in the corresponding Class key are loaded in the order listed, creating

their FiDOs.

4. The driver listed in the Service value is loaded, creating the FDO.

5. Any upper filters listed in the Hardware instance key are loaded, in the order listed, creating

their FiDOs.

6. Any upper filters listed in the corresponding Class key are loaded in the order listed creating

their FiDOs.
To deal with multifunction devices (such as all-in-one printers or cell phones with integrated camera and music player functionalities), Windows also supports a container ID property that can be associated with a devnode. The container ID is a GUID that is unique to a single instance of a physical device and shared between all the function devnodes that belong to it, as shown in Figure 6-38.

![Figure](figures/Winternals7thPt1_page_584_figure_005.png)

FIGURE 6-38 All-in-one printer with a unique ID as seen by the PnP manager.

CHAPTER 6   I/O system     567


---

The container ID is a property that, similar to the instance ID, is reported back by the bus driver of the corresponding hardware. Then, when the device is being enumerated, all devnodes associated with the same PDO share the container ID. Because Windows already supports many buses out of the box— such as PnP-X, Bluetooth, and USB—most device drivers can simply return the bus-specific ID, from which Windows will generate the corresponding container ID. For other kinds of devices or buses, the driver can generate its own unique ID through software.

Finally, when device drivers do not supply a container ID, Windows can make educated guesses by

querying the topology for the bus, when that's available, through mechanisms such as ACPI. By under standing whether a certain device is a child of another, and whether it is removable, hot-pluggable,

or user-reachable (as opposed to an internal motherboard component), Windows is able to assign

container IDs to device nodes that reflect multifunction devices correctly.

The final end-user benefit of grouping devices by container IDs is visible in the Devices and Printers

UI. This feature is able to display the scanner, printer, and faxing components of an all-in-one printer as

a single graphical element instead of three distinct devices. For example, in Figure 6-39, the HP 6830

printer/fax/scanner is identified as a single device.

![Figure](figures/Winternals7thPt1_page_585_figure_003.png)

FIGURE 6-39 The Devices and Printers Control Panel applet.

EXPERIMENT: Viewing detailed devnode information in Device Manager

The Device Manager applet shows detailed information about a device node on its Details tab. The tab allows you to view an assortment of fields, including the devnode's device instance ID, hardware ID, service name, filters, and power capabilities.

The following screen shows the selection combo box of the Details tab expanded to reveal

some of the types of information you can access:

---

![Figure](figures/Winternals7thPt1_page_586_figure_000.png)

## Driver support for Plug and Play

To support Plug and Play, a driver must implement a Plug and Play dispatch routine (IRP_MJ_PNP), a power-management dispatch routine (IRP_MJ_POWER, described in the section "The power manager" later in this chapter), and an add-device routine. Bus drivers must support Plug and Play requests that are different than the ones that function or filter drivers support, however. For example, when the PnP manager guides device enumeration during the system boot, it asks bus drivers for a description of the devices that they find on their respective buses through PnP IRPs.

Function and filter drivers prepare to manage their devices in their add-device routines, but they

don't actually communicate with the device hardware. Instead, they wait for the PnP manager to send

a start-device command (IRP_MN_START_DEVICE minor PnP IRP code) for the device to their Plug and

Play dispatch routine. Before sending the start-device command, the PnP manager performs resource

arbitration to decide what resources to assign the device. The start-device command includes the

resource assignment that the PnP manager determines during resource arbitration. When a driver

receives a start-device command, it can configure its device to use the specified resources. If an appli cation tries to open a device that hasn't finished starting, it receives an error indicating that the device

does not exist.

After a device has started, the PnP manager can send the driver additional Plug and Play commands, including ones related to the device's removal from the system or to resource reassignment. For example, when the user invokes the remove/eject device utility, shown in Figure 6-40 (accessible by clicking the USB connector icon in the taskbar notification area), to tell Windows to eject a USB flash drive, the PnP manager sends a query-remove notification to any applications that have registered for Plug and Play notifications for the device. Applications typically register for notifications on their handles, which they close during a query-remove notification. If no applications veto the query-remove

CHAPTER 6 I/O system 569


---

request, the PnP manager sends a query-remove command to the driver that owns the device being ejected (IRP_MN_QUERY_REMOVE_DEVICE). At that point, the driver has a chance to deny the removal or to ensure that any pending I/O operations involving the device have completed, and to begin rejecting further I/O requests aimed at the device. If the driver agrees to the remove request and no open handles to the device remain, the PnP manager next sends a remove command to the driver (IRP_MN_ REMOVE_DEVICE) to request that the driver stop accessing the device and release any resources the driver has allocated on behalf of the device.

![Figure](figures/Winternals7thPt1_page_587_figure_001.png)

FIGURE 6-40 The remove/eject device utility.

When the PnP manager needs to reassign a device's resources, it first asks the driver whether it can temporarily suspend further activity on the device by sending the driver a query-stop command (ERP_MN_QUERY_STOP_DEVICE). The driver either agrees to the request (if doing so won't cause data loss or corruption) or denies the request. As with a query-remove command, if the driver agrees to the request, the driver completes pending I/O operations and won't initiate further I/O requests for the device that can't be aborted and subsequently restarted. The driver typically queues new I/O requests so that the resource reshuffling is transparent to applications currently accessing the device. The PnP manager then sends the driver a stop command (ERP_MN_STOP_DEVICE). At that point, the PnP manager can direct the driver to assign different resources to the device and once again send the driver a start-device command for the device.

The various Plug and Play commands essentially guide a device through an operational state machine, forming a well-defined state-transition table, which is shown in Figure 6-41. (The state diagram reflects the state machine implemented by function drivers. Bus drivers implement a more complex state machine.) Each transition in Figure 6-41 is marked by its minor IRP constant name without the IRP_MN_ prefix. One state that we haven't discussed is the one that results from the PnP manager's command (IRP_MN_SURPRISE_REMOVAL). This command results when either a user removes a device without warning, as when the user ejects a PCMCIA card without using the remove/eject utility, or the device fails. The command tells the driver to immediately cease all interaction with the device because the device is no longer attached to the system and to cancel any pending I/O requests.

---

FIGURE 6-41 Device plug-and-play state transitions.

Plug-and-play driver installation

If the PnP manager encounters a device for which no driver is installed, it relies on the user-mode PnP manager to guide the installation process. If the device is detected during the system boot, a devnode is defined for the device, but the loading process is postponed until the user-mode PnP manager starts. (The user-mode PnP manager service is implemented in Unpnpmgr.dll hosted in a standard Svchost. exe instance.)

The components involved in a driver's installation are shown in Figure 6-42. Dark-shaded objects in the figure correspond to components generally supplied by the system, whereas lighter-shaded objects are those included in a driver's installation files. First, a bus driver informs the PnP manager of a device it enumerates using a Device ID (1). The PnP manager checks the registry for the presence of a corresponding function driver, and when it doesn't find one, it informs the user-mode PnP manager (2) of the new device by its Device ID. The user-mode PnP manager first tries to perform an automatic install without user intervention. If the installation process involves the posting of dialog boxes that require user interaction and the currently logged-on driver has administrator privileges, the user-mode PnP manager launches the Rundll32.exe application (the same application that hosts classic .cpl Control Panel utilities) to execute the Hardware Installation Wizard (3) (%SystemRoot%\System32\Newdev. dll). If the currently logged-on user doesn't have administrator privileges (or if no user is logged on) and the installation of the device requires user interaction, the user-mode PnP manager defers the installation until a privileged user logs on. The Hardware Installation Wizard uses Setupapi.dll and CfgMgr32.dll (configuration manager) API functions to locate INF files that correspond to drivers that are compatible with the detected device. This process might involve having the user insert installation media containing a vendor's INF files, or the wizard might locate a suitable INF file in the driver store (%SystemRoot%\System32\DriverStore) that contains drivers that ship with Windows or others that are downloaded through Windows Update. Installation is performed in two steps. In the first, the third CHAPTER 6     I/O system      571


---

party driver developer imports the driver package into the driver store, and in the second, the system

performs the actual installation, which is always done through the %SystemRoot%\System32\Drvinst.

exe process.

![Figure](figures/Winternals7thPt1_page_589_figure_001.png)

FIGURE 6-42 Driver installation components.

To find drivers for the new device, the installation process gets a list of hardware IDs (discussed earlier) and compatible IDs from the bus driver. Compatible IDs are more generic—for example a USB mouse from a specific vendor might have a special button that does something unique, but a compatible ID for a generic mouse can utilize a more generic driver that ships with Windows if the specific driver is not available and at least provide the basic, common functionality of a mouse.

These IDs describe all the various ways the hardware might be identified in a driver installation file


(INF). The lists are ordered so that the most specific description of the hardware is listed first. If matches

are found in multiple INFs, the following points apply:

- More-precise matches are preferred over less-precise matches.

Digitally signed INFs are preferred over unsigned ones.

Newer signed INFs are preferred over older signed ones.
![Figure](figures/Winternals7thPt1_page_589_figure_006.png)

Note If a match is found based on a compatible ID, the Hardware Installation wizard can prompt for media in case a more up-to-date driver came with the hardware.

The INF file locates the function driver's files and contains instructions that fill in the driver's enumeration and class keys in the registry, copy required files, and the INF file might direct the Hardware Installation Wizard to (4) launch class or device co-installer DLLs that perform class-specific or devicespecific installation steps, such as displaying configuration dialog boxes that let the user specify settings for a device. Finally, when the drivers that make up a devnode load, the device/driver stack is built (5).

572    CHAPTER 6   I/O system

---

## EXPERIMENT: Looking at a driver's INF file

When a driver or other software that has an INF file is installed, the system copies its INF file to the %SystemRoot%\inf directory. One file that will always be there is Keyboard.inf because it's the INF file for the keyboard class driver. View its contents by opening it in Notepad and you should see something like this (anything after a semicolon is a comment):

```bash
:~:
: KEYBOARD.INF  -- This file contains descriptions of Keyboard class devices
:~
: Copyright (c) Microsoft Corporation.  All rights reserved.
[Version]
Signature   ="$Windows_NT$"
Class       =Keyboard
ClassGUID   ={4D36E96B-E325-11CE-BFC1-08002BE10318}
Provider     =%MSFT%
DriverVer=06/21/2006,10.0.10586.0
[SourceDisksNames]
3426=mwindows cd
[SourceDisksFiles]
i8042prt.sys    = 3426
kbdclass.sys    = 3426
kbdhid.sys     = 3426
...
```

An INF has the classic INI format, with sections in square brackets and underneath are key/ value pairs separated by an equal sign. An INF is not “executed” from start to end sequentially; instead, it’s built more like a tree, where certain values point to sections with the value name where execution continues. (Consult the WDK for the details.)

If you search the file for .sys, you'll come across sections that direct the user-mode PnP manager to install the i8042prt.sys and kbcdc.sys drivers:

```bash
[18042prt_CopyFiles]
i8042prt.sys,,,0x100
 [KbdClass.CopyFiles]
kbdclass.sys,,,0x100
```

Before installing a driver, the user-mode PnP manager checks the system's driver-signing policy.

If the settings specify that the system should block or warn of the installation of unsigned drivers, the

user-mode PnP manager checks the driver's INF file for an entry that locates a catalog (a file that ends

with the .cat extension) containing the driver's digital signature.

---

Microsoft's WHQL tests the drivers included with Windows and those submitted by hardware vendors. When a driver passes the WHQL tests, it is "signed" by Microsoft. This means that WHQL obtains a hash, or unique value representing the driver's files, including its image file, and then cryptographically signs it with Microsoft's private driver-signing key. The signed hash is stored in a catalog file and included on the Windows installation media or returned to the vendor that submitted the driver for inclusion with its driver.

## EXPERIMENT: Viewing catalog files

When you install a component such as a driver that includes a catalog file, Windows copies the

catalog file to a directory under %SystemRoot%\System32\Catroot. Navigate to that directory in

Explorer, and you'll find a subdirectory that contains .cat files. For example, NT5.cat and NT5ph.

cat store the signatures and page hashes for Windows system files.

If you open one of the catalog files, a dialog box appears with two pages. The page labeled “General” shows information about the signature on the catalog file, and the Security Catalog page has the hashes of the components that are signed with the catalog file. This screenshot of a catalog file for an Intel audio driver shows the hash for the audio driver SYS file. Other hashes in the catalog are associated with the various support DLLs that ship with the driver.

![Figure](figures/Winternals7thPt1_page_591_figure_004.png)

As it installs a driver, the user-mode PnP manager extracts the driver's signature from its catalog file,

decrypts the signature using the public half of Microsoft's driver-signing private/public key pair, and

compares the resulting hash with a hash of the driver file about to install. If the hashes match, the

driver is verified as having passed WHQL testing. If a driver fails the signature verification, the user mode PnP manager acts according to the settings of the system driver-signing policy, either failing the

installation attempt, warning the user that the driver is unsigned, or silently installing the driver.

574 CHAPTER 6 I/O system

---

![Figure](figures/Winternals7thPt1_page_592_figure_000.png)

Note Drivers installed using setup programs that manually configure the registry and copy driver files to a system and driver files that are dynamically loaded by applications aren't checked for signatures by the PnP manager's signing policy. Instead, they are checked by the kernel-mode code-signing policy described in Chapter 8 in Part 2. Only drivers installed using INF files are validated against the PnP manager's driver-signing policy.

![Figure](figures/Winternals7thPt1_page_592_figure_002.png)

Note The user-mode PnP manager also checks whether the driver it's about to install is on the protected driver list maintained by Windows Update and, if so, blocks the installation with a warning to the user. Drivers that are known to have incompatibilities or bugs are added to the list and blocked from installation.

## General driver loading and installation

The preceding section showed how drivers for hardware devices are discovered and loaded by the PnP manager. These drivers mostly load "on demand," meaning such a driver is not loaded unless needed— a device that the driver is responsible for enters the system; conversely, if all devices managed by a driver are removed, the driver will be unloaded.

More generally, the Software key in the registry holds settings for drivers (as well as Windows Services). Although services are managed within the same registry key, they are user-mode programs and have no connection to kernel drivers (although the Service Control Manager can be used to load both services and device drivers). This section focuses on drivers; for a complete treatment of services, see Chapter 9 in Part 2.

### Driver loading

Each subkey under the Software key (HKLMLSystem\CurrentControlSet\Services) holds a set of values that control some static aspects of a driver (or service). One such value, ImagePath, was encountered already when we discussed the loading process of PnP drivers. Figure 6-36 shows an example of a driver key and Table 6-8 summarizes the most important values in a driver's Software key (see Chapter 9 in Part 2 for a complete list).

The Start value indicates the phase in which a driver (or service) is loaded. There are two main differences between device drivers and services in this regard:

- ■ Only device drivers can specify Start: values of boot-start (0) or system-start (1). This is because
at these phases, no user mode exists yet, so services cannot be loaded.
■ Device drivers can use the Group and Tag values (not shown in Table 6-8) to control the order
of loading within a phase of the boot, but unlike services, they can't specify DependOnGroup or
DependOnService values (see Chapter 9 in Part 2 for more details).
---

TABLE 6-8 Important values in a driver's registry key

<table><tr><td>Value Name</td><td>Description</td></tr><tr><td>ImagePath</td><td>This is the path to the driver&#x27;s image file (SYS)</td></tr><tr><td>Type</td><td>This indicates whether this key represents a service or a driver. A value of 1 means a driver and a value of 2 means a file system (or filter) driver. Values of 16 (0x10) and 32 (0x20) mean a service. See Chapter 9 in Part 2 for more information.</td></tr><tr><td>Start</td><td>This indicates when the driver should load. The options are as follows: 0 (SERVICE_BOOT_START) The driver is loaded by the boot loader. 1 (SERVICE_SYSTEM_START) The driver is loaded after the executive is initialized. 2 (SERVICE_AUTO_START) The driver is loaded by the service control manager. 3 (SERVICE_DEMAND_START) The driver is loaded on demand. 4 (SERVICE_DISABLED) The driver is not loaded.</td></tr></table>


Chapter 11, "Startup and shutdown, in Part 2 describes the phases of the boot process and explains that a driver Start value of 0 means that the operating system loader loads the driver. A Start value of 1 means that the I/O manager loads the driver after the executive subsystems have finished initializing. The I/O manager calls driver initialization routines in the order that the drivers load within a boot phase. Like Windows services, drivers use the Group value in their registry key to specify which group they belong to: the registry value HKLM\SYSTEM\CurrentControlSet\Control\ServiceGroupOrderList determines the order that groups are loaded within a boot phase.

A driver can further refine its load order by including a Tag value to control its order within a group.

The I/O manager sorts the drivers within each group according to the Tag values defined in the drivers'

registry keys. Drivers without a tag go to the end of the list in their group. You might assume that the

I/O manager initializes drivers with lower-number tags before it initializes drivers with higher-number

tags, but such isn't necessarily the case. The registry key HKLM\SYSTEM\CurrentControlSet\Control(

GroupOrderList defines tag precedence within a group; with this key, Microsoft and device-driver

developers can take liberties with redefining the integer number system.

![Figure](figures/Winternals7thPt1_page_593_figure_004.png)

Note The use of Group and Tag is reminiscent from the early Windows NT days. These tags are rarely used in practice. Most drivers should not have dependencies on other drivers (only on kernel libraries linked to the driver, such as NDIS.sys).

Here are the guidelines by which drivers set their Start value:

- ■ Non-Plug and Play drivers set their Start value to reflect the boot phase they want to load in.

■ Drivers, including both Plug and Play and non-Plug and Play drivers, that must be loaded by

the boot loader during the system boot specify a Start value of boot-start (0). Examples in-
clude system bus drivers and the boot file-system driver.

■ A driver that isn’t required for booting the system and that detects a device that a system bus

driver can’t enumerate specifies a Start value of system-start (1). An example is the serial port

driver, which informs the PnP manager of the presence of standard PC serial ports that were

detected by Setup and recorded in the registry.
---

- • A non-Plug and Play driver or file-system driver that doesn't have to be present when the
system boots specifies a Start value of auto-start (2). An example is the Multiple Universal
Naming Convention (UNC) Provider (MUP) driver, which provides support for UNC-based path
names to remote resources (for example, \\RemoteComputerName\SomeShare).
• Plug and Play drivers that aren't required to boot the system specify a Start value of demand-
start (3). Examples include network adapter drivers.
The only purpose that the Start values for Plug and Play drivers and drivers for enumerable devices

have is to ensure that the operating system loader loads the driver—if the driver is required for the

system to boot successfully. Beyond that, the PnP manager's device enumeration process determines

the load order for Plug and Play drivers.

## Driver installation

As we've seen, Plug and Play drivers require an INF file for installation. The INF includes the hardware

device IDs this driver can handle and the instructions for copying files and setting registry values. Other

type of drivers (such as file system drivers, file system filters and network filters) require an INF as well,

which includes a unique set of values for the particular type of driver.

Software-only drivers (such as the one Process Explorer uses) can use an INF for installation, but don't have to. These can be installed by a call to the CreateService API (or use a tool such as sc.exe that wraps it), as Process Explorer does after extracting its driver from a resource within the executable (if running with elevated permissions). As the API name suggests, it's used to install services as well as drivers. The arguments to CreateService indicate whether it's installing a driver or a service, the Start value and other parameters (see the Windows SDK documentation for the details). Once installed, a call to StartService loads the driver (or service), calling DriverEntry (for a driver) as usual.

A software-only driver typically creates a device object with a name its clients know. For example, Process Explorer creates a device named PROCESSP152 that is then used by Process Explorer in a CreateFile call, followed by calls such as DeviceIoControl to send requests to the driver (turned into IRPs by the /IO manager). Figure 6-43 shows the Process Explorer object symbolic link (using the WinObj Sysinternals tool) in the GLOBAL?? directory (recall that the names in this directory are accessible to user mode clients) that's created by Process Explorer the first time it's running with elevated privileges. Notice that it points to the real device object under the \Device directory and it has the same name (which is not a requirement).

![Figure](figures/Winternals7thPt1_page_594_figure_006.png)

FIGURE 6-43 Process Explorer's symbolic link and device name.

CHAPTER 6   I/O system      577


---

The Windows Driver Foundation

The Windows Driver Foundation (WDF) is a framework for developing drivers that simplifies common tasks such as handling Plug and Play and Power IRPs correctly. WDF includes the Kernel-Mode Driver Framework (KMDF) and the User-Mode Driver Framework (UMDF). WDF is now open source and can be found at https://github.com/Microsoft/Windows-Driver-Frameworks. Table 6-9 shows the Windows version support (for Windows 7 and later) for KMDF. Table 6-10 shows the same for UMDF.

TABLE 6-9 KMDF versions

<table><tr><td>KMDF Version</td><td>Release Method</td><td>Included in Windows</td><td>Drivers Using It Run On</td></tr><tr><td>1.9</td><td>Windows 7 WDK</td><td>Windows 7</td><td>Windows XP and later</td></tr><tr><td>1.11</td><td>Windows 8 WDK</td><td>Windows 8</td><td>Windows Vista and later</td></tr><tr><td>1.13</td><td>Windows 8.1 WDK</td><td>Windows 8.1</td><td>Windows 8.1 and later</td></tr><tr><td>1.15</td><td>Windows 10 WDK</td><td>Windows 10</td><td>Windows 10, Windows Server 2016</td></tr><tr><td>1.17</td><td>Windows 10 version 1511 WDK</td><td>Windows 10 version 1511</td><td>Windows 10 version 1511 and later, Windows Server 2016</td></tr><tr><td>1.19</td><td>Windows 10 version 1607 WDK</td><td>Windows 10 version 1607</td><td>Windows 10 version 1607 and later, Windows Server 2016</td></tr></table>


TABLE 6-10 UMDF versions

<table><tr><td>UMDF Version</td><td>Release Method</td><td>Included in Windows</td><td>Drivers Using it Run On</td></tr><tr><td>1.9</td><td>Windows 7 WDK</td><td>Windows 7</td><td>Windows XP and later</td></tr><tr><td>1.11</td><td>Windows 8 WDK</td><td>Windows 8</td><td>Windows Vista and later</td></tr><tr><td>2.0</td><td>Windows 8.1 WDK</td><td>Windows 8.1</td><td>Windows 8.1 and later</td></tr><tr><td>2.15</td><td>Windows 10 WDK</td><td>Windows 10</td><td>Windows 10 and later, Windows Server 2016</td></tr><tr><td>2.17</td><td>Windows 10 version 1511 WDK</td><td>Windows 10 version 1511</td><td>Windows 10 version 1511 and later, Windows Server 2016</td></tr><tr><td>2.19</td><td>Windows 10 version 1607 WDK</td><td>Windows 10 version 1607</td><td>Windows 10 version 1607, Windows Server 2016</td></tr></table>


Windows 10 introduced the concept of Universal Drivers, briefly described in Chapter 2, "System architecture." These drivers use a common set of DDIs implemented in multiple editions of Windows 10— from IoT Core, to Mobile, to desktops. Universal drivers can be built with KMDF, UMDF 2.x, or WDM.

Building such drivers is relatively easy with the aid of Visual Studio, where the Target Platform setting is set to Universal. Any DDI that is outside the boundaries of Universal will be flagged by the compiler.

UMDF versions 1.x used a COM based model for programming drivers, which is a very different programming model than KMDF, which is using object-based C. UMDF 2 has been aligned with KMDF and provides an almost identical API, reducing overall cost associated with WDF driver development; in fact, UMDF 2.x drivers can be converted to KMDF if the need arises with little work. UMDF 1.x will not be discussed in this book; consult the WDK for more information.

578 CHAPTER 6 I/O system


---

The following sections discuss KMDF and UMDF, which essentially behave in a consistent manner, no matter the exact OS they're running on.

## Kernel-Mode Driver Framework

We've already discussed some details about the Windows Driver Foundation (WDF) in Chapter 2. In this section, we'll take a deeper look at the components and functionality provided by the kernelmode part of the framework, KMDF. Note that this section will only briefly touch on some of the core architecture of KMDF. For a much more complete overview on the subject, please refer to the Windows Driver Kit documentation.

![Figure](figures/Winternals7thPt1_page_596_figure_003.png)

Note Most of the details presented in this section are the same for UMDF 2.x, with the exceptions discussed in the next section.

### Structure and operation of a KMDF driver

First, let's look at which kinds of drivers or devices are supported by KMDF. In general, any WDM-conformant driver should be supported by KMDF, as long as it performs standard I/O processing and IRP manipulation. KMDF is not suitable for drivers that don't use the Windows kernel API directly but instead perform library calls into existing port and class drivers. These types of drivers cannot use KMDF because they only provide callbacks for the actual WDM drivers that do the I/O processing. Additionally, if a driver provides its own dispatch functions instead of relying on a port or class driver, IEEE 1394, ISA, PCI, PCMCIA, and SD Client (for Secure Digital storage devices) drivers can also use KMDF.

Although KMDF provides an abstraction on top of WDM, the basic driver structure shown earlier also generally applies to KMDF drivers. At their core, KMDF drivers must have the following functions:

- ■ An initialization routine Like any other driver, a KMDF driver has a DriverEntry function
that initializes the driver. KMDF drivers initiate the framework at this point and perform any
configuration and initialization steps that are part of the driver or part of describing the driver
to the framework. For non-Plug and Play drivers, this is where the first device object should be
created.
■ An add-device routine KMDF driver operation is based on events and callbacks (described
shortly), and the EvtDriverDeviceAdd callback is the single most important one for PnP de-
vices because it receives notifications when the PnP manager in the kernel enumerates one of
the driver's devices.
■ One or more EvtIo* routines Similar to a WDM driver's dispatch routines, these callback
routines handle specific types of I/O requests from a particular device queue. A driver typically
creates one or more queues in which KMDF places I/O requests for the driver's devices. These
queues can be configured by request type and dispatching type.
CHAPTER 6   I/O system      579


---

The simplest KMDF driver might need to have only an initialization and add-device routine because the framework will provide the default, generic functionality that's required for most types of I/O processing, including power and Plug and Play events. In the KMDF model, events refer to run-time states to which a driver can respond or during which a driver can participate. These events are not related to the synchronization primitives (synchronization is discussed in Chapter 8 in Part 2), but are internal to the framework.

For events that are critical to a driver's operation, or that need specialized processing, the driver reg isters a given callback routine to handle this event. In other cases, a driver can allow KMDF to perform

a default, generic action instead. For example, during an eject event (EvtDevI ced ject), a driver can

choose to support ejection and supply a callback or to fall back to the default KMDF code that will tell

the user that the device does not support ejection. Not all events have a default behavior, however, and

callbacks must be provided by the driver. One notable example is the EvtDriverDevI cAdd event just

described that is at the core of any Plug and Play driver.

## EXPERIMENT: Displaying KMDF and UMDF 2 drivers

The Wfkfd.dll extension that ships with the Debugging Tools for Windows package provides many commands that can be used to debug and analyze KMDF drivers and devices (instead of using the built-in WDM-style debugging extension, which may not offer the same kind of WDFspecific information). You can display installed KMDF drivers with the !wfkfd.wdf!rdr debugger command. In the following example, the output from a Windows 10 32-bit Hyper-V virtual machine is shown, displaying the built-in drivers that are installed.

```bash
tkd- !wdfkd.wdfldr
---------------------------------------------------------------------------------
KMDF Drivers
---------------------------------------------------------------------------------
LoadedModulelist    0x870991ec
---------------------------------------------------------------------------------
LIBRARY_MODULE  0x8626aad8
Version        v1.19
Service       \Registry\Machine\System\CurrentControlSet\Services\Wdf01000
ImageName      Wdf01000.sys
ImageAddress   0x87000000
ImageSize     0x8f000
Associated Clients: 25
ImageName        Ver  WdfGlobals FxGlobals ImageAddress ImageSize
umpass.sys         v1.15 0x1a1ae53f8 0x1a1ae52f8 0x9e5f0000 0x00008000
peauth.sys        v1.7 0x95c794d8 0x95e797d8 0x9e400000 0x00ba000
mslldp.sys        v1.15 0x9aea1b50 0x9aed1a50 0x8e300000 0x00014000
vmgid.sys         v1.15 0x97d0fd08 0x97d0fc08 0x8e260000 0x00008000
monitor.sys      v1.15 0x97c7fe18 0x97cf7d18 0x8e250000 0x0000c000
tsusbhub.sys      v1.15 0x97cb3108 0x97cb3008 0x8e4b0000 0x0001b000
NdisVirtualBus.sys  v1.15 0x80dfc2b0 0x8d0fec1b0 0x87a90000 0x00009000
vmgencounter.sys    v1.15 0x80deffe0 0x80defeed0 0x87a80000 0x00008000
intlppm.sys        v1.15 0x80df4c0 0x8d0f4fb0 0x87a5000 0x00021000
```

580 CHAPTER 6 I/O system


---

```bash
vms3cap.sys      v1.15 0x80df5218 0x80df5118 0x87a40000 0x00008000
netsvc.sys      v1.15 0x8d11ed0 0x8d11ddd0 0x87a20000 0x00019000
hyperkbd.sys      v1.15 0x8d114488 0x8d114388 0x87a70000 0x00008000
dmvsc.sys      v1.15 0x8ddb0b28 0x8d0da28 0x87a90000 0x00008000
umbus.sys      v1.15 0x8b86ef00 0x8b86e6d0 0x87f40000 0x00011000
CompositeBus.sys    v1.15 0x8b69910 0x8b869810 0x87df0000 0x00000000
cdrom.sys      v1.15 0x8b863320 0x8b863220 0x87f40000 0x00024000
vmstorfl.sys      v1.15 0x8b2b9108 0x8b2b9008 0x87c70000 0x00000000
EHStorClass.sys    v1.15 0x8a9daacf8 0x8a9dafb8 0x8786d000 0x00015000
vmbus.sys      v1.15 0x8a987c70 0x8a986c60 0x82870000 0x00018000
vdrvroot.sys      v1.15 0x8a970728 0x8a970628 0x82800000 0x0000f000
msiasdrv.sys      v1.15 0x8a964998 0x8a964898 0x873c0000 0x00008000
WindowsTrustedRTProxy.sys    v1.15 0x8a1fac10 0x8a1fb410 0x87240000 0x00008000
WindowsTrustedRT.sys      v1.15 0x8a1f1d0 0x8a1f1ed0 0x87220000 0x00017000
intelpep.sys      v1.15 0x8aa6f690 0x8aa6ff59 0x87210000 0x00000000
acpiex.sys      v1.15 0x86287f40 0x86287ed0 0x87a00000 0x00019000
```

Total: 1 library loaded

If UMDF 2.x drivers were loaded, they would have been shown as well. This is one of the benefits of the UMDF 2.x library (see the UMDF section later in this chapter for more on this subject).

Notice that the KMDF library is implemented in Wdf01000.sys, which is the current version

1.x of KMDF. Future versions of KMDF may have a major version of 2 and will be implemented in

another kernel module, Wdf02000.sys. This future module can live side by side with the version

1.x module, each loaded with the drivers that compiled against it. This ensures isolation and inde pendence between drivers built against different KMDF major version libraries.

## KMDF object model

The KMDF object model is object-based, with properties, methods and events, implemented in C, much like the model for the kernel, but it does not make use of the object manager. Instead, KMDF manages its own objects internally, exposing them as handles to drivers and keeping the actual data structures opaque. For each object type, the framework provides routines to perform operations on the object (called methods), such as WinDeviceCreate, which creates a device. Additionally, objects can have specific data fields or members that can be accessed by Get/Set (used for modifications that should never fail) or of Assign/Remove APIs (used for modifications that can fail), which are called properties. For example, the WinInterruptGetInfo function returns information on a given interrupt object (WDFINTERRUPT).

Also unlike the implementation of kernel objects, which all refer to distinct and isolated object types, KMDF objects are all part of a hierarchy—most object types are bound to a parent. The root object is the WDFDRIVER structure, which describes the actual driver. The structure and meaning is analogous to the DRIVER_OBJECT structure provided by the /O manager, and all other KMDF structures are children of it. The next most important object is WDFDEVICE, which refers to a given instance of a detected device on the system, which must have been created with wdfdeviceCreate. Again, this is analogous to the DEVICE_OBJECT structure that's used in the WDM model and by the I/O manager. Table 6-11 lists the object types supported by KMDF.

CHAPTER 6 I/O system   581


---

TABLE 6-11 KMDF object types

<table><tr><td>Object</td><td>Type</td><td>Description</td></tr><tr><td>Child list</td><td>WDFCHILDLIST</td><td>This is a list of child WDFDEVICE objects associated with the device. It is used only by bus drivers.</td></tr><tr><td>Collection</td><td>WDFCOLLECTION</td><td>This is a list of objects of a similar type, such as a group of WDFDEVICE objects being filtered.</td></tr><tr><td>Deferred Procedure Call</td><td>WDFDC</td><td>This is an instance of a DPC object.</td></tr><tr><td>Device</td><td>WDFDEVICE</td><td>This is an instance of a device.</td></tr><tr><td>DMA common buffer</td><td>WDFCOMMONBUFFER</td><td>This is a region of memory that a device and driver can access for DMA.</td></tr><tr><td>DMA enabler</td><td>WDFDMAENABLER</td><td>This enables DMA on a given channel for a driver.</td></tr><tr><td>DMA transaction</td><td>WDFDATATRANSACTION</td><td>This is an instance of a DMA transaction.</td></tr><tr><td>Driver</td><td>WDFDRIVER</td><td>This is an object for the driver. It represents the driver, its parameters, and its callbacks, among other items.</td></tr><tr><td>File</td><td>WDFFILEOBJECT</td><td>This is an instance of a file object that can be used as a channel for communication between an application and the driver.</td></tr><tr><td>Generic object</td><td>WDFOBJECT</td><td>This allows driver-defined custom data to be wrapped inside the framework&#x27;s object data model as an object.</td></tr><tr><td>Interrupt</td><td>WDFINTERRUPT</td><td>This is an instance of an interrupt that the driver must handle.</td></tr><tr><td>I/O queue</td><td>WDFQUEUE</td><td>This represents a given I/O queue.</td></tr><tr><td>I/O request</td><td>WDFREQUEST</td><td>This represents a given request on a WDFQUEUE.</td></tr><tr><td>I/O target</td><td>WDFIOTARGET</td><td>This represents the device stack being targeted by a given WDFREQUEST.</td></tr><tr><td>Look-aside list</td><td>WDFLOOKASIDE</td><td>This describes an executive look-aside list. (See Chapter 5.)</td></tr><tr><td>Memory</td><td>WDFMEMORY</td><td>This describes a region of paged or nonpaged pool.</td></tr><tr><td>Registry key</td><td>WDFKEY</td><td>This describes a registry key.</td></tr><tr><td>Resource list</td><td>WDFCMRESLIST</td><td>This identifies the hardware resources assigned to a WDFDEVICE.</td></tr><tr><td>Resource range list</td><td>WDFIORESLIST</td><td>This identifies a given possible hardware resource range for a WDFDEVICE.</td></tr><tr><td>Resource requirements list</td><td>WDFIORESREQLIST</td><td>This contains an array of WDFIORESLIST objects describing all possible resource ranges for a WDFDEVICE.</td></tr><tr><td>Spinlock</td><td>WDFSPINLOCK</td><td>This describes a spinlock.</td></tr><tr><td>String</td><td>WDFSTRING</td><td>This describes a Unicode string structure.</td></tr><tr><td>Timer</td><td>WDTIMER</td><td>This describes an executive timer. (See Chapter 8 in Part 2 for more information.)</td></tr><tr><td>USB device</td><td>WDFUSBDEVICE</td><td>This identifies the one instance of a USB device.</td></tr><tr><td>USB interface</td><td>WDFUSBINTERFACE</td><td>This identifies one interface on the given WDFUSBDEVICE.</td></tr><tr><td>USB pipe</td><td>WDFUSBPIPE</td><td>This identifies a pipe to an endpoint on a given WDFUSBINTERFACE.</td></tr><tr><td>Wait lock</td><td>WDFWAITLOCK</td><td>This represents a kernel dispatcher event object.</td></tr></table>


582    CHAPTER 6  I/O system

---

<table><tr><td>Object</td><td>Type</td><td>Description</td></tr><tr><td>WMI instance</td><td>WDFWMIINSTANCE</td><td>This represents a WMI data block for a given WDFWMIPROVIDER.</td></tr><tr><td>WMI provider</td><td>WDFWMIPROVIDER</td><td>This describes the WMI schema for all the WDFWMIINSTANCE objects supported by the driver.</td></tr><tr><td>Work item</td><td>WDFWORKITEM</td><td>This describes an executive work item.</td></tr></table>


For each of these objects, other KMDF objects can be attached as children. Some objects have only one or two valid parents, while others can be attached to any parent. For example, a WDDIWNTERRUPT object must be associated with a given WDDEVICE, but a WDSPINLOCK or WDSTRING object can have any object as a parent. This allows for fine-grained control over their validity and usage and the reduction of global state variables. Figure 6-44 shows the entire KMDF object hierarchy.

![Figure](figures/Winternals7thPt1_page_600_figure_002.png)

FIGURE 6-44 KMDF object hierarchy.

The associations mentioned earlier and shown in Figure 6-44 are not necessarily immediate. The parent must simply be on the hierarchy chain, meaning one of the ancestor nodes must be of this type. This relationship is useful to implement because object hierarchies affect not only an object's locality but also its lifetime. Each time a child object is created, a reference count is added to it by its link to its parent. Therefore, when a parent object is destroyed, all the child objects are also destroyed, which is why associating objects such as WDFSTRING or WDFMEMORY with a given object instead of the default WDFRIVER object can automatically free up memory and state information when the parent object is destroyed.

CHAPTER 6   I/O system   583


---

Closely related to the concept of hierarchy is KMDF's notion of object context. Because KMDF objects are opaque (as discussed) and are associated with a parent object for locality, it becomes important to allow drivers to attach their own data to an object in order to track certain specific information outside the framework's capabilities or support. Object contexts allow all KMDF objects to contain such information. They also allow multiple object context areas, which permit multiple layers of code inside the same driver to interact with the same object in different ways. In WDM, the device extension custom data structure allows such information to be associated with a given device, but with KMDF even a spinlock or string can contain context areas. This extensibility enables each library or layer of code responsible for processing an I/O request to interact independently of other code, based on the context area that it works with.

Finally, KMDF objects are also associated with a set of attributes, shown in Table 6-12. These attributes are usually configured to their defaults, but the values can be overridden by the driver when creating the object by specifying a wpr_OBJECT_ATTRIBUTES structure (similar to the object manager's OBJECT_ATTRIBUTES structure that's used when creating a kernel object).

TABLE 6-12 KMDF object attributes

<table><tr><td>Attribute</td><td>Description</td></tr><tr><td>ContextSizeOverride</td><td>This is the size of the object context area.</td></tr><tr><td>ContextTypeInfo</td><td>This is the type of the object context area.</td></tr><tr><td>EvtCleanupCallback</td><td>This is the callback to notify the driver of the object&#x27;s cleanup before deletion. (References may still exist.)</td></tr><tr><td>EvtDestroyCallback</td><td>This is the callback to notify the driver of the object&#x27;s imminent deletion. (The reference count will be 0.)</td></tr><tr><td>ExecutionLevel</td><td>This describes the maximum IRQL at which the callbacks may be invoked by KMDF.</td></tr><tr><td>ParentObject</td><td>This identifies the parent of the object.</td></tr><tr><td>SynchronizationScope</td><td>Specifies whether callbacks should be synchronized with the parent, a queue, a device, or nothing.</td></tr></table>


## KMDF I/O model

The KMDF I/O model follows the WDM mechanisms discussed earlier in this chapter. In fact, you can even think of the framework itself as a WDM driver, since it uses kernel APIs and WDM behavior to abstract KMDF and make it functional. Under KMDF, the framework driver sets its own WDM-style IRP dispatch routines and takes control of all IRPs sent to the driver. After being handled by one of three KMDF I/O handlers (described shortly), it then packages these requests in the appropriate KMDF objects, inserts them in the appropriate queues (if required), and performs driver callback if the driver is interested in those events. Figure 6-45 describes the flow of I/O in the framework.

---

![Figure](figures/Winternals7thPt1_page_602_figure_000.png)

FIGURE 6-45 KMDF I/O flow and IRP processing.

Based on the IRP processing discussed previously for WDM drivers, KMDF performs one of the following three actions:

- • It sends the IRP to the I/O handler, which processes standard device operations.

• It sends the IRP to the PnP and power handler that processes these kinds of events and notifies

other drivers if the state has changed.

• It sends the IRP to the WMI handler, which handles tracing and logging.
These components then notify the driver of any events it registered for, potentially forward the

request to another handler for further processing, and then complete the request based on an internal

handler action or as the result of a driver call. If KMDF has finished processing the IRP but the request

itself has still not been fully processed, KMDF will take one of the following actions:

- For bus drivers and function drivers, it completes the IRP with STATUS_INVALID_DEVICE_REQUEST.
For filter drivers, it forwards the request to the next lower driver.
I/O processing by KMDF is based on the mechanism of queues (WDFQUEUE, not the KQUEUE object discussed earlier in this chapter). KMDF queues are highly scalable containers of I/O requests (packaged as WDFREQUEST objects) and provide a rich feature set beyond merely sorting the pending I/Os for a given device. For example, queues track currently active requests and support I/O cancellation, I/O concurrency (the ability to perform and complete more than one I/O request at a time), and I/O synchronization (as noted in the list of object attributes in Table 6-12). A typical KMDF driver creates at least one queue (if not more) and associates one or more events with each queue, as well as some of the following options:

CHAPTER 6   I/O system   585

---

- ■ The callbacks registered with the events associated with this queue.
■ The power management state for the queue. KMDF supports both power-managed and non-
power managed queues. For the former, the I/O handler wakes up the device when required
(and when possible), arms the idle timer when the device has no I/Os queued up, and calls the
driver's I/O cancellation routines when the system is switching away from a working state.
■ The dispatch method for the queue. KMDF can deliver I/Os from a queue in sequential, parallel,
or manual mode. Sequential I/Os are delivered one at a time (KMDF waits for the driver to com-
plete the previous request), while parallel I/Os are delivered to the driver as soon as possible. In
manual mode, the driver must manually retrieve I/Os from the queue.
■ Whether the queue can accept zero-length buffers, such as incoming requests that don't actu-
ally contain any data.
![Figure](figures/Winternals7thPt1_page_603_figure_001.png)

Note The dispatch method only affects the number of requests that can be active inside a driver's queue at one time. It does not determine whether the event callbacks themselves will be called concurrently or serially. That behavior is determined through the synchronization scope object attribute described earlier. Therefore, it is possible for a parallel queue to have concurrency disabled but still have multiple incoming requests.

Based on the mechanism of queues, the KMDF I/O handler can perform various tasks upon receiving a create, close, cleanup, write, read, or device control (IOCTL) request:

- ■ For create requests, the driver can request to be immediately notified through the EvtDevice-
FileCreate callback event, or it can create a non-manual queue to receive create requests.
It must then register an EvtIoDefault callback to receive the notifications. Finally, if none of
these methods are used, KMDF will simply complete the request with a success code, meaning
that by default, applications will be able to open handles to KMDF drivers that don't supply their
own code.
■ For cleanup and close requests, the driver will be immediately notified through the EvtFileClean-
up and EvtFileClose callbacks, if registered. Otherwise, the framework will simply complete
with a success code.
■ For write, read, and IOCTL requests, the flow shown in Figure 6-46 applies.
---

FIGURE 6-46 Handling read, write, and IOCTL request by KMDF.

User-Mode Driver Framework

Windows includes a growing number of drivers that run in user mode, using the User-Mode Driver Framework (UMDF), which is part of the WDF. UMDF version 2 is aligned with KMDF in terms of object model, programming model and I/O model. The frameworks are not identical, however, because of some of the inherent differences between user mode and kernel mode. For example, some KMDF objects listed in Table 6-12 don't exist in UMDF, including WDFCHILDLIST, DMA-related objects, WDFLOKASIDELIST (look-aside lists can be allocated only in kernel mode), WDFIRELIST, WDFIORESLIST, WDFDPC, and WMI objects. Still, most KMDF objects and concepts apply to UMDF 2.x. UMDF provides several advantages over KMDF:

• UMDF hosts execute in user mode, so any unhandled exception crashes the UMDF host process, but not the entire system. • UMDF hosts process runs with the Local Service account, which has very limited privileges on the local machine and only anonymous access on network connections. This reduces the security attack surface. • UMDF hosts process means the IRQL is always 0 (PASSIVE_LEVEL). Thus, the driver can always take page faults and use kernel dispatcher objects for synchronization (events, mutexes, and so on). • UMDF hosts process means the debugging UMDF drivers because the debugging setup does not require two separate machines (virtual or physical).

CHAPTER 6 I/O system 587


---

The main drawback to UMDF is increased latency because of the kernel/user transitions and com munication required (as described shortly). Also, some types of drivers, such as drivers for high-speed

PCI devices, are simply not meant to execute in user mode and thus cannot be written with UMDF.

UMDF is designed specifically to support protocol device classes, which refers to devices that all use the same standardized, generic protocol and offer specialized functionality on top of it. These protocols currently include IEEE 1394 (FireWire), USB, Bluetooth, human interface devices (HIDs) and TCP/IP. Any device running on top of these buses (or connected to a network) is a potential candidate for UMDF. Examples include portable music players, input devices, cell phones, cameras and webcams, and so on. Two other users of UMDF are SideShow-compatible devices (auxiliary displays) and the Windows Portable Device (WPD) Framework, which supports USB-removable storage (USB bulk transfer devices). Finally, as with KMDF, it's possible to implement software-only drivers, such as for a virtual device, in UMDF.

Unlike KMDF drivers, which run as driver objects representing a SYS image file, UMDF drivers run in a driver host process (running the image %SystemRoot%\System32WUDHHost.exe), similar to a service-hosting process. The host process contains the driver itself, the User-Mode Driver Framework (implemented as a DLL), and a run-time environment (responsible for I/O dispatching, driver loading, device-stack management, communication with the kernel, and a thread pool).

As in the kernel, each UMDF driver runs as part of a stack. This can contain multiple drivers that are responsible for managing a device. Naturally, because user-mode code can't access the kernel address space, UMDF also includes components that allow this access to occur through a specialized interface to the kernel. This is implemented by a kernel-mode side of UMDF that uses ALPC—essentially an efficient inter-process communication mechanism to talk to the run-time environment in the user-mode driver host processes. (See Chapter 8 in Part 2 for more information on ALPC.) Figure 6-47 shows the architecture of the UMDF driver model.

![Figure](figures/Winternals7thPt1_page_605_figure_004.png)

FIGURE 6-47 UMDF architecture.

588   CHAPTER 6  I/O system


---

Figure 6-47 shows two different device stacks that manage two different hardware devices, each

with a UMDF driver running inside its own driver host process. From the diagram, you can see that the

following components comprise the architecture:

- ■ Applications  These are the clients of the drivers. They are standard Windows applications that
use the same APIs to perform I/Os as they would with a KMDF-managed or WDM-managed
device. Applications don't know (nor care) that they're talking to a UMDF-based device, and the
calls are still sent to the kernel's I/O manager.
■ Windows kernel (I/O manager)  Based on the application I/O APIs, the I/O manager builds
the IRPs for the operations, just like for any other standard device.
■ Reflector  The reflector is what makes UMDF "tick." It is a standard WDM filter driver
(%SystemRoot%\System32\Drivers\WUDFRd.Sys) that sits at the top of the device stack of each
device that is being managed by a UMDF driver. The reflector is responsible for managing the
communication between the kernel and the user-mode driver host process. IRPs related to
power management, Plug and Play, and standard I/O are redirected to the host process through
ALPC. This enables the UMDF driver to respond to the I/Os and perform work, as well as be
involved in the Plug and Play model, by providing enumeration, installation, and management
of its devices. Finally, the reflector is responsible for keeping an eye on the driver host processes
by making sure they remain responsive to requests within an adequate time to prevent drivers
and applications from hanging.
■ Driver manager  The driver manager is responsible for starting and quitting the driver host
processes, based on which UMDF-managed devices are present, and also for managing infor-
mation on them. It is also responsible for responding to messages coming from the reflector
and applying them to the appropriate host process (such as reacting to device installation). The
driver manager runs as a standard Windows service implemented in %SystemRoot%\System32\
WUDSvc.dll (hosted in a standard Svchost.exe), and is configured for automatic startup as soon
as the first UMDF driver for a device is installed. Only one instance of the driver manager runs
for all driver host processes (as is always the case with services), and it must always be running
to allow UMDF drivers to work.
■ Host process  The host process provides the address space and run-time environment for
the actual driver (WUDFHost.exe). Although it runs in the local service account, it is not actu-
ally a Windows service and is not managed by the SCM—only by the driver manager. The host
process is also responsible for providing the user-mode device stack for the actual hardware,
which is visible to all applications on the system. Currently, each device instance has its own
device stack, which runs in a separate host process. In the future, multiple instances may share
the same host process. Host processes are child processes of the driver manager.
■ Kernel-mode drivers  If specific kernel support for a device that is managed by a UMDF
driver is needed, it is also possible to write a companion kernel-mode driver that fills that role.
In this way, it is possible for a device to be managed both by a UMDF and a KMDF (or WDM)
driver.
CHAPTER 6   I/O system     589


---

You can easily see UMDF in action on your system by inserting a USB flash drive with some content

on it. Run Process Explorer, and you should see a WUDFHost.exe process that corresponds to a driver

host process. Switch to DLL view and scroll down until you see DLLs like the ones shown in Figure 6-48.

![Figure](figures/Winternals7thPt1_page_607_figure_001.png)

FIGURE 6-48  DLL in UMDF host process.

You can identify three main components, which match the architectural overview described earlier:

- ● WUDFHost.exe This is the UMDF host executable.

● WUDFx02000.dll This is the UMDF 2.x framework DLL.

● WUDFPlatform.dll This is the run-time environment.
## The power manager

Just as Windows Plug and Play features require support from a system's hardware, its power-management capabilities require hardware that complies with the Advanced Configuration and Power Interface (ACPI) specification, which is now part of the Unified Extensible Firmware Interface (UEFI). (The ACPI spec is available at http://www.uefi.org/specifications.)

The ACPI standard defines various power levels for a system and for devices. The six system power states are described in Table 6-13. They are referred to as S0 (fully on or working) through S5 (fully off). Each state has the following characteristics:

- ■ Power consumption This is the amount of power the system consumes.

■ Software resumption This is the software state from which the system resumes when moving

to a "more on" state.

■ Hardware latency This is the length of time it takes to return the system to the fully on state.
---

TABLE 6-13 System power-state definitions

<table><tr><td>State</td><td>Power Consumption</td><td>Software Resumption</td><td>Hardware Latency</td></tr><tr><td>S0 (fully on)</td><td>Maximum</td><td>Not applicable</td><td>None</td></tr><tr><td>S1 (sleeping)</td><td>Less than S0, more than S2</td><td>System resumes where it left off (returns to S0)</td><td>Less than 2 seconds</td></tr><tr><td>S2 (sleeping)</td><td>Less than S1, more than S3</td><td>System resumes where it left off (returns to S0)</td><td>2 or more seconds</td></tr><tr><td>S3 (sleeping)</td><td>Less than S2; processor is off</td><td>System resumes where it left off (returns to S0)</td><td>Same as S2</td></tr><tr><td>S4 (hibernating)</td><td>Trickle current to power button and wake circuitry</td><td>System restarts from saved hibernation file and resumes where it left off before hibernation (returns to S0)</td><td>Long and undefined</td></tr><tr><td>S5 (fully off)</td><td>Trickle current to power button</td><td>System boot</td><td>Long and undefined</td></tr></table>


As noted in Table 6-13, states S1 through S4 are sleeping states, in which the system appears to be off because of reduced power consumption. However, in these sleeping states, the system retains enough information—either in memory or on disk—to move to S0. For states S1 through S3, enough power is required to preserve the contents of the computer's memory so that when the transition is made to S0 (when the user or a device wakes up the computer), the power manager continues executing where it left off before the suspend.

When the system moves to S4, the power manager saves the compressed contents of memory to a hibernation file named Hiberfil.sys, which is large enough to hold the uncompressed contents of memory, in the root directory of the system volume (hidden file). (Compression is used to minimize dis I/O and to improve hibernation and resume-from-hibernation performance.) After it finishes saving memory, the power manager shuts off the computer. When a user subsequently turns on the computer, a normal boot process occurs, except that the boot manager checks for and detects a valid memory image stored in the hibernation file. If the hibernation file contains the saved system state, the boot manager launches %SystemRoot%\System32Winresume.exe, which reads the contents of the file into memory, and then resumes execution at the point in memory that is recorded in the hibernation file.

On systems with hybrid sleep enabled, a user request to put the computer to sleep will actually be a combination of both the S3 state and the S4 state. While the computer is put to sleep, an emergency hibernation file will also be written to disk. Unlike typical hibernation files, which contain almost all active memory, the emergency hibernation file includes only data that could not be paged in at a later time, making the suspend operation faster than a typical hibernation (because less data is written to disk). Drivers will then be notified that an S4 transition is occurring, allowing them to configure themselves and save state just as if an actual hibernation request had been initiated. After this point, the system is put in the normal sleep state just like during a standard sleep transition. However, if the power goes out, the system is now essentially in an S4 state—the user can power on the machine, and Windows will resume from the emergency hibernation file.

![Figure](figures/Winternals7thPt1_page_608_figure_005.png)

Note You can disable hibernation completely and gain some disk space by running powercfg /h off from an elevated command prompt.

CHAPTER 6   I/O system     591


---

The computer never directly transitions between states S1 and S4 (because that requires code execution, but the CPU is off in these states); instead, it must move to state S0 first. As illustrated in Figure 6-49, when the system is moving from any of states S1 through S5 to state S0, it's said to be waking, and when it's transitioning from state S0 to any of states S1 through S5, it's said to be sleeping.

![Figure](figures/Winternals7thPt1_page_609_figure_001.png)

FIGURE 6-49 System power-state transitions.

## Experiment: System power states

To view the supported power states, open an elevated command window and type in the command powercfg /a. You'll see output similar to the following:

```bash
C:\WINDOWS\system32\powercfg /a
The following sleep states are available on this system:
    Standby (S3)
    Hibernate
    Fast Startup
The following sleep states are not available on this system:
    Standby (S1)
        The system firmware does not support this standby state.
    Standby (S2)
        The system firmware does not support this standby state.
    Standby (S0 Low Power Idle)
        The system firmware does not support this standby state.
    Hybrid Sleep
        The hypervisor does not support this standby state.
```

Notice that the standby state is S3 and hibernation is available. Let's turn off hibernation and re-execute the command:

```bash
C:\WINDOWS\system32\powercfg /h off
C:\WINDOWS\system32\powercfg /a
```

592    CHAPTER 6  I/O system

---

```bash
The following sleep states are available on this system:
     Standby (S3)
  The following sleep states are not available on this system:
     Standby (S1)
        The system firmware does not support this standby state.
     Standby (S2)
        The system firmware does not support this standby state.
    Hibernate
        Hibernation has not been enabled.
     Standby (S0 Low Power Idle)
        The system firmware does not support this standby state.
  Hybrid Sleep
        Hibernation is not available.
        The hypervisor does not support this standby state.
  Fast Startup
        Hibernation is not available.
```

For devices, ACPI defines four power states, from D0 through D3. State D0 is fully on, while state D3 is fully off. The ACPI standard leaves it to individual drivers and devices to define the meanings of states D1 and D2, except that state D1 must consume an amount of power less than or equal to that consumed in state D0, and when the device is in state D2, it must consume power less than or equal to that consumed in D1.

Windows 8 (and later) splits the D3 state into two sub-states, D3-hot and D3-cold. In D3-hot state, the device is mostly turned off, but is not disconnected from its main power source, and its parent bus controller can detect the presence of the device on the bus. In D3-cold, the main power source is removed from the device, and the bus controller cannot detect the device. This state provides another opportunity for saving power. Figure 6-50 shows the device states and the possible state transitions.

Figure 6-50 shows the device states and the possible state transitions.

![Figure](figures/Winternals7thPt1_page_610_figure_004.png)

FIGURE 6-50 Device power-state transitions.

CHAPTER 6   I/O system    593


---

Before Windows 8, devices could only reach D3-hot state while the system is fully on (S0). The transition to D3-cold was implicit when the system went into a sleep state. Starting with Windows 8, a device’s power state can be set to D3-cold while the system is fully on. The driver that controls the device cannot put the device into D3-cold state directly; instead, it can put the device into D3-hot state, and then, depending on other devices on the same bus entering D3-hot states, the bus driver and firmware may decide to move all the devices to D3-cold. The decision whether to move the devices to D3-cold states depends on two factors: first, the actual ability of the bus driver and firmware, and second on the driver that must enable the transition to D3-cold either by specifying that in the installation INF file or by calling the SetD3ColdSupport function dynamically.

Microsoft, in conjunction with the major hardware OEMs, has defined a series of power management reference specifications that specify the device power states that are required for all devices in a particular class (for the major device classes: display, network, SCSI, and so on). For some devices, there's no intermediate power state between fully on and fully off, which results in these states being undefined.

## Connected Standby and Modern Standby

You may have noticed in the experiment above another system state called Standby (50 Low Power 1d1e). Although not an official ACPI state, it is a variant of 50 known as Connected Standby on Windows 8.x and later enhanced in Windows 10 (desktop and mobile editions) and called Modern Standby. The "normal" standby state (S3 above) is sometimes referred to as Legacy Standby.

The main problem with Legacy Standby is that the system is not working, and therefore, for example,

the user receives an email, the system can't pick that up without waking to S0, which may or may not

happen, depending on configuration and device capabilities. Even if the system wakes up to get that

email, it won't go immediately to sleep again. Modern Standby solves both issues.

Systems that support Modern Standby normally go into this state when the system is instructed to go to Standby. The system is technically still at S0, meaning the CPU is active and code can execute. However, desktop processes (non-UWP apps) are suspended, as well as UWP apps (most are not in the foreground and suspended anyway), but background tasks created by UWP apps are allowed to execute. For example, an email client would have a background task that periodically polls for new messages.

Being in Modern Standby also means that the system is able to wake to full 50 very quickly, some times referred to as instant On. Note that not all systems support Modern Standby, as it depends on the

chipset and other platform components (as can be seen in the last experiment, the system on which the

experiment ran does not support Modern Standby and thus supports Legacy Standby).

For more information on Modern Standby, consult the Windows Hardware documentation at https://msdn.microsoft.com/en-us/library/windows/hardware/ms28251(v=vs.85).aspx.

---

## Power manager operation

Windows power-management policy is split between the power manager and the individual device drivers. The power manager is the owner of the system power policy. This ownership means the power manager decides which system power state is appropriate at any given point, and when a sleep, hibernation, or shutdown is required, the power manager instructs the power-capable devices in the system to perform appropriate system power-state transitions.

The power manager decides when a system power-state transition is necessary by considering

several factors:

- ■ System activity level

■ System battery level

■ Shutdown, hibernate, or sleep requests from applications

■ User actions, such as pressing the power button

■ Control Panel power settings
When the PnP manager performs device enumeration, part of the information it receives about a device is its power-management capabilities. A driver reports whether its devices support device states D1 and D2 and, optionally, the latencies, or times required, to move from states D1 through D3 to D0. To help the power manager determine when to make system power-state transitions, bus drivers also return a table that implements a mapping between each of the system power states (S0 through S5) and the device power states that a device supports.

The table lists the lowest possible device power state for each system state and directly reflects the state of various power planes when the machine sleeps or hibernates. For example, a bus that supports all four device power states might return the mapping table shown in Table 6-14. Most device drivers turn their devices completely off (D3) when leaving S0 to minimize power consumption when the machine isn't in use. Some devices, however, such as network adapter cards, support the ability to wake up the system from a sleeping state. This ability, along with the lowest device power state in which the capability is present, is also reported during device enumeration.

TABLE 6-14 An example of system-to-device power mappings

<table><tr><td>System Power State</td><td>Device Power State</td></tr><tr><td>S0 (fully on)</td><td>D0 (fully on)</td></tr><tr><td>S1 (sleeping)</td><td>D1</td></tr><tr><td>S2 (sleeping)</td><td>D2</td></tr><tr><td>S3 (sleeping)</td><td>D2</td></tr><tr><td>S4 (hibernating)</td><td>D3 (fully off)</td></tr><tr><td>S5 (fully off)</td><td>D3 (fully off)</td></tr></table>


CHAPTER 6   I/O system   595


---

## Driver power operation

When the power manager decides to make a transition between system power states, it sends power

commands to a driver's power dispatch routine (IRP_M1_POWER). More than one driver can be responsi ble for managing a device, but only one of the drivers is designated as the device power-policy owner.

This is typically the driver that manages the FDO. This driver determines, based on the system state,

a device's power state. For example, if the system transitions between state S0 and S3, a driver might

decide to move a device's power state from D0 to D1.

Instead of directly informing the other drivers that share the management of the device of its decision, the device power policy owner asks the power manager, via the PoRequestPowerIrp function, to tell the other drivers by issuing a device power command to their power dispatch routines. This behavior enables the power manager to control the number of power commands that are active on a system at any given time. For example, some devices in the system might require a significant amount of current to power up. The power manager ensures that such devices aren't powered up simultaneously.

### EXPERIMENT: Viewing a driver's power mappings

You can use Device Manager to see a driver's system power state-to-driver power state mappings. To do so, open the Properties dialog box for a device, click the Details tab, click the Property drop-down list, and choose Power Data. The Properties dialog box also displays the current power state of the device, the device-specific power capabilities that it provides, and the power states from which it can wake the system:

![Figure](figures/Winternals7thPt1_page_613_figure_005.png)

Many power commands have corresponding query commands. For example, when the system is moving to a sleep state, the power manager will first ask the devices on the system whether the transition is acceptable. A device that is busy performing time-critical operations or interacting with device hardware might reject the command, which results in the system maintaining its current system powerstate setting.


CHAPTER 6 I/O system


From the Library of

---

## EXPERIMENT: Viewing the system power capabilities and policy

You can view a computer's system power capabilities by using the !pcows kernel debugger command. Here's the output of the command when run on an x64 Windows 10 laptop:

```bash
!kb: !pocaps
PopCapabilities @ 0xffff8035a98ce60
  Misc Supported Features:  PwrButton SlpButton Lid S3 S4 S5 HiberFile FullWake
  VideoDim
  Processor Features:      Thermal
  Disk Features:
  Battery Features:       BatteriesPresent
    Battery 0 - Capacity:      0 Granularity:     0
    Battery 1 - Capacity:      0 Granularity:     0
    Battery 2 - Capacity:      0 Granularity:     0
  Wake Caps:
    Ac OnLine Wake:        Sx
    Soft Lid Wake:          Sx
    RTC Wake:               S4
    Min Device Wake:        Sx
    Default Wake:           Sx
```

The M1sC Supported Features line reports that, in addition to S0 (fully on), the system supports system power states of S3, S4 and S5 (it doesn't implement S1 or S2) and has a valid hibernation file to which it can save system memory when it hibernates (state S4).

The Power Options page, which you open by selecting Power Options in the Control Panel, lets you configure various aspects of the system's power policy. The exact properties you can configure depend on the system's power capabilities.

![Figure](figures/Winternals7thPt1_page_614_figure_005.png)

CHAPTER 6 I/O system     597

---

Notice that OEMs can add power schemes. These schemes can be listed by typing the powercfg /list command as shown here:

```bash
C:\WINDOWS\system32>powercfg /list
Existing Power Schemes (* Active)
---------------------
Power Scheme GUID: 381b4222-f694-41f0-9685-ff5bb260df2a (Balanced)
Power Scheme GUID: 8759706d-706b-4c22-b2ec-f91ef1ef6ed38 (HP Optimized
(recommended)) *
Power Scheme GUID: 8c57e7fda-e8bf-4a96-9a85-4ae23a8c635c (High performance)
Power Scheme GUID: a4143008-3541-4faf-bc81-f7155f6f20da (Power saver)
```

By changing any of the preconfigured plan settings, you can set the idle detection timeouts that control when the system turns off the monitor, spins down hard disks, goes to standby mode (moves to system power state S3 in the previous experiment), and hibernates (moves the system to power state S4). In addition, selecting the Change Plan Settings link lets you specify the power-related behavior of the system when you press the power or sleep buttons or close a laptop's lid.

![Figure](figures/Winternals7thPt1_page_615_figure_003.png)

The Change Advanced Power Settings link directly affects values in the system's power policy, which you can display with the !popolicy debugger command. Here's the output of the command on the same system:

```bash
!kbd: #popPolicy
SYSTEM_POWER_POLICY (R.1) @ 0xffff88035a98cc64
    PowerButton:        Sleep   Flags:     00000000    Event:   00000000
    SleepButton:        Sleep   Flags:     00000000    Event:   00000000
    LidClose:            None   Flags:     00000000    Event:   00000000
    Idle:                Sleep   Flags:     00000000    Event:   00000000
```

598   CHAPTER 6   I/O system

---

```bash
OverThrottled:
    None  Flags: 00000000  Event: 00000000
IdleTimeout:
    0  IdleSensitivity:
    90%
MinSleep:
    S3  MaxSleep:
    53
LidOpenWake:
    S0  FastSleep:
    53
WinLogonFlags:
    1  S4Timeout:
    0
VideoTimeout:
    600  VideoDim:
    0
SpinTimeout:
    4b0  OptForPower:
    0
FanToilence:
    0%  ForcedThrottle:
    0%
MinThrottle:
    0%  DynamicThrottle:
    None (0)
```

The first lines of the display correspond to the button behaviors specified in the Power Options Advanced Settings window. On this system, both the power and the sleep buttons put the computer in a sleep state. Closing the lid, however, does nothing. The timeout values shown near the end of the output are expressed in seconds and displayed in hexadecimal notation. The values reported here directly correspond to the settings configured in the Power Options window. For example, the video timeout is 600, meaning the monitor turns off after 600 seconds (because of a bug in the debugging tools used here, it's displayed in decimal), or 10 minutes. Similarly, the hard disk spin-down timeout is 0x4b0, which corresponds to 1200 seconds, or 20 minutes.

## Driver and application control of device power

In addition to responding to power manager commands related to system power-state transitions, a driver can unilaterally control the device power state of its devices. In some cases, a driver might want to reduce the power consumption of a device it controls if the device is left inactive for a period of time. Examples include monitors that support a dimmed mode and disks that support spin-down. A driver can either detect an idle device itself or use facilities provided by the power manager. If the device uses the power manager, it registers the device with the power manager by calling the PoRegisterDeviceForIdleDetection function.

This function informs the power manager of the timeout values to use to detect whether a device is idle and, if so, the device power state that the power manager should apply. The driver specifies two timeouts: one to use when the user has configured the computer to conserve energy and the other to use when the user has configured the computer for optimum performance. After calling PoRegisterDeviceForIdleDetection, the driver must inform the power manager, by calling the PoSetDeviceBusy or PoSetDeviceBusyEx functions, whenever the device is active, and then register for idle detection again to disable and re-enable it as needed. The PoStartDeviceBusy and PoEndDeviceBusy APIs are available as well, which simplify the programming logic required to achieve the behavior just described.

Although a device has control over its own power state, it does not have the ability to manipulate the system power state or to prevent system power transitions from occurring. For example, if a badly designed driver doesn’t support any low-power states, it can choose to remain on or turn itself completely off without hindering the system’s overall ability to enter a low-power state—this is because the power manager only notifies the driver of a transition and doesn’t ask for consent. Drivers do receive a power query IRP (IRP_MN_QUERY_POWER) when the system is about to transition to a lower power state.

CHAPTER 6 I/O system 599


---

The driver may veto the request, but the power manager does not have to comply; it may delay transi tion if possible (e.g., the device is running on a battery that is not critically low); transition to hibernation,

however, can never fail.

Although drivers and the kernel are chiefly responsible for power management, applications are also allowed to provide their input. User-mode processes can register for a variety of power notifications, such as when the battery is low or critically low, when the machine has switched from DC (battery) to AC (adapter/charger) power, or when the system is initiating a power transition. Applications can never veto these operations, and they can have up to two seconds to clean up any state necessary before a sleep transition.

## Power management framework

Starting with Windows 8, the kernel provides a framework for managing power states of individual components (sometimes called functions) within a device. For example, suppose an audio device has playback and recording components, but if the playback component is active and the recording component is not, it would be beneficial to put the recording component into a lower power state. The power management framework (PoFx) provides an API that drivers can use to indicate their components’ power states and requirements. All components must support the fully-on state, identified as F0. Higher-number F-states indicate lower power states that a component may be in, where each higher F-state represents a lower power consumption and higher transition time to F0. Note that F-state management has meaning only when the device is in power state D0, because it’s not working at all in higher D-states.

The power policy owner of the device (typically the FDO) must register with PoFy by calling the

PoFyRegisterDevice function. The driver passes along the following information in the call:

- ■ The number of components within the device.
■ A set of callbacks the driver can implement to be notified by PoFx when various events occur,
such as switching to active or idle state, switching the device to D0 state and sending power
control codes (see the WDK for more information).
■ For each component, the number of F-states it supports.
■ For each component, the deepest F-state from which the component can wake.
■ For each component, for each F-state, the time required to return from this state to F0, the min-
imum amount of time the component can be in this F-state to make the transition worthwhile,
and the nominal power the component consumes in this F-state. Or, it can be set to indicate
that the power consumption is negligible and is not worth considering when PoFx decides to
wake several components simultaneously.
POFx uses this information—combined with information from other devices and system-wide power

state information, such as the current power profile—to make intelligent decisions for which power

F-state a particular component should be in. The challenge is to reconcile two conflicting objectives:

first, ensuring that an idle component consumes as little power as possible, and second, making sure a

600 CHAPTER 6 I/O system


---

component can transition to the F0 state quickly enough so that the component is perceived as always on and always connected.

The driver must notify PoFx when a component needs to be active (F0 state) by calling PoFxActivateComponent. Sometime after this call, the corresponding callback is invoked by PoFx, indicating to the driver that the component is now at F0. Conversely, when the driver determines the component is not currently needed, it calls PofxIdleComponent to tell PoFx, which responds by transitioning the component to a lower-power F-state and notifies the driver once it does.

## Performance state management

The mechanisms just described allow a component in an idle condition (non-F0 states) to consume less power than in F0. But some components can consume less power even in state F0, related to the actual work a device is doing. For example, a graphic card may be able to use less power when showing a mostly static display, whereas it would need higher power when rendering 3D content in 60 frames per second.

In Windows 8.x such drivers would have to implement a propriety performance state selection algorithm and notify an OS service called platform extension plug-in (PEP). PEP is specific to a particular line of processors or system on a chip (SoC). This makes the driver code tightly coupled to the PEP.

Windows 10 extends the PoFx API for performance state management, prompting the driver code to

use standard APIs and not worry about the particular PEP on the platform. For each component, PoFx

provides the following types of performance states:

- ■ A discrete number of states in the frequency (Hz), bandwidth (bits per second), or an opaque

number meaningful to the driver.

■ A continuous distribution of states between a minimum and maximum (frequency, bandwidth,

or custom).
An example of this is for a graphic card to define a discrete set of frequencies in which it can operate, thus indirectly affecting its power consumption. Similar performance sets could be defined for its bandwidth usage, if appropriate.

To register with PoFx for performance state management, a driver must first register the device with

PoFx (PoFxrRegisterDevice) as described in the previous section. Then, the driver calls PoFxrRegister ComponentPerfStates, passing performance details (discrete or range-based, frequency, bandwidth,

or custom) and a callback when state changes actually occur.

When a driver decides that a component should change performance state, it calls POFxIssue PerfStateChange or POFxIssuePerfStateChangeMultiple. These calls request the PEP to place the

component in the specified state (based on the provided index or value, depending on whether the set

is for a discrete state or range-based). The driver may also specify that the call should be synchronous,

asynchronous or "don't care," in which case the PEP decides. Either way, Pofx will eventually call into

the driver-registered callback with the performance state, which may be the requested one, but it can

also be denied by the PEP. If accepted, the driver should make the appropriate calls to its hardware to

make the actual change. If the PEP denies the request, the driver may try again with a new call to one of

the aforementioned functions. Only a single call can be made before the driver's callback is invoked.

CHAPTER 6   I/O system      601


---

## Power availability requests

Applications and drivers cannot veto sleep transitions that are already initiated. However, certain

scenarios demand a mechanism for disabling the ability to initiate sleep transitions when a user is

interacting with the system in certain ways. For example, if the user is currently watching a movie and

the machine would normally go idle (based on a lack of mouse or keyboard input after 15 minutes), the

media player application should have the capability to temporarily disable idle transitions as long as

the movie is playing. You can probably imagine other power-saving measures that the system would

normally undertake, such as turning off or even just dimming the screen, that would also limit your en joyment of visual media. In legacy versions of Windows, SetThreadExecutionState was a user-mode

API capable of controlling system and display idle transitions by informing the power manager that a

user was still present on the machine. However, this API did not provide any sort of diagnostic capabili ties, nor did it allow sufficient granularity for defining the availability request. Also, drivers could not

issue their own requests, and even user applications had to correctly manage their threading model,

because these requests were at the thread level, not at the process or system level.

Windows now supports power request objects, which are implemented by the kernel and are bonafide object manager-defined objects. You can use the WinObj utility from Sysinternals (more details on this tool are in Chapter 8 in Part 2) and see the PowerRequest object type in the \ObjectTypes directory, or use the !object kernel debugger command on the \ObjectTypes\PowerRequest object type, to validate this.

Power availability requests are generated by user-mode applications through the PowerCreate Request API and then enabled or disabled with the PowerSetRequest and PowerClearRequest APIs,

respectively. In the kernel, drivers use PoCreatePowerRequest, PoSetPowerRequest, and PoClear PowerRequest. Because no handles are used, PoDeletePowerRequest is needed to remove the refer ence on the object (while user mode can simply use CloseHandle).

There are four kinds of requests that can be used through the Power Request API:

- ■ System request This type request asks that the system not automatically go to sleep due to
the idle timer (although the user can still close the lid to enter sleep, for example).
■ Display request This type of request does the same as a system request, but for the display.
■ Away-mode request This is a modification to the normal sleep (S3 state) behavior of Windows,
which is used to keep the computer in full powered-on mode but with the display and sound
card turned off, making it appear to the user as though the machine is really sleeping. This be-
havior is normally used only by specialized set-top boxes or media center devices when media
delivery must continue even though the user has pressed a physical sleep button, for example.
■ Execution required request This type of request (available starting with Windows 8 and Server
2012) requests a UWP app process continue execution even if normally the Process Lifecycle Man-
ager (PLM) would have terminated it (for whatever reason); the extended length of time depends
on factors such as the power policy settings. This request type is only supported for systems that
support Modern Standby, otherwise this request is interpreted as a system request.
---

### EXPERIMENT: Viewing power availability requests

Unfortunately, the power request kernel object that's created with a call such as PowerCreate Request is unavailable in the public symbols. However, the Powercfg utility provides a way to

list power requests without any need for a kernel debugger. Here's the output of the utility while

playing a video and a stream audio from the web on a Windows 10 laptop:

```bash
C:\WINDOWS\system32\powercfg /requests
DISPLAY:
[PROCESS] \Device\HarddiskVolume4\Program Files\WindowsApps\Microsoft.
ZuneVideo_10.16092.10311_0_x64__8wekyb3d8bbwe\Video.UI.exe
Windows Runtime Package: Microsoft.ZuneVideo_8wekyb3d8bbwe
SYSTEM:
[DRIVER] Conexant ISST Audio (INTELAUDIO\FUNC_01&VEN_14F1&DEV_S0F4&SUBSYS_103C80D3&R
EV_1001\&41a10da&00001)
An audio stream is currently in use.
[PROCESS] \Device\HarddiskVolume4\Program Files\WindowsApps\Microsoft.
ZuneVideo_10.16092.10311_0_x64__8wekyb3d8bbwe\Video.UI.exe
Windows Runtime Package: Microsoft.ZuneVideo_8wekyb3d8bbwe
AWAYMODE:
None.
EXECUTION:
None.
PERFBOOST:
None.
ACTIVELOCKSCREEN:
None.
```

The output shows six request types (as opposed to the four described previously). The last two—perfboost and active lockscreen—are declared as part of an internal power request type in a kernel header, but are otherwise currently unused.

## Conclusion

The I/O system defines the model of I/O processing on Windows and performs functions that are common to or required by more than one driver. Its chief responsibilities are to create IRPs representing I/O requests and to shepherd the packets through various drivers, returning results to the caller when an I/O is complete. The I/O manager locates various drivers and devices by using I/O system objects, including driver and device objects. Internally, the Windows I/O system operates asynchronously to achieve high performance and provides both synchronous and asynchronous I/O capabilities to usermode applications.

CHAPTER 6 I/O system   603


---

Device drivers include not only traditional hardware device drivers but also file-system, network, and layered filter drivers. All drivers have a common structure and communicate with each other and the I/O manager by using common mechanisms. The I/O system interfaces allow drivers to be written in a high-level language to lessen development time and to enhance their portability. Because drivers present a common structure to the operating system, they can be layered one on top of another to achieve modularity and reduce duplication between drivers. By using the Universal DDI baseline, drivers can target multiple devices and form factors with no code changes.

Finally, the role of the PnP manager is to work with device drivers to dynamically detect hardware

devices and to build an internal device tree that guides hardware device enumeration and driver instal lation. The power manager works with device drivers to move devices into low-power states when

applicable to conserve energy and prolong battery life.

The next chapter touches on one of the most important aspects of today's computer systems: security.

---

