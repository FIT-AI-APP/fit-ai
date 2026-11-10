"use client";

import { useState } from "react";
import { CHECK_EXERCISES, evaluateLevel, type CheckId, type LevelInputs } from "@/lib/levelCheck";
import { EXERCISE_BY_ID } from "@/lib/exercises";
import { loadLevelInfo, saveLevelInfo } from "@/lib/storage";
import { LEVEL_LABEL, type UserInfo } from "@/lib/types";
import { Card, ErrorText, GhostButton, Notice, PrimaryButton, ScreenHeader, inputClass } from "./ui";

type Row = { weight: string; reps: string; none: boolean };

export default function LevelCheck({
  userInfo,
  onSave,
  onBack,
}: {
  userInfo: UserInfo;
  onSave: (info: UserInfo) => void;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<Record<CheckId, Row>>(() => {
    const saved = loadLevelInfo()?.inputs;
    return Object.fromEntries(
      CHECK_EXERCISES.map((id) => {
        const v = saved?.[id];
        return [id, { weight: v ? String(v.weight) : "", reps: v ? String(v.reps) : "", none: false }];
      }),
    ) as Record<CheckId, Row>;
  });
  const [error, setError] = useState("");

  const update = (id: CheckId, patch: Partial<Row>) => setRows((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  function save() {
    const inputs = {} as LevelInputs;
    for (const id of CHECK_EXERCISES) {
      const r = rows[id];
      if (r.none || (!r.weight && !r.reps)) {
        inputs[id] = null; // 입력 없는 종목은 하로 처리
        continue;
      }
      const weight = Number(r.weight);
      const reps = Number(r.reps);
      if (!(weight > 0 && weight <= 500) || !(Number.isInteger(reps) && reps >= 1 && reps <= 30))
        return setError(`${EXERCISE_BY_ID.get(id)!.name}: 무게(kg)와 횟수(1~30회)를 올바르게 입력해주세요.`);
      inputs[id] = { weight, reps };
    }
    setError("");
    const info = evaluateLevel(inputs, userInfo.weight, userInfo.gender);
    saveLevelInfo(info);
    onSave({ ...userInfo, level: info.level });
  }

  return (
    <div>
      <ScreenHeader title="내 중량으로 맞추기" sub="정확한 중량 추천" onBack={onBack} />
      <div className="space-y-2">
        <Notice>
          종목마다 &quot;N회 가능한 무게&quot;를 입력하세요. 최대 중량을 직접 재지 않아도 되도록 Epley 공식(무게 × (1 + 횟수/30))으로
          추정합니다. 해본 적 없는 종목은 &quot;해본 적 없음&quot;을 고르면 하로 처리됩니다. 결과는 하/중/고 선택보다 우선합니다.
        </Notice>

        {CHECK_EXERCISES.map((id) => {
          const r = rows[id];
          return (
            <Card key={id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-ink">{EXERCISE_BY_ID.get(id)!.name}</span>
                <label className="flex items-center gap-1.5 text-[13px] text-muted">
                  <input type="checkbox" checked={r.none} onChange={(e) => update(id, { none: e.target.checked })} />
                  해본 적 없음
                </label>
              </div>
              <div className={`flex items-center gap-2 ${r.none ? "opacity-50" : ""}`}>
                <input
                  type="number"
                  inputMode="decimal"
                  disabled={r.none}
                  className={`${inputClass} !bg-white`}
                  placeholder="무게"
                  value={r.weight}
                  onChange={(e) => update(id, { weight: e.target.value })}
                />
                <span className="shrink-0 text-sm text-muted">kg ×</span>
                <input
                  type="number"
                  inputMode="numeric"
                  disabled={r.none}
                  className={`${inputClass} !bg-white`}
                  placeholder="횟수"
                  value={r.reps}
                  onChange={(e) => update(id, { reps: e.target.value })}
                />
                <span className="shrink-0 text-sm text-muted">회</span>
              </div>
            </Card>
          );
        })}

        {userInfo.level && loadLevelInfo() && (
          <p className="text-sm font-bold text-primary">현재 적용 중인 수준: {LEVEL_LABEL[userInfo.level]}</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton onClick={save}>저장하고 루틴 만들기</PrimaryButton>
        <GhostButton onClick={onBack}>처음 화면으로</GhostButton>
      </div>
    </div>
  );
}
