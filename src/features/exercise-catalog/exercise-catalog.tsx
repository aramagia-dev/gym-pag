"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import AuthStatus from "@/src/features/auth/auth-status";

import { exerciseCatalogService } from "@/src/application/composition";
import type {
  Exercise,
  ExerciseCategory,
  ExerciseMode,
  MuscleGroup,
} from "@/src/domain/models/workout";
import type {
  ExerciseInput,
  ExerciseUpdateInput,
} from "@/src/application/exercises/exercise-catalog-service";
import { filterExercises, type ExerciseFilters } from "./exercise-filters";

const muscleGroups: Array<{ value: MuscleGroup; label: string }> = [
  { value: "chest", label: "Pecho" }, { value: "back", label: "Espalda" }, { value: "shoulders", label: "Hombros" },
  { value: "biceps", label: "Bíceps" }, { value: "triceps", label: "Tríceps" }, { value: "forearms", label: "Antebrazos" },
  { value: "core", label: "Zona media" }, { value: "glutes", label: "Glúteos" }, { value: "quadriceps", label: "Cuádriceps" },
  { value: "hamstrings", label: "Isquiotibiales" }, { value: "calves", label: "Pantorrillas" },
];

const categories: Array<{ value: ExerciseCategory; label: string }> = [
  { value: "push", label: "Empuje" }, { value: "pull", label: "Tracción" }, { value: "hinge", label: "Bisagra" },
  { value: "squat", label: "Sentadilla" }, { value: "lunge", label: "Zancada" }, { value: "carry", label: "Carga" },
  { value: "rotation", label: "Rotación" }, { value: "isolation", label: "Aislamiento" },
];

function displayLabel<T extends string>(items: Array<{ value: T; label: string }>, value: T): string {
  return items.find((item) => item.value === value)?.label ?? value;
}

type FormState = ExerciseInput;

const emptyForm: FormState = {
  name: "",
  muscleGroup: "chest",
  category: "push",
  mode: "weighted",
  notes: "",
};

const maxImageSize = 2 * 1024 * 1024;

const emptyFilters: ExerciseFilters = {
  search: "",
  muscleGroup: "all",
  category: "all",
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un problema. Intente nuevamente.";
}

