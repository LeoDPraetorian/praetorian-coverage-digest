# Profiling Methodology

Systematic approach to identifying and resolving scanner bottlenecks.

## Step 1: Baseline Measurement

```bash
# CPU profiling
go test -cpuprofile=cpu.prof -bench=BenchmarkScan

# Memory profiling
go test -memprofile=mem.prof -bench=BenchmarkScan

# Block profiling (channel contention)
go test -blockprofile=block.prof -bench=BenchmarkScan
```

## Step 2: Analyze Profiles

```bash
# Interactive web UI
go tool pprof -http=:8080 cpu.prof

# Top functions
go tool pprof -top cpu.prof

# Flame graph
go tool pprof -flame cpu.prof
```

## Step 3: Identify Bottleneck Type

| Profile Shows         | Bottleneck Type | Optimization              |
| --------------------- | --------------- | ------------------------- |
| regex.Match dominates | CPU (matching)  | Aho-Corasick              |
| http.Do dominates     | Network         | Clustering, deduplication |
| runtime.chanrecv      | Channel block   | Increase buffer size      |
| sync.Mutex.Lock       | Lock contention | Reduce shared state       |

## Step 4: Apply Targeted Fix

Don't optimize everything - fix the specific bottleneck identified.

## Step 5: Re-Profile

Validate improvement, check for new bottlenecks.

**Content to be expanded with real pprof examples.**
