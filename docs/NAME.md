# Product name: Leafrune

Decision date: **2026-09-29**.

**Leafrune** combines a leaf/page with a rune/mark. It is short, pronounceable ("leaf-roon"), and suited to both reading and annotation without implying a cloud service or AI dependency. Use **Leafrune** in prose and display names, and `leafrune` for the package and filename suffix.

## Checks performed before choosing

| Check | Result observed |
| --- | --- |
| Bing exact-name web search: `"Leafrune"` | "There are no results". |
| GitHub repository search: `gh search repos leafrune --limit 10 --json fullName,description` | Empty result array. |
| npm registry: `npm search leafrune --json` | Empty result array. npm is the directly relevant registry for this TypeScript application. |
| PyPI exact package endpoint: `https://pypi.org/pypi/leafrune/json` | HTTP 404; secondary ecosystem check. |
| Existing PDF products reviewed | PDFgear, Sejda, Stirling-PDF; community search also surfaced BreezePDF, SimPDF, PEP, and Firefox's PDF editor. None uses Leafrune. |

Earlier candidate **Folivra** was rejected: an initial quoted GitHub query returned no results, but the broader `gh search repos folivra` returned `ozdenkayra01-web/folivra`. This is why an empty exact query alone was not used to decide. Google searches returned only a fallback/interstitial, not usable results; they are not counted as evidence of availability.

These are checks for **obvious naming conflicts**, not a trademark clearance, domain reservation, or guarantee about future registry availability. No package or domain was registered or published.

## Consistency and compatibility

Applied to the application header, guide, sample PDF, exported PDF producer and filenames, HTML title/description/favicon, package name/description, README, release notes, and repository description. The app landing page doubles as its local website.

The repository was empty except for its initialization commit. There were no existing package names, APIs, persisted file formats, releases, or product UI to migrate. Keep `https://github.com/GreatOSS/pdf-astra` unchanged for repository compatibility. `"private": true` prevents accidental npm publishing.
