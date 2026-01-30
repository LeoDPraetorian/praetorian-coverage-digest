## CHAPTER 7 Security

Preventing unauthorized access to sensitive data is essential in any environment in which multiple users have access to the same physical or network resources. An operating system, as well as individual users, must be able to protect files, memory, and configuration settings from unwanted viewing and modification. Operating system security includes obvious mechanisms such as accounts, passwords, and file protection. It also includes less obvious mechanisms, such as protecting the operating system from corruption, preventing less privileged users from performing actions (rebooting the computer, for example), and not allowing user programs to adversely affect the programs of other users or the operating system.

In this chapter, we explain how every aspect of the design and implementation of Microsoft Windows was influenced in some way by the stringent requirements of providing robust security.

### Security ratings

Having software, including operating systems, rated against well-defined standards helps the government, corporations, and home users protect proprietary and personal data stored in computer systems. The current security rating standard used by the United States and many other countries is the Common Criteria (CC). To understand the security capabilities designed into Windows, however, it's useful to know the history of the security ratings system that influenced the design of Windows: the Trusted Computer System Evaluation Criteria (TCSEC).

### Trusted Computer System Evaluation Criteria

The National Computer Security Center (NCSC) was established in 1981 as part of the U.S. Department of Defense's (DoD) National Security Agency (NSA). One goal of the NCSC was to create a range of security ratings, listed in Table 7-1, to indicate the degree of protection commercial operating systems, network components, and trusted applications offer. These security ratings, which can be found at http://csrc.nist.gov/publications/history/dod85.pdf, were defined in 1983 and are commonly referred to as the Orange Book.

605


---

TABLE 7-1 TCSEC rating levels

<table><tr><td>Rating</td><td>Description</td></tr><tr><td>A1</td><td>Verified design</td></tr><tr><td>B3</td><td>Security domains</td></tr><tr><td>B2</td><td>Structured protection</td></tr><tr><td>B1</td><td>Labeled security protection</td></tr><tr><td>C2</td><td>Controlled access protection</td></tr><tr><td>C1</td><td>Discretionary access protection (obsolete)</td></tr><tr><td>D</td><td>Minimal protection</td></tr></table>


The TCSEC standard consists of levels-of-trust ratings, where higher levels build on lower levels

by adding more rigorous protection and validation requirements. No operating system meets the A1

(verified design) rating. Although a few operating systems have earned one of the B-level ratings, C2 is

considered sufficient and the highest rating practical for a general-purpose operating system.

The following were the key requirements for a C2 security rating, and they are still considered the

core requirements for any secure operating system:

- ■ A secure logon facility This requires that users be able to be uniquely identified and that they
must be granted access to the computer only after they have been authenticated in some way.
■ Discretionary access control This allows the owner of a resource (such as a file) to determine
who can access the resource and what they can do with it. The owner grants rights that permit
various kinds of access to a user or to a group of users.
■ Security auditing This affords the ability to detect and record security-related events or any
attempts to create, access, or delete system resources. Logon identifiers record the identities of
all users, making it easy to trace anyone who performs an unauthorized action.
■ Object reuse protection This prevents users from seeing data that another user has deleted
or from accessing memory that another user previously used and then released. For example,
in some operating systems, it's possible to create a new file of a certain length and then exam-
ine the contents of the file to see data that happens to have occupied the location on the disk
where the file is allocated. This data might be sensitive information that was stored in another
user's file but had been deleted. Object reuse protection prevents this potential security hole by
initializing all objects, including files and memory, before they are allocated to a user.
Windows also meets two requirements of B-level security:

- ■ Trusted path functionality This prevents Trojan horse programs from being able to in-
tercept users' names and passwords as they try to log on. The trusted path functionality in
Windows comes in the form of its Ctrl+Alt+Delete logon-attention sequence, which cannot be
intercepted by nonprivileged applications. This sequence of keystrokes, which is also known
---

as the secure attention sequence (SAS), always displays a system-controlled Windows security screen (if a user is already logged on) or the logon screen so that would-be Trojan horses can easily be recognized. (The SAS can also be sent programmatically via the SendSAS API if Group Policy and other restrictions allow it.) A Trojan horse presenting a fake logon dialog box will be bypassed when the SAS is entered.

■ Trusted facility management This requires support for separate account roles for administrative functions. For example, separate accounts are provided for administration (Administrators), user accounts charged with backing up the computer, and standard users.

Windows meets all these requirements through its security subsystem and related components.

## The Common Criteria

In January 1996, the United States, United Kingdom, Germany, France, Canada, and the Netherlands

released the jointly developed Common Criteria for Information Technology Security Evaluation (CCITSE)

specification. CCITSE, usually referred to as the Common Criteria (CC), is the recognized multinational

standard for product security evaluation. The CC home page is at http://www.niap-cecws.org/cc-scheme.

The CC is more flexible than the TCSEC trust ratings and has a structure closer to the ITSEC standard than to the TCSEC standard. The CC includes the concept of a Protection Profile (PP), used to collect security requirements into easily specified and compared sets, and the concept of a Security Target (ST), which contains a set of security requirements that can be made by reference to a PP. The CC also defines a range of seven Evaluation Assurance Levels (EALs), which indicate a level of confidence in the certification. In this way, the CC (like the ITSEC standard before it) removes the link between functionality and assurance level that was present in TCSEC and earlier certification schemes.

Windows 2000, Windows XP, Windows Server 2003, and Windows Vista Enterprise all achieved Common Criteria certification under the Controlled Access Protection Profile (CAPP). This is roughly equivalent to a TCSEC C2 rating. All received a rating of EAL4+, the "plus" denoting "flaw remediation." EAL 4 is the highest level recognized across national boundaries.

