## 5  SECURITY DESCRIPTORS

![Figure](figures/WindowsSecurityInternals_page_173_figure_001.png)

In the preceding chapter, we discussed the security access token, which describes the user's identity to the SRM. In this chap-

ter, you'll learn how security descriptors define a resource's security. A security descriptor does several things. It specifies the owner of a resource, allowing the SRM to grant specific rights to users who are accessing their own data. It also contains the discretionary access control (DAC) and mandatory access control (MAC), which grant or deny access to users and groups. Finally, it can contain entries that generate audit events. Almost every kernel resource has a security descriptor, and user-mode applications can implement their own access control through security descriptors without needing to create a kernel resource.

Understanding the structure of security descriptors is crucial to understanding the security of Windows, as they're used to secure every

---

kernel object and many user-mode components, such as services. You'll even find security descriptors used across network boundaries to secure remote resources. While developing a Windows application or researching Windows security, you'll inevitably have to inspect or create a security descriptor, so having a clear understanding of what a security descriptor contains will save you a lot of time. To help with this, I'll start by describing the structure of a security descriptor in more detail.

## The Structure of a Security Descriptor

Windows stores security descriptors as binary structures on disk or in memory. While you'll rarely have to manually parse these structures, it's worth understanding what they contain. A security descriptor consists of the following seven components:

- • The revision
• Optional resource manager flags
• Control flags
• An optional owner SID
• An optional group SID
• An optional discretionary access control list
• An optional system access control list
Let's look at each of these in turn. The first component of any security descriptor is the revision, which indicates the version of the security descriptor’s binary format. There is only one version, so the revision is always set to the value 1. Next is an optional set of flags for use by a resource manager. You'll almost never encounter these flags being set; however, they are used by Active Directory, so we'll talk more about them in Chapter 11.

The resource manager flags are followed by a set of control flags . These have three uses: they define which optional components of the security descriptor are valid, how the security descriptors and components were created, and how to process the security descriptor when applying it to an object. Table 5-1 shows the list of valid flags and their descriptions. We'll cover many of the terms in this table, such as inheritance, in more detail in the following chapter.

Table 5-1: Valid Control Flags

<table><tr><td>Name</td><td>Value</td><td>Description</td></tr><tr><td>OwnerDefaulted</td><td>0x0001</td><td>The owner SID was assigned through a default method.</td></tr><tr><td>GroupDefaulted</td><td>0x0002</td><td>The group SID was assigned through a default method.</td></tr><tr><td>DaclPresent</td><td>0x0004</td><td>The DACL is present in the security descriptor.</td></tr><tr><td>DaclDefaulted</td><td>0x0008</td><td>The DACL was assigned through a default method.</td></tr></table>


144    Chapter 5

---

<table><tr><td>Name</td><td>Value</td><td>Description</td></tr><tr><td>SaclPresent</td><td>0x0010</td><td>The SACL is present in the security descriptor.</td></tr><tr><td>SaclDefaulted</td><td>0x0020</td><td>The SACL was assigned through a default method.</td></tr><tr><td>DaclUntrusted</td><td>0x0040</td><td>When combined with ServerSecurity, the DACL is untrusted.</td></tr><tr><td>ServerSecurity</td><td>0x0080</td><td>The DACL is replaced with a server ACL (more on the use of this in Chapter 6).</td></tr><tr><td>DaclAutoInheritReq</td><td>0x0100</td><td>DACL auto-inheritance for child objects is requested.</td></tr><tr><td>SaclAutoInheritReq</td><td>0x0200</td><td>SACL auto-inheritance for child objects is requested.</td></tr><tr><td>DaclAutoInherited</td><td>0x0400</td><td>The DACL supports auto-inheritance.</td></tr><tr><td>SaclAutoInherited</td><td>0x0800</td><td>The SACL supports auto-inheritance.</td></tr><tr><td>DaclProtected</td><td>0x1000</td><td>The DACL is protected from inheritance.</td></tr><tr><td>SaclProtected</td><td>0x2000</td><td>The SACL is protected from inheritance.</td></tr><tr><td>RmControlValid</td><td>0x4000</td><td>The resource manager flags are valid.</td></tr><tr><td>SelfRelative</td><td>0x8000</td><td>The security descriptor is in a relative format.</td></tr></table>


After the control flags comes the owner SID , which represents the owner of the resource. This is typically the user's SID; however, ownership can also be assigned to a group, such as the Administrators group. Being the owner of a resource grants you certain privileges, including the ability to modify the resource's security descriptor. By ensuring the owner has this capability, the system prevents a user from locking themselves out of their own resources.

The groupSid is like the owner SID, but it's rarely used. It exists primarily to ensure POSIX compatibility (a concern in the days when Windows still had a POSIX subsystem) and plays no part in access control for Windows applications.

The most important part of the security descriptor is the discretionary access control list (DACL) . The DACL contains a list of access control entries (ACEs) , which define what access a SID is given. It's considered discretionary because the user or system administrator can choose the level of access granted. There are many different types of ACEs. We'll discuss these further in “Access Control List Headers and Entries” on page 151; for now, you just need to know that the basic information in each ACE includes the following:

- • The SID of the user or group to which the ACE applies
• The type of ACE
• The access mask to which the SID will be allowed or denied access
The final component of the security descriptor is the security access control list (SACL) , which stores auditing rules. Like the DACL, it contains a list

---

of ACEs, but rather than determining access based on whether a defined SID matches the current user's, it determines the rules for generating audit events when the resource is accessed. Since Windows Vista, the SACL has also been the preferred location in which to store additional non-auditing ACEs, such as the resource's mandatory label.

Two final elements to point out in the DACL and SACL are the 9ac1 Present and 9ac1Present control flags. These flags indicate that the DACL and SACL, respectively, are present in the security descriptor. Using flags allows for the setting of a NULL ACL, where the present flag is set but no value has been specified for the ACL field in the security descriptor. A NULL ACL indicates that no security for that ACL has been defined and causes the SRM to effectively ignore it. This is distinct from an empty ACL, where the present flag is set and a value for the ACL is specified but the ACL contains no ACEs.

## The Structure of a SID

Until now, we've talked about SIDs as opaque binary values or strings of numbers. In this section, we'll look more closely at what a SID contains. The diagram in Figure 5-1 shows a SID as it's stored in memory.

![Figure](figures/WindowsSecurityInternals_page_176_figure_004.png)

Figure 5-1: The SID structure in memory

There are four components to a binary SID:

Revision A value that is always set to 1, as there is no other defined version number.

Relative identifier count The number of RIDs in the SID

Security authority A value representing the party that issued the SID.

Relative identifiers Zero or more 32-bit numbers that represent the user or group

The security authority can be any value, but Windows has predefined some commonly used ones. All well-known authorities start with five 0 bytes followed by a value from Table 5-2.

146    Chapter 5

---

Table 5-2: Well-Known Authorities

<table><tr><td>Name</td><td>Final value</td><td>Example name</td></tr><tr><td>Null</td><td>0</td><td>NULL SID</td></tr><tr><td>World</td><td>1</td><td>Everyone</td></tr><tr><td>Local</td><td>2</td><td>CONSOLE LOGON</td></tr><tr><td>Creator</td><td>3</td><td>CREATOR OWNER</td></tr><tr><td>Nt</td><td>5</td><td>BUILTIN\Users</td></tr><tr><td>Package</td><td>15</td><td>APPLICATION PACKAGE AUTHORITY\Your Internet connection</td></tr><tr><td>MandatoryLabel</td><td>16</td><td>Mandatory label\Medium Mandatory Level</td></tr><tr><td>ScopedPolicyId</td><td>17</td><td>N/A</td></tr><tr><td>ProcessTrust</td><td>19</td><td>TRUST LEVEL\ProtectedLight\Windows</td></tr></table>


After the security authority come the relative identifiers. A SID can contain one or more RIDs, with the domain RIDs followed by the user RIDs.

Let's walk through how the SID is constructed for a well-known group, BUILTINUsers. Note that the domain component is separated from the group name with a backslash. In this case, the domain is BUILTIN. This is a predefined domain represented by a single RID, 32. Listing 5-1 builds the domain SID for the BUILTIN domain from its components by using the Get-NTsSid PowerShell command, then uses the Get-NTsSidName command to retrieve the system-defined name for the SID.

```bash
PS> $domain_id = Get-NtSid -SecurityAuthority Nt -RelativeIdentifier 32
PS> Get-NtSidName $domain_id
Domain Name
Source NameUse Sddl
-------
------- -------------------------------
BUILTIN BUILTIN Account Domain  S-1-S-32
```

Listing 5-1: Querying for the BUILTIN domain's SID

The BUILTIN domain's SID is a member of the NT security authority. We specify this security authority using the SecurityAuthority parameter and specify the single RID using the RelativeIdentifier parameter.

We then pass the SID to the Get-NTsName command. The first two columns of the output show the domain name and the name of the SID. In this case, those values are the same; this is just a quirk of the BUILTIN domain's registration.

The next column indicates the location from which the name was retrieved. In this example, the source, Account, indicates that the name was retrieved from LSASS. If the source were Wellknown , this would indicate that PowerShell knew the name ahead of time and didn't need to query LSASS. The fourth column, NameUse , indicates the SID's type. In this case, it's Domain, which we might have expected. The final column is the SID in its SDDL format.

---

Any RIDs specified for SIDs following the domain SID identify a particular user or group. For the User group, we use a single RID with the value 545 (predefined by Windows). Listing 5-2 creates a new SID by adding the 545 RID to the base domain's SID.

```bash
PS> $user_sid = Get-NTSid -BaseSid $domain_sid -RelativeIdentifier 545
PS> Get-NTSidName $user_sid
Domain   Name   Source   NameUse $ddl
------- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
```

Listing 5-2: Constructing a SID from a security authority and RIDs

The output now shows Users as the SID name. Also notice that NameInse in this case is set to Alias. This indicates that the SID represents a local, builtin group, as distinct from Group, which represents a user-defined group. When we print the Name property on the SID, it outputs the fully qualified name, with the domain and the name separated by a backslash.

You can find lists of known SIDs in Microsoft's technical documentation and on other websites. However, Microsoft sometimes adds SIDs without documenting them. Therefore, I encourage you to test multiple security authority and RID values to see what other users and groups you can find. Merely checking for different SIDs won't cause any damage. For example, try replacing the user RID in Listing 5-2 with $44. This new SID represents the BUILTINAdministrator group, as shown in Listing 5-3.

```bash
PS> Get-NTSid -BaseSid $domain_sid -RelativeIdentifier 544
Name                     Sid
----                     -----
BUILTIN\Administrators 5-1-5-32-544
```

Listing 5-3: Querying the Administrators group SID

Remembering the security authority and RIDs for a specific SID can be tricky, and you might not recall the exact name to query by using the Name parameter, as described in Chapter 2. Therefore, get-ntSid implements a mode that can query a SID from a known set. For example, to query the SID of the Administrators group, you can use the command shown in Listing 5-4.

```bash
PS> Get-NtSid -KnownSid BuiltinAdministrators
Name                     Sid
-----                -----
BUILTIN\Administrators 5-1-5-32-544
```

Listing 5-4: Querying the known Administrators group SID

148      Chapter 5

---

You'll find SIDs used throughout the Windows operating system. It's crucial that you understand how they're structured, as this will allow you to quickly assess what a SID might represent. For example, if you identify a SID with the 0x security authority and its first RID is 32, you can be sure it's representing a built-in user or group. Knowing the structure also allows you to identify and extract SIDs from crash dumps or memory in cases where better tooling isn't available.

## Absolute and Relative Security Descriptors

The kernel supports two binary representation formats for security descriptors: absolute and relative. We'll examine both in this section, and consider the advantages and disadvantages of each.

Both formats start with the same three values: the revision, the resource manager flags, and the control flags. The $elf@relative flag in the control flags determines which format to use, as shown in Figure 5-2.

![Figure](figures/WindowsSecurityInternals_page_179_figure_004.png)

Figure 5-2: Selecting the security descriptor format

The total size of the security descriptor's header is 32 bits, split between two 8-bit values, the revision and $bz1, and the 16-bit control flags. The security descriptor's resource manager flags are stored in $bz1; these are only valid if the @controlValid control flag is set, although the value will be present in either case. The rest of the security descriptor is stored immediately after the header.

The simplest format, the absolute security descriptor, is used when the SelfRelative flag is not set. After the common header, the absolute format defines four pointers to reference in memory: the owner SID, the group SID, the DACL, and the SACL, in that order, as shown in Figure 5-3.

---

![Figure](figures/WindowsSecurityInternals_page_180_figure_000.png)

Figure 5-3: The structure of an absolute security descriptor

Each pointer references an absolute memory address at which the data is stored. The size of the pointer therefore depends on whether the application is 32 or 64 bits. It's also possible to specify a NULL value for the pointer to indicate that the value is not present. The owner and group SID values are stored using the binary format defined in the previous section.

When the SelfRelative flag is set, the security descriptor instead follows the relative format. Rather than referencing its values using absolute memory addresses, a relative security descriptor stores these locations as positive offsets relative to the start of its header. Figure 5-4 shows how a relative security descriptor is constructed.

![Figure](figures/WindowsSecurityInternals_page_180_figure_004.png)

Figure 5-4. The structure of a relative security descriptor

150    Chapter 5

---

These values are stored in contiguous memory. The ACL format, which we'll explore in the following section, is already a relative format and therefore doesn't require any special handling when used in a relative security descriptor. Each offset is always 32 bits long, regardless of the system's bit size. If an offset is set to 0, the value doesn't exist, as in the case of NULL for an absolute security descriptor.

The main advantage of an absolute security descriptor is that you can easily update its individual components. For example, to replace the owner SID, you'd allocate a new SID in memory and assign its memory address to the owner pointer. In comparison, modifying a relative security descriptor in the same way might require adjusting its allocated memory if the new owner SID structure is larger than the old one.

On the other hand, the big advantage of a relative security descriptor is that it can be built in a single contiguous block of memory. This allows you to serialize the security descriptor to a persistent format, such as a file or a registry key. When you're trying to determine the security of a resource, you might need to extract its security descriptor from memory or a persistent store. By understanding the two formats, you can determine how to read the security descriptor into something you can view or manipulate.

Most APIs and system calls accept either security descriptor format, determining how to handle a security descriptor automatically by checking the value of the SelfRelative flag. However, you'll find some exceptions in which an API takes only one format or another; in that case, if you pass the API a security descriptor in the wrong format, you'll typically receive an error such as STATUS_INVALID_SECURITY_DESCRIPTOR. Security descriptors returned from an API will almost always be in relative format due to the simplicity of their memory management. The system provides the APIs RtlAbsoluteToSelfRelativeS0 and RtlSelfRelativeToAbsoluteS0 to convert between the two formats if needed.

The PowerShell module handles all security descriptors using a Security@scriptor object, regardless of format. This object is written in .NET and converts to a relative or absolute security descriptor only when it's required to interact with native code. You can determine whether a

Security@scriptor object was generated from a relative security descriptor by inspecting the $e1#relative property.

## Access Control List Headers and Entries

The DACL and SACL make up most of the data in a security descriptor. While these elements have different purposes, they share the same basic structure. In this section we'll cover how they're arranged in memory, leaving the details of how they contribute to the access check process for Chapter 7.

---

## The Header

All ACLS consist of an ACL header followed by a list of zero or more ACEs in one contiguous block of memory. Figure 5-5 shows this top-level format.

![Figure](figures/WindowsSecurityInternals_page_182_figure_002.png)

Figure 5-5: A top-level overview of the ACL structure

The ACL header contains a revision, the total size of the ACL in bytes, and the number of ACE entries that follow the header. Figure 5-6 shows the header structure.

![Figure](figures/WindowsSecurityInternals_page_182_figure_005.png)

Figure 5-6: The structure of the ACL header

The ACL header also contains two reserved fields, $b21 and $b22, both of which should always be 0. They serve no purpose in modern versions of Windows and are there in case the ACL structure needs to be extended. Currently, the Revision field can have one of three values, which determine the ACL's valid ACE. If an ACE uses an ACE that the revision doesn't

152   Chapter 5

---

support, the ACL won't be considered valid. Windows supports the following revisions:

Default The default ACL revision. Supports all the basic ACE types, such as Allowed and Denied. Specified with the Revision value 2.

Compound Adds support for compound ACEs to the default ACL revision. Specified with the Revision value 3.

Object Adds support for object ACEs to the compound. Specified with the Revision value 4.

## The ACE List

Following the ACL header is the list of ACEs, which determines what access the SID has. ACEs are of variable length but always start with a header that contains the ACE type, additional flags, and the ACE's total size. The header is followed by data specific to the ACE type. Figure 5-7 shows this structure.

![Figure](figures/WindowsSecurityInternals_page_183_figure_006.png)

Figure 5-7: The ACE structure

