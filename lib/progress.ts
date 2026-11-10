import type { Goal, UserInfo, WeightEntry } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const toTime = (date: string) => new Date(`${date}T00:00:00`).getTime();
const r1 = (n: number) => Math.round(n * 10) / 10;

// 목표 속도 현실성: 감량은 주당 체중의 1%, 벌크업은 주당 0.5% 초과 시 경고 (저장은 막지 않음)
export function speedWarning(goal: Goal, weight: number, targetWeight: number, weeks: number): string {
  if (goal === "maintain" || !(weeks > 0) || !(weight > 0)) return "";
  const perWeek = Math.abs(weight - targetWeight) / weeks;
  const limit = weight * (goal === "lose" ? 0.01 : 0.005);
  if (perWeek <= limit) return "";
  return `목표 속도가 빠릅니다. 주당 약 ${r1(perWeek)}kg인데, 권장은 주당 ${r1(limit)}kg 이하입니다.`;
}

export interface Progress {
  start: number;
  current: number;
  target: number;
  // 0~1, 목표 방향 기준 (반대로 가면 0)
  rate: number;
  weeksLeft: number | null;
  // 지금 속도라면 목표 시점 예상 체중 (기록 2개 이상일 때만)
  projected: number | null;
  maintainOk?: boolean;
}

export function calcProgress(info: UserInfo, log: WeightEntry[]): Progress {
  const current = log.length ? log[log.length - 1].weight : info.weight;
  const startEntry = info.startDate ? log.find((e) => e.date >= info.startDate!) : log[0];
  const start = startEntry?.weight ?? current;
  const target = info.goal === "maintain" ? start : info.targetWeight;

  let rate = 0;
  if (info.goal !== "maintain" && start !== target) {
    rate = Math.min(1, Math.max(0, (start - current) / (start - target)));
  }

  let weeksLeft: number | null = null;
  let endTime: number | null = null;
  if (info.startDate && info.targetWeeks && info.goal !== "maintain") {
    endTime = toTime(info.startDate) + info.targetWeeks * 7 * DAY_MS;
    weeksLeft = Math.max(0, Math.ceil((endTime - Date.now()) / (7 * DAY_MS)));
  }

  let projected: number | null = null;
  const since = startEntry ? log.filter((e) => e.date >= startEntry.date) : log;
  if (endTime && since.length >= 2) {
    const first = since[0];
    const last = since[since.length - 1];
    const days = (toTime(last.date) - toTime(first.date)) / DAY_MS;
    if (days > 0) {
      const perDay = (last.weight - first.weight) / days;
      const daysToEnd = Math.max(0, (endTime - toTime(last.date)) / DAY_MS);
      projected = r1(last.weight + perDay * daysToEnd);
    }
  }

  return {
    start,
    current,
    target,
    rate,
    weeksLeft,
    projected,
    maintainOk: info.goal === "maintain" ? Math.abs(current - info.targetWeight) <= 1 : undefined,
  };
}
