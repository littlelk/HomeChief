import postgres from "npm:postgres@3.4.7";
import { readBearerToken, sha256Hex } from "../_shared/session.ts";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number };
type OnboardingResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

export type FamilyOnboardingInput = {
  token: string;
  action: "create_family";
  family_name: string;
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
};

export type FamilyOnboardingDatabase = {
  findSession(tokenHash: string): Promise<{ user_id: string; user: HomeChiefUser } | null>;
  createFamily(input: { name: string; invite_code: string; owner_user_id: string }): Promise<HomeChiefFamily>;
  attachOwner(input: { family_id: string; user_id: string; display_name?: string | null }): Promise<void>;
  setPrimaryFamily(input: { user_id: string; family_id: string }): Promise<HomeChiefUser>;
};

export type FamilyOnboardingSuccess = {
  user: HomeChiefUser;
  family: HomeChiefFamily;
  needs_onboarding: false;
};

export async function parseFamilyOnboardingRequest(
  request: Request,
): Promise<ParseResult<FamilyOnboardingInput>> {
  const token = readBearerToken(request);
  if (!token) return { ok: false, error: "missing_token", status: 401 };

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "invalid_json", status: 400 };
  }

  if (body.action !== "create_family") {
    return { ok: false, error: "unsupported_action", status: 400 };
  }
  if (typeof body.family_name !== "string" || !body.family_name.trim()) {
    return { ok: false, error: "missing_family_name", status: 400 };
  }

  return {
    ok: true,
    value: {
      token,
      action: "create_family",
      family_name: body.family_name.trim().slice(0, 40),
    },
  };
}

function defaultInviteCodeFactory(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `HC${Array.from(bytes).map((byte) => alphabet[byte % alphabet.length]).join("")}`;
}

export async function performFamilyOnboarding(params: {
  input: FamilyOnboardingInput;
  database: FamilyOnboardingDatabase;
  inviteCodeFactory?: () => string;
}): Promise<OnboardingResult<FamilyOnboardingSuccess>> {
  const tokenHash = await sha256Hex(params.input.token);
  const session = await params.database.findSession(tokenHash);
  if (!session) return { ok: false, error: "invalid_session", status: 401 };

  try {
    const family = await params.database.createFamily({
      name: params.input.family_name,
      invite_code: (params.inviteCodeFactory || defaultInviteCodeFactory)(),
      owner_user_id: session.user_id,
    });
    await params.database.attachOwner({
      family_id: family.id,
      user_id: session.user_id,
      display_name: session.user.nickname,
    });
    const user = await params.database.setPrimaryFamily({
      user_id: session.user_id,
      family_id: family.id,
    });
    return {
      ok: true,
      value: {
        user,
        family,
        needs_onboarding: false,
      },
    };
  } catch (error) {
    console.error("family-onboarding database error", error);
    return { ok: false, error: "database_error", status: 500 };
  }
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function createPostgresDatabase(): FamilyOnboardingDatabase {
  const sql = postgres(requireEnv("SUPABASE_DB_URL"), {
    ssl: "require",
    prepare: false,
  });

  return {
    async findSession(tokenHash) {
      const rows = await sql`
        select
          s.user_id,
          u.id,
          u.nickname,
          u.avatar_url,
          u.primary_family_id,
          u.status
        from private.app_sessions s
        join public.app_users u on u.id = s.user_id
        where s.token_hash = ${tokenHash}
          and s.expires_at > now()
        limit 1
      `;
      if (!rows[0]) return null;
      return {
        user_id: rows[0].user_id,
        user: {
          id: rows[0].id,
          nickname: rows[0].nickname,
          avatar_url: rows[0].avatar_url,
          primary_family_id: rows[0].primary_family_id,
          status: rows[0].status,
        },
      };
    },

    async createFamily(input) {
      const rows = await sql`
        insert into public.families (name, owner_user_id, invite_code)
        values (${input.name}, ${input.owner_user_id}, ${input.invite_code})
        returning id, name
      `;
      return { id: rows[0].id, name: rows[0].name, role: "owner" };
    },

    async attachOwner(input) {
      await sql`
        insert into public.family_members (family_id, user_id, role, display_name, avatar_text)
        values (${input.family_id}, ${input.user_id}, 'owner', ${input.display_name || null}, '家')
      `;
    },

    async setPrimaryFamily(input) {
      const rows = await sql`
        update public.app_users
        set primary_family_id = ${input.family_id},
            status = 'active',
            updated_at = now()
        where id = ${input.user_id}
        returning id, nickname, avatar_url, primary_family_id, status
      `;
      if (!rows[0]) throw new Error("Missing updated user");
      return rows[0] as HomeChiefUser;
    },
  };
}

export async function handler(
  request: Request,
  database = createPostgresDatabase(),
): Promise<Response> {
  const parsed = await parseFamilyOnboardingRequest(request);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }
  const result = await performFamilyOnboarding({ input: parsed.value, database });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json(result.value);
}

if (import.meta.main) {
  Deno.serve((request) => handler(request));
}
