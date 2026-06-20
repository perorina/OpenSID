package main

import (
	"crypto/subtle"
	"net/http"
	"strings"
)

func (a *App) requireInternalAPIKey(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		expected := strings.TrimSpace(a.cfg.InternalAPIKey)
		if expected == "" {
			a.error(w, http.StatusServiceUnavailable, "internal_key_not_configured", "Akses internal API belum dikonfigurasi.")
			return
		}

		const prefix = "Bearer "
		header := strings.TrimSpace(r.Header.Get("Authorization"))
		if !strings.HasPrefix(header, prefix) {
			a.error(w, http.StatusUnauthorized, "missing_internal_key", "Akses internal API wajib memakai bearer key.")
			return
		}

		actual := strings.TrimSpace(strings.TrimPrefix(header, prefix))
		if subtle.ConstantTimeCompare([]byte(actual), []byte(expected)) != 1 {
			a.error(w, http.StatusUnauthorized, "invalid_internal_key", "Akses internal API tidak valid.")
			return
		}

		next.ServeHTTP(w, r)
	})
}
