package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type DIPCategory struct {
	Code  int    `json:"code"`
	Slug  string `json:"slug"`
	Label string `json:"label"`
}

type DIPMetadata struct {
	DocumentID          int64  `json:"documentId"`
	PublicationType     string `json:"publicationType"`
	Summary             string `json:"summary"`
	ControllingUnit     string `json:"controllingUnit"`
	ResponsibleOfficial string `json:"responsibleOfficial"`
	Publisher           string `json:"publisher"`
	CreatedDate         string `json:"createdDate"`
	CreatedPlace        string `json:"createdPlace"`
	UpdateFrequency     string `json:"updateFrequency"`
	IsListed            bool   `json:"isListed"`
	IsSample            bool   `json:"isSample"`
	SortOrder           int    `json:"sortOrder"`
	Version             int    `json:"version"`
}

type DIPEntry struct {
	DocumentID          int64       `json:"documentId"`
	Title               string      `json:"title"`
	PublicationType     string      `json:"publicationType"`
	Category            DIPCategory `json:"category"`
	Year                string      `json:"year,omitempty"`
	Summary             string      `json:"summary"`
	ControllingUnit     string      `json:"controllingUnit"`
	ResponsibleOfficial string      `json:"responsibleOfficial"`
	Publisher           string      `json:"publisher"`
	CreatedDate         string      `json:"createdDate"`
	CreatedPlace        string      `json:"createdPlace"`
	UpdateFrequency     string      `json:"updateFrequency"`
	Format              string      `json:"format"`
	PublishedAt         string      `json:"publishedAt,omitempty"`
	RetentionUntil      string      `json:"retentionUntil,omitempty"`
	RetentionLabel      string      `json:"retentionLabel"`
	UpdatedAt           string      `json:"updatedAt,omitempty"`
	ViewURL             string      `json:"viewUrl"`
	IsSample            bool        `json:"isSample"`
}

type DIPFacet struct {
	Code  int    `json:"code"`
	Slug  string `json:"slug"`
	Label string `json:"label"`
	Count int    `json:"count"`
}

type DIPPagination struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

type DIPListPayload struct {
	Items      []DIPEntry    `json:"items"`
	Categories []DIPFacet    `json:"categories"`
	Years      []string      `json:"years"`
	Pagination DIPPagination `json:"pagination"`
	IsSample   bool          `json:"isSample"`
}

type AdminDIPDocument struct {
	Entry    DIPEntry    `json:"entry"`
	Metadata DIPMetadata `json:"metadata"`
	Complete bool        `json:"complete"`
}

type AdminDIPPayload struct {
	Documents       []AdminDIPDocument `json:"documents"`
	CompleteCount   int                `json:"completeCount"`
	IncompleteCount int                `json:"incompleteCount"`
	CanEdit         bool               `json:"canEdit"`
	SampleAvailable bool               `json:"sampleAvailable"`
	OpenSIDAdminURL string             `json:"openSidAdminUrl"`
}

type PublicationCoverage struct {
	Key       string `json:"key"`
	Label     string `json:"label"`
	Available int    `json:"available"`
	Required  bool   `json:"required"`
}

type PublicationCatalog struct {
	Documents    []DIPEntry            `json:"documents"`
	Coverage     []PublicationCoverage `json:"coverage"`
	Completed    int                   `json:"completed"`
	Required     int                   `json:"required"`
	Completeness int                   `json:"completeness"`
	IsSample     bool                  `json:"isSample"`
}

type dipDocumentRecord struct {
	ID              int64
	Title           string
	Year            string
	CategoryCode    int
	PublishedAt     string
	RetentionUntil  string
	RetentionNumber string
	RetentionUnit   string
	Description     string
	FileName        string
	ExternalURL     string
	DocumentType    int
	UpdatedAt       string
	Metadata        DIPMetadata
}

type dipFilters struct {
	Query        string
	CategoryCode int
	Year         string
	Page         int
	Limit        int
}

type dipSampleDefinition struct {
	Key                 string
	FileName            string
	Title               string
	CategoryCode        int
	PublicationType     string
	Summary             string
	ControllingUnit     string
	ResponsibleOfficial string
	Publisher           string
	CreatedPlace        string
	UpdateFrequency     string
	SortOrder           int
}

