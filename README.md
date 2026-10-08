# Leafrune

[Open the web app](https://greatoss.github.io/pdf-astra/)

**Your PDF, thoughtfully handled.** A local-first PDF workspace focused on clear reading, reversible changes, and dependable exports.

Leafrune is an early **0.1.0 preview**, maintained in [GreatOSS/pdf-astra](https://github.com/GreatOSS/pdf-astra). The repository is public, and the web app is deployed on GitHub Pages. Source is MIT-licensed.

## What works today

- Open or drop a PDF, or try the built-in three-page sample.
- Read portrait, landscape, rotated, and cropped pages; fit the entire page or its width, and zoom relative to the current view.
- Select/copy text and find matching pages.
- Add Latin text and translucent area highlights.
- Rotate, move, delete, extract, and append pages from another PDF.
- Undo and redo up to 20 edits, with a soft 128 MB history budget.
- Download a new PDF without overwriting the original.
- Keyboard navigation, labeled controls, responsive layout, and reduced-motion support.

PDF parsing, rendering, editing, and search run in your browser. There is no upload endpoint, analytics, third-party font service, or account system. PDF.js workers, fonts, CMaps, and image decoders are served locally. Documents are held in memory and cleared when the page closes or reloads. **Download to keep changes.** A local server is required; this is not yet an installable offline PWA.

## Run locally

Requires **Node.js 22.13+** (Node 22 LTS recommended) and npm.

```sh
npm ci
npm run dev
```

Open the printed localhost URL (normally `http://127.0.0.1:5173`). The development server binds to loopback. `npm run build` produces a local `dist/`; `npm run preview` serves it on loopback, normally port 4173. Do not deploy publicly under the current maintenance mission.

```sh
npm test                    # PDF edit/serialization tests
npx playwright install chromium
npm run test:e2e            # Browser workflows and layout geometry
npm run build              # Type checking and production build
npm audit
```

On a minimal Linux installation, Playwright may require OS libraries. Install those through your normal environment administrator; the maintainer agent does not have sudo.

## Preview boundaries

The UI describes these limitations rather than presenting unfinished features as working:

- Maximum input size: 100 MB. Very long/complex documents still need performance work.
- Encrypted/password-protected PDFs are not supported.
- Interactive AcroForms open read-only; merging/extracting their fields is blocked.
- New text uses Helvetica's Latin character repertoire. Unsupported characters produce an error, leaving the document intact.
- Highlights and new text become page content on export, not editable annotation objects. They are **not redaction**.
- Existing-text editing, OCR, form filling, signatures, links/bookmarks navigation, printing UI, and durable autosave are not implemented.
- Editing signed PDFs invalidates cryptographic signatures. Reordering/deleting/merging may affect bookmarks, internal destinations, and accessibility tags. Preservation across these complex structures is not yet guaranteed.
- No claims of PDF/A compliance, complete accessibility, or exhaustive browser compatibility. Chromium has been tested; Firefox/WebKit and assistive technologies remain on the validation roadmap.

## Project guide

- [`docs/NAME.md`](docs/NAME.md): name selection, conflict checks, and compatibility decisions.
- [`docs/RESEARCH.md`](docs/RESEARCH.md): competitor and user-needs research.
- [`docs/TESTING.md`](docs/TESTING.md): actual hands-on checks, fixes, and gaps.
- [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md): ongoing triage and quality workflow.
- [`CHANGELOG.md`](CHANGELOG.md): release notes.
- [`SECURITY.md`](SECURITY.md): architecture and reporting.
- [`THIRD_PARTY.md`](THIRD_PARTY.md): dependencies and attribution.

The landing screen is the current product website, served with the application. Product/display/package naming is **Leafrune** / `leafrune`; the existing repository URL `GreatOSS/pdf-astra` remains stable.

## GitHub Pages

Pushes to `main` run tests and build the app for `/pdf-astra/`, then deploy `dist/` with GitHub Actions. The workflow can also be started manually. PDF documents continue to be processed locally in the browser.