The ACE header is common to all ACE types. This allows an application to safely access the header when processing an ACL. The ACE type value can then be used to determine the exact format of the ACE's typespecific data. If the application doesn't understand the ACE type, it can use the size field to skip the ACE entirely (we'll discuss how types affect access checking in Chapter 7).

Table 5-3 lists the supported ACE types, the minimum ACE revision they are valid in, and whether they are valid in the DACL or the SACL.

Table 5-3: Supported ACE Types, Minimum ACL Revisions, and Locations

<table><tr><td>ACE type</td><td>Value</td><td>Minimum revision</td><td>ACL</td><td>Description</td></tr><tr><td>Allowed</td><td>0x0</td><td>Default</td><td>DACL</td><td>Grants access to a resource</td></tr><tr><td>Denied</td><td>0x1</td><td>Default</td><td>DACL</td><td>Denies access to a resource</td></tr><tr><td>Audit</td><td>0x2</td><td>Default</td><td>SACL</td><td>Audit access to a resource</td></tr></table>


(continued)

---

Table 5-3: Supported ACE Types, Minimum ACL Revisions, and Locations (continued)

<table><tr><td>ACE type</td><td>Value</td><td>Minimum revision</td><td>ACL</td><td>Description</td></tr><tr><td>Alarm</td><td>0x3</td><td>Default</td><td>SACL</td><td>Alarms upon access to a resource; unused</td></tr><tr><td>AllowedCompound</td><td>0x4</td><td>Compound</td><td>DACL</td><td>Grants access to a resource during impersonation</td></tr><tr><td>AllowedObject</td><td>0x5</td><td>Object</td><td>DACL</td><td>Grants access to a resource with an object type</td></tr><tr><td>DeniedObject</td><td>0x6</td><td>Object</td><td>DACL</td><td>Denies access to a resource with an object type</td></tr><tr><td>AuditObject</td><td>0x7</td><td>Object</td><td>SACL</td><td>Audit access to a resource with an object type</td></tr><tr><td>AlarmObject</td><td>0x8</td><td>Object</td><td>SACL</td><td>Alarms upon access with an object type; unused</td></tr><tr><td>AllowedCallback</td><td>0x9</td><td>Default</td><td>DACL</td><td>Grants access to a resource with a callback</td></tr><tr><td>DeniedCallback</td><td>0xA</td><td>Default</td><td>DACL</td><td>Denies access to a resource with a callback</td></tr><tr><td>AllowedCallbackObject</td><td>0xB</td><td>Object</td><td>DACL</td><td>Grants access with a callback and an object type</td></tr><tr><td>DeniedCallbackObject</td><td>0xC</td><td>Object</td><td>DACL</td><td>Denies access with a callback and an object type</td></tr><tr><td>AuditCallback</td><td>0xD</td><td>Default</td><td>SACL</td><td>Audit access with a callback</td></tr><tr><td>AlarmCallback</td><td>0xE</td><td>Default</td><td>SACL</td><td>Alarms upon access with a callback; unused</td></tr><tr><td>AuditCallbackObject</td><td>0xF</td><td>Object</td><td>SACL</td><td>Audit access with a callback and an object type</td></tr><tr><td>AlarmCallbackObject</td><td>0x10</td><td>Object</td><td>SACL</td><td>Alarms upon access with a callback and an object type; unused</td></tr><tr><td>MandatoryLabel</td><td>0x11</td><td>Default</td><td>SACL</td><td>Specifies a mandatory label</td></tr><tr><td>ResourceAttribute</td><td>0x12</td><td>Default</td><td>SACL</td><td>Specifies attributes for the resource</td></tr><tr><td>ScopedPolicyId</td><td>0x13</td><td>Default</td><td>SACL</td><td>Specifies a central access policy ID for the resource</td></tr><tr><td>ProcessTrustLabel</td><td>0x14</td><td>Default</td><td>SACL</td><td>Specifies a process trust label to limit resource access</td></tr><tr><td>AccessFilter</td><td>0x15</td><td>Default</td><td>SACL</td><td>Specifies an access filter for the resource</td></tr></table>


While Windows officially supports all these ACE types, the kernel does not use the Alarn types. User applications can specify their own ACE types, but various APIs in user and kernel mode check for valid types and will generate an error if the ACE type isn't known.

An ACE's type-specific data falls primarily into one of three formats: normal ACEs, such as Allowed and Denied; compound ACEs; and object ACEs. A normal ACE contains the following fields after the header, with the field's size indicated in parentheses:

---

Access mask (32-bit) The access mask to be granted or denied based on the ACE type

SID (variable size) The SID, in the binary format described earlier in this chapter

Compound ACEs are for use during impersonation. These ACEs can grant access to both the impersonated caller and the process user at the same time. The only valid type for them is AllowedCompound. Even though the latest versions of Windows still support compound ACEs, they're effectively undocumented and presumably deprecated. I've included them in this book for completeness. Their format is as follows:

Access mask (32-bit) The access mask to be granted

Compound ACE type (16-bit) Set to 1, which means the ACE is used for impersonation

Reserved (16-bit) Always 0

Server SID (variable size) The server SID in binary format; matches the service user

SID (variable size) The SID in a binary format; matches the impersonated user

Microsoft introduced the object ACE format to support access control for Active Directory Domain Services. Active Directory uses a 128-bit GUID to represent a directory service object type; the object ACE determines access for specific types of objects, such as computers or users. For example, using a single security descriptor, a directory could grant a SID the access needed to create one type of object but not another. The object ACE format is as follows:

Access mask (32-bit) The access mask to be granted or denied based on the ACE type

Flags (32-bit) Used to indicate which of the following GUIDs are present

Object type (16-byte) The ObjectType GUID; present only if the flag in bit 0 is set

Inherited object type (16-byte) The inherited object GUID; present only if the flag in bit 1 is set

SID (variable size) The SID in a binary format

ACEs can be larger than their types' defined structures, and they may use additional space to stored unstructured data. Most commonly, they use this unstructured data for the callback ACE types, such as AllowedCallback , which defines a conditional expression that determines whether the ACE should be active during an access check. We can inspect the data that would be generated from a conditional expression using the ConvertFrom%tAcceAction PowerShell command, as shown in Listing 5-5.

---

```bash
PS> ConvertFrom-MtAcCondition |WIN:////TokenId == "XYZ" | Out-HexDump -Showall
---------------------------------------------------
----------------------
00000000: 61 72 74 78 F8 1A 00 03 06 07 08 09 04 08 0C 0E 0F 0F
----------------------
----------------------
00000000: 00 2F 00 2F 04 50 06 08 08 09 06 05 06 0E 09
00000020: 00 64 00 10 06 00 00 08 50 09 5A 00 80 00
----------------------
```

Listing 5-5: Parsing a conditional expression and displaying binary data

We refer to these ACEs as callback ACEs because prior to Windows 8 an application needed to call the AuthzAccessCheck API to handle them. The API accepted a callback function that would be invoked to determine whether to include a callback ACE in the access check. Since Windows 8, the kernel access check has built-in support for conditional ACEs in the format shown in Listing 5-5, although user applications are free to specify their own formats and handle these ACEs manually.

The primary use of the ACE flags is to specify inheritance rules for the ACE. Table 5-4 shows the defined ACE flags.

Table 5-4: ACE Flags

<table><tr><td>ACE flag</td><td>Value</td><td>Description</td></tr><tr><td>ObjectInherit</td><td>0x1</td><td>The ACE can be inherited by an object.</td></tr><tr><td>ContainerInherit</td><td>0x2</td><td>The ACE can be inherited by a container.</td></tr><tr><td>NoPropagateInherit</td><td>0x4</td><td>The ACE&#x27;s inheritance flags are not propagated to children.</td></tr><tr><td>InheritOnly</td><td>0x8</td><td>The ACE is used only for inheritance and not for access checks.</td></tr><tr><td>Inherited</td><td>0x10</td><td>The ACE was inherited from a parent container.</td></tr><tr><td>Critical</td><td>0x20</td><td>The ACE is critical and can&#x27;t be removed. Applies only to Allowed ACEs.</td></tr><tr><td>SuccessfulAccess</td><td>0x40</td><td>An audit event should be generated for a successful access.</td></tr><tr><td>FailedAccess</td><td>0x80</td><td>An audit event should be generated for a failed access.</td></tr><tr><td>TrustProtected</td><td>0x40</td><td>When used with an AccessFilter ACE, this flag prevents modification.</td></tr></table>


The inheritance flags take up only the lower 5 bits, leaving the top 3 bits for ACE-specific flags.

## Constructing and Manipulating Security Descriptors

Now that you're familiar with the structure of a security descriptor, let's look at how to construct and manipulate them using PowerShell. By far the most common reason to do this is to view a security descriptor's contents so you can understand the access applied to a resource. Another important

156    Chapter 5

---

use case is if you need to construct a security descriptor to lock down a resource. The PowerShell module used in this book aims to make constructing and viewing security descriptors as simple as possible.

## Creating a New Security Descriptor

To create a new security descriptor, you can use the New-RtsSecurityDescriptor command. By default, it creates a new SecurityDescriptor object with no owner, group, DACL, or SACL set. You can use the command's parameters to add these parts of the security descriptor, as shown in Listing 5-6.

```bash
PS> %world = Get-Ntsid -KnownSid World
PS> $d = New-NtSecurityDescriptor -Owner %world -Group %world -Type File
PS> $d %d | Format-Table
  Owner        DACL ACE Count SACL ACE Count Integrity Level
  --------------------
  Everyone NONE        NONE        NONE
```

Listing 5-6: Creating a new security descriptor with a specified owner.

We first get the SID for the World group. When calling New-NtSecurity


Descriptor to create a new security descriptor, we use this SID to specify its Owner and Group. We also specify the name of the kernel object type this security descriptor will be associated with; this step makes some of the later commands easier to use. In this case, we'll assume it's a file object's security descriptor.

We then display the security descriptor, formatting the output as a table. As you can see, the 0x001 field is set to everyone . The 0x000 value isn't printed by default, as it's not as important. Neither a DACL nor a SACL is currently present in the security descriptor, and there is no integrity level specified.

To add some ACEs, we can use the Add-NTSecurityDescriptorAce command. For normal ACEs, we need to specify the ACE type, the SID, and the access mask. Optionally, we can also specify the ACE flags. The script in Listing 5-7 adds some ACEs to our new security descriptor.

```bash
# PS> $User = Get-NtSid
# PS> Add-NtSecurityDescriptorAce $sd -Sid $user -Access WriteData, ReadData
# PS> Add-NtSecurityDescriptorAce $sd -KnownSid Anonymous -Access GenericAll
  -Type Denied
# PS> Add-NtSecurityDescriptorAce $sd -Name "Everyone" -Access ReadData
# PS> Add-NtSecurityDescriptorAce $sd -KnownSid World -Access Delete
  -Type Audit -Flags FailedAccess
# PS> Set-NtSecurityDescriptorIntegrityLevel $sd Low
# PS> Set-NtSecurityDescriptorControl $sd DacIAutoInherited, SaclProtected
# PS> $sd | Format-Table
  Owner        DACL ACE Count SACL ACE Count Integrity Level
  --------------------
     Everyone 3                     2                     Low
```

---

```bash
@ PS> Get-NtSecurityDescriptorControl $sd
        DaclPresent, SaclPresent, DaclAutoInherited, SaclProtected
@ PS> Get-NtSecurityDescriptorDacl $sd | Format-Table
  Type     User                   Flags Mask
    ----- -----                     -----
  Allowed GRAPHITE\user                None   00000003
  Denied   NT AUTHORITY\ANONYMOUS LOGON  None   10000000
  Allowed Everyone                          None   00000001
@ PS> Get-NtSecurityDescriptorSacl $sd | Format-Table
  Type     User                   Flags Mask      Mask
    ----- -----                     -----
  Audit     Everyone                FailedAccess   00010000
  MandatoryLabel Mandatory Label\Low Mandatory Level None       00000001
```

Listing 5-7: Adding ACEs to the new security descriptor

We start by getting the SID of the current user with Get-NTSid 1 . We use this SID to add a new Allowed ACE to the DACL.❸. We also add a Denied ACE for the anonymous user by specifying the Type parameter, followed by another Allowed ACE for the Everyone group. We then modify the SACL to add an audit ACK.❹ and set the mandatory label to the Low integrity level ❸. To finish creating the security descriptor, we set the DacIAutoInherited and SaclProtected control flags ❸.

We can now print details about the security descriptor we've just created. Displaying the security descriptor ❸ shows that the DACL now contains three ACEs and the two SACLs, and the integrity level is low. We also display the control flags ❹ and the lists of ACEs in the DACL ❸ and SACL ❹.

## Ordering the ACEs

Because of how access checking works, there is a canonical ordering to the ACEs in an ACL. For example, all denied ACEs should come before any Allowed ACEs, as otherwise the system might grant access to a resource improperly, based on which ACEs come first. The SRM doesn't enforce this canonical ordering; it trusts that any application has correctly ordered the ACEs before passing them for an access check. ACLs should order their ACEs according to the following rules:

- 1. All Denied-type ACEs must come before Allowed types.

2. The Allowed ACEs must come before Allowed object ACEs.

3. The Denied ACEs must come before Denied object ACEs.

4. All non-inherited ACEs must come before ACEs with the Inherited
flag set.
In Listing 5-7, we added a Denied ACE to the DACL after we added an Allowed ACE, failing the first order rule. We can ensure the DACL is canonicalized by using the Edit-NtSecurity command with the CanonicalizeDacL

158      Chapter 5

---

parameter. We can also test whether a DACL is already canonical by using the Test-NtSecurity@Descriptor PowerShell command with the DacCanonical parameter. Listing 5-8 illustrates the use of both commands.

```bash
PS> Test-NtSecurityDescriptor $sd -DaclCanonical
False
PS> Edit-NtSecurityDescriptor $sd -CanonicalizeDacl
PS> Test-NtSecurityDescriptor $sd -DaclCanonical
True
PS> Get-NtSecurityDescriptorDacl $d | Format-Table
Type    User                Flags Mask
10000000
Denied  NT AUTHORITYANONYMOUS LOGON None  10000000
Allowed GRAPHITEuser           None  00000003
Allowed Everyone          None  00000001
```

Listing 5-8: Canonicalizing the DACL

If you compare the list of ACEs in Listing 5-8 with the list in Listing 5-7, you'll notice that the Denied ACE has been moved from the middle to the start of the ACL. This ensures that it will be processed before any Allowed ACEs.

## Formatting Security Descriptors

You can print the values in the security descriptor manually, through the format-Table command, but this is time-consuming. Another problem with manual formatting is that the access masks won't be decoded, so instead of ReadData, for example, you'll see 00000001. It would be nice to have a simple way of printing out the details of a security descriptor and formatting them based on the object type. That's what format-NetSecurityDescriptor is for. You can pass it a security descriptor, and the command will print it to the console. Listing 5-9 provides an example.

```bash
PS> Format-MtSecurityDescriptor $sd -ShowAll
Type: file
Control: DaclPresent, SaclPresent
<Owner>
  - Name  : Everyone
  - Sid   : S-1-1-0
<Group>
  - Name  : Everyone
  - Sid   : S-1-1-0
<DACL> (Auto Inherited)
  - Type  : Denied
  - Name  : NT AUTHORITY\ANONYMOUS LOGON
  - SID    : S-1-5-7
  - Mask   : 0x10000000
```

---

```bash
- Access: GenericAll
 - Flags : None
 - Type : Allowed
 - Name : GRAPHITE\user
 - SID  : S-1-5-21-2318445812-3516008893-216915059-1002
 - Mask  : 0x00000003
 - Access: ReadData|WriteData
 - Flags : None
 - Type : Allowed
 - Name : Everyone
 - SID  : S-1-1-1-0
 - Mask  : 0x00000001
 - Access: ReadData
 - Flags : None
<SACL> (Protected)
 - Type  : Audit
 - Name : Everyone
 - SID  : S-1-1-1-0
 - Mask  : 0x00010000
 - Access: Delete
 - Flags : FailedAccess
<Mandatory Label>
 - Type  : MandatoryLabel
 - Name : Mandatory labelLow Mandatory Level
 - SID   : S-1-16-4096
 - Mask  : 0x00000001
 - Policy: NoWriteUp
 - Flags : None
```

Listing 5-9: Displaying the security descriptor

We pass the ShowAll parameter to Format-NtSecurityDescriptor to ensure that it displays the entire contents of the security descriptor; by default it won't output the SACL or less common ACEs, such as ResourceAttribute.


Note that the output kernel object type matches the file type we specified when creating the security descriptor in Listing 5-6. Specifying the kernel object type allows the formatter to print the decoded access mask for the type rather than a generic hex value.

The next line in the output shows the current control flags. These are calculated on the fly based on the current state of the security descriptor; later, we'll discuss how to change these control flags to change the security descriptor's behavior. The control flags are followed by the owner and group SIDs and the DACL, which account for most of the output. Any DACL-specific flags appear next to the header; in this case, these indicate that we set the DacLtoInherited flag. Next, the output lists each of the ACEs in the ACL in order, starting with the type of ACE. Because the command knows the object type, it prints the decoded access mask for the type as well as the original access mask in hexadecimal.

---

Next is the SACL, which shows our single audit ACE as well as the Sacl Protected flag. The final component shown is the mandatory label. The access mask for a mandatory label is the mandatory policy, and it's decoded differently from the rest of the ACEs that use the type-specific access rights. The mandatory policy can be set to one or more of the bit flags shown in Table 5-5.

Table 5-5: Mandatory Policy Values

<table><tr><td>Name</td><td>Value</td><td>Description</td></tr><tr><td>NoWriteUp</td><td>0x00000001</td><td>A lower integrity level caller can't write to this resource.</td></tr><tr><td>NoReadUp</td><td>0x00000002</td><td>A lower integrity level caller can't read this resource.</td></tr><tr><td>NoExecuteUp</td><td>0x00000004</td><td>A lower integrity level caller can't execute this resource.</td></tr></table>


By default, format-MTSecurityDescriptor can be a bit verbose. To shorten its output, specify the Summary parameter, which will remove as much data as possible while keeping the important information. Listing 5-10 demonstrates.

```bash
PS> Format-MtSecurityDescriptor $sd -ShowAll -Summary
<Owner> : Everyone
<Group> : Everyone
<DACL>
<DACL> (Auto Inherited)
NT AUTHORITYANONYMOUS LOGON: (Denied)(None)(GenericAll)
GRAPIHTE-user: (Allowed)(None)(ReadData|WriteData)
Everyone: (Allowed)(None)(ReadData)
<SACL> (Protected)
Everyone: (Audit)(FailedAccess)(Delete)
<Mandatory label>
Mandatory labelLow Mandatory Level: (MandatoryLabel)(None)(NoWriteUp)
Listing 5-10: Displaying the security descriptor in summary format
```

I mentioned in Chapter 2 that for ease of use the PowerShell module used in this book uses simple names for most common flags, but that you can display the full SDK names if you prefer (for example, to compare the output with native code). To display SDK names when viewing the contents of a security descriptor with Format=ttlSecurityDescriptor, use the SDKName property, as shown in Listing 5-11.

```bash
PS> Format-NtSecurityDescriptor $d -SDName -SecurityInformation Dacl
Type: File
Control: SE_DACL_PRESENT|SE_SACL_PRESENT|SE_DACL_AUTO_INHERITED|SE_SACL_PROTECTED
<DACL> (Auto Inherited)
  - Type : ACCESS_DENIED_ACE_TYPE
  - Name : NT AUTHORITYANONYMOUS_LOGON
  - SID : 5-1-5-7
  - Mask : 0x10000000
  - Access: GENERIC_ALL
  - Flags : NONE
                          Security Descriptors  161
```

---

```bash
- Type  : ACCESS_ALLOWED_ACE_TYPE
- Name  : GRAPHITE/user
- SID  : S-1-5-21-2318445812-3516008893-216915059-1002
- Mask  : 0x00000003
- Access: FILE_READ_DATA|FILE_WRITE_DATA
- Flags : NONE
- Type  : ACCESS_ALLOWED_ACE_TYPE
- Name  : Everyone
- SID  : S-1-1-0
- Mask  : 0x00000001
- Access: FILE_READ_DATA
- Flags : NONE
```

Listing 5-11: Formatting a security descriptor with SDK names

One quirk of File objects is that their access masks have two naming conventions, one for files and one for directories. You can request that


Format-NtSecurityDescriptor print the directory version of the access mask by using the Container parameter, or more generally, by setting the Container property of the security descriptor object to True. Listing 5-12 shows the impact of setting the Container parameter on the output.

```bash
P5> Format-NtSecurityDescriptor $sd -ShowAll -Summary -Container
  <Owner> : Everyone
  <Group> : Everyone
  <DACL>
  NT AUTHORITY\ANONYMOUS LOGON: (Denied)(None)(GenericAll)
  © GRAPHITE user: (Allowed)(None)(ListDirectory|AddFile)
  Everyone: (Allowed)(None)(ListDirectory)
    --snip--
```

Listing 5-12: Formatting the security descriptor as a container

Note how the following line changes from ReadData!WriteData to List

DirectoryAddFile when we format it as a container. The File type is the only object type with this behavior in Windows. This is important to security, as you could easily misinterpret File access rights if you formatted the security descriptor for a directory as a file, or vice versa.

If a GUI is more your thing, you can start a viewer using the following


Show-NTSecurityDescriptor command:

```bash
PS> Show-NtSecurityDescriptor $sd
```

Running the command should open the dialog shown in Figure 5-8.

---

![Figure](figures/WindowsSecurityInternals_page_193_figure_000.png)

Figure 5-8. A GUI displaying the security descriptor

The dialog summarizes the security descriptor's important data. At the top are the owner and group SIDs resolved into names, as well as the security descriptor's integrity level and mandatory policy. These match the values we specified when creating the security descriptor. In the middle is the list of ACEs in the DACL (left) or SACL (right), depending on which tab you select, with the ACL flags at the top. Each entry in the list includes the type of ACE, the SID, the access mask in generic form, and the ACE flags. At the bottom is the decoded access. The list populates when you select an ACE in the ACL list.

## Converting to and from a Relative Security Descriptor

We can convert a security descriptor object to a byte array in the relative format using the ConvertFromNTSecurityDescriptor command. We can then print its contents to see what the underlying structure really is, as shown in Listing 5-13.

```bash
PS> $bta = ConvertFrom-NtSecurityDescriptor $sd
PS> $bta | Out-HexDump -ShowAll
----------------------
00000000: 00 01 14 4A 98 00 00 00 00 A4 00 00 00 14 00 00 00  - ...............
00000010: 44 00 00 00 02 00 30 00 00 00 00 00 02 80 14 00  - D...............
00000020: 00 00 01 00 01 01 00 00 00 00 00 00 00 00 00 00  - ...............
00000030: 11 00 14 00 01 00 00 01 01 00 00 00 00 00 10  - ...............
00000040: 00 10 00 00 02 00 54 00 03 00 00 00 01 00 14 00  - ...............
Security Descriptors  163
```

---

```bash
00000050: 00 00 00 10 01 00 00 00 00 00 00 05 07 00 00 00 - ......- .............
00000060: 00 00 24 00 00 00 00 01 05 00 00 00 00 05 - ..$..............
00000070: 15 00 00 00 F4 AC 30 8A 8D 09 92 D1 73 DC ED c- ......o......$. ......
00000080: EA 03 00 00 00 00 00 00 00 00 00 01 01 00 00 - ......- .............
00000090: 00 00 00 01 00 00 00 00 00 00 00 00 00 00 00 01 - ......- .............
000000A0: 00 00 00 00 01 01 00 00 00 00 01 00 00 00 00 00 00 - ......- ............
```

Listing 5-13: Converting an absolute security descriptor to relative format and displaying its bytes

We can convert the byte array back to a security descriptor object using New-NTSecurityDescriptor and the byte parameter:

```bash
PS> New-NtSecurityDescriptor -Byte $ba
```

As an exercise, I'll leave it to you to pick apart the hex output to find the various structures of the security descriptor based on the descriptions provided in this chapter. To get you started, Figure 5-9 highlights the major structures.

![Figure](figures/WindowsSecurityInternals_page_194_figure_005.png)

Figure 5-9. An outline of the major structures in the relative security descriptor hex output

You'll need to refer to the layout of the ACL and SID structures to manually decode the rest.

164    Chapter 5

---

## The Security Descriptor Definition Language

In Chapter 2, we discussed the basics of the Security Descriptor Definition Language (SDDL) format for representing SIDs. The SDDL format can represent the entire security descriptor too. As the SDDL version of a security descriptor uses ASCII text, it's somewhat human readable, and unlike the binary data shown in Listing 5-13, it can be easily copied. Because it's common to see SDDL strings used throughout Windows, let's look at how to represent a security descriptor in SDDL and how you can read it.

You can convert a security descriptor to SDDL format by specifying the ToSddd parameter to Format-NTSecurityDescriptor. This is demonstrated in


Listing 5-14, where we pass the security descriptor we built in the previous section. You can also create a security descriptor from an SDDL string using New-NTSecurityDescriptor with the ToSddd parameter.

```bash
PS> $sddl = Format-MtSecurityDescriptor $d -ToSddl -ShowAll
PS> $sddl
0:WDC;HDD:1A(D{GA};C;AN)(A;CCDC;;5~1~5~21~2318445812~31610008893~216915059-
1002)(A;;CC;HDD)$(P(AI;FA;SD;YD)(ML;Nw;;LW)
Listing 5-14: Converting a security descriptor to SDDL
```

The SDDL version of the security descriptor contains four optional components. You can identify the start of each component by looking for the following prefixes:

```bash
0:  Owner SID
G:  Group SID
D:  DACL
S:  SACL
```

In Listing 5-15, we split the output from Listing 5-14 into its components to make it easier to read.

```bash
PS> $dll -split "(?=0:|(?=G:)|(?=D:)|(?=S:)|(?=\()"
O:;W:D:;A1
  (D2;GA;;AN)
  (A2;CC;;;;;;S-1-5-21-2318445812-3516008893-216915059-1002)
  (A2;CC;;;;;;WD)
S:P
(AU;FA;SD;;WD)
(ML;;NW;;Lw)
Listing 5-15: Splitting up the SDDL components
```

Listing 5-15: Splitting up the SDDL components

The first two lines represent the owner and group SIDs in SDDL format. You might notice that these don't look like the SDDL SIDs we're used to seeing, as they don't start with 5-1. That's because these strings are twocharacter aliases that Windows uses for well-known SIDs to reduce the size

---

of an SDDL string. For example, the owner string is 0D, which we could convert back to the full SID using Get-nt51d (Listing 5-16).

```bash
PS> Get-NTSid -Sddl "WD"
        Name     Sid      ----       ---
        Everyone 5-1-1-0
```

Listing 5-16: Converting an alias to a name and SID

As you can see, the @ alias represents the Everyone group. Table 5-6 shows the aliases for a few well-known SIDs. You can find a more comprehensive list of all supported SDDL aliases in Appendix B.

Table 5-6: Well-Known SIDs and Their Aliases

<table><tr><td>SID alias</td><td>Name</td><td>SDLL SID</td></tr><tr><td>AU</td><td>NT AUTHORITY\Authenticated Users</td><td>S-1-5-11</td></tr><tr><td>BA</td><td>BUILTIN\Administrators</td><td>S-1-32-544</td></tr><tr><td>IU</td><td>NT AUTHORITY\INTERACTIVE</td><td>S-1-5-4</td></tr><tr><td>SY</td><td>NT AUTHORITY\SYSTEM</td><td>S-1-5-18</td></tr><tr><td>WD</td><td>Everyone</td><td>S-1-1-0</td></tr></table>


If a SID has no alias, Format-NetSecurity@Descriptor will emit the SID in SDDL format, as shown in Listing 5-15. Even SIDS without aliases can have names defined by LSASS. For example, the SID in Listing 5-15 belongs to the current user, as shown in Listing 5-17.

```bash
PS > Get-NTsId -Sddl "S-1-5-21-2318445812-351600893-216915059-1002" -ToName
GRAFTERUser
```

Listing 5-17. Looking up the name of the SID

Next in Listing 5-15 is the representation of the DACL. After the 0: prefix, the ACL in SDDL format looks as follows:

```bash
ACLFlags(ACE0)(ACE1)...(ACEn)
```

The ACL flags are optional; the DACLs are set to AI and the SACLs are set to P. These values map to security descriptor control flags and can be one or more of the strings in Table 5-7.

Table 5-7: ACL Flag Strings Mapped to Security Descriptor Control Flags

<table><tr><td>ACL flag string</td><td>DACL control flag</td><td>SACL control flag</td></tr><tr><td>P</td><td>DaclProtected</td><td>SaclProtected</td></tr><tr><td>AI</td><td>DaclAutoInherited</td><td>SaclAutoInherited</td></tr><tr><td>AR</td><td>DaclAutoInheritReq</td><td>SaclAutoInheritReq</td></tr></table>


166    Chapter 5

---

I'll describe the uses of these three control flags in Chapter 6. Each ACE is enclosed in parentheses and is made up of multiple strings separated by semicolons, following this general format:

```bash
[Type;Flags;Access;ObjectType;InheritedObjectType;SID{;ExtraData}]
```

The Type is a short string that maps to an ACE type. Table 5-8 shows these mappings. Note that SDDL format does not support certain ACE types, so they're omitted from the table.

Table 5-8: Mappings of Type Strings to ACE Types

<table><tr><td>ACE type string</td><td>ACE type</td></tr><tr><td>A</td><td>Allowed</td></tr><tr><td>D</td><td>Denied</td></tr><tr><td>AU</td><td>Audit</td></tr><tr><td>AL</td><td>Alarm</td></tr><tr><td>OA</td><td>AllowedObject</td></tr><tr><td>OD</td><td>DeniedObject</td></tr><tr><td>OU</td><td>AuditObject</td></tr><tr><td>OL</td><td>AlarmObject</td></tr><tr><td>XA</td><td>AllowedCallback</td></tr><tr><td>XD</td><td>DeniedCallback</td></tr><tr><td>ZA</td><td>AllowedCallbackObject</td></tr><tr><td>XU</td><td>AuditCallback</td></tr><tr><td>ML</td><td>MandatoryLabel</td></tr><tr><td>RA</td><td>ResourceAttribute</td></tr><tr><td>SP</td><td>ScopedPolicyId</td></tr><tr><td>TL</td><td>ProcessTrustLabel</td></tr><tr><td>FL</td><td>AccessFilter</td></tr></table>


The next component is flags, which represents the ACE flags. The audit entry in the SACL from Listing 5-15 shows the flag string FA, which represents FailedAccess. Table 5-9 shows other mappings.

Table 5-9: Mappings of Flag Strings to ACE Flags

<table><tr><td>ACE flag string</td><td>ACE flag</td></tr><tr><td>OI</td><td>ObjectInherit</td></tr><tr><td>CI</td><td>ContainerInherit</td></tr><tr><td>NP</td><td>NoPropagateInherit</td></tr><tr><td>IO</td><td>InheritOnly</td></tr><tr><td>ID</td><td>Inherited</td></tr><tr><td>CR</td><td>Critical</td></tr></table>


(continued)

---

Table 5-9: Mappings of Flag Strings to ACE Flags (continued)

<table><tr><td>ACE flag string</td><td>ACE flag</td></tr><tr><td>SA</td><td>SuccessfulAccess</td></tr><tr><td>FA</td><td>FailedAccess</td></tr><tr><td>TP</td><td>TrustProtected</td></tr></table>


Next is Access, which represents the access mask in the ACE. This can be a number in hexadecimal (0x1234), octal (010604), or decimal (4660) format, or a list of short access strings. If no string is specified, then an empty access mask is used. Table 5-10 shows the access strings.

Table 5-10: Mappings of Access Strings to Access Masks

<table><tr><td>Access string</td><td>Access name</td><td>Access mask</td></tr><tr><td>GR</td><td>Generic Read</td><td>0x80000000</td></tr><tr><td>GW</td><td>Generic Write</td><td>0x40000000</td></tr><tr><td>GX</td><td>Generic Execute</td><td>0x20000000</td></tr><tr><td>GA</td><td>Generic All</td><td>0x10000000</td></tr><tr><td>WD</td><td>Write Owner</td><td>0x00000000</td></tr><tr><td>WD</td><td>Write DAC</td><td>0x00040000</td></tr><tr><td>RC</td><td>Read Control</td><td>0x00020000</td></tr><tr><td>SD</td><td>Delete</td><td>0x00010000</td></tr><tr><td>CR</td><td>Control Access</td><td>0x00000100</td></tr><tr><td>LO</td><td>List Object</td><td>0x00000080</td></tr><tr><td>DT</td><td>Delete Tree</td><td>0x00000040</td></tr><tr><td>WP</td><td>Write Property</td><td>0x00000020</td></tr><tr><td>RP</td><td>Read Property</td><td>0x00000010</td></tr><tr><td>SW</td><td>Self Write</td><td>0x00000008</td></tr><tr><td>LC</td><td>List Children</td><td>0x00000004</td></tr><tr><td>DC</td><td>Delete Child</td><td>0x00000002</td></tr><tr><td>CC</td><td>Create Child</td><td>0x00000001</td></tr></table>


Note that the available access strings do not cover the entire access mask range. This is because SDDL was designed to represent the masks for directory service objects, which don't define access mask values outside of a limited range. This is also why the names of the rights are slightly confusing; for example, @lete @ild does not necessarily map to an arbitrary object type's idea of deleting a child, and you can see in Listing 5-15 that the file type's specific access maps to directory service object access, even though it has nothing to do with Active Directory.

To better support other types, the SDDL format provides access strings for common file and registry key access masks, as shown in Table 5 - 11 . If the

168    Chapter 5

---

available access strings can't represent the entire mask, the only option is to represent it as a number string, typically in hexadecimal format.

Table 5-11: Access Strings for File and Registry Key Types

<table><tr><td>Access string</td><td>Access name</td><td>Access mask</td></tr><tr><td>FA</td><td>File All Access</td><td>0x001F01FF</td></tr><tr><td>FX</td><td>File Execute</td><td>0x001200A0</td></tr><tr><td>FW</td><td>File Write</td><td>0x00120116</td></tr><tr><td>FR</td><td>File Read</td><td>0x00120089</td></tr><tr><td>KA</td><td>Key All Access</td><td>0x000F003F</td></tr><tr><td>KR</td><td>Key Read</td><td>0x00020019</td></tr><tr><td>KX</td><td>Key Execute</td><td>0x00020019</td></tr><tr><td>KW</td><td>Key Write</td><td>0x00020006</td></tr></table>


For the ObjectType and InheritedObjectType components, used with object ACEs, SDDL uses a string format for the GUIDs. The GUIDs can be any value. For example, Table 5-12 contains a few well-known ones used by Active Directory.

Table 5-12: Well-Known ObjectType GUIDs Used in Active Directory

<table><tr><td>GUID</td><td>Directory object</td></tr><tr><td>19195a5a-6da0-11d0-afd3-00c04fd90c9</td><td>Domain</td></tr><tr><td>bf967a86-0de6-11d0-a285-00aa003049e2</td><td>Computer</td></tr><tr><td>bf967aba-0de6-11d0-a285-00aa003049e2</td><td>User</td></tr><tr><td>bf967a9c-0de6-11d0-a285-00aa003049e2</td><td>Group</td></tr></table>


Here is an example ACE string for an AllowedObject ACE with the ObjectType set:

```bash
(OA;;CC;2f097591=34f-4975-990f-00f0906b07e0;WD)
```

After the InheritedObjectType component in the ACE is the SID. As detailed earlier in this chapter, this can be a short alias if it's a well-known SID, or the full SDDL format if not.

In the final component, which is optional for most ACE types, you can specify a conditional expression if using a callback ACE or a security attribute if using a ResourceAttribute ACE. The conditional expression defines a Boolean expression that compares the values of a token's security attribute. When evaluated, the result of the expression should be true or false. We saw a simple example in Listing 5-5: MN://TokenId == "XYZ", which compares the value of the security attribute #MN://TokenId with the string value XYZ and evaluates to true if they're equal. The SDDL expression syntax has

---

four different attribute name formats for the security attribute you want to refer to:

Simple For local security attributes; for example, WSN://TokenId

Device For device claims; for example, @Device_ABC

User For user claims; for example, @User.XYZ

Resource For resource attributes; for example, @Resource.OR5

The comparison values in the conditional expressions can accept several different types, as well. When converting from SDDL to a security descriptor, the condition expression will be parsed, but because the type of the security attribute won't be known at this time, no validation of the value's type can occur. Table 5-13 shows examples for each conditional expression type.

Table 5-13: Example Values for Different Conditional Expression Types

<table><tr><td>Type</td><td>Examples</td></tr><tr><td>Number</td><td>Decimal: 100, -100; octal: 0100; hexadecimal: 0x100</td></tr><tr><td>String</td><td>&quot;ThisIsAString&quot;</td></tr><tr><td>Fully qualified binary name</td><td>&quot;O=MICROSOFT CORPORATION, L=REDMOND, S=WASHINGTON,1004&quot;</td></tr><tr><td>SID</td><td>SID(BA), SID(S-1-0-0)</td></tr><tr><td>Octet string</td><td>#0011223344</td></tr></table>


The syntax then defines operators to evaluate an expression, starting with the unary operators in Table 5 - 44 .

Table 5-14: Unary Operators for Conditional Expressions

<table><tr><td>Operator</td><td>Description</td></tr><tr><td>Exists ATTR</td><td>Checks whether the security attribute ATTR exists</td></tr><tr><td>Not_Exists ATTR</td><td>Inverse of Exists</td></tr><tr><td>Member_of {SIDLIST}</td><td>Checks whether the token groups contain all SIDs in SIDLIST</td></tr><tr><td>Not_Member_of {SIDLIST}</td><td>Inverse of Member_of</td></tr><tr><td>Device_Member_of {SIDLIST}</td><td>Checks whether the token device groups contain all SIDs in SIDLIST</td></tr><tr><td>Not_Device_Member_of {SIDLIST}</td><td>Inverse of Device_Member_of</td></tr><tr><td>Member_of_Any {SIDLIST}</td><td>Checks whether the token groups contain any SIDs in SIDLIST</td></tr><tr><td>Not_Member_of_Any {SIDLIST}</td><td>Inverse of Not_Member_of_Any</td></tr><tr><td>Device_Member_of_Any {SIDLIST}</td><td>Checks whether the token device groups contain any SIDs in SIDLIST</td></tr><tr><td>Not_Device_Member_of_Any {SIDLIST}</td><td>Inverse of Device_Member_of_Any</td></tr><tr><td>I(EXPR)</td><td>The logical NOT of an expression</td></tr></table>


170    Chapter 5

---

In Table 5-14, ATTR is the name of an attribute to test. SIDLIST is a list of SID values enclosed in braces {}, and ERROR is another conditional subexpression. Table 5-15 shows the infix operators the syntax defines.

Table 5-15: Infix Operators for Conditional Expressions

<table><tr><td>Operator</td><td>Description</td></tr><tr><td>ATTR Contains VALUE</td><td>Checks whether the security attribute contains the value</td></tr><tr><td>ATTR Not_Contains VALUE</td><td>Inverse of Contains</td></tr><tr><td>ATTR Any_of {VALUELIST}</td><td>Checks whether the security attribute contains any of the values</td></tr><tr><td>ATTR Not_Any_of {VALUELIST}</td><td>Inverse of Any_of</td></tr><tr><td>ATTR == VALUE</td><td>Checks whether the security attribute equals the value</td></tr><tr><td>ATTR != VALUE</td><td>Checks whether the security attribute does not equal the value</td></tr><tr><td>ATTR &lt; VALUE</td><td>Checks whether the security attribute is less than the value</td></tr><tr><td>ATTR &lt;= VALUE</td><td>Checks whether the security attribute is less than or equal to the value</td></tr><tr><td>ATTR &gt; VALUE</td><td>Checks whether the security attribute is greater than the value</td></tr><tr><td>ATTR &gt;= VALUE</td><td>Checks whether the security attribute is greater than or equal to the value</td></tr><tr><td>EXPR &amp;amp; EXPR</td><td>The logical AND between two expressions</td></tr><tr><td>EXPR | | EXPR</td><td>The logical OR between two expressions</td></tr></table>


In Table 5-15, VALUE can be either a single value from Table 5-13 or a list of values enclosed in braces. The Any_of and Not_Any_of operators work only on lists, and the conditional expression must always be placed in parentheses in the SDDL ACE. For example, if you wanted to use the conditional expression shown back in Listing 5-5 with an AccessCallback ACE, the ACE string would be as follows:

```bash
{ZA;;GA;;MD;(WIN://TokenId == "XYZ"))}
```

The final component represents a security attribute for the Resource Attribute ACE. Its general format is as follows:

```bash
"AttributeName",AttrType,AttrFlags,AttrValue(,AttrValue...)
```

The AttrName value is the name of the security attribute, AttrFlags is a hexacimal number that represents the security attribute flags, and AttrValue is one or more values specific to the AttrType, separated by commas. The AttrType is a short string that indicates the type of data contained in the security attribute. Table 5-16 shows the defined strings, with examples.

---

Table 5-16: Security Attribute SDDL Type Strings

<table><tr><td>Attribute type</td><td>Type name</td><td>Example value</td></tr><tr><td>TI</td><td>Int64</td><td>Decimal: 100, -100; octal: 0100; hexadecimal: 0x100</td></tr><tr><td>TU</td><td>UInt64</td><td>Decimal: 100; octal: 0100; hexadecimal: 0x100</td></tr><tr><td>TS</td><td>String</td><td>&quot;XYZ&quot;</td></tr><tr><td>TD</td><td>SID</td><td>BA, S-1-0-0</td></tr><tr><td>TB</td><td>Boolean</td><td>0, 1</td></tr><tr><td>RX</td><td>OctetString</td><td>#0011223344</td></tr></table>


To give an example, the following SDDL string represents a Resource


Attribute ACE with the name Classification. It contains two string values, TopSecret and MostSecret, and has the CaseSensitive and NonInheritable flags set:

```bash
S:(RA;};%ID;("Classification",TS,0x3,"TopSecret","MostSecret"))
```

The last field in Listing 5-15 to define is the SACL. The structure is the same as that described for the DACL, although the types of ACEs supported differ. If you try to use a type that is not allowed in the specific ACL, parsing the string will fail. In the SACL example in Listing 5-15, the only ACE is the mandatory label. The mandatory label ACE has its own access strings used to represent the mandatory policy, as shown in Table 5-17.

Table 5-17: Mandatory Label Access Strings

<table><tr><td>Access string</td><td>Access name</td><td>Access mask</td></tr><tr><td>NX</td><td>No Execute Up</td><td>0x00000004</td></tr><tr><td>NR</td><td>No Read Up</td><td>0x00000002</td></tr><tr><td>NW</td><td>No Write Up</td><td>0x00000001</td></tr></table>


The SID represents the integrity level of the mandatory label; again, special SID aliases are defined. Anything outside the list shown in


Table 5-18 needs to be represented as a full SID.

Table 5-18: Mandatory Label Integrity Level SIDs

<table><tr><td>SID alias</td><td>Name</td><td>SDDL SID</td></tr><tr><td>LW</td><td>Low integrity level</td><td>S-1-16-4096</td></tr><tr><td>ME</td><td>Medium integrity level</td><td>S-1-16-8192</td></tr><tr><td>MP</td><td>MediumPlus integrity level</td><td>S-1-16-8448</td></tr><tr><td>HI</td><td>High integrity level</td><td>S-1-16-12288</td></tr><tr><td>SI</td><td>System integrity level</td><td>S-1-16-16384</td></tr></table>


172    Chapter 5

---

The SDDL format doesn't preserve all information you can store in a security descriptor. For example, the SDDL format can't represent the


OwnerDefaulted or GroupDefaulted control flag, so these are discarded. SDDL also doesn't support some ACE types, so I omitted those from Table 5-8.

As mentioned previously, if an unsupported ACE type is encountered while converting a security descriptor to SDDL, the conversion process will fail. To get around this problem, the ConvertFrom-NtSecurityDescriptor PowerShell command can convert a security descriptor in relative format to base64, as shown in Listing 5-18. Using base64 preserves the entire security descriptor and allows it to be copied easily.

```bash
PS> ConvertFrom-MtSecurityDescriptor $Id -AsBase64 -InsertLineBreaks
AUqlUj3gAAACCKAFAAAFAAE0AAAACAAADAgAAAGAAFAAAAAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAGAAAG
```

Listing 5-18: Converting a security descriptor to a base64 representation

To retrieve the security descriptor, you can pass New-MtSecurityDescriptor the base64 parameter.

## Worked Examples

Let's finish this chapter with some worked examples that use the commands you've learned about here.

### Manually Parsing a Binary SID

The PowerShell module comes with commands you can use to parse SIDs that are structured in various forms. One of those forms is a raw byte array. You can convert an existing SID to a byte array using the ConvertFromNTSid command:

```bash
PS> $ba = ConvertFrom-NtSid -Sid "S-1-1-0"
```

You can also convert the byte array back to a SID using the Byte parameter to the Get-NetSid command, as shown here. The module will parse the byte array and return the SID:

```bash
//go:build !cpp
DS> Get-NtSid -Byte $ba
```

Although PowerShell can perform these conversions for you, you'll find it valuable to understand how the data is structured at a low level. For example, you might identify code that parses SIDs incorrectly, which could lead to memory corruption; through this discovery, you might find a security vulnerability.

The best way to learn how to parse a binary structure is to write a parser, as we do in Listing 5-19.

Security Descriptors  |   173

---

```bash
© PS> $sid = Get-NtSid -SecurityAuthority Nt -RelativeIdentifier 100, 200, 300
      $sida = ConvertFrom-NtSid -$sid $sid
      $sida | Out-HeDump -ShowAll
                00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F - 0123456789ABCDEFG
  -------------------------------
  00000000: 01 03 00 00 00 00 00 05 64 00 00 00 C8 00 00 00   - ,....,d.........
  00000010: 2C 01 00 00
  PS> $stm = [System.IO.MemoryStream>::new($ba)
  © PS> $reader = [System.IO.BinaryReader>::new($stm)
  PS> $revision = $reader.ReadByte()
  © PS> if ($revision -ne 1) {
    throw "Invalid SID revision"
  }
  © PS> $id_count = $reader.ReadByte()
  © PS> $auth = $reader.ReadBytes(6)
  PS> if ($auth.Length -ne 6) {
    throw "Invalid security authority length"
  }
  PS> $wids = @()
  © PS> while($id_count -gt 0) {
    $rids += $reader.ReadUInt32()
    $rid_count--
  }
  © PS> $new_sid = Get-NtSid -SecurityAuthorityByte $auth -RelativeIdentifier $rids
  PS> $new_sid -eq $sid
    True
```

Listing 5-19: Manually parsing a binary SID

For demonstration purposes, we start by creating an arbitrary SID and converting it to a byte array . Typically, though, you'll receive a SID to parse in some other way, such as from the memory of a process. We also print the SID as hex. (If you refer to the SID structure shown in Figure 5 - 1 , you might already be able to pick out its various components.)

Next, we create a BinaryReader to parse the byte array in a structured form ❹. Using the reader, we first check whether the revision value is set to 1 ❸, if it isn't, we throw an error. Next in the structure is the RID count as a byte ❹, followed by the 6-byte security authority ❹. The ReadBytes method can return a short reader, so you'll want to check that you read all six bytes.

We now enter a loop to read the RIDs from the binary structure and append them to an array . Next, using the security authority and the RIDs, we can run GET-RSID to construct a new SID object and verify that the new SID matches the one we started with.

This listing gives you an example of how to manually parse a SID (or, in fact, any binary structure) using PowerShell. If you're adventurous, you could implement your own parser for the binary security descriptor

174      Chapter 5

---

formats, but that's outside the scope of this book. It's simpler to use the New-rtSecurityDescriptor command to do the parsing for you.

## Enumerating SIDs

The LSASS service does not provide a publicly exposed method for querying every SID-to-name mapping it knows about. While the official Microsoft documentation provides a list of known SIDs, these aren't always up to date and won't include the SIDs specific to a computer or enterprise network. However, we can try to enumerate the mappings using brute force. Listing 5-20 defines a function, Get-AccountSids , to brute-force a list of the SIDs for which LSASS has a name.

```bash
PS> function Get-AccountSids {
      param({
          [parameter(Mandatory)]
      }$BaseSid,
          [int]$MinRid = 0,
          [int]$MaxRid = 256
    )
    $i = -$MinRid
    while($i - 1t -$MaxRid) {
        $id = Get-NtSid -BaseSid -$BaseSid -RelativeIdentifier $i
        $name = Get-MSName $id
      } if ($name.Source -eq "Account") {
          [PSCustomObject]@{
              sid = $id;
              Name = $name.QualifiedName;
              Use = $name.NameUse
        }
        $i++
    }
  }
} PS> $sid = Get-NtSid -SecurityAuthority Nt
PS> Get-AccountSids -BaseSid $sid
    Sid         Name                Use
    -----        -----                --
  S-1-5-1     NT AUTHORITY\DIALUP   WellKnownGroup
  S-1-5-2     NT AUTHORITY\NETWORK  WellKnownGroup
  S-1-5-3     NT AUTHORITY\BATCH   WellKnownGroup
  --snip--
} PS> $sid = Get-NtSid -BaseSid $sid -RelativeIdentifier 32
PS> Get-AccountSids -BaseSid $sid -MinRid 512 -MaxRid 1024
    Sid         Name                Use
    -----        -----                --
  S-1-5-32-544 BUILTIN\Administrators Alias
  S-1-5-32-545 BUILTIN\Users       Alias
```

Security Descriptors 175

---

$-1~$-5~$2~$46 BUILTIN/Guests Alias --snip--

Listing 5-20: Brute-forcing known SIDs

The function accepts a base SID and the range of RID values to test . It then creates each SID in the list and queries for its name. If the name's source is Account, which indicates the name was retrieved from LSASS, we output the SID's details .

To test the function, we call it with the base SID, which contains the bt authority but no RIDs ❸. We get the list of retrieved names and SIDs from LSASS. Notice that the SIDs in the output are not domain SIDs, as you might expect, but WellKnownGroup SIDs. For our purposes, the distinction between WellKnownGroup, Group, and Alias is not important; they're all groups.

Next, we try brute-forcing the BUILTIN domain SID ❶. In this case, we've changed the RID range based on our preexisting knowledge of the valid range, but you're welcome to try any other range you like. Note that you could automate the search by inspecting the Nameuse property in the returned objects and calling get-AccountSids when its value is Domain. I leave this as an exercise for the reader.

## Wrapping Up

We started this chapter by delving into the structure of the security descriptor. We detailed its binary structures, such as SIDs, and looked at access control lists and the access control entries that make up the discretionary and system ACLs. We then discussed the differences between absolute and relative security descriptors and why the two formats exist.

Next, we explored the use of the New-NtSecurityDescriptor and Add-NtSecurityDescriptorAccess commands to create and modify a security descriptor so that it contains whatever entries we require. We also saw how to display security descriptors in a convenient form using the Format-NtSecurity Descriptor command.

Finally, we covered the SDDL format used for representing security descriptors. We discussed how to represent the various types of security descriptor values, such as ACEs, and how you can write your own. Some tasks we haven't yet covered are how to query a security descriptor from a kernel object and how to assign a new one. We'll get to these topics in the next chapter.

## 6    READING AND ASSIGNING SECURITY DESCRIPTORS

![Figure](figures/WindowsSecurityInternals_page_207_figure_002.png)

In the previous chapter, we discussed the various structures that make up a security descriptor. You also learned how to manipu-

late security descriptors in PowerShell and how to represent them using the SDDL format. In this chapter, we'll discuss how to read security descriptors from kernel objects, as well as the more complex process of assigning security descriptors to these objects.

We'll focus our discussion on the security descriptors assigned to kernel objects. However, as mentioned in “Absolute and Relative Security Descriptors” on page 149, it's also possible to store a security descriptor in persistent storage, such as in a file or as a registry key value. In this case, the security descriptor must be stored in the relative format and read as a stream of bytes before we can convert it into a format we can inspect.

---

## Reading Security Descriptors

To access a kernel object's security descriptor, you can call the NtQuerySecurity Object system call. This system call accepts a handle to the kernel object, as well as a set of flags that describe the components of the security descriptor you want to access. The SecurityInformation enumeration represents these flags.

Table 6-1 shows the list of available flags in the latest versions of Windows, as well as the location of the information in the security descriptor and the handle access required to query it.

Table 6-1: The SecurityInformation Flags and Their Required Access

<table><tr><td>Flag name</td><td>Description</td><td>Location</td><td>Handle access required</td></tr><tr><td>Owner</td><td>Query the owner SID.</td><td>Owner</td><td>ReadControl</td></tr><tr><td>Group</td><td>Query the group SID.</td><td>Group</td><td>ReadControl</td></tr><tr><td>DACL</td><td>Query the DACL.</td><td>DACL</td><td>ReadControl</td></tr><tr><td>SACL</td><td>Query the SACL (auditing ACEs only).</td><td>SACL</td><td>AccessSystemSecurity</td></tr><tr><td>Label</td><td>Query the mandatory label.</td><td>SACL</td><td>ReadControl</td></tr><tr><td>Attribute</td><td>Query the system resource attribute.</td><td>SACL</td><td>ReadControl</td></tr><tr><td>Scope</td><td>Query the scoped policy ID.</td><td>SACL</td><td>ReadControl</td></tr><tr><td>ProcessTrustLabel</td><td>Query the process trust label.</td><td>SACL</td><td>ReadControl</td></tr><tr><td>AccessFilter</td><td>Query the access filter.</td><td>SACL</td><td>ReadControl</td></tr><tr><td>Backup</td><td>Query everything except the process trust label and access filter.</td><td>All</td><td>ReadControl and AccessSystemSecurity</td></tr></table>


You only need ReadControl access to read most of this information, except for the auditing ACEs from the SACL, which require AccessSystem Security access. (Readcontrol access is sufficient for other ACEs stored in the SACL.)

The only way to get AccessSystemSecurity access is to first enable the SeSecurityPrivilege privilege, then explicitly request the access when opening a kernel object. Listing 6-1 shows this behavior. You must run these commands as an administrator.

```bash
PS> $dir = Get-NTDirectory "\BaseNamedObjects" -Access AccessSystemSecurity
Get-NTDirectory: (0xCC000061) - A required privilege is not held by
the client.
--snip--
PS> Enable-NtTokenPrivilege SeSecurityPrivilege
PS> $dir = Get-NTDirectory "\BaseNamedObjects" -Access AccessSystemSecurity
PS> $dir.GrantedAccess
AccessSystemSecurity
Listing 6-1: Requesting AccessSystemSecurity access and enabling SeSecurityPrivilege
```

178    Chapter 6

---

Our first attempt to open the BNO directory with AccessSystemSecurity access fails, because we don't have the required SecuritvPrivilege privilege. Next, we enable that privilege and try again. This time we are able to open the directory, and printing its GrantedAccess parameter confirms we've been granted AccessSystemSecurity access.

It's not entirely clear why the designers of Windows made the decision to guard the reading of audit information with SeSecurityPrivilege. While we should consider modifying and removing audit information to be privileged actions, there is no obvious reason that reading that information should be. Unfortunately, we're stuck with this design.

You can query an object's security descriptor using the Get-ntSecurity Descriptor PowerShell command, which calls #QuerySecurityObject. The system call returns the security descriptor in the relative format as a byte array, which the PowerShell command parses into a $ecuri tysetrope object and returns to the caller. The command accepts either an object or a path to the resource you want to query, as shown in Listing 6-2, which displays the security descriptor for the BNO directory.

```bash
PS> Use-NtObject($d = Get-NtDirectory "\BaseNamedObjects" -Access
        ReadControl
        Get-NtSecurityDescriptor -Object $d
    Owner                DACL ACE Count SACL ACE Count Integrity Level
-----------------------------------------------
BUILTIN\\Administrators 4                     1                     Low
```

## Listing 6-2: Querying the security descriptor for the BNO directory

Here, we open the BNO directory with ReadControl access, then use Get-NtSecurityDescriptor to query the security descriptor from the open Directory object.

By default, the Get-NtSecurityObject command queries for the owner, group, DACL, mandatory label, and process trust label. If you want to query any other field (or omit some of the returned information), you need to specify this through the SecurityInformation parameter, which accepts the values in Table 6-1. For example, Listing 6-3 uses a path instead of an object and requests only the Owner field.

```bash
PS> Get-NTSecurityDescriptor -"BaseName0Objects" -SecurityInformation Owner
Owner                     DACL ACE Count SACL ACE Count Integrity Level
----------------------
BUILTIN\Administrators  NONE                NONE                NONE
```

## Listing 6-3: Querying the owner of the BNO directory

In the output, you can see that only the One column contains valid information; all other columns now have the value NONE, which indicates that no value is present, because we haven't requested that information.

---

## Assigning Security Descriptors

Reading a security descriptor is easy; you just need the correct access to a kernel resource and the ability to parse the relative security descriptor format returned from the NtQuerySecurityObject system call. Assigning a security descriptor is a more complex operation. The security descriptor assigned to a resource depends on multiple factors:

- • Is the resource being created?
• Did the creator specify a security descriptor during creation?
• Is the new resource stored in a container, such as a directory or
registry key?

• Is the new resource a container or an object?
• What control flags are set on the parent or current security descriptor?
• What user is assigning the security descriptor?
• What ACEs does the existing security descriptor contain?
• What kernel object type is being assigned?
As you can see from the list, this process involves many variables and is one of the big reasons Windows security can be so complex.

We can assign a resource's security at creation time or via an open handle. Let's start with the more complex case first: assignment at creation time.

### Assigning a Security Descriptor During Resource Creation

When creating a new resource, the kernel needs to assign it a security descriptor. Also, it must store the security descriptor differently depending on the kind of resource being created. For example, object manager resources are ephemeral, so the kernel will store their security descriptors in memory. In contrast, a filesystem driver's security descriptor must be persisted to disk; otherwise, it will disappear when you reboot your computer.

While the mechanism to store the security descriptor might differ, the kernel must still follow many common procedures when handling it, such as enforcing the rules of inheritance. To provide a consistent implementation, the kernel exports a couple of APIs that calculate the security descriptor to assign to a new resource. The most used of these APIs is SeAssignSecurityEx, which takes the following seven parameters:

Creator security descriptor An optional security descriptor on which to base the new assigned security descriptor

Parent security descriptor An optional security descriptor for the new resource's parent object

Object type An optional GUID that represents the type of object being created

Container A Boolean value indicating whether the new resource is a container

---

Auto-inherit A set of bit flags that define the automatic inheritance behavior

Token A handle to the token to use as the creator's identity

Generic mapping A mapping from generic access to specific access rights for the kernel type

Based on these parameters, the API calculates a new security descriptor and returns it to the caller. By investigating how these parameters interact, we can understand how the kernel assigns security descriptors to new objects.

Let's consider this assignment process for a Mutant object. (This object will be deleted once the PowerShell instance closes, ensuring that we don't accidentally leave unnecessary files or registry keys lying around.) Table 6-2 provides an example of how we might set the parameters when creating a new Mutant object with NewCreateMutant.

