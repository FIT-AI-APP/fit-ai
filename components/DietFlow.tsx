"use client";

import { useState } from "react";
import type { Diet, DietRequest, UserInfo } from "@/lib/types";
import { loadDiet, loadDietCheck, loadRoutine, loadRoutineInput, saveDiet } from "@/lib/storage";
import { readDietFile } from "@/lib/exportFiles";
import DietView from "./DietView";
import {
  Card,
  CardTitle,
  ErrorText,
  Field,
  GhostButton,
  Loading,
  NumberInput,
  PrimaryButton,
  ScreenHeader,
  inputClass,
  textareaClass,
} from "./ui";
import { FilePicker } from "./parts";

type Phase = "form" | "loading" | "result";

export default function DietFlow({
  userInfo,
  onUserInfoChange,
  onBack,
}: {
  userInfo: UserInfo;
  onUserInfoChange: (info: UserInfo) => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [allergy, setAllergy] = useState("");
  const [weight, setWeight] = useState(String(userInfo.weight));
  const [height, setHeight] = useState(String(userInfo.height));
  const [goalText, setGoalText] = useState("");
  const [hasRecent] = useState(() => !!loadDiet());
  const [useRecent, setUseRecent] = useState(hasRecent);
  const [imported, setImported] = useState<Diet | null>(null);
  const [fileMsg, setFileMsg] = useState("");
  const [hasRoutine] = useState(() => !!loadRoutine());
  const [linkRoutine, setLinkRoutine] = useState(false);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    const d = await readDietFile(file);
    setImported(d);
    setFileMsg(d ? `불러옴: ${file.name}` : "파일을 읽을 수 없습니다. 불러오기 없이 진행합니다.");
  }

  async function generate() {
    const w = Number(weight);
    const h = Number(height);
    if (!(w >= 20 && w <= 300)) return setError("체중을 20~300kg 사이 숫자로 입력해주세요.");
    if (!(h >= 100 && h <= 250)) return setError("키를 100~250cm 사이 숫자로 입력해주세요.");

    setError("");
    setPhase("loading");
    if (w !== userInfo.weight || h !== userInfo.height) onUserInfoChange({ ...userInfo, weight: w, height: h });

    const previousDiet = imported ?? (useRecent ? loadDiet() ?? undefined : undefined);
    const check = loadDietCheck();
    const routine = linkRoutine ? loadRoutine() : null;
    const hours = Number(loadRoutineInput()?.hours);
    const body: DietRequest = {
      allergy,
      weight: w,
      height: h,
      age: userInfo.age,
      activity: userInfo.activity,
      goalText,
      goal: userInfo.goal,
      gender: userInfo.gender,
      targetWeight: userInfo.targetWeight,
      targetWeeks: userInfo.targetWeeks,
      previousDiet,
      previousDietCheck: previousDiet && check?.createdAt === previousDiet.createdAt ? check : undefined,
      linkedRoutine: routine ?? undefined,
      hoursPerDay: routine ? (hours >= 0.5 && hours <= 6 ? hours : 1) : undefined,
    };
    try {
      const res = await fetch("/api/diet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.error;
        throw new Error(msg || "식단 생성에 실패했습니다. 다시 시도해주세요.");
      }
      const data = (await res.json()) as Diet;
      saveDiet(data); // 성공했을 때만 덮어씀: 실패하면 기존 lastDiet 유지
      setDiet(data);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "식단 생성에 실패했습니다. 다시 시도해주세요.");
      setPhase("form");
    }
  }

  if (phase === "loading") return <Loading message="식단 제작 중..." />;

  if (phase === "result" && diet) {
    return (
      <div>
        <ScreenHeader title="주간 식단" sub="목표 칼로리 기반 맞춤 식단" onBack={onBack} />
        <div className="space-y-3">
          <DietView
            diet={diet}
            onCreateNext={() => {
              setImported(null);
              setFileMsg("");
              setUseRecent(true);
              setPhase("form");
            }}
          />
          <GhostButton onClick={onBack}>처음 화면으로</GhostButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader title="식단 생성" sub="조건을 입력하세요" onBack={onBack} />
      <div className="space-y-2">
        <Card className="space-y-4">
          <CardTitle title="기본 정보" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="체중">
              <NumberInput unit="kg" value={weight} onChange={setWeight} />
            </Field>
            <Field label="키">
              <NumberInput unit="cm" value={height} onChange={setHeight} />
            </Field>
          </div>
          <Field label="알레르기">
            <input
              className={inputClass}
              maxLength={200}
              placeholder="예: 땅콩, 갑각류 (없으면 비워두세요)"
              value={allergy}
              onChange={(e) => setAllergy(e.target.value)}
            />
          </Field>
        </Card>

        <Card className="space-y-2">
          <CardTitle title="목표" sub="자유롭게 적어주세요" />
          <textarea
            rows={3}
            maxLength={200}
            className={textareaClass}
            placeholder="예: 근손실 없이 체지방을 줄이고 싶어요"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
          />
        </Card>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
            linkRoutine ? "border-primary bg-primary-tint" : "border-line bg-surface"
          } ${hasRoutine ? "" : "cursor-not-allowed opacity-60"}`}
        >
          <input
            type="checkbox"
            className="mt-0.5"
            checked={linkRoutine}
            disabled={!hasRoutine}
            onChange={(e) => setLinkRoutine(e.target.checked)}
          />
          <span>
            <span className={`block text-base font-bold ${linkRoutine ? "text-primary" : "text-ink"}`}>운동 루틴을 연결할까요?</span>
            <span className="block text-[13px] text-muted">
              {hasRoutine
                ? "최근 루틴의 운동일에 운동 소모 칼로리만큼 더 주고, 운동 전후 간식을 배치합니다."
                : "먼저 운동 루틴을 만들어 주세요."}
            </span>
          </span>
        </label>

        <Card className="space-y-2">
          <CardTitle title="이전 식단 불러오기" sub="선택 · 최근 식단 이어서 만들기" />
          {hasRecent && (
            <label className="flex items-center gap-2 text-[15px]">
              <input
                type="checkbox"
                checked={useRecent && !imported}
                disabled={!!imported}
                onChange={(e) => setUseRecent(e.target.checked)}
              />
              최근 식단 이어서 만들기
            </label>
          )}
          <FilePicker onFile={onFile} message={fileMsg} />
        </Card>
      </div>

      <div className="mt-4 space-y-2">
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton onClick={generate}>{error ? "다시 시도" : "식단 만들기"}</PrimaryButton>
        <GhostButton onClick={onBack}>처음 화면으로</GhostButton>
      </div>
    </div>
  );
}
