import data from "@/data/foods.json";

export interface FoodData {
  id: string;
  name: string;
  serving: string;
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
  allergens: string[];
  mealTypes: string[];
}

export const FOODS = data as FoodData[];
export const FOOD_BY_ID = new Map(FOODS.map((f) => [f.id, f]));

export const MEAL_KEY: Record<string, string> = {
  아침: "breakfast",
  점심: "lunch",
  저녁: "dinner",
  간식: "snack",
};

// 알레르기 태그가 하나라도 들어간 식품은 후보에서 제거
export function allowedFoods(bannedTags: string[]): FoodData[] {
  return FOODS.filter((f) => !f.allergens.some((a) => bannedTags.includes(a)));
}