var dipPhase2SampleDocuments = []dipSampleDefinition{
	{Key: "profil-struktur", FileName: "contoh-profil-dan-struktur-pemerintah-desa.pdf", Title: "CONTOH - Profil dan Struktur Pemerintah Desa", CategoryCode: 1, PublicationType: "profile", Summary: "Ringkasan identitas desa, wilayah, dan susunan pemerintah Desa Yamansari.", ControllingUnit: "Sekretariat Desa", ResponsibleOfficial: "Sekretaris Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Setiap semester atau saat terjadi perubahan", SortOrder: 10},
	{Key: "apbdes-realisasi", FileName: "contoh-ringkasan-apbdes-dan-realisasi.pdf", Title: "CONTOH - Ringkasan APBDes dan Realisasi", CategoryCode: 1, PublicationType: "budget", Summary: "Ringkasan contoh pendapatan, belanja, pembiayaan, dan realisasi APBDes.", ControllingUnit: "Kaur Keuangan", ResponsibleOfficial: "Kaur Keuangan", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Setiap triwulan", SortOrder: 20},
	{Key: "program-kegiatan", FileName: "contoh-program-dan-kegiatan-desa.pdf", Title: "CONTOH - Program dan Kegiatan Desa", CategoryCode: 1, PublicationType: "program", Summary: "Daftar contoh program, kegiatan, lokasi, pelaksana, dan sumber anggaran desa.", ControllingUnit: "Kaur Perencanaan", ResponsibleOfficial: "Kaur Perencanaan", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Setiap semester", SortOrder: 30},
	{Key: "prosedur-darurat", FileName: "contoh-prosedur-informasi-darurat-dan-kontak-siaga.pdf", Title: "CONTOH - Prosedur Informasi Darurat dan Kontak Siaga", CategoryCode: 2, PublicationType: "emergency", Summary: "Prosedur contoh penyampaian informasi darurat dan kanal koordinasi cepat desa.", ControllingUnit: "Kasi Pelayanan", ResponsibleOfficial: "Petugas Siaga Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Segera saat kondisi darurat berubah", SortOrder: 40},
	{Key: "panduan-evakuasi", FileName: "contoh-panduan-evakuasi-dan-kanal-bantuan.pdf", Title: "CONTOH - Panduan Evakuasi dan Kanal Bantuan", CategoryCode: 2, PublicationType: "emergency", Summary: "Panduan contoh evakuasi, titik aman, dan kanal bantuan untuk warga terdampak.", ControllingUnit: "Tim Siaga Desa", ResponsibleOfficial: "Koordinator Tim Siaga Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Segera saat kondisi darurat berubah", SortOrder: 50},
}

var dipPhase3SampleDocuments = []dipSampleDefinition{
	{Key: "rencana-desa", FileName: "contoh-rpjmdes-rkpdes-dan-du-rkp.pdf", Title: "CONTOH - RPJMDes, RKPDes, dan DU-RKP", CategoryCode: 1, PublicationType: "planning", Summary: "Ringkasan contoh arah pembangunan jangka menengah, rencana kerja tahunan, dan daftar usulan desa.", ControllingUnit: "Kaur Perencanaan", ResponsibleOfficial: "Kaur Perencanaan", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Setiap tahun atau saat perubahan", SortOrder: 31},
	{Key: "musyawarah-desa", FileName: "contoh-register-musyawarah-desa.pdf", Title: "CONTOH - Register Musyawarah Desa", CategoryCode: 3, PublicationType: "meeting", Summary: "Register contoh agenda, peserta agregat, keputusan, dan tindak lanjut musyawarah desa.", ControllingUnit: "Sekretariat Desa", ResponsibleOfficial: "Sekretaris Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Setelah setiap musyawarah", SortOrder: 32},
	{Key: "inventaris-desa", FileName: "contoh-ringkasan-inventaris-desa.pdf", Title: "CONTOH - Ringkasan Inventaris Desa", CategoryCode: 3, PublicationType: "inventory", Summary: "Ringkasan contoh tanah, gedung, peralatan, jalan, dan aset desa tanpa data sensitif.", ControllingUnit: "Kaur Tata Usaha dan Umum", ResponsibleOfficial: "Pengurus Barang Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Setiap semester", SortOrder: 33},
	{Key: "perjanjian-pihak-ketiga", FileName: "contoh-register-perjanjian-pihak-ketiga.pdf", Title: "CONTOH - Register Perjanjian Pihak Ketiga", CategoryCode: 3, PublicationType: "contract", Summary: "Register contoh kerja sama, pengadaan, masa berlaku, nilai, dan unit penanggung jawab.", ControllingUnit: "Sekretariat Desa", ResponsibleOfficial: "Kepala Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Saat perjanjian berubah", SortOrder: 34},
	{Key: "bumdes", FileName: "contoh-profil-dan-laporan-bumdes.pdf", Title: "CONTOH - Profil dan Laporan BUM Desa", CategoryCode: 1, PublicationType: "bumdes", Summary: "Profil contoh badan usaha, unit usaha, penyertaan modal, dan ringkasan kinerja BUM Desa.", ControllingUnit: "Kasi Kesejahteraan", ResponsibleOfficial: "Pembina BUM Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Setiap tahun", SortOrder: 35},
	{Key: "laporan-penyelenggaraan", FileName: "contoh-ringkasan-laporan-penyelenggaraan-pemerintahan-desa.pdf", Title: "CONTOH - Ringkasan Laporan Penyelenggaraan Pemerintahan Desa", CategoryCode: 1, PublicationType: "governance_report", Summary: "Ringkasan contoh capaian pemerintahan, pembangunan, pembinaan, pemberdayaan, dan tindak lanjut.", ControllingUnit: "Sekretariat Desa", ResponsibleOfficial: "Kepala Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Setiap tahun", SortOrder: 36},
}

var dipPhase1SampleMetadata = []dipSampleDefinition{
	{Key: "sk-penetapan", Title: "CONTOH - SK Penetapan PPID Desa Yamansari", CategoryCode: 3, PublicationType: "legal", Summary: "Keputusan contoh pembentukan dan penetapan pengelola informasi publik desa.", ControllingUnit: "Sekretariat Desa", ResponsibleOfficial: "Kepala Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Saat terjadi perubahan", SortOrder: 60},
	{Key: "perdes-kip", Title: "CONTOH - Perdes Keterbukaan Informasi Publik", CategoryCode: 3, PublicationType: "legal", Summary: "Peraturan desa contoh mengenai tata kelola keterbukaan dan layanan informasi publik.", ControllingUnit: "Sekretariat Desa", ResponsibleOfficial: "Kepala Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Saat peraturan berubah", SortOrder: 70},
	{Key: "sop-layanan", Title: "CONTOH - SOP Pelayanan Informasi Publik", CategoryCode: 3, PublicationType: "ppid", Summary: "Standar operasional contoh penerimaan, pemeriksaan, jawaban, dan pengarsipan layanan informasi.", ControllingUnit: "PPID Desa", ResponsibleOfficial: "PPID Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Saat prosedur berubah", SortOrder: 80},
	{Key: "maklumat", Title: "CONTOH - Maklumat Pelayanan Informasi Publik", CategoryCode: 3, PublicationType: "ppid", Summary: "Pernyataan contoh komitmen pemerintah desa dalam memberikan layanan informasi publik.", ControllingUnit: "PPID Desa", ResponsibleOfficial: "PPID Desa", Publisher: "Pemerintah Desa Yamansari", CreatedPlace: "Yamansari", UpdateFrequency: "Saat standar layanan berubah", SortOrder: 90},
}

func (a *App) publicDIP(w http.ResponseWriter, r *http.Request) {
	filters, err := parseDIPFilters(r)
	if err != nil {
		a.error(w, http.StatusBadRequest, "invalid_dip_filters", err.Error())
		return
	}
	payload, err := a.loadDIPList(r.Context(), filters)
	if err != nil {
		a.error(w, http.StatusServiceUnavailable, "dip_unavailable", "Daftar Informasi Publik belum bisa dimuat.")
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=60, stale-while-revalidate=120")
	a.ok(w, http.StatusOK, payload, responseMeta{"cache": string(CacheNone)})
}

func (a *App) publicPublications(w http.ResponseWriter, r *http.Request) {
	a.cachedPublic(w, r, fmt.Sprintf("public:publications:config:%d", a.cfg.ConfigID), 5*time.Minute, 2*time.Minute, a.loadPublicationCatalog)
}

func (a *App) loadPublicationCatalog(ctx context.Context) (any, error) {
	records, err := a.loadDIPRecords(ctx, true)
	if err != nil {
		return nil, err
	}
	requirements := []PublicationCoverage{
		{Key: "profile", Label: "Profil dan Pemerintah Desa", Required: true},
		{Key: "planning", Label: "RPJMDes dan RKPDes", Required: true},
		{Key: "budget", Label: "APBDes dan Realisasi", Required: true},
		{Key: "program", Label: "Program dan Kegiatan", Required: true},
		{Key: "legal", Label: "Produk Hukum Desa", Required: true},
		{Key: "meeting", Label: "Musyawarah Desa", Required: true},
		{Key: "inventory", Label: "Inventaris Desa", Required: true},
		{Key: "contract", Label: "Perjanjian Pihak Ketiga", Required: true},
		{Key: "bumdes", Label: "BUM Desa", Required: true},
		{Key: "governance_report", Label: "Laporan Penyelenggaraan", Required: true},
	}
	counts := map[string]int{}
	documents := make([]DIPEntry, 0, len(records))
	isSample := false
	for _, record := range records {
		entry := dipEntry(record)
		documents = append(documents, entry)
		counts[entry.PublicationType]++
		isSample = isSample || entry.IsSample
	}
	completed := 0
	for index := range requirements {
		requirements[index].Available = counts[requirements[index].Key]
		if requirements[index].Available > 0 {
			completed++
		}
	}
	completeness := 0
	if len(requirements) > 0 {
		completeness = completed * 100 / len(requirements)
	}
	return PublicationCatalog{Documents: documents, Coverage: requirements, Completed: completed, Required: len(requirements), Completeness: completeness, IsSample: isSample}, nil
}

func (a *App) publicDIPDetail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		a.error(w, http.StatusNotFound, "dip_not_found", "Informasi publik tidak ditemukan.")
		return
	}
	records, err := a.loadDIPRecords(r.Context(), true)
	if err != nil {
		a.error(w, http.StatusServiceUnavailable, "dip_unavailable", "Informasi publik belum bisa dimuat.")
		return
	}
	for _, record := range records {
		if record.ID == id {
			w.Header().Set("Cache-Control", "public, max-age=300, stale-while-revalidate=300")
			a.ok(w, http.StatusOK, dipEntry(record), responseMeta{"cache": string(CacheNone)})
			return
		}
	}
	a.error(w, http.StatusNotFound, "dip_not_found", "Informasi publik tidak ditemukan.")
}

func (a *App) adminDIP(w http.ResponseWriter, r *http.Request) {
	access, err := a.ppidAccessLevel(r.Context(), adminUserFromContext(r.Context()))
	if err != nil {
		a.error(w, http.StatusInternalServerError, "dip_access_failed", "Hak akses Informasi Publik belum bisa diperiksa.")
		return
	}
	if access < 1 {
		a.error(w, http.StatusForbidden, "dip_forbidden", "Akun ini tidak memiliki akses Informasi Publik.")
		return
	}
	records, err := a.loadDIPRecords(r.Context(), false)
	if err != nil {
		a.error(w, http.StatusServiceUnavailable, "dip_unavailable", "Dokumen DIP belum bisa dimuat.")
		return
	}
	documents := make([]AdminDIPDocument, 0, len(records))
	completeCount := 0
	for _, record := range records {
		complete := dipMetadataComplete(record.Metadata)
		if complete {
			completeCount++
		}
		documents = append(documents, AdminDIPDocument{Entry: dipEntry(record), Metadata: record.Metadata, Complete: complete})
	}
	a.ok(w, http.StatusOK, AdminDIPPayload{
		Documents: documents, CompleteCount: completeCount, IncompleteCount: len(documents) - completeCount,
		CanEdit: access >= 3, SampleAvailable: a.cfg.SampleDataEnabled,
		OpenSIDAdminURL: a.cfg.OpenSIDBaseURL + "/index.php/siteman/dokumen",
	}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminDIPUpdate(w http.ResponseWriter, r *http.Request) {
	if !a.requirePPIDEdit(w, r) {
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		a.error(w, http.StatusNotFound, "dip_not_found", "Dokumen Informasi Publik tidak ditemukan.")
		return
	}
	var metadata DIPMetadata
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<10)).Decode(&metadata); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Metadata DIP tidak valid.")
		return
	}
	metadata.DocumentID = id
	if err := validateDIPMetadata(&metadata); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_dip_metadata", err.Error())
		return
	}
	current, err := a.eligibleDIPDocument(r.Context(), id, false)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			a.error(w, http.StatusNotFound, "dip_not_found", "Dokumen tidak memenuhi syarat Informasi Publik.")
			return
		}
		a.error(w, http.StatusInternalServerError, "dip_document_failed", "Dokumen belum bisa diperiksa.")
		return
	}
	if err := a.saveDIPMetadata(r.Context(), metadata); err != nil {
		a.error(w, http.StatusInternalServerError, "dip_save_failed", "Metadata DIP belum bisa disimpan.")
		return
	}
	user := adminUserFromContext(r.Context())
	_ = a.auditLog(r.Context(), user, user.Nama, "dip", id, "metadata_updated", map[string]any{"fromVersion": current.Metadata.Version, "publicationType": metadata.PublicationType, "listed": metadata.IsListed})
	a.invalidateDIPCache()
	records, err := a.loadDIPRecords(r.Context(), false)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "dip_reload_failed", "Metadata tersimpan tetapi belum bisa dimuat ulang.")
		return
	}
	for _, record := range records {
		if record.ID == id {
			a.ok(w, http.StatusOK, AdminDIPDocument{Entry: dipEntry(record), Metadata: record.Metadata, Complete: dipMetadataComplete(record.Metadata)}, responseMeta{"cache": string(CacheNone)})
			return
		}
	}
	a.error(w, http.StatusNotFound, "dip_not_found", "Dokumen Informasi Publik tidak ditemukan.")
}

