# Yamansari API

Go service untuk jalur cepat frontend warga Yamansari. OpenSID tetap menjadi sumber utama untuk admin, pengolahan data, dan manajemen surat. Service ini membaca DB OpenSID untuk endpoint publik Vite, lalu menyediakan gateway mandiri yang menulis ke tabel OpenSID yang memang diproses lagi dari admin OpenSID.

## Boundary

- OpenSID: admin panel, master data, pengolahan penduduk, verifikasi, dan manajemen surat.
- Yamansari API: internal data service untuk Vite SSR/BFF. Semua endpoint data/action wajib memakai `Authorization: Bearer $YMS_INTERNAL_API_KEY`, kecuali `/health`.
- Vite SSR/BFF: satu-satunya entry point browser untuk halaman publik, layanan mandiri, admin ringan, dan proxy action.
- Mandiri API: entry-point warga di belakang BFF; status dan proses lanjutan tetap mengikuti data OpenSID.

## Dev

Untuk setup lokal repo ini, jalankan helper agar service memakai `desa/config/database.php` dan `desa/app_key` tanpa menulis password database ke repo:

```powershell
.\scripts\run-local.ps1
```

Untuk server atau environment non-lokal, set `YMS_DB_DSN` dari secret manager:

```powershell
$env:YMS_DB_DSN = "opensid_user:opensid_password@tcp(127.0.0.1:3307)/opensid_local?parseTime=true&charset=utf8mb4"
$env:YMS_INTERNAL_API_KEY = "isi-dengan-secret-panjang"
go run .
```

Jangan tulis credential lokal ke repo.

Vite SSR memakai API ini secara server-to-server lewat:

```powershell
$env:YMS_API_BASE_INTERNAL = "http://127.0.0.1:8090/api/yms"
$env:YMS_INTERNAL_API_KEY = "isi-sama-dengan-api"
```

## Endpoints

- `GET /api/yms/health`
- `GET /api/yms/public/home`
- `GET /api/yms/public/profile`
- `GET /api/yms/public/organization`
- `GET /api/yms/public/budget?year=2026`
- `GET /api/yms/public/planning`
- `GET /api/yms/public/programs`
- `GET /api/yms/public/legal-products`
- `GET /api/yms/public/ppid`
- `GET /api/yms/public/dip`
- `GET /api/yms/public/stats`
- `GET /api/yms/public/articles`
- `GET /api/yms/public/announcements`
- `GET /api/yms/public/emergency`
- `GET /api/yms/profil`
- `GET /api/yms/ringkasan`
- `GET /api/yms/artikel?limit=6`
- `GET /api/yms/pembangunan?limit=6`
- `GET /api/yms/program-bantuan?limit=6`
- `GET /api/yms/dtks`
- `POST /api/yms/mandiri/auth/masuk`
- `POST /api/yms/mandiri/auth/refresh`
- `POST /api/yms/mandiri/auth/keluar`
- `GET /api/yms/mandiri/me`
- `GET /api/yms/mandiri/surat/templates`
- `GET /api/yms/mandiri/surat/permohonan`
- `POST /api/yms/mandiri/surat/permohonan`
- `POST /api/yms/mandiri/surat/permohonan/{id}/batal`
- `GET /api/yms/mandiri/surat/arsip`

## Cache

Public API memakai in-memory TTL cache dengan stale fallback dan `singleflight`. Endpoint mandiri selalu `Cache-Control: no-store`.
