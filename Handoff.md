# HANDOFF — Riset OpenSID dan Website Desa Pleret Bantul

**Tanggal handoff:** 08/06/2026  
**Target agent berikutnya:** Codex / software engineering agent  
**Bahasa kerja:** Indonesia  
**Status dokumen:** Context transfer dari sesi riset dan diskusi produk

---

## 1. Tujuan Utama Sesi

Sesi ini membahas riset terhadap:

1. Website Desa Pleret Bantul: `https://www.pleret-bantul.desa.id/`
2. Core feature OpenSID.
3. Layanan Mandiri OpenSID.
4. Demo admin OpenSID Premium: `https://berputar.opendesa.id/index.php/siteman`
5. Kritik terhadap arah produk, kompleksitas, adopsi pemerintah daerah, dan rendahnya keberlanjutan implementasi OpenSID di banyak desa.

Tujuan akhirnya bukan sekadar mendata fitur, tetapi memahami:

- sebenarnya OpenSID dibuat untuk menyelesaikan masalah apa;
- fitur mana yang benar-benar core;
- fitur mana yang hanya tambahan;
- apakah implementasi di desa aktif secara operasional atau hanya formalitas;
- bagaimana arsitektur produk dan UX-nya seharusnya diperbaiki;
- kemungkinan membuat sistem alternatif atau hasil refactor yang lebih fokus.

---

## 2. Website Target Utama

### Website publik

```text
https://www.pleret-bantul.desa.id/
```

Website ini diduga menggunakan OpenSID atau ekosistem SID desa yang sangat terkait dengan OpenSID.

Hal yang perlu diteliti lebih lanjut:

- versi OpenSID yang digunakan;
- tema yang digunakan;
- halaman publik yang aktif;
- modul OpenSID yang benar-benar digunakan;
- fitur yang hanya terlihat di menu tetapi tidak dirawat;
- tanggal pembaruan berita, agenda, APBKal, statistik, dan dokumen;
- apakah Layanan Mandiri benar-benar aktif;
- apakah permohonan surat dapat selesai secara end-to-end;
- status login, registrasi, lupa PIN, dan verifikasi warga;
- endpoint publik dan API yang terekspos;
- performa frontend;
- SEO;
- keamanan dasar;
- kualitas mobile UX;
- kualitas informasi publik;
- konsistensi data antarhalaman.

### Demo admin OpenSID Premium

```text
https://berputar.opendesa.id/index.php/siteman
```

Kredensial demo yang diberikan pengguna:

```text
Username: admin
Password: sid304
```

Catatan penting:

- Kredensial tersebut dipahami sebagai kredensial demo OpenSID, bukan kredensial privat milik desa.
- Pada sesi sebelumnya, akses otomatis ke `/siteman` mendapat HTTP 403.
- Login melalui browser interaktif belum berhasil dianalisis secara penuh.
- Jangan mengklaim telah masuk dashboard bila belum benar-benar berhasil.
- Jangan mengubah, menghapus, menambah, atau menyimpan data/config apa pun.
- Lakukan audit read-only.

---

## 3. Hasil Identifikasi Awal OpenSID

Instance demo sebelumnya teridentifikasi sebagai:

```text
OpenSID Premium 2604.0.0
Tema Esensi v2409.0.0
```

Status ini harus diverifikasi ulang karena versi dapat berubah.

OpenSID secara praktis bukan hanya CMS website desa. Cakupannya menyerupai gabungan:

```text
Village ERP
+ Sistem Informasi Kependudukan
+ Sistem Persuratan
+ Portal Layanan Warga
+ Document Management
+ CMS Website Desa
+ Dashboard Statistik
+ Sistem Bantuan
+ Sistem Pembangunan
+ Sistem Inventaris
+ Sistem Pertanahan
+ Marketplace/Direktori UMKM
+ Pengaduan
+ Presensi
+ PPID
```

---

## 4. Core Feature OpenSID yang Sudah Dipetakan

### 4.1 Administrasi Kependudukan

Fitur yang ditemukan atau diketahui tersedia:

- data penduduk;
- kartu keluarga;
- wilayah administrasi;
- peristiwa penduduk: kelahiran, kematian, pindah, dan datang;
- log perubahan penduduk;
- DPT;
- DTKS;
- kelompok warga;
- suplemen penduduk;
- stunting;
- program bantuan;
- analisis/sensus;
- data kontak;
- statistik kependudukan.

