export type TimelineEvent = {
  at: string;
  kind: string;
  title: string;
  detail?: string;
};

export function parseTimeline(json: string | null | undefined): TimelineEvent[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json) as TimelineEvent[];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function appendTimeline(
  json: string | null | undefined,
  event: Omit<TimelineEvent, "at"> & { at?: string },
): string {
  const list = parseTimeline(json);
  list.push({
    at: event.at ?? new Date().toISOString(),
    kind: event.kind,
    title: event.title,
    detail: event.detail,
  });
  return JSON.stringify(list);
}
