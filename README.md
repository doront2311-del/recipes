# המתכונים שלי · Personal recipe app

A small personal recipe app for iPhone (Hebrew, RTL). Add a recipe from an Instagram/TikTok link plus screenshots of the caption, a blog link, or pasted text; Claude turns it into one clean Hebrew recipe with metric units, which you review and save. Full-text fuzzy search in Hebrew and English, categories, servings scaling, and a cooking view that keeps the screen awake.

**Setup guide (Hebrew, step by step): [SETUP.md](SETUP.md)**

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind 4, deployed on Vercel
- Supabase: Postgres (`recipes`, `categories`) and a public Storage bucket `recipe-images`. Schema: [`supabase/schema.sql`](supabase/schema.sql)
- Anthropic API (`claude-sonnet-5-5` by default, override with `ANTHROPIC_MODEL`), server-side only, structured outputs via `betaZodOutputFormat`
- No login (single personal user). `src/app/(main)/layout.tsx` shows a Hebrew setup-problem page when env vars or the database are misconfigured
- Client-side search with Fuse.js over normalized Hebrew (no niqqud, final letters folded)

## Layout

| Path | What |
|---|---|
| `src/app/api/extract` | URL fetch + screenshots + text → one Claude call → draft recipe |
| `src/lib/extract-url.ts` | JSON-LD Recipe, og: tags, YouTube description, blog text fallback |
| `src/lib/claude.ts` | Prompt and output schema |
| `src/app/actions.ts` | Save/delete recipes, manage categories |
| `src/app/(main)/` | Home, add, recipe view, edit, settings |

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

For a local database: `npx supabase start`, then run `supabase/schema.sql` against it with `psql`.
