import "server-only";

export type UrlExtraction = {
  /** Text worth sending to Claude, already labelled by where it came from. Empty when nothing useful was found. */
  text: string;
  /** True when we found a structured recipe or a caption long enough to plausibly contain one. */
  useful: boolean;
  /** Thumbnail / cover image URL, if the page advertised one. */
  imageUrl: string | null;
};

const EMPTY: UrlExtraction = { text: "", useful: false, imageUrl: null };

// Instagram and TikTok serve richer meta tags to link-preview bots than to browsers.
const USER_AGENT = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

export async function extractFromUrl(url: string): Promise<UrlExtraction> {
  let html: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return EMPTY;
    const res = await fetch(parsed, {
      headers: { "user-agent": USER_AGENT, "accept-language": "he,en;q=0.8" },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return EMPTY;
    html = (await res.text()).slice(0, 3_000_000);
  } catch {
    return EMPTY;
  }

  const parts: string[] = [];
  let useful = false;

  const metaTags = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const [, k, , v] of tag.matchAll(/([a-z:-]+)\s*=\s*(["'])([\s\S]*?)\2/gi)) attrs[k.toLowerCase()] = v;
    const key = (attrs.property ?? attrs.name ?? "").toLowerCase();
    if (key && attrs.content && !metaTags.has(key)) metaTags.set(key, decodeEntities(attrs.content).trim());
  }
  const meta = (name: string) => metaTags.get(name) ?? "";

  const title = meta("og:title") || decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim();
  const description = meta("og:description") || meta("description");
  let imageUrl = meta("og:image") || meta("twitter:image") || null;

  const recipe = findJsonLdRecipe(html);
  if (recipe) {
    parts.push(`Structured recipe data from the page (JSON-LD):\n${recipeToText(recipe)}`);
    useful = true;
    imageUrl = imageUrl ?? firstImage(recipe.image);
  }

  const youtube = extractYouTubeDescription(html);
  if (youtube) {
    parts.push(`YouTube video description:\n${youtube}`);
    if (youtube.length > 150) useful = true;
  }

  if (title) parts.push(`Page title: ${title}`);
  if (description) {
    parts.push(`Page description / caption:\n${description}`);
    if (description.length > 150) useful = true;
  }

  // Blogs without JSON-LD: fall back to the page's visible text.
  if (!recipe && !youtube && !isSocial(url)) {
    const body = visibleText(html);
    if (body.length > 300) {
      parts.push(`Visible page text:\n${body.slice(0, 15000)}`);
      useful = true;
    }
  }

  return { text: parts.join("\n\n"), useful, imageUrl };
}

function isSocial(url: string) {
  return /(instagram\.com|tiktok\.com|facebook\.com|youtube\.com|youtu\.be)/i.test(url);
}

type JsonLdNode = Record<string, unknown>;

function findJsonLdRecipe(html: string): JsonLdNode | null {
  const scripts = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, body] of scripts) {
    let data: unknown;
    try {
      data = JSON.parse(body.trim());
    } catch {
      continue;
    }
    const found = searchRecipe(data);
    if (found) return found;
  }
  return null;
}

function searchRecipe(node: unknown): JsonLdNode | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = searchRecipe(n);
      if (r) return r;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as JsonLdNode;
    const type = obj["@type"];
    if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) return obj;
    if (obj["@graph"]) return searchRecipe(obj["@graph"]);
  }
  return null;
}

function recipeToText(r: JsonLdNode): string {
  const lines: string[] = [];
  const add = (label: string, v: unknown) => {
    if (v == null || v === "") return;
    lines.push(`${label}: ${Array.isArray(v) ? v.join(", ") : String(v)}`);
  };
  add("Name", r.name);
  add("Description", r.description);
  add("Yield", r.recipeYield);
  add("Prep time", r.prepTime);
  add("Cook time", r.cookTime);
  add("Total time", r.totalTime);
  add("Category", r.recipeCategory);
  add("Cuisine", r.recipeCuisine);
  add("Keywords", r.keywords);
  if (Array.isArray(r.recipeIngredient)) {
    lines.push("Ingredients:", ...r.recipeIngredient.map((i) => `- ${decodeEntities(String(i))}`));
  }
  const steps = flattenInstructions(r.recipeInstructions);
  if (steps.length) lines.push("Instructions:", ...steps.map((s, i) => `${i + 1}. ${s}`));
  return lines.join("\n");
}

function flattenInstructions(v: unknown): string[] {
  if (!v) return [];
  if (typeof v === "string") return [decodeEntities(stripTags(v))];
  if (Array.isArray(v)) return v.flatMap(flattenInstructions);
  if (typeof v === "object") {
    const o = v as JsonLdNode;
    if (o["@type"] === "HowToSection") {
      return [`[${String(o.name ?? "")}]`, ...flattenInstructions(o.itemListElement)];
    }
    if (o.text) return [decodeEntities(stripTags(String(o.text)))];
    if (o.itemListElement) return flattenInstructions(o.itemListElement);
  }
  return [];
}

function firstImage(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return firstImage(v[0]);
  if (typeof v === "object" && "url" in (v as JsonLdNode)) return String((v as JsonLdNode).url);
  return null;
}

function extractYouTubeDescription(html: string): string {
  const m = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
  if (!m) return "";
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return "";
  }
}

function visibleText(html: string): string {
  const body = html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
  return decodeEntities(
    stripTags(
      body
        .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, " ")
        .replace(/<\/(p|div|li|h\d|br|tr)>/gi, "\n"),
    ),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, " ");
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Downloads a remote image (e.g. og:image) so we don't depend on expiring CDN links. */
export async function downloadImage(url: string): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(8000) });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.startsWith("image/")) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > 5_000_000) return null;
    return { bytes, contentType };
  } catch {
    return null;
  }
}
