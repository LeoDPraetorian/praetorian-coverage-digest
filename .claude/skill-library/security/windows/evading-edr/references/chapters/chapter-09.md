## 9 scanners

![Figure](figures/EvadingEDR_page_197_figure_001.png)

Nearly every EDR solution includes a component that accepts data and tries to determine whether the content is malicious.

Endpoint agents use it to assess many different

data types, such as files and memory streams, based on a set of rules that the vendor defines and updates. This component, which we'll refer to as the scanner for simplicity’s sake, is one of the oldest and best-studied areas in security from both the defensive and offensive angles.

Because covering all aspects of their implementation, processing logic, and signatures would be like trying to boil the ocean, this chapter focuses on the rules employed by file-based scanners. Scanner rules differentiate one product's scanner from another (barring major performance differences or other technical capabilities). And on the offensive side, it's the scanner rules rather than the implementation of the scanner itself that adversaries must evade.

---

## A Brief History of Antivirus Scanning

We don't know who invented the antivirus scanning engine. German security researcher Bernd Fix developed some of the first antivirus software, in 1987, to neutralize the Vienna virus, but it wasn't until 1991 that the world saw an antivirus scanning engine that resembles the ones in use today: FRISK Software's F-PROT antivirus would scan a binary to detect any reordering of its sections, a pattern that malware developers of the time commonly employed to jump execution to the end of the file, where they had placed malicious code.

As viruses became more prevalent, dedicated antivirus agents became a requirement for many companies. To meet this demand, vendors such as Symantec, McAfee, Kaspersky, and F-Secure brought their scanners to market in the 1990s. Regulatory bodies began enforcing the use of antivirus to protect systems, further promoting their adoption. By the 2010s, it was nearly impossible to find an enterprise environment without antivirus software deployed on most of its endpoints.

This broad adoption lilled many directors of information-security programs into a false sense of security. While these antimalware scanners had some success in detecting commodity threats, they missed more advanced threat groups, which were achieving their objectives without detection.

In May 2013, Will Schroeder, Chris Truncer, and Mike Wright released their tool, Veil, which opened many people's eyes to this overreliance on antivirus scanners. Veil's entire purpose was to create payloads that bypassed antivirus by employing techniques that broke legacy detection rulesets. These techniques included string- and variable-name obfuscation, less common code-injection methods, and payload encryption. During offensive security engagements, they proved that their tool could effectively evade detection, causing many companies to reevaluate the value of the antivirus scanners they paid for. Simultaneously, antivirus vendors began rethinking how to approach the problem of detection.

While it's hard to quantify the impact of Veil and other tools aimed at tackling the same problem, these tools undoubtedly moved the needle, leading to the creation of more robust endpoint detection solutions. These newer solutions still make use of scanners, which contribute to the overall detection strategies, but they have grown to include other sensors that can provide coverage when the scanners' rulesets fail to detect malware.

## Scanning Models

Scanners are software applications that the system should invoke when appropriate. Developers must choose between two models to determine when their scanner will run. This decision is more complex and important than it may seem at face value.

172    Chapter 9

---

## On Demand

The first model, on-demand scanning , instructs a scanner to run at some set time or when explicitly requested to do so. This type of scanning typically interacts with a large number of targets (for example, files and folders) on each execution. The Quick Scan feature in Microsoft Defender, shown in Figure 9 - 1 , may be the most familiar example of this model.

![Figure](figures/EvadingEDR_page_199_figure_002.png)

Figure 9-1: Defender's Quick Scan feature in action

When implementing this model, developers must consider the potential performance impacts on the system caused by the scanner processing thousands of files at once. On resource-constrained systems, it might be best to run this type of scan during off-hours (for example, 2 am every Tuesday) than to run a full scan during working hours.

The other major downside of this model involves the period of time between each scan. Hypothetically, an attacker could drop malware on the system after the first scan, execute it, and remove it before the next scan, to evade detection.

## On Access

