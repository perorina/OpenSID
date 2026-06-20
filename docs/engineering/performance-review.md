# Performance Review

Status: scaffold.

Initial source clues:

- Public `Web_Controller` shares many widgets and counters on page load.
- API and DataTables routes are common across admin modules.
- Cache is used for settings modules, admin menu, group access, theme/customer status, and some website data.
- Image optimization module exists.

Pending:

- Measure Pleret public frontend performance.
- Inspect database query patterns in high-traffic public pages.
- Check cache invalidation patterns.
- Check mobile payload size and theme assets.

