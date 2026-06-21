import { assertEquals } from "jsr:@std/assert";
import { parseCosUploadRequest } from "../cos-upload-token/index.ts";

Deno.test("cos-upload-token rejects missing family id", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ mime_type: "image/jpeg", file_size: 100 }),
  });
  const result = await parseCosUploadRequest(request);
  assertEquals(result.ok, false);
});

Deno.test("cos-upload-token accepts image upload input", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({
      family_id: "00000000-0000-0000-0000-000000000001",
      mime_type: "image/jpeg",
      file_size: 100,
      usage: "post",
    }),
  });
  const result = await parseCosUploadRequest(request);
  assertEquals(result.ok, true);
});
