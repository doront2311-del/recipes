import type { Ingredient } from "./types";

const FRACTIONS: [number, string][] = [
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];

/** 1.5 -> "1½", 0.333 -> "⅓", 1.4999 -> "1½", 237.4 -> "237". */
export function formatAmount(n: number): string {
  if (n >= 20) return String(Math.round(n));
  const whole = Math.floor(n);
  const rest = n - whole;
  if (rest < 0.05) return String(whole);
  if (rest > 0.95) return String(whole + 1);
  for (const [value, symbol] of FRACTIONS) {
    // LTR isolate so "1½" isn't shown as "½1" inside Hebrew text.
    if (Math.abs(rest - value) < 0.05) return whole ? `\u2066${whole}${symbol}\u2069` : symbol;
  }
  return String(Math.round(n * 10) / 10);
}

export function ingredientMain(ing: Ingredient, factor = 1): string {
  const amount = ing.amount == null ? "" : formatAmount(ing.amount * factor);
  return [amount, ing.unit, ing.item].filter(Boolean).join(" ");
}

/** The pre-conversion amount shown in small text, e.g. "1 כוס". Empty when nothing was converted. */
export function ingredientOriginal(ing: Ingredient, factor = 1): string {
  if (!ing.orig_unit) return "";
  const amount = ing.orig_amount == null ? "" : formatAmount(ing.orig_amount * factor);
  return [amount, ing.orig_unit].filter(Boolean).join(" ");
}

export function minutesLabel(min: number | null): string {
  if (!min) return "";
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} שע׳ ${m} דק׳` : `${h} שע׳`;
}
