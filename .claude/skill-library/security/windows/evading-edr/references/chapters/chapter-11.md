## 11 EARLY LAUNCH ANTIMALWARE DRIVERS

![Figure](figures/EvadingEDR_page_227_figure_001.png)

In 2012, adversaries launched the Zacinlo adware campaign, whose rootkit, a member of the Detrahere family, includes a number of self-protection features. One of the most

interesting is its persistence mechanism.

Similar to the callback routines discussed in Chapters 3 through 5, drivers can register callback routines called shutdown handlers that let them perform some action when the system is shutting down. To ensure that their rootkit persisted on the system, the Zacinlo rootkit developers used a shutdown handler to rewrite the driver to disk under a new name and create new registry keys for a service that would relaunch the rootkit as a boot-start driver. If anyone made an attempt to clean the rootkit from the system, the driver would simply drop these files and keys, allowing it to persuit much more effectively.

While this malware is no longer prevalent, it highlights a large gap in protection software: the ability to mitigate threats that operate early in the boot process. To address this weakness, Microsoft introduced a new antimalware feature in Windows 8 that allows certain special drivers to load

---

before all other boot-start drivers. Today, nearly all EDR vendors leverage this capability, called Early Launch Antimachine (ELAM), in some way, as it offers the ability to affect the system extremely early in the boot process. It also provides access to specific types of system telemetry not available to other components.

This chapter covers the development, deployment, and boot-start protection functionality of ELAM drivers, as well as strategies for evading these drivers. In Chapter 12, we'll cover the telemetry sources and process protections available to vendors that deploy ELAM drivers to hosts.

## How ELAM Drivers Protect the Boot Process

Microsoft lets third-party drivers load early in the boot process so that software vendors can initialize those that are critical to the system. However, this is a double-edged sword. While it provides a useful way to guarantee the loading of critical drivers, malware authors too can insert their rootkits into these early-load-order groups. If a malicious driver is able to load before antivirus or other security-related drivers, it could tamper with the system to keep those protection drivers from working as intended or prevent them from loading in the first place.

To avoid these attacks, Microsoft needed a way to load endpoint security drivers earlier in the boot process, before any malicious driver can load. The primary function of an ELAM driver is to receive notifications when another driver attempts to load during the boot process, then decide whether to allow it to load. This validation process is part of Trusted Boot, the Windows security feature responsible for validating the digital signature of the kernel and other components, like drivers, and only vetted antimalware vendors can participate in it.

To publish an ELAM driver, developers must be part of the Microsoft Virus Initiative (MVI), a program open to antimalware companies that produce security software for the Windows operating system. As of this writing, in order to qualify to participate in this program, vendors must have a positive reputation (assessed by conference participation and industry-standard reports, among other factors), submit their applications to Microsoft for performance testing and feature review, and provide their solution for independent testing. Vendors must also sign a nondisclosure agreement, which is likely why those with knowledge of this program have been tight-lipped.

The Microsoft Virus Initiative and ELAM are closely tied. To create a production driver (one that can be deployed to systems not in test-signing mode), Microsoft must countersign the driver. This countersignature uses a special certificate, visible in the ELAM driver's digital signature information under Microsoft Windows Early Launch Anti-malware Publisher , as shown in Figure 11 - 1 . This countersignature is available to participants of the Microsoft Virus Initiative program only.

202 Chapter 11

---

![Figure](figures/EvadingEDR_page_229_figure_000.png)

Figure 11-1: Microsoft's countersignature on an ELAM driver

Without this signature, the driver won't be able to load as part of the Early-Launch service group discussed in "Loading an ELAM Driver" on page 208. For this reason, the examples in this chapter target a system with test-signaling enabled, allowing us to ignore the countersensing requirement. The process and code described here are the same as for production ELAM drivers.

## Developing ELAM Drivers

In many ways, ELAM drivers resemble the drivers covered in the previous chapters; they use callbacks to receive information about system events and make security decisions on the local host. ELAM drivers focus specifically on prevention rather than detection, however. When an ELAM driver is started early in the boot process, it evaluates every bootstart driver on the system and either approves or denies the load based on its own internal malware-signature data and logic, as well as a system policy that dictates the host's risk tolerance. This section covers the process of developing an ELAM driver, including its internal workings and decision logic.

### Registering Callback Routines

