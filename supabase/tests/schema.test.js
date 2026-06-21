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
assert.ok(migration.includes('grant select, insert, update, delete on all tables in schema public to service_role'))
assert.ok(!migration.includes('grant select, insert, update, delete on all tables in schema public to anon'))

console.log('homechief schema tests passed')
