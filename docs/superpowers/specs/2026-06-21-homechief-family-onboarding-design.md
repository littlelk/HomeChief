# HomeChief Family Onboarding Design

## Goal

Let a newly logged-in HomeChief user create their first family, become its owner, and receive an updated session with `needs_onboarding: false`.

## Scope

This step implements first-family creation only. It does not implement invite-code joining, family settings editing, or member management. Those can build on the same `family-onboarding` function later.

## Architecture

The mini program calls `family-onboarding` with the HomeChief session token in the `Authorization` header. The Edge Function hashes the token and validates it against `private.app_sessions`, then creates `public.families`, inserts `public.family_members`, and updates `public.app_users.primary_family_id`.

`private.app_sessions` must remain private. Edge Functions use `SUPABASE_DB_URL` and a direct Postgres client for private-session reads and writes instead of exposing the private schema through the Data API.

## Data Flow

1. `wechat-login` returns `{ token, user, family: null, needs_onboarding: true }` for first-time users.
2. The `me` page shows a “创建家庭” panel.
3. User taps create family.
4. Mini program calls `family-onboarding` with `{ action: "create_family", family_name }` and `Authorization: Bearer <token>`.
5. Edge Function validates the token hash in `private.app_sessions`.
6. Edge Function creates a family, owner membership, and updates the user.
7. Mini program merges `{ user, family, needs_onboarding: false }` into local session.

## Error Handling

- Missing bearer token returns `401 { error: "missing_token" }`.
- Invalid/expired session returns `401 { error: "invalid_session" }`.
- Missing family name returns `400 { error: "missing_family_name" }`.
- Database failure returns `500 { error: "database_error" }`.

## Testing

Deno tests use fake database adapters for session validation and family creation. Mini program flow tests mock `wx.request` for both `wechat-login` and `family-onboarding`, proving the local session updates after onboarding.
