import { NextResponse } from "next/server";
import { extractRecipe, RecipeExtractionError, type ImageInput } from "@/lib/claude";
import { downloadImage, extractFromUrl } from "@/lib/extract-url";
import { getCategories, uploadImage } from "@/lib/supabase";
import type { RecipeDraft } from "@/lib/types";

export const maxDuration = 120;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export async function POST(req: Request) {
  const form = await req.formData();
  const url = String(form.get("url") ?? "").trim();
  const pastedText = String(form.get("text") ?? "").trim();
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);

  if (!url && !pastedText && files.length === 0) {
    return NextResponse.json({ error: "צריך להוסיף לפחות לינק, צילום מסך או טקסט" }, { status: 400 });
  }

  const extraction = url ? await extractFromUrl(url) : null;

  if (url && !pastedText && files.length === 0 && !extraction?.useful) {
    return NextResponse.json(
      {
        error:
          "לא הצלחתי לקרוא את המתכון מהלינק (אינסטגרם וטיקטוק לרוב מסתירים את הטקסט). פתח את התיאור בסרטון, צלם מסך והוסף את הצילומים כאן.",
      },
      { status: 422 },
    );
  }

  const images: ImageInput[] = [];
  const buffers: { bytes: ArrayBuffer; type: string }[] = [];
  for (const file of files.slice(0, 10)) {
    const type = MEDIA_TYPES.find((t) => t === file.type) ?? "image/jpeg";
    const bytes = await file.arrayBuffer();
    buffers.push({ bytes, type });
    images.push({ base64: Buffer.from(bytes).toString("base64"), mediaType: type });
  }

  const categories = await getCategories();

  let recipe;
  try {
    recipe = await extractRecipe({
      categories: categories.map((c) => c.name),
      urlText: extraction?.text ?? "",
      pastedText,
      images,
    });
  } catch (err) {
    if (err instanceof RecipeExtractionError) return NextResponse.json({ error: err.message }, { status: 502 });
    console.error(err);
    return NextResponse.json({ error: "משהו השתבש. נסה שוב." }, { status: 500 });
  }

  if (!recipe.found_recipe) {
    return NextResponse.json(
      { error: "לא מצאתי מתכון בחומר ששלחת. נסה להוסיף צילום מסך של התיאור המלא (אחרי שלוחצים על 'עוד')." },
      { status: 422 },
    );
  }

  // Keep the screenshots and the video thumbnail only once we know there's a recipe.
  const [screenshotPaths, coverPath] = await Promise.all([
    Promise.all(buffers.map((b) => uploadImage(b.bytes, b.type, "screenshots"))),
    (async () => {
      if (!extraction?.imageUrl) return null;
      const img = await downloadImage(extraction.imageUrl);
      return img ? uploadImage(img.bytes, img.contentType, "covers") : null;
    })(),
  ]);

  const draft: RecipeDraft = {
    title: recipe.title,
    original_title: recipe.original_title,
    description: recipe.description,
    category_id: categories.find((c) => c.name === recipe.category)?.id ?? null,
    tags: recipe.tags,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    prep_minutes: recipe.prep_minutes,
    cook_minutes: recipe.cook_minutes,
    servings: recipe.servings,
    notes: recipe.notes,
    source_url: url,
    cover_image: coverPath,
    images: screenshotPaths,
    original_text: recipe.original_text,
  };
  return NextResponse.json({ draft });
}
