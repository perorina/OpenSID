# Workflow Map

Status: scaffold. Detailed mapping still pending.

Use this format for every workflow:

```text
Actor:
Trigger:
Precondition:
Steps:
Decision points:
Data touched:
Permissions:
Output:
Failure modes:
Audit requirements:
```

## Priority Workflows

1. Warga baru datang.
2. Penduduk pindah.
3. Kelahiran.
4. Kematian.
5. Surat domisili.
6. Surat usaha.
7. Surat pengantar.
8. Permohonan online.
9. Revisi permohonan.
10. TTE.
11. Download dokumen.
12. Pengaduan.
13. Bantuan sosial.
14. Publikasi berita.
15. Update APBDes.

## Source Clues

- Population and family routes are in `donjo-app/Routes/Web/admin.php` under `penduduk` and `keluarga`.
- Citizen online letter routes are in `donjo-app/Routes/Web/mandiri.php` under `/surat` and `/permohonan-surat`.
- Admin letter handling includes `surat`, `permohonan_surat_admin`, `keluar`, `surat_masuk`, `surat_keluar`, `surat_dinas` route groups.
- Public verification exists in `donjo-app/Routes/Web/frontend.php` under `/v/{alias?}` and `/verifikasi-surat`.

