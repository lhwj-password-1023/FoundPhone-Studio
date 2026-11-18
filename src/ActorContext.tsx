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
import { useProgressiveText } from "./skins/ProgressiveText";
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
    [draft, setDraft] = useState(""),
    [selected, select] = useState<Item | null>(null),
    [typing, type] = useState(false);
  const text = useProgressiveText(typing ? selected?.body || "" : "");
  const draftKey = action + ":" + target;
  const value = typing
    ? text.shown
    : selected?.body || actor.draft(draftKey) || draft;
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
        if (!typing) {
          if (actor.check(action, { target, preset: selected.id })) type(true);
          return;
        }
        if (
          text.done &&
          actor.execute(action, { target, preset: selected.id })
        ) {
          select(null);
          type(false);
          setDraft("");
          actor.saveDraft(draftKey, "");
        }
      }}
    >
      <textarea
        aria-label={label + "草稿"}
        placeholder={label}
        value={value}
        readOnly={typing}
        onChange={(e) => {
          select(null);
          setDraft(e.target.value);
          actor.saveDraft(draftKey, e.target.value);
        }}
      />
      {presets.map((i) => (
        <button
          type="button"
          disabled={typing}
          key={i.id}
          onClick={() => select(i)}
        >
          {i.body}
        </button>
      ))}
      <button disabled={typing && !text.done}>
        {typing ? "确认" + label : label}
      </button>
    </form>
  );
}
