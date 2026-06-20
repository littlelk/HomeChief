# HomeChief Supabase and COS Backend Design

## Summary

HomeChief will move from local demo data to a backend model where Supabase stores identity, family, recipes, posts, album metadata, upload records, and safe configuration references. Tencent COS stores image files. COS secrets must never be exposed to the mini program. Upload credentials are minted by Supabase Edge Functions after validating the user and family membership.

The mini program must also keep an audit-friendly guest experience before login. Users can browse demo content without authentication. Login is required only when the user tries to publish, upload, create or edit content, join a family, or access real family data.

## Goals

- Support WeChat mini program login and registration using `wx.login()` and WeChat `openid`.
- Store a first-class user table with family attributes.
- Support both "create a family" and "join by invite code" during onboarding.
- Store business data in Supabase with row-level security scoped by family membership.
- Store images in Tencent COS and only store image metadata in Supabase.
- Store COS connection information safely in Supabase private schemas and/or Supabase Vault/Edge Function secrets.
- Rename the mini program home page path to the conventional `pages/index/index`.
- Keep a complete no-login review path for mini program publishing review.

## Non-Goals

- Real payment, billing, or subscription logic.
- Public social network discovery across families.
- Admin dashboards beyond database-level configuration.
- Direct client-side COS secret usage.
- Supabase Storage usage for user photos; user photos go to Tencent COS.

## Current App Context

The current mini program stores demo data locally in `miniprogram/data/homechief.js`. Existing concepts are:

- Family: name, members, roles.
- Recipes: cover image, tags, difficulty, notes, ingredients, steps with optional images.
- Posts: recipe or life posts, body, photos, tags, reactions, comments.
- Album: grouped photos with tags.
- Drafts: simple local draft records.

The current app pages are:

- `pages/feed/feed`
- `pages/recipes/recipes`
- `pages/publish/publish`
- `pages/album/album`
- `pages/me/me`
- `pages/recipe-detail/recipe-detail`
- `pages/create-recipe/create-recipe`
- `pages/create-life/create-life`

This design changes the first page to `pages/index/index`, keeping the tab label "动态".

## Guest Experience

The mini program must not force login on launch. This is required for a smooth review path during WeChat mini program publishing.

Guest users can:

- Open `pages/index/index`.
- Browse demo family dynamics.
- Browse demo recipes.
- Open recipe detail pages.
- Browse demo albums.
- Navigate tabs that show demo or limited empty-state content.

Guest users cannot:

- Publish posts.
- Upload images.
- Create or edit recipes.
- Save drafts to backend.
- Join or create a real family.
- Read real family records from Supabase.

When a guest taps a restricted action, the app shows a login prompt with the specific reason, such as "登录后可以把这顿饭记录到家里". The app should not show a blocking full-screen login wall at startup.

Guest data remains local demo seed data and does not call Supabase. This keeps review behavior deterministic and avoids accidentally exposing real family data to unauthenticated users.

## Page Path Update

`pages/feed/feed` will be renamed to:

```text
pages/index/index
```

`app.json` first page becomes:

```json
{
  "pages": [
    "pages/index/index",
    "pages/recipes/recipes",
    "pages/publish/publish",
    "pages/album/album",
    "pages/me/me",
    "pages/recipe-detail/recipe-detail",
    "pages/create-recipe/create-recipe",
    "pages/create-life/create-life"
  ]
}
```

The first tab still displays "动态" and points to `pages/index/index`.

## Auth Flow

HomeChief uses WeChat identity as the primary login method.

1. Mini program calls `wx.login()` to get a short-lived `code`.
2. Mini program invokes Supabase Edge Function `wechat-login`.
3. `wechat-login` exchanges the code with WeChat for `openid`, and `unionid` when available.
4. The function finds or creates an `app_users` row by `wechat_openid`.
5. Existing users receive user, membership, and default family info.
6. New users receive `needs_onboarding: true`.
7. Onboarding offers two actions:
   - Create a family.
   - Join an existing family by invite code.

The mini program must not trust an `openid` sent from the client. Only the Edge Function can exchange WeChat code for openid.

### Supabase Auth Alignment

The first implementation uses Edge Functions as the server boundary for WeChat login, business data reads/writes, COS upload signing, and any sensitive operations. Direct mini program access to business tables through the Supabase Data API is not part of the first release.

After `wechat-login`, the Edge Function issues an opaque HomeChief application session token. The token maps to `app_users` through `private.app_sessions`. Follow-up Edge Function calls send this token in the `Authorization` header. Functions validate the session and family membership before reading or writing business tables.

Public business tables still enable RLS as defense in depth. In the first release, client roles receive no broad direct table policies. A later hardening phase can integrate Supabase Auth custom JWT/session support so RLS can use `auth.uid()` directly for Data API access.

## Onboarding Flow

### Create Family

Input:

- Family name.
- User display name, optional.
- User avatar, optional.

Backend actions:

