"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { deleteRecipe, saveRecipe } from "@/app/actions";
import { compressImage } from "@/lib/compress";
import { imageUrl } from "@/lib/images";
import { emptyIngredient, type Category, type Ingredient, type RecipeDraft } from "@/lib/types";

type Props = {
  initial: RecipeDraft;
  categories: Category[];
  /** Where "ביטול" goes; or pass onCancel for custom handling. */
  cancelHref?: string;
  onCancel?: () => void;
};

export default function RecipeForm({ initial, categories, cancelHref, onCancel }: Props) {
  const router = useRouter();
  const [r, setR] = useState<RecipeDraft>(initial);
  const [tagsText, setTagsText] = useState(initial.tags.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) => setR((prev) => ({ ...prev, [key]: value }));

  const setIngredient = (i: number, patch: Partial<Ingredient>) =>
    set("ingredients", r.ingredients.map((ing, j) => (j === i ? { ...ing, ...patch } : ing)));

  async function replaceCover(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", await compressImage(file));
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      set("cover_image", json.path);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "העלאת התמונה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!r.title.trim()) {
      setError("צריך שם למתכון");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const tags = tagsText.split(/[,،]/).map((t) => t.trim()).filter(Boolean);
      const id = await saveRecipe({ ...r, tags });
      router.push(`/recipes/${id}`);
      router.refresh();
    } catch {
      setError("השמירה נכשלה. נסה שוב.");
      setBusy(false);
    }
  }

  async function remove() {
    if (!r.id || !confirm("למחוק את המתכון? אי אפשר לבטל.")) return;
    setBusy(true);
    await deleteRecipe(r.id);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-5 pb-28">
      <Section title="תמונה">
        <div className="flex items-center gap-3">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl bg-white text-4xl">
            {r.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl(r.cover_image)} alt="" className="size-full object-cover" />
            ) : (
              (categories.find((c) => c.id === r.category_id)?.emoji ?? "🍽️")
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="btn-ghost cursor-pointer px-3 py-1.5 text-sm">
              {r.cover_image ? "החלפת תמונה" : "הוספת תמונה"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && replaceCover(e.target.files[0])}
              />
            </label>
            {r.cover_image && (
              <button type="button" className="text-sm text-red-600" onClick={() => set("cover_image", null)}>
                הסרת תמונה
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section title="פרטים">
        <Label text="שם המתכון">
          <input className="field text-lg font-semibold" value={r.title} onChange={(e) => set("title", e.target.value)} />
        </Label>
        <Label text="שם מקורי">
          <input className="field" dir="auto" value={r.original_title} onChange={(e) => set("original_title", e.target.value)} />
        </Label>
        <Label text="תיאור קצר">
          <AutoTextarea value={r.description} onChange={(v) => set("description", v)} />
        </Label>
        <Label text="קטגוריה">
          <select className="field" value={r.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}>
            <option value="">ללא</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </Label>
        <Label text="תגיות (מופרדות בפסיק)">
          <input className="field" value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        </Label>
        <div className="grid grid-cols-3 gap-2">
          <Label text="הכנה (דק׳)">
            <NumberInput value={r.prep_minutes} onChange={(v) => set("prep_minutes", v)} />
          </Label>
          <Label text="בישול (דק׳)">
            <NumberInput value={r.cook_minutes} onChange={(v) => set("cook_minutes", v)} />
          </Label>
          <Label text="מנות">
            <NumberInput value={r.servings} onChange={(v) => set("servings", v)} />
          </Label>
        </div>
      </Section>

      <Section title="מצרכים">
        <div className="space-y-2">
          {r.ingredients.map((ing, i) => (
            <div key={i} className="rounded-xl border border-line bg-white p-2">
              {ing.is_header ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">כותרת</span>
                  <input className="field font-bold" value={ing.item} onChange={(e) => setIngredient(i, { item: e.target.value })} />
                  <RemoveButton onClick={() => set("ingredients", r.ingredients.filter((_, j) => j !== i))} />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <NumberInput className="w-16 shrink-0 px-2" placeholder="כמות" value={ing.amount} onChange={(v) => setIngredient(i, { amount: v })} />
                    <input className="field w-20 shrink-0 px-2" placeholder="יחידה" value={ing.unit} onChange={(e) => setIngredient(i, { unit: e.target.value })} />
                    <input className="field min-w-0 flex-1 px-2" placeholder="מצרך" value={ing.item} onChange={(e) => setIngredient(i, { item: e.target.value })} />
                    <RemoveButton onClick={() => set("ingredients", r.ingredients.filter((_, j) => j !== i))} />
                  </div>
                  {ing.orig_unit && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
                      <span>במקור:</span>
                      <NumberInput className="w-16 px-2 py-1" value={ing.orig_amount} onChange={(v) => setIngredient(i, { orig_amount: v })} />
                      <input className="field w-24 px-2 py-1" value={ing.orig_unit} onChange={(e) => setIngredient(i, { orig_unit: e.target.value })} />
                      <button type="button" className="text-xs underline" onClick={() => setIngredient(i, { orig_amount: null, orig_unit: "" })}>
                        הסר
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost text-sm" onClick={() => set("ingredients", [...r.ingredients, emptyIngredient()])}>
            + מצרך
          </button>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={() => set("ingredients", [...r.ingredients, { ...emptyIngredient(), is_header: true }])}
          >
            + כותרת
          </button>
        </div>
      </Section>

      <Section title="אופן ההכנה">
        <div className="space-y-2">
          {r.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2.5 w-5 shrink-0 text-center font-bold text-accent">{i + 1}</span>
              <AutoTextarea value={step} onChange={(v) => set("steps", r.steps.map((s, j) => (j === i ? v : s)))} />
              <RemoveButton onClick={() => set("steps", r.steps.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost text-sm" onClick={() => set("steps", [...r.steps, ""])}>
          + שלב
        </button>
      </Section>

      <Section title="הערות">
        <AutoTextarea value={r.notes} onChange={(v) => set("notes", v)} minRows={3} />
      </Section>

      <Section title="מקור">
        <input className="field" dir="ltr" placeholder="https://" value={r.source_url} onChange={(e) => set("source_url", e.target.value)} />
      </Section>

      {r.images.length > 0 && (
        <Section title="צילומי מסך">
          <div className="grid grid-cols-4 gap-2">
            {r.images.map((p) => (
              <div key={p} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(p)} alt="" className="aspect-[9/16] w-full rounded-lg object-cover object-top" />
                <button
                  type="button"
                  className="absolute -top-2 -start-2 flex size-6 items-center justify-center rounded-full bg-ink text-xs text-white"
                  onClick={() => set("images", r.images.filter((x) => x !== p))}
                  aria-label="הסרת צילום"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </Section>
      )}

      <details className="rounded-xl bg-white p-3 text-sm">
        <summary className="cursor-pointer text-muted">טקסט מקורי (משמש לחיפוש)</summary>
        <AutoTextarea value={r.original_text} onChange={(v) => set("original_text", v)} minRows={4} dir="auto" />
      </details>

      {r.id && (
        <button type="button" className="w-full py-2 text-red-600" onClick={remove} disabled={busy}>
          מחיקת המתכון
        </button>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          {error && <span className="flex-1 text-sm text-red-600">{error}</span>}
          <div className="ms-auto flex gap-2">
            {(onCancel || cancelHref) && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => (onCancel ? onCancel() : router.push(cancelHref!))}
                disabled={busy}
              >
                ביטול
              </button>
            )}
            <button type="button" className="btn-primary min-w-28" onClick={save} disabled={busy}>
              {busy ? "רגע…" : "שמירה"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted">{text}</span>
      {children}
    </label>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded-full p-1.5 text-muted" aria-label="הסרה">
      ✕
    </button>
  );
}

/** Number field that lets you type "1." or "0.5" without the value jumping around. */
function NumberInput({
  value,
  onChange,
  className = "",
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  className?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => {
    if (value !== parseNumber(text)) setText(value == null ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      className={`field ${className}`}
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseNumber(e.target.value));
      }}
    />
  );
}

function parseNumber(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function AutoTextarea({
  value,
  onChange,
  minRows = 1,
  dir,
}: {
  value: string;
  onChange: (v: string) => void;
  minRows?: number;
  dir?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="field min-w-0 flex-1 resize-none overflow-hidden"
      rows={minRows}
      dir={dir}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
