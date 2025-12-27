# Performance Benchmarking Checklist

## Rate Limit Testing

- [ ] Test at 80% of rate limit
- [ ] Verify exponential backoff on 429
- [ ] Test burst scenarios

## Timeout Handling

- [ ] Set context timeout (30s default)
- [ ] Test timeout cancellation
- [ ] Verify cleanup on timeout

## Memory Profiling

```bash
go test -memprofile=mem.prof -bench=.
go tool pprof mem.prof
```

## Concurrent Execution

```go
func BenchmarkInvokeParallel(b *testing.B) {
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			capability.Invoke(ctx, accountID)
		}
	})
}
```

## Monitoring Metrics

- API call latency (p50, p95, p99)
- Error rate
- Throughput (req/sec)
- Resource usage (CPU, memory)
