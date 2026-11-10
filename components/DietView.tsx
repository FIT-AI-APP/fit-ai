"use client";

import { useId, useState } from "react";
import type { Diet, DietDay } from "@/lib/types";
import { loadDietCheck, saveDietCheck } from "@/lib/storage";
import DownloadBar from "./DownloadBar";
import { WeekStrip, scrollToDay } from "./parts";
import { GhostButton, Modal, Notice, PrimaryButton, SecondaryButton, Stat, dayColor } from "./ui";

const keyOf = (day: string, meal: string) => `${day}|${meal}`;
const dayTotal = (d: DietDay) => d.meals.reduce((a, m) => a + m.calories, 0);

export default function DietView({ diet, onCreateNext }: { diet: Diet; onCreateNext?: () => void }) {
  const [open, setOpen] = useState(false);
  const prefix = `diet${useId()}`;
  // 화면 표시만 일요일을 맨 앞으로 (데이터와 파일은 월~일 순서 그대로)
  const ordered = [...diet.days.filter((d) => d.day === "일"), ...diet.days.filter((d) => d.day !== "일")];
  const linked = diet.days.some((d) => d.training !== undefined);

  // 하루 평균 (통계 줄)
  const avg = (k: "calories" | "carbs" | "protein") =>
    Math.round(diet.days.reduce((a, d) => a + d.meals.reduce((s, m) => s + m[k], 0), 0) / diet.days.length);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 rounded-xl border border-line bg-surface py-3">
        <Stat value={avg("calories")} label="kcal / 일 평균" />
        <Stat value={`${avg("carbs")}g`} label="탄수" />
        <Stat value={`${avg("protein")}g`} label="단백질" />
      </div>
      {diet.targetKcal && (
        <p className="text-[13px] text-muted">
          하루 목표 칼로리 약 <b className="text-ink">{diet.targetKcal}kcal</b>
          {linked && " · 운동일은 운동 소모량만큼 더함"}
        </p>
      )}

      <WeekStrip
        items={ordered.map((d) => ({ day: d.day, label: `${dayTotal(d)}`, strong: d.training }))}
        onPick={(day) => scrollToDay(prefix, day)}
      />
      <p className="text-[11px] text-faint">
        요약 줄 숫자는 하루 합계 kcal{linked && ", 파란 칸은 운동일"} · 요일을 누르면 이동
      </p>

      <div className="space-y-2">
        {ordered.map((d) => (
          <section key={d.day} id={`${prefix}-${d.day}`} className="scroll-mt-4 rounded-xl border border-line bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <span className={dayColor(d.day)}>{d.day}</span>
                {d.training !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      d.training ? "bg-primary-tint text-primary" : "bg-white text-faint"
                    }`}
                  >
                    {d.training ? "운동일" : "휴식일"}
                  </span>
                )}
              </h3>
              <span className="text-[13px] text-muted">
                <b className="text-ink">{dayTotal(d)}</b>
                {d.targetKcal ? ` / ${d.targetKcal}` : ""} kcal
              </span>
            </div>
            <ul className="divide-y divide-divider overflow-hidden rounded-[10px] border border-line bg-white">
              {d.meals.map((m) => (
                <li key={m.type} className="px-3 py-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-bold text-primary">{m.type}</span>
                    <span className="text-[13px] text-muted">{m.calories}kcal</span>
                  </div>
                  <div className="mt-0.5 text-[15px] text-ink">{m.menu}</div>
                  <div className="mt-0.5 text-xs text-faint">
                    탄 {m.carbs}g · 단 {m.protein}g · 지 {m.fat}g
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Notice>
        알레르기 정보는 직접 확인하세요.
        {diet.unknownAllergy?.length ? ` (자료에 없는 항목: ${diet.unknownAllergy.join(", ")})` : ""}
      </Notice>
      <PrimaryButton onClick={() => setOpen(true)}>식단 검사</PrimaryButton>
      <DownloadBar kind="diet" data={diet} />

      {open && <CheckModal diet={diet} ordered={ordered} onClose={() => setOpen(false)} onCreateNext={onCreateNext} />}
    </div>
  );
}

// 식단 검사: 팝업 안에서 요일을 세로로 내려가며 끼니마다 먹음/안 먹음 체크
function CheckModal({
  diet,
  ordered,
  onClose,
  onCreateNext,
}: {
  diet: Diet;
  ordered: DietDay[];
  onClose: () => void;
  onCreateNext?: () => void;
}) {
  const prefix = `dietcheck${useId()}`;
  const [eaten, setEaten] = useState<Record<string, boolean>>(() => {
    const saved = loadDietCheck();
    return saved && saved.createdAt === diet.createdAt ? saved.eaten : {};
  });

  const toggle = (k: string) => setEaten((p) => ({ ...p, [k]: !p[k] }));
  const save = () => saveDietCheck({ createdAt: diet.createdAt, eaten });

  const all = ordered.flatMap((d) => d.meals.map((m) => keyOf(d.day, m.type)));
  const count = all.filter((k) => eaten[k]).length;
  const dayCount = (d: DietDay) => d.meals.filter((m) => eaten[keyOf(d.day, m.type)]).length;

  return (
    <Modal
      title="식단 검사"
      right={
        <span className="text-sm text-muted">
          먹은 끼니 <b className="text-primary">{count}</b> / {all.length}
        </span>
      }
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
              저장하고 새 식단 만들기
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
      <div className="sticky top-0 z-10 bg-white pb-2">
        <WeekStrip
          items={ordered.map((d) => ({
            day: d.day,
            label: `${dayCount(d)}/${d.meals.length}`,
            strong: dayCount(d) === d.meals.length,
          }))}
          onPick={(day) => scrollToDay(prefix, day)}
        />
        <p className="mt-2 text-[13px] text-muted">먹은 끼니를 눌러 체크하세요. 다음 식단을 만들 때 반영됩니다.</p>
      </div>

      <div className="space-y-4">
        {ordered.map((d) => (
          <div key={d.day} id={`${prefix}-${d.day}`} className="scroll-mt-28">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className={`text-sm font-bold ${dayColor(d.day)}`}>{d.day}요일</span>
              <span className="text-xs text-muted">
                {dayCount(d)} / {d.meals.length}
              </span>
            </div>
            <div className="space-y-2">
              {d.meals.map((m) => {
                const k = keyOf(d.day, m.type);
                const on = !!eaten[k];
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(k)}
                    className={`flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition ${
                      on ? "border-primary bg-primary-tint" : "border-line bg-white hover:bg-surface"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                        on ? "border-primary bg-primary text-white" : "border-line text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-ink">
                        {m.type}
                        <span className={`ml-2 font-normal ${on ? "text-primary" : "text-faint"}`}>
                          {on ? "먹음" : "안 먹음"}
                        </span>
                      </span>
                      <span className="block text-[13px] text-muted">{m.menu}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
