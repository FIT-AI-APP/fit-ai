import { Type } from "@google/genai";
import {
  DAYS,
  GENDER_LABEL,
  GOAL_LABEL,
  MEAL_TYPES,
  type Diet,
  type DietDay,
  type DietRequest,
  type Meal,
  type MealType,
} from "../types";
import { FOOD_BY_ID, MEAL_KEY, allowedFoods, type FoodData } from "../foods";
import { hasBannedKeyword, parseAllergy } from "../allergy";
import { calcTargets, exerciseKcal, type Targets } from "../nutrition";
import { SchemaError, generateJson, hasApiKey, withRetry } from "./gemini";
import { dataBlock, renderPrompt } from "./prompt";

const TOLERANCE = 0.2; // 하루 칼로리가 목표에서 ±20% 넘게 어긋나면 재시도

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, enum: [...DAYS] },
          meals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: [...MEAL_TYPES] },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: { id: { type: Type.STRING }, servings: { type: Type.NUMBER } },
                    required: ["id", "servings"],
                  },
                },
              },
              required: ["type", "items"],
            },
          },
        },
        required: ["day", "meals"],
      },
    },
  },
  required: ["days"],
};

const r1 = (n: number) => Math.round(n * 10) / 10;

// 식품 id와 배수로 끼니 카드를 만든다. 이름·칼로리·영양소는 자료(foods.json)에서 코드로 계산
function buildMeal(type: MealType, items: { food: FoodData; servings: number }[]): Meal {
  const sum = (k: "kcal" | "carb" | "protein" | "fat") => items.reduce((a, i) => a + i.food[k] * i.servings, 0);
  return {
    type,
    menu: items.map((i) => `${i.food.name} ${i.food.serving}${i.servings === 1 ? "" : ` × ${i.servings}`}`).join(", "),
    calories: Math.round(sum("kcal")),
    carbs: r1(sum("carb")),
    protein: r1(sum("protein")),
    fat: r1(sum("fat")),
    foodIds: items.map((i) => i.food.id),
  };
}

// 요일별 목표: 운동 루틴 연결 시 운동일은 운동 소모 칼로리만큼 더함 (휴식일은 기본 목표)
interface DayPlan {
  training?: boolean;
  targets: Targets;
}

function dayPlans(req: DietRequest): DayPlan[] {
  const base = calcTargets(req);
  const routine = req.linkedRoutine;
  if (!routine) return DAYS.map(() => ({ targets: base }));
  const burn = exerciseKcal(req.weight, req.hoursPerDay ?? 1);
  return routine.days.map((d) =>
    d.rest ? { training: false, targets: base } : { training: true, targets: calcTargets(req, burn) },
  );
}

// 식단 검사 결과 → 끼니별 섭취율과 안 먹은 메뉴 (코드로 계산해 AI에 전달)
function describeCheck(req: DietRequest): string {
  const prev = req.previousDiet;
  const check = req.previousDietCheck;
  if (!prev || !check || check.createdAt !== prev.createdAt) return "";
  const lines = MEAL_TYPES.map((type) => {
    const eaten = prev.days.filter((d) => check.eaten[`${d.day}|${type}`]).length;
    return `${type} 섭취 ${eaten}/7`;
  });
  const skipped = prev.days.flatMap((d) =>
    d.meals.filter((m) => !check.eaten[`${d.day}|${m.type}`]).map((m) => `${d.day} ${m.type}(${m.menu})`),
  );
  return [
    `끼니별 섭취: ${lines.join(", ")}`,
    skipped.length ? `안 먹은 메뉴: ${skipped.slice(0, 28).join(" / ")}` : "안 먹은 메뉴: 없음",
  ].join("\n");
}

function buildFromAi(raw: unknown, allowed: Map<string, FoodData>, banned: string[], plans: DayPlan[]) {
  const days = (raw as { days?: { day?: string; meals?: { type?: string; items?: { id?: string; servings?: number }[] }[] }[] })
    ?.days;
  if (!Array.isArray(days) || days.length !== 7) throw new SchemaError("요일 수가 7개가 아님");

  return DAYS.map((day, i): DietDay => {
    const d = days[i];
    if (d?.day !== day || !Array.isArray(d.meals)) throw new SchemaError("요일 순서 오류");
    const meals = MEAL_TYPES.map((type) => {
      const m = d.meals!.find((x) => x.type === type);
      if (!m || !Array.isArray(m.items) || m.items.length === 0 || m.items.length > 5)
        throw new SchemaError(`${day} ${type} 구성 오류`);
      const items = m.items.map((it) => {
        const food = allowed.get(String(it.id));
        // 제외 대상(알레르기)이거나 후보에 없는 식품이면 재생성
        if (!food) throw new SchemaError(`허용되지 않은 식품: ${it.id}`);
        const servings = Math.round(Number(it.servings) * 2) / 2;
        if (!(servings >= 0.5 && servings <= 3)) throw new SchemaError("배수 범위 오류");
        return { food, servings };
      });
      const meal = buildMeal(type, items);
      if (hasBannedKeyword(meal.menu, banned)) throw new SchemaError("메뉴명에 알레르기 키워드 포함");
      return meal;
    });
    const { targets, training } = plans[i];
    const kcal = meals.reduce((a, m) => a + m.calories, 0);
    if (Math.abs(kcal - targets.kcal) > targets.kcal * TOLERANCE)
      throw new SchemaError(`${day} 칼로리 ${kcal} (목표 ${targets.kcal})`);
    return { day, meals, training, targetKcal: training === undefined ? undefined : targets.kcal };
  });
}