- Create `families`.
- Create `family_members` with role `owner`.
- Set `app_users.primary_family_id`.
- Set `app_users.status = 'active'`.
- Generate a unique invite code.

### Join Family

Input:

- Invite code.
- User display name, optional.

Backend actions:

- Find active `families.invite_code`.
- Create `family_members` with role `member`.
- Set `app_users.primary_family_id` if empty.
- Set `app_users.status = 'active'`.

Future improvement: invite codes can be rotated or expired with `family_invites`.

## Database Schemas

Use `public` for RLS-protected business data. Use `private` for internal configuration tables and helper functions that should not be exposed to the Data API. Use Supabase Vault or Edge Function secrets for actual COS keys.

### `public.app_users`

Purpose: application-level user profile mapped to WeChat identity.

Fields:

- `id uuid primary key`
- `wechat_openid text not null unique`
- `wechat_unionid text unique null`
- `nickname text`
- `avatar_url text`
- `primary_family_id uuid references public.families(id)`
- `status text not null default 'pending_onboarding'`
- `last_login_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:

- `primary_family_id` satisfies the requirement that the user table has a family attribute.
- Membership permissions still come from `family_members`.

### `public.families`

Purpose: family workspace.

Fields:

- `id uuid primary key`
- `name text not null`
- `owner_user_id uuid references public.app_users(id)`
- `invite_code text not null unique`
- `settings jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `public.family_members`

Purpose: many-to-many user-to-family relationship.

Fields:

- `family_id uuid references public.families(id) on delete cascade`
- `user_id uuid references public.app_users(id) on delete cascade`
- `role text not null default 'member'`
- `display_name text`
- `avatar_text text`
- `joined_at timestamptz not null default now()`
- `primary key (family_id, user_id)`

Roles:

- `owner`
- `admin`
- `member`
- `child`

### `public.recipes`

Purpose: recipe master data.

Fields:

- `id uuid primary key`
- `family_id uuid not null references public.families(id) on delete cascade`
- `author_user_id uuid references public.app_users(id)`
- `name text not null`
- `note text`
- `cover_media_id uuid references public.media_assets(id)`
- `tags text[] not null default '{}'`
- `flavor text`
- `difficulty text`
- `cook_count integer not null default 0`
- `last_cooked_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `public.recipe_ingredients`

Purpose: ordered ingredient lines, easier to edit than a JSON blob.

Fields:

- `id uuid primary key`
- `recipe_id uuid not null references public.recipes(id) on delete cascade`
- `position integer not null`
- `body text not null`

### `public.recipe_steps`

Purpose: ordered cooking steps.

Fields:

- `id uuid primary key`
- `recipe_id uuid not null references public.recipes(id) on delete cascade`
- `position integer not null`
- `title text not null`
- `body text not null`
- `media_id uuid references public.media_assets(id)`

### `public.posts`

Purpose: family timeline records.

Fields:

- `id uuid primary key`
- `family_id uuid not null references public.families(id) on delete cascade`
- `author_user_id uuid references public.app_users(id)`
- `type text not null`
- `title text not null`
- `body text`
- `recipe_id uuid references public.recipes(id)`
- `tags text[] not null default '{}'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Types:

- `recipe`
- `life`

### `public.media_assets`

Purpose: metadata for COS objects.

Fields:

- `id uuid primary key`
- `family_id uuid not null references public.families(id) on delete cascade`
- `owner_user_id uuid references public.app_users(id)`
- `provider text not null default 'tencent_cos'`
- `bucket text not null`
- `region text not null`
- `object_key text not null`
- `cdn_url text`
- `mime_type text`
- `byte_size integer`
- `width integer`
- `height integer`
- `usage text`
- `created_at timestamptz not null default now()`

Notes:

- Do not store COS `secret_id` or `secret_key` here.
- Store object keys, not short-lived signed URLs.

### `public.post_media`

Purpose: post-to-media ordering.

Fields:

- `post_id uuid references public.posts(id) on delete cascade`
- `media_id uuid references public.media_assets(id) on delete cascade`
- `position integer not null default 0`
- `primary key (post_id, media_id)`

### `public.album_items`

Purpose: album filtering and grouping metadata.

Fields:

- `id uuid primary key`
- `family_id uuid not null references public.families(id) on delete cascade`
- `media_id uuid not null references public.media_assets(id) on delete cascade`
- `tags text[] not null default '{}'`
- `taken_at timestamptz`
- `created_at timestamptz not null default now()`

### `public.comments`

Purpose: post comments.

Fields:

- `id uuid primary key`
- `family_id uuid not null references public.families(id) on delete cascade`
- `post_id uuid not null references public.posts(id) on delete cascade`
- `author_user_id uuid references public.app_users(id)`
- `body text not null`
- `created_at timestamptz not null default now()`

### `public.reactions`

Purpose: simple likes and future emoji reactions.

Fields:

