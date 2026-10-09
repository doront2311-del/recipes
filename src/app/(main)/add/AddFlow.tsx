"use client";

import { useEffect, useState } from "react";
import { discardDraftImages } from "@/app/actions";
import RecipeForm from "@/components/RecipeForm";
import { compressImage } from "@/lib/compress";
import type { Category, RecipeDraft } from "@/lib/types";

type Shot = { file: File; preview: string };

export default function AddFlow({ initialUrl, categories }: { initialUrl: string; categories: Category[] }) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<RecipeDraft | null>(null);

  useEffect(() => () => shots.forEach((s) => URL.revokeObjectURL(s.preview)), [shots]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setShots((prev) => [...prev, ...added].slice(0, 10));
  };

  async function submit() {
    if (!url.trim() && !text.trim() && shots.length === 0) {
      setError("צריך להוסיף לפחות לינק, צילום מסך או טקסט");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("url", url.trim());
      body.append("text", text.trim());
      const compressed = await Promise.all(shots.map((s) => compressImage(s.file)));
      compressed.forEach((f, i) => body.append("images", f, `shot-${i}.jpg`));
      const res = await fetch("/api/extract", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "משהו השתבש. נסה שוב.");
      setDraft(json.draft);
    } catch (e) {
      setError(e instanceof Error ? e.message : "משהו השתבש. נסה שוב.");
    } finally {
      setBusy(false);
    }
  }

  if (draft) {
    return (
      <>
        <p className="mb-4 rounded-xl bg-white p-3 text-sm text-muted">
          זה מה ש-Claude הבין. תקן מה שצריך ושמור.
        </p>
        <RecipeForm
          initial={draft}
          categories={categories}
          onCancel={() => {
            discardDraftImages([draft.cover_image, ...draft.images].filter((p): p is string => !!p));
            setDraft(null);
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <label className="block">
        <span className="mb-1 block font-semibold">לינק</span>
        <input
          className="field"
          type="url"
          dir="ltr"
          placeholder="https://www.instagram.com/reel/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>

      <div>
        <span className="mb-1 block font-semibold">צילומי מסך של המתכון</span>
        <p className="mb-2 text-sm text-muted">באינסטגרם: לחץ &quot;עוד&quot; מתחת לסרטון וצלם את כל הטקסט, גם בכמה צילומים.</p>
        <div className="grid grid-cols-4 gap-2">
          {shots.map((s, i) => (
            <div key={s.preview} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.preview} alt="" className="aspect-[9/16] w-full rounded-lg object-cover object-top" />
              <button
                type="button"
                className="absolute -top-2 -start-2 flex size-6 items-center justify-center rounded-full bg-ink text-xs text-white"
                onClick={() => setShots(shots.filter((_, j) => j !== i))}
                aria-label="הסרת צילום"
              >
                ✕
              </button>
            </div>
          ))}
          <label className="flex aspect-[9/16] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-white text-muted">
            <span className="text-3xl">+</span>
            <span className="text-xs">הוספה</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </label>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block font-semibold">טקסט (לא חובה)</span>
        <textarea
          className="field min-h-28"
          placeholder="אפשר להדביק כאן את טקסט המתכון"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      {error && <p className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}

      <button className="btn-primary w-full py-3.5 text-lg" onClick={submit} disabled={busy}>
        {busy ? "Claude קורא את המתכון…" : "✨ צור מתכון"}
      </button>
      {busy && <p className="text-center text-sm text-muted">זה לוקח בדרך כלל 20–40 שניות</p>}
    </div>
  );
}
