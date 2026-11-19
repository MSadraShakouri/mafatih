import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { RowVersionFindingsSchema, rowVersion } from '../../src/row-version-safety.js';

// Only synthetic text. The old Arabic field was split across two current rows,
// including a language-slot change and a nonzero destination offset.
const current='a'.repeat(40), old='b'.repeat(40), unknown='c'.repeat(40);
const item={
  id:'dua-ahd',title:{fa:'Synthetic item',ar:'',en:''},featured:false,
  rows:[
    {id:'reused',ar:'new',fa:'',kind:'recitation'},
    {id:'old-first',ar:'ab',fa:'',kind:'recitation'},
    {id:'old-last',ar:'',fa:'0123xyz',kind:'note'},
  ],
  row_version_links:[{
    id:'reused',
    current:{snapshots:[current],ar:[{row:'reused',language:'ar',start:0,end:3,target_start:0}],fa:[]},
    historical:[{snapshots:[old],ar:[
      {row:'old-first',language:'ar',start:0,end:2,target_start:0},
      {row:'old-last',language:'fa',start:2,end:5,target_start:4},
    ],fa:[]}],
  }],
};

async function useItem(page: import('@playwright/test').Page, value: unknown = item): Promise<void> {
  await page.route('**/data/items/dua-ahd.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)}));
}

test('an unversioned reused ID warns instead of silently selecting a meaning',async ({page})=>{
  await useItem(page);
  await page.goto('./#/item/dua-ahd?row=reused&lang=ar&offset=2');
  const reader=page.locator('main[data-screen="reader"]');
  const warning=reader.locator('[data-row-version-warning]');
  await expect(warning).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
  await expect(warning.getByRole('link',{name:/نسخهٔ کنونی/})).toBeVisible();
  await warning.getByRole('link',{name:/نسخهٔ پیشین/}).click();
  await expect(page).toHaveURL(new RegExp(`version=${old}`));
  await expect(reader).toHaveAttribute('data-anchor-row','old-last');
  await expect(reader).toHaveAttribute('data-anchor-offset','4');
  await expect(reader.locator('[data-row-id="old-last"] p[lang="fa"]')).toBeVisible();
});

test('a known current snapshot opens the current meaning; an unknown version never guesses',async ({page})=>{
  await useItem(page);
  await page.goto(`./#/item/dua-ahd?row=reused&lang=ar&offset=1&version=${current}`);
  const reader=page.locator('main[data-screen="reader"]');
  await expect(reader).toHaveAttribute('data-anchor-row','reused');
  await expect(reader).toHaveAttribute('data-anchor-offset','1');
  await expect(reader.locator('[data-row-version-warning]')).toHaveCount(0);
  await page.goto(`./#/item/dua-ahd?row=reused&lang=ar&offset=1&version=${unknown}`);
  await expect(reader.locator('[data-row-version-warning]')).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
});

test('a shared content identity never silently selects either row meaning',async ({page})=>{
  const collided=structuredClone(item), shared='d'.repeat(64);
  collided.row_version_links[0]!.current.snapshots=[shared];
  collided.row_version_links[0]!.historical[0]!.snapshots=[shared];
  await useItem(page,collided);
  await page.goto(`./#/item/dua-ahd?row=reused&lang=ar&offset=1&version=${shared}`);
  const reader=page.locator('main[data-screen="reader"]');
  await expect(reader.locator('[data-row-version-warning="invalid-data"]')).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
  await page.goto('./#/item/dua-ahd?row=reused&lang=ar&offset=1');
  await expect(reader.locator('[data-row-version-warning="invalid-data"]')).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
});

test('a new global-search link for a reused current row carries its current snapshot',async ({page})=>{
  await useItem(page);
  await page.route('**/data/search-index.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    version:4,normalization:'nfkd-search-v2',records:[],shards:['search/000.json'],
  })}));
  await page.route('**/data/search/000.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    version:4,records:[{key:'row:dua-ahd:reused:ar',section:'text',item:'dua-ahd',row:'reused',rowVersion:current,
      language:'ar',text:'new',normalized:'new',featured:false,order:0}],
  })}));
  await page.goto('./');
  await page.getByRole('searchbox',{name:'جست‌وجو در فهرست و متن'}).fill('new');
  const hit=page.locator('.search-result[data-item-id="dua-ahd"][data-row-id="reused"]');
  await expect(hit).toBeVisible();await hit.locator('button').click();
  await expect(page).toHaveURL(new RegExp(`version=${current}`));
  await expect(page.locator('main[data-screen="reader"]')).toHaveAttribute('data-anchor-row','reused');
});

test('a named provisional historical mapping requires a separate deliberate confirmation',async ({page})=>{
  const proposed=structuredClone(item);
  Object.assign(proposed.row_version_links[0]!.historical[0]!,{provisional:true});
  await useItem(page,proposed);
  await page.goto(`./#/item/dua-ahd?row=reused&lang=ar&offset=2&version=${old}`);
  const reader=page.locator('main[data-screen="reader"]'),warning=reader.locator('[data-row-version-warning="provisional"]');
  await expect(warning).toBeVisible();
  await expect(warning).toContainText('بازبینی‌نشده');
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
  await warning.getByRole('button',{name:'مشاهدهٔ مقصد پیشنهادی'}).click();
  await expect(reader).toHaveAttribute('data-anchor-row','old-last');
  await expect(reader).toHaveAttribute('data-anchor-offset','4');
  await expect(warning).toBeAttached();
});

