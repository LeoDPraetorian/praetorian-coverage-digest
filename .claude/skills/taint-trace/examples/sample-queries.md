# Sample Queries for Taint Trace Skill

## Basic Usage

### Trace Network Input
```
/taint-trace "Trace TCP input in /path/to/server.exe"
```
Finds recv/recvfrom/accept calls and traces to dangerous sinks.

### Trace File Input
```
/taint-trace "Trace file input in /path/to/parser"
```
Finds fopen/fread/mmap calls and traces to dangerous sinks.

### Trace Command-Line Arguments
```
/taint-trace "Where does argv[1] go in ./target"
```
Traces main's argv parameter through the program.

### Trace All Inputs
```
/taint-trace "Trace all inputs in malware.exe"
```
Comprehensive analysis: network, file, argv, stdin, environment.

## Custom Sink Queries

### Flag Crypto Operations
```
/taint-trace "Trace all inputs in app.exe and flag crypto functions"
```
Standard analysis + highlight paths to OpenSSL/CryptoAPI.

### Focus on Specific Sink
```
/taint-trace "Trace file input to strcpy in parser.elf"
```
Only report paths that reach strcpy function.

### Custom Sink Pattern
```
/taint-trace "Trace network input in server and flag OpenSSL functions"
```
Custom sink category for specialized analysis.

## Follow-Up Queries (After Initial Analysis)

### Drill Down on Specific Path
```
"Show full chain for path 2"
```
Expands summary to show complete call chain with transformations.

### View Decompiled Code
```
"Show decompiled code at processPacket"
```
Calls pyghidra to decompile specific function.

### Re-Query with New Sinks
```
"Are there paths to OpenSSL functions?"
```
Re-analyze cached taint graph with different sink pattern.

### List All Paths
```
"Show all paths"
```
Display complete list of discovered taint paths.

## Error Recovery Examples

When decompilation fails:
```
A) Use disassembly instead (less precise)
B) Skip this function
C) Abort analysis
```

When analysis times out:
```
A) Continue with partial results
B) Increase timeout and retry
C) Skip this source function
```
