# One web reader, two targets

## Status and boundaries

This is an **in-progress Persian-first reader and library baseline**, not the finished experience. A home contents entry opens vertically stacked title-only cards on separate screens. The topics are ادعیه، اعمال، زیارات، نمازها و تعقیبات، قرآن، سایر مطالب and the editorial فهرست منتخب. The projection uses imported category metadata and the original TOC hierarchy and titles; unknown/unclassified categories remain reachable under سایر مطالب. This is a **provisional** classification, not a content review or a finalized navigation taxonomy. A local test walks the projection and checks that all 686 current canonical items remain reachable by their original IDs. The selected list uses existing featured IDs and is distinct from the single personal-bookmarks entry at the bottom of home.

The home search field and reader search icon are active. Both start with Arabic text enabled and Persian text disabled; a user can enable Persian. The chosen language filters are shared during the running session and reset on reload. The reader's bookmark and auto-scroll icons remain **placeholders**, and the bookmarks page explicitly says personal bookmarks are not active. Home pull-down-to-search and the search-opening animation are deferred. Audio, English display/search, website offline caching and final long-title treatment are not implemented. Native launcher icons remain Capacitor placeholders.

Text is inserted as text, explicit instruction kinds are retained, and existing row order is not rewritten. Source content, alignments and permissions are not thereby verified. Persian is the first UI language. English support comes later, with a Persian explanation fallback where a needed English explanation is unavailable; English paragraphs must not be assumed to line up with Arabic rows.

## Startup shell

`index.html` contains the real light home, search field and links, styled by the same stylesheet as the running app. The app hydrates the existing field (including anything typed before the module arrived), and clones that same shell on later home visits. The small head script applies a saved theme or system dark preference before paint. An idle home does not fetch the catalog or global-search shards or proactively load a reader font; those start when needed. Android uses a plain theme-matched launch background rather than app-owned splash artwork. Android 12+ may still display its mandatory system launch splash, and the native activity/WebView still have to start; no device startup-time claim is implied.

## Reader typography and position

The 48px reader header has 44px touch targets and locally bundled Lucide icons displayed at 16px. Its bookmark placeholder occupies the old Back position; down-scroll, search and settings are on the physical left. In-app settings Back returns to the reader. Browser Back after a direct item link has an in-app library fallback. On native platforms the Capacitor App plugin's `backButton` event uses app-owned history when available, falls back to an in-app route otherwise, and uses Satr’s five-second double-Back-to-minimize at the library root. Android owns the keyboard Back first; the app does not equate focus with a visible IME. The activity requests adjustResize, as Satr does. This follows the event pattern inspected in Satr; local mocked-bridge browser tests are **not** proof of Android build, WebView, gesture, hardware-Back, or device behavior. Test those on a real device before release.

Arabic source text is rendered bold except numeric Quran end-of-ayah markers, which are normal weight. Arabic/Persian content and the Persian UI display Persian digits; English text is unchanged. This is a one-for-one display conversion and does not rewrite pooled source values. Reader anchors, search highlights and restored positions map across marker spans using the original offsets. Reader settings offer the locally bundled Arabic fonts Scheherazade New (default), Amiri and Noto Naskh Arabic in that order, with Persian names and in-page samples. Independent Arabic, Persian translation and explanation controls start at 100%, with respective baselines of 25.3px, 16.5px and 14.3px. Selecting a row first reveals its sample and enables −/+ without changing its value. Each uses 65 reversible geometric levels from 25% to 400% (32 steps either side of 100%). Automatic, light and dark themes are saved locally. There is no reset button or visible license section. The bundled files, source releases, hashes and licenses are documented in [the font manifest](../web/fonts/README.md); Lucide and Feather notices are in `web/icons/LICENSE-lucide.txt`, and local license files are linked from the built document head. Shaping and legibility still need review on real devices.

An explanation size is applied **only** to rows explicitly marked `instruction` or `note`. The current data has very few such rows, so many Persian-only introductory/explanatory-looking rows still use the translation size; an empty Arabic field is not enough evidence to reclassify them. Instructions have a visible role label without changing the source text. The small display-block layer preserves occurrence order and leaves grouping for reviewed alignment data. Paragraphs justify wrapped text while preserving source breaks and natural final lines.

Preferences are saved to this device/browser's local storage, with an in-memory fallback if storage is blocked; they are not account-synced. Font files load before reading or restoring a search anchor. Returning from settings or changing viewport width/orientation attempts to preserve a visible row/language/code-point position through reflow, including within a long row. This is not persistent last-read history or a migration strategy for future split/merged/retranslated content. Browser zoom and text selection are restricted where web APIs allow; browsers, accessibility settings and native effects can override these restrictions, so they are not a guarantee on every platform.

## Build pipeline

```text
canonical data/ + validation
          │
          ├── Vite dev → resolved runtime data served from memory
          │
          ├── Vite build + web/ → dist/
          │                        ├── GitHub Pages artifact
          │                        └── cap sync android → Android assets → debug APK
          │
          └── npm run build:data → generated/web-data/ (includes search index)
```

