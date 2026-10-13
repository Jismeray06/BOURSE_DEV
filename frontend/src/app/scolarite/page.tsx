"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import { DossierViewer } from "../../components/DossierViewer";
import { AdminSettingsPanel } from "../../components/AdminSettingsPanel";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { AccountPanel } from "../../components/AccountPanel";
import { CandidatureDocumentsPanel } from "../../components/CandidatureDocumentsPanel";
import { HeaderToolbar } from "../../components/HeaderToolbar";
import { usePolling } from "../../components/usePolling";
import { useInterfaceSettings, useSystemDark } from "../../components/useInterfaceSettings";
import { isDarkRendering, toggleLightDark } from "../../components/adminSettings";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Check,
  ClipboardCheck,
  Eye,
  FileSearch,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  Palette,
  RefreshCw,
  Search,
  Settings,
  UserCog,
  ShieldCheck,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
// Zone tactile confortable (44px) sur téléphone et tablette uniquement
const touch = "max-[1024px]:min-h-[44px]";
type Status = "SOUMIS" | "EN_REVISION" | "VALIDE" | "REFUSE";
type Tab = "dashboard" | "applications" | "history" | "documents" | "account" | "settings";
type Application = {
  id: string;
  establishment: string;
  level: string;
  program: string;
  status: Status;
  submittedAt: string | null;
  reviewNote: string | null;
  user: { fullName: string; email: string };
  quitus: { code: string } | null;
  reviewedBy: { fullName: string } | null;
};
const labels: Record<Status, string> = {
  SOUMIS: "À traiter",
  EN_REVISION: "En révision",
  VALIDE: "Validé",
  REFUSE: "Refusé",
};
const styles: Record<Status, string> = {
  SOUMIS: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  EN_REVISION: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  VALIDE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  REFUSE: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

export default function ScolaritePage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsTabId, setSettingsTabId] = useState<"appearance" | "behavior" | "identity">("appearance");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [dossierApplicationId, setDossierApplicationId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [settings, setSettings] = useInterfaceSettings("scolarite");
  const systemDark = useSystemDark();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const request = (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    headers.set(
      "Authorization",
      `Bearer ${sessionStorage.getItem("auth_token") ?? ""}`,
    );
    return fetch(`${apiUrl}${path}`, { ...options, headers });
  };
  // `silent` : actualisation en arrière-plan, sans message ni indicateur de chargement.
  const load = async (silent = false) => {
    if (
      !sessionStorage.getItem("auth_token") ||
      sessionStorage.getItem("user_role") !== "SCOLARITE_CENTRALE"
    ) {
      router.replace("/login");
      return;
    }
    if (!silent) {
      setLoading(true);
      setMessage("");
    }
    try {
      const response = await request("/scolarite/applications");
      if (response.status === 401) {
        sessionStorage.clear();
        router.replace("/login");
        return;
      }
      if (!response.ok) throw new Error("Impossible de charger les dossiers.");
      setApplications((await response.json()) as Application[]);
    } catch (error) {
      if (!silent) setMessage(error instanceof Error ? error.message : "Erreur de chargement.");
    } finally {
      if (!silent) setLoading(false);
    }
  };
  // Les nouveaux dossiers apparaissent dans la cloche sans recharger la page.
  usePolling(() => void load(true), 30_000);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const decide = async (
    application: Application,
    status: "VALIDE" | "REFUSE",
  ) => {
    const note = notes[application.id] ?? "";
    if (status === "REFUSE" && !note.trim()) {
      setMessage("Indiquez le motif du refus avant de rejeter le dossier.");
      return;
    }
    setProcessingId(application.id);
    try {
      const response = await request(
        `/scolarite/applications/${application.id}/decision`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, note }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok)
        throw new Error(
          result.message ?? "Impossible d’enregistrer la décision.",
        );
      setMessage(
        `Dossier de ${application.user.fullName} ${status === "VALIDE" ? "validé" : "refusé"}.`,
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erreur de décision.",
      );
    } finally {
      setProcessingId(null);
    }
  };
  const pending = applications.filter(
    (item) => item.status === "SOUMIS" || item.status === "EN_REVISION",
  );
  const validated = applications.filter((item) => item.status === "VALIDE");
  const refused = applications.filter((item) => item.status === "REFUSE");
  const filter = (items: Application[]) => {
    const term = search.trim().toLowerCase();
    return term
      ? items.filter((item) =>
          `${item.user.fullName} ${item.user.email} ${item.establishment} ${item.program}`
            .toLowerCase()
            .includes(term),
        )
      : items;
  };
  const displayedPending = useMemo(
    () => filter(pending),
    [applications, search],
  );
  const displayedHistory = useMemo(
    () => filter([...validated, ...refused]),
    [applications, search],
  );
  const logout = () => setLogoutConfirmOpen(true);
  const confirmLogout = () => {
    sessionStorage.clear();
    router.push("/login");
  };
  const title =
    activeTab === "dashboard"
      ? "Vue d’ensemble"
      : activeTab === "applications"
        ? "Dossiers à examiner"
        : activeTab === "history"
          ? "Historique des décisions"
          : activeTab === "documents"
            ? "Pièces du dépôt de dossier"
            : activeTab === "account"
              ? "Mon compte"
              : "Paramètres";
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      {sidebarOpen && <button aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/70 min-[1025px]:hidden" />}
      {/* Barre latérale : cachée sous 1025px, ouverte via le bouton menu */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col justify-between overflow-y-auto border-r border-slate-800/80 bg-slate-900/95 backdrop-blur-xl transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} min-[1025px]:translate-x-0`}>
        <div>
          <div className="flex items-center gap-3 border-b border-slate-800/80 p-5 sm:p-6">
            <div className="shrink-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 shadow-lg shadow-blue-500/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-base font-extrabold leading-tight tracking-tight text-white">
                Univ Mahajanga
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                Scolarité centrale
              </span>
            </div>
            <button aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-800 min-[1025px]:hidden"><X className="h-5 w-5" /></button>
          </div>
          <div className="mx-3 my-4 flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xs font-bold text-white">
                Scolarité centrale
              </h2>
              <p className="truncate text-[10px] text-slate-400">
                Validation des bourses
              </p>
            </div>
          </div>
          <nav className="space-y-4 px-3">
            <NavSection title="Général">
              <NavButton
                active={activeTab === "dashboard"}
                onClick={() => { setActiveTab("dashboard"); setSidebarOpen(false); }}
                icon={<LayoutDashboard className="h-4 w-4" />}
              >
                Tableau de bord
              </NavButton>
              <NavButton
                active={activeTab === "history"}
                onClick={() => { setActiveTab("history"); setSidebarOpen(false); }}
                icon={<FileSearch className="h-4 w-4" />}
              >
                Historique
              </NavButton>
            </NavSection>
            <NavSection title="Dossiers" separated>
              <NavButton
                active={activeTab === "applications"}
                onClick={() => { setActiveTab("applications"); setSidebarOpen(false); }}
                icon={<ClipboardCheck className="h-4 w-4" />}
              >
                Dossiers à traiter{" "}
                <span className="ml-auto rounded-full border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300">
                  {pending.length}
                </span>
              </NavButton>
              <NavButton
                active={activeTab === "documents"}
                onClick={() => { setActiveTab("documents"); setSidebarOpen(false); }}
                icon={<FileText className="h-4 w-4" />}
              >
                Pièces à téléverser
              </NavButton>
            </NavSection>
            <NavSection title="Configuration" separated>
              <NavButton
                active={activeTab === "account"}
                onClick={() => { setActiveTab("account"); setSidebarOpen(false); }}
                icon={<UserCog className="h-4 w-4" />}
              >
                Mon compte
              </NavButton>
              <div>
                <NavButton
                  active={activeTab === "settings"}
                  onClick={() => {
                    setSettingsMenuOpen((open) => !open);
                    if (activeTab !== "settings") setActiveTab("settings");
                  }}
                  icon={<Settings className="h-4 w-4" />}
                >
                  Paramètres
                  <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${settingsMenuOpen ? "rotate-180" : ""}`} />
                </NavButton>
                {settingsMenuOpen && (
                  <div className="mt-1 space-y-1 pl-4">
                    {([
                      { id: "appearance", label: "Apparence & Affichage", icon: <Palette className="h-3.5 w-3.5" /> },
                      { id: "behavior", label: "Comportement", icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
                      { id: "identity", label: "Identité", icon: <Building2 className="h-3.5 w-3.5" /> },
                    ] as const).map((section) => {
                      const active = activeTab === "settings" && settingsTabId === section.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => { setActiveTab("settings"); setSettingsTabId(section.id); setSidebarOpen(false); }}
                          className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-semibold ${active ? "bg-blue-600/20 text-blue-300" : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-300"}`}
                        >
                          {section.icon}
                          {section.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </NavSection>
          </nav>
        </div>
        <div className="border-t border-slate-800/80 p-4">
          <button
            onClick={logout}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-slate-400 hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>
      {/* Contenu : marge gauche = largeur exacte de la barre latérale (w-72) */}
      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden min-[1025px]:ml-72">
        <div className="pointer-events-none absolute left-1/3 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[160px]" />
        <header className="relative z-20 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/60 px-4 py-3 sm:px-6 sm:py-4">
          <button aria-label="Ouvrir le menu" onClick={() => setSidebarOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 transition hover:border-blue-500/50 min-[1025px]:hidden"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-white sm:text-lg">{title}</h1>
            <p className="truncate text-xs text-slate-400">
              Attribution et suivi des dossiers de bourse
            </p>
          </div>
          <HeaderToolbar
            darkMode={isDarkRendering(settings, systemDark)}
            onToggleTheme={() => setSettings(toggleLightDark(settings, systemDark))}
            notifications={pending.slice(0, 8).map((item) => ({
              id: item.id,
              title: `${item.user.fullName} — nouveau dossier`,
              subtitle: `${item.establishment} · ${item.level}${item.submittedAt ? ` · ${new Date(item.submittedAt).toLocaleDateString("fr-FR")}` : ""}`,
              onClick: () => setActiveTab("applications"),
            }))}
            totalCount={pending.length}
            notificationsTitle="Dossiers à traiter"
            notificationsEmpty="Aucun dossier en attente."
            onSeeAllNotifications={() => setActiveTab("applications")}
            seeAllLabel="Voir tous les dossiers à traiter"
            roleLabel="Scolarité centrale"
            menuItems={[
              { label: "Mon compte", icon: <UserCog className="h-4 w-4" />, onClick: () => setActiveTab("account") },
              { label: loading ? "Actualisation…" : "Actualiser les données", icon: <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />, onClick: () => void load() },
              { label: "Paramètres", icon: <Settings className="h-4 w-4" />, onClick: () => setActiveTab("settings") },
              { label: "Déconnexion", icon: <LogOut className="h-4 w-4" />, onClick: () => setLogoutConfirmOpen(true), danger: true },
            ]}
          />
        </header>
        <main className="z-10 min-w-0 flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6 min-[1025px]:p-8">
          {message && (
            <p className="break-words rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
              {message}
            </p>
          )}
          {activeTab === "dashboard" && (
            <>
              <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <StatCard
                  label="Dossiers finalisés"
                  value={applications.length}
                  icon={<ClipboardCheck className="h-5 w-5" />}
                  color="blue"
                />
                <StatCard
                  label="À examiner"
                  value={pending.length}
                  icon={<FileSearch className="h-5 w-5" />}
                  color="amber"
                />
                <StatCard
                  label="Bourses validées"
                  value={validated.length}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  color="emerald"
                />
                <StatCard
                  label="Dossiers refusés"
                  value={refused.length}
                  icon={<XCircle className="h-5 w-5" />}
                  color="rose"
                />
              </section>
              {!loading && <DashboardCharts applications={applications} />}
              <section className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-white">
                      Dossiers prioritaires
                    </h2>
                    <p className="text-xs text-slate-400">
                      Les dossiers finalisés qui attendent une décision.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("applications")}
                    className={`text-xs font-bold text-blue-400 ${touch}`}
                  >
                    Traiter les dossiers
                  </button>
                </div>
                {loading ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    Chargement…
                  </p>
                ) : (
                  <RecentApplications applications={pending.slice(0, 5)} />
                )}
              </section>
            </>
          )}
          {activeTab === "applications" && (
            <ApplicationList
              applications={displayedPending}
              search={search}
              setSearch={setSearch}
              loading={loading}
              notes={notes}
              setNotes={setNotes}
              processingId={processingId}
              decide={decide}
              title="Dossiers à examiner"
              description="Validez le dossier ou indiquez un motif précis en cas de refus."
              viewDossier={setDossierApplicationId}
            />
          )}
          {activeTab === "history" && (
            <HistoryList
              applications={displayedHistory}
              search={search}
              setSearch={setSearch}
              loading={loading}
              viewDossier={setDossierApplicationId}
            />
          )}
          {activeTab === "documents" && <CandidatureDocumentsPanel />}
          {activeTab === "account" && <AccountPanel />}
          {activeTab === "settings" && (
            <section className="space-y-4 sm:space-y-6">
              <AdminSettingsPanel settings={settings} onChange={setSettings} tabbed hideNav activeTabId={settingsTabId} />
              <div className="max-w-2xl rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
              <h2 className="text-base font-bold">
                Paramètres de la scolarité
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Cet espace est réservé à la consultation et à la décision des
                dossiers finalisés.
              </p>
              </div>
            </section>
          )}
        </main>
      </div>
      {dossierApplicationId && <DossierViewer endpoint={`/scolarite/applications/${dossierApplicationId}/dossier`} onClose={() => setDossierApplicationId(null)} />}
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Confirmer la déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}
function NavSection({ title, separated, children }: { title: string; separated?: boolean; children: ReactNode }) {
  return (
    <section aria-label={title} className={`space-y-1 ${separated ? "border-t border-slate-800/80 pt-4" : ""}`}>
      <h3 className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </section>
  );
}
function NavButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"}`}
    >
      {icon}
      {children}
    </button>
  );
}
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  color: "blue" | "amber" | "emerald" | "rose";
}) {
  const colors = {
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  };
  return (
    <div className="min-w-0 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-5">
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border sm:mb-4 ${colors[color]}`}
      >
        {icon}
      </div>
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
function RecentApplications({ applications }: { applications: Application[] }) {
  if (!applications.length)
    return (
      <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
        Aucun dossier en attente.
      </p>
    );
  return (
    <div className="space-y-2">
      {applications.map((item) => (
        <div
          key={item.id}
          className="flex flex-col items-start gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
        >
          <div className="min-w-0">
            <p className="break-words text-sm font-bold">{item.user.fullName}</p>
            <p className="break-words text-xs text-slate-400">
              {item.establishment} · {item.program}
            </p>
          </div>
          <StatusBadge status={item.status} />
        </div>
      ))}
    </div>
  );
}
function HistoryList({
  applications,
  search,
  setSearch,
  loading,
  viewDossier,
}: {
  applications: Application[];
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  viewDossier: (id: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold">Historique des décisions</h2>
          <p className="text-xs text-slate-400">
            Dossiers déjà validés ou refusés par la scolarité centrale.
          </p>
        </div>
        <label className="relative w-full sm:w-auto">
          <span className="sr-only">Rechercher un dossier dans l’historique</span>
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un étudiant…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-base sm:w-64 sm:text-xs max-[1024px]:min-h-[44px]"
          />
        </label>
      </div>
      {loading ? (
        <p role="status" className="py-12 text-center text-slate-400">Chargement…</p>
      ) : !applications.length ? (
        <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
          {search.trim() ? "Aucun dossier ne correspond à votre recherche." : "Aucun dossier dans l’historique."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-4 bg-slate-950/60 px-4 py-3 text-xs font-semibold text-slate-400 xl:grid">
            <span>Étudiant</span>
            <span>Établissement / Formation</span>
            <span>Dépôt / Quitus</span>
            <span>Décision</span>
            <span className="w-28 text-center">Dossier</span>
          </div>
          <ul aria-label="Historique des décisions" className="divide-y divide-slate-800 xl:border-t xl:border-slate-800">
            {applications.map((item) => (
              <li key={item.id} className="grid grid-cols-1 items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-800/30 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.5fr)_auto] xl:gap-4">
                <div className="min-w-0">
                  <p className="break-words text-sm font-bold">{item.user.fullName}</p>
                  <p className="break-all text-xs text-slate-400">{item.user.email}</p>
                </div>
                <div className="min-w-0">
                  <p className="break-words text-sm text-slate-200">{item.establishment}</p>
                  <p className="break-words text-xs text-slate-400">{item.level} · {item.program}</p>
                </div>
                <div className="min-w-0 space-y-1 text-xs">
                  <p className="text-slate-300">
                    <span className="xl:sr-only">Dépôt : </span>
                    {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString("fr-FR") : "—"}
                  </p>
                  <p className="break-all font-mono text-emerald-300">
                    <span className="font-sans text-slate-500 xl:sr-only">Quitus : </span>
                    {item.quitus?.code ?? "—"}
                  </p>
                </div>
                <div className="min-w-0 space-y-1">
                  <StatusBadge status={item.status} />
                  <p className="break-words text-xs text-slate-400">Par {item.reviewedBy?.fullName ?? "Scolarité centrale"}</p>
                  {item.reviewNote && <p className="break-words text-xs text-slate-300">{item.reviewNote}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => viewDossier(item.id)}
                  aria-label={`Voir le dossier de ${item.user.fullName}`}
                  className="min-h-[44px] rounded-lg border border-blue-500/40 px-3 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:col-span-2 xl:col-span-1 xl:w-28"
                >
                  Voir le dossier
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
function ApplicationList({
  applications,
  search,
  setSearch,
  loading,
  notes,
  setNotes,
  processingId,
  decide,
  title,
  description,
  viewDossier,
}: {
  applications: Application[];
  search: string;
  setSearch: (value: string) => void;
  loading: boolean;
  notes: Record<string, string>;
  setNotes: Dispatch<SetStateAction<Record<string, string>>>;
  processingId: string | null;
  decide: (
    application: Application,
    status: "VALIDE" | "REFUSE",
  ) => Promise<void>;
  title: string;
  description: string;
  viewDossier: (id: string) => void;
}) {
  const [layout, setLayout] = useState<"cartes" | "liste">("cartes");
  // Dossier dont le motif de refus est en cours de saisie (un seul à la fois).
  const [refusingId, setRefusingId] = useState<string | null>(null);
  const refusalForm = (item: Application) => refusingId === item.id && (
    <RefusalForm
      note={notes[item.id] ?? ""}
      onChange={(value) => setNotes((current) => ({ ...current, [item.id]: value }))}
      busy={processingId === item.id}
      onConfirm={() => void decide(item, "REFUSE")}
      onCancel={() => setRefusingId(null)}
    />
  );
  const refuseButton = (item: Application) => (
    <IconAction label="Refuser le dossier" disabled={processingId === item.id} onClick={() => setRefusingId(refusingId === item.id ? null : item.id)} className={refusingId === item.id ? "bg-rose-500 text-white ring-2 ring-rose-300/60" : "bg-rose-600 text-white hover:bg-rose-500"}><X className="h-4 w-4" /></IconAction>
  );
  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold">{title}</h2>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        <label className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un étudiant…"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-base sm:w-64 sm:text-xs max-[1024px]:min-h-[44px]"
          />
        </label>
        <div role="group" aria-label="Mode d'affichage" className="flex w-fit shrink-0 gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
          {([["cartes", "Cartes", LayoutGrid], ["liste", "Liste", List]] as const).map(([mode, label, Icon]) => (
            <button
              key={mode}
              type="button"
              title={label}
              aria-label={`Affichage en ${label.toLowerCase()}`}
              aria-pressed={layout === mode}
              onClick={() => setLayout(mode)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition cursor-pointer max-[1024px]:h-11 max-[1024px]:w-11 ${layout === mode ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <p className="py-12 text-center text-slate-400">Chargement…</p>
      ) : (
        <div className={layout === "cartes" ? "grid grid-cols-1 gap-3 xl:grid-cols-2" : "space-y-2"}>
          {layout === "liste" && applications.map((item) => {
            const pending = item.status === "SOUMIS" || item.status === "EN_REVISION";
            return (
              <article key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:px-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0 lg:w-1/4">
                  <h3 className="truncate text-sm font-bold">{item.user.fullName}</h3>
                  <p className="truncate text-xs text-slate-400">{item.user.email}</p>
                </div>
                <p className="min-w-0 text-xs text-slate-400 lg:w-1/4">
                  <span className="block truncate text-slate-200">{item.establishment}</span>
                  <span className="block truncate">{item.level} · {item.program}</span>
                </p>
                <p className="text-xs text-slate-400 lg:w-28">
                  <span className="block font-mono text-emerald-300">{item.quitus?.code ?? "—"}</span>
                  {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString("fr-FR") : "—"}
                </p>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {pending ? (
                    <span className="flex-1" />
                  ) : (
                    <p className="min-w-0 flex-1 truncate text-xs text-slate-400" title={item.reviewNote ?? undefined}>
                      {item.reviewedBy?.fullName ?? "Scolarité centrale"}{item.reviewNote ? ` — ${item.reviewNote}` : ""}
                    </p>
                  )}
                  <StatusBadge status={item.status} />
                  <IconAction label="Voir le dossier" onClick={() => viewDossier(item.id)} className="border border-blue-500/40 text-blue-300 hover:bg-blue-500/10"><Eye className="h-4 w-4" /></IconAction>
                  {pending && (
                    <>
                      <IconAction label="Valider le dossier" disabled={processingId === item.id} onClick={() => void decide(item, "VALIDE")} className="bg-emerald-600 text-white hover:bg-emerald-500"><Check className="h-4 w-4" /></IconAction>
                      {refuseButton(item)}
                    </>
                  )}
                </div>
              </div>
              {pending && refusalForm(item)}
              </article>
            );
          })}
          {layout === "cartes" && applications.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-bold">{item.user.fullName}</h3>
                  <p className="break-all text-xs text-slate-400">
                    {item.user.email} · {item.establishment}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <button onClick={() => viewDossier(item.id)} className="mt-3 min-h-[44px] rounded-lg border border-blue-500/40 px-3 text-xs font-bold text-blue-300">Voir le dossier</button>
              <div className="my-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                <p className="min-w-0 break-words">
                  <span className="block text-slate-500">Formation</span>
                  {item.level}
                  <br />
                  {item.program}
                </p>
                <p className="min-w-0">
                  <span className="block text-slate-500">Quitus</span>
                  <span className="break-all font-mono text-emerald-300">
                    {item.quitus?.code ?? "—"}
                  </span>
                </p>
                <p>
                  <span className="block text-slate-500">Dépôt</span>
                  {item.submittedAt
                    ? new Date(item.submittedAt).toLocaleDateString("fr-FR")
                    : "—"}
                </p>
              </div>
              {item.status === "SOUMIS" || item.status === "EN_REVISION" ? (
                <div className="space-y-3 border-t border-slate-800 pt-3">
                  <div className="flex justify-end gap-2">
                    <IconAction label="Valider le dossier" disabled={processingId === item.id} onClick={() => void decide(item, "VALIDE")} className="bg-emerald-600 text-white hover:bg-emerald-500"><Check className="h-4 w-4" /></IconAction>
                    {refuseButton(item)}
                  </div>
                  {refusalForm(item)}
                </div>
              ) : (
                <p className="break-words border-t border-slate-800 pt-3 text-xs text-slate-400">
                  Décision : {item.reviewedBy?.fullName ?? "Scolarité centrale"}
                  {item.reviewNote ? ` — ${item.reviewNote}` : ""}
                </p>
              )}
            </article>
          ))}
          {!applications.length && (
            <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
              Aucun dossier dans cette liste.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
// Graphiques du tableau de bord : tracés en SVG/HTML simple, colorés par les classes du thème.
function DashboardCharts({ applications }: { applications: Application[] }) {
  const data = useMemo(() => {
    const pending = applications.filter((item) => item.status === "SOUMIS" || item.status === "EN_REVISION").length;
    const validated = applications.filter((item) => item.status === "VALIDE").length;
    const refused = applications.filter((item) => item.status === "REFUSE").length;
    const today = new Date();
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today.getTime() - (13 - index) * DAY_MS);
      return { date, key: dayKey(date), count: 0 };
    });
    applications.forEach((item) => {
      if (!item.submittedAt) return;
      const day = days.find((entry) => entry.key === dayKey(new Date(item.submittedAt as string)));
      if (day) day.count += 1;
    });
    const byEstablishment = new Map<string, number>();
    applications.forEach((item) => byEstablishment.set(item.establishment, (byEstablishment.get(item.establishment) ?? 0) + 1));
    const establishments = [...byEstablishment.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { pending, validated, refused, days, establishments };
  }, [applications]);

  const total = applications.length;
  const decided = data.validated + data.refused;
  const validationRate = decided ? Math.round((data.validated / decided) * 100) : 0;
  const segments = [
    { label: "À traiter", value: data.pending, tone: "text-amber-400", dot: "bg-amber-400" },
    { label: "Validés", value: data.validated, tone: "text-emerald-400", dot: "bg-emerald-400" },
    { label: "Refusés", value: data.refused, tone: "text-rose-400", dot: "bg-rose-400" },
  ];
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const maxDay = Math.max(1, ...data.days.map((day) => day.count));
  const maxEstablishment = Math.max(1, ...data.establishments.map(([, count]) => count));
  const periodTotal = data.days.reduce((sum, day) => sum + day.count, 0);

  return (
    <section className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
        <h2 className="text-base font-bold text-white">Répartition des dossiers</h2>
        <p className="text-xs text-slate-400">État de traitement de l&apos;ensemble des dossiers finalisés.</p>
        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
          <div className="relative h-40 w-40 shrink-0">
            <svg viewBox="0 0 100 100" role="img" aria-label={`${data.pending} à traiter, ${data.validated} validés, ${data.refused} refusés`} className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="12" className="stroke-current text-slate-500 opacity-20" />
              {total > 0 && segments.map((segment) => {
                const length = (segment.value / total) * circumference;
                const circle = segment.value > 0 && (
                  <circle
                    key={segment.label}
                    cx="50" cy="50" r={radius} fill="none" strokeWidth="12"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                    className={`stroke-current ${segment.tone}`}
                  />
                );
                offset += length;
                return circle;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{total}</span>
              <span className="text-[11px] text-slate-400">dossier(s)</span>
            </div>
          </div>
          <ul className="w-full min-w-0 flex-1 space-y-2.5 text-xs">
            {segments.map((segment) => (
              <li key={segment.label} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-slate-300">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${segment.dot}`} />
                  {segment.label}
                </span>
                <span className="font-bold text-white">
                  {segment.value}
                  <span className="ml-1.5 font-normal text-slate-500">{total ? Math.round((segment.value / total) * 100) : 0}%</span>
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 border-t border-slate-800 pt-2.5">
              <span className="text-slate-400">Taux de validation</span>
              <span className="font-bold text-emerald-400">{decided ? `${validationRate}%` : "—"}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 className="text-base font-bold text-white">Dépôts des 14 derniers jours</h2>
          <span className="text-xs font-semibold text-blue-400">{periodTotal} dépôt(s)</span>
        </div>
        <p className="text-xs text-slate-400">Nombre de dossiers finalisés par jour.</p>
        <div className="mt-5 flex h-40 items-end gap-1 sm:gap-1.5" role="img" aria-label={`${periodTotal} dépôts sur les 14 derniers jours`}>
          {data.days.map((day) => (
            <div key={day.key} title={`${day.date.toLocaleDateString("fr-FR")} : ${day.count} dépôt(s)`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-semibold text-slate-400">{day.count || ""}</span>
              <div className={`w-full rounded-t-md ${day.count ? "bg-blue-600" : "bg-slate-800"}`} style={{ height: `${day.count ? Math.max(8, (day.count / maxDay) * 100) : 3}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-1 sm:gap-1.5">
          {data.days.map((day, index) => (
            <span key={day.key} className="min-w-0 flex-1 text-center text-[9px] text-slate-500 sm:text-[10px]">
              {index % 2 === 1 || index === 13 ? day.date.getDate() : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6 lg:col-span-2">
        <h2 className="text-base font-bold text-white">Dossiers par établissement</h2>
        <p className="text-xs text-slate-400">Les 5 établissements qui déposent le plus de dossiers.</p>
        {data.establishments.length ? (
          <ul className="mt-5 space-y-3">
            {data.establishments.map(([name, count]) => (
              <li key={name} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-slate-300" title={name}>{name}</span>
                  <span className="shrink-0 font-bold text-white">{count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${(count / maxEstablishment) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">Aucun dossier pour le moment.</p>
        )}
      </div>
    </section>
  );
}
function RefusalForm({ note, onChange, busy, onConfirm, onCancel }: { note: string; onChange: (value: string) => void; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <form
      onSubmit={(event) => { event.preventDefault(); onConfirm(); }}
      className="mt-3 flex flex-col gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 sm:flex-row sm:items-center"
    >
      <input
        autoFocus
        value={note}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Motif du refus (obligatoire, ex. document illisible)"
        aria-label="Motif du refus"
        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-base sm:text-xs max-[1024px]:min-h-[44px]"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !note.trim()} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 text-xs font-bold text-white transition hover:bg-rose-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none max-[1024px]:h-11">
          <XCircle className="h-4 w-4" />
          Confirmer le refus
        </button>
        <button type="button" onClick={onCancel} className="flex h-9 flex-1 items-center justify-center rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 cursor-pointer sm:flex-none max-[1024px]:h-11">
          Annuler
        </button>
      </div>
    </form>
  );
}
function IconAction({ label, onClick, disabled, className, children }: { label: string; onClick: () => void; disabled?: boolean; className: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 max-[1024px]:h-11 max-[1024px]:w-11 ${className}`}
    >
      {children}
    </button>
  );
}
function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
