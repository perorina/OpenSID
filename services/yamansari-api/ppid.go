package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const ppidModuleSlug = "informasi-publik"

type PPIDProfile struct {
	SupervisorPamongID     int64  `json:"supervisorPamongId"`
	PPIDPamongID           int64  `json:"ppidPamongId"`
	ServiceOfficerPamongID int64  `json:"serviceOfficerPamongId"`
	ServiceAddress         string `json:"serviceAddress"`
	ServiceSchedule        string `json:"serviceSchedule"`
	Phone                  string `json:"phone"`
	Email                  string `json:"email"`
	FeePolicy              string `json:"feePolicy"`
	ServiceCommitment      string `json:"serviceCommitment"`
	ResponseDays           int    `json:"responseDays"`
	ExtensionDays          int    `json:"extensionDays"`
	IsPublished            bool   `json:"isPublished"`
	IsSample               bool   `json:"isSample"`
	UpdatedAt              string `json:"updatedAt,omitempty"`
}

type PPIDPamong struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Position string `json:"position"`
	PhotoURL any    `json:"photoUrl"`
	Order    int64  `json:"order"`
}

type PPIDOfficial struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Role       string `json:"role"`
	Position   string `json:"position"`
	PhotoURL   any    `json:"photoUrl"`
	IsFallback bool   `json:"isFallback"`
}

type PPIDDocument struct {
	ID             int64  `json:"id"`
	Title          string `json:"title"`
	Year           string `json:"year,omitempty"`
	Category       string `json:"category"`
	PublishedAt    string `json:"publishedAt,omitempty"`
	RetentionUntil string `json:"retentionUntil,omitempty"`
	Description    string `json:"description,omitempty"`
	URL            any    `json:"url"`
	IsSample       bool   `json:"isSample"`
}

type PPIDPublicPayload struct {
	Profile   PPIDProfile    `json:"profile"`
	Officials []PPIDOfficial `json:"officials"`
	Documents []PPIDDocument `json:"documents"`
	IsSample  bool           `json:"isSample"`
}

type PPIDAdminPayload struct {
	PPIDPublicPayload
	PamongOptions   []PPIDPamong `json:"pamongOptions"`
	CanEdit         bool         `json:"canEdit"`
	SampleAvailable bool         `json:"sampleAvailable"`
	OpenSIDAdminURL string       `json:"openSidAdminUrl"`
}

type ppidSampleDocument struct {
	Key      string
	FileName string
	Title    string
}

var ppidSampleDocuments = []ppidSampleDocument{
	{Key: "sk-penetapan", FileName: "contoh-sk-penetapan-ppid-desa-yamansari.pdf", Title: "CONTOH - SK Penetapan PPID Desa Yamansari"},
	{Key: "perdes-kip", FileName: "contoh-perdes-keterbukaan-informasi-publik.pdf", Title: "CONTOH - Perdes Keterbukaan Informasi Publik"},
	{Key: "sop-layanan", FileName: "contoh-sop-pelayanan-informasi-publik.pdf", Title: "CONTOH - SOP Pelayanan Informasi Publik"},
	{Key: "maklumat", FileName: "contoh-maklumat-pelayanan-informasi-publik.pdf", Title: "CONTOH - Maklumat Pelayanan Informasi Publik"},
}

func (a *App) publicPPID(w http.ResponseWriter, r *http.Request) {
	key := fmt.Sprintf("public:ppid:config:%d", a.cfg.ConfigID)
	a.cachedPublic(w, r, key, 5*time.Minute, 2*time.Minute, func(ctx context.Context) (any, error) {
		return a.loadPPIDPublic(ctx)
	})
}

