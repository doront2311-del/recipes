import { Suspense } from "react";
import Header from "@/components/Header";
import { getCategories, getRecipes } from "@/lib/supabase";
import Home from "./Home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [recipes, categories] = await Promise.all([getRecipes(), getCategories()]);
  return (
    <>
      <Header />
      <Suspense>
        <Home recipes={recipes} categories={categories} />
      </Suspense>
    </>
  );
}
