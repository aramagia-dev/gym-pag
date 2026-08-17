import Link from "next/link";

export default function RoutineNavigation({ active }: { active: "home" | "routines" | "new" | "edit" }) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm" aria-label="Navegación principal">
      <Link className={`min-h-11 rounded-lg px-3 py-2.5 font-semibold ${active === "home" ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-300 hover:border-cyan-400"}`} href="/">Inicio</Link>
      <a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/exercises">Ejercicios</a>
      <a className={`min-h-11 rounded-lg px-3 py-2.5 font-semibold ${active === "routines" ? "bg-cyan-400 text-slate-950" : "border border-slate-700 text-slate-300 hover:border-cyan-400"}`} href="/routines">Rutinas</a>
      {active === "new" && <a className="min-h-11 rounded-lg bg-cyan-400 px-3 py-2.5 font-semibold text-slate-950" href="/routines/new">Nueva rutina</a>}
      <a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/history">Historial</a>
      <a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/analytics">Progreso</a>
      <a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/data">Datos</a>
    </nav>
  );
}
