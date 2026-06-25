# PPID Desa - Implementasi Tahap 2

Status: selesai dan terverifikasi pada 24 Juni 2026  
Arsitektur: browser -> Vite SSR/BFF -> Go API internal -> OpenSID DB

## Cakupan

- DIP publik dengan kategori berkala, serta-merta, dan setiap saat.
- Pencarian, filter kategori/tahun, pagination, detail, metadata, format, dan retensi.
- Admin hybrid `/admin/dip` untuk melengkapi metadata; file dan status terbit tetap dikelola di OpenSID.
- Dokumen dibuka inline di tab browser melalui proxy streaming `/dokumen/:id`.
- Sembilan dokumen contoh: empat fondasi Tahap 1 dan lima dokumen DIP Tahap 2.

Permohonan informasi, keberatan, sengketa, dan laporan layanan tetap menjadi fase berikutnya.

## Data dan Keamanan

`yms_dip_metadata` menjadi overlay per `config_id` dan `document_id` untuk ringkasan, unit penguasa, penanggung jawab, penerbit, tanggal/tempat pembuatan, frekuensi pembaruan, status tampil, status contoh, dan urutan.

Daftar publik hanya mengambil dokumen OpenSID yang aktif, terbit, belum melewati retensi, tidak terkait penduduk, berkategori `1-3`, berstatus tampil, dan memiliki metadata lengkap. Kategori dikecualikan (`4`) tidak masuk query publik.

API key hanya berada di SSR. Admin memerlukan session OpenSID, cookie HttpOnly, CSRF, dan akses `informasi-publik`. `/admin/dip` memakai `noindex` dan `no-store`.

## Interface

- `GET /api/yms/public/dip`
- `GET /api/yms/public/dip/{id}`
- `GET|HEAD /api/yms/public/documents/{id}/content`
- `GET /api/yms/admin/dip`
- `POST /api/yms/admin/dip/{id}`
- `POST /api/yms/admin/dip/seed-sample`
- Browser: `/dip`, `/dip/:id`, `/dokumen/:id`, dan `/admin/dip`

Endpoint content hanya menerima PDF, PNG, dan JPEG lokal atau redirect HTTP(S) eksternal. File lokal memakai nama dasar aman, `Content-Disposition: inline`, `nosniff`, cache validator, dan byte range.

## Data Contoh

1. Profil dan Struktur Pemerintah Desa.
2. Ringkasan APBDes dan Realisasi.
3. Program dan Kegiatan Desa.
4. Prosedur Informasi Darurat dan Kontak Siaga.
5. Panduan Evakuasi dan Kanal Bantuan.

PDF final berada di `output/pdf/ppid/dip/`. Semua memakai nomor contoh, watermark `DRAFT / CONTOH - BELUM DITETAPKAN`, dan tidak memuat tanda tangan palsu.

## Verifikasi

- `go test ./...` dan integration test MariaDB: lulus, termasuk filter, seed idempotent, inline header, dan Range.
- `npm test`: 10 test lulus.
- `npm run build`: client dan SSR Vite 8 lulus.
- SSR `/dip` memuat sembilan dokumen; `/dip/:id` menghasilkan metadata SEO dinamis.
- `/dokumen/:id` menghasilkan `206`, `application/pdf`, `Content-Disposition: inline`, dan byte range yang benar.
- Lima PDF A4 lolos `pdfinfo`, ekstraksi teks, render PNG, dan inspeksi visual tanpa clipping.
- Lighthouse production `/dip`: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1,2 detik, LCP 1,4 detik, TBT 0 ms, CLS 0.
