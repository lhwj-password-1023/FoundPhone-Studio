import { useActor } from "../ActorContext";
import { useState, useRef } from "react";
import {
  ChevronLeft,
  MoreHorizontal,
  Share,
  Heart,
  Phone,
  MessageCircle,
  Video,
  Folder,
  Search,
  Copy,
} from "lucide-react";
import { NoteDetail } from "./Notes";
import { RichText } from "../RichText";
import { safeMedia, type UiValue, type Item } from "../schema";
export const nativeDetailApps = new Set([
  "notes",
  "photos",
  "contacts",
  "phone",
  "calendar",
  "files",
  "safari",
]);
export function NativeDetail({
  app,
  item,
  back,
  ui,
  onUi,
  adjacent,
  openMessage,
  gallery,
  openPhoto,
  requestCallback,
  writeNote,
}: {
  app: string;
  item: Item;
  gallery?: Item[];
  openPhoto?: (item: Item) => void;
  requestCallback?: () => void;
  writeNote?: () => void;
  openMessage?: () => void;
  back: () => void;
  ui?: Record<string, UiValue>;
  onUi?: (k: string, v: UiValue) => void;
  adjacent?: (direction: number) => void;
}) {
  const actor = useActor();
  const [chrome, setChrome] = useState(true);
  const [info, setInfo] = useState(false),
    [zoom, setZoom] = useState(false);
  const start = useRef(0);
  const [localFavorite, setFavorite] = useState(item.favorite),
    [copied, setCopied] = useState(false),
    [call, setCall] = useState(false);
  const favorite = ui?.["favorite:" + item.id] ?? localFavorite;
  const media = safeMedia(item.media),
    name =
      app === "contacts"
        ? "通讯录"
        : app === "photos"
          ? "所有照片"
          : app === "phone"
            ? "最近通话"
            : app === "calendar"
              ? "日历"
              : app === "files"
                ? "浏览"
                : "书签";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.body);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  if (app === "notes")
    return <NoteDetail {...{ item, back, ui, onUi, writeNote }} />;
  return (
    <div
      className={
        "native-detail native-detail-" +
        app +
        (app === "photos" && !chrome ? " photo-immersive" : "")
      }
    >
      <header className="app-nav">
        <button aria-label="返回" onClick={back}>
          <ChevronLeft size={24} />
          {name}
        </button>
        <strong>
          {app === "photos"
            ? (item.meta.capturedAt || item.time).replace(" ", " · ")
            : ""}
        </strong>
        <button aria-label="更多操作" onClick={() => setCopied(!copied)}>
          <MoreHorizontal size={23} />
        </button>
      </header>
      {copied && (
        <div className="native-action-sheet">
          {onUi && app === "photos" && (
            <button
              onClick={() => {
                onUi("trash:" + item.id, !ui?.["trash:" + item.id]);
                setCopied(false);
                back();
              }}
            >
              {ui?.["trash:" + item.id] ? "恢复" : "移至最近删除"}
            </button>
          )}
          <button onClick={copy}>
            <Copy size={18} />
            复制文字
          </button>
          <button onClick={() => setCopied(false)}>取消</button>
        </div>
      )}
      {app === "photos" ? (
        <>
          <div
            className="native-photo-stage"
            onTouchStart={(e) => {
              start.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - start.current;
              if (!zoom && Math.abs(dx) > 50) adjacent?.(dx < 0 ? 1 : -1);
            }}
          >
            {media ? (
              item.kind === "video" ? (
                <video controls playsInline src={media} />
              ) : (
                <div
                  className={"archive-photo-zoom " + (zoom ? "zoomed" : "")}
                  onClick={() => setChrome(!chrome)}
                  onDoubleClick={() => setZoom(!zoom)}
                >
                  <img src={media} alt={item.title} />
                </div>
              )
            ) : (
              <div className="native-photo-caption">
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </div>
            )}
          </div>
          {info && (
            <div className="archive-photo-info">
              <h3>{item.title}</h3>
              {[
                ["拍摄", "capturedAt"],
                ["文件创建", "createdAt"],
                ["导入", "importedAt"],
                ["地点", "location"],
                ["设备", "device"],
              ].map(
                ([label, key]) =>
                  item.meta[key] && (
                    <div key={key}>
                      {label} {item.meta[key]}
                    </div>
                  ),
              )}
              {item.body}
            </div>
          )}
          <div className="photo-strip">
            {gallery?.map((p) => (
              <button
                key={p.id}
                aria-label={"切换到" + p.title}
                aria-pressed={p.id === item.id}
                onClick={() => openPhoto?.(p)}
              >
                <img src={safeMedia(p.media)} alt="" />
              </button>
            ))}
          </div>
          <footer className="native-detail-toolbar">
            <button onClick={() => setInfo(!info)} aria-label="照片信息">
              ⓘ
            </button>
            {media && (
              <button onClick={() => setZoom(!zoom)} aria-label="缩放照片">
                {zoom ? "−" : "＋"}
              </button>
            )}
            <button aria-label="分享照片说明" onClick={copy}>
              <Share />
            </button>
            <button
              aria-label="收藏照片"
              onClick={() => {
                setFavorite(!favorite);
                onUi?.("favorite:" + item.id, !favorite);
              }}
            >
              <Heart fill={favorite ? "#007aff" : "none"} />
            </button>
            <button
              aria-label="删除照片"
              disabled={!onUi}
              onClick={() => {
                onUi?.("trash:" + item.id, true);
                back();
              }}
            >
              删除
            </button>
            <span>{copied ? "已复制" : ""}</span>
          </footer>
        </>
      ) : app === "contacts" || app === "phone" ? (
        <div className="native-detail-scroll">
          <div className="native-contact-hero">
            <span>{item.title.slice(0, 1)}</span>
            <h1>{item.title}</h1>
          </div>
          {requestCallback && (
            <button
              onClick={() => {
                if (actor.check("call", { target: item.id }))
                  requestCallback?.();
              }}
            >
              请对方回电
            </button>
          )}
          <div className="native-contact-actions">
            {[
              [MessageCircle, "信息"],
              [Phone, "呼叫"],
              [Video, "视频"],
            ].map(([Icon, label]) => {
              const Glyph = Icon as typeof Phone;
              return (
                <button
                  key={String(label)}
                  disabled={label === "视频" && !!ui}
                  onClick={() => {
                    if (label === "信息") {
                      if (openMessage) openMessage();
                      else actor.check("message", { target: item.id });
                      return;
                    }
                    if (actor.check("call", { target: item.id })) {
                      if (requestCallback) requestCallback();
                      else setCall(true);
                    }
                  }}
                >
                  <Glyph size={23} />
                  {String(label)}
                </button>
              );
            })}
          </div>
          <div className="native-detail-group">
            <small>手机</small>
            <p className="native-blue">
              {item.meta.phone || item.meta.number || "未设置号码"}
            </p>
          </div>
          <div className="native-detail-group">
            <small>备注</small>
            <p>{item.body}</p>
          </div>
          {call && (
            <div className="native-detail-group">
              <p>
                {item.meta.outcome || "暂时无法接通"} · {item.title}
              </p>
              <button onClick={() => setCall(false)}>结束</button>
            </div>
          )}
        </div>
      ) : app === "calendar" ? (
        <div className="native-detail-scroll native-event-paper">
          <h1>{item.title}</h1>
          <p>{item.time}</p>
          <div className="native-detail-group">
            <small>日程</small>
            <p>{item.body}</p>
          </div>
          {Object.entries(item.meta).map(([k, v]) => (
            <div className="native-detail-group" key={k}>
              <small>{k}</small>
              <p>{v}</p>
            </div>
          ))}
        </div>
      ) : app === "safari" ? (
        <>
          <div className="native-detail-scroll native-reader">
            <h1>{item.title}</h1>
            <RichText value={item.richText} fallback={item.body} />
          </div>
          <footer className="native-reader-address">
            <Search size={16} />
            <span>{item.meta.url || item.title}</span>
            <Share size={18} />
          </footer>
        </>
      ) : (
        <div className="native-detail-scroll native-file-preview">
          <Folder size={64} color="#007aff" />
          <h2>{item.title}</h2>
          <p>{item.body}</p>
          <small>{item.time}</small>
          <button onClick={copy}>复制内容</button>
        </div>
      )}
    </div>
  );
}
