"use client";

import { useId, useState } from "react";
import type { Routine, RoutineDay } from "@/lib/types";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import { loadRoutineCheck, saveRoutineCheck } from "@/lib/storage";
import DownloadBar from "./DownloadBar";
import { WeekStrip, scrollToDay } from "./parts";
import { GhostButton, Modal, Notice, PrimaryButton, SecondaryButton, dayColor } from "./ui";

const keyOf = (day: string, name: string) => `${day}|${name}`;

// 요약 줄에 넣을 짧은 이름: 그날 종목들의 주 부위 (최대 2개)
function focusOf(d: RoutineDay): string {
  if (d.rest) return "휴식";
  const muscles: string[] = [];
  for (const e of d.exercises) {
    const m = (e.id && EXERCISE_BY_ID.get(e.id)?.muscles[0]) || "";
    if (m && !muscles.includes(m)) muscles.push(m);
  }
  return muscles.slice(0, 2).join("·") || `${d.exercises.length}종목`;
}

export default function RoutineView({
  routine,
  onCreateNext,
}: {
  routine: Routine;
  onCreateNext?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const prefix = `routine${useId()}`;
  // 화면 표시만 일요일을 맨 앞으로 (데이터와 파일은 월~일 순서 그대로)
  const ordered = [...routine.days.filter((d) => d.day === "일"), ...routine.days.filter((d) => d.day !== "일")];
  const workDays = routine.days.filter((d) => !d.rest).length;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-muted">
          주 <b className="text-primary">{workDays}일</b> 운동 · 요일을 누르면 이동
        </span>
      </div>
      <WeekStrip
        items={ordered.map((d) => ({ day: d.day, label: focusOf(d), strong: !d.rest }))}
        onPick={(day) => scrollToDay(prefix, day)}
      />

      <div className="space-y-2">
        {ordered.map((d) =>
          d.rest ? (
            <div
              key={d.day}
              id={`${prefix}-${d.day}`}
              className="flex scroll-mt-4 items-center gap-3 rounded-xl border border-line bg-white px-4 py-3"
            >
              <span className={`w-6 text-base font-bold ${dayColor(d.day)}`}>{d.day}</span>
              <span className="text-[15px] text-faint">휴식</span>
            </div>
          ) : (
            <section key={d.day} id={`${prefix}-${d.day}`} className="scroll-mt-4 rounded-xl border border-line bg-surface p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-base font-bold">
                  <span className={dayColor(d.day)}>{d.day}</span>
                  <span className="ml-2 text-ink">{focusOf(d)}</span>
                </h3>
                <span className="text-xs text-muted">{d.exercises.length}종목</span>
              </div>
              <ul className="divide-y divide-divider overflow-hidden rounded-[10px] border border-line bg-white">
                {d.exercises.map((e) => (
                  <li key={e.name} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-bold text-ink">{e.name}</div>
                      <div className="text-[13px] text-muted">
                        {e.sets}세트 × {e.reps}회 · 휴식 {e.restSeconds}초
                      </div>
                    </div>
                    {e.weightKg != null && (
                      <div className="shrink-0 text-right">
                        <div className="text-lg font-bold text-primary">{e.weightKg}kg</div>
                        {e.weightBasis === "perHand" && <div className="text-[11px] text-muted">한 손</div>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}
      </div>

      <Notice>시작 중량은 참고용, 가볍게 시작해서 조절하세요.</Notice>

      <PrimaryButton onClick={() => setOpen(true)}>루틴 검사</PrimaryButton>
      <DownloadBar kind="routine" data={routine} />

      {open && <CheckModal routine={routine} ordered={ordered} onClose={() => setOpen(false)} onCreateNext={onCreateNext} />}
    </div>
  );
}

function CheckModal({
  routine,
  ordered,
  onClose,
  onCreateNext,
}: {
  routine: Routine;
  ordered: Routine["days"];
  onClose: () => void;
  onCreateNext?: () => void;
}) {
  const [done, setDone] = useState<Record<string, { sets: string; reps: string }>>(() => {
    const saved = loadRoutineCheck();
    if (!saved || saved.createdAt !== routine.createdAt) return {};
    return Object.fromEntries(
      Object.entries(saved.done).map(([k, v]) => [k, { sets: String(v.sets), reps: String(v.reps) }]),
    );
  });

  const setValue = (k: string, field: "sets" | "reps", value: string) =>
    setDone((p) => ({
      ...p,
      [k]: { ...(p[k] ?? { sets: "", reps: "" }), [field]: value.replace(/\D/g, "") },
    }));

  const save = () => {
    saveRoutineCheck({
      createdAt: routine.createdAt,
      done: Object.fromEntries(
        Object.entries(done).map(([k, v]) => [k, { sets: Number(v.sets) || 0, reps: Number(v.reps) || 0 }]),
      ),
    });
  };

  return (
    <Modal
      title="루틴 검사"
      right={<span className="text-xs text-muted">실행 / 목표</span>}
      onClose={onClose}
      footer={
        <>
          {onCreateNext && (
            <PrimaryButton
              onClick={() => {
                save();
                onCreateNext();
              }}
            >
              저장하고 새 루틴 만들기
            </PrimaryButton>
          )}
          <div className="grid grid-cols-2 gap-2">
            <GhostButton onClick={onClose}>닫기</GhostButton>
            <SecondaryButton
              onClick={() => {
                save();
                onClose();
              }}
            >
              저장
            </SecondaryButton>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        {ordered
          .filter((d) => !d.rest)
          .map((d) => (
            <div key={d.day}>
              <div className={`mb-1.5 text-sm font-bold ${dayColor(d.day)}`}>{d.day}요일</div>
              <ul className="space-y-2">
                {d.exercises.map((e) => {
                  const k = keyOf(d.day, e.name);
                  const target = e.sets * e.reps;
                  return (
                    <li key={k} className="space-y-2 rounded-[10px] border border-line bg-surface p-3 text-sm">
                      <div>
                        <span className="font-bold text-ink">{e.name}</span>
                        <span className="ml-1 text-xs text-muted">
                          ({e.sets}세트 × {e.reps}회)
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {(
                          [
                            ["sets", "세트", e.sets],
                            ["reps", "횟수", target],
                          ] as const
                        ).map(([field, label, goal]) => (
                          <span key={field} className="flex items-center gap-1.5">
                            <span className="text-xs text-muted">{label}</span>
                            <input
                              inputMode="numeric"
                              value={done[k]?.[field] ?? ""}
                              onChange={(ev) => setValue(k, field, ev.target.value)}
                              className="h-9 w-14 rounded-lg border border-line bg-white text-center text-ink outline-none focus:border-primary"
                              placeholder="0"
                            />
                            <span className="text-muted">/ {goal}</span>
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>
    </Modal>
  );
}
