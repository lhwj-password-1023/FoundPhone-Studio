import "./system-reference.css";
import {
  Voicemail,
  Smartphone,
  Navigation,
  Flag,
  Inbox,
  AlarmClock,
  Circle,
  List,
} from "lucide-react";
import { DraftInput } from "./ProgressiveText";
import { ArchiveBrowser } from "./ArchiveBrowser";
export { WeatherSkin, HealthSkin } from "./CalibratedSystemApps";
import { AudioPlayer, useTrack } from "../audio";
import { useSkinState } from "../skinState";
import {
  Calendar,
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Folder,
  Globe,
  Grid,
  Heart,
  Image,
  LockKeyhole,
  MapPin,
  Music,
  Phone,
  Search,
  SkipForward,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { download } from "../io";
import { safeMedia, type Item } from "../schema";
import {
  Add,
  Avatar,
  Empty,
  groupItems,
  Header,
  Media,
  meta,
  Row,
  SearchBox,
  Tabs,
  useContent,
  type Props,
} from "./shared";
export function PhoneSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "最近通话");
  const [digits, setDigits] = useState(""),
    [call, setCall] = useState("");
  const [missed, setMissed] = useState(false);
  const list =
    tab === "通讯录"
      ? (p.contacts || []).filter((i) => i.title.includes(q))
      : tab === "语音信箱"
        ? items.filter((i) => i.folder === "语音信箱")
        : tab === "最近通话" && missed
          ? items.filter((i) => i.meta.status === "未接")
          : tab === "收藏"
            ? items.filter((i) => i.favorite)
            : items.filter((i) => i.folder !== "语音信箱");
  return (
    <div className="catalog-skin native-phone">
      <Header p={p} />
      <div className="catalog-scroll">
        {tab === "最近通话" && (
          <div className="call-filter">
            {["全部", "未接"].map((v, i) => (
              <button
                key={v}
                aria-pressed={missed === !!i}
                onClick={() => setMissed(!!i)}
              >
                {v}
              </button>
            ))}
          </div>
        )}
        {tab !== "拨号键盘" && <h1>{tab}</h1>}
        {tab === "语音信箱" && (
          <div className="carrier-row">
            运营商语音信箱 <small>未设置</small>
          </div>
        )}
        {tab === "拨号键盘" ? (
          <div className="dialer">
            <output>{digits}</output>
            <div>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(
                (k) => (
                  <button key={k} onClick={() => setDigits((s) => s + k)}>
                    {k}
                    <small>
                      {
                        (
                          {
                            "2": "ABC",
                            "3": "DEF",
                            "4": "GHI",
                            "5": "JKL",
                            "6": "MNO",
                            "7": "PQRS",
                            "8": "TUV",
                            "9": "WXYZ",
                          } as Record<string, string>
                        )[k]
                      }
                    </small>
                  </button>
                ),
              )}
            </div>
            <button
              className="dial-call"
              disabled={!digits}
              aria-label="模拟拨号"
              onClick={() => {
                setCall(digits);
                const i = items.find((i) => meta(i, "number") === digits);
                if (i) p.onRead(i.id);
              }}
            >
              <Phone size={24} />
            </button>
            <button onClick={() => setDigits((s) => s.slice(0, -1))}>
              删除
            </button>
          </div>
        ) : tab === "通讯录" ? (
          <ContactDirectory items={list} onItem={p.onItem} q={q} setQ={setQ} />
        ) : (
          <>
            <SearchBox value={q} set={setQ} />
            {list.map((i) => (
              <button
                className={`call-row ${meta(i, "status") === "未接" ? "missed" : ""}`}
                key={i.id}
                onClick={() => p.onItem(i)}
              >
                <Avatar name={i.title} />
                <span>
                  <strong>{i.title}</strong>
                  <small>
                    {meta(i, "number", i.sender)} ·{" "}
                    {meta(i, "status", "通话记录")}
                  </small>
                </span>
                <time>{i.time.slice(5, 10)}</time>
              </button>
            ))}
            <Empty items={list} />
          </>
        )}
      </div>
      <Tabs
        tabs={["收藏", "最近通话", "通讯录", "拨号键盘", "语音信箱"]}
        value={tab}
        set={setTab}
        icons={[<Star />, <Clock />, <Users />, <Grid />, <Voicemail />]}
      />
      {call && (
        <div className="virtual-call">
          <small>虚拟通话</small>
          <Avatar name={call} />
          <h2>{call}</h2>
          <p>
            {items.find((i) => i.meta.number === call)?.meta.outcome ||
              "暂时无法接通"}
          </p>
          <button aria-label="挂断" onClick={() => setCall("")}>
            <Phone />
          </button>
        </div>
      )}
    </div>
  );
}
function ContactDirectory({
  items,
  onItem,
  q,
  setQ,
}: {
  items: Item[];
  onItem: Props["onItem"];
  q: string;
  setQ: (s: string) => void;
}) {
  const groups = new Map<string, Item[]>();
  for (const item of [...items].sort((a, b) =>
    a.title.localeCompare(b.title, "zh-CN"),
  )) {
    const initial = (item.meta.initial || item.title).slice(0, 1).toUpperCase();
    groups.set(initial, [...(groups.get(initial) || []), item]);
  }
  return (
    <>
      <SearchBox value={q} set={setQ} />
      {[...groups].map(([letter, rows]) => (
        <section key={letter} id={"contact-" + letter}>
          <h4 className="native-section">{letter}</h4>
          {rows.map((i) => (
            <button
              className="directory-row"
              key={i.id}
              onClick={() => onItem(i)}
            >
              <Avatar name={i.title} src={i.avatar} />
              {i.title}
            </button>
          ))}
        </section>
      ))}
      <aside className="contact-index">
        {[...groups.keys()].map((l) => (
          <button
            key={l}
            onClick={() =>
              document
                .getElementById("contact-" + l)
                ?.scrollIntoView({ block: "nearest" })
            }
          >
            {l}
          </button>
        ))}
      </aside>
      <Empty items={items} />
    </>
  );
}
export function ContactsSkin(p: Props) {
  const { items, q, setQ } = useContent(p, "通讯录");
  return (
    <div className="catalog-skin native-contacts">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>通讯录</h1>
        <ContactDirectory {...{ items, q, setQ, onItem: p.onItem }} />
      </div>
    </div>
  );
}
export function PhotosSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "图库");
  const [album, setAlbum] = useSkinState<string>(p, "album", "");
  const [period, setPeriod] = useSkinState<string>(p, "photoPeriod", "日");
  const [group, setGroup] = useSkinState<string>(p, "photoGroup", "");
  const stamp = (i: Item) =>
    (i.meta.capturedAt || i.time).slice(
      0,
      period === "年" ? 4 : period === "月" ? 7 : 10,
    );
  const inTrash = (i: Item) => p.ui?.["trash:" + i.id] === true;
  const eligible = items.filter((i) => inTrash(i) === (tab === "最近删除"));
  const list = eligible.filter(
    (i) =>
      (tab !== "收藏" || i.favorite) &&
      (!album || (i.folder || "未分类") === album) &&
      (!group || stamp(i) === group),
  );
  return (
    <div className="catalog-skin native-photos">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>{album || tab}</h1>
        {p.archive && tab === "图库" && (
          <div className="gallery-period">
            {["年", "月", "日"].map((v) => (
              <button
                key={v}
                aria-pressed={period === v}
                onClick={() => {
                  setPeriod(v);
                  setGroup("");
                }}
              >
                {v}
              </button>
            ))}
            <select
              aria-label="图库日期"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              <option value="">全部</option>
              {[...new Set(eligible.map(stamp))]
                .sort()
                .reverse()
                .map((k) => (
                  <option key={k}>{k}</option>
                ))}
            </select>
          </div>
        )}
        {tab === "相簿" && !album ? (
          <div className="album-grid">
            {groupItems(eligible, "未分类").map((g) => (
              <button key={g} onClick={() => setAlbum(g)}>
                <Media
                  item={eligible.find((i) => (i.folder || "未分类") === g)!}
                />
                <strong>{g}</strong>
                <small>
                  {items.filter((i) => (i.folder || "未分类") === g).length} 项
                </small>
              </button>
            ))}
          </div>
        ) : (
          <>
            <SearchBox value={q} set={setQ} />
            <div className="photo-mosaic">
              {list.map((i) => (
                <button
                  aria-label={`查看${i.title}`}
                  key={i.id}
                  onClick={() => p.onItem(i)}
                >
                  <Media item={i} />
                  {i.favorite && <Heart size={12} fill="white" />}
                </button>
              ))}
            </div>
            <p className="media-count">{list.length} 个项目</p>
          </>
        )}
        <Empty items={list} />
      </div>
      <Tabs
        tabs={
          p.archive
            ? ["图库", "相簿", "收藏", "最近删除"]
            : ["图库", "相簿", "收藏"]
        }
        value={tab}
        set={(t) => {
          setTab(t);
          setAlbum("");
          setGroup("");
        }}
        icons={[<Image />, <Folder />, <Heart />]}
      />
    </div>
  );
}
export function CameraSkin(p: Props) {
  const [mode, setMode] = useState("照片"),
    [index, setIndex] = useState(0);
  const frames = p.items.filter((i) =>
    mode === "视频" ? i.kind === "video" : i.kind !== "video",
  );
  const frame = frames[index % Math.max(frames.length, 1)];
  return (
    <div className="catalog-skin native-camera">
      <Header p={p} />
      <div className="camera-top">
        <span>闪光灯关闭</span>
        <span>{mode === "视频" ? "HD · 30" : "4:3"}</span>
      </div>
      <div className="camera-view">
        {frame ? (
          <Media item={frame} />
        ) : (
          <p>{p.creator ? "未设置取景画面" : "取景器未连接"}</p>
        )}
        <div className="camera-grid" />
      </div>
      <div className="camera-mode">
        {["视频", "照片"].map((m) => (
          <button
            className={mode === m ? "selected" : ""}
            key={m}
            onClick={() => {
              setMode(m);
              setIndex(0);
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="camera-controls">
        <button
          aria-label="查看上一画面"
          disabled={!frames.length}
          onClick={() => setIndex((i) => (i + 1) % frames.length)}
        >
          <Image size={24} />
        </button>
        <button
          className="camera-shutter"
          aria-label={p.creator ? "编辑拍摄画面" : "查看拍摄内容"}
          disabled={!p.creator && !frame}
          onClick={() => (p.creator ? p.onAdd() : frame && p.onItem(frame))}
        >
          <span />
        </button>
        <button
          aria-label="切换取景画面"
          disabled={frames.length < 2}
          onClick={() => setIndex((i) => i + 1)}
        >
          <Camera size={24} />
        </button>
      </div>
      {p.creator && (
        <small className="camera-caption">作者设置的虚构取景内容</small>
      )}
    </div>
  );
}
export function SafariSkin(p: Props) {
  return p.archive ? <ArchiveBrowser {...p} /> : <SafariBookmarks {...p} />;
}
function SafariBookmarks(p: Props) {
  const [q, setQ] = useState(""),
    [tab, setTab] = useState("书签");
  const items = p.items
    .filter((i) =>
      (i.title + i.body + meta(i, "url"))
        .toLowerCase()
        .includes(q.toLowerCase()),
    )
    .filter((i) =>
      tab === "书签"
        ? i.favorite || i.folder !== "历史记录"
        : i.folder === "历史记录",
    );
  return (
    <div className="catalog-skin native-safari">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>{tab}</h1>
        <div className="safari-favorites">
          {items.map((i) => (
            <button key={i.id} onClick={() => p.onItem(i)}>
              <span>
                <Globe size={28} />
              </span>
              <strong>{i.title}</strong>
              <small>{meta(i, "url")}</small>
            </button>
          ))}
        </div>
        <Empty items={items} label="没有匹配的虚构网页" />
      </div>
      <label className="safari-address">
        <LockKeyhole size={13} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索或输入虚构网址"
          aria-label="地址栏"
          onKeyDown={(e) => {
            if (e.key === "Enter" && items[0]) p.onItem(items[0]);
          }}
        />
        <Search size={16} />
      </label>
      <Tabs
        tabs={["书签", "历史记录"]}
        value={tab}
        set={setTab}
        icons={[<Globe />, <Clock />]}
      />
    </div>
  );
}
export { NotesSkin } from "../ios/Notes";
export function CalendarSkin(p: Props) {
  const [y, m, d] = (p.virtualDate || "2026-09-01").split("-").map(Number);
  const [month, setMonth] = useState(m - 1),
    [year, setYear] = useState(y),
    [day, setDay] = useState(d);
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const list = p.items.filter((i) =>
    i.time.startsWith(`${prefix}-${String(day).padStart(2, "0")}`),
  );
  const move = (d: number) => {
    const date = new Date(Date.UTC(year, month + d, 1));
    setYear(date.getUTCFullYear());
    setMonth(date.getUTCMonth());
    setDay(1);
  };
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay(),
    days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return (
    <div className="catalog-skin native-calendar">
      <Header p={p} />
      <div className="catalog-scroll">
        <div className="month-title">
          <button aria-label="上个月" onClick={() => move(-1)}>
            <ChevronLeft />
          </button>
          <h2>
            {year} 年 {month + 1} 月
          </h2>
          <button aria-label="下个月" onClick={() => move(1)}>
            <ChevronRight />
          </button>
        </div>
        <div className="calendar-grid">
          {["日", "一", "二", "三", "四", "五", "六"].map((t) => (
            <small key={t}>{t}</small>
          ))}
          {Array.from({ length: first }, (_, i) => (
            <span key={"blank" + i} />
          ))}
          {Array.from({ length: days }, (_, i) => (
            <button
              className={day === i + 1 ? "selected" : ""}
              key={i}
              onClick={() => setDay(i + 1)}
            >
              {i + 1}
              {p.items.some((x) =>
                x.time.startsWith(
                  `${prefix}-${String(i + 1).padStart(2, "0")}`,
                ),
              ) && <i />}
            </button>
          ))}
        </div>
        <h4 className="native-section">
          {month + 1} 月 {day} 日
        </h4>
        {list.map((i) => (
          <button
            className="calendar-event"
            key={i.id}
            onClick={() => p.onItem(i)}
          >
            <time>{i.time.slice(-5)}</time>
            <div>
              <strong>{i.title}</strong>
              <p>{meta(i, "location", i.body)}</p>
            </div>
          </button>
        ))}
        <Empty items={list} label="当天没有日程" />
        <Add p={p} label="添加日程" />
      </div>
    </div>
  );
}
export function MailSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "收件箱");
  const list = items.filter(
    (i) =>
      tab === "全部邮件" ||
      i.folder === tab ||
      (tab === "收件箱" &&
        (!i.folder || !["草稿", "已发送"].includes(i.folder))),
  );
  return (
    <div className="catalog-skin native-mail">
      <Header p={p} />
      <div className="mail-folders">
        {["收件箱", "草稿", "已发送", "全部邮件"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="catalog-scroll">
        <h1>{tab}</h1>
        <SearchBox value={q} set={setQ} />
        {list.map((i) => (
          <button
            className="mail-preview"
            key={i.id}
            onClick={() => p.onItem(i)}
          >
            <i className={!i.read ? "unread" : ""} />
            <div>
              <strong>{i.sender}</strong>
              <h3>{i.title}</h3>
              <p>{i.body}</p>
            </div>
            <time>{i.time.slice(5, 10)}</time>
          </button>
        ))}
        <Empty items={list} />
      </div>
      <footer className="mail-footer">
        <span>{list.length} 封邮件</span>
        {p.archive ? (
          <DraftInput p={p} label="写邮件" />
        ) : (
          <Add p={p} label="写邮件" />
        )}
      </footer>
    </div>
  );
}
export function ClockSkin(p: Props) {
  const { tab, setTab, items } = useContent(p, "闹钟");
  const [enabled, setEnabled] = useSkinState<string[]>(p, "alarms", []),
    [seconds, setSeconds] = useState(0),
    [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return (
    <div className="catalog-skin native-clock">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>{tab}</h1>
        {tab === "秒表" ? (
          <div className="stopwatch">
            <output>
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </output>
            <div>
              <button
                onClick={() => {
                  setSeconds(0);
                  setRunning(false);
                }}
              >
                复位
              </button>
              <button onClick={() => setRunning(!running)}>
                {running ? "暂停" : "开始"}
              </button>
            </div>
          </div>
        ) : (
          items.map((i) => (
            <div className="alarm-row" key={i.id}>
              <button onClick={() => p.onItem(i)}>
                <time>{meta(i, "clock", i.time.slice(-5))}</time>
                <small>
                  {tab === "世界时钟" ? meta(i, "city", i.title) : i.title}
                </small>
              </button>
              {tab === "闹钟" ? (
                <button
                  role="switch"
                  aria-label={`闹钟${i.title}`}
                  aria-checked={enabled.includes(i.id)}
                  className={`native-switch ${enabled.includes(i.id) ? "on" : ""}`}
                  onClick={() =>
                    setEnabled(
                      enabled.includes(i.id)
                        ? enabled.filter((x) => x !== i.id)
                        : [...enabled, i.id],
                    )
                  }
                >
                  <span />
                </button>
              ) : (
                <Clock size={35} />
              )}
            </div>
          ))
        )}
      </div>
      <Tabs
        tabs={["世界时钟", "闹钟", "秒表"]}
        value={tab}
        set={setTab}
        icons={[<Globe />, <Clock />, <Clock />]}
      />
    </div>
  );
}
export function RemindersSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "全部");
  const [checked, setChecked] = useSkinState<string[]>(p, "checked", []);
  const [detail, show] = useState(false);
  const categories = ["今天", "计划", "全部", "旗标", "紧急", "已完成"];
  const icons = [Calendar, Clock, Inbox, Flag, AlarmClock, CheckCircle];
  function matches(i: Item, t: string) {
    if (checked.includes(i.id)) return t === "已完成";
    const due = i.meta.due || i.time;
    if (t === "今天") return !!due && due.slice(0, 10) === p.virtualDate;
    if (t === "计划") return !!due;
    if (t === "旗标") return i.favorite || i.meta.flagged === "true";
    if (t === "紧急") return i.meta.urgent === "true";
    return t === "全部" || t === "待办清单";
  }
  const list = items.filter((i) => matches(i, tab));
  const enter = (t: string) => {
    setTab(t);
    show(true);
  };
  return (
    <div
      className={
        "catalog-skin native-reminders " + (detail ? "rem-detail" : "rem-home")
      }
    >
      <Header p={{ ...p, onBack: detail ? () => show(false) : p.onBack }} />
      <div className="catalog-scroll">
        <SearchBox value={q} set={setQ} />
        {!detail ? (
          <>
            <div className="reminder-categories">
              {categories.map((t, n) => {
                const Icon = icons[n];
                return (
                  <button key={t} onClick={() => enter(t)}>
                    <Icon />
                    <strong>{items.filter((i) => matches(i, t)).length}</strong>
                    <span>{t}</span>
                  </button>
                );
              })}
            </div>
            <h2>我的列表</h2>
            <button className="my-list" onClick={() => enter("待办清单")}>
              <List />
              待办清单{" "}
              <small>{items.filter((i) => matches(i, "全部")).length} ›</small>
            </button>
          </>
        ) : (
          <>
            <button onClick={() => show(false)}>‹ 我的列表</button>
            <h1>{tab}</h1>
            {list.map((i) => (
              <div className="reminder-row" key={i.id}>
                <button
                  aria-label={`完成${i.title}`}
                  role="checkbox"
                  aria-checked={checked.includes(i.id)}
                  onClick={() =>
                    setChecked(
                      checked.includes(i.id)
                        ? checked.filter((x) => x !== i.id)
                        : [...checked, i.id],
                    )
                  }
                >
                  <CheckCircle size={21} />
                </button>
                <button onClick={() => p.onItem(i)}>
                  <strong>{i.title}</strong>
                  <small>
                    {i.time} {i.folder}
                  </small>
                </button>
              </div>
            ))}
          </>
        )}
        {p.archive ? (
          <DraftInput p={p} label="提醒事项草稿" />
        ) : (
          <Add p={p} label="新提醒事项" />
        )}
      </div>
    </div>
  );
}
export function FilesSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "浏览");
  const [folder, setFolder] = useState("");
  const list = folder
    ? items.filter((i) => (i.folder || "我的iPhone") === folder)
    : tab === "共享"
      ? items.filter((i) => i.meta.shared === "true")
      : items;
  return (
    <div className="catalog-skin native-files">
      <Header p={p} />
      <div className="catalog-scroll">
        {folder && <button onClick={() => setFolder("")}>‹ iCloud 云盘</button>}
        <h1>{folder || (tab === "浏览" ? "iCloud 云盘" : tab)}</h1>
        <SearchBox value={q} set={setQ} />
        {tab === "浏览" && !folder ? (
          <div className="file-folders">
            {[
              ...new Set([
                "文稿",
                "下载",
                "桌面",
                ...groupItems(items, "我的iPhone"),
              ]),
            ]
              .filter(
                (g) => !q || g.includes(q) || items.some((i) => i.folder === g),
              )
              .map((g) => (
                <button key={g} onClick={() => setFolder(g)}>
                  <Folder size={64} fill="#63bff0" stroke="#49aada" />
                  <strong>{g}</strong>
                  <small>
                    {
                      items.filter((i) => (i.folder || "我的iPhone") === g)
                        .length
                    }{" "}
                    项
                  </small>
                </button>
              ))}
          </div>
        ) : (
          <div className="file-grid">
            {list.map((i) => (
              <div key={i.id}>
                <button onClick={() => p.onItem(i)}>
                  {i.media ? <Media item={i} /> : <FileText size={49} />}
                  <strong>{i.title}</strong>
                  <small>
                    {meta(i, "extension", "文件")} ·{" "}
                    {meta(i, "size", i.time.slice(0, 10))}
                  </small>
                </button>
                <button
                  aria-label={`下载${i.title}文本`}
                  onClick={() =>
                    download(
                      new Blob([i.body], { type: "text/plain" }),
                      `${i.title}.txt`,
                    )
                  }
                >
                  <Download size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {(folder || tab !== "浏览") && <Empty items={list} />}
      </div>
      <Tabs
        tabs={["最近项目", "共享", "浏览"]}
        value={tab}
        set={(t) => {
          setTab(t);
          setFolder("");
        }}
        icons={[<Clock />, <Users />, <Folder />]}
      />
    </div>
  );
}
export function MusicSkin(p: Props) {
  const { tab, setTab, items } = useContent(p, "资料库");
  const [song, setSong] = useTrack(p, items);
  return (
    <div className="catalog-skin native-music">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>{tab}</h1>
        {tab === "歌单" ? (
          <div className="music-albums">
            {groupItems(items, "我的音乐").map((g) => (
              <button
                key={g}
                onClick={() => {
                  const i = items.find((i) => (i.folder || "我的音乐") === g);
                  if (i) setSong(i);
                }}
              >
                <Music size={51} />
                <strong>{g}</strong>
                <small>
                  {items.filter((i) => (i.folder || "我的iPhone") === g).length}{" "}
                  项
                </small>
              </button>
            ))}
          </div>
        ) : (
          items.map((i, n) => (
            <button
              className="music-track"
              key={i.id}
              onClick={() => {
                setSong(i);
              }}
            >
              <small>{n + 1}</small>
              <span>
                <strong>{i.title}</strong>
                <small>
                  {i.sender} · {meta(i, "album")}
                </small>
              </span>
              <span>{meta(i, "duration")}</span>
            </button>
          ))
        )}
        <Empty items={items} />
      </div>
      {song && (
        <div className="native-now-playing">
          <button onClick={() => p.onItem(song)}>
            <Music size={20} />
            {song.title}
          </button>
          {song.kind === "audio" && safeMedia(song.media) ? (
            <AudioPlayer p={p} item={song} />
          ) : (
            <button onClick={() => p.onItem(song)}>查看歌曲内容</button>
          )}
          <button
            aria-label="下一首"
            onClick={() =>
              setSong(
                items[
                  (items.findIndex((i) => i.id === song.id) + 1) % items.length
                ],
              )
            }
          >
            <SkipForward size={18} />
          </button>
        </div>
      )}
      <Tabs
        tabs={["资料库", "歌单"]}
        value={tab}
        set={setTab}
        icons={[<Music />, <Folder />]}
      />
    </div>
  );
}
function LocationMap({
  items,
  onItem,
  find = false,
}: {
  items: Item[];
  onItem: (i: Item) => void;
  find?: boolean;
}) {
  return (
    <div className={`fiction-map ${find ? "find-map" : ""}`}>
      <svg viewBox="0 0 300 300" aria-label="原创虚构地图">
        <rect width="300" height="300" fill="#e4e5d8" />
        {[35, 100, 190, 260].map((n) => (
          <path
            key={n}
            d={`M0 ${n} H300 M${n} 0 V300`}
            stroke="#fff"
            strokeWidth="11"
          />
        ))}
        <path
          d="M20 0 Q190 110 120 300"
          stroke="#b6d8df"
          strokeWidth="24"
          fill="none"
        />
        <rect x="205" y="112" width="42" height="65" rx="7" fill="#bdcfac" />
      </svg>
      {items.map((i, n) => (
        <button
          key={i.id}
          aria-label={`地图位置${i.title}`}
          className="map-pin"
          style={{
            left: `${Math.max(5, Math.min(90, Number(meta(i, "x", String(20 + ((n * 17) % 65))))))}%`,
            top: `${Math.max(8, Math.min(80, Number(meta(i, "y", String(25 + ((n * 13) % 50))))))}%`,
          }}
          onClick={() => onItem(i)}
        >
          {find ? <Smartphone size={22} /> : <MapPin size={24} />}
        </button>
      ))}
    </div>
  );
}
export function MapsSkin(p: Props) {
  const { q, setQ, items } = useContent(p, "地点");
  return (
    <div className="catalog-skin native-maps">
      <Header p={p} />
      <LocationMap items={items} onItem={p.onItem} />
      <div className="map-sheet">
        <SearchBox value={q} set={setQ} placeholder="搜索虚构地点" />
        <div className="map-places">
          {items.map((i) => (
            <Row key={i.id} item={i} onItem={p.onItem} leading={<MapPin />} />
          ))}
        </div>
      </div>
    </div>
  );
}
export function WalletSkin(p: Props) {
  const [selected, setSelected] = useState("");
  const cards = p.items.filter((i) => i.folder !== "交易"),
    transactions = p.items.filter((i) => i.folder === "交易");
  return (
    <div className="catalog-skin native-wallet">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>钱包</h1>
        <div className="wallet-stack">
          {cards.map((i, n) => (
            <button
              key={i.id}
              className={selected === i.id ? "selected" : ""}
              style={{
                background: ["#252d38", "#716456", "#4a655d", "#735e6b"][n % 4],
              }}
              onClick={() => {
                setSelected(i.id);
                p.onItem(i);
              }}
            >
              <strong>{i.title}</strong>
              <span>{meta(i, "number", "••••")}</span>
              <small>{meta(i, "amount", i.sender)}</small>
            </button>
          ))}
        </div>
        <h4 className="native-section">交易记录</h4>
        {transactions.map((i) => (
          <Row key={i.id} item={i} onItem={p.onItem} leading={<Wallet />}>
            <strong>{meta(i, "amount")}</strong>
          </Row>
        ))}
        <Empty items={p.items} />
      </div>
    </div>
  );
}
export function FindSkin(p: Props) {
  const { tab, setTab, items } = useContent(p, "设备");
  const list = items.filter((i) =>
    tab === "设备" ? !["人物", "物品"].includes(i.folder) : i.folder === tab,
  );
  return (
    <div className="catalog-skin native-find">
      <Header p={p} />
      <LocationMap items={list} onItem={p.onItem} find />
      <div className="find-sheet">
        <h2>{tab}</h2>
        {tab === "我" && <p>{p.owner} · 此设备</p>}
        {list.map((i) => (
          <Row
            key={i.id}
            item={i}
            onItem={p.onItem}
            leading={
              tab === "设备" ? <Smartphone /> : <Avatar name={i.title} />
            }
          >
            {meta(i, "status", "位置记录")}
          </Row>
        ))}
        <Empty items={list} />
      </div>
      <Tabs
        tabs={["人物", "设备", "物品", "我"]}
        value={tab}
        set={setTab}
        icons={[<Users />, <Smartphone />, <Circle />, <Navigation />]}
      />
    </div>
  );
}
