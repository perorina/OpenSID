# Design Principles — Portal Mobile Pemerintahan Desa

**Project:** Portal Layanan & Informasi Desa  
**Platform utama:** Mobile web / PWA  
**Arah desain:** modern, rounded, compact, realistis, mudah dipakai warga  
**Tanggal:** 11/06/2026

---

## 1. Tujuan Desain

Desain harus terasa seperti aplikasi layanan publik modern, bukan homepage website yang dipaksa masuk ke layar HP.

Prioritas utama:

1. **Cepat dipahami warga.** Pengguna harus langsung tahu tombol mana untuk surat, pengaduan, berita, agenda, dan kontak.
2. **Ringkas tapi tidak sesak.** Banyak informasi boleh tampil, tapi tidak boleh terasa seperti brosur penuh teks.
3. **Mobile-first.** Semua layout harus mengikuti standar interaksi mobile: scroll vertikal, bottom navigation, card pendek, dan tap area besar.
4. **Tidak memaksakan card sama ukuran.** Ukuran card mengikuti kebutuhan konten, bukan semua dibuat kotak besar.
5. **Fokus ke layanan desa.** Homepage bukan tempat menaruh semua fitur. Yang tampil hanya fitur prioritas dan ringkasan penting.

---

## 2. Karakter Visual

### Gaya Umum

- Clean, modern, soft, rounded.
- Banyak ruang putih, tapi tetap compact.
- Hindari desain terlalu ramai seperti portal berita lama.
- Gunakan shadow tipis, bukan shadow tebal.
- Gunakan warna hijau sebagai identitas utama, dengan aksen biru, oranye, merah, dan ungu seperlunya.

### Mood Desain

Desain harus terasa:

- Resmi, tapi tidak kaku.
- Ramah untuk warga desa.
- Rapi seperti aplikasi pemerintahan modern.
- Tidak terlalu “template dashboard admin”.
- Tidak terlalu dekoratif sampai mengganggu fungsi.

---

## 3. Layout Mobile

### Struktur Halaman Beranda

Urutan ideal halaman mobile:

1. Status/header area.
2. Header desa: logo, nama desa, subtitle, notifikasi/menu.
3. Search bar.
4. Hero banner.
5. Layanan utama.
6. Info cepat/statistik ringkas.
7. Berita terbaru.
8. Agenda desa.
9. Bantuan/kontak cepat.
10. Bottom navigation sticky.

Footer desktop tidak perlu dipaksakan tampil penuh di mobile. Untuk mobile, footer cukup diganti dengan **kontak cepat**, **lokasi**, atau **tautan ringkas** jika memang dibutuhkan.

---

## 4. Header

### Aturan Header

- Logo desa di kiri, ukuran sekitar **42–48 px**.
- Nama desa jelas, maksimal 1 baris jika memungkinkan.
- Subtitle pendek, contoh: `Portal Layanan & Informasi Desa`.
- Aksi kanan cukup 1–2 tombol: notifikasi, menu, atau search.
- Jangan menaruh terlalu banyak ikon di header.

### Contoh Struktur

```text
[Logo] Desa Sukamaju
       Portal Layanan & Informasi Desa          [Notifikasi]
```

### Spacing Header

- Padding kiri-kanan: **20–24 px**.
- Jarak logo ke teks: **12–14 px**.
- Jarak header ke search bar: **16–20 px**.

---

## 5. Search Bar

Search bar penting karena warga sering mencari layanan berdasarkan kebutuhan.

### Aturan

- Tinggi: **52–56 px**.
- Radius: **18–22 px**.
- Placeholder jelas: `Cari layanan, informasi, berita...`
- Icon search di kiri.
- Filter/menu kecil di kanan opsional.
- Jangan terlalu tinggi karena akan memakan area layar.

---

## 6. Hero Banner

Hero banner berfungsi sebagai pembuka visual, bukan tempat menaruh banyak teks.

### Aturan

