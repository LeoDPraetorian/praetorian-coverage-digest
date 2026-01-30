## Reading and Writing Attributes

The ReadProp and WriteProp access rights control the reading and writing, respectively, of attributes in an object. It's possible to allow the reading and writing of all of an object's attributes through an ACE with no object type. More commonly, however, an object will allow the reading of all attributes, but restrict which attributes can be written by specifying an ACE's object type as the attribute's schema identifier.

Listing 11-26 shows an example of how to implement an access check for reading and writing attributes.

```bash
﻿  ♦ PS> $sd = New-NtSecurityDescriptor -Type DirectoryService -Owner "DA"
        -Group "DA"
        ♦ PS> Add-NtSecurityDescriptorAce $d -KnownSid World -Type Allowed
        -Access ReadProp
  ♦ PS> $attr = Get-DsSchemaAttribute -Name "accountExpires"
        ♦ PS> Add-NtSecurityDescriptorAce $d -KnownSid World -Type AllowedObject
        -Access WriteProp -ObjectType $attr.SchemaId
  ♦ PS> Get-NtGrantedAccess $d -ObjectType $attr
                ReadProp, WriteProp
  ♦ PS> $pwd = Get-DsSchemaAttribute -Name "pudLastSet"
        ♦ PS> Get-NtGrantedAccess $sd -ObjectType $pwd
                ReadProp
Listing 11-26: Testing the ReadProp and WriteProp access rights
```

We start by creating a new security descriptor with an Allowed ACE that grants ReadProp access, without specifying an object type . We then add an ACE that grants WriteProp access to only the accountExpires attribute .

Next, we perform an access check specifying that attribute's schema identifier as the object type , and we're granted both ReadProp and WriteProp access. However, if we run the access check with a different attribute type , we're granted only the general ReadProp access.

Note that the security descriptor could contain a Denied ACE to block the reading or writing of a specific attribute, even if a separate ACE enabled reading or writing of all attributes. For instance, if the Denied ACE blocked the reading of the readSet attribute we queried for here, even ReadProp access wouldn't be granted. The directory server must ensure that it specifies the exact object type for the attributes to check.

## NOTE

Even if the access check indicates that an attribute can be read or written, the directory server doesn't have to honor that decision. The directory contains several attributes that a normal user can't read or write. For example, they can't read or write user passwords, which are stored in the unicodepwd attribute that only the system is permitted to access. No amount of configuring the security descriptor should change this behavior (although a separate mechanism allows a user to write the password;

---

we'll come back to this in "Control Access Rights" on page 376). Note also that a normal user can't modify any attribute that is marked as system-only, indicated by the systemOnly attribute in the schema.

## Checking Multiple Attributes

To avoid making you send multiple requests to the directory server, LDAP supports the reading and writing of multiple attributes in a single request. However, it would be expensive to then require an access check for each of these attributes' schema identifiers before determining what you can read or write.

As I described in Chapter 7, the access check process allows you to build a tree of object types to verify multiple attributes in a single check. This tree lists each object type and what access it will be granted, enabling the directory server to quickly determine if it should grant a request. Listing 11-27 shows how to use an object type tree in an access check. It adds to the commands in Listing 11-26.

```bash
♦ PS> $user = Get-DSchemaClass -Name "user"
  PS> $obj_tree = New-ObjectTypeTree $user
  PS> Add-ObjectTypeTree -Tree $obj_tree $attr
  PS> Add-ObjectTypeTree -Tree $obj_tree $pwd
  ♦ PS> Get-NtGrantedAccess $sd -ObjectType $obj_tree -ResultList -PassResult |
  Format-Table Status, SpecificGrantedAccess Name
                          Status SpecificGrantedAccess Name
                          --------------------
  STATUS_SUCCESS        ReadProp user
  STATUS_SUCCESS        ReadProp, WriteProp accountExpires
  STATUS_SUCCESS        ReadProp pwdLastSet
  ♦ PS> Get-NtGrantedAccess $sd -ObjectType $obj_tree -ResultList -PassResult -
  -Access WriteProp | Format-Table Status, SpecificGrantedAccess, Name
                          Status SpecificGrantedAccess Name
                          --------------------
  STATUS_ACCESS_DENIED        None user
  STATUS_SUCCESS        WriteProp accountExpires
  STATUS_ACCESS_DENIED        None pwdLastSet
```

Listing 11-27: Using an object type tree to check multiple attributes

We first get the user schema class ❶ and use it to build the tree, setting the class's schema identifier as the tree's root. We then add the two attributes we want to check, accountExpires and pwdLastSet, as leaf nodes to the root, using the Add-ObjectTypeTree command. Figure 11-4 shows the structure of the final tree.

---

![Figure](figures/WindowsSecurityInternals_page_402_figure_000.png)

Figure 11-4. The object type tree for the user object and its accountExpires and padLastSet attributes

Next, we pass the tree to Get-NotGrantedAccess , making sure to specify that we want the list of all results, not the single granted-access value. The results show that only the accountExpires attribute has been granted ReadProp and WriteProp access, while the user object and pdlastSet attribute have been granted ReadProp access only.

Typically, the Active Directory server will specify an explicit access right to check for, rather than simply requesting the maximum granted access. We can test this by specifying the Access parameter with a value of

WriteProp and checking the resulting behavior ❶. The results show that the user object and its pwdLastSet attribute have been denied access, but that the accountExpires attribute is granted WriteProp access.

The fact that the object's class is specified in the tree leads to an interesting behavior, demonstrated in Listing 11-28.

```bash
PS> Add-MSecurityDescriptorForAce $d -KnownSid World -Type AllowedObject
-Access WriteProp -ObjectType $user.SchemaId
PS> Get-NTGrantedAccess $d -ObjectType $obj_tree -ResultList -PassResult |
Format-Table Status, SpecificGrantedAccess, Name
        Status SpecificGrantedAccess Name
            --------------------- ----
    STATUS_SUCCESS    ReadProp, WriteProp user
    STATUS_SUCCESS    ReadProp, WriteProp accountExpires
    STATUS_SUCCESS    ReadProp, WriteProp pwdLastDest
```

Listing 11-28: Granting WriteProp access to the schema class

As you can see, it's possible to add an ACE that grants access rights for all attributes of a specified object class. Here, we add an ACE grantting WriteProp access and specify the user class's schema identifier. When we repeat our access check, this time we find that WriteProp access is granted for all attributes in the tree.

This behavior, granting access to all attributes, is likely an emergent property of the implementation, not an intentional design decision; the Windows user interface for modifying a directory object's security descriptor can't understand the ACE and shows it as granting no specific access rights. An attacker could use this behavior to hide malicious modifications to the security descriptor from an administrator.

---

## Analyzing Property Sets

As shown in Listing 11-29, an object class can have many attributes—in the case of the user class, a total of 428 if we include the attributes of all its auxiliary classes.

```bash
PS> |Get-CsSchemaClass user -Recurse -IncludeAuxiliary |
Sort-Object SchemaID -Unique |
Select-Object -ExpandProperty(Attributes).Count
428
```

Listing 11-29: Counting attributes for the user schema class

If you wanted to grant specific access rights to all of these attributes, the DACL would quickly become unmanageable; the ACL might even run out of its allowed 64KB of space.

To partially solve this problem, the Active Directory configuration can define arbitrary property sets, which group multiple attributes together under a single GUID. It can then use this identifier as the object type in an ACE to grant or deny access to a group of attributes in one go. Property sets are just one type of extended right, which allow an administrator to add additional access rights to the directory. We'll cover the other two, control access rights and validated write access rights, in the following sections. Listing 11-30 shows how to get all the extended rights in the current directory.

