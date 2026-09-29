# Leafrune security

## Architecture

Leafrune is a static client-side application. It has no backend, account system, telemetry, or upload route. PDF.js parses/renders through a worker; pdf-lib applies edits. Documents and undo snapshots stay in browser memory. Fonts, CMaps, image decoders, and the worker are served from the same origin.

PDF JavaScript actions, attachments, external links, and rich-media actions are not executed by the UI. A CSP blocks external connections, objects, and JavaScript eval; WebAssembly compilation is allowed for bundled image decoders. File input size is capped at 100 MB and canvas pixel counts are bounded. These limits do not make an arbitrary PDF harmless: parsing may still consume significant CPU or memory.

Use synthetic/non-sensitive samples for tests. Use a disposable nested VM for suspicious PDFs, parser exploits, or other risky experiments. Do not run those in the maintainer VM or on the physical server. Keep dependencies current and inspect advisories on each maintenance pass.

## Reporting

Report vulnerabilities through a private repository issue accessible to the maintainers. Do not attach confidential PDFs or credentials. Include version, browser, a minimal synthetic reproduction, and the impact. If direct mail is arranged, include `[astra]` in the subject so it reaches the maintainer.

This repository and its artifacts must remain private under the current owner mission. Do not enable GitHub Pages, public package publishing, or public previews.
