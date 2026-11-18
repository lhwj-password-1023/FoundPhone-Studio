import { useActor } from "../ActorContext";
import { Transcript } from "./Transcript";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ChevronLeft, Info, Paperclip, X, CircleAlert } from "lucide-react";
import { Avatar, Media } from "./shared";
import { visible } from "../engine";
import { replyOptions } from "../story-engine/timeline";
import { blockedMessage } from "../story-engine/guidance";
import type { Item, Runtime, UiValue, Work } from "../schema";
import "./story-thread.css";

type Props = {
  work: Work;
  state: Runtime;
  app: string;
  thread: string;
  items: Item[];
  back: () => void;
  read: (id: string) => void;
  send: (target: string) => void;
  onUi?: (key: string, value: UiValue) => void;
  onEvent: (event: string, id: string) => void;
  openResource: (id: string) => void;
  openAssistant?: () => void;
};
export function StoryThread({
  work,
  state,
  app,
  thread,
  items,
  back,
  read,
  send,
  onUi,
  onEvent,
  openResource,
  openAssistant,
}: Props) {
  const actor = useActor();
  const kakao = app === "kakao";
  const list = items.filter((i) => i.title === thread).sort((a, b) => a.time.localeCompare(b.time));
  const displayName = !kakao && thread === "陌生号码" ? String(state.ui?.messages?.contactAlias || thread) : thread;
  const choices = state.endings.length
    ? []
    : replyOptions(work, state, app, thread);
  const selected = String(state.ui?.[app]?.["draft:" + thread] || "");
  const setSelected = (id: string) => onUi?.("draft:" + thread, id);
  const [picker, setPicker] = useState(false),
    [typing, setTyping] = useState<number | null>(() =>
      selected &&
      state.ui?.[app]?.["sending:" + thread] === selected &&
      choices.some((i) => i.id === selected)
        ? 0
        : null,
    ),
    [inspect, setInspect] = useState<Item | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [contactSheet, setContactSheet] = useState(false);
  const [contactEdit, setContactEdit] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactError, setContactError] = useState("");
  const [failedMenu, setFailedMenu] = useState(false);
  const openedThread = useRef("");
  useEffect(() => {
    if (openedThread.current === thread) return;
    openedThread.current = thread;
    onEvent("openThread", thread);
  }, [onEvent, thread]);
  const option = choices.find((i) => i.id === selected);
  const pane = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ read, send, onUi });
  callbacks.current = { read, send, onUi };
  const hold = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const body = option?.body || "";
  const text = useMemo(
    () =>
      typeof Intl.Segmenter === "function"
        ? Array.from(
            new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
              body,
            ),
            (part) => part.segment,
          )
        : Array.from(body),
    [body],
  );
  const historyKey = "anchor:" + thread;
  const savedAnchor = useRef(state.ui?.[app]?.[historyKey]);
  const lastId = list.at(-1)?.id;
  const previous = useRef<string | undefined>(undefined);
  const readIds = useRef(state.read);
  readIds.current = state.read;
  useEffect(() => {
    const el = pane.current;
    if (!el) return;
    const anchor =
      typeof savedAnchor.current === "string" &&
      Array.from(el.querySelectorAll<HTMLElement>("[data-record]")).find(
        (n) => n.dataset.record === savedAnchor.current,
      );
    if (previous.current === undefined && anchor)
      anchor.scrollIntoView({ block: "start" });
    else if (
      !previous.current ||
      el.scrollHeight - el.scrollTop - el.clientHeight < 270 ||
      list.at(-1)?.outgoing
    )
      el.scrollTop = el.scrollHeight;
    previous.current = lastId;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.record;
          if (id && entry.isIntersecting && !readIds.current.includes(id))
            callbacks.current.read(id);
        }
      },
      { root: el, threshold: 0.5 },
    );
    el.querySelectorAll("[data-record]").forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [lastId, list.length]);
  useEffect(() => () => clearTimeout(hold.current), []);
  useEffect(() => {
    if (typing === null || !option) return;
    const finished = typing >= text.length;
    const pause = finished
      ? 260
      : /[，。！？、…,.!?]/u.test(text[typing - 1] || "")
        ? 240
        : 145;
    const timer = setTimeout(() => {
      if (finished) {
        if (
          actor.check(option.meta.action === "reply" ? "reply" : "message", {
            target: thread,
            preset: option.id,
          })
        )
          callbacks.current.send(option.meta.reply);
        callbacks.current.onUi?.("sending:" + thread, "");
        setSelected("");
        setTyping(null);
      } else setTyping(typing + 1);
    }, pause);
    return () => clearTimeout(timer);
  }, [typing, option, text]);
  const getAsset = (i: Item) =>
    Object.values(work.data)
      .flat()
      .find((a) => a.id === i.meta.resource && visible(a, state));
  const showDetails = (i: Item) => {
    clearTimeout(hold.current);
    read(i.id);
    setInspect(i);
  };
  const typingPeer = (state.scheduled || []).some((t) =>
    work.nodes
      .find((n) => n.id === t.nodeId)
      ?.actions.some(
        (a) =>
          a.type === "unlock" &&
          (work.data[app] || []).some(
            (i) => i.id === a.key && i.title === thread && !i.outgoing,
          ),
      ),
  );
  return (
    <section
      className={"archive-chat " + (kakao ? "archive-kakao" : "archive-sms")}
    >
      <header>
        <button aria-label="返回会话列表" onClick={back}>
          <ChevronLeft />
        </button>
        <div>
          <Avatar name={displayName} />
          <strong>{displayName}</strong>
        </div>
        <button
          aria-label="聊天资料"
          onClick={() => thread === "陌生号码" && !kakao ? setContactSheet(true) : setInspect(list[0] || null)}
        >
          <Info size={20} />
        </button>
      </header>
      <div
        className="archive-log"
        ref={pane}
        onScroll={() => {
          const el = pane.current;
          if (!el) return;
          const top = el.getBoundingClientRect().top;
          const first = Array.from(
            el.querySelectorAll<HTMLElement>("[data-record]"),
          ).find((n) => n.getBoundingClientRect().bottom > top);
          if (
            first?.dataset.record &&
            savedAnchor.current !== first.dataset.record
          ) {
            savedAnchor.current = first.dataset.record;
            callbacks.current.onUi?.(historyKey, first.dataset.record);
          }
        }}
      >
        {list.map((i, n) => {
          const asset = getAsset(i),
            reaction = state.ui?.[app]?.["reaction:" + i.id];
          const removed = state.ui?.[app]?.["removed:" + i.id];
          return (
            <div key={i.id}>
              {(n === 0 ||
                list[n - 1].time.slice(0, 10) !== i.time.slice(0, 10)) && (
                <time className="archive-date">{i.time.slice(0, 10)}</time>
              )}
              <article
                data-record={i.id}
                className={i.outgoing ? "mine" : "peer"}
              >
                {kakao && !i.outgoing && <small>{i.sender}</small>}
                <div
                  className="archive-bubble"
                  tabIndex={0}
                  role="button"
                  aria-label={removed ? "已移除的消息" : i.body}
                  onPointerDown={() => {
                    clearTimeout(hold.current);
                    hold.current = setTimeout(() => showDetails(i), 480);
                  }}
                  onPointerUp={() => clearTimeout(hold.current)}
                  onPointerCancel={() => clearTimeout(hold.current)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    showDetails(i);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") showDetails(i);
                  }}
                  onClick={() => showDetails(i)}
                >
                  {removed ? (
                    "已移除的消息"
                  ) : (
                    <>
                      {i.meta.linkPreview === "true" && (
                        <div className="story-link-card">
                          <small>{i.meta.source}</small>
                          <strong>{i.body}</strong>
                          <span>{i.meta.summary}</span>
                          <small>{i.meta.url}</small>
                        </div>
                      )}
                      {(asset || i.media) &&
                        (asset?.kind === "file" ? (
                          <strong>
                            <Paperclip size={16} /> {asset.title}
                          </strong>
                        ) : (
                          <Media
                            item={asset || i}
                            onPlay={() => onEvent("play", (asset || i).id)}
                          />
                        ))}
                      {i.meta.linkPreview !== "true" && <span>
                        {i.meta.transcript
                          ? "▷ 语音 · " + i.meta.duration + " 秒"
                          : i.body}
                      </span>}
                    </>
                  )}
                </div>
                <small>
                  {i.time.slice(-5)}{" "}
                  {i.outgoing &&
                    (i.meta.failed === "true" ? "未送达" : kakao
                      ? i.meta.unread === "true" || n === list.length - 1
                        ? "1"
                        : ""
                      : n === list.length - 1
                        ? "已送达"
                        : "已读")}{" "}
                  {reaction || ""}
                </small>
                {i.meta.failed === "true" && <button className="story-failed-mark" aria-label="查看发送失败" onClick={() => setFailedMenu(true)}><CircleAlert size={19} /></button>}
              </article>
            </div>
          );
        })}
        {typingPeer && (
          <article className="peer typing-row">
            <div
              className="archive-bubble peer-typing-bubble"
              role="status"
              aria-live="polite"
            >
              正在输入…
            </div>
          </article>
        )}
      </div>
      {inspect?.meta.transcript ? (
        <Transcript
          key={inspect.id}
          item={inspect}
          mode="语音消息"
          ui={state.ui?.[app]}
          onUi={onUi}
          close={() => setInspect(null)}
        />
      ) : (
        inspect && (
          <div className="archive-sheet" role="dialog" aria-label="消息详情">
            <button
              className="sheet-close"
              aria-label="关闭详情"
              onClick={() => setInspect(null)}
            >
              <X />
            </button>
            {inspect.kind === "image" && inspect.media && (
              <div className="attachment-preview">
                <Media item={inspect} />
              </div>
            )}
            <strong>{inspect.sender}</strong>
            <p>
              发送 {inspect.meta.sentAt}
              <br />
              抵达 {inspect.meta.arrivedAt}
            </p>
            {getAsset(inspect) && (
              <button
                onClick={() => {
                  openResource(inspect.meta.resource);
                  setInspect(null);
                }}
              >
                <Paperclip size={16} /> 查看原文件
              </button>
            )}
            <div>
              {inspect.meta.unread !== "true" && ["❤️", "👍", "🙂"].map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    onUi?.("reaction:" + inspect.id, e);
                    setInspect(null);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
            {inspect.outgoing && inspect.meta.unread !== "true" && inspect.meta.failed !== "true" && (
              <button
                onClick={() => {
                  onUi?.(
                    "removed:" + inspect.id,
                    !state.ui?.[app]?.["removed:" + inspect.id],
                  );
                  setInspect(null);
                }}
              >
                {state.ui?.[app]?.["removed:" + inspect.id]
                  ? "恢复显示"
                  : "从本机隐藏"}
              </button>
            )}
          </div>
        )
      )}
      {picker && (
        <div className="archive-options" aria-label="预设回复">
          {choices.map((i) => (
            <button
              key={i.id}
              onClick={() => {
                setSelected(i.id);
                setPicker(false);
              }}
            >
              {i.meta.resource && <Paperclip size={15} />} {i.body}
            </button>
          ))}
        </div>
      )}
      {contactSheet && (
        <div className="story-blocked-backdrop" onClick={() => setContactSheet(false)}>
          <div className="story-contact-sheet" role="dialog" aria-label="联系人资料" onClick={(e) => e.stopPropagation()}>
            <button className="sheet-close" onClick={() => setContactSheet(false)} aria-label="关闭">×</button>
            <Avatar name={displayName} /><h2>{displayName}</h2>
            <small>iMessage 联系人 · 与 KakaoTalk 账号分开保存</small>
            {contactEdit ? <>
              <label>姓名<input aria-label="联系人姓名" value={contactName} onChange={(e) => { setContactName(e.target.value); setContactError(""); }} /></label>
              {contactError && <p role="alert">{contactError}</p>}
              <button onClick={() => { if (contactName.trim() !== "旻浩哥") { setContactError("请将姓名备注为“旻浩哥”。"); return; } onEvent("saveContact", "s4-lee"); setContactSheet(false); setContactEdit(false); }}>完成</button>
            </> : <button disabled={displayName === "旻浩哥" || state.variables.sceneThreeStage13 !== true} onClick={() => { setContactName(displayName === "陌生号码" ? "" : displayName); setContactEdit(true); }}>新建联系人 / 编辑备注</button>}
          </div>
        </div>
      )}
      {failedMenu && <div className="story-blocked-backdrop" onClick={() => setFailedMenu(false)}><div className="story-blocked-dialog" role="dialog" aria-label="发送失败" onClick={(e) => e.stopPropagation()}><p>消息未送达</p><div><button onClick={() => setFailedMenu(false)}>取消</button><button onClick={() => setFailedMenu(false)}>再次尝试发送</button></div></div></div>}
      {blocked && (
        <div className="story-blocked-backdrop" role="presentation" onClick={() => setBlocked(false)}>
          <div className="story-blocked-dialog" role="dialog" aria-modal="true" aria-label="剧情提示" onClick={(event) => event.stopPropagation()}>
            <p>昇玟好像有什么事情要做，试着问问GPT吧。</p>
            <div>
              <button onClick={() => setBlocked(false)}>知道了</button>
              {openAssistant && <button onClick={() => { setBlocked(false); openAssistant(); }}>问问GPT</button>}
            </div>
          </div>
        </div>
      )}
      <footer>
        <button
          className="archive-input"
          disabled={typing !== null}
          onClick={() => setPicker(!picker)}
        >
          {typing !== null ? (
            <span className="compose-in-progress">
              {text.slice(0, typing).join("")}
            </span>
          ) : option ? (
            "已选回复"
          ) : choices.length ? (
            "选择回复"
          ) : kakao ? (
            "聊天"
          ) : (
            "信息"
          )}
        </button>
        <button
          className="archive-send"
          aria-label={typing === null ? "发送回复" : "完成输入"}
          onClick={() => {
            const candidate = option || (choices.length === 1 ? choices[0] : undefined);
            if (!kakao && !candidate && blockedMessage(work, state, thread)) {
              setBlocked(true);
              return;
            }
            if (
              !actor.check(
                candidate?.meta.action === "reply" ? "reply" : "message",
                { target: thread, preset: candidate?.id },
              )
            )
              return;
            if (!candidate) return;
            if (!option) setSelected(candidate.id);
            onUi?.("sending:" + thread, candidate.id);
            setTyping(typing !== null ? text.length : Math.min(1, text.length));
          }}
        >
          <ArrowUp size={19} />
        </button>
      </footer>
    </section>
  );
}
