export type DraftSaveStatus = "saved" | "unsaved" | "saving" | "error";

export function draftSaveStatusLabel(status: DraftSaveStatus): string {
  switch (status) {
    case "saving":
      return "Guardando...";
    case "unsaved":
    case "error":
      return "Sin guardar";
    case "saved":
      return "Guardado";
  }
}

export function draftSaveStatusClassName(status: DraftSaveStatus): string {
  switch (status) {
    case "saving":
      return "text-amber-300";
    case "unsaved":
      return "text-slate-400";
    case "error":
      return "text-rose-300";
    case "saved":
      return "text-emerald-300";
  }
}
