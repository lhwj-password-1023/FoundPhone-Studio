import type { Runtime, Work } from "../schema";
import { testCondition, visible } from "../engine";

/** A pending delivery includes the pauses between consecutive peer messages. */
export function pendingPeerReply(work: Work, state: Runtime, app: string, thread: string): boolean {
  const records = work.data[app] || [];
  const peerIds = new Set(records.filter((item) => item.title === thread && !item.outgoing).map((item) => item.id));
  const nodes = new Map(work.nodes.map((node) => [node.id, node]));
  const leadsToPeer = (id: string, seen = new Set<string>()): boolean => {
    if (seen.has(id)) return false;
    seen.add(id);
    const node = nodes.get(id);
    if (!node) return false;
    if (node.actions.some((action) => action.type === "unlock" && peerIds.has(action.key) && !state.unlocked.includes(action.key))) return true;
    return node.next.some((next) => leadsToPeer(next, seen));
  };
  if ((state.scheduled || []).some((pending) => leadsToPeer(pending.nodeId))) return true;
  return records.some((item) =>
    peerIds.has(item.id) && visible(item, state) && !state.read.includes(item.id) &&
    work.nodes.some((node) => node.event === "read" && node.target === item.id && node.conditions.every((condition) => testCondition(condition, state)) && node.next.some((next) => leadsToPeer(next))),
  );
}