Kesimpulan awal:

> Data penduduk merupakan kandidat paling kuat sebagai pusat data utama OpenSID.

Masalah potensial:

- kualitas seluruh modul bergantung pada kebersihan data penduduk;
- kesalahan data dapat terbawa ke surat, bantuan, statistik, akun warga, dan dokumen;
- sinkronisasi dengan sistem pemerintah lain belum tentu stabil;
- risiko duplikasi input data tinggi.

### 4.2 Persuratan

Fitur yang dipetakan:

- template surat layanan;
- pengaturan surat;
- persyaratan surat;
- form dinamis;
- permohonan surat warga;
- surat masuk;
- surat keluar;
- surat dinas;
- arsip surat;
- draft/konsep surat;
- lampiran formulir;
- QR code;
- tanda tangan elektronik;
- integrasi TTE/BSrE;
- cetak dan unduh surat.

Alur ideal:

```text
Warga memilih jenis surat
    ↓
Mengisi data/form
    ↓
Mengunggah persyaratan
    ↓
Mengirim permohonan
    ↓
Operator memverifikasi
    ↓
Permohonan direvisi / ditolak / diproses
    ↓
Surat dibuat
    ↓
Surat ditandatangani manual atau elektronik
    ↓
Warga mengunduh / mencetak surat
```

Hal yang harus diverifikasi di admin:

- status workflow yang tersedia;
- siapa yang dapat memverifikasi;
- siapa yang dapat menandatangani;
- dukungan multi-level approval;
- validasi persyaratan;
- notifikasi warga;
- audit log;
- mekanisme revisi;
- timeout/SLA pelayanan;
- integrasi TTE;
- format arsip dan nomor surat.

---

## 5. Fitur Layanan Mandiri yang Sudah Dipetakan

### 5.1 Autentikasi Warga

Kemungkinan fitur:

- login warga;
- aktivasi/registrasi akun;
- PIN layanan mandiri;
- ganti PIN;
- lupa PIN;
- verifikasi email;
- verifikasi identitas;
- bantuan pendaftaran;
- mode anjungan;
- kemungkinan akses tertentu tanpa login.

Pertanyaan audit:

- apakah login memakai NIK + PIN;
- apakah ada rate limit;
- apakah lupa PIN aman;
- apakah data pribadi bocor melalui error;
- apakah session cookie aman;
- apakah CAPTCHA tersedia;
- bagaimana proses aktivasi akun;
- apakah operator wajib menyetujui akun;
- bagaimana akun anggota keluarga dipisahkan.

### 5.2 Profil dan Data Kependudukan Warga

Kemungkinan warga dapat melihat:

- profil pribadi;
- foto;
- email;
- nomor telepon;
- anggota keluarga;
- kartu keluarga;
- status penduduk;
- dokumen pribadi;
- histori pelayanan.

Harus diverifikasi:

- data mana yang editable;
- data mana yang hanya read-only;
- apakah perubahan harus diverifikasi operator;
- apakah satu akun dapat melihat seluruh KK;
- risiko akses horizontal antarwarga.

### 5.3 Permohonan Surat Online

Ini dipandang sebagai fitur paling penting dari Layanan Mandiri.

Harus diuji:

- daftar jenis surat;
- form tiap surat;
- upload berkas;
- ukuran dan tipe file;
- status permohonan;
- revisi;
- pesan operator;
- penolakan;
- penerbitan;
- download arsip;
- QR verification;
- TTE;
- notifikasi;
- mobile UX;
- aksesibilitas.

### 5.4 Dokumen dan Arsip

Kemungkinan fitur:

- melihat dokumen warga;
- melihat surat selesai;
- mengunduh surat;
- mencetak ulang;
- histori permohonan;
- arsip pelayanan pribadi.

Risiko:

- IDOR;
- URL file mudah ditebak;
- dokumen sensitif dapat diakses tanpa autentikasi;
- file upload tidak divalidasi;
- file lama tidak memiliki retention policy.

### 5.5 Pesan dan Komunikasi

Kemungkinan fitur:

- pesan warga ke operator;
- balasan operator;
- status layanan;
- permintaan revisi;
- notifikasi administrasi.

