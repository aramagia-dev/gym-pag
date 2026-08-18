export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function validateInviteCode(value: string): string | null {
  const code = normalizeInviteCode(value);
  if (!code) return "Ingrese un código de invitación.";
  if (!/^[A-Z2-9]{6,12}$/.test(code)) return "El código debe tener entre 6 y 12 caracteres válidos.";
  return null;
}

export function validateGroupName(value: string): string | null {
  const name = normalizeGroupName(value);
  if (name.length < 2) return "El nombre debe tener al menos 2 caracteres.";
  if (name.length > 80) return "El nombre no puede superar 80 caracteres.";
  return null;
}

export function normalizeGroupName(value: string): string {
  return value.trim();
}

export function normalizeGroupDescription(value: string): string {
  return value.trim();
}