```bash
PS> $config_dn = (Get-ADRootSE).configurationNamingContext
PS> $extended_dn = CN-Extended-Rights-$config_dn"
PS> Get-ADObject -SearchBase $extended_dn -SearchScope OneLevel -Filter *
-Properties * | Group-Object {
    Get-NtAccessMask $.validAccesses -AsSpecificAccess DirectoryService
}  Count Name                Group
------ --------------------------- -----------------
   60 ControlAccess             {CN=Add-GUID,CN=Extended-Rights,..,}
   15 ReadProp, WriteProp      {CN=DNS-Host-Name-Attributes,..}
   6 Self                          {CN=DS-Validated-Write-Computer,..}
```

Listing 11-30: Getting extended rights and grouping them by the validAccesses attribute

An object can specify a particular type of extended right in its valid


Accesses attribute, which stores an integer representing directory object

access rights. We convert the attribute to an access rights enumeration

using the Get-NetAccessMask PowerShell command. If the validAccesses attri bute (and thus the value in the Name column) is set to ReadProp and WriteProp,

the extended right is a property set.

To simplify the analysis of extended rights and property sets, the NutObject


Manager module implements the Get-DSExtendedRight PowerShell command, as


shown in Listing 11-31.

```bash
# PS: $attr = Get-DsSchemaAttribute -Name "accountExpires"
# PS: $prop_set = Get-DsExtendedRight -Attribute $attr
# PS: $prop_set
```

Active Directory      373

---

```bash
Name                RightsId
     ------
@ User-Account-Restrictions 4c164200-20c0-11d0-a768-00aa006e0529
@ PS> $prop_set.AppliesTo | Select-Object Name
    Name
    -----
    msDS-GroupManagedServiceAccount
    inetOrgPerson
    msDS-ManagedServiceAccount
    computer
    user
@ PS> $user = Get-DsSchemaClass user
PS> Get-DsExtendedRight -SchemaClass $user
    Name                     RightsId
    --------------------
    Allowed-To-Authenticate      68b1d179-0d15-44df-ab71-46152e79a7bc
    Email-Information        e45795b2-9455-11d1-aedb-0000f80367c1
    General-Information       59ba2f42-79a2-11b0-9020-00c04fc2d3cf
    --snip--
```

Listing 11-31: Getting the property set for an attribute and its possible schema classes

We first get the accountExpires attribute we used earlier and pass it to the Get-dsExtendAddRight command ❶. If the attribute is part of a property set, the command will return the extended right. Here, the output lists the attribute as part of the User-Account-Restrictions property set ❷.

The RightsId column provides the GUID you'd use in an ACE to allow or deny access to the object type. You can find this GUID in the schema attribute's attributeSecurityGuid attribute. Each property set also has a list of schema classes that are allowed to contain it ❸. This allows the directory server to know what object type tree it needs to build when doing an access check.

Finally, we perform the reverse operation; finding all property sets that apply to a specific schema class, user ❶.

Listing 11-32 demonstrates using a property set in an access check.

```bash
♦ PS> $d = New-NtSecurityDescriptor -Type DirectoryService
    -Owner "$v" -Group "$v"
  ♦ PS> Add-NtSecurityDescriptorAce $d -KnownSid World -Type AllowedObject
        -Access ReadProp -ObjectType $prop_set.RightsId
  ♦ PS> Add-NtSecurityDescriptorAce $d -KnownSid World -Type AllowedObject
        -Access WriteProp -ObjectType $attr.SchemaId
  ♦ PS> $obj_tree = New-ObjectTree -SchemaObject $user
        $ps -Add-ObjectTypeTree -Tree $obj_tree -SchemaObject $prop_set
  ♦ PS> Get-NtGrantedAccess $d -ObjectType $prop_set -ResultList -PassResult |
      Format-Table SpecificGrantedAccess, Name
      SpecificGrantedAccess Name
        --------------------
            ReadProp user
            ReadProp User-Account-Restrictions
        ReadProp, WriteProp accountExpires
```

---

```bash
ReadProp mDS=AllowedToActOnBehalfOfOtherIdentity
ReadProp mDS=User-Account-Control-Computed
ReadProp mDS=UserPasswordExpiryTimeComputed
ReadProp pwdLastSet
ReadProp userAccountControl
ReadProp userParameters
```

Listing 11-32: Performing an access check with a property set

We build a new security descriptor to do the check ❶, and we grant ReadProp access based on the property set identifier. We also grant WriteProp access to the accountExpires attribute within that set, using the attr variable we defined in Listing 11-31 ❷.

Next, we need to build the object type tree ❸. As before, the root of the tree is the object class. We then add the property set as a child of the tree, producing the object type tree shown in Figure 11 - 5 .

![Figure](figures/WindowsSecurityInternals_page_405_figure_004.png)

Figure 11-5: The property set object type tree

This object type tree contains both the property set at level 1 and entries for each attribute in the set at level 2. This tree structure allows us to grant access based on either the property set identifier or individual attributes.

Note that the directory server implements individual attribute checks a little differently; it always uses property sets if it can, but if an attribute isn't in a property set it uses a dummy GUID, named PROSET_GUID_DEFAULT, as a placeholder. You might see this GUID in audit log entries, although the configuration's extended rights don't specify it.

We pass the object type tree and security descriptor to the access check ❶ , and since we granted the property set ReadProp access, all attributes in the set receive at least this level of access. Because we explicitly granted writeProp access to the accountExpires attribute, it receives this access right as well.

As you can see, if the security descriptor granted writeProp access to every attribute in the set, the access would propagate to the property set node at level 1. Therefore, if the server merely checked the property

Active Directory   375

---

set's granted access, it wouldn't matter if the security descriptor granted the access directly, using the property set's identifier, or instead granted access to every individual attribute in the set.

One last thing to highlight is what happens when we add a Denied ACE for attributes in a property set. Listing 11-33 shows an example.

```bash
♦ PS> $pwd = Get-DSSchemaAttribute -Name "pwdLastSet"
  ♦ PS> Add-MtSecurityDescriptorAce $sd -KnownSid World -Type DeniedObject
     -Access ReadProp -ObjectType $pwd.SchemaId
  ♦ PS> Edit-MtSecurityDescriptor $sd -CanonicalizedDoc
  ♦ PS> Get-MtGrantedAccess $ds -ObjectType $obj_tree -ResultList -PassResult |
    Format-Table SpecificGrantedAccess, Name
    SpecificGrantedAccess Name
                            ~~~~~~~~~~~~~~~~~~~~
                            @None user
                            ~~~~~~~~~~~~~~~~~~~
                            ~~~~~~~~~~~~~~~~~~~
                            ~~~~~~~~~~~~~~~~~~~
                            ReadProp, WriteProp accountExpires
                            ReadProp msDS-AllowedToActOrBehalfOfOtherIdentity
                            ReadProp msDS-User-Account-Control-Computed
                            ReadProp msDS-UserPasswordExpiryTimeComputed
                            ~~~~~~~~~~~~~~~~~~~
                            ~~~~~~~~~~~~~~~~~~~
                            ReadProp userAccountControl
                            ReadProp userParameters
```

Listing 11-33: Denying access to an attribute in a property set

In this listing, we include a Denied ACE for the cmdSet attribute to restrict the ReadProp access right . You must remember to canonicalize the DACL ❸ after adding the ACE; otherwise, it won't appear at the start of the list, and the access check process will ignore it.

