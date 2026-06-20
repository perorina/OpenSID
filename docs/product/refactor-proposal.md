# Refactor Proposal

Status: scaffold. Do not finalize before feature map and workflow map are complete.

## Proposed Product Split

```text
OpenSID Core
- Penduduk
- Keluarga
- Wilayah
- Peristiwa penduduk
- Persuratan
- Dokumen
- Pengguna and access control
- Audit
- Backup/restore

OpenSID Service
- Layanan Mandiri
- Permohonan surat
- Status permohonan
- Pesan warga
- Notifikasi
- Antrean/antrian layanan

OpenSID Public
- Website desa
- Artikel
- Statistik publik
- PPID
- Pengaduan
- Agenda

OpenSID Extensions
- Bantuan
- Lapak
- Stunting/kesehatan
- Pertanahan
- Inventaris
- Kehadiran
- Pembangunan
- Keuangan
- Integrasi eksternal
```

## Refactor Questions

- Can operational backend and public CMS be separated without breaking existing themes?
- Can `setting_modul` become a product registry with explicit category, owner, dependency, and default enablement?
- Can role templates align with real village positions rather than generic broad roles?
- Can optional modules be disabled without hidden route/API residue?
- Can migration keep legacy URL compatibility for public pages and old `fmandiri` calls?

