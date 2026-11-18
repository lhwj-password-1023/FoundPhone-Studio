import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { createRoot } from "react-dom/client";
import { Phone } from "../Phone";
import { validateWork, type Work } from "../schema";
import "../styles.css";
import "./player.css";
function StoryPlayer() {
  const [work, setWork] = useState<Work | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    fetch(
      new URLSearchParams(location.search).get("preview") === "test"
        ? "./test-work.json"
        : new URLSearchParams(location.search).get("template") === "blank"
          ? "./blank-work.json"
          : "./work.json?release=11",
      { signal: abort.signal, cache: "no-store" },
    )
      .then((r) => {
        if (!r.ok) throw Error("缺少作品文件，请运行 npm run story:build");
        return r.json();
      })
      .then((x) => {
        const w = validateWork(x);
        document.title =
          w.title === "捡手机" ? "捡手机" : w.title + " · 捡手机";
        setWork(w);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(String(e));
      });
    return () => abort.abort();
  }, []);
  const [updated,setUpdated]=useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const sw=navigator.serviceWorker;
    let controlled=!!sw.controller;
    const changed=()=>{if(controlled)setUpdated(true);controlled=true;};
    const check=()=>{if(document.visibilityState==="visible")void sw.getRegistration().then(r=>r?.update()).catch(()=>{});};
    sw.addEventListener("controllerchange",changed);
    document.addEventListener("visibilitychange",check);
    const timer=window.setInterval(check,60000);
    return ()=>{sw.removeEventListener("controllerchange",changed);document.removeEventListener("visibilitychange",check);clearInterval(timer);};
  },[]);
  return (
    <main className="story-runtime">
      {updated && <button className="runtime-update" onClick={()=>location.reload()}>新版已就绪 · 点击刷新</button>}
      {work ? (
        <MotionConfig reducedMotion="user">
          <Phone work={work} />
        </MotionConfig>
      ) : (
        <p role="status">{error || "正在打开手机…"}</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<StoryPlayer />);
