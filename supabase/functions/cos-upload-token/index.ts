type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type CosUploadInput = {
  family_id: string;
  usage: string;
  mime_type: string;
  file_size: number;
};

export async function parseCosUploadRequest(request: Request): Promise<ParseResult<CosUploadInput>> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  if (typeof body.family_id !== "string" || !body.family_id.trim()) {
    return { ok: false, error: "missing_family_id" };
  }
  if (typeof body.mime_type !== "string" || !body.mime_type.startsWith("image/")) {
    return { ok: false, error: "invalid_mime_type" };
  }
  if (typeof body.file_size !== "number" || body.file_size <= 0) {
    return { ok: false, error: "invalid_file_size" };
  }
  return {
    ok: true,
    value: {
      family_id: body.family_id.trim(),
      usage: typeof body.usage === "string" ? body.usage : "post",
      mime_type: body.mime_type,
      file_size: body.file_size,
    },
  };
}

export async function handler(request: Request): Promise<Response> {
  const parsed = await parseCosUploadRequest(request);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  return Response.json({
    object_key: `families/${parsed.value.family_id}/${crypto.randomUUID()}`,
    message: "COS signing is configured in the deployment phase",
  });
}

if (import.meta.main) {
  Deno.serve(handler);
}
