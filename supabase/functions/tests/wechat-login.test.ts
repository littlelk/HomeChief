import { assertEquals } from "jsr:@std/assert";
import { parseWechatLoginRequest, performWechatLogin } from "../wechat-login/index.ts";

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

Deno.test("wechat-login creates a HomeChief session", async () => {
  const calls: string[] = [];
  const database = {
    async upsertUser(input: { openid: string; unionid?: string; nickname?: string; avatar_url?: string }) {
      calls.push(`user:${input.openid}:${input.nickname}`);
      return {
        id: "user-1",
        nickname: input.nickname,
        avatar_url: input.avatar_url,
        primary_family_id: null,
        status: "pending_onboarding",
      };
    },
    async getPrimaryFamily() {
      calls.push("family:none");
      return null;
    },
    async createSession(input: { user_id: string; token_hash: string; expires_at: string }) {
      calls.push(`session:${input.user_id}:${input.token_hash.length}:${input.expires_at.length}`);
    },
  };

  const result = await performWechatLogin({
    input: { code: "wx-code", nickname: "妈妈", avatar_url: "https://example.test/a.png" },
    env: { WECHAT_APPID: "appid", WECHAT_SECRET: "secret" },
    fetcher: async () =>
      new Response(JSON.stringify({ openid: "openid-1", unionid: "union-1" }), { status: 200 }),
    database,
    tokenFactory: () => "session-token",
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.token, "session-token");
    assertEquals(result.value.user.id, "user-1");
    assertEquals(result.value.family, null);
    assertEquals(result.value.needs_onboarding, true);
  }
  assertEquals(calls[0], "user:openid-1:妈妈");
  assertEquals(calls[1], "family:none");
  assertEquals(calls[2].startsWith("session:user-1:64:"), true);
});

Deno.test("wechat-login reports WeChat exchange failures", async () => {
  const result = await performWechatLogin({
    input: { code: "bad-code" },
    env: { WECHAT_APPID: "appid", WECHAT_SECRET: "secret" },
    fetcher: async () => new Response(JSON.stringify({ errcode: 40029, errmsg: "invalid code" })),
    database: {
      async upsertUser() {
        throw new Error("should not write user");
      },
      async getPrimaryFamily() {
        throw new Error("should not read family");
      },
      async createSession() {
        throw new Error("should not write session");
      },
    },
    tokenFactory: () => "unused",
  });

  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "wechat_exchange_failed");
  if (!result.ok) assertEquals(result.wechat_error_code, 40029);
});

Deno.test("wechat-login reports safe database diagnostics", async () => {
  const databaseError = new Error("duplicate key value violates unique constraint");
  Object.assign(databaseError, {
    code: "23505",
    constraint_name: "app_users_wechat_unionid_key",
  });

  const result = await performWechatLogin({
    input: { code: "wx-code" },
    env: { WECHAT_APPID: "appid", WECHAT_SECRET: "secret" },
    fetcher: async () => new Response(JSON.stringify({ openid: "openid-1" }), { status: 200 }),
    database: {
      async upsertUser() {
        throw databaseError;
      },
      async getPrimaryFamily() {
        throw new Error("should not read family");
      },
      async createSession() {
        throw new Error("should not write session");
      },
    },
    tokenFactory: () => "unused",
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "database_error");
    assertEquals(result.db_error_code, "23505");
    assertEquals(result.db_constraint, "app_users_wechat_unionid_key");
  }
});
