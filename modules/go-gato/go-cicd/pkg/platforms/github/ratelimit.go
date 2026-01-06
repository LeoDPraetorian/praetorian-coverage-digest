// pkg/platforms/github/ratelimit.go
package github

import (
	"context"
	"net/http"
	"strconv"
	"sync"
	"time"
)

// RateLimiter tracks GitHub API rate limits and throttles when needed
type RateLimiter struct {
	remaining int
	limit     int
	reset     time.Time
	mu        sync.RWMutex
}

// NewRateLimiter creates a new rate limiter with default values
func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		remaining: 5000, // GitHub default
		limit:     5000,
		reset:     time.Now().Add(time.Hour),
	}
}

// Update updates the rate limiter from HTTP response headers
func (r *RateLimiter) Update(header http.Header) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if remaining := header.Get("X-RateLimit-Remaining"); remaining != "" {
		r.remaining, _ = strconv.Atoi(remaining)
	}
	if limit := header.Get("X-RateLimit-Limit"); limit != "" {
		r.limit, _ = strconv.Atoi(limit)
	}
	if reset := header.Get("X-RateLimit-Reset"); reset != "" {
		unix, _ := strconv.ParseInt(reset, 10, 64)
		r.reset = time.Unix(unix, 0)
	}
}

// ShouldThrottle returns true if we should proactively slow down
// Triggers at 5% remaining to avoid hitting hard limit
func (r *RateLimiter) ShouldThrottle() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if r.limit == 0 {
		return false
	}
	threshold := r.limit / 20 // 5%
	return r.remaining < threshold
}

// Wait blocks until it's safe to make another request
// Returns immediately if not throttled, otherwise waits until reset
func (r *RateLimiter) Wait(ctx context.Context) error {
	if !r.ShouldThrottle() {
		return nil
	}

	r.mu.RLock()
	waitDuration := time.Until(r.reset) + time.Second
	r.mu.RUnlock()

	if waitDuration <= 0 {
		return nil
	}

	select {
	case <-time.After(waitDuration):
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Remaining returns the current remaining requests
func (r *RateLimiter) Remaining() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.remaining
}

// Limit returns the rate limit
func (r *RateLimiter) Limit() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.limit
}

// ResetTime returns when the rate limit resets
func (r *RateLimiter) ResetTime() time.Time {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.reset
}
