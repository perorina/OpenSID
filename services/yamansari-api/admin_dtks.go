package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
)

const dtksVersionRegsosEK2022K = "2"

type AdminDTKSItem struct {
	ID                 int64  `json:"id"`
	IsDraft            bool   `json:"isDraft"`
	IDRTM              int64  `json:"idRtm"`
	IDKeluarga         int64  `json:"idKeluarga"`
	VersiKuisioner     string `json:"versiKuisioner"`
	NoKK               string `json:"noKk"`
	KepalaKeluarga     string `json:"kepalaKeluarga"`
	KepalaNIK          string `json:"kepalaNik"`
	Dusun              string `json:"dusun"`
	RT                 string `json:"rt"`
	RW                 string `json:"rw"`
	NamaResponden      string `json:"namaResponden"`
	PetugasPencacahan  string `json:"petugasPencacahan"`
	PPL                string `json:"ppl"`
	PML                string `json:"pml"`
	Catatan            string `json:"catatan"`
	TanggalPendataan   string `json:"tanggalPendataan"`
	UpdatedAt          string `json:"updatedAt"`
	AnggotaCount       int64  `json:"anggotaCount"`
	OpenSIDFormPath    string `json:"opensidFormPath"`
	OpenSIDFormURL     string `json:"opensidFormUrl"`
	OpenSIDAnggotaPath string `json:"opensidAnggotaPath"`
	OpenSIDAnggotaURL  string `json:"opensidAnggotaUrl"`
}

type AdminDTKSAnggota struct {
	ID                int64  `json:"id"`
	IDPenduduk        int64  `json:"idPenduduk"`
	Nama              string `json:"nama"`
	NIK               string `json:"nik"`
	HubunganKRT       string `json:"hubunganKrt"`
	HubunganKK        string `json:"hubunganKk"`
	JenisKelamin      string `json:"jenisKelamin"`
	Bekerja           string `json:"bekerja"`
	PendapatanSebulan int64  `json:"pendapatanSebulan"`
	UpdatedAt         string `json:"updatedAt"`
}

