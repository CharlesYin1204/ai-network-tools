"use client";
import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Search,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  Heart,
  MapPin,
  Users,
  User,
  Home,
  Sparkles,
  MessageCircle,
  Bell,
  LayoutGrid,
  Compass,
  Briefcase,
  Camera,
  Building2,
  GraduationCap,
  Package,
  SlidersHorizontal,
  Send,
  Download,
  Smartphone,
  Settings,
  LogOut,
  Shield,
  FileText,
  Clock,
  Link2,
  CheckCircle2,
  Loader2,
  Menu,
  MoreHorizontal,
  Activity,
  Layers,
  Copy,
  Bookmark,
  Upload,
  Eye,
  Mail,
  Globe,
  Star,
  RefreshCw,
  Trash2,
  Edit3,
  Network,
  Wallet,
  HelpCircle,
  BarChart3,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
const categories = [
  "全部资源",
  "空间场地",
  "专业技能",
  "设备物品",
  "人脉合作",
  "知识经验",
  "其他资源",
];
const catIcons = [
  LayoutGrid,
  Building2,
  Briefcase,
  Camera,
  Users,
  GraduationCap,
  Package,
];
const photoMap = {
  空间场地: "studio",
  专业技能: "design",
  设备物品: "camera",
  人脉合作: "meeting",
  知识经验: "books",
  其他资源: "garden",
};
const actionNames = {
  chat: "小赋助手",
  publish: "智能发布",
  recommend: "资源匹配",
  valuation: "价值分析",
  demand: "需求分析",
  people: "AI 找人",
  profile: "名片优化",
  cooperation: "合作方案",
};
const dashboardLinks = [
  ["/account/profile", "数字名片", User, "让合适的人看见你的优势"],
  ["/network", "我的人脉", Users, "好友、星标与二度连接"],
  ["/account/resources", "我的资源", Package, "管理发布与资源状态"],
  ["/account/demands", "我的需求", FileText, "寻找你的下一次合作"],
  ["/account/matches", "合作与引荐", Link2, "跟进每一条连接"],
  ["/account/favorites", "我的收藏", Heart, "留住感兴趣的资源"],
  ["/messages", "消息中心", MessageCircle, "与合作伙伴继续交流"],
  ["/ai", "小赋 AI", Sparkles, "找资源、找人、理清想法"],
  ["/account/history", "AI 历史", Clock, "回看灵感与匹配结果"],
  ["/account/notifications", "通知中心", Bell, "不错过新的合作动态"],
  ["/download", "下载客户端", Smartphone, "把身边的机会装进口袋"],
  ["/account/settings", "账户设置", Settings, "个人信息与隐私设置"],
  ["/feed", "机域动态", Layers, "分享见解，发现同频的人"],
  ["/account/invite", "邀请朋友", Link2, "把新的连接带到身边"],
  ["/about", "帮助与反馈", HelpCircle, "使用指南与建议反馈"],
];
async function api(path, method = "GET", body) {
  const opts = { method, credentials: "same-origin" };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const r = await fetch("/api" + path, opts);
  const data = await r.json().catch(() => ({ error: "服务响应异常" }));
  if (!r.ok) throw new Error(data.error || "操作失败，请重试");
  return data;
}
const fallbackPhoto = (r) =>
  "/media/" + (photoMap[r.category] || "studio") + ".jpg";