- Rasio mobile ideal: sekitar **16:9 sampai 2:1**.
- Tinggi ideal: **220–260 px** tergantung layar.
- Gunakan foto/ilustrasi desa yang natural.
- Overlay gradient gelap di area teks.
- Teks maksimal 2–3 baris.
- CTA maksimal 1 tombol.

### Konten Ideal

```text
Selamat Datang di Desa Sukamaju
Layanan desa dalam genggaman. Informasi cepat, layanan mudah.
[Selengkapnya]
```

### Larangan

- Jangan memasukkan terlalu banyak kalimat.
- Jangan membuat hero terlalu tinggi sampai layanan utama tidak terlihat di layar pertama.
- Jangan memakai gambar yang terlalu ramai di belakang teks.

---

## 7. Layanan Utama

Layanan utama harus mudah dipindai dan mudah ditekan.

### Jumlah Layanan di Beranda

Ideal: **6–8 layanan utama**.

Contoh:

- Surat Online
- Pengaduan
- Berita Desa
- Agenda
- UMKM
- Data Warga
- Pengumuman
- Lainnya

### Pola Layout

Gunakan grid **4 kolom icon menu** untuk mobile bila label pendek.

```text
[Icon] [Icon] [Icon] [Icon]
Label  Label  Label  Label

[Icon] [Icon] [Icon] [Icon]
Label  Label  Label  Label
```

### Aturan Card Layanan

- Tap area minimal **72 x 72 px**.
- Icon container: **48–56 px**.
- Radius icon container: **14–18 px**.
- Label 1–2 baris maksimal.
- Jangan semua layanan dibuat card besar dengan deskripsi panjang.

### Kapan Card Besar Dipakai

Card besar hanya untuk layanan prioritas atau promosi utama, contoh:

- Pengurusan Surat Keterangan
- Pengaduan Darurat
- Transparansi APBDes

Jangan semua item layanan dibuat besar.

---

## 8. Info Cepat / Statistik

Statistik harus ringkas, tidak seperti tabel.

### Data yang Cocok Ditampilkan

- Penduduk
- Keluarga / KK
- RT/RW
- APBDes / Anggaran

### Aturan Layout

- Bisa horizontal scroll jika data lebih dari 3–4 item.
- Tinggi card: **88–104 px**.
- Angka dibuat dominan.
- Label kecil dan jelas.

### Contoh

```text
Penduduk    3.245 Jiwa
Keluarga    1.128 KK
RT/RW       12 / 4
APBDes      Rp 1,2 M
```

---

## 9. Berita Terbaru

Berita di mobile lebih realistis memakai list, bukan grid besar.

### Aturan

- Gunakan list vertical card.
- Gambar thumbnail di kiri.
- Judul di kanan.
- Kategori kecil di atas judul.
- Tanggal di bawah.
- Maksimal tampilkan 2 berita di beranda.
- Sisanya masuk ke halaman Berita.

### Ukuran Ideal

- Card tinggi: **100–120 px**.
- Thumbnail: **80–96 px**.
- Radius thumbnail: **12–16 px**.
- Judul maksimal 2 baris.

### Jangan

- Jangan menampilkan 3 kolom berita di mobile.
- Jangan membuat berita terlalu tinggi seperti kartu desktop.
- Jangan memuat banyak paragraf di card berita.

---

## 10. Agenda Desa

Agenda harus terbaca cepat karena sifatnya waktu dan lokasi.

### Aturan

- Pakai card horizontal.
- Tanggal dibuat blok kecil di kiri.
- Judul, lokasi, dan jam di tengah.
- Icon/detail di kanan.

### Contoh

```text
[24 MEI 2025] Posyandu Balita & Lansia
              Balai Desa Sukamaju
              08.00 - 11.00 WIB
```

### Tinggi Card

Ideal: **96–120 px**.

---

## 11. Bantuan / Kontak Cepat

Di mobile, bantuan lebih penting daripada footer panjang.

### Aturan

- Letakkan menjelang akhir halaman.
- Buat card lembut dengan warna hijau muda.
- Tombol utama: WhatsApp / Hubungi Kami.
- Tambahkan teks singkat, bukan daftar kontak panjang.

