create schema if not exists private;

create extension if not exists pgcrypto;

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  wechat_openid text not null unique,
  wechat_unionid text unique,
  nickname text,
  avatar_url text,
  primary_family_id uuid,
  status text not null default 'pending_onboarding'
    check (status in ('pending_onboarding', 'active', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid references public.app_users(id),
  invite_code text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users
  add constraint app_users_primary_family_id_fkey
  foreign key (primary_family_id) references public.families(id);

create table public.family_members (
  family_id uuid references public.families(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member', 'child')),
  display_name text,
  avatar_text text,
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  owner_user_id uuid references public.app_users(id),
  provider text not null default 'tencent_cos',
  bucket text not null,
  region text not null,
  object_key text not null,
  cdn_url text,
  mime_type text,
  byte_size integer,
  width integer,
  height integer,
  usage text,
  created_at timestamptz not null default now(),
  unique (provider, bucket, object_key)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  author_user_id uuid references public.app_users(id),
  name text not null,
  note text,
  cover_media_id uuid references public.media_assets(id),
  tags text[] not null default '{}',
  flavor text,
  difficulty text,
  cook_count integer not null default 0,
  last_cooked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position integer not null,
  body text not null,
  unique (recipe_id, position)
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  position integer not null,
  title text not null,
  body text not null,
  media_id uuid references public.media_assets(id),
  unique (recipe_id, position)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  author_user_id uuid references public.app_users(id),
  type text not null check (type in ('recipe', 'life')),
  title text not null,
  body text,
  recipe_id uuid references public.recipes(id),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.post_media (
  post_id uuid references public.posts(id) on delete cascade,
  media_id uuid references public.media_assets(id) on delete cascade,
  position integer not null default 0,
  primary key (post_id, media_id)
);

create table public.album_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete cascade,
  tags text[] not null default '{}',
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  author_user_id uuid references public.app_users(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.reactions (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete cascade,
  reaction text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  type text not null check (type in ('recipe', 'life')),
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table private.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table private.cos_configs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  bucket text not null,
  region text not null,
  cdn_domain text,
  upload_prefix text not null default 'homechief',
  secret_id_ref text not null,
  secret_key_ref text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index family_members_user_id_idx on public.family_members (user_id);
create index recipes_family_id_updated_at_idx on public.recipes (family_id, updated_at desc);
create index posts_family_id_created_at_idx on public.posts (family_id, created_at desc);
create index media_assets_family_id_created_at_idx on public.media_assets (family_id, created_at desc);
create index album_items_family_id_created_at_idx on public.album_items (family_id, created_at desc);
create index comments_post_id_created_at_idx on public.comments (post_id, created_at);
create index drafts_family_user_updated_at_idx on public.drafts (family_id, user_id, updated_at desc);
create index app_sessions_token_hash_idx on private.app_sessions (token_hash);
create index cos_configs_active_idx on private.cos_configs (is_active);

alter table public.app_users enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.posts enable row level security;
alter table public.media_assets enable row level security;
alter table public.post_media enable row level security;
alter table public.album_items enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.drafts enable row level security;

revoke all on schema private from public;
revoke all on all tables in schema private from anon, authenticated;

grant usage on schema public to service_role;
grant usage on schema private to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema private to service_role;
