"use client";

import { loadDiet, loadRoutine } from "@/lib/storage";
import DietView from "./DietView";
import RoutineView from "./RoutineView";
import { CardTitle, GhostButton, ScreenHeader } from "./ui";

function Empty() {
  return (
    <div className="rounded-xl border border-line bg-surface py-10 text-center text-[15px] text-muted">
      저장된 루틴/식단이 없습니다
    </div>
  );
}

export default function SavedView({
  onBack,
  onCreateNext,
  onCreateNextDiet,
}: {
  onBack: () => void;
  onCreateNext: () => void;
  onCreateNextDiet: () => void;
}) {
  const routine = loadRoutine();
  const diet = loadDiet();

  return (
    <div>
      <ScreenHeader title="기존 루틴/식단" sub="가장 최근 1개씩 보여줘요" onBack={onBack} />
      <div className="space-y-8">
        <section>
          <CardTitle title="운동 루틴" sub={routine ? routine.createdAt.slice(0, 10) : undefined} />
          {routine ? <RoutineView routine={routine} onCreateNext={onCreateNext} /> : <Empty />}
        </section>

        <section>
          <CardTitle title="식단" sub={diet ? diet.createdAt.slice(0, 10) : undefined} />
          {diet ? <DietView diet={diet} onCreateNext={onCreateNextDiet} /> : <Empty />}
        </section>

        <GhostButton onClick={onBack}>처음 화면으로</GhostButton>
      </div>
    </div>
  );
}
