/* 다녀간 흔적: 한 시간에 걸쳐 옅어지고, 두 시간 넘은 기록은 지운다. */
export const TRACE_WINDOW_MS = 3600000;
export const TRACE_MIN_GAP_MS = 15000;
export const TRACE_MAX = 200;
export const CLEANUP_AGE_MS = 7200000;

export function visibleTraces(records, nowMs) {
  return (records || [])
    .filter((r) => r && typeof r.at === "number" && nowMs - r.at < TRACE_WINDOW_MS && nowMs - r.at >= -60000)
    .sort((a, b) => b.at - a.at)
    .slice(0, TRACE_MAX)
    .map((r) => ({ x: r.x, z: r.z, k: r.k, opacity: (r.k === "lean" ? 0.35 : 0.2) * (1 - Math.max(0, nowMs - r.at) / TRACE_WINDOW_MS) }));
}

export const shouldWriteTrace = (lastWrittenAt, nowMs) => lastWrittenAt == null || nowMs - lastWrittenAt >= TRACE_MIN_GAP_MS;

export function recentVisitorCount(visits, nowMs) {
  if (!visits) return 0;
  return Object.values(visits).filter((v) => v && typeof v.at === "number" && nowMs - v.at <= TRACE_WINDOW_MS).length;
}

export function staleIds(records, nowMs) {
  if (!records) return [];
  return Object.entries(records).filter(([, r]) => r && typeof r.at === "number" && nowMs - r.at > CLEANUP_AGE_MS).map(([id]) => id);
}
