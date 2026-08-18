import { describe, expect, it } from "vitest";
import { authErrorMessage, validateAuthForm } from "@/src/features/auth/auth-validation";

describe("auth validation", () => {
  it("requires an email", () => {
    expect(validateAuthForm({ email: "", password: "secret1" })).toBe("Ingrese su correo electrónico.");
  });

  it("requires a valid email and minimum password", () => {
    expect(validateAuthForm({ email: "persona", password: "secret1" })).toBe("Ingrese un correo electrónico válido.");
    expect(validateAuthForm({ email: "persona@example.com", password: "123" })).toBe("La contraseña debe tener al menos 6 caracteres.");
  });

  it("accepts valid credentials", () => {
    expect(validateAuthForm({ email: "persona@example.com", password: "secret1" })).toBeNull();
  });

  it("maps known Supabase errors to Spanish messages", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe("El correo o la contraseña no son correctos.");
    expect(authErrorMessage("unexpected error")).toBe("No se pudo completar la operación. Intente nuevamente.");
  });
});