func (a *App) adminPPID(w http.ResponseWriter, r *http.Request) {
	user := adminUserFromContext(r.Context())
	access, err := a.ppidAccessLevel(r.Context(), user)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "ppid_access_failed", "Hak akses PPID belum bisa diperiksa.")
		return
	}
	if access < 1 {
		a.error(w, http.StatusForbidden, "ppid_forbidden", "Akun ini tidak memiliki akses Informasi Publik.")
		return
	}

	public, options, err := a.loadPPIDData(r.Context())
	if err != nil {
		a.error(w, http.StatusServiceUnavailable, "ppid_unavailable", "Data PPID belum bisa dibaca.")
		return
	}

	a.ok(w, http.StatusOK, PPIDAdminPayload{
		PPIDPublicPayload: public,
		PamongOptions:     options,
		CanEdit:           access >= 3,
		SampleAvailable:   a.cfg.SampleDataEnabled,
		OpenSIDAdminURL:   a.cfg.OpenSIDBaseURL + "/index.php/siteman/dokumen",
	}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminPPIDUpdate(w http.ResponseWriter, r *http.Request) {
	if !a.requirePPIDEdit(w, r) {
		return
	}

	var payload PPIDProfile
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<10)).Decode(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Data profil PPID tidak valid.")
		return
	}
	if err := a.validatePPIDProfile(r.Context(), &payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_ppid_profile", err.Error())
		return
	}
	if err := a.savePPIDProfile(r.Context(), payload); err != nil {
		a.error(w, http.StatusInternalServerError, "ppid_save_failed", "Profil PPID belum bisa disimpan.")
		return
	}

	a.invalidatePPIDCache()
	data, err := a.loadPPIDPublic(r.Context())
	if err != nil {
		a.error(w, http.StatusInternalServerError, "ppid_reload_failed", "Profil tersimpan tetapi belum bisa dimuat ulang.")
		return
	}
	a.ok(w, http.StatusOK, data, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminPPIDSeedSample(w http.ResponseWriter, r *http.Request) {
	if !a.cfg.SampleDataEnabled {
		a.error(w, http.StatusNotFound, "sample_disabled", "Data contoh PPID tidak diaktifkan pada environment ini.")
		return
	}
	if !a.requirePPIDEdit(w, r) {
		return
	}

	result, err := a.seedPPIDSample(r.Context())
	if err != nil {
		a.error(w, http.StatusInternalServerError, "ppid_seed_failed", "Data contoh PPID belum bisa dibuat: "+err.Error())
		return
	}
	a.invalidatePPIDCache()
	a.ok(w, http.StatusOK, result, responseMeta{"cache": string(CacheNone)})
}

func (a *App) loadPPIDPublic(ctx context.Context) (PPIDPublicPayload, error) {
	data, _, err := a.loadPPIDData(ctx)
	if err != nil {
		return PPIDPublicPayload{}, err
	}
	if !data.Profile.IsPublished {
		data.Profile = PPIDProfile{IsPublished: false}
		data.Officials = []PPIDOfficial{}
		data.Documents = []PPIDDocument{}
		data.IsSample = false
	}
	return data, nil
}

func (a *App) loadPPIDData(ctx context.Context) (PPIDPublicPayload, []PPIDPamong, error) {
	options, err := a.loadPPIDPamong(ctx)
	if err != nil {
		return PPIDPublicPayload{}, nil, err
	}
	profile, err := a.loadPPIDProfile(ctx, options)
	if err != nil {
		return PPIDPublicPayload{}, nil, err
	}
	documents, err := a.loadPPIDDocuments(ctx)
	if err != nil {
		return PPIDPublicPayload{}, nil, err
	}
	officials := resolvePPIDOfficials(profile, options)
	isSample := profile.IsSample
	for _, document := range documents {
		isSample = isSample || document.IsSample
	}

	return PPIDPublicPayload{Profile: profile, Officials: officials, Documents: documents, IsSample: isSample}, options, nil
}

func (a *App) loadPPIDProfile(ctx context.Context, options []PPIDPamong) (PPIDProfile, error) {
	row := a.db.QueryRowContext(ctx, `SELECT IFNULL(supervisor_pamong_id, 0), IFNULL(ppid_pamong_id, 0), IFNULL(service_officer_pamong_id, 0),
service_address, service_schedule, IFNULL(phone, ''), IFNULL(email, ''), fee_policy, service_commitment,
response_days, extension_days, is_published, is_sample, CAST(updated_at AS CHAR)
FROM yms_ppid_profiles WHERE config_id = ? LIMIT 1`, a.cfg.ConfigID)

	var profile PPIDProfile
	var published, sample int
	if err := row.Scan(
		&profile.SupervisorPamongID, &profile.PPIDPamongID, &profile.ServiceOfficerPamongID,
		&profile.ServiceAddress, &profile.ServiceSchedule, &profile.Phone, &profile.Email,
		&profile.FeePolicy, &profile.ServiceCommitment, &profile.ResponseDays, &profile.ExtensionDays,
		&published, &sample, &profile.UpdatedAt,
	); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return PPIDProfile{}, err
		}
		return a.defaultPPIDProfile(ctx, options)
	}
	profile.IsPublished = published == 1
	profile.IsSample = sample == 1
	return profile, nil
}

