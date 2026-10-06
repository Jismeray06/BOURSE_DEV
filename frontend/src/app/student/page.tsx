'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSettingsPanel } from '../../components/AdminSettingsPanel';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useInterfaceSettings, useSystemDark } from '../../components/useInterfaceSettings';
import { EstablishmentIcon, logoSrc, useEstablishments } from '../../components/establishments';
import { HeaderToolbar } from '../../components/HeaderToolbar';
import { useNotifications, type AppNotification } from '../../components/useNotifications';
import { isDarkRendering, toggleLightDark } from '../../components/adminSettings';
import { 
  GraduationCap, 
  LogOut, 
  CheckCircle2, 
  Download, 
  Building2, 
  ShieldCheck, 
  Bell,
  Settings,
  AlertTriangle,
  FileCheck,
  Upload,
  Check,
  File,
  ArrowRight,
  ArrowLeft,
  Search,
  Layers,
  BookOpen,
  Menu,
  X,
  Printer,
  FolderOpen,
  XCircle,
  Send,
} from 'lucide-react';

const NIVEAUX = ['Licence 1 (L1)', 'Licence 2 (L2)', 'Licence 3 (L3)', 'Master 1 (M1)', 'Master 2 (M2)'];

const PARCOURS_LIST = [
  'Génie Logiciel & Base de Données',
  "Systèmes d'Information & Réseaux",
  'Médecine Générale',
  'Sciences Infirmières & Soins',
  'Droit Privé & des Affaires',
  "Gestion & Administration d'Entreprise",
  'Économie & Finance Publique',
  'Études Anglophones & Linguistique',
  'Histoire & Civilisations',
  'Biologie & Environnement',
];

const STEP_LABELS = ['Établissement', 'Niveau', 'Parcours', 'Quitus', 'Pièces'];

// Zone tactile confortable (44px) sur téléphone et tablette uniquement
const touch = 'max-[1024px]:min-h-[44px]';

type SavedApplication = {
  establishment: string;
  level: string;
  program: string;
  status: 'BROUILLON' | 'SOUMIS' | 'EN_REVISION' | 'VALIDE' | 'REFUSE';
  quitus: { code: string } | null;
  reviewNote: string | null;
};
type CurriculumOption = { id: string; name: string; active: boolean; cycle: 'LICENCE' | 'MASTER' };
type IsstmCurriculum = { levels: CurriculumOption[]; programs: CurriculumOption[] };
const cycleForNiveau = (niveau: string): 'LICENCE' | 'MASTER' => (niveau.startsWith('Master') ? 'MASTER' : 'LICENCE');

