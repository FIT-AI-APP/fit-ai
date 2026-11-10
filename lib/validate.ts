import {
  DAYS,
  MEAL_TYPES,
  type Activity,
  type Diet,
  type DietCheck,
  type DietRequest,
  type Gender,
  type Goal,
  type Level,
  type Routine,
  type RoutineCheck,
  type RoutineRequest,
} from "./types";

export const MAX_TEXT = 200;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const inRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

const GENDERS: Gender[] = ["male", "female"];
const GOALS: Goal[] = ["lose", "maintain", "bulk"];
const LEVELS: Level[] = ["low", "mid", "high"];
const ACTIVITIES: Activity[] = ["low", "mid", "high"];

export function isRoutine(v: unknown): v is Routine {
  if (!isObj(v) || typeof v.createdAt !== "string" || !Array.isArray(v.days) || v.days.length !== 7) return false;
  return v.days.every(
    (d, i) =>
      isObj(d) &&
      d.day === DAYS[i] &&
      typeof d.rest === "boolean" &&
      Array.isArray(d.exercises) &&
      d.exercises.length <= 12 &&
      d.exercises.every(
        (e) =>
          isObj(e) &&
          typeof e.name === "string" &&
          e.name.length <= 50 &&
          inRange(e.sets, 1, 20) &&
          inRange(e.reps, 1, 200) &&
          inRange(e.restSeconds, 0, 600) &&
          (e.weightKg === undefined || e.weightKg === null || inRange(e.weightKg, 0, 1000)),
      ),
  );
}

export function isDiet(v: unknown): v is Diet {
  if (!isObj(v) || typeof v.createdAt !== "string" || !Array.isArray(v.days) || v.days.length !== 7) return false;
  return v.days.every(
    (d, i) =>
      isObj(d) &&
      d.day === DAYS[i] &&
      Array.isArray(d.meals) &&
      d.meals.length <= 8 &&
      d.meals.every(
        (m) =>
          isObj(m) &&
          (MEAL_TYPES as readonly string[]).includes(m.type as string) &&
          typeof m.menu === "string" &&
          m.menu.length <= 300 &&
          inRange(m.calories, 0, 5000) &&
          inRange(m.carbs, 0, 1000) &&
          inRange(m.protein, 0, 1000) &&
          inRange(m.fat, 0, 1000),
      ),
  );
}

function isCheck(v: unknown): v is RoutineCheck {
  if (!isObj(v) || typeof v.createdAt !== "string" || !isObj(v.done)) return false;
  return Object.values(v.done).every((d) => isObj(d) && inRange(d.sets, 0, 1000) && inRange(d.reps, 0, 10000));
}

function isDietCheck(v: unknown): v is DietCheck {
  if (!isObj(v) || typeof v.createdAt !== "string" || !isObj(v.eaten)) return false;
  const entries = Object.entries(v.eaten);
  return entries.length <= 7 * MEAL_TYPES.length && entries.every(([k, b]) => k.length <= 20 && typeof b === "boolean");
}

type Result<T> ={ ok: true; value: T } | { ok: false; error: string };

