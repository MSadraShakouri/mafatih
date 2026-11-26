# Consolidated Agent 4 findings pass and review inventory

Frozen base `ffa01da92fbba25731356e8158c295b3824763f0`; Agent 5 peer tip `2f96f55fb869be7acfd02e61fd57dbb80cd802cb`. The author changes since `211030da342c75b7de26d657d71af727893568dc` affect 59 items. These changes remain unreviewed, not complete. The earlier four-item isolated snapshot `38eada3411fcf723acb832e5fde40c91603e7d3a` also awaits consolidated review. No candidate migration or register rebinding was performed.

## Guarded continuation operations

Each row below was checked by formal `merge-preview` and `merge-rows`, including exact old-field and alias-slice verification. Offsets are Unicode code points and mark independently **proposed** U+0020 separators. Each grouping, space and historical link requires independent review. Claims and variants remain source reports, not verified facts.

| Item | Earlier rows | Result | U+0020 offsets | Commit |
| --- | --- | --- | --- | --- |
| `dua-rsvl-s-aman` | `r00001-saa3ec3f116259495` → `r00002-s0b1d6d51987de706` | `m4d131af35395796d404f88a6` | fa 82 | `12cde6d872e62c01a0ff022d4b8885d5d2962de9` |
| `monajat-mnajat-sfr` | `r00001-s36a52eb1dedee746` → `r00002-se78f6df715196b3d` | `m055aef95b60e2d4231233a63` | ar 23, fa 8 | `50c1c699048ceadae62ecf2c47b62fae9322c26a` |
| `amal-fzylt-shaban` | `r00001-sd0076416ed435839` → `r00002` | `m482588e2d649f7d3f9e7c2f3` | fa 692 | `54ef213c77de616e790539ef4c7ba8025ac380b5` |
| `amal-fzylt-shaban` | `r00005` → `r00006-s6b2b0ff07b4b8ae2` | `m5a58a6a3120d8e333bb01a13` | fa 165 | `54ef213c77de616e790539ef4c7ba8025ac380b5` |
| `amal-tkbyrat` | `r00001` → `r00002` | `m0e01b021fbc5169e6aecf901` | fa 538 | `4abc261269c1971148e69aa1dfdaf45a7ca63096` |
| `amal-tkbyrat` | `r00005-s93affcc5f3ac5677` → `r00006` | `m47357f56b7327a5c2f8e755d` | ar 113, fa 113 | `4abc261269c1971148e69aa1dfdaf45a7ca63096` |
| `namaz-fzylt` | `r00001-sd0076416ed435839` → `r00002` | `mdde319a5f530b82e81e2f297` | fa 300 | `03eb2ff89cfc5a1cb90ec6a5f32d2ac53cd4d7d2` |
| `namaz-fzylt` | `r00005` → `r00006-s6b2b0ff07b4b8ae2` | `m5ca080d369fad4980c2d88d6` | fa 583 | `03eb2ff89cfc5a1cb90ec6a5f32d2ac53cd4d7d2` |
| `namaz-fzylt` | `r00006-saa9b9be4b3d5606d` → `r00007` | `m2435feb219a57e8ba0fd9bfa` | fa 363 | `03eb2ff89cfc5a1cb90ec6a5f32d2ac53cd4d7d2` |
| `khavas-adab-aqyqh` | `r00001` → `r00002-s16b235f3fb54b1a5` | `m94ba4a22e49aa63686a85872` | fa 311 | `0e78291459f021856d0580321b777d293506eb4b` |
| `khavas-adab-aqyqh` | `r00002-s7912db66cde98eb8` → `r00003-s1828851db03b603e` | `me09bef69254fbafb6f38a84d` | fa 628 | `0e78291459f021856d0580321b777d293506eb4b` |
| `khavas-adab-aqyqh` | `r00003-s1b27bb8c75bc48e1` → `r00004-saabe6c8229b130ea` | `m9ba9e551340dc7ae8f86817a` | fa 711 | `0e78291459f021856d0580321b777d293506eb4b` |
| `khavas-adab-aqyqh` | `r00004-s6781612fc75b6e23` → `r00005-s27c9c493bd8f7f6a` | `m77b65d8216bf37d4ea42d546` | fa 500 | `0e78291459f021856d0580321b777d293506eb4b` |
| `amal-fzylt-msjd-kvfh` | `r00002-s7912db66cde98eb8` → `r00003-s1828851db03b603e` | `m4181a00203cbc3c01cc784df` | fa 150 | `aad5139cbd1c1ef16b80acc276d464a53b4072f5` |
| `amal-fzylt-msjd-kvfh` | `r00003-s2fd8d78ba1da248f` → `r00004` | `mde48436c2798e02702533601` | fa 500 | `aad5139cbd1c1ef16b80acc276d464a53b4072f5` |
| `amal-tarykh-fzylt-msjd` | `r00001` → `r00002-s16b235f3fb54b1a5` | `mc1737be91401e2988d089de9` | fa 519 | `0efa50563af7ac263655942f1484af72b7c79c77` |
| `amal-tarykh-fzylt-msjd` | `r00002-se090ec1c15d74b91` → `r00003` | `m5172e887322c8aa14428f8fc` | fa 426 | `0efa50563af7ac263655942f1484af72b7c79c77` |
| `amal-tarykh-fzylt-msjd` | `r00007` → `r00008-s88eba61461dcd450` | `m1059576f0223686b05504b51` | fa 203 | `0efa50563af7ac263655942f1484af72b7c79c77` |
| `amal-tarykh-fzylt-msjd` | `r00008-sb553e7372366eba9` → `r00009` | `me17e7ff07f7c0ccfe0d7029f` | fa 520 | `0efa50563af7ac263655942f1484af72b7c79c77` |
| `amal-nymh-shaban` | `r00002-s7912db66cde98eb8` → `r00003-s1828851db03b603e` | `m50c851b78f8599b75cd95c6d` | fa 145 | `3e48691f23a4c3f255fefffd20f664a2d32ecd74` |
| `amal-fzylt-taqyb` | `r00003-s1b27bb8c75bc48e1` → `r00004-saabe6c8229b130ea` | `m690d48deaeb308ec25fb618d` | fa 132 | `3403e4952587e40805ff92595e2b40e9d33ba44b` |
| `khavas-kfn-myt` | `r00001` → `r00002` | `m99480f5973842d6f9a286b72` | fa 383 | `1db9359343faec947e369679b85b8cd412edbd2a` |
| `ziyarat-shykh-klyny-alrhmh` | `r00001` → `r00002` | `m668e1fb5d563d3053b4e454a` | fa 298 | `6f0dc5123166b1a8e4ef331bb776ce258fbd8299` |
| `item-jrb-dml-qvba` | `r00003-s97dcb687a6c9f782` → `r00004` | `m87fa2dacb8c033f96a7295ba` | ar 89, fa 69 | `99b44a7b8795c37197370265a3ce387064bc03f9` |
| `namaz-hdyh-masvmyn-alyhma` | `r00001` → `r00002` | `m266fd624fe4e1d54440c5636` | fa 384 | `89e9724a26fb4017dffa30e50ad6aa8e866afd35` |
| `ziyarat-amamzadh-hmzh-alyh` | `r00001` → `r00002-s16b235f3fb54b1a5` | `m3cf282c8466f123175491312` | fa 52 | `17b154a7a265fdccd3a939d7d0260e910ece4902` |
| `dua-srya-alajabh-2` | `r00002` → `r00003` | `m8eca57bde580dc3714efd88d` | ar 816, fa 682 | `8fec0a12e504914f1fdf99ca5516abd464d11f80` |
| `dua-srya-alajabh-2` | `r00006` → `r00007` | `mf72bed0e42d0c6d9fb9c1896` | ar 644, fa 448 | `8fec0a12e504914f1fdf99ca5516abd464d11f80` |
| `dua-srya-alajabh-2` | `r00008` → `r00009` | `meebe010e72ce12260b2d1fd3` | ar 709, fa 627 | `8fec0a12e504914f1fdf99ca5516abd464d11f80` |
| `dua-srya-alajabh-2` | `r00018` → `r00019` | `mca5d645fc058665e9b8f18da` | ar 249, fa 271 | `8fec0a12e504914f1fdf99ca5516abd464d11f80` |
| `namaz-ayd-ghdyr` | `r00002` → `r00003` | `m7ae642055fed0a4d3e068edc` | ar 730, fa 635 | `8f9800760349806a6cdfe702c45b91249c4a15e1` |
| `namaz-ayd-ghdyr` | `r00004` → `r00005` | `m588ced7288515178980e40f3` | ar 805, fa 721 | `8f9800760349806a6cdfe702c45b91249c4a15e1` |
| `namaz-ayd-ghdyr` | `r00014` → `r00015` | `m1684a37321b898112d27464b` | ar 839, fa 648 | `8f9800760349806a6cdfe702c45b91249c4a15e1` |
| `namaz-ayd-ghdyr` | `r00016` → `r00017` | `m319aecebadfb20c165c0641d` | ar 281, fa 234 | `8f9800760349806a6cdfe702c45b91249c4a15e1` |
| `namaz-ayd-ghdyr` | `r00021` → `r00022` | `mdf7bbb26b43d040505ba61b3` | ar 145, fa 159 | `8f9800760349806a6cdfe702c45b91249c4a15e1` |
| `namaz-ayd-ghdyr` | `r00025` → `r00026` | `md960dde2b08b003765dbae99` | fa 636 | `8f9800760349806a6cdfe702c45b91249c4a15e1` |
| `ziyarat-abas-alyh-alslam` | `r00006` → `r00007` | `m28f92b13004742863c4ce6d4` | ar 267, fa 141 | `bd253c95371493ec002e37f56999e8766618eba6` |
| `ziyarat-abas-alyh-alslam` | `r00008` → `r00009` | `m3481f36ab523eb973e270ef8` | ar 627, fa 515 | `bd253c95371493ec002e37f56999e8766618eba6` |
| `ziyarat-abas-alyh-alslam` | `r00014` → `r00015` | `m9848d4a35d5422a3fd882c47` | ar 202, fa 171 | `bd253c95371493ec002e37f56999e8766618eba6` |
| `ziyarat-abas-alyh-alslam` | `r00016-s8439aeaccefac974` → `r00017` | `mad54beaf24920751632542ee` | ar 272, fa 215 | `bd253c95371493ec002e37f56999e8766618eba6` |
| `ziyarat-mkhts-mhmd-tqy` | `r00002` → `r00003` | `meb957fca231fab23ad12ed36` | ar 391, fa 251 | `7841c0e1421fcfcedbe3bb89ad94bb4d1505d839` |
| `ziyarat-mkhts-mhmd-tqy` | `r00010` → `r00011` | `m5aa79d9ab397a2903ed37633` | ar 996, fa 571 | `7841c0e1421fcfcedbe3bb89ad94bb4d1505d839` |
| `ziyarat-mkhts-mhmd-tqy` | `r00012-scce7b1135e7d7ce0` → `r00013` | `m2d80b9c8499059abdb10aab5` | ar 451, fa 299 | `7841c0e1421fcfcedbe3bb89ad94bb4d1505d839` |
| `ziyarat-pnjm-an-ayd` | `r00007-sbd47d389958800f8` → `r00008` | `mfc9d394bcba215a16abcd56f` | ar 14 | `b6d165d2fd0ea07b4dc4a26bfac7961329c58ea2` |
| `ziyarat-pnjm-an-ayd` | `r00010` → `r00011` | `mb060024859b5fe906998f215` | ar 581, fa 387 | `b6d165d2fd0ea07b4dc4a26bfac7961329c58ea2` |
| `ziyarat-pnjm-an-ayd` | `r00013` → `r00014` | `mb82faafac304a1951e8fef54` | ar 703, fa 535 | `b6d165d2fd0ea07b4dc4a26bfac7961329c58ea2` |
| `ziyarat-pnjm-an-ayd` | `r00017` → `r00018-s4322d97801b3ff23` | `m107ecc8601a65065b50f690a` | fa 6 | `b6d165d2fd0ea07b4dc4a26bfac7961329c58ea2` |
| `ziyarat-pnjm-an-ayd` | `r00019-s2a227bae9469067c` → `r00020` | `m82c06b043aa21584d3f484ef` | ar 256, fa 192 | `b6d165d2fd0ea07b4dc4a26bfac7961329c58ea2` |
| `ziyarat-pnjm-an-ayd` | `r00021-sb1806a51a3722a14` → `r00022` | `mb8a6402de692454830d5d991` | ar 10 | `b6d165d2fd0ea07b4dc4a26bfac7961329c58ea2` |
| `ziyarat-pnjm-an-ayd` | `r00028` → `r00029` | `md7aed931bd16783548350d75` | ar 336, fa 271 | `b6d165d2fd0ea07b4dc4a26bfac7961329c58ea2` |
| `ziyarat-rsvl-sly-allh-2` | `r00004` → `r00005` | `m0ec22c534e4a8243f7274b12` | ar 636, fa 386 | `442ceabc13b5d6334e177f95ce6a0290da4c4a93` |
| `ziyarat-rsvl-sly-allh-2` | `r00007` → `r00008` | `me86de8c3c323614fe02e4085` | ar 726, fa 628 | `442ceabc13b5d6334e177f95ce6a0290da4c4a93` |
| `ziyarat-rsvl-sly-allh-2` | `r00009-s94f3428995dfd8af` → `r00010` | `m23da3f58f407c8833d0249b7` | ar 309, fa 219 | `442ceabc13b5d6334e177f95ce6a0290da4c4a93` |
| `ziyarat-rsvl-sly-allh-2` | `r00011` → `r00012` | `m9ca85fd82373f837d310f9a2` | ar 594, fa 476 | `442ceabc13b5d6334e177f95ce6a0290da4c4a93` |
| `ziyarat-rsvl-sly-allh-2` | `r00013` → `r00014` | `m895bf80c8b2667b3595ff9da` | ar 902, fa 805 | `442ceabc13b5d6334e177f95ce6a0290da4c4a93` |
| `ziyarat-rsvl-sly-allh-2` | `r00015-s81f1199c2466c644` → `r00016` | `m281ce4b4178f3c9c97ad3c39` | ar 785, fa 687 | `442ceabc13b5d6334e177f95ce6a0290da4c4a93` |
| `ziyarat-rsvl-sly-allh-2` | `r00018` → `r00019` | `m6fe99b660a4a66a9aaa7605e` | ar 272, fa 258 | `442ceabc13b5d6334e177f95ce6a0290da4c4a93` |
| `ziyarat-rsvl-sly-allh-2` | `r00020` → `r00021` | `m547ccd09a529716394e10345` | ar 511, fa 437 | `442ceabc13b5d6334e177f95ce6a0290da4c4a93` |
| `ziyarat-rsvl-sly-allh-2` | `r00023` → `r00024` | `m258ff04624c50d3afc3f7e30` | ar 548, fa 371 | `442ceabc13b5d6334e177f95ce6a0290da4c4a93` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00004-se656eb44999bf14d` → `r00005` | `m21efdcc1e06682932bf556ec` | ar 42, fa 44 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00008-s4726693f173a10fd` → `r00009` | `mdb311ce673bc744b1411ae57` | ar 298, fa 257 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00013` → `r00014` | `me045619af27dbf9068cc8306` | ar 763, fa 590 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00017-s18f0993006f44169` → `r00018` | `m7ecdc07c9a2e90b4b4a7667f` | ar 255, fa 178 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00019` → `r00020` | `m1aac58befceb2702e8567b52` | ar 450, fa 331 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00022-sf075bf57489fa6f3` → `r00023` | `m58291c8acf15ea51c3d86f70` | ar 305, fa 183 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00024` → `r00025` | `m3ce474b02f47d8c0beb2ed47` | ar 647, fa 559 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00026-sb0bf64cdb72daaec` → `r00027` | `mba63b2e77eef6997cecf9513` | ar 371, fa 344 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00028` → `r00029` | `m0a88d2e516777497367d22b0` | ar 625, fa 458 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00030-sf908733d811d4379` → `r00031` | `maffe5df90b12b1b6f333b457` | ar 674, fa 422 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00033` → `r00034-sc677689db9f1656c` | `m15cc67584481d82d9390f903` | fa 2 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00036` → `r00037` | `m6b20301aa8dfba793a019055` | ar 174, fa 105 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | `r00041-s7207e2a91378de76` → `r00042` | `m3b8ca6c8c073fa0acc4c913a` | ar 178, fa 170 | `47e437e6d3bd5c64cb2956a68cc91e0dcf1212f4` |
| `ziyarat-warith` | `r00005` → `r00006` | `m88a925b38c190fad462ee2e0` | ar 97, fa 86 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00029` → `r00030-sda0e2b38f6c307a6` | `m0b9a352c88caa2e93bc40efa` | ar 69, fa 40 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00053-seb517417eb3bc12e` → `r00054` | `m690d99af88f2f2a884936dd9` | ar 19 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00074` → `r00075` | `m93c71bdbe2749f05532d8ffb` | ar 74, fa 55 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00077` → `r00078` | `m5a67fd7497d817aefed3959e` | ar 43, fa 37 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00084` → `r00085` | `mfd2e84b33f14ac33c2feb0ec` | ar 63, fa 52 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00090` → `r00091` | `m33c590acd1446234cc144961` | ar 23, fa 10 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00093` → `r00094` | `m0ad4665df572fd7bbd1f7885` | ar 20, fa 6 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00098` → `r00099` | `mf9c7a2883cc83dd346b8fa80` | ar 106, fa 50 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00105` → `r00106` | `me84a895753305791d0946c64` | ar 37, fa 29 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00115` → `r00116` | `m0f6dac68957176f45ed3b2db` | ar 106, fa 76 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `ziyarat-warith` | `r00133` → `r00134` | `m792224ccc9c602c76cd851d7` | ar 36, fa 43 | `312415668d8f0f2c8389b6d2654f02ff63b4bfcc` |
| `item-abvhmzh-smaly` | `r00071` → `r00072` | `m18d57f27ae69339905a042ea` | ar 116, fa 118 | `066b5d8c83562e432160eb0bd6a04bf8688d8c22` |
| `item-abvhmzh-smaly` | `r00096` → `r00097` | `mece70e7f8b811c85e6265479` | ar 144, fa 145 | `066b5d8c83562e432160eb0bd6a04bf8688d8c22` |
| `item-abvhmzh-smaly` | `r00140` → `r00141` | `mdd36d92c64f6f2415889480d` | ar 213, fa 169 | `066b5d8c83562e432160eb0bd6a04bf8688d8c22` |
| `item-abvhmzh-smaly` | `r00158` → `r00159` | `m097f71ac454258abb77ddc43` | ar 182, fa 168 | `066b5d8c83562e432160eb0bd6a04bf8688d8c22` |
| `item-fvayd-adab-trbt` | `r00001` → `r00002` | `mbafbd05852684ab638e0f5d3` | fa 806 | `71e3e0a5b77bd0689905d6b2002e9a62e28a85b5` |
| `item-fvayd-adab-trbt` | `r00006` → `r00007` | `m39394f73908a8668b0dd366c` | ar 93, fa 75 | `71e3e0a5b77bd0689905d6b2002e9a62e28a85b5` |
| `item-fvayd-adab-trbt` | `r00010` → `r00011` | `me7336d82c326869067d2554e` | fa 371 | `71e3e0a5b77bd0689905d6b2002e9a62e28a85b5` |
| `item-fvayd-adab-trbt` | `r00020` → `r00021` | `m086e0f82033b603d435d7520` | ar 226, fa 195 | `71e3e0a5b77bd0689905d6b2002e9a62e28a85b5` |
| `item-fvayd-adab-trbt` | `r00022-sf075bf57489fa6f3` → `r00023` | `m42789a76c94404fb459acdd2` | ar 237, fa 132 | `71e3e0a5b77bd0689905d6b2002e9a62e28a85b5` |
| `item-fvayd-adab-trbt` | `r00026` → `r00027` | `m483cf52cd657d6e3222fec08` | fa 166 | `71e3e0a5b77bd0689905d6b2002e9a62e28a85b5` |
| `item-fvayd-adab-trbt` | `r00028` → `r00029` | `mf2793ffcafebadab4e2fef49` | fa 829 | `71e3e0a5b77bd0689905d6b2002e9a62e28a85b5` |
| `dua-mashlul` | `r00225` → `r00226` | `m2923fad8220c9d2b9477fcb8` | ar 118, fa 78 | `cc85e426e319b24618e3295148d3f543a29132ca` |
| `dua-mashlul` | `r00229` → `r00230` | `m93eab3073534f5eae8aa3430` | ar 37, fa 42 | `cc85e426e319b24618e3295148d3f543a29132ca` |
| `sura-rahman` | `r00035` → `r00036` | `mc8ad20a5adb286891fd40b3c` | ar 34, fa 17 | `191cf1e97bba6f8d9daa3ae8e3aaa8cf735ea430` |
| `sura-rahman` | `r00057` → `r00058` | `m6a6f07215d5c3ac28568954f` | ar 12 | `191cf1e97bba6f8d9daa3ae8e3aaa8cf735ea430` |
| `namaz-qzay-dyn-kfayt` | `r00001` → `r00002` | `m5f1f4a4f88177d1e5c97042d` | fa 217 | `0bfd33903f03c6567c325a08d36a2b49226557dd` |
| `namaz-qzay-dyn-kfayt` | `r00004-sc95e4eb4083f3e93` → `r00005` | `md682244d17df096525ebb021` | fa 53 | `0bfd33903f03c6567c325a08d36a2b49226557dd` |
| `ziyarat-pnjm-an-ayd` | `r00001` → `r00002` | `ma55305311756a8befca02a96` | fa 133 | `f4488179af265a76479f5390a2141ff9869c6b36` |
| `amal-fzylt-aamal-mbahlh` | `r00008` → `r00009` | `md8e06d1e315070eb19d036d6` | ar 392, fa 363 | `8c79a48ffbe9d8b217a331bb1ef9d340cda48b74` |
| `amal-fzylt-aamal-mbahlh` | `r00011` → `r00012` | `mb0ca2ed92eb8480de1dbe477` | ar 627, fa 619 | `8c79a48ffbe9d8b217a331bb1ef9d340cda48b74` |
| `amal-fzylt-aamal-mbahlh` | `r00013` → `r00014` | `m7a347fd487d949419b3b6810` | ar 1127, fa 851 | `8c79a48ffbe9d8b217a331bb1ef9d340cda48b74` |
| `amal-fzylt-aamal-mbahlh` | `r00015` → `r00016` | `m0ec25d03a46b7c21faf4a0f3` | ar 568, fa 460 | `8c79a48ffbe9d8b217a331bb1ef9d340cda48b74` |
| `amal-aamal-sy-am` | `r00001-sbec4b2d569e949d9` → `r00002` | `md92fb4be3f2e22abd57eff93` | ar 118 | `4e4ceede46c5e03aafb3c3559777b7698456f50f` |
| `amal-aamal-vrvz-ayd` | `r00002-s7912db66cde98eb8` → `r00003-s1828851db03b603e` | `m6451383a2a6df9f160f7fc4b` | fa 48 | `5f4aebae95d621a37318d4012c19b29666b56a5c` |
| `amal-aamal-vrvz-ayd` | `r00004` → `r00005-saba56576a8f4a2e8` | `m366cf6994bea78ad49798f5d` | fa 110 | `5f4aebae95d621a37318d4012c19b29666b56a5c` |
| `amal-aamal-vrvz-ayd` | `r00006-s34abe30a2fd8c1a9` → `r00007` | `m96fa9d1b62c7a4503d3638d2` | fa 282 | `5f4aebae95d621a37318d4012c19b29666b56a5c` |
| `amal-aamal-nv-ayd` | `r00001-sa3fbdb6fa458720f` → `r00002-sb122fdb543464f4c` | `m51f8b74258ee45cc045129d2` | fa 132 | `46fa665b1c87de8811bf47dc854efa2ea6bf833e` |
| `amal-aamal-nv-ayd` | `r00004-s9139a499aa920ed2` → `r00005-s49a0157da90fa1f7` | `m5f6a035bfcab60f8fc668354` | ar 83, fa 83 | `46fa665b1c87de8811bf47dc854efa2ea6bf833e` |
| `amal-aamal-akhr-zy` | `r00001-s2aa090098a6808db` → `r00002-sa35c43f774f2ad27` | `m22c9ea2bd0ac7d871ca0a282` | fa 37 | `a3cf28716159dfa36f903f9fd51de2b054acd6f4` |
| `amal-aamal-ta-hfdhm` | `r00001-s6293118522084e62` → `r00002` | `m2ab7a23f6aa07a562f0b2137` | fa 64 | `602d916842724977a306d0da0cfc17a2dc56ed9c` |

