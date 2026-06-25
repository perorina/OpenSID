# PPID Desa - Implementasi Tahap 3-7

Status: selesai dan terverifikasi pada 25 Juni 2026  
Arsitektur: browser -> Vite SSR/BFF -> Go API internal -> OpenSID DB + tabel `yms_`

## Cakupan

Tahap 3-7 melengkapi PPID dari katalog dokumen sampai workflow layanan:

- Tahap 3: katalog kelengkapan publikasi desa.
- Tahap 4: permohonan informasi publik dan pelacakan.
- Tahap 5: keberatan informasi dan register tanggapan Atasan PPID.
- Tahap 6: informasi darurat dan kontak bantuan.
- Tahap 7: laporan layanan, SLA, audit trail, dan ekspor CSV.

## Data

- `yms_dip_metadata.publication_type` mengelompokkan dokumen untuk halaman publik: `profile`, `planning`, `budget`, `program`, `legal`, `meeting`, `inventory`, `contract`, `bumdes`, `governance_report`, `ppid`, dan `emergency`.
- `yms_dip_metadata.version_no` naik saat metadata dokumen berubah.
- `yms_ppid_requests` menyimpan register permohonan, status, tenggat 10 hari kerja, perpanjangan 7 hari kerja, jawaban, penolakan, dokumen jawaban, dan token hash.
- `yms_ppid_objections` menyimpan register keberatan, hubungan ke permohonan bila ada, alasan, tanggapan, keputusan, dan tenggat 30 hari kerja.
- `yms_emergencies` menyimpan informasi serta-merta: tingkat, status, lokasi, pihak terdampak, instruksi, evakuasi, tempat aman, kanal bantuan, tindakan desa, dan kontak.
- `yms_ppid_audit_logs` mencatat perubahan status, metadata DIP, dan informasi darurat.

## Interface

Publik lewat SSR/BFF:

- `/apbdes`
- `/perencanaan`
- `/produk-hukum`
- `/permohonan-informasi`
- `/keberatan-informasi`
- `/laporan-ppid`
- `/darurat`
- `/mobil-siaga`

Go internal API:

- `GET /api/yms/public/publications`
- `POST /api/yms/public/ppid/requests`
- `POST /api/yms/public/ppid/requests/track`
- `POST /api/yms/public/ppid/objections`
- `POST /api/yms/public/ppid/objections/track`
- `GET /api/yms/public/ppid/report`
- `GET /api/yms/public/emergency`
- `GET /api/yms/admin/ppid/services`
- `GET /api/yms/admin/ppid/report.csv`
- `POST /api/yms/admin/ppid/seed-workflow`
- `POST /api/yms/admin/ppid/requests/{id}`
- `POST /api/yms/admin/ppid/objections/{id}`
- `POST /api/yms/admin/ppid/emergencies`
- `POST /api/yms/admin/ppid/emergencies/{id}`

## Admin

`/admin/ppid-layanan` memakai session admin OpenSID, cookie HttpOnly, CSRF, `no-store`, dan `noindex`. Admin dapat:

- melihat register permohonan dan keberatan;
- mengubah status sesuai transisi yang diizinkan;
- membuat dan memperbarui informasi darurat;
- melihat laporan, SLA, dan audit;
- mengunduh CSV laporan;
- menjalankan seed workflow contoh saat `YMS_ENABLE_SAMPLE_DATA=true`.

## Data Contoh

Enam PDF Tahap 3 ditambahkan ke `output/pdf/ppid/dip/`:

1. RPJMDes, RKPDes, dan DU-RKP.
2. Register Musyawarah Desa.
3. Ringkasan Inventaris Desa.
4. Register Perjanjian Pihak Ketiga.
5. Profil dan Laporan BUM Desa.
6. Ringkasan Laporan Penyelenggaraan Pemerintahan Desa.

Total katalog lokal setelah seed: 15 dokumen publikasi dengan badge `CONTOH`.

## Verifikasi

- `go test ./...`: lulus.
- `YMS_PPID_INTEGRATION_DSN=... go test ./... -count=1`: lulus, termasuk seed DIP, seed workflow, laporan, emergency, filter dokumen, dan inline document range.
- `npm test -- --run`: 2 file dan 13 test lulus.
- `npm run build`: client dan SSR production lulus pada Vite 8.0.16.
- API tanpa internal key ke `/api/yms/public/publications`: `401`.
- `/admin/ppid-layanan` tanpa session lewat BFF: `401`.
- Smoke SSR: `/apbdes`, `/perencanaan`, `/produk-hukum`, `/permohonan-informasi`, `/keberatan-informasi`, `/laporan-ppid`, `/darurat`, dan `/admin/ppid-layanan` menghasilkan `200`.
- Katalog publikasi: `completeness=100`, `documents=15`.
- Workflow BFF: permohonan dan keberatan dummy berhasil dibuat dan dilacak; response tracking permohonan menyembunyikan nomor identitas.
- Browser mobile 360, 390, dan 430px: tidak ada horizontal overflow dan tidak ada console error pada halaman utama Tahap 3-7.
- PDF: 11 dokumen DIP contoh lolos `pdfinfo`, ekstraksi teks, render PNG, watermark `DRAFT / CONTOH`, dan inspeksi visual sample tanpa clipping.

## Catatan

Dokumen dan data contoh tetap tidak boleh dipakai sebagai produk hukum produksi. Mode sample harus mati di produksi, lalu data resmi dimasukkan dari OpenSID dan admin PPID.