Perlu dievaluasi apakah sistem ini benar-benar ticketing workflow atau hanya mailbox sederhana.

### 5.6 Bantuan Sosial

Kemungkinan fitur:

- daftar program bantuan;
- status kepesertaan;
- histori bantuan;
- informasi program.

Catatan:

- bukan berarti warga dapat menetapkan dirinya sebagai penerima;
- sumber data harus diverifikasi;
- perlu melihat apakah data bantuan masih aktif diperbarui.

### 5.7 Lapak / Produk Warga

Kemungkinan fitur:

- produk UMKM;
- foto produk;
- harga;
- lokasi;
- kontak;
- peta;
- moderasi operator.

Kesimpulan awal:

> Fitur Lapak lebih dekat ke direktori produk lokal daripada marketplace e-commerce penuh.

### 5.8 Kehadiran

Ada indikasi fitur kehadiran/presensi, tetapi ruang lingkup belum jelas.

Kemungkinan:

- presensi perangkat desa;
- kehadiran kegiatan;
- presensi warga;
- integrasi anjungan.

Wajib diverifikasi langsung dari admin.

---

## 6. Modul Lain yang Diketahui Ada di OpenSID

### Website dan Publikasi

- artikel;
- kategori;
- komentar;
- menu;
- media;
- galeri;
- media sosial;
- teks berjalan;
- agenda;
- dokumen;
- statistik publik;
- pengunjung;
- tema.

### Transparansi dan Pemerintahan

- APBDes/APBKal;
- pembangunan;
- inventaris;
- pertanahan;
- produk hukum;
- informasi publik;
- status desa;
- sinergi program;
- PPID.

### Operasional Internal

- pengguna admin;
- grup/hak akses;
- identitas desa;
- jabatan perangkat;
- buku administrasi;
- SMS;
- mailbox;
- sinkronisasi;
- OpenDK;
- plugin;
- backup;
- optimasi gambar;
- informasi sistem;
- log aktivitas dan login.

---

## 7. Kritik Produk dari Pengguna

Pengguna menyampaikan kritik utama:

> OpenSID tidak jelas tujuan dibuatnya untuk apa. Core fiturnya tidak konsisten dan terlalu kompleks sehingga arah produknya kabur.

Analogi pengguna:

> Seperti menyediakan rak makanan yang berisi lebih dari 100 makanan.

Analisis yang sudah disepakati:

- masalahnya bukan hanya jumlah fitur;
- masalah utamanya adalah tidak adanya hierarki produk;
- fitur inti, fitur operasional, fitur publik, dan fitur tambahan terlihat setara;
- pengguna tidak tahu mana pekerjaan utama;
- OpenSID mencoba menjadi terlalu banyak hal sekaligus;
- identitas produk menjadi kabur;
- UX mengikuti pembagian modul teknis, bukan alur kerja pengguna;
- banyak fitur kemungkinan hanya dangkal atau jarang dipakai;
- kompleksitas meningkatkan beban operator, training, maintenance, dan upgrade.

---

## 8. Rumusan Fokus Produk yang Diusulkan

OpenSID seharusnya memiliki tujuan utama:

> Menjadi sistem operasional utama pemerintah desa untuk mengelola data penduduk dan pelayanan administrasi warga.

Core yang disarankan:

1. Data penduduk dan keluarga.
2. Administrasi wilayah.
3. Peristiwa kependudukan.
4. Permohonan dan penerbitan surat.
5. Arsip dokumen.
6. Layanan warga.
7. Pengguna dan hak akses.
8. Audit log.
9. Backup dan recovery.
10. Integrasi data.

Fitur lain seharusnya menjadi modul opsional.

---

## 9. Arsitektur Produk yang Diusulkan

```text
OpenSID Core
├── Penduduk
├── Keluarga
├── Wilayah
├── Peristiwa Penduduk
├── Persuratan
├── Dokumen
├── Pengguna dan Hak Akses
├── Audit
└── Backup

OpenSID Service
├── Layanan Mandiri
├── Permohonan Surat
├── Status Permohonan
├── Pesan Warga
├── Notifikasi
└── Antrean Pelayanan

OpenSID Public
├── Website Desa
├── Berita
├── Statistik
├── PPID
├── Pengaduan
└── Agenda

OpenSID Extensions
├── Bantuan
├── Lapak UMKM
├── Stunting
├── Pertanahan
├── Inventaris
├── Presensi
├── Pembangunan
├── Keuangan
└── Integrasi Eksternal
```

