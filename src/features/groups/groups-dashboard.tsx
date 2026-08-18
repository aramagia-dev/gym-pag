"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Group } from "@/src/domain/models/groups";
import type { RoutineTemplate } from "@/src/domain/models/workout";
import type { SharedRoutineShare } from "@/src/domain/models/shared-routine";
import { createSharedRoutineService, routineService } from "@/src/application/composition";
import { SupabaseGroupRepository } from "@/src/infrastructure/groups/supabase-group-repository";
import { SupabaseSharedRoutineRepository } from "@/src/infrastructure/groups/supabase-shared-routine-repository";
import { getSupabaseBrowserClient } from "@/src/infrastructure/auth/supabase-browser";
import { normalizeInviteCode, validateGroupName, validateInviteCode } from "@/src/features/groups/group-validation";
import { copyInviteCode } from "@/src/features/groups/invite-clipboard";

function errorMessage(reason: unknown): string {
  const error = reason as { code?: string; message?: string };
  if (error.message?.toLowerCase().includes("invalid or expired")) return "El código no es válido, venció o ya no tiene usos disponibles.";
  if (error.code === "23505") return "Ya compartiste esa rutina con ese grupo.";
  if (error.code === "23514") return "La rutina compartida no cumple las validaciones de Supabase. Verifique que la migración 008 esté aplicada correctamente.";
  if (error.code === "42501") return "Supabase rechazó la operación por permisos. Verifique las políticas RLS.";
  if (error.code === "42P01") return "Falta la tabla de grupos o rutinas compartidas. Ejecute todas las migraciones.";
  if (error.code) return `No se pudo completar la operación. Código: ${error.code}.`;
  return "No se pudo completar la operación. Revise la configuración de Supabase e intente nuevamente.";
}

