package main

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestTTLCacheHitAndStaleFallback(t *testing.T) {
	cache := NewTTLCache()
	ctx := context.Background()
	loads := 0

	value, state, err := cache.GetOrLoad(ctx, "key", 15*time.Millisecond, 200*time.Millisecond, func(context.Context) (any, error) {
		loads++
		return "fresh", nil
	})
	if err != nil || state != CacheMiss || value != "fresh" || loads != 1 {
		t.Fatalf("first load value=%v state=%s loads=%d err=%v", value, state, loads, err)
	}

	value, state, err = cache.GetOrLoad(ctx, "key", 15*time.Millisecond, 200*time.Millisecond, func(context.Context) (any, error) {
		loads++
		return "unexpected", nil
	})
	if err != nil || state != CacheHit || value != "fresh" || loads != 1 {
		t.Fatalf("cache hit value=%v state=%s loads=%d err=%v", value, state, loads, err)
	}

	time.Sleep(20 * time.Millisecond)
	value, state, err = cache.GetOrLoad(ctx, "key", 15*time.Millisecond, 200*time.Millisecond, func(context.Context) (any, error) {
		loads++
		return nil, errors.New("db down")
	})
	if err != nil || state != CacheStale || value != "fresh" || loads != 2 {
		t.Fatalf("stale fallback value=%v state=%s loads=%d err=%v", value, state, loads, err)
	}
}
