# OpenSID Admin Feature Map

Status: draft awal berbasis source code lokal plus login-page demo check. Belum berhasil masuk dashboard admin demo.

Snapshot yang dibaca: folder `OpenSID-2606.0.0`, tanggal kerja 2026-06-08.

## Evidence Source

- `composer.json`: project `opendesa/opensid`, PHP `^8.1`, CodeIgniter 3, komponen Illuminate 10, `opensid/router`, Spatie activity log, Fractal, DataTables, FCM, Google API, TTE-related dependencies.
- `donjo-app/Routes/web.php`: entry route publik lama/baru, installer, dokumen web, statistik web, asset, dan include semua route `donjo-app/Routes/Web/*.php`.
- `donjo-app/Routes/Web/admin.php`: route admin `/siteman`, auth admin, OTP, 2FA, dan mayoritas route backend operasional.
- `donjo-app/Routes/Web/frontend.php`: route website publik baru di namespace `fweb`.
- `donjo-app/Routes/Web/mandiri.php`: route portal warga `/layanan-mandiri`.
- `donjo-app/Routes/api.php`: internal API, external API, dan public `api/v1`.
- `app/database/seeders/DataAwal/SettingModul.php`: seed menu/module admin dan parent grouping.
- `Modules/*/Routes/web.php`: route modul Analisis, Anjungan, BukuTamu, Kehadiran, Lapak, Pelanggan.

## Surface Map

| Surface | Route Prefix | Source | Role |
|---|---:|---|---|
| Admin backend | `/siteman`, then operational routes such as `/penduduk`, `/surat`, `/database` | `donjo-app/Routes/Web/admin.php` | Operator/admin desa |
| Website publik | `/`, `/artikel`, `/data-statistik`, `/pengaduan`, `/lapak`, `/peta`, `/informasi-publik` | `donjo-app/Routes/Web/frontend.php` | Warga/publik |
| Layanan Mandiri | `/layanan-mandiri` | `donjo-app/Routes/Web/mandiri.php` | Warga terdaftar atau guest anjungan |
| API internal/public | `/internal_api`, `/api/v1` | `donjo-app/Routes/api.php` | Frontend, widget, integrasi data publik |
| API eksternal | `/external_api/sign`, `/external_api/tte`, `/external_api/surat_kecamatan` | `donjo-app/Routes/api.php` | Integrasi TTE/surat kecamatan |
| Modular route | module-specific prefixes | `Modules/*/Routes/web.php` | Extension/module feature |

## Demo Admin Runtime Check

Target: `https://berputar.opendesa.id/index.php/siteman`

Date: 2026-06-08 Asia/Jakarta.

| Item | Observation |
|---|---|
| `/index.php/siteman` status | 200 |
| `/siteman/` status | 200 |
| Login page title | `OpenSID Desa Bondo - Siteman` |
| Public homepage title | `Website Resmi Desa Bondo` |
| Footer version | `OpenSID v2606.0.0-premium` |
| CAPTCHA | Present on login page |
| Login attempt | One attempt with demo credentials failed because CAPTCHA was invalid |
| Dashboard access | Not reached |
| Evidence screenshot | `docs/research/evidence/demo-admin-login.png` |

Important: do not claim admin sidebar or module runtime behavior from demo until login succeeds.

## Admin Menu Groups From Seed

Source `SettingModul.php` contains 137 seeded module entries and 24 parent groups.

| Parent group | Count | Initial reading |
|---|---:|---|
| sekretariat | 18 | Heavy document, letter, inventory overlap |
| buku-administrasi-desa | 17 | Regulatory/administrative book layer |
| admin-web | 11 | CMS/publication tools |
| analisis | 9 | Survey/analysis subsystem |
| pemetaan | 8 | GIS/map subsystem |
| info-desa | 8 | Village identity, officials, institution, status, customer service |
| kependudukan | 8 | Population and household data center |
| pengaturan | 8 | System settings, users, database, QR, image optimization |
| layanan-surat | 5 | Letter template, print, archive, requirements, requests |
| layanan-mandiri | 5 | Mailbox, registration, device, opinion, settings |
| keuangan | 5 | Finance import, report, manual input/report, APBDes |
| kehadiran | 5 | Attendance working hours, holidays, recap, complaints, exit reasons |
| statistik | 4 | Population statistics and reports |
| kesehatan | 4 | COVID/vaccine/stunting style health modules |
| buku-tamu | 4 | Guestbook and satisfaction module |
| hubung-warga | 3 | SMS/contact communication |
| anjungan | 3 | Kiosk/self-service terminal |
| pertanahan | 2 | Land/persil/C-Desa |
| opendk | 2 | OpenDK sync/messages |
| bantuan | 2 | Program and participant assistance |
| satu-data | 1 | DTKS |

## Initial Feature Grouping

### Strong Core Candidates

- `kependudukan`: penduduk, keluarga, rumah tangga, kelompok, suplemen, DPT, log penduduk.
- `info-desa`: identitas desa, wilayah administratif, pemerintah desa, lembaga, status desa.
- `layanan-surat`: pengaturan surat, cetak surat, arsip layanan, daftar persyaratan, permohonan surat.
- `pengaturan`: pengguna, grup/permission, database, info sistem, aplikasi, modul.

### Operational But Not Always Core

- `sekretariat`: surat masuk/keluar, klasifikasi surat, inventaris, produk hukum, API inventory helpers.
- `buku-administrasi-desa`: BUMDes/admin book style compliance records.
- `keuangan`: APBDes and finance reports.
- `pemetaan`: GIS and map layers.

### Public/CMS Surface

- `admin-web`: artikel, widget, menu, komentar, galeri, sosmed, slider, teks berjalan, pengunjung, pengaturan web.
- `frontend.php`: artikel, statistik, kelompok/lembaga, galeri, inventaris, pengaduan, pemerintah, SOTK, DPT, suplemen, lapak, pembangunan, peta, informasi publik, peraturan desa, analisis, verifikasi surat.

### Extension/Optional Candidates

- `analisis`, `bantuan`, `lapak`, `kehadiran`, `anjungan`, `buku-tamu`, `opendk`, `satu-data`, `kesehatan`, `pertanahan`.

## Source-Based Observations

- OpenSID is not only a CMS. The source exposes operational administration, population data, letters, citizen portal, public website, APIs, extension modules, notification, and service subscription logic.
- Menu hierarchy is seeded as a flat module table with parent IDs. This supports role-based access, but also means product grouping is stored as technical configuration rather than an explicit product taxonomy.
- Hidden modules are numerous, especially in inventory, analysis, BUMDes/admin books, and route helper/API style entries. A visible menu may be only one face of a deeper feature tree.
- Some modules are physically separated under `Modules`, but they still participate in global routing, seeded admin menu, and shared auth/settings. Treat as modularized code, not necessarily isolated product modules.

## Still Unverified

- Which modules are enabled in a real village instance.
- Which admin menu items appear for demo admin after login.
- Which features are Premium-only at runtime.
- Whether Pleret uses the same feature set, theme, or version.
