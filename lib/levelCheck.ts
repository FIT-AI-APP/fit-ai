import { EXERCISE_BY_ID } from "./exercises";
import type { Gender, Level } from "./types";

// 정밀 수준 체크 대상 4종목 (상체 위주이며 데드리프트·오버헤드 프레스는 빠져 있음)
export const CHECK_EXERCISES = ["bench-press", "squat", "barbell-row", "barbell-curl"] as const;
export type CheckId = (typeof CHECK_EXERCISES)[number];

// 종목별 입력: null이면 "해본 적 없음" (하로 처리)
export type LevelInputs = Record<CheckId, { weight: number; reps: number } | null>;

export interface LevelInfo {
  level: Level; // 4종목 수준의 평균(반올림)
  detail: Record<CheckId, Level>;
  inputs: LevelInputs;
}

const ORDER: Level[] = ["low", "mid", "high"];
const WORKING_RATIO = 0.75; // 8~12회 작업 중량 ≈ 1RM의 75%

// Epley: 1RM = 무게 × (1 + 횟수/30). 1RM 직접 측정은 부상 위험이 있어 N회 가능 무게로 추정
export const epley1RM = (weight: number, reps: number) => weight * (1 + reps / 30);

function levelOf(id: CheckId, input: { weight: number; reps: number } | null, bodyWeight: number, gender: Gender): Level {
  const mult = EXERCISE_BY_ID.get(id)?.weightMultiplier?.[gender];
  if (!input || !mult) return "low";
  const ratio = (epley1RM(input.weight, input.reps) * WORKING_RATIO) / bodyWeight;
  // 작업 중량 배수가 해당 수준 배수의 95% 이상이면 그 수준으로 판정
  return [...ORDER].reverse().find((l) => ratio >= mult[l] * 0.95) ?? "low";
}

export function evaluateLevel(inputs: LevelInputs, bodyWeight: number, gender: Gender): LevelInfo {
  const detail = Object.fromEntries(
    CHECK_EXERCISES.map((id) => [id, levelOf(id, inputs[id], bodyWeight, gender)]),
  ) as Record<CheckId, Level>;
  const avg = CHECK_EXERCISES.reduce((a, id) => a + ORDER.indexOf(detail[id]), 0) / CHECK_EXERCISES.length;
  return { level: ORDER[Math.round(avg)], detail, inputs };
}
