# Changes - Yamansari OpenSID Derivative

Catatan ini dipakai untuk melacak perubahan lokal selama refactor OpenSID menjadi turunan yang lebih ringan dan konkret untuk Desa Yamansari.

## 2026-06-09

### Arah kerja

- Fokus awal: menjalankan base OpenSID lokal, memangkas bottleneck admin, dan menyiapkan identitas Yamansari.
- Prinsip refactor: fitur warga/admin dibuat lebih jelas, tidak membingungkan, dan tidak bergantung pada request eksternal yang tidak perlu saat development.

### Login admin

- Menambahkan controller ringan untuk halaman auth: `donjo-app/core/Auth_Controller.php`.
- Mengubah controller login admin agar memakai controller auth ringan, bukan bootstrap admin penuh.
- Menghapus captcha dari login admin lokal agar flow development tidak terhambat.
- Menambahkan partial CSRF sederhana: `resources/views/admin/auth/_csrf.blade.php`.
- Mengurangi dependency login terhadap asset/JS berat seperti captcha flow lama.
- Mengubah `app/Providers/ViewServiceProvider.php` agar halaman auth tidak memaksa load identitas/admin bootstrap berat.
- Verifikasi: halaman `/index.php/siteman` bisa dibuka dan login lokal berhasil melalui browser.

### Dashboard dan bootstrap admin

- Menambahkan/mengaktifkan mode lokal untuk menghindari external dashboard checks: `dashboard_external_checks = false` di `donjo-app/config/config.php`.
- Mematikan tracking OpenSID lokal di DB: `setting_aplikasi.enable_track = 0`.
- Alasan: tracker Pantau/OpenDesa melakukan request eksternal saat admin bootstrap dan sempat memicu error schema tabel `notifikasi` pada database lokal.
- Catatan: perubahan `enable_track = 0` masih DB-only. Untuk fork, sebaiknya dibuat migration/seed/config dev resmi.

### Guard eksternal admin

- Menambahkan flag `admin_external_checks = false` di `donjo-app/config/config.php`.
- Mengubah `donjo-app/core/MY_Controller.php` agar `Tracker::trackDesa()` hanya berjalan saat `opensid_tracking_enabled = true`.
- Membuka `donjo-app/core/Admin_Controller.php` dari bentuk obfuscated/eval menjadi PHP biasa agar fork lebih mudah dirawat.
- Mengubah `Admin_Controller` agar `PelangganService::perbaruiLangganan()` dan `PelangganService::statusLangganan()` hanya dipanggil saat `admin_external_checks = true`.
- Alasan: halaman admin selain Beranda, termasuk `/index.php/status_desa`, masih memanggil layanan eksternal `layanan.opendesa.id` dari constructor dan menghasilkan error `Token not provided`.
- Verifikasi: reload `/index.php/status_desa` berhasil dan tidak menambah baris error baru di `storage/logs/opensid-2026-06-09.log`.

### Anti-tracking Yamansari

- Menambahkan flag eksplisit `opensid_tracking_enabled = false` untuk mematikan telemetry/tracking OpenSID ke Pantau.
- Menambahkan flag `opendesa_service_checks = false` untuk mematikan cek layanan/langganan OpenDesa otomatis saat page load.
- Mengubah `MY_Controller` agar `Tracker::trackDesa()` hanya berjalan saat `opensid_tracking_enabled = true`.
- Mengamankan `Tracker`, `httpPost()`, `get_data_desa()`, `getKodeDesaFromTrackSID()`, dan `kirim_versi_opensid()` agar tidak melakukan request Pantau/catat-versi saat tracking dimatikan.
- Mengubah `Web_Controller::pemesanan()` agar tidak memanggil `PelangganService::perbaruiLangganan()` otomatis ketika `opendesa_service_checks = false`.
- Mengubah cek status Pantau di form Identitas Desa dan Penduduk agar tidak melakukan ping eksternal saat tracking dimatikan.
- Verifikasi: `php -l` bersih untuk file yang diubah, request lokal `/index.php/status_desa` dan `/` berhasil HTTP 200, dan log tidak bertambah error baru.

