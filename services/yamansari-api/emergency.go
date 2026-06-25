package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

type Emergency struct {
	ID              int64  `json:"id"`
	Title           string `json:"title"`
	Severity        string `json:"severity"`
	Status          string `json:"status"`
	StatusLabel     string `json:"statusLabel"`
	OccurredAt      string `json:"occurredAt"`
	Location        string `json:"location"`
	AffectedArea    string `json:"affectedArea"`
	Instructions    string `json:"instructions"`
	EvacuationRoute string `json:"evacuationRoute,omitempty"`
	SafePlace       string `json:"safePlace,omitempty"`
	AidChannel      string `json:"aidChannel,omitempty"`
	ActionTaken     string `json:"actionTaken,omitempty"`
	ContactName     string `json:"contactName,omitempty"`
	ContactPhone    string `json:"contactPhone,omitempty"`
	PublishedAt     string `json:"publishedAt,omitempty"`
	ResolvedAt      string `json:"resolvedAt,omitempty"`
	UpdatedAt       string `json:"updatedAt"`
	IsSample        bool   `json:"isSample"`
}

func (a *App) adminEmergencies(w http.ResponseWriter, r *http.Request) {
	access, err := a.ppidAccessLevel(r.Context(), adminUserFromContext(r.Context()))
	if err != nil || access < 1 {
		a.error(w, http.StatusForbidden, "emergency_forbidden", "Akun ini tidak memiliki akses informasi darurat.")
		return
	}
	items, err := a.loadEmergencyRecords(r.Context(), false)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "emergency_failed", "Informasi darurat belum bisa dimuat.")
		return
	}
	a.ok(w, http.StatusOK, map[string]any{"items": items, "canEdit": access >= 3, "sampleAvailable": a.cfg.SampleDataEnabled}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminCreateEmergency(w http.ResponseWriter, r *http.Request) {
	if !a.requirePPIDEdit(w, r) {
		return
	}
	var item Emergency
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 48<<10)).Decode(&item); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Informasi darurat tidak valid.")
		return
	}
	if err := validateEmergency(&item); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_emergency", err.Error())
		return
	}
	user := adminUserFromContext(r.Context())
	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "emergency_failed", "Informasi darurat belum bisa dibuat.")
		return
	}
	published := any(nil)
	resolved := any(nil)
	if item.Status == "published" {
		published = time.Now()
	}
	if item.Status == "resolved" {
		published, resolved = time.Now(), time.Now()
	}
	result, err := tx.ExecContext(r.Context(), `INSERT INTO yms_emergencies
(config_id,title,severity,status,occurred_at,location,affected_area,instructions,evacuation_route,safe_place,aid_channel,action_taken,contact_name,contact_phone,published_at,resolved_at,created_by,updated_by)
VALUES (?,?,?,?,?,?,?,?,NULLIF(?,''),NULLIF(?,''),NULLIF(?,''),NULLIF(?,''),NULLIF(?,''),NULLIF(?,''),?,?,?,?)`, a.cfg.ConfigID, item.Title, item.Severity, item.Status, item.OccurredAt, item.Location, item.AffectedArea, item.Instructions, item.EvacuationRoute, item.SafePlace, item.AidChannel, item.ActionTaken, item.ContactName, item.ContactPhone, published, resolved, user.ID, user.ID)
	if err != nil {
		_ = tx.Rollback()
		a.error(w, http.StatusInternalServerError, "emergency_failed", "Informasi darurat belum bisa dibuat.")
		return
	}
	id, _ := result.LastInsertId()
	if err := auditTx(r.Context(), tx, a.cfg.ConfigID, user, user.Nama, "emergency", id, "created", map[string]any{"status": item.Status, "severity": item.Severity}); err != nil {
		_ = tx.Rollback()
		a.error(w, http.StatusInternalServerError, "audit_failed", "Informasi darurat belum bisa dicatat.")
		return
	}
	if err := tx.Commit(); err != nil {
		a.error(w, http.StatusInternalServerError, "emergency_failed", "Informasi darurat belum bisa dibuat.")
		return
	}
	a.invalidateEmergencyCache()
	created, _ := a.loadEmergencyByID(r.Context(), id)
	a.ok(w, http.StatusCreated, created, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminUpdateEmergency(w http.ResponseWriter, r *http.Request) {
	if !a.requirePPIDEdit(w, r) {
		return
	}
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		a.error(w, http.StatusNotFound, "emergency_not_found", "Informasi darurat tidak ditemukan.")
		return
	}
	current, err := a.loadEmergencyByID(r.Context(), id)
	if err != nil {
		a.error(w, http.StatusNotFound, "emergency_not_found", "Informasi darurat tidak ditemukan.")
		return
	}
	var item Emergency
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 48<<10)).Decode(&item); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Informasi darurat tidak valid.")
		return
	}
	if err := validateEmergency(&item); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_emergency", err.Error())
		return
	}
	published := current.PublishedAt
	resolved := current.ResolvedAt
	if item.Status == "published" && published == "" {
		published = time.Now().Format("2006-01-02 15:04:05")
	}
	if item.Status == "resolved" && resolved == "" {
		resolved = time.Now().Format("2006-01-02 15:04:05")
	}
	if item.Status == "draft" {
		published, resolved = "", ""
	}
	user := adminUserFromContext(r.Context())
	tx, err := a.db.BeginTx(r.Context(), nil)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "emergency_failed", "Informasi darurat belum bisa diperbarui.")
		return
	}
	_, err = tx.ExecContext(r.Context(), `UPDATE yms_emergencies SET title=?,severity=?,status=?,occurred_at=?,location=?,affected_area=?,instructions=?,evacuation_route=NULLIF(?,''),safe_place=NULLIF(?,''),aid_channel=NULLIF(?,''),action_taken=NULLIF(?,''),contact_name=NULLIF(?,''),contact_phone=NULLIF(?,''),published_at=NULLIF(?,''),resolved_at=NULLIF(?,''),updated_by=?,updated_at=NOW() WHERE config_id=? AND id=?`, item.Title, item.Severity, item.Status, item.OccurredAt, item.Location, item.AffectedArea, item.Instructions, item.EvacuationRoute, item.SafePlace, item.AidChannel, item.ActionTaken, item.ContactName, item.ContactPhone, published, resolved, user.ID, a.cfg.ConfigID, id)
	if err == nil {
		err = auditTx(r.Context(), tx, a.cfg.ConfigID, user, user.Nama, "emergency", id, "updated", map[string]any{"from": current.Status, "to": item.Status, "severity": item.Severity})
	}
	if err != nil {
		_ = tx.Rollback()
		a.error(w, http.StatusInternalServerError, "emergency_failed", "Informasi darurat belum bisa diperbarui.")
		return
	}
	if err := tx.Commit(); err != nil {
		a.error(w, http.StatusInternalServerError, "emergency_failed", "Informasi darurat belum bisa diperbarui.")
		return
	}
	a.invalidateEmergencyCache()
	updated, _ := a.loadEmergencyByID(r.Context(), id)
	a.ok(w, http.StatusOK, updated, responseMeta{"cache": string(CacheNone)})
}