func (a *App) defaultPPIDProfile(ctx context.Context, options []PPIDPamong) (PPIDProfile, error) {
	config, err := a.queryConfig(ctx)
	if err != nil {
		return PPIDProfile{}, err
	}
	supervisorID, ppidID := defaultPPIDPamongIDs(options)
	return PPIDProfile{
		SupervisorPamongID:     supervisorID,
		PPIDPamongID:           ppidID,
		ServiceOfficerPamongID: ppidID,
		ServiceAddress:         strValue(config, "alamat_kantor", "Kantor Desa Yamansari"),
		ServiceSchedule:        "Senin-Jumat, 08.00-14.00 WIB",
		Phone:                  strValue(config, "telepon", "0283 619 2025"),
		Email:                  strValue(config, "email_desa", "ppid@yamansari.desa.id"),
		FeePolicy:              "Layanan informasi tidak dipungut biaya; penggandaan fisik mengikuti biaya nyata.",
		ServiceCommitment:      "Melayani informasi publik secara cepat, tepat, sederhana, dan dapat dipertanggungjawabkan.",
		ResponseDays:           10,
		ExtensionDays:          7,
		IsPublished:            false,
		IsSample:               true,
	}, nil
}

func (a *App) loadPPIDPamong(ctx context.Context) ([]PPIDPamong, error) {
	if !a.schema.HasTable(ctx, "tweb_desa_pamong") {
		return []PPIDPamong{}, nil
	}

	nameExpr := "IFNULL(p.pamong_nama, '')"
	positionExpr := "''"
	join := ""
	if a.schema.HasTable(ctx, "tweb_penduduk") {
		join += " LEFT JOIN tweb_penduduk pend ON pend.id = p.id_pend"
		nameExpr = "IFNULL(COALESCE(pend.nama, p.pamong_nama), '')"
	}
	if a.schema.HasTable(ctx, "ref_jabatan") {
		join += " LEFT JOIN ref_jabatan j ON j.id = p.jabatan_id"
		positionExpr = "IFNULL(j.nama, '')"
	}
	clauses, args := a.configClauses(ctx, "tweb_desa_pamong", "p", false)
	if a.schema.HasColumn(ctx, "tweb_desa_pamong", "pamong_status") {
		clauses = append(clauses, "p.pamong_status = 1")
	}

	query := "SELECT p.pamong_id, " + nameExpr + ", " + positionExpr + ", IFNULL(p.foto, ''), IFNULL(p.urut, 9999) FROM tweb_desa_pamong p" + join + whereSQL(clauses) + " ORDER BY IFNULL(p.urut, 9999), p.pamong_id"
	rows, err := a.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []PPIDPamong{}
	for rows.Next() {
		var item PPIDPamong
		var photo string
		if err := rows.Scan(&item.ID, &item.Name, &item.Position, &photo, &item.Order); err != nil {
			return nil, err
		}
		item.PhotoURL = a.pamongImageURL(photo)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (a *App) loadPPIDDocuments(ctx context.Context) ([]PPIDDocument, error) {
	table := "dokumen_hidup"
	if !a.schema.HasTable(ctx, table) {
		table = "dokumen"
	}
	if !a.schema.HasTable(ctx, table) {
		return []PPIDDocument{}, nil
	}

	clauses, args := a.configClauses(ctx, table, "d", false)
	for column, condition := range map[string]string{
		"enabled":              "d.enabled = 1",
		"deleted":              "d.deleted <> 1",
		"id_pend":              "d.id_pend IS NULL",
		"kategori":             "d.kategori = 1",
		"kategori_info_publik": "d.kategori_info_publik = 3",
		"status":               "d.status = 1",
		"published_at":         "(d.published_at IS NULL OR d.published_at <= CURDATE())",
		"retensi_date":         "(d.retensi_date IS NULL OR d.retensi_date >= NOW())",
	} {
		if a.schema.HasColumn(ctx, table, column) {
			clauses = append(clauses, condition)
		}
	}

	expr := func(column string) string {
		if a.schema.HasColumn(ctx, table, column) {
			return "IFNULL(CAST(d." + quoteIdent(column) + " AS CHAR), '')"
		}
		return "''"
	}
	orderExpr := "d.id"
	if a.schema.HasColumn(ctx, table, "published_at") && a.schema.HasColumn(ctx, table, "tgl_upload") {
		orderExpr = "COALESCE(d.published_at, d.tgl_upload)"
	} else if a.schema.HasColumn(ctx, table, "published_at") {
		orderExpr = "d.published_at"
	} else if a.schema.HasColumn(ctx, table, "tgl_upload") {
		orderExpr = "d.tgl_upload"
	}
	query := "SELECT d.id, IFNULL(d.nama, ''), " + expr("tahun") + ", " + expr("published_at") + ", " + expr("retensi_date") + ", " + expr("keterangan") + ", " + expr("satuan") + ", " + expr("url") + " FROM " + quoteIdent(table) + " d" + whereSQL(clauses) + " ORDER BY " + orderExpr + " DESC, d.id DESC LIMIT 24"
	rows, err := a.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	documents := []PPIDDocument{}
	for rows.Next() {
		var item PPIDDocument
		var file, external string
		if err := rows.Scan(&item.ID, &item.Title, &item.Year, &item.PublishedAt, &item.RetentionUntil, &item.Description, &file, &external); err != nil {
			return nil, err
		}
		item.Category = "Informasi Setiap Saat"
		item.URL = fmt.Sprintf("/dokumen/%d", item.ID)
		item.IsSample = strings.Contains(item.Description, "[YMS-SAMPLE-PPID:") || strings.HasPrefix(strings.ToUpper(item.Title), "CONTOH -")
		documents = append(documents, item)
	}
	return documents, rows.Err()
}

func resolvePPIDOfficials(profile PPIDProfile, options []PPIDPamong) []PPIDOfficial {
	supervisorDefault, ppidDefault := defaultPPIDPamongIDs(options)
	ids := []struct {
		ID       int64
		Fallback int64
		Role     string
	}{
		{profile.SupervisorPamongID, supervisorDefault, "Atasan PPID"},
		{profile.PPIDPamongID, ppidDefault, "PPID Desa"},
		{profile.ServiceOfficerPamongID, ppidDefault, "Petugas Layanan"},
	}
	byID := make(map[int64]PPIDPamong, len(options))
	for _, option := range options {
		byID[option.ID] = option
	}

	officials := make([]PPIDOfficial, 0, len(ids))
	for _, role := range ids {
		selectedID := role.ID
		item, ok := byID[selectedID]
		fallback := false
		if !ok {
			selectedID = role.Fallback
			item, ok = byID[selectedID]
			fallback = true
		}
		if !ok {
			continue
		}
		officials = append(officials, PPIDOfficial{ID: item.ID, Name: item.Name, Role: role.Role, Position: item.Position, PhotoURL: item.PhotoURL, IsFallback: fallback})
	}
	return officials
}

func defaultPPIDPamongIDs(options []PPIDPamong) (int64, int64) {
	var supervisorID, ppidID int64
	for _, option := range options {
		position := strings.ToLower(strings.TrimSpace(option.Position))
		if supervisorID == 0 && strings.Contains(position, "kepala desa") {
			supervisorID = option.ID
		}
		if ppidID == 0 && strings.Contains(position, "sekretaris") {
			ppidID = option.ID
		}
	}
	return supervisorID, ppidID
}

func (a *App) validatePPIDProfile(ctx context.Context, profile *PPIDProfile) error {
	profile.ServiceAddress = trimTo(strings.TrimSpace(profile.ServiceAddress), 255)
	profile.ServiceSchedule = trimTo(strings.TrimSpace(profile.ServiceSchedule), 180)
	profile.Phone = trimTo(strings.TrimSpace(profile.Phone), 40)
	profile.Email = trimTo(strings.TrimSpace(profile.Email), 190)
	profile.FeePolicy = trimTo(strings.TrimSpace(profile.FeePolicy), 255)
	profile.ServiceCommitment = trimTo(strings.TrimSpace(profile.ServiceCommitment), 2000)

	if profile.ServiceAddress == "" || profile.ServiceSchedule == "" || profile.FeePolicy == "" || profile.ServiceCommitment == "" {
		return errors.New("alamat, jadwal, kebijakan biaya, dan maklumat wajib diisi")
	}
	if profile.Phone == "" && profile.Email == "" {
		return errors.New("isi sedikitnya satu kanal telepon atau email")
	}
	if profile.Email != "" {
		address, err := mail.ParseAddress(profile.Email)
		if err != nil || !strings.EqualFold(address.Address, profile.Email) {
			return errors.New("format email PPID tidak valid")
		}
	}
	if profile.ResponseDays < 1 || profile.ResponseDays > 30 || profile.ExtensionDays < 0 || profile.ExtensionDays > 14 {
		return errors.New("tenggat jawaban harus 1-30 hari dan perpanjangan 0-14 hari")
	}

	options, err := a.loadPPIDPamong(ctx)
	if err != nil {
		return err
	}
	validIDs := make(map[int64]bool, len(options))
	for _, option := range options {
		validIDs[option.ID] = true
	}
	if !validIDs[profile.SupervisorPamongID] || !validIDs[profile.PPIDPamongID] {
		return errors.New("Atasan PPID dan PPID harus dipilih dari pamong aktif")
	}
	if profile.ServiceOfficerPamongID == 0 {
		profile.ServiceOfficerPamongID = profile.PPIDPamongID
	}
	if !validIDs[profile.ServiceOfficerPamongID] {
		return errors.New("petugas layanan harus dipilih dari pamong aktif")
	}
	return nil
}

func (a *App) savePPIDProfile(ctx context.Context, profile PPIDProfile) error {
	_, err := a.db.ExecContext(ctx, `INSERT INTO yms_ppid_profiles
(config_id, supervisor_pamong_id, ppid_pamong_id, service_officer_pamong_id, service_address, service_schedule, phone, email, fee_policy, service_commitment, response_days, extension_days, is_published, is_sample)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE supervisor_pamong_id = VALUES(supervisor_pamong_id), ppid_pamong_id = VALUES(ppid_pamong_id),
service_officer_pamong_id = VALUES(service_officer_pamong_id), service_address = VALUES(service_address), service_schedule = VALUES(service_schedule),
phone = VALUES(phone), email = VALUES(email), fee_policy = VALUES(fee_policy), service_commitment = VALUES(service_commitment),
response_days = VALUES(response_days), extension_days = VALUES(extension_days), is_published = VALUES(is_published), is_sample = VALUES(is_sample), updated_at = NOW()`,
		a.cfg.ConfigID, profile.SupervisorPamongID, profile.PPIDPamongID, profile.ServiceOfficerPamongID,
		profile.ServiceAddress, profile.ServiceSchedule, nilString(profile.Phone), nilString(profile.Email),
		profile.FeePolicy, profile.ServiceCommitment, profile.ResponseDays, profile.ExtensionDays,
		boolInt(profile.IsPublished), boolInt(profile.IsSample))
	return err
}

func (a *App) ppidAccessLevel(ctx context.Context, user *AdminUser) (int, error) {
	if user == nil || !a.schema.HasTable(ctx, "grup_akses") || !a.schema.HasTable(ctx, "setting_modul") {
		return 0, nil
	}
	var access sql.NullInt64
	err := a.db.QueryRowContext(ctx, `SELECT MAX(ga.akses)
FROM grup_akses ga
JOIN setting_modul sm ON sm.id = ga.id_modul
WHERE ga.id_grup = ? AND (ga.config_id = ? OR ga.config_id IS NULL) AND sm.slug IN (?, ?)`,
		user.IDGrup, a.cfg.ConfigID, ppidModuleSlug, ppidModuleSlug+"-1").Scan(&access)
	if err != nil {
		return 0, err
	}
	if !access.Valid {
		return 0, nil
	}
	return int(access.Int64), nil
}

func (a *App) requirePPIDEdit(w http.ResponseWriter, r *http.Request) bool {
	access, err := a.ppidAccessLevel(r.Context(), adminUserFromContext(r.Context()))
	if err != nil {
		a.error(w, http.StatusInternalServerError, "ppid_access_failed", "Hak akses PPID belum bisa diperiksa.")
		return false
	}
	if access < 3 {
		a.error(w, http.StatusForbidden, "ppid_forbidden", "Akun ini tidak memiliki izin mengubah Informasi Publik.")
		return false
	}
	return true
}

func (a *App) seedPPIDSample(ctx context.Context) (map[string]any, error) {
	options, err := a.loadPPIDPamong(ctx)
	if err != nil {
		return nil, err
	}
	profile, err := a.defaultPPIDProfile(ctx, options)
	if err != nil {
		return nil, err
	}
	profile.IsPublished = true
	profile.IsSample = true
	if err := a.validatePPIDProfile(ctx, &profile); err != nil {
		return nil, err
	}
	if err := a.savePPIDProfile(ctx, profile); err != nil {
		return nil, err
	}

	if err := os.MkdirAll(a.cfg.OpenSIDDocumentDir, 0o755); err != nil {
		return nil, fmt.Errorf("membuat direktori dokumen: %w", err)
	}
	created, updated := 0, 0
	for _, document := range ppidSampleDocuments {
		source := filepath.Join(a.cfg.PPIDSamplePDFDir, document.FileName)
		destination := filepath.Join(a.cfg.OpenSIDDocumentDir, document.FileName)
		if err := copyFile(source, destination); err != nil {
			return nil, fmt.Errorf("menyalin %s: %w", document.FileName, err)
		}
		wasCreated, err := a.upsertPPIDSampleDocument(ctx, document)
		if err != nil {
			return nil, err
		}
		if wasCreated {
			created++
		} else {
			updated++
		}
	}
	return map[string]any{"profileSeeded": true, "documentsCreated": created, "documentsUpdated": updated}, nil
}

func (a *App) upsertPPIDSampleDocument(ctx context.Context, document ppidSampleDocument) (bool, error) {
	marker := "[YMS-SAMPLE-PPID:" + document.Key + "] DRAFT / CONTOH - BELUM DITETAPKAN"
	var id int64
	err := a.db.QueryRowContext(ctx, `SELECT id FROM dokumen WHERE config_id = ? AND keterangan LIKE ? ORDER BY id LIMIT 1`, a.cfg.ConfigID, "[YMS-SAMPLE-PPID:"+document.Key+"]%").Scan(&id)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return false, err
	}

	if errors.Is(err, sql.ErrNoRows) {
		_, err = a.db.ExecContext(ctx, `INSERT INTO dokumen
(config_id, satuan, nama, enabled, tgl_upload, id_pend, kategori, attr, tipe, url, tahun, kategori_info_publik, updated_at, deleted, created_at, keterangan, status, published_at, retensi_number, retensi_unit)
VALUES (?, ?, ?, 1, NOW(), NULL, 1, '{}', 1, NULL, YEAR(CURDATE()), 3, NOW(), 0, NOW(), ?, 1, CURDATE(), 0, 'tahun')`,
			a.cfg.ConfigID, document.FileName, document.Title, marker)
		return true, err
	}

	_, err = a.db.ExecContext(ctx, `UPDATE dokumen SET satuan = ?, nama = ?, enabled = 1, deleted = 0, kategori = 1,
kategori_info_publik = 3, keterangan = ?, status = 1, published_at = CURDATE(), updated_at = NOW() WHERE id = ? AND config_id = ?`,
		document.FileName, document.Title, marker, id, a.cfg.ConfigID)
	return false, err
}

func (a *App) invalidatePPIDCache() {
	a.cache.InvalidatePrefix(fmt.Sprintf("public:ppid:config:%d", a.cfg.ConfigID))
}

func copyFile(source, destination string) error {
	in, err := os.Open(source)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.Create(destination)
	if err != nil {
		return err
	}
	if _, err = io.Copy(out, in); err != nil {
		_ = out.Close()
		return err
	}
	if err := out.Close(); err != nil {
		return err
	}
	return os.Chmod(destination, 0o644)
}

func boolInt(value bool) int {
	if value {
		return 1
	}
	return 0
}