### Scope dashboard inti Yamansari

- Menambahkan dokumen scope produk `docs/product/yamansari-core-scope.md`.
- Menambahkan flag `yamansari_core_dashboard = true` untuk mengganti Beranda dari halaman Tentang OpenSID menjadi dashboard internal operasional.
- Menambahkan flag `yamansari_core_menu_enabled = true` dan whitelist `yamansari_core_menu_slugs` untuk menyaring sidebar admin ke modul inti tahap 1.
- Mengubah `admin_menu()` agar menu yang sudah di-cache tetap difilter berdasarkan scope Yamansari.
- Mengubah dashboard Beranda menjadi kelompok kerja: Basis Data Desa, Layanan Warga, Program Desa, Publikasi Website, dan Administrasi Sistem.
- Modul non-inti seperti Lapak, OpenDK, Anjungan, Buku Tamu, Layanan Pelanggan, dan fitur legacy diparkir dari sidebar tanpa menghapus source.

### Dashboard internal operasional

- Mengubah Beranda inti menjadi ruang kerja internal Yamansari dengan ringkasan data, alur operasional, fitur inti tahap 1, dan daftar fitur yang sengaja diparkir.
- Beranda mode inti tidak lagi memanggil `Shortcut::querys()` karena query tersebut menghitung banyak modul OpenSID lintas scope dan membuat halaman pertama setelah login membawa beban fitur non-inti.
- Menambahkan ringkasan ringan dari tabel inti: penduduk aktif, keluarga, wilayah, permohonan surat baru, arsip surat, program bantuan, pembangunan, dan artikel publik.
- Menambahkan penjelasan output tiap modul inti agar scope tidak sekadar daftar menu, melainkan alur kerja yang punya hasil jelas.
- Memperbarui `docs/product/yamansari-core-scope.md` dengan struktur dashboard internal dan alasan performa.

### Status Desa / IDM

- Menambahkan flag `status_desa_external_checks` di `donjo-app/config/config.php`.
- Nilai saat ini: `status_desa_external_checks = true`, supaya halaman Status Desa mengambil data IDM asli dari API Kemendesa.
- Menambahkan fallback dummy lokal `idm_lokal_dummy()` di `donjo-app/helpers/opensid_helper.php` untuk mode development jika flag eksternal dimatikan.
- Mengubah `idm()` agar bisa short-circuit ke data lokal saat `status_desa_external_checks = false`.
- Mengamankan `Status_desa::perbarui_idm()` agar tidak memanggil API eksternal saat mode lokal dimatikan.
- Mengubah `resources/views/admin/status_desa/idm.blade.php` agar akses `$idm->error_msg` aman dan tombol `Perbarui` disabled saat mode lokal.

### Identitas Yamansari

- Mengganti kode desa lokal dari dummy `3328000001` ke kode asli Yamansari.
- Kode wilayah resmi: `33.28.06.2005`.
- Kode OpenSID/API tanpa titik: `3328062005`.
- Referensi: halaman resmi Kecamatan Lebaksiu untuk Desa Yamansari: `https://lebaksiu.tegalkab.go.id/public/desa/desa-yamansari`.
- Perubahan DB lokal pada tabel `config`:
  - `nama_desa = Yamansari`
  - `kode_desa = 3328062005`
  - `kode_desa_bps = 3328062005`
  - `kode_kecamatan = 332806`
  - `kode_kabupaten = 3328`
  - `kode_propinsi = 33`
  - `nama_kecamatan = Lebaksiu`
  - `nama_kabupaten = Tegal`
  - `nama_propinsi = Jawa Tengah`

### Verifikasi Status Desa

