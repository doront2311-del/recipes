import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

const SYSTEM = `You turn recipe material that a user collected (a web page's text, screenshots of an Instagram/TikTok caption, pasted text) into ONE clean recipe in Hebrew.

Rules:
- NEVER invent ingredients, amounts, steps, times or servings. Use only what appears in the material. If something is missing or unreadable, leave that field empty/null and say so in "notes" (in Hebrew), e.g. "הכמות של הקמח לא הופיעה במקור".
- The material may repeat itself (a caption and a screenshot of the same caption). Merge it into one recipe, no duplicates.
- Translate everything to natural Hebrew, the way an Israeli home cook would write it. Keep brand names as they are.
- Convert imperial units to metric: cups of dry ingredients to grams (use realistic densities, e.g. 1 cup flour ≈ 120 g, 1 cup sugar ≈ 200 g), cups of liquids to ml, oz to g, lb to g, inches to cm, °F to °C (rounded to the nearest 5). Keep spoons as כף / כפית. Round converted amounts sensibly (e.g. 240 ml, not 236.6 ml).
- When you convert an amount, put the original amount and unit in orig_amount / orig_unit, translated to Hebrew (e.g. orig_amount 1, orig_unit "כוס"). When nothing was converted, orig_amount is null and orig_unit is "".
- "amount" must be a plain number (0.5, not "1/2"). If an ingredient has no number ("קורט מלח", "מלח לפי הטעם"), amount is null and the wording goes in unit/item.
- If the ingredient list has groups ("For the sauce:"), add a row with is_header true and the group name in "item" (e.g. "לרוטב"), and no amount or unit.
- Steps: one action-oriented step per array item, without numbering. Temperatures inside steps also go in °C.
- original_text: the recipe in its original language (usually English), as complete as you can read it, so it can be searched later. Plain text.
- tags: 2–6 short Hebrew tags that help find the recipe (main ingredient, cuisine, "טבעוני", "ללא גלוטן", "מהיר" etc.), only when they are true.
- category: pick the best fit from the allowed list.
- If the material contains no recipe at all, set found_recipe to false and leave the rest empty.`;

function recipeSchema(categories: string[]) {
  return z.object({
    found_recipe: z.boolean(),
    title: z.string().describe("Hebrew title"),
    original_title: z.string().describe("Title in the original language, empty if the source was Hebrew"),
    description: z.string().describe("One or two short Hebrew sentences describing the dish"),
    category: z.string().describe(`Exactly one of: ${categories.join(" | ")}`),
    tags: z.array(z.string()),
    ingredients: z.array(
      z.object({
        is_header: z.boolean(),
        amount: z.number().nullable(),
        unit: z.string(),
        item: z.string(),
        orig_amount: z.number().nullable(),
        orig_unit: z.string(),
      }),
    ),
    steps: z.array(z.string()),
    prep_minutes: z.number().nullable(),
    cook_minutes: z.number().nullable(),
    servings: z.number().nullable(),
    notes: z.string().describe("Hebrew notes: tips from the source, plus anything missing or unclear"),
    original_text: z.string(),
  });
}

export type ExtractedRecipe = z.infer<ReturnType<typeof recipeSchema>>;

export type ImageInput = { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" };

export class RecipeExtractionError extends Error {}

export async function extractRecipe(input: {
  categories: string[];
  urlText: string;
  pastedText: string;
  images: ImageInput[];
}): Promise<ExtractedRecipe> {
  const client = new Anthropic();

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const img of input.images) {
    content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } });
  }
  const sections: string[] = [];
  if (input.images.length) sections.push(`The ${input.images.length} image(s) above are screenshots the user took of the recipe.`);
  if (input.urlText) sections.push(`Text fetched from the recipe link:\n<link_text>\n${input.urlText}\n</link_text>`);
  if (input.pastedText) sections.push(`Text the user pasted:\n<pasted_text>\n${input.pastedText}\n</pasted_text>`);
  sections.push(`Allowed categories: ${input.categories.join(", ")}`);
  sections.push("Build the recipe.");
  content.push({ type: "text", text: sections.join("\n\n") });

  let response;
  try {
    response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { effort: "medium", format: betaZodOutputFormat(recipeSchema(input.categories)) },
      // If the model declines (very unlikely for recipes), the API retries on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new RecipeExtractionError("מפתח ה-API של Anthropic לא תקין. בדוק את ANTHROPIC_API_KEY.");
    if (err instanceof Anthropic.RateLimitError) throw new RecipeExtractionError("יותר מדי בקשות ל-Claude כרגע. נסה שוב בעוד דקה.");
    if (err instanceof Anthropic.APIError && err.status === 400 && /credit|balance/i.test(err.message)) {
      throw new RecipeExtractionError("נגמר הקרדיט בחשבון Anthropic. צריך לטעון עוד ב-console.anthropic.com.");
    }
    if (err instanceof Anthropic.APIError) throw new RecipeExtractionError(`שגיאה מ-Claude (${err.status ?? "רשת"}). נסה שוב.`);
    throw err;
  }

  if (response.stop_reason === "refusal") throw new RecipeExtractionError("Claude לא הצליח לעבד את החומר הזה. נסה צילומי מסך אחרים.");
  if (response.stop_reason === "max_tokens") throw new RecipeExtractionError("המתכון ארוך מדי לעיבוד בבת אחת.");
  if (!response.parsed_output) throw new RecipeExtractionError("Claude החזיר תשובה לא תקינה. נסה שוב.");
  return response.parsed_output;
}
