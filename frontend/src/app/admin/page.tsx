'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Database,
  Eye,
  EyeOff,
  GraduationCap,
  Globe,
  History,
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  UserPlus,
  XCircle,
  X,
} from 'lucide-react';
import { DossierViewer } from '../../components/DossierViewer';
import { AdminSettingsPanel } from '../../components/AdminSettingsPanel';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { HomepageSettingsPanel } from '../../components/HomepageSettingsPanel';
import { buildThemeCss, defaultSettings, loadSettings, saveSettings, type AdminSettings } from '../../components/adminSettings';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const statuses = ['BROUILLON', 'SOUMIS', 'EN_REVISION', 'VALIDE', 'REFUSE'] as const;
type Status = (typeof statuses)[number];
type Tab = 'dashboard' | 'students' | 'accounts' | 'users' | 'settings' | 'history' | 'trash';
type StaffRole = 'ETABLISSEMENT' | 'SCOLARITE_CENTRALE';
type StaffAccountRole = 'ETABLISSEMENT' | 'ADMIN_ETABLISSEMENT' | 'SECRETAIRE' | 'SCOLARITE_CENTRALE';
type AnyUserRole = 'ETUDIANT' | 'ADMIN' | StaffAccountRole;
type AnyUser = {
  id: string;
  fullName: string;
  email: string;
  role: AnyUserRole;
  registrationStatus: Status;
  establishment: string | null;
  level: string | null;
  program: string | null;
  active: boolean;
  emailVerified: boolean;
  createdAt: string;
};
const roleLabels: Record<AnyUserRole, string> = {
  ETUDIANT: 'Étudiant',
  ADMIN: 'Administrateur',
  ETABLISSEMENT: 'Établissement',
  ADMIN_ETABLISSEMENT: 'Responsable établissement',
  SECRETAIRE: 'Secrétaire',
  SCOLARITE_CENTRALE: 'Scolarité centrale',
};
type Student = {
  id: string;
  fullName: string;
  email: string;
  registrationStatus: Status;
  establishment: string | null;
  level: string | null;
  program: string | null;
  createdAt: string;
};
type StaffAccount = { id: string; fullName: string; email: string; role: StaffAccountRole; establishment: string | null; active: boolean; createdAt: string };
const staffRoleLabel = (account: { role: AnyUserRole; establishment: string | null }) => {
  if (account.role === 'ETUDIANT' || account.role === 'ADMIN') return roleLabels[account.role];
  if (account.role === 'SCOLARITE_CENTRALE') return 'Scolarité centrale';
  if (account.role === 'SECRETAIRE') return `Secrétaire · ${account.establishment}`;
  return `Établissement · ${account.establishment}`;
};
type Establishment = { establishment: string; studentCount: number };
type TrashedAccount = { id: string; fullName: string; email: string; role: AnyUserRole; establishment: string | null; deletedAt: string };
type AuditAction = 'STAFF_ACCOUNT_CREATED' | 'STAFF_ACCOUNT_STATUS_CHANGED' | 'STAFF_ACCOUNT_NAME_UPDATED' | 'STAFF_ACCOUNT_PASSWORD_RESET' | 'STAFF_ACCOUNT_TRASHED' | 'STAFF_ACCOUNT_RESTORED' | 'STAFF_ACCOUNT_PURGED';
type AuditLogEntry = { id: string; action: AuditAction; actorName: string; targetName: string; detail: string | null; createdAt: string };
const auditActionLabels: Record<AuditAction, string> = {
  STAFF_ACCOUNT_CREATED: 'a créé le compte',
  STAFF_ACCOUNT_STATUS_CHANGED: 'a changé le statut de',
  STAFF_ACCOUNT_NAME_UPDATED: 'a modifié le nom de',
  STAFF_ACCOUNT_PASSWORD_RESET: 'a réinitialisé le mot de passe de',
  STAFF_ACCOUNT_TRASHED: 'a mis à la corbeille',
  STAFF_ACCOUNT_RESTORED: 'a restauré',
  STAFF_ACCOUNT_PURGED: 'a supprimé définitivement',
};

const statusLabels: Record<Status, string> = {
  BROUILLON: 'Brouillon',
  SOUMIS: 'Soumis',
  EN_REVISION: 'En révision',
  VALIDE: 'Validé',
  REFUSE: 'Refusé',
};

