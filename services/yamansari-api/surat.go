package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

const (
	statusBelumLengkap    = 0
	statusSedangDiperiksa = 1
	statusDibatalkan      = 5
)

type SuratTemplate struct {
	ID           int64            `json:"id"`
	Nama         string           `json:"nama"`
	URLSurat     string           `json:"url_surat"`
	KodeSurat    any              `json:"kode_surat"`
	SyaratIDs    []int64          `json:"syarat_ids"`
	Syarat       []map[string]any `json:"syarat"`
	MasaBerlaku  int64            `json:"masa_berlaku"`
	SatuanMasa   any              `json:"satuan_masa_berlaku"`
	FormIsianRaw any              `json:"form_isian"`
}

type createSuratRequest struct {
	IDSurat    int64          `json:"id_surat"`
	URLSurat   string         `json:"url_surat"`
	IsianForm  map[string]any `json:"isian_form"`
	Syarat     map[string]any `json:"syarat"`
	Keterangan string         `json:"keterangan"`
	NoHPAktif  string         `json:"no_hp_aktif"`
}

func (a *App) suratTemplates(w http.ResponseWriter, r *http.Request) {
	items, err := a.loadSuratTemplates(r.Context())
	if err != nil {
		a.error(w, http.StatusServiceUnavailable, "templates_unavailable", "Template surat mandiri belum bisa dibaca.")
		return
	}

	a.ok(w, http.StatusOK, items, responseMeta{"cache": string(CacheNone)})
}

func (a *App) suratPermohonan(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	items, err := a.loadPermohonanSurat(r.Context(), user.IDPend)
	if err != nil {
		a.error(w, http.StatusServiceUnavailable, "permohonan_unavailable", "Daftar permohonan surat belum bisa dibaca.")
		return
	}

	a.ok(w, http.StatusOK, items, responseMeta{"cache": string(CacheNone)})
}