Prinsip desain yang disarankan:

- modular installation;
- progressive disclosure;
- role-based workspace;
- workflow-first navigation;
- opinionated defaults;
- plugin isolation;
- feature flags;
- least privilege;
- auditability;
- separation of public frontend and operational backend.

---

## 10. Kritik terhadap Kebijakan Pemerintah

Pengguna menyoroti bahwa:

- pemerintah merekomendasikan OpenSID;
- di beberapa kabupaten OpenSID bahkan diwajibkan;
- banyak website desa kemudian tidak aktif diperbarui;
- instalasi dianggap sama dengan keberhasilan digitalisasi.

Analisis yang sudah disepakati:

### Masalah utama

```text
Software-first policy
Process-last implementation
```

Pemerintah sering mengukur:

- domain tersedia;
- OpenSID terpasang;
- operator pernah dilatih;
- website dapat dibuka.

Tetapi tidak mengukur:

- persentase surat diproses lewat sistem;
- jumlah warga aktif;
- waktu penyelesaian layanan;
- validitas data;
- keberhasilan backup;
- usia patch keamanan;
- jumlah fitur yang benar-benar digunakan;
- keberlanjutan ketika operator berganti.

### Instalasi bukan penggunaan

Perlu membedakan:

1. aplikasi aktif diperbarui;
2. website aktif diperbarui;
3. pelayanan benar-benar aktif digunakan.

Website bisa sering update berita tetapi Layanan Mandiri tidak dipakai.

Sebaliknya, website publik bisa sepi tetapi backend persuratan masih digunakan.

### Single operator problem

Sering seluruh sistem dibebankan ke satu operator:

- penduduk;
- surat;
- berita;
- APBDes;
- domain;
- hosting;
- error;
- layanan mandiri;
- bantuan perangkat lain.

Jika operator berhenti atau pindah, sistem ikut mati.

### Ownership modul tidak jelas

Ideal ownership:

| Modul | Pemilik proses |
|---|---|
| Penduduk | Kasi Pemerintahan / operator data |
| Surat | Kasi Pelayanan |
| Berita | Admin informasi |
| APBDes | Kaur Keuangan |
| Pembangunan | Kaur Perencanaan |
| PPID | Pejabat pengelola informasi |
| Bantuan | Kasi Kesejahteraan |
| Layanan Mandiri | Unit pelayanan |

Namun praktiknya sering semua dibebankan ke admin SID.

### Tumpang tindih sistem

OpenSID dapat menjadi database tambahan karena desa tetap wajib menggunakan berbagai aplikasi pemerintah sektoral.

Jika integrasi tidak resmi atau tidak stabil:

- input data diulang;
- operator memilih sistem yang terkait langsung dengan pelaporan;
- OpenSID menjadi sekunder;
- data cepat basi.

### Kritik kebijakan yang dirumuskan

> Yang seharusnya diwajibkan bukan penggunaan merek OpenSID, melainkan standar pelayanan digital, interoperabilitas, keamanan, kualitas data, dan SLA pelayanan.

---

## 11. Indikator Implementasi yang Lebih Tepat

Jangan hanya ukur apakah website tersedia.

Gunakan:

- persentase surat diproses melalui sistem;
- waktu rata-rata penyelesaian surat;
- persentase data penduduk tervalidasi;
- jumlah pengguna aktif Layanan Mandiri;
- rasio permohonan selesai;
- jumlah permohonan revisi/ditolak;
- usia versi dan patch keamanan;
- status backup terakhir;
- hasil uji restore;
- jumlah modul aktif yang memiliki owner;
- persentase konten publik yang masih relevan;
- jumlah integrasi yang berfungsi;
- error rate;
- uptime;
- mobile completion rate;
- kepuasan warga.

---

## 12. Hal yang Belum Terverifikasi

Codex harus menganggap poin-poin berikut sebagai hipotesis sampai dibuktikan:

- versi OpenSID Pleret;
- tema Pleret;
- modul admin yang aktif;
- konfigurasi Layanan Mandiri Pleret;
- penggunaan surat secara nyata;
- integrasi TTE;
- integrasi WhatsApp/SMS/email;
- keaktifan pengguna warga;
- apakah statistik penduduk real-time;
- apakah data bantuan terbarui;
- apakah Lapak benar-benar digunakan;
- status keamanan endpoint dokumen;
- struktur role dan permission;
- status backup;
- kualitas audit log;
- mekanisme sinkronisasi;
- apakah semua menu berasal dari OpenSID core atau custom development.

---

## 13. Tugas Codex Berikutnya

### Phase 1 — Reconnaissance

1. Crawl website publik Pleret secara read-only.
2. Buat sitemap aktual.
3. Catat URL, title, status code, canonical, meta description, last modified, tipe halaman, dan status stale/fresh.
4. Fingerprint framework, OpenSID version, theme, server, CDN, caching, dan JavaScript libraries.
5. Identifikasi endpoint login layanan mandiri, registrasi, surat, arsip, API, file upload, maps, dan statistics.

### Phase 2 — Admin Demo Audit

Gunakan akun demo secara read-only.

Petakan seluruh sidebar:

- menu;
- submenu;
- grouping;
- role;
- dependency;
- status enabled/disabled;
- konfigurasi utama;
- alur kerja.

Prioritas halaman:

1. Pengaturan Layanan Mandiri.
2. Pendaftar Layanan Mandiri.
3. Permohonan Surat.
4. Daftar Surat.
5. Template Surat.
6. Persyaratan Surat.
7. Pengguna dan Grup.
8. Log Aktivitas.
9. Backup.
10. Integrasi.
11. Plugin.
12. Informasi Sistem.

Jangan menyimpan perubahan.

### Phase 3 — Product Taxonomy

Klasifikasikan setiap fitur menjadi:

```text
CORE
OPERATIONAL
PUBLIC
EXTENSION
LEGACY
DUPLICATE
UNCLEAR
```

Untuk setiap fitur, tulis:

- user persona;
- user problem;
- input;
- output;
- data owner;
- frequency;
- dependency;
- risk;
- adoption likelihood;
- apakah layak tetap menjadi core.

### Phase 4 — Workflow Mapping

Petakan workflow utama:

1. Warga baru datang.
2. Penduduk pindah.
3. Kelahiran.
4. Kematian.
5. Surat domisili.
6. Surat usaha.
7. Surat pengantar.
8. Permohonan online.
9. Revisi permohonan.
10. TTE.
11. Download dokumen.
12. Pengaduan.
13. Bantuan sosial.
14. Publikasi berita.
15. Update APBDes.

Gunakan format:

```text
Actor
Trigger
Precondition
Steps
Decision points
Data touched
Permissions
Output
Failure modes
Audit requirements
```

### Phase 5 — Engineering Review

Analisis:

- modularitas;
- coupling;
- plugin system;
- permission model;
- data model;
- session/auth;
- upload security;
- audit log;
- migrations;
- backup/restore;
- frontend/backend separation;
- performance;
- caching;
- accessibility;
- mobile UX;
- maintainability;
- upgrade risk;
- technical debt.

### Phase 6 — Product Refactor Proposal

Hasilkan:

1. Current state architecture.
2. Feature map.
3. Core vs optional modules.
4. Persona matrix.
5. Role-based dashboard proposal.
6. Simplified navigation.
7. Modular architecture proposal.
8. Migration strategy.
9. Backward compatibility plan.
10. MVP alternative.
11. Metrics for success.

---

## 14. Output yang Diharapkan dari Codex

```text
docs/
├── research/
│   ├── pleret-public-audit.md
│   ├── opensid-admin-feature-map.md
│   ├── layanan-mandiri-analysis.md
│   └── stale-content-audit.md
├── product/
│   ├── feature-taxonomy.md
│   ├── persona-and-ownership.md
│   ├── workflow-map.md
│   ├── product-critique.md
│   └── refactor-proposal.md
├── engineering/
│   ├── architecture-review.md
│   ├── security-review.md
│   ├── performance-review.md
│   └── migration-plan.md
└── final-report.md
```

---

## 15. Aturan Kerja untuk Codex