const statusStyles: Record<Status, string> = {
  BROUILLON: 'border-slate-700 bg-slate-800 text-slate-300',
  SOUMIS: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  EN_REVISION: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  VALIDE: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  REFUSE: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

// Zone tactile confortable (44px) sur téléphone et tablette uniquement
const touch = 'max-[1024px]:min-h-[44px]';
// Champs de formulaire : pleine largeur, hauts sur tactile, texte 16px sur mobile (évite le zoom automatique)
const inputCls = 'AccountInput w-full text-base sm:text-sm max-[1024px]:min-h-[44px]';

export default function AdminPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEstablishment, setSelectedEstablishment] = useState('');
  const [establishmentStudents, setEstablishmentStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalStatus, setGlobalStatus] = useState<Status | ''>('');
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [allUsers, setAllUsers] = useState<AnyUser[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState<AnyUserRole | ''>('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [settingsTabId, setSettingsTabId] = useState<'appearance' | 'behavior' | 'identity' | 'homepage'>('appearance');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [resettingAccountId, setResettingAccountId] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [editingAccountId, setEditingAccountId] = useState('');
  const [editingName, setEditingName] = useState('');
  const [trashedAccounts, setTrashedAccounts] = useState<TrashedAccount[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [purgingAccountId, setPurgingAccountId] = useState('');
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [accountForm, setAccountForm] = useState({ fullName: '', email: '', password: '', role: 'ETABLISSEMENT' as StaffRole, establishment: '' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [dossierStudentId, setDossierStudentId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [systemDark, setSystemDark] = useState(true);
  const settingsLoadedRef = useRef(false);

  useEffect(() => {
    setSettings(loadSettings());
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemDark(mediaQuery.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    // Ignore le rendu initial (valeurs par défaut avant le chargement depuis
    // localStorage ci-dessus) pour ne pas écraser les préférences enregistrées.
    if (!settingsLoadedRef.current) { settingsLoadedRef.current = true; return; }
    saveSettings(settings);
  }, [settings]);

  const themeCss = useMemo(() => buildThemeCss(settings, systemDark), [settings, systemDark]);

  const getToken = useCallback(() => sessionStorage.getItem('auth_token'), []);
  const loadStudents = useCallback(async (silent = false) => {
    const token = getToken();
    if (!token || sessionStorage.getItem('user_role') !== 'ADMIN') {
      router.replace('/login');
      return;
    }

    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiUrl}/admin/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401) {
        sessionStorage.clear();
        router.replace('/login');
        return;
      }
      if (!response.ok) throw new Error('Impossible de charger les inscriptions.');
      setStudents((await response.json()) as Student[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [getToken, router]);

  const loadStaffAccounts = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/admin/staff-accounts`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Impossible de charger les comptes du personnel.');
      setStaffAccounts((await response.json()) as StaffAccount[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de chargement.'); }
  }, [getToken]);

  const loadAllUsers = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Impossible de charger la liste des comptes.');
      setAllUsers((await response.json()) as AnyUser[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de chargement.'); }
  }, [getToken]);

  const toggleAccountActive = async (user: AnyUser) => {
    setError('');
    try {
      const response = await fetch(`${apiUrl}/admin/users/${user.id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ active: !user.active }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Impossible de modifier l’état du compte.');
      setAllUsers((current) => current.map((item) => item.id === user.id ? { ...item, active: !item.active } : item));
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de modification.'); }
  };

  const deleteAccountHandler = async (user: AnyUser) => {
    if (!window.confirm(`Supprimer le compte de ${user.fullName} ? Il sera déplacé vers la corbeille.`)) return;
    setError('');
    try {
      const response = await fetch(`${apiUrl}/admin/users/${user.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Impossible de supprimer ce compte.');
      setAllUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de suppression.'); }
  };

  const loadTrashedAccounts = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/admin/staff-accounts/trash`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Impossible de charger la corbeille.');
      setTrashedAccounts((await response.json()) as TrashedAccount[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de chargement.'); }
  }, [getToken]);

  const loadAuditLog = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/admin/audit-log`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Impossible de charger l’historique.');
      setAuditLog((await response.json()) as AuditLogEntry[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de chargement.'); }
  }, [getToken]);

  const loadEstablishments = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/admin/establishments`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('Impossible de charger les établissements.');
      setEstablishments((await response.json()) as Establishment[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de chargement.'); }
  }, [getToken]);

  const openEstablishment = async (establishment: string) => {
    setSelectedEstablishment(establishment);
    setStudentSearch(''); setLevelFilter(''); setProgramFilter(''); setError('');
    try {
      const response = await fetch(`${apiUrl}/admin/establishments/${encodeURIComponent(establishment)}/students`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error('Impossible de charger les étudiants de cet établissement.');
      setEstablishmentStudents((await response.json()) as Student[]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de chargement.'); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setCurrentUserId((JSON.parse(sessionStorage.getItem('auth_user') ?? '{}') as { id?: string }).id ?? ''); } catch { /* session invalide */ }
      void loadStudents();
      void loadStaffAccounts();
      void loadEstablishments();
      void loadTrashedAccounts();
      void loadAuditLog();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAuditLog, loadEstablishments, loadStaffAccounts, loadStudents, loadTrashedAccounts]);

  useEffect(() => {
    const interval = settings.autoRefresh * 1000;
    if (!interval) return undefined;
    const timer = window.setInterval(() => {
      void loadStudents(true); void loadStaffAccounts(); void loadEstablishments();
    }, interval);
    return () => window.clearInterval(timer);
  }, [loadEstablishments, loadStaffAccounts, loadStudents, settings.autoRefresh]);

  const createStaffAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setAccountMessage(''); setCreatingAccount(true);
    try {
      const response = await fetch(`${apiUrl}/admin/staff-accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(accountForm),
      });
      const data = (await response.json().catch(() => ({}))) as StaffAccount & { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Impossible de créer le compte.');
      setStaffAccounts((current) => [data, ...current]);
      setAccountForm({ fullName: '', email: '', password: '', role: accountForm.role, establishment: '' });
      setAccountMessage('Le compte a été créé. Il est immédiatement utilisable.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Impossible de créer le compte.'); }
    finally { setCreatingAccount(false); }
  };

  const updateStaffAccount = async (account: StaffAccount) => {
    setError('');
    try {
      const response = await fetch(`${apiUrl}/admin/staff-accounts/${account.id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ active: !account.active }),
      });
      if (!response.ok) throw new Error('Impossible de modifier l’état du compte.');
      setStaffAccounts((current) => current.map((item) => item.id === account.id ? { ...item, active: !item.active } : item));
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de modification.'); }
  };

  const updateStaffPassword = async (event: React.FormEvent, accountId: string) => {
    event.preventDefault();
    if (resetPassword.length < 8) { setError('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    setError('');
    try {
      const response = await fetch(`${apiUrl}/admin/staff-accounts/${accountId}/password`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ password: resetPassword }),
      });
      if (!response.ok) throw new Error('Impossible de réinitialiser le mot de passe.');
      setResettingAccountId(''); setResetPassword(''); setAccountMessage('Mot de passe réinitialisé avec succès.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de réinitialisation.'); }
  };

  const updateStaffName = async (event: React.FormEvent, accountId: string) => {
    event.preventDefault();
    if (!editingName.trim()) { setError('Le nom complet est obligatoire.'); return; }
    setError('');
    try {
      const response = await fetch(`${apiUrl}/admin/staff-accounts/${accountId}/name`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ fullName: editingName.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { fullName?: string; message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Impossible de modifier le nom.');
      setStaffAccounts((current) => current.map((item) => item.id === accountId ? { ...item, fullName: data.fullName ?? editingName.trim() } : item));
      setEditingAccountId(''); setEditingName(''); setAccountMessage('Nom du compte modifié avec succès.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de modification du nom.'); }
  };

  const trashStaffAccountHandler = async (account: StaffAccount) => {
    if (!window.confirm(`Mettre le compte de ${account.fullName} à la corbeille ? Vous pourrez le restaurer ensuite.`)) return;
    setError('');
    try {
      const response = await fetch(`${apiUrl}/admin/staff-accounts/${account.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Impossible de mettre le compte à la corbeille.');
      setStaffAccounts((current) => current.filter((item) => item.id !== account.id));
      setAccountMessage('Compte déplacé vers la corbeille.');
      void loadTrashedAccounts(); void loadAuditLog();
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de suppression.'); }
  };

  const restoreStaffAccountHandler = async (account: TrashedAccount) => {
    setError('');
    try {
      const response = await fetch(`${apiUrl}/admin/staff-accounts/${account.id}/restore`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Impossible de restaurer le compte.');
      setTrashedAccounts((current) => current.filter((item) => item.id !== account.id));
      setAccountMessage('Compte restauré.');
      void loadStaffAccounts(); void loadAuditLog();
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de restauration.'); }
  };

  const purgeStaffAccountHandler = async (event: React.FormEvent, account: TrashedAccount) => {
    event.preventDefault();
    if (purgeConfirmText.trim() !== account.fullName) { setError('Le nom saisi ne correspond pas.'); return; }
    setError('');
    try {
      const response = await fetch(`${apiUrl}/admin/staff-accounts/${account.id}/permanent`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Impossible de supprimer définitivement le compte.');
      setTrashedAccounts((current) => current.filter((item) => item.id !== account.id));
      setPurgingAccountId(''); setPurgeConfirmText('');
      setAccountMessage('Compte supprimé définitivement.');
      void loadAuditLog();
    } catch (err) { setError(err instanceof Error ? err.message : 'Erreur de suppression définitive.'); }
  };

  const updateStatus = async (id: string, status: Status) => {
    if (settings.confirmStatus) {
      const target = students.find((student) => student.id === id) ?? establishmentStudents.find((student) => student.id === id);
      if (!window.confirm(`Passer le dossier de ${target?.fullName ?? 'cet étudiant'} au statut « ${statusLabels[status]} » ?`)) return;
    }
    const response = await fetch(`${apiUrl}/admin/students/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setError('La mise à jour du statut a échoué.');
      return;
    }
    const applyStatus = (list: Student[]) => list.map((student) => student.id === id ? { ...student, registrationStatus: status } : student);
    setStudents(applyStatus);
    setEstablishmentStudents(applyStatus);
  };

  const establishmentLevels = useMemo(
    () => [...new Set(establishmentStudents.map((student) => student.level).filter((level): level is string => Boolean(level)))].sort(),
    [establishmentStudents],
  );
  const establishmentPrograms = useMemo(
    () => [...new Set(establishmentStudents.map((student) => student.program).filter((program): program is string => Boolean(program)))].sort(),
    [establishmentStudents],
  );
  const displayedEstablishmentStudents = useMemo(
    () => establishmentStudents.filter((student) => {
      const matchesSearch = `${student.fullName} ${student.email ?? ''}`.toLowerCase().includes(studentSearch.toLowerCase());
      return matchesSearch && (!levelFilter || student.level === levelFilter) && (!programFilter || student.program === programFilter);
    }),
    [establishmentStudents, studentSearch, levelFilter, programFilter],
  );
  const displayedGlobalStudents = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    return students.filter((student) => (!term || `${student.fullName} ${student.email}`.toLowerCase().includes(term)) && (!globalStatus || student.registrationStatus === globalStatus));
  }, [students, globalSearch, globalStatus]);
  const exportStudentsCsv = () => {
    const rows = [['Nom', 'E-mail', 'Établissement', 'Niveau', 'Parcours', 'Statut'], ...displayedGlobalStudents.map((student) => [student.fullName, student.email, student.establishment ?? '', student.level ?? '', student.program ?? '', statusLabels[student.registrationStatus]])];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(';')).join('\n')}`;
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'dossiers-etudiants.csv'; link.click(); URL.revokeObjectURL(link.href);
  };
  const exportStudentsPdf = () => window.print();
  const filteredAllUsers = useMemo(() => {
    const term = usersSearch.trim().toLowerCase();
    return allUsers.filter((user) => (!term || `${user.fullName} ${user.email}`.toLowerCase().includes(term)) && (!usersRoleFilter || user.role === usersRoleFilter));
  }, [allUsers, usersSearch, usersRoleFilter]);
  const pendingCount = students.filter((student) => student.registrationStatus === 'SOUMIS' || student.registrationStatus === 'EN_REVISION').length;
  const validatedCount = students.filter((student) => student.registrationStatus === 'VALIDE').length;
  const rejectedCount = students.filter((student) => student.registrationStatus === 'REFUSE').length;
  const logout = () => setLogoutConfirmOpen(true);
  const confirmLogout = () => {
    sessionStorage.clear();
    router.push('/login');
  };
  return (
    <div className="adm min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white">
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      {sidebarOpen && <button aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/70 min-[1025px]:hidden" />}

      {/* Barre latérale : cachée sous 1025px, ouverte via le bouton menu */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col justify-between overflow-y-auto border-r border-slate-800/80 bg-slate-900/95 backdrop-blur-xl transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} min-[1025px]:translate-x-0`}>
        <div>
          <div className="flex items-center gap-3 border-b border-slate-800/80 p-5 sm:p-6">
            <div className="shrink-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 shadow-lg shadow-blue-500/20"><GraduationCap className="h-6 w-6 text-white" /></div>
            <div className="min-w-0"><span className="block truncate text-base font-extrabold leading-tight tracking-tight text-white">{settings.universityName}</span><span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wider text-blue-400">Espace Administration</span></div>
            <button aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-800 min-[1025px]:hidden"><X className="h-5 w-5" /></button>
          </div>
          <div className="mx-3 my-4 flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500"><ShieldCheck className="h-5 w-5" /></div>
            <div className="min-w-0 overflow-hidden"><h2 className="truncate text-xs font-bold text-white">Administrateur</h2><p className="truncate text-[10px] text-slate-400">Gestion des inscriptions</p></div>
          </div>
          <nav className="space-y-1 px-3">
            <NavButton active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }} icon={<LayoutDashboard className="h-4 w-4" />}>Tableau de bord</NavButton>
            <NavButton active={activeTab === 'students'} onClick={() => { setActiveTab('students'); setSidebarOpen(false); }} icon={<ClipboardList className="h-4 w-4" />}>Etudiants <span className="ml-auto rounded-full border border-blue-500/30 bg-blue-500/20 px-2 py-0.5 text-[10px] text-blue-300">{pendingCount}</span></NavButton>
            <NavButton active={activeTab === 'accounts'} onClick={() => { setActiveTab('accounts'); setSidebarOpen(false); }} icon={<UserPlus className="h-4 w-4" />}>Gestion des comptes</NavButton>
            <NavButton active={activeTab === 'users'} onClick={() => { setActiveTab('users'); setSidebarOpen(false); void loadAllUsers(); }} icon={<Database className="h-4 w-4" />}>Tous les comptes</NavButton>
            <NavButton active={activeTab === 'history'} onClick={() => { setActiveTab('history'); setSidebarOpen(false); void loadAuditLog(); }} icon={<History className="h-4 w-4" />}>Historique</NavButton>
            <NavButton active={activeTab === 'trash'} onClick={() => { setActiveTab('trash'); setSidebarOpen(false); void loadTrashedAccounts(); }} icon={<Trash2 className="h-4 w-4" />}>Corbeille {trashedAccounts.length > 0 && <span className="ml-auto rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{trashedAccounts.length}</span>}</NavButton>
            <div>
              <NavButton
                active={activeTab === 'settings'}
                onClick={() => {
                  setSettingsMenuOpen((open) => !open);
                  if (activeTab !== 'settings') setActiveTab('settings');
                }}
                icon={<Settings className="h-4 w-4" />}
              >
                Paramètres
                <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${settingsMenuOpen ? 'rotate-180' : ''}`} />
              </NavButton>
              {settingsMenuOpen && (
                <div className="mt-1 space-y-1 pl-4">
                  {([
                    { id: 'appearance', label: 'Apparence & Affichage', icon: <Palette className="h-3.5 w-3.5" /> },
                    { id: 'behavior', label: 'Comportement', icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
                    { id: 'identity', label: 'Identité', icon: <Building2 className="h-3.5 w-3.5" /> },
                    { id: 'homepage', label: "Page d'accueil", icon: <Globe className="h-3.5 w-3.5" /> },
                  ] as const).map((section) => {
                    const active = activeTab === 'settings' && settingsTabId === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => { setActiveTab('settings'); setSettingsTabId(section.id); setSidebarOpen(false); }}
                        className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-semibold ${active ? 'bg-blue-600/20 text-blue-300' : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'}`}
                      >
                        {section.icon}
                        {section.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>
        </div>
        <div className="border-t border-slate-800/80 p-4"><button onClick={logout} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"><LogOut className="h-4 w-4" />Déconnexion</button></div>
      </aside>

      {/* Contenu : marge gauche = largeur exacte de la barre latérale (w-72) sur ordinateur */}
      <div className="relative flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden min-[1025px]:ml-72">
        <div className="adm-glow pointer-events-none absolute left-1/3 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[160px]" />
        <header className="z-10 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/60 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
          <button aria-label="Ouvrir le menu" onClick={() => setSidebarOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 transition hover:border-blue-500/50 min-[1025px]:hidden"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><h1 className="truncate text-base font-bold text-white sm:text-lg">{activeTab === 'dashboard' ? 'Vue d’ensemble' : activeTab === 'students' ? 'Dossiers des étudiants' : activeTab === 'accounts' ? 'Création des comptes' : activeTab === 'users' ? 'Tous les comptes' : activeTab === 'history' ? 'Historique des actions' : activeTab === 'trash' ? 'Corbeille' : 'Paramètres'}</h1><p className="truncate text-xs text-slate-400">Année universitaire {settings.academicYear}</p></div>
          <button aria-label="Actualiser" onClick={() => { void loadStudents(); void loadStaffAccounts(); void loadEstablishments(); }} className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3.5 text-xs font-semibold text-slate-300 transition hover:border-blue-500/50 hover:text-white"><RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">Actualiser</span></button>
        </header>

        <main className="z-10 min-w-0 flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6 min-[1025px]:p-8">
          {error && <p className="break-words rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}

          {activeTab === 'dashboard' && <>
            <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <StatCard label="Étudiants inscrits" value={students.length} icon={<Users className="h-5 w-5" />} color="blue" />
              <StatCard label="À examiner" value={pendingCount} icon={<ClipboardList className="h-5 w-5" />} color="amber" />
              <StatCard label="Dossiers validés" value={validatedCount} icon={<CheckCircle2 className="h-5 w-5" />} color="emerald" />
              <StatCard label="Dossiers refusés" value={rejectedCount} icon={<XCircle className="h-5 w-5" />} color="rose" />
            </section>
            <section className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2"><div className="min-w-0"><h2 className="text-base font-bold text-white">Dossiers à traiter</h2><p className="text-xs text-slate-400">Les dernières inscriptions soumises ou en révision.</p></div><button onClick={() => setActiveTab('students')} className={`text-xs font-bold text-blue-400 hover:text-blue-300 ${touch}`}>Voir tous les dossiers</button></div>
              {loading ? <p className="py-8 text-center text-sm text-slate-400">Chargement des inscriptions…</p> : <RecentStudents students={students.filter((student) => student.registrationStatus === 'SOUMIS' || student.registrationStatus === 'EN_REVISION').slice(0, 5)} />}
            </section>
          </>}

          {activeTab === 'students' && !selectedEstablishment && <section className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
            <div className="mb-5 grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto_auto]"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Rechercher partout par nom ou e-mail" className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-3 text-base sm:text-sm max-[1024px]:min-h-[44px]" /></label><select value={globalStatus} onChange={(event) => setGlobalStatus(event.target.value as Status | '')} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-base sm:text-sm max-[1024px]:min-h-[44px]"><option value="">Tous les statuts</option>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><button onClick={exportStudentsCsv} className="min-h-[44px] rounded-xl border border-blue-500/40 px-3 text-xs font-bold text-blue-300">Exporter CSV</button><button onClick={exportStudentsPdf} className="min-h-[44px] rounded-xl border border-slate-700 px-3 text-xs font-bold">Exporter PDF</button></div>
            {(globalSearch || globalStatus) && <div className="mb-5 space-y-2"><p className="text-xs text-slate-400">{displayedGlobalStudents.length} dossier(s) trouvé(s)</p><StudentTable students={displayedGlobalStudents} updateStatus={updateStatus} viewDossier={setDossierStudentId} /></div>}
            <div className="mb-5"><h2 className="text-base font-bold text-white">Choisir un établissement</h2><p className="mt-1 text-xs text-slate-400">Accédez à la liste des étudiants classée par établissement.</p></div>
            {loading ? <p className="py-12 text-center text-slate-400">Chargement des établissements…</p> : <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">{establishments.map((item) => <button key={item.establishment} onClick={() => void openEstablishment(item.establishment)} className="group min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-blue-500/60 hover:bg-blue-500/10 sm:p-5"><div className="flex items-start justify-between gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10"><GraduationCap className="h-5 w-5 text-blue-400" /></div><span className="shrink-0 rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-400">{item.studentCount} étudiant(s)</span></div><h3 className="mt-4 break-words text-sm font-bold text-white group-hover:text-blue-300 sm:mt-5">{item.establishment}</h3><p className="mt-1 text-xs text-slate-500">Voir les étudiants</p></button>)}{!establishments.length && <p className="col-span-full rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500 sm:p-10">Aucun établissement avec étudiant.</p>}</div>}
          </section>}

          {activeTab === 'students' && selectedEstablishment && <section className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
            <button onClick={() => setSelectedEstablishment('')} className={`mb-4 flex items-center gap-2 text-xs font-bold text-blue-400 transition hover:text-blue-300 sm:mb-5 ${touch}`}><ArrowLeft className="h-4 w-4" />Tous les établissements</button>
            <div className="mb-5"><h2 className="break-words text-lg font-bold text-white sm:text-xl">{selectedEstablishment}</h2><p className="mt-1 text-xs text-slate-400">Liste des étudiants de cet établissement.</p></div>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)_minmax(10rem,14rem)_auto]">
              <label className="relative sm:col-span-2 xl:col-span-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input aria-label="Rechercher par nom ou e-mail" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Rechercher par nom ou e-mail…" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 sm:text-sm max-[1024px]:min-h-[44px]" /></label>
              <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-300 outline-none focus:border-blue-500 sm:text-sm max-[1024px]:min-h-[44px]"><option value="">Tous les niveaux</option>{establishmentLevels.map((level) => <option key={level} value={level}>{level}</option>)}</select>
              <select value={programFilter} onChange={(event) => setProgramFilter(event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-base text-slate-300 outline-none focus:border-blue-500 sm:text-sm max-[1024px]:min-h-[44px]"><option value="">Tous les parcours</option>{establishmentPrograms.map((program) => <option key={program} value={program}>{program}</option>)}</select>
              <span className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-400 sm:col-span-2 xl:col-span-1">{displayedEstablishmentStudents.length} étudiant(s)</span>
            </div>
            <StudentTable students={displayedEstablishmentStudents} updateStatus={updateStatus} viewDossier={setDossierStudentId} />
          </section>}

          {activeTab === 'accounts' && <section className="grid w-full gap-4 sm:gap-6 min-[1025px]:min-h-[calc(100vh-10.5rem)] min-[1025px]:grid-cols-[minmax(22rem,.85fr)_minmax(0,1.65fr)]">
            <form onSubmit={createStaffAccount} className="h-full min-w-0 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
              <h2 className="text-base font-bold text-white">Nouveau compte</h2><p className="mt-1 text-xs leading-5 text-slate-400">Créez un accès pour un établissement ou un agent de la scolarité centrale.</p>
              {accountMessage && <p className="mt-4 break-words rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{accountMessage}</p>}
              <div className="mt-5 space-y-3">
                <input required value={accountForm.fullName} onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })} placeholder="Nom complet" className={inputCls} />
                <input required type="email" value={accountForm.email} onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })} placeholder="Adresse e-mail" className={inputCls} />
                <PasswordField value={accountForm.password} onChange={(value) => setAccountForm({ ...accountForm, password: value })} placeholder="Mot de passe (8 caractères minimum)" />
                <select value={accountForm.role} onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value as StaffRole })} className={inputCls}><option value="ETABLISSEMENT">Responsable d’établissement</option><option value="SCOLARITE_CENTRALE">Scolarité centrale</option></select>
                {accountForm.role === 'ETABLISSEMENT' && <input required value={accountForm.establishment} onChange={(e) => setAccountForm({ ...accountForm, establishment: e.target.value })} placeholder="Nom de l’établissement" className={inputCls} />}
                <button disabled={creatingAccount} className="min-h-[44px] w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50">{creatingAccount ? 'Création…' : 'Créer le compte'}</button>
              </div>
            </form>
            <div className="flex h-full min-w-0 flex-col rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6"><h2 className="text-base font-bold text-white">Comptes créés</h2><p className="mt-1 text-xs text-slate-400">{staffAccounts.length} compte(s) établissement ou scolarité. Les mots de passe restent protégés et peuvent être réinitialisés.</p>
              <div className="mt-5 flex flex-1 flex-col content-start gap-3">
                {staffAccounts.map((account) => <div key={account.id} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words font-bold text-white">{account.fullName}</p>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${account.active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>{account.active ? 'Actif' : 'Désactivé'}</span>
                      </div>
                      <p className="mt-0.5 break-all text-xs text-slate-400">{account.email}</p>
                      <p className="mt-1 break-words text-xs font-semibold text-blue-300">{staffRoleLabel(account)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <IconButton title={account.active ? 'Désactiver' : 'Réactiver'} onClick={() => void updateStaffAccount(account)}>{account.active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</IconButton>
                      <IconButton title="Modifier le nom" onClick={() => { setEditingAccountId(account.id); setEditingName(account.fullName); setResettingAccountId(''); }}><Pencil className="h-4 w-4" /></IconButton>
                      <IconButton title="Réinitialiser le mot de passe" onClick={() => { setResettingAccountId(account.id); setResetPassword(''); setEditingAccountId(''); }}><RotateCcw className="h-4 w-4" /></IconButton>
                      <IconButton title="Mettre à la corbeille" tone="danger" onClick={() => void trashStaffAccountHandler(account)}><Trash2 className="h-4 w-4" /></IconButton>
                    </div>
                  </div>
                  {editingAccountId === account.id && <form onSubmit={(event) => void updateStaffName(event, account.id)} className="mt-3 space-y-2">
                    <input required value={editingName} onChange={(event) => setEditingName(event.target.value)} placeholder="Nom complet" className={inputCls} />
                    <div className="flex gap-2">
                      <button className={`flex-1 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-500 ${touch}`}>Enregistrer</button>
                      <button type="button" onClick={() => { setEditingAccountId(''); setEditingName(''); }} className={`flex-1 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-rose-500/40 hover:text-rose-300 ${touch}`}>Annuler</button>
                    </div>
                  </form>}
                  {resettingAccountId === account.id && <form onSubmit={(event) => void updateStaffPassword(event, account.id)} className="mt-3 space-y-2">
                    <PasswordField value={resetPassword} onChange={setResetPassword} placeholder="Nouveau mot de passe" />
                    <div className="flex gap-2">
                      <button className={`flex-1 rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-500 ${touch}`}>Enregistrer le nouveau mot de passe</button>
                      <button type="button" onClick={() => { setResettingAccountId(''); setResetPassword(''); }} className={`rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-rose-500/40 hover:text-rose-300 ${touch}`}>Annuler</button>
                    </div>
                  </form>}
                </div>)}
                {!staffAccounts.length && <p className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Aucun compte du personnel.</p>}
              </div>
            </div>
          </section>}

          {activeTab === 'users' && <section className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white">Tous les comptes de la plateforme</h2>
                <p className="text-xs text-slate-400">{allUsers.length} compte(s), tous rôles confondus (étudiants, personnel, administration).</p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={usersSearch} onChange={(e) => setUsersSearch(e.target.value)} placeholder="Rechercher par nom ou e-mail…" className={`${inputCls} pl-9`} />
              </div>
              <select value={usersRoleFilter} onChange={(e) => setUsersRoleFilter(e.target.value as AnyUserRole | '')} className={`${inputCls} w-full sm:w-auto`}>
                <option value="">Tous les rôles</option>
                {(Object.keys(roleLabels) as AnyUserRole[]).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
              </select>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
                  <tr><th className="p-3">Nom</th><th className="p-3">Rôle</th><th className="p-3">Établissement</th><th className="p-3">Statut</th><th className="p-3">Créé le</th><th className="p-3">Actions</th></tr>
                </thead>
                <tbody>
                  {filteredAllUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-800/70">
                      <td className="p-3"><p className="font-bold text-white">{user.fullName}</p><p className="break-all text-xs text-slate-400">{user.email}</p></td>
                      <td className="p-3 text-slate-300">{roleLabels[user.role]}</td>
                      <td className="p-3 text-slate-300">{user.establishment ?? '—'}<br /><span className="text-xs text-slate-500">{user.level ?? user.program ?? ''}</span></td>
                      <td className="p-3 space-y-1">
                        {user.role === 'ETUDIANT' && <span className={`block w-fit rounded-full border px-2 py-1 text-xs font-semibold ${statusStyles[user.registrationStatus]}`}>{statusLabels[user.registrationStatus]}</span>}
                        <span className={`block w-fit rounded-full border px-2 py-0.5 text-[10px] font-bold ${user.active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>{user.active ? 'Actif' : 'Désactivé'}</span>
                      </td>
                      <td className="whitespace-nowrap p-3 text-slate-400">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className="p-3">
                        {user.id === currentUserId ? (
                          <span className="text-xs text-slate-600">Votre compte</span>
                        ) : (
                          <div className="flex gap-2">
                            <IconButton title={user.active ? 'Désactiver' : 'Réactiver'} onClick={() => void toggleAccountActive(user)}>{user.active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</IconButton>
                            <IconButton title="Supprimer" tone="danger" onClick={() => void deleteAccountHandler(user)}><Trash2 className="h-4 w-4" /></IconButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!filteredAllUsers.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">Aucun compte trouvé.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredAllUsers.map((user) => (
                <div key={user.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-white">{user.fullName}</p>
                      <p className="break-all text-xs text-slate-400">{user.email}</p>
                      <p className="mt-1 text-xs font-semibold text-blue-300">{roleLabels[user.role]}{user.establishment ? ` · ${user.establishment}` : ''}</p>
                    </div>
                    {user.id !== currentUserId && (
                      <div className="flex shrink-0 gap-2">
                        <IconButton title={user.active ? 'Désactiver' : 'Réactiver'} onClick={() => void toggleAccountActive(user)}>{user.active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}</IconButton>
                        <IconButton title="Supprimer" tone="danger" onClick={() => void deleteAccountHandler(user)}><Trash2 className="h-4 w-4" /></IconButton>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {user.role === 'ETUDIANT' && <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusStyles[user.registrationStatus]}`}>{statusLabels[user.registrationStatus]}</span>}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${user.active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>{user.active ? 'Actif' : 'Désactivé'}</span>
                  </div>
                </div>
              ))}
              {!filteredAllUsers.length && <p className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Aucun compte trouvé.</p>}
            </div>
          </section>}

          {activeTab === 'history' && <section className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
            <h2 className="text-base font-bold text-white">Historique des actions</h2>
            <p className="mt-1 text-xs text-slate-400">Actions effectuées sur les comptes du personnel, les plus récentes en premier.</p>
            <div className="mt-5 space-y-2">
              {auditLog.map((entry) => <div key={entry.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="break-words text-sm text-slate-200"><span className="font-bold text-white">{entry.actorName}</span> {auditActionLabels[entry.action]} <span className="font-bold text-blue-300">{entry.targetName}</span></p>
                {entry.detail && <p className="mt-0.5 break-words text-xs text-slate-500">{entry.detail}</p>}
                <p className="mt-1 text-[11px] text-slate-500">{new Date(entry.createdAt).toLocaleString('fr-FR')}</p>
              </div>)}
              {!auditLog.length && <p className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Aucune action enregistrée.</p>}
            </div>
          </section>}

          {activeTab === 'trash' && <section className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-6">
            <h2 className="text-base font-bold text-white">Corbeille</h2>
            <p className="mt-1 text-xs text-slate-400">Comptes supprimés récemment. Restaurez-les ou supprimez-les définitivement.</p>
            <div className="mt-5 flex flex-col gap-3">
              {trashedAccounts.map((account) => <div key={account.id} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="min-w-0 break-words font-bold text-white">{account.fullName}</p>
                    <p className="mt-0.5 break-all text-xs text-slate-400">{account.email}</p>
                    <p className="mt-1 break-words text-xs font-semibold text-blue-300">{staffRoleLabel(account)}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Supprimé le {new Date(account.deletedAt).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <IconButton title="Restaurer" onClick={() => void restoreStaffAccountHandler(account)}><RotateCcw className="h-4 w-4" /></IconButton>
                    <IconButton title="Supprimer définitivement" tone="danger" onClick={() => { setPurgingAccountId(account.id); setPurgeConfirmText(''); }}><Trash2 className="h-4 w-4" /></IconButton>
                  </div>
                </div>
                {purgingAccountId === account.id && <form onSubmit={(event) => void purgeStaffAccountHandler(event, account)} className="mt-3 space-y-2">
                  <p className="text-xs text-rose-300">Cette action est irréversible. Tapez « {account.fullName} » pour confirmer.</p>
                  <input required value={purgeConfirmText} onChange={(event) => setPurgeConfirmText(event.target.value)} placeholder={account.fullName} className={inputCls} />
                  <div className="flex gap-2">
                    <button disabled={purgeConfirmText.trim() !== account.fullName} className={`flex-1 rounded-lg bg-rose-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-rose-500 disabled:opacity-40 ${touch}`}>Supprimer définitivement</button>
                    <button type="button" onClick={() => { setPurgingAccountId(''); setPurgeConfirmText(''); }} className={`flex-1 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-slate-500 ${touch}`}>Annuler</button>
                  </div>
                </form>}
              </div>)}
              {!trashedAccounts.length && <p className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">La corbeille est vide.</p>}
            </div>
          </section>}

          {activeTab === 'settings' && (
            <AdminSettingsPanel
              settings={settings}
              onChange={setSettings}
              tabbed
              hideNav
              activeTabId={settingsTabId}
              extraTabs={[
                { id: 'homepage', label: "Page d'accueil", icon: <Globe className="h-4 w-4" />, content: <HomepageSettingsPanel /> },
              ]}
            />
          )}
        </main>
      </div>
      {dossierStudentId && <DossierViewer endpoint={`/admin/students/${dossierStudentId}/dossier`} onClose={() => setDossierStudentId(null)} />}
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

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button onClick={onClick} className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>{icon}{children}</button>;
}

function IconButton({ title, onClick, children, tone = 'default' }: { title: string; onClick: () => void; children: React.ReactNode; tone?: 'default' | 'danger' }) {
  return <button type="button" title={title} aria-label={title} onClick={onClick} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition ${tone === 'danger' ? 'border-slate-700 text-slate-300 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300' : 'border-slate-700 text-slate-300 hover:border-blue-500/50 hover:text-white'} ${touch}`}>{children}</button>;
}

function PasswordField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <input required minLength={8} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${inputCls} pr-11`} />
    <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200">
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  </div>;
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: 'blue' | 'amber' | 'emerald' | 'rose' }) {
  const colors = { blue: 'border-blue-500/20 bg-blue-500/10 text-blue-400', amber: 'border-amber-500/20 bg-amber-500/10 text-amber-400', emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400', rose: 'border-rose-500/20 bg-rose-500/10 text-rose-400' };
  return <div className="min-w-0 rounded-3xl border border-slate-800/80 bg-slate-900/90 p-4 sm:p-5"><div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border sm:mb-4 ${colors[color]}`}>{icon}</div><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-white">{value}</p></div>;
}

function RecentStudents({ students }: { students: Student[] }) {
  if (!students.length) return <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Aucun dossier en attente pour le moment.</p>;
  return <div className="space-y-2">{students.map((student) => <div key={student.id} className="flex flex-col items-start gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"><div className="min-w-0"><p className="break-words text-sm font-bold text-white">{student.fullName}</p><p className="break-words text-xs text-slate-400">{student.establishment ?? 'Établissement non renseigné'} · {student.email}</p></div><StatusBadge status={student.registrationStatus} /></div>)}</div>;
}

function StudentTable({ students, updateStatus, viewDossier }: { students: Student[]; updateStatus: (id: string, status: Status) => Promise<void>; viewDossier: (id: string) => void }) {
  return <>
    {/* Téléphone : une carte par étudiant */}
    <div className="space-y-3 md:hidden">
      {students.map((student) => <div key={student.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <p className="break-words font-bold text-white">{student.fullName}</p>
        <p className="break-all text-xs text-slate-400">{student.email}</p>
        <div className="mt-3 flex items-start justify-between gap-3 text-xs">
          <div className="min-w-0"><p className="break-words text-slate-300">{student.establishment ?? 'Non renseigné'}</p><p className="text-slate-500">{student.level ?? student.program ?? '—'}</p></div>
          <span className="shrink-0 text-slate-400">{new Date(student.createdAt).toLocaleDateString('fr-FR')}</span>
        </div>
        <select aria-label={`Statut de ${student.fullName}`} value={student.registrationStatus} onChange={(event) => void updateStatus(student.id, event.target.value as Status)} className={`mt-3 min-h-[44px] w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none ${statusStyles[student.registrationStatus]}`}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><button onClick={() => viewDossier(student.id)} className="mt-2 min-h-[44px] w-full rounded-lg border border-blue-500/40 px-3 text-xs font-bold text-blue-300">Voir le dossier</button>
      </div>)}
      {students.length === 0 && <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Aucun étudiant trouvé.</p>}
    </div>

    {/* Tablette et ordinateur : tableau (défilement horizontal interne si besoin) */}
    <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[780px] text-left text-sm"><thead className="border-b border-slate-800 text-xs uppercase text-slate-500"><tr><th className="p-3">Étudiant</th><th className="p-3">Formation</th><th className="p-3">Date</th><th className="p-3">Statut</th><th className="p-3">Dossier</th></tr></thead><tbody>{students.map((student) => <tr key={student.id} className="border-b border-slate-800/70"><td className="p-3"><p className="font-bold text-white">{student.fullName}</p><p className="break-all text-xs text-slate-400">{student.email}</p></td><td className="p-3 text-slate-300">{student.establishment ?? 'Non renseigné'}<br /><span className="text-xs text-slate-500">{student.level ?? student.program ?? '—'}</span></td><td className="whitespace-nowrap p-3 text-slate-400">{new Date(student.createdAt).toLocaleDateString('fr-FR')}</td><td className="p-3"><select aria-label={`Statut de ${student.fullName}`} value={student.registrationStatus} onChange={(event) => void updateStatus(student.id, event.target.value as Status)} className={`rounded-lg border px-2 py-1.5 text-xs font-semibold outline-none max-[1024px]:min-h-[44px] ${statusStyles[student.registrationStatus]}`}>{statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></td><td className="p-3"><button onClick={() => viewDossier(student.id)} className="min-h-[44px] rounded-lg border border-blue-500/40 px-3 text-xs font-bold text-blue-300">Voir le dossier</button></td></tr>)}{students.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-slate-500">Aucun étudiant trouvé.</td></tr>}</tbody></table></div>
  </>;
}

function StatusBadge({ status }: { status: Status }) { return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[status]}`}>{statusLabels[status]}</span>; }
