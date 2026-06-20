# Yamansari Focused OpenSID Plan

Status: draft awal untuk arah produk dan bahan pengajuan pengelolaan mandiri.

Tanggal: 2026-06-09.

Target situs saat ini: `https://yamansari-tegal.desa.id/`.

## Posisi Masalah

Tujuannya bukan membuat website desa yang memajang semua modul OpenSID sekaligus. Tujuannya adalah membuat sistem desa yang jelas pekerjaannya, mudah dioperasikan perangkat desa, dan tidak membuat warga bingung ketika membuka website.

Masalah yang ingin dihindari:

- Menu publik terlalu banyak dan bercampur antara profil, layanan, PPID, potensi, aduan, statistik, artikel, dan modul tambahan.
- Warga tidak tahu harus klik apa untuk kebutuhan utama seperti mengurus surat, melihat alur layanan, atau mencari kontak desa.
- Operator desa terbebani menjaga banyak halaman yang belum tentu punya owner.
- Instalasi OpenSID dianggap selesai padahal workflow pelayanan belum tentu berjalan.
- Website publik, layanan warga, dan admin operasional terlihat seperti satu rak besar berisi terlalu banyak menu.

## Observasi Cepat Situs Saat Ini

Observasi ini bersifat pasif dan belum audit penuh.

| Area | Temuan awal |
|---|---|
| Versi publik footer | OpenSID `2502.0.0` |
| Tema publik footer | Esensi `v2405.0.1` |
| Hosting/status | Masih dikelola/nebeng pihak Kominfo menurut konteks pengguna |
| Menu publik | Banyak kategori: Profil, Lembaga, Layanan, Potensi Desa, Galeri, PPID, Aduan, Survei, Informasi, Media Sosial, JDIH |
| Layanan Mandiri | Login tersedia di `/index.php/layanan-mandiri/masuk`; instruksi meminta warga menghubungi operator untuk PIN |
| Admin | Login tersedia di `/index.php/siteman` |
| Artikel homepage | Terlihat contoh artikel `Berita 1` tertanggal 03 Maret 2025 |
| Lapak/Pengaduan | Link ada di menu; perlu audit runtime lebih lanjut karena fetch awal ke route `index.php/lapak` dan `index.php/pengaduan` sempat gagal dari web fetch |

## Prinsip Produk Versi Yamansari

### 1. Website publik bukan etalase semua fitur

Website publik harus menjawab kebutuhan warga paling umum:

- Apa kabar/pengumuman terbaru desa?
- Bagaimana mengurus surat?
- Siapa perangkat desa dan kontaknya?
- Di mana lokasi/kantor desa?
- Apa dokumen publik penting yang wajib tersedia?
- Bagaimana menyampaikan aduan?

Yang tidak sering dipakai warga tidak perlu tampil sebagai menu utama.

### 2. OpenSID Core dipakai sebagai mesin operasional

OpenSID tetap berguna sebagai basis karena sudah punya struktur data desa, penduduk, keluarga, surat, layanan mandiri, dokumen, dan admin. Tapi versi Yamansari perlu memisahkan:

- core operasional untuk perangkat desa;
- portal layanan warga;
- website publik;
- modul opsional.

### 3. Menu mengikuti pekerjaan, bukan mengikuti semua modul

Menu publik sebaiknya maksimal 5 sampai 7 kelompok utama.

Usulan menu publik:

| Menu | Isi |
|---|---|
| Beranda | Ringkasan layanan, pengumuman, kontak cepat, artikel terbaru |
| Profil Desa | Sejarah, visi misi, wilayah, pemerintah desa |
| Layanan Warga | Alur surat, syarat surat, Layanan Mandiri, cek status jika tersedia |
| Informasi Publik | APBDes, produk hukum, dokumen PPID, pembangunan |
| Potensi Desa | UMKM, wisata, galeri pilihan |
| Aduan | Pojok aduan dan kontak resmi |
| Berita | Arsip artikel/kegiatan |

Menu yang sebaiknya tidak menjadi top-level kecuali memang aktif:

- semua subdokumen PPID secara terpisah;
- lapak online jika produk belum terawat;
- survei kepuasan jika tidak ada proses tindak lanjut;
- statistik granular;
- lembaga satu per satu;
- link eksternal terlalu banyak.

## Scope Produk Yang Jelas

### Phase 1: Stabilkan Website Publik

Tujuan: warga tidak pusing.

Pekerjaan:

- audit semua menu dan URL aktif;
- hapus/sembunyikan menu yang kosong, rusak, atau tidak punya owner;
- buat landing beranda yang langsung menonjolkan layanan warga;
- rapikan halaman alur layanan surat;
- buat halaman kontak dan jam layanan yang jelas;
- pastikan mobile layout nyaman;
- buat kebijakan konten: siapa update berita, seberapa sering, dan konten wajib apa saja.