The first ELAM-specific action the driver takes is to register its callback roubutions. ELAM drivers commonly use both registry and bootstart callbacks. The registry callback functions, registered with atCoRegisterCallbackEx() , validate the configuration data of the drivers being loaded in the registry, and we covered them extensively in Chapter 5, so we won't revisit them here.

More interesting is the boot-start callback routine, registered with mtIOregisterBootDriverCallback(). This callback provides the ELAM driver

Early Launch Antimalware Drivers 203

---

with updates about the status of the boot process, as well as information about each boot-start driver being loaded. Boot-start callback functions are passed to the registration function as a PBOOT_DRIVER_CALLBACK_FUNCTION and must have a signature matching the one shown in Listing 11-1 .

```bash
/****************************************************************
void BootDriverCallbackFunction(
        PVOID CallbackContext,
    BDCB_CALLBACK_TYPE Classification,
    PBDCB_IMAGE_INFORMATION ImageInformation
)
```

Listing 11-1: An ELAM driver callback signature

During the boot process, this callback routine receives two different types of events, dictated by the value in the Classification input parameter. These are defined in the BDCB_CALLBACK_TYPE enum shown in Listing 11-2.

```bash
typedef enum _BDCB_CALLBACK_TYPE {
    BDCbStatusUpdate,
    BDCbInitializeImage,
} BDCB_CALLBACK_TYPE,*PBCDB_CALLBACK_TYPE;
```

Listing 11-2: The BDCB_CALLBACK_TYPE enumeration

The 80d5StatusIsUpdate events tell the ELAM driver how far the system has gotten in the process of loading boot-start drivers so that the driver may act appropriately. It can report any of three states, shown in Listing 11-3.

```bash
typedef enum _BDCB_STATUS_UPDATE_TYPE {
    BDCbStatusPrepareForDependencyLoad,
    BDCbStatusPrepareForDriverLoad,
    BDCbStatusPrepareForUnload
} BDCB_STATUS_UPDATE_TYPE, *PBDCB_STATUS_UPDATE_TYPE;
```

Listing 11-3: The BDCB_STATUS_UPDATE_TYPE values

The first of these values indicates that the system is about to load driver dependencies. The second indicates that the system is about to load bootstart drivers. The last indicates that all boot-start drivers have been loaded, so the ELAM driver should prepare to be unloaded.

During the first two states, the ELAM driver will receive another type of event that correlates to the loading of a boot-start driver's image. This event, passed to the callback as a pointer to a BDC_IMAGE_INFORMATION structure, is defined in Listing 11-4.

```bash
typedef struct _BOCB_IMAGE_INFORMATION {
    BDCB_CLASSIFICATION Classificatlon;
    ULONG ImageFlags;
    UNICODE_STRING ImageName;
    UNICODE_STRING RegistryPath;
    UNICODE_STRING CertificatePublisher;
    UNICODE_STRING CertificateIssuer;
```

204 Chapter Ⅱ

---

```bash
PWOID ImageHash;
  PWOID CertificateThumbnailprint;
  ULONG ImageHashAllAlgorithm;
  ULONG ImageHashNoAllAlgorithm;
  ULONG ImageHashLength;
  ULONG CertificateThumbnailLength;
} BCDC_IMAGE_INFORMATION, *PBDC_IMAGE_INFORMATION;
```

Listing 11-4: The BDCB_IMAGE_INFORMATION structure definition

As you can see, this structure contains the bulk of the information used to decide whether some driver is a rootkit. Most of it relates to the image's digital signature, and it notably omits a few fields you might expect to see, such as a pointer to the contents of the image on disk. This is due in part to the performance requirements imposed on ELAM drivers. Because they can affect system boot times (as they're initialized every time Windows boots), Microsoft imposes a time limit of 0.5 ms for the evaluation of each boot-start driver and 50 ms for the evaluation of all boot-start drivers together, within a 128KB memory footprint. These performance requirements limit what an ELAM driver can do; for instance, it is too timeintensive to scan the contents of an image. Therefore, developers typically rely on static signatures to identify malicious drivers.

During the boot process, the operating system loads the signatures in use by ELAM drivers into an early-launch drivers registry hive under $HKLM\ELAM\,~$ followed by the vendor's name (for example, $HKLM\backslash$ $ELAM\backslashWindows Defender$ for Microsoft Defender, shown in Figure 11 - 2 ). This hive is unloaded later in the boot process and is not present in the registry by the time users start their sessions. If the vendor wishes to update signatures in this hive, they may do so from user mode by mounting the hive containing the signatures from %SystemRoot%\System32\config\ELAM and modifying their key.

