package main

import (
	"encoding/json"
	"net/http"
	"time"
)

type responseMeta map[string]any

func (a *App) ok(w http.ResponseWriter, status int, data any, meta responseMeta) {
	if meta == nil {
		meta = responseMeta{}
	}
	meta["source"] = "yamansari-api"
	meta["generated_at"] = time.Now().Format(time.RFC3339)

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status": "ok",
		"data":   data,
		"meta":   meta,
	})
}

func (a *App) error(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status": "error",
		"error": map[string]any{
			"code":    code,
			"message": message,
		},
		"meta": responseMeta{
			"source":       "yamansari-api",
			"generated_at": time.Now().Format(time.RFC3339),
		},
	})
}

func (a *App) noStore(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func (a *App) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if a.cfg.AllowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-CSRF-Token, X-YMS-Request-ID")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
