export async function handler(): Promise<Response> {
  return Response.json({ error: "deployment_required" }, { status: 501 });
}

if (import.meta.main) {
  Deno.serve(handler);
}
