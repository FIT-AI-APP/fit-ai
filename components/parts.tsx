"use client";

import { useRef } from "react";

// 파일 불러오기 (.md / .txt): 기본 파일 입력 대신 버튼 모양
export function FilePicker({ onFile, message }: { onFile: (f: File | undefined) => void; message?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <input
        ref={ref}
        type="file"
        accept=".md,.txt"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="h-10 w-full rounded-[10px] border border-dashed border-faint bg-white text-sm text-muted transition hover:border-primary hover:text-primary"
      >
        파일 선택 (.md / .txt)
      </button>
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}

// 일주일 요약 줄: 7칸에 요일 + 짧은 요약만 (폰 폭에서도 한 줄에 다 보임). 누르면 해당 요일로 이동
export function WeekStrip({
  items,
  onPick,
}: {
  items: { day: string; label: string; strong?: boolean }[];
  onPick: (day: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-line bg-white">
      {items.map((it, i) => (
        <button
          key={it.day}
          type="button"
          onClick={() => onPick(it.day)}
          className={`flex min-w-0 flex-col items-center gap-1 px-0.5 py-2 transition hover:bg-primary-tint ${
            i > 0 ? "border-l border-divider" : ""
          }`}
        >
          <span
            className={`text-sm font-bold ${it.day === "일" ? "text-sun" : it.day === "토" ? "text-sat" : "text-ink"}`}
          >
            {it.day}
          </span>
          <span
            className={`w-full truncate rounded-md px-0.5 py-0.5 text-center text-[11px] leading-tight ${
              it.strong ? "bg-primary-tint font-bold text-primary" : "text-faint"
            }`}
          >
            {it.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// 요일 카드로 부드럽게 스크롤
export function scrollToDay(prefix: string, day: string) {
  document.getElementById(`${prefix}-${day}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// "내 중량으로 더 정확하게 맞추기" 안내 카드
export function LevelCheckLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-line bg-surface p-4 text-left transition hover:bg-white"
    >
      <span>
        <span className="block text-base font-bold text-ink">내 중량으로 맞추기</span>
        <span className="block text-[13px] text-muted">정확한 중량 추천</span>
      </span>
      <span className="text-xl text-faint">›</span>
    </button>
  );
}
