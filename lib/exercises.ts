import data from "@/data/exercises.json";
import type { Gender, Level, WeightBasis } from "./types";

export interface ExerciseData {
  id: string;
  name: string;
  muscles: string[];
  level: "beginner" | "intermediate" | "advanced";
  equipment: string;
  risk: string;
  how: string;
  alternatives: string[];
  weightBasis: WeightBasis;
  weightMultiplier: Record<Gender, Record<Level, number>> | null;
}

export const EXERCISES = data as unknown as ExerciseData[];
export const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
export const EXERCISE_BY_NAME = new Map(EXERCISES.map((e) => [e.name, e]));

// 시작 중량 = 체중 × 배수 (8~12회 작업 중량 기준). AI가 아니라 코드가 계산한다.
// adjust: 이전 수행률 기반 보정 배율 (기본 1)
export function startWeight(
  ex: ExerciseData,
  weight: number,
  gender: Gender,
  level: Level,
  adjust = 1,
): number | null {
  if (ex.weightBasis === "none" || !ex.weightMultiplier) return null;
  let kg = weight * ex.weightMultiplier[gender][level] * adjust;
  if (ex.weightBasis === "perHand") {
    kg = Math.max(2, Math.round(kg / 2) * 2); // 덤벨/케이블: 2kg 단위
  } else {
    kg = Math.round(kg / 2.5) * 2.5; // 2.5kg 단위
    if (ex.equipment === "barbell") kg = Math.max(20, kg); // 빈바 20kg
    else kg = Math.max(2.5, kg);
  }
  return kg;
}

// 수준에 맞는 후보만 추림 (하 수준은 고급 종목 제외)
export function candidatesFor(level: Level): ExerciseData[] {
  return EXERCISES.filter((e) => level !== "low" || e.level !== "advanced");
}

// 수행률(실행 ÷ 목표)에 따른 중량 보정 배율. 구체 기준은 "미정 항목"이므로 임시값.
export function adjustFromRate(rate: number | undefined): number {
  if (rate === undefined) return 1;
  if (rate >= 0.95) return 1.05;
  if (rate < 0.5) return 0.95;
  return 1;
}
