/** Convert reader anchors without bundling the separate search implementation. */
export function utf16ToCodePointOffset(input: string, offset: number): number {
  return Array.from(input.slice(0, Math.max(0, Math.min(offset, input.length)))).length;
}

export function codePointToUtf16Offset(input: string, offset: number): number {
  if (!Number.isInteger(offset) || offset < 0) return 0;
  return Array.from(input).slice(0, offset).join('').length;
}

/** Map an offset in a paragraph's concatenated display text through marker spans. */
export function textPoint(root: Node, utf16Offset: number): { node: Text; offset: number } | undefined {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, utf16Offset), node: Text | null, last: Text | undefined;
  while ((node = walker.nextNode() as Text | null)) {
    last = node;
    // At an internal node boundary, the offset denotes the next character.
    // Prefer its node so a match at the start of a wrapped fragment is aligned
    // to that line, not to the end of the previous line.
    if (remaining < node.length) return { node, offset: remaining };
    remaining -= node.length;
  }
  return last ? { node: last, offset: last.length } : undefined;
}

/** An original/display UTF-16 range can span any number of text and marker nodes. */
export function textRange(root: Node, start: number, end = start): Range | undefined {
  const a = textPoint(root, start), b = textPoint(root, Math.max(start, end));
  if (!a || !b) return undefined;
  const range = document.createRange(); range.setStart(a.node, a.offset); range.setEnd(b.node, b.offset);
  return range;
}

/** Convert a caret inside a nested marker back to the paragraph's linear UTF-16 offset. */
export function textOffset(root: Node, node: Node, offset: number): number | undefined {
  if (root !== node && !root.contains(node)) return undefined;
  try {
    const range = document.createRange(); range.selectNodeContents(root); range.setEnd(node, offset);
    return range.toString().length;
  } catch { return undefined; }
}
