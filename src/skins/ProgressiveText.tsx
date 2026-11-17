import { useEffect, useMemo, useState } from "react";

export function useProgressiveText(text: string) {
  const letters = useMemo(
    () =>
      typeof Intl.Segmenter === "function"
        ? Array.from(new Intl.Segmenter().segment(text), (s) => s.segment)
        : Array.from(text),
    [text],
  );
  const [cursor, setCursor] = useState({ text, count: 0 });
  const count = cursor.text === text ? cursor.count : 0;
  useEffect(() => {
    if (count >= letters.length) return;
    const timer = window.setTimeout(
      () => setCursor({ text, count: count + 1 }),
      /[。，！？]/.test(letters[count - 1] || "") ? 210 : 85,
    );
    return () => clearTimeout(timer);
  }, [text, count, letters]);
  return {
    shown: letters.slice(0, count).join(""),
    done: count >= letters.length,
  };
}

import { useSkinState } from "../skinState";
import type { Props } from "./shared";

export function DraftInput({ p, label }: { p: Props; label: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useSkinState<string>(p, "personalDraft", "");
  const [preset, setPreset] = useState("");
  const typing = useProgressiveText(preset);
  const busy = !!preset && !typing.done;
  const value = preset ? typing.shown : draft;
  return (
    <div className="personal-compose">
      <button onClick={() => setOpen(!open)}>{open ? "收起" : label}</button>
      {open && (
        <>
          <textarea
            aria-label={label}
            placeholder={label}
            value={value}
            readOnly={busy}
            onChange={(e) => {
              setPreset("");
              setDraft(e.target.value);
            }}
          />
          {p.items
            .filter((i) => i.meta.composeText)
            .map((i) => (
              <button
                key={i.id}
                disabled={busy}
                onClick={() => setPreset(i.meta.composeText)}
              >
                {i.title}
              </button>
            ))}
          <button
            disabled={busy || !value.trim()}
            onClick={() => {
              setDraft(value);
              setPreset("");
              setOpen(false);
            }}
          >
            保存草稿
          </button>
        </>
      )}
    </div>
  );
}
