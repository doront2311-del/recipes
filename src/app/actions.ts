"use server";

import { revalidatePath } from "next/cache";
import { db, getRecipe, removeImages } from "@/lib/supabase";
import type { RecipeDraft } from "@/lib/types";

export async function saveRecipe(draft: RecipeDraft): Promise<string> {
  const row = {
    title: draft.title.trim(),
    original_title: draft.original_title.trim(),
    description: draft.description.trim(),
    category_id: draft.category_id,
    tags: draft.tags.map((t) => t.trim()).filter(Boolean),
    ingredients: draft.ingredients.filter((i) => i.item.trim() || i.unit.trim() || i.amount != null),
    steps: draft.steps.map((s) => s.trim()).filter(Boolean),
    prep_minutes: draft.prep_minutes,
    cook_minutes: draft.cook_minutes,
    servings: draft.servings,
    notes: draft.notes.trim(),
    source_url: draft.source_url.trim(),
    cover_image: draft.cover_image,
    images: draft.images,
    original_text: draft.original_text,
    updated_at: new Date().toISOString(),
  };

  let id = draft.id;
  if (id) {
    const before = await getRecipe(id);
    const { error } = await db().from("recipes").update(row).eq("id", id);
    if (error) throw error;
    if (before) {
      const kept = new Set([row.cover_image, ...row.images]);
      await removeImages([before.cover_image, ...before.images].filter((p): p is string => !!p && !kept.has(p)));
    }
  } else {
    const { data, error } = await db().from("recipes").insert(row).select("id").single();
    if (error) throw error;
    id = data.id as string;
  }
  revalidatePath("/", "layout");
  return id;
}

export async function deleteRecipe(id: string) {
  const recipe = await getRecipe(id);
  const { error } = await db().from("recipes").delete().eq("id", id);
  if (error) throw error;
  if (recipe) await removeImages([recipe.cover_image, ...recipe.images].filter((p): p is string => !!p));
  revalidatePath("/", "layout");
}

/** Drops images uploaded for a draft that was never saved. */
export async function discardDraftImages(paths: string[]) {
  await removeImages(paths.filter((p) => p.startsWith("screenshots/") || p.startsWith("covers/")));
}

export async function addCategory(name: string, emoji: string) {
  const { data } = await db().from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const next = (data?.[0]?.sort_order ?? 0) + 1;
  const { error } = await db().from("categories").insert({ name: name.trim(), emoji: emoji.trim() || "🍽️", sort_order: next });
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function updateCategory(id: string, name: string, emoji: string) {
  const { error } = await db().from("categories").update({ name: name.trim(), emoji: emoji.trim() || "🍽️" }).eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function reorderCategories(ids: string[]) {
  await Promise.all(ids.map((id, i) => db().from("categories").update({ sort_order: i + 1 }).eq("id", id)));
  revalidatePath("/", "layout");
}

/** Deletes a category, first moving its recipes to another one (or to none). */
export async function deleteCategory(id: string, moveTo: string | null) {
  const { error: moveError } = await db().from("recipes").update({ category_id: moveTo }).eq("category_id", id);
  if (moveError) throw moveError;
  const { error } = await db().from("categories").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
}
