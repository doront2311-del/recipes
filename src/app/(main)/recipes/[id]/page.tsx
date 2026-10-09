import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { getCategories, getRecipe } from "@/lib/supabase";
import RecipeView from "./RecipeView";

export const dynamic = "force-dynamic";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipe, categories] = await Promise.all([getRecipe(id), getCategories()]);
  if (!recipe) notFound();
  const category = categories.find((c) => c.id === recipe.category_id);
  return (
    <>
      <Header back="/" />
      <RecipeView recipe={recipe} category={category} />
    </>
  );
}
