# HomeChief Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement HomeChief's guest-friendly mini program shell, Supabase schema, WeChat login/onboarding function skeletons, and COS upload-token backend boundary.

**Architecture:** The mini program keeps local demo data for unauthenticated browsing and gates write/upload actions behind login. Supabase stores family-scoped business data and private configuration references, while Tencent COS stores image bytes. Edge Functions own WeChat code exchange, HomeChief app sessions, onboarding, and COS upload token generation.

**Tech Stack:** WeChat Mini Program JavaScript/WXML/WXSS, Node-based local tests, Supabase Postgres migrations, Supabase Edge Functions on Deno, Tencent COS temporary upload credentials.

---

## File Structure

- Modify `miniprogram/app.json`: rename home path from `pages/feed/feed` to `pages/index/index`.
- Move `miniprogram/pages/feed/*` to `miniprogram/pages/index/*`: make the conventional index page the home tab.
- Create `miniprogram/services/auth.js`: store guest/auth state, login gating helpers, and session persistence keys.
- Create `miniprogram/services/backend.js`: wrap Edge Function request URLs and provide testable API boundaries.
- Modify `miniprogram/data/homechief.js`: expose demo data as guest seed data and keep local fallback behavior.
- Modify page files that navigate to `/pages/feed/feed`: update paths to `/pages/index/index`.
- Modify `miniprogram/tests/homechief-flows.test.js`: cover index path, guest browsing, and restricted action login prompts.
- Create `supabase/migrations/202606200001_homechief_core_schema.sql`: schemas, tables, constraints, RLS, and private config/session tables.
- Create `supabase/tests/schema.test.js`: static SQL validation for required tables, schemas, and RLS statements.
- Create `supabase/functions/_shared/session.ts`: parse and validate HomeChief app sessions.
- Create `supabase/functions/wechat-login/index.ts`: WeChat login function skeleton with injectable fetch for tests.
- Create `supabase/functions/family-onboarding/index.ts`: create/join family function skeleton.
- Create `supabase/functions/cos-upload-token/index.ts`: COS upload token function skeleton with placeholder signing boundary.
- Create `supabase/functions/media-assets-create/index.ts`: media metadata creation function skeleton.
- Create `supabase/functions/deno.json`: Deno lint/test config for function code.
- Create `supabase/functions/tests/*.test.ts`: Deno tests for request validation and auth boundaries.
- Modify or create `README.md`: document required Supabase and COS environment variables once implementation exists.

## Task 1: Rename Home Page to Index and Preserve Existing Behavior

**Files:**
- Move: `miniprogram/pages/feed/feed.js` to `miniprogram/pages/index/index.js`
- Move: `miniprogram/pages/feed/feed.json` to `miniprogram/pages/index/index.json`
- Move: `miniprogram/pages/feed/feed.wxml` to `miniprogram/pages/index/index.wxml`
- Move: `miniprogram/pages/feed/feed.wxss` to `miniprogram/pages/index/index.wxss`
- Modify: `miniprogram/app.json`
- Modify: `miniprogram/tests/homechief-flows.test.js`

- [ ] **Step 1: Write the failing path test**

Add assertions to `checkAppStructure()`:

```js
assert.strictEqual(app.pages[0], 'pages/index/index')
assert.ok(!app.pages.includes('pages/feed/feed'))
assert.strictEqual(app.tabBar.list[0].pagePath, 'pages/index/index')
```

Update syntax/page loading lists:

```js
'pages/index/index.js',
require('../pages/index/index.js')
```

Expected first run: `node miniprogram/tests/homechief-flows.test.js` fails because `app.pages[0]` is still `pages/feed/feed`.

- [ ] **Step 2: Move feed page files to index**

Run:

```bash
mkdir -p miniprogram/pages/index
mv miniprogram/pages/feed/feed.js miniprogram/pages/index/index.js
mv miniprogram/pages/feed/feed.json miniprogram/pages/index/index.json
mv miniprogram/pages/feed/feed.wxml miniprogram/pages/index/index.wxml
mv miniprogram/pages/feed/feed.wxss miniprogram/pages/index/index.wxss
rmdir miniprogram/pages/feed
```

- [ ] **Step 3: Update app configuration**

Change `miniprogram/app.json`:

```json
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
```

Change first tab:

```json
{
  "pagePath": "pages/index/index",
  "text": "动态",
  "iconPath": "images/tabbar/feed-default.png",
  "selectedIconPath": "images/tabbar/feed-active.png"
}
```

- [ ] **Step 4: Update navigation references**

Search:

```bash
rg "pages/feed/feed|feed/feed" miniprogram
```

