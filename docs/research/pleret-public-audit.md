# Pleret Public Audit

Status: crawl awal read-only, 2026-06-08 Asia/Jakarta. Belum full sitemap crawl per halaman.

Target: `https://www.pleret-bantul.desa.id/`

## Scope This Pass

- Read-only HTTP GET/HEAD.
- No login attempt.
- No form submission.
- No destructive/security probing.

## Homepage Fingerprint

| Field | Observation |
|---|---|
| URL | `https://www.pleret-bantul.desa.id/` |
| Status | 200 |
| Server header | Cloudflare |
| Content type | `text/html; charset=UTF-8` |
| Cache control | `no-store, must-revalidate, no-cache` |
| Title | `Official Website Kalurahan Pleret` |
| Meta description | `Official Website Kalurahan Pleret Kapanewon Pleret, Kabupaten Bantul, Provinsi Di Yogyakarta` |
| Generator meta | Not present in fetched homepage HTML |
| HTML size | About 1.9 MB |
| Theme fingerprint | Asset path contains `desa/pengaturan/tema-silir-4.0/images/latar_website.jpg` |
| OpenSID string | Not found in homepage HTML |

Initial reading: public theme appears to be `Silir 4.0` or a derivative. OpenSID version cannot be verified from homepage HTML alone.

## Robots And Sitemap

| URL | Status | Observation |
|---|---:|---|
| `/robots.txt` | 200 | Contains content-signal explanatory text; no conventional sitemap/disallow lines observed in fetched output |
| `/sitemap.xml` | 200 | XML sitemap, about 1.39 MB |

Sitemap parse:

| Metric | Value |
|---|---:|
| Total URLs | 6162 |
| URLs with `lastmod` | 6161 |
| Latest `lastmod` | 2026-06-08 |
| Oldest `lastmod` | 2000-07-07 |
| Path groups | 6161 `artikel`, 1 homepage |

Latest sitemap entries found:

| Lastmod | URL |
|---|---|
| 2026-06-08 | `/artikel/2026/6/8/tim-penyusun-perubahan-rpjm-kalurahan-pleret-laksanakan-musdus-di-padukuhan-trayeman-dan-keputren` |
| 2026-06-08 | `/artikel/2026/6/8/aktivitas-pamong-kalurahan-pleret-bulan-mei-2026` |
| 2026-06-04 | `/artikel/2026/6/4/kerja-bhakti-bantul-asri-forkompinkap-di-lingkungan-kantor-kalurahan-pleret` |
| 2026-06-04 | `/artikel/2026/6/4/gladi-bersih-tutup-tahun-tk-pertiwi-23` |
| 2026-06-03 | `/artikel/2026/6/3/resepsi-pernikahan-an-keluarga-ibu-wadhikah-kerto-rt09` |

Important: sitemap freshness proves active publication, not active digital service usage.

## Public Endpoint Sample

| URL | Status | Title / observation |
|---|---:|---|
| `/layanan-mandiri/masuk` | 200 | `S.I. Kal. Pleret Kalurahan Pleret - Layanan-mandiri - Masuk` |
| `/layanan-mandiri` | 200 | Redirect/content lands on Layanan Mandiri login page |
| `/siteman/` | 200 | `S.I. Kal. Pleret Kalurahan Pleret - Siteman` |
| `/pengaduan` | 200 | `Pengaduan - Official Website Kalurahan Pleret` |
| `/lapak` | 200 | `Lapak - Official Website Kalurahan Pleret` |
| `/data-wilayah` | 200 | `Data wilayah - Official Website Kalurahan Pleret` |
| `/informasi_publik` | 200 | `Informasi Publik - Official Website Kalurahan Pleret` |
| `/peraturan_desa` | 200 | `Peraturan Desa - Official Website Kalurahan Pleret` |
| `/peraturan-desa` | 200 | `Peraturan desa - Official Website Kalurahan Pleret` |
| `/first/statistik/0` | 200 | `Statistik - Official Website Kalurahan Pleret` |
| `/peta` | 200 | `Peta - Official Website Kalurahan Pleret` |
| `/pembangunan` | 200 | `Pembangunan - Official Website Kalurahan Pleret` |
| `/pemerintah` | 200 | `Pemerintah - Official Website Kalurahan Pleret` |
| `/kehadiran/masuk` | 200 | `Kehadiran Perangkat Kalurahan` |
| `/kebijakan_privasi` | 200 | `Kebijakan Privasi - Official Website Kalurahan Pleret` |
| `/data-statistik` | 404 | Newer route style from source snapshot not active here |
| `/informasi-publik` | 404 | Hyphenated route not active here |
| `/verifikasi-surat` | 404 | No direct page at this exact path in this pass |
| `/dokumen_web/tampil` | 404 | Missing slug/id, not evidence of document module absence |

## Login Form Passive Inspection

No credentials were submitted.

| Page | Method | Action | Visible/parsed fields | Passive security signals |
|---|---|---|---|---|
| `/layanan-mandiri/masuk` | POST | `/layanan-mandiri/cek` | hidden `id_surat`, hidden `no_hp_aktif`, text `nik`, password `pin`, checkbox | HTML contains CSRF-related string/script; no captcha/recaptcha/securimage string detected on initial page |
| `/siteman/` | POST | `/siteman/auth` | text `username`, password `password`, checkbox | HTML contains CSRF-related string/script; no captcha/recaptcha/securimage string detected on initial page |

Open question: captcha or lockout may appear after failed attempts; this pass did not trigger failures.

## Internal Link Observations

Homepage contained many internal links. Non-article examples include:

- `/arsip`
- `/data-wilayah`
- `/first/statistik/0`, `/first/statistik/1`, etc.
- `/first/kategori/...` legacy category URLs
- `/galeri`
- `/informasi_publik`
- `/kehadiran/masuk`
- `/lapak`
- `/layanan-mandiri`
- `/pembangunan`
- `/pemerintah`
- `/pengaduan`
- `/peraturan_desa` and `/peraturan-desa`
- `/peta`
- `/siteman`
- `/status-idm/2020`, `/status-idm/2021`, `/status-idm/2022`

## Initial Conclusions

- Public website is alive and has article updates dated 2026-06-08.
- Public route set includes legacy OpenSID-style routes such as `/first/statistik` and underscore route names such as `/informasi_publik`.
- Pleret route behavior does not exactly match the local OpenSID 2606 source snapshot. Treat source-code findings and Pleret runtime findings separately.
- Layanan Mandiri login page exists, but this does not prove resident adoption or end-to-end letter service completion.
- Admin login page exists at `/siteman/`; no login attempt has been made in this pass.

## Next Audit Tasks

- Crawl a bounded sample from sitemap by year/category.
- Extract visible dates from homepage sections.
- Inspect Layanan Mandiri login form fields and security controls without submitting credentials.
- Verify whether captcha/rate limiting appears after failed login attempts in a controlled demo, not on the live village instance.
- Check public statistics pages for freshness and data leakage risk.
- Check public document/PPID pages for stale links and file exposure patterns.