`data/` remains the only canonical corpus. The Node-only Vite plugin validates and resolves reader data on the first reader request in development; it builds the heavier library search index only when requested, caches the result in memory, and invalidates it when the source changes. A production build validates and writes the same resolved runtime files directly to `dist/data/`, including the English documents and generated search index and shards. Browser code fetches these files; it does not bundle the Node loaders. Invalid source data fails visibly rather than being silently skipped. `npm run build:data` independently generates the full data and search index under `generated/web-data/` for backend tests and diagnostics; `npm run stage:web` remains an optional standalone staging helper and is not required to run or build the app. The native project is a thin Capacitor shell, not a second reader, database, search implementation, or settings system. The optional generated SQLite database remains for analysis or a future adapter, not as a parallel source of truth.

`vite.config.ts` uses a relative base and the app uses hash routes, so the same built files work at a site root, a Pages project subdirectory such as `/mafatih/`, and Capacitor's local origin without server-side route rewrites. Browser tests exercise the first two locations with real generated data. An APK is intended to package the web files locally. An earlier baseline APK was compared against its then-current `dist`, but the present integration and App plugin have not been built or tested on Android. Installation and offline operation on a device have not yet been verified. A normal website will **not** work reliably offline until an explicit cache/service worker stores all necessary content and fonts and is tested.

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

`src/search.ts` and the shared lazy worker serve home and in-text searches, using separate global and per-item engines; reader searches use their already-loaded item instead of waiting for the full library shards. They use independent OR/subword searches of TOC titles and Arabic/Persian row fields, ranked by distinct query-word count, featured-star status, then relevance. TOC titles are not controlled by text-language filters. A bounded per-word cache, incremental scans and batched ranking allow partial results and reuse between queries. A global text hit uses the original row/language/code-point anchor. An in-text hit scrolls the existing reader and briefly highlights the original substring where the browser supports the CSS Highlight API; it never rewrites reader text.

The selected in-text layout retains the actual bookmark placeholder, a 49px outer header (48px inner row plus border) and the normal search-icon slot. The results panel opens immediately with an empty prompt; counts appear inside it, not duplicated in the header. Previous results remain labelled while new matches stream in, and unchanged rows are reused. Outside taps dismiss the overlay without cancelling the target action; a list icon or the keyboard Search key reopens it, with Search also dismissing the keyboard. The old `web/search-panel.ts` and `tests/deferred/` describe the earlier disconnected UI, not this design. Active root/subpath browser tests cover the new UI; home pull-down remains inactive.

Version-4 `search-index.json` and `search/` shards using `nfkd-search-v2` are generated by both `npm run build:data` and the Vite runtime build. Search data is derived, never canonical. See [search behavior and tests](search-behavior.md) for the 58 approved lam aliases and protections. English search is deferred. Test performance, memory, shaping, offline behavior and native interaction on actual Android devices before treating the overall release as final.

- A personal bookmark identifies an item/topic; featured stars are separate. Search navigation or reading-position restoration can use precise item, row/paragraph, language and offset anchors. Remember Unicode code point versus browser UTF-16 offsets. The existing 37 English paragraph redirects are not a general split/merge migration system.
- Use one shared settings and scroll implementation. Auto-scroll must stop at the bottom, pause off-screen, let a stationary hold train the speed slower, and preserve accumulated prediction/error and its time basis across checkpoints. Its expected-position ghost advances during a hold but stops and hides on explicit pause. When smart speed is off, show a compact temporary speed control under the header after touch. Add automated tests and accessible non-gesture alternatives.
- Keep Arabic/Persian RTL and future English LTR; do not force line breaks, infer instructions from blank Arabic, or invent translation pairings. Use ordinary responsive CSS for basic wrapping.

## Workflows and publication

The Satr-style `.github/workflows/build-android.yml` builds a fixed-key debug APK, uploads it as an Actions artifact, and creates or updates a GitHub Release when the selected ref is a version tag. `.github/workflows/pages.yml` builds and deploys the website. Both run on `v*` tags, including `v0.*`, and can also be started manually. Ordinary branch pushes and pull requests run neither workflow. The former automatic Verify workflow was removed; test commands remain available locally.

These workflows build independently from the selected commit and do **not** run test suites or `check:publication`. Pushing a version tag can therefore publish both outputs even while the gate fails. Content, permissions and alignments remain unreviewed; a successful build is not publication approval. Review [publishing](publishing.md) and [rights](rights-review.md) before distributing. See [signing and workflow setup](android-signing.md) for the one debug-key secret and Pages environment settings. Actions are pinned to full commit hashes, which should be reviewed and updated periodically.

The Android application ID `com.msadrashakouri.mafatih` is **provisional**. Before distributing anything, check whether an older installation exists and decide the permanent ID and signing key. Updating an existing app normally requires both the same application ID and a compatible signing certificate. The old ID/key were not established by this scaffold; do not assume it can update an older app.

## Related implementations examined

[Satr](https://github.com/MSadraShakouri/satr) illustrates a TypeScript/Vite web UI packaged using Capacitor's `webDir`, with a tracked native shell. The Android workflows in [piecework](https://github.com/MSadraShakouri/piecework) and the Pages workflows in [insight](https://github.com/MSadraShakouri/insight) and [lyric-sync](https://github.com/MSadraShakouri/lyric-sync) show build/deploy patterns. Mafatih follows Satr's fixed debug-key convention, not a production signing policy, and does not copy unrelated native features.