`sura-rahman` preserved audio-reciter row, relations and alignment files; verse 33 and 54 markers remain in their respective Arabic and Persian result fields. These checks do not certify external audio timing.

## Guarded live revisions

Formal previews were bound to each exact parent and confirmed by digest. Previous live and record fields were checked against exact target slices; original pooled values were unchanged. Thirteen one-to-one role/paired revisions are deliberately partial; other cited rows and unequal cuts remain open. See commit diffs and current plan/layout for exact source slots, parts and retired IDs.

| Item | Frozen source rows revised | Commit |
| --- | --- | --- |
| `ziyarat-klamy-znha-mzmt` | r00003 corresponding ar/fa quotations and notes; retain missing Persian lead-in | `ed8f4f3fa4540b2ac83856b3586857aaab0c75d7` |
| `amal-aamal-akhr-zy` | r00001/fa cut 18, r00002/fa cut 37 | `eb44334fcd548c303ae854d2ac4ac426b0ba94e6` |
| `amal-aamal-ta-hfdhm` | r00001/fa cuts 13,136,271; r00003/fa cut 13; r00004/fa cut 10 | `afbffb694932dfc40c6fcaf06616d00d59cbfbb9` |
| `amal-asharh` | r00002, r00003, r00007, r00009 | `398812d80365a795d1ef17685c7aaf415e9abe2f` |
| `amal-aamal-rvyt-hlal` | r00003, r00008 | `789c1267da08c8341a058918b8e74295f7baefe6` |
| `amal-aamal-shaban` | r00002, r00005 | `90d3769cd01e9cc10593010014c560ee1dbcd6dd` |
| `khavas-nvshth-ay-hmrah` | r00007 | `ccb2ef0ad3dc32af1b06071933a72a09821273da` |
| `ziyarat-amamyn-askryyn-alyhma` | r00009 | `422eaaf726b47ddc0e8b5f1b243b9b557bd4f2f6` |
| `ziyarat-daahay-bad-alyh` | r00006 | `be89cec5700bf4360601d117802da2a5019286eb` |
| `amal-aamal-nv-ayd` | r00005 corresponding ar/fa parts (then adjacent continuation) | `274381d43478ec07075a7cd5258426af3ea97457` |
| `amal-aamal-rbya-alsany` | r00001/fa cuts 203,253,387,646,778 | `434ebe8211035d340b3e4a04fadc14202362690c` |
| `namaz-anjam-daa-vst` | r00001/fa cut 30 | `cfbe17cb70684c579cd0664e28a046d09513a54e` |
| `namaz-astkharh-sahb-jvahr` | r00001/fa cuts 187,296,734 | `60d6d4fe10bf7a3a50f91cb25b2554a8cd80d5f2` |
| `amal-aamal-nvzdhm-rmzan` | r00005 ar/fa parts 0–1 | `6877a8e46c9b1663412d4833a101fde549df0294` |
| `item-shshm-rqah-ay` | r00002–03 corresponding ar/fa parts | `8e4a26fda2f6f4dc696c18aa2a68c69487f4c69c` |
| `namaz-fzylt-hmd-ayh` | r00003 corresponding ar/fa parts | `d8ba7cd6468036a8ab3ad527b456fed4495c1930` |
| `ziyarat-item-9` | r00004–05 corresponding ar/fa parts | `9f617e1118f20d88ac29822380be2edbf7b3a1bf` |
| `ziyarat-jnab-hany-bn` | r00002–03 corresponding ar/fa parts | `98fb37b0226db98e00f6055b7118de98d4f4271c` |
| `ziyarat-shhday-ahd` | r00002–03 corresponding ar/fa parts | `c6f0522993c16ecc1bb61bb8c065b4b345294274` |
| `ziyarat-zkrmsajd-mazmh-mdynh` | r00004 corresponding ar/fa parts | `64825e53a04fc8556a6970b1194655994fe333b2` |
| `khavas-hrz-zyn-alaabdyn-2` | r00003–04 corresponding ar/fa parts | `342305b19c3172ef9ed0c952d611eb95977f374c` |
| `amal-fzylt-thlyl-masvr` | r00002, r00006 | `da86934abd6774057e65890f7b2df4978452a14c` |
| `dua-dvm-daahay-vqt` | r00002, r00006, r00013 | `2cb9dc5faddc4cc46cd17fcc94af1c3cfc076908` |
| `amal-fzylt-dhvalarz-aamal` | r00005, r00008 | `a0f4f759d19d6ab7665e2ca370147836e5b7c6cd` |
| `dua-hftm-daa-vardh` | r00004, r00008, r00012 | `cbe63072eb7efcb9658cb7b9eecc8be85536d8b5` |
| `dua-pnjm-daahay-vardh` | r00002, r00003, r00006 | `260dd97162d0e35400f2dbd5475ff2cdd48abaff` |
| `namaz-ayd-ftr` | r00002, r00010 | `3add8867fd6d81ef4aebf4630c7914bf70c01ac8` |
| `ziyarat-dvm-nymh-rjb` | r00003, r00008 | `8317d5bd98d10b21e4a5ee30a792eb0d1cfb5b01` |

