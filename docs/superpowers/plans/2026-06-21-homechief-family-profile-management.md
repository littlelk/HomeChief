# HomeChief Family Profile Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add family rename, family invite-code joining, and avatar capture/update support to the HomeChief mini program.

**Architecture:** Extend the existing `family-onboarding` Edge Function to handle authenticated family/profile actions beyond first-family creation. Keep mini program session state as the single local source for current user/family context, and merge every successful backend response back into `homechief:session`.

**Tech Stack:** WeChat Mini Program JavaScript/WXML/WXSS, Supabase Edge Functions on Deno, Postgres direct SQL via `postgres`, existing Node/Deno tests.

---

### Task 1: Backend Family Actions

**Files:**
- Modify: `supabase/functions/family-onboarding/index.ts`
- Modify: `supabase/functions/tests/family-onboarding.test.ts`

- [ ] Add failing tests for `join_family`, `update_family_name`, and `update_profile`.
- [ ] Extend parser to accept the new actions with trimmed inputs.
- [ ] Add database adapter methods for finding a family by invite code, attaching a member, updating primary family, renaming a family, and updating profile.
- [ ] Return `family.invite_code` for display after create/join/login.
- [ ] Run `deno test --config supabase/functions/deno.json supabase/functions/tests/family-onboarding.test.ts`.

### Task 2: Mini Program Services

**Files:**
- Modify: `miniprogram/services/backend.js`
- Modify: `miniprogram/services/auth.js`
- Modify: `miniprogram/tests/homechief-flows.test.js`

- [ ] Add failing flow coverage for custom avatar, join family ID, rename family, and profile avatar update.
- [ ] Add service methods that call `family-onboarding` with `join_family`, `update_family_name`, and `update_profile`.
- [ ] Merge returned session data without losing the raw session token.
- [ ] Run `node miniprogram/tests/homechief-flows.test.js`.

### Task 3: Mini Program UI

**Files:**
- Modify: `miniprogram/pages/me/me.js`
- Modify: `miniprogram/pages/me/me.wxml`
- Modify: `miniprogram/pages/me/me.wxss`

- [ ] Add register-time nickname/avatar fields before WeChat login.
- [ ] Add create-family and join-family panels when `needs_onboarding` is true.
- [ ] Show family ID after joining/creating a family.
- [ ] Add controls for renaming family and updating avatar after registration.
- [ ] Run `node miniprogram/data/homechief.test.js` and `node miniprogram/tests/homechief-flows.test.js`.

### Task 4: Verification and Deployment

**Files:**
- Modify: `supabase/functions/tests/backend-functions.static.cjs`

- [ ] Run Deno and Node test suites.
- [ ] Deploy `family-onboarding` with Supabase MCP.
- [ ] Verify deployed function with invalid token and fake action probes.
- [ ] Commit and push the changes.