When we run the access check, we can see that the Denied ACE has removed ReadProp access from the pdlastSet attribute, then propagated that change to the property set and user class, removing their access as well . All other attributes in the set retain their ReadProp access. This behavior makes sense: if one of the property set's attributes is denied access, then the property set as a whole isn't granted ReadProp access.

If the property set identifier was used for the DeniedObject ACE, all attributes in the set would be denied the ReadProp access right. However, accountExpires would still be granted WriteProp access as it has a separate ACE granting it that access.

An Active Directory server administrator can add their own property sets to the configuration to extend this functionality to commonly used attributes; this reduces the complexity of object security descriptors.

## Inspecting Control Access Rights

The second type of extended right, control access rights, don't necessarily correspond to any object attribute; instead, they tell the Active Directory server whether the user can perform a particular operation. Let's start by listing a subset of the control access rights, as shown in Listing 11-34.

376    Chapter 11

---

```bash
PS> Get-DSExtendedRight | Where-Object {
     $_IsControl=and_5_Name=match "password" }
} | Select-Object Name, RightsId
-------
Name
-----------------
User-Force-Change-Password
00299570-246d-11do-a768-00aa006e0529
Unexpire-Password
ccc1dc7ad-6a6d-4a7a-8846-c04e3cc5301
Update-Password-Not-Required-Bit
280f369c-67c7-438e-098-1da6f3c6f541
User-Change-PasswordId
ab721a53-1e2f-110d-9819-00aa0040529b
```

Listing 11-34: Listing control access rights with password in the name

Using the IsControl property, we filter the output so it includes only control access rights with password in their name. The IsControl property is true if the validAccesses attribute on the extended right is set to ControlAccess.

The results include two commonly used control access rights, User-Change

-Password and User-Force-Change-Password, which allow a user to modify their user object's unicodePad write-only attribute. We can't grant this ability using WriteProp access.

The difference between these two rights is that User-Change-Password requires the user to send their old password as part of the modify operation, while User-Force-Change-Password works without requiring the old pasword. These correspond to the ChangePassword and ForcePasswordChange SAM user access rights we discussed in Chapter 10 and serve the same purpose.

To give an example of how the directory server might check for a control access right, let's assume a user wants to change another user's password. Listing 11-35 shows how the server might implement the access check for permitting the change operation.

```bash
#> PS> $sd = New-MtSecurityDescriptor -Type DirectoryService -Owner "SY"
        -Group "SY"
#> PS> $right = Get-DsExtendedRight -Name 'User-Change-Password'
#> PS> Add-MtSecurityDescriptorAccess $sd -KnownSid World -Type AllowedObject
        -Access ControlAccess -ObjectType $right.RightsId
#> PS> $user = Get-DsSchemaClass user
#> PS> $obj_tree = New-ObjectTypeTree -SchemaObject $user
#> PS> Add-ObjectTypeTree -Tree $obj_tree -SchemaObject $right
#> PS> $force = Get-DsExtendedRight -Name 'User-Force-Change-Password'
#> PS> Add-ObjectTypeTree -Tree $obj_tree -SchemaObject $force
#> PS> Get-MtGrantedAccess $sd -ObjectType $obj_tree -ResultList -PassResult |
Format-Table Status, SpecificGrantedAccess, Name
                        Status SpecificGrantedAccess Name
                        --------------------
    STATUS_ACCESS_DENIED
                None user
    STATUS_SUCCESS      ControlAccess User -Change-Password
    STATUS_ACCESS_DENIED      None User -Force-Change-Password
```

Listing 11-35: Checking for the User-Change-Password control access right

First, we create a new security descriptor, get the control access right, and add an ACE to the security descriptor granting the ControlAccess access right for User-Change-Password ❶ . Next, we query for the user schema class

Active Directory   377

---

and use it to build the object type tree ❸. We need the object class to be the root, but we make the control access right its immediate child. We also query for the User-Force-Change-Password control access right and add it to the tree ❹. If the user is granted this right, the server will allow them to force the password change even if they cannot provide the currently set password.

We then run the access check ❶ and see that the user has been granted

ControlAccess for the User-Change-Password control access right. Now the directory server can proceed with the operation.

As with other types of access, it's possible for a security descriptor to grant ControlAccess either with a non-object ACE or on the object class.

From the access check perspective, ControlAccess is granted to the control access right; the directory server doesn't necessarily know the difference. It's also possible for an administrator to extend the list of control access rights, although that normally requires a third-party application to check for the right, as the directory server won't know about it.

## Analyzing Write-Validated Access Rights

The final type of extended right is write-validated access rights. They're defined when the validAccesses attribute is set to Self. Listing 11-36 shows how to list the write-validated access rights by filtering on the

IsValidateWrite property.

```bash
PS> Get-DSExtendedRight | Where-Object IsValidDate
-------
Name
-------
Validated-MS-DS-Behavior-Version
d31a8757-2447-4545-8081-3bb610acbf2
Self-Membership
fb9679c0-00de-1160-28a5-00aa0304e92
Validated-MS-DS-Additional-DNS-Host-Name
8086791-beb9-468b-837e-f70fad59ac7
Validated-SPN
f34a6788-5306-1d1a-39c5-000f080f67c1
DS-Validated-Write-Computer
9b026da-0d3c-465c-8bee-5199d7165cba
```

Listing 11-36: Listing write-validated access rights

A write-validated access right grants a user the ability to write to certain attributes of an object, with the server verifying the new value for the attribute before it's written. As an example, if a user wants to add a new member to a group object, they will need writeProp access on the member attribute, which contains a list of distinguished names of all users and groups that are members of that group. Being granted writeProp access will allow the user to modify the member list, adding or removing user or group objects. A user without that access right might still be able to add or remove their own user account name, however, if they're granted the Self access right for the Self-Membership write-validated access right on a group object. While this operation would still modify the member attribute, the server would ensure that the added or removed value corresponds to the calling user's distinguished name and reject any other modification.

The name of the access right, Self, is likely derived from its use as a mechanism for self-group membership. Over time, its use has been expanded to cover a few additional attributes. Microsoft's Active Directory

378    Chapter 11

---

Technical Specification (MS-ADTS, available online) refers to it as RIGHT_DS _WRITE_PROPERTY_EXTENDED, which is a slightly better description.

We won't perform an example access check for write-validated access because it's the same as the check shown in Listing 11-35 for control access rights; simply change the extended right you query and check that Self access is granted. As with ControlAccess, it's possible for a non-object ACE to grant Self access without having a specific ACE for the write-validated access right.

Note that an administrator can't modify the list of write-validated access rights; this is because the directory server won't know to enforce the restriction. A third-party application can't implement this behavior, either, as its purpose is to limit the changes that can be made to the directory.

## Accessing the SELF SID

When I discussed the object type access check in Chapter 7, I also mentioned a principal SID that you can specify to replace the SELFSID in an ACE. Active Directory uses the SELFSID to grant access to resources based on whether the user making the request is the "self" in question. It extracts the SID to use as this principal SID from the object's ObjectSID attribute, used to store the SID for the user or computer account, as well as the group SID.

For example, if you want to modify a user object in the directory, the server will look up the object's security descriptor and query for the object's objectSID attribute. If the attribute is present in the object, the access check will use the value as the principal SID, along with the security descriptor. If the attribute isn't present, no principal SID will be set, and any ACE with the SELF.SID won't be evaluated. Listing 11-37 shows how to extract the objectSID attribute.