- Jangan mengubah data target.
- Jangan melakukan destructive testing.
- Jangan brute force.
- Jangan mencoba privilege escalation.
- Jangan mengekspos data pribadi warga.
- Jangan menyimpan cookie/session ke repository.
- Jangan commit credential.
- Gunakan `.env.local` bila perlu.
- Sanitasi screenshot dan log.
- Tandai semua asumsi.
- Pisahkan fakta, observasi, dan opini.
- Sertakan bukti URL/screenshot untuk setiap temuan penting.
- Jangan menyimpulkan fitur digunakan hanya karena menu tersedia.
- Jangan menyimpulkan layanan aktif hanya karena halaman dapat dibuka.
- Jangan menyimpulkan data valid hanya karena tampil di frontend.
- Jangan menganggap berita aktif sama dengan pelayanan aktif.
- Jangan menganggap versi demo sama dengan versi Pleret.

---

## 16. Pertanyaan Produk yang Harus Dijawab

1. Apa satu pekerjaan utama OpenSID?
2. Siapa persona utamanya?
3. Fitur mana yang benar-benar harus ada di core?
4. Fitur mana yang seharusnya menjadi plugin?
5. Apakah struktur menu mengikuti workflow atau struktur database?
6. Berapa banyak fitur yang realistis digunakan satu desa?
7. Mengapa banyak implementasi menjadi tidak aktif?
8. Apakah kegagalan disebabkan produk, SDM, kebijakan, atau kombinasi?
9. Bagaimana membuat onboarding operator lebih sederhana?
10. Bagaimana menjaga sistem tetap aktif saat operator berganti?
11. Bagaimana mengukur pelayanan nyata?
12. Bagaimana memisahkan CMS publik dari sistem operasional?
13. Apakah Layanan Mandiri layak menjadi produk terpisah?
14. Bagaimana arsitektur alternatif yang lebih modular?
15. Apa MVP sistem desa yang benar-benar berguna?

---

## 17. Positioning yang Disepakati

> OpenSID memiliki cakupan fitur luas, tetapi belum menunjukkan hierarki produk dan fokus utama yang tegas. Fitur inti, fitur operasional, fitur publik, dan fitur tambahan ditempatkan dalam satu sistem sehingga kompleksitasnya mengaburkan identitas produk, meningkatkan beban operator, dan menyulitkan keberlanjutan implementasi.

Analogi:

> OpenSID seperti rak yang menyediakan lebih dari 100 jenis makanan, tetapi tidak menjelaskan mana makanan utama, lauk, camilan, stok lama, atau menu yang sebenarnya tidak perlu berada di rak yang sama.

Rumusan kebijakan:

> Pemerintah seharusnya tidak mewajibkan merek perangkat lunak tertentu. Pemerintah seharusnya mewajibkan standar hasil: pelayanan digital, kualitas data, keamanan, interoperabilitas, keberlanjutan operasional, dan SLA.

---

## 18. Definition of Done

Riset dianggap selesai bila:

- seluruh halaman publik utama terpetakan;
- seluruh modul admin demo terpetakan;
- fitur Layanan Mandiri terdokumentasi lengkap;
- fakta dan asumsi dipisahkan;
- fitur core dan non-core diklasifikasikan;
- workflow utama divisualisasikan;
- masalah UX dan engineering dijelaskan;
- faktor kegagalan implementasi dianalisis;
- usulan refactor modular tersedia;
- indikator keberhasilan implementasi tersedia;
- laporan akhir dapat digunakan sebagai dasar kritik produk, proposal redesign, pembangunan alternatif, presentasi, dan technical planning.

---

## 19. Instruksi Awal untuk Codex

Mulai dengan membaca dokumen ini secara penuh.

Setelah itu:

1. Buat folder dokumentasi yang ditentukan.
2. Lakukan passive reconnaissance terhadap website Pleret.
3. Simpan semua temuan sebagai evidence-based notes.
4. Jangan langsung merancang ulang sebelum feature map selesai.
5. Jangan menganggap seluruh fitur OpenSID bernilai sama.
6. Prioritaskan kependudukan, persuratan, dan pelayanan warga.
7. Evaluasi modul lain berdasarkan kebutuhan nyata, owner, dan frekuensi penggunaan.
8. Tulis progress per phase.
9. Bila akses admin gagal, dokumentasikan penyebab teknis dan lanjutkan analisis dari source code/dokumentasi tanpa mengarang hasil.
10. Akhiri dengan proposal arsitektur yang lebih fokus, modular, dan realistis untuk kapasitas pemerintah desa.
