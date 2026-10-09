import "server-only";
import { createClient } from "@supabase/supabase-js";
import { BUCKET } from "./images";
import type { Category, Recipe } from "./types";

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await db().from("categories").select("*").order("sort_order");
  if (error) throw error;
  return data as Category[];
}

export async function getRecipes(): Promise<Recipe[]> {
  const { data, error } = await db().from("recipes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Recipe[]).map(normalizeRecipe);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const { data, error } = await db().from("recipes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeRecipe(data as Recipe) : null;
}

function normalizeRecipe(r: Recipe): Recipe {
  return { ...r, servings: r.servings == null ? null : Number(r.servings) };
}

export async function uploadImage(bytes: ArrayBuffer | Uint8Array, contentType: string, folder: string) {
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(path, bytes, { contentType });
  if (error) throw error;
  return path;
}

export async function removeImages(paths: string[]) {
  if (paths.length === 0) return;
  await db().storage.from(BUCKET).remove(paths);
}
