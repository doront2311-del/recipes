"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCategory, deleteCategory, reorderCategories, updateCategory } from "@/app/actions";
import type { Category } from "@/lib/types";

export default function Settings({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [deleting, setDeleting] = useState<Category | null>(null);

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const move = (i: number, dir: -1 | 1) => {
    const ids = categories.map((c) => c.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    run(() => reorderCategories(ids));
  };

  return (
    <div className={`space-y-8 ${pending ? "opacity-60" : ""}`}>
      <section>
        <h2 className="mb-3 text-lg font-bold">קטגוריות</h2>
        <div className="space-y-2">
          {categories.map((c, i) => (
            <CategoryRow
              key={`${c.id}-${c.name}-${c.emoji}`}
              category={c}
              count={counts[c.id] ?? 0}
              first={i === 0}
              last={i === categories.length - 1}
              onSave={(name, emoji) => run(() => updateCategory(c.id, name, emoji))}
              onMove={(dir) => move(i, dir)}
              onDelete={() => (counts[c.id] ? setDeleting(c) : confirm(`למחוק את "${c.name}"?`) && run(() => deleteCategory(c.id, null)))}
            />
          ))}
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            run(async () => {
              await addCategory(newName, newEmoji);
              setNewName("");
              setNewEmoji("");
            });
          }}
        >
          <input className="field w-14 text-center" placeholder="🍽️" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} />
          <input className="field flex-1" placeholder="קטגוריה חדשה" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button className="btn-primary" disabled={!newName.trim()}>
            הוספה
          </button>
        </form>
      </section>

      {deleting && (
        <DeleteDialog
          category={deleting}
          count={counts[deleting.id] ?? 0}
          others={categories.filter((c) => c.id !== deleting.id)}
          onCancel={() => setDeleting(null)}
          onConfirm={(moveTo) => {
            setDeleting(null);
            run(() => deleteCategory(deleting.id, moveTo));
          }}
        />
      )}

      <section>
        <button
          className="btn-ghost w-full"
          onClick={async () => {
            await fetch("/api/logout", { method: "POST" });
            window.location.href = "/login";
          }}
        >
          התנתקות
        </button>
      </section>
    </div>
  );
}

function CategoryRow({
  category,
  count,
  first,
  last,
  onSave,
  onMove,
  onDelete,
}: {
  category: Category;
  count: number;
  first: boolean;
  last: boolean;
  onSave: (name: string, emoji: string) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [emoji, setEmoji] = useState(category.emoji);
  const dirty = name !== category.name || emoji !== category.emoji;

  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-white p-2">
      <input className="field w-12 px-1 text-center" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
      <input className="field min-w-0 flex-1 px-2" value={name} onChange={(e) => setName(e.target.value)} />
      <span className="w-6 text-center text-xs text-muted">{count}</span>
      {dirty ? (
        <button className="btn-primary px-2.5 py-1.5 text-sm" onClick={() => name.trim() && onSave(name, emoji)}>
          שמור
        </button>
      ) : (
        <>
          <button className="p-1.5 text-muted disabled:opacity-30" disabled={first} onClick={() => onMove(-1)} aria-label="למעלה">
            ▲
          </button>
          <button className="p-1.5 text-muted disabled:opacity-30" disabled={last} onClick={() => onMove(1)} aria-label="למטה">
            ▼
          </button>
          <button className="p-1.5 text-red-600" onClick={onDelete} aria-label="מחיקה">
            🗑
          </button>
        </>
      )}
    </div>
  );
}

function DeleteDialog({
  category,
  count,
  others,
  onCancel,
  onConfirm,
}: {
  category: Category;
  count: number;
  others: Category[];
  onCancel: () => void;
  onConfirm: (moveTo: string | null) => void;
}) {
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? "");
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onCancel}>
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-cream p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold">מחיקת &quot;{category.name}&quot;</h3>
        <p>
          יש בקטגוריה {count} מתכונים. לאן להעביר אותם?
        </p>
        <select className="field" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
          {others.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
          <option value="">בלי קטגוריה</option>
        </select>
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={onCancel}>
            ביטול
          </button>
          <button className="btn flex-1 bg-red-600 text-white" onClick={() => onConfirm(moveTo || null)}>
            מחיקה והעברה
          </button>
        </div>
      </div>
    </div>
  );
}
