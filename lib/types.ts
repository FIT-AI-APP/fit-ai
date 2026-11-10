export type Goal = "lose" | "maintain" | "bulk";
export type Gender = "male" | "female";
export type Level = "low" | "mid" | "high";

export const LEVEL_LABEL: Record<Level, string> = {
  low: "하",
  mid: "중",
  high: "고",
};

export const LEVEL_DESC: Record<Level, string> = {
  low: "운동을 처음 하거나 6개월 미만",
  mid: "6개월~2년, 주 3회 이상 꾸준히 함",
  high: "2년 이상, 중량 기록을 관리함",
};

export const GENDER_LABEL: Record<Gender, string> = {
  male: "남",
  female: "여",
};

export const GOAL_LABEL: Record<Goal, string> = {
  lose: "감량",
  maintain: "유지",
  bulk: "벌크업",
};

export type Activity = "low" | "mid" | "high";

export const ACTIVITY_LABEL: Record<Activity, string> = {
  low: "적음",
  mid: "보통",
  high: "많음",
};

export const ACTIVITY_DESC: Record<Activity, string> = {
  low: "앉아서 일하거나 공부, 이동 적음",
  mid: "서서 일하거나 하루 걷기 30분 이상",
  high: "몸을 쓰는 일, 하루 대부분 움직임",
};

// 운동 루틴을 뺀 일상 활동 계수
export const ACTIVITY_FACTOR: Record<Activity, number> = {
  low: 1.2,
  mid: 1.375,
  high: 1.55,
};

export interface UserInfo {
  weight: number;
  gender: Gender;
  goal: Goal;
  targetWeight: number;
  targetWeeks?: number;
  // 목표를 처음 저장한 날 (YYYY-MM-DD). 목표 체중·기간이 바뀌면 새로 기록
  startDate?: string;
  age: number;
  height: number;
  activity: Activity;
  level?: Level;
  daysPerWeek?: number;
}

// 체중 기록: 같은 날짜는 덮어씀
export interface WeightEntry {
  date: string;
  weight: number;
}

export const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
export type Day = (typeof DAYS)[number];

// ---- 운동 ----
// 루틴 검사 결과: { createdAt, done: { "월|벤치프레스": { sets: 3, reps: 24 } } }
export interface ExerciseDone {
  sets: number;
  reps: number;
}
export interface RoutineCheck {
  createdAt: string;
  done: Record<string, ExerciseDone>;
}

export interface RoutineRequest {
  exerciseType: "헬스";
  hoursPerDay: number;
  daysPerWeek: number;
  goalText: string;
  goal: Goal;
  targetWeight: number;
  weight: number;
  gender: Gender;
  level: Level;
  // 새 루틴 만들기: 이전 루틴과 종목별 수행 기록
  previousRoutine?: Routine;
  previousCheck?: RoutineCheck;
}

export type WeightBasis = "total" | "perHand" | "stack" | "none";

export interface Exercise {
  id?: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  // 코드로 계산한 시작 중량 (중량 종목만)
  weightKg?: number | null;
  weightBasis?: WeightBasis;
}

export interface RoutineDay {
  day: Day;
  rest: boolean;
  exercises: Exercise[];
}

export interface Routine {
  createdAt: string;
  days: RoutineDay[];
}

// ---- 식단 ----
export interface DietRequest {
  allergy: string;
  weight: number;
  height: number;
  age: number;
  activity: Activity;
  goalText: string;
  goal: Goal;
  gender: Gender;
  targetWeight: number;
  targetWeeks?: number;
  previousDiet?: Diet;
  previousDietCheck?: DietCheck;
  // 운동 루틴 연결: 운동일/휴식일 구분과 하루 운동 시간 (운동 소모 칼로리 계산용)
  linkedRoutine?: Routine;
  hoursPerDay?: number;
}

// 식단 검사 결과: { createdAt, eaten: { "월|아침": true } }
export interface DietCheck {
  createdAt: string;
  eaten: Record<string, boolean>;
}

export const MEAL_TYPES = ["아침", "점심", "저녁", "간식"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface Meal {
  type: MealType;
  menu: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  foodIds?: string[];
}

export interface DietDay {
  day: Day;
  meals: Meal[];
  // 운동 루틴 연결 시: 운동일 여부와 그날 목표 칼로리
  training?: boolean;
  targetKcal?: number;
}

export interface Diet {
  createdAt: string;
  days: DietDay[];
  // 사전에 없는 알레르기 단어 (직접 확인 안내용)
  unknownAllergy?: string[];
  targetKcal?: number;
}
