# Outline Pengajuan Pengelolaan Mandiri Website Dan OpenSID Yamansari

Status: draft bahan proposal.

## Judul Usulan

Pengelolaan Mandiri Sistem Informasi Desa Yamansari Berbasis OpenSID Open Source Dengan Fokus Pelayanan Warga Dan Informasi Publik.

## Latar Belakang

Website desa saat ini sudah tersedia, tetapi pengelolaan masih bergantung pada infrastruktur/hosting pihak lain. Agar pelayanan digital desa lebih berkelanjutan, Desa Yamansari perlu memiliki tata kelola mandiri atas source code, hosting, data, backup, pembaruan, dan pengembangan fitur.

Masalah yang ingin diselesaikan:

- ketergantungan hosting dan teknis pada pihak luar;
- menu dan fitur publik yang terlalu banyak sehingga membingungkan warga;
- belum jelasnya prioritas antara website informasi dan sistem pelayanan;
- risiko konten tidak terawat karena tidak ada owner per modul;
- belum adanya ukuran keberhasilan layanan digital yang konkret.

## Tujuan

1. Mengelola website dan sistem informasi desa secara mandiri.
2. Menggunakan OpenSID open source sebagai basis yang dapat diaudit dan dikembangkan.
3. Menyederhanakan website publik agar mudah dipahami warga.
4. Memprioritaskan data penduduk, persuratan, layanan warga, dan informasi publik wajib.
5. Menetapkan role, SOP, backup, keamanan, dan indikator keberhasilan.

## Ruang Lingkup Awal

### Termasuk

- migrasi/instalasi OpenSID open source;
- konfigurasi hosting mandiri;
- setup domain/subdomain bila diperlukan;
- hardening dasar aplikasi;
- backup otomatis;
- audit menu publik;
- penyederhanaan tema dan navigasi;
- konfigurasi user dan grup akses;
- setup modul penduduk, keluarga, wilayah;
- setup modul persuratan prioritas;
- setup Layanan Mandiri terbatas;
- dokumentasi SOP operator.

### Tidak Termasuk Pada Fase Awal

- semua modul OpenSID diaktifkan sekaligus;
- marketplace/lapak penuh;
- integrasi TTE/BSrE sebelum alur surat manual matang;
- integrasi WhatsApp/SMS berbayar sebelum SOP notifikasi jelas;
- modul bantuan/stunting/kehadiran jika belum ada PIC;
- redesign total tanpa validasi kebutuhan warga.

## Prinsip Implementasi

- Warga melihat layanan yang jelas, bukan semua modul.
- Operator bekerja berdasarkan role, bukan satu admin memegang semuanya.
- Modul aktif harus punya PIC.
- Data pribadi warga dilindungi.
- Backup dan restore diuji, bukan hanya dikonfigurasi.
- Setiap fitur punya indikator keberhasilan.

## Tahapan

### Tahap 1: Audit Dan Perencanaan

- audit website saat ini;
- audit menu, konten, dan link rusak;
- audit kebutuhan operator desa;
- pilih modul core;
- buat rencana migrasi.

### Tahap 2: Infrastruktur Mandiri

- siapkan hosting/VPS;
- setup SSL;
- setup database;
- setup backup;
- setup monitoring dasar;
- migrasi file/data bila disetujui.

### Tahap 3: OpenSID Core

- instal source OpenSID open source;
- konfigurasi identitas desa;
- konfigurasi user dan role;
- validasi data wilayah;
- siapkan modul penduduk/keluarga;
- siapkan jenis surat prioritas.

### Tahap 4: Website Publik Ringkas

- susun menu baru;
- rapikan beranda;
- rapikan halaman layanan;
- rapikan PPID wajib;
- sembunyikan modul kosong/rusak;
- cek mobile UX.

### Tahap 5: Layanan Mandiri Terbatas

- aktivasi login warga;
- SOP pemberian PIN;
- pilih surat prioritas;
- uji permohonan surat end-to-end;
- uji arsip dan status permohonan.

### Tahap 6: Evaluasi Dan Perluasan

- ukur penggunaan;
- perbaiki alur;
- aktifkan modul tambahan hanya jika siap owner dan SOP.

## Role Minimal

| Role | Tanggung jawab |
|---|---|
| Admin Sistem | Hosting, backup, update, user, keamanan |
| Operator Data | Penduduk, keluarga, wilayah |
| Operator Pelayanan | Surat, permohonan, arsip |
| Admin Konten | Berita, pengumuman, halaman publik |
| PIC PPID | Dokumen publik, APBDes, produk hukum |

## Indikator Keberhasilan

- Website publik dapat dipahami dari mobile.
- Jumlah menu utama berkurang dan lebih jelas.
- Minimal 5 jenis surat prioritas bisa diproses.
- Ada SOP pemberian PIN Layanan Mandiri.
- Ada backup otomatis dan hasil uji restore.
- Ada laporan bulanan penggunaan layanan.
- Setiap modul aktif punya PIC.

## Risiko Dan Mitigasi

| Risiko | Mitigasi |
|---|---|
| Operator berganti | SOP, dokumentasi, role jelas |
| Data tidak rapi | Audit data dan validasi bertahap |
| Terlalu banyak fitur aktif | Feature gating dan menu sederhana |
| Hosting bermasalah | Backup, monitoring, restore plan |
| Warga bingung login | Panduan singkat, mulai dari surat prioritas |
| Konten publik basi | Kalender update dan PIC konten |