```bash
PS> $computer = Get-ADComputer -Identity $env:COMPUTERNAME
PS> $computer.SID.ToString()
S=1-5-21-1195776225-522706947-2538775957-1104
PS> Get-CsObjectSid -DistinguishedName $computer.DistinguishedName
Name        $id
----~
MINERAL\GRAPHITE$  S=1-5-21-1195776225-522706947-2538775957-1104
```

Listing 11-37: Getting a computer account's objectsID

There are multiple ways of accessing the attribute. The simplest is to use either the Get-ADComputer, Get-ADUser, or Get-ADGroup command, which will automatically extract the SID. In Listing 11-37, we get the SID for the current computer. Alternatively, if you're using Get-ADObject, you can request the object$ID attribute to access the property directly.

You can also use a command that comes with the NOTeManager module: Get-Doc01@Ccl51d, which requires the full distinguished name of the object to query. The main advantage of this command is that it returns a Sid class you can use in the access check without converting the value into the correct

Active Directory      379

---

format. You can pass the returned SID to Get-NTGrantedAccess in the Principal parameter. We'll use it in the worked example at the end of the chapter.

## Performing Additional Security Checks

In most cases the access check process grants access to the directory based on the security descriptors assigned to objects, but there are several exceptions to this. For example, the directory supports privileges such as SeRestore Privilege and SeTakeOwnershipPrivilege, for changing the components of a security descriptor. Let's discuss a few additional nonstandard checks.

### Adding Workstations to a Domain

In a default domain configuration, the Authenticated Users group is granted a special privilege on the domain controller called SetAccountPrivilege. This privilege allows any domain user to join a computer to a domain, which, at a low level, means creating a computer object.

When a user tries to create a computer object, the directory server checks whether the caller has CreateChild access for the target object. If not, it checks whether they have the SeMachineAccountPrivilege privilege. If they do, it allows the creation operation.

However, in the latter case the server limits the attributes the user can set at creation time. For example, the SeMachineAccountPrivilege privilege doesn't allow a user to set an arbitrary %SecurityDescriptor attribute; the object must use the default security descriptor. The values for attributes the user is allowed to set, like the username, must also match a fixed pattern, and the security descriptor must use the Domain Admin SID as its owner and group SIDs, limiting the user's access to the object after its creation.

An individual user can create only a fixed number of computer accounts. By default, the ns-DS:MachineAccount quota attribute in the root of the directory sets this limit to 10. To enforce this restriction during the creation of a new computer object, the server searches all existing computer objects and checks their ns-DS:CreatorSID attribute, which stores the SID of the user who created the object. The server then calculates the number of computers the caller has already added, and if it's over the quota, it rejects the request. However, if the caller has CreateChild access, the quota doesn't apply. Listing 11-38 shows how to query these values.

```bash
PS> $root_dn = (Get-ADRootDSE).defaultNamingContext
PS> $obj = Get-ADObject $root_dn -Properties 'ms-DS-MachineAccountQuota'
PS> $obj['ms-DS-MachineAccountQuota']
10
PS> Get-ADComputer -Filter * -Properties 'ms-DS-CreatorSID' | ForEach-Object {
   $creator = $_["ms-DS-CreatorSID"]
   if ($creator.Count -gt 0) {
      $sid = Get-NtSid -Sddl $creator[0]
      Write-Host $_.Name, " - ", $sid.Name
    }
}
```

---

```bash
GRAPIHTE - MINERAL\alice
TOPAZ - MINERAL\alice
PYRITE - MINERAL\bob
```

Listing 11-38: Querying the SIDs used to enforce computer account creation quotas

You can create a new computer account using the New-ADComputer command, specifying the required attributes. For example, Listing 11-39 creates the computer account DEMOCOMP with a known password.

```bash
PS> $pwd = ConvertTo-SecureString -String "Password1!!!" -AsPlainText -Force
PS> $name = "DEMCOMP"
PS> $dnsname = "$name $($Get-ADDDomain).DNSRoot"
PS> New-ADComputer -Name $name -SAMAccountName "$name '$' -DNSSHostName $dnsname
-ServicePrincipalNames "HOST$name" -AccountPassword $pwd -Enabled $true
```

Listing 11-39: Creating a new computer account in the domain

You can also create an account using the SAM remote service, as shown in Listing 11-40.

```bash
PS> $amd = Connect-SamServer -ServerName PRIMARYDC
PS> $domain = Get-SamDomain -Server $amd -User
PS> $user = New-SamUser -Domain $domain -Name 'DEMOComp3' -AccountType
Workstation
PS> $pwd = Convert-To-SecureString -String "PassWOrd1!!!" -AsPlainText -Force
PS> $user.SetPassword($pwd, $false)
```

Listing 11-40: Creating a new computer in the domain via the SAM remote service

Servers typically create an account in this way when you join a computer to a domain.

## User Delegation Rights

In a default domain configuration, the Administrators group is granted a special privilege on the domain controller: the SeEnableDelegationPrivilege privilege, which allows users to modify the Kerberos delegation settings. Specifically, it lets them do the following:

- • Set the TrustedForDelegation user account control flag.

• Set the TrustedToAuthenticateForDelegation user account control flag.

• Modify the #SDS-AllowedToDelegateTo attribute of a user or computer

object.
We'll discuss Kerberos delegation and the use of these settings in more detail in Chapter 14.

## Protected Objects

The root domain of the directory shares its domain configuration and schema with the entire forest, meaning changes to a user in other domains will eventually be replicated in the root domain. But allowing a child

Active Directory      381

---

domain to modify the domain configuration or schema is not a good idea, so the server implements a way of protecting objects from being directly modified, deleted, or moved.

Rather than storing this protection as an object attribute or an ACE, the server sets the resource manager control flag in the security descriptor to 1. The technical specification refers to this bit flag as SECURITY_PRIVATE OBJECT. If the object's security descriptor has this flag set and the object is in the schema's or configuration's naming context, then users cannot modify the object unless their owner SID belongs to the same domain as the domain controller on which the modification is being performed.

For example, most objects in the configuration are owned by the Enterprise Admins group, a Universal group defined in the root domain. So, if an object is protected, only a domain controller in the root domain can modify it directly. Listing 11-41 contains a short script that searches for protected objects in the configuration naming context by checking the resource manager control flags. No other Windows feature uses these resource manager control flags, as far as I can tell.

```bash
PS> $conf_nc = (Get-ADRootDSE).configurationNamingContext
PS> Get-ADObject -SearchBase $conf_nc -SearchScope Subtree -Filter * |
ForEachObject {
    $sd = Get-Win32SecurityDescriptor -Name $_.DistinguishedName -Type Ds
   if ($sd.RmControl -eq 1) {
        $_.DistinguishedName
```

Listing 11-41: Finding protected configuration objects

In a default installation of an Active Directory server, Listing 11-41 should output no results, as the directory shouldn't have any protected objects.

This concludes our discussion of access checking, although we'll come back to it in an expansive worked example at the end of the chapter. Next, we'll cover two final Active Directory topics: how user and device claims are stored in the directory, and how group policies are configured.

## Claims and Central Access Policies

In the preceding chapters we discussed user and device claims, how tokens store them as security attributes, and how access checks use them. Claims are especially important for enabling central access policies, as we discussed in Chapter 7 .

The domain's Active Directory server stores both claims and central access policies, and it can apply these whenever a user authenticates or a computer synchronizes its policy. Listing 11-42 shows how to query the Active Directory server for a claim using the Get-ADClaimType PowerShell command, which searches for objects of the schema class nS5-ClaimType.

