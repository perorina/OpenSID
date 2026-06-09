package main

import (
	"context"
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

	status := "menunggu_impor"
	var catatan any = "Data DTKS lokal belum diimpor dari Excel."
	if ruta > 0 {
		status = "tersedia"
		catatan = nil
	}

	return map[string]any{
		"status": status, "ruta": ruta, "anggota": anggota, "lampiran": lampiran,
		"rtm_terdaftar_dtks": rtm, "versi_kuisioner": versions, "catatan": catatan,
	}, nil
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
