import { describe, expect, it, vi } from "vitest";
import { copyInviteCode } from "@/src/features/groups/invite-clipboard";

describe("copyInviteCode", () => {
  it("copies only the invitation code", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);

    await copyInviteCode("ABC234", { writeText });

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith("ABC234");
  });

  it("reports clipboard failures in Spanish", async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>().mockRejectedValue(new Error("denied"));

    await expect(copyInviteCode("ABC234", { writeText })).rejects.toThrow("No se pudo copiar el código");
  });

  it("reports when the clipboard is unavailable", async () => {
    await expect(copyInviteCode("ABC234")).rejects.toThrow("El portapapeles no está disponible");
  });
});