Output:

- website publik ringkas;
- daftar menu final;
- daftar halaman wajib;
- daftar halaman disembunyikan/diarsipkan.

### Phase 2: Aktifkan Core Operasional

Tujuan: OpenSID dipakai untuk pekerjaan nyata, bukan hanya website.

Prioritas:

- data penduduk dan keluarga;
- wilayah administratif;
- pengaturan surat;
- permohonan/penerbitan surat;
- arsip surat;
- pengguna dan hak akses;
- backup dan restore.

Output:

- role operator jelas;
- SOP input dan validasi data;
- SOP surat masuk dari warga sampai selesai;
- jadwal backup;
- audit data awal.

### Phase 3: Layanan Mandiri Yang Masuk Akal

Tujuan: warga bisa memakai layanan tanpa bingung.

Jangan langsung membuka semua fitur. Mulai dari layanan paling bernilai:

1. Login warga/PIN.
2. Profil warga read-only.
3. Permohonan surat tertentu.
4. Upload syarat.
5. Status permohonan.
6. Unduh/cetak surat selesai jika proses desa siap.

Fitur yang bisa ditunda:

- lapak produk warga;
- pesan warga lengkap;
- dokumen pribadi lengkap;
- bantuan sosial;
- presensi/kehadiran;
- anjungan.

### Phase 4: Modul Opsional Berdasarkan Owner

Sebuah modul hanya aktif kalau memenuhi 4 syarat:

- ada pemilik proses;
- ada jadwal update;
- ada manfaat warga/operator;
- ada indikator keberhasilan.

Contoh:

| Modul | Aktif jika |
|---|---|
| Lapak UMKM | Ada admin UMKM dan minimal data produk valid |
| PPID | Ada dokumen yang benar-benar diperbarui |
| Pengaduan | Ada SOP tindak lanjut dan PIC |
| Statistik | Data penduduk sudah rapi |
| APBDes | Kaur keuangan siap update periodik |
| Galeri | Ada kurasi, bukan dump foto |

## Scope Teknis Refactor

### Yang dipertahankan dari OpenSID

- Model data penduduk, keluarga, wilayah.
- Persuratan dan arsip.
- Layanan Mandiri dasar.
- Auth admin dan grup akses.
- Backup/restore.
- Tema sebagai basis, tapi disederhanakan.

### Yang disederhanakan

- Navigasi publik.
- Widget homepage.
- Kategori artikel.
- Tampilan Layanan Mandiri.
- Dashboard operator berdasarkan role.
- Modul opsional dibuat non-default.

### Yang jangan disentuh dulu

- Database core tanpa migration plan.
- Alur surat aktif tanpa backup.
- File/dokumen warga tanpa audit akses.
- Integrasi eksternal seperti TTE/WhatsApp sebelum workflow manual matang.

## MVP Versi Yamansari

MVP yang realistis:

1. Website publik ringkas dan mobile-friendly.
2. Admin penduduk/keluarga/wilayah berjalan.
3. 5 sampai 10 jenis surat prioritas berjalan.
4. Layanan Mandiri untuk permohonan surat prioritas.
5. Arsip surat dan dokumen aman.
6. Role operator minimal: admin sistem, operator data, operator pelayanan, admin konten.
7. Backup otomatis dan uji restore berkala.
8. Dashboard sederhana untuk melihat jumlah permohonan, status proses, dan konten publik terbaru.

## Success Metrics

Jangan ukur sukses dari “website sudah online”. Ukur dari:

- jumlah surat diproses lewat sistem per bulan;
- rata-rata waktu penyelesaian surat;
- jumlah permohonan selesai/revisi/ditolak;
- jumlah warga punya akses Layanan Mandiri;
- jumlah halaman publik wajib yang valid;
- umur berita/pengumuman terbaru;
- backup terakhir dan hasil uji restore;
- jumlah modul aktif yang punya PIC;
- jumlah menu publik yang benar-benar digunakan.

## Narasi Pengajuan Mandiri

Inti narasi:

> Desa Yamansari membutuhkan pengelolaan mandiri sistem informasi desa agar website dan layanan digital tidak hanya menjadi halaman publik, tetapi menjadi sistem kerja pelayanan warga yang terukur, aman, dan berkelanjutan. Basis yang digunakan tetap OpenSID open source, namun dengan scope yang disederhanakan agar fokus pada data penduduk, persuratan, layanan warga, informasi publik wajib, dan operasional desa yang benar-benar digunakan.

