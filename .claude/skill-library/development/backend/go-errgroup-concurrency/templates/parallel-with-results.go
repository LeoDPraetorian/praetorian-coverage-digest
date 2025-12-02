// Template: Parallel Processing with Result Collection
// Use this template when you need to process items concurrently and collect results.
//
// Customize:
// - Item type (replace `Item`)
// - Result type (replace `Result`)
// - Concurrency limit (adjust SetLimit value)
// - Processing function (replace processItem)

package example

import (
	"context"
	"sync"

	"golang.org/x/sync/errgroup"
)

// Item represents the input type (customize for your use case)
type Item struct {
	ID   string
	Data string
}

// Result represents the output type (customize for your use case)
type Result struct {
	ItemID string
	Output string
}

// ProcessItemsParallel processes items concurrently and collects results.
// Returns all results on success, or an error if any item fails.
func ProcessItemsParallel(ctx context.Context, items []Item) ([]Result, error) {
	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(10) // Adjust based on workload and external API limits

	var mu sync.Mutex
	results := make([]Result, 0, len(items))

	for _, item := range items {
		item := item // Capture loop variable (required for Go < 1.22)
		g.Go(func() error {
			// Check for context cancellation before expensive work
			select {
			case <-ctx.Done():
				return ctx.Err()
			default:
			}

			// Process the item (customize this)
			result, err := processItem(ctx, item)
			if err != nil {
				return err // Fail fast on error
			}

			// Thread-safe result collection
			mu.Lock()
			results = append(results, result)
			mu.Unlock()

			return nil
		})
	}

	if err := g.Wait(); err != nil {
		return nil, err
	}

	return results, nil
}

// processItem is the actual processing logic (customize this)
func processItem(ctx context.Context, item Item) (Result, error) {
	// Your processing logic here
	return Result{
		ItemID: item.ID,
		Output: "processed: " + item.Data,
	}, nil
}

// --- Alternative: Continue-on-Error Pattern ---
// Use when partial success is acceptable

// ProcessItemsBestEffort processes all items, logging errors but not failing.
// Returns successful results and logs failures.
func ProcessItemsBestEffort(ctx context.Context, items []Item) []Result {
	g := errgroup.Group{}
	g.SetLimit(10)

	var mu sync.Mutex
	results := make([]Result, 0, len(items))
	var failCount int

	for _, item := range items {
		item := item
		g.Go(func() error {
			result, err := processItem(ctx, item)
			if err != nil {
				// Log error but continue
				mu.Lock()
				failCount++
				mu.Unlock()
				// slog.Warn("item failed", "id", item.ID, "error", err)
				return nil // Don't fail the group
			}

			mu.Lock()
			results = append(results, result)
			mu.Unlock()

			return nil
		})
	}

	g.Wait()

	// if failCount > 0 {
	//     slog.Warn("batch completed with errors", "failed", failCount, "total", len(items))
	// }

	return results
}
