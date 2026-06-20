# Stale Content Audit

Status: initial sitemap/content freshness notes, 2026-06-08 Asia/Jakarta.

## Source Signals

- Sitemap total URLs: 6162.
- Sitemap is almost entirely article URLs: 6161 `artikel` entries plus homepage.
- Latest sitemap `lastmod`: 2026-06-08.
- Oldest sitemap `lastmod`: 2000-07-07.
- Homepage has many visible/internal links to legacy categories, statistics, public pages, service pages, and article archives.

## Freshness Reading

| Area | Evidence | Initial status |
|---|---|---|
| News/articles | Sitemap includes two URLs dated 2026-06-08 | Fresh |
| Homepage | 200, large active page, many links and current article assets | Likely fresh, needs visual/manual section audit |
| Public statistics | `/first/statistik/0` returns 200 | Active page exists, data freshness unverified |
| Public information | `/informasi_publik` returns 200 | Active page exists, document freshness unverified |
| Regulations | `/peraturan_desa` and `/peraturan-desa` return 200 | Active pages exist, content freshness unverified |
| Lapak | `/lapak` returns 200 | Active page exists, product freshness unverified |
| Pengaduan | `/pengaduan` returns 200 | Active page exists, submission/process freshness unverified |
| Layanan Mandiri | `/layanan-mandiri` returns login page | Login exists, usage/adoption unverified |
| Kehadiran | `/kehadiran/masuk` returns 200 | Attendance login exists, usage unverified |
| Sitemap coverage | Sitemap only lists articles/homepage | Incomplete for public feature mapping |

## Risks Of Misreading

- Active news publication does not prove active back-office usage.
- A login page does not prove citizens have accounts.
- A public statistics page does not prove source data is current.
- A module page returning 200 does not prove the module has an owner or recent updates.

## Remaining Coverage

Will cover in later passes:

- News/articles freshness.
- Agenda freshness.
- APBDes/APBKal freshness.
- Statistik freshness.
- Dokumen publik freshness.
- Lapak/product freshness.
- Pengaduan page state.