![Figure](figures/EvadingEDR_page_231_figure_004.png)

Figure 11-2: Microsoft Defender in the ELAM registry hive

Early Launch Antimalware Drivers 205

---

Vendors can use three values of the type REG_BINARY in this key: Measured, Policy, and Config. Microsoft hasn't published formal public documentation about the purposes of these values or their differences. However, the company does state that the signature data blob must be signed and its integrity validated using Cryptography API: Next Generation (CNG) primitive cryptographic functions before the ELAM driver begins making decisions regarding the status of the boot-start driver.

No standard exists for how the signature blobs must be structured or used once the ELAM driver has verified their integrity. In case you're interested, however, in 2018 the German Bundesamt fur Sicherheit in der Informationstechnik (BSI) published its Work Package 5, which includes an excellent walk-through of how Defender's wdboot.sys performs its own integrity checks and parses its signature blocks.

If the cryptographic validation of the signature blob fails for any reason, the ELAM driver must return the 0x0C11ClassificationUnknownImage classification for all boot-start drivers using its callback, as the signature data isn't considered reliable and shouldn't affect Measured Boot, the Windows feature that measures each boot component from the firmware to the drivers and stores the results in the Trusted Platform Module (TPM), where it can be used to validate the integrity of the host.

## Applying Detection Logic

Once the ELAM driver has received the BDCBStatusPreparedForDriverLoad status update and pointers to BDCB_IMAGE_INFORMATION structures for each bootload driver, it applies its detection logic using the information provided in the structure. Once it has made a determination, the driver updates the Classification member of the current image-information structure (not to be confused with the Classification input parameter passed to the callback function) with a value from the BDCB_CLASSIFICATION enumeration, defined in Listing 11-5.

```bash
typedef enum _BDCB_CLASSIFICATION {
    BdcbClassificationUnknownImage,
    BdcbClassificationUnknownGoodImage,
    BdcbClassificationUnknownBadImage,
    BdcbClassificationKnownBadImageBootCritical,
    BdcbClassificationUnknown,
} BDCB_CLASSIFICATION, *PBDCB_CLASSIFICATION;
```

Listing 11-5: The BDCB_CLASSIFICATION enumeration

Microsoft defines these values as follows, from top to bottom: the image hasn't been analyzed, or a determination regarding its maliciousness can't be made; the ELAM driver has found no malware; the ELAM driver detected malware; the boot-load driver is malware, but it is critical to the boot process; and the boot-load driver is reserved for system use. The ELAM driver sets one of these classifications for each boot-start driver until it receives the 8cDxStatusPrepareForload status update instructing it to clean up. The ELAM driver is then unloaded.

206 Chapter Ⅱ

---

Next, the operating system evaluates the classifications returned by each ELAM driver and takes action if needed. To determine which action to take, Windows consults the registry key HKLM\System\CurrentControlSet\ Control\EarlyLaunchDriverLoadPolicy, which defines the drivers allowed to run on the system. This value, read by nt!fpInitializeBootDrivers(), can be any of the options included in Table 11-1.

Table 11-1: Possible Driver Load-Policy Values

<table><tr><td>Value</td><td>Description</td></tr><tr><td>0</td><td>Good drivers only</td></tr><tr><td>1</td><td>Good and unknown drivers</td></tr><tr><td>3</td><td>Good, unknown, and bad but critical to the boot process (Default)</td></tr><tr><td>7</td><td>All drivers</td></tr></table>

The kernel (specifically, the Plug and Play manager) uses the classification specified by the ELAM driver to prevent any banned drivers from loading. All other drivers are allowed to load, and system boot continues as normal.

NOTE

If the ELAM driver identifies a known malicious boot-start driver and is running on a system that leverages Measured Boot, developers must call tbsi!Revoke \_Attestation(). What this function does is a bit technical; essentially, it extends a platform configuration register bank in the TPM, specifically PCR[12], by an unspecified value and then increments the TPM's event counter, breaking trust in the security state of the system.

## An Example Driver: Preventing Mimidrv from Loading

The debugger output in Listing 11-6 shows debug messaging from an ELAM driver when it encounters a known malicious driver, Mimikat2's Mimidrv, and prevents it from loading.