func (a *App) createPermohonanSurat(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	var payload createSuratRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128<<10)).Decode(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Payload permohonan surat tidak valid.")
		return
	}

	template, err := a.findSuratTemplate(r.Context(), payload.IDSurat, payload.URLSurat)
	if err != nil {
		if sqlNoRows(err) {
			a.error(w, http.StatusBadRequest, "invalid_template", "Template surat tidak tersedia untuk layanan mandiri.")
			return
		}
		a.error(w, http.StatusServiceUnavailable, "template_unavailable", "Template surat belum bisa divalidasi.")
		return
	}

	if payload.IsianForm == nil {
		payload.IsianForm = map[string]any{}
	}
	noHP := onlyDigits(payload.NoHPAktif)
	if len(noHP) < 8 || len(noHP) > 20 {
		a.error(w, http.StatusBadRequest, "invalid_phone", "Nomor HP aktif harus berisi 8 sampai 20 digit.")
		return
	}
	if len(payload.Keterangan) > 500 {
		a.error(w, http.StatusBadRequest, "invalid_keterangan", "Keterangan terlalu panjang.")
		return
	}

	syarat, err := a.validateSyarat(r.Context(), user.IDPend, template.SyaratIDs, payload.Syarat)
	if err != nil {
		a.error(w, http.StatusBadRequest, "invalid_syarat", err.Error())
		return
	}

	payload.IsianForm["nik"] = user.IDPend
	payload.IsianForm["id_surat"] = template.ID
	payload.IsianForm["url_surat"] = template.URLSurat
	payload.IsianForm["no_hp_aktif"] = noHP

	isianJSON, err := json.Marshal(payload.IsianForm)
	if err != nil {
		a.error(w, http.StatusBadRequest, "invalid_form", "Isian form tidak bisa diproses.")
		return
	}
	syaratJSON, err := json.Marshal(syarat)
	if err != nil {
		a.error(w, http.StatusBadRequest, "invalid_syarat", "Syarat surat tidak bisa diproses.")
		return
	}

	now := time.Now()
	result, err := a.db.ExecContext(r.Context(), `INSERT INTO permohonan_surat (config_id, id_pemohon, id_surat, isian_form, status, keterangan, no_hp_aktif, syarat, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, a.cfg.ConfigID, user.IDPend, template.ID, string(isianJSON), statusSedangDiperiksa, strings.TrimSpace(payload.Keterangan), noHP, string(syaratJSON), now, now)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "create_failed", "Permohonan surat belum bisa disimpan.")
		return
	}
	id, _ := result.LastInsertId()
	a.invalidateAfterSuratMutation(user.IDPend)

	a.ok(w, http.StatusCreated, map[string]any{"id": id, "status": mapStatus(statusSedangDiperiksa)}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) cancelPermohonanSurat(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		a.error(w, http.StatusBadRequest, "invalid_id", "ID permohonan tidak valid.")
		return
	}

	result, err := a.db.ExecContext(r.Context(), `UPDATE permohonan_surat SET status = ?, updated_at = NOW()
WHERE id = ? AND id_pemohon = ? AND config_id = ? AND status IN (?, ?)`, statusDibatalkan, id, user.IDPend, a.cfg.ConfigID, statusBelumLengkap, statusSedangDiperiksa)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "cancel_failed", "Permohonan surat belum bisa dibatalkan.")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		a.error(w, http.StatusConflict, "cancel_rejected", "Permohonan tidak ditemukan, bukan milik user ini, atau statusnya sudah final.")
		return
	}
	a.invalidateAfterSuratMutation(user.IDPend)

	a.ok(w, http.StatusOK, map[string]any{"id": id, "status": mapStatus(statusDibatalkan)}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) suratArsip(w http.ResponseWriter, r *http.Request) {
	user := userFromContext(r.Context())
	items, err := a.loadArsipSurat(r.Context(), user.IDPend)
	if err != nil {
		a.error(w, http.StatusServiceUnavailable, "arsip_unavailable", "Arsip surat belum bisa dibaca.")
		return
	}

	a.ok(w, http.StatusOK, items, responseMeta{"cache": string(CacheNone)})
}

func (a *App) loadSuratTemplates(ctx context.Context) ([]SuratTemplate, error) {
	if !a.schema.HasTable(ctx, "tweb_surat_format") {
		return []SuratTemplate{}, nil
	}

	rows, err := a.db.QueryContext(ctx, `SELECT id, IFNULL(nama, ''), IFNULL(url_surat, ''), IFNULL(kode_surat, ''), IFNULL(syarat_surat, ''), IFNULL(masa_berlaku, 0), IFNULL(satuan_masa_berlaku, ''), IFNULL(form_isian, '')
FROM tweb_surat_format
WHERE config_id = ? AND mandiri = 1 AND kunci = 0 AND jenis NOT IN (1, 2)
ORDER BY favorit DESC, nama ASC`, a.cfg.ConfigID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []SuratTemplate{}
	for rows.Next() {
		var item SuratTemplate
		var kode, syaratRaw, satuan, formIsian string
		if err := rows.Scan(&item.ID, &item.Nama, &item.URLSurat, &kode, &syaratRaw, &item.MasaBerlaku, &satuan, &formIsian); err != nil {
			return nil, err
		}
		item.KodeSurat = nilString(kode)
		item.SatuanMasa = nilString(satuan)
		item.FormIsianRaw = parseJSONOrString(formIsian)
		item.SyaratIDs = parseIntArray(syaratRaw)
		item.Syarat = a.syaratNames(ctx, item.SyaratIDs)
		items = append(items, item)
	}

	return items, rows.Err()
}

func (a *App) findSuratTemplate(ctx context.Context, id int64, urlSurat string) (*SuratTemplate, error) {
	if !a.schema.HasTable(ctx, "tweb_surat_format") {
		return nil, sql.ErrNoRows
	}

	where := "id = ?"
	args := []any{id}
	if id <= 0 && strings.TrimSpace(urlSurat) != "" {
		where = "url_surat = ?"
		args = []any{strings.TrimSpace(urlSurat)}
	}

	query := `SELECT id, IFNULL(nama, ''), IFNULL(url_surat, ''), IFNULL(kode_surat, ''), IFNULL(syarat_surat, ''), IFNULL(masa_berlaku, 0), IFNULL(satuan_masa_berlaku, ''), IFNULL(form_isian, '')
FROM tweb_surat_format
WHERE config_id = ? AND mandiri = 1 AND kunci = 0 AND jenis NOT IN (1, 2) AND ` + where + `
LIMIT 1`
	args = append([]any{a.cfg.ConfigID}, args...)

	row := a.db.QueryRowContext(ctx, query, args...)
	item := &SuratTemplate{}
	var kode, syaratRaw, satuan, formIsian string
	if err := row.Scan(&item.ID, &item.Nama, &item.URLSurat, &kode, &syaratRaw, &item.MasaBerlaku, &satuan, &formIsian); err != nil {
		return nil, err
	}
	item.KodeSurat = nilString(kode)
	item.SatuanMasa = nilString(satuan)
	item.FormIsianRaw = parseJSONOrString(formIsian)
	item.SyaratIDs = parseIntArray(syaratRaw)
	item.Syarat = a.syaratNames(ctx, item.SyaratIDs)

	return item, nil
}

func (a *App) loadPermohonanSurat(ctx context.Context, idPend int64) ([]map[string]any, error) {
	if !a.schema.HasTable(ctx, "permohonan_surat") {
		return []map[string]any{}, nil
	}

	rows, err := a.db.QueryContext(ctx, `SELECT ps.id, ps.id_surat, IFNULL(sf.nama, ''), IFNULL(sf.url_surat, ''), IFNULL(ps.status, 0), IFNULL(ps.alasan, ''), IFNULL(ps.keterangan, ''), IFNULL(ps.no_hp_aktif, ''), IFNULL(ps.no_antrian, ''), CAST(ps.created_at AS CHAR), CAST(ps.updated_at AS CHAR)
FROM permohonan_surat ps
LEFT JOIN tweb_surat_format sf ON sf.id = ps.id_surat
WHERE ps.config_id = ? AND ps.id_pemohon = ? AND ps.status != 4
ORDER BY ps.created_at DESC, ps.id DESC`, a.cfg.ConfigID, idPend)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []map[string]any{}
	for rows.Next() {
		var id, idSurat, status int64
		var namaSurat, urlSurat, alasan, keterangan, noHP, noAntrian, createdAt, updatedAt string
		if err := rows.Scan(&id, &idSurat, &namaSurat, &urlSurat, &status, &alasan, &keterangan, &noHP, &noAntrian, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		items = append(items, map[string]any{
			"id": id, "id_surat": idSurat, "nama_surat": namaSurat, "url_surat": nilString(urlSurat),
			"status": mapStatus(status), "alasan": nilString(alasan), "keterangan": nilString(keterangan),
			"no_hp_aktif": nilString(noHP), "no_antrian": nilString(noAntrian), "created_at": createdAt, "updated_at": updatedAt,
		})
	}

	return items, rows.Err()
}

func (a *App) loadArsipSurat(ctx context.Context, idPend int64) ([]map[string]any, error) {
	if !a.schema.HasTable(ctx, "log_surat") {
		return []map[string]any{}, nil
	}

	rows, err := a.db.QueryContext(ctx, `SELECT ls.id, ls.id_format_surat, IFNULL(sf.nama, ''), CAST(ls.tanggal AS CHAR), IFNULL(ls.no_surat, ''), IFNULL(ls.nama_surat, ''), IFNULL(ls.keterangan, ''), IFNULL(ls.status, 0), IFNULL(ls.tte, 0)
FROM log_surat ls
LEFT JOIN tweb_surat_format sf ON sf.id = ls.id_format_surat
WHERE ls.config_id = ? AND ls.id_pend = ? AND ls.deleted_at IS NULL
ORDER BY ls.tanggal DESC, ls.id DESC`, a.cfg.ConfigID, idPend)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []map[string]any{}
	for rows.Next() {
		var id, idFormat, status, tte int64
		var namaFormat, tanggal, noSurat, namaSurat, keterangan string
		if err := rows.Scan(&id, &idFormat, &namaFormat, &tanggal, &noSurat, &namaSurat, &keterangan, &status, &tte); err != nil {
			return nil, err
		}
		items = append(items, map[string]any{
			"id": id, "id_format_surat": idFormat, "nama_format": nilString(namaFormat), "tanggal": tanggal,
			"no_surat": nilString(noSurat), "nama_surat": nilString(namaSurat), "keterangan": nilString(keterangan),
			"status": status, "tte": tte == 1, "cetak_url": a.cfg.OpenSIDBaseURL + "/index.php/layanan-mandiri/surat/cetak/" + strconv.FormatInt(id, 10),
		})
	}

	return items, rows.Err()
}

func (a *App) validateSyarat(ctx context.Context, idPend int64, required []int64, raw map[string]any) (map[string]any, error) {
	result := map[string]any{}
	if raw != nil {
		for key, value := range raw {
			result[key] = value
		}
	}

	for _, syaratID := range required {
		key := strconv.FormatInt(syaratID, 10)
		value, ok := result[key]
		if !ok || fmt.Sprint(value) == "" {
			return nil, fmt.Errorf("syarat %s wajib dipilih", key)
		}

		docID, err := parseDocID(value)
		if err != nil {
			return nil, fmt.Errorf("syarat %s tidak valid", key)
		}
		if docID == -1 {
			result[key] = -1
			continue
		}
		if docID <= 0 {
			return nil, fmt.Errorf("dokumen syarat %s tidak valid", key)
		}
		if err := a.validateDokumenSyarat(ctx, idPend, syaratID, docID); err != nil {
			return nil, err
		}
		result[key] = docID
	}

	return result, nil
}

func (a *App) validateDokumenSyarat(ctx context.Context, idPend, syaratID, docID int64) error {
	if !a.schema.HasTable(ctx, "dokumen") {
		return errors.New("tabel dokumen belum tersedia")
	}

	query := `SELECT COUNT(*) FROM dokumen WHERE id = ? AND id_pend = ? AND config_id = ? AND enabled = 1 AND deleted = 0`
	args := []any{docID, idPend, a.cfg.ConfigID}
	if a.schema.HasColumn(ctx, "dokumen", "id_syarat") {
		query += " AND id_syarat = ?"
		args = append(args, syaratID)
	}

	var count int64
	if err := a.db.QueryRowContext(ctx, query, args...).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		return fmt.Errorf("dokumen syarat %d bukan milik user login atau tidak aktif", syaratID)
	}

	return nil
}

func (a *App) syaratNames(ctx context.Context, ids []int64) []map[string]any {
	items := []map[string]any{}
	if len(ids) == 0 || !a.schema.HasTable(ctx, "ref_syarat_surat") {
		return items
	}

	for _, id := range ids {
		var name sql.NullString
		_ = a.db.QueryRowContext(ctx, "SELECT ref_syarat_nama FROM ref_syarat_surat WHERE ref_syarat_id = ? AND (config_id = ? OR config_id IS NULL) LIMIT 1", id, a.cfg.ConfigID).Scan(&name)
		items = append(items, map[string]any{"id": id, "nama": scanNullString(name)})
	}

	return items
}

func (a *App) invalidateAfterSuratMutation(idPend int64) {
	a.cache.Invalidate(fmt.Sprintf("public:ringkasan:config:%d", a.cfg.ConfigID))
	a.cache.InvalidatePrefix(fmt.Sprintf("mandiri:%d:surat:", idPend))
}

func parseIntArray(raw string) []int64 {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return []int64{}
	}

	var ints []int64
	if err := json.Unmarshal([]byte(raw), &ints); err == nil {
		return ints
	}
	var anys []any
	if err := json.Unmarshal([]byte(raw), &anys); err != nil {
		return []int64{}
	}

	for _, value := range anys {
		if parsed, err := parseDocID(value); err == nil {
			ints = append(ints, parsed)
		}
	}

	return ints
}

func parseJSONOrString(raw string) any {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	var value any
	if err := json.Unmarshal([]byte(raw), &value); err == nil {
		return value
	}

	return raw
}

func parseDocID(value any) (int64, error) {
	switch typed := value.(type) {
	case float64:
		return int64(typed), nil
	case int:
		return int64(typed), nil
	case int64:
		return typed, nil
	case json.Number:
		return typed.Int64()
	case string:
		return strconv.ParseInt(strings.TrimSpace(typed), 10, 64)
	default:
		return 0, fmt.Errorf("unsupported id")
	}
}

func mapStatus(status int64) map[string]any {
	labels := map[int64]string{0: "Belum Lengkap", 1: "Sedang Diperiksa", 2: "Menunggu Tandatangan", 3: "Siap Diambil", 4: "Sudah Diambil", 5: "Dibatalkan"}
	label := labels[status]
	if label == "" {
		label = "Tidak Diketahui"
	}

	return map[string]any{"kode": status, "label": label}
}
