import postgres from "npm:postgres@3.4.7";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };
type LoginResult<T> =
  | { ok: true; value: T }
  | {
    ok: false;
    error: string;
    status: number;
    wechat_error_code?: number;
    db_error_code?: string;
    db_constraint?: string;
  };

export type WechatLoginInput = {
  code: string;
  nickname?: string;
  avatar_url?: string;
};

export type HomeChiefUser = {
  id: string;
  nickname?: string | null;
  avatar_url?: string | null;
  primary_family_id?: string | null;
  status: string;
};

export type HomeChiefFamily = {
  id: string;
  name: string;
  role: string;
  invite_code: string;
} | null;

type WechatExchange = {
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

export type LoginDatabase = {
  upsertUser(input: {
    openid: string;
    unionid?: string;
    nickname?: string;
    avatar_url?: string;
  }): Promise<HomeChiefUser>;
  getPrimaryFamily(user: HomeChiefUser): Promise<HomeChiefFamily>;
  createSession(input: { user_id: string; token_hash: string; expires_at: string }): Promise<void>;
};

export type LoginSuccess = {
  token: string;
  user: HomeChiefUser;
  family: HomeChiefFamily;
  needs_onboarding: boolean;
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

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function defaultTokenFactory(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readDatabaseDiagnostic(error: unknown): { db_error_code?: string; db_constraint?: string } {
  if (!error || typeof error !== "object") return {};
  const record = error as Record<string, unknown>;
  return {
    db_error_code: typeof record.code === "string" ? record.code : undefined,
    db_constraint: typeof record.constraint_name === "string"
      ? record.constraint_name
      : typeof record.constraint === "string"
      ? record.constraint
      : undefined,
  };
}

async function exchangeWechatCode(params: {
  input: WechatLoginInput;
  env: Record<string, string | undefined>;
  fetcher: typeof fetch;
}): Promise<LoginResult<{ openid: string; unionid?: string }>> {
  const appid = params.env.WECHAT_APPID;
  const secret = params.env.WECHAT_SECRET;
  if (!appid || !secret) return { ok: false, error: "wechat_config_missing", status: 500 };

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", appid);
  url.searchParams.set("secret", secret);
  url.searchParams.set("js_code", params.input.code);
  url.searchParams.set("grant_type", "authorization_code");

  let payload: WechatExchange;
  try {
    const response = await params.fetcher(url);
    payload = await response.json();
  } catch {
    return { ok: false, error: "wechat_exchange_failed", status: 502 };
  }

  if (!payload.openid || payload.errcode) {
    console.warn("wechat-login exchange rejected", {
      errcode: typeof payload.errcode === "number" ? payload.errcode : null,
      errmsg: payload.errmsg || null,
      has_openid: Boolean(payload.openid),
    });
    return {
      ok: false,
      error: "wechat_exchange_failed",
      status: 502,
      wechat_error_code: typeof payload.errcode === "number" ? payload.errcode : undefined,
    };
  }

  return { ok: true, value: { openid: payload.openid, unionid: payload.unionid } };
}

export async function performWechatLogin(params: {
  input: WechatLoginInput;
  env: Record<string, string | undefined>;
  fetcher: typeof fetch;
  database: LoginDatabase;
  tokenFactory?: () => string;
}): Promise<LoginResult<LoginSuccess>> {
  const exchanged = await exchangeWechatCode({ input: params.input, env: params.env, fetcher: params.fetcher });
  if (!exchanged.ok) return exchanged;

  try {
    const user = await params.database.upsertUser({
      openid: exchanged.value.openid,
      unionid: exchanged.value.unionid,
      nickname: params.input.nickname,
      avatar_url: params.input.avatar_url,
    });
    const family = await params.database.getPrimaryFamily(user);
    const token = (params.tokenFactory || defaultTokenFactory)();
    const token_hash = await sha256Hex(token);
    const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    await params.database.createSession({ user_id: user.id, token_hash, expires_at });
    return {
      ok: true,
      value: {
        token,
        user,
        family,
        needs_onboarding: !family,
      },
    };
  } catch (error) {
    const diagnostic = readDatabaseDiagnostic(error);
    console.error("wechat-login database error", diagnostic, error);
    return { ok: false, error: "database_error", status: 500, ...diagnostic };
  }
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function createPostgresDatabase(): LoginDatabase {
  const sql = postgres(requireEnv("SUPABASE_DB_URL"), {
    ssl: "require",
    prepare: false,
  });

  return {
    async upsertUser(input) {
      const rows = await sql`
        insert into public.app_users (
          wechat_openid,
          wechat_unionid,
          nickname,
          avatar_url,
          status,
          last_login_at
        )
        values (
          ${input.openid},
          ${input.unionid || null},
          ${input.nickname || null},
          ${input.avatar_url || null},
          'active',
          now()
        )
        on conflict (wechat_openid) do update set
          wechat_unionid = coalesce(excluded.wechat_unionid, public.app_users.wechat_unionid),
          nickname = coalesce(excluded.nickname, public.app_users.nickname),
          avatar_url = coalesce(excluded.avatar_url, public.app_users.avatar_url),
          status = 'active',
          last_login_at = now(),
          updated_at = now()
        returning id, nickname, avatar_url, primary_family_id, status
      `;
      if (!rows[0]) throw new Error("Missing upserted user");
      return rows[0] as HomeChiefUser;
    },

    async getPrimaryFamily(user) {
      if (!user.primary_family_id) return null;
      const rows = await sql`
        select fm.role, f.id, f.name, f.invite_code
        from public.family_members fm
        join public.families f on f.id = fm.family_id
        where fm.user_id = ${user.id}
          and fm.family_id = ${user.primary_family_id}
        limit 1
      `;
      if (!rows[0]) return null;
      return {
        id: rows[0].id,
        name: rows[0].name,
        role: rows[0].role,
        invite_code: rows[0].invite_code,
      };
    },

    async createSession(input) {
      await sql`
        insert into private.app_sessions (user_id, token_hash, expires_at)
        values (${input.user_id}, ${input.token_hash}, ${input.expires_at})
      `;
    },
  };
}

export async function handler(request: Request, database = createPostgresDatabase()): Promise<Response> {
  const parsed = await parseWechatLoginRequest(request);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  const result = await performWechatLogin({
    input: parsed.value,
    env: {
      WECHAT_APPID: Deno.env.get("WECHAT_APPID"),
      WECHAT_SECRET: Deno.env.get("WECHAT_SECRET"),
    },
    fetcher: fetch,
    database,
  });
  if (!result.ok) {
    return Response.json({
      error: result.error,
      ...(typeof result.wechat_error_code === "number" ? { wechat_error_code: result.wechat_error_code } : {}),
      ...(result.db_error_code ? { db_error_code: result.db_error_code } : {}),
      ...(result.db_constraint ? { db_constraint: result.db_constraint } : {}),
    }, { status: result.status });
  }
  return Response.json(result.value);
}

if (import.meta.main) {
  Deno.serve((request) => handler(request));
}