// 서버 입력 검증: 숫자, 양수, 범위, 자유 입력 길이 제한
export function parseRoutineRequest(b: unknown): Result<RoutineRequest> {
  if (!isObj(b)) return { ok: false, error: "잘못된 요청입니다." };
  if (!inRange(b.weight, 20, 300)) return { ok: false, error: "체중은 20~300kg 사이로 입력하세요." };
  if (!inRange(b.targetWeight, 20, 300)) return { ok: false, error: "목표 체중이 올바르지 않습니다." };
  if (!inRange(b.hoursPerDay, 0.5, 6)) return { ok: false, error: "운동 시간은 0.5~6시간 사이로 입력하세요." };
  if (!inRange(b.daysPerWeek, 1, 7) || !Number.isInteger(b.daysPerWeek))
    return { ok: false, error: "주당 운동 일수는 1~7일 사이로 입력하세요." };
  if (!GENDERS.includes(b.gender as Gender) || !GOALS.includes(b.goal as Goal) || !LEVELS.includes(b.level as Level))
    return { ok: false, error: "성별/목표/수준 값이 올바르지 않습니다." };
  const goalText = typeof b.goalText === "string" ? b.goalText.slice(0, MAX_TEXT) : "";
  if (b.previousRoutine !== undefined && !isRoutine(b.previousRoutine))
    return { ok: false, error: "이전 루틴 형식이 올바르지 않습니다." };
  if (b.previousCheck !== undefined && !isCheck(b.previousCheck))
    return { ok: false, error: "수행 기록 형식이 올바르지 않습니다." };
  return {
    ok: true,
    value: {
      exerciseType: "헬스",
      hoursPerDay: b.hoursPerDay,
      daysPerWeek: b.daysPerWeek as number,
      goalText,
      goal: b.goal as Goal,
      targetWeight: b.targetWeight,
      weight: b.weight,
      gender: b.gender as Gender,
      level: b.level as Level,
      previousRoutine: b.previousRoutine as Routine | undefined,
      previousCheck: b.previousCheck as RoutineCheck | undefined,
    },
  };
}

export function parseDietRequest(b: unknown): Result<DietRequest> {
  if (!isObj(b)) return { ok: false, error: "잘못된 요청입니다." };
  if (!inRange(b.weight, 20, 300)) return { ok: false, error: "체중은 20~300kg 사이로 입력하세요." };
  if (!inRange(b.height, 100, 250)) return { ok: false, error: "키는 100~250cm 사이로 입력하세요." };
  if (!inRange(b.targetWeight, 20, 300)) return { ok: false, error: "목표 체중이 올바르지 않습니다." };
  if (!inRange(b.age, 10, 100)) return { ok: false, error: "나이는 10~100 사이로 입력하세요." };
  if (b.targetWeeks !== undefined && !inRange(b.targetWeeks, 1, 104))
    return { ok: false, error: "목표 기간은 1~104주 사이로 입력하세요." };
  if (!GENDERS.includes(b.gender as Gender) || !GOALS.includes(b.goal as Goal) || !ACTIVITIES.includes(b.activity as Activity))
    return { ok: false, error: "성별/목표/활동량 값이 올바르지 않습니다." };
  if (b.previousDiet !== undefined && !isDiet(b.previousDiet))
    return { ok: false, error: "이전 식단 형식이 올바르지 않습니다." };
  if (b.previousDietCheck !== undefined && !isDietCheck(b.previousDietCheck))
    return { ok: false, error: "섭취 기록 형식이 올바르지 않습니다." };
  if (b.linkedRoutine !== undefined && !isRoutine(b.linkedRoutine))
    return { ok: false, error: "연결할 루틴 형식이 올바르지 않습니다." };
  if (b.hoursPerDay !== undefined && !inRange(b.hoursPerDay, 0.5, 6))
    return { ok: false, error: "운동 시간이 올바르지 않습니다." };
  return {
    ok: true,
    value: {
      allergy: typeof b.allergy === "string" ? b.allergy.slice(0, MAX_TEXT) : "",
      goalText: typeof b.goalText === "string" ? b.goalText.slice(0, MAX_TEXT) : "",
      weight: b.weight,
      height: b.height,
      gender: b.gender as Gender,
      goal: b.goal as Goal,
      targetWeight: b.targetWeight,
      targetWeeks: b.targetWeeks as number | undefined,
      age: b.age,
      activity: b.activity as Activity,
      previousDiet: b.previousDiet as Diet | undefined,
      previousDietCheck: b.previousDietCheck as DietCheck | undefined,
      linkedRoutine: b.linkedRoutine as Routine | undefined,
      hoursPerDay: b.linkedRoutine !== undefined ? ((b.hoursPerDay as number | undefined) ?? 1) : undefined,
    },
  };
}
