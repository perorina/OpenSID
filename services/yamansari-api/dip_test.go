package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestDIPFiltersAndMetadata(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/public/dip?q=anggaran&category=berkala&year=2026&page=2&limit=6", nil)
	filters, err := parseDIPFilters(req)
	if err != nil {
		t.Fatal(err)
	}
	if filters.Query != "anggaran" || filters.CategoryCode != 1 || filters.Year != "2026" || filters.Page != 2 || filters.Limit != 6 {
		t.Fatalf("unexpected filters: %#v", filters)
	}

	metadata := DIPMetadata{IsListed: true, Summary: "Ringkasan"}
	if err := validateDIPMetadata(&metadata); err == nil {
		t.Fatal("listed incomplete metadata was accepted")
	}
	metadata = DIPMetadata{
		IsListed: true, PublicationType: "other", Summary: "Ringkasan", ControllingUnit: "Sekretariat", ResponsibleOfficial: "PPID",
		Publisher: "Pemerintah Desa", CreatedDate: "2026-06-24", CreatedPlace: "Yamansari", UpdateFrequency: "Tahunan",
	}
	if err := validateDIPMetadata(&metadata); err != nil {
		t.Fatalf("complete metadata was rejected: %v", err)
	}
	if got := dipCategoryCode("serta-merta"); got != 2 {
		t.Fatalf("category code = %d, want 2", got)
	}
}

func TestInvalidateDIPCache(t *testing.T) {
	cache := NewTTLCache()
	app := &App{cache: cache}
	ctx := context.Background()
	_, _, _ = cache.GetOrLoad(ctx, "public:dip:list", time.Minute, time.Minute, func(context.Context) (any, error) { return "cached", nil })
	app.invalidateDIPCache()
	if _, ok := cache.get("public:dip:list"); ok {
		t.Fatal("DIP cache entry was not invalidated")
	}
}

func TestDIPIntegration(t *testing.T) {
	dsn := os.Getenv("YMS_PPID_INTEGRATION_DSN")
	if dsn == "" {
		t.Skip("set YMS_PPID_INTEGRATION_DSN to run DIP integration tests")
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
	repoRoot, _ := filepath.Abs(filepath.Join("..", ".."))
	app := &App{
		cfg: Config{
			ConfigID: 1, InternalAPIKey: "test-key", OpenSIDBaseURL: "http://127.0.0.1:8081",
			OpenSIDDocumentDir: filepath.Join(repoRoot, "desa", "upload", "dokumen"),
			PPIDSamplePDFDir:   filepath.Join(repoRoot, "output", "pdf", "ppid"),
			DIPSamplePDFDir:    filepath.Join(repoRoot, "output", "pdf", "ppid", "dip"), SampleDataEnabled: true,
		},
		db: db, schema: NewSchemaCache(db), cache: NewTTLCache(), loginLimiter: NewLoginLimiter(3, time.Minute),
	}

	if _, err := app.seedDIPSample(ctx); err != nil {
		t.Fatal(err)
	}
	second, err := app.seedDIPSample(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if second["documentsCreated"] != 0 || second["documentsUpdated"] != len(dipPhase2SampleDocuments)+len(dipPhase3SampleDocuments) {
		t.Fatalf("second DIP seed is not idempotent: %#v", second)
	}

	marker := fmt.Sprintf("YMS DIP FILTER TEST %d", time.Now().UnixNano())
	defer func() {
		_, _ = db.Exec(`DELETE m FROM yms_dip_metadata m JOIN dokumen d ON d.id = m.document_id WHERE d.nama LIKE ?`, marker+"%")
		_, _ = db.Exec("DELETE FROM dokumen WHERE nama LIKE ?", marker+"%")
	}()
	for _, row := range []struct {
		title, marker     string
		enabled, category int
	}{{marker + " disabled", "disabled", 0, 1}, {marker + " excluded", "excluded", 1, 4}, {marker + " incomplete", "incomplete", 1, 1}} {
		_, err = db.ExecContext(ctx, `INSERT INTO dokumen
(config_id, satuan, nama, enabled, tgl_upload, id_pend, kategori, attr, tipe, tahun, kategori_info_publik, deleted, keterangan, status, published_at)
VALUES (1, 'filter-test.pdf', ?, ?, NOW(), NULL, 1, '{}', 1, YEAR(CURDATE()), ?, 0, ?, 1, CURDATE())`, row.title, row.enabled, row.category, row.marker)
		if err != nil {
			t.Fatal(err)
		}
	}
	var incompleteID int64
	if err := db.QueryRowContext(ctx, "SELECT id FROM dokumen WHERE nama = ?", marker+" incomplete").Scan(&incompleteID); err != nil {
		t.Fatal(err)
	}
	incompleteRequest := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/yms/public/documents/%d/content", incompleteID), nil)
	incompleteRequest.Header.Set("Authorization", "Bearer test-key")
	incompleteResponse := httptest.NewRecorder()
	app.routes().ServeHTTP(incompleteResponse, incompleteRequest)
	if incompleteResponse.Code != http.StatusNotFound {
		t.Fatalf("unlisted document content status = %d, want 404", incompleteResponse.Code)
	}

	list, err := app.loadDIPList(ctx, dipFilters{Page: 1, Limit: 24})
	if err != nil {
		t.Fatal(err)
	}
	if list.Pagination.Total < 15 {
		t.Fatalf("public DIP total = %d, want at least 15 sample documents", list.Pagination.Total)
	}
	for _, item := range list.Items {
		if strings.HasPrefix(item.Title, marker) {
			t.Fatalf("ineligible document leaked into public DIP: %s", item.Title)
		}
	}

	var documentID int64
	if err := db.QueryRowContext(ctx, `SELECT id FROM dokumen WHERE keterangan LIKE '[YMS-SAMPLE-DIP:profil-struktur]%' LIMIT 1`).Scan(&documentID); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/yms/public/documents/%d/content", documentID), nil)
	req.Header.Set("Authorization", "Bearer test-key")
	req.Header.Set("Range", "bytes=0-9")
	rec := httptest.NewRecorder()
	app.routes().ServeHTTP(rec, req)
	if rec.Code != http.StatusPartialContent || rec.Body.Len() != 10 {
		t.Fatalf("range response: status=%d bytes=%d", rec.Code, rec.Body.Len())
	}
	if disposition := rec.Header().Get("Content-Disposition"); !strings.HasPrefix(disposition, "inline") {
		t.Fatalf("content disposition = %q, want inline", disposition)
	}
}
