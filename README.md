# HomeChief

HomeChief is a private family WeChat mini program for family life records and shared home recipes.

The first UI version includes:

- Family dynamic feed
- Recipe library and recipe detail
- Recipe creation with steps and photos
- Life/photo post creation
- Family album
- My/family settings overview

Open this project with WeChat DevTools and use `miniprogram/` as the mini program root.

## Local Verification

Run these checks from the mini program root:

```bash
cd miniprogram
node data/homechief.test.js
node tests/homechief-flows.test.js
```

The flow test covers page registration, JavaScript syntax, mock images, publish tab behavior, recipe creation, life post creation, recipe search/detail refresh, album filtering, and draft visibility.

## Backend Environment

Supabase stores family-scoped business data in `public` tables and private server-only records in the `private` schema. Tencent COS stores image bytes; Supabase stores media metadata and COS connection records.

Required Supabase Edge Function secrets:

- `WECHAT_APPID`
- `WECHAT_SECRET`
- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET`
- `COS_REGION`
- `COS_CDN_DOMAIN` optional

The `private.cos_configs` table stores active COS bucket, region, CDN domain, upload prefix, and secret reference names. Keep raw COS secrets in Supabase Edge Function secrets, not in mini program code.