func validateEmergency(item *Emergency) error {
	item.Title = trimTo(item.Title, 190)
	item.Severity = strings.ToLower(trimTo(item.Severity, 20))
	item.Status = strings.ToLower(trimTo(item.Status, 20))
	item.OccurredAt = strings.TrimSpace(item.OccurredAt)
	item.Location = trimTo(item.Location, 255)
	item.AffectedArea = trimTo(item.AffectedArea, 3000)
	item.Instructions = trimTo(item.Instructions, 5000)
	item.EvacuationRoute = trimTo(item.EvacuationRoute, 3000)
	item.SafePlace = trimTo(item.SafePlace, 255)
	item.AidChannel = trimTo(item.AidChannel, 3000)
	item.ActionTaken = trimTo(item.ActionTaken, 3000)
	item.ContactName = trimTo(item.ContactName, 120)
	item.ContactPhone = trimTo(onlyDigits(item.ContactPhone), 20)
	if item.Title == "" || item.OccurredAt == "" || item.Location == "" || item.AffectedArea == "" || item.Instructions == "" {
		return errors.New("judul, waktu, lokasi, wilayah terdampak, dan instruksi wajib diisi")
	}
	if item.Severity != "info" && item.Severity != "warning" && item.Severity != "critical" {
		return errors.New("tingkat kedaruratan tidak valid")
	}
	if item.Status != "draft" && item.Status != "published" && item.Status != "resolved" {
		return errors.New("status informasi darurat tidak valid")
	}
	if _, err := time.Parse("2006-01-02T15:04", strings.TrimSuffix(item.OccurredAt, ":00")); err != nil {
		if _, secondErr := time.Parse("2006-01-02 15:04:05", item.OccurredAt); secondErr != nil {
			return errors.New("waktu kejadian tidak valid")
		}
	}
	if item.Status != "draft" && (item.SafePlace == "" || item.AidChannel == "" || item.ActionTaken == "") {
		return errors.New("tempat aman, kanal bantuan, dan tindakan pemerintah wajib diisi sebelum diterbitkan")
	}
	return nil
}