type DocumentType = { type: string; label: string };
const DEFAULT_CANDIDATURE_DOCUMENTS: DocumentType[] = [
  { type: 'cin', label: "Photocopie EN COULEUR de la Carte d'Identité Nationale légalisée" },
  { type: 'quitus', label: 'Quitus d’inscription ou de réinscription définitive pour l’Année Universitaire en cours' },
  { type: 'residence', label: 'Certificat de résidence de l’étudiant à Mahajanga' },
  { type: 'unemployment', label: 'Attestation de chômage délivrée par la Direction Régionale du Travail, de l’Emploi, de la Fonction Publique (FOP)' },
  { type: 'bac', label: 'Photocopie certifiée du relevé de notes du Baccalauréat' },
];
const DOCUMENT_SUBTITLES: Record<string, string> = {
  cin: "Copie d'acte de naissance pour les mineurs (PDF, PNG, JPG)",
  quitus: '(PDF, PNG, JPG)',
  residence: '(PDF, PNG, JPG)',
  unemployment: 'Pour les doctorants n’exerçant aucune activité rémunératrice (PDF, PNG, JPG)',
  bac: 'Pour les étudiants en L1 (PDF, PNG, JPG)',
};
export default function StudentPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mydossier' | 'notifications' | 'settings'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [settings, setSettings] = useInterfaceSettings('student');
  const systemDark = useSystemDark();
  const notifications = useNotifications();

  // Gestion de l'état du formulaire par étapes
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quitusVerified, setQuitusVerified] = useState(false);
  const [quitusError, setQuitusError] = useState('');
  const [quitusLoading, setQuitusLoading] = useState(false);
  // Étape « code reçu par e-mail » : adresse masquée de la fiche et code saisi.
  const [otpMaskedEmail, setOtpMaskedEmail] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState('');
  const [applicationLoading, setApplicationLoading] = useState(true);
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<SavedApplication['status'] | null>(null);
  const [applicationReviewNote, setApplicationReviewNote] = useState<string | null>(null);
  // Curriculum de l'établissement choisi (vide si l'établissement n'en a pas configuré : listes par défaut).
  const [curriculumState, setCurriculumState] = useState<{ name: string; data: IsstmCurriculum }>({ name: '', data: { levels: [], programs: [] } });
  const [establishmentSearch, setEstablishmentSearch] = useState('');
  const [parcoursSearch, setParcoursSearch] = useState('');
  const [showAttestation, setShowAttestation] = useState(false);

  const [studentData, setStudentData] = useState({
    nom: 'RAKOTO',
    prenom: 'Jean',
    email: 'etudiant@gmail.com',
    etablissement: '',
    niveau: NIVEAUX[0],
    parcours: PARCOURS_LIST[0],
    quitusNumero: '',
    dateInscription: '11 Septembre 2026',
  });

  // Liste gérée par l'administrateur : le premier établissement est présélectionné tant que rien n'est choisi.
  const { establishments } = useEstablishments((list) => setStudentData((current) => (current.etablissement ? current : { ...current, etablissement: list[0]?.name ?? '' })));

  const [candidatureDocumentTypes, setCandidatureDocumentTypes] = useState<DocumentType[]>(DEFAULT_CANDIDATURE_DOCUMENTS);
  const [uploadState, setUploadState] = useState<Record<string, { file: File | null; stored: boolean }>>({});

  useEffect(() => {
    const loadApplication = async () => {
      const authToken = sessionStorage.getItem('auth_token');
      if (!authToken || sessionStorage.getItem('user_role') !== 'ETUDIANT') {
        router.replace('/login');
        return;
      }
      const storedUser = sessionStorage.getItem('auth_user');
      try {
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser) as { fullName?: string; email?: string };
            const nameParts = user.fullName?.trim().split(/\s+/) ?? [];
            if (nameParts.length) setStudentData((current) => ({ ...current, prenom: nameParts[0], nom: nameParts.slice(1).join(' ') || nameParts[0], email: user.email?.trim() || current.email }));
          } catch {
            sessionStorage.removeItem('auth_user');
          }
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/student/application`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (response.status === 401) { sessionStorage.clear(); router.replace('/login'); return; }
        if (!response.ok) throw new Error('Impossible de charger votre dossier.');
        const application = await response.json().catch(() => null) as SavedApplication | null;
        if (application) {
          setStudentData((current) => ({ ...current, etablissement: application.establishment, niveau: application.level, parcours: application.program, quitusNumero: application.quitus?.code ?? current.quitusNumero }));
          setQuitusVerified(Boolean(application.quitus));
          setApplicationStatus(application.status);
          setApplicationReviewNote(application.reviewNote);
          const documentsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/student/application/documents`, { headers: { Authorization: `Bearer ${authToken}` } });
          if (documentsResponse.ok) {
            const storedDocuments = await documentsResponse.json() as { type: string }[];
            setUploadState((current) => {
              const next = { ...current };
              for (const stored of storedDocuments) next[stored.type] = { file: next[stored.type]?.file ?? null, stored: true };
              return next;
            });
          }
          if (application.status !== 'BROUILLON') setIsSubmitted(true);
          else if (application.quitus) setCurrentStep(5);
        }
      } catch (error) {
        setQuitusError(error instanceof Error ? error.message : 'Impossible de charger votre dossier.');
      } finally {
        setApplicationLoading(false);
      }
    };
    void loadApplication();
    const refreshInterval = window.setInterval(() => void loadApplication(), 30_000);
    return () => window.clearInterval(refreshInterval);
  }, [router]);

  const cycleLevels = (data: IsstmCurriculum) => (data.levels.length ? data.levels.map((item) => item.name) : NIVEAUX);
  const cyclePrograms = (data: IsstmCurriculum, niveau: string) => (data.programs.length ? data.programs.filter((item) => item.cycle === cycleForNiveau(niveau)).map((item) => item.name) : PARCOURS_LIST);

  // Charge le curriculum de l'établissement choisi, puis ajuste niveau et parcours s'ils n'y figurent pas.
  useEffect(() => {
    const name = studentData.etablissement;
    if (!name) return;
    const load = async () => {
      let data: IsstmCurriculum = { levels: [], programs: [] };
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/establishments/${encodeURIComponent(name)}/curriculum`);
        if (response.ok) data = await response.json() as IsstmCurriculum;
      } catch {
        // Les listes par défaut restent disponibles si l'API est temporairement indisponible.
      }
      setCurriculumState({ name, data });
      setStudentData((current) => {
        if (current.etablissement !== name) return current;
        const levels = cycleLevels(data);
        const niveau = levels.includes(current.niveau) ? current.niveau : levels[0] ?? '';
        const programs = cyclePrograms(data, niveau);
        return { ...current, niveau, parcours: programs.includes(current.parcours) ? current.parcours : programs[0] ?? '' };
      });
    };
    void load();
  }, [studentData.etablissement]);

  const curriculum = curriculumState.name === studentData.etablissement ? curriculumState.data : { levels: [], programs: [] };
  const availableLevels = cycleLevels(curriculum);
  const availablePrograms = cyclePrograms(curriculum, studentData.niveau);
  const filteredEtablissements = establishments.filter((item) => item.name.toLowerCase().includes(establishmentSearch.trim().toLowerCase()));
  const filteredPrograms = availablePrograms.filter((parcours) => parcours.toLowerCase().includes(parcoursSearch.trim().toLowerCase()));
  const chooseEstablishment = (establishment: string) => {
    setStudentData((current) => ({ ...current, etablissement: establishment, quitusNumero: '' }));
    setQuitusVerified(false);
  };

  useEffect(() => {
    const loadDocumentTypes = async () => {
      if (!studentData.etablissement) { setCandidatureDocumentTypes(DEFAULT_CANDIDATURE_DOCUMENTS); return; }
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/establishments/${encodeURIComponent(studentData.etablissement)}/document-requirements`);
        if (!response.ok) { setCandidatureDocumentTypes(DEFAULT_CANDIDATURE_DOCUMENTS); return; }
        const data = await response.json() as DocumentType[];
        setCandidatureDocumentTypes(data.length ? data : DEFAULT_CANDIDATURE_DOCUMENTS);
      } catch {
        setCandidatureDocumentTypes(DEFAULT_CANDIDATURE_DOCUMENTS);
      }
    };
    void loadDocumentTypes();
  }, [studentData.etablissement]);

  const documents = candidatureDocumentTypes.map((docType, index) => {
    const upload = uploadState[docType.type];
    return {
      id: index + 1,
      type: docType.type,
      title: docType.label,
      subtitle: DOCUMENT_SUBTITLES[docType.type] ?? '(PDF, PNG, JPG)',
      file: upload?.file ?? null,
      stored: upload?.stored ?? false,
    };
  });

  const handleFileUpload = async (id: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(uploadedFile.type) || uploadedFile.size > 10 * 1024 * 1024) {
      setQuitusError('Formats acceptés : PDF, PNG ou JPG, avec une taille maximale de 10 Mo.');
      return;
    }
    const docType = documents.find((document) => document.id === id)?.type;
    if (!docType) return;
    setQuitusError('');
    setUploadState((current) => ({ ...current, [docType]: { file: uploadedFile, stored: false } }));
    const formData = new FormData();
    formData.append('file', uploadedFile);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/student/application/documents/${docType}`, { method: 'POST', headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` }, body: formData });
    const result = await response.json().catch(() => ({})) as { message?: string | string[] };
    if (!response.ok) {
      setUploadState((current) => ({ ...current, [docType]: { file: null, stored: false } }));
      setQuitusError(Array.isArray(result.message) ? result.message[0] : result.message ?? 'Impossible d’enregistrer cette pièce.');
      return;
    }
    setUploadState((current) => ({ ...current, [docType]: { file: uploadedFile, stored: true } }));
  };

  // Toutes les pièces sont requises, sauf l'attestation de chômage (doctorants) et le relevé de bac (requis en L1 uniquement).
  const requiredDocuments = documents.filter((document) => document.type !== 'unemployment' && (document.type !== 'bac' || studentData.niveau === 'Licence 1 (L1)'));
  const missingDocuments = requiredDocuments.filter((document) => !document.file && !document.stored);
  const documentsComplete = missingDocuments.length === 0;

  const persistApplication = async (submit = false, override: Partial<typeof studentData> = {}) => {
    const data = { ...studentData, ...override };
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/student/application${submit ? '/submit' : ''}`, {
      method: submit ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` },
      body: JSON.stringify({ establishment: data.etablissement, level: data.niveau, program: data.parcours, quitusCode: data.quitusNumero || undefined }),
    });
    const result = await response.json().catch(() => ({})) as { message?: string | string[] };
    if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message[0] : result.message ?? 'Impossible d’enregistrer le dossier.');
  };

  const handleNextStep = async () => {
    try {
      setQuitusError('');
      await persistApplication();
      if (currentStep < 5) setCurrentStep(currentStep + 1);
    } catch (error) {
      setQuitusError(error instanceof Error ? error.message : 'Impossible d’enregistrer le brouillon.');
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const callQuitus = async (path: 'verify' | 'confirm', extra: Record<string, string> = {}) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/quitus/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('auth_token') ?? ''}` },
      body: JSON.stringify({ code: studentData.quitusNumero, establishment: studentData.etablissement, ...extra }),
    });
    const result = await response.json().catch(() => ({})) as { message?: string | string[]; verified?: boolean; requiresCode?: boolean; maskedEmail?: string };
    if (!response.ok) throw new Error((Array.isArray(result.message) ? result.message[0] : result.message) ?? 'Quitus invalide.');
    return result;
  };

  // Quitus reconnu : on l'enregistre dans le dossier puis on passe à l'étape des pièces.
  const quitusAccepted = async () => {
    await persistApplication(false, { quitusNumero: studentData.quitusNumero.trim().toUpperCase() });
    setOtpMaskedEmail(null);
    setOtpValue('');
    setQuitusVerified(true);
    setCurrentStep(5);
  };

  const handleVerifyQuitus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData.quitusNumero.trim()) return;
    if (otpMaskedEmail && !/^\d{6}$/.test(otpValue.trim())) { setQuitusError('Saisissez le code à 6 chiffres reçu par e-mail.'); return; }
    setQuitusError('');
    setQuitusLoading(true);
    try {
      const result = otpMaskedEmail ? await callQuitus('confirm', { otp: otpValue.trim() }) : await callQuitus('verify');
      if (result.requiresCode) {
        setOtpMaskedEmail(result.maskedEmail ?? 'votre adresse e-mail');
        setOtpValue('');
        return;
      }
      await quitusAccepted();
    } catch (error) {
      setQuitusError(error instanceof Error ? error.message : 'Impossible de vérifier le quitus.');
    } finally {
      setQuitusLoading(false);
    }
  };

  const resendQuitusCode = async () => {
    setQuitusError('');
    setQuitusLoading(true);
    try {
      const result = await callQuitus('verify');
      if (result.requiresCode) setOtpMaskedEmail(result.maskedEmail ?? 'votre adresse e-mail');
      else await quitusAccepted();
    } catch (error) {
      setQuitusError(error instanceof Error ? error.message : 'Impossible de renvoyer le code.');
    } finally {
      setQuitusLoading(false);
    }
  };

  const submitApplication = async () => {
    if (!documentsComplete) {
      setQuitusError(`Téléversez toutes les pièces obligatoires avant de finaliser le dépôt (${missingDocuments.length} pièce(s) manquante(s)).`);
      return;
    }
    setSubmittingApplication(true);
    setQuitusError('');
    try {
      await persistApplication(true);
      setApplicationStatus('SOUMIS');
      setIsSubmitted(true);
    } catch (error) {
      setQuitusError(error instanceof Error ? error.message : 'Impossible de soumettre le dossier.');
    } finally {
      setSubmittingApplication(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 flex flex-col relative selection:bg-blue-600 selection:text-white">
      
      {/* Background Effect */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[160px] rounded-full pointer-events-none" />

      {/* --- SIDEBAR : cachée sous 1025px, ouverte via le bouton menu --- */}
      {sidebarOpen && <button aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-slate-950/70 min-[1025px]:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col justify-between overflow-y-auto bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-xl transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} min-[1025px]:translate-x-0`}>
        <div>
          <div className="p-5 sm:p-6 border-b border-slate-800/80 flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 rounded-2xl shadow-lg shadow-blue-500/20 shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent block leading-tight truncate">
                Univ Mahajanga
              </span>
              <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block mt-0.5 truncate">
                Espace Étudiant
              </span>
            </div>
            <button aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)} className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-slate-800 min-[1025px]:hidden"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-4 mx-3 my-4 bg-slate-950/60 border border-slate-800/60 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0">
              {studentData.prenom[0]}{studentData.nom[0]}
            </div>
            <div className="min-w-0 overflow-hidden">
              <h3 className="text-xs font-bold text-white truncate">{studentData.prenom} {studentData.nom}</h3>
              <p className="text-[10px] text-slate-400 truncate">{studentData.email}</p>
            </div>
          </div>

          <nav className="px-3 space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
              className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Dépôt de dossier</span>
            </button>

            <button
              disabled={!quitusVerified}
              onClick={() => { if (!quitusVerified) return; setActiveTab('mydossier'); setSidebarOpen(false); }}
              title={!quitusVerified ? 'Disponible après la vérification de votre quitus' : undefined}
              className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                !quitusVerified
                  ? 'text-slate-600 opacity-50 cursor-not-allowed'
                  : activeTab === 'mydossier'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 cursor-pointer'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 cursor-pointer'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Mon dossier</span>
            </button>

            <button
              onClick={() => { setActiveTab('notifications'); setSidebarOpen(false); }}
              className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </div>
              {notifications.unread > 0 && (
                <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                  {notifications.unread}
                </span>
              )}
            </button>

            <button
              disabled={!isSubmitted}
              onClick={() => { if (!isSubmitted) return; setActiveTab('settings'); setSidebarOpen(false); }}
              title={!isSubmitted ? 'Disponible après le dépôt de votre dossier' : undefined}
              className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                !isSubmitted
                  ? 'text-slate-600 opacity-50 cursor-not-allowed'
                  : activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 cursor-pointer'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 cursor-pointer'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-950 hover:bg-rose-500/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 font-semibold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* --- CONTENU PRINCIPAL : marge gauche = largeur exacte de la barre latérale (w-72) --- */}
      <div className="flex min-w-0 flex-1 flex-col min-h-screen relative z-10 min-[1025px]:ml-72">
        
        <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap items-center gap-3">
          <button aria-label="Ouvrir le menu" onClick={() => setSidebarOpen(true)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-800 transition hover:border-blue-500/50 min-[1025px]:hidden"><Menu className="w-5 h-5" /></button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-white sm:text-lg">Bienvenue, {studentData.prenom}</h1>
            <p className="truncate text-xs text-slate-400">Année universitaire 2025-2026</p>
          </div>

          <HeaderToolbar
            darkMode={isDarkRendering(settings, systemDark)}
            onToggleTheme={() => setSettings(toggleLightDark(settings, systemDark))}
            notifications={notifications.items.slice(0, 8).map((item) => ({
              id: item.id,
              title: item.title,
              subtitle: item.message,
              read: Boolean(item.readAt),
              onClick: () => { notifications.markRead(item.id); setActiveTab('notifications'); },
            }))}
            totalCount={notifications.unread}
            notificationsTitle="Notifications"
            notificationsEmpty="Aucune notification pour le moment."
            onMarkAllRead={notifications.markAllRead}
            onSeeAllNotifications={() => setActiveTab('notifications')}
            seeAllLabel="Voir toutes les notifications"
            roleLabel="Étudiant"
            menuItems={[
              { label: 'Notifications', icon: <Bell className="h-4 w-4" />, onClick: () => setActiveTab('notifications') },
              { label: 'Déconnexion', icon: <LogOut className="h-4 w-4" />, onClick: () => setLogoutConfirmOpen(true), danger: true },
            ]}
          />

          {/* Le statut passe sur sa propre ligne sur téléphone */}
          <span className={`order-last sm:order-none w-fit max-w-full px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1.5 border ${
            isSubmitted 
              ? applicationStatus === 'REFUSE' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : applicationStatus === 'VALIDE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Statut : {isSubmitted ? (applicationStatus === 'VALIDE' ? 'Dossier validé' : applicationStatus === 'REFUSE' ? 'Dossier refusé' : applicationStatus === 'EN_REVISION' ? 'Dossier en révision' : 'Dossier en attente') : `Étape ${currentStep}/5 en cours`}
          </span>
        </header>

        <main className="w-full min-w-0 flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6 min-[1025px]:p-8">
          
          {/* BARRE DE PROGRESSION DES ÉTAPES D'INSCRIPTION */}
          {!isSubmitted && activeTab === 'dashboard' && (
            <>
              <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-5 rounded-3xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                  {STEP_LABELS.map((label, index) => (
                    <span key={label} className={currentStep >= index + 1 ? 'text-blue-400' : ''}>
                      {index + 1}<span className="hidden sm:inline">. {label}</span>
                    </span>
                  ))}
                </div>
                <p className="px-1 text-xs font-semibold text-blue-400 sm:hidden">Étape {currentStep}/5 · {STEP_LABELS[currentStep - 1]}</p>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full transition-all duration-500"
                    style={{ width: `${(currentStep / 5) * 100}%` }}
                  />
                </div>
              </div>
              {quitusError && currentStep < 4 && <p role="alert" className="break-words rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{quitusError} Vérifiez que le backend est démarré sur le port 3001.</p>}
            </>
          )}

          {/* DÉPÔT DE DOSSIER : ÉTAPES OU RÉSULTAT */}
          {activeTab === 'dashboard' && (
            <>
              {/* ÉTAPE 1 : CHOIX ÉTABLISSEMENT */}
              {currentStep === 1 && !isSubmitted && (
                <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 md:p-8 rounded-3xl space-y-5 sm:space-y-6">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 shrink-0 text-blue-400" />
                      Choisissez votre établissement
                    </h2>
                    <p className="text-xs text-slate-400">Sélectionnez la faculté dans laquelle vous effectuez votre inscription.</p>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={establishmentSearch}
                      onChange={(e) => setEstablishmentSearch(e.target.value)}
                      placeholder="Rechercher un établissement..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition max-[1024px]:min-h-[44px]"
                    />
                  </div>

                  {filteredEtablissements.length === 0 && (
                    <p className="text-xs text-slate-500">Aucun établissement ne correspond à votre recherche.</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
                    {filteredEtablissements.map((item) => {
                      const isSelected = studentData.etablissement === item.name;
                      const logo = logoSrc(item.logoUrl);
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => chooseEstablishment(item.name)}
                          className={`min-w-0 min-h-[44px] p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                            isSelected ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isSelected ? 'border-blue-400/40 bg-blue-500/20 text-blue-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`}> {logo ? <img src={logo} alt="" className="h-full w-full rounded-lg object-contain" /> : <EstablishmentIcon name={item.name} className="h-4 w-4" />}</span>
                          <span className="min-w-0 flex-1 text-xs font-semibold text-white break-words">{item.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-blue-400 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button type="button" onClick={handleNextStep} className={`px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 ${touch}`}>
                      <span>Suivant</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : CHOIX NIVEAU */}
              {currentStep === 2 && !isSubmitted && (
                <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 md:p-8 rounded-3xl space-y-5 sm:space-y-6">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 shrink-0 text-blue-400" />
                      Sélectionnez votre niveau d&apos;étude
                    </h2>
                    <p className="text-xs text-slate-400">Choisissez votre année académique.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
                    {availableLevels.map((lvl) => {
                      const isSelected = studentData.niveau === lvl;
                      return (
                        <button
                          type="button"
                          key={lvl}
                          onClick={() => {
                            const programs = cyclePrograms(curriculum, lvl);
                            setStudentData({ ...studentData, niveau: lvl, parcours: programs.includes(studentData.parcours) ? studentData.parcours : programs[0] ?? '' });
                          }}
                          className={`min-w-0 min-h-[44px] p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                            isSelected ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${isSelected ? 'border-blue-400/40 bg-blue-500/20 text-blue-200' : 'border-slate-700 bg-slate-900 text-slate-400'}`}><Layers className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1 text-xs font-semibold text-white break-words">{lvl}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-blue-400 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button type="button" onClick={handlePrevStep} className={`px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer ${touch}`}>
                      <ArrowLeft className="w-4 h-4" />
                      <span>Précédent</span>
                    </button>
                    <button type="button" onClick={handleNextStep} className={`px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 ${touch}`}>
                      <span>Suivant</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : CHOIX PARCOURS */}
              {currentStep === 3 && !isSubmitted && (
                <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 md:p-8 rounded-3xl space-y-5 sm:space-y-6">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 shrink-0 text-blue-400" />
                      Choisissez votre parcours / spécialité
                    </h2>
                    <p className="text-xs text-slate-400">Sélectionnez la filière correspondante.</p>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={parcoursSearch}
                      onChange={(e) => setParcoursSearch(e.target.value)}
                      placeholder="Rechercher un parcours..."
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition max-[1024px]:min-h-[44px]"
                    />
                  </div>

                  {filteredPrograms.length === 0 && (
                    <p className="text-xs text-slate-500">Aucun parcours ne correspond à votre recherche.</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] sm:max-h-[280px] overflow-y-auto pr-1">
                    {filteredPrograms.map((parcours) => {
                      const isSelected = studentData.parcours === parcours;
                      return (
                        <button
                          type="button"
                          key={parcours}
                          onClick={() => setStudentData({ ...studentData, parcours })}
                          className={`p-3 min-h-[44px] rounded-xl border w-full text-left text-xs font-semibold transition cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected ? 'bg-blue-600/10 border-blue-500 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="min-w-0 break-words">{parcours}</span>
                          {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button type="button" onClick={handlePrevStep} className={`px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer ${touch}`}>
                      <ArrowLeft className="w-4 h-4" />
                      <span>Précédent</span>
                    </button>
                    <button type="button" onClick={handleNextStep} className={`px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 ${touch}`}>
                      <span>Suivant</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* ÉTAPE 4 : QUITUS */}
              {currentStep === 4 && !isSubmitted && (
                <form onSubmit={handleVerifyQuitus} className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 md:p-8 rounded-3xl space-y-5 sm:space-y-6">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <FileCheck className="w-5 h-5 shrink-0 text-blue-400" />
                      Validation du Quitus de paiement
                    </h2>
                    <p className="text-xs text-slate-400">Entrez le numéro indiqué sur votre ticket de paiement.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-400">Numéro de Quitus</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: ISSTM-2026-DEMO-001"
                      value={studentData.quitusNumero}
                      onChange={(e) => { setStudentData({ ...studentData, quitusNumero: e.target.value }); setOtpMaskedEmail(null); setOtpValue(''); }}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base sm:text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition font-medium tracking-wide max-[1024px]:min-h-[44px]"
                    />
                    <p className="text-[11px] text-slate-500 flex items-start gap-1.5 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-400" />
                      <span>Vérification dans la base de l&apos;établissement sélectionné : le quitus doit être le vôtre.</span>
                    </p>
                    {otpMaskedEmail && (
                      <div className="mt-3 space-y-2 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4">
                        <p className="text-xs text-slate-300">Un code de vérification à 6 chiffres vient d&apos;être envoyé à l&apos;adresse enregistrée par votre établissement : <strong className="text-white">{otpMaskedEmail}</strong>. Il est valable 10 minutes.</p>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          autoFocus
                          aria-label="Code de vérification à 6 chiffres"
                          placeholder="000000"
                          value={otpValue}
                          onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-base text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition font-bold tracking-[0.5em] text-center max-[1024px]:min-h-[44px]"
                        />
                        <button type="button" disabled={quitusLoading} onClick={() => void resendQuitusCode()} className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-50 cursor-pointer">Renvoyer le code</button>
                      </div>
                    )}
                    {quitusError && <p className="break-words text-xs text-rose-400">{quitusError}</p>}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button type="button" onClick={handlePrevStep} className={`px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer ${touch}`}>
                      <ArrowLeft className="w-4 h-4" />
                      <span>Précédent</span>
                    </button>

                    <button type="submit" disabled={quitusLoading || !studentData.quitusNumero.trim()} className={`px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed ${touch}`}>
                      <Search className="w-4 h-4" />
                      <span>{quitusLoading ? 'Vérification...' : quitusVerified ? 'Quitus Validé...' : otpMaskedEmail ? 'Valider le code' : 'Vérifier le quitus'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* DOSSIER SOUMIS : renvoi vers l'onglet dédié */}
              {isSubmitted && (
                <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 rounded-3xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="min-w-0 text-xs text-slate-300">
                    Votre dossier a été soumis. Consultez son détail dans l&apos;onglet <strong className="text-white">Mon dossier</strong>.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ONGLET MON DOSSIER */}
          {activeTab === 'mydossier' && (
            quitusVerified ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                      {applicationStatus === 'VALIDE' ? 'Dossier validé' : applicationStatus === 'REFUSE' ? 'Dossier refusé' : applicationStatus === 'EN_REVISION' ? 'Dossier en révision' : isSubmitted ? 'Dossier en attente' : 'Dossier en cours de constitution'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {applicationStatus === 'VALIDE' ? 'Votre dossier est validé. Vous pouvez télécharger votre reçu officiel.' : applicationStatus === 'REFUSE' ? 'Votre dossier n’a pas été validé par la scolarité centrale.' : applicationStatus === 'EN_REVISION' ? 'Votre dossier est actuellement examiné par la scolarité centrale.' : isSubmitted ? 'Votre dossier a été déposé et est en attente de traitement par la scolarité centrale.' : 'Votre quitus est vérifié. Finalisez le dépôt de vos pièces pour soumettre votre dossier.'}
                    </p>
                    {applicationStatus === 'REFUSE' && applicationReviewNote && <p className="break-words text-xs text-rose-300">Motif : {applicationReviewNote}</p>}
                  </div>

                  <button
                    disabled={applicationStatus !== 'VALIDE'}
                    onClick={() => setShowAttestation(true)}
                    className="w-full sm:w-auto min-h-[44px] px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>{applicationStatus === 'VALIDE' ? 'Télécharger l’attestation (PDF)' : 'Attestation après validation'}</span>
                  </button>
                </div>

                <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 rounded-3xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2 border-b border-slate-800/80 pb-3">
                    <Building2 className="w-4 h-4 shrink-0" />
                    Informations Académiques
                  </h3>

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-1">Établissement</span>
                      <span className="font-semibold text-slate-200 leading-relaxed block break-words">{studentData.etablissement}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="min-w-0">
                        <span className="text-slate-500 block mb-1">Niveau</span>
                        <span className="font-bold text-blue-400 text-sm break-words">{studentData.niveau}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-500 block mb-1">Spécialité / Parcours</span>
                        <span className="font-semibold text-slate-200 break-words">{studentData.parcours}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="min-w-0">
                        <span className="text-slate-500 block mb-1">Numéro de Quitus</span>
                        <span className="font-semibold text-slate-200 break-words">{studentData.quitusNumero || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 rounded-3xl space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2 border-b border-slate-800/80 pb-3">
                    <FileCheck className="w-4 h-4 shrink-0" />
                    Pièces du Dossier
                  </h3>
                  <div className="space-y-2.5">
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-2xl flex items-center justify-between gap-3">
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[11px] flex items-center justify-center shrink-0">{doc.id}</div>
                          <span className="text-xs font-semibold text-slate-200 truncate">{doc.title}</span>
                        </div>
                        {doc.file || doc.stored ? (
                          <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-emerald-400"><Check className="w-3.5 h-3.5" /> Déposée</span>
                        ) : (
                          <span className="shrink-0 text-[11px] font-semibold text-slate-500">Non déposée</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/90 border border-slate-800/80 p-6 rounded-3xl text-center text-xs text-slate-400">
                Votre quitus n&apos;est pas encore vérifié. Terminez l&apos;étape 4 du dépôt de dossier pour accéder à votre dossier.
              </div>
            )
          )}

          {/* ÉTAPE 5 : PIÈCES DU DOSSIER */}
          {activeTab === 'dashboard' && currentStep === 5 && !isSubmitted && (
            <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 rounded-3xl space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-800/80 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 shrink-0" />
                  Pièces Obligatoires du Dossier
                </h3>
                <span className={`text-[11px] ${documentsComplete ? 'text-emerald-400' : 'text-amber-400'}`}>{requiredDocuments.length - missingDocuments.length}/{requiredDocuments.length} pièce(s) obligatoire(s) téléversée(s)</span>
              </div>

              <div className="space-y-3">
                {documents.map((doc) => (
                  <div 
                    key={doc.id}
                    className="p-3 sm:p-4 bg-slate-950/60 border border-slate-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:border-slate-700/80 transition"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {doc.id}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-slate-200 break-words">{doc.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{doc.subtitle}</p>
                        
                        {(doc.file || doc.stored) && (
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                            <File className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[14rem] sm:max-w-[300px]">{doc.file?.name ?? 'Pièce enregistrée sur le serveur'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="w-full shrink-0 sm:w-auto sm:self-center">
                      <label className="block cursor-pointer">
                        <input 
                          type="file" 
                          accept=".pdf,.png,.jpg,.jpeg" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(doc.id, e)}
                        />
                        {doc.file || doc.stored ? (
                          <span className={`px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 transition ${touch}`}>
                            <Check className="w-3.5 h-3.5" />
                            <span>Changer le fichier</span>
                          </span>
                        ) : (
                          <span className={`px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-blue-600/20 ${touch}`}>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Téléverser</span>
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                {quitusError && <p className="w-full break-words text-xs text-rose-400">{quitusError}</p>}
                <button type="button" onClick={handlePrevStep} className={`px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer ${touch}`}>
                  <ArrowLeft className="w-4 h-4" />
                  <span>Précédent</span>
                </button>
                <button type="button" disabled={submittingApplication || applicationLoading || !quitusVerified || !documentsComplete} onClick={() => void submitApplication()} className={`px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50 ${touch}`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submittingApplication ? 'Envoi du dossier…' : 'Finaliser le dépôt'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ONGLET NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 rounded-3xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-bold text-white">Vos notifications</h2>
                {notifications.unread > 0 && (
                  <button type="button" onClick={notifications.markAllRead} className={`rounded-xl border border-blue-500/40 px-3 py-2 text-xs font-bold text-blue-300 transition hover:bg-blue-500/10 cursor-pointer ${touch}`}>
                    Tout marquer comme lu ({notifications.unread})
                  </button>
                )}
              </div>
              {notifications.items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-xs text-slate-500">Aucune notification pour le moment. Vous serez prévenu ici de l&apos;avancement de votre dossier.</p>
              ) : (
                <ul className="space-y-2.5">
                  {notifications.items.map((item) => <NotificationCard key={item.id} item={item} onRead={notifications.markRead} />)}
                </ul>
              )}
            </div>
          )}

          {/* ONGLET PARAMÈTRES */}
          {activeTab === 'settings' && (
            <div className="space-y-4 sm:space-y-6">
              <AdminSettingsPanel settings={settings} onChange={setSettings} />
              <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 rounded-3xl space-y-4">
              <h2 className="text-base font-bold text-white">Paramètres du Compte</h2>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Nom complet</label>
                  <input type="text" readOnly value={`${studentData.prenom} ${studentData.nom}`} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 max-[1024px]:min-h-[44px]" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Adresse email</label>
                  <input type="email" readOnly value={studentData.email} className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 max-[1024px]:min-h-[44px]" />
                </div>
              </div>
              </div>
            </div>
          )}

          {/* NOTA BENE */}
          <div className="bg-slate-900/90 border border-slate-800/80 p-4 sm:p-6 rounded-3xl space-y-3">
            <div className="flex items-start gap-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="min-w-0">NOTA-BENE : Remarques & Instructions Importantes</span>
            </div>

            <ul className="space-y-2 text-xs text-slate-400 leading-relaxed pl-1">
              <li className="flex items-start gap-2">
                <span className="text-slate-500 font-bold">•</span>
                <span className="min-w-0">L&apos;attribution d&apos;une allocation de bourses n&apos;est <strong className="text-slate-200">pas automatique</strong>, elle dépend des critères en vigueur pour l’année universitaire en cours et des décisions de la Commission de bourses.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-slate-500 font-bold">•</span>
                <span className="min-w-0">Les nouveaux étudiants inscrits en première année avec un baccalauréat antérieur <strong className="text-slate-200">ne sont pas éligibles à une bourse</strong> et ne doivent donc pas soumettre de demande.</span>
              </li>
              <li className="flex items-start gap-2 text-rose-400 font-semibold">
                <span className="text-rose-400 font-bold">•</span>
                <span className="min-w-0"><strong>TOUT DOSSIER INCOMPLET NE SERA PAS PRIS EN COMPTE.</strong> Assurez-vous d&apos;avoir téléversé l&apos;ensemble des documents requis ci-dessus.</span>
              </li>
            </ul>
          </div>

        </main>

        <footer className="border-t border-slate-800/80 py-4 px-4 sm:px-6 text-center md:text-left text-xs text-slate-500">
          © 2026 Université de Mahajanga — Espace Personnel Étudiant
        </footer>

      </div>

      {showAttestation && <AttestationView data={studentData} onClose={() => setShowAttestation(false)} />}

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Confirmer la déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          sessionStorage.clear();
          router.push('/login');
        }}
      />

    </div>
  );
}

const NOTIFICATION_STYLES: Record<string, { icon: React.ReactNode; tone: string }> = {
  APPLICATION_VALIDATED: { icon: <CheckCircle2 className="w-5 h-5" />, tone: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' },
  APPLICATION_REFUSED: { icon: <XCircle className="w-5 h-5" />, tone: 'border-rose-500/20 bg-rose-500/10 text-rose-400' },
  APPLICATION_SUBMITTED: { icon: <Send className="w-5 h-5" />, tone: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
};

function NotificationCard({ item, onRead }: { item: AppNotification; onRead: (id: string) => void }) {
  const style = NOTIFICATION_STYLES[item.type] ?? { icon: <Bell className="w-5 h-5" />, tone: 'border-slate-700 bg-slate-800 text-slate-300' };
  const unread = !item.readAt;
  return (
    <li>
      <button type="button" onClick={() => { if (unread) onRead(item.id); }} className={`w-full min-h-[44px] flex items-start gap-3 rounded-2xl border p-4 text-left transition ${unread ? 'border-blue-500/30 bg-blue-500/5 cursor-pointer' : 'border-slate-800 bg-slate-950/50 cursor-default'}`}>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${style.tone}`}>{style.icon}</span>
        <span className="min-w-0 flex-1 text-xs">
          <span className="flex items-center gap-2">
            <span className={`block truncate text-white ${unread ? 'font-bold' : 'font-semibold'}`}>{item.title}</span>
            {unread && <span aria-label="Non lue" className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
          </span>
          <span className="mt-1 block break-words text-slate-400">{item.message}</span>
          <span className="mt-1.5 block text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </span>
      </button>
    </li>
  );
}

type AttestationData = { nom: string; prenom: string; email: string; etablissement: string; niveau: string; parcours: string; quitusNumero: string };

function AttestationView({ data, onClose }: { data: AttestationData; onClose: () => void }) {
  return (
    <div className="print-area fixed inset-0 z-50 flex items-end justify-center bg-slate-950/75 p-0 sm:items-center sm:p-4 print:static print:bg-white print:p-0">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-slate-700 bg-white p-6 text-slate-900 shadow-2xl sm:rounded-3xl print:max-h-none print:w-full print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="mb-6 flex items-start justify-between gap-3 print:hidden">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Attestation d&apos;inscription</h2>
            <p className="text-xs text-slate-500">Dossier validé</p>
          </div>
          <button aria-label="Fermer" onClick={onClose} className="rounded-xl border border-slate-300 p-2 text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 border border-slate-300 p-6 text-sm">
          <h3 className="text-center text-base font-bold uppercase tracking-wide">Attestation d&apos;inscription</h3>
          <p><span className="font-semibold">Nom et Prénom :</span> {data.prenom} {data.nom}</p>
          <p><span className="font-semibold">Établissement :</span> {data.etablissement}</p>
          <p><span className="font-semibold">Parcours :</span> {data.parcours} <span className="ml-6 font-semibold">Niveau :</span> {data.niveau}</p>
          <p><span className="font-semibold">Numéro de Quitus :</span> {data.quitusNumero || '—'} <span className="ml-6 font-semibold">E-mail :</span> {data.email}</p>
          <p className="pt-4">Est inscrit(e) à {data.etablissement} pour l&apos;Année Universitaire 2025-2026.</p>
          <p>En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.</p>
          <p className="pt-6">Fait à Mahajanga, le {new Date().toLocaleDateString('fr-FR')}</p>
          <p className="pt-8 text-right font-semibold">Le Service de la Scolarité</p>
        </div>
        <div className="mt-6 flex justify-end gap-3 print:hidden">
          <button onClick={onClose} className={`rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 ${touch}`}>
            Fermer
          </button>
          <button onClick={() => window.print()} className={`flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white ${touch}`}>
            <Printer className="h-4 w-4" />
            Imprimer / Enregistrer en PDF
          </button>
        </div>
      </section>
    </div>
  );
}