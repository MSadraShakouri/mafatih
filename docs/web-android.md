# One web reader, two targets

## Status and boundaries

This is an **in-progress reader**, not the finished experience. It displays the actual table of contents, lazy-loads Arabic/Persian rows in a plain RTL layout, and offers an initial live search of both. Text is inserted as text, explicit instruction kinds are retained, and existing row order is not rewritten. Source content, alignments and permissions are not thereby verified.

The intended header is still to be designed; the eventual design must retain visible search and play/pause controls. A plain, provisional search control exists, but audio, bookmarks, reader settings, automatic scrolling/play-pause, English display/search, font selection, custom branding, and website offline caching are **not implemented**. Native launcher/splash images are Capacitor placeholders.

Persian is the first UI language. English support comes later, with a Persian explanation fallback where a needed English explanation is unavailable; English paragraphs must not be assumed to line up with Arabic rows. The future font choices are Amiri, Noto Naskh Arabic and Scheherazade New. Before bundling any, record the exact version, license and attribution, check rendering, and package the font files rather than depending on a network font service. None is bundled yet.

## Build pipeline

```text
canonical data/ + validation
          │
          ▼
npm run build:data  →  generated/web-data/ (runtime JSON)
          │
npm run stage:web   →  generated/web-public/data/
          │
Vite + web/         →  dist/
                         ├── GitHub Pages artifact
                         └── cap sync android → Android assets → debug APK
```

`data/` remains the only canonical corpus. Node-only builders run before Vite; browser code fetches resolved data, not the Node loaders. Vite's public directory contains runtime data only, not audit reports, SQLite, or editing files. The native project is a thin Capacitor shell, not a second reader, database, search implementation, or settings system. The optional generated SQLite database remains for analysis or a future adapter, not as a parallel source of truth.

`vite.config.ts` uses a relative base and the app uses hash routes, so the same built files work at a site root, a Pages project subdirectory such as `/mafatih/`, and Capacitor's local origin without server-side route rewrites. Browser tests exercise the first two locations with real generated data. The APK packages the web files locally; an APK built with a disposable test key was compared against `dist` byte for byte. Installation and offline operation on an Android device have not yet been verified. A normal website will **not** work reliably offline until an explicit cache/service worker stores all necessary content and fonts and is tested.

## Local development

```bash
npm ci
npm run check                 # types, tests, validation, development build
npm run dev                   # local Vite reader

# Once per Linux environment, install Chromium and its system dependencies:
npx playwright install --with-deps --only-shell chromium
npm run test:browser          # production build at / and /mafatih/
npm run test:apk-assets       # optional Python tests for the APK comparison tool
```

To generate Android assets for a local debug build, install an Android SDK and a JDK, then:

```bash
npm run android:sync          # builds dist first, then copies it into Android
cd android
./gradlew assembleDebug
```

Local debug APKs use the standard debug signing key unless a complete signing environment is provided. With no signing environment, `assembleRelease` produces an unsigned APK; partial signing variables fail. The Android workflow instead uses a stable debug key as described in [signing instructions](android-signing.md). Each tag workflow independently builds `dist/` from the same tagged commit; they do not share or compare a previously tested artifact.

## Search and future shared features

The library and current-item search use one worker and one `src/search.ts` engine. It scans distinct normalized words independently within a TOC title or an individual Arabic/Persian row field, then combines their cached hits locally; any one term is enough. TOC and text share a relevance-ranked list that favors complete words and compact ordered sequences, including a sequence spanning neighboring rows of the same item and language. A bounded cache retains completed and in-progress per-word work across query, language and item changes; safe prefix candidates narrow longer words, and item search examines only that item's records. The TOC arrives first, then generated shards with featured Arabic rows first; provisional results update and may reorder as scanning and batched relevance scoring proceed. Previous results remain visible and explicitly labeled while a replacement is pending. Result highlights cover whole original words, with separate contexts when matched terms are far apart; opening a text result goes to the matched line without leaving a highlight in the reader. Exact offsets in routes are Unicode code points, converted to UTF-16 only at the DOM boundary.

The generated `search-index.json` is version 4 with `nfkd-search-v2` normalization and contains TOC records plus paths for generated text shards under `data/search/`. The worker rejects incompatible older indexes or shards. These files are derived artifacts, not canonical text. The ordinary-space joined-form fallback and adjacent-row sequence ranking both have ambiguity; [search behavior and tests](search-behavior.md) documents them and a local query probe. English documents and paragraphs are not searched in this Persian-first slice; add them later without implying line-aligned translations. Test performance, memory, shaping, and offline behavior on actual Android devices before treating this as final.

- Extend the same search engine for English content later and test on real devices; do not build a second search system.
- A personal bookmark identifies an item/topic; featured stars are separate. Search navigation or reading-position restoration can use precise item, row/paragraph, language and offset anchors. Remember Unicode code point versus browser UTF-16 offsets. The existing 37 English paragraph redirects are not a general split/merge migration system.
- Use one shared settings and scroll implementation. Auto-scroll must stop at the bottom, pause off-screen, let a stationary hold train the speed slower, and preserve accumulated prediction/error and its time basis across checkpoints. Its expected-position ghost advances during a hold but stops and hides on explicit pause. When smart speed is off, show a compact temporary speed control under the header after touch. Add automated tests and accessible non-gesture alternatives.
- Keep Arabic/Persian RTL and future English LTR; do not force line breaks, infer instructions from blank Arabic, or invent translation pairings. Use ordinary responsive CSS for basic wrapping.

## Workflows and publication

The Satr-style `.github/workflows/build-android.yml` builds a fixed-key debug APK, uploads it as an Actions artifact, and creates or updates a GitHub Release when the selected ref is a version tag. `.github/workflows/pages.yml` builds and deploys the website. Both run on `v*` tags, including `v0.*`, and can also be started manually. Ordinary branch pushes and pull requests run neither workflow. The former automatic Verify workflow was removed; test commands remain available locally.

These workflows build independently from the selected commit and do **not** run test suites or `check:publication`. Pushing a version tag can therefore publish both outputs even while the gate fails. Content, permissions and alignments remain unreviewed; a successful build is not publication approval. Review [publishing](publishing.md) and [rights](rights-review.md) before distributing. See [signing and workflow setup](android-signing.md) for the one debug-key secret and Pages environment settings. Actions are pinned to full commit hashes, which should be reviewed and updated periodically.

The Android application ID `com.msadrashakouri.mafatih` is **provisional**. Before distributing anything, check whether an older installation exists and decide the permanent ID and signing key. Updating an existing app normally requires both the same application ID and a compatible signing certificate. The old ID/key were not established by this scaffold; do not assume it can update an older app.

## Related implementations examined

[Satr](https://github.com/MSadraShakouri/satr) illustrates a TypeScript/Vite web UI packaged using Capacitor's `webDir`, with a tracked native shell. The Android workflows in [piecework](https://github.com/MSadraShakouri/piecework) and the Pages workflows in [insight](https://github.com/MSadraShakouri/insight) and [lyric-sync](https://github.com/MSadraShakouri/lyric-sync) show build/deploy patterns. Mafatih follows Satr's fixed debug-key convention, not a production signing policy, and does not copy unrelated native features.
