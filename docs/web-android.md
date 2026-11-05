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
Vite + web/         →  dist/  (one tested web build)
                         ├── GitHub Pages artifact
                         └── cap sync android → Android assets → signed APK
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

Debug APKs use the standard debug signing key and are not release APKs. With no release signing environment, `assembleRelease` produces an unsigned APK; with only some signing variables it fails. For distribution, use the manual workflow and [signing instructions](android-signing.md). The workflow deliberately downloads the already-tested `dist` and runs `npx cap sync android` **without rebuilding it**.

## Search and future shared features

The library and current-item search use one worker and one `src/search.ts` engine. It scans distinct normalized words independently within a TOC title or an individual Arabic/Persian row field. TOC results appear above text; within each section matched-word count comes first, followed by featured stars, Arabic, direct normalized matches, and original order. A bounded cache retains completed and in-progress per-word work across query, language and item changes. The TOC arrives first, then generated shards with featured Arabic rows first; partial results update as scanning proceeds. Result highlights cover whole original words, with separate contexts when matched terms are far apart; opening a text result goes to the matched line without leaving a highlight in the reader. Exact offsets in routes are Unicode code points, converted to UTF-16 only at the DOM boundary.

The generated `search-index.json` is version 3 with `nfkd-search-v2` normalization and contains TOC records plus paths for generated text shards under `data/search/`. These files are derived artifacts, not canonical text. The ordinary-space joined-form fallback is deliberately narrower than the former blanket compaction, but still has ambiguity; [search behavior and tests](search-behavior.md) documents it and a local query probe. English documents and paragraphs are not searched in this Persian-first slice; add them later without implying line-aligned translations. Test performance, memory, shaping, and offline behavior on actual Android devices before treating this as final.

- Extend the same search engine for English content later and test on real devices; do not build a second search system.
- A personal bookmark identifies an item/topic; featured stars are separate. Search navigation or reading-position restoration can use precise item, row/paragraph, language and offset anchors. Remember Unicode code point versus browser UTF-16 offsets. The existing 37 English paragraph redirects are not a general split/merge migration system.
- Use one shared settings and scroll implementation. Auto-scroll must stop at the bottom, pause off-screen, let a stationary hold train the speed slower, and preserve accumulated prediction/error and its time basis across checkpoints. Its expected-position ghost advances during a hold but stops and hides on explicit pause. When smart speed is off, show a compact temporary speed control under the header after touch. Add automated tests and accessible non-gesture alternatives.
- Keep Arabic/Persian RTL and future English LTR; do not force line breaks, infer instructions from blank Arabic, or invent translation pairings. Use ordinary responsive CSS for basic wrapping.

## Workflows and publication

`.github/workflows/verify.yml` automatically runs development checks and browser tests without uploading or distributing an artifact. `.github/workflows/distribute.yml` is manual, restricted to `main`, and runs the existing `check:publication` gate **before any artifact upload, APK signing, or Pages deployment**. It currently fails until the required rights, sources and reviews are documented. Passing it is not legal certification.

After that gate passes, one uploaded `dist` feeds both optional downstream jobs: the APK job signs and compares its packaged files against that build; the Pages job deploys the same downloaded files only when explicitly selected. Both release jobs are manual, and no GitHub Release or tag is created. See [signing and workflow setup](android-signing.md) before enabling them. Actions are pinned to full commit hashes, which should be reviewed and updated periodically.

The Android application ID `com.msadrashakouri.mafatih` is **provisional**. Before distributing anything, check whether an older installation exists and decide the permanent ID and signing key. Updating an existing app normally requires both the same application ID and a compatible signing certificate. The old ID/key were not established by this scaffold; do not assume it can update an older app.

## Related implementations examined

[Satr](https://github.com/MSadraShakouri/satr) illustrates a TypeScript/Vite web UI packaged using Capacitor's `webDir`, with a tracked native shell. The Android workflows in [piecework](https://github.com/MSadraShakouri/piecework) and the Pages workflows in [insight](https://github.com/MSadraShakouri/insight) and [lyric-sync](https://github.com/MSadraShakouri/lyric-sync) show useful build/deploy patterns. This starter keeps the shared-web principle, but does not copy fixed public passwords or unrelated native features.
