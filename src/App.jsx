import { companyStorage } from './services/companyBranding.js';
import { featureEnabled } from './services/companyBranding.js';
import React, { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import LoginPage from "./pages/LoginPage.jsx";
import OfflineVisitPortal from "./pages/OfflineVisitPortal.jsx";
import TrainerOfflineVisitPortal from "./pages/TrainerOfflineVisitPortal.jsx";
import { listOfflineVisits } from "./services/offlineVisitStore.js";
import { getSession, login, logout, request } from "./services/authApi.js";
import { canUseOfflineMode, offlineModeFor } from "./domain/offlineModes.js";
import { cacheTrainerOfflineCatalog } from "./services/trainerOfflineCatalog.js";
import { globalStyle, containerStyle, cardStyle, inputStyle, btnPrimary, footerStyle, renderBackgroundStationary, renderResponsiveStyles } from "./ui/portalPresentation.jsx";
import PortalLoading from "./ui/PortalLoading.jsx";

const loadPortalApp = () => import("./PortalApp.jsx");
const preloadPortal = (allPages = false) => allPages ? Promise.all([
  loadPortalApp(),
  import("./pages/AdminPortal.jsx"),
  import("./pages/MarketerPortal.jsx")
]) : loadPortalApp();
const PortalApp = lazy(loadPortalApp);
const TrainerPortal = lazy(() => import("./pages/TrainerPortal.jsx"));
const PROFILE_KEY = "jp-offline-marketer-profile";
function cachedMarketer() {
  try { return JSON.parse(companyStorage.getItem(PROFILE_KEY) || "null"); }
  catch { return null; }
}

class PortalLoadErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { console.error("Portal failed to load:", error, info); }
  render() {
    if (this.state.failed) return <div role="alert" style={{ padding: "32px", textAlign: "center" }}>Portal could not load. <button type="button" onClick={() => window.location.reload()}>Refresh</button></div>;
    return this.props.children;
  }
}

