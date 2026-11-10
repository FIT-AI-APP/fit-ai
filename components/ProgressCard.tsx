"use client";

import { useState } from "react";
import type { UserInfo, WeightEntry } from "@/lib/types";
import { calcProgress } from "@/lib/progress";
import { Card, CardTitle, ErrorText, GhostButton, Modal, NumberInput, PrimaryButton, SecondaryButton, Stat } from "./ui";

// 화면 B 진행 상황 카드: 시작 → 현재 → 목표 체중, 진행률, 남은 기간, 체중 기록
export default function ProgressCard({
  userInfo,
  log,
  onRecord,
}: {
  userInfo: UserInfo;
  log: WeightEntry[];
  onRecord: (weight: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const p = calcProgress(userInfo, log);
  const maintain = userInfo.goal === "maintain";
  const recent = log.slice(-8).reverse();

  return (
    <Card className="space-y-4">
      <CardTitle
        title="진행 상황"
        sub={maintain ? "체중 유지" : "목표 체중까지"}
        right={
          p.weeksLeft !== null && (
            <span className="rounded-full bg-primary-tint px-2.5 py-1 text-xs font-bold text-primary">
              남은 기간 {p.weeksLeft}주
            </span>
          )
        }
      />

      {maintain ? (
        <div className="rounded-[10px] border border-line bg-white p-3">
          <Stat value={`${p.current}kg`} label="현재" />
          <p className={`mt-2 text-center text-[13px] font-bold ${p.maintainOk ? "text-primary" : "text-danger"}`}>
            {p.maintainOk ? "목표 체중 ±1kg 유지 중" : `목표 체중(${userInfo.targetWeight}kg)에서 1kg 넘게 벗어남`}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 rounded-[10px] border border-line bg-white py-3">
            <Stat value={p.start} label="시작 kg" />
            <Stat value={p.current} label="현재 kg" />
            <Stat value={p.target} label="목표 kg" />
          </div>
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-divider">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(p.rate * 100)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              진행률 <b className="text-ink">{Math.round(p.rate * 100)}%</b>
              {p.projected !== null && ` · 지금 속도라면 목표 시점에 약 ${p.projected}kg`}
            </p>
          </div>
        </>
      )}

      {recent.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-bold text-muted">최근 기록</div>
          <ul className="divide-y divide-divider">
            {recent.map((e) => (
              <li key={e.date} className="flex justify-between py-1.5 text-[13px]">
                <span className="text-muted">{e.date}</span>
                <span className="font-bold text-ink">{e.weight}kg</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SecondaryButton onClick={() => setOpen(true)}>체중 기록</SecondaryButton>
      {open && (
        <RecordModal
          initial={p.current}
          onClose={() => setOpen(false)}
          onSave={(w) => {
            onRecord(w);
            setOpen(false);
          }}
        />
      )}
    </Card>
  );
}

function RecordModal({
  initial,
  onClose,
  onSave,
}: {
  initial: number;
  onClose: () => void;
  onSave: (weight: number) => void;
}) {
  const [value, setValue] = useState(String(initial));
  const [error, setError] = useState("");

  const save = () => {
    const w = Number(value);
    if (!(w >= 20 && w <= 300)) return setError("체중을 20~300kg 사이 숫자로 입력해주세요.");
    onSave(w);
  };

  return (
    <Modal
      title="오늘 체중 기록"
      onClose={onClose}
      footer={
        <div className="grid grid-cols-2 gap-2">
          <GhostButton onClick={onClose}>닫기</GhostButton>
          <PrimaryButton onClick={save}>저장</PrimaryButton>
        </div>
      }
    >
      <NumberInput unit="kg" value={value} onChange={setValue} />
      {error && (
        <div className="mt-2">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </Modal>
  );
}
