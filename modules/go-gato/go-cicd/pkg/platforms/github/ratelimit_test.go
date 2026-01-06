// pkg/platforms/github/ratelimit_test.go
package github

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRateLimiter_Update(t *testing.T) {
	rl := NewRateLimiter()

	header := http.Header{}
	header.Set("X-RateLimit-Remaining", "100")
	header.Set("X-RateLimit-Limit", "5000")
	header.Set("X-RateLimit-Reset", "1700000000")

	rl.Update(header)

	assert.Equal(t, 100, rl.remaining)
	assert.Equal(t, 5000, rl.limit)
}

func TestRateLimiter_ShouldThrottle(t *testing.T) {
	rl := NewRateLimiter()

	// 10% remaining - should not throttle
	rl.remaining = 500
	rl.limit = 5000
	assert.False(t, rl.ShouldThrottle())

	// 4% remaining - should throttle
	rl.remaining = 200
	rl.limit = 5000
	assert.True(t, rl.ShouldThrottle())
}

func TestRateLimiter_Wait(t *testing.T) {
	rl := NewRateLimiter()
	rl.remaining = 5000
	rl.limit = 5000

	// Should return immediately when not throttled
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	err := rl.Wait(ctx)
	require.NoError(t, err)
}

func TestRateLimiter_WaitContextCanceled(t *testing.T) {
	rl := NewRateLimiter()
	rl.remaining = 100   // 2% - below 5% threshold
	rl.limit = 5000
	rl.reset = time.Now().Add(10 * time.Second) // Reset far in the future

	// Should respect context cancellation
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	err := rl.Wait(ctx)
	require.ErrorIs(t, err, context.DeadlineExceeded)
}

func TestRateLimiter_Getters(t *testing.T) {
	rl := NewRateLimiter()
	rl.remaining = 4500
	rl.limit = 5000
	resetTime := time.Now().Add(time.Hour)
	rl.reset = resetTime

	assert.Equal(t, 4500, rl.Remaining())
	assert.Equal(t, 5000, rl.Limit())
	assert.Equal(t, resetTime, rl.ResetTime())
}