- API IDM Kemendesa untuk `3328062005/2021` berhasil mengembalikan data valid.
- Hasil tampil di halaman `/index.php/status_desa`:
  - Skor IDM saat ini: `0.7303`
  - Status IDM: `MAJU`
  - Skor minimal: `0.8156`
  - Target status: `MANDIRI`
  - Identitas: `JAWA TENGAH / TEGAL / LEBAKSIU / YAMANSARI`
- Kesimpulan: angka `0.0000` sebelumnya bukan dari source OpenSID asli, melainkan dari mode dummy lokal dan kode desa dummy yang invalid.

### Catatan operasional

- Setelah mengubah identitas atau setting cache-heavy, bersihkan cache `storage/framework/cache/data` dan compiled view `storage/framework/views`, lalu restart PHP dev server.
- Jangan commit credential lokal atau password admin development ke fork.
- Perubahan DB lokal perlu dikonversi menjadi migration/seed jika nanti repo fork dipakai sebagai baseline tim.

### Setup GitHub fork

- Folder lokal `F:\masx\OpenSID-2606.0.0\OpenSID-2606.0.0` sudah dijadikan Git working tree.
- Branch lokal: `yamansari-refactor`.
- Remote fork:
  - `origin = https://github.com/perorina/OpenSID.git`
  - default branch fork: `umum`
- Remote upstream resmi:
  - `upstream = https://github.com/OpenSID/OpenSID.git`
  - branch acuan: `umum`
- Catatan penting: folder lokal awalnya berasal dari release extract, bukan clone Git penuh. Karena itu `git status` bisa menampilkan banyak file upstream sebagai deleted/untracked. Commit harus selektif hanya untuk file refactor Yamansari.

### Seeder dummy development Yamansari

- Menambahkan flag `yamansari_dev_dummy_enabled = true` di `donjo-app/config/config.php` untuk mengaktifkan seeder dummy khusus lokal.
- Menambahkan route development `GET /index.php/dev/yamansari_dummy` yang hanya boleh jalan dari `127.0.0.1` / `::1` dan saat flag dummy aktif.
- Mengubah `Dev` controller agar tidak lagi bergantung ke `Faker_Controller`, karena dependency Faker di folder `tools/vendor` tidak tersedia pada setup lokal ini.
- Seeder bersifat idempotent: data dummy lama Yamansari dibersihkan lalu dibuat ulang memakai marker `DUMMY_YAMANSARI`, slug `dummy-yamansari-*`, prefix KK `3328069900`, dan prefix NIK pamong `33280688`.
- Seeder mengisi data dummy inti untuk tahap development: wilayah, keluarga, penduduk, pamong, permohonan surat, arsip surat, program bantuan, peserta bantuan, pembangunan, kategori, dan artikel.
- Seeder memakai helper insert adaptif yang membaca kolom tabel lokal (`SHOW COLUMNS`) lalu hanya mengirim field yang ada, supaya aman terhadap variasi schema OpenSID release lokal.
- Hasil run lokal 2026-06-09: 137 penduduk aktif, 36 keluarga, 36 wilayah, 5 pamong, 8 permohonan baru, 18 surat tercetak, 5 program bantuan, 50 peserta bantuan, 5 pembangunan, dan 6 artikel.
- Verifikasi: endpoint seeder HTTP 200, dashboard `/index.php/beranda` menampilkan angka non-zero, `php -l` bersih untuk `Dev.php`, `config.php`, dan `Routes/web.php`, serta tidak ada error log baru setelah seeder sukses.
- Catatan produksi: route dan flag ini hanya untuk development. Jangan aktifkan endpoint dummy di deployment publik/production.

### Aktivasi Satu Data/DTKS

