# Advanced Patterns

## Batch Processing with Errgroup

```go
func processBatches[T any](items []T, batchSize, concurrency int, fn func([]T) error) error {
    g := errgroup.Group{}
    g.SetLimit(concurrency)

    for i := 0; i < len(items); i += batchSize {
        end := min(i+batchSize, len(items))
        batch := items[i:end]

        g.Go(func() error {
            return fn(batch)
        })
    }

    return g.Wait()
}
```

## Multiple Error Collection

```go
func processAllCollectErrors(items []Item) error {
    g := errgroup.Group{}
    g.SetLimit(10)

    var errs []error
    var errMu sync.Mutex

    for _, item := range items {
        item := item
        g.Go(func() error {
            if err := process(item); err != nil {
                errMu.Lock()
                errs = append(errs, fmt.Errorf("item %s: %w", item.ID, err))
                errMu.Unlock()
            }
            return nil  // Don't fail group, collect all errors
        })
    }

    g.Wait()

    if len(errs) > 0 {
        return errors.Join(errs...)  // Go 1.20+
    }
    return nil
}
```

## Rate-Limited Processing

```go
import "golang.org/x/time/rate"

func processWithRateLimit(ctx context.Context, items []Item) error {
    g, ctx := errgroup.WithContext(ctx)
    g.SetLimit(10)

    limiter := rate.NewLimiter(rate.Limit(10), 1)  // 10 req/sec

    for _, item := range items {
        item := item
        g.Go(func() error {
            if err := limiter.Wait(ctx); err != nil {
                return err
            }
            return process(item)
        })
    }

    return g.Wait()
}
```
