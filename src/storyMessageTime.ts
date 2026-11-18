import type { Item } from "./schema";

const parse = (stamp?: string) => {
  if (!stamp || !/^\d{4}-\d\d-\d\d \d\d:\d\d(?::\d\d)?$/.test(stamp)) return 0;
  const value = Date.parse(stamp.replace(" ", "T") + (stamp.length === 16 ? ":00Z" : "Z"));
  return Number.isFinite(value) ? value : 0;
};
const format = (value: number) => new Date(value).toISOString().replace("T", " ").slice(0, 19);

/** Freeze a story message at its authored arrival or later device time. */
export function storyMessageTime(item: Item, previous?: string, candidate?: string) {
  const gap = 12 + Math.min(25, Math.floor(item.body.length / 2));
  const receivedMs = Math.max(parse(item.time), parse(candidate), parse(previous) ? parse(previous) + gap * 1000 : 0);
  const receivedAt = format(receivedMs);
  const peerBase = parse(item.meta.sentAt);
  const arrivalBase = parse(item.meta.arrivedAt || item.time);
  const sentAt = !item.outgoing && item.meta.route === "B-A" && peerBase && arrivalBase
    ? format(peerBase + Math.max(0, receivedMs - arrivalBase))
    : receivedAt;
  return { receivedAt, sentAt };
}
