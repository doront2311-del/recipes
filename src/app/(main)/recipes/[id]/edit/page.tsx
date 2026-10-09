import { notFound } from "next/navigation";
import Header from "@/components/Header";
import RecipeForm from "@/components/RecipeForm";
import { getCategories, getRecipe } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipe, categories] = await Promise.all([getRecipe(id), getCategories()]);
  if (!recipe) notFound();
  return (
    <>
      <Header title="עריכת מתכון" back={`/recipes/${id}`} />
      <main className="mx-auto max-w-2xl px-4 pt-4">
        <RecipeForm initial={recipe} categories={categories} cancelHref={`/recipes/${id}`} />
      </main>
    </>
  );
}
