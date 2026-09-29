# Hands-on testing and maintenance log

## 2026-09-29 — Leafrune 0.1.0 preview

### Environment and inputs

- Ubuntu maintainer VM; Node 22 runtime installed under `/tmp/opencode/runtime` because the system default is Node 18. The project requires Node 22.13+.
- Browser-tool Chromium on local development port 5173 and production-preview port 4173.
- Desktop screenshots at 1440×900; browser viewports at 1280×720, 1280×900, and 390×844.
- Generated, non-sensitive PDF fixtures: three-page portrait/landscape sample; four rotations with offset CropBoxes and `UserUnit=2`; rasterized sample page; AcroForm text field; malformed input. No private user documents were used.

### Actual interactive checks

1. Opened the landing screen and sample through the UI; inspected welcome and workspace screenshots.
2. Rotated a page, entered “Reviewed with Leafrune”, and placed text on the rotated canvas. Visually confirmed new text remained horizontal relative to the screen.
3. Inspected the narrow layout: toolbar remains horizontally scrollable. Corrected icon-only header accessible names and chose a collapsed sidebar by default for new mobile sessions.
4. Navigated to the landscape page and dragged a highlight. Inspected the resulting mark and page thumbnail.
5. Used the **production build**, added “Production round trip”, downloaded the PDF, reopened the downloaded file via file input, and verified the added text survived. Browser console: no warnings/errors. Network inspection: only localhost app/worker requests.
6. Used the desktop screenshot tool to inspect the running Chromium window. Desktop pointer interaction was blocked by the tool environment (`xdotool ENOENT`); continued all interactions with browser tools. No claim of successful desktop-pointer testing.

### Automated checks

- Four Node tests: page reordering/rotation/deletion/extraction serialization and original immutability; merge ordering/dimensions and form-copy guards; annotations on cropped/rotated pages and unsupported Unicode rejection; malformed-file errors.
- Four Chromium workflows: edit→undo→redo→move→delete→undo→merge→download→reopen; invalid replacement and mobile search/navigation; all four CropBox rotations with non-default user units and text placement within 2 px; raster-only search feedback and read-only form behavior.
- Browser tests also check for uncaught runtime errors and external requests in the export workflow.
- TypeScript checking and production build pass. `npm audit`: **0 known vulnerabilities** at the time of this pass.

### Bugs found and corrected

- Full PDF.js viewer CSS leaked into app controls and added unnecessary size. Replaced with scoped text-layer rules; production CSS fell from approximately 242 KB to 14 KB.
- Initial scoped text styles lacked PDF.js rounding variables. The rotated-crop regression exposed text-selection geometry offset by ~28 px. Restoring the variables fixed all four rotations; the regression now passes.
- Included the PDF `UserUnit` in text-layer scale, matching rendered canvas geometry.
- Reset the reading scroll position on page navigation.
- Kept accessible names when hiding mobile button text.
- Added a working home/close action with unsaved-change protection and guide focus restoration.

### Remaining gaps / next checks

- Chromium is the only verified browser engine. No screen-reader audit yet; annotation placement is pointer-only.
- No third-party corpus validation yet for CJK/RTL, JPX/JBIG2 images, damaged cross-reference tables, or PDF/A. Decoder assets are bundled but this is not proof that every image/font format works.
- Form editing, XFA, password support, OCR, signing, redaction, and existing-text editing are not implemented. AcroForms are read-only; XFA/encrypted inputs are rejected.
- Structural edits need deeper bookmark/tag/internal-link fidelity coverage.
- State is in-memory only. A download initiates the browser's save flow; the app cannot confirm that a user retained the file after the browser handoff.
- Main JavaScript bundle is about 1.1 MB uncompressed (384 KB gzip), plus a 1.27 MB worker. Vite reports its large-chunk warning; lazy-loading and long-document performance are follow-up work.
- History uses serialized PDF snapshots (soft 128 MB cap, retaining at least two snapshots); large documents may use substantially more memory including parser/render state. Editing currently runs on the main thread.

Repeat the relevant UI workflows for each substantive fix and append dated outcomes here. Automated passes supplement, rather than replace, hands-on testing.