```bash
[ElamProcessInitializeImage] The following boot start driver is about to be initialized:
    Image name: \SystemRoot\System32\Drivers\Wup.sys
    Registry Path: Registry\Machine\System\CurrentControlSet\Services\Wup
    Image Hash Algorithm: 0x0000800c
    Image Hash: cff2b679a5ce16d028143a292ae56f9117b16c4fd2481c7e0da3ce328b1a88f
    Signer: Microsoft Windows
    Certificate Issuer: Microsoft Windows Production PCA 2011
    Certificate Thumbprint Algorithm: 0x0000800c
    Certificate Thumbprint: a22f7e73525d5fc0696e4155b5a382c854eec85b6912aaaf4711f7676a073
[ElamProcessInitializeImage] The following boot start driver is about to be initialized:
[ElamProcessInitializeImage] Found a suspected malicious driver (\SystemRoot\System32\drivers\
minidrv.sys), Marking its classification accordingly
[ElamProcessInitializeImage] The following boot start driver is about to be initialized:
    Image name: \SystemRoot\System32\drivers\iorate.sys
    Registry Path: Registry\Machine\System\CurrentControlSet\Services\iorate
    Image Hash Algorithm: 0x0000800c
```

Early Launch Antimolware Drivers 207

---

```bash
Image Hash: 0478adbeaac54a48664ad00704df17decbc21931f9a7112f9cc527497faf6566
    Signer: Microsoft Windows
    Certificate Issuer: Microsoft Windows Production PCA 2011
    Certificate Thumbprint Algorithm: 0x000080c
    Certificate Thumbprint: 3cd79fdbdc76f39ab4855ddfae8ff86f240810e8ec3c037146b8bc5052efc08
```

Listing 11-6: ELAM driver output showing the detection of Mimidrv

In this example, you can see that the ELAM driver allows other bootstart drivers to load; the native Universal Naming Convention driver, mup.sys, and the Disk I/O Rate Filter driver, iorate.sys, both of which are signed by Microsoft. Between these two drivers, it detects Mimidrv using the file's known cryptographic hash. Because it deems this driver to be malicious, it prevents Mimidrv from loading on the system before the operating system is fully initialized and without requiring any interaction from the user or other EDR components.

## Loading an ELAM Driver

Before you can load your ELAM driver, you must complete a few preparatory steps signing the driver and assigning its load order.

### Signing the Driver

The most headache-inducing part of deploying an ELAM driver, especially during development and testing, is ensuring that its digital signature meets Microsoft's requirements for loading on the system. Even when operating in test-signing mode, the driver must have specific certificate attributes.

Microsoft publishes limited information about the process of test-signing an ELAM driver. In its demo, Microsoft says the following:

Early Launch drivers are required to be signed with a codesigning certificate that also contains the Early Launch EKU "1.3.6.1.4.1.311.61.4.1" [...] and the "1.3.6.1.5.5.7.3.3" Code Signing EKU. Once a certificate of this form has been created, sigmoid.exe can be used to sign [the ELAM driver].

In test-signing scenarios, you can create a certificate with these EKUs by running makecert.exe, a utility that ships with the Windows SDK, in an evolved command prompt. Listing 11-7 demonstrates the syntax for doing this.

```bash
PS & 'C:\Program Files (x86)\Windows Kits\10\bin\10.0.19042.0\x64\makecert.exe'
>> -a SHA256 -r pe
>> -ss PrivateCertStore
>> -n "CN-DevElamCert"
>> -sr localmachine
>> -eku 1.3.6.1.4.1.311.61.4.1.1.3.6.1.5.5.7.3.3
>> C:\Users\dev\Desktop\DevElamCert.cer
```

Listing 11-7. Generating a self-signed certificate

208 Chapter Ⅱ

---

This tool supports a robust set of arguments, but only two are really relevant to ELAM. This first is the -eku option, which adds the Early Launch AntennaDriver and Code Signing object identifiers to the certificate. The second is the path to which the certificate should be written.

When makecert.exe completes, you'll find a new self-signed certificate written to the specified location. This certificate should have the necessary object identifiers, which you can validate by opening the certificate and viewing its details, as shown in Figure 11-3.

![Figure](figures/EvadingEDR_page_235_figure_002.png)

Figure 11-3: ELAM EKUs included in the certificate

Next, you can use signtool.exe , another tool from the Windows SDK, to sign the compiled ELAM driver. Listing 11-8 shows an example of doing this using the previously generated certificate.

