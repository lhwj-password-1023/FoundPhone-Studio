import { useEffect, useMemo, useState } from "react";
import { useSimulatedTyping } from "./useSimulatedTyping";

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
  const [presetId, setPresetId] = useSkinState<string>(p, "personalDraftPreset", "");
  const typing = useSimulatedTyping(p.items.find((item) => item.id === presetId)?.meta.composeText || "");
  const presets = p.items.filter((item) => item.meta.composeText);
  return (
    <div className="personal-compose">
      <button onClick={() => setOpen(!open)}>{open ? "收起" : label}</button>
      {open && (
        <>
          <textarea
            aria-label={label}
            placeholder={label}
            value={typing.active ? typing.shown : draft}
            readOnly={!p.creator}
            inputMode={p.creator ? undefined : "none"}
            onClick={() => {
              if (typing.active && !typing.done) typing.reveal();
              else if (!typing.active && presets.length === 1) { setPresetId(presets[0].id); typing.start(presets[0].meta.composeText); }
            }}
            onChange={p.creator ? (e) => setDraft(e.target.value) : undefined}
          />
          {presets.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => { setPresetId(i.id); typing.start(i.meta.composeText); }}
              >
                {i.title}
              </button>
            ))}
          <button
            disabled={!p.creator && !typing.done}
            onClick={() => {
              setDraft(typing.active ? typing.value : draft);
              setPresetId("");
              typing.reset();
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