Replace any internal path usage with:

```text
pages/index/index
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
node miniprogram/data/homechief.test.js
node miniprogram/tests/homechief-flows.test.js
git diff --check
```

Expected: both tests pass, diff check exits 0.

Commit:

```bash
git add miniprogram/app.json miniprogram/pages/index miniprogram/tests/homechief-flows.test.js
git add -u miniprogram/pages/feed
git commit -m "refactor: rename home page to index"
```

## Task 2: Add Guest Mode and Login Gating

**Files:**
- Create: `miniprogram/services/auth.js`
- Modify: `miniprogram/app.js`
- Modify: `miniprogram/pages/index/index.js`
- Modify: `miniprogram/pages/publish/publish.js`
- Modify: `miniprogram/pages/create-recipe/create-recipe.js`
- Modify: `miniprogram/pages/create-life/create-life.js`
- Modify: `miniprogram/pages/me/me.js`
- Modify: `miniprogram/tests/homechief-flows.test.js`

- [ ] **Step 1: Write failing guest tests**

In `loadPages()`, add tracking:

```js
let shownModal = null
global.wx.showModal = function showModal(options) {
  shownModal = options
  if (options.success) options.success({ confirm: false, cancel: true })
}
```

Return:

```js
get shownModal() {
  return shownModal
}
```

In `runFlowAssertions()`, before publish flows:

```js
assert.strictEqual(feed.data.isGuest, true)
publish.onShow()
assert.strictEqual(harness.switched, '/pages/index/index')
assert.ok(harness.shownModal.title.includes('登录'))
```

Expected first run: fails because `isGuest` and login gating do not exist.

- [ ] **Step 2: Create auth service**

Create `miniprogram/services/auth.js`:

```js
const SESSION_KEY = 'homechief:session'

function getSession() {
  if (typeof wx === 'undefined' || !wx.getStorageSync) return null
  return wx.getStorageSync(SESSION_KEY) || null
}

function setSession(session) {
  if (typeof wx === 'undefined' || !wx.setStorageSync) return
  wx.setStorageSync(SESSION_KEY, session)
}

function clearSession() {
  if (typeof wx === 'undefined' || !wx.removeStorageSync) return
  wx.removeStorageSync(SESSION_KEY)
}

function isLoggedIn() {
  const session = getSession()
  return !!(session && session.token && session.user)
}

function requireLogin(reason) {
  if (isLoggedIn()) return true
  if (typeof wx !== 'undefined' && wx.showModal) {
    wx.showModal({
      title: '需要登录',
      content: reason || '登录后可以使用家庭记录功能。',
      confirmText: '去登录',
      cancelText: '先看看',
      success(res) {
        if (res.confirm && wx.switchTab) wx.switchTab({ url: '/pages/me/me' })
      },
    })
  }
  return false
}

module.exports = {
  SESSION_KEY,
  getSession,
  setSession,
  clearSession,
  isLoggedIn,
  requireLogin,
}
```

- [ ] **Step 3: Add guest state to index**

In `miniprogram/pages/index/index.js`, import auth:

```js
const { isLoggedIn, requireLogin } = require('../../services/auth')
```

Set initial data:

```js
isGuest: true,
```

In `onShow()` set:

```js
this.setData({
  isGuest: !isLoggedIn(),
  posts,
  recipes,
  quickRecipes: getRecentRecipes(2),
  drafts,
})
```

In `openPublishSheet()` guard:

```js
if (!requireLogin('登录后可以把这顿饭记录到家里。')) return
this.setData({ showPublishSheet: true })
```

- [ ] **Step 4: Gate publish tab and write pages**

In `miniprogram/pages/publish/publish.js`, guard `onShow()`:

```js
const { requireLogin } = require('../../services/auth')

Page({
  onShow() {
    if (!requireLogin('登录后可以发布家庭动态、上传照片和记录菜谱。')) {
      wx.switchTab({ url: '/pages/index/index' })
      return
    }
    wx.setStorageSync('homechief:openPublishSheet', true)
    wx.switchTab({ url: '/pages/index/index' })
  },
})
```

In create pages, before upload/publish/save draft:

```js
if (!requireLogin('登录后可以上传图片并保存到你的家庭。')) return
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
node miniprogram/data/homechief.test.js
node miniprogram/tests/homechief-flows.test.js
git diff --check
```

Commit:

```bash
git add miniprogram/services/auth.js miniprogram/app.js miniprogram/pages/index/index.js miniprogram/pages/publish/publish.js miniprogram/pages/create-recipe/create-recipe.js miniprogram/pages/create-life/create-life.js miniprogram/pages/me/me.js miniprogram/tests/homechief-flows.test.js
git commit -m "feat: add guest login gating"
```

