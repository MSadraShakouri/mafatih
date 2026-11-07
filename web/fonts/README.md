# Bundled fonts

These are **unmodified** files from the official releases. Each is distributed under the SIL Open Font License 1.1; the exact copyright and license notices accompany the files in `licenses/`. Reserved Font Names, where applicable, remain in the original notice. The built distribution emits local license files and links to them using `rel="license"` in the document head, without displaying them in the reader/settings UI. The app does not load the fonts from a CDN. Git treats the notice files as binary patches solely to preserve upstream line endings and whitespace; they remain readable text.

| Font | Official release | Archive path | SHA-256 of bundled file |
| --- | --- | --- | --- |
| Amiri Regular 1.002 | https://github.com/aliftype/amiri/releases/tag/1.002 | `Amiri-1.002/Amiri-Regular.ttf` | `ab391c4147d054c48976e98322ad0eefe1427aa0e0502a12a4c75d80a70cfcd7` |
| Noto Naskh Arabic Regular 2.021 | https://github.com/notofonts/arabic/releases/tag/NotoNaskhArabic-v2.021 | `NotoNaskhArabic/full/ttf/NotoNaskhArabic-Regular.ttf` | `c9a039ce48a477243c1eb7d561b13de115cfd651d8a83fa42e2f4d63c2e11b00` |
| Scheherazade New Regular 4.500 | https://github.com/silnrsi/font-scheherazade/releases/tag/v4.500 | `ScheherazadeNew-4.500/ScheherazadeNew-Regular.ttf` | `794bac8dc9e83d1d620bc471ea694f5f31d0965ce8006490a79dfc51a2d283b3` |
| Vazirmatn variable 33.003 (Persian interface/translation) | https://github.com/rastikerdar/vazirmatn/releases/tag/v33.003 | `fonts/webfonts/Vazirmatn[wght].woff2` | `4e3fa217d38fdafc1fea4414ceb58ca5e662cf0ab5fa735a8c8c20e8b42cad92` |

A character-coverage scan of the current non-audio Arabic/Persian row text found no missing characters whose Unicode names begin with `ARABIC` in the three Arabic reader fonts. This does not prove satisfactory shaping or readability, nor does it cover every interface/title character or certify Vazirmatn. Font fallback remains available. The Android app can package these local assets; a website needs a separate offline cache/service worker before it can promise offline operation.
