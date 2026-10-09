import Link from "next/link";
import { minutesLabel } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import type { Category, Recipe } from "@/lib/types";

export default function RecipeCard({ recipe, category }: { recipe: Recipe; category?: Category }) {
  const time = minutesLabel((recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0));
  return (
    <Link href={`/recipes/${recipe.id}`} className="flex items-center gap-3 rounded-2xl bg-white p-2 shadow-sm active:bg-line/40">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-cream text-3xl">
        {recipe.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(recipe.cover_image)} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          (category?.emoji ?? "🍽️")
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate font-semibold">{recipe.title || "ללא שם"}</div>
        <div className="truncate text-sm text-muted">
          {[category?.name, time].filter(Boolean).join(" · ")}
        </div>
      </div>
    </Link>
  );
}
