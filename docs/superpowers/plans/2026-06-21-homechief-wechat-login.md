# HomeChief WeChat Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real WeChat login and HomeChief app-session creation.

**Architecture:** The mini program calls `wx.login()` and sends the resulting code to a Supabase Edge Function. The Edge Function exchanges the code with WeChat, upserts `public.app_users`, hashes and stores an app token in `private.app_sessions`, and returns the raw token once to the mini program.

**Tech Stack:** WeChat Mini Program JavaScript, Supabase Edge Functions on Deno, Supabase service-role database access, Node and Deno tests.

---

## File Structure

- Modify `supabase/functions/wechat-login/index.ts`: add injectable WeChat/database dependencies and real handler logic.
- Modify `supabase/functions/tests/wechat-login.test.ts`: cover missing code, request parsing, successful session creation, and WeChat API errors.
- Create `miniprogram/services/backend.js`: centralize Supabase Edge Function URL and `wx.request` promise wrapper.
- Modify `miniprogram/services/auth.js`: add `loginWithWechatProfile()` and keep existing guest/session helpers.
- Modify `miniprogram/pages/me/me.js`: call real login and expose loading/error state.
- Modify `miniprogram/tests/homechief-flows.test.js`: mock `wx.login` and `wx.request`, prove login stores backend session.

## Task 1: Edge Function Login Logic

- [ ] Write failing Deno tests for `performWechatLogin()`.
- [ ] Implement WeChat code exchange, app user upsert, family lookup, token hashing, and session insert.
- [ ] Run `deno test --config supabase/functions/deno.json supabase/functions/tests`.

## Task 2: Mini Program Login Integration

- [ ] Write failing flow test for `me.loginDemo()` using `wx.login` and `wx.request`.
- [ ] Create `miniprogram/services/backend.js`.
- [ ] Implement `loginWithWechatProfile()` in `auth.js`.
- [ ] Update `me.js` to call the real login flow and handle failures.
- [ ] Run `node miniprogram/tests/homechief-flows.test.js`.

## Task 3: Verify, Commit, Deploy

- [ ] Run `deno test --config supabase/functions/deno.json supabase/functions/tests`.
- [ ] Run `node supabase/functions/tests/backend-functions.static.cjs`.
- [ ] Run `node supabase/tests/schema.test.js`.
- [ ] Run `node miniprogram/data/homechief.test.js`.
- [ ] Run `node miniprogram/tests/homechief-flows.test.js`.
- [ ] Run `git diff --check`.
- [ ] Commit local code.
- [ ] Deploy `wechat-login` to Supabase and verify the public route.
