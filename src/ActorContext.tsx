import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  actorFeedback,
  actorPermits,
  permittedPresets,
  type ActorAction,
} from "./actor";
import type { Work, Runtime, Item } from "./schema";
import { useSimulatedTyping } from "./skins/useSimulatedTyping";
import "./actor.css";
type Request = { target?: string; preset?: string };
type Actor = {
  restricted: boolean;
  check: (action: ActorAction, request?: Request) => boolean;
  execute: (action: ActorAction, request: Request) => boolean;
  draft: (key: string) => string;
  saveDraft: (key: string, value: string) => void;
  presets: (action: ActorAction, target: string) => Item[];
};
const Context = createContext<Actor>({
  restricted: false,
  check: () => true,
  execute: () => false,
  presets: () => [],
  draft: () => "",
  saveDraft: () => {},
});
export const useActor = () => useContext(Context);
export function ActorProvider({
  work,
  state,
  app,
  choose,
  children,
  onUi,
}: {
  work: Work;
  state: Runtime;
  app: string;
  choose: (id: string) => void;
  onUi?: (key: string, value: string) => void;
  children: ReactNode;
}) {
  const [toast, setToast] = useState("");
  const current = useRef(state);
  current.current = state;
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2700);
    return () => clearTimeout(t);
  }, [toast]);
  const restricted = !!work.timeline;
  const check = (action: ActorAction, r: Request = {}) => {
    if (
      !restricted ||
      actorPermits(work, current.current, action, app, r.target || "", r.preset)
    )
      return true;
    setToast(actorFeedback[action]);
    return false;
  };
  const value: Actor = {
    restricted,
    draft: (key) =>
      String(current.current.ui?.[app]?.["actorDraft:" + key] || ""),
    saveDraft: (key, value) => onUi?.("actorDraft:" + key, value),
    check,
    presets: (action, target) =>
      permittedPresets(work, current.current, action, app, target),
    execute: (action, r) => {
      if (!check(action, r)) return false;
      const item = (work.data[app] || []).find((i) => i.id === r.preset);
      if (!item?.meta.reply) return false;
      choose(item.meta.reply);
      return true;
    },
  };
  return (
    <Context.Provider value={value}>
      {children}
      {toast && (
        <button
          className="actor-toast"
          role="status"
          onClick={() => setToast("")}
        >
          {toast}
        </button>
      )}
    </Context.Provider>
  );
}
export function ActionComposer({
  action,
  target,
  label,
}: {
  action: ActorAction;
  target: string;
  label: string;
}) {
  const actor = useActor(),
    [selected, select] = useState<Item | null>(() => actor.presets(action, target).find((item) => item.id === actor.draft(action + ":" + target + ":preset")) || null);
  const draftKey = action + ":" + target;
  const typing = useSimulatedTyping(selected?.body || "");
  const presets = actor.presets(action, target);
  return (
    <form
      className="actor-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!selected) {
          actor.check(action, { target });
          return;
        }
        if (!typing.active) { typing.start(selected.body); return; }
        if (typing.done && actor.execute(action, { target, preset: selected.id })) {
          select(null);
          typing.reset();
          actor.saveDraft(draftKey, "");
          actor.saveDraft(draftKey + ":preset", "");
        }
      }}
    >
      <textarea
        aria-label={label + "草稿"}
        placeholder={label}
        value={typing.shown}
        readOnly
        inputMode="none"
        onClick={() => {
          if (typing.active && !typing.done) typing.reveal();
          else if (!typing.active && presets.length === 1) {
            select(presets[0]); typing.start(presets[0].body); actor.saveDraft(draftKey + ":preset", presets[0].id);
          }
        }}
      />
      {presets.map((i) => (
        <button
          type="button"
          disabled={typing.active && !typing.done}
          key={i.id}
          onClick={() => { select(i); typing.start(i.body); actor.saveDraft(draftKey + ":preset", i.id); }}
        >
          {i.body}
        </button>
      ))}
      <button disabled={typing.active && !typing.done}>
        {label}
      </button>
    </form>
  );
}
