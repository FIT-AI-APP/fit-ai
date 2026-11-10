"use client";

import { useState } from "react";
import {
  ACTIVITY_DESC,
  ACTIVITY_LABEL,
  GENDER_LABEL,
  GOAL_LABEL,
  type Activity,
  type Gender,
  type Goal,
  type UserInfo,
} from "@/lib/types";
import { speedWarning } from "@/lib/progress";
import { today } from "@/lib/storage";
import { Card, CardTitle, ChoiceGroup, ErrorText, Field, GhostButton, NumberInput, PrimaryButton, ScreenHeader } from "./ui";

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

const str = (n: number | undefined) => (n ? String(n) : "");

export default function InfoForm({
  initial,
  onSave,
  onBack,
}: {
  initial: Partial<UserInfo> | null;
  onSave: (info: UserInfo) => void;
  onBack?: () => void;
}) {
  const [weight, setWeight] = useState(str(initial?.weight));
  const [gender, setGender] = useState<Gender | undefined>(initial?.gender);
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "lose");
  const [targetWeight, setTargetWeight] = useState(initial?.targetWeight ?? 0);
  const [targetWeeks, setTargetWeeks] = useState(str(initial?.targetWeeks));
  const [age, setAge] = useState(str(initial?.age));
  const [height, setHeight] = useState(str(initial?.height));
  const [activity, setActivity] = useState<Activity | undefined>(initial?.activity);
  const [error, setError] = useState("");

  const base = Number(weight) || 0;
  const maintain = goal === "maintain";
  // 슬라이더 범위: 현재 체중 기준 ±30kg
  const min = Math.max(0, Math.round(base - 30));
  const max = Math.round(base + 30);
  const warning = speedWarning(goal, base, targetWeight || base, Number(targetWeeks));

  function save() {
    const target = maintain ? base : targetWeight || base;
    const weeks = Number(targetWeeks);
    const a = Number(age);
    const h = Number(height);
    if (!(base >= 20 && base <= 300)) return setError("현재 체중을 20~300kg 사이 숫자로 입력해주세요.");
    if (!gender) return setError("성별을 선택해주세요.");
    if (!(a >= 10 && a <= 100 && Number.isInteger(a))) return setError("나이를 10~100 사이 정수로 입력해주세요.");
    if (!(h >= 100 && h <= 250)) return setError("키를 100~250cm 사이 숫자로 입력해주세요.");
    if (!activity) return setError("활동량을 선택해주세요.");
    if (!(target >= 20 && target <= 300)) return setError("목표 체중을 20~300kg 사이 숫자로 입력해주세요.");
    if (!maintain && !(weeks >= 1 && weeks <= 104 && Number.isInteger(weeks)))
      return setError("목표 기간을 1~104주 사이 정수로 입력해주세요.");
    setError("");

    // 목표(유형·체중·기간)가 바뀌었거나 처음이면 시작일을 새로 기록
    const goalChanged =
      !initial?.startDate ||
      initial.goal !== goal ||
      initial.targetWeight !== target ||
      (initial.targetWeeks ?? undefined) !== (maintain ? undefined : weeks);

    onSave({
      weight: base,
      gender,
      goal,
      targetWeight: target,
      targetWeeks: maintain ? undefined : weeks,
      startDate: goalChanged ? today() : initial!.startDate,
      age: a,
      height: h,
      activity,
      level: initial?.level,
      daysPerWeek: initial?.daysPerWeek,
    });
  }

  return (
    <div>
      <ScreenHeader title="내 정보 입력" sub="정확한 추천을 위해 필요해요 (이름 등 개인 정보는 받지 않아요)" onBack={onBack} />

      <div className="space-y-2">
        <Card className="space-y-4">
          <CardTitle title="신체 정보" />
          <Field label="현재 체중">
            <NumberInput
              unit="kg"
              value={weight}
              onChange={(v) => {
                setWeight(v);
                // 처음 입력할 때 목표 체중도 현재 체중으로 맞춰줌
                if (!targetWeight) setTargetWeight(Number(v) || 0);
              }}
            />
          </Field>
          <ChoiceGroup label="성별" options={toOptions(GENDER_LABEL)} value={gender} onChange={setGender} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="나이">
              <NumberInput unit="세" decimal={false} value={age} onChange={setAge} />
            </Field>
            <Field label="키">
              <NumberInput unit="cm" value={height} onChange={setHeight} />
            </Field>
          </div>
          <div>
            <ChoiceGroup label="활동량 (운동 제외 일상)" options={toOptions(ACTIVITY_LABEL)} value={activity} onChange={setActivity} />
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              {(Object.keys(ACTIVITY_LABEL) as Activity[]).map((k) => (
                <li key={k}>
                  <b className="font-bold text-ink">{ACTIVITY_LABEL[k]}</b> {ACTIVITY_DESC[k]}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="space-y-4">
          <CardTitle title="목표" />
          <ChoiceGroup label="목표 유형" options={toOptions(GOAL_LABEL)} value={goal} onChange={setGoal} />

          {!maintain && (
            <>
              <Field label="목표 체중">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={0.5}
                    value={targetWeight || base}
                    onChange={(e) => setTargetWeight(Number(e.target.value))}
                    className="flex-1"
                    disabled={!base}
                  />
                  <NumberInput
                    unit="kg"
                    className="w-28"
                    value={targetWeight ? String(targetWeight) : ""}
                    onChange={(v) => setTargetWeight(Number(v) || 0)}
                  />
                </div>
              </Field>
              <Field label="목표 기간">
                <NumberInput unit="주" decimal={false} placeholder="예: 12" value={targetWeeks} onChange={setTargetWeeks} />
              </Field>
              {warning && <ErrorText>{warning}</ErrorText>}
            </>
          )}
        </Card>
      </div>

      <div className="mt-4 space-y-2">
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton onClick={save}>저장</PrimaryButton>
        {onBack && <GhostButton onClick={onBack}>처음 화면으로</GhostButton>}
      </div>
    </div>
  );
}
