import { createHash } from 'node:crypto';
export function sha256(s: string): string { return createHash('sha256').update(s, 'utf8').digest('hex'); }
export function textId(s: string): string { return 't' + sha256(s).slice(0, 24); }
export function claimId(s: string): string { return 'c' + sha256(s).slice(0, 24); }
export function codePoints(s: string): string[] { return Array.from(s); }
export function slicePoints(s: string, start: number, end: number): string { return codePoints(s).slice(start,end).join(''); }
