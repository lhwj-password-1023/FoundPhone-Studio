import { useEffect, useState } from "react";
import { useSimulatedTyping } from "../skins/useSimulatedTyping";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Ellipsis,
  Folder,
  LockKeyhole,
  Paperclip,
  Pin,
  Search,
  Share,
  SquarePen,
  Trash2,
} from "lucide-react";
import { useSkinState } from "../skinState";
import { RichText } from "../RichText";
import { safeMedia, type Item, type UiValue } from "../schema";
import { groupItems, Media, useContent, type Props } from "../skins/shared";
import "./notes.css";

function noteGroup(time: string, today?: string) {
  const date = time.slice(0, 10);
  const days = (Date.parse(today || "") - Date.parse(date)) / 86400000;
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days > 1 && days < 7) return "过去 7 天";
  if (days >= 7 && days < 30) return "过去 30 天";
  return /^\d{4}-\d{2}/.test(date)
    ? date.slice(0, 7).replace("-", " 年 ") + " 月"
    : "备忘录";
}

export function NotesSkin(p: Props) {
  const { q, setQ, items } = useContent(p, "备忘录");
  const [folder, setFolder] = useSkinState<string>(p, "noteFolder", "");
  const [inFolders, showFolders] = useSkinState<boolean>(
    p,
    "noteFoldersOpen",
    false,
  );
  const [collapsed, collapse] = useSkinState<boolean>(
    p,
    "notesPinnedCollapsed",
    false,
  );
  const [byTitle, sortByTitle] = useSkinState<boolean>(
    p,
    "notesByTitle",
    false,
  );
  const [menu, setMenu] = useState(false);
  const trash = (i: Item) => !!p.ui?.["trash:" + i.id];
  const inFolder = (i: Item, f: string) =>
    f === "最近删除"
      ? trash(i)
      : !trash(i) && (!f || (i.folder || "备忘录") === f);
  const list = items
    .filter((i) => inFolder(i, folder))
    .sort((a, b) => b.time.localeCompare(a.time));
  const groups = new Map<string, Item[]>();
  for (const i of list) {
    const name =
      !trash(i) && p.ui?.["pin:" + i.id]
        ? "置顶"
        : noteGroup(i.time, p.virtualDate);
    const rows = groups.get(name);
    if (rows) rows.push(i);
    else groups.set(name, [i]);
  }
  const sections = [...groups].sort(
    ([a], [b]) => Number(b === "置顶") - Number(a === "置顶"),
  );
  const folders = [
    "",
    ...groupItems(
      p.items.filter((i) => !trash(i)),
      "备忘录",
    ),
    ...(p.archive ? ["最近删除"] : []),
  ];
  const draft =
    p.archive &&
    p.items.find(
      (i) => inFolder(i, folder) && !trash(i) && i.meta.composeText && !i.body,
    );
  function navigate(f: string) {
    setFolder(f);
    showFolders(false);
    setQ("");
    setMenu(false);
  }
  return (
    <div className="notes-ui notes-index">
      <header className="notes-nav">
        <button
          className="notes-glass"
          aria-label={inFolders ? "返回" : "返回文件夹"}
          onClick={() => {
            if (inFolders) p.onBack();
            else {
              showFolders(true);
              setMenu(false);
              setQ("");
            }
          }}
        >
          <ChevronLeft />
        </button>
        {!inFolders && (
          <button
            className="notes-glass"
            aria-label="更多操作"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Ellipsis />
          </button>
        )}
      </header>
      {menu && (
        <div className="notes-menu">
          <button
            onClick={() => {
              sortByTitle(!byTitle);
              setMenu(false);
            }}
          >
            {byTitle ? "按修改日期排列" : "组内按标题排列"}
          </button>
        </div>
      )}
      <main className="notes-scroll" key={inFolders ? "folders" : folder}>
        <h1>{inFolders ? "文件夹" : folder || "备忘录"}</h1>
        {inFolders ? (
          <div className="notes-list">
            {folders.map((f) => (
              <button key={f} onClick={() => navigate(f)}>
                <Folder size={20} />
                <b>{f || "所有备忘录"}</b>
                <small>{p.items.filter((i) => inFolder(i, f)).length}</small>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="notes-count">{list.length} 则备忘录</p>
            {sections.map(([name, rows]) => (
              <section key={name}>
                <h2>
                  {name === "置顶" ? (
                    <button
                      aria-expanded={!collapsed}
                      onClick={() => collapse(!collapsed)}
                    >
                      置顶 {collapsed ? <ChevronRight /> : <ChevronDown />}
                    </button>
                  ) : (
                    name
                  )}
                </h2>
                {(name !== "置顶" || !collapsed) && (
                  <div className="notes-list">
                    {(byTitle
                      ? [...rows].sort((a, b) =>
                          a.title.localeCompare(b.title, "zh"),
                        )
                      : rows
                    ).map((i) => (
                      <button key={i.id} onClick={() => p.onItem(i)}>
                        <span>
                          <strong>
                            {i.password && <LockKeyhole size={13} />} {i.title}
                          </strong>
                          <span className="notes-preview">
                            <time>
                              {i.time.slice(0, 10) === p.virtualDate
                                ? i.time.slice(11, 16)
                                : i.time.slice(0, 10).replaceAll("-", "/")}
                            </time>
                            {i.password
                              ? "已锁定的备忘录"
                              : i.body.split("\n")[0]}
                          </span>
                        </span>
                        {!i.password &&
                          safeMedia(i.media)?.startsWith("data:image/") && (
                            <img alt="" src={safeMedia(i.media)} />
                          )}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
            {!list.length && (
              <p className="notes-empty">{q ? "没有搜索结果" : "暂无备忘录"}</p>
            )}
          </>
        )}
      </main>
      {!inFolders && (
        <footer className="notes-tools">
          <label className="notes-glass notes-search">
            <Search size={20} />
            <input
              aria-label="搜索备忘录"
              placeholder="搜索"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <button
            className="notes-glass"
            aria-label="新建备忘录"
            disabled={!p.creator && !draft}
            onClick={() => (p.creator ? p.onAdd() : draft && p.onItem(draft))}
          >
            <SquarePen />
          </button>
        </footer>
      )}
    </div>
  );
}

export function NoteDetail({
  item,
  back,
  ui,
  onUi,
  writeNote,
}: {
  item: Item;
  back: () => void;
  ui?: Record<string, UiValue>;
  onUi?: (key: string, value: UiValue) => void;
  writeNote?: () => void;
}) {
  const [menu, setMenu] = useState<"more" | "share" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [attachment, setAttachment] = useState(false);
  const composing = !!writeNote && !!ui?.["composing:" + item.id];
  const body = composing ? item.meta.composeText : item.body;
  const titleTyping = useSimulatedTyping();
  const typing = useSimulatedTyping();
  useEffect(() => {
    if (composing && !titleTyping.active) titleTyping.start(item.title);
  }, [composing, item.title, titleTyping]);
  useEffect(() => {
    if (composing && titleTyping.done && !typing.active) typing.start(body);
  }, [composing, titleTyping.done, typing, body]);
  const pinned = !!ui?.["pin:" + item.id];
  const trashed = !!ui?.["trash:" + item.id];
  const checklist = item.meta.checklist === "true";
  const togglePin = () => {
    onUi?.("pin:" + item.id, !pinned);
    setMenu(null);
  };
  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      setFeedback("已复制");
    } catch {
      setFeedback("请长按正文复制");
    }
    setMenu(null);
  }
  return (
    <div className="notes-ui notes-detail">
      <header className="notes-nav">
        <button className="notes-glass" onClick={back} aria-label="返回">
          <ChevronLeft />
        </button>
        <div className="notes-glass notes-pill">
          {composing && (
            <button disabled={!titleTyping.done || !typing.done} onClick={writeNote}>
              完成
            </button>
          )}
          <button
            aria-label="分享备忘录"
            aria-expanded={menu === "share"}
            disabled={!body}
            onClick={() => setMenu(menu === "share" ? null : "share")}
          >
            <Share />
          </button>
          <button
            aria-label="更多操作"
            aria-expanded={menu === "more"}
            onClick={() => setMenu(menu === "more" ? null : "more")}
          >
            <Ellipsis />
          </button>
        </div>
      </header>
      {menu && (
        <div className="notes-menu">
          {menu === "share" ? (
            <button onClick={copy}>
              <Copy size={17} />
              复制正文
            </button>
          ) : (
            <>
              <div className="notes-date">修改于 {item.time}</div>
              {onUi && (
                <>
                  <button onClick={togglePin}>
                    <Pin size={17} />
                    {pinned ? "取消置顶" : "置顶"}
                  </button>
                  <button
                    onClick={() => {
                      onUi("trash:" + item.id, !trashed);
                      back();
                    }}
                  >
                    <Trash2 size={17} />
                    {trashed ? "恢复" : "移至最近删除"}
                  </button>
                </>
              )}
            </>
          )}
          <button onClick={() => setMenu(null)}>关闭</button>
        </div>
      )}
      <main className="native-note-paper notes-paper">
        <h1 onClick={() => composing && titleTyping.reveal()}>{composing ? titleTyping.shown : item.title}</h1>
        {writeNote ? (
          composing ? (
            <p className={typing.done ? "" : "compose-in-progress simulated-caret"} onClick={() => typing.reveal()} style={{ whiteSpace: "pre-wrap" }}>
              {typing.shown}
            </p>
          ) : (
            <button
              className="note-prompt"
              onClick={() => onUi?.("composing:" + item.id, true)}
            >
              写下备忘录
            </button>
          )
        ) : checklist ? (
          item.body.split("\n").map((line, i) => (
            <label key={i}>
              <input
                type="checkbox"
                checked={!!ui?.["check:" + item.id + i]}
                onChange={(e) =>
                  onUi?.("check:" + item.id + i, e.target.checked)
                }
              />
              {line}
            </label>
          ))
        ) : (
          <RichText value={item.richText} fallback={body} />
        )}
        {attachment && <Media item={item} />}
      </main>
      <footer className="notes-tools">
        <div className="notes-glass notes-pill">
          <button
            aria-label={pinned ? "取消置顶" : "置顶备忘录"}
            disabled={!onUi}
            aria-pressed={pinned}
            onClick={togglePin}
          >
            <Pin fill={pinned ? "currentColor" : "none"} />
          </button>
          <button
            aria-label="查看附件"
            disabled={!safeMedia(item.media)}
            aria-expanded={attachment}
            onClick={() => setAttachment(!attachment)}
          >
            <Paperclip />
          </button>
          <button aria-label="复制备忘录" disabled={!body} onClick={copy}>
            <Copy />
          </button>
        </div>
        {feedback && <small role="status">{feedback}</small>}
        <button
          className="notes-glass"
          aria-label={composing ? "保存备忘录" : "撰写正文"}
          disabled={!writeNote || (composing && !typing.done)}
          onClick={() =>
            composing ? writeNote?.() : onUi?.("composing:" + item.id, true)
          }
        >
          {composing ? <Check /> : <SquarePen />}
        </button>
      </footer>
    </div>
  );
}
