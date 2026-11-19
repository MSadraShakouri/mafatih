import { expect, type APIRequestContext, type Page } from '@playwright/test';

type Language = 'ar' | 'fa';
type Segment = { row: string; language: Language; start: number; end: number; target_start?: number };
export type RuntimeItem = { rows: Array<{ id: string; ar: string; fa: string; kind?: string }>;
  row_split_redirects?: Array<{ original: { id: string }; ar: Segment[]; fa: Segment[] }> };

export async function runtimeItem(request: APIRequestContext, id: string): Promise<RuntimeItem> {
  const response = await request.get(`./data/items/${id}.json`);
  if (!response.ok()) throw new Error(`Could not load test item ${id}: ${response.status()}`);
  return await response.json() as RuntimeItem;
}

/** Inspect the actual original-field mapping; never assume a current row keeps
 * an old row's ID or language slot after a physical split. */
export function sourceSegments(item: RuntimeItem, oldRow: string, language: Language): Segment[] {
  const redirect = item.row_split_redirects?.find(entry => entry.original.id === oldRow);
  if (redirect?.[language].length) return redirect[language];
  const row = item.rows.find(entry => entry.id === oldRow), value = row?.[language];
  if (!value) throw new Error(`Missing source field ${oldRow}/${language}`);
  return [{ row: oldRow, language, start: 0, end: Array.from(value).length, target_start: 0 }];
}

export function sourceValue(item: RuntimeItem, oldRow: string, language: Language): string {
  let end = 0, value = '';
  for (const part of sourceSegments(item, oldRow, language)) {
    if (part.start !== end) throw new Error(`Noncontiguous original field ${oldRow}/${language}`);
    const row = item.rows.find(entry => entry.id === part.row);
    if (!row) throw new Error(`Missing target row ${part.row}`);
    const slice = Array.from(row[part.language]).slice(part.target_start ?? 0, (part.target_start ?? 0) + part.end - part.start);
    if (slice.length !== part.end - part.start) throw new Error(`Short target field ${part.row}/${part.language}`);
    value += slice.join(''); end = part.end;
  }
  return value;
}

export function sourceTarget(item: RuntimeItem, oldRow: string, language: Language, offset = 0): Segment {
  const segments = sourceSegments(item, oldRow, language);
  const part = segments.find(entry => entry.start <= offset && offset < entry.end);
  if (!part) throw new Error(`Source offset not present: ${oldRow}/${language}/${offset}`);
  return part;
}

/** Reconstruct what the reader actually rendered, including cross-language
 * slices and nonzero target offsets, rather than just concatenating whole rows. */
export async function displayedSource(page: Page, item: RuntimeItem, oldRow: string, language: Language): Promise<string> {
  let value = '', end = 0;
  for (const part of sourceSegments(item, oldRow, language)) {
    if (part.start !== end) throw new Error(`Noncontiguous original field ${oldRow}/${language}`);
    const paragraph = page.locator(`article [data-row-id="${part.row}"] p[lang="${part.language}"]`);
    await expect(paragraph).toBeVisible();
    const displayed = Array.from((await paragraph.textContent()) ?? '');
    value += displayed.slice(part.target_start ?? 0, (part.target_start ?? 0) + part.end - part.start).join('');
    end = part.end;
  }
  return value;
}
