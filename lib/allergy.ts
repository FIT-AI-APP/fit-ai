import keywords from "@/data/allergen-keywords.json";

const DICT = keywords as Record<string, string[]>;
const NONE = ["없음", "없어요", "없습니다", "없다", "x", "no", "none"];

// 알레르기 자유 입력 → 태그 + 사전에 없는 단어
export function parseAllergy(text: string): { tags: string[]; unknown: string[] } {
  const lower = text.toLowerCase();
  const tags = Object.entries(DICT)
    .filter(([, words]) => words.some((w) => lower.includes(w.toLowerCase())))
    .map(([tag]) => tag);

  const unknown = lower
    .split(/[,\s/·、]+/)
    .map((t) => t.trim())
    .filter((t) => t && !NONE.includes(t))
    .filter((t) => !Object.values(DICT).some((words) => words.some((w) => t.includes(w.toLowerCase()))));
  return { tags, unknown };
}

// 메뉴명에 제외 키워드가 들어있는지 (결과 검사용)
export function hasBannedKeyword(menu: string, tags: string[]): boolean {
  const lower = menu.toLowerCase();
  return tags.some((t) => (DICT[t] ?? []).some((w) => lower.includes(w.toLowerCase())));
}