## Remaining holds, by original finding

This is a conservative inventory: original `revise`/`uncertain` source IDs are listed even where a partial author correction above touches them, until Agent 5 independently verifies the entire record. Entries retain prior triage context and do not assert that old tooling limitations all still apply; the new guarded live revisions demonstrate that some earlier nonadjacent-output pairing can be represented without a forced join. Do not perform an alias migration or blindly rebind a provisional candidate. See original peer review JSON for each precise subfinding, and the named prior triage file for its source-level assessment.

| Item | Original triage | Original finding IDs / languages | Author state |
| --- | --- | --- | --- |
| `amal-aamal-akhr-zy` | needs clarification; `AGENT-5-TRIAGE-BATCH-1.md` | `r00001/fa`, `r00002/fa` | changed; full re-review and residual findings open |
| `amal-aamal-arfh-2` | migration-blocked; `AGENT-5-TRIAGE-PARTIAL.md` | `r00002/fa`, `r00026/ar`, `r00026/fa`, `r00027/ar`, `r00027/fa` | unchanged; prior finding open unless independently accepted later |
| `amal-aamal-hrm-hsyn` | blocked by link migration; `AGENT-5-TRIAGE-BATCH-1.md` | `r00001/fa`, `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00005/ar`, `r00005/fa`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00009/ar`, `r00010/fa`, `r00011/fa`, `r00012/fa`, `r00013/fa`, `r00014/fa` | unchanged; prior finding open unless independently accepted later |
| `amal-aamal-nv-ayd` | blocked by tool limitation/link migration; `AGENT-5-TRIAGE-BATCH-1.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00005/ar`, `r00005/fa` | changed; full re-review and residual findings open |
| `amal-aamal-nvzdhm-rmzan` | migration-blocked; `AGENT-5-TRIAGE-PARTIAL.md` | `r00005/ar`, `r00005/fa` | changed; full re-review and residual findings open |
| `amal-aamal-rbya-alsany` | blocked by link migration; `AGENT-5-TRIAGE-BATCH-1.md` | `r00001/fa` | changed; full re-review and residual findings open |
| `amal-aamal-rvyt-hlal` | blocked by link migration; `AGENT-5-TRIAGE-BATCH-1.md` | `r00001/fa`, `r00003/fa`, `r00006/fa`, `r00008/fa` | changed; full re-review and residual findings open |
| `amal-aamal-shaban` | blocked by link migration; `AGENT-5-TRIAGE-BATCH-1.md` | `r00001/fa`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00005/fa`, `r00006/fa`, `r00007/ar`, `r00007/fa` | changed; full re-review and residual findings open |
| `amal-aamal-sy-am` | needs clarification; `AGENT-5-TRIAGE-BATCH-1.md` | `r00001/ar`, `r00001/fa`, `r00002/ar`, `r00002/fa` | changed; full re-review and residual findings open |
| `amal-aamal-ta-hfdhm` | needs clarification; `AGENT-5-TRIAGE-BATCH-1.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00004/fa` | changed; full re-review and residual findings open |
| `amal-aamal-vrvz-ayd` | blocked by link migration; `AGENT-5-TRIAGE-BATCH-1.md` | `r00002/fa`, `r00003/fa`, `r00004/fa`, `r00005/fa`, `r00006/fa`, `r00007/fa` | changed; full re-review and residual findings open |
| `amal-asharh` | blocked by link migration; `AGENT-5-TRIAGE-BATCH-1.md` | `r00002/fa`, `r00003/fa`, `r00007/fa`, `r00008/fa`, `r00009/fa` | changed; full re-review and residual findings open |
| `amal-avzh-aqrb` | needs clarification; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/ar`, `r00002/fa` | unchanged; prior finding open unless independently accepted later |
| `amal-fzylt-aamal-mbahlh` | needs clarification; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00005/ar`, `r00005/fa`, `r00006/ar`, `r00006/fa`, `r00008/ar`, `r00008/fa`, `r00009/ar`, `r00009/fa`, `r00010/ar`, `r00010/fa`, `r00011/ar`, `r00011/fa`, `r00012/ar`, `r00012/fa`, `r00013/ar`, `r00013/fa`, `r00014/ar`, `r00014/fa`, `r00015/ar`, `r00015/fa`, `r00016/ar`, `r00016/fa`, `r00017/fa`, `r00018/fa` | changed; full re-review and residual findings open |
| `amal-fzylt-bsm-allh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/ar`, `r00001/fa`, `r00002/fa`, `r00003/fa` | unchanged; prior finding open unless independently accepted later |
| `amal-fzylt-dhvalarz-aamal` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00004/fa`, `r00005/fa`, `r00006/fa`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00009/ar`, `r00009/fa`, `r00010/ar`, `r00010/fa`, `r00011/ar`, `r00011/fa`, `r00012/ar`, `r00012/fa`, `r00013/fa`, `r00014/fa`, `r00015/fa` | changed; full re-review and residual findings open |
| `amal-fzylt-msjd-kvfh` | needs clarification; `AGENT-5-TRIAGE-BATCH-2.md` | `r00002/fa`, `r00003/fa`, `r00004/fa` | changed; full re-review and residual findings open |
| `amal-fzylt-shaban` | needs clarification; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00005/fa`, `r00006/fa` | changed; full re-review and residual findings open |
| `amal-fzylt-taqyb` | needs clarification; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00003/fa`, `r00004/fa` | changed; full re-review and residual findings open |
| `amal-fzylt-thlyl-masvr` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00004/fa`, `r00006/fa`, `r00009/fa`, `r00010/ar`, `r00010/fa` | changed; full re-review and residual findings open |
| `amal-mjavl-bvdn-daayy` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00006/ar`, `r00006/fa`, `r00007/fa`, `r00008/fa`, `r00009/ar`, `r00009/fa`, `r00010/ar`, `r00010/fa`, `r00011/ar`, `r00011/fa`, `r00012/ar`, `r00012/fa` | unchanged; prior finding open unless independently accepted later |
| `amal-nymh-shaban` | needs clarification; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00003/fa` | changed; full re-review and residual findings open |
| `amal-slvat-shaban` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-2.md` | `r00006/ar`, `r00006/fa` | unchanged; prior finding open unless independently accepted later |
| `amal-tarykh-fzylt-msjd` | needs clarification; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00007/fa`, `r00008/fa`, `r00009/fa` | changed; full re-review and residual findings open |
| `amal-tkbyrat` | needs clarification; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00005/ar`, `r00005/fa`, `r00006/ar`, `r00006/fa` | changed; full re-review and residual findings open |
| `dua-brs-pysy` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00005/ar`, `r00005/fa`, `r00006/ar`, `r00006/fa`, `r00007/fa` | unchanged; prior finding open unless independently accepted later |
| `dua-dvm-daahay-vqt` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00005/fa`, `r00006/fa`, `r00009/fa`, `r00011/fa`, `r00013/fa` | changed; full re-review and residual findings open |
| `dua-hftm-daa-vardh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00005/fa`, `r00006/fa`, `r00007/ar`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00009/fa`, `r00010/ar`, `r00010/fa`, `r00011/ar`, `r00011/fa`, `r00012/ar`, `r00012/fa` | changed; full re-review and residual findings open |
| `dua-mashlul` | needs clarification; `AGENT-5-TRIAGE-BATCH-2.md` | `r00022/ar`, `r00022/fa`, `r00023/ar`, `r00023/fa`, `r00225/ar`, `r00225/fa`, `r00226/ar`, `r00226/fa`, `r00229/ar`, `r00229/fa`, `r00230/ar`, `r00230/fa`, `r00234/fa` | changed; full re-review and residual findings open |
| `dua-pnjm-daahay-vardh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/fa`, `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00006/ar`, `r00006/fa`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00009/fa`, `r00010/ar`, `r00010/fa`, `r00011/ar`, `r00011/fa`, `r00012/ar`, `r00012/fa`, `r00013/ar`, `r00013/fa`, `r00014/fa` | changed; full re-review and residual findings open |
| `dua-rsvl-s-aman` | needs clarification; `AGENT-5-TRIAGE-BATCH-2.md` | `r00001/ar`, `r00002/ar` | changed; full re-review and residual findings open |
| `dua-srya-alajabh-2` | needs clarification; `AGENT-5-TRIAGE-BATCH-3.md` | `r00001/fa`, `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/fa`, `r00005/fa`, `r00006/ar`, `r00006/fa`, `r00007/ar`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00009/ar`, `r00009/fa`, `r00010/ar`, `r00010/fa`, `r00011/fa`, `r00015/fa`, `r00017/fa`, `r00018/ar`, `r00018/fa`, `r00019/ar`, `r00019/fa` | changed; full re-review and residual findings open |
| `dua-yamn-thl-hady` | needs clarification; `AGENT-5-TRIAGE-BATCH-3.md` |  | unchanged; prior finding open unless independently accepted later |
| `item-abvhmzh-smaly` | needs clarification; `AGENT-5-TRIAGE-BATCH-3.md` | `r00071/ar`, `r00071/fa`, `r00072/ar`, `r00072/fa`, `r00096/ar`, `r00096/fa`, `r00097/ar`, `r00097/fa`, `r00140/ar`, `r00140/fa`, `r00141/ar`, `r00141/fa`, `r00149/ar`, `r00149/fa`, `r00150/ar`, `r00150/fa`, `r00158/ar`, `r00158/fa`, `r00159/ar`, `r00159/fa`, `r00160/ar`, `r00160/fa`, `r00220/fa`, `r00221/fa` | changed; full re-review and residual findings open |
| `item-asharh-6` | migration-blocked; `AGENT-5-TRIAGE-PARTIAL.md` | `r00005/fa` | unchanged; prior finding open unless independently accepted later |
| `item-fvayd-adab-trbt` | needs clarification; `AGENT-5-TRIAGE-BATCH-3.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00004/fa`, `r00005/fa`, `r00006/ar`, `r00006/fa`, `r00007/ar`, `r00007/fa`, `r00008/fa`, `r00010/fa`, `r00011/fa`, `r00018/fa`, `r00019/fa`, `r00020/ar`, `r00020/fa`, `r00021/ar`, `r00021/fa`, `r00022/ar`, `r00022/fa`, `r00023/ar`, `r00023/fa`, `r00024/fa`, `r00026/fa`, `r00027/fa`, `r00028/fa`, `r00029/fa` | changed; full re-review and residual findings open |
| `item-jrb-dml-qvba` | needs clarification; `AGENT-5-TRIAGE-BATCH-3.md` | `r00001/fa`, `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa` | changed; full re-review and residual findings open |
| `item-mqdmh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-3.md` | `r00003/ar`, `r00003/fa`, `r00030/fa`, `r00031/fa`, `r00035/fa`, `r00036/fa` | unchanged; prior finding open unless independently accepted later |
| `item-shshm-rqah-ay` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-3.md` | `r00001/fa`, `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/fa` | changed; full re-review and residual findings open |
| `item-takyd-frstadn-hdyh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-3.md` | `r00001/ar`, `r00001/fa`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/fa`, `r00005/fa`, `r00006/fa` | unchanged; prior finding open unless independently accepted later |
| `khavas-adab-aqyqh` | needs clarification; `AGENT-5-TRIAGE-BATCH-3.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00006/fa` | changed; full re-review and residual findings open |
| `khavas-astkharh-tsbyh-mnqvl` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-3.md` | `r00001/fa`, `r00002/ar`, `r00002/fa`, `r00003/fa`, `r00004/fa` | unchanged; prior finding open unless independently accepted later |
| `khavas-hrz-mvlana-alqaym` | needs clarification; `AGENT-5-TRIAGE-BATCH-3.md` | `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa` | unchanged; prior finding open unless independently accepted later |
| `khavas-hrz-mvsy-kazm` | needs clarification; `AGENT-5-TRIAGE-BATCH-3.md` | `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa` | unchanged; prior finding open unless independently accepted later |
| `khavas-hrz-zyn-alaabdyn-2` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-3.md` | `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00005/ar`, `r00005/fa` | changed; full re-review and residual findings open |
| `khavas-kfn-myt` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/fa`, `r00002/fa` | changed; full re-review and residual findings open |
| `khavas-mzmt-trashydn-rysh` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/fa`, `r00002/fa` | unchanged; prior finding open unless independently accepted later |
| `khavas-nvshth-ay-hmrah` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-4.md` | `r00002/ar`, `r00002/fa`, `r00003/fa`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00006/ar`, `r00006/fa`, `r00007/fa`, `r00008/fa`, `r00009/ar`, `r00009/fa` | changed; full re-review and residual findings open |
| `khavas-rvyt-jnazh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/ar`, `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00005/fa`, `r00006/fa` | unchanged; prior finding open unless independently accepted later |
| `khavas-tshya-jnazh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/fa`, `r00002/fa` | unchanged; prior finding open unless independently accepted later |
| `monajat-mnajat-sfr` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/ar`, `r00001/fa`, `r00002/ar`, `r00002/fa` | changed; full re-review and residual findings open |
| `namaz-anjam-daa-vst` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/fa` | changed; full re-review and residual findings open |
| `namaz-astkharh-sahb-jvahr` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/fa` | changed; full re-review and residual findings open |
| `namaz-ayd-ftr` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-4.md` | `r00002/fa`, `r00003/fa`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00006/ar`, `r00006/fa`, `r00007/ar`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00009/ar`, `r00009/fa`, `r00010/fa`, `r00011/fa` | changed; full re-review and residual findings open |
| `namaz-ayd-ghdyr` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` | `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00007/fa`, `r00008/fa`, `r00009/fa`, `r00010/fa`, `r00014/ar`, `r00014/fa`, `r00015/ar`, `r00015/fa`, `r00016/ar`, `r00016/fa`, `r00017/ar`, `r00017/fa`, `r00018/fa`, `r00021/ar`, `r00021/fa`, `r00022/ar`, `r00022/fa`, `r00025/fa`, `r00026/fa` | changed; full re-review and residual findings open |
| `namaz-ayza-hajt-sndhay` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/fa`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00005/ar`, `r00005/fa`, `r00006/ar`, `r00006/fa` | unchanged; prior finding open unless independently accepted later |
| `namaz-fzylt` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/fa`, `r00002/fa`, `r00005/fa`, `r00006/fa`, `r00007/fa` | changed; full re-review and residual findings open |
| `namaz-fzylt-ayh-alkrsy` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/ar`, `r00002/fa` | unchanged; prior finding open unless independently accepted later |
| `namaz-fzylt-hmd-ayh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/fa`, `r00002/fa`, `r00003/ar`, `r00003/fa` | changed; full re-review and residual findings open |
| `namaz-hdyh-masvmyn-alyhma` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/fa`, `r00002/fa` | changed; full re-review and residual findings open |
| `namaz-qzay-dyn-kfayt` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` | `r00001/fa`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/fa`, `r00005/fa` | changed; full re-review and residual findings open |
| `namaz-taqyb-sbh-nql` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` |  | unchanged; prior finding open unless independently accepted later |
| `sura-rahman` | needs clarification; `AGENT-5-TRIAGE-BATCH-4.md` | `r00035/ar`, `r00035/fa`, `r00036/ar`, `r00036/fa`, `r00057/ar`, `r00058/ar`, `r00058/fa` | changed; full re-review and residual findings open |
| `ziyarat-abas-alyh-alslam` | needs clarification; `AGENT-5-TRIAGE-BATCH-5.md` | `r00002/fa`, `r00006/ar`, `r00006/fa`, `r00007/ar`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00009/ar`, `r00009/fa`, `r00010/ar`, `r00010/fa`, `r00014/ar`, `r00014/fa`, `r00015/ar`, `r00015/fa`, `r00016/ar`, `r00016/fa`, `r00017/ar`, `r00017/fa` | changed; full re-review and residual findings open |
| `ziyarat-aly-alnqy-alyh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00006/ar`, `r00006/fa`, `r00007/ar`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00009/ar`, `r00009/fa`, `r00010/fa`, `r00011/fa` | unchanged; prior finding open unless independently accepted later |
| `ziyarat-amamyn-askryyn-alyhma` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00001/fa`, `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00006/fa`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00009/fa` | changed; full re-review and residual findings open |
| `ziyarat-amamzadh-hmzh-alyh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00001/fa`, `r00002/fa` | changed; full re-review and residual findings open |
| `ziyarat-avl-fzylt-hsyn` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00002/fa`, `r00003/fa`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00006/fa`, `r00007/fa`, `r00008/fa` | unchanged; prior finding open unless independently accepted later |
| `ziyarat-daahay-bad-alyh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00002/ar`, `r00002/fa`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00006/fa` | changed; full re-review and residual findings open |
| `ziyarat-dvm-nymh-rjb` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00001/fa`, `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00008/fa`, `r00009/fa` | changed; full re-review and residual findings open |
| `ziyarat-item-9` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00002/fa`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00006/fa`, `r00007/fa` | changed; full re-review and residual findings open |
| `ziyarat-jnab-hany-bn` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa` | changed; full re-review and residual findings open |
| `ziyarat-klamy-znha-mzmt` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00003/ar`, `r00003/fa`, `r00004/fa`, `r00005/fa` | changed; full re-review and residual findings open |
| `ziyarat-mkhts-mhmd-tqy` | needs clarification; `AGENT-5-TRIAGE-BATCH-5.md` | `r00001/fa`, `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00008/fa`, `r00009/fa`, `r00010/ar`, `r00010/fa`, `r00011/ar`, `r00011/fa`, `r00012/ar`, `r00012/fa`, `r00013/ar`, `r00013/fa`, `r00016/fa`, `r00017/fa`, `r00019/fa`, `r00020/fa` | changed; full re-review and residual findings open |
| `ziyarat-mtlqh-amyrmvmnyn-alyh` | needs clarification; `AGENT-5-TRIAGE-BATCH-5.md` | `r00004/ar`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00008/ar`, `r00008/fa`, `r00009/ar`, `r00009/fa`, `r00013/ar`, `r00013/fa`, `r00014/ar`, `r00014/fa`, `r00017/ar`, `r00017/fa`, `r00018/ar`, `r00018/fa`, `r00019/ar`, `r00019/fa`, `r00020/ar`, `r00020/fa`, `r00022/ar`, `r00022/fa`, `r00023/ar`, `r00023/fa`, `r00024/ar`, `r00024/fa`, `r00025/ar`, `r00025/fa`, `r00026/ar`, `r00026/fa`, `r00027/ar`, `r00027/fa`, `r00028/ar`, `r00028/fa`, `r00029/ar`, `r00029/fa`, `r00030/ar`, `r00030/fa`, `r00031/ar`, `r00031/fa`, `r00033/fa`, `r00034/ar`, `r00034/fa`, `r00036/ar`, `r00036/fa`, `r00037/ar`, `r00037/fa`, `r00041/ar`, `r00041/fa`, `r00042/ar`, `r00042/fa`, `r00045/fa` | changed; full re-review and residual findings open |
| `ziyarat-pnjm-an-ayd` | needs clarification; `AGENT-5-TRIAGE-BATCH-5.md` | `r00001/fa`, `r00002/fa`, `r00003/fa`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00010/ar`, `r00010/fa`, `r00011/ar`, `r00011/fa`, `r00013/ar`, `r00013/fa`, `r00014/ar`, `r00014/fa`, `r00017/fa`, `r00018/ar`, `r00018/fa`, `r00019/ar`, `r00019/fa`, `r00020/ar`, `r00020/fa`, `r00021/fa`, `r00022/ar`, `r00022/fa`, `r00025/fa`, `r00026/ar`, `r00026/fa`, `r00028/ar`, `r00028/fa`, `r00029/ar`, `r00029/fa`, `r00032/fa` | changed; full re-review and residual findings open |
| `ziyarat-pyadh-rftn-shah` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00001/fa`, `r00013/fa`, `r00015/ar` | unchanged; prior finding open unless independently accepted later |
| `ziyarat-rsvl-sly-allh-2` | needs clarification; `AGENT-5-TRIAGE-BATCH-5.md` | `r00001/fa`, `r00004/ar`, `r00004/fa`, `r00005/ar`, `r00005/fa`, `r00006/ar`, `r00006/fa`, `r00007/ar`, `r00007/fa`, `r00008/ar`, `r00008/fa`, `r00009/ar`, `r00009/fa`, `r00010/ar`, `r00010/fa`, `r00011/ar`, `r00011/fa`, `r00012/ar`, `r00012/fa`, `r00013/ar`, `r00013/fa`, `r00014/ar`, `r00014/fa`, `r00015/ar`, `r00015/fa`, `r00016/ar`, `r00016/fa`, `r00017/ar`, `r00017/fa`, `r00018/ar`, `r00018/fa`, `r00019/ar`, `r00019/fa`, `r00020/ar`, `r00020/fa`, `r00021/ar`, `r00021/fa`, `r00023/ar`, `r00023/fa`, `r00024/ar`, `r00024/fa` | changed; full re-review and residual findings open |
| `ziyarat-shhday-ahd` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00001/ar`, `r00001/fa`, `r00002/ar`, `r00002/fa`, `r00003/ar`, `r00003/fa`, `r00004/ar`, `r00004/fa`, `r00005/fa` | changed; full re-review and residual findings open |
| `ziyarat-shykh-klyny-alrhmh` | needs clarification; `AGENT-5-TRIAGE-BATCH-5.md` | `r00001/fa`, `r00002/fa` | changed; full re-review and residual findings open |
| `ziyarat-warith` | needs clarification; `AGENT-5-TRIAGE-BATCH-5.md` | `r00003/fa`, `r00005/ar`, `r00005/fa`, `r00006/ar`, `r00006/fa`, `r00010/fa`, `r00014/ar`, `r00014/fa`, `r00029/ar`, `r00029/fa`, `r00030/ar`, `r00030/fa`, `r00053/fa`, `r00054/ar`, `r00054/fa`, `r00074/ar`, `r00074/fa`, `r00075/ar`, `r00075/fa`, `r00077/ar`, `r00077/fa`, `r00078/ar`, `r00078/fa`, `r00084/ar`, `r00084/fa`, `r00085/ar`, `r00085/fa`, `r00090/ar`, `r00090/fa`, `r00091/ar`, `r00091/fa`, `r00092/ar`, `r00092/fa`, `r00093/ar`, `r00093/fa`, `r00094/ar`, `r00094/fa`, `r00098/ar`, `r00098/fa`, `r00099/ar`, `r00099/fa`, `r00104/ar`, `r00104/fa`, `r00105/ar`, `r00105/fa`, `r00106/ar`, `r00106/fa`, `r00115/ar`, `r00115/fa`, `r00116/ar`, `r00116/fa`, `r00133/ar`, `r00133/fa`, `r00134/ar`, `r00134/fa`, `r00147/fa`, `r00148/ar` | changed; full re-review and residual findings open |
| `ziyarat-zkrmsajd-mazmh-mdynh` | blocked by link migration or tool limitation; `AGENT-5-TRIAGE-BATCH-5.md` | `r00002/fa`, `r00004/ar`, `r00004/fa` | changed; full re-review and residual findings open |

