# Layanan Mandiri Analysis

Status: draft awal berbasis source code lokal. Belum menguji runtime warga atau demo.

## Entry Points

Primary source: `donjo-app/Routes/Web/mandiri.php`.

Route prefix: `/layanan-mandiri`, namespace `fmandiri`.

There is also a fallback route group `/fmandiri/surat` because source comments say some code still calls `fmandiri` directly rather than `layanan-mandiri`.

## Functional Areas From Routes

| Area | Routes | Reading |
|---|---|---|
| Login | `/masuk`, `/cek`, `/masuk-ektp`, `/cek-ektp` | Citizen auth supports normal and e-KTP style login paths |
| Password/PIN recovery | `/lupa-pin`, `/cek-pin`, `/reset-password` | Reset flow exists; security must be verified at runtime |
| Dashboard/profile | `/beranda`, `/profil`, `/cetak-biodata`, `/cetak-kk`, `/ganti-pin` | Citizen can view profile and print biodata/KK |
| Messages | `/pesan-masuk`, `/pesan-keluar`, `/pesan/*` | Mailbox/ticket-like messaging exists |
| Registration | `/daftar`, `/proses-daftar` | Citizen registration exists |
| Verification | `/daftar/verifikasi/email`, `/daftar/verifikasi/telegram`, `/verifikasi/*` | Email and Telegram verification are first-class flows |
| Letter requests | `/permohonan-surat`, `/arsip-surat`, `/surat/buat`, `/surat/kirim`, `/surat/proses`, `/surat/cetak` | Main service workflow for online letter request and archive |
| Aid | `/bantuan`, `/bantuan/datatables`, `/bantuan/kartu_peserta` | Citizen can inspect assistance participation/card |
| Documents | `/dokumen`, `/dokumen/form`, `/dokumen/tambah`, `/dokumen/unduh` | Citizen document upload/download surface |
| Attendance | `/kehadiran`, `/kehadiran/lapor` | Presence/reporting feature exposed in citizen portal |
| Products/lapak | `/produk`, `/produk/store`, `/produk/pengaturan`, `/lapak` | UMKM/product management and public lapak browsing |

## Controller Gate

Primary source: `donjo-app/core/Mandiri_Controller.php`.

Observed behavior:

- If `setting('layanan_mandiri') == 0` and no kiosk/anjungan context exists, the controller returns 404.
- It requires either `auth('penduduk')` or `auth('pendudukGuest')`.
- Redirect target depends on session state: normal login, e-KTP login, or guest anjungan.
- If a citizen account implements email/Telegram verification and has uploaded KTP, KK, and selfie documents, missing verification redirects to the relevant verification page.

## Product Reading

Layanan Mandiri is not a small authentication widget. It is a citizen service portal covering identity, letters, messages, documents, aid status, verification, and local product listing.

The strongest core workflow inside this surface is:

1. Citizen logs in or registers.
2. Citizen verifies account or required contact channel.
3. Citizen requests a letter.
4. System checks requirements/form fields.
5. Request is sent to admin workflow.
6. Citizen sees process status or archive.
7. Citizen prints/downloads output.

## Risks To Verify

- NIK/PIN brute force/rate limiting and lockout behavior.
- Error messages that may reveal whether a NIK exists.
- Reset PIN token lifetime and binding to citizen identity.
- Whether one account can see only its own data or the whole KK.
- IDOR on `/dokumen/unduh/{id}` and `/surat/cetak/{id}`.
- File upload type/size validation for citizen documents.
- Whether email/Telegram verification is optional or mandatory per setting.
- Whether guest anjungan flows can submit sensitive requests without sufficient verification.

## Still Unverified

- Pleret Layanan Mandiri active/inactive state.
- Runtime UI and mobile completion quality.
- Actual list of available letter types.
- Admin-side status workflow after request submission.
- Notification delivery by email, Telegram, FCM, SMS, or WhatsApp.

