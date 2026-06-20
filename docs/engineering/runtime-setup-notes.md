# Catatan Runtime Lokal OpenSID 2606.0.0

Tanggal uji: 2026-06-09, timezone Asia/Jakarta.

## Status

OpenSID berhasil dijalankan secara lokal dari source root workspace.

- URL publik: `http://127.0.0.1:8081/`
- Admin/Siteman: `http://127.0.0.1:8081/index.php/siteman`
- Layanan Mandiri: `http://127.0.0.1:8081/index.php/layanan-mandiri/masuk`
- Admin default lokal: `admin` / `sid304`
- Admin login memakai CAPTCHA, jadi login dashboard perlu input CAPTCHA manual.

## Runtime Yang Dipakai

XAMPP bawaan di mesin ini memiliki PHP 8.0.30, sedangkan installer OpenSID 2606.0.0 meminta PHP `>= 8.1.0` dan `<= 8.3.0`. Karena itu runtime PHP portable dipasang di workspace:

- PHP: `tools/php-8.2.30-nts-Win32-vs16-x64/php.exe`
- Konfigurasi lokal: `tools/opensid-php.ini`
- MariaDB binary: `C:/xampp/mysql/bin/mysqld.exe`
- MariaDB data directory lokal: `tools/mariadb-data`
- Database: `opensid_local` di `127.0.0.1:3307`

Ekstensi PHP wajib yang sudah aktif: `pdo_mysql`, `curl`, `fileinfo`, `gd`, `iconv`, `json`, `mbstring`, `mysqli`, `mysqlnd`, `tidy`, `zip`, `exif`.

## Cara Menjalankan Ulang

Start MariaDB lokal:

```powershell
Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=F:\masx\OpenSID-2606.0.0\OpenSID-2606.0.0\tools\mariadb-data\my.ini --basedir=C:\xampp\mysql --bind-address=127.0.0.1 --innodb-use-native-aio=0 --max-connections=100 --key-buffer-size=16M --log-error=F:\masx\OpenSID-2606.0.0\OpenSID-2606.0.0\tools\mariadb-data\opensid-mariadb.err" -WindowStyle Hidden
```

Start PHP built-in server:

```powershell
Start-Process -FilePath "F:\masx\OpenSID-2606.0.0\OpenSID-2606.0.0\tools\php-8.2.30-nts-Win32-vs16-x64\php.exe" -ArgumentList @('-c', 'F:\masx\OpenSID-2606.0.0\OpenSID-2606.0.0\tools\opensid-php.ini', '-S', '127.0.0.1:8081') -WorkingDirectory "F:\masx\OpenSID-2606.0.0\OpenSID-2606.0.0" -WindowStyle Hidden -RedirectStandardOutput "F:\masx\OpenSID-2606.0.0\OpenSID-2606.0.0\tools\opensid-php-server.out.log" -RedirectStandardError "F:\masx\OpenSID-2606.0.0\OpenSID-2606.0.0\tools\opensid-php-server.err.log"
```

Verifikasi cepat:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8081/ -UseBasicParsing
Invoke-WebRequest -Uri http://127.0.0.1:8081/index.php/siteman -UseBasicParsing
Invoke-WebRequest -Uri http://127.0.0.1:8081/index.php/layanan-mandiri/masuk -UseBasicParsing
```

## Blocker Dan Perbaikan

1. XAMPP PHP terlalu lama.
   - XAMPP PHP: `8.0.30`.
   - OpenSID 2606.0.0 meminta PHP `8.1` sampai `8.3`.
   - Solusi lokal: pakai PHP portable `8.2.30`.

2. Ekstensi PHP portable belum aktif.
   - Solusi lokal: tambah `tools/opensid-php.ini` dan aktifkan ekstensi wajib.

3. XAMPP MariaDB global gagal start.
   - Log XAMPP global menunjukkan Aria recovery failure di `C:/xampp/mysql/data`.
   - Agar tidak menyentuh database global XAMPP, dibuat data directory baru di `tools/mariadb-data` pada port `3307`.
   - MariaDB lokal perlu opsi `--innodb-use-native-aio=0` agar stabil di Windows.

4. Seeder fresh install gagal pada tabel enum analisis.
   - `analisis_ref_subjek` memiliki kolom `subjek`, bukan `nama`.
   - `analisis_tipe_indikator` memiliki kolom `tipe`, bukan `nama`.
   - Patch: `insertEnumToTable()` memilih kolom label berdasarkan schema tabel.

5. Seeder fresh install gagal pada `ref_penduduk_bahasa`.
   - Kolom `inisial` wajib diisi, tetapi insert awal hanya mengisi `id` dan `nama`.
   - Patch: saat tabel `ref_penduduk_bahasa`, insert awal mengisi `inisial` kosong; baris berikutnya di seeder mengisi nilai resmi `L`, `D`, `A`, `AL`, `AD`, `ALD`.

6. Halaman publik 500 karena CA certificate cURL.
   - Error: `cURL error 60: SSL certificate problem` saat OpenSID menghubungi `layanan.opendesa.id`.
   - Solusi lokal: `curl.cainfo` dan `openssl.cafile` diarahkan ke `C:/xampp/apache/bin/curl-ca-bundle.crt` di `tools/opensid-php.ini`.

## Observasi Awal Beratnya Sistem

Angka dari runtime lokal setelah fresh install:

- Migrasi dan seed data awal memakan sekitar 70 detik dari submit migrasi sampai `Selesai memasang data awal` di log.
- Database akhir berisi 197 tabel.
- `setting_modul` berisi 158 modul, dan semuanya berstatus aktif (`aktif=1`) kecuali 3 yang tersembunyi.
- Respons awal via `Invoke-WebRequest`:
  - Publik root: sekitar 3.1 detik, HTML sekitar 59 KB.
  - Admin login: sekitar 5.8 detik, HTML sekitar 7.4 KB.
  - Layanan Mandiri login: sekitar 1.9 detik, HTML sekitar 11.7 KB.
- Working set proses setelah jalan:
  - MariaDB lokal: sekitar 185 MB.
  - PHP built-in server: sekitar 46 MB.

Catatan: angka ini masih quick smoke test di local dev, belum benchmark formal.