```bash
PS > & 'C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe'
>> sign
>> /fd SHA256
>> /a
>> /ph
>> /c "PrivateCertStore"
>> /m "MyTamCert"
>> ./tx http://sha256timestamp.ws.symantec.com/sha256/timestamp
>> .\velamdriver.sys
```

Listing 11-8: Signing an ELAM driver with sightool.exe

Early Launch Antimalware Drivers 209

---

Like makecert.exe, this tool supports a large set of arguments, some of which aren't particularly important to ELAM. First, the /fd argument specifies the file-digest algorithm to use for signing the certificate (SHA256 in our case). The /fb argument instructs signout.exe to generate page hashes for executable files. Versions of Windows starting with Vista use these hashes to verify the signature of each page of the driver as it is loaded into memory. The /tr argument accepts the URL of a timestamp server that allows the certificate to be appropriately timed-stamped (see RFC 5161 for details about the Time-Stamp Protocol). Developers can use a number of publicly available servers to complete this task. Lastly, the tool accepts the file to sign (in our case, the ELAM driver).

Now we can inspect the driver's properties to check whether it is signed with the self-signed certificate and a countersignature from the timestamp server, as shown in Figure 11 - 4 .

![Figure](figures/EvadingEDR_page_236_figure_002.png)

Figure 11-4: A signed driver with the timestamp included

If so, you may deploy the driver to the system. As for most drivers, the system uses a service to facilitate the driver's loading at the desired time. To function properly, the ELAM driver must load very early in the boot process. This is where the concept of load-order grouping comes into play.

## Setting the Load Order

When creating a boot-start service on Windows, the developer can specify when it should be loaded in the boot order. This is useful in cases when the driver depends on the availability of another service or otherwise needs to load at a specific time.

210 Chapter 11

---

The developer can't specify any arbitrary string for the load-order group, however. Microsoft keeps a list containing most of the groups available in the registry at HKLM:\SYSTEM\CurrentControlSet(Control\ ServiceGroupOrder, which you can retrieve easily, as shown in Listing 11-9.

```bash
PS> (Get-ItemProperty -Path HKLM:\SYSTEM\currentControlSet\control\ServiceGroupOrder).List
System Reserved
EMS
WdfLoadGroup
Boot Bus Extender
System Bus Extender
SCSI miniport
Port
Primary Disk
SCSI Class
SCSI CDROM Class
FSFilter Infrastructure
FSFilter System
FSFilter Bottom
FSFilter Copy Protection
--snip--
```

Listing 11-9: Retrieving service-load-order groups from the registry with PowerShell

This command parses the values of the registry key containing the load-order group names and returns them as a list. At the time of this writing, the registry key contains 70 groups.

Microsoft instructs ELAM driver developers to use the Early-Launch load-order group, which is notably missing from the ServiceGroupOrder key. No other special loading requirements exist, and you can do it simply by using sc.exe or the advapi32CreateService(). Win32 API. For example, Listing 11-10 loads WdBoot, an ELAM service that ships with Windows 10 and is used to load Defender's boot-start driver of the same name.

```bash
PS C:\> Get-ItemProperty -Path HKLM:\SYSTEM\currentControlSet\Services\WdBoot | >
 select PSCildName, Group, ImagePath | fl
PSCildName : WdBoot
Group        : Early-Launch
ImagePath     : system32\drivers\wd\WdBoot.sys
```

Listing 11-10: Inspecting Defender's WdBoot ELAM driver

This command collects the name of the service, its load-order group, and the path to the driver on the filesystem.

If you step inside the process of loading the ELAM drivers, you'll find that it's primarily the responsibility of the Windows bootloader, winload.efi . The bootloader, a complex piece of software in its own right, performs a few actions. First, it searches the registry for all boot-start drivers on the system in the early-launch group and adds them to a list. Next, it loads core drivers, such as the System Guard Runtime Monitor (smgrmont.sys) and

Early launch Antimalware Drivers 21

---

the Security Events Component Minifilter (mscelft.sys). Finally, it goes over its list of ELAM drivers, performing some integrity checking and eventually loading the drivers. Once the early-launch drivers are loaded, the boot process continues, and the ELAM vetting process described in “Developing ELAM Drivers” on page 203 is executed.

NOTE

This is an oversimplified description of the process of loading ELAM drivers. If you're interested in learning more about it, check out "Understanding WdBoot, " a blog post by @n4rvlb detailing how Windows loads essential drivers.