func (a *App) adminDIPSeedSample(w http.ResponseWriter, r *http.Request) {
	if !a.cfg.SampleDataEnabled {
		a.error(w, http.StatusNotFound, "sample_disabled", "Data contoh DIP tidak diaktifkan pada environment ini.")
		return
	}
	if !a.requirePPIDEdit(w, r) {
		return
	}
	result, err := a.seedDIPSample(r.Context())
	if err != nil {
		a.error(w, http.StatusInternalServerError, "dip_seed_failed", "Data contoh DIP belum bisa dibuat: "+err.Error())
		return
	}
	a.invalidateDIPCache()
	a.ok(w, http.StatusOK, result, responseMeta{"cache": string(CacheNone)})
}

func (a *App) publicDocumentContent(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		http.NotFound(w, r)
		return
	}
	record, err := a.eligibleDIPDocument(r.Context(), id, true)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if strings.TrimSpace(record.ExternalURL) != "" {
		target, err := url.Parse(record.ExternalURL)
		if err != nil || target.Host == "" || (target.Scheme != "http" && target.Scheme != "https") {
			http.Error(w, "URL dokumen tidak valid.", http.StatusUnsupportedMediaType)
			return
		}
		http.Redirect(w, r, target.String(), http.StatusFound)
		return
	}

	name := strings.TrimSpace(record.FileName)
	if name == "" || filepath.Base(name) != name {
		http.NotFound(w, r)
		return
	}
	ext := strings.ToLower(filepath.Ext(name))
	contentTypes := map[string]string{".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}
	contentType, supported := contentTypes[ext]
	if !supported {
		http.Error(w, "Format dokumen tidak mendukung pratinjau.", http.StatusUnsupportedMediaType)
		return
	}
	path := filepath.Join(a.cfg.OpenSIDDocumentDir, name)
	file, err := os.Open(path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}
	if detected := mime.TypeByExtension(ext); detected != "" {
		contentType = detected
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Disposition", mime.FormatMediaType("inline", map[string]string{"filename": name}))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "public, max-age=300, must-revalidate")
	http.ServeContent(w, r, name, info.ModTime(), file)
}

func parseDIPFilters(r *http.Request) (dipFilters, error) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if len([]rune(query)) > 100 {
		return dipFilters{}, errors.New("kata pencarian maksimal 100 karakter")
	}
	categoryCode := 0
	if category := strings.TrimSpace(r.URL.Query().Get("category")); category != "" && category != "semua" {
		categoryCode = dipCategoryCode(category)
		if categoryCode == 0 {
			return dipFilters{}, errors.New("kategori DIP tidak valid")
		}
	}
	year := strings.TrimSpace(r.URL.Query().Get("year"))
	if year != "" {
		if len(year) != 4 {
			return dipFilters{}, errors.New("tahun DIP tidak valid")
		}
		if _, err := strconv.Atoi(year); err != nil {
			return dipFilters{}, errors.New("tahun DIP tidak valid")
		}
	}
	page := dipQueryInt(r, "page", 1, 1, 10_000)
	limit := dipQueryInt(r, "limit", 12, 1, 24)
	return dipFilters{Query: query, CategoryCode: categoryCode, Year: year, Page: page, Limit: limit}, nil
}