During on-access scanning, often referred to as real-time protection, the scanner assesses an individual target while some code is interacting with it or when a suspicious activity occurs and warrants investigation. You'll most often find this model paired with another component that can receive notifications when something interacts with the target object, such as a filesystem minifilter driver. For example, the scanner might investigate a file when it is downloaded, opened, or deleted. Microsoft Defender implements this model on all Windows systems, as shown in Figure 9-2.

![Figure](figures/EvadingEDR_page_199_figure_008.png)

Figure 9-2: Defender's real-time protection features enabled by default

Scanners 173

---

The on-access scanning approach generally causes more of a headache for adversaries because it removes the ability to abuse the periods of time between on-demand scans. Instead, attackers are left trying to evade the ruleset used by the scanner. Let's now consider how these rulesets work.

## Rulesets

At the heart of every scanner is a set of rules that the engine uses to assess the content to be scanned. These rules more closely resemble dictionary entries than firewall rules; each rule contains a definition in the form of a list of attributes that, if identified, signals that the content should be treated as malicious. If the scanner detects a match for a rule, it will take some predetermined action, such as quarantining the file, killing the process, or alerting the user.

When designing scanner rules, developers hope to capture a unique attribute of a piece of malware. These features can be specific, like the names or cryptographic hashes of files, or they can be broader, such as DLLs or functions that the malware imports or a series of opcodes that serve some critical function.

Developers might base these rules on known malware samples detected outside the scanner. Sometimes other groups even share information about the sample with a vendor. The rules can also target malware families or techniques more generally, such as a known group of APIs used by ransomware, or strings like bcdedit.exe, which might indicate that malware is trying to modify the system.

Vendors can implement both types of rules in whatever ratio makes sense for their product. Generally, vendors that heavily rely on rules specific to known malware samples will generate fewer false positives, while those that make use of less-specific indicators will encounter fewer false negatives. Because rulesets are made up of hundreds or thousands of rules, vendors can balance the ratio of specific to less-specific detections to meet the false-positive and false-negative tolerances of their customers.

Vendors each develop and implement their own rulesets, but products tend to have a lot of overlap. This is beneficial to consumers, as the overlap ensures that no single scanner dominates the marketplace based on its ability to detect the "threat du jour." To illustrate this, take a look at the results of a query in VirusTotal (an online service used to investigate suspicious files, IPs, domain names, and URLs). Figure 9-3 shows a phishing lure associated with FIN7, a financially motivated threat group, detected by 33 security vendors, demonstrating the overlap of these rulesets.

There have been many attempts to standardize scanner rule formats to facilitate the sharing of rules between vendors and the security community. At the time of this writing, the YARA rule format is the most widely adopted, and you'll see it used in open source, community-driven detection efforts as well as by EDR vendors.

174    Chapter 9

---

![Figure](figures/EvadingEDR_page_201_figure_000.png)

Figure 9-3: VirusTotal scan results for a file associated with FIN7.

## Case Study: YARA

Originally developed by Victor Alvarez of VirusTotal, the YARA format helps researchers identify malware samples by using textual and binary patterns to detect malicious files. The project provides both a stand-alone executable scanner and a C programming language API that developers can integrate into external projects. This section explores YARA, as it provides a great example of what a scanner and its rulesets look like, has fantastic documentation, and is widely used.

### Understanding YARA Rules

YARA rules use a simple format: they begin with metadata about the rule, followed by a set of strings describing the conditions to be checked and a Boolean expression that describes the rule logic. Consider the example in Listing 9-1.

```bash
rule SafetyKatz_PE
{
  ⓒ meta:
      description = "Detects the default .NET TypeLibGuid for SafetyKatz"
      reference = "https://github.com/GhostPack/SafetyKatz"
      author = "Matt Hand"
  ⓒ strings:
      $guid = "8347e81b-89fc-42a9-b22c-f59a6a572dec" ascii nocase wide
      condition:
        (uint16(0) == 0x5A4D and uint32(uint32(0x3C)) == 0x00004550) and $guid
    }
Listing 9-1: A YARA rule for detecting the public version of SafetyKatz
                                                                                          Scanners     175
```

