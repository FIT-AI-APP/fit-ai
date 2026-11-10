import { NextResponse } from "next/server";
import { parseDietRequest } from "@/lib/validate";
import { generateDiet } from "@/lib/server/dietService";
import { AiError } from "@/lib/server/gemini";
import { clientIp, rateLimited } from "@/lib/server/ratelimit";

export async function POST(request: Request) {
  if (rateLimited(clientIp(request)))
    return NextResponse.json({ error: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const parsed = parseDietRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    return NextResponse.json(await generateDiet(parsed.value));
  } catch (e) {
    const status = e instanceof AiError ? e.status : 500;
    return NextResponse.json({ error: "식단 생성에 실패했습니다. 다시 시도해주세요." }, { status });
  }
}
