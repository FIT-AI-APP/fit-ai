"use client";

import { useEffect, useState } from "react";
import type { UserInfo, WeightEntry } from "@/lib/types";
import { addWeightLog, loadUserInfo, loadWeightLog, saveUserInfo } from "@/lib/storage";
import InfoForm from "@/components/InfoForm";
import RoutineFlow from "@/components/RoutineFlow";
import DietFlow from "@/components/DietFlow";
import LevelCheck from "@/components/LevelCheck";
import SavedView from "@/components/SavedView";
import ProgressCard from "@/components/ProgressCard";
import { PrimaryButton, ScreenHeader, SecondaryButton } from "@/components/ui";
import { LevelCheckLink } from "@/components/parts";

type View = "loading" | "info" | "home" | "routine" | "levelCheck" | "diet" | "saved";

// 나이·키·활동량이 없는 예전 저장값은 화면 A에서 미리 채운 채로 다시 받음
const isComplete = (v: Partial<UserInfo> | null): v is UserInfo =>
  !!v && !!v.weight && !!v.gender && !!v.goal && !!v.targetWeight && !!v.age && !!v.height && !!v.activity;

export default function Page() {
  const [view, setView] = useState<View>("loading");
  const [stored, setStored] = useState<Partial<UserInfo> | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [log, setLog] = useState<WeightEntry[]>([]);
  // 식단 검사의 "저장하고 새 식단 만들기"로 들어오면 최근 식단을 이어서 만듦
  const [dietKey, setDietKey] = useState(0);

  // 페이지 로드 → localStorage 확인: 값 있음 → 화면 B / 없음 → 화면 A
  useEffect(() => {
    const saved = loadUserInfo();
    setStored(saved);
    setLog(loadWeightLog());
    if (isComplete(saved)) {
      setUserInfo(saved);
      setView("home");
    } else {
      setView("info");
    }
  }, []);

  const goHome = () => setView("home");

  function changeInfo(info: UserInfo) {
    // 체중이 바뀌었거나 기록이 없으면 체중 기록에도 남김
    if (!userInfo || userInfo.weight !== info.weight || loadWeightLog().length === 0) setLog(addWeightLog(info.weight));
    saveUserInfo(info);
    setUserInfo(info);
    setStored(info);
  }

  return (
    <main className="mx-auto w-full max-w-[430px] px-4 pb-10 pt-6">
      {view === "info" && (
        <InfoForm
          initial={stored}
          onBack={userInfo ? goHome : undefined}
          onSave={(info) => {
            changeInfo(info);
            setView("home");
          }}
        />
      )}

      {view === "home" && userInfo && (
        <div>
          <ScreenHeader title="무엇을 할까요?" sub="오늘의 작업을 선택하세요" />
          <div className="space-y-2">
            <PrimaryButton className="!h-16 text-base" onClick={() => setView("routine")}>
              운동 생성
            </PrimaryButton>
            <SecondaryButton
              className="!h-16 text-base"
              onClick={() => {
                setDietKey((k) => k + 1);
                setView("diet");
              }}
            >
              식단 생성
            </SecondaryButton>
            <SecondaryButton className="!h-16 text-base" onClick={() => setView("saved")}>
              기존 루틴/식단 보기
            </SecondaryButton>
            <SecondaryButton className="!h-16 text-base" onClick={() => setView("info")}>
              정보 수정
            </SecondaryButton>
            <LevelCheckLink onClick={() => setView("levelCheck")} />
          </div>
          <div className="pt-4">
            <ProgressCard
              userInfo={userInfo}
              log={log}
              onRecord={(w) => {
                setLog(addWeightLog(w));
                const next = { ...userInfo, weight: w };
                saveUserInfo(next);
                setUserInfo(next);
                setStored(next);
              }}
            />
          </div>
        </div>
      )}

      {view === "routine" && userInfo && (
        <RoutineFlow
          userInfo={userInfo}
          onUserInfoChange={changeInfo}
          onLevelCheck={() => setView("levelCheck")}
          onBack={goHome}
        />
      )}
      {view === "levelCheck" && userInfo && (
        <LevelCheck
          userInfo={userInfo}
          onSave={(info) => {
            changeInfo(info);
            setView("routine");
          }}
          onBack={goHome}
        />
      )}
      {view === "diet" && userInfo && (
        <DietFlow key={dietKey} userInfo={userInfo} onUserInfoChange={changeInfo} onBack={goHome} />
      )}
      {view === "saved" && (
        <SavedView
          onBack={goHome}
          onCreateNext={() => setView("routine")}
          onCreateNextDiet={() => {
            setDietKey((k) => k + 1);
            setView("diet");
          }}
        />
      )}
    </main>
  );
}
