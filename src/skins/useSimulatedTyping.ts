import { useEffect, useMemo, useState } from "react";

export const typingSpeed = { short: 115, long: 38, punctuation: 190 };
export const characters = (value: string) =>
  typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment)
    : Array.from(value);

export function useSimulatedTyping(initial = "") {
  const [draft, setDraft] = useState(() => ({ value: initial, count: 0 }));
  const letters = useMemo(() => characters(draft.value), [draft.value]);
  const done = !!draft.value && draft.count >= letters.length;
  useEffect(() => {
    if (!draft.value || done) return;
    const last = letters[draft.count - 1] || "";
    const speed = letters.length > 100 ? typingSpeed.long : typingSpeed.short;
    const delay = /[，。！？；、,.!?;\n]/u.test(last) ? typingSpeed.punctuation : speed;
    const timer = window.setTimeout(() => setDraft((current) => ({ ...current, count: Math.min(current.count + 1, letters.length) })), delay);
    return () => window.clearTimeout(timer);
  }, [draft.value, draft.count, done, letters]);
  return {
    value: draft.value,
    shown: letters.slice(0, draft.count).join(""),
    done,
    active: !!draft.value,
    start: (value: string) => setDraft({ value, count: 0 }),
    reveal: () => setDraft((current) => ({ ...current, count: characters(current.value).length })),
    reset: () => setDraft({ value: "", count: 0 }),
  };
}
