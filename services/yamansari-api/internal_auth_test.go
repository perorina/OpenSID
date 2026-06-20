package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRequireInternalAPIKey(t *testing.T) {
	app := &App{cfg: Config{InternalAPIKey: "secret"}}
	next := app.requireInternalAPIKey(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	tests := []struct {
		name          string
		authorization string
		wantStatus    int
	}{
		{name: "missing bearer", wantStatus: http.StatusUnauthorized},
		{name: "invalid bearer", authorization: "Bearer wrong", wantStatus: http.StatusUnauthorized},
		{name: "valid bearer", authorization: "Bearer secret", wantStatus: http.StatusNoContent},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/yms/profil", nil)
			if tt.authorization != "" {
				req.Header.Set("Authorization", tt.authorization)
			}
			rec := httptest.NewRecorder()

			next.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d; body=%s", rec.Code, tt.wantStatus, rec.Body.String())
			}
		})
	}
}

func TestRequireInternalAPIKeyNeedsConfiguredKey(t *testing.T) {
	app := &App{cfg: Config{}}
	next := app.requireInternalAPIKey(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/yms/profil", nil)
	req.Header.Set("Authorization", "Bearer secret")
	rec := httptest.NewRecorder()

	next.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d; body=%s", rec.Code, http.StatusServiceUnavailable, rec.Body.String())
	}
}