## Special holds and verification

- `dua-yamn-thl-hady`: 26 provisional candidate destinations remain withheld under stale binding. The independently unapproved recomposition evidence is in `DUA-YAMN-PROVISIONAL-LINEAGE-RECHECK.md`; no register update or migration was made.
- Historical LF decisions and source discrepancies remain independent editorial holds. Preserve variants, omissions and attributed medical or protective claims; do not infer new source.
- `namaz-ayza-hajt-sndhay`: plausible r00003/r00005 role-pair draft passed in-memory live revision checks but the item has provisional version-link register entries; it was not applied or rebound.
- Some multi-row sequences remain connected only in part after adjacent-pair corrections; examine all original findings, not just the listed operations. Role mismatches, reused IDs, old-retired IDs and unsupported nonadjacent composition remain distinct issues.
- Agent 5 independently accepted unchanged `dua-saat-6`, `dua-saat-8`, `dua-saat-9`, `fazilat-svrhalrhmn`, `fazilat-svrhmbarkys`, `fazilat-svrhmlk` and `khavas-khvab-dydn-khvd` at its e90/7cd reviews; they are excluded from the remaining-holds table and are not reopened. The four items in snapshot 38 remain pending. The item rows listed above are a conservative review inventory, not an assertion that the full scholarly, translation, source-rights or user-facing correctness has been certified.
