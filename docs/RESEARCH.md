# Product research

## 2026-09-29 — first maintenance pass

This is a small directional review, not a market survey. Competitor pages were read; competing desktop applications were not installed or benchmarked.

### Competitors

- [PDFgear](https://www.pdfgear.com/): emphasizes free/no-signup editing, conversion, annotation, signing, and OCR across devices. Its page includes a user/reviewer concern about online tools putting merged pages in the wrong order. **Decision:** visible page order, explicit append behavior, and exported-order regression coverage before expanding the feature list.
- [Sejda Desktop](https://www.sejda.com/desktop): offers local processing, organization, and broad editing; free use is limited by task/page/file quotas. **Decision:** no accounts, paywall, or arbitrary daily quotas. The 100 MB preview limit is an explicit technical boundary.
- [Stirling-PDF issue #8243](https://github.com/Stirling-Tools/Stirling-PDF/issues/8243): user reports a broken template download after a domain change and asks for locally bundled assets for airgapped installations. **Decision:** generate the sample locally and serve PDF.js worker/CMaps/fonts/decoders from the app, avoiding runtime CDN dependencies.

### Community signals

- [Hacker News: Free, in-browser PDF editor](https://news.ycombinator.com/item?id=43880962), discovered via [Algolia search](https://hn.algolia.com/api/v1/search?query=pdf%20editor&tags=story&hitsPerPage=4). Discussion has substantial interest in no-signup, browser-local workflows.
- [Comment #43888400](https://news.ycombinator.com/item?id=43888400) specifically suggests offline DevTools mode to verify network behavior; related comments #43887842 and #43887977 discuss offline installation and opt-in updates. **Decision:** verify no external document requests in browser tests and describe privacy precisely. A durable offline PWA remains future work, not a current claim.
- Reddit's r/opensource PDF-editor search returned HTTP 403. No conclusions are drawn from that inaccessible source.

### Priorities inferred

1. Reliable read/edit/download round trips and no silent document replacement after an error.
2. Reversible edits and clear “not downloaded” state.
3. Local processing with no accounts or external runtime services.
4. Readable mixed layouts, accessible controls, and accurate annotation coordinates.
5. Next: fidelity of complex documents, Unicode annotation fonts, form support, continuous reading, and persistent recovery.

Check fresh issue reports and sources on subsequent maintenance passes; do not assume this initial sample represents all users.
