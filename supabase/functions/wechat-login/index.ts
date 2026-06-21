type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type WechatLoginInput = {
  code: string;
  nickname?: string;
  avatar_url?: string;
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

export async function handler(request: Request): Promise<Response> {
  const parsed = await parseWechatLoginRequest(request);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  return Response.json({
    needs_onboarding: true,
    message: "wechat-login database integration is configured in the deployment phase",
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