Table 6-2: Example Parameters for a New Mutant Object

<table><tr><td>Parameter</td><td>Setting value</td></tr><tr><td>Creator security descriptor</td><td>The value of the SecurityDescriptor field in the object attributes structure.</td></tr><tr><td>Parent security descriptor</td><td>The security descriptor of the parent Directory; not set for an unnamed Mutant.</td></tr><tr><td>Object type</td><td>Not set.</td></tr><tr><td>Container</td><td>Set to False, as a Mutant isn&#x27;t a container.</td></tr><tr><td>Auto-inherit</td><td>Set to AutoInheritDACL if the parent security descriptor&#x27;s control flags include the DacAutoInherited flag and the creator DACL is missing or there is no creator security descriptor; set to AutoInheritSACL if the parent security descriptor&#x27;s control flags include the SacAutoInherited flag and the creator SACL is missing or there is no creator security descriptor.</td></tr><tr><td>Token</td><td>If the caller is impersonating, set to an impersonation token; otherwise, set to the primary token of the caller&#x27;s process.</td></tr><tr><td>Generic mapping</td><td>Set to the generic mapping for the Mutant type.</td></tr></table>


You might be wondering why the object type isn't set in Table 6-2. The API supports the parameter, but neither the object manager nor the I/O manager uses it. Its primary purpose is to let Active Directory control inheritance, so we'll discuss it separately in "Determining Object Inheritance" on page 203.

