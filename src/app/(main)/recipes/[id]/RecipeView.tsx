"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatAmount, ingredientMain, ingredientOriginal, minutesLabel } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import type { Category, Recipe } from "@/lib/types";

const MULTIPLIERS = [0.5, 1, 2, 3];

export default function RecipeView({ recipe, category }: { recipe: Recipe; category?: Category }) {
  const [factor, setFactor] = useState(1);
  const [struck, setStruck] = useState<Set<number>>(new Set());
  useWakeLock();

  const toggle = (i: number) =>
    setStruck((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const base = recipe.servings;
  const servings = base ? base * factor : null;
  const stepServings = (delta: number) => {
    if (!base || !servings) return;
    const next = Math.max(1, Math.round(servings) + delta);
    setFactor(next / base);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-4 text-lg">
      {recipe.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl(recipe.cover_image)} alt="" className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover" />
      )}

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold leading-tight">{recipe.title || "ללא שם"}</h1>
          {recipe.original_title && (
            <p className="mt-1 text-base text-muted" dir="auto">
              {recipe.original_title}
            </p>
          )}
        </div>
        <Link href={`/recipes/${recipe.id}/edit`} className="btn-ghost shrink-0 px-3 py-1.5 text-sm">
          ✏️ עריכה
        </Link>
      </div>
      {recipe.description && <p className="mt-3 text-ink/80">{recipe.description}</p>}

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {category && <Chip>{`${category.emoji} ${category.name}`}</Chip>}
        {recipe.prep_minutes ? <Chip>{`הכנה: ${minutesLabel(recipe.prep_minutes)}`}</Chip> : null}
        {recipe.cook_minutes ? <Chip>{`בישול: ${minutesLabel(recipe.cook_minutes)}`}</Chip> : null}
      </div>

      <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">מצרכים</h2>
          <div className="flex items-center gap-1 text-sm">
            {MULTIPLIERS.map((m) => (
              <button
                key={m}
                onClick={() => setFactor(m)}
                className={`min-w-10 rounded-lg border px-2 py-1 ${
                  Math.abs(factor - m) < 0.001 ? "border-accent bg-accent text-white" : "border-line"
                }`}
              >
                {m === 0.5 ? "½" : `x${m}`}
              </button>
            ))}
          </div>
        </div>
        {servings && (
          <div className="mb-3 flex items-center gap-3 text-base">
            <span className="text-muted">מנות:</span>
            <button onClick={() => stepServings(-1)} className="size-8 rounded-full border border-line" aria-label="פחות מנות">
              −
            </button>
            <span className="min-w-8 text-center font-semibold">{formatAmount(servings)}</span>
            <button onClick={() => stepServings(1)} className="size-8 rounded-full border border-line" aria-label="יותר מנות">
              +
            </button>
          </div>
        )}
        {recipe.ingredients.length === 0 ? (
          <p className="text-muted">אין מצרכים</p>
        ) : (
          <ul className="space-y-1">
            {recipe.ingredients.map((ing, i) =>
              ing.is_header ? (
                <li key={i} className="pt-3 font-bold text-accent">
                  {ing.item}
                </li>
              ) : (
                <li key={i}>
                  <button
                    onClick={() => toggle(i)}
                    className={`w-full py-1.5 text-start leading-snug transition ${struck.has(i) ? "text-muted line-through" : ""}`}
                  >
                    {ingredientMain(ing, factor)}
                    {ingredientOriginal(ing, factor) && (
                      <span className="ms-1.5 text-sm text-muted">({ingredientOriginal(ing, factor)})</span>
                    )}
                  </button>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-xl font-bold">אופן ההכנה</h2>
        <ol className="space-y-4">
          {recipe.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-white">
                {i + 1}
              </span>
              <p className="leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {recipe.notes && (
        <section className="mt-6 rounded-2xl bg-amber-50 p-4">
          <h2 className="mb-1 font-bold">הערות</h2>
          <p className="whitespace-pre-line text-base">{recipe.notes}</p>
        </section>
      )}

      {recipe.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {recipe.tags.map((t) => (
            <Chip key={t}>#{t}</Chip>
          ))}
        </div>
      )}

      {recipe.source_url && (
        <a href={recipe.source_url} target="_blank" rel="noreferrer" className="mt-6 block truncate text-base text-accent underline" dir="ltr">
          🔗 {recipe.source_url}
        </a>
      )}

      {recipe.images.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-muted">צילומי המסך המקוריים</h2>
          <div className="grid grid-cols-3 gap-2">
            {recipe.images.map((p) => (
              <a key={p} href={imageUrl(p)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(p)} alt="" className="aspect-[9/16] w-full rounded-lg border border-line object-cover object-top" loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-line bg-white px-3 py-1">{children}</span>;
}

/** Keeps the screen on while the recipe is open (re-acquired when returning to the tab). */
function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        if (document.visibilityState === "visible" && !cancelled) lock = await navigator.wakeLock.request("screen");
      } catch {
        // Not allowed (e.g. low battery mode); nothing to do.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}
