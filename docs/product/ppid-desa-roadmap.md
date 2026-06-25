# Roadmap PPID Desa Yamansari

Status: aktif, implementasi bertahap  
Rujukan utama: UU 14/2008 dan PerKI 1/2018 tentang Standar Layanan Informasi Publik Desa

## Tujuan

Menyediakan layanan PPID Desa yang dapat dipakai warga, dikelola operator, diaudit, dan tetap memisahkan data publik dari data pribadi OpenSID. Website Vite menjadi kanal publik dan BFF; Go API menjadi layanan internal; OpenSID tetap menjadi sumber data administrasi dan dokumen.

## Prinsip Arsitektur

- Browser hanya mengakses Vite SSR/BFF.
- Go API membaca OpenSID dengan API key internal yang tidak masuk bundle browser.
- Dokumen resmi dikelola melalui modul Informasi Publik OpenSID.
- Data pelengkap yang tidak tersedia di OpenSID disimpan pada tabel kecil berawalan `yms_`.
- Data contoh selalu diberi penanda dan tidak boleh dianggap sebagai dokumen yang telah ditetapkan.
- Informasi dikecualikan tidak ditampilkan dalam DIP publik.

## Tahap 1 - Fondasi PPID

Status: selesai pada 24 Juni 2026.

**Hasil:** profil PPID publik, pejabat, meja layanan, jadwal, kontak, biaya, tenggat layanan, maklumat, tugas/wewenang, empat dokumen fondasi, dan editor profil di admin Vite.

**Sumber:** pamong dan dokumen OpenSID; `yms_ppid_profiles` untuk pengaturan layanan.

**Definition of done:** `/ppid` dirender SSR dari data API, admin dapat mengganti profil tanpa mengubah kode, dokumen dikelola dari OpenSID, data contoh ditandai, dan tidak ada lagi tautan permohonan PPID menuju pengaduan umum.

## Tahap 2 - Daftar Informasi Publik

Status: selesai pada 24 Juni 2026.

**Hasil:** DIP granular untuk kategori berkala, serta-merta, dan setiap saat, dengan pencarian, filter, detail, format, unit penguasa, penerbit, tanggal, tempat pembuatan, dan retensi.

**Sumber:** dokumen, produk hukum, perencanaan, keuangan, pembangunan, dan data publik OpenSID.

**Definition of done:** setiap baris DIP menunjuk informasi atau dokumen nyata, metadata minimum PerKI tersedia, dan informasi dikecualikan tidak tercampur ke daftar publik.

**Hasil implementasi:** `/dip` dan `/dip/:id` dirender SSR, dokumen dibuka inline melalui `/dokumen/:id`, metadata dikelola dari `/admin/dip`, dan sembilan dokumen contoh ber-watermark tersedia untuk pengujian lokal.

## Tahap 3 - Kelengkapan Publikasi

Status: selesai pada 25 Juni 2026.

**Hasil:** profil, RPJMDes/RKPDes, APBDes dan realisasi, program lintas sumber, produk hukum beserta dokumen pendukung, musyawarah, inventaris, perjanjian pihak ketiga, BUM Desa, dan laporan penyelenggaraan.

**Sumber:** modul OpenSID terkait dan kurasi PPID.

**Definition of done:** dokumen minimum Pasal 2 dan Pasal 4 PerKI 1/2018 tersedia, memiliki pemilik data, tanggal pembaruan, dan file atau URL yang dapat diakses.

**Hasil implementasi:** katalog publikasi `/public/publications` menghasilkan 100% kelengkapan contoh dengan 15 dokumen terdaftar. Halaman `/profil`, `/pemerintah-desa`, `/struktur-organisasi`, `/apbdes`, `/perencanaan`, `/program`, `/produk-hukum`, `/data-desa`, dan `/darurat` memakai katalog ini dari SSR/BFF.

## Tahap 4 - Permohonan Informasi

Status: selesai pada 25 Juni 2026.

**Hasil:** formulir khusus PPID, nomor registrasi, bukti penerimaan, status, pemberian informasi, penolakan tertulis, dan tenggat 10 hari kerja dengan perpanjangan maksimal 7 hari kerja.

**Sumber:** tabel transaksi PPID Yamansari dan dokumen OpenSID.

**Definition of done:** permohonan tidak memakai pengaduan umum, seluruh perubahan status tercatat, pemohon dapat melacak, dan petugas mendapat pengingat tenggat.

**Hasil implementasi:** `/permohonan-informasi` memakai `POST /public/ppid/requests` dan `/public/ppid/requests/track`, menghasilkan nomor registrasi dan token pelacakan. Response tracking menyembunyikan nomor identitas dan alamat.

## Tahap 5 - Keberatan dan Sengketa

Status: selesai untuk register dan tanggapan keberatan pada 25 Juni 2026; sengketa Komisi Informasi tetap berupa rujukan prosedural, bukan modul perkara.

**Hasil:** formulir dan register keberatan, tanggapan Atasan PPID, keputusan, tenggat 30 hari kerja, dan petunjuk sengketa ke Komisi Informasi.

**Definition of done:** keberatan terhubung ke permohonan atau alasan tidak tersedianya informasi berkala, mempunyai audit trail, dan menghasilkan dokumen keputusan.

**Hasil implementasi:** `/keberatan-informasi` memakai `POST /public/ppid/objections` dan `/public/ppid/objections/track`. Admin layanan PPID dapat memproses status keberatan sampai selesai.

## Tahap 6 - Informasi Darurat

Status: selesai pada 25 Juni 2026.

**Hasil:** pengumuman bahaya, lokasi dan pihak terdampak, waktu, evakuasi, tempat aman, kanal bantuan, tindakan pemerintah desa, serta status aktif/selesai.

**Sumber:** kurasi Yamansari, kontak publik, dan pengumuman OpenSID.

**Definition of done:** informasi serta-merta dapat diterbitkan cepat, cache dapat dipurge, tampil jelas di mobile, dan tidak hanya berupa daftar nomor telepon.

**Hasil implementasi:** `/darurat` dan `/mobil-siaga` memakai `GET /public/emergency`. Admin layanan PPID dapat membuat dan memperbarui informasi darurat melalui `/admin/ppid-layanan`.

## Tahap 7 - Register, Laporan, dan Audit

Status: selesai pada 25 Juni 2026.

**Hasil:** statistik permohonan, penolakan, keberatan, sengketa, waktu penyelesaian, laporan tahunan, audit perubahan, versi DIP, dan pengingat SLA.

**Definition of done:** laporan layanan dapat diekspor tanpa membuka data pribadi pemohon dan seluruh perubahan penting dapat ditelusuri ke admin serta waktu kejadian.

**Hasil implementasi:** `/laporan-ppid` memakai `GET /public/ppid/report`; admin `/admin/ppid-layanan` menampilkan register permohonan, keberatan, darurat, laporan, audit, SLA, seed workflow, dan ekspor CSV.

## Urutan Dependensi

`Fondasi PPID -> DIP -> Kelengkapan dokumen -> Permohonan -> Keberatan -> Darurat -> Pelaporan dan audit`

Tahap berikutnya hanya dimulai setelah data owner dan definition of done tahap sebelumnya dipenuhi. Tampilan halaman tidak dianggap selesai bila hanya berisi label atau data dummy tanpa sumber dan alur pengelolaan.