---

```bash
PS> Get-ADClaimType -Filter {DisplayName =eq "Country"}
Format-list ID, ValueType, SourceAttribute, AppliesToClasses
ID                : ad:///ext/country
ValueType            : String
SourceAttribute      : CN=Text-Country,CN=Schema,CN=Configuration,...
AppliesToClasses    : {CN=User,CN=Schema,CN=Configuration,...}
```

Listing 11-42: Displaying properties of the Country claim

In this example, we find that an administrator configured the Country claim when setting up the domain; it isn't available by default. This claim represents the name of the user's country.

We show only a few of the relevant properties of the object. The first is the claim's ID, used for the security attribute in the token; in this case, it's ad://ext/country . We also show the value's type, used to determine what security attribute values to add to the token; in this case, it's a string.

The next property is the distinguished name of the schema attribute from which the value is derived. (It's possible for a claim to be derived from other data, such as values on a user's smart card, but sourcing the claim from a schema attribute is the simplest case.) When the user is authenticated, the token will construct the claim based on the attribute value from their user object; if the attribute isn't set, the claim won't be added to the token. An administrator can modify the directory schema to add new attributes from which to derive their own claims, such as a user's security clearance.

Finally, we display the list of schema classes to which this claim applies.


In this case, only the user schema class appears in the listing. If this list contained the distinguished name of the computer class, it would be a device claim, not a user claim, although claims can apply to both users and computers.

Listing 11-43 shows how to display the properties of a central access policy in the directory.

```bash
PS >$policy = Get-ADCentralAccessPolicy -Identity "Secure Room Policy"
PS >$policy | Format-List PolicyID, Members
PolicyID : $1~17-3260955821-1180564752-55083341-1617862776
Members : {CN=Secure Rule,CN=Central Access Rules,CN=Claims...}
PS >$policy.Members | ForEach-Object {Get-ADCentralAccessRule -Identity $_ }
Format-List Name, ResourceCondition, CurrentAcl
Name
   : : Secure Rule
ResourceCondition : ($BRESOURCE_Enable==1 :|
CurrentAcl
: D:\XA;F;A;W\:(@USER.ad:/ext/clearance...
```

Listing 11-43: Displaying properties of a central access policy

Administrators deploy central access policies to a domain's computers and servers based on the group policy configuration. This allows them to selectively deploy a policy to a specific subset of systems in the domain. The policy's configuration is stored in the directory, however.

Active Directory   383

---

The policy consists of two components: the policy object itself, represented by the msAuthz-CentralAccessPolicy schema class, and one or more central access rules, represented by the msAuthz-CentralAccessRule schema class.

In Listing 11-43, we first query for a specific central access policy named Secure Room Policy using the Get-AzCentralAccessPolicy PowerShell command. From the policy we can extract the policy SID, which we use to apply the policy to a resource, as well as a list of the distinguished names of each member rule.

NOTE

The Get-ADCentralAccessPolicy command differs from the Get-CentralAccessPolicy command I demonstrated in Chapter 7. The former reads all policies from the Active Directory server, whereas the latter shows only the policies configured to be enabled on the local system.

We then use the Get-4DCentralAccessRule command to get each of the policy rules. In this example, there is only one rule. We display its name, the resource condition used to determine when the rule is enabled, and the DACL, which determines the level of access a user will be granted on the resource for which the rule is applied. Refer to Chapters 5 and 7 for more information about the implementation of central access policies.

## Group Policies

On a stand-alone system, the local policy combines information from the LSA policy's configuration with various registry settings that define what applications can do. In a domain network, an administrator can configure a policy for the entire network using group policies . Domain-joined computers download these policies on a regular basis (generally, every 90 minutes by default). Computers then merge these group policies with any existing local policy settings to define the computer's overall policy.

Figure 11-6 shows how a domain network configures group policies.

![Figure](figures/WindowsSecurityInternals_page_414_figure_008.png)

Figure 11-6: The configuration of group policies

384    Chapter 11

---

The root domain and any organizational unit object can contain the gpLink attribute. An organizational unit is a directory container that represents some structure in an organization. For example, an administrator could create different organizational units for different offices, then apply different policies for computers within those organizational units.

The getLink attribute contains a list of the domain names belonging to the group policy objects applied to the organizational unit. The group policy objects themselves don't contain the actual policy settings. Instead, the object contains a @Gfc1e2sysPath attribute that represents a filepath to a policy configuration file, which contains the settings. This filepath typically points to a special network file share, SYSVOL, which contains the configuration files.

What policies to apply depends on where the computer's account object is stored in the directory. For example, in Figure 11 - 6 , the administrator has created the Servers organizational unit, then added the CINNABAR server account to that container. The organizational unit has the gLink attribute, which links to the Servers Group Policy object.

However, the organizational unit also lives in the root domain, which has its own gpl.ink attribute and assigned policy. When the CINNABAR server updates its group policy, it will discover all of these linked group policies in the parent directory hierarchy and use that information to download and apply the policies. The most specific policy takes precedence; for example, for CINNABAR , the Servers Group Policy would override conflicting settings in the Default Group Policy. The server will merge any settings that don't conflict when creating the final policy.

In Listing 11-44, we query for group policy objects on the Active Directory server.

```bash
♦ PS> Get-ADOrganizationalUnit -Filter * -Properties gpLink |
     Format-List Name, LinkedGroupPolicyObjects
     Name                : Domain Controllers
     LinkedGroupPolicyObjects : {CN={6AC1786C-016F-11D2-945F-00C04fB984F9},...}
  ♦ PS> $policy = Get-ADObject -Filter *
     ObjectClass -eq "groupPolicyContainer"
   } -Properties *
  PS> $policy | Format-List displayName, gPCFileSysPath
     displayName   : Default Domain Policy
     gPCFileSysPath : \\mineral.local\sysvol\mineral.local\Policies{31B2F340-...}
     displayName   : Default Domain Controllers Policy
     gPCFileSysPath : \\mineral.local\sysvol\mineral.local\Policies{6AC1786C-...}
     displayName   : Default Servers Domain Policy
     gPCFileSysPath : \\mineral.local\sysvol\mineral.local\Policies{6B10BF70-...}
  ♦ PS> $is $policy[0].gPCFileSysPath
     Directory: \\mineral.local\sysvol\mineral.local\Policies{31B2F340-0160-...}
     Mode                LastWriteTime            Length Name
     ----                 ---------          ---------
     ----                 3/12/2023  12:56 PM              Adm
```

---

```bash
d----     3/12/2023   1:02 PM        MACHINE
  d----     4/6/2023   8:18 PM      USER
  -a----     4/6/2023   8:24 PM       22 GPT.INI
⊙ PS> $dc_policy = $policy | \
  Where-Object DisplayName -eq "Default Domain Controllers Policy"
  PS> $dc_path = $dc_policy.gCkFilePath
  PS> Get-Content "$dc_path\MACHINE\Microsoft\Windows NT\SecEdit\OptTmpl.inf" |
  Select-String "SeEnableDelegationPrivilege", "SeMachineAccountPrivilege"
⊙ SeMachineAccountPrivilege = "S-1-5-11"
  SeEnableDelegationPrivilege = "S-1-5-32-544"
```

Listing 11-44: Finding group policy objects

First, we query for organizational unit objects in the directory using the Get-ADOrganizationalUnit command and request the get-link attribute ❶ . We display the name and the list of group policy objects for each organizational unit.

We could now take the group policy object's distinguished names from the gLink attribute and manually look up each one. Instead, let's simply search for all objects of class groupPolicyContainer using the Get-AObject