func dipQueryInt(r *http.Request, key string, fallback, min, max int) int {
	value, err := strconv.Atoi(r.URL.Query().Get(key))
	if err != nil || value < min || value > max {
		return fallback
	}
	return value
}

func (a *App) loadDIPList(ctx context.Context, filters dipFilters) (DIPListPayload, error) {
	records, err := a.loadDIPRecords(ctx, true)
	if err != nil {
		return DIPListPayload{}, err
	}
	categories := map[int]int{1: 0, 2: 0, 3: 0}
	yearSet := map[string]bool{}
	isSample := false
	for _, record := range records {
		categories[record.CategoryCode]++
		if record.Year != "" {
			yearSet[record.Year] = true
		}
		isSample = isSample || dipEntry(record).IsSample
	}

	filtered := make([]dipDocumentRecord, 0, len(records))
	needle := strings.ToLower(filters.Query)
	for _, record := range records {
		if filters.CategoryCode != 0 && record.CategoryCode != filters.CategoryCode {
			continue
		}
		if filters.Year != "" && record.Year != filters.Year {
			continue
		}
		if needle != "" {
			haystack := strings.ToLower(strings.Join([]string{record.Title, record.Metadata.Summary, record.Metadata.ControllingUnit, record.Metadata.ResponsibleOfficial}, " "))
			if !strings.Contains(haystack, needle) {
				continue
			}
		}
		filtered = append(filtered, record)
	}
	total := len(filtered)
	totalPages := 0
	if total > 0 {
		totalPages = (total + filters.Limit - 1) / filters.Limit
	}
	if totalPages > 0 && filters.Page > totalPages {
		filters.Page = totalPages
	}
	start := (filters.Page - 1) * filters.Limit
	if start > total {
		start = total
	}
	end := start + filters.Limit
	if end > total {
		end = total
	}
	items := make([]DIPEntry, 0, end-start)
	for _, record := range filtered[start:end] {
		items = append(items, dipEntry(record))
	}
	years := make([]string, 0, len(yearSet))
	for year := range yearSet {
		years = append(years, year)
	}
	sort.Sort(sort.Reverse(sort.StringSlice(years)))
	facets := make([]DIPFacet, 0, 3)
	for _, code := range []int{1, 2, 3} {
		category := dipCategory(code)
		facets = append(facets, DIPFacet{Code: code, Slug: category.Slug, Label: category.Label, Count: categories[code]})
	}
	return DIPListPayload{Items: items, Categories: facets, Years: years, Pagination: DIPPagination{Page: filters.Page, Limit: filters.Limit, Total: total, TotalPages: totalPages}, IsSample: isSample}, nil
}