---

This simple rule, called SafeKeys_PE, follows a format commonly used to detect off-the-shelf .NET tooling. It begins with some metadata containing a brief description of the rule, a reference to the tool it aims to detect, and, optionally, the date on which it was created . This metadata has no bearing on the scanner's behavior, but it does provide some useful context about the rule's origins and behavior.

Next is the strings section. While optional, it houses useful strings found inside the malware that the rule's logic can reference. Each string has an identifier, beginning with a $, and a function, like in a variable declaration. YARA supports three different types of strings: plaintext, hexadecimal, and regular expressions.

Plaintext strings are the most straightforward, as they have the least variation, and YARA's support of modifiers makes them especially powerful. These modifiers appear after the contents of the string. In Listing 9-1, the string is paired with the modifiers ascii_nocase_wide , which means that the string should be checked without sensitivity to case in both ASCII and wide formats (the wide format uses two bytes per character). Additional modifiers, including xor, base64, base64ide, and fullord, exist to provide even more flexibility when defining a string to be processed. Our example rule uses only one plaintext string, the GUID for TypeLib, an artifact created by default in Visual Studio when a new project is begun.

Hexadecimal strings are useful when you're searching for non-printable characters, such as a series of opcodes. They're defined as space-delimited bytes enclosed in curly brackets (for example, $foo = { BE EF } ). Like plaintext strings, hexadecimal strings support modifiers that extend their functionality. These include wildcards, jumps, and alternatives. Wildcards are really just placeholders that say "match anything here" and are denoted with a question mark. For example, the string { BE ?? } would match anything from { BE 00 } to { BE FF } appearing in a file. Wildcards are also nibble-wise , meaning that the rule author can use a wildcard for either nibble of the byte, leaving the other one defined, which allows the author to scope their search even further. For example, the string { BE EF } would match anything from { BE EO } to { BE EF .

In some situations, the content of a string can vary, and the rule author might not know the length of these variable chunks. In that case, they can use a jump. jumps are formatted as two numbers delimited with a hyphen and enclosed in square brackets. They effectively mean "the values starting here and ranging from X to Y bytes in length are variable." For example, the hexadecimal string $foo = { 0E [1-3] 0F } would match any of the following:

```bash
BE EE EF
    BE OO B1 EF
    BE EF OO B2 EF
```

Another modifier supported by hexadecimal strings is alternatives . Rule authors use these when working with a portion of a hex string that has multiple possible values. The authors delimit these values with pipes and store

---

them in parentheses. There is no limit to the number or size of alternatives in a string. Additionally, alternatives can include wildcards to expand their utility. The string $foo = { BE ( EE | EF BE | ?? OO ) EF } would match any of the following:

```bash
BB EE EF
BE EE BF
BE EE OO
BE A1 OO BF
```

The final and only mandatory section of a YARA rule is called the condition. Conditions are Boolean expressions that support Boolean operators (for example, AND), relational operators (for example, !=), and the arithmetic and bitwise operators (for example, + and %) for numerical expressions.

Conditions can work with strings defined in the rule while scanning the file. For example, the SafetyKatz rule makes sure that the TypeLib GUID is present in the file. But conditions can also work without the use of strings. The first two conditions in the SafetyKatz rule check for the two-byte value 0x405A (the MZ header of a Windows executable) at the start of the file and the four-byte value 0x00004550 (the PE signature) at offset 0x3C. Conditions can also operate using special reserved variables. For example, here is a condition that uses the filesystem special variable: filesystem <30KB. It will return true if the total file size is less than 30KB.

Conditions can support more complex logic with additional operators. One example is the of operator. Consider the example shown in Listing 9-2.

```bash
rule Example
{
  strings:
        $x = "Hello"
        $y = "world"
    condition:
        any of them
}
```

Listing 9-2: Using YARA's of operator

This rule returns true if either the "hello" string or the "world" string is found in the file being scanned. Other operators exist, such as all of , for when all strings must be present; N of , for when some subset of the strings must be present; and the for...of iterator, to express that only some occurrences of the string should satisfy the rule's conditions.

## Reverse Engineering Rules

In production environments, you'll commonly find hundreds or even thousands of rules analyzing files correlating to malware signatures. There are over 200,000 signatures in Defender alone, as shown in Listing 9-3.

Scanners 177

---

```bash
PS > $$signatures = {Get-MpThreatCatalog}.ThreatName
PS > $$signatures | Measure-Object -Line | select Lines
Lines
-----
222975
PS > $$signatures | Group {$_.Split(':')[0]} |
>> Sort Count -Descending |
>> select Count,Name -First 10
Count Name
----- -----
57265 Trojan
28101 TrojanDownloader
27546 Virus
19720 Backdoor
17323 Worm
11768 Behavior
9903 VirTool
9448 PWS
8611 Exploit
8252 TrojanSpy
```

Listing 9-3: Enumerating signatures in Defender

The first command extracts the threat names, a way of identifying specific or closely related pieces of malware (for example, VirTool:MSIL/ BytChk.CMTB), from Defender's signature catalog. The second command then parses each threat name for its top-level category (for example, VirTool) and returns a count of all signatures belonging to the top levels.

To the user, however, most of these rules are opaque. Often, the only way to figure out what causes one sample to be flagged as malicious and another to be deemed benign is manual testing. The DefenderCheck tool helps automate this process. Figure 9-4 shows a contrived example of how this tool works under the hood.

178      Chaptor 9

---

![Figure](figures/EvadingEDR_page_205_figure_000.png)

Figure 9-4: DefenderCheck's binary search

DefenderCheck splits a file in half, then scans each half to determine which one holds the content that the scanner deemed malicious. It recursively repeats this process on every malicious half until it has identified the specific byte at the center of the rule, forming a simple binary search tree.

## Evading Scanner Signatures

When trying to evade detection by a file-based scanner such as YARA, attackers typically attempt to generate false negatives. In short, if they can figure out what rules the scanner is employing to detect some relevant file (or at least make a satisfactory guess at this), they can potentially modify that attribute to evade the rule. The more brittle the rule, the easier it is to evade. In Listing 9-4 , we use dnSpy, a tool for decompiling and modifying .NET assemblies, to change the GUID in the compiled SafetyKatz assembly so that it evades the brittle YARA rule shown earlier in this chapter.

```bash
using System;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security;
using System.Security.Permissions;
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: CompilationRelaxations(8)]
[assembly: RuntimeCompatibility(WrapNonExceptionThrows = true)]
```

Scanners 179

---

```bash
[assembly: Debuggable(DebkgableAttribute.DebuggingModes.IgnoreSymbolStoreSequencePoints)]
[assembly: AssemblyTitle("SafetyKatz")]
[assembly: AssemblyDescription("")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("")]
[assembly: AssemblyProduct("SafetyKatz")]
[assembly: AssemblyCopyright("Copyright © 2018")]
[assembly: AssemblyTrademark("")]
[assembly: CwmVisible(false)]
[assembly: Guid("01234567-d3ad-b33f-0000-0123456789ac")] ●
[assembly: AssemblyFileVersion("1.0.0.0")]
[assembly: SecurityPermission(SecurityAction.RequestMinimum, SkipVerification = true)]
[assembly: UnverifiableCode]
```

Listing 9-4: Modifying the GUID in the assembly using dnSpy

If a detection is built solely around the presence of SafetyKat's default assembly GUID, the change made to the GUID here would evade the rule entirely.

This simple evasion highlights the importance of building detections based on a sample's immutable attributes (or at least those that are more difficult to modify) to compensate for the more brittle rules. This is not to discount the value of these brittle rules, which could detect off-the-shelf Mimikatz, a tool very rarely used for legitimate purposes. However, adding a more robust companion (one whose false-positive rate is higher and false-negative rate is lower) fortifies the scanner's ability to detect samples that have been modified to evade the existing rules. Listing 9-5 shows an example of this using SafetyKatz.

```bash
rule SafetyKatz_InternalFuncs_B64MimiKatz
{
    meta:
        description = "Detects the public version of the SafetyKatz
                          tool based on core P/Invokes and its embedded
                          base64-encoded copy of MimiKatz"
        reference = "https://github.com/GhostPack/SafetyKatz"
        author = "Matt Hand"
    strings:
        $mdwd = "MiniDumpWriteDump" ascii nocase wide
        $ll = "LoadLibrary" ascii nocase wide
        $gpa = "GetProcAddress" ascii nocase wide
        $b64_mimi = "z1i7fBNVrjg8avJlOwUCNF1iapC0XUE" ascii wide
        condition:
          ($mdwd and $ll and $gpa) or $b64_mimi
    }
```

Listing 9-5: YARA rule to detect SafetyKatz based on internal function names and Base64 substrings

You could pass this rule to YARA via the command line to scan the base version of SafetyKatz, as is shown in Listing 9-6.

---

```bash
PS > \yaara64.exe -w -s \safetykatz.rules C:\Temp\SafetyKatz.exe
> \safetyKatzSystemFuncs_B64MimikaKatz C:\Temp\SafetyKatz.exe
0x213b:8mdwd: 0x MiniDumpWriteDump
0x256a:8111: loadLibrary
0x2459:8gpa: GetProAddress
0x25dc:8b0mi: 0
x7x001x001x007x00F\0x08\0x001x0007x0047x00j\x00g\x008\x00aa1x00V\x00J\x00I\x00O
0x0007x0001x00c\x0007x000f\0x00c\x0007x0001\x00a1\x00a1\x00p\x0007x0001x00U\x00E\x00E
```

Listing 9-6: Detecting SafetyKatz using the new YARA rule

In the YARA output, we can see that the scanner detected both the suspicious functions ❶ and Base64 substring ❷ .

But even this rule isn't a silver bullet against evasion. An attacker could further modify the attributes from which we've built the detection, such as by moving from P/Invoke, the native way of calling unmanaged code from .NET, to D/Invoke, an alternative to P/Invoke that performs the same function, avoiding the suspicious P/Invoke that an EDR may be monitoring for. They could also use syscall delegates or modify the embedded copy of Mimikatz such that the first 32 bytes of its encoded representation differ from that in the rule.

There is one other way to avoid detection by scanners. In modern red teaming, most adversaries avoid touching disk (writing files to the filesystemtem). If they can operate entirely in memory, file-based scanners no longer pose a concern. For example, consider the /ticket:base$ command line option in Rubeus, a tool for interacting with Kerberos. By using this flag, attackers can prevent a Kerberos ticket from being written to the target's filesystem and instead have it returned through console output.

In some situations, attackers can't avoid writing files to disk, such as in the case of SafetyKat's use of dbghelp\MinIDumpFileDump(), which requires the memory dump to be written to a file. In these situations, it's important for attackers to limit the exposure of their files. This most commonly means immediately retrieving a copy of the files and removing them from the target, obscuring filenames and paths, or protecting the content of the file in some way.

While potentially less sophisticated than other sensors, scanners play an important part in detecting malicious content on the host. This chapter covers only file-based scanners, but commercial projects frequently employ other types, including network-based and memory scanners. At an enterprise scale, scanners can also offer interesting metrics, such as whether a file is globally unique. They present a particular challenge for adversaries and serve as a great representation of evasion in general. You can think of them as black boxes through which adversary tooling passes; the adversary's job is to modify the attributes within their control, namely the elements of their malware, to make it to the other end.

Scanners 18

---

## Conclusion

Scanners, especially those related to antivirus engines, are one of the first defensive technologies many of us encounter. Though they fell out of favor due to the brittleness of their rulesets, they have recently regained popularity as a supplemental feature, employing (at times) more robust rules than other sensors such as minifiers and image-load callback routines. Still, evading scanners is an exercise in obfuscation rather than avoidance. By changing indicators, even simple things like static strings, an adversary can usually fly under the radar of most modern scanning engines.

---

