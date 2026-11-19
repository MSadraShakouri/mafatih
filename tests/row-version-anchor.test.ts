import assert from 'node:assert/strict';
import test from 'node:test';
import * as anchors from '../web/row-split-anchor.js';
import { itemHref, parseRoute } from '../web/routes.js';

const current='a'.repeat(40), previous='b'.repeat(40), unknown='c'.repeat(40);
const redirects: anchors.RowSplitRedirect[]=[{original:{id:'ordinary-old'},ar:[{row:'ordinary-now',language:'ar',start:0,end:4,target_start:2}],fa:[]}];
const versions: anchors.RowVersionEntry[]=[{
  id:'reused',
  current:{snapshots:[current],ar:[{row:'reused',language:'ar',start:0,end:3,target_start:0}],fa:[]},
  historical:[{snapshots:[previous],ar:[
    {row:'old-first',language:'ar',start:0,end:2,target_start:0},
    {row:'old-last',language:'fa',start:2,end:5,target_start:4},
  ],fa:[]}],
}];

test('versioned item URLs round-trip without changing old URLs or accepting ambiguous keys',()=>{
  const plain={row:'reused',language:'ar' as const,offset:3};
  assert.equal(itemHref('example',plain),'#/item/example?row=reused&lang=ar&offset=3');
  const url=`#/item/example?row=reused&lang=ar&offset=3&version=${previous}`;
  assert.deepEqual(parseRoute(url),{kind:'item',id:'example',anchor:{...plain,version:previous}});
  assert.equal(itemHref('example',{...plain,version:previous}),url);
  for(const bad of [
    `${url}&version=${current}`,
    '#/item/example?row=reused&lang=ar&offset=0&version=bbbb',
    `#/item/example?version=${previous}`,
    `#/item/example?row=reused&lang=ar&offset=0&version=${previous}&other=x`,
  ])assert.deepEqual(parseRoute(bad),{kind:'not-found'});
});

test('unversioned reused IDs require an explicit choice; named snapshots reach their own code-point locations',()=>{
  const resolve=(anchors as unknown as {resolveVersionedRowAnchor?: (...args:unknown[])=>any}).resolveVersionedRowAnchor;
  assert.equal(typeof resolve,'function','reader must not silently treat a reused identity as the latest version');
  const base={row:'reused',language:'ar',offset:2};
  const ambiguous=resolve!(redirects,versions,base);
  assert.equal(ambiguous.status,'ambiguous');
  assert.equal(ambiguous.choices.length,2);
  assert.deepEqual(ambiguous.choices[0].target,{row:'reused',language:'ar',offset:2});
  assert.deepEqual(ambiguous.choices[1].target,{row:'old-last',language:'fa',offset:4});
  assert.deepEqual(resolve!(redirects,versions,{...base,version:previous}),{
    status:'resolved',anchor:{row:'old-last',language:'fa',offset:4},meaning:'historical',
  });
  assert.deepEqual(resolve!(redirects,versions,{...base,version:current}),{
    status:'resolved',anchor:{row:'reused',language:'ar',offset:2},meaning:'current',
  });
  const missing=resolve!(redirects,versions,{...base,version:unknown});
  assert.equal(missing.status,'unknown-version');
  assert.equal(missing.choices.length,2);
});

test('unavailable language and offset fail closed; unaffected old links retain legacy resolution',()=>{
  const resolve=(anchors as unknown as {resolveVersionedRowAnchor?: (...args:unknown[])=>any}).resolveVersionedRowAnchor;
  assert.equal(typeof resolve,'function');
  assert.equal(resolve!(redirects,versions,{row:'reused',language:'fa',offset:0,version:previous}).status,'unavailable');
  assert.equal(resolve!(redirects,versions,{row:'reused',language:'ar',offset:6,version:previous}).status,'unavailable');
  assert.deepEqual(resolve!(redirects,versions,{row:'ordinary-old',language:'ar',offset:1}),{
    status:'resolved',anchor:{row:'ordinary-now',language:'ar',offset:3},meaning:'legacy',
  });
  assert.equal(resolve!(redirects,versions,{row:'ordinary-old',language:'ar',offset:1,version:unknown}).status,'unknown-version');
});

test('ordinary versioned current and preserved retired rows resolve strictly; stale versions offer a current choice',()=>{
  const version='d'.repeat(64), retired='e'.repeat(64);
  const live=[{id:'ordinary-now',ar:'xxabcd',fa:'',version},{id:'normal',ar:'A😀B',fa:'',version}];
  const records=[{...redirects[0]!,version:retired}];
  assert.deepEqual(anchors.resolveVersionedRowAnchor(records,[],{row:'normal',language:'ar',offset:2,version},live),{
    status:'resolved',anchor:{row:'normal',language:'ar',offset:2},meaning:'current',
  });
  assert.equal(anchors.resolveVersionedRowAnchor(records,[],{row:'normal',language:'ar',offset:4,version},live).status,'unavailable');
  assert.deepEqual(anchors.resolveVersionedRowAnchor(records,[],{row:'ordinary-old',language:'ar',offset:1,version:retired},live),{
    status:'resolved',anchor:{row:'ordinary-now',language:'ar',offset:3},meaning:'historical',
  });
  assert.equal(anchors.resolveVersionedRowAnchor(records,[],{row:'ordinary-old',language:'ar',offset:5,version:retired},live).status,'unavailable');
  const unknownResult=anchors.resolveVersionedRowAnchor(records,[],{row:'normal',language:'ar',offset:2,version:unknown},live);
  assert.equal(unknownResult.status,'unknown-version');
  if(unknownResult.status==='unknown-version')assert.deepEqual(unknownResult.choices[0]!.target,{row:'normal',language:'ar',offset:2});
});

test('conflicting snapshot labels and missing physical destinations fail closed',()=>{
  const duplicate=structuredClone(versions);
  duplicate[0]!.historical[0]!.snapshots.push(current);
  assert.equal(anchors.resolveVersionedRowAnchor(redirects,duplicate,{row:'reused',language:'ar',offset:1,version:current}).status,'invalid-data');
  const absent=[{id:'reused',ar:'new',fa:'',version:current}];
  assert.equal(anchors.resolveVersionedRowAnchor(redirects,versions,{row:'reused',language:'ar',offset:2,version:previous},absent).status,'unavailable');
});

test('a known reused ID cannot fall back to legacy behavior when cached item metadata is missing',()=>{
  const rows=[{id:'normal',ar:'new',fa:'',version:current}];
  assert.deepEqual(anchors.resolveVersionedRowAnchor([],[],{row:'normal',language:'ar',offset:1},rows,true),
    {status:'invalid-data',choices:[]});
  assert.deepEqual(anchors.resolveVersionedRowAnchor([],[],{row:'normal',language:'ar',offset:1,version:current},rows,true),
    {status:'invalid-data',choices:[]});
});