function IconButton({ icon: Icon, label, ...props }) {
  return (
    <button type="button" className="icon-btn" title={label} aria-label={label} {...props}>
      <Icon size={20} />
    </button>
  );
}
function Empty({
  title = "这里还没有内容",
  text = "发现一次连接，开启新的可能。",
  href = "/",
  label = "去发现资源",
}) {
  return (
    <div className="empty">
      <Compass size={40} />
      <h3>{title}</h3>
      <p>{text}</p>
      {href && (
        <Link className="btn secondary" href={href}>
          {label}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = [...document.querySelectorAll('[role="dialog"]')].at(-1);
    dialog?.querySelector("input,textarea,select,button")?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const fields = [
        ...(dialog?.querySelectorAll(
          "button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled)",
        ) || []),
      ];
      const first = fields[0],
        last = fields.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);
  return (
    <div className="modal-back" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={"modal " + (wide ? "wide" : "")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <IconButton icon={X} label="关闭" onClick={onClose} />
        </div>
        {children}
      </section>
    </div>
  );
}
function Status({ value }) {
  const labels = {
    active: "正常",
    open: "开放中",
    archived: "已下架",
    cancelled: "已取消",
    new: "待联系",
    contacted: "已联系",
    error: "失败",
    hidden: "已隐藏",
    published: "已发布",
    pending: "待处理",
    approved: "已通过",
    rejected: "已拒绝",
    accepted: "已接受",
    completed: "已完成",
    closed: "已关闭",
    disabled: "已停用",
    draft: "草稿",
    success: "成功",
    failed: "失败",
    building: "构建中",
    ready: "可下载",
    public: "公开",
    contacts: "好友可见",
    second_degree: "二度人脉",
  };
  return (
    <span
      className={
        "status " +
        (["failed", "rejected", "disabled"].includes(value)
          ? "bad"
          : ["pending", "building"].includes(value)
            ? "wait"
            : "")
      }
    >
      {labels[value] || value || "—"}
    </span>
  );
}
export default function XunfuApp() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [user, setUser] = useState(null),
    [sessionReady, setReady] = useState(false),
    [auth, setAuth] = useState(false),
    [authMode, setAuthMode] = useState("login"),
    [toast, setToast] = useState(""),
    [mobileMenu, setMobileMenu] = useState(false),
    [refresh, setRefresh] = useState(0),
    [publish, setPublish] = useState(false),
    [config, setConfig] = useState({});
  const notify = useCallback((m) => {
    setToast(m);
    setTimeout(() => setToast(""), 4500);
  }, []);
  useEffect(() => {
    api("/session")
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    setMobileMenu(false);
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    api("/public/config")
      .then(setConfig)
      .catch(() => {});
  }, [refresh, pathname]);
  const requireUser = (fn) => (user ? fn() : setAuth(true));
  const logout = async () => {
    await api("/auth/logout", "POST");
    setUser(null);
    router.push("/");
    notify("已退出登录");
  };
  const ctx = {
    config,
    user,
    setUser,
    notify,
    requireUser,
    refresh,
    reload: () => setRefresh((x) => x + 1),
    setPublish,
    router,
  };
  const admin = pathname.startsWith("/admin");
  const nav = [
    ["/", "发现", Compass],
    ["/feed", "机域", Layers],
    ["/network", "人脉", Users],
    ["/ai", "小赋 AI", Sparkles],
  ];
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          <img src="/icon.svg" alt="" />
          <span>
            {config.siteName || "AI人脉工具"}
            <small>让连接产生价值</small>
          </span>
        </Link>
        <nav className="topnav">
          {nav.map(([url, title, Icon]) => (
            <Link
              key={url}
              href={url}
              className={
                (pathname === url ? "active" : "") +
                (url === "/ai" ? " ai-nav" : "")
              }
            >
              {title}
              {url === "/ai" && <span className="tiny-ai">AI</span>}
            </Link>
          ))}
        </nav>
        <div className="top-actions">
          <Link href="/download" className="download-link">
            <Smartphone size={16} />
            下载 App
          </Link>
          <IconButton
            icon={Bell}
            label="通知"
            onClick={() =>
              requireUser(() => router.push("/account/notifications"))
            }
          />
          {user ? (
            <button
              className="user-avatar"
              onClick={() => router.push(admin ? "/account" : "/account")}
            >
              {user.name?.slice(0, 1) || "询"}
            </button>
          ) : (
            <button className="btn small dark" onClick={() => setAuth(true)}>
              登录 / 注册
            </button>
          )}
          <button
            className="menu-toggle icon-btn"
            aria-label="菜单"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Menu />
          </button>
        </div>
      </header>
      <div className={"app-layout " + (admin ? "admin-layout" : "")}>
        <aside className={"sidebar " + (mobileMenu ? "open" : "")}>
          {admin ? (
            <>
              <div className="sidebar-label">平台管理</div>
              {[
                ["/admin", "数据概览", BarChart3],
                ["/admin/users", "用户管理", Users],
                ["/admin/resources", "资源审核", Package],
                ["/admin/demands", "需求管理", FileText],
                ["/admin/posts", "机域管理", Layers],
                ["/admin/matches", "合作记录", Link2],
                ["/admin/leads", "咨询线索", Mail],
                ["/admin/models", "AI 模型", Sparkles],
                ["/admin/ai-logs", "调用日志", Activity],
                ["/admin/apk", "Android 应用", Smartphone],
                ["/admin/settings", "平台设置", Settings],
              ].map(([url, title, I]) => (
                <Link
                  className={"side-item " + (pathname === url ? "active" : "")}
                  key={url}
                  href={url}
                >
                  <I size={19} />
                  {title}
                </Link>
              ))}
              <Link className="side-item back-site" href="/">
                <ArrowLeft size={18} />
                返回前台
              </Link>
            </>
          ) : (
            <>
              <div className="sidebar-label">探索更多可能</div>
              {nav.map(([url, title, I]) => (
                <Link
                  className={"side-item " + (pathname === url ? "active" : "")}
                  key={url}
                  href={url}
                >
                  <I size={20} />
                  {title}
                  {url === "/ai" && <span className="nav-new">NEW</span>}
                </Link>
              ))}
              <div className="side-rule" />
              <div className="sidebar-label">我的空间</div>
              <Link
                className={
                  "side-item " +
                  (pathname.startsWith("/account") ? "active" : "")
                }
                href="/account"
              >
                <LayoutGrid size={19} />
                用户中心
              </Link>
              <Link
                className={
                  "side-item " + (pathname === "/messages" ? "active" : "")
                }
                href="/messages"
              >
                <MessageCircle size={19} />
                消息中心
              </Link>
              <Link className="side-item" href="/account/favorites">
                <Heart size={19} />
                我的收藏
              </Link>
              <button
                className="side-item"
                onClick={() => requireUser(() => setPublish(true))}
              >
                <Plus size={19} />
                发布资源 / 需求
              </button>
              <div className="sidebar-grow" />
              <div className="side-invite">
                <div className="mini-orbit">
                  <Users size={23} />
                  <span>+</span>
                </div>
                <h4>好机会，来自好连接</h4>
                <p>
                  完善数字名片
                  <br />
                  让你的价值被看见
                </p>
                <Link href="/account/profile">
                  创建我的名片
                  <ArrowUpRight size={15} />
                </Link>
              </div>
              <Link className="side-item muted" href="/about">
                <HelpCircle size={18} />
                关于AI人脉工具
              </Link>
              {user?.role === "admin" && (
                <Link className="side-item muted" href="/admin">
                  <Shield size={18} />
                  管理后台
                </Link>
              )}
            </>
          )}
          <div className="sidebar-foot">AI人脉工具 · 连接可信人脉</div>
        </aside>
        <main className="main-content">
          {!admin && config.announcement && (
            <div className="site-announcement">
              <Bell size={15} />
              {config.announcement}
            </div>
          )}
          {admin ? (
            <Admin
              {...ctx}
              pathname={pathname}
              sessionReady={sessionReady}
              onLogin={() => setAuth(true)}
            />
          ) : pathname === "/" ? (
            <Discover {...ctx} />
          ) : pathname === "/feed" ? (
            <Feed {...ctx} />
          ) : pathname === "/demands" ? (
            <Demands {...ctx} />
          ) : pathname === "/network" ? (
            <NetworkPage {...ctx} />
          ) : pathname.startsWith("/resources/") ? (
            <ResourceDetail {...ctx} id={pathname.split("/")[2]} />
          ) : pathname === "/ai" ? (
            <AIPage {...ctx} />
          ) : pathname === "/download" ? (
            <DownloadPage {...ctx} />
          ) : pathname === "/about" ? (
            <About {...ctx} />
          ) : pathname === "/messages" ? (
            <Messages {...ctx} onLogin={() => setAuth(true)} />
          ) : pathname.startsWith("/account") ? (
            <Account
              {...ctx}
              pathname={pathname}
              sessionReady={sessionReady}
              onLogin={() => setAuth(true)}
              onLogout={logout}
            />
          ) : (
            <Empty title="页面未找到" />
          )}
          <footer className="page-footer">
            <span>AI人脉工具，连接身边的可能。</span>
            <span>
              AI 人脉与资源协作平台{" "}
              <Link href="/about">了解平台</Link>
            </span>
          </footer>
        </main>
      </div>
      {!admin && (
        <nav className="mobile-bottom">
          <Link className={pathname === "/" ? "active" : ""} href="/">
            <Compass />
            发现
          </Link>
          <Link className={pathname === "/feed" ? "active" : ""} href="/feed">
            <Layers />
            机域
          </Link>
          <button
            className="mobile-publish"
            onClick={() => requireUser(() => setPublish(true))}
          >
            <span>
              <Plus />
            </span>
            发布
          </button>
          <Link
            className={pathname === "/messages" ? "active" : ""}
            href="/messages"
          >
            <MessageCircle />
            消息
          </Link>
          <Link
            className={pathname.startsWith("/account") ? "active" : ""}
            href="/account"
          >
            <User />
            我的
          </Link>
        </nav>
      )}
      {auth && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          onClose={() => setAuth(false)}
          onSuccess={(u) => {
            setUser(u);
            setAuth(false);
            notify("欢迎回来，" + u.name);
            ctx.reload();
          }}
        />
      )}
      {publish && <PublishModal {...ctx} onClose={() => setPublish(false)} />}
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </>
  );
}
function AuthModal({ mode, setMode, onClose, onSuccess }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api(
        "/auth/" + (mode === "login" ? "login" : "register"),
        "POST",
        Object.fromEntries(new FormData(e.target)),
      );
      onSuccess(d.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={mode === "login" ? "欢迎回到AI人脉工具" : "开启你的价值连接"}
      onClose={onClose}
    >
      <p className="modal-intro">连接真实的人，让身边的资源流动起来。</p>
      <form onSubmit={submit}>
        {mode !== "login" && (
          <Field label="你的名字">
            <input
              name="name"
              required
              maxLength={40}
              placeholder="如何称呼你"
            />
          </Field>
        )}
        <Field label="邮箱">
          <input
            name="email"
            type="email"
            required
            placeholder="name@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="密码">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="至少 8 位密码"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </Field>
        {error && <p className="error">{error}</p>}
        <button disabled={busy} className="btn primary full">
          {busy ? <Loader2 className="spin" size={18} /> : null}
          {mode === "login" ? "登录" : "创建账户"}
        </button>
      </form>
      <p className="auth-switch">
        {mode === "login" ? "还没有账号？" : "已经有账号？"}
        <button
          onClick={() => {
            setError("");
            setMode(mode === "login" ? "register" : "login");
          }}
        >
          {mode === "login" ? "立即注册" : "去登录"}
        </button>
      </p>
    </Modal>
  );
}
function useItems(path, refresh = 0) {
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    api(path)
      .then((d) => {
        if (live) setItems(d.items || []);
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [path, refresh]);
  return { items, loading, error, setItems };
}
function ResourceCard({ r, requireUser, notify, reload }) {
  const fav = () =>
    requireUser(async () => {
      try {
        const d = await api("/resources/" + r.id + "/favorite", "POST");
        notify(d.favorited ? "已收藏资源" : "已取消收藏");
        reload?.();
      } catch (e) {
        notify(e.message);
      }
    });
  return (
    <article className="resource-card">
      <Link className="resource-photo" href={"/resources/" + r.id}>
        <img
          src={
            r.image?.startsWith("http") || r.image?.startsWith("/media/")
              ? r.image
              : fallbackPhoto(r)
          }
          onError={(e) => (e.currentTarget.src = fallbackPhoto(r))}
          alt={r.title}
        />
        <span className="photo-badge">{r.category}</span>
      </Link>
      <button
        className={"save-btn " + (r.favorited ? "saved" : "")}
        aria-label="收藏资源"
        onClick={fav}
      >
        <Heart size={17} fill={r.favorited ? "currentColor" : "none"} />
      </button>
      <div className="resource-body">
        <div className="resource-meta">
          <span className="small-green">
            <span />
            {r.status === "approved" || r.status === "published"
              ? "可连接"
              : ["closed", "archived"].includes(r.status)
                ? "已下架"
                : r.status === "pending"
                  ? "待审核"
                  : "待完善"}
          </span>
          <span>
            <MapPin size={12} />
            {r.location || "线上协作"}
          </span>
        </div>
        <Link href={"/resources/" + r.id}>
          <h3>{r.title}</h3>
        </Link>
        <p>{r.description}</p>
        <div className="tag-line">
          {(Array.isArray(r.tags) ? r.tags : []).slice(0, 2).map((t) => (
            <span key={t}>{t}</span>
          ))}
          {!r.tags?.length && <span>欢迎交流</span>}
        </div>
        <div className="resource-owner">
          <span className="avatar tiny">
            {(r.ownerName || r.owner_name || "询").slice(0, 1)}
          </span>
          <span>{r.ownerName || r.owner_name || "AI人脉工具成员"}</span>
          <small>成员发布</small>
          <ArrowUpRight size={16} />
        </div>
      </div>
    </article>
  );
}
function Discover(ctx) {
  const [category, setCategory] = useState("全部资源"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("recommended");
  const { items, loading, error } = useItems(
    "/resources?" +
      new URLSearchParams({
        q: search,
        category: category === "全部资源" ? "" : category,
      }),
    ctx.refresh,
  );
  const sorted = [...items].sort((a, b) =>
    sort === "latest" ? b.id - a.id : 0,
  );
  return (
    <div className="discover">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker">
            <span className="live-dot" />
            发现资源，也发现彼此
          </div>
          <h1>
            让闲置，
            <br />
            遇见新价值。
          </h1>
          <p>
            {ctx.config?.siteDescription || (
              <>
                你拥有的，恰好是别人需要的。
                <br />用 AI 找到资源，用信任连接机会。
              </>
            )}
          </p>
          <div className="hero-actions">
            <button
              className="btn dark"
              onClick={() => ctx.requireUser(() => ctx.setPublish(true))}
            >
              分享我的资源
              <Plus size={17} />
            </button>
            <Link className="text-link" href="/ai">
              让小赋帮我找
              <Sparkles size={17} />
            </Link>
          </div>
          <div className="hero-social">
            <div className="avatar-stack">
              <span>林</span>
              <span>陈</span>
              <span>周</span>
              <span>+</span>
            </div>
            <span>从一个连接，开启更多可能</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="orbit-line" />
          <div className="art-card art-main">
            <img src="/media/studio.jpg" alt="共享的明亮工作空间" />
            <div>
              <span>一处空间，无限可能</span>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="art-card art-camera">
            <img src="/media/camera.jpg" alt="待分享的摄影设备" />
            <span>让热爱持续发生</span>
          </div>
          <div className="art-note">
            <span className="note-icon">
              <Link2 size={22} />
            </span>
            <div>
              闲置资源
              <ArrowRight size={14} />
              新的机会<small>每一次连接，都有价值</small>
            </div>
          </div>
          <div className="art-sticker">
            <Sparkles size={20} />
            小赋为你
            <br />
            发现可能
          </div>
          <span className="art-dot one" />
          <span className="art-dot two" />
        </div>
      </section>
      <section className="quick-routes">
        <Link href="/network">
          <span className="quick-icon green">
            <Users />
          </span>
          <div>
            <h3>好资源，在身边</h3>
            <p>通过信任连接你的人脉</p>
          </div>
          <ArrowUpRight size={20} />
        </Link>
        <Link href="/ai">
          <span className="quick-icon purple">
            <Sparkles />
          </span>
          <div>
            <h3>说说需求，小赋来找</h3>
            <p>AI 帮你找到合适的资源</p>
          </div>
          <ArrowUpRight size={20} />
        </Link>
        <Link href="/account/profile">
          <span className="quick-icon orange">
            <User />
          </span>
          <div>
            <h3>你的价值，值得被看见</h3>
            <p>创建一张有温度的数字名片</p>
          </div>
          <ArrowUpRight size={20} />
        </Link>
      </section>
      <section className="discovery-section">
        <div className="section-top">
          <div>
            <h2>
              发现身边的可能
              <span className="heading-dot" />
            </h2>
            <p>空间、技能、物品与经验，总有一种连接适合你。</p>
          </div>
          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query);
            }}
          >
            <Search size={18} />
            <input
              aria-label="搜索资源"
              placeholder="搜一搜你需要的资源"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button aria-label="开始搜索">
              <ArrowRight size={17} />
            </button>
          </form>
        </div>
        <div className="category-bar">
          {categories.map((c, i) => {
            const I = catIcons[i];
            return (
              <button
                className={category === c ? "active" : ""}
                key={c}
                onClick={() => setCategory(c)}
              >
                <I size={17} />
                {c}
              </button>
            );
          })}
        </div>
        <div className="results-bar">
          <div className="result-tabs">
            <button
              className={sort === "recommended" ? "active" : ""}
              onClick={() => setSort("recommended")}
            >
              为你发现
            </button>
            <button
              className={sort === "latest" ? "active" : ""}
              onClick={() => setSort("latest")}
            >
              最新发布
            </button>
          </div>
          <span className="result-hint">
            <span className="live-dot" />
            {search ? "搜索结果" : "好资源，等待新的连接"}
            <SlidersHorizontal size={15} />
          </span>
        </div>
        {error && <div className="error">{error}</div>}
        {loading ? (
          <div className="loading">
            <Loader2 className="spin" />
            正在发现资源
          </div>
        ) : sorted.length ? (
          <div className="resource-grid">
            {sorted.map((r) => (
              <ResourceCard key={r.id} r={r} {...ctx} />
            ))}
          </div>
        ) : (
          <Empty
            title="暂时没有找到相关资源"
            text="换一个关键词，或发布需求让合适的人找到你。"
            href="/demands"
            label="去发布需求"
          />
        )}
      </section>
      <section className="bottom-banner">
        <div>
          <h2>一个人的闲置，一群人的机会。</h2>
          <p>让你的技能、空间与经验，找到新的用武之地。</p>
        </div>
        <button
          className="btn primary"
          onClick={() => ctx.requireUser(() => ctx.setPublish(true))}
        >
          发布一份资源
          <Plus size={17} />
        </button>
      </section>
    </div>
  );
}
function PublishModal(ctx) {
  const [kind, setKind] = useState("resource"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [description, setDescription] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const v = Object.fromEntries(new FormData(e.target));
    v.description = description;
    if (kind === "resource") {
      v.tags = (v.tags || "").split(/[,，]/).filter(Boolean);
      v.price = Number(v.price || 0);
      v.image = "/media/" + (photoMap[v.category] || "studio") + ".jpg";
    } else v.budget = Number(v.budget || 0);
    try {
      await api(kind === "resource" ? "/resources" : "/demands", "POST", v);
      ctx.notify("发布成功，可在用户中心查看状态");
      ctx.reload();
      ctx.onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const polish = async () => {
    if (!description.trim()) return ctx.notify("先描述你想分享的资源或需求");
    setBusy(true);
    try {
      const d = await api("/ai", "POST", {
        action: kind === "resource" ? "publish" : "demand",
        message: description,
      });
      setDescription(d.answer);
      ctx.notify("AI 已整理描述，请确认后发布");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="分享一个新的可能" onClose={ctx.onClose} wide>
      <div className="segmented">
        <button
          className={kind === "resource" ? "active" : ""}
          onClick={() => setKind("resource")}
        >
          我有资源
        </button>
        <button
          className={kind === "demand" ? "active" : ""}
          onClick={() => setKind("demand")}
        >
          我有需求
        </button>
      </div>
      <form onSubmit={submit}>
        <Field label={kind === "resource" ? "资源标题" : "需求标题"}>
          <input
            name="title"
            required
            minLength={3}
            maxLength={100}
            placeholder={
              kind === "resource"
                ? "例如：周末闲置的自然光摄影棚"
                : "例如：寻找一位品牌设计师"
            }
          />
        </Field>
        <div className="form-row">
          <Field label="资源类别">
            <select name="category">
              {categories.slice(1).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="所在城市 / 合作方式">
            <input name="location" required placeholder="北京 · 朝阳 / 线上" />
          </Field>
        </div>
        <Field label="详细描述">
          <textarea
            rows={5}
            required
            minLength={8}
            maxLength={10000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="介绍具体内容、适合的人、可提供的时间与合作方式……"
          />
        </Field>
        <button
          type="button"
          className="ai-inline"
          onClick={polish}
          disabled={busy}
        >
          <Sparkles size={16} />
          让小赋帮我完善描述
        </button>
        <div className="form-row">
          <Field
            label={
              kind === "resource"
                ? "参考费用（元，可为 0）"
                : "参考预算（元，可为 0）"
            }
          >
            <input
              type="number"
              name={kind === "resource" ? "price" : "budget"}
              min="0"
              defaultValue="0"
            />
          </Field>
          <Field label="可见范围">
            <select name="visibility">
              <option value="public">公开可见</option>
              <option value="contacts">仅好友可见</option>
              <option value="second_degree">好友及二度人脉</option>
            </select>
          </Field>
        </div>
        {kind === "resource" && (
          <div className="form-row">
            <Field label="合作类型">
              <select name="type">
                <option value="share">资源共享</option>
                <option value="service">专业服务</option>
                <option value="collaboration">合作交流</option>
              </select>
            </Field>
            <Field label="关键词">
              <input name="tags" placeholder="自然光，周末可用，欢迎交流" />
            </Field>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn primary full" disabled={busy}>
          {busy ? <Loader2 className="spin" size={18} /> : <Plus size={18} />}
          确认发布
        </button>
      </form>
    </Modal>
  );
}
function Demands(ctx) {
  const { items, loading, error } = useItems("/demands", ctx.refresh);
  return (
    <>
      <PageTitle
        title="机域，让需求遇见回应"
        desc="说出你正在寻找的，也许答案就在朋友的朋友那里。"
        action={
          <button
            className="btn primary"
            onClick={() => ctx.requireUser(() => ctx.setPublish(true))}
          >
            <Plus size={17} />
            发布需求
          </button>
        }
      />
      <div className="demand-intro">
        <Layers size={30} />
        <div>
          <h3>一次真实的需求，就是连接的开始。</h3>
          <p>发现合作邀请、资源需求与同行机会，主动回应你能提供的价值。</p>
        </div>
        <Link href="/ai">
          试试 AI 需求分析
          <ArrowUpRight size={17} />
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="loading">
          <Loader2 className="spin" />
        </div>
      ) : items.length ? (
        <div className="demand-list">
          {items.map((d) => (
            <article key={d.id} className="demand-card">
              <div className="demand-avatar">
                <Briefcase size={24} />
              </div>
              <div className="demand-info">
                <div className="eyebrow-row">
                  <span className="tag">{d.category}</span>
                  <span>{d.location || "线上协作"}</span>
                  <Status value={d.status || "active"} />
                </div>
                <h3>{d.title}</h3>
                <p>{d.description}</p>
                <div className="demand-bottom">
                  <span>
                    {d.ownerName || d.owner_name || "AI人脉工具成员"}
                  </span>
                  <span>
                    {Number(d.budget) > 0
                      ? "预算 ¥" + Number(d.budget).toLocaleString()
                      : "合作方式可沟通"}
                  </span>
                </div>
              </div>
              <button
                className="btn secondary"
                onClick={() =>
                  ctx.requireUser(async () => {
                    try {
                      await api("/matches", "POST", {
                        demandId: d.id,
                        message: "我对这项需求感兴趣，希望进一步交流。",
                      });
                      ctx.notify("已发送合作申请，可在合作记录查看");
                      ctx.reload();
                    } catch (e) {
                      ctx.notify(e.message);
                    }
                  })
                }
              >
                我能帮忙
                <ArrowUpRight size={16} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="还没有发布的需求" />
      )}
    </>
  );
}
function PageTitle({ title, desc, action }) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      {action}
    </div>
  );
}
function ResourceDetail(ctx) {
  const [r, setR] = useState(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(
      "你好，我对这份资源感兴趣，希望了解更多合作细节。",
    );
  useEffect(() => {
    api("/resources/" + ctx.id)
      .then((d) => setR(d.item))
      .catch((e) => setError(e.message));
  }, [ctx.id, ctx.refresh]);
  if (error) return <Empty title={error} />;
  if (!r)
    return (
      <div className="loading">
        <Loader2 className="spin" />
      </div>
    );
  return (
    <>
      <Link className="back-link" href="/">
        <ArrowLeft size={16} />
        返回资源发现
      </Link>
      <div className="detail-layout">
        <div>
          <img
            className="detail-hero"
            src={r.image || fallbackPhoto(r)}
            onError={(e) => (e.currentTarget.src = fallbackPhoto(r))}
            alt={r.title}
          />
          <section className="panel detail-copy">
            <span className="tag">{r.category}</span>
            <h1>{r.title}</h1>
            <p className="location-line">
              <MapPin size={16} />
              {r.location} <Status value={r.visibility || "public"} />
            </p>
            <h3>关于这份资源</h3>
            <p className="pre-wrap">{r.description}</p>
            <div className="tag-line">
              {r.tags?.map?.((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="detail-note">
              <Shield size={20} />
              <p>
                请在合作前核实资源信息，并沟通时间、费用和交付方式。本平台提供连接服务。
              </p>
            </div>
          </section>
        </div>
        <aside>
          <section className="panel owner-panel">
            <span className="avatar large">
              {(r.ownerName || r.owner_name || "询").slice(0, 1)}
            </span>
            <h3>{r.ownerName || r.owner_name || "AI人脉工具成员"}</h3>
            <p>资源发布者</p>
            <div className="detail-price">
              {Number(r.price) > 0 ? (
                <>
                  <b>¥{Number(r.price).toLocaleString()}</b>
                  <span> / {r.unit || "参考费用"}</span>
                </>
              ) : (
                <b>合作方式可沟通</b>
              )}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              aria-label="合作留言"
            />
            <button
              className="btn primary full"
              onClick={() =>
                ctx.requireUser(async () => {
                  try {
                    await api("/matches", "POST", {
                      resourceId: r.id,
                      message,
                    });
                    ctx.notify("合作申请已发送");
                    ctx.router.push("/account/matches");
                  } catch (e) {
                    ctx.notify(e.message);
                  }
                })
              }
            >
              <Link2 size={17} />
              发起合作连接
            </button>
            <button
              className="btn secondary full"
              onClick={() =>
                ctx.requireUser(() =>
                  ctx.router.push(
                    "/messages?with=" +
                      (r.userId || r.ownerId || r.user_id || r.owner_id),
                  ),
                )
              }
            >
              <MessageCircle size={17} />
              私信交流
            </button>
            <small className="contact-hint">
              成为好友或合作获接受后，可发送私信。
            </small>
            <button
              className="text-link"
              onClick={() =>
                ctx.requireUser(async () => {
                  try {
                    const d = await api(
                      "/resources/" + r.id + "/favorite",
                      "POST",
                    );
                    ctx.notify(d.favorited ? "已收藏" : "已取消收藏");
                    ctx.reload();
                  } catch (e) {
                    ctx.notify(e.message);
                  }
                })
              }
            >
              <Heart size={17} />
              收藏这份资源
            </button>
          </section>
          <Link href="/ai" className="detail-ai">
            <Sparkles />
            <div>
              <strong>让小赋给点建议</strong>
              <p>分析资源价值与合作可能</p>
            </div>
            <ArrowUpRight />
          </Link>
        </aside>
      </div>
    </>
  );
}
function NetworkPage(ctx) {
  const { items, loading, error } = useItems("/network", ctx.refresh),
    contacts = useItems("/contacts", ctx.refresh),
    intros = useItems("/introductions", ctx.refresh);
  const [tab, setTab] = useState("all"),
    [invite, setInvite] = useState(false),
    [email, setEmail] = useState("");
  const list = tab === "contacts" ? contacts.items : items;
  const updateContact = async (id, body) => {
    try {
      await api("/contacts/" + id, "PATCH", body);
      ctx.reload();
      ctx.notify("好友关系已更新");
    } catch (e) {
      ctx.notify(e.message);
    }
  };
  return (
    <>
      <PageTitle
        title="值得信任的连接"
        desc="从一张名片开始，发现好友与二度人脉中的合作机会。"
        action={
          <button
            className="btn primary"
            onClick={() => ctx.requireUser(() => setInvite(true))}
          >
            <Plus size={17} />
            添加好友
          </button>
        }
      />
      <div className="network-hero">
        <div className="network-symbol">
          <Users size={40} />
          <span />
          <i />
        </div>
        <div>
          <h2>你需要的人，也许就在朋友的朋友里。</h2>
          <p>用真实的身份连接，用彼此的信任创造更多可能。</p>
          <Link href="/ai" className="text-link">
            告诉小赋，你想找谁
            <Sparkles size={17} />
          </Link>
        </div>
      </div>
      <div className="tabs">
        {[
          ["all", "发现人脉"],
          ["contacts", "我的好友"],
          ["intros", "引荐记录"],
        ].map(([k, t]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {t}
          </button>
        ))}
      </div>
      {!ctx.user ? (
        <LoginPrompt onLogin={() => ctx.requireUser(() => {})} />
      ) : tab === "intros" ? (
        <div className="panel">
          {intros.items.length ? (
            intros.items.map((i) => (
              <div className="list-row" key={i.id}>
                <span className="feature-icon">
                  <Network size={21} />
                </span>
                <div>
                  <h3>
                    {i.requesterName} <span className="muted">希望认识</span>{" "}
                    {i.targetName}
                  </h3>
                  <p>
                    通过 {i.connectorName} 引荐 · {i.message}
                  </p>
                  <small>
                    {i.status === "accepted"
                      ? "中间人已同意，等待目标用户确认好友关系"
                      : "中间人确认后，将发送好友申请给目标用户。"}
                  </small>
                </div>
                <Status value={i.status} />
                {i.connectorId === ctx.user.id && i.status === "pending" && (
                  <div className="row-actions">
                    {[
                      ["accepted", "同意引荐"],
                      ["rejected", "婉拒"],
                    ].map(([status, label]) => (
                      <button
                        key={status}
                        className="btn secondary small"
                        onClick={async () => {
                          try {
                            await api("/introductions/" + i.id, "PATCH", {
                              status,
                            });
                            ctx.reload();
                            ctx.notify("引荐申请已处理");
                          } catch (e) {
                            ctx.notify(e.message);
                          }
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <Empty
              title="还没有引荐记录"
              text="在二度人脉中发现合适的人，邀请共同好友引荐。"
              href={null}
            />
          )}
        </div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : loading ? (
        <div className="loading">
          <Loader2 className="spin" />
        </div>
      ) : list.length ? (
        <div className="people-grid">
          {list.map((p) => (
            <article className="person-card" key={p.id}>
              <div className="person-head">
                <span className="avatar large">
                  {(p.name || "询").slice(0, 1)}
                </span>
                <span className="tag">
                  {tab === "contacts"
                    ? p.status === "accepted"
                      ? "我的好友"
                      : p.status === "pending"
                        ? p.incoming
                          ? "收到申请"
                          : "已申请"
                        : "未连接"
                    : p.degree === 2
                      ? "二度人脉"
                      : p.degree === 1
                        ? "我的好友"
                        : "社区成员"}
                </span>
              </div>
              <h3>{p.name}</h3>
              <p>
                {p.title || "资源协作伙伴"}
                {p.company && " · " + p.company}
              </p>
              <p className="person-bio">
                {p.bio ||
                  (Array.isArray(p.skills) ? p.skills.join(" / ") : p.skills) ||
                  "期待与志同道合的人交流，让资源找到新的价值。"}
              </p>
              {p.introduction && (
                <div className="introduction-path">
                  <Link2 size={14} />
                  {p.introduction}
                </div>
              )}
              <div className="tag-line">
                <span>{p.industry || "跨界协作"}</span>
                {(p.city || p.location) && <span>{p.city || p.location}</span>}
                {p.starred && <span>星标好友</span>}
                {p.hidden && <span>关系已隐藏</span>}
              </div>
              <div className="person-actions">
                {tab === "contacts" && p.status === "pending" ? (
                  p.incoming ? (
                    <div className="row-actions">
                      <button
                        className="btn primary small"
                        onClick={() =>
                          updateContact(p.id, { status: "accepted" })
                        }
                      >
                        接受邀请
                      </button>
                      <button
                        className="text-link"
                        onClick={() =>
                          updateContact(p.id, { status: "rejected" })
                        }
                      >
                        婉拒
                      </button>
                    </div>
                  ) : (
                    <span className="muted">等待对方确认</span>
                  )
                ) : (
                  <button
                    className="btn secondary small"
                    onClick={() =>
                      ctx.requireUser(async () => {
                        try {
                          if (
                            p.degree === 1 ||
                            (tab === "contacts" && p.status === "accepted")
                          )
                            ctx.router.push(
                              "/messages?with=" +
                                (p.contactUserId || p.userId || p.id),
                            );
                          else if (p.degree === 2) {
                            await api("/introductions", "POST", {
                              targetId: p.id,
                              message:
                                "希望认识这位伙伴，交流资源与合作机会，请帮忙引荐。",
                            });
                            ctx.notify("已请求共同好友引荐");
                            ctx.reload();
                          } else {
                            await api("/contacts", "POST", {
                              userId: p.contactUserId || p.id,
                              message: "你好，希望与你建立连接。",
                            });
                            ctx.notify("连接申请已发送");
                            ctx.reload();
                          }
                        } catch (e) {
                          ctx.notify(e.message);
                        }
                      })
                    }
                  >
                    {p.degree === 1 ||
                    (tab === "contacts" && p.status === "accepted")
                      ? "私信交流"
                      : p.degree === 2
                        ? "请求引荐"
                        : "建立连接"}
                    <ArrowUpRight size={15} />
                  </button>
                )}
                {tab === "contacts" && p.status === "accepted" && (
                  <div className="contact-tools">
                    <IconButton
                      icon={Star}
                      label={p.starred ? "取消星标" : "星标好友"}
                      onClick={() =>
                        updateContact(p.id, { starred: !p.starred })
                      }
                    />
                    <IconButton
                      icon={Eye}
                      label={p.hidden ? "公开关系" : "隐藏关系"}
                      onClick={() => updateContact(p.id, { hidden: !p.hidden })}
                    />
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title={
            tab === "contacts" ? "还没有建立连接" : "完善名片，开启人脉探索"
          }
          href="/account/profile"
          label="完善数字名片"
        />
      )}
      {invite && (
        <Modal title="邀请一个新的连接" onClose={() => setInvite(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/contacts", "POST", {
                  email,
                  message: "你好，希望与你建立连接。",
                });
                ctx.notify("好友申请已发送");
                setInvite(false);
                ctx.reload();
              } catch (e) {
                ctx.notify(e.message);
              }
            }}
          >
            <Field label="对方注册邮箱">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
              />
            </Field>
            <button className="btn primary full">
              发送好友申请
              <Send size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function LoginPrompt({ onLogin }) {
  return (
    <div className="login-prompt">
      <div className="login-orbit">
        <User size={34} />
      </div>
      <h2>你的价值空间，等你开启</h2>
      <p>
        登录后管理名片、资源、人脉与合作，
        <br />
        让每一个连接都留下来。
      </p>
      <button className="btn primary" onClick={onLogin}>
        登录 / 创建账户
        <ArrowRight size={17} />
      </button>
    </div>
  );
}
function AIPage(ctx) {
  const [action, setAction] = useState("chat"),
    [input, setInput] = useState(""),
    [messages, setMessages] = useState([]),
    [busy, setBusy] = useState(false),
    [conversationId, setCid] = useState(null),
    [error, setError] = useState("");
  const send = async (e) => {
    e?.preventDefault();
    if (!input.trim() || busy) return;
    ctx.requireUser(async () => {
      const text = input;
      setInput("");
      setMessages((m) => [...m, { role: "user", content: text }]);
      setBusy(true);
      setError("");
      try {
        const d = await api("/ai", "POST", {
          action:
            action === "profile"
              ? "publish"
              : action === "cooperation"
                ? "chat"
                : action,
          message:
            (action === "profile"
              ? "请基于以下真实经历优化一段数字名片简介，不要虚构任何资历："
              : action === "cooperation"
                ? "请基于以下合作目标生成可供用户审阅的合作开场白和简要合作方案；不要自动发送："
                : "") + text,
          conversationId,
        });
        setMessages((m) => [
          ...m,
          { role: "assistant", content: d.answer, model: d.model },
        ]);
        setCid(d.conversationId);
      } catch (e) {
        setError(e.message);
        setInput(text);
      } finally {
        setBusy(false);
      }
    });
  };
  return (
    <div className="ai-page">
      <div className="ai-top">
        <span>
          <Sparkles size={20} />
          小赋 AI
        </span>
        <button
          className="btn secondary small"
          onClick={() => {
            setMessages([]);
            setCid(null);
            setError("");
          }}
        >
          <Plus size={15} />
          新的对话
        </button>
      </div>
      <div className="ai-modes">
        {Object.entries(actionNames).map(([key, name]) => (
          <button
            key={key}
            className={action === key ? "active" : ""}
            onClick={() => {
              setAction(key);
              setCid(null);
              setMessages([]);
            }}
          >
            {key === "people" ? <Users size={16} /> : <Sparkles size={16} />}{" "}
            {name}
          </button>
        ))}
      </div>
      {messages.length === 0 ? (
        <div className="ai-welcome">
          <div className="ai-emblem">
            <Sparkles size={40} />
          </div>
          <h1>
            嗨，我是小赋。
            <br />
            一起发现你的下一种可能。
          </h1>
          <p>告诉我你需要什么，我帮你理清想法、发现资源、连接合适的人。</p>
          <div className="prompt-grid">
            {[
              [
                "找一处适合团队共创的空间",
                "我想在北京找一个适合 8 人团队共创的空间，请推荐平台资源。",
                Building2,
              ],
              [
                "让我的资源介绍更出色",
                "请帮我写一份品牌设计服务介绍，我有 5 年设计经验，擅长新消费品牌。",
                Edit3,
              ],
              [
                "发现合作伙伴",
                "我想认识擅长产品设计的合作伙伴，请从我可见的人脉中给出建议。",
                Users,
              ],
              [
                "梳理一个新的合作想法",
                "我有周末闲置的摄影设备，想通过资源合作创造价值，可以怎么做？",
                Compass,
              ],
            ].map(([title, prompt, I]) => (
              <button key={title} onClick={() => setInput(prompt)}>
                <I size={20} />
                <span>{title}</span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={"chat-message " + m.role}>
              <span
                className={
                  "avatar " + (m.role === "assistant" ? "ai-avatar" : "")
                }
              >
                {m.role === "assistant" ? (
                  <Sparkles size={20} />
                ) : (
                  ctx.user?.name?.slice(0, 1)
                )}
              </span>
              <div>
                <div className="chat-name">
                  {m.role === "assistant" ? "小赋 AI" : ctx.user?.name}
                  {m.model && (
                    <small>
                      {typeof m.model === "object" ? m.model.name : m.model}
                    </small>
                  )}
                </div>
                <div className="message-text">{m.content}</div>
                {m.role === "assistant" && (
                  <button
                    className="copy-answer"
                    onClick={() => {
                      copyText(m.content);
                      ctx.notify("已复制回答");
                    }}
                  >
                    <Copy size={13} />
                    复制内容
                  </button>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="ai-thinking">
              <Loader2 size={18} className="spin" />
              小赋正在理解你的需求，连接相关信息…
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="error ai-error">
          <AlertCircle size={17} />
          {error}
          <span>可重试，或请管理员检查模型配置与余额。</span>
        </div>
      )}
      <div className="ai-composer-wrap">
        <form className="ai-composer" onSubmit={send}>
          <textarea
            rows={2}
            aria-label="向小赋提问"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="说说你的想法，剩下的交给小赋…"
          />
          <div>
            <span>
              <Sparkles size={15} />
              {actionNames[action]}
            </span>
            <button
              type="submit"
              aria-label="发送"
              disabled={busy || !input.trim()}
            >
              {busy ? (
                <Loader2 className="spin" size={20} />
              ) : (
                <ArrowRight size={21} />
              )}
            </button>
          </div>
        </form>
        <p className="ai-disclaimer">
          AI 建议仅供参考，合作前请核实信息。Enter 发送，Shift + Enter 换行。
        </p>
      </div>
    </div>
  );
}
function copyText(text) {
  if (navigator.clipboard) navigator.clipboard.writeText(text);
  else {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    el.remove();
  }
}
function Account(ctx) {
  const section = ctx.pathname.split("/")[2] || "overview";
  const [profile, setProfile] = useState(null),
    [stats, setStats] = useState({});
  useEffect(() => {
    if (ctx.user) {
      api("/profile")
        .then((d) => setProfile(d.profile || d.user || d.item || d))
        .catch(() => {});
      api("/dashboard")
        .then((d) => setStats(d.stats || d))
        .catch(() => {});
    }
  }, [ctx.user, ctx.refresh]);
  if (!ctx.sessionReady)
    return (
      <div className="loading">
        <Loader2 className="spin" />
      </div>
    );
  if (!ctx.user) return <LoginPrompt onLogin={ctx.onLogin} />;
  return (
    <>
      <PageTitle
        title={
          section === "overview"
            ? "我的价值空间"
            : dashboardLinks.find((x) => x[0] === ctx.pathname)?.[1] ||
              "用户中心"
        }
        desc={
          section === "overview"
            ? `你好，${ctx.user.name}。把你的价值，连接到更多可能。`
            : "管理每一份资源，认真对待每一次连接。"
        }
        action={
          <button className="btn primary" onClick={() => ctx.setPublish(true)}>
            <Plus size={17} />
            发布资源
          </button>
        }
      />
      {section !== "overview" && (
        <Link href="/account" className="back-link">
          <ArrowLeft size={16} />
          全部功能
        </Link>
      )}
      {section === "overview" ? (
        <>
          <div className="account-top">
            <div className="digital-card">
              <div className="card-topline">
                <span>我的数字名片</span>
                <Link href="/account/profile">
                  <Edit3 size={17} />
                </Link>
              </div>
              <div className="card-person">
                <span className="avatar large">
                  {ctx.user.name?.slice(0, 1)}
                </span>
                <div>
                  <h2>{ctx.user.name}</h2>
                  <p>{profile?.title || "每一种优势，都值得被看见"}</p>
                </div>
              </div>
              <p>{profile?.company || "完善职业信息，让合适的人发现你"}</p>
              <div className="card-bottom">
                <span>{profile?.industry || "开启价值连接"}</span>
                <Link href="/account/profile">
                  编辑名片
                  <ArrowUpRight size={17} />
                </Link>
              </div>
            </div>
            <div className="account-stats">
              {[
                [
                  "我的资源",
                  stats.resources || stats.resourceCount || 0,
                  Package,
                ],
                ["我的需求", stats.demands || stats.demandCount || 0, FileText],
                ["合作连接", stats.matches || stats.matchCount || 0, Link2],
                ["我的好友", stats.contacts || stats.contactCount || 0, Users],
              ].map(([name, value, I]) => (
                <div key={name}>
                  <I size={19} />
                  <strong>
                    {typeof value === "object" ? value.count || 0 : value}
                  </strong>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="section-top">
            <h2>全部功能</h2>
            <span className="muted">所有入口，一目了然</span>
          </div>
          <div className="feature-grid">
            {dashboardLinks.map(([href, name, I, desc]) => (
              <Link key={href} href={href}>
                <span
                  className={"feature-icon " + (href === "/ai" ? "purple" : "")}
                >
                  <I size={23} />
                </span>
                <div>
                  <h3>{name}</h3>
                  <p>{desc}</p>
                </div>
                <ChevronRight size={17} />
              </Link>
            ))}
          </div>
          {ctx.user.role === "admin" && (
            <Link href="/admin" className="admin-entry">
              <Shield size={21} />
              <div>
                <b>进入管理后台</b>
                <p>管理用户、内容、AI 模型与 Android 应用</p>
              </div>
              <ArrowUpRight size={20} />
            </Link>
          )}
        </>
      ) : section === "invite" ? (
        <InvitePage {...ctx} />
      ) : section === "profile" || section === "settings" ? (
        <ProfileForm
          {...ctx}
          profile={profile}
          settings={section === "settings"}
        />
      ) : section === "resources" || section === "favorites" ? (
        <MyResources {...ctx} favorites={section === "favorites"} />
      ) : section === "demands" ? (
        <MyDemands {...ctx} />
      ) : section === "matches" ? (
        <Matches {...ctx} />
      ) : section === "history" ? (
        <History {...ctx} />
      ) : section === "notifications" ? (
        <Notifications {...ctx} />
      ) : null}
    </>
  );
}
function ProfileForm(ctx) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [draft, setDraft] = useState(null);
  if (!ctx.profile)
    return (
      <div className="loading">
        <Loader2 className="spin" />
      </div>
    );
  const p = ctx.profile;
  return (
    <form
      id="profile-editor"
      className="panel profile-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const data = Object.fromEntries(new FormData(e.target));
          data.hideTitle = data.hideTitle === "on";
          data.skills = String(data.skills || "")
            .split(/[,，]/)
            .map((v) => v.trim())
            .filter(Boolean);
          const d = await api("/profile", "PATCH", data);
          ctx.setUser({ ...ctx.user, ...(d.user || d.profile || data) });
          ctx.notify("个人资料已保存");
          ctx.reload();
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="profile-form-head">
        <span className="avatar large">{p.name?.slice(0, 1)}</span>
        <div>
          <h2>{ctx.settings ? "账户与隐私" : "让你的价值被看见"}</h2>
          <p>真实完整的名片，能帮助小赋为你找到更合适的连接。</p>
        </div>
      </div>
      <div className="form-row">
        <Field label="姓名">
          <input name="name" required defaultValue={p.name || ctx.user.name} />
        </Field>
        <Field label="城市">
          <input
            name="city"
            defaultValue={p.city || p.location}
            placeholder="北京"
          />
        </Field>
      </div>
      <div className="form-row">
        <Field label="公司 / 组织">
          <input
            name="company"
            defaultValue={p.company}
            placeholder="你所在的团队"
          />
        </Field>
        <Field label="职位">
          <input
            name="title"
            defaultValue={p.title}
            placeholder="产品经理 / 设计师 / 创业者"
          />
        </Field>
      </div>
      <div className="form-row">
        <Field label="所在行业">
          <input
            name="industry"
            defaultValue={p.industry}
            placeholder="互联网 / 创意设计 / 教育"
          />
        </Field>
        <Field label="擅长领域">
          <input
            name="skills"
            defaultValue={
              Array.isArray(p.skills) ? p.skills.join("，") : p.skills
            }
            placeholder="产品规划、用户研究、资源整合"
          />
        </Field>
      </div>
      <Field label="自我介绍与资源优势">
        <textarea
          name="bio"
          rows={5}
          maxLength={3000}
          defaultValue={p.bio}
          placeholder="你能提供什么？你希望认识什么样的人？"
        />
      </Field>
      <button
        type="button"
        className="ai-inline"
        disabled={busy}
        onClick={async (e) => {
          const f = e.currentTarget.closest("form");
          const data = Object.fromEntries(new FormData(f));
          setBusy(true);
          setError("");
          try {
            const d = await api("/ai", "POST", {
              action: "publish",
              message:
                "请只生成一段可直接作为数字名片自我介绍的中文文本，不要标题和标签；只使用以下真实信息，不虚构公司或成绩：" +
                JSON.stringify({
                  name: data.name,
                  company: data.company,
                  title: data.title,
                  industry: data.industry,
                  skills: data.skills,
                  bio: data.bio,
                }),
            });
            setDraft(d.answer);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Sparkles size={16} />
        {busy ? "小赋正在整理…" : "用 AI 优化我的名片"}
      </button>
      <Field label="名片可见范围" hint="隐藏的名片不会用于 AI 人脉匹配。">
        <select name="visibility" defaultValue={p.visibility || "public"}>
          <option value="public">社区公开可见</option>
          <option value="contacts">仅好友可见</option>
          <option value="second_degree">好友及二度人脉可见</option>
          <option value="hidden">隐藏名片</option>
        </select>
      </Field>
      <label className="checkbox-field">
        <input
          type="checkbox"
          name="hideTitle"
          defaultChecked={!!p.hideTitle}
        />
        <span>向二度人脉和非好友隐藏我的职位</span>
      </label>
      <p className="muted">登录邮箱：{p.email || ctx.user.email}</p>
      {ctx.settings && (
        <div className="password-section">
          <h3>修改登录密码</h3>
          <p className="muted">不修改密码时，请留空。</p>
          <div className="form-row">
            <Field label="当前密码">
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
              />
            </Field>
            <Field label="新密码">
              <input
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                placeholder="至少 8 位"
              />
            </Field>
          </div>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button disabled={busy} className="btn primary">
          {busy && <Loader2 className="spin" size={16} />}保存资料
          <Check size={17} />
        </button>
        {ctx.settings && (
          <button
            type="button"
            className="btn secondary"
            onClick={ctx.onLogout}
          >
            <LogOut size={17} />
            退出登录
          </button>
        )}
      </div>
      {draft && (
        <Modal title="确认名片草稿" onClose={() => setDraft(null)}>
          <textarea
            rows={9}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <p className="muted">请核实内容后采用，最后点击保存资料。</p>
          <button
            type="button"
            className="btn primary full"
            onClick={() => {
              document.querySelector("#profile-editor [name=bio]").value =
                draft;
              setDraft(null);
              ctx.notify("已填入草稿，确认后请保存资料");
            }}
          >
            采用这份草稿
            <Check size={16} />
          </button>
        </Modal>
      )}
    </form>
  );
}
function MyResources(ctx) {
  const { items, loading, error } = useItems(
    "/resources?" + (ctx.favorites ? "favorites=1" : "mine=1"),
    ctx.refresh,
  );
  const [edit, setEdit] = useState(null);
  return (
    <>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="loading">
          <Loader2 className="spin" />
        </div>
      ) : items.length ? (
        <div className="resource-grid">
          {items.map((r) => (
            <div key={r.id}>
              <ResourceCard r={r} {...ctx} />
              {!ctx.favorites && (
                <div className="manage-resource">
                  <Status value={r.status === "closed" ? "archived" : r.status} />
                  <button onClick={() => setEdit(r)}>编辑</button>
                  <button
                    onClick={async () => {
                      try {
                        await api("/resources/" + r.id, "PATCH", {
                          status:
                            ["archived", "closed"].includes(r.status) ? "pending" : "archived",
                        });
                        ctx.notify(
                          ["archived", "closed"].includes(r.status)
                            ? "已提交重新审核"
                            : "已下架资源",
                        );
                        ctx.reload();
                      } catch (e) {
                        ctx.notify(e.message);
                      }
                    }}
                  >
                    {["archived", "closed"].includes(r.status) ? "重新上架" : "下架"}
                  </button>
                  {r.reviewNote && (
                    <small className="review-note">
                      审核反馈：{r.reviewNote}
                    </small>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title={ctx.favorites ? "还没有收藏的资源" : "还没有发布的资源"}
          text={
            ctx.favorites
              ? "把感兴趣的资源收进收藏夹，下次更容易找到。"
              : "分享一份技能、一处空间，或一个新的合作想法。"
          }
        />
      )}{" "}
      {edit && (
        <Modal title="编辑资源" onClose={() => setEdit(null)} wide>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const v = Object.fromEntries(new FormData(e.target));
              v.price = Number(v.price);
              v.tags = v.tags
                .split(/[,，]/)
                .map((x) => x.trim())
                .filter(Boolean);
              try {
                await api("/resources/" + edit.id, "PATCH", v);
                setEdit(null);
                ctx.reload();
                ctx.notify("资源已保存，等待审核");
              } catch (e) {
                ctx.notify(e.message);
              }
            }}
          >
            <Field label="资源标题">
              <input name="title" required defaultValue={edit.title} />
            </Field>
            <Field label="资源描述">
              <textarea
                name="description"
                required
                rows={5}
                defaultValue={edit.description}
              />
            </Field>
            <div className="form-row">
              <Field label="资源类别">
                <select name="category" defaultValue={edit.category}>
                  {categories.slice(1).map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="所在城市">
                <input name="location" defaultValue={edit.location} />
              </Field>
            </div>
            <div className="form-row">
              <Field label="参考费用">
                <input
                  name="price"
                  type="number"
                  min="0"
                  defaultValue={edit.price}
                />
              </Field>
              <Field label="可见范围">
                <select name="visibility" defaultValue={edit.visibility}>
                  <option value="public">公开可见</option>
                  <option value="contacts">仅好友</option>
                  <option value="second_degree">好友及二度人脉</option>
                </select>
              </Field>
            </div>
            <Field label="关键词">
              <input name="tags" defaultValue={edit.tags?.join("，")} />
            </Field>
            <button className="btn primary full">
              保存资源
              <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function MyDemands(ctx) {
  const { items, error } = useItems("/demands?mine=1", ctx.refresh);
  return (
    <div className="panel">
      {error && <p className="error">{error}</p>}
      {items.length ? (
        items.map((d) => (
          <div className="list-row" key={d.id}>
            <div>
              <h3>{d.title}</h3>
              <p>{d.description}</p>
            </div>
            <Status value={d.status} />
            <button
              className="btn secondary small"
              onClick={async () => {
                try {
                  await api("/demands/" + d.id, "PATCH", {
                    status: d.status === "closed" ? "active" : "closed",
                  });
                  ctx.reload();
                  ctx.notify("需求状态已更新");
                } catch (e) {
                  ctx.notify(e.message);
                }
              }}
            >
              {d.status === "closed" ? "重新开放" : "关闭需求"}
            </button>
          </div>
        ))
      ) : (
        <Empty title="暂时没有发布需求" />
      )}
    </div>
  );
}
function Matches(ctx) {
  const { items, error } = useItems("/matches", ctx.refresh);
  const update = async (id, status) => {
    try {
      await api("/matches/" + id, "PATCH", { status });
      ctx.notify("合作状态已更新");
      ctx.reload();
    } catch (e) {
      ctx.notify(e.message);
    }
  };
  return (
    <div className="panel">
      {error && <p className="error">{error}</p>}
      {items.length ? (
        items.map((m) => (
          <div className="list-row match-row" key={m.id}>
            <span className="feature-icon">
              <Link2 size={22} />
            </span>
            <div>
              <h3>{m.resourceTitle || m.demandTitle || "合作连接 #" + m.id}</h3>
              <p>{m.message}</p>
              <small>
                {m.requesterName} → {m.ownerName}
              </small>
            </div>
            <Status value={m.status} />
            <div className="row-actions">
              {m.status === "pending" && m.ownerId === ctx.user.id && (
                <>
                  <button
                    className="btn primary small"
                    onClick={() => update(m.id, "accepted")}
                  >
                    接受
                  </button>
                  <button
                    className="btn secondary small"
                    onClick={() => update(m.id, "rejected")}
                  >
                    拒绝
                  </button>
                </>
              )}
              {m.status === "pending" && m.requesterId === ctx.user.id && (
                <button
                  className="btn secondary small"
                  onClick={() => update(m.id, "cancelled")}
                >
                  取消申请
                </button>
              )}
              {m.status === "accepted" && (
                <>
                  <button
                    className="btn primary small"
                    onClick={() => update(m.id, "completed")}
                  >
                    完成合作
                  </button>
                  <Link
                    className="btn secondary small"
                    href={
                      "/messages?with=" +
                      (m.ownerId === ctx.user.id ? m.requesterId : m.ownerId)
                    }
                  >
                    私信
                  </Link>
                </>
              )}
            </div>
          </div>
        ))
      ) : (
        <Empty
          title="还没有合作记录"
          text="找到合适的资源，发送第一份合作邀请。"
        />
      )}
    </div>
  );
}
function History(ctx) {
  const { items } = useItems("/ai/conversations", ctx.refresh);
  const [selected, setSelected] = useState(null);
  return (
    <div className="panel">
      {items.length ? (
        items.map((c) => (
          <button
            className="history-row"
            key={c.id}
            onClick={async () => {
              try {
                setSelected(await api("/ai/conversations/" + c.id));
              } catch (e) {
                ctx.notify(e.message);
              }
            }}
          >
            <Sparkles size={20} />
            <div>
              <h3>{c.title || actionNames[c.action] || "小赋对话"}</h3>
              <p>
                {new Date(c.createdAt || c.created_at).toLocaleString("zh-CN")}
              </p>
            </div>
            <ChevronRight size={18} />
          </button>
        ))
      ) : (
        <Empty title="还没有 AI 对话" href="/ai" label="与小赋聊聊" />
      )}
      {selected && (
        <Modal title="AI 对话记录" onClose={() => setSelected(null)} wide>
          <div className="history-content">
            {(
              selected.messages ||
              selected.items ||
              selected.conversation?.messages ||
              []
            ).map((m, i) => (
              <div key={i} className={"history-message " + m.role}>
                <b>{m.role === "assistant" ? "小赋" : "我"}</b>
                <p className="pre-wrap">{m.content}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
function Notifications(ctx) {
  const { items } = useItems("/notifications", ctx.refresh);
  return (
    <div className="panel">
      <div className="panel-head">
        <h3>消息通知</h3>
        <button
          className="text-link"
          onClick={async () => {
            try {
              await api("/notifications", "PATCH", { all: true });
              ctx.reload();
              ctx.notify("已全部标记已读");
            } catch (e) {
              ctx.notify(e.message);
            }
          }}
        >
          <Check size={16} />
          全部已读
        </button>
      </div>
      {items.length ? (
        items.map((n) => (
          <div className="list-row" key={n.id}>
            <span className="feature-icon">
              <Bell size={20} />
            </span>
            <div>
              <h3>{n.title}</h3>
              <p>{n.content || n.message}</p>
              <small>
                {new Date(n.createdAt || n.created_at).toLocaleString("zh-CN")}
              </small>
            </div>
            {!n.readAt && !n.read_at && !n.isRead && (
              <span className="live-dot" />
            )}
          </div>
        ))
      ) : (
        <Empty title="暂时没有新通知" href={null} />
      )}
    </div>
  );
}
function Messages(ctx) {
  const { items: conversations } = useItems("/conversations", ctx.refresh);
  const [selected, setSelected] = useState(null),
    [msgs, setMsgs] = useState([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("with");
    if (id && id !== "undefined")
      setSelected({ id: Number(id), name: "合作伙伴" });
  }, []);
  useEffect(() => {
    if (!selected || !ctx.user) return;
    const load = () =>
      api("/messages?with=" + selected.id)
        .then((d) => setMsgs(d.items || []))
        .catch((e) => ctx.notify(e.message));
    load();
    const t = setInterval(load, 7000);
    return () => clearInterval(t);
  }, [selected, ctx.user, ctx.refresh]);
  if (!ctx.user) return <LoginPrompt onLogin={ctx.onLogin} />;
  return (
    <>
      <PageTitle
        title="把连接，变成对话"
        desc="认真回应每一份善意，让合作从这里开始。"
      />
      <div className="messages-layout">
        <aside className="conversation-list">
          <h3>全部会话</h3>
          {conversations.length ? (
            conversations.map((c) => (
              <button
                key={c.id || c.userId || c.peerId}
                className={
                  selected?.id === (c.userId || c.peerId || c.id)
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setSelected({
                    id: c.userId || c.peerId || c.id,
                    name: c.name || c.userName || c.peerName,
                  })
                }
              >
                <span className="avatar">
                  {(c.name || c.userName || c.peerName || "询").slice(0, 1)}
                </span>
                <div>
                  <b>{c.name || c.userName || c.peerName || "合作伙伴"}</b>
                  <p>
                    {c.lastMessage || c.last_message || c.content || "开始交流"}
                  </p>
                </div>
                <ChevronRight size={15} />
              </button>
            ))
          ) : (
            <p className="small-empty">
              还没有会话。
              <br />
              从资源详情或人脉页发起交流。
            </p>
          )}
        </aside>
        <section className="message-window">
          {selected ? (
            <>
              <div className="message-window-head">
                <span className="avatar">
                  {selected.name?.slice(0, 1) || "询"}
                </span>
                <b>{selected.name || "合作伙伴"}</b>
                <span>合作交流</span>
              </div>
              <div className="direct-messages">
                {msgs.length ? (
                  msgs.map((m) => (
                    <div
                      key={m.id}
                      className={
                        (m.senderId || m.sender_id) === ctx.user.id
                          ? "outgoing"
                          : "incoming"
                      }
                    >
                      <p>{m.content}</p>
                      <small>
                        {new Date(m.createdAt || m.created_at).toLocaleString(
                          "zh-CN",
                        )}
                      </small>
                    </div>
                  ))
                ) : (
                  <Empty title="说声你好，开始一次交流" href={null} />
                )}
              </div>
              <form
                className="message-input"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!input.trim()) return;
                  setBusy(true);
                  try {
                    await api("/messages", "POST", {
                      recipientId: selected.id,
                      content: input,
                    });
                    setInput("");
                    ctx.reload();
                  } catch (e) {
                    ctx.notify(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入消息…"
                  aria-label="消息内容"
                  maxLength={3000}
                />
                <button disabled={busy} className="btn primary">
                  <Send size={18} />
                  发送
                </button>
              </form>
            </>
          ) : (
            <Empty
              title="选择一段对话"
              text="与资源发布者、人脉好友一起探索合作机会。"
              href="/network"
              label="发现人脉"
            />
          )}
        </section>
      </div>
    </>
  );
}
function DownloadPage(ctx) {
  const [apk, setApk] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/apk")
      .then((d) => setApk(d.apk || d.latest || d.item || d))
      .catch((e) => setError(e.message));
  }, [ctx.refresh]);
  return (
    <div className="download-page">
      <div className="download-copy">
        <div className="hero-kicker">
          <Smartphone size={17} />
          AI人脉工具 Android 客户端
        </div>
        <h1>
          身边的机会，
          <br />
          随时都能连接。
        </h1>
        <p>
          把数字名片、人脉、资源与小赋 AI 装进口袋。
          <br />
          在每一个灵感出现的瞬间，发现新的可能。
        </p>
        {apk?.downloadUrl ? (
          <a className="btn dark" href={apk.downloadUrl} download>
            <Download size={20} />
            下载 Android APK
          </a>
        ) : (
          <button className="btn secondary" disabled>
            <Clock size={18} />
            安装包尚未发布
          </button>
        )}
        <div className="download-meta">
          {apk?.versionName && <span>版本 {apk.versionName}</span>}
          {apk?.size && <span>{(apk.size / 1024 / 1024).toFixed(1)} MB</span>}
          <span>Android 6.0 及以上</span>
        </div>
        {error && <p className="error">{error}</p>}
        {apk?.releaseNotes && (
          <p className="download-release">更新说明：{apk.releaseNotes}</p>
        )}
        <div className="download-help">
          <Shield size={20} />
          <p>
            下载后，按系统提示允许浏览器安装应用。
            <br />
            此客户端为本产品体验版，连接同一个账户与数据库。
          </p>
        </div>
        {apk?.sha256 && (
          <details>
            <summary>查看安装包校验信息</summary>
            <p className="hash-text">SHA256：{apk.sha256}</p>
          </details>
        )}
      </div>
      <div className="phone-mock">
        <div className="phone-top">
          9:41 <span>● ● ▰</span>
        </div>
        <div className="phone-brand">
          <img src="/icon.svg" alt="" />
          AI人脉工具 <Sparkles size={17} />
        </div>
        <div className="phone-hero">
          <h2>
            让闲置，
            <br />
            遇见新价值。
          </h2>
          <p>发现资源，也发现彼此</p>
          <img src="/media/studio.jpg" alt="共享空间" />
        </div>
        <div className="phone-cats">
          <span>
            <Building2 />
            空间
          </span>
          <span>
            <Briefcase />
            技能
          </span>
          <span>
            <Camera />
            物品
          </span>
          <span>
            <Users />
            人脉
          </span>
        </div>
        <h4>为你发现</h4>
        <div className="phone-cards">
          <div>
            <img src="/media/camera.jpg" alt="摄影资源" />
            让热爱持续发生
          </div>
          <div>
            <img src="/media/meeting.jpg" alt="协作空间" />
            发现更多好连接
          </div>
        </div>
        <div className="phone-nav">
          <Compass />
          <Layers />
          <Plus />
          <MessageCircle />
          <User />
        </div>
      </div>
    </div>
  );
}
function About(ctx) {
  const [done, setDone] = useState(false);
  return (
    <>
      <section className="about-hero">
        <img src="/icon.svg" alt="" />
        <h1>
          每一份闲置资源，
          <br />
          都有再次发光的可能。
        </h1>
        <p>
          AI人脉工具将 AI 与熟人连接结合，让技能、空间、物品与人脉
          <br />
          在真实的需求中创造新的价值。
        </p>
      </section>
      <div className="about-pillars">
        {[
          [
            Users,
            "从信任出发",
            "一张真实名片，一次朋友引荐，让合作从了解开始。",
          ],
          [
            Sparkles,
            "让 AI 帮一把",
            "描述需求、整理资源、发现人脉，少一点寻找，多一点连接。",
          ],
          [
            Link2,
            "让资源流动",
            "把闲置的可能连接到需要的人，让每份价值都找到新的位置。",
          ],
        ].map(([I, title, text]) => (
          <div key={title}>
            <I size={29} />
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div className="about-bottom">
        <section className="panel">
          <h2>关于这个作品</h2>
          <p>
            AI人脉工具是一套面向商务协作与熟人资源连接的独立产品，帮助用户更高效地整理资源、发现需求并建立可信连接。
          </p>
          <p>
            平台提供资源信息与合作连接服务，具体合作内容、交付方式和合作条件由双方进一步确认。
          </p>
          <div className="faq-list">
            <h3>常见问题</h3>
            <details>
              <summary>发布资源后，什么时候能被别人看到？</summary>
              <p>
                提交后可在用户中心查看。平台开启审核时，管理员通过后会按你设置的范围展示；你也可以随时编辑和下架。
              </p>
            </details>
            <details>
              <summary>如何与二度人脉建立联系？</summary>
              <p>
                在人脉页点击请求引荐。共同好友同意后，对方会收到好友申请，双方确认后即可交流。
              </p>
            </details>
            <details>
              <summary>为什么暂时不能给发布者私信？</summary>
              <p>
                为减少打扰，需要先成为好友，或者由对方接受你的合作申请，再发送私信。
              </p>
            </details>
            <details>
              <summary>AI 会自动发布内容或联系别人吗？</summary>
              <p>不会。小赋提供建议与草稿，发布、引荐和发送消息都由你确认。</p>
            </details>
            <details>
              <summary>这里的资源可以直接付款购买吗？</summary>
              <p>
                平台目前提供资源发现与合作连接，不提供支付功能。具体合作条件请双方确认。
              </p>
            </details>
          </div>
          <a
            className="text-link"
            href="https://www.xunfuaitech.com/"
            target="_blank"
            rel="noreferrer"
          >
            查看公司官网
            <ExternalLink size={16} />
          </a>
        </section>
        <section className="panel">
          <h2>聊聊合作想法</h2>{ctx.config?.supportEmail&&<p className="muted">服务邮箱：<a href={"mailto:"+ctx.config.supportEmail}>{ctx.config.supportEmail}</a></p>}
          {done ? (
            <div className="success-message">
              <CheckCircle2 />
              已收到你的咨询，可由管理员在后台查看。
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await api(
                    "/leads",
                    "POST",
                    Object.fromEntries(new FormData(e.target)),
                  );
                  setDone(true);
                } catch (e) {
                  ctx.notify(e.message);
                }
              }}
            >
              <div className="form-row">
                <Field label="姓名">
                  <input name="name" required placeholder="你的姓名" />
                </Field>
                <Field label="联系方式">
                  <input name="phone" required placeholder="手机号码或邮箱" />
                </Field>
              </div>
              <Field label="公司">
                <input name="company" placeholder="你的组织（选填）" />
              </Field>
              <Field label="合作想法">
                <textarea
                  name="message"
                  required
                  rows={3}
                  placeholder="介绍你的合作需求"
                />
              </Field>
              <button className="btn primary">
                发送咨询
                <Send size={16} />
              </button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
const adminTitles = {
  overview: "运营概览",
  users: "用户管理",
  resources: "资源审核",
  demands: "需求管理",
  posts: "机域管理",
  matches: "合作记录",
  leads: "咨询线索",
  models: "AI 模型管理",
  "ai-logs": "AI 调用日志",
  apk: "Android 应用管理",
  settings: "平台设置",
};
function Admin(ctx) {
  const section = ctx.pathname.split("/")[2] || "overview";
  if (!ctx.sessionReady)
    return (
      <div className="loading">
        <Loader2 className="spin" />
      </div>
    );
  if (!ctx.user) return <LoginPrompt onLogin={ctx.onLogin} />;
  if (ctx.user.role !== "admin")
    return (
      <Empty
        title="需要管理员权限"
        text="请使用管理员账户访问此页面。"
        href="/account"
        label="返回用户中心"
      />
    );
  return (
    <>
      <div className="admin-breadcrumb">
        <Shield size={15} />
        管理后台
        <ChevronRight size={13} />
        {adminTitles[section]}
      </div>
      <PageTitle
        title={adminTitles[section] || "平台管理"}
        desc={
          section === "models"
            ? "管理接入模型、验证可用性，所有密钥仅在服务器安全保存。"
            : section === "apk"
              ? "配置客户端、生成签名安装包，并管理发布记录。"
              : "查看真实业务数据，跟进平台运行状态。"
        }
        action={
          <button className="btn secondary small" onClick={ctx.reload}>
            <RefreshCw size={15} />
            刷新数据
          </button>
        }
      />
      {section === "overview" ? (
        <AdminOverview {...ctx} />
      ) : section === "models" ? (
        <AdminModels {...ctx} />
      ) : section === "apk" ? (
        <AdminApk {...ctx} />
      ) : section === "settings" ? (
        <AdminSettings {...ctx} />
      ) : (
        <AdminTable {...ctx} section={section} />
      )}
    </>
  );
}
function AdminOverview(ctx) {
  const [s, setS] = useState({}),
    [error, setError] = useState("");
  useEffect(() => {
    api("/admin/stats")
      .then(setS)
      .catch((e) => setError(e.message));
  }, [ctx.refresh]);
  const d = s.stats || s;
  return (
    <>
      {error && <p className="error">{error}</p>}
      <div className="admin-stat-grid">
        {[
          ["注册用户", d.users || d.userCount || 0, Users],
          ["资源总量", d.resources || d.resourceCount || 0, Package],
          ["需求总量", d.demands || d.demandCount || 0, FileText],
          ["合作连接", d.matches || d.matchCount || 0, Link2],
        ].map(([label, value, I]) => (
          <div key={label}>
            <span className="feature-icon">
              <I size={23} />
            </span>
            <p>{label}</p>
            <strong>
              {typeof value === "object" ? value.count || 0 : value}
            </strong>
            <small>平台实时数据</small>
          </div>
        ))}
      </div>
      <div className="admin-overview-columns">
        <section className="panel">
          <div className="panel-head">
            <h3>待办与运行状态</h3>
            <span className="live-dot" />
          </div>
          {[
            [
              "待审核资源",
              d.pendingResources || d.pending || 0,
              "/admin/resources",
            ],
            ["AI 调用次数", d.aiCalls || d.ai_calls || 0, "/admin/ai-logs"],
            ["咨询线索", d.leads || 0, "/admin/leads"],
          ].map(([label, value, url]) => (
            <Link className="overview-row" key={label} href={url}>
              <span>{label}</span>
              <b>{value}</b>
              <ChevronRight size={17} />
            </Link>
          ))}
          <div className="service-health">
            <CheckCircle2 size={20} />
            <div>
              <b>管理服务已连接</b>
              <p>数据来自当前平台数据库</p>
            </div>
          </div>
        </section>
        <section className="panel">
          <h3>快捷管理</h3>
          <div className="admin-shortcuts">
            {[
              ["/admin/models", "配置 AI 模型", Sparkles],
              ["/admin/resources", "处理资源审核", Shield],
              ["/admin/apk", "构建 Android 应用", Smartphone],
              ["/admin/settings", "修改平台配置", Settings],
            ].map(([url, title, I]) => (
              <Link href={url} key={url}>
                <I size={23} />
                {title}
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className="admin-explain">
        <h3>从一份资源，到一次有价值的连接</h3>
        <p>
          平台核心路径：完善名片 → 发布资源或需求 → AI 发现与匹配 →
          好友或二度人脉引荐 → 合作交流。
        </p>
      </section>
    </>
  );
}
function AdminTable(ctx) {
  const { items, loading, error } = useItems(
    "/admin/" + ctx.section,
    ctx.refresh,
  );
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState(null),
    [reject, setReject] = useState(null),
    [statusFilter, setStatusFilter] = useState("");
  const filtered = items.filter(
    (r) =>
      (!statusFilter || r.status === statusFilter) &&
      JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
  );
  const section = ctx.section;
  const action = async (id, body) => {
    try {
      await api("/admin/" + section + "/" + id, "PATCH", body);
      ctx.notify("状态已更新");
      ctx.reload();
    } catch (e) {
      ctx.notify(e.message);
    }
  };
  return (
    <section className="panel table-panel">
      <div className="table-toolbar">
        <h3>
          {adminTitles[section]}{" "}
          <span className="count-badge">{items.length}</span>
        </h3>
        <select
          className="table-filter"
          aria-label="按状态筛选"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">全部状态</option>
          {[...new Set(items.map((r) => r.status).filter(Boolean))].map(
            (st) => (
              <option key={st} value={st}>
                {{
                  approved: "已通过",
                  pending: "待审核",
                  rejected: "已拒绝",
                  archived: "已下架",
                  published: "已发布",
                  active: "正常",
                  disabled: "已停用",
                  open: "开放中",
                  closed: "已关闭",
                  success: "成功",
                  error: "失败",
                  new: "待联系",
                  contacted: "已联系",
                  hidden: "已隐藏",
                  accepted: "已接受",
                  completed: "已完成",
                  cancelled: "已取消",
                }[st] || st}
              </option>
            ),
          )}
        </select>
        <div className="search-box">
          <Search size={17} />
          <input
            placeholder="搜索当前列表"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <div className="loading">
          <Loader2 className="spin" />
        </div>
      ) : filtered.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>
                  {section === "users"
                    ? "用户"
                    : section === "ai-logs"
                      ? "模型 / 功能"
                      : "内容"}
                </th>
                <th>
                  {section === "users"
                    ? "角色 / 联系方式"
                    : section === "ai-logs"
                      ? "耗时 / 用量"
                      : "发布者 / 类型"}
                </th>
                <th>状态</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="table-id">#{r.id}</span>
                  </td>
                  <td>
                    <b>
                      {r.name ||
                        r.title ||
                        r.model ||
                        r.modelName ||
                        r.resourceTitle ||
                        r.resource_title ||
                        r.demand_title ||
                        r.action ||
                        "记录 #" + r.id}
                    </b>
                    <p className="table-desc">
                      {r.description ||
                        r.message ||
                        r.prompt ||
                        r.error ||
                        r.email ||
                        ""}
                    </p>
                  </td>
                  <td>
                    {section === "users" ? (
                      <>
                        <span className="tag">
                          {r.role === "admin" ? "管理员" : "用户"}
                        </span>
                        <small>{r.email}</small>
                      </>
                    ) : section === "ai-logs" ? (
                      <>
                        {r.durationMs || r.duration_ms || r.latency_ms || 0} ms
                        <small>
                          {r.promptTokens || r.completionTokens
                            ? (r.promptTokens || 0) +
                              (r.completionTokens || 0) +
                              " tokens"
                            : "用量未返回"}{" "}
                          · {actionNames[r.action] || r.action}
                        </small>
                      </>
                    ) : (
                      <>
                        {r.ownerName ||
                          r.owner_name ||
                          r.sender_name ||
                          r.phone ||
                          "—"}
                        <small>{r.category || r.company || r.type || ""}</small>
                      </>
                    )}
                  </td>
                  <td>
                    <Status
                      value={
                        r.status ||
                        (r.success === 1
                          ? "success"
                          : r.success === 0
                            ? "failed"
                            : "active")
                      }
                    />
                  </td>
                  <td className="date-cell">
                    {r.createdAt || r.created_at
                      ? new Date(r.createdAt || r.created_at).toLocaleString(
                          "zh-CN",
                        )
                      : "—"}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => setSelected(r)}>详情</button>
                      {section === "users" && r.id !== ctx.user.id && (
                        <button
                          onClick={() =>
                            action(r.id, {
                              status:
                                r.status === "disabled" ? "active" : "disabled",
                            })
                          }
                        >
                          {r.status === "disabled" ? "启用" : "停用"}
                        </button>
                      )}
                      {section === "resources" && (
                        <>
                          <button
                            onClick={() =>
                              action(r.id, { status: "published" })
                            }
                          >
                            通过
                          </button>
                          <button
                            className="danger-text"
                            onClick={() => setReject(r)}
                          >
                            拒绝
                          </button>
                        </>
                      )}
                      {section === "demands" && (
                        <button
                          onClick={() =>
                            action(r.id, {
                              status:
                                r.status === "closed" ? "active" : "closed",
                            })
                          }
                        >
                          {r.status === "closed" ? "开放" : "关闭"}
                        </button>
                      )}
                      {section === "posts" && (
                        <button
                          onClick={() =>
                            action(r.id, {
                              status:
                                r.status === "hidden" ? "published" : "hidden",
                            })
                          }
                        >
                          {r.status === "hidden" ? "恢复展示" : "隐藏动态"}
                        </button>
                      )}
                      {section === "leads" && (
                        <button
                          onClick={() =>
                            action(r.id, {
                              status:
                                r.status === "new" ? "contacted" : "closed",
                            })
                          }
                        >
                          {r.status === "new" ? "标记已联系" : "关闭反馈"}
                        </button>
                      )}
                      {section === "matches" && r.status === "accepted" && (
                        <button
                          onClick={() => action(r.id, { status: "completed" })}
                        >
                          完成
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title="暂无相关记录"
          text="新的平台活动会显示在这里。"
          href={null}
        />
      )}
      <div className="table-foot">
        共 {filtered.length} 条记录 · 数据实时读取自 MySQL
      </div>
      {selected && (
        <Modal title="记录详情" onClose={() => setSelected(null)} wide>
          <div className="record-detail">
            {Object.entries(selected)
              .filter(
                ([k]) => !/(password|secret|api_key|apiKey|token)/i.test(k),
              )
              .map(([k, v]) => (
                <div key={k}>
                  <b>
                    {{
                      id: "编号",
                      name: "姓名",
                      email: "邮箱",
                      title: "标题",
                      description: "详细描述",
                      message: "留言",
                      content: "内容",
                      phone: "联系方式",
                      company: "公司",
                      status: "状态",
                      error: "错误信息",
                      created_at: "创建时间",
                      model: "模型",
                      action: "功能",
                      response: "响应",
                      prompt: "请求",
                    }[k] || k}
                  </b>
                  <p>
                    {typeof v === "object"
                      ? JSON.stringify(v, null, 2)
                      : String(v ?? "—")}
                  </p>
                </div>
              ))}
          </div>
        </Modal>
      )}
      {reject && (
        <Modal title="反馈审核原因" onClose={() => setReject(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await action(reject.id, {
                status: "rejected",
                reason: new FormData(e.target).get("reason"),
              });
              setReject(null);
            }}
          >
            <p className="muted">{reject.title}</p>
            <Field label="拒绝原因">
              <textarea
                name="reason"
                required
                minLength={3}
                rows={4}
                placeholder="说明需要补充或修改的信息，帮助发布者完善资源"
              />
            </Field>
            <button className="btn primary full">确认拒绝并反馈</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
function AdminModels(ctx) {
  const { items, error } = useItems("/admin/models", ctx.refresh);
  const [edit, setEdit] = useState(null),
    [busy, setBusy] = useState(null),
    [result, setResult] = useState(null);
  const test = async (id) => {
    setBusy(id);
    setResult(null);
    try {
      const d = await api("/admin/models/" + id + "/test", "POST");
      setResult(d);
      ctx.reload();
      ctx.notify(d.success === false ? "模型测试失败" : "模型测试完成");
    } catch (e) {
      setResult({ error: e.message });
      ctx.notify("模型测试未通过");
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <div className="models-tip">
        <Shield size={22} />
        <p>
          API
          密钥仅保存于服务端，前台通过受保护的接口调用。每次测试会产生真实上游请求。
        </p>
        <button className="btn primary small" onClick={() => setEdit({})}>
          <Plus size={16} />
          添加模型
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="model-grid">
        {items.map((m) => (
          <section className="panel model-card" key={m.id}>
            <div className="panel-head">
              <span className="model-logo">
                <Sparkles size={25} />
              </span>
              <div className="model-badges">
                {m.isDefault && <span className="tag">默认模型</span>}
                <Status value={m.enabled ? "active" : "disabled"} />
              </div>
            </div>
            <h3>{m.name}</h3>
            <p className="model-code">{m.model}</p>
            <div className="model-info">
              <span>API 地址</span>
              <b>{m.baseUrl || m.base_url}</b>
              <span>密钥</span>
              <b>
                {m.apiKeyMasked ||
                  m.maskedKey ||
                  m.masked_key ||
                  m.apiKey ||
                  "已安全保存"}
              </b>
              <span>最近测试</span>
              <b>
                {{ success: "连接成功", error: "连接失败" }[m.lastTestStatus] ||
                  m.lastStatus ||
                  "尚未测试"}
              </b>
            </div>
            <div className="model-actions">
              <button
                className="btn primary small"
                disabled={busy !== null}
                onClick={() => test(m.id)}
              >
                {busy === m.id ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Activity size={16} />
                )}
                测试模型
              </button>
              <button
                className="btn secondary small"
                onClick={() => setEdit(m)}
              >
                <Edit3 size={15} />
                编辑
              </button>
              {!m.isDefault && m.enabled && (
                <button
                  className="text-link"
                  onClick={async () => {
                    try {
                      await api("/admin/models/" + m.id, "PATCH", {
                        isDefault: true,
                      });
                      ctx.reload();
                      ctx.notify("默认模型已更新");
                    } catch (e) {
                      ctx.notify(e.message);
                    }
                  }}
                >
                  设为默认
                </button>
              )}
              <button
                className="text-link"
                onClick={async () => {
                  try {
                    await api("/admin/models/" + m.id, "PATCH", {
                      enabled: !m.enabled,
                    });
                    ctx.reload();
                  } catch (e) {
                    ctx.notify(e.message);
                  }
                }}
              >
                {m.enabled ? "停用" : "启用"}
              </button>
            </div>
          </section>
        ))}
      </div>
      {result && (
        <section
          className={
            "panel test-result " +
            (result.error || result.success === false ? "test-failed" : "")
          }
        >
          <h3>
            {result.error || result.success === false
              ? "模型测试未通过"
              : "模型测试结果"}
          </h3>
          <p className="pre-wrap">
            {result.answer ||
              result.response ||
              result.message ||
              result.error ||
              JSON.stringify(result, null, 2)}
          </p>
          {(result.durationMs || result.latencyMs) && (
            <small>响应耗时 {result.durationMs || result.latencyMs} ms</small>
          )}
        </section>
      )}
      {edit !== null && (
        <Modal
          title={edit.id ? "编辑 AI 模型" : "添加 AI 模型"}
          onClose={() => setEdit(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const body = Object.fromEntries(new FormData(e.target));
              body.enabled = body.enabled === "true";
              if (!body.apiKey) delete body.apiKey;
              try {
                await api(
                  "/admin/models" + (edit.id ? "/" + edit.id : ""),
                  edit.id ? "PATCH" : "POST",
                  body,
                );
                setEdit(null);
                ctx.reload();
                ctx.notify("模型配置已保存");
              } catch (e) {
                ctx.notify(e.message);
              }
            }}
          >
            <Field label="显示名称">
              <input
                name="name"
                required
                defaultValue={edit.name}
                placeholder="小赋智能助手"
              />
            </Field>
            <Field label="模型标识">
              <input
                name="model"
                required
                defaultValue={edit.model}
                placeholder="服务商提供的模型名称"
              />
            </Field>
            <Field label="API 基础地址">
              <input
                name="baseUrl"
                type="url"
                required
                defaultValue={edit.baseUrl || edit.base_url}
                placeholder="https://api.example.com/v1"
              />
            </Field>
            <Field label={edit.id ? "新密钥（留空保留原值）" : "API 密钥"}>
              <input
                name="apiKey"
                type="password"
                autoComplete="new-password"
                required={!edit.id}
                placeholder="sk-…"
              />
            </Field>
            <Field label="启用状态">
              <select
                name="enabled"
                defaultValue={String(
                  edit.enabled !== false && edit.enabled !== 0,
                )}
              >
                <option value="true">启用</option>
                <option value="false">停用</option>
              </select>
            </Field>
            <button className="btn primary full">
              保存模型配置
              <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function AdminApk(ctx) {
  const [config, setConfig] = useState(null),
    [builds, setBuilds] = useState([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    api("/admin/apk")
      .then((d) => {
        setConfig(d.config || {});
        setBuilds(d.builds || d.items || []);
      })
      .catch((e) => setError(e.message));
  }, [ctx.refresh]);
  const build = async () => {
    setBusy("build");
    setError("");
    try {
      const d = await api("/admin/apk/build", "POST", {});
      ctx.notify(d.message || "APK 构建已完成");
      ctx.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <div className="apk-layout">
        <section className="panel">
          <div className="panel-head">
            <h3>应用配置</h3>
            <Smartphone size={23} />
          </div>
          {config ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy("save");
                try {
                  const b = Object.fromEntries(new FormData(e.target));
                  b.versionCode = Number(b.versionCode);
                  await api("/admin/apk", "PATCH", b);
                  ctx.reload();
                  ctx.notify("客户端配置已保存");
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy("");
                }
              }}
            >
              <Field label="应用名称">
                <input
                  name="appName"
                  required
                  defaultValue={config.appName || "AI人脉工具"}
                />
              </Field>
              <Field label="网站地址">
                <input
                  name="serverUrl"
                  type="url"
                  required
                  defaultValue={config.serverUrl || "http://154.40.47.111:3050"}
                />
              </Field>
              <div className="form-row">
                <Field label="显示版本">
                  <input
                    name="versionName"
                    required
                    defaultValue={config.versionName || "1.0.0"}
                  />
                </Field>
                <Field label="版本序号">
                  <input
                    name="versionCode"
                    type="number"
                    min="1"
                    required
                    defaultValue={config.versionCode || 1}
                  />
                </Field>
              </div>
              <Field label="更新说明">
                <textarea
                  name="releaseNotes"
                  rows={3}
                  defaultValue={
                    config.releaseNotes ||
                    "优化资源发现、人脉连接与小赋 AI 体验。"
                  }
                />
              </Field>
              <Field label="应用包名">
                <input value={config.packageName || "com.xunfu.app"} readOnly />
              </Field>
              <button disabled={!!busy} className="btn primary">
                保存配置
                <Check size={17} />
              </button>
            </form>
          ) : (
            <div className="loading">
              <Loader2 className="spin" />
            </div>
          )}
        </section>
        <section className="panel apk-build">
          <span className="build-icon">
            <Package size={38} />
          </span>
          <h3>生成签名 Android 安装包</h3>
          <p>使用已保存的配置构建 APK。生成后可在前台下载中心直接下载安装。</p>
          <button className="btn dark" disabled={!!busy} onClick={build}>
            {busy === "build" ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <Smartphone size={18} />
            )}{" "}
            {busy === "build" ? "正在构建，请稍候…" : "生成 APK"}
          </button>
          <div className="upload-divider">或上传已有安装包</div>
          <label className="btn secondary upload-label">
            <Upload size={18} />
            上传 APK
            <input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              disabled={!!busy}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setBusy("upload");
                setError("");
                try {
                  const fd = new FormData();
                  fd.append("file", f);
                  await api("/admin/apk/upload", "POST", fd);
                  ctx.notify("APK 已上传并验证");
                  ctx.reload();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy("");
                  e.target.value = "";
                }
              }}
            />
          </label>
          <Link className="text-link" href="/download">
            查看下载页面
            <ExternalLink size={16} />
          </Link>
        </section>
      </div>
      {error && <p className="error">{error}</p>}
      <section className="panel table-panel">
        <div className="panel-head">
          <h3>构建与上传记录</h3>
          <span>{builds.length} 个版本</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>应用 / 版本</th>
                <th>状态</th>
                <th>文件大小</th>
                <th>时间</th>
                <th>安装包</th>
              </tr>
            </thead>
            <tbody>
              {builds.map((b) => (
                <tr key={b.id}>
                  <td>
                    <b>
                      {b.appName || "AI人脉工具"} {b.versionName}
                    </b>
                    <small>{b.fileName}</small>
                  </td>
                  <td>
                    <Status value={b.status} />
                  </td>
                  <td>
                    {b.size ? (b.size / 1024 / 1024).toFixed(2) + " MB" : "—"}
                  </td>
                  <td className="date-cell">
                    {b.createdAt
                      ? new Date(b.createdAt).toLocaleString("zh-CN")
                      : "—"}
                  </td>
                  <td>
                    {b.downloadUrl ? (
                      <a className="text-link" href={b.downloadUrl} download>
                        <Download size={16} />
                        下载
                      </a>
                    ) : (
                      <span>{b.error || "处理中"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!builds.length && (
          <Empty
            title="还没有安装包"
            text="保存配置后，点击生成 APK。"
            href={null}
          />
        )}
      </section>
    </>
  );
}
function AdminSettings(ctx) {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    api("/admin/settings")
      .then((d) => setSettings(d.settings || d))
      .catch((e) => ctx.notify(e.message));
  }, [ctx.refresh]);
  if (!settings)
    return (
      <div className="loading">
        <Loader2 className="spin" />
      </div>
    );
  return (
    <form
      className="panel profile-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api(
            "/admin/settings",
            "PATCH",
            Object.fromEntries(new FormData(e.target)),
          );
          ctx.notify("平台设置已保存");
          ctx.reload();
        } catch (e) {
          ctx.notify(e.message);
        }
      }}
    >
      <h3>平台信息与运营配置</h3>
      <Field label="平台名称">
        <input name="siteName" defaultValue={settings.siteName || "AI人脉工具"} />
      </Field>
      <Field label="平台介绍">
        <textarea
          name="siteDescription"
          rows={3}
          defaultValue={
            settings.siteDescription || "发现资源，也发现彼此。让连接产生价值。"
          }
        />
      </Field>
      <Field label="服务联系邮箱">
        <input
          name="supportEmail"
          type="email"
          defaultValue={settings.supportEmail || ""}
        />
      </Field>
      <Field label="资源发布审核">
        <select
          name="requireReview"
          defaultValue={String(settings.requireReview ?? true)}
        >
          <option value="true">开启：发布后由管理员审核</option>
          <option value="false">关闭：直接发布</option>
        </select>
      </Field>
      <Field label="AI 每日调用上限（每位用户）">
        <input
          name="aiDailyLimit"
          type="number"
          min="1"
          max="10000"
          defaultValue={settings.aiDailyLimit || 50}
        />
      </Field>
      <Field label="平台公告">
        <textarea
          name="announcement"
          rows={3}
          defaultValue={settings.announcement || ""}
          placeholder="写给平台用户的最新消息"
        />
      </Field>
      <button className="btn primary">
        保存平台设置
        <Check size={17} />
      </button>
    </form>
  );
}
function InvitePage(ctx) {
  const [url, setUrl] = useState("");
  useEffect(
    () => setUrl(window.location.origin + "/?invite=" + ctx.user.id),
    [ctx.user],
  );
  return (
    <section className="panel invite-panel">
      <div className="network-symbol">
        <Users size={40} />
      </div>
      <h2>把好连接，分享给你的朋友。</h2>
      <p>
        邀请朋友加入AI人脉工具，完善名片后，通过注册邮箱添加好友。
        <br />
        这个链接用于邀请访问，不包含奖励或收益归因。
      </p>
      <div className="invite-link">
        <input value={url} readOnly aria-label="邀请链接" />
        <button
          className="btn primary"
          onClick={() => {
            copyText(url);
            ctx.notify("邀请链接已复制");
          }}
        >
          <Copy size={17} />
          复制链接
        </button>
      </div>
      <Link className="text-link" href="/network">
        去添加朋友
        <ArrowUpRight size={16} />
      </Link>
    </section>
  );
}
function Feed(ctx) {
  const [type, setType] = useState("all"),
    [mine, setMine] = useState(false),
    [compose, setCompose] = useState(false),
    [post, setPost] = useState(null),
    [comments, setComments] = useState([]),
    [comment, setComment] = useState("");
  const { items, loading, error } = useItems(
    "/posts" + (mine ? "?mine=1" : ""),
    ctx.refresh,
  );
  const filtered = items.filter((p) => type === "all" || p.type === type);
  const labels = {
    resource: "资源分享",
    demand: "合作需求",
    insight: "行业见解",
  };
  const open = async (p) => {
    try {
      const d = await api("/posts/" + p.id + "/comments");
      setComments(d.items || []);
      setPost(p);
    } catch (e) {
      ctx.notify(e.message);
    }
  };
  return (
    <>
      <PageTitle
        title="机域，遇见同频的人"
        desc="分享一份资源、一个想法，或一次正在发生的合作。"
        action={
          <button
            className="btn primary"
            onClick={() => ctx.requireUser(() => setCompose(true))}
          >
            <Plus size={17} />
            发布动态
          </button>
        }
      />
      <div className="feed-top">
        <div className="tabs">
          {[
            ["all", "全部动态"],
            ["resource", "资源分享"],
            ["demand", "合作需求"],
            ["insight", "行业见解"],
          ].map(([k, t]) => (
            <button
              key={k}
              className={type === k ? "active" : ""}
              onClick={() => setType(k)}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          className={"btn secondary small " + (mine ? "selected" : "")}
          onClick={() => ctx.requireUser(() => setMine(!mine))}
        >
          {mine ? "查看全部" : "我的动态"}
        </button>
      </div>
      <div className="feed-layout">
        <section>
          {error && <p className="error">{error}</p>}
          {loading ? (
            <div className="loading">
              <Loader2 className="spin" />
            </div>
          ) : filtered.length ? (
            filtered.map((p) => (
              <article className="post-card" key={p.id}>
                <div className="post-head">
                  <span className="avatar">
                    {p.ownerName?.slice(0, 1) || "询"}
                  </span>
                  <div>
                    <b>{p.ownerName}</b>
                    <small>
                      {new Date(p.createdAt).toLocaleString("zh-CN")}{" "}
                      {p.demo ? " · 演示动态" : ""}
                    </small>
                  </div>
                  <span className="tag">{labels[p.type] || p.type}</span>
                </div>
                <h2>{p.title}</h2>
                <p className="pre-wrap">{p.content}</p>
                <div className="post-meta">
                  <span>{p.industry || "价值连接"}</span>
                  <Status value={p.visibility} />
                  {p.status !== "published" && <Status value={p.status} />}
                </div>
                <div className="post-actions">
                  <button
                    className={p.liked ? "liked" : ""}
                    onClick={() =>
                      ctx.requireUser(async () => {
                        try {
                          await api("/posts/" + p.id + "/like", "POST");
                          ctx.reload();
                        } catch (e) {
                          ctx.notify(e.message);
                        }
                      })
                    }
                  >
                    <Heart size={17} fill={p.liked ? "currentColor" : "none"} />
                    {p.likeCount || 0} 赞同
                  </button>
                  <button onClick={() => open(p)}>
                    <MessageCircle size={17} />
                    {p.commentCount || 0} 条回应
                  </button>
                  {p.userId === ctx.user?.id && p.status !== "hidden" && (
                    <button
                      className="post-hide"
                      onClick={async () => {
                        try {
                          await api("/posts/" + p.id, "PATCH", {
                            status:
                              p.status === "closed" ? "published" : "closed",
                          });
                          ctx.reload();
                          ctx.notify("动态状态已更新");
                        } catch (e) {
                          ctx.notify(e.message);
                        }
                      }}
                    >
                      {p.status === "closed" ? "恢复展示" : "收起动态"}
                    </button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <Empty
              title="这里还没有动态"
              text="分享一个合作想法，让同频的人找到你。"
              href={null}
            />
          )}
        </section>
        <aside>
          <section className="panel feed-note">
            <Layers size={27} />
            <h3>好的机会，来自一次分享</h3>
            <p>
              你正在做什么？
              <br />
              你能提供什么？
              <br />
              你希望遇见谁？
            </p>
            <button
              className="btn primary full"
              onClick={() => ctx.requireUser(() => setCompose(true))}
            >
              分享我的想法
              <Plus size={16} />
            </button>
          </section>
          <Link className="feed-side-link" href="/demands">
            <FileText size={21} />
            <div>
              <b>去需求大厅看看</b>
              <p>找到正在寻找你的合作</p>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <Link className="feed-side-link" href="/ai">
            <Sparkles size={21} />
            <div>
              <b>让小赋整理思路</b>
              <p>把想法变成清晰的表达</p>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        </aside>
      </div>
      {compose && (
        <Modal title="分享一个新动态" onClose={() => setCompose(false)} wide>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api(
                  "/posts",
                  "POST",
                  Object.fromEntries(new FormData(e.target)),
                );
                setCompose(false);
                ctx.reload();
                ctx.notify("动态已发布");
              } catch (e) {
                ctx.notify(e.message);
              }
            }}
          >
            <div className="form-row">
              <Field label="动态类型">
                <select name="type">
                  {Object.entries(labels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="可见范围">
                <select name="visibility">
                  <option value="public">公开可见</option>
                  <option value="contacts">仅好友</option>
                  <option value="second_degree">好友及二度人脉</option>
                </select>
              </Field>
            </div>
            <Field label="标题">
              <input
                name="title"
                required
                minLength={3}
                maxLength={150}
                placeholder="一句话介绍你想分享的事"
              />
            </Field>
            <Field label="正文">
              <textarea
                name="content"
                required
                minLength={8}
                maxLength={5000}
                rows={6}
                placeholder="谈谈你的资源、合作想法或行业见解……"
              />
            </Field>
            <Field label="行业或领域">
              <input
                name="industry"
                maxLength={80}
                placeholder="例如：创意设计、教育、产品与技术"
              />
            </Field>
            <button className="btn primary full">
              发布动态
              <Send size={16} />
            </button>
          </form>
        </Modal>
      )}
      {post && (
        <Modal title="动态回应" onClose={() => setPost(null)} wide>
          <h3>{post.title}</h3>
          <p className="muted pre-wrap">{post.content}</p>
          <div className="post-comments">
            {comments.length ? (
              comments.map((c) => (
                <div key={c.id}>
                  <span className="avatar tiny">
                    {(c.ownerName || c.name || "询").slice(0, 1)}
                  </span>
                  <div>
                    <b>{c.ownerName || c.name}</b>
                    <p>{c.content}</p>
                    <small>
                      {new Date(c.createdAt).toLocaleString("zh-CN")}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">还没有回应，说说你的想法吧。</p>
            )}
          </div>
          <form
            className="comment-form"
            onSubmit={(e) => {
              e.preventDefault();
              ctx.requireUser(async () => {
                try {
                  await api("/posts/" + post.id + "/comments", "POST", {
                    content: comment,
                  });
                  setComment("");
                  const d = await api("/posts/" + post.id + "/comments");
                  setComments(d.items || []);
                  ctx.reload();
                } catch (e) {
                  ctx.notify(e.message);
                }
              });
            }}
          >
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              maxLength={1500}
              placeholder="认真回应，让连接发生"
            />
            <button className="btn primary">
              <Send size={17} />
              回应
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
