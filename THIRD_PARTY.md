# Third-party software

Leafrune's original code is MIT licensed. Dependencies retain their respective licenses.

| Component | Purpose | License |
| --- | --- | --- |
| [PDF.js / pdfjs-dist](https://github.com/mozilla/pdf.js) | Rendering, text extraction, text-layer geometry | Apache-2.0 |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | PDF creation and modification | MIT |
| [React](https://github.com/facebook/react) | UI | MIT |
| [Lucide](https://github.com/lucide-icons/lucide) | Icons | ISC |
| [Vite](https://github.com/vitejs/vite) | Development/build | MIT |
| [Playwright](https://github.com/microsoft/playwright) | Browser tests | Apache-2.0 |

`src/text-layer.css` adapts PDF.js text-layer geometry and rotation rules (Copyright Mozilla Foundation / PDF.js contributors, Apache License 2.0). It scopes the rules and omits unrelated viewer/editor UI. Upstream license: https://www.apache.org/licenses/LICENSE-2.0

PDF.js bundled font and WASM directories include additional upstream license files. The asset preparation script copies those directories, preserving their notices. The build also includes dependency license texts under `dist/licenses/` for local redistribution review. Consult the lockfile for exact versions and transitive dependencies.
