import { useEffect, useState } from "react";
import type { Item, UiValue } from "../schema";
import { MicOff, Volume2 } from "lucide-react";
import "./transcript.css";
export function Transcript({
  item,
  mode,
  ui,
  onUi,
  close,
  live = false,
}: {
  item: Item;
  mode: "电话" | "语音消息" | "录音" | "语音信箱";
  ui?: Record<string, UiValue>;
  onUi?: (key: string, value: UiValue) => void;
  close: () => void;
  live?: boolean;
}) {
  const lines = item.meta.transcript.split("\n").filter(Boolean);
  const key = "transcript:" + item.id;
  const [line, setLine] = useState(() =>
    Number(ui?.[key]) >= lines.length ? 0 : Math.max(0, Number(ui?.[key]) || 0),
  );
  const [muted, mute] = useState(false),
    [speaker, setSpeaker] = useState(false),
    [seconds, tick] = useState(0);
  const done = line === lines.length;
  useEffect(() => {
    if (done || mode !== "电话") return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [done, mode]);
  function jump(n: number) {
    setLine(n);
    onUi?.(key, n);
  }
  const [confirm, setConfirm] = useState(false);
  const branchAt = Number(item.meta.choiceAfter ?? -5);
  const branches: Record<string, string> = item.meta.choices
    ? JSON.parse(item.meta.choices)
    : {};
  const chosen = String(ui?.[key + ":choice"] || "");
  const ask = live && line === branchAt && Object.keys(branches).length > 0;
  const txt = (line === branchAt + 1 && branches[chosen]) || lines[line] || "",
    cut = txt.indexOf("：");
  return (
    <section className="transcript" role="dialog" aria-label={mode}>
      <header>
        <span>{mode}</span>
        <button onClick={() => (live && !done ? setConfirm(true) : close())}>
          {live && !done ? "挂断" : "关闭"}
        </button>
      </header>
      <div className="transcript-avatar">
        {(item.meta.conversationId ? item.sender : item.title).slice(0, 1)}
      </div>
      <h2>{item.meta.conversationId ? item.sender : item.title}</h2>
      <small>
        {mode === "电话"
          ? String(Math.floor(seconds / 60)).padStart(2, "0") +
            ":" +
            String(seconds % 60).padStart(2, "0")
          : item.meta.duration + " 秒"}{" "}
        · {done ? lines.length : line + 1} / {lines.length}
      </small>
      {confirm && (
        <div>
          <button onClick={() => setConfirm(false)}>继续通话</button>
          <button onClick={close}>确认挂断</button>
        </div>
      )}
      <button
        disabled={ask}
        className="line-area"
        onClick={() => (done ? close() : jump(line + 1))}
      >
        <b>{done ? "" : cut < 0 ? item.sender : txt.slice(0, cut)}</b>
        <span>
          {done
            ? mode === "电话"
              ? "通话已结束"
              : "播放结束"
            : txt.slice(cut + 1)}
        </span>
        <small>{done ? "返回手机" : "点击继续"}</small>
      </button>
      {ask &&
        Object.keys(branches).map((k) => (
          <button
            key={k}
            onClick={() => {
              onUi?.(key + ":choice", k);
              jump(line + 1);
            }}
          >
            {k}
          </button>
        ))}
      <footer>
        {mode === "电话" && (
          <>
            <button aria-pressed={muted} onClick={() => mute(!muted)}>
              <MicOff />
              静音
            </button>
            <button aria-pressed={speaker} onClick={() => setSpeaker(!speaker)}>
              <Volume2 />
              免提
            </button>
          </>
        )}
        <button onClick={() => jump(0)}>从头回看</button>
      </footer>
    </section>
  );
}
