import type { Exercise } from "@/src/domain/models/workout";

export const defaultExercises = [
  { id: "default-exercise-barbell-back-squat", name: "Sentadilla con barra", muscleGroup: "quadriceps", category: "squat", notes: "Controlar la profundidad y mantener la espalda neutra." },
  { id: "default-exercise-goblet-squat", name: "Sentadilla goblet", muscleGroup: "quadriceps", category: "squat", notes: "Usar como variante técnica o de calentamiento." },
  { id: "default-exercise-barbell-deadlift", name: "Peso muerto con barra", muscleGroup: "hamstrings", category: "hinge", notes: "Iniciar el movimiento con la espalda neutra y la barra cerca del cuerpo." },
  { id: "default-exercise-romanian-deadlift", name: "Peso muerto rumano", muscleGroup: "hamstrings", category: "hinge", notes: "Buscar tensión en los isquiotibiales sin perder la posición de la espalda." },
  { id: "default-exercise-barbell-bench-press", name: "Press de banca con barra", muscleGroup: "chest", category: "push", notes: "Mantener los hombros estables y los pies apoyados." },
  { id: "default-exercise-push-up", name: "Flexiones de brazos", muscleGroup: "chest", category: "push", notes: "Mantener el cuerpo alineado durante todo el movimiento." },
  { id: "default-exercise-overhead-press", name: "Press militar", muscleGroup: "shoulders", category: "push", notes: "Evitar compensar con la zona lumbar." },
  { id: "default-exercise-lateral-raise", name: "Elevaciones laterales", muscleGroup: "shoulders", category: "isolation", notes: "Subir con control y sin impulso." },
  { id: "default-exercise-pull-up", name: "Dominadas", muscleGroup: "back", category: "pull", notes: "Iniciar con las escápulas activas y controlar la bajada." },
  { id: "default-exercise-barbell-row", name: "Remo con barra", muscleGroup: "back", category: "pull", notes: "Mantener el torso estable y llevar la barra hacia el abdomen." },
  { id: "default-exercise-lat-pulldown", name: "Jalón al pecho", muscleGroup: "back", category: "pull", notes: "Llevar los codos hacia abajo sin balancear el torso." },
  { id: "default-exercise-barbell-curl", name: "Curl de bíceps con barra", muscleGroup: "biceps", category: "isolation", notes: "Evitar el impulso y controlar la extensión." },
  { id: "default-exercise-triceps-pushdown", name: "Extensión de tríceps en polea", muscleGroup: "triceps", category: "isolation", notes: "Mantener los codos cerca del cuerpo." },
  { id: "default-exercise-barbell-hip-thrust", name: "Hip thrust con barra", muscleGroup: "glutes", category: "hinge", notes: "Bloquear arriba con una contracción controlada de los glúteos." },
  { id: "default-exercise-walking-lunge", name: "Zancadas caminando", muscleGroup: "glutes", category: "lunge", notes: "Dar pasos estables y mantener la rodilla alineada." },
  { id: "default-exercise-standing-calf-raise", name: "Elevación de talones de pie", muscleGroup: "calves", category: "isolation", notes: "Completar el recorrido sin rebotar." },
  { id: "default-exercise-plank", name: "Plancha abdominal", muscleGroup: "core", category: "carry", notes: "Mantener la pelvis neutra y respirar con normalidad." },
  { id: "default-exercise-farmer-carry", name: "Paseo del granjero", muscleGroup: "forearms", category: "carry", notes: "Caminar erguido con pasos cortos y controlados." },
] satisfies readonly Exercise[];