func (a *App) loadDIPRecords(ctx context.Context, publicOnly bool) ([]dipDocumentRecord, error) {
	table := "dokumen_hidup"
	if !a.schema.HasTable(ctx, table) {
		table = "dokumen"
	}
	if !a.schema.HasTable(ctx, table) {
		return []dipDocumentRecord{}, nil
	}
	query := `SELECT d.id, IFNULL(d.nama, ''), IFNULL(CAST(d.tahun AS CHAR), ''), IFNULL(d.kategori_info_publik, 0),
IFNULL(CAST(d.published_at AS CHAR), ''), IFNULL(CAST(d.retensi_date AS CHAR), ''), IFNULL(CAST(d.retensi_number AS CHAR), ''),
IFNULL(d.retensi_unit, ''), IFNULL(d.keterangan, ''), IFNULL(d.satuan, ''), IFNULL(d.url, ''), IFNULL(d.tipe, 1), IFNULL(CAST(d.updated_at AS CHAR), ''),
IFNULL(m.publication_type, 'other'), IFNULL(m.summary, ''), IFNULL(m.controlling_unit, ''), IFNULL(m.responsible_official, ''), IFNULL(m.publisher, ''),
IFNULL(CAST(m.created_date AS CHAR), ''), IFNULL(m.created_place, ''), IFNULL(m.update_frequency, ''),
IFNULL(m.is_listed, 0), IFNULL(m.is_sample, 0), IFNULL(m.sort_order, 100), IFNULL(m.version_no, 1)
FROM ` + quoteIdent(table) + ` d
LEFT JOIN yms_dip_metadata m ON m.config_id = d.config_id AND m.document_id = d.id
WHERE d.config_id = ? AND d.enabled = 1 AND d.deleted <> 1 AND d.id_pend IS NULL
AND d.status = 1 AND (d.published_at IS NULL OR d.published_at <= CURDATE())
AND (d.retensi_date IS NULL OR d.retensi_date >= NOW()) AND d.kategori_info_publik IN (1, 2, 3)`
	if publicOnly {
		query += ` AND m.is_listed = 1 AND TRIM(m.summary) <> '' AND TRIM(m.controlling_unit) <> ''
AND TRIM(m.responsible_official) <> '' AND TRIM(m.publisher) <> '' AND m.created_date IS NOT NULL
AND TRIM(m.created_place) <> '' AND TRIM(m.update_frequency) <> ''`
	}
	query += " ORDER BY IFNULL(m.sort_order, 100), COALESCE(d.published_at, DATE(d.updated_at)) DESC, d.id DESC"
	rows, err := a.db.QueryContext(ctx, query, a.cfg.ConfigID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	records := []dipDocumentRecord{}
	for rows.Next() {
		var record dipDocumentRecord
		var listed, sample int
		if err := rows.Scan(
			&record.ID, &record.Title, &record.Year, &record.CategoryCode, &record.PublishedAt, &record.RetentionUntil,
			&record.RetentionNumber, &record.RetentionUnit, &record.Description, &record.FileName, &record.ExternalURL,
			&record.DocumentType, &record.UpdatedAt, &record.Metadata.PublicationType, &record.Metadata.Summary, &record.Metadata.ControllingUnit,
			&record.Metadata.ResponsibleOfficial, &record.Metadata.Publisher, &record.Metadata.CreatedDate,
			&record.Metadata.CreatedPlace, &record.Metadata.UpdateFrequency, &listed, &sample, &record.Metadata.SortOrder, &record.Metadata.Version,
		); err != nil {
			return nil, err
		}
		record.Metadata.DocumentID = record.ID
		record.Metadata.IsListed = listed == 1
		record.Metadata.IsSample = sample == 1
		records = append(records, record)
	}
	return records, rows.Err()
}

func (a *App) eligibleDIPDocument(ctx context.Context, id int64, publicOnly bool) (dipDocumentRecord, error) {
	rows, err := a.loadDIPRecords(ctx, publicOnly)
	if err != nil {
		return dipDocumentRecord{}, err
	}
	for _, record := range rows {
		if record.ID == id {
			return record, nil
		}
	}
	return dipDocumentRecord{}, sql.ErrNoRows
}

func dipEntry(record dipDocumentRecord) DIPEntry {
	isSample := record.Metadata.IsSample || strings.HasPrefix(strings.ToUpper(record.Title), "CONTOH -") || strings.Contains(record.Description, "YMS-SAMPLE-")
	format := "Tautan"
	if record.ExternalURL == "" {
		ext := strings.TrimPrefix(strings.ToUpper(filepath.Ext(record.FileName)), ".")
		if ext != "" {
			format = ext
		}
	}
	return DIPEntry{
		DocumentID: record.ID, Title: record.Title, PublicationType: record.Metadata.PublicationType, Category: dipCategory(record.CategoryCode), Year: record.Year,
		Summary: record.Metadata.Summary, ControllingUnit: record.Metadata.ControllingUnit,
		ResponsibleOfficial: record.Metadata.ResponsibleOfficial, Publisher: record.Metadata.Publisher,
		CreatedDate: record.Metadata.CreatedDate, CreatedPlace: record.Metadata.CreatedPlace,
		UpdateFrequency: record.Metadata.UpdateFrequency, Format: format, PublishedAt: record.PublishedAt,
		RetentionUntil: record.RetentionUntil, RetentionLabel: dipRetentionLabel(record), UpdatedAt: record.UpdatedAt,
		ViewURL: fmt.Sprintf("/dokumen/%d", record.ID), IsSample: isSample,
	}
}

func dipRetentionLabel(record dipDocumentRecord) string {
	if record.RetentionUntil != "" {
		return "Tersedia hingga " + strings.Split(record.RetentionUntil, " ")[0]
	}
	if record.RetentionNumber != "" && record.RetentionNumber != "0" && record.RetentionUnit != "" {
		return record.RetentionNumber + " " + record.RetentionUnit
	}
	return "Selama informasi berlaku"
}

func dipCategory(code int) DIPCategory {
	switch code {
	case 1:
		return DIPCategory{Code: 1, Slug: "berkala", Label: "Informasi Berkala"}
	case 2:
		return DIPCategory{Code: 2, Slug: "serta-merta", Label: "Informasi Serta-merta"}
	default:
		return DIPCategory{Code: 3, Slug: "setiap-saat", Label: "Informasi Setiap Saat"}
	}
}

func dipCategoryCode(value string) int {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "berkala":
		return 1
	case "2", "serta-merta", "serta_merta":
		return 2
	case "3", "setiap-saat", "setiap_saat":
		return 3
	default:
		return 0
	}
}