Table 6-2 shows only two possible auto-inherit flags, but we can pass many others to the API. Table 6-3 lists the available auto-inherit flags, some of which we'll encounter in this chapter's examples.

---

Table 6-3: The Auto-inherit Flags

<table><tr><td>Flag name</td><td>Description</td></tr><tr><td>DaclAutoInherit</td><td>Auto-inherit the DACL.</td></tr><tr><td>SaclAutoInherit</td><td>Auto-inherit the SACL.</td></tr><tr><td>DefaultDescriptorForObject</td><td>Use the default security descriptor for the new security descriptor.</td></tr><tr><td>AvoidPrivilegeCheck</td><td>Don&#x27;t check for privileges when setting the mandatory label or SACL.</td></tr><tr><td>AvoidOwnerCheck</td><td>Avoid checking whether the owner is valid for the current token.</td></tr><tr><td>DefaultOwnerFromParent</td><td>Copy the owner SID from the parent security descriptor.</td></tr><tr><td>DefaultGroupFromParent</td><td>Copy the group SID from the parent security descriptor.</td></tr><tr><td>MaclNoWriteUp</td><td>Auto-inherit the mandatory label with the NoWriteUp policy.</td></tr><tr><td>MaclNoReadUp</td><td>Auto-inherit the mandatory label with the NoReadUp policy.</td></tr><tr><td>MaclNoExecuteUp</td><td>Auto-inherit the mandatory label with the NoExecuteUp policy.</td></tr><tr><td>AvoidOwnerRestriction</td><td>Ignore restrictions placed on the new DACL by the parent security descriptor.</td></tr><tr><td>ForceUserMode</td><td>Enforce all checks as if called from user mode (only applicable for kernel callers).</td></tr></table>


The most important SeAssignSecurityX parameters to consider are the values assigned to the parent and creator security descriptors. Let's go through a few configurations of these two security descriptor parameters to understand the different outcomes.

## Setting Only the Creator Security Descriptor

In the first configuration we'll consider, we call NtCreateOutant with the object attribute's SecurityDescriptor field set to a valid security descriptor. If the new NtStart object is not given a name, it will be created without a parent directory, and the corresponding parent security descriptor won't be set. If there is no parent security descriptor, the auto-inherit flags won't be set, either.

Let's test this behavior to see the security descriptor generated when we create a new Mdtat object. Rather than creating the object itself, we'll use the user-mode implementation of SeAssignSecurityEx, which NTDLI exports as RtlNewSecurityObjectEx. We can access RtlNewSecurityObjectEx using the New-MtSecurityDescriptor PowerShell command, as shown in Listing 6-4.

---

```bash
PS> $creator = New-NtSecurityDescriptor -Type Mutant
0 PS> Add-NtSecurityDescriptorAce $creator -Name "Everyone" -Access GenericRead
0 PS> Format-NtSecurityDescriptor $creator
    Type: Mutant
    Control: DaclPresent
    <DACL>
  - Type  : Allowed
  - Name  : Everyone
  - SID   : S-1-1-0
  - Mask  : 0x80000000
  - Access: GenericRead
  - Flags : None
  PS> $token = Get-NtToken -Effective -Pseudo
0 PS> $sd = New-NtSecurityDescriptor -Token $token -Creator $creator
  - Type: Mutant
  PS> Format-NtSecurityDescriptor $sd
    Type: Mutant
    Control: DaclPresent
  <Owner>
     - Name  : GRAPHITE\user
     - Sid   : S-1-5-21-2318445812-3516008893-216915059-1002
  <Group>
     - Name  : GRAPHITE\None
     - Sid   : S-1-5-21-2318445812-3516008893-216915059-513
  <DACL>
     - Type  : Allowed
     - Name  : Everyone
     - SID   : S-1-1-0
     - Mask  : 0x00020001
0  - Access: ModifyState|ReadControl
     - Flags : None
```

Listing 6-4: Creating a new security descriptor from a creator security descriptor

We first build a creator security descriptor with only a single ACE, granting the Everyone group GenericRead access 3 . By formatting the security descriptor 4 , we can confirm that only the DACL is present in the formatted output. Next, using the creator security descriptor, we call the New-Net SecurityDescriptor command 6 , passing the current effective token and specifying the final object type as %nt. This object type determines the generic mapping. Finally, we format the new security descriptor.

You might notice that the security descriptor has changed during the creation process: it has gained Owner C and Group values G, and the specified access mask has changed from GenericRead to ModifyState! ReadControl G.

Let's start by considering where those new owner and group values come from. When we don't specify an Owner or Group value, the creation process copies these from the supplied token's Owner and PrimaryGroup SIDs. We can confirm this by checking the Token object's properties using the Format-htToken PowerShell command, as shown in Listing 6-5.

Reading and Assigning Security Descriptors 183

---

```bash
PS> Format-MtToken $token -Owner -PrimaryGroup
OWNER INFORMATION
---------------
Name        Sid
------------------------------------
GRAPITHTE\user 5-1-5-21-2318445812-3516008893-216915059-1002
PRIMARY GROUP INFORMATION
 ------------------------------------
Name        Sid
------------------------------------
GRAPITHTE\None 5-1-5-21-2318445812-3516008893-216915059-513
```

Listing 6-5: Displaying the Owner and PrimaryGroup SIDs for the current effective token

If you compare the output in Listing 6-5 with the security descriptor values in Listing 6-4, you can see that the owner and group SIDs match.

In Chapter 4, you learned that it's not possible to set an arbitrary owner SID on a token; this value must be either the user's SID or a SID marked with the Owner flag. You might wonder: As the token's SID is being used to set the security descriptor's default owner, can we use this behavior to specify an arbitrary owner SID in the security descriptor? Let's check. In Listing 6-6, we first set the security descriptor to the SYSTEM user's SID, then try to create the security descriptor again.

```bash
PS> Set-NtSecurityDescriptorOwner Creator <KnownSid LocalSystem
PS> New-NtSecurityDescriptor -Token $Token <Creator $Creator -Type Mutant
New-NtSecurityDescriptor : (0x0C00005A) - Indicates a particular Security ID
may not be assigned as the owner of an object.
```

Listing 6-6: Setting the SYSTEM user as the Mutant object's security descriptor owner

This time, the creation fails with an exception and the status code STATUS_INVALID_OWNER. This is because the API checks whether the owner SID being assigned is valid for the supplied token. It doesn't have to be the Token object's owner SID, but it must be either the user's SID or a group SID with the Owner flag set.

You can set an arbitrary owner SID only when the token used to create the security descriptor has the $ReStorePrivilege privilege enabled. Note that this token doesn't necessarily have to belong to the caller of the $AssignSecurityEx API. You can also disable the owner check by specifying the AvoidOwnerCheck auto-inherit flag; however, the kernel will never specify this flag when creating a new object, so it will always enforce the owner check.

