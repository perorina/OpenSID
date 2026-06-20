# Architecture Review

Status: draft awal berbasis source code lokal.

## High-Level Architecture

OpenSID 2606 snapshot is a hybrid application:

- Legacy CodeIgniter 3 structure: `donjo-app/controllers`, `donjo-app/core`, `donjo-app/helpers`, `donjo-app/models`, `donjo-app/views`.
- Laravel/Illuminate components: `app/Models`, `app/Providers`, `app/Services`, `app/database`, `resources/views`, `artisan`, `bootstrap`, `config`.
- Custom router package: `opensid/router` in `composer.json`, route files under `donjo-app/Routes` and `Modules/*/Routes`.
- Modular folder structure: `Modules/Analisis`, `Anjungan`, `BukuTamu`, `Kehadiran`, `Lapak`, `Pelanggan`.
- Theme files under `storage/app/themes`, including `esensi` and `natra` in this snapshot.

## Key Architectural Observations

- Route surfaces are separated by file: web, admin, frontend, mandiri, API, and module web routes.
- Data models are mostly Eloquent-style under `app/Models`, while controllers are still largely CodeIgniter-style.
- Admin and module base controllers are central to auth, shared header state, notifications, module loading, and subscription checks.
- Permission uses Laravel Gate definitions generated from `grup_akses` and `setting_modul` slugs.
- Menu/module data lives in database seeders and can drive both navigation and access control.
- Public website controller shares a large amount of common view data: visitor counters, slider, widgets, agenda, comments, social media, archive, APBDes widget, attendance widget, and theme subscription state.

## Coupling Signals

- `Web_Controller` pulls data from CMS, attendance, finance, theme, visitor stats, agenda, comments, and customer/subscription services for shared public layout data.
- `Admin_Controller` checks identity, subscription state, notification counts, request counts, and auth state before rendering backend pages.
- `SettingModul.php` ties product taxonomy, URL routing hints, visibility, parent group, and access control identity into one table.
- Module routes are separate, but module menu entries and permission slugs still sit in the global module/access system.

## Auditability Concern

Several source files are obfuscated/wrapped with `base64_decode`, zlib compression, and eval-style lambda wrappers. Passive decoding shows normal-looking PHP underneath, but the wrapper reduces direct auditability.

Files detected with `Loading ...php` wrapper include:

- `donjo-app/config/config.php`
- `donjo-app/core/Admin_Controller.php`
- `donjo-app/core/AdminModulController.php`
- `donjo-app/core/WebModulController.php`
- `donjo-app/helpers/core_helper.php`
- Several backend module controllers in `Modules/Anjungan`, `Modules/BukuTamu`, and `Modules/Pelanggan`.

This should be treated as an engineering maintainability and reviewability issue first. It is not by itself proof of malicious behavior.

## Pending Review

- Database schema and migration history.
- Upload storage paths and access rules.
- Session guard behavior and cookie settings.
- Backup/restore implementation.
- Public file serving and document access control.
- Plugin install/update mechanics.

