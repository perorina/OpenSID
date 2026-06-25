# PPID Desa - Implementasi Tahap 1

Status: selesai dan terverifikasi pada 24 Juni 2026  
Arsitektur: Vite SSR/BFF -> Go API internal -> OpenSID DB

## Keputusan

- Strategi admin hybrid: dokumen dikelola dari Informasi Publik OpenSID; profil layanan dikelola dari admin Vite.
- Kepala Desa aktif dengan urutan terkecil menjadi default Atasan PPID.
- Sekretaris aktif dengan urutan terkecil menjadi default PPID.
- Pemilihan pejabat dapat ditimpa dari admin Vite tanpa mengubah data pamong.
- Data contoh hanya aktif melalui `YMS_ENABLE_SAMPLE_DATA=true` dan selalu berlabel `CONTOH`.
- Empat PDF contoh memakai watermark `DRAFT / CONTOH - BELUM DITETAPKAN` pada setiap halaman.
- Tahap ini tidak membuat permohonan informasi; kanal yang ditampilkan hanya telepon dan email desk PPID.

## Kontrak Data

`yms_ppid_profiles` menyimpan satu baris per `config_id`: pejabat terpilih, alamat/meja layanan, jadwal, telepon, email, kebijakan biaya, maklumat, tenggat jawaban, tenggat perpanjangan, status publikasi, status sampel, dan timestamp.

Dokumen tetap berasal dari `dokumen`/`dokumen_hidup` OpenSID dan hanya dipublikasikan bila tidak terkait penduduk, aktif, berstatus terbit, sudah mencapai tanggal terbit, dan belum melewati retensi.

## Interface

- `GET /api/yms/public/ppid`
- `GET /api/yms/admin/ppid`
- `POST /api/yms/admin/ppid`
- `POST /api/yms/admin/ppid/seed-sample`

Endpoint admin wajib melewati internal API key, session admin OpenSID, CSRF, dan hak akses modul `informasi-publik`. Endpoint publik tetap hanya dipanggil browser melalui SSR/BFF.

## Tampilan

- `/ppid`: struktur pejabat, standar layanan, tugas/wewenang, maklumat, kontak, dan dokumen fondasi.
- `/admin/ppid`: login admin, form profil, pilihan pamong, pratinjau dokumen read-only, tautan ke admin Informasi Publik OpenSID, dan seed contoh khusus development.
- Seluruh layout memakai design system mobile Yamansari dengan lebar `360-430px`, token semantik, target sentuh minimal 44px, dan metadata SSR.

## Dokumen Contoh

1. SK Penetapan PPID Desa.
2. Peraturan Desa tentang Keterbukaan Informasi Publik.
3. SOP Pelayanan Informasi Publik.
4. Maklumat Pelayanan Informasi Publik.

Sumber final berada di `output/pdf/ppid/`. Hasil render inspeksi berada sementara di `tmp/pdfs/` dan tidak menjadi sumber dokumen resmi.

## Verifikasi

- `go test ./...`
- `npm test`
- `npm run build`
- inspeksi `pdfinfo`, ekstraksi teks, dan render PNG empat PDF
- uji SSR `/ppid` serta `noindex/no-store` `/admin/ppid`
- uji browser pada 360px, 390px, dan 430px
- uji API tanpa key, admin tanpa session, admin tanpa izin, dan validasi CSRF
- Lighthouse production tanpa regresi kategori publik

## Hasil Implementasi

- Tabel `yms_ppid_profiles`, loader PPID terpisah, filter dokumen publik, pemilihan pamong, izin `grup_akses`, cache invalidation, dan seed idempotent telah aktif.
- `/ppid` dirender SSR dengan payload route-specific. HTML awal sudah memuat pejabat, standar layanan, maklumat, empat dokumen contoh, metadata, dan badge `CONTOH`.
- `/admin/ppid` menggunakan session admin OpenSID, cookie HttpOnly, CSRF, `no-store`, `noindex`, editor profil, pilihan pamong, daftar dokumen read-only, dan tautan ke admin OpenSID.
- Empat PDF final berada di `output/pdf/ppid/`; seluruh halaman memiliki watermark, footer draft, nomor contoh, dan blok tanda tangan tanpa tanda tangan palsu.
- Seed lokal berhasil dijalankan dua kali: pemanggilan kedua menghasilkan `0` dokumen baru dan `4` dokumen diperbarui.

### Bukti Verifikasi

- `go test ./...`: lulus, termasuk API key, CSRF, pemilihan pejabat, invalidasi cache, validasi profil, izin admin, filter dokumen, dan integrasi seed.
- `npm test`: 2 file dan 7 test lulus.
- `npm run build`: client dan SSR production lulus pada Vite 8.0.16.
- Browser 360, 390, dan 430px: tidak ada overflow atau console error; target interaktif utama minimal 44px.
- Alur admin: login, edit, simpan, refresh, nilai persisten, seed idempotent, dan logout berhasil. Password uji lokal dipulihkan ke hash awal setelah pengujian.
- API tanpa key, key salah, dan admin tanpa session masing-masing menghasilkan `401`; admin tanpa izin menghasilkan `403` pada integration test.
- PDF: 1 halaman SK, 2 halaman Perdes, 1 halaman SOP, dan 1 halaman Maklumat; watermark/footer lolos ekstraksi teks dan render visual tidak clipping.
- Lighthouse production `/ppid`: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1,2 detik, LCP 1,2 detik, TBT 0 ms, CLS 0.
- Lighthouse production `/`: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 1,2 detik, LCP 1,5 detik, TBT 0 ms, CLS 0.
