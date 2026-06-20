package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
)

const (
	defaultLimit = 6
	maxLimit     = 24
)

var tagPattern = regexp.MustCompile(`<[^>]+>`)

func (a *App) health(w http.ResponseWriter, _ *http.Request) {
	a.ok(w, http.StatusOK, map[string]any{
		"name":      "Yamansari API",
		"basePath":  "/api/yms",
		"configId":  a.cfg.ConfigID,
		"uptimeSec": int64(time.Since(a.startedAt).Seconds()),
	}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) profil(w http.ResponseWriter, r *http.Request) {
	a.cachedPublic(w, r, fmt.Sprintf("public:profil:config:%d", a.cfg.ConfigID), 5*time.Minute, 30*time.Second, a.loadProfil)
}

func (a *App) ringkasan(w http.ResponseWriter, r *http.Request) {
	a.cachedPublic(w, r, fmt.Sprintf("public:ringkasan:config:%d", a.cfg.ConfigID), 30*time.Second, 15*time.Second, a.loadRingkasan)
}

func (a *App) artikel(w http.ResponseWriter, r *http.Request) {
	limit := safeLimit(r.URL.Query().Get("limit"), defaultLimit, maxLimit)
	key := fmt.Sprintf("public:artikel:config:%d:limit:%d", a.cfg.ConfigID, limit)
	a.cachedPublic(w, r, key, 60*time.Second, 30*time.Second, func(ctx context.Context) (any, error) {
		return a.loadArtikel(ctx, limit)
	})
}

func (a *App) pembangunan(w http.ResponseWriter, r *http.Request) {
	limit := safeLimit(r.URL.Query().Get("limit"), defaultLimit, maxLimit)
	key := fmt.Sprintf("public:pembangunan:config:%d:limit:%d", a.cfg.ConfigID, limit)
	a.cachedPublic(w, r, key, 60*time.Second, 30*time.Second, func(ctx context.Context) (any, error) {
		return a.loadPembangunan(ctx, limit)
	})
}

func (a *App) programBantuan(w http.ResponseWriter, r *http.Request) {
	limit := safeLimit(r.URL.Query().Get("limit"), defaultLimit, maxLimit)
	key := fmt.Sprintf("public:program-bantuan:config:%d:limit:%d", a.cfg.ConfigID, limit)
	a.cachedPublic(w, r, key, 60*time.Second, 30*time.Second, func(ctx context.Context) (any, error) {
		return a.loadProgramBantuan(ctx, limit)
	})
}

func (a *App) dtks(w http.ResponseWriter, r *http.Request) {
	a.cachedPublic(w, r, fmt.Sprintf("public:dtks:config:%d", a.cfg.ConfigID), 60*time.Second, 30*time.Second, a.loadDTKS)
}

func (a *App) publicHome(w http.ResponseWriter, r *http.Request) {
	key := fmt.Sprintf("public:home:config:%d", a.cfg.ConfigID)
	a.cachedPublic(w, r, key, 60*time.Second, 30*time.Second, func(ctx context.Context) (any, error) {
		summary, err := a.loadRingkasan(ctx)
		if err != nil {
			return nil, err
		}
		articles, err := a.loadArtikel(ctx, 6)
		if err != nil {
			return nil, err
		}
		works, err := a.loadPembangunan(ctx, 6)
		if err != nil {
			return nil, err
		}
		programs, err := a.loadProgramBantuan(ctx, 6)
		if err != nil {
			return nil, err
		}
		dtks, err := a.loadDTKS(ctx)
		if err != nil {
			return nil, err
		}
		emergency, err := a.loadEmergency(ctx)
		if err != nil {
			return nil, err
		}

		return map[string]any{
			"ringkasan":      summary,
			"artikel":        articles,
			"pembangunan":    works,
			"programBantuan": programs,
			"dtks":           dtks,
			"emergency":      emergency,
		}, nil
	})
}

func (a *App) publicOrganization(w http.ResponseWriter, r *http.Request) {
	a.cachedPublic(w, r, fmt.Sprintf("public:organization:config:%d", a.cfg.ConfigID), 5*time.Minute, 2*time.Minute, a.loadOrganization)
}

func (a *App) publicBudget(w http.ResponseWriter, r *http.Request) {
	year := strings.TrimSpace(r.URL.Query().Get("year"))
	if year == "" {
		year = time.Now().Format("2006")
	}
	key := fmt.Sprintf("public:budget:config:%d:year:%s", a.cfg.ConfigID, year)
	a.cachedPublic(w, r, key, 5*time.Minute, 2*time.Minute, func(ctx context.Context) (any, error) {
		return a.loadBudget(ctx, year)
	})
}

func (a *App) publicPlanning(w http.ResponseWriter, r *http.Request) {
	a.cachedPublic(w, r, fmt.Sprintf("public:planning:config:%d", a.cfg.ConfigID), 5*time.Minute, 2*time.Minute, a.loadPlanning)
}

func (a *App) publicDocuments(w http.ResponseWriter, r *http.Request) {
	limit := safeLimit(r.URL.Query().Get("limit"), 12, maxLimit)
	kind := strings.Trim(r.URL.Path, "/")
	key := fmt.Sprintf("public:documents:config:%d:kind:%s:limit:%d", a.cfg.ConfigID, kind, limit)
	a.cachedPublic(w, r, key, 5*time.Minute, 2*time.Minute, func(ctx context.Context) (any, error) {
		return a.loadDocuments(ctx, limit)
	})
}

func (a *App) publicEmergency(w http.ResponseWriter, r *http.Request) {
	a.cachedPublic(w, r, fmt.Sprintf("public:emergency:config:%d", a.cfg.ConfigID), 30*time.Second, 30*time.Second, a.loadEmergency)
}

func (a *App) createPublicComplaint(w http.ResponseWriter, r *http.Request) {
	if !a.schema.HasTable(r.Context(), "pengaduan") {
		a.error(w, http.StatusServiceUnavailable, "complaint_unavailable", "Layanan pengaduan belum tersedia.")
		return
	}

	var payload struct {
		NIK     string `json:"nik"`
		Nama    string `json:"nama"`
		Email   string `json:"email"`
		Telepon string `json:"telepon"`
		Judul   string `json:"judul"`
		Isi     string `json:"isi"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<10)).Decode(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Payload pengaduan tidak valid.")
		return
	}

	payload.NIK = trimTo(onlyDigits(payload.NIK), 16)
	payload.Nama = trimTo(strings.TrimSpace(payload.Nama), 100)
	payload.Email = trimTo(strings.TrimSpace(payload.Email), 100)
	payload.Telepon = trimTo(strings.TrimSpace(payload.Telepon), 20)
	payload.Judul = trimTo(strings.TrimSpace(payload.Judul), 100)
	payload.Isi = trimTo(strings.TrimSpace(payload.Isi), 4000)
	if payload.Nama == "" || payload.Isi == "" {
		a.error(w, http.StatusBadRequest, "missing_complaint_fields", "Nama dan isi pengaduan wajib diisi.")
		return
	}

	result, err := a.db.ExecContext(r.Context(), `INSERT INTO pengaduan (config_id, id_pengaduan, nik, nama, email, telepon, judul, isi, status, ip_address, created_at, updated_at)
VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`, a.cfg.ConfigID, nilString(payload.NIK), payload.Nama, nilString(payload.Email), nilString(payload.Telepon), nilString(payload.Judul), payload.Isi, trimTo(clientIP(r), 100))
	if err != nil {
		a.error(w, http.StatusInternalServerError, "complaint_failed", "Pengaduan belum bisa disimpan.")
		return
	}
	id, _ := result.LastInsertId()

	a.ok(w, http.StatusCreated, map[string]any{"id": id, "status": "menunggu proses"}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) cachedPublic(w http.ResponseWriter, r *http.Request, key string, freshTTL, maxStale time.Duration, loader func(context.Context) (any, error)) {
	data, state, err := a.cache.GetOrLoad(r.Context(), key, freshTTL, maxStale, loader)
	if err != nil {
		log.Printf("public cache load failed key=%s: %v", key, err)
		a.error(w, http.StatusServiceUnavailable, "backend_unavailable", "Data OpenSID belum bisa dibaca oleh Yamansari API.")
		return
	}

	w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d", int(freshTTL.Seconds())))
	a.ok(w, http.StatusOK, data, responseMeta{"cache": string(state)})
}

func (a *App) loadProfil(ctx context.Context) (any, error) {
	config, err := a.queryConfig(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"nama": strValue(config, "nama_desa", "Yamansari"),
		"kode": map[string]any{
			"desa":      nilString(strValue(config, "kode_desa", "")),
			"desa_bps":  nilString(strValue(config, "kode_desa_bps", strValue(config, "kode_desa", ""))),
			"kecamatan": nilString(strValue(config, "kode_kecamatan", "")),
			"kabupaten": nilString(strValue(config, "kode_kabupaten", "")),
			"provinsi":  nilString(strValue(config, "kode_propinsi", "")),
		},
		"wilayah": map[string]any{
			"kecamatan": nilString(strValue(config, "nama_kecamatan", "")),
			"kabupaten": nilString(strValue(config, "nama_kabupaten", "")),
			"provinsi":  nilString(strValue(config, "nama_propinsi", "")),
		},
		"alamat": nilString(strValue(config, "alamat_kantor", "")),
		"kontak": map[string]any{
			"telepon": nilString(strValue(config, "telepon", "")),
			"email":   nilString(strValue(config, "email_desa", "")),
			"website": nilString(strValue(config, "website", "")),
		},
		"koordinat": map[string]any{
			"lat":  nilString(strValue(config, "lat", "")),
			"lng":  nilString(strValue(config, "lng", "")),
			"zoom": intValue(config, "zoom"),
		},
		"kepalaDesa": nilString(strValue(config, "nama_kepala_desa", "")),
		"logoUrl":    a.logoURL(strValue(config, "logo", "")),
	}, nil
}

func (a *App) loadRingkasan(ctx context.Context) (any, error) {
	profil, err := a.loadProfil(ctx)
	if err != nil {
		return nil, err
	}

	counts := []struct {
		Key             string
		Label           string
		Table           string
		Where           map[string]any
		AllowNullConfig bool
	}{
		{"penduduk_aktif", "Penduduk aktif", "tweb_penduduk", map[string]any{"status_dasar": 1}, false},
		{"keluarga", "Keluarga", "tweb_keluarga", nil, false},
		{"wilayah", "Wilayah", "tweb_wil_clusterdesa", nil, false},
		{"permohonan_baru", "Permohonan baru", "permohonan_surat", map[string]any{"status": 1}, false},
		{"surat_tercetak", "Surat tercetak", "log_surat", map[string]any{"status": 1}, false},
		{"program_bantuan", "Program bantuan", "program", nil, true},
		{"dtks", "DTKS", "dtks", nil, false},
		{"pembangunan", "Pembangunan", "pembangunan", nil, false},
		{"artikel", "Artikel publik", "artikel", map[string]any{"enabled": 1}, false},
	}

	stats := make([]map[string]any, 0, len(counts))
	for _, item := range counts {
		value, err := a.countRows(ctx, item.Table, item.Where, item.AllowNullConfig)
		if err != nil {
			return nil, err
		}
		stats = append(stats, map[string]any{"key": item.Key, "label": item.Label, "value": value})
	}

	dtks, err := a.loadDTKS(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]any{"profil": profil, "statistik": stats, "dtks": dtks}, nil
}

func (a *App) loadOrganization(ctx context.Context) (any, error) {
	if !a.schema.HasTable(ctx, "tweb_desa_pamong") {
		return []any{}, nil
	}

	nameExpr := "IFNULL(p.pamong_nama, '')"
	jabatanExpr := "''"
	join := ""
	if a.schema.HasTable(ctx, "tweb_penduduk") {
		join += " LEFT JOIN tweb_penduduk pend ON pend.id = p.id_pend"
		nameExpr = "IFNULL(COALESCE(pend.nama, p.pamong_nama), '')"
	}
	if a.schema.HasTable(ctx, "ref_jabatan") {
		join += " LEFT JOIN ref_jabatan j ON j.id = p.jabatan_id"
		jabatanExpr = "IFNULL(j.nama, '')"
	}
	selects := []string{
		"p.pamong_id",
		nameExpr,
		jabatanExpr,
		"IFNULL(p.pamong_nip, '')",
		"IFNULL(p.pamong_niap, '')",
		"IFNULL(p.foto, '')",
		"IFNULL(p.atasan, 0)",
		"IFNULL(p.urut, 9999)",
	}
	clauses, args := a.configClauses(ctx, "tweb_desa_pamong", "p", false)
	if a.schema.HasColumn(ctx, "tweb_desa_pamong", "pamong_status") {
		clauses = append(clauses, "p.pamong_status = 1")
	}

	query := "SELECT " + strings.Join(selects, ", ") + " FROM tweb_desa_pamong p" + join + whereSQL(clauses) + " ORDER BY IFNULL(p.urut, 9999), p.pamong_id"
	rows, err := a.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []map[string]any{}
	for rows.Next() {
		var id, atasan, urut int64
		var nama, jabatan, nip, niap, foto string
		if err := rows.Scan(&id, &nama, &jabatan, &nip, &niap, &foto, &atasan, &urut); err != nil {
			return nil, err
		}
		items = append(items, map[string]any{
			"id": id, "nama": nama, "jabatan": nilString(jabatan), "nip": nilString(nip),
			"niap": nilString(niap), "fotoUrl": a.pamongImageURL(foto), "atasan": atasan, "urut": urut,
		})
	}

	return items, rows.Err()
}

func (a *App) loadBudget(ctx context.Context, year string) (any, error) {
	if a.schema.HasTable(ctx, "keuangan") && a.schema.HasTable(ctx, "keuangan_template") {
		rows, err := a.db.QueryContext(ctx, `SELECT k.template_uuid, IFNULL(t.uraian, ''), IFNULL(k.anggaran, 0), IFNULL(k.realisasi, 0)
FROM keuangan k
LEFT JOIN keuangan_template t ON t.uuid = k.template_uuid
WHERE k.config_id = ? AND k.tahun = ?
ORDER BY k.template_uuid`, a.cfg.ConfigID, year)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		items := []map[string]any{}
		var totalAnggaran, totalRealisasi float64
		for rows.Next() {
			var uuid, uraian string
			var anggaran, realisasi float64
			if err := rows.Scan(&uuid, &uraian, &anggaran, &realisasi); err != nil {
				return nil, err
			}
			if uuid == "4" || uuid == "5" || uuid == "6" {
				totalAnggaran += anggaran
				totalRealisasi += realisasi
			}
			items = append(items, map[string]any{"kode": uuid, "uraian": uraian, "anggaran": anggaran, "realisasi": realisasi})
		}
		if err := rows.Err(); err != nil {
			return nil, err
		}

		return map[string]any{"year": year, "totalAnggaran": totalAnggaran, "totalRealisasi": totalRealisasi, "items": items}, nil
	}

	return map[string]any{"year": year, "totalAnggaran": 0, "totalRealisasi": 0, "items": []any{}}, nil
}

func (a *App) loadPlanning(ctx context.Context) (any, error) {
	docs, err := a.loadDocuments(ctx, 12)
	if err != nil {
		return nil, err
	}

	return map[string]any{"documents": docs}, nil
}

func (a *App) loadEmergency(ctx context.Context) (any, error) {
	items := []map[string]any{}
	if a.schema.HasTable(ctx, "yms_public_notices") {
		rows, err := a.db.QueryContext(ctx, `SELECT id, kind, title, IFNULL(body, ''), IFNULL(CAST(starts_at AS CHAR), ''), IFNULL(CAST(ends_at AS CHAR), '')
FROM yms_public_notices
WHERE (config_id = ? OR config_id IS NULL) AND is_active = 1 AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW())
ORDER BY created_at DESC, id DESC LIMIT 8`, a.cfg.ConfigID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			var id int64
			var kind, title, body, startsAt, endsAt string
			if err := rows.Scan(&id, &kind, &title, &body, &startsAt, &endsAt); err != nil {
				return nil, err
			}
			items = append(items, map[string]any{"id": id, "kind": kind, "title": title, "body": nilString(body), "startsAt": nilString(startsAt), "endsAt": nilString(endsAt)})
		}
		if err := rows.Err(); err != nil {
			return nil, err
		}
	}

	contacts := []map[string]any{}
	if a.schema.HasTable(ctx, "yms_public_contacts") {
		rows, err := a.db.QueryContext(ctx, `SELECT id, kind, label, value, IFNULL(description, '')
FROM yms_public_contacts
WHERE (config_id = ? OR config_id IS NULL) AND is_active = 1
ORDER BY sort_order, id LIMIT 24`, a.cfg.ConfigID)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			var id int64
			var kind, label, value, description string
			if err := rows.Scan(&id, &kind, &label, &value, &description); err != nil {
				return nil, err
			}
			contacts = append(contacts, map[string]any{"id": id, "kind": kind, "label": label, "value": value, "description": nilString(description)})
		}
		if err := rows.Err(); err != nil {
			return nil, err
		}
	}

	return map[string]any{"items": items, "contacts": contacts}, nil
}

func (a *App) loadDocuments(ctx context.Context, limit int) (any, error) {
	table := "dokumen_hidup"
	if !a.schema.HasTable(ctx, table) {
		table = "dokumen"
	}
	if !a.schema.HasTable(ctx, table) {
		return []any{}, nil
	}

	clauses, args := a.configClauses(ctx, table, table, false)
	if a.schema.HasColumn(ctx, table, "enabled") {
		clauses = append(clauses, table+".enabled = 1")
	}
	if a.schema.HasColumn(ctx, table, "deleted") {
		clauses = append(clauses, table+".deleted <> 1")
	}
	if a.schema.HasColumn(ctx, table, "id_pend") {
		clauses = append(clauses, table+".id_pend IS NULL")
	}

	query := `SELECT id, IFNULL(nama, ''), IFNULL(CAST(tahun AS CHAR), ''), IFNULL(kategori, 0), IFNULL(kategori_info_publik, 0), IFNULL(CAST(tgl_upload AS CHAR), ''), IFNULL(satuan, ''), IFNULL(url, '')
FROM ` + quoteIdent(table) + whereSQL(clauses) + " ORDER BY updated_at DESC, id DESC LIMIT ?"
	args = append(args, limit)

	rows, err := a.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []map[string]any{}
	for rows.Next() {
		var id, kategori, kategoriInfo int64
		var nama, tahun, tanggal, satuan, url string
		if err := rows.Scan(&id, &nama, &tahun, &kategori, &kategoriInfo, &tanggal, &satuan, &url); err != nil {
			return nil, err
		}
		items = append(items, map[string]any{
			"id": id, "nama": nama, "tahun": nilString(tahun), "kategori": kategori,
			"kategoriInfoPublik": kategoriInfo, "tanggal": nilString(tanggal), "url": a.documentURL(id, satuan, url),
		})
	}

	return items, rows.Err()
}

func (a *App) loadArtikel(ctx context.Context, limit int) (any, error) {
	if !a.schema.HasTable(ctx, "artikel") {
		return []any{}, nil
	}

	clauses, args := a.configClauses(ctx, "artikel", "artikel", false)
	if a.schema.HasColumn(ctx, "artikel", "enabled") {
		clauses = append(clauses, "artikel.enabled = 1")
	}

	query := `SELECT id, IFNULL(judul, ''), IFNULL(slug, ''), IFNULL(isi, ''), CAST(tgl_upload AS CHAR), IFNULL(gambar, ''), IFNULL(hit, 0)
FROM artikel`
	query += whereSQL(clauses) + " ORDER BY tgl_upload DESC, id DESC LIMIT ?"
	args = append(args, limit)

	rows, err := a.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []map[string]any{}
	for rows.Next() {
		var id, hit int64
		var judul, slug, isi, tanggal, gambar string
		if err := rows.Scan(&id, &judul, &slug, &isi, &tanggal, &gambar, &hit); err != nil {
			return nil, err
		}
		urlSlug := slug
		if urlSlug == "" {
			urlSlug = fmt.Sprintf("%d", id)
		}
		items = append(items, map[string]any{
			"id": id, "judul": judul, "slug": nilString(slug), "ringkasan": excerpt(isi, 180),
			"tanggal": nilString(tanggal), "gambarUrl": a.articleImageURL(gambar),
			"url": a.cfg.OpenSIDBaseURL + "/index.php/artikel/" + urlSlug, "jumlahDilihat": hit,
		})
	}

	return items, rows.Err()
}

func (a *App) loadPembangunan(ctx context.Context, limit int) (any, error) {
	if !a.schema.HasTable(ctx, "pembangunan") {
		return []any{}, nil
	}

	clauses, args := a.configClauses(ctx, "pembangunan", "pembangunan", false)
	if a.schema.HasColumn(ctx, "pembangunan", "status") {
		clauses = append(clauses, "pembangunan.status = 1")
	}

	query := `SELECT id, IFNULL(judul, ''), IFNULL(slug, ''), IFNULL(keterangan, ''), IFNULL(lokasi, ''), IFNULL(CAST(tahun_anggaran AS CHAR), ''), IFNULL(anggaran, 0), IFNULL(pelaksana_kegiatan, ''), IFNULL(status, 0), IFNULL(foto, '')
FROM pembangunan`
	query += whereSQL(clauses) + " ORDER BY tahun_anggaran DESC, id DESC LIMIT ?"
	args = append(args, limit)

	rows, err := a.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []map[string]any{}
	for rows.Next() {
		var id, anggaran, status int64
		var judul, slug, ket, lokasi, tahun, pelaksana, foto string
		if err := rows.Scan(&id, &judul, &slug, &ket, &lokasi, &tahun, &anggaran, &pelaksana, &status, &foto); err != nil {
			return nil, err
		}
		urlSlug := slug
		if urlSlug == "" {
			urlSlug = fmt.Sprintf("%d", id)
		}
		items = append(items, map[string]any{
			"id": id, "judul": judul, "slug": nilString(slug), "ringkasan": excerpt(ket, 140),
			"lokasi": nilString(lokasi), "tahunAnggaran": nilString(tahun), "anggaran": anggaran,
			"pelaksana": nilString(pelaksana), "status": statusLabel(status == 1),
			"fotoUrl": a.pembangunanImageURL(foto), "url": a.cfg.OpenSIDBaseURL + "/index.php/pembangunan/" + urlSlug,
		})
	}

	return items, rows.Err()
}

func (a *App) loadProgramBantuan(ctx context.Context, limit int) (any, error) {
	if !a.schema.HasTable(ctx, "program") {
		return []any{}, nil
	}

	clauses, whereArgs := a.configClauses(ctx, "program", "program", true)
	statusExpr := "0"
	if a.schema.HasColumn(ctx, "program", "status") {
		clauses = append(clauses, "program.status = 1")
		statusExpr = "IFNULL(program.status, 0)"
	}

	join := ""
	selectCount := "0"
	joinArgs := []any{}
	if a.schema.HasTable(ctx, "program_peserta") {
		selectCount = "IFNULL(peserta_count.jumlah_peserta, 0)"
		join = " LEFT JOIN (SELECT program_id, COUNT(id) AS jumlah_peserta FROM program_peserta"
		if a.schema.HasColumn(ctx, "program_peserta", "config_id") {
			join += " WHERE config_id = ?"
			joinArgs = append(joinArgs, a.cfg.ConfigID)
		}
		join += " GROUP BY program_id) peserta_count ON peserta_count.program_id = program.id"
	}

	query := `SELECT program.id, IFNULL(program.nama, ''), IFNULL(program.slug, ''), IFNULL(program.sasaran, 0), IFNULL(program.ndesc, ''), IFNULL(CAST(program.sdate AS CHAR), ''), IFNULL(CAST(program.edate AS CHAR), ''), IFNULL(program.asaldana, ''), ` + statusExpr + `, ` + selectCount + ` AS jumlah_peserta
FROM program` + join
	query += whereSQL(clauses) + " ORDER BY program.edate DESC, program.id DESC LIMIT ?"
	args := append(joinArgs, whereArgs...)
	args = append(args, limit)

	rows, err := a.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []map[string]any{}
	for rows.Next() {
		var id, sasaran, status, peserta int64
		var nama, slug, desc, mulai, selesai, asalDana string
		if err := rows.Scan(&id, &nama, &slug, &sasaran, &desc, &mulai, &selesai, &asalDana, &status, &peserta); err != nil {
			return nil, err
		}
		items = append(items, map[string]any{
			"id": id, "nama": nama, "slug": nilString(slug),
			"sasaran":   map[string]any{"kode": sasaran, "label": sasaranLabel(sasaran)},
			"deskripsi": nilString(desc), "mulai": nilString(mulai), "selesai": nilString(selesai),
			"asalDana": nilString(asalDana), "jumlahPeserta": peserta, "status": statusLabel(status == 1),
		})
	}

	return items, rows.Err()
}

func (a *App) loadDTKS(ctx context.Context) (any, error) {
	versions := []map[string]any{}
	if a.schema.HasTable(ctx, "dtks") && a.schema.HasColumn(ctx, "dtks", "versi_kuisioner") {
		clauses, args := a.configClauses(ctx, "dtks", "dtks", false)
		rows, err := a.db.QueryContext(ctx, "SELECT IFNULL(versi_kuisioner, ''), COUNT(id) FROM dtks"+whereSQL(clauses)+" GROUP BY versi_kuisioner", args...)
		if err != nil {
			return nil, err
		}
		defer rows.Close()

		for rows.Next() {
			var versi string
			var jumlah int64
			if err := rows.Scan(&versi, &jumlah); err != nil {
				return nil, err
			}
			versions = append(versions, map[string]any{"versi": nilString(versi), "jumlah": jumlah})
		}
		if err := rows.Err(); err != nil {
			return nil, err
		}
	}

	ruta, err := a.countRows(ctx, "dtks", nil, false)
	if err != nil {
		return nil, err
	}
	anggota, err := a.countRows(ctx, "dtks_anggota", nil, false)
	if err != nil {
		return nil, err
	}
	lampiran, err := a.countRows(ctx, "dtks_lampiran", nil, false)
	if err != nil {
		return nil, err
	}
	rtm, err := a.countRows(ctx, "tweb_rtm", map[string]any{"terdaftar_dtks": 1}, false)
	if err != nil {
		return nil, err
	}
	lastUpdated, err := a.maxTimestamp(ctx, "dtks")
	if err != nil {
		return nil, err
	}

	status := "menunggu_impor"
	var catatan any = "Data DTKS lokal belum diimpor dari Excel."
	if ruta > 0 {
		status = "tersedia"
		catatan = nil
	}

	return map[string]any{
		"status": status, "ruta": ruta, "anggota": anggota, "lampiran": lampiran,
		"rtm_terdaftar_dtks": rtm, "versi_kuisioner": versions, "catatan": catatan,
		"lastUpdated": lastUpdated,
		"managedBy":   "OpenSID",
		"adminPath":   "/index.php/dtks",
		"adminUrl":    a.cfg.OpenSIDBaseURL + "/index.php/dtks",
		"source": []map[string]any{
			{"table": "dtks", "label": "Rumah tangga DTKS", "rows": ruta},
			{"table": "dtks_anggota", "label": "Anggota rumah tangga", "rows": anggota},
			{"table": "dtks_lampiran", "label": "Lampiran pendataan", "rows": lampiran},
			{"table": "tweb_rtm", "label": "RTM terdaftar DTKS", "rows": rtm},
		},
	}, nil
}

func (a *App) maxTimestamp(ctx context.Context, table string) (any, error) {
	if !validIdent(table) || !a.schema.HasTable(ctx, table) {
		return nil, nil
	}

	column := ""
	for _, candidate := range []string{"updated_at", "created_at"} {
		if a.schema.HasColumn(ctx, table, candidate) {
			column = candidate
			break
		}
	}
	if column == "" {
		return nil, nil
	}

	clauses, args := a.configClauses(ctx, table, table, false)
	query := "SELECT IFNULL(CAST(MAX(" + quoteIdent(column) + ") AS CHAR), '') FROM " + quoteIdent(table) + whereSQL(clauses)

	var value string
	if err := a.db.QueryRowContext(ctx, query, args...).Scan(&value); err != nil {
		return nil, err
	}

	return nilString(value), nil
}

func (a *App) configClauses(ctx context.Context, table, qualifier string, allowNull bool) ([]string, []any) {
	if !a.schema.HasColumn(ctx, table, "config_id") {
		return []string{}, []any{}
	}

	field := "config_id"
	if qualifier != "" {
		field = qualifier + ".config_id"
	}
	if allowNull {
		return []string{"(" + field + " = ? OR " + field + " IS NULL)"}, []any{a.cfg.ConfigID}
	}

	return []string{field + " = ?"}, []any{a.cfg.ConfigID}
}

func whereSQL(clauses []string) string {
	if len(clauses) == 0 {
		return ""
	}

	return " WHERE " + strings.Join(clauses, " AND ")
}

func (a *App) logoURL(logo string) any {
	if strings.TrimSpace(logo) == "" {
		return nil
	}

	return a.cfg.OpenSIDBaseURL + "/desa/logo/" + logo
}

func (a *App) articleImageURL(image string) any {
	if strings.TrimSpace(image) == "" {
		return nil
	}

	return a.cfg.OpenSIDBaseURL + "/desa/upload/artikel/sedang_" + image
}

func (a *App) pamongImageURL(image string) any {
	if strings.TrimSpace(image) == "" {
		return nil
	}

	return a.cfg.OpenSIDBaseURL + "/desa/upload/pamong/" + image
}

func (a *App) documentURL(id int64, file, external string) any {
	if strings.TrimSpace(external) != "" {
		return external
	}
	if strings.TrimSpace(file) == "" {
		return nil
	}

	return fmt.Sprintf("%s/dokumen_web/unduh_berkas/%d", a.cfg.OpenSIDBaseURL, id)
}

func (a *App) pembangunanImageURL(image string) any {
	if strings.TrimSpace(image) == "" {
		return nil
	}

	return a.cfg.OpenSIDBaseURL + "/desa/upload/galeri/" + image
}

func excerpt(value string, length int) string {
	text := html.UnescapeString(tagPattern.ReplaceAllString(value, " "))
	text = strings.Join(strings.Fields(text), " ")
	runes := []rune(text)
	if len(runes) <= length {
		return text
	}
	if length <= 3 {
		return string(runes[:length])
	}

	return string(runes[:length-3]) + "..."
}

func statusLabel(active bool) string {
	if active {
		return "aktif"
	}

	return "nonaktif"
}

func sasaranLabel(code int64) string {
	switch code {
	case 1:
		return "Penduduk"
	case 2:
		return "Keluarga"
	case 3:
		return "Rumah tangga"
	case 4:
		return "Kelompok"
	default:
		return "Tidak diketahui"
	}
}

func clientIP(r *http.Request) string {
	if value := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); value != "" {
		return strings.TrimSpace(strings.Split(value, ",")[0])
	}
	if value := strings.TrimSpace(r.Header.Get("X-Real-IP")); value != "" {
		return value
	}

	return r.RemoteAddr
}
