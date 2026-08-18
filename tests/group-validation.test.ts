import { describe, expect, it } from "vitest";
import { normalizeGroupDescription, normalizeGroupName, normalizeInviteCode, validateInviteCode, validateGroupName } from "@/src/features/groups/group-validation";
import { mapGroup } from "@/src/features/groups/group-mapping";

describe("group validation and mapping", () => {
  it("normalizes invite codes", () => expect(normalizeInviteCode(" ab cd23 ")).toBe("ABCD23"));
  it("validates invite code shape", () => {
    expect(validateInviteCode("ABCD23")).toBeNull();
    expect(validateInviteCode("ABC-12")).toContain("6 y 12");
  });
  it("validates group names", () => expect(validateGroupName(" ")).toContain("2 caracteres"));
  it("normalizes group text before persistence", () => {
    expect(normalizeGroupName("  Equipo  ")).toBe("Equipo");
    expect(normalizeGroupDescription("  Martes  ")).toBe("Martes");
  });
  it("maps memberships and hides revoked invites", () => {
    const group = mapGroup({ id: "g", owner_id: "u", name: "Equipo", description: "", created_at: "2026-01-01" }, [{ group_id: "g", user_id: "u", role: "owner", joined_at: "2026-01-01", profiles: [{ display_name: "Ana" }] }], { id: "i", group_id: "g", code: "ABC234", expires_at: "2025-01-01", uses: 0, max_uses: 3, revoked_at: null });
    expect(group.members[0].displayName).toBe("Ana");
    expect(group.activeInvite).toBeUndefined();
  });
});
