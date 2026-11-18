import { useEffect, useState } from "react";
import { ChevronLeft, Clock3 } from "lucide-react";
import type { Runtime } from "../schema";
import type { SkinProps } from "../AppSkins";
import "./time-machine.css";

export function TimeMachine({ state, phoneDate, onBack, onAdvance }: {
  state: Runtime; phoneDate: string; onBack: () => void; onAdvance: (target: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState(false);
  const option = state.variables.sceneFourStage14 === true && state.variables.sceneFourStage15 !== true
    ? { target: "three-months", label: "向前推进三个月", timeline: "2017 年 · 李旻浩" }
    : state.variables.sceneFourStage9 === true && state.variables.sceneFourStage10 !== true
      ? { target: "one-hour-2", label: "向前推进一小时", timeline: "2017 年与 2026 年" }
      : state.variables.sceneFourStage7 === true && state.variables.sceneFourStage8 !== true
        ? { target: "one-hour-1", label: "向前推进一小时", timeline: "2017 年与 2026 年" }
        : null;
  useEffect(() => { setSelected(false); setBusy(false); }, [option?.target]);
  const advance = () => {
    if (!selected || !option || busy) return;
    setBusy(true);
    setProgress(0);
    if (option.target === "three-months") for (let i = 1; i <= 4; i++) window.setTimeout(() => setProgress(i), i * 220);
    window.setTimeout(() => { onAdvance(option.target); setBusy(false); setSelected(false); }, 1250);
  };
  return <section className={busy ? "time-machine advancing" : "time-machine"}>
    <header><button aria-label="返回桌面" onClick={onBack}><ChevronLeft /></button><strong>时光机器</strong></header>
    <main>
      <Clock3 size={34} />
      <h1>时间线</h1>
      <div className="time-line"><span>金昇玟的手机 · 2026 年</span><strong>{state.date || phoneDate} {state.time}</strong></div>
      <div className="time-line"><span>李旻浩所在的时间 · 2017 年</span><strong>{state.peerDate || "2017-11-20"} {state.peerTime || state.time}</strong></div>
      <p>两条时间线分别记录。时间只能按当前剧情向前推进。</p>
      {option ? <>
        <h2>可推进的时间</h2>
        <button className={selected ? "time-choice selected" : "time-choice"} aria-pressed={selected} onClick={() => setSelected(!selected)}>
          <span>{option.label}</span><small>{option.timeline}</small>
        </button>
        <button className="time-confirm" disabled={!selected || busy} onClick={advance}>{busy ? "时间正在向前…" : "确认推进"}</button>
        {busy && option.target === "three-months" && <div className="time-history" aria-live="polite">
          {["2017-12-03 · 年末的满月 · NASA 档案", "2018-01-31 · 月全食 · NASA 档案", "2018-02-06 · 猎鹰重型火箭首飞 · NASA 档案", "2018-02-09 · 平昌冬奥会开幕 · 国际奥委会档案"].slice(0, progress).map((line) => <p key={line}>{line}</p>)}
        </div>}
      </> : <p>当前没有可推进的剧情时间。</p>}
      {Array.isArray(state.ui?.timemachine?.history) && <div className="time-history"><h2>已经过的事件</h2>{state.ui.timemachine.history.map((line) => <p key={line}>{line}</p>)}</div>}
    </main>
  </section>;
}

export function TimeMachineSkin(p: SkinProps) {
  if (!p.storyState) return <section className="time-machine"><p>时光机器</p></section>;
  return <TimeMachine state={p.storyState} phoneDate={p.virtualDate || "2026-11-20"} onBack={p.onBack} onAdvance={(target) => p.onEvent?.("timeAdvance", target)} />;
}
