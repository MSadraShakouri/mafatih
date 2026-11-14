import { expect, test } from '@playwright/test';

// Synthetic pieces exercise the actual reader route after a physical split.
// The old Arabic field included a Persian instruction in its first piece.
const item={
  id:'dua-ahd',title:{fa:'Synthetic item',ar:'',en:''},featured:false,
  rows:[
    {id:'old-s1',ar:'',fa:'Intro. ',kind:'instruction'},
    {id:'old-s2',ar:'AR one. ',fa:'FA one. ',kind:'recitation'},
    {id:'old-s3',ar:'AR two.',fa:'FA two.',kind:'recitation'},
  ],
  row_split_redirects:[{original:{id:'old'},
    ar:[{row:'old-s1',language:'fa',start:0,end:7},{row:'old-s2',language:'ar',start:7,end:15},{row:'old-s3',language:'ar',start:15,end:22}],
    fa:[{row:'old-s2',language:'fa',start:0,end:8},{row:'old-s3',language:'fa',start:8,end:15}]}],
};

for(const [name,oldRow,oldLanguage,oldOffset,targetRow,targetLanguage,targetOffset] of [
  ['old mixed-language piece','old','ar',2,'old-s1','fa',2],
  ['old Arabic piece boundary','old','ar',7,'old-s2','ar',0],
  ['old Persian piece boundary','old','fa',8,'old-s3','fa',0],
  ['new generated row is unchanged','old-s2','ar',2,'old-s2','ar',2],
] as const){
  test(`${name} opens the right current row and offset`,async ({page})=>{
    await page.route('**/data/items/dua-ahd.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(item)}));
    await page.goto(`./#/item/dua-ahd?row=${oldRow}&lang=${oldLanguage}&offset=${oldOffset}`);
    const reader=page.locator('main[data-screen="reader"]');
    await expect(reader).toHaveAttribute('data-anchor-row',targetRow);
    await expect(reader).toHaveAttribute('data-anchor-offset',String(targetOffset));
    await expect(reader.locator(`[data-row-id="${targetRow}"] p[lang="${targetLanguage}"]`)).toBeVisible();
  });
}

test('in-text search targets the current split row, not the retired source ID',async ({page})=>{
  await page.route('**/data/items/dua-ahd.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(item)}));
  await page.goto('./#/item/dua-ahd');
  await page.getByRole('button',{name:'جست‌وجو در متن'}).click();
  await page.getByRole('searchbox',{name:'جست‌وجو در این متن'}).fill('two');
  const hit=page.locator('.result-row[data-row-id="old-s3"][data-language="ar"]');
  await expect(hit).toBeVisible();
  await hit.locator('button').click();
  const reader=page.locator('main[data-screen="reader"]');
  await expect(reader).toHaveAttribute('data-anchor-row','old-s3');
  await expect(reader).toHaveAttribute('data-anchor-offset','3');
});

test('global search navigates to a current split row and exact match offset',async ({page})=>{
  await page.route('**/data/items/dua-ahd.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(item)}));
  await page.route('**/data/search-index.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    version:4,normalization:'nfkd-search-v2',records:[],shards:['search/000.json'],
  })}));
  await page.route('**/data/search/000.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    version:4,records:[{key:'row:dua-ahd:old-s3:ar',section:'text',item:'dua-ahd',row:'old-s3',language:'ar',
      text:'AR two.',normalized:'ar two',featured:false,order:0}],
  })}));
  await page.goto('./');
  await page.getByRole('searchbox',{name:'جست‌وجو در فهرست و متن'}).fill('two');
  const hit=page.locator('.search-result[data-item-id="dua-ahd"][data-row-id="old-s3"]');
  await expect(hit).toBeVisible();
  await hit.locator('button').click();
  await expect(page).toHaveURL(/#\/item\/dua-ahd\?row=old-s3&lang=ar&offset=3/);
  const reader=page.locator('main[data-screen="reader"]');
  await expect(reader).toHaveAttribute('data-anchor-row','old-s3');
  await expect(reader).toHaveAttribute('data-anchor-offset','3');
});

for(const mode of ['wide-25','wide-50'] as const){
  test(`${mode} resolves an old link before preparing the current row and searching`,async ({page})=>{
    await page.addInitScript(layout=>localStorage.setItem('mafatih.reader.preferences.v1',JSON.stringify({
      font:'scheherazade',arabicSize:100,translationSize:100,explanationSize:100,wideLayout:layout,
    })),mode);
    await page.route('**/data/items/dua-ahd.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(item)}));
    await page.goto('./#/item/dua-ahd?row=old&lang=ar&offset=15');
    const reader=page.locator('main[data-screen="reader"]');
    await expect(reader).toHaveAttribute('data-wide-layout',mode);
    await expect(reader).toHaveAttribute('data-anchor-row','old-s3');
    await expect(reader).toHaveAttribute('data-anchor-offset','0');
    await page.getByRole('button',{name:'جست‌وجو در متن'}).click();
    await page.getByRole('searchbox',{name:'جست‌وجو در این متن'}).fill('two');
    const hit=page.locator('.result-row[data-row-id="old-s3"][data-language="ar"]');
    await expect(hit).toBeVisible();await hit.locator('button').click();
    await expect(reader).toHaveAttribute('data-anchor-row','old-s3');
    await expect(reader).toHaveAttribute('data-anchor-offset','3');
  });
}

const mergedItem={
  ...item,
  rows:[{id:'joined',ar:'abc😀ef',fa:'یکدو',kind:'recitation'}],
  row_split_redirects:[
    {original:{id:'original-first'},ar:[{row:'joined',language:'ar',start:0,end:4,target_start:0}],
      fa:[{row:'joined',language:'fa',start:0,end:2,target_start:0}]},
    {original:{id:'original-second'},ar:[{row:'joined',language:'ar',start:0,end:2,target_start:4}],
      fa:[{row:'joined',language:'fa',start:0,end:2,target_start:2}]},
    {original:{id:'previous-output'},ar:[{row:'joined',language:'ar',start:0,end:2,target_start:4}],
      fa:[{row:'joined',language:'fa',start:0,end:2,target_start:2}]},
  ],
};
for(const [oldRow,language,oldOffset,targetOffset] of [
  ['original-second','ar',0,4],['previous-output','ar',1,5],['original-second','fa',1,3],
] as const){
  test(`merged row preserves ${oldRow}/${language} at its nonzero destination offset`,async ({page})=>{
    await page.route('**/data/items/dua-ahd.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mergedItem)}));
    await page.goto(`./#/item/dua-ahd?row=${oldRow}&lang=${language}&offset=${oldOffset}`);
    const reader=page.locator('main[data-screen="reader"]');
    await expect(reader).toHaveAttribute('data-anchor-row','joined');
    await expect(reader).toHaveAttribute('data-anchor-offset',String(targetOffset));
    await expect(reader.locator(`[data-row-id="joined"] p[lang="${language}"]`)).toBeVisible();
  });
}
