import { useEffect, useState } from "react";
import { ChevronLeft, Clock3 } from "lucide-react";
import type { Runtime } from "../schema";
import type { SkinProps } from "../AppSkins";
import "./time-machine.css";

export function TimeMachine({ state, phoneDate, onBack, onAdvance, onReconnect }: {
  state: Runtime; phoneDate: string; onBack: () => void; onAdvance: (target: string) => void; onReconnect: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState(false);
  const [repairStep, setRepairStep] = useState<"idle" | "detecting" | "confirm" | "repairing">("idle");
  const finalPhase = Number(state.variables.finalPhase || 0);
  const finalOptions: Record<number, { target: string; label: string; timeline: string }> = {
    2: {target:"week-1",label:"向前推进一周",timeline:"李旻浩 · 通信时间"},
    6: {target:"week-2",label:"向前推进一周",timeline:"李旻浩 · 通信时间"},
    9: {target:"week-3",label:"向前推进一周",timeline:"李旻浩 · 通信时间"},
    12: {target:"week-4",label:"向前推进一周",timeline:"李旻浩 · 通信时间"},
    15: {target:"week-5",label:"向前推进一周",timeline:"李旻浩 · 通信时间"},
    24: {target:"future-autumn",label:"推进至几年后的秋天",timeline:"金昇玟 · 2030 年"},
    26: {target:"camp-day",label:"推进至露营当天",timeline:"金昇玟 · 2030 年"},
    28: {target:"rescue-72h",label:"向前推进 72 小时",timeline:"金昇玟 · 2030 年"},
  };
  const finalOption = finalOptions[finalPhase];
  const option = finalOption || (state.variables.sceneFourStage14 === true && state.variables.sceneFourStage15 !== true
    ? { target: "three-months", label: "向前推进三个月", timeline: "2017 年 · 李旻浩" }
    : state.variables.sceneFourStage9 === true && state.variables.sceneFourStage10 !== true
      ? { target: "one-hour-2", label: "向前推进一小时", timeline: "2017 年与 2026 年" }
      : state.variables.sceneFourStage7 === true && state.variables.sceneFourStage8 !== true
        ? { target: "one-hour-1", label: "向前推进一小时", timeline: "2017 年与 2026 年" }
        : null);
  const storyDate = state.date || phoneDate;
  const peerDate = state.peerDate || "2017-11-20";
  const weekday = (date: string) => new Intl.DateTimeFormat("zh-CN",{weekday:"long",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
  const connection = String(state.variables.storyConnection || "2017");
  useEffect(() => { setSelected(false); setBusy(false); }, [option?.target]);
  const dualTimeline = state.variables.sceneFourStage1 === true;
  const repairAvailable = dualTimeline && finalPhase === 18 && connection === "interrupted";
  const beginRepair = () => {
    setRepairStep("detecting");
    window.setTimeout(() => setRepairStep("confirm"), 900);
  };
  const confirmRepair = () => {
    setRepairStep("repairing");
    window.setTimeout(() => { onReconnect(); setRepairStep("idle"); }, 1200);
  };
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
      <div className="time-line"><span>金昇玟的时间 · 当前故事时间</span><strong>{storyDate} {weekday(storyDate)} {state.time}</strong></div>
      {dualTimeline && <div className="time-line"><span>李旻浩的时间 · {connection === "interrupted" ? "连接已中断 · 最后同步" : "通信中"}</span><strong>{peerDate} {weekday(peerDate)} {state.peerTime || state.time}</strong></div>}
      <p>时间只能按当前剧情向前推进。</p>
      {repairAvailable && repairStep === "idle" && <button className="time-confirm" onClick={beginRepair}>尝试修复连接</button>}
      {repairAvailable && repairStep === "detecting" && <p role="status">正在检测时空通信……</p>}
      {repairAvailable && repairStep === "confirm" && <div role="dialog" aria-label="修复连接"><p>检测到异常时间信号。发现可恢复的通信连接，是否尝试重新建立？</p><button onClick={confirmRepair}>开始修复</button><button onClick={() => setRepairStep("idle")}>暂时取消</button></div>}
      {repairAvailable && repairStep === "repairing" && <p role="status">正在修复连接……</p>}
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
      {busy && <div className="time-transition" role="status">{option?.target === "rescue-72h" ? "72 小时过去了…" : "时间正在向前…"}</div>}
      {Array.isArray(state.ui?.timemachine?.history) && <div className="time-history"><h2>已经过的事件</h2>{state.ui.timemachine.history.map((line) => <p key={line}>{line}</p>)}</div>}
    </main>
  </section>;
}

export function TimeMachineSkin(p: SkinProps) {
  if (!p.storyState) return <section className="time-machine"><p>时光机器</p></section>;
  return <TimeMachine state={p.storyState} phoneDate={p.virtualDate || "2026-11-20"} onBack={p.onBack} onReconnect={() => p.onEvent?.("storyReconnect","2010")} onAdvance={(target) => p.onEvent?.(target.startsWith("week-") || ["future-autumn","camp-day","rescue-72h"].includes(target) ? "storyTimeAdvance" : "timeAdvance", target)} />;
}
