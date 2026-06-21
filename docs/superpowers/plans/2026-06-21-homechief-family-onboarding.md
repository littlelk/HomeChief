# HomeChief Family Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement first-family creation after WeChat login.

**Architecture:** Edge Functions validate HomeChief tokens against `private.app_sessions` using direct Postgres access. The mini program calls `family-onboarding` after login and persists the updated family session locally.

**Tech Stack:** WeChat Mini Program JavaScript, Supabase Edge Functions on Deno, `npm:postgres`, Node and Deno tests.

---

## File Structure

- Create `supabase/functions/tests/family-onboarding.test.ts`: Deno behavior tests.
- Modify `supabase/functions/family-onboarding/index.ts`: request parsing, token validation, and first-family creation.
- Modify `supabase/functions/wechat-login/index.ts`: use direct Postgres for private session writes.
- Modify `supabase/functions/deno.json` / `deno.lock`: add `npm:postgres`.
- Modify `miniprogram/services/backend.js`: add `createFamily()`.
- Modify `miniprogram/services/auth.js`: add `createFamilyForCurrentUser()`.
- Modify `miniprogram/pages/me/me.js`, `.wxml`, `.wxss`: show onboarding panel and call backend.
- Modify `miniprogram/tests/homechief-flows.test.js`: cover the onboarding request and session merge.

## Tasks

- [ ] Add failing Deno tests for family-onboarding parsing and session-backed family creation.
- [ ] Implement family-onboarding with fake-database-testable logic.
- [ ] Switch wechat-login default database adapter from REST to direct Postgres so `private.app_sessions` remains private.
- [ ] Add failing mini program flow assertions for creating a family after login.
- [ ] Implement mini program onboarding API and page behavior.
- [ ] Run Deno, Node, schema, mini program, and diff verification.
- [ ] Commit, deploy `wechat-login` and `family-onboarding`, and verify public routes.
