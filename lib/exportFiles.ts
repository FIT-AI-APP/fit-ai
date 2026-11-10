import type { Diet, Routine } from "./types";
import { isDiet, isRoutine } from "./validate";

export type FileFormat = "md" | "txt";

const MAX_FILE_SIZE = 200 * 1024;
const DATA_MARK = "<!-- 불러오기용 데이터입니다. 수정하지 마세요. -->";

const dateOf = (createdAt: string) => createdAt.slice(0, 10);

const BASIS_NOTE = { total: "", perHand: " (한 손)", stack: " (머신 핀)", none: "" } as const;

function dataBlock(data: unknown): string {
  return `\n---\n${DATA_MARK}\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
}

export function routineToText(r: Routine): string {
  const body = r.days
    .map((d) => {
      const lines = d.rest
        ? ["- 휴식"]
        : d.exercises.map((e) => {
            const w = e.weightKg != null ? `, 시작 중량 ${e.weightKg}kg${BASIS_NOTE[e.weightBasis ?? "total"]}` : "";
            return `- ${e.name}: ${e.sets}세트 × ${e.reps}회, 휴식 ${e.restSeconds}초${w}`;
          });
      return `## ${d.day}\n${lines.join("\n")}`;
    })
    .join("\n");
  return `# 주간 운동 루틴 (${dateOf(r.createdAt)})\n\n> 시작 중량은 참고용입니다. 가볍게 시작해서 조절하세요.\n\n${body}\n${dataBlock(r)}`;
}

export function dietToText(d: Diet): string {
  const body = d.days
    .map(
      (day) =>
        `## ${day.day}\n` +
        day.meals
          .map((m) => `- ${m.type}: ${m.menu}, ${m.calories}kcal (탄 ${m.carbs}g / 단 ${m.protein}g / 지 ${m.fat}g)`)
          .join("\n"),
    )
    .join("\n");
  return `# 주간 식단 (${dateOf(d.createdAt)})\n\n> 알레르기 정보는 직접 확인하세요.\n\n${body}\n${dataBlock(d)}`;
}

export function downloadText(kind: "routine" | "diet", createdAt: string, text: string, format: FileFormat) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${kind}-${dateOf(createdAt)}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

// 파일 하단의 JSON 블록만 읽는다 (본문 마크다운은 해석하지 않음)
async function readJsonBlock(file: File): Promise<unknown> {
  if (file.size > MAX_FILE_SIZE) throw new Error("size");
  const text = await file.text();
  const start = text.lastIndexOf("```json");
  if (start < 0) throw new Error("no block");
  const end = text.indexOf("```", start + 7);
  if (end < 0) throw new Error("no block");
  return JSON.parse(text.slice(start + 7, end));
}

export async function readRoutineFile(file: File): Promise<Routine | null> {
  try {
    const v = await readJsonBlock(file);
    return isRoutine(v) ? v : null;
  } catch {
    return null;
  }
}

export async function readDietFile(file: File): Promise<Diet | null> {
  try {
    const v = await readJsonBlock(file);
    return isDiet(v) ? v : null;
  } catch {
    return null;
  }
}
