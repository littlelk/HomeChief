# HomeChief WeChat Login Design

## Goal

Build the first real authentication loop for HomeChief: the mini program uses `wx.login()` to obtain a WeChat code, the Supabase `wechat-login` Edge Function exchanges it for a WeChat `openid`, creates or updates the HomeChief user, stores a hashed app session, and returns a HomeChief session to the mini program.

## Scope

This design covers only login and session persistence. It does not implement family creation UI, COS upload signing, or publishing data to Supabase. Users without a family return `needs_onboarding: true`, which lets the next feature guide them into creating or joining a family.

## Architecture

- `miniprogram/services/backend.js` owns Supabase function URLs and request plumbing.
- `miniprogram/services/auth.js` owns local session storage, login gating, and the WeChat login flow.
- `miniprogram/pages/me/me.js` calls the real login flow from the existing “体验登录” entry.
- `supabase/functions/wechat-login/index.ts` owns request parsing, WeChat `jscode2session`, user upsert, token generation, session hashing, and the JSON response.

The mini program never stores WeChat or Tencent secrets. Supabase Edge Function secrets hold `WECHAT_APPID`, `WECHAT_SECRET`, and the built-in `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.

## Data Flow

1. User taps the login button on the `me` page.
2. Mini program calls `wx.login()`.
3. Mini program sends `{ code, nickname, avatar_url }` to `/functions/v1/wechat-login`.
4. Edge Function calls WeChat `jscode2session`.
5. Edge Function upserts `public.app_users` by `wechat_openid`.
6. Edge Function generates a random token, stores only `sha256(token)` in `private.app_sessions`, and returns the raw token once.
7. Mini program stores `{ token, user, family, needs_onboarding }` under `homechief:session`.

## Error Handling

- Missing code returns `400 { error: "missing_code" }`.
- Invalid JSON returns `400 { error: "invalid_json" }`.
- WeChat API failure returns `502 { error: "wechat_exchange_failed" }`.
- Database failures return `500 { error: "database_error" }`.
- Mini program login/request failures show a toast and keep the user in guest mode.

## Testing

- Deno tests use fake fetch/database adapters so they do not call real WeChat or Supabase services.
- Mini program flow tests mock `wx.login` and `wx.request` to prove the login button stores a backend session.
- Deployment verification calls the function without a code and expects `missing_code`, then optionally calls with a test code and expects a WeChat exchange failure rather than a routing failure.
