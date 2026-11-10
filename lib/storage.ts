import type { LevelInfo } from "./levelCheck";
import type { Diet, DietCheck, Routine, RoutineCheck, UserInfo, WeightEntry } from "./types";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 없거나 차단된 경우: 동작은 계속하되 저장만 건너뜀
  }
}

export const loadUserInfo = () => read<Partial<UserInfo>>("userInfo");
export const saveUserInfo = (v: UserInfo) => write("userInfo", v);

export const loadRoutine = () => read<Routine>("lastRoutine");
export const saveRoutine = (v: Routine) => write("lastRoutine", v);

export const loadRoutineCheck = () => read<RoutineCheck>("routineCheck");
export const saveRoutineCheck = (v: RoutineCheck) => write("routineCheck", v);

export const loadDiet = () => read<Diet>("lastDiet");
export const saveDiet = (v: Diet) => write("lastDiet", v);

export const loadDietCheck = () => read<DietCheck>("dietCheck");
export const saveDietCheck = (v: DietCheck) => write("dietCheck", v);

// 오늘 날짜 (로컬 기준 YYYY-MM-DD)
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const loadWeightLog = () => {
  const v = read<WeightEntry[]>("weightLog");
  return Array.isArray(v) ? v.filter((e) => typeof e?.date === "string" && typeof e?.weight === "number") : [];
};

// 체중 기록 추가 (같은 날짜는 덮어씀, 날짜순 정렬)
export function addWeightLog(weight: number, date = today()): WeightEntry[] {
  const log = loadWeightLog().filter((e) => e.date !== date);
  log.push({ date, weight });
  log.sort((a, b) => a.date.localeCompare(b.date));
  write("weightLog", log);
  return log;
}

// 정밀 수준 체크 결과: 있으면 userInfo.level(하/중/고 간이 선택)보다 우선
export const loadLevelInfo = () => read<LevelInfo>("levelInfo");
export const saveLevelInfo = (v: LevelInfo) => write("levelInfo", v);
export const clearLevelInfo = () => {
  try {
    localStorage.removeItem("levelInfo");
  } catch {
    // 무시
  }
};

// 운동 생성 입력값(시간, 목표 텍스트): 다음 루틴 만들 때 미리 채움, 식단의 운동 루틴 연결에도 사용
export interface RoutineInput {
  hours: string;
  goalText: string;
}
export const loadRoutineInput = () => read<RoutineInput>("routineInput");
export const saveRoutineInput = (v: RoutineInput) => write("routineInput", v);