PowerShell command . This shows us the name of each policy object, as well as the path to the real policy store on the SYSVOL file server.

We can also list the contents of the policy directory on the file server ❸. Depending on how complex the policy is, the file share might contain many different files. A group policy can apply to a particular machine, as well as on a per-user basis, which is why there are separate MACHINE and USER directories.

We won't discuss the configuration of group policies any further, but I recommend inspecting the files contained in the file share during your security research. Group policies can contain a wealth of information related to the configuration of computers and users in the domain. Sometimes this policy configuration includes shared passwords for user accounts or private key material. Because any user on the network can access the SIVVOL share, an attacker could extract this information to gain additional privileges on the network.

As a minor example of information leakage, you could determine which SIDs would be granted the two special privileges, SetMachineAccountPrivilege and EnableDelegationPrivilege, on a domain controller. The group policy assigned to the domain controller typically stores this privilege assignment information in the GpiTpl.inf file, which any user in the domain can access. (The LSA domain policy remote service discussed in Chapter 10 can also provide this information, but it requires administrator privileges.)

In Listing 11-44, we retrieve the Default Domain Controllers Policy ❶ , the only policy applied in our simple environment. We then extract the privileges from the file using a simple string selection. In this example, we find the default configuration: Authenticated Users is granted SetMachineAccountPrivilege , and BUILTIN Administrators is granted SetEnableDelegation Privilege ❷ .

386    Chapter 11

---

## Worked Example

In this chapter's single worked example, we'll walk through a script that checks a user's access to every object we can find in the local Active Directory server. This process is quite involved, so I've broken it into multiple sections.

### Building the Authorization Context

Throughout this chapter, we've been using the Get-NTGrantedAccess command to run the access check for a security descriptor. This command is fine for testing purposes, but it causes a subtle problem when used to check real-world security descriptors in the Active Directory server.

The command uses the \tAccessCheck system call, which uses a Token object to represent the user's identity. However, the token's group membership is based on the local system's LSA user configuration, and the domain controller is unlikely to use the same groups. For example, many security descriptors in the directory grant full access to the BUILTIN\Administrators group, but these local administrators won't necessarily also be administrators on the domain controller.

We need a way of running an access check using the groups from the domain controller. One option is to run the access check on the domain controller itself. However, that only works if we have full control over the network, which is best avoided. A second option would be to manually create a token with the necessary groups, but this would still require elevated local privileges. Finally, we could use our own implementation of the access check, such as the one we built in Chapter 7, but this risks introducing incorrect behavior.

We do have another option: Windows provides the Auth2 (authorization) API, which has a function called Auth2AccessCheck that we can use to perform an access check based on a constructed authorization context rather than a token. This API runs entirely in user mode, and the authorization context for a user can contain any groups the caller likes. If you don't want to enable auditing, the APIs also work without any elevated privileges.

A big advantage of using the Auth2 API over a custom access check implementation is that it shares code with the kernel's own access check implementation, and therefore, it should be correct. As a bonus, it's also the same API used by the Active Directory server to perform access checks, so its results should match the server's when given the correct authorization context.

We can build an authorization context for a domain user based only on information that we can extract from the domain without administrator privileges. Listing 11-45 shows how to build the authorization context.

```bash
♦ PS> function Add-Member($Set, $MemberOf) {
        foreach($name in $MemberOf) {
            if ($Set.Add($memberOf)
                $Set.Group=ADGROUP $name -Properties MemberOf
                Add-Member $Set $group:MemberOf
```

Active Directory   387

---

```bash
}
        }
    }
@ PS> function Get-UserGroupMembership($User) {
        $groups = [System.Collections.Generic.HashSet[string]]::new{
            [System.StringComparer]::OrdinalIgnoreCase
        }
    @ Add-Member $groups $User.PrimaryGroup
        Add-Member $groups $User.MemberOf
    @ $auth_users = Get-ADObject -Filter {
            ObjectClass -eq "foreignSecurityPrincipal" -and Name -eq "5-1-5-11"
        }-Properties memberOf
        Add-Member $groups $auth_users.MemberOf
    @ $groups | ForEach-Object { Get-DoObjectSid $_ }
        }
@ PS> function Get-AuthContext($username) {
   @ $user = Get-ADUser -Identity $username -Properties memberOf, primaryGroup
  -ErrorAction Continue
      if ($null -eq $user) {
        $user = Get-ADComputer -Identity $username -Properties memberOf,
  primaryGroup
      }
      $sids = Get-UserGroupMembership $user
    @ $rm = New-AuthZResourceManager
    @ $ctx = New-AuthZContext -ResourceManager $rm -Sid $user.SID.Value
    -Flags SkipTokenGroups
    @ Add-AuthZsid $ctx -KnownSid World
        Add-AuthZsid $ctx -KnownSid AuthenticatedUsers
        Add-AuthZsid $ctx -Sid $sids
        $rm.Dispose()
        $ctx
    }
@ PS> $ctx = Get-AuthContext "alice"
@ PS> $ctx.Groups
    Name                        Attributes
    ----                        ---------
    Everyone                       Enabled
  NT AUTHORITY\Authenticated Users        Enabled
  MINERAL\Domain Users            Enabled
  BUILTIN\Users                     Enabled
  BUILTIN\Pre-Windows 2000 Compatible Access  Enabled
```

Listing 11-45: Building an authorization context for the access check

In the directory, user and group objects have a member attribute that lists the distinguished names of the group objects that the user or group is a member of. We can use this list to recursively inspect the directory to find all groups. This is what the Add-Member function is doing.

388    Chapter 11

---

We then define a function to get a list of member SIDs from a user object ❸ . We need to add the root groups, which include the user's primary group ❹ and groups referenced by the memberOf attribute. We also need to add groups from SIDs that are outside the domain. These are stored as foreign security principals. In the example, we find the entry for Authenticated Users , a group that all users are a member of, and add its group memberships ❸ . We now have a list of distinguished names for group objects, which we convert to a list of SIDs that we can add to the authorization context ❹ .

Next, we build the authorization context itself. We start by querying for the user object ❶ , if that fails, we check for a computer object and get the list of SIDs the account is a member of. Then we create an AuthZ resource manager ❷ , which (as its name suggests) is used to manage resources. For example, we can use it to cache access checks between contexts.

We create the authorization context using the New-Author2Context command . We need to specify the SkipTokensGroup flag when creating the context so that only the user's SID gets added to it. Otherwise, the context will contain the list of local groups, which defeats the purpose of gathering the groups on the domain controller.

We then use the Add-Auth251d command to add the group SIDs to the context ❾, making sure to include the default World and Authenticated Users groups. Finally, we test the behavior of the functions for the user alice ❸, printing out the list of domain groups the user is a member of on the domain controller.

## THE REMOTE ACCESS CHECK PROTOCOL

The Auth2 API supports another mechanism for running an access check with the correct group list, but without running code directly on the domain controller. Computers on a domain, including the domain controller, expose a remote access check network protocol that you can connect to when creating the resource manager.

Normal users on the domain won't be able to call the protocol, which requires the calling user to be a member of either the BUILTIN\Administrators or BUILTIN\Access Control Assistance Operators group on the domain controller, making it somewhat less useful. However, you might be a member of one of these groups without even realizing it, so it's worth trying to connect to the service and perform an access check. The following commands create an authorization context with a connection to the PRIMARYDC domain controller:

```bash
PS> $m = New-Auth2ResourceManager -Server PRIMARYDC.mineral.local
PS> $ctx = New-AuthContext -ResourceManager $m -Sid (Get-NtSid)
PS> $ctx.User
------ Attributes
------ --------------------
    MINERAL\alice None
```

(continued)

Active Directory   389

---

```bash
~~~~~~~~~~~~~~~~~~~~~~~~~
  P5> $ctx.Groups
     Name                     Attributes
     ----                          -----------------
     MINERAL\Domain Users         Mandatory, EnabledByDefault, Enabled
     Everyone                   Mandatory, EnabledByDefault, Enabled
     BUILTIN\Access Control Assistance... Mandatory, EnabledByDefault, Enabled
     ----$nlp--
```

These commands could replace the entirety of Listing 11-45. To use the remote access check protocol, we specify the DNS name of the domain controller using the Server parameter of the New-Auth2ResourceManager command. We then create the Auth2 context with the SID of the user. We don't need to specify any flags, as the service will base the group list on the server running the remote access check protocol (in this case, the domain controller). We can verify the assigned user and groups to confirm that their values are based on the domain controller's local group assignment.

## Gathering Object Information

With the authorization context in hand, we can begin the access check.


We'll use the Get-Auth2GrantedAccess command, which works almost the same as Get-NetGrantedAccess but relies on the context we've created. We'll start by gathering information about the object we want to check. We need the following details:

- • The security descriptor of the object
• The object SID, if present, for the principal SID
• All schema classes, including auxiliary and child classes
• Allowed schema attributes and associated property sets
• Applicable control and write-validated access rights
Listing 11-46 implements the Get-ObjectInformation function, which gathers this information about an object based on its distinguished name.

```bash
PS> function Get-ObjectInformation($Name) {
    $schema_class = Get-DsObjectSchemaClass $Name
    $sid = Get-DsObjectSid $Name
    $all_classes = Get-DsSchemaClass $schema_class.Name -Recurse
    -IncludeAuxiliary
    $attrs = $all_classes.Attributes | Get-DsSchemaAttribute |
Sort Name -Unique
    $infs = Get-DsSchemaClass $schema_class.Name -Inferior
    $rights = $all_classes | ForEach-Object {Get-DsExtendedRight
-SchemaClass $_} |
Sort Name -Unique
    [PCustomObject]0{
        Name=$Name
        SecurityDescriptor=Get-Win32SecurityDescriptor -Name $Name -Type Ds
```

---

```bash
SchemaClass=Get-DsObjectSchemaClass $Name
        Principal=$Sid
        Attributes=$Attrs
        Inferiors=$Infs
        PropertySets=$Rights | Where-Object IsPropertySet
        ControlRight=$Rights | Where-Object IsControl
        ValidatedWrite=$Rights | Where-Object IsValidatedWritet
    }
    }
```

Listing 11-46: Implementing the Get-ObjectInformation function

We can test the function by passing it the distinguished name of the object for which we want the information, as shown in Listing 11-47.

```bash
PS> $dn_root = (Get-ADRootDSE).defaultNamingContext
PS> Get-ObjectInformation $dn_root
Name:        DC=mineral_DC=local
SchemaClass :    domainDNS
Principal      : $-1-5-21-146569114-2614008856-3334332795
Attributes      : {admiDescription, admiDisplayName...}
Inferiors       : {device, samServer, ipNetwork, organizationalUnit...}
PropertySets      : {Domain=Other-Parameters, Domain=Password}
ControlRight      : {Add-GUID, Change-PDC, Create-Inbound-Forest-Trust...}
ValidatedWrite
SecurityDescriptor : O:BAG:BAD:AI(OA;CIO;RP;4c164200-2000-11d0-...
```

Listing 11-47: Gathering object information

In this example, we request the information for the root domain object.


You could cache most of the returned information about the schema class, as only the security descriptor and object SID typically change between objects. However, for simplicity, we'll gather the information for every request.

## Running the Access Check

We now have everything we need to perform a maximum access check for an object. However, it's not as simple as passing the security descriptor and the authorization context to the Auth2 access check API and calling it a day. We must separately handle each type of resource (such as classes, attributes, control access rights, and write-validated access rights) to make sure we capture the maximum allowed access.

Listing 11-48 contains the functions to run the access check process. For simplicity, we'll focus on capturing access rights that could result in a modification of the object. However, you could easily modify the functions to capture read access, as well.

```bash
# PS> function Test-Access($ctx, $obj, $objectTree, $access) {
        Get-AuthorizedAccess -Context $ctx -ObjectType $objectTree -
            -SecurityDescriptor $obj.SecurityDescriptor -Principal $obj.Principal -
            -Access $access | Where-Object IsSuccess
```

---

```bash
PS> function Get-PropertyObjectTree($Obj) {
    $obj_tree = New-ObjectTypeTree $Obj.SchemaClass
  @ foreach($prop_set in $Obj.PropertiesSet) {
        Add-ObjectTypeTree $obj_tree $prop_set
    }
  }$fake_set = Add-ObjectTypeTree $obj_tree -PassThru
-ObjectType "771727b1-31b8-4cdf-ae62-4f69fadf89e"
    foreach($attr in $Obj.Attributes) {
        if (-not $attr.IsPropertySet) {
            Add-ObjectTypeTree $fake_set $attr
    }
    }$obj_tree
}
PS> function Get-AccessCheckResult($ctx, $Name) {
  try {
    $obj = Get-ObjectInformation $Name
    $access = Test-Access $ctx $Obj .$Obj.SchemaClass "MaximumAllowed" |
      Select-Object -ExpandProperty SpecificGrantedAccess
    @ $obj_tree = Get-PropertyObjectTree $Obj
     $write_attr = Test-Access $ctx $Obj .$Obj_tree "WriteProp" |
      $write_sets = $write_attr | Where-Object Level -eq 1 |
Select-Object -ExpandProperty Name
     $write_attr = $write_attr | Where-Object Level -eq 2 |
Select-Object -ExpandProperty Name
    @ $obj_tree = New-ObjectTypeTree
-ObjectType "771727b1-31b8-4cdf-ae62-4f69fadf89e"
    $Obj.Inferors | Add-ObjectTypeTree -Tree $Obj_tree
      $create_child = Test-Access $ctx $Obj $obj_tree "CreateChild" |
Where-Object Level -eq 1 | Select-Object -ExpandProperty Name
      $delete_child = Test-Access $ctx $Obj $obj_tree "DeleteChild" |
Where-Object Level -eq 1 | Select-Object -ExpandProperty Name
    @ $control = if ($Obj.ControlRight.Count -gt 0) {
        $obj_tree = New-ObjectTypeTree -SchemaObject $Obj .$SchemaClass
        $obj.ControlRight | Add-ObjectTypeTree $Obj.tree
        Test-Access $ctx $Obj $Obj_tree "ControlAccess" |
Where-Object Level -eq 1 | Select-Object -ExpandProperty Name
    }
    @ $write_valid = if ($Obj.ValidatedWrite.Count -gt 0) {
        $obj_tree = New-ObjectTypeTree -SchemaObject $Obj .$SchemaClass
        $obj.ValidatedWrite | Add-ObjectTypeTree $Obj.tree
        Test-Access $ctx $Obj $obj_tree "Self" |
Where-Object Level -eq 1 | Select-Object -ExpandProperty Name
    }
    @ [PSCustomObject]@{
        Name=$Obj.Name
```

---

