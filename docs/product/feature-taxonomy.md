# Feature Taxonomy

Status: draft awal berbasis source code lokal. Classification is provisional until admin demo and public instance are audited.

## Taxonomy Rules

- CORE: needed for the main job of operating village identity and services.
- OPERATIONAL: important internal work, but not universal core for every village or every day.
- PUBLIC: public website, information, transparency, publication, and citizen-facing content.
- EXTENSION: useful module, should be installable/enabled separately.
- LEGACY: old compatibility surface or older naming retained for compatibility.
- DUPLICATE: overlapping function or alternative route to similar capability.
- UNCLEAR: needs runtime/product verification.

## Initial Classification

| Feature group | Classification | Reason |
|---|---|---|
| Penduduk, Keluarga, Rumah Tangga | CORE | Primary data backbone for letters, statistics, aid, documents, and services |
| Wilayah Administratif | CORE | Needed for identity, address, reports, maps, and population grouping |
| Peristiwa/log penduduk | CORE | Population lifecycle must be auditable |
| Pengaturan Surat, Cetak Surat, Permohonan Surat, Arsip Layanan | CORE | Most direct public-service workflow |
| Dokumen penduduk and citizen documents | CORE | Supports identity evidence and service archive |
| Pengguna, Grup, `grup_akses` | CORE | Needed for least privilege and role ownership |
| Database backup/restore, Info Sistem | CORE | Operational continuity and maintenance |
| Layanan Mandiri | OPERATIONAL/CORE SERVICE | Core to digital service if online citizen service is desired; not always required for basic office-only deployment |
| Admin Web/CMS | PUBLIC | Important for public information, but separate from operational core |
| Statistik publik | PUBLIC | Derived/public reporting; depends on data quality |
| PPID/Informasi Publik/Produk Hukum | PUBLIC/OPERATIONAL | Public transparency/compliance, should have a clear owner |
| Keuangan/APBDes | OPERATIONAL/PUBLIC | Important but often tied to external government finance systems |
| Bantuan/DTKS | EXTENSION/OPERATIONAL | High dependency on external data and social service owner |
| Lapak/Produk warga | EXTENSION | Useful local directory, not core village administration |
| Kehadiran | EXTENSION/OPERATIONAL | Staff/attendance workflow, separate owner and cadence |
| Buku Tamu | EXTENSION | Reception/satisfaction module, not universal core |
| Anjungan | EXTENSION | Hardware/kiosk deployment mode |
| Analisis/sensus | EXTENSION | Survey subsystem with many subroutes; likely situational |
| Kesehatan/COVID/Vaksin/Stunting | EXTENSION | Domain-specific and time-sensitive |
| Pertanahan/C-Desa/Persil | OPERATIONAL/EXTENSION | Important in some villages, but specialized |
| Inventaris | OPERATIONAL | Administrative asset management, not core identity/service |
| OpenDK/Sinkronisasi | EXTENSION/INTEGRATION | Depends on external ecosystem |

## Product Hypothesis

One main job of OpenSID should be:

> Operate trusted village population data and citizen administrative services.

This means the product should foreground the working loop:

1. Maintain accurate resident/household data.
2. Process resident events.
3. Serve letter/document requests.
4. Archive and audit the result.
5. Let citizens track or retrieve services when Layanan Mandiri is enabled.

Other modules should be presented as optional workspaces with explicit owners.

