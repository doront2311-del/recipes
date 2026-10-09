-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '🍽️',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  original_title text not null default '',
  description text not null default '',
  category_id uuid references categories(id) on delete set null,
  tags text[] not null default '{}',
  ingredients jsonb not null default '[]',
  steps jsonb not null default '[]',
  prep_minutes int,
  cook_minutes int,
  servings numeric,
  notes text not null default '',
  source_url text not null default '',
  cover_image text,
  images text[] not null default '{}',
  original_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_created_at_idx on recipes (created_at desc);

-- The app talks to the database only from the server with the service role key.
-- RLS on with no policies = nobody else can read or write through the public API.
alter table categories enable row level security;
alter table recipes enable row level security;

insert into categories (name, emoji, sort_order)
select * from (values
  ('ארוחות בוקר', '🍳', 1),
  ('עיקריות', '🍲', 2),
  ('תוספות', '🍚', 3),
  ('סלטים', '🥗', 4),
  ('מרקים', '🥣', 5),
  ('מאפים ולחמים', '🥖', 6),
  ('קינוחים', '🍰', 7),
  ('נשנושים', '🥨', 8),
  ('משקאות', '🥤', 9)
) as v(name, emoji, sort_order)
where not exists (select 1 from categories);

-- Public bucket for recipe images (file names are random, so they can't be guessed).
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;
