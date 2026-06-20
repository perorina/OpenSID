# Catatan DTKS dan Data Penduduk OpenSID

Sumber struktur diambil dari migration OpenSID lokal, bukan hasil introspeksi database runtime. MariaDB lokal belum aktif saat catatan ini dibuat.

## Tabel Utama

### `dtks`

Tabel rumah tangga/keluarga DTKS. Jumlah field dari migration: 138.

Field identitas dan relasi yang paling penting:

```text
id
config_id
is_draft
id_rtm
id_keluarga
created_at
updated_at
versi_kuisioner
catatan
```

Field wilayah dan nomor urut:

```text
kode_provinsi
kode_kabupaten
kode_kecamatan
kode_desa
kode_sls_non_sls
kode_sub_sls
nama_sls_non_sls
no_urut_bangunan_tinggal
no_urut_keluarga_verif
status_keluarga
kode_landmark_wilkerstat
kd_kk
no_urut_ruta
```

Field petugas/responden:

```text
tanggal_pencacahan
nama_petugas_pencacahan
kode_petugas_pencacahan
tanggal_pemeriksaan
nama_pemeriksa
kode_pemeriksa
nama_responden
kd_hasil_pencacahan_ruta
tanggal_pendataan
nama_ppl
kode_ppl
nama_pml
kode_pml
kd_hasil_pendataan_keluarga
no_hp_responden
```

Field kondisi rumah/aset/bantuan banyak memakai kode `kd_*`, bulan, dan tahun. Untuk dashboard admin Vite, cukup tampilkan ringkasan awal dulu: status draft/final, kepala keluarga, wilayah, anggota, petugas, indikator bantuan cepat, dan tautan edit OpenSID.

### `tweb_penduduk`

Tabel utama data warga. Jumlah field dari migration: 62.

Field penting:

```text
id
config_id
nama
nik
id_kk
kk_level
id_rtm
rtm_level
tempatlahir
tanggallahir
agama_id
pendidikan_kk_id
pendidikan_sedang_id
pekerjaan_id
status_kawin
warganegara_id
nama_ayah
nama_ibu
foto
id_cluster
alamat_sebelumnya
alamat_sekarang
status_dasar
telepon
email
telegram
```

Catatan: `foto` pada `tweb_penduduk` adalah foto penduduk. Berbeda dari `dtks_lampiran.foto`, yang merupakan file/foto lampiran DTKS.

## Tabel Pendukung DTKS

### `dtks_anggota`

Daftar anggota dalam satu record DTKS. Jumlah field: 71.

Field relasi utama:

```text
id
config_id
id_dtks
id_penduduk
id_keluarga
created_at
updated_at
```

Field profil anggota DTKS banyak memakai kode, misalnya:

```text
kd_hubungan_dg_krt
kd_hubungan_dg_kk
kd_jenis_kelamin
kd_punya_kartuid
kd_bekerja_seminggu_lalu
pendapatan_sebulan_terakhir
kd_pendidikan_tertinggi
kd_ijazah_tertinggi
kd_punya_npwp
kd_bantuan_pempus
kd_bantuan_pemkot
kd_bantuan_pemdes
```

### `dtks_lampiran`

Lampiran/foto DTKS. Jumlah field: 8.

```text
id
config_id
id_rtm
judul
keterangan
foto
created_at
updated_at
```

`foto` menyimpan nama/path file lampiran, bukan binary gambar langsung. Lokasi upload OpenSID: `desa/upload/dtks/`.

### `dtks_ref_lampiran`

Tabel pivot antara DTKS dan lampiran.

```text
id
id_dtks
id_lampiran
```

Pada migration yang lebih baru, `config_id` bisa ditambahkan ke tabel ini.

### `dtks_pengaturan_program`

Mapping program bantuan ke field DTKS.

```text
id
config_id
versi_kuisioner
kode
id_bantuan
nilai_default
target_table
target_field
created_at
updated_at
```

### `tweb_rtm`

Rumah tangga miskin/RTM yang menjadi salah satu anchor DTKS.

