# Yamansari Core Scope

Dokumen ini mencatat scope awal turunan OpenSID untuk Desa Yamansari. Tujuannya membuat dashboard internal fokus pada pekerjaan kantor desa dan layanan warga, bukan menampilkan semua modul OpenSID sekaligus.

## Prinsip

- Fitur masuk dashboard inti hanya jika dipakai rutin oleh operator desa atau warga.
- Fitur harus punya alur kerja jelas: data masuk, proses, output, arsip, dan tanggung jawab operator.
- Fitur yang bergantung ke layanan eksternal dimatikan dari page load otomatis kecuali ada keputusan operasional yang jelas.
- Source OpenSID asli tidak langsung dihapus. Modul non-inti disembunyikan dulu dari sidebar agar bisa dievaluasi ulang.

## Scope inti tahap 1

### Basis data desa

- Identitas desa.
- Wilayah administratif.
- Pemerintah desa.
- Status desa.
- Penduduk, keluarga, rumah tangga, kelompok, dan data suplemen.
- Riwayat mutasi penduduk.

### Layanan warga

- Pengaturan surat.
- Cetak surat.
- Permohonan surat.
- Arsip layanan.
- Persyaratan surat.
- Layanan mandiri: kotak pesan, pendaftar layanan mandiri, gawai layanan, dan pengaturan layanan mandiri.

### Tata kelola dan program

- Informasi publik.
- Inventaris dasar.
- Klasifikasi surat.
- Bantuan/program bantuan.
- Pembangunan.
- Pengaduan.
- Pemetaan dasar.
- Keuangan/APBDes yang relevan untuk transparansi.

### Website publik

- Artikel.
- Kategori.
- Menu website.
- Galeri.
- Tema.
- Media sosial.
- Slider.
- Pengunjung.

### Administrasi sistem

- Aplikasi.
- Pengguna.
- Database.
- Info sistem.

## Diparkir dulu

- Layanan pelanggan OpenDesa dan pendaftaran kerja sama.
- Kehadiran pamong.
- Kesehatan Covid legacy.
- Surat dinas sebagai modul terpisah.
- Buku administrasi desa yang terlalu detail untuk tahap awal.
- Lapak.
- OpenDK.
- Hubung warga berbasis SMS.
- Anjungan.
- Satu Data/DTKS.
- Buku tamu.
- Plugin/marketplace dan paket tambahan.
- Modul eksperimen lain yang belum punya pemilik operasional.

## Implementasi awal

- `yamansari_core_dashboard = true` mengaktifkan dashboard internal yang lebih fokus.
- `yamansari_core_menu_enabled = true` menyaring sidebar admin berdasarkan whitelist slug.
- `yamansari_core_menu_slugs` menyimpan daftar modul yang tampil di sidebar tahap 1.
- Modul non-inti masih ada di source dan route, tetapi tidak muncul sebagai pilihan utama operator.
