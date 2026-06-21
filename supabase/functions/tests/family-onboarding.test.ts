import { assertEquals } from "jsr:@std/assert";
import { parseFamilyOnboardingRequest, performFamilyOnboarding } from "../family-onboarding/index.ts";

Deno.test("family-onboarding requires a bearer token", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ action: "create_family", family_name: "林家的厨房" }),
  });
  const result = await parseFamilyOnboardingRequest(request);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "missing_token");
});

Deno.test("family-onboarding requires a family name", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    headers: { Authorization: "Bearer session-token" },
    body: JSON.stringify({ action: "create_family" }),
  });
  const result = await parseFamilyOnboardingRequest(request);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "missing_family_name");
});

Deno.test("family-onboarding creates the first family for a valid session", async () => {
  const calls: string[] = [];
  const result = await performFamilyOnboarding({
    input: {
      token: "session-token",
      action: "create_family",
      family_name: "林家的厨房",
    },
    inviteCodeFactory: () => "HC123456",
    database: {
      async findSession(tokenHash: string) {
        calls.push(`session:${tokenHash.length}`);
        return {
          user_id: "user-1",
          user: {
            id: "user-1",
            nickname: "妈妈",
            avatar_url: null,
            primary_family_id: null,
            status: "active",
          },
        };
      },
      async createFamily(input) {
        calls.push(`family:${input.name}:${input.invite_code}:${input.owner_user_id}`);
        return { id: "family-1", name: input.name, role: "owner" };
      },
      async attachOwner(input) {
        calls.push(`owner:${input.family_id}:${input.user_id}`);
      },
      async setPrimaryFamily(input) {
        calls.push(`primary:${input.user_id}:${input.family_id}`);
        return {
          id: input.user_id,
          nickname: "妈妈",
          avatar_url: null,
          primary_family_id: input.family_id,
          status: "active",
        };
      },
    },
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.family.id, "family-1");
    assertEquals(result.value.needs_onboarding, false);
    assertEquals(result.value.user.primary_family_id, "family-1");
  }
  assertEquals(calls, [
    "session:64",
    "family:林家的厨房:HC123456:user-1",
    "owner:family-1:user-1",
    "primary:user-1:family-1",
  ]);
});

Deno.test("family-onboarding rejects invalid sessions", async () => {
  const result = await performFamilyOnboarding({
    input: {
      token: "missing-token",
      action: "create_family",
      family_name: "林家的厨房",
    },
    database: {
      async findSession() {
        return null;
      },
      async createFamily() {
        throw new Error("should not create family");
      },
      async attachOwner() {
        throw new Error("should not attach owner");
      },
      async setPrimaryFamily() {
        throw new Error("should not update user");
      },
    },
    inviteCodeFactory: () => "unused",
  });

  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "invalid_session");
});