This is not to say that there's no way to set a different owner as a normal user. However, any method of setting an arbitrary owner that you discover is a security vulnerability that Microsoft will likely fix. An example of such a bug is CVE-2018-0748, which allowed users to set an arbitrary owner when creating a file. The user had to create the file via a local filesystem share, causing the owner check to be bypassed.

184    Chapter 6

---

There are no restrictions on the value of the group SID, as the group doesn't contribute to the access check. However, restrictions apply to the SACL. If you specify any audit ACEs in the SACL as part of the creator security descriptor, the kernel will require SecSecurityPrivilege.

Remember that when we created the security descriptor, the access mask changed? This is because the security descriptor assignment process maps all generic access rights in the access mask to type-specific access rights using the object type's generic mapping information. In this case, the Mutant type's GenericRead mapping converts the access mask to

ModifyStateReadControl . There is one exception to this rule: if the ACE has the Inheritance() flag set, then generic access rights won't be mapped. You'll understand why the exception exists shortly, when we discuss inheritance.

We can confirm this mapping behavior by using New-MITestSecurityDescriptor to create an unnamed mutant object, as shown in Listing 6-7.

```bash
PS> $creator = New-NtSecurityDescriptor -Type Mutant
PS> Add-NtSecurityDescriptorAce $creator -Name "Everyone" -Access GenericRead
PS> Use-NtObject($m = New-NtMutant -SecurityDescriptor $creator) {
        Format-NtSecurityDescriptor $m
}
Type: Mutant
Control: Dac1Present
<Owner>
- Name : GRAPHITE\user
- Sid   : S-1-5-21-2318445812-3516008893-216915059-1002
<Group>
- Name : GRAPHITE\None
- Sid   : S-1-5-21-2318445812-3516008893-216915059-513
<DACL>
- Type : Allowed
- Name : Everyone
- SID  : S-1-1-0
- Mask  : 0x00020001
- Access: ModifyState|ReadControl
- Flags : None
```

Listing 6-7: Verifying security descriptor assignment rules by creating a Mutant object

As you can see, the output security descriptor is the same as the one created in Listing 6-4.

## Setting Neither the Creator nor the Parent Security Descriptor

Let's explore another simple case. In this scenario, neither the creator nor the parent security descriptor is set. This case corresponds to calling #CreateMutan without a name or a specified SecurityDescriptor field. The script to test it is even simpler than the previous one, as shown in Listing 6-8.

---

```bash
PS> $token = Get-NTToken -Effective -Pseudo
  PS> $tid = New-NTSecurityDescriptor -Token $token -Type Mutant
  PS> Format-NTSecurityDescriptor $sd -HideHeader
  <Owner>
    - Name : GRAPHITE\user
    - Sid : S-1-5-21-2318445812-3516008893-216915059-1002
  <Group>
    - Name : GRAPHITE\None
    - Sid : S-1-5-21-2318445812-3516008893-216915059-513
  <DACL>
    - Type : Allowed
    - Name : GRAPHITE\user
    - SID : S-1-5-21-2318445812-3516008893-216915059-1002
    - Mask : 0x001f0001
    - Access: Full Access
    - Flags : None
    - Type : Allowed
    - Name : NT AUTHORITY\SYSTEM
    - SID : S-1-5-18
    - Mask : 0x001f0001
    - Access: Full Access
    - Flags : None
    - Type : Allowed
    - Name : NT_AUTHORITY\logonSessionId_0_137918
    - SID : S-1-5-5-0-137918
    - Mask : 0x00120001
    - Access: ModifyState|ReadControl|Synchronize
    - Flags : None
```

Listing 6-8: Creating a new security descriptor with no creator or parent security descriptor

This call to New-NtSecurityDescriptor requires only the token and kernel object type ❶. The Owner and Group fields in the final security descriptor are set to default values based on the token's Owner and PrimaryGroup properties ❷.

But where did the DACL come from? We haven't specified either a parent or a creator security descriptor, so it couldn't have come from either of those. Instead, it's based on the Token object's default DACL, an ACL stored in the token that acts as a fallback when there is no other DACL specified. You can display a token's default DACL by passing the token to


Format-NtToken with the DefaultDac1 parameter, as in Listing 6-9.

```bash
PS> Format-MtToken $token -DefaultDacl
DEFAULT DACL
-------
GRAPHITEUser: (Allowed)(None)(GenericAll)
NT AUTHORITY$\SYSTEM: (Allowed)(None)(GenericAll)
NT AUTHORITY$\LogonSessionId_1_37918: (Allowed)(None)(GenericExecute|GenericRead)
```

Listing 6-9: Displaying a token's default DACL

186    Chapter 6

---

Other than its %nt-specific access rights, the DACL in Listing 6-9 matches the one in Listing 6-8. We can conclude that, if we specify neither the parent nor the creator security descriptor during creation, we'll create a new security descriptor based on the token's owner, primary group, and default DACL. However, just to be certain, let's verify this behavior by creating an unnamed %nt with no security descriptor (Listing 6-10).

```bash
PS> Use-NtObject($m = New-NtMutant) {
        Format-NtSecurityDescriptor $m
    }
    Type: Mutant
    Control: None
    <NO SECURITY INFORMATION>
```

Listing 6-10: Creating an unnamed mutant to verify the default security descriptor creation behavior

Wait—the new Mutant object has no security information at all! That's not what we expected.

The issue here is that the kernel allows certain object types to have no security when the object doesn't have a name. You can learn whether an object requires security by querying its SecurityRequired property, as shown in Listing 6-11.

```bash
PS> Get-NType "Mutant" | Select-Object SecurityRequired
SecurityRequired
----------------------
------------- False
```

Listing 6-11: Querying for the Mutant type's SecurityRequired property

As you can see, the %ntat type doesn't require security. So, if we specify neither the creator nor the parent security descriptor when creating an unnamed %ntat object, the kernel won't generate a default security descriptor.

Why would the kernel support the ability to create an object without a security descriptor? Well, if applications won't share that object with each other, the security descriptor would serve no purpose; it would only use up additional kernel memory. Only if you created an object with a name, so that it can be shared, would the kernel require security.

## DUPLICATING UNNAMED OBJECT HANDLES

You can duplicate a handle to an unnamed resource and share it with another process without giving the resource a name. However, this should be done with care. While handle duplication allows you to remove access from a handle if

(continued)

---

this object has no security descriptor, the receiving process can easily reduplicate the handle to retrieve the access that was removed.

Prior to Windows 8, there was no way to assign security to an unnamed object that had SecurityRequired set to False. This has changed, and if you specify a security descriptor during creation, you'll assign it to the resulting object. Windows 8 also introduced a new, undocumented flag to NtDuplicateObject to separately deal with the issue. Specifying the NoRightsUpgrade flag while duplicating a handle tells the kernel to deny any further duplication operations that request additional access rights.

To verify the generation of a default security descriptor, let's now create an object that requires security, such as a Directory object (Listing 6-12).

```bash
PS> Get-NtType Directory | Select-Object SecurityRequired
SecurityRequired-------
                True
PS> Use-NtObject($dir = New-NtDirectory) {
      Format-NtSecurityDescriptor $dir -Summary
}                            GRAPHITEUser: (Allowed)(None)(Full Access)
NT AUTHORITY\SYSTEM:(Allowed)(None)(Full Access)
NT AUTHORITY\LogonSessionId_0_337918: (Allowed)(None)(Query|Traverse|ReadControl)
```

Listing 6-12: Creating an unnamed Directory to verify the default security descriptor

Listing 6-12 shows that the default security descriptor matches our assumptions.

## Setting Only the Parent Security Descriptor

The next case we'll consider is much more complex. Say we call itCreate Mutant with a name but without specifying the SecurityDescriptor field. Because a named Mutant must be created within a Directory object (which, as we've just seen, requires security), the parent security descriptor will be set.

Yet when we specify a parent security descriptor, we also bring something else into play: inheritance , a process by which the new security descriptor copies a part of the parent security descriptor. Inheritance rules determine which parts of the parent get passed to the new security descriptor, and we call a parent security descriptor inheritable if its parts can be inherited.

The purpose of inheritance is to define a hierarchical security configuration for a tree of resources. Without inheritance, we would have to explicitly assign a security descriptor for each new object in the hierarchy, which would become unmanageable rather quickly. It would also make the resource tree impossible to manage, as each application might choose to behave differently.

---

Let's test the inheritance rules that apply when we create new kernel resources. We'll focus on the DACL, but these concepts apply to the SACL, as well. To minimize code duplication, Listing 6-13 defines a few functions that run a test with the parent security descriptor and implement various options.

```bash
PS> function New-ParentSD($AceFlags = 0, $Control = 0) {
    $owner = Get-NtSld -KnownSid BuiltInAdministrators
     @ $parent = New-NtSecurityDescriptor -Type Directory -Owner $owner
     -Group $owner
     @ Add-NtSecurityDescriptorAce $parent -Name "Everyone" -Access GenericAll
        Add-NtSecurityDescriptorAce $parent -Name "Users" -Access GenericAll
    -Flags $AceFlags
     @ Add-NtSecurityDescriptorControl $parent -Control $control
     @ Edit-NtSecurityDescriptor $parent -MapGeneric
        return $parent
}
PS> function Test-NewSD($AceFlags = 0,
                               $Control = 0,
                               $Creator = $null,
                               [switch]$Container) {
  @ $parent = New-ParentSD -AceFlags $AceFlags -Control $Control
    Write-Output "== Parent SD ="
      Format-NtSecurityDescriptor $parent -Summary
   if ($Creator -me $null) {
      Write-Output "
      r" n= - Creator SD ="
      Format-NtSecurityDescriptor $creator -Summary
    }
  @ $auto_inherit_flags = @()
   if (Test-NtSecurityDescriptor $parent -DaclAutoInherited) {
      $auto_inherit_flags += "DaclAutoInherit"
    }
   if (Test-NtSecurityDescriptor $parent -SaclAutoInherited) {
      $auto_inherit_flags += "SaclAutoInherit"
    }
   if ($auto_inherit_flags.Count -eq 0) {
      $auto_inherit_flags += "None"
    }
   }
   $token = Get-NtToken -Effective -Pseudo
     @ $sd = New-NtSecurityDescriptor -Token $token -Parent $parent
     -Creator $creator -Type Mutant -Containers;$Container -AutoInherit
$auto_inherit_flags
    Write-Output "
      r" n= - New SD ="
  @ Format-NtSecurityDescriptor $sd -Summary
}
```

Listing 6-13: Test function definitions for New-ParentSD and Test-NewSD

The New-Parent$ function creates a new security descriptor with the Owner and Group fields set to the Administrators group ❶. This will allow us to

Reading and Assigning Security Descriptors | 189

---

check for inheritance of the Owner or Group field in any new security descriptor we create from this parent. We also set the Type to Directory, as expected for the object manager. Next, we add two Allowed ACEs, one for the Everyone group and one for the Users group, ❹ differentiated by their SIDs. We assign both ACEs GenericAll access and add some extra flags for the Users ACE.

The function then sets some optional security descriptor control flags. Normally, when we assign a security descriptor to a parent the generic access rights get mapped to type-specific access rights. Here, we use


Edit-NtSecurityDescriptor with the MapGeneric parameter to do this mapping for us:

In the Test-NewSD function, we create the parent security descriptor ❸ and calculate any auto-inherit flags ❹. Then we create a new security descriptor, setting the Container property if required, as well as the autoinherit flags we calculated ❹. You can specify a creator security descriptor for this function to use to create the new security descriptor. For now, we'll leave this value as $null, but we'll come back to it in the next section. Finally, we print the parent, the creator (if specified), and the new security descriptors to the console to verify the input and output ❸.

Let's start by testing the default case: running the test-newSD command with no additional parameters. The command will create a parent security descriptor with no control flags set, so there should be no auto-inherit flags present in the call to seAssignSecurityEx (Listing 6-14).

```bash
PS> Test=NewSD
# = Parent SD =-
<DACL>
Everyone: (Allowed)(None)(Full Access)
BUILTIN(User: (Allowed)(None)(Full Access)
-- New SD =--
<Owner> : GRAPHITE\user ❸
<Group> : GRAPHITE\None
<DACL>
GRAPHITE\user: (Allowed)(None)(Full Access) ❸
NT AUTHORITY\SYSTEM: (Allowed)(None)(Full Access)
NT AUTHORITY\LogonSessionId_0_337918: (Allowed)(None)(ModifyState|ReadControl|...)
Listing 6-14: Creating a new security descriptor with a parent security descriptor and no creator security
```

In the output, we can see that the Owner and Group do not derive from the parent security descriptor , instead, they're the defaults we observed earlier in this chapter. This makes sense: the caller, and not the user who created the parent object, should own the new resource.

However, the new DACL doesn't look as we might have expected ❸ . It's set to the default DACL we saw earlier, and it bears no relation to the DACL we built in the parent security descriptor. The reason we didn't get any ACEs from the parent's DACL is that we did not specify the ACEs as inheritable. To do so, we need to set one or both of the ObjectInherit and ContainerInherit ACE flags. The former applies only to non-container

---

objects such as Model objects, while the latter applies to container objects such as Directory objects. The distinction between the two types is important, because they affect how the inherited ACEs propagate to child objects.

The %start object is a non-container, so let's add the ObjectInherit flag to the ACE in the parent security descriptor (Listing 6-15).

```bash
PS> Test-NewSD -AeFlags "ObjectInherit" ®
-- Parent SD --
<Owner> : BUILTIN\Administrators
<Group> : BUILTIN\Administrators
<DAC>
Everyone: (Allowed)(None)(Full Access)
BUILTIN(User): (Allowed)(ObjectInherit)(Full Access)
-- New SD --
<Owner> : GRAPHITE\user ®
<Group> : GRAPHITE\None
<DAC> ®
BUILTIN(User): (Allowed)(None)(ModifyState|Delete|ReadControl|WriteDoc|WriteOwner)
```

Listing 6-15: Adding an ObjectInherit ACE to the parent security descriptor

In this listing, we specify the ObjectInherit ACE flag to the test function ❶ . Observe that the Owner and Group fields have not changed ❷ , but the DACL is no longer the default ❸ . Instead, it contains a single ACE that grants the Users group ModifyState / Delete / ReadControl / WriteDac / WriteOwner access. This is the ACE that we set to be inherited.

However, you might notice a problem: the parent security descriptor's ACE was granted full Access, while the new security descriptor's ACE is not. Why has the access mask changed? In fact, it hasn't; the inheritance process has merely taken the raw plaintext access mask for the parent security descriptor's ACE (the value 0x000F000F) and copied it to the inherited ACE. A Mutilent object's valid access bits are 0x0001F0001. Therefore, the inheritance process uses the closest mapping, 0x000F0001, as shown in Listing 6-16.

```bash
PS> Get-NTAccessMask (0x0000F0001 - band 0x0000F000f) - ToSpecificAccess Mutant
ModifyState Delete, ReadControl, WriteDoc, WriteOwner
```

Listing 6-16: Checking the inherited access mask

This is a pretty serious issue. Notice, for example, that the %tnt type is missing the Synchronize access right, which it needs for a caller to wait on the lock. Without this access, the %tnt object would be useless to an application.

We can solve this access mask problem by specifying a generic access mask in the ACE. This will map to a type-specific access mask when the new security descriptor is created. There is only one complication: we've taken the parent security descriptor from an existing object, so the generic access mask was already mapped when the security descriptor was assigned. We simulated this behavior in our test function with the Edit-NetSecurityDescriptor call.

---

To resolve this issue, the ACE can set the InheritOnly flag. As a result, any generic access will remain untouched during the initial assignment.


The InheritOnly flag marks the ACE for inheritance only, which prevents the generic access from being an issue for access checking. In Listing 6-17, we check this behavior by modifying the call to the test function.

```bash
● PS> Test-NewSD -AceFlags "ObjectInherit, InheritOnly"
    = Parent SD =
     <Owner> : BUILTIN\Administrators
     <Group> : BUILTIN\Administrators
     <DACL>
     Everyone: (Allowed)(None)(Full Access)
● BUILTIN\Users: (Allowed)(ObjectInherit, InheritOnly)(GenericAll)
    - New SD =
     <Owner> : GRAPHITE\user
     <Group> : GRAPHITE\None
     <DACL>
● BUILTIN\Users: (Allowed)(None)(Full Access)
```

Listing 6-17: Adding an InheritOnly ACE

In this listing, we change the ACE flags to ObjectInherit and InheritanceOnly . In the parent security descriptor's output, we can see that the access mask is no longer mapped from GenericAll . As a result, the inherited ACE is now granted full Access, as we require .

Presumably, the ContainsInherit flag works in the same way as Object Inherit, right? Not quite. We test its behavior in Listing 6-18.

```bash
© PS> Test-NewSD -AeFlags "ContainerInherit, InheritOnly" -Container
= - Parent SD = -
  <Owner : BUILTIN\Administrators
  <Group : BUILTIN\Administrators
  <DACL>
  Everyone: (Allowed)(None)(Full Access)
  BUILTIN\Users: (Allowed)(ContainerInherit, InheritOnly)(GenericAll)
  =- New SD =-
  <Owner : GRAPHITE\user
  <Group : GRAPHITE\one
  <DACL>
  © BUILTIN\Users: (Allowed)(None)(Full Access)
  © BUILTIN\Users: (Allowed)(ContainerInherit, InheritOnly)(GenericAll)
```

Listing 6-18: Creating a new security descriptor with the ContainerInherit flag

Here, we add the ContainerInherit and InheritOnly flags to the ACE and then pass the function the Container parameter . Unlike in the ObjectInherit case, we now end up with two ACEs in the DACL. The first ACE 2 grants access to the new resource based on the inheritable ACE. The second is a copy of the inheritable ACE, with GenericAll access.

192    Chapter 6

---

NOTE

You might wonder how we can create a security descriptor for a container type when we ' re using the Mutant type. The answer is that the API doesn 't care about the final type, as it uses only the generic mapping: when creating a real Mutant object, however, the kernel would never specify the Container flag.

The ACE's automatic propagation is useful, as it allows you to build a hierarchy of containers without needing to manually grant them access rights. However, you might sometimes want to disable this automatic propagation by specifying the NoPropagateInherit ACE flag, as shown in Listing 6-19.

```bash
_________________________________________________________________
PS> $ace_flags = "ContainerInherit, InheritOnly, NoPropagateInherit" ~PS> Test-NewSD -AceFlags $ace_flags -Container
~--snlp:--
~= New SD =-
<Owner> : GRAPHITE\user
<Group> : GRAPHITE\None
<DACL>
BUILTIN\Users: (Allowed)(None){Full Access}
```

Listing 6-19: Using NoPropagateInherit to prevent the automatic inheritance of ACEs

When we specify this flag, the ACE that grants access to the resource remains present, but the inheritable ACE disappears. ❶ .

Let's try another ACE flag configuration to see what happens to ObjectInherit ACEs when they're inherited by a container (Listing 6-20).

```bash
PS> Test-NewSD -AceFlags "ObjectInherit" -Container
--snip--
-- New SD --
<Owner> : GRAPHITE\user
<Group> : GRAPHITE\None
<DACL>
BUILTIN(users: (Allowed)(ObjectInherit, InheritOnly)(ModifyState|...)
```

Listing 6-20: Testing the ObjectInherit flag on a container

You might not expect the container to inherit the ACE at all, but in fact, it receives the ACE with the Inheritance flag automatically set . This allows the container to pass the ACE to non-container child objects.

Table 6-4 summarizes the inheritance rules for container and noncontainer objects based on the parent ACE flags. Objects are bolded where no inheritance occurs.

Table 6-4: Parent ACE Flags and Flags Set on the Inherited ACEs

<table><tr><td>Parent ACE flags</td><td>Non-container object</td><td>Container object</td></tr><tr><td>None</td><td>No inheritance</td><td>No inheritance</td></tr><tr><td>ObjectInherit</td><td>None</td><td>InheritOnly ObjectInherit</td></tr><tr><td>ContainerInherit</td><td>No inheritance</td><td>ContainerInherit</td></tr></table>


(continued)

---

Table 6-4: Parent ACE Flags and Flags Set on the Inherited ACEs (continued)

<table><tr><td>Parent ACE flags</td><td>Non-container object</td><td>Container object</td></tr><tr><td>ObjectInheritNoPropagateInherit</td><td>None</td><td>No inheritance</td></tr><tr><td>ContainerInheritNoPropagateInherit</td><td>No inheritance</td><td>None</td></tr><tr><td>ContainerInheritObjectInherit</td><td>None</td><td>ContainerInheritObjectInherit</td></tr><tr><td>ContainerInheritObjectInheritNoPropagateInherit</td><td>None</td><td>None</td></tr></table>


