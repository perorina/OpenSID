package main

import (
	"context"
	"strings"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

type CacheState string

const (
	CacheNone  CacheState = "none"
	CacheHit   CacheState = "hit"
	CacheMiss  CacheState = "miss"
	CacheStale CacheState = "stale"
)

type cacheEntry struct {
	value      any
	freshUntil time.Time
	staleUntil time.Time
}

type TTLCache struct {
	mu      sync.RWMutex
	entries map[string]cacheEntry
	group   singleflight.Group
}

func NewTTLCache() *TTLCache {
	cache := &TTLCache{entries: map[string]cacheEntry{}}
	go cache.sweepLoop(10 * time.Second)

	return cache
}

func (c *TTLCache) GetOrLoad(ctx context.Context, key string, freshTTL, maxStale time.Duration, loader func(context.Context) (any, error)) (any, CacheState, error) {
	now := time.Now()
	entry, hasEntry := c.get(key)
	if hasEntry && now.Before(entry.freshUntil) {
		return entry.value, CacheHit, nil
	}

	loaded, err, _ := c.group.Do(key, func() (any, error) {
		nestedNow := time.Now()
		if existing, ok := c.get(key); ok && nestedNow.Before(existing.freshUntil) {
			return existing.value, nil
		}

		value, loadErr := loader(ctx)
		if loadErr != nil {
			return nil, loadErr
		}

		c.mu.Lock()
		c.entries[key] = cacheEntry{
			value:      value,
			freshUntil: nestedNow.Add(freshTTL),
			staleUntil: nestedNow.Add(freshTTL + maxStale),
		}
		c.mu.Unlock()

		return value, nil
	})

	if err == nil {
		return loaded, CacheMiss, nil
	}

	if hasEntry && now.Before(entry.staleUntil) {
		return entry.value, CacheStale, nil
	}

	return nil, CacheNone, err
}

func (c *TTLCache) Invalidate(key string) {
	c.mu.Lock()
	delete(c.entries, key)
	c.mu.Unlock()
}

func (c *TTLCache) InvalidatePrefix(prefix string) {
	c.mu.Lock()
	for key := range c.entries {
		if strings.HasPrefix(key, prefix) {
			delete(c.entries, key)
		}
	}
	c.mu.Unlock()
}

func (c *TTLCache) get(key string) (cacheEntry, bool) {
	c.mu.RLock()
	entry, ok := c.entries[key]
	c.mu.RUnlock()

	return entry, ok
}

func (c *TTLCache) sweepLoop(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		c.mu.Lock()
		for key, entry := range c.entries {
			if now.After(entry.staleUntil) {
				delete(c.entries, key)
			}
		}
		c.mu.Unlock()
	}
}
