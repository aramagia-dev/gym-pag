import RoutineForm from "@/src/features/routines/routine-form";

export default async function EditRoutinePage({ params }: { params: Promise<{ routineId: string }> }) {
  const { routineId } = await params;
  return <RoutineForm routineId={routineId} />;
}