### Contoh

```text
Butuh Bantuan?
Hubungi perangkat desa untuk informasi lebih lanjut.
[Hubungi Kami]
```

---

## 12. Bottom Navigation

Bottom navigation wajib untuk pengalaman mobile yang realistis.

### Menu Utama

Gunakan 4 item utama:

1. Beranda
2. Layanan
3. Informasi
4. Akun / Profil

### Aturan

- Sticky di bawah layar.
- Tinggi: **72–84 px**.
- Icon + label.
- Active state pakai warna hijau.
- Background putih dengan shadow sangat halus.
- Beri safe area untuk gesture bar.

### Jangan

- Jangan memakai lebih dari 5 item.
- Jangan menaruh label panjang.
- Jangan membuat bottom nav transparan jika konten di belakang ramai.

---

## 13. Footer Mobile

Footer desktop yang panjang tidak cocok untuk mobile beranda.

### Prinsip

- Footer mobile harus ringkas.
- Prioritaskan kontak cepat dan tautan penting.
- Detail lengkap seperti alamat, sosial media, dokumen hukum, dan struktur organisasi bisa masuk halaman khusus.

### Footer Mobile Ideal

```text
Kontak Desa
WhatsApp • Telepon • Email • Lokasi

© 2026 Desa Sukamaju
```

Atau cukup memakai card bantuan sebelum bottom navigation.

---

## 14. Spacing & Grid

### Ukuran Dasar

Gunakan sistem spacing berbasis 4 px.

```text
4, 8, 12, 16, 20, 24, 32
```

### Padding Mobile

- Page horizontal padding: **20–24 px**.
- Section gap: **24–32 px**.
- Card inner padding: **14–18 px**.
- Gap antar card: **12–16 px**.

### Prinsip

- Jangan terlalu rapat antar section.
- Jangan terlalu banyak whitespace kosong.
- Setiap section harus punya heading yang jelas.

---

## 15. Border Radius

Gunakan rounded konsisten.

```text
Small radius   : 10–12 px
Medium radius  : 16–20 px
Large radius   : 24–28 px
Pill radius    : 999 px
```

### Rekomendasi

- Button: **14–18 px** atau pill.
- Card: **18–24 px**.
- Hero: **24–28 px**.
- Icon background: **14–18 px**.
- Bottom nav: **28–32 px** bagian atas.

---

## 16. Warna

### Primary

Gunakan hijau sebagai warna utama.

```css
--color-primary: #0F8A43;
--color-primary-dark: #086B33;
--color-primary-soft: #E8F7EE;
```

### Secondary

```css
--color-blue: #1E6DEB;
--color-orange: #F97316;
--color-red: #EF4444;
--color-purple: #7C3AED;
```

### Neutral

```css
--color-text: #0F172A;
--color-muted: #64748B;
--color-border: #E2E8F0;
--color-card: #FFFFFF;
--color-background: #F8FAFC;
```

### Aturan Warna

- Hijau untuk aksi utama dan identitas desa.
- Biru untuk informasi/data.
- Oranye untuk agenda/peringatan ringan.
- Merah hanya untuk urgent/pengaduan/darurat.
- Jangan terlalu banyak warna kuat dalam satu layar.

---

## 17. Tipografi

### Font Rekomendasi

Gunakan font sans-serif modern:

- Inter
- Plus Jakarta Sans
- Manrope
- SF Pro fallback

### Skala Font Mobile

```text
Display / Hero title : 28–32 px / 700
Page title           : 24–28 px / 700
Section title        : 20–22 px / 700
Card title           : 15–17 px / 600–700
Body text            : 13–15 px / 400–500
Caption              : 11–13 px / 400–500
Bottom nav label     : 11–12 px / 500
```

### Aturan

- Judul card maksimal 2 baris.
- Body text jangan lebih dari 2 baris di card.
- Gunakan line-height longgar: **1.35–1.5**.
- Hindari font terlalu tipis.

---

## 18. Icon

### Gaya Icon

