// Lucide @ 53fab88ff9d1b48f4704b5b5b560d6b4d560bf4c; see icons/LICENSE-lucide.txt.
// Share identical SVG chrome instead of repeating it in the startup bundle.
const svg = (body: string): string => "<svg aria-hidden=\"true\"\n  xmlns=\"http://www.w3.org/2000/svg\"\n  width=\"24\"\n  height=\"24\"\n  viewBox=\"0 0 24 24\"\n  fill=\"none\"\n  stroke=\"currentColor\"\n  stroke-width=\"2\"\n  stroke-linecap=\"round\"\n  stroke-linejoin=\"round\"\n>\n" + body + "\n</svg>";
export const ICONS = {
  back: svg("  <path d=\"m9 18 6-6-6-6\" />"),
  scroll: svg("  <path d=\"m7 6 5 5 5-5\" />\n  <path d=\"m7 13 5 5 5-5\" />"),
  search: svg("  <path d=\"m21 21-4.34-4.34\" />\n  <circle cx=\"11\" cy=\"11\" r=\"8\" />"),
  settings: svg("  <path d=\"M10 5H3\" />\n  <path d=\"M12 19H3\" />\n  <path d=\"M14 3v4\" />\n  <path d=\"M16 17v4\" />\n  <path d=\"M21 12h-9\" />\n  <path d=\"M21 19h-5\" />\n  <path d=\"M21 5h-7\" />\n  <path d=\"M8 10v4\" />\n  <path d=\"M8 12H3\" />"),
  next: svg("  <path d=\"m15 18-6-6 6-6\" />"),
  plus: svg("  <path d=\"M5 12h14\" />\n  <path d=\"M12 5v14\" />"),
  minus: svg("  <path d=\"M5 12h14\" />"),
  bookmark: svg("  <path d=\"M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z\" />"),
} as const;
export type IconName = keyof typeof ICONS;
