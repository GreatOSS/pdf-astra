# Leafrune release notes

## 0.1.0 — 2026-09-29 (private preview)

First functional preview. No public release, package, website, or build has been published.

### Added

- Local PDF viewing with selectable text, page search, zoom, and thumbnails.
- Text additions, area highlights, rotation, reordering, deletion, extraction, and append/merge.
- Undo/redo, download-state tracking, and unsaved-change prompts.
- Responsive welcome/workspace UI and built-in mixed-orientation sample.
- Same-origin PDF.js rendering assets and a restrictive content security policy.
- Edit/serialization tests and browser round-trip, mobile, form, scan, and rotated-crop geometry checks.

### Corrected during validation

- Removed PDF.js full-viewer styles that leaked into application controls.
- Restored PDF.js rounding variables for correctly aligned rotated text layers.
- Accounted for non-default PDF user units in text-layer scaling.
- Reset scroll when navigating pages.
- Preserved accessible names on compact header buttons and hid the sidebar by default on narrow screens.

### Known limitations

See the [README](README.md#preview-boundaries) and [testing log](docs/TESTING.md). This is a foundation for iterative maintenance, not a claim of feature completeness.
