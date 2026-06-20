# Security Review

Status: initial source-code notes. Not a vulnerability report yet.

## Auth And Permission Model

Evidence:

- `donjo-app/Routes/Web/admin.php` defines `/siteman` auth, OTP routes, password reset, and two-factor auth.
- `app/Providers/AuthServiceProvider.php` defines custom session guards, a custom penduduk provider, and Gate permissions.
- `donjo-app/helpers/general_helper.php` defines `can()` and `isCan()` wrappers around Gate.
- `app/Models/GrupAkses.php` stores `id_grup`, `id_modul`, and numeric `akses`.

Observed model:

- Access levels appear bit/threshold based: 1 read, 3 update, 7 delete.
- Gates are generated per module slug: `{slug}:baca`, `{slug}:ubah`, `{slug}:hapus`, plus `{slug}:b/u/h` aliases.
- Administrator gets broad default access via install-time group access creation.
- Parent module access can be elevated if child modules have access.

Review questions:

- Are all mutating routes guarded with `isCan('u')` or `isCan('h')` consistently?
- Are hidden modules still reachable directly if route names are known?
- Does cache invalidation happen after permission updates for every user/group?
- Can stale `akses_grup_{id}` cache retain privileges after changes?

## Citizen Portal Risks To Verify

Evidence: `donjo-app/Routes/Web/mandiri.php` and `donjo-app/core/Mandiri_Controller.php`.

Pleret passive observation on 2026-06-08:

- `/layanan-mandiri/masuk` returns a login form posting to `/layanan-mandiri/cek`.
- Parsed fields include `nik` and `pin`.
- Initial login page contains CSRF-related strings/scripts.
- Initial login page did not contain `captcha`, `recaptcha`, or `securimage` strings in this pass.

Risk areas:

- NIK/PIN authentication and rate limiting.
- Forgot PIN/reset token behavior.
- Horizontal access control on document and letter archive IDs.
- Required verification flow for email/Telegram and uploaded KTP/KK/selfie.
- Guest anjungan mode boundaries.
- Upload validation for citizen documents.

Admin passive observation on Pleret:

- `/siteman/` returns a login form posting to `/siteman/auth`.
- Parsed fields include `username` and `password`.
- Initial login page contains CSRF-related strings/scripts.
- Initial login page did not contain `captcha`, `recaptcha`, or `securimage` strings in this pass.

## Obfuscation/Auditability

Several core and module files are wrapped/obfuscated. Passive decoding is possible, but ordinary review/search will miss actual code unless decoded. This has practical impact on security review, diff review, and maintainability.

Initial detected files:

- `donjo-app/config/config.php`
- `donjo-app/core/Admin_Controller.php`
- `donjo-app/core/AdminModulController.php`
- `donjo-app/core/WebModulController.php`
- `donjo-app/helpers/core_helper.php`
- `Modules/Anjungan/Http/Controllers/BackEnd/*Controller.php`
- `Modules/BukuTamu/Http/Controllers/BackEnd/*Controller.php`
- `Modules/Pelanggan/Http/Controllers/*Controller.php`
- `Modules/Pelanggan/Services/PelangganService.php`

## External/API Exposure

Evidence: `donjo-app/Routes/api.php`.

- Internal API exposes public-style data for wilayah, pengaduan, pembangunan, artikel, bantuan, status desa, inventaris, stunting, DPT, lapak, kelompok, lembaga, PPID, produk hukum, peta, statistik, pemerintah, verification, galeri, suplemen, and analysis.
- External API exposes PDF signing and TTE endpoints.

Review questions:

- Are internal API endpoints meant to be public, semi-public, or local-only?
- Are API responses filtered for sensitive population fields?
- Are TTE endpoints authenticated and protected against replay?
- Are verification endpoints constrained to non-sensitive document metadata?

## Password/PIN Notes

`AuthServiceProvider` registers a custom `md5` hasher for a 6-digit value transformation. The code comment references legacy OpenSID PIN logic. This needs runtime context: it may be for citizen PIN compatibility, but 6-digit MD5-derived PINs require compensating controls such as rate limiting, lockout, and reset verification.
