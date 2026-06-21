import { assertEquals } from "jsr:@std/assert";
import { parseWechatLoginRequest } from "../wechat-login/index.ts";

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