```bash
Access=success
        WriteAttributes=$write_attr
        WritePropertySets=$write_sets
        CreateChild#$create_child
        DeleteChild=$delete_child
        Control=$control
        WriteValidated=$write_valid
    }  catch {
        Write-Error "Error testing $Name - $."
    }
    }
```

Listing 11-48: Running the object access check

We start by defining a few helper functions. The first, Test-Access, runs the access check based on the authorization context, the security descriptor, the object type tree, and a desired access mask . The access check returns a list of results for each checked object type. We're interested only in the ones that succeeded, granting some access.

The next helper, SetPropertyObjectTree, builds the object type tree used for checking property sets and attributes. The root of the tree is the object's schema class identifier. From there, we first populate all available property sets . We then add all remaining attributes that aren't already in a property set by placing them into a separate dummy set .

We can now move on to the multiple access check functions. First we get the information for an object based on its distinguished name . We then get the maximum granted access for the object, with only the object schema class identifier as the object type. This gives us an idea of the basic rights the user will be granted, such as the ability to delete the object or modify its security descriptor.

Next, we build the tree for the property sets and attributes ❸ and run the access check using the Test-Access function. We're interested only in results that grant WriteProp access (most objects let any user read their attributes, so this information is less interesting). We split the access check results into writable property sets and writable individual attributes.

We now focus on the child classes by building the object type tree from the schema class identifier . Even though the directory server would check a single class at a time, we'll perform all the checks in one go. We run two access checks, one for CreateChild access and one for DeleteChild access.

One thing to note is that we use the dummy identifier as the root object type. If we instead used the schema class identifier for the object, the access granted to that class would propagate to all the children, potentially giving us the wrong result. Using an identifier that isn't a real schema class should enable us to avoid this outcome.

We run a similar access check for control access rights ❷ and writevalidated access rights ❸, requesting ControlAccess and Self, respectively. Finally, we package all the results into a custom object to return to the caller ❹.

Active Directory   393

---

Listing 11-49 demonstrates calling the Get-AccessCheckResult function for an Active Directory object.

```bash
PS> $dn = "C=N-GRAPHITE,CN=Computers,DC=mineral,DC=local"
PS> $ctx = Get-AuthContext 'alice' @
PS> Get-AccessCheckResult $ctx $dn @
Name
: C=N-GRAPHITE,CN=Computers,DC=mineral,DC=local
Access
: List, ReadProp, ListObject, ControlAccess, ReadControl
WriteAttributes
: {displayName, sAMAccountName, description, accountExpires...}
WritePropertySets : {User-Account-Restrictions, User-Logon}
CreateChild
:
DeleteChild
Control
: {Allowed-To-Authenticate, Receive-As, Send-As,...}
WriteValidated
: Validated-SPN
PS> $ctx = Get-AuthContext $dn
PS> Get-AccessCheckResult $ctx $dn @
Name
: C=N-GRAPHITE,CN=Computers,DC=mineral,DC=local
Access
: CreateChild, DeleteChild, List, ReadProp, ListObject,...
WriteAttributes
: {StreetAddress, homePostalAddress, assistant, info...}
WritePropertySets : {Personal-Information, Private-Information}
CreateChild
: {msFVE-RecoveryInformation, ms-net-ieee-80211...}
DeleteChild
: {msFVE-RecoveryInformation, ms-net-ieee-80211...}
Control
: User-Change-Password
WriteValidated
: {DS-Validated-Write-Computer, Validated-SPN}
```

Listing 11-49: Testing the Get-AccessCheckResult function

In this example I've used the GRAPHITE computer object, but you can change this distinguished name to that of any object you want to check in the directory. We first need to get the authentication context for the user (here, $alice$ ) ❶ . This user created the GRAPHITE object and therefore has some special access other users don't have.

Next, we run the access check and display the results to the console 2 . You can see in the Access property that ControlAccess has been granted generally. This means that Alice can use any control access right unless it is explicitly denied through an ACE (a Denied ACE also applies whenever a user or computer is marked as "User cannot change password," blocking the User-Change-Password control access right).

We can see that the user has some writable attributes and property sets but can't create or delete any child objects. We additionally see the list of granted control and write-validated access rights. The control access rights are granted based on the top-level granted access, but the Validated-SPN access right must have been granted explicitly.

Next, we repeat the check using the computer account ❸ . If you compare the output with that for alice , you'll notice several differences. First, the attributes and property sets that the user can write to have changed. More importantly, the computer account can create and delete any child object. The computer account also has fewer control access rights, but more write-validated access rights.

---

You can enumerate all objects in the local Active Directory server using the Get-ADObject command, then pass each distinguished name to the Get-AccessCheckResult function to enumerate writable access across the entire directory.

This concludes our worked example. Hopefully, it has given you a better understanding of the nuts and bolts of the Active Directory server access check process. If you'd like to explore an existing implementation of the access check, the NObjectManager module provides the Get-AccessibleObject command, which checks for read access in addition to write access and caches domain information to improve performance. You can use it to run a full recursive scan of the Active Directory server for the current user with the command shown in Listing 11-50.

```bash
PS> Get-AccessibleObject -NamingContext Default -Recurse
-------    ObjectClass  UserName   Modifiable  Controllable
------    ----------------- -----------------
domain       domainDNS    MINERAL\alice False      True
Builtin      builtinDomain MINERAL\alice False      False
Computers   container    MINERAL\alice False      False
--snip--
```

Listing 11-50: Performing an access check

The tabular output indicates whether the user can modify each type of object, such as by changing its attributes or creating a child object, and whether any control access rights have been granted to the user for that object.

## Wrapping Up

We began this long chapter with a high-level overview of the information stored in Active Directory, such as the users and groups that are part of the domain, and we inspected the directory's configuration from PowerShell using the Remote Server Administration Tools.

We then dig into the Active Directory server at a lower level, starting with its schema, which defines the structure of the directory. The Active Directory server consists of hierarchical objects that can contain named values called attributes. Each object and attribute has a schema representation that defines what it can contain.

Next, we discussed how the Active Directory server secures objects through a mandatory security descriptor attribute. We looked at examples of querying the security descriptors of existing objects, as well as how to create security descriptors for new objects. We also saw how to assign security descriptors to existing objects.

Once we understood how an object's security descriptor is configured, we explored how the directory server determines what access a user has to an object and its attributes. This access check process uses unique identifiers taken from the schema representation to build object type trees. These

Active Directory  395

---

make the access check granular; able to grant a user access to only a specific attribute without requiring thousands of hardcoded checks.

The Active Directory configuration also contains two special types of access rights: control access rights and write-validated access writes. These allow users to perform special operations on an object, such as changing a user's password; they also prevent a user from modifying certain attribute values without confirmation from the server.

The access check process contains a few exceptions too. For example, a user can be granted the SeMachineAccountPrivilege privilege, which allows them to create computer objects even if no directory object grants them the necessary permission. This allows users to join their computer to a domain without needing an administrator account. However, the directory server limits what the user can do with the new computer account, to mitigate the risk of compromise.

Lastly, we went through a very quick overview of how a domain configures group policies through links to external network filesystems. We noted that this design could leak information about the configuration of users on a domain controller to users without administrative access.

We'll return to the topic of Active Directory when we discuss Kerberos authentication in Chapter 14. Keep in mind that real-world deployments of Windows domains can be extremely complex, with many more security nuances than covered here. If you'd like to know more about how Active Directory functions and the many security edge cases it presents, consult Microsoft's technical specification for Active Directory (MS-ADTS).

In the next chapter, we're going to delve into how interactive authentication is implemented on Windows. This authentication allows you to log in to a desktop and use the computer's user interface.

---

