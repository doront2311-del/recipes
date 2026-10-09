import Header from "@/components/Header";
import { getCategories, getRecipes } from "@/lib/supabase";
import Settings from "./Settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [categories, recipes] = await Promise.all([getCategories(), getRecipes()]);
  const counts: Record<string, number> = {};
  for (const r of recipes) if (r.category_id) counts[r.category_id] = (counts[r.category_id] ?? 0) + 1;
  return (
    <>
      <Header title="הגדרות" back="/" />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <Settings categories={categories} counts={counts} />
      </main>
    </>
  );
}
