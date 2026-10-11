export const BUCKET = "recipe-images";

/** The project URL without anything pasted after it (people often copy ".../rest/v1/"). */
export function supabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/(rest|storage|auth)\/v1.*$/, "").replace(/\/+$/, "");
}

export function imageUrl(path: string) {
  return `${supabaseUrl()}/storage/v1/object/public/${BUCKET}/${path}`;
}
