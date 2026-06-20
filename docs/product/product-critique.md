# Product Critique

Status: draft positioning from handoff plus source-code evidence.

## Main Critique

OpenSID has broad capability but weak product hierarchy. Source code confirms this breadth: population, letters, citizen portal, CMS, public API, PPID, maps, finance, assistance, attendance, guestbook, lapak, analysis, inventory, land records, sync, subscription/customer modules, and system operations all live in one application surface.

The likely product problem is not feature count alone. The deeper issue is that core workflows, operational modules, public CMS, and optional extensions are presented as one large system. This can make training, ownership, monitoring, and continuity fragile.

## Evidence From Source

- `SettingModul.php` seeds 137 module entries and 24 parent groups.
- `admin.php` contains a very large set of backend routes across multiple domains.
- `frontend.php`, `mandiri.php`, and `api.php` are separate surfaces, but they depend on shared models/settings and route conventions.
- `Modules` exists, but module routes and seeded menu entries still integrate into the global application.

## Product Direction Hypothesis

OpenSID should be positioned as:

> A village operating system for trusted population data and citizen administrative services.

Then CMS/public site, attendance, lapak, analysis, health, assistance, guestbook, finance, and integrations should become optional workspaces with clear owners and measurable usage.