test('an unroutable retired ID offers a single clearly provisional candidate without claiming ID reuse',async ({page})=>{
  const retired={...structuredClone(item),row_version_links:[{
    id:'retired',historical:[{snapshots:[old],provisional:true,ar:[
      {row:'old-first',language:'ar',start:0,end:2,target_start:0},
      {row:'old-last',language:'fa',start:2,end:5,target_start:4},
    ],fa:[]}],
  }]};
  await useItem(page,retired);
  await page.goto('./#/item/dua-ahd?row=retired&lang=ar&offset=2');
  const reader=page.locator('main[data-screen="reader"]');
  const warning=reader.locator('[data-row-version-warning="ambiguous"]');
  await expect(warning).toBeVisible();
  await expect(warning).not.toContainText('چند نسخه');
  await expect(warning).toContainText('بازبینی‌نشده');
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
  await warning.getByRole('link',{name:/نسخهٔ پیشین/}).click();
  const proposal=reader.locator('[data-row-version-warning="provisional"]');
  await expect(proposal).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
  await proposal.getByRole('button',{name:'مشاهدهٔ مقصد پیشنهادی'}).click();
  await expect(reader).toHaveAttribute('data-anchor-row','old-last');
  await expect(reader).toHaveAttribute('data-anchor-offset','4');
});

test('stale or out-of-range mappings do not produce links or jump to text',async ({page})=>{
  const stale=structuredClone(item);
  stale.row_version_links[0]!.historical[0]!.ar=[];
  await useItem(page,stale);
  await page.goto(`./#/item/dua-ahd?row=reused&lang=ar&offset=2&version=${old}`);
  const reader=page.locator('main[data-screen="reader"]');
  await expect(reader.locator('[data-row-version-warning="unavailable"]')).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
  await expect(reader.locator('[data-row-version-warning] a').filter({hasText:'نسخهٔ پیشین'})).toHaveCount(0);
  await page.goto(`./#/item/dua-ahd?row=reused&lang=ar&offset=100&version=${current}`);
  await expect(reader.locator('[data-row-version-warning="unavailable"]')).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
});

test('a cross-language target after an astral character uses code-point rather than UTF-16 offsets',async ({page})=>{
  const unicode=structuredClone(item);
  unicode.rows[1]!.ar='a😀'; unicode.rows[2]!.fa='Q😀xy';
  unicode.row_version_links[0]!.historical[0]!.ar[1]!.target_start=1;
  await useItem(page,unicode);
  await page.goto(`./#/item/dua-ahd?row=reused&lang=ar&offset=2&version=${old}`);
  const reader=page.locator('main[data-screen="reader"]');
  await expect(reader).toHaveAttribute('data-anchor-row','old-last');
  await expect(reader).toHaveAttribute('data-anchor-offset','1');
  const value=await reader.locator('[data-row-id="old-last"] p[lang="fa"]').textContent();
  expect(Array.from(value ?? '')[1]).toBe('😀');
});

test('a stale search-index version cannot silently open a changed current row',async ({page})=>{
  const changed=structuredClone(item);
  changed.rows[0]!.id='normal';Object.assign(changed.rows[0]!,{version:current});
  changed.row_version_links=[];
  await useItem(page,changed);
  await page.goto(`./#/item/dua-ahd?row=normal&lang=ar&offset=1&version=${old}`);
  const reader=page.locator('main[data-screen="reader"]'), warning=reader.locator('[data-row-version-warning="unknown-version"]');
  await expect(warning).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
  await warning.getByRole('link',{name:/نسخهٔ کنونی/}).click();
  await expect(reader).toHaveAttribute('data-anchor-row','normal');
  await expect(page).toHaveURL(new RegExp(`version=${current}`));
});

test('an unversioned missing row shows an unavailable warning instead of silently doing nothing',async ({page})=>{
  await useItem(page);
  await page.goto('./#/item/dua-ahd?row=not-present&lang=ar&offset=0');
  const reader=page.locator('main[data-screen="reader"]');
  await expect(reader.locator('[data-row-version-warning="unavailable"]')).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
});

