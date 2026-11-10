import { GoogleGenAI } from "@google/genai";

const TIMEOUT_MS = 30_000;

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const hasApiKey = () => !!process.env.GEMINI_API_KEY;

// 프롬프트를 보내 JSON 객체를 받는다. 스키마 검증은 호출하는 쪽에서 한다.
export async function generateJson(prompt: string, responseSchema: object): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("API 키가 설정되지 않았습니다.", 500);
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const ai = new GoogleGenAI({ apiKey });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new AiError("응답 시간이 초과되었습니다.", 504)), TIMEOUT_MS),
  );
  try {
    const res = await Promise.race([
      ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema },
      }),
      timeout,
    ]);
    return JSON.parse(res.text ?? "");
  } catch (e) {
    console.error("[gemini] 호출 실패:", (e as { status?: number }).status, (e as Error).message?.slice(0, 300));
    if (e instanceof AiError) throw e;
    if (e instanceof SyntaxError) throw new SchemaError("AI 응답이 JSON이 아닙니다.");
    const status = (e as { status?: number }).status;
    if (status === 429) throw new AiError("요청 한도를 초과했습니다.", 429);
    throw new AiError("AI 호출에 실패했습니다.", 502);
  }
}

// 스키마 불일치 → 재시도 대상
export class SchemaError extends Error {}

// 스키마 불일치만 재시도 (최대 2회). 429·타임아웃은 재시도 없이 그대로 던진다.
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, retries = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn(i);
    } catch (e) {
      if (!(e instanceof SchemaError)) throw e;
      console.error(`[gemini] 응답 검사 실패 (시도 ${i + 1}):`, e.message);
      last = e;
    }
  }
  throw new AiError(`AI 응답 형식이 맞지 않습니다. (${(last as Error).message})`, 502);
}