- Mengaktifkan parent menu `satu-data` dan child menu `dtks` di whitelist `yamansari_core_menu_slugs`.
- Memindahkan `Satu Data/DTKS` dari daftar fitur parkir ke fitur inti kelompok `Program Desa` pada dashboard internal Yamansari.
- Menambahkan statistik ringkasan `DTKS` yang menghitung tabel `dtks` dan memakai konteks `siap impor Excel`.
- Memperbarui alur operasional dashboard agar DTKS disebut sebagai bagian dari pengelolaan program desa.
- Verifikasi: dashboard `/index.php/beranda` menampilkan card dan statistik DTKS, sidebar menampilkan `Satu Data > DTKS`, halaman `/index.php/dtks` HTTP 200 dan menyediakan tombol `Impor` / `Ekspor ke excel`.
- Catatan: count DTKS saat ini masih 0 karena data Excel asli belum diimpor.

### API backend Yamansari v1

- Menambahkan namespace controller `donjo-app/controllers/yamansari_api` untuk API turunan Yamansari yang terpisah dari `internal_api` bawaan OpenSID.
- Menambahkan route publik `GET /index.php/api/yamansari/v1` sebagai kontrak awal backend untuk frontend Vite.
- Endpoint awal yang tersedia: `profil`, `ringkasan`, `artikel`, `pembangunan`, `program-bantuan`, dan `dtks`.
- Payload dibuat read-only dan ringkas; data warga sensitif seperti NIK/KK tidak diekspos di API publik tahap awal.
- Menambahkan header CORS terbatas untuk origin development Vite lokal: `localhost/127.0.0.1` pada port `5173`, `5174`, dan `3000`.
- Catatan arsitektur: frontend Vite nanti sebaiknya membaca data dari API Yamansari ini, bukan mengurai HTML/theme OpenSID lama.
- Verifikasi: semua endpoint awal HTTP 200 di `127.0.0.1:8081`, ringkasan mengembalikan data dummy Yamansari, dan header CORS lokal muncul untuk origin `http://localhost:5173`.

### Optimasi runtime API lokal

- Benchmark ulang API menunjukkan static file lokal hanya sekitar 1-5 ms, sementara endpoint PHP tanpa query DB masih sekitar 200-280 ms sebelum optimasi.
- Penyebab utama baseline lambat adalah bootstrap/parsing OpenSID/PHP per request, bukan query database murni.
- Mengaktifkan OPcache dan memperbesar realpath cache pada runtime lokal `tools/opensid-php.ini` untuk development server `127.0.0.1:8081`.
- Setelah restart server lokal, endpoint ringan turun signifikan: `api/yamansari/v1` dari sekitar 284 ms ke 120 ms, `api/yamansari/v1/ringkasan` dari sekitar 327 ms ke 135 ms, dan halaman root PHP dari sekitar 1,6 detik ke 663 ms.
- Catatan: `tools/opensid-php.ini` adalah konfigurasi runtime lokal dan tidak ikut commit fork; jika perlu dibakukan, buat template/config dev resmi di luar folder `tools`.

### Go API Yamansari `/api/yms` dan Frontend Vite

- Menambahkan service Go baru di `services/yamansari-api/` sebagai backend cepat untuk frontend warga dan transaksi layanan mandiri yang scope-nya jelas.
- Base path final: `/api/yms`; dev port: `127.0.0.1:8090`; router memakai `chi`; DB direct ke MySQL OpenSID.
- Endpoint publik yang tersedia:
  - `GET /api/yms/health`
  - `GET /api/yms/profil`
  - `GET /api/yms/ringkasan`
  - `GET /api/yms/artikel?limit=6`
  - `GET /api/yms/pembangunan?limit=6`
  - `GET /api/yms/program-bantuan?limit=6`
  - `GET /api/yms/dtks`
- Cache public memakai in-memory TTL + stale fallback + `singleflight`, dengan sweeper expired cache tiap 10 detik.
- Policy cache public mengikuti plan awal: `profil` 5 menit, `ringkasan` 30 detik, `artikel/pembangunan/program-bantuan/dtks` 60 detik, dan stale window masing-masing 15-30 detik.
- Jika refresh cache gagal dan stale masih ada, response mengembalikan `meta.cache = "stale"`; jika cache kosong dan DB gagal, response JSON 503 rapi.
- Endpoint mandiri selalu mengirim `Cache-Control: no-store` dan tidak memakai shared cache untuk data personal.
- Menambahkan table bootstrap `yms_sessions` otomatis saat service start untuk refresh session Go:
  - refresh token opaque disimpan sebagai SHA-256 hash
  - access token JWT cookie HttpOnly TTL 15 menit
  - refresh cookie HttpOnly TTL 7 hari
  - CSRF token wajib untuk request mutasi mandiri