// API 키가 없을 때 쓰는 더미. 알레르기 필터를 거친 식품에서 요일마다 돌려가며 고른다.
function dummyDiet(foods: FoodData[], plans: DayPlan[]): DietDay[] {
  return DAYS.map((day, di) => ({
    day,
    training: plans[di].training,
    targetKcal: plans[di].training === undefined ? undefined : plans[di].targets.kcal,
    meals: MEAL_TYPES.map((type) => {
      const pool = foods.filter((f) => f.mealTypes.includes(MEAL_KEY[type]));
      // 단백질원 / 탄수화물원 / 그 외를 하나씩 섞어 요일마다 돌려가며 고른다
      const groups = [
        pool.filter((f) => f.protein >= 10),
        pool.filter((f) => f.protein < 10 && f.carb >= 20),
        pool.filter((f) => f.protein < 10 && f.carb < 20),
      ].filter((g) => g.length > 0);
      const items = (type === "간식" ? groups.slice(0, 2) : groups).map((g, k) => ({
        food: g[(di + k) % g.length],
        servings: 1,
      }));
      return buildMeal(type, items);
    }),
  }));
}

export async function generateDiet(req: DietRequest): Promise<Diet> {
  const { tags, unknown } = parseAllergy(req.allergy);
  const foods = allowedFoods(tags);
  const allowed = new Map(foods.map((f) => [f.id, f]));
  const targets = calcTargets(req);
  const plans = dayPlans(req);
  const unknownAllergy = unknown.length ? unknown : undefined;

  if (!hasApiKey()) {
    await new Promise((r) => setTimeout(r, 1500));
    return { createdAt: new Date().toISOString(), days: dummyDiet(foods, plans), unknownAllergy, targetKcal: targets.kcal };
  }

  const candidates = foods
    .map(
      (f) =>
        `- id: ${f.id} | ${f.name} ${f.serving} | ${f.kcal}kcal 탄${f.carb} 단${f.protein} 지${f.fat} | 끼니: ${f.mealTypes.join("/")}`,
    )
    .join("\n");

  const rule =
    tags.length || unknown.length
      ? `알레르기: ${[...tags, ...unknown].join(", ")} 포함 메뉴 금지. 후보 목록은 이미 걸러져 있으니 후보만 쓰세요.`
      : "알레르기 제한은 없습니다.";

  const prev = req.previousDiet?.days
    .map((d) => `${d.day}: ${d.meals.map((m) => `${m.type}(${m.menu})`).join(" / ")}`)
    .join("\n");
  const checkSummary = describeCheck(req);

  const dayLines = req.linkedRoutine
    ? DAYS.map((day, i) => {
        const p = plans[i];
        return `${day}(${p.training ? "운동일" : "휴식일"}): 목표 칼로리 ${p.targets.kcal}kcal, 단백질 ${p.targets.protein}g, 지방 ${p.targets.fat}g, 탄수화물 ${p.targets.carb}g`;
      }).join("\n")
    : `매일: 목표 칼로리 ${targets.kcal}kcal, 목표 단백질 ${targets.protein}g, 지방 ${targets.fat}g, 탄수화물 ${targets.carb}g`;

  const prompt = await renderPrompt("diet.md", {
    정보: [
      `체중 ${req.weight}kg, 키 ${req.height}cm, 나이 ${req.age}세, 성별 ${GENDER_LABEL[req.gender]}, 목표 유형 ${GOAL_LABEL[req.goal]}, 목표 체중 ${req.targetWeight}kg${req.targetWeeks ? `, 목표 기간 ${req.targetWeeks}주` : ""}`,
    ].join("\n"),
    "요일별 목표": dayLines,
    "운동 연결 규칙": req.linkedRoutine
      ? "운동일에는 운동 전후에 먹기 좋은 간식(탄수화물+단백질)을 배치하고, 늘어난 칼로리는 주로 탄수화물로 채우세요."
      : "운동 루틴과 연결하지 않습니다. 매일 같은 목표로 짜세요.",
    목표: dataBlock("목표", req.goalText),
    "알레르기 규칙": rule,
    "식품 후보": candidates,
    "이전 식단": prev ? dataBlock("이전 식단", prev + (checkSummary ? `\n\n${checkSummary}` : "")) : "(없음)",
  });

  const days = await withRetry(async () => buildFromAi(await generateJson(prompt, responseSchema), allowed, tags, plans));
  return { createdAt: new Date().toISOString(), days, unknownAllergy, targetKcal: targets.kcal };
}