```text
id
config_id
nik_kepala
no_kk
tgl_daftar
kelas_sosial
bdt
terdaftar_dtks
```

Catatan penting: nama `nik_kepala` di `tweb_rtm` dan `tweb_keluarga` pada praktik query OpenSID mengarah ke `tweb_penduduk.id`, bukan NIK string.

## Relasi Penting

Relasi inti DTKS ke penduduk:

```text
dtks.id_rtm              -> tweb_rtm.id
dtks.id_keluarga         -> tweb_keluarga.id
dtks_anggota.id_dtks     -> dtks.id
dtks_anggota.id_penduduk -> tweb_penduduk.id
dtks_anggota.id_keluarga -> tweb_keluarga.id
tweb_penduduk.id_kk      -> tweb_keluarga.id
tweb_penduduk.id_rtm     -> tweb_rtm.id
```

Relasi kepala keluarga:

```text
tweb_keluarga.nik_kepala -> tweb_penduduk.id
tweb_rtm.nik_kepala      -> tweb_penduduk.id
```

Relasi wilayah:

```text
tweb_penduduk.id_cluster -> tweb_wil_clusterdesa.id
```

Relasi lampiran:

```text
dtks_lampiran.id_rtm          -> tweb_rtm.id
dtks_ref_lampiran.id_dtks     -> dtks.id
dtks_ref_lampiran.id_lampiran -> dtks_lampiran.id
```

## Query Dasar Untuk Dashboard Admin

List DTKS:

```sql
SELECT
  d.id,
  d.is_draft,
  d.id_rtm,
  d.id_keluarga,
  d.versi_kuisioner,
  d.nama_responden,
  d.nama_ppl,
  d.nama_pml,
  d.updated_at,
  keluarga.no_kk,
  kepala.nama AS kepala_keluarga,
  kepala.nik AS kepala_nik,
  wilayah.dusun,
  wilayah.rt,
  wilayah.rw,
  (
    SELECT COUNT(*)
    FROM dtks_anggota anggota
    WHERE anggota.id_dtks = d.id
  ) AS anggota_count
FROM dtks d
LEFT JOIN tweb_rtm rtm ON rtm.id = d.id_rtm
LEFT JOIN tweb_keluarga keluarga ON keluarga.id = d.id_keluarga
LEFT JOIN tweb_penduduk kepala ON kepala.id = COALESCE(keluarga.nik_kepala, rtm.nik_kepala)
LEFT JOIN tweb_wil_clusterdesa wilayah ON wilayah.id = kepala.id_cluster
WHERE d.config_id = ?
ORDER BY d.updated_at DESC, d.id DESC;
```

Detail anggota:

```sql
SELECT
  anggota.id,
  anggota.id_penduduk,
  penduduk.nama,
  penduduk.nik,
  anggota.kd_hubungan_dg_krt,
  anggota.kd_hubungan_dg_kk,
  anggota.kd_jenis_kelamin,
  anggota.kd_bekerja_seminggu_lalu,
  anggota.pendapatan_sebulan_terakhir
FROM dtks_anggota anggota
LEFT JOIN tweb_penduduk penduduk ON penduduk.id = anggota.id_penduduk
WHERE anggota.id_dtks = ?;
```

## Catatan Implementasi Vite/Go

- `/dtks` di Vite harus admin-only, bukan halaman publik.
- Metadata `/dtks` harus hidden dari search engine: `noindex, nofollow, noarchive, noimageindex`.
- API publik boleh menyajikan agregat DTKS, tapi data personal/detail harus lewat endpoint admin.
- Endpoint admin harus membaca session admin OpenSID/API, bukan session Mandiri warga.
- Seed dummy DTKS perlu mengisi minimal `tweb_rtm`, `dtks`, dan `dtks_anggota`. Lampiran dummy opsional tapi berguna untuk validasi UI.
- Untuk UI awal, jangan tampilkan seluruh 138 field. Pakai progressive disclosure: ringkasan, list ruta, lalu detail anggota dan indikator cepat.
