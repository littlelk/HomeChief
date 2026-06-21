import postgres from "npm:postgres@3.4.7";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number };
type OnboardingResult<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

export type FamilyOnboardingInput = {
  token: string;
  action: "create_family" | "join_family" | "update_family_name" | "update_profile";
  family_name?: string;
  family_code?: string;
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
};

export type FamilyOnboardingDatabase = {
  findSession(tokenHash: string): Promise<{ user_id: string; user: HomeChiefUser } | null>;
  createFamily(input: { name: string; invite_code: string; owner_user_id: string }): Promise<HomeChiefFamily>;
  attachOwner(input: { family_id: string; user_id: string; display_name?: string | null }): Promise<void>;
  findFamilyByInviteCode(code: string): Promise<HomeChiefFamily | null>;
  attachMember(input: { family_id: string; user_id: string; display_name?: string | null }): Promise<void>;
  getFamilyForUser(input: { family_id: string; user_id: string }): Promise<HomeChiefFamily | null>;
  renameFamily(input: { family_id: string; user_id: string; name: string }): Promise<HomeChiefFamily | null>;
  updateProfile(input: { user_id: string; nickname?: string; avatar_url?: string }): Promise<HomeChiefUser>;
  setPrimaryFamily(input: { user_id: string; family_id: string }): Promise<HomeChiefUser>;
};

export type FamilyOnboardingSuccess = {
  user: HomeChiefUser;
  family: HomeChiefFamily | null;
  needs_onboarding: boolean;
};

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

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

  if (
    body.action !== "create_family" &&
    body.action !== "join_family" &&
    body.action !== "update_family_name" &&
    body.action !== "update_profile"
  ) {
    return { ok: false, error: "unsupported_action", status: 400 };
  }
  if (
    (body.action === "create_family" || body.action === "update_family_name") &&
    (typeof body.family_name !== "string" || !body.family_name.trim())
  ) {
    return { ok: false, error: "missing_family_name", status: 400 };
  }
  if (body.action === "join_family" && (typeof body.family_code !== "string" || !body.family_code.trim())) {
    return { ok: false, error: "missing_family_code", status: 400 };
  }
  if (
    body.action === "update_profile" &&
    typeof body.nickname !== "string" &&
    typeof body.avatar_url !== "string"
  ) {
    return { ok: false, error: "missing_profile_fields", status: 400 };
  }

  return {
    ok: true,
    value: {
      token,
      action: body.action,
      family_name: typeof body.family_name === "string" ? body.family_name.trim().slice(0, 40) : undefined,
      family_code: typeof body.family_code === "string" ? body.family_code.trim().toUpperCase().slice(0, 20) : undefined,
      nickname: typeof body.nickname === "string" ? body.nickname.trim().slice(0, 30) : undefined,
      avatar_url: typeof body.avatar_url === "string" ? body.avatar_url.trim().slice(0, 500) : undefined,
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
    if (params.input.action === "create_family") {
      const family = await params.database.createFamily({
        name: params.input.family_name || "",
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
      return { ok: true, value: { user, family, needs_onboarding: false } };
    }

    if (params.input.action === "join_family") {
      const family = await params.database.findFamilyByInviteCode((params.input.family_code || "").toUpperCase());
      if (!family) return { ok: false, error: "invalid_family_code", status: 404 };
      await params.database.attachMember({
        family_id: family.id,
        user_id: session.user_id,
        display_name: session.user.nickname,
      });
      const user = await params.database.setPrimaryFamily({
        user_id: session.user_id,
        family_id: family.id,
      });
      return { ok: true, value: { user, family, needs_onboarding: false } };
    }

    if (params.input.action === "update_family_name") {
      if (!session.user.primary_family_id) return { ok: false, error: "missing_family", status: 400 };
      const family = await params.database.renameFamily({
        family_id: session.user.primary_family_id,
        user_id: session.user_id,
        name: params.input.family_name || "",
      });
      if (!family) return { ok: false, error: "family_update_forbidden", status: 403 };
      return { ok: true, value: { user: session.user, family, needs_onboarding: false } };
    }

    const user = await params.database.updateProfile({
      user_id: session.user_id,
      nickname: params.input.nickname,
      avatar_url: params.input.avatar_url,
    });
    const family = user.primary_family_id
      ? await params.database.getFamilyForUser({ family_id: user.primary_family_id, user_id: session.user_id })
      : null;
    return { ok: true, value: { user, family, needs_onboarding: !family } };
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
        returning id, name, invite_code
      `;
      return { id: rows[0].id, name: rows[0].name, role: "owner", invite_code: rows[0].invite_code };
    },

    async attachOwner(input) {
      await sql`
        insert into public.family_members (family_id, user_id, role, display_name, avatar_text)
        values (${input.family_id}, ${input.user_id}, 'owner', ${input.display_name || null}, '家')
      `;
    },

    async findFamilyByInviteCode(code) {
      const rows = await sql`
        select id, name, invite_code
        from public.families
        where upper(invite_code) = ${code.toUpperCase()}
        limit 1
      `;
      if (!rows[0]) return null;
      return { id: rows[0].id, name: rows[0].name, role: "member", invite_code: rows[0].invite_code };
    },

    async attachMember(input) {
      await sql`
        insert into public.family_members (family_id, user_id, role, display_name, avatar_text)
        values (${input.family_id}, ${input.user_id}, 'member', ${input.display_name || null}, '家')
        on conflict (family_id, user_id) do update set
          display_name = coalesce(excluded.display_name, public.family_members.display_name)
      `;
    },

    async getFamilyForUser(input) {
      const rows = await sql`
        select fm.role, f.id, f.name, f.invite_code
        from public.family_members fm
        join public.families f on f.id = fm.family_id
        where fm.user_id = ${input.user_id}
          and fm.family_id = ${input.family_id}
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

    async renameFamily(input) {
      const rows = await sql`
        update public.families f
        set name = ${input.name},
            updated_at = now()
        from public.family_members fm
        where f.id = ${input.family_id}
          and fm.family_id = f.id
          and fm.user_id = ${input.user_id}
          and fm.role in ('owner', 'admin')
        returning f.id, f.name, f.invite_code, fm.role
      `;
      if (!rows[0]) return null;
      return {
        id: rows[0].id,
        name: rows[0].name,
        role: rows[0].role,
        invite_code: rows[0].invite_code,
      };
    },

    async updateProfile(input) {
      const rows = await sql`
        update public.app_users
        set nickname = coalesce(${input.nickname || null}, nickname),
            avatar_url = coalesce(${input.avatar_url || null}, avatar_url),
            updated_at = now()
        where id = ${input.user_id}
        returning id, nickname, avatar_url, primary_family_id, status
      `;
      if (!rows[0]) throw new Error("Missing updated user");
      return rows[0] as HomeChiefUser;
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
