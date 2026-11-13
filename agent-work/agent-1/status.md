# agent-1 status

Round: six-agent AR/FA split, agent 1 (112 assigned items, 4,274 AR/FA field occurrences).
Frozen base: `ffa01da92fbba25731356e8158c295b3824763f0` (preparation revision 2, see `base-history.md`).
Branch in use: `arena/411fca58-mafatih` (the platform-assigned session branch).

## Authored (plan + canonical layout, structurally verified)

53 of 112 items. Each plan has every source occurrence `checked: true`, one kind per
text piece, and a layout whose pieces cover each source field exactly once in order.
All 32 plans were re-verified against the revision-2 base with unchanged fingerprints.

- fazilat-svrhtvhyd, khavas-aymny-dzd, item-asharh-2, item-asharh-4, namaz-vsyt,
  namaz-afv-astghfar, khavas-ayza-tqvyt-hafzh, khavas-hrz-rza-alyh,
  amal-taqybat-mshtrkh, khavas-dvay-tngy-nfs, khavas-pysh-khvab, dua-ya-mn-kbs,
  dua-zhyr, item-slvat-br-hsn-2, amal-aamal-syzdhm-rmzan, item-slvat-br-aly-2,
  item-slvat-br-aly, ziyarat-fzylt-amamzadgan, namaz-hajt, amal-sjdh-mvsy-kazm,
  namaz-nmazhay-ayam-hfth, khavas-rvyt-jhvd-trsa, khavas-ayza-khvas-svr,
  khavas-hrz-hady-alyh, dua-daa-dfa-shr, dua-saat-4, item-rqah-aljyb,
  item-slvat-br-mhmd-2, item-slvat-br-mhmd, namaz-jvad-alyh-alslam, amal-byst-7,
  ziyarat-amyralmvmnyn-alyh-alslam, item-zahrshdn-qbr-an, item-adab-srdab-mthr,
  namaz-grsnh, khavas-zman-ghybt, namaz-zyad-shdn-rvzy, ziyarat-vdaa-an,
  namaz-sahb-alzman-alyh, khavas-hjab-jafr-sadq, item-ayza-rfa-mrz,
  amal-aamal-byst-vykm, dua-hjt-alyh-alslam, item-klam-abn-btvth, dua-shshm-zkr-dv,
  item-namh-yvshya-bn, dua-zman-ajl-allh, amal-fzylt-asfnd, namaz-hdys-nfs,
  namaz-baqr-alyh-alslam, ziyarat-zhra-alyha-alslam, ziyarat-fzylt-hmzh-alyh,
  amal-slvaty-fzylt-bsyary

Recorded issues (14): twelve `mixed-language` — `khavas-aymny-dzd/r00001/fa` (truncated
Quran quotation keeps a Persian connector, so it stays in `fa`), `khavas-rvyt-jhvd-trsa/r00003/fa`
(Arabic dhikr continuation plus Persian explanation in one field; split without joining
rows), `khavas-hrz-hady-alyh/r00001/ar` (Persian heading stored in `ar`; piece moves to
`fa`, original location stays mapped), `ziyarat-amyralmvmnyn-alyh-alslam/r00002/fa` (Arabic
ziyarat stored in `fa` without a Persian counterpart in that row; piece moves to `ar`),
`item-adab-srdab-mthr/r00004/fa` (Arabic prayer fragment inside a Persian instruction) and
`ziyarat-vdaa-an/r00001/fa` (short Arabic farewell phrase inside a Persian instruction),
`amal-aamal-byst-vykm/r00001/ar` and `/r00002/ar` (Persian exposition in the `ar` field with a
short Arabic saying), `item-namh-yvshya-bn/r00002/fa`, `/r00004/fa`, `/r00005/fa` (Arabic
basmala and dhikrs quoted inside Persian reports) and `ziyarat-fzylt-hmzh-alyh/r00003/fa`
(Arabic exclamation leading into a Persian poem) —
plus `ziyarat-amyralmvmnyn-alyh-alslam/r00003/fa` `historical-line-break` (old value had a
physical break that is neither restored nor dropped) and `other` (its single Persian piece
translates both the moved `r00002` Arabic piece and `r00003`; the layout can attach it once).

## Applied to canonical data

All 53 authored items are applied on this branch, with their row-split mappings and
new pooled text values. `npm run validate`, `npm run check:line-breaks` and the full
`npm run check` gate pass on the resulting data (263 tests, 260 pass, 0 fail, 3 skipped).

## Environment

`verify-tool-info` matches: Node `v22.22.3`, ICU `78.2`, Unicode `17.0` and the pinned
source/dependency hashes. Registration binds this agent number to the session branch and
the revision-2 base.