- Gunakan outline atau solid sederhana.
- Ketebalan konsisten.
- Icon harus mudah dimengerti warga.
- Tiap kategori boleh punya warna aksen.

### Ukuran

```text
Small icon  : 18–20 px
Menu icon   : 24–28 px
Hero/action : 28–32 px
```

### Icon Mapping

```text
Surat Online  : document/text icon
Pengaduan     : chat bubble / alert icon
Berita Desa   : newspaper icon
Agenda        : calendar icon
UMKM          : store icon
Data Warga    : users icon
Pengumuman    : megaphone icon
Kontak        : headset / phone icon
```

---

## 19. Button

### Button Utama

- Background hijau.
- Teks putih.
- Radius pill atau 16 px.
- Tinggi: **44–48 px**.

### Button Sekunder

- Background putih.
- Border tipis.
- Teks hijau/navy.
- Cocok untuk CTA di hero.

### Aturan

- Jangan terlalu banyak button dalam satu section.
- Satu section maksimal punya satu aksi utama.

---

## 20. Shadow & Border

### Shadow

Gunakan shadow lembut.

```css
box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
```

### Border

```css
border: 1px solid #E2E8F0;
```

### Prinsip

- Card boleh pakai border + shadow tipis.
- Jangan gunakan shadow gelap/tebal.
- Jangan terlalu banyak efek glassmorphism.

---

## 21. Content Rules

### Bahasa

Gunakan bahasa Indonesia yang sederhana dan langsung.

Contoh baik:

- `Ajukan surat secara online`
- `Sampaikan keluhan atau aspirasi`
- `Lihat jadwal kegiatan desa`
- `Informasi data kependudukan`

### Hindari

- Kalimat terlalu formal dan panjang.
- Istilah teknis yang tidak perlu.
- Teks promosi berlebihan.

---

## 22. Standar Mobile Usability

### Tap Target

- Minimal tap area: **44 x 44 px**.
- Untuk menu utama lebih baik **64–80 px**.

### Scroll

- Satu arah: vertikal.
- Horizontal scroll hanya untuk statistik atau shortcut kecil.
- Jangan membuat layout terlalu panjang berisi semua data desa.

### Prioritas Above The Fold

Dalam layar pertama, pengguna idealnya melihat:

1. Identitas desa.
2. Search.
3. Hero.
4. Awal layanan utama.

---

## 23. Hal yang Harus Dihindari

- Memaksakan tampilan desktop ke mobile.
- Footer terlalu panjang di beranda mobile.
- Semua card dibuat ukuran sama besar.
- Grid berita 3 kolom di mobile.
- Terlalu banyak teks di hero.
- Terlalu banyak warna kuat dalam satu layar.
- Shadow terlalu tebal.
- Icon tidak konsisten.
- Menu lebih dari 8 item di section utama.
- Statistik dibuat seperti tabel besar.
- Homepage menjadi terlalu panjang seperti portal lama.

---

## 24. Contoh Struktur Komponen

### Service Icon Item

```text
[Icon rounded]
Surat Online
```

Digunakan untuk layanan cepat.

### News List Item

```text
[Thumbnail] [Kategori]
            Judul berita maksimal dua baris
            Tanggal
            [Chevron]
```

Digunakan untuk berita terbaru.

### Agenda Card

```text
[Date Box]  Judul Agenda
            Lokasi
            Jam
                         [Icon]
```

Digunakan untuk agenda terdekat.

### Help Card

```text
[Headset Icon] Butuh Bantuan?
              Hubungi perangkat desa untuk informasi lebih lanjut.
              [Hubungi Kami]
```

Digunakan sebelum bottom navigation.

---

## 25. Prinsip Akhir

Desain portal desa harus menjawab kebutuhan warga, bukan memamerkan semua fitur sekaligus.

Pegang prinsip ini:

> **Beranda mobile adalah pintu masuk, bukan tempat menyimpan semua isi website.**

Tampilkan yang paling sering dipakai, ringkas yang penting, dan pindahkan detail ke halaman khusus.
