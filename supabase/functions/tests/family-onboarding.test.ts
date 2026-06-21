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
        return { id: "family-1", name: input.name, role: "owner", invite_code: input.invite_code };
      },
      async attachOwner(input) {
        calls.push(`owner:${input.family_id}:${input.user_id}`);
      },
      async findFamilyByInviteCode() {
        throw new Error("should not find family");
      },
      async attachMember() {
        throw new Error("should not attach member");
      },
      async getFamilyForUser() {
        throw new Error("should not get family");
      },
      async renameFamily() {
        throw new Error("should not rename family");
      },
      async updateProfile() {
        throw new Error("should not update profile");
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
    const family = result.value.family;
    assertEquals(family !== null, true);
    if (!family) throw new Error("missing family");
    assertEquals(family.id, "family-1");
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
      async findFamilyByInviteCode() {
        throw new Error("should not find family");
      },
      async attachMember() {
        throw new Error("should not attach member");
      },
      async getFamilyForUser() {
        throw new Error("should not get family");
      },
      async renameFamily() {
        throw new Error("should not rename family");
      },
      async updateProfile() {
        throw new Error("should not update profile");
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

Deno.test("family-onboarding joins a family by invite code", async () => {
  const calls: string[] = [];
  const result = await performFamilyOnboarding({
    input: {
      token: "session-token",
      action: "join_family",
      family_code: "hc88aa",
    },
    database: {
      async findSession() {
        calls.push("session");
        return {
          user_id: "user-2",
          user: {
            id: "user-2",
            nickname: "爸爸",
            avatar_url: "cos://avatar",
            primary_family_id: null,
            status: "active",
          },
        };
      },
      async createFamily() {
        throw new Error("should not create family");
      },
      async attachOwner() {
        throw new Error("should not attach owner");
      },
      async findFamilyByInviteCode(code) {
        calls.push(`family:${code}`);
        return { id: "family-1", name: "刘家小馆", role: "member", invite_code: "HC88AA" };
      },
      async attachMember(input) {
        calls.push(`member:${input.family_id}:${input.user_id}:${input.display_name}`);
      },
      async getFamilyForUser() {
        throw new Error("should not get family");
      },
      async renameFamily() {
        throw new Error("should not rename family");
      },
      async updateProfile() {
        throw new Error("should not update profile");
      },
      async setPrimaryFamily(input) {
        calls.push(`primary:${input.user_id}:${input.family_id}`);
        return {
          id: input.user_id,
          nickname: "爸爸",
          avatar_url: "cos://avatar",
          primary_family_id: input.family_id,
          status: "active",
        };
      },
    },
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    const family = result.value.family;
    assertEquals(family !== null, true);
    if (!family) throw new Error("missing family");
    assertEquals(family.invite_code, "HC88AA");
    assertEquals(family.role, "member");
    assertEquals(result.value.user.primary_family_id, "family-1");
  }
  assertEquals(calls, ["session", "family:HC88AA", "member:family-1:user-2:爸爸", "primary:user-2:family-1"]);
});

Deno.test("family-onboarding renames the current family", async () => {
  const result = await performFamilyOnboarding({
    input: {
      token: "session-token",
      action: "update_family_name",
      family_name: "周末厨房",
    },
    database: {
      async findSession() {
        return {
          user_id: "user-1",
          user: { id: "user-1", nickname: "妈妈", avatar_url: null, primary_family_id: "family-1", status: "active" },
        };
      },
      async createFamily() {
        throw new Error("should not create family");
      },
      async attachOwner() {
        throw new Error("should not attach owner");
      },
      async findFamilyByInviteCode() {
        throw new Error("should not find family");
      },
      async attachMember() {
        throw new Error("should not attach member");
      },
      async getFamilyForUser() {
        throw new Error("should not get family");
      },
      async renameFamily(input) {
        assertEquals(input.family_id, "family-1");
        assertEquals(input.user_id, "user-1");
        assertEquals(input.name, "周末厨房");
        return { id: "family-1", name: input.name, role: "owner", invite_code: "HC123456" };
      },
      async updateProfile() {
        throw new Error("should not update profile");
      },
      async setPrimaryFamily() {
        throw new Error("should not set primary family");
      },
    },
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    const family = result.value.family;
    assertEquals(family !== null, true);
    if (!family) throw new Error("missing family");
    assertEquals(family.name, "周末厨房");
  }
});

Deno.test("family-onboarding updates user profile", async () => {
  const result = await performFamilyOnboarding({
    input: {
      token: "session-token",
      action: "update_profile",
      nickname: "小刘",
      avatar_url: "cos://avatars/user-1.png",
    },
    database: {
      async findSession() {
        return {
          user_id: "user-1",
          user: { id: "user-1", nickname: "妈妈", avatar_url: null, primary_family_id: "family-1", status: "active" },
        };
      },
      async createFamily() {
        throw new Error("should not create family");
      },
      async attachOwner() {
        throw new Error("should not attach owner");
      },
      async findFamilyByInviteCode() {
        throw new Error("should not find family");
      },
      async attachMember() {
        throw new Error("should not attach member");
      },
      async getFamilyForUser() {
        return { id: "family-1", name: "林家的厨房", role: "owner", invite_code: "HC123456" };
      },
      async renameFamily() {
        throw new Error("should not rename family");
      },
      async updateProfile(input) {
        assertEquals(input.user_id, "user-1");
        assertEquals(input.nickname, "小刘");
        assertEquals(input.avatar_url, "cos://avatars/user-1.png");
        return {
          id: "user-1",
          nickname: input.nickname,
          avatar_url: input.avatar_url,
          primary_family_id: "family-1",
          status: "active",
        };
      },
      async setPrimaryFamily() {
        throw new Error("should not set primary family");
      },
    },
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.user.nickname, "小刘");
    assertEquals(result.value.user.avatar_url, "cos://avatars/user-1.png");
    const family = result.value.family;
    assertEquals(family !== null, true);
    if (!family) throw new Error("missing family");
    assertEquals(family.invite_code, "HC123456");
  }
});
