import { useState } from "react";
import {
  ArrowLeft,
  Home,
  Search,
  Bell,
  Mail,
  Heart,
  Repeat2,
  MessageCircle,
  Bookmark,
  Plus,
  User,
} from "lucide-react";
import { useSkinState } from "../skinState";
import { useActor, ActionComposer } from "../ActorContext";
import { Avatar, Media, Empty, type Props } from "./shared";
import type { Item } from "../schema";
import "./story-x.css";

export function StoryX(p: Props) {
  const actor = useActor();
  const [tab, setTab] = useSkinState<string>(p, "xTab", "首页");
  const [feed, setFeed] = useSkinState<string>(p, "xFeed", "为你推荐");
  const [query, setQuery] = useSkinState<string>(p, "xQuery", "");
  const [detail, setDetail] = useSkinState<string>(p, "xDetail", "");
  const [profile, setProfile] = useSkinState<string>(p, "xProfile", "");
  const [profileTab, setProfileTab] = useSkinState<string>(
    p,
    "xProfileTab",
    "动态",
  );
  const [people, setPeople] = useState("");
  const [mediaOpen, showMedia] = useState(false);
  const [compose, setCompose] = useState(false);
  const [thread, setThread] = useSkinState<string>(p, "xDm", "");
  const [expanded, expand] = useState(false);
  const [replyingTo, setReplyingTo] = useState("");
  const available = p.items.filter(
    (i) =>
      i.time.slice(0, 16) <=
      (p.virtualDate || "") + " " + (p.virtualTime || "23:59"),
  );
  const profiles = available.filter((i) => i.folder === "用户");
  const owner = profiles.find((i) => i.meta.self === "true");
  const posts = available.filter((i) => i.folder === "动态");
  const notifications = available.filter((i) => i.folder === "通知");
  const dms = available.filter((i) => i.folder === "私信");
  const user = (id: string) => profiles.find((i) => i.id === id);
  const current = posts.find((i) => i.id === detail);
  const account = user(profile);
  const search = query.toLocaleLowerCase().trim();
  const matches = (i: Item) =>
    (
      i.title +
      " " +
      i.sender +
      " " +
      i.body +
      " " +
      (i.meta.handle || "") +
      " " +
      (i.meta.tags || "") +
      " " +
      (i.meta.fullName || "")
    )
      .toLocaleLowerCase()
      .includes(search);
  const isLiked = (i: Item) =>
    typeof p.ui?.["liked-" + i.id] === "boolean"
      ? !!p.ui["liked-" + i.id]
      : i.meta.liked === "true";
  const isSaved = (i: Item) => !!p.ui?.["saved-" + i.id];
  function interaction(event: string, i: Item) {
    p.onEvent?.(event, i.id);
  }
  function openPost(i: Item) {
    showMedia(false);
    setDetail(i.id);
    setReplyingTo("");
    setCompose(false);
    expand(false);
    p.onRead(i.id);
  }
  function openUser(id: string) {
    setProfile(id);
    setProfileTab("动态");
    setDetail("");
    setThread("");
    setCompose(false);
    setPeople("");
    p.onEvent?.("viewProfile", id);
  }
  function navigate(t: string) {
    setTab(t);
    setDetail("");
    setProfile("");
    setThread("");
    setPeople("");
    setCompose(false);
  }
  function back() {
    if (compose) setCompose(false);
    else if (detail) setDetail("");
    else if (people) setPeople("");
    else if (profile) setProfile("");
    else if (thread) setThread("");
    else p.onBack();
  }
  function toggleLike(i: Item) {
    p.onUi?.("liked-" + i.id, !isLiked(i));
    interaction(isLiked(i) ? "unlike" : "like", i);
  }
  function toggleSaved(i: Item) {
    p.onUi?.("saved-" + i.id, !isSaved(i));
    interaction(isSaved(i) ? "unsave" : "save", i);
  }
  const identity = (i: Item) => user(i.meta.userId);
  function post(i: Item, full = false) {
    const author = identity(i),
      quote = posts.find((v) => v.id === i.meta.quote);
    return (
      <article key={i.id} className="sx-post">
        {i.meta.repostedBy && (
          <small className="sx-muted">
            ↻ {user(i.meta.repostedBy)?.title} 转发
          </small>
        )}
        <div className="sx-post-head">
          <button
            aria-label={"查看" + i.sender + "主页"}
            onClick={() => openUser(i.meta.userId)}
          >
            <Avatar name={i.sender} src={author?.avatar} />
          </button>
          <button
            className="sx-identity"
            onClick={() => openUser(i.meta.userId)}
          >
            <b>{i.sender}</b>
            <small>
              @{author?.meta.handle || i.meta.handle} ·{" "}
              {i.time.slice(5, 16).replace("-", "月").replace(" ", "日 ")}
            </small>
          </button>
        </div>
        <button
          className="sx-body"
          aria-label={"查看动态" + i.title}
          onClick={() => openPost(i)}
        >
          {i.body}
        </button>
        {i.media && (
          <button
            className="sx-media"
            aria-label={"查看图片" + i.title}
            onClick={() => {
              if (full) showMedia(!mediaOpen);
              else openPost(i);
            }}
          >
            <Media item={{ ...i, kind: "image" }} />
            {i.meta.videoCover === "true" && <span>▷ 视频封面</span>}
          </button>
        )}
        {full && mediaOpen && (
          <button
            className="sx-lightbox"
            aria-label="关闭图片预览"
            onClick={() => showMedia(false)}
          >
            <img src={i.media} alt={i.title} />
            <span>点击关闭</span>
          </button>
        )}
        {quote && (
          <button className="sx-quote" onClick={() => openPost(quote)}>
            <b>{quote.sender}</b>
            <p>{quote.body}</p>
          </button>
        )}
        <div className="sx-actions">
          <button
            aria-label={"评论" + i.title}
            onClick={() => {
              openPost(i);
              interaction("viewComments", i);
            }}
          >
            <MessageCircle size={18} />
            {i.comments.length}
          </button>
          <button
            aria-label={"转发" + i.title}
            onClick={() => {
              if (actor.presets("repost", i.id).length) {
                setCompose(true);
                setDetail(i.id);
              } else actor.check("repost", { target: i.id });
            }}
          >
            <Repeat2 size={18} />
            {i.meta.reposts || "0"}
          </button>
          <button
            aria-label={"点赞" + i.title}
            aria-pressed={isLiked(i)}
            onClick={() => toggleLike(i)}
          >
            <Heart size={18} fill={isLiked(i) ? "#f91880" : "none"} />
            {i.likes + (isLiked(i) ? 1 : 0)}
          </button>
          <button
            aria-label={"收藏" + i.title}
            aria-pressed={isSaved(i)}
            onClick={() => toggleSaved(i)}
          >
            <Bookmark size={18} fill={isSaved(i) ? "currentColor" : "none"} />
          </button>
        </div>
        {full && (
          <>
            <p className="sx-muted">
              {i.time} · {i.meta.views || 0} 次浏览
            </p>
            <h3>回复</h3>
            {(expanded ? i.comments : i.comments.slice(0, 3)).map(
              (comment, n) => (
                <button
                  className="sx-comment"
                  key={n}
                  onClick={() => {
                    p.onEvent?.("readComment", i.id + ":" + n);
                    expand(true);
                    setReplyingTo(comment.split("：")[0]);
                  }}
                >
                  {comment}
                </button>
              ),
            )}
            {i.comments.length > 3 && !expanded && (
              <button className="sx-link" onClick={() => expand(true)}>
                展开全部回复
              </button>
            )}
            {replyingTo && (
              <p className="sx-muted">
                正在回复 {replyingTo}{" "}
                <button onClick={() => setReplyingTo("")}>取消</button>
              </p>
            )}
            <ActionComposer action="comment" target={i.id} label="回复" />
          </>
        )}
      </article>
    );
  }
  const profilePosts = account
    ? posts.filter((i) =>
        profileTab === "点赞"
          ? account.id === owner?.id
            ? isLiked(i)
            : (account.meta.likedPosts || "").split(",").includes(i.id)
          : profileTab === "回复"
            ? i.meta.userId === account.id && !!i.meta.replyTo
            : profileTab === "媒体"
              ? i.meta.userId === account.id && !!i.media
              : i.meta.userId === account.id && !i.meta.replyTo,
      )
    : [];
  const dmList = [...new Set(dms.map((i) => i.title))];
  const unread = notifications.filter((i) => !i.read).length;
  return (
    <div className="story-x">
      <header className="sx-header">
        <button aria-label="返回" onClick={back}>
          <ArrowLeft />
        </button>
        <b>
          {current
            ? "动态"
            : account
              ? account.title
              : compose
                ? "发布动态"
                : thread || "𝕏"}
        </b>
        <button
          aria-label="我的主页"
          onClick={() => owner && openUser(owner.id)}
        >
          <User />
        </button>
      </header>
      <main className="sx-scroll">
        {compose ? (
          <>
            <h2>{current ? "转发动态" : "有什么新鲜事？"}</h2>
            <ActionComposer
              action={current ? "repost" : "post"}
              target={current?.id || "timeline"}
              label={current ? "转发" : "发布动态"}
            />
          </>
        ) : current ? (
          post(current, true)
        ) : account ? (
          <>
            <div className="sx-cover">
              {account.media && <img src={account.media} alt="个人封面" />}
            </div>
            <div className="sx-profile">
              <Avatar name={account.title} src={account.avatar} />
              <h2>{account.title}</h2>
              <small>@{account.meta.handle}</small>
              <p>{account.body}</p>
              <small className="sx-muted">故事内虚构账号</small>
              <div className="sx-counts">
                {["关注", "粉丝"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setPeople(people === t ? "" : t)}
                  >
                    {
                      (
                        account.meta[
                          t === "关注" ? "following" : "followers"
                        ] || ""
                      )
                        .split(",")
                        .filter(Boolean).length
                    }{" "}
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {people ? (
              <>
                <h3>{people}</h3>
                {(
                  account.meta[people === "关注" ? "following" : "followers"] ||
                  ""
                )
                  .split(",")
                  .flatMap((id) => {
                    const u = user(id);
                    return u
                      ? [
                          <button
                            className="sx-person"
                            key={id}
                            onClick={() => openUser(id)}
                          >
                            <Avatar name={u.title} />
                            <span>
                              <b>{u.title}</b>
                              <small>@{u.meta.handle}</small>
                            </span>
                          </button>,
                        ]
                      : [];
                  })}
              </>
            ) : (
              <>
                <nav className="sx-tabs">
                  {["动态", "回复", "媒体", "点赞"].map((t) => (
                    <button
                      key={t}
                      className={profileTab === t ? "active" : ""}
                      onClick={() => setProfileTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </nav>
                {profilePosts.map((i) => post(i))}
                <Empty items={profilePosts} />
              </>
            )}
          </>
        ) : thread ? (
          <>
            <h2>{thread}</h2>
            {dms
              .filter((i) => i.title === thread)
              .map((i) => (
                <div
                  key={i.id}
                  className={"sx-dm " + (i.outgoing ? "mine" : "")}
                >
                  <p>{i.body}</p>
                  {i.media && <Media item={i} />}
                  <small>
                    {i.time} {i.outgoing ? "已读" : ""}
                  </small>
                </div>
              ))}
            <ActionComposer action="dm" target={thread} label="发送消息" />
          </>
        ) : tab === "搜索" ? (
          <>
            <form
              className="sx-search"
              onSubmit={(e) => {
                e.preventDefault();
                p.onEvent?.("search", query.trim());
              }}
            >
              <Search size={18} />
              <input
                aria-label="搜索用户或话题"
                placeholder="搜索用户、关键词或话题"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button>搜索</button>
            </form>
            {search ? (
              <>
                <h3>用户</h3>
                {profiles.filter(matches).map((i) => (
                  <button
                    className="sx-person"
                    key={i.id}
                    onClick={() => openUser(i.id)}
                  >
                    <Avatar name={i.title} />
                    <span>
                      {i.title}
                      <small>@{i.meta.handle}</small>
                    </span>
                  </button>
                ))}
                <h3>动态</h3>
                {posts.filter(matches).map((i) => post(i))}
                {!profiles.some(matches) && !posts.some(matches) && (
                  <p className="sx-empty">没有找到相关结果</p>
                )}
              </>
            ) : (
              <>
                <h2>正在热议</h2>
                {available
                  .filter((i) => i.folder === "趋势")
                  .map((i) => (
                    <button
                      className="sx-trend"
                      key={i.id}
                      onClick={() => {
                        setQuery(i.title);
                        p.onRead(i.id);
                        p.onEvent?.("search", i.title);
                      }}
                    >
                      <small>{i.meta.category}</small>
                      <b>{i.title}</b>
                      <small>{i.body}</small>
                    </button>
                  ))}
              </>
            )}
          </>
        ) : tab === "通知" ? (
          <>
            <h2>通知</h2>
            {notifications.map((i) => (
              <button
                className={"sx-notice " + (!i.read ? "unread" : "")}
                key={i.id}
                onClick={() => {
                  p.onRead(i.id);
                  const target = posts.find(
                    (post) => post.id === i.meta.target,
                  );
                  if (target) openPost(target);
                  else openUser(i.meta.userId);
                }}
              >
                <Bell size={18} />
                <span>
                  {i.body}
                  <small>{i.time}</small>
                </span>
                {!i.read && <i />}
              </button>
            ))}
            <Empty items={notifications} />
          </>
        ) : tab === "私信" ? (
          <>
            <h2>私信</h2>
            {dmList.map((title) => {
              const items = dms.filter((i) => i.title === title),
                last = items.at(-1)!;
              return (
                <button
                  className="sx-person"
                  key={title}
                  onClick={() => {
                    setThread(title);
                    items.forEach((i) => p.onRead(i.id));
                  }}
                >
                  <Avatar name={title} />
                  <span>
                    <b>{title}</b>
                    <small>{last.body}</small>
                  </span>
                </button>
              );
            })}
            <Empty items={dms} />
          </>
        ) : (
          <>
            <nav className="sx-tabs">
              {["为你推荐", "正在关注"].map((t) => (
                <button
                  className={feed === t ? "active" : ""}
                  key={t}
                  onClick={() => setFeed(t)}
                >
                  {t}
                </button>
              ))}
            </nav>
            {posts
              .filter(
                (i) =>
                  !i.meta.replyTo &&
                  i.meta.historyOnly !== "true" &&
                  (feed !== "正在关注" ||
                    i.meta.userId === owner?.id ||
                    (owner?.meta.following || "")
                      .split(",")
                      .includes(i.meta.userId)),
              )
              .sort((a, b) => b.time.localeCompare(a.time))
              .map((i) => post(i))}
          </>
        )}
      </main>
      {!compose && !thread && !current && (
        <button
          className="sx-fab"
          aria-label="发布新动态"
          onClick={() => {
            setCompose(true);
            setProfile("");
          }}
        >
          <Plus />
        </button>
      )}
      <nav className="sx-nav">
        {[Home, Search, Bell, Mail].map((Icon, n) => {
          const label = ["首页", "搜索", "通知", "私信"][n];
          return (
            <button
              key={label}
              aria-label={label}
              aria-pressed={tab === label && !profile && !detail}
              onClick={() => navigate(label)}
            >
              <Icon />
              {label === "通知" && unread > 0 && <small>{unread}</small>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