test('a real recorded cross-language historical link warns and only opens its bound provisional candidate with consent',async ({page})=>{
  const itemId='ziyarat-byan-anchh-vars',row='r00001-sa021c793590ec5ab';
  const runtime=JSON.parse(readFileSync(`dist/data/items/${itemId}.json`,'utf8')) as {
    row_version_links:Array<{id:string;historical:Array<{snapshots:string[];fa:Array<{row:string;language:string;target_start:number}>}>}>;
  };
  const historical=runtime.row_version_links.find(entry=>entry.id===row)!.historical[0]!;
  const findings=RowVersionFindingsSchema.parse(JSON.parse(readFileSync('docs/split-assignments/row-version-findings.json','utf8')));
  const candidate=findings.items[itemId]!.rows.find(entry=>entry.id===row)!;
  const snapshot='731bbd960c4161a7665f93745f43271fe6eadc7c';
  // This is exactly the identity a search link would have carried while the
  // recorded historical row was live; it is not proof of source lineage.
  const savedContentVersion=rowVersion(itemId,candidate.original);
  expect(historical.snapshots).toContain(snapshot);
  expect(historical.snapshots).toContain(savedContentVersion);
  for(const version of [snapshot,savedContentVersion]){
    await page.goto(`./#/item/${itemId}?row=${row}&lang=fa&offset=0&version=${version}`);
    const reader=page.locator('main[data-screen="reader"]');
    await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
    if(historical.fa.length){
      const warning=reader.locator('[data-row-version-warning="provisional"]');
      await expect(warning).toBeVisible();
      expect(historical.fa[0]).toMatchObject({row:'r00001-s909b8a58b8018daa',language:'ar',target_start:109});
      await warning.getByRole('button',{name:'مشاهدهٔ مقصد پیشنهادی'}).click();
      await expect(reader).toHaveAttribute('data-anchor-row','r00001-s909b8a58b8018daa');
      await expect(reader).toHaveAttribute('data-anchor-offset','109');
    }else{
      // A different item/split tree must not reuse the combined-tree mapping.
      await expect(reader.locator('[data-row-version-warning="unavailable"]')).toBeVisible();
    }
  }
});

test('a real unroutable retired link only opens a bound, unreviewed candidate after consent',async ({page})=>{
  const itemId='amal-byst-6',row='r00002-sb4c2bfb77eb89124';
  const runtime=JSON.parse(readFileSync(`dist/data/items/${itemId}.json`,'utf8')) as {
    row_version_links:Array<{id:string;current?:unknown;historical:Array<{snapshots:string[];provisional?:boolean;
      ar:Array<{row:string;language:'ar'|'fa';target_start:number}>}>}>;
  };
  const entry=runtime.row_version_links.find(value=>value.id===row);
  expect(entry).toBeDefined();
  const historical=entry!.historical[0]!;
  expect(entry!.current).toBeUndefined();expect(historical.provisional).toBe(true);
  const snapshot='891bac5ec96ecc8de14798accca23aae76051b0d';
  expect(historical.snapshots).toContain(snapshot);
  await page.goto(`./#/item/${itemId}?row=${row}&lang=ar&offset=0`);
  const reader=page.locator('main[data-screen="reader"]'),choice=reader.locator('[data-row-version-warning="ambiguous"]');
  await expect(choice).toBeVisible();await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
  if(historical.ar.length){
    await choice.getByRole('link',{name:/نسخهٔ پیشین/}).click();
    const warning=reader.locator('[data-row-version-warning="provisional"]');
    await expect(warning).toBeVisible();await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
    await warning.getByRole('button',{name:'مشاهدهٔ مقصد پیشنهادی'}).click();
    await expect(reader).toHaveAttribute('data-anchor-row',historical.ar[0]!.row);
    await expect(reader).toHaveAttribute('data-anchor-offset',String(historical.ar[0]!.target_start));
  }else{
    await expect(choice.getByRole('link',{name:/نسخهٔ پیشین/})).toHaveCount(0);
    await page.goto(`./#/item/${itemId}?row=${row}&lang=ar&offset=0&version=${snapshot}`);
    await expect(reader.locator('[data-row-version-warning="unavailable"]')).toBeVisible();
    await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
  }
});

test('a cached older item cannot bypass a guarded retired-ID warning',async ({page})=>{
  const itemId='amal-byst-6',row='r00002-sb4c2bfb77eb89124';
  const runtime=JSON.parse(readFileSync(`dist/data/items/${itemId}.json`,'utf8')) as Record<string,unknown>;
  delete runtime.row_version_links;
  await page.route(`**/data/items/${itemId}.json`,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(runtime)}));
  await page.goto(`./#/item/${itemId}?row=${row}&lang=ar&offset=0`);
  const reader=page.locator('main[data-screen="reader"]');
  await expect(reader.locator('[data-row-version-warning="invalid-data"]')).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
});

test('a cached older item without the safety register cannot bypass a known reused-ID warning',async ({page})=>{
  const itemId='ziyarat-byan-anchh-vars',row='r00001-sa021c793590ec5ab';
  const runtime=JSON.parse(readFileSync(`dist/data/items/${itemId}.json`,'utf8')) as Record<string,unknown>;
  delete runtime.row_version_links;
  await page.route(`**/data/items/${itemId}.json`,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(runtime)}));
  await page.goto(`./#/item/${itemId}?row=${row}&lang=fa&offset=0`);
  const reader=page.locator('main[data-screen="reader"]');
  await expect(reader.locator('[data-row-version-warning="invalid-data"]')).toBeVisible();
  await expect(reader).not.toHaveAttribute('data-anchor-row',/.+/);
});
