"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import RecipeCard from "@/components/RecipeCard";
import { buildSearch } from "@/lib/search";
import type { Category, Recipe } from "@/lib/types";

export default function Home({ recipes, categories }: { recipes: Recipe[]; categories: Category[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const selected = params.get("c");
  const [query, setQuery] = useState(params.get("q") ?? "");

  const search = useMemo(() => buildSearch(recipes), [recipes]);
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of recipes) if (r.category_id) m.set(r.category_id, (m.get(r.category_id) ?? 0) + 1);
    return m;
  }, [recipes]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    // Native history keeps the URL shareable/back-button friendly without a server round trip.
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  const searching = query.trim().length > 0;
  let list: Recipe[] = searching
    ? search(query).map((id) => byId.get(id)!).filter(Boolean)
    : recipes;
  if (selected) list = list.filter((r) => r.category_id === selected);

  const heading = searching
    ? `${list.length} תוצאות`
    : selected
      ? catById.get(selected)?.name
      : "נוספו לאחרונה";

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
      <div className="relative">
        <input
          type="search"
          className="field ps-10 text-base"
          placeholder="חיפוש: שם, מצרך, משהו מההוראות…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setParam("q", e.target.value || null);
          }}
          enterKeyHint="search"
        />
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted">🔍</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {categories.map((c) => {
          const active = c.id === selected;
          return (
            <button
              key={c.id}
              onClick={() => setParam("c", active ? null : c.id)}
              className={`flex flex-col items-center rounded-2xl border px-1 py-2.5 text-sm transition ${
                active ? "border-accent bg-accent text-white" : "border-line bg-white"
              }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="mt-1 leading-tight">{c.name}</span>
              <span className={`text-xs ${active ? "text-white/80" : "text-muted"}`}>{counts.get(c.id) ?? 0}</span>
            </button>
          );
        })}
      </div>

      <h2 className="mb-2 mt-6 text-sm font-semibold text-muted">{heading}</h2>
      {recipes.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-muted">
          עוד אין מתכונים. לחץ על &quot;+ מתכון&quot; כדי להוסיף את הראשון.
        </p>
      ) : list.length === 0 ? (
        <p className="p-6 text-center text-muted">לא נמצאו מתכונים</p>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <RecipeCard key={r.id} recipe={r} category={r.category_id ? catById.get(r.category_id) : undefined} />
          ))}
        </div>
      )}
    </main>
  );
}
