# Yamansari API

Go service untuk jalur cepat frontend warga Yamansari. OpenSID tetap menjadi admin/write source utama, sementara service ini membaca DB OpenSID dan menangani transaksi mandiri yang sudah dipetakan.

## Dev

```powershell
$env:YMS_API_ADDR = "127.0.0.1:8090"
$env:YMS_DB_DSN = "root:@tcp(127.0.0.1:3307)/opensid_local?parseTime=true&charset=utf8mb4"
$env:YMS_CONFIG_ID = "1"
$env:YMS_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
$env:YMS_JWT_SECRET = "dev-change-me"
$env:YMS_COOKIE_SECURE = "false"
go run .
```

Pada setup lokal OpenSID yang memakai `desa/config/database.php`, DSN bisa berbeda dari contoh. Jangan tulis credential lokal ke repo.

## Endpoints

- `GET /api/yms/health`
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