func validateDIPMetadata(metadata *DIPMetadata) error {
	metadata.PublicationType = strings.ToLower(trimTo(strings.TrimSpace(metadata.PublicationType), 40))
	metadata.Summary = trimTo(strings.TrimSpace(metadata.Summary), 2000)
	metadata.ControllingUnit = trimTo(strings.TrimSpace(metadata.ControllingUnit), 190)
	metadata.ResponsibleOfficial = trimTo(strings.TrimSpace(metadata.ResponsibleOfficial), 190)
	metadata.Publisher = trimTo(strings.TrimSpace(metadata.Publisher), 190)
	metadata.CreatedDate = strings.TrimSpace(metadata.CreatedDate)
	metadata.CreatedPlace = trimTo(strings.TrimSpace(metadata.CreatedPlace), 190)
	metadata.UpdateFrequency = trimTo(strings.TrimSpace(metadata.UpdateFrequency), 120)
	if !validPublicationType(metadata.PublicationType) {
		return errors.New("jenis publikasi tidak valid")
	}
	if metadata.SortOrder < 0 || metadata.SortOrder > 10_000 {
		return errors.New("urutan tampil harus antara 0 dan 10000")
	}
	if metadata.CreatedDate != "" {
		if _, err := time.Parse("2006-01-02", metadata.CreatedDate); err != nil {
			return errors.New("tanggal pembuatan tidak valid")
		}
	}
	if metadata.IsListed && !dipMetadataComplete(*metadata) {
		return errors.New("lengkapi ringkasan, unit penguasa, penanggung jawab, penerbit, tanggal dan tempat pembuatan, serta frekuensi pembaruan sebelum ditampilkan")
	}
	return nil
}

