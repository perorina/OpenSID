package main

import (
	"context"
	"fmt"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestDefaultPPIDPamongIDsAndOfficials(t *testing.T) {
	options := []PPIDPamong{
		{ID: 9, Name: "Kepala Kedua", Position: "Kepala Desa", Order: 3},
		{ID: 2, Name: "Kepala Pertama", Position: "Kepala Desa", Order: 1},
		{ID: 3, Name: "Sekretaris", Position: "Sekretaris Desa", Order: 2},
	}

	supervisorID, ppidID := defaultPPIDPamongIDs(options)
	if supervisorID != 9 || ppidID != 3 {
		t.Fatalf("default ids = (%d, %d), want (9, 3) following supplied pamong order", supervisorID, ppidID)
	}

	officials := resolvePPIDOfficials(PPIDProfile{SupervisorPamongID: 2, PPIDPamongID: 3, ServiceOfficerPamongID: 3}, options)
	if len(officials) != 3 {
		t.Fatalf("official count = %d, want 3", len(officials))
	}
	if officials[0].Name != "Kepala Pertama" || officials[0].Role != "Atasan PPID" {
		t.Fatalf("unexpected supervisor: %#v", officials[0])
	}
}

func TestInvalidatePPIDCache(t *testing.T) {
	cache := NewTTLCache()
	app := &App{cfg: Config{ConfigID: 7}, cache: cache}
	ctx := context.Background()
	key := "public:ppid:config:7"

	_, _, err := cache.GetOrLoad(ctx, key, time.Minute, time.Minute, func(context.Context) (any, error) {
		return "cached", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	app.invalidatePPIDCache()
	if _, ok := cache.get(key); ok {
		t.Fatal("PPID cache entry was not invalidated")
	}
}

func TestPPIDIntegration(t *testing.T) {
	dsn := os.Getenv("YMS_PPID_INTEGRATION_DSN")
	if dsn == "" {
		t.Skip("set YMS_PPID_INTEGRATION_DSN to run PPID integration tests")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	db, err := openDB(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := ensureSchema(ctx, db); err != nil {
		t.Fatal(err)
	}

	repoRoot, err := filepath.Abs(filepath.Join("..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	app := &App{
		cfg: Config{
			ConfigID:           1,
			OpenSIDBaseURL:     "http://127.0.0.1:8081",
			OpenSIDDocumentDir: filepath.Join(repoRoot, "desa", "upload", "dokumen"),
			PPIDSamplePDFDir:   filepath.Join(repoRoot, "output", "pdf", "ppid"),
			SampleDataEnabled:  true,
		},
		db:     db,
		schema: NewSchemaCache(db),
		cache:  NewTTLCache(),
	}

	options, err := app.loadPPIDPamong(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(options) < 2 {
		t.Fatalf("need active Kepala Desa and Sekretaris sample pamong, got %d options", len(options))
	}
	profile, err := app.defaultPPIDProfile(ctx, options)
	if err != nil {
		t.Fatal(err)
	}
	if err := app.validatePPIDProfile(ctx, &profile); err != nil {
		t.Fatalf("default profile should be valid: %v", err)
	}
	invalid := profile
	invalid.Email = "invalid-email"
	if err := app.validatePPIDProfile(ctx, &invalid); err == nil {
		t.Fatal("invalid PPID email was accepted")
	}

	access, err := app.ppidAccessLevel(ctx, &AdminUser{IDGrup: 1})
	if err != nil {
		t.Fatal(err)
	}
	if access < 3 {
		t.Fatalf("admin PPID access = %d, want at least 3", access)
	}
	deniedRequest := httptest.NewRequest("POST", "/api/yms/admin/ppid", nil)
	deniedRequest = deniedRequest.WithContext(context.WithValue(deniedRequest.Context(), adminUserKey, &AdminUser{IDGrup: 9999}))
	deniedResponse := httptest.NewRecorder()
	if app.requirePPIDEdit(deniedResponse, deniedRequest) || deniedResponse.Code != 403 {
		t.Fatalf("admin without PPID permission was not rejected: status=%d", deniedResponse.Code)
	}

	first, err := app.seedPPIDSample(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if first["profileSeeded"] != true {
		t.Fatalf("first seed result = %#v", first)
	}
	second, err := app.seedPPIDSample(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if second["documentsCreated"] != 0 || second["documentsUpdated"] != len(ppidSampleDocuments) {
		t.Fatalf("second seed is not idempotent: %#v", second)
	}

	excludedTitle := fmt.Sprintf("YMS PPID FILTER TEST %d", time.Now().UnixNano())
	_, err = db.ExecContext(ctx, `INSERT INTO dokumen
(config_id, satuan, nama, enabled, tgl_upload, id_pend, kategori, attr, tipe, tahun, kategori_info_publik, deleted, keterangan, status, published_at)
VALUES (1, 'filter-test.pdf', ?, 0, NOW(), NULL, 1, '{}', 1, YEAR(CURDATE()), 3, 0, 'integration filter test', 1, CURDATE())`, excludedTitle)
	if err != nil {
		t.Fatal(err)
	}
	defer func() {
		_, _ = db.Exec("DELETE FROM dokumen WHERE config_id = 1 AND nama = ?", excludedTitle)
	}()

	public, err := app.loadPPIDPublic(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !public.IsSample || !public.Profile.IsPublished {
		t.Fatalf("seeded public profile flags are wrong: %#v", public.Profile)
	}
	if len(public.Documents) < len(ppidSampleDocuments) {
		t.Fatalf("public PPID document count = %d, want at least %d foundation documents", len(public.Documents), len(ppidSampleDocuments))
	}
	seen := map[string]bool{}
	for _, document := range public.Documents {
		if document.Title == excludedTitle {
			t.Fatal("disabled document leaked into public PPID payload")
		}
		if !document.IsSample {
			t.Fatalf("seeded document is not marked as sample: %#v", document)
		}
		seen[document.Title] = true
	}
	for _, document := range ppidSampleDocuments {
		if !seen[document.Title] {
			t.Fatalf("foundation PPID document missing: %s", document.Title)
		}
	}
}
