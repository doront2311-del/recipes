import Fuse from "fuse.js";
import { normalize } from "./hebrew";
import type { Recipe } from "./types";

type SearchDoc = {
  id: string;
  title: string;
  tags: string;
  ingredients: string;
  description: string;
  steps: string;
  notes: string;
  original: string;
};

export function buildSearch(recipes: Recipe[]) {
  const docs: SearchDoc[] = recipes.map((r) => ({
    id: r.id,
    title: normalize(`${r.title} ${r.original_title}`),
    tags: normalize(r.tags.join(" ")),
    ingredients: normalize(r.ingredients.map((i) => `${i.unit} ${i.item}`).join(" | ")),
    description: normalize(r.description),
    steps: normalize(r.steps.join(" | ")),
    notes: normalize(r.notes),
    original: normalize(r.original_text),
  }));

  const fuse = new Fuse(docs, {
    keys: [
      { name: "title", weight: 3 },
      { name: "tags", weight: 2 },
      { name: "ingredients", weight: 2 },
      { name: "description", weight: 1 },
      { name: "steps", weight: 1 },
      { name: "notes", weight: 1 },
      { name: "original", weight: 1 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
    ignoreFieldNorm: true,
    minMatchCharLength: 2,
    // Space-separated words must all match (each one fuzzily).
    useExtendedSearch: true,
  });

  return (query: string): string[] => {
    const q = normalize(query.replace(/[=!^$|'"]/g, " "));
    if (!q) return [];
    return fuse.search(q).map((r) => r.item.id);
  };
}
