package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLegacyOpenSIDPIN(t *testing.T) {
	got := legacyOpenSIDPIN("123456")
	want := "3645e735f033e8482be0c7993fcba946"
	if got != want {
		t.Fatalf("legacyOpenSIDPIN() = %s, want %s", got, want)
	}

	if verifyPIN("123456", want) != true {
		t.Fatal("verifyPIN should accept legacy OpenSID hash")
	}
}

func TestRequireAdminCSRF(t *testing.T) {
	app := &App{}
	next := app.requireAdminCSRF(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	tests := []struct {
		name       string
		method     string
		user       *AdminUser
		header     string
		wantStatus int
	}{
		{name: "GET bypasses CSRF", method: http.MethodGet, wantStatus: http.StatusNoContent},
		{name: "missing user", method: http.MethodPost, wantStatus: http.StatusForbidden},
		{name: "wrong token", method: http.MethodPost, user: &AdminUser{CSRFToken: "valid"}, header: "wrong", wantStatus: http.StatusForbidden},
		{name: "valid token", method: http.MethodPost, user: &AdminUser{CSRFToken: "valid"}, header: "valid", wantStatus: http.StatusNoContent},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/yms/admin/ppid", nil)
			if tt.user != nil {
				req = req.WithContext(context.WithValue(req.Context(), adminUserKey, tt.user))
			}
			if tt.header != "" {
				req.Header.Set("X-CSRF-Token", tt.header)
			}
			rec := httptest.NewRecorder()
			next.ServeHTTP(rec, req)
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d; body=%s", rec.Code, tt.wantStatus, rec.Body.String())
			}
		})
	}
}