func (a *App) adminDTKSList(w http.ResponseWriter, r *http.Request) {
	limit := safeLimit(r.URL.Query().Get("limit"), 50, 100)
	items, err := a.loadAdminDTKSItems(r.Context(), limit, 0)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "dtks_failed", "Data DTKS admin belum bisa dimuat.")
		return
	}

	summary, err := a.loadDTKS(r.Context())
	if err != nil {
		a.error(w, http.StatusInternalServerError, "summary_failed", "Ringkasan DTKS belum bisa dimuat.")
		return
	}

	a.ok(w, http.StatusOK, map[string]any{
		"summary": summary,
		"items":   items,
		"count":   len(items),
	}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminDTKSDetail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		a.error(w, http.StatusBadRequest, "invalid_id", "ID DTKS tidak valid.")
		return
	}

	item, err := a.loadAdminDTKSItem(r.Context(), id)
	if sqlNoRows(err) {
		a.error(w, http.StatusNotFound, "dtks_not_found", "Data DTKS tidak ditemukan.")
		return
	}
	if err != nil {
		a.error(w, http.StatusInternalServerError, "dtks_failed", "Detail DTKS belum bisa dimuat.")
		return
	}

	anggota, err := a.loadAdminDTKSAnggota(r.Context(), id)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "anggota_failed", "Anggota DTKS belum bisa dimuat.")
		return
	}

	indikator, err := a.loadAdminDTKSIndikator(r.Context(), id)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "indikator_failed", "Indikator DTKS belum bisa dimuat.")
		return
	}

	a.ok(w, http.StatusOK, map[string]any{"item": item, "anggota": anggota, "indikator": indikator}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminDTKSUpdateStatus(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil || id <= 0 {
		a.error(w, http.StatusBadRequest, "invalid_id", "ID DTKS tidak valid.")
		return
	}

	var payload struct {
		IsDraft *bool   `json:"isDraft"`
		Catatan *string `json:"catatan"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&payload); err != nil {
		a.error(w, http.StatusBadRequest, "invalid_json", "Payload perubahan DTKS tidak valid.")
		return
	}
	if payload.IsDraft == nil {
		a.error(w, http.StatusBadRequest, "missing_status", "Status draft wajib dikirim.")
		return
	}

	var result sql.Result
	if payload.Catatan == nil {
		result, err = a.db.ExecContext(r.Context(), "UPDATE dtks SET is_draft = ?, updated_at = NOW() WHERE id = ? AND config_id = ?", *payload.IsDraft, id, a.cfg.ConfigID)
	} else {
		catatan := strings.TrimSpace(*payload.Catatan)
		result, err = a.db.ExecContext(r.Context(), "UPDATE dtks SET is_draft = ?, catatan = ?, updated_at = NOW() WHERE id = ? AND config_id = ?", *payload.IsDraft, catatan, id, a.cfg.ConfigID)
	}
	if err != nil {
		a.error(w, http.StatusInternalServerError, "update_failed", "Status DTKS belum bisa diperbarui.")
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		a.error(w, http.StatusNotFound, "dtks_not_found", "Data DTKS tidak ditemukan.")
		return
	}

	a.cache.Invalidate(fmt.Sprintf("public:dtks:config:%d", a.cfg.ConfigID))
	a.cache.Invalidate(fmt.Sprintf("public:ringkasan:config:%d", a.cfg.ConfigID))

	item, err := a.loadAdminDTKSItem(r.Context(), id)
	if err != nil {
		a.error(w, http.StatusInternalServerError, "reload_failed", "Data DTKS berubah, tapi belum bisa dimuat ulang.")
		return
	}

	a.ok(w, http.StatusOK, map[string]any{"item": item}, responseMeta{"cache": string(CacheNone)})
}

func (a *App) adminDTKSSeedDummy(w http.ResponseWriter, r *http.Request) {
	result, err := a.seedDummyDTKS(r.Context())
	if err != nil {
		a.error(w, http.StatusInternalServerError, "seed_failed", "Dummy DTKS belum bisa dibuat.")
		return
	}

	a.cache.Invalidate(fmt.Sprintf("public:dtks:config:%d", a.cfg.ConfigID))
	a.cache.Invalidate(fmt.Sprintf("public:ringkasan:config:%d", a.cfg.ConfigID))

	a.ok(w, http.StatusOK, result, responseMeta{"cache": string(CacheNone)})
}

func (a *App) loadAdminDTKSItems(ctx context.Context, limit int, onlyID int64) ([]AdminDTKSItem, error) {
	for _, table := range []string{"dtks", "tweb_rtm", "tweb_keluarga", "tweb_penduduk", "tweb_wil_clusterdesa"} {
		if err := requireTable(a.schema, ctx, table); err != nil {
			return nil, err
		}
	}

	where := "WHERE d.config_id = ?"
	args := []any{a.cfg.ConfigID}
	if onlyID > 0 {
		where += " AND d.id = ?"
		args = append(args, onlyID)
	}
	args = append(args, limit)

	rows, err := a.db.QueryContext(ctx, `SELECT
  d.id,
  IFNULL(d.is_draft, 1),
  IFNULL(d.id_rtm, 0),
  IFNULL(d.id_keluarga, 0),
  IFNULL(d.versi_kuisioner, ''),
  IFNULL(d.nama_responden, ''),
  IFNULL(d.nama_petugas_pencacahan, ''),
  IFNULL(d.nama_ppl, ''),
  IFNULL(d.nama_pml, ''),
  IFNULL(d.catatan, ''),
  IFNULL(CAST(d.tanggal_pendataan AS CHAR), ''),
  IFNULL(CAST(d.updated_at AS CHAR), ''),
  IFNULL(rtm.no_kk, ''),
  IFNULL(keluarga.no_kk, ''),
  IFNULL(kepala.nama, ''),
  IFNULL(kepala.nik, ''),
  IFNULL(wil.dusun, ''),
  IFNULL(wil.rt, ''),
  IFNULL(wil.rw, ''),
  (SELECT COUNT(*) FROM dtks_anggota anggota WHERE anggota.id_dtks = d.id AND (anggota.config_id = d.config_id OR anggota.config_id IS NULL))
FROM dtks d
LEFT JOIN tweb_rtm rtm ON rtm.id = d.id_rtm
LEFT JOIN tweb_keluarga keluarga ON keluarga.id = d.id_keluarga
LEFT JOIN tweb_penduduk kepala ON kepala.id = COALESCE(keluarga.nik_kepala, rtm.nik_kepala)
LEFT JOIN tweb_wil_clusterdesa wil ON wil.id = kepala.id_cluster
`+where+`
ORDER BY d.updated_at DESC, d.id DESC
LIMIT ?`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []AdminDTKSItem{}
	for rows.Next() {
		item, err := a.scanAdminDTKSItem(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (a *App) loadAdminDTKSItem(ctx context.Context, id int64) (AdminDTKSItem, error) {
	items, err := a.loadAdminDTKSItems(ctx, 1, id)
	if err != nil {
		return AdminDTKSItem{}, err
	}
	if len(items) == 0 {
		return AdminDTKSItem{}, sql.ErrNoRows
	}

	return items[0], nil
}

type adminDTKSRowScanner interface {
	Scan(dest ...any) error
}

func (a *App) scanAdminDTKSItem(row adminDTKSRowScanner) (AdminDTKSItem, error) {
	var item AdminDTKSItem
	var isDraft int64
	var rtmNoKK, keluargaNoKK string
	if err := row.Scan(
		&item.ID,
		&isDraft,
		&item.IDRTM,
		&item.IDKeluarga,
		&item.VersiKuisioner,
		&item.NamaResponden,
		&item.PetugasPencacahan,
		&item.PPL,
		&item.PML,
		&item.Catatan,
		&item.TanggalPendataan,
		&item.UpdatedAt,
		&rtmNoKK,
		&keluargaNoKK,
		&item.KepalaKeluarga,
		&item.KepalaNIK,
		&item.Dusun,
		&item.RT,
		&item.RW,
		&item.AnggotaCount,
	); err != nil {
		return AdminDTKSItem{}, err
	}

	item.IsDraft = isDraft == 1
	item.NoKK = keluargaNoKK
	if item.NoKK == "" {
		item.NoKK = rtmNoKK
	}
	item.OpenSIDFormPath = fmt.Sprintf("/index.php/dtks/form/%d", item.ID)
	item.OpenSIDAnggotaPath = fmt.Sprintf("/index.php/dtks/listAnggota/%d", item.ID)
	item.OpenSIDFormURL = a.cfg.OpenSIDBaseURL + item.OpenSIDFormPath
	item.OpenSIDAnggotaURL = a.cfg.OpenSIDBaseURL + item.OpenSIDAnggotaPath

	return item, nil
}

func (a *App) loadAdminDTKSAnggota(ctx context.Context, idDTKS int64) ([]AdminDTKSAnggota, error) {
	if err := requireTable(a.schema, ctx, "dtks_anggota"); err != nil {
		return nil, err
	}

	rows, err := a.db.QueryContext(ctx, `SELECT
  anggota.id,
  IFNULL(anggota.id_penduduk, 0),
  IFNULL(penduduk.nama, ''),
  IFNULL(penduduk.nik, ''),
  IFNULL(anggota.kd_hubungan_dg_krt, ''),
  IFNULL(anggota.kd_hubungan_dg_kk, ''),
  IFNULL(anggota.kd_jenis_kelamin, ''),
  IFNULL(anggota.kd_bekerja_seminggu_lalu, ''),
  IFNULL(anggota.pendapatan_sebulan_terakhir, 0),
  IFNULL(CAST(anggota.updated_at AS CHAR), '')
FROM dtks_anggota anggota
LEFT JOIN tweb_penduduk penduduk ON penduduk.id = anggota.id_penduduk
WHERE anggota.id_dtks = ? AND (anggota.config_id = ? OR anggota.config_id IS NULL)
ORDER BY anggota.id ASC`, idDTKS, a.cfg.ConfigID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []AdminDTKSAnggota{}
	for rows.Next() {
		var item AdminDTKSAnggota
		if err := rows.Scan(&item.ID, &item.IDPenduduk, &item.Nama, &item.NIK, &item.HubunganKRT, &item.HubunganKK, &item.JenisKelamin, &item.Bekerja, &item.PendapatanSebulan, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}

	return items, rows.Err()
}

func (a *App) loadAdminDTKSIndikator(ctx context.Context, id int64) (map[string]any, error) {
	row := a.db.QueryRowContext(ctx, `SELECT
  IFNULL(kd_pkh, ''),
  IFNULL(kd_blt_dana_desa, ''),
  IFNULL(kd_bss_bnpt, ''),
  IFNULL(kd_subsidi_listrik, ''),
  IFNULL(kd_internet_sebulan, ''),
  IFNULL(luas_lantai, 0),
  IFNULL(jumlah_kamar_tidur, ''),
  IFNULL(kd_sumber_air_minum, ''),
  IFNULL(kd_sumber_penerangan_utama, ''),
  IFNULL(kd_bahan_bakar_memasak, '')
FROM dtks
WHERE id = ? AND config_id = ?
LIMIT 1`, id, a.cfg.ConfigID)

	var pkh, bltDanaDesa, bssBNPT, subsidiListrik, internetSebulan string
	var luasLantai int64
	var kamarTidur, airMinum, penerangan, bahanBakar string
	if err := row.Scan(&pkh, &bltDanaDesa, &bssBNPT, &subsidiListrik, &internetSebulan, &luasLantai, &kamarTidur, &airMinum, &penerangan, &bahanBakar); err != nil {
		return nil, err
	}

	return map[string]any{
		"pkh": pkh, "bltDanaDesa": bltDanaDesa, "bssBnpt": bssBNPT,
		"subsidiListrik": subsidiListrik, "internetSebulan": internetSebulan,
		"luasLantai": luasLantai, "jumlahKamarTidur": kamarTidur,
		"sumberAirMinum": airMinum, "sumberPenerangan": penerangan, "bahanBakarMemasak": bahanBakar,
	}, nil
}

func (a *App) seedDummyDTKS(ctx context.Context) (map[string]any, error) {
	for _, table := range []string{"tweb_rtm", "tweb_keluarga", "tweb_penduduk", "dtks", "dtks_anggota", "dtks_lampiran", "dtks_ref_lampiran"} {
		if err := requireTable(a.schema, ctx, table); err != nil {
			return nil, err
		}
	}

	rows, err := a.db.QueryContext(ctx, `SELECT keluarga.id, IFNULL(keluarga.no_kk, ''), IFNULL(keluarga.nik_kepala, 0), IFNULL(kepala.nama, ''), IFNULL(kepala.nik, '')
FROM tweb_keluarga keluarga
LEFT JOIN tweb_penduduk kepala ON kepala.id = keluarga.nik_kepala
WHERE keluarga.config_id = ? AND IFNULL(keluarga.nik_kepala, 0) > 0
ORDER BY keluarga.id ASC
LIMIT 6`, a.cfg.ConfigID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type seedFamily struct {
		id        int64
		noKK      string
		nikKepala int64
		nama      string
		nik       string
	}
	families := []seedFamily{}
	for rows.Next() {
		var family seedFamily
		if err := rows.Scan(&family.id, &family.noKK, &family.nikKepala, &family.nama, &family.nik); err != nil {
			return nil, err
		}
		if family.noKK == "" {
			family.noKK = fmt.Sprintf("DUMMY-DTKS-%03d", family.id)
		}
		families = append(families, family)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(families) == 0 {
		return nil, fmt.Errorf("tidak ada keluarga OpenSID yang bisa dijadikan seed DTKS")
	}

	tx, err := a.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var rtmCreated, dtksCreated, anggotaCreated, lampiranCreated int64
	for index, family := range families {
		rtmID, created, err := a.ensureSeedRTM(ctx, tx, family.id, family.noKK, family.nikKepala, index)
		if err != nil {
			return nil, err
		}
		if created {
			rtmCreated++
		}

		dtksID, created, err := a.ensureSeedDTKS(ctx, tx, family, rtmID, index)
		if err != nil {
			return nil, err
		}
		if created {
			dtksCreated++
		}

		inserted, err := a.ensureSeedDTKSAnggota(ctx, tx, family.id, dtksID, index)
		if err != nil {
			return nil, err
		}
		anggotaCreated += inserted

		created, err = a.ensureSeedDTKSLampiran(ctx, tx, rtmID, dtksID, index)
		if err != nil {
			return nil, err
		}
		if created {
			lampiranCreated++
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return map[string]any{
		"rtmCreated": rtmCreated, "dtksCreated": dtksCreated,
		"anggotaCreated": anggotaCreated, "lampiranCreated": lampiranCreated,
		"familiesScanned": len(families),
	}, nil
}

func (a *App) ensureSeedRTM(ctx context.Context, tx *sql.Tx, keluargaID int64, noKK string, nikKepala int64, index int) (int64, bool, error) {
	var id int64
	err := tx.QueryRowContext(ctx, "SELECT id FROM tweb_rtm WHERE config_id = ? AND no_kk = ? LIMIT 1", a.cfg.ConfigID, noKK).Scan(&id)
	if err == nil {
		_, updateErr := tx.ExecContext(ctx, "UPDATE tweb_rtm SET terdaftar_dtks = 1 WHERE id = ?", id)
		return id, false, updateErr
	}
	if !sqlNoRows(err) {
		return 0, false, err
	}

	bdt := fmt.Sprintf("YMS%04d", keluargaID)
	result, err := tx.ExecContext(ctx, `INSERT INTO tweb_rtm (config_id, nik_kepala, no_kk, tgl_daftar, kelas_sosial, bdt, terdaftar_dtks)
VALUES (?, ?, ?, NOW(), ?, ?, 1)`, a.cfg.ConfigID, nikKepala, noKK, (index%4)+1, bdt)
	if err != nil {
		return 0, false, err
	}

	id, err = result.LastInsertId()
	return id, true, err
}

func (a *App) ensureSeedDTKS(ctx context.Context, tx *sql.Tx, family struct {
	id        int64
	noKK      string
	nikKepala int64
	nama      string
	nik       string
}, rtmID int64, index int) (int64, bool, error) {
	var id int64
	err := tx.QueryRowContext(ctx, "SELECT id FROM dtks WHERE config_id = ? AND (id_rtm = ? OR id_keluarga = ?) LIMIT 1", a.cfg.ConfigID, rtmID, family.id).Scan(&id)
	if err == nil {
		_, updateErr := tx.ExecContext(ctx, "UPDATE dtks SET id_rtm = ?, id_keluarga = ?, updated_at = NOW() WHERE id = ?", rtmID, family.id, id)
		return id, false, updateErr
	}
	if !sqlNoRows(err) {
		return 0, false, err
	}

	result, err := tx.ExecContext(ctx, `INSERT INTO dtks (
  config_id, is_draft, id_rtm, id_keluarga, versi_kuisioner, catatan,
  kode_provinsi, kode_kabupaten, kode_kecamatan, kode_desa, nama_sls_non_sls,
  no_urut_ruta, tanggal_pencacahan, nama_petugas_pencacahan, nama_responden,
  tanggal_pendataan, nama_ppl, nama_pml, no_hp_responden,
  luas_lantai, jumlah_kamar_tidur, kd_pkh, kd_blt_dana_desa, kd_bss_bnpt,
  kd_subsidi_listrik, kd_internet_sebulan, created_at, updated_at
) VALUES (
  ?, ?, ?, ?, ?, ?,
  '33', '3328', '332806', '3328062005', ?,
  ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), ?, ?,
  DATE_SUB(CURDATE(), INTERVAL ? DAY), ?, ?, ?,
  ?, ?, ?, ?, ?,
  ?, ?, NOW(), NOW()
)`,
		a.cfg.ConfigID,
		index%3 == 0,
		rtmID,
		family.id,
		dtksVersionRegsosEK2022K,
		fmt.Sprintf("Seed dummy DTKS untuk validasi dashboard admin. Ruta %s.", family.noKK),
		fmt.Sprintf("Yamansari %03d", index+1),
		fmt.Sprintf("%03d", index+1),
		index+2,
		fmt.Sprintf("Petugas Cacah %d", index+1),
		family.nama,
		index+1,
		fmt.Sprintf("PPL %d", index+1),
		fmt.Sprintf("PML %d", index+1),
		fmt.Sprintf("08%010d", 2100000000+index),
		36+index*4,
		strconv.Itoa(2+(index%3)),
		codeYesNo(index%2 == 0),
		codeYesNo(index%3 == 0),
		codeYesNo(index%2 == 1),
		codeYesNo(index%3 == 1),
		codeYesNo(index%2 == 0),
	)
	if err != nil {
		return 0, false, err
	}

	id, err = result.LastInsertId()
	return id, true, err
}

func (a *App) ensureSeedDTKSAnggota(ctx context.Context, tx *sql.Tx, keluargaID, dtksID int64, familyIndex int) (int64, error) {
	var existing int64
	if err := tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM dtks_anggota WHERE config_id = ? AND id_dtks = ?", a.cfg.ConfigID, dtksID).Scan(&existing); err != nil {
		return 0, err
	}
	if existing > 0 {
		return 0, nil
	}

	rows, err := tx.QueryContext(ctx, "SELECT id, IFNULL(sex, 0), IFNULL(kk_level, 0) FROM tweb_penduduk WHERE config_id = ? AND id_kk = ? ORDER BY kk_level ASC, id ASC LIMIT 8", a.cfg.ConfigID, keluargaID)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	var inserted int64
	for rows.Next() {
		var idPenduduk, sex, kkLevel int64
		if err := rows.Scan(&idPenduduk, &sex, &kkLevel); err != nil {
			return 0, err
		}
		hubunganKRT := "3"
		if inserted == 0 || kkLevel == 1 {
			hubunganKRT = "1"
		}
		_, err := tx.ExecContext(ctx, `INSERT INTO dtks_anggota (
  config_id, id_dtks, id_penduduk, id_keluarga, kd_ket_keberadaan_art,
  kd_hubungan_dg_krt, kd_hubungan_dg_kk, kd_jenis_kelamin, kd_punya_kartuid,
  kd_bekerja_seminggu_lalu, pendapatan_sebulan_terakhir, is_usaha_sendiri_bersama,
  created_at, updated_at
) VALUES (?, ?, ?, ?, '1', ?, ?, ?, '1', ?, ?, 0, NOW(), NOW())`,
			a.cfg.ConfigID,
			dtksID,
			idPenduduk,
			keluargaID,
			hubunganKRT,
			nullableCode(kkLevel),
			nullableCode(sex),
			codeYesNo((familyIndex+int(inserted))%2 == 0),
			750000+(familyIndex*125000)+(int(inserted)*50000),
		)
		if err != nil {
			return 0, err
		}
		inserted++
	}

	return inserted, rows.Err()
}

func (a *App) ensureSeedDTKSLampiran(ctx context.Context, tx *sql.Tx, rtmID, dtksID int64, index int) (bool, error) {
	var existing int64
	if err := tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM dtks_lampiran WHERE config_id = ? AND id_rtm = ?", a.cfg.ConfigID, rtmID).Scan(&existing); err != nil {
		return false, err
	}
	if existing > 0 {
		return false, nil
	}

	result, err := tx.ExecContext(ctx, `INSERT INTO dtks_lampiran (config_id, id_rtm, judul, keterangan, foto, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
		a.cfg.ConfigID,
		rtmID,
		"DTKS",
		"Dummy lampiran validasi dashboard",
		fmt.Sprintf("dummy-dtks-yamansari-%03d.webp", index+1),
	)
	if err != nil {
		return false, err
	}

	lampiranID, err := result.LastInsertId()
	if err != nil {
		return false, err
	}

	if a.schema.HasColumn(ctx, "dtks_ref_lampiran", "config_id") {
		_, err = tx.ExecContext(ctx, "INSERT INTO dtks_ref_lampiran (config_id, id_dtks, id_lampiran) VALUES (?, ?, ?)", a.cfg.ConfigID, dtksID, lampiranID)
	} else {
		_, err = tx.ExecContext(ctx, "INSERT INTO dtks_ref_lampiran (id_dtks, id_lampiran) VALUES (?, ?)", dtksID, lampiranID)
	}
	if err != nil {
		return false, err
	}

	return true, nil
}

func codeYesNo(value bool) string {
	if value {
		return "1"
	}

	return "2"
}

func nullableCode(value int64) string {
	if value <= 0 {
		return ""
	}

	return strconv.FormatInt(value, 10)
}
