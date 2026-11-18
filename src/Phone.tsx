import { unlockBonus, unlockBonusInRuntime, type BonusId, type BonusUnlocks } from "./bonus";
import { ActorProvider } from "./ActorContext";
import { Mic } from "lucide-react";
import { makeItem as makeCallRecord } from "./schema";
async function captureVisibleApp(): Promise<string> {
  const source = document.querySelector<HTMLElement>(".app-screen");
  if (!source) return "";
  const box = source.getBoundingClientRect();
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source,...source.querySelectorAll<HTMLElement>("*")];
  const copies = [clone,...clone.querySelectorAll<HTMLElement>("*")];
  originals.forEach((element,index) => {
    const style = getComputedStyle(element);
    for (const property of style) copies[index].style.setProperty(property,style.getPropertyValue(property));
  });
  clone.style.transform="none";clone.style.opacity="1";clone.style.position="relative";clone.style.left="0";clone.style.top="0";
  clone.setAttribute("xmlns","http://www.w3.org/1999/xhtml");
  const width=Math.max(1,Math.round(box.width)), height=Math.max(1,Math.round(box.height));
  const xml=new XMLSerializer().serializeToString(clone);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`;
  const picture=new Image();
  picture.src="data:image/svg+xml;base64,"+btoa(unescape(encodeURIComponent(svg)));
  await picture.decode();
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const context=canvas.getContext("2d");if(!context)return "";
  context.drawImage(picture,0,0);
  return canvas.toDataURL("image/png");
}
import { Transcript } from "./skins/Transcript";
import { StoryThread } from "./skins/StoryThread";
import { reconcileMessageOrder } from "./messageOrder";
import { advanceSceneFour, shareSceneFourNews, addSceneFourMemory } from "./story-engine/scene-four-runtime";
import { advanceFinale, reconnectTo2010, makeStoryTransfer, takeFinalPhoto } from "./story-engine/finale-runtime";
import finalSelfie from "./assets/finale-selfie.jpeg?inline";
import { routeForNotice } from "./story-engine/timeline";
import { notificationTarget, recordNavigation } from "./notificationNavigation";
import { guidanceAnswer, pendingGuidance } from "./story-engine/guidance";
import { StatusGlyph } from "./ios/StatusGlyph";
import { SocialDetail, socialDetailApps } from "./skins/SocialDetails";
import { NativeCalculator } from "./ios/Calculator";
import { HomeLauncher } from "./launcher/HomeLauncher";
import { useDeviceLayout } from "./launcher/layout";
import "./launcher/launcher.css";
import { NativeDetail, nativeDetailApps } from "./ios/Details";
import "./ios/details.css";
import {
  SystemNotifications,
  notificationContent,
} from "./SystemNotifications";
import {
  readLauncherOrigin,
  AppWindow,
  screenOrigin,
} from "./vendor/ios-web/Launcher";
import {
  DeviceLock,
  ControlCenter,
  DeviceKeyboard,
  KeyboardContext,
  NativeSettings,
} from "./DeviceSystem";
import { AppArtwork, hasNativeArtwork } from "./AppArtwork";
import { getFields } from "./fields";
import { catalogSkins } from "./skins/catalog";
import "./skins/skins.css";
import "./ios18.css";
import "./device-system.css";
import "./ios/tokens.css";
import "./ios/reference.css";
import "./ios/status-bar.css";
import { WeChatSkin, WhatsAppSkin } from "./AppSkins";
import { RichText } from "./RichText";
import {
  useEffect,
  useState,
  useRef,
  Suspense,
  type CSSProperties,
} from "react";
import { AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Plus,
  Search,
  LockKeyhole,
  Heart,
  MessageCircle,
  MoreHorizontal,
  ArrowUp,
  Folder,
  Phone as PhoneIcon,
} from "lucide-react";
import { getApp, type AppPlugin } from "./registry";
import {
  initialRuntime,
  safeMedia,
  type Work,
  type Item,
  type Runtime,
  type UiValue,
} from "./schema";
import { dispatch, choose, visible, advance } from "./engine";
import { db } from "./persistence";
export function AppIcon({
  id,
  name,
  badge = 0,
  small = false,
  custom = "",
  date,
  time,
}: {
  id: string;
  name?: string;
  badge?: number;
  small?: boolean;
  custom?: string;
  date?: string;
  time?: string;
}) {
  const a = getApp(id);
  const Icon = a.icon;
  return (
    <span className={`app-icon-wrap ${small ? "small" : ""}`}>
      <span className="app-icon" style={{ background: a.color }}>
        {custom ? (
          safeMedia(custom) ? (
            <img src={safeMedia(custom)} alt="自定义图标" />
          ) : (
            <span>{custom.slice(0, 2)}</span>
          )
        ) : id === "gpt" ? (
          <img
            src="./chatgpt.png"
            alt=""
            style={{ width: "100%", height: "100%", background: "white" }}
          />
        ) : hasNativeArtwork(id) ? (
          <AppArtwork id={id} date={date} time={time} />
        ) : (
          <Icon size={small ? 21 : 28} strokeWidth={1.65} />
        )}
      </span>
      {badge > 0 && <b className="story-badge">{badge}</b>}
      {name && <span className="app-name">{name}</span>}
    </span>
  );
}
type PhoneProps = Omit<Parameters<typeof PhoneRuntime>[0], "deviceLayout">;
export function Phone(props: PhoneProps) {
  const deviceLayout = useDeviceLayout(props.work, props.creator);
  return (
    <PhoneRuntime
      {...props}
      work={deviceLayout.work}
      deviceLayout={deviceLayout}
    />
  );
}
function PhoneRuntime({
  deviceLayout,
  work,
  creator = false,
  onEdit,
  onAdd,
  onSettings,
  onOpen,
  runtime: external,
  onRuntime,
}: {
  deviceLayout: ReturnType<typeof useDeviceLayout>;
  work: Work;
  creator?: boolean;
  onEdit?: (app: string, item: Item) => void;
  onAdd?: (app: string) => void;
  onSettings?: () => void;
  onOpen?: (app: string) => void;
  runtime?: Runtime;
  onRuntime?: (s: Runtime) => void;
}) {
  const [app, setApp] = useState("");
  const assistantReturn = useRef("");
  const [homeRequest, setHomeRequest] = useState(0);
  const [locked, setLocked] = useState(!creator);
  const [pinOpen, setPinOpen] = useState(false);
  const [quickCamera, setQuickCamera] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const appSnapshots = useRef(new Map<string, HTMLElement>());
  const [banner, setBanner] = useState("");
  const [systemNotice, setSystemNotice] = useState("");
  const lastNotices = useRef<string[]>([]);
  const [contextApp, setContextApp] = useState("");
  const [deviceScale, setDeviceScale] = useState(0.84);
  const shell = useRef<HTMLDivElement>(null);
  const gesture = useRef({ x: 0, y: 0, time: 0, zone: "" });
  const [launchOrigin, setLaunchOrigin] = useState(screenOrigin);

  const pendingNotice = useRef("");
  const beginUnlock = () => {
    setPinError("");
    setQuickCamera(false);
    if (work.phone.passcode) setPinOpen(true);
    else unlock();
  };
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const gestureConsumed = useRef(false);
  const [pinError, setPinError] = useState("");
  const [folder, setFolder] = useState("");
  const [panel, setPanel] = useState("");
  const [own, setOwn] = useState(() => initialRuntime(work));
  const [ready, setReady] = useState(creator || !!external);
  const freshTest =
    new URLSearchParams(location.search).get("play") === "fresh";
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    const fit = () => {
      setDeviceScale(
        Math.max(
          0.4,
          Math.min(
            1,
            (el.parentElement!.clientWidth - 24) / 407,
            (window.innerHeight - (creator ? 170 : external ? 150 : 40)) / 866,
          ),
        ),
      );
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement!);
    window.addEventListener("resize", fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [creator, ready]);
  const s = external ?? own;
  const runtimeRef = useRef(s);
  runtimeRef.current = s;
  const update = (next: Runtime) => {
    next = reconcileMessageOrder(work, next);
    runtimeRef.current = next;
    setOwn(next);
    onRuntime?.(next);
  };
  useEffect(() => {
    let active = true;
    if (creator || external) return;
    if (freshTest) {
      setOwn(reconcileMessageOrder(work, dispatch(work, initialRuntime(work), "start")));
      setReady(true);
      return;
    }
    void db.saves
      .get(work.id)
      .then((saved) => {
        if (!active) return;
        if (saved && saved.state.revision === work.updatedAt)
          setOwn(reconcileMessageOrder(work, saved.state));
        else if (
          saved &&
          work.nodes.some(
            (node) =>
              node.event === "resumeRevision" &&
              node.target === String(saved.state.revision),
          )
        ) {
          const savedBonus = (saved.state.ui?.bonusUnlocks || {}) as BonusUnlocks;
          const migratedBonus = saved.state.variables.storyFinalComplete === true
            ? unlockBonus(savedBonus, 'cinema', `${saved.state.date || work.phone.date} ${saved.state.time}`)
            : savedBonus;
          const restored = {
            ...saved.state,
            revision: work.updatedAt,
            variables: { ...work.variables, ...saved.state.variables },
            ui: { ...saved.state.ui, bonusUnlocks: migratedBonus },
          };
          setOwn(reconcileMessageOrder(work,
            dispatch(
              work,
              restored,
              "resumeRevision",
              String(saved.state.revision),
            ),
          ));
        } else {
          setOwn(reconcileMessageOrder(work, dispatch(work, initialRuntime(work), "start")));
          if (saved) setLoadError("作品已更新，已开始新的进度。");
        }
        setReady(true);
      })
      .catch(() => {
        setOwn(reconcileMessageOrder(work, dispatch(work, initialRuntime(work), "start")));
        setLoadError("无法读取本地存档。本次仍可游玩。");
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [work.id, work.updatedAt, creator, external, freshTest]);
  useEffect(() => {
    if (!freshTest && !creator && !external && ready)
      void db.saves
        .put({ id: work.id, state: own })
        .catch(() => setLoadError("存档失败，请检查浏览器存储权限。"));
  }, [own, creator, work.id, external, ready, freshTest]);
  useEffect(() => {
    if (creator || !ready) return;
    const interval = setInterval(() => {
      const previous = runtimeRef.current;
      const next = advance(work, previous, 1000);
      runtimeRef.current = next;
      const changed =
        next.time !== previous.time ||
        next.trace.join() !== previous.trace.join() ||
        (next.scheduled?.length ?? 0) !== (previous.scheduled?.length ?? 0) ||
        (next.scheduled?.length ?? 0) > 0 ||
        Math.floor((next.elapsedMs ?? 0) / 5000) !==
          Math.floor((previous.elapsedMs ?? 0) / 5000);
      if (changed) update(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [creator, ready, work.id, work.updatedAt]);
  const event = (event: string, target: string) => {
    if (creator) return;
    let current = runtimeRef.current;
    const bonus: Record<string, BonusId> = {
      'openApp:weather': 'raining-stars', 'openApp:timemachine': 'back-door',
      'openApp:time-machine': 'back-door', 'settings:general': 'back-then',
      'settings:airplane-on': 'astronaut', 'read:lyric-draft': 'just-a-little',
      'read:bonus-as-we-are-recording': 'as-we-are', 'read:x-bonus-coffee': 'this-that', 'bonusPhoto:oldest': 'photobook',
    };
    const bonusId = bonus[event + ':' + target];
    if (bonusId) {
      const next = unlockBonusInRuntime(current, work, bonusId);
      if (next !== current) { update(next); current = next; }
    }
    const currentAfterBonus = runtimeRef.current;
    if (event === 'settings' && (target === 'airplane-on' || target === 'airplane-off')) {
      update({ ...currentAfterBonus, ui: { ...currentAfterBonus.ui, settings: { ...currentAfterBonus.ui?.settings, airplane: target === 'airplane-on' } } });
      return;
    }
    if (event === "saveContact" && target === "s4-lee" && current.variables.sceneThreeStage13 === true && current.variables.sceneFourStage1 !== true) {
      const contact = makeCallRecord({ id: "s4-lee-contact", title: "旻浩哥", body: "iMessage 联系人", sender: "旻浩哥", time: `${current.date || work.phone.date} ${current.time}`, meta: { phone: "2017 年的陌生号码", timeline: "2017" } });
      const next = { ...current, ui: { ...current.ui, messages: { ...current.ui?.messages, contactAlias: "旻浩哥" } }, messages: { ...current.messages, contacts: [...(current.messages.contacts || []), contact] } };
      update(dispatch(work, next, event, target));
      return;
    }
    if (event === "timeAdvance") { update(advanceSceneFour(work, current, target)); return; }
    if (event === "storyTimeAdvance") { update(advanceFinale(work, current, target)); return; }
    if (event === "storyTransfer") { update(makeStoryTransfer(work, current, target)); return; }
    if (event === "storyShutter") {
      const completed = takeFinalPhoto(work, current, finalSelfie);
      update(completed.variables.storyFinalComplete === true
        ? unlockBonusInRuntime(completed, work, 'cinema') : completed);
      return;
    }
    if (event === "storyReconnect") { update(reconnectTo2010(work, current)); return; }
    if (event === "writeNote" && target === "s4-note" && current.variables.sceneFourStage8 === true) {
      const stamp = `${current.date || work.phone.date} ${current.time}`;
      update(dispatch(work, { ...current, ui: { ...current.ui, notes: { ...current.ui?.notes, ["modifiedAt:" + target]: stamp } } }, event, target));
      return;
    }
    if (event === "shareNews") {
      const next = shareSceneFourNews(work, current, target);
      if (next === current) return;
      update(next);
      open("messages");
      update({ ...runtimeRef.current, ui: { ...runtimeRef.current.ui, messages: { ...runtimeRef.current.ui?.messages, thread: "陌生号码" } } });
      return;
    }
    if (event === "read" && target === "s4-memory-c" && current.variables.sceneFourStage13 === true) {
      update(dispatch(work, addSceneFourMemory(work, current), event, target));
      return;
    }
    if (event === "read" && target.startsWith("s4-recontact-")) {
      const sent = work.data.messages?.find((item) => item.id === target)?.meta.sentAt;
      if (sent) { update(dispatch(work, { ...current, peerDate: sent.slice(0, 10), peerTime: sent.slice(11, 16) }, event, target)); return; }
    }
    if (event === "storyScreenshot" && target === "s3-lee-phone" && current.variables.s3FindSeen === true && !current.messages.photos?.some((i) => i.id === "s3-find-screenshot")) {
      const canvas = document.createElement("canvas");
      canvas.width = 390; canvas.height = 780;
      const c = canvas.getContext("2d");
      if (!c) return;
      c.fillStyle = "#f4f5f0"; c.fillRect(0,0,390,780);
      c.fillStyle = "#e4e5d8"; c.fillRect(0,75,390,400);
      c.strokeStyle = "#fff"; c.lineWidth = 15;
      for (const n of [125,210,320,430]) { c.beginPath(); c.moveTo(0,n); c.lineTo(390,n); c.stroke(); }
      for (const n of [55,155,260,350]) { c.beginPath(); c.moveTo(n,75); c.lineTo(n,475); c.stroke(); }
      c.fillStyle = "#16202b"; c.font = "bold 20px sans-serif"; c.fillText("查找",20,47);
      c.fillStyle = "#3c82e6"; c.beginPath(); c.arc(280,220,14,0,Math.PI*2); c.fill();
      c.fillStyle = "#fff"; c.font = "18px sans-serif"; c.fillText("●",271,227);
      c.fillStyle = "#fff"; c.fillRect(0,475,390,305);
      c.fillStyle = "#16202b"; c.font = "bold 24px sans-serif"; c.fillText("李旻浩的 iPhone",22,526);
      c.font = "17px sans-serif"; c.fillText("在线 · 刚刚",22,559); c.fillText("转角咖啡",22,604);
      c.fillStyle = "#3975d4"; c.fillText("路线",22,656);
      void captureVisibleApp().catch(()=>"").then((captured)=>{
        const latest = runtimeRef.current;
        if (latest.messages.photos?.some((i) => i.id === "s3-find-screenshot")) return;
        const shot = makeCallRecord({id:"s3-find-screenshot",title:"查找截屏",kind:"image",folder:"截屏",body:"李旻浩的 iPhone · 转角咖啡",time:(current.date || work.phone.date)+" "+current.time,sender:work.phone.owner,media:captured || canvas.toDataURL("image/png"),meta:{capturedAt:(current.date || work.phone.date)+" "+current.time,source:"s3-lee-phone"}});
        update(dispatch(work,{...latest,messages:{...latest.messages,photos:[shot,...(latest.messages.photos || [])]}},event,target));
      });
      return;
    }
    if (event === "storyPost" && target === "puppy_0922x" && current.variables.sceneThreeStage9 === true && !current.messages.twitter?.some((i) => i.id === "s3-x-post")) {
      const shot = current.messages.photos?.find((i) => i.id === "s3-find-screenshot");
      if (!shot) return;
      const post = makeCallRecord({id:"s3-x-post",title:"私人小号动态",kind:"post",folder:"动态",body:"你真的回来了吗，可不可以告诉我你在哪里",time:(current.date || work.phone.date)+" "+current.time,sender:"puppy_0922x",media:shot.media,meta:{handle:"puppy_0922x",userId:"x-user-puppy",screenshotId:shot.id}});
      update(dispatch(work,{...current,messages:{...current.messages,twitter:[post,...(current.messages.twitter || [])]}},event,target));
      return;
    }
    update(dispatch(work, currentAfterBonus, event, target));
  };
  const endCall = () => {
    const cur = runtimeRef.current,
      call = cur.incomingCall;
    if (!call) return;
    const missed = call.status === "ringing";
    const source = work.data.phone?.find((i) => i.id === call.target);
    const spoken = source?.meta.transcript?.split("\n");
    const selected = cur.ui?.phone?.["transcript:" + call.target + ":choice"];
    if (spoken && typeof selected === "string" && source?.meta.choices) {
      const response = JSON.parse(source.meta.choices)[selected];
      if (typeof response === "string")
        spoken[Number(source.meta.choiceAfter) + 1] = response;
    }
    const log = makeCallRecord({
      ...source,
      id: "call-log-" + (cur.messages.phone?.length || 0),
      title: call.caller,
      hidden: false,
      read: !missed,
      time: (cur.date || work.phone.date) + " " + cur.time,
      folder: missed ? "未接" : "已接",
      meta: {
        ...(missed ? {} : source?.meta),
        ...(!missed && spoken ? { transcript: spoken.join("\n") } : {}),
        status: missed ? "未接" : "已接",
      },
    });
    update(
      dispatch(
        work,
        {
          ...cur,
          incomingCall: null,
          notifications: cur.notifications.filter(
            (n) => n !== call.caller + " 来电",
          ),
          messages: {
            ...cur.messages,
            phone: [log, ...(cur.messages.phone || [])],
          },
        },
        missed ? "callDeclined" : "callEnded",
        call.target || call.caller,
      ),
    );
  };
  const captureApp = () => {
    if (!app) return;
    const current = shell.current?.querySelector<HTMLElement>(".app-screen");
    if (!current) return;
    const snapshot = current.cloneNode(true) as HTMLElement;
    snapshot.style.transform = "none";
    snapshot.style.opacity = "1";
    snapshot.style.filter = "none";
    snapshot.style.borderRadius = "0";
    snapshot.querySelectorAll("audio").forEach((el) => el.remove());
    snapshot.querySelectorAll("video").forEach((el) => {
      el.removeAttribute("autoplay");
      el.removeAttribute("src");
    });
    snapshot.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    appSnapshots.current.set(app, snapshot);
    for (const id of appSnapshots.current.keys())
      if (!recent.includes(id) && id !== app) appSnapshots.current.delete(id);
  };
  const open = (id: string) => {
    if (!work.apps.some((a) => a.id === id && a.installed)) return;
    if (id !== app) {
      const current = runtimeRef.current;
      const appUi = current.ui?.[id] || {};
      const resetAnchors = Object.fromEntries(Object.keys(appUi).filter((key) => key.startsWith("anchor:")).map((key) => [key, "__bottom__"]));
      update({ ...current, ui: { ...current.ui, [id]: { ...appUi, ...resetAnchors, ...(id === "health" ? { tab: "摘要" } : {}), thread: "", detail: "", xTab: "首页", xDetail: "", xProfile: "", xDm: "", mymyTab: "聊天", browserTabs: "", browserActive: 0, album: "", photoGroup: "" } } });
    }
    setApp(id);
    setKeyboard(false);
    setRecent((v) => [id, ...v.filter((a) => a !== id)].slice(0, 8));
    setFolder("");
    setPanel("");
    onOpen?.(id);
    event("openApp", id);
  };
  const openAssistant = () => {
    assistantReturn.current = app;
    open("gpt");
  };
  const closeAssistant = () => {
    const previous = assistantReturn.current;
    assistantReturn.current = "";
    if (previous && previous !== "gpt") open(previous);
    else home();
  };
  const installedApps = work.apps.filter((a) => a.installed);
  const apps = installedApps.filter((a) => a.visible);
  const goToRecord = (appId: string, item?: Item) => {
    open(appId);
    if (!item || !visible(item, runtimeRef.current)) return;
    const current = runtimeRef.current;
    const chat = appId === "messages" || appId === "kakao";
    const route = recordNavigation(appId, item, current.ui?.[appId]);
    const next = {
      ...current,
      ui: { ...current.ui, [appId]: { ...current.ui?.[appId], ...route } },
    };
    update(
      chat || item.password
        ? next
        : dispatch(work, next, "read", item.id),
    );
  };
  const followNotice = (notice: string) => {
    const bonusRoute = runtimeRef.current.notificationRoutes?.[notice];
    if (bonusRoute?.notificationType === 'bonus' && bonusRoute.appId === 'spotify') {
      open('spotify');
      const current = runtimeRef.current;
      update({ ...current,
        ui: { ...current.ui, spotify: { ...current.ui?.spotify, bonusFocus: bonusRoute.targetId } },
        notifications: current.notifications.filter((entry) => entry !== notice),
        notificationRoutes: { ...current.notificationRoutes, [notice]: { ...bonusRoute, readStatus: 'read' } },
      });
      return;
    }
    if (notice === "时空通信已修复，收到新的消息。") {
      open("messages");
      const current = runtimeRef.current;
      update({ ...current, ui: { ...current.ui, messages: { ...current.ui?.messages, thread: "陌生号码", detail: "", ["anchor:陌生号码"]: "__bottom__", routeVisit: Number(current.ui?.messages?.routeVisit || 0) + 1 } } });
      const routed = runtimeRef.current;
      update({ ...routed, notifications: routed.notifications.filter((n) => n !== notice) });
      return;
    }
    const route = notificationTarget(notice, work, runtimeRef.current);
    if (route) goToRecord(route.app, route.item);
    else {
      const appId = runtimeRef.current.notificationRoutes?.[notice]?.appId;
      if (appId && work.apps.some((a) => a.id === appId)) open(appId);
      else setSystemNotice(notice);
    }
    const current = runtimeRef.current;
    const entry = current.notificationRoutes?.[notice];
    update({ ...current, notifications: current.notifications.filter((n) => n !== notice), notificationRoutes: entry ? { ...current.notificationRoutes, [notice]: { ...entry, readStatus: "read" } } : current.notificationRoutes });
  };
  const openNotice = (notice: string) => {
    setPanel("");
    setBanner("");
    if (locked) {
      pendingNotice.current = notice;
      beginUnlock();
    } else followNotice(notice);
  };
  const home = () => {
    setApp("");
    event("home", "");
  };
  const restart = () => {
    update(dispatch(work, initialRuntime(work), "start"));
    appSnapshots.current.clear();
    setRecent([]);
    pendingNotice.current = "";
    setBanner("");
    setPanel("");
    setApp("");
    setLocked(true);
  };
  const unlock = (pin = "") => {
    if (!work.phone.passcode || pin === work.phone.passcode) {
      setLocked(false);
      setPinOpen(false);
      event("password", pin);
      event("unlock", "");
      if (pendingNotice.current) {
        followNotice(pendingNotice.current);
        pendingNotice.current = "";
      }
    } else {
      setPinError("密码不正确");
      setPinOpen(true);
    }
  };
  useEffect(() => {
    if (app && !work.apps.some((a) => a.id === app && a.installed)) setApp("");
  }, [app, work.apps]);
  const displayTime = creator ? work.phone.time : s.time || work.phone.time;
  const plugin = getApp(app);
  useEffect(() => {
    const latest = s.notifications.at(-1);
    const added = latest && !lastNotices.current.includes(latest);
    lastNotices.current = s.notifications;
    if (!locked && added && work.phone.notifications) setBanner(latest);
  }, [s.notifications, locked, work.phone.notifications]);
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(""), 4500);
    return () => clearTimeout(timer);
  }, [banner]);
  const dismissNotice = (index: number) =>
    update({
      ...runtimeRef.current,
      notifications: runtimeRef.current.notifications.filter(
        (_, i) => i !== index,
      ),
    });
  if (!ready) return <div className="phone-loading">正在恢复进度…</div>;
  return (
    <div
      ref={shell}
      style={
        {
          "--phone-scale": deviceScale,
          "--story-wallpaper": work.phone.wallpaper.startsWith("photo-")
            ? 'url("' +
              safeMedia(
                work.data.photos?.find(
                  (i) => i.id === work.phone.wallpaper.slice(6) && !i.hidden,
                )?.media || "",
              ) +
              '")'
            : undefined,
        } as CSSProperties
      }
      className={`phone-shell ios18 ${(s.ui?.settings?.appearance || work.phone.theme) === "dark" ? "dark-phone" : ""}`}
    >
      {work.timeline && !locked && (
        <button
          className="story-lock-button"
          aria-label="锁定手机"
          onClick={() => {
            setLocked(true);
            setBanner("");
            setPanel("");
          }}
        />
      )}
      <KeyboardContext.Provider value={setKeyboard}>
        <div
          className={`phone-screen wallpaper-${work.phone.wallpaper} ${locked ? "is-locked" : ""} ${app ? "in-app" : ""} ${keyboard ? "keyboard-open" : ""}`}
          data-app={app}
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            gestureConsumed.current = false;
            const button = (e.target as HTMLElement).closest<HTMLElement>(
              "[data-app-id]",
            );
            if (button) {
              pressTimer.current = setTimeout(() => {
                gestureConsumed.current = true;
                setContextApp(button.dataset.appId || "");
              }, 550);
            }
            const box = e.currentTarget.getBoundingClientRect(),
              x = (e.clientX - box.left) / deviceScale,
              y = (e.clientY - box.top) / deviceScale;
            gesture.current = {
              x,
              y,
              time: Date.now(),
              zone: y < 58 ? "top" : y > 818 ? "bottom" : locked ? "lock" : "",
            };
          }}
          onPointerMove={(e) => {
            if (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5)
              clearTimeout(pressTimer.current);
          }}
          onPointerCancel={() => clearTimeout(pressTimer.current)}
          onPointerUp={(e) => {
            clearTimeout(pressTimer.current);
            const box = e.currentTarget.getBoundingClientRect(),
              y = (e.clientY - box.top) / deviceScale,
              g = gesture.current;
            const dy = y - g.y;
            if (g.zone === "top" && dy > 65)
              setPanel(g.x > 230 ? "control" : "notification");
            else if ((g.zone === "bottom" || g.zone === "lock") && dy < -55) {
              gestureConsumed.current = true;
              if (!locked) captureApp();
              setKeyboard(false);
              if (panel) {
                setPanel("");
              } else if (locked) {
                beginUnlock();
              } else if (g.zone === "bottom" && Date.now() - g.time > 450) {
                captureApp();
                setPanel("switcher");
              } else {
                home();
                setPanel("");
                setFolder("");
              }
            }
          }}
          onClickCapture={(e) => {
            const target = (e.target as HTMLElement).closest(
              ".home-app-grid button,.dock button",
            );
            if (target) {
              setLaunchOrigin(
                readLauncherOrigin(target as HTMLElement, e.currentTarget),
              );
            }
          }}
        >
          <div className="wallpaper-orb orb-one" />
          <div className="wallpaper-orb orb-two" />
          <div className="status-bar">
            <button
              onClick={() =>
                setPanel(panel === "notification" ? "" : "notification")
              }
              className="status-time"
              aria-label="通知中心"
            >
              {displayTime}
              <StatusGlyph kind="silent" />
            </button>
            <div className="dynamic-island" />
            <button
              className="signals"
              onClick={() => setPanel(panel === "control" ? "" : "control")}
              aria-label="控制中心"
            >
              {[27,28].includes(Number(s.variables.finalPhase)) ? <small>无服务</small> : <><StatusGlyph kind="cellular" /><StatusGlyph kind="wifi" /></>}
              <span
                className={`ios-battery${work.phone.battery <= 20 ? " low-battery" : ""}`}
              >
                <span style={{ width: `${work.phone.battery}%` }} />
                <b>{work.phone.battery}</b>
              </span>
            </button>
          </div>
          <AnimatePresence mode="wait">
            {locked && !(quickCamera && app === "camera") ? (
              <DeviceLock
                work={
                  s.date
                    ? { ...work, phone: { ...work.phone, date: s.date } }
                    : work
                }
                time={displayTime}
                notices={s.notifications}
                routes={s.notificationRoutes}
                onDismiss={dismissNotice}
                pinOpen={pinOpen}
                setPinOpen={setPinOpen}
                error={pinError}
                onOpenNotice={openNotice}
                onUnlock={unlock}
                onLight={() => setPanel("light")}
                onCamera={() => {
                  setQuickCamera(true);
                  open("camera");
                }}
              />
            ) : app && app !== "appstore" ? (
              <AppWindow
                key={app}
                className={`app-screen engine-${plugin.engine} skin-${app}`}
                creator={creator}
                origin={launchOrigin}
              >
                <AppContent
                  app={plugin}
                  name={
                    work.apps.find((a) => a.id === app)?.name ?? plugin.name
                  }
                  items={[
                    ...(work.data[app] ?? []),
                    ...(s.messages[app] ?? []),
                  ]}
                  creator={creator}
                  state={s}
                  onChoose={(id) =>
                    update(choose(work, runtimeRef.current, id))
                  }
                  goToRecord={(id) => {
                    const found = routeForNotice("@item/" + id, work);
                    if (found) goToRecord(found.app, found.item);
                  }}
                  onEvent={event}
                  onRestart={restart}
                  onRead={(id) => event("read", id)}
                  onEdit={(item) => onEdit?.(app, item)}
                  onAdd={() => onAdd?.(app)}
                  onBack={app === "gpt" ? closeAssistant : home}
                  onAssistant={openAssistant}
                  onSettings={onSettings}
                  onUi={(key, value) => {
                    const current = runtimeRef.current;
                    update(
                      dispatch(
                        work,
                        {
                          ...current,
                          ui: {
                            ...current.ui,
                            [app]: { ...current.ui?.[app], [key]: value },
                          },
                        },
                        "variable",
                        `ui:${app}:${key}`,
                      ),
                    );
                  }}
                  work={work}
                />
              </AppWindow>
            ) : (
              <HomeLauncher
                key={
                  "home-" + homeRequest + (app === "appstore" ? "store" : "")
                }
                storeOpen={app === "appstore"}
                closeStore={home}
                work={
                  s.date && s.date !== work.phone.date
                    ? { ...work, phone: { ...work.phone, date: s.date } }
                    : work
                }
                layout={deviceLayout.layout}
                change={deviceLayout.change}
                importLayout={deviceLayout.importLayout}
                error={deviceLayout.error}
                open={open}
                onFolder={setFolder}
                search={() => setPanel("search")}
                time={displayTime}
                icon={(a, small) => (
                  <AppIcon
                    key={a.id}
                    id={a.id}
                    name={small ? undefined : a.name}
                    small={small}
                    badge={
                      work.timeline &&
                      ["messages", "kakao", "twitter"].includes(a.id)
                        ? (work.data[a.id] || []).filter(
                            (i) =>
                              (a.id !== "twitter" ||
                                ["通知", "私信"].includes(i.folder)) &&
                              !i.outgoing &&
                              !i.read &&
                              !s.read.includes(i.id) &&
                              visible(i, s),
                          ).length
                        : 0
                    }
                    custom={a.icon}
                    date={s.date || work.phone.date}
                    time={s.time}
                  />
                )}
                clearApp={(id) =>
                  update({
                    ...runtimeRef.current,
                    messages: Object.fromEntries(
                      Object.entries(runtimeRef.current.messages).filter(
                        ([app]) => app !== id,
                      ),
                    ),
                  })
                }
              />
            )}
          </AnimatePresence>
          {folder && (
            <div className="folder-overlay" onClick={() => setFolder("")}>
              <h2>{folder}</h2>
              <div className="folder-apps" onClick={(e) => e.stopPropagation()}>
                {apps
                  .filter((a) => a.folder === folder)
                  .map((a) => (
                    <button key={a.id} onClick={() => open(a.id)}>
                      <AppIcon id={a.id} name={a.name} custom={a.icon} />
                    </button>
                  ))}
              </div>
              <button className="glass-btn" onClick={() => setFolder("")}>
                关闭文件夹
              </button>
            </div>
          )}
          {panel === "control" && (
            <ControlCenter
              battery={work.phone.battery}
              network={work.phone.network}
              close={() => setPanel("")}
            />
          )}
          {panel && panel !== "control" && panel !== "switcher" && (
            <div
              className={`system-panel ${panel === "light" ? "flash-on" : ""}`}
            >
              <button className="panel-close" onClick={() => setPanel("")}>
                关闭 <ChevronLeft size={14} />
              </button>
              {panel === "notification" ? (
                <>
                  <h2>通知中心</h2>
                  {work.phone.notifications && s.notifications.length ? (
                    <SystemNotifications
                      notices={s.notifications}
                      routes={s.notificationRoutes}
                      apps={work.apps}
                      work={work}
                      onOpen={openNotice}
                      onDismiss={dismissNotice}
                    />
                  ) : (
                    <p>没有新通知</p>
                  )}
                </>
              ) : panel === "search" ? (
                <>
                  <h2>搜索 App</h2>
                  <AppSearch apps={installedApps} open={open} />
                </>
              ) : (
                <h2>手电筒已打开</h2>
              )}
            </div>
          )}
          {!creator && !work.timeline && s.choices.length > 0 && !locked && (
            <div className="story-overlay">
              <span className="eyebrow">故事来到一个岔路口</span>
              <h3>你会如何选择？</h3>
              {s.choices.map((c) => (
                <button
                  key={c.target}
                  onClick={() => update(choose(work, s, c.target))}
                >
                  {c.label}
                  <ArrowUp size={15} />
                </button>
              ))}
            </div>
          )}
          {!creator && !work.timeline && s.endings.length > 0 && !locked && (
            <div className="story-overlay ending">
              <span className="eyebrow">ENDING · {s.endings.length}</span>
              <h2>故事在这里停泊。</h2>
              <p>{s.endings[s.endings.length - 1]}</p>
              <button
                onClick={() => {
                  update(dispatch(work, initialRuntime(work), "start"));
                  setApp("");
                  setLocked(true);
                }}
              >
                重新开始
              </button>
            </div>
          )}
          {!creator && s.incomingCall && (
            <div className="incoming-call-screen">
              <small>
                {s.incomingCall.status === "ringing" ? "来电" : "通话中"} ·
                作品内模拟
              </small>
              <div className="incoming-avatar">
                {s.incomingCall.caller.slice(0, 1)}
              </div>
              <h2>{s.incomingCall.caller}</h2>
              {s.incomingCall.status === "answered" &&
                (() => {
                  const record = work.data.phone?.find(
                    (i) => i.id === s.incomingCall?.target,
                  );
                  if (record?.meta.transcript)
                    return (
                      <Transcript
                        item={record}
                        mode="电话"
                        ui={s.ui?.phone}
                        onUi={(k, v) => {
                          const cur = runtimeRef.current;
                          update({
                            ...cur,
                            ui: {
                              ...cur.ui,
                              phone: { ...cur.ui?.phone, [k]: v },
                            },
                          });
                        }}
                        close={endCall}
                        live
                      />
                    );
                  return <p>{record?.body || "暂时没有通话内容"}</p>;
                })()}
              <div className="incoming-actions">
                <button className="decline-call" onClick={endCall}>
                  <PhoneIcon size={25} />
                  <span>
                    {s.incomingCall.status === "ringing" ? "拒接" : "挂断"}
                  </span>
                </button>
                {s.incomingCall.status === "ringing" && (
                  <button
                    className="accept-call"
                    onClick={() => {
                      const call = runtimeRef.current.incomingCall;
                      if (call)
                        update(
                          dispatch(
                            work,
                            {
                              ...runtimeRef.current,
                              incomingCall: { ...call, status: "answered" },
                            },
                            "callAnswered",
                            call.target || call.caller,
                          ),
                        );
                    }}
                  >
                    <PhoneIcon size={25} />
                    <span>接听</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {banner && s.notifications.includes(banner) && !locked && (
            <button
              className="device-banner"
              onClick={() => {
                setBanner("");
                openNotice(banner);
              }}
            >
              <AppIcon
                id={notificationContent(banner, work.apps, work, s.notificationRoutes).appId}
                small
              />
              <span>
                <strong>
                  {notificationContent(banner, work.apps, work, s.notificationRoutes).title}
                </strong>
                <span>{notificationContent(banner, work.apps, work, s.notificationRoutes).body}</span>
              </span>
            </button>
          )}
          {systemNotice && !locked && (
            <div className="story-blocked-backdrop" role="presentation" onClick={() => setSystemNotice("")}>
              <div className="story-blocked-dialog" role="dialog" aria-label="系统通知详情" onClick={(event) => event.stopPropagation()}>
                <h3>系统通知</h3>
                <p>{systemNotice}</p>
                <button onClick={() => setSystemNotice("")}>关闭</button>
              </div>
            </div>
          )}
          {panel === "switcher" && (
            <div className="device-switcher">
              <div className="switcher-cards">
                {recent
                  .filter(
                    (id) =>
                      installedApps.some((a) => a.id === id) &&
                      appSnapshots.current.has(id),
                  )
                  .map((id) => (
                    <button
                      className="recent-app-card"
                      key={id}
                      onClick={() => open(id)}
                    >
                      <span className="recent-app-label">
                        <AppIcon id={id} small />
                        <strong>
                          {work.apps.find((a) => a.id === id)?.name}
                        </strong>
                      </span>
                      <span className="recent-app-window">
                        <span
                          className="recent-app-snapshot"
                          aria-hidden="true"
                          inert
                          ref={(el) => {
                            const snapshot = appSnapshots.current.get(id);
                            if (el && snapshot)
                              el.replaceChildren(snapshot.cloneNode(true));
                          }}
                        />
                      </span>
                    </button>
                  ))}
              </div>
              <button className="switcher-done" onClick={() => setPanel("")}>
                完成
              </button>
            </div>
          )}
          {contextApp && (
            <div
              className="home-context-shade"
              onClick={() => setContextApp("")}
            >
              <div className="home-context-menu">
                <AppIcon id={contextApp} />
                <strong>
                  {work.apps.find((a) => a.id === contextApp)?.name}
                </strong>
                <button
                  onClick={() => {
                    open(contextApp);
                    setContextApp("");
                  }}
                >
                  打开 App
                </button>
                <button
                  onClick={() => {
                    setContextApp("");
                    setPanel("search");
                  }}
                >
                  在 App 库中查看
                </button>
                <button onClick={() => setContextApp("")}>取消</button>
              </div>
            </div>
          )}
          {keyboard && <DeviceKeyboard close={() => setKeyboard(false)} />}
          {loadError && (
            <button className="runtime-error" onClick={() => setLoadError("")}>
              {loadError}
            </button>
          )}
          <button
            className="home-indicator"
            aria-label="返回桌面"
            onClick={() => {
              if (gestureConsumed.current) return;
              if (locked) {
                beginUnlock();
                return;
              }
              captureApp();
              setHomeRequest((n) => n + 1);
              setKeyboard(false);
              home();
              setFolder("");
              setPanel("");
            }}
          />
          <div className="screen-dimmer" />
          <div className="hardware-reflection" />
        </div>
      </KeyboardContext.Provider>
    </div>
  );
}
function AppSearch({
  apps,
  open,
}: {
  apps: Work["apps"];
  open: (id: string) => void;
}) {
  const [q, set] = useState("");
  return (
    <>
      <input
        autoFocus
        value={q}
        placeholder="App 名称"
        onChange={(e) => set(e.target.value)}
      />
      {apps
        .filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
        .map((a) => (
          <button
            className="search-result"
            key={a.id}
            onClick={() => open(a.id)}
          >
            <AppIcon id={a.id} small />
            {a.name}
          </button>
        ))}
    </>
  );
}
function Media({ item }: { item: Item }) {
  const src = safeMedia(item.media);
  return src ? (
    item.kind === "audio" ? (
      <audio controls src={src} />
    ) : item.kind === "video" ? (
      <video controls playsInline src={src} />
    ) : (
      <img loading="lazy" src={src} alt={item.title} />
    )
  ) : (
    <div
      className={`original-art art-${item.id.includes("ticket") ? "ticket" : "rain"}`}
    >
      <span>
        {item.id.includes("ticket") ? "城南 / SOUTHBOUND" : "after the rain"}
      </span>
      <strong>{item.id.includes("ticket") ? "09 · 01" : "雨 后"}</strong>
      <small>
        {item.id.includes("ticket")
          ? "16:30 · 一张未完成的约定"
          : "a little moment of quiet"}
      </small>
    </div>
  );
}
function AppContent(props: Parameters<typeof AppContentView>[0]) {
  return (
    <ActorProvider
      work={props.work}
      state={props.state}
      app={props.app.id}
      choose={props.onChoose}
      onUi={props.onUi}
    >
      <AppContentView {...props} />
    </ActorProvider>
  );
}
function AppContentView({
  onChoose,
  onEvent,
  goToRecord,
  onRestart,
  app,
  name,
  items,
  creator,
  state,
  onRead,
  onEdit,
  onAdd,
  onBack,
  onAssistant,
  onSettings,
  onUi,
  work,
}: {
  onChoose: (id: string) => void;
  onEvent: (event: string, target: string) => void;
  goToRecord: (id: string) => void;
  onRestart: () => void;
  app: AppPlugin;
  name: string;
  items: Item[];
  creator: boolean;
  state: Runtime;
  onRead: (id: string) => void;
  onEdit: (item: Item) => void;
  onAdd: () => void;
  onBack: () => void;
  onAssistant?: () => void;
  onSettings?: () => void;
  onUi?: (key: string, value: UiValue) => void;
  work: Work;
}) {
  const archive = !!work.timeline && !creator;
  const ui = state.ui?.[app.id];
  if (archive && app.id === "notes") {
    items = items.map((item) =>
      item.meta.writtenFlag && state.variables[item.meta.writtenFlag] === true
        ? { ...item, body: item.meta.composeText, time: String(ui?.["modifiedAt:" + item.id] || item.time) }
        : item,
    );
  }
  const [localDetail, setLocalDetail] = useState<Item | null>(null);
  const [localThread, setLocalThread] = useState("");
  const detail = archive
    ? [...items, ...(app.id === "phone" ? [...(work.data.contacts || []), ...(state.messages.contacts || [])] : [])].find(
        (i) => i.id === ui?.detail && visible(i, state),
      ) || null
    : localDetail;
  const thread = archive ? String(ui?.thread || "") : localThread;
  const setThread = (v: string) =>
    archive ? onUi?.("thread", v) : setLocalThread(v);
  const setDetail = (v: Item | null) =>
    archive ? onUi?.("detail", v?.id || "") : setLocalDetail(v);
  const [tab, setTab] = useState(app.tabs[0]);
  const [q, setQ] = useState("");
  const [pw, setPw] = useState("");
  const [localUnlocks, setLocalUnlocks] = useState<string[]>([]);
  const unlocks =
    archive && Array.isArray(ui?.passwords) ? ui.passwords : localUnlocks;
  const setUnlocks = (ids: string[]) =>
    archive ? onUi?.("passwords", ids) : setLocalUnlocks(ids);
  const [pwError, setPwError] = useState("");
  const [likes, setLikes] = useState<string[]>([]);
  const shown = items
    .filter((i) => creator || visible(i, state))
    .filter((i) =>
      (i.title + i.body + i.sender).toLowerCase().includes(q.toLowerCase()),
    );
  const filtered =
    tab === "收藏"
      ? shown.filter((i) => i.favorite)
      : tab === app.tabs[0]
        ? shown
        : shown.filter((i) => i.folder === tab);
  const read = (i: Item) => {
    if (creator) {
      onEdit(i);
      return;
    }
    setPw("");
    setPwError("");
    setDetail(i);
    if (!i.password || unlocks.includes(i.id)) {
      onRead(i.id);
      if (app.id === "photos") {
        const photos = [...(work.data.photos || []), ...(state.messages.photos || [])].filter(photo => visible(photo, state));
        const oldest = [...photos].sort((a, b) => (a.meta.capturedAt || a.time).localeCompare(b.meta.capturedAt || b.time))[0];
        if (oldest?.id === i.id) onEvent("bonusPhoto", "oldest");
      }
    }
  };
  const chats = [...new Set(shown.map((i) => i.title))];
  const back = () => {
    if (detail) setDetail(null);
    else if (thread) setThread("");
    else onBack();
  };
  const Skin =
    app.id === "wechat"
      ? WeChatSkin
      : app.id === "whatsapp"
        ? WhatsAppSkin
        : (catalogSkins[app.id as keyof typeof catalogSkins] ?? null);
  const detailView = detail ? (
    <div className="phone-content detail-content">
      {detail.password && !creator && !unlocks.includes(detail.id) ? (
        <div className="locked-note">
          <LockKeyhole size={36} />
          <h3>这条内容已锁定</h3>
          <p>{detail.meta.hint}</p>
          <input
            type="password"
            placeholder="内容密码"
            value={pw}
            readOnly={!!detail.meta.dynamicPassword && !creator}
            inputMode={detail.meta.dynamicPassword ? "none" : undefined}
            onChange={detail.meta.dynamicPassword ? undefined : (e) => setPw(e.target.value)}
          />
          {!!detail.meta.dynamicPassword && <div className="transfer-keypad" aria-label="备忘录密码数字键盘">{Array.from({length:10},(_,n)=><button key={n} onClick={()=>setPw(pw.length < 4 ? pw + n : pw)}>{n}</button>)}<button onClick={()=>setPw(pw.slice(0,-1))}>删除</button></div>}
          <button
            disabled={!!detail.meta.dynamicPassword && (Number(state.variables.finalPhase) < 22 || pw.length !== 4)}
            onClick={() => {
              const expected = detail.meta.dynamicPassword ? String(state.variables.childhoodTransferAmount || state.variables.storyTransferAmount || "") : detail.password;
              const entered = pw;
              if (entered === expected && (!detail.meta.dynamicPassword || Number(state.variables.finalPhase) >= 22)) {
                setUnlocks([...unlocks, detail.id]);
                onEvent("password", detail.id);
                onRead(detail.id);
                setPwError("");
              } else { setPwError("密码错误，请重试。"); setPw(""); }
            }}
          >
            解锁内容
          </button>
          <small>{pwError}</small>
        </div>
      ) : (
        <>
          <small className="detail-meta">
            {detail.time} · {detail.sender}
          </small>
          <h2>{detail.title}</h2>
          {app.id === "find" && detail.id === "s3-lee-phone" && <div className="story-find-detail"><div className="story-find-map" aria-label="转角咖啡附近地图"><span>转角咖啡</span><b>●</b>{state.variables.sceneThreeStage9 === true && <i>●</i>}</div><p>在线 · 刚刚更新</p><p>转角咖啡附近</p><button onClick={() => onUi?.("route:s3-lee-phone",true)}>路线</button>{ui?.["route:s3-lee-phone"] === true && <small>路线已显示 · 转角咖啡</small>}</div>}
          {(detail.media || ["media", "social"].includes(app.engine)) && (
            <Media item={detail} />
          )}
          <RichText value={detail.richText} fallback={detail.body} />
          <dl className="item-metadata">
            {getFields(app.id)
              .filter((f) => detail.meta?.[f.key])
              .map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{detail.meta[f.key]}</dd>
                </div>
              ))}
          </dl>
          {detail.folder && (
            <span className="folder-label">
              <Folder size={12} />
              {detail.folder}
            </span>
          )}
          {detail.comments.map((c, i) => (
            <p key={i} className="comment">
              {c}
            </p>
          ))}
        </>
      )}
    </div>
  ) : null;
  if (archive && thread && ["kakao", "messages"].includes(app.id))
    return (
      <StoryThread
        key={app.id + thread + String(ui?.routeVisit || "")}
        app={app.id}
        work={work}
        state={state}
        thread={thread}
        items={shown}
        read={onRead}
        send={onChoose}
        onEvent={onEvent}
        back={() => setThread("")}
        onUi={onUi}
        openResource={goToRecord}
        openAssistant={onAssistant}
      />
    );
  if (app.id === "gpt" && !creator) {
    const hint = guidanceAnswer(work, state);
    return (
      <section className="gpt-guide">
        <header>
          <button aria-label="返回桌面首页" onClick={onBack}>
            <ChevronLeft />
          </button>
          <strong>{name}</strong>
        </header>
        <main>
          {ui?.answer ? (
            <>
              <p className="gpt-question">下一步该点哪里？</p>
              <small>剧情提示</small>
              <p role="status" style={{ whiteSpace: "pre-line" }}>{hint}</p>
            </>
          ) : (
            <h2>需要一点提示吗？</h2>
          )}
        </main>
        <button
          className="gpt-ask"
          onClick={() => onUi?.("answer", "shown")}
        >
          下一步该点哪里？ ↑
        </button>
      </section>
    );
  }
  if (
    archive &&
    detail?.meta.transcript &&
    (!detail.password || unlocks.includes(detail.id))
  )
    return (
      <Transcript
        key={detail.id}
        item={detail}
        mode={
          app.id === "music"
            ? "录音"
            : detail.folder === "语音信箱"
              ? "语音信箱"
              : "电话"
        }
        ui={ui}
        onUi={onUi}
        close={back}
      />
    );
  if (archive && app.id === "music" && name === "录音机")
    return (
      <div className="catalog-skin voice-memos">
        <header className="app-nav">
          <button onClick={back} aria-label="返回">‹</button>
          <strong>所有录音</strong>
          <button aria-label="搜索录音">⌕</button>
        </header>
        <div className="catalog-scroll">
          <h1>所有录音</h1>
          {shown.map((i) => (
            <button className="catalog-row" key={i.id} onClick={() => read(i)}>
              <span>
                <strong>{i.title}</strong>
                <small>{i.time.slice(0,10)} <span>{i.meta.duration} 秒</span></small>
              </span>
              ▷
            </button>
          ))}
        </div>
        <div className="voice-record-control"><button aria-label="开始录音"><Mic size={22}/></button></div>
      </div>
    );
  if (Skin)
    return (
      <>
        <div className="catalog-slot" hidden={!!detail}>
          <Suspense fallback={<div className="catalog-loading">正在打开…</div>}>
            <Skin
              appId={app.id}
              owner={work.phone.owner}
              virtualTime={state.time}
              archive={archive}
              virtualDate={state.date || work.phone.date}
              onEvent={onEvent}
              contacts={[...(work.data.contacts || []), ...(state.messages.contacts || [])].filter((i) => visible(i, state))}
              gallery={[...(work.data.photos || []), ...(state.messages.photos || [])].filter((i) => visible(i, state))}
              ui={state.ui?.[app.id]}
              storyState={state}
              storyTextPresets={pendingGuidance(work, state).filter((task) => task.app === app.id && task.inputText).map((task) => task.inputText!)}
              onUi={creator ? undefined : onUi}
              name={name}
              items={shown.map((i) => ({
                ...i,
                read: i.read || state.read.includes(i.id),
                favorite:
                  typeof ui?.["favorite:" + i.id] === "boolean"
                    ? !!ui["favorite:" + i.id]
                    : i.favorite,
              }))}
              creator={creator}
              onRead={onRead}
              onItem={read}
              onAdd={onAdd}
              onBack={onBack}
              thread={thread}
              onThread={setThread}
            />
          </Suspense>
        </div>
        {detail &&
          (socialDetailApps.has(app.id) &&
          (!detail.password || unlocks.includes(detail.id)) ? (
            <SocialDetail
              app={app.id}
              item={detail}
              back={back}
              owner={work.phone.owner}
              ui={state.ui?.[app.id]}
              onUi={onUi}
            />
          ) : nativeDetailApps.has(app.id) &&
            (!detail.password || unlocks.includes(detail.id)) ? (
            <NativeDetail
              gallery={
                app.id === "photos"
                  ? shown.filter((i) => !ui?.["trash:" + i.id])
                  : undefined
              }
              openPhoto={read}
              requestCallback={
                archive &&
                work.nodes.some(
                  (n) =>
                    n.event === "requestCallback" &&
                    n.target === detail.id &&
                    !state.completed.includes(n.id),
                )
                  ? () => onEvent("requestCallback", detail.id)
                  : undefined
              }
              writeNote={
                archive && detail.meta.composeText && !detail.body
                  ? () => onEvent("writeNote", detail.id)
                  : undefined
              }
              openMessage={
                detail.id === "s4-lee-contact" ? () => goToRecord("how-know-name") : work.data.messages?.some(
                  (i) => i.title === detail.title && visible(i, state),
                )
                  ? () =>
                      goToRecord(
                        work.data.messages.find(
                          (i) => i.title === detail.title && visible(i, state),
                        )!.id,
                      )
                  : undefined
              }
              key={detail.id}
              app={app.id}
              item={detail}
              back={back}
              ui={ui}
              onUi={onUi}
              adjacent={
                app.id === "photos"
                  ? (dir) => {
                      const i = shown.findIndex((x) => x.id === detail.id);
                      const next = shown[i + dir];
                      if (next) read(next);
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <div className="app-nav">
                <button aria-label="返回" onClick={back}>
                  <ChevronLeft size={23} />
                </button>
                <strong>{detail.title}</strong>
                <span />
              </div>
              {detailView}
              {archive && app.id === "find" && detail.id === "s3-lee-phone" && state.variables.s3FindSeen === true && state.variables.sceneThreeStage7 !== true && (
                <button className="story-screenshot" onClick={() => onEvent("storyScreenshot",detail.id)}>截屏并保存到照片</button>
              )}
            </>
          ))}
      </>
    );
  return (
    <>
      <div className="app-nav">
        <button onClick={back} aria-label="返回">
          <ChevronLeft size={23} />
          {detail || thread ? "返回" : ""}
        </button>
        <strong>{thread || name}</strong>
        <button
          onClick={
            creator
              ? onAdd
              : () =>
                  document
                    .querySelector<HTMLInputElement>(
                      ".app-screen .phone-search input",
                    )
                    ?.focus()
          }
          aria-label={creator ? "新增内容" : "搜索内容"}
        >
          {creator ? <Plus size={22} /> : <Search size={20} />}
        </button>
      </div>
      {app.id === "settings" && !detail ? (
        <>
          <NativeSettings
            onRestart={archive ? onRestart : undefined}
            onEvent={onEvent}
            airplane={Boolean(state.ui?.settings?.airplane)}
            appearance={String(
              state.ui?.settings?.appearance || work.phone.theme,
            )}
            setAppearance={
              archive ? (value) => onUi?.("appearance", value) : undefined
            }
            work={{
              ...work,
              phone: {
                ...work.phone,
                time: state.time,
                date: state.date || work.phone.date,
              },
            }}
            items={shown}
            creator={creator}
            onItem={read}
            onSettings={onSettings}
          />
        </>
      ) : app.id === "calculator" && !detail ? (
        <NativeCalculator
          items={shown}
          onRead={read}
          ui={state.ui?.[app.id]}
          onUi={onUi}
        />
      ) : detail ? (
        detailView
      ) : app.engine === "messaging" && thread ? (
        <div className="chat-content">
          <div className="chat-time">{state.date || work.phone.date}</div>
          {shown
            .filter((i) => i.title === thread)
            .map((i) => (
              <button
                key={i.id}
                className={`message-row ${i.outgoing ? "outgoing" : ""}`}
                onClick={() => (creator ? onEdit(i) : onRead(i.id))}
              >
                <span className="avatar">{i.sender.slice(0, 1)}</span>
                <span className="bubble">
                  {i.kind === "image" ||
                  i.kind === "audio" ||
                  i.kind === "video" ? (
                    <Media item={i} />
                  ) : i.kind === "transfer" ? (
                    <span className="transfer">
                      ¥ {i.body}
                      <small>虚构转账记录</small>
                    </span>
                  ) : (
                    i.body
                  )}
                  <small>
                    {i.time.slice(-5)} {i.read ? "✓✓" : ""}
                  </small>
                  {creator && (i.hidden || i.unlock) && (
                    <LockKeyhole size={12} />
                  )}
                </span>
              </button>
            ))}
          {creator ? (
            <button className="chat-compose" onClick={onAdd}>
              ＋ 添加一条消息
            </button>
          ) : (
            <div className="chat-compose muted">
              根据剧情推进，互动回复将在这里出现。
            </div>
          )}
        </div>
      ) : (
        <div
          className={`phone-content ${app.engine === "social" ? "feed-content" : ""}`}
        >
          {app.engine !== "media" && (
            <div className="phone-search">
              <Search size={15} />
              <input
                placeholder={`搜索${name}`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          )}
          {app.engine === "messaging" ? (
            chats.map((t) => {
              const list = shown.filter((i) => i.title === t),
                last = list[list.length - 1];
              return (
                <button
                  className="contact-row"
                  key={t}
                  onClick={() => {
                    setThread(t);
                    onRead(t);
                  }}
                >
                  <span className="avatar" style={{ background: app.color }}>
                    {(app.id === "messages" && t === "陌生号码" ? String(state.ui?.messages?.contactAlias || t) : t).slice(0, 1)}
                  </span>
                  <span>
                    <strong>{app.id === "messages" && t === "陌生号码" ? String(state.ui?.messages?.contactAlias || t) : t}</strong>
                    <p>{last.body}</p>
                  </span>
                  <small>{last.time.slice(-5)}</small>
                </button>
              );
            })
          ) : app.engine === "media" ? (
            <>
              <div className="media-heading">
                <h1>{tab}</h1>
                <p>{filtered.length} 个故事片段</p>
              </div>
              <div className="media-grid">
                {filtered.map((i) => (
                  <button key={i.id} onClick={() => read(i)}>
                    <Media item={i} />
                    <span>
                      {i.title} {creator && i.hidden ? "· 隐藏" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : app.engine === "social" ? (
            filtered.map((i) => (
              <article className="social-post" key={i.id}>
                <div className="post-author">
                  <span className="avatar" style={{ background: app.color }}>
                    {i.sender.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{i.sender}</strong>
                    <small>{i.time}</small>
                  </div>
                  <button aria-label="查看帖子详情" onClick={() => read(i)}>
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <button className="post-image" onClick={() => read(i)}>
                  <Media item={i} />
                </button>
                <div className="post-actions">
                  <button
                    aria-label="虚构点赞"
                    onClick={() =>
                      setLikes(
                        likes.includes(i.id)
                          ? likes.filter((id) => id !== i.id)
                          : [...likes, i.id],
                      )
                    }
                  >
                    <Heart
                      size={22}
                      fill={likes.includes(i.id) ? "#d67670" : "none"}
                    />
                  </button>
                  <button aria-label="查看评论" onClick={() => read(i)}>
                    <MessageCircle size={22} />
                  </button>
                  <small>
                    {i.likes + (likes.includes(i.id) ? 1 : 0)} 次虚构喜欢
                  </small>
                </div>
                <button className="post-text" onClick={() => read(i)}>
                  <strong>{i.title}</strong>
                  <p>{i.body}</p>
                </button>
              </article>
            ))
          ) : (
            filtered.map((i) => (
              <button
                key={i.id}
                className={`record-row ${app.engine === "document" ? "document-row" : ""}`}
                onClick={() => read(i)}
              >
                <div className="record-symbol">
                  {app.engine === "records" ? (
                    <app.icon size={20} />
                  ) : (
                    <span>{i.title.slice(0, 1)}</span>
                  )}
                </div>
                <div>
                  <strong>{i.title}</strong>
                  <p>{i.body.split("\n")[0]}</p>
                  <small>
                    {i.time} {i.folder && `· ${i.folder}`}
                  </small>
                </div>
                {i.password || i.hidden ? (
                  <LockKeyhole size={14} />
                ) : (
                  <ChevronLeft className="chevron-right" size={16} />
                )}
              </button>
            ))
          )}
          {!filtered.length && app.engine !== "messaging" && (
            <div className="empty-app">
              <app.icon size={36} />
              <h3>这一页还很安静</h3>
              <p>
                {creator
                  ? "添加属于这个 App 的故事内容。"
                  : "暂时没有可浏览的内容。"}
              </p>
            </div>
          )}
          {creator && (
            <button className="phone-add" onClick={onAdd}>
              <Plus size={15} />
              添加
              {app.engine === "messaging"
                ? "聊天"
                : app.engine === "social"
                  ? "帖子"
                  : app.engine === "media"
                    ? "素材"
                    : "内容"}
            </button>
          )}
        </div>
      )}
      {!detail &&
        !thread &&
        app.id !== "calculator" &&
        app.id !== "settings" && (
          <div className="app-tabs">
            {app.tabs.map((t, i) => (
              <button
                key={t}
                className={tab === t ? "selected" : ""}
                onClick={() => setTab(t)}
              >
                {i === 0 ? (
                  <MessageCircle size={17} />
                ) : i === 1 ? (
                  <Search size={17} />
                ) : (
                  <UsersIcon />
                )}
                <span>{t}</span>
              </button>
            ))}
          </div>
        )}
    </>
  );
}
function UsersIcon() {
  return <PhoneIcon size={17} />;
}