- `post_id uuid references public.posts(id) on delete cascade`
- `user_id uuid references public.app_users(id) on delete cascade`
- `reaction text not null default 'like'`
- `created_at timestamptz not null default now()`
- `primary key (post_id, user_id, reaction)`

### `public.drafts`

Purpose: optional server-side drafts for logged-in users.

Fields:

- `id uuid primary key`
- `family_id uuid not null references public.families(id) on delete cascade`
- `user_id uuid not null references public.app_users(id) on delete cascade`
- `type text not null`
- `title text not null`
- `payload jsonb not null default '{}'::jsonb`
- `updated_at timestamptz not null default now()`

### `private.app_sessions`

Purpose: opaque HomeChief app sessions created by `wechat-login`.

Fields:

- `id uuid primary key`
- `user_id uuid not null references public.app_users(id) on delete cascade`
- `token_hash text not null unique`
- `expires_at timestamptz not null`
- `last_seen_at timestamptz`
- `created_at timestamptz not null default now()`

Rules:

- Store only a hash of the session token.
- No grants to `anon` or `authenticated`.
- Session tokens expire and can be rotated on login.
- Edge Functions validate sessions before any business operation.

## Private COS Configuration

### `private.cos_configs`

Purpose: non-public COS config references.

Fields:

- `id uuid primary key`
- `name text not null unique`
- `bucket text not null`
- `region text not null`
- `cdn_domain text`
- `secret_id_ref text not null`
- `secret_key_ref text not null`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Rules:

- No grants to `anon` or `authenticated`.
- Access only from Edge Functions or private SQL functions.
- `secret_id_ref` and `secret_key_ref` point to Supabase Vault secret names or Edge Function secret names.

Actual secrets:

- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `WECHAT_APPID`
- `WECHAT_SECRET`

These should be stored in Supabase Edge Function secrets or Supabase Vault, not in public tables.

## Edge Functions

### `wechat-login`

Input:

- `code`
- optional profile fields from mini program, such as nickname and avatar.

Output:

- `user`
- `primary_family`
- `memberships`
- `needs_onboarding`
- opaque application session token with expiry.

Responsibilities:

- Exchange code with WeChat.
- Upsert `app_users`.
- Update `last_login_at`.
- Create or rotate a `private.app_sessions` row.
- Return onboarding state.

### `family-onboarding`

Input:

- action: `create_family` or `join_family`
- family name or invite code
- display name

Responsibilities:

- Create or join family.
- Create `family_members`.
- Update `app_users.primary_family_id`.
- Return the active family context.

### `cos-upload-token`

Input:

- `family_id`
- `usage`
- `mime_type`
- `file_size`

Responsibilities:

- Validate user membership.
- Validate file type and file size.
- Read active COS config.
- Generate a scoped, short-lived COS upload credential or signed policy.
- Return object key and upload credentials.

### `media-assets-create`

Input:

- `family_id`
- `object_key`
- `bucket`
- `region`
- `mime_type`
- `byte_size`
- optional width and height
- usage

Responsibilities:

- Validate membership.
- Insert `media_assets`.
- Optionally create `album_items`.

## RLS Model

Every public table must enable RLS.

First-release policy stance:

- Business tables are not directly exposed for mini program reads/writes.
- Edge Functions use service-role access, validate `private.app_sessions`, and enforce membership in application logic before every operation.
- Public tables still have RLS enabled so accidental `anon` or `authenticated` access does not leak data.
- If specific read-only Data API access is added later, policies must require membership in `family_members`.
- `private.cos_configs`: no client access.
- `private.app_sessions`: no client access.

Future Supabase Auth policy shape:

```sql
exists (
  select 1
  from public.family_members fm
  join public.app_users au on au.id = fm.user_id
  where fm.family_id = <table>.family_id
    and au.auth_user_id = (select auth.uid())
)
```

This future phase requires adding `app_users.auth_user_id`.

## Sensitive Data Handling

Sensitive data includes:

- WeChat app secret.
- COS secret id.
- COS secret key.
- Supabase service role key.
- Any long-lived upload credentials.

Rules:

- Never commit secrets to the repo.
- Never put secrets in mini program code.
- Never return long-lived secrets to the client.
- Edge Functions return only short-lived upload credentials or signed upload parameters.
- Store only COS metadata and object keys in public tables.

## Implementation Phases

1. Rename `pages/feed/feed` to `pages/index/index`, update `app.json`, tests, and tab bar path.
2. Add guest/auth state layer so demo browsing works before login.
3. Create Supabase schema and RLS migration.
4. Add Edge Function design and environment secret requirements.
5. Implement WeChat login and onboarding APIs.
6. Implement COS upload token flow and media metadata writes.
7. Replace local persistence for logged-in users with Supabase sync while preserving guest demo mode.

## Open Questions for Implementation

- Which Supabase organization and region should the new project use?
- What Tencent COS region and bucket naming convention should be used?
- Family invite codes remain valid until manually rotated in the first release. Should rotation be exposed in the first family settings screen?
