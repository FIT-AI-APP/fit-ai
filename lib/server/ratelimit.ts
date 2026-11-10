// 간단한 IP 기준 호출 제한 (서버 인스턴스 메모리 기준, 시연/무료 티어 방어용)
const WINDOW_MS = 60_000;
const MAX_CALLS = 4;
const hits = new Map<string, number[]>();

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_CALLS) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 1000) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  return false;
}
