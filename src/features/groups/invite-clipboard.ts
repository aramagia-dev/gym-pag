export interface InviteClipboard {
  writeText(text: string): Promise<void>;
}

export async function copyInviteCode(
  code: string,
  clipboard?: InviteClipboard,
): Promise<void> {
  const target = clipboard ?? (
    typeof navigator !== "undefined" ? navigator.clipboard : undefined
  );

  if (!target) {
    throw new Error("El portapapeles no está disponible. Copie el código manualmente.");
  }

  try {
    await target.writeText(code);
  } catch {
    throw new Error("No se pudo copiar el código. Copie el código manualmente.");
  }
}