func dipMetadataComplete(metadata DIPMetadata) bool {
	return strings.TrimSpace(metadata.Summary) != "" && strings.TrimSpace(metadata.ControllingUnit) != "" &&
		strings.TrimSpace(metadata.ResponsibleOfficial) != "" && strings.TrimSpace(metadata.Publisher) != "" &&
		strings.TrimSpace(metadata.CreatedDate) != "" && strings.TrimSpace(metadata.CreatedPlace) != "" &&
		strings.TrimSpace(metadata.UpdateFrequency) != ""
}

func validPublicationType(value string) bool {
	switch value {
	case "other", "profile", "planning", "budget", "program", "legal", "meeting", "inventory", "contract", "bumdes", "governance_report", "ppid", "emergency":
		return true
	default:
		return false
	}
}

func (a *App) saveDIPMetadata(ctx context.Context, metadata DIPMetadata) error {
	_, err := a.db.ExecContext(ctx, `INSERT INTO yms_dip_metadata
(config_id, document_id, publication_type, summary, controlling_unit, responsible_official, publisher, created_date, created_place, update_frequency, is_listed, is_sample, sort_order)
VALUES (?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE version_no = version_no + IF(NOT(publication_type <=> VALUES(publication_type) AND summary <=> VALUES(summary) AND controlling_unit <=> VALUES(controlling_unit) AND responsible_official <=> VALUES(responsible_official) AND publisher <=> VALUES(publisher) AND created_date <=> VALUES(created_date) AND created_place <=> VALUES(created_place) AND update_frequency <=> VALUES(update_frequency) AND is_listed <=> VALUES(is_listed) AND sort_order <=> VALUES(sort_order)), 1, 0),
publication_type = VALUES(publication_type), summary = VALUES(summary), controlling_unit = VALUES(controlling_unit), responsible_official = VALUES(responsible_official),
publisher = VALUES(publisher), created_date = VALUES(created_date), created_place = VALUES(created_place), update_frequency = VALUES(update_frequency),
is_listed = VALUES(is_listed), is_sample = VALUES(is_sample), sort_order = VALUES(sort_order), updated_at = NOW()`,
		a.cfg.ConfigID, metadata.DocumentID, metadata.PublicationType, metadata.Summary, metadata.ControllingUnit, metadata.ResponsibleOfficial,
		metadata.Publisher, metadata.CreatedDate, metadata.CreatedPlace, metadata.UpdateFrequency,
		boolInt(metadata.IsListed), boolInt(metadata.IsSample), metadata.SortOrder)
	return err
}