Finally, consider auto-inherit flags. If you return to Table 6-3, you can see that if the DACL has the DacAutoInherited control flag set, the kernel will pass the DacAutoInherit flag to SeAssignSecurityEx, as there is no creator security descriptor. (The SACL has a corresponding SacAutoInherit flag, but we'll focus on the DACL here.) What does the DacAutoInherit flag do? In Listing 6-21, we perform a test to find out.

```bash
PS> $ace_flags = "ObjectInherit, InheritOnly"
  @PS> Test=NewSD -TestFlags $ace_flags -Control "DaclAutoInherited"
  -= Parent SD =-
  <Owner> : BUILTIN\Administrators
  <Group> : BUILTIN\Administrators
@<DACL> (Auto Inherited)
  Everyone: (Allowed)(None)(Full Access)
  BUILTINUsers: (Allowed)(ObjectInherit, InheritOnly)(GenericAll)
  -= New SD =-
  <Owner> : GRAPHITE\user
  <Group> : GRAPHITE\None
  @<DACL> (Auto Inherited)
  BUILTINUsers: (Allowed)(Inherited)(Full Access)
```

Listing 6-21: Setting the DacIAutoInherited control flag in the parent security descriptor

We set the parent security descriptor's control flags to contain the DaclAutoInherited flag ❶ , and we confirm that it's set by looking at the formatted DACL ❷ . We can see that the new security descriptor contains the flag as well ❸ ; also, the inherited ACE has the Inherited flag ❸ .

How do the auto-inherit flags differ from the inheritance flags we discussed earlier? Microsoft conserves both inheritance types for compatibility reasons (as it didn't introduce the Inherited flag until Windows 2000). From the kernel's perspective, the two types of inheritance are not very different other than determining whether the new security has the InclutoInherited flag set and whether any inherited ACE gets the Inherited flag. But from a user-mode perspective, this inheritance model indicates which parts of the DACL were inherited from a parent security descriptor. That's important.

194    Chapter 6

---

information, and various Win32 APIs use it, as we'll discuss in "Win32 Security APIs" on page 208.

## Setting Both the Creator and Parent Security Descriptors

In the final case, we call NewCreateMutant with a name and specify the Security Descriptor field, setting both the creator and parent security descriptor parameters. To witness the resulting behavior, let's define some test code. Listing 6-22 writes a function to generate a creator security descriptor. We'll reuse the Test-NewSO function we wrote earlier to run the test.

```bash
PS> function New-CreatingSD($AfeeFlags = 0, $Control = 0, [switch]$NoDacI) {
     $creator = New-NtSecurityDescriptor -Type Mutant
     $if ($NoDacI) {
         Add-NtSecurityDescriptorAce $creator -Name "Network" -Access GenericAll
         Add-NtSecurityDescriptorAce $creator -Name "Interactive"
-Access GenericAll -Flags $AfeeFlags
    }
        Add-NtSecurityDescriptorControl $creator -Control $control
        Edit-NtSecurityDescriptor $creator -MapGeneric
    return $creator
```

Listing 6-22: The New-CreatorSD test function

This function differs from the New-ParentSD function created in Listing 6-13 in the following ways: we use the %tmt type when creating the security descriptor ❶ , we allow the caller to not specify a DACL ❷ , and we set a different SID for the DACL if it is used ❸ . These changes will allow us to distinguish the parts of a new security descriptor that come from the parent and those that come from the creator.

In some simple cases, the parent security descriptor has no inheritable DACL, and the API follows the same rules it uses when only the creator security descriptor is set. In other words, if the creator specifies the DACL, the new security descriptor will use it. Otherwise, it will use the default DACL.

If the parent security descriptor contains an inheritable DACL, the new security descriptor will inherit it, unless the creator security descriptor also has a DACL. Even an empty or NULL DACL will override the inheritance from the parent. In Listing 6-23, we verify this behavior.

```bash
# PS> $creator = New-CreatorSD -NoDacI
# PS> $test-NewSD -Creator $creator -AceFlags "ObjectInherit, InheritOnly"\
  =- Parent SD =-
    <Owner : BUILTIN\Administrators
    <Group : BUILTIN\Administrators
    <DACL>
  Everyone: (Allowed)(None)(Full Access)
# BUILTIN\Users: (Allowed)(ObjectInherit, InheritOnly)(GenericAll)
  =- Creator SD =-
    <NO_SECURITY_INFORMATION>
```

---

```bash
= New SD =-
  <Owner> : GRAPHITE\user
  <Group> : GRAPHITE\None
  <DACL>
❸ BUILTIN\Users: (Allowed)(None)(Full Access)
```

Listing 6-23: Testing parent DACL inheritance with no creator DACL

We first build a creator security descriptor with no DACL ❶ , then run the test with an inheritable parent security descriptor ❷ . In the output, we confirm the inheritable ACE for the Users group ❸ and that the creator has no DACL set ❹ . When we create the new security descriptor, it receives the inheritable ACE ❹ .

Let's also check what happens when we set a creator DACL (Listing 6-24).

```bash
❶ PS> $creator = New-CreatorSD
❷ PS> Test-NewSD -Creator $creator -AceFlags "ObjectInherit, InheritOnly"
  -= Parent SD -=
  <Owner : BUILTIN\Administrators
  <Group : BUILTIN\Administrators
  <DACL>
  Everyone: (Allowed)(None)(Full Access)
  BUILTIN\Users: (Allowed)(ObjectInherit, InheritOnly)(GenericAll)
  -= Creator SD -=
  <DACL>
  NT AUTHORITY\NETWORK: (Allowed)(None)(Full Access)
  NT AUTHORITY\INTERACTIVE: (Allowed)(None)(Full Access)
  -= New SD -=
  <Owner : GRAPHITE\user
  <Group : GRAPHITE\None
  <DACL>
❸ NT AUTHORITY\NETWORK: (Allowed)(None)(Full Access)
  NT AUTHORITY\INTERACTIVE: (Allowed)(None)(Full Access)
```

Listing 6-24: Testing the overriding of parent DACL inheritance by the creator DACL

Here, we build the creator security descriptor with a DACL ❶ and keep the same inheritable parent security descriptor as in Listing 6-23 ❷. In the output, we see that the ACEs from the creator's DACL have been copied to the new security descriptor ❸.

The previous two tests haven't specified any auto-inherit flags. If we specify the dcaAutoInherited control flag on the parent security descriptor but include no creator DACL, then the inheritance proceeds in the same way as in Listing 6-24, except that it sets the inherited ACE flags.

However, something interesting happens if we specify both a creator DACL and the control flag (Listing 6-25).

---

```bash
❶ PS> $Creator = New-CreatorSD -AceFlags "Inherited"
❷ PS> $Test-NewSD -Creator $creator -AceFlags "ObjectInherit, InheritOnly"
  -Control "DacAutoInherited"
  -= Parent SD -=
  <Owner : BUILTIN\Administrators
  <Group : BUILTIN\Administrators
  <DACL> (Auto Inherited)
  Everyone: (Allowed)(None)(Full Access)
  BUILTIN\Users: (Allowed)(ObjectInherit, InheritOnly)(GenericAll)
  -= Creator SD -=
  <DACL>
  NT AUTHORITY\NETWORK: (Allowed)(None)(Full Access)
  NT AUTHORITY\INTERACTIVE: (Allowed)(Inherited)(Full Access)
  -= New SD -=
  <Owner : GRAPHITE\User
  <Group : GRAPHITE\None
  <DACL> (Auto Inherited)
❸ NT AUTHORITY\NETWORK: (Allowed)(None)(Full Access)
❹ BUILTIN\Users: (Allowed)(Inherited)(Full Access)
```

Listing 6-25: Testing parent DACL inheritance when the creator DACL and the Dac1Auto Inherited control flag are set

In this listing, we build a creator security descriptor and set the INTERACTIVE SID ACE to include the Inherited flag ❶ . Next, we run the test with the DaclAutoInherited control flag on the parent security descriptor ❷ . In the output, notice that there are two ACEs. The first ACE was copied from the creator ❸ , while the second is the inherited ACE from the parent ❹ . Figure 6 - 1 shows this auto-inheritance behavior.

![Figure](figures/WindowsSecurityInternals_page_227_figure_003.png)

Figure 6-1 The auto-inheritance behavior when the parent and creator security descriptors are both set

When DACtlotInherit is set, the new security descriptor's DACL merges the non-inherited ACEs from the creator security descriptor with the inheritable ACEs from the parent. This auto-inheritance behavior allows you to rebuild a child's security descriptor based on its parent without losing any

---

ACEs that the user has explicitly added to the DACL. Additionally, the automatic setting of the Inherited ACE flag lets us differentiate between these explicit and inherited ACEs.

Note that normal operations in the kernel do not set the DacAutoInherit flag, which is enabled only if the parent security descriptor has the DacAuto Inherited control flag set and the DACL isn't present. In our test, we specified a DACL, so the auto-inherit flag was not set. The Win32 APIs use this behavior, as we'll discuss later in this chapter.

If you want to suppress the merging of the explicit ACEs and the parent’s inheritable ACEs, you can set the DacProtected and/or SacProtected security descriptor control flags. If a protected control flag is set, the inheritance rules leave the respective ACL alone, other than setting the AutoInherited control flag for the ACL and clearing any inherited ACE flags. In Listing 6-26, we test this behavior for the DACL.

```bash
❶ PS> $creator = New-CreatorSD -AceFlags "Inherited" -Control "DaclProtected"
❷ PS> $test=NewSD -Creator $creator -AceFlags "ObjectInherit, InheritOnly"
  -Control "DaclAutoInherited"      = Parent SD =
  <Owner> : BUILTIN\Administrators
  <Group> : BUILTIN\Administrators
  <DACL> (Auto Inherited)
  Everyone: (Allowed)(None)(Full Access)
  BUILTIN\Users: (Allowed)(ObjectInherit, InheritOnly)(GenericAll)
  -- Creator SD =
  <DACL> (Protected)
  NT AUTHORITY\NETWORK: (Allowed)(None)(Full Access)
  NT AUTHORITY\INTERACTIVE: (Allowed)(Inherited)(Full Access)
  -- New SD =
  <Owner> : GRAPHITE\User
  <Group> : GRAPHITE\None
  <DACL> (Protected, Auto Inherited)
  NT AUTHORITY\NETWORK: (Allowed)(None)(Full Access)
 ❸ NT AUTHORITY\INTERACTIVE: (Allowed)(None)(Full Access)
```

Listing 6-26: Testing the Dac1Protected control flag

We start by generating a creator security descriptor with the Dacl Protected flag, and setting one of the ACE's flags to Inherited 1 . We then create a new security descriptor with an auto-inherited parent 2 . Without the badProtected flag, the new security descriptor's DACL would have been a merged version of the creator DACL and the inheritable ACEs from the parent. Instead, we see only the creator DACL's ACEs. Also, the Inherited flag on the second ACE has been cleared 3 .

What if we don't know whether the parent security descriptor will have inheritable ACES, and we don't want to end up with the default DACL? This might be important for permanent objects, such as files or keys, as the default DACL contains the ephemeral logon SID, which shouldn't really be

198    Chapter 6

---

persisted to disk. After all, reusing the logon SID could end up granting access to an unrelated user.

In this case, we can't set a DACL in the creator security descriptor; according to inheritance rules, this would overwrite any inherited ACEs.


Instead, we can handle this scenario using the dacDefaulted security descriptor control flag, which indicates that the provided DACL is a default.


Listing 6-27 demonstrates its use.

```bash
PS> $creator = New-CreatorSD -Control "DaclDefaulted"
PS> Test-NewSD -Creator $creator -AceFlags "ObjectInherit, InheritOnly"
= Parent SD -=
<Owner : BUILTIN\Administrators
<Group : BUILTIN\Administrators
<DACL>
Everyone: (Allowed)(None)(Full Access)
BUILTIN\Users: (Allowed)(ObjectInherit, InheritOnly)(GenericAll)
== Creator SD -=
<DACL> (Defaulted)
NT AUTHORITY\NETWORK: (Allowed)(None)(Full Access)
NT AUTHORITY\INTERACTIVE: (Allowed)(None)(Full Access)
-- New SD -=
<Owner : GRAPHITE\user
<Group : GRAPHITE\None
<DACL>
BUILTIN\Users: (Allowed)(None)(Full Access)
PS> Test-NewSD -Creator $creator
-- Parent SD -=
<Owner : BUILTIN\Administrators
<Group : BUILTIN\Administrators
<DACL>
Everyone: (Allowed)(None)(Full Access)
BUILTIN\Users: (Allowed)(None)(Full Access)
-- Creator SD -=
<DACL> (Defaulted)
NT AUTHORITY\NETWORK: (Allowed)(None)(Full Access)
NT AUTHORITY\INTERACTIVE: (Allowed)(None)(Full Access)
-- New SD -=
<Owner : GRAPHITE\user
<Group : GRAPHITE\None
<DACL>
NT AUTHORITY\NETWORK: (Allowed)(None)(Full Access)
NT AUTHORITY\INTERACTIVE: (Allowed)(None)(Full Access)
```

Listing 6-27: Testing the DocIDefaulted flag

If the parent does not contain any inheritable DACL ACEs, the new security descriptor will use the creator's DACL instead of the default. If the

---

parent does contain inheritable ACEs, the inheritance process will overwrite the DACL, following the rules outlined previously.

To implement similar behavior for the SACL, you can use the sacl


Default control flag. However, tokens don't contain a default SACL, so


this flag is somewhat less important.

## Replacing the CREATOR OWNER and CREATOR GROUP SIDs

We've seen that, during inheritance, an inherited ACE retains the same SID as the original. In some scenarios, this isn't desirable. For example, you might have a shared directory that allows any user to create a child directory. What security descriptor could you set on this shared directory so that only the creator of the child directory has access to it?

One solution would be to remove all inheritable ACEs. As a result, the new directory would use the default DACL. This would almost certainly secure the directory to prevent other users from accessing it. However, as mentioned in the previous section, the default DACL is designed for ephemeral resources, such as those in the object manager; persistent security descriptors shouldn't use it.

To accommodate features such as shared directories, the inheritance implementation supports four special creator SIDs. When a security descriptor inherits an ACE with any of these SIDs, the inheritance implementation will replace the creator SID with a specific SID from the creator's token:

CREATOR OWNER (5-1-3-0)  Replaced by the token's owner CREATOR GROUP (5-1-3-1)  Replaced by the token's primary group CREATOR OWNER SERVER (5-1-3-2)  Replaced by the server's owner CREATOR GROUP SERVER (5-1-3-3)  Replaced by the server's primary group

We use the server SIDs only when creating a server security descriptor, which we'll discuss in “Server Security Descriptors and Compound ACEs” on page 213. The conversion from the creator SID to a specific SID is a oneway process: once the SID has been replaced, you can't tell it apart from a SID you set explicitly. However, if a container has inherited the ACE, it will keep the creator SID in the InheritOnly ACE. Listing 6-28 provides an example.

```bash
// PS: $parent = New-NtSecurityDescriptor -Type Directory
// PS: Add-NtSecurityDescriptorAce $parent -KnownSid CreatorOwner
-Flags ContainerInherit, InheritOnly -Access GenericWrite
// PS: Add-NtSecurityDescriptorAce $parent -KnownSid CreatorGroup
-Flags ContainerInherit, InheritOnly -Access GenericRead
// PS: Format-NtSecurityDescriptor $parent -Summary -SecurityInformation Dacl
-DACL
// CREATOR OWNER: (Allowed)(ContainerInherit, InheritOnly)(GenericWrite)
// CREATOR GROUP: (Allowed)(ContainerInherit, InheritOnly)(GenericRead)
```

200    Chapter 6

---

```bash
* PS> $token = Get-MtToken -Effective -Pseudo
 * PS> $sd = New-MtSecurityDescriptor -Token $token -Parent $parent
 * -Type Directory -Container
 * PS> Format-MtSecurityDescriptor $sd -Summary -SecurityInformation Dacl
 * <ACL>
 * GRAPHITE$user: (Allowed)(None)(CreateObject|CreateSubDirectory|ReadControl)
 * CREATOR OWNER: (Allowed)(ContainerInherit, InheritOnly)(GenericWrite)
 * GRAPHITE$None: (Allowed)(None)(Query|Traverse|ReadControl)
 * CREATOR_GROUP: (Allowed)(ContainerInherit, InheritOnly)(GenericRead)
  listing 6-28: Testing creator SIDs during inheritance
```

We first add two ACEs with the CREATOR OWNER and CREATOR GROUPSIDs to a parent security descriptor, giving the ACEs different levels of access to make them easy to distinguish ❶ . We then create a new security descriptor based on the parent, specifying that we'll use it for a container ❷ . In the formatted output, we see that the user's SID has replaced the CREATOR OWNERSID . This SID is based on the owner SID in the token ❸ . We also can see that the CREATOR GROUPSID has been replaced with the group SID from the token ❹ .

As we've created the security descriptor for a container, we also see that there are two InheritOnly ACEs whose creator SID has not been changed.


This behavior allows the creator SID to propagate to any future children.


1

## Assigning Mandatory Labels

The mandatory label ACE contains the integrity level of a resource. But when we create a new security descriptor using a token whose integrity level is greater than or equal to Medium, the new security descriptor won't receive a mandatory label by default. This behavior explains why we haven't seen any mandatory label ACEs in our tests so far.

If the token's integrity level is less than @idum, on the other hand, this label is automatically assigned to the new security descriptor, as shown in Listing 6-29.

```bash
PS> $token = Get-NToken -Duplicate -IntegrityLevel -Low
PS> $sd = New-NTSecurityDescriptor -Token $token -Type -Mutant
PS> Format-NTSecurityDescriptor $sd -SecurityInformationLabel -Summary
{MandatoryLabel}
MandatoryLabelLow MandatoryLevel: (MandatoryLabel)(None)(NoWriteUp)
PS> $token.Close()
Listing 6-29: Assigning the mandatory label of the creator's token
```

In this listing, we duplicate the current token and assign it a low integrity level. When we create a new security descriptor based on the token, we see that it has a mandatory label with the same integrity level.

An application can set a mandatory label ACE explicitly when creating a new resource through the creator security descriptor. However, the integrity level in the mandatory label ACE must be less than or equal to the token's integrity level; otherwise, the creation will fail, as shown in Listing 6-30.

---

```bash
PS $creator = New-NtSecurityDescriptor -Type Mutant
  PS $set-NtSecurityDescriptorIntegrityLevel $creator System
  PS $token = Get-NTToken -Duplicate -IntegrityLevel Medium
  PS $new-NtSecurityDescriptor -Token $token -Creator $creator -Type Mutant
@ New-NtSecurityDescriptor : (0x0C000061) - A required privilege is not held
by the client.
@ PS $sd = New-NtSecurityDescriptor -Token $token -Creator $creator
-Type Mutant -AutoInherit AvoidPrivilegeCheck
  PS $format-NtSecurityDescriptor $sd -SecurityInformation Label -Summary
  <Mandatory label>
@ Mandatory Label:System Mandatory level: (MandatoryLabel)(None)(NoWriteUp)
  PS: $token.Close()
```

Listing 6-30: Assigning a mandatory label based on the creator security descriptor

First, we create a new creator security descriptor and add a mandatory label with the System integrity level to it. We then get the caller's token and set its integrity level to Medium. Because the System integrity level is greater than Medium, if we attempt to use the creator security descriptor to create a new security descriptor, the operation fails with a STATUS_PRIVILEGE_NOT_HELD error.

To set a higher integrity level, the SetLabelPrivilege privilege must be enabled on the creator token, or you must specify the AvoidPrivilegeCheck auto-inherit flag. In this example, we set the auto-inherit flag when creating the new security descriptor ❸. With this addition the creation succeeds, and we can see the mandatory label in the formatted output ❸.

We can make the mandatory label ACE inheritable by setting its

ObjectInherit or ContainerInherit flag. It's also possible to specify its Inherit Only flag, which prevents the integrity level from being used as part of an access check, reserving it for inheritance only.

Keep in mind, though, that integrity-level restrictions apply to inhered mandatory label ACEs too. The inherited ACE must have an integrity level that is less than or equal to the token's; otherwise, the security descriptor assignment will fail. Again, we can bypass this restriction with either the SetLabelPrivilege privilege or the AvoidPrivilegeCheck auto-inherit flag. Listing 6-31 shows an example in which a security descriptor inherits the mandatory label ACE.

```bash
PS> $parent = New-NtSecurityDescriptor -Type Mutant
  PS> Set-NtSecurityDescriptorIntegerLevel $parent Low -Flags ObjectInherit
  PS> $token = Get-Token -Effective -Pseudo
  PS> $sd = New-NtSecurityDescriptor -Token $token -Parent $parent -Type Mutant
  PS> Format-NtSecurityDescriptor $sd -SecurityInformation Label -Summary
    <Mandatory Label>
  PS> Mandatory Label;Low Mandatory Level: (MandatoryLabel)(Inherited)(NoWriteUp)
```

Listing 6-31: Assigning a mandatory label from a parent security descriptor through inheritance

202    Chapter 6

---

First, we create a parent security descriptor and assign it a mandatory label ACE with a low integrity level and the ObjectInherit flag set 0. We then create a new security descriptor using the parent. The new security descriptor inherits the mandatory label, as indicated by the Inherited flag 2.

Certain kernel object types might receive the mandatory label automatically, even if the caller's token has an integrity level greater than or equal to Medium . By specifying certain auto-inherit flags, you can always assign the caller's integrity level when creating a new security descriptor for the resource. These flags include MaxNoWriteUp, MaxNoReadUp, and MaxNoExecuteUp, which auto-inherit the token's integrity level and set the mandatory policy to NoWriteUp, NoReadUp, and NoExecuteUp, respectively. By combining these flags, you can get the desired mandatory policy.

In the latest versions of Windows, only four types are registered to use these auto-inherit flags, as shown in Table 6-5.

Table 6-5: Types with Integrity Level Auto-inherit Flags Enabled

<table><tr><td>Type name</td><td>Auto-inherit flags</td></tr><tr><td>Process</td><td>Mac1NoWriteUp, Mac1NoReadUp</td></tr><tr><td>Thread</td><td>Mac1NoWriteUp, Mac1NoReadUp</td></tr><tr><td>Job</td><td>Mac1NoWriteUp</td></tr><tr><td>Token</td><td>Mac1NoWriteUp</td></tr></table>


We can test the behavior of these auto-inherit flags by specifying them when we create a security descriptor. In Listing 6-32, we specify the MacNoReadUp and MacNoWriteUp auto-inherit flags.

```bash
PS> $token = Get-NToken -Effective -Pseudo
PS> $sd = New-NTSecurityDescriptor -Token $token -Type Mutant -
AutoInherit MacNoReadUp, MacNoWriteUp
PS> Format-NTSecurityDescriptor $sd -SecurityInformation label -Summary
{Mandatory Label}
Mandatory LabelMedium Mandatory Level:: (MandatoryLabel)(None)(NoWriteUp|
NoReadUp)
```

Listing 6-32: Assigning a mandatory label by specifying auto-inherit flags

In the output, we can see a mandatory label ACE with a Medium integrity level, even though I mentioned at the start of this section that the Medium level wouldn't normally be assigned. We can also see that the mandatory policy has been set to NoWrapUp|NoReadUp, which matches the auto-inherit flags we specified.

## Determining Object Inheritance

When we specify an object ACE type, such as AllowedObject, in a parent security descriptor, the inheritance rules change slightly. This is because each object ACE can contain two optional GUIDs: ObjectType, used for access checking, and InheritedObjectT ype, used for inheritance.

Reading and Assigning Security Descriptors | 203

---

The SeAssignSecurityEx API uses the InheritedObjectType GUID in an ACE to calculate whether a new security descriptor should inherit that ACE. If this GUID exists and its value matches the ObjectType GUID, the new security descriptor will inherit the ACE. By contrast, if the values don't match, the ACE won't be copied. Table 6-6 shows the possible combinations of the ObjectType parameter and InheritedObjectType and whether the ACE is inherited.

Table 6-6: Whether to Inherit the ACE Based on InheritedObjectType

<table><tr><td>ObjectType parameter specified?</td><td>InheritedObjectType in ACE?</td><td>Inherited</td></tr><tr><td>No</td><td>No</td><td>Yes</td></tr><tr><td>No</td><td>Yes</td><td>No</td></tr><tr><td>Yes</td><td>No</td><td>Yes</td></tr><tr><td>Yes</td><td>Yes (and the values match)</td><td>Yes</td></tr><tr><td>Yes</td><td>Yes (and the values don’t match)</td><td>No</td></tr></table>


I've bolded the cases in Table 6-6 where inheritance doesn't happen. Note that this doesn't supersede any other inheritance decision: the ACE must have the ObjectInherit and/or ContainerInherit flag set to be considered for inheritance.

In Listing 6-35, we verify this behavior by adding some object ACEs to a security descriptor and using it as the parent.

```bash
PS> $owner = Get-NtSid -KnownSid BuiltInAdministrators
  PS> $parent = New-NtSecurityDescriptor -Type Directory -Owner $owner
  -Group $owner
  -PS> $type_1 = New-Guid
  PS> $type_2 = New-Guid
  PS> Add-NtSecurityDescriptorAce $parent -Name "SYSTEM" -Access GenericAll
  -Flags ObjectInherit -Type AllowedObject -ObjectType $type_1
  PS> Add-NtSecurityDescriptorAce $parent -Name "Everyone" -Access GenericAll
  -Flags ObjectInherit -Type AllowedObject -InheritedObjectType $type_1
  PS> Add-NtSecurityDescriptorAce $parent -Name "Users" -Access GenericAll
  -Flags ObjectInherit -InheritedObjectType $type_2 -Type AllowedObject
  PS> Format-NtSecurityDescriptor $parent -Summary -SecurityInformation Dacl
  <DACL>
  NT AUTHORITY'SYSTEM: (AllowedObject)(ObjectInherit)(GenericAll)
  (OBJ::f5ee1953...)
  Everywhere: (AllowedObject)(ObjectInherit)(GenericAll)(IOB::f5ee1953...)
  BUILTIN'Users: (AllowedObject)(ObjectInherit)(GenericAll)(IOB::obged996...)
  PS> $token = Get-NtToken -Effective -Pseudo
  PS> $sd = New-NtSecurityDescriptor -Token $token -Parent $parent
  -Type Directory -ObjectType $type_2
  PS> Format-NtSecurityDescriptor $sd -Summary -SecurityInformation Dacl
  <DACL>
  @ NT AUTHORITY'SYSTEM: (AllowedObject)(None)(Full Access)(OBJ::f5ee1953...)
  @ BUILTIN'Users: (Allowed)(None)(Full Access)
  Listing 6-33: Verifying the behavior of the InheritedObjectType GUID
```

---

We first generate a couple of random GUIDs to act as our object types 1 . Next, we add three inheritable A1owObjectACEs to the parent security descriptor. In the first ACE, we set ObjectType to the first GUID we created . This ACE demonstrates that the Object type GUID is not considered when inheriting the ACE. The second ACE sets the InheritedObjectType to the first GUID . The final ACE uses the second GUID .

We then create a new security descriptor, passing the second GUID to the ObjectType parameter . When we check the new security descriptor, we can see that it inherited the ACE without the InheritedObjectType . The second ACE in the output is a copy of the ACE with an InheritedObjectType GUID that matches . Notice that, based on the output, the InheritedObjectType has been removed, as the ACE is no longer inheritable.

Having a single ObjectType GUID parameter is somewhat inflexible, so Windows also provides two APIs that take a list of GUIDs rather than a single GUID: the SeAssignSecurityKey2 kernel API and the RtlNewSecurity ObjectWithMultipleInheritance user-mode API. Any ACE in the list with the InheritedObjectType will be inherited; otherwise, the inheritance rules are basically the same as those covered here.

This concludes our discussion on assigning security descriptors during creation. As you've seen, the assignment process is complex, especially with regard to inheritance. We'll now discuss assigning a security descriptor to an existing resource, a considerably simpler process.

## Assigning a Security Descriptor to an Existing Resource

If a resource already exists, it's not possible to set the security descriptor by calling a creation system call such as #Create@uart and specifying the SecurityDescriptor field in the object attributes. Instead, you need to open a handle to the resource with one of three access rights, depending on what part of the security descriptor you want to modify. Once you have this handle, you can call the #SetSecurityObject system call to set specific security descriptor information. Table 6-7 shows the access rights needed to set each security descriptor field based on the SecurityInformation enumeration.

Table 6-7: SecurityInformation Flags and Required Access for Security Descriptor Creation

<table><tr><td>Flag name</td><td>Description</td><td>Location</td><td>Handle access required</td></tr><tr><td>Owner</td><td>Set the owner SID.</td><td>Owner</td><td>WriteOwner</td></tr><tr><td>Group</td><td>Set the group SID.</td><td>Group</td><td>WriteOwner</td></tr><tr><td>DACL</td><td>Set the DACL.</td><td>DACL</td><td>WriteDac</td></tr><tr><td>SACL</td><td>Set the SACL (for auditing ACEs only).</td><td>SACL</td><td>AccessSystemSecurity</td></tr><tr><td>Label</td><td>Set the mandatory label.</td><td>SACL</td><td>WriteOwner</td></tr><tr><td>Attribute</td><td>Set a system resource attribute.</td><td>SACL</td><td>WriteDac</td></tr></table>


(continued)

Reading and Assigning Security Descriptors | 205

---

Table 6-7: SecurityInformation Flags and Required Access for Security Descriptor Creation [continued]

<table><tr><td>Flag name</td><td>Description</td><td>Location</td><td>Handle access required</td></tr><tr><td>Scope</td><td>Set a scoped policy ID.</td><td>SACL</td><td>AccessSystemSecurity</td></tr><tr><td>ProcessTrustLabel</td><td>Set the process trust label.</td><td>SACL</td><td>WriteDac</td></tr><tr><td>AccessFilter</td><td>Set an access filter.</td><td>SACL</td><td>WriteDac</td></tr><tr><td>Backup</td><td>Set everything except the process trust label and access filter.</td><td>All</td><td>WriteDac, WriteOwner, and AccessSystemSecurity</td></tr></table>


You might notice that the handle access required for setting this information is more complex than the access needed to merely query it (covered in Table 6-1), as it is split across three access rights instead of two. Rather than trying to memorize these access rights, you can retrieve them using the Get-NtAccessMask PowerShell command, specifying the parts of the security descriptor you want to set with the SecurityInformation parameter, as shown in Listing 6-34.

```bash
PS> Get-NtAccessMask -SecurityInformation AllBasic -ToGenericAccess
ReadControl
PS> Get-NtAccessMask -SecurityInformation AllBasic -ToGenericAccess
-SetSecurity
WriteBac, WriteOwner
```

Listing 6-34: Discovering the access mask needed to query or set specific security descriptor information

To set a security descriptor, the %SetSecurityObject system call invokes a type-specific security function. This type-specific function allows the kernel to support the different storage requirements for security descriptors; for example, a file must persist its security descriptor to disk, while the object manager can store a security descriptor in memory.

These type-specific functions eventually call the SetSecurityDescriptor InfoEx kernel API to build the updated security descriptor. User mode exports this kernel API as R1SetSecurityObjectEx. Once the security descriptor has been updated, the type-specific function can store it using its preferred mechanism.

The SetSecurityDescriptorInfoEx API accepts the following five parameters and returns a new security descriptor:

Modification security descriptor The new security descriptor passed to NtSetSecurityObject

Object security descriptor The current security descriptor for the object being updated

Security information Flags to specify what parts of the security descriptor to update, described in Table 6-7

Auto-inherit A set of bit flags that define the auto-inheritance behavior

Generic mapping The generic mapping for the type being created

---

No kernel code uses the auto-inherit flags; therefore, the behavior of this API is simple. It merely copies the parts of the security descriptor specified in the security information parameter to the new security descriptor. It also maps any generic access to the type-specific access using the generic mapping, excluding InheritanceOnly ACEs.

Some security descriptor control flags introduce special behavior. For example, it's not possible to explicitly set DacAutoInherited, but you can specify it along with DacAutoInheritReq to set it on the new security descriptor.

We can test out the RT1SetSecurityObjectX API using the Edit-MtSecurity Descriptor command, as shown in Listing 6-35.

```bash
PS> $owner = Get-NTSid -KnownSidBuildin Administrators
PS> $obj_sd = New-NTSecurityDescriptor -Type Mutant -Owner $owner
-Group $owner
PS> Add-NTSecurityDescriptorAce $obj_sd -KnownSid World -Access GenericAll
PS> Format-NTSecurityDescriptor $obj_sd -Summary -SecurityInformation Dacl
<DACL>
Everyone: (Allowed)(None)(Full Access)
PS> Edit-NTSecurityDescriptor $obj_sd -MapGeneric
PS> $mod_sd = New-NTSecurityDescriptor -Type Mutant
PS> Add-NTSecurityDescriptorAce $mod_sd -KnownSid Anonymous
-Access GenericRead
PS> Set-NTSecurityDescriptorControl $mod_sd DaclAutoInherited,
DaclAutoInheritedReq
PS> Edit-NTSecurityDescriptor $obj_sd $mod_sd -SecurityInformation Dacl
PS> Format-NTSecurityDescriptor $obj_sd -Summary -SecurityInformation Dacl
<DACL> (Auto Inherited)
NT AUTHORITY,ANONYMOUS LOGON: (Allowed)(None)(ModifyState|ReadControl)
```

Listing 6-35: Using Edit-NTSecurityDescriptor to modify an existing security descriptor

You can set the security for a kernel object using the Set-NTSecurity descriptor command. The command can accept either an object handle with the required access or an OMNS path to the resource. For example, you could use the following commands to try to modify the object BaseNamedObjectsABC by setting a new DACL:

```bash
PS> $new_sd = New-MSecurityDescriptor -Sddl "D:(A;;GAA;W)$"
PS> Set-NSecurityDescriptor -Path "$BaseNamedObjects\ABC"
-SecurityDescriptor $new_sd -SecurityInformation Dael
```

Note the "try to," even if you can open a resource with the required access to set a security descriptor component, such as #time@mer access, this doesn't mean the kernel will let you do it. The same rules regarding owner SIDs and mandatory labels apply here as when assigning a security descriptor at creation time.

The SetSecurityDescriptorInfoEx API enforces these rules. If no object security descriptor is specified, then the API returns the STATUS_NO_SECURITY _ON_OBJECT status code. Therefore, you can't set the security descriptor for a type with SecurityRequired set to False; that object won't have a security descriptor, so any attempt to modify it causes the error.

Reading and Assigning Security Descriptors 207

---

NOTE One ACE flag I haven't mentioned yet is Critical. The Windows kernel contains code to check the Critical flag and block the removal of ACEs that have the flag set. However, which ACEs to deem Critical is up to the code assigning the new security description, and APIs such as SetSetSecurityInformationEx do not enforce it. Therefore, do not rely on the Critical flag to do anything specific. If you're using security descriptors in user mode, you can handle the flag any way you like.

What happens if you change the inheritable ACEs on a container? Will the changes in the security descriptor propagate to all existing children? In a word, no. Technically, a type could implement this automatic propagation behavior, but none do. Instead, it's up to the user-mode components to handle it. Next, we'll look at the user-mode Win32 APIs that implement this propagation.

## Win32 Security APIs

Most applications don't directly call the kernel system calls to read or set security descriptors. Instead, they use a range of Win32 APIs. While we won't discuss every API you could use here, we'll cover some of the additional functionality the APIs add to the underlying system calls.

Win32 implements the GetKernelObjectSecurity and SetKernelObject Security APIs, which wrap MTquerySecurityObject and MTsetSecurityObject. Likewise, the CreatePrivateObjectSecurityEx and SetPrivateObjectSecurityEx Win32 APIs wrap RtlNewSecurityObjectEx and RtlSetSecurityObjectEx, respectively. Every property of the native APIs discussed in this chapter applies equally to these Win32 APIs.

However, Win32 also provides some higher-level APIs; most notably, GetNamedSecurityInfo and SetNamedSecurityInfo. These APIs allow an application to query or set a security descriptor by providing a path and the type of resource that path refers to, rather than a handle. The use of a path and type allows the functions to be more general; for example, these APIs support getting and setting the security of not only files and registry keys but also services, printers, and Active Directory Domain Services (DS) entries.

To query or set the security descriptor, the API must open the specified resource and then call the appropriate API to perform the operation. For example, to query a file's security descriptor, the API would open the file using the CreateFile Win32 API and then call the %querySecurityObject system call. However, to query a printer's security descriptor, the Win32 API needs to open the printer using the OpenPrinter print spooler API and then call the GetPrinter API on the opened printer handle (as a printer is not a kernel object).

PowerShell already uses the GetNamedSecurityInfo API through the Get-ACL command; however, the built-in command doesn't support reading certain security descriptor ACEs, such as mandatory labels. Therefore, the NTObjectManager module implements Get-Win32SecurityDescriptor, which calls GetNamedSecurityInfo and returns a SecurityDescriptor object.

---

If you merely want to display the security descriptor, you can use the Format-Win32SecurityDescriptor command, which takes the same parameters but doesn't return a SecurityDescriptor object. Listing 6-36 provides a couple of examples of commands that leverage the underlying Win32 security APIs.

```bash
PS> Get-Win32SecurityDescriptor "$env:WinDir"
------------------------------------
Owner                     DACL ACE Count SACL ACE Count Integrity Level
----- -------------------------------
NT SERVICE\TrustedInstaller 13                NONE             NONE
PS> Format-Win32SecurityDescriptor "MACHINE\SOFTWARE" -Type RegistryKey
-Summary
<Owner> : NT AUTHORITY\SYSTEM
<Group> : NT AUTHORITY\SYSTEM
<DACL> (Protected, Auto Inherited)
BUILTIN\Users: (Allowed)(ContainerInherit)(QueryValue|...)
--snip--
```

Listing 6-36: An example usage of Get-Win32SecurityDescriptor and Format-Win32 SecurityDescriptor

We start by using Get-Wmi32SecurityDescriptor to query the security descriptor for the Windows directory, in this case \win32\dir. Note that we don't specify the type of resource we want to query, as it defaults to a file. In the second example, we use Format-All32SecurityDescriptor to display the security descriptor for the MACHINE\SOFTWARE key. This key path corresponds to the Win32 HKEY_LOCAL_MACHINERYSOFTWARE key path. We need to indicate that we're querying a registry key by specifying the Type parameter; otherwise, the command will try to open the path as a file, which is unlikely to work.

## NOTE

To find the path format for every supported type of object, consult the API documentation for the SE_OBJECT_TYPE enumeration, which is used to specify the type of resource in the GetNamedSecurityInfo and SetNamedSecurityInfo APIs.

The SetNamedSecurityInfo API is more complex, as it implements autoinheritance across hierarchies (for example, across a file directory tree). As we discussed earlier, if you use the #tSetSecurityObject system call to set a file's security descriptor, any new inheritable ACEs won't get propagated to any existing children. If you set a security descriptor on a file directory with SetNamedSecurityInfo, the API will enumerate all child files and directories and attempt to update each child's security descriptor.

The SetNamedSecurityInfo API generates the new security descriptor by querying the child security descriptor and using it as the creator security descriptor in a call to RtlNewSecurityObjectEx, taking the parent security descriptor from the parent directory. The DacAutoInherit and Sacluto Inherit flags are always set, to merge any explicit ACEs in the creator security descriptor into the new security descriptor.

PowerShell exposes the SetNamedSecurityInfo API through the Set- Win32 SecurityDescriptor command, as shown in Listing 6-37.

Reading and Assigning Security Descriptors 209

---

```bash
PS> $path = Join-Path "$env:ITEM" "TestFolder"
  PS> Use-NtObject($f = New-NtFile $path -Win32Path -Options DirectoryFile
    -Disposition OpenIf {
        Set-NtSecurityDescriptor $f "D:AIARP(A;OICI;GA;::WB)" Dacl
    }
  PS> $item = Join-Path $path test.txt
  PS> "Hello World!" | Set-Content -Path $item
  PS> Format-Win32SecurityDescriptor $item -Summary -SecurityInformation Dacl
  <DACL> (Auto Inherited)
❸ Everyone: (Allowed)(Inherited)(Full Access)
  PS> $sd = Get-Win32SecurityDescriptor $path
  PS> Add-NtSecurityDescriptorAe $sd -KnownSid Anonymous -Access GenericAll
  -Flags ObjectInherit,ContainerInherit,InheritOnly
  PS> Set-Win32SecurityDescriptor $path $sd Dacl
  PS> Format-Win32SecurityDescriptor $item -Summary -SecurityInformation Dacl
  <DACL> (Auto Inherited)
  Everyone: (Allowed)(Inherited)(Full Access)
  NT AUTHORITY("ANONYMOUS_LOGON": (Allowed)(Inherited)(Full Access)
```

Listing 6-37: Testing auto-inheritance with Set-Win32SecurityDescriptor

Listing 6-37 demonstrates the auto-inheritance behavior of SetNamed SecurityInfo for files. We first create the TestFolder directory in the root of the system drive, then set the security descriptor so that it contains one inheritable ACE for the Everyone group and has the DacIAutoInherited and DacIProtected flags set . Next, we create a text file inside the directory and print its security descriptor. The DACL contains the single ACE inherited from the parent by the text file .

We then get the security descriptor from the directory and add a new inheritable ACE to it for the anonymous user. We use this security descriptor to set the DACL of the parent using Set-Win32Security@Descriptor ❸. Printing the text file's security descriptor again, we now see that it has two ACEs, as the anonymous user ACE has been added ❸. If we had used Set-Win32Security@Descriptor to set the parent directory's security descriptor, this inheritance would not have taken place.

Because SetNamedSecurityInfo always uses auto-inheritance, applying a protected security descriptor control flag, such as Dac1Protected or Sac1Protected, becomes an important way to block the automatic propagation of ACEs.

Oddly, the API doesn't allow you to specify theaclProtected and SaclProtected control flags directly in the security descriptor. Instead, it introduces some additional SecurityInformation flags to handle setting and unsetting the control flags. To set a protected security descriptor control flag, you can use the ProtectedAcl and ProtectedSacI flags for SecurityInformation. To unset a flag, use UnprotectedAcl and UnprotectedSacI. Listing 6-38 provides examples of setting and unsetting the protected control flag for the DACL.

210    Chapter 6

---

```bash
PS> $path = Join-Path "$env:TEMP\TestFolder" .test.txt"
PS> $sd = New-NTSecurityDescriptor "$d:GAI;AU"
PS> Set-Win32SecurityDescriptor $path $sd Dacl,ProtectedDacl
PS> Format-Win32SecurityDescriptor $path -Summary -SecurityInformation Dacl
<DACL> (Protected, Auto Inherited)
NT AUTHORITY,Authenticated Users: (Allowed)(None)(Full Access)
PS> Set-Win32SecurityDescriptor $path $sd Dacl,UnprotectedDacl
PS> Format-Win32SecurityDescriptor $path -Summary -SecurityInformation Dacl
<DACL> (Auto Inherited)
NT AUTHORITY,Authenticated Users: (Allowed)(None)(Full Access)
Everyone: (Allowed)(Inherited)(Full Access)
NT AUTHORITY,ANONYMOUS LOGON: (Allowed)(Inherited)(Full Access)
```

Listing 6-38: Testing the ProtectedDacl and UnprotectedDacl SecurityInformation flags

This script assumes you've run Listing 6-37 already, as it reuses the file created there. We create a new security descriptor with a single ACE for the Authenticated Users group and assign it to the file with the Protectedbacl and bacl flags ❶ . As a result, the protected control flag for the DACL is now set on the file ❷ . Note that the inherited ACEs from Listing 6-37 have been removed; only the new, explicit ACE is left.

We then assign the security descriptor again with the unprotectedBac flag ❸. This time, when we print the security descriptor we can see that it no longer has the protected control flag set ❶. Also, the API restores the inherited ACEs from the parent directory and merges them with the explicit ACE for the Authenticated Users group.

The behavior of the command when we specify the UnprotectedAcl flag shows you how you can restore the inherited ACEs for any file. If you specify an empty DACL so no explicit ACEs will be merged, and additionally specify the UnprotectedAcl flag, you'll reset the security descriptor to the version based on its parent. To simplify this operation, the PowerShell module contains the Reset-Wing32SecurityDescriptor command (Listing 6-39).

```bash
PS> $path = Join-Path "$env:TEMP\TestFolder" .test.txt"
PS> Reset-Win32SecurityDescriptor $path DacI
PS> Download-Win32SecurityDescriptor $path -Summary -SecurityInformation DacI
<INDRAW> (Auto Inherited)
Everyone: (Allowed)(Inherited)(Full Access)
NT AUTHORITYANONYMOUS LOGON: (Allowed)(Inherited)(Full Access)
```

Listing 6-39: Resetting the security of a directory using Reset-Win32SecurityDescriptor

In this listing, we call Reset-H Win32Seecuritydescriptor with the path to the file and request that the DACL be reset. When we display the security descriptor of the file, we now find that it matches the parent directory's security descriptor, shown in Listing 6-37.

---

## THE DANGER OF AUTO-INHERITANCE

The auto-inheritance features of the Win32 security APIs are convenient for applications, which can merely set an inheritable security descriptor to apply it to any child resources. However, auto-inheritance introduces a security risk, especially if used by privileged applications or services.

The risk occurs if the privileged application can be tricked into resetting

the inherited security for a hierarchy when a malicious user has control over

the parent security descriptor. For example, CVE-2018-0983 was a security

vulnerability in the privileged storage service: it called SetNamedSecurityInfo

to reset the security of a file with the path specified by the user. By using some

filesystem tricks, an attacker could link the file being reset to a system file that

was writable by an administrator only. However, the SetNamedSecurityInfo API

thought the file was in a directory controlled by the user, so it reset the security

descriptor based on that directory's security descriptor, granting the malicious

user full access to the system file.

Microsoft has fixed this issue, and Windows no longer supports the filesystem tricks necessary to exploit it. However, there are other potential ways for a privileged service to be tricked. Therefore, if you're writing code to set or reset the security descriptor of a resource, pay careful attention to where the path comes from. If it's from an unprivileged user, make sure you impersonate the caller before calling any of the Win32 security APIs.

One final API to cover is GetInheritanceSource, which allows you to identify the source of a resource's inherited ACEs. One reason ACEs are marked with the Inherited flag is to facilitate the analysis of inherited ACEs. Without the flag, the API would have no way of distinguishing between inherited and non-inherited ACEs.

For each ACE with the Inherited flag set, the API works its way up the parent hierarchy until it finds an inheritable ACE that doesn't have this flag set but contains the same SID and access mask. Of course, there is no guarantee that the found ACE is the actual source of the inherited ACE, which could potentially live further up the hierarchy. Thus, treat the output of GetInheritanceSource as purely informational, and don't use it for securitycritical decisions.

Like the other Win32 APIs, GetInheritanceSource supports different types. However, it's limited to resources that have a child-parent relationship, such as files, registry keys, and DS objects. You can access the API through the Search-Win32SecurityDescriptor command, as shown in Listing 6-40.

```bash
PS> $path = Join-Path "$env:TEMP" "TestFolder" "
PS> Search-Win32SecurityDescriptor $path | Format-Table
Name
----------------------
Access
------ -----
0
  Everyone
----------------------
0
NT AUTHORITYANONYMOUS LOGON GenericAll
GenericAll
```

212    Chapter 6

---

```bash
PS> $path = Join-Path $path "new.txt"
PS> "Hello" | Set-Content $path
PS> Search-Min32SecurityDescriptor $path | Format-Table
Name
Depth User
-----
------ -----
----------------------
C:\Temp\TestFolder\1
    Everyone
GenericAll
C:\Temp\TestFolder\1
    NT AUTHORITY(ANONYMOUS LOGON GenericAll
```

Listing 6-40: Enumerating inherited ACEs using Search-Win32SecurityDescriptor

We first call $search-#in32securityDescriptor with the path to the directory we created in Listing 6-38. The output is a list of the ACEs in the resource's DACL, including the name of the resource from which each ACE was inherited and the depth of the hierarchy. We set two explicit ACEs on the directory. The output reflects this as a Depth value of 0, which indicates that the ACE wasn't inherited. You can also see that the Name column is empty.

We then create a new file in the directory and rerun the command. In this case, as you might have expected, the ACEs show that they were both inherited from the parent folder, with a Depth of 1.

This section covered the basics of the Win32 APIs. Keep in mind that there are clear differences in behavior between these APIs and the lowlevel system calls, especially regarding inheritance. When you interact with the security of resources via a GUI, it's almost certainly calling one of the Win32 APIs.

## Server Security Descriptors and Compound ACEs

Let's finish this chapter with a topic I briefly mentioned when we discussed creator SIDs: server security descriptors. The kernel supports two very poorly documented security descriptor control flags for servers: ServerSecurity and BadLittledustred . We use these flags only when generating a new security descriptor, either at object creation time or when assigning a security descriptor explicitly. The main control flag, ServerSecurity , indicates to the security descriptor generation code that the caller is expecting to impersonate another user.

When a new security descriptor is created during impersonation, the owner and group SIDs will default to the values from the impersonation token. This might not be desirable, as being the owner of a resource can grant a caller additional access to it. However, the caller can't set the owner to an arbitrary SID, because the SID must be able to pass the owner check, which is based on the impersonation token.

This is where the ServerSecurity control flag comes in. If you set the flag on the creator security descriptor when creating a new security descriptor, the owner and group SIDs default to the primary token of the caller, and not to the impersonation token. This flag also replaces all Allowed ACEs in the DACL with AllowedCompound ACEs, the structure of which we defined back in Chapter 5. In the compound ACE, the server SID is set to the owner SID from the primary token. Listing 6-41 shows an example.

Reading and Assigning Security Descriptors 213

---

```bash
#! PS> $token = Get-NTToken -Anonymous
#! PS> $creator = New-NTSecurityDescriptor -Type Mutant
#! PS> Add-NTSecurityDescriptorAce $creator -KnownSid World -Access GenericAll
#! PS> $sd = New-NTSecurityDescriptor -Token $token -Creator $creator
#! PS> Format-NTSecurityDescriptor $sd -Summary -SecurityInformation
{% Owner,Group,Dacl }
#! <Owner> : NT AUTHORITY\ANONYMOUS LOGON
#! <Group> : NT AUTHORITY\ANONYMOUS LOGON
<!DACL>
#! Everyone: (Allowed)(None)(Full Access)
#! PS> Set-NTSecurityDescriptorControl $creator ServerSecurity
#! PS> $sd = New-NTSecurityDescriptor -Token $token -Creator $creator
#! PS> Format-NTSecurityDescriptor $sd -Summary -SecurityInformation
{% Owner,Group,Dacl }
#! <Owner> : GRAPHITE\User
#! <Group> : GRAPHITE\Wone
#! <DACL>
#! Everyone: (AllowedCompound)(None)(Full Access)(Server:GRAPHITE\user)
```

Listing 6-41: Testing the ServerSecurity security descriptor control flag

We first create a new security descriptor using the anonymous user token ❶ . This initial test doesn't set the ServerSecurity flag. As expected, the Owner and Group default to values based on the Anonymous user token, and the single ACE we added remains intact ❹ . Next, we add the ServerSecurity control flag to the creator security descriptor ❸ . After calling New-ntSecurity Descriptor again, we now find that the Owner and Group are set to the defaults for the primary token, not to those of the Anonymous user token ❹ . Also, the single ACE has been replaced with a compound ACE, whose server SID is set to the primary token's owner SID ❸ . We'll discuss how changes to compound ACEs impact access checking in Chapter 7.

The DACLUtrusted control flag works in combination with ServerSecurity. By default, ServerSecurity assumes that any compound ACE in the DACL is trusted and will copy it verbatim into the output. When the DACLUtrusted control flag is set, all compound ACEs instead have their server SID values set to the primary token's owner SID.

If the ServerSecurity control flag is set on the creator security descriptor and the new security descriptor inherits ACEs from a parent, we can convert the CREATOR OWNER SERVER and CREATOR GROUP SERVER SIDs to their respective primary token values. Also, any inherited Allowed ACEs will be converted to compound ACEs, except for those of the default DACL.

## A Summary of Inheritance Behavior

Inheritance is a very important topic to understand. Table 6-8 summarizes the ACL inheritance rules we've discussed in this chapter, to help you make sense of them.

214   Chapter 6

---

Table 6-8: Summary of Inheritance Rules for the DACL

<table><tr><td>Parent ACL</td><td>Creator ACL</td><td>Auto-inherit set</td><td>Auto-inherit not set</td></tr><tr><td>None</td><td>None</td><td>Default</td><td>Default</td></tr><tr><td>None</td><td>Present</td><td>Creator</td><td>Creator</td></tr><tr><td>Non-inheritable</td><td>None</td><td>Default</td><td>Default</td></tr><tr><td>Inheritable</td><td>None</td><td>Parent</td><td>Parent</td></tr><tr><td>Non-inheritable</td><td>Present</td><td>Creator</td><td>Creator</td></tr><tr><td>Inheritable</td><td>Present</td><td>Parent and creator</td><td>Creator</td></tr><tr><td>Non-inheritable</td><td>Protected</td><td>Creator</td><td>Creator</td></tr><tr><td>Inheritable</td><td>Protected</td><td>Creator</td><td>Creator</td></tr><tr><td>Non-inheritable</td><td>Defaulted</td><td>Creator</td><td>Creator</td></tr><tr><td>Inheritable</td><td>Defaulted</td><td>Parent</td><td>Parent</td></tr></table>


The first two columns in this table describe the state of the parent ACL and the creator ACL; the last two describe the resulting ACL, depending on whether the BacIAutoInherit and/or SaclAutoInherit flag was set. There are six ACL types to consider:

None The ACL isn't present in the security descriptor.

Present The ACL is present in the security descriptor (even if it is a NULL or empty ACL).

Non-inheritable The ACL has no inheritable ACEs.

Inheritable The ACL has one or more inheritable ACEs.

Protected The security descriptor has the Dac1Protected or Sacl Protected control flag set.

Defaulted The security descriptor has the DacDefaulted or SacL Defaulted control flag set.

Additionally, there are four possible resulting ACLs:

Default The default DACL from the token, or nothing in the case of a SACL

Creator    All ACEs from the creator ACL

Parent The inheritable ACEs from the parent ACL

Parent and creator The inheritable ACEs from the parent and explicit ACEs from the creator

When an auto-inherit flag is set, the new security descriptor will have the corresponding DacAutoInherited or SazAutoInherited control flag set.


Also, all ACEs that were inherited from the parent ACL will have the Inherited ACE flag set. Note that this table doesn't consider the behavioral changes due to object ACEs, mandatory labels, server security, and creator SIDs, which add more complexity.

---

## Worked Examples

Let's walk through some worked examples that use the commands you've learned about in this chapter.

### Finding Object Manager Resource Owners

As you've seen in this chapter, the owner of a resource's security descriptor is usually the user who created the resource. For administrators, however, it's typically the built-in Administrators group. The only way to set a different owner SID is to use another token group SID that has the @owner flag set, or to enable $@restorePrivilege. Neither option is available to non-administrator users.

Thus, knowing the owner of a resource can indicate whether a more privileged user created and used the resource. This could help you identify potential misuses of the Win32 security APIs in privileged applications, or find shared resources that a lower-privileged user might write to; a privileged user could mishandle these, causing a security issue.

Listing 6-42 shows a simple example: finding object manager resources whose owner SID differs from the caller's.

```bash
PS> function Get-NameAndOwner { ❶
    [CmdletBinding()]
    param(
        [parameter(Mandatory, ValueFromPipeline)]
        $Entry,
        [parameter(Mandatory)]
        $Root
    )
    begin {
        $curr_owner = Get-NtSid -Owner @
    }
    process {
        $sd = Get-NtSecurityDescriptor -Path $Entry.Name -Root $Root @
-TypeName $Entry.NtTypeName -ErrorAction SilentlyContinue
        if ($null -ne $sd -and $sd.Owner.Sid -ne $curr_owner) {
            [PCCustomObject] @{
                Name = $Entry.Name
                NtTypeName = $Entry.NtTypeName
                Owner = $sd.Owner.Sid.Name
                SecurityDescriptor = $sd
            }
        }
    }
}
PS> Use-NtObject($dir = Get-NtDirectory \BaseNamedObjects) { ❷
        Get-NtDirectoryEntry $dir | Get-NameAndOwner -Root $dir
    }
216   Chapter 6
```

---

```bash
Name                Name        Name        SecurityDescriptor
----------------------
CLR_PerfMon_DoneEnumEvent    Event      NT AUTHORITY\SYSTEM   0:SYS:SYD:(A;;..-
WAMACAP01_3_Read          Event      BUILTIN\Administrators  0:SYS:SYD:(A;;..
WAMACAP01_8_Mem          Section    BUILTIN\Administrators  0:SYS:SYD:(A;;..-
--snip--
```

Listing 6-42: Finding objects in BaseNamedObjects that are owned by a different user

We first define a function to query the name and owner of an object manager directory entry ❶ . The function initializes the $curr_owner variable with the owner SID of the caller's token ❷ . We'll compare this SID with the owner of a resource to return only resources owned by a different user.

For each directory entry, we query its security descriptor using the Get-NTSecurityDescriptor command . We can specify a path and a root Directory object to the command to avoid having to manually open the resource. If we successfully query the security descriptor, and if the owner SID does not match the current user's owner SID, we return the resource's name, object type, and owner SID.

To test the new function, we open a directory (in this case, the global BaseNamedObjects directory ) and use Get-MtDirectoryEntry to query for all entries, piping them through the function we defined. We receive a list of resources not owned by the current user.

For example, the output includes the WAMACAPQ_8_Mem object, which is a shared memory Section object. If a normal user can write to this Section object, we should investigate it further; as it might be possible to trick a privileged application into performing an operation that would elevate a normal user's privileges.

We can test our ability to get write access on the Section object by using the Get-NTGrantedAccess command with the SecurityDescriptor property of the object, as shown in Listing 6-43.

```bash
PS> $entry
---->---------------------Name: NtTypeName  Owner                     SecurityDescriptor
---->---------------------Section: BUILTIN\Administrators  O:SVG:SYSD:(A;;...
PS> Get-NtGrantedAccess -SecurityDescriptor $entry.SecurityDescriptor
Query, MapWrite, MapRead, ReadControl
```

Listing 6-43: Getting the granted access for a Section object

The $entry variable contains the object we want to inspect. We pass its security descriptor to the Get-NTGrantedAccess command to return the maximum granted access for that resource. In this case, we can see that

MapWrite is present, which indicates that the Section object could be mapped as writable.

The example I've shown in Listing 6-42 should provide you with an understanding of how to query for any resource. You can replace the directory with a file or registry key, then call Get-NtSecurityDescriptor with the

---

path and the root object to query the owner for each of these resource types.

For the object manager and registry, however, there is a much simpler way of finding the owner SID. For the registry, we can look up the security descriptor for the entries returned from the NoObject drive provider using the SecurityDescriptor property. For example, we can select the Name and Owner SID fields for the root registry key using the following script:

```bash
PS> ls NtKey:\ | Select Name, {__.SecurityDescriptor.Owner.Sid}
```

We can also specify the Recurse parameter to perform the check recursively.

If you want to query the owner SDIs of files, you can't use this technique, as the file provider does not return the security provider in its entries. Instead, you need to use the built-in Get-ACL command. Here, for example, we query a file's ACL:

```bash
_____________________________________________________________________
P>S> ls C:\| Get-Acl | Select Path, Owner
```

The Get-Acl command returns the owner as a username, not a SID. You'll have to look up the SID manually using the Get-MSID command, and the Name parameter if you need it. Alternatively, you can convert the output of the Get-Acl command to a $SecurityDescriptor object used in the $TObjectManager module, as shown in Listing 6-44.

```bash
PS> <Get-ACL C:\ | ConvertTo-NtSecurityDescriptor().Owner.Sid
Name                     ----      Sid
----------------------------------------------------
NT SERVICE\TrustedInstaller 5-1-5-80-956008885-3418522649-1831038044----
```

Listing 6-44: Converting Get-Acl output to a SecurityDescriptor object

We use the ConvertTo-MtSecurityDescriptor PowerShell command to perform the conversion.

## Changing the Ownership of a Resource

Administrators commonly take ownership of resources. This allows them to easily modify a resource's security descriptor and gain full access to it. Windows comes with several tools for doing this, such astakeown.exe, which sets the owner of a file to the current user. However, you'll find it instructive to go through the process of changing the owner manually, so you can understand exactly how it works. Run the commands in Listing 6-45 as an administrator.

```bash
PS> $new_dir = New-NTDirectory "ABC" -Win32Path
PS> Get-NTSecurityDescriptor $new_dir | Select $_.Owner.Sid.Name
$_.Owner.Sid.Name
----------+
BUILTIN\Administrators
```

218   Chapter 6

---

```bash
PS> Enable-NtTokenPrivilege SeRestorePrivilege
PS> Use-NtObject($dir = Get-NtDirectory "ABC" -Win32Path -Access WriteOwner) {
   $sid = Get-NtSid -KnownSid World
   $sd = New-NtSecurityDescriptor -Owner $sid
   Set-NtSecurityDescriptor $dir $sd -SecurityInformation Owner
PS> Get-NtSecurityDescriptor $new_dir | Select {$_Owner.Sid.Name}
$_Owner.Sid.Name
--------------------
Everyone
PS> $new_dir.Close()
```

Listing 6-45: Setting an arbitrary owner for a Directory object

We start by creating a new directory object on which to perform the operations. (We'll avoid modifying an existing resource, which might risk breaking your system.) We then query the resource's current owner SID. In this case, because we're running this script as an administrator, it's set to the Administrators group.

Next, we enable the %restorePrivilege privilege. We need to do this only if we want to set an arbitrary owner SID. If we want to set a permitted SID, we can skip this line. We then open the Directory again, but only for WriteOwner access.

We can now create a security descriptor with just the owner SID set to the World SID. To do this, we call the Set-NtSecurityDescriptor PowerShell command, specifying only the Owner flag. If you haven't enabled Se restorePrivilege, this operation will fail with a STATUS_INVALID_OWNER status code. To confirm that we've changed the owner SID, we query it again, which confirms that it's now set to Everyone (the name of the World SID).

You can apply this same set of operations to any resource type, including registry keys and files; simply change the command used to open the resource. Whether you'll be granted writeOver access depends on the specifics of the access check process. In Chapter 7, you'll learn about a few cases in which the access check automatically grants writeOver access based on certain criteria.

## Wrapping Up

This chapter began with an overview of how to read the security descriptor of an existing kernel resource using the Get-htObject#Security command. We covered the security information flags that define what parts of the security descriptors the command should read and outlined the special rules for accessing audit information stored in the SACL.

We then discussed how we can assign security descriptors to resources, either during the resource creation process or by modifying an existing resource. In the process, you learned about ACL inheritance and autoinheritance. We also discussed the behavior of the Win32 APIs, specifically

Reading and Assigning Security Descriptors 219

---

SetNamedSecurityInfo, and how that API implements auto-inheritance even though the kernel doesn't explicitly implement it. We concluded with an overview of the poorly documented server security descriptor and compound ACEs. In the next chapter, we'll (finally) discuss how Windows combines the token and security descriptor to check whether a user can access a resource.