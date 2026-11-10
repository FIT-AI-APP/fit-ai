import { Type } from "@google/genai";
import {
  DAYS,
  LEVEL_LABEL,
  GENDER_LABEL,
  GOAL_LABEL,
  type Exercise,
  type Routine,
  type RoutineDay,
  type RoutineRequest,
} from "../types";
import {
  EXERCISE_BY_ID,
  adjustFromRate,
  candidatesFor,
  startWeight,
  type ExerciseData,
} from "../exercises";
import { SchemaError, generateJson, hasApiKey, withRetry } from "./gemini";
import { dataBlock, renderPrompt } from "./prompt";

const BASIS_LABEL = { total: "총중량", perHand: "한 손", stack: "머신 핀", none: "" } as const;

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, enum: [...DAYS] },
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                sets: { type: Type.INTEGER },
                reps: { type: Type.INTEGER },
                restSeconds: { type: Type.INTEGER },
              },
              required: ["id", "sets", "reps", "restSeconds"],
            },
          },
        },
        required: ["day", "exercises"],
      },
    },
  },
  required: ["days"],
};

// 종목별 수행률 (같은 종목이 여러 요일에 있으면 합산). 코드로 계산해 AI에 전달·중량 보정에 사용
function ratesByExercise(req: RoutineRequest): Map<string, number> {
  const rates = new Map<string, number>();
  const prev = req.previousRoutine;
  const check = req.previousCheck;
  if (!prev || !check || check.createdAt !== prev.createdAt) return rates;
  const sum = new Map<string, { done: number; target: number }>();
  for (const d of prev.days) {
    for (const e of d.exercises) {
      const rec = check.done[`${d.day}|${e.name}`];
      if (!rec) continue;
      const s = sum.get(e.name) ?? { done: 0, target: 0 };
      s.done += rec.reps;
      s.target += e.sets * e.reps;
      sum.set(e.name, s);
    }
  }
  for (const [name, s] of sum) if (s.target > 0) rates.set(name, Math.min(1.5, s.done / s.target));
  return rates;
}

function describePrevious(req: RoutineRequest, rates: Map<string, number>): string {
  const prev = req.previousRoutine;
  if (!prev) return "(없음)";
  const lines = prev.days.map((d) =>
    d.rest
      ? `${d.day}: 휴식`
      : `${d.day}: ` +
        d.exercises
          .map((e) => {
            const r = rates.get(e.name);
            return `${e.name} ${e.sets}x${e.reps}${r === undefined ? "" : ` (수행률 ${Math.round(r * 100)}%)`}`;
          })
          .join(", "),
  );
  return dataBlock("이전 루틴", lines.join("\n"));
}

function toExercise(
  ex: ExerciseData,
  req: RoutineRequest,
  rates: Map<string, number>,
  sets: number,
  reps: number,
  restSeconds: number,
): Exercise {
  return {
    id: ex.id,
    name: ex.name,
    sets,
    reps,
    restSeconds,
    weightKg: startWeight(ex, req.weight, req.gender, req.level, adjustFromRate(rates.get(ex.name))),
    weightBasis: ex.weightBasis,
  };
}

function buildFromAi(raw: unknown, req: RoutineRequest, rates: Map<string, number>): Routine {
  const cands = new Set(candidatesFor(req.level).map((e) => e.id));
  const days = (raw as { days?: { day?: string; exercises?: Record<string, unknown>[] }[] })?.days;
  if (!Array.isArray(days) || days.length !== 7) throw new SchemaError("요일 수가 7개가 아님");

  const out: RoutineDay[] = DAYS.map((day, i) => {
    const d = days[i];
    if (d?.day !== day || !Array.isArray(d.exercises)) throw new SchemaError("요일 순서 오류");
    const seen = new Set<string>();
    const exercises: Exercise[] = [];
    for (const e of d.exercises.slice(0, 8)) {
      const id = String(e.id);
      const ex = EXERCISE_BY_ID.get(id);
      if (!ex || !cands.has(id)) throw new SchemaError(`후보에 없는 종목: ${id}`);
      if (seen.has(id)) continue;
      seen.add(id);
      const sets = Number(e.sets);
      const reps = Number(e.reps);
      const rest = Number(e.restSeconds);
      if (!(sets >= 1 && sets <= 10 && reps >= 1 && reps <= 100 && rest >= 0 && rest <= 600))
        throw new SchemaError("세트·횟수 범위 오류");
      exercises.push(toExercise(ex, req, rates, sets, reps, rest));
    }
    return { day, rest: exercises.length === 0, exercises };
  });
  const workDays = out.filter((d) => !d.rest).length;
  if (workDays !== req.daysPerWeek) throw new SchemaError(`운동일 ${workDays}일 (요청 ${req.daysPerWeek}일)`);
  return { createdAt: new Date().toISOString(), days: out };
}