export default function App() {
  const [session, setSession] = useState({ loading: true, user: null });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineDismissed, setOfflineDismissed] = useState(false);
  const [offlineProfile, setOfflineProfile] = useState(cachedMarketer);
  const [offlineSelection, setOfflineSelection] = useState("marketer");
  const [syncState, setSyncState] = useState({ pending: 0, busy: false, message: "" });
  const syncing = useRef(null);
  const skipSessionRestore = useRef(false);

  const refreshPending = async () => {
    const email = String(session.user?.email || "").toLowerCase();
    const drafts = await listOfflineVisits();
    const accountId = session.user?.trainerId || session.user?.marketerId || "";
    const pending = drafts.filter((item) => String(item.ownerEmail || "").toLowerCase() === email && canUseOfflineMode(session.user, item.mode === "trainer" ? "trainer" : "marketer") && (item.mode !== "trainer" || item.ownerAccountId === accountId)).length;
    setSyncState((current) => ({ ...current, pending }));
    return pending;
  };
  useEffect(() => {
    refreshPending().catch(() => {});
    const changed = () => { refreshPending().catch(() => {}); };
    window.addEventListener("offline-visits-changed", changed);
    return () => window.removeEventListener("offline-visits-changed", changed);
  }, [session.user?.email]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    if (!["marketer", "trainer"].includes(session.user?.role)) return;
    const profile = { email: session.user.email, name: session.user.name || "", role: session.user.role, marketerId: session.user.marketerId || "", trainerId: session.user.trainerId || "", offlineMode: offlineModeFor(session.user), assignedCityIds: session.user.assignedCityIds || [], assignedAreaIds: session.user.assignedAreaIds || [] };
    try { companyStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* Private browsing may block storage. */ }
    setOfflineProfile(profile);
    setOfflineSelection(profile.offlineMode === "trainer" ? "trainer" : "marketer");
  }, [session.user]);

  useEffect(() => {
    if (!online || session.user?.role !== "trainer") return;
    request("/trainers/locations/cities").then(({ cities }) => cacheTrainerOfflineCatalog(session.user.email, session.user.trainerId, { cities })).catch(() => {});
  }, [online, session.user?.email, session.user?.role]);

  const syncDrafts = async (manual = false) => {
    if (!online || !["marketer", "trainer"].includes(session.user?.role)) return { synced: 0, error: "Connect to the internet and sign in with the same account to sync." };
    if (syncing.current) return syncing.current;
    syncing.current = (async () => {
      setSyncState((current) => ({ ...current, busy: true, message: "" }));
      try {
        const drafts = await listOfflineVisits();
        const accountId = session.user.trainerId || session.user.marketerId || "";
        const matching = drafts.filter((item) => String(item.ownerEmail || "").toLowerCase() === String(session.user.email || "").toLowerCase() && canUseOfflineMode(session.user, item.mode === "trainer" ? "trainer" : "marketer") && (item.mode !== "trainer" || item.ownerAccountId === accountId));
        if (!matching.length) {
          if (manual) setSyncState((current) => ({ ...current, message: drafts.length ? `Pending visits belong to ${drafts[0].ownerEmail}. Sign in with that email to sync.` : "No offline visits pending for this account." }));
          return { synced: 0 };
        }
        let synced = 0;
        if (matching.some((item) => item.mode !== "trainer")) {
          const { syncOfflineVisits } = await import("./services/offlineVisitSync.js");
          synced += (await syncOfflineVisits(session.user)).synced;
        }
        if (matching.some((item) => item.mode === "trainer")) {
          const { syncTrainerOfflineVisits } = await import("./services/trainerOfflineVisitSync.js");
          synced += (await syncTrainerOfflineVisits(session.user)).synced;
        }
        const result = { synced };
        setSyncState((current) => ({ ...current, message: result.synced ? `${result.synced} visit(s) synced.` : "", syncedAt: result.synced ? Date.now() : current.syncedAt }));
        return result;
      }
      catch (failure) {
        console.warn("Offline visits remain on this device until sync succeeds:", failure);
        setSyncState((current) => ({ ...current, message: failure.message || "Sync failed." }));
        return { synced: 0, error: failure.message };
      }
      finally { syncing.current = null; setSyncState((current) => ({ ...current, busy: false })); refreshPending().catch(() => {}); }
    })();
    return syncing.current;
  };
  useEffect(() => { syncDrafts(); }, [online, session.user]);

  useEffect(() => {
    let active = true;
    if (skipSessionRestore.current) return;
    if (!online) { setSession((current) => current.loading ? { loading: false, user: null } : current); return; }
    const slowSession = window.setTimeout(() => {
      if (active) setSession((current) => current.loading ? { loading: false, user: null } : current);
    }, 3500);
    getSession()
      .then((user) => { window.clearTimeout(slowSession); if (active && !skipSessionRestore.current) setSession((current) => current.user ? current : { loading: false, user }); })
      .catch(() => {
        window.clearTimeout(slowSession);
        if (active && !skipSessionRestore.current) {
          setSession((current) => current.user ? current : { loading: false, user: null });
        }
      });
    return () => { active = false; window.clearTimeout(slowSession); };
  }, [online]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (loginPending) return;
    // Password managers may fill the DOM without firing React's onChange.
    // Read the submitted form before changing state or awaiting the request.
    const form = new FormData(event.currentTarget);
    const submittedIdentifier = String(form.get("identifier") || "");
    const submittedPassword = String(form.get("password") || "");
    setError("");
    setLoginPending(true);
    try {
      const user = await login(submittedIdentifier, submittedPassword);
      setPassword("");
      skipSessionRestore.current = false;
      setSession({ loading: false, user });
      setOfflineMode(false);
      setOfflineDismissed(false);
      preloadPortal().catch(() => {});
    } catch (failure) {
      setError(failure.message || "Login failed");
    } finally {
      setLoginPending(false);
    }
  };

  const handleLogout = async () => {
    if (session.user?.role === "marketer") {
      try {
        const { removeNewsSubscription } = await import("./services/newsPush.js");
        await Promise.race([removeNewsSubscription(), new Promise((resolve) => setTimeout(resolve, 1500))]);
      } catch (failure) { console.warn("News notification cleanup failed:", failure); }
    }
    try { await logout(); } catch (failure) { console.error("Logout failed", failure); }
    setSession({ loading: false, user: null });
    setPassword("");
    setOfflineMode(false);
    setOfflineProfile(null);
    try { companyStorage.removeItem(PROFILE_KEY); } catch { /* Ignore blocked storage. */ }
  };

  const backFromOffline = () => {
    skipSessionRestore.current = true;
    setOfflineMode(false);
    setOfflineDismissed(true);
    setSession({ loading: false, user: null });
    if (online && session.user) logout().catch((failure) => console.warn("Offline exit sign out failed:", failure));
  };
  const offlineIdentity = ["marketer", "trainer"].includes(session.user?.role) ? session.user : offlineProfile;
  const assignedOfflineMode = offlineModeFor(offlineIdentity);
  const selectedOfflineMode = assignedOfflineMode === "both" ? offlineSelection : assignedOfflineMode;
  const offlineAvailable = Boolean(featureEnabled('offlineVisits') && featureEnabled('visits') && offlineIdentity && assignedOfflineMode !== "none");
  const offlineActive = offlineAvailable && (offlineMode || (!online && !offlineDismissed && (["marketer", "trainer"].includes(session.user?.role) || offlineProfile)));
  useEffect(() => {
    if (!offlineActive) return;
    if (!window.history.state?.jpOfflineVisitGuard) window.history.pushState({ ...window.history.state, jpOfflineVisitGuard: true }, "", window.location.href);
    const onBrowserBack = () => {
      window.history.pushState({ ...window.history.state, jpOfflineVisitGuard: true }, "", window.location.href);
      backFromOffline();
    };
    window.addEventListener("popstate", onBrowserBack);
    return () => window.removeEventListener("popstate", onBrowserBack);
  }, [offlineActive, online, session.user]);

  if (offlineActive) {
    const switcher = assignedOfflineMode === "both" ? <div className="offline-mode-switch" aria-label="Choose offline mode"><button type="button" className={selectedOfflineMode === "marketer" ? "active" : ""} onClick={() => setOfflineSelection("marketer")}>Marketer visits</button><button type="button" className={selectedOfflineMode === "trainer" ? "active" : ""} onClick={() => setOfflineSelection("trainer")}>Trainer visits</button></div> : null;
    const props = { user: ["marketer", "trainer"].includes(session.user?.role) ? session.user : null, cachedProfile: offlineProfile, online, onSignIn: () => setOfflineMode(false), onResume: () => setOfflineMode(false), onSync: syncDrafts, onBackToLogin: backFromOffline, switcher };
    return selectedOfflineMode === "trainer" ? <TrainerOfflineVisitPortal {...props} /> : <OfflineVisitPortal {...props} />;
  }
  if (session.loading) return <PortalLoading />;
  if (session.user) {
    if (session.user.role === "trainer") return <PortalLoadErrorBoundary><Suspense fallback={<PortalLoading />}><TrainerPortal user={session.user} onLogout={handleLogout} /></Suspense></PortalLoadErrorBoundary>;
    const identity = session.user.marketerId || session.user.email || session.user.role;
    return <PortalLoadErrorBoundary><Suspense fallback={<PortalLoading />}>
      <PortalApp key={session.user.role + ':' + identity} initialUser={session.user} onLogout={handleLogout} onSync={syncDrafts} syncState={syncState} online={online} />
    </Suspense></PortalLoadErrorBoundary>;
  }

  return <LoginPage context={{
    btnPrimary, cardStyle, containerStyle, error, footerStyle, globalStyle,
    handleLogin, identifier, inputStyle, loginPending, password, preloadPortal,
    renderBackgroundStationary, renderResponsiveStyles,
    setIdentifier, setPassword, setShowPassword, showPassword,
    onWorkOffline: () => { setOfflineDismissed(false); setOfflineMode(true); }, offlineAvailable, online
  }} />;
}
