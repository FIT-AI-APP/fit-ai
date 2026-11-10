import { ACTIVITY_FACTOR, type DietRequest } from "./types";

export interface Targets {
  kcal: number;
  protein: number;
  fat: number;
  carb: number;
}

const KCAL_PER_KG = 7700; // 체지방 1kg ≈ 7,700kcal
const MAX_DEFICIT = 500; // 감량: 하루 최대 −500kcal
const MAX_SURPLUS = 300; // 벌크업: 하루 최대 +300kcal
const WEIGHT_TRAINING_MET = 5; // 웨이트 트레이닝 MET (운동 소모 칼로리 = MET × 체중 × 시간)

type Base = Pick<DietRequest, "weight" | "height" | "age" | "gender" | "activity" | "goal" | "targetWeight" | "targetWeeks">;

// 기초대사량 (Mifflin-St Jeor)
export function calcBmr(req: Pick<DietRequest, "weight" | "height" | "age" | "gender">): number {
  return 10 * req.weight + 6.25 * req.height - 5 * req.age + (req.gender === "male" ? 5 : -161);
}

// 목표 체중·기간으로 하루 증감량 계산, 상한 적용
function dailyAdjust(req: Base): number {
  if (req.goal === "maintain") return 0;
  const cap = req.goal === "lose" ? MAX_DEFICIT : MAX_SURPLUS;
  const diff = Math.abs(req.weight - req.targetWeight);
  const need = req.targetWeeks ? (diff * KCAL_PER_KG) / (req.targetWeeks * 7) : cap;
  const amount = Math.min(cap, need);
  return req.goal === "lose" ? -amount : amount;
}

// 하루 목표 칼로리·탄단지 (extraKcal: 운동일 운동 소모 칼로리 → 탄수화물로 보충)
export function calcTargets(req: Base, extraKcal = 0): Targets {
  const bmr = calcBmr(req);
  const maintenance = bmr * ACTIVITY_FACTOR[req.activity];
  // 최소 섭취량은 기초대사량 이상
  const base = Math.max(bmr, maintenance + dailyAdjust(req));
  const kcal = Math.round(base + extraKcal);
  const protein = Math.round(req.weight * (req.goal === "maintain" ? 1.5 : 1.8));
  const fat = Math.round((base * 0.25) / 9);
  const carb = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carb };
}

// 운동 루틴 연결 시 운동일 소모 칼로리
export function exerciseKcal(weight: number, hours: number): number {
  return Math.round(WEIGHT_TRAINING_MET * weight * hours);
}
