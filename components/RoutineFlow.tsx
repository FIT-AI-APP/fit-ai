"use client";

import { useState } from "react";
import {
  LEVEL_DESC,
  LEVEL_LABEL,
  type Level,
  type Routine,
  type RoutineRequest,
  type UserInfo,
} from "@/lib/types";
import { clearLevelInfo, loadLevelInfo, loadRoutine, loadRoutineCheck, loadRoutineInput, saveRoutine, saveRoutineInput } from "@/lib/storage";
import { readRoutineFile } from "@/lib/exportFiles";
import RoutineView from "./RoutineView";
import {
  Card,
  CardTitle,
  ChoiceGroup,
  ErrorText,
  Field,
  GhostButton,
  Loading,
  NumberInput,
  PrimaryButton,
  ScreenHeader,
  SecondaryButton,
  textareaClass,
} from "./ui";
import { FilePicker, LevelCheckLink } from "./parts";

type Phase = "form" | "loading" | "result";

const LEVEL_OPTIONS = (Object.keys(LEVEL_LABEL) as Level[]).map((value) => ({ value, label: LEVEL_LABEL[value] }));

export default function RoutineFlow({
  userInfo,
  onUserInfoChange,
  onLevelCheck,
  onBack,
}: {
  userInfo: UserInfo;
  onUserInfoChange: (info: UserInfo) => void;
  onLevelCheck: () => void;
  onBack: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [weight, setWeight] = useState(String(userInfo.weight));
  const [precise, setPrecise] = useState(() => loadLevelInfo());
  const [level, setLevel] = useState<Level>(() => precise?.level ?? userInfo.level ?? "low");
  const [hours, setHours] = useState(() => loadRoutineInput()?.hours ?? "1");
  const [goalText, setGoalText] = useState(() => loadRoutineInput()?.goalText ?? "");
  const [days, setDays] = useState(() => String(userInfo.daysPerWeek ?? 3));
  const [hasRecent] = useState(() => !!loadRoutine());
  const [useRecent, setUseRecent] = useState(hasRecent);
  const [imported, setImported] = useState<Routine | null>(null);
  const [fileMsg, setFileMsg] = useState("");
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    const r = await readRoutineFile(file);
    setImported(r);
    setFileMsg(r ? `불러옴: ${file.name}` : "파일을 읽을 수 없습니다. 불러오기 없이 진행합니다.");
  }

  async function generate() {
    const w = Number(weight);
    const h = Number(hours);
    if (!(w >= 20 && w <= 300)) return setError("체중을 20~300kg 사이 숫자로 입력해주세요.");
    if (!(h >= 0.5 && h <= 6)) return setError("운동 시간을 0.5~6시간 사이로 입력해주세요.");
    const dpw = Number(days);
    if (!(Number.isInteger(dpw) && dpw >= 1 && dpw <= 7)) return setError("주당 운동 일수를 1~7일 사이로 입력해주세요.");

    setError("");
    setPhase("loading");

    // 수준·주당 운동 일수는 한 번 고르면 저장해 다음에 미리 채움
    onUserInfoChange({ ...userInfo, weight: w, level, daysPerWeek: dpw });
    saveRoutineInput({ hours, goalText });

    const previousRoutine = imported ?? (useRecent ? loadRoutine() ?? undefined : undefined);
    const check = loadRoutineCheck();
    const body: RoutineRequest = {
      exerciseType: "헬스",
      hoursPerDay: h,
      daysPerWeek: dpw,
      goalText,
      goal: userInfo.goal,
      targetWeight: userInfo.targetWeight,
      weight: w,
      gender: userInfo.gender,
      level,
      previousRoutine,
      previousCheck: previousRoutine && check?.createdAt === previousRoutine.createdAt ? check : undefined,
    };
    try {
      const res = await fetch("/api/routine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.error;
        throw new Error(msg || "루틴 생성에 실패했습니다. 다시 시도해주세요.");
      }
      const data = (await res.json()) as Routine;
      saveRoutine(data); // 성공했을 때만 덮어씀: 실패하면 기존 lastRoutine 유지
      setRoutine(data);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "루틴 생성에 실패했습니다. 다시 시도해주세요.");
      setPhase("form");
    }
  }

  if (phase === "loading") return <Loading message="루틴 제작 중..." />;

  if (phase === "result" && routine) {
    return (
      <div>
        <ScreenHeader title="주간 운동 루틴" sub="목표 기반 맞춤 루틴" onBack={onBack} />
        <div className="space-y-3">
          <RoutineView
            routine={routine}
            onCreateNext={() => {
              setImported(null);
              setUseRecent(true);
              setPhase("form");
            }}
          />
          <LevelCheckLink onClick={onLevelCheck} />
          <GhostButton onClick={onBack}>처음 화면으로</GhostButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader title="운동 생성" sub="목표와 조건을 입력하세요" onBack={onBack} />
      <div className="space-y-2">
        <Card className="space-y-4">
          <CardTitle title="기본 정보" sub="운동 종류: 헬스 (헬스장 기준)" />
          <Field label="체중">
            <NumberInput unit="kg" value={weight} onChange={setWeight} />
          </Field>
          {precise ? (
            <div className="space-y-3 rounded-[10px] border border-primary bg-primary-tint p-3">
              <div className="text-xs font-bold text-primary">운동 수준 (정밀 체크 결과 우선 적용)</div>
              <div className="text-2xl font-bold text-ink">{LEVEL_LABEL[precise.level]}</div>
              <div className="grid grid-cols-2 gap-2">
                <SecondaryButton className="!h-10 text-sm" onClick={onLevelCheck}>
                  다시 측정
                </SecondaryButton>
                <GhostButton
                  className="!h-10 text-sm"
                  onClick={() => {
                    clearLevelInfo();
                    setPrecise(null);
                  }}
                >
                  해제하고 직접 선택
                </GhostButton>
              </div>
            </div>
          ) : (
            <div>
              <ChoiceGroup label="운동 수준" options={LEVEL_OPTIONS} value={level} onChange={setLevel} />
              <ul className="mt-2 space-y-0.5 text-xs text-muted">
                {(Object.keys(LEVEL_LABEL) as Level[]).map((l) => (
                  <li key={l}>
                    <b className="font-bold text-ink">{LEVEL_LABEL[l]}</b> {LEVEL_DESC[l]}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <CardTitle title="가능 시간" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="하루 운동 시간">
              <NumberInput unit="시간" value={hours} onChange={setHours} />
            </Field>
            <Field label="주당 운동 일수">
              <NumberInput unit="일" decimal={false} value={days} onChange={setDays} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-2">
          <CardTitle title="목표" sub="자유롭게 적어주세요" />
          <textarea
            rows={3}
            maxLength={200}
            className={textareaClass}
            placeholder="예: 가슴과 어깨를 키우고 싶어요"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
          />
        </Card>

        <Card className="space-y-2">
          <CardTitle title="이전 루틴 불러오기" sub="선택 · 최근 루틴 이어서 만들기" />
          {hasRecent && (
            <label className="flex items-center gap-2 text-[15px]">
              <input
                type="checkbox"
                checked={useRecent && !imported}
                disabled={!!imported}
                onChange={(e) => setUseRecent(e.target.checked)}
              />
              최근 루틴 이어서 만들기
            </label>
          )}
          <FilePicker onFile={onFile} message={fileMsg} />
        </Card>

        {!precise && <LevelCheckLink onClick={onLevelCheck} />}
      </div>

      <div className="mt-4 space-y-2">
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton onClick={generate}>{error ? "다시 시도" : "루틴 만들기"}</PrimaryButton>
        <GhostButton onClick={onBack}>처음 화면으로</GhostButton>
      </div>
    </div>
  );
}
