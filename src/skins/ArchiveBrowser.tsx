import { useProgressiveText } from "./ProgressiveText";
import { useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  Minus,
  Star,
  Search,
} from "lucide-react";
import { useSkinState } from "../skinState";
import { Header, type Props } from "./shared";

type Tab = { pages: string[]; index: number };
function tabsFrom(raw: string): Tab[] {
  try {
    const a: unknown = JSON.parse(raw);
    if (
      Array.isArray(a) &&
      a.length &&
      a.every(
        (t) =>
          Array.isArray(t.pages) &&
          t.pages.every((p: unknown) => typeof p === "string") &&
          Number.isInteger(t.index) &&
          t.index >= 0 &&
          t.index < t.pages.length,
      )
    )
      return a;
  } catch {
    /* Start on bookmarks for old saves. */
  }
  return [{ pages: [""], index: 0 }];
}
export function ArchiveBrowser(p: Props) {
  const [saved, save] = useSkinState<string>(p, "browserTabs", ""),
    [active, setActive] = useSkinState<number>(p, "browserActive", 0);
  const [visited, setVisited] = useSkinState<string[]>(p, "history", []),
    [favorites, setFavorites] = useSkinState<string[]>(
      p,
      "bookmarks",
      p.items.filter((i) => i.favorite).map((i) => i.id),
    );
  const [query, setQuery] = useState(""),
    [panel, setPanel] = useState(""),
    [find, setFind] = useState(""),
    [reader, setReader] = useSkinState<boolean>(p, "reader", false);
  const tabs = tabsFrom(saved),
    index = Math.min(active, tabs.length - 1),
    tab = tabs[index];
  const page = p.items.find((i) => i.id === tab.pages[tab.index]);
  const setTab = (t: Tab) =>
    save(JSON.stringify(tabs.map((v, n) => (n === index ? t : v))));
  const navigate = (id: string) => {
    setTab({
      pages: [...tab.pages.slice(0, tab.index + 1), id],
      index: tab.index + 1,
    });
    setPanel("");
    setQuery("");
    setPreset("");
    setFind("");
    if (id) {
      setVisited([id, ...visited.filter((v) => v !== id)]);
      p.onRead(id);
    }
  };
  const [preset, setPreset] = useState("");
  const typing = useProgressiveText(preset);
  const input = preset ? typing.shown : query;
  const search = input.trim().toLowerCase();
  const results = p.items.filter((i) =>
    (i.title + i.body + i.meta.url).toLowerCase().includes(search),
  );
  const display =
    panel === "历史记录"
      ? [
          ...new Set([
            ...visited,
            ...p.items.filter((i) => i.folder === "历史记录").map((i) => i.id),
          ]),
        ].flatMap((id) => p.items.filter((i) => i.id === id))
      : panel === "书签"
        ? p.items.filter((i) => favorites.includes(i.id))
        : results;
  const body = page?.body || "",
    pos = find ? body.toLowerCase().indexOf(find.toLowerCase()) : -1;
  return (
    <div
      className={
        "catalog-skin native-safari archive-browser " +
        (reader ? "reader-on" : "")
      }
    >
      <Header p={p} />
      <form
        className="safari-address"
        onSubmit={(e) => {
          e.preventDefault();
          if (preset && !typing.done) return;
          p.onEvent?.("search", input.trim());
          if (results.length === 1) navigate(results[0].id);
          else setPanel("搜索结果");
        }}
      >
        <Search size={15} />
        <input
          aria-label="地址栏"
          placeholder={page?.meta.url || "搜索或输入网址"}
          value={input}
          onFocus={() => setPanel("搜索")}
          onChange={(e) => {
            setPreset("");
            setQuery(e.target.value);
            setPanel("搜索");
          }}
        />
      </form>
      {panel === "搜索" &&
        !input &&
        p.items
          .filter((i) => i.meta.keyword || i.folder === "历史记录")
          .map((i) => (
            <button
              key={i.id}
              onClick={() => setPreset(i.meta.keyword || i.title)}
            >
              {i.meta.keyword || i.title}
            </button>
          ))}
      <div className="catalog-scroll">
        {panel === "标签页" ? (
          <>
            <h1>标签页</h1>
            {tabs.map((t, n) => (
              <div className="browser-tab" key={n}>
                <button
                  onClick={() => {
                    setActive(n);
                    setPanel("");
                    setQuery("");
                  }}
                >
                  {p.items.find((i) => i.id === t.pages[t.index])?.title ||
                    "起始页"}
                </button>
                <button
                  aria-label="关闭标签页"
                  disabled={tabs.length === 1}
                  onClick={() => {
                    save(JSON.stringify(tabs.filter((_, j) => j !== n)));
                    setActive(
                      n < index ? index - 1 : Math.min(index, tabs.length - 2),
                    );
                  }}
                >
                  <Minus />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                save(JSON.stringify([...tabs, { pages: [""], index: 0 }]));
                setActive(tabs.length);
                setPanel("");
                setQuery("");
              }}
            >
              新建标签页
            </button>
          </>
        ) : page && (!panel || panel === "页内查找") ? (
          <article className="native-reader">
            <small>{page.meta.source || "作品内已保存的网页"}</small>
            <h1>{page.title}</h1>
            {panel === "页内查找" && (
              <label>
                页内查找{" "}
                <input value={find} onChange={(e) => setFind(e.target.value)} />
                {find && pos < 0 && "没有匹配"}
              </label>
            )}
            <p>
              {pos < 0 ? (
                body
              ) : (
                <>
                  {body.slice(0, pos)}
                  <mark>{body.slice(pos, pos + find.length)}</mark>
                  {body.slice(pos + find.length)}
                </>
              )}
            </p>
            <button onClick={() => setPanel(panel ? "" : "页内查找")}>
              查找文字
            </button>
            <button aria-pressed={reader} onClick={() => setReader(!reader)}>
              阅读模式
            </button>
            <button
              onClick={() =>
                setFavorites(
                  favorites.includes(page.id)
                    ? favorites.filter((id) => id !== page.id)
                    : [...favorites, page.id],
                )
              }
            >
              {favorites.includes(page.id) ? "移除书签" : "添加书签"}
            </button>
          </article>
        ) : (
          <>
            <h1>{panel || "起始页"}</h1>
            <div className="safari-favorites">
              {display.map((i) => (
                <button key={i.id} onClick={() => navigate(i.id)}>
                  <strong>{i.title}</strong>
                  <small>{i.meta.url}</small>
                </button>
              ))}
            </div>
            {!display.length && <p>没有匹配的网页</p>}
          </>
        )}
      </div>
      <footer>
        {[
          [
            ChevronLeft,
            "后退",
            () => {
              setPanel("");
              setQuery("");
              setTab({ ...tab, index: tab.index - 1 });
            },
            tab.index === 0,
          ],
          [
            ChevronRight,
            "前进",
            () => {
              setPanel("");
              setQuery("");
              setTab({ ...tab, index: tab.index + 1 });
            },
            tab.index === tab.pages.length - 1,
          ],
          [Star, "书签", () => setPanel("书签"), false],
          [BookOpen, "历史记录", () => setPanel("历史记录"), false],
          [CopyPlus, "标签页", () => setPanel("标签页"), false],
        ].map(([Icon, label, action, disabled]) => {
          const Glyph = Icon as typeof Star;
          return (
            <button
              key={String(label)}
              aria-label={String(label)}
              disabled={Boolean(disabled)}
              onClick={action as () => void}
            >
              <Glyph size={19} />
            </button>
          );
        })}
      </footer>
    </div>
  );
}