// API 키가 없을 때 쓰는 더미 (화면 흐름 확인용). 중량은 실제 계산 로직을 그대로 쓴다.
// 주당 운동 일수별 운동 요일 (더미용)
const WORK_DAYS: Record<number, string[]> = {
  1: ["수"],
  2: ["월", "목"],
  3: ["월", "수", "금"],
  4: ["월", "화", "목", "금"],
  5: ["월", "화", "수", "목", "금"],
  6: ["월", "화", "수", "목", "금", "토"],
  7: ["월", "화", "수", "목", "금", "토", "일"],
};

const BLOCKS: [string, number, number, number][][] = [
  [["bench-press", 4, 8, 90], ["dumbbell-press", 3, 10, 90], ["push-up", 3, 15, 60]],
  [["lat-pulldown", 3, 10, 90], ["barbell-row", 3, 10, 90], ["barbell-curl", 3, 12, 60]],
  [["squat", 4, 8, 120], ["leg-press", 3, 12, 90], ["leg-curl", 3, 12, 60]],
  [["overhead-press", 4, 8, 90], ["lateral-raise", 3, 15, 60], ["triceps-pushdown", 3, 12, 60]],
  [["plank", 3, 1, 45], ["treadmill-walk", 1, 30, 0]],
];

function dummyRoutine(req: RoutineRequest, rates: Map<string, number>): Routine {
  const work = WORK_DAYS[req.daysPerWeek] ?? WORK_DAYS[3];
  const days = DAYS.map((day) => {
    const idx = work.indexOf(day);
    const block = idx < 0 ? [] : BLOCKS[idx % BLOCKS.length];
    const exercises = block.map(([id, s, r, rest]) => toExercise(EXERCISE_BY_ID.get(id)!, req, rates, s, r, rest));
    return { day, rest: exercises.length === 0, exercises };
  });
  return { createdAt: new Date().toISOString(), days };
}

export async function generateRoutine(req: RoutineRequest): Promise<Routine> {
  const rates = ratesByExercise(req);
  if (!hasApiKey()) {
    await new Promise((r) => setTimeout(r, 1500));
    return dummyRoutine(req, rates);
  }

  const candidates = candidatesFor(req.level)
    .map((e) => {
      const kg = startWeight(e, req.weight, req.gender, req.level, adjustFromRate(rates.get(e.name)));
      const w = kg === null ? "맨몸/시간" : `시작 중량 ${kg}kg(${BASIS_LABEL[e.weightBasis]})`;
      return `- id: ${e.id} | ${e.name} | 부위: ${e.muscles.join("/")} | 장비: ${e.equipment} | ${w} | 주의: ${e.risk}`;
    })
    .join("\n");

  const prompt = await renderPrompt("routine.md", {
    정보: [
      `체중 ${req.weight}kg, 성별 ${GENDER_LABEL[req.gender]}, 목표 유형 ${GOAL_LABEL[req.goal]}, 목표 체중 ${req.targetWeight}kg`,
      `운동 수준 ${LEVEL_LABEL[req.level]}, 운동 종류 ${req.exerciseType}(헬스장), 운동 가능 시간 하루 ${req.hoursPerDay}시간, 주당 운동 일수 ${req.daysPerWeek}일`,
    ].join("\n"),
    목표: dataBlock("목표", req.goalText),
    "종목 후보": candidates,
    "이전 루틴": describePrevious(req, rates),
  });

  return withRetry(async () => {
    const raw = await generateJson(prompt, responseSchema);
    return buildFromAi(raw, req, rates);
  });
}

