## 6

## READING AND ASSIGNING SECURITY DESCRIPTORS

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