export default function GroupsDashboard() {
  const [services] = useState(() => {
    const client = getSupabaseBrowserClient();
    if (!client) return { groups: null, shared: null, client: null };
    const sharedRepository = new SupabaseSharedRoutineRepository(client);
    return {
      groups: new SupabaseGroupRepository(client),
      shared: createSharedRoutineService(sharedRepository),
      client,
    };
  });
  const [groups, setGroups] = useState<Group[]>([]);
  const [routines, setRoutines] = useState<RoutineTemplate[]>([]);
  const [shares, setShares] = useState<SharedRoutineShare[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [selectedRoutine, setSelectedRoutine] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setRoutines(await routineService.list());
      if (services.groups) setGroups(await services.groups.list());
      if (services.shared) setShares(await services.shared.list());
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    void Promise.all([
      routineService.list(),
      services.groups?.list() ?? Promise.resolve([]),
      services.shared?.list() ?? Promise.resolve([]),
    ]).then(([localRoutines, loadedGroups, loadedShares]) => {
      if (!active) return;
      setRoutines(localRoutines);
      setGroups(loadedGroups);
      setShares(loadedShares);
    }).catch((reason: unknown) => { if (active) setError(errorMessage(reason)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [services]);
  useEffect(() => {
    if (!services.client) return;
    void services.client.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [services]);

  async function createGroup(event: React.FormEvent) {
    event.preventDefault(); setError(null); setMessage(null);
    const validation = validateGroupName(name); if (validation) { setError(validation); return; }
    if (!services.groups) return; setBusy("create");
    try { await services.groups.create(name, description); setName(""); setDescription(""); setMessage("Grupo creado correctamente."); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(null); }
  }

  async function joinGroup(event: React.FormEvent) {
    event.preventDefault(); setError(null); setMessage(null);
    const validation = validateInviteCode(inviteCode); if (validation) { setError(validation); return; }
    if (!services.groups) return; setBusy("join");
    try { const result = await services.groups.joinByInviteCode(inviteCode); setInviteCode(""); setMessage(result.joined ? "Se unió al grupo correctamente." : "Ya pertenece a ese grupo."); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(null); }
  }

  async function publishRoutine(event: React.FormEvent) {
    event.preventDefault(); setError(null); setMessage(null);
    if (!services.shared || !selectedRoutine || !selectedGroup) { setError("Seleccione una rutina y un grupo."); return; }
    setBusy("publish");
    try { await services.shared.publish(selectedRoutine, selectedGroup); setMessage("Rutina compartida como solo lectura."); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(null); }
  }

  async function revokeShare(shareId: string) {
    if (!services.shared) return; setBusy(`revoke-${shareId}`); setError(null); setMessage(null);
    try { await services.shared.revoke(shareId); setMessage("Compartición revocada."); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(null); }
  }

  async function generateInvite(groupId: string) {
    if (!services.groups) return;
    setBusy(`invite-${groupId}`); setError(null); setMessage(null); setCopiedInviteId(null);
    try { await services.groups.createInvite(groupId); setMessage("Código de invitación generado correctamente."); await refresh(); }
    catch (reason) { setError(errorMessage(reason)); } finally { setBusy(null); }
  }

  async function copyInvite(groupId: string, code: string) {
    if (busy !== null) return;
    setBusy(`copy-${groupId}`); setError(null); setMessage(null);
    try { await copyInviteCode(code); setCopiedInviteId(groupId); setMessage("Código copiado."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo copiar el código. Copie el código manualmente."); }
    finally { setBusy(null); }
  }

  function formatInviteExpiration(value: string): string {
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }

  const sharesByGroup = groups.map((group) => ({ group, shares: shares.filter((share) => share.groupId === group.id) })).filter((item) => item.shares.length > 0);

  return <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-8 sm:py-10"><div className="mx-auto max-w-5xl"><header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">Gym / Comunidad privada</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mis grupos</h1><p className="mt-2 max-w-xl text-sm text-slate-400">Sus rutinas y entrenamientos siguen siendo locales. Las rutinas compartidas son instantáneas privadas y de solo lectura.</p></div><nav className="flex flex-wrap gap-2 text-sm" aria-label="Navegación principal"><Link className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300" href="/">Inicio</Link><Link className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300" href="/data">Datos</Link><Link className="min-h-11 rounded-lg bg-cyan-400 px-3 py-2.5 font-semibold text-slate-950" href="/groups">Grupos</Link><Link className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300" href="/account">Cuenta</Link></nav></header>
    {!services.groups && <p className="mb-6 rounded-xl border border-amber-900/70 bg-amber-950/30 p-4 text-sm text-amber-200">Supabase no está configurado. Las rutinas locales siguen disponibles, pero no se pueden cargar grupos ni compartir.</p>}
    <div className="grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold">Crear un grupo</h2><form className="mt-5 space-y-4" onSubmit={createGroup}><label className="block text-sm font-medium">Nombre<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white" /></label><label className="block text-sm font-medium">Descripción <span className="text-slate-500">(opcional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white" /></label><button disabled={!services.groups || busy !== null} className="min-h-12 w-full rounded-xl bg-cyan-400 px-4 font-bold text-slate-950 disabled:opacity-60">{busy === "create" ? "Creando..." : "Crear grupo"}</button></form></section><section className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold">Unirse con un código</h2><p className="mt-2 text-sm text-slate-400">Los códigos vencen en 7 días y permiten hasta 3 usos.</p><form className="mt-5 space-y-4" onSubmit={joinGroup}><label className="block text-sm font-medium">Código de invitación<input value={inviteCode} onChange={(event) => setInviteCode(normalizeInviteCode(event.target.value))} maxLength={12} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 uppercase tracking-[0.2em] text-white" /></label><button disabled={!services.groups || busy !== null} className="min-h-12 w-full rounded-xl border border-cyan-400 px-4 font-bold text-cyan-200 disabled:opacity-60">{busy === "join" ? "Uniéndose..." : "Unirse al grupo"}</button></form></section></div>
    {message && <p role="status" className="mt-6 rounded-xl border border-emerald-900/70 bg-emerald-950/40 p-4 text-sm text-emerald-200">{message}</p>}{error && <p role="alert" className="mt-6 rounded-xl border border-rose-900/70 bg-rose-950/50 p-4 text-sm text-rose-200">{error}</p>}
    <section className="mt-6 rounded-2xl border border-cyan-900/60 bg-slate-900 p-6"><h2 className="text-2xl font-semibold">Compartir una rutina</h2><p className="mt-2 text-sm text-slate-400">Se publica una copia de la prescripción. No incluye pesos, sesiones, historial ni analíticas, y no modifica su rutina local.</p>{routines.length === 0 ? <p className="mt-4 text-sm text-slate-400">Cree una rutina local para poder compartirla.</p> : groups.length === 0 ? <p className="mt-4 text-sm text-slate-400">Cree o únase a un grupo para poder compartir rutinas.</p> : <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={publishRoutine}><label className="text-sm font-medium">Rutina<select value={selectedRoutine} onChange={(event) => setSelectedRoutine(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"><option value="">Seleccione...</option>{routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}</select></label><label className="text-sm font-medium">Grupo<select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-white"><option value="">Seleccione...</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><button disabled={busy !== null || !services.shared} className="min-h-12 self-end rounded-xl bg-cyan-400 px-4 font-bold text-slate-950 disabled:opacity-60">{busy === "publish" ? "Compartiendo..." : "Compartir"}</button></form>}</section>
     <section className="mt-6" aria-labelledby="groups-list-title"><h2 id="groups-list-title" className="text-2xl font-semibold">Grupos a los que pertenece</h2>{loading ? <p className="mt-4 text-sm text-slate-400">Cargando grupos...</p> : groups.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">Todavía no pertenece a ningún grupo.</p> : <div className="mt-4 grid gap-4">{groups.map((group) => <article key={group.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h3 className="text-xl font-semibold">{group.name}</h3>{group.description && <p className="mt-2 text-sm text-slate-400">{group.description}</p>}<p className="mt-3 text-sm text-slate-300">{group.members.length} {group.members.length === 1 ? "miembro" : "miembros"}</p><div className="mt-4 flex flex-wrap gap-2">{group.members.map((member) => <span key={member.userId} className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">{member.displayName}{member.role === "owner" ? " · administrador" : ""}</span>)}</div><div className="mt-5 rounded-xl border border-cyan-900/60 bg-slate-950/60 p-4"><h4 className="font-semibold">Invitación al grupo</h4>{group.activeInvite ? <><p className="mt-2 text-2xl font-bold tracking-[0.2em] text-cyan-300">{group.activeInvite.code}</p><p className="mt-2 text-xs text-slate-400">Usos: {group.activeInvite.uses} de {group.activeInvite.maxUses} · Vence: {formatInviteExpiration(group.activeInvite.expiresAt)}</p><button type="button" disabled={busy !== null} onClick={() => void copyInvite(group.id, group.activeInvite!.code)} className="mt-3 min-h-11 rounded-lg border border-cyan-400 px-3 py-2 text-sm font-semibold text-cyan-200 disabled:opacity-60">{busy === `copy-${group.id}` ? "Copiando..." : copiedInviteId === group.id ? "Código copiado." : "Copiar código"}</button></> : <><p className="mt-2 text-sm text-slate-400">Genere un código para invitar a otras personas.</p><button type="button" disabled={busy !== null || !services.groups} onClick={() => void generateInvite(group.id)} className="mt-3 min-h-11 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-60">{busy === `invite-${group.id}` ? "Generando..." : "Generar código de invitación"}</button></>}</div></article>)}</div>}</section>
    <section className="mt-6" aria-labelledby="shared-routines-title"><h2 id="shared-routines-title" className="text-2xl font-semibold">Rutinas compartidas</h2>{sharesByGroup.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">No hay rutinas compartidas activas.</p> : <div className="mt-4 grid gap-4">{sharesByGroup.map(({ group, shares: groupShares }) => <article key={group.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h3 className="text-xl font-semibold">{group.name}</h3><div className="mt-4 grid gap-4">{groupShares.map((share) => <div key={share.id} className="rounded-xl border border-slate-700 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold">{share.snapshot.name}</h4><p className="mt-1 text-xs text-slate-400">{share.snapshot.daysOfWeek.join(", ")} · solo lectura</p></div>{share.publisherId !== currentUserId && <span className="text-xs text-slate-400">Compartida por un miembro</span>}{share.publisherId === currentUserId && <button disabled={busy !== null} onClick={() => void revokeShare(share.id)} className="rounded-lg border border-rose-800 px-3 py-2 text-xs text-rose-200 disabled:opacity-60">{busy === `revoke-${share.id}` ? "Revocando..." : "Revocar"}</button>}</div>{share.snapshot.notes && <p className="mt-3 text-sm text-slate-400">{share.snapshot.notes}</p>}<ul className="mt-3 space-y-2">{share.snapshot.exercises.map((exercise) => <li key={`${share.id}-${exercise.exerciseId}`} className="text-sm text-slate-300"><span className="font-medium">{exercise.order + 1}. {exercise.exerciseName}</span><span className="ml-2 text-slate-400">{exercise.sets.map((set) => `${set.reps} reps`).join(" · ")}</span></li>)}</ul></div>)}</div></article>)}</div>}</section>
  </div></main>;
}