In March 2011, Windows 7 and Windows Server 2008 R2 were evaluated as meeting the requirements of the US Government Protection Profile for General-Purpose Operating Systems in a Networked Environment, version 1.0 (GPOSPP) (http://www.commoncriteriaportal.org/files/ ppfiles/pp_gpospp_v1.0.pdf). The certification includes the Hyper-V hypervisor. Again, Windows achieved Evaluation Assurance Level 4 with flaw remediation (EAL 4+). The validation report can be found at http://www.commoncriteriaportal.org/files/epfile/st_vid10390-vc.pdf, and the description of the security target, giving details of the requirements satisfied, can be found at http://www. commoncriteriaportal.org/files/epfile/st_vid10390-st.pdf. Similar certifications were achieved by Windows 10 and Windows Server 2012 R2 in June 2016. The report can be found at http://www.commoncriteriaportal.org/files/epfile/cr_windows10.st.pdf.

CHAPTER 7   Security      607


---

Security system components

These are the core components and databases that implement Windows security. (All files mentioned are in the %SystemRoot%\System32 directory unless otherwise specified.)

- ■ Security reference monitor (SRM) This component in the Windows executive (Ntoskrnl.exe)
is responsible for defining the access token data structure to represent a security context, per-
forming security access checks on objects, manipulating privileges (user rights), and generating
any resulting security audit messages.
■ Local Security Authority Subsystem Service (Lsass) This user-mode process runs the
image Lsass.exe that is responsible for the local system security policy (such as which users are
allowed to log on to the machine, password policies, privileges granted to users and groups,
and the system security auditing settings), user authentication, and sending security audit mes-
sages to the event log. The Local Security Authority service (Lsasrv.dll), a library that Lsass loads,
implements most of this functionality.
■ LSAlso.exe This is used by Lsass (if so configured on supported Windows 10 and Server 2016
systems), also known as Credential Guard (see the upcoming "Credential Guard" section for more
on Credential Guard), to store users' token hashes instead of keeping them in Lsass's memory.
Because Laiso.exe is a Trustlet (isolated User Mode process) running in VT>L 1, no normal pro-
cess—not even the normal kernel—can access the address space of this process. Lsass itself stores
an encrypted blob of the password hash needed when it communicates with Lsaoso (via ALPC).
■ Lsass policy database This database contains the local system security policy settings. It is
stored in the registry in an ACL-protected area under HKLM:SECURITY. It includes such infor-
mation as what domains are entrusted to authenticate logon attempts, who has permission to
access the system and how (interactive, network, and service logons), who is assigned which
privileges, and what kind of security auditing is to be performed. The Lsass policy database also
stores "secrets" that include logon information used for cached domain logons and Windows
service user-account logons. (See Chapter 9, "Management mechanisms," in Windows Internals
Part 2 for more information on Windows services.)
■ Security Accounts Manager (SAM) This service is responsible for managing the database
that contains the user names and groups defined on the local machine. The SAM service, which
is implemented in Samsrv.dll, is loaded into the Lsass process.
■ SAM database This database contains the defined local users and groups along with their
passwords and other attributes. On domain controllers, the SAM does not store the domain-
defined users, but stores the system's administrator recovery account definition and password.
This database is stored in the registry under HKLM:SAM.
---

<table><tr><td>Active Directory</td><td>This is a directory service that contains a database that stores information about the objects in a domain. A domain is a collection of computers and their associated security groups that are managed as a single entity. Active Directory stores information about the objects in the domain, including users, groups, and computers. Password information and privileges for domain users are designated as domain controllers of the domain. The Active Directory serves, implemented as Ntdsa.dll, runs in the Lasso process. For more information on Active Directory, see Chapter 10, "Networking," in Part 2.</td></tr><tr><td>Authentication packages</td><td>The include dynamic link libraries (DLLs) that run in the context of both LSass process and implement Windows authentication policy. An authentication DLL is responsible for authenticating a user by checking whether a given user name and password match (or whatever mechanism was used to provide credentials), and if so, returning to Lasso information detailing the user's security identity, which LSass uses to generate an token.</td></tr><tr><td>Interactive logon manager (Winlogon)</td><td>This is a user-mode process running Winlogon. exo that is responsible for responding to the SAS and for managing interactive logon sessions. Winlogon creates a user's first process when the user logs on, for example.</td></tr><tr><td>Logon user interface (LogonUI)</td><td>This is a user-mode process running the user interface they can use to authenticate themselves on the system. LogonUI uses credential providers to query user credentials through various methods.</td></tr><tr><td>Credential providers (CPs)</td><td>These are in-process COM objects that run in the LogonUI process (started on demand by Winlogon when the SAS is performed) and used to obtain a user's name and password, smartcard PIN, biometric data (such as a fingerprint), SmartcardCredentialProvider.dll, BioCred.Prov.DLL, and FaceCredentialProvider.dll, a face-detection provider added in Windows 10.</td></tr><tr><td>Network logon service (Netlogon)</td><td>This is a Windows service (Netlogon.dll, hosted on a standard SvcHost) that sets up the secure channel to a domain controller, over which security requests—such as an interactive logon (if the domain controller is running Windows NT 4) or LAN Manager and NT LAN Manager (v1 and v2) authentication validation—are sent. Netlogon is also used for Active Directory logons.</td></tr><tr><td>Kernel Security Device Driver (KSecDD)</td><td>This is a kernel-mode library (%SystemRoot%\System32\Drivers\Ksecdd.sys) of functions that implement the advanced local procedure call (ALPC) interfaces that other kernel mode security components, including the Encrypting File System (FS), use to communicate with Lasso in user mode.</td></tr><tr><td>AppLocker</td><td>This is a kernel-based process that allows administrators to specify which users and groups. AppLocker consists of a driver (%SystemRoot%\System32\Drivers\Appld.sys) and a service (AppIdSvc.dll) running in a standard SvcHost process.</td></tr><tr><td colspan="2">Figure 7-1 shows the relationships among some of these components and the databases they manage.</td></tr><tr><td colspan="2">From the Library of Michael Weber</td></tr></table>

---

![Figure](figures/Winternals7thPt1_page_627_figure_000.png)

FIGURE 7-1   Windows security components.

## EXPERIMENT: Looking inside HKLM\SAM and HKLM\Security

The security descriptors associated with the SAM and Security keys in the registry prevent access by any account other than the local system account. One way to gain access to these keys for exploration is to reset their security, but that can weaken the system's security. Another way is to execute Regedit.exe while running as the local system account. This can be done using the PsExec tool from Systemrivals with the -s option, as shown here:

```bash
C:\>psexec -s -i -d c:\windows\regedit.exe
```

The -i switch instructs PsExec to run the target executable under the interactive window

station. Without it, the process would run in a non-interactive window station, on an invisible

desktop. The -d switch just indicates PsExec should not wait until the target process exits.

![Figure](figures/Winternals7thPt1_page_627_figure_006.png)

610 CHAPTER 7 Security


---

The SRM, which runs in kernel mode, and Lsass, which runs in user mode, communicate using the ALPC facility described in Chapter 8, "System mechanisms," in Part 2. During system initialization, the SRM creates a port, named SelRmCommandPort, to which Lsass connects. When the Lsass process starts, it creates an ALPC port named SelLsaiCommandPort. The SRM connects to this port, resulting in the creation of private communication ports. The SRM creates a shared memory section for messages longer than 256 bytes, passing a handle in the connect call. Once the SRM and Lsass connect to each other during system initialization, they no longer listen on their respective connect ports. Therefore, a later user process has no way to connect successfully to either of these ports for malicious purposes. The connect request will never complete.

## Virtualization-based security

It is common to refer to the kernel as trusted, due to its inherently higher level of privilege and isolation from user-mode applications. Yet, countless third-party drivers are written each month—Microsoft has stated that a million unique driver hashes are seen through telemetry, monthly! Each of these can contain any number of vulnerabilities, not to mention purposefully malicious kernel-mode code. In such a reality, the idea that the kernel is a small, protected component, and that user-mode applications are “safe” from attack, is clearly an unrealized ideal. This state of affairs leads to an inability to fully trust the kernel, and leaves key user-mode applications, which may contain highly private user data, open to compromise from other malicious user-mode applications (which exploit buggy kernel-mode components) or malicious kernel-mode programs.

As discussed in Chapter 2, "System architecture," Windows 10 and Server 2016 include a virtualizationbased security (VBS) architecture that enables an additional orthogonal level of trust: the virtual trust level (VTL). In this section, you will see how Credential Guard and Device Guard leverage VTLs to protect user data and provide an additional hardware-trust-based layer of security for digital code-signing purposes. At the end of this chapter, you will also see how Kernel Patch Protection (KPP) is provided through the PatchGuard component and enhanced by the VBS-powered HyperGuard technology.

As a reminder, normal user-mode and kernel code runs in VTL 0 and is unaware of the existence of VTL 1. This means anything placed at VTL 1 is hidden and inaccessible to VTL 0 code. If malware is able to penetrate the normal kernel, it still cannot gain access to anything stored in VTL 1, including even user-mode code running in VTL 1 (which is called Isolated User Mode). Figure 7-2 shows the main VBS components we'll be looking at in this section:

- ■ Hypervisor-Based Code Integrity (HVCI) and Kernel-Mode Code Integrity (KMCI), which power

Device Guard

■ LSA (Lsass.exe) and isolated LSA (Lsalso.exe), which power Credential Guard
Additionally, recall that the implementation of Trustlets, which run in LUM, was shown in Chapter 3, "Process and jobs."

---

![Figure](figures/Winternals7thPt1_page_629_figure_000.png)

FIGURE 7-2 VBS components.

Of course, like any trusted component, VTL 1 also makes certain assumptions that the components it depends on can also be trusted. As such, VTL 1 requires Secure Boot (and thus, firmware) to function correctly, the hypervisor to not have been compromised, and hardware elements such as the IOMMU and Intel Management Engine to be free of VTL 0-accessible vulnerabilities. For more information on the hardware chain of trust and boot-related security technologies, see Chapter 11, "Startup and shutdown," in Part 2.

## Credential Guard

To understand the security boundary and protection that Credential Guard provides, it is important to understand the various components that provide access to a user's resources and data or login capabilities on a networked environment:

- ■ Password This is the primary credential used by interactive users to identify themselves on
the machine. This credential is used for authentication and to derive the other components of
the credential model. It is the most highly sought after piece of a user's identity.
■ NT one-way function (NT OWF) This is a hash used by legacy components to identify the
user (after a successful password logon) using the NT LAN Manager (NTLM) protocol. While
modern networked systems no longer use NTLM to authenticate the user, many local compo-
nents still do, as do some types of legacy network components (such as NTLM-based authen-
ticating proxies). Because NTOWF is an MD4 hash, its algorithmic complexity in the face of
today's hardware, and its lack of anti-repeatability protection, means that intercepting the hash
leads to instant compromise and even possible recovery of the password.
■ Ticket-granting ticket (TGT) This is the equivalent of the NTOWF when a much more
modern remote authentication mechanism is used. Kerberos. This is the default on Windows
Active Directory-based domains and is enforced on Server 2016. The TGT and a corresponding
key are provided to the local machine after a successful logon (just like the NTOWF on NTLM),
and intercepting both components will result in instant compromise of the user's credentials,
although reuse and password recovery will not be possible.
Without Credential Guard enabled, some or all of these components of a user's authentication credentials are present in the memory of Laas.

612 CHAPTER 7 Security


---

![Figure](figures/Winternals7thPt1_page_630_figure_000.png)

Note To enable Credential Guard on Windows 10 Enterprise and Server 2016 editions, open the Group Policy editor (gpedit.mse), choose Computer Configuration, select Administrative Templates, choose System, choose Device Guard, and select Turn on Virtualization Based Security. In the top-left part of the dialog box that appears, select Enabled. Finally, select one of the Enabled options in the Credential Guard Configuration combo box.

## Protecting the password

The password, encrypted with a local symmetric key, is stored to provide single sign-on (SSO) capabilities over protocols such as digest authentication (WDigest, used for HTTP-based authentication since Windows XP) or Terminal Services/RDP. As these protocols use plaintext authentication, the password must be kept in memory, which is then accessible through code injection, debugger, or other exploit techniques, and decrypted. Credential Guard cannot change the nature of these inherently unsafe protocols. Therefore, the only possible solution, which Credential Guard employs, is to disable SSO functionality for such protocols. This causes a loss of compatibility and forces the user to re-authenticate.

Obviously, a preferable solution is to remove the usage of a password completely, which Windows Hello, described in the "Windows Hello" section later in this chapter, allows. Authenticating with biometric credentials such as a user's face or fingerprint removes the need to ever type a password, securing the interactive credential against hardware key loggers, kernel sniffing/hooking tools, and user mode-based spoofing applications. If the user never has a password to type, there is no password to steal. Another similar secure credential is the combination of a smart card and associated PIN. While a PIN may be stolen as if typed in, the smart card is a physical element whose key cannot be intercepted without a complex hardware-based attack. This is a type of two-factor authentication (TFA), of which many other implementations exist.

## Protecting the NTOWF/TGT key

Even with protected interactive credentials, a successful login results in a domain controller's key distribution center (KDC) returning the TGT and its key, as well as the NTOWF for legacy applications. Later, the user simply uses the NTOWF for accessing legacy resources and uses the TGT and its key to generate a service ticket. This can then be used to access remote resources (such as files on a share), as shown in Figure 7-3.

![Figure](figures/Winternals7thPt1_page_630_figure_007.png)

FIGURE 7-3 Accessing remote resources.

CHAPTER 7   Security      613


---

Thus, with either the NTOWF or the TGT and its key (stored in Lsass) in the attacker's hands, access to resources is possible even without the smart card, PIN, or user's face or fingerprint. Protecting Lsass from access by an attacker is thus one option that can be used, and which is possible using the Protected Process Light (PPL) architecture described in Chapter 3.

Lsas can be configured to run protected by setting the DWORD value RunAsSPL in the HKLM\System\CurrentControlSet\Consol\Lsa registry key to 1. (This is not a default option, as legitimate thirdparty authentication providers [DLLs] load and execute in the context of Lsas, which would not be possible if Lsas would run protected.) Unfortunately, while this protection does guard the NTOWF and TGT key from user-mode attackers, it does not protect against kernel attackers or user-mode attackers that leverage vulnerabilities in any of the millions of drivers that are produced monthly. Credential Guard solves this problem by using another process. Lsaso.exe, which runs as a Trustlet in VT>L 1. This process therefore stores the user's secrets in its memory, not in Lsas.

## Secure communication

As shown in Chapter 2, VTL 1 has a minimal attack surface, as it does not have the full regular "NT" kernel, nor does it have any drivers or access to I/O of hardware of any kind. As such, isolated LSA, which is a VTL 1 Trustlet, cannot directly communicate with the KDC. This is still the responsibility of the Lsass process, which serves as a proxy and protocol implementer, communicating with the KDC to authenticate the user and to receive the TGT and the key and NTOWF, as well as communicating with the file server by using service ticket. This seemingly results in a problem: the TGT and its key/NTOWF transiently pass through Lsass during authentication, and the TGT and its key are somehow available to Lsass for the generation of service tickets. This leads to two questions: How does Lsass send and receive the secrets from isolated LSA, and how can we prevent an attacker from doing the same?

To answer the first question, recall that Chapter 3, "Processes and jobs," described which services are available to Trustlets. One was the Advanced Local Procedure Call (ALPC), which the Secure Kernel supports by proxying the NtAIpc* calls to the Normal Kernel. Then, the Isolated User Mode environment implements support for the RPC runtime library (Rpcrt4.dll) over the ALPC protocol, which allows a VTL 0 and VTL 1 application to communicate using local RPC just like any other application and service. In Figure 7-4, which shows Process Explorer, you can see the Lsaso.exe process, which has a handle to the LSA_ISO_RPC_SERVERALPC port. This is used to communicate with the Lsas3.exe process. (See Chapter 8 in Part 2 for more information on ALPC.)

To answer the second question, some understanding of cryptographic protocols and challenge/ response models is required. If you're already familiar with some of the basic concepts of SSL/TLS technology and its use in Internet communications to prevent man-in-the-middle (MthM) attacks, you can think of the KDC and isolated LSA protocol in a similar way. Although Lsas sit in the middle as a proxy would, it only sees encrypted traffic between the KDC and isolated LSA, without the ability to understand its contents. Because isolated LSA establishes a local "session key," which only lives in VTL 1, and then uses a secure protocol to send this session key encrypted with yet another key, which only the KDC has, the KDC can then respond with the TGT and its key after encrypting it with the isolated LSA session key. Therefore, Lsas sees an encrypted message to the KDC (which it can't decrypt) and an encrypted message from the KDC (which it can't decrypt).

614 CHAPTER 7 Security


---

FIGURE 7-4 I also eve and its ALPC port.

This model can even be used to protect legacy NTLM authentication, which is based on a challenge/ response model. For example, when a user logs in with a plaintext credential, LSA sends it the NTLM challenge and the previously encrypted credentials to isolated LSA. That is, isolated LSA sends the NTLM challenge and the previously encrypted credentials to isolated LSA. That is, isolated LSA sends the NTLM challenge and the previously encrypted credentials to isolated LSA. That is, isolated LSA sends

Note, however, that four possible attacks exist in this model:

• If the machine is already physically compromised, the plaintext password can be interpreted either as it is inputted or as it is sent to isolated LSA (if Lass has already compromised). Using Windows Hello can mitigate this.

• As mentioned, NTLM does not be replayed for the same challenge. Alternatively, if the attacker can compromise LSass after logon, it can capture the encrypted credential and force isolated LSA to generate new NTLM responses for arbitrary NTLM challenges. This attack, however, only works until reboot, because isolated LSA generates a new session key at that point.

• In the case of Kerberos logon, the NTOWF (which is not encrypted) can be intercepted and then reused, just like in a standard pass-the-hash attack. Again, however, this requires an already compromised machine (or physical network interception).

• In the case of physical access, may be able to disable Credential Guard. In this situation, the legacy authentication model is used (a so-called "downgrade attack"), and older attack models can now be employed.

CHAPTER 7    Security      615


---

## UEFI lock

Because disabling Credential Guard (which is ultimately nothing more than a registry setting) is trivial for an attacker, Secure Boot and UEFI can be leveraged to prevent a non-physically present administrator (such as malware with admin rights) from disabling Credential Guard. This is done by enabling Credential Guard with UEFI Lock. In this mode, an EFI runtime variable is written to firmware memory and a reboot is required. At the reboot, the Windows boot loader, which still operates in EFI Boot Services mode, will write an EFI boot variable (which has the property of not being readable or writeable once EFI Boot Services mode is exited) to record the fact that Credential Guard is enabled. Additionally, a Boot Configuration Database (BCD) option will be recorded.

When the kernel boots, it will automatically rewrite the required Credential Guard registry key in the presence of the BCD option and/or UEFI runtime variable. If the BCD option is deleted by an attacker, BitLocker (if enabled) and TPM-based remote attestation (if enabled) will detect the change and require physical input of the admin's recovery key before booting, which will then restore the BCD option based on the UEFI runtime variable. If the UEFI runtime variable is deleted, the Windows boot loader will restore it based on the UEFI boot variable. As such, without special code to delete the UEFI boot variable—which can only be done in EFI Boot Services mode—there is no way to disable Credential Guard in UEFI lock mode.

The only such code that exists is in a special Microsoft binary called SecComp.efi. This must be downloaded by the administrator, who must then either boot the computer from an alternate EFIbased device and manually execute it (which will require the BitLocker recovery key as well as physical access) or modify the BCD (which will require the BitLocker recovery key). At the reboot, SecComp.efi will require user confirmation while in UEFI mode (which can only be done by a physical user).

## Authentication policies and armored Kerberos

Using a security model of "secure, unless already compromised before login or by a physical administrator" is definitely an improvement over the traditional non-Credential Guard-based security model. However, some enterprises and organizations may want an even stronger security guarantee: that even a compromised machine cannot be used to fake or replay a user's credentials, and that if a user's credentials have been compromised, they cannot be used outside of specific systems. By leveraging a Server 2016 feature called Authentication Policies, and armored Kerberos, Credential Guard can operate in this heightened security mode.

In this mode, the VT1 I Secure Kernel will collect, using the TPM (a file on disk can also be used, but makes the security moot), a special machine ID key. This key is then used to generate a machine TGT key during the initial domain join operation as the machine is provisioned (obviously, it is important to ensure the machine is in a trusted state during provisioning), and this TGT key is sent to the KDC. Once configured, when the user logs in with his or her credential, it is combined with the machine's credential (which only isolated LSA has access to), which forms a proof-of-origin key. The KDC will then reply with the NTOWF and user TGT and its key after encrypting it with the proof-of-origin key. In this mode, two security guarantees are provided:

- ■ The user is authenticating from a known machine If the user, or an attacker, has the

original credentials, and attempts to use them on a different machine, its TPM-based machine

credential will be different.
616 CHAPTER 7 Security


---

- ■ The NTLM response/user ticket is coming from isolated LSA and has not been manually
generated from LSass This guarantees that Credential Guard is enabled on the machine,
even if the physical user can disable it in some way.
Unfortunately, once again, if the machine is compromised in such a way that the proof-of-originencrypted KDC response that contains the user TGT and its key is intercepted, it can be stored and used to request session key-encrypted service tickets from isolated LSA. This can then be sent to a file server (for example) to access it until a reboot is issued to wipe the session key. As such, on a system with Credential Guard, it is recommended to reboot each time a user logs off. Otherwise, an attacker may be able to issue valid tickets even after the user is no longer present.

## Future improvements

As discussed in Chapter 2 and Chapter 3, the Secure Kernel in VTL 1 is currently undergoing improvements to add support for specialized classes of PCI and USB hardware, which can exclusively be communicated with only through the hypervisor and VTL 1 code using the Secure Device Framework (SDF). Combined with Bioiso.exe and Fsiso.exe, which are new Trustlets to securely obtain biometric data and video frames (from a webcam), a VTL 0 kernel mode-based component cannot intercept Dt the contents of a Windows Hello authentication attempt (which we've classified as safe compared to a user's plaintext password, but still technically capturable through custom driver-based interception). Once released, Windows Hello credentials will be guaranteed at the hardware level to not ever be available to VTL 0. In this mode, Laa8 will not need to be involved in a Windows Hello authentication. Isolated LSA will obtain the credentials directly from the isolated biometrics or isolated frame service.

![Figure](figures/Winternals7thPt1_page_634_figure_004.png)

Note The Secure Driver Framework (SDF) is the WDF equivalent for VTL 1 drivers. This framework is not currently public, but is shared with Microsoft partners only for creating VTL 1 drivers.

## Device Guard

While Credential Guard is concerned with safeguarding the user's credentials, Device Guard has a completely different goal: protecting the user's machine itself from different kinds of software- and hardware-based attacks. Device Guard leverages the Windows Code Integrity services, such as KernelMode Code Signing (KMCS) and User-Mode Code Integrity (UMCI), and strengthens them through HyperVisor Code Integrity (HCVI). (See Chapter 8 in Part 2 for more information on Code Integrity.)

Additionally, Device Guard is fully configurable, thanks to Custom Code Integrity (CCI) and signing policies that are protected by Secure Boot and defined by the enterprise administrator. These policies, which are explained in Chapter 8, allow the enforcement of inclusion/exclusion lists that are based on cryptographically sound information (such as certificate signers or SHA-2 hashes) instead of file paths or file names as with AppLocker's policies. (See the section "AppLocker" later in this chapter for more on AppLocker.)

CHAPTER 7   Security      617


---

Therefore, while we won’t describe here the different ways in which Code Integrity policies can be

defined and customized, we will show how Device Guard enforces whatever these policies may be set

to, through the following guarantees:

- ■ If kernel-mode code signing is enforced, only signed code can load, regardless of the
kernel itself being compromised This is because the kernel-loading process will notify the
Secure Kernel in VTL whenever it loads a driver, and only successfully load it once HCVI has
validated its signature.

■ If kernel-mode code signing is enforced, signed code cannot be modified once loaded,
even by the kernel itself This is because the executable code pages will be marked as read-
only through the hypervisor's Second Level Address Translation (SLAT) mechanism, which is
further explained in Chapter 8 in Part 2.

■ If kernel-mode code signing is enforced, dynamically allocated code is prohibited (a
tautology of the first two bullets) This is because the kernel does not have the ability to
allocate executable entries in the SLAT page table entries, even though the kernel's page tables
themselves may mark such code as executable.

■ If kernel-mode code signing is enforced, UEFI runtime code cannot be modified, even by
other UEFI runtime code or by the kernel itself Additionally, Secure Boot should already
have validated that this code was signed at the time it was loaded. (Device Guard relies on this
assumption.) Furthermore, UEFI runtime data cannot be made executable. This is done by read-
ing all the UEFI runtime code and data, enforcing the correct permissions, and duplicating them
in the SLAT page table entries, which are protected in VTL 1.

■ If kernel-mode code signing is enforced, only kernel-mode (ring 0) signed code can
execute This may once again sound like a tautology of the first three bullets, but consider
signed ring 3 code. Such code is valid from UMCI's perspective and has been authorized as
executable code in the SLAT page table entries. The Secure Kernel relies on the Mode-Based
Execution Control (MBEC) feature, if present in hardware, which enhances the SLAT with a user/
kernel executable bit, or the hypervisor's software emulation of this feature, called Restricted
User Mode (RUM).

■ If user-mode code signing is enforced, only signed user-mode images can be loaded
This means all executable processes must be signed (.exe) files as well as the libraries they load (.dll).

■ If user-mode code signing is enforced, the kernel does not allow user-mode applications
to make existing executable code pages writable Obviously, it is impossible for user-mode
code to allocate executable memory or to modify existing memory without asking the kernel
permission. As such, the kernel can apply its usual enforcement rules. But even in the case of a
compromised kernel, the SLAT ensures that no user-mode pages will be executable without the
Secure Kernel's knowledge and approval, and that such executable pages can never be writeable.

■ If user-mode code signing is enforced, and hard code guarantees are requested by the
signing policy, dynamically allocated code is prohibited This is an important distinction
from the kernel scenarios. By default, signed user-mode code is allowed to allocate additional

CHAPTER 7 Security

From the Library of M
---

executable memory to support JIT scenarios unless a special enhanced key usage (EKU) is present in the application's certificate, which serves as a dynamic code generation entitlement. At present, NGN.EXE (NET Native Image Generation) has this EKU, which allows IL-only .NET executables to function even in this mode.

■ If user-mode PowerShell constrained language mode is enforced, all PowerShell scripts that use dynamic types, reflection, or other language features that allow the execution or arbitrary code and/or marshalling to Windows/.NET API functions must also be signed

This prevents possibly malicious PowerShell scripts from escaping constrained mode.

SLAT page table entries are protected in VTL 1 and contain the "ground truth" for what permissions a given page of memory can have. By withholding the executable bit as needed, and/or withholding the writable bit from existing executable pages (a security model known as W/X, pronounced doubleyou xor ex), Device Guard moves all code-signing enforcement into VTL 1 (in a library called SKCI.DLL, or Secure Kernel Code Integrity).

Additionally, even if not configured explicitly on the machine, Device Guard operates in a third mode if Credential Guard is enabled by enforcing that all Trustlets have a specific Microsoft signature with a certificate that includes the Isolated User Mode EKU. Otherwise, an attacker with ring 0 privileges could attack the regular KMCS mechanism and load a malicious Trustlet to attack the isolated LSA component. Furthermore, all user-mode code-signing enforcements are active for the Trustlet, which executes in hard code guarantees mode.

Finally, as a performance optimization, it is important to understand that the HVCI mechanism will not reauthenticate every single page when the system resumes from hibernation (S4 sleep state). In some cases, the certificate data may not even be available. Even if this were the case, the SLAT data must be reconstructed, which means that the SLAT page table entries are stored in the hibernation file itself. As such, the hypervisor needs to trust the hibernation file has not been modified in any way. This is done by encrypting the hibernation file with a local machine key that is stored in the TPM. Unfortunately, without a TPM present, this key must be stored in a UEFI runtime variable, which allows a local attacker to decrypt the hibernation file, modify it, and re-encrypt it.

## Protecting objects

Object protection and access logging are the essence of discretionary access control and auditing. The objects that can be protected on Windows include files, devices, mailslots, pipes (named and anonymous), jobs, processes, threads, events, keyed events, event pairs, mutexes, semaphores, shared memory sections, I/O completion ports, LPC ports, writable timers, access tokens, volumes, window stations, desktops, network shares, services, registry keys, printers, Active Directory objects, and so on—theoretically, anything managed by the executive object manager. In practice, objects that are not exposed to user mode (such as driver objects) are usually not protected. Kernel-mode code is trusted, and usually uses interfaces to the object manager that do not perform access checking. Because system resources that are exported to user mode (and hence require security validation) are implemented as objects in kernel mode, the Windows object manager plays a key role in enforcing object security.

CHAPTER 7   Security      619


---

You can view object protection with the WinObj Sysinternals tool (for named objects), shown

in Figure 7-5. Figure 7-6 shows the Security property page of a section object in the user's session.

Although files are the resources most commonly associated with object protection, Windows uses the

same security model and mechanism for executive objects as it does for files in the file system. As far as

access controls are concerned, executive objects differ from files only in the access methods supported

by each type of object.

![Figure](figures/Winternals7thPt1_page_637_figure_001.png)

FIGURE 7-5 WinObj with a section object selected.

![Figure](figures/Winternals7thPt1_page_637_figure_003.png)

FIGURE 7-6 An executive object and its security descriptor, viewed by WinObj.

620    CHAPTER 7   Security


---

What is shown in Figure 7-6 is actually the object's discretionary access control list (DACL). We will describe DACLs in detail in the section "Security descriptors and access control."

You can use Process Explorer to view the security properties of objects by double-clicking a handle in the lower pane view (when configured to show handles). This has the added benefit of displaying objects that are unnamed. The Property page shown is the same in both tools, as the page itself is provided by Windows.

To control who can manipulate an object, the security system must first be sure of each user's identity. This need to guarantee the user's identity is the reason that Windows requires authenticated logon before accessing any system resources. When a process requests a handle to an object, the object manager and the security system use the caller's security identification and the object's security descriptor to determine whether the caller should be assigned a handle that grants the process access to the object it desires.

As discussed later in this chapter, a thread can assume a different security context than that of its

process. This mechanism is called impersonation. When a thread is impersonating, security validation

mechanisms use the thread's security context instead of that of the thread's process. When a thread

isn't impersonating, security validation falls back on using the security context of the thread's owning

process. It's important to keep in mind that all the threads in a process share the same handle table, so

when a thread opens an object—even if it's impersonating—all the threads of the process have access

to the object.

Sometimes, validating the identity of a user isn't enough for the system to grant access to a resource that should be accessible by the account. Logically, one can think of a clear distinction between a service running under the Alice account and an unknown application that Alice downloaded while browsing the Internet. Windows achieves this kind of intra-user isolation with the Windows integrity mechanism, which implements integrity levels. The Windows integrity mechanism is used by User Account Control (UAC) elevations, User Interface Privilege Isolation (UIPI) and AppContainers, all described later in this chapter.

## Access checks

The Windows security model requires that a thread specify up front, at the time that it opens an object, what types of actions it wants to perform on the object. The object manager calls the SRM to perform access checks based on a thread's desired access. If the access is granted, a handle is assigned to the thread's process with which the thread (or other threads in the process) can perform further operations on the object.

One event that causes the object manager to perform security access validation is when a thread opens an existing object using a name. When an object is opened by name, the object manager performs a lookup of the specified object in the object manager namespace. If the object isn't located in a secondary namespace, such as the configuration manager's registry namespace or a file system driver's file system namespace, the object manager calls the internal function ObpCreateHandle once it locates the object. As its name implies, ObpCreateHandle creates an entry in the process handle table that becomes associated with the object. ObpCreateHandle calls first calls ObpGrantAccess to see if the thread has

CHAPTER 7   Security      621


---

permission to access the object. If so, ObpCreateHandle calls the executive function ExCreateHandle

to create the entry in the process handle table. ObpGrantAccess calls ObCheckObjectAccess to initiate

the security access check.

ObpGrantAccess passes to ObCheckObjectAccess the security credentials of the thread opening the object, the types of access to the object that the thread is requesting (read, write, delete, and so forth, including object-specific operations), and a pointer to the object. ObCheckObjectAccess first locks the object's security descriptor and the security context of the thread. The object security lock prevents another thread in the system from changing the object's security while the access check is in progress. The lock on the thread's security context prevents another thread (from that process or a different process) from altering the security identity of the thread while security validation is in progress. ObCheckObjectAccess then calls the object's security method to obtain the security settings of the object. (See Chapter 8 in Part 2 for a description of object methods.) The call to the security method might invoke a function in a different executive component. However, many executive objects rely on the system's default security management support.

When an executive component defining an object doesn't want to override the SRM's default security policy, it marks the object type as having default security. Whenever the SRM calls an object's security method, it first checks to see whether the object has default security. An object with default security stores its security information in its header, and its security method is SeDefaultObjectMethod. An object that doesn't rely on default security must manage its own security information and supply a specific security method. Objects that rely on default security include mutexes, events, and semaphores. A file object is an example of an object that overrides default security. The I/O manager, which defines the file object type, has the file system driver on which a file resides manage (or choose not to implement) the security for its files. Thus, when the system queries the security on a file object that represents a file on an NTFS volume, the I/O manager file object security method retrieves the file's security using the NTFS file system driver. Note, however, that ObCheckObjectAccess isn't executed when files are opened because they reside in secondary namespaces. The system invokes a file object's security method only when a thread explicitly queries or sets the security on a file (with the Windows SetFileSecurity or GetFileSecurity functions, for example).

After obtaining an object's security information, ObjectCheckObjectAccess invokes the SRM function

SeAccessCheck. SeAccessCheck is one of the functions at the heart of the Windows security model.

Among the input parameters SeAccessCheck accepts are the object's security information, the security

identity of the thread as captured by ObjectCheckObjectAccess, and the access that the thread is request ing. SeAccessCheck returns true or false, depending on whether the thread is granted the access it

requested to the object.

Here is an example: Suppose a thread wants to know when a specific process exits (or terminates in some way). It needs to get a handle to the target process by calling the OpenProcess API, passing in two important arguments: the unique process ID (let's assume it's known or has been obtained in some way) and an access mask indicating the operations that the thread wants to perform using the returned handle. Lazy developers may just pass PROCESS_ALL_ACCESS for the access mask, specifying they want all possible access rights for the process. One of the following two results would occur:

622 CHAPTER 7 Security


---

- ■ If the calling thread can be granted all the permissions, it would get back a valid handle and
then could call WaitForSingleObject to wait for the process to exit. However, another thread
in the process, perhaps with fewer privileges, can use the same handle to do other operations
with the process, such as terminate it prematurely with TerminateProcess, because the handle
allows all possible operations on the process.
■ The call can fail if the calling thread does not have sufficient privileges to be granted all possible
access and the result is an invalid handle, meaning no access to the process. This is unfortunate,
because the thread just needed to ask for the SYNCHRONIZE access mask. That has a much bet-
ter chance of succeeding than asking for PROCESS_ALL_ACCESS.
The simple conclusion here is that a thread should request the exact access it requires—no more, no less.

Another event that causes the object manager to execute access validation is when a process references an object using an existing handle. Such references often occur indirectly, as when a process calls on a Windows API to manipulate an object and passes an object handle. For example, a thread opening a file can request read permission to the file. If the thread has permission to access the object in this way, as dictated by its security context and the security settings of the file, the object manager creates a handle— representing the file—in the handle table of the thread's process. The types of accesses the threads in the process are granted through the handle are stored with the handle by the object manager.

Subsequently, the thread could attempt to write to the file using the WinTeleFile Windows function, passing the file's handle as a parameter. The system service NtWriteFile, which WriteFile calls via Ndtll.dll, uses the object manager function ObReferenceObjectByHandle (documented in the WDK) to obtain a pointer to the file object from the handle. ObReferenceObjectByHandle accepts the access that the caller wants from the object as a parameter. After finding the handle entry in the process handle table, ObReferenceObjectByHandle compares the access being requested with the access granted at the time the file was opened. In this example, ObReferenceObjectByHandle will indicate that the write operation should fail because the caller didn't obtain write access when the file was opened.

The Windows security functions also enable Windows applications to define their own private objects and to call on the services of the SRM (through the AuthZ user-mode APIs, described later) to enforce the Windows security model on those objects. Many kernel-mode functions that the object manager and other executive components use to protect their own objects are exported as Windows user-mode APIs. The user-mode equivalent of SeAccessCheck is the AuthZ API AccessCheck. Windows applications can therefore leverage the flexibility of the security model and transparently integrate with the authentication and administrative interfaces that are present in Windows.

The essence of the SRM's security model is an equation that takes three inputs: the security identity of a thread, the access that the thread wants to an object, and the security settings of the object. The output is either yes or no and indicates whether the security model grants the thread the access it desires. The following sections describe the inputs in more detail and then document the model's access-validation algorithm.

CHAPTER 7   Security      623


---

## EXPERIMENT: Viewing handle access masks

Process Explorer can show the access mask associated with open handles. Follow these steps:

1. Open Process Explorer.

2. Open the View menu, choose Lower Pane View, and select Handles to configure the lower pane to show handles.

3. Right-click the column headers of the lower pane and choose Select Columns to open

the dialog box shown here:

![Figure](figures/Winternals7thPt1_page_641_figure_005.png)

4. Select the Access Mask and Decoded Access Mask check boxes (the latter is available in version 16.10 and later) and click OK.

5. Select Explorer.exe from the process list and look at the lower pane handles. Each

handle has an access mask, indicating the access granted using this handle. T o help

with interpreting the bits of the access mask, the decoded access mask column shows

a textual representation of the access masks for many types of objects:

![Figure](figures/Winternals7thPt1_page_641_figure_008.png)

Notice there are generic access rights (for example, READ_CONTROL and SYNCHRONIZE) and

specific ones (for example, KEY_READ and MODIFY_STATE). Most of the specific ones are short ened versions of the actual defines in the windows headers (for example, MODIFY_STATE instead

of EVENT_MODIFY_STATE, TERMINATE instead of PROCESS_TERMINATE).

624 CHAPTER 7 Security


---

## Security identifiers

Instead of using names (which might or might not be unique) to identify entities that perform actions in a system, Windows uses security identifiers (SIDs). Users have SIDs, as do local and domain groups, local computers, domains, domain members, and services. A SID is a variable-length numeric value that consists of a SID structure revision number, a 48-bit identifier authority value, and a variable number of 32-bit subauthority or relative identifier (RID) values. The authority value identifies the agent that issued the SID, and this agent is typically a Windows local system or a domain. Subauthority values identify trustees relative to the issuing authority, and RIDs are simply a way for Windows to create unique SIDs based on a common base SID. Because SIDs are long and Windows takes care to generate truly random values within each SID, it is virtually impossible for Windows to issue the same SID twice on machines or domains anywhere in the world.

When displayed textually, each SID carries an S prefix, and its various components are separated with hyphens like so:

S-1-5-21-1463437245-1224812800-863842198-1128

In this SID, the revision number is 1, the identifier authority value is 5 (the Windows security author ity), and four subauthority values plus one RID (1128) make up the remainder of the SID. This SID is a

domain SID, but a local computer on the domain would have a SID with the same revision number,

identifier authority value, and number of subauthority values.

When you install Windows, the Windows Setup program issues the computer a machine SID. Windows assigns SIDs to local accounts on the computer. Each local-account SID is based on the source computer's SID and has a RID at the end. RIDs for user accounts and groups start at 1000 and increase in increments of 1 for each new user or group. Similarly, Domain Controller Promote (Dcpromo.exe), the utility used to create a new Windows domain, reuses the computer SID of the computer being promoted to domain controller as the domain SID and re-creates a new SID for the computer if it is ever demoted. Windows issues to new domain accounts SIDs that are based on the domain SID and have an appended RID (again starting at 1000 and increasing in increments of 1 for each new user or group). A RID of 1028 indicates that the SID is the twenty-ninth SID the domain issued.

Windows issues SIDs that consist of a computer or domain SID with a predefined RID to many pre defined accounts and groups. For example, the RID for the Administrator account is 500, and the RID

for the guest account is 501. A computer's local Administrator account, for example, has the computer

SID as its base with the RID of 500 appended to it:

S-1-5-21-13124455-12541255-61235125-500

Windows also defines a number of built-in local and domain SIDs to represent well-known groups. For example, a SID that identifies any and all accounts (except anonymous users) is the Everyone SID: S-1-1-0. Another example of a group that a SID can represent is the Network group, which is the group that represents users who have logged on to a machine from the network. The Network group SID is S-1-5-2. Table 7-2, reproduced here from the Windows SDK documentation, shows some basic wellknown SIDs, their numeric values, and their use. Unlike users' SIDs, these SIDs are predefined constants, and have the same values on every Windows system and domain in the world. Thus, a file that

CHAPTER 7   Security      625


---

is accessible by members of the Everyone group on the system where it was created is also accessible to Everyone on any other system or domain to which the hard drive where it resides happens to be moved. Users on those systems must, of course, authenticate to an account on those systems before becoming members of the Everyone group.

TABLE 7-2 A few well-known SIDs

<table><tr><td>SID</td><td>Name</td><td>Use</td></tr><tr><td>S-1-0-0</td><td>Nobody</td><td>Used when the SID is unknown</td></tr><tr><td>S-1-1-0</td><td>Everyone</td><td>A group that includes all users except anonymous users</td></tr><tr><td>S-1-2-0</td><td>Local</td><td>Users who log on to terminals locally (physically) connected to the system</td></tr><tr><td>S-1-3-0</td><td>Creator Owner ID</td><td>A security identifier to be replaced by the security identifier of the user who created a new object (used in inheritable ACEs)</td></tr><tr><td>S-1-3-1</td><td>Creator Group ID</td><td>Identifies a security identifier to be replaced by the Primary group SID of the user who created a new object (used in inheritable ACEs)</td></tr><tr><td>S-1-5-18</td><td>Local System account</td><td>Used by services</td></tr><tr><td>S-1-5-19</td><td>Local Service account</td><td>Used by services</td></tr><tr><td>S-1-5-20</td><td>Network Service account</td><td>Used by services</td></tr></table>


![Figure](figures/Winternals7thPt1_page_643_figure_003.png)

Note See Microsoft Knowledge Base article 243330 for a list of defined SIDs at http://support.microsoft.com/kb/243330.

Finally, Winlogin creates a unique logon SID for each interactive logon session. A typical use of a logon SID is in an access control entry (ACE) that allows access for the duration of a client's logon session. For example, a Windows service can use the LogonUser function to start a new logon session. The LogonUser function returns an access token from which the service can extract the logon SID. The service can then use the SID in an ACE (described in the section "Security descriptors and access control" later in this chapter) that allows the client's logon session to access the interactive window station and desktop. The SID for a logon session is S-1-S-5-X-Y, where the X and Y are randomly generated.

EXPERIMENT: Using PGetSid and Process Explorer to view SIDs

You can easily see the SID representation for any account you're using by running the PGetStd utility from Sysinternals. PGetStd options allow you to translate machine and user account names to their corresponding SIDs and vice versa.

If you run PGetSid with no options, it prints the SID assigned to the local computer. Because

the Administrator account always has a RID of 500, you can determine the name assigned to the

account (in cases where a system administrator has renamed the account for security reasons)

simply by passing the machine SID appended with -500 as PGetSid's command-line argument.

---

To obtain the SID of a domain account, enter the user name with the domain as a prefix:

```bash
c:\>psgetsid redmond\johndoe
```

You can determine the SID of a domain by specifying the domain's name as the argument to

PsGetSid.

```bash
c:\>psqetsid Redmond
```

Finally, by examining the RID of your own account, you know at least a number of security

accounts (equal to the number resulting from subtracting 999 from your RID) have been created

in your domain or on your local machine (depending on whether you are using a domain or local

machine account). You can determine what accounts have been assigned RIDs by passing a SID

with the RID you want to query to PcGetSid. If PcGetSid reports that no mapping between the

SID and an account name was possible and the RID is lower than that of your account, you know

that the account assigned the RID has been deleted.

For example, to find out the name of the account assigned the 28th RID, pass the domain SID

amended with -1027 to PcGetSid:

```bash
c:\>psgetsid 1-5-21-178774166-3910675280-2727264193-1027:
Account for S-1-5-21-178774166-3910675280-2727264193-1027:
User: redmondjohndoe
```

Process Explorer can also show you information on account and group SIDs on your system through its Security tab. This tab shows you information such as who owns this process and which groups the account is a member of. To view this information, simply double-click any process (for example, Explorer.exe) in the Process list and then click the Security tab. You should see something similar to the following:

![Figure](figures/Winternals7thPt1_page_644_figure_008.png)

The information displayed in the User field contains the friendly name of the account owning this process, while the SID field contains the actual SID value. The Group list includes information on all the groups that this account is a member of (groups are described later in this chapter).

CHAPTER 7   Security      627


---

## Integrity levels

As mentioned, integrity levels can override discretionary access to differentiate a process and objects

running as and owned by the same user, offering the ability to isolate code and data within a user

account. The mechanism of Mandatory Integrity Control (MIC) allows the SRM to have more detailed

information about the nature of the caller by associating it with an integrity level. It also provides infor mation on the trust required to access the object by defining an integrity level for it.

The integrity level of a token can be obtained with the GetTokenInformation API with the Token IntegrityLevel enumeration value. These integrity levels are specified by a SID. Although integrity

levels can be arbitrary values, the system uses six primary levels to separate privilege levels, as described

in Table 7-3.

TABLE 7-3 Integrity level SIDs

<table><tr><td>SID</td><td>Name (Level)</td><td>Use</td></tr><tr><td>S-1-16-0x0</td><td>Untrusted (0)</td><td>Used by processes started by the Anonymous group. It blocks most write access.</td></tr><tr><td>S-1-16-0x1000</td><td>Low (1)</td><td>Used by AppContainer processes (UWP) and Protected Mode Internet Explorer. It blocks write access to most objects (such as files and registry keys) on the system.</td></tr><tr><td>S-1-16-0x2000</td><td>Medium (2)</td><td>Used by normal applications being launched while UAC is enabled.</td></tr><tr><td>S-1-16-0x3000</td><td>High (3)</td><td>Used by administrative applications launched through elevation when UAC is enabled, or normal applications if UAC is disabled and the user is an administrator.</td></tr><tr><td>S-1-16-0x4000</td><td>System (4)</td><td>Used by services and other system-level processes (such as Wininit, Winlogon, Smss, and so on).</td></tr><tr><td>S-1-16-0x5000</td><td>Protected (5)</td><td>Currently unused by default. Can be set by kernel-mode caller only.</td></tr></table>


Another, seemingly additional, integrity level is called AppContainer, used by UWP apps. Although seemingly another level, it's in fact equal to Low. UWP process tokens have another attribute that indicates they are running inside an AppContainer (described in the "AppContainers" section). This information is available with the GetTokenInformation API with the TokenIsAppContainer enumeration value.

## EXPERIMENT: Looking at the integrity level of processes

You can use Process Explorer to quickly display the integrity level for the processes on your system. The following steps demonstrate this functionality.

- 1. Launch Microsoft Edge browser and Calc.exe (Windows 10).

2. Open an elevated command prompt window.

3. Open Notepad normally (without elevating it).

4. Open an elevated Process Explorer, right-click any column header in the Process list,

and then click Select Columns.
---

5. Select the Process Image tab and select the Integrity Level check box. The dialog box should look similar to the one shown here:

![Figure](figures/Winternals7thPt1_page_646_figure_001.png)

6. Process Explorer shows you the integrity level of the processes on your system. You should see the Notepad process at medium, the Edge (MicrosoftEdge.exe) process at AppContainer, and the elevated command prompt at High. Also note that the services and system processes are running at an even higher integrity level. System

![Figure](figures/Winternals7thPt1_page_646_figure_003.png)

CHAPTER 7   Security      629


---

Every process has an integrity level that is represented in its token and propagated according to the

following rules:

- ■ A process normally inherits the integrity level of its parent (which means an elevated command

prompt will spawn other elevated processes).

■ If the file object for the executable image to which the child process belongs has an integrity

level and the parent process's integrity level is medium or higher, the child process will inherit

the lower of the two.

■ A parent process can create a child process with an explicit integrity level lower than its own.

To do this, it uses DuplicateTokenEx to duplicate its own access token, it uses SetToken-

Information to change the integrity level in the new token to the desired level, and then it calls

CreateProcessAsUser with that new token.
Table 7-3 lists the integrity level associated with processes, but what about objects? Objects also have an integrity level stored as part of their security descriptor, in a structure that is called the mandatory label.

To support migrating from previous versions of Windows (whose registry keys and files would not include integrity-level information), and to make it simpler for application developers, all objects have an implicit integrity level to avoid having to manually specify one. This implicit integrity level is medium, meaning that the mandatory policy (described shortly) on the object will be performed on tokens accessing this object with an integrity level lower than medium.

When a process creates an object without specifying an integrity level, the system checks the integrity level in the token. For tokens with a level of medium or higher, the implicit integrity level of the object remains medium. However, when a token contains an integrity level lower than medium, the object is created with an explicit integrity level that matches the level in the token.

Objects that are created by high- or system-integrity-level processes have a medium integrity level themselves so that users can disable and enable UAC. If object integrity levels always inherited their creator's integrity level, the applications of an administrator who disables UAC and subsequently reenables it could fail because the administrator would not be able to modify any registry settings or files created when running at the high integrity level. Objects can also have an explicit integrity level that is set by the system or by the creator of the object. For example, processes, threads, tokens, and jobs are given an explicit integrity level by the kernel when it creates them. The reason for assigning an integrity level to these objects is to prevent a process for the same user, but one running at a lower integrity level, from accessing these objects and modifying their content or behavior (for example, DLL injection or code modification).

Apart from an integrity level, objects also have a mandatory policy, which defines the actual level

of protection that's applied based on the integrity-level check. Three types are possible, shown in

Table 7-4. The integrity level and the mandatory policy are stored together in the same ACE.

---

TABLE 7-4 Object mandatory policies

<table><tr><td>Policy</td><td>Present on, by Default</td><td>Description</td></tr><tr><td>No-Write-Up</td><td>Implicit on all objects</td><td>Used to restrict write access coming from a lower integrity level process to the object.</td></tr><tr><td>No-Read-Up</td><td>Only on process objects</td><td>Used to restrict read access coming from a lower integrity level process to the object. Specific use on process objects protects against information leakage by blocking address space reads from an external process.</td></tr><tr><td>No-Execute-Up</td><td>Only on binaries implementing COM classes</td><td>Used to restrict execute access coming from a lower integrity level process to the object. Specific use on COM classes is to restrict launch-activation permissions on a COM class.</td></tr></table>


## EXPERIMENT: Looking at the integrity level of objects

You can use the AccessChk tool from Sysinternals to display the integrity level of objects on the system, such as files, processes, and registry keys. Here's an experiment showing the purpose of the LocalLow directory in Windows:

1. Browse to C:\Users\<Username\> in a command prompt window, where <username> is your user name.

2. Try running AccessChk on the AppData folder, as follows:

```bash
C:\Users\UserName> accesschk -v appdata
```

3. Note the differences between the Local and LocalLow subfolders in your output, similar to that shown here:

```bash
C:\Users\UserName\AppData\Local
Medium Mandatory Level (Default) [No-Write-Up]
[...]
C:\Users\UserName\AppData\LocalLow
Low Mandatory Level [No-Write-Up]
[...]
C:\Users\UserName\AppData\Roaming
Medium Mandatory Level (Default) [No-Write-Up]
[...]
```

4. Notice that the LocalLow directory has an integrity level set to Low, while the Local and

Roaming directories have integrity levels of Medium (default). The default means the

system is using an implicit integrity level.

5. Pass the --flag to AccessChk so it displays only explicit integrity levels. If you run the tool on the AppData folder again, you'll notice only the LocalLow information is displayed.

The -o (object), -k (registry key), and -p (process) flags allow you to specify something other

than a file or directory.

---

## Tokens

The SRM uses an object called a token (or access token) to identify the security context of a process or thread. A security context consists of information that describes the account, groups, and privileges associated with the process or thread. Tokens also include information such as the session ID, the integrity level, and the UAC virtualization state. (We'll describe both privileges and UAC's virtualization mechanism later in this chapter.)

During the logon process (described later in this chapter), LSass creates an initial token to represent

the user logging on. It then determines whether the user logging on is a member of a powerful group

or possesses a powerful privilege. The groups checked for in this step are as follows:

- ●  Built-In Administrators

●  Certificate Administrators

●  Domain Administrators

●  Enterprise Administrators

●  Policy Administrators

●  Schema Administrators

●  Domain Controllers

●  Enterprise Read-Only Domain Controllers

●  Read-Only Domain Controllers

●  Account Operators

●  Backup Operators

●  Cryptographic Operators

●  Network Configuration Operators

●  Print Operators

●  System Operators

●  RAS Servers

●  Power Users

●  Pre-Windows 2000 Compatible Access
Many of the groups listed are used only on domain-joined systems and don't give users local administrative rights directly. Instead, they allow users to modify domain-wide settings.

The privileges checked for are as follows:

- ● SeBackupPrivilege

● SeCreateTokenPrivilege

● SeDebugPrivilege

● SeImpersonatePrivilege
632    CHAPTER 7   Security


---

- • SeLabelPrivilege

• SeLoadDriverPrivilege

• SeRestorePrivilege

• SeTakeOwnershipPrivilege

• SeTcbPrivilege
These privileges are described in detail in the section "Privileges," later in this chapter.

If one or more of these groups or privileges are present, Lass creates a restricted token for the user

(also called a filtered admin token) and creates a logon session for both. The standard user token is at tached to the initial process or processes that Winlogon starts (by default, Userinit.exe).

![Figure](figures/Winternals7thPt1_page_650_figure_003.png)

Note If UAC has been disabled, administrators run with a token that includes their administrator group memberships and privileges.

Because child processes inherit a copy of the token of their creators by default, all processes in the user's session run under the same token. You can also generate a token by using the Windows LogonUser function. You can then use this token to create a process that runs within the security context of the user logged on through the LogonUser function by passing the token to the Windows CreateProcessAsUser function. The CreateProcessWithLogon() function combines these into a single call, which is how the Runas command launches processes under alternative tokens.

Tokens vary in size because different user accounts have different sets of privileges and associated group accounts. However, all tokens contain the same types of information. The most important contents of a token are represented in Figure 7-7.

![Figure](figures/Winternals7thPt1_page_650_figure_007.png)

FIGURE 7-7 Access tokens.

CHAPTER 7   Security      633


---

The security mechanisms in Windows use two components to determine what objects can be accessed and what secure operations can be performed. One component comprises the token's user account SID and group SID fields. The SRM uses SIDs to determine whether a process or thread can obtain requested access to a vulnerable object, such as an NTFS file.

The group SIDs in a token indicate which groups a user's account is a member of. For example, a server application can disable specific groups to restrict a token's credentials when the server application is performing actions requested by a client. Disabling a group produces nearly the same effect as if the group wasn't present in the token. (It results in a deny-only group, described in the section "Restricted tokens. " Disabled SIDs are used as part of security access checks, described in the section "Determining access" later in the chapter.) Group SIDs can also include a special SID that contains the integrity level of the process or thread. The SRM uses another field in the token, which describes the mandatory integrity policy, to perform the mandatory integrity check described later in the chapter.

The second component in a token that determines what the token's thread or process can do is

the privilege array. A token's privilege array is a list of rights associated with the token. An example of

a privilege is the right of the process or thread associated with the token to shut down the computer.

Privileges are described in more detail later in this chapter.

A token's default primary group field and default discretionary access control list (DACL) field are security attributes that Windows applies to objects that a process or thread creates when it uses the token. By including security information in tokens, Windows makes it convenient for a process or thread to create objects with standard security attributes because the process or thread doesn't need to request discrete security information for every object it creates.

Each token's type distinguishes a primary token (a token that identifies the security context of a process) from an impersonation token (a type of token that threads use to temporarily adapt a different security context, usually of another user). Impersonation tokens carry an impersonation level that signifies what type of impersonation is active in the token. (Impersonation is described later in this chapter.)

A token also includes the mandatory policy for the process or thread, which defines how MIC will behave when processing this token. There are two policies:

- ■ TOKEN_MANDATORY_NO_WRITE_UP Enabled by default, this sets the No-Write-Up policy on this
token, specifying that the process or thread will not be able to access objects with a higher
integrity level for write access.

■ TOKEN_MANDATORY_NEW_PROCESS_MIN Also enabled by default, this specifies that the SRM
should look at the integrity level of the executable image when launching a child process and
compute the minimum integrity level of the parent process and the file object's integrity level
as the child's integrity level.
Token flags include parameters that determine the behavior of certain UAC and UIPI mechanisms, such as virtualization and user interface access. Those mechanisms will be described later in this chapter.

Each token can also contain attributes that are assigned by the Application Identification service

(part of AppLocker) when AppLocker rules have been defined. AppLocker and its use of attributes in

the access token are described later in this chapter.

634 CHAPTER 7 Security


---

A token for a UWP process includes information on the AppContainer hosting the process. First, it stores a package SID, identifying the UWP package the process originated from. The significance of this SID will be described in the "AppContainers" section later in this chapter. Second, UWP processes need to request capabilities for operations that require the user's consent. Examples of capabilities include network access, using the phone capabilities of the device (if any), accessing the camera on the device, and more. Each such capability is represented with a SID, stored as part of the token. (Capabilities will be discussed further in the "AppContainers" section.)

The remaining fields in a token serve informational purposes. The token source field contains a short textual description of the entity that created the token. Programs that want to know where a token originated use the token source to distinguish among sources such as the Windows Session Manager, a network file server, or the remote procedure call (RPC) server. The token identifier is a locally unique identifier (LUID) that the SRM assigns to the token when it creates the token. The Windows executive maintains the executive LUID, a monotonically increasing counter it uses to assign a unique numeric identifier to each token. A LUID is guaranteed to be unique only until the system is shut down.

The token authentication ID is another kind of LUID. A token's creator assigns the token's authentication ID when calling the LsaLogonlnsel function. If the creator doesn't specify a LUID, Lsas obtains the LUID from the executive LUID. Lsas copies the authentication ID for all tokens descended from an initial logon token. A program can obtain a token's authentication ID to see whether the token belongs to the same logon session as other tokens the program has examined.

The executive LUID refreshes the modified ID every time a token's characteristics are modified. An application can test the modified ID to discover changes in a security context since the context's last use.

Tokens contain an expiration time field that can be used by applications performing their own se curity to reject a token after a specified amount of time. However, Windows itself does not enforce the

expiration time of tokens.

![Figure](figures/Winternals7thPt1_page_652_figure_005.png)

Note To guarantee system security, the fields in a token are immutable (because they are located in kernel memory). Except for fields that can be modified through a specific system call designed to modify certain token attributes (assuming the caller has the appropriate access rights to the token object), data such as privileges and SIDs in a token can never be modified from user mode.

## EXPERIMENT: Viewing access tokens

The kernel debugger dt_TOKEN command displays the format of an internal token object.

Although this structure differs from the user-mode token structure returned by Windows API

security functions, the fields are similar. For further information on tokens, see the description in

the Windows SDK documentation.

CHAPTER 7   Security      635

---

Here's a token structure on Windows 10:

```bash
tksd- dt_ntl_token
    +0x000 TokenSource   : _TOKEN_SOURCE
    +0x010 TokenId      : _UID
    +0x018 AuthenticationId : _UID
    +0x020 ParentTokenId   : _UID
    +0x028 ExpirationTime : _LARGE_INTEGER
    +0x030 TokenLock      : Ptr64_£RESOURCE
    +0x038 ModifiedId     : _UID
    +0x040 Privileges       : _SEP_TOKEN_PRIVILEGES
    +0x058 AuditPolicy      : _SEP_AUDIT_POLICY
    +0x078 SessionId        : Uint4B
    +0x07c UserAndGroupCount : Uint4B
    +0x080 RestrictedSidCount : Uint4B
    +0x084 VariableLength : Uint4B
    +0x088 DynamicCharged  : Uint4B
    +0x08C DynamicAvailable : Uint4B
    +0x090 DefaultOwnerIndex : Uint4B
    +0x098 UserAndGroups   : Ptr64__SID_AND_ATTRIBUTES
    +0x0a0 RestrictedSids : Ptr64__SID_AND_ATTRIBUTES
    +0x0a8 PrimaryGroup   : Ptr64 Void
    +0x0b0 DynamicPart     : Ptr64 Uint4B
    +0x0b8 DefaultDoc1   : Ptr64_ACL
    +0x0c0 TokenType       : _TOKEN_TYPE
    +0x0c4 ImpersonationLevel : _SECURITY_IMPERSONATION_LEVEL
    +0x0c8 TokenFlags      : Uint4B
    +0x0cc TokenInUse    : UChar
    +0x0d0 IntegrityLevelIndex : Uint4B
    +0x0d4 MandatoryPolicy : Uint4B
    +0x0d8 LogonSession    : Ptr64__SEP_LOGON_SESSION_REFERENCES
    +0x0e0 OriginatingLogonSession : _LUID
    +0x0e8 SidHash        : _SID_AND_ATTRIBUTES_HASH
    +0x1f8 RestrictedSidhash : _SID_AND_ATTRIBUTES_HASH
    +0x308 pSecurityAttributes : Ptr64__AUTHZBASEP_SECURITY_ATTRIBUTES_INFORMATION
    +0x310 Package       : Ptr64 Void
    +0x318 Capabilities      : Ptr64__SID_AND_ATTRIBUTES
    +0x320 CapabilityCount : Uint4B
    +0x328 CapabilitiesHash : _SID_AND_ATTRIBUTES_HASH
    +0x438 LowBoxNumberEntry : Ptr64__SEP_LOWBOX_NUMBER_ENTRY
    +0x440 LowBoxHandlesEntry : Ptr64__SEP_LOWBOX_HANDLES_ENTRY
    +0x448 pClaimAttributes : Ptr64__AUTHZBASEP_CLAIM_ATTRIBUTES_COLLECTION
    +0x450 TrustLevelSid    : Ptr64 Void
    +0x458 TrustLinkedToken : Ptr64__TOKEN
    +0x460 IntegrityLevelSidValue : Ptr64 Void
    +0x468 TokenSidValues    : Ptr64__SEP_SID_VALUES_BLOCK
    +0x470 IndexEntry      : Ptr64__SEP_LUID_TO_INDEX_MAP_ENTRY
    +0x478 DiagnosticInfo      : Ptr64__SEP_TOKEN_DIAG_TRACK_ENTRY
    +0x480 SessionObject      : Ptr64 Void
    +0x488 VariablePart     : Uint8B
```

636   CHAPTER 7   Security


---

You can examine the token for a process with the !token command. You'll find the address of the token in the output of the !process command. Here's an example for an explorer.exe process:

1kb+ !process 0 1 explorer.exe

PROCESS FFFFFFF8304dfd780

SessionID: 1 Cid: 23e4 Peb: 00c2a000 ParentCtid: 2264

DRBase: 2aa0f6000 ObjectTable: ffffcd82c72fdc80 HandleCount: <Data Not

Accessible>

Image: explorer.exe

VadRoot ffffcd8130658480 Vads 705 Clione 0 Private 376410. Locked 18.

DeviceMap ffffcd82c39bc0d0

Token ffffffffc82c72fc060

...

PROCESS FFFFFFF830670a080

SessionID: 1 Cid: 27b8 Peb: 00950000 ParentCtid: 035c

DRBase: 2cb97000 ObjectTable: ffffcd82c7ccc500 HandleCount: <Data Not

Accessible>

Image: explorer.exe

VadRoot ffffcd813064e9f60 Vads 1991 Clione 0 Private 19576. Modified 87095. Locked 0.

DeviceMap ffffcd82c39bc0d0

Token ffffffffc82c7cd9060

...

1kb+ !token ffffcd82c72fc060

TO_TOKEN: 0xffffcd82c72fc060

TS Session ID: 0x1

User: S-1-5-21-3537846094-3055369412-2967912182-1001

User Groups:

00 S-1-16-8192 Attributes - GroupIntegrity GroupIntegrityEnabled

01 S-1-1-0 Attributes - Mandatory Default Enabled

02 S-1-5-114 Attributes - DenyOnly

03 S-1-5-21-3537846094-3055369412-2967912182-1004

Attributes - Mandatory Default Enabled

04 S-1-5-32-544 Attributes - DenyOnly

05 S-1-5-32-578 Attributes - Mandatory Default Enabled

06 S-1-5-32-559 Attributes - Mandatory Default Enabled

07 S-1-5-32-545 Attributes - Mandatory Default Enabled

08 S-1-5-4 Attributes - Mandatory Default Enabled

09 S-1-2-1 Attributes - Mandatory Default Enabled

10 S-1-5-11 Attributes - Mandatory Default Enabled

11

CHAPTER 7 Security 637


---

```bash
11 S-1-5-15
     Attributes - Mandatory Default Enabled
  12 S-1-11-96-3623454863-58364-18864-2661722203-1597581903-1225312835-2511459453-
1556397606-2735945305-1404291241
     Attributes - Mandatory Default Enabled
  13 S-1-5-113
     Attributes - Mandatory Default Enabled
  14 S-1-5-5-0-1745560
     Attributes - Mandatory Default Enabled LogonId
  15 S-1-2-0
     Attributes - Mandatory Default Enabled
  16 S-1-5-64-36
     Attributes - Mandatory Default Enabled
  Primary Group: S-1-5-21-3537846094-3055369412-2967912182-1001
  Privise:
  19 0x000000013 SeShutdownPrivilege        Attributes -
  23 0x000000017 SeChangeNotifyPrivilege       Attributes - Enabled Default
  25 0x000000019 SeUndockPrivilege          Attributes -
  33 0x000000021 SeIncreaseWorkingSetPrivilege    Attributes -
  34 0x000000022 SeTimeZonePrivilege           Attributes -
  Authentication ID:                (0,1aa448)
  Impersonation Level:            Anonymous
  TokenType:                Primary
  Source:User32             TokenFlags: 0x2a00 ( Token in use )
  Token ID:1be803             ParentToken ID: 1aa44b
  Modified ID:                (0, 43d9289)
  RestrictedSdCount: 0           RestrictedSds: 0x0000000000000000
  OriginatingLogonSession: 3e7
  PackageSid: (null)
  CapabilityCount: 0      Capabilities: 0x0000000000000000
  LowboxNumberEntry: 0x0000000000000000
  Security Attributes:
  Unable to get the offset of nt!\AUTHZBASEP_SECURITY_ATTRIBUTE.ListLink
  Process Token TrustLevelSid: (null)
```

Notice that there is no package SID for Explorer, since it's not running inside an AppContainer.

Run calc.exe under Windows 10, which spawns calculator.exe (now a UWP app), and examine

its token:

```bash
!kd> !process 0 1 calculator.exe
PROCESS ffffel8309e874c0
    SessionId: 1  Cid: 3c18   Peb: cd0182c000  ParentCid: 035c
        DirBase: 7a15e4000  ObjectTable: ffffcd82ec9a37c0  HandleCount: <Data Not
Accessible>
        Image: Calculator.exe
        VadRoot ffffel831fc197c0 Vads 181 Clone 0 Private 3800. Modified 3746. Locked 503.
        DeviceMap ffffcd82c39bc0d0
        Token                     ffffcd82e26168f0
    ...
!kd> !token ffffcd82e26168f0
_TOKEN 0xffffcd82e26168f0
CHAPTER 7  Security
From the Librar
```

---

```bash
T5 Session ID: 0x1
  User: S-1-5-21-3537846094-3055369412-2967912182-1001
  User Groups:
   00 S-1-16-4096
     Attributes - GroupIntegrity GroupIntegrityEnabled
   01 S-1-1-0      Attributes - Mandatory Default Enabled
   02 S-1-1-5-114    Attributes - DenyOnly
   03 S-1-5-21-3537846094-3055369412-2967912182-1004
     Attributes - Mandatory Default Enabled
   04 S-1-5-32-544    Attributes - DenyOnly
   05 S-1-5-32-578    Attributes - Mandatory Default Enabled
   06 S-1-5-32-559    Attributes - Mandatory Default Enabled
   07 S-1-5-32-545    Attributes - Mandatory Default Enabled
   08 S-1-5-4      Attributes - Mandatory Default Enabled
   09 S-1-2-1        Attributes - Mandatory Default Enabled
   10 S-1-5-11        Attributes - Mandatory Default Enabled
   11 S-1-5-15        Attributes - Mandatory Default Enabled
   12 S-1-11-96-3623454863-58364-18864-2661722203-1597581903-1225312835-2511459453-
1556397606-2735945305-1404291241
   13 S-1-5-113        Attributes - Mandatory Default Enabled
   14 S-1-5-5-0-174550    Attributes - Mandatory Default Enabled LogonId
   15 S-1-2-0        Attributes - Mandatory Default Enabled
   16 S-1-5-64-36    Attributes - Mandatory Default Enabled
   17 Primary Group: S-1-5-21-3537846094-3055369412-2967912182-1001
   Previs:
   19 0x00000013 SeShutdownPrivilege            Attributes -
   23 0x00000017 SeChangeNotifyPrivilege           Attributes - Enabled Default
   25 0x00000019 SeUndockPrivilege             Attributes -
   33 0x00000021 SeIncreaseWorkingSetPrivilege      Attributes -
   34 0x00000022 SeTimeZonePrivilege             Attributes -
   Authentication ID:                (0,1aa448)
   Impersonation Level:       Anonymous
   TokenType:               Primary
   Source: User32              TokenFlags: 0x4a00 ( Token in use )
   Token ID: 4ddb8c0              ParentToken ID: 1aa44b
   Modified ID:                (0, 4ddb8b2)
```

CHAPTER 7   Security      639


---

```bash
RestrictedSdCount: 0     RestrictedSids: 0x0000000000000000
OriginatingLogonSession: 3e7
PackageSid: S-1-15-2-466767348-3739614953-2700836392-1801644223-4227750657-
1087833535-2488631167
CapabilityCount: 1     Capabilities: 0xffffcd82e1bfcdc0
Capabilities:
    00 S-1-15-3-466767348-3739614953-2700836392-1801644223-4227750657-1087833535-
2488631167
    Attributes - Enabled
LowboxNumberEntry: 0xffffcd82fa2c1670
LowboxNumber: 5
Security Attributes:
Unable to get the offset of ntl_AUTHZBASEP_SECURITY_ATTRIBUTE.ListLink
Process Token TrustLevelSid: (null)
    You can see there is one capability required by Calculator (which is in fact equal to its
AppContainer SID RID, as described in the section "AppContainers" later in this chapter). Looking
at the token of the Cortana process (searchui.exe) shows the following capabilities:
!kdt> !process 0 1 searchui.exe
PROCESS fffffe1831307d080
    SessionId: 1 Cid: 29dB   Peb: fb407ec000  ParentCid: 035c
DeepFreeze
    DirBase: 38b635000  ObjectTable: ffffcd830059e580  HandleCount: <Data Not
Accessible>
    Image: SearchUI.exe
    VadRoot fffffe1831fe9130 Vads 420 Clone 0 Private 11029. Modified 2031. Locked 0.
DeviceMap ffffcd82c39bc0d0
    Token
        ...
!kdt> !token ffffcd82d97d18f0
  _TOKEN 0xffffcd82d97d18f0
TS Session ID: 0x1
User: S-1-5-21-3537846094-3055369412-2967912182-1001
User Groups:
  ...
Primary Group: S-1-5-21-3537846094-3055369412-2967912182-1001
Privs:
   19 0x000000013 SaShutdownPrivilege        Attributes -
   23 0x000000017 SaChangeNotifyPrivilege      Attributes - Enabled Default
   25 0x000000019 SeUndockPrivilege        Attributes -
   33 0x000000021 SeIncreaseWorkingSetPrivilege   Attributes -
   34 0x000000022 SeTimeZonePrivilege        Attributes -
   Authentication ID:      (0,1aa448)
   Impersonation Level:      Anonymous
   TokenType:               Primary
   Source: UserJ32       TokenFlags: 0x4a00 ( Token in use )
   Token ID: 4483430      ParentToken ID: 1aa44b
   Modified ID:            (0, 4481b11)
   RestrictedSdCount: 0     RestrictedSids: 0x0000000000000000
   OriginatingLogonSession: 3e7
```

640 CHAPTER 7 Security


---

```bash
PackageSid: S-1-15-2-1861897761-1695161497-2927542615-642690995-327840285-
2659745135-2630312742
CapabilityCount: 32
    Capabilities: 0xffffcd82f78149b0
Capabilities:
 00 S-1-15-3-1024-1216833578-114521899-3977640588-1343180512-2505059295-473916851-
3379430939-3088591068
    Attributes - Enabled
 01 S-1-15-3-1024-3299255270-1847605585-2201808924-710406709-3613095291-873286183-
3101090833-2655911836
    Attributes - Enabled
 02 S-1-15-3-1024-34359262-2669769421-2130994847-3068338639-3284271446-2009814230-
2411358368-8146686995
    Attributes - Enabled
 03 S-1-15-3-1
    Attributes - Enabled
''''
29 S-1-15-3-3633849274-1266774400-1199443125-2736873758
    Attributes - Enabled
 30 S-1-15-3-2569730672-1095266119-53537203-1209375796
    Attributes - Enabled
31 S-1-15-3-2452736844-1257488215-2818397580-3305426111
    Attributes - Enabled
LowboxNumberEntry: 0xffffcd82c7539110
LowboxNumber: 2
Security Attributes:
Unable to get the offset of nt!_AUTHZBASEP_SECURITY_ATTRIBUTE.LinkLink
Process Token TrustLevelSid: (null)
```

There are 32 capabilities required by Cortana. This simply indicates the process is richer in

features that need to be accepted by end users and validated by the system.

You can indirectly view token contents with Process Explorer's Security tab in the process

Properties dialog box. The dialog box shows the groups and privileges included in the token of

the process you examine.

