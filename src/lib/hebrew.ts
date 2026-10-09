const FINALS: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

/** Lowercase, strip niqqud and cantillation marks, and treat final letters as their regular form. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/[״"׳']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
