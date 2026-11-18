import { useState } from 'react';
import { Bed, Footprints, HeartPulse, Flame, ChevronLeft } from 'lucide-react';
import type { SkinProps } from '../AppSkins';
import './story-health.css';

type Day = { date: string; sleep: number; bedtime: string; wake: string; steps: number; active: number; heart: number };
const seed = (date: string) => [...date].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 17);
function dayRecord(date: string): Day {
  const value = seed(date);
  const sleep = 145 + value % 154 + (value % 11 === 0 ? 145 : 0);
  const bedHour = 1 + value % 3;
  const bedMinute = value % 60;
  const wakeMinute = (bedHour * 60 + bedMinute + sleep) % 1440;
  return {date, sleep, bedtime: `${String(bedHour).padStart(2,'0')}:${String(bedMinute).padStart(2,'0')}`, wake: `${String(Math.floor(wakeMinute/60)).padStart(2,'0')}:${String(wakeMinute%60).padStart(2,'0')}`, steps: 1800 + value % 8500, active: 12 + value % 63, heart: 58 + value % 25};
}
function pastDays(today: string, count: number) {
  const end = new Date(today + 'T12:00:00Z');
  return Array.from({length: count}, (_, index) => {
    const date = new Date(end); date.setUTCDate(end.getUTCDate() - (count - index - 1));
    return dayRecord(date.toISOString().slice(0,10));
  });
}
const duration = (n: number) => `${Math.floor(n/60)} 小时 ${String(n%60).padStart(2,'0')} 分`;
export function StoryHealth(p: SkinProps) {
  const today = p.virtualDate || '2026-11-20';
  const [selected, setSelected] = useState('');
  const [section, setSection] = useState<'摘要'|'睡眠'|'活动'|'心率'>('摘要');
  const date = selected && selected <= today && selected >= '2026-01-01' ? selected : today;
  const history = pastDays(date, 30);
  const current = dayRecord(date);
  const week = history.slice(-7);
  const average = Math.round(week.reduce((sum,d) => sum+d.sleep,0)/7);
  return <div className="story-health">
    <header><button aria-label="返回" onClick={() => section === '摘要' ? p.onBack() : setSection('摘要')}><ChevronLeft/></button><strong>健康</strong><span>虚构记录</span></header>
    <main>
      <h1>{section}</h1><p className="health-fiction">金昇玟 · 故事内虚构健康数据</p>
      {section === '摘要' ? <>
        <div className="health-date"><span>截至 {today}</span><input aria-label="查看历史日期" type="date" max={today} min="2026-01-01" value={date} onChange={e=>setSelected(e.target.value)}/></div>
        <button className="health-feature" onClick={()=>setSection('睡眠')}><Bed/><span>睡眠<big>{duration(current.sleep)}</big><small>{current.bedtime} 入睡 · {current.wake} 起床</small></span></button>
        <div className="health-mini"><button onClick={()=>setSection('活动')}><Footprints/>步数<strong>{current.steps.toLocaleString()}</strong></button><button onClick={()=>setSection('活动')}><Flame/>活动<strong>{current.active} 分钟</strong></button><button onClick={()=>setSection('心率')}><HeartPulse/>静息心率<strong>{current.heart} 次/分</strong></button></div>
        <h2>最近一周睡眠</h2><div className="health-bars">{week.map(d=><button key={d.date} title={`${d.date} ${duration(d.sleep)}`} onClick={()=>{setSelected(d.date);setSection('睡眠')}}><i style={{height:`${Math.max(15,d.sleep/450*100)}%`}}/><small>{d.date.slice(8)}</small></button>)}</div><p>平均 {duration(average)}</p>
      </> : <><div className="health-date"><span>选择日期</span><input aria-label="查看历史日期" type="date" max={today} min="2026-01-01" value={date} onChange={e=>setSelected(e.target.value)}/></div>
        <div className="health-reading"><small>{date}</small><strong>{section==='睡眠'?duration(current.sleep):section==='活动'?`${current.steps.toLocaleString()} 步`:`${current.heart} 次/分`}</strong><span>{section==='睡眠'?`${current.bedtime} 入睡 · ${current.wake} 起床`:section==='活动'?`活动 ${current.active} 分钟`:'静息心率'}</span></div>
        <h2>{section==='睡眠'?'最近 30 天睡眠':'最近 30 天记录'}</h2><div className="health-history">{history.slice().reverse().map(d=><button key={d.date} onClick={()=>setSelected(d.date)}><span>{d.date}</span><strong>{section==='睡眠'?duration(d.sleep):section==='活动'?`${d.steps.toLocaleString()} 步`:`${d.heart} 次/分`}</strong></button>)}</div>
      </>}
    </main>
  </div>;
}
