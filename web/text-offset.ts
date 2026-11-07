/** Convert reader anchors without bundling the separate search implementation. */
export function utf16ToCodePointOffset(input: string, offset: number): number {
  return Array.from(input.slice(0, Math.max(0, Math.min(offset, input.length)))).length;
}

export function codePointToUtf16Offset(input: string, offset: number): number {
  if (!Number.isInteger(offset) || offset < 0) return 0;
  return Array.from(input).slice(0, offset).join('').length;
}