## Evading ELAM Drivers

Because ELAM drivers mostly use static signatures and hashes to identify malicious boot-start drivers, you can evade them in the same way you'd evade user-mode file-based detections by changing static indicators. Doing this for drivers is more difficult than doing it in user mode, however, because there are generally fewer viable drivers than user-mode executables to choose from. This is due in no small part to the Driver Signature Enforcement in modern versions of Windows.

Driver Signature Enforcement is a control implemented in Windows Vista and beyond that requires kernel-mode code (namely drivers) to be signed in order to load. Starting in build 1607, Windows 10 further requires that drivers be signed with an Extended Validation (EV) certificate and, optionally, a Windows Hardware Quality Labs (WHQL) signature if the developer would like the driver to load on Windows 10 S or have its updates distributed through Windows Update. Due to the complexity of these signing processes, attackers have a substantially harder time loading a rootkit on modern versions of Windows.

An attacker's driver can serve a number of functions while operating under the requirements of Driver Signature Enforcement. For example, the NetFilter rootkit, signed by Microsoft, passed all Driver Signature Enforcement checks and can load on modern Windows versions. Getting a rootkit signed by Microsoft isn't the easiest process, however, and it's impractical for many offensive teams.

If the attacker takes the Bring Your Own Vulnerable Driver (BYOVD) approach, their options open up. These are vulnerable drivers that the attacker loads onto the system, and they're usually signed by legitimate software vendors. As they don't contain any overtly malicious code, they are difficult to detect and rarely have their certificate revoked after their vulnerability is discovered. If this BYOVD component is loaded during boot, a user-mode component running later in the boot process could exploit the driver to load the operator's rootkit using any number of techniques, depending on the nature of the vulnerability.

Another approach involves the deployment of firmware rootkits or bootkits. While this technique is exceedingly rare, it can effectively evade ELAM's boot-start protections. For example, the ESPecter toolkit patched

212 Chapter II

---

the Boot Manager ( bootmgr.efi ), disabled Driver Signature Enforcement, and dropped its driver, which was responsible for loading user-mode components and performing keylogging. ESPecter was initialized as soon as the system loaded UEFI modules, so early in the boot process that ELAM drivers had no ability to affect its presence.

While the specifics of implementing rootkits and bootkits are outside the scope of this book, they're a fascinating topic for any of those interested in "apex" malware. Rootkits and Bootkits: Reversing Modern Malware and Next Generation Threats by Alex Matrosov, Eugene Rodionov, and Sergey Bratus is the most up-to-date resource on this topic at the time of this writing and is highly recommended as a complement to this section.

Thankfully, Microsoft continues to invest heavily in protecting the part of the boot process that occurs before ELAM has a chance to act. These protections fall under the Measured Boot umbrella, which validates the integrity of the boot process from UEFI firmware through ELAM. During the boot process, Measured Boot produces cryptographic hashes, or measurements , of these boot components, along with other configuration data, such as the status of BitLocker and Test Signing, and stores them in the TPM.

Once the system has completed booting, Windows uses the TPM to generate a cryptographically signed statement, or quote , used to confirm the validity of the system's configuration. This quote is sent to an attestation authority, which authenticates the measurements, returns a determination of whether the system should be trusted, and optionally takes actions to remediate any issues. As Windows 11, which requires a TPM, becomes more widely adopted, this technology will become an important detective component for system integrity inside enterprises.

## The Unfortunate Reality

In the vast majority of situations, ELAM vendors don't meet Microsoft's recommendations. In 2021, Maxim Suhanov published a blog post, "Measured Boot and Malware Signatures: exploring two vulnerabilities found in the Windows loader," wherein he compared 26 vendors' ELAM drivers. He noted that only 10 used signatures at all; of these, only two used them to affect Measured Boot in the way intended by Microsoft. Instead, these vendors use their ELAM drivers nearly exclusively to create protected processes and access the Microsoft-Windows-Threat-Intelligence ETW provider discussed in the next chapter.

## Conclusion

ELAM drivers give an EDR insight into portions of the boot process previously unable to be monitored. This allows an EDR to detect, or potentially even stop, an attacker that can execute their code before the primary EDR agent even starts. Despite this seemingly massive benefit, almost no vendors make use of this technology and instead use it only for its auxiliary function; gaining access to the Microsoft-Windows-Threat-Intelligence ETV provider.

Early Launch Antimalware Drivers 213

---

---