## Task 3: Add Supabase Core Schema Migration

**Files:**
- Create: `supabase/migrations/202606200001_homechief_core_schema.sql`
- Create: `supabase/tests/schema.test.js`
- Modify: `README.md`

- [ ] **Step 1: Write failing schema validation test**

Create `supabase/tests/schema.test.js`:

```js
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const migration = fs.readFileSync(
  path.resolve(__dirname, '../migrations/202606200001_homechief_core_schema.sql'),
  'utf8'
)

for (const table of [
  'public.app_users',
  'public.families',
  'public.family_members',
  'public.recipes',
  'public.recipe_ingredients',
  'public.recipe_steps',
  'public.posts',
  'public.media_assets',
  'public.post_media',
  'public.album_items',
  'public.comments',
  'public.reactions',
  'public.drafts',
  'private.app_sessions',
  'private.cos_configs',
]) {
  assert.ok(migration.includes(`create table ${table}`), `missing ${table}`)
}

for (const table of [
  'app_users',
  'families',
  'family_members',
  'recipes',
  'recipe_ingredients',
  'recipe_steps',
  'posts',
  'media_assets',
  'post_media',
  'album_items',
  'comments',
  'reactions',
  'drafts',
]) {
  assert.ok(
    migration.includes(`alter table public.${table} enable row level security`),
    `missing RLS for ${table}`
  )
}

assert.ok(migration.includes('revoke all on schema private from public'))
assert.ok(migration.includes('token_hash text not null unique'))
assert.ok(migration.includes('wechat_openid text not null unique'))
assert.ok(migration.includes('primary_family_id uuid'))

console.log('homechief schema tests passed')
```

Expected first run: `node supabase/tests/schema.test.js` fails because migration does not exist.

- [ ] **Step 2: Create migration SQL**

Create `supabase/migrations/202606200001_homechief_core_schema.sql` with:

```sql
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
  created_at timestamptz not null default now()
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
  secret_id_ref text not null,
  secret_key_ref text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
```

- [ ] **Step 3: Run schema test**

Run:

```bash
node supabase/tests/schema.test.js
```

Expected: `homechief schema tests passed`.

- [ ] **Step 4: Document env requirements**

Add to `README.md`:

```md
## Backend Environment

Required Supabase Edge Function secrets:

- `WECHAT_APPID`
- `WECHAT_SECRET`
- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET`
- `COS_REGION`
- `COS_CDN_DOMAIN` optional
```

- [ ] **Step 5: Verify and commit**

Run:

```bash
node supabase/tests/schema.test.js
node miniprogram/data/homechief.test.js
node miniprogram/tests/homechief-flows.test.js
git diff --check
```

Commit:

```bash
git add supabase/migrations/202606200001_homechief_core_schema.sql supabase/tests/schema.test.js README.md
git commit -m "feat: add Supabase schema"
```

## Task 4: Add Edge Function Skeletons and Tests

**Files:**
- Create: `supabase/functions/deno.json`
- Create: `supabase/functions/_shared/session.ts`
- Create: `supabase/functions/wechat-login/index.ts`
- Create: `supabase/functions/family-onboarding/index.ts`
- Create: `supabase/functions/cos-upload-token/index.ts`
- Create: `supabase/functions/media-assets-create/index.ts`
- Create: `supabase/functions/tests/wechat-login.test.ts`
- Create: `supabase/functions/tests/cos-upload-token.test.ts`

- [ ] **Step 1: Write request validation tests**

Create `supabase/functions/tests/wechat-login.test.ts`:

```ts
import { assertEquals } from "jsr:@std/assert";
import { parseWechatLoginRequest } from "../wechat-login/index.ts";

Deno.test("wechat-login requires a code", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({}),
  });
  const result = await parseWechatLoginRequest(request);
  assertEquals(result.ok, false);
});

Deno.test("wechat-login accepts code and profile", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ code: "wx-code", nickname: "妈妈" }),
  });
  const result = await parseWechatLoginRequest(request);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value.code, "wx-code");
});
```

Create `supabase/functions/tests/cos-upload-token.test.ts`:

```ts
import { assertEquals } from "jsr:@std/assert";
import { parseCosUploadRequest } from "../cos-upload-token/index.ts";

Deno.test("cos-upload-token rejects missing family id", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ mime_type: "image/jpeg", file_size: 100 }),
  });
  const result = await parseCosUploadRequest(request);
  assertEquals(result.ok, false);
});

