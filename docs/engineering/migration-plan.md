# Migration Plan

Status: scaffold.

Potential migration concerns:

- Keep legacy URLs such as `/first/artikel` and `/fmandiri/surat` compatible.
- Preserve `setting_modul` slugs because they drive permission gates.
- Separate CMS/public and operational backend carefully so existing themes keep working.
- Introduce feature flags before removing or isolating modules.
- Preserve data model compatibility for penduduk, keluarga, surat, dokumen, and logs first.

