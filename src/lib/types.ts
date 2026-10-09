export type Ingredient = {
  /** A group heading such as "לרוטב" instead of a real ingredient. */
  is_header: boolean;
  amount: number | null;
  unit: string;
  item: string;
  /** The amount before metric conversion, e.g. 1 for "1 כוס". Null when nothing was converted. */
  orig_amount: number | null;
  orig_unit: string;
};

export type Category = {
  id: string;
  name: string;
  emoji: string;
  sort_order: number;
};

export type Recipe = {
  id: string;
  title: string;
  original_title: string;
  description: string;
  category_id: string | null;
  tags: string[];
  ingredients: Ingredient[];
  steps: string[];
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  notes: string;
  source_url: string;
  cover_image: string | null;
  images: string[];
  original_text: string;
  created_at: string;
};

/** What the edit form works with: a recipe that may not be saved yet. */
export type RecipeDraft = Omit<Recipe, "id" | "created_at"> & { id?: string };

export const emptyIngredient = (): Ingredient => ({
  is_header: false,
  amount: null,
  unit: "",
  item: "",
  orig_amount: null,
  orig_unit: "",
});
