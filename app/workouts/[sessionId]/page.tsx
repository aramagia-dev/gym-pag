import ActiveWorkout from "@/src/features/active-workout/active-workout";

export default async function ActiveWorkoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  return <ActiveWorkout sessionId={sessionId} />;
}