export default function ExerciseCatalog() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ExerciseFilters>(emptyFilters);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const filteredExercises = filterExercises(exercises, filters);
  const hasActiveFilters = filters.search.trim().length > 0 || filters.muscleGroup !== "all" || filters.category !== "all";

  useEffect(() => {
    let active = true;

    exerciseCatalogService
      .list()
      .then((items) => {
        if (active) setExercises(items);
      })
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
  }

  function startEditing(exercise: Exercise) {
    resetImageInput();
    setEditingId(exercise.id);
    setForm({
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      category: exercise.category,
      mode: exercise.mode,
      notes: exercise.notes ?? "",
      imageUrl: exercise.imageUrl,
    });
    setError(null);
  }

  function clearImage() {
    resetImageInput();
    updateField("imageUrl", undefined);
  }

  function resetImageInput() {
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function handleImageChange(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      resetImageInput();
      setError("Seleccione un archivo de imagen válido.");
      return;
    }
    if (file.size > maxImageSize) {
      resetImageInput();
      setError("La imagen no puede superar los 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        resetImageInput();
        setError("No se pudo leer la imagen. Intente nuevamente.");
        return;
      }
      updateField("imageUrl", reader.result);
      resetImageInput();
      setError(null);
    };
    reader.onerror = () => {
      resetImageInput();
      setError("No se pudo leer la imagen. Intente nuevamente.");
    };
    reader.readAsDataURL(file);
  }

  function cancelEditing() {
    resetImageInput();
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const saved = editingId
        ? await exerciseCatalogService.update({ ...form, id: editingId } satisfies ExerciseUpdateInput)
        : await exerciseCatalogService.create(form satisfies ExerciseInput);

      setExercises((current) =>
        editingId
          ? current.map((exercise) => (exercise.id === saved.id ? saved : exercise))
          : [...current, saved],
      );
      cancelEditing();
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
      if (!window.confirm("¿Desea eliminar este ejercicio?")) return;

    setError(null);
    try {
      await exerciseCatalogService.delete(id);
      setExercises((current) => current.filter((exercise) => exercise.id !== id));
      if (editingId === id) cancelEditing();
    } catch (reason: unknown) {
      setError(errorMessage(reason));
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-cyan-400">Gym / Biblioteca</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Catálogo de ejercicios</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-400">Construya una biblioteca clara de movimientos para cada sesión.</p>
          </div>
            <nav className="flex flex-wrap gap-2 text-sm"><Link className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/">Inicio</Link><a className="min-h-11 rounded-lg bg-cyan-400 px-3 py-2.5 font-semibold text-slate-950" href="/exercises">Ejercicios</a><a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/routines">Rutinas</a><a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/history">Historial</a><a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/analytics">Progreso</a><a className="min-h-11 rounded-lg border border-slate-700 px-3 py-2.5 text-slate-300 hover:border-cyan-400" href="/data">Datos</a><AuthStatus /></nav>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/20 sm:p-6" aria-labelledby="form-title">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="form-title" className="text-lg font-semibold">{editingId ? "Editar ejercicio" : "Agregar ejercicio"}</h2>
                <p className="mt-1 text-sm text-slate-400">Mantenga los datos del movimiento fáciles de consultar.</p>
              </div>
              {editingId && <button type="button" onClick={cancelEditing} className="min-h-11 rounded-lg px-3 text-sm font-medium text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-white">Cancelar</button>}
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-200" htmlFor="exercise-name">
                Nombre
                <input id="exercise-name" required value={form.name} onChange={(event) => updateField("name", event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white outline-none ring-cyan-400 transition focus:ring-2" placeholder="Press de banca con barra" />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-200" htmlFor="muscle-group">
                  Grupo muscular
                  <select id="muscle-group" value={form.muscleGroup} onChange={(event) => updateField("muscleGroup", event.target.value as MuscleGroup)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none ring-cyan-400 focus:ring-2">
                    {muscleGroups.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-200" htmlFor="exercise-category">
                  Categoría / patrón
                  <select id="exercise-category" value={form.category} onChange={(event) => updateField("category", event.target.value as ExerciseCategory)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none ring-cyan-400 focus:ring-2">
                    {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-200" htmlFor="exercise-mode">
                  Modalidad
                  <select id="exercise-mode" value={form.mode} onChange={(event) => updateField("mode", event.target.value as ExerciseMode)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none ring-cyan-400 focus:ring-2">
                    <option value="weighted">Con peso</option>
                    <option value="bodyweight">Peso corporal</option>
                  </select>
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-200" htmlFor="exercise-notes">
                Notas <span className="font-normal text-slate-500">(opcional)</span>
                <textarea id="exercise-notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} className="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-white outline-none ring-cyan-400 focus:ring-2" placeholder="Agarre, equipamiento o indicaciones técnicas" />
              </label>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200" htmlFor="exercise-image">
                  Imagen <span className="font-normal text-slate-500">(opcional)</span>
                  <input ref={imageInputRef} id="exercise-image" type="file" accept="image/*" onChange={(event) => handleImageChange(event.target.files?.[0])} className="mt-2 block min-h-12 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950" />
                </label>
                <p className="text-xs text-slate-500">Formatos de imagen, hasta 2 MB.</p>
                {form.imageUrl && (
                  <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <img src={form.imageUrl} alt="Vista previa del ejercicio" className="h-20 w-20 rounded-lg object-cover" />
                    <button type="button" onClick={clearImage} className="min-h-11 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-300 hover:border-rose-400 hover:text-rose-300">Quitar imagen</button>
                  </div>
                )}
              </div>

              {error && <p role="alert" className="rounded-lg border border-rose-900/70 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">{error}</p>}
              <button type="submit" disabled={saving} className="min-h-12 w-full rounded-xl bg-cyan-400 px-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar ejercicio"}</button>
            </form>
          </section>

          <section aria-labelledby="list-title">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="list-title" className="text-lg font-semibold">Sus movimientos</h2>
                {!loading && <p className="mt-1 text-sm text-slate-500">Mostrando {filteredExercises.length} de {exercises.length} ejercicios</p>}
              </div>
              {!loading && exercises.length > 0 && <span className="text-sm text-slate-500">Tarjetas adaptadas a móviles</span>}
            </div>

            {loading && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-400">Cargando ejercicios...</div>}
            {!loading && exercises.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center"><p className="font-medium text-slate-200">El catálogo está vacío</p><p className="mt-2 text-sm text-slate-400">Agregue su primer ejercicio para comenzar.</p></div>}
            {!loading && exercises.length > 0 && (
              <div className="mb-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <label className="block text-sm font-medium text-slate-200" htmlFor="exercise-search">
                  Buscar
                  <input id="exercise-search" type="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-base text-white outline-none ring-cyan-400 focus:ring-2" placeholder="Nombre o notas" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-200" htmlFor="filter-muscle-group">
                    Grupo muscular
                    <select id="filter-muscle-group" value={filters.muscleGroup} onChange={(event) => setFilters((current) => ({ ...current, muscleGroup: event.target.value as ExerciseFilters["muscleGroup"] }))} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none ring-cyan-400 focus:ring-2">
                      <option value="all">Todos los grupos</option>
                      {muscleGroups.map((group) => <option key={group.value} value={group.value}>{group.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-200" htmlFor="filter-category">
                    Categoría / patrón
                    <select id="filter-category" value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value as ExerciseFilters["category"] }))} className="mt-2 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none ring-cyan-400 focus:ring-2">
                      <option value="all">Todas las categorías</option>
                      {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                    </select>
                  </label>
                </div>
                {hasActiveFilters && <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-300 hover:border-cyan-400 hover:text-cyan-300">Limpiar filtros</button>}
              </div>
            )}
            {!loading && exercises.length > 0 && filteredExercises.length === 0 && <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center"><p className="font-medium text-slate-200">No hay ejercicios que coincidan con los filtros</p><p className="mt-2 text-sm text-slate-400">Pruebe otra búsqueda o limpie los filtros para volver a ver todo el catálogo.</p></div>}
            <div className="space-y-3">
              {filteredExercises.map((exercise) => (
                <article key={exercise.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex items-start justify-between gap-4">
                    {exercise.imageUrl ? <img src={exercise.imageUrl} alt={`Imagen de ${exercise.name}`} className="h-20 w-20 shrink-0 rounded-xl object-cover" /> : <div aria-label={`Sin imagen para ${exercise.name}`} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950 text-xs text-slate-500">Sin imagen</div>}
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-white">{exercise.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                        <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-cyan-300">{displayLabel(muscleGroups, exercise.muscleGroup)}</span>
                         <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">{displayLabel(categories, exercise.category)}</span>
                         <span className="rounded-full bg-violet-400/10 px-2.5 py-1 text-violet-300">{exercise.mode === "bodyweight" ? "Peso corporal" : "Con peso"}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => startEditing(exercise)} className="min-h-11 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300">Editar</button>
                      <button type="button" onClick={() => void handleDelete(exercise.id)} className="min-h-11 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-rose-300 hover:border-rose-400">Eliminar</button>
                    </div>
                  </div>
                  {exercise.notes && <p className="mt-4 border-t border-slate-800 pt-3 text-sm leading-6 text-slate-400">{exercise.notes}</p>}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