Deno.test("cos-upload-token accepts image upload input", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({
      family_id: "00000000-0000-0000-0000-000000000001",
      mime_type: "image/jpeg",
      file_size: 100,
      usage: "post",
    }),
  });
  const result = await parseCosUploadRequest(request);
  assertEquals(result.ok, true);
});
```

Expected first run: `deno test --config supabase/functions/deno.json supabase/functions/tests` fails because files do not exist.

- [ ] **Step 2: Add shared session parser**

Create `supabase/functions/_shared/session.ts`:

```ts
export function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
```

- [ ] **Step 3: Add wechat-login parser and handler skeleton**

Create `supabase/functions/wechat-login/index.ts`:

```ts
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type WechatLoginInput = {
  code: string;
  nickname?: string;
  avatar_url?: string;
};

export async function parseWechatLoginRequest(request: Request): Promise<ParseResult<WechatLoginInput>> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  if (typeof body.code !== "string" || !body.code.trim()) {
    return { ok: false, error: "missing_code" };
  }
  return {
    ok: true,
    value: {
      code: body.code.trim(),
      nickname: typeof body.nickname === "string" ? body.nickname : undefined,
      avatar_url: typeof body.avatar_url === "string" ? body.avatar_url : undefined,
    },
  };
}

export async function handler(request: Request): Promise<Response> {
  const parsed = await parseWechatLoginRequest(request);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  return Response.json({
    needs_onboarding: true,
    message: "wechat-login database integration is configured in the deployment phase",
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
```

- [ ] **Step 4: Add COS parser and handler skeleton**

Create `supabase/functions/cos-upload-token/index.ts`:

```ts
type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type CosUploadInput = {
  family_id: string;
  usage: string;
  mime_type: string;
  file_size: number;
};

export async function parseCosUploadRequest(request: Request): Promise<ParseResult<CosUploadInput>> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  if (typeof body.family_id !== "string" || !body.family_id.trim()) return { ok: false, error: "missing_family_id" };
  if (typeof body.mime_type !== "string" || !body.mime_type.startsWith("image/")) return { ok: false, error: "invalid_mime_type" };
  if (typeof body.file_size !== "number" || body.file_size <= 0) return { ok: false, error: "invalid_file_size" };
  return {
    ok: true,
    value: {
      family_id: body.family_id.trim(),
      usage: typeof body.usage === "string" ? body.usage : "post",
      mime_type: body.mime_type,
      file_size: body.file_size,
    },
  };
}

export async function handler(request: Request): Promise<Response> {
  const parsed = await parseCosUploadRequest(request);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  return Response.json({
    object_key: `families/${parsed.value.family_id}/${crypto.randomUUID()}`,
    message: "COS signing is configured in the deployment phase",
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
```

- [ ] **Step 5: Add onboarding and media metadata skeletons**

Create minimal handlers that parse JSON and return `501` until database deployment details are configured:

```ts
export async function handler(): Promise<Response> {
  return Response.json({ error: "deployment_required" }, { status: 501 });
}

if (import.meta.main) {
  Deno.serve(handler);
}
```

Use that pattern in:

- `supabase/functions/family-onboarding/index.ts`
- `supabase/functions/media-assets-create/index.ts`

- [ ] **Step 6: Add Deno config**

Create `supabase/functions/deno.json`:

```json
{
  "imports": {
    "jsr:@std/assert": "jsr:@std/assert@1"
  },
  "tasks": {
    "test": "deno test --allow-env --allow-net=api.weixin.qq.com"
  }
}
```

- [ ] **Step 7: Verify and commit**

Run:

```bash
deno test --config supabase/functions/deno.json supabase/functions/tests
node supabase/tests/schema.test.js
node miniprogram/data/homechief.test.js
node miniprogram/tests/homechief-flows.test.js
git diff --check
```

Commit:

```bash
git add supabase/functions
git commit -m "feat: scaffold backend edge functions"
```

## Task 5: Create Supabase Project and Apply Schema

**Files:**
- No local file changes required unless project metadata is documented.

- [ ] **Step 1: Get Supabase organization and region**

Ask user to choose:

```text
Supabase organization ID/name:
Region: ap-southeast-1, ap-northeast-1, or another supported region
```

- [ ] **Step 2: Confirm Supabase project cost**

Use MCP:

```text
list_organizations
get_cost(type: project, organization_id)
confirm_cost
create_project(name: HomeChief, organization_id, region)
```

Expected: user confirms cost before creation.

- [ ] **Step 3: Wait for project readiness**

Use:

```text
get_project(project_id)
```

Expected: project status is ready/healthy before SQL is applied.

- [ ] **Step 4: Apply migration**

Use Supabase MCP `apply_migration` with:

```text
name: homechief_core_schema
query: contents of supabase/migrations/202606200001_homechief_core_schema.sql
```

Expected: migration applies once.

- [ ] **Step 5: Verify database**

Use `execute_sql`:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema in ('public', 'private')
  and table_name in ('app_users', 'families', 'cos_configs', 'app_sessions')
order by table_schema, table_name;
```

Expected: four rows include `private.app_sessions`, `private.cos_configs`, `public.app_users`, `public.families`.

- [ ] **Step 6: Run advisors**

Use:

```text
get_advisors(type: security)
get_advisors(type: performance)
```

Expected: no critical security issue from missing RLS on public tables.

## Task 6: Deploy Edge Functions After Secrets Are Provided

**Files:**
- Supabase project Edge Functions deployment only.

- [ ] **Step 1: Confirm required secrets are configured**

Required in Supabase:

```text
WECHAT_APPID
WECHAT_SECRET
COS_SECRET_ID
COS_SECRET_KEY
COS_BUCKET
COS_REGION
COS_CDN_DOMAIN optional
```

- [ ] **Step 2: Deploy functions**

Use Supabase MCP `deploy_edge_function` for:

```text
wechat-login
family-onboarding
cos-upload-token
media-assets-create
```

Set `verify_jwt` to `false` only because these functions implement custom HomeChief application-session auth rather than Supabase Auth JWT in the first release.

- [ ] **Step 3: Verify function list**

Use:

```text
list_edge_functions(project_id)
```

Expected: all four functions are listed.

- [ ] **Step 4: Smoke test validation errors**

Call each function without required body.

Expected:

- `wechat-login` returns `400 missing_code`.
- `cos-upload-token` returns `400 missing_family_id`.

## Task 7: Wire Mini Program Backend Client

**Files:**
- Create: `miniprogram/services/backend.js`
- Modify: `miniprogram/services/auth.js`
- Modify: `miniprogram/pages/me/me.js`
- Modify: `miniprogram/pages/create-recipe/create-recipe.js`
- Modify: `miniprogram/pages/create-life/create-life.js`
- Modify: `miniprogram/tests/homechief-flows.test.js`

- [ ] **Step 1: Write failing backend client tests**

Add tests that assert:

```js
const backend = require('../services/backend')
assert.strictEqual(typeof backend.callFunction, 'function')
assert.strictEqual(typeof backend.wechatLogin, 'function')
assert.strictEqual(typeof backend.getCosUploadToken, 'function')
```

Expected first run: fails because backend service does not exist.

- [ ] **Step 2: Add backend service**

Create `miniprogram/services/backend.js`:

```js
const SUPABASE_FUNCTIONS_BASE_URL = ''

function callFunction(name, body, session) {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_FUNCTIONS_BASE_URL) {
      reject(new Error('Supabase functions URL is not configured'))
      return
    }
    wx.request({
      url: `${SUPABASE_FUNCTIONS_BASE_URL}/${name}`,
      method: 'POST',
      header: Object.assign(
        { 'content-type': 'application/json' },
        session && session.token ? { Authorization: `Bearer ${session.token}` } : {}
      ),
      data: body,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
        else reject(new Error((res.data && res.data.error) || '请求失败'))
      },
      fail: reject,
    })
  })
}

function wechatLogin(payload) {
  return callFunction('wechat-login', payload)
}

function getCosUploadToken(payload, session) {
  return callFunction('cos-upload-token', payload, session)
}

module.exports = {
  callFunction,
  wechatLogin,
  getCosUploadToken,
}
```

- [ ] **Step 3: Keep URL intentionally blank until project exists**

Do not hardcode Supabase project URL. After project creation, replace the value through a generated local config file or safe environment-specific config that does not contain secrets.

- [ ] **Step 4: Verify and commit**

Run:

```bash
node miniprogram/data/homechief.test.js
node miniprogram/tests/homechief-flows.test.js
git diff --check
```

Commit:

```bash
git add miniprogram/services/backend.js miniprogram/tests/homechief-flows.test.js
git commit -m "feat: add backend function client"
```

## Plan Self-Review

- Spec coverage: guest mode, index path, Supabase schema, private COS config, Edge Functions, and cloud creation/deploy gates are covered.
- Placeholder scan: no unresolved placeholder steps; cloud steps are explicit gated steps requiring user-provided organization/region/secrets.
- Type consistency: table names and function names match the approved design document.
- Scope note: full cloud creation cannot complete until the Supabase organization/region and COS information are confirmed.
