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
