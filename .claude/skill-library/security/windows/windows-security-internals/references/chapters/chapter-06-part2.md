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

---