- Auth warga Go mendukung PIN bcrypt OpenSID dan hash PIN MD5 legacy OpenSID.
- Login rate limit mengikuti target plan: 3 percobaan gagal lalu lockout 300 detik per NIK+IP.
- Endpoint mandiri yang tersedia:
  - `POST /api/yms/mandiri/auth/masuk`
  - `POST /api/yms/mandiri/auth/refresh`
  - `POST /api/yms/mandiri/auth/keluar`
  - `GET /api/yms/mandiri/me`
  - `GET /api/yms/mandiri/surat/templates`
  - `GET /api/yms/mandiri/surat/permohonan`
  - `POST /api/yms/mandiri/surat/permohonan`
  - `POST /api/yms/mandiri/surat/permohonan/{id}/batal`
  - `GET /api/yms/mandiri/surat/arsip`
- Transaksi surat via Go menulis langsung ke `permohonan_surat` dengan `config_id` dari `YMS_CONFIG_ID`, `id_pemohon` dari session, dan status awal `1`/`Sedang Diperiksa`.
- Create permohonan memvalidasi template surat mandiri (`mandiri=1`, `kunci=0`, non-RTF), nomor HP aktif, keterangan, isian form, dan syarat dokumen warga.
- Pembatalan hanya boleh untuk permohonan milik user login dengan status `0` atau `1`; status dibatalkan memakai kode `5`.
- Setelah create/batal surat, cache `public:ringkasan` dan prefix cache mandiri user terkait langsung dihapus.
- Arsip surat Go v1 hanya mengembalikan metadata dan `cetak_url` ke route OpenSID lama: `/index.php/layanan-mandiri/surat/cetak/{id}`.
- Menambahkan unit test Go untuk cache stale fallback dan kompatibilitas hash PIN legacy OpenSID.
- Menambahkan frontend Vite React di `frontend/` dengan `VITE_YMS_API_BASE=http://127.0.0.1:8090/api/yms`.
- Halaman frontend v1:
  - Home publik ringkas
  - Artikel
  - Pembangunan
  - Program bantuan
  - DTKS ringkas
  - Login layanan mandiri
  - Dashboard mandiri surat
  - Permohonan surat
  - Arsip surat
- Frontend tidak memanggil `/index.php/internal_api/*`, `/index.php/api/yamansari/v1/*`, atau endpoint eksternal SDGS/IDM.
- Verifikasi lokal:
  - `go test ./...` di `services/yamansari-api` sukses.
  - `npm run build` di `frontend` sukses.
  - Go API public endpoint lokal sukses: `health` sekitar 2 ms, `ringkasan` miss sekitar 67 ms, `ringkasan` cache hit sekitar 1 ms.
  - `GET /api/yms/mandiri/me` tanpa login mengembalikan 401 dengan `Cache-Control: no-store`.
  - Browser Vite `http://127.0.0.1:5173/` render data Yamansari dummy: 137 penduduk aktif, 36 keluarga, 8 permohonan baru, 6 artikel, tanpa console error.
- Catatan development lokal: `desa/config/database.php` menyimpan password DB terenkripsi Laravel; untuk menjalankan Go API lokal, DSN perlu disuplai lewat env `YMS_DB_DSN`. Credential lokal tidak dicatat dan tidak boleh dicommit.
- Catatan test mandiri: DB dummy lokal saat ini belum memiliki akun `tweb_penduduk_mandiri`, jadi login valid dan create surat end-to-end belum diuji tanpa membuat akun dummy mandiri baru.