func (a *App) seedDIPSample(ctx context.Context) (map[string]any, error) {
	if _, err := a.seedPPIDSample(ctx); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(a.cfg.OpenSIDDocumentDir, 0o755); err != nil {
		return nil, err
	}
	created, updated := 0, 0
	sampleDocuments := append(append([]dipSampleDefinition{}, dipPhase2SampleDocuments...), dipPhase3SampleDocuments...)
	for _, definition := range sampleDocuments {
		if err := copyFile(filepath.Join(a.cfg.DIPSamplePDFDir, definition.FileName), filepath.Join(a.cfg.OpenSIDDocumentDir, definition.FileName)); err != nil {
			return nil, fmt.Errorf("menyalin %s: %w", definition.FileName, err)
		}
		wasCreated, err := a.upsertDIPSampleDocument(ctx, definition)
		if err != nil {
			return nil, err
		}
		if wasCreated {
			created++
		} else {
			updated++
		}
	}
	createdDate := time.Now().Format("2006-01-02")
	metadataUpserted := 0
	allMetadata := append(append([]dipSampleDefinition{}, sampleDocuments...), dipPhase1SampleMetadata...)
	for _, definition := range allMetadata {
		prefix := "[YMS-SAMPLE-DIP:" + definition.Key + "]%"
		if definition.FileName == "" {
			prefix = "[YMS-SAMPLE-PPID:" + definition.Key + "]%"
		}
		var documentID int64
		if err := a.db.QueryRowContext(ctx, `SELECT id FROM dokumen WHERE config_id = ? AND keterangan LIKE ? ORDER BY id LIMIT 1`, a.cfg.ConfigID, prefix).Scan(&documentID); err != nil {
			return nil, err
		}
		metadata := DIPMetadata{DocumentID: documentID, PublicationType: definition.PublicationType, Summary: definition.Summary, ControllingUnit: definition.ControllingUnit,
			ResponsibleOfficial: definition.ResponsibleOfficial, Publisher: definition.Publisher, CreatedDate: createdDate,
			CreatedPlace: definition.CreatedPlace, UpdateFrequency: definition.UpdateFrequency, IsListed: true, IsSample: true, SortOrder: definition.SortOrder}
		if err := a.saveDIPMetadata(ctx, metadata); err != nil {
			return nil, err
		}
		metadataUpserted++
	}
	return map[string]any{"documentsCreated": created, "documentsUpdated": updated, "metadataUpserted": metadataUpserted, "totalDocuments": len(allMetadata)}, nil
}

func (a *App) upsertDIPSampleDocument(ctx context.Context, definition dipSampleDefinition) (bool, error) {
	marker := "[YMS-SAMPLE-DIP:" + definition.Key + "] DRAFT / CONTOH - BELUM DITETAPKAN"
	var id int64
	err := a.db.QueryRowContext(ctx, `SELECT id FROM dokumen WHERE config_id = ? AND keterangan LIKE ? ORDER BY id LIMIT 1`, a.cfg.ConfigID, "[YMS-SAMPLE-DIP:"+definition.Key+"]%").Scan(&id)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return false, err
	}
	if errors.Is(err, sql.ErrNoRows) {
		_, err = a.db.ExecContext(ctx, `INSERT INTO dokumen
(config_id, satuan, nama, enabled, tgl_upload, id_pend, kategori, attr, tipe, url, tahun, kategori_info_publik, updated_at, deleted, created_at, keterangan, status, published_at, retensi_number, retensi_unit)
VALUES (?, ?, ?, 1, NOW(), NULL, 1, '{}', 1, NULL, YEAR(CURDATE()), ?, NOW(), 0, NOW(), ?, 1, CURDATE(), 0, 'tahun')`,
			a.cfg.ConfigID, definition.FileName, definition.Title, definition.CategoryCode, marker)
		return true, err
	}
	_, err = a.db.ExecContext(ctx, `UPDATE dokumen SET satuan = ?, nama = ?, enabled = 1, deleted = 0, kategori = 1,
kategori_info_publik = ?, keterangan = ?, status = 1, published_at = CURDATE(), updated_at = NOW() WHERE id = ? AND config_id = ?`,
		definition.FileName, definition.Title, definition.CategoryCode, marker, id, a.cfg.ConfigID)
	return false, err
}

func (a *App) invalidateDIPCache() {
	a.cache.InvalidatePrefix("public:dip:")
	a.cache.InvalidatePrefix("public:publications:")
}