func (a *App) loadEmergencyRecords(ctx context.Context, publicOnly bool) ([]Emergency, error) {
	query := `SELECT id,title,severity,status,CAST(occurred_at AS CHAR),location,affected_area,instructions,IFNULL(evacuation_route,''),IFNULL(safe_place,''),IFNULL(aid_channel,''),IFNULL(action_taken,''),IFNULL(contact_name,''),IFNULL(contact_phone,''),IFNULL(CAST(published_at AS CHAR),''),IFNULL(CAST(resolved_at AS CHAR),''),CAST(updated_at AS CHAR),is_sample FROM yms_emergencies WHERE config_id=?`
	if publicOnly {
		query += ` AND (status='published' OR (status='resolved' AND resolved_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)))`
	}
	query += ` ORDER BY FIELD(status,'published','resolved','draft'),occurred_at DESC,id DESC LIMIT 50`
	rows, err := a.db.QueryContext(ctx, query, a.cfg.ConfigID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []Emergency{}
	for rows.Next() {
		var item Emergency
		var sample int
		if err := rows.Scan(&item.ID, &item.Title, &item.Severity, &item.Status, &item.OccurredAt, &item.Location, &item.AffectedArea, &item.Instructions, &item.EvacuationRoute, &item.SafePlace, &item.AidChannel, &item.ActionTaken, &item.ContactName, &item.ContactPhone, &item.PublishedAt, &item.ResolvedAt, &item.UpdatedAt, &sample); err != nil {
			return nil, err
		}
		item.StatusLabel = map[string]string{"draft": "Draft", "published": "Aktif", "resolved": "Selesai"}[item.Status]
		item.IsSample = sample == 1
		items = append(items, item)
	}
	return items, rows.Err()
}

func (a *App) loadEmergencyByID(ctx context.Context, id int64) (Emergency, error) {
	items, err := a.loadEmergencyRecords(ctx, false)
	if err != nil {
		return Emergency{}, err
	}
	for _, item := range items {
		if item.ID == id {
			return item, nil
		}
	}
	return Emergency{}, sql.ErrNoRows
}

func (a *App) seedEmergencySample(ctx context.Context) (int, error) {
	samples := []Emergency{
		{Title: "CONTOH - Waspada genangan di wilayah RW 02", Severity: "warning", Status: "published", OccurredAt: time.Now().Format("2006-01-02 15:04:05"), Location: "RW 02 Desa Yamansari", AffectedArea: "Jalan lingkungan dan area rendah di sekitar saluran utama.", Instructions: "Hindari melintas pada genangan, awasi anak-anak, dan ikuti pembaruan resmi desa.", EvacuationRoute: "Menuju Balai Desa melalui jalur utama yang tidak tergenang.", SafePlace: "Balai Desa Yamansari", AidChannel: "Hubungi kantor desa atau mobil siaga.", ActionTaken: "Perangkat desa memantau saluran dan menyiapkan titik aman.", ContactName: "Posko Desa", ContactPhone: "081226061122"},
		{Title: "CONTOH - Simulasi evakuasi lingkungan", Severity: "info", Status: "resolved", OccurredAt: time.Now().AddDate(0, 0, -7).Format("2006-01-02 15:04:05"), Location: "Balai Desa Yamansari", AffectedArea: "Peserta simulasi tingkat desa.", Instructions: "Kegiatan simulasi telah selesai.", EvacuationRoute: "Jalur simulasi dari RW menuju Balai Desa.", SafePlace: "Balai Desa Yamansari", AidChannel: "Meja layanan desa.", ActionTaken: "Simulasi selesai dan telah dievaluasi.", ContactName: "Kasi Pelayanan", ContactPhone: "081226061199"},
	}
	for _, item := range samples {
		published := time.Now()
		var resolved any
		if item.Status == "resolved" {
			resolved = time.Now().AddDate(0, 0, -7)
		}
		_, err := a.db.ExecContext(ctx, `INSERT INTO yms_emergencies(config_id,title,severity,status,occurred_at,location,affected_area,instructions,evacuation_route,safe_place,aid_channel,action_taken,contact_name,contact_phone,published_at,resolved_at,is_sample)
SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1 FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM yms_emergencies WHERE config_id=? AND title=?)`, a.cfg.ConfigID, item.Title, item.Severity, item.Status, item.OccurredAt, item.Location, item.AffectedArea, item.Instructions, item.EvacuationRoute, item.SafePlace, item.AidChannel, item.ActionTaken, item.ContactName, item.ContactPhone, published, resolved, a.cfg.ConfigID, item.Title)
		if err != nil {
			return 0, err
		}
	}
	contacts := []struct{ kind, label, value, description string }{{"emergency", "Mobil Siaga Desa", "081226061122", "Rujukan kesehatan dan kondisi mendesak"}, {"emergency", "Kantor Desa", "02836192025", "Koordinasi pelayanan dan posko desa"}, {"health", "Bidan Desa", "081226061199", "Kesehatan ibu, anak, dan lansia"}}
	for index, item := range contacts {
		_, err := a.db.ExecContext(ctx, `INSERT INTO yms_public_contacts(config_id,kind,label,value,description,is_active,sort_order)
SELECT ?,?,?,?,?,1,? FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM yms_public_contacts WHERE config_id=? AND kind=? AND label=?)`, a.cfg.ConfigID, item.kind, item.label, item.value, item.description, index, a.cfg.ConfigID, item.kind, item.label)
		if err != nil {
			return 0, err
		}
	}
	return len(samples), nil
}

func (a *App) invalidateEmergencyCache() {
	a.cache.InvalidatePrefix("public:emergency:")
}
